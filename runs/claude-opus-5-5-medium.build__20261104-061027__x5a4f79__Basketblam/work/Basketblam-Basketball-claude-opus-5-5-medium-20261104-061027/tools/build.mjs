// BASKETBLAM build: concatenates src/*.js (in name order) into one IIFE (build/game.js), writes the dev page
// (build/index.html, loading the engine and game by src) and the self-contained deliverable in the root folder
// (the AI Hub client first in <head>, then the engine and the game inlined). node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const NAME = basename(here);                                     // Basketblam-Basketball-claude-opus-5-5-medium-20261104-061027
const read = f => readFileSync(join(here, f), 'utf8');
const files = readdirSync(join(here, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `/* ---- ${f} ---- */\n` + read('src/' + f)).join('\n');
const game = `/* BASKETBLAM: no fouls, no mercy, all BLAM. Built on my-3D2dge. */\n(() => {\n'use strict';\n${body}\n})();\n`;
mkdirSync(join(here, 'build'), { recursive: true });
writeFileSync(join(here, 'build/game.js'), game);

const client = read('vendor/aihub-session.js');
const TAGS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other crew over two halves: dunk, swat, shove, no fouls">
<meta name="hub:session-howto" content="Stick/WASD move · Square/Space shoot (hold, release at the top) · Cross/E pass or steal · R2/Shift turbo (turbo + shoot near the rim dunks) · Circle/Q shove or spin · Triangle/F alley-oop">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const CSS = `<style>html,body{margin:0;height:100%;background:#05040a;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}.esh{font-size:clamp(16px,2.4vh,40px)}</style>`;
const BOOT = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#ffd23a;font-size:16px;letter-spacing:.08em">BASKETBLAM</b><span>Lacing up · my-3D2dge v0.85.2</span></div>`;
const page = (scripts, head) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${head}
${TAGS}
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>BASKETBLAM</title>
${CSS}
</head>
<body>
${BOOT}
<canvas id="screen"></canvas>
${scripts}
</body>
</html>
`;
const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
writeFileSync(join(here, 'build/index.html'), page('<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>', '<script src="../vendor/aihub-session.js"></script>'));
const bundle = page(`<script>\n${esc(read('engine/my-3d2dge.js'))}\n</script>\n<script>\n${esc(game)}\n</script>`, `<script>\n${client}\n</script>`);
writeFileSync(join(here, '..', NAME + '.html'), bundle);
writeFileSync(join(here, 'build/game.html'), bundle);            // (served beside the harness for the hub tests)
console.log('built ' + files.length + ' fragments, ' + Math.round(bundle.length / 1024) + ' KB -> ../' + NAME + '.html');
