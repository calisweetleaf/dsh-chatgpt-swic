/**
 * Prompt-cache and reasoning-replay contract (0.2.1-rc.5):
 * - prompt_cache_key follows the harness session id;
 * - only leading system messages become instructions; a later prompt change
 *   stays in place as a developer item, and the adapter declares
 *   systemPromptUpdate:'in-history' so DSH appends instead of rewriting message 0;
 * - encrypted reasoning is requested, captured into the ReplayEnvelope, survives
 *   the host's own accumulator + assembler, and is replayed only for the same
 *   account + model.
 */
import { describe, expect, it, vi } from 'vitest'
import { AssistantStreamAccumulator, BlockAssembler, MessageId, ReasoningEffortId, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, Message, SessionId } from '@deepseek-ai/dsh-llm'
import { ChatGptSiwcAdapter } from '../src/adapter.ts'
import { promptCacheKey, replayKey, serializeRequest } from '../src/serialize.ts'
import { signedInStore } from './store-fixture.ts'

const sid = 'session-abc' as unknown as SessionId
const user = (id: string, text: string): Message => ({ id: MessageId(id), role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } } as Message)
const system = (id: string, text: string): Message => ({ id: MessageId(id), role: 'system', content: [{ type: 'text', text }], source: { kind: 'system-prompt' } } as Message)
const base: GenerateOptions = { provider: 'siwc-dsh-core', model: 'gpt-test', messages: [user('u1', 'hi')] }

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}
function sseResponse(frames: readonly string[]): Response {
  const enc = new TextEncoder()
  return new Response(new ReadableStream<Uint8Array>({ start(c) { for (const f of frames) c.enqueue(enc.encode(f)); c.close() } }), { status: 200 })
}

describe('prompt cache', () => {
  it('sends prompt_cache_key from the session id, hashing ids over 64 chars', () => {
    expect(serializeRequest({ ...base, sessionId: sid }).prompt_cache_key).toBe('session-abc')
    expect(serializeRequest(base)).not.toHaveProperty('prompt_cache_key')
    const long = 'x'.repeat(200)
    expect(promptCacheKey(long)).toMatch(/^[0-9a-f]{64}$/u)
    expect(promptCacheKey(long)).toBe(promptCacheKey(long))
  })

  it('sends the session-id header equal to prompt_cache_key, and none without a session', async () => {
    const seen: { headers: Record<string, string>, body: Record<string, unknown> }[] = []
    const fetchFn = vi.fn<typeof fetch>(async (_u, init) => {
      seen.push({ headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
      return sseResponse([sse('response.completed', {})])
    })
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn })
    for await (const _ of adapter.stream({ ...base, sessionId: sid })) { /* drain */ }
    const longSid = 'y'.repeat(200) as unknown as SessionId
    for await (const _ of adapter.stream({ ...base, sessionId: longSid })) { /* drain */ }
    for await (const _ of adapter.stream(base)) { /* drain */ }
    expect(seen[0]!.headers['session-id']).toBe('session-abc')
    expect(seen[0]!.headers['session-id']).toBe(seen[0]!.body.prompt_cache_key)
    expect(seen[1]!.headers['session-id']).toBe(promptCacheKey('y'.repeat(200)))
    expect(seen[1]!.headers['session-id']).toBe(seen[1]!.body.prompt_cache_key)
    expect(seen[2]!.headers).not.toHaveProperty('session-id')
  })

  it('keeps a mid-conversation system prompt in place instead of rewriting instructions', () => {
    const turn1 = serializeRequest({ ...base, messages: [system('s0', 'P1'), user('u1', 'a')] })
    const turn2 = serializeRequest({ ...base, messages: [system('s0', 'P1'), user('u1', 'a'), system('s1', 'P2'), user('u2', 'b')] })
    expect(turn2.instructions).toBe(turn1.instructions)
    expect(turn2.input.slice(0, turn1.input.length)).toEqual(turn1.input)
    expect(turn2.input[1]).toEqual({ type: 'message', role: 'developer', content: [{ type: 'input_text', text: 'P2' }] })
  })

  it('declares systemPromptUpdate in-history on resolved models', async () => {
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn: vi.fn<typeof fetch>() })
    expect((await adapter.resolveModel('siwc-dsh-core', 'gpt-test')).systemPromptUpdate).toBe('in-history')
  })

  it('asks for encrypted reasoning only when reasoning is on', () => {
    expect(serializeRequest({ ...base, reasoningEffort: ReasoningEffortId('high') }).include).toEqual(['reasoning.encrypted_content'])
    expect(serializeRequest({ ...base, reasoningEffort: ReasoningEffortId('none') })).not.toHaveProperty('include')
    expect(serializeRequest(base)).not.toHaveProperty('include')
  })
})

