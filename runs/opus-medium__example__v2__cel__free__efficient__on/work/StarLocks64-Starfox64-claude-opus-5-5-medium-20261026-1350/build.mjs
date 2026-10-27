// Bundles src/ into the single deliverable HTML file in the parent folder.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');
const name = 'StarLocks64-Starfox64-claude-opus-5-5-medium-20261026-1350';
let about = readFileSync(join(src, 'about.txt'), 'utf8');
const testing = (() => { try { return readFileSync(join(src, 'testing.txt'), 'utf8').trim(); } catch { return '- unknown'; } })();
about = about.replace('__TESTING_FEEDBACK__', testing);
const files = readdirSync(src).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
let js = files.map(f => `// ---- ${f} ----\n` + readFileSync(join(src, f), 'utf8')).join('\n');
js = js.replace("import RAPIER from 'rapier';", `import RAPIER from 'rapier';\nconst ABOUT_TEXT = ${JSON.stringify(about)};`);
const comment = about.replace(/--/g, '—').replace(/<!|>/g, '');
const html = readFileSync(join(src, 'template.html'), 'utf8')
  .replace('__ABOUT_COMMENT__', () => comment)
  .replace('__GAME_JS__', () => js);
writeFileSync(join(here, '..', `${name}.html`), html);
writeFileSync(join(here, 'bundle.check.mjs'), js); // for syntax checking
console.log('built', name + '.html', (html.length / 1024).toFixed(0) + ' KB', files.length, 'modules');
