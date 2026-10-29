import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = dirname(fileURLToPath(import.meta.url));
const root = dirname(dev);
const name = 'Arena Afterburn-Rocket League-grok-4.7-xhigh-20261028-2106.html';
const credits = readFileSync(join(dev, 'src/credits.js'), 'utf8');
const start = credits.indexOf('Source Information');
const end = credits.lastIndexOf('`;');
if (start < 0 || end < 0) throw new Error('credits block missing');
const body = credits.slice(start, end).replaceAll('--', ' - ');

const built = await esbuild.build({
  entryPoints: [join(dev, 'src/main.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  external: ['three/webgpu', '@dimforge/rapier3d-compat'],
  write: false,
  legalComments: 'none',
});
const js = built.outputFiles[0].text;
if (js.includes('WebGLRenderer') || js.includes('forceWebGL')) {
  throw new Error('bundle grew a WebGL path');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arena Afterburn</title>
<!--
${body}
-->
<script type="importmap">
{
  "imports": {
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.webgpu.js",
    "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs"
  }
}
</script>
</head>
<body>
<script type="module">
${js}
</script>
</body>
</html>
`;
writeFileSync(join(root, name), html);
console.log(`wrote ${name} (${html.length} bytes)`);
