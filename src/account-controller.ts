/** Host Remote for the plugin's file-backed SIWC account lifecycle. */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { LoginOptions, LoginReporter, LoginResult } from './oauth.ts'
import { login, logout } from './oauth.ts'
import type { SiwcAccountAttempt, SiwcAccountStatus, SiwcSignInStart, SiwcSignOutResult } from './account-types.ts'
import { doctorReport } from './doctor.ts'
import { SiwcError } from './errors.ts'
import { AccountsStore, isSignedIn, planGranted } from './store.ts'

export interface SiwcAccountControllerOptions {
  store: () => AccountsStore
  agentNameHint: () => string
  auth?: { login: (options: LoginOptions) => Promise<LoginResult>; logout: (store: AccountsStore) => Promise<SiwcSignOutResult> }
}
interface LiveAttempt extends SiwcAccountAttempt { controller: AbortController; finished: boolean; running?: Promise<void> }

export class SiwcAccountController extends TypertRemoteService {
  private attempt: LiveAttempt | undefined
  private signingOut = false
  private readonly auth: NonNullable<SiwcAccountControllerOptions['auth']>
  constructor(ctx: Context, private readonly options: SiwcAccountControllerOptions) {
    super(ctx, 'siwcAccount')
    this.auth = options.auth ?? { login, logout: store => logout(store) }
  }

  @Remote
  async getStatus(): Promise<SiwcAccountStatus> {
    const account = await this.options.store().active()
    return {
      signedIn: isSignedIn(account),
      ...(account ? { account: {
        ...(account.email ? { email: account.email } : {}), ...(account.name ? { name: account.name } : {}),
        clientId: account.client_id, scopes: [...account.scopes], planGranted: planGranted(account),
        ...(account.expires_at === undefined ? {} : { accessTokenExpiresAt: new Date(account.expires_at).toISOString() }),
      } } : {}),
      ...(this.attempt ? { attempt: this.publicAttempt(this.attempt) } : {}),
    }
  }

  @Remote
  async startSignIn(clientId?: string): Promise<SiwcSignInStart> {
    if (this.signingOut) throw new SiwcError('ChatGPT sign-out is still in progress', 'SIGN_OUT_IN_PROGRESS')
    if (this.attempt && !this.attempt.finished) throw new SiwcError('a ChatGPT sign-in is already in progress', 'LOGIN_IN_PROGRESS')
    const attempt: LiveAttempt = { id: randomUUID(), phase: 'waiting', finished: false, controller: new AbortController() }
    this.attempt = attempt
    let resolveUrl!: (url: string) => void, rejectUrl!: (error: Error) => void, hasUrl = false
    const urlReady = new Promise<string>((resolve, reject) => { resolveUrl = resolve; rejectUrl = reject })
    const reporter: LoginReporter = { line: line => {
      const url = authorizeUrlFromLine(line)
      if (!url || hasUrl) return
      hasUrl = true; attempt.authorizationUrl = url; resolveUrl(url)
    }, stage: stage => {
      attempt.stage = stage
      this.log('info', `sign-in ${attempt.id.slice(0, 8)}: ${stage}`)
    } }
    const running = this.auth.login({ store: this.options.store(), agentNameHint: this.options.agentNameHint(), clientId,
      openBrowser: false, reporter, signal: attempt.controller.signal }).then(() => {
      attempt.phase = 'succeeded'; attempt.authorizationUrl = undefined; this.ctx.emit('llm/adapters-updated')
    }, error => {
      attempt.phase = attempt.controller.signal.aborted ? 'cancelled' : 'failed'
      attempt.authorizationUrl = undefined; attempt.error = safeError(error); attempt.code = errorCode(error)
      // Token-free: SiwcError messages never carry credentials. This is the
      // line an operator reads when the browser tab is gone.
      this.log('warn', `sign-in ${attempt.id.slice(0, 8)} ${attempt.phase} at ${attempt.stage ?? 'start'}: ${attempt.code} ${error instanceof Error ? error.message : String(error)}`)
      if (!hasUrl) rejectUrl(error instanceof Error ? error : new Error('ChatGPT sign-in could not start'))
    }).finally(() => { attempt.finished = true })
    attempt.running = running
    try { return { id: attempt.id, authorizationUrl: await urlReady } }
    catch (error) { throw new SiwcError(safeError(error), 'LOGIN_START_FAILED', { cause: error }) }
  }

