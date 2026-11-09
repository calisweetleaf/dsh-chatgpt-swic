# Current repository context

## Candidate: account model index (2026-11-09)

The pinned DSH host uses the SIWC adapter's local account catalog for warm listing and model resolution. Initial seeding and explicit native discovery use the authorized public Models endpoint. The CLI `models` command rebuilds the default-endpoint index and prints model IDs, names and advertised effort IDs only. Catalog policy does not infer an effort when the server omits metadata.

Verified from the clean worktree based on canonical `origin/main`: clean dependency install, typecheck, build, 287 tests, and pack. The native web installation matched all 97 packed files. A live catalog refresh returned eight visible models; GPT-6.1 Terra exposed `ultra` in DSH's native effort menu. The test restored the original model and did not send an inference request.

Release gate remains closed: English/zh-CN catalogs and README parity tests pass, but end-to-end bilingual parity is not certified. The host-facing adapter still creates English-only `LlmError` text in paths such as an SSE disconnect before the terminal event. Do not push before closing this gap and verifying both locales in stock DSH. No private workspace artifacts belong in the standalone repository.

Completed standalone provider version 0.2.0. The public SIWC flow, account vault,
provider stream, typed browser account controls and staged settings form are
implemented. The private native Harness port targets a separate API generation.

## Verification

Current restored-checkout gates: `npm run typecheck`, `npm test` (10 files,
88 tests), `npm pack --dry-run` (68 package files), and `git diff --check` pass.
OAuth callback tests use a real loopback listener with fake authorization/token
endpoints; account tests use temporary stores and injected lifecycle functions.
No live account sign-in, revocation or inference was performed as a test.

The test compiler lowers the account service's standard decorators through the
same TypeScript compiler used by the distributed Host build. Runtime methods
use the actual Typert Remote markers and strict client codecs.

## Completed repairs

The CLI browser opener no longer recurses. Reauthorization URLs omit ID-token
hints from console/browser RPC. Callback arrival is bounded and cancellation
listeners are removed. Host-ID creation and token rotation are serialized.
Empty granted scopes clear previous grants. Windows browser launch avoids a
command interpreter. The adapter retains ordered tool replay, actual call IDs,
empty outputs, refusal text, terminal blocks and usage. Its byte-idle watchdog
accepts heartbeat traffic and releases stalled or cancelled readers.

Account sign-out excludes concurrent sign-in; pending sign-in settles before
cancellation/disposal completes. The browser opens the handoff before polling,
retains its fallback link on a status-read error, and cancels only its own
attempt when unloaded. The plugin configuration and route-directory pair are
validated and reconciled together.

## Continuation

The user explicitly authorizes frequent pushes to this repository's origin/main.
Keep completed tested milestones remote. Native Harness changes remain private;
its upstream origin is deepseek-ai rather than the user's repository. Preserve
existing language-native systems and defer the lab until login is useful.

Model discovery accepts both the subscription visibility catalog and the public API data-array catalog. Unknown top-level shapes raise a catalog error rather than quietly inventing an empty result.
