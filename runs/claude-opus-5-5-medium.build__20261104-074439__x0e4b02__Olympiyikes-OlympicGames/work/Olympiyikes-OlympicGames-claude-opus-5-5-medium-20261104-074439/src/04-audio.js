/* OLYMPIYIKES! — audio, all in code: sound effects, original songs, stings, gibberish voices, the crowd, procedural anthems. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, A = game.audio;

/* ---- sound effects (§9.2) ---- */
const SFX = {
  gun: [{ wave: 'noise', freq: 1800, to: 200, dur: .12, vol: .5 }, { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .5 }],
  beep: { wave: 'sine', freq: 880, dur: .15, vol: .3 },
  beepHi: { wave: 'sine', freq: 1320, dur: .25, vol: .3 },
  thunk: [{ wave: 'noise', freq: 600, to: 120, dur: .1, vol: .35, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .15, vol: .4 }],
  boing: { wave: 'triangle', freq: 300, to: 600, dur: .3, vol: .3, vib: [14, .2] },
  twang: { wave: 'pulse', freq: 220, to: 180, dur: .25, vol: .25, vib: [30, .08] },
  thwack: [{ wave: 'noise', freq: 3000, to: 800, dur: .05, vol: .4 }, { wave: 'sine', freq: 180, dur: .08, vol: .35 }],
  clank: [{ wave: 'square', freq: 800, dur: .12, vol: .18, arp: [0, 7, 12], step: .02 }, { wave: 'noise', freq: 4000, to: 2000, dur: .08, vol: .2 }],
  slam: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .6 }, { wave: 'noise', freq: 900, to: 200, dur: .35, vol: .35, filter: 'lowpass' }, { wave: 'square', freq: 300, dur: .25, vol: .08, arp: [0, 1, 0, 1], step: .03 }],
  splash: { wave: 'noise', freq: 2000, to: 300, dur: .5, vol: .4 },
  slap: [{ wave: 'noise', freq: 4000, to: 900, dur: .08, vol: .55 }, { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .5 }],
  bubbles: { wave: 'sine', freq: 600, to: 1200, dur: .18, vol: .15, arp: [0, 5, 9, 4], step: .04 },
  swish: { wave: 'noise', freq: 3000, to: 2200, dur: .18, vol: .18, filter: 'highpass' },
  crunch: { wave: 'noise', freq: 900, to: 400, dur: .12, vol: .25 },
  scrape: [{ wave: 'noise', freq: 5000, to: 3000, dur: .2, vol: .2 }, { wave: 'square', freq: 70, dur: .2, vol: .08 }],
  clack: [{ wave: 'noise', freq: 1500, dur: .04, vol: .45 }, { wave: 'square', freq: 400, to: 300, dur: .06, vol: .2 }],
  brush: { wave: 'noise', freq: 2500, to: 1800, dur: .07, vol: .18, filter: 'highpass' },
  puck: { wave: 'square', freq: 2000, to: 1500, dur: .03, vol: .2 },
  check: [{ wave: 'sine', freq: 80, to: 40, dur: .25, vol: .5 }, { wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .35 }],
  glass: [{ wave: 'noise', freq: 5000, dur: .25, vol: .2, filter: 'highpass' }, { wave: 'triangle', freq: 1200, to: 1500, dur: .35, vol: .12, vib: [20, .05] }],
  horn: [{ wave: 'saw', freq: 220, dur: 1.2, vol: .18 }, { wave: 'saw', freq: 277, dur: 1.2, vol: .14 }, { wave: 'saw', freq: 330, dur: 1.2, vol: .12 }],
  buzzer: { wave: 'square', freq: 180, dur: .8, vol: .2 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .14 },
  cowbell: [{ wave: 'square', freq: 560, dur: .3, vol: .12 }, { wave: 'square', freq: 840, dur: .3, vol: .1 }],
  camera: [{ wave: 'square', freq: 1800, dur: .02, vol: .15 }, { wave: 'noise', freq: 6000, dur: .05, vol: .12, filter: 'highpass' }],
  firework: [{ wave: 'noise', freq: 900, to: 100, dur: .5, vol: .4 }, { wave: 'noise', freq: 5000, to: 3000, dur: .4, vol: .12, filter: 'highpass' }],
  medal: { wave: 'triangle', freq: 'C6', dur: .5, vol: .25, arp: [0, 4, 7, 12], step: .08 },
  cough: [{ wave: 'noise', freq: 700, to: 400, dur: .12, vol: .35, filter: 'lowpass' }, { wave: 'noise', freq: 600, to: 350, dur: .1, vol: .3, filter: 'lowpass' }],
  alarm: { wave: 'square', freq: 880, dur: 1.2, vol: .12, arp: [0, -4, 0, -4, 0, -4, 0, -4], step: .15 },
  pop: { wave: 'noise', freq: 3000, to: 100, dur: .3, vol: .5 },
  whooshBig: { wave: 'noise', freq: 400, to: 2400, dur: .45, vol: .25 },
  gate: { wave: 'triangle', freq: 900, to: 1400, dur: .12, vol: .2 },
  rumble: { wave: 'noise', freq: 180, to: 140, dur: .25, vol: .18, filter: 'lowpass' },
  oof: { wave: 'saw', freq: 220, to: 110, dur: .25, vol: .25 },
  judge: { wave: 'triangle', freq: 'E5', dur: .12, vol: .2 },
  stepRun: { wave: 'noise', freq: 900, to: 400, dur: .04, vol: .15 },
  cheerSwell: { wave: 'noise', freq: 700, to: 1200, dur: 1.4, vol: .22, filter: 'lowpass' },
  gasp: { wave: 'noise', freq: 1500, to: 500, dur: .5, vol: .2, filter: 'lowpass' },
  flame: { wave: 'noise', freq: 300, to: 900, dur: .6, vol: .25, filter: 'lowpass' },
  turbo: [{ wave: 'saw', freq: 220, to: 880, dur: .5, vol: .18 }, { wave: 'noise', freq: 500, to: 2500, dur: .5, vol: .15 }],
  lightOn: { wave: 'square', freq: 'G5', dur: .2, vol: .12, arp: [0, 12], step: .06 },
  lightOff: { wave: 'square', freq: 'C4', dur: .25, vol: .14 }
};
for (const k in SFX) A.define(k, SFX[k]);

