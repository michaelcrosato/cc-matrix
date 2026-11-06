/** @file scripts/bundle.mjs: builds the deliverable, one self-contained page named after the dev folder, in the folder above it, with the hub client first in its head. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { build } from 'vite';

const root = process.cwd();
const HUB_METAS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Burn the depot, then get out alive together">
<meta name="hub:session-howto" content="Stick or WASD moves, R2 or click fires, Square or E uses">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">`;
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
let html;
for (const item of [result].flat().flatMap((output) => output.output)) {
  const text =
    item.type === 'chunk'
      ? item.code
      : typeof item.source === 'string'
        ? item.source
        : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text;
  else files[item.fileName] = text;
}
const find = (ref) =>
  files[Object.keys(files).find((file) => ref.endsWith(`/${file}`) || ref === file || ref === `./${file}`)];
html = html.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_tag, script, style) => {
    if (style) return `<style>${find(style)}</style>`;
    const code = find(script).replaceAll('</script', '<\\/script');
    if (code.includes('<!--')) throw new Error('a script holds <!--: split it in the source');
    return `<script type="module">${code}</script>`;
  },
);
const session = readFileSync('.cache/hub/session.js', 'utf8'); // unmodified: the hub replaces an unmodified copy with each new version
const exitFile = `../${/save these answers as (\S+\.json)/.exec(readFileSync('../TASK.md', 'utf8'))[1]}`; // About's one source of truth
const about = existsSync(exitFile) ? readFileSync(exitFile, 'utf8') : 'null';
const parts = [
  `<meta charset="utf-8" />`,
  `<script>${session}</script>`,
  HUB_METAS,
  `<script>window.__about = ${JSON.stringify(JSON.parse(about)).replaceAll('</script', '<\\/script')};</script>`,
];
html = html.replace('<meta charset="utf-8" />', () => parts.join('\n'));
writeFileSync(`../${basename(root)}.html`, html);
