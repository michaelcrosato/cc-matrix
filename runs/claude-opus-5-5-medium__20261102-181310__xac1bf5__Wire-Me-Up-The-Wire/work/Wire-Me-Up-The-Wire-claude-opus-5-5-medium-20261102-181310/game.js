(() => {
'use strict';
/* ============================================================================
 * WIRE ME UP — a surveillance-stealth spiritual successor to The Wire (2002-2008)
 * 00-core: the game, input, settings, glyphs, sound, voices, characters, case state
 * ========================================================================== */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const HUB = !!(window.AIHub && AIHub.active);
const HUBSTATE = { on: false };
const T = 16;

/* ---- input: one layout, keys PC stealth players expect, the pad as a DualSense ---- */
const MENU_KEYS = {
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
const WIRE_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], interact: ['KeyE', 'KeyF', 'Pad0'],
  aim: ['Mouse2', 'KeyQ', 'Pad6'], snap: ['Mouse0', 'Space', 'Pad7'], notebook: ['Tab', 'KeyN', 'Pad3'], view: ['KeyV', 'Pad11'],
  ...MENU_KEYS
};

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#06070a', input: WIRE_INPUT, id: 'wire-me-up',
  menu: { controls: { sprint: 'Hurry', crouch: 'Crouch / lay low', interact: 'Interact / enter car', aim: 'Raise camera', snap: 'Take photo', notebook: 'Case notebook', view: 'Change view' }, quit: HUB ? false : 'title' }
});
const P = game.particles, L = game.lights, A = game.audio, I = () => game.input;
game.input.touchEnabled = false;

/* settings the task asks for, beside the engine's own (volume, comfort, controls...) */
const S = game.settings;
S.define({ key: 'glyphs', label: 'Controller symbols', type: 'select', options: [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']], value: 'playstation', group: 'Controller',
  help: 'Which button symbols the prompts show for a controller', apply: (g, v) => { g.input.glyphs = v; } });
S.define({ key: 'invertX', label: 'Invert stick horizontal', type: 'toggle', value: false, group: 'Controller', help: 'Fix for pads that report left and right swapped' });
S.define({ key: 'invertY', label: 'Invert stick vertical', type: 'toggle', value: false, group: 'Controller', help: 'Fix for pads that report up and down swapped' });
S.define({ key: 'subtitles', label: 'Subtitles', type: 'toggle', value: true, group: 'Game', help: 'Show what the gibberish voices are saying' });
S.define({ key: 'lensAssist', label: 'Lens assist', type: 'toggle', value: true, group: 'Game', help: 'The camera reticle pulls gently toward subjects' });
S.define({ key: 'cones', label: 'Show sight cones', type: 'toggle', value: true, group: 'Game', help: 'Draw where lookouts and muscle are watching' });

/* ---- the stick, after the player's invert toggles (pad only): a screen direction ---- */
function stickMove(inp = game.input) {
  const m = inp.move().slice();
  if (inp.lastDevice === 'gamepad') { if (S.invertX) m[0] = -m[0]; if (S.invertY) m[1] = -m[1]; }
  return m;
}
function rightStick(inp = game.input) {
  const a = inp.padAim; if (!a) return null;
  const v = [a[0], a[1]]; if (S.invertX) v[0] = -v[0]; if (S.invertY) v[1] = -v[1]; return v;
}
const groundDir = (m) => game.view.screenDirToGround(m[0], m[1]);

/* ---- glyphs: drawn, never typed: ✕ ○ □ △ for a DualSense, A B X Y for Xbox, keycaps and a mouse for the keyboard ---- */
const PS_COL = ['#7ab0ff', '#ff6a7a', '#ff8ad8', '#5ae0b0'], XB_COL = ['#4ac04a', '#e84a3a', '#3a8ae8', '#e8c03a'];
const XB_FACE = ['A', 'B', 'X', 'Y'];
const SH = { playstation: ['L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'], xbox: ['LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'] };
function codeFor(action, inp = game.input) {
  const codes = inp.map[action] || [], dev = inp.lastDevice;
  if (dev === 'gamepad') return codes.find(c => /^Pad\d/.test(c)) || codes[0];
  if (dev === 'mouse') { const m = codes.find(c => c.startsWith('Mouse')); if (m) return m; }
  return codes.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse') && !c.startsWith('Act')) || codes.find(c => c.startsWith('Mouse')) || codes[0];
}
/** draw one button glyph at (x, y) top-left, height 11; returns its width */
function glyph(g, x, y, code) {
  x = Math.round(x); y = Math.round(y);
  const fam = S.glyphs === 'xbox' ? 'xbox' : 'playstation';
  if (/^Pad\d+$/.test(code)) {
    const n = +code.slice(3);
    if (n <= 3) {
      px.disc(g, x + 5, y + 5, 6, '#0d0f14'); px.disc(g, x + 5, y + 5, 5, fam === 'xbox' ? XB_COL[n] : '#24262e');
      if (fam === 'xbox') { E.font.text(g, XB_FACE[n], x + 5, y + 2, '#ffffff', { align: 'center', outline: false, shadow: '#000' }); }
      else {
        const c = PS_COL[n];
        if (n === 0) { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
        else if (n === 1) { px.disc(g, x + 5, y + 5, 3, c); px.disc(g, x + 5, y + 5, 2, '#24262e'); }
        else if (n === 2) { px.rect(g, x + 3, y + 3, 5, 5, c); px.rect(g, x + 4, y + 4, 3, 3, '#24262e'); }
        else { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.line(g, x + 2, y + 7, x + 8, y + 7, c); }
      }
      return 12;
    }
    if (n >= 12 && n <= 15) {
      px.rect(g, x, y, 11, 11, '#0d0f14'); px.rect(g, x + 4, y + 1, 3, 9, '#5a5e6a'); px.rect(g, x + 1, y + 4, 9, 3, '#5a5e6a');
      const d = n - 12, c = '#ffffff';
      if (d === 0) px.rect(g, x + 4, y + 1, 3, 3, c); else if (d === 1) px.rect(g, x + 4, y + 7, 3, 3, c); else if (d === 2) px.rect(g, x + 1, y + 4, 3, 3, c); else px.rect(g, x + 7, y + 4, 3, 3, c);
      return 12;
    }
    const lab = n >= 4 && n <= 11 ? SH[fam][n - 4] : n === 16 ? (fam === 'xbox' ? 'Guide' : 'PS') : 'Pad' + n;
    const w = E.font.width(lab) + 6;
    px.rect(g, x, y, w, 11, '#0d0f14'); px.rect(g, x + 1, y + 1, w - 2, 9, '#3a3e4a'); px.rect(g, x + 1, y + 1, w - 2, 1, '#5a5e6a');
    E.font.text(g, lab, x + 3, y + 2, '#ffffff', { outline: false });
    return w + 1;
  }
  if (code && code.startsWith('Mouse')) {
    const b = +code.slice(5);
    px.rect(g, x + 1, y, 8, 11, '#0d0f14'); px.rect(g, x + 2, y + 1, 6, 9, '#d8dae0'); px.rect(g, x + 5, y + 1, 1, 4, '#0d0f14');
    if (b === 0) px.rect(g, x + 2, y + 1, 3, 4, '#ff7a3a'); else if (b === 2) px.rect(g, x + 6, y + 1, 2, 4, '#ff7a3a'); else px.rect(g, x + 5, y + 1, 1, 3, '#ff7a3a');
    return 11;
  }
  const lab = game.input.codeLabel(code || '?');
  const w = Math.max(11, E.font.width(lab) + 6);
  px.rect(g, x, y, w, 11, '#0d0f14'); px.rect(g, x + 1, y + 1, w - 2, 8, '#e8e4d8'); px.rect(g, x + 1, y + 9, w - 2, 1, '#9a968a');
  E.font.text(g, lab, x + Math.round(w / 2), y + 1, '#16181e', { align: 'center', outline: false });
  return w + 1;
}
/** a row of prompts [[action, 'Label'], ...] centred at (cx, y) */
function promptRow(g, items, cx, y, inp = game.input) {
  const parts = items.map(([a, t]) => { const code = typeof a === 'string' && a.includes(':') ? a.split(':')[1] : codeFor(a, inp); return { code, t, w: 0 }; });
  const meas = parts.map(p => { const gw = p.code ? glyphW(p.code) : 0; return gw + 3 + E.font.width(p.t) + 10; });
  let x = Math.round(cx - meas.reduce((a, b) => a + b, 0) / 2);
  parts.forEach((p, i) => { const gw = p.code ? glyph(g, x, y, p.code) : 0; E.font.text(g, p.t, x + gw + 3, y + 2, '#f0ead8', { shadow: '#000', outline: false }); x += meas[i]; });
}
function glyphW(code) {
  const fam = S.glyphs === 'xbox' ? 'xbox' : 'playstation';
  if (/^Pad\d+$/.test(code)) { const n = +code.slice(3); if (n <= 3 || (n >= 12 && n <= 15)) return 12; const lab = n >= 4 && n <= 11 ? SH[fam][n - 4] : 'PS'; return E.font.width(lab) + 7; }
  if (code.startsWith('Mouse')) return 11;
  return Math.max(11, E.font.width(game.input.codeLabel(code)) + 6) + 1;
}
/** a back / delete prompt that never names Escape (Escape pauses): Backspace on keys, ○ / B on a pad */
const backAct = (key = 'Backspace') => game.input.lastDevice === 'gamepad' ? 'cancel' : 'Pad:' + key;
/** "Move" glyph: the stick for a pad, WASD for keys */
const moveCode = () => game.input.lastDevice === 'gamepad' ? 'Pad12' : 'KeyW';

/* ---- touch-only devices: no touch controls, a notice, the settings button ---- */
const touchOnly = () => {
  if (game.input.lastDevice === 'gamepad' || game.input.lastDevice === 'keyboard' && TOUCH_UNLOCK.k) return false;
  if (TOUCH_UNLOCK.k || TOUCH_UNLOCK.pad) return false;
  return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
};
const TOUCH_UNLOCK = { k: false, pad: false };
addEventListener('keydown', () => { TOUCH_UNLOCK.k = true; });
addEventListener('gamepadconnected', () => { TOUCH_UNLOCK.pad = true; });

/* ---- idle clock for the attract mode: any key, button, click or stick resets it ---- */
const IDLE = { t: 0, last: 0 };
const markInput = () => { IDLE.t = 0; IDLE.any = true; };
['keydown', 'mousedown', 'pointerdown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, markInput, { passive: true, capture: true }));
addEventListener('mousemove', e => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) markInput(); }, { passive: true });
function padActive() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p) { if (p.buttons.some(b => b.pressed)) return true; if (p.axes.some(a => Math.abs(a) > .35)) return true; }
  return false;
}

/* ---- sound: code-written effects ---- */
A.define('shutter', [{ wave: 'noise', freq: 2400, dur: .03, vol: .35 }, { wave: 'square', freq: 1800, to: 900, dur: .04, vol: .12 }]);
A.define('wind', { wave: 'noise', freq: 600, to: 300, dur: .12, vol: .12 });
A.define('pager', { wave: 'square', freq: 'C6', dur: .32, vol: .14, arp: [0, 0, 12, 0], step: .08 });
A.define('ring', { wave: 'pulse', freq: 'E5', dur: .5, vol: .12, vib: [24, .06] });
A.define('click', { wave: 'square', freq: 1200, to: 600, dur: .02, vol: .15 });
A.define('tape', [{ wave: 'noise', freq: 900, dur: .08, vol: .12 }, { wave: 'square', freq: 220, to: 110, dur: .06, vol: .1 }]);
A.define('fiveoh', { wave: 'square', freq: 'A5', to: 'E5', dur: .18, vol: .22 });
A.define('whistle', { wave: 'sine', freq: 1800, to: 2600, dur: .22, vol: .16, vib: [10, .02] });
A.define('siren', { wave: 'saw', freq: 600, to: 1100, dur: .5, vol: .1, vib: [3, .2] });
A.define('key', { wave: 'square', freq: 'E6', dur: .05, vol: .12 });
A.define('wrong', { wave: 'saw', freq: 220, to: 140, dur: .22, vol: .18 });
A.define('right', { wave: 'square', freq: 'C5', dur: .2, vol: .14, arp: [0, 7, 12], step: .06 });
A.define('pin', { wave: 'triangle', freq: 300, to: 180, dur: .07, vol: .25 });
A.define('car', { wave: 'noise', freq: 140, to: 90, dur: .5, vol: .2 });
A.define('door2', { wave: 'square', freq: 160, to: 90, dur: .12, vol: .18 });

/* ---- music: original, code-written; a gospel-blues walk for the title, sneaks in layers for the streets ---- */
const SONGS = {
  title: { bpm: 84, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E2 G2 | A2 . A2 B2 | E2 . E2 G2 | D2 . B1 . | E2 . E2 G2 | A2 . C3 B2 | G2 . E2 D2 | E2 - - . ' },
    { name: 'drum', wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s . h . | k . h . s . h k | k k h . s . s . ' },
    { name: 'organ', wave: 'pulse12', vol: .05, notes: 'E4 - G4 - | A4 - - - | B4 - A4 G4 | E4 - - - | G4 - A4 B4 | D5 - B4 - | A4 G4 E4 D4 | E4 - - - ' },
    { name: 'gtr', wave: 'saw', vol: .025, notes: '. . B3 . | . . C4 . | . . B3 . | . . A3 . | . . B3 . | . . E4 . | . . B3 . | . . G3 . ' }] },
  corner: { bpm: 92, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'A1 . . A1 . . C2 . | D2 . . D2 . E2 . . | A1 . . A1 . . C2 . | G1 . . G1 . E1 . . ' },
    { name: 'tick', wave: 'drums', vol: .07, notes: 'h . h h . h h . h . h h . h . h' },
    { name: 'keys', wave: 'pulse12', vol: .04, notes: '. . E4 . . . . . | . . F4 . . . E4 . | . . E4 . . . . . | . . D4 . C4 . . . ' },
    { name: 'heat', wave: 'drums', vol: .14, on: false, notes: 'k . s k k . s . k . s k k s s s' },
    { name: 'alarm', wave: 'saw', vol: .05, on: false, notes: 'A3 . A3 . C4 . A3 . | D4 . A3 . E4 . A3 . ' }] },
  meet: { bpm: 70, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'D2 - - . . . D2 . | F2 - - . . . E2 . | D2 - - . . . D2 . | C2 - - . A1 . . . ' },
    { name: 'pulse', wave: 'drums', vol: .06, notes: 'h . . . h . . . h . . . h . h .' },
    { name: 'drone', wave: 'sine', vol: .05, notes: 'A3 - - - - - - - | A3 - - - - - - - | Bb3 - - - - - - - | A3 - - - - - - - ' },
    { name: 'heat', wave: 'drums', vol: .14, on: false, notes: 'k . s k k . s . k . s k k s s s' },
    { name: 'alarm', wave: 'saw', vol: .05, on: false, notes: 'D3 . D3 . F3 . D3 . | G3 . D3 . A3 . D3 . ' }] },
  wire: { bpm: 76, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'C2 . . . G1 . . . | Ab1 . . . Bb1 . . . ' },
    { name: 'hum', wave: 'sine', vol: .03, notes: 'C4 - - - - - - - | Eb4 - - - - - - - ' },
    { name: 'tick', wave: 'drums', vol: .05, notes: 'h . . h . . h . ' }] },
  board: { bpm: 80, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'G1 . G1 . Bb1 . C2 . | G1 . G1 . F1 . D1 . ' },
    { name: 'keys', wave: 'pulse12', vol: .045, notes: 'G4 - Bb4 - D5 - - - | F4 - - - D4 - - - ' },
    { name: 'tick', wave: 'drums', vol: .06, notes: 'k . h . s . h . ' }] },
  end: { bpm: 66, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'E2 - - . | C2 - - . | G1 - - . | D2 - B1 . ' },
    { name: 'organ', wave: 'sine', vol: .07, notes: 'G4 - - - B4 - | E4 - - - G4 - | D4 - - - G4 - | F#4 - - - - - ' },
    { name: 'lead', wave: 'pulse12', vol: .04, notes: '. . B4 . | . . C5 . | . . B4 . | . . A4 . ' }] },
  burned: { bpm: 60, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 - - - | Eb2 - - - | D2 - - - | C#2 - - - ' },
    { name: 'drone', wave: 'saw', vol: .03, notes: 'E3 - - - | - - - - | D3 - - - | - - - - ' }] }
};
const music = (id, o) => A.music(id ? SONGS[id] : null, o);

/* ---- voices: Animalese-style gibberish; every letter a syllable pitched by the speaker and the vowel ---- */
const VOICES = {
  DEE: { base: 330, wave: 'pulse' }, BRANDT: { base: 170, wave: 'square' }, HASKINS: { base: 130, wave: 'square' },
  PELL: { base: 150, wave: 'triangle' }, SWEETS: { base: 240, wave: 'pulse12' }, SMOKE: { base: 120, wave: 'saw' },
  DANTE: { base: 105, wave: 'saw' }, KEV: { base: 230, wave: 'pulse' }, TATER: { base: 260, wave: 'pulse' },
  LOOKOUT: { base: 300, wave: 'pulse' }, MAJOR: { base: 115, wave: 'square' }, CALLER: { base: 200, wave: 'pulse12' },
  GIRL: { base: 380, wave: 'pulse12' }, TECH: { base: 210, wave: 'triangle' }, ASA: { base: 280, wave: 'triangle' }, DEFAULT: { base: 220, wave: 'pulse' }
};
const VOWEL = { a: 1, e: 1.26, i: 1.5, o: .84, u: .75, y: 1.33 };
function syllable(who, ch) {
  const v = VOICES[who] || VOICES.DEFAULT, k = VOWEL[(ch || '').toLowerCase()] || (.92 + Math.random() * .2);
  const f = v.base * k * (1 + (Math.random() - .5) * .12);
  return [{ wave: v.wave, freq: f, to: f * (.85 + Math.random() * .3), dur: .055, vol: .09 }, { wave: 'sine', freq: f * 2.02, dur: .04, vol: .03 }];
}
/** a dialog that speaks in gibberish: the voice is read per letter, from the letter just typed */
function makeTalk(o = {}) {
  const talk = new E.Dialog(game, Object.assign({ speed: 46, lines: 3, bg: '#14161c', border: '#c8b890', nameColor: '#f0c060' }, o));
  talk.who = 'DEFAULT';
  Object.defineProperty(talk, 'voice', { configurable: true, get() {
    if (!this.open) return null;
    const page = (this.pages[this.i] || []).join(''), ch = page[Math.max(0, Math.floor(this.shown) - 1)];
    if (!ch || ch === ' ') return null;
    return syllable(this.who, ch);
  }, set() {} });
  return talk;
}
/** say a scene of lines: [[WHO, 'text'], ...] then done(); names/portraits from CAST */
function scene(talk, lines, done, opts = {}) {
  let k = 0;
  const next = () => {
    if (k >= lines.length) { if (done) done(); return; }
    const [who, text, extra] = lines[k++], c = CAST[who] || {};
    talk.who = who;
    talk.say(text, Object.assign({ name: c.name || who, portrait: c.rig || null, portraitOpts: { zoom: 2.6, turn: .4, bg: c.bg || '#20242e' }, onDone: next }, opts, extra || {}));
  };
  next();
}

