// Bundles src/ into the one HTML TASK.md names: engine byte-identical in a text/plain script,
// session.js first, packs as data URLs, everything inline. `node tools/build.mjs`
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const folder = basename(root);
const outHtml = join(root, '..', `${folder}.html`);
mkdirSync(join(root, 'build'), { recursive: true });
const bundlePath = join(root, 'build', 'bundle.js');
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--external:./pixel-engine.js', '--charset=utf8', `--outfile=${bundlePath}`, '--log-level=warning'], { cwd: root, stdio: 'inherit' });

const session = readFileSync(join(root, 'vendor/session.js'), 'utf8');
const engine = readFileSync(join(root, 'kit/pixel-engine.js'), 'utf8');
const credits = readFileSync(join(root, 'kit/CREDITS.md'), 'utf8');
const bundle = readFileSync(bundlePath, 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
if (engine.includes('</script')) throw new Error('engine contains </script: recipe would break');
const pack = (id) => `'packs/${id}.json':'data:application/json;base64,${readFileSync(join(root, `kit/packs/${id}.json`)).toString('base64')}'`;
const meta = (n, c) => `<meta name="${n}" content="${c}">`;
const TITLE = 'Honk If You Owe';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${session}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
${meta('hub:session', '1')}
${meta('hub:session-players', '1-4')}
${meta('hub:session-mode', 'shared-world')}
${meta('hub:session-minutes', '5')}
${meta('hub:session-goal', 'Bank the most beans at the stall before the last bell')}
${meta('hub:session-howto', 'Move: stick or WASD. Do the thing: Cross or E. Sell at the stall.')}
${meta('hub:webgpu', 'required')}
<title>${TITLE}</title>
<style>html,body{margin:0;height:100%;background:#1a1c2c}#app{position:fixed;inset:0}#app canvas{cursor:none}</style>
<script>window.__PIXEL_ASSETS__={${pack('kenney-furniture')},${pack('kenney-nature')}};</script>
<script id="kit-credits" type="text/plain">${credits.replace(/<\/script/gi, '<\\/script')}</script>
<script id="pixel-engine-src" type="text/plain">${engine}</script>
<script>(function(){var u=URL.createObjectURL(new Blob([document.getElementById('pixel-engine-src').textContent],{type:'text/javascript'}));var m=document.createElement('script');m.type='importmap';m.textContent=JSON.stringify({imports:{'./pixel-engine.js':u}});document.head.appendChild(m);})();</script>
</head><body><div id="app"></div><script type="module">${bundle}</script></body></html>`;
writeFileSync(outHtml, html);
copyFileSync(outHtml, join(root, 'tests/hub/game.html'));
console.log(`built ${basename(outHtml)} ${(html.length / 1e6).toFixed(1)} MB`);
