// node tools/exit-interview.mjs: writes ../exit-interview.json from src/data/about.js (the same text as the About pages)
// and checks it parses and every field is filled
import { writeFileSync, readFileSync } from 'node:fs';
import { INFO } from '../src/data/about.js';
const out = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(out, JSON.stringify(INFO, null, 2) + '\n');
const j = JSON.parse(readFileSync(out, 'utf8'));
const empty = []; const walk = (o, p) => { if (Array.isArray(o)) { if (!o.length) empty.push(p); o.forEach((v, i) => walk(v, p + '[' + i + ']')); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p + '.' + k); else if (o === '' || o === null || o === undefined) empty.push(p); };
walk(j, 'root');
const shape = { sourceInformation: ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'], aiHub: ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'] };
for (const [k, keys] of Object.entries(shape)) for (const f of keys) if (!(f in j[k])) empty.push(k + '.' + f + ' missing');
if (j.testingFeedback.length !== 4 || j.engineFeedback.length !== 6 || j.promptFeedback.length !== 4) empty.push('feedback counts');
console.log(empty.length ? 'exit-interview.json: problems: ' + empty.join(', ') : 'exit-interview.json written and checked');
