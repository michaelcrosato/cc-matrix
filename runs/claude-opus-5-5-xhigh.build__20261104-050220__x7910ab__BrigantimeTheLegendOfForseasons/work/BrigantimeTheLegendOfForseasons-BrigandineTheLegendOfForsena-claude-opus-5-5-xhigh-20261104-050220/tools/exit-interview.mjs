// writes ../exit-interview.json from the game's own About data (G.ABOUT), so the file, the About pages and the final
// reply carry the same text
import { boot, DEV } from '../tests/lib.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const { G } = await boot('#title'), A = G.ABOUT, src = Object.fromEntries(A.source);
const genre = src.Genre, persp = src.Perspective;
const j = {
  sourceInformation: { date: src.Date, source: src.Source, plan: src.Plan, genre, perspective: persp, tech: src.Tech, artDirection: src['Art Direction'], animation: src.Animation, audio: src.Audio, online: src.Online, testing: src.Testing, research: src.Research, environment: src.Environment, model: src.Model, usage: src.Usage },
  testingFeedback: A.testing, engineFeedback: A.engine, promptFeedback: A.prompt,
  aiHub: {
    name: A.title, tagline: A.tagline,
    description: 'A seasonal war of monster-binding knights: muster castles, summon beasts and fight twelve-bell hex battles to restart the Wheel of Seasons before time stops forever.',
    type: 'Game', genre: 'Strategy', source: 'Brigandine: The Legend of Forsena', series: 'Brigandine', players: '1–4',
    controls: 'Stick/WASD: cursor · ✕/Enter: select · ○/Esc: back · □/Space: commands · △/I: info · L1/R1 or Tab: cycle',
    tags: ['fantasy', 'story', 'versus', 'pixel art', 'retro', 'boss fights']
  }
};
const out = join(DEV, '..', 'exit-interview.json'); writeFileSync(out, JSON.stringify(j, null, 2) + '\n');
JSON.parse(readFileSync(out, 'utf8')); console.log('wrote ' + out);
