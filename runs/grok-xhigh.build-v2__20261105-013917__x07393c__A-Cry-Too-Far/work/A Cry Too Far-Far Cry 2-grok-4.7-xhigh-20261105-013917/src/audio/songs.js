/** Original pieces. Pentatonic lines, thumb-piano, a drone. No borrowed melodies. */

const PLUCK = { wave: 'triangle', decay: 0.18, volume: 0.22 };
const DRONE = { wave: 'sine', attack: 0.05, sustain: 0.2, release: 0.3, volume: 0.12 };
const DRUM = { wave: 'noise', decay: 0.08, volume: 0.2 };

function song(bpm, lead, bass, drum, loop = true) {
  return {
    bpm,
    loop,
    tracks: { lead: PLUCK, bass: DRONE, drum: DRUM },
    patterns: { a: { lead, bass, drum } },
    order: ['a'],
  };
}

export const SONGS = {
  title: song(72,
    'D4 . F4 . A4 . G4 . E4 . D4 . A3 . . .',
    'D2 - - - A2 - - - D2 - - - G2 - - -',
    'C6 . . . C6 . . . C8 . C6 . . . . .'),
  day: song(84,
    'A4 . C5 . D5 . E5 . D5 . C5 . A4 . G4 .',
    'A2 - - - E2 - - - A2 - - - G2 - - -',
    '. . C6 . . . C6 . . . C8 . . . . .'),
  night: song(60,
    'A3 . . . E4 . . . D4 . . . A3 . . .',
    'A2 - - - - - - - E2 - - - - - - -',
    '. . . . . . . . C6 . . . . . . .'),
  stalk: song(100,
    'D4 D4 . A4 . . F4 . E4 . D4 . A3 . . .',
    'D2 - D2 - A2 - A2 - C2 - D2 - A2 - - -',
    'C6 . C6 . C8 C6 . C6 . C6 . C8 . C6 . .'),
  fight: song(126,
    'A4 C5 D5 A4 C5 D5 E5 D5 A4 C5 D5 F5 E5 D5 C5 A4',
    'A2 - A2 - F2 - G2 - A2 - A2 - E2 - G2 -',
    'C6 C6 C8 C6 C6 C8 C6 C6 C6 C8 C6 C6 C8 C6 C6 C6'),
  fever: song(78,
    'Eb4 . G4 . Bb4 . A4 . F4 . Eb4 . Bb3 . . .',
    'Eb2 - - - Bb2 - - - Eb2 - - - Ab2 - - -',
    'C6 . . C6 . . C8 . C6 . . . . . . .'),
  end: song(66,
    'D4 . . F4 . . A4 . . G4 . . E4 . . D4',
    'D3 - - - - - - - A2 - - - - - - -',
    '. . . . . . . . . . . . . . . .',
    false),
};

export const SONG_LIST = Object.values(SONGS);
