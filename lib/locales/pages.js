/**
 * Copy for the loopback sign-in pages (`src/pages.ts`), English and
 * Simplified Chinese. Values are static, trusted text inserted into HTML
 * as-is; only interpolated values (email, error text) are escaped.
 *
 * @module dsh-chatgpt-siwc/locales/pages
 */
export const pageEn = {
    titleSuffix: 'DeepSeek Harness',
    waitingTitle: 'Signing in',
    waitingHeading: 'Signing in with ChatGPT',
    waitingAria: 'Waiting',
    waitingBody: 'Complete the sign-in in the OpenAI window, and this tab will update.',
    waitingPassword: 'DeepSeek Harness never sees your ChatGPT password.',
    successTitle: 'Signed in',
    successHeading: "You're signed in",
    planActiveLead: 'Using ChatGPT plan',
    planActiveBody: ' — eligible requests in DeepSeek Harness now draw on your ChatGPT plan.',
    planMissing: 'Identity signed in, but ChatGPT plan usage was not granted. Sign in again and approve plan usage to run models.',
    firstTimeHint: 'You can review usage and set a per-app cap any time in ChatGPT settings under Usage.',
    successClose: 'You can close this tab and return to DeepSeek Harness.',
    errorTitle: 'Sign-in failed',
    errorHeading: "Sign-in didn't complete",
    errorRetry: 'Return to DeepSeek Harness and run the sign-in again.',
};
export const pageZh = {
    titleSuffix: 'DeepSeek Harness',
    waitingTitle: '正在登录',
    waitingHeading: '正在使用 ChatGPT 登录',
    waitingAria: '等待中',
    waitingBody: '请在 OpenAI 窗口中完成登录，此标签页会自动更新。',
    waitingPassword: 'DeepSeek Harness 永远不会接触你的 ChatGPT 密码。',
    successTitle: '已登录',
    successHeading: '登录成功',
    planActiveLead: '正在使用 ChatGPT 套餐',
    planActiveBody: '——DeepSeek Harness 中符合条件的请求现在会使用你的 ChatGPT 套餐。',
    planMissing: '身份已登录，但未授予 ChatGPT 套餐用量。请重新登录并同意套餐使用，才能运行模型。',
    firstTimeHint: '你可以随时在 ChatGPT 设置的“用量”（Usage）中查看用量，并为单个应用设置上限。',
    successClose: '现在可以关闭此标签页，返回 DeepSeek Harness。',
    errorTitle: '登录失败',
    errorHeading: '登录未完成',
    errorRetry: '请返回 DeepSeek Harness 重新发起登录。',
};
/** Both page dictionaries. */
export const pageMessages = { en: pageEn, zh: pageZh };
//# sourceMappingURL=pages.js.map