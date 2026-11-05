(() => {
'use strict';
/* ---- 00-core.js ---- */
/* =====================================================================================
 * BREAKING BOND — 00 CORE
 * The game object, the controls (a controller-first layout with native keyboard + mouse), the settings (button
 * symbols, axis inversion for pads that report flipped axes, difficulty, aim assist, voices), the gibberish voices,
 * the music (all written as note strings for the engine's chip synth) and the world's objects as data (E.SHAPES).
 * ===================================================================================== */
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2;
const HUB = !!(window.AIHub && window.AIHub.active);
const TOUCH_ONLY = (() => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean)); } catch (e) { return false; } })();
const VERSION = '1.0.0';

/* ---- Pad axis repair: some pads (~10%) report a stick's axes flipped. The settings' toggles flip them back for every
 * reader (menus, play, every player) by handing the engine corrected copies of the gamepads ---- */
const PADFIX = { x: false, y: false };
(() => {
  try {
    const nav = navigator; if (!nav.getGamepads) return;
    const raw = nav.getGamepads.bind(nav);
    const fixed = () => {
      const list = raw();
      if (!PADFIX.x && !PADFIX.y) return list;
      return Array.from(list || [], p => p && ({ id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons,
        vibrationActuator: p.vibrationActuator, axes: Array.from(p.axes, (v, i) => ((i & 1) ? PADFIX.y : PADFIX.x) ? -v : v) }));
    };
    Object.defineProperty(nav, 'getGamepads', { value: fixed, configurable: true, writable: true });
  } catch (e) { /* a browser that won't let us: the toggles do nothing there */ }
})();

/* ---- Controls: the layout a PC player of a top-down action game expects (WASD, mouse aims and throws, E interacts,
 * Space rolls, Shift sprints, C sneaks), and a DualSense layout (✕ interact, ○ roll, □ shove, △ catalyst, R2 throw,
 * L2 sneak, L1 switch flask, L3 sprint, R3 camera view, Options pause) ---- */
const CONTROLS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  interact: ['KeyE', 'Pad0'], throw: ['Mouse0', 'Pad7', 'Pad5'], melee: ['Mouse2', 'KeyF', 'Pad2'], dodge: ['Space', 'Pad1'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'], sneak: ['KeyC', 'ControlLeft', 'Pad6'], swap: ['KeyR', 'Pad4'], catalyst: ['KeyQ', 'Pad3'], view: ['KeyV', 'Pad11'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyE', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const ACTION_NAMES = { interact: 'Interact / talk', throw: 'Throw flask', melee: 'Shove', dodge: 'Dodge roll', sprint: 'Sprint', sneak: 'Sneak (hold)',
  swap: 'Switch flask', catalyst: 'Catalyst (the hat)', view: 'Camera view' };

const SETTINGS = [
  { key: 'glyphs', group: 'Gamepad', label: 'Button symbols', options: [['playstation', 'PlayStation  ✕ ○ □ △'], ['xbox', 'Xbox  A B X Y']], value: 'playstation',
    help: 'The controller buttons the prompts show', apply: (g, v) => { g.input.glyphs = v; (g.players || []).forEach(p => { p.glyphs = v; }); } },
  { key: 'invertX', group: 'Gamepad', label: 'Invert stick left / right', value: false, help: 'Fixes a controller whose sticks read backwards side to side', apply: (g, v) => { PADFIX.x = !!v; } },
  { key: 'invertV', group: 'Gamepad', label: 'Invert stick up / down', value: false, help: 'Fixes a controller whose sticks read upside down', apply: (g, v) => { PADFIX.y = !!v; } },
  { key: 'difficulty', group: 'Game', label: 'Difficulty', options: ['Story', 'Normal', 'Hard'], value: 'Normal', help: 'Story: enemies hit softly and guards are slow to notice' },
  { key: 'assist', group: 'Game', label: 'Aim assist', value: true, help: 'Flasks thrown without aiming find the nearest enemy' },
  { key: 'cones', group: 'Game', label: 'Show sight cones', value: true, help: 'Draw where guards and agents are looking' },
  { key: 'voices', group: 'Game', label: 'Gibberish voices', value: true, help: 'Characters babble as their lines type' },
  { key: 'hints', group: 'Game', label: 'Hints', value: true, help: 'Show button prompts and tips' }
];

const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: CONTROLS, bg: '#0b0806', id: 'breaking-bond',
  menu: { settings: SETTINGS, controls: ACTION_NAMES, quit: HUB ? false : 'title', items: HUB ? [] : [['Restart from checkpoint', () => { if (window.__bbRestart) window.__bbRestart(); }]] } });
const P = game.particles, L = game.lights, A = game.audio;
const ui = new E.Shell(game, { theme: { accent: '#59c8f0', ink: '#f4efe6', paper: '#15110d', muted: '#b9ab96', danger: '#ff5a4a', line: '#5a4a38' } });
const DIFF = () => ({ Story: { dmg: .5, sight: .6, hp: .75 }, Normal: { dmg: 1, sight: 1, hp: 1 }, Hard: { dmg: 1.5, sight: 1.35, hp: 1.3 } })[game.settings.difficulty] || { dmg: 1, sight: 1, hp: 1 };
// the prompt for an action on the device used last; a mouse player sees the key for actions the mouse has no button for
const label = (a, I = game.input) => {
  if (I.lastDevice === 'mouse' || I.lastDevice === 'touch') { const m = String(I.label(a, 'mouse') || ''); return /click/i.test(m) ? m : String(I.label(a, 'keyboard') || a); }
  return String(I.label(a) || a);
};
const isPad = (I = game.input) => I.lastDevice === 'gamepad';
const isTouch = () => game.input.lastDevice === 'touch';

/* ---- Gibberish voices (Animalese-style): each letter a short formant chirp, pitched by the letter, per speaker ---- */
const VOICES = {
  GRAY: { base: 128, wave: 'triangle', spread: .5, vol: .16, slide: .92 },
  DANNY: { base: 220, wave: 'pulse', spread: .9, vol: .1, slide: 1.12 },
  MARTY: { base: 105, wave: 'saw', spread: .4, vol: .08, slide: .9 },
  TITO: { base: 160, wave: 'square', spread: 1.2, vol: .08, slide: 1.25 },
  BARRY: { base: 190, wave: 'pulse12', spread: .8, vol: .08, slide: 1.05 },
  CAROL: { base: 245, wave: 'triangle', spread: .5, vol: .16, slide: 1.05 },
  DOCTOR: { base: 150, wave: 'sine', spread: .3, vol: .2, slide: .97 },
  KID: { base: 280, wave: 'pulse', spread: .7, vol: .08, slide: 1.1 },
  HUGO: { base: 115, wave: 'triangle', spread: .4, vol: .16, slide: .95 },
  AGENT: { base: 120, wave: 'square', spread: .3, vol: .07, slide: .9 },
  AURELIO: { base: 98, wave: 'sine', spread: .25, vol: .22, slide: 1 },
  NARRATOR: null
};
const VOWELS = 'aeiouy';
function babble(who, ch) {
  const v = VOICES[who];
  if (!v || !game.settings.voices || !ch) return;
  const c = ch.toLowerCase(), k = c.charCodeAt(0) - 97;
  if (k < 0 || k > 25) return;
  const semis = ((k * 5) % 12 - 6) * v.spread, f = v.base * Math.pow(2, semis / 12), vowel = VOWELS.includes(c);
  A.sfx([{ wave: v.wave, freq: f, to: f * v.slide, dur: vowel ? .07 : .045, vol: v.vol, vib: [24, .03] }, { wave: 'sine', freq: f * (vowel ? 2.5 : 3.2), to: f * 2.2, dur: .04, vol: v.vol * .5 }], { vary: .06 });
}

/* ---- Music: desert noir on the chip synth. Every song is note strings ---- */
const SONGS = {
  title: { bpm: 78, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 - - - - - E2 - | A2 - - - - - G2 - | F2 - - - - - C3 - | E2 - - - - - E2 - | A2 - - - - - E2 - | A2 - - - - - G2 - | D3 - - - - - A2 - | E2 - - - - - G#2 -' },
    { wave: 'saw', vol: .045, notes: 'A3 C4 E4 A4 E4 C4 A3 C4 | G3 B3 D4 G4 D4 B3 G3 B3 | F3 A3 C4 F4 C4 A3 F3 A3 | E3 G#3 B3 E4 B3 G#3 E3 G#3 | A3 C4 E4 A4 E4 C4 A3 C4 | G3 B3 D4 G4 D4 B3 G3 B3 | D3 F3 A3 D4 A3 F3 D3 F3 | E3 G#3 B3 E4 B3 G#3 E3 G#3' },
    { wave: 'pulse12', vol: .06, notes: '. . . . E5 - - - | D5 - C5 - B4 - - - | . . . . C5 - - - | B4 - - - G#4 - - - | . . . . E5 - - - | G5 - F5 - E5 - D5 - | F5 - - - E5 - D5 - | E5 - - - - - - -' },
    { wave: 'drums', vol: .08, notes: 'k . . h s . h . | k . . h s . h h | k . . h s . h . | k . k h s . h o' }] },
  school: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . E2 . G2 .' },
    { wave: 'pulse', vol: .05, notes: 'E4 G4 C5 G4 E4 G4 C5 G4 | F4 A4 C5 A4 F4 A4 C5 A4 | G4 B4 D5 B4 G4 B4 D5 B4 | E4 G4 C5 G4 E4 G4 E5 D5' },
    { wave: 'drums', vol: .06, notes: 'k . h . s . h . | k . h . s . h h' }] },
  sad: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'D3 - - - - - - - | A2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -' },
    { wave: 'sine', vol: .12, notes: 'F4 - - - E4 - - - | E4 - - - C#4 - - - | D4 - - - F4 - - - | E4 - - - - - - -' }] },
  stealth: { bpm: 96, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'E2 . . E2 . . E2 . | E2 . . E2 . G2 . . | C2 . . C2 . . C2 . | D2 . . D2 . B1 . .' },
    { name: 'tick', wave: 'drums', vol: .05, notes: 'h . . h . . h . h . . h . . h .' },
    { name: 'lead', wave: 'pulse12', vol: .05, notes: 'B4 - . . . . A4 . | G4 - . . F#4 . E4 . | . . . . C5 - B4 . | A4 - . . B4 - . . ' },
    { name: 'chase', wave: 'drums', vol: .12, on: false, notes: 'k . h k s . h . k k h . s . h s' },
    { name: 'alarm', wave: 'saw', vol: .05, on: false, notes: 'E3 E3 E4 E3 B3 E3 D4 E3 | E3 E3 E4 E3 G4 E3 F#4 E3 | C3 C3 C4 C3 G3 C3 B3 C3 | D3 D3 D4 D3 A3 D3 F#3 D3' }] },
  cook: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'A2 . A2 C3 . A2 G2 . | A2 . A2 C3 . D3 C3 . | F2 . F2 A2 . F2 E2 . | E2 . E2 G#2 . B2 E3 .' },
    { wave: 'pulse12', vol: .045, notes: 'A4 . C5 . E5 . C5 . | A4 . C5 . F5 E5 D5 . | F4 . A4 . C5 . A4 . | G#4 . B4 . E5 - D5 .' },
    { wave: 'drums', vol: .08, notes: 'k . h k s . h . | k . h . s h h k' }] },
  fight: { bpm: 142, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 G2 E2 A2 E2 | E2 E2 E3 E2 Bb2 A2 G2 E2 | C2 C2 C3 C2 E2 C2 G2 C2 | D2 D2 D3 D2 F#2 D2 A2 D2' },
    { wave: 'pulse', vol: .05, notes: 'E4 - G4 - A4 - B4 - | Bb4 - A4 - G4 - E4 - | C5 - B4 - G4 - E4 - | F#4 - A4 - D5 - - -' },
    { wave: 'drums', vol: .11, notes: 'k . h k s . h k | k k h . s . h s' }] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .11, notes: 'D2 D2 D3 D2 F2 D2 G#2 A2 | D2 D2 D3 D2 C3 Bb2 A2 F2 | Bb1 Bb1 Bb2 Bb1 D2 F2 A2 Bb2 | A1 A1 A2 A1 C#2 E2 G2 A2' },
    { wave: 'square', vol: .045, notes: 'D5 - - A4 - - F5 - | E5 - D5 - C5 - A4 - | Bb4 - - D5 - - F5 - | E5 - C#5 - A4 - - -' },
    { wave: 'drums', vol: .12, notes: 'k k s . k k s h | k . s k k s s s' }] },
  town: { bpm: 88, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 . . G2 Bb2 . C3 . | G2 . . G2 F2 . D2 . | Eb2 . . Eb2 G2 . Bb2 . | D2 . . D2 F#2 . A2 .' },
    { name: 'keys', wave: 'pulse12', vol: .045, notes: 'G4 . Bb4 . D5 . . . | F4 . A4 . C5 . . . | Eb4 . G4 . Bb4 . . . | D4 . F#4 . A4 . C5 .' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'k . h . s . h h | k . h k s . h .' },
    { name: 'chase', wave: 'saw', vol: .05, on: false, notes: 'G3 G3 G4 G3 D4 G3 F4 G3 | Eb3 Eb3 Eb4 Eb3 Bb3 Eb3 D4 Eb3' }] },
  win: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'A4 C5 E5 A5 - - G5 - | F5 - E5 - D5 - E5 - | - - - - . . . .' },
    { wave: 'triangle', vol: .28, notes: 'A2 - - - - - - - | F2 - - - E2 - - - | A2 - - - . . . .' }] }
};
let musicNow = null;
function music(name, o) { if (musicNow === name) return; musicNow = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); }

/* ---- Sounds of our own ---- */
A.define('glass', [{ wave: 'noise', freq: 3000, to: 600, dur: .18, vol: .25 }, { wave: 'sine', freq: 2400, to: 3600, dur: .12, vol: .12 }]);
A.define('fizz', { wave: 'noise', freq: 1200, to: 4000, dur: .35, vol: .12 });
A.define('pour', { wave: 'noise', freq: 500, to: 800, dur: .12, vol: .1 });
A.define('bubble', { wave: 'sine', freq: 300, to: 700, dur: .07, vol: .12 });
A.define('cough', [{ wave: 'noise', freq: 400, to: 200, dur: .15, vol: .25 }, { wave: 'noise', freq: 380, to: 180, dur: .18, vol: .2 }]);
A.define('gunshot', [{ wave: 'noise', freq: 900, to: 80, dur: .2, vol: .35 }, { wave: 'square', freq: 120, to: 40, dur: .12, vol: .2 }]);
A.define('siren', { wave: 'square', freq: 700, to: 1100, dur: .4, vol: .06, vib: [4, .2] });
A.define('cash', [{ wave: 'square', freq: 'E6', dur: .05, vol: .12 }, { wave: 'square', freq: 'B6', dur: .12, vol: .12 }]);
A.define('ding', { wave: 'sine', freq: 'A5', to: 'A5', dur: .5, vol: .2 });
A.define('bell', [{ wave: 'square', freq: 'E5', dur: .8, vol: .08, vib: [30, .01] }, { wave: 'square', freq: 'C5', dur: .8, vol: .06 }]);
A.define('tick', { wave: 'square', freq: 1800, dur: .02, vol: .08 });
A.define('alarm', { wave: 'saw', freq: 500, to: 900, dur: .3, vol: .12 });

/* ---- Objects as data: the RV, cars, the lab, the classroom, the junkyard (sized for a 26-unit hero) ---- */
Object.assign(E.SHAPES, {
  rv: { about: 'tired white and tan motorhome, the lab', tags: 'vehicle', mats: { w: '#e6dcc6 none', t: '#b4874e none', g: '#3a5a6e glaze', k: '#1c1a1a none', r: '#8a3a2a none', m: 'steel' },
    foot: [-8, -16, 8, 16],
    parts: [['box', 'w', [0, 0, 4], [15, 32, 15]], ['box', 't', [0, 0, 8], [15.4, 32.4, 3]], ['box', 'w', [0, -2, 19], [14, 26, 2]], ['box', 'g', [0, 16.1, 11], [12, .8, 5]],
      ['box', 'm', [0, 16.4, 4], [15, 1, 3]], ['mirror', 'x', ['box', 'g', [7.7, 6, 12], [.6, 7, 4]]], ['mirror', 'x', ['box', 'g', [7.7, -8, 12], [.6, 5, 4]]],
      ['box', 'r', [7.8, -2, 4], [.4, 5, 11]], ['mirror', 'xy', ['box', 'k', [7, 10, 0], [2, 6, 6]]], ['box', 'm', [0, -6, 21], [5, 5, 2]]] },
  sedan: { about: 'family sedan', tags: 'vehicle', mats: { b: '#7a8a5a none', g: '#2a3a48 glaze', k: '#161616 none', c: 'steel' }, foot: [-6, -13, 6, 13],
    parts: [['box', 'b', [0, 0, 3], [12, 26, 6]], ['box', 'b', [0, -1, 9], [11, 13, 4]], ['box', 'g', [0, 5.6, 9.5], [10, .6, 3]], ['box', 'g', [0, -7.6, 9.5], [10, .6, 3]],
      ['mirror', 'xy', ['box', 'k', [5.6, 8, 0], [2, 5, 5]]], ['box', 'c', [0, 13.2, 3], [12, .6, 2]]] },
  cruiser: { about: 'unmarked agency cruiser, light bar', tags: 'vehicle police', mats: { b: '#20242c none', g: '#2a3a48 glaze', k: '#101010 none', w: '#e8e8e8 none', r: '#ff3a3a none glow=1', u: '#3a6aff none glow=1' },
    foot: [-6, -13, 6, 13],
    parts: [['box', 'b', [0, 0, 3], [12, 26, 6]], ['box', 'w', [0, 0, 5], [12.2, 12, 2]], ['box', 'b', [0, -1, 9], [11, 13, 4]], ['box', 'g', [0, 5.6, 9.5], [10, .6, 3]],
      ['box', 'r', [-2.5, -1, 13], [4, 2, 1.5]], ['box', 'u', [2.5, -1, 13], [4, 2, 1.5]], ['mirror', 'xy', ['box', 'k', [5.6, 8, 0], [2, 5, 5]]]] },
  junker: { about: 'rusted wreck of a car', tags: 'vehicle junk', mats: { b: 'rusted', g: '#1a1a1a none', k: '#161616 none' }, foot: [-6, -13, 6, 13],
    parts: [['box', 'b', [0, 0, 1], [12, 26, 6]], ['box', 'b', [0, -2, 7], [11, 11, 3], { rot: [6, 0, 0] }], ['box', 'g', [0, 3.6, 7.5], [10, .6, 2]], ['mirror', 'x', ['box', 'k', [5.6, 8, 0], [2, 5, 4]]]] },
  desk: { about: 'school desk with its chair', tags: 'furniture school', mats: { t: '#c89a5a none', l: 'steel', s: '#3a5a8a none' },
    parts: [['box', 't', [0, 0, 11], [14, 9, 1.5]], ['mirror', 'xy', ['box', 'l', [6, 3.5, 0], [1, 1, 11]]], ['box', 's', [0, 8, 6], [8, 7, 1.2]], ['box', 's', [0, 11.3, 6], [8, 1, 8]], ['mirror', 'x', ['box', 'l', [3.5, 8, 0], [1, 1, 6]]]] },
  chalkboard: { about: 'green chalkboard on a frame', tags: 'school', mats: { b: '#2e4a36 none', f: 'oak', c: '#e8e8e0 none' },
    parts: [['box', 'f', [0, 0, 8], [44, 2, 20]], ['box', 'b', [0, 1.2, 9], [42, .6, 18]], ['box', 'f', [0, 2, 8], [44, 3, 1]], ['box', 'c', [-12, 1.6, 16], [10, .4, .6]], ['box', 'c', [4, 1.6, 20], [16, .4, .6]], ['box', 'c', [-6, 1.6, 12], [20, .4, .6]]] },
  labbench: { about: 'chemistry bench with flasks', tags: 'lab', mats: { t: '#2a2a30 none', s: 'steel', f: '#6ad0f0 glaze', a: '#e0a040 glaze', g: '#c8e8f0 glaze' },
    parts: [['box', 's', [0, 0, 0], [22, 10, 12]], ['box', 't', [0, 0, 12], [23, 11, 1]], ['cyl', 'f', [-6, 0, 13], 2.4, 3, { r2: 1 }], ['cyl', 'g', [-6, 0, 16], .8, 3],
      ['cyl', 'a', [1, 1, 13], 1.8, 5], ['cyl', 'g', [6, -1, 13], 2.2, 2.5, { r2: .9 }], ['box', 's', [6, -1, 16], [.6, .6, 6]]] },
  cookrig: { about: 'the cook: burner, flask and condenser on a fold-out table', tags: 'lab', mats: { t: '#5a4a3a none', s: 'steel', f: '#59c8f0 glaze glow=.5', g: '#c8e8f0 glaze', r: '#e05a2a none glow=1' },
    parts: [['box', 't', [0, 0, 10], [24, 12, 1.5]], ['mirror', 'xy', ['box', 's', [10, 4.5, 0], [1, 1, 10]]], ['cyl', 's', [-4, 0, 11.5], 3, 3], ['box', 'r', [-4, 0, 14.5], [3, 3, .6]],
      ['cyl', 'f', [-4, 0, 15], 3.2, 4, { r2: 1.2 }], ['cyl', 'g', [-4, 0, 19], 1, 4], ['box', 'g', [2, 0, 21], [12, 1.2, 1.2], { rot: [0, -20, 0] }], ['cyl', 'g', [7, 0, 11.5], 2, 5]] },
  dumpster: { about: 'green steel dumpster', tags: 'town', mats: { b: '#2f5a3a metal', l: '#25472e none' }, foot: [-11, -6, 11, 6],
    parts: [['box', 'b', [0, 0, 1], [22, 12, 12]], ['wedge', 'l', [0, 0, 13], [22, 12, 2]], ['mirror', 'x', ['box', 'l', [9, 6.2, 4], [2, .6, 6]]]] },
  tires: { about: 'a stack of old tires', tags: 'junk', mats: { k: '#1c1c1e none' }, parts: [['cyl', 'k', [0, 0, 0], 6, 4], ['cyl', 'k', [0, 0, 4], 6, 4], ['cyl', 'k', [.6, .4, 8], 6, 4]] },
  drum: { about: 'blue chemical drum', tags: 'lab junk', mats: { b: '#2a5aa8 metal', y: '#e8c040 none' }, parts: [['cyl', 'b', [0, 0, 0], 5.5, 15], ['cyl', 'y', [0, 0, 6], 5.6, 2]] },
  vending: { about: 'school vending machine', tags: 'school', mats: { b: '#a82a2a none', g: '#9ad8f0 glaze glow=.4' }, parts: [['box', 'b', [0, 0, 0], [12, 9, 26]], ['box', 'g', [-1.5, 4.6, 8], [7, .4, 14]]] },
  bench: { about: 'bus bench with an ad', tags: 'town', mats: { w: '#c8a050 none', m: 'iron', a: '#f0e0a0 none' },
    parts: [['box', 'w', [0, 0, 5], [26, 6, 1.4]], ['box', 'a', [0, -3, 6], [26, 1, 8]], ['mirror', 'x', ['box', 'm', [11, 0, 0], [1.4, 5, 5]]]] },
  mesa: { about: 'red desert boulder', tags: 'desert', mats: { r: '#a8603a stones' }, parts: [['rock', 'r', [0, 0, 4], 10, { sz: .7, seed: 3, rough: .3 }]] },
  crusher: { about: 'car crusher, hulking yellow press', tags: 'junk', mats: { y: '#d8a020 metal', k: '#2a2a2a none', s: 'steel' }, foot: [-14, -12, 14, 12],
    parts: [['box', 'y', [0, 0, 0], [28, 24, 10]], ['box', 'k', [0, 0, 10], [22, 18, 2]], ['mirror', 'x', ['box', 'y', [12, 0, 10], [4, 24, 22]]], ['box', 'y', [0, 0, 28], [28, 24, 5]], ['box', 's', [0, 0, 24], [20, 16, 4]]] },
  fryer: { about: 'Pollo Sol chicken statue on a pole', tags: 'town', mats: { y: '#f0c030 glaze', r: '#d83a2a none', m: 'iron' },
    parts: [['cyl', 'm', [0, 0, 0], 1.2, 26], ['ball', 'y', [0, 0, 31], 6, { sz: .8 }], ['ball', 'y', [0, 4, 37], 3.5], ['box', 'r', [0, 7, 38], [1.5, 2, 1.5]], ['box', 'r', [0, 4, 41], [1, 3, 2]]] },
  carwash: { about: 'car wash arch with brushes', tags: 'town', mats: { f: '#d0d4dc metal', b: '#3a8ad8 none', r: '#d83a3a none' }, foot: [-16, -4, 16, 4],
    parts: [['mirror', 'x', ['box', 'f', [15, 0, 0], [2, 8, 28]]], ['box', 'f', [0, 0, 26], [32, 8, 3]], ['mirror', 'x', ['cyl', 'b', [9, 0, 2], 3.5, 20]], ['box', 'r', [0, 4.2, 22], [20, .6, 3]]] }
});

