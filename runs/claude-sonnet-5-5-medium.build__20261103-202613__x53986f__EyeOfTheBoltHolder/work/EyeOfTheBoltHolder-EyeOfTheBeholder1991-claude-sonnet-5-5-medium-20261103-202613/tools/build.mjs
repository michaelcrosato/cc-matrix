// Bundles src/*.js (in name order) with the engines and the hub client into one HTML file in the parent folder.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const here = path.dirname(new URL(import.meta.url).pathname), dev = path.resolve(here, '..'), root = path.resolve(dev, '..');
const NAME = path.basename(dev);                       // EyeOfTheBoltHolder-EyeOfTheBeholder1991-<model>-<stamp>
const rd = f => fs.readFileSync(path.join(dev, f), 'utf8');
const safe = t => t.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
export const ORDER = fs.readdirSync(path.join(dev, 'src')).filter(f => f.endsWith('.js')).sort();
const session = rd('hub/session.js');
const game = ORDER.map(f => `/* ==== ${f} ==== */\n` + rd('src/' + f)).join('\n');
const sha = crypto.createHash('sha256').update(session).digest('hex').slice(0, 12);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eye of the Bolt-Holder</title>
<meta name="description" content="A real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks.">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Fastest party out of the Rat Run wins">
<meta name="hub:session-howto" content="Move WASD/stick · Turn Q E/d-pad · Use F/✕ · Strike Space/□">
<script>window.__hubInfo = (window.AIHub && AIHub.active) ? AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;</script>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#000;user-select:none;-webkit-user-select:none}
#stage{position:relative;width:100%;height:100%;overflow:hidden}#view{position:absolute;inset:0;width:100%;height:100%}
#screen{position:absolute;inset:0;width:100%;height:100%}#e3-boot{position:fixed;left:0;top:0;color:#b8924a;font:12px monospace;padding:8px;z-index:0}</style></head><body>
<div id="e3-boot">EYE OF THE BOLT-HOLDER · Starting…</div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${safe(rd('engine/my-3d2dge.js'))}</script>
<script type="module">${safe(rd('engine/my-3d2dge-3d.js'))}</script>
<script type="module">
${safe(game)}
</script>
</body></html>`;
export const OUT = path.join(root, NAME + '.html');
fs.writeFileSync(OUT, html);
// lint: sim files must not reach the view
for (const f of ORDER) if (/^(2\d|3\d)-/.test(f)) { const s = rd('src/' + f); if (/\bWorld3D\b|\bdocument\.|\bMath\.random\b/.test(s)) console.log('lint: ' + f + ' mentions the view/DOM/Math.random'); }
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(`built ${path.basename(OUT)} · ${(html.length / 1024) | 0} KB · session.js sha ${sha}`);
