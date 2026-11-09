/**
 * Locale plumbing shared by every server-side surface (callback pages,
 * error text, CLI). Follows the host convention: locale ids `zh` and `en`,
 * fallback `en`, and `<html lang="zh-CN">` whenever `zh` is active.
 *
 * Chinese copy is Simplified (zh-Hans). Traditional-script requests
 * (`zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`) also resolve to `zh` — a reader of
 * Traditional Chinese is better served by Simplified copy than by English —
 * until a `zh-Hant` dictionary exists.
 *
 * @module dsh-chatgpt-siwc/i18n
 */
/** The locale ids the harness ships. */
export type Locale = 'zh' | 'en';
/** Every locale this plugin carries copy for, fallback last. */
export declare const LOCALES: readonly Locale[];
/** The host's fallback locale. */
export declare const FALLBACK_LOCALE: Locale;
/** Narrow an arbitrary string to a supported locale id, or `undefined`. */
export declare function asLocale(value: string | undefined | null): Locale | undefined;
/** The `lang` attribute an HTML document carries for a locale. */
export declare function htmlLang(locale: Locale): string;
/**
 * Pick the locale for an HTTP request from its `Accept-Language` header.
 * Ranges are ordered by q-value (ties keep header order); `q=0` excludes a
 * range; `*` and unsupported languages are skipped. No match → `en`.
 * @param header - the raw header value (Node gives `string | string[] | undefined`).
 * @returns `zh` or `en`.
 */
export declare function localeFromAcceptLanguage(header: string | readonly string[] | undefined): Locale;
/**
 * Pick the locale from POSIX locale variables, in POSIX precedence:
 * `LC_ALL`, then `LC_MESSAGES`, then `LANG`. The first non-empty one decides;
 * `zh_*` → `zh`, anything else (including `C`/`POSIX`) → `en`.
 * @param env - the environment to read (pass `process.env`; kept explicit so
 *   this module stays importable from the browser bundle).
 */
export declare function localeFromEnv(env: Readonly<Record<string, string | undefined>>): Locale;
/** Parameters a message template interpolates. */
export type MessageParams = Readonly<Record<string, string | number>>;
/**
 * Fill `{name}` placeholders. Unknown placeholders are left as written so a
 * missing parameter is visible rather than silently empty. No escaping —
 * callers that emit HTML escape the result.
 */
export declare function formatMessage(template: string, params?: MessageParams): string;
/** One locale's copy, keyed by the dictionary's own key type. */
export type Dictionary<K extends string> = Readonly<Record<K, string>>;
/** A dictionary pair with identical key sets, enforced by the type. */
export interface Dictionaries<K extends string> {
    readonly en: Dictionary<K>;
    readonly zh: Dictionary<K>;
}
/** A compiled reverse-lookup over the English side of a dictionary. */
export interface MessageMatcher<K extends string> {
    /** Recognize an English message produced from one of the templates. */
    match(text: string): {
        key: K;
        params: Record<string, string>;
    } | undefined;
}
/**
 * Compile a matcher that recognizes English text produced from `en`'s
 * templates — the bridge for strings minted in modules that only speak
 * English (they keep their English `.message`; this recovers key + params).
 * Templates with more literal text are tried first, so a longer variant
 * (e.g. with a trailing provider detail) wins over its shorter prefix.
 */
export declare function compileMatcher<K extends string>(en: Dictionary<K>): MessageMatcher<K>;
