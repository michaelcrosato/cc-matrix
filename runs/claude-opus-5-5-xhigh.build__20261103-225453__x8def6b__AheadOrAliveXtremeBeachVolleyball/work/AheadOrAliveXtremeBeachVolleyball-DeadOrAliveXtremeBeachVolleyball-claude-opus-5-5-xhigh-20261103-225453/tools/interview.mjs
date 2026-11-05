// Writes ../exit-interview.json (TASK.md's shape) from the About pages' data (G.ABOUT in src/55-about.js), so the
// game's About & Credits, the interview and the final report say the same things. node tools/interview.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load, DEV } from '../test/lib/load.mjs';
const { G } = load({});
const A = G.ABOUT, S = Object.fromEntries(A.source);
const [genre, ...rest] = S['Genre and Perspective'].split('. Matches use ');
const out = {
  sourceInformation: { date: S.Date, source: S.Source, plan: S.Plan, genre: genre + '.', perspective: 'Matches use ' + rest.join('. Matches use '), tech: S.Tech, artDirection: S['Art Direction'], animation: S.Animation, audio: S.Audio, online: S.Online, testing: S.Testing, research: S.Research, environment: S.Environment, model: S.Model, usage: S.Usage },
  testingFeedback: A.testing.map(([, a]) => a), engineFeedback: A.engine.map(([, a]) => a), promptFeedback: A.prompt.map(([, a]) => a),
  aiHub: { name: 'Ahead or Alive: Xtreme Beach Volleyball', tagline: 'Stay ahead. Stay alive. Stay tanned.', description: 'A five-day island vacation of 2-on-2 beach volleyball, friendships, swimsuit shopping, pool hopping and casino nights, ending with a match for the island against its owner.', type: 'Game', genre: 'Sports', source: 'Dead or Alive Xtreme Beach Volleyball', series: 'Dead or Alive', players: '1–4', controls: 'Stick/WASD move · Cross/Space/click hit on time · Square/E shot and block · Circle/Shift dive · Triangle/Q call', tags: ['sports', 'versus', 'co-op', 'pixel art', 'comedy', 'arcade'] }
};
const file = join(DEV, '..', 'exit-interview.json');
writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(file, 'utf8')), empty = [];
const walk = (o, p) => { for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v, p + '.' + k); else if (v === '' || v === null || v === undefined) empty.push(p + '.' + k); } };
walk(back, '');
console.log(file, 'parses;', empty.length ? 'EMPTY: ' + empty.join(', ') : 'every field filled', '; testing', back.testingFeedback.length, 'engine', back.engineFeedback.length, 'prompt', back.promptFeedback.length);
