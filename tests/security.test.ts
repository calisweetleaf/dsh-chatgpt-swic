/**
 * Security boundaries: where the plan access token may travel (API origin
 * allow-list at config time and request time, no redirects), which origins
 * the OAuth control plane may use (discovery pinned to the issuer), and
 * refresh coordination (a rotating refresh token is exchanged exactly once
 * across in-process callers, separate store instances, and separate OS
 * processes; a failed exchange leaves the stored set intact).
 *
 * Every endpoint here is a local fake or a loopback listener; all tokens are
 * fixture strings. No real OpenAI endpoint or account is touched.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertTokenApiBase, tokenApiUrl } from '../src/api-origin.ts'
import { ChatGptSiwcAdapter } from '../src/adapter.ts'
import { FALLBACK_ENDPOINTS, ISSUER } from '../src/constants.ts'
import { discoverEndpoints, ensureAccessToken, fetchModels, refreshAccount } from '../src/oauth.ts'
import type { SiwcEndpoints } from '../src/oauth.ts'
import { AccountsStore, isSignedIn } from '../src/store.ts'
import { jsonResponse } from './support.ts'
import { accountRecord, signedInStore, tempStore } from './store-fixture.ts'

// ---------------------------------------------------------------------------
// Token origin allow-list
// ---------------------------------------------------------------------------

describe('API origin allow-list for the bearer token', () => {
  const accepted = [
    'https://api.openai.com/v1',
    'https://api.openai.com',
    'https://API.OpenAI.com/v1', // host case is normalized
    'https://api.openai.com:443/v1', // default port is normalized away
    'https://api.openai.com/v1/', // trailing slash
    'http://127.0.0.1:8787/v1',
    'https://127.0.0.1/v1',
    'http://localhost:3000/v1',
    'http://LOCALHOST:3000/v1',
    'http://[::1]:8080/v1',
    'https://[::1]/v1',
    'http://[0:0:0:0:0:0:0:1]:8080/v1', // IPv6 loopback, long form
  ]
  const rejected = [
    'https://api.openai.com.evil.com/v1', // look-alike suffix
    'https://evil.com/api.openai.com/v1',
    'https://api.openai.com./v1', // trailing dot is a different host string
    'https://user@api.openai.com/v1', // userinfo
    'https://user:pass@api.openai.com/v1',
    'https://api.openai.com@evil.com/v1', // userinfo trick: host is evil.com
    'https://api.openai.com:8443/v1', // non-default port on the public origin
    'http://api.openai.com/v1', // plaintext to the public origin
    'https://openai.com/v1',
    'https://chatgpt.com/backend-api/codex', // never the Codex backend
    'https://auth.openai.com/v1',
    'https://api.openai.com/v1?x=1',
    'https://api.openai.com/v1#frag',
    'http://127.0.0.2/v1', // only the exact loopback hosts
    'http://localhost.evil.com/v1',
    'http://[::2]/v1',
    'ftp://127.0.0.1/v1',
    'file:///etc/passwd',
    'api.openai.com/v1', // not absolute
    '',
  ]
  it.each(accepted)('accepts %s', (base) => {
    expect(() => assertTokenApiBase(base)).not.toThrow()
  })
  it.each(rejected)('rejects %s with INVALID_CONFIG', (base) => {
    expect(() => assertTokenApiBase(base)).toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }))
  })
  it('builds request URLs that stay on the validated origin', () => {
    expect(tokenApiUrl('https://api.openai.com/v1', '/responses')).toBe('https://api.openai.com/v1/responses')
    expect(tokenApiUrl('https://api.openai.com/v1/', '/models')).toBe('https://api.openai.com/v1/models')
    expect(() => tokenApiUrl('https://evil.example/v1', '/responses')).toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }))
  })
})

describe('request-time enforcement (defense in depth)', () => {
  it('the adapter refuses a disallowed base before refreshing or sending the token', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const store = await signedInStore({ expiresIn: -10 }) // stale: a refresh would be attempted
    const adapter = new ChatGptSiwcAdapter({ store, apiBaseUrl: 'https://api.openai.com.evil.com/v1', fetchFn })
    const iterator = adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })[Symbol.asyncIterator]()
    await expect(iterator.next()).rejects.toMatchObject({ code: 'INVALID_CONFIG' })
    expect(fetchFn).not.toHaveBeenCalled()
    // The stored token set was not touched by a refresh.
    expect((await store.account('oaiapp_test'))!.refresh_token).toBe('rt-1')
  })

  it('the adapter sends the token to the default origin and refuses redirects', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const store = await signedInStore()
    const adapter = new ChatGptSiwcAdapter({
      store,
      fetchFn: async (input, init) => {
        calls.push({ url: String(input), init })
        return new Response('event: response.completed\ndata: {}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } })
      },
    })
    for await (const _ of adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })) { /* drain */ }
    expect(calls.map(c => c.url)).toEqual(['https://api.openai.com/v1/responses'])
    expect(calls[0]!.init?.redirect).toBe('error')
  })

  it('fetchModels refuses a disallowed base before sending the token', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    for (const apiBaseUrl of ['https://api.openai.com.evil.com/v1', 'https://user@api.openai.com/v1', 'https://evil.example/v1']) {
      await expect(fetchModels('at-1', { apiBaseUrl, fetchFn })).rejects.toMatchObject({ code: 'INVALID_CONFIG' })
    }
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('fetchModels uses the default origin and refuses redirects', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    await fetchModels('at-1', {
      fetchFn: async (input, init) => {
        calls.push({ url: String(input), init })
        return jsonResponse({ data: [] })
      },
    })
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/models')
    expect(calls[0]!.init?.redirect).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// OAuth control plane pinned to the issuer
// ---------------------------------------------------------------------------

describe('discovery cannot move the control plane off the issuer', () => {
  // The discovery cache is module-global with a one-hour TTL; each case
  // moves the clock past it so every document is actually evaluated.
  let hours = 0
  async function discoverWith(doc: Record<string, unknown>): Promise<SiwcEndpoints> {
    hours += 2
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + hours * 60 * 60 * 1000)
    try {
      return await discoverEndpoints({ fetchFn: async () => jsonResponse(doc) })
    } finally {
      vi.useRealTimers()
    }
  }
  const good = {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    revocation_endpoint: `${ISSUER}/oauth/revoke`,
  }

  it('uses an issuer-origin document', async () => {
    await expect(discoverWith(good)).resolves.toMatchObject({ tokenEndpoint: `${ISSUER}/oauth/token` })
  })

  it.each([
    ['an off-origin token endpoint', { ...good, token_endpoint: 'https://evil.example/token' }],
    ['a look-alike token endpoint', { ...good, token_endpoint: 'https://auth.openai.com.evil.com/token' }],
    ['a userinfo token endpoint', { ...good, token_endpoint: 'https://auth.openai.com@evil.example/token' }],
    ['credentials in the token endpoint', { ...good, token_endpoint: 'https://u:p@auth.openai.com/token' }],
    ['a plaintext token endpoint', { ...good, token_endpoint: 'http://auth.openai.com/token' }],
    ['an off-origin JWKS', { ...good, jwks_uri: 'https://evil.example/jwks' }],
    ['an off-origin authorize endpoint', { ...good, authorization_endpoint: 'https://evil.example/authorize' }],
    ['an off-origin revocation endpoint', { ...good, revocation_endpoint: 'https://evil.example/revoke' }],
    ['a different issuer', { ...good, issuer: 'https://evil.example' }],
    ['no issuer', { ...good, issuer: undefined }],
    ['a non-string endpoint', { ...good, token_endpoint: 42 }],
  ])('falls back to the pinned endpoints for %s', async (_label, doc) => {
    await expect(discoverWith(doc)).resolves.toEqual({ ...FALLBACK_ENDPOINTS })
  })

  it('pins every fallback endpoint to the issuer origin', () => {
    for (const value of Object.values(FALLBACK_ENDPOINTS)) {
      if (value !== undefined) expect(new URL(value).origin).toBe(new URL(ISSUER).origin)
    }
  })
})

// ---------------------------------------------------------------------------
// Refresh coordination
// ---------------------------------------------------------------------------

/** A loopback token endpoint that rotates rt-N → rt-(N+1) and counts exchanges. */
interface TokenServer {
  url: string
  exchanges: () => number
  spentRefreshTokens: string[]
  close: () => Promise<void>
}

function listen(handler: (req: IncomingMessage, res: ServerResponse, body: string) => void): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => { body += String(chunk) })
      req.on('end', () => handler(req, res, body))
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') throw new Error('no port')
      resolve({ server, port: address.port })
    })
  })
}

