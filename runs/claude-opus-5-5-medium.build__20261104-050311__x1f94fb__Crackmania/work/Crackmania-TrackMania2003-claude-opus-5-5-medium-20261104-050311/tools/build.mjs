// Bundle everything into one HTML file: the AI Hub client first in <head>, the 2D engine as a classic script, then one
// module with three.js, Rapier, the 3D engine and the game. Also writes exit-interview.json from src/info.json.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), V = ROOT + 'engine/vendor/';
const NAME = 'Crackmania-TrackMania2003-claude-opus-5-5-medium-20261104-050311';
const MAP = { 'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js', 'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js' };
const plugin = { name: 'vendor', setup(b) { b.onResolve({ filter: /^(three|three\/webgpu|three\/tsl|@dimforge\/rapier3d-simd-compat)$/ }, a => ({ path: V + MAP[a.path] })); } };
const out = await esbuild.build({ entryPoints: [ROOT + 'src/entry.js'], bundle: true, format: 'esm', minify: !process.argv.includes('--dev'), write: false, legalComments: 'inline', plugins: [plugin], logLevel: 'warning', target: 'es2022' });
const bundle = out.outputFiles[0].text, engine = readFileSync(ROOT + 'engine/my-3d2dge.js', 'utf8'), hub = readFileSync(ROOT + 'hub/session.js', 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(engine, ctx); const splash = ctx.My3D2dge.bootSplash('CRACKMANIA');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const INFO = JSON.parse(readFileSync(ROOT + 'src/info.json', 'utf8'));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(hub)}</script>
<script>/* connect to an AI Hub session at once, before the game's 5 MB loads */ if (window.AIHub && AIHub.active) window.__hubConnect = AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>CRACKMANIA</title>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3"><meta name="hub:session-goal" content="Best time in 3 minutes wins; retry as often as you like">
<meta name="hub:session-howto" content="R2/W gas · L2/S brake · stick/arrows steer · Circle/Enter respawn · Triangle/R restart">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4"><meta name="description" content="${INFO.aiHub.description}">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}#stage{position:relative;width:100%;height:100%;overflow:hidden}#view{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}#screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}</style>
</head><body>${splash}<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(engine)}</script>
<script type="module">${esc(bundle)}</script>
</body></html>`;
writeFileSync(ROOT + '../' + NAME + '.html', html);
writeFileSync(ROOT + '../exit-interview.json', JSON.stringify(INFO, null, 2) + '\n');
console.log('built ' + NAME + '.html ' + (html.length / 1e6).toFixed(2) + ' MB');
