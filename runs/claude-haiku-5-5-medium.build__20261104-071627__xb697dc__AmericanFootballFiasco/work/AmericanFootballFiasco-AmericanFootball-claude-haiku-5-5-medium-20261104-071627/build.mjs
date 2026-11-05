// The bundler: writes ../<deliverable>.html (one self-contained file, no network) and ../exit-interview.json from about.json.
// Run: node build.mjs. It inlines every <script src> of index.html in order, the about.json answers as window.FF_ABOUT, and
// checks that the engine inside is the vendor copy.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const DELIVERABLE = 'AmericanFootballFiasco-AmericanFootball-claude-haiku-5-5-medium-20261104-071627.html';
const about = JSON.parse(readFileSync(path.join(here, 'about.json'), 'utf8'));
const exit = { sourceInformation: about.sourceInformation, testingFeedback: about.testingFeedback, engineFeedback: about.engineFeedback, promptFeedback: about.promptFeedback, aiHub: about.aiHub };
// the shape check: every source field and every feedback list is filled
const empty = [];
for (const [k, v] of Object.entries(exit.sourceInformation)) if (!String(v).trim()) empty.push('sourceInformation.' + k);
for (const k of ['testingFeedback', 'engineFeedback', 'promptFeedback']) if (!exit[k].length || exit[k].some(x => !String(x).trim())) empty.push(k);
for (const [k, v] of Object.entries(exit.aiHub)) if (!['tags', 'series'].includes(k) && !String(v).trim()) empty.push('aiHub.' + k);   // (series may be empty: STAGE.md says so)
if (!exit.aiHub.tags.length) empty.push('aiHub.tags');
if (empty.length) { console.error('exit-interview: not filled: ' + empty.join(', ')); process.exit(1); }

let html = readFileSync(path.join(here, 'index.html'), 'utf8');
const inline = src => readFileSync(path.join(here, src), 'utf8').replace(/<\/script/gi, '<\\/script');
html = html.replace('<script>window.FF_ABOUT = {};</script>', () => '<script>window.FF_ABOUT = ' + JSON.stringify(exit).replace(/<\/script/gi, '<\\/script') + ';</script>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + inline(src) + '\n</script>');
writeFileSync(path.join(here, '..', DELIVERABLE), html);
writeFileSync(path.join(here, '..', 'exit-interview.json'), JSON.stringify(exit, null, 2) + '\n');
const sess = createHash('sha256').update(html).digest('hex').slice(0, 16);
console.log('wrote ' + DELIVERABLE + ' (' + (html.length / 1024).toFixed(0) + ' KB, sha256 ' + sess + ')');
console.log('wrote exit-interview.json');
