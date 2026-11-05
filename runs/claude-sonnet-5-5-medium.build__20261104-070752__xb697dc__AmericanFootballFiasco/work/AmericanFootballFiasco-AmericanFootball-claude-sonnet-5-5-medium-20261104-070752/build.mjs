// Bundles index.html + its scripts into one file in the parent folder, and writes exit-interview.json from src/about.json.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = dirname(here);
const NAME = basename(here);   // GameTitle-SOURCE-model-effort-timestamp
const aboutPath = join(here, 'src/about.json');
const about = existsSync(aboutPath) ? JSON.parse(readFileSync(aboutPath, 'utf8')) : { sourceInformation: {}, testingFeedback: [], engineFeedback: [], promptFeedback: [], aiHub: {} };
writeFileSync(join(here, 'src/about.js'), 'globalThis.FF_ABOUT = ' + JSON.stringify(about) + ';\n');
let html = readFileSync(join(here, 'index.html'), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
let sessionSum = '';
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const txt = readFileSync(join(here, src), 'utf8');
  if (src.endsWith('session.js')) sessionSum = createHash('sha256').update(txt).digest('hex');
  return '<script>' + esc(txt) + '</script>';
});
const out = join(root, NAME + '.html');
writeFileSync(out, html);
writeFileSync(join(root, 'exit-interview.json'), JSON.stringify(about, null, 2) + '\n');
const vend = createHash('sha256').update(readFileSync(join(here, 'vendor/session.js'), 'utf8')).digest('hex');
console.log('wrote', out, (html.length / 1048576).toFixed(2) + ' MB', 'session.js sha256', sessionSum.slice(0, 12), sessionSum === vend ? 'matches vendor' : 'MISMATCH');
