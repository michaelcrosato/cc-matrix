// Build: src/*.js (name order) -> build/game.js inside one IIFE; then the single-file bundle beside the dev folder.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), NAME = basename(DEV);
const files = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const about = JSON.parse(readFileSync(join(DEV, 'about.json'), 'utf8'));
let code = "(() => {\n'use strict';\nconst E = My3D2dge, { px, clamp, lerp, approach } = E, TAU = Math.PI * 2;\nconst ABOUT_DATA = " + JSON.stringify(about) + ";\n";
for (const f of files) code += `\n/* ===== ${f} ===== */\n` + readFileSync(join(DEV, 'src', f), 'utf8');
code += '\n})();\n';
writeFileSync(join(DEV, 'build/game.js'), code);
const parts = [['vendor/aihub-session.js'], ['engine/my-3d2dge.js'], ['build/game.js']];
for (const [p] of parts) { const s = readFileSync(join(DEV, p), 'utf8'); const i = s.search(/<\/script|<!--/i); if (i >= 0) { const line = s.slice(0, i).split('\n').length; console.error(`build: ${p}:${line} holds </script or <!--`); process.exit(1); } }
const hub = readFileSync(join(DEV, 'vendor/aihub-session.js'), 'utf8');
const boot = readFileSync(join(DEV, 'tools/boot-splash.html'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${hub}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Batzooka Baseball</title>
<meta name="description" content="Over-the-top arcade baseball: fireball pitches, a rocket-powered bat, wall-climbing catches and bench-clearing rhubarbs.">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Hit the most home-run feet in two minutes">
<meta name="hub:session-howto" content="Aim: stick/WASD/mouse · Swing: ✕/Space/click · Power: □/J/right-click">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
${boot}
<canvas id="screen"></canvas>
<script>${readFileSync(join(DEV, 'engine/my-3d2dge.js'), 'utf8')}</script>
<script>${code}</script>
</body>
</html>
`;
const out = join(DEV, '..', NAME + '.html');
if (!process.argv.includes('--no-bundle')) { writeFileSync(out, html); writeFileSync(join(DEV, '..', 'exit-interview.json'), JSON.stringify(about, null, 2) + '\n'); console.log('built', out, (html.length / 1e6).toFixed(2) + ' MB'); }
else console.log('built build/game.js');