/* ---- Small helpers ---- */
const R16 = 16;
const cellXY = (cx, cy) => ({ x: (cx + .5) * R16, y: (cy + .5) * R16 });
const fmtMoney = n => '$' + Math.round(n).toLocaleString('en-US');
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function wrapText(s, n) { const out = []; let line = ''; for (const w of String(s).split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; }
function mixHex(a, b, t) { const A1 = E.hex(a), B1 = E.hex(b), c = A1.map((v, i) => Math.round(v + (B1[i] - v) * t)); return '#' + c.map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join(''); }

/* ---- 10-world.js ---- */
/* =====================================================================================
 * 10 WORLD — the locations of Alamo Verde, New Mexico. Each location is data: rows of cells (walls by type, floor
 * tags), its set dressing (shapes, props), its lights and its mood (day or night, weather). Missions place people on
 * them. A designer adds a location by adding an entry to LOCATIONS.
 * ===================================================================================== */
const pad = (rows, w) => rows.map(r => r.length >= w ? r.slice(0, w) : r + r.slice(-1).repeat(w - r.length));
const WALLS = {
  1: { h: 44, top: '#5a4a42', side: '#9a6a52', face: 'brick', roof: 'slab', cut: true, cutH: 8 },                    // school's outer brick
  2: { h: 38, top: '#8a8478', side: '#d8cfba', face: 'plaster', roof: 'plain', cut: true, cutH: 6 },                 // interior walls
  3: { h: 13, top: '#2a2a30', side: '#6a6e78', face: 'steel', roof: 'plain' },                                         // lab benches
  4: { h: 30, top: '#3a5a7a', side: '#4a7aa8', face: 'metal', roof: 'plain' },                                         // lockers
  5: { h: 28, top: '#6a4a2a', side: '#8a6a42', face: 'plank', roof: 'plain' },                                         // storeroom shelves
  6: { h: 12, top: '#7a6a5a', side: '#a89070', face: 'plank', roof: 'plain' },                                         // wooden fence
  7: { h: 46, top: '#b8704a', side: '#a05a38', face: 'rock', roof: 'plain', cut: true, cutH: 10 },                     // desert mesa
  8: { h: 22, top: '#6a4a3a', side: '#7a5a48', face: 'rusted', roof: 'speckle' },                                       // junk piles
  9: { h: 20, top: '#8a9098', side: '#6a7078', face: 'iron', roof: 'plain', cut: true, cutH: 6 },                     // chain-link / sheet fence
  10: { h: 34, top: '#a04a32', side: '#e0c8a0', face: 'plaster', roof: 'tiles', cut: true, cutH: 8 },                 // adobe house, tile roof
  11: { h: 36, top: '#7a7a82', side: '#c8c0b4', face: 'plaster', roof: 'slab', cut: true, cutH: 8 },                  // stucco shops
  12: { h: 30, top: '#c8a040', side: '#e8d8b0', face: 'plaster', roof: 'plain', cut: true, cutH: 8 },                 // Pollo Sol
  13: { h: 10, top: '#5a8a3a', side: '#4a6a2a', face: 'hedge', roof: 'leaves' },                                      // hedges
  14: { h: 26, top: '#8a7a68', side: '#a8987e', face: 'timber', roof: 'tiles', cut: true, cutH: 8 }                  // trailer / shack
};
const tile = (o) => o;

/* SCHOOL: J. P. Wynne-ish "Alamo Verde High": the chemistry classroom, the locked storeroom, the hallway, the lot. */
const SCHOOL_ROWS = [
  '##############################',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............=.SSSS.=........#',
  '#............=......=........#',
  '#............====.====.......#',
  '#............=......=........#',
  '#..bbb..bbb..=......=........#',
  '#####_########______=====_####',
  '#____________________________#',
  '#_LLLLL____LLLLL_______LLLL__#',
  '#____________________________#',
  '#############____#############',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,f',
  'ffffffffffffffffffffffffffffff'
];
/* DESERT: the To'hajiilee-ish flats an hour from town, mesas, the RV's cook spot. */
function desertRows(W = 44, H = 32, seed = 11) {
  const rnd = E.rng(seed), rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 'M' : '.'; rows.push(s.split('')); }
  const blob = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + rnd() * .3) rows[y][x] = 'M'; };
  blob(7, 6, 3, 2); blob(34, 5, 4, 2); blob(38, 24, 3, 3); blob(6, 25, 2, 3); blob(25, 27, 3, 1); blob(18, 4, 2, 1);
  for (let i = 0; i < 26; i++) { const x = 2 + Math.floor(rnd() * (W - 4)), y = 2 + Math.floor(rnd() * (H - 4)); if (Math.abs(x - 22) > 6 || Math.abs(y - 16) > 5) rows[y][x] = rows[y][x] === '.' ? ',' : rows[y][x]; }
  for (let y = 12; y <= 20; y++) for (let x = 16; x <= 28; x++) rows[y][x] = '.';   // the cook site stays clear
  return rows.map(r => r.join(''));
}
/* JUNKYARD: Two-Tone Tito's yard: lanes between junk piles, a crusher, his trailer. */
const JUNK_ROWS = [
  '9999999999999999999999999999999999',
  '9........JJJ.............JJJJ....9',
  '9.TTTT...JJJ......JJ.....JJJJ....9',
  '9.TTTT............JJ.............9',
  '9.TTTT...................JJ......9',
  '9.......JJJJ......JJJJ...JJ......9',
  '9.......JJJJ......JJJJ...........9',
  '9.JJ.............................9',
  '9.JJ.......JJ..........JJJJ......9',
  '9..........JJ..........JJJJ...JJ.9',
  '9....JJJ.......................JJ9',
  '9....JJJ.........JJJ.............9',
  '9................JJJ.....JJJ.....9',
  '9..JJ....................JJJ.....9',
  '9..JJ........JJJJ................9',
  '9............JJJJ.........JJ.....9',
  '9.....JJ..................JJ.....9',
  '9.....JJ.......................JJ9',
  '9..............................JJ9',
  '9999999999999999.....999999999999'
];
/* TOWN: a few Alamo Verde blocks at night: houses, Barry's office, the car wash, Pollo Sol, alleys. */
const TOWN_ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
  'H,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,H',
  'H,hhhhh,,ggg,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H,hhhhh,,ggg,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H,hhhhh,,,,,,,hhhhh,,,,,,SSSSSS,,,,,,PPPPPP,,H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H============================================H',
  'H============================================H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H,,,,,,,,,,,,,,,,::,,,,,,,,,,,,,,,,,,::,,,,,,H',
  'H,hhhhh,,,ggg,,,::,,SSSSSSS,,,,,,,,,::,hhhhh,H',
  'H,hhhhh,,,ggg,,,::,,SSSSSSS,,,,,,,,,::,hhhhh,H',
  'H,hhhhh,,,,,,,,,::,,SSSSSSS,,,hhhh,,::,hhhhh,H',
  'H,,,,,,,,,,,,,,,::,,,,,,,,,,,,hhhh,,::,,,,,,,H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H============================================H',
  'H============================================H',
  'H::::::::::::::::::::::::::::::::::::::::::::H',
  'H,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,H',
  'H,hhhhh,,ggg,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'H,hhhhh,,ggg,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'H,hhhhh,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,hhhhh,,H',
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH'
];

// floors: linoleum, hallway tiles, asphalt with parking lines, sand, cracked yard dirt, sidewalks, roads with lane marks
const FLOORS = {
  school: (x, y, tag) => {
    if (tag === 'lot') { const c = E.tex.plain(x, y, { base: '#3c3a3e', amount: .18 }); if ((((x % 64) + 64) % 64 < 1.6 && (y % 96) < 40) || (y > 300 && y < 302)) return [210, 190, 90]; return c; }
    if (tag === 'hall') return E.tex.checker(x, y, { a: '#b8ae9c', b: '#9c917e', size: 16 });
    if (x > 13 * 16 && x < 21 * 16 && y < 10 * 16) return E.tex.plain(x, y, { base: '#7a7468', amount: .2 });
    return E.tex.checker(x, y, { a: '#d6ccb4', b: '#c4b89e', size: 8 });
  },
  desert: (x, y, tag) => tag === 'scrub' ? E.tex.dirt(x, y, { base: '#b88a58', dark: '#9a6e44', light: '#cfa070' }) : E.tex.dirt(x, y, { base: '#d0a06a', dark: '#b8865a', light: '#e4bc86' }),
  junk: (x, y) => { const c = E.tex.dirt(x, y, { base: '#7a6448', dark: '#5e4c36', light: '#907656' }); return E.hash2(Math.floor(x / 5), Math.floor(y / 5)) > .97 ? [60, 50, 44] : c; },
  town: (x, y, tag) => {
    if (tag === 'road') { const c = E.tex.plain(x, y, { base: '#34323a', amount: .16 }); const ry = ((y % 64) + 64) % 64; if (Math.abs(ry - 31) < 1 && (x % 24) < 12) return [220, 200, 90]; return c; }
    if (tag === 'walk') return E.tex.checker(x, y, { a: '#9a948a', b: '#8c867c', size: 16 });
    return E.tex.dirt(x, y, { base: '#8a7a5a', dark: '#706246', light: '#a08e68' });
  }
};

const LOCATIONS = {
  school: {
    name: 'Alamo Verde High', rows: SCHOOL_ROWS, w: 30, floor: FLOORS.school,
    legend: { '#': 1, '=': 2, b: 3, L: 4, S: 5, f: 6, ',': { floor: 'lot' }, '_': { floor: 'hall' } },
    dress: [['chalkboard', 6.5, 1.2, { facing: Math.PI / 2 }], ['desk', 3, 3.5], ['desk', 5.5, 3.5], ['desk', 8, 3.5], ['desk', 10.5, 3.5], ['desk', 3, 5.6], ['desk', 5.5, 5.6], ['desk', 8, 5.6], ['desk', 10.5, 5.6],
      ['desk', 3, 7.6], ['desk', 5.5, 7.6], ['desk', 10.5, 7.6], ['labbench', 3.8, 9.3, { solid: false }], ['labbench', 8.8, 9.3, { solid: false }], ['vending', 27.6, 11.3, { facing: Math.PI / 2 }],
      ['drum', 19.5, 1.5], ['sedan', 4, 17.5, { facing: Math.PI / 2 }], ['sedan', 8, 17.5, { facing: Math.PI / 2, mats: { b: '#8a3a32 none' } }],
      ['sedan', 20, 17.5, { facing: -Math.PI / 2, mats: { b: '#3a5a8a none' } }], ['sedan', 24, 17.5, { facing: -Math.PI / 2, mats: { b: '#c8c0a8 none' } }], ['bench', 26, 15.6, { facing: Math.PI / 2 }],
      ['table', 24.5, 3.5], ['chair', 23.3, 3.5, { facing: 0 }], ['chair', 25.7, 3.5, { facing: Math.PI }], ['bookcase', 27.8, 1.6, { facing: Math.PI / 2 }]],
    props: [['sign', 15, 14.7, 0, {}], ['streetlamp', 2, 15.6, 0, { light: true }], ['streetlamp', 27.5, 20.3, 0, { light: true }], ['trashcan', 12.4, 13.3, 0, {}], ['pot', 1.6, 1.6, 0, {}]],
    lamps: [[6.5, 5, 40, 120, .8, '#fff4dc'], [17, 4, 34, 70, .55, '#e8f0ff'], [25, 5, 40, 90, .7, '#fff0d0'], [7, 12, 34, 90, .6, '#e8f0ff'], [20, 12, 34, 90, .6, '#e8f0ff']],
    outside: '#2a2620'
  },
  desert: {
    name: 'The Flats, 40 miles out', rowsFn: () => desertRows(), w: 44, floor: FLOORS.desert,
    legend: { M: 7, ',': { floor: 'scrub' } },
    dress: [['rv', 22, 15, { facing: 0.3 }], ['cookrig', 25.5, 17.4, { facing: Math.PI / 2, solid: false }], ['drum', 19.2, 14.2], ['drum', 19.8, 15.4, { mats: { b: '#a83a2a metal' } }], ['crate', 26.5, 13.8], ['mesa', 12, 20], ['mesa', 31, 11], ['mesa', 30, 23]],
    props: [['cactus', 14, 10, 0, { size: 1.3 }], ['cactus', 30, 18, 0, { size: 1.2 }], ['cactus', 10, 14, 0, { size: 1.4 }], ['cactus', 36, 14, 0, { size: 1.1 }], ['cactus', 20, 24, 0, { size: 1.3 }], ['cactus', 27, 8, 0, { size: 1.2 }],
      ['rock', 16, 21, 0, {}], ['rock', 29, 13, 0, {}], ['bones', 33, 20, 0, {}], ['skull', 11, 18, 0, {}], ['bush', 24, 22, 0, {}], ['bush', 17, 9, 0, {}], ['firedrum', 18.4, 17.8, 0, { light: true }]],
    lamps: [], outside: '#c8955e', weather: { kind: 'sand', amount: .25, wind: .6 }
  },
  junk: {
    name: "Two-Tone Tito's Salvage", rows: JUNK_ROWS, w: 34, floor: FLOORS.junk,
    legend: { 9: 9, J: 8, T: 14 },
    dress: [['crusher', 16, 9], ['junker', 6, 12, { facing: .4 }], ['junker', 28, 14, { facing: 2.2 }], ['junker', 21, 3, { facing: 1.1 }], ['tires', 13, 17], ['tires', 30, 6], ['tires', 4, 16], ['drum', 8, 3.5], ['drum', 22, 16.5], ['dumpster', 10, 18, { facing: Math.PI / 2 }], ['sedan', 18, 17.8, { facing: -Math.PI / 2, mats: { b: '#c83a8a none' } }]],
    props: [['firedrum', 7, 8, 0, { light: true }], ['firedrum', 24, 11, 0, { light: true }], ['firedrum', 12, 15, 0, { light: true }], ['streetlamp', 17, 18.6, 0, { light: true }], ['sign', 3, 6, 0, {}], ['trashcan', 31, 17, 0, {}], ['crate', 25, 2, 0, {}]],
    lamps: [[3.5, 3.5, 30, 60, .7, '#ffb060']], outside: '#3a3028'
  },
  town: {
    name: 'Central Alamo Verde', rows: TOWN_ROWS, w: 46, floor: FLOORS.town,
    legend: { H: 6, h: 10, g: 13, S: 11, P: 12, '=': { floor: 'road' }, ':': { floor: 'walk' }, ',': { floor: 'yard' } },
    dress: [['carwash', 28, 13.5, { facing: Math.PI / 2 }], ['fryer', 36.5, 8.6], ['bench', 12, 8.6, { facing: Math.PI / 2 }], ['bench', 32, 17.6, { facing: Math.PI / 2 }], ['dumpster', 23.5, 13, { facing: Math.PI / 2 }], ['dumpster', 9, 18.4, { facing: Math.PI / 2 }],
      ['sedan', 6, 9.4, { facing: 0 }], ['sedan', 41, 18.4, { facing: Math.PI, mats: { b: '#c8b03a none' } }], ['sedan', 22, 4.4, { facing: 0, mats: { b: '#5a3a8a none' } }], ['sedan', 30, 9.5, { facing: Math.PI, mats: { b: '#3a7a7a none' } }]],
    props: [['streetlamp', 4, 5.2, 0, { light: true }], ['streetlamp', 14, 5.2, 0, { light: true }], ['streetlamp', 24, 5.2, 0, { light: true }], ['streetlamp', 34, 5.2, 0, { light: true }], ['streetlamp', 43, 5.2, 0, { light: true }],
      ['streetlamp', 8, 17.8, 0, { light: true }], ['streetlamp', 20, 17.8, 0, { light: true }], ['streetlamp', 30, 17.8, 0, { light: true }], ['streetlamp', 40, 17.8, 0, { light: true }],
      ['hydrant', 18, 8.6, 0, {}], ['hydrant', 38, 14.4, 0, {}], ['trashcan', 26, 8.6, 0, {}], ['trashcan', 16, 13.4, 0, {}], ['awning', 28.5, 5.1, 0, {}], ['awning', 40.5, 5.1, 0, { color: '#e8a020' }], ['palm', 2, 13, 0, {}], ['palm', 44, 9, 0, {}], ['cactus', 33, 13, 0, {}]],
    lamps: [[40.5, 3.5, 30, 70, .8, '#ffd060'], [28.5, 3.5, 30, 60, .6, '#a0e0ff'], [23, 11, 30, 50, .5, '#ffe0a0']], outside: '#1c1a20'
  }
};

// build a location's map once: walls, floors, and its dressing made solid where it stands
function buildLocation(id) {
  const L0 = LOCATIONS[id];
  if (L0.map) return L0;
  const rows = pad(L0.rowsFn ? L0.rowsFn() : L0.rows, L0.w);
  const types = {}; for (const k in WALLS) types[k] = Object.assign({}, WALLS[k]);
  L0.map = new E.TileMap({ rows, legend: L0.legend, types, floorTex: L0.floor, ao: 5, outside: L0.outside });
  for (const [sid, cx, cy, o] of L0.dress) if (!o || o.solid !== false) L0.map.solid(sid, (cx) * R16, (cy) * R16, 0, Object.assign({}, o || {}));
  return L0;
}
function drawLocation(r, loc, night) {
  const m = loc.map;
  m.drawFloor(r); m.queueWalls(r);
  for (const [sid, cx, cy, o] of loc.dress) r.shape(sid, cx * R16, cy * R16, 0, o ? { facing: o.facing, mats: o.mats, scale: o.scale } : undefined);
  for (const [pid, cx, cy, z, o] of loc.props) r.prop(pid, cx * R16, cy * R16, z, Object.assign({}, o, { light: night && o.light, size: o.size || 1.3 }));
  if (night) for (const [cx, cy, z, rad, it, color] of loc.lamps) L.add(cx * R16, cy * R16, z, rad, it, { color });
}

/* ---- 20-actors.js ---- */
/* =====================================================================================
 * 20 ACTORS — the cast, the player characters (a hero and a partner a second player can take over), enemies that
 * telegraph, guards with eyes and suspicion, thrown chemistry, gas clouds, pickups. Everything is an E.Body with the
 * fields its role needs; every character is an E.Humanoid posed from its motion each step.
 * ===================================================================================== */
