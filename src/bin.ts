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

import { DEFAULT_AGENT_NAME_HINT } from './constants.ts'
import { localizeError, SiwcError } from './errors.ts'
import type { Locale } from './i18n.ts'
import { cliText, localizeReporterLine, resolveCliLanguage, usageLines } from './locales/cli.ts'
import { ensureAccessToken, fetchModels, login, logout, modelCatalogEndpoint } from './oauth.ts'
import type { LoginReporter } from './oauth.ts'
import { AccountsStore, isSignedIn, planGranted, publicView } from './store.ts'
import { doctorReport } from './doctor.ts'

const language = resolveCliLanguage(process.argv.slice(2), process.env)
const locale: Locale = language.locale

const reporter: LoginReporter = {
  line: (text) => console.log(localizeReporterLine(text, locale)),
}

function flagValue(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag)
  return at >= 0 ? args[at + 1] : undefined
}

function printUsage(write: (line: string) => void): void {
  for (const line of usageLines(locale)) write(line)
}

async function main(argv: string[]): Promise<void> {
  if (language.invalid !== undefined) {
    console.error(cliText('badLang', locale, { value: language.invalid }))
    printUsage(line => console.error(line))
    process.exitCode = 1
    return
  }
  const [command, ...rest] = argv
  const store = new AccountsStore(flagValue(rest, '--store'))

  switch (command) {
    case 'login': {
      // Reuse the registration this host already holds (the official devkit
      // does the same); only --new or an empty store registers another app.
      const reuse = rest.includes('--new') ? undefined : (await store.active().catch(() => undefined))?.client_id
      const result = await login({
        store,
        agentNameHint: flagValue(rest, '--name') ?? DEFAULT_AGENT_NAME_HINT,
        clientId: flagValue(rest, '--client-id') ?? reuse,
        openBrowser: !rest.includes('--no-browser'),
        reporter,
      })
      console.log(JSON.stringify(publicView(result.account), null, 2))
      console.log(cliText(result.planGranted ? 'loginPlanGranted' : 'loginPlanNotGranted', locale))
      if (result.firstRegistration) {
        console.log(cliText('firstSignIn', locale))
      }
      break
    }
    case 'status': {
      const active = await store.active()
      if (!isSignedIn(active)) {
        console.log(cliText('notSignedIn', locale))
        break
      }
      console.log(JSON.stringify(publicView(active), null, 2))
      console.log(cliText(planGranted(active) ? 'statusPlanGranted' : 'statusPlanNotGranted', locale))
      break
    }
    case 'models': {
      const { account, accessToken } = await ensureAccessToken(store)
      const models = await fetchModels(accessToken)
      await store.saveModels(account, modelCatalogEndpoint(), models)
      for (const model of models) console.log(`${model.slug}\t${model.displayName}\t${model.reasoningEfforts?.join(',') ?? '-'}`)
      break
    }
    case 'logout': {
      const result = await logout(store, { purge: rest.includes('--purge') })
      console.log(
        !result.revoked
          ? cliText('signedOutLocal', locale)
          : result.email
            ? cliText('signedOutRevokedEmail', locale, { email: result.email })
            : cliText('signedOutRevoked', locale),
      )
      break
    }
    case 'doctor': {
      console.log(JSON.stringify(await doctorReport(store), null, 2))
      break
    }
    case 'help':
    case '--help':
    case '-h': {
      printUsage(line => console.log(line))
      break
    }
    default: {
      printUsage(line => console.error(line))
      process.exitCode = 1
    }
  }
}

main(language.args).catch((err: unknown) => {
  if (err instanceof SiwcError) {
    console.error(`${err.code}: ${localizeError(err, locale)}`)
  } else {
    console.error(localizeError(err instanceof Error ? err : String(err), locale))
  }
  process.exitCode = 1
})
