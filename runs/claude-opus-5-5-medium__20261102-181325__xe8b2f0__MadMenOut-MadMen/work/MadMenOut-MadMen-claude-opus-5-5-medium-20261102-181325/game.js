/* ============================== GAME START ==============================
 * MAD MEN OUT: a spiritual successor to Mad Men (2007-2015), on my-3D2dge v0.85.1.
 * ======================================================================== */
(() => {
'use strict';
/* ===== 00-core.js ===== */
/* MAD MEN OUT — core: the game, its keys, settings, sound, voices, music, furniture, shared helpers.
 * A 1962 Madison Avenue adventure on my-3D2dge. Every module shares this IIFE's scope (build.mjs concatenates them). */
const E = My3D2dge, { px, clamp, lerp } = E;
const T = 16;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
const BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.getElementById;

/* ---- KEYS: an adventure's layout. WASD / stick move, E (or Space) interacts, Shift runs, Tab the deck, V the view ---- */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  interact: ['KeyE', 'KeyF', 'Space', 'Pad0'], run: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad10'], journal: ['Tab', 'KeyI', 'Pad3'],
  view: ['KeyV', 'Pad5'], pivot: ['KeyR', 'Pad2'],
  start: HUB ? ['Enter', 'NumpadEnter'] : ['Enter', 'NumpadEnter', 'Pad9'], pause: HUB ? ['Escape', 'KeyP'] : ['Escape', 'KeyP', 'Pad9'],   // (in an AI Hub session Create + Options is the hub's)
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyE', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyQ', 'Pad1']
};

/* ---- GAMEPAD AXIS FIX: about one pad in ten reports its stick (and sometimes d-pad) flipped. Settings, Controller:
 * Invert horizontal / Invert vertical. The engine reads navigator.getGamepads() every step; a wrapper flips what it sees ---- */
const PADFIX = { x: false, y: false };
if (typeof navigator !== 'undefined' && navigator.getGamepads && !navigator.__mmoWrapped) {
  const raw = navigator.getGamepads.bind(navigator);
  const flip = p => {
    if (!p || (!PADFIX.x && !PADFIX.y)) return p;
    const axes = Array.from(p.axes).map((v, i) => ((i === 0 || i === 2) && PADFIX.x) || ((i === 1 || i === 3) && PADFIX.y) ? -v : v);
    const b = Array.from(p.buttons), swap = (i, j) => { const t = b[i]; b[i] = b[j]; b[j] = t; };
    if (PADFIX.y && b.length > 13) swap(12, 13);
    if (PADFIX.x && b.length > 15) swap(14, 15);
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, axes, buttons: b, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { navigator.getGamepads = () => Array.from(raw() || []).map(flip); navigator.__mmoWrapped = true; } catch (e) { /* read-only navigator: no fix */ }
}

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#0b0a10', id: 'mad-men-out', input: KEYS,
  menu: {
    controls: { interact: 'Talk / use', run: 'Walk briskly', journal: 'The deck (insights)', view: 'Change camera view', pivot: 'Pivot (in a pitch)' },
    settings: [
      { key: 'padInvertX', group: 'Controller', label: 'Invert horizontal (stick, d-pad)', type: 'toggle', value: false, help: 'For controllers that report left and right the wrong way round', apply: (g, v) => { PADFIX.x = !!v; } },
      { key: 'padInvertY', group: 'Controller', label: 'Invert vertical (stick, d-pad)', type: 'toggle', value: false, help: 'For controllers that report up and down the wrong way round', apply: (g, v) => { PADFIX.y = !!v; } },
      { key: 'textSpeed', group: 'Game', label: 'Text speed', type: 'select', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']], value: 'normal' },
      { key: 'tells', group: 'Game', label: 'Client tells in pitches', type: 'toggle', value: true, help: 'Show a hint of what the client is feeling before each slide' },
      { key: 'meterAssist', group: 'Game', label: 'Wider delivery window', type: 'toggle', value: false, help: 'An easier timing meter in pitches' },
      { key: 'voices', group: 'Sound', label: 'Voices (gibberish)', type: 'toggle', value: true }
    ],
    quit: HUB ? false : 'title'
  }
});
const A = game.audio, L = game.lights, P = game.particles;
// PlayStation symbols unless the player chose otherwise (Settings, Controller, Button symbols: Xbox for A B X Y)
if (!E.store.get('mmo:glyphs-init', false)) { game.settings.set('glyphs', 'playstation'); E.store.set('mmo:glyphs-init', true); }
PADFIX.x = !!game.settings.padInvertX; PADFIX.y = !!game.settings.padInvertY;

/* ---- DEVICES: which prompts to show, and whether this is a touch-only device (no controller, no keyboard yet) ---- */
const DEV = { keySeen: false, padSeen: false, real: 0 };
const coarseOnly = () => BROWSER && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
const touchOnly = () => coarseOnly() && !DEV.keySeen && !DEV.padSeen;
if (BROWSER) {
  addEventListener('keydown', e => { DEV.keySeen = true; DEV.real = game.real || 1; if (e.code === 'Tab') e.preventDefault(); }, true);
  addEventListener('pointerdown', () => { DEV.real = game.real || 1; }, true);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') DEV.real = game.real || 1; }, true);
  addEventListener('wheel', () => { DEV.real = game.real || 1; }, true);
  addEventListener('gamepadconnected', () => { DEV.padSeen = true; });
}
// a real person's input (not the attract mode's autopilot): keys, the mouse, touches, or a gamepad's buttons and sticks
let padRest = true;
function realInputNow() {
  let hit = DEV.real > 0; DEV.real = 0;
  try {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let any = false;
    for (const p of pads || []) if (p) { DEV.padSeen = true; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) any = true; }
    if (any && padRest) hit = true;
    padRest = !any;
  } catch (e) { /* no gamepads */ }
  return hit;
}
const dev = () => game.input.lastDevice;
// the key or button for an action on the device used last; the mouse clicks things in the world
const key = a => dev() === 'mouse' && (a === 'interact' || a === 'confirm') ? 'Click' : dev() === 'touch' ? game.input.label(a, 'keyboard') : game.input.label(a);
const keyOf = (p, a) => p.lastDevice === 'mouse' && (a === 'interact' || a === 'confirm') ? 'Click' : p.label(a);

/* ---- GLYPHS: the pixel font has no PlayStation symbols; add ✕ ○ □ △ (and ✓ · —) to both fonts at runtime ---- */
(function addGlyphs() {
  if (!E.font || !E.font._f) return;
  const N = E.font._f({ font: 'normal' }).glyphs, Ty = E.font._f({ font: 'tiny' }).glyphs;
  const rows = s => { const R = s.split('|'), runs = []; R.forEach((r, y) => { for (let x = 0; x < r.length;) { if (r[x] !== '#') { x++; continue; } let n = 1; while (r[x + n] === '#') n++; runs.push([x, y, n]); x += n; } }); return { w: R[0].length, runs }; };
  const bits = b => { const runs = []; for (let k = 0; k < b.length; k++) if (b[k] === '1') runs.push([k % 3, (k / 3) | 0, 1]); return { w: 3, runs }; };
  const add = (ch, big, small) => { if (N && !N[ch]) N[ch] = rows(big); if (Ty && !Ty[ch]) Ty[ch] = bits(small); };
  add('✕', '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '000101010101000');
  add('○', '.....|.###.|#...#|#...#|#...#|.###.|.....', '000010101010000');
  add('□', '.....|#####|#...#|#...#|#...#|#####|.....', '000111101111000');
  add('△', '.....|..#..|..#..|.#.#.|.#.#.|#####|.....', '000010101111000');
  add('✓', '.....|....#|...#.|#..#.|.##..|..#..|.....', '000001101010000');
  add('·', '.|.|.|#|.|.|.', '000000010000000');
  add('—', '......|......|......|######|......|......|......', '000000111000000');
})();
/* ---- PALETTE and text helpers ---- */
const COL = {
  ink: '#f4ead8', dim: '#b8ab94', gold: '#e8c36a', red: '#d8483a', teal: '#5ab0a8', shadow: '#120c08', paper: '#f4eedd', paperInk: '#2a2420',
  panel: ['#2a2018', '#140e0a'], border: '#c8a868'
};
const ANGLES = {
  DESIRE: { name: 'DESIRE', icon: '♥', color: '#e0505a', dark: '#6a1a22', word: 'wanting' },
  STATUS: { name: 'STATUS', icon: '★', color: '#e8c050', dark: '#6a5014', word: 'standing' },
  NOSTALGIA: { name: 'NOSTALGIA', icon: '♪', color: '#d89a60', dark: '#5a3418', word: 'memory' },
  SAFETY: { name: 'SAFETY', icon: '•', color: '#6aa0e0', dark: '#1a3a6a', word: 'trust' },
  FREEDOM: { name: 'FREEDOM', icon: '→', color: '#70c878', dark: '#1a4a24', word: 'escape' }
};
const ANGLE_IDS = Object.keys(ANGLES);
const txt = (g, s, x, y, c = COL.ink, o = {}) => E.font.text(g, s, x, y, c, { shadow: COL.shadow, outline: false, ...o });
const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || COL.panel, border: o.border || COL.border, alpha: o.alpha, gradient: o.gradient });
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const clockStr = m => { const h = Math.floor(m / 60), mm = Math.floor(m % 60); const h12 = ((h + 11) % 12) + 1; return h12 + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
const wrap = (s, w, o) => E.font.wrap(s, w, o);
const hitRect = (p, x, y, w, h) => !!p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;

/* ---- SOUND: chip voices of our own (typewriter, ice, a phone's bell, applause) ---- */
A.define('type', { wave: 'noise', freq: 2400, to: 900, dur: .03, vol: .22 });
A.define('carriage', [{ wave: 'noise', freq: 1800, to: 400, dur: .12, vol: .2 }, { wave: 'triangle', freq: 'A6', dur: .18, vol: .18 }]);
A.define('ice', [{ wave: 'sine', freq: 2600, to: 2400, dur: .05, vol: .16 }, { wave: 'sine', freq: 3200, to: 3000, dur: .05, vol: .12, delay: .07 }]);
A.define('pour', { wave: 'noise', freq: 600, to: 1200, dur: .4, vol: .12 });
A.define('ring', { wave: 'square', freq: 'E6', dur: .5, vol: .09, vib: [24, .05] });
A.define('needle', { wave: 'triangle', freq: 'C6', dur: .04, vol: .14 });
A.define('perfect', { wave: 'square', freq: 'C5', dur: .3, vol: .15, arp: [0, 4, 7, 12], step: .05 });
A.define('good', { wave: 'triangle', freq: 'G4', dur: .18, vol: .16, arp: [0, 5], step: .06 });
A.define('flat', { wave: 'saw', freq: 'D3', to: 'A2', dur: .3, vol: .12 });
A.define('card', { wave: 'noise', freq: 900, to: 3000, dur: .07, vol: .14 });
A.define('elevator', { wave: 'sine', freq: 'E6', dur: .6, vol: .14, arp: [0, -4], step: .3 });
A.define('lighter', [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2 }, { wave: 'noise', freq: 300, to: 200, dur: .3, vol: .06, delay: .06 }]);
A.define('applause', { wave: 'noise', freq: 1400, to: 1100, dur: 1.2, vol: .14, vib: [18, .4] });
A.define('gasp', { wave: 'noise', freq: 800, to: 2400, dur: .25, vol: .1 });

/* ---- VOICES: Simlish-style gibberish. Each speaker has a pitch, a timbre and a lilt; each syllable of the text
 * blips a formant-ish chirp chosen by its letters, so the same line always "says" the same thing ---- */
const VOICES = {
  jack: { f: 118, wave: 'triangle', lilt: .16 }, monty: { f: 104, wave: 'square', lilt: .22 }, ruth: { f: 228, wave: 'triangle', lilt: .2 },
  dolores: { f: 196, wave: 'square', lilt: .25 }, theo: { f: 150, wave: 'saw', lilt: .14 }, eddie: { f: 140, wave: 'triangle', lilt: .3 },
  bell: { f: 92, wave: 'sine', lilt: .1 }, joyce: { f: 250, wave: 'square', lilt: .3 }, marcy: { f: 240, wave: 'triangle', lilt: .25 },
  lenny: { f: 128, wave: 'saw', lilt: .3 }, client: { f: 132, wave: 'square', lilt: .15 }, clientF: { f: 210, wave: 'triangle', lilt: .18 },
  narrator: null
};
let voiceOn = null, voiceShown = 0, voiceT = 0;
function speak(dlg) {   // call every step after dlg.update: blips for the letters typed since the last step
  if (!dlg.open) { voiceShown = 0; return; }
  const v = voiceOn && VOICES[voiceOn];
  if (dlg.shown < voiceShown) voiceShown = 0;
  if (!v || !game.settings.voices || !dlg.typing) { voiceShown = dlg.shown; return; }
  voiceT -= 1 / 120;
  if (dlg.shown > voiceShown && voiceT <= 0) {
    const page = (dlg.pages[dlg.i] || []).join(' '), ch = page.charCodeAt(dlg.shown - 1) || 97, ch2 = page.charCodeAt(dlg.shown) || 101;
    const k = ((ch * 7 + ch2 * 3) % 11) / 10, up = page[dlg.shown - 1] === '?' ? 1.25 : 1;
    A.sfx({ wave: v.wave, freq: v.f * (1 + v.lilt * (k - .4)) * up, to: v.f * (1 + v.lilt * (k - .6)) * up * .92, dur: .055, vol: v.wave === 'saw' ? .06 : .09, vib: [30, .02] }, { vary: .04 });
    voiceT = .075;
  }
  voiceShown = dlg.shown;
}
const textSpeed = () => ({ slow: 32, normal: 52, fast: 90 })[game.settings.textSpeed] || 52;

/* ---- MUSIC: cool jazz written in the engine's step notation ---- */
const SONGS = {
  lounge: { bpm: 96, steps: 2, tracks: [   // Dm7 G7 Cmaj7 A7: walking bass, comping, a vibraphone line, brushes
    { wave: 'triangle', vol: .3, notes: 'D2 - F2 - A2 - C3 - | G2 - B2 - D3 - F3 - | C2 - E2 - G2 - B2 - | A2 - C#3 - E3 - G3 - | D2 - A2 - F2 - C3 - | G2 - D3 - B2 - F2 - | C2 - G2 - E2 - B2 - | A2 - E2 - G2 - C#3 -' },
    { wave: 'square', vol: .045, notes: '. . F4 - - . . . | . . F4 - - . . . | . . E4 - - . . . | . . G4 - - . . . | . . F4 - . . F4 - | . . F4 - . . B3 - | . . E4 - . . G4 - | . . G4 - . . C#4 -' },
    { wave: 'square', vol: .04, notes: '. . C5 - - . . . | . . B4 - - . . . | . . B4 - - . . . | . . C#5 - - . . . | . . C5 - . . A4 - | . . B4 - . . D4 - | . . B4 - . . B4 - | . . E5 - . . A4 -' },
    { wave: 'sine', vol: .15, notes: 'A4 - - C5 D5 - - . | F5 - E5 D5 B4 - - . | E5 - - - D5 C5 B4 . | C#5 - E5 - - . . . | A4 - C5 - D5 F5 E5 D5 | B4 - - G4 - . . . | G4 B4 D5 - C5 - B4 . | A4 - - - . . . .' },
    { wave: 'drums', vol: .22, notes: 'h . h h s . h h | h . h h s . h h | h . h h s . h h | h . h h s . h o' }
  ] },
  pitch: { bpm: 112, steps: 2, tracks: [   // tension: a pedal and a rising figure
    { wave: 'triangle', vol: .32, notes: 'E2 . E2 E2 . E2 G2 . | E2 . E2 E2 . E2 A2 . | E2 . E2 E2 . E2 B2 . | C3 . B2 . A2 . G2 .' },
    { wave: 'square', vol: .05, notes: 'B3 - - - - - - - | C4 - - - - - - - | D4 - - - - - - - | E4 - - - D#4 - - -' },
    { wave: 'sine', vol: .1, notes: '. . E5 . . . G5 . | . . E5 . . . A5 . | . . F#5 . . . B5 . | C6 . B5 . A5 . G5 .' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h h | k . h k s . h . | k . h . s . h h | k k s . s s o .' }
  ] },
  evening: { bpm: 84, steps: 2, tracks: [   // a slow bossa under the city lights
    { wave: 'triangle', vol: .3, notes: 'C2 - . G2 C2 - . G2 | B1 - . F#2 B1 - . F#2 | A#1 - . F2 A#1 - . F2 | A1 - . E2 D2 - . A2' },
    { wave: 'square', vol: .04, notes: '. E4 . . E4 . . E4 | . D4 . . D4 . . D4 | . D4 . . D4 . . D4 | . C#4 . . C4 . . C4' },
    { wave: 'square', vol: .035, notes: '. B4 . . B4 . . B4 | . A4 . . A4 . . A4 | . G#4 . . G#4 . . G#4 | . G4 . . F#4 . . F#4' },
    { wave: 'sine', vol: .14, notes: 'G5 - - E5 - - D5 - | F#5 - - D5 - - C5 - | F5 - - D5 - - C5 A#4 | A4 - - - - - . .' },
    { wave: 'drums', vol: .16, notes: 'h . h s h . s h | h . h s h . s h' }
  ] },
  win: { bpm: 140, steps: 2, loop: false, tracks: [
    { wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - G5 - | C6 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 - G2 - C3 - E3 - | C3 - - - - - . .' },
    { wave: 'drums', vol: .2, notes: 'k . s . k k s . | c . . . . . . .' }
  ] },
  lose: { bpm: 80, steps: 2, loop: false, tracks: [
    { wave: 'triangle', vol: .2, notes: 'E4 - D4 - C4 - - - | B3 - - - - - . .' },
    { wave: 'triangle', vol: .28, notes: 'A2 - - - F2 - - - | E2 - - - - - . .' }
  ] }
};
let songNow = null;
const music = id => { if (HUB && hubState.ended) return; if (songNow === id) return; songNow = id; A.music(id ? SONGS[id] : null, { fade: .6 }); };

/* ---- MATERIALS and FURNITURE as data (docs/ASSETS.md): mid-century walnut, chrome, teal and orange upholstery ---- */
Object.assign(E.MATERIALS, {
  mmWalnut: '#6e4528 planks bw=3', mmTeak: '#9a6234 planks bw=4', mmChrome: '#b8c2cc metal', mmBlack: '#26242a glaze', mmCream: '#e8dcc0 none',
  mmTeal: '#3f8484 cloth', mmOrange: '#c8682a cloth', mmMustard: '#c8a038 cloth', mmRedVel: '#962a30 cloth', mmGlass: '#a8d4e4 glaze', mmGreenG: '#3a7a44 glaze',
  mmAmber: '#c8842a glaze', mmPaper: '#f4f0e2 none', mmBrass: '#c8a040 metal', mmLeaf: '#3f8a44 foliage', mmClay: '#b05a36 glaze', mmSteel: '#8a949e metal',
  mmCork: '#a8804a speck', mmLeather: '#5a3020 cloth fold=.4', mmWindow: '#86b8d8 tiles size=12', mmMarble: '#b8b0a2 none', mmWater: '#7ac0e8 glaze'
});
Object.assign(E.SHAPES, {
  mmDesk: { about: 'walnut executive desk, two pedestals, cream blotter', tags: 'office', mats: { w: 'mmWalnut', b: 'mmCream', m: 'mmBrass' },
    parts: [['box', 'w', [0, 0, 11], [28, 13, 2]], ['mirror', 'x', ['box', 'w', [9.5, 0, 0], [8, 12, 11]]], ['box', 'w', [0, -4, 3], [11, 1, 8]], ['box', 'b', [0, 1, 13], [10, 6, .5]], ['mirror', 'x', ['box', 'm', [9.5, 6.2, 7], [3, .5, 1]]]] },
  mmTypist: { about: 'steel secretary desk', tags: 'office', mats: { w: 'mmSteel', t: 'mmCream' },
    parts: [['box', 't', [0, 0, 11], [22, 11, 1.5]], ['box', 'w', [7, 0, 0], [7, 10, 11]], ['mirror', 'x', ['box', 'w', [-9.5, 4, 0], [1.5, 1.5, 11]], ['box', 'w', [-9.5, -4, 0], [1.5, 1.5, 11]]]] },
  mmTypewriter: { about: 'green typewriter with a sheet of paper', tags: 'office', mats: { g: 'mmGreenG', p: 'mmPaper', k: 'mmBlack' },
    parts: [['box', 'g', [0, 0, 0], [8, 6, 2.5]], ['box', 'k', [0, 1.5, 2.5], [7, 2.5, .8]], ['cyl', 'k', [0, -2, 3], 1, 1, {}], ['box', 'p', [0, -2.5, 3], [5, .3, 4]]] },
  mmPhone: { about: 'black desk telephone', tags: 'office', mats: { k: 'mmBlack' }, parts: [['box', 'k', [0, 0, 0], [4, 4, 1.5]], ['box', 'k', [0, 0, 1.5], [5, 1.5, 1]]] },
  mmDeskLamp: { about: 'brass desk lamp, green shade', tags: 'office light', mats: { m: 'mmBrass', s: 'mmGreenG' }, lights: [[0, 3, 4, '#ffd890', 46]],
    parts: [['cyl', 'm', [0, 0, 0], 2, .8], ['cyl', 'm', [0, 0, .8], .5, 6], ['box', 's', [0, 1.5, 6.5], [5, 4, 2]]] },
  mmChair: { about: 'black leather swivel chair, chrome base', tags: 'office', mats: { l: 'mmLeather', c: 'mmChrome' },
    parts: [['ring', 5, 3.5, ['box', 'c', [0, 0, 0], [1, 4, 1]]], ['cyl', 'c', [0, 0, 1], .8, 5], ['box', 'l', [0, 0, 6], [9, 9, 2.5]], ['box', 'l', [0, -4, 8.5], [9, 2, 9]]] },
  mmSofa: { about: 'mid-century sofa on tapered legs', tags: 'office lounge', mats: { c: 'mmTeal', w: 'mmTeak' },
    parts: [['mirror', 'xy', ['box', 'w', [14, 4, 0], [1.2, 1.2, 3.5]]], ['box', 'w', [0, 0, 3.5], [32, 12, 1.5]], ['box', 'c', [0, 1, 5], [30, 10, 3.5]], ['box', 'c', [0, -5, 7], [32, 2.5, 8]], ['mirror', 'x', ['box', 'c', [15, 0, 5], [2.5, 12, 5]]]] },
  mmArmchair: { about: 'orange lounge armchair', tags: 'office lounge', mats: { c: 'mmOrange', w: 'mmTeak' },
    parts: [['mirror', 'xy', ['box', 'w', [5, 4, 0], [1.2, 1.2, 3.5]]], ['box', 'c', [0, 1, 3.5], [13, 11, 4]], ['box', 'c', [0, -5, 6], [13, 2.5, 9]], ['mirror', 'x', ['box', 'c', [6, 0, 6], [2, 11, 3]]]] },
  mmBarCart: { about: 'chrome bar cart, decanters and an ice bucket', tags: 'office bar', mats: { c: 'mmChrome', g: 'mmGlass', a: 'mmAmber', k: 'mmGreenG' },
    parts: [['mirror', 'xy', ['cyl', 'c', [6, 3, 0], .6, 13]], ['box', 'g', [0, 0, 5], [14, 8, .6]], ['box', 'g', [0, 0, 12], [14, 8, .6]], ['cyl', 'a', [-3.5, 0, 12.6], 1.6, 5, { r2: 1 }], ['cyl', 'k', [0, 1, 12.6], 1.3, 6, { r2: .6 }], ['cyl', 'c', [4, -1, 12.6], 1.8, 2.5], ['cyl', 'a', [3, 1, 5.6], 1.5, 4]] },
  mmConfTable: { about: 'long walnut conference table', tags: 'office', mats: { w: 'mmWalnut', c: 'mmChrome' },
    parts: [['box', 'w', [0, 0, 11], [84, 26, 2]], ['mirror', 'x', ['box', 'w', [28, 0, 0], [6, 14, 11]]]] },
  mmCredenza: { about: 'low walnut credenza with sliding doors', tags: 'office', mats: { w: 'mmWalnut', b: 'mmBrass' },
    parts: [['box', 'w', [0, 0, 2], [34, 10, 11]], ['mirror', 'x', ['box', 'w', [15, 0, 0], [1.5, 8, 2]]], ['mirror', 'x', ['box', 'b', [4, 5.1, 7], [1, .4, 3]]]] },
  mmPlant: { about: 'rubber plant in a terracotta pot', tags: 'office plant', mats: { p: 'mmClay', l: 'mmLeaf' },
    parts: [['cyl', 'p', [0, 0, 0], 3.5, 6, { r2: 4.5 }], ['ball', 'l', [0, 0, 11], 5], ['ball', 'l', [-2.5, 1, 16], 4], ['ball', 'l', [2.5, -1, 19], 3.5], ['ball', 'l', [0, 0, 22], 3]] },
  mmCooler: { about: 'office water cooler', tags: 'office', mats: { w: 'mmCream', g: 'mmWater', k: 'mmSteel' },
    parts: [['box', 'w', [0, 0, 0], [8, 8, 17]], ['cyl', 'g', [0, 0, 17], 3.5, 9, { r2: 2.8 }], ['box', 'k', [0, 4.2, 12], [3, .6, 2]]] },
  mmFiling: { about: 'grey steel filing cabinet, four drawers', tags: 'office', mats: { s: 'mmSteel', h: 'mmChrome' },
    parts: [['box', 's', [0, 0, 0], [10, 12, 24]], ['row', 4, [0, 0, 5.8], ['box', 'h', [0, 6.1, 11], [3, .4, 1]]]] },
  mmEasel: { about: 'presentation easel with a mounted board', tags: 'office', mats: { w: 'mmTeak', b: 'mmPaper' },
    parts: [['mirror', 'x', ['box', 'w', [6, 0, 0], [1.2, 1.2, 30], { rot: [0, -6, 0] }]], ['box', 'w', [0, -3, 0], [1.2, 1.2, 28], { rot: [10, 0, 0] }], ['box', 'w', [0, .8, 12], [16, 2, 1]], ['box', 'b', [0, 1.4, 13], [16, .8, 18]]] },
  mmDrafting: { about: 'drafting table with a tilted board', tags: 'office art', mats: { w: 'mmTeak', b: 'mmPaper', c: 'mmChrome' },
    parts: [['mirror', 'x', ['box', 'c', [7, 0, 0], [1, 10, 13]]], ['box', 'b', [0, 0, 13], [18, 12, 1], { rot: [18, 0, 0] }], ['box', 'w', [0, 6, 13], [18, 1, 1.5]]] },
  mmReception: { about: 'curved walnut reception desk with a marble top', tags: 'office', mats: { w: 'mmWalnut', m: 'mmMarble' },
    parts: [['box', 'w', [0, 0, 0], [40, 10, 13]], ['box', 'm', [0, 0, 13], [42, 11, 1.5]], ['mirror', 'x', ['box', 'w', [20, -6, 0], [8, 10, 13], { rot: 30 }]]] },
  mmClock: { about: 'tall walnut longcase clock', tags: 'office antique', mats: { w: 'mmWalnut', f: 'mmCream', b: 'mmBrass' },
    parts: [['box', 'w', [0, 0, 0], [10, 7, 34]], ['box', 'w', [0, 0, 34], [12, 8, 9]], ['cyl', 'f', [0, 3.6, 38], 3.5, .5, { rot: [90, 0, 0] }], ['cyl', 'b', [0, 3.6, 14], 2.2, .5, { rot: [90, 0, 0] }]] },
  mmBonsai: { about: 'bonsai on a black lacquer stand', tags: 'office plant', mats: { k: 'mmBlack', p: 'mmClay', l: 'mmLeaf', t: 'mmLeather' },
    parts: [['box', 'k', [0, 0, 0], [10, 8, 10]], ['box', 'p', [0, 0, 10], [7, 5, 2]], ['cyl', 't', [0, 0, 12], .8, 4], ['ball', 'l', [-1.5, 0, 16.5], 3, { sz: .6 }], ['ball', 'l', [2, .5, 15.5], 2.5, { sz: .6 }]] },
  mmCounter: { about: 'kitchen counter with a percolator', tags: 'office kitchen', mats: { w: 'mmCream', t: 'mmSteel', k: 'mmChrome', m: 'mmBlack' },
    parts: [['box', 'w', [0, 0, 0], [30, 11, 13]], ['box', 't', [0, 0, 13], [31, 12, 1]], ['cyl', 'k', [-8, 0, 14], 2, 6, { r2: 1.4 }], ['cyl', 'm', [-8, 0, 20], .8, 1.5], ['row', 3, [3, 0, 0], ['cyl', 'w', [6, 1, 14], 1, 2]]] },
  mmCoffeeTable: { about: 'low teak coffee table with magazines', tags: 'office lounge', mats: { w: 'mmTeak', p: 'mmPaper', r: 'mmRedVel' },
    parts: [['mirror', 'xy', ['box', 'w', [8, 4, 0], [1.2, 1.2, 5]]], ['box', 'w', [0, 0, 5], [20, 10, 1.2]], ['box', 'p', [-3, 0, 6.2], [6, 7, .6], { rot: 12 }], ['box', 'r', [3, 1, 6.2], [6, 7, .6], { rot: -8 }]] },
  mmBookcase: { about: 'walnut bookcase of bound volumes', tags: 'office', mats: { w: 'mmWalnut', a: 'mmRedVel', b: 'mmGreenG', c: 'mmMustard' },
    parts: [['box', 'w', [0, 0, 0], [24, 8, 30]], ['row', 3, [0, 0, 9], ['group', [0, 0, 3], 0, [['box', 'a', [-6, 1, 0], [9, 6, 6]], ['box', 'b', [3, 1, 0], [6, 6, 5]], ['box', 'c', [8.5, 1, 0], [4, 6, 6.5]]]]]] },
  mmStool: { about: 'chrome bar stool, red seat', tags: 'bar', mats: { c: 'mmChrome', r: 'mmRedVel' }, parts: [['cyl', 'c', [0, 0, 0], 3, .6], ['cyl', 'c', [0, 0, .6], .7, 11], ['cyl', 'r', [0, 0, 11.5], 3.5, 2]] },
  mmBar: { about: 'long bar counter, mahogany and brass rail', tags: 'bar', mats: { w: 'mmRedVel', t: 'mmWalnut', b: 'mmBrass' },
    parts: [['box', 'w', [0, 0, 0], [96, 12, 16]], ['box', 't', [0, 0, 16], [98, 14, 1.5]], ['box', 'b', [0, 7.5, 3], [96, .8, .8]]] },
  mmShelfBottles: { about: 'back bar shelves of bottles', tags: 'bar', mats: { w: 'mmWalnut', a: 'mmAmber', g: 'mmGreenG', c: 'mmGlass' },
    parts: [['box', 'w', [0, 0, 0], [96, 6, 40]], ['row', 2, [0, 0, 12], ['row', 12, [8, 0, 0], ['group', [0, 2, 16], 0, [['cyl', 'a', [-2, 0, 0], 1.3, 6, { r2: .7 }], ['cyl', 'g', [1.5, 0, 0], 1.2, 7, { r2: .6 }]]]]]] },
  mmHatStand: { about: 'coat stand with a fedora', tags: 'office', mats: { w: 'mmWalnut', h: 'mmBlack' },
    parts: [['ring', 3, 3, ['box', 'w', [0, 0, 0], [1, 4, 1]]], ['cyl', 'w', [0, 0, 0], .7, 30], ['cyl', 'h', [1.5, 0, 29], 3.2, .6], ['cyl', 'h', [1.5, 0, 29.6], 2, 2.2, { r2: 1.8 }]] }
});

/* ---- shared state of a campaign (saved at the start of each day) ---- */
const S = {};
function newCampaign() {
  Object.assign(S, { day: 0, composure: 80, haze: 0, billings: 0, won: [], results: [], rapport: { ruth: 0, monty: 0, dolores: 0, theo: 0, eddie: 0, bell: 0 },
    flags: {}, deck: [], insights: [], intel: [], minute: 540, pitchAt: 900, talked: {}, used: {}, demo: false });
}
newCampaign();
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(S)), place: 'Bellweather & Crane, 405 Madison Ave.', level: 'Day ' + (S.day + 1) });
game.saves.read = save => { newCampaign(); Object.assign(S, JSON.parse(JSON.stringify(save.data))); };
const hasSave = () => { try { return !!game.saves.latest(); } catch (e) { return false; } };

