// Writes ../exit-interview.json from the game's own data, then proves it parses.
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_INFO } from '../src/content/about.js';
import { FEEDBACK } from '../src/content/feedback.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = (l) => l.map(([, ans]) => ans);
const o = {
  sourceInformation: { date: SOURCE_INFO.date, source: SOURCE_INFO.source, plan: SOURCE_INFO.plan, genre: SOURCE_INFO.genre, perspective: SOURCE_INFO.perspective, tech: SOURCE_INFO.tech, artDirection: SOURCE_INFO.artDirection, animation: SOURCE_INFO.animation, audio: SOURCE_INFO.audio, online: SOURCE_INFO.online, testing: SOURCE_INFO.testing, research: SOURCE_INFO.research, environment: SOURCE_INFO.environment, model: SOURCE_INFO.model, usage: 'added on import' },
  testingFeedback: a(FEEDBACK.testing), engineFeedback: a(FEEDBACK.engine), promptFeedback: a(FEEDBACK.prompt),
  aiHub: { name: 'Far Pry 2', tagline: 'Everything fails. The grass remembers.', description: 'An original first-person war-zone survival shooter: guns that rust and jam, a fever on a timetable, grass fires that follow the wind, three friends for hire and a map that turns out to be the plot. Includes the Cash Run shared-world mode for 1 to 4 players.', type: 'Game', genre: 'Shooter', source: 'Far Cry 2', series: 'Far Cry', players: '1–4',
    controls: 'Pad: sticks move and look, R2 fire, L2 aim, Square use or reload, L1 heal, D-pad up map. Keyboard and mouse: WASD, mouse, LMB fire, RMB aim, E use, R reload, Q heal, M map.', tags: ['first-person', 'pixel art', 'co-op', 'versus', 'vehicles', 'story'] },
};
const path = resolve(root, '..', 'exit-interview.json');
writeFileSync(path, JSON.stringify(o, null, 2) + '\n'); JSON.parse(readFileSync(path, 'utf8')); console.log('wrote', path);
