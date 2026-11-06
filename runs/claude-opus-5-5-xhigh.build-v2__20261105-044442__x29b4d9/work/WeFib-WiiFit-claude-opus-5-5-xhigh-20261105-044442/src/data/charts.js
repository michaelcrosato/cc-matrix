// Step Class charts: bars of 8 cells. L R B feet, < > ^ v lean, . rest.
export const PATTERNS = ['L...R...', 'L.R.L.R.', 'L.R.B...', 'L.L.R.R.', '<...>...', 'L.R.<...', '^...v...', 'LRL.RLR.', 'B.B.LRB.', 'L.R.LRLR'];
const P = (...idx) => idx.map((i) => PATTERNS[i]);
const REST = '........';
const rest = (n) => Array(n).fill(REST);
/** Form: intro 4 (empty), A 8, B 8, A′ 8, break 4 (lean only), B′ 8, outro 4. */
export const CHARTS = {
  tier1: [
    ...rest(4),
    ...P(0, 0, 1, 2, 0, 1, 1, 2),
    ...P(1, 2, 4, 2, 1, 2, 4, 2),
    ...P(0, 1, 1, 2, 1, 1, 0, 2),
    ...P(4, 4, 4, 4),
    ...P(1, 2, 4, 2, 2, 1, 4, 2),
    ...rest(4),
  ],
  tier2: [
    ...rest(4),
    ...P(1, 2, 3, 2, 1, 2, 5, 2),
    ...P(3, 5, 2, 6, 2, 5, 2, 6),
    ...P(1, 3, 2, 5, 2, 1, 5, 2),
    ...P(4, 6, 4, 6),
    ...P(5, 3, 6, 2, 5, 2, 4, 2),
    ...rest(4),
  ],
  tier3: [
    ...rest(4),
    ...P(3, 7, 2, 5, 1, 3, 5, 2),
    ...P(9, 5, 1, 6, 8, 2, 5, 4),
    ...P(7, 2, 5, 3, 9, 1, 2, 5),
    ...P(4, 6, 4, 6),
    ...P(8, 2, 9, 5, 2, 5, 6, 2),
    ...rest(4),
  ],
  session: [
    ...rest(2),
    ...P(1, 2, 3, 2, 1, 3, 5, 2),
    ...P(3, 5, 2, 1),
    ...P(4, 6, 4, 6),
    ...P(2, 3, 2, 1),
    ...rest(2),
  ],
};
export function chartNotes(name, bpm) {
  const bars = CHARTS[name];
  const beat = 60 / bpm;
  const notes = [];
  bars.forEach((bar, b) => {
    for (let c = 0; c < 8; c++) {
      const ch = bar[c];
      if (ch === '.') continue;
      notes.push({ t: (b * 4 + c * 0.5) * beat, type: ch, lean: '<>^v'.includes(ch), bar: b });
    }
  });
  return { notes, length: bars.length * 4 * beat, beat };
}
