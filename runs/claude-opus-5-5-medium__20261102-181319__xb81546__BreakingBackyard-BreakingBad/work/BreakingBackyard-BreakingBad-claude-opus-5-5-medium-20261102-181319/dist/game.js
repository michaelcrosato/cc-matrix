// ---- 00-core.js ----
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

// ---- 10-art.js ----
/* ---------------- art: shapes as data (drawn in every view and facing), the cast's rigs ---------------- */
E.MATERIALS.rvbody = { color: '#e8dcc0', pattern: 'metal' };
E.MATERIALS.rvstripe = { color: '#8a5a2a', pattern: 'none' };
E.MATERIALS.glassdark = { color: '#28343c', pattern: 'glaze' };
E.MATERIALS.rubber = { color: '#1c1a1a', pattern: 'none' };
E.MATERIALS.chrome = { color: '#b8c0c8', pattern: 'metal' };
E.MATERIALS.carred = { color: '#9a2a24', pattern: 'glaze' };
E.MATERIALS.carblue = { color: '#2a4a7a', pattern: 'glaze' };
E.MATERIALS.cargreen = { color: '#4a6a3a', pattern: 'glaze' };
E.MATERIALS.carwhite = { color: '#d8d4cc', pattern: 'glaze' };
E.MATERIALS.caryellow = { color: '#c8a030', pattern: 'glaze' };
E.MATERIALS.blueglow = { color: '#58c8f0', pattern: 'glaze', glow: 1 };
E.MATERIALS.labsteel = { color: '#a8b0b4', pattern: 'metal', rivet: true };
E.MATERIALS.hazmat = { color: '#e0c020', pattern: 'cloth' };
E.MATERIALS.neonred = { color: '#ff5040', pattern: 'none', glow: 1 };

E.SHAPES.rv = { about: 'old tan RV with a brown stripe', tags: 'vehicle', mats: { b: 'rvbody', s: 'rvstripe', g: 'glassdark', t: 'rubber', c: 'chrome' },
  parts: [['box','b',[0,0,5],[22,52,22]], ['box','s',[0,0,13],[22.4,52.4,3]], ['box','b',[0,24,5],[21,8,14]],
    ['box','g',[0,28.2,12],[18,1,6]], ['mirror','x',['box','g',[11.2,-6,17],[.5,10,5]]], ['mirror','x',['box','g',[11.2,14,17],[.5,6,5]]],
    ['mirror','xy',['cyl','t',[11,17,0],4.5,3,{rot:[0,90,0]}]], ['box','c',[0,29,5],[22,1.5,2.5]], ['box','b',[0,-6,27],[10,10,3]]] };
E.SHAPES.sedan = { about: 'boxy sedan', tags: 'vehicle', mats: { b: 'carblue', g: 'glassdark', t: 'rubber', c: 'chrome' },
  parts: [['box','b',[0,0,3],[16,34,8]], ['box','g',[0,-1,11],[14,16,6]], ['box','b',[0,-1,16.5],[14,13,1.5]],
    ['mirror','xy',['cyl','t',[8,10,0],3.5,2.5,{rot:[0,90,0]}]], ['box','c',[0,17.2,4],[16,.8,2]], ['box','c',[0,-17.2,4],[16,.8,2]]] };
E.SHAPES.pickup = { about: 'beat-up pickup truck', tags: 'vehicle', mats: { b: 'cargreen', g: 'glassdark', t: 'rubber', r: 'rusted' },
  parts: [['box','b',[0,6,3],[17,22,9]], ['box','g',[0,2,12],[15,9,7]], ['box','b',[0,2,19],[15,9,1]], ['box','r',[0,-10,3],[17,14,6]],
    ['mirror','xy',['cyl','t',[8.5,11,0],3.8,2.5,{rot:[0,90,0]}]]] };
E.SHAPES.labtable = { about: 'steel lab table with flasks', tags: 'lab', mats: { s: 'labsteel', g: 'blueglow', c: 'glazed' },
  parts: [['box','s',[0,0,11],[28,12,2]], ['mirror','xy',['box','s',[12,4.5,0],[1.5,1.5,11]]],
    ['lathe','c',[-7,0,13],[[0,0],[4,0],[4,2],[1.2,7],[1.2,9],[0,9]]], ['lathe','g',[4,1,13],[[0,0],[3,0],[3,4],[1,6],[0,6]]], ['cyl','c',[10,-2,13],1.5,8]] };
E.SHAPES.tank = { about: 'steel reactor tank', tags: 'lab industrial', mats: { s: 'labsteel', g: 'blueglow', p: 'steel' },
  parts: [['cyl','s',[0,0,0],9,34,{seg:12}], ['cyl','s',[0,0,34],9,5,{r2:3,seg:12}], ['cyl','p',[0,0,39],1.5,10], ['box','g',[0,9.2,12],[4,1,10]], ['ring',4,8,['box','p',[0,0,0],[2,2,6]]]] };
E.SHAPES.washer = { about: 'industrial washing machine', tags: 'laundry industrial', mats: { s: 'porcelain', d: 'chrome', g: 'glassdark' },
  parts: [['box','s',[0,0,0],[16,16,20]], ['cyl','d',[0,8.4,10],6,1,{rot:[90,0,0]}], ['cyl','g',[0,8.9,10],4.5,1,{rot:[90,0,0]}], ['box','d',[0,0,20],[16,16,1.5]]] };
E.SHAPES.drum = { about: 'blue chemical drum', tags: 'lab container', mats: { b: 'carblue', r: 'steel' },
  parts: [['cyl','b',[0,0,0],6,17,{seg:12}], ['row',2,[0,0,10],['cyl','r',[0,0,3],6.3,1,{seg:12}]]] };
E.SHAPES.vending = { about: 'soda vending machine', tags: 'town', mats: { b: 'carred', g: 'blueglow', w: 'carwhite' },
  parts: [['box','b',[0,0,0],[14,10,28]], ['box','g',[-2,5.2,10],[7,.5,14]], ['box','w',[4.5,5.2,14],[3,.5,8]]] };
E.SHAPES.dumpster = { about: 'green dumpster', tags: 'town', mats: { b: 'cargreen', l: 'rubber' },
  parts: [['box','b',[0,0,2],[28,14,14]], ['wedge','l',[0,0,16],[28,14,3]], ['mirror','xy',['cyl','l',[12,5,0],1.8,2]]] };
E.SHAPES.mailbox = { about: 'curbside mailbox', tags: 'town', mats: { p: 'walnut', b: 'steel' },
  parts: [['box','p',[0,0,0],[2,2,12]], ['box','b',[0,0,12],[4,8,4]], ['cyl','b',[0,0,16],2,8,{rot:[90,0,0],sq:1}]] };
E.SHAPES.grill = { about: 'backyard kettle grill', tags: 'backyard', mats: { k: 'iron', l: 'steel' },
  parts: [['ring',3,3,['box','l',[0,0,0],[1,1,10]]], ['lathe','k',[0,0,9],[[0,0],[5,1],[6.5,4],[6.5,6],[0,6]]], ['lathe','k',[0,0,15],[[6.5,0],[5,3],[0,4]]]] };
E.SHAPES.pool = { about: 'small backyard pool', tags: 'backyard', mats: { w: 'water', c: 'marble' },
  parts: [['box','c',[0,0,0],[44,28,2]], ['box','w',[0,0,1.6],[40,24,.8]]] };
E.SHAPES.desk = { about: 'office desk', tags: 'office', mats: { t: 'walnut', m: 'steel' },
  parts: [['box','t',[0,0,10],[28,14,2]], ['mirror','x',['box','t',[12,0,0],[3,13,10]]], ['box','m',[6,0,12],[6,4,4]]] };

/* ---------------- the cast (original characters, each in their own colors) ---------------- */
const RIGS = {
  hollis: (alias = false, gun = false) => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: gun ? 'gun' : null, outfit: alias ? 'coat' : 'shirt', hair: alias ? 'bald' : 'short', sleeves: alias ? 'long' : 'short',
    hat: alias ? { style: 'cap', color: '#161616' } : null, face: { bangs: 0 },
    colors: { skin: '#e2b08c', hair: '#8a7a68', cloth: alias ? '#3a3a3a' : '#b8b07a', coat: '#2a2a2a', pants: alias ? '#3a3632' : '#5a5244', boot: '#3a2c22', belt: '#2a2018', eye: '#2a2a2a', metal: '#3a3a3a' } }),
  dusty: () => new E.Humanoid({ size: 1.25, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'band', color: '#3a3a42' }, sleeves: 'long',
    colors: { skin: '#eac0a0', hair: '#5a4028', cloth: '#d8c040', coat: '#c8452e', pants: '#344466', boot: '#e8e8e8', trim: '#f0f0f0', eye: '#3a5a8a' } }),
  lenny: () => new E.Humanoid({ size: 1.25, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long',
    colors: { skin: '#e8b898', hair: '#4a3020', cloth: '#f0e0a0', coat: '#5a78b8', pants: '#5a78b8', trim: '#e8c040', boot: '#4a2a1a' } }),
  vela: () => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'long',
    colors: { skin: '#9a6a4a', hair: '#1a1410', cloth: '#f2f0e8', pants: '#3a3a40', trim: '#c8a040', boot: '#1a1a1a', eye: '#1a1a1a' } }),
  dale: () => new E.Humanoid({ size: 1.35, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short',
    colors: { skin: '#e0a888', cloth: '#7a8a5a', pants: '#3a3a3a', boot: '#2a1a12', belt: '#5a3a1a' } }),
  skyler: () => new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'long',
    colors: { skin: '#f0c8a8', hair: '#d8b060', cloth: '#5a7a9a', pants: '#3a3040', boot: '#3a2a20' } }),
  rafa: () => new E.Humanoid({ size: 1.3, build: 'bulky', weapon: 'gun', outfit: 'shirt', hair: 'bald', sleeves: 'none',
    colors: { skin: '#b07a52', cloth: '#e8e8e0', pants: '#2a3a5a', trim: '#e8c040', boot: '#1a1a1a', metal: '#c0c0c8' } }),
  mack: () => new E.Humanoid({ size: 1.35, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'bald', sleeves: 'long',
    colors: { skin: '#d8a888', coat: '#6a604e', cloth: '#9a9080', pants: '#4a4438', boot: '#2a2018', metal: '#3a3a3a' } }),
  thug: (i = 0) => new E.Humanoid({ size: 1.25, build: i % 3 === 2 ? 'bulky' : 'heroic', weapon: i % 2 ? 'gun' : null, outfit: 'shirt', hair: i % 3 === 1 ? 'bald' : 'short',
    hat: i % 3 === 0 ? { style: 'band', color: '#e8e8e8' } : null, sleeves: 'none',
    colors: { skin: ['#b07a52', '#8a5a3a', '#c89070'][i % 3], cloth: ['#e8e8e0', '#2a2a2a', '#7a2a2a'][i % 3], pants: ['#3a4a6a', '#5a5040', '#2a2a2a'][i % 3], boot: '#1a1a1a', metal: '#2a2a2a', hair: '#1a1410' } }),
  cousin: (i = 0) => new E.Humanoid({ size: 1.55, build: 'bulky', weapon: 'sword', outfit: 'coat', hair: 'bald', sleeves: 'long', eyeGlow: false,
    colors: { skin: i ? '#a87452' : '#9a6a48', coat: '#8a9098', cloth: '#1a1a1a', pants: '#8a9098', boot: '#3a2a1a', trim: '#e8e0d0', metal: '#d0d4d8', hilt: '#3a2a1a' } }),
  agent: (i = 0) => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, sleeves: 'long',
    colors: { skin: ['#e0b090', '#9a6a4a', '#d8a080'][i % 3], coat: '#24345a', cloth: '#d8d8d0', pants: '#2a2a30', trim: '#e8d040', boot: '#1a1a1a' } }),
  buyer: (i = 0) => new E.Humanoid({ size: 1.2, build: 'chibi', weapon: null, outfit: ['shirt', 'coat', 'tunic'][i % 3], hair: ['spiky', 'long', 'short', 'ponytail'][i % 4], sleeves: 'short',
    colors: { skin: ['#e8c0a0', '#a87452', '#d8a080', '#7a4a32'][i % 4], cloth: ['#6a8a4a', '#8a4a8a', '#c8783a', '#4a6a8a'][i % 4], coat: ['#4a4a4a', '#6a3a2a', '#3a4a3a'][i % 3], pants: '#3a3a4a', hair: ['#2a1a10', '#d8a050', '#5a3a20', '#1a1a1a'][i % 4] } })
};
const PORTRAIT_BG = '#2a1e14';
const SPEAKERS = {};   // name -> { rig, voice }, made once
const speaker = (id) => {
  if (!SPEAKERS[id]) SPEAKERS[id] = { rig: (RIGS[id] || RIGS.thug)(), voice: 'vox_' + (VOICES[id] ? id : 'thug') };
  return SPEAKERS[id];
};

/* small sprites: cash, product, flasks, the heat badge */
const SPR = {
  cash: E.sprite(['.gggggg.', 'gGGGGGGg', 'gGg$$gGg', 'gGGGGGGg', '.gggggg.'], { g: '#2a6a2a', G: '#5ab04a', $: '#e8f0c0' }, 1),
  baggie: E.sprite(['.www.', 'wbbbw', 'wbBbw', 'wbbbw', '.www.'], { w: '#e8f0f8', b: '#58c8f0', B: '#c8f4ff' }, 1),
  flaskF: E.sprite(['..g..', '..g..', '.ggg.', 'gYYYg', 'gYyYg', '.ggg.'], { g: '#c8e0e8', Y: '#f0d040', y: '#fff8b0' }, 1),
  flaskS: E.sprite(['..g..', '..g..', '.ggg.', 'gPPPg', 'gPpPg', '.ggg.'], { g: '#c8e0e8', P: '#a070d0', p: '#e0c8ff' }, 1),
  badge: E.sprite(['.yyy.', 'yYYYy', 'yYrYy', 'yYYYy', '.yyy.'], { y: '#b08a20', Y: '#f0c840', r: '#c83020' }, 1),
  badgeOff: E.sprite(['.ddd.', 'dDDDd', 'dDDDd', 'dDDDd', '.ddd.'], { d: '#3a3430', D: '#5a524a' }, 1),
  heart: E.sprite(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#a02020', R: '#e84a3a' }, 1)
};

// ---- 20-world.js ----
/* ---------------- the world: Las Brujas, New Mexico (a grid of blocks, built as rows for a TileMap) ---------------- */
const T = 16, C = c => c * T + T / 2;   // a cell's centre in world units
const TW = 60, TH = 44;
const ROADH = [10, 24, 36], ROADV = [14, 32, 48];
const BLOCKS = { A: [16, 0, 31, 9], B: [34, 0, 47, 9], C: [50, 0, 59, 9], E: [16, 12, 31, 23], F: [34, 12, 47, 23], G: [50, 12, 59, 23],
  H: [16, 26, 31, 35], I: [34, 26, 47, 35], J: [50, 26, 59, 35], K: [16, 38, 31, 43], M: [34, 38, 47, 43], N: [50, 38, 59, 43] };
const WALLTYPES = {
  1: { h: 30, top: '#a8583a', side: '#d8c8a8', face: 'plaster', roof: 'tiles', cut: true },          // houses: stucco, terracotta
  2: { h: 36, top: '#7a746a', side: '#c8b088', face: 'plaster', roof: 'slab', cut: true },            // commercial: tan stucco, flat roof
  3: { h: 10, top: '#c8b898', side: '#b8a888', face: 'plaster', roof: 'slab' },                       // low adobe wall
  4: { h: 13, top: '#4a6a32', side: '#3a5a2a', face: 'hedge', roof: 'leaves' },                       // hedge
  5: { h: 18, top: '#6a5a4a', side: '#7a5a3a', face: 'rock', roof: 'speckle' },                       // junk heaps
  6: { h: 44, top: '#5a5e62', side: '#8a8e90', face: 'brick', roof: 'slab', cut: true },             // the industrial laundry
  7: { h: 22, top: '#8a7a6a', side: '#7a6a5a', face: 'brick', roof: 'slab' },                        // cinderblock wall
  8: { h: 30, top: '#4a7a9a', side: '#d8e4ec', face: 'plaster', roof: 'slab', cut: true }             // the car wash: white and blue
};
const grid = [], axis = [];
const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < TW && y < TH) grid[y][x] = ch; };
const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch); };
const frame = (x0, y0, x1, y1, ch) => { for (let x = x0; x <= x1; x++) { put(x, y0, ch); put(x, y1, ch); } for (let y = y0; y <= y1; y++) { put(x0, y, ch); put(x1, y, ch); } };
function buildTown() {
  for (let y = 0; y < TH; y++) { grid.push(new Array(TW).fill('.')); axis.push(new Array(TW).fill(null)); }
  // roads: two lanes, a yellow line between them; the west end runs out into the desert as dirt
  for (const r of ROADH) for (let x = 0; x < TW; x++) for (const yy of [r, r + 1]) { put(x, yy, x < 8 ? '_' : '='); axis[yy][x] = 'h' + (r + 1) * T; }
  for (const c of ROADV) for (let y = 0; y < TH; y++) for (const xx of [c, c + 1]) { const cross = grid[y][xx] === '='; put(xx, y, '='); axis[y][xx] = cross ? 'x' : 'v' + (c + 1) * T; }
  for (const k in BLOCKS) { const [x0, y0, x1, y1] = BLOCKS[k]; rect(x0, y0, x1, y1, ','); frame(x0, y0, x1, y1, '-'); }
  // A: the Gray residence, the backyard and its RV, the pool
  rect(17, 1, 22, 8, ','); rect(20, 2, 22, 7, 'p');
  for (let y = 1; y <= 8; y++) put(17, y, 'W'); for (let x = 17; x <= 22; x++) { put(x, 1, 'W'); if (x !== 19 && x !== 20) put(x, 8, 'W'); }
  rect(23, 2, 27, 6, '#'); rect(23, 7, 27, 7, 'p'); rect(28, 2, 30, 7, ',');
  // B: the neighbours
  rect(35, 2, 39, 6, '#'); rect(42, 2, 46, 6, '#'); for (let x = 40; x <= 41; x++) for (let y = 1; y <= 7; y++) put(x, y, y % 3 === 0 ? 'H' : ',');
  // C: the junkyard
  rect(51, 1, 58, 8, '_'); for (let x = 51; x <= 58; x++) { put(x, 1, 'K'); if (x < 53 || x > 55) put(x, 8, 'K'); } for (let y = 1; y <= 8; y++) { put(51, y, 'K'); put(58, y, 'K'); }
  for (const [x, y] of [[53, 3], [56, 3], [57, 4], [53, 6], [56, 6]]) put(x, y, 'J');
  // D: the desert (west): a few rock outcrops
  for (const [x, y] of [[3, 4], [4, 4], [9, 15], [2, 30], [3, 30], [10, 39]]) put(x, y, 'J');
  // E: the strip mall (a lawyer, a taco franchise) and its lot
  rect(17, 13, 30, 16, 'B'); rect(17, 17, 30, 17, '-'); rect(17, 18, 30, 22, ':');
  // F: Bubble Bros Car Wash
  rect(36, 13, 44, 15, 'C'); rect(35, 16, 46, 22, ':'); rect(35, 13, 35, 16, ':'); rect(45, 13, 46, 16, ':');
  // G: the park
  for (const [x, y] of [[52, 14], [57, 15], [52, 21], [57, 20]]) put(x, y, 'H');
  // H: houses
  rect(17, 27, 21, 31, '#'); rect(25, 27, 30, 31, '#'); rect(17, 32, 21, 33, 'p'); rect(25, 32, 30, 33, 'p');
  // I: Lavanderia Brillante, the industrial laundry
  rect(35, 27, 46, 32, 'L'); rect(35, 33, 46, 34, ':');
  // J: the Sunset Inn motel
  rect(51, 27, 58, 29, 'B'); rect(51, 30, 58, 34, ':');
  // K, M, N: the south side
  rect(18, 39, 22, 42, '#'); rect(25, 39, 29, 42, '#'); rect(36, 39, 40, 42, '#'); rect(52, 39, 57, 41, '#');
  return grid.map(r => r.join(''));
}
const TOWN_ROWS = buildTown();
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shadeC = (c, k) => [clamp(c[0] + k, 0, 255), clamp(c[1] + k, 0, 255), clamp(c[2] + k, 0, 255)];
function floorTex(x, y, tag) {
  const xi = Math.floor(x), yi = Math.floor(y), h = hash(xi, yi), n = E.noise2(x / 23, y / 23) * 10;
  const cx = Math.floor(x / T), cy = Math.floor(y / T);
  switch (tag) {
    case 'road': {
      const a = axis[cy] && axis[cy][cx];
      if (a && a[0] === 'h') { const line = +a.slice(1); if (Math.abs(y - line) < 1 && (xi % 24) < 12) return [222, 184, 60]; }
      if (a && a[0] === 'v') { const line = +a.slice(1); if (Math.abs(x - line) < 1 && (yi % 24) < 12) return [222, 184, 60]; }
      return shadeC([62, 60, 64], (h - .5) * 14 + n * .4);
    }
    case 'walk': return (xi % T === 0 || yi % T === 0) ? [118, 114, 108] : shadeC([156, 150, 140], (h - .5) * 10 + n * .3);
    case 'lot': return ((xi % 32) < 1 && (yi % 64) > 6 && (yi % 64) < 40) ? [214, 214, 206] : shadeC([76, 74, 76], (h - .5) * 12 + n * .4);
    case 'grass': return shadeC(h > .93 ? [150, 150, 80] : [104, 124, 62], n + (h - .5) * 16);
    case 'dirt': return shadeC([142, 108, 74], n + (h - .5) * 18 + (h > .97 ? -30 : 0));
    case 'patio': return (xi % 8 === 0 || yi % 8 === 0) ? [140, 98, 72] : shadeC([186, 128, 92], (h - .5) * 10);
    case 'lino': return (((xi >> 3) + (yi >> 3)) & 1) ? shadeC([196, 196, 188], (h - .5) * 6) : shadeC([92, 104, 110], (h - .5) * 6);
    case 'epoxy': return (xi % 32 === 0 || yi % 32 === 0) ? [60, 72, 70] : shadeC([96, 116, 112], n * .5 + (h - .5) * 8);
    default: return shadeC(h > .985 ? [120, 96, 70] : [200, 162, 112], n * 1.2 + (h - .5) * 16);   // sand
  }
}
const FLOORS = { '.': 'sand', ',': 'grass', '=': 'road', '-': 'walk', ':': 'lot', '_': 'dirt', p: 'patio', f: 'lino', e: 'epoxy' };
const LEGEND = { '#': 1, B: 2, W: 3, H: 4, J: 5, L: 6, K: 7, C: 8 };
for (const ch in FLOORS) LEGEND[ch] = { floor: FLOORS[ch] };
const town = new E.TileMap({ rows: TOWN_ROWS, legend: LEGEND, types: WALLTYPES, floorTex, ao: 4, outside: '#c8a270' });

