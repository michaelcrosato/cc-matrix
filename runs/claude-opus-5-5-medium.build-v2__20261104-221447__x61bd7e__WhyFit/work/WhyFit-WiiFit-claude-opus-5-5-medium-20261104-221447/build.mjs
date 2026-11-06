// The one build command: node build.mjs [out.html]. Inlines everything; writes tests/hub/game.html too.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
const out = process.argv[2] || '../WhyFit-WiiFit-claude-opus-5-5-medium-20261104-221447.html';
export const GAME_FILES = ['core.js', 'data/lines.js', 'data/poses.js', 'data/activities.js', 'data/charts.js', 'data/courses.js', 'data/trays.js', 'data/days.js', 'data/unlocks.js', 'balance.js', 'rigs.js', 'audio.js', 'ui.js', 'rooms.js', 'scenes/session.js', 'activities/hold.js', 'activities/candle.js', 'activities/rep.js', 'activities/step.js', 'activities/hoop.js', 'activities/jog.js', 'activities/slalom.js', 'activities/tray.js', 'activities/laundry.js', 'scenes/title.js', 'scenes/bodycheck.js', 'scenes/island.js', 'scenes/games.js', 'scenes/class.js', 'scenes/round.js', 'scenes/attract.js', 'dev.js', 'main.js'];
export const VENDOR = ['engine/my-3d2dge.js', 'vendor/readable.js', 'vendor/mocap.js', 'vendor/fitclips.js', 'vendor/whyfit-props.js'];
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const CSS = `html,body{margin:0;height:100%;background:#d8f3fb;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
@media (min-height:700px){.esh-mod{zoom:1.5}} @media (min-height:1000px){.esh-mod{zoom:2}}
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}`;
const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#f6fafa;color:#20404c;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#14a8c8;font-size:16px;letter-spacing:.08em">WHY FIT</b><span>Zeroing the scale</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#20404c14"><span style="display:block;width:30%;height:100%;background:#2cc6e6;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const iv = existsSync('../exit-interview.json') ? readFileSync('../exit-interview.json', 'utf8') : '{}';
const parts = [...VENDOR.map(f => readFileSync(f, 'utf8')), `window.G = { ABOUT: ${iv} };`, ...GAME_FILES.map(f => readFileSync('game/' + f, 'utf8'))];
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${safe(readFileSync('vendor/session.js', 'utf8'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Why Fit — a five-day stay, gently</title>
<meta name="description" content="A gentle, deadpan comedy about a five-day stay at a wellness retreat, where one skill, your balance, drives twelve short activities, coached by a needy talking scale.">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<style>${CSS}</style></head><body>
${BOOT}
<canvas id="screen"></canvas>
${parts.map(p => `<script>${safe(p)}</script>`).join('\n')}
</body></html>`;
if (process.argv[1].endsWith('build.mjs')) { writeFileSync(out, html); copyFileSync(out, 'tests/hub/game.html'); console.log('built ' + out + ' ' + Math.round(html.length / 1024) + ' KB'); }
