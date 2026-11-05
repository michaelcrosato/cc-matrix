// Audio, all from code: the songs (original; every theme quotes the leitmotif "The Golden Thread"), jingles, sound
// effects on the engine's chip voices, an Animalese-style formant voice for every speaker (a syllable per letter), and
// the music director (region, time of day, town level layers, siege, bosses).
(() => {
const DQ = globalThis.DQ, E = DQ.E;
// ---------------------------------------------------------------- composing helpers
const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ALIAS = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
const midi = n => { const m = n.match(/^([A-G][b#]?)(-?\d)$/); if (!m) return null; const nm = ALIAS[m[1]] || m[1]; return NOTES.indexOf(nm) + (+m[2] + 1) * 12; };
const name = k => NOTES[((k % 12) + 12) % 12] + (Math.floor(k / 12) - 1);
const tr = (s, d) => s.split(/\s+/).map(t => { const k = midi(t); return k === null ? t : name(k + d); }).join(' ');
const hold = (notes, d) => notes.split(/\s+/).filter(Boolean).map(t => t + ' -'.repeat(Math.max(0, d - 1))).join(' ');
const rep = (s, n) => Array(n).fill(s).join(' ');
const dr = (s, n) => rep(s, n);
// the leitmotif in B-flat, one token per quarter (steps: 2 doubles it with holds)
const LEIT = 'F4 Bb4 C5 D5 Eb5 - D5 C5 Bb4 - G4 C5 A4 - - - F4 Bb4 C5 D5 F5 - Eb5 D5 C5 Bb4 A4 C5 Bb4 - - -';
const LEIT_BASS = 'Bb2 Bb2 F2 F2 Eb2 Eb2 Bb2 Bb2 G2 G2 D2 D2 F2 F2 C2 C2 Bb2 Bb2 F2 F2 D2 D2 F2 F2 Eb2 Eb2 F2 F2 Bb2 Bb2 F2 F2';
const SONGS = DQ.SONGS = {};
SONGS.title = { bpm: 116, steps: 2, tracks: [
  { wave: 'square', vol: .13, notes: 'Bb4 - D5 - F5 - - - F5 Eb5 D5 Eb5 F5 - - - ' + hold(LEIT, 2) },
  { wave: 'pulse', vol: .07, notes: 'D4 - F4 - Bb4 - - - A4 G4 F4 G4 A4 - - - ' + hold(tr(LEIT, -4), 2) },
  { wave: 'triangle', vol: .2, notes: 'Bb2 - Bb2 - Bb2 - - - F2 - F2 - F2 - - - ' + hold(LEIT_BASS, 1) },
  { wave: 'drums', vol: .16, notes: dr('k . h . s . h h', 18) } ] };
SONGS.lullaby = { bpm: 72, steps: 2, tracks: [
  { wave: 'sine', vol: .16, notes: hold(tr(LEIT, 0), 3).split(' ').slice(0, 96).join(' ') },
  { wave: 'triangle', vol: .12, notes: rep('Bb2 - - F3 - - D3 - -', 4) + ' ' + rep('Eb2 - - Bb2 - - G2 - -', 4) + ' ' + rep('F2 - - C3 - - A2 - -', 2) + ' ' + rep('Bb2 - - F3 - - D3 - -', 2) } ] };
SONGS.hollow = { bpm: 88, steps: 4, tracks: [
  { wave: 'pulse', vol: .08, notes: rep('D4 . A4 . F4 . A4 . C5 . A4 . F4 . A4 .', 2) + ' ' + rep('C4 . G4 . E4 . G4 . Bb4 . G4 . E4 . G4 .', 2) },
  { wave: 'triangle', vol: .16, notes: rep('D2 - - - - - - - . . . . A2 - - -', 2) + ' ' + rep('C2 - - - - - - - . . . . G2 - - -', 2) },
  { wave: 'sine', vol: .06, notes: rep('. . . . . . . . . . . . F5 - E5 D5', 2) + ' ' + rep('. . . . . . . . . . . . E5 - D5 C5', 2) } ] };
// the town waltz in F (3/4): base melody, then strings (Lv2), bells (Lv3), drums (Lv4)
const TOWN_MEL = 'C5 - - A4 - Bb4 C5 - - F5 - - E5 - D5 C5 - - Bb4 - - G4 - A4 Bb4 - - D5 - - C5 - Bb4 A4 - - F4 - - A4 - C5 F5 - - E5 - - D5 - C5 Bb4 - A4 G4 - - C5 - - F4 - - - - -';
SONGS.town = { bpm: 96, steps: 2, tracks: [
  { wave: 'pulse', vol: .1, notes: TOWN_MEL },
  { wave: 'triangle', vol: .18, notes: rep('F2 - C3 - A2 -', 4) + ' ' + rep('Bb2 - F3 - D3 -', 2) + ' ' + rep('C3 - G3 - E3 -', 2) + ' ' + rep('F2 - C3 - A2 -', 2) + ' ' + rep('Bb2 - F3 - D3 -', 1) + ' ' + rep('C3 - G3 - E3 -', 1) + ' ' + rep('F2 - C3 - A2 -', 2) },
  { name: 'strings', on: false, wave: 'saw', vol: .045, notes: rep('A3 - - - - -', 4) + ' ' + rep('Bb3 - - - - -', 2) + ' ' + rep('G3 - - - - -', 2) + ' ' + rep('A3 - - - - -', 2) + ' Bb3 - - - - - G3 - - - - - ' + rep('A3 - - - - -', 2) },
  { name: 'bells', on: false, wave: 'sine', vol: .07, notes: rep('. . F6 . . .', 4) + ' ' + rep('. . D6 . . .', 2) + ' ' + rep('. . E6 . . .', 2) + ' ' + rep('. . C6 . . .', 2) + ' . . D6 . . . . . E6 . . . ' + rep('. . F6 . . .', 2) },
  { name: 'drums', on: false, wave: 'drums', vol: .12, notes: dr('k . h . h .', 16) } ] };
SONGS.night = { bpm: 72, steps: 2, tracks: [
  { wave: 'triangle', vol: .12, notes: hold('E4 A4 B4 C5 D5 - C5 B4 A4 - F4 B4 G#4 - - - E4 A4 B4 C5 E5 - D5 C5 B4 A4 G#4 B4 A4 - - -', 2) },
  { wave: 'sine', vol: .1, notes: hold('A2 A2 E2 E2 D2 D2 A2 A2 F2 F2 C2 C2 E2 E2 B1 B1 A2 A2 E2 E2 C2 C2 E2 E2 D2 D2 E2 E2 A2 A2 E2 E2', 2) } ] };
SONGS.glen = { bpm: 112, steps: 2, tracks: [
  { wave: 'pulse', vol: .1, notes: tr('D5 - F#5 E5 D5 - A4 - B4 - D5 - A4 - - - G4 - B4 A4 G4 - E4 - F#4 - A4 - D5 - - - D5 - F#5 E5 D5 - A5 - G5 - F#5 E5 D5 - B4 - G4 B4 D5 G5 F#5 - E5 - D5 - - - - - . .', 0) },
  { wave: 'triangle', vol: .18, notes: rep('D3 - A2 - F#2 - A2 -', 2) + ' ' + rep('G2 - D3 - B2 - D3 -', 2) + ' ' + rep('D3 - A2 - F#2 - A2 -', 2) + ' ' + rep('G2 - D3 - A2 - E3 -', 2) },
  { wave: 'drums', vol: .1, notes: dr('k . h . s . h .', 8) } ] };
SONGS.crags = { bpm: 92, steps: 2, tracks: [
  { wave: 'saw', vol: .06, notes: rep('E2 - - - - - - - - - - - - - - -', 2) + ' ' + rep('C2 - - - - - - - D2 - - - - - - -', 1) + ' ' + rep('E2 - - - - - - - - - - - - - - -', 1) },
  { wave: 'pulse', vol: .08, notes: hold('B4 E5 F#5 G5 A5 - G5 F#5 E5 - B4 D5 C5 - - - B4 E5 F#5 G5 B5 - A5 G5 F#5 E5 D5 F#5 E5 - - -', 2) },
  { wave: 'drums', vol: .1, notes: dr('k . . c . h c .', 8) } ] };
SONGS.tweedwood = { bpm: 100, steps: 3, tracks: [
  { wave: 'pulse12', vol: .1, notes: 'D5 - B4 G4 - B4 D5 - G5 F#5 - E5 D5 - B4 C5 - A4 F#4 - A4 C5 - E5 D5 - C5 B4 - - D5 - B4 G4 - B4 D5 - G5 B5 - A5 G5 - E5 F#5 - A5 G5 - - - - - . . .' },
  { wave: 'triangle', vol: .16, notes: rep('G2 - - D3 - -', 2) + ' ' + rep('E2 - - B2 - -', 2) + ' ' + rep('C3 - - G2 - -', 2) + ' ' + rep('D3 - - A2 - -', 2) + ' ' + rep('G2 - - D3 - -', 2) + ' ' + rep('E2 - - B2 - -', 2) + ' ' + rep('C3 - - D3 - -', 2) + ' ' + rep('G2 - - D3 - -', 2) },
  { wave: 'drums', vol: .07, notes: dr('k . h h . h', 16) } ] };
SONGS.fraying = { bpm: 66, steps: 2, tracks: [
  { wave: 'pulse', vol: .07, notes: hold('E4 F4 E4 - B3 C4 B3 - E4 F4 G4 F4 E4 - - - E4 F4 E4 - Bb3 B3 C4 B3 A3 - G#3 - E3 - - -', 2) },
  { wave: 'pulse', vol: .05, notes: hold('E4 F4 E4 - B3 C4 B3 - E4 F4 G4 F4 E4 - - - E4 F4 E4 - Bb3 B3 C4 B3 A3 - G#3 - E3 - - -', 2).split(' ').map(t => t === '-' ? t : tr(t, 1)).join(' ') },
  { wave: 'saw', vol: .05, notes: rep('E2 - - - - - - - - - - - - - - -', 4) },
  { wave: 'drums', vol: .07, notes: dr('k . . . . . o . . . . . . . . .', 4) } ] };
SONGS.siege = { bpm: 150, steps: 2, tracks: [
  { wave: 'square', vol: .1, notes: hold('C5 Eb5 G5 F5 Eb5 D5 C5 G4 C5 Eb5 G5 Bb5 Ab5 G5 F5 Eb5 D5 F5 Ab5 G5 F5 Eb5 D5 B4 C5 D5 Eb5 F5 G5 - - -', 2) },
  { wave: 'triangle', vol: .2, notes: rep('C2 C3 C2 C3 C2 C3 C2 C3', 2) + ' ' + rep('Ab1 Ab2 Ab1 Ab2 Bb1 Bb2 Bb1 Bb2', 1) + ' ' + rep('G1 G2 G1 G2 G1 G2 B1 B2', 1) + ' ' + rep('C2 C3 C2 C3 C2 C3 C2 C3', 2) + ' ' + rep('F1 F2 F1 F2 G1 G2 G1 G2', 2) },
  { wave: 'drums', vol: .16, notes: dr('k h s h k k s h', 8) } ] };
SONGS.miniboss = { bpm: 140, steps: 2, tracks: [
  { wave: 'square', vol: .1, notes: hold('F4 . F4 . Ab4 - C5 - Db5 - C5 - Bb4 - Ab4 - G4 . G4 . Bb4 - Db5 - C5 - - - - - . .', 1) + ' ' + hold('F4 . F4 . Ab4 - C5 - F5 - Eb5 - Db5 - C5 - Bb4 - C5 - Db5 - Bb4 - F4 - - - - - . .', 1) },
  { wave: 'triangle', vol: .2, notes: rep('F2 - C3 - F2 - C3 -', 2) + ' ' + rep('C2 - G2 - C2 - G2 -', 2) + ' ' + rep('Db2 - Ab2 - Db2 - Ab2 -', 2) + ' ' + rep('C2 - G2 - F2 - C3 -', 2) },
  { wave: 'drums', vol: .15, notes: dr('k . s . k k s .', 8) } ] };
// Gnarlgrim: the leitmotif inverted, in G minor
SONGS.boss = { bpm: 160, steps: 2, tracks: [
  { wave: 'saw', vol: .08, notes: hold('D5 A4 G4 F4 Eb4 - F4 G4 A4 - C5 G4 Bb4 - - - D5 A4 G4 F4 D4 - Eb4 F4 G4 A4 Bb4 G4 A4 - - -', 2) },
  { wave: 'triangle', vol: .2, notes: rep('G2 G2 D2 D2 G2 G2 Bb2 A2', 4) },
  { wave: 'drums', vol: .16, notes: dr('k h s h k h s s', 8) },
  { name: 'fury', on: false, wave: 'square', vol: .06, notes: rep('G5 D5 Bb4 D5', 16) } ] };
SONGS.bee = { bpm: 128, steps: 2, tracks: [
  { wave: 'pulse', vol: .1, notes: 'C5 - E5 G5 - E5 C5 - D5 - F5 A5 - F5 D5 - E5 - G5 C6 - B5 A5 G5 F5 - E5 D5 - - . . C5 - E5 G5 - E5 C5 - A4 - C5 F5 - E5 D5 - G4 - B4 D5 - F5 E5 D5 C5 - - - - - . .' },
  { wave: 'triangle', vol: .18, notes: rep('C3 G2 C3 G2', 2) + ' ' + rep('D3 A2 D3 A2', 2) + ' ' + rep('E3 B2 G2 B2', 2) + ' ' + rep('F2 C3 G2 D3', 2) + ' ' + rep('C3 G2 C3 G2', 2) + ' ' + rep('F2 C3 F2 C3', 2) + ' ' + rep('G2 D3 G2 D3', 2) + ' ' + rep('C3 G2 C3 G2', 2) },
  { wave: 'drums', vol: .11, notes: dr('k . h . s . h .', 8) },
  { name: 'raid', on: false, wave: 'square', vol: .06, notes: rep('C4 . C4 . Eb4 . C4 .', 8) } ] };
SONGS.finale = { bpm: 108, steps: 2, tracks: [
  { wave: 'square', vol: .12, notes: hold(LEIT, 2) + ' ' + hold('F5 - - - Bb5 - - - A5 G5 F5 D5 Bb5 - - -', 2) },
  { wave: 'pulse', vol: .07, notes: hold(tr(LEIT, -12), 2) + ' ' + hold('D4 - - - F4 - - - F4 Eb4 D4 Bb3 D4 - - -', 2) },
  { wave: 'triangle', vol: .2, notes: hold(LEIT_BASS, 1) + ' ' + rep('Bb2 F2 Bb2 F2', 2) + ' ' + rep('F2 C3 Bb2 F2', 2) },
  { wave: 'drums', vol: .13, notes: dr('k . h . s . h .', 12) } ] };
// jingles (loop: false)
const J = DQ.JINGLES = {};
J.notion = { bpm: 200, steps: 2, loop: false, tracks: [{ wave: 'triangle', vol: .16, notes: 'C5 E5 G5 B5 D6 E6 - -' }, { wave: 'sine', vol: .1, notes: 'G5 B5 D6 F#6 A6 B6 - -' }] };
J.room = { bpm: 150, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .14, notes: 'Bb4 . Bb4 . Bb4 D5 F5 - - . Eb5 - D5 - Bb5 - - - - -' }, { wave: 'triangle', vol: .2, notes: 'Bb2 . Bb2 . Bb2 F2 Bb2 - - . Eb2 - F2 - Bb2 - - - - -' }, { wave: 'drums', vol: .14, notes: 'k . s . s s k . . . s . s . k . . . . .' }] };
J.level = { bpm: 140, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .14, notes: 'F4 Bb4 C5 D5 Eb5 - D5 C5 F5 - - - Bb5 - - - - - - -' }, { wave: 'pulse', vol: .08, notes: 'D4 F4 A4 Bb4 C5 - Bb4 A4 C5 - - - D5 - - - - - - -' }, { wave: 'triangle', vol: .2, notes: 'Bb2 - - - Eb2 - - - F2 - - - Bb2 - - - - - - -' }] };
J.quest = { bpm: 150, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .13, notes: 'C5 E5 G5 C6 - . G5 C6 - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 - G2 - C3 . G2 C3 - - - -' }] };
J.item = { bpm: 180, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .12, notes: 'G5 A5 B5 D6 - - -' }] };
J.arrive = { bpm: 140, steps: 2, loop: false, tracks: [{ wave: 'pulse', vol: .12, notes: 'C5 - E5 D5 C5 - G5 - - - E5 - C6 - - -' }, { wave: 'triangle', vol: .18, notes: 'C3 - - - G2 - - - C3 - - - C3 - - -' }] };
J.night = { bpm: 90, steps: 2, loop: false, tracks: [{ wave: 'triangle', vol: .14, notes: 'E5 - D5 - C5 - A4 - - - - -' }, { wave: 'sine', vol: .1, notes: 'A3 - - - F3 - - - E3 - - -' }] };
J.morning = { bpm: 180, steps: 2, loop: false, tracks: [{ wave: 'pulse', vol: .12, notes: 'G5 . G5 B5 D6 - . G6 - - -' }] };
J.undone = { bpm: 80, steps: 2, loop: false, tracks: [{ wave: 'triangle', vol: .15, notes: 'D5 - C5 - Bb4 - A4 - G4 - - - - -' }, { wave: 'sine', vol: .1, notes: 'G3 - - - Eb3 - - - D3 - - - - -' }] };
J.wave = { bpm: 160, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .13, notes: 'G4 C5 E5 G5 - . E5 G5 - -' }] };
J.victory = { bpm: 140, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .14, notes: 'Bb4 . Bb4 . Bb4 . Bb4 - Gb4 - Ab4 - Bb4 . Ab4 Bb4 - - - - -' }, { wave: 'triangle', vol: .2, notes: 'Bb2 . Bb2 . Bb2 . Bb2 - Gb2 - Ab2 - Bb2 . F2 Bb2 - - - - -' }] };
J.zzz = { bpm: 70, steps: 2, loop: false, tracks: [{ wave: 'sine', vol: .14, notes: 'F5 - D5 - Bb4 - F4 - - - - -' }] };
J.dread = { bpm: 60, steps: 2, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'E2 - - - F2 - - - E2 - - - - - - -' }, { wave: 'pulse', vol: .06, notes: 'B3 - - - C4 - - - B3 - - - - - - -' }] };

