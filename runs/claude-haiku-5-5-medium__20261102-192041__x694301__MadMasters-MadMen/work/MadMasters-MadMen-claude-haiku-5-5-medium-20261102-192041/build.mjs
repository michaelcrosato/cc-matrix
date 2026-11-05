// Bundles the game into one HTML file in the work folder's root: session.js (unmodified, first script in head, as the hub
// requires), the my-3D2dge engine, and src/game.js. Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(here, p), 'utf8');
const session = read('vendor/session.js');
const engine = read('vendor/my-3d2dge.js');
const game = read('src/game.js');
const out = join(here, '..', 'MadMasters-MadMen-claude-haiku-5-5-medium-20261102-192041.html');

for (const [name, src] of Object.entries({ session, engine, game })) {
  if (/<\/script/i.test(src)) throw new Error(`${name} contains a closing script tag; it cannot be inlined as is`);
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Pitch the Wren to Hollis: the best timed reel wins the table.">
<meta name="hub:session-howto" content="Walk to Hollis, get the insights, pitch in the conference room. Stop the reel on the gold.">
<title>Mad Masters · Mad Men riff</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>${engine}</script>
<script>${game}</script>
</body>
</html>
`;
writeFileSync(out, html);
console.log('wrote', out, html.length, 'bytes');
