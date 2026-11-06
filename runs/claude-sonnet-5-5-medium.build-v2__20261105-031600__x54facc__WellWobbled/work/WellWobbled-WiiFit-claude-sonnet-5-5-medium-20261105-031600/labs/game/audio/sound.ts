/**
 * @file All sound as code: effects (`defineSfx`), the eight songs (`defineSong`, tracker notation), the ambience loops and the
 * Animalese-style syllable banks of each speaker. No audio files. Importing this module registers everything. Page-side.
 * @example
 * SFX_IDS.includes('sfx:retreat.clack'); // true
 */
import { defineSfx, defineSong } from '../../../engine';

export const SFX_IDS: string[] = [];
const sfx = (name: string, spec: Record<string, unknown>): void => {
  SFX_IDS.push(`sfx:retreat.${name}`);
  defineSfx(`sfx:retreat.${name}`, spec as never);
};
const n = (freq: number, dur: number, vol = 0.3, extra: Record<string, unknown> = {}) => ({
  wave: 'noise',
  freq,
  dur,
  vol,
  ...extra,
});
sfx('creak', {
  voices: [{ wave: 'saw', freq: 140, to: 90, dur: 0.22, vol: 0.12, filter: 'lowpass' }, n(900, 0.2, 0.05)],
  variants: 3,
  vary: 0.2,
});
sfx('breathIn', { voices: [n(1500, 1.2, 0.12, { to: 2500, attack: 0.5, filter: 'bandpass' })] });
sfx('breathOut', { voices: [n(2600, 1.4, 0.12, { to: 1200, attack: 0.1, filter: 'bandpass' })] });
sfx('squeak', { voices: [{ wave: 'sine', freq: 1700, to: 2300, dur: 0.07, vol: 0.12 }], variants: 3, vary: 0.2 });
sfx('stamp', {
  voices: [{ wave: 'sine', freq: 120, to: 50, dur: 0.18, vol: 0.5 }, n(500, 0.08, 0.3, { filter: 'lowpass' })],
});
sfx('clack', {
  voices: [{ wave: 'triangle', freq: 900, to: 400, dur: 0.06, vol: 0.4 }, n(3000, 0.03, 0.2, { filter: 'highpass' })],
  variants: 4,
  vary: 0.15,
});
sfx('splashSmall', { voices: [n(1800, 0.4, 0.3, { to: 400, filter: 'lowpass' })], variants: 3 });
sfx('splashHuge', {
  voices: [n(1400, 1.2, 0.5, { to: 200, filter: 'lowpass' }), { wave: 'sine', freq: 90, to: 40, dur: 0.5, vol: 0.5 }],
});
sfx('gull', {
  voices: [
    { wave: 'saw', freq: 900, to: 1500, dur: 0.15, vol: 0.18, filter: 'bandpass' },
    { wave: 'saw', freq: 1500, to: 800, at: 0.16, dur: 0.25, vol: 0.18, filter: 'bandpass' },
  ],
  variants: 3,
  vary: 0.15,
});
sfx('ribbit', {
  voices: [
    { wave: 'square', freq: 150, to: 260, dur: 0.1, vol: 0.2, filter: 'lowpass' },
    { wave: 'square', freq: 200, to: 120, at: 0.1, dur: 0.14, vol: 0.2, filter: 'lowpass' },
  ],
});
sfx('rope', { voices: [{ wave: 'saw', freq: 220, to: 180, dur: 0.3, vol: 0.06, filter: 'lowpass' }], variants: 3 });
sfx('marble', { voices: [n(800, 1, 0.05, { filter: 'bandpass' })], loop: 1, bus: 'ambience' });
sfx('whoosh', { voices: [n(900, 0.3, 0.2, { to: 3000, attack: 0.1, filter: 'bandpass' })], variants: 3 });
sfx('clap', { voices: [n(2200, 0.09, 0.5, { filter: 'bandpass' })], variants: 3, vary: 0.1 });
sfx('kick', { voices: [{ wave: 'sine', freq: 160, to: 45, dur: 0.2, vol: 0.6 }] });
sfx('hat', { voices: [n(7000, 0.05, 0.2, { filter: 'highpass' })] });
sfx('whistle', {
  voices: [
    { wave: 'sine', freq: 2600, dur: 0.35, vol: 0.2 },
    { wave: 'sine', freq: 2640, dur: 0.35, vol: 0.2 },
  ],
});
sfx('horn', {
  voices: [
    { wave: 'saw', freq: 110, dur: 1.8, vol: 0.2, attack: 0.1, filter: 'lowpass' },
    { wave: 'saw', freq: 165, dur: 1.8, vol: 0.12, attack: 0.1, filter: 'lowpass' },
  ],
});
sfx('thunder', {
  voices: [n(300, 2.5, 0.5, { to: 60, filter: 'lowpass' }), { wave: 'sine', freq: 50, to: 30, dur: 2, vol: 0.4 }],
});
sfx('groan', {
  voices: [
    { wave: 'saw', freq: 55, to: 40, dur: 2, vol: 0.3, filter: 'lowpass' },
    { wave: 'sine', freq: 82, to: 60, dur: 2, vol: 0.2 },
  ],
});
sfx('ooh', {
  voices: [
    { wave: 'triangle', freq: 330, to: 380, dur: 0.6, vol: 0.2, attack: 0.1 },
    { wave: 'triangle', freq: 415, to: 440, dur: 0.6, vol: 0.15, attack: 0.1 },
  ],
});
sfx('tick', { voices: [{ wave: 'sine', freq: 1400, dur: 0.05, vol: 0.2 }] });
sfx('sink', { voices: [{ wave: 'sine', freq: 600, to: 200, dur: 0.2, vol: 0.3 }] });
sfx('perfect', {
  voices: [
    { wave: 'triangle', freq: 880, dur: 0.1, vol: 0.2 },
    { wave: 'triangle', freq: 1320, at: 0.07, dur: 0.15, vol: 0.2 },
  ],
});
sfx('miss', { voices: [{ wave: 'square', freq: 160, to: 100, dur: 0.12, vol: 0.12, filter: 'lowpass' }] });
sfx('seaLoop', { voices: [n(500, 4, 0.12, { to: 700, attack: 2, filter: 'lowpass' })], loop: 3.5, bus: 'ambience' });
sfx('windLoop', { voices: [n(900, 4, 0.08, { to: 1300, attack: 2, filter: 'bandpass' })], loop: 3.5, bus: 'ambience' });
sfx('rainLoop', { voices: [n(5000, 3, 0.14, { filter: 'highpass' })], loop: 2.5, bus: 'ambience' });
sfx('birdsLoop', {
  voices: [
    { wave: 'sine', freq: 3000, to: 3600, dur: 0.1, vol: 0.05 },
    { wave: 'sine', freq: 3400, to: 2800, at: 1.2, dur: 0.14, vol: 0.05 },
    { wave: 'sine', freq: 3200, to: 3900, at: 2.4, dur: 0.1, vol: 0.05 },
  ],
  loop: 3.5,
  bus: 'ambience',
});
sfx('pa', { voices: [n(1200, 0.1, 0.08, { filter: 'bandpass' })], bus: 'ui' });

