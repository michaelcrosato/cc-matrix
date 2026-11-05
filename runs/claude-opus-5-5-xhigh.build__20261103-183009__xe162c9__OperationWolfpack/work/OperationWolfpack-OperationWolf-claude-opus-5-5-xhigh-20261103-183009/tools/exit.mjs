// Writes ../exit-interview.json from WP.ABOUT (the same text as the About pages and the chat reply), then checks it.
import { writeFileSync, readFileSync } from 'node:fs';
import { load } from '../tests/lib.mjs';
const { WP } = load(), A = WP.ABOUT, S = A.sourceInformation;
const out = { sourceInformation: { date: S.date, source: S.source, plan: S.plan, genre: S.genre, perspective: S.perspective, tech: S.tech, artDirection: S.artDirection, animation: S.animation, audio: S.audio, online: S.online, testing: S.testing, research: S.research, environment: S.environment, model: S.model, usage: S.usage },
  testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback, aiHub: A.aiHub };
const file = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(file, 'utf8'));
console.log('exit-interview.json written:', Object.keys(back.sourceInformation).length, 'fields,', back.testingFeedback.length, back.engineFeedback.length, back.promptFeedback.length, 'answers');
