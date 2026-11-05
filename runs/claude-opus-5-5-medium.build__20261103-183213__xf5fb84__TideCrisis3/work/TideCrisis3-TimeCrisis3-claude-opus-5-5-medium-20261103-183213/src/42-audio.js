// 42-audio: every song (the engine tracker, written as note strings by small composing helpers), every sound effect
// (engine voices: noise bursts with falling filters, sine thumps, chirps), stage ambience (small Web Audio graphs on
// the effects bus: surf, crowd, rain, sluices) and the spatial mix (pan by screen x is approximated by volume and
// pitch; volume by distance). Reads: game.audio. Registered as 'song' and 'sfx' so the validators check names.

// ---- composing helpers: one bar = 16 steps
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nOf = (name) => { const m = /^([A-G]#?)(\d)$/.exec(name); return NOTE.indexOf(m[1]) + (+m[2] + 1) * 12; };
const nName = (n) => NOTE[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
const tr = (name, semis) => nName(nOf(name) + semis);
// a bar from a rhythm ('x' = note, '-' = hold, '.' = rest) cycling through notes
function bar(rhythm, notes) { let i = 0; return rhythm.split('').filter(c => c !== ' ').map(c => c === 'x' ? notes[i++ % notes.length] : c).join(' '); }
const bars = (list) => list.join(' | ');
// chord tones of a root (minor or major triad, an octave)
const triad = (root, minor) => [root, tr(root, minor ? 3 : 4), tr(root, 7), tr(root, 12)];
function song(spec) { def('song', spec.id, spec); return spec; }

const PROG_THEME = [['D3', 1], ['A#2', 0], ['C3', 0], ['A2', 0]];
song({ id: 'theme', bpm: 140, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_THEME.map(([r]) => bar('x.x.x.xx.xx.x.x.', [r, tr(r, 12)]))) },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: bars(PROG_THEME.map(([r, m]) => bar('xxxxxxxxxxxxxxxx', triad(tr(r, 12), m).concat(triad(tr(r, 12), m).slice(1, 3).reverse())))) },
  { name: 'lead', wave: 'pulse', vol: .08, notes: bars(['D5 - - - F5 - A5 - - - G5 - F5 - E5 -', 'F5 - - - D5 - - - A#4 - - - D5 - F5 -', 'E5 - - - G5 - C6 - - - A#5 - A5 - G5 -', 'A5 - - - - - - - E5 - C#5 - E5 - A5 -']) },
  { name: 'drums', wave: 'drums', vol: .3, notes: bars(['k . h . s . h k k . h . s . h h', 'k . h . s . h k k . h . s . o .', 'k . h . s . h k k . h . s . h h', 'k . h . s . h k k k s . s s s s']) }] });
song({ id: 'briefing', bpm: 90, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .09, notes: bars(['D4 - - - - - - - - - - - - - - -', 'A#3 - - - - - - - - - - - - - - -', 'C4 - - - - - - - - - - - - - - -', 'A3 - - - - - - - - - - - - - - -']) },
  { name: 'pulse', wave: 'pulse12', vol: .04, notes: bars(PROG_THEME.map(([r, m]) => bar('x...x...x...x.x.', triad(tr(r, 12), m)))) },
  { name: 'drums', wave: 'drums', vol: .18, notes: bars(['h . h . h . h . h . h . h . h .', 'h . h . h . h . h . h . h . h h']) }] });
const PROG_HARBOR = [['E3', 1], ['C3', 0], ['D3', 0], ['B2', 0]];
song({ id: 'harbor', bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_HARBOR.map(([r]) => bar('x..x..x.x..x..x.', [r, r, tr(r, 7), r, tr(r, 12)]))) },
  { name: 'chords', wave: 'square', vol: .035, notes: bars(PROG_HARBOR.map(([r, m]) => bar('.x.x.x.x.x.x.x.x', triad(tr(r, 12), m).slice(1)))) },
  { name: 'lead', wave: 'pulse', vol: .075, on: false, notes: bars(['E5 - G5 - B5 - - A5 G5 - E5 - D5 - E5 -', 'C5 - E5 - G5 - - F5 E5 - C5 - D5 - E5 -', 'D5 - F#5 - A5 - - G5 F#5 - D5 - E5 - F#5 -', 'B4 - D#5 - F#5 - - - B5 - A5 - F#5 - D#5 -']) },
  { name: 'drums', wave: 'drums', vol: .3, on: false, notes: bars(['k . c k s . c . k . c k s . c c', 'k . c k s . c . k k c . s . o .']) },
  { name: 'clave', wave: 'drums', vol: .16, notes: bars(['t . . t . . t . . . t . t . . .']) }] });
