// Single-file build: esbuild bundle + session.js unmodified + hub metas. Also writes exit-interview.json from src/data/about.js.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TITLE, FILE_BASE } from '../src/data/title.js';

const root = new URL('..', import.meta.url).pathname;
process.chdir(root);
mkdirSync('.build', { recursive: true });
execFileSync('esbuild', ['src/main.js', '--bundle', '--loader:.md=text', '--format=esm', '--platform=browser', '--target=esnext', '--charset=utf8', '--outfile=.build/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
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
const out = `../${FILE_BASE}.html`;
writeFileSync(out, html);
writeFileSync(`${FILE_BASE}.html`, html); // copy beside the sources for the kit's check.mjs and the harness
console.log(`built ${out} (${(html.length / 1e6).toFixed(2)} MB)`);
if (existsSync('src/data/about.js')) {
  const { exitInterview } = await import('../src/data/about.js');
  const json = JSON.stringify(exitInterview(), null, 2);
  JSON.parse(json);
  writeFileSync('../exit-interview.json', json);
  console.log('wrote exit-interview.json');
}
