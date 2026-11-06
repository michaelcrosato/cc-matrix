#!/usr/bin/env node
// Build one HTML file: the session client first and verbatim, the furniture pack as a data URL, the
// bundle inline. Writes dist/game.html for the tests and the deliverable where the brief wants it.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_STEM = 'TraumaCentralSecondStitch-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-082030';
const TITLE = 'Trauma Central: Second Stitch';
const TAGLINE = 'The truth, stat.';
const DESC = 'A surgical drama in pixel art: precise instruments against the clock, melodrama played straight, and a cure that is worse than any disease.';
const ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1a1c2c"/><rect x="13" y="5" width="6" height="22" fill="#f4f4f4"/><rect x="5" y="13" width="22" height="6" fill="#f4f4f4"/><path d="M2 17h7l2-5 3 10 3-14 3 9h10" stroke="#b13e53" stroke-width="2" fill="none"/></svg>')}`;

process.chdir(ROOT);
mkdirSync('dist', { recursive: true });
execFileSync('esbuild', ['game.js', '--bundle', '--format=esm', '--platform=browser', '--target=es2022', '--outfile=dist/bundle.js', '--log-level=warning', '--external:node:*'], { stdio: 'inherit' });
const js = readFileSync('dist/bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync('vendor/session.js', 'utf8'); // verbatim: the hub compares it byte for byte
const pack = readFileSync('packs/kenney-furniture.json').toString('base64');
const tags = {
  'hub:session': '1', 'hub:session-players': '1-4', 'hub:session-mode': 'shared-world', 'hub:session-minutes': '4', 'hub:webgpu': 'required',
  'hub:session-goal': 'Keep the patient alive and top the team score',
  'hub:session-howto': 'Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.',
  'hub:type': 'Game', 'hub:source': 'Trauma Center: Second Opinion',
};
const metas = Object.entries(tags).map(([k, v]) => `<meta name="${k}" content="${v}">`).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE} — ${TAGLINE}</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#1a1c2c">
<link rel="icon" href="${ICON}">
${metas}
<style>html,body{margin:0;height:100%;background:#0d0b14}#app{position:fixed;inset:0}</style>
</head><body><div id="app"></div>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">
${js}
</script></body></html>`;
writeFileSync('dist/game.html', html);
writeFileSync(join('..', `${FILE_STEM}.html`), html);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join('vendor', f), join('dist', f));
console.log(`built dist/game.html (${(html.length / 1048576).toFixed(1)} MB)`);
