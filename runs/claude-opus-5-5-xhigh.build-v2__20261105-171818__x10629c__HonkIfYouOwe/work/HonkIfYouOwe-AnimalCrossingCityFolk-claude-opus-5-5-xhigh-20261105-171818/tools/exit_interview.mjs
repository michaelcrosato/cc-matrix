// Writes ../exit-interview.json from the same text the About screen shows, and checks it parses.
import { writeFileSync, readFileSync } from 'node:fs';
import { SOURCE_INFORMATION, FEEDBACK } from '../src/data/about.js';
const answers = (list) => list.map(([, a]) => a);
const out = {
  sourceInformation: SOURCE_INFORMATION,
  testingFeedback: answers(FEEDBACK.testing),
  engineFeedback: answers(FEEDBACK.engine),
  promptFeedback: answers(FEEDBACK.prompt),
  aiHub: {
    name: 'Honk If You Owe',
    tagline: 'A village, a goose, and a very long payment plan',
    description: 'You step off the last bus at the end of the line and, within ninety seconds, owe a goose 8,000 beans. Catch, dig, grow, gossip and pay it off through a sixteen-day year, one bus ride from the neon Big City.',
    type: 'Game',
    genre: 'Life Sim',
    source: 'Animal Crossing: City Folk',
    series: 'Animal Crossing',
    players: '1–4',
    controls: 'Move with stick or WASD; Cross or E to talk and use; Square or Space for tools; Triangle or Tab for Pockets; Options or Esc to pause.',
    tags: ['pixel art', '3d', 'comedy', 'exploration', 'versus'],
  },
};
const path = new URL('../../exit-interview.json', import.meta.url);
writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
JSON.parse(readFileSync(path, 'utf8'));
console.log('exit-interview.json written');
