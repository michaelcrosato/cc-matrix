// WALTER WHITEWASH: sound. Every note here is code: songs in the engine's note strings, sound effects as voice objects, and
// the people talk in gibberish (a babble of short tones, one per letter typed, each speaker with their own pitch and timbre).
(() => {
const WW = (globalThis.WW = globalThis.WW || {});
const A = {};
const bar = s => s.replace(/\s*\|\s*/g, ' | ');

A.songs = {
  // the desert at dusk: a lone slide-guitar over a heartbeat bass (A minor, slow)
  title: { bpm: 78, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: bar('A2 . . . . . A2 . | A2 . . . E2 . . . | F2 . . . . . F2 . | G2 . . . E2 . . . | A2 . . . . . A2 . | C3 . . . G2 . . . | F2 . . . . . F2 . | E2 . . . . . . .') },
    { name: 'lead', wave: 'pulse12', vol: .11, notes: bar('E4 - - - - - D4 - | C4 - - - A3 - - - | A3 - - - - - C4 - | D4 - - - - - - - | E4 - - - G4 - - - | A4 - - - - - G4 - | E4 - - - - - D4 - | E4 - - - - - - -') },
    { name: 'pad', wave: 'sine', vol: .08, notes: bar('A3 - - - - - - - | A3 - - - - - - - | F3 - - - - - - - | G3 - - - - - - - | A3 - - - - - - - | C4 - - - - - - - | F3 - - - - - - - | E3 - - - - - - -') },
    { name: 'drums', wave: 'drums', vol: .16, notes: bar('k . . . . . . . | . . . . s . . . | k . . . . . . . | . . . . s . . . | k . . . . . . . | . . . . s . . . | k . . . . . h . | . . . . s . h .') }
  ] },
  // walking the streets: a nervous pulse, a little twang
  explore: { bpm: 104, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .14, notes: bar('A2 . A2 . A2 . C3 . | A2 . A2 . E3 . D3 . | F2 . F2 . F2 . A2 . | G2 . G2 . G2 . B2 . | A2 . A2 . A2 . C3 . | A2 . A2 . E3 . G3 . | F2 . F2 . C3 . D3 . | E2 . E2 . G2 . B2 .') },
    { name: 'twang', wave: 'pulse', vol: .09, notes: bar('. . . . E4 . . . | . . G4 . . . E4 . | . . . . D4 . . . | . . F4 . . . D4 . | . . . . E4 . G4 . | . . A4 . . . G4 . | . . . . F4 . E4 . | . . D4 . . . B3 .') },
    { name: 'drums', wave: 'drums', vol: .14, notes: bar('k . h . s . h . | k . h h s . h . | k . h . s . h . | k . h . s h h h') }
  ] },
  // the cook: bubbling arpeggios, the clock ticking in the hats
  cook: { bpm: 126, steps: 4, tracks: [
    { name: 'arp', wave: 'square', vol: .08, notes: bar('A3 C4 E4 A4 E4 C4 E4 C4 | A3 C4 E4 A4 E4 C4 E4 C4 | F3 A3 C4 F4 C4 A3 C4 A3 | G3 B3 D4 G4 D4 B3 D4 B3') },
    { name: 'bass', wave: 'triangle', vol: .22, notes: bar('A2 . A2 . A2 . A2 . | A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . | G2 . G2 . G2 . G2 .') },
    { name: 'drums', wave: 'drums', vol: .14, notes: bar('k h . h s h . h | k h . h s h h h') }
  ] },
  // sirens and guns: faster, lower, every bar the same blow
  chase: { bpm: 152, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .17, notes: bar('A2 A2 . A2 A2 . A2 . | A2 A2 . A2 C3 . D3 . | F2 F2 . F2 F2 . F2 . | E2 E2 . E2 G2 . B2 .') },
    { name: 'stab', wave: 'pulse', vol: .09, notes: bar('A4 . . A4 . . E5 . | A4 . . A4 . C5 . D5 | F4 . . F4 . . C5 . | E4 . . E4 . G4 . B4') },
    { name: 'drums', wave: 'drums', vol: .18, notes: bar('k h s h k h s h | k h s h k s s s') }
  ] },
  // the Superlab: a low drone and a hammer
  boss: { bpm: 138, steps: 4, tracks: [
    { name: 'drone', wave: 'saw', vol: .15, notes: bar('D2 - - - D2 - - - | D2 - - - F2 - - - | G2 - - - G2 - - - | Ab2 - - - A2 - - -') },
    { name: 'hammer', wave: 'square', vol: .1, notes: bar('D3 . D3 . . D3 . . | D3 . D3 . F3 . . . | G3 . G3 . . G3 . . | Ab3 . Ab3 . A3 . . .') },
    { name: 'lead', wave: 'pulse12', vol: .08, notes: bar('. . . . A4 . . . | . . F4 . . . D4 . | . . . . B4 . . . | . . Ab4 . . . A4 .') },
    { name: 'drums', wave: 'drums', vol: .18, notes: bar('k . k . s . k . | k . k k s . k s') }
  ] },
  // a morning after: slow and almost kind
  victory: { bpm: 72, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .16, notes: bar('A4 - C5 - E5 - - - | D5 - C5 - A4 - - - | F4 - A4 - C5 - - - | E5 - D5 - C5 - - -') },
    { name: 'pad', wave: 'sine', vol: .12, notes: bar('A3 - - - - - - - | D3 - - - - - - - | F3 - - - - - - - | A3 - - - - - - -') }
  ] },
  // the day's end: a music box
  report: { bpm: 70, steps: 4, tracks: [
    { name: 'box', wave: 'sine', vol: .18, notes: bar('E5 . G5 . A5 . G5 . | E5 . D5 . C5 . . . | D5 . F5 . A5 . F5 . | E5 . D5 . . . . .') },
    { name: 'bass', wave: 'triangle', vol: .12, notes: bar('A2 . . . . . . . | C3 . . . . . . . | D3 . . . . . . . | E3 . . . . . . .') }
  ] }
};

