/* AMERICAN FOOTBALL FIASCO — audio, all written in code: sound effects, music, and the Animalese / Simlish-style voices. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF;

/* ---- the game (created here so every later module can use it) ---- */
const game = FF.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: 'FOOTBALL', bg: '#06060c',
  menu: {
    items: [['Dev Mode', () => FF.openDev && FF.openDev()]],
    settings: [
      { key: 'commentary', label: 'Commentary text', value: true },
      { key: 'voices', label: 'Announcer voices', value: true },
      { key: 'replays', label: 'Instant replays', value: true },
      { key: 'difficulty', label: 'CPU difficulty', options: ['Rookie', 'Pro', 'All-Pro', 'Legend'], value: 'Pro' }
    ],
    controls: { a: 'Action A / Snap / Juke / Tackle', b: 'Action B / Stiff-arm / Switch', x: 'Action X / Lateral / Jump', y: 'Fiasco Card', turbo: 'Turbo', swap: 'Throw to the back / Switch' },
    quit: 'title'
  }
});
const A = FF.A = game.audio;

/* ---- sound effects ---- */
const SFX = {
  whistle: [{ wave: 'square', freq: 2300, vib: [40, .04], dur: .5, vol: .1 }, { wave: 'square', freq: 2150, vib: [34, .05], dur: .5, vol: .08 }],
  hit: [{ wave: 'noise', freq: 900, to: 150, dur: .14, vol: .34, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 50, dur: .16, vol: .4 }],
  bighit: [{ wave: 'noise', freq: 1600, to: 90, dur: .32, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 110, to: 36, dur: .4, vol: .55 }, { wave: 'square', freq: 520, to: 90, dur: .12, vol: .14 }],
  megahit: [{ wave: 'noise', freq: 2400, to: 60, dur: .7, vol: .6, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 24, dur: .8, vol: .7 }, { wave: 'saw', freq: 300, to: 40, dur: .5, vol: .18 }],
  throw: { wave: 'noise', freq: 600, to: 2200, dur: .2, vol: .2, filter: 'bandpass' },
  catch: [{ wave: 'noise', freq: 1800, to: 700, dur: .08, vol: .3, filter: 'bandpass' }, { wave: 'triangle', freq: 330, to: 220, dur: .1, vol: .25 }],
  kick: [{ wave: 'noise', freq: 800, to: 150, dur: .1, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 180, to: 60, dur: .15, vol: .5 }],
  snap: { wave: 'noise', freq: 300, to: 100, dur: .1, vol: .3, filter: 'lowpass' },
  juke: { wave: 'noise', freq: 1200, to: 3000, dur: .12, vol: .18, filter: 'bandpass' },
  arm: { wave: 'triangle', freq: 260, to: 120, dur: .12, vol: .3 },
  turbo: { wave: 'saw', freq: 120, to: 300, dur: .2, vol: .06 },
  horn: [{ wave: 'saw', freq: 220, to: 220, dur: 1.1, vol: .2, vib: [6, .01] }, { wave: 'saw', freq: 330, dur: 1.1, vol: .15 }, { wave: 'square', freq: 440, dur: 1.1, vol: .1 }],
  card: [{ wave: 'square', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .16 }],
  cardplay: [{ wave: 'saw', freq: 200, to: 900, dur: .4, vol: .2 }, { wave: 'noise', freq: 800, to: 3200, dur: .4, vol: .12, filter: 'highpass' }],
  bolt: [{ wave: 'noise', freq: 4000, to: 200, dur: .6, vol: .5, filter: 'highpass' }, { wave: 'saw', freq: 900, to: 60, dur: .5, vol: .25 }],
  warp: { wave: 'sine', freq: 900, to: 90, dur: .8, vol: .25, vib: [12, .1] },
  mascot: [{ wave: 'square', freq: 'G3', arp: [0, 7, 0, 7], step: .09, dur: .5, vol: .18 }],
  fire: { wave: 'noise', freq: 500, to: 1500, dur: .6, vol: .2, filter: 'lowpass' },
  streak: { wave: 'square', freq: 'C4', arp: [0, 4, 7, 12, 16, 19], step: .05, dur: .4, vol: .15 },
  cheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.5, vol: .22, filter: 'bandpass' },
  roar: { wave: 'noise', freq: 400, to: 1000, dur: 2.4, vol: .3, filter: 'lowpass' },
  boo: { wave: 'noise', freq: 300, to: 160, dur: 1.2, vol: .2, filter: 'lowpass' },
  uh: { wave: 'sine', freq: 200, to: 130, dur: .18, vol: .18 },
  chime: [{ wave: 'triangle', freq: 'E6', dur: .35, vol: .12 }, { wave: 'triangle', freq: 'B6', dur: .5, vol: .1 }],
  tick: { wave: 'square', freq: 1400, dur: .03, vol: .08 },
  meter: { wave: 'pulse', freq: 600, to: 900, dur: .05, vol: .1 },
  blip: { wave: 'square', freq: 700, dur: .04, vol: .1 },
  fanfare: [{ wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 7, 12, 16], step: .1, dur: .8, vol: .15 }, { wave: 'triangle', freq: 'C3', arp: [0, 0, 7, 7, 12, 12, 12], step: .1, dur: .8, vol: .25 }]
};
for (const k in SFX) A.define('ff_' + k, SFX[k]);
FF.sfx = (n, o) => { try { A.sfx('ff_' + n, o); } catch (e) { /* audio blocked */ } };
FF.ui = (n) => { try { A.sfx(n); } catch (e) { /* audio blocked */ } };

