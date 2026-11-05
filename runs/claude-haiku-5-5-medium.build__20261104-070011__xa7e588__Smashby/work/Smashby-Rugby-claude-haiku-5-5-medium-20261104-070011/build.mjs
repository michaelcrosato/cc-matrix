// Builds the single-file game: the engine inlined first, then the game's sources in file-name order inside one IIFE.
// Writes the HTML next to the dev folder's parent (the work folder), with the file name the task asks for.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', 'Smashby-Rugby-claude-haiku-5-5-medium-20261104-070011.html');
const engine = readFileSync(join(here, 'engine', 'my-3d2dge.js'), 'utf8');
const files = readdirSync(join(here, 'src')).filter(f => f.endsWith('.js')).sort();
const game = "(() => {\n'use strict';\nconst E = My3D2dge;\n" + files.map(f => `/* ==== ${f} ==== */\n` + readFileSync(join(here, 'src', f), 'utf8')).join('\n') + '\n})();';
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<title>Smashby</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
writeFileSync(OUT, page);
console.log('built', OUT, (statSync(OUT).size / 1024).toFixed(0) + ' KB', files.length, 'source files');
