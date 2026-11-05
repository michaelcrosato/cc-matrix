// Mechanics probe: the Bolt-Holder's fight with god mode (not a balance test). Prints phases, locks, bolts and the end.
import { loadSim } from './lib.mjs';
const B = loadSim(); const sim = B.sim; sim.newGame({ seed: 3 }); sim.cheat('god', true);
sim.warp('f4', 6, 11, 0); const bs = B.bot.start();
let last = '', maxT = 120 * 900;
for (let t = 0; t < maxT && !sim.S.ended; t++) {
  const c = B.bot.decide(bs); if (c) sim.cmd(c);
  for (const e of sim.update(1 / 120)) if (['bossPhase', 'bolts', 'relock', 'lockTurn', 'bossDead', 'bossTele', 'held'].includes(e.t)) console.log((t / 120).toFixed(1), e.t, JSON.stringify(e).slice(0, 90));
  const b = sim.S.boss; const k = b ? JSON.stringify(Object.values(b.locks).map(l => l.turned)) + b.phase : '';
  if (k !== last) { last = k; if (b) console.log((t / 120).toFixed(1), 'state', k, 'hp', (sim.S.floors.f4.mons.find(m => m.type === 'boltholder') || {}).hp, 'goal', bs.gi, JSON.stringify(bs.goals[bs.gi])); }
  if (sim.S.ended || sim.S.over) break;
}
console.log('end: ended', sim.S.ended, 'over', sim.S.over, 'floor', sim.S.floor, 'goal', bs.gi, 'time', sim.S.time.toFixed(0), 'eyeDead', !!sim.S.flags.eyeDead);
