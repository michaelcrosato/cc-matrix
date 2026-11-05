// BASHKETBALL build: concatenates src/*.js (in name order) into one IIFE (build/game.js), then writes the dev page
// (build/index.html), the hub test copy (build/hub/game.html with the harness beside it) and the single-file
// deliverable in the root folder. Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(DEV, '..');
const NAME = 'Bashketball-Basketball-claude-opus-5-5-xhigh-20261104-060901';
const read = f => readFileSync(join(DEV, f), 'utf8');

const parts = readdirSync(join(DEV, 'src')).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
let body = '';
for (const f of parts) body += `\n/* ==== ${f} ==== */\n` + read('src/' + f) + '\n';
const game = `/* BASHKETBALL — an original over-the-top arcade basketball game on my-3D2dge. Built from src/ by tools/build.mjs. */\n(() => {\n'use strict';\n${body}\n})();\n`;
mkdirSync(join(DEV, 'build/hub'), { recursive: true });
writeFileSync(join(DEV, 'build/game.js'), game);

const client = read('vendor/aihub-session.js');
const engine = read('engine/my-3d2dge.js');
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const TAGS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other crew over two halves of 2-on-2 arcade basketball">
<meta name="hub:session-howto" content="Stick/WASD move · Square/Space shoot · Cross/E pass · R2/Shift turbo · Circle/Q shove · Triangle/F alley-oop">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const STYLE = `<style>html,body{margin:0;height:100%;background:#05040a;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>`;
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffd23a;font-size:20px;letter-spacing:.08em">BASHKETBALL</b><span>Warming up · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff3ca6;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const page = (inline) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${client}</script>
${TAGS}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>BASHKETBALL · No fouls. No mercy. All BLAM.</title>
${STYLE}
</head>
<body>
${splash}
<canvas id="screen"></canvas>
${inline ? `<script>${esc(engine)}</script>\n<script>${esc(game)}</script>` : `<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>`}
</body>
</html>
`;
writeFileSync(join(DEV, 'build/index.html'), page(false));
const single = page(true);
writeFileSync(join(DEV, 'build/hub/game.html'), single);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'vendor/hub-harness', f), join(DEV, 'build/hub', f));
writeFileSync(join(ROOT, NAME + '.html'), single);
console.log(`built ${parts.length} fragments, game.js ${(game.length / 1024).toFixed(0)} KB, bundle ${(single.length / 1024).toFixed(0)} KB`);