const PROG_STORM = [['A2', 1], ['F2', 0], ['G2', 0], ['E2', 0]];
song({ id: 'storm', bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .11, notes: bars(PROG_STORM.map(([r]) => bar('x.xxx.xxx.xxx.xx', [r, r, tr(r, 12)]))) },
  { name: 'lead', wave: 'square', vol: .065, on: false, notes: bars(['A4 - C5 - E5 - - - D5 - C5 - B4 - C5 -', 'A4 - - - F4 - A4 - C5 - - - A4 - F4 -', 'G4 - B4 - D5 - - - C5 - B4 - G4 - B4 -', 'G#4 - - - B4 - - - E5 - - - D5 - B4 -']) },
  { name: 'pad', wave: 'triangle', vol: .07, notes: bars(PROG_STORM.map(([r, m]) => bar('x---------------', [triad(tr(r, 12), m)[1]]))) },
  { name: 'drums', wave: 'drums', vol: .32, on: false, notes: bars(['k . h k s . h . k k h . s . h h', 'k . h k s . h . k k h . s o s s']) }] });
const PROG_TIDE = [['F3', 0], ['C3', 0], ['D3', 1], ['A#2', 0], ['F3', 0], ['C3', 0], ['G3', 1], ['C3', 0]];
song({ id: 'tidewall', bpm: 155, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_TIDE.map(([r]) => bar('x.x.x.x.x.x.x.xx', [r, tr(r, 12)]))) },
  { name: 'arp', wave: 'pulse12', vol: .04, notes: bars(PROG_TIDE.map(([r, m]) => bar('xxxxxxxxxxxxxxxx', triad(tr(r, 12), m)))) },
  { name: 'lead', wave: 'pulse', vol: .08, on: false, notes: bars(['F5 - - - A5 - C6 - - - A5 - G5 - F5 -', 'E5 - - - G5 - - - C6 - - - G5 - E5 -', 'D5 - - - F5 - A5 - - - F5 - E5 - D5 -', 'D5 - - - F5 - - - A#5 - - - A5 - F5 -', 'F5 - A5 - C6 - - - D6 - C6 - A5 - F5 -', 'G5 - - - E5 - - - C5 - - - E5 - G5 -', 'G5 - A#5 - D6 - - - C6 - A#5 - A5 - G5 -', 'E5 - - - - - - - G5 - - - C6 - - -']) },
  { name: 'drums', wave: 'drums', vol: .3, on: false, notes: bars(['k . h . s . h k k . h . s . h h', 'k . h . s . h k k . h k s . o .']) }] });
const PROG_BOSS = [['C3', 1], ['C3', 1], ['G#2', 0], ['A#2', 0]];
song({ id: 'boss', bpm: 170, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: bars(PROG_BOSS.map(([r]) => bar('xxx.xxx.xx.xxx.x', [r, tr(r, 12), tr(r, 6)]))) },
  { name: 'lead', wave: 'square', vol: .07, notes: bars(['C5 - D#5 - G5 - F#5 - G5 - - - D#5 - C5 -', 'C5 - D#5 - G5 - A#5 - C6 - - - A#5 - G5 -', 'G#5 - - - G5 - - - D#5 - - - C5 - D#5 -', 'D5 - - - F5 - - - A#5 - - - D6 - - -']) },
  { name: 'drums', wave: 'drums', vol: .34, notes: bars(['k k s . k k s . k k s . k s s s']) }] });
