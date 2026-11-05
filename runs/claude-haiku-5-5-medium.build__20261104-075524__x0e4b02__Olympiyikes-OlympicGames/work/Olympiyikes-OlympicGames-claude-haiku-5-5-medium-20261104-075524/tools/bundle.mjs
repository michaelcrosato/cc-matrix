// Builds the single-file game: the engine and the game's source inlined into one HTML page, written to the work folder's root.
// Run: node tools/bundle.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('../', import.meta.url);
const OUT = new URL('../../Olympiyikes-OlympicGames-claude-haiku-5-5-medium-20261104-075524.html', import.meta.url);
const engine = readFileSync(new URL('vendor/my-3d2dge/dist/handoff/my-3d2dge.js', here), 'utf8');
const game = readFileSync(new URL('src/game.js', here), 'utf8');
const inline = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Olympiyikes! — Faster. Higher. Yikes.</title>
<meta name="description" content="A playful arcade riff on the Summer and Winter Games: 100m Dash, Ski Jump and Archery.">
<meta name="theme-color" content="#f2b632">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>${inline(engine)}</script>
<script>${inline(game)}</script>
</body>
</html>
`;
writeFileSync(OUT, html);
console.log('wrote', OUT.pathname.split('/').pop(), html.length, 'bytes');
