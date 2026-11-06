/** @file Packages the game as one portable HTML file. */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';

const root = process.cwd();
const result = await build({ root, configFile: false, logLevel: 'warn', base: './', build: { write: false, modulePreload: false, cssCodeSplit: false, rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } } } });
let html = '';
const files = {};
for (const entry of (Array.isArray(result) ? result : [result]).flatMap((output) => output.output)) {
  const text = entry.type === 'chunk' ? entry.code : typeof entry.source === 'string' ? entry.source : new TextDecoder().decode(entry.source);
  if (entry.fileName.endsWith('.html')) html = text;
  else files[entry.fileName] = text;
}
function contents(reference) {
  const name = Object.keys(files).find((file) => reference.endsWith(file));
  if (!name) throw new Error(`Missing build asset: ${reference}`);
  return files[name];
}
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_tag, script, style) => style ? `<style>${contents(style)}</style>` : `<script type="module">${contents(script).replaceAll('</script', '<\\/script')}</script>`);
if (!html || /(?:src|href)="\.\/assets\//.test(html)) throw new Error('Build is not self-contained');
writeFileSync(resolve(process.argv[2]), html);