/* ---- the cast: original characters, dressed for West Baltimore ---- */
const H = (o) => new E.Humanoid(Object.assign({ size: 1.25, weapon: null }, o));
const CAST = {
  DEE: { name: 'DET. DEE OKAFOR', bg: '#1e2a3a', rig: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { skin: '#7a4a32', hair: '#1a1210', cloth: '#5a5048', coat: '#3a3a40', pants: '#2a2c34', boot: '#1a1a1e', trim: '#8a8478' } }) },
  BRANDT: { name: 'DET. TOMMY BRANDT', bg: '#2a2a1e', rig: H({ build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e0b090', hair: '#8a5a30', cloth: '#a8b0c0', coat: '#6a5a40', pants: '#3a3a3a', boot: '#2a1e18', trim: '#8a7a5a' } }) },
  HASKINS: { name: 'LT. HASKINS', bg: '#2a1e1e', rig: H({ build: 'heroic', outfit: 'shirt', sleeves: 'long', hair: 'bald', colors: { skin: '#5a3a28', cloth: '#e0e0e8', pants: '#2a2a34', trim: '#8a2a2a', belt: '#1a1a1a' } }) },
  PELL: { name: 'DET. AUGIE PELL', bg: '#1e2a22', rig: H({ build: 'chibi', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#4a4a3a' }, colors: { skin: '#6a4430', hair: '#b0b0b0', cloth: '#7a6a50', coat: '#5a4a38', pants: '#3a342a' } }) },
  SWEETS: { name: 'SWEETS', bg: '#2a2418', rig: H({ build: 'chibi', outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'band', color: '#3a6ab0' }, hunch: .3, colors: { skin: '#6a4430', hair: '#2a2420', cloth: '#8a7a5a', pants: '#4a5a6a', boot: '#3a2e22' } }) },
  SMOKE: { name: 'SMOKE', bg: '#1a1a1a', rig: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'bald', colors: { skin: '#4a2e20', cloth: '#1a1a1e', coat: '#222226', pants: '#1a1a20', boot: '#e8e8e8', trim: '#c8a040' } }) },
  DANTE: { name: 'DANTE PRYOR', bg: '#22181a', rig: H({ build: 'heroic', outfit: 'shirt', sleeves: 'long', hair: 'short', colors: { skin: '#5a3626', hair: '#100c0c', cloth: '#2e3a5a', pants: '#2a2a30', boot: '#1a1a1a', trim: '#d0d0d8' } }) },
  KEV: { name: "LIL' KEV", bg: '#1e1e2a', rig: H({ build: 'chibi', outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { skin: '#6a4430', hair: '#1a1210', cloth: '#f0f0f0', pants: '#3a5a8a', boot: '#f0f0f0' } }) },
  TATER: { name: 'TATER', bg: '#2a1e14', rig: H({ build: 'chibi', outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#f07a20' }, colors: { skin: '#7a4a32', hair: '#1a1210', cloth: '#2a2a2a', pants: '#4a4a4a', boot: '#d8d8d8' } }) },
  LOOKOUT: { name: 'LOOKOUT', bg: '#1a2a1a', rig: H({ size: 1.05, build: 'chibi', outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { skin: '#5a3626', cloth: '#d83a3a', pants: '#2a3a5a', boot: '#f0f0f0' } }) },
  LOOKOUT2: { name: 'LOOKOUT', bg: '#1a2a1a', rig: H({ size: 1.05, build: 'chibi', outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a1a1a' }, colors: { skin: '#6a4430', cloth: '#3a8a4a', pants: '#2a2a2a', boot: '#2a2a2a' } }) },
  MAJOR: { name: 'MAJOR VOSS', bg: '#2a2418', rig: H({ build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2448' }, colors: { skin: '#e8c0a0', hair: '#c0c0c0', cloth: '#d8d8e0', coat: '#1a2448', pants: '#1a2448', trim: '#e8c040' } }) },
  TECH: { name: 'NICKY (WIRE ROOM)', bg: '#1a2028', rig: H({ build: 'chibi', outfit: 'shirt', sleeves: 'long', hair: 'long', colors: { skin: '#e8c0a0', hair: '#6a3a1a', cloth: '#6a7a5a', pants: '#3a3a4a' } }) },
  ASA: { name: 'ASA LINDQVIST', bg: '#24202a', rig: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'long', colors: { skin: '#f0d0b0', hair: '#c8a060', cloth: '#e8e8f0', coat: '#2a2a3a', pants: '#2a2a3a' } }) },
  CALLER: { name: 'UNKNOWN', bg: '#1a1a1a' }, GIRL: { name: 'FEMALE VOICE', bg: '#1a1a1a' }, NARR: { name: '', bg: '#000' }
};
// a fiend, a soldier, a citizen: rigs made to order
const FIEND_COLORS = ['#7a6a5a', '#5a6a7a', '#8a5a4a', '#6a7a5a', '#9a8a6a', '#5a4a6a'];
const fiendRig = (i) => H({ size: 1.15, build: 'chibi', outfit: i % 2 ? 'coat' : 'shirt', sleeves: 'long', hair: i % 3 ? 'short' : 'bald', hunch: .35,
  colors: { skin: ['#6a4430', '#e0b090', '#5a3626', '#7a4a32'][i % 4], cloth: FIEND_COLORS[i % 6], coat: FIEND_COLORS[(i + 2) % 6], pants: '#3a3a40', hair: '#3a3028' } });
const soldierRig = (i) => H({ size: 1.25, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: i ? { style: 'cap', color: '#101010' } : undefined,
  colors: { skin: ['#4a2e20', '#5a3626'][i % 2], cloth: '#1a1a1a', coat: ['#2a2a2a', '#3a2a22'][i % 2], pants: '#1a1a1e', boot: '#e0e0e0' } });

/* ---- the case: what the detail has on the Pryor organization (kept across chapters) ---- */
const CASE = {
  reset() {
    Object.assign(this, { photos: [], heat: 0, wire: { pages: 0, flagged: 0, minimized: 0, violations: 0, place: null, time: null }, board: 0, meet: false, plate: false, chapter: 0, cash: 40, sweets: false, burner: false, score: 0 });
  },
  has(id) { return this.photos.some(p => p.id === id); },
  add(p) { if (!this.has(p.id)) { this.photos.push(p); return true; } return false; },
  strength() {
    const w = this.wire, ph = this.photos.length;
    return Math.max(0, ph * 90 + w.pages * 60 + w.flagged * 70 + (w.place === 'clock' ? 120 : 0) + (w.time === 8 ? 80 : 0) + this.board * 60 + (this.meet ? 300 : 0) + (this.plate ? 100 : 0) - w.violations * 150 - this.heat * 40);
  }
};
CASE.reset();

/* ---- shared HUD bits ---- */
function panel(g, x, y, w, h, a = .82) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: ['#1c1e24', '#0e0f12'], border: '#6a6450', alpha: a }); }
function txt(g, s, x, y, c = '#f0ead8', o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o)); }
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const HOURS = (t) => { const m = Math.floor(16 * 60 + 40 + t / 4); return ((Math.floor(m / 60) + 11) % 12 + 1) + ':' + String(m % 60).padStart(2, '0') + (m >= 720 ? ' PM' : ' AM'); };

/* ============================================================================
 * 10-stealth: what both street chapters share. Detectives (up to two at one machine), the camera lens and its
 * photographs, watchers (lookouts, muscle) with eyes and a mind, walkers on errands, cars, toasts, chatter.
 * ========================================================================== */
const noise = (x, y) => E.noise2(x * .13, y * .13);
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const shadeRGB = (c, k) => c.map(v => clamp(Math.round(v * k), 0, 255));
/* the floors of a West Baltimore block, by tag: asphalt, sidewalk, courtyard dirt and grass, alley, lot gravel, pier planks */
function streetFloor(x, y, tag) {
  const n = noise(x, y), h = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1, sp = Math.abs(h);
  if (tag === 'walk') { const seam = (Math.floor(x) % 24 === 0 || Math.floor(y) % 24 === 0); const c = seam ? [92, 90, 86] : shadeRGB([142, 138, 130], .92 + n * .1 + sp * .05); return c; }
  if (tag === 'curb') return shadeRGB([168, 162, 150], .95 + sp * .06);
  if (tag === 'dirt') { const grass = n > .1; return grass ? shadeRGB([74, 92, 52], .85 + sp * .25) : shadeRGB([104, 86, 64], .85 + sp * .2); }
  if (tag === 'alley') { const crack = Math.abs(Math.sin(x * .21 + Math.sin(y * .17) * 2)) < .03; return crack ? [40, 38, 36] : shadeRGB([96, 92, 88], .85 + n * .15 + sp * .05); }
  if (tag === 'lot') return shadeRGB([92, 82, 70], .7 + sp * .5);
  if (tag === 'plank') { const seam = Math.floor(y) % 8 === 0; return seam ? [40, 32, 26] : shadeRGB([92, 74, 56], .8 + n * .2 + sp * .08); }
  if (tag === 'conc') return shadeRGB([96, 98, 102], .82 + n * .14 + sp * .06);
  if (tag === 'water') { const w = Math.sin(x * .3 + y * .1) * .5 + .5; return shadeRGB([22, 36, 52], .8 + w * .3); }
  if (tag === 'line') { const u = ((x % 16) + 16) % 16, v = ((y % 16) + 16) % 16; if (v >= 7 && v < 9 && u < 11) return [196, 176, 70]; }
  // asphalt
  const patch = n > .38; return patch ? shadeRGB([46, 46, 50], .9 + sp * .1) : shadeRGB([58, 58, 62], .85 + sp * .2 + n * .05);
}

/* ---- cars: a wall cell gives the body (solid, low cover); the cabin, glass and wheels are drawn on it ---- */
function drawCarTop(r, car) {
  const { x0, y0, x1, y1, color } = car, horiz = x1 - x0 > y1 - y0, t = E.tones(color);
  r.queue((x0 + x1) / 2, (y0 + y1) / 2, 14, g => {
    const ix = horiz ? (x1 - x0) * .22 : 2, iy = horiz ? 2 : (y1 - y0) * .22;
    if (car.body) r.box(g, x0, y0, 0, x1, y1, 14, t.base, t.sh);
    r.box(g, x0 + ix, y0 + iy, 14, x1 - ix, y1 - iy, 22, t.lt, '#3a4a5a');
    const w = horiz ? [[x0 + 5, y1 + .2], [x1 - 5, y1 + .2]] : [[x1 + .2, y0 + 5], [x1 + .2, y1 - 5]];
    for (const [wx, wy] of w) { const p = r.w(wx, wy, 3); px.disc(g, Math.round(p[0]), Math.round(p[1]), 2, '#101010'); }
    const lp = horiz ? r.w(x1, (y0 + y1) / 2, 9) : r.w((x0 + x1) / 2, y1, 9);
    px.rect(g, Math.round(lp[0]) - 1, Math.round(lp[1]) - 1, 2, 2, car.lit ? '#fff0b0' : '#c8c0a0');
  }, { bias: 2, hides: true });
}
/* the unmarked car: a tired Caprice in detective grey */
const UNMARKED = '#6a6e74';

/* ---- toasts: short notices at the top of the screen ---- */
const TOASTS = [];
function toast(title, text = '', color = '#f0c060', secs = 3) { TOASTS.push({ title, text, color, t: secs, max: secs }); if (TOASTS.length > 3) TOASTS.shift(); }
function drawToasts(g, W, y0 = 20) {
  let y = y0;
  for (const t of TOASTS) {
    const a = Math.min(1, t.t * 3, (t.max - t.t) * 6), w = Math.max(E.font.width(t.title), E.font.width(t.text)) + 16;
    if (a <= 0) continue;
    panel(g, W / 2 - w / 2, y, w, t.text ? 24 : 14, .85 * a);
    txt(g, t.title, W / 2, y + 3, t.color, { align: 'center' });
    if (t.text) txt(g, t.text, W / 2, y + 13, '#d8d2c0', { align: 'center' });
    y += t.text ? 27 : 17;
  }
}
function tickToasts(dt) { for (const t of TOASTS) t.t -= dt; while (TOASTS.length && TOASTS[0].t <= 0) TOASTS.shift(); }

/* ---- chatter: gibberish over a head, subtitled ---- */
const BUBBLES = [];
function bark(who, body, text, secs = 2.6) {
  for (let i = BUBBLES.length - 1; i >= 0; i--) if (BUBBLES[i].body === body) BUBBLES.splice(i, 1);
  BUBBLES.push({ who, body, text, t: secs, n: 0, acc: 0 });
}
function tickBubbles(dt) {
  for (const b of BUBBLES) {
    b.t -= dt; b.acc += dt;
    if (b.n < b.text.length && b.acc > .045) { b.acc = 0; const ch = b.text[b.n++]; if (ch !== ' ' && b.n % 2 && onScreen(b.body)) A.sfx(syllable(b.who, ch), { vol: .7 }); }
  }
  for (let i = BUBBLES.length - 1; i >= 0; i--) if (BUBBLES[i].t <= 0) BUBBLES.splice(i, 1);
}
const onScreen = (b) => { const r = game.r; if (!r || !r.w) return true; const p = r.w(b.x, b.y, b.z || 0); return p[0] > -20 && p[0] < game.W + 20 && p[1] > -20 && p[1] < game.H + 20; };
function drawBubbles(r, g) {
  if (!S.subtitles) return;
  for (const b of BUBBLES) {
    const p = r.w(b.body.x, b.body.y, (b.body.z || 0) + 50), s = b.text.slice(0, b.n), w = Math.min(150, E.font.width(b.text) + 8);
    const lines = E.font.wrap(s, w - 6), h = lines.length * 9 + 4, x = clamp(Math.round(p[0] - w / 2), 2, game.W - w - 2), y = clamp(Math.round(p[1] - h), 2, game.H - h - 2);
    px.blend(g, .75, 'normal', () => px.rect(g, x, y, w, h, '#0a0a0c'));
    lines.forEach((l, i) => txt(g, l, x + 3, y + 2 + i * 9, b.who === 'LOOKOUT' ? '#ffd040' : '#f0ead8'));
  }
}

/* ---- walkers: corner boys, fiends, the lieutenant; bodies that walk to points and stand ---- */
class Walker {
  constructor(x, y, rig, o = {}) {
    this.body = new E.Body({ x, y, r: 4.5 }); this.rig = rig; this.speed = o.speed || 32; this.target = null; this.queue = []; this.facing = o.facing || 0;
    this.who = o.who || 'DEFAULT'; this.hidden = false; this.wait = 0; this.pose = null; this.tag = o.tag || '';
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  go(...pts) { this.queue = pts.map(p => ({ x: p[0], y: p[1], wait: p[2] || 0 })); this.target = null; return this; }
  then(fn) { this.queue.push({ fn }); return this; }
  get idle() { return !this.target && !this.queue.length && this.wait <= 0; }
  update(dt, map) {
    const b = this.body;
    if (this.wait > 0) { this.wait -= dt; b.vx = b.vy = 0; }
    else {
      if (!this.target && this.queue.length) { const q = this.queue.shift(); if (q.fn) q.fn(this); else this.target = q; }
      if (this.target) {
        const dx = this.target.x - b.x, dy = this.target.y - b.y, d = Math.hypot(dx, dy);
        if (d < 3) { b.vx = b.vy = 0; this.wait = this.target.wait; this.target = null; this.stuck = 0; }
        else {
          b.vx = dx / d * this.speed; b.vy = dy / d * this.speed; this.facing = E.approachAng(this.facing, Math.atan2(dy, dx), dt * 8);
          // walled in (a car parked in the way): slide round it, and after a while give up on that point
          if (this.lastD !== undefined && this.lastD - d < this.speed * dt * .3) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > .4) { const s2 = Math.sign(Math.sin(this.stuck * 2)) || 1; b.vx += -dy / d * this.speed * s2; b.vy += dx / d * this.speed * s2; } if (this.stuck > 3) { b.x = this.target.x; b.y = this.target.y; this.stuck = 0; } } else this.stuck = 0;
          this.lastD = d;
        }
      } else { b.vx = b.vy = 0; }
    }
    b.update(dt, map);
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose, expr: this.expr });
  }
  face(x, y) { this.facing = Math.atan2(y - this.body.y, x - this.body.x); }
  draw(r, o = {}) {
    if (this.hidden) return;
    const b = this.body;
    r.shadow(b.x, b.y, 5, .35);
    r.actor(b.x, b.y, b.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), Object.assign({ every: 1, key: this }, o));
  }
}

/* ---- watchers: lookouts on stoops and corners, muscle on the pier; eyes (E.sees), a mind (E.Suspicion) ---- */
class Watcher extends Walker {
  constructor(x, y, rig, o = {}) {
    super(x, y, rig, o);
    this.range = o.range || 118; this.fov = o.fov || 1.35; this.scan = o.scan || null; this.scanT = Math.random() * 6;
    this.mind = new E.Suspicion({ rise: o.rise || 1.25, decay: .28, forget: 5 }); this.home = [x, y]; this.route = o.route || null; this.at = 0;
    this.flash = !!o.flash; this.alertFired = false;
  }
  look(dt, dets, map) {
    let best = { seen: false, exposure: 0 }, who = null;
    for (const d of dets) {
      if (d.inCar || d.ghost) continue;
      const s = E.sees(this, d.hero, { map, range: this.range, fov: this.fov, facing: this.facing });
      if (s.seen) {
        let ex = s.exposure;
        if (d.lens.on) ex *= 1.6;              // a raised camera draws eyes
        if (d.hero.sprinting) ex *= 1.3;
        if (d.searching) ex *= 2;
        if (ex > best.exposure) { best = Object.assign({}, s, { exposure: Math.min(1, ex) }); who = d; }
      }
    }
    const st = this.mind.update(dt, best.seen && best.exposure > .05 ? best : { seen: false, exposure: 0 }, who ? who.hero : null);
    this.spotted = who;
    return st;
  }
  think(dt, map) {
    const st = this.mind.state;
    if (st === 'notice' || st === 'search' || st === 'alert') {
      if (this.mind.last) { const a = Math.atan2(this.mind.last.y - this.y, this.mind.last.x - this.x); this.facing = E.approachAng(this.facing, a, dt * 4); }
      this.queue = []; this.target = null;
      if (st === 'search' && this.route && this.mind.last) {   // muscle walk over to see
        const dx = this.mind.last.x - this.x, dy = this.mind.last.y - this.y, d = Math.hypot(dx, dy);
        this.body.vx = d > 10 ? dx / d * 30 : 0; this.body.vy = d > 10 ? dy / d * 30 : 0;
      } else if (st === 'alert' && this.route && this.mind.last) {
        const dx = this.mind.last.x - this.x, dy = this.mind.last.y - this.y, d = Math.hypot(dx, dy);
        this.body.vx = d > 6 ? dx / d * 62 : 0; this.body.vy = d > 6 ? dy / d * 62 : 0;
      } else { this.body.vx = this.body.vy = 0; }
      this.body.update(dt, map);
      this.rig.update(dt, { x: this.x, y: this.y, z: this.z, vx: this.body.vx, vy: this.body.vy, facing: this.facing, expr: st === 'alert' ? 'shout' : null, pose: st === 'notice' ? 'hips' : null });
      return;
    }
    if (this.route) {   // patrol
      if (this.idle) { const p = this.route[this.at]; this.at = (this.at + 1) % this.route.length; this.go([p[0], p[1], p[2] || 1.2]); }
      if (this.wait > 0 && this.scan) { this.scanT += dt; this.facing += Math.sin(this.scanT * 1.4) * dt * .9; }
    } else if (this.scan) {   // a lookout: turns his head between the directions he watches
      this.scanT += dt; const n = this.scan.length, k = Math.floor(this.scanT / 3.2) % n;
      this.facing = E.approachAng(this.facing, this.scan[k], dt * 2.2);
    }
    super.update(dt, map);
  }
}

/* ---- the detective: a Mover, a camera, a toggle crouch, a seat in the car ---- */
const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
class Detective {
  constructor(x, y, castId, inp, o = {}) {
    this.hero = new E.Mover({ x, y, r: 5, climb: false, vault: 0, walk: 42, run: 70, sneak: 30, sprintSpeed: 105, hopMax: 0 });
    this.hero.climbMax = 0; this.hero.facing = o.facing || 0;
    this.rig = o.rig || CAST[castId].rig; this.castId = castId; this.inp = inp; this.crouch = false; this.inCar = !!o.inCar; this.car = o.car || null;
    this.lens = { on: false, x, y, k: 0, range: 150, flash: 0 }; this.shots = 0; this.label = o.label || ''; this.color = o.color || '#f0c060'; this.searching = false; this.ai = null;
  }
  get x() { return this.hero.x; } get y() { return this.hero.y; }
  update(dt, map, ctx) {
    const h = this.hero, inp = this.inp, ai = this.ai;
    const down = a => ai ? !!ai.down[a] : inp.down(a), pressed = a => ai ? !!ai.pressed[a] : inp.pressed(a);
    if (this.inCar) {   // a stakeout: the car's driver's seat
      this.lens.range = 230;
      if (pressed('interact') && !this.lens.on) { this.inCar = false; h.x = this.car.ex; h.y = this.car.ey; A.sfx('door2'); }
    } else this.lens.range = 150;
    if (pressed('crouch') && !this.inCar) { this.crouch = !this.crouch; A.sfx('step', { vol: .4 }); }
    // the lens: hold to raise the camera; the stick, the keys or the mouse move the frame
    const wantAim = down('aim');
    if (wantAim && !this.lens.on) {
      this.lens.on = true; this.lens.x = h.x + Math.cos(h.facing) * 50; this.lens.y = h.y + Math.sin(h.facing) * 50; A.sfx('click');
    } else if (!wantAim && this.lens.on) this.lens.on = false;
    this.lens.k = approach(this.lens.k, this.lens.on ? 1 : 0, dt * 5);
    if (this.lens.flash > 0) this.lens.flash -= dt;
    let mv = [0, 0];
    if (ai) mv = ai.move || [0, 0];
    else mv = stickMove(inp);
    if (this.lens.on) {
      const L2 = this.lens;
      if (ai && ai.lens) { L2.x = approach(L2.x, ai.lens[0], dt * 140); L2.y = approach(L2.y, ai.lens[1], dt * 140); }
      else if (inp.lastDevice === 'mouse' && inp === game.input && game.mouseGround()) { const m = game.mouseGround(); L2.x = m.x !== undefined ? m.x : m[0]; L2.y = m.y !== undefined ? m.y : m[1]; }
      else {
        const rs = rightStick(inp), src = rs && Math.hypot(rs[0], rs[1]) > .1 ? rs : mv, gd = groundDir(src);
        L2.x += gd[0] * 150 * dt; L2.y += gd[1] * 150 * dt;
        if (S.lensAssist && ctx && ctx.subjects && Math.hypot(src[0], src[1]) < .1) {   // a gentle pull to the nearest live subject
          let best = null, bd = 40; for (const s of ctx.subjects) if (s.active()) { const c = subjectCenter(s), d = Math.hypot(c[0] - L2.x, c[1] - L2.y); if (d < bd) { bd = d; best = c; } }
          if (best) { L2.x = approach(L2.x, best[0], dt * 40); L2.y = approach(L2.y, best[1], dt * 40); }
        }
      }
      const dx = L2.x - h.x, dy = L2.y - h.y, d = Math.hypot(dx, dy);
      if (d > L2.range) { L2.x = h.x + dx / d * L2.range; L2.y = h.y + dy / d * L2.range; }
      if (!this.inCar) h.facing = E.approachAng(h.facing, Math.atan2(dy, dx), dt * 10);
      mv = [0, 0];
      if (pressed('snap')) this.snap(ctx);
    }
    if (!this.inCar) {
      const gd = groundDir(mv), sprint = down('sprint') && !this.crouch;
      h.update(dt, map, { move: gd, sprint, crouch: this.crouch });
    }
    const still = Math.hypot(h.vx, h.vy) < 4;
    this.rig.update(dt, h.rigState({ point: this.lens.on, aim: this.lens.on ? .15 : 0, pose: this.searching ? 'kneel' : null }));
    this.still = still;
  }
  /* a photograph: every live subject whose people all sit in the frame, in range, in sight */
  snap(ctx) {
    this.shots++; this.lens.flash = .25; A.sfx('shutter'); game.flash('#ffffff', .06, .35);
    if (!ctx || !ctx.subjects) return;
    const h = this.hero, eye = this.inCar ? { x: h.x, y: h.y, z: 0, eye: 24 } : h, R = 30;
    let got = null, why = '';
    for (const s of ctx.subjects) {
      if (!s.active() || (s.once !== false && CASE.has(s.id))) continue;
      const pts = s.pts(), inFrame = pts.every(p => Math.hypot(p.x - this.lens.x, p.y - this.lens.y) < R);
      if (!inFrame) { if (pts.some(p => Math.hypot(p.x - this.lens.x, p.y - this.lens.y) < R)) why = 'Get them all in the frame'; continue; }
      const far = pts.some(p => Math.hypot(p.x - h.x, p.y - h.y) > this.lens.range + 10);
      if (far) { why = 'Too far for the lens'; continue; }
      const blocked = pts.some(p => !ctx.map.sight(eye, p, { target: 18 }));
      if (blocked) { why = 'Something is in the way'; continue; }
      got = s; break;
    }
    if (got) {
      const fresh = CASE.add({ id: got.id, label: got.label, note: got.note, rigs: got.rigs(), time: ctx.clock ? HOURS(ctx.clock) : '', who: this.castId, chapter: ctx.chapter });
      if (fresh) { toast('PHOTO LOGGED', got.label, '#9ae89a', 3.2); A.sfx('right'); if (got.onShot) got.onShot(this); P.glints(this.lens.x, this.lens.y, 20, 8, '#ffffff'); }
    } else if (why) toast('NO GOOD', why, '#ff9a6a', 2);
  }
  draw(r) {
    const h = this.hero;
    if (this.inCar) return;
    r.shadow(h.x, h.y, 5, .4);
    r.actor(h.x, h.y, h.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { xray: { color: this.color, actors: true } });
  }
  drawLens(r, g) {
    if (this.lens.k < .02) return;
    const L2 = this.lens, p = r.w(L2.x, L2.y, 14), cx = Math.round(p[0]), cy = Math.round(p[1]), k = this.lens.k, rad = Math.round(26 + (1 - k) * 30);
    const c = this.lens.flash > 0 ? '#ffffff' : '#e8ffe8';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, cx + sx * rad, cy + sy * rad, cx + sx * (rad - 8), cy + sy * rad, c); px.line(g, cx + sx * rad, cy + sy * rad, cx + sx * rad, cy + sy * (rad - 8), c); }
    px.line(g, cx - 4, cy, cx + 4, cy, c); px.line(g, cx, cy - 4, cx, cy + 4, c);
    const d = Math.hypot(L2.x - this.hero.x, L2.y - this.hero.y);
    txt(g, Math.round(d / 16 * 1.5) + ' m', cx + rad + 3, cy - rad, d > L2.range - 4 ? '#ff8a6a' : c);
  }
}
function subjectCenter(s) { const pts = s.pts(); let x = 0, y = 0; for (const p of pts) { x += p.x; y += p.y; } return [x / pts.length, y / pts.length]; }

