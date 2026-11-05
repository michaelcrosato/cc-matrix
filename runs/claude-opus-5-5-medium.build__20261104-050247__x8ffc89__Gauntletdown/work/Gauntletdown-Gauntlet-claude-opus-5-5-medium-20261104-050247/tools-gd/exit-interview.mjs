// Writes ../exit-interview.json (beside the deliverable) from the game's own About text, so the two match word for word.
import { boot } from '../tests/lib.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const { D } = boot({ quiet: true });
const out = { sourceInformation: D.SOURCE_INFO, testingFeedback: D.FEEDBACK.testing, engineFeedback: D.FEEDBACK.engine, promptFeedback: D.FEEDBACK.prompt, aiHub: D.AIHUB_ENTRY };
const path = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(path, 'utf8')), empty = [];
const walk = (o, p) => { for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v, p + '.' + k); else if (!String(v).trim()) empty.push(p + '.' + k); } };
walk(back, '');
console.log('exit-interview.json written', empty.length ? 'EMPTY: ' + empty.join(', ') : '(parses; every field answered)');
