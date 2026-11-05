/* INPUT: one positional preset (actions named by the button's place, because the same button swings, throws home and
 * punches), the glyph icon renderer (PlayStation by default, Xbox by setting, keycaps and mouse buttons), the prompt
 * builder, idle tracking for the attract mode, and touch-only detection. */
const KEYS = {
  south: ['Space', 'KeyK', 'Mouse0', 'Pad0'], east: ['KeyL', 'Pad1'], west: ['KeyJ', 'Mouse2', 'Pad2'], north: ['KeyI', 'Pad3'],
  l1: ['KeyQ', 'Tab', 'Pad4'], r1: ['KeyE', 'Pad5'], l2: ['ShiftLeft', 'Pad6'], r2: ['KeyC', 'ControlLeft', 'Pad7'], view: ['KeyV', 'Pad11'],
  num1: ['Digit1'], num2: ['Digit2'], num3: ['Digit3'], num4: ['Digit4'], num5: ['Digit5'],
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyK', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1'],
  create: ['Pad8'], pinNext: ['Backslash'], pinDown: ['BracketLeft'], pinUp: ['BracketRight']
};
BZ.KEYS = KEYS;
const FACE = ['south', 'east', 'west', 'north'];
// base buttons by position: ○ first, △ second, □ third, ✕ home (keyboard 1-4 too)
const BASE_BTN = { east: 1, north: 2, west: 3, south: 4 }, BASE_NUM = { num1: 1, num2: 2, num3: 3, num4: 4 };
/** which base (1-4) input I picked this step with a base button, or 0 */
function basePressed(I) {
  for (const a in BASE_NUM) if (I.pressed(a)) return BASE_NUM[a];
  for (const a in BASE_BTN) if (I.pressed(a) && !(a === 'south' && I.lastDevice === 'mouse')) return BASE_BTN[a];
  return 0;
}

