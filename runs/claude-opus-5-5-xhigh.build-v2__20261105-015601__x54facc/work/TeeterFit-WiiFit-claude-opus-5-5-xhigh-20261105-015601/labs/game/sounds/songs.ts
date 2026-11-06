/**
 * @file The game's music (PLAN.md section 12), all original, in tracker notation: light, slightly over-pleasant lobby
 * music with plucks and soft marimba. Eight bars of chords in eighth notes; the lobby grows layers by day, and the tilt is
 * the lobby in minor. Each song is fine at full volume and a whisper at the default 10%; nothing the player needs lives
 * only in the music.
 *
 * Game code, a page's.
 *
 * @example
 * // audio.music('song:lobby');
 */
import { defineSong } from '../../../engine';

/** Repeats a phrase of notes `n` times, as one track. */
const twice = (notes: string, n = 2) => Array.from({ length: n }, () => notes).join(' | ');

/** Lobby: 84 BPM in C, major sevenths, pluck over a soft bass. Eight bars of eighths. */
const LOBBY_MELODY =
  'E5 . G5 B5 - . A5 . | G5 . E5 D5 - . C5 . | A4 . C5 E5 - . G5 . | F#5 . E5 D5 - - . . | E5 . G5 C6 - . B5 . | A5 . G5 E5 - . D5 . | C5 . E5 A5 - . G5 . | D5 . E5 C5 - - . .';
const LOBBY_BASS =
  'C3 - - G3 - - C3 . | A2 - - E3 - - A2 . | F2 - - C3 - - F2 . | G2 - - D3 - - G2 . | C3 - - G3 - - C3 . | A2 - - E3 - - A2 . | D3 - - A3 - - D3 . | G2 - - D3 - - G2 .';
const LOBBY_CHORDS =
  'G4 B4 E5 B4 G4 B4 E5 B4 | E4 G4 C5 G4 E4 G4 C5 G4 | C4 E4 A4 E4 C4 E4 A4 E4 | D4 G4 B4 G4 D4 G4 B4 G4 | G4 B4 E5 B4 G4 B4 E5 B4 | E4 G4 C5 G4 E4 G4 C5 G4 | F4 A4 D5 A4 F4 A4 D5 A4 | D4 G4 B4 G4 D4 G4 B4 G4';

defineSong('song:lobby', {
  bpm: 84,
  steps: 2,
  tracks: [
    { wave: 'triangle', vol: 0.2, notes: LOBBY_BASS },
    { wave: 'pluck', vol: 0.18, notes: LOBBY_CHORDS, intensity: 0.15 },
    { wave: 'sine', vol: 0.2, notes: LOBBY_MELODY, intensity: 0.45 },
    { wave: 'triangle', vol: 0.09, octave: 1, gate: 0.4, notes: LOBBY_MELODY, intensity: 0.75 },
  ],
} as never);

/** Stillness: 60 BPM, a pad and one sparse bell per breath. */
defineSong('song:stillness', {
  bpm: 60,
  steps: 1,
  tracks: [
    {
      wave: 'sine',
      vol: 0.14,
      attack: 0.9,
      notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -',
    },
    {
      wave: 'sine',
      vol: 0.09,
      attack: 0.9,
      notes: 'G4 - - - - - - - | E4 - - - - - - - | C4 - - - - - - - | D4 - - - - - - -',
    },
    {
      wave: 'triangle',
      vol: 0.1,
      gate: 0.2,
      notes: 'E6 . . . . . . . | C6 . . . . . . . | A5 . . . . . . . | B5 . . . . . . .',
      intensity: 0.2,
    },
  ],
} as never);

/** Water: bouncy, 96 BPM. */
defineSong('song:water', {
  bpm: 96,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.22,
      gate: 0.5,
      notes: twice('F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | Bb2 . F3 . Bb2 . F3 . | C3 . G2 . C3 . E3 .'),
    },
    {
      wave: 'pluck',
      vol: 0.17,
      notes: twice('A4 C5 . F5 . C5 A4 . | F4 A4 . D5 . A4 F4 . | D4 F4 . Bb4 . F4 D4 . | E4 G4 . C5 . G4 E4 .'),
    },
    {
      wave: 'sine',
      vol: 0.15,
      gate: 0.6,
      notes:
        'C6 . A5 . F5 . . . | D6 . A5 . F5 . . . | Bb5 . F5 . D5 . . . | C6 . G5 . E5 . . . | C6 . A5 . F5 . A5 . | D6 . C6 . A5 . . . | Bb5 . C6 . D6 . . . | C6 . . . . . . .',
    },
  ],
} as never);

