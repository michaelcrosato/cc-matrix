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
