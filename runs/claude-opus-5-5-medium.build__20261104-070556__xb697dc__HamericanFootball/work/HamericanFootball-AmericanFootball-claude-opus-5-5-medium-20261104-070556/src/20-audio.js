/* AUDIO, all in code: original songs (written as chord progressions, bass rhythms, drum grooves and hand-written lead
 * lines), every sound effect (audio.define), the crowd bed and chants on the 'crowd' bus, and the babble voice synth for
 * Animalese (letter-driven: the story cast, refs, mascots) and Simlish (syllables from a gibberish bank: the announcers,
 * the crowd), on the 'voices' bus (engine change E6). Headless, nothing is scheduled: the synth returns its plan. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game, A = game.audio;
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = m => NOTES[m % 12] + Math.floor(m / 12 - 1);
const midi = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); const i = NOTES.indexOf(m[1]) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return i + (+m[3] + 1) * 12; };
const CH = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus: [0, 5, 7], 5: [0, 7, 12] };
const chord = c => { const m = /^([A-G][#b]?)(m7|m|7|sus|5)?$/.exec(c); return { root: midi(m[1] + '3'), iv: CH[m[2] || ''] }; };
/** a bass line from chords: pattern of steps per bar ('R' root, 'F' fifth, 'O' octave, '.' rest, '-' hold) */
function bass(chords, pat, oct = 0) { return chords.map(c => { const k = chord(c); return pat.split('').map(p => p === 'R' ? name(k.root + oct - 12) : p === 'F' ? name(k.root + 7 + oct - 12) : p === 'O' ? name(k.root + oct) : p === '3' ? name(k.root + k.iv[1] + oct - 12) : p).join(' '); }).join(' | '); }
function arp(chords, steps = 16, oct = 12, order = [0, 1, 2, 1]) { return chords.map(c => { const k = chord(c), o = []; for (let i = 0; i < steps; i++) { const j = order[i % order.length]; o.push(name(k.root + oct + (k.iv[j % k.iv.length] || 0) + (j >= k.iv.length ? 12 : 0))); } return o.join(' '); }).join(' | '); }
function pads(chords, oct = 12) { return chords.map(c => { const k = chord(c); return [name(k.root + oct + k.iv[1]), '-', '-', '-', '-', '-', '-', '-', name(k.root + oct + k.iv[2]), '-', '-', '-', '-', '-', '-', '.'].join(' '); }).join(' | '); }
const rep = (s, n) => Array(n).fill(s).join(' | ');

