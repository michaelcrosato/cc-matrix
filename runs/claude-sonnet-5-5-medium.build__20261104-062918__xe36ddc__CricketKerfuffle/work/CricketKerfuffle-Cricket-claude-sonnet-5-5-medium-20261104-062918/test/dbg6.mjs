import { G } from './sim.mjs';
const { createMatch } = G;
let shown = 0;
for (let s = 1; s <= 60 && shown < 3; s++) {
  G.RNG.play = G.mkrng(s * 11);
  const M = createMatch({ overs: 6, wickets: 99, diff: 1, chaos: 'none' }); M.start();
  let st = 0, aim = null, log = [], last = null;
  while (M.inn === 0 && !M.over && st < 120 * 400 && shown < 3) {
    const ai = M.aiBat(); const bi = { shot: null, aim: [0, 1], run: ai.run, runHeld: ai.runHeld, special: false };
    if (M.ph === 'setup') { aim = (() => { const a = (G.RNG.cos() - .5) * 1.4 + Math.PI / 2; return [Math.cos(a), Math.sin(a)]; })(); log = []; }
    if (M.ph === 'flight' && !M.swing && M.ball.phase === 'delivery') { const tl = (M.ball.y - 364) / Math.max(40, Math.abs(M.ball.vy)); if (tl < .09) { bi.shot = 'ground'; bi.aim = aim; } }
    const ph0 = M.ph; M.step(1 / 120, { bat: bi }); st++;
    if (M.ph === 'inplay' && st % 24 === 0 && M.hit && M.hit.q > .5) log.push([M.t.toFixed(1), M.ball.phase, M.ball.x | 0, M.ball.y | 0, Math.hypot(M.ball.vx, M.ball.vy) | 0, 'run:' + ai.run + '/' + ai.runHeld, M.batters.map(b => (b.y | 0) + (b.moving ? 'm' : '')).join(','), 'runs' + M.runs, M.hit.ic ? 'ic' + M.hit.ic.t.toFixed(1) : '']);
    if (ph0 === 'inplay' && M.ph === 'between' && M.last.kind === 'runs' && M.last.runs === 0 && log.length > 5) { console.log('seed', s, 'ended R0 after', log.length); console.log(log.slice(0, 14).map(l => l.join(' ')).join('\n')); shown++; log = []; }
  }
}
