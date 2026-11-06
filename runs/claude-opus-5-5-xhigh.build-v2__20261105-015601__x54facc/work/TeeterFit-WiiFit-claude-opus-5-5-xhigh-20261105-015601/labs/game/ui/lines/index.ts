/**
 * @file Every line in the game, keyed by id; the sim emits ids, the page says them. An entry is a list of variants, each at
 * most two short sentences. A line group may name its speaker; otherwise the sim's `who` speaks it.
 *
 * Game code, a page's data (the tests read it too).
 *
 * @example
 * getLine('pose.rest', 0)?.text;
 */
import { PLAQUE_TEXT } from './plaques';
import { LINES_ACTIVITIES } from './activities';
import { LINES_PEOPLE } from './people';
import { LINES_STORY } from './story';

/** The whole table. */
export const LINES: Readonly<Record<string, readonly string[]>> = {
  ...LINES_ACTIVITIES,
  ...LINES_PEOPLE,
  ...LINES_STORY,
};

/** Who speaks a group when the sim does not say: by the first dotted part. */
const SPEAKER_OF: Readonly<Record<string, string>> = {};

/** A line to speak. */
export interface Spoken {
  text: string;
  who?: string;
}

/** The `n`th variant of a line id, or null. Variants cycle with `n`. */
export function getLine(id: string, n = 0): Spoken | null {
  const list = LINES[id];
  if (!list || list.length === 0) return null;
  const at = ((n % list.length) + list.length) % list.length;
  return { text: list[at], who: SPEAKER_OF[id.split('.')[0]] };
}

/** Every line the game can say, for counting. */
export const allLines = (): string[] => [...Object.values(LINES).flat(), ...PLAQUE_TEXT];
