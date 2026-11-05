// Bundles the game into one HTML file in the work folder's root: session.js first, the engine, then the game's
// modules in order inside one IIFE. Also writes build/game.js (the IIFE alone) for the headless tests.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const NAME = 'Rewired-TheWire-claude-opus-5-5-medium-20261102-181307';
const src = readdirSync(here + 'src').filter(f => f.endsWith('.js')).sort();
const game = '(() => {\n"use strict";\n' + src.map(f => `// ---- ${f} ----\n` + readFileSync(here + 'src/' + f, 'utf8')).join('\n') + '\n})();\n';
mkdirSync(here + 'build', { recursive: true });
writeFileSync(here + 'build/game.js', game);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const engine = readFileSync(here + 'vendor/my-3d2dge.js', 'utf8');
const session = readFileSync(here + 'vendor/session.js', 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Photograph as many hand-to-hand sales on the corner as you can before the shift ends, without getting burned by the lookouts. Highest score wins.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Raise camera: L2 / right mouse. Photo: R2 / left click. Crouch: Circle / C. Sprint: L3 / Shift. Interact: Cross / E.">
<meta name="hub:session-minutes" content="3">
<meta name="description" content="REWIRED: an original surveillance game in the spirit of The Wire. Walk the corner, build the board, work the wire.">
<title>REWIRED</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">REWIRED</b><span>Starting</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
writeFileSync(here + '../' + NAME + '.html', html);
console.log('built', NAME + '.html', (html.length / 1024).toFixed(0) + ' KB;', src.length, 'modules');
