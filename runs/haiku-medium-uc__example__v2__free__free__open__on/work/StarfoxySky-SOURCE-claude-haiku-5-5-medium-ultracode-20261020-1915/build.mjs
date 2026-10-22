// Bundles src/ (with three.js and Rapier) into one self-contained HTML file in the parent folder.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_NAME = 'StarfoxySky-SOURCE-claude-haiku-5-5-medium-ultracode-20261020-1915.html';

const result = await build({
  entryPoints: [join(here, 'src/main.js')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
});

// A literal </script> inside the bundle would end the inline script early.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(here, 'src/style.css'), 'utf8');
const template = readFileSync(join(here, 'src/template.html'), 'utf8');

const html = template
  .replace('/*CSS*/', () => css)
  .replace('/*BUNDLE*/', () => js);

const outPath = join(here, '..', OUT_NAME);
writeFileSync(outPath, html);
console.log(`wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