/* ===== 10-data.js ===== */
/* MAD MEN OUT — data: the cast, the clients, the insights and three days at Bellweather & Crane.
 * Everything a designer changes lives here as plain data: add a day, a client, a card or a line without touching code. */

/* ---- THE CAST: HD rigs in suits and dresses of 1962 ---- */
const SUIT = (coat, pants, shirt, tie, o = {}) => ({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', ...o,
  colors: { skin: '#f0c8a4', coat, pants, cloth: coat, trim: shirt, belt: tie, boot: '#141012', glove: '#f0c8a4', ...(o.colors || {}) } });
const DRESS = (cloth, hair, o = {}) => ({ size: 1.22, build: 'heroic', weapon: null, outfit: 'robe', sleeves: o.sleeves || 'short', hair: o.hair || 'long', face: { bangs: o.bangs || .5 }, ...o,
  colors: { skin: '#f4cca8', hair, cloth, pants: cloth, trim: o.trim || '#f4ecd8', belt: o.belt || '#1a1414', boot: '#2a1a1a', ...(o.colors || {}) } });
const CAST = {
  jack: { name: 'JACK CALLOWAY', voice: 'jack', rig: () => new E.Humanoid(SUIT('#2e3238', '#2a2d32', '#f2f0ea', '#1e2a3a', { hair: 'short', colors: { hair: '#1e1610' } })) },
  monty: { name: 'MONTY CRANE', voice: 'monty', rig: () => new E.Humanoid(SUIT('#3a4458', '#343c4e', '#f4f2ec', '#8a2a2a', { hair: 'short', colors: { hair: '#e8e4dc', skin: '#f0c0a0' } })) },
  ruth: { name: 'RUTH KOWALSKI', voice: 'ruth', rig: () => new E.Humanoid(DRESS('#b08a3a', '#6a4020', { hair: 'ponytail', bangs: .9, sleeves: 'long', trim: '#5a3a20', colors: { skin: '#f6d2b0' } })) },
  dolores: { name: 'DOLORES FITCH', voice: 'dolores', rig: () => new E.Humanoid(DRESS('#a82838', '#d86a2a', { hair: 'long', bangs: .3, trim: '#e8c860', belt: '#e8c860' })) },
  theo: { name: 'THEO BARROW', voice: 'theo', rig: () => new E.Humanoid(SUIT('#4a6a8a', '#3a5470', '#f4f2ec', '#c8a040', { hair: 'short', size: 1.24, colors: { hair: '#8a6a3a' } })) },
  eddie: { name: 'EDDIE LAURENT', voice: 'eddie', rig: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short',
    colors: { skin: '#e8bc94', hair: '#2a1a12', cloth: '#e8e0cc', pants: '#5a4a3a', trim: '#7a2a2a', belt: '#2a1a12', boot: '#2a1a12' } }) },
  bell: { name: 'MR. BELLWEATHER', voice: 'bell', rig: () => new E.Humanoid(SUIT('#5a5248', '#4a443c', '#f4f0e4', '#2a4a2a', { hair: 'bald', hunch: .3, colors: { hair: '#d8d4cc', skin: '#ecc4a4' } })) },
  joyce: { name: 'JOYCE', voice: 'joyce', rig: () => new E.Humanoid(DRESS('#4a8a8a', '#e8c870', { hair: 'short', bangs: 1 })) },
  marcy: { name: 'MARCY', voice: 'marcy', rig: () => new E.Humanoid(DRESS('#c87aa0', '#3a2418', { hair: 'ponytail', bangs: .7 })) },
  peg: { name: 'PEG', voice: 'marcy', rig: () => new E.Humanoid(DRESS('#5a6aa8', '#a86a3a', { hair: 'long', bangs: .4 })) },
  lenny: { name: 'LENNY DORSETT', voice: 'lenny', rig: () => new E.Humanoid({ size: 1.26, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#4a3a2a' },
    colors: { skin: '#e8b890', hair: '#5a3a22', coat: '#6a5a3a', pants: '#4a4232', cloth: '#c8b890', trim: '#6a2a1a', boot: '#2a1a12' } }) },
  // clients
  marchand: { name: 'MRS. MARCHAND', voice: 'clientF', rig: () => new E.Humanoid(DRESS('#1e1e28', '#e8dcc8', { hair: 'short', bangs: .2, sleeves: 'long', trim: '#f4f0f0', colors: { skin: '#f2cdb0' } })) },
  hale: { name: 'MR. HALE', voice: 'client', rig: () => new E.Humanoid(SUIT('#5a6068', '#4a5058', '#e8f0f4', '#2a4a8a', { hair: 'short', colors: { hair: '#4a3a2a' } })) },
  pruitt: { name: 'MR. PRUITT', voice: 'monty', rig: () => new E.Humanoid(SUIT('#3a3a3a', '#323232', '#f4f4f0', '#6a1a2a', { hair: 'bald', build: 'bulky', size: 1.28, colors: { hair: '#c8c0b0' } })) },
  august: { name: 'AUGUST KESSLER', voice: 'bell', rig: () => new E.Humanoid(SUIT('#4a3a2e', '#3e3228', '#f0ece0', '#5a1a1a', { hair: 'short', hunch: .25, colors: { hair: '#f0ece4' } })) },
  rolf: { name: 'ROLF KESSLER', voice: 'theo', rig: () => new E.Humanoid(SUIT('#2a4a4a', '#223c3c', '#f4f4ee', '#e8a040', { hair: 'spiky', colors: { hair: '#e0c070' } })) },
  // the Pitch Gauntlet's clients (AI Hub and the two-player Pitch-Off)
  gC1: { name: 'MR. OKAFOR', voice: 'client', rig: () => new E.Humanoid(SUIT('#3a3a52', '#30304a', '#f4f4f0', '#c8a040', { hair: 'short', colors: { skin: '#8a5a3a', hair: '#1a1210', glove: '#8a5a3a' } })) },
  gC2: { name: 'MISS VALE', voice: 'clientF', rig: () => new E.Humanoid(DRESS('#2a7a6a', '#1a1414', { hair: 'long', bangs: .8 })) },
  gC3: { name: 'MR. DUBOIS', voice: 'client', rig: () => new E.Humanoid(SUIT('#6a4a3a', '#5a3e30', '#f0ece0', '#2a2a2a', { hair: 'short', colors: { hair: '#8a8a8a' } })) }
};
const rigs = {};
const rigOf = id => rigs[id] || (rigs[id] = CAST[id].rig());

/* ---- INSIGHTS: each a card with an angle (what it sells), a power (1-3) and the line it adds to the tagline ---- */
const CARDS = {
  // Monday: Belle Rouge
  signature: { title: 'Her Own Signature', angle: 'FREEDOM', power: 3, line: 'Make your mark.', from: 'Ruth', text: 'A woman puts on lipstick for herself. It is the one thing in her day that nobody else writes.' },
  stopsign: { title: 'Red Like a Stop Sign', angle: 'DESIRE', power: 2, line: 'Stop traffic.', from: 'Eddie', text: 'Eddie\'s sketch: a mouth in Belle Rouge red, and every car on Fifth Avenue braking.' },
  pearls: { title: 'Pearls in Every Picture', angle: 'STATUS', power: 1, line: 'As worn on Fifth Avenue.', from: 'A magazine', text: 'Every woman in Ladies\' Home Monthly wears pearls. They all look like they own the building.' },
  powder: { title: 'The Powder Room', angle: 'FREEDOM', power: 2, line: 'Five minutes that are yours.', from: 'Overheard', text: 'The girls touch up in the powder room. It is the only door in the building they can lock.' },
  vanity: { title: 'Mother\'s Vanity', angle: 'NOSTALGIA', power: 2, line: 'Like your mother wore it, only braver.', from: 'Monty', text: 'Monty remembers his mother\'s vanity table: a lipstick, a hand mirror, and a woman he never met.' },
  crossing: { title: 'Against the Light', angle: 'DESIRE', power: 1, line: 'Cross against the light.', from: 'The window', text: 'Down on Madison, a woman in red crosses against the light. Three cabs stop for her.' },
  smudge: { title: 'Won\'t Smudge', angle: 'SAFETY', power: 2, line: 'Stays on until midnight.', from: 'Theo', text: 'Theo\'s research: the long-wear formula tested best. Women want it to last.' },
  // Wednesday: Skylark Airways
  window: { title: 'The Window Seat', angle: 'NOSTALGIA', power: 2, line: 'Bring the whole family home.', from: 'Ruth', text: 'A child with her nose to the window, waving at a town that is waving back.' },
  wings: { title: 'Silver Wings', angle: 'STATUS', power: 2, line: 'First class is a state of mind.', from: 'Eddie', text: 'Eddie\'s sketch: a wing like a cufflink, catching the sun over the clouds.' },
  calm: { title: 'The Stewardess\'s Calm', angle: 'SAFETY', power: 3, line: 'Relax. We have it from here.', from: 'Joyce', text: 'Joyce\'s sister flies for Pan Am. The trick, she says, is to smile as if nothing could ever go wrong.' },
  hands: { title: 'A Pilot\'s Hands', angle: 'SAFETY', power: 2, line: 'Steady hands since 1946.', from: 'Mr. Bellweather', text: 'Bellweather flew bombers in the war. "A good pilot\'s hands never shake. Not once."' },
  martini: { title: 'Martini at 30,000 Feet', angle: 'DESIRE', power: 2, line: 'Cocktails above the clouds.', from: 'Monty', text: 'Monty\'s idea of flying: a stiff drink and a long view, and nobody can call you.' },
  contrail: { title: 'Contrails', angle: 'FREEDOM', power: 2, line: 'Go anywhere. Go tonight.', from: 'The window', text: 'A white line drawn across the blue, as if someone just signed the sky.' },
  oldname: { title: 'An Old Name', angle: 'NOSTALGIA', power: 3, line: 'Wherever home is, we know the way.', from: 'Lenny', text: 'Lenny remembered the farmhouse, the creek, the boy you were. Home is a word you have to earn.' },
  // Friday: Kessler Motors
  openroad: { title: 'The Open Road', angle: 'FREEDOM', power: 3, line: 'Leave the city behind.', from: 'Ruth', text: 'Ruth\'s brother drove to California with forty dollars and a Kessler. He never came back. He sends postcards.' },
  ruthline: { title: 'Ruth\'s Headline', angle: 'DESIRE', power: 3, line: 'Built to be looked at.', from: 'Ruth', text: 'Ruth slipped a page under your door: three words, underlined twice.' },
  chrome: { title: 'Chrome Smile', angle: 'DESIRE', power: 2, line: 'It smiles back at the street.', from: 'Eddie', text: 'Eddie drew the grille as a grin. Even the hubcaps look pleased with themselves.' },
  barn: { title: 'The Barn in 1919', angle: 'NOSTALGIA', power: 3, line: 'Made by hand since 1919.', from: 'Mr. Bellweather', text: 'Bellweather knew August Kessler when the factory was a barn and the car was a bet.' },
  doctor: { title: 'The Doctor\'s Driveway', angle: 'STATUS', power: 2, line: 'The car in the doctor\'s driveway.', from: 'Theo', text: 'Theo\'s dealer figures: Kesslers sell to doctors, lawyers, and the men who want to be mistaken for them.' },
  hotrod: { title: 'Ninety on the Turnpike', angle: 'FREEDOM', power: 2, line: 'Ninety on an empty highway.', from: 'A magazine', text: 'Hot Rod Monthly: the boys strip the chrome off and race them at dawn.' },
  father: { title: 'My Father\'s Car', angle: 'NOSTALGIA', power: 2, line: 'Your father\'s handshake. Your own road.', from: 'Overheard', text: 'Peg, to Marcy: "My dad had one. He let me steer it once, in the church lot."' },
  turnpike: { title: 'Rush Hour', angle: 'SAFETY', power: 1, line: 'Tested on the Turnpike.', from: 'The window', text: 'Bumper to bumper on Park Avenue. Nobody honks at a Kessler.' },
  // the Pitch Gauntlet's pool
  g1: { title: 'Sunday Morning', angle: 'NOSTALGIA', power: 2, line: 'Like Sunday morning, every morning.' },
  g2: { title: 'The Corner Office', angle: 'STATUS', power: 2, line: 'For the man who has arrived.' },
  g3: { title: 'Midnight Swim', angle: 'FREEDOM', power: 2, line: 'Nobody has to know.' },
  g4: { title: 'Locked and Bolted', angle: 'SAFETY', power: 2, line: 'Sleep through the night.' },
  g5: { title: 'A Second Look', angle: 'DESIRE', power: 2, line: 'Worth turning around for.' },
  g6: { title: 'Grandmother\'s Recipe', angle: 'NOSTALGIA', power: 3, line: 'The way it was always made.' },
  g7: { title: 'The Country Club', angle: 'STATUS', power: 3, line: 'Membership has its rewards.' },
  g8: { title: 'Highway West', angle: 'FREEDOM', power: 3, line: 'Keep driving.' },
  g9: { title: 'The Family Doctor', angle: 'SAFETY', power: 3, line: 'Trusted in every house on the street.' },
  g10: { title: 'Red Dress', angle: 'DESIRE', power: 3, line: 'Make them wonder.' },
  g11: { title: 'Small Town Parade', angle: 'NOSTALGIA', power: 1, line: 'Remember the parade?' },
  g12: { title: 'Seat at the Table', angle: 'STATUS', power: 1, line: 'You belong here.' }
};
const INTEL = {
  marchand: { title: 'The Pearls Were Hers', text: 'Dolores: Mrs. Marchand started Belle Rouge on her kitchen table the year her husband walked out. She wants FREEDOM, not a man\'s idea of desire.', reveals: { FREEDOM: 2 } },
  landing: { title: 'Emergency Landing', text: 'Theo\'s paper: a Skylark Electra came down hard in Ohio on Monday. Nobody hurt. Hale will want SAFETY, and adventure will frighten him.', reveals: { SAFETY: 2, FREEDOM: -1 } },
  pruitt: { title: 'Pruitt\'s Daughters', text: 'Monty: old Pruitt has five grandchildren and never stops showing their pictures. Families flying home: NOSTALGIA.', reveals: { NOSTALGIA: 1 } },
  august: { title: 'The Old Man\'s Pride', text: 'Monty: August Kessler built the first car in a barn in 1919. He wants STATUS earned and NOSTALGIA honored.', reveals: { STATUS: 1, NOSTALGIA: 2 } },
  rolf: { title: 'Rolf Races', text: 'Dolores: young Rolf races at Watkins Glen on weekends. He wants FREEDOM and DESIRE, and he is bored stiff by SAFETY.', reveals: { FREEDOM: 2, DESIRE: 1, SAFETY: -1 } }
};

/* ---- THE CLIENTS: wants per angle (2 = what they need, -1 = what puts them off), how many points win them, what the
 * account bills, the tells before a slide, and the turn some take mid-pitch ---- */
const CLIENTS = {
  belle: { company: 'Belle Rouge Cosmetics', product: 'Belle Rouge No. 9 lipstick', people: ['marchand'], value: 400000, need: 60,
    brief: 'A lipstick for the modern woman. The client says "make men look twice."',
    wants: { FREEDOM: 2, DESIRE: 1, STATUS: 1, NOSTALGIA: 0, SAFETY: -1 },
    tells: ['Mrs. Marchand turns a ring on her right hand. Not a wedding ring. Not anymore.', 'She glances at the door, as if someone might come in and tell her what to do.', 'She taps her own business card on the table. Her name, not her husband\'s.'],
    hello: ['Mr. Calloway. Everyone tells me what women want. I\'m hoping you won\'t.'], yes: 'Well. You made me feel like I signed something. We have a deal.', no: 'It\'s very nice. It\'s very much what my husband would have bought. Good afternoon.' },
  skylark: { company: 'Skylark Airways', product: 'Skylark\'s new jet service', people: ['hale', 'pruitt'], value: 1200000, need: 68,
    brief: 'Jet service to eleven cities. The client says "sell the glamour of the jet age."',
    wants: { SAFETY: 2, STATUS: 1, NOSTALGIA: 0, DESIRE: 0, FREEDOM: -1 }, turn: { after: 1, who: 'pruitt', line: 'Hale\'s worried about Ohio. I\'m worried about families. Who flies home for Thanksgiving?', wants: { NOSTALGIA: 2 } },
    tells: ['Mr. Hale folds the newspaper so the front page faces down.', 'Mr. Pruitt shows Hale a photograph from his wallet. Hale nods without looking.', 'Hale grips the arm of his chair the way men do at take-off.'],
    hello: ['Let\'s keep this short, Calloway. We have the press at five.', 'Gordon\'s nervous. I\'m not. Show us something.'], yes: 'That\'s it. That\'s the feeling. Draw up the papers.', no: 'Glamour. Fine. We\'ll think about it. Don\'t call us.' },
  kessler: { company: 'Kessler Motors', product: 'the 1963 Kessler Constellation', people: ['august', 'rolf'], value: 3000000, need: 74,
    brief: 'The new Constellation sedan. Father and son disagree about everything, including this.',
    wants: { STATUS: 1, NOSTALGIA: 2, FREEDOM: 1, DESIRE: 1, SAFETY: -1 }, split: { august: { STATUS: 2, NOSTALGIA: 2, FREEDOM: 0, DESIRE: 0, SAFETY: 1 }, rolf: { FREEDOM: 2, DESIRE: 2, NOSTALGIA: 0, STATUS: 0, SAFETY: -1 } },
    tells: ['August Kessler studies his own hands. They built the first one.', 'Rolf drums his fingers on the table at highway speed.', 'Father and son have not looked at each other since they sat down.'],
    hello: ['My son thinks your agency is old-fashioned, Mr. Calloway.', 'I think your agency is old-fashioned. Prove me wrong.'], yes: 'You got us both to nod at the same time. That hasn\'t happened since 1949. Shake my hand.', no: 'We\'ll take the account to Chicago. They speak plainly there.' },
  // the gauntlet
  gA: { company: 'Okafor Coffee Co.', product: 'Okafor Instant Coffee', people: ['gC1'], value: 500000, need: 60, wants: { NOSTALGIA: 2, SAFETY: 1, STATUS: 0, DESIRE: 0, FREEDOM: -1 },
    tells: ['Mr. Okafor sniffs the coffee on the table and smiles at something far away.'], hello: ['Coffee is a ritual, Mr. Calloway. Sell me the ritual.'], yes: 'A ritual. Yes. Let\'s do it.', no: 'That\'s an advertisement. I wanted a reason.' },
  gB: { company: 'Vale Swimwear', product: 'the Vale two-piece', people: ['gC2'], value: 700000, need: 62, wants: { FREEDOM: 2, DESIRE: 1, STATUS: 0, NOSTALGIA: -1, SAFETY: 0 },
    tells: ['Miss Vale kicks off one shoe under the table.'], hello: ['My mother says this swimsuit is a scandal. Good.'], yes: 'Scandalous. Perfect.', no: 'You sound like my mother.' },
  gC: { company: 'Dubois Locks', product: 'the Dubois deadbolt', people: ['gC3'], value: 450000, need: 60, wants: { SAFETY: 2, STATUS: 1, NOSTALGIA: 0, DESIRE: -1, FREEDOM: 0 },
    tells: ['Mr. Dubois checks that the door is shut behind him.'], hello: ['Every night I check the locks twice. Tell me why.'], yes: 'I will sleep well tonight. Agreed.', no: 'I don\'t trust it.' },
  gD: { company: 'Atlas Cigars', product: 'Atlas Maduro cigars', people: ['gC1'], value: 650000, need: 64, wants: { STATUS: 2, NOSTALGIA: 1, DESIRE: 0, SAFETY: -1, FREEDOM: 0 },
    tells: ['He rolls an unlit cigar between finger and thumb.'], hello: ['A cigar is a reward. For what, Mr. Calloway?'], yes: 'Light one up. We\'re in business.', no: 'You sell it like gum.' },
  gE: { company: 'Starlight Television', product: 'the Starlight color set', people: ['gC2'], value: 900000, need: 66, wants: { DESIRE: 2, STATUS: 1, FREEDOM: 0, NOSTALGIA: 0, SAFETY: 0 },
    tells: ['She keeps glancing at the gray screen in the corner.'], hello: ['Color television. Make them need it.'], yes: 'I can see it already. In color.', no: 'Black and white thinking.' },
  gF: { company: 'Dubois Insurance', product: 'family life insurance', people: ['gC3'], value: 800000, need: 64, wants: { SAFETY: 2, NOSTALGIA: 1, STATUS: 0, DESIRE: -1, FREEDOM: -1 },
    tells: ['He turns his wedding ring around and around.'], hello: ['Nobody wants to think about dying. Make them.'], yes: 'You made me call my wife. Signed.', no: 'Too cheerful. Too cheap.' }
};

