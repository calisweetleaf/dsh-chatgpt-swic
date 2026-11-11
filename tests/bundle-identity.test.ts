/**
 * The bundle patch row must load THIS package: Cordis resolves `name` as the
 * module specifier, so a row naming anything but package.json's `name`
 * makes DSH try to import a package that does not exist.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENT_NAME_HINT } from '../src/constants.ts'

const root = resolve(import.meta.dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name: string; dsh: { bundle: { patch: string } } }
const patch = readFileSync(join(root, pkg.dsh.bundle.patch), 'utf8')

describe('bundle identity', () => {
  it('every inserted row names this package', () => {
    const names = [...patch.matchAll(/^\s*name:\s*(\S+)\s*$/gmu)].map(m => m[1])
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(name).toBe(pkg.name)
  })
  it('the row id is stable and equals the package name', () => {
    expect([...patch.matchAll(/^\s*-\s*id:\s*(\S+)\s*$/gmu)].map(m => m[1])).toEqual([pkg.name])
  })
  it('the consent-screen app name matches the CLI default', () => {
    expect(patch).toContain(`agentNameHint: ${DEFAULT_AGENT_NAME_HINT}`)
  })
})
