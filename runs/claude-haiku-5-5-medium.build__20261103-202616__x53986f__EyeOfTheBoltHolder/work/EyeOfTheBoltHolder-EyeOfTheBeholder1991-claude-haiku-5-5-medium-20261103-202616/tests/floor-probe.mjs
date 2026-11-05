// Mechanics probe: one floor played by the bot with god mode (not a balance test). Usage: node tests/floor-probe.mjs f3
import { loadSim } from './lib.mjs';
const B = loadSim(); const sim = B.sim; const F = process.argv[2] || 'f3';
sim.newGame({ seed: 3 }); sim.cheat('god', true);
const st = F === 'f3' ? [1, 2, 2] : F === 'f2' ? [2, 1, 1] : B.FLOORS[F].start; sim.warp(F, st[0], st[1], st[2]); if (F === 'f3') { sim.give('copperWard'); sim.give('brassWard'); }
const bs = B.bot.start(); let stuck = 0, lastGi = -1;
for (let t = 0; t < 120 * 900 && sim.S.floor === F && !bs.done; t++) {
  const c = B.bot.decide(bs); if (c) sim.cmd(c); sim.update(1 / 120);
  if (bs.gi !== lastGi) { lastGi = bs.gi; stuck = t; }
  if (t - stuck > 120 * 180) { console.log('stuck at goal', bs.gi, JSON.stringify(bs.goals[bs.gi]), 'pos', sim.S.party.cx, sim.S.party.cy); break; }
}
console.log('end: floor', sim.S.floor, 'goal', bs.gi, '/', bs.goals.length, 'time', sim.S.time.toFixed(0), 'deeds', Object.keys(sim.S.deeds).join(','), 'secrets', sim.S.secrets);
if (process.env.NEAR) { const S = sim.S, p = S.party; console.log('near', JSON.stringify(S.floors[S.floor].mons.filter(m => m.hp > 0 && Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy) <= 6).map(m => [m.type, m.cx, m.cy, m.state, m.aware])), 'facing', p.dir, 'path', JSON.stringify(B.bot.pathTo(20, 10)), 'decide', JSON.stringify(B.bot.decide(bs))); }
if (process.env.NEAR) console.log('party', JSON.stringify(sim.S.party.roster.map(m => [m.name.split(' ')[0], m.state, m.cool, m.status, m.slots.main && m.slots.main.id])), 'place', JSON.stringify(sim.S.party.place));
if (process.env.UG) { const f = sim.S.floors[F]; console.log('flags', JSON.stringify(sim.S.flags), 'H2', JSON.stringify(f.doors.H2), 'npc', JSON.stringify(sim.S.npcState), 'alc5', JSON.stringify(f.alcoves.AL5), 'undergate', JSON.stringify(f.undergate), 'pos', sim.S.party.cx, sim.S.party.cy, 'path12,6', JSON.stringify(B.bot.pathTo(12, 6)), 'hand', sim.S.party.hand && sim.S.party.hand.item.id, 'pack', sim.S.party.roster.map(m => m.pack.filter(Boolean).map(i => i.id).filter(x => /Ward/.test(x)).join(',')).join('|')); }
