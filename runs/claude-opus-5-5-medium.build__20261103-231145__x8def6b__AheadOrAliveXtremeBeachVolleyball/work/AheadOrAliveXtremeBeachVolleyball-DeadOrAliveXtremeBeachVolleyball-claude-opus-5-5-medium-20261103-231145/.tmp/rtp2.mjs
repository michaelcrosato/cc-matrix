const PAY = { '7': 100, BAR: 30, SONNY: 20, BALL: 12, PALM: 8, COCO: 5 };
const line = (a, b, c) => { const s = [a, b, c], ch = s.filter(x => x === 'CHERRY').length; for (const sym of ['7', 'BAR', 'BALL', 'PALM', 'COCO']) if (s.every(x => x === sym || x === 'SONNY') && s.some(x => x === sym)) return PAY[sym]; if (s.every(x => x === 'SONNY')) return 20; return ch === 3 ? 10 : ch === 2 ? 5 : ch === 1 ? 2 : 0; };
const rtp = counts => { const strip = Object.entries(counts).flatMap(([k, n]) => Array(n).fill(k)); let p = 0; for (const a of strip) for (const b of strip) for (const c of strip) p += line(a, b, c); return p / strip.length ** 3; };
let best = null;
for (let ch = 0; ch <= 1; ch++) for (let co = 3; co <= 6; co++) for (let pa = 2; pa <= 5; pa++) for (let ba = 1; ba <= 3; ba++) for (let bar = 1; bar <= 2; bar++) {
  const used = 1 + bar + 1 + ba + pa + co + ch; if (used > 21) continue; const c = { '7': 1, BAR: bar, SONNY: 1, BALL: ba, PALM: pa, COCO: co, CHERRY: ch, SHELL: 21 - used };
  const r = rtp(c); if (!best || Math.abs(r - .92) < Math.abs(best[0] - .92)) best = [r, c]; }
console.log(best);
