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
export type Locale = 'zh' | 'en'

/** Every locale this plugin carries copy for, fallback last. */
export const LOCALES: readonly Locale[] = ['zh', 'en']

/** The host's fallback locale. */
export const FALLBACK_LOCALE: Locale = 'en'

/** Narrow an arbitrary string to a supported locale id, or `undefined`. */
export function asLocale(value: string | undefined | null): Locale | undefined {
  if (value === undefined || value === null) return undefined
  const tag = value.trim().toLowerCase().replace(/_/gu, '-')
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
  if (tag === 'en' || tag.startsWith('en-')) return 'en'
  return undefined
}

/** The `lang` attribute an HTML document carries for a locale. */
export function htmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en'
}

/**
 * Pick the locale for an HTTP request from its `Accept-Language` header.
 * Ranges are ordered by q-value (ties keep header order); `q=0` excludes a
 * range; `*` and unsupported languages are skipped. No match → `en`.
 * @param header - the raw header value (Node gives `string | string[] | undefined`).
 * @returns `zh` or `en`.
 */
export function localeFromAcceptLanguage(header: string | readonly string[] | undefined): Locale {
  if (header === undefined) return FALLBACK_LOCALE
  const raw = typeof header === 'string' ? header : header.join(',')
  const ranges = raw.split(',').map((part, index) => {
    const [tagPart, ...params] = part.split(';')
    let q = 1
    for (const param of params) {
      const [name, value] = param.split('=').map(text => text.trim())
      if (name?.toLowerCase() === 'q' && value !== undefined) {
        const parsed = Number(value)
        q = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0
      }
    }
    return { tag: (tagPart ?? '').trim(), q, index }
  }).filter(range => range.tag.length > 0 && range.q > 0)
  ranges.sort((a, b) => b.q - a.q || a.index - b.index)
  for (const range of ranges) {
    const locale = asLocale(range.tag)
    if (locale !== undefined) return locale
  }
  return FALLBACK_LOCALE
}

/**
 * Pick the locale from POSIX locale variables, in POSIX precedence:
 * `LC_ALL`, then `LC_MESSAGES`, then `LANG`. The first non-empty one decides;
 * `zh_*` → `zh`, anything else (including `C`/`POSIX`) → `en`.
 * @param env - the environment to read (pass `process.env`; kept explicit so
 *   this module stays importable from the browser bundle).
 */
export function localeFromEnv(env: Readonly<Record<string, string | undefined>>): Locale {
  for (const name of ['LC_ALL', 'LC_MESSAGES', 'LANG'] as const) {
    const value = env[name]
    if (value === undefined || value.length === 0) continue
    return asLocale(value.split('.')[0]) ?? FALLBACK_LOCALE
  }
  return FALLBACK_LOCALE
}

/** Parameters a message template interpolates. */
export type MessageParams = Readonly<Record<string, string | number>>

/**
 * Fill `{name}` placeholders. Unknown placeholders are left as written so a
 * missing parameter is visible rather than silently empty. No escaping —
 * callers that emit HTML escape the result.
 */
export function formatMessage(template: string, params?: MessageParams): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/gu, (whole, name: string) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole
  ))
}

/** One locale's copy, keyed by the dictionary's own key type. */
export type Dictionary<K extends string> = Readonly<Record<K, string>>

/** A dictionary pair with identical key sets, enforced by the type. */
export interface Dictionaries<K extends string> {
  readonly en: Dictionary<K>
  readonly zh: Dictionary<K>
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

/** A compiled reverse-lookup over the English side of a dictionary. */
export interface MessageMatcher<K extends string> {
  /** Recognize an English message produced from one of the templates. */
  match(text: string): { key: K; params: Record<string, string> } | undefined
}

/**
 * Compile a matcher that recognizes English text produced from `en`'s
 * templates — the bridge for strings minted in modules that only speak
 * English (they keep their English `.message`; this recovers key + params).
 * Templates with more literal text are tried first, so a longer variant
 * (e.g. with a trailing provider detail) wins over its shorter prefix.
 */
export function compileMatcher<K extends string>(en: Dictionary<K>): MessageMatcher<K> {
  const entries = (Object.keys(en) as K[]).map((key) => {
    const template = en[key]
    const names: string[] = []
    const source = template.split(/(\{\w+\})/u).map((part) => {
      const placeholder = /^\{(\w+)\}$/u.exec(part)
      if (placeholder === null) return escapeRegExp(part)
      names.push(placeholder[1]!)
      return '([\\s\\S]+?)'
    }).join('')
    const literal = template.replace(/\{\w+\}/gu, '').length
    return { key, names, re: new RegExp(`^${source}$`, 'u'), literal }
  }).sort((a, b) => b.literal - a.literal)
  return {
    match(text) {
      for (const entry of entries) {
        const found = entry.re.exec(text)
        if (found === null) continue
        const params: Record<string, string> = {}
        entry.names.forEach((name, i) => { params[name] = found[i + 1]! })
        return { key: entry.key, params }
      }
      return undefined
    },
  }
}
