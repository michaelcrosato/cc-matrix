/**
 * @file Original songs for the retreat. Tracker notation only. Nothing here is a recording.
 * Cut activities have no songs, so their names do not linger.
 */
import { defineSong } from '../../../engine';

/** Two bars of sixteen steps, in 4/4. */
function bars(a: string, b: string): string {
  return `${a} | ${b}`;
}

/** Title, the island, and the garden. Layers join as the residency goes on. */
export const lobby = defineSong('song:lobby', {
  bpm: 84,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.2,
      notes: bars('C3 - - - E3 - - - G3 - - - B3 - - -', 'A3 - - - F3 - - - G3 - - - E3 - - -'),
    },
    {
      wave: 'square',
      vol: 0.06,
      notes: bars('E5 . G5 . B5 . G5 . D5 . F5 . A5 . F5 .', 'C5 . E5 . G5 . E5 . B4 . D5 . F5 . D5 .'),
    },
    {
      wave: 'triangle',
      vol: 0.08,
      intensity: 0.35,
      notes: bars('G4 . . . B4 . . . E5 . . . D5 . . .', 'C5 . . . E5 . . . D5 . . . B4 . . .'),
    },
  ],
});

/** Pose class and the morning check. A long pad, and a bell on the breath. */
export const stillness = defineSong('song:stillness', {
  bpm: 60,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.16,
      notes: bars('C4 - - - - - - - G3 - - - - - - -', 'E4 - - - - - - - D4 - - - - - - -'),
    },
    { wave: 'square', vol: 0.05, notes: bars('E6 . . . . . . . . . . . . . . .', '. . . . . . . . B5 . . . . . . .') },
  ],
});

/** The line and the paddle. A small bounce. */
export const water = defineSong('song:water', {
  bpm: 96,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.18,
      notes: bars('A2 - - - E2 - - - A2 - - - G2 - - -', 'F2 - - - C3 - - - G2 - - - E2 - - -'),
    },
    {
      wave: 'square',
      vol: 0.07,
      notes: bars('A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 .', 'A4 . C5 . F5 . C5 . G4 . B4 . E5 . B4 .'),
    },
    { wave: 'drums', vol: 0.1, notes: bars('k . h . s . h . k . h . s . h .', 'k . h . s . h . k . h . s . h o') },
  ],
});

/** The garden, raked slowly. */
export const rake = defineSong('song:rake', {
  bpm: 76,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.16,
      notes: bars('D3 - - - A3 - - - F3 - - - C3 - - -', 'G3 - - - E3 - - - D3 - - - A2 - - -'),
    },
    {
      wave: 'square',
      vol: 0.05,
      notes: bars('F5 . A5 . . D5 . F5 . . E5 . C5 . . .', 'D5 . F5 . . A4 . D5 . . C5 . . . . .'),
    },
  ],
});

/** The storm, in a minor colour of the lobby. */
export const tilt = defineSong('song:tilt', {
  bpm: 84,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.2,
      notes: bars('A2 - - - C3 - - - E3 - - - G3 - - -', 'F2 - - - A2 - - - E2 - - - G2 - - -'),
    },
    {
      wave: 'square',
      vol: 0.06,
      notes: bars('A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 .', 'A4 . C5 . F5 . C5 . E4 . G4 . B4 . G4 .'),
    },
    {
      wave: 'drums',
      vol: 0.12,
      intensity: 0.4,
      notes: bars('k . . h s . . h k . . h s . h .', 'k . . h s . . h k k . h s . h o'),
    },
  ],
});

/** The ending. The theme, alone. */
export const dawn = defineSong('song:dawn', {
  bpm: 72,
  tracks: [
    {
      wave: 'triangle',
      vol: 0.18,
      notes: bars('C4 - - - E4 - - - G4 - - - B4 - - -', 'A4 - - - G4 - - - E4 - - - C4 - - -'),
    },
    {
      wave: 'square',
      vol: 0.05,
      notes: bars('E5 . . . G5 . . . . . . . B5 . . .', 'A5 . . . G5 . . . E5 . . . . . . .'),
    },
  ],
});

/** One stamp. It does not loop. */
export const stamp = defineSong('song:stamp', {
  bpm: 120,
  loop: false,
  tracks: [{ wave: 'triangle', vol: 0.22, notes: 'C5 E5 G5 C6 . . . . G5 . E5 . C5 . . .' }],
});
