/* THE BARITONES: an original spiritual successor to The Sopranos (1999-2007), on my-3D2dge v0.85.1 */
(() => {
'use strict';
/* ===== 00-core.js ===== */
/* THE BARITONES — core: the game object, controls, settings, sound, helpers.
 * A spiritual successor to The Sopranos (1999-2007): a North Jersey crime boss with panic attacks, a family, a crew,
 * and a therapist. Built on my-3D2dge v0.85.1 (threequarter view; topdown and iso on V / R3). */
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2;
let HUB = typeof AIHub !== 'undefined' && AIHub.active;
const T = 16;

/* ---- CONTROLS: the keys PC players expect for a top-down brawler-shooter; a DualSense in its standard mapping ---- */
const D = E.Input.DEFAULT;
const KEYS = {
  up: D.up, down: D.down, left: D.left, right: D.right,
  attack: ['KeyJ', 'Mouse0', 'Pad2'],            // punch combo (□ / X)
  kick: ['KeyK', 'Pad3'],                        // kick (△ / Y)
  interact: ['KeyE', 'KeyF', 'Pad0'],            // talk, use, get in the car (✕ / A)
  dodge: ['Space', 'Pad1'],                      // roll; handbrake in the car (○ / B)
  block: ['KeyL', 'KeyC', 'Pad4', 'Pad6'],       // guard; brake in the car (L1, L2)
  fire: ['KeyQ', 'Mouse2', 'Pad7'],              // the pistol; gas in the car (R2)
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad5', 'Pad10'],   // R1 or L3
  view: ['KeyV', 'Pad11'],                       // camera view (R3)
  start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel
};
const ACTION_NAMES = { attack: 'Punch', kick: 'Kick', interact: 'Talk / Use', dodge: 'Roll', block: 'Block', fire: 'Shoot', sprint: 'Sprint', view: 'Camera view' };

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: KEYS, bg: '#07060a',
  menu: {
    saves: HUB ? false : true,
    controls: ACTION_NAMES,
    quit: HUB ? false : 'title',
    settings: [
      { key: 'glyphs', group: 'Controller', label: 'Button symbols', options: [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', help: 'Which buttons the prompts show for a controller', apply: (g, v) => { for (const p of (g && g.players) || []) p.glyphs = v === 'xbox' ? 'xbox' : 'playstation'; } },
      { key: 'invertX', group: 'Controller', label: 'Invert horizontal axes', type: 'toggle', value: false, help: 'Flip the sticks left to right (a controller that reports them backwards)' },
      { key: 'invertY', group: 'Controller', label: 'Invert vertical axes', type: 'toggle', value: false, help: 'Flip the sticks up and down (a controller that reports them backwards)' },
      { key: 'difficulty', group: 'Game', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], value: 'normal', help: 'How hard the Falsettis hit' },
      { key: 'autoaim', group: 'Game', label: 'Aim assist', type: 'toggle', value: true, help: 'The pistol leans toward the nearest enemy' },
      { key: 'hints', group: 'Game', label: 'Tutorial hints', type: 'toggle', value: true, help: 'Show button tips the first time something comes up' }
    ]
  }
});
const P = game.particles, L = game.lights, A = game.audio, I = game.input;
game.fadeTime = .3;

/* ---- the glyph family and the inverted-axes fix, applied to every player's input ---- */
function applyGlyphs() { for (const p of game.players) p.glyphs = game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation'; }
applyGlyphs();
// Some pads report their axes flipped. Settings → Controller → Invert horizontal / vertical: the engine reads the pad
// through navigator.getGamepads, so the flip happens there, for play, menus and the right stick alike.
if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    const fx = game.settings.invertX, fy = game.settings.invertY;
    if (!p || (!fx && !fy)) return p;
    const axes = Array.from(p.axes, (v, i) => (i % 2 === 0 ? (fx ? -v : v) : (fy ? -v : v)));
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { navigator.getGamepads = () => Array.from(real() || [], wrap); } catch (e) { /* a locked-down browser: the toggles do nothing there */ }
}

/* ---- touch-only devices: no touch controls; the title says a controller or keyboard is needed ---- */
const TOUCH_ONLY = typeof matchMedia === 'function' && typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || typeof window !== 'undefined' && 'ontouchstart' in window)
  && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
let touchLocked = TOUCH_ONLY;
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { touchLocked = false; });
  addEventListener('gamepadconnected', () => { touchLocked = false; });
}
I.touchEnabled = false;
// prompts follow the device used last: the engine counts a mouse button as the mouse; moving it over the game counts too
{ let lastMouseT; const tick = I.tick.bind(I);
  I.tick = function (dt) { const r = tick(dt); const m = I.mouse; if (m && m.active && m.t !== lastMouseT) { if (lastMouseT !== undefined && I.lastDevice !== 'touch') I.lastDevice = 'mouse'; lastMouseT = m.t; } return r; }; }

/* ---- helpers ---- */
// the pixel font has no middle dot or left triangle: every string drawn in it goes through here
const fixGlyphs = s => String(s).replace(/·/g, '•').replace(/◂/g, '←').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, '-');
{ const ft = E.font.text, fw = E.font.width, fwr = E.font.wrap, ftt = E.font.title;
  E.font.text = function (g, s, ...a) { return ft.call(this, g, fixGlyphs(s), ...a); };
  E.font.width = function (s, ...a) { return fw.call(this, fixGlyphs(s), ...a); };
  E.font.wrap = function (s, ...a) { return fwr.call(this, fixGlyphs(s), ...a); };
  E.font.title = function (g, s, ...a) { return ftt.call(this, g, fixGlyphs(s), ...a); }; }
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const label = (a, p = I) => p.label(a);
const txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, { shadow: '#07040c', outline: false, ...o });
const settingsDiff = () => ({ easy: .6, normal: 1, hard: 1.45 })[game.settings.difficulty || 'normal'];
const now = () => game.time;

/* ---- SOUND: chip voices for the street, and code-written songs ---- */
A.define('gun', [{ wave: 'noise', freq: 900, to: 120, dur: .16, vol: .45 }, { wave: 'square', freq: 180, to: 50, dur: .1, vol: .25 }]);
A.define('click', { wave: 'square', freq: 1400, to: 1200, dur: .03, vol: .15 });
A.define('quack', [{ wave: 'saw', freq: 520, to: 380, dur: .09, vol: .18, vib: [30, .05] }, { wave: 'saw', freq: 480, to: 340, dur: .07, vol: .12 }]);
A.define('cash', { wave: 'square', freq: 'E6', dur: .06, vol: .2, arp: [0, 7, 12], step: .05 });
A.define('engine', { wave: 'saw', freq: 55, to: 60, dur: .09, vol: .07 });
A.define('horn', [{ wave: 'square', freq: 392, dur: .3, vol: .2 }, { wave: 'square', freq: 494, dur: .3, vol: .15 }]);
A.define('heart', [{ wave: 'sine', freq: 70, to: 40, dur: .1, vol: .5 }]);
A.define('breath', { wave: 'noise', freq: 400, to: 900, dur: .5, vol: .12 });
A.define('bell', [{ wave: 'triangle', freq: 'E6', dur: .5, vol: .25 }, { wave: 'triangle', freq: 'C6', dur: .6, vol: .2 }]);
A.define('crash', [{ wave: 'noise', freq: 600, to: 80, dur: .35, vol: .45 }, { wave: 'square', freq: 90, to: 40, dur: .25, vol: .2 }]);

// The voices: gibberish syllables, pitched per speaker (a baritone is low; the Falsettis sing high)
const VOICES = {};
function babble(ch, who) {
  const v = VOICES[who] || { base: 180, wave: 'pulse' };
  const c = ch.toLowerCase().charCodeAt(0);
  const vowel = 'aeiouy'.includes(ch.toLowerCase());
  const f = v.base * (vowel ? 1.25 : .9) * (1 + ((c * 37) % 11) / 40);
  A.sfx({ wave: v.wave, freq: f, to: f * (vowel ? .88 : 1.08), dur: vowel ? .075 : .045, vol: .16, vib: vowel ? [12, .04] : undefined });
}

const SONGS = {
  // a lounge-noir walking line under a muted trumpet: the title
  title: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .32, notes: 'D3 . A2 . F3 . A2 . | D3 . A2 . G3 . A2 . | C3 . G2 . E3 . G2 . | A2 . E3 . C#3 . E3 . | Bb2 . F3 . D3 . F3 . | G2 . D3 . Bb2 . D3 . | A2 . E3 . A2 . G3 . | A2 . C#3 . E3 . A3 .' },
    { wave: 'pulse12', vol: .12, notes: 'F5 - - E5 D5 - A4 - | - - - - . . . . | E5 - - D5 C5 - G4 - | - - - - . . A4 C#5 | D5 - - F5 E5 - D5 - | Bb4 - - - . . . . | A4 - C#5 - E5 - G5 - | F5 - E5 - D5 - - - ' },
    { wave: 'drums', vol: .18, notes: 'k . h . s . h h | k . h . s . h . | k . h . s . h h | k . h k s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h h | k k h . s . s s' } ] },
  // the town by day: a jaunty mandolin over a bass that walks
  town: { bpm: 112, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'G2 . D3 . B2 . D3 . | C3 . G3 . E3 . G3 . | A2 . E3 . C3 . E3 . | D3 . A3 . F#3 . A3 . | G2 . D3 . B2 . D3 . | E3 . B3 . G3 . B3 . | C3 . G3 . D3 . A3 . | G2 . D3 . G3 . . .' },
    { wave: 'pulse', vol: .09, notes: 'B4 B4 D5 . G5 . F#5 . | E5 E5 G5 . C6 . B5 . | A5 . G5 . E5 . C5 . | D5 . F#5 . A5 . . . | B4 B4 D5 . G5 . A5 . | B5 . G5 . E5 . B4 . | C5 . E5 . D5 . F#5 . | G5 - - - . . . .' },
    { wave: 'drums', vol: .14, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s h s . | k . h . s . h . | k . h . s . h h | k . h . s . h . | k k h . s . . .' } ] },
  // the town at night: slow, minor, a vibraphone
  night: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E2 . . . B2 . . . | C3 . . . G2 . . . | A2 . . . E2 . . . | B2 . . . F#2 . B2 . ' },
    { wave: 'sine', vol: .16, notes: 'G4 . B4 . E5 . . . | G4 . C5 . E5 . . . | A4 . C5 . E5 . . . | F#4 . B4 . D#5 . . . ' },
    { wave: 'drums', vol: .1, notes: 'k . . . h . . . | s . . . h . . h | k . . . h . . . | s . . . h . h . ' } ] },
  // a brawl: driving eighths, stabs
  fight: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .16, notes: 'E2 E2 E3 E2 G2 E2 A2 E2 | E2 E2 E3 E2 Bb2 A2 G2 E2 | D2 D2 D3 D2 F2 D2 G2 D2 | E2 E2 E3 E2 B2 A2 G2 F#2' },
    { wave: 'square', vol: .1, notes: 'E5 . . E5 . . G5 . | E5 . . E5 . Bb5 A5 . | D5 . . D5 . . F5 . | E5 . . B5 . A5 G5 F#5' },
    { wave: 'drums', vol: .22, notes: 'k . h k s . h . | k . h k s . h h | k . h k s . h . | k k h k s s s s' } ] },
  // the boss: the tenor's aria, menacing
  boss: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .16, notes: 'A1 A1 A2 A1 C2 A1 D2 Eb2 | A1 A1 A2 A1 G2 F2 E2 Eb2 | F1 F1 F2 F1 A1 F1 C2 D2 | E1 E1 E2 E1 G#1 B1 D2 E2' },
    { wave: 'pulse', vol: .11, notes: 'A5 - - G5 F5 - E5 - | C6 - - B5 A5 - G#5 - | F5 - - E5 D5 - C5 - | E5 - - - G#5 - B5 - ' },
    { wave: 'drums', vol: .24, notes: 'k . s . k k s . | k . s . k k s s | k . s . k k s . | k s k s k s s s' } ] },
  // the snowy pine barrens: lost, cold, a little funny
  barrens: { bpm: 72, steps: 4, tracks: [
    { wave: 'triangle', vol: .28, notes: 'D3 . . . . . . . | C3 . . . . . . . | Bb2 . . . . . . . | A2 . . . . . C#3 . ' },
    { wave: 'sine', vol: .14, notes: 'A5 . F5 . D5 . . . | G5 . E5 . C5 . . . | F5 . D5 . Bb4 . . . | E5 . C#5 . A4 . . . ' },
    { wave: 'drums', vol: .06, notes: 'h . . . . . h . | . . h . . . . . | h . . . . . h . | . . h . . . . h' } ] },
  // the therapist's office: soft, patient
  office: { bpm: 70, steps: 4, tracks: [
    { wave: 'sine', vol: .2, notes: 'F3 . C4 . A3 . C4 . | E3 . C4 . G3 . C4 . | D3 . A3 . F3 . A3 . | Bb2 . F3 . D3 . G3 . ' },
    { wave: 'triangle', vol: .12, notes: 'A4 - - - G4 - - - | G4 - - - E4 - - - | F4 - - - D4 - - - | D4 - - - C4 - - - ' } ] },
  // the diner jukebox: an original power-ballad, piano and a big drum fill
  jukebox: { bpm: 120, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'E3 . E3 . E3 . E3 . | B2 . B2 . B2 . B2 . | C#3 . C#3 . C#3 . C#3 . | A2 . A2 . A2 . A2 . ' },
    { wave: 'pulse', vol: .12, notes: 'E4 G#4 B4 E5 B4 G#4 E4 G#4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4 | C#4 E4 G#4 C#5 G#4 E4 C#4 E4 | A3 C#4 E4 A4 E4 C#4 A3 B3' },
    { wave: 'square', vol: .1, notes: 'B5 - - - G#5 - E5 - | F#5 - - - D#5 - B4 - | G#5 - - - E5 - C#5 - | A5 - G#5 - F#5 - E5 - ' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k . s . s s s s' } ] },
  // the victory sting
  win: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - . . | Bb4 D5 F5 Bb5 - - . . | C5 - E5 - G5 - C6 - | - - - - . . . .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . . . G2 . . . | Bb2 . . . F2 . . . | C3 . G2 . C3 . . . | . . . . . . . .' } ] }
};
let curSong = null;
function music(name) { if (name === curSong) return; curSong = name; A.music(name ? SONGS[name] : null, { fade: .6 }); }

