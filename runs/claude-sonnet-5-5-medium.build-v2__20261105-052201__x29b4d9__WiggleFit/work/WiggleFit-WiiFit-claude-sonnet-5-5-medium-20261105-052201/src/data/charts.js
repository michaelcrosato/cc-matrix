// bars of 8 cells: L R B feet, < > ^ v lean, . rest
export const PATTERNS = ['L...R...', 'L.R.L.R.', 'L.R.B...', 'L.L.R.R.', '<...>...', 'L.R.<...', '^...v...', 'LRL.RLR.', 'B.B.LRB.', 'L.R.LRLR'];
const E = '........';
function form(pats, leanOnly) { const [a, b, c, d] = pats; const bars = []; const add = (n, p) => { for (let i = 0; i < n; i++) bars.push(p[i % p.length]); };
  add(4, [E]); add(8, [a, b]); add(8, [b, c, a, d]); add(8, [a, c, b, d]); add(4, leanOnly); add(8, [d, c, b, a]); add(4, [E]); return bars; }
export const CHARTS = [
  { bpm: 104, bars: form([PATTERNS[0], PATTERNS[1], PATTERNS[2], PATTERNS[4]], [PATTERNS[4]]) },
  { bpm: 116, bars: form([PATTERNS[3], PATTERNS[5], PATTERNS[6], PATTERNS[2]], [PATTERNS[4], PATTERNS[6]]) },
  { bpm: 124, bars: form([PATTERNS[7], PATTERNS[8], PATTERNS[9], PATTERNS[5]], [PATTERNS[4], PATTERNS[6]]) },
];
// Session version: 24 bars at 116 with a 4-bar lean break
export const SESSION_CHART = { bpm: 116, bars: [E, E, PATTERNS[0], PATTERNS[1], PATTERNS[2], PATTERNS[1], PATTERNS[3], PATTERNS[2], PATTERNS[4], PATTERNS[6], PATTERNS[4], PATTERNS[6], PATTERNS[1], PATTERNS[5], PATTERNS[2], PATTERNS[3], PATTERNS[0], PATTERNS[1], PATTERNS[3], PATTERNS[2], PATTERNS[1], PATTERNS[0], E, E] };
