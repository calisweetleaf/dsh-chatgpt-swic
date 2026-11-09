/**
 * Recovery after OpenAI approval: the issued registration survives a failed
 * code exchange (the official devkit order), the next attempt reauthorizes it
 * instead of registering another app, stages are reported, ID-token clock
 * skew is tolerated, and the doctor report carries no credentials.
 * Controlled fakes only: no real OpenAI endpoint or account.
 */
import { describe, expect, it } from 'vitest'
import { ISSUER } from '../src/constants.ts'
import { doctorReport } from '../src/doctor.ts'
import { verifyIdToken, CLOCK_TOLERANCE_MS } from '../src/jwt.ts'
import { login } from '../src/oauth.ts'
import type { LoginReporter, SiwcEndpoints } from '../src/oauth.ts'
import type { SiwcLoginStage } from '../src/account-types.ts'
import { isSignedIn } from '../src/store.ts'
import { createJwtHarness, jsonResponse } from './support.ts'
import { tempStore } from './store-fixture.ts'

const harness = createJwtHarness()
const ENDPOINTS: SiwcEndpoints = { authorizationEndpoint: 'https://auth.test/authorize', tokenEndpoint: 'https://auth.test/token', jwksUri: 'https://auth.test/jwks' }

function provider(failExchange: { value: boolean }) {
  let nonce = 'unset'
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input)
    if (url === ENDPOINTS.tokenEndpoint) {
      if (failExchange.value) return jsonResponse({ error: 'invalid_grant', error_description: 'code expired' }, 400)
      return jsonResponse({
        access_token: 'at-secret', refresh_token: 'rt-secret', token_type: 'bearer', expires_in: 3600,
        scope: 'openid offline_access chatgpt.tokens.use.direct',
        id_token: harness.signToken({ iss: ISSUER, aud: 'oaiapp_issued', sub: 'user-1', email: 'user@example.com', exp: Math.floor(Date.now() / 1000) + 600, nonce }),
      })
    }
    if (url === ENDPOINTS.jwksUri) return jsonResponse(harness.jwksFor('test-kid'))
    throw new Error(`unexpected fetch ${url}`)
  }
  return { fetchFn, setNonce: (v: string) => { nonce = v } }
}

async function attempt(store: ReturnType<typeof tempStore>, p: ReturnType<typeof provider>, clientId?: string) {
  const stages: SiwcLoginStage[] = []
  let resolveUrl!: (u: URL) => void
  const url = new Promise<URL>(r => { resolveUrl = r })
  const reporter: LoginReporter = { line: t => { if (t.startsWith(ENDPOINTS.authorizationEndpoint)) resolveUrl(new URL(t)) }, stage: s => { stages.push(s) } }
  const run = login({ store, agentNameHint: 'DSH SIWC', ...(clientId ? { clientId } : {}), openBrowser: false, reporter, overrides: { endpoints: ENDPOINTS, fetchFn: p.fetchFn } })
  const settled = run.then(r => ({ ok: true as const, r }), e => ({ ok: false as const, e }))
  const authUrl = await url
  p.setNonce(authUrl.searchParams.get('nonce')!)
  const page = await fetch(`${authUrl.searchParams.get('redirect_uri')}?code=c1&state=${authUrl.searchParams.get('state')}&client_id=oaiapp_issued`)
  return { outcome: await settled, authUrl, stages, page: await page.text() }
}

describe('login recovery after approval', () => {
  it('keeps the issued registration when the exchange fails, then reauthorizes it', async () => {
    const store = tempStore()
    const fail = { value: true }
    const p = provider(fail)
    const first = await attempt(store, p)
    expect(first.outcome.ok).toBe(false)
    expect(first.stages).toEqual(['listening', 'authorize', 'callback', 'registered', 'exchange'])
    expect(first.page).toContain('code expired')
    const kept = await store.account('oaiapp_issued')
    expect(kept).toMatchObject({ client_id: 'oaiapp_issued', subject: '', scopes: [] })
    expect(isSignedIn(kept)).toBe(false)
    expect((await store.active())?.client_id).toBe('oaiapp_issued')

    fail.value = false
    const second = await attempt(store, p, 'oaiapp_issued')
    expect(second.outcome.ok).toBe(true)
    expect(second.authUrl.searchParams.get('client_id')).toBe('oaiapp_issued')
    expect(second.authUrl.searchParams.get('agent_name_hint')).toBeNull()
    expect(second.stages.at(-1)).toBe('done')
    const saved = await store.account('oaiapp_issued')
    expect(isSignedIn(saved)).toBe(true)
    expect(saved?.subject).toBe('user-1')
  })

  it('a failed second registration never displaces a signed-in active account', async () => {
    const store = tempStore()
    const ok = { value: false }
    const p = provider(ok)
    expect((await attempt(store, p)).outcome.ok).toBe(true)
    await store.saveRegistration({ client_id: 'oaiapp_other', ext_agent_host_id: 'urn:uuid:x' })
    expect((await store.active())?.client_id).toBe('oaiapp_issued')
  })

  it('doctor report is token-free', async () => {
    const store = tempStore()
    expect((await attempt(store, provider({ value: false }))).outcome.ok).toBe(true)
    const text = JSON.stringify(await doctorReport(store))
    for (const secret of ['at-secret', 'rt-secret', 'user@example.com', 'eyJ']) expect(text).not.toContain(secret)
    expect(text).toContain('"signedIn":true')
    expect(text).toContain('"identityVerified":true')
  })
})

describe('ID token clock tolerance', () => {
  it('accepts a token whose nbf/iat is slightly ahead of this clock, rejects one far ahead', async () => {
    const now = Math.floor(Date.now() / 1000)
    const fetchFn: typeof fetch = async () => jsonResponse(harness.jwksFor('test-kid'))
    const opts = { jwksUri: 'https://auth.test/jwks-skew', issuer: ISSUER, audience: 'oaiapp_issued', fetchFn }
    const near = harness.signToken({ iss: ISSUER, aud: 'oaiapp_issued', sub: 's', exp: now + 600, nbf: now + 10, iat: now + 10 })
    await expect(verifyIdToken(near, opts)).resolves.toMatchObject({ subject: 's' })
    const far = harness.signToken({ iss: ISSUER, aud: 'oaiapp_issued', sub: 's', exp: now + 600, iat: now + Math.ceil(CLOCK_TOLERANCE_MS / 1000) + 60 })
    await expect(verifyIdToken(far, opts)).rejects.toMatchObject({ code: 'INVALID_ID_TOKEN' })
  })
})
