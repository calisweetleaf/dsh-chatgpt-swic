/**
 * The adapter's stream translation: Responses SSE events become harness
 * StreamChunks, provider failures become LlmErrors with the plain-language
 * plan-usage explanation, and the auth boundary holds before any request.
 */
import { describe, expect, it, vi } from 'vitest'
import { AssistantStreamAccumulator, BlockAssembler, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { ChatGptSiwcAdapter } from '../src/adapter.ts'
import { tempStore, signedInStore } from './store-fixture.ts'

/** Encode one SSE event frame. */
function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

/** A 200 response whose body streams the given SSE frames. */
function sseResponse(frames: readonly string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

/** Collect every chunk of one stream attempt. */
async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

/** The signed-in adapter under test, with its fetch faked. */
async function adapterWith(fetchFn: (frames: () => readonly string[]) => Promise<Response>) {
  return new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn })
}

describe('ChatGptSiwcAdapter stream translation', () => {
  it('carries a stable session cache key through consecutive provider POSTs', async () => {
    const bodies: Record<string, unknown>[] = []
    const fetchFn = vi.fn<typeof fetch>(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return sseResponse([sse('response.completed', { response: {} })])
    })
    const routed = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn })
    const sessionId = 'fixture-session' as NonNullable<Parameters<typeof routed.stream>[0]['sessionId']>
    for (let i = 0; i < 2; i++) await collect(routed.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [], sessionId }))
    expect(bodies.map(body => body.prompt_cache_key)).toEqual([sessionId, sessionId])
  })

  it('retains bilingual provider failures and the native HTTP status and code', async () => {
    const adapter = await adapterWith(async () => new Response('', { status: 401 }))
    await expect(collect(adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'AUTH', failure: { status: 401, message: expect.stringContaining('套餐令牌') }, message: expect.stringMatching(/plan token.*[\s\S]*套餐令牌/u) })
    const disconnected = await adapterWith(async () => sseResponse([]))
    await expect(collect(disconnected.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'PROVIDER_ERROR', message: expect.stringContaining('终止事件') })
  })
  it('seeds a catalog once and resolves model-specific efforts without network requests', async () => {
    const store = await signedInStore()
    const fetchFn = vi.fn<typeof fetch>(async () => Response.json({
      models: [
        { slug: 'terra-fixture', display_name: 'Terra', visibility: 'list',
          supported_reasoning_levels: [{ effort: 'low' }, { effort: 'ultra' }],
          default_reasoning_level: 'low',
          supports_reasoning_summaries: true, supports_reasoning_summary_parameter: true },
        { slug: 'luna-fixture', visibility: 'list', supported_reasoning_levels: [{ effort: 'minimal' }] },
        { slug: 'internal-fixture', visibility: 'list', supported_in_api: false },
      ],
    }))
    const adapter = new ChatGptSiwcAdapter({ store, fetchFn })
    const provider = 'siwc-dsh-core'
    const results = await Promise.all([adapter.listModels(provider), adapter.listModels(provider)])
    expect(results[0].map(row => row.id)).toEqual(['terra-fixture', 'luna-fixture'])
    expect(results[1]).toEqual(results[0])
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const restarted = new ChatGptSiwcAdapter({ store, fetchFn })
    expect((await restarted.resolveModel(provider, 'terra-fixture')).reasoning?.efforts.map(row => row.id)).toEqual(['low', 'ultra'])
    expect((await restarted.resolveModel(provider, 'luna-fixture')).reasoning?.efforts.map(row => row.id)).toEqual(['minimal'])
    expect((await restarted.resolveModel(provider, 'unknown')).reasoning).toBeUndefined()
    await restarted.listModels(provider)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    await restarted.refreshModelCatalog()
    expect(fetchFn).toHaveBeenCalledTimes(2)
    await store.clearTokens((await store.active())!.client_id)
    expect(await restarted.listModels(provider)).toEqual([])
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it.each(['completed', 'incomplete'] as const)('passes sparse %s usage through the native stream boundary', async (status) => {
    const frames = [
      sse('response.reasoning_summary_text.delta', { output_index: 0, delta: 'reason' }),
      sse('response.output_text.delta', { output_index: 1, delta: 'answer' }),
      sse('response.' + status, {
        response: {
          usage: { input_tokens: 4, output_tokens: 2, input_tokens_details: { cached_tokens: 0 } },
          incomplete_details: status === 'incomplete' ? { reason: 'max_output_tokens' } : undefined,
        },
      }),
    ]
    const fetchFn = vi.fn<typeof fetch>(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        reasoning: { effort: 'xhigh', summary: 'auto' },
        store: false,
        stream: true,
      })
      return sseResponse(frames)
    })
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), reasoningEffort: 'xhigh', fetchFn })
    const accumulator = new AssistantStreamAccumulator()
    const assembler = new BlockAssembler()
    let time = 0
    for await (const chunk of adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })) {
      assembler.push(accumulator.push({ time: time++, chunk }).chunk)
    }
    expect(assembler.usage).toStrictEqual({ inputTokens: 4, outputTokens: 2 })
    expect(assembler.blocks()).toStrictEqual([
      { type: 'reasoning', text: 'reason' },
      { type: 'text', text: 'answer' },
    ])
    expect(assembler.finish).toStrictEqual({ kind: status === 'completed' ? 'stop' : 'max-tokens' })
  })

  it('passes a nameless tool delta through the native stream boundary before the final item names it', async () => {
    const frames = [
      sse('response.output_item.added', { output_index: 0, item: { type: 'function_call', call_id: 'call_1' } }),
      sse('response.function_call_arguments.delta', { output_index: 0, delta: '{"a":' }),
      sse('response.function_call_arguments.delta', { output_index: 0, delta: '1}' }),
      sse('response.output_item.done', {
        output_index: 0, item: { type: 'function_call', call_id: 'call_1', name: 'ping', arguments: '{"a":1}' },
      }),
      sse('response.completed', {}),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const accumulator = new AssistantStreamAccumulator()
    const assembler = new BlockAssembler()
    let time = 0
    for await (const chunk of adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })) {
      assembler.push(accumulator.push({ time: time++, chunk }).chunk)
      if (chunk.type === 'tool-call-delta') expect(Object.hasOwn(chunk, 'name')).toBe(false)
    }
    expect(assembler.blocks()).toStrictEqual([
      { type: 'tool-call', id: 'call_1', name: 'ping', arguments: '{"a":1}' },
    ])
    expect(assembler.finish).toStrictEqual({ kind: 'tool-calls' })
  })
  it('translates a text stream to blocks, usage, and a stop finish', async () => {
    const frames = [
      sse('response.output_text.delta', { output_index: 0, delta: 'Hel' }),
      sse('response.output_text.delta', { output_index: 0, delta: 'lo' }),
      sse('response.completed', {
        response: {
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            total_tokens: 150,
            input_tokens_details: { cached_tokens: 20 },
            output_tokens_details: { reasoning_tokens: 30 },
          },
        },
      }),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const chunks = await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'text-delta', index: 0, text: 'Hel' },
      { type: 'text-delta', index: 0, text: 'lo' },
      { type: 'block-end', index: 0, block: { type: 'text', text: 'Hello' } },
      {
        type: 'usage',
        usage: {
          inputTokens: 80,
          outputTokens: 50,
          totalTokens: 150,
          cacheReadTokens: 20,
          reasoningTokens: 30,
        },
      },
      { type: 'finish', reason: { kind: 'stop' } },
    ])
  })

  it('keeps reasoning and text as separate blocks by output index', async () => {
    const frames = [
      sse('response.reasoning_summary_text.delta', { output_index: 0, delta: 'thinking' }),
      sse('response.output_text.delta', { output_index: 1, delta: 'answer' }),
      sse('response.output_item.done', { output_index: 0, item: { type: 'reasoning', summary: [{ type: 'summary_text', text: 'thinking' }] } }),
      sse('response.output_item.done', { output_index: 1, item: { type: 'message', content: [{ type: 'output_text', text: 'answer' }] } }),
      sse('response.completed', {}),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const chunks = await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'reasoning' },
      { type: 'reasoning-delta', index: 0, text: 'thinking' },
      { type: 'block-start', index: 1, blockType: 'text' },
      { type: 'text-delta', index: 1, text: 'answer' },
      { type: 'block-end', index: 0, block: { type: 'reasoning', text: 'thinking' } },
      { type: 'block-end', index: 1, block: { type: 'text', text: 'answer' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ])
  })

  it('translates a function-call stream to a tool-call block and a tool-calls finish', async () => {
    const frames = [
      sse('response.output_item.added', { output_index: 0, item: { type: 'function_call', call_id: 'call_1', id: 'item_1', name: 'ping' } }),
      sse('response.function_call_arguments.delta', { output_index: 0, delta: '{"a":' }),
      sse('response.function_call_arguments.delta', { output_index: 0, delta: '1}' }),
      sse('response.output_item.done', { output_index: 0, item: { type: 'function_call', call_id: 'call_1', name: 'ping', arguments: '{"a":1}' } }),
      sse('response.completed', {}),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const chunks = await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: 0, id: 'call_1', name: 'ping', argumentsDelta: '{"a":' },
      { type: 'tool-call-delta', index: 0, id: 'call_1', name: 'ping', argumentsDelta: '1}' },
      { type: 'block-end', index: 0, block: { type: 'tool-call', id: 'call_1', name: 'ping', arguments: '{"a":1}' } },
      { type: 'finish', reason: { kind: 'tool-calls' } },
    ])
  })

  it('rejects a malformed tool call instead of emitting an empty call id', async () => {
    const frames = [
      sse('response.function_call_arguments.delta', { output_index: 0, delta: '{}' }),
      sse('response.completed', {}),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'MALFORMED_TOOL_CALL' })
  })

  it('backfills a message block the deltas never observed', async () => {
    const frames = [
      sse('response.output_item.done', { output_index: 0, item: { type: 'message', content: [{ type: 'output_text', text: 'Hello' }] } }),
      sse('response.completed', {}),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const chunks = await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'block-end', index: 0, block: { type: 'text', text: 'Hello' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ])
  })

  it('translates refusal deltas and reconciles the final refusal content', async () => {
    const frames = [
      sse('response.refusal.delta', { output_index: 0, delta: 'I cannot help with that.' }),
      sse('response.completed', {
        response: {
          output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'I cannot help with that.' }] }],
        },
      }),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    const chunks = await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(chunks).toEqual([
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'text-delta', index: 0, text: 'I cannot help with that.' },
      { type: 'block-end', index: 0, block: { type: 'text', text: 'I cannot help with that.' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ])
  })

  it('uses the payload type for default message frames and ignores null JSON safely', async () => {
    const frames = [
      `data: null\n\n`,
      `data: ${JSON.stringify({ type: 'response.completed' })}\n\n`,
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .resolves.toEqual([{ type: 'finish', reason: { kind: 'stop' } }])
  })

  it('cancels a still-open transport after receiving a terminal event', async () => {
    let cancelled = false
    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sse('response.completed', {})))
      },
      cancel() { cancelled = true },
    })
    const adapter = new ChatGptSiwcAdapter({
      store: await signedInStore(),
      fetchFn: async () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    })
    await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(cancelled).toBe(true)
  })

  it('maps a mid-stream plan-usage failure to the plain-language usage-limit error', async () => {
    const frames = [
      sse('response.output_text.delta', { output_index: 0, delta: 'par' }),
      sse('response.failed', { response: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'limit reached' } } }),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'USAGE_LIMIT', message: expect.stringContaining('Manage usage') })
  })

  it('surfaces a stream error event as the provider code it carries', async () => {
    const frames = [
      sse('response.output_text.delta', { output_index: 0, delta: 'par' }),
      sse('error', { code: 'server_error', message: 'boom' }),
    ]
    const adapter = await adapterWith(async () => sseResponse(frames))
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'server_error', message: 'boom' })
  })

  it('fails a stream that ends without a terminal event', async () => {
    const frames = [sse('response.output_text.delta', { output_index: 0, delta: 'par' })]
    const adapter = await adapterWith(async () => sseResponse(frames))
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'PROVIDER_ERROR', message: expect.stringContaining('ended without a terminal event') })
  })

  it('classifies a fetch failure before headers without replaying the POST', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'))
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn })
    await expect(collect(adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'SIWC_RESPONSE_TRANSPORT' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('bounds the wait for headers without replaying the POST', async () => {
    const fetchFn = vi.fn<typeof fetch>(async (_url, options) => new Promise((_resolve, reject) => {
      const signal = options?.signal
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
    }))
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn, streamIdleTimeoutMs: 15 })
    await expect(collect(adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'SIWC_RESPONSE_HEADER_TIMEOUT' })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('distinguishes a successful HTTP status with no stream body', async () => {
    const adapter = await adapterWith(async () => new Response(null, { status: 204 }))
    await expect(collect(adapter.stream({ provider: 'siwc-dsh-core', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'SIWC_RESPONSE_NO_BODY' })
  })

  it('maps transport read failures to provider errors', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error('socket reset')) },
    })
    const adapter = new ChatGptSiwcAdapter({
      store: await signedInStore(),
      fetchFn: async () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    })
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'PROVIDER_ERROR', message: 'socket reset' })
  })

  it('finishes as aborted once the caller aborts mid-stream', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(c) {
        c.enqueue(encoder.encode(sse('response.output_text.delta', { output_index: 0, delta: 'Hel' })))
        await new Promise(resolve => setTimeout(resolve, 20))
        c.enqueue(encoder.encode(sse('response.output_text.delta', { output_index: 0, delta: 'lo' })))
        c.close()
      },
    })
    const adapter = new ChatGptSiwcAdapter({
      store: await signedInStore(),
      fetchFn: async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    })
    const chunks: StreamChunk[] = []
    for await (const chunk of adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [], signal: controller.signal })) {
      chunks.push(chunk)
      if (chunks.length === 2) controller.abort()
    }
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'aborted' } })
  })

   it('refuses to call the provider when plan usage was not granted', async () => {
    const fetchFn = vi.fn()
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore({ plan: false }), fetchFn })
    await expect(collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })))
      .rejects.toMatchObject({ code: 'AUTH' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('still reads a live-config store and base URL from provider functions', async () => {
    const store = await signedInStore()
    const seenUrls: string[] = []
    const adapter = new ChatGptSiwcAdapter({
      store: () => store,
      apiBaseUrl: () => 'http://127.0.0.1:8787/v1',
      fetchFn: async (input) => {
        seenUrls.push(String(input))
        return sseResponse([sse('response.completed', {})])
      },
    })
    await collect(adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] }))
    expect(seenUrls).toEqual(['http://127.0.0.1:8787/v1/responses'])
  })
})

describe('ChatGptSiwcAdapter auth boundary', () => {
  it('fails as AUTH with no stored credentials, before any request', async () => {
    const adapter = new ChatGptSiwcAdapter({ store: tempStore(), fetchFn: vi.fn() })
    const chunks: unknown[] = []
    await expect(async () => {
      for await (const chunk of adapter.stream({ provider: 'chatgpt', model: 'gpt-test', messages: [] })) {
        chunks.push(chunk)
      }
    }).rejects.toMatchObject({ code: 'AUTH' })
    expect(chunks).toEqual([])
  })

  it('advertises no models when signed out and nothing is cached', async () => {
    const adapter = new ChatGptSiwcAdapter({ store: tempStore(), fetchFn: vi.fn() })
    await expect(adapter.listModels('chatgpt')).resolves.toEqual([])
  })
})
