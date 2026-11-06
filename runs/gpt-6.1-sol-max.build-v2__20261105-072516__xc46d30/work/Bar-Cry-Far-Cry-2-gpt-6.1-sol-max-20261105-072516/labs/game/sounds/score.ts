/** @file Original tracker score and synthesized field sounds. Nothing here loads recorded audio. */
import { defineSong, defineSfx } from '../../../engine';

const melodies = [
  'D4 - . . A3 . . . C4 - . D4 . . F4 . | E4 - . . C4 . . . A3 - . . D4 - . .',
  'D3 . . A3 . . C4 . D4 - . . A3 . . . | F3 . . C4 . . D4 . E4 - . . D4 . . .',
  'D4 . D4 . F4 . . D4 A4 . G4 . F4 . D4 . | C4 . D4 . F4 . G4 . A4 . F4 . D4 - . .',
  'D4 - - . F4 - . . A4 - - . G4 - . . | F4 - . . E4 - . . D4 - - - . . . .',
];
for (let k = 0; k < 4; k++)
  defineSong(`song:field-${k}`, {
    bpm: [76, 82, 126, 68][k],
    steps: 4,
    tracks: [
      { wave: 'pluck', vol: 0.35, notes: melodies[k], gate: 0.7 },
      { wave: 'triangle', vol: 0.16, notes: 'D2 - . . . . A2 . D2 - . . . . . .', gate: 0.5 },
      {
        wave: 'drums',
        vol: k === 2 ? 0.18 : 0.08,
        notes: 'k . . . h . . . k . . k h . . .',
        intensity: k === 1 ? 0.4 : 0,
      },
    ],
  });
const sounds: [string, number, number, number][] = [
  ['shot', 180, 0.2, 0.8],
  ['reload', 1050, 0.22, 0.16],
  ['rack', 740, 0.13, 0.22],
  ['jam', 320, 0.04, 0.22],
  ['use', 520, 0.08, 0.08],
  ['ui', 660, 0.06, 0.06],
  ['tick', 2200, 0.025, 0.08],
  ['melee', 190, 0.18, 0.15],
  ['flare', 580, 0.5, 0.2],
  ['explosion', 62, 1.1, 0.55],
  ['engine', 85, 0.7, 0.1],
  ['fire', 280, 0.65, 0.12],
  ['wind', 500, 1.5, 0.06],
  ['heartbeat', 55, 0.22, 0.14],
  ['medicine', 1500, 0.23, 0.12],
  ['bark', 170, 0.14, 0.12],
  ['thunder', 40, 2.5, 0.3],
  ['footstep', 180, 0.1, 0.07],
];
for (const [key, freq, dur, vol] of sounds)
  defineSfx(`sfx:field-${key}`, {
    voices: [
      {
        wave: key === 'engine' || key === 'heartbeat' ? 'sine' : 'noise',
        freq,
        to: freq * 0.6,
        dur,
        vol,
        attack: 0.004,
        filter: { type: 'lowpass', freq: freq * 4 },
      },
      ...(key === 'shot' ? [{ wave: 'sine' as const, freq: 110, to: 40, dur: 0.12, vol: 0.35 }] : []),
    ],
    variants: 4,
    vary: 0.1,
  });
for (const [key, f1, f2] of [
  ['a', 730, 1090],
  ['e', 530, 1840],
  ['i', 300, 2200],
  ['o', 570, 840],
  ['u', 320, 800],
] as const)
  defineSfx(`sfx:field-voice-${key}`, {
    voices: [
      {
        wave: 'saw',
        freq: 170,
        to: 150,
        dur: 0.1,
        vol: 0.5,
        attack: 0.008,
        filter: { type: 'bandpass', freq: f1, q: 5 },
      },
      {
        wave: 'saw',
        freq: 170,
        to: 150,
        dur: 0.1,
        vol: 0.35,
        attack: 0.008,
        filter: { type: 'bandpass', freq: f2, q: 7 },
      },
      { wave: 'noise', dur: 0.015, vol: 0.05, filter: { type: 'bandpass', freq: 2600, q: 2 } },
    ],
    variants: 3,
    vary: 0.05,
  });
