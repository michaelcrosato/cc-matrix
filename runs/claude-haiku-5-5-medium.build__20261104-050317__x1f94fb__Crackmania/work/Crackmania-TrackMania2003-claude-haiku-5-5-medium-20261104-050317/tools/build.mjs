// Builds the single file: the game and the 3D engine, three.js and Rapier bundled into one inline module; the 2D engine
// and the AI Hub session script inline as classic scripts before it. Writes the HTML one folder up (the root).
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url)), DEV = join(HERE, '..');
const OUT = join(DEV, '..', 'Crackmania-TrackMania2003-claude-haiku-5-5-medium-20261104-050317.html');
const VENDOR = join(DEV, 'engine', 'vendor');
const vendorMap = {
  'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js',
  'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js',
};
const vendorPlugin = {
  name: 'vendor',
  setup(build) {
    build.onResolve({ filter: /^(three|three\/webgpu|three\/tsl|@dimforge\/rapier3d-simd-compat)$/ }, args => ({ path: join(VENDOR, vendorMap[args.path]) }));
  },
};
const result = await esbuild.build({
  entryPoints: [join(DEV, 'src', 'entry.js')], bundle: true, format: 'esm', minify: true, write: false, legalComments: 'inline',
  plugins: [vendorPlugin], target: 'es2022', logLevel: 'warning',
});
const bundle = result.outputFiles[0].text;
const engine2d = readFileSync(join(DEV, 'engine', 'my-3d2dge.js'), 'utf8');
const session = readFileSync(join(DEV, 'hub', 'session.js'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>
${safe(session)}
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CRACKMANIA</title>
<style>
html, body { margin: 0; height: 100%; overflow: hidden; background: #000; }
#stage { position: relative; width: 100%; height: 100%; overflow: hidden; }
#view { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
#screen { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>
${safe(engine2d)}
</script>
<script type="module">
${safe(bundle)}
</script>
</body>
</html>
`;
writeFileSync(OUT, html);
console.log('wrote', OUT, (html.length / 1024 / 1024).toFixed(2) + ' MB');
