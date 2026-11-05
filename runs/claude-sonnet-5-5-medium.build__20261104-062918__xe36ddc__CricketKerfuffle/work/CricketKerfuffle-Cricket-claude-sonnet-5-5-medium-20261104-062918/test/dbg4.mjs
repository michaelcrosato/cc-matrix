import { G } from './sim.mjs';
const { createMatch, T } = G;
G.RNG.play = G.mkrng(21);
const M = createMatch({ overs: 2, wickets: 3, diff: 0, chaos: 'none' }); M.start();
G.on('swing:miss', e => console.log('  MISS', JSON.stringify(e)));
G.on('contact', e => console.log('  CONTACT', e.q.toFixed(2), e.type, e.err.toFixed(3)));
G.on('ball:end', e => console.log('  END', e.kind, e.runs, 'ballNo', M.ballNo));
let st = 0, swung = false;
while (!M.over && st < 120 * 120 && M.ballNo < 9) {
  let bi = { shot: null, aim: [0, 1] };
  if (M.ph === 'flight' && !M.swing && M.ball.phase === 'delivery') { const tl = (M.ball.y - 364) / Math.max(40, Math.abs(M.ball.vy)); if (tl < .095) { bi.shot = M.ballNo % 2 ? 'ground' : 'loft'; console.log('swing at tl', tl.toFixed(3), 'ball z', M.ball.z.toFixed(1), 'dx', (M.ball.x - M.striker().x).toFixed(1), 'y', M.ball.y.toFixed(0)); } }
  M.step(1 / 120, { bat: bi }); st++;
  if (M.ph === 'inplay') { /* no run */ }
}