describe('reasoning replay', () => {
  it('round-trips encrypted reasoning through the host assembler and replays it before the tool call', async () => {
    const store = await signedInStore()
    const account = (await store.active())!
    const bodies: Record<string, unknown>[] = []
    const frames = [
      sse('response.reasoning_summary_text.delta', { output_index: 0, delta: 'think' }),
      sse('response.output_item.done', { output_index: 0, item: { type: 'reasoning', id: 'rs_1', summary: [{ type: 'summary_text', text: 'think' }], encrypted_content: 'ENC1' } }),
      sse('response.output_item.done', { output_index: 1, item: { type: 'function_call', call_id: 'call_1', name: 'ping', arguments: '{}' } }),
      sse('response.completed', {}),
    ]
    const fetchFn = vi.fn<typeof fetch>(async (_u, init) => { bodies.push(JSON.parse(String(init?.body))); return sseResponse(frames) })
    const adapter = new ChatGptSiwcAdapter({ store, reasoningEffort: 'high', fetchFn })
    const acc = new AssistantStreamAccumulator()
    const asm = new BlockAssembler()
    let t = 0
    for await (const chunk of adapter.stream({ ...base, sessionId: sid })) asm.push(acc.push({ time: t++, chunk }).chunk)
    // The loop stores the assembler's pruned envelope on the message source.
    const assistant = asm.message({ provider: 'siwc-dsh-core', model: 'gpt-test', replayState: asm.replayState })
    expect(assistant.source.replayState).toEqual({
      response: { v: 1, key: replayKey(account.client_id, account.subject, 'gpt-test') },
      blocks: [{ encrypted_content: 'ENC1', summary: [{ type: 'summary_text', text: 'think' }] }, null],
    })
    expect(JSON.stringify(assistant.source.replayState)).not.toContain(account.subject)

    const tool: Message = { id: MessageId('t1'), role: 'tool', toolCallId: ToolCallId('call_1'), content: [{ type: 'text', text: 'pong' }], source: { kind: 'tool', callId: ToolCallId('call_1') } } as Message
    const history = [user('u1', 'hi'), assistant, tool]
    const key = replayKey(account.client_id, account.subject, 'gpt-test')
    const next = serializeRequest({ ...base, messages: history }, { reasoningEffort: 'high', replayKey: key })
    expect(next.input.map(i => i.type)).toEqual(['message', 'reasoning', 'function_call', 'function_call_output'])
    expect(next.input[1]).toEqual({ type: 'reasoning', summary: [{ type: 'summary_text', text: 'think' }], encrypted_content: 'ENC1' })

    // A different model or account never receives it.
    const other = serializeRequest({ ...base, messages: history }, { replayKey: replayKey(account.client_id, account.subject, 'gpt-other') })
    expect(other.input.some(i => i.type === 'reasoning')).toBe(false)
    expect(bodies[0]).toMatchObject({ include: ['reasoning.encrypted_content'], prompt_cache_key: 'session-abc', store: false })
  })

  it('emits no replayState when the provider returned no encrypted reasoning', async () => {
    const frames = [sse('response.output_text.delta', { output_index: 0, delta: 'ok' }), sse('response.completed', {})]
    const adapter = new ChatGptSiwcAdapter({ store: await signedInStore(), fetchFn: async () => sseResponse(frames) })
    const chunks = []
    for await (const c of adapter.stream(base)) chunks.push(c)
    expect(chunks.at(-1)).toStrictEqual({ type: 'finish', reason: { kind: 'stop' } })
  })
})
