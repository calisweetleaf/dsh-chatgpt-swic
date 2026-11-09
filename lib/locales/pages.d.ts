/**
 * Copy for the loopback sign-in pages (`src/pages.ts`), English and
 * Simplified Chinese. Values are static, trusted text inserted into HTML
 * as-is; only interpolated values (email, error text) are escaped.
 *
 * @module dsh-chatgpt-siwc/locales/pages
 */
import type { Dictionaries } from '../i18n.ts';
export declare const pageEn: {
    readonly titleSuffix: "DeepSeek Harness";
    readonly waitingTitle: "Signing in";
    readonly waitingHeading: "Signing in with ChatGPT";
    readonly waitingAria: "Waiting";
    readonly waitingBody: "Complete the sign-in in the OpenAI window, and this tab will update.";
    readonly waitingPassword: "DeepSeek Harness never sees your ChatGPT password.";
    readonly successTitle: "Signed in";
    readonly successHeading: "You're signed in";
    readonly planActiveLead: "Using ChatGPT plan";
    readonly planActiveBody: " — eligible requests in DeepSeek Harness now draw on your ChatGPT plan.";
    readonly planMissing: "Identity signed in, but ChatGPT plan usage was not granted. Sign in again and approve plan usage to run models.";
    readonly firstTimeHint: "You can review usage and set a per-app cap any time in ChatGPT settings under Usage.";
    readonly successClose: "You can close this tab and return to DeepSeek Harness.";
    readonly errorTitle: "Sign-in failed";
    readonly errorHeading: "Sign-in didn't complete";
    readonly errorRetry: "Return to DeepSeek Harness and run the sign-in again.";
};
/** Every key the sign-in pages' dictionary carries. */
export type PageMessageKey = keyof typeof pageEn;
export declare const pageZh: Record<PageMessageKey, string>;
/** Both page dictionaries. */
export declare const pageMessages: Dictionaries<PageMessageKey>;