const CAST = {
  GRAY: { name: 'MR. GRAY', rig: { size: 1.25, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short', colors: { skin: '#e2b896', cloth: '#cfc6a0', pants: '#6a5c48', boot: '#3a2c22', belt: '#2a2018', hair: '#6a5a4a' } } },
  DANNY: { name: 'DANNY', rig: { size: 1.18, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#26262a' }, colors: { skin: '#e8c4a4', cloth: '#d8a828', coat: '#d8a828', pants: '#3a4a6a', boot: '#e8e8e8', hair: '#3a2a20' } } },
  MARTY: { name: 'MARTY', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'short', colors: { skin: '#e0b494', cloth: '#5a7a9a', pants: '#4a4440', hair: '#4a3a2a' } } },
  TITO: { name: 'TWO-TONE TITO', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'none', colors: { skin: '#c8946a', cloth: '#f2f2f2', pants: '#2a2a3a', hair: '#1a1a1a', trim: '#e8c040' } } },
  BARRY: { name: 'BARRY FLEISCHMAN', rig: { size: 1.2, outfit: 'coat', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#e8c0a0', cloth: '#e8e0a0', coat: '#b8862a', pants: '#8a6a2a', hair: '#7a5a3a' } } },
  CAROL: { name: 'CAROL', rig: { size: 1.18, outfit: 'robe', weapon: null, hair: 'long', colors: { skin: '#ecc8aa', cloth: '#5a7ab0', hair: '#a8683a' } } },
  DOCTOR: { name: 'DR. OKAFOR', rig: { size: 1.2, outfit: 'coat', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#7a4a32', cloth: '#d8e0e8', coat: '#f0f0f0', pants: '#3a3a4a', hair: '#1a1a1a' } } },
  KYLE: { name: 'KYLE', rig: { size: 1.12, weapon: null, outfit: 'shirt', hair: 'spiky', colors: { cloth: '#c83a3a', pants: '#3a3a5a', hair: '#e0b050' } } },
  BRIANNA: { name: 'BRIANNA', rig: { size: 1.12, weapon: null, outfit: 'shirt', hair: 'ponytail', colors: { skin: '#8a5a3a', cloth: '#7a3ab0', pants: '#2a2a3a', hair: '#1a1210' } } },
  MARCUS: { name: 'MARCUS', rig: { size: 1.14, weapon: null, outfit: 'coat', hair: 'short', colors: { skin: '#b07a52', cloth: '#3a8a5a', coat: '#3a8a5a', pants: '#2a2a2a', hair: '#1a1a1a' } } },
  HUGO: { name: 'HUGO', rig: { size: 1.22, build: 'bulky', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#3a4a5a' }, colors: { skin: '#b4805a', cloth: '#4a5a6a', coat: '#4a5a6a', pants: '#3a4a5a', hair: '#2a2a2a' } } },
  GUARD: { name: 'SECURITY', rig: { size: 1.22, build: 'heroic', weapon: null, outfit: 'shirt', hat: { style: 'cap', color: '#1a2a4a' }, colors: { cloth: '#3a4a7a', pants: '#1a1a2a' } } },
  AGENT: { name: 'AGENT', rig: { size: 1.22, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'short', colors: { cloth: '#e8e8e8', coat: '#1e2430', pants: '#1a1a1e', metal: '#3a3a3a', hair: '#3a2a20' } } },
  THUG: { name: 'THUG', rig: { size: 1.22, build: 'bulky', weapon: 'staff', outfit: 'shirt', sleeves: 'none', hair: 'short', colors: { cloth: '#d8d8d8', pants: '#2a3a5a', metal: '#8a6a4a', hair: '#1a1a1a' } } },
  GUNMAN: { name: 'GUNMAN', rig: { size: 1.2, build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'short', hat: { style: 'band', color: '#c83a3a' }, colors: { cloth: '#2a2a2a', pants: '#3a3020', metal: '#2a2a2a' } } },
  AURELIO: { name: 'DON AURELIO', rig: { size: 1.22, outfit: 'shirt', weapon: null, hair: 'short', sleeves: 'long', colors: { skin: '#a8805a', cloth: '#e8dcb8', pants: '#2a2a30', hair: '#3a3a3a' } } },
  BUYER: { name: 'CUSTOMER', rig: { size: 1.15, weapon: null, outfit: 'coat', hood: true, colors: { cloth: '#6a5a4a', coat: '#4a4a3a', pants: '#2a2a2a', hair: '#3a3a3a' } } }
};
const rigCache = {};
function makeRig(who, extra) {
  const c = CAST[who] || CAST.THUG;
  const o = JSON.parse(JSON.stringify(c.rig));
  if (extra) { Object.assign(o, extra); if (extra.colors) o.colors = Object.assign({}, c.rig.colors, extra.colors); }
  return new E.Humanoid(o);
}
// a portrait rig per speaker for the dialog box (a live close-up)
function portraitOf(who) { if (!CAST[who]) return null; return rigCache[who] || (rigCache[who] = makeRig(who)); }

/* ---- The world state of the mission being played (W). Missions and scenes fill it ---- */
let W = null;
function newWorld(locId, o = {}) {
  const loc = buildLocation(locId);
  W = { loc, map: loc.map, locId, night: !!o.night, hero: null, partner: null, npcs: [], enemies: [], guards: [], flasks: [], clouds: [], pickups: [], acts: [],
    shots: new E.Bullets(game, { plane: 'ground', sparks: true }), flow: new E.FlowField(loc.map), focus: null, objective: null, marker: null,
    heat: 0, heatOn: !!o.heat, caught: false, combat: !!o.combat, stealth: !!o.stealth, flaskKinds: o.flasks || [], flaskSel: 0, time: 0, kills: 0, noise: [],
    attract: !!o.attract, ghosts: {}, toasts: [], banner: null, bannerT: 0, fail: null, slow: 0 };
  return W;
}

/* ---- Player characters ---- */
function makePlayer(who, x, y, o = {}) {
  const b = new E.Body({ x, y, r: 5 });
  return Object.assign(b, { who, rig: makeRig(who), hp: o.hp || 6, maxHp: o.hp || 6, facing: o.facing === undefined ? Math.PI / 2 : o.facing, moveFacing: Math.PI / 2, team: 'player',
    cool: 0, rollT: 0, rollDir: 0, hurtT: 0, inv: 0, dead: false, downT: 0, sneak: false, sprint: false, crouch: false, catalyst: 0, meter: 0, hidden: null, aimAt: null,
    melee: new E.Attack(who === 'DANNY' ? 'haymaker' : 'jab', { reach: 10 }), autoWalk: null, player: o.player || null, ai: !!o.ai, ammo: o.ammo || { fulminate: 6, phosphine: 4, chalk: 99 } });
}
const players = () => [W.hero, W.partner].filter(a => a && !a.dead);
const inputOf = a => a === W.hero ? game.input : (a.player || null);

function aimFor(a, I) {
  if (I === game.input && I.aimSource === 'mouse') { const g = game.mouseGround(); if (g) return { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y, manual: true }; }
  if (I.aimWorld) return { x: I.aimWorld.x, y: I.aimWorld.y, manual: true };
  if (I.padAim) { const d = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); return { x: a.x + d[0] * 90, y: a.y + d[1] * 90, manual: true }; }
  if (game.settings.assist && W.enemies.length) {
    const t = E.targets(a, W.enemies.filter(e => !e.dead), { range: 140, arc: 1.2, facing: a.facing });
    if (t.length) return { x: t[0].target.x, y: t[0].target.y, manual: false, lock: t[0].target };
  }
  return { x: a.x + Math.cos(a.facing) * 70, y: a.y + Math.sin(a.facing) * 70, manual: false };
}

function controlPlayer(a, I, dt) {
  if (a.dead) return;
  a.cool -= dt; a.rollT -= dt; a.hurtT -= dt; a.inv -= dt;
  if (a.catalyst > 0) { a.catalyst -= dt; if (a.catalyst <= 0) { game.note('CATALYST SPENT'); } }
  if (a.hidden) { a.vx = a.vy = 0; if (I.pressed('interact') || I.pressed('dodge')) unhide(a); a.update(dt, W.map); return; }
  let m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
  if (a.autoWalk) {   // a click on something in the world walks there, then uses it
    const t = a.autoWalk, dx = t.x - a.x, dy = t.y - a.y, l = Math.hypot(dx, dy);
    if (Math.hypot(m[0], m[1]) > .2 || !t.active) a.autoWalk = null;
    else if (l < (t.r || 18)) { a.autoWalk = null; useAct(t, a); }
    else { const f = W.flow; f.update(t.x, t.y); const dir = f.dir(a.x, a.y, t.x, t.y); d = dir; }
  }
  const len = Math.hypot(d[0], d[1]);
  a.sneak = I.down('sneak'); a.crouch = a.sneak; a.sprint = I.down('sprint') && !a.sneak && len > .2;
  if (a.rollT > 0) { a.vx = Math.cos(a.rollDir) * 210; a.vy = Math.sin(a.rollDir) * 210; }
  else {
    const sp = (a.sneak ? 38 : a.sprint ? 122 : 78) * (a.catalyst > 0 ? 1.15 : 1) * (a.melee.busy ? .35 : 1);
    a.vx = d[0] * sp; a.vy = d[1] * sp;
    if (len > .1) a.moveFacing = Math.atan2(d[1], d[0]);
    if (I.pressed('dodge') && a.cool <= 0) { a.rollT = .3; a.inv = .32; a.cool = .55; a.rollDir = len > .1 ? a.moveFacing : a.facing; A.sfx('whoosh'); P.dust(a.x, a.y, 0, 6); }
  }
  const aim = aimFor(a, I); a.aimAt = aim;
  a.facing = aim.manual ? Math.atan2(aim.y - a.y, aim.x - a.x) : (len > .1 ? a.moveFacing : a.facing);
  // noise: sprinting is loud, walking soft, sneaking silent
  if (a.sprint && len > .3 && Math.floor(W.time * 4) !== Math.floor((W.time - dt) * 4)) makeNoise(a.x, a.y, 70);
  // focus and interaction: the nearest thing to use, or the one under the mouse
  if (a === W.hero) {
    const f = W.focus;
    const mouseClick = I.lastDevice === 'mouse' && f && f.hovered && I.pressed('throw');
    if (f && (I.pressed('interact') || mouseClick)) {
      if (dist2(a, f) <= (f.r || 18) + 6) useAct(f, a); else a.autoWalk = f;
      I.consume('throw'); return finishMove(a, dt);
    }
    if (mouseClick) return finishMove(a, dt);
  }
  if (I.pressed('swap') && W.flaskKinds.length > 1) { W.flaskSel = (W.flaskSel + 1) % W.flaskKinds.length; A.sfx('select'); game.note(FLASKS[W.flaskKinds[W.flaskSel]].name.toUpperCase()); }
  if (I.pressed('throw') && W.flaskKinds.length && a.cool <= 0 && a.rollT <= 0) {
    const kind = W.flaskKinds[W.flaskSel];
    if (a.ammo[kind] > 0 || a.catalyst > 0 || W.attract) { if (!(a.catalyst > 0 || W.attract) && kind !== 'chalk') a.ammo[kind]--; throwFlask(a, kind, aim.x, aim.y); a.cool = .42; }
    else { A.sfx('cancel'); game.note('OUT OF ' + FLASKS[kind].name.toUpperCase()); }
  }
  if (I.pressed('melee') && W.combat && !a.melee.busy && a.rollT <= 0) { if (a.melee.start()) A.sfx('swing'); }
  if (I.pressed('catalyst') && W.combat && a === W.hero && a.meter >= 1 && a.catalyst <= 0) catalystOn(a);
  finishMove(a, dt);
}
function finishMove(a, dt) {
  a.melee.update(dt);
  if (a.melee.busy) a.melee.hits(W.enemies.filter(e => !e.dead), e => E.inArc(a, a.facing, e, 22, 1.3, 12), e => {
    const dmg = (a.who === 'DANNY' ? (a.player ? 2 : 1) : 1) * (a.catalyst > 0 ? 2 : 1);
    hurtEnemy(e, dmg, a.facing, a); E.knockback(a, e, a.who === 'DANNY' ? 190 : 140); e.stun = Math.max(e.stun, a.player || a === W.hero ? .45 : .2);
  });
  a.update(dt, W.map);
}
function catalystOn(a) {
  a.catalyst = 9; a.meter = 0; W.slow = 1.2; game.flash('#59c8f0', .25, .6); game.shake(4); A.sfx('powerup'); A.sfx('charge');
  for (const e of W.enemies) if (!e.dead && dist2(e, a) < 130 && e.kind !== 'boss') { e.fear = 3.5; e.stun = .6; }
  W.banner = { text: E.pick(['RESPECT THE CHEMISTRY.', 'I AM THE CATALYST.', 'CHEMISTRY. IS. CHANGE.']), sub: 'The hat goes on.' }; W.bannerT = 2.2;
  bark('GRAY', E.pick(['Step back.', 'You know who I am now.', 'Class is in session.']));
}
function hurtPlayer(a, dmg, angle, src) {
  if (a.dead || a.inv > 0 || W.attract) return;
  dmg *= DIFF().dmg; a.hp -= dmg; a.hurtT = .35; a.inv = .7;
  game.hitFx(a.x, a.y, a.z + 18, { power: 1, angle: angle || 0, damage: Math.ceil(dmg), sound: 'hurt' }); game.input.rumble(.6, .2);
  if (a.hp <= 0) { a.hp = 0; a.dead = true; a.downT = 0; A.sfx('die'); if (a === W.hero || (!W.hero || W.hero.dead)) failMission(a === W.hero ? 'down' : 'down'); }
}
function hide(a, spot) { a.hidden = spot; a.x = spot.x; a.y = spot.y + 2; A.sfx('door'); W.toasts.push(['Hidden', 'Nobody can see you in here. ' + label('interact') + ' to climb out.']); }
function unhide(a) { const s = a.hidden; a.hidden = null; a.y = s.y + 16; A.sfx('door'); }

/* ---- Partner AI: follows, fights, keeps out of trouble. A second player takes it over ---- */
function controlPartner(a, dt) {
  if (a.dead) return;
  const I = a.player;
  if (I) return controlPlayer(a, I, dt);
  a.cool -= dt; a.hurtT -= dt; a.inv -= dt;
  const h = W.hero; let tx = h.x - Math.cos(h.facing) * 22, ty = h.y - Math.sin(h.facing) * 22, speed = 82;
  const foes = W.enemies.filter(e => !e.dead && dist2(e, a) < 120);
  if (W.combat && foes.length) {
    foes.sort((p, q) => dist2(p, a) - dist2(q, a)); const e = foes[0];
    if (a.hp > 1.5) { tx = e.x; ty = e.y; speed = 92; if (dist2(e, a) < 20) { a.facing = Math.atan2(e.y - a.y, e.x - a.x); if (!a.melee.busy && a.cool <= 0) { a.melee.start(); a.cool = 1.6; A.sfx('swing', { vol: .6 }); } } }
    else { tx = a.x - (e.x - a.x); ty = a.y - (e.y - a.y); }
  }
  const dx = tx - a.x, dy = ty - a.y, l = Math.hypot(dx, dy);
  if (l > 10) { W.flow.update(tx, ty); const d = W.flow.dir(a.x, a.y, tx, ty); const k = Math.min(1, l / 30); a.vx = d[0] * speed * k; a.vy = d[1] * speed * k; if (!a.melee.busy) a.facing = Math.atan2(a.vy, a.vx); }
  else { a.vx = a.vy = 0; }
  if (dist2(a, h) > 220) { a.x = h.x - 10; a.y = h.y + 6; }   // never lost
  finishMove(a, dt);
}

/* ---- Enemies: thugs (bats, telegraphed overheads), gunmen (aim, then fire), the boss ---- */
function makeEnemy(kind, x, y, o = {}) {
  const b = new E.Body({ x, y, r: kind === 'boss' ? 8 : 5 });
  const hp = Math.round(({ thug: 4, gunman: 3, boss: 34 })[kind] * DIFF().hp);
  return Object.assign(b, { kind, who: kind === 'boss' ? 'TITO' : kind === 'gunman' ? 'GUNMAN' : 'THUG', rig: kind === 'boss' ? makeRig('TITO', { size: 1.7, weapon: 'staff', colors: { metal: '#9a9aa8' } }) : makeRig(kind === 'gunman' ? 'GUNMAN' : 'THUG', { colors: o.colors || { cloth: E.pick(['#d8d8d8', '#2a5a8a', '#8a2a2a', '#3a3a3a']) } }),
    hp, maxHp: hp, facing: Math.PI / 2, team: 'enemy', stun: 0, fear: 0, gas: 0, hurtT: 0, dead: false, downT: 0, aimT: 0, cool: 1 + Math.random(), strafe: Math.random() < .5 ? 1 : -1,
    atk: new E.Attack(kind === 'boss' ? 'overhead' : 'overhead', kind === 'boss' ? { wind: .7, recover: .5, reach: 18 } : { wind: .5, recover: .35, reach: 11 }), phase: 1, slam: 0, name: o.name || null });
}
function hurtEnemy(e, dmg, angle, by) {
  if (e.dead) return;
  e.hp -= dmg; e.hurtT = .25;
  game.hitFx(e.x, e.y, e.z + 18, { power: dmg > 2 ? 1.6 : 1, angle: angle || 0, damage: Math.round(dmg * 10) / 10 });
  if (W.hero) W.hero.meter = Math.min(1, W.hero.meter + .07 * dmg);
  if (e.hp <= 0) { e.dead = true; e.downT = 0; W.kills++; A.sfx('die', { vol: .5 }); if (Math.random() < .5) dropPickup(e.x, e.y); if (e.kind === 'boss') bossDown(e); }
  else if (e.kind !== 'boss') e.atk.cancel();
}
function nearestPlayer(e) { let best = null, bd = 1e9; for (const p of players()) { if (p.hidden) continue; const d = dist2(p, e); if (d < bd) { bd = d; best = p; } } return best; }
function updateEnemy(e, dt) {
  if (e.dead) { e.downT += dt; return; }
  e.hurtT -= dt; e.cool -= dt;
  if (e.gas > 0) { e.gas -= dt; if (Math.floor(e.gas * 2) !== Math.floor((e.gas + dt) * 2)) { hurtEnemy(e, .5, 0); A.sfx('cough', { vol: .4 }); e.stun = Math.max(e.stun, .3); } }
  if (e.stun > 0) { e.stun -= dt; e.vx *= .9; e.vy *= .9; e.update(dt, W.map); return; }
  const t = nearestPlayer(e);
  if (!t) { e.vx = e.vy = 0; e.update(dt, W.map); return; }
  const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  if (e.fear > 0) { e.fear -= dt; e.vx = -dx / d * 70; e.vy = -dy / d * 70; e.facing = ang; e.update(dt, W.map); return; }
  const go = (spd, tx = t.x, ty = t.y) => { W.flow.update(t.x, t.y); const dir = (tx === t.x && ty === t.y) ? W.flow.dir(e.x, e.y, tx, ty) : [(tx - e.x) / (Math.hypot(tx - e.x, ty - e.y) || 1), (ty - e.y) / (Math.hypot(tx - e.x, ty - e.y) || 1)]; e.vx = dir[0] * spd; e.vy = dir[1] * spd; };
  const began = e.atk.update(dt);
  if (e.kind === 'thug' || e.kind === 'boss') {
    if (e.atk.busy) { e.vx *= .8; e.vy *= .8; if (began === 'active') strike(e, t); }
    else if (e.kind === 'boss' && bossThink(e, t, d, dt)) { /* the boss's own patterns */ }
    else if (d > (e.kind === 'boss' ? 26 : 17)) { go(e.kind === 'boss' ? 46 : 54); e.facing = Math.atan2(e.vy, e.vx); }
    else { e.vx = e.vy = 0; e.facing = ang; if (e.cool <= 0) { e.atk.start(); e.cool = e.kind === 'boss' ? 1.1 : 1.3; A.sfx('swing', { vol: .5, pitch: .8 }); } }
  } else if (e.kind === 'gunman') {
    const sight = W.map.sight ? W.map.sight(e, t) : true;
    e.facing = ang;
    if (d < 60) go(48, e.x - dx, e.y - dy);
    else if (d > 120 || !sight) go(50);
    else { const sx = -dy / d, sy = dx / d; e.vx = sx * 30 * e.strafe; e.vy = sy * 30 * e.strafe; if (Math.random() < dt * .4) e.strafe *= -1; }
    if (sight && d < 150) { e.aimT += dt; if (e.aimT > .95) { e.aimT = 0; e.cool = 1.4; fireAt(e, t); } } else e.aimT = Math.max(0, e.aimT - dt);
  }
  e.update(dt, W.map);
}
function strike(e, t) {
  const reach = e.kind === 'boss' ? 30 : 22;
  for (const p of players()) if (E.inArc(e, e.facing, p, reach, 1.2, 14)) { hurtPlayer(p, e.kind === 'boss' ? 2 : 1, e.facing, e); E.knockback(e, p, e.kind === 'boss' ? 220 : 150); }
  if (e.kind === 'boss') { game.shake(5); P.dust(e.x + Math.cos(e.facing) * 20, e.y + Math.sin(e.facing) * 20, 0, 10); A.sfx('boom', { vol: .5 }); }
}
function fireAt(e, t) {
  const h = e.rig.hand ? e.rig.hand() : { x: e.x, y: e.y, z: 18 }, a = Math.atan2(t.y - e.y, t.x - e.x) + (Math.random() - .5) * .12, sp = 150;
  W.shots.fire({ x: h.x, y: h.y, z: 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 2, team: 'enemy', color: '#ffd060', life: 1.8, dmg: 1 });
  A.sfx('gunshot'); P.sparks(h.x, h.y, 18, 4, a);
}
// the boss: Two-Tone Tito with a sledgehammer. Phase 1 swings and charges; phase 2 (half health) slams shockwaves and
// calls cousins in. Every attack winds up visibly
function bossThink(e, t, d, dt) {
  if (e.charge > 0) { e.charge -= dt; e.vx = Math.cos(e.facing) * 170; e.vy = Math.sin(e.facing) * 170; for (const p of players()) if (dist2(p, e) < 18) { hurtPlayer(p, 2, e.facing, e); E.knockback(e, p, 260); } if (e.hitWall) { e.charge = 0; e.stun = 1.4; game.shake(6); A.sfx('bump'); P.dust(e.x, e.y, 0, 12); W.banner = { text: 'HE HIT THE WALL', sub: 'Now. Throw everything.' }; W.bannerT = 1.4; } return true; }
  if (e.chargeWind > 0) { e.chargeWind -= dt; e.vx = e.vy = 0; if (e.chargeWind <= 0) { e.charge = .9; A.sfx('whoosh'); } return true; }
  if (e.slamWind > 0) { e.slamWind -= dt; e.vx = e.vy = 0; if (e.slamWind <= 0) { W.clouds.push({ x: e.x, y: e.y, r: 4, grow: 140, t: .7, kind: 'shock' }); game.shake(7); A.sfx('explode', { vol: .6 }); P.dust(e.x, e.y, 0, 20); } return true; }
  e.think = (e.think || 2) - dt;
  if (e.think <= 0) {
    e.think = e.phase === 2 ? 2.4 : 3.2;
    if (d > 50 && Math.random() < .6) { e.chargeWind = .75; e.facing = Math.atan2(t.y - e.y, t.x - e.x); bark('TITO', E.pick(['TIGHT! TIGHT! TIGHT!', 'Come here, teacher!', 'I\'m gonna crush you!'])); return true; }
    if (e.phase === 2) { e.slamWind = .8; bark('TITO', E.pick(['GROUND POUND, ese!', 'Feel that?'])); return true; }
  }
  return false;
}

/* ---- Guards: patrols with eyes (E.sees through the map's heights), a mind (E.Suspicion), ears ---- */
function makeGuard(kind, route, o = {}) {
  const [x, y] = route[0];
  const b = new E.Body({ x: x * R16, y: y * R16, r: kind === 'cruiser' ? 9 : 5 });
  const who = kind === 'janitor' ? 'HUGO' : kind === 'agent' ? 'AGENT' : kind === 'cruiser' ? 'AGENT' : 'GUARD';
  return Object.assign(b, { kind, who, rig: kind === 'cruiser' ? null : makeRig(who), route: route.map(p => [p[0] * R16, p[1] * R16, p[2] || 0]), at: 1, wait: 0, facing: o.facing || 0,
    mind: new E.Suspicion({ rise: 1.5 * DIFF().sight, decay: .28, forget: 6 }), range: kind === 'cruiser' ? 150 : 108, fov: kind === 'cruiser' ? .9 : 1.45, speed: kind === 'cruiser' ? 46 : 30, bark: 0, look: 0 });
}
function updateGuard(g, dt) {
  const h = W.hero;
  let seen = { seen: false, exposure: 0 };
  if (h && !h.dead && !h.hidden && !W.attract && !talk.open && !M.cut && !M.cookObj) {
    seen = E.sees(g, Object.assign(h, { exposure: h.sneak ? .55 : 1 }), { map: W.map, range: g.range, fov: g.fov });
  }
  for (const n of W.noise) { const v = E.hears(g, n, W.map); if (v > .1) g.mind.hear(v, n); }
  const st = g.mind.update(dt, seen, h);
  if (g.mind.changed) { if (st === 'alert') { A.sfx('alarm'); g.bark = 1.4; bark(g.who, E.pick(g.kind === 'janitor' ? ['Hey! Who\'s there?', '¡Oye! Stop!'] : g.kind === 'agent' || g.kind === 'cruiser' ? ['DEA! Hold it right there!', 'Freeze!'] : ['Security! Don\'t move!'])); } else if (st === 'notice') { A.sfx('blip'); g.bark = 1; } }
  let goal = null, spd = g.speed;
  if (st === 'alert' && h) { goal = h; spd = g.speed * 2.3; }
  else if (st === 'search' && g.mind.last) { goal = g.mind.last; spd = g.speed * 1.4; }
  else if (st === 'notice' && g.mind.last) { g.vx = g.vy = 0; g.facing = E.approachAng(g.facing, Math.atan2(g.mind.last.y - g.y, g.mind.last.x - g.x), dt * 3); g.update(dt, W.map); return st; }
  else {
    const p = g.route[g.at];
    goal = { x: p[0], y: p[1] };
    if (Math.hypot(p[0] - g.x, p[1] - g.y) < 6) { g.at = (g.at + 1) % g.route.length; g.wait = p[2] || .9; g.look = (Math.random() - .5) * 1.6; }
  }
  if (g.wait > 0 && st === 'calm') { g.wait -= dt; g.vx = g.vy = 0; g.facing = E.approachAng(g.facing, g.facing + g.look * dt, 1); g.update(dt, W.map); return st; }
  if (goal) {
    const dx = goal.x - g.x, dy = goal.y - g.y, l = Math.hypot(dx, dy);
    if (l > 4) { W.flow.update(goal.x, goal.y); const dir = st === 'calm' ? [dx / l, dy / l] : W.flow.dir(g.x, g.y, goal.x, goal.y); g.vx = dir[0] * spd; g.vy = dir[1] * spd; g.facing = E.approachAng(g.facing, Math.atan2(dir[1], dir[0]), dt * 6); }
    else { g.vx = g.vy = 0; }
  }
  g.update(dt, W.map);
  if (st === 'alert' && h && !h.dead && !h.hidden && !talk.open && !M.cut && dist2(g, h) < (g.kind === 'cruiser' ? 20 : 14)) caughtBy(g);
  return st;
}

/* ---- Thrown chemistry ---- */
const FLASKS = {
  fulminate: { name: 'Fulminate', color: '#ff6a3a', hi: '#ffd0a0', about: 'It looks like crystal. It is not.' },
  phosphine: { name: 'Phosphine', color: '#8ae05a', hi: '#e0ffc0', about: 'A cloud that makes grown men cough and kneel.' },
  chalk: { name: 'Chalk', color: '#f0f0f0', hi: '#ffffff', about: 'Thrown, it is a noise somewhere else.' }
};
const FLASK_SPR = {};
for (const k in FLASKS) FLASK_SPR[k] = E.sprite(['.g.', '.g.', 'ccc', 'cCc', 'ccc'], { g: '#c8e8f0', c: FLASKS[k].color, C: FLASKS[k].hi });
function throwFlask(a, kind, tx, ty) {
  const from = { x: a.x + Math.cos(a.facing) * 6, y: a.y + Math.sin(a.facing) * 6, z: a.z + 22 };
  const dx = tx - from.x, dy = ty - from.y, l = Math.hypot(dx, dy), max = 150;
  if (l > max) { tx = from.x + dx / l * max; ty = from.y + dy / l * max; }
  const v = E.arc(from, { x: tx, y: ty, z: 0 }, 520, { apex: 22 });
  W.flasks.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, kind, t: 0, by: a, power: a.catalyst > 0 ? 1.6 : 1 });
  A.sfx('whoosh', { pitch: 1.3 });
}
function updateFlasks(dt) {
  for (const f of W.flasks) {
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 520 * dt;
    const top = W.map.heightAt ? W.map.heightAt(f.x, f.y) : 0;
    if (f.z <= top || f.t > 3) { f.done = true; burst(f.kind, f.x, f.y, Math.max(0, top), f.power); }
  }
  E.prune(W.flasks, f => f.done);
}
function burst(kind, x, y, z, power = 1) {
  A.sfx('glass');
  if (kind === 'fulminate') {
    P.explosion(x, y, z, 1.1 * power); game.shake(5 * power);
    for (const e of W.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 34 * power) { hurtEnemy(e, 3 * power, Math.atan2(e.y - y, e.x - x)); E.knockback({ x, y }, e, 240); e.stun = Math.max(e.stun, .6); }
    for (const p of players()) if (Math.hypot(p.x - x, p.y - y) < 20 && p.who !== 'GRAY') hurtPlayer(p, 1, Math.atan2(p.y - y, p.x - x));
    makeNoise(x, y, 160);
  } else if (kind === 'phosphine') {
    W.clouds.push({ x, y, r: 10, grow: 38 * power, t: 6, kind: 'gas' }); A.sfx('fizz'); P.smoke(x, y, z + 4, 10, { color: '#8ae05a', size: 1.4 });
  } else {
    P.dust(x, y, z, 10); P.glints(x, y, z + 4, 6, '#ffffff'); makeNoise(x, y, 110);
    W.toasts.length < 3 && W.stealth && W.toasts.push(['Clatter', 'Anyone nearby will go and look.']);
  }
}
function updateClouds(dt) {
  for (const c of W.clouds) {
    c.t -= dt; c.r = Math.min(c.grow, c.r + dt * (c.kind === 'shock' ? 260 : 40));
    if (c.kind === 'gas') { for (const e of W.enemies) if (!e.dead && Math.hypot(e.x - c.x, e.y - c.y) < c.r) e.gas = Math.max(e.gas, 1.2); if (Math.random() < dt * 8) P.smoke(c.x + (Math.random() - .5) * c.r, c.y + (Math.random() - .5) * c.r, 4, 1, { color: '#7ad04a', size: 1.2 }); }
    if (c.kind === 'shock') { for (const p of players()) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (Math.abs(d - c.r) < 8 && p.z < 4 && !c['hit' + p.who]) { c['hit' + p.who] = true; hurtPlayer(p, 1, Math.atan2(p.y - c.y, p.x - c.x)); } } }
  }
  E.prune(W.clouds, c => c.t <= 0);
}
function makeNoise(x, y, loud) { W.noise.push({ x, y, z: 0, loud, t: .2 }); }

/* ---- Pickups: flasks, first aid, cash ---- */
const PICK = {
  fulminate: { spr: FLASK_SPR.fulminate, text: '+2 Fulminate' }, phosphine: { spr: FLASK_SPR.phosphine, text: '+2 Phosphine' },
  medkit: { spr: E.sprite(['wwwww', 'wwrww', 'wrrrw', 'wwrww', 'wwwww'], { w: '#f0f0f0', r: '#d83a3a' }), text: 'First aid' },
  cash: { spr: E.sprite(['ggggg', 'gGdGg', 'ggggg'], { g: '#4a9a4a', G: '#8ae08a', d: '#2a5a2a' }), text: '+$500' }
};
function dropPickup(x, y, kind) { W.pickups.push({ x, y, z: 0, kind: kind || E.pick(['fulminate', 'phosphine', 'medkit', 'cash']), t: 0 }); }
function updatePickups(dt) {
  for (const p of W.pickups) {
    p.t += dt;
    for (const a of players()) if (Math.hypot(a.x - p.x, a.y - p.y) < 12) {
      p.done = true; A.sfx('pickup'); P.glints(p.x, p.y, 8, 6, '#ffffff'); P.text(p.x, p.y, 20, PICK[p.kind].text, '#ffffff');
      if (p.kind === 'medkit') a.hp = Math.min(a.maxHp, a.hp + 2); else if (p.kind === 'cash') STATE.cash += 500; else W.hero.ammo[p.kind] += 2;
      break;
    }
  }
  E.prune(W.pickups, p => p.done || p.t > 25);
}

/* ---- Barks: one-line radio-style chatter over play (non-modal) ---- */
let talk = null, barkTalk = null;
function bark(who, line) { if (!barkTalk) return; barkTalk.say(line, { name: (CAST[who] || {}).name || who, auto: 2.2, modal: false, place: 'bottom', alpha: .85 }); barkTalk.who = who; }

/* ---- Drawing the cast ---- */
function drawActor(r, a, o = {}) {
  if (a.hidden) return;
  const ground = W.map.groundAt ? W.map.groundAt(a.x, a.y, a.r || 5, a.z) : 0;
  r.shadow(a.x, a.y, a.kind === 'boss' ? 10 : 6, .35, undefined, ground);
  const flash = (a.hurtT > 0 && Math.floor(game.time * 20) % 2 === 0) ? '#ffffff' : (a.inv > 0 && a.team === 'player' && Math.floor(game.time * 16) % 2 === 0 ? '#ffe0e0' : null);
  r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view), { flash, xray: a.team === 'player' ? { actors: true, color: a.who === 'GRAY' ? '#59c8f0' : '#e8c040' } : undefined, alpha: o.alpha, ghost: a.rollT > 0 ? { color: '#59c8f0', life: .2, alpha: .4, owner: a } : undefined });
  if (a.who === 'GRAY' && a.catalyst > 0) drawHat(r, a);
}
// the hat and the glasses: drawn over the head joint so they follow every pose, in every view
function drawHat(r, a) {
  const hd = a.rig.head ? a.rig.head() : { x: a.x, y: a.y, z: a.z + 34 };
  r.queue(hd.x, hd.y, hd.z + 6, g => {
    const p = r.w(hd.x, hd.y, hd.z + 5), k = (r.view.zoom || 1), sx = Math.round(p[0]), sy = Math.round(p[1]);
    const B = Math.round(8 * k), C = Math.round(5 * k), H = Math.max(2, Math.round(4 * k));
    px.rect(g, sx - B, sy, B * 2, Math.max(1, Math.round(2 * k)), '#101012');
    px.rect(g, sx - C, sy - H, C * 2, H, '#1a1a1e');
    px.rect(g, sx - C, sy - Math.max(1, Math.round(1.4 * k)), C * 2, Math.max(1, Math.round(k)), '#5a4630');
    px.rect(g, sx - C + 1, sy - H, Math.max(1, Math.round(2 * k)), 1, '#3a3a40');
  }, { bias: 3 });
}
function rigState(a, extra) {
  return Object.assign({ x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, hurt: a.hurtT > 0, sprint: a.sprint, crouch: a.crouch, flip: a.rollT > 0 ? clamp(1 - a.rollT / .3, 0, 1) : 0,
    attack: a.melee ? a.melee.state : (a.atk ? a.atk.state : null) }, extra || {});
}

/* ---- 30-cook.js ---- */
/* =====================================================================================
 * 30 THE COOK — the signature mechanic. Four stages of chemistry played as precision: MEASURE (hold, release on the
 * line), HEAT (keep the temperature in the band while it drifts and bumps), STIR (swirl the directions on the beat),
 * CRYSTALLIZE (stop each tray's shimmer at its peak). Their scores make the purity; 96% and up comes out blue.
 * Lab upgrades widen each stage's tolerance. The chemistry is fictional on purpose.
 * ===================================================================================== */
const REAGENTS = [
  { id: 'Px', name: 'Precursor X', color: '#d8d0a0' }, { id: 'Ct', name: 'Catalyst Teal', color: '#4ac8b8' },
  { id: 'Rd', name: 'Reducer Red', color: '#d85a4a' }, { id: 'Sv', name: 'Solvent Seven', color: '#a8c8e8' }
];
const STATE = { cash: 0, total: 0, best: 0, upgrades: { glass: 0, condenser: 0, stirrer: 0, trays: 0, suit: 0 }, cleared: {}, chapter: 0, batches: 0, product: 0 };
const UP = () => STATE.upgrades;

class Cook {
  constructor(o = {}) {
    this.o = o; this.I = o.input || game.input; this.auto = !!o.auto; this.fast = !!o.fast; this.stage = -1; this.t = 0; this.scores = { measure: 0, heat: 0, stir: 0, crystal: 0 };
    this.done = false; this.result = null; this.bubbles = []; this.fx = 0; this.level = 0; this.liquid = '#c8d8e0';
    this.next();
  }
  get main() { const I = this.I; return I.down('interact') || I.down('confirm') || (I.lastDevice === 'mouse' && I.down('throw')); }
  get mainPressed() { const I = this.I; return I.pressed('interact') || I.pressed('confirm') || (I.lastDevice === 'mouse' && I.pressed('throw')); }
  mainLabel() { return this.I.lastDevice === 'mouse' ? 'Left click' : label('interact', this.I); }
  next() {
    this.stage++; this.t = 0; this.intro = this.fast ? .6 : 1.4;
    const u = UP();
    if (this.stage === 0) { this.reagents = [REAGENTS[0], REAGENTS[1]]; this.ri = 0; this.fill = 0; this.target = .55 + Math.random() * .3; this.tol = .035 + u.glass * .015; this.mScores = []; this.pouring = false; A.sfx('select'); }
    if (this.stage === 1) { this.temp = .2; this.burner = .3; this.band = [.52 - .07 - u.condenser * .025, .52 + .07 + u.condenser * .025]; this.dur = this.fast ? 6 : 9; this.inside = 0; this.bump = 2; this.bandDrift = 0; }
    if (this.stage === 2) { const dirs = ['up', 'right', 'down', 'left']; this.notes = []; const n = this.fast ? 8 : 12; for (let i = 0; i < n; i++) this.notes.push({ at: 1.2 + i * .5 + (i > 5 ? .25 : 0), dir: dirs[(i + (i % 3 === 2 ? 2 : 0)) % 4], hit: null }); this.win = .14 + u.stirrer * .03; this.sScore = 0; }
    if (this.stage === 3) { this.trays = [0, 0, 0].map((_, i) => ({ speed: 1.6 + i * .5, phase: Math.random() * 6, stopped: null })); this.ti = 0; this.zone = .1 + u.trays * .03; }
    if (this.stage === 4) this.finish();
  }
  finish() {
    const s = this.scores, u = UP();
    const q = s.measure * .25 + s.heat * .35 + s.stir * .2 + s.crystal * .2;
    let purity = 62 + q * 37.1 + u.suit * .4;
    purity = Math.min(99.1, Math.round(purity * 10) / 10);
    const lbs = Math.round((3 + u.condenser + u.trays) * (.6 + q * .6) * 10) / 10;
    this.result = { purity, lbs, blue: purity >= 96, grade: purity >= 98 ? 'S' : purity >= 94 ? 'A' : purity >= 88 ? 'B' : purity >= 80 ? 'C' : 'D', scores: Object.assign({}, s) };
    this.t = 0; this.done = false; this.showing = true;
    A.sfx(this.result.blue ? 'powerup' : 'confirm');
    if (this.result.blue) game.flash('#59c8f0', .2, .5);
  }
  update(dt) {
    this.t += dt; this.fx += dt;
    const I = this.I;
    for (const b of this.bubbles) { b.y -= b.v * dt; b.t -= dt; }
    E.prune(this.bubbles, b => b.t <= 0);
    if (this.showing) {   // the result card
      if (this.t > (this.auto ? 2.5 : .8) && (this.mainPressed || this.auto)) { this.done = true; A.sfx('confirm'); }
      return;
    }
    if (this.intro > 0) { this.intro -= dt; return; }
    const s = this.stage;
    if (s === 0) {   // MEASURE: hold to pour, release on the line
      const want = this.auto ? this.fill < this.target - .005 : this.main;
      if (want) { this.fill += dt * (.42 + this.ri * .1); this.pouring = true; if (Math.random() < dt * 14) A.sfx('pour', { vol: .5 }); }
      else if (this.pouring && this.fill > .05) {
        const err = Math.abs(this.fill - this.target), sc = err <= this.tol ? 1 : Math.max(0, 1 - (err - this.tol) * 6);
        this.mScores.push(sc); this.flashMsg = sc > .95 ? 'PERFECT' : sc > .7 ? 'CLOSE' : this.fill > this.target ? 'OVERPOURED' : 'SHORT'; this.msgT = 1;
        A.sfx(sc > .7 ? 'coin' : 'bump'); this.level += .3; this.liquid = mixHex(this.liquid, this.reagents[this.ri].color, .55);
        this.pouring = false; this.fill = 0; this.ri++; this.target = .5 + Math.random() * .38;
        if (this.ri >= this.reagents.length) { this.scores.measure = this.mScores.reduce((a, b) => a + b, 0) / this.mScores.length; this.next(); }
      }
      if (this.fill >= 1) { this.fill = 1; this.pouring = true; }
    } else if (s === 1) {   // HEAT: the burner level from up/down (or holding the main button)
      const m = I.move(); let up = -m[1];
      if (this.main) up = 1;
      if (this.auto) { const mid = (this.band[0] + this.band[1]) / 2; up = clamp((mid - this.temp) * 8 - (this.temp - (this.prevT || this.temp)) * 60, -1, 1); }
      this.prevT = this.temp;
      this.burner = clamp(this.burner + up * dt * 1.1, 0, 1);
      this.bump -= dt; if (this.bump <= 0) { this.bump = 1.2 + Math.random() * 1.6; this.kick = (Math.random() < .5 ? -1 : 1) * (.12 + Math.random() * .1); A.sfx('bubble', { pitch: .6 }); }
      const kick = this.kick || 0; this.kick = kick * Math.pow(.02, dt);
      this.bandDrift += dt; const off = Math.sin(this.bandDrift * .9) * .06; this.cur = [this.band[0] + off, this.band[1] + off];
      this.temp = clamp(this.temp + ((this.burner * .9 + .05) - this.temp) * dt * 1.4 + kick * dt * 3, 0, 1);
      const inside = this.temp >= this.cur[0] && this.temp <= this.cur[1]; if (inside) this.inside += dt;
      if (this.temp > .85 && Math.random() < dt * 6) P && A.sfx('fizz', { vol: .3 });
      if (Math.random() < dt * (4 + this.temp * 20)) this.bubbles.push({ x: (Math.random() - .5) * 16, y: 0, v: 8 + this.temp * 30, t: .8 });
      if (this.t >= this.dur) { this.scores.heat = clamp(this.inside / this.dur * 1.12, 0, 1); this.next(); }
    } else if (s === 2) {   // STIR: directions on the beat
      const dirs = ['up', 'right', 'down', 'left'];
      if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) A.sfx('tick', { vol: .6 });
      for (const n of this.notes) {
        if (n.hit !== null) continue;
        const dtn = this.t - n.at;
        if (this.auto && Math.abs(dtn) < .02) { n.hit = 1; this.sScore += 1; A.sfx('blip'); this.hitMsg(1); continue; }
        if (dtn > this.win) { n.hit = 0; this.hitMsg(0); A.sfx('bump', { vol: .4 }); }
      }
      if (!this.auto) for (const d of dirs) if (I.pressed(d)) {
        const n = this.notes.find(n => n.hit === null && Math.abs(this.t - n.at) <= this.win * 1.6);
        if (n && n.dir === d) { const q = Math.abs(this.t - n.at) <= this.win * .5 ? 1 : Math.abs(this.t - n.at) <= this.win ? .75 : .4; n.hit = q; this.sScore += q; this.hitMsg(q); A.sfx('blip', { pitch: 1 + q * .3 }); this.level = Math.min(1, this.level + .02); }
        else if (n) { n.hit = 0; this.hitMsg(0); A.sfx('bump', { vol: .4 }); }
      }
      if (this.notes.every(n => n.hit !== null)) { this.scores.stir = this.sScore / this.notes.length; this.next(); }
    } else if (s === 3) {   // CRYSTALLIZE: stop each tray at the top of its shimmer
      const tr = this.trays[this.ti];
      if (tr) {
        const v = (Math.sin(this.t * tr.speed * 2 + tr.phase) + 1) / 2;
        tr.v = v;
        const go = this.auto ? v > 1 - this.zone * .4 : this.mainPressed;
        if (go) { tr.stopped = v; const sc = v >= 1 - this.zone ? 1 : Math.max(0, 1 - (1 - this.zone - v) * 3); tr.score = sc; A.sfx(sc > .9 ? 'coin' : 'glass', { vol: .6 }); this.hitMsg(sc); this.ti++; this.t = 0; }
      } else { this.scores.crystal = this.trays.reduce((a, t) => a + t.score, 0) / 3; this.next(); }
    }
    if (this.msgT > 0) this.msgT -= dt;
  }
  hitMsg(q) { this.flashMsg = q >= 1 ? 'PERFECT' : q >= .7 ? 'GOOD' : q > 0 ? 'SLOPPY' : 'MISS'; this.msgT = .6; }

  /* ---- Drawing: a big readable bench at 10 feet: the flask, the burner, one gauge per stage, one prompt ---- */
  draw(r) {
    r.overlay(g => {
      const W2 = r.W, H2 = r.H, cx = Math.round(W2 / 2), cy = Math.round(H2 / 2);
      px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W2, H2, '#080a0c'));
      const bw = Math.min(W2 - 16, 400), bh = Math.min(H2 - 16, 236), bx = cx - (bw >> 1), by = cy - (bh >> 1);
      E.ui.box(g, bx, by, bw, bh, { bg: ['#1a2228', '#0e1216'], border: '#59c8f0' });
      const names = ['MEASURE', 'HEAT', 'STIR', 'CRYSTALLIZE'];
      E.font.title(g, this.showing ? 'THE BATCH' : (names[this.stage] || ''), cx, by + 8, { scale: 2, align: 'center', colors: ['#e8fbff', '#9ae4ff', '#3aa8d8'] });
      // the stage pips
      for (let i = 0; i < 4; i++) { const x = cx - 98 + i * 50, done = i < this.stage || this.showing, on = i === this.stage && !this.showing; px.rect(g, x, by + 30, 46, 4, done ? '#59c8f0' : on ? '#e8c040' : '#3a4a52'); E.font.text(g, ['MEASURE', 'HEAT', 'STIR', 'CRYSTAL'][i], x + 23, by + 37, on ? '#ffffff' : '#7a8a92', { align: 'center', font: 'tiny' }); }
      const fx = bx + 70, fy = by + 150;   // the flask
      this.drawFlask(g, fx, fy);
      const gx = bx + 140, gw = bw - 156, gy = by + 58;
      if (this.showing) return this.drawResult(g, gx, gy, gw);
      if (this.intro > 0) {
        const tips = ['Hold to pour. Let go on the line.', 'Keep the temperature inside the band.', 'Swirl each direction as it reaches the line.', 'Stop each tray at the top of its shimmer.'];
        E.font.text(g, tips[this.stage], gx + gw / 2, gy + 50, '#ffffff', { align: 'center', scale: 1, wrap: gw });
        return;
      }
      const s = this.stage, I = this.I;
      if (s === 0) {
        const rg = this.reagents[this.ri] || this.reagents[1];
        E.font.text(g, rg.name.toUpperCase() + '  (' + rg.id + ')', gx, gy, rg.color, { shadow: '#000' });
        const mx = gx + 10, mh = 120, mw = 34, my = gy + 16;
        E.ui.box(g, mx, my, mw, mh, { bg: '#0a0e10', border: '#7a8a92', gradient: false });
        const fh = Math.round((mh - 4) * this.fill); px.rect(g, mx + 2, my + mh - 2 - fh, mw - 4, fh, rg.color);
        const ty = my + mh - 2 - Math.round((mh - 4) * this.target), tt = Math.max(2, Math.round((mh - 4) * this.tol));
        px.blend(g, .5, 'add', () => px.rect(g, mx - 4, ty - tt, mw + 8, tt * 2, '#3ae070'));
        px.rect(g, mx - 6, ty, mw + 12, 1, '#7aff9a');
        E.font.text(g, 'LINE', mx + mw + 10, ty - 3, '#7aff9a');
        E.font.text(g, (this.ri + 1) + ' / 2', gx + gw - 4, gy, '#9ab', { align: 'right' });
        this.prompt(g, gx + gw / 2 + 24, gy + 150, 'Hold ' + this.mainLabel(), 'to pour');
      } else if (s === 1) {
        const mx = gx + 10, mw = 34, mh = 120, my = gy + 6;
        E.ui.box(g, mx, my, mw, mh, { bg: '#0a0e10', border: '#7a8a92', gradient: false });
        const b0 = my + mh - 2 - Math.round((mh - 4) * this.cur[1]), b1 = my + mh - 2 - Math.round((mh - 4) * this.cur[0]);
        px.blend(g, .45, 'add', () => px.rect(g, mx + 2, b0, mw - 4, b1 - b0, '#3ae070'));
        const ty = my + mh - 2 - Math.round((mh - 4) * this.temp), hot = this.temp > this.cur[1], cold = this.temp < this.cur[0];
        px.rect(g, mx - 5, ty - 1, mw + 10, 3, hot ? '#ff5a3a' : cold ? '#5a9aff' : '#ffffff');
        E.font.text(g, Math.round(60 + this.temp * 180) + ' C', mx + mw + 10, ty - 3, hot ? '#ff8a6a' : cold ? '#8abaff' : '#ffffff', { shadow: '#000' });
        E.font.text(g, hot ? 'TOO HOT' : cold ? 'TOO COLD' : 'HOLD IT', gx + gw - 4, gy + 6, hot ? '#ff8a6a' : cold ? '#8abaff' : '#7aff9a', { align: 'right', scale: 1 });
        E.ui.bar(g, gx + gw - 84, gy + 20, 80, 5, this.t / this.dur, '#59c8f0');
        E.font.text(g, 'BURNER', gx + gw - 84, gy + 28, '#9ab', { font: 'tiny' }); E.ui.bar(g, gx + gw - 84, gy + 36, 80, 4, this.burner, '#e8803a');
        const up = isPad(I) ? 'L stick ↑↓' : I.lastDevice === 'mouse' ? 'W / S' : label('up', I) + ' / ' + label('down', I);
        this.prompt(g, gx + gw / 2 + 24, gy + 150, up, 'flame up / down');
      } else if (s === 2) {
        const lx = gx + 16, ly = gy + 70, span = gw - 32, speed = 90;
        px.rect(g, lx, ly - 14, span, 28, '#0a0e10');
        px.rect(g, lx + 20, ly - 16, 2, 32, '#7aff9a');
        const arrow = { up: '↑', right: '→', down: '↓', left: '←' };
        for (const n of this.notes) {
          const x = lx + 20 + (n.at - this.t) * speed; if (x < lx - 4 || x > lx + span) continue;
          const col = n.hit === null ? '#ffffff' : n.hit > .7 ? '#7aff9a' : n.hit > 0 ? '#e8c040' : '#ff5a4a';
          E.font.text(g, arrow[n.dir], Math.round(x), ly - 7, col, { scale: 2, align: 'center', shadow: '#000' });
        }
        const keys = isPad(I) ? 'D-pad or stick' : I.lastDevice === 'mouse' ? 'W A S D' : ['up', 'left', 'down', 'right'].map(a => label(a, I)).join(' ');
        this.prompt(g, gx + gw / 2 + 24, gy + 150, keys, 'swirl on the line');
      } else if (s === 3) {
        for (let i = 0; i < 3; i++) {
          const tr = this.trays[i], x = gx + 14 + i * Math.floor((gw - 20) / 3), w = Math.floor((gw - 20) / 3) - 10, y = gy + 20, h = 90;
          E.ui.box(g, x, y, w, h, { bg: '#0a0e10', border: i === this.ti ? '#e8c040' : '#5a6a72', gradient: false });
          const v = tr.stopped !== null ? tr.stopped : (i === this.ti ? tr.v || 0 : 0), hh = Math.round((h - 6) * v);
          px.blend(g, .4, 'add', () => px.rect(g, x + 3, y + 3, w - 6, Math.max(2, Math.round((h - 6) * this.zone)), '#e8c040'));
          px.rect(g, x + 3, y + h - 3 - hh, w - 6, hh, v >= 1 - this.zone ? '#9ae8ff' : '#4a8ab0');
          for (let k = 0; k < 5; k++) { const sx = x + 6 + ((k * 13 + Math.floor(this.fx * 30)) % Math.max(1, w - 12)), sy = y + h - 4 - Math.round(hh * ((k * 37) % 10) / 10); px.dot(g, sx, sy, '#e8fbff'); }
          if (tr.stopped !== null) E.font.text(g, tr.score >= 1 ? 'PERFECT' : tr.score > .6 ? 'GOOD' : 'CLOUDY', x + w / 2, y + h + 4, tr.score >= 1 ? '#7aff9a' : '#e8c040', { align: 'center', font: 'tiny' });
        }
        this.prompt(g, gx + gw / 2 + 24, gy + 150, 'Press ' + this.mainLabel(), 'at the top');
      }
      if (this.msgT > 0 && this.flashMsg) E.font.text(g, this.flashMsg, gx + gw / 2, gy + 124, this.flashMsg === 'PERFECT' ? '#7aff9a' : this.flashMsg === 'MISS' || this.flashMsg === 'OVERPOURED' ? '#ff6a5a' : '#e8c040', { align: 'center', scale: 2, shadow: '#000' });
    });
  }
  prompt(g, x, y, key, what) {
    const w = E.font.width(key) + 10;
    const tw = w + 6 + E.font.width(what), x0 = Math.round(x - tw / 2);
    E.ui.box(g, x0, y - 3, w, 13, { bg: '#e8e4dc', border: '#ffffff', gradient: false });
    E.font.text(g, key, x0 + 5, y, '#14100c');
    E.font.text(g, what, x0 + w + 6, y, '#e8e4dc', { shadow: '#000' });
  }
  drawFlask(g, x, y) {
    const lvl = clamp(this.level, .15, .95), blue = this.showing && this.result.blue;
    const col = this.showing ? (blue ? '#59c8f0' : this.result.purity > 85 ? '#a8c8c0' : '#c8b890') : this.liquid;
    // burner flame
    const fl = this.stage === 1 ? this.burner : this.stage >= 2 ? .4 : .15;
    for (let i = 0; i < 6; i++) { const h = Math.round((6 + fl * 20) * (.6 + .4 * Math.sin(this.fx * 20 + i * 1.7))); px.rect(g, x - 9 + i * 3, y + 8 - h, 2, h, i % 2 ? '#ffb040' : '#4a8aff'); }
    px.rect(g, x - 14, y + 8, 28, 6, '#5a5a62'); px.rect(g, x - 14, y + 8, 28, 1, '#8a8a92');
    const body = [[x - 26, y], [x + 26, y], [x + 7, y - 52], [x + 7, y - 74], [x - 7, y - 74], [x - 7, y - 52]];
    px.blend(g, .35, 'normal', () => px.poly(g, body, '#c8e8f0'));
    const ly = Math.round(y - 52 * lvl), wl = 7 + (26 - 7) * (1 - (y - ly) / 52);
    px.poly(g, [[x - 26, y], [x + 26, y], [x + wl, ly], [x - wl, ly]], col);
    px.blend(g, .4, 'add', () => px.poly(g, [[x - 20, y - 2], [x - 10, y - 2], [x - wl * .4, ly + 2], [x - wl * .8, ly + 2]], '#ffffff'));
    for (const b of this.bubbles) px.dot(g, Math.round(x + b.x), Math.round(y - 4 - (.8 - b.t) * 40), '#ffffff');
    px.line(g, x - 26, y, x - 7, y - 52, '#e8fbff'); px.line(g, x + 26, y, x + 7, y - 52, '#a8c8d0'); px.line(g, x - 7, y - 52, x - 7, y - 74, '#e8fbff'); px.line(g, x + 7, y - 52, x + 7, y - 74, '#a8c8d0');
    if (blue) for (let i = 0; i < 6; i++) { const a = this.fx * 2 + i; px.dot(g, Math.round(x + Math.cos(a) * 30), Math.round(y - 30 + Math.sin(a * 1.3) * 34), '#e8fbff'); }
  }
  drawResult(g, gx, gy, gw) {
    const R = this.result, s = R.scores;
    E.font.text(g, R.purity.toFixed(1) + '%', gx + gw / 2, gy, R.blue ? '#9ae8ff' : '#e8e4dc', { align: 'center', scale: 3, shadow: '#000' });
    E.font.text(g, R.blue ? 'BLUE. GLASS GRADE.' : R.purity >= 88 ? 'Clean. Not blue.' : 'Cloudy. Embarrassing.', gx + gw / 2, gy + 26, R.blue ? '#59c8f0' : '#c8b8a0', { align: 'center' });
    const rows = [['Measure', s.measure], ['Heat', s.heat], ['Stir', s.stir], ['Crystal', s.crystal]];
    rows.forEach(([n, v], i) => { const y = gy + 44 + i * 14; E.font.text(g, n, gx + 8, y, '#c8d0d4'); E.ui.bar(g, gx + 70, y + 1, gw - 120, 5, v, v > .85 ? '#59c8f0' : v > .6 ? '#e8c040' : '#d85a4a'); E.font.text(g, Math.round(v * 100) + '', gx + gw - 8, y, '#ffffff', { align: 'right' }); });
    E.font.text(g, R.lbs + ' lb  •  grade ' + R.grade, gx + gw / 2, gy + 106, '#ffffff', { align: 'center', scale: 1 });
    if (this.t > .8) this.prompt(g, gx + gw / 2 + 24, gy + 130, this.mainLabel(), 'continue');
  }
}

