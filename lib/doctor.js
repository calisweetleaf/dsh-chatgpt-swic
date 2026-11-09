/**
 * Token-free diagnostics for the operator and for the Creator agent's
 * inspection: which build of this plugin is loaded and from where, which
 * accounts file it reads (DSH_HOME decides it), what registrations exist,
 * whether a writer lock is held, and whether the preferred callback port is
 * free. Never reads or prints a token, an ID token, an email, or a name.
 *
 * @module dsh-chatgpt-siwc/doctor
 */
import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALLBACK_PATH, PREFERRED_CALLBACK_PORT } from "./constants.js";
import { AccountsStore, isSignedIn, planGranted } from "./store.js";
/** The package root and version of the code that is actually running. */
export function loadedIdentity() {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 4; i += 1) {
        try {
            const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
            if (pkg.name === 'dsh-chatgpt-siwc')
                return { name: pkg.name, version: pkg.version ?? 'unknown', root: dir };
        }
        catch { /* keep climbing */ }
        dir = dirname(dir);
    }
    return { name: 'dsh-chatgpt-siwc', version: 'unknown', root: dirname(fileURLToPath(import.meta.url)) };
}
function portFree(port) {
    return new Promise((resolve) => {
        const probe = createServer();
        probe.once('error', () => resolve(false));
        probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
    });
}
async function fileFacts(path) {
    try {
        const info = await stat(path);
        return { exists: true, mode: (info.mode & 0o777).toString(8).padStart(3, '0'), ageSeconds: Math.round((Date.now() - info.mtimeMs) / 1000) };
    }
    catch {
        return { exists: false };
    }
}
/** One token-free report. Safe to paste into an issue. */
export async function doctorReport(store = new AccountsStore()) {
    const accounts = await store.accounts().catch((error) => error instanceof Error ? error : new Error(String(error)));
    const active = await store.active().catch(() => undefined);
    return {
        loaded: loadedIdentity(),
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        dshHomeEnv: process.env['DSH_HOME'] ?? null,
        store: { path: store.path, ...(await fileFacts(store.path)) },
        lock: { path: `${store.path}.lock`, ...(await fileFacts(`${store.path}.lock`)) },
        hostId: (await fileFacts(store.hostPath)).exists ? 'present' : 'absent',
        registrations: accounts instanceof Error
            ? { error: accounts.message }
            : accounts.map(account => ({
                clientId: account.client_id,
                active: active?.client_id === account.client_id,
                identityVerified: account.subject !== '',
                signedIn: isSignedIn(account),
                planGranted: planGranted(account),
                scopes: account.scopes,
                savedAt: account.saved_at,
            })),
        callback: { host: '127.0.0.1', path: CALLBACK_PATH, preferredPort: PREFERRED_CALLBACK_PORT, preferredPortFree: await portFree(PREFERRED_CALLBACK_PORT) },
    };
}
//# sourceMappingURL=doctor.js.map