// node tools/build.mjs: bundle everything into one html.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { OUTPUT, TITLE, TAGLINE } from '../src/core/meta.js';
const titleCase = (s) => s.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
mkdirSync('dist', { recursive: true });
execFileSync('esbuild', ['game.js', '--bundle', '--format=esm', '--platform=browser', '--target=es2022', '--outfile=dist/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const js = readFileSync('dist/bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync('vendor/session.js', 'utf8');
const pack = readFileSync('packs/kenney-furniture.json').toString('base64');
const icon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#3c0d24"/><path d="M2 18h8l2-4 3 10 4-18 3 12h8" stroke="#46e0a0" stroke-width="2.4" fill="none"/></svg>')}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleCase(TITLE)} - ${titleCase(TAGLINE)}</title>
<meta name="description" content="A melodramatic surgical action game in pixel art. Hold the instrument, hold your nerve, hold the patient together.">
<meta name="theme-color" content="#3c0d24">
<link rel="icon" href="${icon}">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Keep the patient alive and top the team score">
<meta name="hub:session-howto" content="Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.">
<meta name="hub:type" content="Game">
<meta name="hub:source" content="Trauma Center: Second Opinion">
<style>html,body{margin:0;height:100%;background:#0a0a10}#app{position:fixed;inset:0}</style>
</head><body><div id="app"></div>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">
${js}
</script></body></html>`;
writeFileSync('dist/game.html', html);
for (const f of ['bridge.js', 'round.js', 'harness.html']) copyFileSync(`vendor/${f}`, `dist/${f}`);
writeFileSync(`../${OUTPUT}.html`, html);
console.log(`built ${(html.length / 1048576).toFixed(1)} MB`);
