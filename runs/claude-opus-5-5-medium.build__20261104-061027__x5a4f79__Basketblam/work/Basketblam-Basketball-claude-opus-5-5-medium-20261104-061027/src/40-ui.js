/* UI KIT: 10-foot widgets drawn on the canvas. Glyphs follow each player's last device: PlayStation symbols by default
 * (Settings: Xbox), keycaps on the keyboard, a mouse with the bound button lit after mouse use. Prompt lines swap
 * {action} tokens for icons. FocusList: a list of big buttons that the stick, d-pad, arrows/WASD, Enter/Esc, the mouse
 * (hover moves the focus, click picks, right click backs out) and the wheel all drive. */
const UI = { ink: '#fff7ec', dim: '#b8acd8', accent: '#ff3ca6', accent2: '#2de2ff', gold: '#ffd23a', panel: '#140c24', line: '#3a2a5a', bad: '#ff5a3a', good: '#5aff8a' };
const T1 = { outline: '#0a0612' };
function txt(g, s, x, y, col = UI.ink, scale = 1, align = 'left', o = {}) { E.font.text(g, String(s), Math.round(x), Math.round(y), col, Object.assign({ scale, align, outline: '#0a0612' }, o)); }
const tw = (s, scale = 1) => E.font.width(String(s), { scale });
const lh = (scale = 1) => E.font.lineHeight({ scale });
/** the code an action is bound to on a device */
function codeFor(input, action, device) {
  const m = input && input.map && input.map[action]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis')), pads = real.filter(c => c.startsWith('Pad')), keys = real.filter(c => !c.startsWith('Pad'));
  if (device === 'gamepad') return pads[0] || keys[0];
  if (device === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys.find(c => !c.startsWith('Mouse')) || pads[0];
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0];
}
const deviceOf = input => { const d = input ? input.lastDevice : 'keyboard'; return d === 'touch' ? 'keyboard' : d; };
const padStyleOf = () => setting('symbols') === 'xbox' ? 'xbox' : 'playstation';
const PS = { Pad0: ['cross', '#5a8aff'], Pad1: ['circle', '#ff5a5a'], Pad2: ['square', '#ff7ad8'], Pad3: ['triangle', '#4ae0a0'] };
const XB = { Pad0: ['A', '#4ad860'], Pad1: ['B', '#ff4a4a'], Pad2: ['X', '#4a8aff'], Pad3: ['Y', '#ffd040'] };
const SHOULDER = { Pad4: ['L1', 'LB'], Pad5: ['R1', 'RB'], Pad6: ['L2', 'LT'], Pad7: ['R2', 'RT'], Pad8: ['CREATE', 'VIEW'], Pad9: ['OPTIONS', 'MENU'], Pad10: ['L3', 'LS'], Pad11: ['R3', 'RS'], Pad12: ['↑', '↑'], Pad13: ['↓', '↓'], Pad14: ['←', '←'], Pad15: ['→', '→'] };
/** draw one glyph for a code; returns its width. s: 1 (prompt lines) or 2 (How to Play) */
function glyph(g, code, x, y, s = 1, style = padStyleOf()) {
  x = Math.round(x); y = Math.round(y);
  const R = 5 * s;
  if (!code) return 0;
  if (code.startsWith('Pad') && PS[code]) {
    if (style === 'xbox') { const [l, c] = XB[code]; px.disc(g, x + R, y + R, R, '#1a1a22'); px.disc(g, x + R, y + R, R - 1, E.shade(c, -.3)); txt(g, l, x + R + 1, y + R - 3 * s, '#ffffff', s, 'center', { outline: false }); return R * 2 + 2; }
    const [k, c] = PS[code]; px.disc(g, x + R, y + R, R, '#14141c'); px.disc(g, x + R, y + R, R - 1, '#2a2a36');
    const cx = x + R, cy = y + R, q = Math.round(2.5 * s);
    if (k === 'cross') { px.line(g, cx - q, cy - q, cx + q, cy + q, c, s); px.line(g, cx - q, cy + q, cx + q, cy - q, c, s); }
    if (k === 'circle') { px.disc(g, cx, cy, q + .5, c); px.disc(g, cx, cy, Math.max(.5, q - s + .5), '#2a2a36'); }
    if (k === 'square') { px.rect(g, cx - q, cy - q, q * 2 + 1, s, c); px.rect(g, cx - q, cy + q - s + 1, q * 2 + 1, s, c); px.rect(g, cx - q, cy - q, s, q * 2 + 1, c); px.rect(g, cx + q - s + 1, cy - q, s, q * 2 + 1, c); }
    if (k === 'triangle') { px.line(g, cx, cy - q, cx - q, cy + q - 1, c, s); px.line(g, cx, cy - q, cx + q, cy + q - 1, c, s); px.line(g, cx - q, cy + q - 1, cx + q, cy + q - 1, c, s); }
    return R * 2 + 2;
  }
  if (code.startsWith('Pad') && SHOULDER[code]) {
    const l = SHOULDER[code][style === 'xbox' ? 1 : 0], w = tw(l, s) + 6 * s;
    E.ui.box(g, x, y, w, R * 2, { bg: '#2a2a36', border: '#8a8aa0', gradient: false }); txt(g, l, x + w / 2, y + R - 3 * s, '#ffffff', s, 'center', { outline: false }); return w + 2;
  }
  if (code.startsWith('Mouse')) {   // a mouse with the button lit
    const w = 8 * s, h = R * 2, lit = code === 'Mouse0' ? 0 : code === 'Mouse2' ? 1 : 2;
    px.rect(g, x, y, w, h, '#d8d8e0'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#8a8a98');
    px.rect(g, x + (lit === 1 ? w / 2 : 1), y + 1, w / 2 - 1, h / 2 - 1, lit === 2 ? '#8a8a98' : '#ffd23a'); px.rect(g, x + w / 2, y + 1, 1, h / 2, '#3a3a44');
    return w + 2;
  }
  // a keycap with the key's name
  const name = keyName(code), w = Math.max(R * 2, tw(name, s) + 6 * s);
  E.ui.box(g, x, y, w, R * 2, { bg: ['#f4f0ea', '#c8c0d0'], border: '#3a3448' }); txt(g, name, x + w / 2, y + R - 3 * s, '#1a1420', s, 'center', { outline: false });
  return w + 2;
}
function keyName(code) {
  const map = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB', F2: 'F2' };
  if (map[code]) return map[code]; if (code.startsWith('Key')) return code.slice(3); if (code.startsWith('Digit')) return code.slice(5); if (code.startsWith('Numpad')) return 'NUM' + code.slice(6);
  return code.toUpperCase().slice(0, 5);
}
/** the glyph(s) for an action on this player's device; 'move' shows the stick or WASD; 'confirm' / 'cancel' the menu buttons */
function actionGlyph(g, action, x, y, input, s = 1) {
  const dev = deviceOf(input);
  if (action === 'move') {
    if (dev === 'gamepad') { const R = 5 * s; px.disc(g, x + R, y + R, R, '#14141c'); px.disc(g, x + R, y + R, R - 2, '#4a4a58'); px.disc(g, x + R, y + R - 1, R - 3, '#6a6a78'); return R * 2 + 2; }
    const keys = input && input.map && input.map.up && input.map.up.includes('KeyW') ? 'WASD' : '↑↓←→'; const w = tw(keys, s) + 6 * s;
    E.ui.box(g, x, y, w, 10 * s, { bg: ['#f4f0ea', '#c8c0d0'], border: '#3a3448' }); txt(g, keys, x + w / 2, y + 5 * s - 3 * s, '#1a1420', s, 'center', { outline: false }); return w + 2;
  }
  if (action === 'confirm' && dev === 'gamepad') return glyph(g, 'Pad0', x, y, s);
  if (action === 'cancel' && dev === 'gamepad') return glyph(g, 'Pad1', x, y, s);
  if (action === 'confirm' && dev === 'mouse') return glyph(g, 'Mouse0', x, y, s);
  if (action === 'cancel' && dev === 'mouse') return glyph(g, 'Mouse2', x, y, s);
  if (action === 'confirm') return glyph(g, 'Enter', x, y, s);
  if (action === 'cancel') return glyph(g, 'Escape', x, y, s);
  if (action === 'pause') return glyph(g, dev === 'gamepad' ? 'Pad9' : 'Escape', x, y, s);
  if (action === 'tabs') { if (dev === 'gamepad') { const a = glyph(g, 'Pad4', x, y, s); return a + glyph(g, 'Pad5', x + a, y, s); } const a = glyph(g, 'KeyQ', x, y, s); return a + glyph(g, 'KeyE', x + a, y, s); }
  return glyph(g, codeFor(input, action, dev), x, y, s);
}
/** a prompt line: 'Hold {turbo} + {shoot} to DUNK' with icons; returns its width (draw: false measures) */
function promptLine(g, text, x, y, input, o = {}) {
  const s = o.scale || 1, parts = String(text).split(/(\{[a-zA-Z]+\})/), col = o.color || UI.ink;
  let w = 0; const measure = !g;
  const items = parts.filter(Boolean).map(pt => { const m = pt.match(/^\{([a-zA-Z]+)\}$/); return m ? { a: m[1] } : { t: pt }; });
  // widths first (alignment)
  const wid = it => it.a ? measureGlyph(it.a, input, s) : tw(it.t, s);
  const total = items.reduce((a, it) => a + wid(it), 0);
  if (measure) return total;
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  for (const it of items) { if (it.a) { actionGlyph(g, it.a, cx, y - 2 * s, input, s); cx += wid(it); } else { txt(g, it.t, cx, y, col, s); cx += tw(it.t, s); } }
  return total;
}
function measureGlyph(a, input, s) {
  const dev = deviceOf(input);
  if (a === 'move') return dev === 'gamepad' ? 12 * s : tw(input && input.map && input.map.up && input.map.up.includes('KeyW') ? 'WASD' : '↑↓←→', s) + 8 * s;
  if (a === 'tabs') return dev === 'gamepad' ? 2 * (tw('L1', s) + 8 * s) : 2 * 12 * s;
  let code = a === 'confirm' ? (dev === 'gamepad' ? 'Pad0' : dev === 'mouse' ? 'Mouse0' : 'Enter') : a === 'cancel' ? (dev === 'gamepad' ? 'Pad1' : dev === 'mouse' ? 'Mouse2' : 'Escape') : a === 'pause' ? (dev === 'gamepad' ? 'Pad9' : 'Escape') : codeFor(input, a, dev);
  if (!code) return 0;
  if (code.startsWith('Pad') && PS[code]) return 12 * s;
  if (code.startsWith('Pad') && SHOULDER[code]) return tw(SHOULDER[code][padStyleOf() === 'xbox' ? 1 : 0], s) + 8 * s;
  if (code.startsWith('Mouse')) return 10 * s;
  return Math.max(10 * s, tw(keyName(code), s) + 6 * s) + 2;
}
/** the bottom bar of a menu screen */
function promptBar(g, r, text, input = game.input) {
  const y = r.H - 18; px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 6, r.W, 24, '#0a0612'));
  promptLine(g, text, r.W / 2, y, input, { align: 'center' });
}

