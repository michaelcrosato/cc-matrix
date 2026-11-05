// Writes ../exit-interview.json from src/11-data-about.js (the same text the About screen shows) and checks it parses.
import fs from 'node:fs'; import path from 'node:path'; import { loadSim } from '../tests/lib/load.mjs'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SN = loadSim(['00-core', '11-data-about']); const A = SN.ABOUT;
const o = { sourceInformation: A.sourceInformation, testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback,
  aiHub: { name: 'SNIPEOUT HD', tagline: 'Anti-gravity. Anti-everyone.', description: 'An anti-gravity combat racer inspired by Wipeout HD: banked roller-coaster tracks, ten weapons, airbrakes and a deadpan league that sponsors everything. Race, snipe, survive Overclock, play 2-player split screen or race ghosts of other players in a hub session.', type: 'Game', genre: 'Racing', source: 'Wipeout HD', series: 'Wipeout', players: '1–4',
    controls: 'Steer A/D or left stick, thrust W or ✕, airbrakes Q/E or L2/R2, fire Space or □, absorb F or ○', tags: ['3d', 'racing', 'sci-fi', 'vehicles', 'low-poly', 'third-person'] } };
const file = path.resolve(root, '..', 'exit-interview.json'); fs.writeFileSync(file, JSON.stringify(o, null, 2));
const back = JSON.parse(fs.readFileSync(file, 'utf8')); for (const k of Object.keys(back.sourceInformation)) if (!String(back.sourceInformation[k]).trim()) throw new Error('empty ' + k);
console.log('wrote exit-interview.json:', back.testingFeedback.length, back.engineFeedback.length, back.promptFeedback.length, 'answers');
