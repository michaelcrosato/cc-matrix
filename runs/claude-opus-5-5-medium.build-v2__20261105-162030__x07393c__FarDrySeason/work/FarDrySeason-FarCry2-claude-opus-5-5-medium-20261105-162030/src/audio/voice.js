// Animalese-style gibberish, per character. A word always sounds the same.
import { hashString } from '../../pixel-engine.js';
const VOWELS = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840], [440, 1020]];
const CONS = [0, 6000, 2500, 9000];
export const VOICES = {
  bakr: { base: 118, rate: 0.085, wave: 'saw' }, odile: { base: 215, rate: 0.082, wave: 'triangle' }, tibor: { base: 132, rate: 0.074, wave: 'saw' }, vance: { base: 122, rate: 0.098, wave: 'square' },
  ansa: { base: 196, rate: 0.088, wave: 'saw' }, harrow: { base: 100, rate: 0.115, wave: 'triangle' }, ines: { base: 230, rate: 0.068, wave: 'saw' }, dov: { base: 92, rate: 0.112, wave: 'saw' }, mags: { base: 262, rate: 0.06, wave: 'triangle' }, soldier: { base: 145, rate: 0.066, wave: 'square' },
};
export const syllable = (wave, freq, vowel, cons, volume = 0.3) => ({ wave, freq, freqEnd: freq * 0.9, attack: 0.005, decay: 0.09, volume, duty: 0.25, layers: [{ wave: 'sine', freq: VOWELS[vowel][0], decay: 0.08, volume: 0.18 * (volume / 0.3) }, { wave: 'sine', freq: VOWELS[vowel][1], decay: 0.07, volume: 0.1 * (volume / 0.3) }, ...(CONS[cons] ? [{ wave: 'noise', freq: CONS[cons], decay: 0.012, volume: 0.08 * (volume / 0.3) }] : [])] });
/** A line as timed syllables: [{ at, def, pitch }]. Pure, so tests and the game agree. */
export function speak(voiceId, text) {
  const v = VOICES[voiceId] ?? VOICES.soldier, words = text.split(/\s+/).filter(Boolean), out = [];
  let t = 0;
  words.forEach((w, wi) => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, ''), h = hashString(clean), vc = Math.max(1, (clean.match(/[aeiouy]+/g) ?? []).length);
    for (let i = 0; i < vc; i++) {
      const vowel = (h >> (i * 3)) % VOWELS.length, cons = (h >> (i * 2 + 7)) % CONS.length;
      let pitch = ((h >> (i + 3)) % 5) - 2;
      const last = wi === words.length - 1 && i === vc - 1;
      if (last && /\?/.test(w)) pitch += 4; else if (last && /[.!]/.test(w)) pitch -= 3;
      out.push({ at: t, def: syllable(v.wave, v.base, Math.abs(vowel), Math.abs(cons)), pitch });
      t += v.rate;
    }
    t += /,/.test(w) ? 0.16 : 0.03;
  });
  return { list: out, duration: t };
}
