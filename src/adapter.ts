/**
 * The harness-facing adapter: an `LlmAdapter` that serves model calls
 * from the public Responses API (`POST /v1/responses`) with the signed-in
 * account's SIWC plan token.
 *
 * The adapter never signs anyone in — interactive login belongs to the
 * CLI and the settings surface. It only uses stored credentials:
 * `ensureAccessToken` refreshes a near-expiry token non-interactively,
 * and a missing/revoked credential fails as an `AUTH` LlmError naming
 * the fix. Plan usage is checked from the account's granted scopes
 * before any request is sent; identity alone never enables a call.
 *
 * Stream translation: Responses SSE events become harness StreamChunks —
 * text and reasoning deltas open text/reasoning blocks, function-call
 * argument deltas open tool-call blocks, `response.completed` yields
 * usage (input tokens reported uncached, per the TokenUsage contract)
 * and the finish chunk. Provider failures — including the
 * `subscription_sharing_*` family, before or mid-stream — surface as
 * LlmErrors carrying the plain-language explanation from errors.ts.
 *
 * @module dsh-chatgpt-siwc/adapter
 */

import { attributionHeaders, LlmAdapter, LlmError, ReasoningEffortId, ToolCallId } from '@deepseek-ai/dsh-llm'
import type {
  ContentBlock,
  GenerateOptions,
  LlmModelInfo,
  LlmProviderInfo,
  LlmResolvedModelInfo,
  StreamChunk,
  TokenUsage,
} from '@deepseek-ai/dsh-llm'
import { tokenApiUrl } from './api-origin.ts'
import { API_BASE_URL } from './constants.ts'
import { describeSubscriptionError, isSubscriptionError, isUsageLimitError, localizeMessage, SiwcError } from './errors.ts'
import { ensureAccessToken, fetchModels, modelCatalogEndpoint } from './oauth.ts'
import type { SiwcOverrides } from './oauth.ts'
import { serializeRequest } from './serialize.ts'
import { parseSseEvents, SseIdleTimeoutError } from './sse.ts'
import { isSignedIn, planGranted } from './store.ts'
import type { AccountRecord, AccountsStore, CatalogModel } from './store.ts'

export interface SiwcAdapterOptions {
  /** Account store holding SIWC registrations; a provider keeps it live with config. */
  store: AccountsStore | (() => AccountsStore)
  /** Public API base; a provider keeps it live. Defaults to the documented production base. */
  apiBaseUrl?: string | (() => string | undefined)
  /** Reasoning effort materialized when a call names none; a provider keeps it live. */
  reasoningEffort?: string | (() => string | undefined)
  /** Maximum silence between stream bytes. Defaults to two minutes. */
  streamIdleTimeoutMs?: number | (() => number | undefined)
  /** Test/embedding seam: override fetch. */
  fetchFn?: typeof fetch
}

/** Display name of the one provider route this adapter serves. */
export const PROVIDER_DISPLAY_NAME = 'ChatGPT (Sign in with ChatGPT)'

interface ResponsesUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
  output_tokens_details?: { reasoning_tokens?: number }
}

interface ResponsesEventPayload {
  type?: string
  output_index?: number
  delta?: string
  item?: {
    type?: string
    call_id?: string
    id?: string
    name?: string
    arguments?: string
    content?: { type?: string; text?: string; refusal?: string }[]
    summary?: { type?: string; text?: string }[]
  }
  response?: {
    usage?: ResponsesUsage
    error?: { code?: string; message?: string }
    incomplete_details?: { reason?: string }
    output?: NonNullable<ResponsesEventPayload['item']>[]
  }
  code?: string
  message?: string
}

interface BlockState {
  index: number
  kind: 'text' | 'reasoning' | 'tool-call'
  started: boolean
  ended: boolean
  text: string
  callId?: string
  name?: string
  args: string
}

/** The native provider call has no viewer locale; retain both supported languages. */
function providerMessage(message: string): string {
  const chinese = localizeMessage(message, 'zh')
  return chinese === message ? message : `${message}\n${chinese}`
}

