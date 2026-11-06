/** @file Bundle all engine, game, UI and procedural assets into the requested portable HTML. */
import { build, type Rollup } from 'vite';
import { format, resolveConfig } from 'prettier';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inlineBuild, externalRefs, ONE_FILE_NOTE } from '../../../tools/lib/oneFile';
const root = process.cwd();
const interview = JSON.parse(readFileSync(resolve('..', 'exit-interview.json'), 'utf8'));
const about =
  '/** @file Catalogue and interview data embedded from the root exit interview. */\nexport const interview = ' +
  JSON.stringify(interview, null, 2) +
  ' as const;\n';
writeFileSync(
  'labs/game/data/about.ts',
  await format(about, { ...(await resolveConfig('labs/game/data/about.ts')), parser: 'typescript' }),
);
const { base } = JSON.parse(readFileSync('identity.json', 'utf8')) as { base: string };
const result = await build({
  root,
  configFile: false,
  logLevel: 'error',
  base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: {
    write: false,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: Infinity,
    rollupOptions: { input: resolve('labs/game/index.html'), output: { inlineDynamicImports: true } },
  },
});
const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
const files: Record<string, string> = {};
let html = '';
for (const item of outputs.flatMap((o) => o.output)) {
  const value =
    item.type === 'chunk'
      ? item.code
      : typeof item.source === 'string'
        ? item.source
        : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = value;
  else files[item.fileName] = value;
}
html = inlineBuild(html, files).replace(
  /<script type="module">([\s\S]*?)<\/script>/g,
  (_match, code: string) => `<script type="module">if(!globalThis.__unsupported){${code}}<` + '/script>',
);
html = html.replace(
  ONE_FILE_NOTE,
  '<!-- Trauma Coast: Second Sight. Original game; my-3dge, three.js MIT; Rapier and stdlib Apache-2.0. -->',
);
if (externalRefs(html).length) throw new Error('Bundle has external dependencies');
writeFileSync(resolve('..', `${base}.html`), html);
console.log(`Bundled ${html.length} characters`);
