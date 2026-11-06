// Bundle game.js + the engine + the hub's session client into ONE html file.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const STEM = 'TraumaCantina-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-162024';
const TITLE = 'TRAUMA CANTINA', TAGLINE = 'Second Helpings';
mkdirSync('dist', { recursive: true });
execFileSync('esbuild', ['game.js', '--bundle', '--format=esm', '--platform=browser', '--target=es2022', '--outfile=dist/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const js = readFileSync('dist/bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const session = readFileSync('vendor/session.js', 'utf8');
const pack = readFileSync('packs/kenney-furniture.json').toString('base64');
const icon = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0d0b14"/><path d="M2 17h7l3-8 4 16 3-8h11" fill="none" stroke="#40ff90" stroke-width="2.5"/><circle cx="16" cy="16" r="3" fill="#e8443a"/></svg>').toString('base64');
const meta = `<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
<meta name="hub:session-goal" content="Keep the patient alive and top the team score">
<meta name="hub:session-howto" content="Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.">
<meta name="hub:type" content="Game">
<meta name="hub:source" content="Trauma Center: Second Opinion">`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>
${session}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${TITLE} - ${TAGLINE}</title>
<meta name="description" content="A surgical drama in pixel art: precise instruments, a terrifying nurse, and a man-made disease named Mercy.">
<meta name="theme-color" content="#0d0b14">
<link rel="icon" href="${icon}">
${meta}
<style>html,body{margin:0;height:100%;background:#0d0b14}#app{position:fixed;inset:0}</style>
</head><body><div id="app"></div>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">
${js}
</script></body></html>`;
writeFileSync('dist/game.html', html);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync('vendor/' + f, 'dist/' + f);
writeFileSync(resolve(root, '..', STEM + '.html'), html);
console.log('built', (html.length / 1e6).toFixed(2) + ' MB');
