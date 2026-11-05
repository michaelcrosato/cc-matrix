import { loadGame } from './load.mjs';
const { SM, E } = loadGame();
const M = (() => { SM.newMatch({ home: 0, away: 1, venue: 0, halves: 120, attract: true, seed: 3 }); return SM.M; })();
const counts = {}; let steps = 0, phases = {};
const DT = 1 / 120;
const t0 = Date.now();
for (let n = 0; n < 120 * 300 && !M.over; n++) {
  SM.step(DT);
  steps++;
  for (const e of M.events.splice(0)) counts[e.t] = (counts[e.t] || 0) + 1;
  phases[M.phase] = (phases[M.phase] || 0) + 1;
}
console.log('steps', steps, 'seconds', (steps * DT).toFixed(1), 'ms', Date.now() - t0, 'over', M.over, 'score', M.score, 'half', M.half, 'run', M.run.toFixed(1));
console.log(JSON.stringify(counts));
console.log(JSON.stringify(phases));
console.log('possession', M.stats[0].poss.toFixed(1), M.stats[1].poss.toFixed(1), 'tackles', M.stats[0].tackles, M.stats[1].tackles);
