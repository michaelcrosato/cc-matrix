// Builds the game: the engine (engine/my-3d2dge.js) and the game's source (src/, in name order, one IIFE) into one
// self-contained HTML file, and build/game.js (the game alone, for the headless tests). Nothing loads from the network.
// Usage: node tools/build.mjs [out.html]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TITLE = 'Ice Breakers';
const OUT = process.argv[2] || join(root, '..', 'IceBreakers-IceHockey-claude-haiku-5-5-medium-20261104-055947.html');
const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const game = body.trimEnd() + '\n})();\n';
// the game alone, for the tests (the engine loads before it, as in the page)
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'game.js'), game);
// the AI Hub client, verbatim, is the first script after <meta charset> (the hub requires it there)
const session = readFileSync(join(root, 'vendor', 'session.js'), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Score more goals than the other side before the final horn. Overtime is sudden death, then a shootout.">
<meta name="hub:session-howto" content="Move: left stick or WASD. Pass: cross or J. Shoot: square or K (hold for a slapshot, or check without the puck). Deke: circle or L. Saucer or gloves: triangle or I. Turbo: R2 or Shift.">
<meta name="hub:session-minutes" content="6">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<canvas id="screen"></canvas>
<script>
${engine}
</script>
<script>
${game}
</script>
</body>
</html>
`;
writeFileSync(OUT, html);
console.log(`built ${OUT} (${(html.length / 1024).toFixed(0)} KB; ${files.length} source files: ${files.join(', ')})`);
