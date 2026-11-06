// Step Class charts: strings per bar, eight cells a bar (half-beats). L = left foot, R = right foot, . = rest.
export const STEP_BPM = 104;
const A = 'L.R.L.R.', B = 'L.R.LR..', C = 'L.R.L...', D = 'LRLRLRLR', E = 'L...R...', F = 'L.R...L.', G = 'R.L.R.L.', H = 'L.RRL.R.';
export const SECTIONS = [
  { name: 'intro', bars: [E, E, E, A] },
  { name: 'verse', bars: [A, A, B, A, A, F, B, C] },
  { name: 'chorus', bars: [D, A, D, B, D, A, D, H] },
  { name: 'breakdown', bars: [E, A, E, G] },
  { name: 'final', bars: [D, D, H, A, D, D, H, D] },
];
export const CHART = SECTIONS.flatMap((s) => s.bars);
export const BARS = CHART.length; // 32
export const barLen = (bpm = STEP_BPM) => (4 * 60) / bpm;
/** Notes: { t (s from song start), foot: 'L'|'R' }. */
export function notes(chart = CHART, bpm = STEP_BPM) {
  const out = [], bl = barLen(bpm);
  chart.forEach((bar, b) => [...bar].forEach((ch, i) => { if (ch === 'L' || ch === 'R') out.push({ t: b * bl + (i / 8) * bl, foot: ch, bar: b }); }));
  return out;
}
export const songLength = (bpm = STEP_BPM) => BARS * barLen(bpm);
