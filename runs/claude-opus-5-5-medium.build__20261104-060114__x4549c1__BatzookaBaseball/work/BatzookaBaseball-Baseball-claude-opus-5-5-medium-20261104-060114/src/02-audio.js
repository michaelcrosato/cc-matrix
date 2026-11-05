/* AUDIO: every sound is the engine's chip synth. Sound effects, the original songs (the ballpark organ is a square and a
 * triangle an octave apart with a slow vibrato), stings, and BABBLE: Animalese-style gibberish voices that play one
 * syllable per letter of what a character says. */
const SFX = {
  tink: { wave: 'triangle', freq: 1800, to: 1200, dur: .08, vol: .25 },
  crack: [{ wave: 'noise', freq: 2400, to: 600, dur: .07, vol: .45 }, { wave: 'square', freq: 220, to: 90, dur: .1, vol: .25 }],
  krakoom: [{ wave: 'noise', freq: 3000, to: 120, dur: .5, vol: .55 }, { wave: 'saw', freq: 110, to: 30, dur: .6, vol: .4 }, { wave: 'triangle', freq: 880, to: 1760, dur: .4, vol: .2, vib: [12, .04] }],
  mitt: [{ wave: 'noise', freq: 900, to: 300, dur: .05, vol: .45 }, { wave: 'sine', freq: 140, to: 80, dur: .07, vol: .35 }],
  glove: { wave: 'noise', freq: 600, to: 250, dur: .05, vol: .3 },
  whoosh: { wave: 'noise', freq: 400, to: 1800, dur: .18, vol: .16 },
  foultip: { wave: 'noise', freq: 2600, to: 1400, dur: .05, vol: .3 },
  thud: { wave: 'sine', freq: 120, to: 60, dur: .1, vol: .3 },
  bounce: { wave: 'sine', freq: 200, to: 120, dur: .06, vol: .2 },
  clang: [{ wave: 'square', freq: 520, to: 480, dur: .25, vol: .18, vib: [20, .02] }, { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .25 }],
  ping: { wave: 'triangle', freq: 2400, to: 2300, dur: .4, vol: .25 },
  cheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .22 },
  roar: [{ wave: 'noise', freq: 500, to: 1300, dur: 2.2, vol: .28 }, { wave: 'noise', freq: 900, to: 700, dur: 1.8, vol: .15 }],
  groan: { wave: 'noise', freq: 700, to: 250, dur: 1.0, vol: .18 },
  oooh: { wave: 'triangle', freq: 300, to: 420, dur: .6, vol: .18, vib: [5, .05] },
  boo: { wave: 'saw', freq: 140, to: 110, dur: .8, vol: .1, vib: [4, .03] },
  organ: [{ wave: 'square', freq: 'C5', dur: .12, vol: .12 }, { wave: 'triangle', freq: 'C4', dur: .12, vol: .2 }],
  charge: [{ wave: 'saw', freq: 120, to: 900, dur: .6, vol: .2 }, { wave: 'noise', freq: 300, to: 2000, dur: .6, vol: .15 }],
  rocket: { wave: 'noise', freq: 900, to: 300, dur: .5, vol: .25 },
  firework: [{ wave: 'noise', freq: 800, to: 80, dur: .45, vol: .35 }, { wave: 'noise', freq: 5000, to: 3000, dur: .3, vol: .1 }],
  fizzle: [{ wave: 'noise', freq: 1500, to: 200, dur: .5, vol: .25 }, { wave: 'square', freq: 400, to: 100, dur: .4, vol: .12 }],
  slide: { wave: 'noise', freq: 500, to: 180, dur: .3, vol: .22 },
  thump: { wave: 'sine', freq: 90, to: 50, dur: .12, vol: .35 },
  crash: [{ wave: 'noise', freq: 1500, to: 100, dur: .35, vol: .45 }, { wave: 'square', freq: 160, to: 60, dur: .2, vol: .2 }],
  bonk: { wave: 'square', freq: 700, to: 300, dur: .08, vol: .2 },
  whistle: { wave: 'triangle', freq: 600, to: 1900, dur: .5, vol: .18 },
  ump: { wave: 'square', freq: 2200, vib: [30, .05], dur: .3, vol: .12 },
  pow: [{ wave: 'noise', freq: 1600, to: 300, dur: .1, vol: .35 }, { wave: 'square', freq: 300, to: 120, dur: .08, vol: .2 }],
  ding: { wave: 'triangle', freq: 'E6', dur: .4, vol: .25, arp: [0, 4, 7, 12], step: .06 },
  turbo: { wave: 'noise', freq: 300, to: 1500, dur: .25, vol: .14 },
  menu: { wave: 'square', freq: 'E5', dur: .04, vol: .12 },
  ok: { wave: 'square', freq: 'C5', dur: .1, vol: .15, arp: [0, 7], step: .05 },
  back: { wave: 'square', freq: 'G4', to: 'C4', dur: .1, vol: .12 },
  gull: { wave: 'saw', freq: 1400, to: 900, dur: .25, vol: .12, vib: [20, .08] },
  horn: [{ wave: 'saw', freq: 110, dur: .9, vol: .2 }, { wave: 'square', freq: 165, dur: .9, vol: .12 }],
  rumble: { wave: 'noise', freq: 120, to: 60, dur: 1.4, vol: .3 },
  meteor: { wave: 'noise', freq: 2400, to: 200, dur: .9, vol: .25 },
  ghost: { wave: 'sine', freq: 500, to: 300, dur: 1.2, vol: .15, vib: [6, .08] },
  drone: { wave: 'saw', freq: 220, to: 240, dur: .4, vol: .08, vib: [30, .05] },
  splash: { wave: 'noise', freq: 1200, to: 200, dur: .5, vol: .3 },
  pop: { wave: 'square', freq: 900, to: 1500, dur: .05, vol: .2 },
  sizzle: { wave: 'noise', freq: 4000, to: 2000, dur: .4, vol: .15 },
  laser: { wave: 'saw', freq: 1600, to: 300, dur: .25, vol: .2 },
  step: { wave: 'noise', freq: 300, to: 200, dur: .03, vol: .06 },
  coin: { wave: 'square', freq: 'B5', dur: .2, vol: .15, arp: [0, 5], step: .07 }
};
for (const k in SFX) A.define(k, SFX[k]);
const sfx = (name, o) => { if (!BZ.mute) A.sfx(name, o); };