/* ---- 40-missions.js ---- */
/* =====================================================================================
 * 40 MISSIONS — Episode One, "Pilot Light", as data: each chapter names its location, mood, music and rules, sets
 * its people down (setup) and plays as beats (generators run by game.script). Each beat is a checkpoint: a failure
 * restarts the chapter at its beat. A designer writes a new chapter with the M toolkit below; nothing else changes.
 * M toolkit: say, objective, npc, act, waitAct, reach, cook, wave, cut, banner, walk, give, flag.
 * ===================================================================================== */
const M = {
  mission: null, beat: 0, flags: {}, choice: -1, cookObj: null, cut: false, script: null, lastCook: null, waves: 0,
  say(who, lines, o = {}) {
    M.choice = -1;
    const c = CAST[who], name = o.name || (c ? c.name : who === 'NARRATOR' ? '' : who);
    talk.who = who;
    talk.say(Array.isArray(lines) ? lines : [lines], { name, portrait: who === 'NARRATOR' ? null : portraitOf(who), choices: o.choices, onChoice: i => { M.choice = i; }, place: o.place, vars: o.vars });
    return () => !talk.open;
  },
  objective(title, text, at, step) { W.objective = { title, text, at: at || null, step: step || null }; W.marker = at ? Object.assign({ label: o2label(title) }, at) : null; if (title) A.sfx('select', { vol: .5 }); },
  npc(who, cx, cy, o = {}) {
    const b = new E.Body({ x: cx * R16, y: cy * R16, r: 5 });
    const n = Object.assign(b, { who, rig: makeRig(who, o.rig), facing: o.facing === undefined ? Math.PI / 2 : o.facing, pose: o.pose || null, goal: null, speed: o.speed || 60, team: 'npc', expr: null, solid: o.solid !== false });
    W.npcs.push(n); return n;
  },
  act(o) { const a = Object.assign({ r: 20, active: true, used: false, verb: 'Use' }, o); a.x = a.x !== undefined ? a.x : a.cx * R16; a.y = a.y !== undefined ? a.y : a.cy * R16; W.acts.push(a); return a; },
  waitAct(a) { return () => a.used; },
  reach(x, y, r = 18) { return () => W.hero && Math.hypot(W.hero.x - x, W.hero.y - y) < r; },
  walk(n, cx, cy) { n.goal = { x: cx * R16, y: cy * R16 }; return () => !n.goal; },
  cook(o = {}) { M.cookObj = new Cook(Object.assign({ auto: W.attract }, o)); music('cook'); return () => { if (M.cookObj && M.cookObj.done) { M.lastCook = M.cookObj.result; M.cookObj = null; return true; } return false; }; },
  wave(list) { for (const [kind, cx, cy, o] of list) { const e = makeEnemy(kind, cx * R16, cy * R16, o); W.enemies.push(e); P.dust(e.x, e.y, 0, 8); } M.waves++; return () => W.enemies.every(e => e.dead); },
  banner(text, sub, t = 2.4) { W.banner = { text, sub }; W.bannerT = t; },
  give(cash) { STATE.cash += cash; STATE.total += cash; A.sfx('cash'); W.toasts.push([fmtMoney(cash), 'Added to the duffel bag.']); },
  flag(k, v) { if (v !== undefined) M.flags[k] = v; return M.flags[k]; }
};
function o2label(t) { return String(t || '').toUpperCase().split(' ').slice(0, 3).join(' '); }

