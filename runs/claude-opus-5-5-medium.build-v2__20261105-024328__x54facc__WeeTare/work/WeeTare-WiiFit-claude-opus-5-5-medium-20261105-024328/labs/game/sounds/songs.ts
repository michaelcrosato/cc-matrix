/**
 * @file The music, original, in tracker notation: light, slightly over-pleasant lobby music. Mixed so it is fine at 100% and
 * a whisper at the default 10%. Nothing a player needs lives only in the music; Step Class's beat is on the effects bus.
 */
import { defineSong } from '../../../engine';

const SEVENTH = 'C5 - E5 - G5 - B5 - | A4 - C5 - E5 - G5 - | F4 - A4 - C5 - E5 - | G4 - B4 - D5 - F#5 - ';

defineSong('song:lobby', {
  bpm: 84,
  steps: 2,
  tracks: [
    { wave: 'triangle', vol: 0.22, notes: SEVENTH },
    { wave: 'sine', vol: 0.3, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - ' },
    {
      wave: 'square',
      vol: 0.05,
      intensity: 0.4,
      notes: '. . E6 . . . G6 . | . . C6 . . . E6 . | . . A5 . . . C6 . | . . B5 . . . D6 . ',
    },
    {
      wave: 'triangle',
      vol: 0.12,
      intensity: 0.7,
      notes: 'G4 . G4 . B4 . B4 . | E4 . E4 . G4 . G4 . | C4 . C4 . E4 . E4 . | D4 . D4 . F#4 . F#4 . ',
    },
  ],
} as never);
defineSong('song:stillness', {
  bpm: 60,
  steps: 2,
  tracks: [
    { wave: 'sine', vol: 0.3, notes: 'C4 - - - - - - - | G3 - - - - - - - ' },
    { wave: 'sine', vol: 0.2, notes: 'E4 - - - - - - - | B3 - - - - - - - ' },
    { wave: 'triangle', vol: 0.1, notes: '. . . . G5 . . . | . . . . D5 . . . ' },
  ],
} as never);
defineSong('song:water', {
  bpm: 96,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.22,
      notes: 'G4 . B4 D5 . B4 G4 . | A4 . C5 E5 . C5 A4 . | F4 . A4 C5 . A4 F4 . | G4 . B4 D5 - - . . ',
    },
    { wave: 'sine', vol: 0.3, notes: 'G2 . . . D3 . . . | A2 . . . E3 . . . | F2 . . . C3 . . . | G2 . . . D3 . . . ' },
  ],
} as never);
defineSong('song:stepBed', {
  bpm: 112,
  steps: 2,
  tracks: [
    {
      wave: 'square',
      vol: 0.1,
      notes: 'C4 . C4 C4 . C4 . . | F4 . F4 F4 . F4 . . | G4 . G4 G4 . G4 . . | C4 . C4 C4 . C4 . . ',
    },
    {
      wave: 'triangle',
      vol: 0.28,
      notes: 'C3 - . . G2 - . . | F2 - . . C3 - . . | G2 - . . D3 - . . | C3 - . . G2 - . . ',
    },
  ],
} as never);
defineSong('song:hoop', {
  bpm: 100,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.2,
      notes: 'D5 . . F#5 . . A5 . | . G5 . . E5 . . C#5 | D5 . . F#5 . . A5 . | . B5 . A5 . F#5 . . ',
    },
    {
      wave: 'sine',
      vol: 0.3,
      notes: 'D3 . . A2 . . D3 . | A2 . . E3 . . A2 . | D3 . . A2 . . D3 . | G2 . . A2 . . D3 . ',
    },
  ],
} as never);
defineSong('song:tilt', {
  bpm: 84,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.22,
      notes: 'C5 - Eb5 - G5 - Bb5 - | Ab4 - C5 - Eb5 - G5 - | F4 - Ab4 - C5 - Eb5 - | G4 - Bb4 - D5 - F5 - ',
    },
    { wave: 'sine', vol: 0.34, notes: 'C3 - - - - - - - | Ab2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - ' },
    {
      wave: 'saw',
      vol: 0.08,
      intensity: 0.4,
      notes: 'C4 - - - C4 - - - | Ab3 - - - Ab3 - - - | F3 - - - F3 - - - | G3 - - - G3 - - - ',
    },
    {
      wave: 'drums',
      vol: 0.14,
      intensity: 0.7,
      notes: 'k . . . k . . . | k . . . k . . . | k . . . k . . . | k . . k k . . . ',
    },
  ],
} as never);
defineSong('song:dawn', {
  bpm: 60,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.24,
      notes: 'C5 - E5 - G5 - B5 - | A4 - C5 - E5 - G5 - | F4 - A4 - C5 - E5 - | C5 - - - - - - - ',
    },
    { wave: 'sine', vol: 0.2, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - ' },
  ],
} as never);
defineSong('song:stamp', {
  bpm: 132,
  steps: 2,
  tracks: [
    { wave: 'triangle', vol: 0.3, notes: 'C5 E5 G5 C6 - - - - ' },
    { wave: 'sine', vol: 0.3, notes: 'C3 - - - C3 - - - ' },
  ],
} as never);
