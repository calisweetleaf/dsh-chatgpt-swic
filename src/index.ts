/**
 * DeepSeek Harness plugin entry (Cordis): registers one LLM provider
 * route — `chatgpt` by default — backed by the official Sign in with
 * ChatGPT flow and the public Responses API.
 *
 * Boundaries this plugin keeps:
 * - No Codex backend, no `~/.codex` access, no contact with any Codex
 *   harness state. Accounts live in the Harness home (see store.ts);
 *   the one token this plugin ever touches is the user's own SIWC
 *   OAuth token, issued to this app by dynamic registration.
 * - No sub2api or any other pooling/sharing layer: requests go straight
 *   to `https://api.openai.com/v1` with the signed-in account's token.
 *   The token is never sent to any other origin except a loopback host
 *   (local testing); see api-origin.ts.
 * - Effectively only an API surface: one adapter route, one
 *   configurable-provider directory entry, one model-discovery hook,
 *   plus the programmatic exports below (the same functions the CLI
 *   and settings surfaces drive).
 *
 * @module dsh-chatgpt-siwc
 */

import type { Context } from '@deepseek-ai/cordis'

import type {} from '@deepseek-ai/cordis-plugin-loader'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-settings'
import type {
  AdapterRegistrationHandle,
  DirectoryRegistrationHandle,
  LlmConfigurableProvider,
} from '@deepseek-ai/dsh-llm'
import { SiwcAccountController } from './account-controller.ts'
import { ChatGptSiwcAdapter, PROVIDER_DISPLAY_NAME } from './adapter.ts'
import { assertTokenApiBase } from './api-origin.ts'
import { DEFAULT_AGENT_NAME_HINT } from './constants.ts'
import { SiwcError } from './errors.ts'
import { EFFORT_MAP } from './serialize.ts'
import { AccountsStore } from './store.ts'
import { loadedIdentity } from './doctor.ts'

export const name = 'dsh-chatgpt-siwc'

/** Services the plugin requires; it loads only while `llm` is present. */
export const inject = ['llm']

/** User-settings namespace whose section configures this provider. */
export const SETTINGS_NS = 'dsh-chatgpt-siwc'

/** Provider route registered when the config names none. */
export const DEFAULT_PROVIDER = 'siwc-dsh-core'

export interface PluginConfig {
  /** Provider route to register. Default: `chatgpt`. */
  provider?: string
  /** App name shown at first registration. Use one name consistently. */
  agentNameHint?: string
  /** Public API base override (tests/embeds); default is production. */
  apiBaseUrl?: string
  /** Reasoning effort materialized when a call names none. */
  reasoningEffort?: string
  /** Accounts file override; default is the Harness home location. */
  storePath?: string
  /** Maximum time between incoming provider bytes (default 120 seconds). */
  streamIdleTimeoutMs?: number
}

/** The same keys after schema resolution: the two defaults are always present. */
export interface ResolvedConfig {
  provider: string
  agentNameHint: string
  apiBaseUrl?: string
  reasoningEffort?: string
  storePath?: string
  /** Maximum time between incoming provider bytes (default 120 seconds). */
  streamIdleTimeoutMs?: number
}

/** Fill the schema defaults so a partial composition config resolves like the schema does. */
function resolveConfig(raw: PluginConfig): ResolvedConfig {
  // Native volatile Config fields are refs; direct programmatic callers still pass values.
  const config = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key,
    value !== null && typeof value === 'object' && 'get' in value && typeof value.get === 'function' ? value.get() : value,
  ])) as PluginConfig
  return {
    provider: config.provider !== undefined && config.provider.length > 0 ? config.provider : DEFAULT_PROVIDER,
    agentNameHint: config.agentNameHint !== undefined && config.agentNameHint.length > 0
      ? config.agentNameHint
      : DEFAULT_AGENT_NAME_HINT,
    ...config.apiBaseUrl === undefined ? {} : { apiBaseUrl: config.apiBaseUrl },
    ...config.reasoningEffort === undefined ? {} : { reasoningEffort: config.reasoningEffort },
    ...config.storePath === undefined ? {} : { storePath: config.storePath },
    ...config.streamIdleTimeoutMs === undefined ? {} : { streamIdleTimeoutMs: config.streamIdleTimeoutMs },
  }
}