/* ---- songs: all original. Organ = a square lead over a triangle an octave down ---- */
const organ = (lead, low, bass, drums, bpm, steps = 4, extra = []) => ({ bpm, steps, tracks: [
  { name: 'base', wave: 'square', vol: .06, notes: lead }, { name: 'base2', wave: 'triangle', vol: .12, notes: low },
  { name: 'bass', wave: 'triangle', vol: .26, notes: bass }, { name: 'drums', wave: 'drums', vol: .1, notes: drums }].concat(extra) });
const SONGS = {
  title: organ('C5 E5 G5 C6 | B5 G5 E5 G5 | A5 F5 C5 F5 | G5 - - . | C5 E5 G5 C6 | D6 C6 B5 A5 | G5 E5 F5 D5 | C5 - - .',
    'C4 E4 G4 C5 | B4 G4 E4 G4 | A4 F4 C4 F4 | G4 - - . | C4 E4 G4 C5 | D5 C5 B4 A4 | G4 E4 F4 D4 | C4 - - .',
    'C3 C3 G2 G2 | E2 E2 G2 G2 | F2 F2 A2 A2 | G2 G2 B2 G2 | C3 C3 G2 G2 | D3 D3 A2 A2 | G2 G2 G2 G2 | C3 G2 C3 .',
    'k h s h k k s h', 140, 2),
  menu: organ('E5 . G5 . A5 . G5 E5 | D5 . E5 . C5 . . . | E5 . G5 . A5 . C6 A5 | G5 . E5 . D5 . . .',
    'C4 . E4 . F4 . E4 C4 | B3 . C4 . A3 . . . | C4 . E4 . F4 . A4 F4 | E4 . C4 . B3 . . .',
    'C3 . G2 . F2 . G2 . | G2 . E2 . A2 . G2 . | C3 . G2 . F2 . A2 . | G2 . G2 . G2 . B2 .',
    'k . h . s . h . | k . h k s . h .', 100, 2),
  tourmap: organ('G4 B4 D5 B4 | C5 E5 G5 E5 | D5 B4 G4 B4 | A4 - G4 . | G4 B4 D5 G5 | E5 C5 A4 C5 | D5 E5 F#5 D5 | G5 - - .',
    'G3 . B3 . | C4 . E4 . | D4 . G3 . | A3 . G3 . | G3 . B3 . | E4 . A3 . | D4 . F#4 . | G4 . . .',
    'G2 B2 D3 B2 | C3 E3 G3 E3 | D3 B2 G2 B2 | D3 F#2 G2 . | G2 B2 D3 B2 | A2 C3 E3 C3 | D3 D3 D3 D3 | G2 D3 G2 .',
    'k h s h', 120, 2),
  kernel: organ('C5 . E5 G5 . E5 | F5 . A5 C6 . A5 | G5 . E5 C5 . E5 | D5 - - . . . | C5 . E5 G5 . E5 | F5 . A5 C6 . A5 | G5 F5 E5 D5 E5 D5 | C5 - - . . .',
    'C4 . . E4 . . | F4 . . A4 . . | E4 . . C4 . . | G3 - - . . . | C4 . . E4 . . | F4 . . A4 . . | E4 . . G3 . . | C4 - - . . .',
    'C3 . G2 . C3 . | F2 . C3 . F2 . | C3 . G2 . E2 . | G2 . D3 . G2 . | C3 . G2 . C3 . | F2 . C3 . F2 . | G2 . G2 . G2 . | C3 . G2 . C3 .',
    'k . h s . h', 116, 3, [{ name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'C6 . G5 . E5 . | F6 . C6 . A5 . | G6 . E6 . C6 . | D6 . B5 . G5 .' }]),
  barnacle: organ('D5 . F#5 A5 . F#5 | G5 . E5 C#5 . E5 | D5 . F#5 A5 . D6 | C#6 - A5 . . . | B5 . G5 E5 . G5 | A5 . F#5 D5 . F#5 | E5 F#5 G5 E5 C#5 E5 | D5 - - . . .',
    'D4 . . A3 . . | E4 . . A3 . . | D4 . . F#4 . . | A4 - - . . . | G4 . . E4 . . | F#4 . . D4 . . | A3 . . C#4 . . | D4 - - . . .',
    'D3 . A2 . D3 . | A2 . E2 . A2 . | D3 . A2 . D3 . | A2 . C#3 . E3 . | G2 . D3 . G2 . | D3 . A2 . D3 . | A2 . A2 . A2 . | D3 . A2 . D3 .',
    'k . h s . h', 112, 3, [{ name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'A5 . D6 . F#6 . | G5 . C#6 . E6 . | A5 . D6 . F#6 . | E6 . C#6 . A5 .' }]),
  caldera: { bpm: 132, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .06, notes: 'A4 . C5 . E5 . D5 C5 | B4 . . . G#4 . . . | A4 . C5 . E5 . A5 G5 | F5 . E5 . D5 . E5 . ' },
    { name: 'bass', wave: 'saw', vol: .14, notes: 'A2 A2 . A2 A2 . A2 . | E2 E2 . E2 G#2 . E2 . | A2 A2 . A2 C3 . A2 . | F2 F2 . E2 E2 . E2 .' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . t k s . t . | k k t . s . t t' },
    { name: 'hype', wave: 'square', vol: .05, on: false, notes: 'A5 E6 A5 E6 C6 E6 C6 E6 | B5 E6 B5 E6 G#5 E6 G#5 E6' }] },
  tranquility: { bpm: 104, steps: 4, tracks: [
    { name: 'base', wave: 'sine', vol: .12, notes: 'E5 B5 G5 B5 E6 B5 G5 B5 | D5 A5 F#5 A5 D6 A5 F#5 A5 | C5 G5 E5 G5 C6 G5 E5 G5 | B4 F#5 D#5 F#5 B5 F#5 D#5 F#5' },
    { name: 'pad', wave: 'triangle', vol: .14, notes: 'E4 - - - - - - - | D4 - - - - - - - | C4 - - - - - - - | B3 - - - - - - -' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'E2 . . . E2 . . . | D2 . . . D2 . . . | C2 . . . C2 . . . | B1 . . . B1 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, notes: 'k . . h . . s . | k . h . . . s h' },
    { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'B5 . E6 . G6 . E6 . | A5 . D6 . F#6 . D6 .' }] },
  boneyard: organ('E5 . . G5 . . | F#5 . . D#5 . . | E5 . . B4 . . | C5 - - B4 - - | E5 . . G5 . . | A5 . . F#5 . . | G5 . F#5 E5 . D#5 | E5 - - . . .',
    'E4 . . B3 . . | D#4 . . B3 . . | E4 . . G3 . . | A3 - - B3 - - | E4 . . B3 . . | C4 . . D#4 . . | E4 . . B3 . . | E4 - - . . .',
    'E2 . . B2 . . | B1 . . F#2 . . | E2 . . E2 . . | A2 . . B2 . . | E2 . . B2 . . | A2 . . B2 . . | E2 . B1 . B1 . | E2 . . . . .',
    'k . . h . . | s . . h . .', 90, 3, [{ name: 'theremin', wave: 'sine', vol: .07, notes: 'B5 - - - - - | A5 - - - - - | G5 - - - - - | F#5 - - - - -' }, { name: 'hype', wave: 'pulse', vol: .05, on: false, notes: 'E6 . . B5 . . | F#6 . . D#6 . .' }]),
  megadome: { bpm: 118, steps: 4, tracks: [
    { name: 'base', wave: 'pulse', vol: .07, notes: 'A4 . E5 . A5 . E5 . | F4 . C5 . F5 . C5 . | C5 . G5 . C6 . G5 . | G4 . D5 . G5 . B5 .' },
    { name: 'lead', wave: 'saw', vol: .05, notes: 'E5 - - - D5 - C5 - | C5 - - - - - . . | E5 - - - G5 - E5 - | D5 - - - B4 - - -' },
    { name: 'bass', wave: 'square', vol: .14, notes: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . | k . h k s . h h' },
    { name: 'hype', wave: 'square', vol: .05, on: false, notes: 'A5 C6 E6 A6 E6 C6 A5 E5 | F5 A5 C6 F6 C6 A5 F5 C5' }] },
  derby: { bpm: 160, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E5 E5 G5 E5 | A5 G5 E5 D5 | E5 E5 G5 E5 | B5 A5 G5 A5 | C6 B5 A5 G5 | A5 G5 E5 D5 | E5 G5 D5 B4 | E5 - E5 .' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'E2 E3 E2 E3 | A2 A3 A2 A3 | E2 E3 E2 E3 | B2 B3 B2 B3 | C3 C4 C3 C4 | A2 A3 A2 A3 | E2 E3 B2 B3 | E2 E3 E2 .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k s k s | k s k k s s' }] },
  rhubarb: { bpm: 180, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'C5 D#5 F5 F#5 | G5 F#5 F5 D#5 | C5 D#5 F5 F#5 | G5 A#5 G5 . | C6 A#5 G5 F#5 | F5 D#5 C5 D#5 | F5 F#5 G5 F#5 | C5 - C5 .' },
    { name: 'bass', wave: 'saw', vol: .14, notes: 'C2 C3 C2 C3 | C2 C3 C2 C3 | F2 F3 F2 F3 | G2 G3 G2 G3' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k k s . k s s s' }] },
  training: organ('G5 . E5 . C5 . E5 . | F5 . D5 . B4 . D5 . | E5 . G5 . C6 . G5 . | F5 E5 D5 C5 D5 . . .',
    'C4 . . . E4 . . . | D4 . . . G3 . . . | C4 . . . E4 . . . | G3 . . . G3 . . .',
    'C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 . | G2 . G2 . G2 . G2 .', 'k . h . s . h .', 112, 2),
  credits: organ('C5 E5 G5 C6 | B5 G5 E5 G5 | A5 F5 C5 F5 | G5 - - . | E5 G5 C6 E6 | D6 C6 B5 A5 | G5 E5 F5 D5 | C5 - - .',
    'C4 . G3 . | B3 . G3 . | A3 . F3 . | G3 - - . | C4 . G3 . | D4 . A3 . | G3 . G3 . | C4 - - .',
    'C3 G2 C3 G2 | E2 B2 E2 B2 | F2 C3 F2 C3 | G2 D3 G2 D3 | C3 G2 C3 G2 | D3 A2 D3 A2 | G2 D3 G2 B2 | C3 G2 C3 .', 'k h s h', 104, 2),
  hubcard: { bpm: 110, steps: 2, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C5 E5 G5 E5 | A4 C5 E5 C5 | F4 A4 C5 A4 | G4 B4 D5 B4' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 - - . | A2 - - . | F2 - - . | G2 - - .' }] }
};
const STINGS = {
  homer: { bpm: 180, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - . . . .' }, { wave: 'triangle', vol: .2, notes: 'C4 . G4 . C5 - - . E5 - - - . . . .' }] },
  strikeout: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'G5 E5 C5 G4 - - . .' }] },
  inning: { bpm: 160, steps: 2, tracks: [{ wave: 'square', vol: .08, notes: 'C5 . C5 E5 G5 - - .' }, { wave: 'triangle', vol: .15, notes: 'C4 . C4 C4 E4 - - .' }] },
  victory: { bpm: 150, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 C5 C5 C5 G#4 . A#4 . C5 . A#4 C5 - - - .' }, { wave: 'triangle', vol: .2, notes: 'C4 C4 C4 C4 G#3 . A#3 . C4 . A#3 C4 - - - .' }] },
  defeat: { bpm: 90, steps: 2, tracks: [{ wave: 'triangle', vol: .15, notes: 'E4 D#4 D4 C#4 - - - .' }] },
  batzooka: { bpm: 220, steps: 2, tracks: [{ wave: 'saw', vol: .1, notes: 'C4 D#4 G4 C5 D#5 G5 C6 - - - . .' }] },
  charge: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'G4 C5 E5 G5 . E5 G5 - - .' }, { wave: 'drums', vol: .12, notes: 'k . k . s . k k s .' }] }
};
let curSong = null;
function music(name, o) { if (curSong === name) return; curSong = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); }
function sting(name) { if (!BZ.mute) A.sting(STINGS[name], { at: 'now' }); }
function layer(name, v) { try { A.layer(name, v, .8); } catch (e) { /* the song has no such layer */ } }
BZ.SONGS = SONGS; BZ.STINGS = STINGS;