/* ===== 01-art.js ===== */
/* ---- THE CAST: HD rigs, dressed. Every character has a palette of their own ---- */
const H = o => new E.Humanoid(Object.assign({ size: 1.3, weapon: null }, o, H.extra || {}));
const rigOf = (who, robe, extra) => { H.extra = extra || null; try { return CAST[who].make(robe); } finally { H.extra = null; } };
const CAST = {
  sal: { name: 'SAL BARITONE', voice: { base: 92, wave: 'saw' },
    make: robe => H({ build: 'bulky', size: 1.4, hair: 'short', outfit: robe ? 'robe' : 'coat', sleeves: robe ? 'long' : 'short',
      colors: robe ? { skin: '#e8b48c', hair: '#2a2420', cloth: '#f4f0e8', coat: '#ece6da', trim: '#c8bca8', belt: '#c8bca8', pants: '#e8e2d4', boot: '#5a3a2a', eye: '#3a2a1a' }
                   : { skin: '#e8b48c', hair: '#2a2420', cloth: '#2c3a5a', coat: '#3a3a40', trim: '#c8a860', belt: '#1a1a1e', pants: '#2a2a30', boot: '#1a1414', glove: '#e8b48c', eye: '#3a2a1a' } }) },
  nicky: { name: 'NICKY', voice: { base: 150, wave: 'pulse' },
    make: () => H({ build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c4a0', hair: '#1a1410', cloth: '#d8d4cc', coat: '#3a2418', trim: '#5a3a28', pants: '#2a2a34', boot: '#141010', eye: '#2a4a3a' } }) },
  gino: { name: 'GINO "PISTACHIO" PALMIERI', voice: { base: 130, wave: 'square' },
    make: () => H({ build: 'heroic', hair: 'short', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#e8e8f0', cloth: '#2a2a2a', trim: '#f0f0f0', pants: '#2a2a2a', boot: '#f0f0f0', belt: '#c8c8c8', eye: '#2a2a3a' } }) },
  frankie: { name: 'FRANKIE "THE WIG" VITALE', voice: { base: 120, wave: 'pulse12' },
    make: () => H({ build: 'heroic', hair: 'spiky', outfit: 'coat', colors: { skin: '#e8c0a0', hair: '#141018', cloth: '#5a1a28', coat: '#202024', trim: '#c8c8d0', pants: '#202024', boot: '#141010', eye: '#2a2a3a' } }) },
  donna: { name: 'DONNA', voice: { base: 250, wave: 'triangle' },
    make: () => H({ size: 1.25, hair: 'long', outfit: 'robe', sleeves: 'long', colors: { skin: '#f4d0b0', hair: '#e8c070', cloth: '#e890a8', trim: '#f8c8d8', belt: '#f8c8d8', pants: '#e890a8', boot: '#f0e0e0', eye: '#3a5a8a' } }) },
  melfi: { name: 'DR. MARCHETTI', voice: { base: 220, wave: 'sine' },
    make: () => H({ size: 1.25, hair: 'long', outfit: 'coat', sleeves: 'long', colors: { skin: '#f0c8a8', hair: '#8a3a20', cloth: '#e8e0d0', coat: '#3a3a4a', trim: '#8a8aa0', pants: '#3a3a4a', boot: '#1a1a1e', eye: '#4a3a2a' } }) },
  baker: { name: 'ROSARIA (DOLCE VITA)', voice: { base: 240, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'ponytail', sleeves: 'short', colors: { skin: '#e8b890', hair: '#3a2a20', cloth: '#f4f0e8', trim: '#e8a0b0', pants: '#f4f0e8', boot: '#e8e0d8', eye: '#3a2a1a' } }) },
  laundry: { name: 'MURRAY (SPIN CITY)', voice: { base: 170, wave: 'pulse' },
    make: () => H({ size: 1.2, build: 'chibi', hair: 'bald', sleeves: 'short', hunch: .3, colors: { skin: '#f0c8a8', cloth: '#7ab0d8', trim: '#f4f4f4', pants: '#5a5a6a', boot: '#3a3a3a', eye: '#2a2a3a' } }) },
  chef: { name: 'ARTURO (IL GABBIANO)', voice: { base: 145, wave: 'square' },
    make: () => H({ size: 1.3, build: 'bulky', hair: 'short', hat: { style: 'band', color: '#f4f4f4' }, sleeves: 'long', colors: { skin: '#e0b090', hair: '#4a3020', cloth: '#f8f8f4', trim: '#c83030', pants: '#2a2a2a', boot: '#1a1a1a', eye: '#2a2a1a' } }) },
  sully: { name: 'SULLY (PRE-OWNED)', voice: { base: 135, wave: 'saw' },
    make: () => H({ size: 1.3, hair: 'short', sleeves: 'short', colors: { skin: '#f0c0a0', hair: '#c87a3a', cloth: '#e8d050', trim: '#a83030', pants: '#6a5a40', boot: '#3a2a1a', eye: '#3a6a3a' } }) },
  carmine: { name: 'CARMINE "THE TENOR" FALSETTI', voice: { base: 330, wave: 'pulse' },
    make: () => H({ size: 1.6, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#6a6a70', cloth: '#1a1a1e', coat: '#e8e4dc', trim: '#c8a040', pants: '#e8e4dc', boot: '#f0f0f0', eye: '#2a2a2a' } }) },
  lenny: { name: 'LENNY THE LEDGER', voice: { base: 290, wave: 'pulse12' },
    make: () => H({ size: 1.2, hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .2, colors: { skin: '#f4d8c0', hair: '#a87a4a', cloth: '#d8d8c8', coat: '#5a6a3a', trim: '#3a4a2a', pants: '#4a4a3a', boot: '#2a2a2a', eye: '#2a2a2a' } }) },
  waitress: { name: 'WAITRESS', voice: { base: 260, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'ponytail', sleeves: 'short', colors: { skin: '#f0c8a0', hair: '#b04a2a', cloth: '#f0a0b0', trim: '#ffffff', pants: '#f0a0b0', boot: '#ffffff', eye: '#2a2a3a' } }) },
  meadow: { name: 'GIA', voice: { base: 280, wave: 'triangle' },
    make: () => H({ size: 1.2, hair: 'long', sleeves: 'long', colors: { skin: '#f4d0b0', hair: '#2a1a14', cloth: '#5a4a8a', trim: '#e8d8f0', pants: '#2a2a3a', boot: '#2a2020', eye: '#3a2a1a' } }) },
  aj: { name: 'JUNIOR', voice: { base: 200, wave: 'pulse' },
    make: () => H({ size: 1.15, hair: 'spiky', sleeves: 'short', colors: { skin: '#f4d0b0', hair: '#2a1a14', cloth: '#3a3a3a', trim: '#c83030', pants: '#3a4a6a', boot: '#e8e8e8', eye: '#3a2a1a' } }) }
};
for (const k in CAST) VOICES[k] = CAST[k].voice;
VOICES.goon = { base: 300, wave: 'pulse' }; VOICES.radio = { base: 200, wave: 'square' };

// the Falsettis: tracksuits in their colors; bruisers carry bats; gunmen point
const FOE_KINDS = {
  goon: { hp: 55, speed: 46, dmg: 9, look: () => H({ hair: E.pick(['short', 'spiky', 'bald']), sleeves: 'long', colors: { skin: E.pick(['#e8c0a0', '#d8a888', '#f0c8a8']), hair: '#1a1410', cloth: '#5a2a7a', trim: '#e8e8e8', pants: '#5a2a7a', boot: '#e8e8e8', eye: '#2a2a2a' } }), moves: ['jab', 'hook'], cash: [20, 60] },
  bruiser: { hp: 100, speed: 36, dmg: 16, look: () => H({ build: 'bulky', size: 1.45, weapon: 'staff', hair: 'bald', sleeves: 'none', colors: { skin: '#d8a888', cloth: '#2a6a6a', trim: '#e8e8e8', pants: '#2a2a2a', boot: '#1a1a1a', metal: '#8a6a3a', eye: '#2a2a2a' } }), moves: ['overhead', 'haymaker'], cash: [50, 120] },
  gunman: { hp: 45, speed: 40, dmg: 12, ranged: true, look: () => H({ weapon: 'gun', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#3a2a1a', cloth: '#1a1a1a', coat: '#4a3a5a', trim: '#8a8a8a', pants: '#2a2a2a', boot: '#1a1a1a', metal: '#3a3a3a', eye: '#2a2a2a' } }), moves: [], cash: [40, 90] },
  boss: { hp: 520, speed: 52, dmg: 18, look: () => CAST.carmine.make(), moves: ['haymaker', 'roundhouse', 'uppercut'], cash: [0, 0] },
  bagman: { hp: 140, speed: 44, dmg: 11, look: () => CAST.lenny.make(), moves: ['jab', 'kick'], cash: [0, 0] }
};

/* ---- sprites: money, food, ammo, the newspaper, ducks ---- */
const SPR = {
  cash: E.sprite(['GGGGGG', 'GgWWgG', 'GWggWG', 'GgWWgG', 'GGGGGG'], { G: '#2e8a3a', g: '#5ac060', W: '#e8f8d0' }),
  envelope: E.sprite(['WWWWWWWW', 'WwWWWWwW', 'WWwWWwWW', 'WWWwwWWW', 'WWWWWWWW'], { W: '#f0e8d0', w: '#a89878' }),
  gabagool: E.sprite(['..pppp..', '.pPPPPp.', 'pPwPPwPp', 'pPPPPPPp', '.pPPPPp.', '..pppp..'], { p: '#a83a3a', P: '#e88a8a', w: '#fff0f0' }),
  cannoli: E.sprite(['yy....yy', 'yYwwwwYy', 'yYwwwwYy', 'yy....yy'], { y: '#c88a3a', Y: '#e8b060', w: '#fff8e8' }),
  ammo: E.sprite(['.yy.yy.', '.YY.YY.', '.YY.YY.', '.bb.bb.'], { y: '#f0d060', Y: '#c8a040', b: '#6a5030' }),
  paper: E.sprite(['wwwwwwww', 'wbbwbbbw', 'wwwwwwww', 'wbwbbwbw', 'wwwwwwww'], { w: '#e8e4d8', b: '#5a5a6a' }),
  bread: E.sprite(['..yyy..', '.yYYYy.', 'yYYwYYy', '.yyyyy.'], { y: '#a86a2a', Y: '#d89a4a', w: '#f0d090' }),
  bag: E.sprite(['..bb..', '.bBBb.', 'bB$$Bb', 'bBBBBb', '.bbbb.'], { b: '#6a5a3a', B: '#9a8a5a', $: '#3ac04a' }),
  shoe: E.sprite(['bb....', 'bBbbbb', 'bBBBBb', 'bbbbbb'], { b: '#2a2018', B: '#5a4030' })
};
const DUCK = [0, 1].map(f => E.sprite(f ? ['..gg....', '.gGge...', '..gg....', 'bbbbbb..', 'bBBBBBb.', '.bbbbb..'] : ['..gg....', '.gGgee..', '..gg....', '.bbbbbb.', 'bBBBBBBb', '.bbbbbb.'],
  { g: '#2a7a3a', G: '#5ac06a', e: '#f0b020', b: '#7a5a3a', B: '#b08a5a' }, 1));
const DUCK_FLY = E.sprite(['w......w', 'ww.gg.ww', '.wbGgbw.', '..bbbe..', '...bb...'], { w: '#b08a5a', g: '#2a7a3a', G: '#5ac06a', b: '#7a5a3a', e: '#f0b020' });

/* ---- a car, drawn from its heading: a lower body, a cabin, glass, lights; any view and turn ---- */
const CAR_PAL = {
  suv: { body: '#1a1a20', cabin: '#24242c', glass: '#5a7a9a', trim: '#c8c8d0', len: 16, wid: 8.5, h: 9, roof: 15 },
  sedan: { body: '#8a1a1a', cabin: '#7a1616', glass: '#6a8aaa', trim: '#d8d8d8', len: 15, wid: 7.5, h: 7, roof: 12 },
  cab: { body: '#e8c020', cabin: '#d8b018', glass: '#6a8aaa', trim: '#1a1a1a', len: 15, wid: 7.5, h: 7, roof: 12 },
  van: { body: '#e8e8e0', cabin: '#e0e0d8', glass: '#5a6a8a', trim: '#3a8a3a', len: 17, wid: 8.5, h: 9, roof: 16 },
  truck: { body: '#3a6a3a', cabin: '#e8e8e0', glass: '#5a6a8a', trim: '#e8c020', len: 26, wid: 10, h: 12, roof: 22 },
  cop: { body: '#1a1a3a', cabin: '#f0f0f0', glass: '#5a6a8a', trim: '#e8e8e8', len: 15, wid: 7.5, h: 7, roof: 12 }
};
function drawCar(r, c, kind, o = {}) {
  const K = CAR_PAL[kind] || CAR_PAL.sedan, a = c.angle, ca = Math.cos(a), sa = Math.sin(a), z0 = (c.z || 0) + 2;
  const W = (f, s, z) => r.w(c.x + ca * f - sa * s, c.y + sa * f + ca * s, z);
  r.shadow(c.x, c.y, K.len * .85, .4, '#000000');
  r.queue(c.x, c.y, z0, g => {
    const tb = E.tones(o.color || K.body), tc = E.tones(K.cabin);
    const box = (L0, L1, S, Z0, Z1, top, side, side2) => {
      const P = [[L1, -S], [L1, S], [L0, S], [L0, -S]];
      const faces = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => {
        const p0 = P[i], p1 = P[j], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        return { i, j, d: W(mx, my, Z0)[1], mx };
      }).sort((u, v) => u.d - v.d);
      for (const f of faces) {
        const p0 = P[f.i], p1 = P[f.j];
        const q = [W(p0[0], p0[1], Z0), W(p1[0], p1[1], Z0), W(p1[0], p1[1], Z1), W(p0[0], p0[1], Z1)];
        px.poly(g, q, Math.abs(f.mx) > 1 ? side2 : side);
      }
      px.poly(g, P.map(p => W(p[0], p[1], Z1)), top);
    };
    box(-K.len, K.len, K.wid, z0, z0 + K.h * .55, tb.base, tb.sh, tb.deep);
    if (kind === 'truck') {
      box(-K.len, K.len * .35, K.wid * .98, z0 + K.h * .55, z0 + K.roof, tb.lt, tb.base, tb.sh);   // the compactor body
      box(K.len * .45, K.len, K.wid * .95, z0 + K.h * .55, z0 + K.h * 1.2, tc.base, tc.sh, tc.deep);
      const s = W(K.len + .2, 0, z0 + K.h * 1.05); px.rect(g, Math.round(s[0]) - 2, Math.round(s[1]) - 1, 4, 2, K.glass);
    } else {
      const f0 = kind === 'van' ? -K.len * .9 : -K.len * .55, f1 = K.len * .35;
      box(f0, f1, K.wid * .86, z0 + K.h * .55, z0 + K.roof * .9, tc.lt, K.glass, E.shade(K.glass, -.25));
      px.poly(g, [W(f1 - 1, -K.wid * .8, z0 + K.roof * .9), W(f1 - 1, K.wid * .8, z0 + K.roof * .9), W(f0 + 1, K.wid * .8, z0 + K.roof * .9), W(f0 + 1, -K.wid * .8, z0 + K.roof * .9)], tc.base);
    }
    // lights: head white, tail red; a cop's bar flashes
    for (const s of [-1, 1]) {
      const h = W(K.len + .3, s * K.wid * .62, z0 + K.h * .35), t = W(-K.len - .3, s * K.wid * .62, z0 + K.h * .35);
      px.rect(g, Math.round(h[0]) - 1, Math.round(h[1]) - 1, 2, 2, o.lights ? '#fffbe0' : '#e8e8d0');
      px.rect(g, Math.round(t[0]) - 1, Math.round(t[1]) - 1, 2, 2, o.braking ? '#ff3030' : '#a01818');
    }
    if (kind === 'cop') { const b = W(0, 0, z0 + K.roof * .9 + 1.5), on = Math.floor(game.real * 6) % 2; px.rect(g, Math.round(b[0]) - 3, Math.round(b[1]) - 1, 3, 2, on ? '#ff2020' : '#601010'); px.rect(g, Math.round(b[0]), Math.round(b[1]) - 1, 3, 2, on ? '#202060' : '#3060ff'); }
    if (kind === 'truck') { const t = W(-K.len * .3, K.wid + .1, z0 + K.roof * .55); E.font.text(g, 'BARITONE', Math.round(t[0]), Math.round(t[1]) - 3, '#e8c020', { font: 'tiny', align: 'center' }); }
  }, { solid: true, hides: true });
  if (o.lights && game.lights.enabled) game.lights.add(c.x + ca * (K.len + 14), c.y + sa * (K.len + 14), 6, 40, .7, { color: '#fff4c0' });
}

/* ---- a portrait for the dialog box, from any rig ---- */
const portraitOf = who => CAST[who] ? (CAST[who].rig || (CAST[who].rig = CAST[who].make(who === 'sal' ? false : undefined))) : null;

/* ===== 02-maps.js ===== */
/* ---- MAPS: drawn in code from rectangles, so a designer moves a building by changing one line ---- */
const rgb = h => E.hex(h);
const RAMP = (c, n = 5, s = .7) => E.ramp(c, n, s).map(rgb);
const GR = [RAMP('#4e8a3a'), RAMP('#5a9a42')], WALK = RAMP('#b8b2a6', 5, .4), ASPH = RAMP('#3a3a42', 5, .3), DRIVE = RAMP('#c8c0b0', 5, .3),
  GRAVEL = RAMP('#8a7a68', 5, .5), POOL = RAMP('#3aa8d8', 5, .8), DECK = RAMP('#d8ccb8', 5, .4), SNOW = RAMP('#e8eef8', 5, .3), ICE = RAMP('#9ad0e8', 5, .5),
  CARPET = RAMP('#6a2a3a', 5, .5), WOOD = RAMP('#8a5a32', 5, .6), TILE_A = RAMP('#e8e4dc', 3, .2), TILE_B = RAMP('#2a2a30', 3, .2), DIRT = RAMP('#6a5240', 5, .5);
const YEL = rgb('#e8c040'), WHT = rgb('#e8e8e0');

function grid(w, h, fill) { const g = Array.from({ length: h }, () => Array(w).fill(fill)); g.rect = (x, y, rw, rh, ch) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (j >= 0 && j < h && i >= 0 && i < w) g[j][i] = ch; }; return g; }

/* THE TOWN: two avenues across, two streets down, ten lots */
const TOWN = (() => {
  const W = 60, Hh = 44, g = grid(W, Hh, '.');
  const HR = [[14, 16], [27, 29]], VR = [[22, 24], [38, 40]];
  for (const [a, b] of HR) { g.rect(1, a - 1, W - 2, 1, ','); g.rect(1, b + 1, W - 2, 1, ','); }
  for (const [a, b] of VR) { g.rect(a - 1, a === 22 ? 13 : 1, 1, Hh - 2, ','); g.rect(b + 1, a === 22 ? 13 : 1, 1, Hh - 2, ','); }
  for (const [a, b] of HR) g.rect(1, a, W - 2, b - a + 1, '=');
  for (const [a, b] of VR) for (let y = a === 22 ? 13 : 1; y < Hh - 1; y++) for (let x = a; x <= b; x++) g[y][x] = g[y][x] === '=' ? '+' : '|';
  // Sal's house, the pool, the driveway
  g.rect(2, 1, 19, 11, '.'); g.rect(3, 2, 9, 5, 'H'); g.rect(13, 2, 7, 7, 'w'); g.rect(14, 3, 5, 4, '~'); g.rect(6, 7, 3, 6, '_');
  // the park: paths and a gazebo lawn
  g.rect(26, 1, 11, 11, '.'); g.rect(26, 6, 11, 1, 't'); g.rect(31, 1, 1, 12, 't');
  // the therapist's office and its lot
  g.rect(42, 1, 17, 12, 'p'); g.rect(45, 2, 11, 5, 'O');
  // the row of shops: Fusco's Meats, Dolce Vita, Il Gabbiano, Spin City, Sully's Pre-Owned
  g.rect(1, 18, 20, 8, ','); g.rect(2, 18, 8, 5, 'B'); g.rect(12, 18, 8, 5, 'K');
  g.rect(26, 18, 11, 8, ','); g.rect(27, 18, 9, 5, 'R');
  g.rect(42, 18, 17, 8, ','); g.rect(42, 18, 7, 5, 'L'); g.rect(50, 18, 9, 8, 'p'); g.rect(55, 18, 4, 3, 'S');
  // the night: the Velvet Brass and its lot, the Moonlight Diner, the sanitation yard
  g.rect(1, 31, 20, 12, 'p'); g.rect(3, 32, 10, 5, 'C');
  g.rect(26, 31, 11, 12, 'p'); g.rect(27, 32, 9, 4, 'D');
  g.rect(42, 31, 17, 12, 'g'); g.rect(50, 31, 9, 4, 'W');
  g.rect(0, 0, W, 1, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  const legend = {
    '#': 1, H: 2, O: 3, B: 4, K: 5, R: 6, L: 7, S: 8, C: 9, D: 10, W: 11,
    '.': { floor: 'lawn' }, ',': { floor: 'walk' }, '=': { floor: 'rh' }, '|': { floor: 'rv' }, '+': { floor: 'rx' }, '_': { floor: 'drive' },
    p: { floor: 'lot' }, g: { floor: 'yard' }, w: { floor: 'deck' }, '~': { floor: 'pool', block: true }, t: { floor: 'path' }
  };
  const types = {
    1: { h: 18, face: 'hedge', roof: 'leaves', top: '#3a7a3a', side: '#2a5a2e', cut: true, cutH: 6 },
    2: { h: 34, face: 'plaster', roof: 'tiles', top: '#9a4a3a', side: '#e8dcc4', cut: true, cutH: 8 },
    3: { h: 52, face: 'stone', roof: 'slab', top: '#6a6a72', side: '#a8a49a', course: 10, cut: true, cutH: 8 },
    4: { h: 36, face: 'brick', roof: 'slab', top: '#5a4a44', side: '#9a3a2a', cut: true, cutH: 8 },
    5: { h: 32, face: 'plaster', roof: 'slab', top: '#8a6a6a', side: '#f0d8d0', cut: true, cutH: 8 },
    6: { h: 36, face: 'brick', roof: 'tiles', top: '#3a6a3a', side: '#c8b088', cut: true, cutH: 8 },
    7: { h: 30, face: 'plaster', roof: 'slab', top: '#5a6a7a', side: '#a8c8e0', cut: true, cutH: 8 },
    8: { h: 26, face: 'plank', roof: 'slab', top: '#7a7a7a', side: '#f0f0e8', cut: true, cutH: 8 },
    9: { h: 38, face: 'plank', roof: 'slab', top: '#2a2a32', side: '#3a2448', cut: true, cutH: 8 },
    10: { h: 30, face: 'steel', roof: 'slab', top: '#8a8a92', side: '#c8ccd4', cut: true, cutH: 8 },
    11: { h: 46, face: 'rusted', roof: 'slab', top: '#5a5a5a', side: '#7a6a5a', cut: true, cutH: 8 }
  };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  // where things are: doors face south (their y is the wall's face), people stand in front
  const at = {
    hero: C(7, 8), paper: C(7, 12), donna: C(13, 9.4), ducks: C(16, 4.5), houseDoor: { x: 7.5 * T, y: 7 * T },
    office: { x: 50.5 * T, y: 7 * T }, officeStand: C(50, 8),
    fusco: { x: 6 * T, y: 23 * T }, gino: C(6, 24), nickyStand: C(4, 24.5),
    bakery: { x: 16 * T, y: 23 * T }, baker: C(16, 24),
    gabbiano: { x: 31.5 * T, y: 23 * T }, chef: C(31, 24),
    laundry: { x: 45.5 * T, y: 23 * T }, murray: C(45, 24),
    sully: C(54, 22.5), sullyDoor: { x: 57 * T, y: 21 * T },
    club: { x: 8 * T, y: 37 * T }, frankie: C(8, 38.2),
    diner: { x: 31.5 * T, y: 36 * T }, dinerStand: C(31, 37.5),
    yard: C(48, 38), yardGate: C(42, 38), suv: { x: 11 * T, y: 11.5 * T, angle: Math.PI / 2 }
  };
  // things solid where they stand: shapes and props (dumpsters, the patio, the car lot)
  const solids = [
    ['table', 28 * T, 24.5 * T], ['table', 34.5 * T, 24.5 * T], ['bench', 28.5 * T, 3 * T], ['bench', 34 * T, 9.5 * T], ['bench', 28 * T, 9.5 * T],
    ['crate', 44 * T, 33 * T], ['crate', 45 * T, 33.2 * T], ['barrel', 47 * T, 32.5 * T], ['barrel', 47.6 * T, 33.3 * T], ['sack', 10.2 * T, 23.6 * T],
    ['barrel', 13 * T, 39 * T], ['crate', 20 * T, 32 * T], ['cart', 49 * T, 9.5 * T]
  ];
  const props = [];
  const lamp = (x, y) => props.push({ prop: 'streetlamp', x, y, light: true, r: 3 });
  for (let x = 4; x < W - 2; x += 9) { lamp(x * T, 12.8 * T); lamp((x + 4) * T, 17.6 * T); lamp(x * T, 25.8 * T); lamp((x + 4) * T, 30.6 * T); }
  for (const [x, y] of [[3, 9], [12, 11], [19, 10], [27, 2], [35, 3], [27, 10], [35, 10], [33, 2], [29, 8], [20, 2]]) props.push({ prop: E.hash2(x, y) < .5 ? 'tree' : 'pine', x: x * T, y: y * T, r: 6, size: 1.3 });
  for (const [x, y] of [[2.5, 7.6], [11.6, 7.6], [10, 9], [4, 11], [43, 2], [56.5, 8], [24.5, 2]]) props.push({ prop: 'bush', x: x * T, y: y * T, r: 5, size: 1.1 });
  for (const [x, y] of [[13, 7.6], [19.6, 7.6]]) props.push({ prop: 'flowers', x: x * T, y: y * T, size: 1, color: '#f06a9a' });
  props.push({ prop: 'hydrant', x: 11 * T, y: 13.4 * T, r: 3 }, { prop: 'hydrant', x: 36 * T, y: 26.4 * T, r: 3 }, { prop: 'trashcan', x: 1.8 * T, y: 23.4 * T, r: 3 }, { prop: 'trashcan', x: 41.6 * T, y: 23.4 * T, r: 3 }, { prop: 'trashcan', x: 26.6 * T, y: 30.4 * T, r: 3 });
  props.push({ prop: 'sign', x: 8.6 * T, y: 13.2 * T, r: 3, text: 'BARITONE' }, { prop: 'firedrum', x: 44 * T, y: 40 * T, r: 4, light: true }, { prop: 'firedrum', x: 56 * T, y: 41 * T, r: 4, light: true }, { prop: 'sandbags', x: 43 * T, y: 36 * T, r: 6 });
  // faces: doors, awnings, windows and the shop signs (drawn on the wall faces)
  const faces = [
    { prop: 'door', x: 7.5 * T, y: 7 * T, color: '#6a3a22' }, { prop: 'window', x: 4.5 * T, y: 7 * T, z: 12, size: .7 }, { prop: 'window', x: 10.5 * T, y: 7 * T, z: 12, size: .7 },
    { prop: 'door', x: 50.5 * T, y: 7 * T, color: '#3a3a4a' }, { prop: 'window', x: 47 * T, y: 7 * T, z: 18, size: .8 }, { prop: 'window', x: 54 * T, y: 7 * T, z: 18, size: .8 },
    { prop: 'door', x: 6 * T, y: 23 * T, color: '#7a2a1a' }, { prop: 'awning', x: 6 * T, y: 23 * T, z: 24, color: '#c83a2a' }, { prop: 'window', x: 3.5 * T, y: 23 * T, z: 10, size: .7 }, { prop: 'window', x: 8.5 * T, y: 23 * T, z: 10, size: .7 },
    { prop: 'door', x: 16 * T, y: 23 * T, color: '#e8a0b0' }, { prop: 'awning', x: 16 * T, y: 23 * T, z: 22, color: '#f0a0c0' },
    { prop: 'door', x: 31.5 * T, y: 23 * T, color: '#2a5a2a' }, { prop: 'awning', x: 29 * T, y: 23 * T, z: 24, color: '#2a8a3a' }, { prop: 'awning', x: 34 * T, y: 23 * T, z: 24, color: '#e8e8e8' },
    { prop: 'door', x: 45.5 * T, y: 23 * T, color: '#3a6a9a' }, { prop: 'awning', x: 45.5 * T, y: 23 * T, z: 21, color: '#3a8ac8' },
    { prop: 'door', x: 57 * T, y: 21 * T, color: '#e8c020' },
    { prop: 'door', x: 8 * T, y: 37 * T, color: '#8a2a8a' }, { prop: 'lantern', x: 5 * T, y: 37 * T, z: 30, anchor: 'top', light: '#ff60c0' }, { prop: 'lantern', x: 11 * T, y: 37 * T, z: 30, anchor: 'top', light: '#ff60c0' },
    { prop: 'door', x: 31.5 * T, y: 36 * T, color: '#c83030' }, { prop: 'window', x: 28.5 * T, y: 36 * T, z: 10, size: .8 }, { prop: 'window', x: 34.5 * T, y: 36 * T, z: 10, size: .8 },
    { prop: 'door', x: 54 * T, y: 35 * T, color: '#5a5a3a' }
  ];
  // the signs above the doors, in the house font: [text, x, face y, z, color]
  const signs = [['FUSCO\'S MEATS', 6 * T, 23 * T, 33, '#ffe8c0'], ['DOLCE VITA', 16 * T, 23 * T, 29, '#ffd0e0'], ['IL GABBIANO', 31.5 * T, 23 * T, 33, '#e8ffe0'],
    ['SPIN CITY', 45.5 * T, 23 * T, 27, '#d0e8ff'], ['SULLY\'S', 57 * T, 21 * T, 23, '#fff0a0'], ['THE VELVET BRASS', 8 * T, 37 * T, 35, '#ff80e0'], ['MOONLIGHT DINER', 31.5 * T, 36 * T, 27, '#80e8ff'],
    ['DR. E. MARCHETTI, M.D.', 50.5 * T, 7 * T, 32, '#f0f0f0'], ['BARITONE SANITATION', 54 * T, 35 * T, 40, '#e8c020']];
  const parked = [{ kind: 'sedan', x: 52 * T, y: 23 * T, angle: Math.PI / 2, color: '#3a5a9a' }, { kind: 'sedan', x: 52 * T, y: 19.5 * T, angle: Math.PI / 2, color: '#e8e8e8' },
    { kind: 'cab', x: 44 * T, y: 10 * T, angle: 0 }, { kind: 'sedan', x: 15 * T, y: 40.5 * T, angle: 0, color: '#4a2a5a' }, { kind: 'van', x: 29 * T, y: 40 * T, angle: 0 },
    { kind: 'truck', x: 46 * T, y: 36.5 * T, angle: Math.PI, color: '#3a6a3a' }, { kind: 'truck', x: 55 * T, y: 39.5 * T, angle: 0, color: '#3a6a3a' }];
  return { id: 'town', name: 'North Caldwell, NJ', W, H: Hh, rows: g.map(r => r.join('')), legend, types, at, solids, props, faces, signs, parked, roads: { HR, VR } };
})();

/* THE PINE BARRENS: snow, pines, a frozen pond, a hunter's cabin, the road out */
const BARRENS = (() => {
  const W = 52, Hh = 40, g = grid(W, Hh, 's');
  g.rect(0, 0, W, 1, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  g.rect(18, 14, 9, 6, 'i');             // the frozen pond
  g.rect(36, 4, 7, 5, 'X');              // the hunter's cabin
  g.rect(1, 34, W - 2, 3, 'r');          // the road out, ploughed
  const trees = [];
  for (let y = 2; y < 33; y++) for (let x = 2; x < W - 2; x++) {
    const h = E.hash2(x * 3, y * 7);
    const clear = (x > 3 && x < 9 && y > 2 && y < 9) || (g[y][x] !== 's') || (x > 34 && x < 45 && y > 2 && y < 12) || Math.abs(x - 6 - (y > 9 ? (y - 9) * .9 : 0)) < 2 && y < 30;
    const path = (y > 18 && y < 22 && x > 26) || (x > 44 && x < 48 && y > 8);
    if (!clear && !path && h < .21) trees.push([x, y]);
  }
  const legend = { '#': 1, X: 2, s: { floor: 'snow' }, i: { floor: 'ice' }, r: { floor: 'road' } };
  const types = { 1: { h: 24, face: 'hedge', roof: 'snow', top: '#e8eef8', side: '#2a4a3a', cut: true, cutH: 6 }, 2: { h: 30, face: 'plank', roof: 'snow', top: '#e8eef8', side: '#6a4a2a', cut: true, cutH: 8 } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  const at = { hero: C(5, 5), nicky: C(7, 5), van: { x: 6 * T, y: 3.5 * T, angle: 0 }, shoe: C(14, 20), cabin: { x: 39.5 * T, y: 9 * T }, lenny: C(39, 11), exit: C(46, 35), pond: C(22, 17) };
  const props = [{ prop: 'firedrum', x: 10 * T, y: 12 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 28 * T, y: 24 * T, light: true, r: 4, warm: true },
    { prop: 'firedrum', x: 41 * T, y: 13 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 15 * T, y: 30 * T, light: true, r: 4, warm: true }, { prop: 'firedrum', x: 46 * T, y: 26 * T, light: true, r: 4, warm: true }];
  for (const [x, y] of trees) props.push({ prop: 'pine', x: (x + .5) * T, y: (y + .5) * T, r: 6, size: 1.2 + E.hash2(x, y) * .5, color: '#2a5a44', tree: true });
  const faces = [{ prop: 'door', x: 39.5 * T, y: 9 * T, color: '#4a2a1a' }, { prop: 'window', x: 37.5 * T, y: 9 * T, z: 12, size: .6, colors: ['#ffd070', '#ffb040'] }];
  const signs = [['ROUTE 72  ->', 46 * T, 34 * T, 6, '#e8e8e8']];
  return { id: 'barrens', name: 'The Pine Barrens', W, H: Hh, rows: g.map(r => r.join('')), legend, types, at, solids: [], props, faces, signs, parked: [{ kind: 'van', x: 6 * T, y: 3.5 * T, angle: 0, color: '#e8e8e0' }], trees };
})();

/* THE OFFICE: two chairs, a window, books; a box of tissues nobody uses */
const OFFICE = (() => {
  const W = 14, Hh = 10, g = grid(W, Hh, 'c');
  g.rect(0, 0, W, 2, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  const legend = { '#': 1, c: { floor: 'carpet' } };
  const types = { 1: { h: 40, face: 'plaster', roof: 'plain', top: '#3a3040', side: '#d8ccb8', cut: true, cutH: 4 } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  return { id: 'office', name: 'Dr. Marchetti\'s Office', W, H: Hh, rows: g.map(r => r.join('')), legend, types,
    at: { sal: C(4.3, 5), melfi: C(9.7, 5) },
    solids: [['chair', 4.3 * T, 5.5 * T, { facing: 0 }], ['chair', 9.7 * T, 5.5 * T, { facing: Math.PI }], ['bookcase', 2 * T, 2.6 * T], ['bookcase', 3.5 * T, 2.6 * T], ['table', 7 * T, 7.5 * T], ['pot', 12 * T, 2.8 * T]],
    props: [{ prop: 'lamp', x: 11.5 * T, y: 3 * T, light: true }, { prop: 'flowers', x: 7 * T, y: 7.5 * T, z: 10, color: '#f0d050' }],
    faces: [{ prop: 'window', x: 7 * T, y: 2 * T, z: 12, size: 1.1, colors: ['#a8d8ff', '#e8f4ff'] }, { prop: 'banner', x: 10.5 * T, y: 2 * T, z: 14, size: .6, color: '#3a5a8a', emblem: '#e8e8e8' }],
    signs: [], parked: [] };
})();

/* THE DINER: booths, the counter, the jukebox, a door with a bell */
const DINER = (() => {
  const W = 16, Hh = 11, g = grid(W, Hh, 'k');
  g.rect(0, 0, W, 2, '#'); g.rect(0, Hh - 1, W, 1, '#'); g.rect(0, 0, 1, Hh, '#'); g.rect(W - 1, 0, 1, Hh, '#');
  g.rect(9, 0, 1, 1, '#');
  g.rect(1, 2, 6, 1, 'n');   // the counter
  const legend = { '#': 1, n: 2, k: { floor: 'checker' } };
  const types = { 1: { h: 38, face: 'steel', roof: 'plain', top: '#2a2a30', side: '#c8ccd4', cut: true, cutH: 4 }, 2: { h: 12, face: 'steel', roof: 'plain', top: '#e84a4a', side: '#c8ccd4' } };
  const C = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });
  return { id: 'diner', name: 'The Moonlight Diner', W, H: Hh, rows: g.map(r => r.join('')), legend, types,
    at: { sal: C(11, 6.2), door: C(8, 9.2), juke: { x: 13.5 * T, y: 2.6 * T }, seats: [C(12.6, 6.2), C(11, 4.6), C(12.6, 4.6)], booth: C(11.8, 5.4), waitress: C(4, 3.6) },
    solids: [['table', 11.8 * T, 5.6 * T, { scale: 1.1 }], ['bench', 11.8 * T, 3.8 * T], ['bench', 11.8 * T, 7.2 * T], ['table', 5 * T, 6.5 * T], ['stool', 2 * T, 3.6 * T], ['stool', 3.5 * T, 3.6 * T], ['stool', 5 * T, 3.6 * T]],
    props: [{ prop: 'lamp', x: 8 * T, y: 2.6 * T, light: true }, { prop: 'lamp', x: 1.6 * T, y: 8.5 * T, light: true }],
    faces: [{ prop: 'window', x: 3 * T, y: 2 * T, z: 16, size: .8, colors: ['#203060', '#304080'] }, { prop: 'window', x: 12 * T, y: 2 * T, z: 16, size: .8, colors: ['#203060', '#304080'] }],
    signs: [], parked: [] };
})();

/* ---- the floors: asphalt with its lines, sidewalks in squares, mowed lawns, a pool, snow, a checkerboard ---- */
function floorTex(x, y, tag) {
  const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T, n = E.noise2(x / 9, y / 9), h = E.hash2(Math.floor(x / 2), Math.floor(y / 2));
  const sp = (P, i) => P[clamp(i + (h < .08 ? -1 : h > .94 ? 1 : 0), 0, P.length - 1)];
  switch (tag) {
    case 'lawn': { const stripe = Math.floor(x / 24) % 2; return sp(GR[stripe], n < .35 ? 1 : n > .7 ? 3 : 2); }
    case 'walk': return (lx < .9 || ly < .9) ? WALK[1] : sp(WALK, n > .6 ? 3 : 2);
    case 'rh': case 'rv': case 'rx': case 'road': {
      if (tag === 'road') return sp(SNOW, 1);   // the barrens' ploughed road
      const roads = TOWN.roads;
      if (tag === 'rh') { const r = roads.HR.find(([a, b]) => cy >= a && cy <= b); if (r) { const mid = (r[0] + r[1] + 1) / 2 * T; if (Math.abs(y - mid) < .8 && Math.floor(x / 12) % 2 === 0) return YEL; } }
      if (tag === 'rv') { const r = roads.VR.find(([a, b]) => cx >= a && cx <= b); if (r) { const mid = (r[0] + r[1] + 1) / 2 * T; if (Math.abs(x - mid) < .8 && Math.floor(y / 12) % 2 === 0) return YEL; } }
      if (tag === 'rx') { const hr = roads.HR.find(([a, b]) => cy >= a && cy <= b), vr = roads.VR.find(([a, b]) => cx >= a && cx <= b);
        if (hr && vr && ((x - vr[0] * T < 3 && Math.floor(y / 4) % 2 === 0) || ((vr[1] + 1) * T - x < 3 && Math.floor(y / 4) % 2 === 0))) return WHT; }
      return sp(ASPH, n > .62 ? 3 : n < .3 ? 1 : 2);
    }
    case 'drive': return (lx < .7) ? DRIVE[1] : sp(DRIVE, n > .5 ? 3 : 2);
    case 'lot': { if (Math.abs(lx - 1) < .7 && Math.floor(y / T) % 3 !== 0) return rgb('#d8d8d0'); return sp(ASPH, n > .55 ? 2 : 1); }
    case 'yard': return sp(GRAVEL, n > .55 ? 3 : n < .3 ? 1 : 2);
    case 'deck': return (lx < .8 || ly < .8) ? DECK[1] : sp(DECK, 3);
    case 'pool': { const w = Math.sin(x / 5 + y / 7) + Math.sin(y / 3.3 - x / 9); return POOL[w > 1.3 ? 4 : w > .2 ? 3 : 2]; }
    case 'path': return sp(DIRT, n > .5 ? 3 : 2);
    case 'snow': { const tr = E.noise2(x / 30, y / 30); return sp(SNOW, tr > .62 ? 3 : tr < .32 ? 1 : 2); }
    case 'ice': { const c = Math.sin(x / 7 + y / 11) * Math.cos(y / 6); return ICE[c > .6 ? 4 : c < -.5 ? 1 : 2]; }
    case 'carpet': return (Math.floor(x / 4) + Math.floor(y / 4)) % 7 === 0 ? CARPET[3] : sp(CARPET, 2);
    case 'checker': return ((cx + cy) % 2 ? TILE_A : TILE_B)[ly < .7 || lx < .7 ? 0 : 1];
  }
  return sp(GR[0], 2);
}

/* the map of a place, built once and kept: its TileMap and its solids */
const MAPS = {};
function mapOf(def) {
  if (MAPS[def.id]) return MAPS[def.id];
  const m = new E.TileMap({ rows: def.rows, legend: def.legend, types: def.types, floorTex, ao: 6, outside: def.id === 'barrens' ? '#c8d0e0' : '#1a1a20' });
  for (const [id, x, y, o] of def.solids) m.solid(id, x, y, 0, o || { facing: E.hash2(x, y) * 4 > 2 ? Math.PI / 2 : 0 });
  for (const p of def.props) if (p.r && p.tree) { const [cx, cy] = m.toCell(p.x, p.y); m.block(cx, cy, true); }
  m.def = def;
  return (MAPS[def.id] = m);
}
const PLACES = { town: TOWN, barrens: BARRENS, office: OFFICE, diner: DINER };

/* ===== 03-world.js ===== */
/* ---- THE WORLD: one place at a time; its people, its cars, its trouble ---- */
const W = { place: null, map: null, def: null, heroes: [], npcs: [], foes: [], items: [], cars: [], parked: [], ducks: [], peds: [], traffic: [],
  marks: [], ghosts: new Map(), shots: null, night: false, mode: 'story', demo: false, cold: 100, banner: null, hover: null, objective: null };
const shots = new E.Bullets(game, { plane: 'ground' });
W.shots = shots;

// the story's numbers (saved): money, the crew's respect, the family's patience, and Sal's nerves
const S = { ch: 0, step: 0, cash: 0, respect: 50, family: 50, stress: 20, ammo: 0, hp: 100, flags: {}, choices: [], seen: {} };
const resetStory = () => Object.assign(S, { ch: 0, step: 0, cash: 0, respect: 50, family: 50, stress: 20, ammo: 0, hp: 100, flags: {}, choices: [], seen: {} });
const adj = (k, v) => { S[k] = clamp(S[k] + v, 0, k === 'cash' ? 1e9 : 100); if (k === 'respect' || k === 'family') hudNote(k, v); };
let hudNote = () => {};

/* ---- the heroes: Sal (player 1) and Nicky (player 2 drops in; an ally in the woods) ---- */
function makeHero(who, x, y, input, o = {}) {
  const h = new E.Body({ x, y, r: 5 });
  Object.assign(h, { who, input, hp: 100, max: 100, facing: Math.PI / 2, roll: 0, rollDir: 0, inv: 0, hurt: 0, stun: 0, gunT: 0, showGun: 0, aim: Math.PI / 2,
    combo: new E.Combo([new E.Attack('jab', { hold: .05 }), new E.Attack('cross', { hold: .05 }), new E.Attack('hook', { hold: .1 })], { window: .35 }),
    kickA: new E.Attack('roundhouse', { hold: .1 }), car: null, cash: 0, dead: 0, ai: o.ai || null, god: !!o.god, robe: !!o.robe, color: o.color || '#4a8aff', flash: 0, hits: 0, auto: null });
  rebuildRigs(h);
  return h;
}
function rebuildRigs(h) { h.rigs = { fists: rigOf(h.who, h.robe), gun: rigOf(h.who, h.robe, { weapon: 'gun' }) }; }
const hero = () => W.heroes[0];

function heroIntent(h) {
  const p = h.input;
  if (h.auto) return h.auto(h);
  if (!p) return h.ai ? h.ai(h) : {};
  const m = p.move();
  if (h.goTo) {
    if (Math.hypot(m[0], m[1]) > .2 || h.car) h.goTo = null;
    else { const g = h.goTo, dd = Math.hypot(g.x - h.x, g.y - h.y); if (dd < (g.use ? g.use.r * .8 : 8)) { h.goTo = null; if (g.use) g.use.act(h); return {}; } const a = Math.atan2(g.y - h.y, g.x - h.x); return { gx: Math.cos(a), gy: Math.sin(a) }; }
  }
  let aim = null;
  if (p.lastDevice === 'mouse' || (p.lastDevice === 'keyboard' && p === I && p.mouse && p.mouse.active)) {
    const g = game.mouseGround(); if (g) aim = Math.atan2(g[1] - h.y, g[0] - h.x);
  } else if (p.padAim) { const d = game.view.screenDirToGround(p.padAim[0], p.padAim[1]); aim = Math.atan2(d[1], d[0]); }
  return { mx: m[0], my: m[1], attack: p.buffered('attack', .2), kick: p.pressed('kick'), interact: p.pressed('interact'), dodge: p.pressed('dodge'),
    block: p.down('block'), fire: p.down('fire'), sprint: p.down('sprint'), aim, gas: p.down('fire') || p.down('up'), brake: p.down('block') || p.down('down'), hand: p.down('dodge'), consume: () => p.consume('attack') };
}

const ROLL_T = .32;
function updateHero(h, dt) {
  if (h.dead) { h.dead += dt; h.rigs.fists.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: 'die' }); return; }
  const it = heroIntent(h) || {};
  if (h.car) return driveCar(h, it, dt);
  h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt); h.gunT = Math.max(0, h.gunT - dt); h.showGun = Math.max(0, h.showGun - dt); h.flash = Math.max(0, h.flash - dt);
  h.stun = Math.max(0, h.stun - dt);
  const d = it.gx != null ? [it.gx, it.gy] : game.view.screenDirToGround(it.mx || 0, it.my || 0), mag = Math.hypot(d[0], d[1]);
  const atk = h.combo.state || h.kickA.state;
  h.combo.update(dt); h.kickA.update(dt);
  if (h.roll > 0) {
    h.roll -= dt; h.vx = Math.cos(h.rollDir) * 215; h.vy = Math.sin(h.rollDir) * 215;
  } else if (h.stun > 0) { h.vx *= .85; h.vy *= .85; }
  else {
    const slow = it.block ? .35 : atk ? .25 : h.showGun > 0 ? .8 : 1, sp = (it.sprint ? 122 : 78) * slow;
    h.vx = d[0] * sp; h.vy = d[1] * sp;
    if (mag > .1 && !atk) h.facing = Math.atan2(d[1], d[0]);
    if (it.aim != null && (it.fire || h.showGun > 0)) h.facing = it.aim;
    // fists and feet: a soft lock turns a swing toward the nearest Falsetti
    if (it.attack && !h.kickA.busy && h.combo.press()) { it.consume && it.consume(); faceNearest(h, 34); A.sfx('swing', { vol: .5 }); }
    if (it.kick && !h.combo.busy && h.kickA.start()) { faceNearest(h, 36); A.sfx('whoosh', { vol: .5 }); }
    if (it.dodge) { h.roll = ROLL_T; h.inv = ROLL_T + .05; h.rollDir = mag > .1 ? Math.atan2(d[1], d[0]) : h.facing; h.combo.cancel && h.combo.cancel(); A.sfx('dash', { vol: .4 }); P.dust(h.x, h.y, 0, 6); }
    if (it.fire && h.gunT <= 0 && !atk) fireGun(h, it.aim);
  }
  if (it.interact && h.roll <= 0) interact(h);   // talking and using never wait for a stagger to end
  h.blocking = !!it.block && h.roll <= 0 && !atk && h.stun <= 0;
  // the hits land during the strike; the third punch and the kick send them flying
  const hitList = W.foes.filter(f => !f.dead);
  h.combo.hits(hitList, e => E.inArc(h, h.facing, e, 25, 1.1), e => hitFoe(e, h.combo.step === 2 ? 20 : 12, h.facing, h.combo.step === 2 ? 170 : 70, h));
  h.kickA.hits(hitList, e => E.inArc(h, h.facing, e, 28, 1.2), e => hitFoe(e, 22, h.facing, 220, h));
  for (const d of W.ducks) if (h.combo.active || h.kickA.active) { if (Math.hypot(d.x - h.x, d.y - h.y) < 24 && !d.fly) { d.fly = 1; A.sfx('quack'); } }
  h.update(dt, W.map);
  pushOutProps(h);
  const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists;
  const st = { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, attack: h.combo.state || h.kickA.state, hurt: h.hurt > .1, flip: h.roll > 0 ? 1 - h.roll / ROLL_T : 0,
    stance: h.blocking ? 'guard' : null, pose: h.blocking ? 'block' : h.pose || null, point: h.showGun > 0, sprint: it.sprint && mag > .5 };
  h.rigs.fists.update(dt, st); h.rigs.gun.update(dt, st);
}
function faceNearest(h, range) {
  let best = null, bd = range;
  for (const f of W.foes) if (!f.dead) { const dd = dist(h, f); if (dd < bd) { bd = dd; best = f; } }
  if (best) h.facing = angTo(h, best);
}
function fireGun(h, aim) {
  const ammo = h === hero() ? S.ammo : (h.ammo || 0);
  if (W.mode === 'story' && !S.flags.gun && h === hero() && !W.demo) { if (!W.noGunNote) { toast('No piece', 'Sal left the pistol at home. Frankie keeps it at the club.'); W.noGunNote = 1; } return; }
  h.gunT = .3; h.showGun = 1.6;
  if (ammo <= 0 && !h.god) { A.sfx('click'); h.gunT = .4; if (!W.ammoNote) { toast('Out of ammo', 'Beat it out of them: the Falsettis drop rounds.'); W.ammoNote = 1; } return; }
  let a = aim != null ? aim : h.facing;
  if (game.settings.autoaim) { let best = null, bd = .35; for (const f of W.foes) if (!f.dead && dist(h, f) < 200) { const da = Math.abs(E.angDiff(a, angTo(h, f))); if (da < bd) { bd = da; best = f; } } if (best) a = angTo(h, best); }
  h.facing = a;
  if (h === hero()) { if (!h.god) S.ammo--; adj('stress', .6); } else if (!h.god) h.ammo--;
  const mx = h.x + Math.cos(a) * 12, my = h.y + Math.sin(a) * 12;
  shots.fire({ x: mx, y: my, z: 20, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 2, team: 'player', color: '#fff4a0', life: .9, dmg: 34, owner: h });
  A.sfx('gun'); game.shake(2); P.sparks(mx, my, 20, 4, a); h.input && h.input.rumble && h.input.rumble(.4, .08);
  W.noise = 2;
}
function hitFoe(f, dmg, ang, push, by) {
  if (f.dead || f.inv > 0 || f.surrender || f.flee) return;
  if (f.blocking && Math.abs(E.angDiff(f.facing, ang + Math.PI)) < 1.2 && dmg < 30) { P.sparks(f.x, f.y, 18, 6, ang + Math.PI); A.sfx('bump'); f.blocking = 0; f.stun = .2; return; }
  const k = by && by.focus > 0 ? 1.3 : 1;
  dmg = Math.round(dmg * k * (by && by.god ? 3 : 1));
  f.hp -= dmg; f.stun = Math.max(f.stun, f.kind === 'boss' ? .12 : .38); f.flash = .12; f.atk && f.atk.cancel && f.kind !== 'boss' && f.atk.cancel();
  f.push(Math.cos(ang) * push * (f.kind === 'boss' ? .3 : 1), Math.sin(ang) * push * (f.kind === 'boss' ? .3 : 1), push > 150 ? 80 : 0);
  game.hitFx(f.x, f.y, 20, { power: push > 150 ? 1.3 : .8, angle: ang, damage: dmg, sound: push > 150 ? 'kick' : 'punch' });
  if (by && by.input && by.input.rumble) by.input.rumble(.5, .1);
  if (by === hero() && W.mode === 'story') adj('stress', -.4);
  if (f.noDie && f.hp <= f.max * (f.kind === 'boss' ? .08 : .3)) { f.hp = Math.max(1, f.hp); f.surrender = 1; f.atk && f.atk.cancel && f.atk.cancel(); W.lobs = []; return; }
  if (f.hp <= 0) killFoe(f, by);
}
function killFoe(f, by) {
  f.dead = 1; f.hp = 0; P.dust(f.x, f.y, 0, 10); A.sfx('stomp');
  const K = FOE_KINDS[f.kind];
  if (K.cash[1] > 0 && f.loot !== false) dropItem('cash', f.x, f.y, Math.round(rnd(K.cash[0], K.cash[1]) / 5) * 5);
  if (f.loot !== false && Math.random() < (K.ranged ? .9 : .35)) dropItem('ammo', f.x + rnd(-8, 8), f.y + rnd(-8, 8), K.ranged ? 6 : 3);
  if (f.loot !== false && Math.random() < .2) dropItem('gabagool', f.x + rnd(-8, 8), f.y + rnd(-8, 8));
  if (by && by.isP) by.kills = (by.kills || 0) + 1;
  if (W.onKill) W.onKill(f);
}
function hurtHero(h, dmg, ang, from) {
  if (h.dead || h.inv > 0 || h.roll > 0 || h.car) return;
  if (h.god) { h.flash = .1; return; }
  dmg *= settingsDiff();
  if (h.blocking && Math.abs(E.angDiff(h.facing, ang + Math.PI)) < 1.5) {
    dmg *= .15; P.sparks(h.x, h.y, 20, 8, ang + Math.PI); A.sfx('bump'); h.push(Math.cos(ang) * 60, Math.sin(ang) * 60, 0);
    if (h === hero() && W.mode === 'story') adj('stress', 1);
  } else {
    h.hurt = .35; h.inv = .55; h.stun = .25; h.push(Math.cos(ang) * 130, Math.sin(ang) * 130, 40);
    game.hitFx(h.x, h.y, 20, { power: .9, angle: ang, damage: Math.round(dmg), color: '#ff6060', sound: 'hurt' });
    if (h === hero() && W.mode === 'story') adj('stress', dmg * .3);
  }
  h.hp -= dmg;
  if (h.input && h.input.rumble) h.input.rumble(.7, .2);
  if (h.hp <= 0) { h.hp = 0; h.dead = .001; A.sfx('die'); game.flash('#600000', .3); if (W.onHeroDown) W.onHeroDown(h); }
}

/* ---- the things in the world you can use: people, doors, the car, the ducks ---- */
function interactables() {
  const list = [];
  for (const n of W.npcs) if (n.act && (!n.show || n.show())) list.push({ x: n.x, y: n.y, label: typeof n.label === 'function' ? n.label() : n.label || 'Talk', act: n.act, who: n, r: 30 });
  for (const s of W.marks) if (s.act && (!s.show || s.show())) list.push({ x: s.x, y: s.y, label: s.label, act: s.act, r: s.r || 26, mark: s });
  for (const c of W.cars) if (c.drivable && !c.driver) list.push({ x: c.x, y: c.y, label: 'Get in', act: h => enterCar(h, c), r: 30, car: c });
  return list;
}
function nearestUse(h) {
  let best = null, bd = 1e9;
  for (const u of interactables()) { const d = Math.hypot(u.x - h.x, u.y - h.y); if (d < u.r && d < bd) { bd = d; best = u; } }
  return best;
}
function interact(h) {
  const u = nearestUse(h);
  if (u) { if (u.who) { u.who.facing = angTo(u.who, h); h.facing = angTo(h, u.who); } u.act(h); }
}
function enterCar(h, c) {
  if (h !== hero() && W.mode !== 'collect') return;
  h.car = c; c.driver = h; A.sfx('door'); hint('car', 'Driving', `${label('fire')} or ${label('up')}: gas · ${label('block')}: brake · ${label('dodge')}: handbrake · ${label('interact')}: get out`);
}
function exitCar(h) {
  const c = h.car; if (!c) return;
  const a = c.angle + Math.PI / 2;
  for (const s of [1, -1, 2, -2]) { const x = c.x + Math.cos(a) * 18 * s, y = c.y + Math.sin(a) * 18 * s; if (W.map.standable(x, y, 0, 5)) { h.x = x; h.y = y; break; } }
  h.vx = h.vy = 0; h.car = null; c.driver = null; A.sfx('door');
}
function driveCar(h, it, dt) {
  const c = h.car;
  const steer = it.steer != null ? it.steer : clamp(it.mx || 0, -1, 1);
  c.update(dt, W.map, { steer, gas: it.gas ? 1 : 0, brake: it.brake ? 1 : 0, drift: !!it.hand });
  for (const p of W.parked) bumpStatic(c, p);
  if (c.bumped && Math.abs(c.speed) > 60) { A.sfx('crash', { vol: .6 }); game.shake(3); P.sparks(c.x + Math.cos(c.angle) * 14, c.y + Math.sin(c.angle) * 14, 6, 6, c.angle + Math.PI); }
  if (Math.abs(c.speed) > 20 && Math.floor(game.time * 12) !== Math.floor((game.time - dt) * 12)) A.sfx('engine', { pitch: .8 + Math.abs(c.speed) / 160 });
  // the car is a weapon: a Falsetti in the road goes down
  for (const f of W.foes) if (!f.dead && Math.hypot(f.x - c.x, f.y - c.y) < 16 && Math.abs(c.speed) > 55) { hitFoe(f, 70, c.angle, 260, h); c.speed *= .6; }
  for (const p of W.peds) if (Math.hypot(p.x - c.x, p.y - c.y) < 18 && Math.abs(c.speed) > 30 && !p.jump) { p.jump = .5; p.push(Math.cos(c.angle + 1.4) * 140, Math.sin(c.angle + 1.4) * 140, 120); A.sfx('hurt', { pitch: 1.4 }); adj('respect', -1); }
  h.x = c.x; h.y = c.y; h.facing = c.angle;
  if (it.interact) exitCar(h);
  h.rigs.fists.update(dt, { x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: h.facing });
}
function bumpStatic(c, p) {
  const K = CAR_PAL[p.kind] || CAR_PAL.sedan, ca = Math.cos(p.angle), sa = Math.sin(p.angle);
  for (let f = -K.len * .7; f <= K.len * .71; f += K.len * .7) {
    const px_ = p.x + ca * f, py_ = p.y + sa * f, dx = c.x - px_, dy = c.y - py_, d = Math.hypot(dx, dy), m = K.wid + c.r + 1;
    if (d < m && d > .01) { c.x += dx / d * (m - d); c.y += dy / d * (m - d); c.bumped = true; c.speed *= -.25; }
  }
}
function pushOutProps(b) {
  for (const p of W.def.props) if (p.r && !p.tree) { const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), m = p.r + b.r; if (d < m && d > .01) { b.x += dx / d * (m - d); b.y += dy / d * (m - d); } }
  for (const p of W.parked) { const K = CAR_PAL[p.kind] || CAR_PAL.sedan, ca = Math.cos(p.angle), sa = Math.sin(p.angle);
    const lx = (b.x - p.x) * ca + (b.y - p.y) * sa, ly = -(b.x - p.x) * sa + (b.y - p.y) * ca;
    if (Math.abs(lx) < K.len + b.r && Math.abs(ly) < K.wid + b.r) { const ox = K.len + b.r - Math.abs(lx), oy = K.wid + b.r - Math.abs(ly);
      if (ox < oy) { const s = Math.sign(lx) || 1; b.x += ca * ox * s; b.y += sa * ox * s; } else { const s = Math.sign(ly) || 1; b.x += -sa * oy * s; b.y += ca * oy * s; } } }
}

/* ---- finding the way: straight at a target in sight, else along a flow field round the buildings ---- */
function navAngle(from, to) {
  if (W.map.los(from.x, from.y, to.x, to.y)) return Math.atan2(to.y - from.y, to.x - from.x);
  W.flows = W.flows || new Map();
  let fl = W.flows.get(to); if (!fl || fl.map !== W.map) { fl = new E.FlowField(W.map); W.flows.set(to, fl); }
  fl.update(to.x, to.y); const d = fl.dir(from.x, from.y, to.x, to.y);
  return Math.atan2(d[1], d[0]);
}

/* ---- the Falsettis ---- */
function spawnFoe(kind, x, y, o = {}) {
  const K = FOE_KINDS[kind], f = new E.Body({ x, y, r: kind === 'boss' ? 7 : 5.5, friction: 7 });
  Object.assign(f, { kind, hp: Math.round(K.hp * (o.hpK || 1)), max: Math.round(K.hp * (o.hpK || 1)), rig: o.rig || K.look(), facing: Math.PI / 2, stun: 0, flash: 0, inv: 0, cd: rnd(.6, 1.6), aimT: 0, strafe: Math.random() < .5 ? 1 : -1,
    atks: K.moves.map(m => new E.Attack(m, { wind: kind === 'boss' ? .28 : .42, recover: .45, hold: .2 })), atk: null, name: o.name || null, wake: o.wake || 0, loot: o.loot, phase: 1, dead: 0, ammo: 0, noDie: kind === 'boss' || kind === 'bagman' });
  f.atk = f.atks[0] || null;
  W.foes.push(f); P.dust(x, y, 0, 6);
  return f;
}
let attackers = 0;
function updateFoes(dt) {
  attackers = W.foes.filter(f => !f.dead && f.atk && f.atk.busy).length;
  for (const f of W.foes) {
    if (f.dead) { f.dead += dt; f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: 'die' }); f.update(dt, W.map); continue; }
    f.flash = Math.max(0, f.flash - dt); f.stun = Math.max(0, f.stun - dt); f.inv = Math.max(0, f.inv - dt); f.cd -= dt; f.aimT = Math.max(0, f.aimT - dt);
    if (f.wake > 0) { f.wake -= dt; f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: 'hips' }); f.update(dt, W.map); continue; }
    const targets = W.heroes.filter(h => !h.dead);
    let t = null, td = 1e9; for (const h of targets) { const d = dist(f, h); if (d < td) { td = d; t = h; } }
    const K = FOE_KINDS[f.kind], sp = K.speed * (f.kind === 'boss' && f.phase === 3 ? 1.5 : 1);
    if (f.atk) f.atk.update(dt);
    if (!t) { f.vx *= .9; f.vy *= .9; }
    else if (f.stun > 0) { /* reeling */ }
    else if (f.flee) { /* the story moves him */ }
    else if (f.surrender) { f.vx = f.vy = 0; f.facing = angTo(f, t); }
    else if (f.kind === 'boss') bossBrain(f, t, td, dt);
    else if (K.ranged) {
      const a = angTo(f, t); f.facing = a;
      if (f.aimT > 0) { f.vx = f.vy = 0; if (f.aimT <= dt) enemyShot(f, a); }
      else {
        const seen = W.map.los(f.x, f.y, t.x, t.y), na = seen ? a : navAngle(f, t);
        const want = !seen ? 1 : td < 70 ? -1 : td > 115 ? 1 : 0, side = a + Math.PI / 2 * f.strafe;
        const k = seen ? .55 : 0; f.vx = Math.cos(na) * sp * want + Math.cos(side) * sp * k; f.vy = Math.sin(na) * sp * want + Math.sin(side) * sp * k;
        if (f.hitWall) f.strafe *= -1;
        if (f.cd <= 0 && td < 190 && W.map.los(f.x, f.y, t.x, t.y)) { f.aimT = .55; f.cd = rnd(1.6, 2.6) / Math.sqrt(settingsDiff()); A.sfx('click', { pitch: .6 }); }
      }
    } else {
      const a = td > 30 ? navAngle(f, t) : angTo(f, t);
      if (!f.atk || !f.atk.busy) f.facing = angTo(f, t);
      const reach = f.kind === 'bruiser' ? 26 : 21;
      if (f.atk && f.atk.busy) { f.vx *= .8; f.vy *= .8; }
      else if (td > reach) {
        const side = a + Math.PI / 2 * f.strafe, wait = attackers >= 2 && td < 50 ? .2 : 1;
        f.vx = (Math.cos(a) * wait + Math.cos(side) * (1 - wait) * .8) * sp; f.vy = (Math.sin(a) * wait + Math.sin(side) * (1 - wait) * .8) * sp;
        if (f.hitWall) f.strafe *= -1;
      } else if (f.cd <= 0 && attackers < 2 + (settingsDiff() > 1.2 ? 1 : 0)) {
        f.atk = E.pick(f.atks); f.atk.start(); f.cd = rnd(.9, 1.7) / settingsDiff(); attackers++; f.vx = f.vy = 0;
      } else { f.vx = Math.cos(a + Math.PI / 2 * f.strafe) * sp * .5; f.vy = Math.sin(a + Math.PI / 2 * f.strafe) * sp * .5; if (Math.random() < .004) f.blocking = 1; }
      if (f.atk) f.atk.hits(targets, h => E.inArc(f, f.facing, h, reach + 3, 1.2), h => hurtHero(h, K.dmg, f.facing, f));
    }
    f.update(dt, W.map); pushOutProps(f);
    for (const g of W.foes) if (g !== f && !g.dead) { const dx = f.x - g.x, dy = f.y - g.y, d = Math.hypot(dx, dy); if (d < 11 && d > .01) { f.x += dx / d * (11 - d) * .5; f.y += dy / d * (11 - d) * .5; } }
    f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing, attack: f.atk && f.atk.state, hurt: f.stun > 0, point: K.ranged ? f.aimT > 0 || f.cd < .4 : f.kind === 'boss' && f.aimT > 0,
      stance: K.ranged ? null : 'guard', pose: f.surrender ? 'kneel' : f.blocking ? 'block' : null, expr: f.stun > 0 ? 'wince' : f.atk && f.atk.busy ? 'shout' : 'angry' });
    if (f.blocking && Math.random() < .02) f.blocking = 0;
  }
  // the dead fade after a while
  for (let i = W.foes.length - 1; i >= 0; i--) if (W.foes[i].dead > 3.5) W.foes.splice(i, 1);
}
function enemyShot(f, a) {
  const sp = 150 + 30 * settingsDiff();
  shots.fire({ x: f.x + Math.cos(a) * 10, y: f.y + Math.sin(a) * 10, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.2, team: 'enemy', color: '#ff7a50', life: 1.6, dmg: FOE_KINDS[f.kind].dmg });
  A.sfx('gun', { pitch: 1.2, vol: .7 }); P.sparks(f.x + Math.cos(a) * 10, f.y + Math.sin(a) * 10, 20, 3, a);
}
// Carmine "The Tenor": three movements. He sings while he fights (the voice is the tell)
function bossBrain(f, t, td, dt) {
  const a = angTo(f, t), K = FOE_KINDS.boss, ph = f.hp > f.max * .62 ? 1 : f.hp > f.max * .3 ? 2 : 3;
  if (ph !== f.phase) { f.phase = ph; f.inv = 1; f.cd = 1.2; if (W.onBossPhase) W.onBossPhase(f, ph); }
  if (!f.atk || !f.atk.busy) f.facing = a;
  f.lob = (f.lob || 0) - dt;
  if (f.atk && f.atk.busy) { f.vx *= .85; f.vy *= .85; }
  else if (ph >= 2 && f.lob <= 0 && td > 50) {
    // a garbage bag, lobbed where Sal stands
    f.lob = ph === 3 ? 1.6 : 2.4; const arc = E.arc({ x: f.x, y: f.y, z: 26 }, { x: t.x + t.vx * .4, y: t.y + t.vy * .4, z: 0 }, 500, { apex: 50 });
    W.lobs.push({ x: f.x, y: f.y, z: 26, vx: arc.vx, vy: arc.vy, vz: arc.vz, t: 0 }); A.sfx('throw'); f.aimT = .3;
  } else if (ph >= 2 && f.cd <= 0 && td > 70) {
    for (let k = -1; k <= 1; k++) enemyShot(f, a + k * .22); f.cd = ph === 3 ? 1.4 : 2.2; f.aimT = .4;
  } else if (td > 24) { const sp = K.speed * (ph === 3 ? 1.45 : 1); f.vx = Math.cos(a) * sp; f.vy = Math.sin(a) * sp; }
  else if (f.cd <= 0) { f.atk = E.pick(f.atks); f.atk.start(); f.cd = ph === 3 ? .55 : .9; babble('a', 'carmine'); }
  if (f.atk) f.atk.hits(W.heroes.filter(h => !h.dead), h => E.inArc(f, f.facing, h, 30, 1.3), h => hurtHero(h, K.dmg, f.facing, f));
}
W.lobs = [];
function updateLobs(dt) {
  for (const b of W.lobs) {
    b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= 500 * dt;
    if (b.z <= 0) { b.dead = 1; P.explosion(b.x, b.y, 2, .6, { freeze: false, shake: 2 }); P.bits(b.x, b.y, 4, 10, ['#3a5a3a', '#5a5a3a', '#e8e0c0']); for (const h of W.heroes) if (Math.hypot(h.x - b.x, h.y - b.y) < 20) hurtHero(h, 14, Math.atan2(h.y - b.y, h.x - b.x)); }
  }
  W.lobs = W.lobs.filter(b => !b.dead);
}

/* ---- pickups ---- */
function dropItem(kind, x, y, amount = 0) { W.items.push({ kind, x, y, amount, t: 0, z: 10, vz: 60 }); }
function updateItems(dt) {
  for (const it of W.items) {
    it.t += dt; if (it.z > 0 || it.vz > 0) { it.z += it.vz * dt; it.vz -= 300 * dt; if (it.z < 0) { it.z = 0; it.vz = it.vz < -40 ? -it.vz * .35 : 0; } }
    if (it.t < .35 || it.got) continue;
    for (const h of W.heroes) {
      if (h.dead || h.car) continue;
      const d = Math.hypot(h.x - it.x, h.y - it.y);
      if (d < 26 && it.kind !== 'paper' && it.kind !== 'shoe' && it.kind !== 'bag') { it.x += (h.x - it.x) * dt * 6; it.y += (h.y - it.y) * dt * 6; }
      if (d < 9) { it.got = true; collect(h, it); break; }
    }
  }
  W.items = W.items.filter(i => !i.got && i.t < (i.kind === 'cash' || i.kind === 'ammo' || i.kind === 'gabagool' ? 30 : 1e9));
}
function collect(h, it) {
  switch (it.kind) {
    case 'cash': if (W.mode === 'story' && h === hero()) adj('cash', it.amount); h.cash += it.amount; A.sfx('cash'); P.text(it.x, it.y, 20, '+' + money(it.amount), '#8af07a', { scale: 1 }); break;
    case 'ammo': if (h === hero()) S.ammo = Math.min(48, S.ammo + it.amount); else h.ammo = (h.ammo || 0) + it.amount; A.sfx('pickup'); P.text(it.x, it.y, 20, '+' + it.amount + ' ROUNDS', '#f0d060', { scale: 1 }); break;
    case 'gabagool': h.hp = Math.min(h.max, h.hp + 30); if (h === hero() && W.mode === 'story') adj('stress', -6); A.sfx('heal'); P.text(it.x, it.y, 20, 'GABAGOOL', '#ff9a9a', { scale: 1 }); break;
    case 'cannoli': h.hp = Math.min(h.max, h.hp + 15); if (h === hero()) adj('stress', -12); A.sfx('heal'); P.text(it.x, it.y, 20, 'CANNOLI', '#fff0c0', { scale: 1 }); break;
    default: if (W.onPickup) W.onPickup(h, it); A.sfx('pickup');
  }
  if (W.onCollect) W.onCollect(h, it);
}

/* ---- the life of the street: ducks, people walking, traffic ---- */
function makeDucks() {
  const c = W.def.at.ducks; if (!c) return;
  W.ducks = [0, 1, 2].map(i => ({ x: c.x + (i - 1) * 14, y: c.y + (i % 2) * 8, a: rnd(0, TAU), t: rnd(0, 3), fly: 0, z: 0, fed: 0 }));
}
function updateDucks(dt) {
  const c = W.def.at.ducks;
  for (const d of W.ducks) {
    if (d.fly) { d.fly += dt; d.z += 40 * dt; d.x += 50 * dt; d.y -= 30 * dt; continue; }
    d.t -= dt; if (d.t <= 0) { d.t = rnd(1.5, 4); d.a = d.fed > 0 ? Math.atan2(hero().y - d.y, hero().x - d.x) : rnd(0, TAU); }
    d.fed = Math.max(0, d.fed - dt);
    d.x += Math.cos(d.a) * 8 * dt; d.y += Math.sin(d.a) * 8 * dt;
    d.x = clamp(d.x, 14.3 * T, 18.7 * T); d.y = clamp(d.y, 3.3 * T, 6.7 * T);
  }
  W.ducks = W.ducks.filter(d => d.fly < 6);
}
const PED_COLORS = ['#c84a4a', '#4a8ac8', '#e8c040', '#5aa85a', '#a85ac8', '#e88a3a'];
function makePeds(n) {
  W.peds = [];
  for (let i = 0; i < n; i++) {
    const spot = randomWalk(), p = new E.Body({ x: spot.x, y: spot.y, r: 4.5 });
    p.rig = H({ size: 1.2, hair: E.pick(['short', 'long', 'ponytail', 'bald', 'spiky']), sleeves: E.pick(['short', 'long']), colors: { skin: E.pick(['#f0c8a8', '#d8a080', '#a87050', '#f4d8c0']), hair: E.pick(['#2a1a10', '#8a5a2a', '#e8c070', '#c8c8c8']), cloth: E.pick(PED_COLORS), pants: E.pick(['#3a3a4a', '#4a5a8a', '#6a5a4a']), boot: '#2a2a2a' } });
    p.goal = randomWalk(); p.facing = 0; p.jump = 0; W.peds.push(p);
  }
}
function randomWalk() {
  for (let k = 0; k < 40; k++) { const cx = E.randInt(1, W.map.w - 2), cy = E.randInt(1, W.map.h - 2); const tag = W.map.floorAt((cx + .5) * T, (cy + .5) * T); if ((tag === 'walk' || tag === 'path') && W.map.walkable(cx, cy)) return { x: (cx + .5) * T, y: (cy + .5) * T }; }
  return { x: W.def.at.hero.x, y: W.def.at.hero.y };
}
function updatePeds(dt) {
  const fight = W.foes.some(f => !f.dead) || W.noise > 0;
  for (const p of W.peds) {
    p.jump = Math.max(0, p.jump - dt);
    const g = p.goal, d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < 8 || p.hitWall && Math.random() < .05) p.goal = randomWalk();
    let a = Math.atan2(g.y - p.y, g.x - p.x), sp = 26;
    if (fight) { const h = hero(); if (h && Math.hypot(h.x - p.x, h.y - p.y) < 130) { a = Math.atan2(p.y - h.y, p.x - h.x); sp = 70; } }
    if (p.jump <= 0) { p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.facing = a; }
    p.update(dt, W.map); pushOutProps(p);
    p.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, hurt: p.jump > 0, expr: fight ? 'wince' : null });
  }
}
// traffic: cars on a loop round the blocks, stopping for whoever stands in the road
function makeTraffic(n) {
  W.traffic = [];
  const R = TOWN.roads, y1 = (R.HR[0][0] + 2.1) * T, y2 = (R.HR[1][0] + .9) * T, x1 = (R.VR[0][0] + .9) * T, x2 = (R.VR[1][0] + 2.1) * T;
  const loops = [new E.Path([[3 * T, y1], [57 * T, y1], [57 * T, (R.HR[0][0] + .9) * T], [3 * T, (R.HR[0][0] + .9) * T]], { closed: true }),
    new E.Path([[x2, 3 * T], [x2, 42 * T], [(R.VR[1][0] + .9) * T, 42 * T], [(R.VR[1][0] + .9) * T, 3 * T]], { closed: true }),
    new E.Path([[3 * T, y2], [57 * T, y2], [57 * T, (R.HR[1][0] + 2.1) * T], [3 * T, (R.HR[1][0] + 2.1) * T]], { closed: true })];
  for (let i = 0; i < n; i++) { const path = loops[i % loops.length]; W.traffic.push({ path, d: (i * 377) % path.length, sp: 0, kind: E.pick(['sedan', 'cab', 'sedan', 'van']), color: E.pick(['#8a1a1a', '#3a5a9a', '#e8e8e8', '#2a6a4a', '#6a4a8a']), x: 0, y: 0, angle: 0, z: 0 }); }
}
function updateTraffic(dt) {
  for (const c of W.traffic) {
    const ahead = c.path.at(c.d + 30), block = [...W.heroes, ...W.foes.filter(f => !f.dead), ...W.peds].some(b => !b.car && Math.hypot(b.x - ahead.x, b.y - ahead.y) < 18)
      || W.cars.some(o => o.driver && Math.hypot(o.x - ahead.x, o.y - ahead.y) < 22) || W.traffic.some(o => o !== c && Math.hypot(o.x - ahead.x, o.y - ahead.y) < 16);
    c.sp = E.approach(c.sp, block ? 0 : 70, (block ? 260 : 60) * dt);
    if (block && c.sp < 5 && Math.random() < .004) A.sfx('horn', { vol: .4 });
    c.d += c.sp * dt; const p = c.path.at(c.d); c.x = p.x; c.y = p.y; c.angle = E.approachAng ? E.approachAng(c.angle, p.angle, 6 * dt) : p.angle; c.braking = block;
    for (const h of W.heroes) if (!h.car && !h.dead && Math.hypot(h.x - c.x, h.y - c.y) < 14 && c.sp > 30) hurtHero(h, 8, c.angle + Math.PI / 2);
    for (const car of W.cars) if (car.driver && Math.hypot(car.x - c.x, car.y - c.y) < 18) { const a = Math.atan2(car.y - c.y, car.x - c.x); car.x += Math.cos(a) * 3; car.y += Math.sin(a) * 3; car.speed *= .5; c.sp = 0; if (Math.abs(car.speed) > 30) { A.sfx('crash', { vol: .5 }); game.shake(2); } }
  }
}