/* set dressing: solid shapes (bodies stop at them), props (lamps, cacti, palms) */
const DECOR = [];     // [kind, id, x, y, opts]
const SOLIDS = [];
const solid = (id, x, y, o = {}) => { SOLIDS.push([id, x, y, o]); town.solid(id, x, y, 0, o); };
const prop = (id, x, y, o = {}) => DECOR.push(['prop', id, x, y, o]);
const shape = (id, x, y, o = {}) => DECOR.push(['shape', id, x, y, o]);
(function dress() {
  // the RV in the backyard, the grill; the family sedan in the drive; the pool
  solid('rv', C(19) - 8, C(4) + 4, { facing: Math.PI / 2 }); solid('grill', C(20), C(2) + 2);
  solid('sedan', C(29), C(9) - 2, { facing: Math.PI / 2, mats: { b: 'carwhite' } });
  shape('pool', C(29) - 2, C(4) + 2, { shadow: false }); shape('table', C(22) + 2, C(3), { facing: Math.PI / 2 }); shape('chair', C(22) + 2, C(2) - 2, { facing: Math.PI / 2 });
  // streetlamps along every sidewalk
  for (const k in BLOCKS) { const [x0, y0, x1, y1] = BLOCKS[k]; for (let x = x0 + 2; x < x1; x += 6) { if (y1 < TH - 1) prop('streetlamp', C(x), C(y1) + 6, {}); } }
  for (const c of ROADV) for (let y = 3; y < TH; y += 8) prop('streetlamp', C(c - 1) + 4, C(y), {});
  // the desert: cacti, rocks, a burned-out car
  const dr = E.rng(11);
  for (let i = 0; i < 38; i++) { const x = 8 + dr() * 190, y = 8 + dr() * (TH * T - 16); const cy = Math.floor(y / T); if (ROADH.some(r => cy >= r - 1 && cy <= r + 2)) continue; prop(dr() < .65 ? 'cactus' : dr() < .5 ? 'rock' : 'grass', x, y, { size: .9 + dr() * .5 }); }
  solid('pickup', C(5), C(18), { facing: 1.1, mats: { b: 'rusted' } });
  // the junkyard: wrecks, drums, crates, a fire barrel
  solid('pickup', C(54) + 4, C(2) + 8, { facing: .2, mats: { b: 'rusted' } }); solid('sedan', C(57) - 4, C(6), { facing: 2.6, mats: { b: 'rusted' } });
  for (const [x, y] of [[52, 5], [55, 4], [52, 7]]) solid('barrel', C(x), C(y), { facing: x });
  solid('crate', C(56), C(7) - 4, { facing: .3 }); prop('firedrum', C(55), C(6) + 4, { light: true });
  // the strip mall: palms, a dumpster round the back, cars in the lot, awnings
  for (const x of [17, 23, 30]) prop('palm', C(x), C(17) + 10, { size: 1.2 });
  solid('dumpster', C(31) - 2, C(12) + 10, { facing: Math.PI / 2 }); solid('sedan', C(19), C(20), { facing: Math.PI / 2, mats: { b: 'carred' } });
  solid('sedan', C(25), C(20), { facing: -Math.PI / 2, mats: { b: 'caryellow' } }); solid('pickup', C(28) + 4, C(21), { facing: Math.PI / 2 });
  // the car wash: a car mid-wash, cones, a bubbly sign
  solid('sedan', C(40), C(19), { facing: 0, mats: { b: 'carblue' } }); solid('vending', C(45), C(17), { facing: Math.PI / 2 });
  for (const x of [36, 43]) prop('trashcan', C(x), C(17) + 2, {});
  // the park: trees, benches, flowers
  for (const [x, y] of [[54, 14], [55, 21], [51, 17], [58, 18]]) prop('tree', C(x), C(y), { size: 1.2 });
  solid('bench', C(54), C(16), { facing: Math.PI / 2 }); solid('bench', C(56), C(19), { facing: -Math.PI / 2 });
  for (const [x, y] of [[53, 19], [56, 13], [51, 21]]) prop('flowers', C(x), C(y), {});
  // houses: mailboxes, hydrants, bushes
  for (const [x, y] of [[23, 34], [27, 34], [20, 43], [27, 43], [38, 43], [35, 8], [44, 8]]) solid('mailbox', C(x), C(y) - 6, {});
  for (const [x, y] of [[16, 11], [33, 23], [47, 26], [31, 37], [49, 9]]) prop('hydrant', C(x) + 4, C(y) - 4, {});
  for (const [x, y] of [[22, 32], [24, 32], [34, 7], [47, 7], [17, 42], [30, 40]]) prop('bush', C(x), C(y), {});
  // the laundry: drums and crates along its lot, a forklift-yellow pickup
  for (const [x, y] of [[35, 34], [46, 34]]) solid('drum', C(x), C(y), {});
  solid('crate', C(44), C(34), { facing: .1 }); solid('pickup', C(37), C(34) + 2, { facing: 0, mats: { b: 'caryellow' } });
  // the motel: vending, cars
  solid('vending', C(51), C(30), { facing: Math.PI / 2 }); solid('sedan', C(55), C(32), { facing: Math.PI / 2, mats: { b: 'cargreen' } });
  // parked cars along the roads
  solid('sedan', C(15) + 2, C(30), { facing: Math.PI / 2, mats: { b: 'carred' } }); solid('sedan', C(33) + 2, C(5), { facing: -Math.PI / 2 });
  solid('pickup', C(48) - 2, C(40), { facing: Math.PI / 2 });
})();
// the signs: drawn in the world over each business
const SIGNS = [
  [C(20) + 2, C(16) + 8, 44, 'LENNY SHAPIRO, ESQ.', '#f0e0a0'], [C(20) + 2, C(16) + 8, 36, 'YOU NEED LENNY!', '#e8c040'],
  [C(27), C(16) + 8, 44, 'TACO TRANQUILO', '#ff9a4a'], [C(27), C(16) + 8, 36, 'calm food, fast', '#f0d8b0'],
  [C(40), C(15) + 8, 40, 'BUBBLE BROS CAR WASH', '#c8f0ff'], [C(40) + 8, C(32) + 8, 50, 'LAVANDERIA BRILLANTE', '#e8e8f0'],
  [C(55), C(29) + 8, 42, 'SUNSET INN', '#ff7a5a'], [C(55), C(1) + 4, 26, 'RAFA\'S SALVAGE', '#e8c070'], [C(25), C(6) + 8, 36, '308 PIEDRA LANE', '#f0e8d8']
];

/* where things are: interaction points, buyers' corners, the DEA's beats */
const SPOT = {
  rv: { x: C(19) - 8, y: C(6) + 10 }, dusty: { x: C(21), y: C(7) }, home: { x: C(25), y: C(7) + 6 }, skyler: { x: C(24), y: C(8) },
  lenny: { x: C(20), y: C(17) + 2 }, taco: { x: C(27), y: C(17) + 2 }, back: { x: C(31) + 2, y: C(14) }, carwash: { x: C(38), y: C(16) + 4 },
  laundry: { x: C(40) + 8, y: C(33) + 2 }, rafa: { x: C(55), y: C(5) }, junkgate: { x: C(54), y: C(9) },
  heroStart: { x: C(21), y: C(5) }, arena: { x: C(40), y: C(20) }
};
const BUYER_SPOTS = [[54, 17], [23.5, 33], [52.5, 33], [10, 22], [44, 40.5], [31, 26.5], [12, 12.5]].map(([x, y], i) => ({ i, x: x * T + 8, y: y * T + 8 }));
const BEATS = [
  [[16, 12], [31, 12], [47, 12], [47, 23], [31, 23], [16, 23]],
  [[16, 26], [33, 26], [47, 26], [47, 35], [16, 35]],
  [[50, 12], [59, 12], [59, 35], [50, 35], [50, 24]],
  [[15, 0], [15, 43], [33, 43], [33, 0]].map(([x, y]) => [x, clamp(y, 1, 42)])
].map(b => new E.Path(b.map(([x, y]) => [C(x), C(y), 0]), { closed: true }));

/* ---------------- the superlab, under the laundry: steel, tanks, the office ---------------- */
const LAB_ROWS = [
  '################################',
  '#WWWWWWWWWWW#OOOOOO#WWWWWWWWWWW#',
  '#eeeeeeeeeee#ffffff#eeeeeeeeeee#',
  '#eeeeeeeeeee#ffffff#eeeeeeeeeee#',
  '#eeeeeeeeeee##ff####eeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeee##eeeeeeeeeeeeeeeeee##eeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '#eeeeeeeeeeeeeeeeeeeeeeeeeeeeee#',
  '##############eeee##############'
];
const lab = new E.TileMap({ rows: LAB_ROWS, legend: { '#': 1, W: 2, O: 3, e: { floor: 'epoxy' }, f: { floor: 'lino' } },
  types: { 1: { h: 40, top: '#3a3e42', side: '#6a7276', face: 'brick', roof: 'slab', cut: true }, 2: { h: 24, top: '#8a9296', side: '#a8b0b4', face: 'plank', roof: 'slab' }, 3: { h: 26, top: '#5a4a3a', side: '#8a7a64', face: 'timber', roof: 'slab' } },
  floorTex, ao: 6, outside: '#141618' });
const LAB_SOLIDS = [];
(function dressLab() {
  const s = (id, x, y, o = {}) => { LAB_SOLIDS.push([id, x, y, o]); lab.solid(id, x, y, 0, o); };
  for (const [x, y] of [[3, 3], [7, 3], [24, 3], [28, 3]]) s('tank', C(x), C(y), {});
  for (const [x, y] of [[10, 7], [21, 7], [10, 15], [21, 15]]) s('labtable', C(x), C(y), { facing: Math.PI / 2 });
  for (const [x, y] of [[14, 10], [17, 12], [3, 11], [28, 11], [14, 16], [17, 16]]) s('drum', C(x), C(y), {});
  s('desk', C(17), C(2) + 2, { facing: -Math.PI / 2 });
})();
const LAB_SPOT = { start: { x: C(15) + 8, y: C(16) }, vela: { x: C(17), y: C(3) + 2 }, mack: { x: C(15) + 8, y: C(6) }, office: { x: C(15) + 8, y: C(4) + 4 } };

// ---- 30-actors.js ----
/* ---------------- the run's state (what a save holds) ---------------- */
const NEW_STATE = () => ({ ep: 1, step: 0, day: 1, clock: 9, hp: 100, dirty: 0, clean: 0, product: 0, purity: 0, heat: 0,
  flasks: { fulm: 2, smoke: 0 }, sel: 'fulm', up: {}, alias: false, cooks: 0, best: 0, deals: 0, epDeals: 0, earned: 0, kos: 0, busts: 0, time: 0, flags: {} });
let S = NEW_STATE();
const FLASK_MAX = { fulm: 3, smoke: 3 };
const UPGRADES = [
  { id: 'glass', name: 'Lab-grade glassware', cost: 1500, text: 'Wider timing windows in the cook. +3% purity.' },
  { id: 'pistol', name: 'A pistol. No questions.', cost: 2000, text: 'Your attack shoots instead of punching.' },
  { id: 'vest', name: 'Kevlar vest', cost: 1800, text: 'Take a third less damage.' },
  { id: 'reactor', name: 'Bigger reaction vessel', cost: 2500, text: 'Each cook yields 4 more pounds.' },
  { id: 'phone', name: 'Burner phone network', cost: 1200, text: 'DEA agents show on your radar. Buyers pay 10% more.' },
  { id: 'salon', name: 'A nail salon front', cost: 3000, text: 'Launder at 95 cents on the dollar instead of 80.' },
  { id: 'cover', name: 'A cover story', cost: 1000, text: 'Heat drops by half. Can be bought again.', repeat: true }
];
const purityColor = p => p >= 96 ? '#7ae0ff' : p >= 90 ? '#58b8f0' : p >= 80 ? '#9ac0d0' : '#c8c0a8';
const launderRate = () => S.up.salon ? .95 : .8;

/* ---------------- the level in play: one of these per scene (the town, the superlab, the hub's town) ---------------- */
let W = null;
function newLevel(kind, map) {
  W = { kind, map, enemies: [], agents: [], buyers: [], npcs: [], flasks: [], clouds: [], heroes: [], hero: null, partner: null,
    shots: new E.Bullets(game, { plane: 'ground' }), combat: false, lock: null, t: 0, demo: false, onClear: null, dead: false, ghosts: new Map() };
  return W;
}

/* ---------------- heroes: Hollis (player 1) and Dusty (player 2, or the AI partner) ---------------- */
function makeHero(who, x, y, input) {
  const b = new E.Body({ x, y, r: 5 });
  Object.assign(b, { kind: 'hero', who, input, facing: Math.PI / 2, hp: who === 'hollis' ? S.hp : 100, maxHp: 100, iT: 0, hurtT: 0, dodgeT: 0, dodgeCd: 0, dodgeDir: 0,
    cool: 0, throwCd: 0, ammo: 8, reload: 0, down: false, downT: 0, ai: !input, team: 'player', aim: Math.PI / 2, aiming: 0, combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }),
    ctl: blankCtl() });
  b.rig = who === 'hollis' ? RIGS.hollis(S.alias, !!S.up.pistol) : RIGS.dusty();
  b.gun = who === 'hollis' ? !!S.up.pistol : true;
  return b;
}
const refreshHeroRig = h => { if (h && h.who === 'hollis') { h.rig = RIGS.hollis(S.alias, !!S.up.pistol); h.gun = !!S.up.pistol; } };
function blankCtl() { return { mx: 0, my: 0, aim: null, aimPt: null, attack: false, attackHeld: false, throw: false, cycle: false, dodge: false, sprint: false, interact: false }; }
function readCtl(inp, h) {
  const c = h.ctl, m = inp.move(), d = game.view.screenDirToGround(m[0], m[1]);
  c.mx = d[0]; c.my = d[1]; c.aim = null; c.aimPt = null;
  if (inp === I && I.aimSource === 'mouse') { const g = game.mouseGround(); if (g) { c.aimPt = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y }; c.aim = Math.atan2(c.aimPt.y - h.y, c.aimPt.x - h.x); } }
  else if (inp.padAim) { const a = game.view.screenDirToGround(inp.padAim[0], inp.padAim[1]); if (Math.hypot(a[0], a[1]) > .2) c.aim = Math.atan2(a[1], a[0]); }
  c.attack = inp.pressed('attack'); c.attackHeld = inp.down('attack'); c.throw = inp.pressed('throw'); c.cycle = inp.pressed('cycle');
  c.dodge = inp.pressed('dodge'); c.sprint = inp.down('sprint'); c.interact = inp.pressed('interact');
  return c;
}
const nearestEnemy = (from, range = 9999) => { let best = null, bd = range; for (const e of W.enemies) { if (e.dead) continue; const d = dist(from, e); if (d < bd) { bd = d; best = e; } } return best; };
const autoAim = (h, a) => {   // a pad's aim snaps toward the nearest foe within a narrow cone (aim assist)
  if (I.aimSource === 'mouse' && h === W.hero) return a;
  let best = a, bd = .5;
  for (const e of W.enemies) { if (e.dead || dist(h, e) > 170) continue; const da = Math.abs(E.angDiff(a, angTo(h, e))); if (da < bd) { bd = da; best = angTo(h, e); } }
  return best;
};
function heroUpdate(h, dt) {
  const c = h.ctl;
  h.iT = Math.max(0, h.iT - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.dodgeCd = Math.max(0, h.dodgeCd - dt); h.cool = Math.max(0, h.cool - dt); h.throwCd = Math.max(0, h.throwCd - dt);
  if (h.reload > 0) { h.reload -= dt; if (h.reload <= 0) { h.ammo = 8; A.sfx('tick', { pitch: .7 }); } }
  if (h.down) {
    h.vx = h.vy = 0; h.update(dt, W.map); h.downT -= dt;
    if (h.downT <= 0) { h.down = false; h.hp = h.maxHp * .5; h.iT = 1.5; P.glints(h.x, h.y, 20, 8, '#ffffff'); }
    h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, down: 1 });
    return;
  }
  const mv = Math.hypot(c.mx, c.my);
  if (c.dodge && h.dodgeCd <= 0) { h.dodgeT = .32; h.dodgeCd = .55; h.iT = Math.max(h.iT, .36); h.dodgeDir = mv > .2 ? Math.atan2(c.my, c.mx) : h.facing; A.sfx('whoosh'); P.dust(h.x, h.y, 0, 5); }
  let sp = c.sprint ? 128 : 82;
  if (h.combo.busy) sp *= .35;
  if (h.dodgeT > 0) { h.dodgeT -= dt; h.vx = Math.cos(h.dodgeDir) * 235; h.vy = Math.sin(h.dodgeDir) * 235; }
  else { h.vx = c.mx * sp; h.vy = c.my * sp; }
  if (h.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, W.map);
  if (c.aim !== null) h.aim = c.aim; else if (mv > .2) h.aim = Math.atan2(c.my, c.mx);
  h.aiming = Math.max(0, h.aiming - dt);
  if (h.aiming > 0 || c.aim !== null && (c.attackHeld || I.aimSource === 'mouse' && W.combat)) h.facing = h.aim;
  else if (mv > .2 && h.dodgeT <= 0) h.facing = Math.atan2(c.my, c.mx);
  // attack: shoot (with a gun) or a three-hit punch chain
  if (c.attack && h.dodgeT <= 0) {
    if (h.gun) {
      if (h.cool <= 0 && h.reload <= 0) {
        const a = autoAim(h, h.aim); h.facing = a; h.aiming = .6;
        const hx = h.x + Math.cos(a) * 10, hy = h.y + Math.sin(a) * 10;
        W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 2, team: 'player', dmg: h.who === 'hollis' ? 20 : 14, color: '#ffe080', life: .9 });
        A.sfx('gun'); P.sparks(hx, hy, 18, 3, a); h.cool = .26; h.ammo--; if (h.ammo <= 0) h.reload = 1.1;
        if (W.kind === 'town') heatAdd(.6);
      }
    } else if (h.combo.press()) { const a = autoAim(h, h.aim); h.facing = a; A.sfx('swing'); }
  }
  h.combo.update(dt);
  h.combo.hits(W.enemies.filter(e => !e.dead), e => E.inArc(h, h.facing, e, 24, 1.1), e => {
    hurtEnemy(e, h.combo.step === 2 ? 18 : 11, h.facing, h.combo.step === 2 ? 200 : 110);
  });
  // throw the selected flask in an arc to the aim point (the mouse), or ahead along the aim
  if (c.cycle) { if (S.flags.smoke) { S.sel = S.sel === 'fulm' ? 'smoke' : 'fulm'; A.sfx('select'); } else A.sfx('bump'); }
  if (c.throw && h.throwCd <= 0) {
    const k = S.sel;
    if (S.flasks[k] > 0 || W.demo) {
      let to = c.aimPt;
      const a = autoAim(h, h.aim);
      if (!to || dist(h, to) > 140) { const dd = to ? Math.min(140, dist(h, to)) : 80; const aa = to ? Math.atan2(to.y - h.y, to.x - h.x) : a; to = { x: h.x + Math.cos(aa) * dd, y: h.y + Math.sin(aa) * dd }; }
      throwFlask(h, to, k); h.throwCd = .5; h.facing = Math.atan2(to.y - h.y, to.x - h.x);
      if (!W.demo) S.flasks[k]--;
    } else { A.sfx('bump'); toast(k === 'fulm' ? 'Out of fulminate. Refill at the RV.' : 'Out of smoke flasks. Refill at the RV.'); }
  }
  h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, hurt: h.hurtT > 0, point: h.gun && h.aiming > 0, attack: h.combo.state,
    flip: h.dodgeT > 0 ? 1 - h.dodgeT / .32 : 0, sprint: c.sprint && mv > .2 });
}
function hurtHero(h, dmg, ang, push = 120) {
  if (!h || h.down || h.iT > 0) return false;
  if (W.demo && h === W.hero) dmg = 0;
  if (h.ai) return false;                                   // the AI partner shrugs it off (it can't be revived by a person)
  const k = DIFF().dmg * (h.who === 'hollis' && S.up.vest ? .66 : 1);
  h.hp -= dmg * k; h.iT = .45; h.hurtT = .25;
  E.knockback({ x: h.x - Math.cos(ang), y: h.y - Math.sin(ang) }, h, push);
  game.hitFx(h.x, h.y, 16, { power: .5, angle: ang, damage: Math.round(dmg * k), color: '#ff6a5a', sound: 'hurt' });
  if (h === W.hero) { game.flash('#ff3020', .06, .35); I.rumble(.5, .15); }
  if (h.hp <= 0) {
    h.hp = 0; h.down = true; h.downT = 8;
    if (h === W.hero) { log('dead', W.kind); W.dead = true; game.after(1.2, () => game.go('dead', { from: W.kind })); }
  }
  return true;
}

/* ---------------- flasks: fulminated mercury (a blast) and a purple smoke (a blind) ---------------- */
function throwFlask(h, to, kind) {
  const from = { x: h.x, y: h.y, z: 22 };
  const v = E.arc(from, { x: to.x, y: to.y, z: 0 }, 520, { apex: 22 });
  W.flasks.push({ x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, kind, spin: 0, owner: h });
  A.sfx('whoosh', { pitch: 1.3 });
}
function flasksUpdate(dt) {
  for (const f of W.flasks) {
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 520 * dt; f.spin += dt * 14;
    const hitWall = W.map.heightAt(f.x, f.y) > f.z;
    if (f.z <= 0 || hitWall) { f.done = true; burst(f.x, f.y, f.kind); }
  }
  E.prune(W.flasks, f => f.done);
  for (const c of W.clouds) { c.t -= dt; if (game.time % .08 < dt) P.smoke(c.x + E.rand(-c.r, c.r) * .7, c.y + E.rand(-c.r, c.r) * .7, 4, 2, { size: 2.2, color: '#9a78c0' }); }
  E.prune(W.clouds, c => c.t <= 0);
}
function burst(x, y, kind) {
  A.sfx('glass');
  if (kind === 'fulm') {
    P.explosion(x, y, 2, 1.25); game.shake(4); A.sfx('boom'); I.rumble(.7, .25);
    for (const e of W.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < 42) hurtEnemy(e, 60 * (1 - d / 70), Math.atan2(e.y - y, e.x - x), 260); }
    for (const a of W.agents) { const d = Math.hypot(a.x - x, a.y - y); if (d < 52) { a.stun = 3.5; a.sus.reset(); heatAdd(14); } }
    if (W.kind === 'town') heatAdd(5);
    log('blast', [Math.round(x), Math.round(y)]);
  } else {
    W.clouds.push({ x, y, r: 46, t: 6.5 }); A.sfx('hiss');
    P.smoke(x, y, 6, 16, { size: 3, color: '#a080d0' });
    log('smoke', [Math.round(x), Math.round(y)]);
  }
}
const inSmoke = o => W.clouds.some(c => Math.hypot(o.x - c.x, o.y - c.y) < c.r);