/* ---- THE DAYS: a client, the clock, who stands where, what they say, what can be looked at, and what happens when ---- */
// spots are cells on the office map (20-office.js): [cx, cy, facing]; talk: the conversation (once a day: it takes the
// clock forward); idle: what they say after that. A choice's effect: { rapport, composure, card, intel, flag, minutes, haze }
const DAYS = [
  { id: 'monday', title: 'MONDAY', subtitle: 'The Lipstick Question', date: 'Monday, October 8, 1962', client: 'belle', start: 540, pitchAt: 900,
    morning: [['dolores', 'Mr. Calloway. Belle Rouge is coming at three. Mrs. Marchand herself. Mr. Crane would like a campaign, not a philosophy.'],
      ['jack', 'Then I\'d better find one. Who\'s in?'], ['dolores', 'Everyone you need, and a few you don\'t. Talk to them. Look around. The clock is ticking, and so am I.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['They say Mrs. Marchand wears pearls to bed.', 'Do you want gossip, Mr. Calloway, or do you want to win?'], choices: [
        { label: 'I want to win.', lines: [['dolores', 'Then here is something real. She built Belle Rouge on her kitchen table, the year her husband walked out.'], ['dolores', 'Every man who has pitched her since has sold her a husband. Don\'t.']], fx: { intel: 'marchand', rapport: 1, minutes: 30 } },
        { label: 'Gossip is how this town wins.', lines: [['dolores', 'Then you\'ll lose like everyone else. Charmingly, I\'m sure.']], fx: { rapport: -1, minutes: 15 } }] },
        idle: ['Three o\'clock, Mr. Calloway. The conference room.', 'Don\'t loosen your tie until you\'ve won.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['Mr. Calloway? I had a thought about the lipstick. It\'s probably nothing.'], choices: [
        { label: 'Nothing is my favorite thing. Go on.', lines: [['ruth', 'Women don\'t put it on for men. Not really. It\'s the one thing in the morning nobody else decides for you.'], ['jack', 'That\'s not nothing, Ruth. That\'s the campaign.']], fx: { card: 'signature', rapport: 1, minutes: 30 } },
        { label: 'Write it up. I\'ll read it later.', lines: [['ruth', 'Yes, Mr. Calloway.'], ['narrator', 'She folds the page twice and puts it in her pocket.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I\'m working on taglines. Badly.', 'Peg says the powder room is the best office in the building.'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['I drew a mouth. Just a mouth, Jack. Red as a stop sign.'], choices: [
        { label: 'Show me.', lines: [['eddie', 'Every car on Fifth Avenue, brakes on. Because of her.'], ['jack', 'Keep it. It\'s loud, but loud sells.']], fx: { card: 'stopsign', rapport: 1, minutes: 30 } }] },
        idle: ['I need a cigarette and a better pencil.', 'Mr. Crane wants everything in blue. Blue! For lipstick!'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack! Pour yourself one. Lipstick, is it? My mother wore a shade called Scandal.'], choices: [
        { label: 'Tell me about her.', lines: [['monty', 'She sat at her vanity every night for an hour. I used to watch from the door. It was the only hour she was happy.'], ['monty', 'Good God, I\'m maudlin before lunch. Take it, it\'s yours.']], fx: { card: 'vanity', rapport: 1, minutes: 30 } },
        { label: 'Pour me one.', lines: [['monty', 'Now that\'s a creative director.'], ['narrator', 'The rye is warm, and the morning gets softer around the edges.']], fx: { haze: 1, composure: 15, rapport: 1, minutes: 20 } }] },
        idle: ['Go win something. I\'ll be here, holding down the sofa.', 'Have you met my good friend, the afternoon?'] },
      theo: { at: [27, 15, 3.14], talk: { lines: ['Calloway. I ran the numbers on Belle Rouge, since nobody asked.'], choices: [
        { label: 'What do they say?', lines: [['theo', 'The long-wear formula tested best. It doesn\'t smudge. Women want it to last.'], ['theo', 'You\'re welcome. I\'ll be expecting my name on the next account.']], fx: { card: 'smudge', rapport: 1, minutes: 30 } },
        { label: 'Nobody asked for a reason, Theo.', lines: [['theo', 'Someday somebody will ask me first. You\'ll remember this.']], fx: { rapport: -1, composure: -5, minutes: 10 } }] },
        idle: ['My father-in-law plays golf with half your clients.', 'Numbers don\'t lie, Calloway. People do.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['Mr. Calloway. Sit. The bonsai and I were discussing patience.'], choices: [
        { label: 'What does it say?', lines: [['bell', 'That a thing becomes beautiful by what you cut away. Remember that at three o\'clock.'], ['narrator', 'You feel strangely calmer.']], fx: { composure: 20, rapport: 1, minutes: 30 } }] },
        idle: ['Patience, Mr. Calloway.', 'The founder of an agency is a man who has stopped working.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['Bellweather and Crane, good morning.', 'Your eleven o\'clock canceled, Mr. Calloway. You don\'t have an eleven o\'clock.'] },
      joyce: { at: [16, 13, -1.57], talk: null, idle: ['The coffee\'s fresh. That\'s the nicest thing I\'ll say today.'] },
      peg: { at: [18, 13, -1.57], talk: null, idle: ['Typing, typing, typing.'] }
    },
    overhear: { a: 'joyce', b: 'peg', card: 'powder', lines: ['JOYCE: Where do you go when it gets to be too much?', 'PEG: The powder room. Lock the door, fix my face. Five minutes that are mine.'] },
    looks: [
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: 'pearls', minutes: 15, text: 'Ladies\' Home Monthly. Every woman in every photograph wears pearls, and every one of them looks like she owns the building.' },
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'crossing', minutes: 15, text: 'Madison Avenue, eleven floors down. A woman in red crosses against the light, and three cabs stop for her.' }
    ],
    events: [{ at: 690, kind: 'phone', who: 'marchand', lines: [['narrator', 'The phone on your desk rings.'], ['clientF', 'Mr. Calloway? Celeste Marchand\'s office. She\'d like to move the meeting up to two o\'clock.'], ['clientF', 'And Mr. Calloway, she asked me to say: no pearls. She has enough pearls.']], fx: { pitchAt: 840 }, missed: [['dolores', 'Mrs. Marchand\'s office called while you were away. They\'ve moved it up to two.']] }],
    close: ['Women have been told what to want for a hundred years.', 'They\'ve been told by magazines, by husbands, and by men like me.', 'Belle Rouge doesn\'t tell her anything.', 'It hands her the pen.'],
    evening: 'bar'
  },
  { id: 'wednesday', title: 'WEDNESDAY', subtitle: 'Clear Skies', date: 'Wednesday, October 10, 1962', client: 'skylark', start: 540, pitchAt: 900,
    morning: [['dolores', 'Skylark Airways at three, Mr. Calloway. Mr. Hale and Mr. Pruitt. They want "the glamour of the jet age."'],
      ['jack', 'Everybody wants glamour. Nobody wants to pay for the fuel.'], ['dolores', 'And a man was asking for you downstairs. He called you "Walt." I told him there was no Walt here.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['Mr. Calloway. That man in the lobby is still there.'], choices: [
        { label: 'Tell him I\'m in a meeting.', lines: [['dolores', 'I already did. Three times. He said he\'d wait. He has the patience of a man with nowhere to be.']], fx: { minutes: 10 } },
        { label: 'What else do you know about Skylark?', lines: [['dolores', 'Only that Mr. Hale has called twice to ask if the press will be at the meeting. He sounds like a man waiting for bad news.']], fx: { rapport: 1, minutes: 20, composure: 5 } }] },
        idle: ['Three o\'clock. And do something about that man.', 'Mr. Barrow has been very curious this morning.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['When I was little we flew to my aunt\'s in Buffalo. I pressed my nose to the window the whole way.'], choices: [
        { label: 'What did you see?', lines: [['ruth', 'Our town. I waved at it. I swear it waved back.'], ['jack', 'Write that down, Ruth. Exactly like that.']], fx: { card: 'window', rapport: 1, minutes: 30 } },
        { label: 'Glamour, Ruth. Think glamour.', lines: [['ruth', 'Yes, Mr. Calloway. Glamour.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I keep thinking about that window.', 'Do men like you ever fly coach?'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['Silver, Jack. The whole campaign in silver. A wing like a cufflink.'], choices: [
        { label: 'It\'s beautiful. Keep it.', lines: [['eddie', 'Beautiful is what I do. Selling is what you do.']], fx: { card: 'wings', rapport: 1, minutes: 30 } }] },
        idle: ['Silver ink is twice the price. Worth it.'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack, my boy. I\'ve flown Skylark. The martinis are better than the landings.'], choices: [
        { label: 'Tell me about Pruitt.', lines: [['monty', 'Old Pruitt? He\'s got five grandchildren and their pictures in every pocket. Show him a family and he\'ll sign anything.']], fx: { intel: 'pruitt', rapport: 1, minutes: 30 } },
        { label: 'Martinis, then.', lines: [['monty', 'Cocktails above the clouds! Nobody can call you up there.'], ['narrator', 'He pours two. You drink one.']], fx: { card: 'martini', haze: 1, composure: 10, minutes: 30 } }] },
        idle: ['The sky is just a bar with a better view.'] },
      theo: { at: [27, 15, 3.14], talk: { lines: ['Did you see the paper, Calloway? Skylark put a plane down in a cornfield in Ohio.'], choices: [
        { label: 'Let me see that.', lines: [['theo', 'Page six. Nobody hurt. But Hale\'s been sweating through his shirts all week.'], ['theo', 'Funny thing. There\'s a man in the lobby who says he knew you in Pennsylvania. He called you Walt.']], fx: { intel: 'landing', minutes: 30, flag: 'theoCurious', composure: -10 } }] },
        idle: ['Pennsylvania, he said. Isn\'t that funny.', 'I wonder what Mr. Crane would think.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['I flew B-17s over Germany, Mr. Calloway. Did you know that?'], choices: [
        { label: 'What was it like?', lines: [['bell', 'Terrifying. But a good pilot\'s hands never shook. Not once. The men in the back watched our hands.']], fx: { card: 'hands', rapport: 1, minutes: 30 } }] },
        idle: ['Steady hands, Mr. Calloway.'] },
      joyce: { at: [4, 22, 0], talk: { lines: ['My sister flies for Pan Am. Isn\'t that something?'], choices: [
        { label: 'What does she say about it?', lines: [['joyce', 'She says the trick is to smile like nothing could ever go wrong. Even when the wing is on fire. Especially then.']], fx: { card: 'calm', rapport: 0, minutes: 20 } }] },
        idle: ['The percolator\'s on its last legs. Like me.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['That man by the elevator says he\'ll wait all day.'] },
      peg: { at: [18, 21, 3.14], talk: null, idle: ['Buzz, buzz. Everyone\'s talking about the man in the lobby.'] },
      lenny: { at: [27, 23, 3.14], talk: { lines: ['Walt? Walt Penn! Look at you. A suit like a senator.'], choices: [
        { label: 'Lenny. Not here. Walk with me.', lines: [['lenny', 'I knew you\'d remember. The farmhouse, the creek, your mother\'s pie on the sill.'], ['lenny', 'I don\'t want anything, Walt. I just wanted to see somebody from home make good.'], ['jack', 'Home is a word you have to earn, Lenny.']], fx: { card: 'oldname', minutes: 60, composure: -15, flag: 'metLenny' } },
        { label: 'You have the wrong man.', lines: [['lenny', 'Sure. Sure I do. You take care, Mr. Calloway.'], ['narrator', 'He puts his hat on and goes. Theo watches him leave.']], fx: { composure: -5, minutes: 10, flag: 'deniedLenny' } },
        { label: 'Here. Take this and go home.', lines: [['narrator', 'You fold two hundred dollars into his hand.'], ['lenny', 'I didn\'t come for money, Walt. But I\'ll take it. God bless.']], fx: { composure: -10, minutes: 15, flag: 'paidLenny' } }] },
        idle: ['Take care, Walt.'] }
    },
    overhear: { a: 'peg', b: 'marcy', card: null, intel: null, lines: ['PEG: Did you hear? Mr. Barrow asked Dolores for Mr. Calloway\'s personnel file.', 'MARCY: What would he want with that?'], flag: 'heardFile' },
    looks: [
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'contrail', minutes: 15, text: 'A contrail crosses the blue over the East River, as if someone just signed the sky.' },
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: null, minutes: 10, text: 'Holiday magazine: "The Jet Set." Every couple in it looks rich, bored and very far from Ohio.' }
    ],
    events: [{ at: 720, kind: 'phone', who: 'lenny', lines: [['narrator', 'The phone on your desk rings.'], ['lenny', 'Walt? It\'s Lenny. The girl downstairs gave me your number. I\'ll be at the Roosevelt till Friday.']], fx: { composure: -5 }, missed: [] }],
    close: ['Flying isn\'t about going anywhere.', 'It\'s about the moment the wheels touch down,', 'and you see the people waiting for you,', 'and you realize you\'re allowed to be happy again.'],
    evening: 'apartment'
  },
  { id: 'friday', title: 'FRIDAY', subtitle: 'The Constellation', date: 'Friday, October 12, 1962', client: 'kessler', start: 540, pitchAt: 900,
    morning: [['dolores', 'Kessler Motors at three. Both of them, father and son. Mr. Crane says if we lose this one, we lose the building.'],
      ['jack', 'No pressure, then.'], ['dolores', 'And Mr. Barrow would like a word. In your office. He looked pleased with himself.']],
    people: {
      dolores: { at: [21, 13, 1.57], talk: { lines: ['A word about the Kesslers, Mr. Calloway, since you\'re finally listening.'], choices: [
        { label: 'I\'m listening.', lines: [['dolores', 'The son, Rolf, races at Watkins Glen. He was arrested for it twice. His father paid. Neither of them has forgiven the other.']], fx: { intel: 'rolf', rapport: 1, minutes: 30 } }] },
        idle: ['Three o\'clock. Both of them. God help us.'] },
      ruth: { at: [5, 13, 0], talk: { lines: ['My brother drove to California in a Kessler with forty dollars. He never came back.'], choices: [
        { label: 'Was he happy?', lines: [['ruth', 'He sends a postcard every Christmas. Always the same picture: the road, and nothing on it.'], ['jack', 'The open road. That\'s the son. Ruth, you\'re good at this.']], fx: { card: 'openroad', rapport: 1, minutes: 30 } },
        { label: 'Give me something I can sell, Ruth.', lines: [['ruth', 'That was something you could sell, Mr. Calloway.']], fx: { rapport: -1, minutes: 10 } }] },
        idle: ['I slid something under your door. If you want it.'] },
      eddie: { at: [8, 16, -1.57], talk: { lines: ['Look at this grille, Jack. It\'s grinning. A car with teeth.'], choices: [
        { label: 'Make it grin wider.', lines: [['eddie', 'Wider! A man of taste.']], fx: { card: 'chrome', rapport: 1, minutes: 30 } }] },
        idle: ['Chrome is just silver with ambition.'] },
      monty: { at: [5, 4, 1.57], talk: { lines: ['Jack. Close the door. About the Kesslers. And about you.'], choices: [
        { label: 'The Kesslers first.', lines: [['monty', 'The old man built the first car in a barn in 1919. Pride, Jack, and memory. Give him both.']], fx: { intel: 'august', minutes: 30, rapport: 1 } },
        { label: 'Monty, there\'s something you should know about me.', cond: s => !s.flags.confessed && !s.flags.theoTold, lines: [['jack', 'My name wasn\'t always Calloway. I took it. In Korea. From a man who didn\'t need it anymore.'], ['monty', '...'], ['monty', 'Jack, half the men on this avenue are someone else. I\'m the only one who was born a Crane, and look at me.'], ['monty', 'Win me the Kesslers. Then we never talk about this again.']], fx: { flag: 'confessed', composure: -20, rapport: 2, minutes: 45 } }] },
        idle: ['Win me the Kesslers.'] },
      theo: { at: [33, 5, 3.14], talk: { lines: ['Calloway. Or should I say Walter Penn? I had a long talk with your friend from Pennsylvania.', 'Make me head of accounts, today, or Mr. Crane hears all about it.'], choices: [
        { label: 'Fine. Head of accounts.', lines: [['theo', 'I knew you\'d be reasonable. We\'re going to get along, Jack.'], ['narrator', 'He leaves. The room smells of his aftershave for an hour.']], fx: { flag: 'paidTheo', composure: -15, minutes: 20 } },
        { label: 'Go ahead. Tell him.', lines: [['theo', 'You think I won\'t?'], ['jack', 'I think you\'ll find that nobody cares as much as you do, Theo.']], fx: { flag: 'theoTold', composure: -10, minutes: 20 } },
        { label: 'Get out of my office.', lines: [['theo', 'You\'ll regret that. Before five o\'clock, you\'ll regret it.']], fx: { flag: 'theoTold', composure: -20, rapport: -2, minutes: 10 } }] },
        idle: ['Tick tock, Walter.'] },
      bell: { at: [38, 13, 1.57], talk: { lines: ['August Kessler. I knew him when the factory was a barn and the car was a bet.'], choices: [
        { label: 'Tell me about the barn.', lines: [['bell', 'He slept beside the first engine so nobody would steal it. Every car since has been that engine, polished.']], fx: { card: 'barn', rapport: 1, minutes: 30 } }] },
        idle: ['Old men like to be reminded they were young.'] },
      joyce: { at: [16, 13, -1.57], talk: null, idle: ['Big day. Even the elevator looks nervous.'] },
      marcy: { at: [16, 21, 1.57], talk: null, idle: ['The Kesslers are early. They\'re waiting in the car. Both of them, not speaking.'] },
      peg: { at: [18, 21, 3.14], talk: null, idle: ['My father had a Kessler. Funny.'] }
    },
    overhear: { a: 'peg', b: 'marcy', card: 'father', lines: ['PEG: My dad had a Kessler. He let me steer it once, in the church lot.', 'MARCY: Did you crash it?', 'PEG: Into the minister\'s hedge. Dad laughed so hard he cried.'] },
    looks: [
      { id: 'magazine', label: 'Read the magazines', at: [6, 17], card: 'hotrod', minutes: 15, text: 'Hot Rod Monthly. The boys strip the chrome off their Kesslers and race them on the Turnpike at dawn.' },
      { id: 'window', label: 'Look out the window', at: [40, 1], card: 'turnpike', minutes: 15, text: 'Bumper to bumper on Park Avenue. Nobody honks at the black Kessler. Everyone else gets honked at.' },
      { id: 'door', label: 'The page under your door', at: [36, 8], card: 'ruthline', minutes: 5, cond: s => s.rapport.ruth >= 2, text: 'Three words in Ruth\'s handwriting, underlined twice: "Built to be looked at."' }
    ],
    events: [{ at: 780, kind: 'monty', who: 'monty', cond: s => s.flags.theoTold && !s.flags.confessed, lines: [['narrator', 'Monty appears in the doorway with two glasses.'], ['monty', 'Barrow came to see me. Something about Pennsylvania. Walter something.'], ['monty', 'Jack, this is America. People do it every day. Win me the Kesslers and I\'ll forget the name.']], fx: { composure: 10, flag: 'montyKnows' }, missed: [] }],
    close: ['This isn\'t a car.', 'It\'s a promise a father makes to his son:', 'that the road will still be there,', 'and it will still be his.'],
    evening: 'ending'
  }
];

/* ===== 14-feedback.js ===== */
/* MAD MEN OUT - the build's feedback (the same answers as exit-interview.json), shown on the About pages. */
const TESTING_FEEDBACK = [["How many issues did testing catch?", "13: four unknown material patterns; the brainstorm reading its layout only from draw (dead input headless); the attract autopilot stuck on furniture; a window hotspot overlapping the typewriter; the pixel font missing the PlayStation symbols (prompts showed '?'); a missing middle dot; card text overflowing; suits drawn as white shirts; the pitch camera hiding the clients behind the HUD and chairs; no AI Hub progress reports during play (harness fail); garbled icons in the tiny font; the wrong hint on touch-only screens; the logo crowding the corner button on portrait phones."], ["How many would be considered critical issues / game breaking?", "3: the missing PlayStation glyphs (every controller prompt unreadable), the missing hub progress reports (the hub would keep the game out of sessions), and the pitch camera hiding the client you are pitching to."], ["What was the most helpful test you ran?", "The headless three-day playthrough in Node (94 checks): it drives every conversation, card, event, pitch, ending and mode in seconds and caught the input and hotspot bugs; a close second is the AI Hub harness, which caught the missing progress reports."], ["What was the least helpful test you ran?", "The viewport matrix on the title screen: all 24 sizes came back clean, so it mostly confirmed the engine's expand layout, though its phone shots did show the logo crowding the corner button."]];
const ENGINE_FEEDBACK = [["What did you like most about the engine?", "How much comes for free and works the same everywhere: the pause menu, settings, rebinding, glyph families, saves, dialog with live portraits, lighting, and an exact fixed-step clock that makes a whole game testable headless in Node."], ["Did you get stuck or guess wrong?", "A few times: material shorthand patterns (leather, velvet, leaves and marble are not patterns), the 'coat' outfit using cloth for the torso, the font lacking the PlayStation symbols its own input labels return, and the side view's depth for props."], ["What was the most important thing you had to build yourself?", "The pitch system (cards with angles, client wants that change mid-pitch, the timing meter, pivots and the beat-timed close), plus Simlish voices driven from the dialog's typing, the clock-and-events office day, and the gamepad axis-inversion fix."], ["What was the hardest part about using the engine?", "Finding the right names in a very large API: the index helps, but details like which views a prop faces in, how mouseGround returns, or that FlowField ignores placed furniture needed reading the source or trial and error."], ["If you had to remove or overhaul one thing from engine, what woudl that be?", "The material shorthand's silent fallback: an unknown pattern only warns once in the console, so a typo quietly changes how furniture looks; it should fail loudly or list the patterns at the call site."], ["If you could change one thing about the engine, what would it be?", "Ship the PlayStation and Xbox button symbols in the pixel fonts, since input.label() returns them, and add a public font.define() for game glyphs; also make FlowField avoid map.solid furniture."]];
const PROMPT_FEEDBACK = [["What did you like most about this prompt?", "It is concrete about what done means: attract mode timing, controller-first UI with glyph and inversion settings, touch-only behaviour, hub integration, and a full feedback loop."], ["What was confusing?", "The deliverable name pattern (how to write GameTitle and SOURCE in a file name with spaces and a year), and whether 'multiplayer for the game on its own' meant local multiplayer as well as the hub; I did both."], ["What was the hardest thing to do?", "Turning a slow, talky drama into a game loop with real decisions: the insight cards, the clock and composure trade-offs and the timed pitch had to make persuasion feel like play."], ["If there was one test you could of run, what would that test be?", "A real DualSense on a TV at ten feet with a person playing all three days, to judge readability, pacing and whether the pitch meter feels fair; I could only mock the gamepad in the browser."]];

/* ===== 15-about.js ===== */
/* MAD MEN OUT — the About / Credits pages: source information and the build's feedback, as shown in the game. */
const ABOUT = [
  ['ABOUT', [
    'Mad Men Out is an original spiritual successor to the television series Mad Men (2007-2015). Its characters, agency, clients and lines are new; the period, the tone and the business of persuasion are the inspiration.',
    ['How it plays', 'Three working days at Bellweather & Crane, 1962. Walk the eleventh floor, talk to the staff and look around to gather INSIGHTS, each with an angle (desire, status, nostalgia, safety, freedom). Learn what the client really wants. Write a campaign of up to three cards at your typewriter, then pitch it: read the client, time each slide on the delivery meter, pivot out of a bad one, and land the close on the beat.'],
    ['What carries over', 'Composure and haze (drinks steady you but make delivery harder), rapport with five colleagues, a secret named Walter Penn, and the accounts you win. Three endings.'],
    ['Modes', 'Campaign (3 days), Pitch Gauntlet (solo, three random clients), Pitch-Off (2 players on one machine), and the AI Hub parallel round (1-4 players online, the same deal for everyone).']
  ]],
  ['CONTROLS', [
    ['Controller (DualSense or any standard pad)', 'Left stick or d-pad: walk, move the focus.  ✕ talk / use / confirm.  ○ back.  △ the deck.  □ pivot in a pitch.  R1 camera view.  R2 or L3 hurry.  Options: pause menu.'],
    ['Keyboard and mouse', 'WASD or arrows: walk.  E, Space or Enter: talk / use / confirm.  Esc or Q: back.  Tab: the deck.  R: pivot.  V: camera view.  Shift: hurry.  Mouse: hover to focus, click to walk to people and things or to pick menu items and cards; the wheel zooms.'],
    ['Settings', 'Button symbols (PlayStation by default, or Xbox A B X Y), Invert horizontal and Invert vertical for controllers that report their axes the wrong way, text speed, client tells, a wider delivery window, voices.']
  ]],
  ['SOURCE INFORMATION', [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'Mad Men (2007-2015), the AMC television drama created by Matthew Weiner'],
    ['Genre and Perspective', 'Narrative adventure with a persuasion (pitch) minigame and light management; three-quarter top-down view in the office (switchable to isometric or top-down), a side view for the evenings'],
    ['Tech', 'my-3D2dge v0.85.1 (full edition, one file, no dependencies), plain JavaScript, Web Audio and Canvas 2D through the engine; AI Hub session client 1.3.0; Node 22 and Playwright 1.63 for tests'],
    ['Art Direction', 'The engine\'s native style: code-drawn pixel art at 320x240 (expanded to the screen), HD Humanoid rigs dressed in 1962 suits and dresses, mid-century furniture written as engine shape data (walnut, chrome, teal and orange), canvas lighting'],
    ['Animation', 'The engine\'s procedural rigs: walking, poses (hips, wave, cast, cheer), expressions, live dialog portraits with moving mouths, camera fades and transitions'],
    ['Audio', 'Code-written cool-jazz music in the engine\'s step notation (lounge, pitch, evening, win, lose), chip sound effects (typewriter, ice, telephone, applause), and Simlish-style gibberish voices synthesized per speaker'],
    ['Online', 'AI Hub Session Protocol v1, parallel mode (1-4 players): seeded deal, progress, result, time-up and end handling; no other network use'],
    ['Testing', 'Headless Node tests of every system and a full three-day playthrough; Playwright in Chromium, Firefox and WebKit; the AI Hub harness; viewport matrix of phones, tablets and desktops'],
    ['Research', 'None beyond the engine\'s and the hub\'s documentation; the source is described from general knowledge'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ]],
  ['TESTING FEEDBACK', TESTING_FEEDBACK],
  ['ENGINE FEEDBACK', ENGINE_FEEDBACK],
  ['PROMPT FEEDBACK', PROMPT_FEEDBACK],
  ['CREDITS', [
    ['Made by', 'Claude (Anthropic, claude-opus-5-5) in Claude Code, for Michael Crosato\'s game matrix'],
    ['Engine', 'my-3D2dge by Michael Crosato: rigs, lighting, sound, menus and settings'],
    ['Online', 'AI Hub Session Protocol by Michael Crosato'],
    ['Inspired by', 'Mad Men, created by Matthew Weiner (AMC, 2007-2015). This is a fan-made, original work and is not affiliated with or endorsed by its makers.'],
    ['Thanks', 'To every copywriter who ever stared at a blank page at four in the afternoon.']
  ]]
];

