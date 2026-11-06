// Ten original compositions as engine Song data. Track volumes are authored to be heard at the default
// 10% music level.
const bars = (s, n) => Array(n).fill(s).join(' ');
const rest = (n) => Array(n).fill('.').join(' ');

const title = {
  bpm: 66, stepsPerBeat: 4,
  tracks: {
    drone: { wave: 'saw', attack: 0.4, decay: 1.2, volume: 0.42 },
    bell: { wave: 'sine', attack: 0.002, decay: 1.6, volume: 0.7 },
    melody: { wave: 'triangle', attack: 0.02, decay: 0.7, volume: 0.62, vibrato: { depth: 0.2, rate: 5 } },
    low: { wave: 'sine', attack: 0.1, decay: 1.4, volume: 0.6 },
  },
  patterns: {
    a: {
      drone: `D2 ${rest(15)}`,
      bell: `D3 ${rest(7)} A2 ${rest(7)}`,
      melody: `. . . . . . . . . . . . A4 . . .`,
      low: `D2 ${rest(15)}`,
    },
    b: {
      drone: `D2 ${rest(15)}`,
      bell: `D3 ${rest(15)}`,
      melody: `F4 . . . E4 . . . D4 . . . . . . .`,
      low: `D2 ${rest(15)}`,
    },
    c: {
      drone: `Bb1 ${rest(15)}`,
      bell: `F3 ${rest(7)} Bb2 ${rest(7)}`,
      melody: `. . . . D4 . . . C4 . . . A3 . . .`,
      low: `Bb1 ${rest(15)}`,
    },
    d: {
      drone: `A1 ${rest(15)}`,
      bell: `E3 ${rest(7)} A2 ${rest(7)}`,
      melody: `C#4 . . . . . . . . . D4 . . . . .`,
      low: `A1 ${rest(15)}`,
    },
  },
  order: ['a', 'b', 'c', 'd'],
};

const explore = {
  bpm: 72, stepsPerBeat: 4,
  tracks: {
    bass: { wave: 'triangle', decay: 0.34, volume: 0.8 },
    phrase: { wave: 'square', duty: 0.125, attack: 0.01, decay: 0.42, volume: 0.32 },
    wash: { wave: 'sine', attack: 0.5, decay: 1.2, volume: 0.32 },
  },
  patterns: {
    a: { bass: `A1 . . . . . . . A1 . . . . . E2 .`, phrase: rest(16), wash: `A3 ${rest(15)}` },
    b: { bass: `F1 . . . . . . . F1 . . . . . C2 .`, phrase: `. . . . . . . . E4 . . F4 E4 . . .`, wash: `F3 ${rest(15)}` },
    c: { bass: `A1 . . . . . . . A1 . . . . . E2 .`, phrase: rest(16), wash: `A3 ${rest(15)}` },
    d: { bass: `G1 . . . . . . . E1 . . . . . . .`, phrase: `D4 . . C4 . . B3 . . . G#3 . . . . .`, wash: `E3 ${rest(15)}` },
  },
  order: ['a', 'b', 'c', 'd', 'a', 'c', 'b', 'd'],
};