export const Config = Schema.object({
  provider: Schema.string().default(DEFAULT_PROVIDER).volatile(),
  agentNameHint: Schema.string().default(DEFAULT_AGENT_NAME_HINT).volatile(),
  apiBaseUrl: Schema.string().volatile(),
  reasoningEffort: Schema.string().volatile(),
  storePath: Schema.string().volatile(),
  streamIdleTimeoutMs: Schema.number().volatile(),
})

/** Validate composition and saved settings before credentials or routes are used. */
function validateConfig(value: ResolvedConfig): void {
  if (value.provider.trim().length === 0) throw new SiwcError('provider route name must not be empty', 'INVALID_CONFIG')
  if (value.agentNameHint.trim().length === 0) throw new SiwcError('app name must not be empty', 'INVALID_CONFIG')
  if (value.reasoningEffort !== undefined && !Object.hasOwn(EFFORT_MAP, value.reasoningEffort)) {
    throw new SiwcError(`unsupported reasoning effort "${value.reasoningEffort}"`, 'INVALID_CONFIG')
  }
  if (value.streamIdleTimeoutMs !== undefined && (!Number.isSafeInteger(value.streamIdleTimeoutMs) || value.streamIdleTimeoutMs <= 0)) {
    throw new SiwcError('stream idle timeout must be a positive integer in milliseconds', 'INVALID_CONFIG')
  }
  // The plan access token may only travel to the public API origin (or a
  // loopback host for local testing); request paths re-check the same rule.
  if (value.apiBaseUrl !== undefined && value.apiBaseUrl.length > 0) assertTokenApiBase(value.apiBaseUrl)
}