/* ---- Cast setups used by more than one chapter ---- */
function schoolStudents() {
  return { kyle: M.npc('KYLE', 5.5, 5.4, { facing: -Math.PI / 2, pose: 'hips' }), bri: M.npc('BRIANNA', 8, 3.3, { facing: -Math.PI / 2 }), marcus: M.npc('MARCUS', 10.5, 7.4, { facing: -Math.PI / 2, pose: 'kneel' }) };
}

const CHAPTERS = [
  /* ================= 1. CHEMISTRY IS THE STUDY OF CHANGE ================= */
  { id: 'ch1', title: 'Chemistry Is the Study of Change', loc: 'school', night: false, music: 'school', flasks: [], about: 'Teach. Cough. Find out.',
    cold: ['ALAMO VERDE, NEW MEXICO.', 'Leland Gray is fifty years old. A master\'s in chemistry, a mortgage, and a sedan that smells like burnt coffee.', 'This is the last ordinary day of his life.'],
    spawn: [6.5, 2.4],
    setup() { M.flags.s = schoolStudents(); M.npc('MARTY', 25.5, 5, { facing: Math.PI, pose: 'hips' }); },
    beats: [
      { run: function* () {
        yield M.say('GRAY', ['Chemistry. It is, technically, the study of matter.', 'But I prefer to see it as the study of {c=#59c8f0}change{/c}.', 'Growth. Decay. Transformation. ...Kyle, the phone.']);
        const s = M.flags.s, quiz = { right: 0 };
        const student = n => M.act({ x: n.x, y: n.y, name: CAST[n.who].name, verb: 'Talk to', npc: n });
        const aK = student(s.kyle), aB = student(s.bri), aM = student(s.marcus);
        M.objective('Teach the class', 'Talk to Kyle, Brianna and Marcus', null, '0 / 3');
        let done = 0;
        while (done < 3) {
          yield () => aK.used || aB.used || aM.used;
          if (aK.used && !aK.talked) { aK.talked = true; aK.active = false;
            yield M.say('KYLE', ['I\'m, like, looking up the answer, Mr. G.']);
            yield M.say('GRAY', ['Then you\'ll know it. Two atoms share electrons. What holds them together?'], { choices: ['An ionic bond', 'A covalent bond', 'A James bond'] });
            if (M.choice === 1) { quiz.right++; yield M.say('KYLE', ['Covalent. Cool. Can I go back to my phone?']); yield M.say('GRAY', ['No.']); }
            else if (M.choice === 2) yield M.say('GRAY', ['...Shaken, Kyle. Not stirred. Detention.']);
            else yield M.say('GRAY', ['Close. Ionic bonds {c=#e8c040}steal{/c}. Covalent bonds {c=#59c8f0}share{/c}. Write that down.']);
          }
          if (aB.used && !aB.talked) { aB.talked = true; aB.active = false;
            yield M.say('BRIANNA', ['Mr. Gray, is it true chemistry is literally everywhere?']);
            yield M.say('GRAY', ['Everywhere. The coffee. The rust on my car. The—']); A.sfx('cough'); game.shake(2);
            yield M.say('BRIANNA', ['...Are you okay?']);
            yield M.say('GRAY', ['Chalk dust. Question. What does a catalyst do to a reaction?'], { choices: ['Speeds it up', 'Slows it down', 'Gets used up'] });
            if (M.choice === 0) { quiz.right++; yield M.say('GRAY', ['It speeds things along, and walks away {c=#59c8f0}unchanged{/c}. Remember that word. Catalyst.']); }
            else yield M.say('GRAY', ['No. A catalyst speeds things along, and walks away unchanged. Remember that word.']);
          }
          if (aM.used && !aM.talked) { aM.talked = true; aM.active = false; s.marcus.pose = null;
            yield M.say('MARCUS', ['Zzz... five more minutes, Ma...']);
            yield M.say('GRAY', ['Marcus. The most stable form of carbon at room temperature. Go.'], { choices: ['Diamond', 'Graphite', 'Charcoal briquettes'] });
            if (M.choice === 1) { quiz.right++; yield M.say('GRAY', ['Graphite. The thing in your pencil. Which you would know, if you ever held one.']); }
            else if (M.choice === 0) yield M.say('GRAY', ['Diamonds aren\'t forever, Marcus. Thermodynamically, they\'re just... patient.']);
            else yield M.say('MARCUS', ['My uncle says briquettes are the most stable thing in his life.']);
          }
          done = [aK, aB, aM].filter(a => a.talked).length; W.objective.step = done + ' / 3';
        }
        M.flags.quiz = quiz.right;
        A.sfx('bell');
        yield M.say('GRAY', ['Chapter four for Monday. There will be a quiz.', 'There is always a quiz.']);
      } },
      { at: [11, 11.5], run: function* () {
        M.objective('Go to the faculty lounge', 'Your brother-in-law is "visiting"', { x: 24.5 * R16, y: 5 * R16 });
        yield M.reach(24.5 * R16, 5.5 * R16, 40);
        M.cut = true;
        yield M.say('MARTY', ['There he is! Mr. Wizard! Brought you a coffee. It\'s gas station, but it\'s got heart.', 'Saw us on the news? Two hundred grand in a microwave. Cooks are idiots, Lee.', 'Product was garbage, too. Sixty percent, tops.']);
        yield M.say('GRAY', ['Sixty percent is barely a solution.']);
        yield M.say('MARTY', ['Ha! Come on a ride-along sometime. See some real chemistry.']);
        A.sfx('cough'); W.hero.kneel = 1; game.shake(3); yield .6; A.sfx('cough'); game.flash('#ffffff', .2, .4); yield .5;
        yield M.say('MARTY', ['Lee? ...Lee! Somebody call 911!']);
        game.flash('#000000', .6, 1); yield .8;
      } },
      { at: [15, 17], run: function* () {
        M.cut = true; W.hero.kneel = 0; W.dim = 1; music('sad');
        yield M.say('DOCTOR', ['Mr. Gray. The mass in your left lung is... it\'s not good news.', 'Inoperable. With treatment, maybe two years. Without...']);
        yield M.say('GRAY', ['...You have mustard on your coat.']);
        yield M.say('DOCTOR', ['I\'m sorry?']);
        yield M.say('NARRATOR', ['That night, he does the math. The mortgage. The treatment. A son starting college. A family that will need money long after he doesn\'t.', 'The numbers do not balance.', 'The next morning he takes Marty up on the ride-along, and from the back seat he watches a former student climb out of a meth house window with no pants on.']);
        W.dim = 0; music('stealth');
        M.objective('Find Danny', 'He\'s hiding by the old RV in the school lot', { x: M.flags.danny.x, y: M.flags.danny.y });
        M.cut = false;
        const aD = M.act({ x: M.flags.danny.x, y: M.flags.danny.y, name: 'DANNY', verb: 'Talk to' });
        yield M.waitAct(aD); aD.active = false; M.cut = true;
        yield M.say('DANNY', ['Mr. Gray?! Dude! What are you doing here?']);
        yield M.say('GRAY', ['I saw you, Danny. This morning. Out the window.']);
        yield M.say('DANNY', ['Man, you didn\'t see nothin\'. That was... a different guy. With my face.']);
        yield M.say('GRAY', ['You know the business. I know the chemistry.'], { choices: ['"Partner with me."', '"Or I call my brother-in-law."'] });
        yield M.say('DANNY', M.choice === 0 ? ['...You want to COOK? You? Dude, you\'re like the least cool guy I ever met.', 'Fine. FINE. Fifty-fifty. But we need real glassware, not the stuff from the dollar store.'] : ['Whoa. Whoa! Okay! Jeez! Fifty-fifty, okay?', 'But we need real glassware, dude. Lab stuff.']);
        yield M.say('GRAY', ['I know where to get some.']);
      } }
    ]
  },
  /* ================= 2. GLASSWARE ================= */
  { id: 'ch2', title: 'Glassware', loc: 'school', night: true, music: 'stealth', flasks: ['chalk'], stealth: true, about: 'Rob your own school. Quietly.',
    cold: ['11:40 P.M.', 'Alamo Verde High has one night janitor, one security guard, and one chemistry storeroom with a lock older than the students.', 'Mr. Gray has a key to everything but that.'],
    spawn: [14.5, 19],
    setup() {
      W.map.set(17, 7, 2); M.flags.door = true;
      W.guards.push(makeGuard('janitor', [[3, 11.5], [26, 11.5, 1.5], [26, 13], [3, 13, 1.5]]));
      W.guards.push(makeGuard('security', [[2, 16], [27, 16, 1.2], [27, 19.5], [2, 19.5, 1.2]]));
      W.guards.push(makeGuard('security', [[22, 2], [27, 8, 1], [22, 8], [27, 2, 1]]));
      M.npc('DANNY', 15, 20.2, { facing: -Math.PI / 2, pose: 'hips' });
    },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['Dude. Your big plan is to rob your own school?']);
        yield M.say('GRAY', ['I prefer {c=#59c8f0}"reallocate."{/c} Wait in the RV. Lights off.']);
        W.toasts.push(['Stay out of sight', 'Hold ' + label('sneak') + ' to sneak: slow and quiet. Sprinting is loud.']);
        W.toasts.push(['Throw chalk', label('throw') + ' throws chalk. Guards go and look where it lands.']);
        const keys = M.act({ cx: 27.5, cy: 7.5, name: 'HUGO\'S KEYS', verb: 'Take' });
        M.objective('Take the janitor\'s keys', 'Faculty lounge, on the hook', { x: keys.x, y: keys.y });
        yield M.waitAct(keys); keys.active = false; A.sfx('key'); M.flags.keys = true;
        W.toasts.push(['Keys', 'The storeroom key has a strip of tape on it that says STOREROOM. Of course it does.']);
      } },
      { at: [27, 7.5], run: function* () {
        const door = M.act({ cx: 17, cy: 8.2, name: 'STOREROOM DOOR', verb: 'Unlock' });
        M.objective('Unlock the storeroom', 'Off the hallway, north side', { x: door.x, y: door.y });
        yield M.waitAct(door); door.active = false; W.map.set(17, 7, 0); A.sfx('door'); M.flags.door = false;
        const items = [['ROUND-BOTTOM FLASK', 16, 2.5], ['CONDENSER', 18.5, 2.5], ['HEATING MANTLE', 16, 4.5], ['RESPIRATOR', 18.5, 6.5]].map(([n, cx, cy]) => M.act({ cx, cy, name: n, verb: 'Take', item: true }));
        let got = 0;
        while (got < 4) { M.objective('Take the glassware', 'Storeroom shelves', null, got + ' / 4'); yield () => items.filter(i => i.used).length > got; got = items.filter(i => i.used).length; items.forEach(i => { if (i.used) i.active = false; }); A.sfx('pickup'); }
      } },
      { at: [17, 6], run: function* () {
        bark('DANNY', 'Dude. Dude! Hurry up!');
        M.objective('Get back to the RV', 'Parking lot, by the bench', { x: 15 * R16, y: 20 * R16 });
        yield M.reach(15 * R16, 19.6 * R16, 22);
        M.cut = true;
        yield M.say('DANNY', ['You did it! Mr. Gray, you\'re like a ninja. A really old, really sweaty ninja.']);
        yield M.say('GRAY', ['Drive, Danny.']);
      } }
    ]
  },
  /* ================= 3. THE COOK ================= */
  { id: 'ch3', title: 'The Cook', loc: 'desert', night: false, music: 'title', flasks: [], about: 'Forty miles from anyone. Do it right.',
    cold: ['FORTY MILES OUTSIDE ALAMO VERDE.', 'An RV with a bad transmission. A teacher in his underwear and an apron. A kid with a respirator on backwards.', 'Precision is a choice.'],
    spawn: [21, 19],
    setup() { M.flags.d = M.npc('DANNY', 27.5, 15.6, { facing: Math.PI, pose: 'hips' }); },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['So... this is it. The middle of nowhere.']);
        yield M.say('GRAY', ['The middle of nowhere is where you go when you\'d like to be left alone with your work.', 'And Danny. Your respirator is on backwards.']);
        const rv = M.act({ cx: 22.6, cy: 16.4, name: 'THE RV', verb: 'Unload gear from' });
        M.objective('Unload the gear', 'From the back of the RV', { x: rv.x, y: rv.y });
        yield M.waitAct(rv); rv.active = false; A.sfx('door');
        const rig = M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Start' });
        M.objective('Start the cook', 'Fold-out table, beside the RV', { x: rig.x, y: rig.y });
        yield M.waitAct(rig); rig.used = false;
        yield M.say('GRAY', ['Four steps. Measure. Heat. Stir. Crystallize.', 'Every one of them is a chance to be sloppy. We won\'t be.']);
        yield M.cook({ tutorial: true });
        music('title');
        const R = M.lastCook; STATE.product += R.lbs; STATE.best = Math.max(STATE.best, R.purity); STATE.batches++;
        if (R.blue) { yield M.say('DANNY', ['Dude. DUDE. It\'s... blue? Why is it BLUE?']); yield M.say('GRAY', ['Because it\'s ' + R.purity.toFixed(1) + ' percent pure, Danny.', 'Because I am {c=#59c8f0}good{/c} at this.']); }
        else yield M.say('GRAY', [R.purity.toFixed(1) + ' percent. Acceptable. It is not good. Next time it will be good.']);
        M.flags.rig = rig;
      } },
      { at: [24, 19], run: function* () {
        const rig = M.flags.rig || M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Start' });
        rig.verb = 'Cook another batch'; rig.used = false; rig.active = true;
        const d = M.act({ x: M.flags.d.x, y: M.flags.d.y, name: 'DANNY', verb: 'Pack up with' });
        M.objective('Cook more, or pack up', 'Another batch at the table, or tell Danny you\'re done', null, STATE.product.toFixed(1) + ' lb');
        while (!d.used) {
          yield () => rig.used || d.used;
          if (rig.used) { rig.used = false; yield M.cook({}); music('title'); const R = M.lastCook; STATE.product += R.lbs; STATE.best = Math.max(STATE.best, R.purity); STATE.batches++; W.objective.step = STATE.product.toFixed(1) + ' lb'; bark('DANNY', R.blue ? 'Blue again! Yeah, science!' : 'Kinda cloudy, dude...'); }
        }
        yield M.say('DANNY', [STATE.product.toFixed(1) + ' pounds. I know a guy. Two-Tone Tito. He runs a junkyard.', 'He\'s a little... intense.']);
        yield M.say('GRAY', ['Then we\'ll be very calm.']);
      } }
    ]
  },
  /* ================= 4. TWO-TONE ================= */
  { id: 'ch4', title: 'Two-Tone', loc: 'junk', night: true, dusk: true, music: 'stealth', flasks: ['fulminate', 'phosphine'], combat: true, partner: true, about: 'Sell to a madman. Survive the haggling.',
    cold: ['TWO-TONE TITO\'S SALVAGE.', 'Tito Vargas got his nickname from a car he painted half pink in 2003 and never finished.', 'He finishes other things. Usually people.'],
    spawn: [17, 18],
    setup() {
      if (M.beat > 0) return;
      M.flags.tito = M.npc('TITO', 6, 4.8, { facing: Math.PI / 2, pose: 'hips' });
      M.flags.c1 = M.npc('THUG', 4.2, 5.5, { facing: Math.PI / 2, rig: { weapon: 'staff', colors: { cloth: '#2a5a8a' } } });
      M.flags.c2 = M.npc('GUNMAN', 8, 5.4, { facing: Math.PI / 2 });
    },
    beats: [
      { run: function* () {
        yield M.say('DANNY', ['Okay. Let me do the talking. Tito likes me. Mostly.']);
        M.objective('Meet Two-Tone Tito', 'His trailer, back of the yard', { x: 6 * R16, y: 6 * R16 });
        yield M.reach(6 * R16, 6.5 * R16, 40);
        M.cut = true;
        yield M.say('TITO', ['So YOU\'RE the guy. The teacher! Ha! TEACHER!', 'Let me see it.']);
        A.sfx('glass'); yield .4;
        yield M.say('TITO', ['Ohhhh. Ohhh, look at that. It\'s BLUE. That\'s... that is {shake}TIGHT{/shake}. Tight, tight, tight!', 'How much you got? How much you want?'], { choices: ['"$25,000 a pound."', '"$40,000 a pound."', '"Make me an offer."'] });
        const price = [25000, 40000, 18000][M.choice]; M.flags.price = price;
        yield M.say('TITO', M.choice === 1 ? ['FORTY?! ...Ha! I like you, teacher. You got cojones.'] : M.choice === 0 ? ['Twenty-five. Fair. Fair is boring, but okay.'] : ['Eighteen! See, THAT\'S a businessman.']);
        yield M.say('THUG', ['Tito, man, these guys could be cops. The old one looks like a cop.'], { name: 'GONZO' });
        A.sfx('punch'); game.shake(3); M.flags.c1.pose = 'down';
        yield M.say('TITO', ['Do NOT talk while I\'m doing business!', '...You know what, teacher? Business is business. And my business is... I keep it all.', 'Cousins! Make them disappear!']);
        yield M.say('DANNY', ['Mr. Gray, RUN!']);
        yield M.say('GRAY', ['No. {c=#59c8f0}Chemistry.{/c}']);
        M.flags.tito.goal = { x: 6 * R16, y: 1.4 * R16 }; M.flags.c1.dead = true; M.flags.c2.dead = true;
        W.npcs = W.npcs.filter(n => n.who !== 'THUG' && n.who !== 'GUNMAN');
        M.cut = false; music('fight');
      } },
      { at: [8, 9], run: function* () {
        W.toasts.push(['Throw', (isPad() ? 'Aim with the right stick, ' : 'Aim with the mouse, ') + label('throw') + ' throws the flask you hold.']);
        W.toasts.push(['Two flasks', label('swap') + ' switches: Fulminate explodes, Phosphine chokes.']);
        W.toasts.push(['Get close, get away', label('melee') + ' shoves. ' + label('dodge') + ' rolls through danger.']);
        M.objective('Survive the cousins', 'Wave 1 of 2', null);
        yield M.wave([['thug', 12, 7], ['thug', 15, 4.5], ['thug', 4, 9]]);
        bark('DANNY', 'More coming from the gate!');
        M.objective('Survive the cousins', 'Wave 2 of 2', null);
        yield 1;
        yield M.wave([['thug', 17, 18], ['thug', 19, 18], ['gunman', 18, 17], ['gunman', 25, 16]]);
        bark('TITO', 'You\'re DEAD, teacher! Dead! ...I\'m leaving now!');
      } },
      { at: [10, 12], run: function* () {
        music('stealth');
        const bag = M.act({ cx: 7.5, cy: 7, name: 'THE CASH', verb: 'Take' });
        M.objective('Take the money', 'Tito left in a hurry', { x: bag.x, y: bag.y });
        yield M.waitAct(bag); bag.active = false;
        const pay = Math.round(Math.max(1, STATE.product) * (M.flags.price || 25000) * .5 / 10) * 10; M.give(pay); STATE.product = 0;
        M.objective('Leave by the gate', 'South fence', { x: 18 * R16, y: 18.6 * R16 });
        yield M.reach(18 * R16, 18.6 * R16, 24);
        M.cut = true;
        yield M.say('DANNY', ['We just... we just blew up a junkyard, dude.']);
        yield M.say('GRAY', ['We were paid for half of it. Now we need someone who knows what to do with money like this.']);
      } }
    ]
  },
  /* ================= 5. EVERY DOLLAR NEEDS A STORY ================= */
  { id: 'ch5', title: 'Every Dollar Needs a Story', loc: 'town', night: true, music: 'town', flasks: ['chalk'], stealth: true, heat: true, about: 'Deliver. Don\'t get noticed. Wash it clean.',
    cold: ['CENTRAL AVENUE, 1:15 A.M.', 'Three customers, one duffel bag, and a brother-in-law with a badge who just got a tip about something blue.', 'Keep your head down.'],
    spawn: [3, 9.5],
    setup() {
      M.flags.barry = M.npc('BARRY', 23, 13.4, { facing: Math.PI / 2, pose: 'hips' });
      W.guards.push(makeGuard('agent', [[5, 13.6], [20, 13.6, 1.5], [20, 18.5], [5, 18.5, 1.5]]));
      W.guards.push(makeGuard('agent', [[30, 8.6], [44, 8.6, 1.5], [44, 13.6], [30, 13.6, 1.5]]));
      W.guards.push(makeGuard('cruiser', [[2, 6.5], [44, 6.5, .1], [44, 15.6], [2, 15.6, .1]]));
      W.hides = [[23.5, 13], [9, 18.4]].map(([cx, cy]) => M.act({ cx, cy: cy + .9, name: 'DUMPSTER', verb: 'Hide in', hide: true, keep: true }));
    },
    beats: [
      { run: function* () {
        bark('MARTY', 'All units: someone\'s moving blue product in my town. Find me the cook.');
        const b = M.act({ x: M.flags.barry.x, y: M.flags.barry.y, name: 'BARRY FLEISCHMAN', verb: 'Talk to' });
        M.objective('Meet the lawyer', 'Behind the strip mall. He\'s on the bus benches', { x: b.x, y: b.y });
        yield M.waitAct(b); b.active = false; M.cut = true;
        yield M.say('BARRY', ['Barry Fleischman, attorney at law! You\'ve seen the benches. {c=#e8c040}"Better Call Barry!"{/c}', 'So. A man walks into a lawyer\'s alley with a duffel bag of cash and no story. You know what that man has?']);
        yield M.say('GRAY', ['A problem.']);
        yield M.say('BARRY', ['A PROBLEM! You\'re quick. I like quick. Here\'s the deal: three customers tonight, my referrals, very discreet.', 'Then bring the cash to the car wash on Fourth. Every dollar needs a story, and a car wash tells a beautiful story.']);
        M.cut = false;
        W.toasts.push(['Heat', 'Agents who see you raise the heat. If it fills, you\'re busted. Break line of sight to cool off.']);
        W.toasts.push(['Hide', 'Dumpsters hide you completely. ' + label('interact') + ' to climb in or out.']);
      } },
      { at: [22, 14.4], run: function* () {
        const spots = [[12.5, 2.6], [35, 12.5], [36, 20.5]];
        const buyers = spots.map(([cx, cy], i) => { const n = M.npc('BUYER', cx, cy, { facing: Math.PI / 2, rig: { colors: { coat: ['#4a4a3a', '#3a2a4a', '#5a3a2a'][i] } } }); return M.act({ x: n.x, y: n.y + 4, name: 'CUSTOMER', verb: 'Deliver to', npc: n }); });
        let done = 0;
        while (done < 3) {
          const next = buyers.find(b => !b.used);
          M.objective('Make the deliveries', 'Barry\'s referrals', { x: next.x, y: next.y }, done + ' / 3');
          yield () => buyers.filter(b => b.used).length > done;
          done = buyers.filter(b => b.used).length; buyers.forEach(b => { if (b.used) b.active = false; });
          A.sfx('cash'); M.give(6000 + Math.round(STATE.best * 40)); bark('BUYER', E.pick(['Is it true it\'s blue? ...Whoa.', 'Barry sent me. I never saw you.', 'My guy said ask for "the teacher."']));
        }
      } },
      { at: [38, 17], run: function* () {
        const wash = M.act({ cx: 28, cy: 15, name: 'THE CAR WASH', verb: 'Launder the cash at' });
        M.objective('Wash the money', 'The car wash on Fourth', { x: wash.x, y: wash.y });
        yield M.waitAct(wash); wash.active = false; M.cut = true;
        yield M.say('BARRY', ['Beautiful. Look at that. Soap, water, a little paperwork — and now it\'s {c=#7aff9a}"tips."{/c}', 'Pleasure doing business, Professor. Call me. Better yet... Better Call Barry.']);
        M.give(5000);
      } }
    ]
  },
  /* ================= 6. SAY THE FORMULA ================= */
  { id: 'ch6', title: 'Say the Formula', loc: 'junk', night: true, music: 'boss', flasks: ['fulminate', 'phosphine'], combat: true, partner: false, boss: true, about: 'Tito has Danny. Bring the chemistry.',
    cold: ['3:02 A.M.', 'Tito Vargas has Danny Pike, a sledgehammer, and an idea about what happens to people who make him look stupid.', 'Leland Gray has a bag of crystals that are not what they look like.'],
    spawn: [17, 17.5],
    setup() {
      if (M.beat > 0) { W.partner = makePlayer('DANNY', 16 * R16, 16 * R16, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null; return; }
      M.flags.danny = M.npc('DANNY', 15.5, 11.5, { facing: Math.PI / 2, pose: 'kneel' });
      M.flags.tito = M.npc('TITO', 17, 12.6, { facing: Math.PI / 2, pose: 'hips', rig: { size: 1.7, weapon: 'staff', colors: { metal: '#9a9aa8' } } });
    },
    beats: [
      { run: function* () {
        M.objective('Find Danny', 'By the crusher', { x: 16 * R16, y: 12 * R16 });
        yield M.reach(17 * R16, 13 * R16, 60);
        M.cut = true;
        yield M.say('TITO', ['TEACHER! You came! You bring me the blue?']);
        yield M.say('GRAY', ['I brought you something.'], { choices: ['Hold up the bag', 'Hold up the bag, slowly'] });
        yield M.say('TITO', ['Then give it! GIVE IT!']);
        yield M.say('GRAY', ['This is not blue.']);
        burst('fulminate', 17 * R16, 13.4 * R16, 0, 1.5); game.flash('#ffffff', .25, 1); yield .8;
        yield M.say('TITO', ['WHAT WAS THAT?! WHAT DID YOU DO?!']);
        yield M.say('GRAY', ['{c=#59c8f0}Mercury fulminate.{/c} Unstable. Like you.', 'Danny. Get behind me.']);
        const t = M.flags.tito; W.npcs = W.npcs.filter(n => n !== t && n !== M.flags.danny);
        const boss = makeEnemy('boss', t.x, t.y - 4, {}); boss.name = 'TWO-TONE TITO'; W.enemies.push(boss); M.flags.boss = boss;
        W.partner = makePlayer('DANNY', M.flags.danny.x, M.flags.danny.y, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null;
        W.hero.meter = 1;
        M.cut = false;
        W.toasts.push(['The hat', 'Your Catalyst meter is full. ' + label('catalyst') + ': put on the hat. Enemies scatter, flasks are free, you hit twice as hard.']);
        W.toasts.push(['Tells', 'Tito\'s charge winds up. Roll sideways. If he hits a wall, he\'s dazed.']);
      } },
      { at: [17, 16], run: function* () {
        const boss = M.flags.boss || W.enemies.find(e => e.kind === 'boss');
        if (!boss) { const b2 = makeEnemy('boss', 17 * R16, 12 * R16); b2.name = 'TWO-TONE TITO'; W.enemies.push(b2); M.flags.boss = b2; }
        const B = M.flags.boss;
        M.objective('Defeat Two-Tone Tito', '', null);
        yield () => B.hp <= B.maxHp / 2 || B.dead;
        if (!B.dead) {
          B.phase = 2; game.shake(5); A.sfx('alarm');
          bark('TITO', 'COUSINS! GET IN HERE!');
          M.wave([['thug', 2, 9], ['gunman', 31, 9], ['thug', 18, 18]]);
          W.hero.meter = Math.max(W.hero.meter, .6);
        }
        yield () => B.dead;
        W.enemies.forEach(e => { if (!e.dead) { e.dead = true; e.downT = 0; } });
      } },
      { at: [17, 14], run: function* () {
        M.cut = true; music(null);
        const t = M.npc('TITO', W.flags_bx || 17, W.flags_by || 12, { facing: Math.PI / 2, pose: 'kneel', rig: { size: 1.7, weapon: null } });
        W.enemies = W.enemies.filter(e => e.kind !== 'boss');
        W.hero.catalyst = Math.max(W.hero.catalyst, 6);
        yield M.say('TITO', ['Okay! OKAY! You win, teacher! Who... who ARE you, man?'], { choices: ['"The Catalyst."', '"Your chemistry teacher."'] });
        yield M.say('GRAY', M.choice === 0 ? ['{s=10}Say it.{/s}', 'Say the formula.'] : ['Your chemistry teacher, Tito.', 'And class... is dismissed.']);
        yield M.say('TITO', ['...The Catalyst. You\'re... you\'re the Catalyst.']);
        A.sfx('siren'); yield .5; A.sfx('siren');
        yield M.say('DANNY', ['Sirens! Dude, that\'s DEA! We gotta GO!']);
        yield M.say('MARTY', ['Two-Tone Tito Vargas, on his knees in a junkyard at three in the morning! It\'s Christmas!', 'Anybody see who did this? ...Anybody?']);
        music('sad');
        yield M.say('NARRATOR', ['Across town, the lights are still on at Pollo Sol.']);
        yield M.say('AURELIO', ['A chemistry teacher. Ninety-nine percent.', 'Men who make something that pure rarely stay small. Watch him. Patiently.']);
      } }
    ]
  }
];

function bossDown(e) { W.flags_bx = e.x / R16; W.flags_by = e.y / R16; game.freeze(.25); game.flash('#ffffff', .3, .8); game.timeScale = .4; game.after(.6, () => { game.timeScale = 1; }); P.explosion(e.x, e.y, 0, .8, { shake: 4 }); }

/* ---- 50-scenes.js ---- */
/* =====================================================================================
 * 50 SCENES — title (with the attract mode after 10 idle seconds), the cold-open card, play, results, the lab
 * (upgrades), game over, the ending, About / Credits, and the Cook-Off (score attack, co-op, and the AI Hub round).
 * ===================================================================================== */
talk = new E.Dialog(game, { speed: 46, lines: 3 }); talk.voice = null;
barkTalk = new E.Dialog(game, { speed: 60, lines: 1 }); barkTalk.voice = null;
let lastShown = { a: 0, b: 0 };
function voiceTick() {   // the gibberish voice: a chirp per letter typed, in the speaker's voice
  for (const [d, k] of [[talk, 'a'], [barkTalk, 'b']]) {
    if (!d.open) { lastShown[k] = 0; continue; }
    const page = d.pages && d.pages[d.i], text = page ? (Array.isArray(page) ? page.join(' ') : String(page)) : '';
    const n = Math.floor(d.shown || 0);
    if (n < lastShown[k]) lastShown[k] = 0;
    for (let i = lastShown[k]; i < n; i++) if (i % 2 === 0) babble(d.who, text.replace(/\{[^}]*\}/g, '')[i]);
    lastShown[k] = n;
  }
}

