import { G } from './sim.mjs';
const { createMatch, T } = G;
const ex = {}, gr = {}, out = {}, bnd = {};
G.on('extra', d => ex[d.kind] = (ex[d.kind] || 0) + 1);
G.on('release', d => gr[d.type + ':' + d.grade] = (gr[d.type + ':' + d.grade] || 0) + 1);
G.on('wicket', d => out[d.how] = (out[d.how] || 0) + 1);
G.on('boundary', d => bnd[d.n] = (bnd[d.n] || 0) + 1);
let tot = 0, runs = 0, balls = 0;
for (let s = 1; s <= 30; s++) {
  G.RNG.play = G.mkrng(s * 7);
  const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'all' }); M.start();
  let st = 0; while (!M.over && st < 120 * 900) { M.step(1 / 120, {}); st++; }
  tot++; runs += M.sides[0].score + M.sides[1].score; balls += M.sides[0].balls + M.sides[1].balls;
  if (!M.over) console.log('STUCK', s, M.snapshot());
}
console.log({ tot, rpb: (runs / balls).toFixed(2), runs, balls, ex, gr, out, bnd });
let sc = [], ww = [];
for (let s = 1; s <= 30; s++) { G.RNG.play = G.mkrng(s * 3); const M = createMatch({ overs: 2, wickets: 3, diff: 1, chaos: 'all' }); M.start(); let st = 0; while (!M.over && st < 120 * 900) { M.step(1 / 120, {}); st++; } sc.push(M.sides[0].score, M.sides[1].score); ww.push(M.sides[0].wkts, M.sides[1].wkts); }
console.log('avg score', (sc.reduce((a, b) => a + b) / sc.length).toFixed(1), 'avg wkts', (ww.reduce((a, b) => a + b) / ww.length).toFixed(2));