/* ---- entering a place ---- */
function enterPlace(id, o = {}) {
  const def = PLACES[id];
  W.place = id; W.def = def; W.map = mapOf(def);
  W.npcs = []; W.foes = []; W.items = []; W.flows = new Map(); W.marks = []; W.lobs = []; W.ducks = []; W.peds = []; W.traffic = []; W.cars = []; W.parked = []; W.track = [];
  W.onKill = W.onCollect = W.onPickup = W.onHeroDown = W.onBossPhase = null; W.noise = 0; W.cold = 100; W.banner = null; W.noGunNote = 0;
  shots.clear();
  for (const p of def.parked) W.parked.push(Object.assign({}, p));
  if (def.at.suv && o.suv !== false) { const c = new E.Car({ x: def.at.suv.x, y: def.at.suv.y, angle: def.at.suv.angle, top: 190, accel: 150, turn: 2.2, grip: 8, r: 8 }); c.kind = 'suv'; c.drivable = true; W.cars.push(c); }
  if (id === 'town') { makeDucks(); if (o.peds !== false) makePeds(o.peds || 6); if (o.traffic !== false) makeTraffic(o.traffic || 4); }
  game.cam.bounds = v => W.map.bounds(v);
  game.cam.snap = true;
  W.night = !!o.night; W.snow = id === 'barrens';
  L.enabled = W.night || id !== 'town';
  L.ambient = W.night ? .42 : id === 'barrens' ? .78 : id === 'office' ? .82 : id === 'diner' ? .72 : 1;
  game.weather = W.snow ? { kind: 'snow', amount: .7, wind: .4 } : o.rain ? { kind: 'rain', amount: .8, wind: .2, lightning: .08 } : null;
}