/* ===== 20-office.js ===== */
/* MAD MEN OUT — the office: Bellweather & Crane's eleventh floor as a TileMap, its furniture, its people, the clock.
 * The player walks it (threequarter by default; V or R1 changes to isometric or top-down), talks, looks, drinks, naps,
 * and writes the campaign at the typewriter before the pitch. */

/* ---- THE FLOOR PLAN, built from rooms (cells of 16 units) ---- */
const MW = 44, MH = 28;
const ROOMS = {
  monty: { x0: 1, y0: 1, x1: 10, y1: 8, floor: 'p', name: 'Monty Crane\'s office' },
  conf: { x0: 12, y0: 1, x1: 27, y1: 8, floor: 'c', name: 'The conference room' },
  jack: { x0: 29, y0: 1, x1: 42, y1: 8, floor: 'p', name: 'Your office' },
  lounge: { x0: 1, y0: 10, x1: 10, y1: 18, floor: 'o', name: 'The creative lounge' },
  bullpen: { x0: 12, y0: 10, x1: 31, y1: 18, floor: '.', name: 'The bullpen' },
  founder: { x0: 33, y0: 10, x1: 42, y1: 18, floor: 'p', name: 'Mr. Bellweather\'s office' },
  kitchen: { x0: 1, y0: 20, x1: 10, y1: 26, floor: 'l', name: 'The kitchen' },
  lobby: { x0: 12, y0: 20, x1: 31, y1: 26, floor: 't', name: 'Reception' },
  library: { x0: 33, y0: 20, x1: 42, y1: 26, floor: 'r', name: 'The library' }
};
function buildRows() {
  const G = Array.from({ length: MH }, () => Array(MW).fill('#'));
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = c; };
  for (const k in ROOMS) { const R = ROOMS[k]; fill(R.x0, R.y0, R.x1, R.y1, R.floor); }
  fill(1, 0, 10, 0, 'W'); fill(12, 0, 27, 0, 'W'); fill(29, 0, 42, 0, 'W'); fill(43, 10, 43, 26, 'W');
  fill(11, 1, 11, 8, 'P'); fill(28, 1, 28, 8, 'P');
  fill(1, 9, 11, 9, 'P'); fill(12, 9, 27, 9, 'g'); fill(28, 9, 42, 9, 'P');
  fill(11, 10, 11, 18, '|'); fill(32, 10, 32, 18, '|'); fill(1, 19, 42, 19, '|'); fill(11, 20, 11, 26, '|'); fill(32, 20, 32, 26, '|');
  // doors
  fill(5, 9, 6, 9, 'p'); fill(19, 9, 20, 9, 'c'); fill(35, 9, 36, 9, 'p');
  fill(11, 13, 11, 14, '.'); fill(32, 13, 32, 14, 'p');
  fill(5, 19, 6, 19, 'l'); fill(18, 19, 25, 19, 't'); fill(37, 19, 38, 19, 'r'); fill(11, 23, 11, 24, 't'); fill(32, 23, 32, 24, 't');
  fill(16, 27, 17, 27, 'E'); fill(26, 27, 27, 27, 'E');
  return G.map(r => r.join(''));
}
const FLOORS = { p: 'parq', c: 'conf', o: 'shag', '.': 'carpet', l: 'lino', t: 'terr', r: 'rug' };
const WALLS = {
  1: { h: 40, cut: true, cutH: 6, face: 'plaster', roof: 'plain', top: '#3a3230', side: '#d8ccb4' },          // # outer wall
  2: { h: 40, cut: true, cutH: 6, face: 'mmWindow', roof: 'plain', top: '#3a3230', side: '#86b8d8' },         // W curtain wall of glass
  3: { h: 34, cut: true, cutH: 6, face: 'mmWalnut', roof: 'plain', top: '#4a3020', side: '#6e4528' },         // P walnut paneling
  4: { h: 34, cut: true, cutH: 6, face: 'plaster', roof: 'plain', top: '#4a4038', side: '#e6dac2' },          // | plaster partition
  5: { h: 13, face: 'mmWalnut', roof: 'plain', top: '#a8d0e0', side: '#6e4528' },                             // g glass partition (low wood, glass above)
  6: { h: 40, cut: true, cutH: 6, face: 'mmChrome', roof: 'plain', top: '#3a3230', side: '#a8b0b8' }          // E elevator doors
};
const LEGEND = { '#': 1, W: 2, P: 3, '|': 4, g: 5, E: 6 };
for (const c in FLOORS) LEGEND[c] = { floor: FLOORS[c] };

/* ---- FLOORS painted per pixel: carpet with a diamond, herringbone parquet, orange shag, terrazzo, checker lino ---- */
const RGB = h => E.hex(h);
const FL = {
  carpet: [RGB('#3e6a6e'), RGB('#46767a'), RGB('#365e62'), RGB('#5a8a8a')],
  conf: [RGB('#283a5a'), RGB('#30446a'), RGB('#22324e'), RGB('#c8a860')],
  shag: [RGB('#b85a24'), RGB('#c8682a'), RGB('#a04e20'), RGB('#e08a40')],
  parq: [RGB('#7a4a28'), RGB('#8a5630'), RGB('#6a3e22'), RGB('#9a6638')],
  terr: [RGB('#d8d0c0'), RGB('#e4dccc'), RGB('#b8ae9c'), RGB('#8a8070')],
  lino: [RGB('#e8e2d4'), RGB('#3a3a40'), RGB('#d0c8b8'), RGB('#2a2a30')],
  rug: [RGB('#6a2228'), RGB('#7a2a30'), RGB('#5a1c22'), RGB('#c8a050')]
};
function floorTex(x, y, tag) {
  const C = FL[tag] || FL.carpet, h = E.hash2(Math.floor(x), Math.floor(y)), lx = ((x % T) + T) % T, ly = ((y % T) + T) % T;
  let c;
  if (tag === 'parq') {   // herringbone: boards 8 x 2 that alternate direction every cell
    const cx = Math.floor(x / 8), cy = Math.floor(y / 8), alt = (cx + cy) & 1, u = alt ? x % 8 : y % 8, v = alt ? y : x;
    c = (u < .9) ? C[2] : (Math.floor(v / 2) & 1) ? C[1] : C[0];
    if (h < .06) c = C[3];
  } else if (tag === 'carpet' || tag === 'conf' || tag === 'rug') {   // a low pile with a repeating diamond
    const m = Math.abs(((x % 24) + 24) % 24 - 12) + Math.abs(((y % 24) + 24) % 24 - 12);
    c = m > 10.5 && m < 12 ? C[3] : (h < .3 ? C[2] : h > .8 ? C[1] : C[0]);
    if (tag === 'rug' && (lx < 1 || ly < 1)) c = C[2];
  } else if (tag === 'shag') { c = h < .35 ? C[2] : h > .75 ? C[3] : C[(Math.floor(x / 2) + Math.floor(y / 3)) & 1]; }
  else if (tag === 'terr') { c = h < .05 ? C[3] : h < .14 ? C[2] : (lx < .6 || ly < .6) ? C[2] : C[h > .6 ? 1 : 0]; }
  else if (tag === 'lino') { const ch = (Math.floor(x / 8) + Math.floor(y / 8)) & 1; c = ch ? C[1] : C[0]; if (h < .08) c = ch ? C[3] : C[2]; }
  else c = C[0];
  // daylight from the north windows: a warm band near the glass, the far rooms a touch cooler
  const k = y < 9 * T ? 1 + Math.max(0, (60 - y) / 400) : 1;
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k * .99)];
}

/* ---- FURNITURE: [shape, cx, cy, facing, z, solid] in cells (centers at +.5 are added by the caller's numbers) ---- */
const S_ = Math.PI / 2, N_ = -Math.PI / 2, E_ = 0, W_ = Math.PI;
const FURNITURE = [
  // Monty
  ['mmDesk', 5.5, 2.4, S_], ['mmChair', 5.5, 1.5, S_], ['mmBarCart', 8.8, 2.2, S_], ['mmSofa', 1.9, 5.5, E_], ['mmBookcase', 2.6, .9, S_], ['mmPlant', 9.8, 7.6, S_], ['mmHatStand', 9.6, 1.4, S_],
  // conference
  ['mmConfTable', 19.5, 4.6, S_], ['mmCredenza', 15, .95, S_], ['mmCredenza', 24, .95, S_], ['mmPlant', 12.8, 1.4, S_], ['mmPlant', 26.6, 8.3, S_], ['mmEasel', 26.4, 3.2, W_, 0, false],
  ['mmChair', 14.6, 3.1, S_, 0, false], ['mmChair', 24.4, 3.1, S_, 0, false], ...[16, 19, 22].map(x => ['mmChair', x + 1, 6.3, N_, 0, false]),
  // Jack
  ['mmDesk', 36, 2.5, S_], ['mmChair', 36, 1.5, S_], ['mmCredenza', 32.5, .95, S_], ['mmSofa', 29.9, 6, E_], ['mmBarCart', 41.6, 6.2, W_], ['mmPlant', 41.8, 1.4, S_], ['mmHatStand', 29.7, 1.3, S_],
  ['mmArmchair', 34.6, 4.8, N_], ['mmArmchair', 37.6, 4.8, N_],
  // creative lounge
  ['mmSofa', 3.6, 10.9, S_], ['mmCoffeeTable', 5.6, 16.6, S_], ['mmArmchair', 2.4, 16.8, E_], ['mmArmchair', 9, 17.6, W_], ['mmDrafting', 8.2, 14.9, S_], ['mmPlant', 1.5, 13.2, S_], ['mmFiling', 10.2, 10.8, S_],
  // bullpen
  ...[[15, 12], [18, 12], [24, 12], [15, 16.4], [18.5, 16.4], [22, 16.4]].map(([x, y]) => ['mmTypist', x + .5, y, S_]),
  ['mmDesk', 28.6, 15, W_], ['mmFiling', 31.2, 10.8, S_], ['mmFiling', 30.4, 10.8, S_], ['mmCooler', 12.7, 17.6, S_], ['mmPlant', 12.8, 10.6, S_], ['mmPlant', 31, 18, S_],
  // founder
  ['mmDesk', 38.5, 11, S_], ['mmChair', 38.5, 10.3, S_], ['mmBonsai', 36, 12.2, S_], ['mmClock', 42.2, 11.2, W_], ['mmBookcase', 34.4, 10.6, S_], ['mmArmchair', 35.4, 16.8, N_], ['mmArmchair', 41, 16.8, N_],
  // kitchen
  ['mmCounter', 5, 20.8, S_], ['mmCooler', 9.6, 21, S_], ['table', 5, 24.2, S_], ['chair', 3.6, 24.2, E_, 0, false], ['chair', 6.4, 24.2, W_, 0, false], ['mmPlant', 1.6, 26, S_],
  // lobby
  ['mmReception', 16.5, 22.6, S_], ['mmSofa', 27.2, 20.9, S_], ['mmArmchair', 30.3, 22.8, W_], ['mmCoffeeTable', 27.2, 23, S_], ['mmPlant', 12.8, 20.7, S_], ['mmPlant', 23.8, 26.2, S_], ['mmPlant', 19.8, 26.2, S_],
  // library
  ['mmBookcase', 35.5, 20.6, S_], ['mmBookcase', 39.5, 20.6, S_], ['mmArmchair', 35, 24, E_], ['mmArmchair', 40.2, 24.4, W_], ['mmPlant', 33.6, 26.2, S_]
];
const at = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });

const OFF = { map: null, flow: null, built: false };
function buildOffice() {
  if (OFF.built) return OFF;
  OFF.map = new E.TileMap({ rows: buildRows(), legend: LEGEND, types: WALLS, floorTex, ao: 6, outside: '#1a1614' });
  for (const [id, cx, cy, f, z, solid] of FURNITURE) if (solid !== false) OFF.map.solid(id, cx * T, cy * T, z || 0, { facing: f });
  OFF.flow = new E.FlowField(OFF.map);
  OFF.built = true;
  return OFF;
}
function drawFurniture(r) {
  for (const [id, cx, cy, f, z] of FURNITURE) r.shape(id, cx * T, cy * T, z || 0, { facing: f });
  // desk-top things
  r.shape('mmTypewriter', 34.4 * T, 2.7 * T, 13, { facing: S_ }); r.shape('mmPhone', 38.2 * T, 2.4 * T, 13, { facing: S_ }); r.shape('mmDeskLamp', 37.2 * T, 2.1 * T, 13, { facing: S_ });
  r.shape('mmPhone', 6.8 * T, 2.4 * T, 13, { facing: S_ }); r.shape('mmDeskLamp', 4 * T, 2.1 * T, 13, { facing: S_ });
  r.shape('mmTypewriter', 15.5 * T, 12.1 * T, 12.5, { facing: S_ }); r.shape('mmTypewriter', 18.5 * T, 12.1 * T, 12.5, { facing: S_ }); r.shape('mmTypewriter', 24.5 * T, 12.1 * T, 12.5, { facing: S_ });
  r.shape('mmTypewriter', 19 * T, 16.5 * T, 12.5, { facing: S_ }); r.shape('mmPhone', 17 * T, 22.4 * T, 14.5, { facing: S_ }); r.shape('mmDeskLamp', 39.5 * T, 10.8 * T, 13, { facing: S_ });
}
function officeLights() {
  // window light along the north glass, desk lamps, the lobby's ceiling lights
  for (let x = 2; x < 43; x += 5) L.add(x * T, 1.2 * T, 24, 70, .32, { color: '#d8e8ff' });
  for (const [x, y] of [[37.2, 2.6], [4, 2.6], [39.5, 11.2]]) L.add(x * T, y * T, 18, 46, .5, { color: '#ffd890' });
  for (const [x, y] of [[16, 23], [22, 23], [28, 23], [16, 14], [22, 14], [28, 14], [5, 14], [5, 23], [38, 23], [38, 15], [20, 5], [34, 5], [5, 5]]) L.add(x * T, y * T, 40, 90, .38, { color: '#fff2d8' });
}
const roomAt = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); for (const k in ROOMS) { const R = ROOMS[k]; if (cx >= R.x0 && cx <= R.x1 && cy >= R.y0 && cy <= R.y1) return k; } return null; };

/* ---- THE DIALOG SEQUENCER: lines as [speaker, text] played one box at a time, with portraits and gibberish ---- */
const talk = new E.Dialog(game, { voice: null, bg: ['#2a2018', '#120c08'], border: '#c8a868', nameColor: '#e8c36a', lines: 3 });
const speakerOf = id => {
  if (id === 'narrator') return { name: '', portrait: null, voice: null };
  if (id === 'clientF') return { name: 'ON THE TELEPHONE', portrait: null, voice: 'clientF' };
  const c = CAST[id]; return c ? { name: c.name, portrait: rigOf(id), voice: c.voice } : { name: id.toUpperCase(), portrait: null, voice: 'client' };
};
function say(lines, done, choices, onChoice) {
  lines = lines.slice();
  const step = () => {
    if (!lines.length) { voiceOn = null; if (done) done(); return; }
    const [who, text] = lines.shift(), sp = speakerOf(who), last = !lines.length && choices;
    voiceOn = sp.voice;
    talk.speed = textSpeed();
    talk.say(who === 'narrator' ? '{c=#b8ab94}' + text + '{/c}' : text, { name: sp.name, portrait: sp.portrait, portraitSize: 46, portraitOpts: { zoom: 2.4, turn: -.3, bg: ['#5a4a3a', '#1a120c'] },
      choices: last ? choices.map(c => c.label) : undefined, onChoice: last ? (i => { voiceOn = null; onChoice(i); }) : undefined, onDone: last ? undefined : step });
  };
  step();
}

/* ---- the office scene's state ---- */
const OF = { hero: null, rig: null, npcs: [], spots: [], hover: null, goal: null, prompt: null, note: null, journal: false, ring: null, overT: 0, fired: {}, toasts: [], room: null, dayCard: 0, auto: null, busy: false, lastClick: null };
const dayData = () => DAYS[S.day];
const clientData = () => CLIENTS[dayData().client];

function toast(title, text, color = COL.gold) { OF.toasts.push({ title, text, color, t: 0 }); }
function gainCard(id) {
  if (!id || S.insights.includes(id)) return;
  S.insights.push(id); const c = CARDS[id];
  toast('NEW INSIGHT: ' + c.title.toUpperCase(), ANGLES[c.angle].icon + ' ' + c.angle + ' · power ' + c.power, ANGLES[c.angle].color);
  A.sfx('card'); A.sfx('pickup', { vol: .5 });
  if (!S.demo && game.input.rumble) game.input.rumble(.3, .12);
}
function gainIntel(id) {
  if (!id || S.intel.includes(id)) return;
  S.intel.push(id); toast('CLIENT INTEL: ' + INTEL[id].title.toUpperCase(), 'The client\'s true wants, in the deck (' + key('journal') + ')', '#9ad0ff'); A.sfx('secret');
}
function spend(min) {
  if (!min) return;
  const before = S.minute; S.minute = Math.min(S.pitchAt, S.minute + min);
  // a ringing phone left unanswered past this action is missed
  if (OF.ring && S.minute > OF.ring.at + 1) { const ev = OF.ring; OF.ring = null; if (ev.missed && ev.missed.length) OF.queue.push(() => say(ev.missed, next)); if (ev.fx && ev.fx.pitchAt) S.pitchAt = ev.fx.pitchAt; }
  if (Math.floor(before / 60) !== Math.floor(S.minute / 60)) A.sfx('blip', { vol: .4 });
}
function applyFx(fx, who) {
  if (!fx) return;
  if (fx.rapport && who && S.rapport[who] !== undefined) { S.rapport[who] = clamp(S.rapport[who] + fx.rapport, -3, 3); if (fx.rapport > 0) toast(SHORT[who].toUpperCase() + ' LIKES THAT', '♥ rapport ' + S.rapport[who], '#e89aa0'); else toast(SHORT[who].toUpperCase() + ' WON\'T FORGET THAT', 'rapport ' + S.rapport[who], '#a09890'); }
  if (fx.composure) { S.composure = clamp(S.composure + fx.composure, 0, 100); if (fx.composure < 0) game.shake(1.5); }
  if (fx.haze) S.haze = clamp(S.haze + fx.haze, 0, 3);
  if (fx.card) gainCard(fx.card);
  if (fx.intel) gainIntel(fx.intel);
  if (fx.flag) S.flags[fx.flag] = true;
  if (fx.pitchAt) S.pitchAt = Math.min(S.pitchAt, fx.pitchAt);
  if (fx.minutes) spend(fx.minutes);
}
// a queue of things that wait for the dialog to close (missed calls, events)
OF.queue = [];
const next = () => {};

/* ---- PEOPLE: each a Body-free standing figure with a rig that turns to the hero and gestures while talking ---- */
const EXTRAS = [   // typists and a mail boy, for life
  { id: 'x1', look: { ...DRESS('#8a6aa8', '#2a1a12', { hair: 'ponytail' }) }, at: [24.5, 11.2, 1.57], line: 'Mr. Barrow wants it in triplicate. Again.' },
  { id: 'x2', look: { ...DRESS('#c8a070', '#e8d090', { hair: 'short' }) }, at: [22.5, 15.6, -1.57], line: 'If I type one more "Dear Sir" I\'ll scream.' },
  { id: 'x3', look: { ...SUIT('#6a6a5a', '#5a5a4a', '#f0ece0', '#3a3a2a', { hair: 'short', size: 1.18, colors: { hair: '#c8803a' } }) }, path: [[13.5, 14.5], [30.5, 14.5], [30.5, 19.5], [21.5, 19.5], [13.5, 14.5]], line: 'Mail! Mail for the eleventh floor!' }
];
function spawnPeople() {
  const D = dayData(); OF.npcs = [];
  for (const id in D.people) {
    const p = D.people[id], pos = at(p.at[0], p.at[1]);
    OF.npcs.push({ id, kind: 'npc', x: pos.x, y: pos.y, z: 0, face: p.at[2], look: p.at[2], rig: rigOf(id), data: p, idle: 0, pose: null, poseT: 2 + Math.random() * 3, gest: 0 });
  }
  for (const x of EXTRAS) {
    const rig = rigs[x.id] || (rigs[x.id] = new E.Humanoid(x.look));
    const p0 = x.path ? x.path[0] : x.at, pos = at(p0[0], p0[1]);
    OF.npcs.push({ id: x.id, kind: 'extra', x: pos.x, y: pos.y, z: 0, face: x.at ? x.at[2] : 0, look: x.at ? x.at[2] : 0, rig, data: { idle: [x.line] }, path: x.path, seg: 0, vx: 0, vy: 0, pose: null, poseT: 3, gest: 0 });
  }
  // the hotspots: the room's furniture you can use, the day's things to look at, the people
  const H = [
    { id: 'typewriter', x: 34.4 * T, y: 3.3 * T, label: () => S.deck.length ? 'Rewrite the campaign' : 'Write the campaign', use: () => openBrainstorm(false) },
    { id: 'barcart', x: 41 * T, y: 6.2 * T, label: () => S.haze >= 3 ? 'You\'ve had enough' : 'Pour a drink (15 min)', use: drink },
    { id: 'sofa', x: 30.9 * T, y: 6 * T, label: () => 'Lie down (1 hr)', use: nap },
    { id: 'coffee', x: 4.5 * T, y: 21.8 * T, label: () => 'Pour a coffee (15 min)', use: coffee },
    { id: 'smoke', x: 41.6 * T, y: 23 * T, label: () => 'Smoke by the window (15 min)', use: smoke },
    { id: 'conf', x: 19.5 * T, y: 9.6 * T, label: () => S.deck.length ? 'Begin the pitch' : 'The conference room (write the campaign first)', use: () => { if (S.deck.length) beginPitch(); else say([['narrator', 'The conference room is set for ' + clockStr(S.pitchAt) + '. You have nothing to show them yet. The typewriter is in your office.']]); } },
    { id: 'phone', x: 38.2 * T, y: 3.4 * T, label: () => OF.ring ? 'Answer the telephone' : 'The telephone', use: phone }
  ];
  for (const l of D.looks) if (!l.cond || l.cond(S)) H.push({ id: 'look:' + l.id, x: (l.at[0] + .5) * T, y: (l.at[1] + .5) * T, label: () => S.used[l.id] ? 'Look again' : l.label + ' (' + l.minutes + ' min)', use: () => look(l) });
  OF.spots = H;
}
function look(l) {
  const first = !S.used[l.id]; S.used[l.id] = true;
  say([['narrator', l.text]], () => { if (first) { spend(l.minutes); if (l.card) gainCard(l.card); } });
}
function drink() {
  if (S.haze >= 3) { say([['narrator', 'Your hand reaches for the decanter. You stop it. Even you have limits, and this is one.']]); return; }
  A.sfx('pour'); game.after(.4, () => A.sfx('ice'));
  S.haze++; S.composure = clamp(S.composure + 20, 0, 100); spend(15);
  say([['narrator', ['Rye, two fingers. The morning gets softer around the edges.', 'Another. The room is warm and you are very good at your job.', 'The third goes down like a promise you won\'t keep.'][S.haze - 1]]]);
  toast('COMPOSURE +20', 'HAZE ' + '•'.repeat(S.haze) + ' (the delivery meter will swing faster)', '#e8a060');
}
function nap() {
  spend(60); S.composure = clamp(S.composure + 40, 0, 100); S.haze = Math.max(0, S.haze - 1);
  game.flash('#000000', .5, 1); say([['narrator', 'You lie down on the sofa, tie loosened, and look at the ceiling until the ceiling looks back. An hour goes by.']]);
  toast('COMPOSURE +40', 'An hour gone. ' + (S.haze ? 'HAZE ' + '•'.repeat(S.haze) : 'Your head is clear.'), '#9ad0ff');
}
function coffee() { spend(15); S.composure = clamp(S.composure + 10, 0, 100); S.haze = Math.max(0, S.haze - 1); A.sfx('pour'); say([['narrator', 'Office coffee: hot, black, and a little like an apology. Your head clears.']]); }
function smoke() { spend(15); S.composure = clamp(S.composure + 15, 0, 100); A.sfx('lighter'); say([['narrator', 'You light a Lucky Strike by the window and watch the smoke climb toward the ceiling, the way all good ideas do.']]); }
function phone() {
  if (!OF.ring) { say([['narrator', 'The telephone is quiet. It always is when you want it to ring.']]); return; }
  const ev = OF.ring; OF.ring = null;
  say(ev.lines, () => applyFx(ev.fx));
}
function talkTo(n) {
  if (n.kind === 'extra') { say([['narrator', '"' + n.data.idle[0] + '"']]); return; }
  const d = n.data, tk = d.talk, done = S.talked[n.id];
  n.gest = 2.5;
  if (!tk || done) { const lines = d.idle || ['...']; const t = lines[(S.minute + n.id.length) % lines.length]; say([[n.id, t]]); return; }
  const choices = tk.choices.filter(c => !c.cond || c.cond(S));
  say(tk.lines.map(t => [n.id, t]), null, choices, i => {
    const c = choices[i]; S.talked[n.id] = true;
    game.after(.05, () => say(c.lines.map(l => Array.isArray(l) ? l : [n.id, l]), () => applyFx(c.fx, n.id)));
  });
}