const SONGS = FF.SONGS = {
  ANTHEM: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .1, notes: 'E5 - . E5 G5 - E5 . D5 - C5 - D5 - . . | C5 - . C5 E5 - C5 . A4 - G4 - A4 - . . | F4 - A4 - C5 - F5 - E5 - D5 - C5 - D5 - | E5 - - - G5 - - - E5 - D5 - C5 - - - | E5 - . E5 G5 - E5 . D5 - C5 - D5 - . . | C5 - . C5 E5 - C5 . A4 - G4 - A4 - . . | F4 - A4 - C5 - F5 - G5 - F5 - E5 - D5 - | C5 - - - - - - - . . . . . . . .' },
    { name: 'bass', wave: 'saw', vol: .09, notes: bass(['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'], 'R.R.RFR.R.R.OFR.') },
    { name: 'arp', wave: 'pulse', vol: .04, notes: arp(['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C']) },
    { name: 'drums', wave: 'drums', vol: .16, notes: rep('k . h . s . h k k . h . s . h h', 8) }] },
  LOCKER: { bpm: 110, steps: 4, tracks: [
    { wave: 'pulse12', vol: .11, notes: bass(['Em7', 'Em7', 'Am7', 'B7'], 'R.RO.R.FR.R.O3F.') },
    { wave: 'square', vol: .05, notes: '. . . . G4 . . A4 . B4 . . . . . . | . . . . G4 . . A4 . B4 . D5 . B4 . . | . . . . C5 . . B4 . A4 . . . . . . | . . . . D#5 . . F#5 . B4 . . . . . .' },
    { wave: 'drums', vol: .15, notes: rep('k . h h s . h k . k h h s . h h', 4) }] },
  HUDDLE: { bpm: 120, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'A2 . A2 . A2 . A2 A2 | A2 . A2 . C3 . D3 E3' },
    { wave: 'drums', vol: .2, notes: 's s s . s . s s s . s s s . s s | k . s s k . s s k s s s k s s s' }] },
  DUST_DEVIL: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .08, notes: 'A4 - . C5 . A4 . E4 - - G4 - A4 - . . | A4 - . C5 . D5 . E5 - - D5 - C5 - . . | G4 - . G4 . B4 . D5 - - C5 - B4 - . . | A4 - - - E4 - - - A4 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: bass(['Am', 'Am', 'G', 'Am'], 'R..F..R.R..F..O.') },
    { name: 'drums', wave: 'drums', vol: .14, notes: rep('k . . h s . . h k . k h s . . h', 4) },
    { name: 'hot', wave: 'saw', vol: .05, on: false, notes: arp(['Am', 'Am', 'G', 'Am'], 16, 12, [0, 2, 1, 2]) },
    { name: 'redzone', wave: 'square', vol: .06, on: false, notes: bass(['Am', 'Am', 'G', 'Am'], 'O.O.O.O.O.O.O.O.', 12) }] },
  SWAMP_STOMP: { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .09, notes: 'E4 . G4 A4 . A#4 B4 . . . D5 . B4 . . . | A4 . G4 . E4 . . . D4 . E4 . . . . . | E4 . G4 A4 . A#4 B4 . . . D5 . E5 . . . | D5 . B4 . A4 . G4 . E4 - - - . . . .' },
    { name: 'bass', wave: 'saw', vol: .1, notes: bass(['E7', 'A7', 'E7', 'B7'], 'R.3.F.O.R.3.F.O.') },
    { name: 'drums', wave: 'drums', vol: .15, notes: rep('k . . s . k s . k . . s . k s .', 4) },
    { name: 'hot', wave: 'square', vol: .05, on: false, notes: arp(['E7', 'A7', 'E7', 'B7'], 16, 12) },
    { name: 'redzone', wave: 'triangle', vol: .2, on: false, notes: bass(['E7', 'A7', 'E7', 'B7'], 'R.R.R.R.R.R.R.R.', 12) }] },
  NEON_NIGHT: { bpm: 118, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .07, notes: 'D5 - - - F5 - E5 - D5 - C5 - A4 - - - | . . A4 - C5 - D5 - E5 - - - D5 - - - | F5 - - - E5 - D5 - C5 - A#4 - A4 - - - | A4 - - - - - - - . . . . . . . .' },
    { name: 'arp', wave: 'saw', vol: .045, notes: arp(['Dm', 'A#', 'C', 'A'], 16, 12, [0, 1, 2, 3]) },
    { name: 'bass', wave: 'saw', vol: .1, notes: bass(['Dm', 'A#', 'C', 'A'], 'R.RR.RR.R.RR.RO.') },
    { name: 'drums', wave: 'drums', vol: .15, notes: rep('k . h . s . h . k . h k s . h .', 4) },
    { name: 'hot', wave: 'pulse', vol: .05, on: false, notes: arp(['Dm', 'A#', 'C', 'A'], 16, 24) },
    { name: 'redzone', wave: 'square', vol: .05, on: false, notes: bass(['Dm', 'A#', 'C', 'A'], 'OOOOOOOOOOOOOOOO', 12) }] },
  FROSTBITE: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .2, notes: 'G5 - - - E5 - - - D5 - C5 - D5 - - - | E5 - - - C5 - - - A4 - - - - - - - | F5 - - - E5 - - - D5 - - - G4 - - - | C5 - - - - - - - . . . . . . . .' },
    { name: 'arp', wave: 'sine', vol: .12, notes: arp(['C', 'Am', 'F', 'G'], 16, 24, [0, 1, 2, 3]) },
    { name: 'bass', wave: 'triangle', vol: .25, notes: bass(['C', 'Am', 'F', 'G'], 'R...F...R...O...') },
    { name: 'drums', wave: 'drums', vol: .1, notes: rep('k . . . h . . . s . . . h . . .', 4) },
    { name: 'hot', wave: 'pulse', vol: .05, on: false, notes: arp(['C', 'Am', 'F', 'G'], 16, 12) },
    { name: 'redzone', wave: 'square', vol: .05, on: false, notes: bass(['C', 'Am', 'F', 'G'], 'O.O.O.O.O.O.O.O.', 12) }] },
  MEGA_DOME: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .08, notes: 'C5 - - G4 C5 - E5 - G5 - - - E5 - C5 - | F5 - - E5 D5 - C5 - D5 - - - G4 - - - | C5 - - G4 C5 - E5 - G5 - - - C6 - B5 - | A5 - G5 - F5 - E5 - D5 - - - C5 - - -' },
    { name: 'brass', wave: 'square', vol: .05, notes: pads(['C', 'F', 'C', 'G']) },
    { name: 'brass2', wave: 'square', vol: .04, notes: pads(['C', 'F', 'C', 'G'], 19) },
    { name: 'bass', wave: 'saw', vol: .1, notes: bass(['C', 'F', 'C', 'G'], 'R.RRF.FFR.RRO.OO') },
    { name: 'drums', wave: 'drums', vol: .17, notes: rep('k . s . k k s . k . s . k k s s', 4) },
    { name: 'hot', wave: 'saw', vol: .05, on: false, notes: arp(['C', 'F', 'C', 'G'], 16, 24) },
    { name: 'redzone', wave: 'triangle', vol: .2, on: false, notes: bass(['C', 'F', 'C', 'G'], 'RRRRRRRRRRRRRRRR', 12) }] },
  HALFTIME: { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 - . G4 C5 - . E5 G5 - - - E5 - . . | F5 - . D5 E5 - . C5 D5 - - - . . . . | G4 - . G4 C5 - . E5 G5 - - - A5 - . . | G5 - F5 - E5 - D5 - C5 - - - . . . .' },
    { wave: 'triangle', vol: .25, notes: bass(['C', 'G', 'C', 'G'], 'R...F...R...F...') },
    { wave: 'drums', vol: .18, notes: rep('k . s s k . s s k . s s s s s s', 4) }] },
  ATTRACT: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .09, notes: 'E5 . E5 G5 . E5 D5 . C5 . D5 . E5 . . . | C5 . C5 E5 . C5 A4 . G4 . A4 . C5 . . . | F5 . F5 A5 . F5 E5 . D5 . E5 . F5 . . . | G5 . G5 G5 . E5 D5 . C5 . . . . . . .' },
    { wave: 'saw', vol: .09, notes: bass(['C', 'Am', 'F', 'G'], 'ROROROROROROROFO') },
    { wave: 'pulse', vol: .04, notes: arp(['C', 'Am', 'F', 'G'], 16, 24, [0, 2, 1, 2]) },
    { wave: 'drums', vol: .17, notes: rep('k h s h k k s h k h s h k s s s', 4) }] },
  FOREVER: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .25, notes: 'E5 - - - - - G5 - E5 - D5 - C5 - - - | C5 - - - - - E5 - C5 - A4 - G4 - - - | F4 - A4 - C5 - F5 - E5 - D5 - C5 - D5 - | C5 - - - - - - - - - - - . . . .' },
    { wave: 'sine', vol: .14, notes: arp(['C', 'Am', 'F', 'C'], 16, 12, [0, 1, 2, 1]) },
    { wave: 'triangle', vol: .2, notes: bass(['C', 'Am', 'F', 'C'], 'R.......F.......') }] }
};
SONGS.STING_TD = { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - - - - .' }, { wave: 'saw', vol: .08, notes: 'C4 . C4 . C4 C4 E4 . G4 - - - - - - .' }, { wave: 'drums', vol: .2, notes: 'k s k s k k s s k . . . c . . .' }] };
SONGS.STING_FD = { bpm: 160, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .08, vib: [6, .01], notes: 'G4 C5 E5 G5 - . E5 G5 - - . .' }, { wave: 'triangle', vol: .2, notes: 'C3 . . . . . G2 C3 - - . .' }] };
SONGS.STING_DEF = { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .08, notes: 'C4 . C4 . . . C4 . C4 . . . A#3 - C4 -' }, { wave: 'drums', vol: .2, notes: 'k . k . s . k . k . s . k k s .' }] };
SONGS.STING_WIN = { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .1, notes: 'G4 C5 E5 G5 E5 G5 C6 - - - - - . . . .' }, { wave: 'triangle', vol: .25, notes: 'C3 . G3 . C3 . C4 - - - - - . . . .' }] };
SONGS.STING_LOSE = { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .08, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . .' }] };
SONGS.STING_FIASCO = { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .09, vib: [5, .04], notes: 'C5 - B4 - A#4 - A4 - - - - - . . . .' }] };