/* the viewfinder over the whole screen while a camera is raised */
function drawViewfinder(g, W, H, det, clock) {
  const k = det.lens.k; if (k < .02) return;
  const bar = Math.round(18 * k);
  px.blend(g, .85, 'normal', () => { px.rect(g, 0, 0, W, bar, '#000'); px.rect(g, 0, H - bar, W, bar, '#000'); });
  if (k > .6) {
    if (Math.floor(game.real * 2) % 2 === 0) px.disc(g, 12, 9, 3, '#e83a3a');
    txt(g, 'REC  ' + (clock ? HOURS(clock) : ''), 20, 6, '#e8e8e8');
    txt(g, 'ISO 1600  1/250  ' + (det.inCar ? '300mm' : '135mm'), W - 6, 6, '#c8c8c8', { align: 'right' });
    txt(g, 'FRAMES ' + det.shots, W - 6, H - 14, '#c8c8c8', { align: 'right' });
  }
}

/* ============================================================================
 * 15-ui: the case notebook and the evidence photographs (polaroids of the people in them, in black and white)
 * ========================================================================== */
function polaroid(g, x, y, photo, w = 46, sel = false) {
  x = Math.round(x); y = Math.round(y);
  const h = Math.round(w * 1.18);
  px.rect(g, x + 2, y + 2, w, h, '#000000');
  px.rect(g, x, y, w, h, sel ? '#fff4c0' : '#e8e4d8');
  px.rect(g, x + 3, y + 3, w - 6, w - 6, '#2a2a2c');
  const rigs = photo && photo.rigs ? (typeof photo.rigs === 'function' ? photo.rigs() : photo.rigs) : [];
  if (rigs.length) {
    const n = w < 36 ? 1 : Math.min(2, rigs.length), s = Math.floor((w - 6) / n);
    rigs.slice(0, n).forEach((rg, i) => rg.drawPortrait(g, x + 3 + i * s, y + 3, s, { zoom: n > 1 ? 1.6 : 2.4, turn: .5, bg: '#3a3a3c', frame: false, tint: '#9a9a9a' }));
  } else if (photo && photo.id === 'burner') {   // the phone itself
    px.rect(g, x + w / 2 - 6, y + 10, 12, 20, '#1a1a1a'); px.rect(g, x + w / 2 - 4, y + 12, 8, 6, '#6a8a6a'); for (let i = 0; i < 6; i++) px.rect(g, x + w / 2 - 4 + (i % 3) * 3, y + 21 + Math.floor(i / 3) * 3, 2, 2, '#8a8a8a');
  } else { txt(g, '?', x + w / 2, y + w / 2 - 6, '#8a8a8a', { align: 'center', scale: 2 }); }
  if (photo && photo.time && w >= 36) txt(g, photo.time, x + w - 4, y + w - 12, '#ffb040', { align: 'right' });
  return h;
}
function drawNotebook(g, W, H, objs, chapter) {
  px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
  const w = Math.min(W - 20, 380), h = Math.min(H - 30, 220), x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
  px.rect(g, x, y, w, h, '#d8cfb4'); px.rect(g, x, y, w, 16, '#8a2a22');
  for (let ly = y + 30; ly < y + h - 4; ly += 11) px.rect(g, x + 4, ly, w - 8, 1, '#b8c0d0');
  px.rect(g, x + 22, y + 16, 1, h - 16, '#d08a8a');
  txt(g, 'CASE NOTEBOOK  •  PRYOR ORGANIZATION', x + 8, y + 4, '#f8f0e0');
  txt(g, 'CH.' + chapter, x + w - 8, y + 4, '#f8f0e0', { align: 'right' });
  let yy = y + 21;
  for (const o of objs) {
    const ok = o.n >= o.of;
    txt(g, (ok ? '[x] ' : '[ ] ') + o.t + (o.of > 1 ? '  ' + o.n + '/' + o.of : ''), x + 28, yy, ok ? '#4a6a4a' : '#1a1a2a', { shadow: false });
    yy += 11;
  }
  yy += 4;
  txt(g, 'EVIDENCE (' + CASE.photos.length + ')', x + 28, yy, '#6a1a1a', { shadow: false }); yy += 11;
  const pw = 36, colW = Math.floor((w - 36) / 2), rowsMax = Math.max(1, Math.floor((y + h - 16 - yy) / 46));
  CASE.photos.slice(-rowsMax * 2).forEach((p, i) => {
    const px0 = x + 28 + (i % 2) * colW, py0 = yy + Math.floor(i / 2) * 46;
    polaroid(g, px0, py0, p, pw);
    E.font.wrap(p.label, colW - pw - 12).slice(0, 3).forEach((ln, k) => txt(g, ln, px0 + pw + 6, py0 + 2 + k * 9, '#1a1a2a', { shadow: false }));
    if (p.time) txt(g, p.time, px0 + pw + 6, py0 + 32, '#8a3a1a', { shadow: false });
  });
  if (!CASE.photos.length) txt(g, 'Nothing yet. Raise the camera and wait for something to happen.', x + 28, yy, '#3a3a4a', { shadow: false });
  promptRow(g, [['notebook', 'Close']], W / 2, y + h + 4);
}

/* ============================================================================
 * 20-corner: CHAPTER 1, THE CORNER. Monroe and Fulton, Ellery Courts, late afternoon into dusk.
 * Sit on the corner from the car or on foot, photograph the hand-to-hands, find the stash, catch the lieutenant on a
 * pickup and fish the dumped burner out of the trash, without the lookouts making you. Three "five-oh" calls and the
 * surveillance is blown.
 * ========================================================================== */
