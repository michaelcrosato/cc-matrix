// Bundles the game into the single deliverable HTML in the root folder (one level up), and writes exit-interview.json
// from the same B.ABOUT object the About screen shows. Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const here = new URL('..', import.meta.url).pathname, root = new URL('../..', import.meta.url).pathname;
export const NAME = 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-medium-20261103-185330';
export const ORDER = readdirSync(here + 'src').filter(f => f.endsWith('.js')).sort();
export function gameSource() {
  return '(async () => {\n"use strict";\n' + ORDER.map(f => '/* ==== src/' + f + ' ==== */\n' + readFileSync(here + 'src/' + f, 'utf8')).join('\n') + '\n})().catch(e => { console.error(e); const b = document.getElementById("e3-boot"); if (b) b.textContent = "Error: " + e.message; });\n';
}
function build() {
  const session = readFileSync(here + 'hub/session.js', 'utf8');
  const sum = createHash('sha256').update(session).digest('hex').slice(0, 16);
  const e2 = readFileSync(here + 'engine/my-3d2dge.js', 'utf8'), e3 = readFileSync(here + 'engine/my-3d2dge-3d.js', 'utf8');
  const game = gameSource();
  // lint: the sim layer never touches the view, the DOM, audio or Math.random
  for (const f of ORDER.filter(f => /^(2\d|30|31)-/.test(f))) {
    const s = readFileSync(here + 'src/' + f, 'utf8').replace(/\/\/.*$/gm, '');
    for (const w of ['World3D', 'document', 'Math.random', 'game.audio']) if (s.includes(w)) console.warn('lint: ' + f + ' mentions ' + w);
  }
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(session)}</script>
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
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#stage{position:relative;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}
#view{position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:0}
#screen{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;z-index:1;background:transparent}
#e3-boot{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;padding:20px;background:#0e0c0a;color:#b8924a;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace}</style></head><body>
<div id="e3-boot">EYE OF THE BOLT-HOLDER · Starting…</div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(e2)}</script>
<script type="module">${esc(e3)}</script>
<script type="module">${esc(game)}</script>
</body></html>`;
  writeFileSync(root + NAME + '.html', html);
  // the exit interview, from the same text the About screen shows
  const ctx = { console, B: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(here + 'src/19-data-about.js', 'utf8'), ctx);
  const A = ctx.B.ABOUT;
  if (A) {
    const out = { sourceInformation: A.source, testingFeedback: A.testing, engineFeedback: A.engine, promptFeedback: A.prompt, aiHub: A.aiHub };
    const txt = JSON.stringify(out, null, 2); JSON.parse(txt);
    writeFileSync(root + 'exit-interview.json', txt + '\n');
  }
  console.log(`built ${NAME}.html: ${(html.length / 1024).toFixed(0)} KB · session.js sha256 ${sum}`);
}
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) build();
