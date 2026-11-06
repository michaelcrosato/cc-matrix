/**
 * @file Build Trauma Compass as one HTML file. Vite inlines the module. The hub client is already the first script.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Rollup } from 'vite';
import { externalRefs, inlineBuild, ONE_FILE_NOTE } from '../../../tools/lib/oneFile';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const page = join(root, 'labs/game/index.html');
const out = join(root, '..', 'Trauma-Compass-Trauma-Center-Second-Opinion-grok-4.7-xhigh-20261104-224731.html');

const { build } = await import('vite');
const result = await build({
  root,
  configFile: false,
  logLevel: 'warn',
  base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: {
    write: false,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: Infinity,
    rollupOptions: { input: page, output: { inlineDynamicImports: true } },
  },
});

const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
const files: Record<string, string> = {};
let html: string | undefined;
for (const item of outputs.flatMap((output) => output.output)) {
  const text =
    item.type === 'chunk'
      ? item.code
      : typeof item.source === 'string'
        ? item.source
        : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text;
  else files[item.fileName] = text;
}
if (!html) throw new Error('Vite wrote no page');
const built = inlineBuild(html, files).replace(
  ONE_FILE_NOTE,
  '<!-- Trauma Compass, one self-contained page. Open it in a browser with WebGPU. -->',
);
const refs = externalRefs(built);
if (refs.length) throw new Error(`external refs: ${refs.join(', ')}`);
writeFileSync(out, built);
console.log(`${out} ${built.length}`);