/* ---- glyph icons ---- */
const PS_COL = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#f08ad8', '△': '#4fe0b0' }, XB_COL = { A: '#6cc04a', B: '#e8584a', X: '#4a8ef0', Y: '#f4c430' };
function iconInfo(I, a) {
  const dev = I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice, m = I.map[a] || [];
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (dev === 'gamepad') { const c = real.find(c => c.startsWith('Pad')); if (c) return { kind: 'pad', code: c, label: I.codeLabel(c), fam: I.padStyle() }; }
  if (dev === 'mouse') { const c = real.find(c => c.startsWith('Mouse')); if (c) return { kind: 'mouse', code: c, label: c === 'Mouse0' ? 'L' : 'R' }; }
  const k = real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => c.startsWith('Mouse'));
  if (!k) return { kind: 'key', label: a.toUpperCase() };
  if (k.startsWith('Mouse')) return { kind: 'mouse', code: k, label: k === 'Mouse0' ? 'L' : 'R' };
  return { kind: 'key', code: k, label: I.codeLabel(k) };
}
/** draw action a's icon for input I at (x, y) (top left); returns its width */
function glyph(g, I, a, x, y, s = 11) {
  const f = iconInfo(I, a);
  if (f.kind === 'pad') {
    const L = f.label, n = +f.code.slice(3);
    if (n <= 3) {
      const cx = x + s / 2, cy = y + s / 2, r = s / 2;
      px.disc(g, cx, cy, r, '#e8e6f0'); px.disc(g, cx, cy, r - 1, '#1b1d26');
      if (f.fam === 'playstation') {
        const c = PS_COL[L] || '#fff', q = Math.max(2, Math.round(r * .5));
        if (L === '✕') { px.line(g, cx - q, cy - q, cx + q, cy + q, c, 2); px.line(g, cx - q, cy + q, cx + q, cy - q, c, 2); }
        else if (L === '○') { px.disc(g, cx, cy, q + .5, c); px.disc(g, cx, cy, q - 1.2, '#1b1d26'); }
        else if (L === '□') { px.rect(g, cx - q, cy - q, q * 2, q * 2, c); px.rect(g, cx - q + 1.5, cy - q + 1.5, q * 2 - 3, q * 2 - 3, '#1b1d26'); }
        else { px.poly(g, [[cx, cy - q - 1], [cx + q + 1, cy + q], [cx - q - 1, cy + q]], c); px.poly(g, [[cx, cy - q + 2], [cx + q - 1.5, cy + q - 1.5], [cx - q + 1.5, cy + q - 1.5]], '#1b1d26'); }
      } else E.font.text(g, L, cx, cy - 3, XB_COL[L] || '#fff', { align: 'center', outline: false });
      return s;
    }
    const w = E.font.width(L) + 6;
    E.ui.box(g, x, y + 1, w, s - 2, { bg: '#2a2c3a', border: '#c8c8d8', gradient: false });
    E.font.text(g, L, x + 3, y + s / 2 - 3, '#ffffff', { outline: false });
    return w;
  }
  if (f.kind === 'mouse') {
    const w = 8, h = s; px.rect(g, x + 1, y, w - 2, h, '#e8e6f0'); px.rect(g, x, y + 2, w, h - 4, '#e8e6f0'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#2a2c3a');
    px.rect(g, f.label === 'L' ? x + 1 : x + w / 2, y + 1, w / 2 - 1, 4, '#ffd36a'); px.line(g, x + w / 2, y + 1, x + w / 2, y + 5, '#e8e6f0');
    return w;
  }
  const L = f.label.length > 6 ? f.label.slice(0, 6) : f.label, w = Math.max(s, E.font.width(L) + 6);
  E.ui.box(g, x, y, w, s, { bg: ['#f4f2ea', '#c8c4b8'], border: '#5a5650', gradient: true });
  E.font.text(g, L, x + w / 2, y + s / 2 - 3, '#1a1820', { align: 'center', outline: false });
  return w;
}
function glyphW(I, a, s = 11) {
  const f = iconInfo(I, a);
  if (f.kind === 'pad') return +f.code.slice(3) <= 3 ? s : E.font.width(f.label) + 6;
  if (f.kind === 'mouse') return 8;
  const L = f.label.length > 6 ? f.label.slice(0, 6) : f.label; return Math.max(s, E.font.width(L) + 6);
}
/** a row of prompts [[action, verb, enabled, why]] at (x, y); align 'left' | 'center' | 'right'; returns its width */
function promptRow(g, I, items, x, y, align = 'center', s = 11) {
  const parts = items.filter(Boolean).map(([a, verb, on = true, why]) => ({ a, t: on ? verb : verb + (why ? ' (' + why + ')' : ''), on }));
  const ws = parts.map(p => p.a ? glyphW(I, p.a, s) : -3);
  let total = 0; parts.forEach((p, i) => { total += ws[i] + 3 + E.font.width(p.t) + 10; });
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  parts.forEach((p, i) => {
    const w = p.a ? glyph(g, I, p.a, cx, y, s) : -3;
    E.font.text(g, p.t, cx + w + 3, y + s / 2 - 3, p.on ? '#ffffff' : '#8a8898', { shadow: '#000', outline: false });
    cx += ws[i] + 3 + E.font.width(p.t) + 10;
  });
  return total;
}
BZ.glyph = glyph; BZ.promptRow = promptRow;

/* ---- idle tracking (the attract mode): any key, button, click, stick past the dead zone, mouse moved over 4 px ---- */
const IDLE = { t: 0, px: null };
function anyInput(I = game.input) {
  for (const p of game.players) {
    if (p.anyPressed()) return true;
    const m = p.move(); if (Math.hypot(m[0], m[1]) > .3) return true;
  }
  const pt = I.pointer && I.pointer();
  if (pt) { if (IDLE.px && Math.hypot(pt[0] - IDLE.px[0], pt[1] - IDLE.px[1]) > 4) { IDLE.px = pt.slice(); return true; } if (!IDLE.px) IDLE.px = pt.slice(); }
  if (I.clicked && I.clicked()) return true;
  return false;
}
function idleTick(dt) { if (anyInput()) { IDLE.t = 0; return false; } IDLE.t += dt / Math.max(.01, game.timeScale || 1); return IDLE.t >= 10; }
BZ.idle = IDLE;

/* ---- touch-only devices: no touch controls; a card that asks for a controller or keyboard ---- */
BZ.touchOnly = false;
function detectTouch() {
  try {
    if (typeof matchMedia !== 'undefined' && typeof navigator !== 'undefined')
      BZ.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0;
    if (typeof location !== 'undefined' && location.hash === '#touch') BZ.touchOnly = true;
    if (typeof addEventListener !== 'undefined') {
      addEventListener('keydown', () => { BZ.touchOnly = false; });
      addEventListener('gamepadconnected', () => { BZ.touchOnly = false; });
    }
  } catch (e) { BZ.touchOnly = false; }
}
game.input.touchEnabled = false;
BZ.wheel = 0;
if (typeof addEventListener !== 'undefined') addEventListener('wheel', e => { if (M && M.phase === 'select') BZ.wheel += Math.sign(e.deltaY); }, { passive: true });