function updateWorld(dt) {
  W.noise = Math.max(0, (W.noise || 0) - dt);
  for (const h of W.heroes) updateHero(h, dt);
  updateFoes(dt); updateLobs(dt); updateItems(dt);
  if (W.ducks.length) updateDucks(dt);
  if (W.peds.length) updatePeds(dt);
  if (W.traffic.length) updateTraffic(dt);
  for (const c of W.cars) if (!c.driver) { c.update(dt, W.map, { steer: 0, gas: 0, brake: 1 }); }
  for (const n of W.npcs) {
    if (n.walkTo) { const a = angTo(n, n.walkTo), d = dist(n, n.walkTo); if (d > 3) { n.x += Math.cos(a) * 50 * dt; n.y += Math.sin(a) * 50 * dt; n.facing = a; n.vx = Math.cos(a) * 50; n.vy = Math.sin(a) * 50; } else { n.walkTo = null; n.vx = n.vy = 0; if (n.arrive) n.arrive(); } }
    const h = hero(); if (!n.walkTo && h && dist(n, h) < 50 && !n.fixedFacing) n.facing = E.approachAng ? E.approachAng(n.facing, angTo(n, h), 4 * dt) : angTo(n, h);
    n.rig.update(dt, { x: n.x, y: n.y, z: n.z || 0, vx: n.vx || 0, vy: n.vy || 0, facing: n.facing, pose: n.pose || null, expr: n.expr || null, point: !!n.point });
  }
  shots.update(dt, W.map);
  shots.hit(W.foes.filter(f => !f.dead), (b, f) => { hitFoe(f, b.dmg, Math.atan2(b.vy, b.vx), 90, b.owner); return true; }, 'player');
  shots.hit(W.heroes.filter(h => !h.dead && !h.car), (b, h) => { hurtHero(h, b.dmg, Math.atan2(b.vy, b.vx)); return true; }, 'enemy');
  // footprints in the snow
  if (W.snow) for (const h of W.heroes) if (!h.dead && Math.hypot(h.vx, h.vy) > 20 && Math.floor(game.time * 5) !== Math.floor((game.time - dt) * 5)) { W.track.push({ x: h.x, y: h.y, a: h.facing, t: 0 }); if (W.track.length > 160) W.track.shift(); }
}

/* ---- drawing the world ---- */
const SIGN_CACHE = {};
function drawWorld(r) {
  const view = E.charView(r.view), def = W.def;
  if (W.place === 'barrens') r.sky(['#8a9ab8', '#c8d0e0', '#e8eef8']);
  W.map.drawFloor(r); W.map.queueWalls(r);
  for (const [id, x, y, o] of def.solids) r.shape(id, x, y, 0, o || { facing: E.hash2(x, y) * 4 > 2 ? Math.PI / 2 : 0 });
  for (const p of def.props) {
    if (p.tree && !r.visible(p.x, p.y, 0) && !r.visible(p.x, p.y, 40)) continue;
    r.prop(p.prop, p.x, p.y, p.z || 0, Object.assign({}, p, { light: (W.night || W.place !== 'town') && !!p.light }));
  }
  for (const f of def.faces) r.prop(f.prop, f.x, f.y + 1, f.z || 0, Object.assign({}, f, { light: false }));
  for (const f of def.faces) if (f.light && (W.night || W.place !== 'town')) L.add(f.x, f.y + 6, (f.z || 0) - 4, 70, .9, { color: f.light });
  for (const [s, x, y, z, c] of def.signs) r.queue(x, y + 1, z, g => { const [X, Y] = r.w(x, y + 1, z); txt(g, s, Math.round(X), Math.round(Y) - 4, c, { align: 'center', font: s.length > 14 ? 'tiny' : undefined }); }, { emissive: W.night, bias: 1 });
  if (W.night) for (const [s, x, y, z, c] of def.signs) L.add(x, y + 8, z, 46, .55, { color: c });
  for (const t of W.track) r.decal(() => { r.groundDisc ? r.groundDisc(t.x + Math.cos(t.a + 1.6) * 2, t.y + Math.sin(t.a + 1.6) * 2, 1.4, '#a8b4cc') : null; });
  // the pool's ducks
  for (const d of W.ducks) r.sprite(d.x, d.y, d.fly ? 10 + d.z : Math.sin(game.time * 3 + d.x) * .6, d.fly ? DUCK_FLY : DUCK[Math.floor(game.time * 2 + d.x) % 2], { flip: Math.cos(d.a) < 0 });
  // cars
  for (const p of W.parked) drawCar(r, p, p.kind, { color: p.color, lights: W.night && p.kind === 'cop' });
  for (const c of W.cars) drawCar(r, c, c.kind || 'suv', { lights: W.night || !!c.driver, braking: c.driver && c.driver.input && c.driver.input.down && c.driver.input.down('block') });
  for (const c of W.traffic) drawCar(r, c, c.kind, { color: c.color, lights: W.night, braking: c.braking });
  // pickups
  for (const it of W.items) { const s = SPR[it.kind] || SPR.cash, bob = it.z + 3 + Math.sin(game.time * 4 + it.x) * 1.5; r.shadow(it.x, it.y, 3, .3); r.sprite(it.x, it.y, bob, s, { glow: it.kind === 'cash' || it.kind === 'envelope' ? .4 : 0 }); }
  for (const b of W.lobs) { r.shadow(b.x, b.y, 4, .4); r.queue(b.x, b.y, b.z, g => { const [X, Y] = r.w(b.x, b.y, b.z); px.disc(g, X, Y, 4, '#2a3a2a'); px.disc(g, X - 1, Y - 1, 2, '#4a6a4a'); px.dot(g, X, Y - 4, '#e8e0c0'); }); }
  // people
  for (const n of W.npcs) { r.shadow(n.x, n.y, 7, .35); const hov = W.hover && W.hover.who === n; r.actor(n.x, n.y, n.z || 0, (g, ox, oy) => n.rig.draw(g, ox, oy, view), { pick: n, outline: hov ? '#ffe070' : undefined }); }
  for (const p of W.peds) { r.shadow(p.x, p.y, 6, .3); r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), { every: 2, key: p }); }
  for (const f of W.foes) {
    r.shadow(f.x, f.y, f.kind === 'boss' ? 10 : 7, .4);
    const tell = f.atk && f.atk.phase === 'wind';
    r.actor(f.x + (tell ? Math.sin(game.time * 60) * .6 : 0), f.y, f.z, (g, ox, oy) => f.rig.draw(g, ox, oy, view), { flash: f.flash > 0 ? '#ffffff' : tell ? '#ff8060' : undefined, flashMix: tell ? .25 : .75, alpha: f.dead > 2.5 ? 1 - (f.dead - 2.5) : undefined, pick: f });
    f.rig.drawSmear && f.rig.drawSmear(r);
    if (f.aimT > 0) r.decal(() => r.groundArc ? r.groundArc(f.x, f.y, 4, 120, f.facing - .03, f.facing + .03, '#ff4030', .5) : null, { emissive: 1 });
    if (!f.dead && (f.kind === 'boss' || f.kind === 'bagman' || f.name) ) { const top = 52 + (f.kind === 'boss' ? 14 : 0); r.queue(f.x, f.y, top, g => { const [X, Y] = r.w(f.x, f.y, top); if (f.kind === 'boss') return; txt(g, f.name || '', Math.round(X), Math.round(Y), '#ffb0a0', { align: 'center', font: 'tiny' }); E.ui.bar(g, Math.round(X) - 12, Math.round(Y) + 7, 24, 3, f.hp / f.max, '#e84a3a'); }, { bias: 3 }); }
    else if (!f.dead && f.hp < f.max) { const top = 46; r.queue(f.x, f.y, top, g => { const [X, Y] = r.w(f.x, f.y, top); E.ui.bar(g, Math.round(X) - 8, Math.round(Y), 16, 2, f.hp / f.max, '#e84a3a'); }, { bias: 3 }); }
  }
  for (const [id, gh] of W.ghosts) { if (gh.place !== W.place) continue; r.shadow(gh.x, gh.y, 6, .2); r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, view), { alpha: .5, outline: gh.color });
    r.queue(gh.x, gh.y, 50, g => { const [X, Y] = r.w(gh.x, gh.y, 50); txt(g, gh.name, Math.round(X), Math.round(Y), gh.color, { align: 'center', font: 'tiny' }); }, { bias: 3 }); }
  for (const h of W.heroes) {
    if (h.car) continue;
    r.shadow(h.x, h.y, 8, .4);
    const blink = h.inv > 0 && h.hurt <= 0 && h.roll <= 0 && Math.floor(game.real * 15) % 2;
    const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists;
    if (!blink) r.actor(h.x, h.y, h.z, (g, ox, oy) => rig.draw(g, ox, oy, view), { xray: true, flash: h.hurt > .2 ? '#ff4040' : h.flash > 0 ? '#ffffff' : undefined, ghost: h.roll > 0 ? { color: h.color, life: .2, alpha: .4, owner: h } : undefined });
    rig.drawSmear && rig.drawSmear(r);
    if (W.heroes.length > 1) r.decal(() => r.groundRing && r.groundRing(h.x, h.y, 9, h.color), { emissive: 1 });
  }
  shots.draw(r);
  // the objective's marker and the hover focus
  if (W.objective && W.objective.at && !W.demo) r.marker(W.objective.at.x, W.objective.at.y, 40, { label: W.objective.short || '', color: '#ffd040' });
  for (const p of def.props) if (p.light && (W.night || W.place !== 'town') && r.visible(p.x, p.y, 40)) L.add(p.x, p.y, p.prop === 'streetlamp' ? 40 : 18, p.prop === 'streetlamp' ? 90 : 70, .85, { color: p.prop === 'firedrum' ? '#ff9040' : '#ffe0a0' });
}