/** Map any failure onto the harness error vocabulary. */
function toLlmError(err: unknown): LlmError {
  if (err instanceof LlmError) return err
  if (err instanceof SseIdleTimeoutError) {
    return new LlmError(err.message, 'PROVIDER_ERROR', { cause: err })
  }
  if (err instanceof SiwcError) {
    if (err.code === 'PLAN_NOT_GRANTED') {
      // The account is signed in but plan usage was not granted: an
      // authorization failure whose fix is a sign-in that approves plan usage.
      return new LlmError(err.message, 'AUTH', { cause: err })
    }
    if (err.code === 'REAUTH_REQUIRED' || err.code === 'MISSING_CREDENTIAL') {
      return new LlmError(
        'ChatGPT sign-in is missing or no longer valid. Run `dsh-chatgpt-siwc login` (or sign in from the harness settings) and try again.',
        'AUTH',
        { cause: err },
      )
    }
    return new LlmError(err.message, err.code, { cause: err })
  }
  return new LlmError(err instanceof Error ? err.message : String(err), 'PROVIDER_ERROR', { cause: err })
}

/** A provider-side failure (Responses error body or stream error event). */
function providerError(code: string | undefined, message: string | undefined, status?: number): LlmError {
  if (isSubscriptionError(code)) {
    return new LlmError(
      describeSubscriptionError(code, message),
      isUsageLimitError(code) ? 'USAGE_LIMIT' : 'PROVIDER_ERROR',
      status ? { status } : undefined,
    )
  }
  return new LlmError(message || 'the provider reported an error', code || 'PROVIDER_ERROR', status ? { status } : undefined)
}

/** Responses usage → harness TokenUsage (input tokens are uncached-only). */
function mapUsage(u: ResponsesUsage): TokenUsage {
  const cached = u.input_tokens_details?.cached_tokens ?? 0
  const reasoning = u.output_tokens_details?.reasoning_tokens
  // The native stream accumulator rejects own properties containing undefined.
  return {
    inputTokens: Math.max(0, (u.input_tokens ?? 0) - cached),
    outputTokens: u.output_tokens ?? 0,
    ...(u.total_tokens !== undefined ? { totalTokens: u.total_tokens } : {}),
    ...(cached ? { cacheReadTokens: cached } : {}),
    ...(reasoning !== undefined ? { reasoningTokens: reasoning } : {}),
  }
}

export class ChatGptSiwcAdapter extends LlmAdapter {
  private readonly storeSource: SiwcAdapterOptions['store']
  private readonly baseUrlSource: () => string
  private readonly effortSource: () => string | undefined
  private readonly streamIdleTimeoutSource: () => number
  private readonly fetchFn: typeof fetch
  private readonly catalogSeeds = new Map<string, Promise<CatalogModel[]>>()

  constructor(options: SiwcAdapterOptions) {
    super()
    this.storeSource = options.store
    this.baseUrlSource = () => {
      const base = typeof options.apiBaseUrl === 'function' ? options.apiBaseUrl() : options.apiBaseUrl
      return base === undefined || base.length === 0 ? API_BASE_URL : base
    }
    this.effortSource = () => {
      const effort = typeof options.reasoningEffort === 'function'
        ? options.reasoningEffort()
        : options.reasoningEffort
      return effort === undefined || effort.length === 0 ? undefined : effort
    }
    this.streamIdleTimeoutSource = () => {
      const timeout = typeof options.streamIdleTimeoutMs === 'function'
        ? options.streamIdleTimeoutMs()
        : options.streamIdleTimeoutMs
      return timeout === undefined ? 120_000 : timeout
    }
    this.fetchFn = options.fetchFn ?? fetch
  }

  /** The account store as currently configured (a live source resolves per call). */
  private get store(): AccountsStore {
    return typeof this.storeSource === 'function' ? this.storeSource() : this.storeSource
  }