A.sfx = {
  cash:    [{ wave: 'square', freq: 'E6', dur: .06, vol: .2 }, { wave: 'square', freq: 'B6', dur: .16, vol: .2, step: .07 }],
  bubble:  { wave: 'sine', freq: 300, to: 700, dur: .12, vol: .22 },
  vial:    { wave: 'triangle', freq: 'C6', to: 'G6', dur: .08, vol: .2 },
  siren:   [{ wave: 'saw', freq: 600, to: 900, dur: .35, vol: .12 }, { wave: 'saw', freq: 900, to: 600, dur: .35, vol: .12, step: .36 }],
  shot:    [{ wave: 'noise', freq: 1800, to: 120, dur: .18, vol: .35 }, { wave: 'square', freq: 220, to: 50, dur: .12, vol: .22 }],
  dry:     { wave: 'square', freq: 90, dur: .04, vol: .18 },
  punch:   [{ wave: 'noise', freq: 400, to: 80, dur: .09, vol: .3 }, { wave: 'triangle', freq: 120, to: 50, dur: .1, vol: .3 }],
  phone:   [{ wave: 'square', freq: 'A5', dur: .1, vol: .18 }, { wave: 'square', freq: 'A5', dur: .1, vol: .18, step: .14 }, { wave: 'square', freq: 'E5', dur: .16, vol: .18, step: .3 }],
  alert:   [{ wave: 'pulse', freq: 'E5', dur: .08, vol: .22 }, { wave: 'pulse', freq: 'E6', dur: .18, vol: .22, step: .1 }],
  perfect: [{ wave: 'triangle', freq: 'C5', dur: .1, vol: .25 }, { wave: 'triangle', freq: 'E5', dur: .1, vol: .25, step: .08 }, { wave: 'triangle', freq: 'G5', dur: .2, vol: .25, step: .16 }, { wave: 'triangle', freq: 'C6', dur: .3, vol: .25, step: .26 }],
  miss:    { wave: 'saw', freq: 200, to: 90, dur: .2, vol: .25 },
  sleep:   [{ wave: 'sine', freq: 'C5', dur: .3, vol: .2 }, { wave: 'sine', freq: 'G4', dur: .3, vol: .2, step: .3 }, { wave: 'sine', freq: 'E4', dur: .5, vol: .2, step: .6 }],
  knock:   [{ wave: 'noise', freq: 300, to: 100, dur: .07, vol: .4 }, { wave: 'noise', freq: 300, to: 100, dur: .07, vol: .4, step: .16 }, { wave: 'noise', freq: 300, to: 100, dur: .07, vol: .4, step: .32 }],
  hiss:    { wave: 'noise', freq: 6000, to: 3000, dur: .4, vol: .12 },
  boom2:   [{ wave: 'noise', freq: 600, to: 40, dur: .6, vol: .5 }, { wave: 'saw', freq: 90, to: 30, dur: .6, vol: .4 }]
};

// animalese: each letter a short tone. Vowels are rounder and longer; consonants clip. The speaker sets the register.
const VOWELS = 'aeiouy';
A.babble = (game, who, ch, pitchBase) => {
  const lc = String(ch).toLowerCase();
  if (!/[a-z]/.test(lc)) return;
  const idx = lc.charCodeAt(0) - 97, vowel = VOWELS.includes(lc);
  const base = pitchBase || 200, semis = (idx * 7) % 12 - 4;
  const freq = base * Math.pow(2, semis / 12) * (vowel ? 1 : 1.12);
  const wave = who === 'gus' || who === 'enforcer' || who === 'hank' ? 'triangle' : who === 'jimmy' || who === 'teacher' ? 'pulse' : who === 'sol' ? 'square' : 'triangle';
  game.audio.sfx({ wave, freq, dur: vowel ? .075 : .04, vol: .13 }, { vary: .02 });
};

A.install = game => { for (const k in A.sfx) game.audio.define(k, A.sfx[k]); };

WW.audio = A;
if (typeof module !== 'undefined') module.exports = A;
})();