const CORNER = (() => {
  const CW = 48, CHh = 34;
  const G = Array.from({ length: CHh }, () => Array(CW).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
  const CARS = [];
  const car = (x, y, horiz, ch, color, o = {}) => { const w = horiz ? 2 : 1, h = horiz ? 1 : 2; fill(x, y, x + w - 1, y + h - 1, ch); CARS.push(Object.assign({ x0: x * T + 1, y0: y * T + 2, x1: (x + w) * T - 1, y1: (y + h) * T - 2, color, cx: x, cy: y }, o)); };
  // streets
  fill(1, 12, 46, 13, '-'); fill(1, 18, 46, 19, '-'); fill(19, 1, 20, 32, '-'); fill(25, 1, 26, 32, '-');
  fill(21, 1, 24, 32, '.'); fill(1, 14, 46, 17, '.');
  for (let x = 1; x <= 46; x += 3) if (x < 20 || x > 25) G[15][x] = 'y';
  // top-left block: back row, alley with dumpsters, front rowhouses
  fill(1, 1, 18, 3, 'B'); fill(1, 4, 18, 6, ':'); fill(1, 7, 18, 11, 'R');
  for (let x = 1; x <= 18; x++) if (Math.floor((x - 1) / 3) % 3 === 1) fill(x, 7, x, 11, 'B'); else if (Math.floor((x - 1) / 3) % 3 === 2) fill(x, 7, x, 11, 'W');
  fill(3, 4, 4, 4, 'D'); fill(12, 4, 13, 4, 'D');
  // top-right block: back row, alley, front row with the vacants and the stash, an empty lot behind a fence
  fill(27, 1, 46, 3, 'B'); fill(27, 4, 46, 6, ':'); fill(27, 7, 30, 11, 'R'); fill(31, 7, 33, 11, 'V'); fill(34, 7, 35, 11, 'S'); fill(36, 7, 37, 11, 'V'); fill(38, 7, 40, 11, 'W');
  fill(41, 4, 46, 11, ';'); fill(41, 11, 46, 11, 'f'); G[11][43] = ';'; G[11][44] = ';'; fill(30, 4, 31, 4, 'D');
  // bottom-left: rowhouses, the corner store, a lot
  fill(1, 20, 12, 24, 'W'); for (let x = 1; x <= 12; x++) if (Math.floor((x - 1) / 3) % 2) fill(x, 20, x, 24, 'R');
  fill(13, 20, 18, 24, 'M'); fill(1, 25, 18, 32, ';'); fill(1, 25, 18, 25, ':');
  // bottom-right: the low-rise courts around a dirt yard
  fill(27, 20, 46, 32, ','); fill(27, 23, 32, 27, 'P'); fill(40, 23, 46, 27, 'P'); fill(27, 30, 46, 32, 'P'); fill(35, 25, 37, 25, 'f');
  // parked cars (body cells: solid, low cover)
  car(3, 14, true, 'a', '#3a5a9a'); car(8, 14, true, 'b', '#d8d8d0'); car(29, 14, true, 'c', '#1e1e22'); car(38, 14, true, 'd', '#9a2a2a');
  car(5, 17, true, 'e', '#3a6a4a'); car(11, 17, true, 'u', UNMARKED, { unmarked: true }); car(33, 17, true, 'c', '#2a2a30'); car(43, 17, true, 'a', '#5a6a8a');
  car(21, 3, false, 'b', '#c8c0a8'); car(21, 25, false, 'd', '#7a3a2a'); car(24, 8, false, 'e', '#4a4a3a'); car(24, 28, false, 'a', '#2a3a5a');
  car(4, 28, true, 'c', '#3a3a3a'); car(13, 30, true, 'b', '#b8b0a0');
  fill(0, 0, CW - 1, 0, '#'); fill(0, CHh - 1, CW - 1, CHh - 1, '#'); fill(0, 0, 0, CHh - 1, '#'); fill(CW - 1, 0, CW - 1, CHh - 1, '#');
  const rows = G.map(r => r.join(''));
  const carType = (c) => ({ h: 14, top: E.tones(c).base, side: E.tones(c).sh, face: 'none', roof: 'plain' });
  const map = new E.TileMap({ rows,
    legend: { '#': 1, R: 2, B: 3, W: 4, V: 5, S: 6, M: 7, P: 8, D: 9, f: 10, a: 20, b: 21, c: 22, d: 23, e: 24, u: 25,
      '-': { floor: 'walk' }, ':': { floor: 'alley' }, ';': { floor: 'lot' }, ',': { floor: 'dirt' }, y: { floor: 'line' } },
    types: {
      1: { h: 44, top: '#3a2a26', side: '#6a3a2e', face: 'brick', roof: 'slab', cut: true, cutH: 6 },
      2: { h: 40, top: '#3e3434', side: '#8a3e30', face: 'brick', roof: 'slab', windows: { lit: .35, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#2a1e1a' } },
      3: { h: 40, top: '#38322e', side: '#6a5a4c', face: 'stone', roof: 'slab', windows: { lit: .25, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#3a2a20' } },
      4: { h: 40, top: '#3a3634', side: '#a89a88', face: 'brick', roof: 'slab', windows: { lit: .3, w: 4, h: 8, step: 16, from: 14 }, door: { chance: .5, color: '#1a2a3a' } },
      5: { h: 40, top: '#2a2624', side: '#5a4a3e', face: 'plank', roof: 'slab', windows: { lit: 0, w: 4, h: 8, step: 16, from: 14 } },
      6: { h: 40, top: '#2a2624', side: '#5a4a3e', face: 'plank', roof: 'slab', windows: { lit: 0, w: 4, h: 8, step: 16, from: 14 }, door: { chance: 1, color: '#8a1a1a' } },
      7: { h: 36, top: '#4a4440', side: '#c8b898', face: 'plaster', roof: 'slab', windows: { lit: .9, w: 6, h: 6, step: 18, from: 10 }, door: { chance: .4, color: '#2a3a2a' } },
      8: { h: 52, top: '#4a403a', side: '#b08a68', face: 'brick', roof: 'slab', windows: { lit: .3, w: 4, h: 6, step: 14, from: 10 }, door: { chance: .25, color: '#3a3a40' } },
      9: { h: 18, top: '#2a4a2e', side: '#3a5a3a', face: 'none', roof: 'plain' },
      10: { h: 22, top: '#8a8a8e', side: '#6a6a70', face: 'none', roof: 'plain' },
      20: carType('#3a5a9a'), 21: carType('#d8d8d0'), 22: carType('#26262a'), 23: carType('#9a2a2a'), 24: carType('#3a6a4a'), 25: carType(UNMARKED)
    },
    floorTex: (x, y, tag) => streetFloor(x, y, tag), outside: '#2a2a2e', ao: 5
  });
  const C = (cx, cy) => ({ x: cx * T, y: cy * T });
  const SPOT = {
    kev: C(26.3, 19.2), tater: C(30.5, 21.2), stash: C(35, 12.5), trash: C(19.4, 19.6), smokeIn: C(46, 18.7), smokeAt: C(27.6, 19.0),
    carExit: C(12, 18.7), projDoor: C(29.5, 22.4), courts: C(36, 29.2), sweetsA: C(8, 5), sweetsB: C(15, 26)
  };
  const UCAR = CARS.find(c => c.unmarked); UCAR.ex = SPOT.carExit.x; UCAR.ey = SPOT.carExit.y;
  const LAMPS = [[3, 12.3], [11, 12.3], [17, 12.3], [29, 12.3], [37, 12.3], [45, 12.3], [3, 19.7], [11, 19.7], [28, 19.7], [36, 19.7], [44, 19.7], [19.3, 6], [26.7, 27], [19.3, 27], [26.7, 6]].map(([x, y]) => [x * T, y * T]);
  const PROPS = [
    ['trashcan', 19.4, 19.6], ['trashcan', 2.5, 12.6], ['trashcan', 39, 12.6], ['hydrant', 20.4, 13.6], ['hydrant', 25.6, 18.4], ['hydrant', 9, 19.4],
    ['firedrum', 43.5, 7.5, true], ['crate', 42, 5.5], ['crate', 45, 9.5], ['sign', 13.5, 19.5], ['trashcan', 31.5, 22.4], ['barrel', 2, 26.5], ['trashcan', 16, 25.4]
  ];
  let dets, watchers, kev, tater, smoke, sweets, fiends, clock, shut, served, smokeT, smokeVisits, burnerState, talk, notebook, done, over, nextFiend, fiendN, alertT, ended, hubT, ghosts, stashKnown, aiT;
  const OBJ = () => [
    { t: 'Photograph 3 hand-to-hands', n: Math.min(3, h2hCount()), of: 3 },
    { t: stashKnown ? 'Photograph the re-up at the red-door vacant' : 'Find the stash house', n: CASE.has('stash') ? 1 : 0, of: 1 },
    { t: 'Catch the lieutenant on a pickup', n: CASE.has('smoke') ? 1 : 0, of: 1 },
    { t: 'Recover the dumped burner', n: CASE.burner ? 1 : 0, of: 1 }
  ];
  const h2hCount = () => CASE.photos.filter(p => p.id.startsWith('h2h')).length;
  const allDone = () => OBJ().every(o => o.n >= o.of);

  /* ---- the crew's day: fiends come to Kev with money, Kev sends them to Tater, Tater serves and re-ups ---- */
  function spawnFiend() {
    const i = fiendN++, starts = [C(1.5, 15.5), C(46, 18.6), C(36, 29.2), C(22.5, 32)], exits = [C(1.5, 16.5), C(46, 18.6), C(36, 29.2), C(22.5, 32.5)];
    const from = starts[i % 4], out = exits[(i + 1) % 4], via = [null, null, C(36, 21.4), C(23, 21)][i % 4], viaOut = [null, null, C(36, 21.4), C(23, 21)][(i + 1) % 4];
    const f = new Walker(from.x, from.y, fiendRig(i), { speed: 30 + (i % 3) * 4, who: 'CALLER' });
    f.id = i; f.stage = 'toKev';
    f.queue = [
      ...(via ? [{ x: via.x, y: via.y, wait: 0 }] : []),
      { x: SPOT.kev.x + 10, y: SPOT.kev.y + 4, wait: 0 },
      { fn: w => { w.stage = 'pay'; w.face(kev.x, kev.y); kev.face(w.x, w.y); w.wait = 2.6; bark('KEV', kev.body, E.pick(["Yo, what you need?", "Talk to my man in the yard.", "Two? Aight. Go 'head.", "Don't be counting it out here."])); A.sfx('coin', { vol: .3 }); } },
      { fn: w => { w.stage = 'toTater'; } },
      { x: SPOT.tater.x + 9, y: SPOT.tater.y + 3, wait: 0 },
      { fn: w => { w.stage = 'serve'; w.face(tater.x, tater.y); tater.face(w.x, w.y); w.wait = 2.4; bark('TATER', tater.body, E.pick(["Here. Keep it moving.", "Red tops. Go.", "You ain't get it from me."])); served++; } },
      { fn: w => { w.stage = 'leave'; } },
      ...(viaOut ? [{ x: viaOut.x, y: viaOut.y, wait: 0 }] : []),
      { x: out.x, y: out.y, wait: 0 },
      { fn: w => { w.stage = 'gone'; } }
    ];
    fiends.push(f);
  }
  /* a subject is a moment worth a photograph: who must be in frame, while it lasts */
  function subjects() {
    const list = [];
    if (h2hCount() < 3 && !shut) for (const f of fiends) {
      if (f.stage === 'pay' && f.wait > 0) list.push({ id: 'h2h-pay-' + f.id, label: 'Hand-to-hand: Kev takes the money', note: 'Lil\' Kev handles the cash on the corner, never the product.', pts: () => [f, kev], rigs: () => [kev.rig, f.rig], active: () => f.stage === 'pay' && f.wait > 0 && !shut });
      if (f.stage === 'serve' && f.wait > 0) list.push({ id: 'h2h-serve-' + f.id, label: 'Hand-to-hand: Tater serves', note: 'Tater (orange cap) serves out of the courtyard.', pts: () => [f, tater], rigs: () => [tater.rig, f.rig], active: () => f.stage === 'serve' && f.wait > 0 && !shut });
    }
    if (tater.reup) list.push({ id: 'stash', label: 'Stash house: Tater re-ups at the red-door vacant', note: 'The vacant with the red door on Monroe holds the package.', pts: () => [tater], rigs: () => [tater.rig], active: () => !!tater.reup });
    if (smoke.collecting) list.push({ id: 'smoke', label: 'Smoke collects the count from Kev', note: 'Smoke runs the corner for Pryor. Picks up the money twice a day.', pts: () => [smoke, kev], rigs: () => [smoke.rig, kev.rig], active: () => !!smoke.collecting, onShot: () => { if (!HUB) bark('SMOKE', smoke.body, 'Something wrong with your eyes, Kev?'); } });
    list.push({ id: 'lookout', label: 'The lookout on Monroe', note: 'A kid, twelve maybe. Paid to yell.', pts: () => [watchers[0]], rigs: () => [watchers[0].rig], active: () => true, optional: true });
    return list;
  }
  function crewUpdate(dt) {
    if (shut > 0) {
      shut -= dt;
      if (shut <= 0) { kev.hidden = tater.hidden = false; kev.go([SPOT.kev.x, SPOT.kev.y]); tater.go([SPOT.tater.x, SPOT.tater.y]); toast('THE CORNER IS BACK UP', 'They always come back', '#f0c060'); }
      return;
    }
    nextFiend -= dt;
    if (nextFiend <= 0 && fiends.length < 4) { spawnFiend(); nextFiend = 9 + Math.random() * 5; }
    // Tater re-ups at the stash every few serves
    if (served >= 2 && tater.idle && !tater.reup && !tater.going) {
      served = 0; tater.going = true;
      tater.go([30.5 * T, 18.6 * T], [31 * T, 13.2 * T], [SPOT.stash.x, SPOT.stash.y]);
      tater.queue.push({ fn: w => { w.reup = true; w.face(SPOT.stash.x, SPOT.stash.y - 10); w.wait = 4.5; A.sfx('door2', { vol: .4 }); } }, { fn: w => { w.reup = false; } },
        { x: 31 * T, y: 13.2 * T, wait: 0 }, { x: 30.5 * T, y: 18.6 * T, wait: 0 }, { x: SPOT.tater.x, y: SPOT.tater.y, wait: 0 }, { fn: w => { w.going = false; w.facing = Math.PI; } });
    }
    // Smoke's pickups
    smokeT -= dt;
    if (smokeT <= 0 && smoke.idle && smoke.hidden) {
      smokeVisits++; smoke.hidden = false; smoke.body.x = SPOT.smokeIn.x; smoke.body.y = SPOT.smokeIn.y; smoke.mind.reset();
      smoke.go([SPOT.smokeAt.x, SPOT.smokeAt.y]).then(w => { w.collecting = true; w.face(kev.x, kev.y); kev.face(w.x, w.y); w.wait = 8; bark('SMOKE', w.body, E.pick(["Count right?", "Where the rest of it?", "Short again and it's your ass."])); game.after(2.6, () => bark('KEV', kev.body, "It's all there. Every dollar.")); })
        .then(w => { w.collecting = false; if (!CASE.burner && burnerState === 0) { bark('SMOKE', w.body, 'And dump that phone. New ones tomorrow.'); burnerState = 1; } })
        .then(w => { w.go([SPOT.smokeIn.x, SPOT.smokeIn.y]).then(z => { z.hidden = true; smokeT = 62; }); });
    }
    // Kev dumps the burner in the store's trash can, then goes back to work
    if (burnerState === 1 && kev.idle) {
      burnerState = 2;
      kev.go([25.4 * T, 19.6 * T], [20.6 * T, 19.7 * T], [SPOT.trash.x + 6, SPOT.trash.y]).then(w => { w.face(SPOT.trash.x, SPOT.trash.y); w.wait = 1.4; A.sfx('bump', { vol: .5 }); burnerState = 3; toast('KEV DUMPED SOMETHING', 'In the trash can by the store', '#f0c060', 3); })
        .then(w => { w.go([20.6 * T, 19.7 * T], [25.4 * T, 19.6 * T], [SPOT.kev.x, SPOT.kev.y]).then(z => { z.facing = Math.PI * .75; }); });
    }
    if (kev.idle && burnerState !== 2 && !kev.walking) kev.facing = E.approachAng(kev.facing, Math.PI * .8 + Math.sin(clock * .3) * .7, dt);
  }
  /* "FIVE-OH!": the corner shuts down, the crew melt into the courts, heat rises */
  function fiveOh(w) {
    if (shut > 0 || ended) return;
    CASE.heat++; shut = 20; alertT = 3;
    bark('LOOKOUT', w.body, E.pick(['FIVE-OH! FIVE-OH!', 'Yo, KNOCKS! Knocks on the block!', 'HUMMERS! Hummers, yo!']), 3);
    A.sfx('whistle'); A.sfx('fiveoh'); game.shake(2);
    toast('YOU GOT MADE', CASE.heat >= 3 ? 'The detail is burned' : 'Heat ' + CASE.heat + ' of 3: the corner shuts down', '#ff5a4a', 3.5);
    for (const f of fiends) { f.queue = []; f.target = null; f.stage = 'leave'; f.go([1.5 * T, 16 * T]).then(z => { z.stage = 'gone'; }); f.speed = 50; }
    kev.queue = []; tater.queue = []; tater.reup = false; tater.going = false;
    kev.go([SPOT.projDoor.x, SPOT.projDoor.y]).then(z => { z.hidden = true; }); tater.go([SPOT.projDoor.x, SPOT.projDoor.y]).then(z => { z.hidden = true; });
    if (burnerState === 2) burnerState = 1;
    watchers.forEach(x => x.mind.reset());
    if (CASE.heat >= 3) { over = true; game.after(2.5, () => game.go('burned', { from: 'corner', why: 'Three times made on Monroe. The corner moved six blocks over and changed phones. The case is cold.' })); }
  }

  /* ---- interactions ---- */
  function interactables(d) {
    const list = [], h = d.hero;
    if (!d.inCar && Math.hypot(h.x - (UCAR.x0 + UCAR.x1) / 2, h.y - (UCAR.y1 + 4)) < 22) list.push({ label: 'Get in the car', act: () => { d.inCar = true; d.car = UCAR; d.crouch = false; A.sfx('door2'); if (allDone() && !HUB) finish(); else if (allDone() && HUB) hubFinish(); } });
    if (!d.inCar && burnerState === 3 && !CASE.burner && Math.hypot(h.x - SPOT.trash.x, h.y - SPOT.trash.y) < 18) list.push({ label: 'Search the trash', act: () => searchTrash(d) });
    if (!d.inCar && !sweets.hidden && Math.hypot(h.x - sweets.x, h.y - sweets.y) < 20 && !HUB) list.push({ label: 'Talk to Sweets', act: () => talkSweets() });
    return list;
  }
  function searchTrash(d) {
    d.searching = true; A.sfx('tape');
    game.after(1.6, () => { d.searching = false; if (ended || over) return; CASE.burner = true; A.sfx('key'); toast('BURNER RECOVERED', 'A prepaid flip phone. The wire room will want the number.', '#9ae89a', 4); CASE.add({ id: 'burner', label: 'Burner phone (dumped by Kev)', note: 'Prepaid. The number gets us a wire on the next one.', rigs: () => [], time: HOURS(clock), chapter: 1 }); });
  }
  function talkSweets() {
    sweets.queue = []; sweets.target = null; sweets.face(dets[0].x, dets[0].y);
    if (CASE.sweets) { scene(talk, [['SWEETS', "Already told you what I know, Detective. Don't be standing with me out here, people talk."]]); return; }
    scene(talk, [
      ['SWEETS', "Detective Dee. Look at you. You buying a t-shirt? Three for ten, they clean. Mostly."],
      ['DEE', "I'm buying what you saw, Sweets."],
      ['SWEETS', "What I saw cost more than a t-shirt. I got a habit and a cousin owe me money, and the cousin ain't paying."]
    ], () => talk.say('Twenty for what you know?', { name: 'DET. DEE OKAFOR', portrait: CAST.DEE.rig, choices: ['Here, twenty.', 'Not today.'], onChoice: (i) => {
      if (i === 0) {
        CASE.cash -= 20; CASE.sweets = true; stashKnown = true; A.sfx('coin');
        scene(talk, [
          ['SWEETS', "The boy in the orange cap, Tater. He ain't keep it on him. He go up to the vacant with the red door on Monroe, every couple sales."],
          ['SWEETS', "And they change phones like drawers. Kev throw his in the can by the store when the bald one tell him. Smoke. Don't say my name around Smoke."],
          ['DEE', "I don't even know your name, Sweets."], ['SWEETS', "That's right. That's exactly right."]
        ], () => toast('TIP', 'Stash: the red-door vacant. Burners go in the store trash.', '#9ae89a', 4));
      } else scene(talk, [['SWEETS', "Then I ain't seen nothing but the weather. It's gonna rain."]]);
    } }));
  }

  /* ---- start, end ---- */
  function enter(data) {
    data = data || {};
    if (!data.keepCase && !HUB) { CASE.photos = CASE.photos.filter(p => p.chapter !== 1); CASE.burner = false; CASE.heat = 0; CASE.sweets = false; }
    if (HUB) CASE.reset();
    clock = 0; shut = 0; served = 0; smokeT = HUB ? 40 : 55; smokeVisits = 0; burnerState = 0; done = false; over = false; ended = false; nextFiend = .5; fiendN = 1; alertT = 0; stashKnown = CASE.sweets; aiT = 0;
    TOASTS.length = 0; BUBBLES.length = 0; fiends = []; ghosts = new Map(); notebook = false;
    talk = talk || makeTalk();
    kev = new Watcher(SPOT.kev.x, SPOT.kev.y, CAST.KEV.rig, { who: 'KEV', range: 64, fov: 1.2, rise: .9 }); kev.facing = Math.PI * .8;
    tater = new Walker(SPOT.tater.x, SPOT.tater.y, CAST.TATER.rig, { who: 'TATER', speed: 36 }); tater.facing = Math.PI;
    smoke = new Watcher(SPOT.smokeIn.x, SPOT.smokeIn.y, CAST.SMOKE.rig, { who: 'SMOKE', range: 90, fov: 1.3, rise: 1.4, speed: 30 }); smoke.hidden = true;
    sweets = new Walker(SPOT.sweetsA.x, SPOT.sweetsA.y, CAST.SWEETS.rig, { who: 'SWEETS', speed: 18 });
    watchers = [
      new Watcher(20 * T, 12.6 * T, CAST.LOOKOUT.rig, { who: 'LOOKOUT', scan: [Math.PI * .5, Math.PI * .1, Math.PI * .85, -Math.PI * .1], range: 120 }),
      new Watcher(37.5 * T, 19.2 * T, CAST.LOOKOUT2.rig, { who: 'LOOKOUT', scan: [Math.PI, Math.PI * 1.35, Math.PI * .7, -Math.PI * .5], range: 120 }),
      kev, smoke
    ];
    const p1 = new Detective(SPOT.carExit.x, SPOT.carExit.y, 'DEE', game.input, { inCar: !HUB, car: UCAR, facing: 0, color: '#f0c060' });
    if (HUB) { p1.inCar = false; p1.hero.x = SPOT.carExit.x; p1.hero.y = SPOT.carExit.y; }
    dets = [p1];
    if (data.attract) { p1.ai = { move: [0, 0], down: {}, pressed: {} }; p1.ghost = true; }
    game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -6];
    L.enabled = true; L.ambient = .78;
    game.weather = null;
    music('corner'); A.layer('heat', 0, .02); A.layer('alarm', 0, .02);
    if (!HUB && !data.attract) game.allowJoin({ max: 2, onJoin: (inp) => { const d = new Detective(p1.x + 12, p1.y + 6, 'BRANDT', inp, { color: '#7ac0ff' }); d.inCar = false; dets.push(d); toast('DET. BRANDT JOINS', 'Player 2 is on the block', '#7ac0ff'); } });
    if (!HUB && !data.attract && !data.skipBrief) {
      scene(talk, [
        ['HASKINS', "Monroe and Fulton. Pryor's people have had that corner since the towers came down. Twenty-four hours, rain or shine, like the post office."],
        ['HASKINS', "I don't want bodies, I want pictures. Hand-to-hands, where they keep the package, who picks up the money. And a phone number, Okafor. Without a number there is no wire."],
        ['PELL', "Kids on the stoops are lookouts. They see a camera, they yell, the corner folds up like a lawn chair and comes back in an hour. Do that three times, they move, and we start from nothing."],
        ['DEE', "So don't get made."], ['PELL', "So don't get made. Sit in the car, use the long lens. Get out when you have to. Crouch behind something when you do."]
      ], () => toast('CHAPTER 1: THE CORNER', 'Monroe & Fulton, West Baltimore', '#f0c060', 4));
    }
    if (HUB) toast('THE CORNER', 'Most evidence before time wins', '#f0c060', 4);
  }
  function finish() {
    if (ended) return; ended = true;
    CASE.chapter = Math.max(CASE.chapter, 1);
    scene(talk, [
      ['DEE', "Three hand-to-hands, the stash, Smoke on the count, and a burner with a number still in it."],
      ['BRANDT', "Lieutenant's gonna kiss you on the mouth."],
      ['DEE', "Lieutenant's gonna ask the judge for a wire, and the judge is gonna ask for more. It's always more."]
    ], () => game.go('chapter', { n: 2 }));
  }
  function hubFinish() { if (ended) return; ended = true; hubScore(true); toast('ROUND DONE', 'All the evidence is in. Wait for the others.', '#9ae89a', 6); }
  const hubPoints = () => CASE.photos.length * 100 + (CASE.burner ? 150 : 0) - CASE.heat * 60 + (ended ? Math.max(0, Math.round(300 - clock)) : 0);
  function hubScore(final) {
    if (!HUB || !HUBSTATE.on) return;
    const s = Math.max(0, hubPoints());
    if (final && !CASE.hubDone) { CASE.hubDone = true; AIHub.result({ score: s, stats: { Photos: CASE.photos.length, Heat: CASE.heat, Burner: CASE.burner ? 'yes' : 'no' } }); }
    else AIHub.progress({ score: s, label: CASE.photos.length + ' photos, heat ' + CASE.heat });
  }

  /* ---- the attract mode's detective: no one sees it; it walks to vantage points and shoots what happens ---- */
  const AI_PATH = [[12, 18.8], [17, 18.8], [27.5, 17.6], [33.5, 18.6], [34, 13.3], [27.2, 13.3], [20.6, 19.5], [33, 19.8]];
  function aiDrive(d, dt) {
    aiT += dt; const ai = d.ai; ai.pressed = {}; ai.down = {};
    if (d.inCar) { if (aiT > 2) ai.pressed.interact = true; return; }
    const live = subjects().filter(s => s.active() && !s.optional && !CASE.has(s.id));
    let tgt = null; for (const s of live) { const c = subjectCenter(s); if (Math.hypot(c[0] - d.x, c[1] - d.y) < 140) { tgt = c; break; } }
    if (tgt) { ai.down.aim = true; ai.lens = tgt; ai.move = [0, 0]; if (d.lens.on && Math.hypot(d.lens.x - tgt[0], d.lens.y - tgt[1]) < 6 && Math.floor(aiT * 4) % 6 === 0) ai.pressed.snap = true; return; }
    if (burnerState === 3 && !CASE.burner) { const dx = SPOT.trash.x - d.x, dy = SPOT.trash.y - d.y; if (Math.hypot(dx, dy) < 14) { ai.pressed.interact = true; ai.move = [0, 0]; return; } const n = Math.hypot(dx, dy); ai.move = [dx / n, dy / n]; return; }
    d.aiAt = d.aiAt || 0; const p = AI_PATH[d.aiAt % AI_PATH.length], dx = p[0] * T - d.x, dy = p[1] * T - d.y, n = Math.hypot(dx, dy);
    if (n < 6) { d.aiWait = (d.aiWait || 0) + dt; ai.move = [0, 0]; if (d.aiWait > 4) { d.aiWait = 0; d.aiAt++; } }
    else ai.move = [dx / n, dy / n];
    if (!d.crouch && Math.floor(aiT) % 9 === 3) ai.pressed.crouch = true;
  }

  /* ---- the step ---- */
  function camera() {
    if (dets.length > 1) game.cam.frame(dets.map(d => d.hero), { margin: 50, zoom: [.6, 1] });
    else { const d = dets[0], k = d.lens.k * .55; game.focus(lerp(d.x, d.lens.x, k), lerp(d.y, d.lens.y, k), 10); }
  }
  function update(dt) {
    tickToasts(dt); tickBubbles(dt); camera();
    if (talk.update(dt)) return;
    if (game.input.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (notebook) { if (game.input.pressed('notebook') || game.input.pressed('cancel')) { notebook = false; A.sfx('cancel'); } return; }
    if (game.input.pressed('notebook') && !HUB) { notebook = true; A.sfx('select'); return; }
    if (HUB && !hubRunning()) { for (const d of dets) d.rig.update(dt, d.hero.rigState({})); return; }
    clock += dt; L.ambient = clamp(.78 - clock / 600, .5, .78);
    const ctx = { subjects: subjects(), map, clock, chapter: 1 };
    for (const d of dets) {
      if (d.ai) aiDrive(d, dt);
      const inp = d.inp, pressedI = d.ai ? !!d.ai.pressed.interact : inp.pressed('interact');
      const acts = !over && !ended ? interactables(d) : [];
      d.act = acts[0] || null;
      if (pressedI && d.act && !d.lens.on && !d.inCar) { d.act.act(); if (d.inp) d.inp.consume && d.inp.consume('interact'); continue; }
      d.update(dt, map, ctx);
    }
    // Sweets drifts between the alley and the lot
    if (sweets.idle) { const a = Math.random() < .5 ? SPOT.sweetsA : SPOT.sweetsB; sweets.go([19.6 * T, (a === SPOT.sweetsA ? 5 : 26) * T], [a.x, a.y, 6]); }
    sweets.update(dt, map); tater.update(dt, map);
    for (const f of fiends) f.update(dt, map);
    fiends = fiends.filter(f => f.stage !== 'gone');
    if (!over && !ended) crewUpdate(dt);
    for (const w of watchers) {
      if (w.hidden) { w.rig.update(dt, { x: w.x, y: w.y, z: 0, vx: 0, vy: 0, facing: w.facing }); continue; }
      const st = shut > 0 || over || ended ? 'calm' : w.look(dt, dets, map);
      if (w.mind.changed && st === 'notice') bark(w.who, w.body, E.pick(['Hold up...', 'Who that?', 'Yo. Yo.', 'Huh?']), 1.6);
      if (st === 'alert' && !over) fiveOh(w);
      w.think(dt, map);
    }
    const heat = watchers.some(w => !w.hidden && (w.mind.state === 'search' || w.mind.state === 'alert')) || alertT > 0;
    if (alertT > 0) alertT -= dt;
    if (heat !== crewUpdate.heat) { crewUpdate.heat = heat; A.layer('heat', heat ? 1 : 0, heat ? .3 : 2); A.layer('alarm', heat ? 1 : 0, heat ? .5 : 2); }
    if (HUB) { hubTick(dt); }
  }
  /* ---- AI Hub: a ghost round; each copy sends its detective, shows the others' ---- */
  function hubRunning() { return AIHub.time() >= 0 && !CASE.hubEnded; }
  function hubTick(dt) {
    hubT = (hubT || 0) + dt;
    if (hubT > .12) {
      hubT = 0; const h = dets[0].hero;
      AIHub.send({ t: 'g', area: 'corner', x: Math.round(h.x), y: Math.round(h.y), f: +h.facing.toFixed(2), c: dets[0].crouch ? 1 : 0, l: dets[0].lens.on ? 1 : 0 }, { reliable: false });
    }
    if (Math.floor(clock) !== Math.floor(clock - dt)) hubScore(false);
  }
  function onGhost(data, from) {
    if (!data || data.t !== 'g' || data.area !== 'corner') return;
    let gh = ghosts.get(from);
    if (!gh) { const pl = (AIHub.players || []).find(p => p.id === from) || { name: 'P' + (from + 1), color: '#ffffff' }; gh = { x: data.x, y: data.y, f: 0, name: pl.name, color: pl.color, rig: H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: pl.color, coat: '#3a3a40', pants: '#2a2c34' } }), tx: data.x, ty: data.y }; ghosts.set(from, gh); }
    gh.tx = data.x; gh.ty = data.y; gh.f = data.f; gh.c = data.c; gh.l = data.l;
  }
  function tickGhosts(dt) {
    for (const gh of ghosts.values()) { const vx = (gh.tx - gh.x) * 8, vy = (gh.ty - gh.y) * 8; gh.x += vx * dt; gh.y += vy * dt; gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx, vy, facing: gh.f, crouch: !!gh.c, point: !!gh.l }); }
  }

  /* ---- drawing ---- */
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    for (const c of CARS) drawCarTop(r, c);
    for (const [x, y] of LAMPS) r.prop('streetlamp', x, y, 0, { light: true, size: 1.1, halo: clock > 240 });
    for (const [id, x, y, lit] of PROPS) r.prop(id, x * T, y * T, 0, { light: !!lit, size: 1.2 });
    r.prop('awning', 15.5 * T, 19.8 * T, 0, { size: 1.4, color: '#2a6a3a' });
    // marble stoops in front of the rowhouses: Baltimore's white steps
    for (let x = 1.5; x < 18; x += 2) stoop(r, x * T, 12.25 * T);
    for (let x = 27.5; x < 41; x += 2) stoop(r, x * T, 12.25 * T);
    if (stashKnown && !CASE.has('stash')) r.marker(SPOT.stash.x, SPOT.stash.y - 4, 30, { label: 'RED DOOR', color: '#ff7a5a' });
    if (burnerState === 3 && !CASE.burner) r.marker(SPOT.trash.x, SPOT.trash.y, 18, { label: 'TRASH', color: '#9ae89a' });
    if (allDone() && !ended) r.marker((UCAR.x0 + UCAR.x1) / 2, UCAR.y1, 24, { label: HUB ? 'DONE: CAR' : 'BACK TO THE CAR', color: '#80e0ff' });
    if (S.cones) for (const w of watchers) if (!w.hidden && w.scan) r.sightCone(w, { map, range: w.range, fov: w.fov, color: MOOD[w.mind.state], alpha: w.mind.state === 'calm' ? .16 : .32 });
    for (const w of watchers) w.draw(r);
    tater.draw(r); sweets.draw(r); for (const f of fiends) f.draw(r);
    for (const d of dets) d.draw(r);
    if (HUB) { tickGhosts(1 / 60); for (const gh of ghosts.values()) { r.shadow(gh.x, gh.y, 5, .2); r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .5, ghost: false }); } }
    L.add(SPOT.trash.x, SPOT.trash.y, 30, 40, .3, { color: '#f0d0a0' });
    r.overlay(g => {
      for (const gh of ghosts.values()) { const p = r.w(gh.x, gh.y, 48); txt(g, gh.name, p[0], p[1], gh.color, { align: 'center' }); }
      for (const w of watchers) if (!w.hidden && w.mind.state !== 'calm') {
        const p = r.w(w.x, w.y, 46), a = w.mind.state === 'alert';
        txt(g, a ? '!' : '?', p[0], p[1] - 8, MOOD[w.mind.state], { align: 'center', scale: a ? 2 : 1 });
        E.ui.bar(g, Math.round(p[0]) - 7, Math.round(p[1]) + 4, 14, 2, Math.min(1, w.mind.level), MOOD[w.mind.state]);
      }
      drawBubbles(r, g);
      for (const d of dets) d.drawLens(r, g);
      drawViewfinder(g, r.W, r.H, dets[0], clock);
      hudCorner(r, g);
      if (notebook) drawNotebook(g, r.W, r.H, OBJ(), 1);
    });
    talk.draw(r);
  }
  function stoop(r, x, y) { r.queue(x, y + 3, 0, g => { r.box(g, x - 4, y, 0, x + 4, y + 5, 3, '#d8d4cc', '#a8a49c'); r.box(g, x - 4, y, 3, x + 4, y + 2.5, 6, '#e8e4dc', '#b8b4ac'); }, { bias: 1 }); }
  function hudCorner(r, g) {
    const W = r.W, H = r.H, d = dets[0], k = d.lens.k;
    if (talk.open) return;
    if (k < .5) {
      // objectives, top left
      const objs = OBJ(); const w = 168, hgt = 14 + objs.length * 11;
      panel(g, 4, 4, w, hgt, .72);
      txt(g, HUB ? 'THE CORNER  (AI HUB)' : 'CH.1  THE CORNER', 9, 7, '#f0c060');
      objs.forEach((o, i) => { const ok = o.n >= o.of; px.rect(g, 9, 19 + i * 11, 6, 6, ok ? '#9ae89a' : '#4a4a50'); if (ok) px.rect(g, 10, 20 + i * 11, 4, 4, '#1a3a1a');
        txt(g, o.t + (o.of > 1 ? ' ' + o.n + '/' + o.of : ''), 19, 18 + i * 11, ok ? '#8a9a8a' : '#e8e2d0'); });
      // heat and time, top right (left of the corner's buttons)
      const ca = game.cornerArea && game.cornerArea(), cx = (ca && ca.y0 < 40 ? Math.floor(ca.x0) - 4 : W) - 64;
      panel(g, cx - 4, 4, 64, 25, .72);
      txt(g, 'HEAT', cx, 7, '#e8a090');
      for (let i = 0; i < 3; i++) { px.rect(g, cx + 25 + i * 10, 7, 9, 8, '#c8b8a8'); px.rect(g, cx + 26 + i * 10, 8, 7, 6, i < CASE.heat ? '#ff4a3a' : '#2a2020'); }
      txt(g, HOURS(clock), cx, 18, '#c8c8d0');
    }
    drawToasts(g, W, 34);
    // status and prompts, bottom
    if (over || ended || d.ai) return;
    const st = d.inCar ? ['IN THE CAR  •  HIDDEN', '#9ae89a'] : watchers.some(w => !w.hidden && w.spotted === d && w.mind.level > .1) ? ['BEING WATCHED', '#ff9a40'] : d.crouch ? ['CROUCHED', '#c8d0e0'] : ['ON FOOT', '#c8c0b0'];
    txt(g, st[0], 8, H - 14 - (k > .5 ? 18 : 0), st[1]);
    const items = [];
    if (d.lens.on) items.push(['snap', 'Take photo'], ['aim', 'Lower']);
    else {
      items.push(['aim', 'Raise camera']);
      if (d.act) items.push(['interact', d.act.label]);
      else if (d.inCar) items.push(['interact', 'Get out']);
      if (!d.inCar) items.push(['crouch', d.crouch ? 'Stand' : 'Crouch']);
      if (!HUB) items.push(['notebook', 'Notebook']);
    }
    if (!d.ai) promptRow(g, items, W / 2, H - 15 - (k > .5 ? 18 : 0));
    if (dets.length === 1 && !HUB && !d.ai && clock < 30 && Math.floor(clock * 2) % 2 === 0 && !talk.open) txt(g, 'P2: press Start on a second pad to join as Brandt', W - 6, H - 28, '#7ac0ff', { align: 'right' });
  }
  return {
    view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, camera: { zoom: [.6, 1.4], start: .8 },
    fiendsDbg: () => fiends.map(f => [f.stage, Math.round(f.x / 16 * 10) / 10, Math.round(f.y / 16 * 10) / 10, f.queue.length]),
    enter, update, draw, onGhost, dropGhost: (id) => ghosts && ghosts.delete(id), talk: () => talk, state: () => ({ clock, shut, heat: CASE.heat, photos: CASE.photos.map(p => p.id), burnerState, fiends: fiends.length, smoke: !smoke.hidden, det: [Math.round(dets[0].x), Math.round(dets[0].y)], inCar: dets[0].inCar }), hubScore, hubPoints, subjects: () => subjects(), dets: () => dets, map,
    exit() { game.allowJoin(false); game.cam.offset = null; game.cam.frame(null); L.enabled = false; for (const p of game.players.slice(1)) game.removePlayer(p); }
  };
})();

