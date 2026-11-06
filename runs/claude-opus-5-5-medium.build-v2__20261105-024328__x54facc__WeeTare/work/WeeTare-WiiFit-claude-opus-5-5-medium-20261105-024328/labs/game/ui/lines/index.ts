/**
 * @file Every line of the game by id, and how a line is named on screen. Tests check that every id the sim says is here.
 */
import { ACTIVITY_LINES } from './activities';
import { ISLAND_LINES } from './island';
import { RESULT_LINES } from './results';

export const LINES: Readonly<Record<string, string>> = { ...ACTIVITY_LINES, ...ISLAND_LINES, ...RESULT_LINES };

export const WHO: Readonly<Record<string, string>> = {
  tare: 'Tare', plumb: 'Instructor Plumb', gerald: 'Gerald', bex: 'Bex', nan: 'Old Nan', pa: 'Loudspeaker', plaque: '',
}; // prettier-ignore

/** A line's text, with `{name}` filled. */
export function lineText(id: string, values: Record<string, string | number> = {}): string {
  let text = LINES[id] ?? id;
  for (const [key, value] of Object.entries(values)) text = text.replaceAll(`{${key}}`, String(value));
  return text;
}
