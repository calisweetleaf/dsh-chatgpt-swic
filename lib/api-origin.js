/**
 * Where the plan access token may travel. The SIWC access token is a bearer
 * credential for the signed-in user's ChatGPT plan; it is only ever attached
 * to requests for the public API origin (`https://api.openai.com`) or, for
 * local testing and local proxies, a loopback origin. Any other base URL is
 * refused at configuration time (plugin settings) and again at request time
 * (adapter and model discovery), so a programmatic caller that bypasses the
 * settings validator still cannot redirect the token.
 *
 * The OAuth control plane (authorize/token/JWKS/revocation) is pinned
 * separately: see `discoverEndpoints` in oauth.ts.
 *
 * @module dsh-chatgpt-siwc/api-origin
 */
import { API_BASE_URL } from "./constants.js";
import { SiwcError } from "./errors.js";
/** The one public origin the plan token is scoped to. */
export const API_ORIGIN = new URL(API_BASE_URL).origin;
/** Loopback host names as `URL.hostname` renders them (IPv6 keeps its brackets). */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);
/**
 * Validate an API base URL as a destination for the bearer access token.
 * Accepted: `https://api.openai.com` on its default port, with any path; and
 * `http`/`https` on `127.0.0.1`, `[::1]` or `localhost`, any port. Refused:
 * every other host (including look-alikes such as `api.openai.com.evil.com`
 * and the trailing-dot form `api.openai.com.`), non-default ports on the
 * public origin, embedded credentials, a query, or a fragment.
 * @param base - the configured base URL.
 * @returns the parsed URL.
 * @throws SiwcError `INVALID_CONFIG` when the token may not be sent there.
 */
export function assertTokenApiBase(base) {
    let url;
    try {
        url = new URL(base);
    }
    catch {
        throw new SiwcError('API base URL must be an absolute URL on https://api.openai.com (or a loopback host for local testing)', 'INVALID_CONFIG');
    }
    if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') {
        throw new SiwcError('API base URL must not carry credentials, a query, or a fragment', 'INVALID_CONFIG');
    }
    const loopback = LOOPBACK_HOSTS.has(url.hostname) && (url.protocol === 'http:' || url.protocol === 'https:');
    // URL normalizes host case and the default :443, so the origin comparison
    // is exact: any other host, port, or scheme yields a different origin.
    if (!loopback && url.origin !== API_ORIGIN) {
        throw new SiwcError(`API base URL origin ${url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : url.protocol} is not allowed; the ChatGPT plan token is only sent to ${API_ORIGIN} (or a loopback host for local testing)`, 'INVALID_CONFIG');
    }
    return url;
}
/**
 * The absolute URL for one API path under a validated base, re-checking the
 * resulting origin so a crafted path can never move the request elsewhere.
 * @param base - the API base (e.g. `https://api.openai.com/v1`).
 * @param path - the path suffix, starting with `/` (e.g. `/responses`).
 */
export function tokenApiUrl(base, path) {
    const parsed = assertTokenApiBase(base);
    const target = `${base.replace(/\/+$/u, '')}${path}`;
    const resolved = new URL(target);
    if (resolved.origin !== parsed.origin) {
        throw new SiwcError('API request URL left the configured API origin', 'INVALID_CONFIG');
    }
    return target;
}
//# sourceMappingURL=api-origin.js.map