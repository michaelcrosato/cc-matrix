import { G } from './sim.mjs';
const { createMatch } = G;
const dist = {}; let n = 0;
for (let s = 1; s <= 40; s++) {
  G.RNG.play = G.mkrng(s * 11);
  const M = createMatch({ overs: 6, wickets: 99, diff: 1, chaos: 'none' }); M.start();
  let st = 0, aim = null;
  const off = G.on('ball:end', e => { const k = e.kind === 'boundary' ? 'B' + e.runs : e.kind === 'wicket' ? 'W:' + e.how : e.kind === 'runs' ? 'R' + e.runs : e.kind; dist[k] = (dist[k] || 0) + 1; n++; });
  while (M.inn === 0 && !M.over && st < 120 * 400) {
    const ai = M.aiBat(); const bi = { shot: null, aim: [0, 1], run: ai.run, runHeld: ai.runHeld, special: false };
    if (M.ph === 'setup') aim = (() => { const a = (G.RNG.cos() - .5) * 1.4 + Math.PI / 2; return [Math.cos(a), Math.sin(a)]; })();
    if (M.ph === 'flight' && !M.swing && M.ball.phase === 'delivery') { const tl = (M.ball.y - 364) / Math.max(40, Math.abs(M.ball.vy)); if (tl < .09 + (G.RNG.cos() - .5) * .05) { bi.shot = G.RNG.cos() < .75 ? 'ground' : 'loft'; bi.aim = aim; } }
    M.step(1 / 120, { bat: bi }); st++;
  }
  off();
}
console.log(n, Object.entries(dist).sort().map(([k, v]) => k + ':' + (v / n * 100).toFixed(0) + '%').join(' '));
