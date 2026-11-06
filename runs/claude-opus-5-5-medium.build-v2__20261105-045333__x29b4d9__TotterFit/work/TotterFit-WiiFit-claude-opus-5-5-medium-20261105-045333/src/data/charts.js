// Bars of 8 cells. L R B feet, < > ^ v lean, . rest.
const P = ['L...R...', 'L.R.L.R.', 'L.R.B...', 'L.L.R.R.', '<...>...', 'L.R.<...', '^...v...', 'LRL.RLR.', 'B.B.LRB.', 'L.R.LRLR'];
const E = '........';
const section = (n, pats) => Array.from({ length: n }, (_, i) => pats[i % pats.length]);
const t1a = [P[0], P[1], P[0], P[2]], t1b = [P[1], P[2], P[4], P[1]];
const t2a = [P[1], P[3], P[2], P[5]], t2b = [P[3], P[5], P[2], P[4]];
const t3a = [P[7], P[3], P[8], P[5]], t3b = [P[9], P[7], P[6], P[8]];
export const CHARTS = {
  tier1: { bpm: 104, bars: [...section(4, [E]), ...section(8, t1a), ...section(8, t1b), ...section(8, [P[1], P[0], P[2], P[1]]), ...section(4, [P[4]]), ...section(8, [P[2], P[4], P[1], P[2]]), ...section(4, [E])] },
  tier2: { bpm: 116, bars: [...section(4, [E]), ...section(8, t2a), ...section(8, t2b), ...section(8, [P[3], P[1], P[5], P[2]]), ...section(4, [P[4], P[6]]), ...section(8, [P[5], P[3], P[2], P[4]]), ...section(4, [E])] },
  tier3: { bpm: 124, bars: [...section(4, [E]), ...section(8, t3a), ...section(8, t3b), ...section(8, [P[8], P[9], P[5], P[7]]), ...section(4, [P[4], P[6]]), ...section(8, [P[9], P[8], P[7], P[6]]), ...section(4, [E])] },
  session: { bpm: 116, bars: [...section(2, [E]), ...section(10, [P[1], P[2], P[3], P[1]]), ...section(4, [P[4], P[6]]), ...section(10, [P[2], P[3], P[1], P[5]])].slice(0, 24) },
  finale: { bpm: 96, bars: [E, P[0], P[1], P[4], P[2], P[4], P[1], P[6]] },
};
export function chartNotes(chart) {
  const beat = 60 / chart.bpm, cell = beat / 2, notes = [];
  chart.bars.forEach((bar, b) => { for (let c = 0; c < 8; c++) { const ch = bar[c]; if (ch && ch !== '.') notes.push({ t: (b * 8 + c) * cell, k: ch }); } });
  return { notes, beat, cell, length: chart.bars.length * 8 * cell };
}
