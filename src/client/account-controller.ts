import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { Context } from '@deepseek-ai/cordis'
import type { SiwcAccountStatus } from '../account-types.ts'
import type { SiwcAccountRemote } from './account-remote.ts'
import { SIWC_ACCOUNT_REMOTE } from './account-remote.ts'
import { errorEn, matchErrorMessage, type ErrorMessageKey } from '../locales/errors.ts'

/**
 * Panel state. `message` is the error's own (English) text; when the error is
 * one of the plugin's own, `messageKey` + `messageParams` let the card render
 * it in the active locale through ctx.locale (see `./locales.ts`).
 */
export interface AccountState { status?: SiwcAccountStatus; busy: boolean; loading: boolean; message?: string; messageKey?: ErrorMessageKey; messageParams?: Record<string, string>; confirmSignOut: boolean }
export interface AccountFace { hooks: { siwcAccount: SnapshotStore<AccountState> }; refresh(): void; signIn(): void; cancel(): void; requestSignOut(): void; cancelSignOut(): void; signOut(): void }
type Namespace = SiwcAccountRemote

export class SiwcAccountController {
  private readonly store = createSnapshotStore<AccountState>({ busy: false, loading: true, confirmSignOut: false })
  private remote?: Namespace
  private unmount?: () => Promise<void>
  private follow?: { dispose(): Promise<void> }
  private timer?: ReturnType<typeof setInterval>
  private disposed = false
  private generation = 0
  private refreshing?: Promise<void>
  private ownedAttempt?: string

  private readonly operations = new Set<Promise<void>>()
  private readonly mounting: Promise<void>
  private disposal?: Promise<void>
  private track(operation: Promise<void>): Promise<void> {
    this.operations.add(operation)
    void operation.then(() => this.operations.delete(operation), () => this.operations.delete(operation))
    return operation
  }
  constructor(private readonly ctx: Context) {
    this.mounting = this.mount()
  }
  private async mount(): Promise<void> {
    try {
      const unmount = await this.ctx.remote.$mount(SIWC_ACCOUNT_REMOTE)
      if (this.disposed) { await unmount(); return }
      this.unmount = unmount
      this.follow = this.ctx.inject(['remote.siwcAccount'], child => {
        this.remote = child.remote.siwcAccount as Namespace
        void this.refresh()
        // Fast only while a sign-in waits on the browser; otherwise every 30 s
        // while the tab is visible, plus at once when the tab comes back.
        let last = Date.now()
        const tick = (): void => {
          const pending = this.store.getSnapshot().status?.attempt?.phase === 'waiting'
          const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
          if (!pending && (hidden || Date.now() - last < 30_000)) return
          last = Date.now(); void this.refresh()
        }
        const onVisible = (): void => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') { last = Date.now(); void this.refresh() } }
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
        this.timer = setInterval(tick, 2500)
        return () => { clearInterval(this.timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible); this.remote = undefined }
      })
    } catch (error) { this.update({ loading: false, ...messageOf(error) }) }
  }
  private update(patch: Partial<AccountState>): void { if (!this.disposed) this.store.update(state => { Object.assign(state, patch) }) }
  async refresh(): Promise<void> {
    if (this.refreshing || !this.remote || this.disposed) return this.refreshing
    const generation = this.generation
    this.refreshing = (async () => {
      try { const status = unwrap<SiwcAccountStatus>(await this.remote!.getStatus()); if (!this.disposed && generation === this.generation) this.update({ status, loading: false, message: undefined, messageKey: undefined, messageParams: undefined }) }
      catch (error) { if (!this.disposed && generation === this.generation) this.update({ loading: false, ...messageOf(error) }) }
    })().finally(() => { this.refreshing = undefined; if (!this.disposed && generation !== this.generation) void this.refresh() })
    return this.refreshing
  }
  signIn(): Promise<void> { return this.track(this.beginSignIn()) }
  private async beginSignIn(): Promise<void> {
    if (!this.remote || this.disposed) return
    const gen = ++this.generation
    let popup: Window | null = null
    try { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null } catch { /* show link fallback */ }
    this.update({ busy: true, message: undefined, messageKey: undefined, messageParams: undefined })
    try {
      const started = unwrap<{ id: string; authorizationUrl: string }>(await this.remote.startSignIn(this.store.getSnapshot().status?.account?.clientId))
      if (this.disposed || gen !== this.generation) {
        popup?.close()
        await this.remote.cancelSignIn(started.id)
        return
      }
      this.ownedAttempt = started.id
      this.update({ status: { ...(this.store.getSnapshot().status ?? { signedIn: false }), attempt: { ...started, phase: 'waiting' } }, busy: false })
      if (popup) popup.location.href = started.authorizationUrl
      void this.refresh()
    } catch (error) { popup?.close(); if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) }) }
  }
  cancel(): Promise<void> { return this.track(this.cancelAttempt()) }
  private async cancelAttempt(): Promise<void> {
    const id = this.store.getSnapshot().status?.attempt?.id
    if (!this.remote || !id || this.disposed) return
    const gen = ++this.generation; this.update({ busy: true })
    try { const status = unwrap<SiwcAccountStatus>(await this.remote.cancelSignIn(id)); if (!this.disposed && gen === this.generation) { this.ownedAttempt = undefined; this.update({ status, busy: false }) } }
    catch (error) { if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) }) }
  }
  requestSignOut(): void { this.update({ confirmSignOut: true }) }
  cancelSignOut(): void { this.update({ confirmSignOut: false }) }
  signOut(): Promise<void> { return this.track(this.disconnect()) }
  private async disconnect(): Promise<void> {
    if (!this.remote || this.disposed) return
    const gen = ++this.generation; this.update({ busy: true })
    try { unwrap(await this.remote.signOut()); if (!this.disposed && gen === this.generation) { this.ownedAttempt = undefined; this.update({ status: { signedIn: false }, busy: false, confirmSignOut: false }) } }
    catch (error) { if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) }) }
  }
  inject(): AccountFace { return { hooks: { siwcAccount: this.store }, refresh: () => { void this.refresh() }, signIn: () => { void this.signIn() }, cancel: () => { void this.cancel() }, requestSignOut: () => this.requestSignOut(), cancelSignOut: () => this.cancelSignOut(), signOut: () => { void this.signOut() } } }
