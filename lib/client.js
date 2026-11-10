window.__ModuleLoader__.load({ id: "dsh-chatgpt-siwc", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  NS: () => NS,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/card.tsx
var import_react = require("react");

// src/constants.ts
var ISSUER = "https://auth.openai.com";
var DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
var RESPONSES_EFFORTS = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
var IDENTITY_SCOPES = ["openid", "profile", "email"];
var PLAN_SCOPES = ["offline_access", "resource.invoke", "chatgpt.tokens.use.direct"];
var ALL_SCOPES = [...IDENTITY_SCOPES, ...PLAN_SCOPES];
var MANAGE_USAGE_URL = "https://chatgpt.com/settings/usage";
var REFRESH_SKEW_MS = 5 * 60 * 1e3;

// src/i18n.ts
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
function compileMatcher(en2) {
  const entries = Object.keys(en2).map((key) => {
    const template = en2[key];
    const names = [];
    const source = template.split(/(\{\w+\})/u).map((part) => {
      const placeholder = /^\{(\w+)\}$/u.exec(part);
      if (placeholder === null) return escapeRegExp(part);
      names.push(placeholder[1]);
      return "([\\s\\S]+?)";
    }).join("");
    const literal = template.replace(/\{\w+\}/gu, "").length;
    return { key, names, re: new RegExp(`^${source}$`, "u"), literal };
  }).sort((a, b) => b.literal - a.literal);
  return {
    match(text) {
      for (const entry of entries) {
        const found = entry.re.exec(text);
        if (found === null) continue;
        const params = {};
        entry.names.forEach((name, i) => {
          params[name] = found[i + 1];
        });
        return { key: entry.key, params };
      }
      return void 0;
    }
  };
}

// src/locales/errors.ts
var errorEn = {
  controlPlaneTimeout: "ChatGPT connection timed out. Check your network and retry; the saved account was not changed.",
  storeLocked: "The account store is busy or has an orphan writer lock. Stop every DSH and SIWC process, confirm the lock owner is no longer running, then remove only the adjacent .lock file and retry. Never delete or share the account file.",
  // Plan usage (subscription_sharing_*), see errors.ts.
  planUsageLimitExceeded: "ChatGPT plan usage limit reached for this app or for your plan. Review the applicable limit under Manage usage: {url}",
  planUsageUnavailable: "ChatGPT plan usage is temporarily unavailable for this account. Check your plan status under Manage usage: {url}",
  planNotEntitled: "This ChatGPT account is not eligible for plan usage in third-party apps (Plus or Pro required). Identity sign-in alone does not grant model usage.",
  planNotGranted: "ChatGPT plan usage was not granted at sign-in. Sign in again and approve plan usage on the consent screen.",
  planRefused: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url}",
  planRefusedWithDetail: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url} Provider detail: {detail}",
  planRequestFailed: "ChatGPT plan request failed.",
  planTokenRefused: "the ChatGPT plan token was refused. Run `dsh-chatgpt-siwc login` to sign in again.",
  planNotGrantedForApp: "this ChatGPT account is signed in, but plan usage was not granted for this app. Check the app's plan access and per-app cap in ChatGPT settings (Manage usage), then sign in again.",
  // Sign-in state.
  notSignedIn: "Not signed in with ChatGPT. Run `dsh-chatgpt-siwc login` or `/chatgpt login` first.",
  signInMissing: "ChatGPT sign-in is missing or no longer valid. Run `dsh-chatgpt-siwc login` (or sign in from the harness settings) and try again.",
  sessionExpired: "ChatGPT session expired or was disconnected. Sign in again.",
  noRefreshToken: "no refresh token stored; sign in again",
  loginInProgress: "a ChatGPT sign-in is already in progress",
  loginInProgressShort: "A sign-in is already in progress.",
  loginCouldNotStart: "ChatGPT sign-in could not start",
  signOutStillInProgress: "ChatGPT sign-out is still in progress",
  signOutAlreadyInProgress: "ChatGPT sign-out is already in progress",
  accountRequestFailed: "Account request failed. Try again.",
  // Loopback callback.
  callbackStateMismatch: "Sign-in callback state did not match this attempt. Nothing was exchanged.",
  authorizationFailed: "Authorization failed: {error}",
  callbackNoCode: "Authorization callback carried no code.",
  attemptAlreadyCompleted: "This sign-in attempt already completed. Start the sign-in again for a new one.",
  signInDeadline: "The sign-in did not complete in time. Run the sign-in again.",
  callbackTimeout: "sign-in callback did not arrive in time",
  signInAborted: "sign-in aborted",
  listenerNoPort: "loopback listener has no port",
  // Token exchange and registration.
  tokenRefused: "token endpoint refused the request: {detail}",
  tokenNoAccessToken: "token endpoint returned no access token",
  tokenNoIdToken: "token response carried no ID token; identity cannot be validated",
  unknownAccount: "no registration for client id {clientId}",
  clientIdMismatch: "callback returned a different client id than the selected account",
  registrationIncomplete: "registration callback returned no issued client id",
  identityMismatch: "signed-in identity does not match the selected account",
  // ID-token verification.
  jwtSegmentNotObject: "JWT segment is not a JSON object",
  idTokenNotJwt: "ID token is not a JWT",
  jwksFetchFailed: "JWKS fetch failed (HTTP {status})",
  jwksNoKeys: "JWKS document has no keys",
  idTokenAlg: "ID token alg is {alg}, expected RS256",
  idTokenNoKid: "ID token has no kid",
  idTokenUnknownKid: "no JWKS key for kid {kid}",
  idTokenSignature: "ID token signature does not verify",
  idTokenIssuer: "ID token issuer {issuer} is not {expected}",
  idTokenAudience: "ID token audience does not match the issued client id",
  idTokenAzp: "ID token azp does not match the issued client id",
  idTokenExpired: "ID token is expired",
  idTokenNotYetValid: "ID token is not yet valid",
  idTokenNonce: "ID token nonce does not match this sign-in attempt",
  idTokenNoSubject: "ID token has no subject",
  // Model catalog.
  modelCatalogHttp: "model catalog request failed (HTTP {status})",
  modelCatalogNotObject: "model catalog response is not an object",
  modelCatalogNoRows: "model catalog response contains neither models nor data",
  // Configuration.
  configProviderEmpty: "provider route name must not be empty",
  configAppNameEmpty: "app name must not be empty",
  catalogAccountChanged: "The signed-in account changed during catalog refresh. Refresh the model index again.",
  configUnsupportedEffort: 'unsupported reasoning effort "{effort}"',
  configIdleTimeout: "stream idle timeout must be a positive integer in milliseconds",
  configApiBaseInvalid: "API base URL must be an absolute URL on https://api.openai.com (or a loopback host for local testing)",
  configApiBaseCredentials: "API base URL must not carry credentials, a query, or a fragment",
  configApiBaseOrigin: "API base URL origin {origin} is not allowed; the ChatGPT plan token is only sent to {allowed} (or a loopback host for local testing)",
  configApiRequestOrigin: "API request URL left the configured API origin",
  registrationRollbackFailed: "provider rename and rollback failed; the inconsistent route was removed. Save a valid provider route to restore it.",
  // Provider / stream.
  unsupportedContent: "ChatGPT plan route does not accept {kind} input ({where}); the request was not sent.",
  providerReportedError: "the provider reported an error",
  providerRateLimited: "rate limited by the provider",
  providerHttp: "the provider answered HTTP {status}",
  streamNoTerminal: "the Responses stream ended without a terminal event",
  streamIdle: "the Responses stream was idle for {timeoutMs} ms",
  responseHeaderTimeout: "timed out waiting for the Responses HTTP headers",
  responseTransport: "could not connect to the Responses API before receiving HTTP headers",
  responseNoBody: "the Responses API returned no stream body",
  responseIncomplete: "the response was incomplete ({reason})",
  responseCancelled: "the provider cancelled the response",
  callAborted: "the call was aborted"
};
var errorZh = {
  controlPlaneTimeout: "ChatGPT \u8FDE\u63A5\u8D85\u65F6\u3002\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5\uFF1B\u4FDD\u5B58\u7684\u8D26\u6237\u672A\u66F4\u6539\u3002",
  storeLocked: "\u8D26\u6237\u5B58\u50A8\u6B63\u5FD9\uFF0C\u6216\u5B58\u5728\u9057\u7559\u7684\u5199\u5165\u9501\u3002\u8BF7\u505C\u6B62\u6240\u6709 DSH \u548C SIWC \u8FDB\u7A0B\uFF0C\u786E\u8BA4\u9501\u7684\u6301\u6709\u8FDB\u7A0B\u5DF2\u9000\u51FA\uFF0C\u518D\u4EC5\u5220\u9664\u76F8\u90BB\u7684 .lock \u6587\u4EF6\u540E\u91CD\u8BD5\u3002\u4E0D\u8981\u5220\u9664\u6216\u5206\u4EAB\u8D26\u6237\u6587\u4EF6\u3002",
  planUsageLimitExceeded: "\u5DF2\u8FBE\u5230\u6B64\u5E94\u7528\u6216\u4F60\u7684\u5957\u9910\u7684 ChatGPT \u5957\u9910\u7528\u91CF\u4E0A\u9650\u3002\u8BF7\u5728\u201C\u7BA1\u7406\u7528\u91CF\u201D\u4E2D\u67E5\u770B\u9002\u7528\u7684\u4E0A\u9650\uFF1A{url}",
  planUsageUnavailable: "\u6B64\u8D26\u6237\u7684 ChatGPT \u5957\u9910\u7528\u91CF\u6682\u65F6\u4E0D\u53EF\u7528\u3002\u8BF7\u5728\u201C\u7BA1\u7406\u7528\u91CF\u201D\u4E2D\u67E5\u770B\u5957\u9910\u72B6\u6001\uFF1A{url}",
  planNotEntitled: "\u6B64 ChatGPT \u8D26\u6237\u4E0D\u5177\u5907\u5728\u7B2C\u4E09\u65B9\u5E94\u7528\u4E2D\u4F7F\u7528\u5957\u9910\u7684\u8D44\u683C\uFF08\u9700\u8981 Plus \u6216 Pro\uFF09\u3002\u4EC5\u5B8C\u6210\u8EAB\u4EFD\u767B\u5F55\u5E76\u4E0D\u4F1A\u6388\u4E88\u6A21\u578B\u7528\u91CF\u3002",
  planNotGranted: "\u767B\u5F55\u65F6\u672A\u6388\u4E88 ChatGPT \u5957\u9910\u7528\u91CF\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\uFF0C\u5E76\u5728\u6388\u6743\u786E\u8BA4\u9875\u540C\u610F\u5957\u9910\u4F7F\u7528\u3002",
  planRefused: "ChatGPT \u5957\u9910\u7528\u91CF\u88AB\u62D2\u7EDD\uFF08{code}\uFF09\u3002\u8BF7\u5728\u201C\u7BA1\u7406\u7528\u91CF\u201D\u4E2D\u67E5\u770B\u4F60\u7684\u5957\u9910\u548C\u6B64\u5E94\u7528\u7684\u4E0A\u9650\uFF1A{url}",
  planRefusedWithDetail: "ChatGPT \u5957\u9910\u7528\u91CF\u88AB\u62D2\u7EDD\uFF08{code}\uFF09\u3002\u8BF7\u5728\u201C\u7BA1\u7406\u7528\u91CF\u201D\u4E2D\u67E5\u770B\u4F60\u7684\u5957\u9910\u548C\u6B64\u5E94\u7528\u7684\u4E0A\u9650\uFF1A{url} \u63D0\u4F9B\u65B9\u8BE6\u60C5\uFF1A{detail}",
  planRequestFailed: "ChatGPT \u5957\u9910\u8BF7\u6C42\u5931\u8D25\u3002",
  planTokenRefused: "ChatGPT \u5957\u9910\u4EE4\u724C\u88AB\u62D2\u7EDD\u3002\u8BF7\u8FD0\u884C `dsh-chatgpt-siwc login` \u91CD\u65B0\u767B\u5F55\u3002",
  planNotGrantedForApp: "\u6B64 ChatGPT \u8D26\u6237\u5DF2\u767B\u5F55\uFF0C\u4F46\u672A\u4E3A\u6B64\u5E94\u7528\u6388\u4E88\u5957\u9910\u7528\u91CF\u3002\u8BF7\u5728 ChatGPT \u8BBE\u7F6E\uFF08\u7BA1\u7406\u7528\u91CF\uFF09\u4E2D\u68C0\u67E5\u6B64\u5E94\u7528\u7684\u5957\u9910\u8BBF\u95EE\u6743\u9650\u548C\u5355\u5E94\u7528\u4E0A\u9650\uFF0C\u7136\u540E\u91CD\u65B0\u767B\u5F55\u3002",
  notSignedIn: "\u5C1A\u672A\u4F7F\u7528 ChatGPT \u767B\u5F55\u3002\u8BF7\u5148\u8FD0\u884C `dsh-chatgpt-siwc login` \u6216 `/chatgpt login`\u3002",
  signInMissing: "ChatGPT \u767B\u5F55\u7F3A\u5931\u6216\u5DF2\u5931\u6548\u3002\u8BF7\u8FD0\u884C `dsh-chatgpt-siwc login`\uFF08\u6216\u5728 harness \u8BBE\u7F6E\u4E2D\u767B\u5F55\uFF09\u540E\u91CD\u8BD5\u3002",
  sessionExpired: "ChatGPT \u4F1A\u8BDD\u5DF2\u8FC7\u671F\u6216\u5DF2\u65AD\u5F00\u8FDE\u63A5\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\u3002",
  noRefreshToken: "\u672A\u4FDD\u5B58\u5237\u65B0\u4EE4\u724C\uFF1B\u8BF7\u91CD\u65B0\u767B\u5F55",
  loginInProgress: "\u5DF2\u6709\u4E00\u4E2A ChatGPT \u767B\u5F55\u6B63\u5728\u8FDB\u884C",
  loginInProgressShort: "\u5DF2\u6709\u4E00\u4E2A\u767B\u5F55\u6B63\u5728\u8FDB\u884C\u3002",
  loginCouldNotStart: "ChatGPT \u767B\u5F55\u65E0\u6CD5\u542F\u52A8",
  signOutStillInProgress: "ChatGPT \u9000\u51FA\u767B\u5F55\u4ECD\u5728\u8FDB\u884C\u4E2D",
  signOutAlreadyInProgress: "ChatGPT \u9000\u51FA\u767B\u5F55\u5DF2\u5728\u8FDB\u884C\u4E2D",
  accountRequestFailed: "\u8D26\u6237\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  callbackStateMismatch: "\u767B\u5F55\u56DE\u8C03\u7684 state \u4E0E\u672C\u6B21\u5C1D\u8BD5\u4E0D\u5339\u914D\uFF0C\u672A\u8FDB\u884C\u4EFB\u4F55\u4EA4\u6362\u3002",
  authorizationFailed: "\u6388\u6743\u5931\u8D25\uFF1A{error}",
  callbackNoCode: "\u6388\u6743\u56DE\u8C03\u672A\u643A\u5E26\u6388\u6743\u7801\u3002",
  attemptAlreadyCompleted: "\u672C\u6B21\u767B\u5F55\u5C1D\u8BD5\u5DF2\u7ECF\u7ED3\u675F\u3002\u8BF7\u91CD\u65B0\u53D1\u8D77\u767B\u5F55\u3002",
  signInDeadline: "\u767B\u5F55\u672A\u5728\u89C4\u5B9A\u65F6\u95F4\u5185\u5B8C\u6210\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\u3002",
  callbackTimeout: "\u767B\u5F55\u56DE\u8C03\u672A\u5728\u89C4\u5B9A\u65F6\u95F4\u5185\u5230\u8FBE",
  signInAborted: "\u767B\u5F55\u5DF2\u4E2D\u6B62",
  listenerNoPort: "\u672C\u5730\u56DE\u73AF\u76D1\u542C\u5668\u6CA1\u6709\u53EF\u7528\u7AEF\u53E3",
  tokenRefused: "\u4EE4\u724C\u7AEF\u70B9\u62D2\u7EDD\u4E86\u8BF7\u6C42\uFF1A{detail}",
  tokenNoAccessToken: "\u4EE4\u724C\u7AEF\u70B9\u672A\u8FD4\u56DE\u8BBF\u95EE\u4EE4\u724C",
  tokenNoIdToken: "\u4EE4\u724C\u54CD\u5E94\u4E2D\u6CA1\u6709 ID \u4EE4\u724C\uFF0C\u65E0\u6CD5\u9A8C\u8BC1\u8EAB\u4EFD",
  unknownAccount: "\u6CA1\u6709 client id \u4E3A {clientId} \u7684\u6CE8\u518C\u4FE1\u606F",
  clientIdMismatch: "\u56DE\u8C03\u8FD4\u56DE\u7684 client id \u4E0E\u6240\u9009\u8D26\u6237\u4E0D\u4E00\u81F4",
  registrationIncomplete: "\u6CE8\u518C\u56DE\u8C03\u6CA1\u6709\u8FD4\u56DE\u7B7E\u53D1\u7684 client id",
  identityMismatch: "\u767B\u5F55\u7684\u8EAB\u4EFD\u4E0E\u6240\u9009\u8D26\u6237\u4E0D\u4E00\u81F4",
  jwtSegmentNotObject: "JWT \u7247\u6BB5\u4E0D\u662F JSON \u5BF9\u8C61",
  idTokenNotJwt: "ID \u4EE4\u724C\u4E0D\u662F JWT",
  jwksFetchFailed: "\u83B7\u53D6 JWKS \u5931\u8D25\uFF08HTTP {status}\uFF09",
  jwksNoKeys: "JWKS \u6587\u6863\u4E2D\u6CA1\u6709\u5BC6\u94A5",
  idTokenAlg: "ID \u4EE4\u724C\u7684 alg \u4E3A {alg}\uFF0C\u5E94\u4E3A RS256",
  idTokenNoKid: "ID \u4EE4\u724C\u6CA1\u6709 kid",
  idTokenUnknownKid: "JWKS \u4E2D\u6CA1\u6709 kid \u4E3A {kid} \u7684\u5BC6\u94A5",
  idTokenSignature: "ID \u4EE4\u724C\u7B7E\u540D\u9A8C\u8BC1\u5931\u8D25",
  idTokenIssuer: "ID \u4EE4\u724C\u7B7E\u53D1\u65B9 {issuer} \u4E0D\u662F {expected}",
  idTokenAudience: "ID \u4EE4\u724C\u7684 audience \u4E0E\u7B7E\u53D1\u7684 client id \u4E0D\u4E00\u81F4",
  idTokenAzp: "ID \u4EE4\u724C\u7684 azp \u4E0E\u7B7E\u53D1\u7684 client id \u4E0D\u4E00\u81F4",
  idTokenExpired: "ID \u4EE4\u724C\u5DF2\u8FC7\u671F",
  idTokenNotYetValid: "ID \u4EE4\u724C\u5C1A\u672A\u751F\u6548",
  idTokenNonce: "ID \u4EE4\u724C\u7684 nonce \u4E0E\u672C\u6B21\u767B\u5F55\u5C1D\u8BD5\u4E0D\u5339\u914D",
  idTokenNoSubject: "ID \u4EE4\u724C\u6CA1\u6709 subject",
  modelCatalogHttp: "\u6A21\u578B\u76EE\u5F55\u8BF7\u6C42\u5931\u8D25\uFF08HTTP {status}\uFF09",
  modelCatalogNotObject: "\u6A21\u578B\u76EE\u5F55\u54CD\u5E94\u4E0D\u662F\u5BF9\u8C61",
  modelCatalogNoRows: "\u6A21\u578B\u76EE\u5F55\u54CD\u5E94\u4E2D\u65E2\u6CA1\u6709 models \u4E5F\u6CA1\u6709 data",
  configProviderEmpty: "\u63D0\u4F9B\u65B9\u8DEF\u7531\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
  configAppNameEmpty: "\u5E94\u7528\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A",
  catalogAccountChanged: "\u5237\u65B0\u76EE\u5F55\u671F\u95F4\uFF0C\u767B\u5F55\u8D26\u6237\u5DF2\u66F4\u6539\u3002\u8BF7\u91CD\u65B0\u5237\u65B0\u6A21\u578B\u7D22\u5F15\u3002",
  configUnsupportedEffort: "\u4E0D\u652F\u6301\u7684\u63A8\u7406\u529B\u5EA6\u201C{effort}\u201D",
  configIdleTimeout: "\u6D41\u7A7A\u95F2\u8D85\u65F6\u5FC5\u987B\u662F\u4EE5\u6BEB\u79D2\u4E3A\u5355\u4F4D\u7684\u6B63\u6574\u6570",
  configApiBaseInvalid: "API \u57FA\u7840 URL \u5FC5\u987B\u662F https://api.openai.com \u4E0A\u7684\u7EDD\u5BF9 URL\uFF08\u672C\u5730\u6D4B\u8BD5\u53EF\u4F7F\u7528\u56DE\u73AF\u5730\u5740\uFF09",
  configApiBaseCredentials: "API \u57FA\u7840 URL \u4E0D\u80FD\u5305\u542B\u51ED\u636E\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5",
  configApiBaseOrigin: "\u4E0D\u5141\u8BB8\u4F7F\u7528 API \u57FA\u7840 URL \u6E90 {origin}\uFF1BChatGPT \u5957\u9910\u4EE4\u724C\u53EA\u4F1A\u53D1\u9001\u5230 {allowed}\uFF08\u672C\u5730\u6D4B\u8BD5\u53EF\u4F7F\u7528\u56DE\u73AF\u5730\u5740\uFF09",
  configApiRequestOrigin: "API \u8BF7\u6C42 URL \u79BB\u5F00\u4E86\u5DF2\u914D\u7F6E\u7684 API \u6E90",
  registrationRollbackFailed: "\u63D0\u4F9B\u65B9\u91CD\u547D\u540D\u53CA\u56DE\u6EDA\u5747\u5931\u8D25\uFF1B\u4E0D\u4E00\u81F4\u7684\u8DEF\u7531\u5DF2\u88AB\u79FB\u9664\u3002\u4FDD\u5B58\u4E00\u4E2A\u6709\u6548\u7684\u63D0\u4F9B\u65B9\u8DEF\u7531\u5373\u53EF\u6062\u590D\u3002",
  unsupportedContent: "ChatGPT \u5957\u9910\u8DEF\u7531\u4E0D\u63A5\u53D7 {kind} \u7C7B\u578B\u7684\u8F93\u5165\uFF08{where}\uFF09\uFF1B\u8BF7\u6C42\u672A\u53D1\u9001\u3002",
  providerReportedError: "\u63D0\u4F9B\u65B9\u62A5\u544A\u4E86\u4E00\u4E2A\u9519\u8BEF",
  providerRateLimited: "\u63D0\u4F9B\u65B9\u9650\u5236\u4E86\u8BF7\u6C42\u9891\u7387",
  providerHttp: "\u63D0\u4F9B\u65B9\u8FD4\u56DE\u4E86 HTTP {status}",
  streamNoTerminal: "Responses \u6D41\u5728\u6CA1\u6709\u7EC8\u6B62\u4E8B\u4EF6\u7684\u60C5\u51B5\u4E0B\u7ED3\u675F",
  streamIdle: "Responses \u6D41\u5DF2\u8FDE\u7EED {timeoutMs} \u6BEB\u79D2\u672A\u6536\u5230\u6570\u636E",
  responseHeaderTimeout: "\u7B49\u5F85 Responses HTTP \u54CD\u5E94\u5934\u8D85\u65F6",
  responseTransport: "\u5728\u6536\u5230 HTTP \u54CD\u5E94\u5934\u4E4B\u524D\u65E0\u6CD5\u8FDE\u63A5\u5230 Responses API",
  responseNoBody: "Responses API \u672A\u8FD4\u56DE\u6D41\u5F0F\u54CD\u5E94\u4F53",
  responseIncomplete: "\u54CD\u5E94\u672A\u5B8C\u6210\uFF08{reason}\uFF09",
  responseCancelled: "\u63D0\u4F9B\u65B9\u53D6\u6D88\u4E86\u54CD\u5E94",
  callAborted: "\u8C03\u7528\u5DF2\u4E2D\u6B62"
};
var matcher = compileMatcher(errorEn);
function matchErrorMessage(text) {
  return matcher.match(text);
}