/* ===== 04-ui.js ===== */
/* ---- UI: the dialog box and its voices, the HUD, hints, and the two minigames (the stare-down and the breath) ---- */
const ui = new E.Shell(game, { theme: { accent: '#e8b84a', ink: '#f4ecd8', paper: 'rgba(16,12,10,.88)', font: '600 18px/1.35 "Trebuchet MS", system-ui, sans-serif', titleFont: '700 22px/1.2 Georgia, serif' } });
const talk = new E.Dialog(game, { voice: null, lines: 3, speed: 46, bg: ['#2a1a14', '#120a08'], border: '#e8b84a', nameColor: '#ffd36a' });

/* a conversation: a list of lines, each [who, text] or { who, text, choices, on(i) }; on(i) may return more lines */
const convoQ = [];
let convoDone = null, speaking = null, lastShown = 0;
function convo(lines, done) { convoQ.push(...lines.filter(Boolean)); if (done) convoDone = (convoDone ? [].concat(convoDone, done) : done); }
function convoBusy() { return talk.open || convoQ.length > 0; }
function nextLine() {
  const L0 = convoQ.shift(); if (!L0) return;
  const l = Array.isArray(L0) ? { who: L0[0], text: L0[1] } : L0;
  if (l.run) { l.run(); return; }
  speaking = l.who; lastShown = 0;
  const C = CAST[l.who], who = l.name || (C ? C.name : l.who.toUpperCase());
  talk.say(typeof l.text === 'function' ? l.text() : l.text, { name: who, auto: W.demo ? 1.4 : undefined, modal: !W.demo, portrait: C ? portraitOf(l.who) : null, portraitOpts: { zoom: 3 },
    choices: l.choices ? l.choices.map(c => typeof c === 'function' ? c() : c) : undefined,
    onChoice: l.choices ? i => { S.choices.push([l.id || '', i]); const more = l.on && l.on(i); if (more && more.length) convoQ.unshift(...more.filter(Boolean)); } : undefined });
}
function updateTalk(dt) {
  if (!talk.open && convoQ.length) nextLine();
  if (talk.open) {
    // the voices: a syllable every other letter, pitched by the letter and the speaker
    if (talk.shown > lastShown) { const page = (talk.pages[talk.i] || []).join(' '); for (let k = lastShown; k < talk.shown; k++) if (k % 2 === 0) { const ch = page[k] || 'a'; if (/[a-z]/i.test(ch)) babble(ch, speaking); } lastShown = talk.shown; }
    else if (talk.shown < lastShown) lastShown = talk.shown;
    const busy = talk.update(dt);
    if (!talk.open && !convoQ.length && convoDone) { const d = convoDone; convoDone = null; [].concat(d).forEach(f => f()); }
    return busy;
  }
  if (!convoQ.length && convoDone) { const d = convoDone; convoDone = null; [].concat(d).forEach(f => f()); }
  return false;
}

/* ---- toasts and hints (each hint once, while Settings → Tutorial hints is on) ---- */
function toast(title, text, s = 3.5) { if (!game.headless) ui.toast(title, text, s); W.lastToast = [title, text]; }
function hint(key, title, text) { if (S.seen[key] || !game.settings.hints || W.demo || HUB) return; S.seen[key] = 1; if (!game.headless) ui.tutorial(title, text, 9); W.lastHint = [title, text]; }

/* ---- the HUD: the objective, Sal's health and nerves, the money, the crew and the family ---- */
let hudNotes = [];
hudNote = (k, v) => { if (Math.abs(v) >= 1) hudNotes.push({ t: 2.2, text: (v > 0 ? '+' : '') + Math.round(v) + ' ' + (k === 'respect' ? 'RESPECT' : 'FAMILY'), color: v > 0 ? '#8af07a' : '#ff8a6a' }); };
function updateHud(dt, extra = {}) {
  hudNotes.forEach(n => n.t -= dt); hudNotes = hudNotes.filter(n => n.t > 0);
  if (game.headless) return;
  const h = hero(), use = h && !h.car && !talk.open && !W.mini ? nearestUse(h) : null;
  const o = W.objective;
  const st = {
    place: W.def ? W.def.name : '',
    objective: o ? { step: o.step || '', title: o.title, text: o.text || '', at: o.at ? { x: o.at.x, y: o.at.y, z: 0 } : undefined, from: o.at ? h : undefined } : undefined,
    bars: [], counts: [], prompt: use ? { act: 'interact', label: use.label } : h && h.car ? { act: 'interact', label: 'Get out' } : undefined
  };
  if (h) st.bars.push({ label: h.who === 'sal' ? 'Sal' : 'Nicky', value: Math.max(0, h.hp), max: h.max, color: h.hp < 30 ? '#ff5040' : '#e8b84a' });
  if (W.mode === 'story' && W.place !== 'office' && W.place !== 'diner') {
    st.bars.push({ label: 'Stress', value: S.stress, max: 100, color: S.stress > 75 ? '#ff4060' : S.stress > 50 ? '#f0a040' : '#80b0e0' });
    if (W.place === 'barrens') st.bars.push({ label: 'Warmth', value: W.cold, max: 100, color: W.cold < 30 ? '#80d0ff' : '#f0c890' });
    st.counts = [['Cash', money(S.cash)], ['Respect', Math.round(S.respect)], ['Family', Math.round(S.family)]];
    if (S.flags.gun) st.counts.push(['Rounds', S.ammo]);
  }
  for (const p of W.heroes.slice(1)) st.bars.push({ label: p.who === 'nicky' ? 'Nicky' : 'P2', value: Math.max(0, p.hp), max: p.max, color: '#ff6a5a' });
  Object.assign(st, extra);
  ui.hud(st);
}
function hideHud() { if (!game.headless) ui.hud({}); }

/* the pixel overlay: a boss bar, the meter notes, the hover focus, the minigames */
function drawOverlay(r) {
  const boss = W.foes.find(f => f.kind === 'boss' && !f.dead);
  if (boss) r.overlay(g => { const w = Math.min(220, r.W - 40), x = Math.round((r.W - w) / 2), y = r.H - 26; txt(g, 'CARMINE "THE TENOR" FALSETTI', r.W / 2, y - 11, '#ffd0c0', { align: 'center' }); E.ui.bar(g, x, y, w, 6, boss.hp / boss.max, '#d83a3a'); });
  if (hudNotes.length) r.overlay(g => hudNotes.forEach((n, i) => txt(g, n.text, r.W / 2, 40 + i * 10 - (2.2 - n.t) * 6, n.color, { align: 'center' })));
  if (W.hover && !W.mini && !talk.open) r.overlay(g => { const p = I.pointer(); if (p) txt(g, (I.lastDevice === 'mouse' ? 'Click: ' : '') + W.hover.label, p[0] + 8, p[1] + 6, '#ffe070'); });
  if (W.banner) r.overlay(g => { const b = W.banner; const a = Math.min(1, b.t * 2, (b.dur - b.t) * 2); if (a <= 0) return; const y = Math.round(r.H * .2); E.font.title(g, b.title, r.W / 2, y, { scale: 2, align: 'center', colors: ['#fff4d8', '#e8b84a', '#a86a2a'] }); if (b.sub) txt(g, b.sub, r.W / 2, y + 30, '#f4ecd8', { align: 'center' }); });
  if (W.mini) W.mini.draw(r);
  if (S.stress > 80 && W.mode === 'story' && !W.mini) r.overlay(g => { const k = (S.stress - 80) / 20 * (.5 + .5 * Math.sin(game.time * 8)); if (k > .05) px.blend(g, k * .35, 'normal', () => { px.rect(g, 0, 0, r.W, 6, '#600010'); px.rect(g, 0, r.H - 6, r.W, 6, '#600010'); px.rect(g, 0, 0, 6, r.H, '#600010'); px.rect(g, r.W - 6, 0, 6, r.H, '#600010'); }); });
}
function updateBanner(dt) { if (W.banner) { W.banner.t += dt; if (W.banner.t > W.banner.dur) W.banner = null; } }
function banner(title, sub, dur = 3) { W.banner = { title, sub, t: 0, dur }; }

/* the mouse: hover moves the focus over people and things; a click on one walks Sal over and uses it */
function updateHover() {
  W.hover = null;
  const h = hero(); if (!h || h.car || game.headless || W.demo) return;
  if (I.lastDevice !== 'mouse') return;
  const p = I.pointer(); if (!p || !game.r) return;
  const picked = game.r.pick ? game.r.pick(p[0], p[1]) : null;
  const target = picked && (Array.isArray(picked) ? picked[0] : picked);
  const list = interactables();
  let u = target ? list.find(u => u.who === target) : null;
  if (!u) { const g = game.mouseGround(); if (g) { let bd = 18; for (const v of list) { const d = Math.hypot(v.x - g[0], v.y - g[1]); if (d < bd) { bd = d; u = v; } } } }
  W.hover = u || null;
  const c = I.clicked();
  if (u && c) { I.suppressCode && I.suppressCode('Mouse0'); I.consume('attack');
    if (Math.hypot(u.x - h.x, u.y - h.y) < u.r) u.act(h);
    else h.goTo = { x: u.x, y: u.y, use: u };
  }
}

/* ---- MINIGAME: THE STARE-DOWN. A needle sweeps; stop it in the gold three times (the zone narrows) ---- */
function stareDown(who, done) {
  const m = W.mini = { kind: 'stare', t: 0, u: 0, dir: 1, hits: 0, tries: 0, need: 3, max: 5, zone: .26, center: rnd(.35, .65), flash: 0, msg: '', who,
    update(dt) {
      m.t += dt; m.flash = Math.max(0, m.flash - dt);
      const sp = .9 + m.tries * .18; m.u += m.dir * sp * dt; if (m.u > 1) { m.u = 1; m.dir = -1; } if (m.u < 0) { m.u = 0; m.dir = 1; }
      if (m.over) { m.over -= dt; if (m.over <= 0) { W.mini = null; done(m.hits >= m.need); } return; }
      if (game.players.some(p => p.pressed('attack') || p.pressed('confirm') || p.pressed('interact')) || m.auto && Math.abs(m.u - m.center) < m.zone / 3) {
        m.tries++; const ok = Math.abs(m.u - m.center) < m.zone / 2;
        if (ok) { m.hits++; A.sfx('punch'); game.shake(2); m.msg = pick(['He blinks.', 'He sweats.', 'He looks at his shoes.']); m.zone *= .78; m.center = rnd(.25, .75); }
        else { A.sfx('cancel'); m.msg = pick(['He holds your look.', 'He smirks.', 'Too soon.']); }
        m.flash = .3;
        if (m.hits >= m.need || m.tries - m.hits > m.max - m.need) m.over = 1.2;
      }
    },
    draw(r) {
      r.overlay(g => {
        const w = Math.min(260, r.W - 40), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .3);
        E.ui.box(g, x - 10, y - 34, w + 20, 82, { bg: ['#2a1a14', '#120a08'], border: '#e8b84a' });
        txt(g, 'THE STARE-DOWN', r.W / 2, y - 26, '#ffd36a', { align: 'center' });
        txt(g, 'Stop the needle in the gold: ' + label('attack') + ' (' + m.hits + ' of ' + m.need + ')', r.W / 2, y - 14, '#f4ecd8', { align: 'center' });
        px.rect(g, x, y, w, 14, '#3a2a24'); const zx = x + (m.center - m.zone / 2) * w; px.rect(g, Math.round(zx), y, Math.round(m.zone * w), 14, '#c89a3a'); px.rect(g, Math.round(zx + m.zone * w * .3), y, Math.round(m.zone * w * .4), 14, '#f0c860');
        const nx = Math.round(x + m.u * w); px.rect(g, nx - 1, y - 4, 3, 22, '#ffffff');
        for (let i = 0; i < m.need; i++) px.disc(g, r.W / 2 - (m.need - 1) * 8 + i * 16, y + 26, 4, i < m.hits ? '#8af07a' : '#4a3a34');
        if (m.msg) txt(g, m.msg, r.W / 2, y + 36, m.flash > 0 ? '#ffffff' : '#c8b8a8', { align: 'center' });
      });
    } };
  return m;
}

