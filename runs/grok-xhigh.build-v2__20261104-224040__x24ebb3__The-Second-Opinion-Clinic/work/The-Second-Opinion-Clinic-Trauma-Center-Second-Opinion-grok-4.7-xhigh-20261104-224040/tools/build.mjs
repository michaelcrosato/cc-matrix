/** Bundle the clinic into one HTML page. The session client is copied verbatim. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_BASE, TAGLINE, TITLE } from '../src/core/meta.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

execFileSync('esbuild', [
  'game.js',
  '--bundle',
  '--format=esm',
  '--platform=browser',
  '--target=es2022',
  '--outfile=dist/bundle.js',
], { cwd: root, stdio: 'inherit' });

const js = readFileSync(join(dist, 'bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync(join(root, 'vendor', 'session.js'), 'utf8');
const pack = readFileSync(join(root, 'packs', 'kenney-furniture.json')).toString('base64');
const icon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="#1a1218" width="16" height="16"/><path stroke="#e8443a" stroke-width="2" d="M8 2v12M2 8h12"/></svg>',
);
const description = 'A rainy harbour hospital where telling the truth is the first cut. Keep the patient alive, close the strain, and top the team score.';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE} — ${TAGLINE}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#1a1218">
<link rel="icon" href="${icon}">
<meta name="hub:type" content="Game">
<meta name="hub:source" content="Trauma Center: Second Opinion">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Keep the patient alive and top the team score">
<meta name="hub:session-howto" content="Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.">
<style>html,body{margin:0;height:100%;background:#1a1218}#app{position:fixed;inset:0}</style>
</head>
<body>
<div id="app"></div>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">
${js}
</script>
</body>
</html>
`;

writeFileSync(join(dist, 'game.html'), html);
const handed = join(root, '..', `${FILE_BASE}.html`);
writeFileSync(handed, html);
for (const name of ['harness.html', 'bridge.js', 'round.js']) {
  copyFileSync(join(root, 'vendor', name), join(dist, name));
}
console.log(handed);
