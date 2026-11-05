import { load } from './simload.mjs';
const ctx = load(['00-core.js', '10-data.js', '20-sim.js']);
const BZ = ctx.BZ;
let games = 0, fails = 0;
for (let seed = 1; seed <= 6; seed++) {
  const parks = ['corn', 'moon', 'magma', 'mega'];
  const M = BZ.newMatch({ park: parks[seed % 4], seed, attract: true, diff: .6, innings: 3, away: { team: 'hay' }, home: { team: 'cin' } });
  const ev = {}; BZ.on('*', (d, e) => ev[e] = (ev[e] || 0) + 1);
  let steps = 0;
  while (!M.over && steps < 120 * 60 * 20) { BZ.updateSim(1 / 120); steps++; }
  console.log('seed', seed, M.parkDef.id, 'over', M.over, 'score', M.score.join('-'), 'inn', M.inn, 'steps', steps, 'phase', M.phase, JSON.stringify(ev).slice(0, 300));
  BZ.clearListeners();
}
