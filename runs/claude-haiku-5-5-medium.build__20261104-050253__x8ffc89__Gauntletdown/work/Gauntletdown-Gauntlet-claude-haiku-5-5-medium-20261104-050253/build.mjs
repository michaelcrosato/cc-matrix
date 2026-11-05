// Builds game/game.js from game/src/*.js (name order, one IIFE), and the single-file deliverable in the run folder.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TITLE = 'Gauntletdown';
const FILE = 'Gauntletdown-Gauntlet-claude-haiku-5-5-medium-20261104-050253.html';
const runDir = resolve(here, '..');


const src = readdirSync(join(here, 'game', 'src')).filter(f => f.endsWith('.js')).sort();
const body = src.map(f => `// ---- ${f} ----\n` + readFileSync(join(here, 'game', 'src', f), 'utf8')).join('\n');
// The AI Hub client goes first, byte for byte, and must match the hub's copy.
const session = readFileSync(join(here, 'hub', 'session.js'), 'utf8');
if (!session.startsWith('/*! aihub-session')) throw new Error('hub/session.js does not look like the AI Hub client');
const gameJs = `(() => {\n'use strict';\n${body}\n})();\n`;
writeFileSync(join(here, 'game', 'game.js'), gameJs);

const engine = readFileSync(join(here, 'my-3d2dge.js'), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Score the most: treasure, kills and stairs. Don't starve.">
<meta name="hub:session-howto" content="Move WASD/stick · Aim mouse/right stick · Fire click/R2 · Magic right-click/△">
<meta name="description" content="A co-op dungeon crawl for one to four players, inspired by Gauntlet. Blast hordes, break generators and eat before the life force runs out.">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(gameJs)}</script>
</body></html>
`;
writeFileSync(join(runDir, FILE), html);
console.log(`built ${FILE} (${(html.length / 1024).toFixed(0)} KB), game.js ${(gameJs.length / 1024).toFixed(0)} KB`);
