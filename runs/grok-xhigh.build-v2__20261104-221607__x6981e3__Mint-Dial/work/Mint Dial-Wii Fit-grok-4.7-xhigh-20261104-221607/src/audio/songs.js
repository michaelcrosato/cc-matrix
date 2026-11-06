/** Original songs. Track volumes stay high so a 10% music bus is still audible. */

function row(n, fn) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(fn(i));
  return out.join(' ');
}

const LOUD = { wave: 'triangle', decay: 0.28, volume: 0.62 };
const BASS = { wave: 'square', duty: 0.2, decay: 0.22, volume: 0.5 };
const DRUM = { wave: 'noise', decay: 0.08, volume: 0.46 };

function song(bpm, a, b, order = ['a']) {
  return {
    bpm,
    stepsPerBeat: 4,
    tracks: { lead: { ...LOUD }, bass: { ...BASS } },
    patterns: { a: { lead: a, bass: b } },
    order,
    loop: true,
  };
}

const waitA = 'A4 . C5 . E5 . . . D5 . C5 . B4 . . .';
const waitB = 'A2 . . . . . . . F2 . . . . . . .';

export const SONGS = {
  plaza: song(92, waitA, waitB),
  still: song(60, 'E4 . . . G4 . . . D4 . . . E4 . . .', 'A2 . . . . . . . E2 . . . . . . .'),
  reps: song(110, 'C4 E4 G4 . A4 . G4 E4 C4 . D4 F4 . E4 . .', 'C2 . . . F2 . . . C2 . . . G2 . . .'),
  hoop: song(118, 'G4 . B4 . D5 . . . A4 . C5 . E5 . . .', 'G2 . . . D2 . . . A2 . . . E2 . . .'),
  step: song(104, 'C5 . . E5 . G4 . . D5 . . C5 . E4 . .', 'C2 . . . G2 . . . A2 . . . F2 . . .'),
  lagoon: song(120, 'E5 . G4 . A4 . . C5 . . B4 . G4 . . .', 'A2 . . . E2 . . . F2 . . . C2 . . .'),
  jog: song(112, 'D4 F4 A4 . D5 . A4 F4 D4 . E4 G4 . F4 . .', 'D2 . . . A2 . . . G2 . . . D2 . . .'),
  report: song(70, 'C5 . . . E5 . . . G4 . . . C5 . . .', 'C3 . . . . . . . G2 . . . . . . .'),
};

const N = 368;
SONGS.long = {
  bpm: 70,
  stepsPerBeat: 4,
  loop: false,
  tracks: { lead: { wave: 'triangle', decay: 0.4, volume: 0.58 }, bass: { wave: 'sine', decay: 0.5, volume: 0.48 } },
  patterns: {
    a: {
      lead: row(N, (i) => (i >= 350 && i % 2 === 0 ? 'E4' : i === 20 || i === 80 ? 'G4' : '.')),
      bass: row(N, (i) => (i >= 350 && i % 4 === 0 ? 'A2' : '.')),
    },
  },
  order: ['a'],
};

export const SONG_FOR = {
  title: 'plaza',
  menu: 'plaza',
  still: 'still',
  reps: 'reps',
  hoop: 'hoop',
  step: 'step',
  header: 'lagoon',
  slack: 'lagoon',
  tray: 'lagoon',
  pier: 'lagoon',
  jog: 'jog',
  long: 'long',
  report: 'report',
  island: 'plaza',
};

export function songLevel(song) {
  const sum = Object.values(song.tracks).reduce((n, t) => n + (t.volume || 0), 0);
  return sum * 0.1 * 0.8;
}

export { DRUM };
