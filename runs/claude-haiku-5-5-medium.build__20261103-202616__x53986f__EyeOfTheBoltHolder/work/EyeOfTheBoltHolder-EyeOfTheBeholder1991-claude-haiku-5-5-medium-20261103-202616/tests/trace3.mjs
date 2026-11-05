// Plays the bot through floors and prints the party and the goal at intervals on the floor named by F (default f3).
import { loadSim } from './lib.mjs';
const B = loadSim(); const sim = B.sim; sim.newGame({ seed: +(process.argv[2] || 1) }); const bs = B.bot.start();
const F = process.env.F || 'f3'; let n = 0;
for (let t = 0; t < 120 * 2400 && !bs.done; t++) {
  const c = B.bot.decide(bs); if (c) sim.cmd(c);
  const ev = sim.update(1 / 120);
  const S = sim.S;
  if (S.floor === F && t % 600 === 0 && n++ < 60) console.log((t / 120).toFixed(0), 'goal', bs.gi, (bs.goals[bs.gi] || {}).kind, (bs.goals[bs.gi] || {}).type || (bs.goals[bs.gi] || {}).id || '', 'pos', S.party.cx, S.party.cy, 'hp', S.party.roster.map(m => m.state[0] + m.hp + '/' + m.max + 'L' + m.lvl).join(' '), 'mons', monsOnCount(S));
  if (S.floor === F) for (const e of ev) if (e.t === 'dead' || e.t === 'down') console.log('  ', (t / 120).toFixed(1), e.t, S.party.roster[e.m] && S.party.roster[e.m].name);
  if (S.over) { console.log('OVER at', (t / 120).toFixed(0), 'on', S.floor); break; }
}
function monsOnCount(S) { return S.floors[S.floor].mons.filter(m => m.hp > 0).length; }
console.log('end', sim.S.floor, 'goal', bs.gi, 'time', sim.S.time.toFixed(0));
