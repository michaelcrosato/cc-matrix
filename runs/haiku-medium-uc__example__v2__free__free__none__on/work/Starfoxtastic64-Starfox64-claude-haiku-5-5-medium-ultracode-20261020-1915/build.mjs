// Bundles src/ into one self-contained HTML file in the work folder root.
// Three.js, Rapier (with its WASM embedded) and all game code are inlined; nothing is fetched at runtime.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFO } from './src/credits.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', 'Starfoxtastic64-Starfox64-claude-haiku-5-5-medium-ultracode-20261020-1915.html');

const result = await build({
  entryPoints: [path.join(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2022',
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// The header comment is generated from credits.js, so it always matches the About screen.
const comment = (rows) => rows.map(([k, v]) => `  ${k}: ${v}`).join('\n');
const notes = [
  '<!--',
  '  STARFOXTASTIC 64: an original spiritual successor to Starfox 64 (N64). Single-file build.',
  '',
  '  Source Information',
  comment(SOURCE_INFO),
  '',
  '  Engine Feedback',
  ENGINE_FEEDBACK.map(([q, a]) => `  - ${q} ${a}`).join('\n'),
  '',
  '  Prompt Feedback',
  PROMPT_FEEDBACK.map(([q, a]) => `  - ${q} ${a}`).join('\n'),
  '-->',
].join('\n');

const template = await readFile(path.join(here, 'src/index.html'), 'utf8');
// Function replacers keep "$" sequences in the bundle from being read as replacement patterns.
const html = template
  .replace('<!--@@BUILD_NOTES@@-->', () => notes)
  .replace('<!--@@SCRIPT@@-->', () => `<script>\n${js}\n</script>`);

await writeFile(OUT, html);
console.log(`wrote ${path.basename(OUT)} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