/* ---------------- enemies: Rafa's crew, the cousins, Mack ---------------- */
let enemyN = 0;
function makeEnemy(kind, x, y, o = {}) {
  const e = new E.Body({ x, y, r: kind === 'cousin' ? 7 : 5 });
  const hp = { thug: 40, gunner: 34, cousin: 230, mack: 300 }[kind];
  Object.assign(e, { kind, hp, maxHp: hp, facing: Math.PI / 2, t: E.rand(0, 1), cd: E.rand(.8, 1.6), state: 'idle', stun: 0, hurtT: 0, dead: false, deadT: 0, boss: kind === 'cousin' || kind === 'mack',
    team: 'enemy', windT: 0, atk: null, name: o.name || '', strafe: E.chance(.5) ? 1 : -1, n: enemyN++ });
  e.rig = kind === 'cousin' ? RIGS.cousin(o.i || 0) : kind === 'mack' ? RIGS.mack() : RIGS.thug(kind === 'gunner' ? 1 + (e.n % 2) * 2 : e.n % 3 === 1 ? 2 : 0);
  if (kind === 'thug') e.atk = new E.Attack('hook');
  if (kind === 'cousin') { e.atk = new E.Attack('overhead'); e.charge = 0; e.chargeDir = 0; }
  W.enemies.push(e);
  return e;
}
function hurtEnemy(e, dmg, ang, push = 140) {
  if (e.dead) return;
  const k = e.stun > 0 && e.kind === 'cousin' ? 1.6 : 1;
  e.hp -= dmg * k; e.hurtT = .2;
  if (!e.boss || e.stun <= 0) E.knockback({ x: e.x - Math.cos(ang), y: e.y - Math.sin(ang) }, e, e.boss ? push * .3 : push);
  game.hitFx(e.x, e.y, 18, { power: Math.min(1, dmg / 30), angle: ang, damage: Math.round(dmg * k) });
  if (!e.boss && e.state !== 'wind') e.cd = Math.max(e.cd, .35);
  if (e.hp <= 0) { e.dead = true; e.deadT = 0; S.kos++; A.sfx('die'); P.bits(e.x, e.y, 14, 8, ['#a02020', '#3a2a2a']); log('ko', e.kind); }
}
const targetHero = e => { let best = null, bd = 1e9; for (const h of W.heroes) { if (!h || h.down) continue; const d = dist(e, h); if (d < bd) { bd = d; best = h; } } return best; };
function enemyUpdate(e, dt) {
  e.hurtT = Math.max(0, e.hurtT - dt);
  if (e.dead) { e.deadT += dt; e.vx *= .9; e.vy *= .9; e.update(dt, W.map); e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing, down: Math.min(1, e.deadT * 2) }); return; }
  const tgt = targetHero(e);
  e.cd -= dt; e.t += dt;
  const smoked = inSmoke(e);
  if (smoked && !e.boss) e.stun = Math.max(e.stun, .3);
  if (e.stun > 0) {
    e.stun -= dt; e.vx *= .85; e.vy *= .85; e.update(dt, W.map); e.state = 'stun';
    e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing + Math.sin(e.t * 9) * .4, hurt: true, pose: 'kneel' });
    if (smoked && game.time % .5 < dt) P.text(e.x, e.y, 34, '*cough*', '#d8c8f0', { scale: 1 });
    return;
  }
  if (!tgt) { e.vx = e.vy = 0; e.update(dt, W.map); e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, facing: e.facing, pose: 'hips' }); return; }
  const d = dist(e, tgt), a = angTo(e, tgt);
  let mvx = 0, mvy = 0, sp = 0, point = false;
  if (e.kind === 'gunner' || e.kind === 'mack') {
    // keep a range, strafe, wind up (a red line), fire
    const want = e.kind === 'mack' ? 90 : 80;
    if (e.state === 'wind') {
      e.windT -= dt; e.facing = a; point = true;
      if (e.windT <= 0) {
        e.state = 'idle'; e.cd = e.kind === 'mack' ? E.rand(1.3, 1.8) : E.rand(1.5, 2.3);
        const hx = e.x + Math.cos(e.facing) * 10, hy = e.y + Math.sin(e.facing) * 10;
        if (e.kind === 'mack') { for (let i = -2; i <= 2; i++) { const aa = e.facing + i * .13; W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(aa) * 150, vy: Math.sin(aa) * 150, r: 2, team: 'enemy', dmg: 7, color: '#ff9050', life: .9 }); } A.sfx('shotgun'); game.shake(2); }
        else { W.shots.fire({ x: hx, y: hy, z: 18, vx: Math.cos(e.facing) * 125, vy: Math.sin(e.facing) * 125, r: 2, team: 'enemy', dmg: 9, color: '#ff6040', life: 1.6 }); A.sfx('gun', { pitch: .8 }); }
        P.sparks(hx, hy, 18, 3, e.facing);
      }
    } else {
      sp = 44; e.facing = a;
      if (d > want + 25) { mvx = Math.cos(a); mvy = Math.sin(a); }
      else if (d < want - 30) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
      else { mvx = Math.cos(a + Math.PI / 2 * e.strafe) * .7; mvy = Math.sin(a + Math.PI / 2 * e.strafe) * .7; if (e.hitWall) e.strafe *= -1; }
      if (e.cd <= 0 && d < 190 && W.map.sight(e, tgt)) { e.state = 'wind'; e.windT = e.kind === 'mack' ? .55 : .5; A.sfx('charge', { vol: .4 }); }
      if (e.kind === 'mack' && !e.called && e.hp < e.maxHp * .5) { e.called = true; spawnAdds(2); W.say && W.say('mack_adds'); }
    }
  } else if (e.kind === 'thug') {
    if (e.atk.busy) { sp = 0; }
    else if (d > 15) { sp = 58; mvx = Math.cos(a); mvy = Math.sin(a); e.facing = a; }
    else if (e.cd <= 0) { e.atk.start(); e.cd = E.rand(1, 1.6); e.facing = a; }
    e.atk.update(dt);
    e.atk.hits([tgt], h => E.inArc(e, e.facing, h, 20, 1), h => hurtHero(h, 12, e.facing, 160));
  } else if (e.kind === 'cousin') {
    // stalk, an overhead chop with a long wind-up, or a charge along a telegraphed line; a charge into a wall stuns
    if (e.state === 'charge-wind') { e.windT -= dt; e.facing = e.chargeDir; if (e.windT <= 0) { e.state = 'charge'; e.charge = .7; A.sfx('whoosh', { pitch: .6 }); } }
    else if (e.state === 'charge') {
      e.charge -= dt; sp = 0;
      e.vx = Math.cos(e.chargeDir) * 250; e.vy = Math.sin(e.chargeDir) * 250; e.update(dt, W.map);
      if (game.time % .05 < dt) P.dust(e.x, e.y, 0, 2);
      for (const h of W.heroes) if (h && !h.down && dist(e, h) < 14) hurtHero(h, 22, e.chargeDir, 260);
      if (e.hitWall) { e.state = 'idle'; e.stun = 1.8; game.shake(5); A.sfx('stomp'); P.explosion(e.x, e.y, 14, .4, { debris: true, freeze: false, shake: 0 }); toastOnce('stun', 'Stunned! Hit them now for extra damage.'); }
      else if (e.charge <= 0) { e.state = 'idle'; e.cd = 1.2; }
      e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.facing, sprint: true, stance: 'ready' });
      return;
    } else if (e.atk.busy) { sp = 0; }
    else {
      sp = 40; e.facing = a; mvx = Math.cos(a); mvy = Math.sin(a);
      const turn = W.enemies.filter(o => o.kind === 'cousin' && !o.dead);
      const myTurn = turn.length < 2 || (Math.floor(W.t / 4) % 2) === turn.indexOf(e);
      if (e.cd <= 0 && myTurn) {
        if (d < 26) { e.atk.start(); e.cd = E.rand(1.4, 2); A.sfx('charge', { pitch: .5 }); }
        else if (d > 60 && d < 200) { e.state = 'charge-wind'; e.windT = .8; e.chargeDir = a; e.cd = E.rand(2.5, 3.5); A.sfx('alarm', { pitch: .5 }); }
      }
      if (!myTurn && d < 70) { mvx = -mvx * .5; mvy = -mvy * .5; }
    }
    e.atk.update(dt);
    e.atk.hits([tgt], h => E.inArc(e, e.facing, h, 30, 1.2), h => { hurtHero(h, 24, e.facing, 240); game.shake(3); });
  }
  if (sp) { e.vx = mvx * sp; e.vy = mvy * sp; } else { e.vx *= .8; e.vy *= .8; }
  // keep apart from each other
  for (const o of W.enemies) if (o !== e && !o.dead) { const dd = dist(e, o); if (dd < 14 && dd > .01) { e.vx += (e.x - o.x) / dd * 30; e.vy += (e.y - o.y) / dd * 30; } }
  e.update(dt, W.map);
  e.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.facing, hurt: e.hurtT > 0, point, attack: e.atk ? e.atk.state : null, stance: e.kind === 'thug' ? 'guard' : e.kind === 'cousin' ? 'ready' : undefined });
}
function spawnAdds(n) {
  const at = W.kind === 'lab' ? [[C(4), C(6)], [C(27), C(6)], [C(4), C(16)], [C(27), C(16)]] : [[W.hero.x - 120, W.hero.y - 60], [W.hero.x + 120, W.hero.y + 60]];
  for (let i = 0; i < n; i++) { const p = at[i % at.length]; makeEnemy(i % 2 ? 'gunner' : 'thug', p[0], p[1]); P.smoke(p[0], p[1], 6, 6); }
}

/* ---------------- the DEA: agents on their beats, with sight and suspicion ---------------- */
function makeAgent(beat, start, i) {
  const p = BEATS[beat].at(start);
  const a = new E.Body({ x: p.x, y: p.y, r: 5 });
  Object.assign(a, { kind: 'agent', beat, d: start, sp: 30, facing: p.angle, sus: new E.Suspicion({ rise: 1.2, decay: .25 }), stun: 0, look: 0, state: 'calm', rig: RIGS.agent(i), i, ret: false });
  W.agents.push(a);
  return a;
}
const suspicious = () => S.product > 0 || S.heat >= 60 || W.combat;
function agentUpdate(a, dt) {
  const h = W.hero;
  if (a.stun > 0) {
    a.stun -= dt; a.vx = a.vy = 0; a.update(dt, W.map);
    a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: 0, vy: 0, facing: a.facing + Math.sin(game.time * 8) * .5, hurt: true, pose: 'kneel' });
    return;
  }
  const night = S.clock >= 20 || S.clock < 6;
  const range = (night ? 85 : 115) * (S.heat >= 100 ? 1.3 : 1);
  let seen = false;
  if (h && !h.down && !inSmoke(h) && !inSmoke(a) && suspicious() && !W.demo) {
    const s = E.sees(a, h, { map: W.map, range, fov: 1.35 });
    if (s.seen) seen = { ...s, exposure: s.exposure * DIFF().sus * (S.heat >= 60 ? 1.4 : 1) };
  }
  const st = a.sus.update(dt, seen, h);
  if (a.sus.changed) {
    if (st === 'notice') { A.sfx('blip', { pitch: .8 }); }
    if (st === 'alert') { A.sfx('siren'); music('town'); A.layer && A.layer('tension', 1, .3); toastOnce('dea', 'DEA! Break line of sight, sprint, or blind them with smoke.'); log('alert', a.i); }
    if (st === 'calm') { a.ret = true; }
  }
  a.state = st;
  let tx = null, ty = null, sp = 30;
  if (st === 'alert' && h) { tx = h.x; ty = h.y; sp = 96; }
  else if (st === 'search' && a.sus.last) { tx = a.sus.last.x; ty = a.sus.last.y; sp = 50; }
  else if (st === 'notice' && h) { a.facing = E.approachAng ? E.approachAng(a.facing, angTo(a, h), dt * 4) : angTo(a, h); a.vx = a.vy = 0; }
  else {
    // walk the beat; at each corner, look around
    const path = BEATS[a.beat];
    if (a.ret) { const n = path.nearest(a.x, a.y); a.d = n.d !== undefined ? n.d : a.d; a.ret = false; }
    if (a.look > 0) { a.look -= dt; a.facing += Math.sin(a.look * 3) * dt * 1.6; a.vx = a.vy = 0; }
    else {
      a.d = (a.d + sp * dt) % path.length;
      const p = path.at(a.d), p2 = path.at((a.d + 6) % path.length);
      tx = p.x; ty = p.y;
      const turn = Math.abs(E.angDiff(a.facing, Math.atan2(p2.y - p.y, p2.x - p.x)));
      if (turn > 1.2 && E.chance(.5)) a.look = 1.4;
    }
  }
  if (tx !== null) {
    const dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy);
    if (dd > 2) { a.vx = dx / dd * sp; a.vy = dy / dd * sp; a.facing = Math.atan2(dy, dx); } else { a.vx = a.vy = 0; }
  }
  a.update(dt, W.map);
  if (st === 'alert' && h && dist(a, h) < 11 && !h.down) {
    log('busted', a.i);
    if (W.kind === 'hub') { S.product = 0; S.busts++; h.x = SPOT.rv.x + 20; h.y = SPOT.rv.y + 10; for (const o of W.agents) { o.sus.reset(); o.ret = true; } A.sfx('siren'); toast('BUSTED. Product seized. Back to the RV.'); }
    else { W.busted = true; game.go('busted', {}); }
  }
  a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, sprint: st === 'alert', point: false });
}
function syncAgents() {
  if (W.kind !== 'town' || S.ep < 2) { W.agents.length = 0; return; }
  const want = Math.min(5, 2 + (S.heat >= 40 ? 1 : 0) + (S.heat >= 75 ? 1 : 0) + (S.ep >= 4 ? 1 : 0));
  while (W.agents.length < want) { const n = W.agents.length; makeAgent(n % BEATS.length, (n * 157) % BEATS[n % BEATS.length].length, n); }
  while (W.agents.length > want) { const a = W.agents[W.agents.length - 1]; if (a.state !== 'calm') break; W.agents.pop(); }
}
function heatAdd(n) { if (W && W.demo) return; S.heat = clamp(S.heat + n, 0, 100); }

/* ---------------- drawing a body: shadow, the rig, a flash when hurt ---------------- */
function drawBody(r, b, o = {}) {
  r.shadow(b.x, b.y, o.shadow || 7, .35, undefined, b.groundZ || 0);
  r.actor(b.x, b.y, b.z, (g, ox, oy) => b.rig.draw(g, ox, oy, r.view), { flash: b.hurtT > 0 ? '#ffffff' : undefined, xray: o.xray, alpha: o.alpha, every: o.every, key: o.every ? b : undefined });
}

// ---- 40-story.js ----
/* ---------------- talk: portraits, gibberish voices, conversations as lists ---------------- */
const talk = new E.Dialog(game, { bg: ['#3a2a1a', '#140c06'], border: '#e8c890', nameColor: '#ffd36a', speed: 52 });
const NAMES = { hollis: 'HOLLIS', dusty: 'DUSTY', lenny: 'LENNY', vela: 'AUGUSTO VELA', dale: 'DALE', skyler: 'MARIAN', rafa: 'RAFA', mack: 'MACK', thug: 'CREW', radio: 'POLICE RADIO' };
const NAME_AFTER_ALIAS = () => S.alias ? 'SCHRODINGER' : 'HOLLIS';
function say(who, text, o = {}) {
  const sp = speaker(who);
  talk.voice = sp.voice;
  talk.say(text, { name: who === 'hollis' ? NAME_AFTER_ALIAS() : NAMES[who] || who.toUpperCase(), portrait: sp.rig, portraitSize: 48, portraitOpts: { zoom: 2.5, turn: -.2, bg: PORTRAIT_BG }, ...o });
}
// a conversation: [[who, text | [pages]], ...] then done(); a line may be a function (built when reached) or { choices }
function convo(lines, done) {
  const run = i => {
    if (i >= lines.length) { if (done) done(); return; }
    const ln = lines[i];
    if (typeof ln === 'function') { const r = ln(); if (r === false) return; run(i + 1); return; }
    const [who, text, o = {}] = ln;
    if (o.choices) say(who, text, { choices: o.choices, onChoice: k => { if (o.onChoice) o.onChoice(k); game.after(.01, () => run(i + 1)); } });
    else say(who, text, { ...o, onDone: () => run(i + 1) });
  };
  run(0);
}

/* ---------------- toasts and tips ---------------- */
const toasts = [];
function toast(text, sec = 3) { if (toasts.length && toasts[toasts.length - 1].text === text) return; toasts.push({ text, t: sec }); if (toasts.length > 3) toasts.shift(); }
const seenTips = new Set();
function toastOnce(id, text) { if (seenTips.has(id) || !game.settings.hints || (W && W.demo)) return; seenTips.add(id); toast(text, 5); }
let card = null;   // the episode's title card { a, b, t }
function showCard(a, b, sec = 3.5) { card = { a, b, t: sec, max: sec }; }

