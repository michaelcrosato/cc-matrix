// ---- glyphs: button icons drawn in pixels (the 5x7 font has no ✕ ○ □ △), keycaps and mouse buttons ----
// MT.glyph.draw(g, x, y, action, input, { scale }) draws the icon of the action's binding on the input's last device and
// returns its width; MT.glyph.prompt(g, x, y, [[action, 'TEXT'], ...], input, o) draws a row of icons with labels.
const GLYPH = MT.glyph = {};
const PS_FACE = { 0: ['x', '#7aa8ff'], 1: ['o', '#ff6a6a'], 2: ['s', '#ff8ad8'], 3: ['t', '#5fe0a0'] };
const XB_FACE = { 0: ['A', '#5fd068'], 1: ['B', '#ff5a5a'], 2: ['X', '#4aa0ff'], 3: ['Y', '#ffd23a'] };
const PS_NAMES = { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3' };
const XB_NAMES = { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' };
const KEY_SHORT = { Escape: 'ESC', Enter: 'ENTER', NumpadEnter: 'ENTER', Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Backspace: 'BKSP',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB' };
GLYPH.family = I => (I && I.glyphs === 'xbox') ? 'xbox' : 'playstation';
GLYPH.device = I => !I ? 'keyboard' : I.lastDevice === 'gamepad' ? 'gamepad' : I.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
/** the code shown for an action: a pad button on a pad, else a key (or the mouse button on the mouse) */
GLYPH.codeFor = (action, I, dev = GLYPH.device(I)) => {
  if (action === 'move' || action === 'aim' || action === 'dpad' || action === 'arrows') return action;
  const m = I && I.map[action]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  const pads = real.filter(c => /^Pad\d+$/.test(c)), keys = real.filter(c => !/^Pad/.test(c));
  if (dev === 'gamepad') return pads[0] || keys[0] || null;
  if (dev === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
};
const tw = (s, sc) => E.font.width(s, { scale: sc });
const txt = (g, s, x, y, c, sc, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ scale: sc, outline: false }, o));
function capWidth(label, s) { return Math.max(11 * s, tw(label, s) + 6 * s); }
/** width of one icon */
GLYPH.width = (action, I, o = {}) => {
  const s = o.scale || 1, code = GLYPH.codeFor(action, I, o.device);
  if (!code) return 0;
  return iconFor(null, 0, 0, code, I, s, true);
};
function iconFor(g, x, y, code, I, s, measure) {
  const fam = GLYPH.family(I), dev = GLYPH.device(I);
  if (code === 'move') { if (dev === 'gamepad') return stick(g, x, y, 'L', s, measure); return keycap(g, x, y, 'WASD', s, measure); }
  if (code === 'aim') { if (dev === 'gamepad') return stick(g, x, y, 'R', s, measure); return mouse(g, x, y, 0, s, measure); }
  if (code === 'dpad' || code === 'arrows') { if (dev === 'gamepad') return dpad(g, x, y, s, measure); return keycap(g, x, y, '↑↓←→', s, measure); }
  if (/^Pad\d+$/.test(code)) {
    const n = +code.slice(3);
    if (n <= 3) return face(g, x, y, n, fam, s, measure);
    if (n >= 12 && n <= 15) return dpad(g, x, y, s, measure, n - 12);
    const name = (fam === 'xbox' ? XB_NAMES : PS_NAMES)[n] || ('B' + n);
    if (n >= 4 && n <= 7) return tab(g, x, y, name, s, measure, n >= 6);
    if (n === 10 || n === 11) return stick(g, x, y, n === 10 ? 'L' : 'R', s, measure);
    return pill(g, x, y, name, s, measure);
  }
  if (code.startsWith('Mouse')) return mouse(g, x, y, +code.slice(5), s, measure);
  const label = KEY_SHORT[code] || (I ? I.codeLabel(code) : code).toUpperCase();
  return keycap(g, x, y, label, s, measure);
}
function face(g, x, y, n, fam, s, measure) {
  const w = 11 * s; if (measure) return w;
  const cx = x + 5.5 * s, cy = y + 5.5 * s, R = 5.5 * s;
  if (fam === 'xbox') {
    const [L, col] = XB_FACE[n]; const t = E.tones(col);
    px.disc(g, cx, cy, R, t.deep); px.disc(g, cx, cy, R - s, col); px.disc(g, cx - s, cy - s, R - 2.5 * s, t.lt);
    txt(g, L, cx + .5, y + 2 * s, '#140a24', s, { align: 'center' });
    return w;
  }
  const [sym, col] = PS_FACE[n];
  px.disc(g, cx, cy, R, '#0c0618'); px.disc(g, cx, cy, R - s * .8, '#2a2140');
  const k = s, L = 2.6 * s;
  if (sym === 'x') { px.line(g, cx - L, cy - L, cx + L, cy + L, col, Math.max(1, k)); px.line(g, cx - L, cy + L, cx + L, cy - L, col, Math.max(1, k)); }
  else if (sym === 'o') { px.disc(g, cx, cy, 3 * s, col); px.disc(g, cx, cy, 3 * s - Math.max(1, k), '#2a2140'); }
  else if (sym === 's') { const a = Math.round(cx - L), b = Math.round(cy - L), z = Math.round(L * 2); px.rect(g, a, b, z, k, col); px.rect(g, a, b + z - k, z, k, col); px.rect(g, a, b, k, z, col); px.rect(g, a + z - k, b, k, z, col); }
  else { px.line(g, cx, cy - L - s * .3, cx - L - s * .2, cy + L * .8, col, k); px.line(g, cx, cy - L - s * .3, cx + L + s * .2, cy + L * .8, col, k); px.line(g, cx - L - s * .2, cy + L * .8, cx + L + s * .2, cy + L * .8, col, k); }
  return w;
}
function tab(g, x, y, name, s, measure, trigger) {
  const w = Math.max(15 * s, tw(name, s) + 6 * s); if (measure) return w;
  const h = 11 * s, c = trigger ? '#3a3156' : '#2f2848';
  px.rect(g, x + s, y, w - 2 * s, h, '#0c0618'); px.rect(g, x, y + s, w, h - 2 * s, '#0c0618');
  px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, c); px.rect(g, x + s, y + s, w - 2 * s, s, '#5a4f80');
  if (trigger) px.rect(g, x + 2 * s, y + h - 3 * s, w - 4 * s, s, '#1c1630');
  txt(g, name, x + w / 2, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function pill(g, x, y, name, s, measure) {
  const w = tw(name, s) + 8 * s; if (measure) return w;
  const h = 11 * s;
  px.rect(g, x + 2 * s, y, w - 4 * s, h, '#0c0618'); px.rect(g, x, y + 2 * s, w, h - 4 * s, '#0c0618'); px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, '#0c0618');
  px.rect(g, x + 2 * s, y + s, w - 4 * s, h - 2 * s, '#3a3156'); px.rect(g, x + s, y + 2 * s, w - 2 * s, h - 4 * s, '#3a3156');
  txt(g, name, x + w / 2, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function stick(g, x, y, L, s, measure) {
  const w = 11 * s; if (measure) return w;
  const cx = x + 5.5 * s, cy = y + 5.5 * s;
  px.disc(g, cx, cy, 5.5 * s, '#0c0618'); px.disc(g, cx, cy, 4.6 * s, '#5a4f80'); px.disc(g, cx, cy, 3.4 * s, '#2a2140');
  txt(g, L, cx + .5, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function dpad(g, x, y, s, measure, lit = -1) {
  const w = 11 * s; if (measure) return w;
  const c = '#3a3156', on = '#ffcc33';
  px.rect(g, x + 3 * s, y, 5 * s, 11 * s, '#0c0618'); px.rect(g, x, y + 3 * s, 11 * s, 5 * s, '#0c0618');
  px.rect(g, x + 4 * s, y + s, 3 * s, 9 * s, c); px.rect(g, x + s, y + 4 * s, 9 * s, 3 * s, c);
  if (lit === 0) px.rect(g, x + 4 * s, y + s, 3 * s, 3 * s, on); if (lit === 1) px.rect(g, x + 4 * s, y + 7 * s, 3 * s, 3 * s, on);
  if (lit === 2) px.rect(g, x + s, y + 4 * s, 3 * s, 3 * s, on); if (lit === 3) px.rect(g, x + 7 * s, y + 4 * s, 3 * s, 3 * s, on);
  return w;
}
function keycap(g, x, y, label, s, measure) {
  const w = capWidth(label, s); if (measure) return w;
  const h = 11 * s;
  px.rect(g, x, y, w, h, '#0c0618'); px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, '#e8e0f4'); px.rect(g, x + s, y + h - 3 * s, w - 2 * s, 2 * s, '#a89cc4');
  txt(g, label, x + w / 2, y + 2 * s, '#140a24', s, { align: 'center' });
  return w;
}
function mouse(g, x, y, btn, s, measure) {
  const w = 9 * s; if (measure) return w;
  const h = 11 * s, lit = '#ffcc33', body = '#e8e0f4';
  px.rect(g, x + s, y, w - 2 * s, h, '#0c0618'); px.rect(g, x, y + s, w, h - 2 * s, '#0c0618');
  px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, body);
  if (btn === 0) px.rect(g, x + s, y + s, 3 * s, 4 * s, lit);
  if (btn === 2) px.rect(g, x + 5 * s, y + s, 3 * s, 4 * s, lit);
  if (btn === 1 || btn === -1) px.rect(g, x + 4 * s, y + s, s, 4 * s, btn === 1 ? lit : '#a89cc4');
  px.rect(g, x + 4 * s, y + s, s, 4 * s, '#a89cc4'); px.rect(g, x + s, y + 5 * s, w - 2 * s, s, '#a89cc4');
  if (btn === -1) { px.rect(g, x + 2 * s, y + 7 * s, 5 * s, s, '#6a5f90'); px.rect(g, x + 4 * s, y + 6 * s, s, 3 * s, '#6a5f90'); }
  return w;
}
/** draw the icon of one code ('Pad0', 'KeyE', 'Mouse2') on the input's glyph family */
GLYPH.drawCode = (g, x, y, code, I, o = {}) => iconFor(g, Math.round(x), Math.round(y), code, I, o.scale || 1, false);
GLYPH.draw = (g, x, y, action, I, o = {}) => {
  const s = o.scale || 1, code = GLYPH.codeFor(action, I, o.device);
  if (!code) return 0;
  return iconFor(g, Math.round(x), Math.round(y), code, I, s, false);
};
/** a row of [action, label] pairs; o: { scale, color, align: 'left' | 'center' | 'right', gap }. Returns its width */
GLYPH.measure = (items, I, o = {}) => {
  const s = o.scale || 1, gap = (o.gap === undefined ? 8 : o.gap) * s;
  let w = 0;
  items.forEach(([a, t], i) => { const iw = GLYPH.width(a, I, o); w += iw + (t ? 3 * s + tw(t, s) : 0) + (i < items.length - 1 ? gap : 0); });
  return w;
};
GLYPH.prompt = (g, x, y, items, I, o = {}) => {
  const s = o.scale || 1, gap = (o.gap === undefined ? 8 : o.gap) * s, w = GLYPH.measure(items, I, o);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  cx = Math.round(cx);
  for (const [a, t] of items) {
    cx += GLYPH.draw(g, cx, y, a, I, o);
    if (t) { cx += 3 * s; txt(g, t, cx, y + 2 * s, o.color || '#fff7e8', s, { shadow: '#000' }); cx += tw(t, s); }
    cx += gap;
  }
  return w;
};
/** a prompt as plain text, for tests and logs: [✕] SELECT, [Esc] BACK */
GLYPH.describe = (action, I) => {
  const code = GLYPH.codeFor(action, I); if (!code) return '';
  if (/^Pad\d+$/.test(code)) { const n = +code.slice(3), fam = GLYPH.family(I); if (n <= 3) return fam === 'xbox' ? XB_FACE[n][0] : ['✕', '○', '□', '△'][n]; return (fam === 'xbox' ? XB_NAMES : PS_NAMES)[n] || code; }
  if (code === 'move') return GLYPH.device(I) === 'gamepad' ? 'L-STICK' : 'WASD';
  if (code === 'aim') return GLYPH.device(I) === 'gamepad' ? 'R-STICK' : 'MOUSE';
  if (code.startsWith('Mouse')) return ['LEFT CLICK', 'MIDDLE CLICK', 'RIGHT CLICK'][+code.slice(5)] || code;
  return KEY_SHORT[code] || I.codeLabel(code).toUpperCase();
};