/** Songs: original, light and slightly over-pleasant; fine at 100% and a whisper at 10%. */
export const SONG_IDS = ['lobby', 'stillness', 'water', 'stepBed', 'hoop', 'tilt', 'dawn', 'stamp'] as const;
const song = (name: string, spec: Record<string, unknown>): void => {
  defineSong(`song:retreat.${name}`, spec as never);
};
song('lobby', {
  bpm: 84,
  tracks: [
    { wave: 'triangle', vol: 0.2, notes: 'C3 - - - G2 - - - A2 - - - E3 - - - | F2 - - - C3 - - - G2 - - - D3 - - -' },
    {
      wave: 'triangle',
      vol: 0.12,
      notes: 'E5 . B4 . D5 . G4 . E5 . C5 . A4 . E5 . | F5 . C5 . A4 . F4 . G5 . D5 . B4 . G4 .',
    },
    {
      wave: 'sine',
      vol: 0.1,
      intensity: 0.5,
      notes: 'B5 - - - - - G5 - - - - - E5 - - - | A5 - - - - - F5 - - - - - D5 - - -',
    },
  ],
});
song('stillness', {
  bpm: 60,
  tracks: [
    { wave: 'sine', vol: 0.18, notes: 'C3 - - - - - - - G2 - - - - - - - | A2 - - - - - - - F2 - - - - - - -' },
    { wave: 'sine', vol: 0.1, notes: 'E4 - - - - - - - D4 - - - - - - - | C4 - - - - - - - E4 - - - - - - -' },
    { wave: 'triangle', vol: 0.07, notes: 'B5 . . . . . . . . . . . G5 . . . | . . . . . . . . E5 . . . . . . .' },
  ],
});
song('water', {
  bpm: 96,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.2,
      notes: 'G2 - . G2 - . D3 - C3 - . C3 - . G2 - A2 - . A2 - . E3 - D3 - . D3 - . A2 -',
    },
    {
      wave: 'square',
      vol: 0.06,
      notes: 'B4 . D5 . G5 . D5 . E5 . G5 . C6 . G5 . C5 . E5 . A5 . E5 . F#5 . A5 . D6 . A5 .',
    },
  ],
});
song('stepBed', {
  bpm: 112,
  tracks: [
    {
      wave: 'saw',
      vol: 0.06,
      notes: 'C4 . C4 . E4 . C4 . G3 . G3 . B3 . G3 . A3 . A3 . C4 . A3 . F3 . F3 . A3 . F3 .',
    },
    {
      wave: 'triangle',
      vol: 0.2,
      notes: 'C2 - - C2 - - C2 - G1 - - G1 - - G1 - A1 - - A1 - - A1 - F1 - - F1 - - F1 -',
    },
  ],
});
song('hoop', {
  bpm: 124,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.2,
      notes: 'D3 - - A2 - - D3 - G2 - - D3 - - G2 - E3 - - B2 - - E3 - A2 - - E3 - - A2 -',
    },
    {
      wave: 'square',
      vol: 0.05,
      notes: 'F#4 . A4 . D5 . A4 . G4 . B4 . D5 . B4 . G#4 . B4 . E5 . B4 . A4 . C#5 . E5 . C#5 .',
    },
  ],
});
song('tilt', {
  bpm: 84,
  tracks: [
    { wave: 'triangle', vol: 0.22, notes: 'A2 - - - E2 - - - F2 - - - C3 - - - | D2 - - - A2 - - - E2 - - - B2 - - -' },
    {
      wave: 'triangle',
      vol: 0.12,
      notes: 'C5 . E5 . A4 . C5 . A4 . C5 . F4 . A4 . | F4 . A4 . D4 . F4 . E4 . G#4 . B4 . G#4 .',
    },
    {
      wave: 'saw',
      vol: 0.06,
      intensity: 0.5,
      notes: 'A3 - - - - - - - F3 - - - - - - - | D3 - - - - - - - E3 - - - - - - -',
    },
  ],
});
song('dawn', {
  bpm: 66,
  tracks: [
    { wave: 'sine', vol: 0.2, notes: 'C3 - - - - - - - G2 - - - - - - - | F2 - - - - - - - C3 - - - - - - -' },
    { wave: 'triangle', vol: 0.1, notes: 'E5 - - - D5 - - - C5 - - - - - - - | D5 - - - E5 - - - C5 - - - - - - -' },
  ],
});
song('stamp', { bpm: 120, tracks: [{ wave: 'triangle', vol: 0.2, notes: 'C5 . E5 . G5 . C6 - - - . . . . . .' }] });

