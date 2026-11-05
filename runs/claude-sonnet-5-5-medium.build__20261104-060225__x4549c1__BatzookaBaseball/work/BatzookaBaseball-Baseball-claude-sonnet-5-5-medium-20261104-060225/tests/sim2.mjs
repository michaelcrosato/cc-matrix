import { load } from './simload.mjs';
const ctx = load(['00-core.js', '10-data.js', '20-sim.js']);
const BZ = ctx.BZ; const diff = +(process.argv[2] ?? .5), att = process.argv[3] === 'att';
const tot = {}; let runs = 0, n = 30, stuck = 0;
for (let seed = 1; seed <= n; seed++) {
  const parks = ['corn', 'moon', 'magma', 'mega'];
  const M = BZ.newMatch({ park: parks[seed % 4], seed, attract: att, diff, innings: 3, away: { team: 'hay' }, home: { team: 'cin' } });
  BZ.on('*', (d, e) => tot[e] = (tot[e] || 0) + 1);
  let steps = 0;
  while (!M.over && steps < 120 * 60 * 20) { BZ.updateSim(1 / 120); steps++; }
  if (!M.over) stuck++;
  runs += M.score[0] + M.score[1];
  BZ.clearListeners();
}
const pg = {}; for (const k in tot) pg[k] = +(tot[k] / n).toFixed(1);
console.log('games', n, 'stuck', stuck, 'runs/game', (runs / n).toFixed(1)); console.log(JSON.stringify(pg));
