/* ============================== GAME START ==============================
 * THE SOPRANIACS — a North Jersey crime-family action adventure on my-3D2dge.
 * An original spiritual successor to The Sopranos (1999-2007): stress, therapy, family, envelopes and ducks.
 * Built from modules (src/*.js) concatenated inside this one IIFE by build.mjs.
 * ======================================================================== */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TAU = Math.PI * 2, T = 16;
const HUB = !!(window.AIHub && window.AIHub.active);
const VERSION = '1.0.0';

/* ---- INPUT: keys PC players expect for a third-person action game; a DualSense-first layout ----
 * Pad (standard mapping): 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3 */
const MENU = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyE', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const INPUT = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  attack: ['KeyJ', 'Mouse0', 'Pad2'],              // punch: a four-hit combo
  heavy: ['KeyK', 'Pad3'],                          // haymaker / stomp a downed guy
  dodge: ['Space', 'Pad1'],                         // roll out of the way
  interact: ['KeyE', 'KeyF', 'Pad0'],               // talk, take, enter and leave the car
  fire: ['KeyL', 'Mouse2', 'Pad7'],                 // the pistol (draws heat)
  gas: ['KeyW', 'ArrowUp', 'Pad7'],                 // in the car
  brake: ['KeyS', 'ArrowDown', 'Pad6'],             // in the car (reverse when stopped)
  breathe: ['KeyQ', 'Pad6'],                        // hold: Dr. Melba's breathing (lowers stress)
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad4', 'Pad10'],
  horn: ['KeyH', 'Pad5'],                           // in the car
  view: ['KeyV', 'Pad11'],                          // cycle the camera
  log: ['Tab', 'KeyM', 'Pad8']                      // the job log
}, MENU);
const CONTROL_NAMES = { attack: 'Punch (combo)', heavy: 'Haymaker', dodge: 'Roll', interact: 'Talk / use / car', fire: 'Pistol', gas: 'Gas (car)', brake: 'Brake (car)',
  breathe: 'Breathe (hold)', sprint: 'Sprint', horn: 'Horn (car)', view: 'Camera view', log: 'Job log' };

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: INPUT,
  menu: {
    controls: CONTROL_NAMES, saves: HUB ? false : { slots: 3, version: 1 }, quit: 'title',
    settings: [
      { key: 'invertPadX', label: 'Invert controller horizontal', value: false, group: 'Controller', help: 'Some controllers report the sticks backwards. Flip left and right.' },
      { key: 'invertPadY', label: 'Invert controller vertical', value: false, group: 'Controller', help: 'Flip up and down on the controller.' },
      { key: 'difficulty', label: 'Difficulty', options: ['Made guy', 'Capo', 'Boss'], value: 'Capo' },
      { key: 'hints', label: 'On-screen hints', value: true },
      { key: 'talkSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast'], value: 'Normal' },
      { key: 'voices', label: 'Gibberish voices', value: true }
    ]
  }
});
const input = game.input, audio = game.audio, P = game.particles, L = game.lights;

// PlayStation symbols by default (the game is designed around a DualSense); Settings > Controller > Button symbols has Xbox
if (!E.store.get('sopraniacs.glyphs', false)) { try { game.settings.set('glyphs', 'playstation'); } catch (e) { input.glyphs = 'playstation'; } E.store.set('sopraniacs.glyphs', true); }

// the ~10% of pads that report a stick backwards: Settings > Controller flips them. Only the controller is flipped
const rawMove = input.move.bind(input);
const padFlip = v => [game.settings.invertPadX ? -v[0] : v[0], game.settings.invertPadY ? -v[1] : v[1]];
input.move = function () { const m = rawMove(); return input.lastDevice === 'gamepad' ? padFlip(m) : m; };
const padAim = () => input.padAim ? padFlip(input.padAim) : null;

