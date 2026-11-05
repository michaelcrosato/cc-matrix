// Bundle the game: src/*.js -> dist/game.js (for headless tests) and one single .html file in the folder above.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const here = new URL('./', import.meta.url), rd = f => readFileSync(new URL(f, here), 'utf8');
const NAME = 'The-Sopranos-Oh-Come-On-The-Sopranos-claude-sonnet-5-5-medium-20261102-181337';
const about = JSON.parse(rd('about.json'));
const ABOUT = { sourceInformation: about.sourceInformation, testingQ: about.testingQ, testingFeedback: about.testingFeedback, engineQ: about.engineQ, engineFeedback: about.engineFeedback, promptQ: about.promptQ, promptFeedback: about.promptFeedback };
const files = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js')).sort();
let game = files.map(f => rd('src/' + f)).join('\n');
game = game.replace("(() => {\n'use strict';\nconst E = My3D2dge", 'const ABOUT = ' + JSON.stringify(ABOUT) + ';\n(() => {\n\'use strict\';\nconst E = My3D2dge');
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/game.js', here), game);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const title = 'The Sopranos Oh, Come On';
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(rd('vendor/session.js'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Clear Tuesday Collections: shake down the three shops, beat the crew and Fat Dino. Cash and knockouts score.">
<meta name="hub:session-howto" content="Move WASD or stick. Punch J / Square / click. Kick K / Circle / right click. Jump Space / Cross. Rage L / R1 when STRESS is full. Talk E / Triangle. V / R3 changes the camera.">
<meta name="hub:session-minutes" content="4">
<title>${title}</title>
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">THE SOPRANOS OH, COME ON</b><span>Starting · my-3D2dge</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>
<canvas id="screen"></canvas>
<script>${esc(rd('vendor/my-3d2dge.js'))}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
writeFileSync(new URL('../' + NAME + '.html', here), html);
// the exit interview, from the same source as the in-game About screen
const ei = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
writeFileSync(new URL('../exit-interview.json', here), JSON.stringify(ei, null, 2) + '\n');
console.log('built', NAME + '.html', (html.length / 1024).toFixed(0) + ' KB');