/* ---- events on the clock (a telephone, a visitor) and the pitch at its hour ---- */
function checkEvents() {
  const D = dayData();
  for (let i = 0; i < D.events.length; i++) {
    const ev = D.events[i], k = D.id + ':' + i;
    if (OF.fired[k] || S.minute < ev.at || (ev.cond && !ev.cond(S))) continue;
    OF.fired[k] = true;
    if (ev.kind === 'phone') { OF.ring = Object.assign({}, ev, { at: S.minute }); toast('THE TELEPHONE IS RINGING', 'In your office', '#e8c36a'); }
    else say(ev.lines, () => applyFx(ev.fx));
    return true;
  }
  return false;
}

/* ---- HERO movement: the stick (screen directions through the view) or a click's walk around the furniture ---- */
function heroMove(dt) {
  const I = game.input, h = OF.hero;
  let m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
  if (OF.auto) { const a = OF.auto(dt); if (a) d = a; }
  const pushing = Math.hypot(d[0], d[1]) > .1;
  if (pushing && !OF.auto) OF.goal = null;
  if (!pushing && OF.goal) {
    const g = OF.goal; OF.flow.update(g.x, g.y);
    const dist = Math.hypot(g.x - h.x, g.y - h.y);
    if (dist < (g.spot ? 22 : 6)) { const s = g.spot; OF.goal = null; if (s) useSpot(s); }
    else {
      const w = OF.flow.dir(h.x, h.y, g.x, g.y); d = [w[0], w[1]];
      // furniture in the way: slide along it (a quarter turn, the side nearer the goal), then give up after a while
      h.stuck = Math.hypot(h.vx, h.vy) < 20 && (h.stuckT || 0) > .1 ? (h.stuck || 0) + dt : Math.max(0, (h.stuck || 0) - dt * .5);
      h.stuckT = (h.stuckT || 0) + dt;
      if (h.stuck > .25) { const side = Math.sin(game.time * .7) > 0 ? 1 : -1; d = [-w[1] * side * .9 + w[0] * .3, w[0] * side * .9 + w[1] * .3]; }
      if (h.stuck > 3) { OF.goal = null; h.stuck = 0; }
    }
  } else { h.stuck = 0; h.stuckT = 0; }
  const sp = (I.down('run') || (OF.goal && OF.goal.far)) ? 112 : 72, l = Math.hypot(d[0], d[1]);
  h.vx = l > .05 ? d[0] / Math.max(1, l) * sp : 0; h.vy = l > .05 ? d[1] / Math.max(1, l) * sp : 0;
  if (l < .05 && Math.abs(m[0]) + Math.abs(m[1]) > 0) { h.vx = d[0] * sp; h.vy = d[1] * sp; }
  if (OF.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, OF.map);   // (the attract mode cheats: no clip)
  if (Math.hypot(h.vx, h.vy) > 5) h.facing = Math.atan2(h.vy, h.vx);
  OF.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, expr: S.composure < 25 ? 'wince' : null });
}
function useSpot(s) { if (s.kind === 'npc' || s.kind === 'extra') talkTo(s); else s.use(); }
// what's in reach: the nearest person or hotspot in front of the hero
function nearest() {
  const h = OF.hero; let best = null, bd = 30;
  for (const s of [...OF.npcs, ...OF.spots]) {
    const d = Math.hypot(s.x - h.x, s.y - h.y);
    const ahead = Math.cos(Math.atan2(s.y - h.y, s.x - h.x) - h.facing) > -.2;
    if (d < bd && (ahead || d < 16)) { bd = d; best = s; }
  }
  return best;
}
const SHORT = { jack: 'Jack', monty: 'Monty', ruth: 'Ruth', dolores: 'Dolores', theo: 'Theo', eddie: 'Eddie', bell: 'Mr. Bellweather', joyce: 'Joyce', marcy: 'Marcy', peg: 'Peg', lenny: 'Lenny' };
const spotLabel = s => s.kind === 'npc' ? (S.talked[s.id] || !s.data.talk ? 'Chat with ' : 'Talk to ') + (SHORT[s.id] || s.id) + (s.data.talk && !S.talked[s.id] ? ' (takes time)' : '')
  : s.kind === 'extra' ? 'Chat' : s.label();

/* ---- people's update: the mail boy walks, everyone turns to the hero, gestures while talking, shifts weight ---- */
function updatePeople(dt) {
  const h = OF.hero;
  for (const n of OF.npcs) {
    if (n.path) {
      const tgt = at(...n.path[(n.seg + 1) % n.path.length]), dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
      const near = Math.hypot(h.x - n.x, h.y - n.y) < 20 || talk.open;
      if (d < 2) n.seg = (n.seg + 1) % (n.path.length - 1);
      const sp = near ? 0 : 34; n.vx = dx / (d || 1) * sp; n.vy = dy / (d || 1) * sp; n.x += n.vx * dt; n.y += n.vy * dt;
      if (sp) n.face = Math.atan2(dy, dx);
    }
    const dh = Math.hypot(h.x - n.x, h.y - n.y);
    const want = dh < 44 ? Math.atan2(h.y - n.y, h.x - n.x) : n.face;
    n.look = E.approachAng(n.look, want, dt * 5);
    n.poseT -= dt; n.gest = Math.max(0, n.gest - dt);
    if (n.poseT < 0) { n.pose = E.chance(.4) ? E.pick(['hips', null, null]) : null; n.poseT = 3 + Math.random() * 4; }
    const talking = talk.open && voiceOn === (CAST[n.id] && CAST[n.id].voice) && speakerOf(n.id).portrait === talk.portrait;
    const pose = talking && talk.typing ? (Math.sin(game.time * 3 + n.x) > .3 ? 'wave' : 'hips') : n.pose;
    n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: n.vx || 0, vy: n.vy || 0, facing: n.look, pose, expr: talking ? 'smile' : null });
  }
}

/* ---- THE OFFICE SCENE ---- */
const officeScene = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: KEYS, res: 'ps1', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data) {
    buildOffice(); OF.map = OFF.map; OF.flow = OFF.flow;
    const fresh = !data || !data.resume;
    if (fresh) {
      const D = dayData();
      Object.assign(S, { minute: D.start, pitchAt: D.pitchAt, insights: [], intel: [], deck: [], talked: {}, used: {} });
      OF.fired = {}; OF.ring = null; OF.toasts = []; OF.queue = [];
      if (!S.demo && !HUB) game.saves.save('auto');
    }
    spawnPeople();
    const st = data && data.at || at(21.5, 25.6);
    OF.hero = OF.hero || new E.Body({ x: st.x, y: st.y, r: 5 });
    Object.assign(OF.hero, { x: st.x, y: st.y, vx: 0, vy: 0, facing: -Math.PI / 2 });
    OF.rig = rigOf('jack'); OF.goal = null; OF.journal = false; OF.overT = 0; OF.busy = false;
    game.follow(OF.hero, { z: 14 }); game.cam.bounds = v => OF.map.bounds(v);
    L.enabled = true; L.ambient = .72;
    E.style.propSize = 1.3;
    music('lounge');
    if (fresh) {
      A.sfx('elevator');
      game.after(.6, () => say(dayData().morning, () => { if (S.day === 0 && !S.flags.tutorial) { S.flags.tutorial = true; tutorial(); } }));
    }
  },
  exit() { talk.close(); OF.auto = null; },
  update(dt) {
    const I = game.input;
    OF.toasts.forEach(t => t.t += dt); OF.toasts = OF.toasts.filter(t => t.t < 3.6);
    if (I.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (OF.journal) { if (I.pressed('journal') || I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { OF.journal = false; I.consumeAll(); A.sfx('cancel'); } updatePeople(dt); return; }
    const open = talk.update(dt); speak(talk);
    if (open) { updatePeople(dt); OF.rig.update(dt, { x: OF.hero.x, y: OF.hero.y, z: 0, vx: 0, vy: 0, facing: OF.hero.facing, pose: talk.name === CAST.jack.name ? 'hips' : null }); return; }
    if (OF.queue.length) { OF.queue.shift()(); return; }
    // the hour of the pitch: they're here, ready or not
    if (S.minute >= S.pitchAt) { say([['dolores', clientData().company + ' is here, Mr. Calloway. In the conference room.']], () => S.deck.length ? beginPitch() : openBrainstorm(true)); return; }
    if (checkEvents()) return;
    if (S.composure <= 0) { S.composure = 35; spend(60); game.flash('#000', .6, 1); say([['narrator', 'The room tilts. You close your office door, lie on the floor and breathe until it stops. An hour is gone.']]); return; }
    if (I.pressed('journal')) { OF.journal = true; A.sfx('pause'); return; }
    heroMove(dt); updatePeople(dt);
    OF.room = roomAt(OF.hero.x, OF.hero.y);
    // overheard talk: stand near the pair for a moment
    const oh = dayData().overhear;
    if (oh && !S.used.overhear) {
      const a = OF.npcs.find(n => n.id === oh.a), b = OF.npcs.find(n => n.id === oh.b);
      const mid = a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
      if (mid && Math.hypot(OF.hero.x - mid.x, OF.hero.y - mid.y) < 40 && Math.hypot(OF.hero.vx, OF.hero.vy) < 20) { OF.overT += dt; if (OF.overT > 2) { S.used.overhear = true; OF.overT = 0; say(oh.lines.map(t => ['narrator', t]), () => { if (oh.card) gainCard(oh.card); if (oh.flag) S.flags[oh.flag] = true; }); } }
      else OF.overT = Math.max(0, OF.overT - dt * 2);
    }
    // the mouse: hover moves the focus to a person or a thing; a click walks there and uses it, or walks to the floor
    const p = I.pointer();
    OF.hover = null;
    if (p && dev() === 'mouse') { let bd = 18; for (const s of [...OF.npcs, ...OF.spots]) { const q = s.sp; if (!q) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; OF.hover = s; } } }
    const c = I.clicked();
    if (c && !OF.auto) {
      if (OF.hover) OF.goal = { x: OF.hover.x, y: OF.hover.y, spot: OF.hover, far: true };
      else { const g = game.mouseGround(); if (g && OF.map.walkable(Math.floor(g[0] !== undefined ? g[0] / T : g.x / T), Math.floor(g[1] !== undefined ? g[1] / T : g.y / T))) OF.goal = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y, far: true }; }
      if (OF.goal) A.sfx('select', { vol: .4 });
    }
    const n = OF.hover && dev() === 'mouse' ? OF.hover : nearest();
    OF.prompt = n ? { s: n, label: spotLabel(n) } : null;
    if (I.pressed('interact') && n && Math.hypot(n.x - OF.hero.x, n.y - OF.hero.y) < 34) { I.consumeAll(); useSpot(n); }
  },
  draw(r) {
    OF.map.drawFloor(r); OF.map.queueWalls(r);
    drawFurniture(r); officeLights();
    // the ringing phone and the hover ring
    if (OF.ring) { const k = Math.sin(game.time * 20) > 0; r.textAt(38.2 * T, 2.4 * T, 30, k ? '♪ RING ♪' : '♪ ring ♪', '#ffe08a'); if (Math.floor(game.time * 1.2) !== OF._rng) { OF._rng = Math.floor(game.time * 1.2); A.sfx('ring', { vol: .6 }); } }
    const tgt = OF.prompt && OF.prompt.s;
    if (tgt) r.decal(() => r.groundRing(tgt.x, tgt.y, 9 + Math.sin(game.time * 4), '#e8c36a', .7));
    if (OF.goal && !OF.goal.spot) r.decal(() => r.groundRing(OF.goal.x, OF.goal.y, 5, '#ffffff', .5));
    // the overheard pair: a soft ring while listening
    if (OF.overT > 0) { const oh = dayData().overhear, a = OF.npcs.find(n => n.id === oh.a); if (a) r.textAt(a.x, a.y, 52, 'listening' + '.'.repeat(1 + Math.floor(OF.overT * 2) % 3), '#c8e0ff'); }
    for (const n of OF.npcs) {
      r.shadow(n.x, n.y, 6, .3, '#1a1020');
      r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { xray: false, every: n.kind === 'extra' ? 2 : 1, key: n });
      n.sp = r.w(n.x, n.y, 18);
      if (n.kind === 'npc' && n.data.talk && !S.talked[n.id]) r.textAt(n.x, n.y, 50 + Math.sin(game.time * 3) * 1.5, '!', '#ffd36a');
    }
    for (const s of OF.spots) s.sp = r.w(s.x, s.y, 12);
    const h = OF.hero; r.shadow(h.x, h.y, 6, .35, '#1a1020');
    r.actor(h.x, h.y, h.z, (g, ox, oy) => OF.rig.draw(g, ox, oy, r.view), { xray: { color: '#e8c36a' } });
    r.overlay(g => drawOfficeHud(g, r));
    talk.draw(r);
    if (OF.journal) r.overlay(g => drawJournal(g, r));
  }
};

/* ---- HUD: big, sparse, readable from the sofa ---- */
function drawOfficeHud(g, r) {
  const D = dayData(), C = clientData();
  panel(g, 6, 6, 128, 44, { alpha: .85 });
  txt(g, D.title + '  ' + clockStr(S.minute), 12, 11, COL.ink);
  txt(g, 'Pitch at ' + clockStr(S.pitchAt), 12, 21, S.pitchAt - S.minute <= 60 ? '#ff9a7a' : COL.dim);
  txt(g, 'COMPOSURE', 12, 32, COL.dim, { font: 'tiny' });
  E.ui.bar(g, 52, 32, 76, 5, S.composure / 100, S.composure < 30 ? '#d8483a' : '#5ab0a8');
  txt(g, 'HAZE ' + (S.haze ? '•'.repeat(S.haze) : '-'), 12, 40, S.haze ? '#e8a060' : COL.dim, { font: 'tiny' });
  txt(g, 'INSIGHTS ' + S.insights.length + (S.intel.length ? '  INTEL ' + S.intel.length : ''), 60, 40, COL.gold, { font: 'tiny' });
  // the objective, top centre (clear of the corner's buttons)
  const obj = S.deck.length ? 'The campaign is written. Go to the conference room.' : S.insights.length >= 3 ? 'Write the campaign at your typewriter, or keep digging.' : 'Gather insights for ' + C.company + '.';
  txt(g, obj, Math.round(r.W / 2) + 30, 9, '#f4ead8', { align: 'center' });
  if (OF.room) txt(g, ROOMS[OF.room].name, Math.round(r.W / 2) + 30, 19, COL.dim, { align: 'center', font: 'tiny' });
  // the prompt, bottom centre
  if (OF.prompt && !talk.open) {
    const s = key('interact') + '  ' + OF.prompt.label, w = E.font.width(s) + 16, x = Math.round((r.W - w) / 2), y = r.H - 24;
    panel(g, x, y, w, 16, { alpha: .9 }); txt(g, s, x + 8, y + 5, COL.ink);
  } else if (!talk.open) {
    const s = (dev() === 'gamepad' ? 'L stick' : dev() === 'mouse' ? 'Click to walk' : 'WASD') + ' move   ' + key('run') + ' hurry   ' + key('journal') + ' the deck   ' + key('view') + ' view';
    txt(g, s, Math.round(r.W / 2), r.H - 12, '#c8bca8', { align: 'center' });
  }
  // toasts (insights, rapport)
  OF.toasts.slice(-3).forEach((t, i) => {
    const a = Math.min(1, t.t * 4, (3.6 - t.t) * 2), w = 190, x = Math.round(r.W - w - 8 + (1 - a) * 40), y = 66 + i * 30;
    panel(g, x, y, w, 26, { alpha: .9, border: t.color }); txt(g, t.title, x + 6, y + 4, t.color); txt(g, t.text, x + 6, y + 15, COL.ink, { font: 'tiny' });
  });
}
function drawCard(g, x, y, id, o = {}) {   // compact: angle, power, title; full: and the line it adds to the tagline
  const c = CARDS[id], A_ = ANGLES[c.angle], w = o.w || 98, h = o.h || (o.full ? 76 : 42);
  panel(g, x, y, w, h, { bg: o.sel ? ['#fff8e0', '#e8d8a8'] : ['#efe6cc', '#cfc0a0'], border: o.focus ? '#ffffff' : A_.color, gradient: true });
  px.rect(g, x + 2, y + 2, w - 4, 11, A_.dark);
  E.font.text(g, A_.icon + ' ' + A_.name, x + 5, y + 4, A_.color, { outline: false });
  E.font.text(g, '★'.repeat(c.power), x + w - 5, y + 4, '#f4e0a0', { outline: false, align: 'right' });
  E.font.text(g, c.title, x + 5, y + 16, COL.paperInk, { outline: false, wrap: w - 10 });
  if (o.full) E.font.text(g, '"' + c.line + '"', x + 5, y + 38, '#6a4a2a', { outline: false, wrap: w - 10 });
  if (o.sel) { px.rect(g, x + w - 13, y + h - 13, 10, 10, '#2a7a3a'); E.font.text(g, '✓', x + w - 11, y + h - 12, '#ffffff', { outline: false }); }
}
function knownWants() {
  const C = clientData(), k = {};
  for (const id of S.intel) Object.assign(k, INTEL[id].reveals);
  return k;
}
function drawJournal(g, r) {
  const C = clientData(), D = dayData(), W = Math.min(r.W - 20, 420), x0 = Math.round((r.W - W) / 2), y0 = 14;
  px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201810'));
  panel(g, x0, y0, W, r.H - 28);
  txt(g, 'THE DECK  -  ' + D.date, x0 + 10, y0 + 8, COL.gold);
  txt(g, C.company + ': ' + C.product, x0 + 10, y0 + 20, COL.ink);
  txt(g, C.brief || '', x0 + 10, y0 + 30, COL.dim, { wrap: W - 20 });
  const kw = knownWants(), ks = Object.keys(kw);
  txt(g, ks.length ? 'What they really want: ' + ks.map(a => (kw[a] > 0 ? '+' : '-') + ' ' + ANGLES[a].icon + ' ' + a).join('   ') : 'What they really want: unknown. Ask around.', x0 + 10, y0 + 50, ks.length ? '#9ad0ff' : COL.dim, { wrap: W - 20 });
  const cols = Math.max(1, Math.floor((W - 20) / 102));
  S.insights.forEach((id, i) => drawCard(g, x0 + 10 + (i % cols) * 102, y0 + 66 + Math.floor(i / cols) * 48, id, { w: 98 }));
  if (!S.insights.length) txt(g, 'No insights yet. Talk to people. Look at things. Listen.', x0 + 10, y0 + 76, COL.dim);
  const rp = Object.keys(S.rapport).map(k => SHORT[k].replace('Mr. ', '').toUpperCase() + ' ' + (S.rapport[k] >= 0 ? '♥'.repeat(S.rapport[k]) || '-' : '×'.repeat(-S.rapport[k]))).join('   ');
  txt(g, rp, x0 + 10, r.H - 40, COL.dim, { font: 'tiny', wrap: W - 20 });
  txt(g, key('journal') + ' close', x0 + W - 10, r.H - 26, COL.ink, { align: 'right' });
}

function tutorial() {
  say([['narrator', 'Walk with ' + (dev() === 'gamepad' ? 'the left stick' : 'WASD or the arrows') + ', or click the floor. ' + key('interact') + ' talks to people and uses things. A gold ! means someone has something for you.'],
    ['narrator', 'Conversations and looking around cost time. The pitch is at ' + clockStr(S.pitchAt) + '. Collect INSIGHTS, then write the campaign at the typewriter in your office (top right).'],
    ['narrator', 'Drinks steady your COMPOSURE but add HAZE, which makes the pitch harder to deliver. Coffee and a nap clear it. ' + key('journal') + ' opens your deck.']]);
}

/* ===== 30-brainstorm.js ===== */
/* MAD MEN OUT — the typewriter: choose up to three insights for the campaign. Cards that share an angle make a
 * through-line (+1 power each). The tagline types itself as you choose. Keys or pad move the focus, the mouse hovers it,
 * confirm or a click picks; the bottom row has TAKE IT TO THE CLIENT and NOT YET. */
