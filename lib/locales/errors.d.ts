/**
 * Human error text, English and Simplified Chinese. The machine-readable
 * error `code` never appears here and is never translated.
 *
 * The English side is also the recognition table: modules that mint errors
 * in English (OAuth, JWT, config, adapter) keep doing so, and
 * `matchErrorMessage` recovers the key and parameters from that English text,
 * so a Chinese reader gets Chinese without those modules changing. Every
 * English template here therefore reproduces its source string exactly;
 * `tests/i18n.test.ts` pins that.
 *
 * Imported by both the server and the browser card — keep it free of Node APIs.
 *
 * @module dsh-chatgpt-siwc/locales/errors
 */
import { type Dictionaries } from '../i18n.ts';
export declare const errorEn: {
    readonly controlPlaneTimeout: "ChatGPT connection timed out. Check your network and retry; the saved account was not changed.";
    readonly storeLocked: "The account store is busy or has an orphan writer lock. Stop every DSH and SIWC process, confirm the lock owner is no longer running, then remove only the adjacent .lock file and retry. Never delete or share the account file.";
    readonly planUsageLimitExceeded: "ChatGPT plan usage limit reached for this app or for your plan. Review the applicable limit under Manage usage: {url}";
    readonly planUsageUnavailable: "ChatGPT plan usage is temporarily unavailable for this account. Check your plan status under Manage usage: {url}";
    readonly planNotEntitled: "This ChatGPT account is not eligible for plan usage in third-party apps (Plus or Pro required). Identity sign-in alone does not grant model usage.";
    readonly planNotGranted: "ChatGPT plan usage was not granted at sign-in. Sign in again and approve plan usage on the consent screen.";
    readonly planRefused: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url}";
    readonly planRefusedWithDetail: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url} Provider detail: {detail}";
    readonly planRequestFailed: "ChatGPT plan request failed.";
    readonly planTokenRefused: "the ChatGPT plan token was refused. Run `dsh-chatgpt-siwc login` to sign in again.";
    readonly planNotGrantedForApp: "this ChatGPT account is signed in, but plan usage was not granted for this app. Check the app's plan access and per-app cap in ChatGPT settings (Manage usage), then sign in again.";
    readonly notSignedIn: "Not signed in with ChatGPT. Run `dsh-chatgpt-siwc login` or `/chatgpt login` first.";
    readonly signInMissing: "ChatGPT sign-in is missing or no longer valid. Run `dsh-chatgpt-siwc login` (or sign in from the harness settings) and try again.";
    readonly sessionExpired: "ChatGPT session expired or was disconnected. Sign in again.";
    readonly noRefreshToken: "no refresh token stored; sign in again";
    readonly loginInProgress: "a ChatGPT sign-in is already in progress";
    readonly loginInProgressShort: "A sign-in is already in progress.";
    readonly loginCouldNotStart: "ChatGPT sign-in could not start";
    readonly signOutStillInProgress: "ChatGPT sign-out is still in progress";
    readonly signOutAlreadyInProgress: "ChatGPT sign-out is already in progress";
    readonly accountRequestFailed: "Account request failed. Try again.";
    readonly callbackStateMismatch: "Sign-in callback state did not match this attempt. Nothing was exchanged.";
    readonly authorizationFailed: "Authorization failed: {error}";
    readonly callbackNoCode: "Authorization callback carried no code.";
    readonly attemptAlreadyCompleted: "This sign-in attempt already completed. Start the sign-in again for a new one.";
    readonly signInDeadline: "The sign-in did not complete in time. Run the sign-in again.";
    readonly callbackTimeout: "sign-in callback did not arrive in time";
    readonly signInAborted: "sign-in aborted";
    readonly listenerNoPort: "loopback listener has no port";
    readonly tokenRefused: "token endpoint refused the request: {detail}";
    readonly tokenNoAccessToken: "token endpoint returned no access token";
    readonly tokenNoIdToken: "token response carried no ID token; identity cannot be validated";
    readonly unknownAccount: "no registration for client id {clientId}";
    readonly clientIdMismatch: "callback returned a different client id than the selected account";
    readonly registrationIncomplete: "registration callback returned no issued client id";
    readonly identityMismatch: "signed-in identity does not match the selected account";
    readonly jwtSegmentNotObject: "JWT segment is not a JSON object";
    readonly idTokenNotJwt: "ID token is not a JWT";
    readonly jwksFetchFailed: "JWKS fetch failed (HTTP {status})";
    readonly jwksNoKeys: "JWKS document has no keys";
    readonly idTokenAlg: "ID token alg is {alg}, expected RS256";
    readonly idTokenNoKid: "ID token has no kid";
    readonly idTokenUnknownKid: "no JWKS key for kid {kid}";
    readonly idTokenSignature: "ID token signature does not verify";
    readonly idTokenIssuer: "ID token issuer {issuer} is not {expected}";
    readonly idTokenAudience: "ID token audience does not match the issued client id";
    readonly idTokenAzp: "ID token azp does not match the issued client id";
    readonly idTokenExpired: "ID token is expired";
    readonly idTokenNotYetValid: "ID token is not yet valid";
    readonly idTokenNonce: "ID token nonce does not match this sign-in attempt";
    readonly idTokenNoSubject: "ID token has no subject";
    readonly modelCatalogHttp: "model catalog request failed (HTTP {status})";
    readonly modelCatalogNotObject: "model catalog response is not an object";
    readonly modelCatalogNoRows: "model catalog response contains neither models nor data";
    readonly configProviderEmpty: "provider route name must not be empty";
    readonly configAppNameEmpty: "app name must not be empty";
    readonly catalogAccountChanged: "The signed-in account changed during catalog refresh. Refresh the model index again.";
    readonly configUnsupportedEffort: "unsupported reasoning effort \"{effort}\"";
    readonly configIdleTimeout: "stream idle timeout must be a positive integer in milliseconds";
    readonly configApiBaseInvalid: "API base URL must be an absolute URL on https://api.openai.com (or a loopback host for local testing)";
    readonly configApiBaseCredentials: "API base URL must not carry credentials, a query, or a fragment";
    readonly configApiBaseOrigin: "API base URL origin {origin} is not allowed; the ChatGPT plan token is only sent to {allowed} (or a loopback host for local testing)";
    readonly configApiRequestOrigin: "API request URL left the configured API origin";
    readonly registrationRollbackFailed: "provider rename and rollback failed; the inconsistent route was removed. Save a valid provider route to restore it.";
    readonly unsupportedContent: "ChatGPT plan route does not accept {kind} input ({where}); the request was not sent.";
    readonly providerReportedError: "the provider reported an error";
    readonly providerRateLimited: "rate limited by the provider";
    readonly providerHttp: "the provider answered HTTP {status}";
    readonly streamNoTerminal: "the Responses stream ended without a terminal event";
    readonly callAborted: "the call was aborted";
};
/** Every human error message key. */
export type ErrorMessageKey = keyof typeof errorEn;
export declare const errorZh: Record<ErrorMessageKey, string>;
/** Both error dictionaries. */
export declare const errorMessages: Dictionaries<ErrorMessageKey>;
/**
 * Recover the message key and parameters from an English error message
 * produced by one of this plugin's modules.
 * @returns the key and parameters, or `undefined` for unrecognized text
 *   (provider-supplied detail, foreign errors).
 */
export declare function matchErrorMessage(text: string): {
    key: ErrorMessageKey;
    params: Record<string, string>;
} | undefined;
