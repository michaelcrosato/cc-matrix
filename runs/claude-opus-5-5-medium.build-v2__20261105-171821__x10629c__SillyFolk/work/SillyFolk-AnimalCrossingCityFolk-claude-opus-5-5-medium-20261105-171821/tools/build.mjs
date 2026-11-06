// Writes the single-file game: see PLAN section 2. Usage: node tools/build.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = basename(dev);
const read = (p) => readFileSync(join(dev, p), 'utf8');
const bundle = execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--external:./pixel-engine.js', '--log-level=warning'], { cwd: dev, maxBuffer: 1 << 28, encoding: 'utf8' });
const engine = read('kit/pixel-engine.js');
if (/<\/script/i.test(engine)) throw new Error('engine contains </script');
const session = read('vendor/session.js');
const pack = 'data:application/json;base64,' + readFileSync(join(dev, 'kit/packs/kenney-furniture.json')).toString('base64');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Bank the most beans before the last bell">
<meta name="hub:session-howto" content="Move: stick or WASD. Do the thing: Cross or E. Sell at the stall.">
<meta name="hub:webgpu" content="required">
<title>Silly Folk</title>
<style>html,body{margin:0;height:100%;background:#1a1c2c}#app{position:fixed;inset:0}#app canvas{cursor:none}</style>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'${pack}'};</script>
<script id="kit-credits" type="text/plain">${read('kit/CREDITS.md').replace(/<\/script/gi, '<\\/script')}</script>
<script id="pixel-engine-src" type="text/plain">${engine}</script>
<script>(function(){var u=URL.createObjectURL(new Blob([document.getElementById('pixel-engine-src').textContent],{type:'text/javascript'}));var m=document.createElement('script');m.type='importmap';m.textContent=JSON.stringify({imports:{'./pixel-engine.js':u}});document.head.appendChild(m);})();</script>
</head><body><div id="app"></div><script type="module">${bundle.replace(/<\/script/gi, '<\\/script')}</script></body></html>
`;
const out = join(dev, '..', NAME + '.html');
writeFileSync(out, html);
mkdirSync(join(dev, 'tests/hub'), { recursive: true });
copyFileSync(out, join(dev, 'tests/hub/game.html'));
console.log('built', (html.length / 1e6).toFixed(1) + ' MB');
