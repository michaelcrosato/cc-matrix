// Bundles src/ into a single HTML file in the parent (deliverable) folder.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { ABOUT_SECTIONS } from './src/about.js';

const NAME = 'StarfoxBarrel64-Starfox64-claude-opus-5-5-medium-20261020-1915';
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.180.0';
const RAPIER = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';

const res = await build({
  entryPoints: ['src/main.js'], bundle: true, format: 'esm', write: false, minify: false, target: 'es2022',
  external: ['three', 'three/*', '@dimforge/rapier3d-compat'], legalComments: 'none',
  define: { __DEV__: process.argv[2] === 'dev' ? 'true' : 'false' }, minifySyntax: process.argv[2] !== 'dev',
});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const comment = ABOUT_SECTIONS.slice(0, 3).map((s) => `${s.h}\n${s.p.map((p) => '- ' + p.replace(/--/g, '—')).join('\n')}`).join('\n\n');
const importmap = {
  imports: {
    three: `${THREE}/build/three.webgpu.js`,
    'three/webgpu': `${THREE}/build/three.webgpu.js`,
    'three/tsl': `${THREE}/build/three.tsl.js`,
    'three/addons/': `${THREE}/examples/jsm/`,
    '@dimforge/rapier3d-compat': RAPIER,
  },
};
const html = `<!--
STARFOX BARREL 64 · single-file demo
${comment}
-->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Starfox Barrel 64</title>
<link rel="icon" href="data:,">
<script type="importmap">${JSON.stringify(importmap)}</script>
</head>
<body>
<script type="module">
${js}
</script>
</body>
</html>
`;
const out = process.argv[2] === 'dev' ? 'dist/index.html' : `../${NAME}.html`;
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KB');