async function tokenServer(options: { delayMs?: number; status?: number } = {}): Promise<TokenServer> {
  const spent: string[] = []
  const { server, port } = await listen((_req, res, body) => {
    const form = new URLSearchParams(body)
    const refresh = form.get('refresh_token') ?? ''
    spent.push(refresh)
    setTimeout(() => {
      if (options.status !== undefined) {
        res.writeHead(options.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'server_error' }))
        return
      }
      const next = Number(refresh.replace('rt-', '')) + 1
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        access_token: `at-${next}`,
        refresh_token: `rt-${next}`,
        token_type: 'bearer',
        expires_in: 3600,
      }))
    }, options.delayMs ?? 150)
  })
  return {
    url: `http://127.0.0.1:${port}/token`,
    exchanges: () => spent.length,
    spentRefreshTokens: spent,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

function endpointsFor(tokenUrl: string): SiwcEndpoints {
  return {
    authorizationEndpoint: 'https://auth.test/authorize',
    tokenEndpoint: tokenUrl,
    jwksUri: 'https://auth.test/jwks',
  }
}

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()!()
})

async function staleStore(): Promise<AccountsStore> {
  const store = tempStore()
  await store.saveSignIn(accountRecord({ expiresIn: -10 }))
  return store
}

describe('refresh coordination', () => {
  it('in process: concurrent callers share one exchange and all get the rotated token', async () => {
    const server = await tokenServer()
    cleanups.push(server.close)
    const store = await staleStore()
    const overrides = { endpoints: endpointsFor(server.url) }
    const results = await Promise.all([
      ensureAccessToken(store, { overrides }),
      ensureAccessToken(store, { overrides }),
      ensureAccessToken(store, { overrides }),
    ])
    expect(server.exchanges()).toBe(1)
    expect(results.map(r => r.accessToken)).toEqual(['at-2', 'at-2', 'at-2'])
    const saved = await store.account('oaiapp_test')
    expect(saved).toMatchObject({ access_token: 'at-2', refresh_token: 'rt-2' })
  })

  it('two store instances on one file, concurrently: exactly one exchange', async () => {
    const server = await tokenServer()
    cleanups.push(server.close)
    const a = await staleStore()
    const b = new AccountsStore(a.path)
    const overrides = { endpoints: endpointsFor(server.url) }
    const [ra, rb] = await Promise.all([ensureAccessToken(a, { overrides }), ensureAccessToken(b, { overrides })])
    expect(server.exchanges()).toBe(1)
    expect(ra.accessToken).toBe('at-2')
    expect(rb.accessToken).toBe('at-2')
  })

  it('under the lock, a refresh another writer already committed is reused, never re-spent', async () => {
    const server = await tokenServer({ delayMs: 0 })
    cleanups.push(server.close)
    const a = await staleStore()
    const b = new AccountsStore(a.path)
    const overrides = { endpoints: endpointsFor(server.url) }
    // B judged the token stale from this snapshot, then A rotated first.
    const snapshot = (await b.account('oaiapp_test'))!
    await refreshAccount(a, 'oaiapp_test', overrides)
    expect(server.spentRefreshTokens).toEqual(['rt-1'])
    // Even a forced refresh from the stale snapshot does not spend rt-1 again
    // (nor rt-2): the re-read under the lock sees the committed rotation.
    const fromB = await refreshAccount(b, 'oaiapp_test', overrides, { force: true, observed: snapshot })
    expect(server.spentRefreshTokens).toEqual(['rt-1'])
    expect(fromB).toMatchObject({ access_token: 'at-2', refresh_token: 'rt-2' })
    // A non-forced refresh of a token that is fresh again under the lock is skipped too.
    const again = await refreshAccount(b, 'oaiapp_test', overrides, { force: false, observed: fromB })
    expect(server.spentRefreshTokens).toEqual(['rt-1'])
    expect(again.access_token).toBe('at-2')
    // A forced refresh from the current state does exchange the current token.
    await refreshAccount(b, 'oaiapp_test', overrides, { force: true, observed: again })
    expect(server.spentRefreshTokens).toEqual(['rt-1', 'rt-2'])
  })

  it('a failed exchange leaves the stored set byte-identical and releases the lock', async () => {
    const server = await tokenServer({ status: 503, delayMs: 0 })
    cleanups.push(server.close)
    const store = await staleStore()
    const before = readFileSync(store.path, 'utf8')
    await expect(refreshAccount(store, 'oaiapp_test', { endpoints: endpointsFor(server.url) }))
      .rejects.toMatchObject({ code: 'server_error' })
    expect(readFileSync(store.path, 'utf8')).toBe(before)
    expect(existsSync(`${store.path}.lock`)).toBe(false)
    // A network failure (nothing listening) behaves the same.
    await expect(refreshAccount(store, 'oaiapp_test', { endpoints: endpointsFor('http://127.0.0.1:1/token') }))
      .rejects.toThrow()
    expect(readFileSync(store.path, 'utf8')).toBe(before)
    expect(existsSync(`${store.path}.lock`)).toBe(false)
    // The intact set still refreshes afterwards.
    const ok = await tokenServer({ delayMs: 0 })
    cleanups.push(ok.close)
    await expect(refreshAccount(store, 'oaiapp_test', { endpoints: endpointsFor(ok.url) }))
      .resolves.toMatchObject({ refresh_token: 'rt-2' })
  })

  it('a redirecting token endpoint never replays the refresh token elsewhere', async () => {
    let stolen = 0
    const thief = await listen((_req, res) => { stolen += 1; res.writeHead(200); res.end('{}') })
    cleanups.push(() => new Promise((resolve) => thief.server.close(() => resolve())))
    const redirector = await listen((_req, res) => {
      res.writeHead(307, { location: `http://127.0.0.1:${thief.port}/token` })
      res.end()
    })
    cleanups.push(() => new Promise((resolve) => redirector.server.close(() => resolve())))
    const store = await staleStore()
    const before = readFileSync(store.path, 'utf8')
    await expect(refreshAccount(store, 'oaiapp_test', { endpoints: endpointsFor(`http://127.0.0.1:${redirector.port}/token`) }))
      .rejects.toThrow()
    expect(stolen).toBe(0)
    expect(readFileSync(store.path, 'utf8')).toBe(before)
  })

  it('a refused refresh token clears the tokens under the lock and keeps the registration', async () => {
    const store = await staleStore()
    const fetchFn: typeof fetch = async () => jsonResponse({ error: 'invalid_grant' }, 400)
    await expect(refreshAccount(store, 'oaiapp_test', { endpoints: endpointsFor('https://auth.test/token'), fetchFn }))
      .rejects.toMatchObject({ code: 'REAUTH_REQUIRED' })
    const saved = await store.account('oaiapp_test')
    expect(isSignedIn(saved)).toBe(false)
    expect(saved!.client_id).toBe('oaiapp_test')
  })

  it('across OS processes: two refreshers on one file spend the refresh token once', async () => {
    // The children import the built package (npm test builds lib/ first).
    const libDir = fileURLToPath(new URL('../lib/', import.meta.url))
    expect(existsSync(`${libDir}oauth.js`)).toBe(true)
    const server = await tokenServer({ delayMs: 300 })
    cleanups.push(server.close)
    const store = await staleStore()
    const child = `
      const { refreshAccount } = await import(process.env.LIB + 'oauth.js')
      const { AccountsStore } = await import(process.env.LIB + 'store.js')
      const store = new AccountsStore(process.env.STORE)
      const observed = await store.account('oaiapp_test')
      process.stdout.write('ready\\n')
      await new Promise((resolve) => process.stdin.once('data', resolve))
      const account = await refreshAccount(store, 'oaiapp_test', {
        endpoints: { authorizationEndpoint: 'https://auth.test/a', tokenEndpoint: process.env.TOKEN, jwksUri: 'https://auth.test/j' },
      }, { force: false, observed })
      process.stdout.write('token=' + account.access_token + '\\n')
      process.exit(0)
    `
    const run = () => {
      const proc = spawn(process.execPath, ['--input-type=module', '-e', child], {
        env: { ...process.env, LIB: libDir, STORE: store.path, TOKEN: server.url },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let out = ''
      let err = ''
      proc.stderr.on('data', (d) => { err += String(d) })
      const ready = new Promise<void>((resolve) => {
        proc.stdout.on('data', (d) => {
          out += String(d)
          if (out.includes('ready\n')) resolve()
        })
      })
      const done = new Promise<string>((resolve, reject) => {
        proc.on('exit', (code) => code === 0 ? resolve(out) : reject(new Error(`child exited ${code}: ${err}`)))
      })
      return { proc, ready, done }
    }
    const one = run()
    const two = run()
    // Both processes hold the same stale snapshot before either refreshes.
    await Promise.all([one.ready, two.ready])
    one.proc.stdin.write('go\n')
    two.proc.stdin.write('go\n')
    const [outOne, outTwo] = await Promise.all([one.done, two.done])
    expect(server.spentRefreshTokens).toEqual(['rt-1'])
    expect(outOne).toContain('token=at-2')
    expect(outTwo).toContain('token=at-2')
    expect(await store.account('oaiapp_test')).toMatchObject({ access_token: 'at-2', refresh_token: 'rt-2' })
    expect(existsSync(`${store.path}.lock`)).toBe(false)
  }, 20_000)
})
