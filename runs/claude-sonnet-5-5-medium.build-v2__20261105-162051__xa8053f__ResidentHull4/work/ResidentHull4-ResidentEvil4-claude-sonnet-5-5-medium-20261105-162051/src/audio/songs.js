// Original compositions as Song data. Loud tracks, because music defaults to 10%.
const rep = (s, n) => Array(n).fill(s).join(' ');
export const SONGS = {
  title: {
    bpm: 66,
    tracks: {
      drone: { wave: 'saw', attack: 0.4, decay: 0.8, volume: 0.35 },
      bell: { wave: 'sine', attack: 0.01, decay: 1.6, volume: 0.7 },
      mel: { wave: 'triangle', attack: 0.05, decay: 0.7, volume: 0.65 },
    },
    patterns: {
      a: { drone: 'D2 - - - - - - - - - - - - - - -', bell: 'D4 . . . . . . . A3 . . . . . . .', mel: '. . . . F4 - - . E4 - - - D4 - - -' },
      b: { drone: 'Bb1 - - - - - - - - - - - - - - -', bell: 'Bb3 . . . . . . . F3 . . . . . . .', mel: 'D5 - - - C5 - - . A4 - - - . . . .' },
      c: { drone: 'G1 - - - - - - - - - - - - - - -', bell: 'G3 . . . . . . . D4 . . . . . . .', mel: '. . A4 - - - F4 - - - E4 - - - - -' },
    },
    order: ['a', 'b', 'a', 'c'],
  },
  explore: {
    bpm: 72,
    tracks: {
      bass: { wave: 'triangle', attack: 0.01, decay: 0.5, volume: 0.9 },
      pad: { wave: 'sine', attack: 0.3, decay: 1.2, volume: 0.45 },
      phrase: { wave: 'square', duty: 0.125, attack: 0.02, decay: 0.4, volume: 0.35 },
    },
    patterns: {
      a: { bass: 'A2 . . . . . A2 . . . E2 . . . . .', pad: 'A3 - - - - - - - - - - - - - - -', phrase: '. . . . . . . . . . . . . . . .' },
      b: { bass: 'F2 . . . . . F2 . . . C2 . . . . .', pad: 'F3 - - - - - - - - - - - - - - -', phrase: '. . . . E5 . . . C5 . . . . . . .' },
      c: { bass: 'A2 . . . . . A2 . . . E2 . . . G2 .', pad: 'A3 - - - - - - - E3 - - - - - - -', phrase: '. . . . . . . . . . A4 . . . . .' },
      d: { bass: 'E2 . . . . . E2 . . . B1 . . . . .', pad: 'E3 - - - - - - - - - - - - - - -', phrase: 'B4 . . C5 . . B4 . . . . . . . . .' },
    },
    order: ['a', 'b', 'c', 'd'],
  },
  combat: {
    bpm: 132,
    tracks: {
      ost: { wave: 'square', duty: 0.25, attack: 0.005, decay: 0.12, volume: 0.45 },
      bass: { wave: 'saw', attack: 0.005, decay: 0.2, volume: 0.5 },
      hat: { wave: 'noise', attack: 0.001, decay: 0.04, volume: 0.35 },
      kick: { wave: 'sine', attack: 0.001, decay: 0.15, volume: 0.9 },
    },
    patterns: {
      a: { ost: 'E4 E4 G4 E4 B4 E4 G4 E4 E4 E4 G4 E4 A4 E4 G4 E4', bass: 'E2 . E2 . E2 . E2 . E2 . E2 . G2 . A2 .', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' },
      b: { ost: 'C4 C4 E4 C4 G4 C4 E4 C4 D4 D4 F4 D4 A4 D4 F4 D4', bass: 'C2 . C2 . C2 . C2 . D2 . D2 . D2 . D2 .', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8', kick: 'C2 . . . C2 . . . C2 . . C2 C2 . . .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  siege: {
    bpm: 120,
    tracks: {
      drum: { wave: 'sine', attack: 0.001, decay: 0.25, volume: 1 },
      snare: { wave: 'noise', attack: 0.001, decay: 0.1, volume: 0.45 },
      bass: { wave: 'saw', attack: 0.01, decay: 0.3, volume: 0.55 },
      chant: { wave: 'sine', attack: 0.15, decay: 0.8, volume: 0.55 },
      chant2: { wave: 'sine', attack: 0.2, decay: 0.8, volume: 0.45 },
    },
    patterns: {
      a: { drum: 'C2 . . . . . C2 . C2 . . . . . C2 .', snare: '. . . . C6 . . . . . . . C6 . . C6', bass: 'D2 . . D2 . . D2 . F2 . . F2 . . G2 .', chant: 'D4 - - - - - - - F4 - - - - - - -', chant2: 'A3 - - - - - - - C4 - - - - - - -' },
      b: { drum: 'C2 . C2 . . . C2 . C2 . . . C2 . C2 C2', snare: '. . . . C6 . . . . . . . C6 . C6 C6', bass: 'Bb1 . . Bb1 . . Bb1 . A1 . . A1 . . A1 .', chant: 'D4 - - - E4 - - - F4 - - - E4 - - -', chant2: 'F3 - - - G3 - - - A3 - - - G3 - - -' },
    },
    order: ['a', 'a', 'b', 'a', 'b'],
  },
  shop: {
    bpm: 104,
    tracks: {
      acc: { wave: 'square', duty: 0.5, attack: 0.02, decay: 0.25, volume: 0.4 },
      acc2: { wave: 'square', duty: 0.25, attack: 0.02, decay: 0.25, volume: 0.3 },
      bass: { wave: 'triangle', attack: 0.005, decay: 0.2, volume: 0.9 },
    },
    patterns: {
      a: { acc: 'G4 . B4 . D5 . B4 . G4 . B4 . D5 . . .', acc2: 'D4 . G4 . B4 . G4 . D4 . G4 . B4 . . .', bass: 'G2 . . . D3 . . . G2 . . . D3 . . .' },
      b: { acc: 'C5 . B4 . A4 . B4 . C5 . D5 . G4 . . .', acc2: 'E4 . D4 . C4 . D4 . E4 . F4 . D4 . . .', bass: 'C3 . . . G2 . . . C3 . . . D3 . . .' },
    },
    order: ['a', 'a', 'b', 'a'],
  },
  safe: {
    bpm: 60,
    tracks: {
      chord: { wave: 'triangle', attack: 0.2, decay: 1.5, volume: 0.6 },
      chord2: { wave: 'triangle', attack: 0.2, decay: 1.5, volume: 0.5 },
      tick: { wave: 'square', duty: 0.125, attack: 0.001, decay: 0.03, volume: 0.25 },
    },
    patterns: {
      a: { chord: 'C4 - - - - - - - - - - - - - - -', chord2: 'E4 - - - - - - - - - - - - - - -', tick: '. . . . . . . . . . . . C7 . C7 .' },
      b: { chord: 'F3 - - - - - - - - - - - - - - -', chord2: 'A3 - - - - - - - - - - - - - - -', tick: '. . . . . . . . . . . . . . . .' },
      c: { chord: 'G3 - - - - - - - - - - - - - - -', chord2: 'B3 - - - - - - - - - - - - - - -', tick: '. . C7 . C7 . . . . . . . . . . .' },
    },
    order: ['a', 'b', 'c', 'a'],
  },
  boss: {
    bpm: 150,
    tracks: {
      brass: { wave: 'saw', attack: 0.02, decay: 0.25, volume: 0.55 },
      drive: { wave: 'square', duty: 0.125, attack: 0.002, decay: 0.08, volume: 0.35 },
      toll: { wave: 'sine', attack: 0.001, decay: 1.5, volume: 0.9 },
      kick: { wave: 'sine', attack: 0.001, decay: 0.15, volume: 0.9 },
      hat: { wave: 'noise', attack: 0.001, decay: 0.04, volume: 0.35 },
    },
    patterns: {
      a: { brass: 'C3 - . C3 - . C3 . Eb3 - . Eb3 - . G3 .', drive: 'C4 C4 G4 C4 C4 G4 C4 G4 Eb4 Eb4 Bb4 Eb4 Eb4 Bb4 G4 Eb4', toll: 'C2 . . . . . . . . . . . . . . .', kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 .', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 .' },
      b: { brass: 'Ab2 - . Ab2 - . Ab2 . Bb2 - . Bb2 - . G2 .', drive: 'Ab3 Ab3 Eb4 Ab3 Ab3 Eb4 Ab3 Eb4 G3 G3 D4 G3 G3 D4 G3 D4', toll: 'Ab1 . . . . . . . . . . . . . . .', kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 C2', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8' },
    },
    order: ['a', 'a', 'b', 'a', 'b', 'b'],
  },
  onhold: {
    bpm: 96,
    tracks: {
      lead: { wave: 'square', duty: 0.25, attack: 0.01, decay: 0.25, volume: 0.4 },
      comp: { wave: 'triangle', attack: 0.01, decay: 0.2, volume: 0.6 },
      bass: { wave: 'triangle', attack: 0.005, decay: 0.2, volume: 0.9 },
    },
    patterns: {
      a: { lead: 'E5 . G5 . E5 . C5 . D5 . F5 . D5 . B4 .', comp: 'C4 . E4 . C4 . E4 . B3 . D4 . B3 . D4 .', bass: 'C3 . . G2 . . C3 . G2 . . D3 . . G2 .' },
      b: { lead: 'A4 . C5 . E5 . C5 . G4 . B4 . D5 . . .', comp: 'A3 . C4 . A3 . C4 . G3 . B3 . G3 . B3 .', bass: 'A2 . . E2 . . A2 . G2 . . D3 . . G2 .' },
    },
    order: ['a', 'b', 'a', 'b'],
  },
  tide1: {
    bpm: 100,
    tracks: { bass: { wave: 'saw', attack: 0.01, decay: 0.3, volume: 0.6 }, arp: { wave: 'square', duty: 0.125, attack: 0.001, decay: 0.1, volume: 0.35 }, hat: { wave: 'noise', attack: 0.001, decay: 0.04, volume: 0.3 } },
    patterns: { a: { bass: 'A1 . . . A1 . . . A1 . . . A1 . . .', arp: 'A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4', hat: '. . C8 . . . C8 . . . C8 . . . C8 .' } },
    order: ['a', 'a'],
  },
  tide2: {
    bpm: 112,
    tracks: { bass: { wave: 'saw', attack: 0.01, decay: 0.3, volume: 0.6 }, arp: { wave: 'square', duty: 0.125, attack: 0.001, decay: 0.1, volume: 0.35 }, hat: { wave: 'noise', attack: 0.001, decay: 0.04, volume: 0.3 } },
    patterns: { a: { bass: 'B1 . . . B1 . . . B1 . . . B1 . . .', arp: 'B3 D4 F#4 D4 B3 D4 F#4 D4 B3 D4 F#4 D4 B3 D4 F#4 D4', hat: '. C8 C8 . . C8 C8 . . C8 C8 . . C8 C8 .' } },
    order: ['a', 'a'],
  },
  tide3: {
    bpm: 126,
    tracks: { bass: { wave: 'saw', attack: 0.01, decay: 0.3, volume: 0.6 }, arp: { wave: 'square', duty: 0.125, attack: 0.001, decay: 0.1, volume: 0.35 }, hat: { wave: 'noise', attack: 0.001, decay: 0.04, volume: 0.3 } },
    patterns: { a: { bass: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .', arp: 'C4 Eb4 G4 Eb4 C4 Eb4 G4 Eb4 C4 Eb4 G4 Eb4 C4 Eb4 G4 Eb4', hat: 'C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8 C8' } },
    order: ['a', 'a'],
  },
  dawn: {
    bpm: 84, loop: false,
    tracks: { lead: { wave: 'triangle', attack: 0.02, decay: 0.8, volume: 0.7 }, pad: { wave: 'sine', attack: 0.3, decay: 1.5, volume: 0.5 } },
    patterns: { a: { lead: 'C4 . E4 . G4 . C5 - - - E5 - - - - -', pad: 'C3 - - - - - - - G3 - - - - - - -' }, b: { lead: 'G4 - - - E5 - - - C5 - - - - - - -', pad: 'F3 - - - - - - - C3 - - - - - - -' } },
    order: ['a', 'b'],
  },
};
// Quiet tension for the crypt (a low drone, no tune).
SONGS.drone = { bpm: 48, tracks: { low: { wave: 'saw', attack: 0.6, decay: 2, volume: 0.35 }, high: { wave: 'sine', attack: 1, decay: 2, volume: 0.15 } }, patterns: { a: { low: 'C2 - - - - - - - - - - - - - - -', high: '. . . . . . . . Db5 - - - - - - -' } }, order: ['a'] };
export const MOOD_SONG = { dusk: 'explore', rain: 'explore', abbey: 'explore', quiet: null };