// src/client/locales.ts
function errorLocaleKey(key) {
  return `err${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}
function prefixErrors(dictionary) {
  const out = {};
  for (const key of Object.keys(dictionary)) out[errorLocaleKey(key)] = dictionary[key];
  return out;
}
var cardEn = {
  title: "ChatGPT \u2014 Sign in with ChatGPT",
  summary: "Connect your account through Sign in with ChatGPT, then choose an available model in the host.",
  unavailable: "This plugin's configuration is not served by this host.",
  readOnly: "This deployment stores settings read-only; edit the profile configuration instead.",
  save: "Save",
  saving: "Saving\u2026",
  saveFailed: "The save did not land; the drafts were kept.",
  overridden: "overridden",
  reset: "reset",
  invalidText: "This value is not accepted here.",
  providerLabel: "Provider route",
  providerHint: "The route name harness configs select this provider by.",
  agentNameHintLabel: "App name at registration",
  agentNameHintHint: "Shown on the first sign-in consent screen. Use one name consistently across installs.",
  effortLabel: "Default reasoning effort",
  effortHint: "Applied when a call names no effort. Empty keeps the model default. Supported levels vary by model.",
  effortDefault: "(model default)",
  apiBaseUrlLabel: "API base URL",
  apiBaseUrlHint: "The public API base the plan token is scoped to.",
  storePathLabel: "Accounts file",
  storePathHint: "Where SIWC accounts are stored; empty uses the Harness home default.",
  signInTitle: "Sign-in",
  signInBody: "Use the account panel below to sign in in your browser and approve plan access. You can also run dsh-chatgpt-siwc login in a terminal.",
  manageUsage: "Manage usage (ChatGPT settings)",
  signInFailed: "Sign-in could not be completed. Try again.",
  failedAt: "Stopped at: {stage}",
  stageListening: "starting the local listener",
  stageAuthorize: "waiting for ChatGPT approval",
  stageCallback: "receiving the approval",
  stageRegistered: "app registered",
  stageExchange: "exchanging the approval for access",
  stageVerify: "verifying your identity",
  stageSave: "saving the account",
  stageDone: "done",
  accountTitle: "ChatGPT account",
  accountDescription: "Connect your account to use its plan in this host.",
  connected: "Connected",
  disconnected: "Not connected",
  loading: "Checking account\u2026",
  planReady: "Plan access ready",
  planMissing: "Plan access not available",
  waitingForSignIn: "Complete sign-in in the browser window.",
  openSignIn: "Open sign-in page",
  cancelSignIn: "Cancel sign-in",
  refresh: "Refresh status",
  working: "Working\u2026",
  signIn: "Sign in with ChatGPT",
  reauthorize: "Reconnect account",
  signOut: "Disconnect",
  signOutConfirmTitle: "Disconnect this account?",
  signOutConfirmBody: "The plugin will attempt to revoke the connection and remove the local account.",
  keepConnected: "Keep connected",
  tokenRefreshes: "Current access expires"
};
var cardZh = {
  title: "ChatGPT \u2014 \u901A\u8FC7 ChatGPT \u767B\u5F55",
  summary: "\u901A\u8FC7 Sign in with ChatGPT \u8FDE\u63A5\u8D26\u6237\uFF0C\u7136\u540E\u5728\u4E3B\u673A\u4E2D\u9009\u62E9\u53EF\u7528\u6A21\u578B\u3002",
  unavailable: "\u5F53\u524D\u4E3B\u673A\u672A\u63D0\u4F9B\u6B64\u63D2\u4EF6\u7684\u914D\u7F6E\u3002",
  readOnly: "\u6B64\u90E8\u7F72\u7684\u8BBE\u7F6E\u4E3A\u53EA\u8BFB\uFF1B\u8BF7\u6539\u4E3A\u7F16\u8F91 profile \u914D\u7F6E\u3002",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  saveFailed: "\u4FDD\u5B58\u672A\u751F\u6548\uFF1B\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002",
  overridden: "\u5DF2\u8986\u76D6",
  reset: "\u91CD\u7F6E",
  invalidText: "\u8BE5\u503C\u4E0D\u88AB\u63A5\u53D7\u3002",
  providerLabel: "\u63D0\u4F9B\u65B9\u8DEF\u7531",
  providerHint: "harness \u914D\u7F6E\u9009\u62E9\u6B64\u63D0\u4F9B\u65B9\u65F6\u4F7F\u7528\u7684\u8DEF\u7531\u540D\u3002",
  agentNameHintLabel: "\u6CE8\u518C\u65F6\u7684\u5E94\u7528\u540D\u79F0",
  agentNameHintHint: "\u663E\u793A\u5728\u9996\u6B21\u767B\u5F55\u7684\u6388\u6743\u786E\u8BA4\u9875\u3002\u8DE8\u5B89\u88C5\u8BF7\u4FDD\u6301\u540C\u4E00\u540D\u79F0\u3002",
  effortLabel: "\u9ED8\u8BA4\u63A8\u7406\u529B\u5EA6",
  effortHint: "\u8C03\u7528\u672A\u6307\u5B9A\u529B\u5EA6\u65F6\u91C7\u7528\u3002\u7559\u7A7A\u5219\u4F7F\u7528\u6A21\u578B\u9ED8\u8BA4\u3002\u652F\u6301\u7684\u7EA7\u522B\u56E0\u6A21\u578B\u800C\u5F02\u3002",
  effortDefault: "\uFF08\u6A21\u578B\u9ED8\u8BA4\uFF09",
  apiBaseUrlLabel: "API \u57FA\u7840 URL",
  apiBaseUrlHint: "\u5957\u9910\u4EE4\u724C\u6240\u7ED1\u5B9A\u5230\u7684\u516C\u5171 API \u57FA\u5740\u3002",
  storePathLabel: "\u8D26\u6237\u6587\u4EF6",
  storePathHint: "SIWC \u8D26\u6237\u7684\u5B58\u50A8\u4F4D\u7F6E\uFF1B\u7559\u7A7A\u4F7F\u7528 Harness \u4E3B\u76EE\u5F55\u9ED8\u8BA4\u503C\u3002",
  signInTitle: "\u767B\u5F55",
  signInBody: "\u4F7F\u7528\u4E0B\u65B9\u8D26\u6237\u9762\u677F\u5728\u6D4F\u89C8\u5668\u4E2D\u767B\u5F55\uFF0C\u5E76\u6388\u6743\u5957\u9910\u8BBF\u95EE\u3002\u4F60\u4E5F\u53EF\u4EE5\u5728\u7EC8\u7AEF\u8FD0\u884C dsh-chatgpt-siwc login\u3002",
  manageUsage: "\u7BA1\u7406\u7528\u91CF\uFF08ChatGPT \u8BBE\u7F6E\uFF09",
  signInFailed: "\u767B\u5F55\u672A\u80FD\u5B8C\u6210\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  failedAt: "\u505C\u5728\uFF1A{stage}",
  stageListening: "\u542F\u52A8\u672C\u5730\u76D1\u542C",
  stageAuthorize: "\u7B49\u5F85 ChatGPT \u6388\u6743",
  stageCallback: "\u63A5\u6536\u6388\u6743\u7ED3\u679C",
  stageRegistered: "\u5E94\u7528\u5DF2\u6CE8\u518C",
  stageExchange: "\u7528\u6388\u6743\u6362\u53D6\u8BBF\u95EE\u4EE4\u724C",
  stageVerify: "\u9A8C\u8BC1\u8EAB\u4EFD",
  stageSave: "\u4FDD\u5B58\u8D26\u6237",
  stageDone: "\u5B8C\u6210",
  accountTitle: "ChatGPT \u8D26\u6237",
  accountDescription: "\u8FDE\u63A5\u8D26\u6237\u540E\u5373\u53EF\u5728\u6B64\u4E3B\u673A\u4F7F\u7528\u5957\u9910\u3002",
  connected: "\u5DF2\u8FDE\u63A5",
  disconnected: "\u672A\u8FDE\u63A5",
  loading: "\u6B63\u5728\u68C0\u67E5\u8D26\u6237\u2026",
  planReady: "\u5957\u9910\u8BBF\u95EE\u5DF2\u5C31\u7EEA",
  planMissing: "\u5957\u9910\u8BBF\u95EE\u4E0D\u53EF\u7528",
  waitingForSignIn: "\u8BF7\u5728\u6D4F\u89C8\u5668\u7A97\u53E3\u5B8C\u6210\u767B\u5F55\u3002",
  openSignIn: "\u6253\u5F00\u767B\u5F55\u9875\u9762",
  cancelSignIn: "\u53D6\u6D88\u767B\u5F55",
  refresh: "\u5237\u65B0\u72B6\u6001",
  working: "\u5904\u7406\u4E2D\u2026",
  signIn: "\u4F7F\u7528 ChatGPT \u767B\u5F55",
  reauthorize: "\u91CD\u65B0\u8FDE\u63A5\u8D26\u6237",
  signOut: "\u65AD\u5F00\u8FDE\u63A5",
  signOutConfirmTitle: "\u65AD\u5F00\u6B64\u8D26\u6237\uFF1F",
  signOutConfirmBody: "\u63D2\u4EF6\u5C06\u5C1D\u8BD5\u64A4\u9500\u8FDE\u63A5\u5E76\u79FB\u9664\u672C\u5730\u8D26\u6237\u3002",
  keepConnected: "\u4FDD\u6301\u8FDE\u63A5",
  tokenRefreshes: "\u5F53\u524D\u8BBF\u95EE\u4EE4\u724C\u5230\u671F\u65F6\u95F4"
};
var en = { ...cardEn, ...prefixErrors(errorEn) };
var zh = { ...cardZh, ...prefixErrors(errorZh) };

// src/client/card.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function accountErrorText(t, state) {
  if (state.messageKey !== void 0) return t(errorLocaleKey(state.messageKey), state.messageParams);
  return state.message;
}
function SiwcCard(props) {
  const { t } = props;
  const state = props.useSiwcCard((snapshot) => snapshot);
  const accountState = props.useSiwcAccount((snapshot) => snapshot);
  if (props.view === "summary") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("summary") });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiwcConfigForm, { t, state, face: props }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiwcAccountPanel, { t, state: accountState, face: props })
  ] });
}
var STAGE_KEYS = { listening: "stageListening", authorize: "stageAuthorize", callback: "stageCallback", registered: "stageRegistered", exchange: "stageExchange", verify: "stageVerify", save: "stageSave", done: "stageDone" };
function stageKey(stage) {
  return STAGE_KEYS[stage] ?? "stageAuthorize";
}
function SiwcAccountPanel({ t, state, face }) {
  const status2 = state.status;
  const pending = status2?.attempt?.phase === "waiting";
  const failure = status2?.attempt?.phase === "failed" ? matchErrorMessage(status2.attempt.error ?? "") : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "siwc-account", "aria-label": t("accountTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("accountTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("accountDescription") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: status2?.signedIn ? "siwc-account-badge is-connected" : "siwc-account-badge", children: status2?.signedIn ? t("connected") : t("disconnected") })
    ] }),
    state.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("loading") }) : null,
    status2?.signedIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-account-identity", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: status2.account?.name || status2.account?.email || t("connected") }),
      status2.account?.email && status2.account.name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status2.account.email }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: status2.account?.planGranted ? t("planReady") : t("planMissing") })
    ] }) : null,
    pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-account-pending", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("waitingForSignIn") }),
      status2?.attempt?.authorizationUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: status2.attempt.authorizationUrl, target: "_blank", rel: "noreferrer", children: t("openSignIn") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: face.cancel, disabled: state.busy, children: t("cancelSignIn") })
    ] }) : null,
    status2?.attempt?.phase === "failed" && !state.message && !state.messageKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "siwc-account-error", children: failure ? t(errorLocaleKey(failure.key), failure.params) : t("signInFailed") }) : null,
    status2?.attempt?.phase === "failed" && status2.attempt.stage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "siwc-account-stage", children: [
      t("failedAt", { stage: t(stageKey(status2.attempt.stage)) }),
      status2.attempt.code ? ` \xB7 ${status2.attempt.code}` : ""
    ] }) : null,
    state.message || state.messageKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", className: "siwc-account-error", children: accountErrorText(t, state) }) : null,
    state.confirmSignOut ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-signout-confirm", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("signOutConfirmTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("signOutConfirmBody") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: face.cancelSignOut, children: t("keepConnected") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: face.signOut, disabled: state.busy, children: t("signOut") })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { children: [
      status2?.account?.accessTokenExpiresAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        t("tokenRefreshes"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { dateTime: status2.account.accessTokenExpiresAt, children: new Date(status2.account.accessTokenExpiresAt).toLocaleString() })
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: face.refresh, disabled: state.loading || state.busy, children: t("refresh") }),
      !pending && (!status2?.signedIn || status2.account) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: face.signIn, disabled: state.busy, children: state.busy ? t("working") : status2?.signedIn ? t("reauthorize") : t("signIn") }) : null,
      status2?.signedIn && !state.confirmSignOut && !pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: face.requestSignOut, disabled: state.busy, children: t("signOut") }) : null
    ] })
  ] });
}
function SiwcConfigForm(props) {
  const { t, state } = props;
  const discard = (0, import_react.useRef)(props.face.discard);
  discard.current = props.face.discard;
  (0, import_react.useEffect)(() => () => {
    discard.current();
  }, []);
  if (!state.available) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "siwc-unavailable", role: "status", children: t("unavailable") });
  }
  const disabled = !state.writable;
  const blocked = !state.dirty || state.invalid || state.saving;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-form", children: [
    !state.writable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "siwc-readonly", role: "status", children: t("readOnly") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ValueField,
      {
        id: "dsh-siwc-provider",
        label: t("providerLabel"),
        hint: t("providerHint"),
        state: state.provider,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidText"),
        onEdit: (text) => {
          props.face.edit("provider", text);
        },
        onReset: () => {
          props.face.resetField("provider");
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ValueField,
      {
        id: "dsh-siwc-agent-name",
        label: t("agentNameHintLabel"),
        hint: t("agentNameHintHint"),
        state: state.agentNameHint,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidText"),
        onEdit: (text) => {
          props.face.edit("agentNameHint", text);
        },
        onReset: () => {
          props.face.resetField("agentNameHint");
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SelectField,
      {
        id: "dsh-siwc-effort",
        label: t("effortLabel"),
        hint: t("effortHint"),
        defaultLabel: t("effortDefault"),
        options: RESPONSES_EFFORTS,
        state: state.reasoningEffort,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidText"),
        onEdit: (text) => {
          props.face.edit("reasoningEffort", text);
        },
        onReset: () => {
          props.face.resetField("reasoningEffort");
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ValueField,
      {
        id: "dsh-siwc-api-base",
        label: t("apiBaseUrlLabel"),
        hint: t("apiBaseUrlHint"),
        state: state.apiBaseUrl,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidText"),
        onEdit: (text) => {
          props.face.edit("apiBaseUrl", text);
        },
        onReset: () => {
          props.face.resetField("apiBaseUrl");
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ValueField,
      {
        id: "dsh-siwc-store-path",
        label: t("storePathLabel"),
        hint: t("storePathHint"),
        state: state.storePath,
        disabled,
        overriddenLabel: t("overridden"),
        resetLabel: t("reset"),
        invalidLabel: t("invalidText"),
        onEdit: (text) => {
          props.face.edit("storePath", text);
        },
        onReset: () => {
          props.face.resetField("storePath");
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-signin", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t("signInTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("signInBody") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: MANAGE_USAGE_URL, target: "_blank", rel: "noreferrer", children: t("manageUsage") }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-footer", children: [
      state.failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "siwc-failed", role: "status", children: t("saveFailed") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "siwc-save", disabled: blocked, onClick: () => {
        props.face.save();
      }, children: t(state.saving ? "saving" : "save") })
    ] })
  ] });
}
function ValueField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "siwc-label", htmlFor: props.id, children: props.label }),
      props.state.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "siwc-badges", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "siwc-badge", children: props.overriddenLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "siwc-reset", disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        id: props.id,
        className: "siwc-input",
        type: "text",
        ...props.state.invalid ? { "aria-invalid": true } : {},
        value: props.state.text,
        disabled: props.disabled,
        onChange: (event) => {
          props.onEdit(event.target.value);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: props.state.invalid ? "siwc-invalid" : "siwc-hint", children: props.state.invalid ? props.invalidLabel : props.hint })
  ] });
}
function SelectField(props) {
  const text = props.state.text;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "siwc-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "siwc-label", htmlFor: props.id, children: props.label }),
      props.state.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "siwc-badges", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "siwc-badge", children: props.overriddenLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "siwc-reset", disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "select",
      {
        id: props.id,
        className: "siwc-select",
        value: text,
        disabled: props.disabled,
        ...props.state.invalid ? { "aria-invalid": true } : {},
        onChange: (event) => {
          props.onEdit(event.target.value);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: props.defaultLabel }),
          props.options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: option, children: option }, option)),
          text !== "" && !props.options.includes(text) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: text, children: text }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: props.state.invalid ? "siwc-invalid" : "siwc-hint", children: props.state.invalid ? props.invalidLabel : props.hint })
  ] });
}

// src/client/controller.ts
var import_dsh_client_store2 = require("@deepseek-ai/dsh-client-store");

// src/client/card-form.ts
var import_dsh_client_store = require("@deepseek-ai/dsh-client-store");
function textField(field) {
  return {
    field,
    format: (value) => typeof value === "string" ? value : "",
    parse: (text) => {
      const trimmed = text.trim();
      return trimmed === "" ? { kind: "clear" } : { kind: "set", value: trimmed };
    }
  };
}
function selectField(field, options) {
  const accepted = new Set(options);
  return {
    field,
    format: (value) => typeof value === "string" && accepted.has(value) ? value : "",
    parse: (text) => {
      const trimmed = text.trim();
      return trimmed === "" ? { kind: "clear" } : accepted.has(trimmed) ? { kind: "set", value: trimmed } : void 0;
    }
  };
}
var SiwcCardForm = class {
  /**
   * @param scope - the bound settings scope for this card's namespace.
   * @param specs - the section fields this card edits.
   */
  constructor(scope, specs) {
    this.scope = scope;
    this.specs = new Map(specs.map((spec) => [spec.field, spec]));
    scope.subscribe(() => {
      this.publish();
    });
  }
  scope;
  specs;
  staged = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  saving = false;
  failed = false;
  /** Drop the projection listeners; the scope's own lifecycle is separate. */
  dispose() {
    this.listeners.clear();
  }
  /**
   * Publish a projection of this form, rebuilt whenever the scope or a draft changes.
   * @param project - build the card's state from the form's current reads.
   * @returns the store the card's component reads through its bound selector.
   */
  bind(project) {
    const store = (0, import_dsh_client_store.createSnapshotStore)(project());
    this.listeners.add(() => {
      store.set(project());
    });
    return store;
  }
  /**
   * Read the card-level state: what the Host serves, and what a save would do.
   * @returns the form state the whole card shares.
   */
  shell() {
    const plan = this.plan();
    return {
      available: this.snapshotOf().status === "ready",
      writable: this.snapshotOf().writable,
      dirty: plan.length > 0,
      invalid: plan.some((item) => item.run === void 0),
      saving: this.saving,
      failed: this.failed
    };
  }
  /**
   * Read one control's state.
   * @param field - field name inside the namespace section.
   * @returns the draft text, whether a save would leave an override, and whether it is invalid.
   */
  field(field) {
    const staged = this.staged.get(field);
    const spec = this.specOf(field);
    if (staged === void 0) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false };
    }
    const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
    return {
      text: staged.text,
      overridden: write?.kind === "set",
      invalid: write === void 0
    };
  }
  /**
   * Build the edit, reset, save, and discard actions bound to this form.
   * @returns the actions the card's slot entry injects.
   */
  actions() {
    return {
      edit: (field, text) => {
        this.stage(field, { text, clear: false });
      },
      resetField: (field) => {
        this.stage(field, { text: this.specOf(field).format(this.baseValue(field)), clear: true });
      },
      save: () => {
        void this.save();
      },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return;
        this.staged.clear();
        this.failed = false;
        this.publish();
      }
    };
  }
  /**
   * Write every staged edit, then re-seed from what the Host accepted. The
   * Host is the only authority on whether a value was accepted, so the
   * outcome is read back from the section rather than predicted here. A
   * save that did not land keeps its drafts, so the user can correct them.
   * @returns settlement after every write and the read-back.
   */
  async save() {
    const plan = this.plan();
    const writes = plan.flatMap((item) => item.run === void 0 ? [] : [item.run]);
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
    this.saving = true;
    this.failed = false;
    this.publish();
    let landed = true;
    for (const write of writes) {
      landed = await write() && landed;
    }
    if (landed) this.staged.clear();
    this.saving = false;
    this.failed = !landed;
    this.publish();
  }
  /**
   * Every staged edit a save would write, in staging order. An entry whose
   * draft is not a value its field accepts carries no write: the form is
   * still dirty, and the save refuses rather than dropping the edit.
   * @returns the planned writes.
   */
  plan() {
    const plan = [];
    for (const [field, staged] of this.staged) {
      const spec = this.specOf(field);
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, run: () => this.clear(field) });
        continue;
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue;
      const write = spec.parse(staged.text);
      if (write === void 0) plan.push({ field, run: void 0 });
      else if (write.kind === "clear") plan.push({ field, run: () => this.clear(field) });
      else plan.push({ field, run: () => this.store(field, write.value) });
    }
    return plan;
  }
  async clear(field) {
    await this.scope.unset(field);
    return !this.stored(field);
  }
  async store(field, value) {
    await this.scope.set(field, value);
    return this.userLayer()?.[field] === value;
  }
  stage(field, edit) {
    this.staged.set(field, edit);
    this.failed = false;
    this.publish();
  }
  specOf(field) {
    const spec = this.specs.get(field);
    if (spec === void 0) throw new Error(`dsh-chatgpt-siwc card has no field ${field}`);
    return spec;
  }
  snapshotOf() {
    return this.scope.getSnapshot();
  }
  sectionValue(field) {
    return this.snapshotOf().value?.[field];
  }
  baseValue(field) {
    return this.snapshotOf().base?.[field];
  }
  userLayer() {
    return this.snapshotOf().user;
  }
  stored(field) {
    const user = this.userLayer();
    return user !== void 0 && Object.hasOwn(user, field);
  }
  publish() {
    for (const listener of this.listeners) listener();
  }
};

// src/client/controller.ts
var EFFORT_OPTIONS = RESPONSES_EFFORTS;
var SiwcCardController = class {
  /**
   * @param scope - the bound settings scope for the plugin's namespace.
   */
  constructor(scope, account) {
    this.account = account;
    this.form = new SiwcCardForm(scope, [
      textField("provider"),
      textField("agentNameHint"),
      selectField("reasoningEffort", EFFORT_OPTIONS),
      textField("apiBaseUrl"),
      textField("storePath")
    ]);
    this.store = this.form.bind(() => this.projection());
  }
  account;
  form;
  store;
  projection() {
    return {
      ...this.form.shell(),
      provider: this.form.field("provider"),
      agentNameHint: this.form.field("agentNameHint"),
      reasoningEffort: this.form.field("reasoningEffort"),
      apiBaseUrl: this.form.field("apiBaseUrl"),
      storePath: this.form.field("storePath")
    };
  }
  /**
   * Build the face the card's slot registration injects.
   * @returns the card's snapshot and its form actions.
   */
  inject() {
    const account = this.account?.inject();
    const fallback = account ?? emptyAccountFace();
    return { ...fallback, hooks: { siwcCard: this.store, siwcAccount: fallback.hooks.siwcAccount }, ...this.form.actions() };
  }
  /** Drop the form's projection listeners; the scope's own lifecycle is separate. */
  dispose() {
    this.form.dispose();
  }
};
function emptyAccountFace() {
  const store = (0, import_dsh_client_store2.createSnapshotStore)({ busy: false, loading: false, confirmSignOut: false });
  return { hooks: { siwcAccount: store }, refresh() {
  }, signIn() {
  }, cancel() {
  }, requestSignOut() {
  }, cancelSignOut() {
  }, signOut() {
  } };
}

// src/client/account-controller.ts
var import_dsh_client_store3 = require("@deepseek-ai/dsh-client-store");

// src/client/account-remote.ts
var import_zod = require("zod");
var identity = () => import_zod.z.object({ email: import_zod.z.string().optional(), name: import_zod.z.string().optional(), clientId: import_zod.z.string(), scopes: import_zod.z.array(import_zod.z.string()), planGranted: import_zod.z.boolean(), accessTokenExpiresAt: import_zod.z.string().optional() }).strict();
var attempt = () => import_zod.z.object({ id: import_zod.z.string(), phase: import_zod.z.enum(["waiting", "succeeded", "failed", "cancelled"]), authorizationUrl: import_zod.z.string().optional(), error: import_zod.z.string().optional() }).strict();
var status = () => import_zod.z.object({ signedIn: import_zod.z.boolean(), account: identity().optional(), attempt: attempt().optional() }).strict();
var start = () => import_zod.z.object({ id: import_zod.z.string(), authorizationUrl: import_zod.z.string().url() }).strict();
var signout = () => import_zod.z.object({ revoked: import_zod.z.boolean(), email: import_zod.z.string().optional() }).strict();
var descriptor = (method, parameters, result) => ({
  id: `dsh-chatgpt-siwc#siwcAccount/${method}`,
  service: "siwcAccount",
  namespace: "siwcAccount",
  method,
  invocation: { kind: "direct" },
  parameters,
  result: { mode: "strict", typeSymbol: `dsh-chatgpt-siwc#siwcAccount/${method}:result`, create: result }
});
var stringParameter = (name, acceptsUndefined = false) => ({ name, wire: name, source: "json", ...acceptsUndefined ? { acceptsUndefined: true } : {}, codec: { mode: "strict", typeSymbol: "string", create: () => import_zod.z.string() } });
var SIWC_ACCOUNT_REMOTE = {
  package: "dsh-chatgpt-siwc",
  descriptors: [
    descriptor("getStatus", [], status),
    descriptor("startSignIn", [stringParameter("clientId", true)], start),
    descriptor("cancelSignIn", [stringParameter("attemptId")], status),
    descriptor("signOut", [], signout)
  ]
};

