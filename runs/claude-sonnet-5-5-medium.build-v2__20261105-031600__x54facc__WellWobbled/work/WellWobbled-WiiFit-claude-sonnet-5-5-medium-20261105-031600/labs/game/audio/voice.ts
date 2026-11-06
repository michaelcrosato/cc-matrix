/**
 * @file `say(audio, speaker, text, vol)`: Animalese-style gibberish. One syllable per two letters, chosen by a hash of the letters
 * (the same line always babbles the same way), pitch contour rising on "?" and falling on ".", silence on spaces and a
 * longer pause on punctuation. Returns the seconds it will take, which the text types in sync with. Page-side.
 * @example
 * babble('Hello there.', 'tare').length; // the syllables with their start times
 */
import type { Audio } from '../../../engine';
import { SPEAKERS } from './sound';

export interface Syllable {
  id: string;
  at: number;
  pitch: number;
}
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** The syllables of `text` for `speaker`, deterministic. */
export function babble(text: string, speaker: string): Syllable[] {
  const sp = SPEAKERS[speaker as keyof typeof SPEAKERS] ?? SPEAKERS.tare;
  const out: Syllable[] = [];
  let t = 0;
  const q = text.trim().endsWith('?');
  const words = text.split(/(\s+|[,.;:!?…]+)/).filter(Boolean);
  const total = text.replace(/[^a-z]/gi, '').length;
  let seen = 0;
  for (const w of words) {
    if (/^\s+$/.test(w)) {
      t += sp.syl * 0.6;
      continue;
    }
    if (/^[,.;:!?…]+$/.test(w)) {
      t += sp.syl * 2.2;
      continue;
    }
    for (let i = 0; i < w.length; i += 2) {
      const pair = w.slice(i, i + 2).toLowerCase();
      const h = hash(pair + speaker);
      const u = total > 0 ? seen / total : 0;
      seen += 2;
      const contour = speaker === 'plumb' || speaker === 'pa' ? 1 : q ? 0.9 + 0.3 * u : 1.05 - 0.15 * u;
      const vib = sp.wobble * Math.sin(t * 40);
      out.push({
        id: `sfx:vo.${speaker}.${h % 16}`,
        at: t,
        pitch: (sp.base / 200) * (0.92 + ((h >>> 8) % 16) / 100) * contour * sp.rise ** u * (1 + vib),
      });
      t += sp.syl * 0.85;
    }
  }
  return out;
}
export const duration = (s: Syllable[]): number => (s.length ? s[s.length - 1].at + 0.15 : 0);
/** Plays the babble now. Returns its length in seconds. */
export function say(audio: Audio | null, speaker: string, text: string, vol = 0.7): number {
  const s = babble(text, speaker);
  if (!audio) return duration(s);
  const now = audio.context?.currentTime ?? 0;
  for (const y of s) audio.play(y.id, { pitch: y.pitch, when: now + y.at, vol, bus: 'ui', duck: true } as never);
  return duration(s);
}
