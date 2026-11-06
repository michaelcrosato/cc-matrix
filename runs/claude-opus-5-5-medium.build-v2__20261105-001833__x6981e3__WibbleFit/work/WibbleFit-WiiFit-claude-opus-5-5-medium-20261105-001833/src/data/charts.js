// Step Class at 104 BPM: 32 bars, one string per bar, 8 slots. L, R or rest.
const verseA = 'L...R...', verseB = 'L.R.L.R.', verseC = 'L.R.L...', chorusA = 'L.R.L.R.', chorusB = 'L.RRL.R.', chorusC = 'LL.RL.R.';
const brk = ['L.......', '....R...', 'L...R...', 'L.R.L.R.'];
export const STEP_BPM = 104;
export const CHART_SECTIONS = [
  { name: 'intro', bars: [verseA, verseA, verseA, verseC] },
  { name: 'verse', bars: [verseB, verseB, verseC, verseB, verseB, verseC, verseB, chorusA] },
  { name: 'chorus', bars: [chorusA, chorusB, chorusA, chorusC, chorusA, chorusB, chorusC, chorusA] },
  { name: 'breakdown', bars: brk },
  { name: 'final', bars: [chorusB, chorusC, chorusB, chorusC, chorusB, chorusC, chorusA, 'L.R.L.R.'] },
];
export const STEP_HARD_FILL = 'LRLRLRLR';
export function chartNotes(sections = CHART_SECTIONS, { maxBars = Infinity, hard = false } = {}) {
  const bar = (60 / STEP_BPM) * 4, slot = bar / 8; const notes = []; let b = 0;
  for (const s of sections) for (let chartBar of s.bars) {
    if (b >= maxBars) return { notes, bars: b, duration: b * bar };
    if (hard && s.name === 'final' && b % 2 === 0) chartBar = STEP_HARD_FILL;
    for (let i = 0; i < 8; i++) if (chartBar[i] === 'L' || chartBar[i] === 'R') notes.push({ t: b * bar + i * slot, foot: chartBar[i], bar: b });
    b++;
  }
  return { notes, bars: b, duration: b * bar };
}