// touch-only devices: no touch controls (the game needs a controller or a keyboard)
const COARSE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(pointer: fine)').matches));
let usedKeys = false, usedMouse = false;
if (typeof window.addEventListener === 'function') {
  window.addEventListener('keydown', () => { usedKeys = true; }, true);
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) { usedMouse = true; if (input.lastDevice !== 'mouse' && (Math.abs(e.movementX) + Math.abs(e.movementY)) > 2) input.lastDevice = 'mouse'; } }, true);
}
function touchOnly() {
  if (!COARSE || usedKeys || usedMouse || input.lastDevice === 'gamepad') return false;
  try { const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; if (pads.length) return false; } catch (e) { /* none */ }
  return true;
}
input.touchEnabled = false;

const diff = () => ({ 'Made guy': .6, Capo: 1, Boss: 1.45 })[game.settings.difficulty] || 1;
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');

/* ---- SOUND: code-written effects and Animalese-style gibberish voices ---- */
audio.define('punchHit', [{ wave: 'noise', freq: 900, to: 120, dur: .09, vol: .5 }, { wave: 'square', freq: 160, to: 60, dur: .08, vol: .3 }]);
audio.define('slap', { wave: 'noise', freq: 2400, to: 900, dur: .05, vol: .35 });
audio.define('gun', [{ wave: 'noise', freq: 1800, to: 80, dur: .22, vol: .7 }, { wave: 'square', freq: 220, to: 40, dur: .12, vol: .35 }]);
audio.define('click', { wave: 'square', freq: 1400, dur: .02, vol: .2 });
audio.define('quack', [{ wave: 'saw', freq: 520, to: 380, dur: .09, vol: .3, vib: [30, .05] }, { wave: 'square', freq: 260, to: 200, dur: .09, vol: .12 }]);
audio.define('horn', [{ wave: 'square', freq: 349, dur: .35, vol: .3 }, { wave: 'square', freq: 440, dur: .35, vol: .25 }]);
audio.define('engine', { wave: 'saw', freq: 70, to: 90, dur: .12, vol: .08 });
audio.define('door', { wave: 'noise', freq: 500, to: 200, dur: .18, vol: .25 });
audio.define('bell', [{ wave: 'sine', freq: 1568, dur: .9, vol: .35 }, { wave: 'sine', freq: 2093, dur: .7, vol: .2 }, { wave: 'triangle', freq: 784, dur: 1, vol: .15 }]);
audio.define('cash', [{ wave: 'square', freq: 1046, dur: .06, vol: .2 }, { wave: 'square', freq: 1318, dur: .06, vol: .2, delay: .06 }, { wave: 'triangle', freq: 1568, dur: .25, vol: .25, delay: .12 }]);
audio.define('ring', { wave: 'square', freq: 880, dur: .5, vol: .18, vib: [24, .2] });
audio.define('heartbeat', [{ wave: 'sine', freq: 60, to: 40, dur: .12, vol: .7 }]);
audio.define('crash', [{ wave: 'noise', freq: 600, to: 60, dur: .35, vol: .6 }, { wave: 'square', freq: 90, to: 30, dur: .3, vol: .3 }]);
audio.define('breath', { wave: 'noise', freq: 400, to: 250, dur: .8, vol: .12 });

// each speaker's voice: a pitch, a wave and a lilt; letters type, syllables blip at random pitches around it
const VOICES = {
  TONY: { f: 110, w: 'square', s: .32 }, PAULIE: { f: 175, w: 'pulse', s: .4 }, CHRISSY: { f: 150, w: 'saw', s: .35 }, SIL: { f: 95, w: 'triangle', s: .25 },
  'DR. MELBA': { f: 260, w: 'triangle', s: .25 }, CARLA: { f: 240, w: 'pulse', s: .35 }, MA: { f: 300, w: 'saw', s: .45 }, RALPHIE: { f: 165, w: 'square', s: .5 },
  ARTIE: { f: 140, w: 'triangle', s: .3 }, 'AGENT HARROW': { f: 125, w: 'triangle', s: .15 }, ENZO: { f: 130, w: 'saw', s: .3 }, GEORGIE: { f: 190, w: 'pulse', s: .4 },
  'T.J.': { f: 200, w: 'square', s: .3 }, MEDORA: { f: 280, w: 'triangle', s: .3 }, DEFAULT: { f: 160, w: 'square', s: .35 }
};
let voiceT = 0, voiceShown = 0;
function voiceTick(talk, dt) {
  if (!talk.open || !game.settings.voices) { voiceShown = 0; return; }
  if (talk.shown < voiceShown) voiceShown = 0;
  const v = VOICES[talk.name] || VOICES.DEFAULT;
  voiceT -= dt;
  if (talk.typing && talk.shown > voiceShown + 1 && voiceT <= 0) {
    voiceShown = talk.shown; voiceT = .075 + Math.random() * .04;
    const f = v.f * (1 + (Math.random() - .5) * v.s * 2), g = f * (1 + (Math.random() - .5) * .3);
    audio.sfx({ wave: v.w, freq: f, to: g, dur: .055, vol: .16 });
  }
}

