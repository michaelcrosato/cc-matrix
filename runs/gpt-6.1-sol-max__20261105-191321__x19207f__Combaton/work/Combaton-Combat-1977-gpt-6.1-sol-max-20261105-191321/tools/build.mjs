import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(path.join(root, p), 'utf8');
const parts = await Promise.all(
  [
    'src/page.html',
    'src/style.css',
    'vendor/session.js',
    'src/audio.js',
    'src/engine.js',
    'src/app.js',
  ].map(read),
);
let page = parts[0]
  .replace('<!-- HUB_CLIENT -->', `<script>\n${parts[2]}\n</script>`)
  .replace('/* STYLES */', parts[1]);
const imports =
  "import * as THREE from 'three/webgpu';\nimport { color, normalWorld, vec3, float, floor, dot, max, texture } from 'three/tsl';\nimport RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';\n";
const record = JSON.parse(await readFile(path.join(root, '..', 'exit-interview.json'), 'utf8'));
page = page.replace(
  '/* GAME_CODE */',
  () => imports + parts.slice(3).join('\n\n').replace('__EXIT_RECORD__', JSON.stringify(record)),
);
const name = path.basename(root) + '.html';
await writeFile(path.join(root, '..', name), page);
console.log(name);