// src/client/account-controller.ts
var SiwcAccountController = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.mounting = this.mount();
  }
  ctx;
  store = (0, import_dsh_client_store3.createSnapshotStore)({ busy: false, loading: true, confirmSignOut: false });
  remote;
  unmount;
  follow;
  timer;
  disposed = false;
  generation = 0;
  refreshing;
  ownedAttempt;
  operations = /* @__PURE__ */ new Set();
  mounting;
  disposal;
  track(operation) {
    this.operations.add(operation);
    void operation.then(() => this.operations.delete(operation), () => this.operations.delete(operation));
    return operation;
  }
  async mount() {
    try {
      const unmount = await this.ctx.remote.$mount(SIWC_ACCOUNT_REMOTE);
      if (this.disposed) {
        await unmount();
        return;
      }
      this.unmount = unmount;
      this.follow = this.ctx.inject(["remote.siwcAccount"], (child) => {
        this.remote = child.remote.siwcAccount;
        void this.refresh();
        let last = Date.now();
        const tick = () => {
          const pending = this.store.getSnapshot().status?.attempt?.phase === "waiting";
          const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
          if (!pending && (hidden || Date.now() - last < 3e4)) return;
          last = Date.now();
          void this.refresh();
        };
        const onVisible = () => {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            last = Date.now();
            void this.refresh();
          }
        };
        if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
        this.timer = setInterval(tick, 2500);
        return () => {
          clearInterval(this.timer);
          if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
          this.remote = void 0;
        };
      });
    } catch (error) {
      this.update({ loading: false, ...messageOf(error) });
    }
  }
  update(patch) {
    if (!this.disposed) this.store.update((state) => {
      Object.assign(state, patch);
    });
  }
  async refresh() {
    if (this.refreshing || !this.remote || this.disposed) return this.refreshing;
    const generation = this.generation;
    this.refreshing = (async () => {
      try {
        const status2 = unwrap(await this.remote.getStatus());
        if (!this.disposed && generation === this.generation) this.update({ status: status2, loading: false, message: void 0, messageKey: void 0, messageParams: void 0 });
      } catch (error) {
        if (!this.disposed && generation === this.generation) this.update({ loading: false, ...messageOf(error) });
      }
    })().finally(() => {
      this.refreshing = void 0;
      if (!this.disposed && generation !== this.generation) void this.refresh();
    });
    return this.refreshing;
  }
  signIn() {
    return this.track(this.beginSignIn());
  }
  async beginSignIn() {
    if (!this.remote || this.disposed) return;
    const gen = ++this.generation;
    let popup = null;
    try {
      popup = window.open("about:blank", "_blank");
      if (popup) popup.opener = null;
    } catch {
    }
    this.update({ busy: true, message: void 0, messageKey: void 0, messageParams: void 0 });
    try {
      const started = unwrap(await this.remote.startSignIn(this.store.getSnapshot().status?.account?.clientId));
      if (this.disposed || gen !== this.generation) {
        popup?.close();
        await this.remote.cancelSignIn(started.id);
        return;
      }
      this.ownedAttempt = started.id;
      this.update({ status: { ...this.store.getSnapshot().status ?? { signedIn: false }, attempt: { ...started, phase: "waiting" } }, busy: false });
      if (popup) popup.location.href = started.authorizationUrl;
      void this.refresh();
    } catch (error) {
      popup?.close();
      if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) });
    }
  }
  cancel() {
    return this.track(this.cancelAttempt());
  }
  async cancelAttempt() {
    const id = this.store.getSnapshot().status?.attempt?.id;
    if (!this.remote || !id || this.disposed) return;
    const gen = ++this.generation;
    this.update({ busy: true });
    try {
      const status2 = unwrap(await this.remote.cancelSignIn(id));
      if (!this.disposed && gen === this.generation) {
        this.ownedAttempt = void 0;
        this.update({ status: status2, busy: false });
      }
    } catch (error) {
      if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) });
    }
  }
  requestSignOut() {
    this.update({ confirmSignOut: true });
  }
  cancelSignOut() {
    this.update({ confirmSignOut: false });
  }
  signOut() {
    return this.track(this.disconnect());
  }
  async disconnect() {
    if (!this.remote || this.disposed) return;
    const gen = ++this.generation;
    this.update({ busy: true });
    try {
      unwrap(await this.remote.signOut());
      if (!this.disposed && gen === this.generation) {
        this.ownedAttempt = void 0;
        this.update({ status: { signedIn: false }, busy: false, confirmSignOut: false });
      }
    } catch (error) {
      if (!this.disposed && gen === this.generation) this.update({ busy: false, ...messageOf(error) });
    }
  }
  inject() {
    return { hooks: { siwcAccount: this.store }, refresh: () => {
      void this.refresh();
    }, signIn: () => {
      void this.signIn();
    }, cancel: () => {
      void this.cancel();
    }, requestSignOut: () => this.requestSignOut(), cancelSignOut: () => this.cancelSignOut(), signOut: () => {
      void this.signOut();
    } };
  }
  dispose() {
    if (this.disposal) return this.disposal;
    this.disposed = true;
    this.generation++;
    clearInterval(this.timer);
    this.disposal = (async () => {
      await this.mounting;
      await Promise.allSettled([...this.operations, ...this.refreshing ? [this.refreshing] : []]);
      if (this.ownedAttempt && this.remote) await this.remote.cancelSignIn(this.ownedAttempt).catch(() => void 0);
      this.ownedAttempt = void 0;
      await this.follow?.dispose();
      await this.unmount?.();
    })();
    return this.disposal;
  }
};
function unwrap(value) {
  if (value && typeof value === "object" && "ok" in value) {
    const result = value;
    if (result.ok) return result.value;
    throw result.error;
  }
  return value;
}
function messageOf(error) {
  const raw = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const carried = error && typeof error === "object" && "key" in error ? error : void 0;
  if (carried && typeof carried.key === "string" && Object.prototype.hasOwnProperty.call(errorEn, carried.key)) {
    const params = carried.params && typeof carried.params === "object" ? Object.fromEntries(Object.entries(carried.params).map(([k, v]) => [k, String(v)])) : {};
    return { message: raw || errorEn[carried.key], messageKey: carried.key, messageParams: params };
  }
  if (/LOGIN_IN_PROGRESS/.test(raw)) return { message: errorEn.loginInProgressShort, messageKey: "loginInProgressShort", messageParams: {} };
  if (!raw) return { message: errorEn.accountRequestFailed, messageKey: "accountRequestFailed", messageParams: {} };
  const found = matchErrorMessage(raw);
  return found ? { message: raw, messageKey: found.key, messageParams: found.params } : { message: raw, messageKey: void 0, messageParams: void 0 };
}