/* ---------------- the five episodes ---------------- */
const EPISODES = [
  { title: 'PILOT', steps: [
    { id: 'dusty', obj: 'Talk to Dusty in the backyard', at: () => SPOT.dusty, ev: 'talk:dusty' },
    { id: 'cook1', obj: 'Cook your first batch in the RV', at: () => SPOT.rv, ev: 'cook' },
    { id: 'rafa', obj: 'Sell to Rafa at the salvage yard', at: () => SPOT.rafa, ev: 'talk:rafa' },
    { id: 'fight1', obj: 'Survive Rafa\'s crew', ev: 'clear' }
  ] },
  { title: 'CLEAN MONEY', steps: [
    { id: 'lenny', obj: 'See Lenny Shapiro, attorney, at the strip mall', at: () => SPOT.lenny, ev: 'talk:lenny' },
    { id: 'deals', obj: () => S.product > 0 ? 'Sell to street buyers (' + Math.min(3, S.epDeals) + '/3)' : 'Out of product: cook more in the RV (' + Math.min(3, S.epDeals) + '/3 sold)', at: () => S.product > 0 ? nearestBuyer() : SPOT.rv, ev: 'deal', ok: () => S.epDeals >= 3 },
    { id: 'launder', obj: 'Launder your cash at Bubble Bros Car Wash', at: () => SPOT.carwash, ev: 'launder' },
    { id: 'sleep2', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'THE TACO MAN', steps: [
    { id: 'vela', obj: 'Meet Augusto Vela at Taco Tranquilo', at: () => SPOT.taco, ev: 'talk:taco' },
    { id: 'cook90', obj: 'Cook a batch of 90% purity or better', at: () => SPOT.rv, ev: 'cook', ok: d => d && d.purity >= 90 },
    { id: 'deliver', obj: () => S.product >= 4 ? 'Deliver 4 lbs to Taco Tranquilo\'s back door' : 'You need 4 lbs: cook more in the RV', at: () => S.product >= 4 ? SPOT.back : SPOT.rv, ev: 'talk:back' },
    { id: 'sleep3', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'LOS PRIMOS', steps: [
    { id: 'arena', obj: 'Something is wrong at the car wash', at: () => SPOT.arena, ev: 'arena' },
    { id: 'cousins', obj: 'Survive the Calaca cousins', ev: 'clear' },
    { id: 'lenny4', obj: 'Talk to Lenny', at: () => SPOT.lenny, ev: 'talk:lenny' },
    { id: 'sleep4', obj: 'Go home and sleep', at: () => SPOT.home, ev: 'sleep' }
  ] },
  { title: 'HALF-LIFE', steps: [
    { id: 'laundry', obj: 'Break into Lavanderia Brillante', at: () => SPOT.laundry, ev: 'talk:laundry' },
    { id: 'labclear', obj: 'Clear the superlab', ev: 'clear' },
    { id: 'final', obj: 'Confront Vela in his office', at: () => LAB_SPOT.vela, ev: 'talk:vela' }
  ] }
];
const curStep = () => (EPISODES[S.ep - 1] || EPISODES[0]).steps[S.step];
const objText = () => { const s = curStep(); return !s ? '' : typeof s.obj === 'function' ? s.obj() : s.obj; };
function nearestBuyer() { let b = null, bd = 1e9; if (W && W.hero) for (const x of W.buyers) { const d = dist(W.hero, x); if (d < bd) { bd = d; b = x; } } return b; }

// an event from play: if it is what the current step waits for, its scene plays and the story moves on
function story(ev, data) {
  log('ev', ev);
  if (W && W.demo) return;
  const st = curStep();
  if (!st || st.ev !== ev) return;
  if (st.ok && !st.ok(data)) { onStepNotYet(st, data); return; }
  const after = ON_DONE[st.id];
  if (after) after(data, advance); else advance();
}
function advance() {
  const ep = EPISODES[S.ep - 1];
  S.step++;
  if (S.step >= ep.steps.length) { S.ep++; S.step = 0; S.epDeals = 0; if (S.ep > EPISODES.length) { game.go('ending'); return; } }
  log('step', S.ep + '.' + S.step);
  stepEnter();
  autosave();
}
function stepEnter() {
  const st = curStep(); if (!st) return;
  const f = ON_ENTER[st.id]; if (f) f();
  if (S.step === 0) showCard('EPISODE ' + S.ep, EPISODES[S.ep - 1].title);
}
function onStepNotYet(st, data) {
  if (st.id === 'cook90') convo([['dusty', ['That\'s ' + data.purity.toFixed(1) + '%, Mr. G. The taco guy wants ninety.', 'Again? Lenny sells glassware that makes the windows bigger.']]]);
}

/* what each step's end and start play */
const ON_DONE = {
  dusty: (d, next) => convo([
    ['dusty', ['Mr. G? Whoa. Okay. This is weird.', 'My RV is in your backyard. You\'re in your backyard. We\'re both... in your backyard.']],
    ['hollis', ['You used to sell. I used to teach.', 'Now I have a diagnosis, a mortgage, and a son who will need college.', 'You know the business. I know the chemistry.']],
    ['dusty', ['So you just wanna cook? Here? Next to your grill?']],
    ['hollis', ['Chemistry is the study of change, Dusty.', 'Tonight, we change.']],
    ['dusty', ['...Yeah. Okay. Science.']]
  ], () => { W.partnerJoin && W.partnerJoin(); next(); }),
  cook1: (d, next) => convo([
    ['dusty', ['Mr. G. It\'s blue. Why is it blue?']],
    ['hollis', ['Because it\'s pure. ' + d.purity.toFixed(1) + ' percent.', 'Nobody in this state is making anything like it.']],
    ['dusty', ['Rafa at the salvage yard will take it. He\'s... a lot. But he pays.']]
  ], next),
  rafa: (d, next) => convo([
    ['rafa', ['Teacher! Dusty\'s teacher! Come in, come in.', '*sniff* ...TIGHT. Tight, tight, tight! This is the bomb!']],
    ['rafa', ['So here is the deal. I take it all.', 'And I pay you... nothing. Because this is my yard.']],
    ['hollis', ['That\'s not how a transaction works.']],
    ['rafa', ['{shake}Muchachos!{/shake}']]
  ], () => { next(); }),
  fight1: (d, next) => convo([
    ['rafa', ['Okay! OKAY. Business. We do business, teacher.', 'Two pounds. Five grand. Cash. We are friends now.']],
    () => { const sold = Math.min(2, S.product); S.product -= sold; S.dirty += 5000; S.earned += 5000; A.sfx('cash'); return true; },
    ['hollis', ['Next time, you pay first.']],
    ['dusty', ['Yo. Mr. G just blew up a guy with a beaker.']]
  ], next),
  lenny: (d, next) => convo([
    ['lenny', ['Lenny Shapiro! You need me, I need you. That\'s the beauty of the free market.']],
    ['lenny', ['Rule one: dirty money is a liability.', 'Run it through Bubble Bros Car Wash. It goes in filthy, it comes out squeaky.']],
    ['lenny', ['Rule two: the DEA has a new task force. Big guy, Kowalski.', 'Don\'t let an agent see you holding product. Night helps. So does smoke.']],
    ['hollis', ['Kowalski. Dale Kowalski?']],
    ['lenny', ['You know him? ...Your BROTHER-IN-LAW? Oh, this is fantastic. This is my life now.']],
    ['lenny', ['Rule three: buy my services. Glassware, protection, alibis.', 'Here, a freebie. A recipe for a smoke that would make a fed cry.']],
    () => { S.flags.smoke = true; S.flasks.smoke = Math.max(S.flasks.smoke, 2); S.flags.shop = true; A.sfx('powerup'); toast('Smoke flasks unlocked. ' + lbl('cycle') + ' switches flask.', 5); return true; }
  ], next),
  deals: (d, next) => convo([['dusty', ['Three deals, zero handcuffs. I\'m kinda proud of us.', 'Cash smells weird though. Lenny said wash it.']]], next),
  launder: (d, next) => convo([['hollis', ['Clean money. Taxable. Explainable.', 'Marian will want to know where it came from. I\'ll have an answer.']]], next),
  sleep2: (d, next) => convo([
    ['dale', ['Hollis! Marian made her enchiladas. So. Work stuff, you\'ll love this.', 'Blue meth. Ninety plus percent. Some genius is cooking like a pharmaceutical lab.']],
    ['hollis', ['A genius. Huh.']],
    ['dale', ['Guy\'s an artist, I\'ll give him that. Doesn\'t matter. Everybody slips.']],
    ['skyler', ['Can we please not talk about drugs at dinner?']]
  ], next),
  vela: (d, next) => convo([
    ['vela', ['Mr. Gray. Please, sit. The salsa verde is very good today.']],
    ['vela', ['I have sampled your product. It is... exceptional.', 'But I do not deal with men who cannot be measured.']],
    ['vela', ['Bring me four pounds at ninety percent or better. Through my back door.', 'Then we will talk about the future.']],
    ['hollis', ['And if I can\'t?']],
    ['vela', ['Then you were never here.']]
  ], next),
  cook90: (d, next) => convo([['dusty', [d.purity.toFixed(1) + ' percent. Mr. G, that\'s, like, art.']], ['hollis', ['It\'s chemistry. Get in the car.']]], next),
  deliver: (d, next) => {
    if (S.product < 4) { convo([['vela', ['You are light, Mr. Gray. Four pounds. Not a gram less.']]]); return; }
    convo([
      () => { S.product -= 4; S.dirty += 20000; S.earned += 20000; A.sfx('cash'); return true; },
      ['vela', ['Remarkable. Twenty thousand, as agreed. More where this came from.']],
      ['vela', 'What should my people call you?', { choices: ['"Schrodinger."', '"Mr. Gray."'], onChoice: k => { S.flags.namedSelf = k === 0; } }],
      () => { convo([S.flags.namedSelf ? ['hollis', ['Schrodinger. Until you open the box, I\'m alive and dead.']] : ['vela', ['No. Men like us need a second name. My people will call you Schrodinger.']]], () => { S.alias = true; refreshHeroRig(W.hero); A.sfx('secret'); showCard('ALIAS', 'SCHRODINGER', 3); next(); }); return false; }
    ]);
  },
  sleep3: (d, next) => convo([['radio', ['...two males, silver suits, last seen on foot near the Mesa highway...', '...units be advised, suspects are armed...']], ['hollis', ['...']]], next),
  arena: (d, next) => convo([
    ['dusty', ['Mr. G. Who are those guys? Why are they so... shiny?']],
    ['hollis', ['The Calaca cousins. Vela\'s competition. Or Vela\'s message.']],
    ['hollis', ['Either way, they don\'t talk. Stay out of the line when they charge.']]
  ], () => { next(); }),
  cousins: (d, next) => convo([['dusty', ['They\'re down. They\'re actually down. Yo, we need to leave. Now.']]], next),
  lenny4: (d, next) => convo([
    ['lenny', ['Two cartel hitmen in a car wash. Do you know what that does to my Yelp rating?']],
    ['lenny', ['Vela pointed them at you. You know that, right? He\'s cleaning house.']],
    ['hollis', ['Then we clean first.']],
    ['lenny', ['I did not hear that. Also: Lavanderia Brillante, on Fourth? Vela\'s superlab is under it.', 'I also did not say that.']]
  ], next),
  sleep4: (d, next) => convo([['dale', ['Hollis, stay home tonight, okay? Something big is happening downtown. Cartel stuff.']], ['hollis', ['I will, Dale. I\'ll stay home.']]], next),
  laundry: (d, next) => { next(); game.go('lab', {}, { fade: 'iris', at: W.hero }); },
  labclear: (d, next) => convo([['dusty', ['Clear. It\'s clear. Mr. G... the office.']]], next),
  final: (d, next) => convo([
    ['vela', ['Mr. Gray. You came to my house.']],
    ['hollis', ['You came to mine. Twice.']],
    ['vela', ['I built this in plain sight. Twenty years. Tacos, charity drives, a smile for every policeman in the city.', 'And you are a schoolteacher with a sock full of crystal.']],
    ['hollis', ['Say my name.']],
    ['vela', ['...What?']],
    ['hollis', ['You know exactly who I am. Say my name.']],
    ['vela', ['{s=8}...Schrodinger.{/s}']],
    ['hollis', ['Damn right.']]
  ], () => { S.flags.won = true; next(); })
};
const ON_ENTER = {
  dusty: () => toastOnce('move', 'Move: ' + (isPad() ? 'left stick' : 'WASD') + '. Talk: ' + lbl('interact') + '. Ledger: ' + lbl('ledger') + '.'),
  cook1: () => toastOnce('cook', 'Walk up to the RV and press ' + lbl('interact') + ' to cook.'),
  fight1: () => {
    const at = SPOT.rafa;
    W.lockArena = { x: at.x, y: at.y + 10, r: 130 };
    makeEnemy('thug', at.x - 40, at.y + 10); makeEnemy('gunner', at.x + 40, at.y - 20); makeEnemy('thug', at.x + 20, at.y + 40); makeEnemy('gunner', at.x - 30, at.y - 30);
    W.rafaFled = true;
    toastOnce('throw', 'Throw a fulminate flask: ' + lbl('throw') + '. Punch: ' + lbl('attack') + '. Roll: ' + lbl('dodge') + '.');
  },
  lenny: () => toastOnce('lenny', 'The strip mall is south across the road.'),
  deals: () => toastOnce('deal', 'Buyers wait on corners. DEA agents patrol: their cones show what they see.'),
  launder: () => toastOnce('launder', 'Dirty cash (green) can\'t buy upgrades. Launder it into clean cash (white).'),
  cook90: () => toastOnce('cook90', 'Purity is the whole game now. Lenny\'s upgrades help.'),
  cousins: () => {
    const at = SPOT.arena;
    W.lockArena = { x: at.x, y: at.y, r: 150 };
    makeEnemy('cousin', at.x - 60, at.y - 30, { i: 0, name: 'EZEQUIEL CALACA' }); makeEnemy('cousin', at.x + 60, at.y - 30, { i: 1, name: 'TOMAS CALACA' });
    music('boss');
  },
  labclear: () => {},
  final: () => toastOnce('final', 'The office door is open.')
};

/* ---------------- interactions: what the player can use in the world, by place ---------------- */
function interactables() {
  const list = [], st = curStep(), id = st && st.id;
  if (!W) return list;
  if (W.kind === 'town' || W.kind === 'hub') {
    list.push({ id: 'rv', x: SPOT.rv.x, y: SPOT.rv.y, label: 'Cook in the RV', when: () => W.kind === 'hub' || !(S.ep === 1 && S.step === 0), act: rvMenu });
  }
  if (W.kind === 'town') {
    if (!W.partner) list.push({ id: 'dusty', x: SPOT.dusty.x, y: SPOT.dusty.y, label: 'Talk to Dusty', act: () => story('talk:dusty') });
    list.push({ id: 'home', x: SPOT.home.x, y: SPOT.home.y, label: id && id.startsWith('sleep') ? 'Sleep' : 'Save the game', act: homeAct });
    list.push({ id: 'skyler', x: SPOT.skyler.x, y: SPOT.skyler.y, label: 'Talk to Marian', act: skylerTalk });
    list.push({ id: 'lenny', x: SPOT.lenny.x, y: SPOT.lenny.y, label: S.flags.shop ? 'Lenny\'s office (shop)' : 'Lenny\'s office', when: () => S.ep >= 2, act: () => { if (id === 'lenny' || id === 'lenny4') story('talk:lenny'); else shopMenu(); } });
    list.push({ id: 'taco', x: SPOT.taco.x, y: SPOT.taco.y, label: 'Taco Tranquilo', when: () => S.ep >= 3, act: () => { if (id === 'vela') story('talk:taco'); else convo([['vela', [S.ep >= 4 ? 'We are closed, Mr. Gray. For you, we are always closed.' : 'Back door, Mr. Gray. Ninety percent.']]]); } });
    list.push({ id: 'back', x: SPOT.back.x, y: SPOT.back.y, label: 'Back door', when: () => id === 'deliver', act: () => story('talk:back') });
    list.push({ id: 'carwash', x: SPOT.carwash.x, y: SPOT.carwash.y, label: 'Bubble Bros (launder)', when: () => S.ep >= 2 && id !== 'arena' && id !== 'cousins', act: launderMenu });
    list.push({ id: 'laundry', x: SPOT.laundry.x, y: SPOT.laundry.y, label: 'Lavanderia Brillante', when: () => S.ep >= 5, act: () => story('talk:laundry') });
    if (S.ep === 1 && !W.rafaFled) list.push({ id: 'rafa', x: SPOT.rafa.x, y: SPOT.rafa.y, label: 'Talk to Rafa', when: () => id === 'rafa', act: () => story('talk:rafa') });
  }
  if (W.kind === 'town' || W.kind === 'hub') for (const b of W.buyers) list.push({ id: 'buyer', x: b.x, y: b.y, label: 'Sell to ' + b.name, buyer: b, act: () => dealWith(b) });
  if (W.kind === 'lab' && id === 'final') list.push({ id: 'vela', x: LAB_SPOT.vela.x, y: LAB_SPOT.vela.y + 8, label: 'Confront Vela', act: () => story('talk:vela') });
  return list.filter(o => !o.when || o.when());
}
function skylerTalk() {
  const L = ['You\'re home late. Again. Where were you?', 'Hollis. Where does this money come from?', 'Who are you right now? I don\'t recognize you.', 'Someone called asking for "Schrodinger". I said wrong number. Was it?', 'Whatever this is... finish it. And come home.'];
  convo([['skyler', [L[Math.min(L.length - 1, S.ep - 1)]]], ['hollis', [['I was working, Marian.', 'Tutoring. It pays.', 'The same man you married.', 'Wrong number.', 'I will.'][Math.min(4, S.ep - 1)]]]]);
}
function homeAct() {
  const st = curStep();
  if (st && st.ev === 'sleep') {
    game.go('night', {}, { fade: 'dissolve' });
  } else { game.saves.save(0); A.sfx('confirm'); toast('Saved to slot 1. The house is quiet.'); }
}
// the night between days: the story's scene for the evening, then morning
function sleepNow() {
  S.day++; S.clock = 8.5; S.heat = Math.max(0, S.heat - 25); S.hp = 100;
  for (const k in S.flasks) S.flasks[k] = Math.max(S.flasks[k], k === 'smoke' && !S.flags.smoke ? 0 : 1);
  story('sleep');
}

// ---- 50-cook.js ----
/* ---------------- a 10-foot menu: big rows, the focused row's note below, the mouse hovers and clicks ---------------- */
let modal = null;          // a menu or the cook, over the world: play waits while one is open
class BigMenu {
  constructor(title, items, o = {}) { this.title = title; this.items = items; this.i = Math.max(0, items.findIndex(x => !x.disabled)); this.o = o; this.rows = []; this.t = 0; this.kind = 'menu'; }
  update(dt) {
    this.t += dt;
    const n = this.items.length, inp = I;
    if (inp.repeat('down')) { this.i = (this.i + 1) % n; A.sfx('select'); }
    if (inp.repeat('up')) { this.i = (this.i + n - 1) % n; A.sfx('select'); }
    const p = inp.pointer();
    if (p && inp.mouse && inp.mouse.t > inp.clock - .05) for (let k = 0; k < this.rows.length; k++) { const r = this.rows[k]; if (p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3] && this.i !== k) { this.i = k; A.sfx('tick'); } }
    const c = inp.clicked();
    let pick = this.t > .15 && (inp.pressed('confirm') || inp.pressed('interact'));
    if (c) for (let k = 0; k < this.rows.length; k++) { const r = this.rows[k]; if (c[0] >= r[0] && c[0] <= r[2] && c[1] >= r[1] && c[1] <= r[3]) { this.i = k; pick = true; } }
    if (pick) {
      const it = this.items[this.i];
      if (it.disabled) { A.sfx('bump'); return; }
      A.sfx('confirm'); inp.consumeAll();
      if (it.act) it.act(this); else this.close();
      return;
    }
    if (this.t > .15 && inp.pressed('cancel')) { A.sfx('cancel'); this.close(); if (this.o.onCancel) this.o.onCancel(); }
  }
  close() { if (modal === this) modal = null; I.consumeAll(); }
  draw(r) {
    r.overlay(g => {
      const w = Math.min(r.W - 24, 300), rowH = this.items.length > 6 ? 15 : 17, h = 46 + this.items.length * rowH + 30, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#3a2a1a', '#140c06'], border: '#e8c890' });
      E.font.title(g, this.title, r.W / 2, y + 8, { scale: 2, align: 'center', colors: ['#fff4d0', '#ffd36a', '#c8782a'], outline: '#1a0c06' });
      if (this.o.sub) E.font.text(g, typeof this.o.sub === 'function' ? this.o.sub() : this.o.sub, r.W / 2, y + 28, '#c8b090', { align: 'center' });
      this.rows = [];
      this.items.forEach((it, k) => {
        const ry = y + 42 + k * rowH, on = k === this.i;
        this.rows.push([x + 8, ry - 2, x + w - 8, ry + rowH - 4]);
        if (on) { px.rect(g, x + 8, ry - 3, w - 16, rowH - 1, '#6a4a22'); px.rect(g, x + 8, ry - 3, 3, rowH - 1, '#ffd36a'); }
        E.font.text(g, (on ? '▸ ' : '  ') + it.label, x + 16, ry + 1, it.disabled ? '#7a6a5a' : on ? '#fff4d0' : '#e8d8b8', { shadow: '#000' });
        if (it.right) E.font.text(g, it.right, x + w - 16, ry + 1, it.disabled ? '#7a6a5a' : '#9ae07a', { align: 'right', shadow: '#000' });
      });
      const it = this.items[this.i];
      if (it && it.note) E.font.text(g, it.note, r.W / 2, y + h - 22, '#c8b090', { align: 'center', wrap: w - 20 });
      E.font.text(g, lbl('confirm') + ' choose   ' + lbl('cancel') + ' back', r.W / 2, y + h + 6, '#e8d8b8', { align: 'center', shadow: '#000' });
    });
  }
}
function openMenu(title, items, o) { modal = new BigMenu(title, items, o); I.consumeAll(); return modal; }

/* the RV: cook, refill flasks */
function rvMenu() {
  const refill = () => { S.flasks.fulm = FLASK_MAX.fulm; if (S.flags.smoke) S.flasks.smoke = FLASK_MAX.smoke; A.sfx('powerup'); toast('Flasks refilled.'); modal = null; };
  openMenu('THE RV', [
    { label: 'Cook a batch', note: 'Three stages: measure, heat, crystallize. Purity sets the price.', act: () => { modal = new Cook({ hub: W.kind === 'hub' }); } },
    W.kind === 'hub' ? null : { label: 'Refill flasks', right: S.flasks.fulm + '/' + FLASK_MAX.fulm + (S.flags.smoke ? '  ' + S.flasks.smoke + '/' + FLASK_MAX.smoke : ''), note: 'Fulminated mercury' + (S.flags.smoke ? ' and smoke' : '') + ', mixed fresh.', act: refill },
    { label: 'Leave', note: '', act: m => m.close() }
  ].filter(Boolean), { sub: 'Parked in the backyard. It smells like science.' });
}
/* Lenny's shop: upgrades for clean cash */
function shopMenu(keep) {
  const items = UPGRADES.map(u => {
    const owned = S.up[u.id] && !u.repeat, afford = S.clean >= u.cost;
    return { label: u.name, right: owned ? 'OWNED' : fmt$(u.cost), disabled: owned || !afford, note: u.text + (owned ? '' : afford ? '' : '  (Needs clean cash.)'),
      act: () => {
        S.clean -= u.cost; S.up[u.id] = true; A.sfx('cash'); log('buy', u.id);
        if (u.id === 'cover') { S.heat = Math.floor(S.heat / 2); toast('Lenny makes a call. Heat halved.'); }
        if (u.id === 'pistol') { refreshHeroRig(W.hero); toast('Your attack now shoots. Aim with the mouse or right stick.'); }
        modal = null; shopMenu(UPGRADES.indexOf(u));
      } };
  });
  items.push({ label: 'Leave', note: '"Remember: you never met me."', act: m => m.close() });
  const m = openMenu('LENNY\'S', items, { sub: () => 'Clean cash ' + fmt$(S.clean) + '   Dirty ' + fmt$(S.dirty) });
  if (keep !== undefined) { m.i = keep; m.t = .15; }
}
/* Bubble Bros: launder dirty cash into clean */
function launderMenu() {
  const got = Math.floor(S.dirty * launderRate());
  openMenu('BUBBLE BROS', [
    { label: 'Launder all dirty cash', right: S.dirty > 0 ? fmt$(S.dirty) + ' > ' + fmt$(got) : '', disabled: S.dirty <= 0, note: 'The wash keeps ' + Math.round((1 - launderRate()) * 100) + ' cents of every dollar. Nobody asks.',
      act: () => { S.clean += got; S.dirty = 0; A.sfx('cash'); P.glints(W.hero.x, W.hero.y, 24, 12, '#c8f0ff'); log('launder', got); modal = null; toast(fmt$(got) + ' clean. Squeaky.'); story('launder'); } },
    { label: 'Leave', note: '', act: m => m.close() }
  ], { sub: 'Dirty ' + fmt$(S.dirty) + '   Clean ' + fmt$(S.clean) });
}

/* ---------------- street deals ---------------- */
const BUYER_NAMES = ['SKINNY PETE', 'BADGE', 'WENDELL', 'COMBO KID', 'TORTUGA', 'SPOOGE JR.', 'ANDREA', 'NO-DOZE', 'GONZO', 'EMILIO', 'BRANDON', 'CLOVIS'].map(n => n.replace('SPOOGE JR.', 'SPROCKET').replace('NO-DOZE', 'DOZER').replace('COMBO KID', 'COMBO').replace('SKINNY PETE', 'SLIM PETE').replace('BADGE', 'BADGER'));
let buyerN = 0;
function spawnBuyer() {
  const used = new Set(W.buyers.map(b => b.spot.i));
  const free = BUYER_SPOTS.filter(s => !used.has(s.i) && (!W.hero || Math.hypot(s.x - W.hero.x, s.y - W.hero.y) > 60));
  if (!free.length) return;
  const spot = choose(rnd, free), n = buyerN++;
  const b = { x: spot.x, y: spot.y, z: 0, spot, name: BUYER_NAMES[n % BUYER_NAMES.length], demand: 1 + Math.floor(rnd() * 3), price: 380 + Math.floor(rnd() * 140), rig: RIGS.buyer(n), facing: Math.PI / 2, t: rnd() * 6 };
  W.buyers.push(b);
}
function buyersUpdate(dt) {
  if (W.kind === 'town' && S.ep < 2) { W.buyers.length = 0; return; }
  W.buyerT = (W.buyerT || 0) - dt;
  if (W.buyers.length < 2) W.buyerT = Math.min(W.buyerT, 1.5);
  if (W.buyers.length < 3 && W.buyerT <= 0) { spawnBuyer(); W.buyerT = W.kind === 'hub' ? 3 : 9; }
  for (const b of W.buyers) {
    b.t += dt;
    if (W.hero) { const d = dist(b, W.hero); if (d < 80) b.facing = angTo(b, W.hero); else b.facing = Math.PI / 2 + Math.sin(b.t * .5) * 1.2; }
    b.rig.update(dt, { x: b.x, y: b.y, z: 0, vx: 0, vy: 0, facing: b.facing, pose: Math.sin(b.t * .7) > .6 ? 'hips' : undefined });
  }
}
function dealWith(b) {
  if (S.product <= 0) { say('thug', ['You got nothing? Then why are you talking to me, man?'], { name: b.name, portrait: b.rig }); return; }
  const amt = Math.min(S.product, b.demand), pay = Math.round(amt * b.price * (.5 + S.purity / 100) * (S.up.phone ? 1.1 : 1) / 10) * 10;
  const lines = [['Is that the blue? Everybody\'s talking about the blue.', 'Gimme ' + amt + '. ' + fmt$(pay) + ', counted twice.'], ['Yo, the blue stuff? For real?', amt + ' pounds. ' + fmt$(pay) + '. Don\'t look at me like that.'], ['My guy. My GUY. ' + amt + ' of the good stuff.', fmt$(pay) + '. We never met.']];
  say('thug', choose(rnd, lines), { name: b.name, portrait: b.rig, onDone: () => {
    S.product = Math.round((S.product - amt) * 10) / 10; if (S.product <= 0) { S.product = 0; }
    S.dirty += pay; S.earned += pay; S.deals++; S.epDeals++; heatAdd(7);
    A.sfx('cash'); P.text(b.x, b.y, 34, '+' + fmt$(pay), '#9ae07a', { scale: 1 });
    E.prune(W.buyers, x => x === b); W.buyerT = W.kind === 'hub' ? 2 : 8;
    log('deal', pay);
    if (W.onDeal) W.onDeal(pay);
    story('deal');
  } });
}

/* ---------------- the cook: measure, heat, crystallize ---------------- */
class Cook {
  constructor(o = {}) {
    this.kind = 'cook'; this.o = o; this.phase = 'intro'; this.t = 0; this.scores = { measure: [], heat: 0, cryst: [] }; this.msg = null; this.msgT = 0;
    this.glass = !!S.up.glass; this.demo = !!(W && W.demo); this.rand = E.rng(S.cooks * 31 + 7);
    this.reagents = ['PRECURSOR', 'REDUCER', 'CATALYST']; this.ri = 0; this.needle = 0; this.dir = 1; this.zone = this.newZone();
    this.temp = .3; this.inBand = 0; this.heatT = 0; this.HEAT_LEN = 9;
    this.rings = []; this.ringI = 0; this.ringT = 0; this.bubbles = [];
    music('cook'); I.consumeAll();
    if (W && !W.demo && W.kind !== 'hub' && S.cooks === 0) toastOnce('cook1', 'Press ' + lbl('interact') + ' (or click) when the needle is in the green.');
    this.say(['Okay Mr. G. Let\'s cook.', 'Yeah, science!', 'I got the respirators.', 'Please don\'t blow us up.'][S.cooks % 4]);
    log('cook-start', S.cooks);
  }
  newZone() { const w = (this.glass ? .22 : .16) * (1 - (this.ri || 0) * .12); return { c: .2 + this.rand() * .6, w }; }
  say(text) { if (this.o.hub || !W || W.kind === 'hub') return; say('dusty', [text], { modal: false, auto: 2.2, place: 'bottom' }); }
  pressed() { return I.pressed('interact') || I.pressed('confirm') || I.pressed('attack'); }
  held() { return I.down('interact') || I.down('confirm') || I.down('attack') || I.down('up'); }
  flash(msg, col) { this.msg = [msg, col]; this.msgT = .8; }
  update(dt) {
    this.t += dt; this.msgT -= dt;
    for (const b of this.bubbles) { b.y -= b.v * dt; b.t -= dt; } E.prune(this.bubbles, b => b.t <= 0);
    if (this.phase !== 'result' && this.rand() < dt * 8) this.bubbles.push({ x: this.rand(), y: 0, v: 10 + this.rand() * 20, t: 1.4 });
    if (this.phase === 'intro') { if (this.t > 1.4) { this.phase = 'measure'; this.t = 0; } return; }
    if (this.phase === 'measure') {
      const sp = .75 + this.ri * .3;
      this.needle += this.dir * sp * dt; if (this.needle > 1) { this.needle = 1; this.dir = -1; } if (this.needle < 0) { this.needle = 0; this.dir = 1; }
      let press = this.pressed();
      if (this.demo || this.o.auto) press = Math.abs(this.needle - this.zone.c) < this.zone.w * .2;
      const late = this.t > 4.5;            // nobody pressed: the reagent goes in badly measured
      if (late) press = true;
      if (press && this.t > .3) {
        const off = Math.abs(this.needle - this.zone.c) / (this.zone.w / 2);
        const s0 = off <= .35 ? 1 : off <= 1 ? 1 - (off - .35) * .45 : Math.max(0, .6 - (off - 1) * .6);
        const s = late ? 0 : s0;
        this.scores.measure.push(s);
        this.flash(s >= .95 ? 'PERFECT' : s >= .7 ? 'GOOD' : s > .2 ? 'SLOPPY' : 'MISS', s >= .7 ? '#7ae07a' : s > .2 ? '#e8c050' : '#e85a4a');
        A.sfx(s >= .7 ? 'good' : 'bad'); A.sfx('bubble');
        this.ri++; this.t = 0;
        if (this.ri >= this.reagents.length) { this.phase = 'heat'; this.t = 0; this.say(['Keep it in the band, Mr. G.', 'Not too hot. Not too hot!'][S.cooks % 2]); }
        else { this.zone = this.newZone(); this.needle = this.rand() < .5 ? 0 : 1; this.dir = this.needle ? -1 : 1; }
      }
      return;
    }
    if (this.phase === 'heat') {
      this.heatT += dt;
      const band = this.band();
      let on = this.held();
      if (this.demo || this.o.auto) on = this.temp < (band[0] + band[1]) / 2;
      const wob = Math.sin(this.heatT * 2.3) * .08 + Math.sin(this.heatT * 5.1) * .05;
      this.temp = clamp(this.temp + (on ? .34 : -.26) * dt + wob * dt, 0, 1);
      if (this.temp >= band[0] && this.temp <= band[1]) this.inBand += dt;
      if (game.time % .25 < dt) A.sfx('tick', { pitch: .5 + this.temp });
      if (this.heatT >= this.HEAT_LEN) { this.scores.heat = clamp(this.inBand / (this.HEAT_LEN - 1.5), 0, 1); this.flash(this.scores.heat > .85 ? 'STEADY HANDS' : this.scores.heat > .5 ? 'OKAY' : 'SCORCHED', this.scores.heat > .5 ? '#7ae07a' : '#e85a4a'); this.phase = 'cryst'; this.t = 0; this.ringT = .6; this.say('Now it crystallizes. Watch the rings.'); }
      return;
    }
    if (this.phase === 'cryst') {
      this.ringT -= dt;
      if (this.ringT <= 0 && this.ringI < 6) { this.rings.push({ t: 0, x: .3 + this.rand() * .4, y: .35 + this.rand() * .3, done: false }); this.ringI++; this.ringT = .75; }
      for (const g of this.rings) g.t += dt;
      const live = this.rings.find(g => !g.done);
      let press = this.pressed();
      if (live && (this.demo || this.o.auto)) press = Math.abs(this.ringR(live) - 9) < 1.2;
      if (live && press) {
        const err = Math.abs(this.ringR(live) - 9), s = err < 2.5 ? 1 : err < 6 ? .7 : err < 10 ? .35 : 0;
        live.done = true; live.s = s; this.scores.cryst.push(s); A.sfx(s >= .7 ? 'glass' : 'bad');
        this.flash(s >= 1 ? 'PERFECT' : s >= .7 ? 'GOOD' : s > 0 ? 'CLOUDY' : 'MISS', s >= .7 ? '#7ae07a' : '#e8c050');
      }
      for (const g of this.rings) if (!g.done && this.ringR(g) < 1) { g.done = true; g.s = 0; this.scores.cryst.push(0); this.flash('MISS', '#e85a4a'); A.sfx('bad'); }
      if (this.ringI >= 6 && this.rings.every(g => g.done)) { this.finish(); }
      return;
    }
    if (this.phase === 'result') {
      if (this.t > .8 && (this.pressed() || (this.demo || this.o.auto) && this.t > 2.5 || I.clicked())) this.close();
    }
  }
  band() { const g = this.glass ? .04 : 0; return [.56 - g, .74 + g]; }
  ringR(g) { return 40 - g.t * 30; }
  finish() {
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    const sc = .3 * avg(this.scores.measure) + .35 * this.scores.heat + .35 * avg(this.scores.cryst);
    this.score = sc;
    this.purity = Math.min(99.1, Math.round((70 + 27 * sc + (this.glass ? 3 : 0)) * 10) / 10);
    this.yield = 6 + (S.up.reactor ? 4 : 0);
    this.phase = 'result'; this.t = 0;
    A.sfx(this.purity >= 90 ? 'powerup' : 'coin');
    log('cook', this.purity);
  }
  close() {
    modal = null; I.consumeAll();
    if (this.phase === 'result') {
      const old = S.product * S.purity;
      S.product += this.yield; S.purity = Math.round((old + this.yield * this.purity) / S.product * 10) / 10;
      S.cooks++; S.best = Math.max(S.best, this.purity);
      if (W && W.onCook) W.onCook(this.purity, this.yield);
      music(W && W.kind === 'hub' ? 'cook' : 'town');
      story('cook', { purity: this.purity });
    }
  }
  draw(r) {
    const glass = this.glass;
    r.overlay(g => {
      const Wd = r.W, Hd = r.H;
      // the RV's interior: wood panelling, a window onto the desert, the bench
      px.rect(g, 0, 0, Wd, Hd, '#2a1c12');
      for (let x = 0; x < Wd; x += 12) px.rect(g, x, 0, 1, Hd * .62, '#22160e');
      px.rect(g, Wd * .62, 18, Wd * .3, 46, '#e8a060'); px.rect(g, Wd * .62, 44, Wd * .3, 20, '#c88050'); px.rect(g, Wd * .62, 56, Wd * .3, 8, '#a8603a');
      { const wx = Math.round(Wd * .62) - 3, ww = Math.round(Wd * .3) + 6; px.rect(g, wx, 15, ww, 3, '#5a3a22'); px.rect(g, wx, 64, ww, 3, '#5a3a22'); px.rect(g, wx, 15, 3, 52, '#5a3a22'); px.rect(g, wx + ww - 3, 15, 3, 52, '#5a3a22'); px.rect(g, wx + ww / 2 - 1, 15, 2, 52, '#5a3a22'); }
      px.rect(g, 0, Hd * .62, Wd, Hd * .38, '#5a5e62'); px.rect(g, 0, Hd * .62, Wd, 3, '#8a9296');
      // the bench: a condenser on a stand, a gas mask, the notebook with the formula, a box of glassware
      { const cy0 = Math.round(Hd * .62); px.rect(g, Math.round(Wd * .08), cy0 - 46, 3, 46, '#8a9296'); px.rect(g, Math.round(Wd * .08) - 6, cy0 - 2, 16, 2, '#5a5e62');
        for (let k = 0; k < 5; k++) px.rect(g, Math.round(Wd * .08) + 3, cy0 - 40 + k * 7, 14, 3, k % 2 ? '#a8d8e8' : '#c8eef8');
        px.line(g, Math.round(Wd * .08) + 17, cy0 - 40, Math.round(Wd * .28) - 6, cy0 - 62, '#c8e0e8', 2);
        px.disc(g, Math.round(Wd * .44), cy0 + 14, 8, '#3a3e42'); px.disc(g, Math.round(Wd * .44) - 4, cy0 + 12, 2, '#a8d8e8'); px.disc(g, Math.round(Wd * .44) + 4, cy0 + 12, 2, '#a8d8e8'); px.rect(g, Math.round(Wd * .44) - 3, cy0 + 18, 6, 6, '#5a5e62');
        px.rect(g, Math.round(Wd * .06), cy0 + 18, 40, 26, '#e8e0c8'); for (let k = 0; k < 5; k++) px.rect(g, Math.round(Wd * .06) + 4, cy0 + 22 + k * 4, 28 - (k % 3) * 6, 1, '#3a4a8a');
        E.font.text(g, 'C10H15N', Math.round(Wd * .06) + 2, cy0 + 46, '#c8c0a8', { font: 'tiny' });
        for (let k = 0; k < 4; k++) { const bx = Math.round(Wd * .52) + k * 12; px.rect(g, bx, cy0 - 14, 7, 14, '#d8eef4'); px.rect(g, bx + 1, cy0 - 7, 5, 6, ['#58c8f0', '#e8c050', '#a070d0', '#7ae07a'][k]); } }
      // the flask, glowing with whatever it is becoming
      const fx = Math.round(Wd * .28), fy = Math.round(Hd * .62);
      const col = this.phase === 'result' ? purityColor(this.purity) : this.phase === 'heat' ? mixHex('#c8b060', '#ff7040', this.temp) : this.phase === 'cryst' ? '#58c8f0' : '#c8d8a0';
      px.poly(g, [[fx - 6, fy - 64], [fx + 6, fy - 64], [fx + 6, fy - 40], [fx + 30, fy - 4], [fx - 30, fy - 4], [fx - 6, fy - 40]], '#d8eef4');
      px.poly(g, [[fx - 4, fy - 36], [fx + 4, fy - 36], [fx + 26, fy - 7], [fx - 26, fy - 7]], col);
      for (const b of this.bubbles) px.disc(g, fx - 18 + b.x * 36, fy - 10 - (1.4 - b.t) * 22, 1.5, '#ffffff');
      if (this.phase === 'heat') { const fl = 6 + this.temp * 10 + Math.sin(this.t * 30) * 2; px.poly(g, [[fx - 10, fy], [fx + 10, fy], [fx, fy - fl]], '#ff9a30'); px.poly(g, [[fx - 5, fy], [fx + 5, fy], [fx, fy - fl * .6]], '#ffe080'); }
      r.glowDisc(g, fx, fy - 20, 40, col, .35);
      // the panel: the stage's own gauge
      const px0 = Math.round(Wd * .5), pw = Math.min(Math.round(Wd * .46), 220), py0 = Math.round(Hd * .2);
      E.ui.box(g, px0 - 8, py0 - 10, pw + 16, 120, { bg: ['#1a2420', '#0a100e'], border: '#8ac8b0' });
      const stageName = { intro: 'COOK', measure: 'MEASURE: ' + (this.reagents[this.ri] || ''), heat: 'HEAT: HOLD ' + lbl('interact'), cryst: 'CRYSTALLIZE', result: 'BATCH COMPLETE' }[this.phase];
      E.font.text(g, stageName, px0 + pw / 2, py0 - 2, '#c8f0e0', { align: 'center', shadow: '#000' });
      if (this.phase === 'intro') E.font.title(g, 'LET\'S COOK', px0 + pw / 2, py0 + 40, { scale: 2, align: 'center', colors: ['#e8fff8', '#8ae0c8', '#3a9a80'] });
      if (this.phase === 'measure') {
        const bx = px0 + 6, bw = pw - 12, by = py0 + 40;
        px.rect(g, bx, by, bw, 14, '#2a3430');
        px.rect(g, bx + (this.zone.c - this.zone.w / 2) * bw, by, this.zone.w * bw, 14, '#3a8a4a');
        px.rect(g, bx + (this.zone.c - this.zone.w * .175) * bw, by, this.zone.w * .35 * bw, 14, '#6ae07a');
        const nx = Math.round(bx + this.needle * bw); px.rect(g, nx - 1, by - 6, 3, 26, '#ffffff'); px.poly(g, [[nx - 4, by - 8], [nx + 4, by - 8], [nx, by - 3]], '#ffffff');
        E.font.text(g, 'Reagent ' + (this.ri + 1) + ' of 3', px0 + pw / 2, by + 26, '#a8c8b8', { align: 'center' });
        E.font.text(g, 'Press ' + lbl('interact') + ' in the green', px0 + pw / 2, by + 44, '#e8fff0', { align: 'center', shadow: '#000' });
      }
      if (this.phase === 'heat') {
        const bx = px0 + pw / 2 - 10, by = py0 + 14, bh = 84, band = this.band();
        px.rect(g, bx, by, 20, bh, '#2a3430');
        px.rect(g, bx, by + (1 - band[1]) * bh, 20, (band[1] - band[0]) * bh, '#3a8a4a');
        px.rect(g, bx + 4, by + (1 - this.temp) * bh, 12, this.temp * bh, mixHex('#e8c050', '#ff4a30', this.temp));
        px.rect(g, bx - 6, Math.round(by + (1 - this.temp) * bh) - 1, 32, 3, '#ffffff');
        E.font.text(g, Math.round(60 + this.temp * 90) + ' C', bx + 34, by + (1 - this.temp) * bh - 3, '#ffffff', { shadow: '#000' });
        E.font.text(g, 'IN BAND ' + Math.round(this.inBand * 10) / 10 + 's', bx - 70, by + 10, '#a8c8b8');
        E.font.text(g, Math.max(0, Math.ceil(this.HEAT_LEN - this.heatT)) + 's', bx - 70, by + 24, '#e8fff0');
      }
      if (this.phase === 'cryst') {
        for (const gg of this.rings) {
          if (gg.done && gg.t > 3) continue;
          const cx = px0 + gg.x * pw, cy = py0 + 14 + gg.y * 80;
          ringPx(g, cx, cy, 9, gg.done ? (gg.s >= .7 ? '#6ae07a' : '#e85a4a') : '#8ac8b0');
          if (!gg.done) ringPx(g, cx, cy, Math.max(1, this.ringR(gg)), '#ffffff');
          else px.disc(g, cx, cy, 4, gg.s >= .7 ? '#58c8f0' : '#5a5040');
        }
        E.font.text(g, 'Press ' + lbl('interact') + ' as the white ring meets the green', px0 + pw / 2, py0 + 98, '#e8fff0', { align: 'center', shadow: '#000' });
      }
      if (this.phase === 'result') {
        E.font.title(g, this.purity.toFixed(1) + '%', px0 + pw / 2, py0 + 18, { scale: 3, align: 'center', colors: ['#ffffff', purityColor(this.purity), '#2a6a8a'], outline: '#06141a' });
        E.font.text(g, 'PURITY', px0 + pw / 2, py0 + 50, '#a8c8b8', { align: 'center' });
        E.font.text(g, '+' + this.yield + ' lbs of product', px0 + pw / 2, py0 + 66, '#e8fff0', { align: 'center' });
        E.font.text(g, this.purity >= 96 ? '"This is not meth. This is art."' : this.purity >= 90 ? '"Clean. Professional."' : this.purity >= 80 ? '"Street grade. Sellable."' : '"Embarrassing."', px0 + pw / 2, py0 + 82, '#c8b090', { align: 'center' });
        E.font.text(g, lbl('confirm') + ' continue', px0 + pw / 2, py0 + 100, '#ffffff', { align: 'center', shadow: '#000' });
      }
      if (this.msgT > 0 && this.msg) E.font.title(g, this.msg[0], px0 + pw / 2, py0 + 118 - (this.msgT * 8), { scale: 2, align: 'center', colors: ['#ffffff', this.msg[1], this.msg[1]], outline: '#000' });
      if (glass) E.font.text(g, 'LAB-GRADE GLASSWARE', 6, Hd - 12, '#58c8f0');
    });
  }
}
// a 1-pixel ring (the engine's shapes are filled; this steps round the circle in whole pixels)
function ringPx(g, cx, cy, rad, c) { const n = Math.max(12, Math.round(rad * 6)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), c); } }

// ---- 60-scenes.js ----
/* ---------------- colour helpers ---------------- */
const mixHex = (a, b, t) => { const pa = E.hex(a), pb = E.hex(b); const c = [0, 1, 2].map(i => Math.round(pa[i] + (pb[i] - pa[i]) * clamp(t, 0, 1))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

/* ---------------- saves ---------------- */
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(S)), place: 'Episode ' + S.ep + ': ' + (EPISODES[S.ep - 1] || EPISODES[4]).title, level: 'Day ' + S.day });
game.saves.read = save => { S = Object.assign(NEW_STATE(), save.data); };
function autosave() { if (W && W.demo) return; if (HUB) return; game.saves.save('auto'); }
function sceneForState() { return S.ep === 5 && S.step >= 1 ? 'lab' : 'town'; }
function newGame() { S = NEW_STATE(); seenTips.clear(); game.go('town', { fresh: true }, { fade: 'iris' }); }
function continueGame() { const s = game.saves.latest(); if (!s) return newGame(); game.saves.load(s.slot); game.go(sceneForState(), { load: true }); }

