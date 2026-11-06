// Original songs as engine Song data. Instruments are written loud (track volumes 0.45-0.8) for a 10% music bus.
const fit = (s, n = 16) => { const t = s.trim().split(/\s+/); while (t.length < n) t.push('.'); return t.slice(0, n).join(' '); };
const bar = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fit(v)]));
const empty = () => bar({});

/** Title / Plaza: gentle waiting-room bossa, 92 BPM, soft triangle plucks. */
export const PLAZA = {
  bpm: 92, stepsPerBeat: 4,
  tracks: { pluck: { wave: 'triangle', decay: 0.28, volume: 0.7 }, bass: { wave: 'sine', decay: 0.35, volume: 0.75 }, pad: { wave: 'sine', attack: 0.05, decay: 0.7, volume: 0.45 }, hat: { wave: 'noise', decay: 0.04, volume: 0.45 } },
  patterns: {
    a: bar({ pluck: 'E5 . . G5 . . E5 . D5 . . C5 . . . .', bass: 'C3 . . . G2 . . C3 . . . . G2 . C3 .', pad: 'E4 - - - - - - - - - - - - - - -', hat: '. . C8 . . C8 . . . C8 . . C8 . . .' }),
    b: bar({ pluck: 'F5 . . A5 . . G5 . E5 . . D5 . . C5 .', bass: 'F2 . . . C3 . . F2 . . . . C3 . F2 .', pad: 'A4 - - - - - - - - - - - - - - -', hat: '. . C8 . . C8 . . . C8 . . C8 . . .' }),
    c: bar({ pluck: 'D5 . . F5 . . A5 . G5 . . F5 . . E5 .', bass: 'D3 . . . A2 . . D3 . . . . A2 . D3 .', pad: 'F4 - - - - - - - - - - - - - - -', hat: '. . C8 . . C8 . . . C8 . . C8 . . .' }),
    d: bar({ pluck: 'G5 . . E5 . . D5 . C5 . . . . . . .', bass: 'G2 . . . D3 . . G2 . . . . C3 . . .', pad: 'B4 - - - - - - - - - - - - - - -', hat: '. . C8 . . C8 . . . C8 . . C8 . C8 .' }),
  },
  order: ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'a'],
};
/** Holding Still: slow, sparse, breath-paced, 60 BPM. */
export const STILL = {
  bpm: 60, stepsPerBeat: 4,
  tracks: { bell: { wave: 'sine', attack: 0.02, decay: 1.2, volume: 0.65 }, drone: { wave: 'triangle', attack: 0.3, decay: 1.5, volume: 0.5 }, air: { wave: 'sine', attack: 0.4, decay: 1.0, volume: 0.45 } },
  patterns: {
    a: bar({ bell: 'E5 . . . . . . . . . . . B4 . . .', drone: 'C3 - - - - - - - - - - - - - - -', air: '. . . . . . . . G4 - - - - - - -' }),
    b: bar({ bell: '. . . . G5 . . . . . . . D5 . . .', drone: 'A2 - - - - - - - - - - - - - - -', air: 'E4 - - - - - - - . . . . . . . .' }),
    c: bar({ bell: 'C5 . . . . . . . E5 . . . . . . .', drone: 'F2 - - - - - - - - - - - - - - -', air: '. . . . A4 - - - - - - - - - - -' }),
  },
  order: ['a', 'b', 'a', 'c'],
};
/** Rep Shed: light funk bass, 110 BPM. */
export const REPS = {
  bpm: 110, stepsPerBeat: 4,
  tracks: { bass: { wave: 'square', duty: 0.25, decay: 0.14, volume: 0.6 }, stab: { wave: 'triangle', decay: 0.1, volume: 0.6 }, hat: { wave: 'noise', decay: 0.03, volume: 0.45 }, kick: { wave: 'sine', decay: 0.12, volume: 0.8 } },
  patterns: {
    a: bar({ bass: 'E2 . E2 . . G2 . A2 . . E2 . D2 . . .', stab: '. . . . E4 . . . . . . . E4 . G4 .', hat: 'C8 . C8 C8 C8 . C8 . C8 . C8 C8 C8 . C8 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .' }),
    b: bar({ bass: 'A2 . A2 . . C3 . D3 . . A2 . G2 . . .', stab: '. . . . A4 . . . . . . . C5 . A4 .', hat: 'C8 . C8 C8 C8 . C8 . C8 . C8 C8 C8 . C8 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . C2' }),
  },
  order: ['a', 'a', 'b', 'a', 'a', 'b', 'b', 'a'],
};
/** Beat Beach (Hoop): bright four-on-the-floor, 118 BPM. */
export const HOOP = {
  bpm: 118, stepsPerBeat: 4,
  tracks: { lead: { wave: 'square', duty: 0.25, decay: 0.16, volume: 0.5 }, bass: { wave: 'triangle', decay: 0.2, volume: 0.8 }, kick: { wave: 'sine', decay: 0.12, volume: 0.8 }, hat: { wave: 'noise', decay: 0.03, volume: 0.45 } },
  patterns: {
    a: bar({ lead: 'C5 . E5 . G5 . E5 . C5 . E5 . G5 . A5 .', bass: 'C3 . C3 . C3 . C3 . F2 . F2 . G2 . G2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 C8' }),
    b: bar({ lead: 'A5 . G5 . E5 . G5 . F5 . E5 . D5 . C5 .', bass: 'A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 C8' }),
  },
  order: ['a', 'b', 'a', 'b'],
};
/** Step Class: 104 BPM exactly. 32 bars = intro 4, verse 8, chorus 8, breakdown 4, final 8. */
const stepIntro = bar({ lead: '. . . . . . . . . . . . . . . .', bass: 'C3 . . . . . . . G2 . . . . . . .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 .' });
const stepVerse = bar({ lead: 'E5 . G5 . A5 . G5 . E5 . D5 . C5 . . .', bass: 'C3 . C3 . C3 . C3 . G2 . G2 . A2 . A2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 C8' });
const stepVerse2 = bar({ lead: 'D5 . F5 . A5 . F5 . D5 . C5 . B4 . . .', bass: 'F2 . F2 . F2 . F2 . G2 . G2 . G2 . G2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: '. . C8 . . . C8 . . . C8 . . . C8 C8' });
const stepChorus = bar({ lead: 'G5 . G5 . E6 . D6 . C6 . A5 . G5 . E5 .', bass: 'C3 C3 . C3 C3 . C3 . A2 A2 . A2 A2 . A2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' });
const stepChorus2 = bar({ lead: 'F5 . F5 . D6 . C6 . A5 . G5 . F5 . D5 .', bass: 'F2 F2 . F2 F2 . F2 . G2 G2 . G2 G2 . G2 .', kick: 'C2 . . . C2 . . . C2 . . . C2 . . .', hat: 'C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8 C8' });
const stepBreak = bar({ lead: '. . . . E5 . . . . . . . G5 . . .', bass: 'A2 . . . . . . . E2 . . . . . . .', kick: 'C2 . . . . . . . C2 . . . . . . .', hat: '. . . . . . . . . . . . . . . .' });
export const STEP = {
  bpm: 104, stepsPerBeat: 4, loop: false,
  tracks: { lead: { wave: 'square', duty: 0.25, decay: 0.15, volume: 0.5 }, bass: { wave: 'triangle', decay: 0.2, volume: 0.8 }, kick: { wave: 'sine', decay: 0.12, volume: 0.8 }, hat: { wave: 'noise', decay: 0.03, volume: 0.45 } },
  patterns: { in: stepIntro, va: stepVerse, vb: stepVerse2, ca: stepChorus, cb: stepChorus2, br: stepBreak },
  order: ['in', 'in', 'in', 'in', 'va', 'vb', 'va', 'vb', 'va', 'vb', 'va', 'vb', 'ca', 'cb', 'ca', 'cb', 'ca', 'cb', 'ca', 'cb', 'br', 'br', 'br', 'br', 'ca', 'cb', 'ca', 'cb', 'ca', 'cb', 'ca', 'cb'],
};
/** Lagoon Games: staccato ukulele feel, 120 BPM. */
export const LAGOON = {
  bpm: 120, stepsPerBeat: 4,
  tracks: { uke: { wave: 'triangle', decay: 0.08, volume: 0.75 }, uke2: { wave: 'triangle', decay: 0.08, volume: 0.55 }, bass: { wave: 'sine', decay: 0.18, volume: 0.75 }, shaker: { wave: 'noise', decay: 0.03, volume: 0.4 } },
  patterns: {
    a: bar({ uke: 'C5 . C5 . E5 . C5 . G4 . G4 . B4 . G4 .', uke2: 'E4 . E4 . G4 . E4 . D4 . D4 . G4 . D4 .', bass: 'C3 . . . . . G2 . . . . . G2 . . .', shaker: 'C8 . C8 C8 C8 . C8 . C8 . C8 C8 C8 . C8 .' }),
    b: bar({ uke: 'F5 . F5 . A5 . F5 . G5 . G5 . D5 . G5 .', uke2: 'A4 . A4 . C5 . A4 . B4 . B4 . G4 . B4 .', bass: 'F2 . . . . . C3 . . . . . G2 . . .', shaker: 'C8 . C8 C8 C8 . C8 . C8 . C8 C8 C8 . C8 .' }),
  },
  order: ['a', 'a', 'b', 'a', 'b', 'b', 'a', 'a'],
};
/** Island Jog: steady, cheerful, 112 BPM. */
export const JOG = {
  bpm: 112, stepsPerBeat: 4,
  tracks: { lead: { wave: 'square', duty: 0.5, decay: 0.16, volume: 0.45 }, bass: { wave: 'triangle', decay: 0.2, volume: 0.8 }, kick: { wave: 'sine', decay: 0.1, volume: 0.8 }, hat: { wave: 'noise', decay: 0.03, volume: 0.4 } },
  patterns: {
    a: bar({ lead: 'G4 . C5 . E5 . C5 . G4 . C5 . E5 . G5 .', bass: 'C3 . G2 . C3 . G2 . C3 . G2 . C3 . G2 .', kick: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8' }),
    b: bar({ lead: 'A4 . D5 . F5 . D5 . A4 . D5 . F5 . A5 .', bass: 'D3 . A2 . D3 . A2 . G2 . D3 . G2 . D3 .', kick: 'C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .', hat: '. C8 . C8 . C8 . C8 . C8 . C8 . C8 . C8' }),
  },
  order: ['a', 'a', 'b', 'a', 'a', 'b', 'b', 'a'],
};
/** Evening Report: music box, 70 BPM. */
export const REPORT = {
  bpm: 70, stepsPerBeat: 4,
  tracks: { box: { wave: 'triangle', decay: 0.5, volume: 0.7 }, low: { wave: 'sine', attack: 0.02, decay: 0.9, volume: 0.55 } },
  patterns: {
    a: bar({ box: 'E5 . G5 . C6 . G5 . E5 . G5 . C6 . G5 .', low: 'C3 - - - - - - - G2 - - - - - - -' }),
    b: bar({ box: 'D5 . F5 . A5 . F5 . D5 . F5 . B5 . G5 .', low: 'F2 - - - - - - - G2 - - - - - - -' }),
  },
  order: ['a', 'b', 'a', 'b'],
};
/** The Long Stand: near silence, then one swelling chord line from t = 75 s (bar 19 at 60 BPM, 4 s a bar). */
const quiet = bar({ drone: '. . . . . . . . . . . . . . . .', swell: '. . . . . . . . . . . . . . . .', tick: '. . . . . . . . . . . . . . . .' });
const hint = bar({ drone: 'C2 - - - - - - - - - - - - - - -', swell: '. . . . . . . . . . . . . . . .', tick: '. . . . . . . . . . . . . . . .' });
export const LONGSTAND = {
  bpm: 60, stepsPerBeat: 4, loop: false,
  tracks: { drone: { wave: 'sine', attack: 0.5, decay: 3, volume: 0.5 }, swell: { wave: 'triangle', attack: 1.2, decay: 3.2, volume: 0.7 }, tick: { wave: 'sine', decay: 0.2, volume: 0.45 } },
  patterns: {
    q: quiet, h: hint,
    s1: bar({ drone: 'C2 - - - - - - - - - - - - - - -', swell: 'C4 - - - - - - - E4 - - - - - - -', tick: '. . . . . . . . . . . . . . . .' }),
    s2: bar({ drone: 'A1 - - - - - - - - - - - - - - -', swell: 'G4 - - - - - - - C5 - - - - - - -', tick: '. . . . . . . . . . . . . . . .' }),
    s3: bar({ drone: 'F2 - - - - - - - - - - - - - - -', swell: 'A4 - - - - - - - C5 - - - - - - -', tick: '. . . . . . . . . . . . . . . .' }),
    s4: bar({ drone: 'C2 - - - - - - - - - - - - - - -', swell: 'E5 - - - - - - - G5 - - - - - - -', tick: '. . . . . . . . . . . . . . . .' }),
  },
  order: ['h', 'q', 'q', 'q', 'h', 'q', 'q', 'q', 'h', 'q', 'q', 'q', 'h', 'q', 'q', 'q', 'h', 'q', 's1', 's2', 's3', 's4'],
};
export const SONGS = { plaza: PLAZA, still: STILL, reps: REPS, hoop: HOOP, step: STEP, lagoon: LAGOON, jog: JOG, report: REPORT, longstand: LONGSTAND };
export const songLevel = (song) => Object.values(song.tracks).reduce((a, t) => a + (t.volume ?? 0.5), 0) * 0.1 * 0.8;