const PROG_KING = [['D3', 1], ['A#2', 0], ['G2', 1], ['A2', 0]];
song({ id: 'kingtide', bpm: 165, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: bars(PROG_KING.map(([r]) => bar('x.xxx.xxx.xxx.xx', [r, tr(r, 12)]))) },
  { name: 'pad', wave: 'triangle', vol: .08, notes: bars(PROG_KING.map(([r, m]) => bar('x-------x-------', [triad(tr(r, 12), m)[2], triad(tr(r, 12), m)[1]]))) },
  { name: 'lead', wave: 'pulse', vol: .085, notes: bars(['D5 - - - A5 - - - F5 - G5 - A5 - - -', 'A#5 - - - A5 - - - F5 - D5 - F5 - - -', 'G5 - - - D6 - - - A#5 - A5 - G5 - - -', 'A5 - - - C#6 - - - E6 - - - A5 - - -']) },
  { name: 'drums', wave: 'drums', vol: .34, notes: bars(['k . s k k . s . k . s k k s s s', 'k . s k k . s . k k s . s s o .']) }] });
song({ id: 'range', bpm: 112, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .14, notes: bars(['E2 . E3 . . E2 G2 . A2 . A3 . G2 . D3 .', 'E2 . E3 . . E2 G2 . B2 . B3 . A2 . G2 .']) },
  { name: 'keys', wave: 'square', vol: .035, notes: bars(['. . G4 . . . G4 . . . A4 . . . G4 .', '. . G4 . . . G4 . . . B4 . . . A4 .']) },
  { name: 'drums', wave: 'drums', vol: .26, notes: bars(['k . h . s . h k . k h . s . h .']) }] });
song({ id: 'results', bpm: 120, steps: 4, tracks: [
  { name: 'arp', wave: 'pulse12', vol: .05, notes: bars([bar('xxxxxxxxxxxxxxxx', triad('F4', 0)), bar('xxxxxxxxxxxxxxxx', triad('A#3', 0)), bar('xxxxxxxxxxxxxxxx', triad('C4', 0)), bar('xxxxxxxxxxxxxxxx', triad('F4', 0))]) },
  { name: 'bass', wave: 'triangle', vol: .14, notes: bars(['F2 - - - F3 - - - F2 - - - C3 - - -', 'A#2 - - - A#3 - - - A#2 - - - F3 - - -', 'C3 - - - C4 - - - C3 - - - G3 - - -', 'F2 - - - C3 - - - F3 - - - - - - -']) },
  { name: 'drums', wave: 'drums', vol: .2, notes: bars(['k . h . s . h . k . h . s . h h']) }] });
song({ id: 'clear', bpm: 150, steps: 4, len: 32, tracks: [
  { wave: 'pulse', vol: .1, notes: 'C5 E5 G5 C6 - - G5 C6 E6 - - - - - - - | D6 - C6 - G5 - C6 - - - - - - - - -' },
  { wave: 'triangle', vol: .14, notes: 'C3 - - - G3 - - - C4 - - - - - - - | G3 - - - C3 - - - - - - - - - - -' }] });
