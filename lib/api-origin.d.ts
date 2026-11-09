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
/** The one public origin the plan token is scoped to. */
export declare const API_ORIGIN: string;
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
export declare function assertTokenApiBase(base: string): URL;
/**
 * The absolute URL for one API path under a validated base, re-checking the
 * resulting origin so a crafted path can never move the request elsewhere.
 * @param base - the API base (e.g. `https://api.openai.com/v1`).
 * @param path - the path suffix, starting with `/` (e.g. `/responses`).
 */
export declare function tokenApiUrl(base: string, path: string): string;
