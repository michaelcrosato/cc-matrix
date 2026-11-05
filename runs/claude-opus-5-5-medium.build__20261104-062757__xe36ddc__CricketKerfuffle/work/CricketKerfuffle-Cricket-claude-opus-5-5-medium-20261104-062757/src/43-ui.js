// ---- input map (5.14.1), glyph prompts that follow the last device (5.14.3), and 10-foot widgets (5.15): big menus
// with a cricket-ball cursor, option rows, cards, panels. Hover moves the focus; a click picks.
const KERFUFFLE_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  shot: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], block: ['KeyL', 'KeyQ', 'Pad1'], run: ['Space', 'Pad5'], back: ['ShiftLeft', 'ShiftRight', 'Pad4'],
  special: ['KeyI', 'KeyF', 'Pad3'], charge: ['KeyE', 'Pad7'], hubCreate: ['Pad8'], more: ['KeyT'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
const ACTION_NAMES = { shot: 'Ground shot / Bowl / Catch', loft: 'Lofted shot / Alt delivery', block: 'Defend / Alt delivery', run: 'Run / Field preset', back: 'Stay / Over-Round', special: 'Special / Review', charge: 'Charge', hubCreate: false, more: false };
const PAD_PS = { Pad0: 'cross', Pad1: 'circle', Pad2: 'square', Pad3: 'triangle', Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CREATE', Pad9: 'OPTIONS', Pad12: 'up', Pad13: 'down', Pad14: 'left', Pad15: 'right' };
const PAD_XB = { Pad0: 'A', Pad1: 'B', Pad2: 'X', Pad3: 'Y', Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU' };
// the code to show for an action on a device, from the player's own bindings
function codeFor(I, action, device) {
  const codes = (I.map && I.map[action]) || KERFUFFLE_KEYS[action] || [];
  const isPad = c => /^Pad\d+$/.test(c), isMouse = c => /^Mouse\d$/.test(c);
  if (device === 'gamepad') return codes.find(isPad) || null;
  if (device === 'mouse') return codes.find(isMouse) || codes.find(c => !isPad(c) && !isMouse(c)) || null;
  return codes.find(c => !isPad(c) && !isMouse(c)) || null;
}
function devOf(I) { const d = (I && I.lastDevice) || 'keyboard'; return d === 'touch' ? 'keyboard' : d; }
// draws the glyph for an action at (x, y) (its left, vertical centre); returns its width
function glyph(g, I, action, x, y, o = {}) {
  I = I || game.input;
  const dev = o.device || devOf(I), code = codeFor(I, action, dev) || codeFor(I, action, 'keyboard');
  return glyphCode(g, I, code, x, y, dev);
}
function glyphCode(g, I, code, x, y, dev) {
  if (!code) return 0;
  y = Math.round(y); x = Math.round(x);
  if (/^Pad\d+$/.test(code)) {
    const xb = I.padStyle && I.padStyle() === 'xbox';
    const n = xb ? PAD_XB[code] : PAD_PS[code];
    if (!xb && ['cross', 'circle', 'square', 'triangle'].includes(n)) {
      px.disc(g, x + 5, y, 5, '#1a1a24'); px.disc(g, x + 5, y, 4, '#2a2a36');
      const c = { cross: '#7aa7ff', circle: '#ff6b6b', square: '#ff8ad8', triangle: '#5fd38a' }[n];
      if (n === 'cross') { px.line(g, x + 3, y - 2, x + 7, y + 2, c); px.line(g, x + 7, y - 2, x + 3, y + 2, c); }
      if (n === 'circle') { px.disc(g, x + 5, y, 2.6, c); px.disc(g, x + 5, y, 1.6, '#2a2a36'); }
      if (n === 'square') { px.rect(g, x + 3, y - 2, 5, 5, c); px.rect(g, x + 4, y - 1, 3, 3, '#2a2a36'); }
      if (n === 'triangle') { px.line(g, x + 5, y - 3, x + 2, y + 2, c); px.line(g, x + 5, y - 3, x + 8, y + 2, c); px.line(g, x + 2, y + 2, x + 8, y + 2, c); }
      return 11;
    }
    if (xb && ['A', 'B', 'X', 'Y'].includes(n)) {
      const c = { A: '#5fd38a', B: '#ff6b6b', X: '#7aa7ff', Y: '#ffd23a' }[n];
      px.disc(g, x + 5, y, 5, '#1a1a24'); px.disc(g, x + 5, y, 4, c); E.font.text(g, n, x + 5, y - 3, '#101018', { align: 'center', outline: false, shadow: false });
      return 11;
    }
    if (['up', 'down', 'left', 'right'].includes(n)) { px.rect(g, x + 3, y - 4, 3, 9, '#3a3a46'); px.rect(g, x, y - 1, 9, 3, '#3a3a46'); const d = { up: [4, -3], down: [4, 3], left: [1, 0], right: [7, 0] }[n]; px.rect(g, x + d[0], y + d[1], 1, 1, '#ffffff'); return 11; }
    const w = E.font.width(n) + 6; px.rect(g, x, y - 5, w, 10, '#1a1a24'); px.rect(g, x + 1, y - 4, w - 2, 8, '#3a3a46'); E.font.text(g, n, x + 3, y - 3, '#f4f4f0'); return w + 1;
  }
  if (/^Mouse\d$/.test(code)) {
    const right = code === 'Mouse2';
    px.rect(g, x + 1, y - 5, 8, 11, '#1a1a24'); px.rect(g, x + 2, y - 4, 6, 9, '#d8d8e0'); px.rect(g, x + 2, y - 4, 6, 1, '#d8d8e0');
    px.rect(g, right ? x + 5 : x + 2, y - 4, 3, 4, '#ffd23a'); px.rect(g, x + 5, y - 4, 1, 4, '#6a6a76');
    return 11;
  }
  const lab = upper(I.codeLabel ? I.codeLabel(code) : code.replace(/^Key|^Digit/, ''));
  const w = Math.max(10, E.font.width(lab) + 6);
  px.rect(g, x, y - 6, w, 12, '#0a0a10'); px.rect(g, x + 1, y - 5, w - 2, 9, '#f0ece4'); px.rect(g, x + 1, y + 4, w - 2, 1, '#9a9488');
  E.font.text(g, lab, x + Math.round(w / 2), y - 4, '#14141c', { align: 'center', outline: false, shadow: false });
  return w + 1;
}
// a row of prompts: [[action, label], ...] at (x, y); align 'left' | 'center' | 'right'; returns its width
function prompts(g, I, items, x, y, o = {}) {
  const gap = 8, col = o.color || '#f4f4f0';
  const widths = items.map(([a, l]) => { const w = measureGlyph(I, a) + 3 + E.font.width(upper(l)); return w; });
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  items.forEach(([a, l], k) => { const w = glyph(g, I, a, cx, y); E.font.text(g, upper(l), cx + w + 2, y - 3, col, { shadow: '#000' }); cx += widths[k] + gap; });
  return total;
}
function measureGlyph(I, a) {
  I = I || game.input; const dev = devOf(I), code = codeFor(I, a, dev) || codeFor(I, a, 'keyboard');
  if (!code) return 0; if (/^Mouse/.test(code)) return 11;
  if (/^Pad/.test(code)) { const xb = I.padStyle && I.padStyle() === 'xbox', n = xb ? PAD_XB[code] : PAD_PS[code]; return ['cross', 'circle', 'square', 'triangle', 'A', 'B', 'X', 'Y', 'up', 'down', 'left', 'right'].includes(n) ? 11 : E.font.width(n) + 7; }
  return Math.max(9, E.font.width(upper(I.codeLabel ? I.codeLabel(code) : code)) + 6) + 1;
}
// which glyph family a prompt shows right now (tests read it)
function promptKind(I, a) { const dev = devOf(I), code = codeFor(I, a, dev) || codeFor(I, a, 'keyboard'); if (!code) return null; if (/^Pad/.test(code)) return (I.padStyle && I.padStyle() === 'xbox' ? 'xbox:' + PAD_XB[code] : 'ps:' + PAD_PS[code]); if (/^Mouse/.test(code)) return 'mouse:' + code; return 'key:' + upper(I.codeLabel ? I.codeLabel(code) : code); }

// ---- widgets: a big list (one decision per screen), with option rows (left / right change a value)
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.t = 0; this.rects = []; this.lastPtr = null; }
  get cur() { return this.items[this.i]; }
  update(dt, I = game.input) {
    this.t += dt;
    const n = this.items.length; if (!n) return null;
    const en = k => !this.items[k].disabled;
    const step = d => { let k = this.i; for (let c = 0; c < n; c++) { k = (k + d + n) % n; if (en(k)) { this.i = k; sfx('select'); return; } } };
    if (I.repeat('up', .35, .12)) step(-1);
    if (I.repeat('down', .35, .12)) step(1);
    const it = this.cur;
    if (it && it.options) {
      if (I.repeat('left', .35, .12)) { it.k = (it.k - 1 + it.options.length) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); }
      if (I.repeat('right', .35, .12)) { it.k = (it.k + 1) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); }
    }
    // the mouse: hover moves the focus, a click picks (or turns an option row)
    const p = HEADLESS ? null : I.pointer && I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { this.lastPtr = p.slice(); const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && en(k)) { this.i = k; sfx('select'); } }
    const c = I.clicked && I.clicked();
    if (c) { const k = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0 && en(k)) { this.i = k; const it2 = this.items[k]; if (it2.options) { const r = this.rects[k]; const d = c[0] < r[0] + r[2] / 2 ? -1 : 1; it2.k = (it2.k + d + it2.options.length) % it2.options.length; sfx('select'); it2.onChange && it2.onChange(it2.options[it2.k], it2); return null; } sfx('confirm'); return this._pick(it2); } }
    if (I.pressed('confirm') && it && !it.disabled) { if (it.options && !it.act) { it.k = (it.k + 1) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); return null; } sfx('confirm'); return this._pick(it); }
    if (I.pressed('cancel') && this.o.onBack) { sfx('cancel'); this.o.onBack(); return 'back'; }
    return null;
  }
  _pick(it) { if (it.act) it.act(it); return it; }
  draw(g, x, y, w, o = {}) {
    const lh = o.lh || 19, sc = o.scale || 2;
    this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * lh, foc = k === this.i, dis = it.disabled;
      this.rects[k] = [x - w / 2, yy - 3, w, lh - 2];
      if (foc) { px.blend(g, .55, 'normal', () => px.rect(g, x - w / 2, yy - 3, w, lh - 2, '#1a1430')); px.rect(g, x - w / 2, yy - 3, 3, lh - 2, '#ffd23a'); px.rect(g, x - w / 2, yy + lh - 6, w, 1, '#ffd23a'); }
      const label = upper(it.label) + (it.options ? '' : '');
      const col = dis ? '#6a6878' : foc ? '#ffe9a0' : '#f4f0e0';
      if (it.options) {
        E.font.text(g, upper(it.label), x - w / 2 + 10, yy, col, { scale: o.optScale || 1, shadow: '#000' });
        const v = upper(it.show ? it.show(it.options[it.k]) : it.options[it.k]);
        E.font.text(g, (foc ? '← ' : '') + v + (foc ? ' ▸' : ''), x + w / 2 - 10, yy, foc ? '#ffd23a' : '#d8d0c0', { align: 'right', scale: o.optScale || 1, shadow: '#000' });
      } else E.font.text(g, label, x, yy - (sc > 1 ? 2 : 0), col, { align: 'center', scale: sc, shadow: '#000' });
      if (foc) { const bx = x - w / 2 - 9, by = yy + (sc > 1 ? 4 : 2), spin = this.t * 6; px.disc(g, bx, by, 4, '#9a1a22'); px.disc(g, bx - 1, by - 1, 3, '#d83a3a'); px.line(g, bx + Math.cos(spin) * 3, by - 3, bx - Math.cos(spin) * 3, by + 3, '#f4e8c8'); }
      if (it.note && foc) E.font.text(g, it.note, x, y + this.items.length * lh + 2, '#c8c0e0', { align: 'center', shadow: '#000' });
    });
  }
}
const opt = (label, options, value, onChange, o = {}) => Object.assign({ label, options, k: Math.max(0, options.indexOf(value)), onChange }, o);
// a translucent panel with a gold rule
function panel(g, x, y, w, h, o = {}) { px.blend(g, o.alpha || .78, 'normal', () => px.rect(g, x, y, w, h, o.bg || '#0e0c1c')); px.rect(g, x, y, w, 1, o.rule || '#ffd23a'); px.rect(g, x, y + h - 1, w, 1, '#3a3450'); }
function bigTitle(g, text, x, y, o = {}) { E.font.title(g, text, x, y, Object.assign({ scale: 3, align: 'center', colors: ['#fff4c8', '#ffd23a', '#e8803a'], outline: '#2a1a0a', depth: 2, depthColor: '#5a2a1a' }, o)); }
function footer(g, r, items) { const y = r.H - 9; panel(g, 0, r.H - 18, r.W, 18, { alpha: .6, rule: '#3a3450' }); prompts(g, game.input, items, r.W / 2, y, { align: 'center' }); }
function wrapText(s, w) { return E.font.wrap(s, w); }
// is this a touch-only device (no fine pointer, a touch screen, no key or pad seen)?
const TOUCH = { gate: false, seenKey: false };
function touchOnly() {
  if (TOUCH.forced !== undefined) return TOUCH.forced && !TOUCH.seenKey;
  if (HEADLESS || typeof matchMedia === 'undefined') return false;
  try { return !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0 && !TOUCH.seenKey; } catch (e) { return false; }
}
