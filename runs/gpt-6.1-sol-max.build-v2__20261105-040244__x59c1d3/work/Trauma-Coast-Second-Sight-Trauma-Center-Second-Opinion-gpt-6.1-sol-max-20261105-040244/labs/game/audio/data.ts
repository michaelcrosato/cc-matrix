/** @file Original synthesized instrument signatures, monitor tones and adaptive score; no audio files. */
import { STRAINS } from '../data/strains';
import { defineSfx, defineSong } from '../../../engine';
const sounds: Record<string, [number, number, number, string]> = {
  cut: [500, 90, 0.12, 'noise'],
  stitch: [850, 300, 0.1, 'triangle'],
  drain: [180, 60, 0.3, 'noise'],
  laser: [1700, 900, 0.14, 'saw'],
  syringe: [1100, 700, 0.06, 'sine'],
  gel: [130, 55, 0.18, 'noise'],
  scanner: [850, 1500, 0.25, 'sine'],
  forceps: [2300, 1500, 0.08, 'triangle'],
  clack: [700, 160, 0.065, 'noise'],
  beep: [830, 830, 0.085, 'sine'],
  flat: [420, 420, 1, 'sine'],
  alarm: [600, 900, 0.22, 'square'],
  good: [523, 1046, 0.22, 'sine'],
  no: [180, 90, 0.13, 'triangle'],
  shock: [90, 50, 0.38, 'noise'],
  rain: [900, 700, 2, 'noise'],
  creak: [160, 65, 0.7, 'saw'],
};
for (const [id, [freq, to, dur, wave]] of Object.entries(sounds))
  defineSfx(`sfx:hl-${id}`, {
    voices: [{ wave: wave as 'sine', freq, to, dur, vol: wave === 'noise' ? 0.08 : 0.15, filter: 'lowpass' }],
    variants: id === 'beep' ? 1 : 3,
    vary: 0.04,
    bus: id === 'rain' ? 'ambience' : 'effects',
  });
const themes: Record<string, [number, string, string]> = {
  title: [84, 'D3 - - - A2 - - - Bb2 - - - C3 - - -', 'A4 . D5 . F5 - E5 - D5 - C5 - A4 - . .'],
  story: [76, 'D3 - - - Bb2 - - - G2 - - - A2 - - -', 'F4 - . . E4 - D4 - G4 - F4 - E4 - . .'],
  calm: [100, 'D2 - - - D3 - - - Bb2 - - - A2 - - -', 'D5 . A4 . F5 . E5 . D5 . F5 . E5 . A4 .'],
  strain: [126, 'D2 - D3 - C2 - C3 - Bb1 - Bb2 - A1 - A2 -', 'D5 . Eb5 . A5 . F5 . D5 . C5 . A4 . C5 .'],
  mercy: [92, 'A2 - - - F2 - - - D2 - - - E2 - - -', 'E5 - A5 - G5 - E5 - F5 - E5 - D5 - C5 -'],
  success: [110, 'D3 - F3 - A3 - D4 - Bb3 - A3 - F3 - D3 -', 'F5 - A5 - D6 - A5 - G5 - F5 - E5 - D5 -'],
  failed: [60, 'D2 - - - C2 - - - Bb1 - - - A1 - - -', 'F4 - E4 - D4 - . . C4 - Bb3 - A3 - . .'],
  jingle: [134, 'C3 . G3 . C4 . G3 . F3 . C4 . G3 . C4 .', 'E5 . G5 . C6 - G5 . A5 . F5 . G5 - C5 .'],
};
for (const [name, [bpm, bass, melody]] of Object.entries(themes))
  defineSong(`song:hl-${name}`, {
    bpm,
    tracks: [
      { wave: 'triangle', vol: 0.22, notes: bass },
      { wave: 'sine', vol: 0.15, notes: melody },
      { wave: 'pulse', vol: 0.06, intensity: 0.5, notes: 'D4 . A4 . D5 . A4 . C5 . A4 . E5 . A4 .' },
      { wave: 'drums', vol: 0.1, intensity: 0.7, notes: 'k . h . s . h . k . h h s . h .' },
    ],
  });

for (const [name, strain] of Object.entries(STRAINS)) {
  strain.notes.forEach((note, i) =>
    defineSfx(`sfx:hl-signature-${name}-${i}`, {
      voices: { wave: 'sine', freq: 440 * Math.pow(2, (note - 69) / 12), dur: 0.2, vol: 0.18 },
    }),
  );
  defineSfx(`sfx:hl-signature-${name}`, {
    layers: strain.notes.map((_, i) => ({ sfx: `sfx:hl-signature-${name}-${i}`, at: i * 0.15 })),
  });
}
