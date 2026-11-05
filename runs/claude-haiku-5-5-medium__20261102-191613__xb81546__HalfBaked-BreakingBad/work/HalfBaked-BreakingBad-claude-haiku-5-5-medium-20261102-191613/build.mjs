// Bundles the game into one HTML file: the AI Hub client and the engine go in the head and body,
// then the game's modules in load order. Usage: node build.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) {
  console.error('usage: node build.mjs <out.html>');
  process.exit(2);
}

const read = (rel) => readFileSync(join(here, rel), 'utf8');
const parts = {
  session: read('vendor/session.js'),
  engine: read('vendor/my-3d2dge.js'),
  logic: read('src/logic.js'),
  audio: read('src/audio.js'),
  text: read('src/text.js'),
  maps: read('src/maps.js'),
  credits: read('src/credits.js'),
  game: read('src/game.js')
};

for (const [name, code] of Object.entries(parts)) {
  if (/<\/script/i.test(code)) throw new Error(`${name} contains a closing script tag`);
}

const meta = [
  ['hub:session', '1'],
  ['hub:session-players', '1-4'],
  ['hub:session-mode', 'parallel'],
  ['hub:session-minutes', '8'],
  ['hub:session-goal', 'Cook and sell the most cash in one shift. Highest cash wins.'],
  ['hub:session-howto', 'Left stick or arrows: move. Confirm (cross, A, Enter): talk, cook, sell. Attack (square, X, J): strike. Dash (R1, RB, Shift): dodge. Select or V: camera.']
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Half Baked · a spiritual successor to Breaking Bad</title>
${meta.map(([n, c]) => `<meta name="${n}" content="${c.replace(/"/g, '&quot;')}">`).join('\n')}
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
<script>
${parts.session}
</script>
</head>
<body>
<canvas id="screen"></canvas>
<script>
${parts.engine}
</script>
<script>
${parts.logic}
</script>
<script>
${parts.audio}
</script>
<script>
${parts.text}
</script>
<script>
${parts.maps}
</script>
<script>
${parts.credits}
</script>
<script>
${parts.game}
</script>
</body>
</html>
`;

writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} bytes)`);
