// Builds game/game.js from game/src/*.js (one IIFE) and, with --bundle, the single-file deliverable in the run folder.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('.', import.meta.url).pathname, NAME = 'Gauntletdown-Gauntlet-claude-opus-5-5-medium-20261104-050247';
const src = readdirSync(here + 'game/src').filter(f => f.endsWith('.js')).sort();
const body = src.map(f => `// ---- ${f} ----\n` + readFileSync(here + 'game/src/' + f, 'utf8')).join('\n');
const gameJs = `(() => {\n'use strict';\n${body}\n})();\n`;
writeFileSync(here + 'game/game.js', gameJs);
if (process.argv.includes('--bundle')) {
  const client = readFileSync(here + 'hub/session.js', 'utf8');
  if (!client.startsWith('/*! aihub-session')) throw new Error('hub/session.js is not the AI Hub client');
  const sha = createHash('sha256').update(client).digest('hex');
  if (sha !== readFileSync(here + 'hub/session.sha256', 'utf8').trim()) throw new Error('hub/session.js was modified');
  const engine = readFileSync(here + 'my-3d2dge.js', 'utf8');
  const esc = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${client}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gauntletdown</title>
<meta name="description" content="Gauntletdown: a one-to-four player co-op dungeon crawl. Blast hordes, smash generators, eat before your life force runs out.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Score the most: treasure, kills and stairs. Don't starve.">
<meta name="hub:session-howto" content="Move WASD/left stick · Aim mouse/right stick · Fire click/R2 · Magic right-click/Triangle">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(gameJs)}</script>
</body></html>
`;
  if ((html.match(/<canvas id="screen">/g) || []).length !== 1) throw new Error('canvas count');
  if (html.indexOf('<script>/*! aihub-session') !== html.indexOf('<meta charset="utf-8">') + '<meta charset="utf-8">\n'.length) throw new Error('client is not first');
  writeFileSync(here + '../' + NAME + '.html', html);
  writeFileSync(here + 'game/' + NAME + '.html', html);
  console.log('bundle', (html.length / 1024).toFixed(0) + ' KB');
}
