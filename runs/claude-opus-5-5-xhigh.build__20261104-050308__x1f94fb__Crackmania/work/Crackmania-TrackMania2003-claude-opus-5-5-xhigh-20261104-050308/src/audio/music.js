// CRACKMANIA music (PLAN §8.1): songs in the engine's notation, looping, in layers (the lead joins after the first
// checkpoint), crossfaded between scenes; medal and event stings
import { ctx, E } from '../ctx.js';
const D = (s, n = 4) => Array(n).fill(s).join(' | ');
export const SONGS = {
  title: { name: 'Crack the Clock', bpm: 128, steps: 2, tracks: [
    { wave: 'triangle', vol: .3, name: 'bass', notes: 'A2 A3 . A2 G2 A2 C3 A2 | F2 F3 . F2 E2 F2 A2 F2 | C3 C4 . C3 B2 C3 E3 C3 | G2 G3 . G2 F#2 G2 B2 D3' },
    { wave: 'square', vol: .08, name: 'lead', notes: 'E5 - A5 - G5 E5 D5 C5 | A4 - C5 - D5 - C5 A4 | G4 - C5 - E5 - G5 E5 | D5 - B4 - G4 . B4 D5 | E5 - A5 - G5 E5 D5 E5 | F5 - E5 - D5 - C5 A4 | G4 - C5 - E5 - G5 A5 | B5 - G5 - D5 - . .' },
    { wave: 'pulse', vol: .05, name: 'pad', notes: 'A4 C5 E5 C5 A4 C5 E5 C5 | F4 A4 C5 A4 F4 A4 C5 A4 | C5 E5 G5 E5 C5 E5 G5 E5 | G4 B4 D5 B4 G4 B4 D5 B4' },
    { wave: 'drums', vol: .1, name: 'drums', notes: D('k h s h k k s h', 3) + ' | k h s h k s s c' }] },
  heat: { name: 'Heat Shimmer', bpm: 140, steps: 2, tracks: [
    { wave: 'triangle', vol: .3, name: 'bass', notes: 'E2 . E2 E3 . E2 G2 A2 | E2 . E2 E3 . D3 B2 G2 | A2 . A2 A3 . A2 C3 D3 | B2 . B2 B3 . A2 G2 F#2' },
    { wave: 'pulse12', vol: .08, name: 'lead', on: false, notes: 'B4 - E5 G5 - E5 B4 . | D5 - B4 - A4 - G4 . | A4 - C5 E5 - C5 A4 G4 | F#4 - G4 - A4 - B4 . | B4 - E5 G5 - A5 B5 . | D6 - B5 - A5 - G5 . | E5 - G5 A5 - G5 E5 D5 | E5 - - - . . . .' },
    { wave: 'square', vol: .04, name: 'twang', notes: 'E4 B4 E4 B4 E4 B4 E4 B4 | E4 B4 E4 B4 D4 B4 D4 B4 | A4 E5 A4 E5 A4 E5 A4 E5 | B4 F#5 B4 F#5 B4 F#5 B4 F#5' },
    { wave: 'drums', vol: .1, name: 'drums', notes: 'k h s h k h s k | k h s h k h s h | k h s h k h s k | k h s s k s s c' }] },
  hedge: { name: 'Hedge Fund', bpm: 126, steps: 2, tracks: [
    { wave: 'triangle', vol: .3, name: 'bass', notes: 'G2 G3 G2 G3 G2 G3 G2 G3 | E2 E3 E2 E3 E2 E3 E2 E3 | C3 C4 C3 C4 C3 C4 C3 C4 | D3 D4 D3 D4 D3 D4 F#3 D4' },
    { wave: 'square', vol: .07, name: 'lead', on: false, notes: 'B4 . D5 . G5 . F#5 G5 | E5 . D5 . B4 . G4 . | C5 . E5 . G5 . A5 G5 | F#5 . E5 . D5 . . . | B4 . D5 . G5 . A5 B5 | C6 . B5 . G5 . E5 . | E5 . G5 . C6 . B5 A5 | A5 - - - F#5 - - .' },
    { wave: 'pulse', vol: .05, name: 'chords', notes: '. G4 . B4 . D5 . B4 | . E4 . G4 . B4 . G4 | . C5 . E5 . G5 . E5 | . D5 . F#5 . A5 . F#5' },
    { wave: 'drums', vol: .1, name: 'drums', notes: D('k o s o k o s o', 3) + ' | k o s o k s s c' }] },
  ice: { name: 'Thin Ice', bpm: 136, steps: 4, tracks: [
    { wave: 'saw', vol: .05, name: 'arp', notes: D('A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 C6 A5 E5 C5 A4 E5', 1) + ' | F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 F4 C5 | C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 E6 C6 G5 E5 C5 G5 | G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 B5 G5 D5 B4 G4 D5' },
    { wave: 'sine', vol: .14, name: 'pad', notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - - | G3 - - - - - - - - - - - - - - -' },
    { wave: 'triangle', vol: .26, name: 'bass', notes: D('A2 . . A2 . . A2 . A2 . . A2 . . E3 .', 1) + ' | F2 . . F2 . . F2 . F2 . . F2 . . C3 . | C3 . . C3 . . C3 . C3 . . C3 . . G3 . | G2 . . G2 . . G2 . G2 . . G2 . . D3 .' },
    { wave: 'square', vol: .06, name: 'lead', on: false, notes: 'E5 - - - D5 - C5 - B4 - - - C5 - D5 - | C5 - - - A4 - - - F4 - - - A4 - C5 - | E5 - - - G5 - - - C6 - - - B5 - G5 - | D5 - - - B4 - - - G4 - - - . . . .' },
    { wave: 'drums', vol: .09, name: 'drums', notes: D('k . h . s . h . k . h k s . h h', 3) + ' | k . h . s . h . k k s s s s c .' }] },
  blueprint: { name: 'Blueprint', bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .12, name: 'chords', notes: 'D4 F4 A4 C5 A4 F4 D4 F4 | G3 B3 D4 F4 D4 B3 G3 B3 | C4 E4 G4 B4 G4 E4 C4 E4 | A3 C4 E4 G4 E4 C4 A3 C4' },
    { wave: 'sine', vol: .26, name: 'bass', notes: 'D3 - - . D3 . A2 . | G2 - - . G2 . D3 . | C3 - - . C3 . G2 . | A2 - - . A2 . E3 .' },
    { wave: 'pulse12', vol: .05, name: 'lead', notes: 'A5 - - - G5 - F5 - | . . D5 - - - . . | E5 - - - D5 - C5 - | . . A4 - - - . . | . . . . . . . . | . . . . . . . .' },
    { wave: 'drums', vol: .07, name: 'drums', notes: D('k . h . s . h h', 3) + ' | k . h k s . h .' }] },
  guild: { name: 'Ghost Guild', bpm: 170, steps: 2, tracks: [
    { wave: 'saw', vol: .1, name: 'bass', notes: 'D2 - . D2 . . D2 F2 | D2 - . D2 . . C2 A1 | Bb1 - . Bb1 . . Bb1 D2 | C2 - . C2 . . E2 C2' },
    { wave: 'square', vol: .06, name: 'lead', on: false, notes: 'D5 - - - F5 - E5 D5 | A4 - - - - - . . | Bb4 - - - D5 - C5 Bb4 | C5 - - - E5 - G5 - ' },
    { wave: 'triangle', vol: .1, name: 'stab', notes: '. . D4 . . . F4 . | . . D4 . . . E4 . | . . Bb3 . . . D4 . | . . C4 . . . E4 .' },
    { wave: 'drums', vol: .11, name: 'drums', notes: D('k . . . s . . k | . k . . s . h h', 1) + ' | k . . . s . . k | . k . . s s s c' }] },
  paint: { name: 'Paint Job', bpm: 110, steps: 2, tracks: [
    { wave: 'triangle', vol: .26, name: 'bass', notes: 'F2 A2 C3 E3 D3 C3 A2 G2 | D2 F2 A2 C3 Bb2 A2 F2 E2 | G2 Bb2 D3 F3 E3 D3 Bb2 A2 | C3 E3 G3 Bb3 A3 G3 E3 C3' },
    { wave: 'pulse', vol: .06, name: 'keys', notes: '. A4 . E5 . A4 . E5 | . F4 . C5 . F4 . C5 | . Bb4 . F5 . Bb4 . F5 | . E5 . Bb5 . G5 . E5' },
    { wave: 'square', vol: .06, name: 'lead', notes: 'C6 - A5 - G5 F5 E5 F5 | A5 - - - . . . . | D6 - Bb5 - A5 G5 F5 G5 | Bb5 - A5 - G5 - E5 - ' },
    { wave: 'drums', vol: .07, name: 'drums', notes: D('k h h s h k h s', 4) }] },
  victory: { name: 'Victory Lap', bpm: 120, steps: 2, tracks: [
    { wave: 'triangle', vol: .28, name: 'bass', notes: 'C3 C3 C3 C3 G2 G2 G2 G2 | A2 A2 A2 A2 F2 F2 F2 F2 | C3 C3 C3 C3 G2 G2 G2 G2 | F2 F2 G2 G2 C3 C3 C3 C3' },
    { wave: 'square', vol: .08, name: 'lead', notes: 'E5 - - D5 C5 - G4 - | A4 - C5 - F5 - E5 D5 | E5 - - G5 E5 - C5 - | D5 - E5 - C5 - - - ' },
    { wave: 'pulse', vol: .05, name: 'harm', notes: 'C5 - - B4 G4 - E4 - | F4 - A4 - C5 - C5 B4 | C5 - - E5 C5 - G4 - | B4 - C5 - G4 - - -' },
    { wave: 'drums', vol: .1, name: 'drums', notes: 'k h s h k h s h | k h s h k h s h | k h s h k h s h | k s k s s s c c' }] }
};
export const STINGS = {
  bronze: [{ wave: 'square', freq: 'G4', dur: .15, vol: .15 }, { wave: 'square', freq: 'C5', dur: .15, vol: .15, delay: .15 }, { wave: 'square', freq: 'E5', dur: .4, vol: .15, delay: .3 }],
  silver: [{ wave: 'square', freq: 'C5', dur: .12, vol: .15 }, { wave: 'square', freq: 'E5', dur: .12, vol: .15, delay: .12 }, { wave: 'square', freq: 'G5', dur: .12, vol: .15, delay: .24 }, { wave: 'square', freq: 'C6', dur: .5, vol: .16, delay: .36 }],
  gold: [{ wave: 'square', freq: 'C5', dur: .7, vol: .14, arp: [0, 4, 7, 12, 16, 19, 24], step: .07 }, { wave: 'noise', freq: 6000, dur: .8, vol: .25, filter: 'highpass', delay: .5 }, { wave: 'triangle', freq: 'C4', dur: .9, vol: .25, delay: .5 }],
  author: [{ wave: 'square', freq: 'C5', dur: 1.1, vol: .14, arp: [0, 4, 7, 12, 16, 19, 24, 28, 31, 36], step: .07 }, { wave: 'noise', freq: 6000, dur: 1, vol: .25, filter: 'highpass', delay: .7 }, { wave: 'pulse', freq: 'G5', dur: .8, vol: .1, delay: .7, vib: [6, .03] }],
  record: { wave: 'square', freq: 'E5', dur: .5, vol: .12, arp: [0, 3, 7, 12, 15, 19], step: .06 },
  none: [{ wave: 'triangle', freq: 'E4', dur: .2, vol: .2 }, { wave: 'triangle', freq: 'C4', dur: .4, vol: .2, delay: .2 }]
};
export class Music {
  constructor(game) { this.game = game; this.cur = null; }
  play(name, o = {}) { if (this.game.headless) { this.cur = name; return; } if (this.cur === name && !o.restart) return; this.cur = name; this.game.audio.music(name ? SONGS[name] : null, { fade: o.fade ?? .6 }); }
  race(env, kind) { this.play(kind === 'survival' ? 'guild' : kind === 'puzzle' || kind === 'validate' ? 'blueprint' : { dustbowl: 'heat', hedgerow: 'hedge', frostpeak: 'ice' }[env] || 'heat'); }
  layer(name, v = 1) { if (!this.game.headless) try { this.game.audio.layer(name, v, .8); } catch (e) { /* not this song */ } }
  sting(name) { if (!this.game.headless) this.game.audio.sfx(STINGS[name] || STINGS.none); }
}
