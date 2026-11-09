/**
 * Copy for the ChatGPT SIWC card, in the two locales the harness ships.
 *
 * The card's own copy plus the plugin's error vocabulary (from
 * `../locales/errors.ts`), each error key prefixed `err` (`planNotGranted`
 * → `errPlanNotGranted`), so an account error renders through `ctx.locale`
 * in the active language. Both dictionaries are registered together as
 * `ctx.locale.register(NS, { zh, en })`; templates use the host's `{name}`
 * placeholders.
 *
 * @module dsh-chatgpt-siwc/client/locales
 */

import { errorEn, errorZh, type ErrorMessageKey } from '../locales/errors.ts'

/** The card dictionary key an error message key renders under. */
export type SiwcErrorLocaleKey = `err${Capitalize<ErrorMessageKey>}`

/** Map an error message key to its card dictionary key. */
export function errorLocaleKey(key: ErrorMessageKey): SiwcErrorLocaleKey {
  return `err${key.charAt(0).toUpperCase()}${key.slice(1)}` as SiwcErrorLocaleKey
}

function prefixErrors(dictionary: Readonly<Record<ErrorMessageKey, string>>): Record<SiwcErrorLocaleKey, string> {
  const out = {} as Record<SiwcErrorLocaleKey, string>
  for (const key of Object.keys(dictionary) as ErrorMessageKey[]) out[errorLocaleKey(key)] = dictionary[key]
  return out
}

/** The card's own English copy. */
export const cardEn = {
  title: 'ChatGPT — Sign in with ChatGPT',
  summary: 'Connect your account through Sign in with ChatGPT, then choose an available model in the host.',
  unavailable: "This plugin's configuration is not served by this host.",
  readOnly: 'This deployment stores settings read-only; edit the profile configuration instead.',
  save: 'Save',
  saving: 'Saving…',
  saveFailed: 'The save did not land; the drafts were kept.',
  overridden: 'overridden',
  reset: 'reset',
  invalidText: 'This value is not accepted here.',
  providerLabel: 'Provider route',
  providerHint: 'The route name harness configs select this provider by.',
  agentNameHintLabel: 'App name at registration',
  agentNameHintHint: 'Shown on the first sign-in consent screen. Use one name consistently across installs.',
  effortLabel: 'Default reasoning effort',
  effortHint: 'Applied when a call names no effort. Empty keeps the model default. Supported levels vary by model.',
  effortDefault: '(model default)',
  apiBaseUrlLabel: 'API base URL',
  apiBaseUrlHint: 'The public API base the plan token is scoped to.',
  storePathLabel: 'Accounts file',
  storePathHint: 'Where SIWC accounts are stored; empty uses the Harness home default.',
  signInTitle: 'Sign-in',
  signInBody: 'Use the account panel below to sign in in your browser and approve plan access. You can also run dsh-chatgpt-siwc login in a terminal.',
  manageUsage: 'Manage usage (ChatGPT settings)',

  signInFailed: 'Sign-in could not be completed. Try again.',
  failedAt: 'Stopped at: {stage}', stageListening: 'starting the local listener', stageAuthorize: 'waiting for ChatGPT approval', stageCallback: 'receiving the approval', stageRegistered: 'app registered', stageExchange: 'exchanging the approval for access', stageVerify: 'verifying your identity', stageSave: 'saving the account', stageDone: 'done',
  accountTitle: 'ChatGPT account', accountDescription: 'Connect your account to use its plan in this host.', connected: 'Connected', disconnected: 'Not connected', loading: 'Checking account…', planReady: 'Plan access ready', planMissing: 'Plan access not available', waitingForSignIn: 'Complete sign-in in the browser window.', openSignIn: 'Open sign-in page', cancelSignIn: 'Cancel sign-in', refresh: 'Refresh status', working: 'Working…', signIn: 'Sign in with ChatGPT', reauthorize: 'Reconnect account', signOut: 'Disconnect', signOutConfirmTitle: 'Disconnect this account?', signOutConfirmBody: 'The plugin will attempt to revoke the connection and remove the local account.', keepConnected: 'Keep connected', tokenRefreshes: 'Current access expires',
} as const

/** The card's own keys (without the error vocabulary). */
export type SiwcCardOwnKey = keyof typeof cardEn

/** Every key this card's dictionary carries. */
export type SiwcCardLocaleKey = SiwcCardOwnKey | SiwcErrorLocaleKey

/** The card's own Simplified Chinese copy. */
export const cardZh: Record<SiwcCardOwnKey, string> = {
  title: 'ChatGPT — 通过 ChatGPT 登录',
  summary: '通过 Sign in with ChatGPT 连接账户，然后在主机中选择可用模型。',
  unavailable: '当前主机未提供此插件的配置。',
  readOnly: '此部署的设置为只读；请改为编辑 profile 配置。',
  save: '保存',
  saving: '保存中…',
  saveFailed: '保存未生效；草稿已保留。',
  overridden: '已覆盖',
  reset: '重置',
  invalidText: '该值不被接受。',
  providerLabel: '提供方路由',
  providerHint: 'harness 配置选择此提供方时使用的路由名。',
  agentNameHintLabel: '注册时的应用名称',
  agentNameHintHint: '显示在首次登录的授权确认页。跨安装请保持同一名称。',
  effortLabel: '默认推理力度',
  effortHint: '调用未指定力度时采用。留空则使用模型默认。支持的级别因模型而异。',
  effortDefault: '（模型默认）',
  apiBaseUrlLabel: 'API 基础 URL',
  apiBaseUrlHint: '套餐令牌所绑定到的公共 API 基址。',
  storePathLabel: '账户文件',
  storePathHint: 'SIWC 账户的存储位置；留空使用 Harness 主目录默认值。',
  signInTitle: '登录',
  signInBody: '使用下方账户面板在浏览器中登录，并授权套餐访问。你也可以在终端运行 dsh-chatgpt-siwc login。',
  manageUsage: '管理用量（ChatGPT 设置）',

  signInFailed: '登录未能完成，请重试。',
  failedAt: '停在：{stage}', stageListening: '启动本地监听', stageAuthorize: '等待 ChatGPT 授权', stageCallback: '接收授权结果', stageRegistered: '应用已注册', stageExchange: '用授权换取访问令牌', stageVerify: '验证身份', stageSave: '保存账户', stageDone: '完成',
  accountTitle: 'ChatGPT 账户', accountDescription: '连接账户后即可在此主机使用套餐。', connected: '已连接', disconnected: '未连接', loading: '正在检查账户…', planReady: '套餐访问已就绪', planMissing: '套餐访问不可用', waitingForSignIn: '请在浏览器窗口完成登录。', openSignIn: '打开登录页面', cancelSignIn: '取消登录', refresh: '刷新状态', working: '处理中…', signIn: '使用 ChatGPT 登录', reauthorize: '重新连接账户', signOut: '断开连接', signOutConfirmTitle: '断开此账户？', signOutConfirmBody: '插件将尝试撤销连接并移除本地账户。', keepConnected: '保持连接', tokenRefreshes: '当前访问令牌到期时间',
}

/** The registered English dictionary. */
export const en: Record<SiwcCardLocaleKey, string> = { ...cardEn, ...prefixErrors(errorEn) }

/** The registered Simplified Chinese dictionary. */
export const zh: Record<SiwcCardLocaleKey, string> = { ...cardZh, ...prefixErrors(errorZh) }
