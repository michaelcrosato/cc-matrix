// ZONEFIRE build: src/*.js (numbered fragments) -> build/game.js (one IIFE), build/index.html (dev page),
// build/game.html (the hub harness's page) and the root deliverable (one self-contained HTML, the AI Hub client first in
// <head>, byte for byte). Run from the dev folder: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DEV = resolve(new URL('..', import.meta.url).pathname);
const ROOT = resolve(DEV, '..');
const NAME = 'Zonefire-Basketball-claude-haiku-5-5-medium-20261104-061830';
const read = p => readFileSync(join(DEV, p), 'utf8');

const frags = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort();
const body = frags.map(f => `/* ---- ${f} ---- */\n` + read('src/' + f)).join('\n');
// every top-level name is handed to the tests as __bb.I (the test handle reads the game's own functions; the build adds nothing else)
const names = [...new Set([...body.matchAll(/^(?:const|function) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]))];
const game = `(() => {\n'use strict';\n${body}\nwindow.__bb && (window.__bb.I = { ${names.join(', ')} });\n})();\n`;
mkdirSync(join(DEV, 'build'), { recursive: true });
writeFileSync(join(DEV, 'build/game.js'), game);

const client = read('vendor/aihub-session.js');
const engine = read('engine/my-3d2dge.js');
if (/<\/script/i.test(engine + client + game)) throw new Error('a script contains </script');

const head = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ZONEFIRE</title>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other crew over two halves">
<meta name="hub:session-howto" content="Stick/WASD move · □/Space shoot · ✕/E pass · R2/Shift turbo · ○/Q shove">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>`;
const boot = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#fff7ec;font-size:16px;letter-spacing:.08em">ZONEFIRE</b><span>Starting · my-3D2dge v0.85.2</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#ff3ca6"></span></span><span>Still starting. If this stays, reload the page or open the browser's console.</span></div>`;

// the page: the AI Hub client is the first script in <head>, right after <meta charset> (unmodified); the engine and the
// game sit at the end of <body>, where the page's body exists for the engine's canvas
const page = (client, rest) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${client}
${head}
</head>
<body>
${boot}
<canvas id="screen"></canvas>
${rest}
</body>
</html>
`;

// the dev page: the client (verbatim), the engine and the game as files
const dev = page('<script src="../vendor/aihub-session.js"></script>', '<script src="../engine/my-3d2dge.js"></script>\n<script src="game.js"></script>');
writeFileSync(join(DEV, 'build/index.html'), dev);
writeFileSync(join(DEV, 'build/game.html'), dev);

// the deliverable: one file, everything inline, the client first
const one = page(`<script>\n${client}\n</script>`, `<script>\n${engine}\n</script>\n<script>\n${game}\n</script>`);   // (client: verbatim, first)
writeFileSync(join(ROOT, NAME + '.html'), one);
console.log(`build: ${frags.length} fragments, game.js ${game.length} bytes, deliverable ${one.length} bytes`);
