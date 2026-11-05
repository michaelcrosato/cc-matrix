// esbuild the game (three + Rapier + the 3D engine + modules) and inline everything into one HTML file.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), V = ROOT + 'engine/vendor/';
const NAME = 'Crackmania-TrackMania2003-claude-sonnet-5-5-medium-20261104-050314';
const OUT = ROOT + '../' + NAME + '.html';
const MAP = { 'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js', 'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js' };
const plugin = { name: 'vendor', setup(b) { b.onResolve({ filter: /^(three|three\/webgpu|three\/tsl|@dimforge\/rapier3d-simd-compat)$/ }, a => ({ path: V + MAP[a.path] })); } };
import { existsSync } from 'node:fs';
if (existsSync(ROOT + '../exit-interview.json')) writeFileSync(ROOT + 'src/about_data.js', 'export default ' + readFileSync(ROOT + '../exit-interview.json', 'utf8') + ';\n');
const r = await build({ entryPoints: [ROOT + 'src/entry.js'], bundle: true, format: 'esm', minify: true, write: false, legalComments: 'none', plugins: [plugin], logLevel: 'error', target: 'es2022' });
const bundle = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const engine = readFileSync(ROOT + 'engine/my-3d2dge.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync(ROOT + 'hub/session.js', 'utf8').replace(/<\/script/gi, '<\\/script');
// the engine's boot splash markup, from the 2D engine loaded in Node
const ctx = { console, globalThis: null }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(engine.replace(/<\\\/script/gi, '</script'), ctx);
const splash = ctx.My3D2dge && ctx.My3D2dge.bootSplash ? ctx.My3D2dge.bootSplash('CRACKMANIA') : '';
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>CRACKMANIA</title>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost"><meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Best time in 3 minutes wins; retry as often as you like">
<meta name="hub:session-howto" content="R2/W gas, L2/S brake, stick/arrows steer, Circle/Backspace respawn">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#stage{position:relative;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}
#view{position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:0}
#screen{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;z-index:1}</style>
</head><body>${splash}
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${engine}</script>
<script type="module">${bundle}</script>
</body></html>`;
writeFileSync(OUT, html);
console.log('built', OUT, (html.length / 1e6).toFixed(2) + ' MB');
