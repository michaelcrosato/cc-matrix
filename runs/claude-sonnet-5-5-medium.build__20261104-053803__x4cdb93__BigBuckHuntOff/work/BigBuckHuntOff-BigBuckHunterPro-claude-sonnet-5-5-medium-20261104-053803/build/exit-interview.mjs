// Writes exit-interview.json (work root) from the in-game report, then checks it parses and every field is filled.
import { load } from '../tests/lib/load.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const { BB } = await load(); const R = BB.REPORT;
const out = {
  sourceInformation: R.source,
  testingFeedback: R.testing, engineFeedback: R.engine, promptFeedback: R.prompt,
  aiHub: {
    name: 'BIG BUCK HUNT-OFF', tagline: 'The bucks-only shooting match',
    description: 'A first-person arcade hunting shooter: spot the bucks, shoot clean, pump, never shoot a doe. Three hunts with trophies and bonus games, an x-ray shot chart, one-screen party play and a timed AI Hub Hunt-Off.',
    type: 'Game', genre: 'Shooter', source: 'Big Buck Hunter Pro', series: 'Big Buck Hunter', players: '1–4',
    controls: 'Aim: mouse, WASD or left stick · Fire: click, Space or R2 · Pump: R or Square · Scope: right click or L2 · Call: E or Triangle',
    tags: ['first-person', 'arcade', 'comedy', 'pixel art', 'versus', 'boss fights']
  }
};
const path = new URL('../../exit-interview.json', import.meta.url).pathname;
writeFileSync(path, JSON.stringify(out, null, 2));
const back = JSON.parse(readFileSync(path, 'utf8')); let empty = [];
const walk = (o, p) => { if (Array.isArray(o)) { if (!o.length) empty.push(p); o.forEach((v, i) => walk(v, p + '[' + i + ']')); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], p + '.' + k); else if (o === '' && !p.endsWith('series')) empty.push(p); };
walk(back, '');
console.log('exit-interview.json parses;', empty.length ? 'EMPTY: ' + empty.join(',') : 'all fields filled', '; testing', back.testingFeedback.length, 'engine', back.engineFeedback.length, 'prompt', back.promptFeedback.length);
process.exit(0);