/* ---- sound effects ---- */
const SFX = {
  hike: [{ wave: 'noise', freq: 900, to: 300, dur: .06, vol: .25, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 60, dur: .08, vol: .3 }],
  whistle: { wave: 'square', freq: 2400, vib: [32, .05], dur: .38, vol: .1 },
  whistleShort: { wave: 'square', freq: 2400, vib: [32, .05], dur: .16, vol: .09 },
  helmetClang: [{ wave: 'square', freq: 1800, to: 1200, dur: .08, vol: .12 }, { wave: 'triangle', freq: 1500, dur: .25, vol: .1 }],
  padsCrunch: [{ wave: 'noise', freq: 900, to: 200, dur: .14, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 50, dur: .12, vol: .3 }],
  bigHit: [{ wave: 'noise', freq: 1200, to: 150, dur: .22, vol: .35, filter: 'lowpass' }, { wave: 'square', freq: 1700, to: 900, dur: .1, vol: .12 }, { wave: 'sine', freq: 80, to: 30, dur: .35, vol: .45 }],
  tackleThud: [{ wave: 'noise', freq: 500, to: 120, dur: .12, vol: .25, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 45, dur: .12, vol: .3 }],
  dive: { wave: 'noise', freq: 600, to: 1800, dur: .22, vol: .12 },
  spinWhoosh: { wave: 'noise', freq: 400, to: 2400, dur: .28, vol: .12 },
  stiffArm: [{ wave: 'noise', freq: 700, to: 200, dur: .08, vol: .22, filter: 'lowpass' }, { wave: 'square', freq: 220, to: 110, dur: .06, vol: .1 }],
  hurdleHop: { wave: 'square', freq: 'C5', to: 'G5', dur: .12, vol: .08 },
  catchSlap: { wave: 'noise', freq: 1200, dur: .05, vol: .3, q: 3 },
  drop: [{ wave: 'sine', freq: 200, to: 90, dur: .1, vol: .3 }, { wave: 'noise', freq: 400, dur: .06, vol: .15, filter: 'lowpass' }],
  throwWhoosh: { wave: 'noise', freq: 800, to: 2200, dur: .2, vol: .1 },
  rocketPass: [{ wave: 'saw', freq: 300, to: 1400, dur: .25, vol: .07 }, { wave: 'noise', freq: 1500, to: 4000, dur: .25, vol: .1 }],
  kickThump: [{ wave: 'sine', freq: 150, to: 60, dur: .12, vol: .4 }, { wave: 'noise', freq: 700, to: 300, dur: .06, vol: .2, filter: 'lowpass' }],
  doink: [{ wave: 'triangle', freq: 1400, to: 1350, dur: .5, vol: .25 }, { wave: 'sine', freq: 2800, dur: .3, vol: .08 }],
  airHorn: [{ wave: 'saw', freq: 220, dur: .6, vol: .08, hold: true }, { wave: 'saw', freq: 277, dur: .6, vol: .07, hold: true }, { wave: 'saw', freq: 330, dur: .6, vol: .07, hold: true }],
  cannon: [{ wave: 'noise', freq: 400, to: 60, dur: .6, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 25, dur: .5, vol: .4 }],
  fireworks: [{ wave: 'noise', freq: 300, to: 80, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 4000, dur: .3, vol: .1, delay: .15, filter: 'highpass' }],
  confettiPop: { wave: 'noise', freq: 2400, to: 900, dur: .12, vol: .18 },
  coinFlip: { wave: 'square', freq: 'C6', arp: [0, 7, 12, 7, 0, 7, 12], step: .05, dur: .35, vol: .06 },
  cardFlip: [{ wave: 'noise', freq: 3000, to: 1200, dur: .08, vol: .15 }, { wave: 'square', freq: 'E5', arp: [0, 4, 7, 12], step: .05, dur: .22, vol: .06 }],
  fiascoBreak: [{ wave: 'square', freq: 'C6', arp: [0, -2, -4, -5, -7, -9, -12], step: .06, dur: .45, vol: .07 }, { wave: 'saw', freq: 220, to: 160, dur: .5, vol: .06, vib: [6, .05], delay: .4 }],
  hotOn: [{ wave: 'noise', freq: 300, to: 2400, dur: .45, vol: .15 }, { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 16, 19, 24], step: .05, dur: .4, vol: .06 }],
  pileThumps: [{ wave: 'sine', freq: 100, to: 50, dur: .1, vol: .3 }, { wave: 'sine', freq: 90, to: 40, dur: .1, vol: .3, delay: .18 }, { wave: 'sine', freq: 110, to: 45, dur: .1, vol: .3, delay: .36 }],
  refCapPop: { wave: 'square', freq: 'G5', to: 'C6', dur: .08, vol: .07 },
  mascotSqueak: { wave: 'square', freq: 1400, to: 2200, dur: .15, vol: .08, vib: [20, .1] },
  lightsOut: [{ wave: 'saw', freq: 400, to: 40, dur: .9, vol: .12 }, { wave: 'noise', freq: 200, to: 60, dur: .4, vol: .2, filter: 'lowpass', delay: .8 }],
  lightsOn: [{ wave: 'sine', freq: 60, to: 50, dur: .15, vol: .4 }, { wave: 'saw', freq: 120, dur: .6, vol: .04, hold: true, delay: .1 }],
  menuMove: { wave: 'square', freq: 'A5', dur: .04, vol: .05 },
  menuSelect: { wave: 'square', freq: 'C6', arp: [0, 7], step: .04, dur: .1, vol: .07 },
  menuBack: { wave: 'square', freq: 'G5', to: 'C5', dur: .08, vol: .06 },
  meterTick: { wave: 'square', freq: 'E6', dur: .03, vol: .04 },
  meterSet: { wave: 'square', freq: 'C6', arp: [0, 12], step: .04, dur: .1, vol: .08 },
  bounce: { wave: 'sine', freq: 220, to: 140, dur: .07, vol: .18 },
  shed: { wave: 'noise', freq: 900, to: 400, dur: .07, vol: .12, filter: 'lowpass' },
  seismic: [{ wave: 'noise', freq: 200, to: 40, dur: .9, vol: .45, filter: 'lowpass' }, { wave: 'sine', freq: 50, to: 20, dur: .9, vol: .5 }],
  afterburner: [{ wave: 'saw', freq: 200, to: 1800, dur: .4, vol: .07 }, { wave: 'noise', freq: 3000, dur: .4, vol: .08, filter: 'highpass' }],
  golden: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .05, dur: .3, vol: .12 },
  thunder: [{ wave: 'noise', freq: 300, to: 50, dur: 1.4, vol: .35, filter: 'lowpass' }],
  // crowd one-shots (on the crowd bus)
  roar: { wave: 'noise', freq: 900, to: 1300, dur: 1.6, vol: .22, attack: .2, q: .7 },
  boo: { wave: 'noise', freq: 350, to: 250, dur: 1.2, vol: .2, attack: .15, q: 2 },
  oooh: { wave: 'noise', freq: 500, to: 800, dur: 1.0, vol: .2, attack: .1, q: 2.5 },
  groan: { wave: 'noise', freq: 600, to: 300, dur: 1.1, vol: .18, attack: .1, q: 2 },
  gasp: { wave: 'noise', freq: 1400, to: 2000, dur: .4, vol: .18, attack: .05, q: 2 },
  cheerSwell: { wave: 'noise', freq: 800, to: 1500, dur: 2.2, vol: .24, attack: .6, q: .8 }
};
for (const [k, v] of Object.entries(SFX)) A.define(k, v);
FF.SFX_NAMES = Object.keys(SFX);
FF.sfx = (n, o) => { if (!FF.mute) A.sfx(n, o); };

