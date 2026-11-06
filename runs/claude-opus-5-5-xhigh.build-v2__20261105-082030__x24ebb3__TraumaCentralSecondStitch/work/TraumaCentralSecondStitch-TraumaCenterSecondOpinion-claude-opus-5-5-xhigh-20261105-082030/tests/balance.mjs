// node tests/balance.mjs [--pars] : every op on the bot at skills 0, 0.4, 0.7 and 1.0, on Resident.
import { writeFileSync } from 'node:fs';
import { OPS } from '../src/content/ops/index.js';
import { finalTally } from '../src/sim/scoring.js';
import { runBot } from './simlib.mjs';

const SEEDS = [11, 22, 33];
const SKILLS = [0, 0.4, 0.7, 1];
const pars = {};
const rows = [];
for (const id of Object.keys(OPS)) {
  const best = runBot(id, { skill: 1, seed: 7 });
  if (best.sim.status === 'won') {
    let top = finalTally(best.sim).total;
    for (const seed of SEEDS) { const r = runBot(id, { skill: 1, seed }); if (r.sim.status === 'won') top = Math.max(top, finalTally(r.sim).total); }
    pars[id] = Math.round((top * 1.03) / 50) * 50;
  }
}
for (const id of Object.keys(OPS)) OPS[id].par = pars[id] ?? OPS[id].par;
for (const id of Object.keys(OPS)) {
  const row = [id.padEnd(18)];
  for (const skill of SKILLS) {
    let won = 0, clk = 0, vit = 0, mis = 0, ranks = '';
    for (const seed of SEEDS) {
      const { sim } = runBot(id, { skill, seed });
      if (sim.status === 'won') {
        won++;
        const t = finalTally(sim);
        ranks += t.rank;
        clk += sim.clock / sim.clock0;
        vit += sim.tables[0].vitals;
        mis += sim.mistakes;
      } else ranks += '-';
    }
    row.push(`${skill.toFixed(1)}: ${ranks} ${won ? `clk${Math.round((clk / won) * 100)}% v${Math.round(vit / won)} m${(mis / won).toFixed(1)}` : ''}`.padEnd(26));
  }
  rows.push(row.join(' '));
}
console.log(rows.join('\n'));
if (process.argv.includes('--pars')) {
  const text = `// \`par\`, calibrated from the bot at full skill by tests/balance.mjs --pars.\nexport const PARS = ${JSON.stringify(pars)};\n`;
  writeFileSync(new URL('../src/content/ops/pars.js', import.meta.url), text);
  console.log('wrote pars.js', JSON.stringify(pars));
}
