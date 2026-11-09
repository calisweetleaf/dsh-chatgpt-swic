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

import { compileMatcher, type Dictionaries } from '../i18n.ts'

export const errorEn = {

  controlPlaneTimeout: 'ChatGPT connection timed out. Check your network and retry; the saved account was not changed.',

  storeLocked: 'The account store is busy or has an orphan writer lock. Stop every DSH and SIWC process, confirm the lock owner is no longer running, then remove only the adjacent .lock file and retry. Never delete or share the account file.',
  // Plan usage (subscription_sharing_*), see errors.ts.
  planUsageLimitExceeded: 'ChatGPT plan usage limit reached for this app or for your plan. Review the applicable limit under Manage usage: {url}',
  planUsageUnavailable: 'ChatGPT plan usage is temporarily unavailable for this account. Check your plan status under Manage usage: {url}',
  planNotEntitled: 'This ChatGPT account is not eligible for plan usage in third-party apps (Plus or Pro required). Identity sign-in alone does not grant model usage.',
  planNotGranted: 'ChatGPT plan usage was not granted at sign-in. Sign in again and approve plan usage on the consent screen.',
  planRefused: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url}",
  planRefusedWithDetail: "ChatGPT plan usage was refused ({code}). Review your plan and this app's limit under Manage usage: {url} Provider detail: {detail}",
  planRequestFailed: 'ChatGPT plan request failed.',
  planTokenRefused: 'the ChatGPT plan token was refused. Run `dsh-chatgpt-siwc login` to sign in again.',
  planNotGrantedForApp: "this ChatGPT account is signed in, but plan usage was not granted for this app. Check the app's plan access and per-app cap in ChatGPT settings (Manage usage), then sign in again.",

  // Sign-in state.
  notSignedIn: 'Not signed in with ChatGPT. Run `dsh-chatgpt-siwc login` or `/chatgpt login` first.',
  signInMissing: 'ChatGPT sign-in is missing or no longer valid. Run `dsh-chatgpt-siwc login` (or sign in from the harness settings) and try again.',
  sessionExpired: 'ChatGPT session expired or was disconnected. Sign in again.',
  noRefreshToken: 'no refresh token stored; sign in again',
  loginInProgress: 'a ChatGPT sign-in is already in progress',
  loginInProgressShort: 'A sign-in is already in progress.',
  loginCouldNotStart: 'ChatGPT sign-in could not start',
  signOutStillInProgress: 'ChatGPT sign-out is still in progress',
  signOutAlreadyInProgress: 'ChatGPT sign-out is already in progress',
  accountRequestFailed: 'Account request failed. Try again.',

  // Loopback callback.
  callbackStateMismatch: 'Sign-in callback state did not match this attempt. Nothing was exchanged.',
  authorizationFailed: 'Authorization failed: {error}',
  callbackNoCode: 'Authorization callback carried no code.',
  attemptAlreadyCompleted: 'This sign-in attempt already completed. Start the sign-in again for a new one.',
  signInDeadline: 'The sign-in did not complete in time. Run the sign-in again.',
  callbackTimeout: 'sign-in callback did not arrive in time',
  signInAborted: 'sign-in aborted',
  listenerNoPort: 'loopback listener has no port',

  // Token exchange and registration.
  tokenRefused: 'token endpoint refused the request: {detail}',
  tokenNoAccessToken: 'token endpoint returned no access token',
  tokenNoIdToken: 'token response carried no ID token; identity cannot be validated',
  unknownAccount: 'no registration for client id {clientId}',
  clientIdMismatch: 'callback returned a different client id than the selected account',
  registrationIncomplete: 'registration callback returned no issued client id',
  identityMismatch: 'signed-in identity does not match the selected account',

  // ID-token verification.
  jwtSegmentNotObject: 'JWT segment is not a JSON object',
  idTokenNotJwt: 'ID token is not a JWT',
  jwksFetchFailed: 'JWKS fetch failed (HTTP {status})',
  jwksNoKeys: 'JWKS document has no keys',
  idTokenAlg: 'ID token alg is {alg}, expected RS256',
  idTokenNoKid: 'ID token has no kid',
  idTokenUnknownKid: 'no JWKS key for kid {kid}',
  idTokenSignature: 'ID token signature does not verify',
  idTokenIssuer: 'ID token issuer {issuer} is not {expected}',
  idTokenAudience: 'ID token audience does not match the issued client id',
  idTokenAzp: 'ID token azp does not match the issued client id',
  idTokenExpired: 'ID token is expired',
  idTokenNotYetValid: 'ID token is not yet valid',
  idTokenNonce: 'ID token nonce does not match this sign-in attempt',
  idTokenNoSubject: 'ID token has no subject',

  // Model catalog.
  modelCatalogHttp: 'model catalog request failed (HTTP {status})',
  modelCatalogNotObject: 'model catalog response is not an object',
  modelCatalogNoRows: 'model catalog response contains neither models nor data',

  // Configuration.
  configProviderEmpty: 'provider route name must not be empty',
  configAppNameEmpty: 'app name must not be empty',
  catalogAccountChanged: 'The signed-in account changed during catalog refresh. Refresh the model index again.',
  configUnsupportedEffort: 'unsupported reasoning effort "{effort}"',
  configIdleTimeout: 'stream idle timeout must be a positive integer in milliseconds',
  configApiBaseInvalid: 'API base URL must be an absolute URL on https://api.openai.com (or a loopback host for local testing)',
  configApiBaseCredentials: 'API base URL must not carry credentials, a query, or a fragment',
  configApiBaseOrigin: 'API base URL origin {origin} is not allowed; the ChatGPT plan token is only sent to {allowed} (or a loopback host for local testing)',
  configApiRequestOrigin: 'API request URL left the configured API origin',
  registrationRollbackFailed: 'provider rename and rollback failed; the inconsistent route was removed. Save a valid provider route to restore it.',

  // Provider / stream.
  unsupportedContent: 'ChatGPT plan route does not accept {kind} input ({where}); the request was not sent.',
  providerReportedError: 'the provider reported an error',
  providerRateLimited: 'rate limited by the provider',
  providerHttp: 'the provider answered HTTP {status}',
  streamNoTerminal: 'the Responses stream ended without a terminal event',
  callAborted: 'the call was aborted',
} as const