CARDS.wing = { title: 'Pure Charm', angle: 'STATUS', power: 1, line: 'Trust me.', from: 'You', text: 'No idea, no research. Just the suit and the smile.' };
const BR = { cards: [], sel: [], focus: 0, forced: false, ctx: null, typed: 0, timer: 0, pick: null, dlg: null };
function openBrainstorm(forced, ctx) {
  BR.forced = !!forced; BR.ctx = ctx || null;
  BR.cards = ctx ? ctx.hand.slice() : S.insights.slice();
  BR.sel = ctx ? [] : S.deck.filter(id => BR.cards.includes(id));
  BR.focus = 0; BR.typed = 0; BR.timer = ctx && ctx.seconds || 0;
  game.go('brainstorm', null, { fade: 'dissolve', seconds: .35 });
}
const synergy = ids => { const n = {}; ids.forEach(id => { const a = CARDS[id].angle; n[a] = (n[a] || 0) + 1; }); return n; };
const tagline = ids => ids.length ? ids.map(id => CARDS[id].line).join(' ') : '(a blank page)';
function brItems() {   // focusable: the cards, then the two buttons
  const it = BR.cards.map((id, i) => ({ kind: 'card', id, i }));
  it.push({ kind: 'go', label: BR.sel.length ? 'TAKE IT TO THE CLIENT' : (BR.cards.length ? 'CHOOSE UP TO THREE' : 'WING IT') });
  if (!BR.forced && !BR.ctx) it.push({ kind: 'back', label: 'NOT YET' });
  return it;
}
function brLayout(r) {
  const n = BR.cards.length, cw = 98, ch = 42, cols = clamp(Math.floor((r.W - 24) / (cw + 6)), 1, 5), rows = Math.ceil(n / cols);
  const x0 = Math.round((r.W - (Math.min(n, cols) * (cw + 6) - 6)) / 2), y0 = 56;
  const pos = BR.cards.map((id, i) => [x0 + (i % cols) * (cw + 6), y0 + Math.floor(i / cols) * (ch + 6), cw, ch]);
  const by = y0 + Math.max(1, rows) * (ch + 6) + 2;
  const sheetY = by + 24;
  const bw = 150, gap = 10, nb = (!BR.forced && !BR.ctx) ? 2 : 1, bx = Math.round((r.W - (nb * bw + (nb - 1) * gap)) / 2);
  const btn = [[bx, by, bw, 18], [bx + bw + gap, by, bw, 18]];
  return { pos, btn, cols, sheetY };
}
let brL = null;
function brConfirm() {
  const it = brItems()[BR.focus]; if (!it) return;
  if (it.kind === 'card') {
    const k = BR.sel.indexOf(it.id);
    if (k >= 0) { BR.sel.splice(k, 1); A.sfx('cancel'); }
    else if (BR.sel.length < 3) { BR.sel.push(it.id); A.sfx('type'); BR.typed = 0; }
    else { A.sfx('bump'); game.note('THREE IS A CAMPAIGN. FOUR IS A MEMO.'); }
  } else if (it.kind === 'go') brDone();
  else if (it.kind === 'back') { A.sfx('cancel'); game.go('office', { resume: true, at: at(34.6, 4.2) }, { fade: 'dissolve', seconds: .3 }); }
}
function brDone() {
  const deck = BR.sel.length ? BR.sel.slice() : (BR.cards.length ? [BR.cards[0]] : ['wing']);
  A.sfx('carriage');
  if (BR.ctx) { BR.ctx.deck = deck; startPitch(BR.ctx); return; }
  S.deck = deck;
  if (BR.forced) beginPitch();
  else { spend(30); game.go('office', { resume: true, at: at(34.6, 4.2) }, { fade: 'dissolve', seconds: .3 }); toast('THE CAMPAIGN IS WRITTEN', '"' + tagline(deck) + '"', COL.gold); }
}
const brainstormScene = {
  view: 'threequarter', input: KEYS, res: 'ps1', touch: [], pausable: true,
  enter() { L.enabled = false; game.follow(null); music(BR.ctx ? 'pitch' : 'lounge'); BR.pick = null; },
  update(dt) {
    const I = BR.ctx && BR.ctx.input || game.input, items = brItems();
    BR.typed += dt * 26;
    if (BR.ctx && BR.timer > 0) { BR.timer -= dt; if (BR.timer <= 0) { if (!BR.sel.length) BR.sel = BR.cards.slice(0, 3); brDone(); return; } }
    if (BR.ctx && BR.ctx.auto) { BR.ctx.auto(dt); }
    const L_ = brL || (brL = brLayout({ W: game.W, H: game.H }));
    const cols = L_.cols, n = BR.cards.length;
    const mv = (d) => { BR.focus = clamp(BR.focus + d, 0, items.length - 1); A.sfx('blip', { vol: .4 }); };
    if (I.repeat('right')) mv(1); if (I.repeat('left')) mv(-1);
    if (I.repeat('down')) { if (BR.focus < n) mv(Math.min(cols, Math.max(1, n - BR.focus))); else mv(1); }
    if (I.repeat('up')) { if (BR.focus >= n) BR.focus = Math.max(0, n - 1); else mv(-cols); }
    // the mouse: hover focuses, click picks
    const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    const hit = q => { if (!q) return -1; for (let i = 0; i < L_.pos.length; i++) if (hitRect(q, ...L_.pos[i])) return i; for (let j = 0; j < 2; j++) if (hitRect(q, ...L_.btn[j]) && items[n + j]) return n + j; return -1; };
    if (p && I.lastDevice === 'mouse') { const h = hit(p); if (h >= 0 && h !== BR.focus) BR.focus = h; }
    if (c) { const h = hit(c); if (h >= 0) { BR.focus = h; brConfirm(); return; } }
    if (I.pressed('confirm')) { I.consumeAll(); brConfirm(); return; }
    if (I.pressed('journal') && BR.sel.length) { BR.focus = n; }
    if (I.pressed('cancel') && !BR.forced && !BR.ctx) { BR.focus = items.length - 1; brConfirm(); }
  },
  draw(r) {
    brL = brLayout(r);
    r.sky(['#1a120c', '#2e2016', '#3a2a1c']);
    const C = BR.ctx ? CLIENTS[BR.ctx.client] : clientData(), I = BR.ctx && BR.ctx.input || game.input;
    r.overlay(g => {
      // the desk: a walnut grain across the bottom, lamp light
      for (let y = Math.round(r.H * .55); y < r.H; y += 2) px.rect(g, 0, y, r.W, 1, (y >> 1) & 1 ? '#3a2416' : '#43291a');
      r.glowDisc(g, r.W * .78, 30, 120, '#ffd890', .25);
      E.font.title(g, BR.ctx ? 'THE PITCH GAUNTLET' : 'THE CAMPAIGN', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#b0802a'], depth: 2 });
      txt(g, C.company + ' - ' + C.product, r.W / 2, 30, COL.ink, { align: 'center' });
      const kw = BR.ctx ? {} : knownWants(), ks = Object.keys(kw);
      txt(g, ks.length ? 'They really want: ' + ks.map(a => (kw[a] > 0 ? '+' : '-') + ANGLES[a].icon + ' ' + a).join('  ') : (BR.ctx ? 'Read the client in the room. ' : 'The brief: ') + (C.brief || C.tells[0]), r.W / 2, 42, ks.length ? '#9ad0ff' : COL.dim, { align: 'center', font: ks.length ? undefined : 'tiny', wrap: r.W - 30 });
      if (BR.ctx && BR.timer > 0) txt(g, Math.ceil(BR.timer) + 's', r.W - 10, 10, BR.timer < 6 ? '#ff7a6a' : COL.ink, { align: 'right', scale: 2 });
      if (BR.ctx && BR.ctx.label) txt(g, BR.ctx.label, 10, 10, BR.ctx.color || COL.gold);
      if (!BR.cards.length) txt(g, 'You have nothing. You will have to go in on charm alone.', r.W / 2, 90, '#ff9a7a', { align: 'center' });
      const syn = synergy(BR.sel), items = brItems();
      BR.cards.forEach((id, i) => { const [x, y, w, h] = brL.pos[i]; drawCard(g, x, y, id, { w, h, sel: BR.sel.includes(id), focus: BR.focus === i });
        if (BR.sel.includes(id) && syn[CARDS[id].angle] > 1) E.font.text(g, '+1', x + w - 28, y + h - 11, '#2a7a3a', { outline: false });
        if (BR.focus === i) px.rect(g, x - 2, y + h + 1, w + 4, 2, '#ffffff'); });
      items.slice(BR.cards.length).forEach((it, j) => { const [x, y, w, h] = brL.btn[j], f = BR.focus === BR.cards.length + j;
        panel(g, x, y, w, h, { bg: f ? ['#e8c36a', '#b08a3a'] : COL.panel, border: f ? '#ffffff' : COL.border }); txt(g, (f ? '▸ ' : '') + it.label, x + w / 2, y + 6, f ? '#1a120c' : COL.ink, { align: 'center', shadow: f ? false : COL.shadow }); });
      // the sheet in the typewriter
      const sw = Math.min(r.W - 40, 360), sx = Math.round((r.W - sw) / 2), sy = brL.sheetY, sh = Math.max(30, r.H - sy - 22);
      px.rect(g, sx, sy, sw, sh, '#f4eedd'); px.rect(g, sx, sy, sw, 1, '#ffffff'); px.rect(g, sx + sw, sy + 2, 2, sh, '#1a120c');
      const full = (BR.sel.length ? C.company.split(' ')[0].toUpperCase() + '. ' : '') + tagline(BR.sel), shown = full.slice(0, Math.floor(BR.typed));
      const tl = E.font.text(g, shown + (Math.floor(game.real * 2) % 2 ? '_' : ''), sx + 8, sy + 5, '#2a2420', { outline: false, wrap: sw - 16 });
      const fc = items[BR.focus] && items[BR.focus].kind === 'card' ? CARDS[items[BR.focus].id] : null;
      if (fc && sh > tl.h + 18) E.font.text(g, '"' + fc.line + '"  ' + (fc.from ? fc.from + ': ' : '') + (fc.text || ''), sx + 8, sy + tl.h + 9, '#6a5a48', { outline: false, wrap: sw - 16 });
      const thr = Object.keys(syn).filter(a => syn[a] > 1);
      if (thr.length) E.font.text(g, 'Through-line: ' + thr.map(a => ANGLES[a].icon + ' ' + a).join(', ') + ' (+1 power each)', sx + 8, sy + sh - 10, '#2a6a3a', { outline: false, font: 'tiny' });
      const hint = (I.lastDevice === 'mouse' ? 'Click' : keyOf(I, 'confirm')) + ' choose' + (!BR.forced && !BR.ctx ? '   ' + keyOf(I, 'cancel') + ' not yet' : '');
      txt(g, hint, r.W / 2, r.H - 12, '#c8bca8', { align: 'center' });
    });
  }
};

/* ===== 40-pitch.js ===== */
/* MAD MEN OUT — the pitch: the conference room, the client across the table, three slides and the close.
 * Each slide: choose a card (read the client's tell), deliver it on the timing meter (composure widens the window, haze
 * speeds the needle), see how it lands (an angle the client wants lands double, one they fear backfires), pivot out of a
 * bad one with composure. Then the close: a monologue delivered on four beats. Interest past the line wins the account. */
const MULT = { 2: 1.6, 1: 1, 0: .5, '-1': -.6 };
const PT = { ctx: null, phase: 'hello', t: 0, interest: 20, shown: 0, left: [], focus: 0, cur: null, needle: 0, zone: [.4, .6], hit: null, delta: 0,
  wants: null, people: [], reacts: {}, beat: 0, beats: [], beatT: 0, closeHits: [], line: '', lineT: 0, verdict: null, pleased: {}, log: [], dlg: false };
function beginPitch() {
  const D = dayData();
  startPitch({ mode: 'story', client: D.client, deck: S.deck.slice(), composure: S.composure, haze: S.haze, close: D.close, onDone: storyPitchDone, cheat: S.demo, auto: S.demo ? demoPitchAuto : null });
}
function startPitch(ctx) {
  const C = CLIENTS[ctx.client];
  Object.assign(PT, { ctx, phase: 'hello', t: 0, interest: 20, shown: 0, left: ctx.deck.slice(), focus: 0, cur: null, hit: null, delta: 0, verdict: null, log: [], closeHits: [], beat: 0, line: '', lineT: 0, pleased: {}, dlg: false });
  PT.wants = Object.assign({}, C.wants); PT.split = C.split ? JSON.parse(JSON.stringify(C.split)) : null;
  PT.people = C.people.slice(); PT.reacts = {}; PT.people.forEach(p => { PT.reacts[p] = { expr: null, t: 0 }; PT.pleased[p] = 0; });
  PT.composure = ctx.composure !== undefined ? ctx.composure : 70; PT.haze = ctx.haze || 0;
  const rnd = ctx.rng || Math.random, dirs = ['up', 'right', 'down', 'left'];
  PT.beats = Array.from({ length: 4 }, () => dirs[Math.floor(rnd() * 4)]);
  PT.closeLines = ctx.close || ['This isn\'t about ' + C.product + '.', 'It\'s about the person they want to be', 'when nobody is watching,', 'and when everybody is.'];
  game.go('pitch', null, { fade: 'iris', seconds: .5 });
}
const presenter = () => PT.ctx && PT.ctx.presenter || 'jack';
const pInput = () => PT.ctx && PT.ctx.input || game.input;
// how much a card lands with the client (or both clients, averaged)
function landOf(id, deck) {
  const c = CARDS[id], same = deck.filter(d => d !== id && CARDS[d].angle === c.angle).length;
  const power = c.power + (same ? 1 : 0), m = a => MULT[clamp(Math.round(a[c.angle] || 0), -1, 2)];
  if (PT.split) { const ms = Object.keys(PT.split).map(k => m(PT.split[k])); return { power, mult: ms.reduce((a, b) => a + b, 0) / ms.length, per: Object.keys(PT.split).map((k, i) => [k, ms[i]]) }; }
  return { power, mult: m(PT.wants), per: PT.people.map(p => [p, m(PT.wants)]) };
}
function meterWidth() { return clamp(.12 + PT.composure / 100 * .16 + (game.settings.meterAssist ? .1 : 0) + (PT.ctx.cheat ? .3 : 0), .1, .6); }
function setPhase(ph) { PT.phase = ph; PT.t = 0; }
function chooseCard(i) {
  PT.cur = PT.left.splice(i, 1)[0]; PT.focus = 0; A.sfx('card');
  const w = meterWidth(), c = .3 + Math.random() * .4; PT.zone = [c - w / 2, c + w / 2]; PT.needle = 0;
  setPhase('deliver');
}
function deliver() {
  const n = PT.needle, [a, b] = PT.zone, mid = (a + b) / 2, half = (b - a) / 2, d = Math.abs(n - mid);
  PT.hit = d < half * .35 ? 'PERFECT' : d < half ? 'GOOD' : 'FLAT';
  const dm = { PERFECT: 1.3, GOOD: 1, FLAT: .55 }[PT.hit];
  const L_ = landOf(PT.cur, PT.ctx.deck);
  PT.delta = Math.round(L_.power * 8 * L_.mult * dm);
  PT.interest = clamp(PT.interest + PT.delta, 0, 130);
  for (const [p, m] of L_.per) { PT.reacts[p] = { expr: m >= 1 ? 'smile' : m > 0 ? null : 'angry', t: 2 }; if (m >= 1) PT.pleased[p]++; }
  PT.log.push({ card: PT.cur, hit: PT.hit, delta: PT.delta });
  A.sfx(PT.hit === 'PERFECT' ? 'perfect' : PT.hit === 'GOOD' ? 'good' : 'flat');
  if (PT.delta >= 20) { game.flash('#fff0c0', .08, .4); A.sfx('gasp'); }
  if (PT.delta < 0) game.shake(2);
  if (pInput().rumble) pInput().rumble(PT.hit === 'PERFECT' ? .5 : .2, .15);
  setPhase('react');
}
function afterReact() {
  if (PT.delta < 0 && PT.composure >= 25 && !PT.pivoted) { setPhase('pivot'); return; }
  nextSlide();
}
function nextSlide() {
  PT.pivoted = false; PT.cur = null; PT.shown++;
  const C = CLIENTS[PT.ctx.client];
  if (C.turn && PT.shown === C.turn.after && PT.left.length && !PT.turned) {
    PT.turned = true; Object.assign(PT.wants, C.turn.wants);
    PT.dlg = true; say([[C.turn.who, C.turn.line]], () => { PT.dlg = false; setPhase(PT.left.length && PT.shown < 3 ? 'choose' : 'closeIntro'); });
    setPhase('wait'); return;
  }
  setPhase(PT.left.length && PT.shown < 3 ? 'choose' : 'closeIntro');
}
function pivot() {
  PT.composure -= 25; PT.interest = clamp(PT.interest - PT.delta + 4, 0, 130); PT.pivoted = true; A.sfx('whoosh');
  PT.log[PT.log.length - 1].pivot = true;
  PT.dlg = true; say([[presenter(), E.pick(['Forget the slide. Let me tell you what I really think.', 'You\'re right. That\'s what everyone would say. Here\'s what nobody will.', 'Throw that one out. I wanted to see your face when you saw it.'])]], () => { PT.dlg = false; nextSlide(); });
  setPhase('wait');
}
function closeBeat(dir) {
  const due = PT.beatDur, e = PT.beatT - due, ae = Math.abs(e), want = PT.beats[PT.beat];
  let r = 'MISS';
  if (dir === want && ae < .1) r = 'PERFECT'; else if (dir === want && ae < .24) r = 'GOOD';
  PT.closeHits.push(r);
  const add = r === 'PERFECT' ? 4 : r === 'GOOD' ? 2 : 0;
  PT.interest = clamp(PT.interest + add, 0, 130); if (r === 'MISS') PT.composure = Math.max(0, PT.composure - 5);
  A.sfx(r === 'PERFECT' ? 'perfect' : r === 'GOOD' ? 'good' : 'flat', { vol: .7 });
  PT.flashR = { r, t: .6 };
  PT.beat++; PT.beatT = 0;
  if (PT.beat >= PT.beats.length) setPhase('verdict0');
}
function verdict() {
  const C = CLIENTS[PT.ctx.client];
  let bonus = 0;
  if (PT.split && Object.values(PT.pleased).every(v => v >= 1)) { bonus = 8; PT.bothNod = true; }
  PT.interest = clamp(PT.interest + bonus, 0, 130);
  const won = PT.interest >= C.need;
  const billings = won ? Math.round(C.value * clamp(PT.interest / 100, .6, 1.25) / 1000) * 1000 : 0;
  PT.verdict = { won, interest: PT.interest, need: C.need, billings, bonus };
  PT.people.forEach(p => PT.reacts[p] = { expr: won ? 'smile' : 'angry', t: 99 });
  music(won ? 'win' : 'lose');
  if (won) { A.sfx('applause'); game.flash('#fff4d0', .12, .5); for (let i = 0; i < 3; i++) game.after(i * .25, () => P.glints(19.5 * T, 3 * T, 30, 14, '#ffe08a')); }
  PT.dlg = true;
  say([[PT.people[0], won ? C.yes : C.no]], () => { PT.dlg = false; });
  setPhase('verdict');
}

/* ---- where everyone stands: the client(s) across the table, the presenter at the easel, colleagues at the end ---- */
function pitchCast() {
  const out = [], n = PT.people.length;
  PT.people.forEach((p, i) => out.push({ id: p, x: (19.5 + (i - (n - 1) / 2) * 3.4) * T, y: 3.25 * T, face: Math.PI / 2 }));
  out.push({ id: presenter(), x: 25.2 * T, y: 4.4 * T, face: Math.PI, me: true });
  if (PT.ctx.mode === 'story') { out.push({ id: 'monty', x: 13.6 * T, y: 4 * T, face: 0 }); if (S.rapport.ruth >= 0) out.push({ id: 'ruth', x: 13.8 * T, y: 6.6 * T, face: -.3 }); }
  if (PT.ctx.mode === 'versus') out.push({ id: PT.ctx.rival, x: 13.6 * T, y: 4.4 * T, face: 0 });
  return out;
}
const pitchScene = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'brawler', 'iso'], input: KEYS, res: 'ps1', touch: [],
  camera: { zoom: [.75, 2], start: 1.05 },
  enter() {
    buildOffice(); game.follow(null); game.cam.bounds = null;
    L.enabled = true; L.ambient = .5;
    music('pitch'); PT.cast = pitchCast();
    const C = CLIENTS[PT.ctx.client];
    PT.dlg = true;
    game.after(.5, () => say(C.hello.map((t, i) => [PT.people[Math.min(i, PT.people.length - 1)], t]), () => { PT.dlg = false; setPhase(PT.left.length ? 'choose' : 'closeIntro'); }));
  },
  exit() { talk.close(); },
  update(dt) {
    const I = pInput(), ctx = PT.ctx;
    PT.t += dt;
    game.focus(19.6 * T, 3.4 * T, 8);
    if (game.input.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (PT.flashR) { PT.flashR.t -= dt; if (PT.flashR.t <= 0) PT.flashR = null; }
    for (const c of PT.cast) {
      const rx = PT.reacts[c.id], talking = talk.open && talk.portrait === rigOf(c.id) && talk.typing;
      if (rx) rx.t -= dt;
      let pose = null, expr = rx && rx.t > 0 ? rx.expr : null;
      if (c.me) pose = PT.phase === 'deliver' ? 'cast' : PT.phase === 'close' ? (PT.beat % 2 ? 'wave' : 'cast') : PT.phase === 'verdict' && PT.verdict && PT.verdict.won ? 'cheer' : talking ? 'wave' : 'hips';
      else if (talking) pose = 'wave';
      else if (PT.phase === 'verdict' && PT.verdict && PT.verdict.won && (c.id === 'monty' || c.id === 'ruth')) pose = 'cheer';
      rigOf(c.id).update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.face, pose, expr: expr || (talking ? 'smile' : null) });
    }
    if (talk.update(dt)) { speak(talk); return; }
    speak(talk);
    if (PT.dlg) return;
    if (ctx.auto) ctx.auto(dt);
    const ph = PT.phase;
    if (ph === 'choose') {
      const n = PT.left.length;
      if (I.repeat('right')) { PT.focus = (PT.focus + 1) % n; A.sfx('blip', { vol: .4 }); }
      if (I.repeat('left')) { PT.focus = (PT.focus + n - 1) % n; A.sfx('blip', { vol: .4 }); }
      const p = I.pointer && I.pointer(), c = I.clicked && I.clicked(), boxes = PT.cardBoxes || [];
      if (p && I.lastDevice === 'mouse') boxes.forEach((b, i) => { if (hitRect(p, ...b)) PT.focus = i; });
      if (c) boxes.forEach((b, i) => { if (hitRect(c, ...b)) { PT.focus = i; chooseCard(i); } });
      if (PT.phase === 'choose' && I.pressed('confirm')) { I.consumeAll(); chooseCard(PT.focus); }
    } else if (ph === 'deliver') {
      const sp = (.75 + .28 * PT.haze) * (ctx.cheat ? .6 : 1);
      const u = (PT.t * sp) % 2; PT.needle = u < 1 ? u : 2 - u;
      if (Math.floor(PT.t * sp * 2) !== PT._tick) { PT._tick = Math.floor(PT.t * sp * 2); A.sfx('needle', { vol: .3 }); }
      if (PT.t > .25 && (I.pressed('confirm') || (I.clicked && I.clicked()))) { I.consumeAll(); deliver(); }
      else if (PT.t > 12) { PT.needle = 0; deliver(); }
    } else if (ph === 'react') { if (PT.t > 1.8 || (PT.t > .5 && I.pressed('confirm'))) { I.consumeAll(); afterReact(); } }
    else if (ph === 'pivot') {
      const c = I.clicked && I.clicked();
      if (I.pressed('pivot') || (c && PT.pivotBox && hitRect(c, ...PT.pivotBox[0]))) { I.consumeAll(); pivot(); }
      else if (I.pressed('confirm') || (c && PT.pivotBox && hitRect(c, ...PT.pivotBox[1])) || PT.t > 6) { I.consumeAll(); nextSlide(); }
    } else if (ph === 'closeIntro') { if (PT.t > 1.4) { setPhase('close'); PT.beat = 0; PT.beatT = 0; PT.beatDur = 1.15 / (1 + .15 * PT.haze); } }
    else if (ph === 'close') {
      PT.beatT += dt;
      const dirs = ['up', 'right', 'down', 'left'];
      for (const d of dirs) if (I.pressed(d) && PT.beatT > .25) { closeBeat(d); break; }
      if (PT.phase === 'close' && PT.beatT > PT.beatDur + .32) closeBeat(null);
    } else if (ph === 'verdict0') { if (PT.t > .8) verdict(); }
    else if (ph === 'verdict') { if (PT.t > 1.5 && (I.pressed('confirm') || (I.clicked && I.clicked()) || (ctx.auto && PT.t > 3.5))) { I.consumeAll(); setPhase('done'); ctx.onDone(PT.verdict, PT); } }
  },
  draw(r) {
    const M = OFF.map; M.drawFloor(r); M.queueWalls(r); drawFurniture(r);
    // the room dims for the pitch; a slide projector's warm beam lights the easel, the window the clients
    L.add(26.2 * T, 3.4 * T, 20, 70, .9, { color: '#fff0c8' }); L.add(19.5 * T, 3 * T, 30, 110, .55, { color: '#d8e4ff' }); L.add(19.5 * T, 6 * T, 20, 80, .35, { color: '#ffe0b0' });
    for (const c of PT.cast) { r.shadow(c.x, c.y, 6, .35, '#120a18'); r.actor(c.x, c.y, 0, (g, ox, oy) => rigOf(c.id).draw(g, ox, oy, r.view)); }
    r.overlay(g => drawPitchHud(g, r));
    talk.draw(r);
  }
};

