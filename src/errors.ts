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

import { MANAGE_USAGE_URL } from './constants.ts'
import { formatMessage, type Locale, type MessageParams } from './i18n.ts'
import { errorMessages, matchErrorMessage, type ErrorMessageKey } from './locales/errors.ts'

export type { ErrorMessageKey } from './locales/errors.ts'
export { errorMessages, matchErrorMessage } from './locales/errors.ts'

/** `ErrorOptions` plus the optional localization handle. */
export interface SiwcErrorOptions extends ErrorOptions {
  /** The message key the English `message` was rendered from. */
  key?: ErrorMessageKey
  /** Parameters the key's template interpolates. */
  params?: MessageParams
}

/** One failure in this plugin, carrying a stable machine-routable code. */
export class SiwcError extends Error {
  /** Message key for localized rendering; recovered from `message` when not given. */
  readonly key?: ErrorMessageKey
  /** Parameters for `key`'s template. */
  readonly params?: MessageParams

  constructor(
    message: string,
    readonly code: string,
    options?: SiwcErrorOptions,
  ) {
    super(message, options)
    this.name = 'SiwcError'
    const recovered = options?.key === undefined ? matchErrorMessage(message) : undefined
    const key = options?.key ?? recovered?.key
    const params = options?.params ?? recovered?.params
    if (key !== undefined) this.key = key
    if (params !== undefined) this.params = params
  }

  /**
   * Build an error from a message key: `.message` is the English rendering.
   * @param key - the message key.
   * @param code - the stable machine code.
   * @param params - template parameters.
   */
  static fromKey(key: ErrorMessageKey, code: string, params?: MessageParams, options?: ErrorOptions): SiwcError {
    return new SiwcError(formatMessage(errorMessages.en[key], params), code, {
      ...options, key, ...(params === undefined ? {} : { params }),
    })
  }
}

/**
 * Render a message key in a locale.
 * @param key - the message key.
 * @param locale - `zh` or `en`.
 * @param params - template parameters.
 */
export function errorText(key: ErrorMessageKey, locale: Locale, params?: MessageParams): string {
  return formatMessage(errorMessages[locale][key], params)
}

/**
 * Localize free English error text produced by this plugin. Unrecognized
 * text (e.g. provider-supplied detail) is returned unchanged.
 */
export function localizeMessage(text: string, locale: Locale): string {
  if (locale === 'en') return text
  const found = matchErrorMessage(text)
  return found === undefined ? text : errorText(found.key, locale, found.params)
}

/**
 * The human message for any thrown value, in `locale`. Uses the error's own
 * key when it carries one (`SiwcError`, or anything with a `key` of this
 * vocabulary), else recognizes its English `message`, else returns that
 * message unchanged. Never includes token material: it only re-renders the
 * error's own text.
 */
export function localizeError(error: unknown, locale: Locale): string {
  if (error !== null && typeof error === 'object') {
    const candidate = error as { key?: unknown; params?: unknown; message?: unknown }
    if (typeof candidate.key === 'string' && Object.prototype.hasOwnProperty.call(errorMessages.en, candidate.key)) {
      const params = candidate.params !== null && typeof candidate.params === 'object'
        ? candidate.params as MessageParams
        : undefined
      return errorText(candidate.key as ErrorMessageKey, locale, params)
    }
    if (typeof candidate.message === 'string') return localizeMessage(candidate.message, locale)
  }
  return localizeMessage(String(error), locale)
}

/** The two documented usage-limit codes and the other documented plan codes, by message key. */
const SUBSCRIPTION_KEYS: Record<string, ErrorMessageKey> = {
  subscription_sharing_usage_limit_exceeded: 'planUsageLimitExceeded',
  subscription_sharing_usage_unavailable: 'planUsageUnavailable',
  subscription_sharing_not_entitled: 'planNotEntitled',
  subscription_sharing_plan_not_granted: 'planNotGranted',
}

/**
 * The message key and parameters for a plan-usage failure.
 * @param code - the provider error code, when one was supplied.
 * @param detail - the provider's own message/detail text, when supplied.
 * @returns a key + params, or `undefined` when the provider detail itself is the message.
 */
export function subscriptionErrorKey(
  code: string | undefined,
  detail?: string,
): { key: ErrorMessageKey; params: Record<string, string> } | undefined {
  if (code !== undefined && code in SUBSCRIPTION_KEYS) return { key: SUBSCRIPTION_KEYS[code]!, params: { url: MANAGE_USAGE_URL } }
  if (code !== undefined && code.startsWith('subscription_sharing_')) {
    return detail !== undefined && detail.length > 0
      ? { key: 'planRefusedWithDetail', params: { code, url: MANAGE_USAGE_URL, detail } }
      : { key: 'planRefused', params: { code, url: MANAGE_USAGE_URL } }
  }
  if (detail !== undefined && detail.length > 0) return undefined
  return { key: 'planRequestFailed', params: {} }
}

/**
 * Explain any `subscription_sharing_*` failure in user terms.
 * @param code - the provider error code, when one was supplied.
 * @param detail - the provider's own message/detail text, when supplied.
 * @param locale - output language; English by default (back-compat).
 * @returns a user-facing explanation; unknown codes keep the provider detail.
 */
export function describeSubscriptionError(code: string | undefined, detail?: string, locale: Locale = 'en'): string {
  const found = subscriptionErrorKey(code, detail)
  return found === undefined ? detail! : errorText(found.key, locale, found.params)
}

/** Whether a provider code is one of the plan-usage family. */
export function isSubscriptionError(code: string | undefined): boolean {
  return code !== undefined && code.startsWith('subscription_sharing_')
}

/** Whether a provider code means the plan/app usage limit is exhausted. */
export function isUsageLimitError(code: string | undefined): boolean {
  return code === 'subscription_sharing_usage_limit_exceeded'
}
