// Writes ../exit-interview.json from src/11-data-about.js (SN.ABOUT) in exactly TASK.md's shape, and checks it parses
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext('globalThis.SN = {};', ctx);
vm.runInContext(readFileSync(new URL('../src/11-data-about.js', import.meta.url), 'utf8'), ctx);
const A = ctx.SN.ABOUT, si = A.sourceInformation;
const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
const out = {
  sourceInformation: Object.fromEntries(keys.map(k => [k, String(si[k] ?? 'unknown')])),
  testingFeedback: A.testingFeedback.map(String), engineFeedback: A.engineFeedback.map(String), promptFeedback: A.promptFeedback.map(String),
  aiHub: Object.assign({}, A.aiHub, { tags: A.aiHub.tags.slice() })
};
const problems = [];
for (const k of keys) if (!out.sourceInformation[k]) problems.push('sourceInformation.' + k);
if (out.testingFeedback.length !== 4) problems.push('testingFeedback needs 4'); if (out.engineFeedback.length !== 6) problems.push('engineFeedback needs 6'); if (out.promptFeedback.length !== 4) problems.push('promptFeedback needs 4');
for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']) if (out.aiHub[k] === undefined) problems.push('aiHub.' + k);
const text = JSON.stringify(out, null, 2) + '\n', path = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(path, text); JSON.parse(readFileSync(path, 'utf8'));
console.log(problems.length ? 'exit-interview.json written, but: ' + problems.join(', ') : 'exit-interview.json written and parses');
