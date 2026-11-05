// Bundles the engine, the About pages and the game into ONE html file in the root (the folder above this one).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const NAME = 'Bentou2-Tenchu2-claude-haiku-5-5-medium-20261103-183606';
const engine = readFileSync(join(here, 'engine.js'), 'utf8');
const about = readFileSync(join(here, 'src', 'about.js'), 'utf8');
const game = readFileSync(join(here, 'src', 'game.js'), 'utf8');
for (const [label, src] of [['about', about], ['game', game]]) {
  if (/TODO|FIXME|placeholder|lorem/i.test(src)) throw new Error(`build: ${label} contains TODO/FIXME/placeholder`);
}
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bentou 2: Birth of the Lunchbox Assassins</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head><body>
<canvas id="screen"></canvas>
<script>${esc(engine)}</script>
<script>${esc(about)}</script>
<script>${esc(game)}</script>
</body></html>
`;
const out = join(root, NAME + '.html');
writeFileSync(out, html);
console.log('wrote ' + out + ' (' + html.length + ' bytes)');