/* ---- MINIGAME: THE PANIC ATTACK. Breathe with the ring: hold while it grows, let go while it shrinks ---- */
function panicAttack(done, o = {}) {
  A.sfx('heart'); music(null);
  const m = W.mini = { kind: 'breathe', t: 0, score: 0, need: 6, limit: 16, beat: 0, over: 0, auto: o.auto, held: false,
    update(dt) {
      m.t += dt; m.beat -= dt; if (m.beat <= 0) { m.beat = .55 - Math.min(.25, m.score * .04); A.sfx('heart', { vol: .8 }); }
      if (m.over) { m.over -= dt; if (m.over <= 0) { W.mini = null; done(m.score >= m.need); } return; }
      const cyc = (m.t % 4) / 4, inhale = cyc < .5, ring = inhale ? cyc * 2 : 2 - cyc * 2;
      m.ring = ring; m.inhale = inhale;
      const hold = m.auto ? inhale : game.players.some(p => p.down('interact') || p.down('confirm') || p.down('attack'));
      if (hold && !m.held && inhale) A.sfx('breath');
      m.held = hold;
      m.score += (hold === inhale ? 1 : -.6) * dt * .75; m.score = Math.max(0, m.score);
      if (m.score >= m.need || m.t > m.limit) m.over = 1;
    },
    draw(r) {
      r.overlay(g => {
        const k = clamp(1 - m.score / m.need, 0, 1);
        px.blend(g, .55 + k * .3, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0410'));
        const cx = Math.round(r.W / 2), cy = Math.round(r.H / 2) - 6, R = 14 + m.ring * 40;
        px.disc(g, cx, cy, Math.round(R) + 2, m.held === m.inhale ? '#e8b84a' : '#a83a4a'); px.disc(g, cx, cy, Math.round(R), '#1a1024');
        px.disc(g, cx, cy, 10, m.inhale ? '#80b0e0' : '#e8b0c0');
        E.font.title(g, m.inhale ? 'BREATHE IN' : 'BREATHE OUT', cx, cy - 72, { scale: 2, align: 'center', colors: ['#ffffff', '#c8d8f0', '#8090b0'] });
        txt(g, (m.inhale ? 'Hold ' : 'Let go of ') + label('interact') + (m.inhale ? ' while the ring grows' : ' while it shrinks'), cx, cy + 56, '#f4ecd8', { align: 'center' });
        E.ui.bar(g, cx - 60, cy + 70, 120, 5, m.score / m.need, '#8af07a');
        txt(g, 'PANIC ATTACK  ' + Math.max(0, Math.ceil(m.limit - m.t)), cx, 14, '#ff8090', { align: 'center' });
      });
    } };
  return m;
}

/* ===== 05-story.js ===== */
/* ---- THE STORY: a prologue on the couch, four chapters on the street, three more sessions, a diner ---- */
const setObj = (title, text, at, short, step) => { W.objective = { title, text, at, short: short || '', step: step || '' }; };
function npc(who, at, o = {}) { const n = Object.assign({ who, x: at.x, y: at.y, z: 0, facing: o.facing != null ? o.facing : Math.PI / 2, rig: rigOf(who, false), vx: 0, vy: 0 }, o); W.npcs.push(n); return n; }
function mark(x, y, labelText, act, o = {}) { const m = Object.assign({ x, y, label: labelText, act }, o); W.marks.push(m); return m; }
const removeNpc = n => { W.npcs = W.npcs.filter(m => m !== n); };
const allDead = () => W.foes.every(f => f.dead);
let fadeOut = 0;   // a black fade the story draws over the world (cutscenes)

const CHAPTERS = [
  { id: 'prologue', title: 'Session One', kind: 'therapy', place: 'office' },
  { id: 'ch1', title: 'Chapter One: Gabagool', sub: 'North Caldwell, a Tuesday', place: 'town' },
  { id: 'session2', title: 'Session Two', kind: 'therapy', place: 'office' },
  { id: 'ch2', title: 'Chapter Two: Brass Section', sub: 'The Velvet Brass, after midnight', place: 'town', night: true },
  { id: 'ch3', title: 'Chapter Three: Pine Barrens', sub: 'South Jersey, the same night, colder', place: 'barrens' },
  { id: 'session3', title: 'Session Three', kind: 'therapy', place: 'office' },
  { id: 'ch4', title: 'Chapter Four: Final Movement', sub: 'Baritone Sanitation, in the rain', place: 'town', night: true, rain: true },
  { id: 'epilogue', title: 'Epilogue: The Moonlight Diner', kind: 'diner', place: 'diner' }
];

/* the therapy sessions: what Sal says on the couch moves his nerves, his family and his pride */
const SESSIONS = {
  prologue: () => [
    ['melfi', 'So. Your wife says you fainted at your son\'s birthday party. Face first into the potato salad.'],
    ['sal', 'Pasta salad. If it\'s going in a file, get it right.'],
    ['melfi', 'Why don\'t you tell me about that morning.'],
    { who: 'sal', id: 'p1', text: 'What do you want to know?', choices: ['"I don\'t do this. Talking."', '"The ducks left."', '"I\'m in waste management. It\'s stressful."'], on: i => [
      [['melfi', 'And yet here you are, paying by the hour not to talk.'], ['sal', 'Yeah, well. My mother raised a bargain hunter.'], { run: () => adj('stress', 6) }],
      [['melfi', 'Ducks?'], ['sal', 'A family of ducks. In my pool. The mother, the little ones. All spring. Then one morning they\'re gone.'], ['melfi', 'And how did that feel?'], ['sal', 'Like... I dunno. Like everything goes, eventually.'], { run: () => { adj('stress', -6); adj('family', 4); } }],
      [['melfi', 'Waste management.'], ['sal', 'Environmental consultant. Garbage, mostly. Other people\'s.'], { run: () => adj('respect', 4) }]][i] },
    ['melfi', 'Let\'s start small. This week, notice what sets it off. The moment before.'],
    { who: 'sal', id: 'p2', text: 'Notice. Write it down. Very good. Evidence.', choices: ['"Fine. Same time next week."', '"Can I just get a pill?"'], on: i => i ? [['melfi', 'We\'ll talk about medication. We\'ll also talk about you.'], { run: () => adj('stress', -4) }] : [['melfi', 'Same time next week.'], { run: () => adj('family', 2) }] }
  ],
  session2: () => [
    ['melfi', 'You had another attack. In a butcher shop.'],
    ['sal', 'Pork store. It\'s different. A butcher shop is a butcher shop.'],
    { who: 'melfi', id: 's2', text: 'What were you thinking about, right before?', choices: ['"The meat. My father. Sundays."', '"Brooklyn. Business."', '"Nothing. I wasn\'t thinking."'], on: i => [
      [['sal', 'My father\'d come home Sunday with a whole capicola, smiling like he hit the number. Took me twenty years to figure out what truck it fell off of.'], ['melfi', 'So the meat is love, and it\'s also the business.'], ['sal', 'You\'re very good at ruining sandwiches.'], { run: () => { adj('stress', -10); adj('family', 5); } }],
      [['sal', 'Let\'s say a competitor in the sanitation field is underbidding. Aggressively.'], ['melfi', 'And you feel... threatened.'], ['sal', 'I feel like a guy whose lunch is getting looked at.'], { run: () => { adj('respect', 4); adj('stress', -3); } }],
      [['melfi', 'Nothing is a lot of something, sometimes.'], ['sal', 'That on a mug somewhere?'], { run: () => adj('stress', -4) }]][i] },
    ['melfi', 'When you feel it coming, slow your breathing. In through the nose. Count it.'],
    ['sal', 'Counting I can do. It\'s half my job.']
  ],
  session3: () => [
    ['melfi', 'You look tired.'],
    ['sal', 'I spent the night in the woods with my nephew. Don\'t ask. It was a team-building thing.'],
    { who: 'melfi', id: 's3a', text: 'Have you noticed what sets the attacks off?', choices: ['"Family."', '"Losing things."', '"Tenors."'], on: i => [
      [['melfi', 'The people you\'re responsible for.'], ['sal', 'The people who are responsible for me. Nobody tells you it goes both ways.'], { run: () => adj('family', 4) }],
      [['melfi', 'The ducks. Your father. The way things were.'], ['sal', 'Everybody\'s nostalgic for something. I\'m nostalgic for last Tuesday.'], { run: () => adj('stress', -8) }],
      [['melfi', 'Tenors?'], ['sal', 'Guys who sing too high and too loud. You can\'t hear yourself think.'], { run: () => adj('respect', 4) }]][i] },
    { who: 'melfi', id: 'want', text: 'What do you want, Sal? Not this week. In general.', choices: ['"To be the last guy standing."', '"One dinner where nobody cries."', '"I want the ducks to come back."'], on: i => { S.flags.want = i; return [
      [['melfi', 'Standing where?'], ['sal', 'That\'s the thing. You don\'t get to pick.'], { run: () => adj('respect', 6) }],
      [['melfi', 'That sounds achievable.'], ['sal', 'You never met my family.'], { run: () => adj('family', 6) }],
      [['melfi', 'Maybe they will.'], ['sal', 'Ducks don\'t come back, doc. New ducks come.'], { run: () => adj('stress', -10) }]][i]; } },
    ['melfi', 'Our time is up.'],
    ['sal', 'It always is.']
  ]
};

/* each chapter: setup() builds the place, then steps in order; a step's check() true moves to the next */
const STORY = {};
function chapterHero(at, robe) {
  W.heroes = [makeHero('sal', at.x, at.y, I, { robe })];
  hero().hp = S.hp || 100; hero().isP = true;
  if (game.players[1]) addNicky(game.players[1]);
}
function addNicky(input) {
  if (W.heroes.some(h => h.who === 'nicky')) { const n = W.heroes.find(h => h.who === 'nicky'); n.input = input; n.ai = null; n.isP = true; n.color = '#ff4a4a'; return n; }
  const h0 = hero(), n = makeHero('nicky', h0.x + 14, h0.y + 6, input, { color: '#ff4a4a' }); n.isP = !!input; n.ammo = 12; W.heroes.push(n); return n;
}
// Nicky on his own: follows his uncle, fights who's closest, keeps out of the way of the car
function nickyAI(n) {
  const h = hero(); if (!h) return {};
  let f = null, fd = 140; for (const e of W.foes) if (!e.dead) { const d = dist(n, e); if (d < fd) { fd = d; f = e; } }
  if (f) { const a = fd > 30 ? navAngle(n, f) : angTo(n, f); if (fd > 20) return { gx: Math.cos(a), gy: Math.sin(a), sprint: fd > 60, fire: fd > 60 && n.ammo > 0 && Math.random() < .03, aim: a }; return { attack: Math.random() < .12, kick: Math.random() < .03, consume() {} }; }
  const d = dist(n, h); if (d > 40) { const a = navAngle(n, h); return { gx: Math.cos(a), gy: Math.sin(a), sprint: d > 90 }; }
  return {};
}

STORY.ch1 = {
  setup() { enterPlace('town', {}); chapterHero(TOWN.at.hero, true); music('town'); const t = TOWN.at;
    W.donna = npc('donna', t.donna, { facing: -Math.PI / 2 });
    W.donna.act = () => convo([['donna', pick(['The Dombrowskis are putting in a pool. Bigger than ours, Peg says. With a slide.', 'Junior wants a car. I said ask your father. He said you\'d say ask your mother.', 'Father Phil is coming for dinner Sunday. Wear a shirt with buttons.', 'Your mother called. She says she\'s dying. Again. Call her back.'])], ['sal', pick(['Mm-hm.', 'I\'ll handle it.', 'Whaddaya gonna do.'])]]);
    W.gino = npc('gino', t.gino); W.baker = npc('baker', t.baker); W.murray = npc('laundry', t.murray); W.chef = npc('chef', t.chef); npc('sully', t.sully, { act: () => convo([['sully', pick(['Sal! Lookin\' to trade up? I got a Lincoln, one owner. Well. One owner at a time.', 'This one only got driven to church. And to a couple of other places.'])], ['sal', 'Not today, Sully.']]) });
    dropItem('paper', t.paper.x, t.paper.y);
  },
  steps: [
    { enter() { setObj('Get the newspaper', 'It\'s at the end of the driveway', TOWN.at.paper, 'PAPER'); hint('move', 'Move', `${['up', 'left', 'down', 'right'].map(a => label(a)).join(' ')} or the left stick to walk · hold ${label('sprint')} to hurry`);
        W.onPickup = (h, it) => { if (it.kind === 'paper') { S.flags.paper = 1; convo([['sal', 'Another indictment. Not mine. Good morning.']]); } }; },
      check: () => S.flags.paper && !convoBusy() },
    { enter() { setObj('Feed the ducks', 'They\'re in the pool. They\'ll want bread', { x: 13.6 * T, y: 5 * T }, 'DUCKS'); hint('use', 'Talk and use', `${label('interact')} to talk, use things and get in cars. With a mouse, click them`);
        mark(13.6 * T, 5 * T, 'Feed the ducks', () => { if (S.flags.ducks) return; S.flags.ducks = 1; for (const d of W.ducks) d.fed = 8; A.sfx('quack'); P.bits(15 * T, 5 * T, 4, 8, ['#d89a4a', '#f0d090']); adj('stress', -10);
          convo([['donna', 'You\'re feeding the ducks again. In your robe. The neighbors, Sal.'], ['sal', 'Let \'em look. These ducks got more class than the whole block.'],
            { who: 'donna', id: 'kiss', text: 'Are you going to Fusco\'s? Bring home a pound of the good stuff.', choices: ['Kiss her goodbye', '"I got business, Donna."'], on: i => i ? [['donna', 'You always got business.'], { run: () => adj('family', -4) }] : [['donna', 'Go on. Get dressed. You look like a Roman senator.'], { run: () => adj('family', 6) }] }]); }, { show: () => !S.flags.ducks, r: 40 }); },
      check: () => S.flags.ducks && !convoBusy() },
    { enter() { setObj('Get dressed', 'The front door of the house', TOWN.at.houseDoor, 'HOME');
        mark(TOWN.at.houseDoor.x, TOWN.at.houseDoor.y + 6, 'Get dressed', h => { fadeOut = 1; game.after(.6, () => { h.robe = false; rebuildRigs(h); S.flags.dressed = 1; fadeOut = 0; convo([['sal', 'Okay. Business casual.']]); }); }, { show: () => !S.flags.dressed }); },
      check: () => S.flags.dressed && !convoBusy() },
    { enter() { setObj('Meet Gino at Fusco\'s Meats', 'Take the car, it\'s a long walk in loafers', TOWN.at.gino, 'FUSCO\'S');
        hint('car', 'The car', `The black SUV is parked by the driveway. ${label('interact')} to get in`);
        W.gino.act = () => { S.flags.rounds = 1; convo([['gino', 'Sal! You look like a million bucks. Used, but still.'], ['sal', 'What do we got.'],
          ['gino', 'Three envelopes. Dolce Vita, Spin City, and Arturo\'s place. Arturo\'s been hearing from Brooklyn.'], ['sal', 'Brooklyn.'],
          ['gino', 'The Falsettis. Carmine\'s people. They\'re sniffing around like it\'s a free buffet.'], ['sal', 'Nobody eats free on my street. Not even me.']]); W.gino.act = null; }; },
      check: () => S.flags.rounds && !convoBusy() },
    { enter() {
        const upd = () => { const n = ['bakery', 'laundry', 'gabbiano'].filter(k => S.flags[k]).length; setObj('Make the rounds: ' + n + ' of 3', [!S.flags.bakery && 'Dolce Vita bakery', !S.flags.laundry && 'Spin City laundromat', !S.flags.gabbiano && 'Il Gabbiano'].filter(Boolean).join(' · '),
          !S.flags.bakery ? TOWN.at.baker : !S.flags.laundry ? TOWN.at.murray : TOWN.at.chef, 'ROUNDS', n + '/3'); };
        STORY.ch1.updRounds = upd; upd();
        W.baker.act = () => { W.baker.act = null; convo([['baker', 'Mister Baritone. It\'s all there, I counted twice. My husband counted once, he can\'t count.'],
          { who: 'baker', id: 'cannoli', text: 'Take a cannoli for the road. Take two.', choices: ['Take the cannoli', '"Just the envelope, Rosaria."'], on: i => i ? [['baker', 'Suit yourself. You look tired, you know.'], { run: () => adj('respect', 2) }] : [['sal', 'You\'re a saint.'], { run: () => { dropItem('cannoli', W.baker.x, W.baker.y + 10); adj('family', 2); } }] }],
          () => { S.flags.bakery = 1; adj('cash', 500); toast('Envelope', money(500) + ' from Dolce Vita'); A.sfx('cash'); upd(); }); };
        W.murray.act = () => { W.murray.act = null; convo([['laundry', 'Sal, Sal. Listen. It\'s been slow. The machines. The economy. A sock got into number four.'], ['sal', 'A sock.'],
          { who: 'sal', id: 'murray', text: 'He\'s three hundred short. Maybe five.', choices: ['Lean on him (the stare-down)', '"Pay me Friday. With interest."', '"Fine. I\'m taking the big dryer."'], on: i => {
            if (i === 0) return [{ run: () => { stareDown('laundry', ok => { if (ok) { convo([['laundry', 'Okay! Okay. I found it. It was in the other register. The secret one.']], () => { adj('cash', 800); adj('respect', 8); adj('stress', 4); S.flags.laundry = 1; toast('Envelope', money(800) + ' from Spin City'); A.sfx('cash'); upd(); }); }
              else convo([['laundry', 'I\'m telling you, it\'s half. Half is what I got.'], ['sal', 'Half. Next week, double.']], () => { adj('cash', 400); adj('stress', 8); S.flags.laundry = 1; toast('Envelope', money(400) + ' from Spin City'); upd(); }); }); } }];
            if (i === 1) return [['laundry', 'Friday. God bless you. Friday.'], { run: () => { adj('family', 4); adj('respect', -5); S.flags.laundry = 1; S.flags.murrayOwes = 1; toast('A favor', 'Murray owes you. With interest.'); upd(); } }];
            return [['laundry', 'The dryer? That\'s my best dryer!'], ['sal', 'Now it\'s my best dryer. Gino, get the truck.'], { run: () => { adj('cash', 250); adj('respect', 3); S.flags.laundry = 1; toast('A dryer', 'Worth ' + money(250) + ' to somebody'); upd(); } }]; } }]); };
        W.chef.label = () => S.flags.goonsGabbiano && !allDead() ? 'Busy' : 'Talk';
        W.chef.act = () => { if (!S.flags.goonsGabbiano || !allDead()) return; W.chef.act = null; convo([['chef', 'Sal. Grazie. Those animals came in, ate, and handed me a bill. Me! For my own food!'],
          ['sal', 'They won\'t come back.'], ['chef', 'Your envelope. And sit down sometime, eat. On the house. Really on the house, not like them.']], () => { S.flags.gabbiano = 1; adj('cash', 1000); adj('respect', 10); dropItem('gabagool', W.chef.x + 8, W.chef.y + 12); toast('Envelope', money(1000) + ' from Il Gabbiano'); A.sfx('cash'); upd(); }); };
      },
      update() {
        const h = hero();
        if (!S.flags.goonsGabbiano && h && dist(h, TOWN.at.chef) < 150) {
          S.flags.goonsGabbiano = 1; music('fight');
          convo([{ who: 'goon', name: 'FALSETTI GOON', text: 'Hey, big guy in the nice coat. This is a Falsetti table now.' }, ['sal', 'That\'s funny. I\'m gonna tell that to your dentist.']]);
          for (let k = 0; k < 3; k++) spawnFoe('goon', TOWN.at.chef.x - 30 + k * 30, TOWN.at.chef.y + 26, { wake: 1.5 });
          hint('fight', 'Fighting', `${label('attack')} punch (three in a row) · ${label('kick')} kick · hold ${label('block')} to block · ${label('dodge')} to roll`);
          W.onKill = () => { if (allDead()) { music('town'); toast('Il Gabbiano', 'Talk to Arturo'); } };
        }
      },
      check: () => S.flags.bakery && S.flags.laundry && S.flags.gabbiano && !convoBusy() },
    { enter() { setObj('Bring the envelopes to Gino', 'Fusco\'s Meats', TOWN.at.gino, 'GINO');
        W.gino.act = () => { W.gino.act = null; convo([['gino', 'Beautiful. Beautiful. Arturo called, he says you were very persuasive.'], ['gino', 'Also: Carmine Falsetti says hello. He says it with his whole chest, Sal. He sings it.'],
          ['sal', 'He sings.'], ['gino', 'Here. Fusco just sliced the gabagool. Try it, it\'s like butter.'], ['sal', '...'],
          { run: () => { S.flags.panicked = 1; adj('stress', 100); } }]); }; },
      check: () => S.flags.panicked && !convoBusy() && !W.mini && S.flags.after1 }
  ],
  done: () => 'session2'
};

STORY.ch2 = {
  setup() { enterPlace('town', { night: true, peds: 2, traffic: 2 }); chapterHero(TOWN.at.officeStand, false); music('night'); const t = TOWN.at;
    W.frankie = npc('frankie', t.frankie);
    // the SUV is outside the office tonight
    W.cars[0].x = 47 * T; W.cars[0].y = 10.5 * T; W.cars[0].angle = 0;
  },
  steps: [
    { enter() { setObj('Go to the Velvet Brass', 'Frankie called. He sounded like Frankie, but worse', TOWN.at.frankie, 'CLUB');
        W.frankie.act = () => { W.frankie.act = null; convo([['frankie', 'Sal. The Falsettis been driving by all night. Slow. With the windows down. In this weather.'],
          ['sal', 'They come here? To my place?'], ['frankie', 'Here. Take this, it\'s yours anyway. You left it in the office with the cigars.'],
          { run: () => { S.flags.gun = 1; S.ammo = Math.max(S.ammo, 24); toast('The pistol', '24 rounds'); hint('gun', 'The pistol', `${label('fire')} to shoot · aim with the mouse or the right stick · the Falsettis drop rounds`); } },
          ['frankie', 'Oh, and Sal? Here they come now.']]); }; },
      check: () => S.flags.gun && !convoBusy() },
    { enter() {
        let wave = 0; const spawns = [[2 * T, 31.5 * T], [19 * T, 41 * T], [20 * T, 31.5 * T], [2 * T, 41 * T], [14 * T, 42 * T]];
        const WAVES = [['goon', 'goon', 'goon', 'goon'], ['goon', 'gunman', 'goon', 'gunman'], ['bruiser', 'gunman', 'goon', 'gunman', 'goon']];
        const go = () => { const list = WAVES[wave]; list.forEach((k, i) => { const s = spawns[i % spawns.length]; const f = spawnFoe(k, s[0], s[1], { wake: .4 + i * .3 }); if (k === 'bruiser') f.name = 'VITO "VIBRATO"'; });
          setObj('Defend the Velvet Brass', 'Wave ' + (wave + 1) + ' of 3', null, '', (wave + 1) + '/3'); banner('WAVE ' + (wave + 1), wave === 2 ? 'Vito "Vibrato" brought a bat' : 'The Falsettis', 2); };
        music('fight'); go();
        W.onKill = () => { if (allDead()) { wave++; if (wave < 3) { dropItem('ammo', 8 * T, 39 * T, 10); dropItem('gabagool', 9 * T, 39.5 * T); game.after(2.2, go); } else S.flags.clubSafe = 1; } };
      },
      check: () => S.flags.clubSafe },
    { enter() { music('night'); setObj('Talk to Frankie', '', TOWN.at.frankie, 'FRANKIE');
        const nick = npc('nicky', { x: 19 * T, y: 31 * T }); nick.walkTo = { x: TOWN.at.frankie.x + 20, y: TOWN.at.frankie.y + 6 };
        W.frankie.act = () => { W.frankie.act = null; convo([['frankie', 'That last car, Sal. That was Lenny the Ledger driving. Carmine\'s bagman.'], ['frankie', 'He\'s got the book. Every envelope on this street, in his handwriting.'],
          ['nicky', 'Uncle Sal! I seen him. He took the Parkway south, toward the Pine Barrens.'], ['sal', 'In the middle of the night. In December.'], ['nicky', 'I got the van. Let\'s go.'],
          { who: 'sal', id: 'van', text: 'The book. In the woods.', choices: ['"Let\'s go get that book."', '"Call Gino first. Then we go."'], on: i => i ? [['frankie', 'I\'ll call him. He\'s gonna say it\'s a bad idea.'], ['sal', 'He always says that. He\'s always right. We go anyway.'], { run: () => adj('family', 3) }] : [{ run: () => adj('respect', 5) }] }],
          () => { S.flags.toWoods = 1; }); }; },
      check: () => S.flags.toWoods && !convoBusy() }
  ],
  done: () => 'ch3'
};

STORY.ch3 = {
  setup() { enterPlace('barrens', {}); chapterHero(BARRENS.at.hero, false); music('barrens');
    const n = addNicky(game.players[1] || null); n.x = BARRENS.at.nicky.x; n.y = BARRENS.at.nicky.y; if (!n.input) n.ai = nickyAI;
    // Lenny's footprints, from the van into the trees (one loafer, then none)
    let x = 7 * T, y = 7 * T; for (let i = 0; i < 70; i++) { const a = Math.PI / 2 - .25 + Math.sin(i * .3) * .5; x += Math.cos(a) * 5; y += Math.sin(a) * 4; if (y > 20 * T) break; W.track.push({ x, y, a, t: 0 }); }
    dropItem('shoe', BARRENS.at.shoe.x, BARRENS.at.shoe.y);
    W.cold = 100;
  },
  steps: [
    { enter() { setObj('Follow the footprints', 'Lenny went into the trees. Stay warm: the fire barrels help', BARRENS.at.shoe, 'TRACKS'); banner('PINE BARRENS', 'Stay near the fire barrels. The cold hurts', 3.5);
        hint('cold', 'The cold', 'Warmth drains in the snow. Stand by a burning barrel to warm up');
        W.onPickup = (h, it) => { if (it.kind === 'shoe') { S.flags.shoe = 1; convo([['sal', 'He lost a shoe.'], ['nicky', 'Who runs into the woods in loafers?'], ['sal', 'A guy from Brooklyn.']]); } }; },
      check: () => S.flags.shoe && !convoBusy() },
    { enter() { setObj('Keep following the trail', 'Across the frozen pond, east', BARRENS.at.pond, 'POND'); },
      update() { const h = hero(); if (!S.flags.ambush && h && dist(h, BARRENS.at.pond) < 120) { S.flags.ambush = 1; music('fight'); for (const [k, x, y] of [['goon', 26, 13], ['goon', 27, 20], ['gunman', 30, 16], ['goon', 17, 22]]) spawnFoe(k, x * T, y * T, { wake: .6 });
          convo([['nicky', 'Falsettis! In the woods! What, they live here?']]); W.onKill = () => { if (allDead()) { music('barrens'); S.flags.ambushDone = 1; } }; } },
      check: () => S.flags.ambushDone },
    { enter() { setObj('The hunter\'s cabin', 'Smoke from the chimney. Somebody\'s home', BARRENS.at.cabin, 'CABIN'); },
      update() { const h = hero(); if (!S.flags.lenny && h && dist(h, BARRENS.at.lenny) < 70) { S.flags.lenny = 1; music('boss');
          const f = spawnFoe('bagman', BARRENS.at.lenny.x, BARRENS.at.lenny.y, { name: 'LENNY THE LEDGER', loot: false }); W.lenny = f; f.wake = .8;
          convo([['lenny', 'Stay back! I know karate! I took a class! At the Y!']]); } },
      check: () => W.lenny && (W.lenny.surrender || W.lenny.dead) },
    { enter() { const f = W.lenny; music('barrens'); for (const g of W.foes) if (g !== f && !g.dead) g.hp = 0;
        convo([['lenny', 'Okay! Okay! Take the book! I\'m an accountant! I do taxes! I did my mother\'s taxes, she got a refund!'],
          { who: 'sal', id: 'lenny', text: 'Nicky looks at you. The woods are very quiet.', choices: ['"Go home, Lenny. Walk. It\'s good for you."', '"Nicky. Give us a minute."'], on: i => i
            ? [{ run: () => { fadeOut = 1; } }, ['nicky', '...Where\'d he go?'], ['sal', 'He went for a walk.'], { run: () => { fadeOut = 0; W.foes = W.foes.filter(g => g !== f); S.flags.lennyWalked = 1; adj('respect', 10); adj('stress', 15); } }]
            : [['lenny', 'Thank you! God bless! I\'ll do your taxes! Free!'], { run: () => { f.surrender = 0; f.flee = 1; S.flags.lennySpared = 1; adj('family', 8); adj('respect', -5); adj('stress', -6); } }] }],
          () => { dropItem('bag', f.x + 10, f.y + 8); W.onPickup = (h, it) => { if (it.kind === 'bag') { S.flags.book = 1; adj('cash', 5000); toast('The book', 'And ' + money(5000) + ' in the bag'); } }; }); },
      update(dt) { const f = W.lenny; if (f && f.flee) { f.vx = 90; f.vy = 50; f.facing = .5; if (f.x > 50 * T) W.foes = W.foes.filter(g => g !== f); } },
      check: () => S.flags.book && !convoBusy() },
    { enter() { setObj('Find the road out', 'South, past the trees: Route 72', BARRENS.at.exit, 'ROAD'); },
      check: () => { const h = hero(); return h && h.y > 33.5 * T; },
      leave(next) { convo([['nicky', 'I\'m never coming back to the woods. Never.'], ['sal', 'We were never here.']], next); } }
  ],
  done: () => 'session3'
};

STORY.ch4 = {
  setup() { enterPlace('town', { night: true, rain: true, peds: 0, traffic: 2 }); chapterHero(TOWN.at.hero, false); music('night');
    W.gino = npc('gino', TOWN.at.gino);
    S.flags.gun = 1; S.ammo = Math.max(S.ammo, 30);
  },
  steps: [
    { enter() { setObj('Meet Gino at Fusco\'s Meats', 'He called. He never calls', TOWN.at.gino, 'GINO');
        W.gino.act = () => { W.gino.act = null; convo([['gino', 'Sal. Carmine took the yard. Baritone Sanitation. Your father\'s trucks, Sal.'], ['sal', 'My father\'s trucks.'], ['gino', 'He\'s up there right now, singing. You can hear it from Bloomfield.'],
          ['sal', 'Then I\'m going to work.']], () => { S.flags.toYard = 1; }); }; },
      check: () => S.flags.toYard && !convoBusy() },
    { enter() { setObj('Take back the sanitation yard', 'Bottom right of town, past the diner', TOWN.at.yardGate, 'YARD'); },
      update() { const h = hero(); if (!S.flags.gate && h && dist(h, TOWN.at.yardGate) < 150) { S.flags.gate = 1; music('fight'); for (const [k, x, y] of [['goon', 44, 38], ['goon', 45, 40], ['gunman', 48, 35], ['bruiser', 47, 41], ['gunman', 50, 39]]) spawnFoe(k, x * T, y * T, { wake: .5 });
          W.onKill = () => { if (allDead()) S.flags.gateDone = 1; }; } },
      check: () => S.flags.gateDone },
    { enter() { music(null);
        const c = spawnFoe('boss', 52 * T, 38 * T, { name: 'CARMINE', loot: false }); W.carmine = c; c.wake = 99;
        setObj('Carmine "The Tenor" Falsetti', 'The yard. Your yard', c, 'CARMINE');
        convo([['carmine', 'Salvatore! A baritone in a world of tenors. Nobody hears you over us, my friend.'], ['sal', 'Funny. I hear you fine. Whole Turnpike hears you.'],
          ['carmine', 'Then hear THIS!']], () => { c.wake = 0; music('boss'); banner('FINAL MOVEMENT', 'Carmine "The Tenor" Falsetti', 2.5); });
        W.onBossPhase = (f, ph) => { if (ph === 2) { convo([['carmine', 'Boys! The bags! Throw the bags!']]); for (const [x, y] of [[44, 34], [57, 41]]) spawnFoe('goon', x * T, y * T, { wake: .5 }); dropItem('ammo', 49 * T, 40 * T, 12); }
          if (ph === 3) { convo([['carmine', 'Now... I SING!']]); dropItem('gabagool', 46 * T, 38 * T); } };
        W.onKill = f => { if (f.kind === 'boss') S.flags.carmineDown = 1; };
      },
      update() { const c = W.carmine; if (c && !c.dead && (c.surrender || c.hp <= c.max * .08)) { c.surrender = 1; c.hp = Math.max(1, c.hp); S.flags.carmineDown = 1; } },
      check: () => S.flags.carmineDown && !convoBusy() },
    { enter() { const c = W.carmine; c.surrender = 1; music(null); for (const g of W.foes) if (g !== c) g.hp = 0, g.dead = g.dead || 1;
        W.parked.push({ kind: 'cop', x: 43 * T, y: 36 * T, angle: 0 }, { kind: 'cop', x: 43 * T, y: 40 * T, angle: Math.PI }); A.sfx('horn');
        convo([['carmine', 'You won\'t do it. Not with the Feds pulling in. Look at you. You\'re all chest and no high notes.'],
          { who: 'sal', id: 'carmine', text: 'Blue lights on the wet gravel.', choices: ['"Let the Feds have him."', '"Go on, Carmine. Sing for them."'], on: i => i ? [['carmine', 'I... what? I don\'t sing for— oh. Oh no.'], ['sal', 'You got the voice for it.'], { run: () => adj('respect', 12) }] : [['sal', 'He\'s all yours, fellas. He\'s very musical.'], { run: () => { adj('respect', 8); adj('family', 4); } }] },
          ['gino', 'Sal. Go see your family. The diner. Donna called twice. Three times.']], () => { W.foes = W.foes.filter(g => g !== c); S.flags.yard = 1; adj('stress', -20); }); },
      check: () => S.flags.yard && !convoBusy() },
    { enter() { setObj('Meet the family at the Moonlight Diner', 'Donna got a booth', TOWN.at.dinerStand, 'DINER'); music('night');
        mark(TOWN.at.diner.x, TOWN.at.diner.y + 10, 'Go inside', () => { S.flags.diner = 1; }, { show: () => !S.flags.diner }); },
      check: () => S.flags.diner }
  ],
  done: () => 'epilogue'
};

const chapterIndex = id => CHAPTERS.findIndex(c => c.id === id);
function snapshot() { S.snap = JSON.parse(JSON.stringify(Object.assign({}, S, { snap: undefined }))); }
function restoreSnap() { if (S.snap) { const s = S.snap; resetStory(); Object.assign(S, JSON.parse(JSON.stringify(s))); S.snap = s; } }
function startChapter(id, o = {}) {
  const ci = chapterIndex(id); S.ch = ci; S.step = 0; snapshot();
  if (!o.noSave && !HUB) { try { game.saves.autosave(); } catch (e) { /* storage blocked: the visit keeps it */ } }
  const c = CHAPTERS[ci];
  if (c.kind === 'therapy') return game.go('therapy', { id });
  if (c.kind === 'diner') return game.go('diner', {});
  game.go('play', { mode: 'story', chapter: id });
}

/* ===== 06-modes.js ===== */
/* ---- THE COLLECTION: three minutes, every envelope on the street, the Falsettis in the way (1-2 players here; up to 4 in an AI Hub round) ---- */
const ROUND = 180;
const SHOPS = [
  { key: 'fusco', who: 'gino', at: () => TOWN.at.gino, pay: [300, 450], name: 'Fusco\'s Meats' },
  { key: 'bakery', who: 'baker', at: () => TOWN.at.baker, pay: [250, 400], name: 'Dolce Vita' },
  { key: 'gabbiano', who: 'chef', at: () => TOWN.at.chef, pay: [450, 700], name: 'Il Gabbiano' },
  { key: 'laundry', who: 'laundry', at: () => TOWN.at.murray, pay: [300, 500], name: 'Spin City' },
  { key: 'sully', who: 'sully', at: () => TOWN.at.sully, pay: [400, 650], name: 'Sully\'s Pre-Owned' },
  { key: 'club', who: 'frankie', at: () => TOWN.at.frankie, pay: [500, 800], name: 'The Velvet Brass' }
];
const C = { t: 0, over: false, started: false, crewT: 0, shops: [], ended: false, lastProgress: 0, sent: 0 };
function setupCollection(o = {}) {
  enterPlace('town', { peds: 4, traffic: 3 });
  music('town');
  Object.assign(C, { t: ROUND, over: false, started: !o.hub, crewT: 8, ended: false, hub: !!o.hub, lastProgress: 0, sent: 0, waitStart: !!o.hub });
  const start = TOWN.at.gino;
  W.heroes = [makeHero('sal', start.x, start.y + 20, I, { color: E.PLAYER_COLORS[0] })]; hero().isP = true;
  if (!o.hub && game.players[1]) addCollector(game.players[1]);
  C.shops = SHOPS.map(s => { const n = npc(s.who, s.at()); const sh = { ...s, npc: n, ready: 0 };
    n.label = () => sh.ready > 0 ? 'Come back later' : shopBusy(sh) ? 'Busy (Falsettis)' : 'Collect';
    n.act = h => collectShop(sh, h); return sh; });
  W.onHeroDown = h => { game.after(2.5, () => { const s = TOWN.at.gino, cut = Math.round(h.cash * .25 / 5) * 5; h.cash -= cut; h.hp = h.max; h.dead = 0; h.x = s.x; h.y = s.y + 20; h.inv = 2; if (cut) toast('Patched up', 'The Falsettis took a cut: ' + money(cut)); }); };
  setObj('The Collection', 'Collect envelopes · beat the Falsettis · most cash wins', null, '');
  if (o.hub && !C.readySent) { C.readySent = true; try { AIHub.ready(); } catch (e) { /* no hub */ } }
}
function addCollector(input) { const h0 = hero(), n = makeHero('nicky', h0.x + 16, h0.y, input, { color: E.PLAYER_COLORS[1] }); n.isP = true; n.ammo = 12; W.heroes.push(n); return n; }
const shopBusy = sh => W.foes.some(f => !f.dead && dist(f, sh.npc) < 110);
function collectShop(sh, h) {
  if (C.over || !C.started) return;
  if (sh.ready > 0) { toast(sh.name, 'Already paid. Come back in ' + Math.ceil(sh.ready) + ' s'); return; }
  if (shopBusy(sh)) { toast(sh.name, 'Not with the Falsettis standing here'); return; }
  const amt = Math.round(rnd(sh.pay[0], sh.pay[1]) / 10) * 10;
  h.cash += amt; sh.ready = 40; A.sfx('cash'); P.text(sh.npc.x, sh.npc.y, 30, '+' + money(amt), '#8af07a', { scale: 2, bounce: true });
  babble('a', sh.who); babble('o', sh.who);
}
function crewArrives() {
  const sh = pick(C.shops), a = sh.npc, n = 2 + Math.floor((ROUND - C.t) / 60), kinds = ['goon', 'goon', 'gunman', 'bruiser'];
  for (let i = 0; i < n; i++) { const ang = rnd(0, TAU), x = clamp(a.x + Math.cos(ang) * 60, 2 * T, 57 * T), y = clamp(a.y + 20 + Math.abs(Math.sin(ang)) * 30, 2 * T, 42 * T); spawnFoe(kinds[Math.min(kinds.length - 1, Math.floor(Math.random() * (1 + (ROUND - C.t) / 50)))], x, y, { wake: .6 }); }
  toast('Falsettis', 'A crew is leaning on ' + sh.name);
}
function updateCollection(dt) {
  if (C.ended) return;
  if (C.hub && C.waitStart) { const t = AIHub.time(); if (t >= 0) { C.waitStart = false; C.started = true; } else return; }
  if (!C.started || C.over) return;
  C.t -= dt;
  for (const sh of C.shops) sh.ready = Math.max(0, sh.ready - dt);
  C.crewT -= dt; if (C.crewT <= 0) { C.crewT = rnd(14, 22); crewArrives(); }
  if (C.t <= 0) { C.t = 0; finishCollection(); }
}
function finishCollection() {
  if (C.over) return; C.over = true;
  const results = W.heroes.map(h => ({ name: h.who === 'sal' ? (W.heroes.length > 1 ? 'P1 SAL' : 'SAL') : 'P2 NICKY', cash: h.cash, kills: h.kills || 0, color: h.color }));
  if (C.hub) { try { AIHub.result({ score: hero().cash, stats: { Cash: money(hero().cash), 'Falsettis down': hero().kills || 0 } }); } catch (e) { /* the hub is gone */ } banner('TIME', 'Cash: ' + money(hero().cash), 99); return; }
  music('win');
  game.after(2, () => game.go('results', { results }));
  banner('TIME!', 'Count it up', 2);
}
function collectHud() {
  const st = { counts: W.heroes.map(h => [h.who === 'sal' ? 'Sal' : 'Nicky', money(h.cash)]), objective: { title: C.waitStart ? 'Get ready' : 'The Collection', text: C.waitStart ? 'The round starts with the hub\'s countdown' : 'Envelopes at six shops · the Falsettis drop cash', step: Math.floor(C.t / 60) + ':' + String(Math.floor(C.t % 60)).padStart(2, '0') } };
  return st;
}

/* ---- THE ATTRACT MODE: Sal on autopilot, unkillable, showing the town, a brawl, the pistol, the car, the woods and the couch ---- */
const AP = { script: null, t: 0, view: 0 };
const goalDir = (h, p) => { const a = Math.atan2(p.y - h.y, p.x - h.x); return { gx: Math.cos(a), gy: Math.sin(a) }; };
function autoFight(h) {
  let f = null, fd = 1e9; for (const e of W.foes) if (!e.dead) { const d = dist(h, e); if (d < fd) { fd = d; f = e; } }
  if (!f) return {};
  const a = angTo(h, f), seen = W.map.los(h.x, h.y, f.x, f.y);
  if (!seen) { const n = navAngle(h, f); return { gx: Math.cos(n), gy: Math.sin(n), sprint: true }; }
  const rounds = h.god || (h === hero() ? S.ammo : h.ammo) > 0;
  if (rounds && (FOE_KINDS[f.kind].ranged || fd > 70)) return { gx: Math.cos(a) * (fd > 120 ? 1 : 0), gy: Math.sin(a) * (fd > 120 ? 1 : 0), fire: true, aim: a };
  if (fd > 20) return { gx: Math.cos(a), gy: Math.sin(a), sprint: true };
  const r = Math.random();
  return r < .08 ? { kick: true } : r < .1 ? { dodge: true, gx: -Math.cos(a), gy: -Math.sin(a) } : r < .3 ? { block: true } : { attack: true, consume() {} };
}
function* walkTo(h, p, near = 10, o = {}) { h.auto = h => Object.assign(goalDir(h, p), { sprint: o.sprint }); yield E.any([E.until(() => dist(h, p) < near), o.max || 12]); h.auto = () => ({}); }
function* driveTo(h, pts) {
  for (const p of pts) {
    h.auto = h => { const c = h.car; if (!c) return {}; const a = Math.atan2(p.y - c.y, p.x - c.x), da = E.angDiff(c.angle, a); return { steer: clamp(da * 2.2, -1, 1), gas: Math.abs(da) < 1.2 || Math.abs(c.speed) < 30, brake: Math.abs(da) > 1.4 && c.speed > 80 }; };
    yield E.any([E.until(() => dist(h.car || h, p) < 26), 9]);
  }
  h.auto = h => ({ brake: true }); yield 1; h.auto = h => ({ interact: true }); yield; h.auto = () => ({});
}
function* attractDemo() {
  const h = hero();
  banner('THE BARITONES', 'Demo · press any button', 3);
  yield 1.2;
  // the morning: the robe, the ducks
  yield* walkTo(h, { x: 13.4 * T, y: 6 * T }, 10);
  for (const d of W.ducks) d.fed = 6; A.sfx('quack'); P.bits(15 * T, 5 * T, 4, 8, ['#d89a4a', '#f0d090']);
  convo([['donna', 'You\'re feeding the ducks again. In your robe.'], ['sal', 'These ducks got more class than the whole block.']]);
  yield E.any([E.until(() => !convoBusy()), 8]);
  h.robe = false; rebuildRigs(h);
  // the car: down the drive and across town
  const c = W.cars[0]; yield* walkTo(h, c, 22); enterCar(h, c); yield .5;
  game.setView('iso'); game.note('ISO VIEW');
  yield* driveTo(h, [{ x: 7.5 * T, y: 15 * T }, { x: 23 * T, y: 15.5 * T }, { x: 23 * T, y: 27.5 * T }, { x: 31 * T, y: 28.5 * T }]);
  game.setView('threequarter'); game.note('THREE-QUARTER VIEW');
  // a brawl outside Il Gabbiano
  music('fight'); banner('THE FALSETTIS', 'Fists, feet, a roll and a block', 2.4);
  for (let k = 0; k < 4; k++) spawnFoe(k === 3 ? 'bruiser' : 'goon', 31 * T + (k - 1.5) * 26, 25.5 * T, { wake: .5 });
  h.auto = autoFight; yield E.any([E.until(() => allDead()), 22]);
  // the pistol
  banner('THE PISTOL', 'Aim with the mouse or the right stick', 2.4);
  for (let k = 0; k < 3; k++) spawnFoe('gunman', 26 * T + k * 40, 19.5 * T + (k % 2) * 90, { wake: .4 });
  yield E.any([E.until(() => allDead()), 16]);
  music('town'); h.auto = () => ({});
  game.setView('topdown'); game.note('TOP-DOWN VIEW');
  yield* walkTo(h, TOWN.at.laundry, 22, { sprint: true });
  // the stare-down
  W.mini = stareDown('laundry', () => {}); W.mini.auto = true; yield E.until(() => !W.mini);
  game.setView('threequarter');
  // the Pine Barrens, in the snow
  fadeOut = 1; yield .6;
  enterPlace('barrens', {}); W.heroes = [h]; h.x = BARRENS.at.hero.x; h.y = BARRENS.at.hero.y; h.car = null; game.cam.snap = true; music('barrens'); fadeOut = 0;
  banner('PINE BARRENS', 'Snow, fire barrels, footprints', 2.6);
  yield* walkTo(h, { x: 10 * T, y: 13 * T }, 14);
  yield* walkTo(h, { x: 20 * T, y: 22 * T }, 14);
  for (let k = 0; k < 3; k++) spawnFoe('goon', 24 * T + k * 20, 24 * T, { wake: .4 });
  h.auto = autoFight; yield E.any([E.until(() => allDead()), 14]); h.auto = () => ({});
  // the panic attack
  W.mini = panicAttack(() => {}, { auto: true }); yield E.until(() => !W.mini);
  yield 1;
  return 'done';
}

/* ===== 07-scenes.js ===== */
/* ---- SCENES ---- */
const scenes = {};
const anyInput = () => game.players.some(p => p.anyPressed() || Math.hypot(...p.move()) > .5) || !!I.clicked();
const cityBg = new E.Backdrop({ sky: ['#0a0818', '#1a1430', '#3a2040', '#6a3048'], moon: { x: .72, y: .2, r: 10, color: '#f0e0c0' }, stars: 60, starsY: .5,
  layers: [{ kind: 'city', color: '#140e20', y: .62, height: .34, parallax: .02 }, { kind: 'city', color: '#1e1428', y: .74, height: .26, parallax: .05, seed: 3 }, { kind: 'fog', color: '#5a2a48', y: .86, height: .1, parallax: 0, drift: 3 }] });
let saveSlotsReady = false;
function setupSaves() {
  if (saveSlotsReady || HUB) return; saveSlotsReady = true;
  const sv = game.saves;
  sv.write = () => ({ data: S.snap || S, place: (CHAPTERS[S.ch] || CHAPTERS[0]).title, level: S.ch + 1 });
  sv.read = save => { resetStory(); Object.assign(S, JSON.parse(JSON.stringify(save.data))); S.snap = JSON.parse(JSON.stringify(save.data)); startChapter(CHAPTERS[S.ch].id, { noSave: true }); };
}

/* TITLE: Sal and the SUV under the Jersey night; the menu; ten idle seconds start the attract mode */
const titleSal = rigOf('sal', false);
const titleState = { idle: 0, menu: null, touchMenu: null };
function buildTitleMenu() {
  setupSaves();
  const has = !HUB && game.saves.any;
  const items = [{ label: 'CONTINUE', disabled: !has }, 'NEW STORY', 'THE COLLECTION  (1-2 PLAYERS)', 'SETTINGS', 'ABOUT & CREDITS'];
  titleState.menu = new E.Menu(game, items, { x: 'center', y: 150, onPick: i => {
    A.sfx('confirm');
    if (i === 0) { const s = game.saves.latest(); if (s) game.saves.load(s.slot); }
    else if (i === 1) { resetStory(); startChapter('prologue'); }
    else if (i === 2) game.go('play', { mode: 'collect' });
    else if (i === 3) game.menu('settings');
    else if (i === 4) game.go('about', {});
  } });
  titleState.menu.i = has ? 0 : 1;
  titleState.touchMenu = new E.Menu(game, ['SETTINGS'], { x: 'center', y: 170, onPick: () => game.menu('settings') });
}
scenes.title = {
  enter() { music('title'); hideHud(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.weather = null; titleState.idle = 0; buildTitleMenu(); W.demo = false; game.allowJoin(false); game.resetCamera(); },
  update(dt) {
    titleState.idle += dt;
    const p = I.pointer(); if (p && (titleState.lastP && (p[0] !== titleState.lastP[0] || p[1] !== titleState.lastP[1]))) titleState.idle = 0; titleState.lastP = p;
    if (anyInput()) titleState.idle = 0;
    if (touchLocked) titleState.touchMenu.update(dt); else titleState.menu.update(dt);
    if (titleState.idle > 10) game.go('attract', {});
    game.focus(0, 0, 0);
    titleSal.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.time * .4) * .3, pose: 'hips' });
  },
  draw(r) {
    cityBg.draw(r);
    const cx = r.W / 2, m = Math.round(r.H / 2);
    // a street, the SUV, Sal
    r.overlay(g => {
      px.rect(g, 0, r.H - 52, r.W, 52, '#1a1820'); px.rect(g, 0, r.H - 53, r.W, 2, '#3a3440');
      for (let x = (game.time * 10) % 24 - 24; x < r.W; x += 24) px.rect(g, Math.round(x), r.H - 28, 12, 2, '#c8a840');
      const sx = Math.round(r.W * .78), sy = r.H - 34;
      titleSal.draw(g, Math.round(r.W * .2), r.H - 30, E.VIEWS ? E.charView(game.view) : game.view);
      // the lamp
      px.rect(g, sx + 40, r.H - 110, 3, 80, '#2a2a30'); px.rect(g, sx + 30, r.H - 112, 16, 4, '#3a3a40'); px.blend(g, .25, 'add', () => { px.disc(g, sx + 38, r.H - 104, 9, '#ffd080'); px.disc(g, sx + 38, r.H - 104, 5, '#fff0c0'); });
      E.font.title(g, 'THE BARITONES', cx, m - 92, { scale: 4, align: 'center', colors: ['#fff4d8', '#ffd36a', '#e8a040', '#a85a20'], depth: 3, depthColor: '#3a1a0a' });
      txt(g, 'A family. A business. A lot of feelings.', cx, m - 50, '#e8d8c8', { align: 'center' });
    });
    if (touchLocked) {
      r.overlay(g => { E.ui.box(g, cx - 120, m - 30, 240, 40, { bg: ['#2a1a14', '#120a08'], border: '#e8b84a' }); txt(g, 'Controller or keyboard required', cx, m - 22, '#ffd36a', { align: 'center' }); txt(g, 'Connect one, or press a key, to play', cx, m - 8, '#f4ecd8', { align: 'center' }); });
      titleState.touchMenu.y = m + 20; titleState.touchMenu.draw(r);
    } else {
      titleState.menu.y = m - 30; titleState.menu.draw(r);
      const dev = I.lastDevice, how = dev === 'gamepad' ? `D-pad or stick, ${label('confirm')} to pick · ${label('start')}: menu` : 'Arrows and Enter, or click · Esc: menu';
      r.text(how, cx, r.H - 14, '#b8a8a0', { align: 'center', shadow: '#000', outline: false });
    }
    r.text(E.versionLabel ? 'my-3D2dge ' + E.versionLabel() : '', 4, r.H - 8, '#5a5060', { font: 'tiny' });
  }
};

