// Builds the game: concatenates src/*.js into one IIFE (dist/game.js), writes the dev page (dist/index.html), and writes
// the single-file game one folder up, named as the deliverable: the AI Hub client first in <head>, the engine and the
// game inlined. Run: node tools/build.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'CricketKerfuffle-Cricket-claude-haiku-5-5-medium-20261104-064807';
const parent = path.resolve(root, '..');
const src = readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = src.map(f => readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const game = `(() => {\n${body}\n})();\n`;
// the game must parse before anything is written
try { new Function(game); } catch (e) { console.error('syntax error in the game: ' + e.message); process.exit(1); }
mkdirSync(path.join(root, 'dist'), { recursive: true });
writeFileSync(path.join(root, 'dist', 'game.js'), game);

const engineDir = path.join(root, 'engine');
const engine = readFileSync(path.join(engineDir, 'my-3d2dge.js'), 'utf8');
const client = readFileSync(path.join(root, 'vendor', 'aihub', 'session.js'), 'utf8');
const shell = readFileSync(path.join(engineDir, 'game', 'index.html'), 'utf8');
const css = shell.match(/<style>html, body[\s\S]*?<\/style>/)[0];
let splash = shell.match(/<div id="e3-boot"[\s\S]*?<\/div>\s*(?=<canvas)/)[0];
splash = splash.replace('ROOFTOP', 'CRICKET KERFUFFLE').replace('my-3D2dge v0.85.2', 'my-3D2dge v0.85.2');

// the dev page: the engine and the game as separate scripts, for quick iteration
const dev = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cricket Kerfuffle (dev page)</title>
${css}
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<script src="../engine/my-3d2dge.js"></script>
<script src="game.js"></script>
</body>
</html>
`;
writeFileSync(path.join(root, 'dist', 'index.html'), dev);

// the single file: the client byte for byte (first script), the tags, the engine, the game
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const hubTags = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-minutes" content="2">
<meta name="hub:session-goal" content="Most runs from one over (6 balls, 2 wickets) wins">
<meta name="hub:session-howto" content="Aim: stick/WASD/mouse · Hit: J/click · Loft: K · Run: Space">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${esc(client)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cricket Kerfuffle</title>
${hubTags}
${css}
</head><body>
${splash}
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body></html>
`;
const out = path.join(parent, NAME + '.html');
writeFileSync(out, page);
const sha = createHash('sha1').update(client).digest('hex');
console.log('built', path.basename(out), (page.length / 1024).toFixed(0) + ' KB; client sha1 ' + sha.slice(0, 12));
