/**
 * Copy for the `dsh-chatgpt-siwc` CLI (`src/bin.ts`), English and
 * Simplified Chinese, plus the CLI's language selection. JSON output, error
 * codes, command names, flags and URLs are never translated.
 *
 * @module dsh-chatgpt-siwc/locales/cli
 */
import { type Dictionaries, type Locale, type MessageParams } from '../i18n.ts';
export declare const cliEn: {
    readonly loginPlanGranted: "plan usage: granted — this account can serve model calls.";
    readonly loginPlanNotGranted: "plan usage: NOT granted — identity only. Check plan access for this app in ChatGPT settings.";
    readonly firstSignIn: "first sign-in: this installation is now registered with ChatGPT.";
    readonly notSignedIn: "not signed in. Run: dsh-chatgpt-siwc login";
    readonly statusPlanGranted: "plan usage: granted";
    readonly statusPlanNotGranted: "plan usage: not granted";
    readonly signedOutRevoked: "signed out; the session was revoked at OpenAI.";
    readonly signedOutRevokedEmail: "signed out ({email}); the session was revoked at OpenAI.";
    readonly signedOutLocal: "signed out locally; the revocation at OpenAI could not be confirmed — you can disconnect the app in ChatGPT settings.";
    readonly usage: "usage: dsh-chatgpt-siwc <login|status|models|logout|doctor> [options]";
    readonly usageLogin: "  login   [--name <agent name>] [--client-id <oaiapp_…>] [--new] [--no-browser] [--store <path>]";
    readonly usageDoctor: "  doctor  [--store <path>]   token-free JSON: loaded package, store path, registrations, lock, callback port";
    readonly usageStatus: "  status  [--store <path>]";
    readonly usageModels: "  models  [--store <path>]";
    readonly usageLogout: "  logout  [--purge] [--store <path>]";
    readonly usageLang: "  --lang <zh|en>  output language (default: from LC_ALL / LC_MESSAGES / LANG)";
    readonly badLang: "--lang expects zh or en, got \"{value}\"";
};
/** Every key the CLI's own dictionary carries. */
export type CliMessageKey = keyof typeof cliEn;
export declare const cliZh: Record<CliMessageKey, string>;
/** Both CLI dictionaries. */
export declare const cliMessages: Dictionaries<CliMessageKey>;
/**
 * Progress lines the sign-in flow reports (minted in English by
 * `src/oauth.ts`). The CLI re-renders recognized lines; anything else —
 * notably the authorization URL itself — is printed unchanged.
 */
export declare const reporterEn: {
    readonly openThisUrl: "Sign in with ChatGPT: open this URL in your browser if it does not open automatically:";
    readonly refuseNonHttps: "dsh-chatgpt-siwc: refusing to open a non-https URL";
    readonly listening: "Listening for the ChatGPT callback on 127.0.0.1 (path {path}).";
    readonly signedIn: "Signed in.";
    readonly signedInAs: "Signed in as {email}.";
    readonly planGranted: "ChatGPT plan usage: granted. Eligible requests will draw on your plan.";
    readonly planNotGranted: "ChatGPT plan usage: NOT granted — identity only. Re-run sign-in and approve plan usage to run models.";
};
/** Every recognized sign-in progress line. */
export type ReporterLineKey = keyof typeof reporterEn;
export declare const reporterZh: Record<ReporterLineKey, string>;
/** Both reporter-line dictionaries. */
export declare const reporterMessages: Dictionaries<ReporterLineKey>;
/** Render a CLI message. */
export declare function cliText(key: CliMessageKey, locale: Locale, params?: MessageParams): string;
/** Re-render one sign-in progress line in `locale`; unrecognized lines pass through. */
export declare function localizeReporterLine(line: string, locale: Locale): string;
/** The full usage text, one line per entry. */
export declare function usageLines(locale: Locale): string[];
/** The CLI's language decision and its arguments with `--lang` removed. */
export interface CliLanguage {
    locale: Locale;
    args: string[];
    /** Set when `--lang` carried an unsupported value (the locale then comes from the environment). */
    invalid?: string;
}
/**
 * Decide the CLI language: an explicit `--lang zh|en` (or `--lang=…`) wins;
 * otherwise POSIX `LC_ALL` → `LC_MESSAGES` → `LANG` (`zh_*` → `zh`); else `en`.
 * @param argv - the arguments after the executable name.
 * @param env - the process environment.
 */
export declare function resolveCliLanguage(argv: readonly string[], env: Readonly<Record<string, string | undefined>>): CliLanguage;
