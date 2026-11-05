// Mechanics probe: floor 3 with Veil refused (flag set before the floor begins), god mode. Prints where the run ends.
import { loadSim } from './lib.mjs';
const B = loadSim(); const sim = B.sim; sim.newGame({ seed: 3 }); sim.cheat('god', true);
sim.warp('f3', 1, 2, 2); sim.give('copperWard'); sim.give('brassWard'); sim.S.flags.veilRefused = true;
const bs = B.bot.start(); let lastGi = -1, stuck = 0;
for (let t = 0; t < 120 * 900 && sim.S.floor === 'f3' && !bs.done; t++) {
  const c = B.bot.decide(bs); if (c) sim.cmd(c); sim.update(1 / 120);
  if (bs.gi !== lastGi) { lastGi = bs.gi; stuck = t; }
  if (t - stuck > 120 * 180) { console.log('stuck at goal', bs.gi, JSON.stringify((bs.goals || [])[bs.gi])); break; }
}
console.log('end: floor', sim.S.floor, 'goal', bs.gi, '/', (bs.goals || []).length, 'time', sim.S.time.toFixed(0), 'veilHelped', !!sim.S.flags.veilHelped, 'H2', sim.S.floors.f3.doors.H2.open, 'ironInPack', sim.S.party.roster.some(m => m.pack.some(i => i && i.id === 'ironWard')) || (sim.S.floors.f3.undergate || {}).iron);
