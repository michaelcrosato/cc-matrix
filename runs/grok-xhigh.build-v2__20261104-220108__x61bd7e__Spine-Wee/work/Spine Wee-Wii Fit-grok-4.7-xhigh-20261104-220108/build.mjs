/* One file for the hand-in, and a copy the hub harness can frame. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const work = dirname(here);
const name = 'Spine Wee-Wii Fit-grok-4.7-xhigh-20261104-220108';
const out = process.argv[2] || join(work, name + '.html');

const order = [
  'engine/my-3d2dge.js',
  'vendor/readable.js',
  'vendor/mocap.js',
  'vendor/fitclips.js',
  'game/data/lines.js',
  'game/data/content.js',
  'game/balance.js',
  'game/audio.js',
  'game/rigs.js',
  'game/ui.js',
  'game/play.js',
  'game/world.js',
  'game/boot.js'
];

function esc(s) { return s.replace(/<\/script/gi, '<\\/script'); }

let about = 'null';
try {
  const raw = readFileSync(join(work, 'exit-interview.json'), 'utf8');
  JSON.parse(raw);
  about = raw.trim();
} catch (e) { about = 'null'; }

let bundled = order.map(function (f) { return esc(readFileSync(join(here, f), 'utf8')); }).join('\n;\n');
bundled = bundled.replace('/*ABOUT*/null', about);
const session = esc(readFileSync(join(here, 'vendor/session.js'), 'utf8'));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Spine Wee — a five-day stay for your spine</title>
<meta name="description" content="A sports retreat where a talking scale coaches one lean: stillness, strength, cardio, and balance, alone or in a class of four.">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
<style>
html, body { margin: 0; height: 100%; background: #e7f6f8; overflow: hidden }
#screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none; background: #e7f6f8 }
@media (min-height:700px){.esh-mod{zoom:1.5}} @media (min-height:1000px){.esh-mod{zoom:2}}
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}
</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#e7f6f8;color:#5f7f8a;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#20404c;font-size:16px;letter-spacing:.08em">SPINE WEE</b><span>Starting · my-3D2dge v0.89.0</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#c8dde2"><span style="display:block;width:30%;height:100%;background:#14a8c8;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>
${bundled}
</script>
</body>
</html>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
mkdirSync(join(here, 'tests/hub'), { recursive: true });
writeFileSync(join(here, 'tests/hub/game.html'), html);
console.log(out);