/* ---------------- the world's drawing: floor, walls, decor, signs, bodies, light ---------------- */
function lightLevel() {
  const c = S.clock;
  if (c >= 7 && c < 18) return 1; if (c >= 18 && c < 20) return lerp(1, .5, (c - 18) / 2); if (c >= 5 && c < 7) return lerp(.5, 1, (c - 5) / 2); return .45;
}
function drawTown(r) {
  const map = W.map, night = lightLevel() < .8;
  map.drawFloor(r); map.queueWalls(r);
  for (const [id, x, y, o] of SOLIDS) r.shape(id, x, y, 0, o);
  for (const [kind, id, x, y, o] of DECOR) {
    if (!r.visible(x, y, 0)) continue;
    if (kind === 'prop') r.prop(id, x, y, 0, id === 'streetlamp' ? { ...o, light: night, cone: night } : o); else r.shape(id, x, y, 0, o);
  }
  for (const [x, y, z, text, col] of SIGNS) if (r.visible(x, y, z)) r.textAt(x, y, z, text, col);
  // windows glow at night; the RV hums with a blue light when there's product cooking
  if (night) {
    for (const [x, y] of [[C(25), C(7)], [C(20), C(17)], [C(27), C(17)], [C(40), C(16)], [C(55), C(30)], [C(19), C(32)], [C(28), C(32)]]) L.add(x, y, 10, 50, .7, { color: '#ffc070' });
    L.add(SPOT.rv.x, SPOT.rv.y - 20, 12, 40, .6, { color: '#80d0ff' });
  }
}
function drawLab(r) {
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const [id, x, y, o] of LAB_SOLIDS) r.shape(id, x, y, 0, o);
  for (const [x, y] of [[C(6), C(6)], [C(25), C(6)], [C(6), C(13)], [C(25), C(13)], [C(15) + 8, C(10)]]) { L.add(x, y, 40, 90, .8, { color: '#d8f0ff' }); }
  L.add(LAB_SPOT.vela.x, LAB_SPOT.vela.y, 20, 50, .7, { color: '#ffd090' });
  r.textAt(C(15) + 8, C(4), 40, 'OFFICE', '#e8d8b8');
}
function drawActors(r) {
  if (game.settings.cones && W.agents.length) for (const a of W.agents) {
    if (a.stun > 0) continue;
    const col = a.state === 'alert' ? '#ff4030' : a.state === 'search' || a.state === 'notice' ? '#ffa030' : '#ffe080';
    r.sightCone(a, { map: W.map, range: (lightLevel() < .8 ? 85 : 115), fov: 1.35, color: col, alpha: a.state === 'calm' ? .22 : .35 });
  }
  for (const c of W.clouds) r.decal(() => r.groundDisc && r.groundDisc(c.x, c.y, c.r * Math.min(1, c.t), '#6a4a8a', .25));
  for (const b of W.buyers) { drawBody(r, b, { every: 2 }); r.textAt(b.x, b.y, 44, '$', '#9ae07a'); }
  for (const n of W.npcs) drawBody(r, n, {});
  for (const a of W.agents) {
    drawBody(r, a, {});
    if (a.state !== 'calm' && a.stun <= 0) r.textAt(a.x, a.y, 50, a.state === 'alert' ? '!!' : '?', a.state === 'alert' ? '#ff4030' : '#ffc040');
    if (a.stun > 0) r.textAt(a.x, a.y, 46, '@ @', '#d8c8f0');
  }
  for (const e of W.enemies) {
    if (e.dead && e.deadT > 6) continue;
    drawBody(r, e, { shadow: e.boss ? 10 : 7 });
    if (!e.dead && e.state === 'wind' && (e.kind === 'gunner' || e.kind === 'mack')) r.decal(() => r.groundArc(e.x, e.y, 4, 120, e.facing - .04, e.facing + .04, '#ff3020', .5));
    if (!e.dead && e.state === 'charge-wind') r.decal(() => r.groundArc(e.x, e.y, 4, 200, e.chargeDir - .08, e.chargeDir + .08, '#ff3020', .45));
    if (!e.dead && e.atk && e.atk.busy && e.kind === 'cousin' && e.atk.phase === 'wind') r.decal(() => r.groundRing(e.x + Math.cos(e.facing) * 16, e.y + Math.sin(e.facing) * 16, 18, '#ff3020', .6));
    if (!e.dead && !e.boss && e.hp < e.maxHp) r.queue(e.x, e.y, 48, g => { const p = r.w(e.x, e.y, 48); px.rect(g, p[0] - 8, p[1], 16, 2, '#3a0a0a'); px.rect(g, p[0] - 8, p[1], Math.round(16 * e.hp / e.maxHp), 2, '#e84a3a'); });
  }
  for (const h of W.heroes) if (h) drawBody(r, h, { xray: true });
  for (const [id, gh] of W.ghosts) if (gh.area === W.kind) {
    r.shadow(gh.x, gh.y, 6, .2);
    r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .55, outline: gh.color });
    r.textAt(gh.x, gh.y, 48, gh.name, gh.color);
  }
  for (const f of W.flasks) r.sprite(f.x, f.y, f.z, f.kind === 'fulm' ? SPR.flaskF : SPR.flaskS, { rot: f.spin, glow: .4 });
  W.shots.draw(r);
  if (W.lockArena && W.enemies.some(e => !e.dead)) r.decal(() => r.groundRing(W.lockArena.x, W.lockArena.y, W.lockArena.r, '#ff6040', .35));
  // what the mouse or the prompt points at
  if (W.near) r.decal(() => r.groundRing(W.near.x, W.near.y, 10 + Math.sin(game.time * 6), '#ffd36a', .8));
  if (W.hover && W.hover !== W.near) r.decal(() => r.groundRing(W.hover.x, W.hover.y, 10, '#ffffff', .6));
  // the objective marker
  const st = curStep();
  if (st && st.at && !W.demo && W.kind !== 'hub') { const p = st.at(); if (p && (!W.near || dist(W.near, p) > 2)) r.marker(p.x, p.y, 30, { label: '', color: '#ffd040' }); }
}

