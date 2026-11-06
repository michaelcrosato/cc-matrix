// node tests/balance.mjs [--write]: the bot at several skills on every op. --write sets par from skill 1.
import { writeFileSync } from 'node:fs';
import { createOp, step, drainEvents } from '../src/sim/op.js';
import { createBot, botInput } from '../src/sim/bot.js';
import { OPS, CAMPAIGN_OPS } from '../src/content/ops/index.js';
import { results } from '../src/sim/scoring.js';

export function play(id, skill, seed = 3, difficulty = 'resident', maxMin = 20) {
  const def = OPS[id];
  const seats = def.seats ?? 1;
  const sim = createOp(def, { seed, seats, difficulty });
  const bots = Array.from({ length: seats }, (_, i) => createBot(i, i === 0 ? skill : 0.75, { zone: seats > 1 && sim.opId === 'op9' ? (i === 0 ? 'right' : 'left') : null }));
  let frames = 0;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && frames < maxMin * 3600) {
    step(sim, bots.map((b) => botInput(sim, b)));
    drainEvents(sim);
    frames++;
  }
  return { sim, frames, res: results(sim, def) };
}

if (process.argv[1]?.endsWith('balance.mjs')) {
  const pars = {};
  const list = process.argv.includes('--only') ? [process.argv[process.argv.indexOf('--only') + 1]] : [...CAMPAIGN_OPS, 'pileup', 'c-introit', 'c-lacrimosa', 'c-irae'];
  for (const id of list) {
    const row = [];
    for (const skill of [0, 0.4, 0.7, 1]) {
      const { sim, res, frames } = play(id, skill);
      const vit = sim.tables.map((t) => Math.round(t.vitals)).join('/');
      row.push(`${skill}: ${sim.phase === 'won' ? `${res.rank}${res.pristine ? '*' : ''}` : `LOST(${sim.loseWhy ?? '?'}@s${sim.stage})`} ${Math.round(frames / 60)}s v${vit} m${res.mistakes} clk${Math.round((sim.clock / sim.clockMax) * 100)}% ${res.total}`);
      if (skill === 1) pars[id] = sim.phase === 'won' ? Math.round(res.total * 0.95) : OPS[id].par;
    }
    console.log(id.padEnd(12), row.join(' | '));
  }
  if (process.argv.includes('--write')) writeFileSync(new URL('../src/content/ops/pars.js', import.meta.url), `// Par: the full-skill bot's score. node tests/balance.mjs --write sets it.\nexport const PARS = ${JSON.stringify(pars, null, 2)};\n`);
}