song({ id: 'extra', bpm: 180, steps: 4, len: 16, tracks: [{ wave: 'square', vol: .09, notes: 'E5 G5 E6 C6 D6 G6 - - - - - - - - - -' }] });
song({ id: 'stinger', bpm: 120, steps: 4, len: 16, tracks: [{ wave: 'saw', vol: .1, notes: 'C3 - C#3 - - - C3 - - - - - - - - -' }, { wave: 'drums', vol: .4, notes: 'k . . . o . . . k . . . . . . .' }] });
song({ id: 'continue', bpm: 100, steps: 4, tracks: [{ name: 'tick', wave: 'pulse12', vol: .06, notes: bars(['A4 . . . A4 . . . A4 . . . A4 . . .', 'G#4 . . . G#4 . . . G#4 . . . G#4 . . .']) }, { name: 'pad', wave: 'triangle', vol: .09, notes: bars(['A3 - - - - - - - - - - - - - - -', 'G#3 - - - - - - - - - - - - - - -']) }] });
song({ id: 'gameover', bpm: 80, steps: 4, len: 32, tracks: [{ wave: 'triangle', vol: .14, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - | D4 - - - - - - - - - - - - - - -' }, { wave: 'saw', vol: .06, notes: 'A2 - - - - - - - F2 - - - - - - - | D2 - - - - - - - - - - - - - - -' }] });
song({ id: 'ending', bpm: 84, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .1, notes: bars(PROG_THEME.map(([r, m]) => bar('x-------x-------', [triad(tr(r, 12), m)[1], triad(tr(r, 12), m)[2]]))) },
  { name: 'lead', wave: 'pulse12', vol: .07, notes: bars(['D5 - - - F5 - A5 - - - - - G5 - F5 -', 'F5 - - - D5 - - - - - - - D5 - F5 -', 'E5 - - - G5 - C6 - - - - - A#5 - A5 -', 'A5 - - - - - - - - - - - - - - -']) },
  { name: 'bass', wave: 'triangle', vol: .12, notes: bars(PROG_THEME.map(([r]) => bar('x-------x-------', [r, tr(r, 7)]))) }] });
TC.song = id => get('song', id);

// ---------------------------------------------------------------- sound effects
const SFX = {
  hg: [{ wave: 'noise', freq: 3200, to: 500, dur: .09, vol: .34, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 50, dur: .08, vol: .3 }, { wave: 'square', freq: 900, to: 300, dur: .03, vol: .06 }],
  mg: [{ wave: 'noise', freq: 2600, to: 700, dur: .06, vol: .26, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 50, dur: .05, vol: .22 }],
  sg: [{ wave: 'noise', freq: 1800, to: 200, dur: .25, vol: .45, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 35, dur: .2, vol: .4 }, { wave: 'noise', freq: 800, to: 1400, dur: .08, vol: .12, delay: .32 }, { wave: 'noise', freq: 1400, to: 800, dur: .06, vol: .12, delay: .42 }],
  gl: [{ wave: 'noise', freq: 600, to: 200, dur: .14, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 80, dur: .14, vol: .3 }],
  empty: [{ wave: 'square', freq: 1600, to: 1200, dur: .03, vol: .1 }],
  reload: [{ wave: 'noise', freq: 2400, dur: .04, vol: .14 }, { wave: 'square', freq: 700, to: 500, dur: .04, vol: .08, delay: .1 }, { wave: 'noise', freq: 3000, dur: .05, vol: .16, delay: .2 }],
  switch: [{ wave: 'square', freq: 500, to: 800, dur: .05, vol: .08 }, { wave: 'noise', freq: 2400, dur: .04, vol: .1, delay: .05 }],
  coverIn: [{ wave: 'noise', freq: 900, to: 300, dur: .12, vol: .14 }, { wave: 'sine', freq: 90, to: 60, dur: .08, vol: .16, delay: .08 }],
  coverOut: [{ wave: 'noise', freq: 400, to: 1200, dur: .1, vol: .1 }],
  whizz: [{ wave: 'noise', freq: 5000, to: 1600, dur: .14, vol: .1, filter: 'bandpass', q: 3 }],
  ricochet: [{ wave: 'sine', freq: 2600, to: 1400, dur: .18, vol: .08 }, { wave: 'noise', freq: 4000, dur: .03, vol: .1 }],
  metal: [{ wave: 'square', freq: 1800, to: 900, dur: .05, vol: .08 }, { wave: 'noise', freq: 5000, dur: .03, vol: .1 }],
  wood: [{ wave: 'noise', freq: 900, to: 400, dur: .07, vol: .16 }],
  concrete: [{ wave: 'noise', freq: 1400, to: 600, dur: .06, vol: .14 }],
  water: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .14, filter: 'lowpass' }],
  glass: [{ wave: 'noise', freq: 6000, to: 3000, dur: .2, vol: .16, filter: 'highpass' }, { wave: 'sine', freq: 3200, to: 2400, dur: .1, vol: .05 }],
  ehit: [{ wave: 'noise', freq: 900, to: 300, dur: .06, vol: .2 }, { wave: 'square', freq: 220, to: 120, dur: .05, vol: .1 }],
  head: [{ wave: 'sine', freq: 1760, dur: .12, vol: .14 }, { wave: 'sine', freq: 2640, dur: .1, vol: .07, delay: .03 }],
  tick: [{ wave: 'square', freq: 1400, dur: .025, vol: .08 }],
  chirp: [{ wave: 'square', freq: 1200, to: 2400, dur: .07, vol: .12 }],
  hurt: [{ wave: 'noise', freq: 700, to: 150, dur: .3, vol: .4, filter: 'lowpass' }, { wave: 'saw', freq: 160, to: 60, dur: .3, vol: .2 }],
  timetick: [{ wave: 'square', freq: 980, dur: .03, vol: .07 }],
  extend: [{ wave: 'square', freq: 'C6', dur: .25, vol: .08, arp: [0, 4, 7, 12], step: .05 }],
  tidein: [{ wave: 'noise', freq: 400, to: 100, dur: 1, vol: .4, filter: 'lowpass' }, { wave: 'saw', freq: 220, to: 55, dur: .8, vol: .16 }],
  pickup: [{ wave: 'square', freq: 'E5', dur: .3, vol: .1, arp: [0, 5, 7, 12], step: .06 }],
  newweapon: [{ wave: 'pulse', freq: 'C5', dur: .5, vol: .1, arp: [0, 4, 7, 12, 16, 19], step: .07 }],
  explode: [{ wave: 'noise', freq: 1600, to: 60, dur: 1.2, vol: .55, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 30, dur: .9, vol: .5 }],
  explodeS: [{ wave: 'noise', freq: 2000, to: 120, dur: .5, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 40, dur: .4, vol: .35 }],
  bounce: [{ wave: 'square', freq: 300, to: 200, dur: .04, vol: .08 }],
  rocket: [{ wave: 'noise', freq: 600, to: 1800, dur: .6, vol: .18, filter: 'bandpass', q: 2 }],
  harpoon: [{ wave: 'saw', freq: 300, to: 900, dur: .18, vol: .12 }, { wave: 'noise', freq: 2000, dur: .06, vol: .1 }],
  torpedo: [{ wave: 'noise', freq: 300, to: 500, dur: 1.2, vol: .14, filter: 'lowpass', hold: true }],
  flare: [{ wave: 'noise', freq: 2500, to: 4000, dur: .4, vol: .14 }, { wave: 'sine', freq: 800, to: 1600, dur: .2, vol: .06 }],
  spinup: [{ wave: 'saw', freq: 80, to: 900, dur: .8, vol: .1 }],
  minigun: [{ wave: 'noise', freq: 1500, to: 900, dur: 2.5, vol: .22, filter: 'lowpass', hold: true }, { wave: 'square', freq: 40, dur: 2.5, vol: .1, hold: true }],
  stomp: [{ wave: 'sine', freq: 70, to: 30, dur: .3, vol: .4 }, { wave: 'noise', freq: 300, to: 80, dur: .2, vol: .2 }],
  servo: [{ wave: 'saw', freq: 220, to: 330, dur: .25, vol: .06 }],
  rotor: [{ wave: 'noise', freq: 200, dur: .5, vol: .1, filter: 'lowpass' }],
  zap: [{ wave: 'saw', freq: 1800, to: 300, dur: .18, vol: .12 }],
  laser: [{ wave: 'sine', freq: 2400, to: 2800, dur: 1.2, vol: .04, hold: true }],
  sniper: [{ wave: 'noise', freq: 4000, to: 300, dur: .35, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 40, dur: .3, vol: .3 }],
  erifle: [{ wave: 'noise', freq: 2200, to: 400, dur: .07, vol: .14, filter: 'lowpass' }],
  slash: [{ wave: 'noise', freq: 3000, to: 800, dur: .14, vol: .2, filter: 'bandpass', q: 2 }],
  clang: [{ wave: 'square', freq: 1200, to: 600, dur: .12, vol: .14 }, { wave: 'sine', freq: 2400, to: 1800, dur: .25, vol: .08 }],
  break: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .2 }],
  glassbreak: [{ wave: 'noise', freq: 7000, to: 2000, dur: .35, vol: .2, filter: 'highpass' }, { wave: 'sine', freq: 3500, to: 2800, dur: .2, vol: .06 }, { wave: 'sine', freq: 4200, to: 3600, dur: .15, vol: .05, delay: .06 }],
  fireworks: [{ wave: 'noise', freq: 3000, to: 200, dur: .6, vol: .2, delay: .0 }, { wave: 'noise', freq: 5000, to: 3000, dur: .4, vol: .06, delay: .25 }],
  ui: [{ wave: 'square', freq: 880, dur: .03, vol: .06 }],
  uiok: [{ wave: 'square', freq: 'E5', dur: .14, vol: .08, arp: [0, 7], step: .05 }],
  uiback: [{ wave: 'square', freq: 'A4', dur: .12, vol: .07, arp: [0, -5], step: .05 }],
  stamp: [{ wave: 'noise', freq: 600, to: 100, dur: .3, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 80, to: 40, dur: .3, vol: .4 }],
  count: [{ wave: 'square', freq: 1320, dur: .02, vol: .05 }],
  thunder: [{ wave: 'noise', freq: 400, to: 60, dur: 2.4, vol: .4, filter: 'lowpass' }, { wave: 'noise', freq: 200, to: 50, dur: 1.6, vol: .3, delay: .3, filter: 'lowpass' }],
  splash: [{ wave: 'noise', freq: 1800, to: 300, dur: .4, vol: .25, filter: 'lowpass' }],
  door: [{ wave: 'noise', freq: 300, to: 120, dur: .25, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 90, to: 60, dur: .15, vol: .1 }],
  land: [{ wave: 'sine', freq: 90, to: 40, dur: .12, vol: .25 }],
  armor: [{ wave: 'square', freq: 2200, to: 1600, dur: .05, vol: .07 }, { wave: 'sine', freq: 3000, to: 2600, dur: .1, vol: .05 }],
  surge: [{ wave: 'noise', freq: 200, to: 900, dur: 1.4, vol: .35, filter: 'lowpass' }],
  slowmo: [{ wave: 'sine', freq: 300, to: 80, dur: .8, vol: .2 }],
  boat: [{ wave: 'saw', freq: 70, dur: .5, vol: .04, hold: true }],
  beep: [{ wave: 'sine', freq: 1000, dur: .08, vol: .08 }]
};
for (const k in SFX) def('sfx', k, { voices: SFX[k] });
TC.SFX = SFX;
TC.defineSfx = (audio) => { for (const k in SFX) audio.define('tc-' + k, SFX[k]); };

