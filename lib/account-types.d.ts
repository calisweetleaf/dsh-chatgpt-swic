/** Token-free account status shared with the browser panel. */
export interface SiwcAccountAttempt {
    id: string;
    phase: 'waiting' | 'succeeded' | 'failed' | 'cancelled';
    authorizationUrl?: string;
    error?: string;
    /** Token-free machine code of the failure (e.g. TOKEN_EXCHANGE_FAILED). */
    code?: string;
    /** Last sign-in stage reached; on failure, the stage that broke. */
    stage?: SiwcLoginStage;
}
/** Ordered, token-free sign-in stages reported by the host. */
export type SiwcLoginStage = 'listening' | 'authorize' | 'callback' | 'registered' | 'exchange' | 'verify' | 'save' | 'done';
export interface SiwcAccountStatus {
    signedIn: boolean;
    account?: {
        email?: string;
        name?: string;
        clientId: string;
        scopes: string[];
        planGranted: boolean;
        accessTokenExpiresAt?: string;
    };
    attempt?: SiwcAccountAttempt;
}
export interface SiwcSignInStart {
    id: string;
    authorizationUrl: string;
}
export interface SiwcSignOutResult {
    revoked: boolean;
    email?: string;
}
/** Public identity projection, with no credential material. */
export type SiwcAccountIdentity = NonNullable<SiwcAccountStatus['account']>;