/* ---- the slide on the easel, drawn big over the scene: an icon for its angle and its line ---- */
function drawIcon(g, angle, cx, cy, s) {
  const col = ANGLES[angle].color, T5 = E.tones(col);
  if (angle === 'DESIRE') { px.ell(g, cx - 5 * s, cy, 6 * s, 3.4 * s, T5.base); px.ell(g, cx + 5 * s, cy, 6 * s, 3.4 * s, T5.base); px.ell(g, cx, cy + 2 * s, 9 * s, 3 * s, T5.sh); px.rect(g, cx - 9 * s, cy, 18 * s, 1, T5.deep); px.ell(g, cx - 3 * s, cy - 1.5 * s, 2 * s, 1 * s, T5.hi); }
  else if (angle === 'STATUS') { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i & 1 ? 4.5 : 11) * s; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } px.poly(g, pts, T5.base); px.poly(g, pts.slice(0, 4).concat([[cx, cy]]), T5.lt); }
  else if (angle === 'NOSTALGIA') { px.poly(g, [[cx - 11 * s, cy], [cx, cy - 10 * s], [cx + 11 * s, cy]], T5.sh); px.rect(g, cx - 8 * s, cy, 16 * s, 9 * s, T5.base); px.rect(g, cx - 2 * s, cy + 3 * s, 4 * s, 6 * s, T5.deep); px.rect(g, cx + 4 * s, cy + 2 * s, 3 * s, 3 * s, '#ffe8a0'); }
  else if (angle === 'SAFETY') { px.poly(g, [[cx - 9 * s, cy - 9 * s], [cx + 9 * s, cy - 9 * s], [cx + 8 * s, cy + 2 * s], [cx, cy + 10 * s], [cx - 8 * s, cy + 2 * s]], T5.base); px.poly(g, [[cx - 9 * s, cy - 9 * s], [cx, cy - 9 * s], [cx, cy + 10 * s], [cx - 8 * s, cy + 2 * s]], T5.lt); }
  else { px.rect(g, cx - 13 * s, cy + 2 * s, 26 * s, 8 * s, '#6a8a5a'); px.poly(g, [[cx - 2 * s, cy + 2 * s], [cx + 2 * s, cy + 2 * s], [cx + 9 * s, cy + 10 * s], [cx - 9 * s, cy + 10 * s]], '#3a3a40'); px.rect(g, cx - .5 * s, cy + 5 * s, 1 * s, 2 * s, '#f4e8a0'); px.disc(g, cx + 6 * s, cy - 4 * s, 4 * s, T5.hi); }
}
function drawSlide(g, x, y, w, h, id) {
  const c = CARDS[id], A_ = ANGLES[c.angle];
  panel(g, x, y, w, h, { bg: ['#f8f2e0', '#e4d8bc'], border: '#2a2018' });
  px.rect(g, x + 4, y + 4, w - 8, h * .55, A_.dark);
  drawIcon(g, c.angle, x + w / 2, y + 4 + h * .27, Math.max(1, Math.round(h / 60)));
  E.font.text(g, c.line, x + w / 2, y + h * .62 + 3, '#1a120c', { outline: false, align: 'center', wrap: w - 12 });
}
function drawPitchHud(g, r) {
  const C = CLIENTS[PT.ctx.client], I = pInput(), W = r.W, H = r.H;
  // interest: a long bar with the client's line marked
  const bw = Math.min(260, W - 140), bx = Math.round((W - bw) / 2), by = 8;
  panel(g, bx - 6, by - 4, bw + 12, 26, { alpha: .9 });
  const f = clamp(PT.interest / 100, 0, 1.3) / 1.3, need = C.need / 130;
  E.ui.bar(g, bx, by + 10, bw, 7, f, PT.interest >= C.need ? '#70c878' : '#e8c36a');
  px.rect(g, bx + Math.round(bw * need), by + 7, 1, 13, '#ffffff');
  txt(g, 'INTEREST ' + Math.round(PT.interest), bx, by, COL.ink, { font: 'tiny' });
  txt(g, 'TO WIN ' + C.need, bx + Math.round(bw * need), by, '#ffffff', { font: 'tiny', align: 'center' });
  txt(g, C.company.toUpperCase(), bx + bw, by, COL.gold, { font: 'tiny', align: 'right' });
  // the presenter's composure and haze
  panel(g, 6, 6, 72, 30, { alpha: .85 });
  txt(g, PT.ctx.label || 'COMPOSURE', 11, 10, PT.ctx.color || COL.dim, { font: 'tiny' }); E.ui.bar(g, 11, 18, 62, 5, PT.composure / 100, PT.composure < 30 ? '#d8483a' : '#5ab0a8');
  txt(g, 'HAZE ' + (PT.haze ? '•'.repeat(PT.haze) : '-') + '  SLIDE ' + Math.min(3, PT.shown + (PT.cur ? 1 : 0)) + '/' + Math.min(3, PT.ctx.deck.length), 11, 27, COL.dim, { font: 'tiny' });
  const ph = PT.phase, sw = Math.min(150, W * .36), sh = Math.round(sw * .62), sx = 10, sy = 44;
  if (ph === 'choose') {
    const n = PT.left.length, cw = 100, ch = 76, x0 = Math.round((W - (n * (cw + 8) - 8)) / 2), y0 = H - ch - 30;
    if (game.settings.tells && C.tells) { const tl = C.tells[PT.shown % C.tells.length], lines = wrap(tl, W - 60).length, th = lines * 10 + 8; panel(g, 20, y0 - th - 10, W - 40, th, { alpha: .88 }); txt(g, tl, W / 2, y0 - th - 5, '#c8e0ff', { align: 'center', wrap: W - 60 }); }
    PT.cardBoxes = PT.left.map((id, i) => [x0 + i * (cw + 8), y0 - (PT.focus === i ? 6 : 0), cw, ch]);
    PT.left.forEach((id, i) => drawCard(g, ...PT.cardBoxes[i].slice(0, 2), id, { w: cw, h: ch, focus: PT.focus === i, full: true }));
    txt(g, 'Present a slide:  ' + (I.lastDevice === 'mouse' ? 'click a card' : keyOf(I, 'left') + ' ' + keyOf(I, 'right') + ' choose  ' + keyOf(I, 'confirm') + ' present'), W / 2, H - 22, COL.ink, { align: 'center' });
  }
  if (PT.cur && (ph === 'deliver' || ph === 'react' || ph === 'pivot' || ph === 'wait')) drawSlide(g, sx, sy, sw, sh, PT.cur);
  if (ph === 'deliver') {
    const mw = Math.min(240, W - 60), mx = Math.round((W - mw) / 2), my = H - 46;
    panel(g, mx - 8, my - 16, mw + 16, 40, { alpha: .92 });
    txt(g, 'DELIVER IT:  ' + (I.lastDevice === 'mouse' ? 'click' : keyOf(I, 'confirm')) + ' in the gold', W / 2, my - 11, COL.ink, { align: 'center' });
    px.rect(g, mx, my, mw, 10, '#2a2018');
    const z0 = Math.round(mx + mw * PT.zone[0]), z1 = Math.round(mx + mw * PT.zone[1]), mid = (z0 + z1) / 2, pw = (z1 - z0) * .35;
    px.rect(g, z0, my, z1 - z0, 10, '#b08a3a'); px.rect(g, Math.round(mid - pw / 2), my, Math.max(2, Math.round(pw)), 10, '#ffe08a');
    const nx = Math.round(mx + mw * PT.needle); px.rect(g, nx - 1, my - 3, 3, 16, '#ffffff'); px.rect(g, nx, my - 3, 1, 16, '#d8483a');
    if (PT.haze) txt(g, 'haze: the needle swings faster', W / 2, my + 14, '#e8a060', { align: 'center', font: 'tiny' });
  }
  if (ph === 'react' || ph === 'pivot') {
    const c = PT.hit === 'PERFECT' ? '#ffe08a' : PT.hit === 'GOOD' ? '#c8e0ff' : '#ff9a7a';
    E.font.title(g, PT.hit, sx + sw / 2, sy + sh + 6, { align: 'center', scale: 2, colors: [c, c, '#5a4a3a'], depth: 1 });
    const L_ = landOf(PT.cur, PT.ctx.deck), what = L_.mult >= 1.5 ? 'It lands. It really lands.' : L_.mult >= 1 ? 'They nod.' : L_.mult > 0 ? 'Polite interest.' : 'A chill crosses the table.';
    panel(g, sx, sy + sh + 24, sw, 26, { alpha: .9 }); txt(g, what, sx + sw / 2, sy + sh + 28, COL.ink, { align: 'center' }); txt(g, (PT.delta >= 0 ? '+' : '') + PT.delta + ' interest', sx + sw / 2, sy + sh + 38, PT.delta < 0 ? '#ff9a7a' : '#a8e0a8', { align: 'center' });
    if (ph === 'pivot') {
      const bw2 = 150, y = H - 44, x1 = Math.round(W / 2 - bw2 - 6), x2 = Math.round(W / 2 + 6);
      PT.pivotBox = [[x1, y, bw2, 20], [x2, y, bw2, 20]];
      panel(g, x1, y, bw2, 20, { bg: ['#e8c36a', '#b08a3a'], border: '#ffffff' }); txt(g, keyOf(I, 'pivot') + '  PIVOT (-25 composure)', x1 + bw2 / 2, y + 7, '#1a120c', { align: 'center', shadow: false });
      panel(g, x2, y, bw2, 20); txt(g, keyOf(I, 'confirm') + '  LET IT RIDE', x2 + bw2 / 2, y + 7, COL.ink, { align: 'center' });
    }
  }
  if (ph === 'closeIntro' || ph === 'close' || ph === 'verdict0') {
    E.font.title(g, 'THE CLOSE', W / 2, 40, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
    const i = Math.min(PT.beat, PT.closeLines.length - 1), line = ph === 'closeIntro' ? 'Put the boards down. Look them in the eye.' : PT.closeLines[i] || '';
    panel(g, 20, 62, W - 40, 22, { alpha: .9 }); txt(g, '"' + line + '"', W / 2, 69, COL.ink, { align: 'center', wrap: W - 56 });
    if (ph === 'close' && PT.beat < PT.beats.length) {
      const cx = Math.round(W / 2), cy = Math.round(H - 70), u = PT.beatT / PT.beatDur, rad = Math.max(10, Math.round(40 - 28 * Math.min(u, 1.15)));
      r.glowDisc(g, cx, cy, 30, '#e8c36a', .25);
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), u > .85 && u < 1.15 ? '#ffffff' : '#e8c36a'); }
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(t) * 12), Math.round(cy + Math.sin(t) * 12), '#8a6a3a'); }
      const d = PT.beats[PT.beat], glyph = { up: '↑', down: '↓', left: '←', right: '→' }[d];
      E.font.text(g, glyph, cx, cy - 7, '#ffffff', { align: 'center', scale: 2, outline: '#1a120c' });
      txt(g, (I.lastDevice === 'gamepad' ? 'D-pad / stick ' : 'Arrows / WASD ') + glyph + ' as the ring meets the circle', cx, cy + 46, COL.ink, { align: 'center' });
      PT.closeHits.forEach((h, k) => txt(g, h === 'MISS' ? '×' : h === 'PERFECT' ? '★' : '•', cx - 24 + k * 16, cy + 30, h === 'MISS' ? '#ff7a6a' : '#ffe08a', { align: 'center' }));
    }
    if (PT.flashR) txt(g, PT.flashR.r, W / 2, H - 120, PT.flashR.r === 'MISS' ? '#ff7a6a' : '#ffe08a', { align: 'center', scale: 2 });
  }
  if (ph === 'verdict' && PT.verdict) {
    const v = PT.verdict, pw = Math.min(260, W - 40), px0 = Math.round((W - pw) / 2), py = 44;
    panel(g, px0, py, pw, 92, { alpha: .95 });
    E.font.title(g, v.won ? 'ACCOUNT WON' : 'ACCOUNT LOST', W / 2, py + 8, { align: 'center', scale: 2, colors: v.won ? ['#fff6d8', '#e8c36a', '#8a5a20'] : ['#ffd0c8', '#d8483a', '#5a1a1a'], depth: 2 });
    txt(g, 'Interest ' + v.interest + ' of ' + v.need + ' needed' + (v.bonus ? '  (+' + v.bonus + ': both nodded)' : ''), W / 2, py + 34, COL.ink, { align: 'center' });
    txt(g, v.won ? 'Annual billings: ' + money(v.billings) : 'Billings: nothing. The account walks out the door.', W / 2, py + 48, v.won ? '#70c878' : '#ff9a7a', { align: 'center' });
    txt(g, PT.log.map(l => ANGLES[CARDS[l.card].angle].icon + ' ' + l.hit.toLowerCase() + (l.pivot ? ' (pivot)' : '')).join('   ') + '   close ' + PT.closeHits.filter(h => h !== 'MISS').length + '/4', W / 2, py + 62, COL.dim, { align: 'center' });
    if (PT.t > 1.5 && !talk.open) txt(g, (I.lastDevice === 'mouse' ? 'Click' : keyOf(I, 'confirm')) + ' continue', W / 2, py + 76, COL.ink, { align: 'center' });
  }
}
function storyPitchDone(v) {
  const D = dayData(), C = CLIENTS[D.client];
  S.results.push({ day: S.day, client: D.client, company: C.company, won: v.won, interest: v.interest, billings: v.billings });
  if (v.won) { S.won.push(D.client); S.billings += v.billings; }
  S.composure = PT.composure; S.haze = PT.haze;
  goEvening(D.evening, v);
}

/* ===== 50-story.js ===== */
/* MAD MEN OUT — evenings and endings: side-view vignettes over the Manhattan skyline (a bar, an apartment, the last
 * night), each a short scene of lines and one choice that carries into the next day. */
const STAGE_MID = 480;
const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'wood', side: '#4a2e1c', top: '#6a4228' } }, edges: 'open' });
const SKY = {
  manhattan: new E.Backdrop({ sky: ['#06071a', '#18183e', '#3a2450', '#6a3a5a'], moon: { x: .82, y: .16, r: 8, color: '#f4ecd8' }, stars: 40, starsY: .45,
    layers: [{ kind: 'city', color: '#2a2450', y: .5, height: .4, parallax: .04, windows: '#ffe0a0' }, { kind: 'city', color: '#1c1838', y: .62, height: .45, parallax: .1, windows: '#ffd070', seed: 5 }, { kind: 'city', color: '#100e22', y: .74, height: .4, parallax: .2, windows: '#ffb85a', seed: 11 }] }),
  dusk: new E.Backdrop({ sky: ['#1a1440', '#5a3a78', '#e0766a', '#f8c080'], sun: { x: .5, y: .66, r: 18, color: '#ffd8a0' },
    layers: [{ kind: 'mountains', color: '#5a3a6a', y: .62, height: .26, parallax: .05 }, { kind: 'hills', color: '#3a2448', y: .78, height: .16, parallax: .16 }] }),
  office: new E.Backdrop({ sky: ['#28405a', '#5a7898', '#e0a878', '#f0c890'], sun: { x: .7, y: .7, r: 14, color: '#ffe0a0' },
    layers: [{ kind: 'city', color: '#3a4258', y: .55, height: .42, parallax: .04, windows: '#ffe8b0' }, { kind: 'city', color: '#262c40', y: .7, height: .4, parallax: .12, windows: '#ffd890', seed: 9 }] })
};
const VG = { spec: null, t: 0, actors: [], done: false, card: null };
function vgFocus() { game.focus(STAGE_MID, 0, 32 + (game.H / 2 - 46) / -game.view.bz); }
function playVignette(spec) { VG.spec = spec; game.go('vignette', null, { fade: 'dissolve', seconds: .6 }); }
const vignetteScene = {
  pausable: true, view: 'side', views: ['side', 'brawler'], input: KEYS, res: 'ps1', touch: [],
  enter() {
    const sp = VG.spec; VG.t = 0; VG.card = sp.card || null; VG.cardT = 0;
    VG.actors = sp.actors.map(a => ({ ...a, z: 32 }));
    game.follow(null); game.cam.bounds = null; L.enabled = true; L.ambient = sp.ambient || .45; music(sp.music || 'evening');
    if (sp.weather) game.weather = sp.weather;
    game.after(sp.card ? 2.6 : .6, () => sp.script());
  },
  exit() { talk.close(); game.weather = null; },
  update(dt) {
    VG.t += dt; VG.cardT += dt; vgFocus();
    if (game.input.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    for (const a of VG.actors) {
      const rig = rigOf(a.id), talking = talk.open && talk.portrait === rig && talk.typing;
      if (a.walk) { a.x += a.walk * dt; if (Math.abs(a.x - a.to) < 2) a.walk = 0; }
      rig.update(dt, { x: a.x, y: a.y || 0, z: 32, vx: a.walk || 0, vy: 0, facing: a.face, pose: talking ? 'wave' : a.pose || null, expr: a.expr || (talking ? 'smile' : null) });
    }
    if (VG.card && VG.cardT > 2.4 && (game.input.pressed('confirm') || VG.cardT > 4)) VG.card = null;
    if (talk.update(dt)) speak(talk); else speak(talk);
  },
  draw(r) {
    const sp = VG.spec; (SKY[sp.sky] || SKY.manhattan).draw(r); stage.draw(r);
    for (const p of sp.props || []) {
      if (p.shape) r.shape(p.shape, p.x, p.y || 0, p.z || 32, { facing: p.facing !== undefined ? p.facing : Math.PI / 2 });
      else r.prop(p.prop, p.x, p.y || 0, p.z || 32, { size: p.size || 1.2, color: p.color, light: p.light });
      if (p.glow) L.add(p.x, p.y || 0, (p.z || 32) + p.glow[0], p.glow[1], .8, { color: p.glow[2] });
    }
    for (const a of VG.actors) r.actor(a.x, a.y || 0, 32, (g, ox, oy) => rigOf(a.id).draw(g, ox, oy, r.view));
    r.overlay(g => {
      if (sp.caption) { txt(g, sp.caption, 10, 10, COL.gold); if (sp.sub) txt(g, sp.sub, 10, 21, COL.dim, { font: 'tiny' }); }
      if (VG.card) {
        const a = Math.min(1, VG.cardT * 2);
        px.blend(g, .85 * a, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
        E.font.title(g, VG.card[0], r.W / 2, r.H / 2 - 28, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, VG.card[1], r.W / 2, r.H / 2 + 6, COL.ink, { align: 'center' });
        if (VG.card[2]) txt(g, VG.card[2], r.W / 2, r.H / 2 + 20, COL.dim, { align: 'center', font: 'tiny' });
      }
    });
    talk.draw(r);
  }
};

/* a card between days ("WEDNESDAY · Clear Skies"), then the office */
function nextDay() {
  S.day++; S.haze = S.flags.lateNight ? 1 : 0;
  S.composure = clamp(Math.max(S.composure, 40) + (S.flags.earlyNight ? 25 : 10) - (S.flags.lateNight ? 15 : 0), 0, 100);
  S.flags.lateNight = S.flags.earlyNight = false;
  const D = dayData();
  playVignette({ sky: 'office', ambient: .8, music: 'lounge', actors: [], props: [], card: [D.title, D.subtitle, D.date], script: () => game.go('office', null, { fade: 'dissolve', seconds: .5 }) });
}

/* ---- THE EVENINGS ---- */
function goEvening(kind, v) {
  if (S.demo) { attractNext(); return; }
  if (kind === 'bar') {
    playVignette({ sky: 'manhattan', caption: 'THE HARLEQUIN ROOM', sub: 'Monday, 7:40 PM', ambient: .42,
      actors: [{ id: 'jack', x: STAGE_MID - 14, face: 0 }, { id: 'monty', x: STAGE_MID + 14, face: Math.PI }],
      props: [{ shape: 'mmShelfBottles', x: STAGE_MID, y: -30 }, { shape: 'mmBar', x: STAGE_MID, y: -10 }, { shape: 'mmStool', x: STAGE_MID - 40, y: 6 }, { shape: 'mmStool', x: STAGE_MID + 40, y: 6 },
        { prop: 'lamp', x: STAGE_MID - 70, y: -6, light: true }, { prop: 'lamp', x: STAGE_MID + 70, y: -6, light: true }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -8 }],
      script: () => say([
        v.won ? ['monty', 'To Belle Rouge! And to you, you magnificent liar. She signed before the coffee was cold.'] : ['monty', 'We\'ll get the next one. We always say that. Sometimes it\'s even true.'],
        ['jack', v.won ? 'She didn\'t want a husband. She wanted a pen.' : 'She wanted something I didn\'t bring her.'],
        ['narrator', 'The bartender slides a folded note across the bar. "Message for a Mr. Penn. The gentleman said you\'d know."'],
        ['narrator', 'Four words, in a hand you haven\'t seen in eleven years: "Walt. I\'m in town. L."'],
        ['monty', 'Who\'s Penn? You look like you\'ve seen a ghost.']], null,
        [{ label: 'Nobody. Another round, Monty.' }, { label: 'Nobody. I\'m going home.' }],
        i => {
          if (i === 0) { S.flags.lateNight = true; S.rapport.monty = clamp(S.rapport.monty + 1, -3, 3); say([['monty', 'That\'s my boy. Bartender! Two more of whatever he\'s pretending not to need.'], ['narrator', 'You get home at two. Tomorrow will remember this.']], nextDay); }
          else { S.flags.earlyNight = true; say([['monty', 'Suit yourself. Some of us have a reputation to maintain.'], ['narrator', 'You walk home along Park Avenue. The note stays in your pocket. You can feel it there, like a stone.']], nextDay); }
        }) });
  } else if (kind === 'apartment') {
    const ruthCalls = S.rapport.ruth >= 1;
    playVignette({ sky: 'manhattan', caption: 'YOUR APARTMENT, EAST 63RD STREET', sub: 'Wednesday, 10:15 PM', ambient: .38, weather: { kind: 'rain', amount: .5, wind: .2 },
      actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI, pose: null }],
      props: [{ shape: 'mmSofa', x: STAGE_MID - 50, y: -8 }, { shape: 'mmCredenza', x: STAGE_MID + 60, y: -12 }, { shape: 'mmPhone', x: STAGE_MID + 52, y: -12, z: 45 }, { shape: 'mmDeskLamp', x: STAGE_MID + 70, y: -12, z: 45, glow: [6, 60, '#ffd890'] },
        { shape: 'mmBarCart', x: STAGE_MID + 110, y: -8 }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -10 }, { shape: 'mmHatStand', x: STAGE_MID - 140, y: -10 }],
      script: () => say([
        ['narrator', v.won ? 'Skylark signed. The champagne in the icebox is for an occasion that never seems to come.' : 'Skylark walked. The rain on the window sounds like applause for somebody else.'],
        ...(S.flags.heardFile ? [['narrator', 'Theo Barrow asked for your personnel file today. There is nothing in it that\'s true.']] : []),
        ['narrator', 'The telephone rings.']], null,
        [{ label: 'Pick it up.' }, { label: 'Let it ring.' }],
        i => {
          if (i === 1) { S.composure = clamp(S.composure + 10, 0, 100); S.flags.earlyNight = true; say([['narrator', 'It rings eleven times. You count every one. Then the apartment is very quiet, and you sleep like a man with nothing to hide.']], nextDay); return; }
          if (ruthCalls) { S.rapport.ruth = clamp(S.rapport.ruth + 1, -3, 3); say([['ruth', 'Mr. Calloway? I\'m sorry, it\'s late. I couldn\'t stop thinking about the Kesslers.'], ['ruth', 'The father and the son want the same thing. They just don\'t know it yet. I\'ll put something under your door.'], ['jack', 'Go to bed, Ruth. And Ruth? Good work.']], nextDay); }
          else say([['lenny', 'Walt? It\'s Lenny. Don\'t hang up. I talked to a fella from your office today. Barrow. He bought me lunch.'], ['lenny', 'He asked a lot of questions, Walt. I\'m sorry. I didn\'t know it was a secret.'], ['narrator', 'You put the receiver down very gently, as if it might go off.']], () => { S.composure = clamp(S.composure - 10, 0, 100); nextDay(); });
        }) });
  } else ending();
}

/* ---- THE ENDING: three of them, from what you won and what you did about Walter Penn ---- */
function endingKind() {
  const wonK = S.won.includes('kessler');
  if (!wonK) return 'out';
  if (S.won.length >= 2 && !S.flags.paidTheo) return 'partner';
  return 'usual';
}
function ending() {
  const k = endingKind();
  S.flags.ending = k;
  if (!S.demo) { const best = E.store.get('mmo:best', 0); if (S.billings > best) E.store.set('mmo:best', S.billings); E.store.set('mmo:endings', Object.assign(E.store.get('mmo:endings', {}), { [k]: true })); }
  const theoLine = S.flags.paidTheo ? ['narrator', 'Theo Barrow moves into the office across the hall from yours, with a brass plate that says HEAD OF ACCOUNTS. He waves at you through the glass every morning.'] :
    S.flags.confessed || S.flags.montyKnows ? ['narrator', 'Theo Barrow told Monty Crane everything he knew. Monty Crane already knew. Theo is in Cleveland now, with a smaller agency and a bigger car.'] :
    ['narrator', 'Theo Barrow never says the name Walter Penn out loud. He doesn\'t have to. He keeps it the way men keep a gun in a drawer.'];
  const lenny = S.flags.metLenny ? ['narrator', 'A postcard from Pennsylvania arrives in November. A farmhouse, a creek. "Proud of you, Walt. L."'] : S.flags.paidLenny ? ['narrator', 'Lenny Dorsett took the bus home with two hundred of your dollars. He never writes.'] : ['narrator', 'You never see Lenny Dorsett again. Some nights you wish you had.'];
  if (k === 'partner') playVignette({ sky: 'office', caption: 'THE CONFERENCE ROOM', sub: 'Friday, 6:05 PM', ambient: .7, music: 'lounge',
    actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI / 2 * 0 }, { id: 'monty', x: STAGE_MID + 32, face: Math.PI }, { id: 'bell', x: STAGE_MID + 62, face: Math.PI }, { id: 'ruth', x: STAGE_MID - 34, face: 0, pose: 'cheer' }, { id: 'dolores', x: STAGE_MID - 62, face: 0 }],
    props: [{ shape: 'mmConfTable', x: STAGE_MID, y: -18 }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -10 }, { shape: 'mmCredenza', x: STAGE_MID + 110, y: -20 }],
    script: () => say([['monty', 'Ladies and gentlemen, the Kesslers. Three million dollars, and both of them smiling. I didn\'t know Germans could do that.'],
      ['bell', 'Mr. Calloway. Mr. Crane and I have discussed the letterhead. It is time it said something new.'],
      ['monty', 'Bellweather, Crane and Calloway. It\'s a mouthful. So are you.'], theoLine, lenny,
      ['narrator', 'You stand at the window while they pour the champagne. Eleven floors down, the city keeps moving, and for once you don\'t want to be anywhere else.']], () => credits('partner')) });
  else if (k === 'usual') playVignette({ sky: 'manhattan', caption: 'YOUR OFFICE', sub: 'Friday, 9:30 PM', ambient: .4,
    actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI }],
    props: [{ shape: 'mmDesk', x: STAGE_MID - 20, y: -14 }, { shape: 'mmDeskLamp', x: STAGE_MID - 12, y: -14, z: 45, glow: [6, 60, '#ffd890'] }, { shape: 'mmBarCart', x: STAGE_MID + 70, y: -10 }, { shape: 'mmSofa', x: STAGE_MID - 100, y: -10 }],
    script: () => say([['narrator', 'The Kesslers signed. Monty bought the whole floor dinner and fell asleep in the elevator.'],
      ['narrator', S.won.length >= 2 ? 'Three accounts in a week. On Monday they\'ll want four.' : 'One account out of three. It was enough to keep the lights on. It is never enough to keep them on for long.'], theoLine, lenny,
      ['jack', 'Business as usual.'], ['narrator', 'You pour one more and look at your own reflection in the black glass, and it looks back like a man who is very good at his job.']], () => credits('usual')) });
  else playVignette({ sky: 'dusk', caption: 'ROUTE 66, WEST OF TULSA', sub: 'Three weeks later', ambient: .65, music: 'evening',
    actors: [{ id: 'jack', x: STAGE_MID - 20, face: 0 }],
    props: [{ prop: 'sign', x: STAGE_MID + 60, y: -6, size: 1.4 }, { prop: 'cactus', x: STAGE_MID - 120, y: -12 }, { prop: 'cactus', x: STAGE_MID + 140, y: -14 }, { prop: 'rock', x: STAGE_MID + 100, y: 4 }],
    script: () => say([['narrator', 'The Kesslers took their account to Chicago. On Monday, Monty Crane closed his office door and asked for your resignation, and gave you a very good bottle with it.'],
      ['monty', 'You\'re the best I ever saw, Jack. That\'s what makes it hurt.'], theoLine, lenny,
      ['narrator', 'You bought a used Kessler with the severance and drove west with the window down. The road, it turns out, is still there.'],
      ['jack', 'Every man has a moment when he has to decide who he is. I just keep having mine.'], ['narrator', 'Mad Men out.']], () => credits('out')) });
}
const ENDINGS = { partner: ['NAME ON THE DOOR', 'Bellweather, Crane & Calloway'], usual: ['BUSINESS AS USUAL', 'You keep your office, and your secrets'], out: ['MAD MEN OUT', 'The road is still there'] };
function credits(kind) {
  game.go('credits', { kind }, { fade: 'dissolve', seconds: 1 });
}
const creditsScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter(d) { this.kind = d && d.kind; this.t = 0; music('evening'); L.enabled = false; game.follow(null); },
  update(dt) { this.t += dt; vgFocus(); if (this.t > 2 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { game.input.consumeAll(); game.go('about', { from: 'title' }); } },
  draw(r) {
    SKY.manhattan.draw(r);
    const e = ENDINGS[this.kind] || ENDINGS.usual;
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      E.font.title(g, e[0], r.W / 2, 30, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      txt(g, e[1], r.W / 2, 62, COL.ink, { align: 'center' });
      const rows = [['Accounts won', S.won.length + ' of 3'], ['Annual billings', money(S.billings)], ['Best ever', money(E.store.get('mmo:best', S.billings))],
        ['Endings found', Object.keys(E.store.get('mmo:endings', {})).length + ' of 3']];
      rows.forEach(([a, b], i) => { txt(g, a, r.W / 2 - 8, 88 + i * 14, COL.dim, { align: 'right' }); txt(g, b, r.W / 2 + 8, 88 + i * 14, COL.gold); });
      S.results.forEach((x, i) => txt(g, x.company + ': ' + (x.won ? 'won, ' + money(x.billings) : 'lost') + ' (interest ' + x.interest + ')', r.W / 2, 152 + i * 11, x.won ? '#a8e0a8' : '#e0a8a0', { align: 'center', font: 'tiny' }));
      if (this.t > 2) txt(g, key('confirm') + ' credits', r.W / 2, r.H - 16, COL.ink, { align: 'center' });
    });
  }
};

/* ===== 60-title.js ===== */
/* MAD MEN OUT — the title, the attract mode (after 10 s without input: the AI plays a day, cheating freely; any input
 * ends it) and the About / Credits screen (source information and the build's feedback, from 15-about.js). */
