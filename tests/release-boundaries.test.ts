import { createServer } from 'node:http'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { refreshAccount } from '../src/oauth.ts'
import { localizeError, localizeMessage, SiwcError } from '../src/errors.ts'
import { pageLocale, localizeError as exportedLocalizeError } from '../src/index.ts'
import { signedInStore, tempStore } from './store-fixture.ts'
import { SiwcAccountController } from '../src/client/account-controller.ts'
import { SiwcAccountPanel } from '../src/client/card.tsx'
import { en as cardEn, zh as cardZh } from '../src/client/locales.ts'
import { formatMessage } from '../src/i18n.ts'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
const tick = () => delay(0)

describe('release lifecycle boundaries (controlled, no real accounts)', () => {
  it('re-exports locale helpers and retains stable machine codes', () => {
    expect(exportedLocalizeError).toBe(localizeError)
    expect(pageLocale('zh-CN')).toBe('zh')
    const error = SiwcError.fromKey('storeLocked', 'STORE_LOCKED')
    expect(error.code).toBe('STORE_LOCKED')
    expect(localizeError(error, 'zh')).toContain('写入锁')
    expect(localizeMessage(error.message, 'zh')).toContain('写入锁')
  })

  it('bounds a real hung refresh endpoint, releases its lock, and preserves the saved set', async () => {
    const store = await signedInStore()
    const before = await readFile(store.path)
    const server = createServer((_request, _response) => { /* deliberately never respond */ })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('missing test listener')
    const origin = `http://127.0.0.1:${address.port}`
    try {
      await expect(refreshAccount(store, 'oaiapp_test', { httpTimeoutMs: 80, endpoints: {
        tokenEndpoint: origin + '/token', authorizationEndpoint: origin + '/authorize', jwksUri: origin + '/jwks',
      } })).rejects.toMatchObject({ code: 'NETWORK_TIMEOUT' })
      expect(await readFile(store.path)).toEqual(before)
      await store.markWelcomed()
      expect(await store.welcomed()).toBe(true)
    } finally {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
      await rm(store.path.substring(0, store.path.lastIndexOf('/')), { recursive: true, force: true })
    }
  })

  it('reports an orphan lock safely in both languages without deleting it', async () => {
    const store = tempStore()
    const lock = store.path + '.lock'
    await writeFile(lock, 'orphan-test\n', { mode: 0o600 })
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(31_000)
    try {
      const error = await store.markWelcomed().catch(value => value)
      expect(error).toBeInstanceOf(SiwcError)
      expect(error.code).toBe('STORE_LOCKED')
      expect(localizeError(error, 'en')).toContain('Stop every DSH')
      expect(localizeError(error, 'zh')).toContain('停止所有 DSH')
      expect(await readFile(lock, 'utf8')).toBe('orphan-test\n')
    } finally { vi.restoreAllMocks(); await rm(lock, { force: true }) }
  })

  it('waits for a pending sign-in start to cancel before unmounting; disposal is shared', async () => {
    let release!: (value: unknown) => void
    const started = new Promise(resolve => { release = resolve })
    const events: string[] = []
    const popup = { opener: {}, close() {}, location: { href: '' } }
    vi.stubGlobal('window', { open: () => popup })
    const off = vi.fn(async () => { events.push('unmount') })
    const remote = {
      getStatus: async () => ({ ok: true, value: { signedIn: false } }),
      startSignIn: () => started,
      cancelSignIn: vi.fn(async () => { events.push('cancel'); return { ok: true, value: { signedIn: false } } }),
    }
    const controller = new SiwcAccountController({ remote: { $mount: async () => off }, inject: (_names: string[], callback: (ctx: unknown) => () => void) => { const dispose = callback({ remote: { siwcAccount: remote } }); return { dispose: async () => dispose() } } } as never)
    await tick()
    const signIn = controller.signIn()
    const disposal = controller.dispose()
    expect(controller.dispose()).toBe(disposal)
    await tick()
    expect(off).not.toHaveBeenCalled()
    release({ ok: true, value: { id: 'controlled-attempt', authorizationUrl: 'https://auth.example.test/authorize' } })
    await Promise.all([signIn, disposal])
    expect(events).toEqual(['cancel', 'unmount'])
    expect(remote.cancelSignIn).toHaveBeenCalledOnce()
  })

  it('renders recognized attempt failures in the current card locale, with retry', () => {
    for (const dictionary of [cardEn, cardZh]) {
      const retry = () => {}
      const error = SiwcError.fromKey('storeLocked', 'STORE_LOCKED')
      const element = SiwcAccountPanel({
        t: (key, params) => formatMessage(dictionary[key], params as never),
        state: { busy: false, loading: false, confirmSignOut: false, status: { signedIn: false, attempt: { id: 'controlled', phase: 'failed', error: error.message } } },
        face: { signIn: retry } as never,
      })
      const children = element.props.children as Array<{ props?: { role?: string; children?: unknown } } | null>
      expect(children.find(child => child?.props?.role === 'alert')?.props?.children).toBe(localizeError(error, dictionary === cardZh ? 'zh' : 'en'))
    }
  })
})