/** The Animalese banks: 16 syllables per speaker, a consonant burst and a saw through two formants. */
export const SPEAKERS = {
  tare: { base: 260, syl: 0.06, rise: 1.15, wobble: 0.04 },
  plumb: { base: 135, syl: 0.11, rise: 1, wobble: 0 },
  gerald: { base: 95, syl: 0.14, rise: 0.95, wobble: 0.02 },
  bex: { base: 210, syl: 0.08, rise: 0.97, wobble: 0.01 },
  nan: { base: 170, syl: 0.12, rise: 1.02, wobble: 0.08 },
  pa: { base: 135, syl: 0.11, rise: 1, wobble: 0 },
} as const;
const VOWELS: [number, number][] = [
  [800, 1200],
  [500, 1900],
  [300, 2300],
  [500, 900],
  [320, 800],
];
const CONS = [1800, 3200, 4500, 2400];
for (const [who, sp] of Object.entries(SPEAKERS)) {
  for (let i = 0; i < 16; i++) {
    const [f1, f2] = VOWELS[i % 5];
    const cb = CONS[i % 4];
    const f0 = 200;
    const d = sp.syl;
    const filt = who === 'pa' ? { type: 'bandpass', freq: 1500 } : null;
    const voices = [
      { wave: 'noise', dur: 0.015, vol: 0.12, attack: 0.001, filter: { type: 'bandpass', freq: cb } },
      {
        wave: 'saw',
        freq: f0,
        to: f0 * 0.92,
        at: 0.012,
        dur: d,
        vol: 0.5,
        attack: 0.006,
        filter: { type: 'bandpass', freq: filt ? 1500 : f1 },
        q: 7,
      },
      {
        wave: 'saw',
        freq: f0,
        to: f0 * 0.92,
        at: 0.012,
        dur: d,
        vol: 0.35,
        attack: 0.006,
        filter: { type: 'bandpass', freq: filt ? 1800 : f2 },
        q: 9,
      },
    ];
    defineSfx(`sfx:vo.${who}.${i}`, { bus: 'ui', voices } as never);
  }
}