// src/client/card.css
var card_default = "/*\n * The ChatGPT SIWC card's stylesheet. Imported as text and injected once at\n * bundle materialization (the module system claims the <style> tag); class\n * names carry the `siwc-` prefix, which only this card uses. Colors go\n * through the harness's `--dsw-*` semantic aliases only.\n */\n\n.siwc-form {\n  display: flex;\n  flex-direction: column;\n}\n\n.siwc-unavailable,\n.siwc-readonly {\n  margin: 0 0 12px;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.siwc-field {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 12px 0;\n}\n\n.siwc-field + .siwc-field {\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n}\n\n.siwc-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.siwc-label {\n  flex: 1;\n  min-width: 0;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n}\n\n.siwc-badges {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.siwc-badge {\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.siwc-reset {\n  border: none;\n  background: none;\n  padding: 0;\n  font: inherit;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n}\n\n.siwc-reset:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n}\n\n.siwc-reset:disabled {\n  cursor: default;\n}\n\n.siwc-input,\n.siwc-select {\n  height: 34px;\n  padding: 0 12px;\n  border: 0.5px solid var(--dsw-alias-border-l4);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-3);\n  font: inherit;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n}\n\n.siwc-select {\n  appearance: none;\n}\n\n.siwc-input:focus-visible,\n.siwc-select:focus-visible {\n  outline: none;\n  border-color: var(--dsw-alias-brand-primary);\n}\n\n.siwc-input:disabled,\n.siwc-select:disabled {\n  color: var(--dsw-alias-label-tertiary);\n  cursor: default;\n}\n\n.siwc-input[aria-invalid='true'],\n.siwc-select[aria-invalid='true'] {\n  border-color: var(--dsw-alias-state-error-primary);\n}\n\n.siwc-invalid {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.siwc-hint {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.siwc-signin {\n  margin: 4px 0 0;\n  padding: 12px;\n  border: 0.5px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n}\n\n.siwc-signin h3 {\n  margin: 0 0 4px;\n  font-size: 13px;\n  font-weight: 600;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n}\n\n.siwc-signin p {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.6;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.siwc-signin p + p {\n  margin-top: 6px;\n}\n\n.siwc-signin a {\n  color: var(--dsw-alias-brand-primary);\n}\n\n.siwc-signin code {\n  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  font-size: 11px;\n}\n\n.siwc-footer {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding-top: 16px;\n}\n\n.siwc-failed {\n  flex: 1;\n  min-width: 0;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.siwc-save {\n  appearance: none;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  padding: 5px 14px;\n  font: inherit;\n  font-size: 13px;\n  line-height: 1.5;\n  cursor: pointer;\n  background: var(--dsw-alias-label-primary);\n  color: var(--dsw-alias-bg-layer-3);\n}\n\n.siwc-save:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n\n.siwc-save:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 1px;\n}\n.siwc-account {\n  margin-top: 20px; padding: 20px; min-width: 0;\n  border: .5px solid var(--dsw-alias-settings-card-stroke);\n  border-radius: var(--dsw-radius-xl);\n  background: var(--dsw-alias-settings-card-fill);\n  color: var(--dsw-alias-label-primary);\n  overflow-wrap: anywhere;\n}\n.siwc-account header, .siwc-account footer {\n  display: flex; align-items: center; justify-content: space-between;\n  gap: 12px; flex-wrap: wrap;\n}\n.siwc-account h3 { margin: 0 0 4px; font-size: 16px; line-height: 24px; }\n.siwc-account p { margin: 6px 0; color: var(--dsw-alias-label-secondary); line-height: 20px; }\n.siwc-account-badge {\n  border-radius: var(--dsw-radius-sm); padding: 4px 10px;\n  background: var(--dsw-alias-settings-card-fill); font-size: 12px; line-height: 20px;\n}\n.siwc-account-badge.is-connected { color: var(--dsw-alias-state-success-primary); }\n.siwc-account-identity {\n  display: grid; gap: 4px; margin: 16px 0; padding: 12px;\n  border: .5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-lg);\n}\n.siwc-account-identity span, .siwc-account footer { font-size: 13px; line-height: 20px; }\n.siwc-account a { color: var(--dsw-alias-link); overflow-wrap: anywhere; }\n.siwc-account button {\n  min-height: 36px; padding: 6px 12px;\n  border: .5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-md);\n  font: inherit; color: var(--dsw-alias-label-primary);\n  background: var(--dsw-alias-settings-card-fill); cursor: pointer;\n}\n.siwc-account button:disabled { opacity: .45; cursor: default; }\n.siwc-account :is(button, a):focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }\n.siwc-account .siwc-account-error { color: var(--dsw-alias-state-error-primary); }\n.siwc-signout-confirm { margin: 12px 0; padding: 12px; border: .5px solid var(--dsw-alias-state-warn-primary); border-radius: var(--dsw-radius-lg); }\n@media (pointer: coarse) { .siwc-account button, .siwc-account a { min-height: 44px; } .siwc-field input { font-size: 16px; } }\n.siwc-account .siwc-account-stage { margin-top: -.15rem; font-size: .8rem; color: var(--dsw-alias-label-secondary, inherit); }\n";

