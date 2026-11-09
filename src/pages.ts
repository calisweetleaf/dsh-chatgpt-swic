/**
 * The sign-in pages the loopback flow serves on `127.0.0.1` — the visual
 * surface a user actually sees mid-login. Same identity as the Web UI
 * card: white surface, near-black ink, one accent (green) reserved for
 * "plan active". The callback page is held until the sign-in is validated,
 * so the browser lands on the outcome itself, never on a stale spinner.
 *
 * Every page takes an optional locale (`zh` | `en`, default `en`) — the
 * callback server picks it from the request's `Accept-Language` with
 * `pageLocale(request.headers['accept-language'])` — and sets
 * `<html lang>` to match (`zh-CN` for `zh`). Error text minted in English
 * by the OAuth flow is re-rendered in the page's locale when it is one of
 * this plugin's own messages; unrecognized text (provider detail) is shown
 * as given.
 *
 * @module dsh-chatgpt-siwc/pages
 */

import { htmlLang, localeFromAcceptLanguage, type Locale } from './i18n.ts'
import { localizeMessage } from './errors.ts'
import { pageMessages, type PageMessageKey } from './locales/pages.ts'

export type { Locale } from './i18n.ts'

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background: #f7f7f5; color: #0d0d0d; display: grid; place-items: center; min-height: 100vh; }
  .card { background: #fff; border: 1px solid #e5e5e0; border-radius: 16px; padding: 32px;
          max-width: 420px; width: calc(100vw - 32px); text-align: center;
          box-shadow: 0 8px 30px rgba(0,0,0,.06); }
  .mark { width: 44px; height: 44px; border-radius: 12px; background: #0d0d0d; color: #fff;
          display: grid; place-items: center; font-weight: 700; font-size: 20px; margin: 0 auto 16px; }
  h1 { font-size: 19px; margin: 0 0 8px; }
  p { font-size: 14px; line-height: 1.55; color: #444; margin: 6px 0; }
  .ok { color: #0a7d43; font-weight: 600; }
  .err { color: #b3261e; font-weight: 600; }
  .spinner { width: 22px; height: 22px; border-radius: 50%; border: 3px solid #e5e5e0;
             border-top-color: #0d0d0d; margin: 14px auto 4px; animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fine { font-size: 12px; color: #777; }
`

function page(locale: Locale, title: string, body: string): string {
  return `<!doctype html>
<html lang="${htmlLang(locale)}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${pageMessages[locale].titleSuffix}</title><style>${STYLE}</style></head>
<body><main class="card"><div class="mark">C</div>${body}</main></body></html>`
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/gu, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!
  ))
}

/** Untyped callers may pass anything; only `zh` selects Chinese. */
function supported(locale: Locale | undefined): Locale {
  return locale === 'zh' ? 'zh' : 'en'
}

function copy(locale: Locale): (key: PageMessageKey) => string {
  const dictionary = pageMessages[locale]
  return key => dictionary[key]
}

/**
 * The page locale for a loopback request.
 * @param acceptLanguage - `request.headers['accept-language']`.
 * @returns `zh` for any `zh*` range preferred over other supported ones (q-values respected), else `en`.
 */
export function pageLocale(acceptLanguage: string | readonly string[] | undefined): Locale {
  return localeFromAcceptLanguage(acceptLanguage)
}

/** Shown in the browser tab while the user completes consent on OpenAI's page (the root of the loopback server). */
export function waitingPage(requested: Locale = 'en'): string {
  const locale = supported(requested)
  const t = copy(locale)
  return page(locale, t('waitingTitle'), `
    <h1>${t('waitingHeading')}</h1>
    <div class="spinner" role="status" aria-label="${t('waitingAria')}"></div>
    <p>${t('waitingBody')}</p>
    <p class="fine">${t('waitingPassword')}</p>`)
}

/** Shown on the loopback callback after a validated sign-in. */
export function successPage(email: string | undefined, plan: boolean, firstTime: boolean, requested: Locale = 'en'): string {
  const locale = supported(requested)
  const t = copy(locale)
  return page(locale, t('successTitle'), `
    <h1 class="ok">${t('successHeading')}</h1>
    ${email !== undefined ? `<p>${escapeHtml(email)}</p>` : ''}
    ${plan
      ? `<p><strong>${t('planActiveLead')}</strong>${t('planActiveBody')}</p>`
      : `<p class="err">${t('planMissing')}</p>`}
    ${firstTime && plan
      ? `<p class="fine">${t('firstTimeHint')}</p>`
      : ''}
    <p class="fine">${t('successClose')}</p>`)
}

/** Shown on the loopback callback when the flow fails or is denied. */
export function errorPage(message: string, requested: Locale = 'en'): string {
  const locale = supported(requested)
  const t = copy(locale)
  return page(locale, t('errorTitle'), `
    <h1 class="err">${t('errorHeading')}</h1>
    <p>${escapeHtml(localizeMessage(message, locale))}</p>
    <p class="fine">${t('errorRetry')}</p>`)
}