const combat = {
  bpm: 132, stepsPerBeat: 4,
  tracks: {
    osti: { wave: 'square', duty: 0.25, decay: 0.11, volume: 0.38 },
    bass: { wave: 'saw', decay: 0.13, volume: 0.48 },
    hat: { wave: 'noise', decay: 0.03, volume: 0.32 },
    kick: { wave: 'sine', decay: 0.1, volume: 0.9 },
    stab: { wave: 'square', duty: 0.5, attack: 0.01, decay: 0.3, volume: 0.28 },
  },
  patterns: {
    a: { osti: 'E4 . G4 E4 . B3 E4 . G4 E4 . B3 F#4 . G4 .', bass: 'E2 E2 . E2 E2 . E2 . E2 E2 . E2 D2 . D2 .', hat: 'C8 . C8 . C8 . C8 C8 C8 . C8 . C8 . C8 C8', kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 .', stab: rest(16) },
    b: { osti: 'E4 . G4 E4 . B3 E4 . A4 G4 . E4 D4 . E4 .', bass: 'C2 C2 . C2 C2 . C2 . D2 D2 . D2 D2 . B1 .', hat: 'C8 . C8 . C8 . C8 C8 C8 . C8 . C8 . C8 C8', kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 C2', stab: 'E5 . . . . . . . D5 . . . . . B4 .' },
  },
  order: ['a', 'a', 'b', 'a'],
};

const siege = {
  bpm: 120, stepsPerBeat: 4,
  tracks: {
    kick: { wave: 'sine', decay: 0.16, volume: 0.95 },
    tom: { wave: 'triangle', decay: 0.12, volume: 0.7 },
    snare: { wave: 'noise', decay: 0.09, volume: 0.42 },
    bass: { wave: 'saw', decay: 0.2, volume: 0.48 },
    chantA: { wave: 'saw', attack: 0.02, decay: 0.22, volume: 0.32, crush: 12 },
    chantB: { wave: 'saw', attack: 0.02, decay: 0.22, volume: 0.28, crush: 12 },
  },
  patterns: {
    a: { kick: 'C2 . . . C2 . . C2 . . C2 . C2 . . .', tom: '. . G2 . . . G2 . . . . . . . G2 E2', snare: '. . . . C6 . . . . . . . C6 . . .', bass: 'E2 . . E2 . . E2 . G2 . . G2 . . D2 .', chantA: 'E4 . E4 . G4 . . . E4 . D4 . E4 . . .', chantB: 'B3 . B3 . D4 . . . B3 . A3 . B3 . . .' },
    b: { kick: 'C2 . . . C2 . . C2 . . C2 . C2 . C2 .', tom: '. . G2 . . . G2 . . . . . G2 . E2 E2', snare: '. . . . C6 . . . . . . . C6 . C6 .', bass: 'C2 . . C2 . . C2 . D2 . . D2 . . E2 .', chantA: 'G4 . G4 . A4 . . . G4 . E4 . D4 . . .', chantB: 'E4 . E4 . F#4 . . . D4 . B3 . A3 . . .' },
  },
  order: ['a', 'a', 'b', 'a'],
};

const shop = {
  bpm: 104, stepsPerBeat: 4,
  tracks: {
    acc: { wave: 'square', duty: 0.25, decay: 0.2, volume: 0.32, vibrato: { depth: 0.18, rate: 6 } },
    acc2: { wave: 'square', duty: 0.125, decay: 0.2, volume: 0.22, vibrato: { depth: 0.22, rate: 6.5 } },
    bass: { wave: 'triangle', decay: 0.22, volume: 0.7 },
    chord: { wave: 'square', duty: 0.5, decay: 0.08, volume: 0.13 },
  },
  patterns: {
    a: { acc: 'G4 . B4 . D5 . B4 . C5 . A4 . B4 . G4 .', acc2: 'D4 . G4 . B4 . G4 . A4 . F#4 . G4 . D4 .', bass: 'G2 . . . D3 . . . G2 . . . D3 . . .', chord: '. . G3 . . . G3 . . . G3 . . . G3 .' },
    b: { acc: 'A4 . C5 . E5 . C5 . B4 . G4 . D5 . . .', acc2: 'E4 . A4 . C5 . A4 . G4 . D4 . B4 . . .', bass: 'C3 . . . G2 . . . G2 . . . D3 . . .', chord: '. . E3 . . . E3 . . . D3 . . . D3 .' },
  },
  order: ['a', 'b', 'a', 'b'],
};

const safe = {
  bpm: 60, stepsPerBeat: 4,
  tracks: {
    chord1: { wave: 'triangle', attack: 0.2, decay: 1.2, volume: 0.42 },
    chord2: { wave: 'triangle', attack: 0.2, decay: 1.2, volume: 0.36 },
    chord3: { wave: 'triangle', attack: 0.2, decay: 1.2, volume: 0.32 },
    key: { wave: 'square', duty: 0.25, decay: 0.03, volume: 0.1 },
  },
  patterns: {
    a: { chord1: `C4 ${rest(15)}`, chord2: `E4 ${rest(15)}`, chord3: `G4 ${rest(15)}`, key: 'C7 . C7 . . . C7 . . . . C7 . C7 . .' },
    b: { chord1: `A3 ${rest(15)}`, chord2: `C4 ${rest(15)}`, chord3: `E4 ${rest(15)}`, key: '. . C7 . C7 . . . C7 . C7 . . . . .' },
    c: { chord1: `F3 ${rest(15)}`, chord2: `A3 ${rest(15)}`, chord3: `C4 ${rest(15)}`, key: 'C7 . . . . C7 . C7 . . . . C7 . . .' },
    d: { chord1: `G3 ${rest(15)}`, chord2: `B3 ${rest(15)}`, chord3: `D4 ${rest(15)}`, key: '. . C7 . . . C7 . . C7 . . . . C7 .' },
  },
  order: ['a', 'b', 'c', 'd'],
};

const boss = {
  bpm: 150, stepsPerBeat: 4,
  tracks: {
    brass: { wave: 'saw', attack: 0.01, decay: 0.18, volume: 0.42 },
    brass2: { wave: 'saw', attack: 0.01, decay: 0.18, volume: 0.32 },
    bass: { wave: 'square', duty: 0.25, decay: 0.09, volume: 0.42 },
    toll: { wave: 'sine', decay: 1.0, volume: 0.55 },
    kick: { wave: 'sine', decay: 0.1, volume: 0.95 },
    snare: { wave: 'noise', decay: 0.07, volume: 0.42 },
  },
  patterns: {
    a: { brass: 'C4 . C4 C4 Eb4 . . C4 G4 . F4 . Eb4 . D4 .', brass2: 'G3 . G3 G3 C4 . . G3 Eb4 . D4 . C4 . B3 .', bass: 'C2 C2 C2 . C2 C2 C2 . C2 C2 C2 . G1 G1 G1 .', toll: `C3 ${rest(15)}`, kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 .', snare: '. . . . C6 . . . . . . . C6 . . C6' },
    b: { brass: 'Ab3 . Ab3 Ab3 C4 . . Ab3 Eb4 . D4 . C4 . Bb3 .', brass2: 'Eb3 . Eb3 Eb3 Ab3 . . Eb3 C4 . Bb3 . Ab3 . G3 .', bass: 'Ab1 Ab1 Ab1 . Ab1 Ab1 Ab1 . Bb1 Bb1 Bb1 . G1 G1 G1 .', toll: `C3 ${rest(15)}`, kick: 'C2 . . . C2 . . . C2 . . . C2 . C2 C2', snare: '. . . . C6 . . . . . . . C6 . C6 C6' },
  },
  order: ['a', 'a', 'b', 'a'],
};

const onhold = {
  bpm: 96, stepsPerBeat: 4,
  tracks: {
    lead: { wave: 'sine', attack: 0.01, decay: 0.26, volume: 0.65, vibrato: { depth: 0.12, rate: 5.5 } },
    keys: { wave: 'triangle', decay: 0.16, volume: 0.32 },
    bass: { wave: 'sine', decay: 0.26, volume: 0.65 },
    shak: { wave: 'noise', decay: 0.02, volume: 0.12 },
  },
  patterns: {
    a: { lead: 'E5 . G5 . C6 . G5 . A5 . F5 . D5 . . .', keys: '. C4 . E4 . C4 . E4 . A3 . C4 . A3 . C4', bass: 'C3 . . . G2 . . . F2 . . . G2 . . .', shak: 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8' },
    b: { lead: 'E5 . F5 . G5 . E5 . D5 . C5 . D5 . . .', keys: '. C4 . E4 . A3 . C4 . D4 . F4 . B3 . D4', bass: 'A2 . . . E2 . . . D3 . . . G2 . . .', shak: 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8' },
  },
  order: ['a', 'b', 'a', 'b'],
};

const tide = {
  bpm: 116, stepsPerBeat: 4,
  tracks: {
    pulse: { wave: 'square', duty: 0.125, decay: 0.09, volume: 0.32 },
    bass: { wave: 'saw', decay: 0.18, volume: 0.42 },
    rise: { wave: 'triangle', attack: 0.3, decay: 0.9, volume: 0.42 },
    kick: { wave: 'sine', decay: 0.1, volume: 0.8 },
  },
  patterns: {
    a: { pulse: bars('A3 . E4 .', 4), bass: 'A1 . . A1 . . A1 . A1 . . A1 . . G1 .', rise: `A4 ${rest(15)}`, kick: 'C2 . . . . . C2 . C2 . . . . . C2 .' },
    b: { pulse: bars('Bb3 . F4 .', 4), bass: 'Bb1 . . Bb1 . . Bb1 . Bb1 . . Bb1 . . A1 .', rise: `Bb4 ${rest(15)}`, kick: 'C2 . . . C2 . C2 . C2 . . . C2 . C2 .' },
    c: { pulse: bars('B3 . F#4 .', 4), bass: 'B1 . . B1 . . B1 . B1 . . B1 . . Bb1 .', rise: `B4 ${rest(15)}`, kick: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .' },
    d: { pulse: bars('C4 . G4 .', 4), bass: 'C2 . C2 C2 . C2 C2 . C2 . C2 C2 . C2 B1 .', rise: `C5 ${rest(15)}`, kick: 'C2 . C2 . C2 C2 C2 . C2 . C2 . C2 C2 C2 C2' },
  },
  order: ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd'],
};

const dawn = {
  bpm: 76, stepsPerBeat: 4, loop: false,
  tracks: {
    lead: { wave: 'triangle', attack: 0.04, decay: 1.1, volume: 0.65 },
    hi: { wave: 'sine', attack: 0.04, decay: 1, volume: 0.42 },
    bass: { wave: 'triangle', attack: 0.1, decay: 1.4, volume: 0.65 },
  },
  patterns: {
    a: { lead: 'G4 . . . A4 . . . B4 . . . D5 . . .', hi: 'D5 . . . E5 . . . G5 . . . B5 . . .', bass: `G2 ${rest(7)} D3 ${rest(7)}` },
    b: { lead: 'C5 . . . B4 . . . A4 . . . G4 . . .', hi: 'E5 . . . D5 . . . E5 . . . D5 . . .', bass: `C3 ${rest(7)} D3 ${rest(7)}` },
    c: { lead: `G4 ${rest(15)}`, hi: `B4 ${rest(15)}`, bass: `G2 ${rest(15)}` },
  },
  order: ['a', 'b', 'c'],
};

export const SONGS = { title, explore, combat, siege, shop, safe, boss, onhold, tide, dawn };
