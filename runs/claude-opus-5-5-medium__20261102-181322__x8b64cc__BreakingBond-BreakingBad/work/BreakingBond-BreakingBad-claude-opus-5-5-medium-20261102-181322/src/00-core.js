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
