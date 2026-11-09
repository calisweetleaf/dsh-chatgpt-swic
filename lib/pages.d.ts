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
import { type Locale } from './i18n.ts';
export type { Locale } from './i18n.ts';
/**
 * The page locale for a loopback request.
 * @param acceptLanguage - `request.headers['accept-language']`.
 * @returns `zh` for any `zh*` range preferred over other supported ones (q-values respected), else `en`.
 */
export declare function pageLocale(acceptLanguage: string | readonly string[] | undefined): Locale;
/** Shown in the browser tab while the user completes consent on OpenAI's page (the root of the loopback server). */
export declare function waitingPage(requested?: Locale): string;
/** Shown on the loopback callback after a validated sign-in. */
export declare function successPage(email: string | undefined, plan: boolean, firstTime: boolean, requested?: Locale): string;
/** Shown on the loopback callback when the flow fails or is denied. */
export declare function errorPage(message: string, requested?: Locale): string;