/* ---- music by context, and its layers ---- */
FF.music = {
  cur: null,
  play(id, o = {}) { if (FF.mute) return; const s = SONGS[id]; if (!s) return; FF.music.cur = id; A.music(s, Object.assign({ fade: .5 }, o)); },
  stop() { FF.music.cur = null; A.music(null); },
  sting(id) { if (!FF.mute && SONGS[id]) A.sting(SONGS[id], { at: 'beat' }); },
  layer(n, v) { const s = SONGS[FF.music.cur]; if (A.song && s && s.tracks.some(t => t.name === n)) A.layer(n, v, .6); }
};

/* ---- the babble voice synth ---- */
const VOW = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [350, 800], y: [320, 2300] };
const PLOS = 'pbtdkgcq', FRIC = 'fszvhxj', NAS = 'mn', LIQ = 'lrwy';
const BANK = ['ba', 'do', 'zee', 'ka', 'fla', 'nu', 'ree', 'bo', 'shma', 'gli', 'va', 'tor', 'mip', 'zub', 'lo', 'neh', 'pa', 'sim', 'woo', 'ga', 'dee', 'bla'];
const PROFILES = FF.VOICES = {
  chet: { base: 125, rate: 13, wave: 'sawtooth', formant: .95, breath: .05, style: 'simlish', vol: .5 },
  lou: { base: 105, rate: 9, wave: 'triangle', formant: .9, breath: .08, style: 'simlish', vol: .6 },
  bluster: { base: 140, rate: 14, wave: 'square', formant: 1, breath: .15, style: 'animalese', vol: .35 },
  pearl: { base: 210, rate: 10, wave: 'triangle', formant: 1.15, breath: .05, style: 'animalese', vol: .6 },
  hap: { base: 165, rate: 12, wave: 'sawtooth', formant: 1.05, breath: .03, style: 'animalese', vol: .4 },
  brock: { base: 150, rate: 11, wave: 'pulse', formant: 1, breath: .02, style: 'animalese', vol: .4 },
  sterling: { base: 115, rate: 8, wave: 'sawtooth', formant: .92, breath: .06, style: 'animalese', vol: .4 },
  bertha: { base: 190, rate: 9, wave: 'square', formant: 1.1, breath: .1, style: 'animalese', vol: .35 },
  gator: { base: 120, rate: 10, wave: 'sawtooth', formant: .95, breath: .12, style: 'animalese', vol: .4 },
  lumen: { base: 140, rate: 11, wave: 'pulse', formant: 1, breath: .02, style: 'animalese', vol: .4 },
  zap: { base: 190, rate: 16, wave: 'pulse12', formant: 1.1, breath: 0, style: 'animalese', vol: .4 },
  hoot: { base: 130, rate: 12, wave: 'pulse', formant: 1, breath: .04, style: 'animalese', vol: .4, vib: 7 },
  iceberg: { base: 100, rate: 6, wave: 'sine', formant: .85, breath: .05, style: 'animalese', vol: .7 },
  avalanche: { growl: true, base: 70, vol: .7 },
  mountain: { base: 90, rate: 7, wave: 'square', formant: .8, breath: .1, style: 'animalese', vol: .4 },
  ref: { base: 150, rate: 12, wave: 'square', formant: 1, breath: 0, style: 'animalese', vol: .3 },
  mascot: { base: 260, rate: 15, wave: 'pulse12', formant: 1.3, breath: 0, style: 'animalese', vol: .35 },
  crowd: { base: 160, rate: 4, wave: 'sawtooth', formant: 1, breath: .2, style: 'simlish', vol: .15 }
};
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** plan a line's syllables: [{ on: consonant class, v: vowel, semis, loud, dur }] */
function plan(text, p) {
  const out = [], q = /\?\s*$/.test(text), ex = /!\s*$/.test(text);
  if (p.style === 'simlish') {
    const words = text.split(/\s+/).filter(Boolean);
    for (const w of words) {
      const n = Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w), h = hashStr(w.toLowerCase());
      for (let k = 0; k < n; k++) { const s = BANK[(h + k * 7) % BANK.length]; out.push(syl(s, (h >> (k * 3)) & 7, caps)); }
    }
  } else {
    const t = text.toLowerCase().replace(/[^a-z' ]/g, ' '); let on = '';
    for (let i = 0; i < t.length; i++) { const ch = t[i]; if ('aeiouy'.includes(ch)) { let v = ch; while ('aeiouy'.includes(t[i + 1])) i++; out.push(syl(on + v, hashStr(on + v + i) & 7, false)); on = ''; } else if (ch !== ' ' && ch !== "'") on = ch; }
  }
  const n = out.length;
  out.forEach((s, i) => { s.semis += (q && i >= n - 2) ? 4 : ex ? 3 * (i / n) : (i >= n - 2 ? -2 : 0); if (ex) s.loud *= 1.3; s.dur = (1 / p.rate) * (.6 + ((hashStr(s.txt + i) & 255) / 255) * .4); });
  return out;
}
function syl(txt, j, caps) {
  const c = txt[0], v = (txt.match(/[aeiouy]/) || ['a'])[0];
  const on = PLOS.includes(c) ? 'p' : FRIC.includes(c) || txt.startsWith('sh') ? 'f' : NAS.includes(c) ? 'n' : LIQ.includes(c) ? 'l' : '';
  return { txt, on, v, semis: (j - 3.5) * .55 + (caps ? 2 : 0), loud: caps ? 1.25 : 1, fric: c === 's' ? 5000 : c === 'f' ? 3000 : 1200 };
}
let busNode = null, lp = null;
function voiceBus() {
  const c = A.ctx; if (!c || !A.bus) return null;
  if (!busNode) { const b = A.bus('voices', game.settings.voices !== undefined ? game.settings.voices : .8); lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500; lp.connect(b); busNode = b; }
  return lp;
}
const playing = {};
function speak(s, p, t, key) {
  const c = A.ctx, out = voiceBus(); if (!c || !out) return;
  const prev = playing[key]; if (prev) try { prev.g.gain.cancelScheduledValues(t); prev.g.gain.setTargetAtTime(0, t, .008); } catch (e) { /* gone */ }
  const f0 = p.base * Math.pow(2, s.semis / 12), d = s.dur, vol = (p.vol || .4) * s.loud * (FF.voiceVol === undefined ? 1 : FF.voiceVol);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.connect(out);
  // the onset: a click, a hiss, a hum, or a glide
  if (s.on === 'p' || s.on === 'f') {
    const n = c.createBufferSource(); n.buffer = A._noise; const f = c.createBiquadFilter(); f.type = s.on === 'f' ? 'highpass' : 'bandpass'; f.frequency.value = s.on === 'f' ? s.fric : 2000;
    const ng = c.createGain(); const L = s.on === 'p' ? .008 : .03; ng.gain.setValueAtTime(vol * .6, t); ng.gain.exponentialRampToValueAtTime(.001, t + L);
    n.connect(f); f.connect(ng); ng.connect(out); n.start(t, Math.random() * .5); n.stop(t + L + .02);
  }
  const osc = c.createOscillator();
  if (p.wave === 'pulse' || p.wave === 'pulse12') osc.setPeriodicWave(A._pulse(p.wave === 'pulse' ? .25 : .125)); else osc.type = p.wave;
  const start = t + (s.on === 'f' ? .025 : s.on === 'p' ? .006 : 0);
  osc.frequency.setValueAtTime(f0 * (s.on === 'l' ? .9 : 1), start); osc.frequency.linearRampToValueAtTime(f0, start + .03);
  if (p.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = p.vib; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(start); l.stop(start + d + .05); }
  const [F1, F2] = VOW[s.v] || VOW.a, k = p.formant || 1;
  for (const [fq, q, a] of [[F1 * k, 6, 1], [F2 * k, 10, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; const bg = c.createGain(); bg.gain.value = a * 3; osc.connect(bp); bp.connect(bg); bg.connect(g); }
  g.gain.linearRampToValueAtTime(vol, start + .006); g.gain.setValueAtTime(vol, start + d * .7); g.gain.linearRampToValueAtTime(0, start + d + .025);
  osc.start(start); osc.stop(start + d + .05);
  playing[key] = { g };
}
function growl(p, t, d) {
  const c = A.ctx, out = voiceBus(); if (!c || !out) return;
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p.vol, t + .1); g.gain.linearRampToValueAtTime(0, t + d); g.connect(out);
  const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; n.connect(f); f.connect(g); n.start(t); n.stop(t + d + .1);
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = p.base; const og = c.createGain(); og.gain.value = .4; o.connect(og); og.connect(g); o.start(t); o.stop(t + d + .1);
}
FF.voice = {
  plan, PROFILES,
  /** speak a whole line now (or plan it headless); returns the plan */
  say(text, who, o = {}) {
    const p = PROFILES[who] || PROFILES.ref, pl = p.growl ? [{ growl: true, dur: 1.2 }] : plan(text, p);
    FF.voice.planned = (FF.voice.planned || 0) + pl.length;
    if (FF.mute || !A.ready || game.settings.commentary === 'subs' && o.commentary) return pl;
    let t = A.ctx.currentTime + .02;
    if (p.growl) { growl(p, t, 1.2); return pl; }
    for (const s of pl) { speak(s, p, t, who); t += s.dur * .92; }
    return pl;
  },
  /** the dialog's per-letter hook (engine change E5): letters grouped into syllables as they type */
  letter(ch, who) {
    const p = PROFILES[who] || PROFILES.ref; if (!ch) return;
    FF.voice.planned = (FF.voice.planned || 0) + ('aeiouyAEIOUY'.includes(ch) ? 1 : 0);
    if (FF.mute || !A.ready) return;
    if (p.growl) { if (!FF.voice._g || A.ctx.currentTime - FF.voice._g > 1) { FF.voice._g = A.ctx.currentTime; growl(p, A.ctx.currentTime, .9); } return; }
    const st = FF.voice._st || (FF.voice._st = {});
    const k = st[who] || (st[who] = { on: '', i: 0 }), c = ch.toLowerCase();
    if ('aeiouy'.includes(c)) { const s = syl(k.on + c, hashStr(k.on + c + (k.i++)) & 7, ch !== c && /[A-Z]/.test(ch)); s.dur = 1 / p.rate * .8; speak(s, p, A.ctx.currentTime + .005, who); k.on = ''; }
    else if (/[a-z]/.test(c)) k.on = c;
  }
};

/* ---- the crowd bed: a long-lived noise loop through a bandpass, louder with the crowd's excitement, plus chants ---- */
let bed = null;
FF.crowdAudio = {
  start(size = 1) {
    const c = A.ctx; if (!c || !A.bus || bed || FF.mute) return;
    const bus = A.bus('crowd', game.settings.crowdVol !== undefined ? game.settings.crowdVol : .7);
    const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6;
    const g = c.createGain(); g.gain.value = .05;
    const n2 = c.createBufferSource(); n2.buffer = A._noise; n2.loop = true; const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 300; const g2 = c.createGain(); g2.gain.value = .04 * size;
    n.connect(f); f.connect(g); g.connect(bus); n2.connect(f2); f2.connect(g2); g2.connect(bus); n.start(); n2.start();
    bed = { n, n2, g, g2, f, size };
  },
  stop() { if (bed) { try { bed.n.stop(); bed.n2.stop(); } catch (e) { /* stopped */ } bed = null; } },
  update(E01) { if (!bed) return; const t = A.ctx.currentTime; bed.g.gain.setTargetAtTime((.06 + .3 * E01) * bed.size, t, .3); bed.f.frequency.setTargetAtTime(700 + 800 * E01, t, .3); },
  react(kind) { if (FF.mute || !A.ready) return; const b = A.bus && A.bus('crowd'); if (!b) return; const p = SFX[kind]; if (!p) return; try { A._voice(p, b, A.ctx.currentTime + .01, 1); } catch (e) { /* no sound */ } },
  chant(team) { const syl = team.chant || ['GO']; FF.voice.say(syl.join(' ') + '!', 'crowd'); }
};
})();
