// Bundles src/ into one self-contained HTML file in the parent folder.
// Three.js, Rapier (with its WASM inlined) and all game code are included, so the
// output runs offline. Build-time only: esbuild is not shipped in the output.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = 'Starfock64-Starfox64-claude-haiku-5-5-medium-20261020-1915.html';

const result = await esbuild.build({
  entryPoints: [join(here, 'src/main.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  target: 'es2022',
  loader: { '.txt': 'text' },
  legalComments: 'none',
  logLevel: 'warning',
});
let js = result.outputFiles[0].text;
// Keep the inline module from closing its own <script> tag.
js = js.replaceAll('</script', '<\\/script');

const info = readFileSync(join(here, 'src/source-info.txt'), 'utf8').trim();
const body = `Starfock 64: a spiritual successor to Starfox 64 for N64.\n\n${info}\n`;
if (body.includes('--')) throw new Error('HTML comment must not contain "--"');
const comment = `<!--\n${body}-->`;

let html = readFileSync(join(here, 'index.template.html'), 'utf8');
html = html.replace('<!--SOURCE_COMMENT-->', () => comment);
html = html.replace('/*BUNDLE*/', () => js);
writeFileSync(join(here, '..', OUT), html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