/* ---- songs (§9.1): every one original ---- */
const T = (wave, vol, notes, extra) => Object.assign({ wave, vol, notes }, extra || {});
const HYPE = notes => T('drums', .09, notes, { name: 'hype', on: false });
O.SONGS = {
  title: { bpm: 120, steps: 4, tracks: [
    T('square', .07, 'G4 - - - C5 - - - E5 - - - G5 - - - | C6 - - - - - - - B5 - A5 - G5 - - - | A5 - - - F5 - - - D5 - - - G5 - - - | E5 - - - D#5 - - - D5 - - - C#5 - - - | C5 - - - . . G4 - C5 - E5 - G5 - - - | C6 - - - - - - - - - - - . . . .'),
    T('saw', .035, 'E4 - - - G4 - - - C5 - - - E5 - - - | E5 - - - - - - - D5 - C5 - B4 - - - | F4 - - - A4 - - - B4 - - - D5 - - - | C5 - - - B4 - - - Bb4 - - - A4 - - - | A4 - - - . . E4 - G4 - C5 - E5 - - - | E5 - - - - - - - - - - - . . . .'),
    T('triangle', .26, 'C3 - - - C3 - - - G2 - - - G2 - - - | A2 - - - A2 - - - E2 - - - E2 - - - | F2 - - - F2 - - - G2 - - - G2 - - - | C3 - - - B2 - - - Bb2 - - - A2 - - - | F2 - - - G2 - - - C3 - - - - - - - | C3 - - - - - - - - - - - - - - -'),
    T('drums', .08, 'k . . . s . . . k . k . s . . . | k . . . s . . . k . k . s . . . | k . . . s . . . k . k . s . . . | k . . . s . . . k . k . s . . . | k . . . s . . . k . k . s . . . | s s s s s s s s s s s s c . . .')] },
  menu: { bpm: 112, steps: 4, tracks: [
    T('pulse12', .06, 'E5 . G5 . A5 . G5 E5 | D5 . E5 . C5 . . . | E5 . G5 . A5 . C6 A5 | G5 . E5 . D5 . . . | F5 . A5 . C6 . A5 F5 | E5 . G5 . C6 . G5 E5 | D5 . F5 . A5 . G5 . | C5 - - - . . . .'),
    T('triangle', .26, 'C3 . C3 G2 . C3 . G2 | A2 . A2 E2 . A2 . E2 | F2 . F2 C3 . F2 . C3 | G2 . G2 D3 . G2 . B2 | F2 . F2 C3 . F2 . A2 | C3 . C3 G2 . C3 . E3 | G2 . G2 D3 . G2 . B2 | C3 . G2 . C3 . . .'),
    T('drums', .07, 'k . h . s . h k | . k h . s . h . | k . h . s . h k | . k h . s h s .')] },
  parade: { bpm: 116, steps: 4, tracks: [
    T('square', .07, 'C5 - - C5 E5 - G5 - | A5 - G5 - E5 - C5 - | D5 - - D5 F5 - A5 - | G5 - - - - - . . | E5 - - E5 G5 - C6 - | B5 - A5 - G5 - E5 - | F5 - E5 - D5 - B4 - | C5 - - - - - . .'),
    T('triangle', .26, 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .'),
    T('drums', .08, 'k . s s k . s . | k . s s k s s s')] },
  sprint: { bpm: 172, steps: 4, tracks: [
    T('square', .055, 'A5 . A5 C6 . A5 G5 . | E5 . G5 . A5 . . . | A5 . A5 C6 . D6 C6 . | A5 . G5 . E5 . . . | F5 . F5 A5 . F5 E5 . | C5 . E5 . F5 . . . | G5 . G5 B5 . D6 B5 . | G5 . E5 . D5 . . .'),
    T('saw', .05, 'A2 A2 A3 A2 A2 A3 A2 A3 | A2 A2 A3 A2 A2 A3 G2 G3 | F2 F2 F3 F2 F2 F3 F2 F3 | G2 G2 G3 G2 G2 G3 E2 E3'),
    T('drums', .08, 'k . h k s . h . | k k h . s . h h'),
    HYPE('h h h h h h h h | h h h h s s s s')] },
  javelin: { bpm: 104, steps: 4, tracks: [
    T('pulse12', .06, 'D5 . . F5 . G5 . A5 | . . C6 . A5 . G5 . | F5 . . D5 . F5 . G5 | . . A5 . G5 . F5 . | D5 . . F5 . G5 . A5 | . . C6 . D6 . C6 . | A5 . G5 . F5 . E5 . | D5 - - - . . . .'),
    T('triangle', .27, 'D2 . D3 . . D2 . C3 | . D2 . A2 . C3 D3 . | Bb1 . Bb2 . . Bb1 . A2 | . C2 . C3 . A2 C3 .'),
    T('drums', .08, 'k . h . s . h k | . k h . s . h h'),
    HYPE('. . . . . . . . | . . . . c . . .')] },
  swim: { bpm: 128, steps: 4, tracks: [
    T('sine', .09, 'C5 E5 G5 C6 G5 E5 C5 E5 | D5 F5 A5 D6 A5 F5 D5 F5 | E5 G5 B5 E6 B5 G5 E5 G5 | F5 A5 C6 F6 C6 A5 G5 B5'),
    T('square', .045, 'E6 - - - . . D6 . | C6 - - - . . A5 . | B5 - - - . . G5 . | A5 - - - G5 - - -'),
    T('triangle', .25, 'C3 . . C3 . . G2 . | D3 . . D3 . . A2 . | E3 . . E3 . . B2 . | F3 . . F3 . . G2 .'),
    T('drums', .07, 'k . h . s . h . | k . h k s . h .'), HYPE('h h h h h h h h')] },
  diving: { bpm: 90, steps: 4, tracks: [
    T('triangle', .1, 'E5 - - - . . . . | G5 - - - F#5 - - - | E5 - - - . . . . | B4 - - - - - - - | C5 - - - . . . . | E5 - - - D5 - - - | B4 - - - . . . . | E5 - - - - - - -'),
    T('sine', .26, 'E2 . . . E2 . . . | E2 . . . E2 . . . | C2 . . . C2 . . . | B1 . . . B1 . . .'),
    T('drums', .07, 'k . . . . . . . | k . . . . . k k'), HYPE('. . h . . . h . | . . h . . h h h')] },
  archery: { bpm: 80, steps: 4, tracks: [
    T('triangle', .07, 'A4 - - - . . . . | . . . . C5 - B4 - | A4 - - - . . . . | . . . . E4 - - - | F4 - - - . . . . | . . . . A4 - G4 - | E4 - - - - - - - | . . . . . . . .'),
    T('sine', .25, 'A1 . . . . . . . | F1 . . . . . . . | D2 . . . . . . . | E1 . . . . . . .'),
    T('drums', .09, 'k . . k . . . . | k . . k . . . .'), HYPE('h . h . h . h . | h . h . h h h h')] },
  iron: { bpm: 96, steps: 4, tracks: [
    T('saw', .07, 'E2 E2 . E2 G2 . E2 . | A2 . G2 . E2 . D2 . | E2 E2 . E2 G2 . E2 . | B2 . A2 . G2 . A2 .'),
    T('square', .05, 'E4 - - - G4 - A4 - | . . B4 - A4 - G4 - | E4 - - - G4 - A4 - | B4 - D5 - B4 - - -'),
    T('drums', .1, 'k . h . s . h . | k k h . s . h h'), HYPE('. . . . . . . . | c . . . c . . .')] },
  alpine: { bpm: 124, steps: 4, tracks: [
    T('triangle', .09, 'G5 . B5 . D6 . B5 . | C6 . A5 . F#5 . A5 . | G5 . B5 . D6 . G6 . | F#6 . D6 . A5 . . . | E6 . C6 . G5 . C6 . | D6 . B5 . G5 . B5 . | A5 . F#5 . D5 . F#5 . | G5 - - - . . . .'),
    T('square', .04, 'B4 - - - . . . . | A4 - - - . . . . | B4 - - - . . . . | A4 - - - . . . . | C5 - - - . . . . | B4 - - - . . . . | A4 - - - . . . . | G4 - - - . . . .'),
    T('triangle', .24, 'G2 . . D3 . . G2 . | D2 . . A2 . . D2 . | G2 . . D3 . . G2 . | D2 . . A2 . . D2 . | C3 . . G2 . . C3 . | G2 . . D3 . . G2 . | D2 . . A2 . . D2 . | G2 . . D3 . . G2 .'),
    T('drums', .07, 'k . h . s . h . | k . h . s . h k'), HYPE('h h h h h h h h')] },
  yikesface: { bpm: 150, steps: 4, tracks: [
    T('square', .055, 'E5 . E5 . G5 . E5 . | D5 . . . B4 . . . | E5 . E5 . G5 . A5 . | B5 . A5 . G5 . . . | C6 . C6 . B5 . A5 . | G5 . . . E5 . . . | D5 . E5 . G5 . B5 . | E5 - - - . . . .'),
    T('saw', .05, 'E2 E3 E2 E3 E2 E3 E2 E3 | G2 G3 G2 G3 B2 B3 B2 B3 | C3 C4 C3 C4 C3 C4 C3 C4 | D3 D4 D3 D4 B2 B3 B2 B3'),
    T('drums', .09, 'k . h . s . h k | k . h . s . h .'), HYPE('h h h h h h h h | s s s s s s s s')] },
  icesurf: { bpm: 160, steps: 4, tracks: [
    T('pulse', .05, 'A4 A4 A4 A4 C5 C5 C5 C5 | D5 D5 D5 D5 C5 C5 A4 A4 | G4 G4 G4 G4 A4 A4 C5 C5 | E5 E5 D5 D5 C5 C5 A4 A4'),
    T('square', .045, 'E5 - - - . E5 G5 . | A5 - - - G5 - E5 - | D5 - - - . D5 E5 . | A4 - - - . . . .'),
    T('triangle', .26, 'A2 . A2 . A2 . E2 . | D2 . D2 . D2 . A2 . | G2 . G2 . G2 . D2 . | A2 . E2 . A2 . . .'),
    T('drums', .08, 'k h s h k h s h | k h s h k k s s'), HYPE('c . . . c . . .')] },
  waltz: { bpm: 138, steps: 4, len: 0, tracks: [
    T('triangle', .1, 'C5 - - - - - E5 - - - G5 - | A5 - - - - - G5 - - - - - | F5 - - - - - E5 - - - D5 - | G5 - - - - - - - - - - - | C5 - - - - - E5 - - - G5 - | C6 - - - - - B5 - - - A5 - | G5 - - - - - F5 - - - D5 - | C5 - - - - - - - - - - -'),
    T('triangle', .22, 'C3 - - - . . . . . . . . | F2 - - - . . . . . . . . | D3 - - - . . . . . . . . | G2 - - - . . . . . . . . | C3 - - - . . . . . . . . | A2 - - - . . . . . . . . | G2 - - - . . . . . . . . | C3 - - - . . . . . . . .'),
    T('square', .035, '. . . . E4 G4 . . E4 G4 . . | . . . . F4 A4 . . F4 A4 . . | . . . . F4 A4 . . F4 A4 . . | . . . . F4 B4 . . F4 B4 . . | . . . . E4 G4 . . E4 G4 . . | . . . . E4 A4 . . E4 A4 . . | . . . . D4 G4 . . D4 F4 . . | . . . . E4 G4 . . E4 G4 . .'),
    T('drums', .05, 'k . . . h . . . h . . .')] },
  lounge: { bpm: 92, steps: 4, tracks: [
    T('triangle', .08, 'D5 . . F5 . . A5 . C6 . . . A5 . . . | G5 . . Bb5 . . D6 . F6 . . . D6 . . . | C6 . . A5 . . F5 . E5 . . . C5 . . . | F5 . . . E5 . . . D5 - - - . . . .'),
    T('square', .03, 'F4 . . . . . F4 . . . . . . . . . | F4 . . . . . F4 . . . . . . . . . | E4 . . . . . E4 . . . . . . . . . | F4 . . . . . E4 . . . . . . . . .'),
    T('triangle', .24, 'D2 . . . A2 . . . F2 . . . A2 . . . | G2 . . . D3 . . . Bb2 . . . D3 . . . | C3 . . . G2 . . . E2 . . . G2 . . . | F2 . . . C3 . . . D2 . . . A2 . . .'),
    T('drums', .05, 'h . . h . h h . . h . . h . h .'), HYPE('. . . . s . . . . . . . s . s s')] },
  organ: { bpm: 132, steps: 4, tracks: [
    T('square', .06, 'C5 . E5 . G5 . C6 . | . . . . . . . . | C5 . E5 . G5 . C6 . | B5 - A5 - G5 - . . | F5 . A5 . C6 . F6 . | E6 - D6 - C6 - . . | D6 . D6 . D6 . . . | G5 - - - - - . .'),
    T('saw', .04, 'C4 - E4 - G4 - E4 - | C4 - E4 - G4 - E4 - | A3 - C4 - E4 - C4 - | G3 - B3 - D4 - B3 -'),
    T('triangle', .24, 'C2 . . . C2 . . . | A1 . . . A1 . . . | F1 . . . F1 . . . | G1 . . . G1 . . .'),
    T('drums', .08, 'k . . . k . s . | k . k . k . s .'), HYPE('c . c . c c c .')] },
  table: { bpm: 100, steps: 4, tracks: [
    T('square', .06, 'C5 - - - E5 - G5 - | A5 - - - G5 - - - | F5 - - - A5 - C6 - | G5 - - - - - - - | E5 - - - G5 - C6 - | B5 - - - A5 - - - | G5 - F5 - E5 - D5 - | C5 - - - - - - -'),
    T('triangle', .25, 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .'),
    T('drums', .06, 'k . h . s . h . | k . h . s . h h')] },
  closing: { bpm: 112, steps: 4, tracks: [
    T('square', .06, 'G4 - - - C5 - - - E5 - D5 - C5 - - - | A4 - - - D5 - - - F5 - E5 - D5 - - - | B4 - - - E5 - - - G5 - F5 - E5 - - - | C6 - - - B5 - A5 - G5 - - - . . . .'),
    T('saw', .03, 'E4 - - - - - - - G4 - - - - - - - | F4 - - - - - - - A4 - - - - - - - | G4 - - - - - - - B4 - - - - - - - | E5 - - - D5 - C5 - B4 - - - . . . .'),
    T('triangle', .25, 'C3 . . . G2 . . . C3 . . . G2 . . . | D3 . . . A2 . . . D3 . . . A2 . . . | E3 . . . B2 . . . E3 . . . B2 . . . | F2 . . . G2 . . . C3 . . . . . . .'),
    T('drums', .07, 'k . h . s . h . k . h k s . h .')] }
};
O.STINGS = {
  wr: { bpm: 150, steps: 4, loop: false, tracks: [T('square', .1, 'C5 E5 G5 C6 - - E6 - G6 - - - - - - -'), T('triangle', .25, 'C3 - - - G3 - - - C4 - - - - - - -'), T('drums', .1, 'k . s . k . s s c . . . . . . .')] },
  yikes: { bpm: 90, steps: 4, loop: false, tracks: [T('saw', .1, 'G4 - - . F#4 - - . F4 - - . E4 - - - - - - .', { vib: [6, .03] }), T('triangle', .2, 'G2 - - . F#2 - - . F2 - - . E2 - - - - - - .')] },
  laurel: { bpm: 140, steps: 4, loop: false, tracks: [T('triangle', .12, 'E5 G5 C6 - E6 - - -'), T('square', .05, 'C5 E5 G5 - C6 - - -')] },
  fail: { bpm: 100, steps: 4, loop: false, tracks: [T('square', .09, 'E4 - D#4 - D4 - C#4 - - - - .'), T('triangle', .2, 'C3 - B2 - Bb2 - A2 - - - - .')] },
  gameover: { bpm: 80, steps: 4, loop: false, tracks: [T('triangle', .12, 'C5 - - - G4 - - - E4 - - - C4 - - - - - - .'), T('triangle', .2, 'C3 - - - - - - - C2 - - - - - - .')] },
  victory: { bpm: 140, steps: 4, loop: false, tracks: [T('square', .09, 'G4 C5 E5 G5 - - E5 - G5 - - - - - - .'), T('triangle', .22, 'C3 - - - - - G2 - C3 - - - - - - .'), T('drums', .1, 'k . k . s . . . k . s . c . . .')] },
  goal: { bpm: 132, steps: 4, loop: false, tracks: [T('saw', .08, 'C5 - - - C5 - - - E5 - G5 - C6 - - - - - - -'), T('drums', .1, 'k . s . k . s . k k s s c . . . . . . .')] }
};
O.music = (id, o) => { if (O.hubEnded) return; const s = typeof id === 'string' ? O.SONGS[id] : id; if (!s) return A.music(null); if (A.song === s) return; A.music(s, Object.assign({ fade: .4 }, o || {})); };
O.sting = id => { if (O.hubEnded) return; const s = O.STINGS[id]; if (s) A.sting(s, { at: 'now', duck: .35 }); };
O.sfx = (id, o) => { if (O.hubEnded) return; A.sfx(id, o); };

/* ---- O.Voice: Animalese / Simlish gibberish (§9.3) ---- */
const FORM = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870], y: [300, 2000] };
O.VOICES = {
  chip: { base: 140, speed: 1.15, wave: 'sawtooth', formant: 1 },
  vera: { base: 210, speed: .95, wave: 'triangle', formant: 1.15 },
  pa: { base: 120, speed: .8, wave: 'square', formant: 1, echo: true },
  max: { base: 150, speed: 1.25, wave: 'pulse', formant: 1 },
  yikesy: { base: 420, speed: 1.4, wave: 'triangle', formant: 1.5 },
  coach: { base: 170, speed: 1.05, wave: 'triangle', formant: 1.05 }
};
let pulseWave = null;
O.Voice = {
  /** speaks a line; returns its duration in seconds (silent headless or before sound unlocks) */
  speak(text, voice) {
    const v = typeof voice === 'string' ? (O.VOICES[voice] || O.VOICES.chip) : (voice || O.VOICES.chip);
    const syl = String(text).match(/[^aeiouy\s]*[aeiouy]+[^aeiouy\s]*|[.,!?]/gi) || [];
    const excl = /!/.test(text), quest = /\?\s*$/.test(text);
    let t = 0; const plan = [];
    syl.forEach((s, i) => {
      if (s === ',') { t += .12; return; } if (s === '.' || s === '!' || s === '?') { t += .22; return; }
      const vow = (s.match(/[aeiouy]/i) || ['a'])[0].toLowerCase(), h = O.hashStr(s.toLowerCase()) % 7 - 3, last = i >= syl.length - 2;
      const contour = quest && last ? 4 : last ? -2 : 0, semi = h + contour + (excl ? 4 : 0);
      const dur = (.075 + .012 * s.length) / v.speed / (excl ? 1.15 : 1);
      plan.push({ t, dur, f0: v.base * Math.pow(2, semi / 12), vow, cons: /^[^aeiouy]/i.test(s) }); t += dur + .02;
    });
    const total = t;
    if (game.settings.commentary !== 'voices' || !A.ready || !A.ctx || A.muted || O.hubEnded) return total;
    try {
      const c = A.ctx, now = c.currentTime + .02, bus = A._voiceBus || A._sfxBus;
      let out = bus;
      if (v.echo) { const d = c.createDelay(); d.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .3; d.connect(fb); fb.connect(d); d.connect(bus); const mix = c.createGain(); mix.connect(bus); mix.connect(d); out = mix; }
      for (const p of plan) {
        const o = c.createOscillator(), f = FORM[p.vow] || FORM.a, k = v.formant;
        if (v.wave === 'pulse') { if (!pulseWave) { const re = new Float32Array(32), im = new Float32Array(32); for (let n = 1; n < 32; n++) im[n] = Math.sin(Math.PI * n * .12) * 2 / (n * Math.PI); pulseWave = c.createPeriodicWave(re, im); } o.setPeriodicWave(pulseWave); }
        else o.type = v.wave;
        o.frequency.setValueAtTime(p.f0, now + p.t); o.frequency.linearRampToValueAtTime(p.f0 * .944, now + p.t + p.dur);
        const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), gn = c.createGain();
        b1.type = b2.type = 'bandpass'; b1.frequency.value = f[0] * k; b1.Q.value = 6; b2.frequency.value = f[1] * k; b2.Q.value = 9;
        gn.gain.setValueAtTime(0, now + p.t); gn.gain.linearRampToValueAtTime(.55, now + p.t + .005); gn.gain.setValueAtTime(.55, now + p.t + Math.max(.006, p.dur - .025)); gn.gain.linearRampToValueAtTime(0, now + p.t + p.dur);
        o.connect(b1); o.connect(b2); b1.connect(gn); b2.connect(gn); gn.connect(out);
        o.start(now + p.t); o.stop(now + p.t + p.dur + .02);
        if (p.cons && A._noise) { const ns = c.createBufferSource(), hp = c.createBiquadFilter(), ng = c.createGain(); ns.buffer = A._noise; hp.type = 'highpass'; hp.frequency.value = 3000; ng.gain.setValueAtTime(.12, now + p.t); ng.gain.linearRampToValueAtTime(0, now + p.t + .012); ns.connect(hp); hp.connect(ng); ng.connect(out); ns.start(now + p.t, (O.hashStr(p.vow + p.t) % 100) / 200); ns.stop(now + p.t + .015); }
      }
    } catch (e) { game.fail('voice', e); }
    return total;
  }
};