/** Every human error message key. */
export type ErrorMessageKey = keyof typeof errorEn

export const errorZh: Record<ErrorMessageKey, string> = {

  controlPlaneTimeout: 'ChatGPT 连接超时。请检查网络后重试；保存的账户未更改。',

  storeLocked: '账户存储正忙，或存在遗留的写入锁。请停止所有 DSH 和 SIWC 进程，确认锁的持有进程已退出，再仅删除相邻的 .lock 文件后重试。不要删除或分享账户文件。',
  planUsageLimitExceeded: '已达到此应用或你的套餐的 ChatGPT 套餐用量上限。请在“管理用量”中查看适用的上限：{url}',
  planUsageUnavailable: '此账户的 ChatGPT 套餐用量暂时不可用。请在“管理用量”中查看套餐状态：{url}',
  planNotEntitled: '此 ChatGPT 账户不具备在第三方应用中使用套餐的资格（需要 Plus 或 Pro）。仅完成身份登录并不会授予模型用量。',
  planNotGranted: '登录时未授予 ChatGPT 套餐用量。请重新登录，并在授权确认页同意套餐使用。',
  planRefused: 'ChatGPT 套餐用量被拒绝（{code}）。请在“管理用量”中查看你的套餐和此应用的上限：{url}',
  planRefusedWithDetail: 'ChatGPT 套餐用量被拒绝（{code}）。请在“管理用量”中查看你的套餐和此应用的上限：{url} 提供方详情：{detail}',
  planRequestFailed: 'ChatGPT 套餐请求失败。',
  planTokenRefused: 'ChatGPT 套餐令牌被拒绝。请运行 `dsh-chatgpt-siwc login` 重新登录。',
  planNotGrantedForApp: '此 ChatGPT 账户已登录，但未为此应用授予套餐用量。请在 ChatGPT 设置（管理用量）中检查此应用的套餐访问权限和单应用上限，然后重新登录。',

  notSignedIn: '尚未使用 ChatGPT 登录。请先运行 `dsh-chatgpt-siwc login` 或 `/chatgpt login`。',
  signInMissing: 'ChatGPT 登录缺失或已失效。请运行 `dsh-chatgpt-siwc login`（或在 harness 设置中登录）后重试。',
  sessionExpired: 'ChatGPT 会话已过期或已断开连接。请重新登录。',
  noRefreshToken: '未保存刷新令牌；请重新登录',
  loginInProgress: '已有一个 ChatGPT 登录正在进行',
  loginInProgressShort: '已有一个登录正在进行。',
  loginCouldNotStart: 'ChatGPT 登录无法启动',
  signOutStillInProgress: 'ChatGPT 退出登录仍在进行中',
  signOutAlreadyInProgress: 'ChatGPT 退出登录已在进行中',
  accountRequestFailed: '账户请求失败，请重试。',

  callbackStateMismatch: '登录回调的 state 与本次尝试不匹配，未进行任何交换。',
  authorizationFailed: '授权失败：{error}',
  callbackNoCode: '授权回调未携带授权码。',
  attemptAlreadyCompleted: '本次登录尝试已经结束。请重新发起登录。',
  signInDeadline: '登录未在规定时间内完成。请重新登录。',
  callbackTimeout: '登录回调未在规定时间内到达',
  signInAborted: '登录已中止',
  listenerNoPort: '本地回环监听器没有可用端口',

  tokenRefused: '令牌端点拒绝了请求：{detail}',
  tokenNoAccessToken: '令牌端点未返回访问令牌',
  tokenNoIdToken: '令牌响应中没有 ID 令牌，无法验证身份',
  unknownAccount: '没有 client id 为 {clientId} 的注册信息',
  clientIdMismatch: '回调返回的 client id 与所选账户不一致',
  registrationIncomplete: '注册回调没有返回签发的 client id',
  identityMismatch: '登录的身份与所选账户不一致',

  jwtSegmentNotObject: 'JWT 片段不是 JSON 对象',
  idTokenNotJwt: 'ID 令牌不是 JWT',
  jwksFetchFailed: '获取 JWKS 失败（HTTP {status}）',
  jwksNoKeys: 'JWKS 文档中没有密钥',
  idTokenAlg: 'ID 令牌的 alg 为 {alg}，应为 RS256',
  idTokenNoKid: 'ID 令牌没有 kid',
  idTokenUnknownKid: 'JWKS 中没有 kid 为 {kid} 的密钥',
  idTokenSignature: 'ID 令牌签名验证失败',
  idTokenIssuer: 'ID 令牌签发方 {issuer} 不是 {expected}',
  idTokenAudience: 'ID 令牌的 audience 与签发的 client id 不一致',
  idTokenAzp: 'ID 令牌的 azp 与签发的 client id 不一致',
  idTokenExpired: 'ID 令牌已过期',
  idTokenNotYetValid: 'ID 令牌尚未生效',
  idTokenNonce: 'ID 令牌的 nonce 与本次登录尝试不匹配',
  idTokenNoSubject: 'ID 令牌没有 subject',

  modelCatalogHttp: '模型目录请求失败（HTTP {status}）',
  modelCatalogNotObject: '模型目录响应不是对象',
  modelCatalogNoRows: '模型目录响应中既没有 models 也没有 data',

  configProviderEmpty: '提供方路由名称不能为空',
  configAppNameEmpty: '应用名称不能为空',
  catalogAccountChanged: '刷新目录期间，登录账户已更改。请重新刷新模型索引。',
  configUnsupportedEffort: '不支持的推理力度“{effort}”',
  configIdleTimeout: '流空闲超时必须是以毫秒为单位的正整数',
  configApiBaseInvalid: 'API 基础 URL 必须是 https://api.openai.com 上的绝对 URL（本地测试可使用回环地址）',
  configApiBaseCredentials: 'API 基础 URL 不能包含凭据、查询参数或片段',
  configApiBaseOrigin: '不允许使用 API 基础 URL 源 {origin}；ChatGPT 套餐令牌只会发送到 {allowed}（本地测试可使用回环地址）',
  configApiRequestOrigin: 'API 请求 URL 离开了已配置的 API 源',
  registrationRollbackFailed: '提供方重命名及回滚均失败；不一致的路由已被移除。保存一个有效的提供方路由即可恢复。',

  unsupportedContent: 'ChatGPT 套餐路由不接受 {kind} 类型的输入（{where}）；请求未发送。',
  providerReportedError: '提供方报告了一个错误',
  providerRateLimited: '提供方限制了请求频率',
  providerHttp: '提供方返回了 HTTP {status}',
  streamNoTerminal: 'Responses 流在没有终止事件的情况下结束',
  callAborted: '调用已中止',
}

/** Both error dictionaries. */
export const errorMessages: Dictionaries<ErrorMessageKey> = { en: errorEn, zh: errorZh }

const matcher = compileMatcher<ErrorMessageKey>(errorEn)

/**
 * Recover the message key and parameters from an English error message
 * produced by one of this plugin's modules.
 * @returns the key and parameters, or `undefined` for unrecognized text
 *   (provider-supplied detail, foreign errors).
 */
export function matchErrorMessage(text: string): { key: ErrorMessageKey; params: Record<string, string> } | undefined {
  return matcher.match(text)
}
