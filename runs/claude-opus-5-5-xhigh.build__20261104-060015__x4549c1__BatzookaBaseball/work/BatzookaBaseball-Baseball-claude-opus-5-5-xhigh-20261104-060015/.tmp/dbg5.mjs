import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
let found = 0;
for (let g = 0; g < 4 && found < 2; g++) {
  const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 300 + g, innings: 9, fast: true }); let s = 0;
  while (M.phase !== 'final' && s++ < 360000) {
    BZ.match.step(M, 1 / 120);
    if (M.phase === 'inPlay' && M.play && Math.abs(M.play.t - 12) < 1 / 240) {
      found++;
      const P = M.park, h = BZ.play.holder(M);
      console.log('STUCK play', M.play.kind, 'ball', M.ball.mode, M.ball.x.toFixed(0) - P.H.x, M.ball.y.toFixed(0) - P.H.y, M.ball.z.toFixed(1), 'v', M.ball.vx.toFixed(0), M.ball.vy.toFixed(0), M.ball.vz.toFixed(0), 'bounced', M.ball.bounced, 'fair', M.ball.fair, 'holder', h && h.pos, h && [Math.round(h.x - P.H.x), Math.round(h.y - P.H.y), h.throwT.toFixed(2), h.state]);
      console.log(' runners', M.runners.map(r => [r.isBatter ? 'B' : r.start, r.p.toFixed(2), r.goal, r.state, r.forced, r.mustTag]));
      console.log(' fielders', M.fielders.map(f => f.pos + ':' + f.role + ':' + f.state + ':' + Math.round(f.x - P.H.x) + ',' + Math.round(f.y - P.H.y) + (f.has ? '*' : '')).join(' '));
      console.log(' chaser', M.play.chaser && M.play.chaser.pos, 'pred', !!M.play.pred, 'settleT', M.play.settleT.toFixed(2), 'lastThrow', JSON.stringify(M.play.lastThrow));
      // run a little more and see what changes
      for (let k = 0; k < 120; k++) BZ.match.step(M, 1 / 120);
      const h2 = BZ.play.holder(M);
      console.log(' +1s ball', M.ball.mode, Math.round(M.ball.x - P.H.x), Math.round(M.ball.y - P.H.y), 'holder', h2 && h2.pos, 'runners', M.runners.map(r => [r.p.toFixed(2), r.goal, r.state]));
      if (found >= 2) break;
    }
  }
  BZ.endMatch(M);
}
