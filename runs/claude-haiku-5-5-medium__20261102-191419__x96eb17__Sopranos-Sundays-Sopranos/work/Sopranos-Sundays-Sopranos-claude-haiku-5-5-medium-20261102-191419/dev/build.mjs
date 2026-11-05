// Bundles the game into one page: the AI Hub client (unmodified, first in <head>), the engine, then the game's sources.
// Run: node build.mjs   (writes ../Sopranos-Sundays-Sopranos-claude-haiku-5-5-medium-20261102-191419.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(dir, '..', '..', 'Sopranos-Sundays-Sopranos-claude-haiku-5-5-medium-20261102-191419.html');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const hub = read('session.js');
const engine = read('my-3d2dge.js');
const order = ['a-setup.js', 'b-world.js', 'c-play.js', 'd-scenes.js', 'z-credits.js'];
const game = order.map(f => read(path.join('src', f))).join('\n');

for (const [name, src] of [['engine', engine], ['game', game], ['hub', hub]]) {
  if (/<\/script/i.test(src)) throw new Error(name + ' contains a </script tag');
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${hub}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Sopranos Sundays: a Sunday in North Jersey, for the family. A my-3D2dge game.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Collect the most cash and respect in three minutes: the envelopes, the crew, the doctor, the dinner.">
<meta name="hub:session-howto" content="Left stick or WASD move · Melee J or Square · Pistol G or Triangle · Talk E or Cross · Dodge L · Guard K · Camera V">
<title>Sopranos Sundays</title>
<style>
  html, body { margin: 0; height: 100%; background: #07060c; overflow: hidden; }
  #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none; }
</style>
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
fs.writeFileSync(OUT, html);
console.log('wrote', OUT, (html.length / 1024).toFixed(0) + ' KB');
