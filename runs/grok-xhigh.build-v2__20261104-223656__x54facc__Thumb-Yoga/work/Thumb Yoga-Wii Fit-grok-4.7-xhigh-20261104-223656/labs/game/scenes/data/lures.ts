/**
 * @file What the pond offers instead of stillness. Pressing any of them is the wrong answer.
 * A lure is a picture. It is not a pause. The sim keeps stepping underneath it.
 */

/** One temptation. */
export interface Lure {
  id: string;
  line: string;
}

/** The sequence, in the order a seed may draw. The menu one only looks like a pause. */
export const LURES: readonly Lure[] = [
  { id: 'press', line: 'PRESS NOW' },
  { id: 'tare', line: 'Psst. Is this on? Press to say yes.' },
  { id: 'phone', line: 'A stone is buzzing in your pocket. It is a stone.' },
  { id: 'frog', line: 'The Frog sits on your knee and waits.' },
  { id: 'gull', line: 'The Gull lands on your head. It has opinions.' },
  { id: 'menu', line: 'Resume' },
  { id: 'disconnect', line: 'Your controller appears to be disconnected. Press any button.' },
  { id: 'plumb', line: 'You are doing it wrong.' },
  { id: 'credits', line: 'Thanks for playing. Press to continue.' },
];