// ---------------------------------------------------------------- sound effects (engine voices)
const SFX = {
  hitSoft: [{ wave: 'noise', freq: 900, filter: 'lowpass', dur: .06, vol: .25 }, { wave: 'triangle', freq: 180, to: 120, dur: .06, vol: .2 }],
  hitHard: [{ wave: 'noise', freq: 900, filter: 'lowpass', dur: .07, vol: .25 }, { wave: 'triangle', freq: 160, to: 100, dur: .07, vol: .2 }, { wave: 'noise', freq: 2000, dur: .03, vol: .15 }],
  clink: { wave: 'pulse', freq: 1800, to: 2200, dur: .05, vol: .18 },
  rip: [{ wave: 'noise', freq: 2500, to: 700, dur: .16, vol: .3, q: 2 }, { wave: 'sine', freq: 600, to: 200, dur: .04, vol: .2, delay: .15 }],
  stitch: [{ wave: 'pulse12', freq: 880, to: 1320, dur: .04, vol: .14 }, { wave: 'noise', freq: 3000, dur: .02, vol: .08 }],
  crumble: [{ wave: 'noise', freq: 600, to: 200, dur: .25, vol: .3, filter: 'lowpass' }],
  swing: { wave: 'noise', freq: 1200, to: 3000, dur: .1, vol: .14, q: .8 },
  spinCharge: { wave: 'triangle', freq: 300, to: 900, dur: .5, vol: .14 },
  spinRelease: [{ wave: 'noise', freq: 800, to: 3200, dur: .3, vol: .22 }, { wave: 'square', freq: 440, to: 880, dur: .2, vol: .1 }],
  land: { wave: 'noise', freq: 400, filter: 'lowpass', dur: .08, vol: .2 },
  step_soft: { wave: 'noise', freq: 700, filter: 'lowpass', dur: .04, vol: .12 }, step_stone: { wave: 'noise', freq: 2500, dur: .02, vol: .12 }, step_wood: { wave: 'triangle', freq: 220, to: 160, dur: .04, vol: .14 },
  step_sand: { wave: 'noise', freq: 4000, filter: 'highpass', dur: .05, vol: .08 }, step_water: { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .14 },
  pickup: { wave: 'square', freq: 'C6', arp: [0, 4, 7], step: .03, dur: .09, vol: .1 },
  craft: [{ wave: 'triangle', freq: 300, dur: .05, vol: .2 }, { wave: 'triangle', freq: 300, dur: .05, vol: .2, delay: .12 }, { wave: 'sine', freq: 'E6', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .1, delay: .24 }],
  eat: [{ wave: 'noise', freq: 800, dur: .05, vol: .15 }, { wave: 'noise', freq: 800, dur: .05, vol: .15, delay: .25 }, { wave: 'noise', freq: 800, dur: .05, vol: .15, delay: .5 }],
  zipper: { wave: 'noise', freq: 1500, to: 5000, dur: .25, vol: .1, q: 4 },
  uiMove: { wave: 'square', freq: 'A5', dur: .03, vol: .06 }, uiConfirm: { wave: 'square', freq: 'E6', arp: [0, 7], step: .04, dur: .08, vol: .08 }, uiCancel: { wave: 'square', freq: 'E5', to: 'A4', dur: .08, vol: .07 }, uiTick: { wave: 'square', freq: 'C6', dur: .02, vol: .05 },
  doorOpen: { wave: 'saw', freq: 300, to: 520, dur: .2, vol: .06 }, doorClose: [{ wave: 'saw', freq: 480, to: 260, dur: .15, vol: .06 }, { wave: 'noise', freq: 500, filter: 'lowpass', dur: .05, vol: .15, delay: .14 }],
  portal: [{ wave: 'sine', freq: 300, to: 1200, dur: .5, vol: .12, vib: [12, .08] }, { wave: 'triangle', freq: 600, to: 200, dur: .5, vol: .08 }],
  bubble: [{ wave: 'sine', freq: 'E6', dur: .08, vol: .14 }, { wave: 'sine', freq: 'B6', dur: .12, vol: .12, delay: .08 }], bubbleUp: { wave: 'sine', freq: 600, to: 1200, dur: .15, vol: .06 },
  trap: { wave: 'noise', freq: 4000, dur: .04, vol: .12 },
  ballistaFire: [{ wave: 'triangle', freq: 120, to: 60, dur: .15, vol: .3 }, { wave: 'noise', freq: 1500, to: 500, dur: .2, vol: .2 }], ballistaReload: [{ wave: 'square', freq: 400, dur: .03, vol: .1 }, { wave: 'square', freq: 300, dur: .03, vol: .1, delay: .15 }],
  monsterHurt: { wave: 'square', freq: 900, to: 500, dur: .08, vol: .1 }, hurtLow: { wave: 'saw', freq: 140, to: 90, dur: .12, vol: .14 }, hurtBoss: [{ wave: 'saw', freq: 110, to: 70, dur: .18, vol: .16 }, { wave: 'noise', freq: 600, dur: .1, vol: .12 }],
  monsterDie: [{ wave: 'sine', freq: 800, to: 200, dur: .15, vol: .16 }, { wave: 'noise', freq: 2000, to: 400, dur: .15, vol: .12 }],
  builderHurt: [{ wave: 'square', freq: 400, to: 200, dur: .12, vol: .12 }, { wave: 'noise', freq: 1200, dur: .06, vol: .14 }], npcHurt: { wave: 'square', freq: 600, to: 350, dur: .1, vol: .08 },
  heartbeat: [{ wave: 'sine', freq: 60, dur: .1, vol: .25 }, { wave: 'sine', freq: 55, dur: .1, vol: .2, delay: .18 }],
  slam: [{ wave: 'triangle', freq: 90, to: 40, dur: .35, vol: .35 }, { wave: 'noise', freq: 300, filter: 'lowpass', dur: .4, vol: .3 }],
  roar: [{ wave: 'saw', freq: 90, to: 60, dur: .8, vol: .22, vib: [9, .1] }, { wave: 'noise', freq: 400, to: 200, dur: .8, vol: .18 }],
  flutter: { wave: 'noise', freq: 600, dur: .12, vol: .08, vib: [30, .5] }, rollStart: { wave: 'noise', freq: 1200, to: 400, dur: .3, vol: .12 }, boing: { wave: 'square', freq: 300, to: 700, dur: .1, vol: .08 },
  bonk: [{ wave: 'triangle', freq: 500, to: 200, dur: .1, vol: .2 }, { wave: 'sine', freq: 'C6', arp: [0, 5, 0], step: .06, dur: .2, vol: .06 }], thump: { wave: 'triangle', freq: 120, to: 60, dur: .15, vol: .3 },
  tangle: [{ wave: 'saw', freq: 600, to: 150, dur: .4, vol: .12 }, { wave: 'sine', freq: 'G5', arp: [0, 3, 7, 12], step: .06, dur: .3, vol: .1 }], stagger: { wave: 'square', freq: 200, to: 100, dur: .2, vol: .12 },
  warHorn: [{ wave: 'saw', freq: 'Bb2', dur: .7, vol: .12, hold: true }, { wave: 'saw', freq: 'F3', dur: .7, vol: .08, hold: true }],
  thwack: { wave: 'noise', freq: 1000, dur: .06, vol: .18 }, tok: { wave: 'triangle', freq: 520, dur: .04, vol: .12 }, thunk: { wave: 'triangle', freq: 160, to: 110, dur: .07, vol: .2 }, poof: { wave: 'noise', freq: 2000, to: 500, dur: .2, vol: .1 },
  rustle: { wave: 'noise', freq: 3500, dur: .12, vol: .1, q: .7 }, drop: { wave: 'triangle', freq: 400, to: 200, dur: .06, vol: .12 }, equip: [{ wave: 'noise', freq: 3000, dur: .04, vol: .12 }, { wave: 'square', freq: 'A5', arp: [0, 7], step: .04, dur: .08, vol: .06 }],
  heartpatch: { wave: 'sine', freq: 'C5', arp: [0, 4, 7, 12, 16], step: .06, dur: .4, vol: .12 }, comeUndone: { wave: 'triangle', freq: 600, to: 150, dur: .8, vol: .15 },
  unravel: { wave: 'noise', freq: 3000, to: 300, dur: .6, vol: .14 }, unravelBig: [{ wave: 'noise', freq: 3000, to: 200, dur: 1.4, vol: .2 }, { wave: 'saw', freq: 200, to: 40, dur: 1.4, vol: .14 }], plunge: [{ wave: 'noise', freq: 600, filter: 'lowpass', dur: .2, vol: .25 }, { wave: 'sine', freq: 'C5', arp: [0, 4, 7], step: .08, dur: .3, vol: .1, delay: .2 }],
  questStep: { wave: 'sine', freq: 'G5', arp: [0, 5], step: .06, dur: .14, vol: .08 }, windup_blob: { wave: 'square', freq: 200, to: 400, dur: .25, vol: .06 }, windup_heavy: { wave: 'saw', freq: 80, to: 160, dur: .4, vol: .1 },
  squeakHi: { wave: 'square', freq: 1400, to: 1800, dur: .06, vol: .07 }, snort: { wave: 'noise', freq: 500, dur: .1, vol: .12 }, hiss: { wave: 'noise', freq: 5000, filter: 'highpass', dur: .2, vol: .08 }, grunt: { wave: 'saw', freq: 110, to: 80, dur: .15, vol: .12 },
  throw: { wave: 'noise', freq: 1500, to: 2500, dur: .08, vol: .1 }, rumble: { wave: 'noise', freq: 200, filter: 'lowpass', dur: 1, vol: .3 }, monsterHit: { wave: 'noise', freq: 800, dur: .06, vol: .15 }, whoosh: { wave: 'noise', freq: 800, to: 2400, dur: .18, vol: .08 }
};

