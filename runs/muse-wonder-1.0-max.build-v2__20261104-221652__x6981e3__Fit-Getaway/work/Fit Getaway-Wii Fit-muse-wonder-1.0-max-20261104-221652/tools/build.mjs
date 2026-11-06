import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { TITLE } from '../src/data/title.js';
import { ABOUT } from '../src/data/about.js';

mkdirSync('.build', { recursive: true });
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--platform=browser', '--target=esnext', '--charset=utf8', '--outfile=.build/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const HUB_METAS = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Score the most across three events. Stay in the circle.">
<meta name="hub:session-howto" content="Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J: step.">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">`;
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<script>${readFileSync('vendor/hub/session.js', 'utf8')}</script>
${HUB_METAS}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="icon" href="data:,"><title>${TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #0d0b14; } #app { position: fixed; inset: 0; }</style>
</head><body><div id="app"></div>
<script type="module">${safe(readFileSync('.build/bundle.js', 'utf8'))}</script>
</body></html>`;
const OUT = '../Fit Getaway-Wii Fit-muse-wonder-1.0-max-20261104-221652.html';
writeFileSync(OUT, html);
// Also keep a copy in dev folder for check.mjs / harness.
writeFileSync('game.html', html);
writeFileSync('index.html', `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${TITLE}</title><style>html,body{margin:0;height:100%;background:#0d0b14}#app{position:fixed;inset:0}</style></head><body><div id="app"></div><script type="module" src="./src/main.js"></script></body></html>\n`);
// Exit interview from single source of truth.
const exit = { sourceInformation: ABOUT.sourceInformation, testingFeedback: ABOUT.testingFeedback, engineFeedback: ABOUT.engineFeedback, promptFeedback: ABOUT.promptFeedback, aiHub: ABOUT.aiHub };
writeFileSync('../exit-interview.json', JSON.stringify(exit, null, 2) + '\n');
JSON.parse(readFileSync('../exit-interview.json', 'utf8'));
console.log('Built', OUT, (html.length / 1048576).toFixed(2) + ' MB', 'title:', TITLE);
