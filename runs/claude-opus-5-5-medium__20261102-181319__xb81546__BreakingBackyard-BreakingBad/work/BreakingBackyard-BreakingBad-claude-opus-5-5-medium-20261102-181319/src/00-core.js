// BREAKING BACKYARD: an original spiritual successor to Breaking Bad (2008-2013), on the my-3D2dge engine.
// A three-quarter-view crime action-adventure: cook in the RV parked in your backyard (a three-stage chemistry
// minigame), sell on street corners under the eyes of DEA patrols (sight cones, suspicion, heat), launder the cash,
// buy upgrades from a lawyer, and fight your way through five episodes to the top of a taco franchise's empire.
// Files (concatenated in order into one IIFE by build.mjs): 00-core, 10-art, 20-world, 30-actors, 40-story,
// 50-cook, 60-scenes, 70-hub, 90-start.
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TAU = Math.PI * 2;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
const TITLE = 'BREAKING BACKYARD';
const BUILD = 'claude-opus-5-5-medium-20261102-181319';

/* ---------------- input: the genre's keys (WASD, E, mouse) and a DualSense layout ---------------- */
const D = E.Input.DEFAULT;
const PRESET = {
  up: D.up, down: D.down, left: D.left, right: D.right,
  interact: ['KeyE', 'Pad0'],                       // ✕ / A: talk, use, cook, sell
  attack: ['Mouse0', 'KeyF', 'Pad2', 'Pad7'],        // □ / X, R2: punch or shoot
  throw: ['Mouse2', 'KeyG', 'Pad5'],                 // R1 / RB: throw the selected flask
  cycle: ['KeyQ', 'Pad3'],                           // △ / Y: switch flask
  dodge: ['Space', 'Pad1'],                          // ○ / B: dodge roll
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad6', 'Pad10'], // L2 / L3: sprint
  ledger: ['Tab', 'KeyM', 'Pad8'],                   // Create / View: the ledger
  view: ['KeyV', 'Pad11'],                           // R3: change the camera
  start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel
};
const ACTION_NAMES = { interact: 'Interact / talk', attack: 'Punch / shoot', throw: 'Throw flask', cycle: 'Switch flask',
  dodge: 'Dodge roll', sprint: 'Sprint', ledger: 'Ledger', view: 'Camera view' };

/* ---------------- gamepad axis inversion (the Settings quick fix): every read of the pads goes through it ---------------- */
let SETTINGS_REF = null;
(function wrapGamepads() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    if (!p) return p;
    const s = SETTINGS_REF; if (!s || (!s.invertX && !s.invertY)) return p;
    const axes = Array.from(p.axes || []);
    for (let i = 0; i < axes.length; i++) if ((i % 2 === 0 && s.invertX) || (i % 2 === 1 && s.invertY)) axes[i] = -axes[i];
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, writable: true, value: () => { const list = real(); return Array.from(list || []).map(wrap); } });
  } catch (e) { /* a locked navigator: inversion unavailable */ }
})();

/* ---------------- the game ---------------- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET, bg: '#0a0806',
  id: 'breaking-backyard',
  autoPause: !HUB,
  menu: {
    controls: ACTION_NAMES,
    quit: HUB ? false : 'title',
    settings: [
      { key: 'glyphs', label: 'Button prompts', options: ['PlayStation', 'Xbox'], value: 'PlayStation', group: 'Controller', help: 'Which controller symbols the prompts show',
        apply: (g, v) => { for (const p of (g.players || [g.input])) p.glyphs = v === 'Xbox' ? 'xbox' : 'playstation'; } },
      { key: 'invertX', label: 'Invert stick horizontal', value: false, group: 'Controller', help: 'Flip left/right on both sticks (some pads report it backwards)' },
      { key: 'invertY', label: 'Invert stick vertical', value: false, group: 'Controller', help: 'Flip up/down on both sticks (some pads report it backwards)' },
      { key: 'difficulty', label: 'Difficulty', options: ['Story', 'Normal', 'Hard'], value: 'Normal', group: 'Game', help: 'How hard enemies hit and how fast the DEA notice' },
      { key: 'cones', label: 'Show DEA sight cones', value: true, group: 'Game', help: 'Draw what each agent can see' },
      { key: 'hints', label: 'Hints', value: true, group: 'Game', help: 'Tutorial tips as new things come up' }
    ]
  }
});
SETTINGS_REF = game.settings;
const I = game.input, A = game.audio, P = game.particles, L = game.lights;
for (const p of game.players) p.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation';
const DIFF = () => ({ Story: { dmg: .5, sus: .6 }, Normal: { dmg: 1, sus: 1 }, Hard: { dmg: 1.5, sus: 1.4 } })[game.settings.difficulty] || { dmg: 1, sus: 1 };

/* ---------------- devices: touch-only screens get no touch controls ---------------- */
const mm = q => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; } };
let sawKeyOrPad = false;
const touchOnly = () => {
  if (sawKeyOrPad) return false;
  if (typeof navigator === 'undefined') return false;
  const touch = navigator.maxTouchPoints > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window) || mm('(pointer: coarse)');
  if (!touch) return false;
  if (mm('(any-pointer: fine)') || mm('(any-hover: hover)')) return false;
  try { if (Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(Boolean)) return false; } catch (e) { /* none */ }
  return true;
};
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { sawKeyOrPad = true; }, true);
  addEventListener('gamepadconnected', () => { sawKeyOrPad = true; });
}
I.touchEnabled = false;

