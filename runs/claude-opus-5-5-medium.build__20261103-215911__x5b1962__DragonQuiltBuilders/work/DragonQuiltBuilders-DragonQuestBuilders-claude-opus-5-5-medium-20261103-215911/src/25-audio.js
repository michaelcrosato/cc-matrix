// Audio, all from code: original songs (the leitmotif "The Golden Thread"), jingles, sound effects, Animalese voices.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, T = 16;
const S = (bpm, steps, tracks, o) => Object.assign({ bpm, steps, tracks }, o || {});
// the leitmotif in B flat, quarter notes as two eighths (steps: 2)
const MOTIF = 'F4 - Bb4 - C5 - D5 - | Eb5 - - - D5 - C5 - | Bb4 - - - G4 - C5 - | A4 - - - - - - - | F4 - Bb4 - C5 - D5 - | F5 - - - Eb5 - D5 - | C5 - Bb4 - A4 - C5 - | Bb4 - - - - - - -';
const MOTIF_BASS = 'Bb2 . F3 . Bb2 . F3 . | Eb3 . Bb3 . Eb3 . Bb2 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | Bb2 . F3 . Bb2 . F3 . | D3 . Ab3 . D3 . Bb2 . | Eb3 . Bb2 . F2 . C3 . | Bb2 . F3 . Bb2 - - .';
DQ.SONGS = {
  title: S(116, 2, [
    { wave: 'square', vol: .13, notes: 'Bb4 - D5 - F5 - - - | Bb5 - - - - - . . | ' + MOTIF + ' | ' + MOTIF.replace('Bb4 - - - - - - -', 'Bb4 - D5 - F5 - Bb5 -') },
    { wave: 'pulse12', vol: .06, notes: 'D4 - F4 - Bb4 - - - | D5 - - - - - . . | D4 . F4 . D4 . F4 . | G4 . Bb4 . G4 . Bb4 . | D4 . G4 . D4 . G4 . | C4 . F4 . C4 . F4 . | D4 . F4 . D4 . F4 . | F4 . Ab4 . F4 . D4 . | G4 . F4 . Eb4 . F4 . | D4 . F4 . D4 - - .' },
    { wave: 'triangle', vol: .3, notes: 'Bb2 - - - Bb2 - - - | Bb2 - - - F2 - - - | ' + MOTIF_BASS + ' | ' + MOTIF_BASS },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h k s . h h' }]),
  lullaby: S(72, 2, [
    { wave: 'sine', vol: .16, notes: 'F4 - - - Bb4 - | C5 - - - D5 - | Eb5 - - - D5 C5 | Bb4 - - - G4 - | A4 - - - - - | F4 - - - - - | C5 - - - Bb4 - | Bb4 - - - - - ' },
    { wave: 'triangle', vol: .22, notes: 'Bb2 . F3 . D3 . | Bb2 . F3 . D3 . | Eb2 . Bb2 . G3 . | G2 . D3 . Bb2 . | F2 . C3 . A3 . | F2 . C3 . A3 . | Eb2 . Bb2 . F3 . | Bb2 . F3 . D3 .' }]),
  hollow: S(88, 2, [
    { wave: 'pulse', vol: .09, notes: 'D4 . A4 . F4 . A4 . | C4 . G4 . E4 . G4 . | D4 . A4 . F4 . C5 . | B3 . G4 . D4 . G4 .' },
    { wave: 'triangle', vol: .24, notes: 'D2 - - - . . . . | C2 - - - . . . . | D2 - - - . . . . | G2 - - - . . . .' },
    { wave: 'pulse12', vol: .05, notes: '. . . . . . D5 - | . . . . E5 - . . | . . F5 - . . A5 - | G5 - - - . . . .' }]),
  town: S(96, 2, [
    { wave: 'pulse', vol: .1, notes: 'C5 - F5 - G5 - | A5 - - - G5 F5 | E5 - - - C5 - | D5 - - - - - | C5 - F5 - G5 - | A5 - Bb5 - C6 - | Bb5 - A5 - G5 - | F5 - - - - - | A5 - G5 - F5 - | E5 - - - C5 - | D5 - E5 - F5 - | G5 - - - - - | C5 - F5 - G5 - | A5 - Bb5 - C6 - | Bb5 - G5 - E5 - | F5 - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'F2 . A3 . C4 . | F2 . A3 . C4 . | C2 . G3 . Bb3 . | Bb1 . F3 . Bb3 . | F2 . A3 . C4 . | F2 . A3 . C4 . | C2 . G3 . E3 . | F2 . C3 . F3 . | D2 . A3 . D4 . | A1 . E3 . A3 . | Bb1 . F3 . Bb3 . | C2 . G3 . C4 . | F2 . A3 . C4 . | F2 . A3 . C4 . | C2 . G3 . E3 . | F2 . C3 . F3 .' },
    { name: 'strings', wave: 'sawtooth', vol: .035, on: false, notes: 'A4 - - - - - | A4 - - - - - | G4 - - - - - | F4 - - - - - | A4 - - - - - | C5 - - - - - | E5 - - - - - | C5 - - - - - | F4 - - - - - | E4 - - - - - | D4 - - - - - | E4 - - - - - | A4 - - - - - | C5 - - - - - | G4 - - - - - | A4 - - - - -' },
    { name: 'bells', wave: 'sine', vol: .07, on: false, notes: '. . . . C6 . | . . . . A5 . | . . . . G5 . | . . . . F5 . | . . . . C6 . | . . . . F6 . | . . . . E6 . | . . . . C6 .' },
    { name: 'drums', wave: 'drums', vol: .1, on: false, notes: 'k . h . h . | k . h . h k' }]),
  night: S(72, 2, [
    { wave: 'triangle', vol: .14, notes: 'E4 - A4 - B4 - C5 - | D5 - - - C5 - B4 - | A4 - - - F4 - B4 - | G#4 - - - - - - - | E4 - A4 - B4 - C5 - | E5 - - - D5 - C5 - | B4 - A4 - G#4 - B4 - | A4 - - - - - - -' },
    { wave: 'sine', vol: .14, notes: 'A2 . E3 . A3 . E3 . | D3 . A3 . D3 . A2 . | F2 . C3 . F3 . C3 . | E2 . B2 . E3 . B2 . | A2 . E3 . A3 . E3 . | C3 . G3 . C3 . G2 . | D3 . A2 . E2 . B2 . | A2 . E3 . A2 - - .' }]),
  glen: S(112, 2, [
    { wave: 'pulse', vol: .1, notes: 'F#5 - A5 - D6 - A5 - | B5 - - - A5 - F#5 - | G5 - E5 - C#5 - E5 - | D5 - - - - - A4 - | F#5 - A5 - D6 - E6 - | F#6 - - - E6 - D6 - | C#6 - B5 - A5 - C#6 - | D6 - - - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'D3 . F#3 . A3 . F#3 . | G2 . B2 . D3 . B2 . | A2 . C#3 . E3 . C#3 . | D3 . A2 . F#2 . A2 . | D3 . F#3 . A3 . F#3 . | B2 . D3 . F#3 . D3 . | G2 . B2 . A2 . C#3 . | D3 . A2 . D3 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . k k h . s . h .' }]),
  crags: S(92, 2, [
    { wave: 'sawtooth', vol: .05, notes: 'E2 - - - - - - - | E2 - - - - - - - | C2 - - - - - - - | D2 - - - B1 - - -' },
    { wave: 'pulse12', vol: .08, notes: 'E4 . G4 . B4 . . . | A4 . G4 . F#4 . E4 . | C5 . B4 . A4 . G4 . | F#4 - - - B3 - - -' },
    { wave: 'drums', vol: .08, notes: 'k . . h . . h . k . h . . h c .' }]),
  tweedwood: S(100, 2, [
    { wave: 'pulse12', vol: .1, notes: 'G4 - B4 D5 - B4 | C5 - E5 G5 - E5 | D5 - B4 G4 - B4 | A4 - - - - - | G4 - B4 D5 - G5 | F#5 - E5 D5 - C5 | B4 - A4 G4 - F#4 | G4 - - - - -' },
    { wave: 'triangle', vol: .24, notes: 'G2 . . D3 . . | C3 . . G3 . . | G2 . . D3 . . | D2 . . A2 . . | G2 . . D3 . . | D2 . . A2 . . | C3 . . D3 . . | G2 . . G2 . .' },
    { wave: 'drums', vol: .07, notes: 'k . h h . h | k . h . s .' }]),
  fraying: S(66, 2, [
    { wave: 'pulse', vol: .07, notes: 'E4 - - - F4 - - - | E4 - - - - - - - | G4 - - - F4 - - - | E4 - - - D4 - - -' },
    { wave: 'pulse12', vol: .05, notes: 'B3 - - - C4 - - - | Bb3 - - - - - - - | D4 - - - C4 - - - | B3 - - - A3 - - -' },
    { wave: 'triangle', vol: .24, notes: 'E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | D2 - - - E2 - - -' },
    { wave: 'drums', vol: .06, notes: 'k . . . . . o . . . . . c . . .' }]),
  siege: S(150, 2, [
    { wave: 'square', vol: .1, notes: 'C5 - Eb5 - G5 - C6 - | Bb5 - Ab5 - G5 - - - | F5 - Ab5 - C6 - F5 - | G5 - - - - - . . | C5 - D5 - Eb5 - F5 - | G5 - - - Ab5 - G5 - | F5 - Eb5 - D5 - B4 - | C5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C2 C3 C2 C3 C2 C3 C2 C3 | Ab1 Ab2 Ab1 Ab2 Ab1 Ab2 Ab1 Ab2 | F1 F2 F1 F2 F1 F2 F1 F2 | G1 G2 G1 G2 G1 G2 B1 B2' },
    { wave: 'drums', vol: .14, notes: 'k . h k s . h . k k h . s . h s' }]),
  miniboss: S(140, 2, [
    { wave: 'square', vol: .1, notes: 'F4 - F4 F4 Ab4 - F4 - | C5 - - - Bb4 - Ab4 - | Db5 - C5 - Bb4 - Ab4 - | G4 - - - C4 - - - ' },
    { wave: 'triangle', vol: .3, notes: 'F2 . C3 . F2 . C3 . | F2 . C3 . F2 . C3 . | Db2 . Ab2 . Db2 . Ab2 . | C2 . G2 . C2 . G2 .' },
    { wave: 'drums', vol: .13, notes: 'k . s . k k s . k . s . k s s s' }]),
  boss: S(160, 2, [
    { wave: 'square', vol: .1, notes: 'D5 - Bb4 - A4 - G4 - | F#4 - - - G4 - A4 - | Bb4 - D5 - Eb5 - D5 - | C5 - - - A4 - - - | D5 - C5 - Bb4 - A4 - | G4 - Bb4 - D5 - G5 - | F#5 - D5 - A4 - F#4 - | G4 - - - . . . .' },
    { wave: 'triangle', vol: .32, notes: 'G1 G2 G1 G2 G1 G2 G1 G2 | D2 D3 D2 D3 D2 D3 D2 D3 | Eb2 Eb3 Eb2 Eb3 Eb2 Eb3 Eb2 Eb3 | F2 F3 F2 F3 D2 D3 D2 D3' },
    { name: 'fury', wave: 'sawtooth', vol: .04, on: false, notes: 'G3 . G3 . Bb3 . G3 . | A3 . A3 . F#3 . A3 . | G3 . G3 . Eb3 . G3 . | F3 . F3 . A3 . F#3 .' },
    { wave: 'drums', vol: .15, notes: 'k k s . k . s k k . s . k s s .' }]),
  bee: S(128, 2, [
    { wave: 'pulse', vol: .1, notes: 'C5 - E5 G5 - E5 C5 - | D5 - F5 A5 - F5 D5 - | E5 - G5 C6 - B5 A5 - | G5 - - - - - . . | C5 - E5 G5 - E5 C5 - | F5 - A5 C6 - A5 F5 - | G5 - F5 E5 - D5 B4 - | C5 - - - . . . .' },
    { wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | E3 . B2 . A2 . E2 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . .' },
    { name: 'raid', wave: 'drums', vol: .13, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { wave: 'drums', vol: .07, notes: 'k . h . . . h .' }]),
  finale: S(108, 2, [
    { wave: 'square', vol: .12, notes: MOTIF + ' | C5 - F5 - G5 - A5 - | Bb5 - - - A5 - G5 - | F5 - D5 - Eb5 - F5 - | Bb5 - - - - - - -' },
    { wave: 'pulse12', vol: .06, notes: 'D4 . F4 . D4 . F4 . | G4 . Bb4 . G4 . Bb4 . | D4 . G4 . D4 . G4 . | C4 . F4 . C4 . F4 .' },
    { wave: 'triangle', vol: .3, notes: MOTIF_BASS + ' | F2 . C3 . F2 . C3 . | Eb2 . Bb2 . Eb2 . Bb2 . | F2 . C3 . F2 . C3 . | Bb2 . F3 . Bb2 - - .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h k s . h h' }])
};
// jingles (played once over ducked music)
DQ.JINGLES = {
  notion: S(160, 4, [{ wave: 'triangle', vol: .2, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - . .' }, { wave: 'sine', vol: .12, notes: '. . C6 . E6 . G6 - - - - .' }], { loop: false }),
  room: S(140, 2, [{ wave: 'square', vol: .14, notes: 'G4 C5 E5 G5 - E5 G5 - C6 - - - - - . .' }, { wave: 'triangle', vol: .26, notes: 'C3 - G3 - C3 - G3 - C3 - - - - - . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k . s s k . . . . . . .' }], { loop: false }),
  level: S(132, 2, [{ wave: 'square', vol: .14, notes: 'Bb4 - Bb4 Bb4 D5 - F5 - Bb5 - - - A5 - Bb5 - - - - - . .' }, { wave: 'pulse12', vol: .07, notes: 'F4 - F4 F4 F4 - D5 - F5 - - - Eb5 - F5 - - - - - . .' }, { wave: 'triangle', vol: .28, notes: 'Bb2 - - - Bb2 - - - Eb3 - - - F3 - Bb2 - - - - - . .' }], { loop: false }),
  quest: S(150, 2, [{ wave: 'square', vol: .13, notes: 'C5 - G4 - C5 - E5 - G5 - - - . .' }, { wave: 'triangle', vol: .26, notes: 'C3 - - - G2 - - - C3 - - - . .' }], { loop: false }),
  item: S(180, 2, [{ wave: 'square', vol: .13, notes: 'G5 A5 B5 D6 - - . .' }], { loop: false }),
  arrive: S(120, 2, [{ wave: 'pulse', vol: .13, notes: 'F5 - A5 - C6 - A5 - F5 - - - . .' }, { wave: 'triangle', vol: .24, notes: 'F3 - - - C3 - - - F3 - - - . .' }], { loop: false }),
  nightfall: S(90, 2, [{ wave: 'triangle', vol: .16, notes: 'E5 - C5 - A4 - E4 - - - . .' }], { loop: false }),
  morning: S(160, 4, [{ wave: 'pulse', vol: .11, notes: 'C6 . E6 . G6 - - . C6 . G6 - - - . .' }], { loop: false }),
  undone: S(80, 2, [{ wave: 'triangle', vol: .18, notes: 'A4 - G4 - F4 - E4 - D4 - - - - - . .' }, { wave: 'sine', vol: .1, notes: 'F3 - - - D3 - - - A2 - - - - - . .' }], { loop: false }),
  wave: S(150, 2, [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - . .' }], { loop: false }),
  victory: S(130, 2, [{ wave: 'square', vol: .14, notes: 'Bb4 D5 F5 Bb5 - - A5 - Bb5 - - - C6 - D6 - - - - - . .' }, { wave: 'triangle', vol: .28, notes: 'Bb2 - - - - - F2 - Bb2 - - - Eb3 - F3 - - - - - . .' }, { wave: 'drums', vol: .12, notes: 'k . s . k k s . k . s . k . s . s s s s . .' }], { loop: false }),
  zzz: S(70, 2, [{ wave: 'sine', vol: .14, notes: 'G5 - E5 - C5 - - - . .' }], { loop: false })
};
// sound effects as engine voices
DQ.SFX = {
  hitSoft: [{ wave: 'noise', freq: 900, filter: 'lowpass', dur: .06, vol: .22 }, { wave: 'triangle', freq: 180, to: 120, dur: .06, vol: .2 }],
  hitHard: [{ wave: 'noise', freq: 900, filter: 'lowpass', dur: .06, vol: .2 }, { wave: 'triangle', freq: 160, to: 100, dur: .07, vol: .2 }, { wave: 'noise', freq: 2000, dur: .02, vol: .14 }],
  clink: { wave: 'pulse', freq: 1800, to: 2200, dur: .05, vol: .16 },
  rip: [{ wave: 'noise', freq: 2500, to: 700, dur: .16, vol: .24, q: 2 }, { wave: 'sine', freq: 600, to: 200, dur: .04, vol: .18, delay: .15 }],
  stitch: [{ wave: 'pulse12', freq: 880, to: 1320, dur: .04, vol: .12 }, { wave: 'noise', freq: 3000, dur: .015, vol: .1 }],
  crumble: [{ wave: 'noise', freq: 600, to: 200, dur: .25, vol: .22, filter: 'lowpass' }],
  swing: { wave: 'noise', freq: 1200, to: 3000, dur: .1, vol: .1, q: .8 },
  spinCharge: { wave: 'triangle', freq: 300, to: 900, dur: .2, vol: .08 },
  spinRelease: [{ wave: 'noise', freq: 800, to: 3000, dur: .3, vol: .18 }, { wave: 'triangle', freq: 300, to: 1200, dur: .25, vol: .1 }],
  pickup: { wave: 'square', freq: 'C6', arp: [0, 4, 7], step: .03, dur: .09, vol: .1 },
  craft: [{ wave: 'noise', freq: 1500, dur: .03, vol: .14 }, { wave: 'noise', freq: 1500, dur: .03, vol: .14, delay: .1 }, { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12], step: .05, dur: .25, vol: .14, delay: .2 }],
  eat: [{ wave: 'noise', freq: 500, dur: .05, vol: .15 }, { wave: 'noise', freq: 450, dur: .05, vol: .15, delay: .12 }, { wave: 'noise', freq: 400, dur: .05, vol: .15, delay: .24 }],
  zipper: { wave: 'noise', freq: 1000, to: 4000, dur: .25, vol: .1, q: 4 },
  uiMove: { wave: 'pulse12', freq: 1200, dur: .025, vol: .07 },
  uiConfirm: { wave: 'square', freq: 'E6', arp: [0, 7], step: .04, dur: .08, vol: .08 },
  uiCancel: { wave: 'square', freq: 'C5', to: 'G4', dur: .08, vol: .08 },
  doorOpen: { wave: 'sawtooth', freq: 200, to: 320, dur: .18, vol: .05 },
  doorClose: [{ wave: 'sawtooth', freq: 300, to: 180, dur: .14, vol: .05 }, { wave: 'noise', freq: 400, dur: .04, vol: .12, delay: .13 }],
  portal: [{ wave: 'sine', freq: 300, to: 1200, dur: .6, vol: .14, vib: [10, .1] }, { wave: 'triangle', freq: 600, to: 2400, dur: .5, vol: .08 }],
  bubble: [{ wave: 'sine', freq: 'E6', dur: .08, vol: .14 }, { wave: 'sine', freq: 'A6', dur: .12, vol: .14, delay: .08 }],
  trap: { wave: 'noise', freq: 4000, dur: .05, vol: .12 },
  ballistaFire: [{ wave: 'sine', freq: 140, to: 60, dur: .15, vol: .3 }, { wave: 'noise', freq: 1500, to: 400, dur: .2, vol: .12 }],
  ballistaReload: [{ wave: 'noise', freq: 2000, dur: .03, vol: .12 }, { wave: 'noise', freq: 2400, dur: .03, vol: .12, delay: .12 }],
  monsterDie: { wave: 'sine', freq: 600, to: 120, dur: .15, vol: .18 },
  builderHurt: [{ wave: 'square', freq: 300, to: 120, dur: .12, vol: .16 }, { wave: 'noise', freq: 800, dur: .06, vol: .12 }],
  heartbeat: [{ wave: 'sine', freq: 60, dur: .1, vol: .3 }, { wave: 'sine', freq: 55, dur: .1, vol: .25, delay: .18 }],
  slam: [{ wave: 'sine', freq: 90, to: 30, dur: .5, vol: .4 }, { wave: 'noise', freq: 300, to: 80, dur: .5, vol: .22, filter: 'lowpass' }],
  roar: [{ wave: 'sawtooth', freq: 80, to: 55, dur: .8, vol: .18, vib: [12, .08] }, { wave: 'noise', freq: 400, to: 150, dur: .7, vol: .12 }],
  notice: { wave: 'square', freq: 'A5', to: 'E6', dur: .06, vol: .08 },
  windup: { wave: 'triangle', freq: 200, to: 420, dur: .25, vol: .08 },
  punch: { wave: 'noise', freq: 300, dur: .08, vol: .2, filter: 'lowpass' },
  roll: { wave: 'noise', freq: 2500, dur: .4, vol: .07, q: 6 },
  volley: [{ wave: 'pulse', freq: 900, to: 400, dur: .08, vol: .1 }, { wave: 'pulse', freq: 1000, to: 500, dur: .08, vol: .1, delay: .05 }],
  tangle: [{ wave: 'noise', freq: 1800, to: 300, dur: .4, vol: .18 }, { wave: 'square', freq: 'C5', arp: [0, -1, -2, -3], step: .06, dur: .3, vol: .1 }],
  questStep: { wave: 'triangle', freq: 'G5', arp: [0, 5], step: .06, dur: .14, vol: .12 },
  arp: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7], step: .04, dur: .12, vol: .1 },
  tok: { wave: 'noise', freq: 1200, dur: .03, vol: .14 },
  unravel: [{ wave: 'noise', freq: 3000, to: 500, dur: .6, vol: .14, q: 3 }, { wave: 'triangle', freq: 800, to: 200, dur: .5, vol: .08 }],
  firework: [{ wave: 'noise', freq: 1500, to: 300, dur: .5, vol: .16 }, { wave: 'sine', freq: 1200, to: 600, dur: .2, vol: .06 }],
  whoosh: { wave: 'noise', freq: 600, to: 1800, dur: .18, vol: .1, q: .7 },
  step_grass: { wave: 'noise', freq: 900, dur: .03, vol: .05, filter: 'lowpass' },
  step_stone: { wave: 'noise', freq: 2400, dur: .02, vol: .05 },
  step_wood: { wave: 'triangle', freq: 220, to: 160, dur: .03, vol: .06 },
  step_sand: { wave: 'noise', freq: 3500, dur: .04, vol: .04, q: .6 },
  step_water: { wave: 'noise', freq: 1200, to: 600, dur: .07, vol: .07 }
};

// ---- the director: songs by context, layers by town level, positional sfx, voices ----
class AudioX {
  constructor(ctx) { this.ctx = ctx; this.cur = null; this._last = 0; this._vt = 0; this.vol = 1; for (const k in DQ.SFX) ctx.game.audio.define(k, DQ.SFX[k]); }
  get A() { return this.ctx.game.audio; }
  sfx(n, o) { if (this.silent) return; this.A.sfx(n, Object.assign({ vol: this.vol }, o || {})); }
  sfxAt(n, x, y) { const b = this.ctx.builder; if (!b) return this.sfx(n); const d = Math.hypot(x - b.body.x, y - b.body.y) / T; if (d > 24) return; this.sfx(n, { vol: this.vol * E.clamp(1.2 - d / 20, .15, 1) }); }
  step(mat) { this.sfx('step_' + (DQ.SFX['step_' + mat] ? mat : 'grass')); }
  charge(k) { if (!this._ch || this.ctx.game.time - this._ch > .25) { this._ch = this.ctx.game.time; this.sfx('spinCharge', { pitch: .8 + Math.min(1, k) * .8 }); } }
  monsterHurt(id) { const p = { lintling: 1.8, dyedLintling: 1.6, mothlet: 2, pinhog: 1.2, frayedKnight: .9, knotbrute: .6, buttonGolem: .5, gnarlgrim: .4 }[id] || 1; this.sfx('notice', { pitch: p }); }
  jingle(id) { const s = DQ.JINGLES[id]; if (s && !this.silent) this.A.sting(s, { at: 'now', duck: .3 }); }
  play(id, o = {}) { if (this.cur === id && !o.restart) return; this.cur = id; if (this.silent && id) return; this.A.music(id ? DQ.SONGS[id] : null, { fade: o.fade === undefined ? 1 : o.fade }); this._layers = -1; }
  // pick the song for where the builder is and what is going on
  direct(dt) {
    const ctx = this.ctx; if (ctx.mode !== 'story' && ctx.mode !== 'attract') return;
    const b = ctx.builder; if (!b) return;
    let id;
    const boss = ctx.monsters && ctx.monsters.list.find(m => m.def.boss && !m.dead && m.awake);
    if (boss) id = boss.id === 'gnarlgrim' ? 'boss' : 'miniboss';
    else if (ctx.siege && ctx.siege.active) id = 'siege';
    else if (ctx.party > 0) id = 'finale';
    else {
      const reg = DQ.regionAt(Math.floor(b.body.x / T), Math.floor(b.body.y / T));
      if (ctx.clock && ctx.clock.isNight && reg !== 'fraying' && reg !== 'hollow') id = 'night';
      else id = { hollow: 'hollow', town: ctx.town && ctx.town.planted ? 'town' : 'glen', glen: 'glen', coast: 'glen', crags: 'crags', quarry: 'crags', tweedwood: 'tweedwood', verge: 'fraying', fraying: 'fraying', rift: 'fraying' }[reg] || 'glen';
    }
    this.play(id);
    if (id === 'town' && this.A.song) { const lv = ctx.town.level; if (lv !== this._layers) { this._layers = lv; this.A.layer('strings', lv >= 2 ? 1 : 0, 2); this.A.layer('bells', lv >= 3 ? 1 : 0, 2); this.A.layer('drums', lv >= 4 ? 1 : 0, 2); } }
    if (id === 'boss' && this.A.song && boss) this.A.layer('fury', boss.phase >= 3 ? 1 : 0, 1);
    if (b.hp > 0 && b.hp / b.maxHp < .25) { this._hb = (this._hb || 0) - dt; if (this._hb <= 0) { this._hb = .9; this.sfx('heartbeat'); } }
  }
  // ---- Animalese: one syllable per letter, a consonant onset and a formant-filtered vowel ----
  voiceLetter(who, ch, i, text) {
    const A = this.A, c = A.ctx; if (!c || !A._voiceBus || A.muted || this.silent || c.state !== 'running') return;
    const v = (DQ.NPCS[who] || {}).voice; if (!v) return;
    if (!/[a-z0-9]/i.test(ch)) return;
    const now = c.currentTime; if (now - this._vt < .045) return; this._vt = now;
    const h = DQ.hash3(ch.charCodeAt(0), i, DQ.hashStr(who) & 1023), lower = ch.toLowerCase();
    const word = text.slice(0, i + 1).split(/\s/).pop(), wordStart = word.length === 1, caps = /[A-Z]/.test(ch) && /[A-Z]{2,}/.test(text.slice(Math.max(0, i - 2), i + 3));
    const qEnd = text.slice(i).search(/[?]/), q = qEnd >= 0 && qEnd <= 3;
    let f = v.f * (1 + (h - .5) * 2 * v.range) * (wordStart ? 1.08 : 1) * (1 - .06 * i / Math.max(1, text.length)) * (caps ? 1.15 : 1) * (q ? 1.2 : 1);
    if (v.chirp && h > .7) f *= 1.3;
    const vow = (text.slice(i).match(/[aeiou]/i) || ['a'])[0].toLowerCase(), F = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800] }[vow], k = v.formant || 1;
    const dur = .055 + h * .015, t0 = now + .005, vol = .22 * (caps ? 1.15 : 1);
    const out = c.createGain(); out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(vol, t0 + .008); out.gain.exponentialRampToValueAtTime(.001, t0 + dur); out.connect(A._voiceBus);
    if (v.echo) { const d = c.createDelay(); d.delayTime.value = .12; const fb = c.createGain(); fb.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(A._voiceBus); }
    const osc = c.createOscillator(); osc.type = v.wave === 'pulse' || v.wave === 'pulse12' ? 'square' : v.wave === 'sawtooth' ? 'sawtooth' : v.wave === 'sine' ? 'sine' : v.wave === 'square' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(f, t0); osc.frequency.linearRampToValueAtTime(f * (v.chirp ? 1.15 : .97), t0 + dur);
    if (v.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = v.vib[0]; lg.gain.value = f * v.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .02); }
    for (const [fr, g2] of [[F[0] * k, 1], [F[1] * k, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 5; const gg = c.createGain(); gg.gain.value = g2 * 2.2; osc.connect(bp); bp.connect(gg); gg.connect(out); }
    if (v.drive) { const ws = c.createWaveShaper(), n = 256, cu = new Float32Array(n); for (let j = 0; j < n; j++) { const x = j / n * 2 - 1; cu[j] = Math.tanh(x * 3); } ws.curve = cu; osc.connect(ws); const wg = c.createGain(); wg.gain.value = .25; ws.connect(wg); wg.connect(out); }
    osc.start(t0); osc.stop(t0 + dur + .02);
    // the consonant onset
    if (A._noise && /[szcxtdkgpbqmnlrwyvfhj]/.test(lower)) {
      const src = c.createBufferSource(); src.buffer = A._noise; const fl = c.createBiquadFilter(), ng = c.createGain();
      if ('szcx'.includes(lower)) { fl.type = 'highpass'; fl.frequency.value = 4000; } else if ('tdkgpbq'.includes(lower)) { fl.type = 'bandpass'; fl.frequency.value = 1500; } else { fl.type = 'lowpass'; fl.frequency.value = 600; }
      const d2 = 'szcx'.includes(lower) ? .018 : 'tdkgpbq'.includes(lower) ? .008 : .012;
      ng.gain.setValueAtTime(.12, t0); ng.gain.exponentialRampToValueAtTime(.001, t0 + d2); src.connect(fl); fl.connect(ng); ng.connect(A._voiceBus); src.start(t0); src.stop(t0 + d2 + .01);
    }
  }
}
DQ.AudioX = AudioX;
})();
