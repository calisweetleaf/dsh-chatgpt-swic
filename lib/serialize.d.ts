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
import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
/** One Responses input item (message, function call, or function output). */
export type ResponsesInputItem = {
    type: 'message';
    role: 'user' | 'developer';
    content: {
        type: 'input_text';
        text: string;
    }[];
} | {
    type: 'message';
    role: 'assistant';
    content: {
        type: 'output_text';
        text: string;
    }[];
} | {
    type: 'function_call';
    call_id: string;
    name: string;
    arguments: string;
} | {
    type: 'function_call_output';
    call_id: string;
    output: string;
} | {
    type: 'reasoning';
    summary: {
        type: 'summary_text';
        text: string;
    }[];
    encrypted_content: string;
};
/** Adapter-private replay data for one response (see ReplayEnvelope). */
export interface SiwcReplayResponse {
    v: 1;
    key: string;
}
/** One per emitted block: a reasoning block's native item, or null. */
export type SiwcReplayBlock = {
    encrypted_content: string;
    summary: {
        type: 'summary_text';
        text: string;
    }[];
} | null;
/** Stable identity for replay and caching; never contains a token or email. */
export declare function replayKey(clientId: string, subject: string, model: string): string;
/** The API caps prompt_cache_key; a longer session id is hashed, not cut. */
export declare function promptCacheKey(sessionId: string): string;
/** The wire body for `POST /v1/responses` under a plan token. */
export interface ResponsesRequest {
    model: string;
    instructions?: string;
    input: ResponsesInputItem[];
    tools?: {
        type: 'function';
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }[];
    tool_choice?: 'auto';
    reasoning?: {
        effort: string;
        summary?: 'auto';
    };
    include?: ['reasoning.encrypted_content'];
    prompt_cache_key?: string;
    store: false;
    stream: true;
}
/** Preserve the selected Responses effort exactly; unsupported model/effort pairs fail upstream. */
export declare const EFFORT_MAP: Readonly<Record<string, string>>;
/**
 * Build one Responses request from a harness request.
 * @param options - the harness request.
 * @param defaults - adapter defaults (reasoning effort when the request names none).
 * @returns the wire body; forbidden fields are absent by construction.
 */
export declare function serializeRequest(options: GenerateOptions, defaults?: {
    reasoningEffort?: string;
    reasoningSummary?: boolean;
    replayKey?: string;
}): ResponsesRequest;