  @Remote
  async cancelSignIn(attemptId: string): Promise<SiwcAccountStatus> {
    const attempt = this.attempt
    if (attempt?.id === attemptId && !attempt.finished) { attempt.controller.abort(); await attempt.running }
    return this.getStatus()
  }

  @Remote
  async signOut(): Promise<SiwcSignOutResult> {
    if (this.signingOut) throw new SiwcError('ChatGPT sign-out is already in progress', 'SIGN_OUT_IN_PROGRESS')
    this.signingOut = true
    try {
      if (this.attempt && !this.attempt.finished) { this.attempt.controller.abort(); await this.attempt.running }
      const result = await this.auth.logout(this.options.store())
      this.ctx.emit('llm/adapters-updated'); return result
    } finally { this.signingOut = false }
  }

  /** Token-free diagnostics (same report as `dsh-chatgpt-siwc doctor`). */
  @Remote
  async diagnose(): Promise<Record<string, unknown>> {
    return { ...(await doctorReport(this.options.store())), attempt: this.attempt ? this.publicAttempt(this.attempt) : null }
  }

  async dispose(): Promise<void> {
    if (this.attempt && !this.attempt.finished) {
      // A reload or disable while the browser is on ChatGPT closes the loopback
      // listener; say so instead of failing silently.
      this.log('warn', `plugin unloading during sign-in ${this.attempt.id.slice(0, 8)} at ${this.attempt.stage ?? 'start'}; the attempt is cancelled`)
      this.attempt.controller.abort(); await this.attempt.running
    }
  }

  private log(level: 'info' | 'warn', text: string): void {
    try {
      const logger = (this.ctx as unknown as { logger?: unknown }).logger
      const fn = logger !== null && typeof logger === 'object' ? Reflect.get(logger, level) : undefined
      if (typeof fn === 'function') fn.call(logger, `dsh-chatgpt-siwc: ${text}`)
    } catch { /* diagnostics never break sign-in */ }
  }
  private publicAttempt(attempt: LiveAttempt): SiwcAccountAttempt {
    return { id: attempt.id, phase: attempt.phase, ...(attempt.authorizationUrl ? { authorizationUrl: attempt.authorizationUrl } : {}), ...(attempt.error ? { error: attempt.error } : {}), ...(attempt.code ? { code: attempt.code } : {}), ...(attempt.stage ? { stage: attempt.stage } : {}) }
  }
}

function authorizeUrlFromLine(line: string): string | undefined {
  try { const url = new URL(line.trim()); if (url.protocol !== 'https:' || url.searchParams.get('response_type') !== 'code' || url.searchParams.get('code_challenge_method') !== 'S256' || !url.searchParams.get('redirect_uri')?.startsWith('http://127.0.0.1:')) return undefined; url.searchParams.delete('id_token_hint'); return url.toString() } catch { return undefined }
}
function errorCode(error: unknown): string {
  return error instanceof SiwcError && /^[A-Za-z0-9_]+$/u.test(error.code) ? error.code : 'AUTHORIZATION_FAILED'
}
function safeError(error: unknown): string {
  if (error instanceof SiwcError) {
    const code = /^[A-Za-z0-9_]+$/u.test(error.code) ? error.code : 'AUTHORIZATION_FAILED'
    return `${code}: ChatGPT sign-in could not be completed. Try again.`
  }
  return 'ChatGPT sign-in could not be completed on this host. Try again.'
}