/* ============================================================================
 * 30-wire: CHAPTER 2, THE WIRE. A basement room in the Western, a clone pager and the payphone lines.
 * Decode the pages (the crew "jumps the 5" on the keypad), then monitor calls under the judge's rules:
 * flag what is pertinent, minimize what is not. Then read the meet out of what you flagged.
 * ========================================================================== */
const WIRE = (() => {
  const KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['*', '0', '#']];
  const JUMP = { 1: '9', 2: '8', 3: '7', 4: '6', 6: '4', 7: '3', 8: '2', 9: '1', 5: '0', 0: '5' };
  const enc = (s) => s.split('').map(c => JUMP[c] !== undefined ? JUMP[c] : c).join('');
  const PAGES = [
    { real: '4105553', meaning: "Callback: the payphone at Monroe & Fulton. They're telling Kev to call from the corner." },
    { real: '4107281', meaning: "Callback: the payphone outside the laundromat on Edmondson. Smoke's office." },
    { real: '4108600', meaning: "Callback ends 600: Pell says that's how they flag the boss. Pryor is calling." }
  ];
  const CALLS = [
    { title: 'CALL 1  •  PAYPHONE (MONROE) TO BURNER', pertinent: true, lines: [
      ['SMOKE', 'Yo.'], ['KEV', "Yeah, it's me. Tower's quiet."], ['SMOKE', "Tell your man the thing by the clock, where the boats come in.", true],
      ['KEV', 'The clock?'], ['SMOKE', "The two. Not the other one. The two.", true], ['SMOKE', "And burn this phone after. I mean it."]] },
    { title: 'CALL 2  •  BURNER TO (FEMALE)', pertinent: false, lines: [
      ['KEV', 'Hey baby.'], ['GIRL', "Kevin, did you get the sneakers for Lil Man? Size two, he grew."], ['KEV', "I got 'em. The white ones."],
      ['GIRL', "And his school called again. You need to come to that meeting."], ['KEV', "I'm gonna come. I said I'm gonna come."], ['GIRL', "You always say that."]] },
    { title: 'CALL 3  •  PAYPHONE (EDMONDSON) TO SMOKE', pertinent: true, lines: [
      ['DANTE', "Don't say nothing on this you don't have to."], ['SMOKE', 'Understood.'], ['DANTE', "The man from the boats wants to see me. In person.", true],
      ['SMOKE', "Same place?"], ['DANTE', "Same place, same time we said. Bring two of ours.", true], ['DANTE', "And tell your mother I said happy birthday."]] }
  ];
  let phase, talk, page, entry, cur, wrong, hint, call, line, typed, flags, minimized, lineT, results, t, flash, done, aiT, attract;
  const keyAt = (cx, cy) => KEYS[cy][cx];
  function enter(data) {
    data = data || {};
    attract = !!data.attract; talk = talk || makeTalk(); phase = 'brief'; page = 0; entry = ''; cur = [1, 1]; wrong = 0; hint = true; call = 0; line = 0; typed = 0; flags = []; minimized = false; lineT = 0; results = []; t = 0; flash = 0; done = false; aiT = 0;
    CASE.wire = { pages: 0, flagged: 0, minimized: 0, violations: 0, place: null, time: null };
    TOASTS.length = 0; L.enabled = false; game.weather = null; music('wire');
    if (attract) { phase = 'pager'; return; }
    scene(talk, [
      ['TECH', "Welcome to the basement. Mind the pipe, the pipe wins. We got the clone of Smoke's pager up, and the judge signed the payphones and the new burner off the number you pulled out of that trash."],
      ['PELL', "They page each other numbers. But nobody in this crew sends a real number. They jump the five."],
      ['PELL', "Look at a phone keypad. Every digit jumps across the five to the one opposite: 1 is 9, 2 is 8, 4 is 6. The 5 and the 0 trade places. Do that to the page, you get the real number."],
      ['TECH', "Then the calls. You flag what's about the business. Anything else, his girl, his mama, his kid, you minimize. You hit stop. That's the law, not me."],
      ['ASA', "And if you listen to a man's girlfriend for six minutes, Detective, I will be explaining it to a judge, and then I will be explaining you to a judge."]
    ], () => { phase = 'pager'; A.sfx('pager'); });
  }
  /* ---- pager ---- */
  function press(k) {
    if (k === '*') { entry = entry.slice(0, -1); A.sfx('click'); return; }
    if (k === '#') { submit(); return; }
    if (entry.length < 7) { entry += k; A.sfx('key', { pitch: 1 + +k * .03 }); }
    if (entry.length === 7) submit();
  }
  function submit() {
    const P2 = PAGES[page];
    if (entry === P2.real) {
      A.sfx('right'); CASE.wire.pages++; flash = .6; results.push(P2.meaning);
      toast('DECODED', P2.meaning.split(':')[0], '#9ae89a', 2.5);
      const m = P2.meaning; entry = ''; wrong = 0; page++;
      if (!attract) talk.who = 'TECH';
      talk.say(m, { name: 'NICKY (WIRE ROOM)', portrait: CAST.TECH.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1a2028' }, onDone: () => {
        if (page >= PAGES.length) { phase = 'calls'; call = 0; startCall(); } else { A.sfx('pager'); hint = false; }
      }, auto: attract ? 2 : 0 });
    } else {
      A.sfx('wrong'); wrong++; game.shake(2); entry = '';
      if (wrong >= 2) { toast('NICKY LEANS OVER', 'It\'s ' + PAGES[page].real.replace(/(\d{3})(\d{4})/, '$1-$2') + '. Jump every digit.', '#ffb040', 4); hint = true; }
      else toast('WRONG NUMBER', 'Jump each digit across the 5', '#ff7a6a', 2.5);
    }
  }
  /* ---- calls ---- */
  function startCall() { line = 0; typed = 0; flags = []; minimized = false; lineT = 0; A.sfx('ring'); game.after(.6, () => A.sfx('ring')); A.sfx('tape'); }
  const curLine = () => CALLS[call].lines[line];
  function flagLine() {
    if (minimized || !curLine() || flags.includes(line)) return;
    flags.push(line); A.sfx('pin');
    if (curLine()[2]) { CASE.wire.flagged++; toast('FLAGGED: PERTINENT', '"' + curLine()[1].slice(0, 40) + (curLine()[1].length > 40 ? '..."' : '"'), '#9ae89a', 2.2); }
    else { toast('FLAGGED', 'Nothing in that line. The ASA will strike it.', '#ffb040', 2.2); }
  }
  function minimize() {
    if (minimized) return;
    minimized = true; A.sfx('tape'); CASE.wire.minimized++;
    const c = CALLS[call];
    if (c.pertinent) toast('MINIMIZED A PERTINENT CALL', 'Whatever else they said is gone', '#ff7a6a', 3);
    else toast('MINIMIZED', line <= 3 ? 'By the book. The ASA nods.' : 'Late. That\'ll go in a report.', line <= 3 ? '#9ae89a' : '#ffb040', 3);
    if (!c.pertinent && line > 3) CASE.wire.violations++;
    game.after(1.4, endCall);
  }
  function endCall() {
    const c = CALLS[call];
    if (!c.pertinent && !minimized) { CASE.wire.violations++; toast('PRIVILEGED CALL, FULLY MONITORED', 'Violation logged. Minimize the personal ones.', '#ff5a4a', 3.5);
      if (!attract) { talk.who = 'ASA'; talk.say("That was his kid's sneakers, Detective. Minimize. Next time I pull the wire myself.", { name: 'ASA LINDQVIST', portrait: CAST.ASA.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#24202a' } }); } }
    call++;
    if (call >= CALLS.length) { phase = 'read'; game.after(1, ask); } else game.after(1.2, startCall);
  }
  function ask() {
    if (attract) { CASE.wire.place = 'clock'; CASE.wire.time = 8; phase = 'done'; return; }
    talk.who = 'PELL';
    talk.say("So. \"The thing by the clock, where the boats come in.\" Where's the meet?", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' },
      choices: ['The clock tower pier, Locust Point', 'Penn Station clock', 'The Bromo-Seltzer tower', 'Nowhere. It\'s a dodge.'], onChoice: (i) => {
        CASE.wire.place = ['clock', 'penn', 'bromo', 'none'][i]; A.sfx(i === 0 ? 'right' : 'wrong');
        talk.who = 'PELL';
        talk.say(i === 0 ? "Boats and a clock. That's the old produce pier. Good." : "No boats at that one. Old produce pier on Locust Point has the clock and the boats. Write it down.", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, onDone: () => {
          talk.who = 'PELL';
          talk.say("And \"the two, not the other one.\" What time?", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, choices: ['Two o\'clock', 'Eight o\'clock', 'Five o\'clock', 'Ten o\'clock'], onChoice: (j) => {
            CASE.wire.time = [2, 8, 5, 10][j]; A.sfx(j === 1 ? 'right' : 'wrong');
            talk.who = 'PELL';
            talk.say(j === 1 ? "They jump the five on their times too. Two is eight. Tonight, eight o'clock... Smoke's crew runs late. Call it after midnight." : "They jump the five on everything. Two is eight. You'll get it. Tonight, then, late.", { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' }, onDone: () => { phase = 'done'; CASE.chapter = Math.max(CASE.chapter, 2); game.after(.5, () => game.go('chapter', { n: 3 })); } });
          } });
        } });
      } });
  }
  /* ---- the attract mode's operator ---- */
  function aiStep(dt) {
    aiT += dt;
    if (phase === 'pager' && !talk.open && aiT > .45) { aiT = 0; const want = PAGES[page] && PAGES[page].real[entry.length]; if (want) { for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) if (KEYS[y][x] === want) cur = [x, y]; press(want); } }
    if (phase === 'calls' && !minimized && curLine()) { const c = CALLS[call]; if (!c.pertinent && line >= 1 && typed > 10) minimize(); else if (curLine()[2] && typed > 12 && !flags.includes(line)) flagLine(); }
    if (phase === 'done' && aiT > 3) attractNext();
  }
  function update(dt) {
    tickToasts(dt); t += dt; if (flash > 0) flash -= dt;
    if (attract) { talk.update(dt); aiStep(dt); }
    else if (talk.update(dt)) return;
    const inp = game.input;
    if (phase === 'pager' && !attract) {
      if (inp.repeat('left')) { cur[0] = (cur[0] + 2) % 3; A.sfx('blip'); }
      if (inp.repeat('right')) { cur[0] = (cur[0] + 1) % 3; A.sfx('blip'); }
      if (inp.repeat('up')) { cur[1] = (cur[1] + 3) % 4; A.sfx('blip'); }
      if (inp.repeat('down')) { cur[1] = (cur[1] + 1) % 4; A.sfx('blip'); }
      if (inp.pressed('notebook')) hint = !hint;
      const p = inp.pointer(); if (p && inp.lastDevice === 'mouse') { const hit = keyHit(p[0], p[1]); if (hit) cur = hit; }
      const cl = inp.clicked(); if (cl) { const hit = keyHit(cl[0], cl[1]); if (hit) { cur = hit; press(keyAt(hit[0], hit[1])); } }
      else if (inp.pressed('interact') || (inp.pressed('confirm') && !inp.pressed('snap'))) press(keyAt(cur[0], cur[1]));
      if (inp.pressed('cancel')) press('*');
      for (let d = 0; d <= 9; d++) if (keyJust['Digit' + d] || keyJust['Numpad' + d]) { press(String(d)); for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) if (KEYS[y][x] === String(d)) cur = [x, y]; }
    }
    if (phase === 'calls') {
      const c = CALLS[call], ln = curLine();
      if (ln && !minimized) {
        const before = Math.floor(typed); typed += dt * 26;
        const s = ln[1]; if (Math.floor(typed) > before && Math.floor(typed) <= s.length && Math.floor(typed) % 2) { const ch = s[Math.floor(typed) - 1]; if (ch && ch !== ' ') A.sfx(syllable(ln[0], ch), { vol: .9 }); }
        if (typed > s.length) { lineT += dt; if (lineT > 1.3) { lineT = 0; typed = 0; line++; if (line >= c.lines.length) { game.after(.6, endCall); } } }
        if (!attract) {
          const cl = inp.clicked(); const btn = cl && callHit(cl[0], cl[1]);
          if (inp.pressed('interact') || btn === 'flag' || (inp.pressed('confirm') && !keyJust.Space)) flagLine();
          if (inp.pressed('cancel') || inp.pressed('crouch') || btn === 'min' || keyJust.KeyM) minimize();
        }
      }
    }
    for (const k in keyJust) delete keyJust[k];
  }
  const keyJust = {};
  addEventListener('keydown', e => { if (!e.repeat) keyJust[e.code] = true; });
  /* ---- layout ---- */
  const LAY = () => { const W = game.W, H = game.H, cx = Math.round(W / 2); return { W, H, cx, kx: cx + 40, ky: Math.round(H / 2) - 54, kw: 30, kh: 22, lcdX: cx - 170, lcdY: Math.round(H / 2) - 54 }; };
  function keyHit(x, y) { const l = LAY(); for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++) { const bx = l.kx + cx * (l.kw + 4), by = l.ky + cy * (l.kh + 4); if (x >= bx && x < bx + l.kw && y >= by && y < by + l.kh) return [cx, cy]; } return null; }
  function callHit(x, y) { const l = LAY(), by = l.H - 46; if (y >= by && y < by + 18) { if (x >= l.cx - 120 && x < l.cx - 10) return 'flag'; if (x >= l.cx + 10 && x < l.cx + 120) return 'min'; } return null; }
  function room(g, W, H) {
    // cinderblock, a drop ceiling, a high barred window, the desk
    px.rect(g, 0, 0, W, H, '#3a3e3a');
    for (let y = 22; y < H - 50; y += 10) for (let x = ((y / 10) % 2) * 12 - 12; x < W; x += 24) { px.rect(g, x, y, 23, 9, (x + y) % 3 ? '#4a4e48' : '#464a44'); px.rect(g, x, y, 23, 1, '#565a52'); }
    px.rect(g, 0, 0, W, 20, '#c8c4b4'); for (let x = 0; x < W; x += 40) px.rect(g, x, 0, 1, 20, '#8a8678');
    const fl = Math.sin(t * 37) > .97 ? '#8a8a7a' : '#f8f8e8'; px.rect(g, W * .25, 16, 60, 3, fl); px.rect(g, W * .65, 16, 60, 3, '#f8f8e8');
    px.rect(g, W - 90, 26, 60, 22, '#1a2430'); px.rect(g, W - 88, 28, 56, 18, '#4a5a6a'); for (let x = W - 86; x < W - 32; x += 8) px.rect(g, x, 26, 2, 22, '#2a2a2a');
    px.rect(g, 0, H - 50, W, 50, '#5a4430'); px.rect(g, 0, H - 50, W, 3, '#7a5e42');
    // the clock (it is always wrong in the basement)
    const ck = [W - 130, 37]; px.disc(g, ck[0], ck[1], 11, '#1a1a1a'); px.disc(g, ck[0], ck[1], 10, '#e8e4d8'); const a = t * .1; px.line(g, ck[0], ck[1], ck[0] + Math.round(Math.cos(a) * 7), ck[1] + Math.round(Math.sin(a) * 7), '#1a1a1a'); px.line(g, ck[0], ck[1], ck[0] + 4, ck[1] - 2, '#1a1a1a');
    // a reel-to-reel and a laptop on the desk; coffee
    const rx = 18, ry = H - 46; px.rect(g, rx, ry, 64, 30, '#2a2a2e'); for (const ox of [16, 48]) { px.disc(g, rx + ox, ry + 13, 10, '#1a1a1a'); px.disc(g, rx + ox, ry + 13, 3, '#8a8a8a'); const sp = t * (phase === 'calls' && !minimized ? 6 : .5); px.line(g, rx + ox, ry + 13, rx + ox + Math.round(Math.cos(sp) * 8), ry + 13 + Math.round(Math.sin(sp) * 8), '#5a5a5a'); }
    px.rect(g, W - 70, H - 44, 14, 18, '#e8e4d8'); px.rect(g, W - 68, H - 42, 10, 3, '#3a2010'); px.rect(g, W - 56, H - 40, 4, 8, '#e8e4d8');
  }
  function draw(r) {
    const l = LAY(), W = l.W, H = l.H;
    r.overlay(g => {
      room(g, W, H);
      txt(g, 'CH.2  THE WIRE', 8, 24, '#f0c060');
      txt(g, 'WESTERN DISTRICT, BASEMENT ROOM 0-11', 8, 34, '#a8a498');
      if (phase === 'brief' || phase === 'pager') drawPager(g, l);
      if (phase === 'calls') drawCall(g, l);
      if (phase === 'read' || phase === 'done') drawSummary(g, l);
      drawToasts(g, W, phase === 'calls' ? H - 104 : 50);
    });
    talk.draw(r);
  }
  function drawPager(g, l) {
    const P2 = PAGES[Math.min(page, PAGES.length - 1)], x = l.lcdX, y = l.lcdY;
    // the clone pager
    px.rect(g, x - 4, y - 4, 160, 96, '#101012'); px.rect(g, x - 2, y - 2, 156, 92, '#2a2a30');
    txt(g, 'CLONE PAGER • SMOKE • PAGE ' + (page + 1) + '/3', x + 4, y + 2, '#c8c8d0');
    px.rect(g, x + 4, y + 14, 144, 26, flash > 0 ? '#c8e8a0' : '#8aa070'); px.rect(g, x + 4, y + 14, 144, 2, '#6a8050');
    txt(g, enc(P2.real).replace(/(\d{3})(\d{4})/, '$1-$2'), x + 76, y + 18, '#1a2a10', { align: 'center', scale: 2, shadow: false });
    txt(g, 'REAL NUMBER', x + 4, y + 46, '#a8a8b0');
    const shown = (entry + '_______').slice(0, 7).replace(/(.{3})(.{4})/, '$1 $2');
    txt(g, shown, x + 76, y + 58, '#ffd060', { align: 'center', scale: 2 });
    // the keypad
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++) {
      const bx = l.kx + cx * (l.kw + 4), by = l.ky + cy * (l.kh + 4), sel = cur[0] === cx && cur[1] === cy && phase === 'pager';
      px.rect(g, bx, by + 2, l.kw, l.kh, '#0a0a0c'); px.rect(g, bx, by, l.kw, l.kh, sel ? '#f0c060' : '#d8d4c8'); px.rect(g, bx, by + l.kh - 3, l.kw, 3, sel ? '#b08a30' : '#9a968a');
      const k = keyAt(cx, cy); txt(g, k === '*' ? 'DEL' : k === '#' ? 'OK' : k, bx + l.kw / 2, by + 6, '#16181e', { align: 'center', shadow: false });
    }
    if (hint && phase === 'pager') {   // jump the 5: lines through the middle key
      const c5 = [l.kx + 1 * (l.kw + 4) + l.kw / 2, l.ky + 1 * (l.kh + 4) + l.kh / 2];
      for (const [a, b] of [[[0, 0], [2, 2]], [[1, 0], [1, 2]], [[2, 0], [0, 2]], [[0, 1], [2, 1]]]) {
        const pa = [l.kx + a[0] * (l.kw + 4) + l.kw / 2, l.ky + a[1] * (l.kh + 4) + l.kh / 2], pb = [l.kx + b[0] * (l.kw + 4) + l.kw / 2, l.ky + b[1] * (l.kh + 4) + l.kh / 2];
        px.line(g, Math.round(pa[0]), Math.round(pa[1]) + 7, Math.round(pb[0]), Math.round(pb[1]) + 7, '#e83a3a');
      }
      px.disc(g, Math.round(c5[0]), Math.round(c5[1]) + 7, 3, '#e83a3a');
      txt(g, 'JUMP THE 5:  1-9  2-8  3-7  4-6  5-0', l.kx + 51, l.ky - 11, '#ff8a7a', { align: 'center' });
    }
    if (phase === 'pager' && !talk.open && !attract) promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'up' : 'Pad:Digit1', 'Keys'], ['interact', 'Press'], [backAct(), 'Delete'], ['notebook', hint ? 'Hide hint' : 'Show hint']], l.cx, l.H - 16);
  }
  function drawCall(g, l) {
    const c = CALLS[call], x = Math.round(l.cx - 190), w = 380, y = 50;
    panel(g, x, y, w, l.H - 104, .92);
    txt(g, c.title, x + 8, y + 5, '#f0c060');
    const rec = !minimized; if (rec && Math.floor(t * 2) % 2) px.disc(g, x + w - 12, y + 9, 3, '#e83a3a'); txt(g, rec ? 'REC' : 'MINIMIZED', x + w - 20, y + 5, rec ? '#ff8a7a' : '#8a8a90', { align: 'right' });
    let yy = y + 20;
    c.lines.forEach((ln, i) => {
      if (i > line) return;
      const nm = (CAST[ln[0]] && CAST[ln[0]].name) || ln[0], shown = i < line ? ln[1] : ln[1].slice(0, Math.floor(typed));
      const lost = minimized && i >= line;
      const fl = flags.includes(i);
      txt(g, (fl ? '▸ ' : '  ') + (ln[0] === 'DANTE' ? 'UNKNOWN MALE' : nm) + ':', x + 8, yy, fl ? '#9ae89a' : '#c8b890');
      const body = lost ? '[ minimized ]' : S.subtitles ? shown : shown.replace(/[^ .,?!]/g, '~');
      const lines = E.font.wrap(body, w - 120);
      lines.forEach((s, k) => txt(g, s, x + 110, yy + k * 9, lost ? '#6a6a70' : '#f0ead8'));
      yy += Math.max(1, lines.length) * 9 + 3;
    });
    // the waveform of the voice
    const ln = curLine(); if (ln && !minimized) for (let i = 0; i < 60; i++) { const a = Math.abs(Math.sin(t * 20 + i * .7) * Math.sin(i * .3 + t * 3)) * (typed < ln[1].length ? 8 : 1); px.rect(g, x + 8 + i * 6, l.H - 66 - Math.round(a), 4, Math.max(1, Math.round(a * 2)), '#5ac08a'); }
    if (!attract) {
      const by = l.H - 46;
      for (const [bx, lab, act, col] of [[l.cx - 120, 'FLAG LINE', 'interact', '#2a4a2a'], [l.cx + 10, 'MINIMIZE', backAct('KeyM'), '#4a2a2a']]) {
        px.rect(g, bx, by, 110, 18, '#0a0a0c'); px.rect(g, bx + 1, by + 1, 108, 16, col); const gw = glyph(g, bx + 6, by + 4, act.startsWith('Pad:') ? act.slice(4) : codeFor(act)); txt(g, lab, bx + 10 + gw, by + 6, '#f0ead8');
      }
      txt(g, 'Flag what is about the business. Minimize anything personal, fast.', l.cx, l.H - 24, '#c8c0a8', { align: 'center' });
    }
  }
  function drawSummary(g, l) {
    const w = 300, x = Math.round(l.cx - w / 2), y = 54, W2 = CASE.wire;
    panel(g, x, y, w, 96, .92);
    txt(g, 'WIRE ROOM LOG', x + 8, y + 6, '#f0c060');
    txt(g, 'Pages decoded: ' + W2.pages + ' / 3', x + 8, y + 22); txt(g, 'Pertinent lines flagged: ' + W2.flagged + ' / 4', x + 8, y + 34);
    txt(g, 'Minimization violations: ' + W2.violations, x + 8, y + 46, W2.violations ? '#ff8a7a' : '#9ae89a');
    txt(g, 'The meet: ' + (W2.place ? (W2.place === 'clock' ? 'Clock tower pier' : 'wrong place, corrected') : '...') + (W2.time ? '  •  ' + (W2.time === 8 ? 'the eight (after midnight)' : 'wrong time, corrected') : ''), x + 8, y + 58, '#e8e2d0');
  }
  return { view: 'side', res: 'ps1', pausable: true, enter, update, draw, talk: () => talk, state: () => ({ phase, page, call, line, wire: CASE.wire }), exit() { } };
})();