/* ---------------- the HUD (screen pixels; big, sparse, readable at ten feet) ---------------- */
function drawHUD(r) {
  const h = W.hero; if (!h) return;
  r.overlay(g => {
    const pad = 6;
    // health, cash, product
    E.ui.box(g, pad, pad, 118, 50, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
    px.sprite(g, SPR.heart, pad + 6, pad + 6);
    E.ui.bar(g, pad + 18, pad + 7, 92, 6, h.hp / h.maxHp, h.hp > 35 ? '#e8503a' : '#ff2a1a');
    px.sprite(g, SPR.cash, pad + 5, pad + 20); E.font.text(g, fmt$(S.dirty), pad + 18, pad + 19, '#9ae07a', { shadow: '#000' });
    E.font.text(g, fmt$(S.clean), pad + 112, pad + 19, '#ffffff', { align: 'right', shadow: '#000' });
    px.sprite(g, SPR.baggie, pad + 6, pad + 33); E.font.text(g, (Math.round(S.product * 10) / 10) + ' lbs', pad + 18, pad + 33, '#c8f0ff', { shadow: '#000' });
    if (S.product > 0) E.font.text(g, S.purity.toFixed(1) + '%', pad + 112, pad + 33, purityColor(S.purity), { align: 'right', shadow: '#000' });
    // heat and the clock, top right (clear of the corner's buttons when they show)
    const ca = game.cornerArea(), top = ca ? ca.y1 + 4 : pad;
    if (W.kind === 'town') {
      E.ui.box(g, r.W - pad - 92, top, 92, 34, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
      E.font.text(g, 'HEAT', r.W - pad - 86, top + 5, S.heat >= 75 ? '#ff5040' : '#e8d8b8');
      for (let i = 0; i < 5; i++) px.sprite(g, S.heat >= (i + 1) * 20 - 10 ? SPR.badge : SPR.badgeOff, r.W - pad - 60 + i * 11, top + 4);
      const hh = Math.floor(S.clock), mm = Math.floor((S.clock % 1) * 6) * 10, ap = hh >= 12 ? 'PM' : 'AM';
      E.font.text(g, 'DAY ' + S.day + '  ' + (((hh + 11) % 12) + 1) + ':' + String(mm).padStart(2, '0') + ' ' + ap, r.W - pad - 86, top + 19, '#c8b090');
    }
    // the objective, top centre
    if (W.kind !== 'hub') {
      const t = objText();
      if (t) {
        const narrow = r.W < 420;
        const w = narrow ? Math.min(r.W - 12, E.font.width(t) + 24) : Math.min(r.W - 260, Math.max(140, E.font.width(t) + 24)), x = Math.round((r.W - w) / 2), oy = narrow ? 60 : pad;
        E.ui.box(g, x, oy, w, 26, { bg: ['#2a1e14', '#120a06'], border: '#c8a060', alpha: .85 });
        E.font.text(g, 'EPISODE ' + S.ep + ' • ' + (EPISODES[S.ep - 1] || EPISODES[4]).title, r.W / 2, oy + 4, '#c8a060', { align: 'center' });
        E.font.text(g, t, r.W / 2, oy + 14, '#fff4d0', { align: 'center', shadow: '#000' });
      }
    }
    // flasks and the gun, bottom left
    const by = r.H - pad - 30;
    E.ui.box(g, pad, by, 104, 30, { bg: ['#2a1e14', '#120a06'], border: '#8a6a4a', alpha: .82 });
    const kinds = S.flags.smoke ? ['fulm', 'smoke'] : ['fulm'];
    kinds.forEach((k, i) => {
      const x = pad + 6 + i * 30, on = S.sel === k;
      if (on) px.rect(g, x - 2, by + 3, 26, 14, '#6a4a22');
      px.sprite(g, k === 'fulm' ? SPR.flaskF : SPR.flaskS, x, by + 5);
      E.font.text(g, '×' + S.flasks[k], x + 8, by + 6, on ? '#fff4d0' : '#a89878');
    });
    E.font.text(g, lbl('throw') + ' throw' + (S.flags.smoke ? '  ' + lbl('cycle') : ''), pad + 6, by + 19, '#c8b090', { font: 'tiny' });
    if (h.gun) E.font.text(g, h.reload > 0 ? 'RELOAD' : h.ammo + '/8', pad + 98, by + 6, h.reload > 0 ? '#ff9a4a' : '#ffe080', { align: 'right' });
    // the prompt: what pressing interact (or clicking) does here
    const tgt = W.near || W.hover;
    if (tgt && !modal) {
      const near = tgt === W.near, s = (near ? lbl('interact') : (isPad() ? '' : 'Click')) + '  ' + tgt.label + (near ? '' : (dist(tgt, h) > 60 ? ' (walk there)' : ''));
      const w = E.font.width(s) + 20, x = Math.round((r.W - w) / 2), y = r.H - pad - 22;
      E.ui.box(g, x, y, w, 20, { bg: ['#4a3420', '#1a1008'], border: '#ffd36a', alpha: .9 });
      E.font.text(g, s, r.W / 2, y + 6, '#fff4d0', { align: 'center', shadow: '#000' });
    }
    // a boss's bar
    const boss = W.enemies.filter(e => e.boss && !e.dead);
    boss.forEach((e, i) => {
      const w = Math.min(220, r.W - 160), x = Math.round((r.W - w) / 2), y = r.H - 60 - i * 18;
      E.font.text(g, e.name || e.kind.toUpperCase(), x, y - 9, '#ffd0c0', { shadow: '#000' });
      E.ui.bar(g, x, y, w, 6, e.hp / e.maxHp, e.stun > 0 ? '#ffd040' : '#d83a2a');
    });
    // player 2
    if (W.partner && !W.partner.ai) { E.font.text(g, 'P2 DUSTY', r.W - pad - 92, r.H - pad - 40, '#ff8a7a', { shadow: '#000' }); E.ui.bar(g, r.W - pad - 92, r.H - pad - 30, 60, 5, W.partner.hp / 100, '#e8503a'); if (W.partner.down) E.font.text(g, 'DOWN ' + Math.ceil(W.partner.downT), r.W - pad - 26, r.H - pad - 31, '#ffffff'); }
    else if (W.kind !== 'hub' && W.partner && W.t < 30 && !W.demo) E.font.text(g, 'P2: Start on pad 2, or 2', r.W - pad, r.H - pad - 10, '#a89878', { align: 'right', font: 'tiny' });
    // the radar (DEA dots with the burner phones)
    if (W.kind === 'town' && (S.up.phone || W.agents.some(a => a.state === 'alert'))) {
      const R = 26, cx = r.W - pad - R - 2, cy = r.H - pad - R - 50;
      px.disc(g, cx, cy, R, '#1a140c'); ringPx(g, cx, cy, R, '#8a6a4a');
      for (const a of W.agents) { const dx = (a.x - h.x) / 6, dy = (a.y - h.y) / 6; if (Math.hypot(dx, dy) < R - 2) px.rect(g, Math.round(cx + dx) - 1, Math.round(cy + dy) - 1, 3, 3, a.state === 'alert' ? '#ff4030' : '#4a8aff'); }
      for (const b of W.buyers) { const dx = (b.x - h.x) / 6, dy = (b.y - h.y) / 6; if (Math.hypot(dx, dy) < R - 2) px.dot(g, Math.round(cx + dx), Math.round(cy + dy), '#9ae07a'); }
      px.rect(g, cx - 1, cy - 1, 3, 3, '#ffffff');
      E.font.text(g, 'RADAR', cx, cy + R + 2, '#a89878', { align: 'center', font: 'tiny' });
    }
    // toasts and the episode card
    { let ty = r.W < 420 ? 92 : 64; for (const t of toasts) { const lines = E.font.wrap(t.text, Math.min(r.W - 40, 380)), w = Math.min(r.W - 20, Math.max(...lines.map(l => E.font.width(l))) + 20), x = Math.round((r.W - w) / 2), hh = 8 + lines.length * 10; E.ui.box(g, x, ty, w, hh, { bg: ['#1a2a3a', '#0a1018'], border: '#8ab0d0', alpha: .9 }); lines.forEach((l, k) => E.font.text(g, l, r.W / 2, ty + 5 + k * 10, '#e8f4ff', { align: 'center' })); ty += hh + 3; } }
    if (card) {
      const a = Math.min(1, card.t, (card.max - card.t) * 3), y = Math.round(r.H * .36);
      px.blend(g, .7 * a, 'normal', () => px.rect(g, 0, y - 10, r.W, 54, '#000000'));
      E.font.text(g, card.a, r.W / 2, y - 4, '#c8a060', { align: 'center' });
      E.font.title(g, card.b, r.W / 2, y + 8, { scale: 3, align: 'center', colors: ['#fff4d0', '#ffd36a', '#a8602a'], outline: '#140804' });
    }
    if (W.demo) { const blink = Math.floor(game.time * 2) % 2; E.font.title(g, TITLE, r.W / 2, r.H - 52, { scale: 2, align: 'center', colors: ['#d8f0d8', '#5ab04a', '#2a6a2a'], outline: '#061006' }); if (blink) E.font.text(g, 'DEMO  •  PRESS ANY BUTTON', r.W / 2, r.H - 30, '#ffffff', { align: 'center', shadow: '#000' }); if (W.caption) E.font.title(g, W.caption, r.W / 2, 64, { scale: 2, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' }); }
  });
}

/* ---------------- the ledger: the run at a glance (one page, big type) ---------------- */
class Ledger {
  constructor() { this.kind = 'ledger'; this.t = 0; I.consumeAll(); A.sfx('pause'); }
  update(dt) { this.t += dt; if (this.t > .1 && (I.pressed('ledger') || I.pressed('cancel') || I.pressed('confirm') || I.clicked())) { modal = null; I.consumeAll(); A.sfx('cancel'); } }
  draw(r) {
    r.overlay(g => {
      const w = Math.min(r.W - 20, 340), h = 190, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#e8dcc0', '#c8b898'], border: '#5a3a1a' });
      for (let ly = y + 30; ly < y + h - 8; ly += 12) px.rect(g, x + 6, ly, w - 12, 1, '#b8a888');
      E.font.title(g, 'THE LEDGER', r.W / 2, y + 8, { scale: 2, align: 'center', colors: ['#3a2a1a', '#2a1a0a', '#1a0a00'], outline: false });
      const L1 = [['Episode', S.ep + ' • ' + (EPISODES[S.ep - 1] || EPISODES[4]).title], ['Next', objText()], ['Day', String(S.day)], ['Dirty cash', fmt$(S.dirty)], ['Clean cash', fmt$(S.clean)], ['Product', (Math.round(S.product * 10) / 10) + ' lbs at ' + S.purity.toFixed(1) + '%'], ['Best batch', S.best ? S.best.toFixed(1) + '%' : '-'], ['Deals / cooks', S.deals + ' / ' + S.cooks], ['Heat', Math.round(S.heat) + ' of 100'], ['Owned', UPGRADES.filter(u => S.up[u.id] && !u.repeat).map(u => u.id).join(', ') || 'nothing yet']];
      L1.forEach(([k, v], i) => { E.font.text(g, k, x + 14, y + 33 + i * 14, '#5a3a1a'); E.font.text(g, v, x + 100, y + 33 + i * 14, '#1a0a00', { wrap: w - 110 }); });
      E.font.text(g, lbl('ledger') + ' close', r.W / 2, y + h + 6, '#ffffff', { align: 'center', shadow: '#000' });
    });
  }
}

/* ---------------- play in the world: the parts every play scene shares ---------------- */
function enterLevel(kind, data) {
  const map = kind === 'lab' ? lab : town;
  newLevel(kind === 'hub' ? 'hub' : kind, map);
  game.cam.bounds = v => map.bounds(v);
  L.enabled = true;
  let at = kind === 'lab' ? LAB_SPOT.start : SPOT.heroStart;
  if (data && data.at === 'home') at = { x: SPOT.home.x, y: SPOT.home.y + 18 };
  const hero = makeHero('hollis', at.x, at.y, I);
  W.hero = hero; W.heroes = [hero];
  W.partnerJoin = () => { if (W.partner) return; const p = makeHero('dusty', hero.x - 20, hero.y + 6, null); W.partner = p; W.heroes.push(p); };
  if (kind !== 'hub' && !(S.ep === 1 && S.step === 0)) W.partnerJoin();
  if (kind !== 'hub') game.allowJoin({ max: 2, onJoin: (inp) => { W.partnerJoin(); W.partner.input = inp; W.partner.ai = false; W.partner.hp = 100; inp.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation'; toast('Player 2 joined as Dusty.'); A.sfx('oneup'); } });
  game.follow(hero, { z: 14 });
  modal = null; toasts.length = 0; card = null;
}
function exitLevel() { game.allowJoin(false); L.enabled = false; modal = null; game.cam.frame(null); }
function playUpdate(dt) {
  W.t += dt;
  for (const t of toasts) t.t -= dt; E.prune(toasts, t => t.t <= 0);
  if (card) { card.t -= dt; if (card.t <= 0) card = null; }
  if (talk.update(dt)) { stopHeroes(dt); npcsUpdate(dt); return true; }
  if (modal) { modal.update(dt); stopHeroes(dt); return true; }
  if (W.dead || W.busted) return true;
  const h = W.hero;
  if (I.pressed('view')) { game.nextView(); game.note(game.view.label || game.view.id); }
  if (I.pressed('ledger') && !W.demo) { modal = new Ledger(); return true; }
  // the controls: the person (or the demo's script)
  if (!W.demo) readCtl(I, h);
  // what's in reach, and what the mouse points at
  const list = interactables();
  let near = null, nd = 26;
  for (const o of list) { const d = dist(o, h); if (d < nd) { nd = d; near = o; } }
  W.near = near; W.hover = null;
  const mp = I.pointer();
  if (mp && I.aimSource === 'mouse' && W.screenPts) for (const o of list) { const p = W.screenPts.get(o.id + o.x); if (p && Math.hypot(p[0] - mp[0], p[1] - mp[1]) < 16) { W.hover = o; break; } }
  if (W.hover && h.ctl.attack && !W.combat) { h.ctl.attack = false; if (dist(W.hover, h) < 60) { W.hover.act(); return true; } W.walkTo = W.hover; }
  if (near && h.ctl.interact && !W.demo) { W.walkTo = null; near.act(); return true; }
  if (W.walkTo) { const t = W.walkTo, d = dist(t, h); if (Math.hypot(h.ctl.mx, h.ctl.my) > .2 || d > 400) W.walkTo = null; else if (d < 20) { W.walkTo = null; t.act(); return true; } else { const a = angTo(h, t); h.ctl.mx = Math.cos(a); h.ctl.my = Math.sin(a); } }
  for (const p of W.heroes) {
    if (p === W.partner) { if (p.ai) partnerAI(p, dt); else readCtl(p.input, p); }
    heroUpdate(p, dt);
    if (W.lockArena && W.enemies.some(e => !e.dead)) { const L0 = W.lockArena, d = Math.hypot(p.x - L0.x, p.y - L0.y); if (d > L0.r) { p.x = L0.x + (p.x - L0.x) / d * L0.r; p.y = L0.y + (p.y - L0.y) / d * L0.r; } }
  }
  const wasCombat = W.combat;
  for (const e of W.enemies) enemyUpdate(e, dt);
  W.combat = W.enemies.some(e => !e.dead);
  if (wasCombat && !W.combat) { W.lockArena = null; E.prune(W.enemies, e => e.dead && e.deadT > 6); music(W.kind === 'lab' ? 'boss' : 'town'); story('clear'); }
  else if (!wasCombat && W.combat && songNow !== 'boss') music('fight');
  W.shots.update(dt, W.map);
  W.shots.hit(W.enemies.filter(e => !e.dead), (b, e) => { hurtEnemy(e, b.dmg, Math.atan2(b.vy, b.vx), 90); b.life = 0; }, 'player');
  W.shots.hit(W.heroes.filter(x => x && !x.down), (b, x) => { if (hurtHero(x, b.dmg, Math.atan2(b.vy, b.vx), 90)) b.life = 0; }, 'enemy');
  flasksUpdate(dt);
  if (W.kind === 'town') {
    syncAgents(); for (const a of W.agents) agentUpdate(a, dt);
    if (!W.agents.some(a => a.state === 'alert')) { S.heat = Math.max(0, S.heat - dt / 6); if (A.layer) A.layer('tension', 0, 1); }
  }
  buyersUpdate(dt); npcsUpdate(dt);
  S.time += dt; S.clock = (S.clock + dt / 30) % 24; S.hp = h.hp;
  // the camera: one hero, or both
  if (W.partner && !W.partner.ai) game.cam.frame([h, W.partner], { margin: 70, zoom: [.7, 1] }); else game.cam.frame(null);
  return false;
}
/* the story's people, standing where the story needs them */
function wantedNpcs() {
  const st = curStep(), id = st && st.id, out = [];
  if (W.kind === 'town') {
    if (!W.partner) out.push(['dusty', SPOT.dusty.x, SPOT.dusty.y - 4]);
    out.push(['skyler', SPOT.skyler.x, SPOT.skyler.y - 4]);
    if (S.ep === 1 && !W.rafaFled) out.push(['rafa', SPOT.rafa.x, SPOT.rafa.y - 4]);
    if (S.ep >= 2) out.push(['lenny', SPOT.lenny.x + 16, SPOT.lenny.y + 2]);
    if (S.ep === 3) out.push(['vela', SPOT.taco.x + 14, SPOT.taco.y + 2]);
  }
  if (W.kind === 'lab' && (id === 'labclear' || id === 'final')) out.push(['vela', LAB_SPOT.vela.x, LAB_SPOT.vela.y - 4]);
  return out;
}
function npcsUpdate(dt) {
  if (W.kind === 'hub') return;
  const want = wantedNpcs(), ids = new Set(want.map(w => w[0]));
  for (const n of W.npcs) if (!ids.has(n.id)) { n.gone = true; if (W.t > .5) P.smoke(n.x, n.y, 8, 6); }
  E.prune(W.npcs, n => n.gone);
  for (const [id, x, y] of want) {
    let n = W.npcs.find(q => q.id === id);
    if (!n) { n = { id, x, y, z: 0, hurtT: 0, facing: Math.PI / 2, rig: (RIGS[id] || RIGS.thug)(), t: 0 }; W.npcs.push(n); }
    n.x = x; n.y = y; n.t += dt;
    const h = W.hero, d = h ? dist(n, h) : 999;
    n.facing = d < 90 ? angTo(n, h) : Math.PI / 2;
    n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.facing, pose: id === 'lenny' && d > 60 ? 'wave' : id === 'vela' || id === 'rafa' ? 'hips' : undefined });
  }
}
function stopHeroes(dt) { for (const p of W.heroes) if (p) { p.vx = p.vy = 0; p.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.facing }); } }
function partnerAI(p, dt) {
  const c = p.ctl, h = W.hero; Object.assign(c, blankCtl());
  const d = dist(p, h);
  if (d > 260) { p.x = h.x - Math.cos(h.facing) * 18; p.y = h.y - Math.sin(h.facing) * 18; }
  const tgt = nearestEnemy(p, 170);
  if (d > 30) { const a = angTo(p, h); c.mx = Math.cos(a); c.my = Math.sin(a); c.sprint = d > 80; }
  if (tgt) { c.aim = angTo(p, tgt); p.aiming = .4; if (p.cool <= 0 && p.reload <= 0 && W.map.sight(p, tgt) && E.chance(dt * 2)) c.attack = true; if (d < 60 && dist(p, tgt) < 50) { c.mx = -Math.cos(c.aim); c.my = -Math.sin(c.aim); } }
}
function playDraw(r) {
  const lv = lightLevel();
  L.ambient = W.kind === 'lab' ? .55 : lv;
  if (W.kind === 'lab') drawLab(r); else drawTown(r);
  drawActors(r);
  // where each interactable sits on screen (for the mouse)
  W.screenPts = W.screenPts || new Map(); W.screenPts.clear();
  for (const o of interactables()) W.screenPts.set(o.id + o.x, r.w(o.x, o.y, 14));
  drawHUD(r);
  if (modal) modal.draw(r);
  talk.draw(r);
}

/* ---------------- the attract mode's demo: a cheating AI shows the game off ---------------- */
let savedS = null;
function* demoWalk(to, max = 8) {
  const h = W.hero; let t = 0; h.noclip = true;
  while (dist(h, to) > 12 && t < max) { const a = angTo(h, to); h.ctl.mx = Math.cos(a); h.ctl.my = Math.sin(a); h.ctl.sprint = true; t += 1 / 120; yield; }
  h.ctl.mx = h.ctl.my = 0; h.ctl.sprint = false;
}
function* demoFight(sec) {
  const h = W.hero; let t = 0, k = 0;
  while (t < sec && W.enemies.some(e => !e.dead)) {
    const e = nearestEnemy(h, 300);
    Object.assign(h.ctl, { attack: false, throw: false, mx: 0, my: 0 });
    if (e) {
      h.ctl.aim = angTo(h, e); h.ctl.aimPt = { x: e.x, y: e.y };
      const d = dist(h, e); if (d > 90) { h.ctl.mx = Math.cos(h.ctl.aim); h.ctl.my = Math.sin(h.ctl.aim); } else if (d < 40) { h.ctl.mx = -Math.cos(h.ctl.aim) * .6; h.ctl.my = -Math.sin(h.ctl.aim) * .6; }
      if (k % 50 === 0) h.ctl.attack = true;
      if (k % 150 === 75) { h.ctl.throw = true; S.sel = (k / 150) % 2 < 1 ? 'fulm' : 'smoke'; }
      if (k % 200 === 120) h.ctl.dodge = true; else h.ctl.dodge = false;
    }
    k++; t += 1 / 120; yield;
  }
  Object.assign(h.ctl, blankCtl());
}
function* demoScript() {
  const h = W.hero;
  W.caption = 'COOK IN THE BACKYARD'; yield* demoWalk(SPOT.rv, 4); yield .3;
  modal = new Cook({ auto: true }); yield E.until(() => !modal); W.caption = null;
  W.caption = 'FIGHT WITH CHEMISTRY'; h.noclip = true; yield* demoWalk({ x: C(24), y: C(20) }, 6);
  for (let i = 0; i < 4; i++) makeEnemy(i % 2 ? 'gunner' : 'thug', h.x + Math.cos(i * 1.6) * 90, h.y + Math.sin(i * 1.6) * 70);
  yield* demoFight(14);
  W.caption = 'THE DEA IS WATCHING'; yield* demoWalk({ x: C(31), y: C(23) }, 4); yield* demoWalk({ x: C(47), y: C(23) }, 6);
  W.caption = 'SELL ON THE CORNERS'; const b = W.buyers[0];
  if (b) { yield* demoWalk(b, 8); P.text(b.x, b.y, 34, '+$1,840', '#9ae07a', { scale: 1 }); A.sfx('cash'); S.dirty += 1840; E.prune(W.buyers, x => x === b); yield 1; }
  W.caption = 'LAUNDER THE CASH'; yield* demoWalk(SPOT.carwash, 8); S.clean += Math.floor(S.dirty * .8); S.dirty = 0; A.sfx('cash'); P.glints(h.x, h.y, 24, 12, '#c8f0ff'); yield 1.2;
  W.caption = 'TAKE ON THE CARTEL'; yield* demoWalk({ x: C(40), y: C(20) }, 4);
  makeEnemy('cousin', h.x - 70, h.y - 30, { i: 0, name: 'EZEQUIEL CALACA' }); makeEnemy('cousin', h.x + 70, h.y - 30, { i: 1, name: 'TOMAS CALACA' }); music('boss');
  yield* demoFight(12);
  W.caption = null; yield 1;
  game.go('title', { fromDemo: true });
}

/* ---------------- scenes ---------------- */
const isTouchOnly = () => touchOnly();
const titleItems = () => {
  if (isTouchOnly()) return [{ label: 'SETTINGS', act: () => game.menu('settings') }];
  const save = game.saves.latest();
  return [
    save ? { label: 'CONTINUE', note: save.place + ' • ' + save.level, act: continueGame } : null,
    { label: 'NEW GAME', note: 'Five episodes. One backyard.', act: newGame },
    { label: 'SETTINGS', note: 'Sound, display, button prompts, stick inversion.', act: () => game.menu('settings') },
    { label: 'CONTROLS', note: 'Rebind keys and buttons.', act: () => game.menu('controls') },
    { label: 'ABOUT & CREDITS', note: 'How this was made.', act: () => game.go('about') }
  ].filter(Boolean);
};
const titleBg = new E.Backdrop({ sky: ['#1a1030', '#6a2a3a', '#e87a3a', '#f8c070'], sun: { x: .72, y: .62, r: 26, color: '#ffe0a0' }, layers: [
  { kind: 'mountains', color: '#5a2a32', y: .62, height: .2, parallax: .1 }, { kind: 'hills', color: '#3a1a22', y: .74, height: .12, parallax: .2 }, { kind: 'hills', color: '#22100e', y: .84, height: .1, parallax: .3 }] });
const titleRig = RIGS.hollis(true);
const scenes = {};
scenes.title = {
  enter(data) {
    this.idle = 0; this.i = 0; this.t = 0; this.rows = []; this.lastMouse = I.mouse ? I.mouse.t : 0; music('title'); L.enabled = false;
    if (savedS) { S = savedS; savedS = null; }
    game.view && game.setView('threequarter');
    I.consumeAll();
  },
  update(dt) {
    this.t += dt; titleRig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'hips' });
    const items = titleItems();
    const mouseMoved = I.mouse && I.mouse.t !== this.lastMouse; if (I.mouse) this.lastMouse = I.mouse.t;
    if (I.anyPressed() || mouseMoved || I.clicked()) this.idle = 0; else this.idle += dt;
    if (this.idle > 10) { this.idle = 0; game.go('town', { demo: true }, { fade: 'dissolve' }); return; }
    this.i = clamp(this.i, 0, items.length - 1);
    if (I.repeat('down')) { this.i = (this.i + 1) % items.length; A.sfx('select'); }
    if (I.repeat('up')) { this.i = (this.i + items.length - 1) % items.length; A.sfx('select'); }
    const p = I.pointer();
    if (p && mouseMoved) this.rows.forEach((rw, k) => { if (p[0] >= rw[0] && p[0] <= rw[2] && p[1] >= rw[1] && p[1] <= rw[3] && this.i !== k) { this.i = k; A.sfx('tick'); } });
    const c = I.clicked(); let pick = this.t > .3 && (I.pressed('confirm') || I.pressed('start') || I.pressed('interact'));
    if (c) this.rows.forEach((rw, k) => { if (c[0] >= rw[0] && c[0] <= rw[2] && c[1] >= rw[1] && c[1] <= rw[3]) { this.i = k; pick = true; } });
    if (pick && items[this.i]) { A.sfx('confirm'); items[this.i].act(); }
  },
  draw(r) {
    titleBg.draw(r);
    const items = titleItems();
    r.overlay(g => {
      const cx = Math.round(r.W * .42), ty = Math.round(r.H * .16);
      // the title, in the periodic table's style: Br (bromine, 35) and Ba (barium, 56)
      const el = (x, y, sym, num) => { E.ui.box(g, x, y, 34, 34, { bg: ['#3a8a3a', '#1a5a1a'], border: '#c8f0c8' }); E.font.text(g, String(num), x + 3, y + 3, '#e8ffe8', { font: 'tiny' }); E.font.title(g, sym, x + 17, y + 11, { scale: 2, align: 'center', colors: ['#ffffff', '#e8ffe8', '#a8e0a8'], outline: '#0a2a0a' }); };
      el(cx - 112, ty - 4, 'Br', 35); E.font.title(g, 'EAKING', cx - 72, ty + 6, { scale: 2, colors: ['#ffffff', '#e8f0e0', '#a8c098'], outline: '#0a140a', depth: 2, depthColor: '#1a2a1a' });
      el(cx - 92, ty + 34, 'Ba', 56); E.font.title(g, 'CKYARD', cx - 52, ty + 44, { scale: 2, colors: ['#ffffff', '#e8f0e0', '#a8c098'], outline: '#0a140a', depth: 2, depthColor: '#1a2a1a' });
      E.font.text(g, 'a chemistry teacher, an RV, and a very bad idea', cx - 8, ty + 74, '#ffe8c8', { align: 'center', shadow: '#000' });
      if (r.W > r.H) titleRig.drawPortrait(g, Math.round(r.W * .76), Math.round(r.H * .2), Math.min(110, Math.round(r.H * .42)), { zoom: 1.6, turn: -.35, bg: null, frame: false });
      else titleRig.drawPortrait(g, Math.round(r.W / 2) - 50, Math.round(r.H * .66), 100, { zoom: 1.6, turn: -.35, bg: null, frame: false });
      // the menu
      this.rows = [];
      const my = Math.max(Math.round(r.H * .52), ty + 96);
      if (isTouchOnly()) {
        E.ui.box(g, cx - 120, my - 8, 240, 30, { bg: ['#3a1a1a', '#1a0808'], border: '#ff8a6a' });
        E.font.text(g, 'Controller or keyboard required', cx, my + 3, '#ffe0d0', { align: 'center' });
      }
      items.forEach((it, k) => {
        const y = my + (isTouchOnly() ? 34 : 0) + k * 18, on = k === this.i, w = 150;
        this.rows.push([cx - w / 2, y - 4, cx + w / 2, y + 12]);
        if (on) { E.ui.box(g, cx - w / 2, y - 4, w, 16, { bg: ['#6a4a22', '#3a2410'], border: '#ffd36a' }); }
        E.font.text(g, it.label, cx, y + 1, on ? '#fff4d0' : '#e8d8b8', { align: 'center', shadow: '#000', scale: 1 });
      });
      const it = items[this.i];
      if (it && it.note) E.font.text(g, it.note, cx, my + items.length * 18 + 8, '#c8b090', { align: 'center', shadow: '#000' });
      E.font.text(g, isTouchOnly() ? 'Connect a controller or keyboard to play  •  a demo starts by itself' : (isPad() ? lbl('confirm') + ' select' : 'Enter or click to select') + '   •   2 players: Start on a second pad, or 2', r.W / 2, r.H - 26, '#e8d8b8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'An original game inspired by Breaking Bad • my-3D2dge ' + E.version, r.W / 2, r.H - 12, '#a08870', { align: 'center', font: 'tiny' });
    });
  }
};
scenes.town = {
  get pausable() { return !modal; }, view: 'threequarter', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) {
    if (data.demo) { savedS = S; S = Object.assign(NEW_STATE(), { ep: 3, step: 1, dirty: 2400, clean: 6000, product: 6, purity: 96.2, flags: { smoke: true, shop: true }, flasks: { fulm: 3, smoke: 3 }, up: { pistol: true }, clock: 17.5, heat: 30, alias: true }); }
    enterLevel('town', data);
    if (data.demo) {
      W.demo = true; W.hero.input = null;
      for (let i = 0; i < 3; i++) makeAgent(i, i * 200, i);
      for (let i = 0; i < 3; i++) spawnBuyer();
      this.viewT = 0; this.mouseT = I.mouse ? I.mouse.t : 0; this.demoT = 0;
      game.script(demoScript);
      music('town');
      return;
    }
    if (data.fresh) { stepEnter(); autosave(); }
    else { const st = curStep(); if (st && ON_ENTER[st.id] && (st.id === 'fight1' || st.id === 'cousins')) ON_ENTER[st.id](); else if (st && ON_ENTER[st.id]) ON_ENTER[st.id](); }
    if (S.ep === 1 && S.step >= 3) W.rafaFled = true;
    if (S.ep >= 2) for (let i = 0; i < 3; i++) spawnBuyer();
    if (data.cook) modal = new Cook({});
    music(W.combat || W.enemies.length ? (songNow === 'boss' ? 'boss' : 'fight') : 'town');
    if (!W.enemies.length) music('town');
  },
  exit() { exitLevel(); },
  update(dt) {
    if (W.demo) {
      this.demoT += dt;
      const mm2 = I.mouse && I.mouse.t !== this.mouseT;
      if ((I.anyPressed() || I.clicked() || mm2) && this.demoT > .5) { game.go('title', { fromDemo: true }); return; }
      this.viewT += dt; if (this.viewT > 9) { this.viewT = 0; game.nextView(); }
    }
    if (playUpdate(dt)) return;
    const st = curStep();
    if (st && st.ev === 'arena' && dist(W.hero, SPOT.arena) < 70) story('arena');
  },
  draw(r) { playDraw(r); }
};
scenes.lab = {
  get pausable() { return !modal; }, view: 'threequarter', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data = {}) {
    enterLevel('lab', data);
    const st = curStep();
    if (st && st.id === 'labclear') {
      for (const [x, y, k] of [[6, 7, 'gunner'], [25, 7, 'gunner'], [8, 12, 'thug'], [23, 12, 'thug'], [15, 9, 'gunner']]) makeEnemy(k, C(x), C(y));
      const m = makeEnemy('mack', LAB_SPOT.mack.x, LAB_SPOT.mack.y, { name: 'MACK, THE CLEANER' }); m.cd = 2.5;
      game.after(.6, () => convo([['mack', ['No half measures. Not today, Mr. Gray.']], ['dusty', ['Mr. G, that\'s the cleaner guy. The one who cleans PEOPLE.']]]));
      music('boss');
      W.say = id => { if (id === 'mack_adds') say('mack', ['Boys. Clean this up.'], { modal: false, auto: 2 }); };
    } else music('ending');
  },
  exit() { exitLevel(); },
  update(dt) { playUpdate(dt); },
  draw(r) { playDraw(r); }
};
scenes.night = {
  enter() { this.t = 0; this.done = false; music('ending'); this.rigs = [speaker('dale').rig, speaker('skyler').rig, RIGS.hollis(S.alias)]; sleepNow(); },
  update(dt) {
    this.t += dt;
    for (const rg of this.rigs) rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 });
    if (talk.update(dt)) return;
    if (this.t > 1.2 && !this.done) { this.done = true; if (S.ep > EPISODES.length) return; game.go(sceneForState(), { at: 'home' }, { fade: 'dissolve' }); }
  },
  draw(r) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#140e10');
      px.rect(g, 0, 0, r.W, r.H * .66, '#2a2030'); px.rect(g, r.W * .1, r.H * .12, r.W * .22, r.H * .26, '#0a0a1a');
      px.disc(g, r.W * .2, r.H * .2, 8, '#f0e8c8');
      px.rect(g, r.W * .3, r.H * .55, r.W * .5, 10, '#6a4a2a'); px.rect(g, r.W * .3, r.H * .55 + 10, r.W * .5, 4, '#3a2a1a');
      this.rigs.forEach((rg, i) => rg.drawPortrait(g, Math.round(r.W * (.36 + i * .16)), Math.round(r.H * .3), 50, { zoom: 2.2, turn: (i - 1) * .3, bg: null, frame: false }));
      E.font.text(g, 'NIGHT • DAY ' + (S.day - 1), r.W / 2, 10, '#c8a060', { align: 'center' });
    });
    talk.draw(r);
  }
};
scenes.busted = {
  enter() {
    this.t = 0; music(null); A.sfx('siren'); S.busts++;
    this.lost = { product: S.product, cash: Math.floor(S.dirty * .3) };
    S.product = 0; S.dirty -= this.lost.cash; S.heat = 20; S.clock = (S.clock + 6) % 24; S.hp = 100;
    autosave();
  },
  update(dt) { this.t += dt; if (this.t > 1.5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) game.go('town', { at: 'home' }); },
  draw(r) {
    const red = Math.floor(this.t * 3) % 2;
    r.sky([red ? '#3a0a0a' : '#0a0a3a', '#000000']);
    r.overlay(g => {
      E.font.title(g, 'BUSTED', r.W / 2, r.H * .28, { scale: 4, align: 'center', colors: ['#ffffff', '#ff6a5a', '#8a1a1a'], outline: '#000' });
      E.font.text(g, 'Lenny had you out by morning. It cost you.', r.W / 2, r.H * .5, '#e8d8d0', { align: 'center' });
      E.font.text(g, 'Seized: ' + (Math.round(this.lost.product * 10) / 10) + ' lbs of product and ' + fmt$(this.lost.cash) + ' in "legal fees".', r.W / 2, r.H * .5 + 14, '#c8b0a8', { align: 'center' });
      if (this.t > 1.5) E.font.text(g, lbl('confirm') + ' continue', r.W / 2, r.H * .72, '#ffffff', { align: 'center', shadow: '#000' });
    });
  }
};
scenes.dead = {
  enter(data = {}) {
    this.t = 0; this.from = data.from; music(null); A.sfx('die');
    this.menu = [{ label: 'TRY AGAIN', act: () => { const s = game.saves.load('auto'); if (s) game.go(sceneForState(), { load: true }); else newGame(); } }, { label: 'QUIT TO TITLE', act: () => game.go('title') }];
    this.i = 0; this.rows = [];
  },
  update(dt) {
    this.t += dt; if (this.t < 1) return;
    if (I.repeat('down') || I.repeat('up')) { this.i = 1 - this.i; A.sfx('select'); }
    const c = I.clicked(), p = I.pointer();
    if (p) this.rows.forEach((rw, k) => { if (p[0] >= rw[0] && p[0] <= rw[2] && p[1] >= rw[1] && p[1] <= rw[3]) this.i = k; });
    let pick = I.pressed('confirm') || I.pressed('interact');
    if (c) this.rows.forEach((rw, k) => { if (c[0] >= rw[0] && c[0] <= rw[2] && c[1] >= rw[1] && c[1] <= rw[3]) { this.i = k; pick = true; } });
    if (pick) { A.sfx('confirm'); this.menu[this.i].act(); }
  },
  draw(r) {
    r.sky(['#1a0a08', '#000000']);
    r.overlay(g => {
      E.font.title(g, 'YOU\'RE DONE', r.W / 2, r.H * .25, { scale: 3, align: 'center', colors: ['#ffffff', '#c8b090', '#5a3a1a'], outline: '#000' });
      E.font.text(g, ['"I did it for my family." That\'s what they all say.', 'The desert keeps its secrets. And yours.', 'Somewhere, Lenny is billing your estate.'][S.kos % 3], r.W / 2, r.H * .45, '#c8b0a8', { align: 'center' });
      this.rows = [];
      this.menu.forEach((m, k) => { const y = r.H * .6 + k * 18, on = k === this.i; this.rows.push([r.W / 2 - 70, y - 4, r.W / 2 + 70, y + 12]); if (on) E.ui.box(g, r.W / 2 - 70, y - 4, 140, 16, { bg: ['#6a4a22', '#3a2410'], border: '#ffd36a' }); E.font.text(g, m.label, r.W / 2, y + 1, on ? '#fff4d0' : '#c8b090', { align: 'center' }); });
    });
  }
};
const EPILOGUE = [
  'The superlab under Lavanderia Brillante burned for six hours.',
  'Dale Kowalski\'s task force sifted the ash for a week. They found fused glass, a melted desk, and no names.',
  'Taco Tranquilo closed "for renovations". It never reopened.',
  'Lenny Shapiro bought a second billboard.',
  'In a backyard on Piedra Lane, an old RV sat cooling in the evening light.',
  'Hollis Gray had done it for his family. He told himself that.\n\nMostly.'
];
scenes.ending = {
  enter() { this.t = 0; this.i = 0; this.boom = 0; music(null); A.sfx('boom'); game.shake(8); game.flash('#ffffff', .4); log('ending', S.time); try { E.store.set('bb-complete', true); } catch (e) { /* storage blocked */ } game.saves.erase && game.saves.erase('auto'); },
  update(dt) {
    this.t += dt;
    if (this.t > 2 && songNow !== 'ending') music('ending');
    if (this.t > 2.5 && (I.pressed('confirm') || I.pressed('interact') || I.clicked())) { this.i++; this.t = 2.5; A.sfx('text'); if (this.i >= EPILOGUE.length) game.go('credits'); }
  },
  draw(r) {
    r.sky(['#0a0604', '#2a1608', '#6a3a18']);
    r.overlay(g => {
      if (this.t < 2.5) { const a = 1 - this.t / 2.5; px.blend(g, a, 'add', () => px.rect(g, 0, 0, r.W, r.H, '#ff8a3a')); E.font.title(g, 'BOOM', r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd040', '#ff5020'] }); return; }
      E.font.text(g, 'EPILOGUE', r.W / 2, r.H * .18, '#c8a060', { align: 'center' });
      E.font.text(g, EPILOGUE[Math.min(this.i, EPILOGUE.length - 1)], r.W / 2, r.H * .38, '#fff4d0', { align: 'center', wrap: Math.min(r.W - 40, 300) });
      E.font.text(g, lbl('confirm') + ' continue', r.W / 2, r.H * .82, '#c8b090', { align: 'center' });
    });
  }
};
scenes.credits = {
  enter() { this.t = 0; music('title'); },
  update(dt) { this.t += dt; if (this.t > 1 && (I.pressed('confirm') || I.pressed('cancel') || I.pressed('interact') || I.clicked()) || this.t > 40) game.go('title'); },
  draw(r) {
    r.sky(['#0a0a14', '#1a1428']);
    const lines = ['BREAKING BACKYARD', '', 'An original spiritual successor to', 'Breaking Bad (2008-2013)', '', 'Design, code, writing, music, sound', 'Claude (Anthropic, claude-opus-5-5)', '', 'Engine', 'my-3D2dge ' + E.version + ' by Michael Crosato', '', 'Online', 'AI Hub Session Protocol v1', '', 'Starring', 'Hollis Gray • Dusty Pickett • Lenny Shapiro', 'Augusto Vela • Dale Kowalski • Marian Gray', 'Rafa Ybarra • the Calaca cousins • Mack', '', 'No chemistry in this game is real.', 'Please do not try any of it.', '', 'Thank you for playing.'];
    r.overlay(g => { const y0 = r.H - this.t * 22; lines.forEach((ln, i) => { const y = Math.round(y0 + i * 14); if (y > -10 && y < r.H) E.font.text(g, ln, r.W / 2, y, i === 0 ? '#ffd36a' : ln === ln.toUpperCase() && ln ? '#c8a060' : '#e8e0d0', { align: 'center', scale: i === 0 ? 2 : 1 }); }); });
  }
};
scenes.about = {
  enter() { this.page = 0; this.t = 0; this.scroll = 0; },
  update(dt) {
    this.t += dt; const n = ABOUT.length;
    if (I.repeat('right')) { this.page = (this.page + 1) % n; this.scroll = 0; A.sfx('select'); }
    if (I.repeat('left')) { this.page = (this.page + n - 1) % n; this.scroll = 0; A.sfx('select'); }
    if (I.down('down')) this.scroll += dt * 80; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 80);
    const c = I.clicked(); if (c && this.btn) { if (c[0] < this.btn[0]) { this.page = (this.page + n - 1) % n; this.scroll = 0; } else if (c[0] > this.btn[1]) { this.page = (this.page + 1) % n; this.scroll = 0; } }
    const z = I.zoom && I.zoom(); if (z && z !== 1) this.scroll = Math.max(0, this.scroll + (z < 1 ? 20 : -20));
    if (this.t > .3 && (I.pressed('cancel') || I.pressed('confirm'))) game.go('title');
  },
  draw(r) {
    r.sky(['#1a120a', '#0a0604']);
    r.overlay(g => {
      const pg = ABOUT[this.page], w = Math.min(r.W - 24, 400), x = Math.round((r.W - w) / 2);
      E.font.title(g, pg.title, r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff4d0', '#ffd36a', '#a8602a'], outline: '#140804' });
      E.font.text(g, '← ' + (this.page + 1) + ' / ' + ABOUT.length + ' →', r.W / 2, 28, '#c8a060', { align: 'center' });
      this.btn = [r.W / 2 - 20, r.W / 2 + 20];
      let y = 44 - Math.round(this.scroll);
      for (const [k, v] of pg.rows) {
        const hk = k ? E.font.lineHeight() + 2 : 0;
        const lines = E.font.wrap(v, w - (k ? 0 : 0));
        if (y > 36 && y < r.H - 20 && k) E.font.text(g, k, x, y, '#c8a060');
        y += hk;
        for (const ln of lines) { if (y > 36 && y < r.H - 20) E.font.text(g, ln, x, y, '#f0e8d8'); y += E.font.lineHeight() + 1; }
        y += 5;
      }
      E.font.text(g, lbl('left') + ' ' + lbl('right') + ' page   ' + lbl('up') + ' ' + lbl('down') + ' scroll   ' + lbl('cancel') + ' back', r.W / 2, r.H - 12, '#a08870', { align: 'center' });
    });
  }
};

// ---- 70-hub.js ----
/* ---------------- AI Hub sessions (protocol v1, ghost mode): THE COOK-OFF ----------------
   Every player runs their own copy of the same town, seeded alike: cook in the RV, sell to the buyers on the corners,
   dodge the DEA. The most cash when the clock runs out wins. The other players show as ghosts in their seat colours. */
const HUB_ROUND_MS = 4 * 60 * 1000;
const hubState = { info: null, started: false, ended: false, resulted: false, sendT: 0, progT: 0, players: [] };
function hubResult() {
  if (!HUB || hubState.resulted) return;
  hubState.resulted = true;
  HUB.result({ score: Math.round(S.earned), stats: { 'Cash': fmt$(S.earned), 'Deals': S.deals, 'Cooks': S.cooks, 'Best batch': S.best ? S.best.toFixed(1) + '%' : '-' },
    awards: S.best >= 96 ? [{ title: 'Pure Artist', detail: 'A batch of ' + S.best.toFixed(1) + '%' }] : [] });
  log('hub-result', S.earned);
}
function hubConnect() {
  return HUB.connect({ mode: 'ghost', seats: [1, 4] }).then(info => {
    if (!info) return null;
    hubState.info = info; hubState.players = info.players || [];
    rnd = HUB.rng('deal');
    HUB.on('start', () => { hubState.started = true; });
    HUB.on('message', (data, from) => {
      if (!W || !data || data.t !== 'g') return;
      let gh = W.ghosts.get(from);
      if (!gh) { const p = hubState.players.find(q => q.id === from) || { name: 'P' + (from + 1), color: '#ffffff' }; gh = { rig: RIGS.hollis(true), name: String(p.name || '').slice(0, 16), color: p.color || '#ffffff', x: data.x, y: data.y, f: 0, area: data.area, px: data.x, py: data.y }; W.ghosts.set(from, gh); }
      gh.tx = data.x; gh.ty = data.y; gh.f = data.f; gh.area = data.area; gh.cash = data.c;
    });
    HUB.on('leave', ({ id }) => { if (W) W.ghosts.delete(id); });
    HUB.on('time-up', () => { hubResult(); });
    HUB.on('end', () => { hubState.ended = true; music(null); try { A.mute && A.mute(true); } catch (e) { /* no sound */ } I.clear(); });
    return info;
  });
}
scenes.hubwait = {
  enter() { this.t = 0; },
  update(dt) { this.t += dt; },
  draw(r) { r.sky(['#1a1030', '#6a2a3a']); r.text('CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); }
};
scenes.hubround = {
  view: 'threequarter', touch: [], pausable: false,
  enter() {
    S = Object.assign(NEW_STATE(), { ep: 2, step: 0, clock: 18.5, flasks: { fulm: 0, smoke: 2 }, flags: { smoke: true }, sel: 'smoke' });
    enterLevel('hub', {});
    W.hero.x = SPOT.rv.x + 20; W.hero.y = SPOT.rv.y + 10;
    for (let i = 0; i < 3; i++) spawnBuyer();
    W.onDeal = () => { HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) }); };
    W.onCook = () => { HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) + ' • cooked ' + S.cooks }); };
    music('town');
    HUB.ready();
    log('hub-ready', hubState.info && hubState.info.me);
  },
  exit() { exitLevel(); },
  update(dt) {
    if (hubState.ended) return;
    const t = HUB.time();
    for (const gh of W.ghosts.values()) { if (gh.tx !== undefined) { gh.x = lerp(gh.x, gh.tx, Math.min(1, dt * 10)); gh.y = lerp(gh.y, gh.ty, Math.min(1, dt * 10)); } gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.tx - gh.x) * 10 || 0, vy: (gh.ty - gh.y) * 10 || 0, facing: gh.f || 0 }); }
    if (!(t >= 0)) { stopHeroes(dt); return; }      // the countdown: nobody moves
    const limit = (hubState.info && hubState.info.limitMs) ? Math.min(HUB_ROUND_MS, hubState.info.limitMs) : HUB_ROUND_MS;
    if (t >= limit) { hubResult(); stopHeroes(dt); return; }
    if (hubState.resulted) { stopHeroes(dt); return; }
    // the DEA patrol the hub's town too
    playUpdate(dt);
    syncHubAgents(); for (const a of W.agents) agentUpdate(a, dt);
    hubState.sendT -= dt; hubState.progT -= dt;
    if (hubState.sendT <= 0) { hubState.sendT = .1; HUB.send({ t: 'g', area: 'hub', x: Math.round(W.hero.x), y: Math.round(W.hero.y), f: Math.round(W.hero.facing * 100) / 100, c: Math.round(S.earned) }, { reliable: false }); }
    if (hubState.progT <= 0) { hubState.progT = 1; HUB.progress({ score: Math.round(S.earned), label: fmt$(S.earned) }); }
  },
  draw(r) {
    playDraw(r);
    const t = HUB.time(), limit = (hubState.info && hubState.info.limitMs) ? Math.min(HUB_ROUND_MS, hubState.info.limitMs) : HUB_ROUND_MS;
    r.overlay(g => {
      const left = t >= 0 ? Math.max(0, limit - t) : limit, s = Math.ceil(left / 1000);
      E.ui.box(g, r.W / 2 - 70, 6, 140, 26, { bg: ['#2a1e14', '#120a06'], border: '#c8a060', alpha: .85 });
      E.font.text(g, 'THE COOK-OFF  ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), r.W / 2, 10, '#ffd36a', { align: 'center' });
      E.font.text(g, 'Cash earned ' + fmt$(S.earned), r.W / 2, 20, '#9ae07a', { align: 'center' });
      if (!(t >= 0)) E.font.title(g, t === -Infinity ? 'GET READY' : String(Math.ceil(-t / 1000)), r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' });
      if (hubState.resulted) E.font.title(g, 'TIME', r.W / 2, r.H * .4, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd36a', '#c8782a'], outline: '#000' });
      E.font.text(g, 'Cook at the RV, sell to buyers, avoid the DEA', r.W / 2, r.H - 10, '#e8d8b8', { align: 'center', font: 'tiny' });
    });
  }
};
function syncHubAgents() { if (W.agents.length < 3) makeAgent(W.agents.length, W.agents.length * 180, W.agents.length); }

// ---- 80-about.js ----
/* ---------------- the About & Credits pages (generated from about.json by build.mjs) ---------------- */
const ABOUT = [{"title":"SOURCE INFORMATION","rows":[["Date","2026-11-02 18:13"],["Source","Breaking Bad (2008-2013), the AMC TV series"],["Genre","Crime action-adventure with a chemistry-cook minigame, street dealing, light stealth (DEA sight cones) and boss fights"],["Perspective","Three-quarter top-down (engine-native 'threequarter' view); the player can switch to top-down and isometric at any time (V / R3)"],["Tech","my-3D2dge engine v0.85.1 (full edition, single JS file, canvas 2D, no dependencies); plain JavaScript in one IIFE; AI Hub Session Protocol v1 client 1.3.0 (session.js); Node 24 build script; tests with Node vm (headless engine) and Playwright 1.63 (Chromium, WebKit, Firefox)"],["Art direction","Engine-native retro-modern pixel art: 320x240 base resolution expanded to any screen, HD shaded Humanoid rigs, data-defined shapes (custom RV, cars, lab tables, reactor tanks, washers), procedural floor textures, a sun-bleached New Mexico palette, canvas lighting with a day-to-night cycle"],["Animation","Engine-native procedural skeletal rigs (E.Humanoid) driven by velocity, E.MOVES attacks (jab/cross/hook combo, overhead chops), dodge rolls, poses (hips, wave, kneel, down), tweens and coroutine scripts for the attract demo"],["Audio","All code-written: six original chip-synth songs in the engine's step notation (title, town with a tension layer, cook, fight, boss, ending), synthesized sound effects, and gibberish 'Simlish' voice acting with a per-character pitch and waveform for every speaker"],["Online","AI Hub ghost mode 'The Cook-Off' for 1-4 players (seeded identical towns, live ghost positions with names in seat colours, progress, result, time-up and end handling); local 2-player drop-in co-op (Dusty) on a second pad or the right half of the keyboard"],["Testing","Headless Node tests (46-check full story playthrough, 75 system checks), a Playwright real-input browser playthrough of all five episodes, 15 scene checks in Chromium plus WebKit, the AI Hub harness in 4 scenarios, and viewport-matrix over 24 phone/tablet/desktop/ultrawide profiles in Chromium, WebKit and Firefox. Real iOS Safari and real gamepads were not available (WebKit iPhone profiles and a fake gamepad object stood in)"],["Research","No web research; read the engine's handoff docs (README, API card, guide sections, asset card) and the AI Hub protocol README and examples. The show's details are from memory"],["Environment","Claude Code CLI (headless); Linux (WSL2); browser unknown"],["Model","Anthropic, claude-opus-5-5, reasoning effort medium"],["Usage","Session time about 61 minutes (18:13 to 19:14 by the system clock); API cost and token counts unknown"]]},{"title":"TESTING FEEDBACK","rows":[["How many issues did testing catch?","16 issues: a dialog choice that advanced the story twice (skipping a step), story NPCs that were never placed in the world (Vela's office was empty), Escape closing a menu also opening the pause menu, the cook's measure stage waiting forever without input, no guidance when product ran out mid-objective, deep links overridden by the boot screen, touch-only detection failing on WebKit iPhone profiles, a missing font glyph showing as '?', toasts over the HUD, the title tagline over the menu, a patio table on the start spot, the cook's radio covering its gauges, the shop resetting focus after each purchase, buyers spawning too slowly, narrow-screen HUD collisions, and the About page crashing before its data existed."],["How many were critical / game breaking?","2 were critical: the double-advance after a dialog choice (it silently skipped the Episode 3 sleep step) and the missing NPCs (objectives pointed at empty spots, so the story read as broken)."],["Most helpful test","The real-input browser playthrough: walking by held keys, cooking by timed key presses, fighting with mouse aim and clicks, menus by keys and mouse. It found the Escape/pause conflict, the out-of-product dead end and, through its screenshots, the missing NPCs."],["Least helpful test","The broad viewport-matrix sweep of the in-game town: all 24 profiles came back clean, and with a pixel-art canvas that scales by itself there was little new for it to find after the first phone screenshot."]]},{"title":"ENGINE FEEDBACK","rows":[["What I liked most","Standard features for free: pause menu, settings, rebinding, glyph families, save slots, boot screen, the canvas HUD primitives and E.Dialog with live portraits. Plus a headless engine with exact fixed steps, so the whole story can be played and tested in Node in a couple of seconds."],["Did I get stuck or guess wrong?","Yes, a few times: the boot sequence overrode a game.go() issued right after game.start() (deep links landed on the title); a Dialog choice closes the box after onChoice, so opening the next line inside onChoice got closed and fired its onDone early; and two players sharing a keyboard silently move player 1 onto F/G/H, which made a prompt test read 'F' instead of 'E'."],["Most important thing I built","The cook minigame (measure, heat, crystallize, with purity scoring), the DEA patrol loop around E.Suspicion and E.sees (heat, busts, smoke blinding), the 10-foot menus with mouse hover and click, the story/episode event system, the attract-mode demo script, and the AI Hub ghost-mode round."],["Hardest part","Knowing which calls are safe at which moment in the frame (go() during boot, say() inside dialog callbacks, when pausable is read relative to the scene's update) is not in the API card, so it took testing to find out."],["What I would remove or overhaul","E.Menu's fixed small type. For a 10-foot, controller-first game I had to write my own menu (bigger rows, a note line, mouse rects); a scale or 'tv' option on E.Menu would remove that duplicate work."],["What I would change","Document the frame order around scene switches and dialog callbacks (or queue say() calls made from callbacks), and expose a built-in 'invert stick X/Y' controller setting next to invert aim, so games don't have to wrap navigator.getGamepads."]]},{"title":"PROMPT FEEDBACK","rows":[["What I liked most","It is concrete about the player's living room: a DualSense at ten feet, glyphs following the last device, a native-feeling mouse, touch-only behaviour, and even the real-world inverted-axis quirk. That made the input and UI goals unambiguous."],["What was confusing","How much of the source to borrow while staying original (I used original names and riffs on the show's beats), whether 'every feature' includes multiplayer story co-op or only hub support, and the Usage line, since the session cannot see its own token counts."],["The hardest thing","Scope: five episodes of story, a minigame, stealth, combat, two bosses, attract mode, local co-op and hub multiplayer in one session, all of it tested, without leaving stubs anywhere."],["The one test I wish I could run","A real controller on a real TV (DualSense over Bluetooth in Chrome and Safari), to verify the glyphs, the stick inversion toggles and the rumble on actual hardware instead of a fake gamepad object."]]},{"title":"HOW TO PLAY","rows":[["Goal","Five episodes. Cook in the RV, sell to buyers on the corners, launder dirty cash at the car wash, buy upgrades from Lenny, and survive what comes for you."],["Controller","Left stick move, right stick aim, Cross interact, Square or R2 punch/shoot, R1 throw flask, Triangle switch flask, Circle roll, L2/L3 sprint, Create ledger, R3 camera, Options pause."],["Keyboard and mouse","WASD move, mouse aims, E interact, left click punch/shoot (or click a person or door to walk there and use it), right click or G throw, Q switch flask, Space roll, Shift sprint, Tab ledger, V camera, Esc pause."],["The DEA","Agents see in a cone. Holding product or carrying heat makes them suspicious. Break line of sight, sprint, wait for night, or blind them with smoke. Caught means busted."],["Two players","Press Start on a second controller, or 2 on the keyboard, to play as Dusty."],["Settings","Button prompts (PlayStation or Xbox), invert stick horizontal and vertical, difficulty, sight cones, hints, plus the engine's sound, display and comfort options."]]},{"title":"CREDITS","rows":[["Game","Breaking Backyard, an original spiritual successor to Breaking Bad (2008-2013). Characters, names and story are original riffs; no affiliation with the show."],["Made by","Claude (Anthropic, claude-opus-5-5, reasoning effort medium) in Claude Code."],["Engine","my-3D2dge v0.85.1 by Michael Crosato."],["Online","AI Hub Session Protocol v1, client 1.3.0."],["Music, sound, voices","Written in code: chip-synth songs, synthesized effects, gibberish voices."]]}];

// ---- 90-start.js ----
/* ---------------- the handle tests and tools read ---------------- */
game.debug = {
  snapshot: () => ({
    scene: game.sceneName, ep: S.ep, step: S.step, stepId: curStep() && curStep().id, obj: objText(), day: S.day, hp: W && W.hero ? Math.round(W.hero.hp) : null,
    dirty: S.dirty, clean: S.clean, product: S.product, purity: S.purity, heat: Math.round(S.heat), flasks: { ...S.flasks }, up: { ...S.up }, alias: S.alias,
    hero: W && W.hero ? [Math.round(W.hero.x), Math.round(W.hero.y)] : null, enemies: W ? W.enemies.filter(e => !e.dead).length : 0, agents: W ? W.agents.map(a => a.state) : [],
    buyers: W ? W.buyers.length : 0, npcs: W ? W.npcs.map(n => n.id) : [], modal: modal ? modal.kind : null, talking: talk.open, demo: !!(W && W.demo), partner: !!(W && W.partner), p2: !!(W && W.partner && !W.partner.ai),
    view: game.view && game.view.id, near: W && W.near ? W.near.id : null, toasts: toasts.map(t => t.text), errors: game.errors.length
  }),
  state: () => S,
  setState: o => Object.assign(S, o),
  level: () => W,
  log: () => LOG,
  modal: () => modal,
  talk,
  teleport(x, y) { if (W && W.hero) { W.hero.x = x; W.hero.y = y; W.hero.vx = W.hero.vy = 0; } },
  spot: SPOT, labSpot: LAB_SPOT, buyerSpots: BUYER_SPOTS,
  story, advance, interactables, EPISODES, UPGRADES,
  skipTalk() { let n = 0; while (talk.open && n++ < 60) { talk.close(); } },
  hub: hubState,
  killAll() { if (W) for (const e of W.enemies) if (!e.dead) hurtEnemy(e, 9999, 0); },
  hurtEnemy: (e, d) => hurtEnemy(e, d, 0), hurtHero: (h, d) => hurtHero(h, d, 0), makeEnemy: (k, x, y) => makeEnemy(k, x, y), makeAgent: (b, s, i) => makeAgent(b, s, i),
  burst: (x, y, k) => burst(x, y, k), sync: () => syncAgents(), touchOnly: () => touchOnly(), titleItems: () => titleItems().map(i => i.label), mixHex, openCook: o => { modal = new Cook(o || {}); return modal; }
};

/* ---------------- deep links (tests and screenshots): #town, #ep=3, #lab, #cook, #demo, #about, #ending, #credits ---------------- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  if (!h) return null;
  const m = /^ep=(\d)(?:\.(\d))?$/.exec(h);
  if (m) { S = NEW_STATE(); S.ep = +m[1]; S.step = +(m[2] || 0); if (S.ep >= 2) { S.flags.smoke = true; S.flags.shop = true; S.flasks.smoke = 2; S.clean = 8000; S.product = 6; S.purity = 92; } return [sceneForState(), { fresh: true }]; }
  if (h === 'town') { S = NEW_STATE(); return ['town', { fresh: true }]; }
  if (h === 'lab') { S = NEW_STATE(); S.ep = 5; S.step = 1; S.up.pistol = true; S.alias = true; return ['lab', {}]; }
  if (h === 'cook') { S = NEW_STATE(); S.ep = 1; S.step = 1; return ['town', { fresh: true, cook: true }]; }
  if (h === 'demo') return ['town', { demo: true }];
  if (scenes[h]) return [h, {}];
  return null;
}

/* ---------------- start ---------------- */
const LAUNCH = HUB ? null : deepLink();
scenes.launch = { update() { game.go(LAUNCH[0], LAUNCH[1], { fade: 0 }); }, draw(r) { r.sky(['#000000', '#000000']); } };
game.start({
  scenes, scene: HUB ? 'hubwait' : LAUNCH ? 'launch' : 'title',
  boot: { title: TITLE, version: '1.0', messages: ['Calibrating the glassware', 'Parking the RV', 'Briefing the task force', 'Folding the salsa verde', 'Printing Lenny\'s billboard'],
    steps: [['Building Las Brujas', () => { town.bounds && town.bounds(game.view); }], ['Waking the cast', () => { for (const k of ['hollis', 'dusty', 'lenny', 'vela', 'dale', 'skyler', 'rafa', 'mack']) speaker(k); }]] }
});
if (HUB) {
  hubConnect().then(info => {
    if (!info) { game.go('title'); return; }
    game.go('hubround', {}, { fade: 0 });
  }).catch(err => { try { HUB.fail(String(err && err.message || err)); } catch (e) { /* no hub */ } game.go('title'); });
}
})();
