const PAY = { '7': 100, BAR: 30, S: 20, V: 12, P: 8, C: 5 };
const lineWin = s => { const ch = s.filter(x => x === 'R').length; if (s.every(x => x === 'S')) return PAY.S; for (const t of ['7', 'BAR', 'V', 'P', 'C']) if (s.every(x => x === t || x === 'S')) return PAY[t]; return ch === 3 ? 10 : ch === 2 ? 5 : ch === 1 ? 2 : 0; };
const rtp = c => { // c: counts {7,BAR,S,V,P,C,R} summing to 21 (same each reel); exact over symbol probabilities
  const syms = Object.keys(c), p = k => c[k] / 21; let e = 0;
  for (const a of syms) for (const b of syms) for (const d of syms) e += p(a) * p(b) * p(d) * lineWin([a, b, d]);
  return e; };
let best = null;
for (let R = 1; R <= 5; R++) for (let C = 2; C <= 6; C++) for (let P = 2; P <= 6; P++) for (let V = 2; V <= 5; V++) for (let B = 1; B <= 3; B++) {
  const S = 1, s7 = 1, blank = 21 - (R + C + P + V + B + S + s7); if (blank < 0) continue;
  const c = { '7': s7, BAR: B, S, V, P, C, R, X: blank }; const v = rtp(c);
  if (Math.abs(v - .92) < (best ? Math.abs(best.v - .92) : 9)) best = { c, v };
}
console.log(best);