/* ---- the crowd (§9.4): a looping noise bed whose level follows the crowd's excitement ---- */
O.CrowdAudio = {
  node: null, gain: null, filt: null, level: .3,
  ensure() {
    if (this.node || !A.ready || !A.ctx || !A._noise || O.inHub && O.hubEnded) return;
    try { const c = A.ctx; this.node = c.createBufferSource(); this.node.buffer = A._noise; this.node.loop = true; this.filt = c.createBiquadFilter(); this.filt.type = 'bandpass'; this.filt.frequency.value = 900; this.filt.Q.value = .7;
      this.gain = c.createGain(); this.gain.gain.value = 0; this.node.connect(this.filt); this.filt.connect(this.gain); this.gain.connect(A._master); this.node.start(); } catch (e) { this.node = null; }
  },
  update(dt, on) {
    this.ensure(); if (!this.gain) return;
    const target = (on && !game.paused && !O.hubEnded ? (game.settings.crowd || 0) * (.04 + .16 * this.level) : 0);
    const gv = this.gain.gain.value; this.gain.gain.value = gv + (target - gv) * Math.min(1, dt * 4);
    this.filt.frequency.value = 700 + 900 * this.level;
  },
  cheer() { this.level = 1; O.sfx('cheerSwell', { vol: (game.settings.crowd || 0) }); },
  gasp() { O.sfx('gasp', { vol: (game.settings.crowd || 0) }); O.Voice.speak('Ooooh', { base: 160, speed: .6, wave: 'triangle', formant: 1.1 }); }
};

