// Writes ../exit-interview.json (beside the game's HTML) from src/11-about.js, then checks that it parses and answers every field.
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSim } from '../tests/lib/load.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(DEV, '..', 'exit-interview.json');
const SN = loadSim();
const A = SN.ABOUT;
const aiHub = {
  name: 'Dipout HD',
  tagline: 'Stay on the road. Stay in the air.',
  description: 'Anti-gravity racing on banked neon roads, with jumps, pads and five weapons. Quick Race and Time Trial with live dev sliders.',
  type: 'Game',
  genre: 'Racing',
  source: 'Wipeout HD',
  series: 'Wipeout',
  players: '1',
  controls: 'W thrust, A/D steer, Q/E airbrakes, Space fire, Shift absorb (keys); left stick, L2/R2, Cross, Square (pad)',
  tags: ['3d', 'racing', 'vehicles', 'neon', 'arcade'],
};
const doc = {
  sourceInformation: A.sourceInformation,
  testingFeedback: A.testingFeedback,
  engineFeedback: A.engineFeedback,
  promptFeedback: A.promptFeedback,
  aiHub: { ...aiHub, ...(A.aiHub || {}) },
};
writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
const back = JSON.parse(readFileSync(OUT, 'utf8'));
const missing = [];
for (const [k, v] of Object.entries(back.sourceInformation)) if (typeof v !== 'string' || !v.trim()) missing.push('sourceInformation.' + k);
for (const k of ['testingFeedback', 'engineFeedback', 'promptFeedback']) if (!Array.isArray(back[k]) || !back[k].length || back[k].some((x) => !x || !String(x).trim())) missing.push(k);
for (const [k, v] of Object.entries(back.aiHub)) if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) missing.push('aiHub.' + k);
if (missing.length) { console.error('exit interview incomplete: ' + missing.join(', ')); process.exit(1); }
console.log('exit-interview.json written and parsed: every field answered');
