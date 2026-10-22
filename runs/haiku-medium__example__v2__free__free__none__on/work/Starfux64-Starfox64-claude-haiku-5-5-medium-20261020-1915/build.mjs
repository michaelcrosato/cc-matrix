// Bundles src/ into one HTML file in the parent folder.
// three and rapier stay external and resolve through the import map in index.template.html.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outName = 'Starfux64-Starfox64-claude-haiku-5-5-medium-20261020-1915.html';
const outFile = resolve(here, '..', outName);

const result = await build({
  entryPoints: [join(here, 'src', 'main.js')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  write: false,
  minify: false,
  external: ['three', 'three/webgpu', 'three/tsl', '@dimforge/rapier3d-compat'],
});
const js = result.outputFiles[0].text;
const template = await readFile(join(here, 'index.template.html'), 'utf8');
const header = await readFile(join(here, 'source-comment.txt'), 'utf8');
const html = template
  .replace('<!--SOURCE_COMMENT-->', header.trimEnd())
  .replace('/*BUNDLE*/', () => js);
await writeFile(outFile, html);
console.log(`wrote ${outFile} (${(html.length / 1024).toFixed(1)} KB)`);
