// Writes ../exit-interview.json from the Source Information and feedback kept in src/49-about.js, then checks it parses and is complete.
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { BZ: {} }; vm.createContext(ctx); vm.runInContext(readFileSync(resolve(root, 'src/49-about.js'), 'utf8'), ctx);
const S = ctx.BZ.SOURCE_INFO, F = ctx.BZ.FEEDBACK;
const out = {
  sourceInformation: { date: S.date, source: S.source, plan: 'PLAN.md', genre: S.genre, perspective: S.perspective, tech: S.tech, artDirection: S.artDirection, animation: S.animation, audio: S.audio, online: S.online, testing: S.testing, research: S.research, environment: S.environment, model: S.model, usage: S.usage },
  testingFeedback: F.testing, engineFeedback: F.engine, promptFeedback: F.prompt,
  aiHub: {
    name: 'BATZOOKA BASEBALL', tagline: 'Rocket bats, fireballs and benches that clear',
    description: 'An over-the-top arcade baseball game: pitch fireballs, swing a rocket-powered bat, rob homers over the wall and save a cornfield ballpark on a four-park tour. Includes a Home Run Derby that plays in AI Hub rounds.',
    type: 'Game', genre: 'Sports', source: 'Baseball', series: '', players: '1–4',
    controls: 'Stick or WASD aims, Cross/Space swings or pitches, Square/E power move, face buttons or 1-4 throw to a base, Shift turbo, mouse aims the bat and clicks bases',
    tags: ['arcade', 'versus', 'pixel art', 'comedy', 'story', 'boss fights']
  }
};
const text = JSON.stringify(out, null, 2);
const back = JSON.parse(text);
const empty = [];
const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') walk(v, p + k + '.'); else if (v === '' && k !== 'series') empty.push(p + k); } };
walk(back, '');
if (empty.length) { console.error('EMPTY FIELDS: ' + empty.join(', ')); process.exit(1); }
if (back.testingFeedback.length !== 4 || back.engineFeedback.length !== 6 || back.promptFeedback.length !== 4) { console.error('wrong answer counts'); process.exit(1); }
writeFileSync(resolve(root, '..', 'exit-interview.json'), text + '\n');
console.log('wrote exit-interview.json (' + text.length + ' bytes), parses, every field answered');
