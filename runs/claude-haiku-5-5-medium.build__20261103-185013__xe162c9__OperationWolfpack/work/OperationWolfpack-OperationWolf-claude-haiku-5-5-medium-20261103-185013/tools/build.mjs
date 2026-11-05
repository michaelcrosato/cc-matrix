// Bundles the engine, the AI Hub session client (unmodified, first) and the game into one HTML file that opens from
// file:// with nothing else. Run: node tools/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadOrder, ROOT, TITLE_FILE } from './files.mjs';

const hubSession = readFileSync(path.join(ROOT, 'hub', 'session.js'), 'utf8');
const scripts = loadOrder().map(f => readFileSync(f, 'utf8'));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Operation Wolfpack</title>
<script>
${hubSession}
</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear the operation as a team; top score wins">
<meta name="hub:session-howto" content="Aim: mouse or stick · Fire: click or Space · Grenade: right click or X · Reload: R">
<meta name="hub:session-minutes" content="5">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4">
<meta name="hub:genre" content="Shooter"><meta name="hub:source" content="Operation Wolf">
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden }
  #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }
</style>
</head>
<body>
<canvas id="screen"></canvas>
${scripts.map(s => `<script>\n${s}\n</script>`).join('\n')}
</body>
</html>
`;
const out = path.join(ROOT, '..', TITLE_FILE + '.html');
writeFileSync(out, html);
console.log('wrote', path.resolve(out), html.length, 'bytes');