/** Step Class's bed, at each chart's tempo: clavinet, and no drums, so nothing flams against the claps. */
for (const bpm of [104, 112, 120]) {
  defineSong(`song:stepBed${bpm}`, {
    bpm,
    steps: 2,
    tracks: [
      {
        wave: 'pulse',
        vol: 0.13,
        gate: 0.35,
        notes: twice('D3 . D3 F3 . D3 G3 . | D3 . D3 F3 . A3 G3 . | Bb2 . Bb2 D3 . Bb2 C3 . | A2 . A2 C#3 . E3 A3 .'),
      },
      {
        wave: 'pulse',
        vol: 0.09,
        gate: 0.3,
        octave: 1,
        notes: twice('. F4 . A4 . F4 . A4 | . G4 . C5 . G4 . C5 | . F4 . Bb4 . F4 . Bb4 | . E4 . A4 . C#5 . A4'),
      },
    ],
  } as never);
}

/** A silly bossa, for Hoop Patrol and Sand Garden. */
defineSong('song:hoop', {
  bpm: 112,
  steps: 2,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.22,
      gate: 0.6,
      notes: twice('G2 . . D3 G3 . . D3 | C3 . . G3 C3 . . G3 | A2 . . E3 A3 . . E3 | D3 . . A3 F#3 . D3 .'),
    },
    {
      wave: 'pluck',
      vol: 0.16,
      notes: twice('. B4 . D5 . B4 D5 . | . C5 . E5 . G5 E5 . | . C5 . E5 . A5 E5 . | . A4 . C5 . F#5 C5 .'),
    },
    {
      wave: 'square',
      vol: 0.05,
      gate: 0.25,
      notes:
        'G5 . E5 . D5 . B4 . | C5 . E5 . G5 . . . | A5 . G5 . E5 . C5 . | D5 . F#5 . A5 . . . | G5 . A5 . B5 . D6 . | C6 . B5 . G5 . . . | A5 . C6 . E6 . C6 . | D6 . . . . . . .',
      intensity: 0.35,
    },
  ],
} as never);

/** The tilt: the lobby in minor; layers build with the tilt. */
const TILT_BASS =
  'C3 - - G3 - - C3 . | Ab2 - - Eb3 - - Ab2 . | F2 - - C3 - - F2 . | G2 - - D3 - - G2 . | C3 - - G3 - - C3 . | Ab2 - - Eb3 - - Ab2 . | D3 - - Ab3 - - D3 . | G2 - - D3 - - G2 .';
defineSong('song:tilt', {
  bpm: 84,
  steps: 2,
  tracks: [
    { wave: 'saw', vol: 0.12, notes: TILT_BASS },
    {
      wave: 'pluck',
      vol: 0.18,
      notes:
        'G4 Bb4 Eb5 Bb4 G4 Bb4 Eb5 Bb4 | Eb4 G4 C5 G4 Eb4 G4 C5 G4 | C4 Eb4 Ab4 Eb4 C4 Eb4 Ab4 Eb4 | D4 G4 B4 G4 D4 G4 B4 G4 | G4 Bb4 Eb5 Bb4 G4 Bb4 Eb5 Bb4 | Eb4 G4 C5 G4 Eb4 G4 C5 G4 | F4 Ab4 D5 Ab4 F4 Ab4 D5 Ab4 | D4 G4 B4 G4 D4 G4 B4 G4',
      intensity: 0.2,
    },
    {
      wave: 'sine',
      vol: 0.18,
      notes:
        'Eb5 . G5 Bb5 - . Ab5 . | G5 . Eb5 D5 - . C5 . | Ab4 . C5 Eb5 - . G5 . | F5 . Eb5 D5 - - . . | Eb5 . G5 C6 - . Bb5 . | Ab5 . G5 Eb5 - . D5 . | C5 . Eb5 Ab5 - . G5 . | D5 . Eb5 C5 - - . .',
      intensity: 0.5,
    },
    {
      wave: 'drums',
      vol: 0.1,
      notes: 'k . . . s . . . | k . . . s . . . | k . . . s . . . | k . k . s . . .',
      intensity: 0.8,
    },
  ],
} as never);

/** Dawn: the theme resolved, alone. */
defineSong('song:dawn', {
  bpm: 60,
  steps: 2,
  loop: false,
  tracks: [
    {
      wave: 'sine',
      vol: 0.22,
      notes: 'E5 . G5 B5 - - A5 . | G5 . E5 D5 - - C5 . | A4 . C5 E5 - - G5 . | D5 . E5 C5 - - - -',
    },
    {
      wave: 'sine',
      vol: 0.1,
      attack: 0.5,
      notes: 'C4 - - - - - - - | A3 - - - - - - - | F3 - - - - - - - | C4 - - - - - - -',
    },
  ],
} as never);

/** Results: a short jingle, played once. */
defineSong('song:stamp', {
  bpm: 132,
  steps: 2,
  loop: false,
  tracks: [
    { wave: 'pluck', vol: 0.22, notes: 'C5 E5 G5 C6 . B5 C6 -' },
    { wave: 'triangle', vol: 0.18, notes: 'C3 - G3 - C4 - - -' },
  ],
} as never);
