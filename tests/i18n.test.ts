/**
 * English + Simplified Chinese: dictionary parity for every dictionary the
 * plugin ships, locale selection (Accept-Language, POSIX env, --lang), the
 * callback pages' `<html lang>`, error localization, and the CLI's human
 * lines. No network, no account, no tokens.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MANAGE_USAGE_URL } from '../src/constants.ts'
import { describeSubscriptionError, errorText, localizeError, localizeMessage, SiwcError, subscriptionErrorKey } from '../src/errors.ts'
import { formatMessage, htmlLang, localeFromAcceptLanguage, localeFromEnv } from '../src/i18n.ts'
import { errorEn, errorZh, matchErrorMessage } from '../src/locales/errors.ts'
import { pageEn, pageZh } from '../src/locales/pages.ts'
import { cliEn, cliZh, localizeReporterLine, reporterEn, reporterZh, resolveCliLanguage, usageLines } from '../src/locales/cli.ts'
import { cardEn, cardZh, en as cardDictEn, errorLocaleKey, zh as cardDictZh } from '../src/client/locales.ts'
import { accountErrorText } from '../src/client/card.tsx'
import { messageOf } from '../src/client/account-controller.ts'
import { errorPage, pageLocale, successPage, waitingPage } from '../src/pages.ts'

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/gu)].map(m => m[1]!).sort()

const DICTIONARIES: Record<string, { en: Record<string, string>; zh: Record<string, string> }> = {
  'client card (registered)': { en: cardDictEn, zh: cardDictZh },
  'client card (own copy)': { en: cardEn, zh: cardZh },
  errors: { en: errorEn, zh: errorZh },
  'callback pages': { en: pageEn, zh: pageZh },
  cli: { en: cliEn, zh: cliZh },
  'cli sign-in progress': { en: reporterEn, zh: reporterZh },
}

describe('dictionary parity', () => {
  for (const [name, { en, zh }] of Object.entries(DICTIONARIES)) {
    it(`${name}: zh and en carry identical keys, no empty values, same placeholders`, () => {
      expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en)) {
        expect(en[key]!.trim(), `en.${key}`).not.toBe('')
        expect(zh[key]!.trim(), `zh.${key}`).not.toBe('')
        expect(placeholders(zh[key]!), `placeholders of ${key}`).toEqual(placeholders(en[key]!))
      }
    })
  }

  it('zh copy is actually Chinese (every value that is not a bare brand name or command line contains CJK)', () => {
    const brandOnly = new Set(['titleSuffix'])
    for (const [name, { en, zh }] of Object.entries(DICTIONARIES)) {
      for (const key of Object.keys(en)) {
        if (brandOnly.has(key) || /^\s*(status|models)\s/u.test(en[key]!)) continue
        expect(/[\u4e00-\u9fff]/u.test(zh[key]!), `${name}: zh.${key} = ${zh[key]}`).toBe(true)
      }
    }
  })

  it('zh copy uses 你 (not 您) and 账户 (not 帐户), per the glossary', () => {
    for (const { zh } of Object.values(DICTIONARIES)) {
      for (const value of Object.values(zh)) {
        expect(value).not.toMatch(/您|帐户/u)
      }
    }
  })

  it('the card registers every error key under its err-prefixed name', () => {
    for (const key of Object.keys(errorEn) as (keyof typeof errorEn)[]) {
      expect(cardDictEn[errorLocaleKey(key)]).toBe(errorEn[key])
      expect(cardDictZh[errorLocaleKey(key)]).toBe(errorZh[key])
    }
  })
})

describe('the English error templates reproduce the strings other modules mint', () => {
  // Keys whose English text originates in the dictionary itself (rendered by errors.ts or the card).
  const dictionaryNative = new Set<string>([
    'planUsageLimitExceeded', 'planUsageUnavailable', 'planNotEntitled', 'planNotGranted',
    'planRefused', 'planRefusedWithDetail', 'planRequestFailed', 'loginInProgressShort', 'accountRequestFailed',
  ])
  const srcRoot = resolve(import.meta.dirname, '../src')
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) { if (entry !== 'locales') walk(path) } else if (/\.tsx?$/u.test(entry)) files.push(path)
    }
  }
  walk(srcRoot)
  const source = files.map(file => readFileSync(file, 'utf8')).join('\n').replace(/\\'/gu, "'")
  for (const [key, template] of Object.entries(errorEn)) {
    if (dictionaryNative.has(key)) continue
    it(key, () => {
      for (const segment of template.split(/\{\w+\}/u).filter(part => part.length >= 4)) {
        expect(source.includes(segment), `"${segment}" no longer appears in src/ — update src/locales/errors.ts`).toBe(true)
      }
    })
  }
})

describe('Accept-Language selection', () => {
  const cases: [string | undefined, 'zh' | 'en'][] = [
    [undefined, 'en'],
    ['', 'en'],
    ['zh', 'zh'],
    ['zh-CN', 'zh'],
    ['zh-Hans', 'zh'],
    ['zh-Hans-CN', 'zh'],
    ['zh-SG', 'zh'],
    ['zh_CN', 'zh'],
    ['ZH-cn', 'zh'],
    ['zh-TW', 'zh'], // Traditional falls back to the Simplified copy (documented)
    ['zh-HK,zh;q=0.9', 'zh'],
    ['en-US,en;q=0.9', 'en'],
    ['zh-CN,zh;q=0.9,en;q=0.8', 'zh'],
    ['en;q=0.5,zh-CN;q=0.9', 'zh'],
    ['zh-CN;q=0.4,en-GB;q=0.8', 'en'],
    ['fr-FR,fr;q=0.9,zh;q=0.8,en;q=0.7', 'zh'],
    ['fr-FR,de;q=0.9', 'en'],
    ['zh;q=0, en', 'en'],
    ['zh;q=0', 'en'],
    ['*', 'en'],
    ['*;q=1,zh;q=0.1', 'zh'],
    ['zh-CN;q=garbage,en', 'en'],
    ['en,zh', 'en'],
  ]
  for (const [header, expected] of cases) {
    it(`${JSON.stringify(header)} → ${expected}`, () => {
      expect(localeFromAcceptLanguage(header)).toBe(expected)
      expect(pageLocale(header)).toBe(expected)
    })
  }
  it('accepts the string[] form Node may hand over', () => {
    expect(localeFromAcceptLanguage(['fr', 'zh-CN;q=0.5'])).toBe('zh')
  })
})

describe('callback pages', () => {
  it('default to English with lang="en" (back-compat for existing call sites)', () => {
    for (const html of [waitingPage(), successPage('a@b.c', true, true), errorPage('x')]) {
      expect(html).toMatch(/<html lang="en">/u)
    }
    expect(successPage(undefined, true, false)).toContain("You're signed in")
    expect(errorPage('x')).toContain("Sign-in didn't complete")
  })

  it('render Chinese with lang="zh-CN" when zh is active', () => {
    expect(htmlLang('zh')).toBe('zh-CN')
    const waiting = waitingPage('zh')
    expect(waiting).toContain('<html lang="zh-CN">')
    expect(waiting).toContain(pageZh.waitingHeading)
    expect(waiting).toContain(`aria-label="${pageZh.waitingAria}"`)
    expect(waiting).toContain(`<title>${pageZh.waitingTitle} — DeepSeek Harness</title>`)
    const granted = successPage('user@example.com', true, true, 'zh')
    expect(granted).toContain('<html lang="zh-CN">')
    expect(granted).toContain(pageZh.successHeading)
    expect(granted).toContain(pageZh.planActiveLead)
    expect(granted).toContain(pageZh.firstTimeHint)
    expect(granted).not.toContain("You're signed in")
    const identityOnly = successPage(undefined, false, true, 'zh')
    expect(identityOnly).toContain(pageZh.planMissing)
    expect(identityOnly).not.toContain(pageZh.firstTimeHint)
  })

  it('re-render the flow\'s own English error text in Chinese, and keep unknown text as given', () => {
    const known = errorPage('Sign-in callback state did not match this attempt. Nothing was exchanged.', 'zh')
    expect(known).toContain(errorZh.callbackStateMismatch)
    const param = errorPage('Authorization failed: server_error', 'zh')
    expect(param).toContain('授权失败：server_error')
    const unknown = errorPage('some provider sentence', 'zh')
    expect(unknown).toContain('some provider sentence')
    expect(unknown).toContain(pageZh.errorHeading)
  })

  it('escape interpolations in every locale', () => {
    for (const locale of ['en', 'zh'] as const) {
      const html = errorPage('Authorization failed: <script>alert("x")</script>', locale)
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
      expect(successPage('<b>@x', true, false, locale)).toContain('&lt;b&gt;@x')
    }
  })

  it('treat an unsupported locale from an untyped caller as English', () => {
    expect(waitingPage('fr' as never)).toContain('<html lang="en">')
  })
})

describe('errors', () => {
  it('keep English .message and the stable code, and recover the key from English text', () => {
    const err = new SiwcError('ID token is expired', 'INVALID_ID_TOKEN')
    expect(err.message).toBe('ID token is expired')
    expect(err.code).toBe('INVALID_ID_TOKEN')
    expect(err.key).toBe('idTokenExpired')
    expect(localizeError(err, 'zh')).toBe(errorZh.idTokenExpired)
    expect(localizeError(err, 'en')).toBe('ID token is expired')
  })

  it('carry params recovered from the English text', () => {
    const err = new SiwcError('model catalog request failed (HTTP 503)', 'HTTP_503')
    expect(err.key).toBe('modelCatalogHttp')
    expect(err.params).toEqual({ status: '503' })
    expect(localizeError(err, 'zh')).toBe('模型目录请求失败（HTTP 503）')
  })

  it('fromKey renders English .message and localizes by key', () => {
    const err = SiwcError.fromKey('unknownAccount', 'UNKNOWN_ACCOUNT', { clientId: 'oaiapp_x' })
    expect(err.message).toBe('no registration for client id oaiapp_x')
    expect(err).toBeInstanceOf(Error)
    expect(localizeError(err, 'zh')).toBe('没有 client id 为 oaiapp_x 的注册信息')
  })

  it('pass unrecognized text through unchanged', () => {
    const err = new SiwcError('something only the provider says', 'X')
    expect(err.key).toBeUndefined()
    expect(localizeError(err, 'zh')).toBe('something only the provider says')
    expect(localizeError(new Error('plain'), 'zh')).toBe('plain')
    expect(localizeError('just a string', 'zh')).toBe('just a string')
  })

  it('localize any error-like value carrying a key (e.g. an RPC-decoded error)', () => {
    expect(localizeError({ key: 'sessionExpired', message: 'x' }, 'zh')).toBe(errorZh.sessionExpired)
    expect(localizeError({ key: 'toString', message: 'not a key' }, 'zh')).toBe('not a key')
  })

  it('describeSubscriptionError keeps its English output and adds zh', () => {
    const enText = describeSubscriptionError('subscription_sharing_usage_limit_exceeded')
    expect(enText).toBe(`ChatGPT plan usage limit reached for this app or for your plan. Review the applicable limit under Manage usage: ${MANAGE_USAGE_URL}`)
    const zhText = describeSubscriptionError('subscription_sharing_usage_limit_exceeded', undefined, 'zh')
    expect(zhText).toContain('管理用量')
    expect(zhText).toContain(MANAGE_USAGE_URL)
    expect(describeSubscriptionError('subscription_sharing_new_thing', 'why', 'zh')).toContain('提供方详情：why')
    expect(describeSubscriptionError(undefined, 'raw detail', 'zh')).toBe('raw detail')
    expect(describeSubscriptionError(undefined, undefined, 'zh')).toBe(errorZh.planRequestFailed)
    expect(localizeMessage(describeSubscriptionError('subscription_sharing_other', 'd'), 'zh'))
      .toBe(describeSubscriptionError('subscription_sharing_other', 'd', 'zh'))
    expect(subscriptionErrorKey('subscription_sharing_plan_not_granted')?.key).toBe('planNotGranted')
  })

  it('prefer the longer template when a shorter one is its prefix', () => {
    const text = describeSubscriptionError('subscription_sharing_x', 'detail here')
    expect(matchErrorMessage(text)?.key).toBe('planRefusedWithDetail')
    expect(errorText('planRefused', 'zh', { code: 'c', url: 'u' })).toBe('ChatGPT 套餐用量被拒绝（c）。请在“管理用量”中查看你的套餐和此应用的上限：u')
  })

  it('formatMessage leaves unknown placeholders visible', () => {
    expect(formatMessage('a {x} {y}', { x: 1 })).toBe('a 1 {y}')
  })
})

describe('client card errors', () => {
  const zhT = (key: keyof typeof cardDictZh, params?: Record<string, unknown>) =>
    formatMessage(cardDictZh[key], params as Record<string, string> | undefined)

  it('maps the in-progress RPC failure and empty failures to keys', () => {
    expect(messageOf(new Error('LOGIN_IN_PROGRESS: a ChatGPT sign-in is already in progress')))
      .toMatchObject({ message: 'A sign-in is already in progress.', messageKey: 'loginInProgressShort' })
    expect(messageOf({})).toMatchObject({ message: 'Account request failed. Try again.', messageKey: 'accountRequestFailed' })
  })

  it('renders the plugin\'s own errors in the active locale through t', () => {
    const state = messageOf(new Error('ChatGPT sign-out is still in progress'))
    expect(accountErrorText(zhT, state)).toBe(errorZh.signOutStillInProgress)
    const carried = messageOf({ message: 'whatever', key: 'unknownAccount', params: { clientId: 'oaiapp_1' } })
    expect(accountErrorText(zhT, carried)).toBe('没有 client id 为 oaiapp_1 的注册信息')
  })

  it('shows unknown error text as given', () => {
    const state = messageOf(new Error('temporary connection failure'))
    expect(state.messageKey).toBeUndefined()
    expect(accountErrorText(zhT, state)).toBe('temporary connection failure')
  })
})

describe('CLI language', () => {
  it('prefers --lang, then LC_ALL, LC_MESSAGES, LANG', () => {
    expect(localeFromEnv({})).toBe('en')
    expect(localeFromEnv({ LANG: 'zh_CN.UTF-8' })).toBe('zh')
    expect(localeFromEnv({ LANG: 'zh_TW.UTF-8' })).toBe('zh')
    expect(localeFromEnv({ LANG: 'en_US.UTF-8' })).toBe('en')
    expect(localeFromEnv({ LANG: 'C.UTF-8' })).toBe('en')
    expect(localeFromEnv({ LC_ALL: 'en_US.UTF-8', LANG: 'zh_CN.UTF-8' })).toBe('en')
    expect(localeFromEnv({ LC_ALL: '', LC_MESSAGES: 'zh_CN.UTF-8', LANG: 'en_US' })).toBe('zh')
    expect(resolveCliLanguage(['status', '--lang', 'zh'], { LANG: 'en_US.UTF-8' })).toEqual({ locale: 'zh', args: ['status'] })
    expect(resolveCliLanguage(['--lang=en', 'login', '--no-browser'], { LANG: 'zh_CN.UTF-8' })).toEqual({ locale: 'en', args: ['login', '--no-browser'] })
    expect(resolveCliLanguage(['status'], { LANG: 'zh_CN.UTF-8' })).toEqual({ locale: 'zh', args: ['status'] })
    expect(resolveCliLanguage(['--lang', 'zh-CN'], {})).toEqual({ locale: 'zh', args: [] })
    expect(resolveCliLanguage(['--lang', 'fr', 'status'], {})).toEqual({ locale: 'en', args: ['status'], invalid: 'fr' })
  })

  it('re-renders sign-in progress lines and leaves the authorization URL alone', () => {
    expect(localizeReporterLine('Signed in as user@example.com.', 'zh')).toBe('已登录为 user@example.com。')
    expect(localizeReporterLine('Signed in.', 'zh')).toBe('已登录。')
    expect(localizeReporterLine('Listening for the ChatGPT callback on 127.0.0.1 (path /auth/callback).', 'zh'))
      .toBe('正在 127.0.0.1 上等待 ChatGPT 回调（路径 /auth/callback）。')
    const url = 'https://auth.openai.com/oauth/authorize?client_id=dynamic_agent_client&state=s'
    expect(localizeReporterLine(url, 'zh')).toBe(url)
    expect(localizeReporterLine('Signed in.', 'en')).toBe('Signed in.')
    expect(usageLines('zh')[0]).toBe('用法：dsh-chatgpt-siwc <login|status|models|logout|doctor> [选项]')
  })
})

describe('CLI (built lib/bin.js)', () => {
  const bin = resolve(import.meta.dirname, '../lib/bin.js')
  const store = join(mkdtempSync(join(tmpdir(), 'siwc-i18n-')), 'accounts.json')
  const run = (args: string[], env: Record<string, string>) => spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env['PATH'] ?? '', HOME: tmpdir(), ...env },
  })

  it('prints help in Chinese from LANG, in English with --lang en', () => {
    const zh = run(['help'], { LANG: 'zh_CN.UTF-8' })
    expect(zh.status).toBe(0)
    expect(zh.stdout).toContain('用法：dsh-chatgpt-siwc')
    expect(zh.stdout).toContain('--lang <zh|en>')
    const en = run(['help', '--lang', 'en'], { LANG: 'zh_CN.UTF-8' })
    expect(en.stdout).toContain('usage: dsh-chatgpt-siwc')
  })

  it('keeps exit 1 and stderr usage for an unknown command', () => {
    const result = run(['bogus', '--lang', 'zh'], {})
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('用法：')
  })

  it('rejects an unsupported --lang value', () => {
    const result = run(['status', '--lang', 'fr'], { LANG: 'en_US.UTF-8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('--lang expects zh or en, got "fr"')
  })

  it('status: localized "not signed in" line', () => {
    const zh = run(['status', '--store', store, '--lang', 'zh'], {})
    expect(zh.status).toBe(0)
    expect(zh.stdout.trim()).toBe('未登录。请运行：dsh-chatgpt-siwc login')
    const en = run(['status', '--store', store], { LC_ALL: 'C' })
    expect(en.stdout.trim()).toBe('not signed in. Run: dsh-chatgpt-siwc login')
  })

  it('models: the error keeps its stable code and localizes its message', () => {
    const zh = run(['models', '--store', store], { LC_ALL: 'zh_CN.UTF-8' })
    expect(zh.status).toBe(1)
    expect(zh.stderr.trim()).toBe(`MISSING_CREDENTIAL: ${errorZh.notSignedIn}`)
  })

  it('the bin is executable by node directly (sanity)', () => {
    expect(() => execFileSync(process.execPath, ['--check', bin])).not.toThrow()
  })
})

describe('plugin details manifest', () => {
  const root = resolve(import.meta.dirname, '..')
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { files: string[] }
  const detailPathValid = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || /^[A-Za-z][A-Za-z\d+.-]*:/u.test(value)) return false
    if (!/\.(md|markdown)$/iu.test(value)) return false
    return value.split('/').every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
  }
  const locale = (lang: 'en' | 'zh') => JSON.parse(readFileSync(join(root, 'locale', `${lang}.json`), 'utf8')) as {
    meta: { title: unknown; description: unknown; detail: unknown }
  }

  for (const [lang, expected] of [['en', 'docs/DETAIL.md'], ['zh', 'docs/DETAIL.zh.md']] as const) {
    it(`${lang} declares an actual local Markdown detail document`, () => {
      const { title, description, detail } = locale(lang).meta
      expect(typeof title).toBe('string')
      expect((title as string).trim().length).toBeGreaterThan(0)
      expect(typeof description).toBe('string')
      expect((description as string).trim().length).toBeGreaterThan(0)
      expect(detailPathValid(detail)).toBe(true)
      expect(detail).toBe(expected)
      if (!detailPathValid(detail)) return
      const stat = statSync(join(root, detail))
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(0)
      expect(stat.size).toBeLessThanOrEqual(1024 * 1024)
    })
  }

  it('ships the detail directory and keeps both locales distinct', () => {
    expect(manifest.files).toContain('docs')
    expect(locale('en').meta.detail).not.toBe(locale('zh').meta.detail)
  })

  it('rejects the former inline Markdown and unsafe path forms', () => {
    for (const invalid of ['## Sign in with ChatGPT', 'https://example.com/DETAIL.md', '../DETAIL.md', './DETAIL.md', '/DETAIL.md', 'docs//DETAIL.md', 'docs/../DETAIL.md', 'docs\\DETAIL.md', 'docs/DETAIL.txt', '']) {
      expect(detailPathValid(invalid), invalid).toBe(false)
    }
  })
})

describe('README parity', () => {
  const root = resolve(import.meta.dirname, '..')
  const enDoc = readFileSync(join(root, 'README.md'), 'utf8')
  const zhDoc = readFileSync(join(root, 'README.zh-CN.md'), 'utf8')
  const fences = (doc: string) => [...doc.matchAll(/```(\w*)\n([\s\S]*?)```/gu)]
    .map(m => ({ lang: m[1], lines: m[2]!.split('\n').map(line => line.replace(/\s+#.*$/u, '').trimEnd()) }))

  it('both carry the language switcher on top', () => {
    expect(enDoc.split('\n')[2]).toBe('English | [简体中文](README.zh-CN.md)')
    expect(zhDoc.split('\n')[2]).toBe('[English](README.md) | 简体中文')
  })

  it('same section count and identical code blocks (comments aside)', () => {
    expect(zhDoc.match(/^## /gmu)?.length).toBe(enDoc.match(/^## /gmu)?.length)
    expect(fences(zhDoc)).toEqual(fences(enDoc))
  })
})
