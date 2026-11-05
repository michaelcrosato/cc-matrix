import { G } from './sim.mjs';
const { createMatch } = G;
const dist = {}; let n = 0, runsTot = 0, balls = 0;
for (let s = 1; s <= 40; s++) {
  G.RNG.play = G.mkrng(s * 5);
  const M = createMatch({ overs: 3, wickets: 99, diff: 1, chaos: 'none', cheat: !!process.env.CHEAT, attract: false }); M.start();
  const off = G.on('ball:end', e => { const k = e.kind === 'boundary' ? 'B' + e.runs : e.kind === 'wicket' ? 'W:' + e.how : e.kind === 'runs' ? 'R' + e.runs : e.kind; dist[k] = (dist[k] || 0) + 1; n++; });
  let st = 0; while (M.inn === 0 && !M.over && st < 120 * 400) { M.step(1 / 120, {}); st++; } runsTot += M.sides[0].score; balls += M.sides[0].balls; off();
}
console.log(n, Object.entries(dist).sort().map(([k, v]) => k + ':' + (v / n * 100).toFixed(0) + '%').join(' '), 'rpb', (runsTot / balls).toFixed(2));