/* ---------------- prompts that follow the device used last ---------------- */
const lbl = a => {
  const s = I.label(a);
  return (s || a).replace('Left click', 'LMB').replace('Right click', 'RMB');
};
const isPad = () => I.lastDevice === 'gamepad';

/* ---------------- audio: chip voices for each speaker (gibberish "Simlish") ---------------- */
const VOICES = {
  hollis: { base: 'A2', wave: 'square', span: 5, vol: .07 },
  dusty: { base: 'E3', wave: 'pulse', span: 9, vol: .07 },
  lenny: { base: 'C3', wave: 'saw', span: 12, vol: .05 },
  vela: { base: 'F2', wave: 'triangle', span: 3, vol: .12 },
  dale: { base: 'D2', wave: 'square', span: 7, vol: .07 },
  rafa: { base: 'G2', wave: 'saw', span: 10, vol: .05 },
  mack: { base: 'C2', wave: 'triangle', span: 2, vol: .12 },
  skyler: { base: 'C4', wave: 'pulse12', span: 6, vol: .05 },
  thug: { base: 'B2', wave: 'saw', span: 8, vol: .05 },
  radio: { base: 'G3', wave: 'pulse12', span: 4, vol: .04 }
};
const NOTE_ST = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteHz = n => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); const s = NOTE_ST[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; return 440 * Math.pow(2, (s - 69) / 12); };
const SCALE = [0, 2, 3, 5, 7, 8, 10, 12, 14];
let voiceRand = E.rng(77);
for (const k in VOICES) {
  const v = VOICES[k];
  // a syllable: a short blip at a random step of the speaker's scale, a vowel-ish glide
  A.define('vox_' + k, { wave: v.wave, freq: noteHz(v.base), dur: .06, vol: v.vol });
}
const realSfx = A.sfx.bind(A);
A.sfx = (what, o = {}) => {
  if (typeof what === 'string' && what.startsWith('vox_')) {
    const v = VOICES[what.slice(4)] || VOICES.thug;
    if (voiceRand() < .35) return null;            // not every letter speaks: syllables
    const st = SCALE[Math.floor(voiceRand() * SCALE.length)] % (v.span + 1);
    const f = noteHz(v.base) * Math.pow(2, st / 12);
    return realSfx({ wave: v.wave, freq: f, to: f * (voiceRand() < .5 ? .85 : 1.12), dur: .05 + voiceRand() * .04, vol: v.vol }, o);
  }
  return realSfx(what, o);
};
A.define('flask', { wave: 'noise', freq: 1800, to: 300, dur: .18, vol: .25 });
A.define('glass', { wave: 'square', freq: 2400, to: 3600, dur: .08, vol: .12, arp: [0, 7, 12], step: .02 });
A.define('cash', { wave: 'pulse', freq: 'E5', dur: .16, vol: .14, arp: [0, 4, 7, 12], step: .035 });
A.define('alarm', { wave: 'square', freq: 'A4', to: 'E5', dur: .3, vol: .12, vib: [10, .06] });
A.define('bubble', { wave: 'sine', freq: 300, to: 900, dur: .09, vol: .12 });
A.define('tick', { wave: 'square', freq: 1400, dur: .025, vol: .07 });
A.define('good', { wave: 'triangle', freq: 'C5', dur: .18, vol: .2, arp: [0, 7, 12], step: .04 });
A.define('bad', { wave: 'saw', freq: 'C3', to: 'A2', dur: .25, vol: .14 });
A.define('gun', { wave: 'noise', freq: 900, to: 120, dur: .12, vol: .3 });
A.define('shotgun', { wave: 'noise', freq: 600, to: 60, dur: .28, vol: .38 });
A.define('siren', { wave: 'square', freq: 'C5', to: 'G5', dur: .45, vol: .06, vib: [4, .2] });
A.define('hiss', { wave: 'noise', freq: 4000, to: 2000, dur: .6, vol: .08 });

