/**
 * Copy for the `dsh-chatgpt-siwc` CLI (`src/bin.ts`), English and
 * Simplified Chinese, plus the CLI's language selection. JSON output, error
 * codes, command names, flags and URLs are never translated.
 *
 * @module dsh-chatgpt-siwc/locales/cli
 */
import { asLocale, compileMatcher, formatMessage, localeFromEnv } from "../i18n.js";
export const cliEn = {
    loginPlanGranted: 'plan usage: granted — this account can serve model calls.',
    loginPlanNotGranted: 'plan usage: NOT granted — identity only. Check plan access for this app in ChatGPT settings.',
    firstSignIn: 'first sign-in: this installation is now registered with ChatGPT.',
    notSignedIn: 'not signed in. Run: dsh-chatgpt-siwc login',
    statusPlanGranted: 'plan usage: granted',
    statusPlanNotGranted: 'plan usage: not granted',
    signedOutRevoked: 'signed out; the session was revoked at OpenAI.',
    signedOutRevokedEmail: 'signed out ({email}); the session was revoked at OpenAI.',
    signedOutLocal: 'signed out locally; the revocation at OpenAI could not be confirmed — you can disconnect the app in ChatGPT settings.',
    usage: 'usage: dsh-chatgpt-siwc <login|status|models|logout|doctor> [options]',
    usageLogin: '  login   [--name <agent name>] [--client-id <oaiapp_…>] [--new] [--no-browser] [--store <path>]',
    usageDoctor: '  doctor  [--store <path>]   token-free JSON: loaded package, store path, registrations, lock, callback port',
    usageStatus: '  status  [--store <path>]',
    usageModels: '  models  [--store <path>]',
    usageLogout: '  logout  [--purge] [--store <path>]',
    usageLang: '  --lang <zh|en>  output language (default: from LC_ALL / LC_MESSAGES / LANG)',
    badLang: '--lang expects zh or en, got "{value}"',
};
export const cliZh = {
    loginPlanGranted: '套餐用量：已授予——此账户可以服务模型调用。',
    loginPlanNotGranted: '套餐用量：未授予——仅完成了身份登录。请在 ChatGPT 设置中检查此应用的套餐访问权限。',
    firstSignIn: '首次登录：此安装已在 ChatGPT 完成注册。',
    notSignedIn: '未登录。请运行：dsh-chatgpt-siwc login',
    statusPlanGranted: '套餐用量：已授予',
    statusPlanNotGranted: '套餐用量：未授予',
    signedOutRevoked: '已退出登录；会话已在 OpenAI 撤销。',
    signedOutRevokedEmail: '已退出登录（{email}）；会话已在 OpenAI 撤销。',
    signedOutLocal: '已在本地退出登录；无法确认 OpenAI 端的撤销结果——你可以在 ChatGPT 设置中断开此应用的连接。',
    usage: '用法：dsh-chatgpt-siwc <login|status|models|logout|doctor> [选项]',
    usageLogin: '  login   [--name <应用名称>] [--client-id <oaiapp_…>] [--new] [--no-browser] [--store <路径>]',
    usageDoctor: '  doctor  [--store <路径>]   不含令牌的 JSON：已加载的包、存储路径、注册、锁、回调端口',
    usageStatus: '  status  [--store <路径>]',
    usageModels: '  models  [--store <路径>]',
    usageLogout: '  logout  [--purge] [--store <路径>]',
    usageLang: '  --lang <zh|en>  输出语言（默认根据 LC_ALL / LC_MESSAGES / LANG 判断）',
    badLang: '--lang 只接受 zh 或 en，收到的是“{value}”',
};
/** Both CLI dictionaries. */
export const cliMessages = { en: cliEn, zh: cliZh };
/**
 * Progress lines the sign-in flow reports (minted in English by
 * `src/oauth.ts`). The CLI re-renders recognized lines; anything else —
 * notably the authorization URL itself — is printed unchanged.
 */
export const reporterEn = {
    openThisUrl: 'Sign in with ChatGPT: open this URL in your browser if it does not open automatically:',
    refuseNonHttps: 'dsh-chatgpt-siwc: refusing to open a non-https URL',
    listening: 'Listening for the ChatGPT callback on 127.0.0.1 (path {path}).',
    signedIn: 'Signed in.',
    signedInAs: 'Signed in as {email}.',
    planGranted: 'ChatGPT plan usage: granted. Eligible requests will draw on your plan.',
    planNotGranted: 'ChatGPT plan usage: NOT granted — identity only. Re-run sign-in and approve plan usage to run models.',
};
export const reporterZh = {
    openThisUrl: 'Sign in with ChatGPT：如果浏览器没有自动打开，请在浏览器中打开以下 URL：',
    refuseNonHttps: 'dsh-chatgpt-siwc：拒绝打开非 https 的 URL',
    listening: '正在 127.0.0.1 上等待 ChatGPT 回调（路径 {path}）。',
    signedIn: '已登录。',
    signedInAs: '已登录为 {email}。',
    planGranted: 'ChatGPT 套餐用量：已授予。符合条件的请求将使用你的套餐。',
    planNotGranted: 'ChatGPT 套餐用量：未授予——仅完成了身份登录。请重新登录并同意套餐使用，才能运行模型。',
};
/** Both reporter-line dictionaries. */
export const reporterMessages = { en: reporterEn, zh: reporterZh };
const reporterMatcher = compileMatcher(reporterEn);
/** Render a CLI message. */
export function cliText(key, locale, params) {
    return formatMessage(cliMessages[locale][key], params);
}
/** Re-render one sign-in progress line in `locale`; unrecognized lines pass through. */
export function localizeReporterLine(line, locale) {
    if (locale === 'en')
        return line;
    const found = reporterMatcher.match(line);
    return found === undefined ? line : formatMessage(reporterMessages[locale][found.key], found.params);
}
/** The full usage text, one line per entry. */
export function usageLines(locale) {
    return ['usage', 'usageLogin', 'usageStatus', 'usageModels', 'usageLogout', 'usageDoctor', 'usageLang']
        .map(key => cliText(key, locale));
}
/**
 * Decide the CLI language: an explicit `--lang zh|en` (or `--lang=…`) wins;
 * otherwise POSIX `LC_ALL` → `LC_MESSAGES` → `LANG` (`zh_*` → `zh`); else `en`.
 * @param argv - the arguments after the executable name.
 * @param env - the process environment.
 */
export function resolveCliLanguage(argv, env) {
    const args = [];
    let explicit;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--lang') {
            explicit = argv[i + 1] ?? '';
            i++;
            continue;
        }
        if (arg.startsWith('--lang=')) {
            explicit = arg.slice('--lang='.length);
            continue;
        }
        args.push(arg);
    }
    const fromEnv = localeFromEnv(env);
    if (explicit === undefined)
        return { locale: fromEnv, args };
    const normalized = explicit.trim().toLowerCase();
    const chosen = normalized === 'zh' || normalized === 'en' ? normalized : asLocale(normalized);
    return chosen === undefined
        ? { locale: fromEnv, args, invalid: explicit }
        : { locale: chosen, args };
}
//# sourceMappingURL=cli.js.map