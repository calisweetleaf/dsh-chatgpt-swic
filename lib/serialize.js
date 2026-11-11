/**
 * Serialize harness requests into the public Responses API shape this
 * flow requires — with the plan-usage contract enforced by omission:
 *
 * - `store: false` and `stream: true` on every request.
 * - System prompts travel as the top-level `instructions` field;
 *   `role: "system"` input items are refused on this route (a system
 *   message becomes instructions, never an item).
 * - Fields the API refuses for a ChatGPT plan token are never sent:
 *   `max_output_tokens`, `temperature`, `top_p`,
 *   `prompt_cache_retention`, `truncation`, `metadata`, `user`.
 * - No hosted tools (image generation, code interpreter, file search,
 *   computer use, hosted MCP). Function tools only.
 * - Image and file input is refused locally with `UNSUPPORTED_CONTENT`
 *   rather than silently dropped.
 *
 * Prompt caching (0.2.1-rc.5):
 * - `prompt_cache_key` = the harness session id (hashed when longer than
 *   64 chars), stable across every turn of one session.
 * - The adapter mirrors this value in the `session-id` request header as a
 *   cache-affinity hint. Cache-hit effectiveness remains route-dependent.
 * - Only the LEADING system messages become `instructions`. A later system
 *   message (DSH sends one when the prompt changes, because the adapter
 *   declares `systemPromptUpdate: 'in-history'`) becomes a developer item
 *   in place, so the cached prefix above it survives.
 *
 * Reasoning replay: with `store: false` there is no server-side state, so
 * the request asks for `reasoning.encrypted_content` and the adapter keeps
 * each completed reasoning item in the message's ReplayEnvelope. Replay
 * only happens when the envelope's key matches this account + model.
 *
 * @module dsh-chatgpt-siwc/serialize
 */
import { createHash } from 'node:crypto';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { RESPONSES_EFFORTS } from "./constants.js";
/** Stable identity for replay and caching; never contains a token or email. */
export function replayKey(clientId, subject, model) {
    return createHash('sha256').update(JSON.stringify([clientId, subject, model])).digest('hex').slice(0, 32);
}
/** The API caps prompt_cache_key; a longer session id is hashed, not cut. */
export function promptCacheKey(sessionId) {
    return sessionId.length <= 64 ? sessionId : createHash('sha256').update(sessionId).digest('hex');
}
function replayBlocksFor(message, key) {
    if (key === undefined || message.role !== 'assistant')
        return undefined;
    const state = message.source.replayState;
    const response = state?.response;
    if (response?.v !== 1 || response.key !== key || !Array.isArray(state?.blocks))
        return undefined;
    if (state.blocks.length !== message.content.length)
        return undefined;
    return state.blocks;
}
/** Preserve the selected Responses effort exactly; unsupported model/effort pairs fail upstream. */
export const EFFORT_MAP = Object.freeze(Object.fromEntries(RESPONSES_EFFORTS.map(effort => [effort, effort])));
function flattenText(blocks) {
    return blocks.filter(block => block.type === 'text').map(block => block.text).join('');
}
function assertNoUnsupportedContent(blocks, where) {
    for (const block of blocks) {
        if (block.type === 'image' || block.type === 'file') {
            throw new LlmError(`ChatGPT plan route does not accept ${block.type} input (${where}); the request was not sent.`, 'UNSUPPORTED_CONTENT');
        }
        if (block.type === 'tool-result')
            assertNoUnsupportedContent(block.content, where);
    }
}
/**
 * Build one Responses request from a harness request.
 * @param options - the harness request.
 * @param defaults - adapter defaults (reasoning effort when the request names none).
 * @returns the wire body; forbidden fields are absent by construction.
 */
export function serializeRequest(options, defaults = {}) {
    const instructions = [];
    if (options.system !== undefined && options.system.length > 0)
        instructions.push(options.system);
    const input = [];
    let leading = true;
    for (const message of options.messages) {
        if (message.role !== 'system')
            leading = false;
        assertNoUnsupportedContent(message.content, `message ${message.id}`);
        if (message.role === 'tool') {
            input.push({ type: 'function_call_output', call_id: String(message.toolCallId), output: flattenText(message.content) });
            continue;
        }
        if (message.role === 'system') {
            const text = flattenText(message.content);
            if (text.length === 0)
                continue;
            // Leading prompt → instructions; a later one stays in place so the
            // cached prefix before it is reused.
            if (leading)
                instructions.push(text);
            else
                input.push({ type: 'message', role: 'developer', content: [{ type: 'input_text', text }] });
            continue;
        }
        if (message.role === 'developer') {
            // Tool-change events etc.; only their text has a Responses form.
            const text = flattenText(message.content);
            if (text.length > 0)
                input.push({ type: 'message', role: 'developer', content: [{ type: 'input_text', text }] });
            continue;
        }
        if (message.role === 'assistant') {
            let text = '';
            const flushText = () => {
                if (!text)
                    return;
                input.push({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] });
                text = '';
            };
            const replay = replayBlocksFor(message, defaults.replayKey);
            for (const [position, block] of message.content.entries()) {
                const native = replay?.[position];
                if (block.type === 'reasoning' && native && typeof native.encrypted_content === 'string') {
                    flushText();
                    input.push({ type: 'reasoning', summary: native.summary ?? [], encrypted_content: native.encrypted_content });
                }
                else if (block.type === 'tool-call') {
                    flushText();
                    input.push({
                        type: 'function_call',
                        call_id: String(block.id),
                        name: block.name,
                        arguments: block.arguments,
                    });
                }
                else if (block.type === 'text') {
                    text += block.text;
                }
            }
            flushText();
            continue;
        }
        // User text and function outputs retain their original order. A tool
        // result's output can legitimately be an empty string.
        let text = '';
        let emitted = false;
        const flushText = () => {
            if (!text)
                return;
            input.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text }] });
            text = '';
            emitted = true;
        };
        for (const block of message.content) {
            if (block.type === 'tool-result') {
                flushText();
                input.push({
                    type: 'function_call_output',
                    call_id: String(block.toolCallId),
                    output: flattenText(block.content),
                });
                emitted = true;
            }
            else if (block.type === 'text') {
                text += block.text;
            }
        }
        flushText();
        if (!emitted)
            input.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text: '' }] });
    }
    const effortRaw = options.reasoningEffort !== undefined
        ? String(options.reasoningEffort)
        : defaults.reasoningEffort;
    const effort = effortRaw === undefined || !Object.hasOwn(EFFORT_MAP, effortRaw)
        ? undefined
        : EFFORT_MAP[effortRaw];
    if (effortRaw !== undefined && effort === undefined) {
        throw new LlmError(`unsupported reasoning effort "${effortRaw}"`, 'UNSUPPORTED_REASONING_EFFORT');
    }
    return {
        model: options.model,
        ...(instructions.length > 0 ? { instructions: instructions.join('\n\n') } : {}),
        input,
        ...(options.tools !== undefined && options.tools.length > 0
            ? {
                tools: options.tools.map(tool => ({
                    type: 'function',
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                })),
                tool_choice: 'auto',
            }
            : {}),
        ...(effort !== undefined ? { reasoning: effort === 'none' || defaults.reasoningSummary === false ? { effort } : { effort, summary: 'auto' } } : {}),
        ...(effort !== undefined && effort !== 'none' ? { include: ['reasoning.encrypted_content'] } : {}),
        ...(options.sessionId !== undefined && String(options.sessionId).length > 0 ? { prompt_cache_key: promptCacheKey(String(options.sessionId)) } : {}),
        store: false,
        stream: true,
    };
}
//# sourceMappingURL=serialize.js.map