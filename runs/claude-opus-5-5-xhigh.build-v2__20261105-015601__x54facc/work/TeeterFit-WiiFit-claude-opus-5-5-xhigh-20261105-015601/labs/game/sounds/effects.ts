/**
 * @file The game's sound effects (PLAN.md section 12): wobble creak, breath, mat squeak, stamp thump, pebble clack,
 * splashes, gull, frog, rope, marble roll, hoop whoosh, clap, kick, hat, whistle, ferry horn, thunder, the island's groan,
 * a polite "ooh", and ambience loops. All voices in the synth's words: no audio files.
 *
 * Game code, a page's.
 *
 * @example
 * // audio.play('sfx:stamp');
 */
import { defineSfx } from '../../../engine';

/** An effect on the effects bus. */
const fx = (id: string, voices: unknown, more: object = {}) => defineSfx(`sfx:${id}`, { voices, ...more } as never);

fx(
  'creak',
  [
    {
      wave: 'saw',
      freq: 90,
      to: 140,
      dur: 0.22,
      vol: 0.14,
      filter: { type: 'bandpass', freq: 520 },
      q: 8,
      vib: [24, 0.05],
    },
  ],
  { variants: 3 },
);
fx('breathIn', [{ wave: 'noise', dur: 1.6, vol: 0.05, attack: 0.5, filter: { type: 'bandpass', freq: 1100 }, q: 0.9 }]);
fx('breathOut', [
  { wave: 'noise', dur: 1.8, vol: 0.045, attack: 0.1, filter: { type: 'bandpass', freq: 620 }, q: 0.9 },
]);
fx('squeak', [{ wave: 'sine', freq: 1500, to: 2100, dur: 0.07, vol: 0.09 }], { variants: 3 });
fx('stamp', [
  { wave: 'sine', freq: 130, to: 50, dur: 0.2, vol: 0.5 },
  { wave: 'noise', dur: 0.05, vol: 0.25, filter: { type: 'lowpass', freq: 900 } },
]);
fx(
  'clack',
  [
    { wave: 'noise', dur: 0.04, vol: 0.3, filter: { type: 'bandpass', freq: 2800 }, q: 3 },
    { wave: 'sine', freq: 800, to: 500, dur: 0.05, vol: 0.2 },
  ],
  { variants: 4 },
);
fx(
  'splash',
  [
    { wave: 'noise', dur: 0.5, vol: 0.34, filter: { type: 'lowpass', freq: 2400 } },
    { wave: 'noise', dur: 0.2, at: 0.05, vol: 0.2, filter: { type: 'highpass', freq: 3000 } },
  ],
  { variants: 3 },
);
fx('splashBig', [
  { wave: 'noise', dur: 1.2, vol: 0.5, filter: { type: 'lowpass', freq: 1800 } },
  { wave: 'sine', freq: 110, to: 45, dur: 0.5, vol: 0.5 },
  { wave: 'noise', dur: 0.8, at: 0.25, vol: 0.2, filter: { type: 'highpass', freq: 3600 } },
]);
fx(
  'gull',
  [
    { wave: 'saw', freq: 1300, to: 760, dur: 0.22, vol: 0.14, filter: { type: 'bandpass', freq: 1900 }, q: 3 },
    {
      wave: 'saw',
      freq: 1200,
      to: 800,
      at: 0.26,
      dur: 0.18,
      vol: 0.12,
      filter: { type: 'bandpass', freq: 1800 },
      q: 3,
    },
  ],
  { variants: 3 },
);
fx('frog', [
  {
    wave: 'saw',
    freq: 130,
    to: 90,
    dur: 0.14,
    vol: 0.28,
    filter: { type: 'bandpass', freq: 500 },
    q: 5,
    vib: [38, 0.2],
  },
  {
    wave: 'saw',
    freq: 120,
    to: 85,
    at: 0.2,
    dur: 0.18,
    vol: 0.28,
    filter: { type: 'bandpass', freq: 480 },
    q: 5,
    vib: [38, 0.2],
  },
]);
fx(
  'rope',
  [
    {
      wave: 'saw',
      freq: 200,
      to: 170,
      dur: 0.16,
      vol: 0.09,
      filter: { type: 'bandpass', freq: 900 },
      q: 7,
      vib: [30, 0.04],
    },
  ],
  { variants: 3 },
);
fx('marble', [{ wave: 'noise', dur: 0.5, vol: 0.09, filter: { type: 'bandpass', freq: 700 }, q: 3 }], { loop: 0.45 });
fx('tap', [{ wave: 'sine', freq: 1800, to: 1400, dur: 0.03, vol: 0.16 }], { variants: 3 });
fx('plop', [{ wave: 'sine', freq: 500, to: 1000, dur: 0.1, vol: 0.28 }]);
fx(
  'hoopWhoosh',
  [{ wave: 'noise', dur: 0.35, vol: 0.14, attack: 0.12, filter: { type: 'bandpass', freq: 1500 }, q: 1.6 }],
  { variants: 3 },
);
fx('clap', [
  { wave: 'noise', dur: 0.08, vol: 0.34, filter: { type: 'bandpass', freq: 1500 }, q: 1.1 },
  { wave: 'noise', at: 0.012, dur: 0.06, vol: 0.22, filter: { type: 'bandpass', freq: 2100 }, q: 1.1 },
]);
fx('stepKick', [{ wave: 'sine', freq: 120, to: 45, dur: 0.14, vol: 0.6 }]);
fx('hat', [{ wave: 'noise', dur: 0.03, vol: 0.14, filter: { type: 'highpass', freq: 6500 } }]);
fx('whistle', [{ wave: 'sine', freq: 2200, to: 2400, dur: 0.3, vol: 0.14, vib: [38, 0.03] }]);
fx('ferryHorn', [
  { wave: 'saw', freq: 110, dur: 2.2, vol: 0.2, attack: 0.3, filter: { type: 'lowpass', freq: 500 } },
  { wave: 'saw', freq: 138, dur: 2.2, vol: 0.14, attack: 0.3, filter: { type: 'lowpass', freq: 500 } },
]);
fx('thunder', [
  { wave: 'noise', dur: 2.6, vol: 0.6, attack: 0.05, filter: { type: 'lowpass', freq: 240 } },
  { wave: 'sine', freq: 60, to: 35, dur: 1.6, vol: 0.4 },
]);
fx('groan', [
  {
    wave: 'saw',
    freq: 55,
    to: 42,
    dur: 2.4,
    vol: 0.22,
    attack: 0.5,
    filter: { type: 'lowpass', freq: 320 },
    vib: [5, 0.03],
  },
]);
fx('ooh', [
  { wave: 'saw', freq: 280, to: 350, dur: 0.6, vol: 0.09, attack: 0.1, filter: { type: 'bandpass', freq: 800 }, q: 4 },
  { wave: 'saw', freq: 340, to: 420, dur: 0.6, vol: 0.07, attack: 0.1, filter: { type: 'bandpass', freq: 900 }, q: 4 },
]);
fx('good', [{ wave: 'triangle', freq: 'G5', dur: 0.08, vol: 0.16 }]);
fx('perfect', [{ wave: 'triangle', freq: 'C6', dur: 0.1, vol: 0.2, arp: [0, 7], step: 0.05 }]);
fx('miss', [{ wave: 'sine', freq: 220, to: 170, dur: 0.1, vol: 0.14 }]);
fx('moved', [{ wave: 'sine', freq: 300, to: 200, dur: 0.24, vol: 0.16, filter: { type: 'lowpass', freq: 900 } }]);
fx('dialSpin', [{ wave: 'pulse', freq: 900, to: 1600, dur: 1.2, vol: 0.05, vib: [40, 0.3] }]);
defineSfx('sfx:ambSea', {
  voices: [{ wave: 'noise', dur: 4, vol: 0.09, attack: 1.2, release: 1.2, filter: { type: 'lowpass', freq: 800 } }],
  bus: 'ambience',
  loop: 4,
} as never);
defineSfx('sfx:ambBirds', {
  voices: [
    { wave: 'sine', freq: 2600, to: 3100, dur: 0.1, at: 0, vol: 0.03 },
    { wave: 'sine', freq: 3000, to: 2500, dur: 0.1, at: 0.25, vol: 0.03 },
    { wave: 'sine', freq: 2400, to: 2900, dur: 0.12, at: 2.8, vol: 0.025 },
  ],
  bus: 'ambience',
  loop: 6,
} as never);
defineSfx('sfx:ambWind', {
  voices: [
    { wave: 'noise', dur: 5, vol: 0.13, attack: 1.6, release: 1.6, filter: { type: 'bandpass', freq: 500 }, q: 0.8 },
  ],
  bus: 'ambience',
  loop: 5,
} as never);
defineSfx('sfx:ambRain', {
  voices: [{ wave: 'noise', dur: 3, vol: 0.16, attack: 0.6, release: 0.6, filter: { type: 'highpass', freq: 2200 } }],
  bus: 'ambience',
  loop: 3,
} as never);

