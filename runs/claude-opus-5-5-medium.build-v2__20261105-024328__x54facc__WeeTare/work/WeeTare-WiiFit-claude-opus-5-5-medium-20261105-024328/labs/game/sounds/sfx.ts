/**
 * @file Every sound effect as data, and the voices' syllable banks: for each speaker, 16 short consonant-then-vowel
 * entries (a saw through two formant filters). No audio files anywhere. `SPEAKERS` holds each voice's character.
 */
import { defineSfx } from '../../../engine';

const fx = (name: string, voices: object | object[], more: object = {}) =>
  defineSfx(`sfx:${name}`, { voices, ...more } as never);

fx(
  'wtCreak',
  { wave: 'saw', freq: 90, to: 60, dur: 0.22, vol: 0.2, filter: { type: 'bandpass', freq: 700 }, q: 6 },
  { variants: 3 },
);
fx('wtBreathIn', { wave: 'noise', dur: 0.8, vol: 0.09, attack: 0.3, filter: { type: 'bandpass', freq: 1400 } });
fx('wtBreathOut', { wave: 'noise', dur: 0.9, vol: 0.08, attack: 0.1, filter: { type: 'bandpass', freq: 800 } });
fx('wtSqueak', { wave: 'sine', freq: 1200, to: 1700, dur: 0.07, vol: 0.12 }, { variants: 3 });
fx('wtStamp', [
  { wave: 'noise', dur: 0.05, vol: 0.4, filter: { type: 'lowpass', freq: 900 } },
  { wave: 'sine', freq: 110, to: 60, dur: 0.14, vol: 0.6 },
]);
fx(
  'wtClack',
  [
    { wave: 'noise', dur: 0.03, vol: 0.3, filter: { type: 'bandpass', freq: 2400 } },
    { wave: 'triangle', freq: 880, to: 620, dur: 0.05, vol: 0.25 },
  ],
  { variants: 4 },
);
fx('wtSplash', { wave: 'noise', dur: 0.45, vol: 0.4, filter: { type: 'lowpass', freq: 2400 } });
fx('wtSplashBig', [
  { wave: 'noise', dur: 1.1, vol: 0.6, filter: { type: 'lowpass', freq: 1800 } },
  { wave: 'sine', freq: 80, to: 40, dur: 0.5, vol: 0.6 },
]);
fx(
  'wtGull',
  { wave: 'saw', freq: 1100, to: 620, dur: 0.28, vol: 0.2, vib: [22, 1.6], filter: { type: 'bandpass', freq: 1600 } },
  { variants: 3 },
);
fx('wtFrog', {
  wave: 'square',
  freq: 120,
  to: 90,
  dur: 0.22,
  vol: 0.2,
  vib: [30, 3],
  filter: { type: 'lowpass', freq: 800 },
});
fx(
  'wtRope',
  { wave: 'saw', freq: 170, to: 130, dur: 0.12, vol: 0.12, filter: { type: 'bandpass', freq: 500 } },
  { variants: 3 },
);
fx('wtWhoosh', { wave: 'noise', dur: 0.4, vol: 0.2, attack: 0.15, filter: { type: 'bandpass', freq: 1800 } });
fx('wtClap', { wave: 'noise', dur: 0.06, vol: 0.5, filter: { type: 'bandpass', freq: 1800 } });
fx('wtKick', { wave: 'sine', freq: 130, to: 45, dur: 0.14, vol: 0.8 });
fx('wtHat', { wave: 'noise', dur: 0.025, vol: 0.2, filter: { type: 'highpass', freq: 6000 } });
fx('wtWhistle', { wave: 'sine', freq: 2100, to: 2300, dur: 0.3, vol: 0.2, vib: [34, 0.7] });
fx('wtHorn', [
  { wave: 'saw', freq: 98, dur: 1.5, vol: 0.28, attack: 0.1, filter: { type: 'lowpass', freq: 500 } },
  { wave: 'saw', freq: 147, dur: 1.5, vol: 0.2, attack: 0.1, filter: { type: 'lowpass', freq: 600 } },
]);
fx('wtThunder', [
  { wave: 'noise', dur: 2.4, vol: 0.5, attack: 0.08, filter: { type: 'lowpass', freq: 900 } },
  { wave: 'sine', freq: 55, to: 30, dur: 1.4, vol: 0.5 },
]);
fx('wtGroan', {
  wave: 'saw',
  freq: 58,
  to: 41,
  dur: 2.2,
  vol: 0.34,
  attack: 0.3,
  filter: { type: 'lowpass', freq: 240 },
  vib: [3, 1],
});
fx('wtOoh', [
  { wave: 'saw', freq: 210, to: 240, dur: 0.6, vol: 0.14, attack: 0.1, filter: { type: 'bandpass', freq: 450 }, q: 5 },
  { wave: 'saw', freq: 280, to: 320, dur: 0.6, vol: 0.1, attack: 0.1, filter: { type: 'bandpass', freq: 800 }, q: 5 },
]);
fx('wtDing', { wave: 'sine', freq: 1320, dur: 0.3, vol: 0.2 }, { variants: 3 });
fx('wtBell', [
  { wave: 'sine', freq: 660, dur: 0.9, vol: 0.2 },
  { wave: 'sine', freq: 1320, dur: 0.5, vol: 0.08 },
]);
fx('wtMarble', { wave: 'noise', dur: 0.5, vol: 0.09, filter: { type: 'bandpass', freq: 3000 } });
fx('wtSink', { wave: 'sine', freq: 660, to: 220, dur: 0.22, vol: 0.3 });
fx(
  'wtSea',
  { wave: 'noise', dur: 4, vol: 0.14, attack: 1.2, filter: { type: 'lowpass', freq: 800 } },
  { bus: 'ambience' },
);
fx(
  'wtBirds',
  { wave: 'sine', freq: 3200, to: 3900, dur: 0.14, vol: 0.05, vib: [40, 1.2] },
  { bus: 'ambience', variants: 3 },
);
fx(
  'wtWind',
  { wave: 'noise', dur: 4, vol: 0.2, attack: 1.2, filter: { type: 'bandpass', freq: 500 } },
  { bus: 'ambience' },
);
fx(
  'wtRain',
  { wave: 'noise', dur: 3, vol: 0.2, attack: 0.5, filter: { type: 'highpass', freq: 2200 } },
  { bus: 'ambience' },
);
fx('wtBuzz', { wave: 'square', freq: 120, dur: 0.3, vol: 0.1, vib: [40, 1] });

