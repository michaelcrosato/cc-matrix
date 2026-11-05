// src/*.js -> build/game.js (one IIFE) -> ../<name>.html (a single file with the engine, the hub client and the game inline)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const NAME = basename(root);
const files = readdirSync(resolve(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => '/* ===== ' + f + ' ===== */\n' + readFileSync(resolve(root, 'src', f), 'utf8')).join('\n');
const game = '(() => {\n\'use strict\';\n' + body + '\n})();\n';
mkdirSync(resolve(root, 'build'), { recursive: true });
writeFileSync(resolve(root, 'build/game.js'), game);
const engine = readFileSync(resolve(root, 'engine/my-3d2dge.js'), 'utf8');
const hub = readFileSync(resolve(root, 'vendor/aihub-session.js'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${safe(hub)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Hit the most home runs in a Batzooka Derby. Everyone faces the same pitches; farther and bigger homers score more.">
<meta name="hub:session-howto" content="Move: stick / WASD aims the bat ring. Swing: X / Space / click as the ball crosses the plate. Power swing: Square / E when the meter is full.">
<meta name="hub:session-minutes" content="2">
<title>Batzooka Baseball</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>${safe(engine)}</script>
<script>${safe(game)}</script>
</body>
</html>
`;
const out = resolve(root, '..', NAME + '.html');
writeFileSync(out, html);
// the dev page loads the same pieces as separate files
writeFileSync(resolve(root, 'index.html'), html.replace(/<script>[\s\S]*?<\/script>\n<meta name="viewport"/, '<script src="vendor/aihub-session.js"></script>\n<meta name="viewport"').replace(/<script>[\s\S]*?<\/script>\n<script>[\s\S]*?<\/script>/, '<script src="engine/my-3d2dge.js"></script>\n<script src="build/game.js"></script>'));
console.log('built', out, (html.length / 1024).toFixed(0) + ' KB,', files.length, 'source files');
