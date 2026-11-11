import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it('links package metadata to the canonical GitHub repository', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
    repository: { type: string; url: string }
    homepage: string
    bugs: { url: string }
  }

  expect(manifest.repository).toEqual({
    type: 'git',
    url: 'git+https://github.com/calisweetleaf/dsh-chatgpt-swic.git',
  })
  expect(manifest.homepage).toBe('https://github.com/calisweetleaf/dsh-chatgpt-swic#readme')
  expect(manifest.bugs.url).toBe('https://github.com/calisweetleaf/dsh-chatgpt-swic/issues')
})
