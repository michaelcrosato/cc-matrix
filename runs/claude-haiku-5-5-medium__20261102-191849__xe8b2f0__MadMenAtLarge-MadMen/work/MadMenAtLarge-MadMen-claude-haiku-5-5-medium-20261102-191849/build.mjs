// Bundles the dev page into the one deliverable: every <script src> is inlined, in order, and the page is written to the
// work folder's root as <GameTitle>-<SOURCE>-<model>-<stamp>.html. Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'MadMenAtLarge-MadMen-claude-haiku-5-5-medium-20261102-191849.html');
let html = readFileSync(join(here, 'index.html'), 'utf8');
let count = 0;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  count++;
  // a script's text can't close its own tag: escape any "</script" inside it
  const body = readFileSync(join(here, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + body + '\n</script>';
});
if (html.includes('<script src=')) throw new Error('a script was not inlined');
writeFileSync(OUT, html);
console.log(`inlined ${count} scripts into ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