/* ============================================================================
 * 35-board: CHAPTER 3, THE BOARD. The detail's office above a tire shop. Pin the evidence to the organization's
 * pyramid, string the yarn, find the hole at the top. Then the Major comes in wanting dope on the table.
 * ========================================================================== */
const BOARD = (() => {
  const SLOTS = [
    { key: 'dante', role: 'THE TOP', desc: 'Dante Pryor. No photo on file. Ever.', locked: true, at: [.5, 0] },
    { key: 'smoke', role: 'LIEUTENANT', desc: 'Runs the corners, picks up the money', at: [.5, 1] },
    { key: 'kev', role: 'CORNER', desc: 'Handles the cash, never the product', at: [.14, 2] },
    { key: 'tater', role: 'RUNNER', desc: 'Holds the vials, serves the fiends', at: [.32, 2] },
    { key: 'stash', role: 'STASH', desc: 'Where the package sleeps', at: [.5, 2] },
    { key: 'burner', role: 'PHONE', desc: 'The number that got us the wire', at: [.68, 2] },
    { key: 'lookout', role: 'LOOKOUT', desc: 'Twelve years old. Paid to yell.', at: [.86, 2] }
  ];
  const PARENT = { smoke: 'dante', kev: 'smoke', tater: 'smoke', stash: 'tater', burner: 'kev', lookout: 'kev' };
  let talk, cards, pinned, cur, picking, pick, phase, attract, aiT, t;
  function buildCards() {
    const find = (pred) => CASE.photos.find(pred);
    const mk = (key, name, photo, fallback) => ({ key, name, photo: photo || { rigs: fallback, time: '' }, file: !photo });
    const list = [
      mk('smoke', 'SMOKE', find(p => p.id === 'smoke'), [CAST.SMOKE.rig]),
      mk('kev', "LIL' KEV", find(p => p.id.startsWith('h2h-pay')), [CAST.KEV.rig]),
      mk('tater', 'TATER', find(p => p.id.startsWith('h2h-serve')), [CAST.TATER.rig]),
      mk('stash', 'RED DOOR', find(p => p.id === 'stash'), [CAST.TATER.rig]),
      mk('burner', 'BURNER', find(p => p.id === 'burner'), []),
      mk('lookout', 'LOOKOUT', find(p => p.id === 'lookout'), [CAST.LOOKOUT.rig])
    ];
    if (list[4].file) list[4].photo = { id: 'burner', time: '' };
    // shuffle, the way a desk gets
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function enter(data) {
    data = data || {};
    attract = !!data.attract; t = 0; aiT = 0; talk = talk || makeTalk(); cards = buildCards(); pinned = {}; cur = 1; picking = false; pick = 0; phase = 'brief';
    L.enabled = false; game.weather = null; music('board'); TOASTS.length = 0; CASE.board = 0;
    if (attract) { phase = 'pin'; return; }
    scene(talk, [
      ['PELL', "Every detail gets a board. Ours is cork from a school that closed in ninety-eight. Pin what you got. Name, face, where they sit."],
      ['PELL', "Money goes up, orders come down. Corner boy answers to the lieutenant, the lieutenant answers to the top. String it so a judge can follow it with his finger."],
      ['BRANDT', "And the top?"], ['PELL', "Fourteen years and nobody's got one picture of Dante Pryor. Not a booking photo, not a wedding, nothing. Man is a rumor with a lawyer."]
    ], () => { phase = 'pin'; });
  }
  const slotXY = (s) => { const W = game.W, H = game.H, gap = Math.floor((H - 68 - 26) / 3); return [Math.round(s.at[0] * W), 26 + s.at[1] * gap]; };
  const CW = 30, CH = 35;
  function pinTo(slot, card) {
    if (!slot || !card || slot.locked || pinned[slot.key]) return;
    if (slot.key === card.key) {
      pinned[slot.key] = card; A.sfx('pin'); A.sfx('right'); CASE.board += card.file ? .5 : 1;
      toast('PINNED: ' + card.name, card.file ? 'Old booking photo. Your own picture would be better.' : slot.desc, card.file ? '#ffb040' : '#9ae89a', 2.5);
      cards = cards.filter(c => c !== card); pick = Math.min(pick, cards.length - 1);
      if (SLOTS.every(s => s.locked || pinned[s.key])) { phase = 'full'; picking = false; game.after(1, major); }
    } else {
      A.sfx('wrong'); game.shake(1);
      if (!attract) { talk.who = 'PELL'; talk.say(E.pick(["That's not where he sits. Look at what he does, not what he looks like.", "No. Money goes up, Detective. Follow the money.", "You want to explain that to a defense attorney? Try again."]), { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' } }); }
    }
  }
  function major() {
    phase = 'major';
    if (attract) { game.after(2, attractNext); return; }
    scene(talk, [
      ['MAJOR', "Nice board. Very nice. Arts and crafts. You know what the Deputy Ops asked me at COMSTAT this morning? He asked me where the dope is."],
      ['MAJOR', "Not the yarn, Lieutenant. The dope. On a table, with a camera. I want that red-door vacant hit by Friday."],
      ['HASKINS', "We hit the stash, we get Tater and a bag, and Pryor changes every phone we're up on. The wire goes dark."],
      ['MAJOR', "And my numbers go up. The wire was always going to go dark. They always do."]
    ], () => talk.say('What does Okafor say?', { name: 'DET. DEE OKAFOR', portrait: CAST.DEE.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a3a' }, choices: ['"Give us tonight. We know where Pryor will be."', '"Yes, sir. Friday."'], onChoice: (i) => {
      CASE.pushed = i === 0;
      scene(talk, i === 0 ? [
        ['MAJOR', "Tonight. One night, Okafor, and then I get my table. You get a picture of your rumor, or you get nothing."],
        ['HASKINS', "That's more than he gives anybody. Go."]
      ] : [
        ['MAJOR', "See, Lieutenant? Somebody here understands the job."],
        ['HASKINS', "(quietly) Okafor. The meet's tonight. The raid's Friday. Get me his face before the Major gets his dope."]
      ], () => { CASE.chapter = Math.max(CASE.chapter, 3); game.go('chapter', { n: 4 }); });
    } }));
  }
  function aiStep(dt) {
    aiT += dt; if (aiT < 1.1 || phase !== 'pin' || !cards.length) return; aiT = 0;
    const c = cards[0], s = SLOTS.find(x => x.key === c.key); cur = SLOTS.indexOf(s); pinTo(s, c);
  }
  function update(dt) {
    tickToasts(dt); t += dt;
    if (attract) { talk.update(dt); aiStep(dt); return; }
    if (talk.update(dt)) return;
    if (phase !== 'pin') return;
    const inp = game.input, open = SLOTS.map((s, i) => i).filter(i => !SLOTS[i].locked && !pinned[SLOTS[i].key]);
    const p = inp.pointer(), cl = inp.clicked();
    if (!open.length || !cards.length) { picking = false; return; }
    if (!picking) {
      if (!open.includes(cur)) cur = open[0];
      const mv = (dx, dy) => { const [x0, y0] = slotXY(SLOTS[cur]); let best = null, bd = 1e9; for (const i of open) { if (i === cur) continue; const [x, y] = slotXY(SLOTS[i]), ddx = x - x0, ddy = y - y0; if (dx && Math.sign(ddx) !== dx) continue; if (dy && Math.sign(ddy) !== dy) continue; const d = Math.abs(ddx) * (dy ? 2 : 1) + Math.abs(ddy) * (dx ? 2 : 1); if (d < bd) { bd = d; best = i; } } if (best !== null) { cur = best; A.sfx('blip'); } };
      if (inp.repeat('left')) mv(-1, 0); if (inp.repeat('right')) mv(1, 0); if (inp.repeat('up')) mv(0, -1); if (inp.repeat('down')) mv(0, 1);
      if (p && inp.lastDevice === 'mouse') for (const i of open) { const [x, y] = slotXY(SLOTS[i]); if (Math.abs(p[0] - x) < CW / 2 + 4 && Math.abs(p[1] - y - 20) < 22) cur = i; }
      const clickSlot = cl && open.find(i => { const [x, y] = slotXY(SLOTS[i]); return Math.abs(cl[0] - x) < CW / 2 + 4 && Math.abs(cl[1] - y - 20) < 22; });
      if (inp.pressed('interact') || inp.pressed('confirm') || clickSlot !== undefined && clickSlot !== null) { if (clickSlot !== undefined && clickSlot !== null) cur = clickSlot; picking = true; pick = 0; A.sfx('select'); }
    } else {
      if (inp.repeat('left')) { pick = (pick + cards.length - 1) % cards.length; A.sfx('blip'); }
      if (inp.repeat('right')) { pick = (pick + 1) % cards.length; A.sfx('blip'); }
      const tray = trayXY();
      if (p && inp.lastDevice === 'mouse') cards.forEach((c, i) => { const [x, y] = tray(i); if (p[0] >= x && p[0] < x + CW && p[1] >= y && p[1] < y + CH) pick = i; });
      const clickCard = cl && cards.findIndex((c, i) => { const [x, y] = tray(i); return cl[0] >= x && cl[0] < x + CW && cl[1] >= y && cl[1] < y + CH; });
      if (inp.pressed('cancel')) { picking = false; A.sfx('cancel'); }
      else if (inp.pressed('interact') || inp.pressed('confirm') || (clickCard !== null && clickCard >= 0)) { if (clickCard !== null && clickCard >= 0) pick = clickCard; picking = false; pinTo(SLOTS[cur], cards[pick]); }
    }
  }
  const trayXY = () => { const W = game.W, H = game.H, n = cards.length, x0 = Math.round(W / 2 - n * (CW + 8) / 2); return (i) => [x0 + i * (CW + 8), H - 61]; };
  function draw(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      // the office wall and the cork
      px.rect(g, 0, 0, W, H, '#4a4234');
      const bx = 10, by = 22, bw = W - 20, bh = H - 90;
      px.rect(g, bx - 3, by - 3, bw + 6, bh + 6, '#5a3a22'); px.rect(g, bx, by, bw, bh, '#b08a5a');
      for (let i = 0; i < 400; i++) { const x = bx + ((i * 97) % bw), y = by + ((i * 53 + i * i) % bh); px.dot(g, x, y, i % 2 ? '#9a7448' : '#c09a68'); }
      txt(g, 'CH.3  THE BOARD  •  PRYOR ORGANIZATION', 10, 6, '#f0c060');
      // yarn from each pinned card to its boss
      for (const s of SLOTS) { const par = PARENT[s.key]; if (!par || !(pinned[s.key])) continue; const ps = SLOTS.find(x => x.key === par); const [x0, y0] = slotXY(s), [x1, y1] = slotXY(ps); px.line(g, x0, y0 + 2, x1, y1 + CH, '#c82a2a'); }
      for (let i = 0; i < SLOTS.length; i++) {
        const s = SLOTS[i], [x, y] = slotXY(s), sel = i === cur && phase === 'pin' && !attract;
        const card = pinned[s.key];
        if (s.locked) {   // the hole at the top: a silhouette and a question mark
          px.rect(g, x - CW / 2 + 2, y + 2, CW, CH, '#000'); px.rect(g, x - CW / 2, y, CW, CH, '#e8e4d8'); px.rect(g, x - CW / 2 + 3, y + 3, CW - 6, CW - 6, '#1a1a1c');
          px.disc(g, x, y + 11, 5, '#3a3a3e'); px.rect(g, x - 8, y + 17, 16, 8, '#3a3a3e'); txt(g, '?', x, y + 7, '#c82a2a', { align: 'center' });
        } else if (card) polaroid(g, x - CW / 2, y, card.photo, CW);
        else { px.blend(g, sel ? .3 : .12, 'normal', () => px.rect(g, x - CW / 2, y, CW, CH, sel ? '#f0c060' : '#000000')); for (let k = 0; k < CW; k += 4) { px.dot(g, x - CW / 2 + k, y, '#5a3a22'); px.dot(g, x - CW / 2 + k, y + CH - 1, '#5a3a22'); } }
        if (sel) { px.rect(g, x - CW / 2 - 2, y - 2, CW + 4, 2, '#ffd040'); px.rect(g, x - CW / 2 - 2, y + CH, CW + 4, 2, '#ffd040'); px.rect(g, x - CW / 2 - 2, y, 2, CH, '#ffd040'); px.rect(g, x + CW / 2, y, 2, CH, '#ffd040'); }
        px.disc(g, x, y + 1, 2, '#c82a2a');
        // the index card under it
        px.rect(g, x - 30, y + CH + 1, 60, 10, card ? '#f0ece0' : '#e0d8c4'); txt(g, card ? card.name : s.role, x, y + CH + 2, card ? '#1a1a2a' : '#8a1a1a', { align: 'center', shadow: false });
      }
      // the tray of photos on the desk
      px.rect(g, 0, H - 66, W, 66, '#3a2e22'); px.rect(g, 0, H - 66, W, 2, '#5a4632');
      const tray = trayXY();
      cards.forEach((c, i) => { const [x, y] = tray(i); polaroid(g, x, y - (picking && i === pick ? 6 : 0), c.photo, CW, picking && i === pick); if (c.file) txt(g, 'FILE', x + CW / 2, y + CW - 4, '#8a1a1a', { align: 'center', shadow: false }); });
      if (phase === 'pin' && !talk.open && !attract) {
        const s = SLOTS[cur];
        if (s) { const m = (picking ? 'Pin ' + (cards[pick] ? cards[pick].name : '') + ' as ' : '') + s.role + ': ' + s.desc; const w = E.font.width(m) + 10; px.blend(g, .75, 'normal', () => px.rect(g, W / 2 - w / 2, H - 25, w, 11, '#000')); txt(g, m, W / 2, H - 23, '#f8f0d8', { align: 'center' }); }
        promptRow(g, picking ? [['left', 'Choose'], ['interact', 'Pin it'], [backAct(), 'Back']] : [['up', 'Move'], ['interact', 'Pick a photo for this slot']], W / 2, H - 13);
      }
      drawToasts(g, W, Math.round(H / 2 - 30));
    });
    talk.draw(r);
  }
  return { view: 'side', res: 'ps1', pausable: true, enter, update, draw, talk: () => talk, state: () => ({ phase, pinned: Object.keys(pinned), cards: cards.map(c => c.key), cur, picking }), exit() { } };
})();

/* ============================================================================
 * 40-meet: CHAPTER 4, THE MEET. The container yard by the old clock-tower pier, after midnight, in the rain.
 * Get through a cut in the fence, slip the muscle's flashlights, and photograph Dante Pryor with his connect
 * under the clock. Then get out the way you came.
 * ========================================================================== */
const MEET = (() => {
  const CW = 40, CHh = 32;
  const G = Array.from({ length: CHh }, () => Array(CW).fill(','));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = ch; };
  fill(0, 0, CW - 1, 3, '~'); fill(0, 4, CW - 1, 9, '='); fill(15, 3, 24, 7, 'K');
  // container rows: aisles every few cells; some stacked two high
  const box = (x, y, w, h, ch) => fill(x, y, x + w - 1, y + h - 1, ch);
  box(2, 11, 5, 2, 'r'); box(9, 11, 4, 2, 'b'); box(26, 11, 5, 2, 'g'); box(33, 11, 5, 2, 'R');
  box(2, 15, 3, 2, 'B'); box(7, 15, 5, 2, 'w'); box(14, 14, 2, 4, 'r'); box(24, 14, 2, 4, 'b'); box(28, 15, 5, 2, 'G'); box(35, 15, 3, 2, 'w');
  box(2, 19, 6, 2, 'g'); box(10, 19, 4, 2, 'R'); box(17, 20, 6, 2, 'w'); box(26, 19, 4, 2, 'r'); box(32, 19, 6, 2, 'B');
  box(4, 23, 4, 1, 'b'); box(12, 23, 3, 1, 'g'); box(25, 23, 4, 1, 'r'); box(32, 23, 3, 1, 'w');
  fill(1, 26, 38, 26, 'f'); G[26][5] = ','; G[26][19] = ','; G[26][20] = ',';
  fill(0, 27, CW - 1, 30, '.'); fill(0, 31, CW - 1, 31, '#'); fill(0, 0, 0, 31, '#'); fill(CW - 1, 0, CW - 1, 31, '#');
  for (let x = 2; x < 38; x += 4) G[28][x] = 'y';
  const crate = (c, h) => ({ h, top: E.tones(c).lt, side: c, face: 'plank', roof: 'plain' });
  const map = new E.TileMap({ rows: G.map(r => r.join('')),
    legend: { '#': 1, K: 2, f: 3, r: 10, b: 11, g: 12, w: 13, R: 14, B: 15, G: 16, '~': { floor: 'water', block: true }, '=': { floor: 'plank' }, ',': { floor: 'conc' }, '.': { floor: 'road' }, y: { floor: 'line' } },
    types: {
      1: { h: 30, top: '#2a2a2e', side: '#3a3a40', face: 'stone', roof: 'plain', cut: true, cutH: 4 },
      2: { h: 76, top: '#3a2e2a', side: '#7a4a38', face: 'brick', roof: 'slab', windows: { lit: .15, w: 5, h: 10, step: 20, from: 14 } },
      3: { h: 26, top: '#7a7a80', side: '#5a5a62', face: 'none', roof: 'plain' },
      10: crate('#8a3a26', 34), 11: crate('#2a4a7a', 34), 12: crate('#2e5a3a', 34), 13: crate('#a8a8a0', 34), 14: crate('#7a2e22', 66), 15: crate('#22406a', 66), 16: crate('#2a4a30', 66)
    },
    floorTex: (x, y, tag) => streetFloor(x, y, tag), outside: '#0c1420', ao: 6
  });
  const C = (cx, cy) => ({ x: cx * T, y: cy * T });
  const SPOT = { car: C(9, 28.3), cut: C(5.5, 26.5), meet: C(19.8, 9.6), suvAt: C(23.5, 9.2), suvIn: C(41, 9.2) };
  const MYCAR = { x0: 8 * T, y0: 27.6 * T, x1: 10 * T, y1: 28.6 * T, color: UNMARKED, ex: 9 * T, ey: 27.2 * T, body: true };
  const LAMPS = [[3, 9.6], [12, 9.6], [28, 9.6], [36, 9.6], [19.5, 25.4], [9, 25.4], [31, 25.4], [14, 29.8], [26, 29.8]].map(([x, y]) => [x * T, y * T]);
  let dets, muscle, dante, conn, smoke, suv, talk, clock, phase, meetT, ended, over, notebook, made, fenceCrossed, aiT;
  const OBJ = () => [
    { t: 'Get inside the yard unseen', n: fenceCrossed ? 1 : 0, of: 1 },
    { t: 'Photograph Pryor with the connect', n: CASE.meet ? 1 : 0, of: 1 },
    { t: '(Bonus) Photograph the Escalade\'s tag', n: CASE.plate ? 1 : 0, of: 1 },
    { t: 'Get back out to the car', n: ended ? 1 : 0, of: 1 }
  ];
  function subjects() {
    const list = [];
    if (phase === 'talk') list.push({ id: 'meet', label: 'Dante Pryor meets the connect', note: 'Pryor in person, with the man who brings the package in. This is the case.', pts: () => [dante, conn], rigs: () => [CAST.DANTE.rig, connRig], active: () => phase === 'talk', onShot: () => { CASE.meet = true; } });
    if (suv && suv.parked) list.push({ id: 'plate', label: "Tag on Pryor's Escalade", note: 'Registered to a funeral home on Edmondson. Of course it is.', pts: () => [{ x: suv.x + 18, y: suv.y, z: 0 }], rigs: () => [], active: () => suv && suv.parked, onShot: () => { CASE.plate = true; } });
    return list;
  }
  const connRig = H({ build: 'heroic', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e8c8a8', hair: '#d8d8d0', cloth: '#d0c8b0', coat: '#4a4038', pants: '#3a342e', boot: '#2a1e18' } });

  function enter(data) {
    data = data || {};
    clock = 0; phase = 'wait'; meetT = 0; ended = false; over = false; notebook = false; made = 0; fenceCrossed = false; aiT = 0;
    CASE.meet = false; CASE.plate = false; CASE.photos = CASE.photos.filter(p => p.id !== 'meet' && p.id !== 'plate');
    TOASTS.length = 0; BUBBLES.length = 0; talk = talk || makeTalk();
    const p1 = new Detective(MYCAR.ex, MYCAR.ey, 'DEE', game.input, { facing: -Math.PI / 2, color: '#f0c060' });
    dets = [p1];
    if (data.attract) { p1.ai = { move: [0, 0], down: {}, pressed: {} }; p1.ghost = true; }
    muscle = [
      new Watcher(19.5 * T, 25 * T, soldierRig(0), { who: 'SMOKE', scan: [Math.PI / 2, -Math.PI / 2, Math.PI * .1, Math.PI * .9], range: 100, fov: 1.2 }),
      new Watcher(8 * T, 13.5 * T, soldierRig(1), { who: 'SMOKE', route: [[8 * T, 13.5 * T], [22 * T, 13.2 * T, 2], [22 * T, 18.5 * T], [8 * T, 18 * T, 2]], scan: true, range: 96, fov: 1.0, speed: 26 }),
      new Watcher(31 * T, 17.8 * T, soldierRig(0), { who: 'SMOKE', route: [[31 * T, 17.8 * T], [31 * T, 22 * T, 2], [16 * T, 22.4 * T], [24 * T, 22.4 * T, 2]], scan: true, range: 96, fov: 1.0, speed: 24 })
    ];
    muscle[1].flash = muscle[2].flash = true; muscle[0].facing = Math.PI / 2;
    dante = new Walker(SPOT.suvAt.x, SPOT.suvAt.y, CAST.DANTE.rig, { who: 'DANTE' }); dante.hidden = true;
    conn = new Walker(12 * T, 7 * T, connRig, { who: 'CALLER' }); conn.hidden = true;
    smoke = new Walker(17 * T, 9.8 * T, CAST.SMOKE.rig, { who: 'SMOKE' }); smoke.facing = 0;
    suv = { x: SPOT.suvIn.x, y: SPOT.suvIn.y, parked: false, vx: 0 };
    game.cam.bounds = v => map.bounds(v); game.cam.offset = [0, -6];
    L.enabled = true; L.ambient = .34;
    game.weather = { kind: 'rain', amount: .55, wind: .25, lightning: 0 };
    music('meet'); A.layer('heat', 0, .02); A.layer('alarm', 0, .02);
    if (!data.attract) game.allowJoin({ max: 2, onJoin: (inp) => { const d = new Detective(p1.x + 12, p1.y, 'BRANDT', inp, { color: '#7ac0ff' }); dets.push(d); toast('DET. BRANDT JOINS', 'Player 2 is in the yard', '#7ac0ff'); } });
    if (!data.attract && !data.skipBrief) scene(talk, [
      ['PELL', "Locust Point. Old Chesapeake Produce pier, the one with the clock that ain't told the right time since Schaefer was a beer people drank."],
      ['PELL', "\"The thing by the clock, the eight.\" That's tonight. Pryor don't come out for nothing. He'll come out for the man who brings it in."],
      ['HASKINS', "Three of his muscle walk that yard. Flashlights, not guns, far as we know. You get seen, the meet doesn't happen, and Pryor learns our faces."],
      ['DEE', "There's a cut in the fence on the west end. Kids go through it to fish."],
      ['HASKINS', "Then go fishing, Detective. One picture of Pryor and the connect, together. Then get out."]
    ], () => toast('CHAPTER 4: THE MEET', 'Locust Point, 12:40 AM', '#f0c060', 4));
  }
  function meetScript(dt) {
    if (phase === 'wait' && (fenceCrossed || clock > 50)) {
      phase = 'arrive'; suv.vx = -60; A.sfx('car');
      toast('HEADLIGHTS', 'A black Escalade rolls up the pier', '#f0c060', 3);
    }
    if (phase === 'arrive') {
      suv.x += suv.vx * dt; if (suv.x <= SPOT.suvAt.x + 14) { suv.x = SPOT.suvAt.x + 14; suv.vx = 0; suv.parked = true; phase = 'walk';
        dante.hidden = false; dante.body.x = suv.x - 20; dante.body.y = suv.y + 12; dante.go([SPOT.meet.x + 10, SPOT.meet.y]);
        conn.hidden = false; conn.body.x = 12 * T; conn.body.y = 8 * T; conn.go([SPOT.meet.x - 8, SPOT.meet.y]); }
    }
    if (phase === 'walk' && dante.idle && conn.idle) {
      phase = 'talk'; meetT = 0; dante.face(conn.x, conn.y); conn.face(dante.x, dante.y); smoke.face(dante.x, dante.y);
    }
    if (phase === 'talk') {
      meetT += dt;
      const lines = [[0, dante, 'DANTE', "You came yourself. I like that."], [4, conn, 'CALLER', "Business is business. The ships don't care who's king."],
        [9, dante, 'DANTE', "Same as last time. The boat on the twelfth."], [14, conn, 'CALLER', "Price went up. The canal union is asking questions."],
        [19, dante, 'DANTE', "Then it goes up. My name is my name."], [24, conn, 'CALLER', "Your name. Yes. Always the name with you people."], [30, smoke, 'SMOKE', 'We good?']];
      for (const [t, w, who, text] of lines) if (meetT - dt < t && meetT >= t) bark(who, w.body, text, 3.6);
      if (meetT > 34) {   // they part; the car leaves and comes back for another pass
        phase = 'leave'; dante.go([suv.x - 20, suv.y + 12]).then(w => { w.hidden = true; }); conn.go([12 * T, 7 * T]).then(w => { w.hidden = true; });
      }
    }
    if (phase === 'leave' && dante.hidden && conn.hidden) { phase = 'gone'; suv.parked = false; suv.vx = 70; meetT = 0; A.sfx('car'); if (!CASE.meet) toast('THEY ARE LEAVING', 'Smoke says they will circle back', '#ff9a6a', 3); }
    if (phase === 'gone') { suv.x += suv.vx * dt; meetT += dt; if (meetT > 14) { phase = 'arrive'; suv.vx = -60; A.sfx('car'); } }
  }
  function finish() {
    if (ended) return; ended = true; CASE.chapter = Math.max(CASE.chapter, 4);
    scene(talk, [
      ['DEE', "Got him. Pryor and the Dutchman, face to face under the clock. Got the tag too, if anybody cares."],
      ['HASKINS', "I care. A judge will care. Go home, Okafor. Sleep. It all falls apart in the morning, it always does."]
    ], () => game.go('ending'));
  }
  const AI_PATH = [[9, 27.2], [5.5, 27.2], [5.5, 25], [5.5, 22], [9, 21.6], [9, 14], [12.5, 13.6], [12.5, 10.5], [5.5, 25], [5.5, 27.2]];
  function aiDrive(d, dt) {
    aiT += dt; const ai = d.ai; ai.pressed = {}; ai.down = {};
    const live = subjects().filter(s => s.active() && !CASE.has(s.id));
    let tgt = null; for (const s of live) { const c = subjectCenter(s); if (Math.hypot(c[0] - d.x, c[1] - d.y) < 140) { tgt = c; break; } }
    if (tgt) { ai.down.aim = true; ai.lens = tgt; ai.move = [0, 0]; if (d.lens.on && Math.hypot(d.lens.x - tgt[0], d.lens.y - tgt[1]) < 6 && Math.floor(aiT * 4) % 6 === 0) ai.pressed.snap = true; return; }
    d.aiAt = d.aiAt || 0; const p = AI_PATH[d.aiAt % AI_PATH.length], dx = p[0] * T - d.x, dy = p[1] * T - d.y, n = Math.hypot(dx, dy);
    if (n < 6) { d.aiWait = (d.aiWait || 0) + dt; ai.move = [0, 0]; if (d.aiWait > (d.aiAt % AI_PATH.length === 7 ? 18 : 1.2)) { d.aiWait = 0; d.aiAt++; } } else ai.move = [dx / n, dy / n];
  }
  function update(dt) {
    tickToasts(dt); tickBubbles(dt);
    if (dets.length > 1) game.cam.frame(dets.map(d => d.hero), { margin: 50, zoom: [.6, 1] });
    else { const d = dets[0], k = d.lens.k * .55; game.focus(lerp(d.x, d.lens.x, k), lerp(d.y, d.lens.y, k), 10); }
    if (talk.update(dt)) return;
    if (game.input.pressed('view')) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (notebook) { if (game.input.pressed('notebook') || game.input.pressed('cancel')) notebook = false; return; }
    if (game.input.pressed('notebook')) { notebook = true; A.sfx('select'); return; }
    clock += dt;
    const ctx = { subjects: subjects(), map, clock: 7200 + clock * 4, chapter: 4 };
    for (const d of dets) {
      if (d.ai) aiDrive(d, dt);
      const h = d.hero, pressedI = d.ai ? !!d.ai.pressed.interact : d.inp.pressed('interact');
      d.act = null;
      if (!ended && !over && CASE.meet && Math.hypot(h.x - (MYCAR.x0 + MYCAR.x1) / 2, h.y - MYCAR.y0 + 6) < 26) d.act = { label: 'Get in the car', act: finish };
      if (pressedI && d.act && !d.lens.on) { d.act.act(); continue; }
      d.update(dt, map, ctx);
      if (h.y < 25.6 * T) fenceCrossed = true;
    }
    if (d0().ai && CASE.meet && Math.hypot(d0().x - MYCAR.ex, d0().y - MYCAR.ey) < 20 && !ended) { ended = true; game.after(2, attractNext); }
    meetScript(dt);
    for (const w of [dante, conn, smoke]) w.update(dt, map);
    for (const w of muscle) {
      const st = over || ended ? 'calm' : w.look(dt, dets, map);
      if (w.mind.changed && st === 'notice') bark('SMOKE', w.body, E.pick(['Who out there?', 'Yo. Hold up.', "Thought I heard somethin'."]), 1.8);
      if (w.mind.changed && st === 'alert') { bark('SMOKE', w.body, E.pick(['HEY! Right there!', 'Police! Somebody out here!']), 2.2); A.sfx('whistle'); }
      w.think(dt, map);
      if (st === 'alert' && !over) for (const d of dets) if (!d.ghost && Math.hypot(d.x - w.x, d.y - w.y) < 16) { over = true; made = 1; A.sfx('hurt'); game.flash('#ffffff', .1); game.after(1.8, () => game.go('burned', { from: 'meet', why: "Pryor's muscle put a flashlight in your face. The Escalade never stopped. By morning every phone in the organization was in the harbor." })); }
    }
    const heat = muscle.some(w => w.mind.state === 'search' || w.mind.state === 'alert');
    if (heat !== update.heat) { update.heat = heat; A.layer('heat', heat ? 1 : 0, heat ? .3 : 2); A.layer('alarm', heat ? 1 : 0, heat ? .5 : 2); }
  }
  const d0 = () => dets[0];
  function draw(r) {
    map.drawFloor(r); map.queueWalls(r);
    drawCarTop(r, MYCAR);
    for (const [x, y] of LAMPS) r.prop('streetlamp', x, y, 0, { light: true, size: 1.1, cone: true });
    r.prop('sandbags', 30 * T, 8 * T, 0, { size: 1.2 }); r.prop('barrel', 6 * T, 8 * T, 0, { size: 1.2 }); r.prop('barrel', 7 * T, 8.3 * T, 0, { size: 1.2 }); r.prop('firedrum', 34 * T, 25 * T, 0, { light: true, size: 1.2 }); r.prop('crate', 21 * T, 24.6 * T, 0, { size: 1.2 });
    // the clock on the tower's face, stopped at a quarter to eight
    const cx = 19.5 * T, cy = 7.98 * T;
    r.queue(cx, cy, 56, g => { const p = r.w(cx, cy, 58); const x = Math.round(p[0]), y = Math.round(p[1]); px.disc(g, x, y, 9, '#1a1410'); px.disc(g, x, y, 8, '#e8dcb0'); px.line(g, x, y, x, y - 6, '#1a1410'); px.line(g, x, y, x - 4, y + 1, '#1a1410'); px.dot(g, x, y, '#8a1a1a'); }, { emissive: true, bias: 3 });
    L.add(cx, cy + 4, 58, 50, .5, { color: '#f0e0a0' });
    // the Escalade
    if (suv.x < 40 * T) { const s = { x0: suv.x - 18, y0: suv.y - 8, x1: suv.x + 18, y1: suv.y + 8, color: '#101014', lit: true };
      r.queue(suv.x, suv.y, 0, g => { r.box(g, s.x0, s.y0, 0, s.x1, s.y1, 15, '#1e1e24', '#0c0c10'); }, { bias: 0 }); drawCarTop(r, s);
      L.add(suv.x - 26, suv.y, 6, 70, .9, { color: '#fff4d0' }); }
    if (fenceCrossed && !CASE.meet) r.marker(SPOT.meet.x, SPOT.meet.y, 30, { label: 'THE CLOCK', color: '#ffd040' });
    if (!fenceCrossed) r.marker(SPOT.cut.x, SPOT.cut.y, 10, { label: 'CUT IN THE FENCE', color: '#9ae89a' });
    if (CASE.meet && !ended) r.marker((MYCAR.x0 + MYCAR.x1) / 2, MYCAR.y0, 24, { label: 'YOUR CAR', color: '#80e0ff' });
    for (const w of muscle) {
      if (S.cones) r.sightCone(w, { map, range: w.range, fov: w.fov, color: MOOD[w.mind.state], alpha: w.mind.state === 'calm' ? .2 : .36 });
      if (w.flash) L.add(w.x + Math.cos(w.facing) * 34, w.y + Math.sin(w.facing) * 34, 8, 44, .8, { color: '#fff4c8' });
      w.draw(r);
    }
    for (const w of [dante, conn, smoke]) w.draw(r);
    for (const d of dets) d.draw(r);
    r.overlay(g => {
      for (const w of muscle) if (w.mind.state !== 'calm') { const p = r.w(w.x, w.y, 50), a = w.mind.state === 'alert'; txt(g, a ? '!' : '?', p[0], p[1] - 8, MOOD[w.mind.state], { align: 'center', scale: a ? 2 : 1 }); E.ui.bar(g, Math.round(p[0]) - 7, Math.round(p[1]) + 4, 14, 2, Math.min(1, w.mind.level), MOOD[w.mind.state]); }
      drawBubbles(r, g);
      for (const d of dets) d.drawLens(r, g);
      drawViewfinder(g, r.W, r.H, dets[0], 7200 + clock * 4);
      hud(r, g);
      if (notebook) drawNotebook(g, r.W, r.H, OBJ(), 4);
    });
    talk.draw(r);
  }
  function hud(r, g) {
    const W = r.W, H = r.H, d = dets[0], k = d.lens.k;
    if (talk.open) return;
    if (k < .5) {
      const objs = OBJ(), w = 176;
      panel(g, 4, 4, w, 14 + objs.length * 11, .72); txt(g, 'CH.4  THE MEET', 9, 7, '#f0c060');
      objs.forEach((o, i) => { const ok = o.n >= o.of; px.rect(g, 9, 19 + i * 11, 6, 6, ok ? '#9ae89a' : '#5a5a62'); txt(g, o.t, 19, 18 + i * 11, ok ? '#8a9a8a' : '#e8e2d0'); });
    }
    drawToasts(g, W, 34);
    if (over || ended || d.ai) return;
    const watched = muscle.some(w => w.spotted === d && w.mind.level > .1);
    txt(g, watched ? 'BEING WATCHED' : d.crouch ? 'CROUCHED' : 'ON FOOT', 8, H - 14 - (k > .5 ? 18 : 0), watched ? '#ff9a40' : '#c8c0b0');
    const items = d.lens.on ? [['snap', 'Take photo'], ['aim', 'Lower']] : [['aim', 'Raise camera'], ...(d.act ? [['interact', d.act.label]] : []), ['crouch', d.crouch ? 'Stand' : 'Crouch'], ['sprint', 'Hurry'], ['notebook', 'Notebook']];
    promptRow(g, items, W / 2, H - 15 - (k > .5 ? 18 : 0));
  }
  return {
    view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], res: 'ps1', pausable: true, camera: { zoom: [.6, 1.4], start: .8 },
    dets: () => dets, subjects: () => subjects(),
    enter, update, draw, talk: () => talk, state: () => ({ clock, phase, meet: CASE.meet, plate: CASE.plate, fenceCrossed, det: [Math.round(dets[0].x), Math.round(dets[0].y)], muscle: muscle.map(m => m.mind.state) }),
    exit() { game.allowJoin(false); game.cam.offset = null; game.cam.frame(null); L.enabled = false; game.weather = null; for (const p of game.players.slice(1)) game.removePlayer(p); }
  };
})();

/* ============================================================================
 * 50-scenes: the title (and its attract mode), chapter cards, BURNED, the ending montage and the case result,
 * chapter select, About / Credits.
 * ========================================================================== */
const TITLE = 'WIRE ME UP';
const CHAPTERS = [
  null,
  { scene: 'corner', name: 'THE CORNER', place: 'Monroe & Fulton, West Baltimore', quote: '"They always come back."', by: 'DET. AUGIE PELL' },
  { scene: 'wire', name: 'THE WIRE', place: 'Western District, the basement', quote: '"That\'s the law, not me."', by: 'NICKY, WIRE ROOM' },
  { scene: 'board', name: 'THE BOARD', place: 'Detail office, over a tire shop', quote: '"Man is a rumor with a lawyer."', by: 'DET. AUGIE PELL' },
  { scene: 'meet', name: 'THE MEET', place: 'Locust Point, after midnight', quote: '"Then go fishing, Detective."', by: 'LT. HASKINS' }
];

/* ---- the title: a corner at dusk, the crew on it, a skyline; the menu over them ---- */
const titleStage = new E.PlatformMap({ rows: ['S'.repeat(70), 'S'.repeat(70)], legend: { S: 1 }, types: { 1: { style: 'stone', side: '#5a5a5e' } }, edges: 'open' });
const titleBg = new E.Backdrop({ sky: ['#0e1020', '#3a2a3a', '#a85a3a'], moon: { x: .9, y: .3, r: 9, color: '#f0e0c0' }, stars: 30, starsY: .4,
  layers: [{ kind: 'city', color: '#1a1820', y: .66, height: .34, parallax: .1 }, { kind: 'city', color: '#2a2228', y: .74, height: .22, parallax: .25 }, { kind: 'fog', color: '#6a4a4a', y: .8, height: .1, parallax: .3, drift: 3 }] });
const TMID = 560;
const titleCrew = [
  { rig: CAST.KEV.rig, x: TMID - 150, f: 0 }, { rig: CAST.TATER.rig, x: TMID - 120, f: Math.PI }, { rig: CAST.LOOKOUT.rig, x: TMID + 90, f: Math.PI },
  { rig: CAST.DEE.rig, x: TMID + 175, f: Math.PI, point: true }
];
let titleMenu, titleSub = null, chapterMenu, attract = { on: false, i: 0, t: 0 };
const ATTRACT_SEQ = [['corner', 46], ['wire', 34], ['board', 14], ['meet', 50]];
function newCase() { CASE.reset(); game.go('chapter', { n: 1 }); }
const scenes = {};
scenes.title = {
  view: 'side', views: ['side'], res: 'ps1',
  enter() {
    music('title'); game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.weather = null; IDLE.t = 0; attract.on = false;
    titleMenu = new E.Menu(game, ['NEW CASE', 'CHAPTERS', 'SETTINGS', 'CONTROLS', 'ABOUT / CREDITS'], { y: 96, onPick: (i) => {
      A.sfx('confirm');
      if (i === 0) newCase(); else if (i === 1) titleSub = 'chapters'; else if (i === 2) game.menu('settings'); else if (i === 3) game.menu('controls'); else game.go('about');
    } });
    chapterMenu = new E.Menu(game, ['1  THE CORNER', '2  THE WIRE', '3  THE BOARD', '4  THE MEET', 'BACK'], { y: 96, onPick: (i) => {
      if (i === 4) { titleSub = null; A.sfx('cancel'); return; }
      A.sfx('confirm'); if (!CASE.photos.length) CASE.reset(); game.go('chapter', { n: i + 1 });
    }, onCancel: () => { titleSub = null; } });
    titleSub = null;
  },
  back() { if (titleSub) { titleSub = null; return true; } return false; },
  update(dt) {
    IDLE.t += dt; if (padActive()) IDLE.t = 0;
    if (IDLE.t > 10) { startAttract(); return; }
    game.focus(TMID, 0, 32 + (game.H / 2 - 40) / -game.view.bz);
    titleCrew.forEach((c, i) => c.rig.update(dt, { x: c.x, y: 0, z: 32, facing: c.f, vx: 0, vy: 0, point: c.point && Math.sin(game.time * .7) > 0, pose: i === 2 ? 'hips' : null }));
    if (touchOnly()) {
      const cl = game.input.clicked(); if (cl) { const b = setBtn(); if (cl[0] >= b.x && cl[0] < b.x + b.w && cl[1] >= b.y && cl[1] < b.y + b.h) game.menu('settings'); }
      return;
    }
    const m = titleSub === 'chapters' ? chapterMenu : titleMenu;
    if (!m.update(dt) && game.input.pressed('start')) { game.input.consumeAll(); m.onPick(m.i, m.items[m.i]); }
    if (titleSub === 'chapters' && game.input.pressed('cancel')) { titleSub = null; A.sfx('cancel'); }
  },
  draw(r) {
    titleBg.draw(r); titleStage.draw(r);
    r.prop('streetlamp', TMID - 80, 0, 32, { size: 1.3, light: false }); r.prop('trashcan', TMID + 70, 4, 32, { size: 1.3 }); r.prop('hydrant', TMID + 10, 6, 32, { size: 1.3 });
    for (const c of titleCrew) r.actor(c.x, 0, 32, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, TITLE, W / 2, 16, { align: 'center', scale: 4, colors: ['#f8f0d8', '#e8c870', '#c87a3a'], outline: '#0a0806', depth: 3, depthColor: '#3a1a10' });
      txt(g, 'a surveillance story of West Baltimore', W / 2, 54, '#d8c8b0', { align: 'center' });
      if (touchOnly()) {
        panel(g, W / 2 - 120, 82, 240, 62, .9);
        txt(g, 'Controller or keyboard required', W / 2, 92, '#ffd060', { align: 'center' });
        txt(g, 'Connect a gamepad or a keyboard to play.', W / 2, 106, '#d8d2c0', { align: 'center' });
        const b = setBtn(); px.rect(g, b.x, b.y, b.w, b.h, '#3a3a44'); px.rect(g, b.x + 1, b.y + 1, b.w - 2, b.h - 2, '#5a5a66'); txt(g, 'SETTINGS', b.x + b.w / 2, b.y + 4, '#ffffff', { align: 'center' });
        txt(g, 'The demo plays by itself if you wait.', W / 2, H - 14, '#a8a090', { align: 'center' });
        return;
      }
      if (titleSub === 'chapters') txt(g, 'CASE FILES', W / 2, 84, '#f0c060', { align: 'center' });
    });
    if (!touchOnly()) (titleSub === 'chapters' ? chapterMenu : titleMenu).draw(r);
    r.overlay(g => {
      if (touchOnly()) return;
      const W = r.W, H = r.H;
      promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'up' : 'Pad:ArrowUp', 'Choose'], ['confirm', 'Select'], ...(titleSub ? [[backAct(), 'Back']] : [])], W / 2, H - 16);
    });
  }
};
const setBtn = () => ({ x: Math.round(game.W / 2 - 40), y: 120, w: 80, h: 16 });

