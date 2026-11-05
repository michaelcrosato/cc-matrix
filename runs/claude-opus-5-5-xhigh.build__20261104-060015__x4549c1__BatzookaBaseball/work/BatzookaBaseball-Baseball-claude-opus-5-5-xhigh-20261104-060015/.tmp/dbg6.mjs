import { load } from '../tests/lib/load.mjs';
const { BZ, game } = load();
BZ.cosmetic = false;
const M = BZ.newMatch({ away: 'krakens', home: 'comets', seed: 5, innings: 9, fast: true });
BZ.match.newAtBat(M); M.bases = [null, null, null];
BZ.play.begin(M, 'batted');
const P = M.park, p = M.fielders.find(f => f.pos === 'P'), b1 = M.fielders.find(f => f.pos === '1B');
p.x = P.H.x - 33; p.y = P.H.y - 181; for (const f of M.fielders) f.react = 0;
b1.x = P.H.x + 206; b1.y = P.H.y - 212; b1.role = 'cover'; b1.coverBase = 1; b1.tx = b1.x; b1.ty = b1.y;
BZ.play.give(M, p, 'ground');
BZ.play.startThrow(M, p, 1, .8);
for (let i = 0; i < 100; i++) {
  BZ.play.update(M, 1 / 120);
  const b = M.ball;
  if (i % 4 === 0 || b.mode !== 'thrown') console.log(i, b.mode, Math.round(b.x - P.H.x), Math.round(b.y - P.H.y), b.z.toFixed(1), 'v', Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), 'd1B', Math.hypot(b.x - b1.x, b.y - b1.y).toFixed(1), '1B', Math.round(b1.x - P.H.x), Math.round(b1.y - P.H.y), b1.state, b1.role, 'tried', b1.tried, b.version);
  if (b.mode === "held" && i > 20) break;
}
