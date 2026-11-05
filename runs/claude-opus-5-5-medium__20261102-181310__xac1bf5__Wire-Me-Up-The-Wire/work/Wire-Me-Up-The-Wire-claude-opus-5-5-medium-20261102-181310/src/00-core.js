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
