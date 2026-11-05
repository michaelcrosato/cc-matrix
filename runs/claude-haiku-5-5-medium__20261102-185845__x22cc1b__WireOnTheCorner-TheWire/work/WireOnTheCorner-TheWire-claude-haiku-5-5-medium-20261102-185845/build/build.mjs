// Bundles the game into one HTML file: the AI Hub client (session.js, unmodified, the first script in <head>), the my-3D2dge
// engine, the About text and the game. Output: the work folder's root, next to exit-interview.json.
// Run: node build/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const G = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'WireOnTheCorner-TheWire-claude-haiku-5-5-medium-20261102-185845';
const OUT = resolve(G, '..', NAME + '.html');
const read = p => readFileSync(resolve(G, p), 'utf8');
const scripts = { session: read('hub/session.js'), engine: read('engine/my-3d2dge.js'), about: read('src/about.js'), game: read('src/game.js') };
for (const [k, s] of Object.entries(scripts)) if (/<\/script/i.test(s)) throw new Error(k + ' contains a closing script tag');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${scripts.session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Bank four of the five pieces of the case at the Lieutenant's office before the shift ends or the heat reaches three. Each copy plays its own shift; the higher score wins.">
<meta name="hub:session-howto" content="Walk: stick or arrows. Run: dash. Interact, talk and tune the pole: confirm. Click the ground to walk.">
<title>Wire on the Corner · The Wire (2002-2008)</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>
${scripts.engine}
</script>
<script>
${scripts.about}
</script>
<script>
${scripts.game}
</script>
</body>
</html>
`;
writeFileSync(OUT, html);
console.log('wrote', OUT, html.length, 'bytes');
