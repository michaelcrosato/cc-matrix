// Bundles the game into one HTML file: the hub's session client (byte for byte, first in the head), the 2D engine,
// the 3D engine (a module), and src/ concatenated in order (the game's own module). Usage: node tools/build.mjs
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url)), dev = path.resolve(here, '..');
const NAME = 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-haiku-5-5-medium-20261103-202616';
const out = path.resolve(dev, '..', NAME + '.html');
const read = p => readFileSync(path.join(dev, p), 'utf8');
const session = read('hub/session.js');
const sessionSha = createHash('sha256').update(session).digest('hex');
const engine2d = read('engine/my-3d2dge.js');
const engine3d = read('engine/my-3d2dge-3d.js');
const src = readdirSync(path.join(dev, 'src')).filter(f => f.endsWith('.js')).sort().map(f => `/* ---- ${f} ---- */\n` + read('src/' + f)).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${safe(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eye of the Bolt-Holder</title>
<meta name="description" content="A real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks.">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4"><meta name="hub:session-goal" content="Fastest party out of the Rat Run wins">
<meta name="hub:session-howto" content="Move W/S or stick · Turn Q E or d-pad · Use F or X · Strike Space or Square">
<script>window.__hubInfo = (window.AIHub && AIHub.active) ? AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;</script>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
<style>html, body { margin: 0; height: 100%; overflow: hidden; background: #000 } #stage { position: relative; width: 100%; height: 100%; overflow: hidden } #stage canvas { position: absolute; inset: 0; width: 100%; height: 100% } #view { }
#e3-boot { position: fixed; inset: 0; display: grid; place-items: center; color: #ffd36a; font: 16px monospace; background: #000; z-index: 9 }</style></head><body>
<div id="e3-boot">EYE OF THE BOLT-HOLDER · Starting…</div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${safe(engine2d)}</script>
<script type="module">${safe(engine3d)}</script>
<script type="module">
${safe(src)}
</script>
</body></html>`;
writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (statSync(out).size / 1024).toFixed(0) + ' KB', 'session.js sha256', sessionSha.slice(0, 16));
