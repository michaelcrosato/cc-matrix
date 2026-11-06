// Every song is original, written here as engine Song data. No source music, no real requiem.
const LEAD = { wave: 'triangle', decay: 0.34, volume: 0.15 };
const SOFT = { wave: 'sine', decay: 0.5, volume: 0.13 };
const BASS = { wave: 'square', duty: 0.125, decay: 0.24, volume: 0.075 };
const PULSE = { wave: 'square', duty: 0.25, decay: 0.09, volume: 0.05 };
const HAT = { wave: 'noise', decay: 0.03, volume: 0.03 };
const KICK = { wave: 'sine', decay: 0.1, volume: 0.22 };
const SNARE = { wave: 'noise', decay: 0.08, volume: 0.06 };
const CHOIR = { wave: 'saw', attack: 0.08, decay: 0.7, volume: 0.05, vibrato: { depth: 0.25, rate: 5 } };
const CHOIR2 = { wave: 'saw', attack: 0.1, decay: 0.8, volume: 0.04, vibrato: { depth: 0.3, rate: 4.4 } };
const JAZZ = { wave: 'triangle', decay: 0.22, volume: 0.1 };
const WALK = { wave: 'triangle', decay: 0.18, volume: 0.11 };
const REST16 = '. . . . . . . . . . . . . . . .';

