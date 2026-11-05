// Builds the game: src/*.js in order, wrapped in one IIFE -> dist/game.js; a dev page (index.html, scripts by file) and
// the single-file bundle in the folder above (the engine, the hub client and the game inlined).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const NAME = 'TheBaritones-TheSopranos-claude-opus-5-5-medium-20261102-181313';
const src = readdirSync(here + 'src').filter(f => f.endsWith('.js')).sort();
const body = src.map(f => `/* ===== ${f} ===== */\n` + readFileSync(here + 'src/' + f, 'utf8')).join('\n');
const game = `/* THE BARITONES: an original spiritual successor to The Sopranos (1999-2007), on my-3D2dge v0.85.1 */\n(() => {\n'use strict';\n${body}\n})();\n`;
mkdirSync(here + 'dist', { recursive: true });
writeFileSync(here + 'dist/game.js', game);
const metas = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Collect the most cash in three minutes">
<meta name="hub:session-howto" content="WASD/stick move, J/Square punch, Q/R2 shoot, E/Cross collect">
<meta name="hub:session-minutes" content="3">`;
const style = `<style>html, body { margin: 0; height: 100%; background: #07060a; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#07060a;color:#c8b8a0;font:14px/1.5 Georgia,serif"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#ffd36a;font-size:22px;letter-spacing:.08em">THE BARITONES</b><span>Starting · my-3D2dge v0.85.1</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#e8b84a;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const head = (scripts) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${scripts.session}
${metas}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Baritones</title>
${style}
</head>
<body>
${boot}
<canvas id="screen"></canvas>
${scripts.body}
</body>
</html>
`;
writeFileSync(here + 'index.html', head({ session: '<script src="vendor/session.js"></script>', body: '<script src="vendor/my-3d2dge.js"></script>\n<script src="dist/game.js"></script>' }));
const inline = s => '<script>\n' + s.replace(/<\/script/gi, '<\\/script') + '\n</script>';
const session = readFileSync(here + 'vendor/session.js', 'utf8'), engine = readFileSync(here + 'vendor/my-3d2dge.js', 'utf8');
writeFileSync(here + '../' + NAME + '.html', head({ session: inline(session), body: inline(engine) + '\n' + inline(game) }));
console.log('built', src.length, 'files,', game.length, 'bytes of game;', 'bundle ->', NAME + '.html');