/* ---- the attract mode: the four chapters played by a detective who cannot be seen; any input ends it ---- */
function startAttract() { attract = { on: true, i: 0, t: 0 }; IDLE.any = false; CASE.reset(); game.go(ATTRACT_SEQ[0][0], { attract: true }); }
/** a demo chapter that has shown everything hands over to the next one */
function attractNext() { if (attract.on) attract.t = 1e9; }
function attractTick(dt) {
  if (!attract.on) return false;
  attract.t += dt;
  if (IDLE.any || padActive() && attract.t > .5) { attract.on = false; IDLE.any = false; IDLE.t = 0; game.input.consumeAll(); game.go('title'); return true; }
  if (attract.t > ATTRACT_SEQ[attract.i][1]) { attract.i = (attract.i + 1) % ATTRACT_SEQ.length; attract.t = 0; if (attract.i === 0) CASE.reset(); game.go(ATTRACT_SEQ[attract.i][0], { attract: true }); return true; }
  return false;
}
function attractBanner(r) {
  if (!attract.on) return;
  r.overlay(g => {
    const W = r.W, H = r.H, y = H - 30;
    px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, W, 22, '#000'));
    const blink = Math.floor(game.real * 1.5) % 2 === 0;
    E.font.text(g, 'DEMO  •  ' + TITLE + '  •  ' + CHAPTERS[ATTRACT_SEQ.findIndex(a => a[0] === ATTRACT_SEQ[attract.i][0]) + 1].name, 8, y + 2, '#f0c060', { shadow: '#000', outline: false });
    if (blink) E.font.text(g, 'PRESS ANY BUTTON', W - 8, y + 2, '#ffffff', { align: 'right', shadow: '#000', outline: false });
  });
}

