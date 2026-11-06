/* audio.js: everything you hear, written in code. Songs (hold music in a very clean building), sound effects, and voices:
 * Animalese-style gibberish, a sound per letter, through a band-pass filter on the voice bus. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, A = G.A, game = G.game;

/* ---- songs: step notation. Music plays at 10% by default: never raise the tracks to make up for it ---- */
const SONGS = G.SONGS = {
  studio: { bpm: 76, steps: 2, tracks: [
    { name: 'lead', wave: 'sine', vol: .26, vib: [5, .004], notes: 'A4 - C5 - E5 - . . | G4 - B4 - D5 - . . | F4 - A4 - C5 - . . | G4 - A4 - B4 - D5 - | E5 - D5 - C5 - . . | B4 - A4 - G4 - . . | A4 - C5 - F5 - E5 - | D5 - - - . . . .' },
    { name: 'pad', wave: 'triangle', vol: .12, notes: 'C5 E5 A5 E5 C5 E5 A5 E5 | B4 D5 G5 D5 B4 D5 G5 D5 | A4 C5 F5 C5 A4 C5 F5 C5 | B4 D5 G5 D5 B4 D5 F5 D5 | C5 E5 A5 E5 C5 E5 A5 E5 | B4 D5 G5 D5 B4 D5 G5 D5 | A4 C5 F5 C5 A4 C5 F5 C5 | G4 B4 D5 B4 G4 B4 D5 B4' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'F2 - - - C3 - - - | E2 - - - B2 - - - | D2 - - - A2 - - - | G2 - - - D3 - - - | F2 - - - C3 - - - | E2 - - - A2 - - - | D2 - - - F2 - - - | G2 - - - G2 - - -' }] },
  islandAM: { bpm: 96, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .1, gate: .5, notes: 'G5 . E5 . C5 . E5 G5 | A5 . F5 . C5 . . . | G5 . E5 . D5 . C5 D5 | E5 . . . . . . . | A5 . F5 . D5 . F5 A5 | G5 . E5 . C5 . . . | F5 . E5 . D5 . C5 D5 | C5 . . . . . . .' },
    { name: 'pluck', wave: 'triangle', vol: .16, gate: .4, notes: 'C4 E4 G4 E4 C4 E4 G4 E4 | F3 A3 C4 A3 F3 A3 C4 A3 | C4 E4 G4 E4 G3 B3 D4 B3 | C4 E4 G4 E4 C4 E4 G4 E4 | D4 F4 A4 F4 D4 F4 A4 F4 | C4 E4 G4 E4 C4 E4 G4 E4 | F3 A3 C4 A3 G3 B3 D4 B3 | C4 E4 G4 E4 C4 . . .' },
    { name: 'bass', wave: 'sine', vol: .3, notes: 'C3 . . . G2 . . . | F2 . . . C3 . . . | C3 . . . G2 . . . | C3 . . . G2 . . . | D3 . . . A2 . . . | C3 . . . G2 . . . | F2 . . . G2 . . . | C3 . . . . . . .' },
    { name: 'drums', wave: 'drums', vol: .05, notes: 'k . h . h . h . k . h . h . h .' }] },
  islandDusk: { bpm: 72, steps: 2, tracks: [
    { name: 'lead', wave: 'sine', vol: .25, vib: [4, .006], notes: 'E5 - - D5 C5 - A4 - | G4 - - - - - . . | A4 - C5 - E5 - G5 - | F5 - - - E5 - . . | D5 - - C5 A4 - G4 - | E4 - - - - - . . | F4 - A4 - C5 - E5 - | D5 - - - - - . .' },
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | C4 E4 G4 E4 C4 E4 G4 E4 | G3 B3 D4 B3 G3 B3 D4 B3 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | D4 F4 A4 F4 D4 F4 A4 F4 | G3 B3 D4 B3 G3 B3 D4 B3' },
    { name: 'bass', wave: 'sine', vol: .28, notes: 'A2 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | D3 - - - - - - - | G2 - - - - - - -' }] },
  yoga: { bpm: 56, steps: 2, tracks: [
    { name: 'lead', wave: 'sine', vol: .24, vib: [3, .006], notes: 'E5 - - - - - D5 - | C5 - - - - - . . | G4 - - - A4 - - - | B4 - - - - - . . | E5 - - - G5 - - - | F5 - - - - - E5 - | D5 - - - C5 - - - | D5 - - - - - . .' },
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'C4 - G4 - E4 - G4 - | A3 - E4 - C4 - E4 - | F3 - C4 - A3 - C4 - | G3 - D4 - B3 - D4 - | C4 - G4 - E4 - G4 - | A3 - E4 - C4 - E4 - | F3 - C4 - A3 - C4 - | G3 - D4 - B3 - D4 -' },
    { name: 'low', wave: 'sine', vol: .26, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - | C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -' }] },
  iron: { bpm: 88, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, gate: .6, notes: 'D5 . D5 F5 . . A4 . | C5 . C5 E5 . . G4 . | Bb4 . Bb4 D5 . . F4 . | A4 . C5 . E5 . . . | D5 . D5 F5 . . A5 . | G5 . F5 . E5 . C5 . | Bb4 . D5 . F5 . A5 . | A5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'D3 . D3 . A2 . D3 . | C3 . C3 . G2 . C3 . | Bb2 . Bb2 . F2 . Bb2 . | A2 . A2 . E2 . A2 . | D3 . D3 . A2 . D3 . | C3 . C3 . G2 . C3 . | Bb2 . Bb2 . F2 . Bb2 . | A2 . E3 . A2 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . h . s . h . k . h . s . h h' }] },
  stepA: { bpm: 100, steps: 4, loop: false, len: 16 * 32, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, gate: .6, notes: 'C5 . . . E5 . . . G5 . . . E5 . . . | D5 . . . F5 . . . A5 . . . F5 . . . | E5 . . . G5 . . . C6 . . . G5 . . . | D5 . . . B4 . . . G4 . . . . . . .' },
    { name: 'pluck', wave: 'triangle', vol: .13, gate: .5, notes: 'C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 . | D4 . F4 . A4 . F4 . D4 . F4 . A4 . F4 . | E4 . G4 . C5 . G4 . E4 . G4 . C5 . G4 . | G3 . B3 . D4 . B3 . G3 . B3 . D4 . B3 .' },
    { name: 'bass', wave: 'sine', vol: .3, notes: 'C3 . . . C3 . . . G2 . . . C3 . . . | D3 . . . D3 . . . A2 . . . D3 . . . | C3 . . . C3 . . . G2 . . . C3 . . . | G2 . . . G2 . . . D3 . . . G2 . . .' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . h h' }] },
  stepB: { bpm: 120, steps: 4, loop: false, len: 16 * 40, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, gate: .55, notes: 'A5 . . . E5 . . . C5 . . . E5 . A5 . | G5 . . . D5 . . . B4 . . . D5 . G5 . | F5 . . . C5 . . . A4 . . . C5 . F5 . | E5 . . . B4 . . . G#4 . . . B4 . E5 .' },
    { name: 'pluck', wave: 'triangle', vol: .13, gate: .5, notes: 'A3 C4 E4 A4 A3 C4 E4 A4 A3 C4 E4 A4 A3 C4 E4 A4 | G3 B3 D4 G4 G3 B3 D4 G4 G3 B3 D4 G4 G3 B3 D4 G4 | F3 A3 C4 F4 F3 A3 C4 F4 F3 A3 C4 F4 F3 A3 C4 F4 | E3 G#3 B3 E4 E3 G#3 B3 E4 E3 G#3 B3 E4 E3 G#3 B3 E4' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'A2 . A2 . E3 . A2 . A2 . A2 . E3 . A2 . | G2 . G2 . D3 . G2 . G2 . G2 . D3 . G2 . | F2 . F2 . C3 . F2 . F2 . F2 . C3 . F2 . | E2 . E2 . B2 . E2 . E2 . E2 . B2 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . h h' }] },
  jog: { bpm: 126, steps: 2, tracks: [
    { name: 'lead', wave: 'triangle', vol: .17, notes: 'E5 . A5 . F5 . G5 . | C6 . G5 . E5 . . . | D5 . F5 . A5 . D5 . | E5 . B4 . C5 . . . | G5 . E5 . C6 . A5 . | F5 . D5 . G5 . B4 . | C5 . F5 . E5 . D5 . | C5 . . . . . . .' },
    { name: 'bass', wave: 'sine', vol: .3, notes: 'C3 G3 C3 G3 C3 G3 C3 G3 | A2 E3 A2 E3 A2 E3 A2 E3 | F2 C3 F2 C3 F2 C3 F2 C3 | G2 D3 G2 D3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 G3 C3 G3 | A2 E3 A2 E3 A2 E3 A2 E3 | F2 C3 F2 C3 G2 D3 G2 D3 | G2 D3 G2 D3 G2 D3 G2 D3' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k h s h k h s h' }] },
  ski: { bpm: 132, steps: 2, tracks: [
    { name: 'bells', wave: 'sine', vol: .14, gate: .4, notes: 'G5 G5 . G5 G5 . G5 . | E5 E5 . E5 E5 . C5 . | A5 A5 . A5 G5 . E5 . | D5 D5 . D5 D5 . G5 . | G5 G5 . G5 B5 . D6 . | C6 C6 . B5 A5 . G5 . | F5 F5 . E5 D5 . C5 . | G5 . . . . . . .' },
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3 | E4 G4 B4 G4 E4 G4 B4 G4 | A3 C4 E4 C4 A3 C4 E4 C4 | D4 F4 A4 F4 G3 B3 D4 B3 | C4 E4 G4 E4 G3 B3 D4 B3' },
    { name: 'bass', wave: 'sine', vol: .28, notes: 'C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | E3 . B2 . E3 . B2 . | A2 . E3 . A2 . E3 . | D3 . A2 . G2 . D3 . | C3 . G2 . G2 . . .' },
    { name: 'drums', wave: 'drums', vol: .05, notes: 'h h h h h h h h' }] },
  tray: { bpm: 92, steps: 3, tracks: [
    { name: 'lead', wave: 'sine', vol: .22, vib: [5, .005], notes: 'E5 . B5 A5 . . F5 . G5 C5 . . | D5 . E5 B4 . . . . . . . . | D5 . A5 G5 . . B4 . F5 C5 . . | E5 . C5 G5 . . . . . . . . | A5 . E5 C6 . . G5 . D5 F5 . . | B5 . A5 D5 . . G5 . E5 C5 . . | F5 . E5 A4 . . D5 . B4 G5 . . | C5 . . . . . . . . . . .' },
    { name: 'pad', wave: 'triangle', vol: .12, gate: .6, notes: '. . . C4 . E4 . . . C4 . E4 | . . . A3 . C4 . . . A3 . C4 | . . . D4 . F4 . . . D4 . F4 | . . . G3 . B3 . . . G3 . B3 | . . . C4 . E4 . . . C4 . E4 | . . . D4 . F4 . . . G3 . B3 | . . . A3 . C4 . . . G3 . B3 | . . . C4 . E4 . . . C4 . E4' },
    { name: 'bass', wave: 'sine', vol: .28, notes: 'C3 . . . . . G2 . . . . . | A2 . . . . . E3 . . . . . | D3 . . . . . A2 . . . . . | G2 . . . . . D3 . . . . . | C3 . . . . . G2 . . . . . | D3 . . . . . G2 . . . . . | A2 . . . . . G2 . . . . . | C3 . . . . . C3 . . . . .' },
    { name: 'drums', wave: 'drums', vol: .05, notes: 'h . h h . h h . h h . h' }] },
  laundry: { bpm: 104, steps: 2, tracks: [
    { name: 'pizz', wave: 'triangle', vol: .2, gate: .25, notes: 'G4 . B4 . D5 . B4 . | C5 . E5 . G5 . E5 . | A4 . C5 . E5 . C5 . | D5 . F5 . A5 . F5 . | G4 . B4 . D5 . G5 . | E5 . C5 . A4 . C5 . | D5 . E5 . F#5 . A5 . | G5 . D5 . G4 . . .' },
    { name: 'high', wave: 'sine', vol: .12, gate: .3, notes: '. . G5 . . . G5 . | . . E6 . . . C6 . | . . A5 . . . E5 . | . . F5 . . . A5 . | . . G5 . . . B5 . | . . C6 . . . A5 . | . . D6 . . . C6 . | B5 . . . . . . .' },
    { name: 'bass', wave: 'triangle', vol: .28, gate: .35, notes: 'G2 . . . D3 . . . | C3 . . . G3 . . . | A2 . . . E3 . . . | D3 . . . A2 . . . | G2 . . . D3 . . . | C3 . . . A2 . . . | D3 . . . D3 . . . | G2 . . . G2 . . .' }] },
  festival: { bpm: 116, steps: 2, tracks: [
    { name: 'brass', wave: 'pulse', vol: .1, gate: .7, notes: 'C5 . C5 E5 G5 . . . | A5 . G5 . E5 . . . | F5 . F5 A5 C6 . . . | B5 . A5 . G5 . . . | E5 . E5 G5 C6 . . . | D6 . C6 . A5 . . . | G5 . F5 . E5 . D5 . | C5 . . . G4 . . .' },
    { name: 'pluck', wave: 'triangle', vol: .13, gate: .5, notes: 'C4 G4 E4 G4 C4 G4 E4 G4 | F3 C4 A3 C4 F3 C4 A3 C4 | F3 C4 A3 C4 F3 C4 A3 C4 | G3 D4 B3 D4 G3 D4 B3 D4 | A3 E4 C4 E4 A3 E4 C4 E4 | F3 C4 A3 C4 F3 C4 A3 C4 | G3 D4 B3 D4 G3 D4 B3 D4 | C4 G4 E4 G4 C4 G4 E4 G4' },
    { name: 'bass', wave: 'sine', vol: .3, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k h s h k h s h k h s h k k s h' }] },
  raft: { bpm: 60, steps: 2, tracks: [
    { name: 'lead', wave: 'sine', vol: .22, vib: [3, .008], notes: 'A4 - - - E5 - - - | D5 - - - C5 - - - | B4 - - - G4 - - - | A4 - - - - - - - | C5 - - - G5 - - - | F5 - - - E5 - - - | D5 - - - B4 - - - | C5 - - - - - - -' },
    { name: 'pad', wave: 'triangle', vol: .12, notes: 'A3 E4 A4 E4 A3 E4 A4 E4 | F3 C4 F4 C4 F3 C4 F4 C4 | G3 D4 G4 D4 G3 D4 G4 D4 | A3 E4 A4 E4 A3 E4 A4 E4 | C4 G4 C5 G4 C4 G4 C5 G4 | F3 C4 F4 C4 F3 C4 F4 C4 | G3 D4 G4 D4 G3 D4 G4 D4 | C4 G4 C5 G4 C4 G4 C5 G4' },
    { name: 'low', wave: 'sine', vol: .26, notes: 'A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | C3 - - - - - - - | F2 - - - - - - - | G2 - - - - - - - | C3 - - - - - - -' }] },
  ending: { bpm: 66, steps: 2, tracks: [
    { name: 'lead', wave: 'sine', vol: .25, vib: [4, .005], notes: 'G5 - - E5 C5 - - - | A5 - - F5 C5 - - - | G5 - E5 - D5 - C5 - | D5 - - - - - - - | E5 - - C5 G4 - - - | F5 - - D5 A4 - - - | E5 - D5 - C5 - B4 - | C5 - - - - - - -' },
    { name: 'pad', wave: 'triangle', vol: .13, notes: 'C4 E4 G4 C5 G4 E4 C4 E4 | F3 A3 C4 F4 C4 A3 F3 A3 | C4 E4 G4 C5 G4 E4 C4 E4 | G3 B3 D4 G4 D4 B3 G3 B3 | A3 C4 E4 A4 E4 C4 A3 C4 | D4 F4 A4 D5 A4 F4 D4 F4 | G3 B3 D4 G4 D4 B3 G3 B3 | C4 E4 G4 C5 G4 E4 C4 E4' },
    { name: 'bass', wave: 'sine', vol: .28, notes: 'C3 - - - - - - - | F2 - - - - - - - | C3 - - - - - - - | G2 - - - - - - - | A2 - - - - - - - | D3 - - - - - - - | G2 - - - - - - - | C3 - - - - - - -' }] }
};
const JINGLES = G.JINGLES = {
  star1: { bpm: 180, steps: 2, loop: false, len: 8, tracks: [{ wave: 'sine', vol: .3, notes: 'C5 E5 G5 - . . . .' }] },
  star2: { bpm: 180, steps: 2, loop: false, len: 10, tracks: [{ wave: 'sine', vol: .3, notes: 'C5 E5 G5 C6 - - . . . .' }, { wave: 'triangle', vol: .15, notes: 'C4 . . E4 . . . . . .' }] },
  star3: { bpm: 180, steps: 2, loop: false, len: 14, tracks: [{ wave: 'sine', vol: .3, notes: 'C5 E5 G5 C6 E6 G6 - - - . . . . .' }, { wave: 'triangle', vol: .16, notes: 'C4 . E4 . G4 . C5 - - . . . . .' }] },
  unlock: { bpm: 160, steps: 2, loop: false, len: 12, tracks: [{ wave: 'pulse', vol: .14, notes: 'G5 . G5 E6 - - D6 C6 - - . .' }, { wave: 'sine', vol: .2, notes: 'C4 . . G4 . . C5 . . . . .' }] },
  daydone: { bpm: 96, steps: 2, loop: false, len: 16, tracks: [{ wave: 'sine', vol: .28, notes: 'E5 - D5 - C5 - G4 - A4 - B4 - C5 - - -' }, { wave: 'triangle', vol: .16, notes: 'C4 - - - F3 - - - G3 - - - C4 - - -' }] }
};

let current = null;
/** play a song by name (null stops). The same song keeps playing */
G.music = (name, o = {}) => {
  if (name === current && !o.restart) return;
  current = name;
  if (!name) { A.music(null); return; }
  A.music(SONGS[name], Object.assign({ fade: .6 }, o));
};
G.musicNow = () => current;
G.musicClaim = name => { current = name; };
G.sting = (name) => { if (JINGLES[name]) A.sting(JINGLES[name]); };

/* ---- sound effects ---- */
const def = (n, v) => A.define(n, v);
def('tareBoop', { wave: 'sine', freq: 'E5', dur: .22, vol: .32, arp: [0, 7], step: .1 });
def('tareHop', { wave: 'sine', freq: 300, to: 560, dur: .07, vol: .2 });
def('tareSad', { wave: 'sine', freq: 'B4', dur: .3, vol: .22, arp: [0, -3], step: .14 });
def('creak', [{ wave: 'saw', freq: 96, to: 128, dur: .2, vol: .05, vib: [34, .24] }, { wave: 'triangle', freq: 210, to: 170, dur: .16, vol: .05 }]);
def('stumble', [{ wave: 'noise', freq: 300, to: 90, dur: .22, vol: .22 }, { wave: 'sine', freq: 150, to: 60, dur: .22, vol: .32 }]);
def('clink', [{ wave: 'triangle', freq: 2350, to: 2100, dur: .07, vol: .16 }, { wave: 'sine', freq: 3500, dur: .05, vol: .08 }]);
def('gull', [{ wave: 'saw', freq: 1320, to: 860, dur: .16, vol: .05, vib: [24, .05] }, { wave: 'saw', freq: 1200, to: 700, dur: .24, vol: .04, vib: [24, .05] }]);
def('pigeon', { wave: 'noise', freq: 1400, to: 900, dur: .24, vol: .1, vib: [34, .5] });
def('flick', { wave: 'noise', freq: 2400, to: 1300, dur: .09, vol: .07 });
def('trayClink', [{ wave: 'triangle', freq: 1650, to: 1500, dur: .05, vol: .12 }, { wave: 'sine', freq: 2600, dur: .03, vol: .05 }]);
def('plop', [{ wave: 'sine', freq: 340, to: 900, dur: .1, vol: .28 }, { wave: 'sine', freq: 1200, to: 640, dur: .08, vol: .1 }]);
def('rope', { wave: 'saw', freq: 130, to: 190, dur: .16, vol: .035, vib: [28, .2] });
def('stamp', [{ wave: 'noise', freq: 200, to: 80, dur: .1, vol: .22 }, { wave: 'sine', freq: 200, to: 90, dur: .12, vol: .3 }]);
def('tick', { wave: 'sine', freq: 820, dur: .035, vol: .1 });
def('ok', { wave: 'sine', freq: 'E5', dur: .16, vol: .18, arp: [0, 5], step: .07 });
def('back', { wave: 'sine', freq: 'A4', dur: .14, vol: .14, arp: [0, -4], step: .06 });
def('click', { wave: 'triangle', freq: 1040, dur: .03, vol: .18 });
def('clickUp', { wave: 'triangle', freq: 1560, dur: .03, vol: .22 });
def('hit', { wave: 'sine', freq: 1046, to: 1320, dur: .06, vol: .12 });
def('miss', { wave: 'sine', freq: 180, to: 130, dur: .1, vol: .1 });
def('cup', { wave: 'sine', freq: 'A5', dur: .14, vol: .18, arp: [0, 7], step: .05 });
def('whoosh2', { wave: 'noise', freq: 900, to: 300, dur: .5, vol: .1 });
def('wind', { wave: 'noise', freq: 500, to: 1300, dur: .7, vol: .08 });
def('thud', { wave: 'sine', freq: 130, to: 50, dur: .14, vol: .34 });
def('catch', { wave: 'sine', freq: 'G5', dur: .12, vol: .2, arp: [0, 4, 7], step: .03 });
def('drop', { wave: 'triangle', freq: 500, to: 180, dur: .22, vol: .14 });
def('firework', [{ wave: 'noise', freq: 900, to: 200, dur: .5, vol: .1 }, { wave: 'sine', freq: 90, to: 50, dur: .24, vol: .24 }]);
def('goose', [{ wave: 'saw', freq: 420, to: 340, dur: .12, vol: .08 }, { wave: 'saw', freq: 480, to: 300, dur: .22, vol: .08 }]);
def('blender', { wave: 'saw', freq: 170, to: 240, dur: .8, vol: .035, vib: [60, .1] });
def('carve', { wave: 'noise', freq: 700, to: 700, dur: 1, vol: .06 });
def('conga', { wave: 'triangle', freq: 180, to: 120, dur: .08, vol: .2 });

/** the in-ring chime: climbs with the streak */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
G.chime = (level, vol = .09) => { const n = SCALE[Math.min(SCALE.length - 1, level)]; A.sfx({ wave: 'sine', freq: 523.25 * Math.pow(2, n / 12), dur: .22, vol }); A.sfx({ wave: 'sine', freq: 1046.5 * Math.pow(2, n / 12), dur: .1, vol: vol * .3 }); };

/* ---- a continuous tone or whirr of our own on the sfx bus: the Eyes Closed tone, the hoop's whirr ---- */
class Tone {
  constructor(o = {}) { this.o = o; this.on = false; }
  start() {
    const ctx = A.ctx; if (!ctx || this.on) return this; const bus = A.bus('sfx'); if (!bus) return this;
    this.osc = ctx.createOscillator(); this.osc.type = this.o.wave || 'sine'; this.osc.frequency.value = this.o.freq || 330;
    this.gain = ctx.createGain(); this.gain.gain.value = 0;
    this.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.osc.connect(this.gain); if (this.pan) { this.gain.connect(this.pan); this.pan.connect(bus); } else this.gain.connect(bus);
    this.osc.start(); this.on = true; return this;
  }
  set(o) {
    if (!this.on) { this.start(); if (!this.on) return; }
    const t = A.ctx.currentTime;
    if (o.freq !== undefined) this.osc.frequency.setTargetAtTime(o.freq, t, .03);
    if (o.vol !== undefined) this.gain.gain.setTargetAtTime(game.paused ? 0 : o.vol, t, .04);
    if (o.pan !== undefined && this.pan) this.pan.pan.setTargetAtTime(E.clamp(o.pan, -1, 1), t, .04);
  }
  stop() { if (!this.on) return; try { this.gain.gain.setTargetAtTime(0, A.ctx.currentTime, .05); this.osc.stop(A.ctx.currentTime + .25); } catch (e) { /* already stopped */ } this.on = false; }
}
G.Tone = Tone;

/* ---- voices: Animalese-style gibberish ---- */
G.SPEAKERS = {
  tare: { base: 620, speed: 1, wave: 'sine', vib: 0, band: 1900, len: .065 },
  birch: { base: 118, speed: .75, wave: 'triangle', vib: 0, band: 620, len: .09 },
  alder: { base: 300, speed: .95, wave: 'triangle', vib: 2, band: 1100, len: .075 },
  gertrude: { base: 330, speed: .8, wave: 'sine', vib: 9, band: 1000, len: .09 },
  dennis: { base: 165, speed: .85, wave: 'triangle', vib: 0, band: 700, len: .08 },
  marisol: { base: 390, speed: 1.3, wave: 'triangle', vib: 0, band: 1500, len: .06 },
  kevin: { base: 210, speed: 1, wave: 'triangle', vib: 1, band: 900, len: .07 },
  okafor: { base: 140, speed: 1.05, wave: 'triangle', vib: 3, band: 800, len: .08 },
  lou: { base: 96, speed: .6, wave: 'sine', vib: 0, band: 520, len: .09 },
  twins: { base: 260, speed: 1, wave: 'sine', vib: 0, band: 1200, len: .07 },
  member: { base: 240, speed: 1, wave: 'triangle', vib: 0, band: 1000, len: .07 }
};
const LETTER = {}; 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => { LETTER[c] = (i * 7) % 12 - 5; });
const VOWELS = 'aeiouy';
const speakerOf = name => { const k = String(name || 'tare').toLowerCase(); if (k.startsWith('mr')) return 'okafor'; if (k.startsWith('young')) return 'kevin'; if (k.startsWith('the t')) return 'twins'; return G.SPEAKERS[k] ? k : 'tare'; };
/** make one letter's sound into any audio context: a short oscillator through a band-pass filter */
G.babbleInto = (ctx, dest, when, name, ch) => {
  const c = String(ch).toLowerCase(); if (!(c in LETTER)) return false;
  const s = G.SPEAKERS[speakerOf(name)], vowel = VOWELS.includes(c), semi = LETTER[c] * (vowel ? 1 : .6), f = s.base * Math.pow(2, semi / 12) * (vowel ? 1 : 1.12);
  const dur = s.len * (vowel ? 1.25 : .85), o = ctx.createOscillator(), b = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = s.wave; o.frequency.setValueAtTime(f, when); o.frequency.linearRampToValueAtTime(f * (vowel ? 1.06 : .94), when + dur);
  if (s.vib) { o.frequency.setValueAtTime(f * (1 + (LETTER[c] % 2 ? 1 : -1) * s.vib * .004), when + dur * .5); }
  b.type = 'bandpass'; b.frequency.value = s.band * (vowel ? 1.2 : .8); b.Q.value = vowel ? 1.2 : 2.2;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vowel ? .5 : .32, when + .008); g.gain.exponentialRampToValueAtTime(.001, when + dur);
  o.connect(b); b.connect(g); g.connect(dest); o.start(when); o.stop(when + dur + .01);
  return true;
};
G.babble = (name, ch) => { const ctx = A.ctx; if (!ctx) return false; const bus = A.bus('voice'); if (!bus) return false; try { return G.babbleInto(ctx, bus, ctx.currentTime, name, ch); } catch (e) { return false; } };
/** an exercise grunt: the same function */
G.grunt = name => { G.babble(name || 'member', 'u'); game.after(.07, () => G.babble(name || 'member', 'h')); };
/** a word of gibberish on the beat: the instructor counts */
G.say1 = (name, word) => { for (let i = 0; i < word.length; i++) game.after(i * .07, () => G.babble(name, word[i])); };

/* ---- the shared dialog box: bright, with the voices ---- */
G.talk = new E.Dialog(game, { voice: (ch, i, talk) => { if (i % 2 === 0) G.babble(talk.name, ch); }, bg: ['#ffffff', '#eaf6f8'], border: '#2cc6e6', color: '#20404c', nameColor: '#14a8c8', speed: 42, lines: 2 });
G.talk.shadow = null;
const PORTRAITS = {};
/** the speaker's say: who can be 'Tare', 'Birch', 'Alder', a regular's key */
G.say = (who, text, o = {}) => {
  const lines = Array.isArray(text) ? text : [text];
  const name = who === 'tare' ? 'Tare' : (G.DATA.lines[who] && G.DATA.lines[who].name) || (G.DATA.lines.regulars[who] && G.DATA.lines.regulars[who].name) || who;
  const portrait = o.portrait !== undefined ? o.portrait : who === 'tare' ? G.tarePortrait(() => o.face || G.tareFace) : portraitOf(who);
  G.talk.say(lines, Object.assign({ name, portrait, modal: true }, o));
};
function portraitOf(who) {
  if (who === 'birch' || who === 'alder') { if (!PORTRAITS[who]) PORTRAITS[who] = G.instructorRig(who, 1); return PORTRAITS[who]; }
  const map = { twins: 'twin1' }, id = map[who] || who;
  if (G.REGULAR_IDS.includes(id)) { if (!PORTRAITS[id]) PORTRAITS[id] = G.regularRig(id, 1); return PORTRAITS[id]; }
  return undefined;
}
/** a line during play: it turns itself and play goes on */
G.mutter = (who, text, o = {}) => { if (G.attractOn && !o.attract) return; const t = String(text); G.say(who, t, Object.assign({ modal: false, auto: Math.max(2, t.length / 22), place: 'top', y: 32, alpha: .94, portraitSize: 24 }, o)); };
})();
