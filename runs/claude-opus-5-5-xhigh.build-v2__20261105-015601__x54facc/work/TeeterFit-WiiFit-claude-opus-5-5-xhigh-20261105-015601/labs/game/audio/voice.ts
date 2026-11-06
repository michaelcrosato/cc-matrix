/**
 * @file Voices: Animalese-style gibberish, written in code (PLAN.md section 12). `say(speaker, text)` babbles one syllable
 * per two letters, hashed from the letters so the same line always babbles the same way, with the pitch contour rising
 * on "?" and falling on "."; silence on spaces, longer on punctuation. The Voices slider scales it.
 *
 * Game code, a page's.
 *
 * @example
 * // const seconds = say(audio, 'tare', 'Please step on me.', 1);
 */
import type { Audio } from '../../../engine';
import { SPEAKERS } from '../sounds/effects';

/** The syllable a pair of letters makes. */
const hash = (a: string, b: string): number => (a.charCodeAt(0) * 31 + (b ? b.charCodeAt(0) : 7)) % 16;

/** Babbles `text` as `speaker`, at gain `vol`. Returns how long it takes, s. */
export function say(audio: Audio, speaker: string, text: string, vol: number): number {
  const who = SPEAKERS[speaker] ?? SPEAKERS.tare;
  const ctx = audio.context;
  const now = ctx ? ctx.currentTime : 0;
  let t = 0.02;
  const letters = text.replace(/[^a-zA-Z .,!?]/g, '');
  const rises = text.trim().endsWith('?');
  const falls = text.trim().endsWith('.');
  const flat = speaker === 'plumb' || speaker === 'pa';
  const count = Math.max(1, letters.replace(/[ .,!?]/g, '').length / 2);
  let said = 0;
  for (let i = 0; i < letters.length;) {
    const a = letters[i];
    if (a === ' ') {
      t += who.length * 0.5;
      i += 1;
      continue;
    }
    if (a === '.' || a === ',' || a === '!' || a === '?') {
      t += who.length * 2.2;
      i += 1;
      continue;
    }
    const b = letters[i + 1] ?? '';
    const pair = b && /[a-zA-Z]/.test(b) ? 2 : 1;
    const u = said / count;
    let pitch = 1;
    if (!flat) {
      pitch = 1 + 0.08 * Math.sin(u * 9 + hash(a, b));
      if (rises) pitch += 0.28 * u * u;
      else if (falls) pitch -= 0.18 * u * u;
      if (speaker === 'tare') pitch += 0.05 + 0.12 * u;
      if (speaker === 'bex' && u > 0.85) pitch *= 0.8;
    }
    if (vol > 0 && ctx)
      audio.play(`sfx:vo.${SPEAKERS[speaker] ? speaker : 'tare'}.${hash(a, b)}`, {
        pitch,
        when: now + t,
        vol,
        bus: 'ui',
        duck: true,
      });
    t += who.length * 1.05;
    said += 1;
    i += pair;
  }
  return t;
}
