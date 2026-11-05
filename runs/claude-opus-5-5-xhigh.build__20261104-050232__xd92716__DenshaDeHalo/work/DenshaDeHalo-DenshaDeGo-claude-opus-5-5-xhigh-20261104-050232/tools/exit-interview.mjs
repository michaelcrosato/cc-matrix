// node tools/exit-interview.mjs: writes ../exit-interview.json from DH.ABOUT (src/58-about-text.js), the same words the
// About & Credits pages show, in exactly TASK.md's shape, and checks it parses and every value is filled
import { writeFileSync, readFileSync } from 'node:fs';
import { load } from '../test/lib.mjs';
const { DH } = load(), A = DH.ABOUT, S = A.sourceInformation;
const out = {
  sourceInformation: { date: S.date, source: S.source, plan: S.plan, genre: S.genre, perspective: S.perspective, tech: S.tech, artDirection: S.artDirection, animation: S.animation, audio: S.audio, online: S.online, testing: S.testing, research: S.research, environment: S.environment, model: S.model, usage: S.usage },
  testingFeedback: A.testingFeedback.slice(), engineFeedback: A.engineFeedback.slice(), promptFeedback: A.promptFeedback.slice(),
  aiHub: { name: A.aiHub.name, tagline: A.aiHub.tagline, description: A.aiHub.description, type: A.aiHub.type, genre: A.aiHub.genre, source: A.aiHub.source, series: A.aiHub.series, players: A.aiHub.players, controls: A.aiHub.controls, tags: A.aiHub.tags.slice() }
};
const file = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(file, 'utf8')), empty = [];
const walk = (o, p) => { for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v, p + '.' + k); else if (v === '' || v === null || v === undefined) empty.push(p + '.' + k); } };
walk(back, '');
if (back.testingFeedback.length !== 4 || back.engineFeedback.length !== 6 || back.promptFeedback.length !== 4) empty.push('feedback counts');
if (back.aiHub.tags.length < 3 || back.aiHub.tags.length > 6) empty.push('tags count');
console.log(empty.length ? 'FAIL exit-interview: ' + empty.join(', ') : 'wrote exit-interview.json (parses, every field filled)');
process.exit(empty.length ? 1 : 0);
