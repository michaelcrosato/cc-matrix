// Audio, all synthesized in code: sound effects, songs as data, and the gibberish voices (Animalese/Simlish style).
(() => {
const E = My3D2dge, WP = globalThis.WP;
const Au = WP.Audio = {};
let game = null;
Au.init = g => { game = g; };
const LAY = {   // each effect is a list of layered voices
  smg: [{ wave: 'noise', freq: 1800, to: 300, dur: .05, vol: .16 }, { wave: 'square', freq: 170, to: 60, dur: .04, vol: .1 }],
  smg2: [{ wave: 'noise', freq: 1500, to: 260, dur: .05, vol: .12 }, { wave: 'pulse', freq: 210, to: 70, dur: .04, vol: .08 }],
  dry: [{ wave: 'square', freq: 900, to: 700, dur: .03, vol: .1 }],
  reload: [{ wave: 'square', freq: 300, to: 200, dur: .06, vol: .1 }, { wave: 'noise', freq: 900, dur: .05, vol: .08 }],
  reloaded: [{ wave: 'square', freq: 520, to: 780, dur: .07, vol: .12 }, { wave: 'noise', freq: 1200, dur: .06, vol: .1 }],
  gthrow: [{ wave: 'noise', freq: 600, to: 1400, dur: .16, vol: .1 }],
  boom: [{ wave: 'noise', freq: 900, to: 40, dur: .7, vol: .35 }, { wave: 'sine', freq: 120, to: 30, dur: .6, vol: .35 }],
  boomS: [{ wave: 'noise', freq: 900, to: 80, dur: .35, vol: .24 }, { wave: 'sine', freq: 140, to: 50, dur: .3, vol: .22 }],
  boomXL: [{ wave: 'noise', freq: 800, to: 30, dur: 1.2, vol: .4 }, { wave: 'sine', freq: 90, to: 22, dur: 1.1, vol: .4 }, { wave: 'saw', freq: 60, to: 20, dur: 1, vol: .15 }],
  hit: [{ wave: 'noise', freq: 2200, to: 800, dur: .04, vol: .1 }],
  hitH: [{ wave: 'square', freq: 1500, to: 900, dur: .06, vol: .14 }, { wave: 'noise', freq: 2600, dur: .05, vol: .1 }],
  hitW: [{ wave: 'square', freq: 700, to: 1800, dur: .09, vol: .16 }, { wave: 'triangle', freq: 1400, dur: .12, vol: .14 }],
  kill: [{ wave: 'square', freq: 440, to: 110, dur: .22, vol: .12 }],
  scream: [{ wave: 'triangle', freq: 700, to: 200, dur: .3, vol: .12, vib: [20, .06] }],
  hurt: [{ wave: 'saw', freq: 200, to: 70, dur: .3, vol: .22 }, { wave: 'noise', freq: 400, to: 80, dur: .25, vol: .2 }],
  down: [{ wave: 'saw', freq: 300, to: 40, dur: 1, vol: .24 }],
  efire: [{ wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .1 }, { wave: 'pulse', freq: 330, to: 120, dur: .07, vol: .07 }],
  tele: [{ wave: 'triangle', freq: 880, dur: .05, vol: .06 }],
  throw: [{ wave: 'noise', freq: 800, to: 2000, dur: .12, vol: .08 }],
  knife: [{ wave: 'noise', freq: 2500, to: 3500, dur: .1, vol: .07 }],
  missile: [{ wave: 'noise', freq: 500, to: 1500, dur: .5, vol: .16 }],
  pickup: [{ wave: 'square', freq: 660, to: 1320, dur: .08, vol: .13 }, { wave: 'square', freq: 990, to: 1980, dur: .12, vol: .1 }],
  med: [{ wave: 'triangle', freq: 520, to: 1040, dur: .25, vol: .16, arp: [0, 4, 7, 12], step: .06 }],
  fury: [{ wave: 'saw', freq: 220, to: 880, dur: .5, vol: .18, arp: [0, 7, 12, 19], step: .05 }],
  tnt: [{ wave: 'noise', freq: 2000, to: 30, dur: 1.4, vol: .4 }, { wave: 'sine', freq: 110, to: 20, dur: 1.2, vol: .4 }],
  civ: [{ wave: 'saw', freq: 140, to: 100, dur: .5, vol: .18 }, { wave: 'square', freq: 120, to: 90, dur: .5, vol: .1 }],
  saved: [{ wave: 'square', freq: 523, dur: .1, vol: .12, arp: [0, 4, 7, 12], step: .07 }],
  goat: [{ wave: 'saw', freq: 520, to: 380, dur: .35, vol: .14, vib: [30, .1] }],
  hen: [{ wave: 'square', freq: 900, to: 1200, dur: .08, vol: .1 }, { wave: 'square', freq: 1000, to: 1300, dur: .08, vol: .08 }],
  snap: [{ wave: 'square', freq: 1200, to: 1600, dur: .03, vol: .06 }],
  card: [{ wave: 'square', freq: 392, dur: .12, vol: .13, arp: [0, 4, 7, 12], step: .1 }],
  stagger: [{ wave: 'saw', freq: 800, to: 100, dur: .6, vol: .2 }],
  select: [{ wave: 'square', freq: 660, dur: .05, vol: .1 }],
  confirm: [{ wave: 'square', freq: 880, to: 1320, dur: .08, vol: .12 }],
  rotor: [{ wave: 'noise', freq: 300, to: 200, dur: .05, vol: .05 }],
  howl: [{ wave: 'sine', freq: 300, to: 760, dur: .7, vol: .22, vib: [6, .05] }, { wave: 'sine', freq: 760, to: 420, dur: .7, vol: .2, vib: [7, .06], delay: .7 }],
  phase: [{ wave: 'saw', freq: 110, to: 220, dur: .5, vol: .2 }, { wave: 'noise', freq: 600, to: 100, dur: .5, vol: .15 }]
};
Au.play = (name, o = {}) => {
  if (!game || !game.audio) return;
  const v = LAY[name]; if (!v) return;
  const vol = o.vol ?? 1;
  for (const s of v) { if (s.delay) { game.after && game.after(s.delay, () => game.audio.sfx(Object.assign({}, s, { delay: 0, vol: s.vol * vol }))); continue; } game.audio.sfx(Object.assign({}, s, { vol: s.vol * vol, pitch: o.pitch })); }
};
// gibberish: each typed letter is a short blip whose pitch follows the letter, per speaker
const SPEAKERS = { DEN: { base: 260, wave: 'triangle', wob: .09 }, WOLF: { base: 150, wave: 'square', wob: .06 }, PRISONER: { base: 330, wave: 'saw', wob: .12 }, KRAGG: { base: 90, wave: 'saw', wob: .04 }, SQUAD: { base: 200, wave: 'pulse', wob: .08 } };
Au.voice = (who, ch) => {
  if (!game || !game.audio || !/[a-z]/i.test(ch)) return;
  const sp = SPEAKERS[who] || SPEAKERS.DEN, c = ch.toLowerCase().charCodeAt(0) - 96;
  const vowel = 'aeiou'.includes(ch.toLowerCase());
  const f = sp.base * (1 + ((c * 7) % 11 - 5) * sp.wob) * (vowel ? 1.25 : .9);
  game.audio.sfx({ wave: sp.wave, freq: f, to: f * (vowel ? 1.08 : .92), dur: vowel ? .075 : .04, vol: .07 });
};
// songs as data: tracks of note tokens
const dr = (a) => a;
WP.SONGS = {
  title: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E4 - - G4 - - B4 - - A4 - G4 - - E4 - | D4 - - F4 - - A4 - - G4 - F4 - - D4 - |' },
    { wave: 'triangle', vol: .16, notes: 'E2 - E2 - E3 - E2 - | D2 - D2 - D3 - D2 - | C2 - C2 - C3 - C2 - | B1 - B1 - B2 - B1 -' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . | k . h . s . h k' }] },
  op1: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .09, notes: 'E4 . G4 . A4 . G4 . | E4 . D4 . E4 . B3 . | C4 . E4 . G4 . E4 . | D4 . F4 . A4 . F4 .' },
    { wave: 'triangle', vol: .17, notes: 'E2 E2 . E2 E2 . E2 . | E2 E2 . E2 G2 . A2 . | C2 C2 . C2 C2 . C2 . | D2 D2 . D2 D2 . F2 .' },
    { wave: 'drums', vol: .13, notes: 'k h s h k h s h | k h s h k k s h' }] },
  op2: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'A3 - C4 - E4 - C4 - | B3 - D4 - F4 - D4 - | A3 - C4 - E4 - A4 - | G#3 - B3 - E4 - B3 -' },
    { wave: 'triangle', vol: .16, notes: 'A1 . A1 . A2 . A1 . | B1 . B1 . B2 . B1 . | A1 . A1 . A2 . A1 . | E1 . E1 . E2 . G#1 .' },
    { wave: 'drums', vol: .1, notes: 'k . . h s . h . | k . h . s . h h' }] },
  op3: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .09, notes: 'C5 . G4 . E4 G4 C5 . | D5 . A4 . F4 A4 D5 . | E5 . B4 . G4 B4 E5 . | D5 . G4 . B4 . D5 .' },
    { wave: 'triangle', vol: .16, notes: 'C3 . C3 G2 C3 . C3 G2 | D3 . D3 A2 D3 . D3 A2 | E3 . E3 B2 E3 . E3 B2 | G2 . G2 D3 G2 . B2 D3' },
    { wave: 'drums', vol: .13, notes: 'k h s h k h s h | k h s h k s s s' }] },
  op4: { bpm: 100, steps: 4, tracks: [
    { wave: 'saw', vol: .06, notes: 'D4 - - - F4 - - - | E4 - - - C4 - - - | D4 - - - A4 - - - | G#3 - - - B3 - - -' },
    { wave: 'triangle', vol: .17, notes: 'D2 . D2 . D2 . F2 . | C2 . C2 . C2 . E2 . | D2 . D2 . D2 . A2 . | E2 . E2 . E2 . G#2 .' },
    { wave: 'drums', vol: .12, notes: 'k . . . s . . h | k . h . s . k h' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'E4 E4 G4 E4 B4 E4 A4 E4 | D4 D4 F4 D4 A4 D4 G4 D4 | C4 C4 E4 C4 G4 C4 F4 C4 | B3 B3 D4 B3 F#4 B3 E4 B3' },
    { wave: 'saw', vol: .09, notes: 'E2 E2 E2 E3 E2 E2 E3 E2 | D2 D2 D2 D3 D2 D2 D3 D2 | C2 C2 C2 C3 C2 C2 C3 C2 | B1 B1 B1 B2 B1 B1 B2 B1' },
    { wave: 'drums', vol: .15, notes: 'k h s h k k s h | k h s h k s s k' }] },
  victory: { bpm: 126, steps: 4, tracks: [
    { wave: 'square', vol: .11, notes: 'C5 - E5 - G5 - E5 G5 | A5 - G5 - E5 - - - | F5 - A5 - C6 - A5 C6 | B5 - G5 - E5 - C5 -' },
    { wave: 'triangle', vol: .16, notes: 'C3 - G3 - C3 - G3 - | F2 - C3 - F2 - C3 - | F2 - C3 - F2 - C3 - | G2 - D3 - G2 - C3 -' }] },
  gameover: { bpm: 70, steps: 4, tracks: [{ wave: 'triangle', vol: .16, notes: 'E4 - - - D4 - - - | C4 - - - B3 - - - | A3 - - - - - - - | - - - - - - - -' }] }
};
Au.music = (name, o) => { if (!game || !game.audio) return; if (Au.cur === name) return; Au.cur = name; if (!name) { game.audio.music(null); return; } game.audio.music(WP.SONGS[name], Object.assign({ fade: .5 }, o)); };
})();
