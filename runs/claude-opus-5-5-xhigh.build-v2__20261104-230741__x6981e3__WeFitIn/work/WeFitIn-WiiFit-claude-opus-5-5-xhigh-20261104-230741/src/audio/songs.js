// Every tune in the game, as Song data. All original. Track volumes are written loud (.45-.8):
// music plays at 10% by default, through a master of .8.
const rep = (s, n) => Array(n).fill(s).join(' ');
const rest = (n = 16) => rep('.', n);

/** Waiting-room bossa, 92 BPM, soft triangle plucks. */
export const TITLE_SONG = {
  bpm: 92,
  tracks: {
    pluck: { wave: 'triangle', decay: 0.34, volume: 0.62 },
    strumA: { wave: 'triangle', decay: 0.16, volume: 0.42 },
    strumB: { wave: 'triangle', decay: 0.16, volume: 0.38 },
    bass: { wave: 'sine', decay: 0.42, volume: 0.72 },
    shaker: { wave: 'noise', freq: 9000, decay: 0.025, volume: 0.14 },
  },
  patterns: (() => {
    const shake = 'C8 . C8 C8 C8 . C8 C8 C8 . C8 C8 C8 . C8 C8';
    const strum = (a, b) => ({ strumA: `. . . ${a} . . ${a} . . . ${a} . . ${a} . .`, strumB: `. . . ${b} . . ${b} . . . ${b} . . ${b} . .` });
    const bassline = (r, f) => `${r} . . ${r} . . . . ${f} . . ${f} . . . .`;
    return {
      a1: { pluck: 'A4 . . C5 . . E5 . - . D5 . C5 . . .', ...strum('A3', 'E4'), bass: bassline('F2', 'C3'), shaker: shake },
      a2: { pluck: 'B4 . . . . A4 . F4 . . . . A4 . . .', ...strum('A3', 'F4'), bass: bassline('D2', 'A2'), shaker: shake },
      a3: { pluck: 'G4 . . Bb4 . . D5 . - . C5 . Bb4 . . .', ...strum('Bb3', 'F4'), bass: bassline('G2', 'D3'), shaker: shake },
      a4: { pluck: 'A4 . . . G4 . . . E4 . . . . . . .', ...strum('Bb3', 'E4'), bass: bassline('C3', 'G2'), shaker: shake },
      b1: { pluck: 'C5 . D5 . . E5 . . F5 . . E5 . C5 . .', ...strum('A3', 'E4'), bass: bassline('F2', 'C3'), shaker: shake },
      b2: { pluck: 'E5 . . D5 . . Bb4 . . . . . A4 . . .', ...strum('G3', 'D4'), bass: bassline('E2', 'B2'), shaker: shake },
      b3: { pluck: 'D5 . C5 . Bb4 . A4 . G4 . . . . . F4 .', ...strum('Bb3', 'F4'), bass: bassline('Bb2', 'F2'), shaker: shake },
      b4: { pluck: 'G4 . . . . . . . . . . . . . . .', ...strum('Bb3', 'E4'), bass: bassline('C3', 'C2'), shaker: shake },
    };
  })(),
  order: ['a1', 'a2', 'a3', 'a4', 'a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'a1', 'a2', 'a3', 'a4'],
};

/** Holding Still: slow, sparse, breath-paced, 60 BPM. */
export const HOLD_SONG = {
  bpm: 60,
  tracks: {
    bell: { wave: 'sine', decay: 1.6, volume: 0.62 },
    pad: { wave: 'triangle', attack: 0.5, decay: 1.8, volume: 0.42 },
    low: { wave: 'sine', attack: 0.3, decay: 2.4, volume: 0.6 },
  },
  patterns: {
    a: { bell: 'E5 . . . . . . . . . . . . . . . . . . . . . . . B4 . . . . . . .', pad: 'A3 . . . . . . . . . . . . . . . E4 . . . . . . . . . . . . . . .', low: 'A2 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
    b: { bell: '. . . . . . . . D5 . . . . . . . . . . . . . . . C5 . . . . . . .', pad: 'F3 . . . . . . . . . . . . . . . C4 . . . . . . . . . . . . . . .', low: 'F2 . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
    c: { bell: 'G4 . . . . . . . . . . . . . . . A4 . . . . . . . . . . . . . . .', pad: 'C4 . . . . . . . . . . . . . . . G3 . . . . . . . . . . . . . . .', low: 'C3 . . . . . . . . . . . . . . . G2 . . . . . . . . . . . . . . .' },
  },
  order: ['a', 'b', 'a', 'c'],
};

/** The Rep Shed: light funk bass, 110 BPM. */
export const REP_SONG = {
  bpm: 110,
  tracks: {
    bass: { wave: 'square', duty: 0.25, decay: 0.16, volume: 0.5 },
    keys: { wave: 'triangle', decay: 0.12, volume: 0.5 },
    kick: { wave: 'sine', freq: 90, decay: 0.09, volume: 0.62 },
    hat: { wave: 'noise', decay: 0.02, volume: 0.14 },
  },
  patterns: {
    a: { bass: 'E2 . . E2 . . G2 . A2 . . A2 . G2 E2 .', keys: '. . E4 . . . . G4 . . E4 . . . . .', kick: 'C2 . . . . . C2 . . . C2 . . . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' },
    b: { bass: 'E2 . . E2 . . B2 . D3 . . B2 . A2 G2 .', keys: '. . G4 . . . . A4 . . G4 . . . E4 .', kick: 'C2 . . . . . C2 . . . C2 . . . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' },
    c: { bass: 'A2 . . A2 . . C3 . D3 . . D3 . C3 A2 .', keys: '. . C5 . . . . D5 . . C5 . . . . .', kick: 'C2 . . . . . C2 . . . C2 . . . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' },
    d: { bass: 'B2 . . B2 . . D3 . E3 . D3 . B2 . G2 .', keys: 'F#4 . . . A4 . . . B4 . . . . . . .', kick: 'C2 . . . . . C2 . C2 . C2 . . . C2 .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 C8 C8 C8' },
  },
  order: ['a', 'b', 'a', 'b', 'c', 'c', 'a', 'd'],
};

/** Hoop Economics: bright, four-on-the-floor, 118 BPM. */
export const HOOP_SONG = {
  bpm: 118,
  tracks: {
    lead: { wave: 'square', duty: 0.25, decay: 0.14, volume: 0.42 },
    arp: { wave: 'triangle', decay: 0.1, volume: 0.46 },
    bass: { wave: 'triangle', decay: 0.18, volume: 0.72 },
    kick: { wave: 'sine', freq: 100, freqEnd: 45, decay: 0.1, volume: 0.72 },
    hat: { wave: 'noise', decay: 0.02, volume: 0.16 },
  },
  patterns: (() => {
    const kick = 'C2 . . . C2 . . . C2 . . . C2 . . .';
    const hat = '. . C8 . . . C8 . . . C8 . . . C8 C8';
    return {
      a: { lead: 'G5 . E5 . C5 . E5 . G5 . . A5 . G5 E5 .', arp: 'C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4', bass: 'C3 . . C3 . . C3 . . C3 . . C3 . G2 .', kick, hat },
      b: { lead: 'A5 . F5 . C5 . F5 . A5 . . C6 . A5 F5 .', arp: 'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4', bass: 'F2 . . F2 . . F2 . . F2 . . F2 . C3 .', kick, hat },
      c: { lead: 'B5 . G5 . D5 . G5 . B5 . . D6 . B5 G5 .', arp: 'G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4', bass: 'G2 . . G2 . . G2 . . G2 . . G2 . D3 .', kick, hat },
      d: { lead: 'C6 . . . G5 . . . E5 . . . C5 . . .', arp: 'A4 C5 E5 C5 A4 C5 E5 C5 G4 B4 D5 B4 G4 B4 D5 B4', bass: 'A2 . . A2 . . A2 . G2 . . G2 . . G2 .', kick, hat },
    };
  })(),
  order: ['a', 'a', 'b', 'a', 'a', 'a', 'c', 'd'],
};

/** Step Class: 104 BPM exactly, 32 bars: intro 4, verse 8, chorus 8, breakdown 4, final 8. */
export const STEP_BPM = 104;
const stepPatterns = (() => {
  const kick = 'C2 . . . C2 . . . C2 . . . C2 . . .';
  const hat = '. . C8 . . . C8 . . . C8 . . . C8 .';
  const none = rest();
  return {
    intro1: { lead: none, arp: 'D4 . F#4 . A4 . F#4 . D4 . F#4 . A4 . F#4 .', bass: none, kick, hat: none },
    intro2: { lead: none, arp: 'G4 . B4 . D5 . B4 . A4 . C#5 . E5 . C#5 .', bass: 'D3 . . . . . . . . . . . . . . .', kick, hat },
    verse1: { lead: 'F#5 . . E5 D5 . . . A4 . . B4 D5 . . .', arp: 'D4 F#4 A4 F#4 D4 F#4 A4 F#4 D4 F#4 A4 F#4 D4 F#4 A4 F#4', bass: 'D3 . . D3 . . A2 . D3 . . D3 . . A2 .', kick, hat },
    verse2: { lead: 'G5 . . F#5 E5 . . . B4 . . C#5 E5 . . .', arp: 'G4 B4 D5 B4 G4 B4 D5 B4 A4 C#5 E5 C#5 A4 C#5 E5 C#5', bass: 'G2 . . G2 . . D3 . A2 . . A2 . . E3 .', kick, hat },
    chorus1: { lead: 'A5 . F#5 . D5 . F#5 . A5 . B5 . A5 . F#5 .', arp: 'D5 A4 F#4 A4 D5 A4 F#4 A4 D5 A4 F#4 A4 D5 A4 F#4 A4', bass: 'D3 D3 . D3 A2 . D3 . D3 D3 . D3 A2 . D3 .', kick, hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' },
    chorus2: { lead: 'B5 . G5 . D5 . G5 . A5 . G5 . E5 . C#5 .', arp: 'G4 D5 B4 D5 G4 D5 B4 D5 A4 E5 C#5 E5 A4 E5 C#5 E5', bass: 'G2 G2 . G2 D3 . G2 . A2 A2 . A2 E3 . A2 .', kick, hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' },
    breakdown: { lead: 'D5 . . . . . . . A4 . . . . . . .', arp: none, bass: 'D2 . . . . . . . D2 . . . . . . .', kick: 'C2 . . . . . . . C2 . . . . . . .', hat: none },
    build: { lead: 'A4 . . . B4 . . . C#5 . . . E5 . . .', arp: none, bass: 'A2 . . . A2 . . . A2 . A2 . A2 A2 A2 A2', kick, hat: 'C8 . C8 . C8 . C8 . C8 C8 C8 C8 C8 C8 C8 C8' },
  };
})();
const STEP_ORDER = [
  'intro1', 'intro1', 'intro2', 'intro2',
  'verse1', 'verse2', 'verse1', 'verse2', 'verse1', 'verse2', 'verse1', 'verse2',
  'chorus1', 'chorus2', 'chorus1', 'chorus2', 'chorus1', 'chorus2', 'chorus1', 'chorus2',
  'breakdown', 'breakdown', 'breakdown', 'build',
  'chorus1', 'chorus2', 'chorus1', 'chorus2', 'chorus1', 'chorus2', 'chorus1', 'chorus2',
];
export const STEP_SONG = {
  bpm: STEP_BPM,
  tracks: {
    lead: { wave: 'square', duty: 0.25, decay: 0.16, volume: 0.42 },
    arp: { wave: 'triangle', decay: 0.1, volume: 0.45 },
    bass: { wave: 'triangle', decay: 0.2, volume: 0.72 },
    kick: { wave: 'sine', freq: 100, freqEnd: 45, decay: 0.1, volume: 0.72 },
    hat: { wave: 'noise', decay: 0.02, volume: 0.16 },
  },
  patterns: stepPatterns,
  order: STEP_ORDER,
  loop: false,
};
/** The Step song from a bar onward: after a pause the count-in restarts at the current bar. */
export function stepSongFrom(bar, lastBar = STEP_ORDER.length) {
  return { ...STEP_SONG, order: STEP_ORDER.slice(Math.max(0, bar), lastBar) };
}

/** Lagoon Games: staccato ukulele feel, 120 BPM. */
export const LAGOON_SONG = {
  bpm: 120,
  tracks: {
    uke1: { wave: 'triangle', decay: 0.09, volume: 0.56 },
    uke2: { wave: 'triangle', decay: 0.09, volume: 0.46 },
    tune: { wave: 'square', duty: 0.5, decay: 0.12, volume: 0.36 },
    bass: { wave: 'sine', decay: 0.2, volume: 0.66 },
    tick: { wave: 'noise', decay: 0.015, volume: 0.14 },
  },
  patterns: (() => {
    const tick = 'C8 . . C8 . . C8 . C8 . . C8 . . C8 .';
    const uke = (a, b) => ({ uke1: `${a} . ${a} ${a} . ${a} . ${a} ${a} . ${a} ${a} . ${a} . ${a}`, uke2: `${b} . ${b} ${b} . ${b} . ${b} ${b} . ${b} ${b} . ${b} . ${b}` });
    return {
      a: { ...uke('G4', 'C5'), tune: 'E5 . . . G5 . . E5 . . D5 . C5 . . .', bass: 'C3 . . . G2 . . . C3 . . . G2 . . .', tick },
      b: { ...uke('A4', 'C5'), tune: 'A5 . . . G5 . . E5 . . G5 . . . . .', bass: 'F2 . . . C3 . . . F2 . . . C3 . . .', tick },
      c: { ...uke('G4', 'B4'), tune: 'D5 . . . E5 . . F5 . . E5 . D5 . . .', bass: 'G2 . . . D3 . . . G2 . . . D3 . . .', tick },
      d: { ...uke('G4', 'C5'), tune: 'C5 . E5 . G5 . E5 . C5 . . . . . . .', bass: 'C3 . . . G2 . . . C3 . G2 . C3 . . .', tick },
    };
  })(),
  order: ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'],
};

/** Island Jog: steady, cheerful, 112 BPM. */
export const JOG_SONG = {
  bpm: 112,
  tracks: {
    lead: { wave: 'triangle', decay: 0.2, volume: 0.6 },
    keys: { wave: 'square', duty: 0.125, decay: 0.1, volume: 0.32 },
    bass: { wave: 'triangle', decay: 0.2, volume: 0.72 },
    kick: { wave: 'sine', freq: 90, freqEnd: 45, decay: 0.09, volume: 0.6 },
    hat: { wave: 'noise', decay: 0.02, volume: 0.14 },
  },
  patterns: (() => {
    const kick = 'C2 . . . . . . . C2 . . . . . . .';
    const hat = 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 .';
    return {
      a: { lead: 'B4 . . D5 . . G5 . . . F#5 . E5 . D5 .', keys: 'G4 . B4 . G4 . B4 . G4 . B4 . G4 . B4 .', bass: 'G2 . . . G2 . . . D3 . . . D3 . . .', kick, hat },
      b: { lead: 'C5 . . E5 . . A5 . . . G5 . F#5 . E5 .', keys: 'A4 . C5 . A4 . C5 . A4 . C5 . A4 . C5 .', bass: 'C3 . . . C3 . . . G2 . . . G2 . . .', kick, hat },
      c: { lead: 'D5 . . G5 . . B5 . . . A5 . G5 . E5 .', keys: 'B4 . D5 . B4 . D5 . C5 . E5 . C5 . E5 .', bass: 'E2 . . . E2 . . . C3 . . . C3 . . .', kick, hat },
      d: { lead: 'D5 . . . E5 . F#5 . G5 . . . . . . .', keys: 'A4 . D5 . A4 . D5 . B4 . D5 . B4 . D5 .', bass: 'D3 . . . D3 . . . G2 . . . G2 . G2 .', kick, hat },
    };
  })(),
  order: ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd'],
};

/** Evening Report: music box, 70 BPM. */
export const REPORT_SONG = {
  bpm: 70,
  tracks: {
    box: { wave: 'sine', decay: 0.7, volume: 0.66 },
    box2: { wave: 'triangle', decay: 0.5, volume: 0.45 },
    low: { wave: 'sine', decay: 1.1, volume: 0.48 },
  },
  patterns: {
    a: { box: 'E6 . . . G5 . . . C6 . . . B5 . A5 .', box2: 'C5 . E5 . G5 . E5 . A4 . C5 . E5 . C5 .', low: 'C3 . . . . . . . A2 . . . . . . .' },
    b: { box: 'D6 . . . F5 . . . B5 . . . A5 . G5 .', box2: 'D5 . F5 . A5 . F5 . G4 . B4 . D5 . B4 .', low: 'D3 . . . . . . . G2 . . . . . . .' },
    c: { box: 'C6 . E6 . G6 . . . F6 . E6 . D6 . . .', box2: 'E5 . G5 . C6 . G5 . F5 . A5 . F5 . D5 .', low: 'C3 . . . . . . . F2 . . . . . . .' },
    d: { box: 'C6 . . . . . . . . . . . . . . .', box2: 'E5 . G5 . C6 . . . . . . . . . . .', low: 'C3 . . . . . . . . . . . . . . .' },
  },
  order: ['a', 'b', 'a', 'c', 'a', 'b', 'c', 'd'],
};

/** The Long Stand: near silence, then one swelling chord line at t = 75. 48 BPM: 5 s a bar. */
export const STAND_SONG = {
  bpm: 48,
  tracks: {
    drone: { wave: 'sine', attack: 2, decay: 3, volume: 0.5 },
    swell1: { wave: 'triangle', attack: 3, sustain: 1, decay: 3, volume: 0.62 },
    swell2: { wave: 'triangle', attack: 3, sustain: 1, decay: 3, volume: 0.5 },
    swell3: { wave: 'sine', attack: 3, sustain: 1, decay: 3, volume: 0.56 },
  },
  patterns: {
    hush: { drone: `D2 ${rest(15)}`, swell1: rest(), swell2: rest(), swell3: rest() },
    quiet: { drone: rest(), swell1: rest(), swell2: rest(), swell3: rest() },
    swellA: { drone: `D2 ${rest(15)}`, swell1: `A4 ${rest(15)}`, swell2: `D5 ${rest(15)}`, swell3: `F#5 ${rest(15)}` },
    swellB: { drone: `G2 ${rest(15)}`, swell1: `B4 ${rest(15)}`, swell2: `D5 ${rest(15)}`, swell3: `G5 ${rest(15)}` },
    swellC: { drone: `D2 ${rest(15)}`, swell1: `A4 ${rest(15)}`, swell2: `F#5 ${rest(15)}`, swell3: `D6 ${rest(15)}` },
  },
  order: ['hush', 'quiet', 'hush', 'quiet', 'quiet', 'hush', 'quiet', 'quiet', 'hush', 'quiet', 'quiet', 'hush', 'quiet', 'quiet', 'quiet', 'swellA', 'swellB', 'swellC'],
  loop: false,
};

/** Ending and credits: the bossa, warmer, as a music box. */
export const CREDITS_SONG = { ...TITLE_SONG, bpm: 84, tracks: { ...TITLE_SONG.tracks, pluck: { wave: 'sine', decay: 0.6, volume: 0.66 } } };

export const SONGS = {
  title: TITLE_SONG, hold: HOLD_SONG, rep: REP_SONG, hoop: HOOP_SONG, step: STEP_SONG,
  lagoon: LAGOON_SONG, jog: JOG_SONG, report: REPORT_SONG, stand: STAND_SONG, credits: CREDITS_SONG,
};
export const SONG_LABELS = {
  title: 'Waiting Room', hold: 'Holding Still', rep: 'The Rep Shed', hoop: 'Beat Beach', step: 'Step Class',
  lagoon: 'Lagoon Games', jog: 'Island Jog', report: 'Evening Report', stand: 'The Long Stand', credits: 'Bring Your Knees',
};