/* ---- BABBLE: gibberish voices, one syllable a letter. Vowels set the pitch contour; caps are louder and slower ---- */
const VOICES = {
  hap: { wave: 'pulse', base: 190, rate: 20, range: 7 }, lou: { wave: 'square', base: 120, rate: 15, vib: [6, .02] },
  pa: { wave: 'triangle', base: 150, rate: 9, echo: true }, ump: { wave: 'square', base: 260, rate: 14, hold: true },
  dot: { wave: 'pulse12', base: 300, rate: 22 }, ike: { wave: 'triangle', base: 170, rate: 12, vib: [5, .04] },
  mort: { wave: 'saw', base: 140, rate: 16 }, robo: { wave: 'saw', base: 90, rate: 18, quant: true }, bones: { wave: 'triangle', base: 220, rate: 18, clack: true },
  brine: { wave: 'pulse', base: 200, rate: 17 }, iggy: { wave: 'square', base: 230, rate: 22 }, cosmo: { wave: 'sine', base: 210, rate: 15, vib: [7, .05] },
  kid: { wave: 'pulse', base: 260, rate: 21 }, hank: { wave: 'square', base: 140, rate: 13 }, pip: { wave: 'pulse12', base: 330, rate: 22 }, vendor: { wave: 'square', base: 240, rate: 16 }
};
const VOWEL = { a: 0, e: 4, i: 7, o: 2, u: -3, y: 5 };
const babble = {
  q: [], t: 0, v: null,
  say(text, voice) { const V = VOICES[voice] || VOICES.hap; this.q = []; this.v = V; let lift = 0, caps = false;
    for (const w of String(text).split(/(\s+)/)) {
      caps = w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w);
      for (const ch of w) {
        if (/\s/.test(ch)) { this.q.push({ gap: .04 }); continue; }
        if ('.,!?'.includes(ch)) { this.q.push({ gap: ch === ',' ? .08 : .14 }); if (ch === '!') lift = 4; continue; }
        const c = ch.toLowerCase(); if (c < 'a' || c > 'z') continue;
        const vow = c in VOWEL, semis = (vow ? VOWEL[c] : (c.charCodeAt(0) * 7) % 5 - 2) + (lift > 0 ? 3 : 0); if (lift > 0) lift--;
        this.q.push({ c, vow, semis, caps });
      }
    }
  },
  stop() { this.q = []; },
  update(dt) {
    if (!this.q.length || !this.v) return; this.t -= dt; if (this.t > 0) return;
    const n = this.q.shift(), V = this.v; if (n.gap) { this.t = n.gap; return; }
    let semis = n.semis * (V.range ? V.range / 7 : 1); if (V.quant) semis = [0, 4, 7][Math.abs(Math.round(semis)) % 3];
    const freq = V.base * Math.pow(2, semis / 12), dur = (1 / V.rate) * (n.vow ? 1.3 : .8) * (n.caps ? 1.4 : 1) * (V.hold && n.vow ? 1.8 : 1);
    const vol = (game.settings.voices === undefined ? .8 : game.settings.voices) * (n.caps ? .2 : .13);
    if (vol > 0 && !BZ.mute) {
      A.sfx({ wave: V.wave, freq, to: freq * 1.06, dur, vol, vib: V.vib || (V.hold && n.vow ? [7, .04] : undefined) }, { vary: 0 });
      if ('szx'.includes(n.c)) A.sfx({ wave: 'noise', freq: 4000, dur: .01, vol: vol * .5 }, { vary: 0 });
      if (V.clack && n.vow) A.sfx({ wave: 'noise', freq: 2400, to: 1800, dur: .015, vol: vol * .6 }, { vary: 0 });
      if (V.echo) game.after(.12, () => A.sfx({ wave: V.wave, freq, dur, vol: vol * .4 }, { vary: 0 }));
    }
    this.t = dur;
  }
};
BZ.babble = babble;
