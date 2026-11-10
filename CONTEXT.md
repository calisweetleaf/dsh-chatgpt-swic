# Current repository context


## Release 2.0.0 qualification

The operator selected 2.0.0 as the public npm major version. Current `npm ci`, `npm run typecheck` and `npm test` passed (300 tests in 14 files). The exact 97-file package was installed through native DSH Plugins -> Add plugin -> file: in an isolated profile; one canonical component ran, the provider route was siwc-dsh-core, installed bytes matched the tarball, and English/Chinese metadata, Details and account controls were inspected. No live account operation or inference was performed in this verification. The current provider boundary retains both supported languages for plugin-owned errors because the native provider call has no viewer locale.

Publication is blocked by npm authentication/permissions, NOT declared complete: whoami returned E401; an actual public/latest publish of 2.0.0 returned E404 on PUT. The qualified tarball is `/tmp/dsh-public-v2-release-SSl56o/dsh-chatgpt-siwc-2.0.0-sha256-09560a75fdba6d81f749b458b055465fd222a14c42ab0dd6ac47a3922c656b28.tgz`. Retry that exact artifact after npm login, then verify registry integrity/tag/version. The workspace release/OPERATOR_RUNBOOK.md records the companion Arrakis artifact and installed UI evidence. Older dated candidate notes below remain history, not the current gate result.

## Local provider transport hardening (2026-11-09)

A Luna turn recorded `fetch failed` before receiving Responses chunks, with no upstream HTTP status. The adapter now bounds the wait for headers with the configured stream timeout, distinguishes fetch rejection, timeout, and an HTTP success without a body, and preserves caller cancellation if it races a stream failure. It never retries the POST. Typecheck and 290 tests passed. The hardened tarball was qualified with stock DSH in an isolated profile alongside the separate Arrakis patch bundle; the public tag and operator web profile were not changed. The root network cause of the historical failure was not recorded.

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