/* ---- FocusList: big buttons; one obvious focus (an outline, a ▸, a pulse, a brighter fill) ---- */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.boxes = []; this.t = 0; this.horizontal = !!o.horizontal; }
  get cur() { return this.items[this.i]; }
  /** returns true when it handled a pick or back this step */
  update(dt, inputs = game.players) {
    this.t += dt; const n = this.items.length; if (!n) return false;
    const fw = this.horizontal ? ['left', 'right'] : ['up', 'down'];
    for (const I of inputs) {
      if (I.repeat(fw[0], .35, .12)) { this.move(-1); }
      if (I.repeat(fw[1], .35, .12)) { this.move(1); }
      if (this.o.side && (I.repeat(this.horizontal ? 'up' : 'left', .35, .12) || I.repeat(this.horizontal ? 'down' : 'right', .35, .12))) { const it = this.cur; if (it && it.side) { it.side(I.down(this.horizontal ? 'up' : 'left') ? -1 : 1); A.sfx('select'); } }
    }
    // the mouse: hover moves the focus, a click picks, the wheel turns a slider under the pointer
    const I0 = game.input, ptr = I0.pointer && I0.pointer();
    if (ptr && (ptr[0] !== this._px || ptr[1] !== this._py)) { this._px = ptr[0]; this._py = ptr[1]; const k = this.hit(ptr); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; A.sfx('select'); if (this.o.onMove) this.o.onMove(this.i); } }
    const cl = I0.clicked && I0.clicked();
    if (cl) { const k = this.hit(cl); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(I0); } }
    for (const I of inputs) {
      if (I.pressed('confirm') || (this.o.startPicks !== false && I.pressed('start'))) { if (this.cur && !this.cur.disabled) return this.pick(I); }
      if (I.pressed('cancel') && this.o.onBack) { I.consumeAll(); A.sfx('cancel'); this.o.onBack(I); return true; }
    }
    return false;
  }
  move(d) { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; A.sfx('select'); if (this.o.onMove) this.o.onMove(this.i); } }
  pick(I) { const it = this.cur; for (const P0 of game.players) P0.consumeAll(); A.sfx('confirm'); if (it.onPick) it.onPick(I); else if (this.o.onPick) this.o.onPick(this.i, it, I); return true; }
  hit(p) { for (let k = 0; k < this.boxes.length; k++) { const b = this.boxes[k]; if (b && p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]) return k; } return -1; }
  /** draw at (x, y): vertical rows of w x h, or a horizontal strip */
  draw(g, x, y, w, h, o = {}) {
    const gap = o.gap === undefined ? 4 : o.gap, s = o.scale || 2;
    this.boxes = [];
    this.items.forEach((it, k) => {
      const bx = this.horizontal ? x + k * (w + gap) : x, by = this.horizontal ? y : y + k * (h + gap), sel = k === this.i, pulse = sel ? Math.sin(this.t * 6) * .5 + .5 : 0;
      this.boxes.push([bx, by, w, h]);
      const bg = it.disabled ? ['#1a1426', '#120c1c'] : sel ? [E.mix(o.hi || UI.accent, '#ffffff', .1 + pulse * .1), E.shade(o.hi || UI.accent, -.35)] : ['#2a1e44', '#1a1230'];
      E.ui.box(g, bx, by, w, h, { bg, border: sel ? '#ffffff' : UI.line });
      if (sel) { px.rect(g, bx - 2, by - 2, w + 4, 1, '#ffffff'); px.rect(g, bx - 2, by + h + 1, w + 4, 1, '#ffffff'); }
      const label = (sel ? '▸ ' : '') + (typeof it.label === 'function' ? it.label() : it.label);
      const ty = by + Math.round(h / 2 - lh(s) / 2) + 1;
      if (o.center) txt(g, label, bx + w / 2, ty, it.disabled ? '#5a4e70' : UI.ink, s, 'center'); else txt(g, label, bx + 8, ty, it.disabled ? '#5a4e70' : UI.ink, s);
      if (it.value) { const v = typeof it.value === 'function' ? it.value() : it.value; txt(g, v, bx + w - 8, ty, sel ? '#ffffff' : UI.gold, s, 'right'); }
    });
  }
}
/** a big panel with a title */
function panel(g, x, y, w, h, title, o = {}) {
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1e1436', '#0e0a1c'], border: o.border || UI.line, alpha: o.alpha || .94 });
  if (title) txt(g, title, x + w / 2, y + 6, o.titleColor || UI.gold, o.titleScale || 2, 'center');
}
/** a rating as ten pips with its name (never a raw number on the 10-foot screens) */
function pips(g, x, y, label, v, col = UI.accent2) {
  txt(g, label, x, y, UI.dim, 1);
  for (let k = 0; k < 10; k++) px.rect(g, x + 42 + k * 6, y + 1, 5, 5, k < v ? col : '#2a2440');
}
/** a title-safe frame: 5% of every side */
const safe = r => ({ x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) });
/** the logo */
function logo(g, x, y, scale = 4, t = 0) {
  const sc = scale + Math.sin(t * 2) * .0;
  // the comic star behind BLAM
  const W = tw('BASKETBLAM', scale), cx = x + W / 2 - tw('BLAM', scale) / 2, cy = y + 4 * scale, R = 9 * scale;
  const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * TAU + t * .3, rr = k % 2 ? R * .62 : R; pts.push([cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr]); }
  px.poly(g, pts, '#ff3ca6'); const p2 = pts.map(([px0, py0]) => [cx + (px0 - cx) * .86, cy + (py0 - cy) * .86]); px.poly(g, p2, '#ffd23a');
  E.font.title(g, 'BASKETBLAM', x, y, { scale: sc, colors: ['#ffffff', '#ffe08a', '#ff9a3a', '#e04a1a'], depth: Math.round(scale * .8), depthColor: '#3a0a2a', align: 'center' });
}
