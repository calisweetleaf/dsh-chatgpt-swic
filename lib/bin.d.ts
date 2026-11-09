#!/usr/bin/env node
/**
 * Thin CLI over the plugin's programmatic surface — the operator's way
 * to drive sign-in without the harness running:
 *
 *   dsh-chatgpt-siwc login [--name "DSH SIWC"] [--new]
 *   dsh-chatgpt-siwc doctor
 *   dsh-chatgpt-siwc status
 *   dsh-chatgpt-siwc models
 *   dsh-chatgpt-siwc logout [--purge]
 *   dsh-chatgpt-siwc help
 *
 * Every command accepts `--lang zh|en`; without it the language follows
 * `LC_ALL` / `LC_MESSAGES` / `LANG` (`zh_*` → Simplified Chinese), else
 * English. Only human lines are translated: JSON, error codes, model slugs
 * and URLs are printed as-is.
 *
 * `status` prints the token-free public view of the active account;
 * tokens are never printed by any command.
 *
 * @module dsh-chatgpt-siwc/bin
 */
export {};
