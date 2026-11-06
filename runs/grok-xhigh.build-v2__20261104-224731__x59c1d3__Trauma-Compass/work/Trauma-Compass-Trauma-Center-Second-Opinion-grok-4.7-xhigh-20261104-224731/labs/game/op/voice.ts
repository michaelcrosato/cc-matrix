/**
 * @file Gibberish voices. Each character of a line picks one of sixteen syllables. The pick is a pure function of
 * the speaker and the character, so the same line always barks the same way. No samples, no files.
 */

/** Sixteen mouth-shapes. The page plays them. The index is the whole contract. */
export const SYLLABLES = [
  'ba',
  'ke',
  'mi',
  'to',
  'ra',
  'lu',
  'ne',
  'shi',
  'ko',
  'va',
  'di',
  'fu',
  'pe',
  'zo',
  'ha',
  'ri',
] as const;

/** FNV-1a over a string, unsigned. */
function fnv(text: string, seed = 2166136261): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Syllable indexes for one line, speaker included so two people never share a mouth by accident. */
export function voiceOf(who: string, text: string): number[] {
  const salt = fnv(who);
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(fnv(text[i] + String(i), salt) % SYLLABLES.length);
  return out;
}

/** The same line joined, for a quick equality check. */
export function voiceKey(who: string, text: string): string {
  return voiceOf(who, text).join('.');
}