/** Each voice: base pitch, syllable length, character. */
export const SPEAKERS = {
  tare: { base: 260, syllable: 0.06, contour: 1.2, vib: 0, sigh: false, narrow: false },
  plumb: { base: 135, syllable: 0.11, contour: 0, vib: 0, sigh: false, narrow: false },
  gerald: { base: 95, syllable: 0.14, contour: 0.3, vib: 0, sigh: false, narrow: false },
  bex: { base: 210, syllable: 0.08, contour: 0.1, vib: 0, sigh: true, narrow: false },
  nan: { base: 170, syllable: 0.12, contour: 0.4, vib: 6, sigh: false, narrow: false },
  pa: { base: 135, syllable: 0.11, contour: 0, vib: 0, sigh: false, narrow: true },
  plaque: { base: 190, syllable: 0.07, contour: 0.2, vib: 0, sigh: false, narrow: false },
} as const;

export type Speaker = keyof typeof SPEAKERS;

const VOWELS: readonly (readonly [number, number])[] = [
  [800, 1200],
  [500, 1900],
  [300, 2300],
  [500, 900],
  [320, 800],
];
const BANDS = [3200, 2400, 4200, 1600];

/** Bank ids `sfx:vo.<who>.<0-15>`. */
export function voiceId(who: Speaker, k: number): string {
  return `sfx:vo.${who}.${k}`;
}

for (const [who, s] of Object.entries(SPEAKERS)) {
  for (let k = 0; k < 16; k++) {
    const [f1, f2] = VOWELS[k % VOWELS.length];
    const q = s.narrow ? 16 : 7;
    const vib = s.vib ? { vib: [s.vib, 0.5] } : {};
    const dur = s.syllable * 1.15;
    defineSfx(voiceId(who as Speaker, k), {
      bus: 'ui',
      voices: [
        {
          wave: 'noise',
          dur: 0.012 + (k % 3) * 0.006,
          vol: 0.12,
          attack: 0.001,
          filter: { type: 'bandpass', freq: BANDS[k % BANDS.length] },
        },
        {
          wave: 'saw',
          freq: s.base,
          to: s.base * 0.92,
          at: 0.012,
          dur,
          vol: 0.5,
          attack: 0.006,
          filter: { type: 'bandpass', freq: s.narrow ? 1100 : f1 },
          q,
          ...vib,
        },
        {
          wave: 'saw',
          freq: s.base,
          to: s.base * 0.92,
          at: 0.012,
          dur,
          vol: 0.35,
          attack: 0.006,
          filter: { type: 'bandpass', freq: s.narrow ? 1400 : f2 },
          q: q + 2,
          ...vib,
        },
      ],
    } as never);
  }
}
