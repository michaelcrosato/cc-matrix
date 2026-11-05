// Bundles the hub client, the engine, the About text and the game's modules into one HTML file.
// node build.mjs  ->  ../TheSopraniacs-TheSopranos-claude-opus-5-5-medium-20261102-181316.html (and index.html here)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const here = new URL('./', import.meta.url), rd = p => readFileSync(new URL(p, here), 'utf8');
const NAME = 'TheSopraniacs-TheSopranos-claude-opus-5-5-medium-20261102-181316';
const parts = readdirSync(new URL('src/', here)).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
const game = parts.map(f => `/* ---- src/${f} ---- */\n` + rd('src/' + f)).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${safe(rd('vendor/session.js'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Sopraniacs</title>
<meta name="description" content="The Sopraniacs: an original North Jersey crime-family action adventure. Stress, therapy, envelopes and ducks.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Collection Run: grab the most cash in town before time is up. Envelopes, and the New York guys who drop it.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Punch: Square / J / left click. Haymaker: Triangle / K. Roll: Circle / Space. Pistol: R2 / L / right click. Use and car: Cross / E.">
<meta name="hub:session-minutes" content="3">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0406;color:#c8a060;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace"><b style="color:#e83a3a;font-size:22px;letter-spacing:.08em">THE SOPRANIACS</b><span>Starting...</span></div>
<canvas id="screen"></canvas>
<script>${safe(rd('vendor/my-3d2dge.js'))}</script>
<script>${safe(rd('src/about.js'))}</script>
<script>${safe(game)}</script>
</body>
</html>
`;
writeFileSync(new URL(`../${NAME}.html`, here), html);
writeFileSync(new URL('index.html', here), html);
console.log('built', NAME + '.html', (html.length / 1024 | 0) + ' KB', parts.length, 'modules');
