// node tools/build.mjs: esbuild bundles three.js, Rapier, the 3D engine and the game into one inline module; the 2D
// engine goes in as a classic script before it; AI Hub's session.js is the first script in <head> (PLAN §2.7)
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), V = ROOT + 'engine/vendor/';
import { OUT_NAME } from './build-name.mjs';
const OUT = ROOT + '../' + OUT_NAME;
const MAP = { 'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js', 'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js' };
const vendor = { name: 'vendor', setup(b) { b.onResolve({ filter: /^(three|three\/webgpu|three\/tsl|@dimforge\/rapier3d-simd-compat)$/ }, a => ({ path: V + MAP[a.path] })); } };
const t0 = Date.now();
const res = await esbuild.build({ entryPoints: [ROOT + 'src/entry.js'], bundle: true, format: 'esm', minify: true, legalComments: 'inline', write: false, plugins: [vendor], target: 'es2022', logLevel: 'error' });
const bundle = res.outputFiles[0].text;
const engine2d = readFileSync(ROOT + 'engine/my-3d2dge.js', 'utf8'), session = readFileSync(ROOT + 'hub/session.js', 'utf8');
const ctx = { console }; vm.createContext(ctx); vm.runInContext(engine2d, ctx);
const splash = ctx.My3D2dge.bootSplash('CRACKMANIA');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const metas = [
  ['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-minutes', '3'],
  ['hub:session-goal', 'Best time in 3 minutes wins; retry as often as you like'],
  ['hub:session-howto', 'R2/W gas · L2/S brake · stick/arrows steer · Circle/Enter respawn · Triangle/R restart'],
  ['hub:type', 'Game'], ['hub:players', '1-4'], ['hub:genre', 'Racing'], ['hub:tagline', 'Crack the clock.']
].map(([n, c]) => `<meta name="${n}" content="${c}">`).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CRACKMANIA</title>
${metas}
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}#stage{position:relative;width:100%;height:100%;overflow:hidden}#view{position:absolute;inset:0;image-rendering:pixelated}#screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}</style>
</head><body>
${splash}
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(engine2d)}</script>
<script type="module">${esc(bundle)}</script>
</body></html>
`;
writeFileSync(OUT, html);
console.log('built', OUT_NAME, (html.length / 1e6).toFixed(2) + ' MB', (Date.now() - t0) + ' ms');
