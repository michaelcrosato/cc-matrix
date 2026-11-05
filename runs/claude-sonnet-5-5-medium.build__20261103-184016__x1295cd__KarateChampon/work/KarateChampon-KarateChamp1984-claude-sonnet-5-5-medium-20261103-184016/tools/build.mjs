// Concatenate src/*.js into one IIFE (build/game.js), then bundle everything into the single .html and write exit-interview.json.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NAME = path.basename(root), out = path.resolve(root, '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `/* ---- ${f} ---- */\n` + rd('src/' + f)).join('\n').replace('/*__ABOUT__*/null', JSON.stringify(JSON.parse(rd('data/about.json'))));
const aboutJson = fs.readFileSync(path.join(root, 'data/about.json'), 'utf8');
const game = `(() => {\n'use strict';\nconst E = My3D2dge;\n${body}\n})();\n`;
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build/game.js'), game);
execFileSync('node', ['--check', path.join(root, 'build/game.js')]);
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const about = JSON.parse(rd('data/about.json'));
const meta = (n, c) => `<meta name="${n}" content="${c.replace(/"/g, '&quot;')}">`;
const splash = `<div id="e3-boot" role="status" style="position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;padding:20px;background:#05040a;color:#a9a1c8;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace"><style>@keyframes e3-run{from{transform:translateX(-100%)}to{transform:translateX(340%)}}@keyframes e3-late{to{opacity:1}}</style><b style="color:#f4f0ff;font-size:16px;letter-spacing:.08em">KARATE CHAMPON</b><span>Starting · my-3D2dge</span><span style="display:block;height:4px;max-width:440px;overflow:hidden;background:#ffffff14"><span style="display:block;width:30%;height:100%;background:#d9b77c;animation:e3-run 1.2s ease-in-out infinite"></span></span><span style="opacity:0;animation:e3-late .3s 12s forwards">Still starting. If this stays, the game's script did not run: reload, or open the browser's console.</span></div>`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${esc(rd('vendor/aihub/session.js'))}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Karate Champon</title>
${meta('description', about.aiHub.description)}
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Win bouts: first to 2 points. Winner stays on (Kachinuki). Most bout wins takes the round.">
<meta name="hub:session-howto" content="Move: left stick/WASD · Strike: right stick, face buttons or IJKL">
<style>html, body { margin: 0; height: 100%; background: #000; overflow: hidden } #screen { width: 100%; height: 100%; display: block; image-rendering: pixelated; touch-action: none }</style>
</head>
<body>
${splash}
<canvas id="screen"></canvas>
<script>${esc(rd('engine/my-3d2dge.js'))}</script>
<script>${esc(rd('assets/kc-assets.js'))}</script>
<script>${esc(game)}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, NAME + '.html'), html);
// the exit interview comes from the same data file the About screen reads
const ei = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
const text = JSON.stringify(ei, null, 2); JSON.parse(text);
fs.writeFileSync(path.join(out, 'exit-interview.json'), text + '\n');
console.log('built', NAME + '.html', (html.length / 1024 | 0) + ' KB');
