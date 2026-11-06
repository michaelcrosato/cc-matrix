/**
 * @file Gibberish voices. Each speaker has sixteen syllables. The same line always babbles the same way.
 * A syllable is a short noise, then a saw through two vowel bands.
 */
import { defineSfx, type Audio } from '../../../engine';

/** Who can speak, and how. */
export const SPEAKERS = {
  tare: { f0: 260, dur: 0.06 },
  plumb: { f0: 135, dur: 0.11 },
  gerald: { f0: 95, dur: 0.14 },
  bex: { f0: 210, dur: 0.08 },
  nan: { f0: 170, dur: 0.12 },
  pa: { f0: 135, dur: 0.11 },
} as const;

/** A speaker id. */
export type Speaker = keyof typeof SPEAKERS;

/** Vowel bands. Sixteen slots walk this list and a few neighbours. */
const FORMANTS: readonly (readonly [number, number])[] = [
  [800, 1200],
  [500, 1900],
  [300, 2300],
  [500, 900],
  [320, 800],
  [700, 1400],
  [450, 1700],
  [360, 2100],
];

/** One syllable id. */
export function syllableId(speaker: Speaker, index: number): string {
  return `sfx:vo.${speaker}.${index}`;
}

/** Registers the bank. The PA uses Plumb's pitch through a narrower band. */
function register(): void {
  for (const name of Object.keys(SPEAKERS) as Speaker[]) {
    const spec = SPEAKERS[name];
    for (let i = 0; i < 16; i++) {
      const form = FORMANTS[i % FORMANTS.length] ?? [500, 1500];
      const f1 = name === 'pa' ? form[0] * 0.85 : form[0];
      const f2 = name === 'pa' ? form[1] * 0.75 : form[1];
      const dur = spec.dur * (0.85 + (i % 5) * 0.05);
      defineSfx(syllableId(name, i), {
        bus: 'ui',
        voices: [
          {
            wave: 'noise',
            dur: 0.015,
            vol: 0.12,
            attack: 0.001,
            filter: { type: 'bandpass', freq: 2400 + i * 80, q: 2 },
          },
          {
            wave: 'saw',
            freq: spec.f0,
            to: spec.f0 * 0.92,
            at: 0.012,
            dur,
            vol: 0.5,
            attack: 0.006,
            filter: { type: 'bandpass', freq: f1, q: 7 },
          },
          {
            wave: 'saw',
            freq: spec.f0,
            to: spec.f0 * 0.92,
            at: 0.012,
            dur,
            vol: 0.35,
            attack: 0.006,
            filter: { type: 'bandpass', freq: f2, q: 9 },
          },
        ],
      });
    }
  }
}

register();

/** A small hash, so a line picks syllables from its letters and nothing else. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Says `text` as `speaker`. One syllable for every two letters. Spaces and stops leave a gap. */
export function say(audio: Audio, speaker: Speaker, text: string, volume = 1): void {
  const spec = SPEAKERS[speaker];
  let when = 0;
  for (let i = 0; i < text.length; i += 2) {
    const pair = text.slice(i, i + 2);
    if (!/[a-z0-9]/i.test(pair)) {
      when += spec.dur * 1.4;
      continue;
    }
    const index = hash(`${speaker}:${pair}:${i}`) % 16;
    const rise = text.includes('?') ? 1.06 : text.includes('.') ? 0.96 : 1;
    audio.play(syllableId(speaker, index), {
      pitch: rise,
      when,
      vol: 0.8 * volume,
      bus: 'ui',
      duck: true,
    });
    when += spec.dur;
  }
}

/** Who says a line id. Plumb takes the class. Tare takes the morning. */
export function speakerFor(id: string): Speaker {
  if (id.startsWith('plumb') || id.startsWith('pose') || id.startsWith('group')) return 'plumb';
  if (id.startsWith('gerald')) return 'gerald';
  if (id.startsWith('bex')) return 'bex';
  if (id.startsWith('nan') || id.startsWith('tilt')) return 'nan';
  if (id.startsWith('pa')) return 'pa';
  return 'tare';
}
