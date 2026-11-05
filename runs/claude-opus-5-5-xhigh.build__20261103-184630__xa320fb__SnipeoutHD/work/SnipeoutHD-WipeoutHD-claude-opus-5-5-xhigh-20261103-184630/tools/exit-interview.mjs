// Writes ../exit-interview.json (beside the game's HTML) from src/11-data-about.js, in TASK.md's exact shape, and checks it.
import { load } from '../tests/lib/vm.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const { SN } = load({ quiet: true, files: ['00-core.js', '11-data-about.js'] });
const A = SN.ABOUT, S = A.source;
const out = {
  sourceInformation: { date: S.date, source: S.source, plan: S.plan, genre: S.genre, perspective: S.perspective, tech: S.tech, artDirection: S.artDirection, animation: S.animation, audio: S.audio, online: S.online, testing: S.testing, research: S.research, environment: S.environment, model: S.model, usage: S.usage },
  testingFeedback: A.testingFeedback.slice(), engineFeedback: A.engineFeedback.slice(), promptFeedback: A.promptFeedback.slice(),
  aiHub: Object.assign({}, A.aiHub, { tags: A.aiHub.tags.slice() })
};
const f = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(f, 'utf8'));
const empty = [];
for (const [k, v] of Object.entries(back.sourceInformation)) if (!v || !String(v).trim()) empty.push('sourceInformation.' + k);
if (back.testingFeedback.length !== 4) empty.push('testingFeedback (4 answers)'); if (back.engineFeedback.length !== 6) empty.push('engineFeedback (6 answers)'); if (back.promptFeedback.length !== 4) empty.push('promptFeedback (4 answers)');
for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls']) if (!back.aiHub[k]) empty.push('aiHub.' + k);
if (!(back.aiHub.tags.length >= 3 && back.aiHub.tags.length <= 6)) empty.push('aiHub.tags (3-6)');
if (empty.length) { console.log('exit-interview.json: missing ' + empty.join(', ')); process.exit(1); }
console.log('exit-interview.json written and parses:', f.pathname);
