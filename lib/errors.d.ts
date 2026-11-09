/**
 * Error vocabulary for the SIWC flow. OpenAI's plan-usage failures use
 * `subscription_sharing_*` codes — before the stream (as a `{"detail": …}`
 * admission failure or a structured Responses error) and mid-stream (as
 * `response.failed`). Each one maps to a plain instruction plus the
 * Manage usage destination, per the official UI guidelines: the limit may
 * be the plan's or this app's per-app cap, and the user resolves it in
 * ChatGPT settings, not here.
 *
 * Localization: the machine `code` is stable and English; `.message` stays
 * English (logs, back-compat). The human text is available in every
 * shipped locale through `localizeError` / `localizeMessage`, driven by a
 * message key carried on the error (or recovered from its English text).
 *
 * @module dsh-chatgpt-siwc/errors
 */
import { type Locale, type MessageParams } from './i18n.ts';
import { type ErrorMessageKey } from './locales/errors.ts';
export type { ErrorMessageKey } from './locales/errors.ts';
export { errorMessages, matchErrorMessage } from './locales/errors.ts';
/** `ErrorOptions` plus the optional localization handle. */
export interface SiwcErrorOptions extends ErrorOptions {
    /** The message key the English `message` was rendered from. */
    key?: ErrorMessageKey;
    /** Parameters the key's template interpolates. */
    params?: MessageParams;
}
/** One failure in this plugin, carrying a stable machine-routable code. */
export declare class SiwcError extends Error {
    readonly code: string;
    /** Message key for localized rendering; recovered from `message` when not given. */
    readonly key?: ErrorMessageKey;
    /** Parameters for `key`'s template. */
    readonly params?: MessageParams;
    constructor(message: string, code: string, options?: SiwcErrorOptions);
    /**
     * Build an error from a message key: `.message` is the English rendering.
     * @param key - the message key.
     * @param code - the stable machine code.
     * @param params - template parameters.
     */
    static fromKey(key: ErrorMessageKey, code: string, params?: MessageParams, options?: ErrorOptions): SiwcError;
}
/**
 * Render a message key in a locale.
 * @param key - the message key.
 * @param locale - `zh` or `en`.
 * @param params - template parameters.
 */
export declare function errorText(key: ErrorMessageKey, locale: Locale, params?: MessageParams): string;
/**
 * Localize free English error text produced by this plugin. Unrecognized
 * text (e.g. provider-supplied detail) is returned unchanged.
 */
export declare function localizeMessage(text: string, locale: Locale): string;
/**
 * The human message for any thrown value, in `locale`. Uses the error's own
 * key when it carries one (`SiwcError`, or anything with a `key` of this
 * vocabulary), else recognizes its English `message`, else returns that
 * message unchanged. Never includes token material: it only re-renders the
 * error's own text.
 */
export declare function localizeError(error: unknown, locale: Locale): string;
/**
 * The message key and parameters for a plan-usage failure.
 * @param code - the provider error code, when one was supplied.
 * @param detail - the provider's own message/detail text, when supplied.
 * @returns a key + params, or `undefined` when the provider detail itself is the message.
 */
export declare function subscriptionErrorKey(code: string | undefined, detail?: string): {
    key: ErrorMessageKey;
    params: Record<string, string>;
} | undefined;
/**
 * Explain any `subscription_sharing_*` failure in user terms.
 * @param code - the provider error code, when one was supplied.
 * @param detail - the provider's own message/detail text, when supplied.
 * @param locale - output language; English by default (back-compat).
 * @returns a user-facing explanation; unknown codes keep the provider detail.
 */
export declare function describeSubscriptionError(code: string | undefined, detail?: string, locale?: Locale): string;
/** Whether a provider code is one of the plan-usage family. */
export declare function isSubscriptionError(code: string | undefined): boolean;
/** Whether a provider code means the plan/app usage limit is exhausted. */
export declare function isUsageLimitError(code: string | undefined): boolean;