export const SONGS = {
  title: {
    bpm: 66,
    tracks: { lead: LEAD, pulse: { ...PULSE, volume: 0.03 }, bass: BASS },
    patterns: {
      a: { lead: 'A4 - - - C5 - E5 - D5 - - - B4 - - -', pulse: 'A3 . E4 . A3 . E4 . G3 . D4 . G3 . D4 .', bass: 'A2 - - - - - - - G2 - - - - - - -' },
      b: { lead: 'C5 - - - D5 - E5 - G5 - - - F5 - E5 -', pulse: 'F3 . C4 . F3 . C4 . C3 . G3 . C3 . G3 .', bass: 'F2 - - - - - - - C2 - - - - - - -' },
      c: { lead: 'E5 - - - D5 - C5 - B4 - - - A4 - G4 -', pulse: 'F3 . C4 . F3 . C4 . E3 . B3 . E3 . B3 .', bass: 'F2 - - - - - - - E2 - - - - - - -' },
      d: { lead: 'A4 - - - - - - - . . E4 - A4 - - -', pulse: 'A3 . E4 . A3 . E4 . A3 . E4 . A3 . E4 .', bass: 'A2 - - - - - - - A2 - - - - - - -' },
    },
    order: ['a', 'b', 'c', 'd'],
  },
  ward: {
    bpm: 84, stepsPerBeat: 2,
    tracks: { lead: JAZZ, walk: WALK, comp: { wave: 'square', duty: 0.25, decay: 0.1, volume: 0.03 } },
    patterns: {
      a: { lead: 'F5 . . A5 G5 . E5 . D5 . . F5 E5 . C5 .', walk: 'D3 F3 A3 C4 G3 B3 D4 F3 C3 E3 G3 B3 A2 C3 E3 G3', comp: '. D4 . . . F4 . . . E4 . . . C4 . .' },
      b: { lead: 'D5 . F5 . A5 . G5 F5 E5 . . . C5 . D5 .', walk: 'D3 A3 F3 A3 G3 D4 B3 G3 C3 G3 E3 G3 A2 E3 C3 E3', comp: '. F4 . . . A4 . . . G4 . . . E4 . .' },
    },
    order: ['a', 'b'],
  },
  'or-calm': {
    bpm: 96,
    tracks: { lead: SOFT, pulse: { ...PULSE, volume: 0.035 }, bass: BASS, hat: { ...HAT, volume: 0.015 } },
    patterns: {
      a: { lead: 'D5 . . . . . F5 . E5 . . . . . C5 .', pulse: 'D4 . F4 . A4 . F4 . C4 . E4 . G4 . E4 .', bass: 'D2 . . . D2 . . . C2 . . . C2 . . .', hat: 'C8 . . . C8 . . . C8 . . . C8 . . .' },
      b: { lead: 'A4 . . . . . Bb4 . A4 . G4 . F4 . . .', pulse: 'Bb3 . D4 . F4 . D4 . A3 . C4 . E4 . C4 .', bass: 'Bb1 . . . Bb1 . . . A1 . . . A1 . . .', hat: 'C8 . . . C8 . . . C8 . . . C8 . . .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'or-tense': {
    bpm: 104,
    tracks: { lead: LEAD, pulse: PULSE, bass: BASS, hat: HAT, kick: KICK },
    patterns: {
      a: { lead: 'D5 - . D5 F5 - . E5 - . C5 - . . . .', pulse: 'D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', bass: 'D2 . D2 . . D2 . . C2 . C2 . . C2 . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' },
      b: { lead: 'A5 - . G5 F5 - E5 . D5 - . E5 F5 - . .', pulse: 'Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4', bass: 'Bb1 . Bb1 . . Bb1 . . A1 . A1 . . A1 . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'or-critical': {
    bpm: 120,
    tracks: { lead: { ...LEAD, volume: 0.17 }, pulse: { ...PULSE, volume: 0.06 }, bass: { ...BASS, volume: 0.09 }, hat: HAT, kick: KICK, snare: SNARE },
    patterns: {
      a: { lead: 'D5 D5 . F5 . D5 . G#5 - . F5 . D5 . . .', pulse: 'D4 A4 D5 A4 D4 A4 D5 A4 D4 Bb4 D5 Bb4 D4 Bb4 D5 Bb4', bass: 'D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 . D2 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', snare: '. . . . C6 . . . . . . . C6 . . .' },
      b: { lead: 'A5 . G#5 . A5 . D6 - . C6 . A5 . G#5 . .', pulse: 'C#4 A4 C#5 A4 C#4 A4 C#5 A4 D4 A4 D5 A4 D4 A4 D5 A4', bass: 'A1 A1 . A1 A1 . A1 . D2 D2 . D2 D2 . D2 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', snare: '. . . . C6 . . . . . . . C6 . C6 .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'boss-introit': {
    bpm: 92,
    tracks: { choir: CHOIR, choir2: CHOIR2, bass: { ...BASS, duty: 0.25, volume: 0.09 }, knock: { wave: 'triangle', decay: 0.08, volume: 0.18 }, hat: { ...HAT, volume: 0.02 } },
    patterns: {
      a: { choir: 'E4 - - - - - - - F4 - - - - - E4 -', choir2: 'B3 - - - - - - - C4 - - - - - B3 -', bass: 'E2 . . E2 . . E2 . F2 . . F2 . . E2 .', knock: 'E3 . . E3 . . E3 . . . . . . . . .', hat: REST16 },
      b: { choir: 'G4 - - - A4 - - - Bb4 - - - A4 - G4 -', choir2: 'D4 - - - E4 - - - F4 - - - E4 - D4 -', bass: 'C2 . . C2 . . C2 . Bb1 . . Bb1 . . A1 .', knock: 'E3 . . E3 . . E3 . . . . . E3 E3 . E3', hat: 'C8 . . . C8 . . . C8 . . . C8 . . .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'boss-lacrimosa': {
    bpm: 76,
    tracks: { choir: CHOIR, choir2: CHOIR2, drip: { wave: 'sine', decay: 0.14, volume: 0.09 }, bass: { ...BASS, volume: 0.07 } },
    patterns: {
      a: { choir: 'C5 - - - B4 - - - Bb4 - - - A4 - - -', choir2: 'G4 - - - F#4 - - - F4 - - - E4 - - -', drip: 'C6 . . G6 . . E6 . C6 . . A5 . . E6 .', bass: 'C2 - - - B1 - - - Bb1 - - - A1 - - -' },
      b: { choir: 'F4 - - - Ab4 - - - G4 - - - - - - -', choir2: 'C4 - - - Eb4 - - - D4 - - - B3 - - -', drip: 'F6 . . C6 . . Ab5 . G6 . . D6 . . B5 .', bass: 'F1 - - - Ab1 - - - G1 - - - G1 - - -' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'boss-diesirae': {
    bpm: 144, // two steps a beat of the heart at 72: the director restarts it with the heart's tempo
    tracks: { choir: { ...CHOIR, volume: 0.06 }, choir2: CHOIR2, bass: { ...BASS, duty: 0.25, volume: 0.1 }, kick: { ...KICK, volume: 0.28 }, hat: HAT },
    patterns: {
      a: { choir: 'D5 - - - C5 - - - Bb4 - - - A4 - - -', choir2: 'F4 - - - F4 - - - F4 - - - E4 - - -', bass: 'D2 D2 . D2 . D2 D2 . Bb1 Bb1 . Bb1 A1 A1 . A1', kick: 'C2 . C2 . . . . . C2 . C2 . . . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 .' },
      b: { choir: 'F5 - - - E5 - - - D5 - C#5 - D5 - - -', choir2: 'A4 - - - G4 - - - F4 - E4 - F4 - - -', bass: 'D2 D2 . D2 . D2 D2 . C#2 C#2 . C#2 D2 D2 . D2', kick: 'C2 . C2 . . . . . C2 . C2 . . . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'boss-libera': {
    bpm: 60,
    tracks: { choir: { ...CHOIR, volume: 0.05 }, high: { wave: 'sine', attack: 0.2, decay: 0.8, volume: 0.05 } },
    patterns: {
      a: { choir: 'C4 - - - - - - - G4 - - - - - - -', high: 'E5 - - - - - - - D5 - - - - - - -' },
      b: { choir: 'Ab4 - - - - - - - G4 - - - - - - -', high: 'C5 - - - - - - - B4 - - - - - - -' },
    },
    order: ['a', 'b'],
  },
  'boss-libera2': {
    bpm: 112,
    tracks: { choir: CHOIR, choir2: CHOIR2, bass: { ...BASS, volume: 0.1 }, kick: KICK, snare: SNARE, hat: HAT, knock: { wave: 'triangle', decay: 0.08, volume: 0.12 } },
    patterns: {
      a: { choir: 'C5 - - - Bb4 - - - Ab4 - - - G4 - - -', choir2: 'Eb4 - - - D4 - - - C4 - - - B3 - - -', bass: 'C2 C2 . C2 . C2 . C2 Ab1 Ab1 . Ab1 G1 G1 . G1', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', snare: '. . . . C6 . . . . . . . C6 . . .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', knock: 'E3 . . E3 . . E3 . . . . . . . . .' },
      b: { choir: 'Eb5 - - - D5 - - - C5 - - - B4 - - -', choir2: 'G4 - - - F4 - - - Eb4 - - - D4 - - -', bass: 'C2 C2 . C2 . C2 . C2 G1 G1 . G1 G1 . G1 G1', kick: 'C2 . . . C2 . . . C2 . . . C2 C2 . .', snare: '. . . . C6 . . . . . . . C6 . C6 .', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8', knock: REST16 },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  'boss-libera3': {
    bpm: 72,
    tracks: { choir: { ...CHOIR, volume: 0.07 }, choir2: { ...CHOIR2, volume: 0.05 }, high: { wave: 'triangle', attack: 0.02, decay: 0.6, volume: 0.08 }, bass: { ...BASS, volume: 0.05 } },
    patterns: {
      a: { choir: 'C5 - - - E5 - - - F5 - - - E5 - - -', choir2: 'G4 - - - G4 - - - A4 - - - G4 - - -', high: 'G5 . . . . . C6 . . . A5 . . . G5 .', bass: 'C2 - - - - - - - F2 - - - C2 - - -' },
      b: { choir: 'D5 - - - F5 - - - E5 - - - D5 - - -', choir2: 'A4 - - - C5 - - - G4 - - - G4 - - -', high: 'F5 . . . A5 . . . G5 . E5 . D5 . . .', bass: 'D2 - - - - - - - G2 - - - G2 - - -' },
    },
    order: ['a', 'b'],
  },
  op10: {
    bpm: 58,
    tracks: { lead: { wave: 'sine', attack: 0.04, decay: 0.8, volume: 0.1 }, low: { wave: 'triangle', decay: 0.9, volume: 0.07 } },
    patterns: {
      a: { lead: 'E5 - - - . . . . G5 - - - . . . .', low: 'A3 - - - - - - - E3 - - - - - - -' },
      b: { lead: 'F5 - - - . . E5 - D5 - - - . . . .', low: 'F3 - - - - - - - G3 - - - - - - -' },
      c: { lead: 'C5 - - - . . . . E5 - - - D5 - - -', low: 'C3 - - - - - - - G3 - - - - - - -' },
    },
    order: ['a', 'b', 'c', 'b'],
  },
  'results-win': {
    bpm: 108, loop: false,
    tracks: { lead: LEAD, pulse: PULSE, bass: BASS },
    patterns: { a: { lead: 'D5 . F5 . A5 . D6 - - - A5 . D6 - - -', pulse: 'D4 F4 A4 F4 D4 F4 A4 F4 G4 Bb4 D5 Bb4 A4 C#5 E5 C#5', bass: 'D2 . . . . . . . G2 . . . A2 . . .' }, b: { lead: 'F6 - - - E6 - D6 - - - - - . . . .', pulse: 'D4 F4 A4 D5 . . . . . . . . . . . .', bass: 'D2 - - - - - - - - - - - . . . .' } },
    order: ['a', 'b'],
  },
  'results-sad': {
    bpm: 72, loop: false,
    tracks: { lead: SOFT, bass: BASS },
    patterns: { a: { lead: 'A4 - - - G4 - - - F4 - - - E4 - - -', bass: 'D2 - - - C2 - - - Bb1 - - - A1 - - -' }, b: { lead: 'D4 - - - - - - - . . . . . . . .', bass: 'D2 - - - - - - - . . . . . . . .' } },
    order: ['a', 'b'],
  },
  credits: {
    bpm: 88,
    tracks: { lead: LEAD, pulse: { ...PULSE, volume: 0.035 }, bass: BASS, hat: { ...HAT, volume: 0.015 } },
    patterns: {
      a: { lead: 'C5 - - E5 G5 - - - A5 - G5 - E5 - - -', pulse: 'C4 E4 G4 E4 C4 E4 G4 E4 F4 A4 C5 A4 C4 E4 G4 E4', bass: 'C2 - - - G2 - - - F2 - - - C2 - - -', hat: 'C8 . . . C8 . . . C8 . . . C8 . . .' },
      b: { lead: 'D5 - - F5 A5 - - - G5 - E5 - C5 - - -', pulse: 'D4 F4 A4 F4 D4 F4 A4 F4 G3 B3 D4 B3 C4 E4 G4 E4', bass: 'D2 - - - A2 - - - G2 - - - C2 - - -', hat: 'C8 . . . C8 . . . C8 . . . C8 . . .' },
    },
    order: ['a', 'b', 'a', 'b'],
  },
};

export const stepsPerBar = (song) => 4 * (song.stepsPerBeat ?? 4);
export const barSeconds = (song) => (60 / song.bpm) * 4;