// src/client/index.ts
var NS = "dsh-chatgpt-siwc";
var inject = ["slots", "locale", "configForms", "remote"];
var CARD_ID = "dsh-chatgpt-siwc";
var stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = card_default;
  document.head.append(el);
  stylesInjected = true;
}
function apply(ctx) {
  ensureStyles();
  const account = new SiwcAccountController(ctx);
  ctx.effect(() => async () => {
    await account.dispose();
  });
  ctx.effect(() => ctx.locale.register(NS, { zh, en }));
  const t = ctx.locale.bind(NS);
  const controller = new SiwcCardController(ctx.configForms.get(NS), account);
  ctx.effect(() => () => {
    controller.dispose();
  });
  const describeFace = ctx.configForms.describe();
  ctx.effect(() => {
    let off;
    const sync = () => {
      const served = new Set(describeFace.getSnapshot().view?.namespaces.map((view) => view.ns) ?? []);
      const wanted = served.has(NS);
      if (wanted && off === void 0) {
        off = ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
          name: "plugins.bundle.config",
          key: CARD_ID,
          locale: NS,
          inject: () => controller.inject()
        }, SiwcCard));
      } else if (!wanted && off !== void 0) {
        off();
        off = void 0;
      }
    };
    const unsubscribe = describeFace.subscribe(sync);
    void describeFace.ensure();
    sync();
    return () => {
      unsubscribe();
      off?.();
    };
  });
}
return module.exports; } });
