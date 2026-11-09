#!/usr/bin/env node
/**
 * Build the browser half into the harness client-module artifact: one CJS
 * bundle wrapped in the `window.__ModuleLoader__.load({ id, factory })`
 * handoff the client module system executes (see the harness cookbook
 * "adding a settings card" — a package outside the harness repository
 * reproduces that artifact format itself). Baseline platform modules (React,
 * cordis, the client store, the shared primitives) stay bare requires the
 * module table answers; everything else inlines. The CSS rides in as text
 * and is injected at materialization, so the one served `client.js` file is
 * the entire artifact.
 */
import { build } from 'esbuild'

const result = await build({
  metafile: true,
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: 'external',
  legalComments: 'linked',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  external: [

    'zod',
    'react',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  loader: { '.css': 'text' },
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-chatgpt-siwc", factory: (require) => {\n'
      + 'var module = { exports: {} }; var exports = module.exports;',
  },
  footer: { js: 'return module.exports; } });' },
})

// Fail closed if a dependency starts requiring a module the host cannot provide.
const allowed = new Set(['zod', 'react', 'react/jsx-runtime', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-primitives'])
for (const output of Object.values(result.metafile.outputs)) {
  for (const item of output.imports) if (item.external && !allowed.has(item.path)) throw new Error(`Unexpected client external: ${item.path}`)
}