/** Formants (f1, f2) of the five vowels the voices use. */
const VOWELS: readonly (readonly [number, number])[] = [
  [800, 1200],
  [500, 1900],
  [300, 2300],
  [500, 900],
  [320, 800],
];

/** One syllable: a short consonant noise, then a saw through two bandpass filters at a vowel's formants. */
const syllable = (f0: number, f1: number, f2: number, length: number, band: number, breath: number, vib: boolean) => ({
  bus: 'ui',
  voices: [
    { wave: 'noise', dur: 0.015 + breath, vol: 0.12, attack: 0.001, filter: { type: 'bandpass', freq: band } },
    {
      wave: 'saw',
      freq: f0,
      to: f0 * 0.92,
      at: 0.012,
      dur: length,
      vol: 0.5,
      attack: 0.006,
      filter: { type: 'bandpass', freq: f1 },
      q: 7,
      ...(vib ? { vib: [6.5, 0.04] } : {}),
    },
    {
      wave: 'saw',
      freq: f0,
      to: f0 * 0.92,
      at: 0.012,
      dur: length,
      vol: 0.35,
      attack: 0.006,
      filter: { type: 'bandpass', freq: f2 },
      q: 9,
      ...(vib ? { vib: [6.5, 0.04] } : {}),
    },
  ],
});

/** The speakers: base pitch and syllable length (PLAN.md section 12). */
export const SPEAKERS: Readonly<
  Record<string, { base: number; length: number; breath?: number; vib?: boolean; narrow?: boolean }>
> = {
  tare: { base: 260, length: 0.06 },
  plumb: { base: 135, length: 0.11, breath: 0.03 },
  gerald: { base: 95, length: 0.14 },
  bex: { base: 210, length: 0.08 },
  nan: { base: 170, length: 0.12, vib: true },
  pa: { base: 135, length: 0.11, narrow: true },
};

for (const [name, s] of Object.entries(SPEAKERS)) {
  for (let i = 0; i < 16; i++) {
    const [f1, f2] = VOWELS[i % VOWELS.length];
    const band = 1800 + (i % 4) * 700;
    const spec = syllable(
      s.base,
      s.narrow ? 900 + (f1 - 500) * 0.2 : f1,
      s.narrow ? 1500 : f2,
      s.length * (1 + (i % 3) * 0.08),
      band,
      s.breath ?? 0,
      s.vib ?? false,
    );
    defineSfx(`sfx:vo.${name}.${i}`, spec as never);
  }
}
