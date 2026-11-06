/**
 * @file Step Class charts as strings, one token a beat: L R B (both feet, a jump), l r (side steps: lean that way and a
 * foot), `.` rest, `|` bar line (ignored). Three phrases at 104, 112 and 120 BPM. Add a row to add a phrase.
 * @example
 * parseChart('L . R').length; // 3
 */
export interface Phrase {
  bpm: number;
  chart: string;
}
const A = 'L . R . L . R . | L L R . B . . .';
const B = 'L R L R | l . r . | L . B . | R R L . B . . .';
const C = 'L R L R | B . L R | l r l r | B . B . | L L R R | B . . .';
export const PHRASES: readonly Phrase[] = [
  { bpm: 104, chart: `${A} ${A} ${A} ${A}` },
  { bpm: 112, chart: `${B} ${B} ${B}` },
  { bpm: 120, chart: `${C} ${C} ${B}` },
];
/** A chart's notes: one token per beat, bar lines dropped. */
export const parseChart = (s: string): string[] => s.split(/\s+/).filter((t) => t && t !== '|');