/* ---- music ---- */
FF.SONGS = {
  title: { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .1, notes: 'G4 . G4 B4 . D5 . B4 | C5 . C5 E5 . G5 . E5 | A4 . A4 C5 . E5 . C5 | D5 . B4 . G4 . . . | G4 . G4 B4 . D5 . B4 | E5 . D5 . C5 . B4 . | A4 . C5 . D5 . F#5 . | G5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 . G2 . D3 . G2 . | C3 . C3 . G3 . C3 . | A2 . A2 . E3 . A2 . | D3 . D3 . A2 . D3 . | G2 . G2 . D3 . G2 . | C3 . C3 . E3 . C3 . | A2 . A2 . D3 . F#2 . | G2 . D3 . G2 . . .' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h . s . h k | k . h . s . h h' }
  ] },
  match: { bpm: 132, steps: 4, tracks: [
    { name: 'riff', wave: 'pulse', vol: .08, notes: 'E4 . . E4 . G4 . A4 | . . B4 . A4 . G4 . | E4 . . E4 . G4 . A4 | . . D5 . B4 . A4 . | D4 . . D4 . F#4 . G4 | . . A4 . G4 . F#4 . | E4 . . G4 . B4 . D5 | E5 - - . . . . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E2 . E3 . E2 . | E2 . E2 . G2 . A2 . | E2 . E2 . E3 . E2 . | E2 . E2 . B2 . A2 . | D2 . D2 . D3 . D2 . | D2 . D2 . F#2 . G2 . | E2 . E2 . G2 . B2 . | E2 . B2 . E3 . . .' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h . s . h . | k h h . s . h k' },
    { name: 'hype', wave: 'square', vol: .05, on: false, notes: 'B5 . . B5 . . B5 . | . . . . A5 . . . | G5 . . G5 . . G5 . | . . . . F#5 . . .' }
  ] },
  kick: { bpm: 90, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 . . . . . A2 . | . . . . E2 . . . | A2 . . . . . A2 . | . . E2 . G2 . A2 .' },
    { wave: 'square', vol: .05, notes: '. . E5 . . . . . | . . . . . . D5 . | . . E5 . . . . . | . . . . C5 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . . . . . h . | . . h . . . h h' }
  ] },
  half: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'C5 . E5 . G5 . E5 . | C5 . E5 . G5 . C6 . | A4 . C5 . E5 . C5 . | G4 . B4 . D5 . B4 .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . . G2 . . C3 . | C3 . . G2 . . C3 . | A2 . . E2 . . A2 . | G2 . . D2 . . G2 .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . | k . h . s . h h' }
  ] },
  story: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'D3 . . . A3 . . . | Bb2 . . . F3 . . . | G2 . . . D3 . . . | A2 . . . E3 . . .' },
    { wave: 'square', vol: .06, notes: 'F5 . . . E5 . D5 . | D5 . . . C5 . Bb4 . | Bb4 . . . D5 . . . | A4 . . . C#5 . . .' }
  ] },
  win: { bpm: 140, steps: 4, loop: true, tracks: [
    { wave: 'square', vol: .1, notes: 'C5 . E5 . G5 . C6 . | B5 . G5 . E5 . G5 . | A5 . F5 . C5 . F5 . | G5 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h h' }
  ] },
  lose: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .25, notes: 'A2 . . . E2 . . . | F2 . . . C2 . . . | D2 . . . A1 . . . | E2 . . . . . . .' },
    { wave: 'square', vol: .05, notes: 'A4 . . . G4 . . . | F4 . . . E4 . . . | D4 . . . C4 . . . | B3 - - - . . . .' }
  ] }
};
FF.music = (name, o) => { try { if (!name) A.music(null, o); else A.music(FF.SONGS[name], Object.assign({ restart: false }, o)); } catch (e) { /* audio blocked */ } };

/* ---- the voices: Animalese / Simlish babble. Each typed letter plays a short syllable; the pitch follows the letter ---- */
const VOICES = {
  CHUCK: { base: 120, wave: 'square', dur: .06, vol: .09, spread: 1.0 }, DOTTIE: { base: 260, wave: 'triangle', dur: .06, vol: .13, spread: 1.0 },
  COACH: { base: 150, wave: 'saw', dur: .07, vol: .06, spread: .9 }, GLOVES: { base: 300, wave: 'pulse', dur: .05, vol: .09, spread: 1.2 },
  TANK: { base: 70, wave: 'saw', dur: .09, vol: .09, spread: .7 }, FROSTY: { base: 380, wave: 'triangle', dur: .05, vol: .14, spread: 1.3 },
  COMMISSIONER: { base: 95, wave: 'square', dur: .1, vol: .08, spread: .8, vib: [7, .03] }, NARRATOR: { base: 190, wave: 'sine', dur: .06, vol: .12, spread: 1 }
};
FF.babble = (who, ch, i) => {
  const v = VOICES[who] || VOICES.NARRATOR; if (!game.settings || game.settings.voices === false) return;
  const c = (ch || '').toLowerCase();
  if (c && !/[a-z0-9]/.test(c)) return;
  const code = c ? c.charCodeAt(0) : (i * 7 + 3), vowel = /[aeiou]/.test(c), semi = ((code * 5 + i) % 12) * v.spread - (vowel ? 0 : 3);
  const f = v.base * Math.pow(2, (semi + (vowel ? 4 : 0)) / 12);
  try { A.sfx({ wave: v.wave, freq: f, to: f * (vowel ? 1.06 : .92), dur: v.dur * (vowel ? 1.4 : 1), vol: v.vol, vib: v.vib }, { vary: .04 }); } catch (e) { /* audio blocked */ }
};
// a whole line of babble played at once (for the commentary ticker; letters come at the typing pace)
FF.babbleLine = (who, text) => { let i = 0; const t0 = game.real; void t0; for (const ch of text) { game.after((i++) * .045, () => { if (i % 2) FF.babble(who, ch, i); }); } };
})();
