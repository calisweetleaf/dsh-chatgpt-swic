# dsh-chatgpt-siwc

English | [简体中文](README.zh-CN.md)

A DeepSeek Harness plugin that serves model calls from **your own ChatGPT
Plus/Pro plan** through the official **Sign in with ChatGPT (SIWC)**
open-source flow: dynamic OAuth registration, then the **public Responses
API** (`https://api.openai.com/v1`) with the issued OAuth access token.

Effectively only an API surface: one LLM provider route, one settings
card, one CLI. Nothing else.

## Boundaries

- **Not the Codex login.** No `app_EMoam…` client, no
  `chatgpt.com/backend-api/codex` endpoint, no `~/.codex/auth.json`, and
  no contact with any Codex harness state. The only token this plugin
  ever touches is the user's own SIWC token, issued to this app.
- **No sub2api, no pooling.** Requests go straight from the adapter to
  the public API with the signed-in account's token. One account's
  client id only ever travels with that account's tokens.
- **Plan usage is a grant, not an identity.** Sign-in alone enables
  nothing: model calls require the plan-usage scopes
  (`chatgpt.tokens.use.direct`) in the account's granted scope set.
  Per-app caps are the user's to manage in
  [ChatGPT settings](https://chatgpt.com/settings/usage).

## How sign-in works

1. **Dynamic registration.** First sign-in starts with
   `client_id=dynamic_agent_client`, this host's stable
   `ext_agent_host_id`, and an `agent_name_hint`. The callback returns
   the issued `oaiapp_…` client id, which is saved with the account and
   used for the code exchange and every later refresh.
2. **Authorization code + PKCE (S256)** against a loopback listener on
   `127.0.0.1` (path `/auth/callback`), fresh `state`/`nonce` per attempt.
   The loopback tab is held open until the flow validates, so it lands on
   the outcome itself — "You're signed in" or the failure — and a first
   sign-in on an install shows the per-app-cap hint exactly once. Every
   control-plane fetch (discovery, token, JWKS, models) is bounded, and
   the held page has its own deadline, so no sign-in can hang a tab.
3. **Code exchange** at the token endpoint with
   `resource=https://api.openai.com/v1`. No client secret.
4. **ID-token verification** (JWKS, issuer, audience, nonce). Granted
   scopes — not identity — decide whether plan usage is on.
5. **Refresh** is standard OAuth, serialized per account, with rotating
   tokens replaced atomically. **Sign-out** revokes at the discovery
   document's revocation endpoint, then clears local tokens.

Endpoints come from the OIDC discovery document
(`https://auth.openai.com/.well-known/openid-configuration`), with the
documented production values as fallback.

Network reachability: the machine running the plugin must reach the
endpoints above over HTTPS — `auth.openai.com` for discovery, token
exchange and JWKS (plus whatever revocation endpoint discovery names), and
`api.openai.com` (or the configured `apiBaseUrl`) for models and
Responses. The browser used for sign-in must reach OpenAI's sign-in pages
and the loopback listener on `127.0.0.1`, so it has to run on the same
machine. The Manage usage link opens `chatgpt.com/settings/usage`.

Accounts live under the Harness home — `chatgpt-siwc/accounts.json`
(`0600`, directory `0700`) plus a non-secret `host.json` holding the
stable host id. Writes are atomic and cross-process locked, so a rotating
refresh token cannot be spent twice by two processes.

## Install & configure

This is an ordinary DeepSeek Harness bundle plugin (host `>=0.2.2-rc.1 <0.3.0`). DSH stays the host; nothing here wraps, forks or launches it.

**From the web client:** Plugins → install by package name, Git URL, tarball or local path → restart when DSH asks → open the plugin's card → **Sign in with ChatGPT**.

**From a terminal** (the profile must precede pnpm arguments):

```bash
dsh plugin --profile web add dsh-chatgpt-siwc            # npm, once published
dsh plugin --profile web add ./dsh-chatgpt-siwc-<ver>.tgz  # a packed tarball
```

Install the packed tarball or the npm package, not a source directory: the published `lib/` needs no build step on the host. A stale copy of this package elsewhere on Node's module path (for example an old symlink in an ancestor `node_modules`) can shadow the installed one; the plugin logs `dsh-chatgpt-siwc <version> loaded from <path>` at startup, and `dsh-chatgpt-siwc doctor` prints the same, so check it after every install.

The bundle patch (`cordis.patch.yml`, referenced from `package.json` as `dsh.bundle.patch`) inserts one row:

```yaml
- insert:
    - id: dsh-chatgpt-siwc
      name: dsh-chatgpt-siwc
      config:
        provider: siwc-dsh-core
        agentNameHint: DSH SIWC
```

Optional config keys: `apiBaseUrl` (only `https://api.openai.com` or a loopback host), `reasoningEffort`, `storePath` (accounts file override), `streamIdleTimeoutMs` (default 120000). Fields are volatile: a committed change applies without a restart, and renaming `provider` re-registers the route atomically.

The plugin has two halves, like every DSH card. The host half (`src/index.ts`) registers the `chatgpt` LLM route and its Models-page directory entry (`nativeAuth: oauth`, so no API-key field), model discovery, and the `siwcAccount` Typert remote; inside an optional `ctx.inject(['settings'])` child it declares `settings.configure({ auto: false }, ctx.fiber)`, because it ships its own page. The browser half (`src/client`, served from the `./client` export via `dsh.client`) registers its card into the `plugins.bundle.config` slot only while `ctx.configForms` serves the `dsh-chatgpt-siwc` namespace. Plugin-list title and description are inline in `locale/en.json` and `locale/zh.json`; each locale’s `meta.detail` points to a packaged Markdown document (`docs/DETAIL.md` for English, `docs/DETAIL.zh.md` for Chinese).

## Account panel

The card on the plugin page shows connection state, plan access, sign-in, reconnect, cancel, refresh and disconnect. The account remote returns identity and plan facts only, never token material. A blocked popup leaves an **Open sign-in page** link.

If sign-in stops, the card names the step it stopped at (for example *exchanging the approval for access*) with a machine code, and the host log carries the same line. The registration ChatGPT issues is saved **before** the one-time code exchange, so a retry reconnects the same app instead of registering another one on your ChatGPT account. The browser and DSH must run on the same machine, since the callback is `http://127.0.0.1:<port>/auth/callback`.

## CLI

Sign-in is interactive and lives outside the model-call path — drive it
with the bundled CLI (or the settings card):

```bash
dsh-chatgpt-siwc login [--no-browser] [--new]   # reuses this host's registration unless --new
dsh-chatgpt-siwc doctor          # token-free JSON: loaded build, accounts file, registrations, lock, port
dsh-chatgpt-siwc status          # token-free public view of the account
dsh-chatgpt-siwc models          # rebuild the account's index; print model IDs, names, and efforts
dsh-chatgpt-siwc logout [--purge]
dsh-chatgpt-siwc help
```

Human output is English or Simplified Chinese: pass `--lang zh` or
`--lang en`, or let the CLI follow `LC_ALL` / `LC_MESSAGES` / `LANG`
(`zh_*` selects Chinese). For example:

```bash
dsh-chatgpt-siwc status --lang zh
LANG=zh_CN.UTF-8 dsh-chatgpt-siwc login
```

JSON output, error codes, model slugs and URLs are never translated, and
no command prints a token.

## Model index and reasoning

The first picker load for an authorized account fetches its catalog from `GET /v1/models`. Later picker loads and model switches read the local account index; they do not refresh the token or query the catalog. Rebuild the default-endpoint index with `dsh-chatgpt-siwc models`, which prints model ID, name, and advertised effort IDs without printing credentials. DSH provider discovery rebuilds the index for the configured endpoint.

Efforts come from the selected model's catalog entry. For example, `ultra` appears only when that model advertises it. When the endpoint returns no effort metadata, the picker does not invent options. A configured effort is sent as selected, or rejected if the cached catalog excludes it; the plugin does not silently downgrade. Reasoning summaries, where supported, are not private model reasoning.

## Wire contract

The adapter (`src/adapter.ts`) posts `serializeRequest` output to
`POST /v1/responses` and translates the SSE stream into harness chunks.
The serializer enforces the plan-usage contract by omission:

- `store: false` and `stream: true` on every request.
- System prompts travel as top-level `instructions`; a system message
  becomes instructions, never an input item.
- Never sent: `max_output_tokens`, `temperature`, `top_p`,
  `prompt_cache_retention`, `truncation`, `metadata`, `user`.
- Function tools only — no hosted tools. Image and file input is refused
  locally (`UNSUPPORTED_CONTENT`) rather than silently dropped.
- Provider `subscription_sharing_*` failures (admission or mid-stream)
  surface as plain-language errors pointing at Manage usage.

## Development

```bash
npm run build      # server (tsconfig.build.json) + client bundle (esbuild → lib/client.js)
npm run typecheck  # both projects, noEmit
npm test           # build, then vitest
```

The client bundle reproduces the harness client-module artifact format
(`window.__ModuleLoader__.load({ id, factory })` wrapping one CJS bundle;
baseline platform modules stay bare requires answered by the module
table) — a package outside the harness repository builds that shape
itself, per the harness cookbook's "adding a settings card".

The test suite covers everything verifiable without an account: the
serializer's wire contract and effort vocabulary, the SSE stream
translation (text, reasoning, tool calls, backfill, mid-stream failures,
abort), ID-token verification (signature, nonce, expiry, audience, key
rotation), the OAuth client end to end against fake endpoints and a real
loopback listener (authorize-URL contract, held outcome page, refresh
rotation and refusal, revocation, discovery), plugin registration with
settings-driven re-registration, the settings card's staged form, and
English/Chinese parity for every dictionary (card, errors, sign-in pages,
CLI) with locale selection from `Accept-Language`, `--lang` and POSIX
locale variables. No
test uses a real endpoint or account; every control-plane fetch in tests
goes through an injected fake.
