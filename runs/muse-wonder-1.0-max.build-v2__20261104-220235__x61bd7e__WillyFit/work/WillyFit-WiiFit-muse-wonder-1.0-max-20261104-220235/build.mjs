// Willy Fit — one build command: node build.mjs [out.html]
// Concatenates engine + vendor + game into a single file with hub head tags and G.ABOUT.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
const read = p => readFileSync(join(root, p), 'utf8');
const esc = s => s.replace(/<\/script/g, '<\\/script');
const session = read('vendor/session.js'); // unmodified, first script in head
let about = { sourceInformation: { usage: 'added on import' }, testingFeedback: [], engineFeedback: [], promptFeedback: [], aiHub: {} };
const eiPath = join(root, '..', 'exit-interview.json');
if (existsSync(eiPath)) { try { about = JSON.parse(readFileSync(eiPath, 'utf8')); } catch (e) { console.error('exit-interview.json does not parse; building with fallback About'); } }
const parts = [
  'engine/my-3d2dge.js', 'vendor/readable.js', 'vendor/mocap.js', 'vendor/fitclips.js',
  'game/data/lines.js', 'game/data/charts.js', 'game/data/trays.js',
  'game/core.js', 'game/balance.js', 'game/rigs.js', 'game/audio.js', 'game/ui.js',
  'game/activities/hold.js', 'game/activities/candle.js', 'game/activities/rep.js',
  'game/activities/step.js', 'game/activities/jog.js', 'game/activities/tray.js',
  'game/scenes/boot.js', 'game/scenes/session.js', 'game/scenes/day.js', 'game/scenes/island.js',
  'game/scenes/meta.js', 'game/scenes/meta2.js', 'game/scenes/start.js'
];
const gameJs = parts.map(p => '\n/* ===== ' + p + ' ===== */\n' + read(p)).join('\n');
const aboutJs = '\nwindow.G = window.G || {}; G.ABOUT = ' + JSON.stringify(about) + ';\n';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Willy Fit — Gently, or not at all.</title>
<meta name="description" content="A gentle, deadpan balance comedy: five days at a wellness retreat with a needy talking scale. One lean drives twelve activities.">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<style>html,body{margin:0;height:100%;background:#f6fafa;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}
@media (min-height:700px){.esh-mod{zoom:1.5}} @media (min-height:1000px){.esh-mod{zoom:2}}
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#f6fafa;color:#20404c;font:12px/1.5 system-ui,sans-serif"><b style="font-size:16px;letter-spacing:.08em">WILLY FIT</b><span>Zeroing the scale…</span></div>
<canvas id="screen"></canvas>
<script>${esc(aboutJs + gameJs)}</script>
</body>
</html>
`;
writeFileSync(OUT, html);
try { writeFileSync(join(root, 'tests/hub/game.html'), html); } catch (e) {}
console.log('built ' + OUT + ' (' + Math.round(html.length / 1024) + ' KB)');
