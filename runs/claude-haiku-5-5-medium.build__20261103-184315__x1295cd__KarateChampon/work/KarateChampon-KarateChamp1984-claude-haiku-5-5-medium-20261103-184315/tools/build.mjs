// Build: src/*.js (in name order) -> build/game.js (one IIFE, syntax-checked), then the single HTML file beside the dev folder,
// and exit-interview.json from data/about.json (validated with JSON.parse).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const dev = path.resolve(here, '..');
const HTML_NAME = 'KarateChampon-KarateChamp1984-claude-haiku-5-5-medium-20261103-184315.html';
const engineFile = path.join(dev, 'engine/dist/handoff/my-3d2dge.js');

export function buildGame() {
  const files = readdirSync(path.join(dev, 'src')).filter(f => f.endsWith('.js')).sort();
  const body = files.map(f => `// ---- src/${f}\n` + readFileSync(path.join(dev, 'src', f), 'utf8')).join('\n');
  const about = readFileSync(path.join(dev, 'data/about.json'), 'utf8');
  JSON.parse(about);   // the About screen and exit-interview.json read the same file
  const game = `(() => {\n'use strict';\nconst E = My3D2dge;\n${body}\nKC.ABOUT = ${about.trim()};\n})();\n`;
  mkdirSync(path.join(dev, 'build'), { recursive: true });
  writeFileSync(path.join(dev, 'build/game.js'), game);
  new vm.Script(game, { filename: 'build/game.js' });   // syntax check
  return game;
}

export function buildHtml(game) {
  const engine = readFileSync(engineFile, 'utf8');
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const about = JSON.parse(readFileSync(path.join(dev, 'data/about.json'), 'utf8'));
  const exit = about;
  const session = readFileSync(path.join(dev, 'vendor/aihub/session.js'), 'utf8');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(session)}</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win bouts: first to 2 points. Winner stays on.">
<meta name="hub:session-howto" content="Move: left stick/WASD. Strike: right stick, face buttons or IJKL.">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Karate Champon</title>
<meta name="description" content="${about.aiHub.description.replace(/"/g, '&quot;')}">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">KARATE CHAMPON</b><span>Starting</span></div>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
  writeFileSync(path.join(dev, '..', HTML_NAME), html);
  writeFileSync(path.join(dev, '..', 'exit-interview.json'), JSON.stringify(exit, null, 2) + '\n');
  JSON.parse(readFileSync(path.join(dev, '..', 'exit-interview.json'), 'utf8'));
  return path.join(dev, '..', HTML_NAME);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const g = buildGame();
  const out = buildHtml(g);
  console.log('built', out, '(' + g.length + ' chars of game)');
}
