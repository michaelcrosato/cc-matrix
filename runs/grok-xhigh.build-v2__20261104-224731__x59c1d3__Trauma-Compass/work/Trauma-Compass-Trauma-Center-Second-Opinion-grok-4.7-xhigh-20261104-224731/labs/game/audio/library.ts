/**
 * @file The theatre's music and effects, written as chip voices. No samples, no audio files.
 */
import { defineSfx, defineSong } from '../../../engine';

defineSfx('sfx:compass-cut', {
  voices: { wave: 'noise', freq: 1800, to: 400, dur: 0.12, vol: 0.22, filter: 'highpass' },
});
defineSfx('sfx:compass-stitch', { voices: { wave: 'triangle', freq: 520, to: 180, dur: 0.08, vol: 0.2 } });
defineSfx('sfx:compass-drain', {
  voices: { wave: 'noise', freq: 240, to: 90, dur: 0.28, vol: 0.2, filter: 'lowpass' },
});
defineSfx('sfx:compass-laser', { voices: { wave: 'saw', freq: 660, to: 740, dur: 0.16, vol: 0.12 } });
defineSfx('sfx:compass-syringe', { voices: { wave: 'square', freq: 1400, to: 900, dur: 0.05, vol: 0.16 } });
defineSfx('sfx:compass-gel', { voices: { wave: 'sine', freq: 220, to: 140, dur: 0.18, vol: 0.2 } });
defineSfx('sfx:compass-scan', { voices: { wave: 'sine', freq: 880, to: 1320, dur: 0.14, vol: 0.16 } });
defineSfx('sfx:compass-forceps', { voices: { wave: 'square', freq: 340, to: 220, dur: 0.06, vol: 0.18 } });
defineSfx('sfx:compass-beep', { voices: { wave: 'square', freq: 880, dur: 0.06, vol: 0.12 } });
defineSfx('sfx:compass-alarm', { voices: { wave: 'saw', freq: 440, to: 660, dur: 0.3, vol: 0.2 } });
defineSfx('sfx:compass-rank', {
  voices: { wave: 'triangle', freq: 523, arp: [0, 4, 7, 12], step: 0.07, dur: 0.4, vol: 0.22 },
});
defineSfx('sfx:compass-menu', { voices: { wave: 'square', freq: 660, to: 880, dur: 0.04, vol: 0.12 }, bus: 'ui' });

/** One bar is four steps. Every track below fills whole bars. */
const SONG = { steps: 1, beats: 4 } as const;

defineSong('song:compass-title', {
  bpm: 92,
  ...SONG,
  tracks: [
    { wave: 'triangle', vol: 0.16, notes: 'A3 - C4 - | E4 - C4 - | A3 - D4 - | E4 - C4 -' },
    { wave: 'sine', vol: 0.08, notes: 'A2 - - - | A2 - - - | F2 - - - | A2 - - -' },
  ],
});

defineSong('song:compass-or', {
  bpm: 100,
  ...SONG,
  tracks: [
    { wave: 'triangle', vol: 0.14, notes: 'C4 - E4 - | G4 - E4 - | D4 - F4 - | E4 - C4 -' },
    { wave: 'sine', vol: 0.07, notes: 'C3 - G3 - | A3 - G3 - | F3 - A3 - | G3 - E3 -' },
  ],
});

defineSong('song:compass-strain', {
  bpm: 128,
  ...SONG,
  tracks: [
    { wave: 'saw', vol: 0.1, notes: 'E4 - G4 - | Bb4 - G4 - | E4 - A4 - | Bb4 - G4 -' },
    { wave: 'triangle', vol: 0.12, notes: 'E3 - - - | E3 - - - | F3 - - - | E3 - - -' },
  ],
});

defineSong('song:compass-mercy', {
  bpm: 72,
  ...SONG,
  tracks: [
    { wave: 'sine', vol: 0.14, notes: 'G4 - - - | B4 - - - | D5 - - - | B4 - - -' },
    { wave: 'triangle', vol: 0.1, notes: 'G3 - D4 - | G3 - D4 - | A3 - E4 - | G3 - D4 -' },
  ],
});

defineSong('song:compass-story', {
  bpm: 84,
  ...SONG,
  tracks: [{ wave: 'triangle', vol: 0.12, notes: 'F4 - A4 - | C5 - A4 - | G4 - Bb4 - | A4 - F4 -' }],
});

defineSong('song:compass-jingle', {
  bpm: 150,
  ...SONG,
  tracks: [{ wave: 'square', vol: 0.1, notes: 'C5 E5 G5 C6 | E5 - G5 -' }],
});

defineSong('song:compass-win', {
  bpm: 120,
  ...SONG,
  tracks: [{ wave: 'triangle', vol: 0.16, notes: 'C4 E4 G4 C5 | E5 - - -' }],
});

defineSong('song:compass-lose', {
  bpm: 70,
  ...SONG,
  tracks: [{ wave: 'saw', vol: 0.08, notes: 'E4 - C4 - | A3 - - -' }],
});
