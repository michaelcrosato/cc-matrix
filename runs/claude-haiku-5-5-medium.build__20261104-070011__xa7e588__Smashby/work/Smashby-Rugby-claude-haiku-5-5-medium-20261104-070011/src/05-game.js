// THE GAME OBJECT: the controls (PlayStation buttons by default, the keyboard's own keys), the pause menu's items, the
// game's own settings, the sounds and the music. Built before the scenes so they can use it.
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  x: ['Space', 'KeyJ', 'Pad0'], sq: ['KeyF', 'Pad2'], ci: ['KeyC', 'KeyK', 'Pad1'], tri: ['KeyR', 'Pad3'],
  l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7'], dev: ['Backquote']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
KEYS.halves = undefined; delete KEYS.halves;

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: KEYS,
  bg: '#07060d', id: 'smashby',
  menu: {
    items: [['Dev mode', () => SM.devFromPause()]],
    settings: [
      { key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation',
        options: [['playstation', 'PlayStation'], ['xbox', 'Xbox A B X Y']], apply: (g, v) => { g.input.glyphs = v; } },
      { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'pro', options: [['pro', 'Pro'], ['rookie', 'Rookie'], ['legend', 'Legend']],
        apply: (g, v) => { SM.difficulty = v; } },
      { key: 'halves', group: 'Game', label: 'Half length', type: 'select', value: 120, options: [[120, '2 minutes'], [180, '3 minutes'], [240, '4 minutes'], [300, '5 minutes']],
        apply: (g, v) => { SM.TUNE.set('halfLength', +v); } },
      { key: 'commentary', group: 'Game', label: 'Commentary', type: 'select', value: 'on', options: [['on', 'On'], ['text', 'Text only'], ['off', 'Off']],
        apply: (g, v) => { SM.commentary = v; } },
      { key: 'refCone', group: 'Game', label: "Show the ref's view", type: 'select', value: 'on', options: [['on', 'On'], ['off', 'Off']],
        apply: (g, v) => { SM.refCone = v === 'on'; } }
    ],
    controls: { x: 'Step / Tackle', sq: 'Fend / Dive', ci: 'Kick / Switch', tri: 'Super', l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo' },
    quit: 'title'
  }
});
SM.game = game;
SM.setting = k => game.settings[k];
SM.difficulty = 'pro';
SM.commentary = 'on';
SM.refCone = true;
SM.store = E.store;
SM.TUNE.load();

// the sounds: all written in code (the engine's chip synth), the whistle and the hooter included
const A = game.audio;
const VOICES = {
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .34, vol: .16 },
  hooter: { wave: 'saw', freq: 220, to: 180, dur: 1.4, vol: .22, vib: [6, .03] },
  thud: { wave: 'sine', freq: 140, to: 60, dur: .16, vol: .45 },
  crunch: { wave: 'noise', freq: 900, to: 180, dur: .28, vol: .35, filter: 'lowpass' },
  boom: { wave: 'sine', freq: 90, to: 40, dur: .4, vol: .5 },
  kick: { wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .25, filter: 'lowpass' },
  bounce: { wave: 'triangle', freq: 300, to: 180, dur: .1, vol: .2 },
  doink: { wave: 'triangle', freq: 1200, dur: .5, vol: .25 },
  crowd: { wave: 'noise', freq: 600, to: 900, dur: 1.6, vol: .18, filter: 'lowpass' },
  horn: { wave: 'square', freq: 440, arp: [0, 4, 7], step: .04, dur: .5, vol: .18 },
  pie: { wave: 'triangle', freq: 500, to: 700, dur: .25, vol: .2, arp: [0, 7], step: .08 },
  super: { wave: 'square', freq: 330, arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .2 },
  zap: { wave: 'noise', freq: 2000, to: 80, dur: .4, vol: .3 },
  flame: { wave: 'noise', freq: 400, to: 1200, dur: .6, vol: .18, filter: 'lowpass' },
  slide: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .18 },
  turbo: { wave: 'noise', freq: 300, to: 900, dur: .25, vol: .14 },
  tryTune: { wave: 'square', freq: 523, arp: [0, 4, 7, 12, 16], step: .08, dur: .2, vol: .16 },
  yellow: { wave: 'saw', freq: 220, to: 110, dur: .9, vol: .18 }
};
for (const [k, v] of Object.entries(VOICES)) A.define(k, v);
// the babble: a syllable a letter, pitched by the speaker's base and the letter
SM.babble = (ch, base) => {
  if (!SM.commentary || SM.commentary === 'off' || SM.commentary === 'text') return;
  const c = ch.toLowerCase(), semi = (c.charCodeAt(0) % 12) - 6 + (/[aeiou]/.test(c) ? -4 : 0);
  A.sfx({ wave: 'square', freq: base * Math.pow(2, semi / 12), to: base * Math.pow(2, semi / 12) * .94, dur: .05, vol: ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? .1 : .06 });
};

const SONG_TITLE = { bpm: 152, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
const SONG_MATCH = { bpm: 126, steps: 4, tracks: [
  { wave: 'square', vol: .05, notes: 'C4 E4 G4 C5 | B4 G4 E4 G4 | A4 C5 E5 C5 | G4 - - . | F4 A4 C5 F5 | E5 C5 G4 C5 | D5 F5 A5 F5 | G4 B4 D5 G5' },
  { wave: 'triangle', vol: .24, notes: 'C2 . C3 . G2 . G3 . | A2 . A3 . E2 . E3 . | F2 . F3 . C2 . C3 . | G2 . G3 . D2 . D3 .' },
  { wave: 'drums', vol: .09, notes: 'k . s . k k s . | k . s . k . s s' }] };
SM.songs = { title: SONG_TITLE, match: SONG_MATCH };
