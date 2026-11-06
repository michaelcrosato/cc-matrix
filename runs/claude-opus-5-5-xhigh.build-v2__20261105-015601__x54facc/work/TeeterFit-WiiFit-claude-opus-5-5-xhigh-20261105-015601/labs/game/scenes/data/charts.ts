/**
 * @file Step Class's charts (PLAN.md section 6): strings, one token per half beat: L, R, B (both, a jump), < and > (side
 * steps: lean plus foot), . rest, | a bar line. A new chart is a new string.
 *
 * Game code, sim-side data.
 *
 * @example
 * parseChart('L . R . | B . . .').length; // 3
 */

/** The three phrases of Step Class, each at its tempo. */
export const PHRASES: readonly { bpm: number; chart: string }[] = [
  {
    bpm: 104,
    chart:
      'L . R . L . R . | L . R . L . R . | L . R . L . R . | B . . . B . . . | L . R . L . R . | L L R . B . . . | R . L . R . L . | R R L . B . . . | L . R . < . . . | R . L . > . . . | L . R . L . R . | B . . . . . . .',
  },
  {
    bpm: 112,
    chart:
      'L . R . < . > . | L . R . < . > . | L L R . L L R . | B . B . B . . . | R . L . > . < . | R . L . > . < . | R R L . R R L . | B . B . B . . . | L R L . R L R . | < . > . < . > . | L R L . R L R . | B . . . B . . .',
  },
  {
    bpm: 120,
    chart:
      'L . R . L . R . | L R L R B . . . | < . > . < . > . | L R L R B . . . | R . L . R . L . | R L R L B . . . | > . < . > . < . | R L R L B . . . | L L R R L L R R | B . B . B . B . | L . < . R . > . | L . < . R . > . | L R L R L R L R | B . . . B . . . | < . > . < . > . | B . . . . . . .',
  },
];

/** The one phrase of a Round's short class. */
export const SHORT_PHRASE: { bpm: number; chart: string } = {
  bpm: 112,
  chart:
    'L . R . L . R . | L . R . L . R . | L . R . < . > . | B . . . B . . . | L . R . L . R . | L L R . B . . . | R . L . > . < . | R R L . B . . . | L . R . L . R . | < . > . < . > . | L R L R B . . . | R . L . R . L . | L L R . L L R . | B . B . B . . . | R L R L R . L . | < . > . < . > . | L . R . L . R . | L R L R B . . . | L . R . L . R . | B . . . . . . .',
};

/** A note: its slot (half beats from the phrase's start) and what it asks. */
export interface ChartNote {
  slot: number;
  kind: 'L' | 'R' | 'B' | '<' | '>';
}

/** The notes of a chart. */
export function parseChart(chart: string): ChartNote[] {
  const notes: ChartNote[] = [];
  let slot = 0;
  for (const token of chart.split(/\s+/)) {
    if (token === '|' || token === '') continue;
    if (token !== '.') notes.push({ slot, kind: token as ChartNote['kind'] });
    slot += 1;
  }
  return notes;
}

/** The slots a chart takes. */
export const slotsOf = (chart: string): number => chart.split(/\s+/).filter((t) => t !== '|' && t !== '').length;
