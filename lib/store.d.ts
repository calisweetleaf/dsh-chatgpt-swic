/**
 * File-backed store for SIWC registrations and tokens.
 *
 * Layout under the Harness home (never anywhere near `~/.codex`):
 * - `chatgpt-siwc/accounts.json` (`0600`, dir `0700`): one credential
 *   record per issued client id. Registrations are never merged: one
 *   record's client id only ever travels with that record's tokens.
 * - `chatgpt-siwc/host.json`: this installation's stable
 *   `ext_agent_host_id` (`urn:uuid:…`). Not a secret.
 *
 * Writes are atomic and serialized through the cross-process writer lock
 * of `dsh-atomic-write`. A refresh holds that lock across its token
 * exchange and re-reads the record first (see `refreshAccount`), so a
 * rotating refresh token cannot be spent twice by two processes. A group/world-readable accounts file is
 * refused on POSIX before its contents are read.
 *
 * @module dsh-chatgpt-siwc/store
 */
/**
 * How long a writer waits for the accounts-file lock. The longest legitimate
 * hold is a refresh: one token-endpoint round trip bounded by
 * `HTTP_TIMEOUT_MS`, plus file I/O.
 */
export declare const STORE_LOCK_WAIT_MS: number;
/** One ChatGPT account's registration + credential record (official record shape). */
export interface AccountRecord {
    email?: string;
    name?: string;
    picture?: string;
    issuer: string;
    /** Validated ID-token subject; the account identity (with client_id). */
    subject: string;
    /** The issued `oaiapp_…` client id from the registration callback. */
    client_id: string;
    ext_agent_host_id: string;
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    /** Access-token lifetime in seconds, as issued. */
    expires_in?: number;
    /** Absolute access-token expiry (epoch ms), computed at save time. */
    expires_at?: number;
    /** Granted scopes from the latest token response. */
    scopes: string[];
    /** UTC timestamp of the latest token response. */
    saved_at: string;
    /** Last model catalog this account returned (slug + display name), for offline pickers. */
    models?: CatalogModel[];
    modelsEndpoint?: string;
}
/** The accounts document. */
export interface AccountsDocument {
    version: 1;
    /** Client id of the account new requests use. */
    activeClientId?: string;
    /** Whether the one-time first-sign-in welcome has been shown. */
    welcomed?: boolean;
    accounts: Record<string, AccountRecord>;
}
/** Token fields replaced together on exchange/refresh (rotation is atomic). */
export interface TokenSet {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
}
/** Default location of the accounts document. */
export declare function defaultStorePath(): string;
/** Split a space-separated scope string into a list. */
export declare function parseScopes(scope: string | undefined): string[];
export interface CatalogModel {
    slug: string;
    displayName: string;
    reasoningEfforts?: string[];
    defaultReasoningEffort?: string;
    supportsReasoningSummary?: boolean;
}
export declare class AccountsStore {
    readonly path: string;
    constructor(path?: string);
    /** The sibling file holding this host's stable id. */
    get hostPath(): string;
    private ensureDir;
    /** Read and validate the document; a missing file is an empty document. */
    readDocument(): Promise<AccountsDocument>;
    private writeDocument;
    /** Run one read-modify-write under the cross-process lock. */
    modify<T>(fn: (doc: AccountsDocument) => Promise<T> | T): Promise<T>;
    /**
     * Run one read-decide-(write) cycle under the cross-process writer lock.
     * The document is re-read after the lock is acquired, so the decision sees
     * every commit another process made first. `fn` may perform bounded network
     * work (a token refresh) while holding the lock; it reports whether its
     * changes to `doc` must be committed. A throw commits nothing, leaving the
     * stored document exactly as it was.
     *
     * Every writer of this file waits up to {@link STORE_LOCK_WAIT_MS}, which
     * exceeds the longest legitimate hold (one control-plane round trip bounded
     * by `HTTP_TIMEOUT_MS`), so a contender waits out a refresh instead of
     * failing while it is in flight.
     */
    transact<T>(fn: (doc: AccountsDocument) => Promise<{
        value: T;
        write: boolean;
    }>): Promise<T>;
    /**
     * This host's stable `ext_agent_host_id`, created on first use and the
     * same for every later sign-in from this installation.
     */
    hostId(): Promise<string>;
    /** All account records (full records — callers must never log tokens). */
    accounts(): Promise<AccountRecord[]>;
    /** One account by its issued client id. */
    account(clientId: string): Promise<AccountRecord | undefined>;
    /** The active account, if any registration exists. */
    active(): Promise<AccountRecord | undefined>;
    /** Whether the one-time welcome has already been shown. */
    welcomed(): Promise<boolean>;
    /** Record that the one-time welcome has been shown. */
    markWelcomed(): Promise<void>;
    /**
     * Insert or replace one account's identity + tokens after a validated
     * sign-in, and make it the active account.
     */
    saveSignIn(record: AccountRecord): Promise<void>;
    /**
     * Keep an issued registration (client id only, no tokens, no identity yet)
     * the moment the callback names it, before the code exchange. Never
     * overwrites an existing record; becomes active only when no signed-in
     * account is active, so a failed second sign-in never displaces the first.
     */
    saveRegistration(input: {
        client_id: string;
        ext_agent_host_id: string;
    }): Promise<void>;
    /**
     * Replace one account's token set after a refresh. The access token,
     * expiry, scopes, and rotated refresh token move together — never
     * one without the others.
     */
    saveTokens(clientId: string, tokens: TokenSet): Promise<AccountRecord>;
    /**
     * Sign one account out locally: tokens are cleared, the registration
     * (client id + identity + host id) is kept so a later sign-in can
     * reauthorize without re-registering.
     */
    clearTokens(clientId: string): Promise<void>;
    /** Delete one registration entirely (sign-out with purge). */
    remove(clientId: string): Promise<void>;
    /** Choose which registered account new requests use. */
    setActive(clientId: string): Promise<void>;
    /** Cache one account's model catalog for offline pickers. */
    saveModels(identity: Pick<AccountRecord, 'client_id' | 'subject'>, endpoint: string, models: CatalogModel[]): Promise<void>;
}
/** Apply one token response onto a record, computing the absolute expiry. */
export declare function applyTokens(account: AccountRecord, tokens: TokenSet): void;
/** Drop one record's token set, keeping its registration and identity. */
export declare function clearTokenFields(account: AccountRecord): void;
/** Whether a record currently holds usable credentials. */
export declare function isSignedIn(account: AccountRecord | undefined): account is AccountRecord;
/** Whether the record's granted scopes include plan usage. */
export declare function planGranted(account: AccountRecord | undefined): boolean;
/** A token-free view of one account, safe to print. */
export declare function publicView(account: AccountRecord): Record<string, unknown>;
