/**
 * @file Prompts for the device used last. Pads start as PlayStation. Settings can ask for Xbox.
 * Keys and mouse buttons replace the pad marks the frame those devices are used.
 */
export type GlyphSet = 'playstation' | 'xbox' | 'keys' | 'mouse';

/** One row of marks for the verbs. */
const MARKS: Record<GlyphSet, Record<string, string>> = {
  playstation: {
    accept: 'Cross',
    cancel: 'Circle',
    lean: 'Left stick',
    feet: 'L2 and R2',
    breathe: 'L2 and R2 together',
    act: 'Cross',
    pause: 'Options',
    spare: 'Square and Triangle',
    shoulders: 'L1 and R1',
  },
  xbox: {
    accept: 'A',
    cancel: 'B',
    lean: 'Left stick',
    feet: 'LT and RT',
    breathe: 'LT and RT together',
    act: 'A',
    pause: 'Menu',
    spare: 'X and Y',
    shoulders: 'LB and RB',
  },
  keys: {
    accept: 'Enter',
    cancel: 'Esc',
    lean: 'WASD',
    feet: 'Q and E',
    breathe: 'Space',
    act: 'F',
    pause: 'Esc',
    spare: '',
    shoulders: '',
  },
  mouse: {
    accept: 'Click',
    cancel: 'Esc',
    lean: 'Mouse',
    feet: 'Left and right buttons',
    breathe: 'Space',
    act: 'Click',
    pause: 'Esc',
    spare: '',
    shoulders: '',
  },
};

/** The mark for one verb on this glyph set. */
export function glyph(set: GlyphSet, verb: string): string {
  return MARKS[set][verb] ?? verb;
}

/** One prompt line. Two clauses, one sentence. */
export function promptLine(set: GlyphSet): string {
  const row = MARKS[set];
  if (set === 'playstation' || set === 'xbox') {
    return `${row.accept} confirms and ${row.cancel} steps back. ${row.spare} wait, ${row.shoulders} wait, and ${row.feet} are the feet.`;
  }
  return `${row.lean} leans, and ${row.feet} are the feet. ${row.breathe} breathes, and ${row.act} acts.`;
}
