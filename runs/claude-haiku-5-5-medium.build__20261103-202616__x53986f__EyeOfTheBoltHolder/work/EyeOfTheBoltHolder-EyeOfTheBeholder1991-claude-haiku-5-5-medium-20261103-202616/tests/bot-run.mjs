// Runs the walkthrough bot through a floor (or the whole campaign) and reports where it got to. Usage: node tests/bot-run.mjs [seed] [maxSeconds]
import { loadSim } from './lib.mjs';
const B = loadSim();
const seed = +(process.argv[2] || 1), maxS = +(process.argv[3] || 900);
const sim = B.sim; sim.newGame({ seed });
const bs = B.bot.start();
let t = 0, lastFloor = '', events = [];
for (; t < maxS * 120; t++) {
  const c = B.bot.decide(bs);
  if (c) { const r = sim.cmd(c); if (r && r.ok === false && process.env.V) console.log('cmd fail', JSON.stringify(c), r.why); }
  const ev = sim.update(1 / 120);
  for (const e of ev) if (e.t === 'msg' && process.env.V) console.log(' log:', e.text);
  const S = sim.S;
  if (S.floor !== lastFloor) { console.log('floor', S.floor, 'at', (t / 120).toFixed(1), 's, goal', bs.gi, '/', (bs.goals || []).length); lastFloor = S.floor; }
  if (S.over || S.ended || bs.done) break;
}
const S = sim.S, snap = sim.snapshot();
console.log('end: floor', S.floor, 'goal', bs.gi, '/', (bs.goals || []).length, 'done', bs.done, 'over', S.over, 'ended', S.ended, 'time', (t / 120).toFixed(0) + 's');
console.log('party', snap.party.map(p => p.name.split(' ')[0] + ' ' + p.hp + '/' + p.max + ' L' + p.lvl + ' ' + p.state).join(' | '));
console.log('kills', S.stats.kills, 'deeds', Object.keys(S.deeds), 'secrets', S.secrets, 'flags', JSON.stringify(S.flags));
console.log('last log:', S.log.slice(-6).map(l => l.text).join(' / '));
