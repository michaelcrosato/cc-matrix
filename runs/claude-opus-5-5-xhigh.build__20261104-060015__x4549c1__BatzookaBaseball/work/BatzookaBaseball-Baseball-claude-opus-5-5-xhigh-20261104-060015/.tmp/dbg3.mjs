import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
const tot = { runs: 0, games: 0, pa: 0, k: 0, hr: 0, ab: 0, h: 0, err: 0, steps: 0, bb: 0 };
const n = +process.argv[2] || 3, t0 = Date.now();
for (let g = 0; g < n; g++) {
  const M = BZ.newMatch({ away: ['krakens','eruptors','meteors'][g%3], home: 'comets', seed: 100 + g, innings: 9, fast: true });
  let steps = 0; while (M.phase !== 'final' && steps < 120 * 3000) { BZ.match.step(M, 1 / 120); steps++; }
  BZ.endMatch(M);
  tot.steps += steps; tot.games++; tot.runs += M.teams[0].runs + M.teams[1].runs; tot.err += M.teams[0].errors + M.teams[1].errors;
  for (const s of Object.values(M.stats)) { tot.ab += s.AB; tot.h += s.H; tot.hr += s.HR; tot.k += s.K; tot.bb += s.BB; }
  if (process.argv[3]) console.log('game', g, M.phase, M.inning, 'score', M.teams[0].runs, M.teams[1].runs, 'hits', M.teams[0].hits, M.teams[1].hits, 'E', M.teams[0].errors, M.teams[1].errors, 'clock', M.clock.toFixed(0));
}
const pa = tot.ab + tot.bb;
console.log('runs/team/game', (tot.runs / tot.games / 2).toFixed(2), 'AVG', (tot.h / tot.ab).toFixed(3), 'K%', (tot.k / pa * 100).toFixed(1), 'HR%', (tot.hr / pa * 100).toFixed(1), 'BB%', (tot.bb / pa * 100).toFixed(1), 'E/g', (tot.err / tot.games).toFixed(2), 'ms/step', ((Date.now() - t0) / tot.steps).toFixed(3));
console.log('errors', game.errors.map(e => e.message).slice(0, 5));
