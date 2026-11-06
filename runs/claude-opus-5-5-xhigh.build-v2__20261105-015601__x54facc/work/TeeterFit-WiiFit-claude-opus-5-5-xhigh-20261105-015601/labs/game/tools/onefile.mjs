/**
 * @file Bundles the game into one HTML file. `node x html` is engine-only, so the game carries this. The session client
 * goes in as text, so no formatter ever touches it: the hub rejects an edited copy by SHA-256.
 * Usage, from the dev folder: node labs/game/tools/onefile.mjs <output.html>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';

const root = process.cwd();
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
    rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } },
  },
});
const files = {};
let html = '';
for (const item of (Array.isArray(result) ? result : [result]).flatMap((out) => out.output)) {
  const text =
    item.type === 'chunk'
      ? item.code
      : typeof item.source === 'string'
        ? item.source
        : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text;
  else files[item.fileName] = text;
}
const find = (ref) => files[Object.keys(files).find((name) => ref.endsWith(name))];
const LOADED =
  /<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g;
const inlined = html.replace(LOADED, (_tag, script, style) => {
  if (style) return `<style>${find(style)}</style>`;
  const code = find(script).replaceAll('</script', '<\\/script');
  if (code.includes('<!--')) throw new Error(`${script} holds "<!--": write it apart in the source`);
  return `<script type="module">${code}</script>`;
});
const client = readFileSync('labs/game/hub/session-client.txt', 'utf8');
const tags = readFileSync('labs/game/hub/tags.html', 'utf8');
const output = inlined.replace(
  '<meta charset="utf-8" />',
  () => `<meta charset="utf-8" />\n<script>\n${client}</script>\n${tags}`,
);
writeFileSync(resolve(process.argv[2]), output);
console.log(`${process.argv[2]}: ${(output.length / 1e6).toFixed(1)} MB`);
