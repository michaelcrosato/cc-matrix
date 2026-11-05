// node tools/build.mjs : concatenates src/*.js into build/game.js and writes the single-file deliverable one level up.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = basename(DEV);                       // AheadOrAlive...-claude-sonnet-5-5-medium-20261104-011720
const OUT = resolve(DEV, '..', name + '.html');
const rd = p => readFileSync(resolve(DEV, p), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const files = readdirSync(resolve(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const fb = JSON.stringify(JSON.parse(rd('feedback.json')));
const body = files.map(f => `/* ===== ${f} ===== */\n` + rd('src/' + f)).join('\n') + `\nG.FEEDBACK = ${fb};\n`;
const game = `(() => { 'use strict'; const E = My3D2dge, G = {}; window.AOA = G;\n${body}\n})();\n`;
mkdirSync(resolve(DEV, 'build'), { recursive: true });
writeFileSync(resolve(DEV, 'build/game.js'), game);
const tags = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Win the 2-on-2 beach volleyball match for your team: first to 7 points, win by 2.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Play (bump, set, spike, serve): Cross / Space. Dive: Circle / K. Call: Square / L. Camera: Triangle / V.">
<meta name="hub:session-minutes" content="5">`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a2d3d;color:#bfe9ee;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#fff3c4;font-size:16px;letter-spacing:.08em">AHEAD OR ALIVE</b><span>Xtreme Beach Volleyball · applying sunscreen</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ffb347;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, reload, or open the browser console.</span></div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(rd('vendor/aihub-session.js'))}</script>
${tags}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ahead or Alive: Xtreme Beach Volleyball</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
${boot}
<canvas id="screen"></canvas>
<script>${esc(rd('engine/my-3d2dge.js'))}</script>
<script>${esc(game)}</script>
</body></html>`;
writeFileSync(OUT, html);
writeFileSync(resolve(DEV, 'build/dev.html'), `<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="screen" style="width:100vw;height:100vh"></canvas><script src="../engine/my-3d2dge.js"></script><script src="game.js"></script>`);
console.log('built', OUT, (html.length / 1024 | 0) + ' KB');
