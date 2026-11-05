// node build.mjs: inlines the engine, the AI Hub client and the game's modules into one .html in the folder above
import fs from 'fs'; import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const NAME = 'Fifty Percent Chance of Probable Cause-The Wire (2002-2008) - Keep it as gritty and real as the show-claude-sonnet-5-5-medium-20261102-181334';
const engine = fs.readFileSync(process.env.ENGINE || '/tmp/gh1/eng/my-3d2dge.js', 'utf8');
const session = fs.readFileSync(process.env.SESSION || '/tmp/gh1/hub/session.js', 'utf8');
const files = fs.readdirSync(path.join(here, 'src')).filter(f => f.endsWith('.js')).sort();
const about = fs.readFileSync(path.join(here, 'about-data.json'), 'utf8');
const game = 'const ABOUT = ' + about + ';\n' + files.map(f => fs.readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session.replace(/<\/script>/gi, '<\\/script>')}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-goal" content="Build the case and serve the warrant: highest score wins">
<meta name="hub:session-howto" content="Stick move, L2 camera, X interact, Square shove, R1 shout; or WASD, RMB, E, J, Q">
<meta name="hub:session-minutes" content="8">
<title>Fifty Percent Chance of Probable Cause</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">FIFTY PERCENT CHANCE OF PROBABLE CAUSE</b><span>Starting the detail...</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span></div>
<canvas id="screen"></canvas>
<script>${engine.replace(/<\/script>/gi, '<\\/script>')}</script>
<script>
(() => {
'use strict';
${game.replace(/<\/script>/gi, '<\\/script>')}
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, NAME + '.html'), html);
console.log('wrote', NAME + '.html', (html.length / 1024).toFixed(0) + ' KB');