const TI = { idle: 0, menu: null, mode: null, t: 0, smoke: 0 };
function titleItems() {
  if (touchOnly()) return [{ label: 'SETTINGS', act: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', act: () => game.go('about', { from: 'title' }) }];
  return [
    { label: 'NEW CAMPAIGN', act: () => { newCampaign(); game.go('office', null, { fade: 'iris', seconds: .6 }); } },
    { label: 'CONTINUE', disabled: !hasSave(), act: () => { if (game.saves.load(game.saves.latest().slot)) game.go('office', null, { fade: 'iris', seconds: .6 }); } },
    { label: 'PITCH-OFF (2 PLAYERS)', act: () => startVersus() },
    { label: 'PITCH GAUNTLET (SOLO)', act: () => startGauntlet({ mode: 'gauntlet' }) },
    { label: 'ABOUT & CREDITS', act: () => game.go('about', { from: 'title' }) },
    { label: 'SETTINGS', act: () => game.menu('settings') }
  ];
}
function makeTitleMenu() {
  const items = titleItems(), touch = touchOnly();
  TI.items = items; TI.touch = touch;
  TI.menu = new E.Menu(game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 110, box: true, bg: ['#2a2018', '#120c08'], border: '#c8a868', pick: '#e8c36a',
    onPick: (i) => { A.sfx('confirm'); items[i].act(); } });
}
const titleScene = {
  view: 'side', views: ['side', 'brawler'], input: KEYS, res: 'ps1', touch: [],
  enter() {
    S.demo = false; TI.idle = 0; TI.t = 0; makeTitleMenu(); music('lounge'); game.follow(null); game.cam.bounds = null; L.enabled = true; L.ambient = .45;
    game.input.touchEnabled = false; game.resetCamera();
  },
  update(dt) {
    TI.t += dt; vgFocus();
    if (TI.touch !== touchOnly()) makeTitleMenu();   // a key or a pad arrived on a touch screen: the full menu
    const I = game.input;
    if (realInputNow() || I.anyPressed() || I.clicked()) TI.idle = 0; else TI.idle += dt;
    if (TI.idle >= 10) { startAttract(); return; }
    if (!TI.menu.update(dt) && I.pressed('start')) { I.consumeAll(); TI.menu.onPick(TI.menu.i, TI.menu.items[TI.menu.i]); }
    rigOf('jack').update(dt, { x: STAGE_MID + 70, y: 0, z: 32, vx: 0, vy: 0, facing: Math.PI, pose: TI.t % 9 < 5 ? 'hips' : null });
    TI.smoke -= dt; if (TI.smoke < 0) { TI.smoke = .5; P.smoke(STAGE_MID + 62, 0, 32 + 34, 1, { size: .5, color: '#a8a0b8' }); }
  },
  draw(r) {
    SKY.manhattan.draw(r); stage.draw(r);
    r.shape('mmSofa', STAGE_MID - 60, -10, 32); r.shape('mmBarCart', STAGE_MID - 120, -8, 32); r.shape('mmDeskLamp', STAGE_MID - 120, -8, 45);
    r.prop('lamp', STAGE_MID + 130, -6, 32, { light: true, size: 1.2 }); r.shape('mmPlant', STAGE_MID + 160, -10, 32); r.shape('mmHatStand', STAGE_MID - 170, -10, 32);
    r.actor(STAGE_MID + 70, 0, 32, (g, ox, oy) => rigOf('jack').draw(g, ox, oy, r.view));
    r.overlay(g => {
      const narrow = r.W < 380, top = narrow ? 34 : 14;
      E.font.title(g, 'MAD MEN OUT', r.W / 2, top, { align: 'center', scale: narrow ? 3 : 4, colors: ['#fff8e8', '#f0d8a0', '#e8c36a', '#a8742a'], depth: 3, depthColor: '#2a1a0a' });
      txt(g, 'Madison Avenue, 1962. Everybody is selling something.', r.W / 2, top + 40, COL.ink, { align: 'center' });
      txt(g, 'A spiritual successor to Mad Men (2007-2015)', r.W / 2, top + 52, COL.dim, { align: 'center', font: 'tiny' });
      if (TI.touch) {
        panel(g, r.W / 2 - 120, 78, 240, 26, { alpha: .9, border: '#ff9a7a' });
        txt(g, 'Controller or keyboard required', r.W / 2, 84, '#ffd0c0', { align: 'center' });
        txt(g, 'Connect one to play. Touch is not supported.', r.W / 2, 94, COL.dim, { align: 'center', font: 'tiny' });
      }
      const how = TI.touch ? 'Connect a controller or keyboard. The demo plays by itself.' : dev() === 'gamepad' ? 'D-pad + ' + key('confirm') + ' choose' : dev() === 'mouse' ? 'Click to choose' : dev() === 'touch' ? 'Tap SETTINGS or wait for the demo' : 'Arrows + Enter, or click';
      txt(g, how, r.W / 2, r.H - 14, '#b8b0a8', { align: 'center' });
      txt(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel() : '', 4, r.H - 8, '#5a5048', { font: 'tiny' });
    });
    TI.menu.y = Math.max(110, Math.round(r.H / 2) - 6);
    TI.menu.draw(r);
  }
};

/* ---- ATTRACT MODE: a scripted day, played by an autopilot that never fails ---- */
const AT = { on: false, i: 0, t: 0, route: [] };
function startAttract() {
  newCampaign(); S.demo = true; AT.on = true; AT.i = 0; AT.t = 0;
  AT.route = [['npc', 'ruth'], ['look', 'look:magazine'], ['npc', 'eddie'], ['npc', 'monty'], ['spot', 'barcart'], ['npc', 'dolores'], ['spot', 'typewriter'], ['spot', 'conf']];
  game.go('office', null, { fade: 'dissolve', seconds: .8 });
}
function stopAttract() {
  if (!AT.on) return;
  AT.on = false; S.demo = false; OF.auto = null; OF.noclip = false; talk.close(); game.input.consumeAll();
  newCampaign(); game.go('title', null, { fade: 'dissolve', seconds: .4 });
}
function attractNext() { AT.on = false; S.demo = false; OF.auto = null; OF.noclip = false; newCampaign(); game.go('title', null, { fade: 'dissolve', seconds: .8 }); }
// the autopilot's walk: straight for the next stop on the route, around the furniture
OF.autoFor = () => dt => {
  if (!AT.on || !OF.hero) return null;
  const step = AT.route[AT.i]; if (!step) return null;
  const tgt = step[0] === 'npc' ? OF.npcs.find(n => n.id === step[1]) : OF.spots.find(s => s.id === step[1]);
  if (!tgt) { AT.i++; return null; }
  const h = OF.hero, d = Math.hypot(tgt.x - h.x, tgt.y - h.y);
  if (d < 20) { AT.i++; h.facing = Math.atan2(tgt.y - h.y, tgt.x - h.x); useSpot(tgt); return [0, 0]; }
  OF.flow.update(tgt.x, tgt.y); const w = OF.flow.dir(h.x, h.y, tgt.x, tgt.y);
  // the demo cheats: blocked for a moment, it walks straight through the furniture to its stop
  AT.stuck = Math.hypot(h.vx, h.vy) < 12 ? (AT.stuck || 0) + dt : Math.max(0, (AT.stuck || 0) - dt);
  if (AT.stuck > .4) AT.ghost = 1.2;
  AT.ghost = Math.max(0, (AT.ghost || 0) - dt); OF.noclip = AT.ghost > 0;
  if (OF.noclip) return [(tgt.x - h.x) / d * .9, (tgt.y - h.y) / d * .9];
  return [w[0] * .9, w[1] * .9];
};
function demoTick(dt) {
  if (!AT.on) return;
  if (realInputNow()) { stopAttract(); return; }
  const I = game.input; AT.t += dt;
  if (talk.open) { if (AT.t > .55) { AT.t = 0; I.tap('confirm'); } return; }
  const sc = game.sceneName;
  if (sc === 'office') { OF.auto = OF.autoFor(); if (OF.journal) OF.journal = false; }
  else if (sc === 'brainstorm' && AT.t > .7) {
    AT.t = 0; const want = Math.min(3, BR.cards.length);
    if (BR.sel.length < want) { BR.focus = BR.cards.findIndex(id => !BR.sel.includes(id)); brConfirm(); }
    else { BR.focus = BR.cards.length; brConfirm(); }
  }
}
// the pitch's cheat: hit every needle and every beat
function demoPitchAuto(dt) {
  const I = game.input;
  if (PT.phase === 'choose' && PT.t > .9) { PT.focus = 0; I.tap('confirm'); PT.t = -5; }
  else if (PT.phase === 'deliver' && PT.t > .6) { const [a, b] = PT.zone; if (Math.abs(PT.needle - (a + b) / 2) < (b - a) * .1) I.tap('confirm'); }
  else if (PT.phase === 'pivot') I.tap('confirm');
  else if (PT.phase === 'close' && PT.beatT >= PT.beatDur - 1 / 60 && !PT._tapped) { I.tap(PT.beats[PT.beat]); PT._tapped = PT.beat; }
  if (PT.phase === 'close' && PT._tapped !== undefined && PT._tapped !== PT.beat) PT._tapped = undefined;
}

/* ---- ABOUT & CREDITS: pages of plain text, read with left / right or a click ---- */
const AB = { page: 0, from: 'title', scroll: 0 };
const aboutScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter(d) { AB.page = 0; AB.scroll = 0; AB.from = d && d.from || 'title'; game.follow(null); L.enabled = false; },
  update(dt) {
    const I = game.input, n = ABOUT.length; vgFocus();
    if (I.repeat('right') || I.pressed('confirm')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; A.sfx('blip'); }
    if (I.repeat('left')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; A.sfx('blip'); }
    if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
    const c = I.clicked(); if (c) { if (c[0] < game.W / 3) { AB.page = (AB.page + n - 1) % n; } else AB.page = (AB.page + 1) % n; AB.scroll = 0; }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); game.go(AB.from); }
  },
  back() { game.go(AB.from); return true; },
  draw(r) {
    SKY.manhattan.draw(r);
    const [title, lines] = ABOUT[AB.page], W = Math.min(r.W - 24, 440), x0 = Math.round((r.W - W) / 2);
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      E.font.title(g, title, r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      let y = 32 - Math.round(AB.scroll);
      for (const ln of lines) {
        const [k, v] = Array.isArray(ln) ? ln : [null, ln];
        if (k) { txt(g, k, x0, y, COL.gold); y += 10; }
        const h = E.font.text(g, v, x0 + (k ? 8 : 0), y, COL.ink, { outline: false, shadow: COL.shadow, wrap: W - (k ? 8 : 0) }).h; y += h + 5;
      }
      AB.scroll = Math.min(AB.scroll, Math.max(0, y + AB.scroll - (r.H - 24)));
      panel(g, 0, r.H - 16, r.W, 16, { alpha: .9 });
      txt(g, '← ' + (AB.page + 1) + ' / ' + ABOUT.length + ' →     ' + key('cancel') + ' back     ↑↓ scroll', r.W / 2, r.H - 12, COL.ink, { align: 'center' });
    });
  }
};

/* ===== 70-modes.js ===== */
/* MAD MEN OUT — the Pitch Gauntlet (solo, and the AI Hub's parallel round) and the Pitch-Off (two players on one
 * machine: Jack against Ruth, the same clients and the same hands, the client picks the better pitch).
 * AI Hub Session Protocol v1, parallel mode: every copy deals the same three clients and hands from AIHub.rng('deal'),
 * reports its billings with progress() after each pitch, result() once at the end (or at time-up), and stops on end. */
const GA = { mode: null, clients: [], hands: [], i: 0, total: [0, 0], results: [], turn: 0, rng: null, done: false, inter: [0, 0] };
const hubState = { info: null, started: false, ended: false, reported: false, ready: false, waitT: 0 };
const POOL_CLIENTS = ['gA', 'gB', 'gC', 'gD', 'gE', 'gF'], POOL_CARDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
function deal(rng) {
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clients = shuffle(POOL_CLIENTS).slice(0, 3);
  const hands = clients.map(() => shuffle(POOL_CARDS).slice(0, 5));
  return { clients, hands };
}
function startGauntlet(o) {
  GA.mode = o.mode; GA.rng = o.rng || E.rng(Math.floor(Math.random() * 1e9));
  const d = deal(GA.rng); GA.clients = d.clients; GA.hands = d.hands; GA.i = 0; GA.total = [0, 0]; GA.results = []; GA.turn = 0; GA.done = false; GA.inter = [0, 0];
  GA.players = o.players || [game.input];
  gaNext();
}
function gaCtx() {
  const p = GA.mode === 'versus' ? GA.turn : 0, I = GA.players[p] || game.input;
  return { mode: GA.mode === 'versus' ? 'versus' : 'gauntlet', client: GA.clients[GA.i], hand: GA.hands[GA.i], seconds: 25, composure: 70, haze: 0, input: I, rng: GA.rng,
    presenter: p === 1 ? 'ruth' : 'jack', rival: p === 1 ? 'jack' : 'ruth', label: GA.mode === 'versus' ? (p ? 'P2 RUTH' : 'P1 JACK') + '  ·  ACCOUNT ' + (GA.i + 1) + '/3' : 'ACCOUNT ' + (GA.i + 1) + '/3  ·  ' + money(GA.total[0]),
    color: p ? '#ff6a6a' : '#6aa0ff', onDone: gaDone };
}
function gaNext() {
  if (GA.i >= GA.clients.length) { gaFinish(); return; }
  const C = CLIENTS[GA.clients[GA.i]];
  const pl = GA.mode === 'versus' ? (GA.turn ? 'Player 2 (Ruth): ' : 'Player 1 (Jack): ') : '';
  playVignette({ sky: 'office', ambient: .8, music: 'pitch', actors: [], props: [], card: ['ACCOUNT ' + (GA.i + 1) + ' OF 3', pl + C.company, C.product], script: () => openBrainstorm(true, gaCtx()) });
}
function gaDone(v) {
  const p = GA.mode === 'versus' ? GA.turn : 0;
  GA.inter[p] = v.interest;
  if (GA.mode === 'versus' && GA.turn === 0) { GA.turn = 1; gaNext(); return; }
  if (GA.mode === 'versus') {   // the client takes the better pitch, if either reached the line
    const C = CLIENTS[GA.clients[GA.i]], a = GA.inter[0], b = GA.inter[1], best = a === b ? -1 : a > b ? 0 : 1;
    const winner = best >= 0 && GA.inter[best] >= C.need ? best : -1;
    if (winner >= 0) GA.total[winner] += Math.round(C.value * clamp(GA.inter[winner] / 100, .6, 1.25) / 1000) * 1000;
    GA.results.push({ company: C.company, a, b, winner });
    GA.turn = 0;
  } else {
    GA.total[0] += v.billings; GA.results.push({ company: CLIENTS[GA.clients[GA.i]].company, won: v.won, interest: v.interest, billings: v.billings });
    if (HUB && hubState.info && !hubState.ended) HUB.progress({ score: GA.total[0], label: money(GA.total[0]) + ' · ' + (GA.i + 1) + '/3' });
  }
  GA.i++; gaNext();
}
function gaFinish() {
  GA.done = true;
  if (HUB && hubState.info) hubReport();
  game.go('gaEnd', null, { fade: 'dissolve', seconds: .6 });
}
function hubReport() {
  if (!HUB || !hubState.info || hubState.reported) return;
  hubState.reported = true;
  HUB.result({ score: GA.total[0], stats: { Accounts: GA.results.filter(r => r.won).length + '/3', Billings: money(GA.total[0]) },
    awards: GA.results.filter(r => r.won && r.interest >= 100).map(r => ({ title: 'Standing ovation', detail: r.company })) });
}
const gaEndScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { this.t = 0; music('evening'); game.follow(null); L.enabled = false; if (GA.mode === 'versus') game.allowJoin(false); },
  update(dt) {
    this.t += dt; vgFocus();
    if (HUB) return;   // in a session the hub shows the results and ends the round
    if (this.t > 1.5 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { game.input.consumeAll(); game.go('title'); }
  },
  draw(r) {
    SKY.manhattan.draw(r);
    r.overlay(g => {
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      if (GA.mode === 'versus') {
        const w = GA.total[0] === GA.total[1] ? 'A DRAW' : GA.total[0] > GA.total[1] ? 'JACK WINS' : 'RUTH WINS';
        E.font.title(g, w, r.W / 2, 24, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, 'P1 Jack ' + money(GA.total[0]) + '     P2 Ruth ' + money(GA.total[1]), r.W / 2, 60, COL.ink, { align: 'center' });
        GA.results.forEach((x, i) => txt(g, x.company + ':  Jack ' + x.a + '  ·  Ruth ' + x.b + '  →  ' + (x.winner < 0 ? 'nobody' : x.winner ? 'Ruth' : 'Jack'), r.W / 2, 84 + i * 14, COL.dim, { align: 'center' }));
      } else {
        E.font.title(g, 'GAUNTLET OVER', r.W / 2, 24, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, 'Total billings ' + money(GA.total[0]), r.W / 2, 60, COL.gold, { align: 'center', scale: 1 });
        GA.results.forEach((x, i) => txt(g, x.company + ':  ' + (x.won ? 'won ' + money(x.billings) : 'lost') + '  (interest ' + x.interest + ')', r.W / 2, 84 + i * 14, x.won ? '#a8e0a8' : '#e0a8a0', { align: 'center' }));
      }
      if (!HUB && this.t > 1.5) txt(g, key('confirm') + ' back to the title', r.W / 2, r.H - 18, COL.ink, { align: 'center' });
      if (HUB) txt(g, 'Waiting for the other players...', r.W / 2, r.H - 18, COL.dim, { align: 'center' });
    });
  }
};

/* ---- PITCH-OFF: two players. A second controller's Start, or 2 on the keyboard (its right half), joins player 2;
 * with one controller the two take turns with it ---- */
const VS = { t: 0, joined: null };
function startVersus() { VS.t = 0; VS.joined = game.players[1] || null; game.go('vsJoin'); }
const vsJoinScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { music('lounge'); game.follow(null); game.allowJoin({ max: 2, onJoin: (inp) => { VS.joined = inp; A.sfx('powerup'); } }); },
  update(dt) {
    VS.t += dt; vgFocus(); const I = game.input;
    if (VS.joined && VS.t > .5 && (I.pressed('confirm') || VS.joined.pressed('confirm'))) { I.consumeAll(); VS.joined.consumeAll(); startGauntlet({ mode: 'versus', players: [game.input, VS.joined] }); }
    else if (!VS.joined && I.pressed('pivot')) { I.consumeAll(); startGauntlet({ mode: 'versus', players: [game.input, game.input] }); }
    else if (I.pressed('cancel')) { game.allowJoin(false); game.go('title'); }
  },
  back() { game.allowJoin(false); game.go('title'); return true; },
  draw(r) {
    SKY.office.draw(r); stage.draw(r);
    r.actor(STAGE_MID - 40, 0, 32, (g, ox, oy) => rigOf('jack').draw(g, ox, oy, r.view)); r.actor(STAGE_MID + 40, 0, 32, (g, ox, oy) => rigOf('ruth').draw(g, ox, oy, r.view));
    rigOf('jack').update(1 / 60, { x: STAGE_MID - 40, y: 0, z: 32, facing: 0, pose: 'hips' }); rigOf('ruth').update(1 / 60, { x: STAGE_MID + 40, y: 0, z: 32, facing: Math.PI, pose: VS.joined ? 'cheer' : null });
    r.overlay(g => {
      E.font.title(g, 'PITCH-OFF', r.W / 2, 14, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      txt(g, 'Jack against Ruth. Three clients, the same cards. The client signs the better pitch.', r.W / 2, 46, COL.ink, { align: 'center', wrap: r.W - 30 });
      panel(g, r.W / 2 - 150, 66, 300, 52, { alpha: .9 });
      txt(g, 'P1 JACK: ready', r.W / 2 - 140, 72, '#8ab8ff');
      txt(g, VS.joined ? 'P2 RUTH: joined (' + (VS.joined.device || VS.joined.lastDevice || 'ready') + ')' : 'P2 RUTH: press Start on a second controller, or 2 on the keyboard', r.W / 2 - 140, 84, VS.joined ? '#ff8a8a' : COL.dim, { wrap: 280 });
      txt(g, VS.joined ? key('confirm') + ' begin' : key('pivot') + ' share one controller and take turns', r.W / 2 - 140, 106, COL.gold);
      txt(g, key('cancel') + ' back', r.W / 2, r.H - 14, COL.dim, { align: 'center', font: 'tiny' });
    });
  }
};

/* ---- AI HUB: in a session the game opens straight into the round: connect, deal, ready(), play at time 0 ---- */
const hubWaitScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter() { game.follow(null); L.enabled = false; },
  update(dt) {
    vgFocus(); hubState.waitT += dt;
    if (hubState.ended || !hubState.info) return;
    if (!hubState.started && HUB.time() >= 0) { hubState.started = true; startGauntlet({ mode: 'gauntlet', rng: HUB.rng('deal') }); }
  },
  draw(r) {
    SKY.manhattan.draw(r);
    r.overlay(g => {
      E.font.title(g, 'MAD MEN OUT', r.W / 2, 40, { align: 'center', scale: 3, colors: ['#fff8e8', '#e8c36a', '#a8742a'], depth: 2 });
      txt(g, 'THE PITCH GAUNTLET: three clients, three pitches. Most billings wins.', r.W / 2, 80, COL.ink, { align: 'center', wrap: r.W - 30 });
      const t = HUB && hubState.info ? HUB.time() : -Infinity;
      txt(g, !hubState.info ? 'Connecting to AI Hub...' : t === -Infinity ? 'Waiting for the round to start...' : t < 0 ? 'Starting in ' + Math.ceil(-t / 1000) + '...' : '', r.W / 2, 110, COL.gold, { align: 'center', scale: 2 });
    });
  }
};
function hubBoot() {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }   // no hub after all: the game runs as it does on its own
    hubState.info = info;
    HUB.on('time-up', () => { if (!hubState.reported) hubReport(); });
    HUB.on('end', () => { hubState.ended = true; A.music(null); A.mute(true); game.input.clear(); talk.close(); });
    HUB.on('leave', () => {});
    hubState.ready = true; HUB.ready();
  }).catch(e => { game.fail('AI Hub connect', e); game.go('title'); });
}

/* ===== 90-start.js ===== */
/* MAD MEN OUT — the start: the scenes, the attract mode's wrapper (any real input ends it), the AI Hub's stop, the
 * debug handle for tests and tools, and the boot. */
const SCENES = { title: titleScene, office: officeScene, brainstorm: brainstormScene, pitch: pitchScene, vignette: vignetteScene, credits: creditsScene,
  about: aboutScene, gaEnd: gaEndScene, vsJoin: vsJoinScene, hubWait: hubWaitScene };
for (const name in SCENES) {
  const sc = SCENES[name], up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    if (HUB && hubState.ended) return;   // after the hub's end: no input, no sound, nothing sent
    if (HUB && hubState.started && !hubState.reported) {   // the standing, about once a second: billings so far
      hubState.progT = (hubState.progT || 0) - dt;
      if (hubState.progT <= 0) { hubState.progT = 1; HUB.progress({ score: GA.total[0], label: money(GA.total[0]) + ' - account ' + Math.min(3, GA.i + 1) + '/3' }); }
    }
    if (AT.on) { demoTick(dt); if (!AT.on) return; }
    return up.call(this, dt);
  };
  sc.draw = function (r) {
    dr.call(this, r);
    if (AT.on) r.overlay(g => { const on = Math.floor(game.real * 1.5) % 2 === 0; panel(g, r.W / 2 - 90, r.H - 40, 180, 16, { alpha: .85 }); txt(g, on ? 'DEMO  ·  PRESS ANY BUTTON' : 'MAD MEN OUT', r.W / 2, r.H - 35, COL.gold, { align: 'center' }); });
  };
}
game.debug = {
  snapshot: () => ({ scene: game.sceneName, day: S.day, clock: clockStr(S.minute), minute: S.minute, pitchAt: S.pitchAt, composure: S.composure, haze: S.haze,
    insights: S.insights.slice(), intel: S.intel.slice(), deck: S.deck.slice(), billings: S.billings, won: S.won.slice(), flags: Object.keys(S.flags).filter(k => S.flags[k]),
    talking: talk.open, dialogName: talk.name, hero: OF.hero ? [Math.round(OF.hero.x), Math.round(OF.hero.y)] : null, room: OF.room, prompt: OF.prompt && OF.prompt.label,
    pitch: { phase: PT.phase, interest: PT.interest, shown: PT.shown, left: PT.left.slice(), verdict: PT.verdict }, attract: AT.on, idle: Math.round(TI.idle * 10) / 10,
    view: game.view && game.view.id, gauntlet: { mode: GA.mode, i: GA.i, total: GA.total.slice(), done: GA.done }, hub: { ...hubState, info: !!hubState.info }, errors: game.errors.length }),
  teleport(x, y) { if (OF.hero) Object.assign(OF.hero, { x, y, vx: 0, vy: 0 }); },
  near(id) { const n = OF.npcs.find(n => n.id === id) || OF.spots.find(s => s.id === id); if (!n) return false; const a = Math.atan2(OF.hero.y - n.y, OF.hero.x - n.x) || 0;
    let best = null; for (let k = 0; k < 16; k++) { const t = a + k * Math.PI / 8, x = n.x + Math.cos(t) * 16, y = n.y + Math.sin(t) * 16; if (OF.map.walkable(Math.floor(x / T), Math.floor(y / T))) { best = [x, y, t]; break; } }
    if (!best) best = [n.x, n.y + 16, Math.PI / 2];
    this.teleport(best[0], best[1]); OF.hero.facing = best[2] + Math.PI; return true; },
  wake() { DEV.real = 1; },
  S, OF, PT, BR, GA, AT, VG, talk, DAYS, CLIENTS, CARDS
};
game.start({ scenes: SCENES, scene: HUB ? 'hubWait' : 'title',
  boot: { title: 'MAD MEN OUT', version: '1.0', steps: [['Building the eleventh floor', () => buildOffice()], ['Hiring the staff', () => Object.keys(CAST).forEach(rigOf)]],
    messages: ['Pouring the rye', 'Sharpening the pencils', 'Hiding the past', 'Polishing the pitch'] } });
if (HUB) hubBoot();

})();
/* ============================== GAME END ============================== */
