/** @file Bundles the full game and unmodified Hub client into one offline HTML file. */
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
const loaded =
  /<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g;
const inlined = html.replace(loaded, (_tag, script, style) => {
  if (style) return `<style>${find(style)}</style>`;
  const code = find(script).replaceAll('</script', '<\\/script');
  if (code.includes('<!--')) throw new Error('A script contains an HTML comment opener. Write its source apart.');
  return `<script type="module">${code}</script>`;
});
const client = readFileSync('labs/game/hub/session-client.txt', 'utf8');
const tags = readFileSync('labs/game/hub/tags.html', 'utf8');
const target = resolve(process.argv[2] ?? '../Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html');
writeFileSync(
  target,
  inlined.replace('<meta charset="utf-8" />', () => `<meta charset="utf-8" />\n<script>\n${client}</script>\n${tags}`),
);
console.log(`Built ${target}`);
