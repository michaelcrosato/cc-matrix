// Build: src/*.js (in name order) -> build/game.js inside one IIFE; then the single-file bundle
// ../BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html (the AI Hub client first in <head>, the engine,
// then the game). Usage: node tools/build.mjs [--no-bundle]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015';
const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
let body = '';
for (const f of files) body += `\n/* ===== src/${f} ===== */\n` + readFileSync(join(root, 'src', f), 'utf8');
const game = `/* Batzooka Baseball: the game (built from src/ by tools/build.mjs) */\n(() => {\n'use strict';\nconst E = My3D2dge;\n${body}\n})();\n`;
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'game.js'), game);
console.log(`build/game.js: ${files.length} files, ${(game.length / 1024).toFixed(0)} KB`);
if (process.argv.includes('--no-bundle')) process.exit(0);

const check = (name, text) => {
  const lines = text.split('\n');
  lines.forEach((l, i) => { if (/<\/script/i.test(l) || /<!--/.test(l)) { console.error(`STOP: ${name}:${i + 1} contains </script or <!-- : fix the source`); process.exit(1); } });
};
const hub = readFileSync(join(root, 'vendor', 'aihub-session.js'), 'utf8');
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
check('vendor/aihub-session.js', hub); check('engine/my-3d2dge.js', engine); check('build/game.js', game);
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
<meta name="hub:session-howto" content="Aim: stick/WASD/mouse · Swing: ✕/Space/click · Power: □/J/right-click · Batzooka: R1/E">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">BATZOOKA BASEBALL</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff9a2a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${engine}</script>
<script>${game}</script>
</body>
</html>
`;
const out = join(root, '..', NAME + '.html');
writeFileSync(out, html);
// the hub client must be the first script, byte-identical
const first = html.indexOf('<script>') + 8, firstEnd = html.indexOf('</script>', first);
if (html.slice(first, firstEnd) !== hub) { console.error('STOP: the first <script> is not the AI Hub client, byte for byte'); process.exit(1); }
console.log(`${NAME}.html: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