/* ---- MUSIC: written as tracker strings (original tunes) ---- */
const rep = (s, n) => Array(n).fill(s).join(' | ');
const SONGS = {
  // a smoky Jersey blues shuffle for the title: walking bass, a brass stab, a ride cymbal
  title: { bpm: 96, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 - . E2 G2 - . A2 Bb2 - B2 - . . A2 . | E2 - . E2 G2 - . A2 Bb2 - A2 - G2 - E2 . | A2 - . A2 C3 - . D3 Eb3 - E3 - . . D3 . | E2 - . E2 G2 - . A2 B2 - . D3 . B2 A2 .' },
    { wave: 'pulse', vol: .07, notes: '. . . . . . . . E4 - G4 - . . . . | . . . . . . . . B4 - A4 - G4 - E4 - | . . . . . . . . A4 - C5 - . . . . | . . . . B4 . D5 - - - B4 - A4 - G4 -' },
    { wave: 'drums', vol: .22, notes: rep('k . h . s . h k . k h . s . h h', 4) }] },
  // the neighborhood: an easy mandolin-ish tremolo over a I-vi-IV-V doo-wop changes
  town: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C3 . G2 . C3 . E3 . | A2 . E2 . A2 . C3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . E3 . | A2 . E2 . A2 . C3 . | F2 . C3 . G2 . B2 . | C3 . G2 . C3 - - -' },
    { wave: 'pulse12', vol: .06, notes: 'E5 E5 G5 G5 E5 E5 C5 C5 | E5 E5 C5 C5 A4 A4 C5 . | A4 A4 C5 C5 F5 F5 E5 D5 | D5 - B4 - G4 - . . | E5 E5 G5 G5 C6 C6 B5 A5 | A5 - E5 - C5 - . . | F5 F5 A5 A5 G5 F5 D5 B4 | C5 - - - . . . .' },
    { wave: 'drums', vol: .12, notes: rep('k . h . s . h .', 8) }] },
  // the fight: driving rock in A minor
  fight: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .12, notes: 'A2 A2 A3 A2 A2 G3 A2 A2 | F2 F2 F3 F2 G2 G2 G3 G2 | A2 A2 A3 A2 A2 C4 A2 A2 | E2 E2 E3 E2 G2 G2 Ab2 Ab2' },
    { wave: 'square', vol: .06, notes: 'A4 - - C5 - - E5 - | F5 - E5 - D5 - C5 - | A4 - - C5 - - E5 - | B4 - - - Ab4 - - -' },
    { wave: 'drums', vol: .26, notes: rep('k h s h k k s h', 4) }] },
  // the therapist's office: slow triangle arpeggios, a held pad
  therapy: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'D4 F4 A4 C5 A4 F4 D4 F4 | Bb3 D4 F4 A4 F4 D4 Bb3 D4 | G3 Bb3 D4 F4 D4 Bb3 G3 Bb3 | A3 C#4 E4 G4 E4 C#4 A3 C#4' },
    { wave: 'sine', vol: .08, notes: 'D3 - - - - - - - | Bb2 - - - - - - - | G2 - - - - - - - | A2 - - - - - - -' }] },
  // the club: four on the floor
  club: { bpm: 122, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'C3 . C3 C4 . C3 Eb3 . | C3 . C3 C4 . Bb2 G2 . | Ab2 . Ab2 Ab3 . Ab2 C3 . | Bb2 . Bb2 Bb3 . Bb2 D3 .' },
    { wave: 'pulse', vol: .05, notes: '. . G4 . . . G4 . | . . G4 . . . Bb4 . | . . Ab4 . . . C5 . | . . Bb4 . . . D5 .' },
    { wave: 'drums', vol: .24, notes: rep('k . h . k . h c', 4) }] },
  // jukebox 1: "Kearny Streetlights", a power ballad that builds
  juke1: { bpm: 118, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'E3 . E3 . E3 . E3 . | B2 . B2 . B2 . B2 . | C#3 . C#3 . C#3 . C#3 . | A2 . A2 . A2 . A2 .' },
    { wave: 'pulse', vol: .07, notes: 'E4 B4 G#4 B4 E4 B4 G#4 B4 | D#4 B4 F#4 B4 D#4 B4 F#4 B4 | C#4 G#4 E4 G#4 C#4 G#4 E4 G#4 | A3 E4 C#4 E4 B3 F#4 D#4 F#4' },
    { wave: 'square', vol: .05, notes: '. . . . G#5 - F#5 E5 | F#5 - - - D#5 - B4 - | E5 - - E5 F#5 - G#5 - | F#5 - - - - - . .' },
    { wave: 'drums', vol: .16, notes: rep('k . h . s . h .', 4) }] },
  // jukebox 2: "Turnpike Exit 16W", a stomping rocker
  juke2: { bpm: 136, steps: 4, tracks: [
    { wave: 'saw', vol: .11, notes: 'G2 G2 Bb2 G2 C3 G2 Db3 C3 | G2 G2 Bb2 G2 F2 G2 . . | C3 C3 Eb3 C3 F3 C3 Gb3 F3 | D3 D3 C3 C3 Bb2 Bb2 A2 A2' },
    { wave: 'square', vol: .05, notes: 'G4 - Bb4 - C5 - Db5 C5 | Bb4 - G4 - . . . . | C5 - Eb5 - F5 - Gb5 F5 | D5 - C5 - Bb4 - A4 -' },
    { wave: 'drums', vol: .24, notes: rep('k . s . k k s .', 4) }] },
  // jukebox 3: "Onion Ring Serenade", a crooner's waltz-ish swing
  juke3: { bpm: 92, steps: 3, tracks: [
    { wave: 'triangle', vol: .15, notes: 'F2 A2 C3 | D3 F3 A3 | G2 Bb2 D3 | C3 E3 G3 | F2 A2 C3 | D3 F3 A3 | G2 C3 E3 | F2 - -' },
    { wave: 'pulse12', vol: .07, notes: 'A4 - C5 | F5 - - | D5 - Bb4 | G4 - - | A4 C5 F5 | A5 - G5 | E5 D5 C5 | F5 - -' },
    { wave: 'drums', vol: .09, notes: rep('k h h', 8) }] },
  // the yard at night: low, tense
  night: { bpm: 84, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'D2 - . D2 . . F2 - | E2 - . E2 . . C2 - | D2 - . D2 . . F2 - | A1 - . A1 . . C#2 -' },
    { wave: 'triangle', vol: .08, notes: '. . A4 . . . G4 . | . . F4 . . . E4 . | . . A4 . . . Bb4 . | . . A4 - - - G#4 .' },
    { wave: 'drums', vol: .14, notes: rep('k . . h s . . h', 4) }] },
  victory: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - G5 C6 | - - - - . . . .' }, { wave: 'triangle', vol: .14, notes: 'C3 - G3 - C4 - - - | C3 - - - . . . .' },
    { wave: 'drums', vol: .2, notes: 'k . s . k k s . | c . . . . . . .' }] }
};
let curSong = null;
function music(name, o) { if (curSong === name) return; curSong = name; audio.music(name ? SONGS[name] : null, o); }