/* music: original chip songs in the engine's step notation */
const SONGS = {
  // the title: a lonely desert twang over a slow pulse, in E minor
  title: { bpm: 84, steps: 4, tracks: [
    { wave: 'pulse', vol: .09, notes: 'E4 - - G4 | B4 - A4 - | G4 - E4 - | - - - . | D4 - - E4 | G4 - F#4 - | E4 - - - | . . . . | E4 - - G4 | B4 - D5 - | C5 - B4 - | A4 - - . | G4 - F#4 - | E4 - D4 - | E4 - - - | . . . .' },
    { wave: 'triangle', vol: .16, notes: 'E2 . E2 . | E2 . . E2 | C2 . C2 . | C2 . . C2 | D2 . D2 . | D2 . . D2 | E2 . E2 . | B1 . . . ' },
    { wave: 'drums', vol: .08, notes: 'k . . . | . . h . | k . . k | . . h . ' }
  ] },
  // the town: a laid-back bassline, a guitar-ish lead that says "nothing to see here"
  town: { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'A4 . C5 . | E5 - D5 . | C5 . A4 . | G4 - - . | A4 . C5 . | E5 - G5 . | F5 . E5 . | D5 - - . | . . . . | . . . . | E5 . D5 . | C5 - A4 . | B4 . G4 . | A4 - - - | . . . . | . . . .' },
    { name: 'bass', wave: 'triangle', vol: .18, notes: 'A2 . A2 E2 | A2 . G2 . | F2 . F2 C2 | F2 . G2 . ' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . | s . h k | k . h . | s . h h ' },
    { name: 'tension', wave: 'saw', vol: .05, on: false, notes: 'A3 - - - | G#3 - - - | A3 - - - | A#3 - - - ' }
  ] },
  // the cook: a pulsing arpeggio, science montage
  cook: { bpm: 128, steps: 4, tracks: [
    { wave: 'square', vol: .06, notes: 'E4 G4 B4 E5 | B4 G4 E4 G4 | C4 E4 G4 C5 | G4 E4 C4 E4 | D4 F#4 A4 D5 | A4 F#4 D4 F#4 | B3 D#4 F#4 B4 | F#4 D#4 B3 D#4' },
    { wave: 'triangle', vol: .17, notes: 'E2 - E3 . | E2 - E3 . | C2 - C3 . | C2 - C3 . | D2 - D3 . | D2 - D3 . | B1 - B2 . | B1 - B2 . ' },
    { wave: 'drums', vol: .08, notes: 'k h s h | k h s h | k h s h | k k s o ' }
  ] },
  // a fight: driving, minor, urgent
  fight: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .06, notes: 'E4 . E4 G4 | . E4 A4 . | E4 . E4 G4 | . B4 A4 G4 | D4 . D4 F4 | . D4 G4 . | D4 . D4 F4 | . A4 G4 F4 ' },
    { wave: 'triangle', vol: .2, notes: 'E2 E2 E3 E2 | E2 E3 E2 E2 | D2 D2 D3 D2 | D2 D3 D2 D2 ' },
    { wave: 'drums', vol: .1, notes: 'k . s . | k k s . | k . s . | k k s s ' }
  ] },
  // a boss: heavy, slow-stepping, a chromatic menace
  boss: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E4 - F4 - | E4 - D#4 - | E4 - G4 - | F#4 - F4 - | E4 - F4 - | E4 - D#4 - | B4 - A#4 - | A4 - G#4 - ' },
    { wave: 'saw', vol: .06, notes: 'E2 E2 . E2 | F2 . E2 . | E2 E2 . E2 | A#1 . B1 . ' },
    { wave: 'drums', vol: .11, notes: 'k . k s | . k s . | k . k s | k s s s ' }
  ] },
  // the ending: somber, slow, in A minor, then a held note
  ending: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'A4 - - - | C5 - B4 - | A4 - - - | E4 - - - | F4 - - - | E4 - D4 - | E4 - - - | - - - - | A4 - - - | C5 - D5 - | E5 - - - | D5 - C5 - | B4 - - - | G#4 - - - | A4 - - - | - - - - ' },
    { wave: 'pulse12', vol: .05, notes: 'A2 . E3 . | A2 . E3 . | F2 . C3 . | F2 . C3 . | D2 . A2 . | E2 . B2 . | A2 . E3 . | A2 . . . ' }
  ] }
};
let songNow = null;
const music = (id, o) => { if (songNow === id) return; songNow = id; A.music(id ? SONGS[id] : null, o); };

/* ---------------- shared helpers ---------------- */
const fmt$ = n => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const choose = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
let rnd = Math.random;                     // the hub round swaps in AIHub.rng('deal')
const LOG = [];                            // a short event log the tests read
const log = (k, v) => { LOG.push([k, v]); if (LOG.length > 300) LOG.shift(); };
