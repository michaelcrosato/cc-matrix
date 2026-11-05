/* =============================================================================
 * 01-input: the positional action preset, device tracking, the glyph icon renderer,
 * the prompt builder, mouse helpers (wheel), idle detection and touch-only mode.
 * Actions are named by the button's position: the same button swings, pitches a
 * heater, throws home or punches, by context.
 * ========================================================================== */
BZ.KEYS = {
  // the 8 face and shoulder buttons first: half-keyboard players get these on their 8 keys, in order
  south: ['Space', 'KeyK', 'Mouse0', 'Pad0'],
  east: ['KeyL', 'Pad1'],
  west: ['KeyJ', 'Mouse2', 'Pad2'],
  north: ['KeyI', 'Pad3'],
  l1: ['KeyQ', 'Tab', 'Pad4'],
  r1: ['KeyE', 'Pad5'],
  l2: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  r2: ['KeyC', 'ControlLeft', 'Pad7'],
  view: ['KeyV', 'Pad11'],
  create: ['Pad8'],
  num1: ['Digit1', 'Numpad1'], num2: ['Digit2', 'Numpad2'], num3: ['Digit3', 'Numpad3'], num4: ['Digit4', 'Numpad4'], num5: ['Digit5', 'Numpad5'],
  pinDown: ['BracketLeft'], pinUp: ['BracketRight'], pinNext: ['Backslash'], more: ['KeyM'],
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyK', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
BZ.ACTION_NAMES = {   // the Controls screen's names (positional: what each does depends on the moment)
  south: 'Swing / Heater / Throw home', east: 'Breaking ball / Throw to 1B', west: 'Power swing / Off-speed / Throw to 3B',
  north: 'Bunt / Signature pitch / Throw to 2B', l1: 'Steal / Pickoff / Switch fielder', r1: 'BATZOOKA / Super / Jump',
  l2: 'Turbo', r2: 'Dive', view: 'Field camera', create: false, num1: 'Pick 1 (pitch / 1B)', num2: 'Pick 2 (pitch / 2B)',
  num3: 'Pick 3 (pitch / 3B)', num4: 'Pick 4 (pitch / home)', num5: 'Pick 5 (super pitch)', pinDown: false, pinUp: false, pinNext: false, more: false
};
BZ.BASE_BTN = { 1: 'east', 2: 'north', 3: 'west', 4: 'south' };   // a face button picks a base by its position
BZ.BTN_BASE = { east: 1, north: 2, west: 3, south: 4 };
BZ.NUM_BASE = { num1: 1, num2: 2, num3: 3, num4: 4 };

/* ---- device and idle tracking ---- */
BZ.idle = 0;                 // seconds since the last input of any kind (attract mode)
BZ.inputSeen = false;
BZ.wheel = 0;                // mouse wheel notches since the last step (+1 down, -1 up)
BZ._wheelAcc = 0;
BZ.touchOnly = false;
BZ.anyInput = (game) => {
  for (const I of game.players) {
    if (I.anyPressed()) return true;
    const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) return true;
  }
  if (BZ._mouseMoved) return true;
  if (BZ.wheel) return true;
  if (BZ._rawKey) return true;
  return false;
};
BZ.inputTick = (game, dt) => {
  BZ.wheel = BZ._wheelAcc; BZ._wheelAcc = 0;
  const I = game.input, m = I.pointer && I.pointer();
  BZ._mouseMoved = false;
  if (m) { if (BZ._lastPtr && Math.hypot(m[0] - BZ._lastPtr[0], m[1] - BZ._lastPtr[1]) > 4) BZ._mouseMoved = true; BZ._lastPtr = m; }
  if (BZ.anyInput(game)) { BZ.idle = 0; BZ.inputSeen = true; } else BZ.idle += dt;
  BZ._rawKey = false;
};
BZ.installDom = (game) => {
  if (typeof window === 'undefined' || !window.document || game.headless) return;
  const cv = game.screen.canvas;
  if (cv) cv.addEventListener('wheel', e => { if (BZ.wheelOwned) { e.preventDefault(); BZ._wheelAcc += e.deltaY > 0 ? 1 : -1; } BZ._rawKey = true; }, { passive: false });
  window.addEventListener('keydown', () => { BZ._rawKey = true; if (BZ.touchOnly) { BZ.touchOnly = false; game.input.touchEnabled = false; } }, true);
  window.addEventListener('pointerdown', () => { BZ._rawKey = true; }, true);
  window.addEventListener('gamepadconnected', () => { BZ._rawKey = true; if (BZ.touchOnly) BZ.touchOnly = false; });
  try {
    const mm = q => window.matchMedia && window.matchMedia(q).matches;
    BZ.touchOnly = !!(mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && navigator.maxTouchPoints > 0);
  } catch (e) { BZ.touchOnly = false; }
  if (/#touch\b/.test(location.hash)) BZ.touchOnly = true;
  game.input.touchEnabled = false;   // no touch controls: a controller or keyboard is required
};

/** the device a player last used: 'gamepad' | 'keyboard' | 'mouse' | 'touch' */
BZ.devc = (I) => (I || BZ.game.input).lastDevice || 'keyboard';
/** the glyph family for pads: 'playstation' (default) or 'xbox' */
BZ.family = () => (BZ.game.settings && BZ.game.settings.glyphs === 'xbox') ? 'xbox' : 'playstation';

/* ---- the glyph icon renderer: draws the icon for an action on the player's device ---- */
const PS_COL = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#f08ad8', '△': '#4fe0b0' };
const XB_COL = { A: '#6cc04a', B: '#e8584a', X: '#4a8ef0', Y: '#f4c430' };
const PS_FROM_POS = ['✕', '○', '□', '△'];
const XB_FROM_POS = ['A', 'B', 'X', 'Y'];
const PAD_NAMES = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['Create', 'View'], 9: ['Options', 'Menu'], 10: ['L3', 'LS'], 11: ['R3', 'RS'] };
/** the code to show for an action on a device (after rebinding) */
BZ.codeFor = (I, a, device) => {
  const m = I.map[a]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  const isPad = c => /^Pad\d+$/.test(c);
  const pads = real.filter(isPad), keys = real.filter(c => !isPad(c));
  if (device === 'gamepad') return pads[0] || keys[0] || null;
  if (device === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
};
/** a glyph descriptor for an action: { kind: 'face'|'pill'|'key'|'mouse'|'dpad'|'stick', text, color, side } */
BZ.glyphOf = (I, a, device) => {
  device = device || BZ.devc(I);
  if (a === 'move') return device === 'gamepad' ? { kind: 'stick', text: 'L' } : device === 'mouse' ? { kind: 'mouse', side: 'move' } : { kind: 'key', text: 'WASD' };
  if (a === 'wheel') return { kind: 'mouse', side: 'wheel' };
  const code = BZ.codeFor(I, a, device === 'touch' ? 'keyboard' : device); if (!code) return { kind: 'key', text: '?' };
  const pm = /^Pad(\d+)$/.exec(code);
  if (pm) {
    const n = +pm[1], fam = BZ.family();
    if (n <= 3) return fam === 'xbox' ? { kind: 'face', text: XB_FROM_POS[n], color: XB_COL[XB_FROM_POS[n]], fam } : { kind: 'face', text: PS_FROM_POS[n], color: PS_COL[PS_FROM_POS[n]], fam };
    if (n >= 12 && n <= 15) return { kind: 'dpad', dir: n - 12 };
    const nm = PAD_NAMES[n]; return { kind: n === 10 || n === 11 ? 'stick' : 'pill', text: nm ? nm[fam === 'xbox' ? 1 : 0] : 'P' + n };
  }
  if (code === 'Mouse0') return { kind: 'mouse', side: 'L' };
  if (code === 'Mouse2') return { kind: 'mouse', side: 'R' };
  if (code === 'Mouse1') return { kind: 'mouse', side: 'M' };
  return { kind: 'key', text: I.codeLabel(code) };
};
/** draw a glyph icon at (x, y) (top-left), height s; returns its width */
BZ.drawGlyph = (g, gl, x, y, s = 11, dim = false) => {
  x = Math.round(x); y = Math.round(y);
  const al = dim ? .45 : 1;
  const wrap = f => { if (dim) px.blend(g, al, 'normal', f); else f(); };
  let w = s;
  if (gl.kind === 'face') {
    const r = s / 2;
    wrap(() => {
      px.disc(g, x + r, y + r, r, '#0c0e16'); px.disc(g, x + r, y + r, r - 1, '#1b1d26'); px.disc(g, x + r - .5, y + r - 1.5, r - 2.5, '#262a38');
      if (gl.fam === 'xbox') E.font.text(g, gl.text, x + r + .5, y + r - 3, gl.color, { align: 'center' });
      else {
        const c = gl.color, cx = x + r, cy = y + r, k = Math.max(2, Math.round(r * .5));
        if (gl.text === '✕') { px.line(g, cx - k, cy - k, cx + k, cy + k, c, 2); px.line(g, cx - k, cy + k, cx + k, cy - k, c, 2); }
        else if (gl.text === '○') { px.disc(g, cx, cy, k + .5, c); px.disc(g, cx, cy, Math.max(.5, k - 1.2), '#1b1d26'); }
        else if (gl.text === '□') { px.rect(g, cx - k, cy - k, k * 2 + 1, k * 2 + 1, c); px.rect(g, cx - k + 1.5, cy - k + 1.5, k * 2 - 2, k * 2 - 2, '#1b1d26'); }
        else { px.poly(g, [[cx, cy - k - 1], [cx + k + 1, cy + k], [cx - k - 1, cy + k]], c); px.poly(g, [[cx, cy - k + 2], [cx + k - 1.5, cy + k - 1.2], [cx - k + 1.5, cy + k - 1.2]], '#1b1d26'); }
      }
    });
  } else if (gl.kind === 'pill' || gl.kind === 'stick') {
    const tw = E.font.width(gl.text); w = Math.max(s, tw + 8);
    wrap(() => {
      E.ui.box(g, x, y, w, s, { bg: ['#3a3f52', '#1b1d26'], border: '#9aa3c0' });
      if (gl.kind === 'stick') px.disc(g, x + w / 2, y + s / 2, s / 2 - 1.5, '#2a2e3c');
      E.font.text(g, gl.text, x + w / 2 + .5, y + s / 2 - 3, '#ffffff', { align: 'center' });
    });
  } else if (gl.kind === 'dpad') {
    const c = x + s / 2, m = y + s / 2, a = s / 2, b = Math.max(2, s / 6);
    wrap(() => {
      px.rect(g, c - b, y, b * 2, s, '#1b1d26'); px.rect(g, x, m - b, s, b * 2, '#1b1d26');
      px.rect(g, c - b + 1, y + 1, b * 2 - 2, s - 2, '#4a5068'); px.rect(g, x + 1, m - b + 1, s - 2, b * 2 - 2, '#4a5068');
      const d = gl.dir; const lit = '#ffd84a';
      if (d === 0) px.rect(g, c - b + 1, y + 1, b * 2 - 2, a - b, lit); else if (d === 1) px.rect(g, c - b + 1, m + b - 1, b * 2 - 2, a - b, lit);
      else if (d === 2) px.rect(g, x + 1, m - b + 1, a - b, b * 2 - 2, lit); else px.rect(g, c + b - 1, m - b + 1, a - b, b * 2 - 2, lit);
    });
  } else if (gl.kind === 'mouse') {
    const mw = Math.round(s * .78); w = mw;
    wrap(() => {
      px.rect(g, x + 1, y, mw - 2, s, '#e8ecf4'); px.rect(g, x, y + 2, mw, s - 4, '#e8ecf4');
      px.rect(g, x + 1, y + 1, mw - 2, s - 2, '#c9cfdc');
      const half = Math.floor(mw / 2), top = Math.round(s * .45);
      if (gl.side === 'L') px.rect(g, x + 1, y + 1, half - 1, top, '#ff7a3a');
      if (gl.side === 'R') px.rect(g, x + half + 1, y + 1, mw - half - 2, top, '#ff7a3a');
      px.line(g, x + half, y + 1, x + half, y + top, '#5a6070');
      px.rect(g, x + half - 1, y + 2, 2, 3, gl.side === 'wheel' || gl.side === 'M' ? '#ff7a3a' : '#5a6070');
      if (gl.side === 'move') { px.rect(g, x + 1, y + top, mw - 2, 1, '#5a6070'); }
    });
  } else {
    const tw = E.font.width(gl.text); w = Math.max(s, tw + 7);
    wrap(() => {
      px.rect(g, x, y + 1, w, s - 1, '#6a7088'); px.rect(g, x, y, w, s - 2, '#f2f4f8'); px.rect(g, x + 1, y + 1, w - 2, s - 4, '#dfe3ec');
      E.font.text(g, gl.text, x + w / 2 + .5, y + Math.round((s - 2) / 2) - 3, '#1b1d26', { align: 'center' });
    });
  }
  return w;
};
/** draw an action's glyph for a player at (x, y); returns the width */
BZ.glyph = (g, I, a, x, y, s = 11, dim = false, device) => BZ.drawGlyph(g, BZ.glyphOf(I || BZ.game.input, a, device), x, y, s, dim);
/** a row of prompts [[action, verb, enabled, why], ...] drawn left to right (align 'left' | 'center' | 'right'); returns width */
BZ.drawPrompts = (g, I, list, x, y, o = {}) => {
  const s = o.size || 11, gap = o.gap || 10, items = list.filter(Boolean);
  const widths = items.map(([a, verb, en, why]) => {
    const gw = Array.isArray(a) ? a.reduce((t, b) => t + BZ.glyphW(I, b, s) + 2, -2) : BZ.glyphW(I, a, s);
    return gw + 4 + E.font.width(en === false && why ? verb + ' (' + why + ')' : verb, { scale: 1 });
  });
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  if (o.panel !== false && items.length) E.ui.box(g, Math.round(cx - 6), Math.round(y - 4), Math.round(total + 12), s + 8, { bg: ['#141826', '#0a0c14'], border: '#3a4060', alpha: .82 });
  items.forEach(([a, verb, en, why], i) => {
    const dim = en === false;
    let gx = cx;
    for (const b of (Array.isArray(a) ? a : [a])) gx += BZ.glyph(g, I, b, gx, y, s, dim) + 2;
    E.font.text(g, dim && why ? verb + ' (' + why + ')' : verb, gx + 2, y + Math.round(s / 2) - 4, dim ? '#7a8098' : '#ffffff', { shadow: '#000' });
    cx += widths[i] + gap;
  });
  return total;
};
BZ.glyphW = (I, a, s = 11) => {
  const gl = BZ.glyphOf(I || BZ.game.input, a);
  if (gl.kind === 'pill' || gl.kind === 'stick') return Math.max(s, E.font.width(gl.text) + 8);
  if (gl.kind === 'key') return Math.max(s, E.font.width(gl.text) + 7);
  if (gl.kind === 'mouse') return Math.round(s * .78);
  return s;
};
/** a menu legend at the bottom of a screen: [[action, verb], ...] */
BZ.legend = (g, r, list, I) => BZ.drawPrompts(g, I || BZ.game.input, list.map(([a, v]) => [a, v, true]), r.W / 2, r.H - 22, { align: 'center' });

/* ---- reading a player's buttons, by context ---- */
/** which base a press picks right now: a face button by position, or a number key; 0 = none */
BZ.basePressed = (I) => {
  for (const b of ['east', 'north', 'west', 'south']) if (I.pressed(b)) return BZ.BTN_BASE[b];
  for (const n of ['num1', 'num2', 'num3', 'num4']) if (I.pressed(n)) return BZ.NUM_BASE[n];
  return 0;
};
BZ.baseHeld = (I) => {
  for (const b of ['east', 'north', 'west', 'south']) if (I.down(b)) return BZ.BTN_BASE[b];
  for (const n of ['num1', 'num2', 'num3', 'num4']) if (I.down(n)) return BZ.NUM_BASE[n];
  return 0;
};
BZ.baseReleased = (I, b) => {
  const btn = BZ.BASE_BTN[b], num = 'num' + b;
  return (btn && I.released(btn)) || I.released(num);
};
/** is the pointer (mouse) over a rectangle (screen pixels)? */
BZ.hover = (I, x, y, w, h) => { const p = I.pointer && I.pointer(); return !!(p && I.lastDevice === 'mouse' && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h); };
BZ.clickIn = (I, x, y, w, h) => { const c = I.clicked && I.clicked(); return !!(c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h); };