// ---------------------------------------------------------------- Animalese voices
const VOW = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 800], y: [300, 2300] };
const AX = DQ.AudioX = {
  ready: false, current: null, lastVoice: 0, wanted: null,
  init(game) {
    const A = game.audio; if (this.ready) return;
    for (const k in SFX) A.define(k, SFX[k]);
    this.ready = true;
  },
  sfx(name, o) { const g = DQ.game; if (!g || !g.audio || g.headless) return; try { g.audio.sfx(name, o); } catch (e) { /* no sound */ } },
  music(id, o = {}) { const g = DQ.game; this.wanted = id; if (!g || g.headless) { this.current = id; return; } if (id === this.current && !o.restart) return; this.current = id; try { if (!id) g.audio.music(null, { fade: o.fade === undefined ? 1 : o.fade }); else g.audio.music(SONGS[id], { fade: o.fade === undefined ? 1 : o.fade }); if (id === 'town' && DQ.ctx && DQ.ctx.town) this.townLayers(DQ.ctx.town.level); } catch (e) { /* no sound */ } },
  layer(name, v) { const g = DQ.game; if (!g || g.headless) return; try { g.audio.layer(name, v, 1); } catch (e) { /* not this song */ } },
  townLayers(lv) { if (this.current !== 'town') return; this.layer('strings', lv >= 2 ? 1 : 0); this.layer('bells', lv >= 3 ? 1 : 0); this.layer('drums', lv >= 4 ? 1 : 0); },
  jingle(id) { const g = DQ.game; if (!id || !J[id] || !g || g.headless) return; try { g.audio.sting(J[id], { at: 'beat', duck: .35 }); } catch (e) { /* no sound */ } },
  /** pick the song for where the builder is and what is happening */
  director(ctx, force) {
    if (!ctx || !ctx.builder) return; let want;
    const reg = ctx.clock.region || DQ.regionAt(ctx.builder.cx, ctx.builder.cy, ctx);
    if (ctx.siege && ctx.siege.active) want = ctx.siege.phase === 'boss' ? 'boss' : 'siege';
    else if (ctx.bosses && ctx.bosses.active() && ctx.bosses.active().kind === 'buttonGolem') want = 'miniboss';
    else if (ctx.cutscene && (ctx.cutscene.name === 'wake')) want = 'lullaby';
    else if (ctx.cutscene && ctx.cutscene.name === 'finale') want = 'finale';
    else if (ctx.flags.chapterClear && ctx.cutscene) want = 'finale';
    else if (reg && reg.music === 'fraying') want = 'fraying';
    else if (ctx.clock.isNight) want = 'night';
    else want = reg ? reg.music : 'glen';
    if (ctx.mode === 'bee') want = 'bee';
    if (want !== this.current || force) this.music(want);
  },
  /** one syllable for a letter a speaker says (the Builder is silent) */
  voice(who, ch, i, text) {
    const g = DQ.game; if (!g || g.headless || who === 'builder') return; const A = g.audio; if (!A || A.failed || !A.ctx || A.muted) return;
    if (!ch || ch === ' ' || ch === '\n') return;
    const c = A.ctx, now = c.currentTime; if (now - this.lastVoice < .045) return; this.lastVoice = now;
    const P = DQ.VOICES[who] || DQ.VOICES.sign, l = ch.toLowerCase();
    if (!this.bus) { this.bus = c.createGain(); this.bus.connect(A._master); }
    this.bus.gain.value = g.settings.voices === undefined ? .8 : g.settings.voices;
    const pause = /[.,!?;:]/.test(ch); if (pause) { this.lastVoice = now + .06; return; }
    // the vowel: this letter if a vowel, else the next one in the word
    let v = 'a'; for (let k = i; k < Math.min(text.length, i + 4); k++) { const q = text[k].toLowerCase(); if (VOW[q]) { v = q; break; } if (q === ' ') break; }
    const h = DQ.h01(ch.charCodeAt(0), i, DQ.hashStr(who) & 1023), wordStart = i === 0 || text[i - 1] === ' ', caps = ch !== l && /[A-Z]/.test(ch) && i > 0 && text[i - 1] !== ' ' && text[i - 1] !== '.';
    const rise = text.slice(i).trimEnd().endsWith('?') && text.length - i < 4 ? 1.2 : 1, fall = 1 - .06 * (i / Math.max(1, text.length));
    const f0 = P.pitch * (1 + (h - .5) * P.range) * (wordStart ? 1.08 : 1) * fall * rise * (caps ? 1.15 : 1) * (P.bounce && i % 2 ? 1.1 : 1);
    const dur = .055 + (1 - (P.speed || 1)) * .02, vol = .16 * (caps ? 1.15 : 1);
    const out = c.createGain(); out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(vol, now + .008); out.gain.exponentialRampToValueAtTime(.001, now + dur); out.connect(this.bus);
    const osc = c.createOscillator();
    if (P.wave === 'pulse' || P.wave === 'pulse12') osc.setPeriodicWave(A._pulse(P.wave === 'pulse' ? .25 : .125)); else osc.type = P.wave === 'saw' ? 'sawtooth' : P.wave || 'triangle';
    osc.frequency.setValueAtTime(f0 * (P.chirp ? .85 : 1), now); if (P.chirp) osc.frequency.linearRampToValueAtTime(f0 * 1.1, now + dur);
    if (P.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = P.vib[0]; lg.gain.value = f0 * P.vib[1]; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(now); lfo.stop(now + dur + .02); }
    const fk = P.formant || 1, [F1, F2] = VOW[v];
    for (const [F, Q, gn] of [[F1 * fk, 6, 1], [F2 * fk, 9, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = Q; const gg = c.createGain(); gg.gain.value = gn * 3; osc.connect(bp); bp.connect(gg); gg.connect(out); }
    if (P.drive) { const ws = c.createWaveShaper(), cu = new Float32Array(256); for (let k = 0; k < 256; k++) { const x = k / 128 - 1; cu[k] = Math.tanh(x * 3); } ws.curve = cu; osc.connect(ws); const wg = c.createGain(); wg.gain.value = .15; ws.connect(wg); wg.connect(out); }
    osc.start(now); osc.stop(now + dur + .02);
    // the consonant: a hiss, a click or a soft onset
    if (!VOW[l] && A._noise) {
      const n = c.createBufferSource(); n.buffer = A._noise; const f = c.createBiquadFilter(), ng = c.createGain();
      const hiss = 'szcx'.includes(l), click = 'tdkgpbq'.includes(l);
      f.type = hiss ? 'highpass' : click ? 'bandpass' : 'lowpass'; f.frequency.value = hiss ? 4000 : click ? 1500 : 600;
      const nd = hiss ? .018 : click ? .008 : .02; ng.gain.setValueAtTime(hiss ? .08 : click ? .12 : .05, now); ng.gain.exponentialRampToValueAtTime(.001, now + nd);
      n.connect(f); f.connect(ng); ng.connect(this.bus); n.start(now, DQ.h01(i, 3) * .5); n.stop(now + nd + .01);
    }
    if (P.echo) { const d = c.createDelay(); d.delayTime.value = .18; const eg = c.createGain(); eg.gain.value = .35; out.connect(d); d.connect(eg); eg.connect(this.bus); }
  }
};
DQ.sfx = (name, o) => AX.sfx(name, o);
})();
