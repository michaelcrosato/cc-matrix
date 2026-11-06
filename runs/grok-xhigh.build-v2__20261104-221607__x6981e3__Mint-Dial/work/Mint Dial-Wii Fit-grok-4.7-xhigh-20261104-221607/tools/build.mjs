import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TITLE } from '../src/data/title.js';
import { exitInterview } from '../src/data/about.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(here, '..');
const workRoot = path.resolve(devRoot, '..');
const stem = `${TITLE}-Wii Fit-grok-4.7-xhigh-20261104-221607`;
const outHtml = path.join(workRoot, `${stem}.html`);
const outJson = path.join(workRoot, 'exit-interview.json');
const bundleDir = path.join(devRoot, '.build');
const bundle = path.join(bundleDir, 'bundle.js');

mkdirSync(bundleDir, { recursive: true });
execFileSync('esbuild', [
  'src/main.js',
  '--bundle',
  '--format=esm',
  '--platform=browser',
  '--target=esnext',
  '--charset=utf8',
  `--outfile=${bundle}`,
  '--log-level=warning',
], { cwd: devRoot, stdio: 'inherit' });

const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const session = readFileSync(path.join(devRoot, 'vendor/hub/session.js'), 'utf8');
const metas = [
  '<meta name="hub:session" content="1">',
  '<meta name="hub:session-players" content="1-4">',
  '<meta name="hub:session-mode" content="ghost">',
  '<meta name="hub:session-goal" content="Score the most across three events. Stay in the circle.">',
  '<meta name="hub:session-howto" content="Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J: step.">',
  '<meta name="hub:session-minutes" content="4">',
  '<meta name="hub:webgpu" content="required">',
].join('\n');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<script>${session}</script>
${metas}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="icon" href="data:,"><title>${TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #0d0b14; overflow: hidden; } #app { position: fixed; inset: 0; }</style>
</head><body><div id="app"></div>
<script type="module">${safe(readFileSync(bundle, 'utf8'))}</script>
</body></html>`;

writeFileSync(outHtml, html);
const interview = exitInterview();
const json = JSON.stringify(interview, null, 2);
JSON.parse(json);
writeFileSync(outJson, json);
if (json.length < 100) throw new Error('exit interview was empty');
console.log(`built ${outHtml}`);
console.log(`wrote ${outJson}`);