dispose(): Promise<void> {
    if (this.disposal) return this.disposal
    this.disposed = true; this.generation++; clearInterval(this.timer)
    this.disposal = (async () => {
      await this.mounting
      await Promise.allSettled([...this.operations, ...(this.refreshing ? [this.refreshing] : [])])
      if (this.ownedAttempt && this.remote) await this.remote.cancelSignIn(this.ownedAttempt).catch(() => undefined)
      this.ownedAttempt = undefined
      await this.follow?.dispose()
      await this.unmount?.()
    })()
    return this.disposal
  }
}
function unwrap<T>(value: unknown): T {
  if (value && typeof value === 'object' && 'ok' in value) {
    const result = value as { ok: boolean; value?: T; error?: unknown }
    if (result.ok) return result.value as T
    throw result.error
  }
  return value as T
}
/** The panel's error fields for a failed account call; never carries token material (only the error's own text). */
export function messageOf(error: unknown): Pick<AccountState, 'message' | 'messageKey' | 'messageParams'> {
  const raw = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? String((error as {message: unknown}).message) : ''
  const carried = error && typeof error === 'object' && 'key' in error ? (error as { key: unknown; params?: unknown }) : undefined
  if (carried && typeof carried.key === 'string' && Object.prototype.hasOwnProperty.call(errorEn, carried.key)) {
    const params = carried.params && typeof carried.params === 'object' ? Object.fromEntries(Object.entries(carried.params as Record<string, unknown>).map(([k, v]) => [k, String(v)])) : {}
    return { message: raw || errorEn[carried.key as ErrorMessageKey], messageKey: carried.key as ErrorMessageKey, messageParams: params }
  }
  if (/LOGIN_IN_PROGRESS/.test(raw)) return { message: errorEn.loginInProgressShort, messageKey: 'loginInProgressShort', messageParams: {} }
  if (!raw) return { message: errorEn.accountRequestFailed, messageKey: 'accountRequestFailed', messageParams: {} }
  const found = matchErrorMessage(raw)
  return found ? { message: raw, messageKey: found.key, messageParams: found.params } : { message: raw, messageKey: undefined, messageParams: undefined }
}