// ---------------------------------------------------------------- ambience: small Web Audio graphs on the effects bus
const Amb = {
  nodes: [],
  start(game, kind) {
    this.stop();
    const A = game.audio, ctx = A.ctx, bus = A.bus && A.bus('sfx'); if (!ctx || !bus || !A._noise) return;
    const add = (freq, type, q, vol, lfoF = 0, lfoK = 0) => {
      const src = ctx.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(bus); src.start();
      if (lfoF) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfoF; lg.gain.value = lfoK; l.connect(lg); lg.connect(g.gain); l.start(); this.nodes.push(l); }
      this.nodes.push(src);
    };
    if (kind === 'festival') { add(500, 'lowpass', .7, .05, .13, .03); add(1500, 'bandpass', .8, .012, .4, .008); }
    if (kind === 'storm') { add(5000, 'highpass', .5, .05); add(300, 'lowpass', .7, .06, .2, .04); }
    if (kind === 'tidewall') { add(250, 'lowpass', 1, .08, .07, .02); add(120, 'bandpass', 4, .05); }
    if (kind === 'range') { add(200, 'lowpass', 1, .015); }
  },
  stop() { for (const n of this.nodes) { try { n.stop(); } catch (e) { /* already stopped */ } } this.nodes = []; }
};
TC.Amb = Amb;
