// Bundle src/main.js into one HTML file in the parent folder, and write exit-interview.json beside it.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FILE_NAME, TITLE } from '../src/config.js';
import { EXIT_INTERVIEW } from '../src/data/about.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.resolve(root, '..');
const OUT = path.join(OUT_DIR, FILE_NAME + '.html');
mkdirSync(path.join(root, 'dist'), { recursive: true });
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=es2022', '--outfile=dist/bundle.js', '--log-level=warning'], { cwd: root, stdio: 'inherit' });
let bundle = readFileSync(path.join(root, 'dist/bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync(path.join(root, 'vendor/hub/session.js'), 'utf8');
const pack = readFileSync(path.join(root, 'packs/kenney-nature.json')).toString('base64');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Hold the quay together until dawn">
<meta name="hub:session-howto" content="Move, hold aim, fire; kick stunned enemies; revive friends">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<script>window.__PIXEL_ASSETS__={'packs/kenney-nature.json':'data:application/json;base64,${pack}'};</script>
<style>html,body{margin:0;height:100%;background:#0b0b14}</style>
</head><body><div id="app"></div><script type="module">${bundle}</script></body></html>`;
writeFileSync(OUT, html);
writeFileSync(path.join(OUT_DIR, 'exit-interview.json'), JSON.stringify(EXIT_INTERVIEW, null, 2));
JSON.parse(readFileSync(path.join(OUT_DIR, 'exit-interview.json'), 'utf8'));
console.log('built', OUT, (html.length / 1e6).toFixed(2) + ' MB');
