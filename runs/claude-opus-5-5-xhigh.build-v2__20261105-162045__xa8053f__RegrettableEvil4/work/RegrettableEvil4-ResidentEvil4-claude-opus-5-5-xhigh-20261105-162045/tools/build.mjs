// Bundles src/main.js into the single deliverable HTML, and writes the exit interview.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045';
const OUT = resolve(DEV, '..', `${NAME}.html`);

mkdirSync(join(DEV, 'dist'), { recursive: true });
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=es2022', '--outfile=dist/bundle.js', '--log-level=warning'], { cwd: DEV, stdio: 'inherit' });
const bundle = readFileSync(join(DEV, 'dist/bundle.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync(join(DEV, 'vendor/hub/session.js'), 'utf8');

const assets = {};
for (const p of ['packs/kenney-nature.json', 'packs/kenney-castle.json']) {
  if (process.env.WITH_PACKS && existsSync(join(DEV, p))) assets[p] = `data:application/json;base64,${readFileSync(join(DEV, p)).toString('base64')}`;
}
const assetTag = Object.keys(assets).length ? `<script>window.__PIXEL_ASSETS__=${JSON.stringify(assets)};</script>\n` : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>${session}</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Hold the quay together until dawn">
<meta name="hub:session-howto" content="Move, hold aim, fire; kick stunned enemies; revive friends">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Regrettable Evil 4</title>
<style>html,body{background:#1a1c2c;margin:0;height:100%}</style>
${assetTag}</head>
<body><div id="app"></div><script type="module">${bundle}</script></body>
</html>
`;
writeFileSync(OUT, html);

// The exit interview comes from the same data as the About screen.
const about = await import(join(DEV, 'src/data/about.js'));
const interview = about.exitInterview();
const text = JSON.stringify(interview, null, 2);
JSON.parse(text);
writeFileSync(resolve(DEV, '..', 'exit-interview.json'), `${text}\n`);
if (process.argv.includes('--verbose')) console.log(`${OUT} ${(html.length / 1048576).toFixed(1)} MB`);