/* ---- Button glyphs drawn in pixels: PlayStation shapes in their colours, Xbox letters in theirs, keycaps for keys ---- */
const PS = { '✕': '#7aa8ff', '○': '#ff6a7a', '□': '#e88ae8', '△': '#5ae0b0' }, XB = { A: '#5ad05a', B: '#ff5a4a', X: '#4a9aff', Y: '#f0c030' };
function drawKey(g, key, x, y) {
  key = String(key || '?');
  if (PS[key]) {
    px.disc(g, x + 6, y + 4, 7, '#14161c'); px.disc(g, x + 6, y + 4, 6, '#262a34');
    const c = PS[key];
    if (key === '✕') { px.line(g, x + 3, y + 1, x + 9, y + 7, c, 2); px.line(g, x + 9, y + 1, x + 3, y + 7, c, 2); }
    else if (key === '○') { px.disc(g, x + 6, y + 4, 4, c); px.disc(g, x + 6, y + 4, 2, '#262a34'); }
    else if (key === '□') { px.rect(g, x + 3, y + 1, 7, 7, c); px.rect(g, x + 5, y + 3, 3, 3, '#262a34'); }
    else { px.poly(g, [[x + 6, y], [x + 11, y + 8], [x + 1, y + 8]], c); px.poly(g, [[x + 6, y + 3], [x + 8, y + 6], [x + 4, y + 6]], '#262a34'); }
    return 13;
  }
  if (XB[key] && game.settings.glyphs === 'xbox') { px.disc(g, x + 6, y + 4, 7, '#14161c'); px.disc(g, x + 6, y + 4, 6, XB[key]); E.font.text(g, key, x + 6, y + 1, '#101010', { align: 'center', outline: false }); return 13; }
  const w = E.font.width(key) + 8;
  E.ui.box(g, x, y - 2, w, 12, { bg: '#e8e4dc', border: '#ffffff', gradient: false });
  px.rect(g, x + 1, y + 9, w - 2, 1, '#a8a49c');
  E.font.text(g, key, x + 4, y, '#14100c', { outline: false });
  return w;
}
function promptPill(g, key, text, cx, y) {
  const tw = E.font.width(text), kw = PS[key] || (XB[key] && game.settings.glyphs === 'xbox') ? 13 : E.font.width(key) + 8, w = kw + 6 + tw + 10, x = Math.round(cx - w / 2);
  px.blend(g, .75, 'normal', () => px.rect(g, x, y - 4, w, 16, '#0c0a08'));
  px.rect(g, x, y - 4, w, 1, '#59c8f0');
  drawKey(g, key, x + 4, y); E.font.text(g, text, x + kw + 9, y, '#ffffff');
}
// the cook's prompt uses the same glyphs
Cook.prototype.prompt = function (g, x, y, key, what) { promptPill(g, key, what, x, y); };

/* ---- Idle and any-input watch (raw events: the attract mode leaves on any of them, the title counts idle time) ---- */
let lastInput = performance.now(), anyInput = false;
const poke = () => { lastInput = performance.now(); anyInput = true; };
let kbPad = false; const touchGate = () => TOUCH_ONLY && !kbPad;
addEventListener('keydown', e => { kbPad = true; poke(); }, true); addEventListener('pointerdown', poke, true); addEventListener('wheel', poke, true);
let lastMouse = null; addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (lastMouse && Math.hypot(e.clientX - lastMouse[0], e.clientY - lastMouse[1]) > 6) poke(); lastMouse = [e.clientX, e.clientY]; }, true);
function padActivity() { try { for (const p of Array.from(navigator.getGamepads() || [])) { if (!p) continue; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) { kbPad = true; return true; } } } catch (e) { } return false; }

/* ---- Bot input: the attract mode's player (it cheats: it never dies, walks through walls when stuck, never runs out) ---- */
const BOT = { _d: {}, _p: {}, mv: [0, 0], lastDevice: 'keyboard', aimSource: 'move', padAim: null, aimWorld: null, stuck: 0,
  move() { return this.mv; }, down(a) { return !!this._d[a]; }, pressed(a) { return !!this._p[a]; }, released() { return false; }, consume(a) { this._p[a] = false; }, consumeAll() { this._p = {}; },
  label: a => game.input.label(a), repeat() { return false; }, buffered(a) { return !!this._p[a]; }, rumble() { } };
let botClock = 0;
function botThink(dt) {
  const h = W.hero; BOT._p = {}; BOT._d = {}; BOT.mv = [0, 0]; BOT.aimWorld = null; botClock += dt;
  if (talk.open) { if (Math.floor(botClock / .8) !== Math.floor((botClock - dt) / .8)) game.input.tap('confirm'); return; }
  if (M.cookObj) return;
  let target = null;
  const foes = W.enemies.filter(e => !e.dead);
  if (foes.length) {
    foes.sort((a, b) => dist2(a, h) - dist2(b, h)); const e = foes[0], d = dist2(e, h);
    BOT.aimWorld = { x: e.x, y: e.y };
    if (d < 45) target = { x: h.x - (e.x - h.x), y: h.y - (e.y - h.y) }; else if (d > 110) target = e;
    if (Math.floor(botClock / .7) !== Math.floor((botClock - dt) / .7)) BOT._p.throw = true;
    if (h.meter >= 1) BOT._p.catalyst = true;
    if (Math.random() < dt * .5 && W.flaskKinds.length > 1) BOT._p.swap = true;
  } else {
    const acts = W.acts.filter(a => a.active && !a.used && !a.hide);
    if (acts.length) { acts.sort((a, b) => ((a.botN || 0) - (b.botN || 0)) * 1e5 + dist2(a, h) - dist2(b, h)); target = acts[0]; if (dist2(target, h) < (target.r || 20)) { BOT._p.interact = true; target.botN = (target.botN || 0) + 1; target = null; } }
    else if (W.marker) target = W.marker;
    else if (W.crates) { const c = W.carry < 2 ? W.crates.filter(c => !c.taken).sort((a, b) => dist2(a, h) - dist2(b, h))[0] : null; target = c || W.rigAct; if (!c && W.rigAct && dist2(W.rigAct, h) < 22) BOT._p.interact = true; }
  }
  if (target) {
    W.flow.update(target.x, target.y);
    const d = W.flow.dir(h.x, h.y, target.x, target.y), sx = d[0], sy = d[1];
    // world direction back to a screen direction for the view (the inverse of screenDirToGround)
    const v = game.view, a = v.screenDirToGround(1, 0), b = v.screenDirToGround(0, 1), det = a[0] * b[1] - a[1] * b[0] || 1;
    BOT.mv = [(sx * b[1] - sy * b[0]) / det, (a[0] * sy - a[1] * sx) / det];
    const l = Math.hypot(BOT.mv[0], BOT.mv[1]); if (l > 1) BOT.mv = [BOT.mv[0] / l, BOT.mv[1] / l];
    BOT._d.sprint = true;
    if (Math.hypot(h.vx, h.vy) < 10 && Math.hypot(target.x - h.x, target.y - h.y) > 20) { BOT.stuck += dt; if (BOT.stuck > .4) { const tl = Math.hypot(target.x - h.x, target.y - h.y) || 1; h.x += (target.x - h.x) / tl * 20; h.y += (target.y - h.y) / tl * 20; BOT.stuck = .2; } } else BOT.stuck = 0;   // no-clip when stuck
  }
}

/* ---- Saves ---- */
game.saves.write = () => ({ data: { state: JSON.parse(JSON.stringify(STATE)) }, place: (CHAPTERS[STATE.chapter] || CHAPTERS[0]).title, level: STATE.chapter + 1 });
game.saves.read = s => { if (s && s.data && s.data.state) Object.assign(STATE, JSON.parse(JSON.stringify(s.data.state))); };
function resetState() { Object.assign(STATE, { cash: 0, total: 0, best: 0, upgrades: { glass: 0, condenser: 0, stirrer: 0, trays: 0, suit: 0 }, cleared: {}, chapter: 0, batches: 0, product: 0 }); }

/* ================================ TITLE ================================ */
const titleRig = { gray: makeRig('GRAY'), danny: makeRig('DANNY') };
let titleMenu = null, titleT = 0, attractIdx = 0;
function buildTitleMenu() {
  const hasSave = !!game.saves.latest();
  const items = touchGate() ? ['SETTINGS', 'ABOUT & CREDITS'] : [hasSave ? 'CONTINUE' : { label: 'CONTINUE', disabled: true }, 'NEW EPISODE', 'CHAPTERS', 'COOK-OFF (1-2 PLAYERS)', 'SETTINGS', 'ABOUT & CREDITS'];
  titleMenu = new E.Menu(game, items, { y: 120, onPick: (i, it) => pickTitle(typeof it === 'string' ? it : it.label) });
}
function pickTitle(name) {
  A.sfx('confirm');
  if (name === 'CONTINUE') { const s = game.saves.latest(); if (s) { game.saves.load(s.slot); game.go('lab', { next: STATE.chapter + (STATE.cleared[CHAPTERS[STATE.chapter].id] ? 1 : 0) }); } }
  else if (name === 'NEW EPISODE') { resetState(); game.go('card', { ch: 0 }); }
  else if (name === 'CHAPTERS') game.go('chapters');
  else if (name.startsWith('COOK-OFF')) game.go('cookoff', {});
  else if (name === 'SETTINGS') game.menu('settings');
  else if (name.startsWith('ABOUT')) game.go('about');
}
const titleScene = {
  enter() { buildLocation('desert'); W = newWorld('desert', {}); music('title'); titleT = 0; lastInput = performance.now(); buildTitleMenu(); L.enabled = false; game.weather = { kind: 'sand', amount: .2, wind: .5 }; ui.hud({}); game.resetCamera && game.resetCamera(); },
  exit() { game.weather = null; },
  update(dt) {
    titleT += dt;
    if (padActivity()) poke();
    if ((titleMenu.items.length === 2) !== touchGate()) buildTitleMenu();
    if (!titleMenu.update(dt) && game.input.pressed('start')) titleMenu.onPick(titleMenu.i, titleMenu.items[titleMenu.i]);
    if (!game.paused && performance.now() - lastInput > 10000 && !(game.shell && game.shell.screen)) { anyInput = false; startAttract(); }
    const cx = 23.5 * R16, cy = 17 * R16;
    game.focus(cx + Math.sin(titleT * .05) * 30, cy + 10, 0);
    titleRig.gray.update(dt, { x: 24 * R16, y: 18.6 * R16, z: 0, vx: 0, vy: 0, facing: Math.PI * .55, pose: 'hips' });
    titleRig.danny.update(dt, { x: 26.4 * R16, y: 18.2 * R16, z: 0, vx: 0, vy: 0, facing: Math.PI * .7 });
  },
  draw(r) {
    drawLocation(r, W.loc, false);
    r.shadow(24 * R16, 18.6 * R16, 6, .35); r.actor(24 * R16, 18.6 * R16, 0, (g, ox, oy) => titleRig.gray.draw(g, ox, oy, r.view));
    r.shadow(26.4 * R16, 18.2 * R16, 6, .35); r.actor(26.4 * R16, 18.2 * R16, 0, (g, ox, oy) => titleRig.danny.draw(g, ox, oy, r.view));
    r.overlay(g => {
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a2a1a'));
      const y0 = Math.max(18, Math.round(r.H * .12));
      // the periodic-table logo: two element tiles, then the rest of the word
      const tile = (x, y, sym, num, name) => { E.ui.box(g, x, y, 40, 40, { bg: ['#2a6a3a', '#173a20'], border: '#cfe8c0' }); E.font.text(g, String(num), x + 3, y + 2, '#cfe8c0', { font: 'tiny' }); E.font.title(g, sym, x + 20, y + 11, { scale: 2, align: 'center', colors: ['#ffffff', '#d8f0d0'] }); E.font.text(g, name, x + 20, y + 32, '#cfe8c0', { font: 'tiny', align: 'center' }); };
      const cx = Math.round(r.W / 2), wTot = 230, x0 = cx - wTot / 2;
      tile(x0, y0, 'Br', 35, 'BROMINE'); E.font.title(g, 'EAKING', x0 + 44, y0 + 12, { scale: 3, colors: ['#f4f0e0', '#e0d8b8', '#b8a878'], depth: 2, depthColor: '#2a2010' });
      tile(x0 + 30, y0 + 46, 'B', 5, 'BORON'); E.font.title(g, 'OND', x0 + 74, y0 + 58, { scale: 3, colors: ['#f4f0e0', '#e0d8b8', '#b8a878'], depth: 2, depthColor: '#2a2010' });
      E.font.text(g, 'A CHEMISTRY TEACHER. A DIAGNOSIS. A CHANGE.', cx, y0 + 94, '#e8c890', { align: 'center', shadow: '#000' });
      if (touchGate()) {
        E.ui.box(g, cx - 140, r.H - 64, 280, 34, { bg: ['#3a1a14', '#200c08'], border: '#ff8a6a' });
        E.font.text(g, 'Controller or keyboard required', cx, r.H - 58, '#ffffff', { align: 'center', scale: 1 });
        E.font.text(g, 'Connect one to play. The demo runs on its own.', cx, r.H - 46, '#e8c0b0', { align: 'center' });
      }
      E.font.text(g, 'v' + VERSION + '  my-3D2dge ' + (E.version || ''), 6, 6, '#8a7a62', { font: 'tiny' });
      const dev = game.input.lastDevice, hint = dev === 'gamepad' || touchGate() ? '' : dev === 'touch' ? '' : 'Arrows / mouse to choose  •  Enter or click';
      if (hint) E.font.text(g, hint, cx, r.H - 12, '#b8a888', { align: 'center' });
    });
    titleMenu.y = Math.max(124, Math.round(r.H * .12) + 110);
    titleMenu.draw(r);
    if (game.input.lastDevice === 'gamepad') r.overlay(g => { const k = label('confirm'); const tw = 13 + 6 + E.font.width('Select'); promptPill(g, k, 'Select', r.W / 2, r.H - 16); });
  }
};
function startAttract() {
  const plan = [{ ch: 0, beat: 0 }, { ch: 2, beat: 0 }, { ch: 3, beat: 1 }, { ch: 4, beat: 1 }, { ch: 1, beat: 1 }, { ch: 5, beat: 1 }];
  const p = plan[attractIdx % plan.length]; attractIdx++;
  game.go('play', { ch: p.ch, beat: p.beat, attract: true }, { fade: 'dissolve' });
}

