// Builds the single HTML file in the root (beside TASK.md) and exit-interview.json from the game's B.ABOUT.
// node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gameSource, load } from '../tests/load.mjs';
const DEV = new URL('../', import.meta.url), ROOT = new URL('../../', import.meta.url);
const NAME = 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046';
const rd = p => readFileSync(new URL(p, DEV), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const session = rd('hub/session.js'), sha = createHash('sha256').update(session).digest('hex');
const engine2d = rd('engine/my-3d2dge.js'), engine3d = rd('engine/my-3d2dge-3d.js'), game = gameSource();
// the sim layer never touches the 3D world, the page, sound or the global random generator
for (const f of readdirSync(new URL('src/', DEV)).filter(f => /^(2\d|3[01])-/.test(f))) {
  const t = rd('src/' + f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const w of ['World3D', 'document', 'game.audio', 'Math.random', 'W3.']) if (t.includes(w)) console.warn('lint: ' + f + ' mentions ' + w);
}
const meta = (n, c) => `<meta name="${n}" content="${c}">`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eye of the Bolt-Holder</title>
${meta('description', 'A real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks.')}
${meta('hub:type', 'Game')}
${meta('hub:players', '1-4')}
${meta('hub:session', '1')}
${meta('hub:session-players', '1-4')}
${meta('hub:session-mode', 'ghost')}
${meta('hub:session-minutes', '4')}
${meta('hub:session-goal', 'Fastest party out of the Rat Run wins')}
${meta('hub:session-howto', 'Move WASD/stick · Turn Q E/d-pad · Use F/✕ · Strike Space/□')}
<script>window.__hubInfo = (window.AIHub && AIHub.active) ? AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;</script>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#stage{position:relative;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}
#view{position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:0}
#screen{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;z-index:1;background:transparent}
#e3-err{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;background:#05040a;color:#f0e6d0;font:16px/1.5 ui-monospace,Menlo,Consolas,monospace;text-align:center;padding:24px}
</style></head><body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#d8c8a0;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><span>EYE OF THE BOLT-HOLDER · Starting…</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c"></span></span></div>
<div id="e3-err">The 3D libraries could not load. Check the connection and reload.</div>
<div id="stage"><canvas id="view" aria-hidden="true"></canvas><canvas id="screen" role="img" aria-label="Eye of the Bolt-Holder"></canvas></div>
<script>
${safe(engine2d)}
</script>
<script type="module">
${safe(engine3d)}
</script>
<script type="module">
if (!My3D2dge.World3D) { document.getElementById('e3-err').style.display = 'flex'; const b = document.getElementById('e3-boot'); if (b) b.remove(); throw new Error('The 3D libraries could not load'); }
${safe(game)}
</script>
<script>setTimeout(() => { if (!window.My3D2dge || !window.My3D2dge.World3D) { const e = document.getElementById('e3-err'); if (e && !window.__game) { e.style.display = 'flex'; } } }, 25000);</script>
</body></html>
`;
writeFileSync(new URL(NAME + '.html', ROOT), html);
// the exit interview, from the same object the About screen shows
const { B } = load({ quiet: true });
const A = B.ABOUT, out = { sourceInformation: A.sourceInformation, testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback, aiHub: A.aiHub };
const json = JSON.stringify(out, null, 2); JSON.parse(json);
writeFileSync(new URL('exit-interview.json', ROOT), json + '\n');
const empty = [...Object.entries(out.sourceInformation).filter(([, v]) => !v).map(([k]) => 'sourceInformation.' + k), ...['testingFeedback', 'engineFeedback', 'promptFeedback'].flatMap(k => out[k].map((v, i) => v ? null : k + '[' + i + ']').filter(Boolean))];
console.log(`built ${NAME}.html: ${(html.length / 1024 / 1024).toFixed(2)} MB; session.js sha256 ${sha.slice(0, 16)}…; exit-interview.json ${empty.length ? 'has empty fields: ' + empty.join(', ') : 'complete'}`);
