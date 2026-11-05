import { G } from './sim.mjs';
const { createMatch } = G; const d = {}; 
G.on('runs', e => d[e.n] = (d[e.n] || 0) + 1);
const wk = {}; G.on('ball:end', e => { const k = e.kind + (e.legal ? '' : '*'); wk[k] = (wk[k] || 0) + 1; });
for (let s = 1; s <= 30; s++) { G.RNG.play = G.mkrng(s * 7); const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'all' }); M.start(); let st = 0; while (!M.over && st < 120 * 900) { M.step(1 / 120, {}); st++; } }
console.log(d, wk);