/* ================================ CHAPTER SELECT ================================ */
let chapMenu = null;
const chaptersScene = {
  enter() { chapMenu = new E.Menu(game, CHAPTERS.map((c, i) => (i + 1) + '.  ' + c.title.toUpperCase()).concat(['BACK']), { y: 70, onPick: i => { if (i >= CHAPTERS.length) return game.go('title'); resetState(); STATE.chapter = i; STATE.product = i >= 3 ? 6 : 0; STATE.best = i >= 3 ? 96.2 : 0; STATE.cash = i >= 4 ? 40000 : 0; game.go('card', { ch: i }); }, onCancel: () => game.go('title') }); },
  update(dt) { chapMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#1a120c', '#3a2414', '#5a3a1e']);
    r.overlay(g => { E.font.title(g, 'CHAPTERS', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#fff4e0', '#e8c890', '#a87840'] }); const c = CHAPTERS[chapMenu.i]; if (c) E.font.text(g, c.about, r.W / 2, r.H - 26, '#e8d8b8', { align: 'center' }); });
    chapMenu.draw(r);
  }
};

/* ================================ COLD OPEN CARD ================================ */
let card = null;
const cardScene = {
  enter(d) { const ch = CHAPTERS[d.ch]; card = { ch: d.ch, t: 0, lines: ch.cold, title: ch.title }; music('sad'); STATE.chapter = d.ch; if (!HUB) game.saves.autosave(); },
  update(dt) {
    card.t += dt;
    const I = game.input, total = 2.2 + card.lines.length * 2.4;
    if ((card.t > .5 && (I.pressed('confirm') || I.pressed('start') || I.pressed('throw'))) || card.t > total + 2) game.go('play', { ch: card.ch, beat: 0 }, { fade: 'iris' });
  },
  draw(r) {
    r.sky(['#000000', '#050404']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.text(g, 'EPISODE ONE  •  PILOT LIGHT', cx, 24, '#8a7a62', { align: 'center' });
      E.font.title(g, 'CHAPTER ' + (card.ch + 1), cx, 40, { scale: 1, align: 'center', colors: ['#b8a888', '#8a7a62'] });
      E.font.title(g, card.title.toUpperCase(), cx, 56, { scale: 2, align: 'center', colors: ['#fff8e8', '#e8d0a0', '#b08850'] });
      let y = 100;
      card.lines.forEach((l, i) => {
        const t0 = 1.2 + i * 2.4; if (card.t < t0) return;
        const n = Math.min(l.length, Math.floor((card.t - t0) * 40));
        for (const w of wrapText(l.slice(0, n), 52)) { E.font.text(g, w, cx, y, i === 0 ? '#e8c890' : '#e8e4dc', { align: 'center' }); y += 11; }
        y += 8;
      });
      promptPill(g, label('confirm'), 'Skip', r.W - 50, r.H - 18);
    });
  }
};

/* ================================ PLAY ================================ */
let toastCool = 0, attractT = 0, chStart = 0;
window.__bbRestart = () => { if (game.sceneName === 'play' && M.mission && !W.attract) { game.resume(); game.go('play', { ch: CHAPTERS.indexOf(M.mission), beat: M.beat }); } };
function startChapter(i, beat, attract) {
  const ch = CHAPTERS[i];
  newWorld(ch.loc, { night: ch.night, combat: ch.combat, stealth: ch.stealth, heat: ch.heat, flasks: ch.flasks, attract });
  M.mission = ch; M.beat = beat; M.cut = false; M.cookObj = null; M.flags = {}; M.waves = 0; STATE.chapter = i;
  const sp = (beat > 0 && ch.beats[beat].at) || ch.spawn;
  W.hero = makePlayer('GRAY', sp[0] * R16, sp[1] * R16, { hp: 6 });
  if (ch.partner) { W.partner = makePlayer('DANNY', sp[0] * R16 + 14, sp[1] * R16 + 6, { ai: true, hp: 6 }); W.partner.player = game.players[1] || null; }
  if (ch.id === 'ch1' && beat >= 2) {}
  ch.setup();
  if (ch.id === 'ch2' && beat >= 2) { W.map.set(17, 7, 0); }
  if (ch.id === 'ch1') { M.flags.danny = { x: 14 * R16, y: 19.6 * R16 }; if (beat >= 2) M.npc('DANNY', 14, 19.6, { facing: Math.PI, pose: 'hips' }); }
  if (attract) { W.hero.hp = 999; W.hero.maxHp = 999; W.hero.meter = 1; }
  L.enabled = !!ch.night; L.ambient = ch.dusk ? .55 : .4; L.tint = undefined;
  game.weather = W.loc.weather || null;
  game.cam.bounds = v => W.map.bounds(v);
  music(ch.music);
  M.script = game.script(function* () {
    for (let b = beat; b < ch.beats.length; b++) { M.beat = b; yield* ch.beats[b].run(); }
    completeChapter();
  });
  chStart = W.time = 0; attractT = 0; toastCool = 1;
  if (!attract && ch.partner) game.allowJoin({ max: 2, onJoin: (input) => { if (W && W.partner) { W.partner.player = input; input.glyphs = game.settings.glyphs; W.toasts.push(['Player 2 joined', 'Danny is yours. ' + label('melee', input) + ' punches hard.']); } } });
}
function completeChapter() {
  if (W.attract && !W.test) { startAttractNext(); return; }
  const ch = M.mission; STATE.cleared[ch.id] = true;
  const stats = { time: W.time, kills: W.kills, cash: STATE.cash, best: STATE.best };
  game.go('results', { ch: CHAPTERS.indexOf(ch), stats }, { fade: 'white' });
}
function startAttractNext() { game.go('title'); }
function failMission(reason) {
  if (W.attract || W.fail) return;
  W.fail = reason; W.banner = { text: reason === 'busted' ? 'BUSTED' : reason === 'caught' ? 'CAUGHT' : 'DOWN', sub: '' }; W.bannerT = 3;
  A.sfx(reason === 'down' ? 'die' : 'alarm');
  game.after(1.4, () => game.go('over', { reason, ch: CHAPTERS.indexOf(M.mission), beat: M.beat }));
}
function caughtBy(g) {
  if (W.attract || W.fail) return;
  if (W.heatOn) { W.heat = 1; failMission('busted'); }
  else failMission('caught');
}
function useAct(a, who) {
  if (!a.active) return;
  if (a.hide) { if (who.hidden) unhide(who); else hide(who, a); return; }
  a.used = true; A.sfx('select');
  if (a.npc) { a.npc.facing = Math.atan2(who.y - a.npc.y, who.x - a.npc.x); who.facing = Math.atan2(a.npc.y - who.y, a.npc.x - who.x); }
  if (a.on) a.on(a, who);
}
function computeFocus() {
  const h = W.hero; if (!h || M.cut) { W.focus = null; return; }
  const I = game.input, ptr = I.lastDevice === 'mouse' ? I.pointer() : null;
  let best = null, bd = 1e9;
  for (const a of W.acts) {
    a.hovered = false;
    if (!a.active || a.used) continue;
    if (ptr && a.sx !== undefined && Math.hypot(ptr[0] - a.sx, ptr[1] - a.sy) < 20 && dist2(a, h) < 220) { a.hovered = true; best = a; bd = -1; continue; }
    const d = dist2(a, h); if (bd >= 0 && d < (a.r || 20) + 8 && d < bd) { best = a; bd = d; }
  }
  W.focus = best;
}
function updateWorld(dt, playable) {
  W.time += dt;
  for (const n of W.noise) n.t -= dt; E.prune(W.noise, n => n.t <= 0);
  const I = W.attract ? BOT : game.input;
  if (W.attract) botThink(dt);
  if (playable && W.hero) controlPlayer(W.hero, I, dt); else if (W.hero) { W.hero.vx = W.hero.vy = 0; W.hero.update(dt, W.map); }
  if (W.partner) { if (playable || !W.partner.player) controlPartner(W.partner, dt); }
  for (const n of W.npcs) {
    if (n.goal) { const dx = n.goal.x - n.x, dy = n.goal.y - n.y, l = Math.hypot(dx, dy); if (l < 3) { n.goal = null; n.vx = n.vy = 0; } else { n.vx = dx / l * n.speed; n.vy = dy / l * n.speed; n.facing = Math.atan2(dy, dx); } }
    else { n.vx = n.vy = 0; }
    n.update(dt, W.map);
    n.rig.update(dt, { x: n.x, y: n.y, z: n.z, vx: n.vx, vy: n.vy, facing: n.facing, pose: n.goal ? null : n.pose, expr: n.expr });
  }
  let alert = false, search = false;
  for (const g of W.guards) { const st = updateGuard(g, dt); if (st === 'alert') alert = true; if (st === 'search') search = true; if (g.rig) g.rig.update(dt, { x: g.x, y: g.y, z: g.z, vx: g.vx, vy: g.vy, facing: g.facing, point: st === 'alert' && g.kind === 'agent' }); }
  if (W.heatOn && !W.fail) { W.heat = clamp(W.heat + (alert ? dt * .22 * DIFF().sight : search ? dt * .04 : -dt * .07), 0, 1); if (W.heat >= 1) failMission('busted'); }
  if (W.guards.length) { const on = alert ? 1 : 0; if (W.alarmOn !== on) { W.alarmOn = on; const song = SONGS[musicNow], has = n => song && song.tracks.some(t => t.name === n); if (has('chase')) A.layer('chase', on, on ? .4 : 2); if (has('alarm')) A.layer('alarm', on, on ? .6 : 2); } }
  for (const e of W.enemies) { updateEnemy(e, dt); e.rig.update(dt, e.dead ? { x: e.x, y: e.y, z: e.z, facing: e.facing, down: clamp(e.downT * 3, 0, 1) } : rigState(e, { stance: 'guard', point: e.kind === 'gunman', hurt: e.hurtT > 0 || e.stun > 0, pose: e.fear > 0 ? 'guard' : null })); }
  W.shots.update(dt, W.map);
  W.shots.hit(players(), (b, t) => { hurtPlayer(t, b.dmg || 1, Math.atan2(b.vy, b.vx)); b.life = 0; }, 'enemy');
  updateFlasks(dt); updateClouds(dt); updatePickups(dt);
  for (const a of [W.hero, W.partner]) if (a) a.rig.update(dt, a.dead ? { x: a.x, y: a.y, z: a.z, facing: a.facing, pose: 'die' } : rigState(a, { pose: a.kneel ? 'kneel' : null, stance: W.combat ? 'guard' : null }));
}
const playScene = {
  pausable: true, camera: { zoom: [.75, 2], start: 1.1, tall: 1.4 },
  enter(d) { startChapter(d.ch, d.beat || 0, !!(d.attract || d.test)); W.test = !!d.test; },
  exit() { ui.hud({}); L.enabled = false; game.weather = null; game.allowJoin(false); talk.close(); barkTalk.close(); game.timeScale = 1; },
  back() { return false; },
  update(dt) {
    if (W.attract && !W.test) { attractT += dt; if (anyInput || padActivity()) { anyInput = false; lastInput = performance.now(); game.go('title', null, { fade: 0 }); return; } if (attractT > 30) { startAttract(); return; } }
    if (game.input.pressed('view') && !talk.open && !M.cookObj) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    voiceTick(); barkTalk.update(dt);
    { const h = W.hero, p2 = W.partner && W.partner.player && !W.partner.dead ? W.partner : null; if (h) game.focus(p2 ? (h.x + p2.x) / 2 : h.x, p2 ? (h.y + p2.y) / 2 : h.y, 14); }
    if (W.slow > 0) { W.slow -= dt; game.timeScale = W.slow > 0 ? .55 : 1; }
    if (W.bannerT > 0) W.bannerT -= dt;
    if (M.cookObj) { M.cookObj.update(dt); updateWorld(dt, false); hud(); return; }
    if (talk.update(dt)) { updateWorld(dt, false); hud(); return; }
    updateWorld(dt, !M.cut && !W.fail);
    computeFocus();
    if (toastCool > 0) toastCool -= dt; else if (W.toasts.length && game.settings.hints) { const [t, x] = W.toasts.shift(); ui.toast(t, x, 5); toastCool = 4; } else if (W.toasts.length) W.toasts.length = 0;
    hud();
  },
  draw(r) { drawPlay(r); }
};
function hud() {
  const h = W.hero; if (!h) return;
  if (M.cut || M.cookObj || talk.open || W.attract || W.fail) { ui.hud({}); return; }
  const I = game.input, pad = isPad(I), hints = game.settings.hints;
  const bars = [{ label: 'Health', value: Math.ceil(h.hp), max: h.maxHp, kind: 'pips', color: '#e8505a' }];
  if (W.combat) bars.push({ label: h.meter >= 1 ? 'Catalyst ready' : 'Catalyst', value: h.catalyst > 0 ? h.catalyst / 9 : h.meter, max: 1, color: '#59c8f0' });
  if (W.heatOn) bars.push({ label: 'Heat', value: W.heat, max: 1, color: W.heat > .7 ? '#ff3a2a' : '#ff8a3a' });
  if (W.partner && W.combat) bars.push({ label: W.partner.player ? 'Danny (P2)' : 'Danny', value: Math.ceil(W.partner.hp), max: W.partner.maxHp, kind: 'pips', color: '#e8c040' });
  const keys = !hints ? null : [[pad ? 'L stick' : ['up', 'left', 'down', 'right'].map(a => label(a)).join(''), 'Move'], [label('sprint'), 'Sprint']];
  if (hints) { if (W.stealth) keys.push([label('sneak'), 'Sneak']); keys.push([label('dodge'), 'Roll']); if (W.flaskKinds.length) keys.push([label('throw'), 'Throw']); if (W.combat) keys.push([label('melee'), 'Shove']); keys.push([label('view'), 'View']); }
  ui.hud({
    objective: W.objective ? { step: W.objective.step || undefined, title: W.objective.title, text: W.objective.text, at: W.objective.at ? { x: W.objective.at.x, y: W.objective.at.y, z: 0 } : undefined, from: h } : undefined,
    bars, counts: [['Cash', fmtMoney(STATE.cash)]].concat(STATE.product > 0 ? [['Product', STATE.product.toFixed(1) + ' lb']] : []),
    status: h.hidden ? { text: 'Hidden', color: '#9ae89a' } : W.alarmOn ? { text: 'Spotted', color: '#ff4a3a' } : h.sneak ? 'Sneaking' : h.catalyst > 0 ? { text: 'The Catalyst', color: '#59c8f0' } : null,
    keys
  });
}
const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
function drawPlay(r) {
  drawLocation(r, W.loc, W.night);
  if (W.night && W.hero && !W.hero.hidden) L.add(W.hero.x, W.hero.y, 20, 46, .35, { color: '#ffe8c8' });
  if (game.settings.cones) for (const g of W.guards) r.sightCone(g, { map: W.map, range: g.range, fov: g.fov, color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .2 : .36 });
  for (const g of W.guards) {
    if (g.kind === 'cruiser') { r.shape('cruiser', g.x, g.y, 0, { facing: g.facing }); if (W.night) { L.add(g.x + Math.cos(g.facing) * 40, g.y + Math.sin(g.facing) * 40, 4, 60, .8, { color: '#fff8d8' }); L.add(g.x, g.y, 16, 30, .7, { color: Math.floor(game.time * 4) % 2 ? '#ff3a3a' : '#3a6aff' }); } }
    else { drawActor(r, g); if (W.night && g.kind !== 'agent') L.add(g.x + Math.cos(g.facing) * 30, g.y + Math.sin(g.facing) * 30, 4, 34, .6, { color: '#fff4c0' }); }
  }
  for (const c of W.clouds) {
    if (c.kind === 'gas') r.queue(c.x, c.y, 6, g => { const p = r.w(c.x, c.y, 6), k = r.view.zoom || 1; px.blend(g, .4, 'normal', () => px.ddisc(g, Math.round(p[0]), Math.round(p[1]), Math.round(c.r * k), '#7ad04a', .7, r.ix, r.iy)); }, { emissive: false });
    else r.decal(() => r.groundArc(c.x, c.y, Math.max(0, c.r - 5), c.r, 0, TAU, '#ffe0a0', .55));
  }
  for (const p of W.pickups) { r.shadow(p.x, p.y, 4, .3); r.sprite(p.x, p.y, 4 + Math.sin(game.time * 4 + p.x) * 2, PICK[p.kind].spr, { glow: .5 }); }
  for (const f of W.flasks) { r.shadow(f.x, f.y, 3, .3); r.sprite(f.x, f.y, f.z, FLASK_SPR[f.kind], { rot: f.t * 14, glow: .6 }); }
  for (const n of W.npcs) drawActor(r, n);
  for (const e of W.enemies) {
    if (!e.dead && e.atk && e.atk.phase === 'wind') r.decal(() => r.groundArc(e.x, e.y, 4, e.kind === 'boss' ? 32 : 22, e.facing - 1.2, e.facing + 1.2, '#ff3a2a', .45));
    if (!e.dead && e.chargeWind > 0) r.decal(() => r.groundArc(e.x, e.y, 6, 90, e.facing - .15, e.facing + .15, '#ff3a2a', .5));
    if (!e.dead && e.slamWind > 0) r.decal(() => r.groundRing ? r.groundArc(e.x, e.y, 10, 60, 0, TAU, '#ff8a2a', .35) : null);
    drawActor(r, e, { alpha: e.dead && e.downT > 3 ? Math.max(0, 1 - (e.downT - 3)) : 1 });
    if (!e.dead && e.kind === 'gunman' && e.aimT > .3) { const t = nearestPlayer(e); if (t) r.queue(e.x, e.y, 18, g => { const a = r.w(e.x, e.y, 18), b = r.w(t.x, t.y, 18); px.blend(g, e.aimT > .7 ? .9 : .45, 'add', () => px.line(g, a[0], a[1], b[0], b[1], '#ff3a2a')); }, { emissive: true }); }
  }
  for (const a of [W.hero, W.partner]) if (a) drawActor(r, a);
  for (const id in W.ghosts) drawGhost(r, W.ghosts[id]);
  W.shots.draw(r);
  if (W.marker && !M.cut && !W.attract) r.marker(W.marker.x, W.marker.y, 0, { label: W.marker.label, color: '#59c8f0' });
  for (const a of W.acts) if (a.active && !a.used) { const p = r.w(a.x, a.y, 30); a.sx = p[0]; a.sy = p[1]; }
  r.overlay(g => drawPlayOverlay(r, g));
  talk.draw(r); barkTalk.draw(r);
  if (M.cookObj) M.cookObj.draw(r);
}
function drawPlayOverlay(r, g) {
  const W2 = r.W, H2 = r.H;
  if (W.dim) px.rect(g, 0, 0, W2, H2, '#000000');
  if (M.cut) { px.rect(g, 0, 0, W2, 16, '#000'); px.rect(g, 0, H2 - 16, W2, 16, '#000'); }
  // guards' ? and ! over their heads
  for (const gd of W.guards) if (gd.mind.state !== 'calm') { const [sx, sy] = r.w(gd.x, gd.y, gd.z + 46), al = gd.mind.state === 'alert'; E.font.text(g, al ? '!' : '?', Math.round(sx), Math.round(sy) - 10, MOOD[gd.mind.state], { align: 'center', shadow: '#000', scale: 2 }); }
  // the thing you can use: a pill with the button, over it
  const f = W.focus;
  if (f && !M.cut && !talk.open && !W.attract && W.hero && !M.cookObj) {
    const I = game.input, key = I.lastDevice === 'mouse' ? 'Left click' : label('interact');
    promptPill(g, key, f.verb + ' ' + (f.name ? f.name : ''), Math.round(f.sx), Math.round(f.sy) - 14);
  }
  // the boss's bar
  const boss = W.enemies.find(e => e.kind === 'boss' && !e.dead);
  if (boss) { const bw = Math.min(220, W2 - 40), x = Math.round(W2 / 2 - bw / 2), y = 24; E.font.text(g, boss.name || 'BOSS', W2 / 2, y - 10, '#ffd0a0', { align: 'center', shadow: '#000' }); px.rect(g, x - 1, y - 1, bw + 2, 7, '#000'); E.ui.bar(g, x, y, bw, 5, boss.hp / boss.maxHp, boss.phase === 2 ? '#ff3a2a' : '#e8a040'); }
  // the flask in hand
  if (W.flaskKinds.length && W.hero && !M.cut) {
    const k = W.flaskKinds[W.flaskSel], F = FLASKS[k], x = 8, y = H2 - 40;
    E.ui.box(g, x, y, 78, 32, { bg: ['#1a1410', '#0c0a08'], border: F.color, alpha: .85 });
    px.sprite(g, FLASK_SPR[k], x + 6, y + 8, { scale: 3 });
    E.font.text(g, F.name, x + 22, y + 5, F.color, { shadow: '#000' });
    E.font.text(g, k === 'chalk' ? '∞' === '∞' ? 'plenty' : '' : (W.hero.catalyst > 0 ? 'free' : '×' + W.hero.ammo[k]), x + 22, y + 15, '#ffffff');
    if (W.flaskKinds.length > 1) E.font.text(g, label('swap') + ' switch', x + 22, y + 24, '#a89878', { font: 'tiny' });
  }
  if (W.bannerT > 0 && W.banner) {
    const a = Math.min(1, W.bannerT * 2), y = Math.round(H2 * .3);
    px.blend(g, .7 * a, 'normal', () => px.rect(g, 0, y - 8, W2, 44, '#000'));
    E.font.title(g, W.banner.text, W2 / 2, y, { scale: 2, align: 'center', colors: W.fail ? ['#ffe0e0', '#ff6a5a', '#c82a2a'] : ['#e8fbff', '#9ae4ff', '#3aa8d8'] });
    if (W.banner.sub) E.font.text(g, W.banner.sub, W2 / 2, y + 22, '#e8e4dc', { align: 'center' });
  }
  if (W.attract) {
    px.blend(g, .6, 'normal', () => px.rect(g, 0, H2 - 22, W2, 22, '#000'));
    const blink = Math.floor(game.time * 2) % 2 === 0;
    E.font.text(g, 'DEMO  •  ' + (M.mission ? M.mission.title.toUpperCase() : ''), 8, H2 - 15, '#59c8f0');
    if (blink) E.font.text(g, touchGate() ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', W2 - 8, H2 - 15, '#ffffff', { align: 'right' });
    E.font.title(g, 'BREAKING BOND', W2 - 8, 8, { scale: 1, align: 'right', colors: ['#ffffff', '#cfe8c0'] });
  }
}
function drawGhost(r, gh) {
  if (!gh.rig) return;
  r.shadow(gh.x, gh.y, 6, .2);
  r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .55, outline: gh.color });
  r.overlay(g => { const p = r.w(gh.x, gh.y, 44); E.font.text(g, gh.name, Math.round(p[0]), Math.round(p[1]), gh.color, { align: 'center', shadow: '#000' }); });
}

/* ================================ RESULTS ================================ */
let res = null, resMenu = null;
const resultsScene = {
  enter(d) { res = d; music('win'); if (!HUB) game.saves.autosave(); const last = d.ch >= CHAPTERS.length - 1; resMenu = new E.Menu(game, [last ? 'THE END' : 'CONTINUE', 'TITLE'], { y: 170, onPick: i => { if (i === 1) return game.go('title'); if (last) game.go('ending'); else game.go('lab', { next: d.ch + 1 }); } }); },
  update(dt) { resMenu.update(dt); },
  draw(r) {
    r.sky(['#0c1a20', '#123040', '#1a4a5a']);
    resMenu.y = Math.round(r.H * .72);
    r.overlay(g => {
      const cx = r.W / 2, s = res.stats, ch = CHAPTERS[res.ch];
      E.font.text(g, 'CHAPTER ' + (res.ch + 1) + ' COMPLETE', cx, 26, '#9ae4ff', { align: 'center' });
      E.font.title(g, ch.title.toUpperCase(), cx, 40, { scale: 2, align: 'center', colors: ['#ffffff', '#cfefff', '#59c8f0'] });
      const rows = [['Time', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0')], ['Cash on hand', fmtMoney(STATE.cash)], ['Best purity', STATE.best ? STATE.best.toFixed(1) + '%' : '—']];
      if (s.kills) rows.push(['Cousins dealt with', String(s.kills)]);
      rows.forEach(([a, b], i) => { const y = 78 + i * 18; E.font.text(g, a, cx - 90, y, '#c8d8e0', { scale: 1 }); E.font.text(g, b, cx + 90, y, '#ffffff', { align: 'right', scale: 1 }); px.rect(g, cx - 90, y + 11, 180, 1, '#2a4a5a'); });
    });
    resMenu.draw(r);
  }
};

/* ================================ THE LAB (upgrades between chapters) ================================ */
const UPGRADES = [
  { key: 'glass', name: 'Borosilicate', what: 'Wider measuring line', cost: [4000, 9000, 16000] },
  { key: 'condenser', name: 'Reflux Condenser', what: 'Wider heat band, bigger batches', cost: [5000, 11000, 20000] },
  { key: 'stirrer', name: 'Magnetic Stirrer', what: 'Looser stirring timing', cost: [3000, 7000, 14000] },
  { key: 'trays', name: 'Steel Trays', what: 'Bigger crystal zone, more yield', cost: [4000, 9000, 18000] },
  { key: 'suit', name: 'Hazmat Suits', what: 'A little purity on every batch', cost: [6000, 12000, 22000] }
];
let lab = null;
const labScene = {
  enter(d) { lab = { next: d.next, i: 0, t: 0 }; music('cook'); if (!HUB) game.saves.autosave(); },
  update(dt) {
    lab.t += dt; const I = game.input, n = UPGRADES.length + 1;
    if (I.repeat('right') || I.repeat('down')) { lab.i = (lab.i + 1) % n; A.sfx('select'); }
    if (I.repeat('left') || I.repeat('up')) { lab.i = (lab.i + n - 1) % n; A.sfx('select'); }
    const ptr = I.pointer(); if (ptr && lab.rects && I.lastDevice === 'mouse') lab.rects.forEach((rc, i) => { if (ptr[0] >= rc[0] && ptr[0] < rc[0] + rc[2] && ptr[1] >= rc[1] && ptr[1] < rc[1] + rc[3] && lab.i !== i) { lab.i = i; A.sfx('select', { vol: .4 }); } });
    const clicked = I.clicked(), hit = clicked && lab.rects && lab.rects.findIndex(rc => clicked[0] >= rc[0] && clicked[0] < rc[0] + rc[2] && clicked[1] >= rc[1] && clicked[1] < rc[1] + rc[3]);
    if (I.pressed('confirm') || (hit !== null && hit !== undefined && hit >= 0)) {
      if (hit >= 0) lab.i = hit;
      if (lab.i === UPGRADES.length) { A.sfx('confirm'); game.go('card', { ch: lab.next }); return; }
      const u = UPGRADES[lab.i], lv = STATE.upgrades[u.key], cost = u.cost[lv];
      if (cost !== undefined && STATE.cash >= cost) { STATE.cash -= cost; STATE.upgrades[u.key]++; A.sfx('cash'); game.flash('#59c8f0', .1, .3); lab.msg = u.name + ' installed.'; }
      else { A.sfx('cancel'); lab.msg = cost === undefined ? 'Already the best money can buy.' : 'Not enough cash. Not yet.'; }
      lab.msgT = 2;
    }
    if (lab.msgT > 0) lab.msgT -= dt;
  },
  draw(r) {
    r.sky(['#14100c', '#241a12', '#3a2a1a']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'THE LAB', cx, 14, { scale: 2, align: 'center', colors: ['#fff8e8', '#e8d0a0', '#b08850'] });
      E.font.text(g, 'A storage unit off Route 66. Spend it on the work.', cx, 34, '#c8b898', { align: 'center' });
      E.font.text(g, fmtMoney(STATE.cash), cx, 48, '#7aff9a', { align: 'center', scale: 2, shadow: '#000' });
      const cols = r.W >= 400 ? 5 : 3, cw = Math.min(84, Math.floor((r.W - 20) / cols) - 6), ch = 88, gap = 6;
      lab.rects = [];
      UPGRADES.forEach((u, i) => {
        const row = Math.floor(i / cols), col = i % cols, inRow = Math.min(cols, UPGRADES.length - row * cols), x0 = Math.round(cx - (inRow * (cw + gap) - gap) / 2);
        const x = x0 + col * (cw + gap), y = 72 + row * (ch + gap), lv = STATE.upgrades[u.key], cost = u.cost[lv], sel = lab.i === i;
        lab.rects.push([x, y, cw, ch]);
        E.ui.box(g, x, y, cw, ch, { bg: sel ? ['#2a4a5a', '#16262e'] : ['#2a2018', '#16100c'], border: sel ? '#59c8f0' : '#5a4a38' });
        for (const [j, w] of wrapText(u.name.toUpperCase(), 14).entries()) E.font.text(g, w, x + cw / 2, y + 6 + j * 9, '#ffffff', { align: 'center' });
        for (const [j, w] of wrapText(u.what, 16).entries()) E.font.text(g, w, x + cw / 2, y + 30 + j * 8, '#c8b898', { align: 'center', font: 'tiny' });
        for (let k = 0; k < 3; k++) px.rect(g, x + cw / 2 - 16 + k * 12, y + 60, 9, 5, k < lv ? '#59c8f0' : '#3a3028');
        E.font.text(g, cost === undefined ? 'MAXED' : fmtMoney(cost), x + cw / 2, y + 72, cost === undefined ? '#59c8f0' : STATE.cash >= cost ? '#7aff9a' : '#a87868', { align: 'center' });
      });
      const rows = Math.ceil(UPGRADES.length / cols), by = 72 + rows * (ch + gap) + 4, bw = 150, bx = Math.round(cx - bw / 2), sel = lab.i === UPGRADES.length;
      lab.rects.push([bx, by, bw, 20]);
      E.ui.box(g, bx, by, bw, 20, { bg: sel ? ['#3a6a3a', '#1a3a1a'] : ['#2a2018', '#16100c'], border: sel ? '#7aff9a' : '#5a4a38' });
      E.font.text(g, 'NEXT: ' + (CHAPTERS[lab.next] ? 'CHAPTER ' + (lab.next + 1) : 'THE END'), cx, by + 6, '#ffffff', { align: 'center' });
      if (lab.msgT > 0) E.font.text(g, lab.msg, cx, by + 28, '#ffe0a0', { align: 'center' });
      promptPill(g, game.input.lastDevice === 'mouse' ? 'Left click' : label('confirm'), lab.i === UPGRADES.length ? 'Go' : 'Buy', cx, r.H - 16);
    });
  }
};

/* ================================ GAME OVER ================================ */
let over = null, overMenu = null;
const overScene = {
  enter(d) { over = d; music(null); A.sfx('die'); overMenu = new E.Menu(game, ['RETRY FROM CHECKPOINT', 'RESTART CHAPTER', 'TITLE'], { y: 140, onPick: i => { if (i === 0) game.go('play', { ch: d.ch, beat: d.beat }); else if (i === 1) game.go('play', { ch: d.ch, beat: 0 }); else game.go('title'); } }); },
  update(dt) { overMenu.update(dt); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#120404', '#2a0a0a', '#4a1414']);
    overMenu.y = Math.round(r.H * .6);
    const lines = { busted: ['BUSTED', 'Marty is going to be insufferable about this.'], caught: ['CAUGHT', '"Mr. Gray? What are you doing in the storeroom at midnight?"'], down: ['DOWN', 'The chemistry was perfect. The plan was not.'] }[over.reason] || ['GAME OVER', ''];
    r.overlay(g => { E.font.title(g, lines[0], r.W / 2, Math.round(r.H * .25), { scale: 4, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' }); E.font.text(g, lines[1], r.W / 2, Math.round(r.H * .25) + 40, '#e8c8c0', { align: 'center' }); });
    overMenu.draw(r);
  }
};

/* ================================ ENDING ================================ */
let endT = 0;
const endingScene = {
  enter() { endT = 0; music('title'); STATE.cleared.ep1 = true; if (!HUB) game.saves.autosave(); },
  update(dt) { endT += dt; if (endT > 2 && (game.input.pressed('confirm') || game.input.pressed('start'))) game.go('about'); },
  draw(r) {
    r.sky(['#05080c', '#0c1820', '#16303a']);
    r.overlay(g => {
      const cx = r.W / 2;
      E.font.title(g, 'END OF EPISODE ONE', cx, 40, { scale: 2, align: 'center', colors: ['#ffffff', '#cfefff', '#59c8f0'] });
      const lines = ['Leland Gray went into the desert a chemistry teacher.', 'He came back with ' + fmtMoney(STATE.total) + ', a partner, a lawyer,', 'a hat, and a name he did not choose.', '', 'NEXT TIME, IN EPISODE TWO: "MISE EN PLACE"', 'A chicken restaurant. A man who never raises his voice.', 'And a lab with real ventilation.'];
      lines.forEach((l, i) => E.font.text(g, l, cx, 80 + i * 13, i === 4 ? '#e8c040' : '#e8e4dc', { align: 'center' }));
      if (endT > 2) promptPill(g, label('confirm'), 'Credits', cx, r.H - 22);
    });
  }
};

/* ================================ ABOUT / CREDITS ================================ */
let aboutY = 0;
const aboutScene = {
  enter() { aboutY = 0; music('title'); },
  update(dt) {
    const I = game.input, m = I.move();
    aboutY = Math.max(0, aboutY + (m[1] * 160 + 10) * dt);
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start')) game.go('title');
  },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#0c0a08', '#14100c']);
    r.overlay(g => {
      const lines = ABOUT_TEXT, lh = 10, total = lines.length * lh + 60;
      let y = Math.round(24 - (aboutY % total));
      for (const l of lines) {
        if (y > -12 && y < r.H + 4) {
          const head = l.startsWith('# '), t = head ? l.slice(2) : l;
          if (head) E.font.text(g, t, r.W / 2, y, '#59c8f0', { align: 'center', shadow: '#000' });
          else for (const w of [t]) E.font.text(g, w, 16, y, '#e8e4dc', { font: undefined });
        }
        y += lh;
      }
      px.blend(g, .8, 'normal', () => px.rect(g, 0, r.H - 16, r.W, 16, '#000'));
      E.font.text(g, (isPad() ? 'L stick' : label('up') + label('down')) + ' scroll   •   ' + label('cancel') + ' back', r.W / 2, r.H - 12, '#b8a888', { align: 'center' });
    });
  }
};

/* ---- 60-cookoff.js ---- */
/* =====================================================================================
 * 60 COOK-OFF — the score attack, played three ways from the same code:
 *  - on its own from the title: one player, or two on one machine (a second player presses Start or 2 and is Danny);
 *  - in an AI Hub session (protocol v1, ghost mode, 1-4 players): no title, straight into the round; each copy plays
 *    the same desert (Math.random is seeded by the hub), sends its cook's position, and shows the others as ghosts.
 * Grab precursor crates around the flats (two at a time), cook them at the RV's table, sell. DEA patrols take
 * what you carry. Highest cash when time runs out wins.
 * ===================================================================================== */
const CRATE_SPR = E.sprite(['.bbbbbb.', 'bBBBBBBb', 'bByyyyBb', 'bBBBBBBb', '.bbbbbb.'], { b: '#6a4a2a', B: '#a87848', y: '#e8c040' });
const HUBSTATE = { info: null, ended: false, reported: false, sendT: 0, progT: 0, started: false };
let co = null;
const COOK_SPOTS = [[8, 12], [12, 8], [15, 22], [30, 6], [34, 18], [28, 26], [9, 20], [38, 10], [21, 6], [24, 26], [36, 27], [5, 16], [14, 15], [31, 15]];
const cookoffScene = {
  pausable: !HUB, camera: { zoom: [.75, 2], start: 1, tall: 1.4 },
  enter(d) {
    newWorld('desert', { flasks: ['chalk'], stealth: true, attract: false });
    W.mode = 'cookoff';
    W.hero = makePlayer('GRAY', 21 * R16, 19 * R16, { hp: 3 });
    W.partner = null;
    W.crates = []; W.carry = 0; W.pcarry = 0;
    W.guards.push(makeGuard('cruiser', [[4, 4], [40, 4, .2], [40, 28, .2], [4, 28, .2]]));
    W.guards.push(makeGuard('agent', [[10, 10], [34, 10, 1], [34, 22], [10, 22, 1]]));
    const rnd = HUB && window.AIHub.rng ? window.AIHub.rng('deal') : Math.random;
    co = { t: 0, limit: HUB && HUBSTATE.info && HUBSTATE.info.limitMs ? Math.max(60, Math.min(180, HUBSTATE.info.limitMs / 1000 - 8)) : 180, score: 0, batches: 0, best: 0, busts: 0, rnd, stun: 0, over: false, countdown: HUB ? null : 3 };
    for (let i = 0; i < 6; i++) spawnCrate();
    W.rigAct = M.act({ cx: 25.5, cy: 18.4, name: 'THE COOK', verb: 'Cook', keep: true, on: (a) => { a.used = false; startQuickCook(); } });
    M.cookObj = null; M.cut = false; M.mission = null; talk.close();
    music('cook'); L.enabled = false; game.weather = W.loc.weather; game.cam.bounds = v => W.map.bounds(v);
    if (!HUB) game.allowJoin({ max: 2, onJoin: input => { W.partner = makePlayer('DANNY', W.hero.x + 12, W.hero.y, { hp: 3 }); W.partner.player = input; input.glyphs = game.settings.glyphs; W.toasts.push(['Player 2 joined', 'Danny grabs crates too. Bring them to the table.']); } });
    W.toasts.push(['Cook-Off', 'Grab precursor crates (two at a time), cook them at the table, beat the clock. DEA takes what you carry.']);
  },
  exit() { ui.hud({}); game.allowJoin(false); game.weather = null; },
  back() { return HUB; },
  update(dt) {
    if (HUBSTATE.ended) return;
    if (HUB) { const t = window.AIHub.time(); if (!(t >= 0)) { co.countdown = isFinite(t) ? Math.ceil(-t / 1000) : null; hudCookoff(); return; } co.countdown = null; }
    else if (co.countdown > 0) { co.countdown -= dt; hudCookoff(); return; }
    voiceTick(); barkTalk.update(dt);
    if (game.input.pressed('view') && !M.cookObj) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (!co.over) co.t += dt;
    if (!co.over && co.t >= co.limit) endCookoff();
    if (M.cookObj) {
      M.cookObj.update(dt);
      if (M.cookObj.done) { const R = M.cookObj.result; M.cookObj = null; const n = W.cooking || 1, cash = Math.round(n * R.lbs * (R.purity * R.purity / 100) * 60 / 10) * 10; co.score += cash; co.batches++; co.best = Math.max(co.best, R.purity); A.sfx('cash'); P.text(W.hero.x, W.hero.y, 30, '+' + fmtMoney(cash), '#7aff9a', { scale: 2 }); W.cooking = 0; music('cook'); report(); }
      W.hero.inv = 1; updateWorld(dt, false); hudCookoff(); netTick(dt); return;
    }
    if (co.stun > 0) { co.stun -= dt; updateWorld(dt, false); } else updateWorld(dt, !co.over);
    computeFocus();
    // crates: walk over to pick up, two at a time
    for (const c of W.crates) { if (c.taken) continue; for (const a of players()) { const isP2 = a === W.partner, have = isP2 ? W.pcarry : W.carry; if (have < 2 && Math.hypot(a.x - c.x, a.y - c.y) < 12) { c.taken = true; if (isP2) W.pcarry++; else W.carry++; A.sfx('pickup'); P.glints(c.x, c.y, 8, 5, '#e8c040'); break; } } }
    if (W.partner && W.pcarry && Math.hypot(W.partner.x - W.rigAct.x, W.partner.y - W.rigAct.y) < 24) { W.carry += W.pcarry; W.pcarry = 0; A.sfx('coin'); W.toasts.push(['Handed over', 'Danny dropped his crates at the table.']); }
    E.prune(W.crates, c => c.taken);
    while (W.crates.length < 6) spawnCrate();
    if (toastCool > 0) toastCool -= dt; else if (W.toasts.length) { const [t, x] = W.toasts.shift(); ui.toast(t, x, 5); toastCool = 4; }
    const h = W.hero, p2 = W.partner && !W.partner.dead ? W.partner : null;
    game.focus(p2 ? (h.x + p2.x) / 2 : h.x, p2 ? (h.y + p2.y) / 2 : h.y, 14);
    hudCookoff(); netTick(dt);
  },
  draw(r) {
    drawPlay(r);
    for (const c of W.crates) { r.decal(() => r.groundArc(c.x, c.y, 8, 11, 0, TAU, '#e8c040', .35 + .2 * Math.sin(game.time * 4))); r.shape('crate', c.x, c.y, 0, { scale: .7, facing: c.cx }); }
    r.overlay(g => {
      const left = Math.max(0, co.limit - co.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
      E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), r.W / 2, 34, left < 20 ? '#ff6a5a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, fmtMoney(co.score), r.W / 2, 52, '#7aff9a', { align: 'center', shadow: '#000' });
      const carry = 'CARRYING ' + W.carry + ' / 2' + (W.partner ? '   DANNY ' + W.pcarry + ' / 2' : '');
      E.font.text(g, carry, r.W / 2, 62, '#e8c040', { align: 'center', shadow: '#000' });
      if (!HUB && !W.partner && Math.floor(game.time) % 6 < 3) E.font.text(g, 'Player 2: press Start on a second pad (or 2 on the keyboard)', r.W / 2, r.H - 12, '#b8a888', { align: 'center' });
      if (co.countdown !== null && co.countdown > 0) E.font.title(g, String(Math.ceil(co.countdown)), r.W / 2, r.H / 2 - 20, { scale: 4, align: 'center', colors: ['#ffffff', '#9ae4ff', '#59c8f0'] });
      if (co.stun > 0) E.font.title(g, 'BUSTED', r.W / 2, r.H / 2 - 30, { scale: 3, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'] });
      if (co.over) {
        px.blend(g, .7, 'normal', () => px.rect(g, 0, r.H / 2 - 40, r.W, 84, '#000'));
        E.font.title(g, 'TIME', r.W / 2, r.H / 2 - 34, { scale: 3, align: 'center', colors: ['#ffffff', '#9ae4ff', '#59c8f0'] });
        E.font.text(g, fmtMoney(co.score) + '  •  ' + co.batches + ' batches  •  best ' + (co.best ? co.best.toFixed(1) + '%' : '-'), r.W / 2, r.H / 2 - 2, '#ffffff', { align: 'center' });
        const best = E.store.get('bb:cookoff', 0); E.font.text(g, 'Best on this machine: ' + fmtMoney(Math.max(best, co.score)), r.W / 2, r.H / 2 + 12, '#e8c040', { align: 'center' });
        if (!HUB) promptPill(g, label('confirm'), 'Title', r.W / 2, r.H / 2 + 28);
      }
    });
    if (M.cookObj) M.cookObj.draw(r);
    if (!HUB && co.over && game.input.pressed('confirm')) game.go('title');
  }
};
function spawnCrate() {
  const free = COOK_SPOTS.filter(([cx, cy]) => !W.crates.some(c => Math.abs(c.cx - cx) < .5 && Math.abs(c.cy - cy) < .5));
  const s = free[Math.floor(co.rnd() * free.length)] || COOK_SPOTS[0];
  W.crates.push({ cx: s[0], cy: s[1], x: (s[0] + .5) * R16, y: (s[1] + .5) * R16, taken: false });
}
function startQuickCook() {
  if (W.carry <= 0) { A.sfx('cancel'); W.toasts.push(['Nothing to cook', 'Bring precursor crates first.']); toastCool = 0; return; }
  W.cooking = W.carry; W.carry = 0; M.cookObj = new Cook({ fast: true, auto: false });
}
// a bust in the Cook-Off: the crates are gone and the cook sits out a moment back at the RV
const _caughtStory = caughtBy;
caughtBy = function (g) {
  if (W.mode !== 'cookoff') return _caughtStory(g);
  if (co.stun > 0 || co.over) return;
  co.busts++; co.stun = 3; W.carry = 0; W.pcarry = 0; A.sfx('siren'); game.shake(4);
  W.hero.x = 21 * R16; W.hero.y = 19 * R16; for (const gd of W.guards) gd.mind.reset();
  bark('AGENT', 'Precursors confiscated. Move along, sir.');
};
function hudCookoff() {
  if (M.cookObj || co.over) { ui.hud({}); return; }
  ui.hud({ objective: { title: W.carry ? 'Cook it' : 'Grab precursor crates', text: W.carry ? 'Bring them to the table by the RV' : 'Yellow-banded crates around the flats', at: W.carry ? { x: W.rigAct.x, y: W.rigAct.y, z: 0 } : undefined, from: W.hero },
    counts: [['Cash', fmtMoney(co.score)], ['Batches', String(co.batches)]], status: W.alarmOn ? { text: 'Spotted', color: '#ff4a3a' } : null });
}
function endCookoff() {
  co.over = true; music('win'); A.sfx('bell');
  E.store.set('bb:cookoff', Math.max(E.store.get('bb:cookoff', 0), co.score));
  report(true);
}
function report(final) {
  if (!HUB) return;
  try {
    window.AIHub.progress({ score: co.score, label: fmtMoney(co.score) });
    if (final && !HUBSTATE.reported) { HUBSTATE.reported = true; window.AIHub.result({ score: co.score, stats: { Batches: co.batches, 'Best purity': co.best ? co.best.toFixed(1) + '%' : '-', Busts: co.busts }, awards: co.best >= 96 ? [{ title: 'Blue Glass', detail: 'Cooked a batch at ' + co.best.toFixed(1) + '%' }] : [] }); }
  } catch (e) { }
}
// ghost mode: send where my cook is ~8 times a second; show the others where they are
function netTick(dt) {
  if (!HUB || HUBSTATE.ended) return;
  HUBSTATE.sendT -= dt; HUBSTATE.progT -= dt;
  if (HUBSTATE.sendT <= 0) { HUBSTATE.sendT = .125; const h = W.hero; try { window.AIHub.send({ k: 'p', x: Math.round(h.x), y: Math.round(h.y), f: Math.round(h.facing * 100) / 100, c: W.carry, s: co.score, ck: M.cookObj ? 1 : 0 }, { reliable: false }); } catch (e) { } }
  if (HUBSTATE.progT <= 0) { HUBSTATE.progT = 1; report(false); }
  for (const id in W.ghosts) { const gh = W.ghosts[id]; gh.x += (gh.tx - gh.x) * Math.min(1, dt * 10); gh.y += (gh.ty - gh.y) * Math.min(1, dt * 10); gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.tx - gh.x) * 8, vy: (gh.ty - gh.y) * 8, facing: gh.f, pose: gh.ck ? 'cast' : null }); }
}
function hubGhost(data, from) {
  if (!W || W.mode !== 'cookoff' || !data || data.k !== 'p') return;
  const pl = (HUBSTATE.info && HUBSTATE.info.players || []).find(p => p.id === from) || { name: 'P' + (from + 1), color: '#ffffff' };
  let gh = W.ghosts[from];
  if (!gh) gh = W.ghosts[from] = { x: data.x, y: data.y, tx: data.x, ty: data.y, f: 0, name: String(pl.name).slice(0, 16), color: pl.color || '#ffffff', rig: makeRig('GRAY', { colors: { cloth: pl.color || '#ffffff' } }) };
  gh.tx = data.x; gh.ty = data.y; gh.f = data.f || 0; gh.ck = data.ck; gh.s = data.s;
}

/* ---- 64-feedback.js ---- */
/* 64 FEEDBACK - the run's answers, shown in About / Credits (and in exit-interview.json) */
const TESTING_FEEDBACK = [
  "How many issues did testing catch? About 15 issues: a crash that blocked chapter 1 (the student conversations), two layouts you could not finish (chapter 5's customers stood inside houses, chapter 2's storeroom aisles were blocked by props), guards able to catch you while a dialog was open, the camera not following during dialogs, unreadable keycap text, mouse players seeing INTERACT instead of E, symbols the pixel font can't draw (a middle dot, a degree sign), the touch-only gate appearing only after a tap, an AI partner strong enough to win fights alone, checkpoint restarts leaving extra NPCs or no partner, music-layer warnings, an unknown material warning, and the Cook-Off timer and crates being hard to see.",
  "How many critical / game breaking? 4 were critical or game-breaking: the chapter 1 script crash, the two chapters you could not finish, and guards catching the player during dialog.",
  "Most helpful test? The autoplay test: the attract-mode bot (invulnerable, no-clip when stuck) played every chapter start to finish in headless Chromium while I logged each beat and objective. It found the crash and both layouts you could not finish, which screenshots never would have shown.",
  "Least helpful test? Least helpful: the first full-scene screenshot pass taken before the camera fix. Most frames showed the wrong part of the map during dialog, so they mostly showed that one bug again and again."
];
const ENGINE_FEEDBACK = [
  "Liked most? Everything you'd normally have to build is already there: pause menu, settings, rebinding, glyph families, saves, the HTML HUD, dialog with portraits, sight cones and suspicion, flow fields, and procedural humanoids that look good right away. A character with a portrait and a typed, voiced line costs one call.",
  "Stuck or guessed wrong? Yes, a few times. A shape material string with a pattern name that isn't a pattern ('rock'), the default text outline that smears dark text on light keycaps, label() returning the action name for mouse users when the action has no mouse button, and glyphs like a middle dot and a degree sign that the pixel font can't draw. Each one cost a screenshot to find.",
  "Most important thing built? The mission framework: chapters as data with beats run as generator scripts, each beat a checkpoint, plus the M toolkit (say, objective, act, waitAct, reach, cook, wave). The cook minigame and the attract bot came next.",
  "Hardest part? Seeing the result. The engine is large, so knowing whether something looked right meant building and screenshooting in a browser. Also, nothing tells a level designer that a spot is unreachable (props placed in a one-cell aisle).",
  "Remove or overhaul? I would overhaul the default text rendering. Make outline off by default (or pick it from contrast) and support or warn about missing glyphs like the middle dot, en and em dashes, and the degree sign, instead of silently drawing a question mark.",
  "Change one thing? A built-in reachability check: map.reachable(from, to) or a debug overlay showing which acts, spawns and objective markers the flow field can't reach. Two of the four critical bugs were exactly that."
];
const PROMPT_FEEDBACK = [
  "Liked most? It asks for a complete vertical slice with real infrastructure (attract mode, controller-first 10-foot UI, glyph switching, axis-inversion toggles, a touch-only gate, hub multiplayer) instead of just a game. That pushes toward something that could actually ship.",
  "Confusing? How multiplayer should work standalone versus in the hub ('for the game on its own') was open to interpretation, so I chose local drop-in co-op outside the hub and ghost mode inside it. Also, the title instruction to pick at random from 50 names gave a title (Breaking Bond) that fits a chemistry theme only by luck.",
  "Hardest thing? Fitting the whole scope into one coherent slice: six story chapters, a signature cook minigame, stealth, combat, a boss, upgrades, a Cook-Off mode, the attract mode and hub integration, all on an unfamiliar engine, while keeping the UI readable at 10 feet.",
  "One test you could have run? A real-controller test on a TV: a DualSense (and an Xbox pad) driving every menu, the HTML pause and settings screens, and a full chapter, to confirm glyphs, axis inversion and focus behavior with real hardware rather than a simulated lastDevice."
];

/* ---- 65-about.js ---- */
/* =====================================================================================
 * 65 ABOUT — Source Information and the run's feedback, shown on the About / Credits screen (ASCII only: the pixel
 * font draws ASCII). The same text is in the run's chat reply and exit-interview.json.
 * ===================================================================================== */
const ABOUT_INFO = [
  '# SOURCE INFORMATION',
  'Date: 2026-11-02 18:13',
  'Source: Breaking Bad (2008-2013), the AMC television series created by Vince Gilligan',
  'Genre and Perspective: crime action-adventure with a chemistry (cook) minigame, stealth and arena combat; three-quarter top-down view (the engine\'s native threequarter), switchable in play to top-down and isometric (V / R3)',
  'Tech: my-3D2dge v0.85.1 (full edition, one file: canvas 2D renderer, E.Humanoid rigs, TileMap, E.Shell HTML HUD, chip-synth audio), plain JavaScript, AI Hub session client 1.3.0 (protocol v1), bundled into one HTML file with a small Node script; no other libraries',
  'Art Direction: the engine\'s native PS1-era pixel look at 320x240 expanded to fill the screen: HD-style humanoid rigs, textured TileMap walls and floors, data-defined 3D shapes (RV, cars, lab benches, crusher), canvas lighting at night, particles and screen effects',
  'Animation: the engine\'s procedural rig system (E.Humanoid posed from motion every step, E.MOVES attacks with wind-up and follow-through, poses: kneel, hips, guard, die), plus code-drawn overlays (the hat follows the head joint)',
  'Audio: all music written as note strings for the engine\'s chip synth (title, school, stealth with layered chase, cook, fight, boss, town, sad, win), code-defined sound effects, and Animalese-style gibberish voices synthesized per letter with a voice per character',
  'Online: AI Hub Session Protocol v1 in ghost mode (1-4 players): the Cook-Off round opens straight into play, each copy sends its cook\'s position and shows the others as ghosts, reports progress and a score; local drop-in 2-player co-op outside the hub (Danny)',
  'Testing: headless Chromium via Playwright 1.63 (smoke runs of every scene, a bot completing all six chapters, a simulated DualSense checking axis inversion and PlayStation/Xbox glyphs, a full attract cycle, a touch-only iPhone profile in WebKit, screenshots), viewport-matrix screenshots across phone, tablet and desktop in Chromium, WebKit and Firefox, and the AI Hub harness automatic check',
  'Research: none beyond the provided engine handoff docs and the AI Hub protocol README; the show\'s premise, tone and structure are from general knowledge',
  'Environment: Claude Code CLI (headless); Linux; browser unknown',
  'Model: Anthropic, claude-opus-5-5, reasoning effort medium',
  'Usage: Session time about 1 h 40 min (18:13 to 19:52, from the clock); API cost and token counts unknown (not visible to the model)',
  '',
  '# TESTING FEEDBACK',
  ...TESTING_FEEDBACK,
  '',
  '# ENGINE FEEDBACK',
  ...ENGINE_FEEDBACK,
  '',
  '# PROMPT FEEDBACK',
  ...PROMPT_FEEDBACK,
  '',
  '# CAST',
  'Leland Gray, chemistry teacher. Danny Pike, former student. Marty, DEA, brother-in-law. Two-Tone Tito Vargas, junkyard. Barry Fleischman, attorney at law. Dr. Okafor. Hugo, night janitor. Kyle, Brianna, Marcus. Don Aurelio.',
  '',
  '# CONTROLS',
  'Controller: left stick move, right stick aim, Cross interact, Circle roll, Square shove, Triangle Catalyst (the hat), R2 / R1 throw, L1 switch flask, L2 sneak, L3 sprint, R3 camera view, Options pause.',
  'Keyboard and mouse: WASD move, mouse aim, left click throw (or click things in the world to use them), right click or F shove, E interact, Space roll, Shift sprint, C sneak, R switch flask, Q Catalyst, V camera view, Esc pause.',
  'Settings: button symbols (PlayStation or Xbox), invert stick left/right and up/down, difficulty, aim assist, sight cones, voices, hints.',
  '',
  '# THANKS',
  'Made with my-3D2dge. Every sound, note, pixel and voice is generated by code.',
  'Thank you for playing.'
];

/* ---- 70-start.js ---- */
/* =====================================================================================
 * 70 START — the About / Credits text (also in the run's chat reply), the scenes, the AI Hub connection, the boot.
 * ===================================================================================== */
const ABOUT_SRC = [
  '# BREAKING BOND',
  'Episode One: Pilot Light. A spiritual successor to Breaking Bad (2008-2013).',
  'An original story and cast. Not affiliated with the show or its makers.',
  '',
  ...ABOUT_INFO
];
const ABOUT_TEXT = [];
for (const l of ABOUT_SRC) { if (l.startsWith('# ') || !l) ABOUT_TEXT.push(l); else for (const w of wrapText(l, 62)) ABOUT_TEXT.push(w); }

// text the pixel font can draw: dashes, quotes and accents brought down to ASCII
const clean = s => String(s).replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/¡/g, '').replace(/[é]/g, 'e').replace(/[ñ]/g, 'n').replace(/…/g, '...');
const _say = M.say; M.say = (who, lines, o) => _say(who, (Array.isArray(lines) ? lines : [lines]).map(clean), o && o.choices ? Object.assign({}, o, { choices: o.choices.map(clean) }) : o);
const _bark = bark; bark = (who, line) => _bark(who, clean(line));
for (const ch of CHAPTERS) ch.cold = ch.cold.map(clean);
const _cb = caughtBy; caughtBy = g => { if (M.cookObj) return; _cb(g); };

const hubWait = {
  enter() { },
  update() { },
  draw(r) { r.sky(['#0c0a08', '#1a140e']); r.overlay(g => { E.font.title(g, 'BREAKING BOND', r.W / 2, r.H / 2 - 24, { scale: 2, align: 'center', colors: ['#ffffff', '#cfe8c0'] }); E.font.text(g, 'COOK-OFF  •  joining the round...', r.W / 2, r.H / 2 + 4, '#e8c890', { align: 'center' }); }); }
};
const scenes = { title: titleScene, chapters: chaptersScene, card: cardScene, play: playScene, results: resultsScene, lab: labScene, over: overScene, ending: endingScene, about: aboutScene, cookoff: cookoffScene, hubwait: hubWait };

// the hub's round: ghost mode, 1-4 players, straight into the Cook-Off
const _coEnter = cookoffScene.enter;
cookoffScene.enter = function (d) { _coEnter.call(this, d); if (HUB && HUBSTATE.info && !HUBSTATE.readied) { HUBSTATE.readied = true; try { window.AIHub.ready(); } catch (e) { } } };
function hubConnect() {
  window.AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title', null, { fade: 0 }); return; }
    HUBSTATE.info = info;
    window.AIHub.on('message', hubGhost);
    window.AIHub.on('leave', e => { if (W && W.ghosts && e) delete W.ghosts[e.id]; });
    window.AIHub.on('time-up', () => { if (co && !co.over) endCookoff(); else report(true); });
    window.AIHub.on('end', () => { HUBSTATE.ended = true; music(null); try { A.mute(true); } catch (e) { } game.input.clear(); ui.hud({}); });
    game.go('cookoff', {}, { fade: 0 });
  }).catch(() => game.go('title', null, { fade: 0 }));
}