export function apply(ctx: Context, config: PluginConfig = {}): void {
  validateConfig(resolveConfig(config))
  // Loaded identity first: a shadowing copy elsewhere on the module path
  // (an old symlink in an ancestor node_modules) shows up here at once.
  try {
    const { version, root } = loadedIdentity()
    const info: unknown = Reflect.get(ctx.logger ?? {}, 'info')
    if (typeof info === 'function') info.call(ctx.logger, `dsh-chatgpt-siwc ${version} loaded from ${root}; accounts file ${new AccountsStore(resolveConfig(config).storePath).path}`)
  } catch { /* diagnostics only */ }
  let current: () => ResolvedConfig = () => resolveConfig(config)
  const store = (): AccountsStore => new AccountsStore(current().storePath)
  const adapter = new ChatGptSiwcAdapter({
    store: () => store(),
    apiBaseUrl: () => current().apiBaseUrl,
    reasoningEffort: () => current().reasoningEffort,
    streamIdleTimeoutMs: () => current().streamIdleTimeoutMs,
  })

  // Route and directory registration: one route, swapped atomically when a
  // committed settings change renames it. The effect below releases both on
  // unload or reload, whatever names they then hold.
  let adapterRegistration: AdapterRegistrationHandle | undefined
  let directoryRegistration: DirectoryRegistrationHandle | undefined
  let registeredProvider: string | undefined
  const directoryEntry = (provider: string): LlmConfigurableProvider => ({
    provider,
    displayName: PROVIDER_DISPLAY_NAME,
    settingsNs: SETTINGS_NS,
    settingsPath: [],

    nativeAuth: { env: [], oauth: true },
  })
  /**
   * Register the route and its directory entry, or swap both when a settings
   * change renamed the route. The first registration fails loud (a colliding
   * route is a composition error); a later refused swap keeps the previous
   * routes serving and only costs the diagnostic.
   */
  const ensureRegistered = (contain: boolean): void => {
    const { provider } = current()
    if (adapterRegistration === undefined) {
      adapterRegistration = ctx.llm.registerAdapter([provider], adapter)
      try {
        directoryRegistration = ctx.llm.registerConfigurableProviders([directoryEntry(provider)])
      } catch (error) {
        adapterRegistration()
        adapterRegistration = undefined
        throw error
      }
    } else if (provider !== registeredProvider) {
      try {
        adapterRegistration.replace([provider])
        try {
          directoryRegistration?.replace([directoryEntry(provider)])
        } catch (error) {
          try { adapterRegistration.replace([registeredProvider!]) } catch (rollbackError) {
            directoryRegistration?.()
            adapterRegistration()
            directoryRegistration = undefined
            adapterRegistration = undefined
            registeredProvider = undefined
            throw new SiwcError('provider rename and rollback failed; the inconsistent route was removed. Save a valid provider route to restore it.', 'REGISTRATION_ROLLBACK_FAILED', { cause: rollbackError })
          }
          throw error
        }
      } catch (error) {
        if (!contain) throw error
        ctx.logger.error(adapterRegistration === undefined ? 'dsh-chatgpt-siwc: route removed after rollback failure' : 'dsh-chatgpt-siwc: keeping previously registered route after refused settings change')
        ctx.logger.error(error)
        return
      }
    }
    registeredProvider = provider
  }
  ensureRegistered(false)
  ctx.effect(() => () => {
    directoryRegistration?.()
    adapterRegistration?.()
    adapterRegistration = undefined
    directoryRegistration = undefined
  })

  // The discovery offer honors the caller's cancellation signal; the SIWC flow
  // has no draft endpoint to interrogate, so the signed-in account's live
  // catalog is the answer, with the cached catalog as the offline fallback.
  ctx.effect(() => ctx.llm.registerModelDiscovery(SETTINGS_NS, async (_request, signal) => {
    if (signal?.aborted) return []
    const models = await adapter.refreshModelCatalog(signal)
    return models.map(model => ({ id: model.slug, name: model.displayName }))
  }))

  ctx.inject(['typert'], (accountCtx) => {
    const controller = new SiwcAccountController(accountCtx, { store, agentNameHint: () => current().agentNameHint })
    accountCtx.effect(() => async () => { await controller.dispose() })
  })

  // Settings section: while a settings service is mounted, the namespace is
  // served for the web card and every committed change re-judges the
  // registrations above; without one, the composition config stays authoritative.
  ctx.inject(['settings'], (settingsCtx) => {
    const installSection: unknown = Reflect.get(settingsCtx.settings, 'installSection')
    if (typeof installSection === 'function') installSection.call(settingsCtx.settings, ctx, SETTINGS_NS, Config, resolveConfig(config), {
      validate: (value: ResolvedConfig) => { validateConfig(value) },
      setSource: (source: () => PluginConfig) => {
        current = () => resolveConfig(source())
      },
      onChange: () => {
        ensureRegistered(true)
      },
    })
    else settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
  if (typeof ctx.on === 'function') ctx.on('loader/volatile-update', () => { validateConfig(current()); ensureRegistered(true) })
}

// ---------------------------------------------------------------------------
// Programmatic API — the same surface the CLI (bin.ts) drives.
// ---------------------------------------------------------------------------

export { ChatGptSiwcAdapter, PROVIDER_DISPLAY_NAME } from './adapter.ts'
export type { SiwcAdapterOptions } from './adapter.ts'

export {
  discoverEndpoints,
  ensureAccessToken,
  fetchModels,
  login,
  logout,
  openUrlInBrowser,
  refreshAccount,
} from './oauth.ts'
export type {
  CatalogModel,
  LoginOptions,
  LoginReporter,
  LoginResult,
  RefreshOptions,
  SiwcEndpoints,
  SiwcOverrides,
} from './oauth.ts'

export {
  AccountsStore,
  applyTokens,
  defaultStorePath,
  isSignedIn,
  parseScopes,
  planGranted,
  publicView,
} from './store.ts'
export type { AccountRecord, AccountsDocument, TokenSet } from './store.ts'

export { EFFORT_MAP, serializeRequest } from './serialize.ts'
export type { ResponsesInputItem, ResponsesRequest } from './serialize.ts'

export type { CallbackOutcome } from './oauth.ts'

export { parseSseEvents } from './sse.ts'
export type { SseEvent } from './sse.ts'

export {
  describeSubscriptionError,
  isSubscriptionError,
  isUsageLimitError,
  SiwcError,
} from './errors.ts'

export { API_ORIGIN, assertTokenApiBase } from './api-origin.ts'

export {
  API_BASE_URL,
  DEFAULT_AGENT_NAME_HINT,
  ISSUER,
  MANAGE_USAGE_URL,
  PLAN_SCOPE,
} from './constants.ts'

export { SiwcAccountController } from './account-controller.ts'
export { doctorReport, loadedIdentity } from './doctor.ts'


export { localizeError, localizeMessage } from './errors.ts'
export { pageLocale } from './pages.ts'
export type { Locale } from './i18n.ts'

export type { SiwcAccountControllerOptions } from './account-controller.ts'
export type { SiwcLoginStage, SiwcAccountIdentity, SiwcAccountAttempt, SiwcAccountStatus, SiwcSignInStart, SiwcSignOutResult } from './account-types.ts'