/* ---- chapter cards: the epigraph, the way every episode starts ---- */
let card = null;
scenes.chapter = {
  view: 'side', res: 'ps1',
  enter(d) { card = { n: d.n, t: 0 }; music(null); A.sfx('tape'); L.enabled = false; game.weather = null; },
  update(dt) {
    card.t += dt;
    if (card.t > 1 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.pressed('interact') || game.input.clicked()) || card.t > 6.5) { const c = CHAPTERS[card.n]; game.go(c.scene, { keepCase: true }); }
  },
  draw(r) {
    const c = CHAPTERS[card.n];
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#050505');
      const a = Math.min(1, card.t * 1.5);
      if (a > .2) {
        txt(g, c.quote, W / 2, H / 2 - 30, '#e8e2d0', { align: 'center', scale: 1 });
        txt(g, '- ' + c.by, W / 2, H / 2 - 16, '#a8a090', { align: 'center' });
      }
      if (card.t > 1.4) {
        E.font.title(g, 'CHAPTER ' + card.n, W / 2, H / 2 + 6, { align: 'center', scale: 2, colors: ['#f8f0d8', '#c8a060'], depth: 1 });
        txt(g, c.name + '  •  ' + c.place, W / 2, H / 2 + 26, '#f0c060', { align: 'center' });
      }
      if (card.t > 1) promptRow(g, [['confirm', 'Continue']], W / 2, H - 18);
    });
  }
};

/* ---- burned: made, the case gone cold ---- */
let burned = null;
const burnedMenu = new E.Menu(game, ['TRY AGAIN', 'TITLE'], { y: 150, onPick: (i) => { A.sfx('confirm'); if (i === 0) game.go(burned.from, { keepCase: true, skipBrief: true }); else game.go('title'); } });
scenes.burned = {
  view: 'side', res: 'ps1',
  enter(d) { burned = d; burnedMenu.i = 0; music('burned'); L.enabled = false; game.weather = null; },
  back() { game.go('title'); return true; },
  update(dt) { if (!burnedMenu.update(dt) && game.input.pressed('start')) burnedMenu.onPick(burnedMenu.i); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#0a0606');
      for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, '#140a0a');
      E.font.title(g, 'BURNED', W / 2, 40, { align: 'center', scale: 4, colors: ['#ffe0d0', '#ff7a5a', '#a8201a'], depthColor: '#2a0806' });
      txt(g, burned.why, W / 2 - 150, 90, '#e8d8d0', { wrap: 300 });
      burnedMenu.y = Math.round(H / 2 + 30);
    });
    burnedMenu.draw(r);
  }
};

/* ---- the ending: a montage, the way a season ends, then the case's worth ---- */
let ending = null;
const MONTAGE = () => [
  { rig: CAST.TATER.rig, text: 'Friday. The red-door vacant. Eleven vials, a scale, and a sixteen-year-old in an orange cap. The Major had his table by noon.' },
  { rig: CAST.SMOKE.rig, text: 'Smoke was stopped on Route 40 with nothing in the car but a car seat. He was home before dinner.' },
  CASE.meet ? { rig: CAST.DANTE.rig, text: 'A photograph of Dante Pryor went up at the top of the board. A judge looked at it for a long time. Then he signed.' }
    : { rig: null, text: 'The top of the board stayed a question mark. Pell drew a better one, in red.' },
  { rig: CAST.KEV.rig, text: 'Kev made it to his son\'s school meeting. He was forty minutes late. He went.' },
  { rig: CAST.MAJOR.rig, text: 'At COMSTAT the Deputy Ops said "nice table." Major Voss said "thank you, sir."' },
  { rig: CAST.SWEETS.rig, text: 'Sweets sold three t-shirts for ten dollars. Mostly clean.' },
  { rig: CAST.LOOKOUT.rig, text: 'By Sunday, Monroe and Fulton was open again. New kid on the stoop. Same yell.' }
];
scenes.ending = {
  view: 'side', res: 'ps1',
  enter() { ending = { i: 0, t: 0, panels: MONTAGE(), res: false }; music('end'); L.enabled = false; game.weather = null; },
  update(dt) {
    ending.t += dt;
    const skip = game.input.pressed('confirm') || game.input.pressed('interact') || game.input.clicked();
    if (!ending.res) {
      for (const p of ending.panels) if (p.rig) p.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
      if (ending.t > 6 || (skip && ending.t > .5)) { ending.i++; ending.t = 0; if (ending.i >= ending.panels.length) { ending.res = true; A.sfx('right'); } }
    } else if (skip && ending.t > 1) game.go('about', { fromEnd: true });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#060606');
      if (!ending.res) {
        const p = ending.panels[ending.i], a = Math.min(1, ending.t * 2);
        if (p.rig) p.rig.drawPortrait(g, Math.round(W / 2 - 50), 24, 100, { zoom: 3.4, turn: .45, bg: '#1a1a1c', frame: true, tint: '#a0a0a0' });
        else { px.rect(g, W / 2 - 50, 24, 100, 100, '#1a1a1c'); txt(g, '?', W / 2, 54, '#c82a2a', { align: 'center', scale: 4 }); }
        if (a > .3) txt(g, p.text, W / 2 - 150, 136, '#e8e2d0', { wrap: 300 });
        promptRow(g, [['confirm', 'Next']], W / 2, H - 16);
      } else {
        const s = Math.round(CASE.strength()), rank = s >= 1500 ? 'REAL POLICE' : s >= 900 ? 'GOOD POLICE' : s >= 450 ? 'A STAT FOR THE MAJOR' : 'BACK TO THE MARINE UNIT';
        E.font.title(g, 'THE CASE', W / 2, 14, { align: 'center', scale: 3, colors: ['#f8f0d8', '#c8a060'] });
        const rows = [['Photographs', CASE.photos.length], ['Pages decoded', CASE.wire.pages + ' / 3'], ['Pertinent lines flagged', CASE.wire.flagged + ' / 4'], ['Minimization violations', CASE.wire.violations],
          ['Board pinned', CASE.board + ' / 6'], ['Pryor with the connect', CASE.meet ? 'YES' : 'no'], ['Escalade tag', CASE.plate ? 'yes' : 'no'], ['Times made on the corner', CASE.heat]];
        rows.forEach(([k, v], i) => { txt(g, k, W / 2 - 110, 50 + i * 12, '#c8c0a8'); txt(g, String(v), W / 2 + 110, 50 + i * 12, '#f0ead8', { align: 'right' }); });
        txt(g, 'CASE STRENGTH  ' + s, W / 2, 152, '#ffd060', { align: 'center', scale: 2 });
        txt(g, rank, W / 2, 172, '#9ae89a', { align: 'center' });
        txt(g, '"The game is the game."', W / 2, 188, '#a8a090', { align: 'center' });
        if (ending.t > 1) promptRow(g, [['confirm', 'Credits']], W / 2, H - 16);
      }
    });
  }
};

/* ---- About / Credits: the source information and the feedback, as the task asks, in pages ---- */
let about = null;
scenes.about = {
  view: 'side', res: 'ps1',
  enter(d) { d = d || {}; about = { page: 0, scroll: 0, from: d.fromEnd }; L.enabled = false; game.weather = null; if (d.fromEnd) music('title'); },
  back() { game.go('title'); return true; },
  update(dt) {
    const inp = game.input, n = ABOUT.length;
    if (inp.repeat('right')) { about.page = (about.page + 1) % n; about.scroll = 0; A.sfx('blip'); }
    if (inp.repeat('left')) { about.page = (about.page + n - 1) % n; about.scroll = 0; A.sfx('blip'); }
    if (inp.down('down')) about.scroll += dt * 90; if (inp.down('up')) about.scroll -= dt * 90;
    const z = inp.zoom && inp.zoom(); if (z && z !== 1) about.scroll += (z > 1 ? -20 : 20);
    about.scroll = Math.max(0, about.scroll);
    const cl = inp.clicked(); if (cl) { if (cl[0] < game.W * .25) { about.page = (about.page + n - 1) % n; about.scroll = 0; } else if (cl[0] > game.W * .75) { about.page = (about.page + 1) % n; about.scroll = 0; } }
    if (inp.pressed('cancel') || inp.pressed('start')) game.go('title');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, sec = ABOUT[about.page];
      px.rect(g, 0, 0, W, H, '#0c0d10');
      E.font.title(g, sec.title, W / 2, 8, { align: 'center', scale: 2, colors: ['#f8f0d8', '#c8a060'] });
      txt(g, (about.page + 1) + ' / ' + ABOUT.length, W - 8, 10, '#8a8478', { align: 'right' });
      const x = Math.max(10, W / 2 - 200), w = Math.min(W - 20, 400);
      let y = 34 - about.scroll;
      const maxY = H - 26;
      for (const [k, v] of sec.rows) {
        const lines = E.font.wrap(v, w - (k ? 120 : 0));
        if (k && y > 26 && y < maxY) txt(g, k, x, y, '#f0c060');
        lines.forEach((ln, i) => { const yy = y + i * 10; if (yy > 26 && yy < maxY) txt(g, ln, x + (k ? 120 : 0), yy, '#e8e2d0'); });
        y += lines.length * 10 + 5;
      }
      const total = y + about.scroll - 34; if (about.scroll > total - (maxY - 40)) about.scroll = Math.max(0, total - (maxY - 40));
      px.rect(g, 0, H - 22, W, 22, '#0c0d10');
      promptRow(g, [[game.input.lastDevice === 'gamepad' ? 'Pad14' : 'Pad:ArrowLeft', 'Page'], [game.input.lastDevice === 'gamepad' ? 'Pad13' : 'Pad:ArrowDown', 'Scroll'], [backAct(), 'Back']], W / 2, H - 16);
    });
  }
};

/* ============================================================================
 * 60-about: the About / Credits pages (the same text as the run's chat reply and exit-interview.json)
 * ========================================================================== */
const ABOUT = [
  { title: 'WIRE ME UP', rows: [
    ['', 'An original surveillance-stealth spiritual successor to The Wire (HBO, 2002-2008). Every character, place and line is new; the show\'s spirit is the source: cops who build cases with cameras and wiretaps, the corner as an economy, the law as a set of rules that cut both ways, and institutions that eat the work.'],
    ['Chapters', '1 The Corner: photograph the crew from the car or on foot without being made. 2 The Wire: decode the pages, flag and minimize calls. 3 The Board: pin the organization. 4 The Meet: the container yard at night, in the rain.'],
    ['Controls', 'Move WASD / left stick. Raise camera: right mouse, Q / L2. Photo: left click, Space / R2. Crouch C / Circle. Interact E / Cross. Hurry Shift / L3. Notebook Tab / Triangle. View V / R3. Pause Esc / Options.'],
    ['Two players', 'In the street chapters a second player joins as Det. Brandt: Start on a second pad, or 2 on the keyboard.'],
    ['AI Hub', 'In an AI Hub session the corner is a ghost round for up to four: the most evidence wins, and the other detectives show as ghosts.']
  ] },
  { title: 'SOURCE INFORMATION', rows: [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'The Wire (HBO, 2002-2008), created by David Simon. Original story and characters, inspired by its tone.'],
    ['Genre', 'Stealth / investigation (surveillance stealth, a code-breaking and wiretap puzzle, a case-board puzzle)'],
    ['Perspective', 'Three-quarter top-down (the engine\'s threequarter view); V or R3 switches to top-down and isometric in the street chapters. Side view for the title.'],
    ['Tech', 'my-3D2dge v0.85.1 (full engine, one file, no dependencies; HTML5 canvas, Web Audio), AI Hub session client 1.3.0 (protocol 1). Plain JavaScript, bundled by a small Python script into one HTML file.'],
    ['Art direction', 'The engine\'s native look: PS1-resolution pixel art (320x240, expanded to fill the screen), HD Humanoid rigs dressed for West Baltimore, textured TileMap rowhouses, canvas lighting from street lamps and fire drums, rain at night.'],
    ['Animation', 'The engine\'s procedural skeletal rigs (E.Humanoid) driven from velocity and poses (crouch, kneel, point, hips), live dialog portraits, tweens and E.Mover movement.'],
    ['Audio', 'Code-written chip music (six original songs, layered stealth music that brings in drums when you are watched), code-written sound effects (shutter, pager, phone, tape), and Animalese-style gibberish voices pitched per character and per vowel.'],
    ['Online', 'AI Hub Session Protocol v1, ghost mode: each player runs the corner, sends their detective\'s position through the hub, sees the others as ghosts, reports progress and a score. No other network use.'],
    ['Testing', 'Headless Chromium (Playwright) screenshots and scripted key presses of every scene, state checks through a debug handle, the AI Hub harness (ghost, 2 players, auto), a small viewport check. Real iOS Safari was not available.'],
    ['Research', 'None online. Built from knowledge of the show (wiretap minimization, the "jump the 5" pager code, corner roles, COMSTAT pressure) and the engine\'s own docs.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ] },
  { title: 'TESTING FEEDBACK', rows: [
    ['Issues caught', '14: the camera not following during the first briefing, center lines drawn as yellow squares, unreadable heat badges, a missing middle-dot glyph, the case board overflowing a 240-pixel screen, the minimize prompt naming Escape (which pauses), a crash pinning a photo, fiends stuck behind buildings, the player car missing its body at the pier, the heat panel under the touch menu button, the wall clock over the room title, a syntax error from a bad text edit, and a second crash when the pin button was pressed on a full board, and the attract demo skipping the last chapter (both found by the final end-to-end runs).'],
    ['Critical', '3 were game breaking: the crash when pinning a photo (chapter 3 could not be finished), fiends stuck on buildings (the corner could stall), and the syntax error (a blank page).'],
    ['Most helpful', 'A full scripted playthrough of all four chapters on the bundled file, pressing through dialogs like a player and reading the game state at each step: it found the board crashes and the stuck fiends.'],
    ['Least helpful', 'Waiting in real time for timed events in the browser; reading the state handle told me the same thing faster.']
  ] },
  { title: 'ENGINE FEEDBACK', rows: [
    ['Liked most', 'Sight, suspicion and sight cones (E.sees, E.Suspicion, r.sightCone) work together out of the box, and dialogs with live portraits made the cast feel real for free.'],
    ['Stuck / guessed', 'I guessed that a Mover takes world directions from an intent object (it does) and that the font had PlayStation symbols (it does not: I drew the glyphs myself).'],
    ['Built myself', 'The camera lens and photo-evidence system: a reticle on the ground, framing and line-of-sight checks for each moment worth a picture, and the polaroids made from portraits.'],
    ['Hardest part', 'Finding which options exist on wall types and props (windows, doors, halos) without reading the source: the index is long and options are spread across three documents.'],
    ['Remove / overhaul', 'The many overlapping documents (card, index, guide, kit headers): one searchable reference with examples per option would be enough.'],
    ['Change one thing', 'Button glyphs for PlayStation and Xbox in the pixel font, so label() can be printed directly in prompts.']
  ] },
  { title: 'PROMPT FEEDBACK', rows: [
    ['Liked most', 'The freedom to choose the genre: The Wire is not an action show, and a surveillance game fits it far better than a shooter would.'],
    ['Confusing', 'The single-file name pattern [GameTitle-SOURCE-...] leaves the word separators open, and "multiplayer for the game on its own" can mean local or online play.'],
    ['Hardest', 'Fitting every requirement (attract mode, hub, controller-first UI, glyph families, touch notice, four chapters) into one session while keeping the tone right.'],
    ['One test', 'A real DualSense on a TV at ten feet, to judge prompt size and readability where it matters.']
  ] },
  { title: 'CREDITS', rows: [
    ['Design, code, writing', 'claude-opus-5-5 (Anthropic), in Claude Code'],
    ['Engine', 'my-3D2dge by Michael Crosato'],
    ['Online', 'AI Hub Session Protocol by Michael Crosato'],
    ['Inspired by', 'The Wire, created by David Simon (HBO). This is a fan-made spiritual successor with original characters; it is not affiliated with HBO.'],
    ['Thanks', 'To everybody who ever sat in a car for eleven hours waiting for one picture.']
  ] }
];

/* ============================================================================
 * 99-start: the scenes, the attract mode's wrapper, the AI Hub session, and the start
 * ========================================================================== */
Object.assign(scenes, { corner: CORNER, wire: WIRE, board: BOARD, meet: MEET });
// every play scene runs the attract mode's clock and banner when it is the demo playing
for (const id of ['corner', 'wire', 'board', 'meet']) {
  const sc = scenes[id], up = sc.update, dr = sc.draw, en = sc.enter;
  sc.enter = function (d) { if (!(d && d.attract)) attract.on = false; return en.call(this, d); };
  sc.update = function (dt) { if (attractTick(dt)) return; return up.call(this, dt); };
  sc.draw = function (r) { dr.call(this, r); attractBanner(r); };
  if (id !== 'corner' || !HUB) sc.pausable = true;
}
/* the AI Hub round: a ghost race for evidence on the corner, no title, no menus */
scenes.hubwait = {
  view: 'side', res: 'ps1',
  update() {}, draw(r) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#06070a'); txt(g, 'WIRE ME UP  •  waiting for the round', r.W / 2, r.H / 2, '#f0c060', { align: 'center' }); }); }
};
const _cornerDraw = CORNER.draw;
CORNER.draw = function (r) {
  _cornerDraw.call(this, r);
  if (HUB && window.AIHub && AIHub.time() < 0) r.overlay(g => { const s = AIHub.time() === -Infinity ? 'GET READY' : 'STARTS IN ' + Math.ceil(-AIHub.time() / 1000); px.blend(g, .6, 'normal', () => px.rect(g, 0, r.H / 2 - 20, r.W, 40, '#000')); txt(g, s, r.W / 2, r.H / 2 - 7, '#ffd060', { align: 'center', scale: 2 }); });
};
async function hubStart() {
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] });
  if (!info) { game.go('title'); return; }
  AIHub.on('message', (data, from) => CORNER.onGhost(data, from));
  AIHub.on('leave', (e) => CORNER.dropGhost(e && e.id));
  AIHub.on('time-up', () => { CORNER.hubScore(true); });
  AIHub.on('end', () => { CASE.hubEnded = true; music(null); A.setVolume(0); game.input.clear(); game.stop(); });
  HUBSTATE.on = true;
  game.go('corner', null, { fade: 0 });
  AIHub.ready();
}
game.start({ scenes, scene: HUB ? 'hubwait' : (scenes[(location.hash || '').slice(1)] ? location.hash.slice(1) : 'title'),
  boot: { title: 'WIRE ME UP', steps: [['Wiring the block', () => {}]] } });
if (HUB) hubStart();
window.__wire = { game, CASE, scenes, attract: () => attract };

})();
