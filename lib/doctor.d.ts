/**
 * Token-free diagnostics for the operator and for the Creator agent's
 * inspection: which build of this plugin is loaded and from where, which
 * accounts file it reads (DSH_HOME decides it), what registrations exist,
 * whether a writer lock is held, and whether the preferred callback port is
 * free. Never reads or prints a token, an ID token, an email, or a name.
 *
 * @module dsh-chatgpt-siwc/doctor
 */
import { AccountsStore } from './store.ts';
/** The package root and version of the code that is actually running. */
export declare function loadedIdentity(): {
    name: string;
    version: string;
    root: string;
};
/** One token-free report. Safe to paste into an issue. */
export declare function doctorReport(store?: AccountsStore): Promise<Record<string, unknown>>;
