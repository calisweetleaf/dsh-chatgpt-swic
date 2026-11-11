## SIWC 0.2.1-rc.5 (2026-11-10): prompt cache + reasoning replay

Operator report: sign-in works, cache hit rate terrible, plan limits drained. Causes found in the adapter (code-level, not yet measured live):
1. No `prompt_cache_key`, so turns of one session did not share a cache route. Now `prompt_cache_key` = `GenerateOptions.sessionId` (sha256 when over 64 chars).
2. `resolveModel` did not declare `systemPromptUpdate`, so DSH rewrote message 0 whenever its system prompt changed, and every mid-history system message was folded into `instructions`. Both change the very first tokens and miss the whole cache. Now the adapter declares `systemPromptUpdate: 'in-history'`; only leading system messages become instructions, and later ones are developer items in place.
3. `store:false` with no reasoning replay, so the model re-reasoned from scratch on every tool round trip (output tokens, which cost the most). Now `include: ['reasoning.encrypted_content']` when effort is not `none`; completed reasoning items go into `finish.replayState` (`{v:1,key}` + per-block entries; key = sha256(client_id, subject, model), with no token or email) and are re-inserted before their tool calls only when the key matches.
4. Developer messages with no text no longer serialize as empty user turns.
Tests: `tests/prompt-cache.test.ts`, which includes a round trip through the host's own AssistantStreamAccumulator + BlockAssembler. 300/300 tests. Unverified live: whether a plan token accepts `include` and `prompt_cache_key` (pi-ai sends both). Reasoning items are sent without `id`. If the API answers 400 on the first turn, that is the field to drop.

## Native bundle deployment (2026-11-09)

The shipped Cordis patch and plugin default now register `siwc-dsh-core` without a user composition override. Typecheck and 285 tests pass, including default registration and collision rollback. The content-addressed rc.3 tarball (SHA-256 `072170e969251552bb4f2c4dac43b1350572b1a17bedffec7a70385a4cd8d08e`) was installed with DSH's native CLI into an untouched temporary web profile and then the operator web profile; the latter matched 97/97 packed files. Playwright showed the exact tarball source, one running component and the canonical route in both launches. Port 3080 was restarted on the new artifact. No host rebuild, profile patch edits, OAuth, or live inference. See the native bundle release gate in `../../release/OPERATOR_RUNBOOK.md`.

## SIWC stream boundary repair (2026-11-09)

DSH 0.2.2-rc.1 (`fcc0ad4621`) snapshots each native chunk before assembly or publication. Optional own properties with value `undefined` fail its lossless-JSON check. SIWC now omits unavailable usage fields and the optional tool-delta name until present; it does not stringify the chunk or change SSE framing, block order, tool argument strings, finish reasons, or account handling.

Three sanitized fixtures reproduced the exception before the fix and now pass through the native accumulator and assembler. Plugin typecheck and all 285 tests passed. The web profile points to `release/dsh-chatgpt-siwc-0.2.1-rc.3-stream.tgz` (SHA-256 `6df09d7587da7edb2d2536c445adcbcbe7a0ba7b8d9fad547d3c6f06c04547d5`); installed payload matched 97/97 files. The installed adapter passed a controlled 12-chunk Responses replay with the pinned host accumulator and assembler. Live upstream SSE was not captured or re-run; the pre-existing 3080 process was not restarted.

## SIWC 0.2.1-rc.3 (2026-11-09): DSH plugin Details file packaging

The DSH 0.2.2-rc.1 Plugins Details panel requires `meta.detail` to be a package-relative Markdown path, not an inline Markdown string. The original en/zh blurbs were moved verbatim into `docs/DETAIL.md` and `docs/DETAIL.zh.md`. Each locale now points to its own file; `package.json.files` ships `docs`. `tests/i18n.test.ts` guards nonempty localized titles/descriptions, relative safe `.md` paths, packaged nonempty files <= 1 MiB, distinct en/zh paths, and rejection of the previous inline value. `0.2.1-rc.3` is only this packaging repair; no SIWC OAuth flow or provider API was changed.

### Dependency boundary (0.2.1-rc.3 tree)

`@deepseek-ai/dsh-atomic-write` and `@deepseek-ai/dsh-home-paths` are host packages, not plugin runtime dependencies. They moved from `dependencies` to `peerDependencies` (`>=0.2.2-rc.1 <0.3.0`) with exact dev pins for this repo's build, leaving `eventsource-parser` and `zod` as the only runtime dependencies. In DSH 0.2.2-rc.1, `dsh-app-boot` depends on `dsh-atomic-write` directly and declares `dsh-home-paths` as a peer, so a live install must confirm the profile root provides `dsh-home-paths`. The bundle row stays `id`/`name` `dsh-chatgpt-siwc` because a patch row's `name` is the npm package name. Gates after the change: `npm run typecheck`, `npm test` (14 files, 282 tests), and `npm pack --dry-run`.

Verification receipts are stored under workspace `evidence/`. The standalone package is native Cordis, independent of the DSH checkout. Live browser locale checks are a release gate.

### Historical context below (v0.2.0)

# Current repository context

Completed standalone provider version 0.2.0. The public SIWC flow, account vault,
provider stream, typed browser account controls and staged settings form are
implemented. The private native Harness port targets a separate API generation.

## Verification

Current gates (integrated): `npm run typecheck`, `npm test` (12 files, 266 tests), `npm pack --dry-run` (89 package files), and `git diff --check` pass.
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

## Security boundaries (lane/security)

The plan access token is attached only to `https://api.openai.com` or a
loopback host (`127.0.0.1`, `[::1]`, `localhost`): `src/api-origin.ts`,
checked at config time (`validateConfig`) and again before every bearer
request (adapter `/responses`, `fetchModels`). Token-bearing and OAuth
control-plane fetches use `redirect: 'error'`. Discovery documents must name
the pinned issuer and keep every endpoint on its origin, else the pinned
fallback endpoints are used. A refresh runs its token exchange inside the
accounts-file writer lock after re-reading the record, and reuses a rotation
another process committed instead of spending the refresh token again
(`refreshAccount`, `AccountsStore.transact`). Residual: a process killed while
holding `accounts.json.lock` leaves an orphan lock that blocks writers until
removed (dsh-atomic-write policy).


## Internationalization

zh/en are first-class: card, OAuth callback pages (Accept-Language), error messages (stable codes, localized text via `localizeError`), CLI (`--lang`, locale env), README.zh-CN.md. `tests/i18n.test.ts` enforces dictionary parity and pins English templates to the strings `src/` mints; rewording an error requires updating `src/locales/errors.ts`.
