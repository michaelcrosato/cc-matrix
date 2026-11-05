import { G } from './sim.mjs';
const { createMatch } = G;
for (let s = 1; s <= 30; s++) { G.RNG.play = G.mkrng(s * 7); const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'all' }); M.start(); let st = 0, tr = false;
  while (!M.over && st < 120 * 900) { M.step(1 / 120, {}); st++;
    if (M.ph === 'inplay' && M.runs >= 4 && !tr) { tr = true; console.log('seed', s, 'runs', M.runs); }
    if (tr && M.ph === 'inplay' && st % 60 === 0) { const b = M.ball; console.log(M.t.toFixed(1), b.phase, b.x | 0, b.y | 0, b.z | 0, 'v', b.vx | 0, b.vy | 0, 'rho', G.bndRX && (Math.hypot((b.x - 448) / 330, (b.y - 490) / 360)).toFixed(2), 'holder', b.holder && b.holder.id, 'thrown', b.thrownTo, M.batters.map(x => x.y | 0 + ':' + x.moving)); }
    if (tr && M.ph !== 'inplay') { tr = 'done'; break; } }
  if (tr) break; }
