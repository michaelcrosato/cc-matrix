// Bundles src/main.js into the single deliverable HTML (see PLAN section 2).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const G = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(G, '..');
const NAME = 'CreditorCreek-AnimalCrossingCityFolk-claude-sonnet-5-5-medium-20261105-171824';
const TITLE = 'Creditor Creek';
const read = (p) => readFileSync(join(G, p), 'utf8');

const engine = read('kit/pixel-engine.js');
if (engine !== read('src/pixel-engine.js')) throw new Error('src/pixel-engine.js differs from kit');
if (engine.includes('</script')) throw new Error('engine contains </script');

const out = await build({
  entryPoints: [join(G, 'src/main.js')], bundle: true, format: 'esm', target: 'esnext', write: false,
  external: ['./pixel-engine.js'], logLevel: 'error', legalComments: 'none',
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const packs = ['kenney-furniture'];
const assets = {};
for (const p of packs) assets[`packs/${p}.json`] = 'data:application/json;base64,' + readFileSync(join(G, `kit/packs/${p}.json`)).toString('base64');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>${read('vendor/session.js')}</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Bank the most beans before the last bell">
<meta name="hub:session-howto" content="Move: stick or WASD. Do the thing: Cross or E. Sell at the stall.">
<meta name="hub:webgpu" content="required">
<title>${TITLE}</title>
<style>html,body{margin:0;height:100%;background:#1a1c2c;overflow:hidden}#app{position:fixed;inset:0}#fail{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#1a1c2c;color:#f4f4f4;font:20px/1.5 monospace;text-align:center;padding:24px}</style>
<script>window.__PIXEL_ASSETS__=${JSON.stringify(assets)};</script>
<script id="pixel-engine-src" type="text/plain">${engine}</script>
<script id="credits-src" type="text/plain">${read('kit/CREDITS.md').replace(/<\/script/gi, '<\\/script')}</script>
<script>(function(){var u=URL.createObjectURL(new Blob([document.getElementById('pixel-engine-src').textContent],{type:'text/javascript'}));var m=document.createElement('script');m.type='importmap';m.textContent=JSON.stringify({imports:{'./pixel-engine.js':u}});document.head.appendChild(m);})();</script>
</head><body><div id="app"></div><div id="fail"></div><script type="module">${js}</script></body></html>`;
writeFileSync(join(ROOT, NAME + '.html'), html);
mkdirSync(join(G, 'tests/hub'), { recursive: true });
writeFileSync(join(G, 'tests/hub/game.html'), html);
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(G, 'hubref', f), join(G, 'tests/hub', f));
console.log('built', NAME + '.html', (html.length / 1e6).toFixed(1) + ' MB');
