import { load } from '../tests/lib/load.mjs';
const { BZ, game, logs } = load();
BZ.cosmetic = false;
const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 1, innings: 9, fast: true });
let last = '', t0 = Date.now(), n = 0;
const counts = {};
for (let i = 0; i < 120 * 600; i++) {
  BZ.match.step(M, 1 / 120); n++;
  const key = M.phase + ':' + (M.ab ? M.ab.sub : '') ;
  counts[key] = (counts[key] || 0) + 1;
  if (M.phase === 'final') break;
  if (Date.now() - t0 > 20000) { console.log('TIME'); break; }
}
console.log('steps', n, 'ms', Date.now() - t0, 'phase', M.phase, M.inning, M.half, 'outs', M.outs, 'score', M.teams[0].runs, M.teams[1].runs, 'pitches', M.pitchCount);
console.log(counts);
console.log('errors', game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack||'').split('\n')[1]).slice(0, 5), logs.slice(0, 5));
if (M.play) console.log('play', M.play.kind, M.play.t.toFixed(1), M.play.done, M.play.deadReason, 'ball', M.ball.mode, M.runners.map(r => [r.p.toFixed(2), r.goal, r.state]));
