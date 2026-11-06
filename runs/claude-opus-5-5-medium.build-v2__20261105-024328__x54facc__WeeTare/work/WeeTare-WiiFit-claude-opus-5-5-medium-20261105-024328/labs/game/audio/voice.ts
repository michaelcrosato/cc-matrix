/**
 * @file Animalese: `say(speaker, text)` babbles a line. One syllable per two letters, hashed from the letters so the same line
 * always babbles the same way; the pitch rises on "?" and falls on "."; spaces are silence, punctuation longer. Text
 * always stays on screen too, so nothing needs the voice.
 */
import type { Audio } from '../../../engine';
import { SPEAKERS, voiceId, type Speaker } from '../sounds/sfx';

/** Plays a line now; returns its length, seconds. */
export function babble(audio: Audio, who: Speaker, text: string, level: number): number {
  const s = SPEAKERS[who] ?? SPEAKERS.tare;
  const context = audio.context;
  if (!context) return 0;
  const start = context.currentTime + 0.02;
  let at = 0;
  const rising = text.trim().endsWith('?');
  const count = Math.ceil(text.length / 2);
  for (let i = 0; i < text.length; i += 2) {
    const pair = text.slice(i, i + 2);
    const code = (pair.charCodeAt(0) * 31 + (pair.charCodeAt(1) || 7)) & 0xffff;
    if (/^[\s]+$/.test(pair)) {
      at += s.syllable * 0.6;
      continue;
    }
    const k = i / 2 / Math.max(1, count - 1);
    const contour =
      (rising ? 0.3 * Math.pow(k, 3) : -0.18 * Math.pow(k, 3)) * s.contour + Math.sin(i * 1.1) * 0.04 * s.contour;
    const sigh = s.sigh && k > 0.8 ? -0.15 : 0;
    audio.play(voiceId(who, code % 16), {
      pitch: 1 + contour + sigh + ((code % 5) - 2) * 0.012 * s.contour,
      when: start + at,
      vol: level,
      bus: 'ui',
      duck: true,
    } as never);
    at += s.syllable;
    if (/[.,!?]/.test(pair)) at += s.syllable * 2.2;
  }
  return at;
}
