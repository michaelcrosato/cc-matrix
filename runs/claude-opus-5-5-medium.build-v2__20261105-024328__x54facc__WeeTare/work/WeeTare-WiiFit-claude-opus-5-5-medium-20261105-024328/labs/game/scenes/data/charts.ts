/**
 * @file Step Class's charts as strings, one token an eighth note: L and R are feet, B both (a jump), a and d side steps
 * (lean plus foot), `.` a rest, `|` nothing but reading help. Adding a chart is adding a row.
 */
export interface Phrase {
  readonly bpm: number;
  readonly chart: string;
}

export const PHRASES: readonly Phrase[] = [
  {
    bpm: 104,
    chart:
      'L . R . L . R . | L . R . L . R . | L L R . B . . . | L . R . L . R . | L L R . B . . . | R R L . B . . . | a . . . d . . . | L . R . B . . . | L . R . L . R . | L L R . B . . . | a . d . a . d . | B . . . B . . .',
  },
  {
    bpm: 112,
    chart:
      'L . R . a . d . | L R L . R L R . | B . . . L . R . | a . L . d . R . | L R L . B . . . | R L R . B . . . | a . d . L . R . | L L R R B . . . | L R L R L . R . | a . d . a . d . | B . L . B . R . | L R L R B . . . | a . L . d . R . | B . . . B . . .',
  },
  {
    bpm: 120,
    chart:
      'L R L R L . R . | B . a . B . d . | L R L . R L R . | a L d R a L d R | B . B . L R L . | R L R . B . . . | L L R R L L R R | a . d . B . . . | L R L R B . L R | L R B . a . d . | L R L . R L R . | a L d R B . . . | L R L R L R L R | B . . . B . . . | a . d . a . d . | B . B . B . . .',
  },
];

/** The short form deals one phrase at this tempo. */
export const SHORT_PHRASE: Phrase = {
  bpm: 112,
  chart:
    'L . R . L . R . | L R L . B . . . | R L R . B . . . | a . . . d . . . | L . R . a . d . | L R L . B . . . | L L R . B . . . | a . d . L . R . | L R L R B . . . | a L d R B . . . | L . R . L . R . | B . . . B . . .',
};
