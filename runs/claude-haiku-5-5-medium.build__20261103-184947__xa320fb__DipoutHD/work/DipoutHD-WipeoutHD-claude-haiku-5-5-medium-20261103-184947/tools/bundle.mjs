// Builds the single deliverable HTML: the pinned engine, the 3D add-on (inline module), the game's src/ files
// (classic scripts, in filename order) and the AI Hub client (byte-identical, first script). CDN imports for three.js and Rapier.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = basename(DEV).replace(/^DipoutHD-WipeoutHD-/, '').replace(/^/, '');
const OUT = join(DEV, '..', 'DipoutHD-WipeoutHD-claude-haiku-5-5-medium-20261103-184947.html');
// A </script> inside inlined JS would end the tag early (the engine's header quotes such tags): escape it.
const read = (p) => readFileSync(join(DEV, p), 'utf8').replaceAll('</script', '<\\/script');

const srcFiles = readdirSync(join(DEV, 'src')).filter((f) => f.endsWith('.js')).sort();
let src = '';
for (const f of srcFiles) src += `\n// ==== src/${f} ====\n` + read(`src/${f}`);

// Checks: no TODO, FIXME, XXX or placeholder left in the game's own code, and no external script tags.
const bad = [];
for (const f of srcFiles) {
  const text = read(`src/${f}`);
  for (const w of ['TODO', 'FIXME', 'XXX', 'placeholder', 'stub']) {
    if (text.toLowerCase().includes(w.toLowerCase())) bad.push(`${f}: contains "${w}"`);
  }
}
const hubClient = read('vendor/aihub-session.js');
if (!src.includes('SN')) bad.push('no SN namespace');
if (bad.length) { console.error('bundle checks failed:\n  ' + bad.join('\n  ')); process.exit(1); }

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>${hubClient}</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Dipout HD</title>
<meta name="hub:type" content="Game"> <meta name="hub:players" content="1">
<style>html, body { margin: 0; height: 100%; overflow: hidden; background: #000 } #stage { position: relative; width: 100%; height: 100%; overflow: hidden } #view, #screen { image-rendering: pixelated } #screen { position: absolute; inset: 0; width: 100%; height: 100% }</style>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
</head><body>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${read('engine/my-3d2dge.js')}</script>
<script>${src}</script>
<script type="module" onerror="window.__sn3dFail='load'">${read('engine/my-3d2dge-3d.js')}</script>
</body></html>
`;
writeFileSync(OUT, html);
console.log(`wrote ${basename(OUT)} (${(statSync(OUT).size / 1024).toFixed(0)} KB, ${srcFiles.length} source files)`);