game.debug = {
  snapshot: () => ({ scene: game.sceneName, chapter: M.mission ? M.mission.id : null, beat: M.beat, hero: W && W.hero ? [Math.round(W.hero.x), Math.round(W.hero.y), W.hero.hp] : null, enemies: W ? W.enemies.filter(e => !e.dead).length : 0, heat: W ? Math.round(W.heat * 100) / 100 : 0, cash: STATE.cash, cooking: !!M.cookObj, talk: talk.open, attract: W ? W.attract : false, objective: W && W.objective ? W.objective.title : null }),
  teleport(x, y) { if (W && W.hero) { W.hero.x = x; W.hero.y = y; } },
  go: (scene, data) => game.go(scene, data, { fade: 0 }),
  state: () => ({ W, M, STATE, CHAPTERS, talk, game })
};
window.__bb = game.debug;
window.__bbTitleItems = () => titleMenu ? titleMenu.items.map(i => typeof i === 'string' ? i : i.label) : null;

game.start({ scenes, scene: HUB ? 'hubwait' : 'title', boot: { title: 'BREAKING BOND', version: VERSION, steps: [['Cleaning the glassware', () => buildLocation('school')], ['Driving out to the flats', () => buildLocation('desert')], ['Paying off the junkyard dog', () => buildLocation('junk')], ['Printing bus bench ads', () => buildLocation('town')]], messages: ['Calibrating the burner', 'Turning the respirator the right way round', 'Checking for mustard stains'] } });
if (HUB) hubConnect();

})();
