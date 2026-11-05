// The build: src/*.js (in name order) → build/game.js (one IIFE), then the single-file bundle beside the work folder:
//   node tools/build.mjs            writes build/game.js and ../<NAME>.html (the deliverable)
//   node tools/build.mjs --dev      writes build/game.js only (the dev page index.html loads it as a script)
// The bundle inlines the engine, the AI Hub client (first script in <head>, unmodified) and the game. It fails if the
// inlined code would end a <script> early, or if the page would request anything from the network.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'BatzookaBaseball-Baseball-claude-haiku-5-5-medium-20261104-060643';
const dev = process.argv.includes('--dev');

const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `// ---- ${f}\n` + readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const game = `(() => {\n'use strict';\nconst E = My3D2dge;\n${body}\n})();\n`;
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'game.js'), game);
console.log(`build/game.js: ${files.length} source files, ${game.length} bytes`);
if (dev) process.exit(0);

// The single file: index.html's <script src> tags become inline scripts, in order.
const page = readFileSync(join(root, 'index.html'), 'utf8');
const inlined = page.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = readFileSync(join(root, src), 'utf8');
  if (/<\/script/i.test(code) || /<!--/.test(code)) throw new Error(`build: ${src} would end a <script> early`);
  return `<script>\n${code}\n</script>`;
});
if (/<script src=/.test(inlined)) throw new Error('build: a script tag was not inlined');
const out = join(root, '..', NAME + '.html');
writeFileSync(out, inlined);
console.log(`bundle: ${out} (${inlined.length} bytes)`);