/* ---- anthems (§9.5): deterministic from a nation's seed; two nations never share a melody ---- */
const KEYS = ['C', 'D', 'Eb', 'F', 'G', 'Bb'], NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nn = (semi, oct) => { const s = ((semi % 12) + 12) % 12, o = oct + Math.floor(semi / 12); return NAMES[s] + o; };
O.Anthem = {
  song(nation) {
    const rnd = E.rng(O.hashStr('anthem|' + nation.id)), key = NAMES.indexOf(KEYS[Math.floor(rnd() * KEYS.length)]), bpm = 84 + Math.floor(rnd() * 13);
    const prog = [0, 5, 7, 0, 9, 5, 7, 0], chord = r => r === 9 ? [9, 12, 16] : [r, r + 4, r + 7], scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    const cells = [[8, 4, 4], [6, 2, 8], [4, 4, 4, 4], [4, 4, 8]];
    let lead = [], bass = [], harm = [], drum = [];
    prog.forEach((root, bar) => {
      const cell = bar === 7 ? [16] : cells[Math.floor(rnd() * cells.length)], ch = chord(root); let first = true;
      for (const len of cell) {
        const deg = first ? ch[Math.floor(rnd() * 3)] : scale[Math.floor(rnd() * 7)] + (rnd() < .3 ? 0 : 0); first = false;
        const semi = bar === 7 ? root : deg;
        lead.push(nn(key + semi, 5)); for (let k = 1; k < len; k++) lead.push('-');
      }
      for (let b = 0; b < 4; b++) { bass.push(nn(key + root - 12, 3)); bass.push('-', '-', '-'); harm.push(nn(key + ch[1], 4)); harm.push('-', '-', '.'); }
      for (let s = 0; s < 16; s++) drum.push(s === 0 ? 'k' : bar === 6 && s >= 8 ? 's' : '.');
    });
    return { bpm, steps: 4, loop: false, tracks: [T('saw', .07, lead.join(' ')), T('square', .03, harm.join(' ')), T('triangle', .24, bass.join(' ')), T('drums', .08, drum.join(' '))] };
  },
  play(nation) { const s = this.song(nation); O.music(s, { loop: false, fade: .2 }); return s; }
};
})();
