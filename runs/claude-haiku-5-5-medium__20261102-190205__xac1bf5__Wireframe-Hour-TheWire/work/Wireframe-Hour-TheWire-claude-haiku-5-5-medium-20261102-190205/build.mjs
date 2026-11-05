// Bundles the game into ONE html file in this folder's parent (the work folder root):
//   session.js (AI Hub client, unmodified, first in <head>) + the engine + exit-interview answers + the game.
// Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const NAME = 'Wireframe-Hour-TheWire-claude-haiku-5-5-medium-20261102-190205';
const root = resolve(here, '..');
const read = p => readFileSync(join(here, p), 'utf8');

const session = read('src/session.js');
const engine = read('vendor/my-3d2dge.js');
const game = read('src/game.js');
const exitJson = JSON.parse(readFileSync(join(root, 'exit-interview.json'), 'utf8'));   // must parse
const exitScript = 'window.EXIT_INTERVIEW = ' + JSON.stringify(exitJson) + ';';

for (const [label, code] of [['session', session], ['engine', engine], ['game', game]]) {
  if (/<\/script/i.test(code)) throw new Error(label + ' contains </script');
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Wireframe Hour · The Wire demo</title>
<meta name="description" content="A Baltimore stealth and wiretap demo, three days long. Built on my-3D2dge.">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Get the notebook off the stash-house roof and out the east alley first. Quickest time wins.">
<meta name="hub:session-howto" content="Stick or arrows move. Space jump and climb. J strike or take down. K block or parry. C crouch. Shift sprint. L roll.">
<meta name="hub:session-minutes" content="4">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#0a0807;color:#b0a890;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4ecd8;font-size:16px;letter-spacing:.08em">WIREFRAME HOUR</b><span>Starting</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, reload the page or open the browser console.</span></div>
<canvas id="screen"></canvas>
<script>${engine}</script>
<script>${exitScript}</script>
<script>${game}</script>
</body>
</html>
`;

const out = join(root, NAME + '.html');
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(0), 'KB');