  private overrides(): SiwcOverrides {
    return { fetchFn: this.fetchFn }
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: PROVIDER_DISPLAY_NAME }
  }

  private cachedCatalog(account: AccountRecord | undefined, base: string): CatalogModel[] | undefined {
    return isSignedIn(account) && planGranted(account) && account.modelsEndpoint === modelCatalogEndpoint(base)
      ? account.models : undefined
  }

  /** An explicit Cordis discovery request rebuilds the current account's index. */
  async refreshModelCatalog(signal?: AbortSignal): Promise<CatalogModel[]> {
    const store = this.store
    return this.rebuildCatalog(store, await store.active(), this.baseUrlSource(), signal)
  }

  private async rebuildCatalog(store: AccountsStore, active: AccountRecord | undefined, base: string, signal?: AbortSignal): Promise<CatalogModel[]> {
    if (!isSignedIn(active) || !planGranted(active)) return []
    const { account, accessToken } = await ensureAccessToken(store, { overrides: this.overrides() })
    if (account.client_id !== active.client_id || account.subject !== active.subject || !planGranted(account)) return []
    const models = await fetchModels(accessToken, { ...this.overrides(), apiBaseUrl: base, signal })
    signal?.throwIfAborted()
    await store.saveModels(account, modelCatalogEndpoint(base), models)
    return models
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const store = this.store
    const account = await store.active()
    if (!isSignedIn(account) || !planGranted(account)) return []
    const base = this.baseUrlSource()
    const endpoint = modelCatalogEndpoint(base)
    let models = this.cachedCatalog(account, base)
    if (models === undefined) {
      // Bootstrap once for a new account/origin. Warm lists never hit the network.
      const key = JSON.stringify([store.path, account.client_id, account.subject, endpoint])
      let pending = this.catalogSeeds.get(key)
      if (pending === undefined) {
        pending = this.rebuildCatalog(store, account, base).finally(() => this.catalogSeeds.delete(key))
        this.catalogSeeds.set(key, pending)
      }
      await pending
      models = this.cachedCatalog(await store.active(), base) ?? []
    }
    return models.map(m => ({ provider, id: m.slug, name: m.displayName, inputModalities: ['text'] }))
  }

  override async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    const row = this.cachedCatalog(await this.store.active(), this.baseUrlSource())?.find(entry => entry.slug === model)
    const configured = this.effortSource()
    const levels = row?.reasoningEfforts ?? []
    return {
      provider,
      id: model,
      name: row?.displayName ?? model,
      inputModalities: ['text'],
      ...(levels.length === 0 ? {} : {
        reasoning: {
          efforts: levels.map(id => ({ id: ReasoningEffortId(id), name: id })),
          ...(configured !== undefined && levels.includes(configured) ? { defaultEffort: ReasoningEffortId(configured) } : {}),
        },
      }),
    }
  }

  /** A non-2xx response before the stream opens (admission failure). */
  private async admissionError(response: Response): Promise<LlmError> {
    const text = await response.text().catch(() => '')
    let code: string | undefined
    let message: string | undefined
    try {
      const body = JSON.parse(text) as { error?: { code?: string; message?: string }; detail?: string }
      code = body.error?.code
      message = body.error?.message ?? body.detail
    } catch {
      message = text || undefined
    }
    if (isSubscriptionError(code)) return providerError(code, message, response.status)
    if (response.status === 401) {
      return new LlmError(
        'the ChatGPT plan token was refused. Run `dsh-chatgpt-siwc login` to sign in again.',
        'AUTH',
        { status: 401 },
      )
    }
    if (response.status === 429) {
      return new LlmError(message || 'rate limited by the provider', 'RATE_LIMIT', { status: 429 })
    }
    return new LlmError(message || `the provider answered HTTP ${response.status}`, 'PROVIDER_ERROR', { status: response.status })
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    try {
      yield* this.streamRequest(options)
    } catch (error) {
      const failure = toLlmError(error)
      const message = providerMessage(failure.message)
      if (message === failure.message) throw failure
      // Both the Error and its persisted native failure carry the same text.
      throw new LlmError(message, failure.code, { ...failure.failure, cause: failure.cause })
    }
  }

  private async *streamRequest(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const finishAborted = (): StreamChunk => ({
      type: 'finish',
      reason: { kind: 'aborted', failure: { message: providerMessage('the call was aborted'), code: 'ABORTED' } },
    })
    if (options.signal?.aborted) {
      yield finishAborted()
      return
    }
    // Origin gate before any credential work: the bearer token is only ever
    // attached to the public API origin or a loopback host (api-origin.ts).
    const base = this.baseUrlSource()
    let requestUrl: string
    try {
      requestUrl = tokenApiUrl(base, '/responses')
    } catch (err) {
      throw toLlmError(err)
    }
    let auth: Awaited<ReturnType<typeof ensureAccessToken>>
    try {
      auth = await ensureAccessToken(this.store, { overrides: this.overrides() })
    } catch (err) {
      if (options.signal?.aborted) {
        yield finishAborted()
        return
      }
      throw toLlmError(err)
    }
    if (!planGranted(auth.account)) {
      throw new LlmError(
        'this ChatGPT account is signed in, but plan usage was not granted for this app. Check the app\'s plan access and per-app cap in ChatGPT settings (Manage usage), then sign in again.',
        'AUTH',
      )
    }
    if (options.signal?.aborted) {
      yield finishAborted()
      return
    }

    const catalogModel = this.cachedCatalog(auth.account, base)?.find(entry => entry.slug === options.model)
    const effort = options.reasoningEffort ?? this.effortSource()
    if (effort !== undefined && catalogModel?.reasoningEfforts !== undefined && !catalogModel.reasoningEfforts.includes(effort)) {
      throw new LlmError(`unsupported reasoning effort "${effort}"`, 'UNSUPPORTED_REASONING_EFFORT')
    }
    const body = serializeRequest(options, {
      reasoningEffort: effort,
      reasoningSummary: catalogModel?.supportsReasoningSummary,
    })

    let response: Response
    const admission = new AbortController()
    const deadline = setTimeout(() => admission.abort(), this.streamIdleTimeoutSource())
    try {
      response = await this.fetchFn(requestUrl, {
        method: 'POST',
        // A redirect could carry the bearer token or the prompt elsewhere.
        redirect: 'error',
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
          'content-type': 'application/json',
          ...attributionHeaders(),
        },
        body: JSON.stringify(body),
        signal: options.signal === undefined ? admission.signal : AbortSignal.any([options.signal, admission.signal]),
      })
    } catch (err) {
      if (options.signal?.aborted) {
        yield finishAborted()
        return
      }
      // A failed fetch does not establish whether the POST reached the provider.
      // Never retry here: a second request could duplicate usage.
      throw new LlmError(
        admission.signal.aborted ? 'timed out waiting for the Responses HTTP headers' : 'could not connect to the Responses API before receiving HTTP headers',
        admission.signal.aborted ? 'SIWC_RESPONSE_HEADER_TIMEOUT' : 'SIWC_RESPONSE_TRANSPORT',
        { cause: err },
      )
    } finally {
      clearTimeout(deadline)
    }
    if (!response.ok) throw await this.admissionError(response)
    if (response.body === null) throw new LlmError('the Responses API returned no stream body', 'SIWC_RESPONSE_NO_BODY')

    const blocks = new Map<number, BlockState>()
    let nextIndex = 0
    let sawToolCall = false

    const stateFor = (outputIndex: number, kind: BlockState['kind']): BlockState => {
      let st = blocks.get(outputIndex)
      if (!st) {
        st = { index: nextIndex++, kind, started: false, ended: false, text: '', args: '' }
        blocks.set(outputIndex, st)
      }
      return st
    }

    const finalizeBlock = (st: BlockState, item?: NonNullable<ResponsesEventPayload['item']>): StreamChunk[] => {
      if (st.ended) return []
      if (item?.type === 'message') {
        const fullText = (item.content ?? [])
          .filter(part => part.type === 'output_text' || part.type === 'refusal')
          .map(part => part.type === 'refusal' ? part.refusal ?? '' : part.text ?? '')
          .join('')
        if (!st.text || (fullText.startsWith(st.text) && fullText.length > st.text.length)) st.text = fullText
      }
      if (item?.type === 'reasoning') {
        const fullText = (item.summary ?? []).map(part => part.text ?? '').join('')
        if (!st.text || (fullText.startsWith(st.text) && fullText.length > st.text.length)) st.text = fullText
      }
      if (item?.type === 'function_call') {
        st.callId = item.call_id ?? st.callId
        st.name = item.name ?? st.name
        const fullArgs = item.arguments ?? ''
        if (!st.args || (fullArgs.startsWith(st.args) && fullArgs.length > st.args.length)) st.args = fullArgs
        sawToolCall = true
      }
      if (st.kind === 'tool-call' && (!st.callId || !st.name)) {
        throw providerError('MALFORMED_TOOL_CALL', 'the provider returned a function call without its call_id or name')
      }
      const chunks: StreamChunk[] = []
      if (!st.started) chunks.push({ type: 'block-start', index: st.index, blockType: st.kind })
      st.started = true
      st.ended = true
      const block: ContentBlock = st.kind === 'text'
        ? { type: 'text', text: st.text }
        : st.kind === 'reasoning'
          ? { type: 'reasoning', text: st.text }
          : { type: 'tool-call', id: ToolCallId(st.callId ?? ''), name: st.name ?? '', arguments: st.args }
      chunks.push({ type: 'block-end', index: st.index, block })
      return chunks
    }

    try {
      for await (const { event: sseEvent, data } of parseSseEvents(
        response.body,
        undefined,
        options.signal,
        this.streamIdleTimeoutSource(),
      )) {
        if (options.signal?.aborted) {
          yield finishAborted()
          return
        }
        let payload: ResponsesEventPayload
        try {
          payload = JSON.parse(data) as ResponsesEventPayload
        } catch {
          continue
        }
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) continue
        const event = !sseEvent || sseEvent === 'message' ? payload.type || '' : sseEvent

        switch (event) {
        case 'response.output_text.delta': {
          const st = stateFor(payload.output_index ?? 0, 'text')
          if (!st.started) {
            st.started = true
            yield { type: 'block-start', index: st.index, blockType: 'text' }
          }
          const delta = payload.delta ?? ''
          st.text += delta
          if (delta) yield { type: 'text-delta', index: st.index, text: delta }
          break
        }
        case 'response.refusal.delta': {
          const st = stateFor(payload.output_index ?? 0, 'text')
          if (!st.started) {
            st.started = true
            yield { type: 'block-start', index: st.index, blockType: 'text' }
          }
          const delta = payload.delta ?? ''
          st.text += delta
          if (delta) yield { type: 'text-delta', index: st.index, text: delta }
          break
        }
        case 'response.reasoning_summary_text.delta':
        case 'response.reasoning_text.delta': {
          const st = stateFor(payload.output_index ?? 0, 'reasoning')
          if (!st.started) {
            st.started = true
            yield { type: 'block-start', index: st.index, blockType: 'reasoning' }
          }
          const delta = payload.delta ?? ''
          st.text += delta
          if (delta) yield { type: 'reasoning-delta', index: st.index, text: delta }
          break
        }
        case 'response.output_item.added': {
          const item = payload.item
          if (item?.type === 'function_call') {
            const st = stateFor(payload.output_index ?? 0, 'tool-call')
            st.callId = item.call_id
            st.name = item.name
            sawToolCall = true
          } else if (item?.type === 'message') {
            // Open the block at the item so a done-without-deltas item still
            // backfills instead of being dropped.
            stateFor(payload.output_index ?? 0, 'text')
          } else if (item?.type === 'reasoning') {
            stateFor(payload.output_index ?? 0, 'reasoning')
          }
          break
        }
        case 'response.function_call_arguments.delta': {
          const st = stateFor(payload.output_index ?? 0, 'tool-call')
          sawToolCall = true
          if (!st.started) {
            st.started = true
            yield { type: 'block-start', index: st.index, blockType: 'tool-call' }
          }
          const delta = payload.delta ?? ''
          st.args += delta
          yield {
            type: 'tool-call-delta',
            index: st.index,
            id: ToolCallId(st.callId ?? ''),
            ...(st.name !== undefined ? { name: st.name } : {}),
            argumentsDelta: delta,
          }
          break
        }
        case 'response.output_item.done': {
          const item = payload.item
          let st = blocks.get(payload.output_index ?? 0)
          if (st === undefined) {
            // An item the deltas never opened: create its block from the
            // item's own type, so a delta-less item still backfills instead
            // of being dropped.
            if (item?.type === 'reasoning') st = stateFor(payload.output_index ?? 0, 'reasoning')
            else if (item?.type === 'function_call') st = stateFor(payload.output_index ?? 0, 'tool-call')
            else if (item?.type === 'message') st = stateFor(payload.output_index ?? 0, 'text')
            else break
          }
          for (const chunk of finalizeBlock(st, item)) yield chunk
          break
        }
        case 'response.completed': {
          for (const [outputIndex, item] of (payload.response?.output ?? []).entries()) {
            const kind = item.type === 'message' ? 'text' : item.type === 'reasoning' ? 'reasoning' : item.type === 'function_call' ? 'tool-call' : undefined
            if (!kind) continue
            const st = blocks.get(outputIndex) ?? stateFor(outputIndex, kind)
            for (const chunk of finalizeBlock(st, item)) yield chunk
          }
          for (const st of blocks.values()) {
            for (const chunk of finalizeBlock(st)) yield chunk
          }
          if (payload.response?.usage) {
            yield { type: 'usage', usage: mapUsage(payload.response.usage) }
          }
          yield { type: 'finish', reason: { kind: sawToolCall ? 'tool-calls' : 'stop' } }
          return
        }
        case 'response.incomplete': {
          for (const [outputIndex, item] of (payload.response?.output ?? []).entries()) {
            const kind = item.type === 'message' ? 'text' : item.type === 'reasoning' ? 'reasoning' : item.type === 'function_call' ? 'tool-call' : undefined
            if (!kind) continue
            const st = blocks.get(outputIndex) ?? stateFor(outputIndex, kind)
            for (const chunk of finalizeBlock(st, item)) yield chunk
          }
          for (const st of blocks.values()) {
            for (const chunk of finalizeBlock(st)) yield chunk
          }
          if (payload.response?.usage) yield { type: 'usage', usage: mapUsage(payload.response.usage) }
          if (payload.response?.incomplete_details?.reason === 'max_output_tokens') {
            yield { type: 'finish', reason: { kind: 'max-tokens' } }
            return
          }
          throw providerError('INCOMPLETE', `the response was incomplete (${payload.response?.incomplete_details?.reason ?? 'unknown reason'})`)
        }
        case 'response.cancelled': {
          if (options.signal?.aborted) {
            yield finishAborted()
            return
          }
          throw providerError('RESPONSE_CANCELLED', 'the provider cancelled the response')
        }
        case 'response.failed': {
          const err = payload.response?.error
          throw providerError(err?.code, err?.message)
        }
        case 'error': {
          throw providerError(payload.code, payload.message)
        }
        default:
          break
        }
      }
    } catch (err) {
      if (options.signal?.aborted) {
        yield finishAborted()
        return
      }
      throw toLlmError(err)
    }

    if (options.signal?.aborted) {
      yield finishAborted()
      return
    }

    throw new LlmError('the Responses stream ended without a terminal event', 'PROVIDER_ERROR')
  }
}