/* PLAY: the story's chapters, the Collection, and the attract mode's world */
let playMode = 'story';
scenes.play = {
  pausable: true, camera: { zoom: [.7, 2], start: 1, tall: 1.5 },
  enter(d = {}) {
    playMode = d.mode || 'story'; W.mode = playMode; W.demo = false; fadeOut = 0; W.mini = null; talk.close(); convoQ.length = 0; convoDone = null; W.objective = null;
    if (playMode === 'collect') setupCollection({ hub: !!d.hub });
    else {
      const ch = STORY[d.chapter || CHAPTERS[S.ch].id];
      W.chapter = ch; W.chapterId = d.chapter || CHAPTERS[S.ch].id; ch.setup(); W.stepEntered = -1;
      const c = CHAPTERS[S.ch]; banner(c.title.toUpperCase(), c.sub || '', 3.2);
      W.onHeroDown = h => { if (h === hero()) game.after(2.2, () => game.go('over', {})); else game.after(4, () => { h.dead = 0; h.hp = h.max * .5; h.inv = 2; }); };
    }
    if (!HUB) game.allowJoin({ max: 2, onJoin: (input) => { applyGlyphs(); if (playMode === 'collect') addCollector(input); else addNicky(input); toast('Player 2', 'Nicky\'s in'); } });
    game.cam.snap = true;
  },
  exit() { hideHud(); game.allowJoin(false); game.weather = null; L.enabled = false; },
  update(dt) {
    updateBanner(dt);
    if (HUB) hubTick(dt);
    if (playMode === 'collect' && C.ended) return;
    if (I.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (W.mini) { W.mini.update(dt); updateHud(dt); camera(); return; }
    if (updateTalk(dt)) { for (const n of W.npcs) n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.facing, pose: n.pose || null }); for (const h of W.heroes) { const rig = h.showGun > 0 ? h.rigs.gun : h.rigs.fists; rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: h.dead ? 'die' : null }); } for (const f of W.foes) f.rig.update(dt, { x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, facing: f.facing, pose: f.dead ? 'die' : f.surrender ? 'kneel' : null }); updateHud(dt); camera(); return; }
    if (playMode === 'story') storyUpdate(dt);
    else if (playMode === 'collect') updateCollection(dt);
    if (playMode === 'collect' && C.hub && C.waitStart) { updateHud(dt, collectHud()); camera(); return; }
    updateWorld(dt);
    updateHover();
    updateHud(dt, playMode === 'collect' ? collectHud() : {});
    camera();
  },
  draw(r) { drawWorld(r); drawOverlay(r); talk.draw(r); drawFade(r); if (playMode === 'collect') drawCollectOverlay(r); }
};
function camera() {
  const live = W.heroes.filter(h => !h.dead || h === hero());
  if (live.length > 1 && !game.headless) game.cam.frame(live, { margin: 40, zoom: [.7, 1] });
  else { game.cam.frame && game.cam.frame(null); const h = hero(); if (h) { const c = h.car; if (c) game.focus(c.x + Math.cos(c.angle) * c.speed * .25, c.y + Math.sin(c.angle) * c.speed * .25, 10); else game.focus(h.x, h.y, 14); } }
}
function drawFade(r) { if (fadeOut > 0) r.overlay(g => px.blend(g, Math.min(1, fadeOut), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000'))); }
function drawCollectOverlay(r) {
  if (C.hub && C.waitStart) { const t = AIHub.time(); r.overlay(g => { const s = isFinite(t) ? Math.ceil(-t / 1000) : null; E.font.title(g, s ? String(s) : 'READY', r.W / 2, r.H / 2 - 30, { scale: 4, align: 'center' }); txt(g, 'THE COLLECTION · most cash in three minutes', r.W / 2, r.H / 2 + 10, '#f4ecd8', { align: 'center' }); }); }
  if (!C.over && C.started && C.t < 10) r.overlay(g => E.font.title(g, String(Math.ceil(C.t)), r.W / 2, 30, { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c83a2a'] }));
}

/* the chapter's steps, the nerves, the cold */
function storyUpdate(dt) {
  const ch = W.chapter; if (!ch) return;
  const step = ch.steps[S.step];
  if (step && W.stepEntered !== S.step) { W.stepEntered = S.step; step.enter && step.enter(); }
  if (step && step.update) step.update(dt);
  if (step && W.stepEntered === S.step && !convoBusy() && !W.mini && step.check()) {
    const advance = () => { S.step++; W.stepEntered = -1; if (S.step >= ch.steps.length) { S.hp = hero().hp; startChapter(ch.done()); } };
    if (step.leave) { W.leaving = true; step.leave(() => { W.leaving = false; advance(); }); W.stepEntered = -2; }
    else advance();
  }
  // nerves: they ease off when it's quiet; at 100, the panic attack
  if (!W.foes.some(f => !f.dead) && S.stress < 99) adj('stress', -dt * .5);
  if (S.stress >= 99.5 && !W.mini && !convoBusy() && hero() && !hero().car && !hero().dead) {
    const midFight = W.foes.some(f => !f.dead);
    panicAttack(ok => {
      S.panics = (S.panics || 0) + 1;
      if (ok) { S.stress = 40; hero().focus = 10; banner('STEADY', 'In through the nose. Count it', 2); }
      else { S.stress = 55; adj('respect', -4); fadeOut = 1; game.after(1.2, () => { fadeOut = 0; }); banner('SAL WENT DOWN', 'He wakes up on the floor. Everyone is looking', 2.4); for (const f of W.foes) if (!f.dead) f.push(Math.cos(angTo(hero(), f)) * 200, Math.sin(angTo(hero(), f)) * 200, 0); }
      if (S.flags.panicked && W.chapterId === 'ch1' && !S.flags.after1) { S.flags.after1 = 1; convo([ok ? ['sal', 'I\'m fine. It\'s the heat.'] : ['gino', 'Sal! SAL! Somebody get him a chair! Not that chair!'], ['gino', 'You gotta see somebody about this, Sal. A professional.'], ['sal', 'I am seeing somebody. That\'s the problem.']]); }
      else music(midFight ? 'fight' : W.night ? 'night' : W.place === 'barrens' ? 'barrens' : 'town');
    });
  }
  for (const h of W.heroes) if (h.focus > 0) h.focus -= dt;
  // the cold in the woods: the fire barrels warm you
  if (W.place === 'barrens') {
    const h = hero(), warm = h && W.def.props.some(p => p.warm && Math.hypot(p.x - h.x, p.y - h.y) < 44);
    W.cold = clamp(W.cold + (warm ? 22 : -1.25) * dt, 0, 100);
    if (W.cold <= 0) for (const k of W.heroes) if (!k.dead) { k.hp -= 3 * dt; if (k.hp <= 0) { k.hp = 0; k.dead = .001; if (W.onHeroDown) W.onHeroDown(k); } }
    if (warm && Math.random() < .1) P.add && P.add({ kind: 'ember', x: h.x + rnd(-6, 6), y: h.y, z: 20, vz: 20 });
  }
}

/* THERAPY: the office, two chairs, the clock */
const SEATED = { pose: 'crouch' };
scenes.therapy = {
  camera: { zoom: false },
  enter(d) {
    W.mode = 'story'; W.demo = false; fadeOut = 0; convoQ.length = 0; convoDone = null; talk.close();
    enterPlace('office'); W.heroes = []; music('office');
    const o = OFFICE.at; W.sal = npc('sal', { x: o.sal.x, y: o.sal.y + 8 }, { facing: 0, fixedFacing: true, pose: 'crouch', z: 7 }); W.melfi = npc('melfi', { x: o.melfi.x, y: o.melfi.y + 8 }, { facing: Math.PI, fixedFacing: true, pose: 'crouch', z: 7 });
    W.objective = null; game.setZoom(1.5); game.cam.snap = true;
    const c = CHAPTERS[S.ch]; banner(c.title.toUpperCase(), 'Dr. Marchetti\'s office', 2.5);
    W.sessionId = d.id; W.sessionT = 0; W.sessionStarted = false;
  },
  exit() { game.setZoom(1); hideHud(); },
  update(dt) {
    updateBanner(dt); W.sessionT += dt;
    if (!W.sessionStarted && W.sessionT > 1.2) { W.sessionStarted = true; convo(SESSIONS[W.sessionId](), () => { W.sessionDone = true; game.after(.8, () => { const next = { prologue: 'ch1', session2: 'ch2', session3: 'ch4' }[W.sessionId]; startChapter(next); }); }); }
    updateTalk(dt);
    for (const n of W.npcs) { n.expr = talk.open && speaking === n.who ? 'smile' : null; n.rig.update(dt, { x: n.x, y: n.y, z: n.z, vx: 0, vy: 0, facing: n.facing, pose: 'crouch', expr: speaking === n.who && talk.typing ? 'shout' : null }); }
    game.focus(7 * T, 5 * T, 10);
    hideHud();
  },
  draw(r) { drawWorld(r); r.overlay(g => { const m = Math.min(59, Math.floor(W.sessionT / 5)); txt(g, 'Dr. Marchetti\'s office   4:' + String(m).padStart(2, '0') + ' PM', 8, 8, '#e8d8c0'); }); drawOverlay(r); talk.draw(r); drawFade(r); }
};

/* THE DINER: the booth, the jukebox, the bell over the door */
const SONG_TITLES = ['"Hold On to the Night" · The Turnpikes', '"Sunday Gravy" · Lou Carbone', '"Exit 13" · The Meadowlands'];
scenes.diner = {
  camera: { zoom: false },
  enter() {
    W.mode = 'story'; W.demo = false; fadeOut = 0; convoQ.length = 0; convoDone = null; talk.close(); W.mini = null;
    enterPlace('diner'); W.heroes = []; music(null); game.setZoom(1.35); game.cam.snap = true;
    const D = DINER.at; W.sal = npc('sal', D.door, { facing: -Math.PI / 2 }); W.sal.walkTo = D.sal; W.waitress = npc('waitress', D.waitress, { facing: 0 });
    W.objective = null; banner('EPILOGUE', 'The Moonlight Diner', 2.5); W.dinerScript = game.script(dinerScene);
  },
  exit() { game.setZoom(1); hideHud(); },
  update(dt) { updateBanner(dt); updateTalk(dt); updateWorld(dt); game.focus(9 * T, 5.5 * T, 10); hideHud(); },
  draw(r) {
    drawWorld(r);
    // the jukebox: chrome, colored tubes, a glow
    const j = DINER.at.juke; r.queue(j.x, j.y, 0, g => { const [X, Y] = r.w(j.x, j.y, 0); px.rect(g, X - 7, Y - 26, 14, 26, '#c83a3a'); px.rect(g, X - 6, Y - 25, 12, 10, '#ffd36a'); for (let i = 0; i < 4; i++) px.rect(g, X - 5 + i * 3, Y - 13, 2, 10, ['#ff60c0', '#60d0ff', '#ffe060', '#80ff80'][(i + Math.floor(game.time * 4)) % 4]); px.rect(g, X - 7, Y - 27, 14, 2, '#e8e8f0'); }, { emissive: true });
    L.add(j.x, j.y + 4, 14, 50, .8, { color: '#ff80c0' });
    drawOverlay(r); talk.draw(r); drawFade(r);
  }
};
function* dinerScene() {
  const D = DINER.at;
  yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2; W.sal.pose = null;
  yield .6; W.sal.walkTo = { x: D.juke.x, y: D.juke.y + 14 }; yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2;
  let song = 0;
  convo([{ who: 'sal', id: 'juke', text: 'The jukebox. Three for a quarter. One for a dollar, these days.', choices: SONG_TITLES, on: i => { song = i; S.flags.song = i; return []; } }]);
  yield E.until(() => !convoBusy());
  const J = JSON.parse(JSON.stringify(SONGS.jukebox)); J.bpm = [120, 100, 132][song]; if (song === 1) J.tracks.forEach(t => { if (t.wave !== 'drums') t.wave = 'triangle'; });
  A.music(J, { fade: .3 }); curSong = 'jukebox';
  W.sal.walkTo = D.sal; yield E.until(() => !W.sal.walkTo); W.sal.facing = -Math.PI / 2; W.sal.pose = 'crouch'; W.sal.z = 4;
  convo([['waitress', 'Coffee, hon?'], ['sal', 'And onion rings. For the table.']]); yield E.until(() => !convoBusy());
  // the bell: Donna
  A.sfx('bell'); yield .4; const donna = npc('donna', D.door, { facing: -Math.PI / 2 }); donna.walkTo = D.seats[0]; yield E.until(() => !donna.walkTo); donna.facing = -Math.PI / 2; donna.pose = 'crouch'; donna.z = 4;
  convo([['donna', 'You look tired. Is it over? Whatever it was?'], ['sal', 'It\'s never over. But tonight it\'s quiet.']]); yield E.until(() => !convoBusy());
  // the bell: Junior
  A.sfx('bell'); yield .4; const aj = npc('aj', D.door, { facing: -Math.PI / 2 }); aj.walkTo = D.seats[1]; yield E.until(() => !aj.walkTo); aj.facing = Math.PI / 2; aj.pose = 'crouch'; aj.z = 4;
  convo([['aj', 'You ordered onion rings already? For the table?'], ['sal', 'You know what\'s good about an onion ring? It\'s a circle. It comes back around.'], ['aj', 'That\'s... actually kind of deep, Dad.'],
    ['donna', 'Gia\'s parking.'], ['sal', 'She\'s been parking for ten minutes.']]);
  yield E.until(() => !convoBusy());
  yield 1.2;
  // the bell, once more. Sal looks up.
  A.sfx('bell'); W.sal.facing = Math.PI / 2 + .6; W.sal.expr = null; yield 1.1;
  // CUT TO BLACK. Silence.
  fadeOut = 1; A.music(null); curSong = null;
  yield 5;
  game.go('credits', {}, { fade: 0 });
}

/* GAME OVER: sleeping with the fishes */
const FISH = E.sprite(['..bbb...', '.bBBBb.b', 'bBwBBBbb', '.bBBBb.b', '..bbb...'], { b: '#2a5a8a', B: '#5a9ad8', w: '#ffffff' });
let overMenu = null;
scenes.over = {
  enter() { music(null); A.sfx('die'); hideHud(); game.follow(null); L.enabled = false; game.weather = null; game.allowJoin(false);
    overMenu = new E.Menu(game, ['RETRY THE CHAPTER', 'QUIT TO TITLE'], { x: 'center', y: 150, onPick: i => { if (i === 0) { restoreSnap(); startChapter(CHAPTERS[S.ch].id, { noSave: true }); } else game.go('title'); } }); },
  update(dt) { overMenu.update(dt); game.focus(0, 0, 0); },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#02101e', '#0a2a4a', '#103a5a']);
    r.overlay(g => { for (let i = 0; i < 9; i++) { const x = ((game.time * (12 + i * 3) + i * 70) % (r.W + 40)) - 20, y = 30 + (i * 37) % (r.H - 60) + Math.sin(game.time + i) * 4; px.sprite(g, FISH, Math.round(x), Math.round(y), i % 2 === 0); }
      for (let i = 0; i < 20; i++) px.dot(g, (i * 53 + Math.floor(game.time * 7)) % r.W, r.H - ((game.time * 20 + i * 29) % r.H), '#8ac8f0');
      E.font.title(g, 'SLEEPING WITH', r.W / 2, r.H / 2 - 70, { scale: 3, align: 'center', colors: ['#e0f0ff', '#80b8e8', '#3a6a9a'] });
      E.font.title(g, 'THE FISHES', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#e0f0ff', '#80b8e8', '#3a6a9a'] }); });
    overMenu.y = Math.round(r.H / 2) + 4; overMenu.draw(r);
  }
};

/* RESULTS of the Collection */
let resMenu = null, resData = null;
scenes.results = {
  enter(d) { resData = d.results || []; hideHud(); music('win'); L.enabled = false; game.weather = null; resMenu = new E.Menu(game, ['PLAY AGAIN', 'TITLE'], { x: 'center', y: 160, onPick: i => game.go(i ? 'title' : 'play', { mode: 'collect' }) }); },
  update(dt) { resMenu.update(dt); game.focus(0, 0, 0); },
  back() { game.go('title'); return true; },
  draw(r) {
    cityBg.draw(r); const cx = r.W / 2;
    const sorted = [...resData].sort((a, b) => b.cash - a.cash);
    r.overlay(g => { E.font.title(g, 'THE COUNT', cx, 24, { scale: 3, align: 'center' });
      sorted.forEach((p, i) => { const y = 72 + i * 26; E.ui.box(g, cx - 110, y - 4, 220, 22, { bg: ['#2a1a14', '#120a08'], border: i === 0 ? '#ffd36a' : '#6a5a4a' });
        txt(g, (i === 0 ? '★ ' : '') + p.name, cx - 100, y + 3, p.color || '#ffffff'); txt(g, money(p.cash) + '   ' + p.kills + ' down', cx + 100, y + 3, '#8af07a', { align: 'right' }); });
      if (sorted.length > 1) txt(g, sorted[0].name + ' is the earner tonight.', cx, 72 + sorted.length * 26 + 4, '#ffd36a', { align: 'center' }); });
    resMenu.y = Math.max(150, 90 + sorted.length * 26); resMenu.draw(r);
  }
};

/* CREDITS: the ending, then the people */
function endingTitle() { return S.respect >= 70 && S.family >= 60 ? 'THE BOSS WHO WENT HOME FOR DINNER' : S.respect >= 70 ? 'THE LAST BARITONE STANDING' : S.family >= 65 ? 'THE FAMILY MAN' : 'A GUY WHO TRIED'; }
let rollY = 0, creditLines = [];
scenes.credits = {
  enter() { hideHud(); L.enabled = false; game.weather = null; music('title'); rollY = 0; game.follow(null);
    try { if (!HUB) { S.flags.finished = 1; game.saves.autosave(); } } catch (e) { /* storage blocked */ }
    creditLines = [['THE BARITONES', 'title'], ['', ''], [endingTitle(), 'gold'], ['', ''],
      ['Cash on the street: ' + money(S.cash), ''], ['Respect: ' + Math.round(S.respect) + '    Family: ' + Math.round(S.family), ''], ['Panic attacks: ' + (S.panics || 0), ''],
      [S.flags.lennySpared ? 'Lenny the Ledger does taxes in Toms River now.' : S.flags.lennyWalked ? 'Nobody asks about Lenny the Ledger.' : 'Lenny the Ledger was never found. Or looked for.', ''],
      [S.flags.want === 2 ? 'In the spring, new ducks came.' : S.flags.want === 1 ? 'Nobody cried at dinner. Almost nobody.' : 'He was still standing.', ''], ['', ''],
      ['STARRING', 'gold'], ['Sal Baritone', ''], ['Donna Baritone', ''], ['Nicky Baritone', ''], ['Gino "Pistachio" Palmieri', ''], ['Frankie "The Wig" Vitale', ''], ['Dr. Elena Marchetti', ''],
      ['Carmine "The Tenor" Falsetti', ''], ['Lenny the Ledger', ''], ['Rosaria, Murray, Arturo and Sully', ''], ['Three ducks, as themselves', ''], ['', ''],
      ['AN ORIGINAL SPIRITUAL SUCCESSOR TO', 'gold'], ['The Sopranos (HBO, 1999-2007)', ''], ['No characters, lines or music from it are used.', ''], ['', ''],
      ['MADE WITH', 'gold'], ['my-3D2dge v0.85.1 · the AI Hub session protocol v1', ''], ['Code, art, music and voices written in code', ''], ['Claude Opus 5.5 (Anthropic), in Claude Code', ''], ['', ''], ['Thanks for playing.', 'gold']];
  },
  update(dt) { rollY += dt * 22 * (game.players.some(p => p.down('confirm') || p.down('attack')) ? 4 : 1); if (rollY > creditLines.length * 16 + game.H + 40 || game.players.some(p => p.pressed('cancel') || p.pressed('start'))) game.go('title'); game.focus(0, 0, 0); },
  draw(r) { r.sky(['#000000', '#08060c']); r.overlay(g => creditLines.forEach(([s, k], i) => { const y = Math.round(r.H + 10 + i * 16 - rollY); if (y < -20 || y > r.H + 20) return;
    if (k === 'title') E.font.title(g, s, r.W / 2, y, { scale: 3, align: 'center' }); else txt(g, s, r.W / 2, y, k === 'gold' ? '#ffd36a' : '#e8e0d8', { align: 'center' }); })); }
};

/* ABOUT & CREDITS: the source information, how it was tested, and what the engine and the prompt were like */
let aboutPage = 0, aboutScroll = 0;
scenes.about = {
  enter() { aboutPage = 0; aboutScroll = 0; hideHud(); music('office'); L.enabled = false; game.weather = null; },
  update(dt) {
    const p = game.players;
    if (p.some(q => q.pressed('cancel'))) { A.sfx('cancel'); game.go('title'); return; }
    if (p.some(q => q.pressed('right') || q.pressed('confirm'))) { aboutPage = (aboutPage + 1) % ABOUT.length; aboutScroll = 0; A.sfx('select'); }
    if (p.some(q => q.pressed('left'))) { aboutPage = (aboutPage + ABOUT.length - 1) % ABOUT.length; aboutScroll = 0; A.sfx('select'); }
    if (p.some(q => q.down('down'))) aboutScroll += dt * 90; if (p.some(q => q.down('up'))) aboutScroll = Math.max(0, aboutScroll - dt * 90);
    const z = I.zoom ? I.zoom() : 1; if (z !== 1) aboutScroll = Math.max(0, aboutScroll + (z < 1 ? 30 : -30));
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) aboutPage = (aboutPage + ABOUT.length - 1) % ABOUT.length; else aboutPage = (aboutPage + 1) % ABOUT.length; aboutScroll = 0; }
    game.focus(0, 0, 0);
  },
  back() { game.go('title'); return true; },
  draw(r) {
    r.sky(['#120c0a', '#1e1410']);
    const pg = ABOUT[aboutPage], w = Math.min(r.W - 30, 420), x0 = Math.round((r.W - w) / 2);
    r.overlay(g => {
      E.font.title(g, pg[0], r.W / 2, 10, { scale: 2, align: 'center' });
      txt(g, '◂ ' + (aboutPage + 1) + ' / ' + ABOUT.length + ' ▸', r.W / 2, 34, '#c8b8a8', { align: 'center' });
      let y = 50 - Math.round(aboutScroll);
      const maxY = r.H - 22;
      for (const para of pg[1]) {
        const lines = E.font.wrap(para, w); for (const l of lines) { if (y > 44 && y < maxY) txt(g, l, x0, y, para.startsWith('•') ? '#f4ecd8' : '#e8d8c0'); y += 10; } y += 5;
      }
      const total = y + aboutScroll - 50; if (aboutScroll > total) aboutScroll = Math.max(0, total - 40);
      px.rect(g, 0, r.H - 18, r.W, 18, '#120c0a');
      txt(g, `${label('left')} ${label('right')} page · ${label('up')} ${label('down')} scroll · ${label('cancel')} back`, r.W / 2, r.H - 13, '#a89888', { align: 'center' });
    });
  }
};

/* ATTRACT: the demo plays itself; any input goes back to the title */
scenes.attract = {
  camera: { zoom: false },
  enter() {
    W.mode = 'attract'; W.demo = true; fadeOut = 0; W.mini = null; convoQ.length = 0; convoDone = null; talk.close();
    enterPlace('town', { peds: 5, traffic: 4 }); music('town');
    const h = makeHero('sal', TOWN.at.hero.x, TOWN.at.hero.y, null, { robe: true, god: true }); W.heroes = [h]; h.auto = () => ({});
    S.ammo = 99; W.objective = null; game.cam.snap = true;
    AP.script = game.script(function* () { yield* attractDemo(); game.go('attract', {}); });
    AP.t = 0;
  },
  exit() { W.demo = false; hideHud(); game.setView('threequarter'); game.weather = null; L.enabled = false; W.mini = null; },
  update(dt) {
    AP.t += dt; updateBanner(dt);
    if (AP.t > .6 && anyInput()) { game.players.forEach(p => p.consumeAll()); game.go('title'); return; }
    if (W.mini) { W.mini.update(dt); camera(); return; }
    updateTalk(dt);
    updateWorld(dt); camera();
  },
  draw(r) { drawWorld(r); drawOverlay(r); talk.draw(r); drawFade(r);
    r.overlay(g => { if (Math.floor(game.real * 1.5) % 2) txt(g, touchLocked ? 'DEMO · TAP TO RETURN' : 'DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffd36a', { align: 'center' }); E.font.title(g, 'THE BARITONES', 8, 8, { scale: 1, colors: ['#fff4d8', '#e8b84a'] }); }); }
};

/* ===== 08-hub.js ===== */
/* ---- AI HUB: a ghost-mode round of the Collection. Each copy plays its own street from the same seed; the others'
 * Sals walk through it as see-through ghosts, and the hub keeps the score (the cash) ---- */
const HUBS = { sendT: 0, progT: 0, info: null };
scenes.hubwait = {
  enter() { hideHud(); music(null); },
  update() { game.focus(0, 0, 0); },
  draw(r) { cityBg.draw(r); r.overlay(g => { E.font.title(g, 'THE BARITONES', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center' }); txt(g, 'Joining the round...', r.W / 2, r.H / 2 + 4, '#f4ecd8', { align: 'center' }); }); }
};
async function hubConnect() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) { HUB = false; game.go('title'); return; }
  HUBS.info = info;
  AIHub.on('message', (d, from) => {
    if (!d || d.t !== 'g') return;
    let gh = W.ghosts.get(from);
    if (!gh) { const p = (info.players || []).find(q => q.id === from) || {}; gh = { rig: rigOf('sal', false), name: String(p.name || 'Player ' + (from + 1)).slice(0, 16), color: p.color || '#ffffff', x: d.x, y: d.y, f: d.f, lx: d.x, ly: d.y }; W.ghosts.set(from, gh); }
    gh.lx = gh.x; gh.ly = gh.y; gh.x = +d.x || 0; gh.y = +d.y || 0; gh.f = +d.f || 0; gh.place = d.p; gh.atk = !!d.a; gh.car = !!d.c;
  });
  AIHub.on('leave', ({ id }) => { W.ghosts.delete(id); });
  AIHub.on('time-up', () => { if (!C.over) finishCollection(); });
  AIHub.on('end', () => { C.ended = true; music(null); A.music(null); try { game.audio.mute(true); } catch (e) { /* no sound */ } game.players.forEach(p => p.clear()); });
  game.go('play', { mode: 'collect', hub: true }, { fade: 0 });
}
// each step of a hub round: our Sal to the others (10 a second), the score to the hub (once a second), the ghosts posed
function hubTick(dt) {
  if (!HUBS.info || C.ended || W.mode !== 'collect') return;
  const h = hero(); if (!h) return;
  HUBS.sendT -= dt; HUBS.progT -= dt;
  if (HUBS.sendT <= 0 && C.started) { HUBS.sendT = .1; AIHub.send({ t: 'g', x: Math.round(h.x), y: Math.round(h.y), f: +h.facing.toFixed(2), p: W.place, a: !!(h.combo.busy || h.kickA.busy), c: !!h.car }, { reliable: false }); }
  if (HUBS.progT <= 0 && C.started && !C.over) { HUBS.progT = 1; AIHub.progress({ score: h.cash, label: money(h.cash) }); }
  for (const [, gh] of W.ghosts) { const vx = (gh.x - gh.lx) * 10, vy = (gh.y - gh.ly) * 10; gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f, attack: gh.atk ? E.move('jab', (game.time * 3) % 1) : null }); }
}

/* ===== 09-about.js ===== */
/* ---- ABOUT & CREDITS: the pages of the About screen (and the same answers as the chat reply and exit-interview.json) ---- */
const ABOUT = [
  ['HOW TO PLAY', [
    'Sal Baritone runs the North Jersey rackets, and lately his nerves run him. Make the rounds, keep the Falsettis off your street, keep your family at the table and your stress under 100.',
    '• Move: WASD or arrows, the left stick. Sprint: Shift, R1 or L3.',
    '• Punch (three in a row): J or left click, □ / X. Kick: K, △ / Y.',
    '• Block: L or C, L1 or L2. Roll: Space, ○ / B.',
    '• Shoot: Q or right click, R2. Aim: the mouse or the right stick.',
    '• Talk, use, get in or out of the car: E or F, ✕ / A. Click a person or a thing to walk to it and use it.',
    '• In the car: gas with W or R2, brake with S or L1/L2, handbrake with Space or ○.',
    '• Camera view (three-quarter, top-down, isometric): V or R3. Zoom: the mouse wheel, - and =.',
    '• Pause, settings, saves, controls: Esc or Options / Start. Player 2 joins with Start on a second controller, or 2 on the keyboard.',
    'Stress rises when Sal gets hit, shoots or makes hard choices. Quiet time, ducks, cannoli and gabagool bring it down. At 100 he has a panic attack: breathe with the ring, or he goes down.'
  ]],
  ['SOURCE INFORMATION', [
    '• Date: 2026-11-02 18:13',
    '• Source: The Sopranos (HBO, 1999-2007), as an original spiritual successor: no characters, lines or music from it.',
    '• Genre and Perspective: an action-adventure crime brawler with a story told in chapters and therapy sessions; three-quarter overhead camera (the engine\'s threequarter view), switchable to top-down and isometric.',
    '• Tech: my-3D2dge v0.85.1 (the full engine, one file, inlined) with its drive module (cars), E.Shell (HTML HUD and menus), E.Dialog, E.Bullets, Humanoid rigs; the AI Hub session client 1.3.0 (protocol v1). Plain JavaScript, no other libraries.',
    '• Art Direction: the engine\'s native retro-modern pixel art: PS1-resolution (320x240, expanded to fill the screen), HD-shaded 3D-skeleton characters, materials on walls and floors, props, canvas lighting at night, rain and snow.',
    '• Animation: the engine\'s procedural rigs: E.MOVES punches and kicks (jab, cross, hook, roundhouse, overhead, haymaker, uppercut), poses (guard, block, kneel, die), rolls, hit-stop, smears and particles.',
    '• Audio: code-written chip music (title, town, night, fight, boss, Pine Barrens, office and three jukebox takes) and sound effects from the engine synth; gibberish "Simlish" voices pitched per speaker, one syllable every other letter.',
    '• Online: AI Hub sessions in ghost mode (1-4 players): a three-minute Collection round, the others shown as see-through ghosts, cash reported as the score. No other network use.',
    '• Testing: headless engine tests in Node (every system and a full story playthrough by script on three choice paths), browser checks with Playwright in Chromium, Firefox and WebKit, the viewport matrix (phones to ultrawide), the AI Hub harness.',
    '• Research: the engine handoff package (API card, index, kits) and the AI Hub protocol README. Nothing else.',
    '• Environment: Claude Code CLI (headless); Linux; browser unknown',
    '• Model: Anthropic, claude-opus-5-5, reasoning effort medium',
    '• Usage: unknown (no token or cost meter in this session; about 55 minutes)'
  ]],
  ['TESTING FEEDBACK', [
    "• How many issues did testing catch? Thirteen game issues, plus six mistakes in my own tests. The game issues: foes and allies walked in straight lines, so a goon and Sal could get stuck on opposite sides of a building; the scripted panic attack never fired (stress drained to 99.9 before the check), Carmine's surrender never set the flag that ends the boss fight, the AI Hub ready() call sat on a game timer that the scene change cleared, you couldn't get out of a reversing car, moving the mouse didn't switch the prompts to the mouse, touch-only phones weren't detected in WebKit and Firefox, the pixel font had no middle dot, the therapy clock sat under the corner buttons, the moon sat under the phone menu button, banners covered fights, the SUV looked like a fridge, and Donna couldn't be clicked.",
    "• How many would be considered critical issues / game breaking? Four would have broken the game: the panic attack that never fired (it soft-locks chapter one), Carmine's surrender (it soft-locks the finale), the straight-line enemies who could get stuck behind a building (they stall a wave), and the missing ready() (AI Hub rounds never start).",
    "• What was the most helpful test you ran? The headless full-story playthrough: a bot plays New Story through the credits with real input taps, on three different choice paths. It found both soft-locks and the pathfinding bug.",
    "• What was the least helpful test you ran? The viewport matrix: 24 clean screenshots of the title with no overflow and no errors. It's reassuring, but the game draws on one canvas, so it couldn't find much."
  ]],
  ['ENGINE FEEDBACK', [
    "• What did you like most about the engine? Characters with no art files: HD Humanoid rigs, E.MOVES punches and kicks with real wind-ups, and hitFx gave the brawling a good feel almost for free. The standard pause, settings, rebinding and save screens meant I spent no time on menus.",
    "• Did you get stuck or guess wrong? Yes, a few times. game.after timers are cleared on a scene change, and that ate the AI Hub ready() call. A mouse move doesn't set input.lastDevice to 'mouse' (only a button does). The pixel font has no middle dot. And I guessed facing and pose values for seated characters ('crouch' stands in for sitting).",
    "• What was the most important thing you had to build yourself? The story layer: chapters as steps with check functions, a conversation queue with choices that branch, gibberish voices per speaker, and the two minigames. Also cars drawn from their heading and the gamepad axis inversion.",
    "• What was the hardest part about using the engine? Its size: the API card, the index and the kits are a lot to take in, and the answer is often one line in a 190 KB index. Some behaviour, like timers dying with the scene and the device switching, only shows when you test.",
    "• If you had to remove or overhaul one thing from the engine, what would that be? I'd overhaul input.lastDevice: it should count mouse movement and stick movement, so prompts follow the device without a game wrapping input.tick.",
    "• If you could change one thing about the engine, what would it be? Built-in axis inversion for both sticks (not just invert aim Y), plus a sit pose and a car or vehicle draw helper for ground views."
  ]],
  ['PROMPT FEEDBACK', [
    "• What did you like most about this prompt? Clear, testable requirements (attract after 10 s, glyph families, the invert toggles, touch-only behaviour) and the freedom to pick a genre and a voice for the source.",
    "• What was confusing? How Multiplayer should work 'for the game on its own': I read it as local drop-in co-op plus the same Collection round the hub runs. 'Every feature in TASK.md' overlaps with the source's 'all mechanics', which leaves the scope open.",
    "• What was the hardest thing to do? Fitting a whole vertical slice into one session: the story with branching choices, a boss, a car, two minigames, local and online multiplayer, and the attract mode, all tested.",
    "• If there was one test you could have run, what would that test be? A long real-hardware session with a DualSense on a TV, to judge the 10-foot readability and how the controller feels. Automation can only fake the pad."
  ]],
  ['CREDITS', [
    'THE BARITONES: design, code, art direction, music, sound and writing by Claude Opus 5.5 (Anthropic) in Claude Code.',
    'Engine: my-3D2dge v0.85.1 by Michael Crosato (MIT License). Online: the AI Hub session protocol and client by Michael Crosato.',
    'Inspired by The Sopranos, created by David Chase for HBO. This is a tribute, not an adaptation: every name, line and note here is new.',
    'Thanks to the ducks.'
  ]]
];

/* ===== 99-start.js ===== */
/* ---- START: the handle for tests and tools, the boot, the first scene ---- */
game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: W.mode, place: W.place, ch: S.ch, step: S.step, cash: S.cash, respect: S.respect, family: S.family, stress: Math.round(S.stress), ammo: S.ammo,
    hero: hero() ? { x: Math.round(hero().x), y: Math.round(hero().y), hp: Math.round(hero().hp), car: !!hero().car, robe: hero().robe } : null, heroes: W.heroes.length,
    foes: W.foes.filter(f => !f.dead).length, talk: talk.open, mini: W.mini ? W.mini.kind : null, objective: W.objective ? W.objective.title : null, flags: Object.keys(S.flags).filter(k => S.flags[k]),
    collect: { t: Math.round(C.t), over: C.over, started: C.started }, view: game.view && game.view.id, errors: game.errors.length }),
  teleport(x, y) { const h = hero(); if (h) { h.x = x; h.y = y; h.vx = h.vy = 0; } },
  S, W, C, STORY, CHAPTERS, SHOPS, startChapter, spawnFoe, convoQ, talk, TOWN, BARRENS, DINER, OFFICE, game, autoFight, nearestUse, interactables, hero, panicAttack, stareDown, fixGlyphs, finishCollection, convoBusy, dropItem, AP, makeHero, addCollector, hitFoe, hurtHero, applyGlyphs,
  get touchLocked() { return touchLocked; }, set touchLocked(v) { touchLocked = v; }, get HUB() { return HUB; }
};
const firstScene = HUB ? 'hubwait' : 'title';
game.start({ scenes, scene: firstScene, boot: { title: 'THE BARITONES', steps: [
  ['Paving North Caldwell', () => mapOf(TOWN)], ['Planting the Pine Barrens', () => mapOf(BARRENS)], ['Booking the couch', () => mapOf(OFFICE)], ['Wiping down the booth', () => mapOf(DINER)]
] } });
if (HUB) Promise.resolve(game.booted).then(() => hubConnect());

})();
