// Batch of seeded CPU matches through the simulation alone: event counts, scores and any stall (phase held too long)
import { loadGame } from './load.mjs';
const { SM } = loadGame();
const DT = 1 / 120, N = +(process.argv[2] || 10), counts = {}, phaseTotals = {};
let scores = [], stalls = 0, worst = 0;
for (let k = 0; k < N; k++) {
  SM.newMatch({ home: k % 5, away: (k + 1 + (k % 3)) % 5 === k % 5 ? (k + 2) % 5 : (k + 1 + (k % 3)) % 5, venue: k % 4, halves: 120, attract: true, seed: 100 + k });
  const M = SM.M; let lastPhase = M.phase, held = 0, steps = 0;
  for (let n = 0; n < 120 * 900 && !M.over; n++) {
    SM.step(DT); steps++;
    for (const e of M.events.splice(0)) counts[e.t] = (counts[e.t] || 0) + 1;
    phaseTotals[M.phase] = (phaseTotals[M.phase] || 0) + 1;
    if (M.phase === lastPhase) held++; else { held = 0; lastPhase = M.phase; }
    worst = Math.max(worst, held * DT);
    if (held * DT > 30 && !['full', 'play'].includes(M.phase)) { stalls++; console.log('STALL', k, M.phase, (held * DT).toFixed(1)); break; }
  }
  scores.push(M.score.join('-') + (M.over ? '' : ' (unfinished)'));
}
console.log('scores', scores.join(' | '));
console.log('events', JSON.stringify(counts));
console.log('phase steps', JSON.stringify(phaseTotals));
console.log('stalls', stalls, 'longest single-phase hold (s)', worst.toFixed(1));
