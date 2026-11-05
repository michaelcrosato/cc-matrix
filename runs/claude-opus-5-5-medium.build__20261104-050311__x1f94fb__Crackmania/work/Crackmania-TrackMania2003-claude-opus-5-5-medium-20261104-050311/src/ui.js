// The 10-foot UI kit: focusable items with spatial navigation (d-pad, stick, keys), mouse hover = focus and click =
// choose; controller glyphs (PlayStation shapes by default, Xbox letters by setting), keycaps and mouse icons that follow
// the device used last; the prompt bar; panels; medal and coin icons.
const E = globalThis.My3D2dge, px = E.px;
export const FONT = { scale: 2, outline: '#10101a' };
export const COL = { bg: '#0d1020', panel: '#16203a', panel2: '#24305a', text: '#f4f0e0', dim: '#9aa0b8', gold: '#ffd23a', red: '#ff5a4a', blue: '#5ab0ff', green: '#5ae07a', accent: '#ff9a2a' };
export const MEDAL_COL = ['#606070', '#c87a3a', '#c8d0d8', '#ffd23a', '#3ae8a0'];
export const MEDAL_LETTER = ['-', 'B', 'S', 'G', 'A'];

export function text(g, s, x, y, col = COL.text, o = {}) { E.font.text(g, String(s), Math.round(x), Math.round(y), col, Object.assign({ scale: 2, outline: '#10101a' }, o)); }
export function tw(s, o = {}) { return E.font.width(String(s), Object.assign({ scale: 2 }, o)); }
export function panel(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: [COL.panel2, COL.panel], border: o.accent || '#5a6a9a', alpha: o.alpha ?? .92 }, o)); }

// ---- glyphs ----
const PS = { 0: ['x', '#7ab4ff'], 1: ['o', '#ff6a6a'], 2: ['s', '#ff8ad8'], 3: ['t', '#5ae0a0'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#ff5a4a'], 2: ['X', '#4a8aff'], 3: ['Y', '#ffd23a'] };
const SHOULDER = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['CREATE', 'VIEW'], 9: ['OPTIONS', 'MENU'], 10: ['L3', 'LS'], 11: ['R3', 'RS'], 12: ['D-UP', 'D-UP'], 13: ['D-DOWN', 'D-DOWN'], 14: ['D-LEFT', 'D-LEFT'], 15: ['D-RIGHT', 'D-RIGHT'] };
const KEYNAME = { Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Delete: 'DEL', Tab: 'TAB', ShiftLeft: 'SHIFT', PageUp: 'PGUP', PageDown: 'PGDN', Home: 'HOME', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.' };
/** the code to show for an action on a device: a pad button, a key, or a mouse button */
export function codeFor(input, action, device = input.lastDevice) {
  const m = input.map[action] || []; const pads = m.filter(c => /^Pad\d+$/.test(c)), keys = m.filter(c => /^(Key|Digit|Arrow|Space|Enter|Escape|Backspace|Delete|Tab|Shift|Page|Home|Minus|Equal|Bracket|Comma|Period)/.test(c)), mouse = m.filter(c => /^Mouse/.test(c));
  if (device === 'gamepad' && pads.length) return pads[0];
  if (device === 'mouse' && mouse.length) return mouse[0];
  return keys[0] || pads[0] || mouse[0] || '';
}
/** draw a glyph for a code at (x, y) (top-left), returns its width */
export function glyph(g, code, x, y, o = {}) {
  const style = o.style || 'playstation', h = 14;
  x = Math.round(x); y = Math.round(y);
  let m;
  if ((m = /^Pad(\d+)$/.exec(code))) {
    const n = +m[1];
    if (n <= 3) {
      const cx = x + 7, cy = y + 7;
      px.disc(g, cx, cy, 7, '#10101a'); px.disc(g, cx, cy, 6, '#2a2a3a');
      if (style === 'xbox') { const [L, c] = XB[n]; px.disc(g, cx, cy, 6, c); E.font.text(g, L, cx - 2, cy - 3, '#10101a', { outline: false }); }
      else {
        const [sh, c] = PS[n];
        if (sh === 'x') { px.line(g, cx - 3, cy - 3, cx + 3, cy + 3, c, 2); px.line(g, cx - 3, cy + 3, cx + 3, cy - 3, c, 2); }
        else if (sh === 'o') { px.disc(g, cx, cy, 4, c); px.disc(g, cx, cy, 2, '#2a2a3a'); }
        else if (sh === 's') { px.rect(g, cx - 3, cy - 3, 7, 7, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#2a2a3a'); }
        else { px.line(g, cx, cy - 4, cx - 4, cy + 3, c, 2); px.line(g, cx, cy - 4, cx + 4, cy + 3, c, 2); px.line(g, cx - 4, cy + 3, cx + 4, cy + 3, c, 2); }
      }
      return 15;
    }
    const lab = (SHOULDER[n] || ['?', '?'])[style === 'xbox' ? 1 : 0];
    if (n >= 12 && n <= 15) {   // a d-pad with the direction lit
      const cx = x + 7, cy = y + 7; px.rect(g, cx - 2, cy - 7, 5, 15, '#2a2a3a'); px.rect(g, cx - 7, cy - 2, 15, 5, '#2a2a3a');
      const d = [[0, -5], [0, 5], [-5, 0], [5, 0]][n - 12]; px.rect(g, cx + d[0] - 2, cy + d[1] - 2, 5, 5, '#f4f0e0'); return 16;
    }
    const w = E.font.width(lab, {}) + 8; px.rect(g, x, y + 1, w, h - 2, '#10101a'); px.rect(g, x + 1, y + 2, w - 2, h - 4, '#3a3a50'); E.font.text(g, lab, x + 4, y + 4, '#f4f0e0', { outline: false }); return w + 1;
  }
  if ((m = /^Mouse(\d)$/.exec(code))) {
    const b = +m[1]; px.rect(g, x + 1, y, 10, 14, '#10101a'); px.rect(g, x + 2, y + 1, 8, 12, '#d8d8e0'); px.rect(g, x + 2, y + 6, 8, 1, '#10101a'); px.rect(g, x + 6, y + 1, 1, 5, '#10101a');
    if (b === 0) px.rect(g, x + 2, y + 1, 4, 5, '#ff9a2a'); else if (b === 2) px.rect(g, x + 7, y + 1, 3, 5, '#ff9a2a'); else px.rect(g, x + 5, y + 2, 2, 3, '#ff9a2a');
    return 13;
  }
  if (code === 'Wheel') { px.rect(g, x + 1, y, 10, 14, '#10101a'); px.rect(g, x + 2, y + 1, 8, 12, '#d8d8e0'); px.rect(g, x + 5, y + 2, 2, 4, '#ff9a2a'); return 13; }
  const lab = KEYNAME[code] || (code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code);
  const w = Math.max(14, E.font.width(lab, {}) + 8);
  px.rect(g, x, y, w, h, '#10101a'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#e8e4d8'); px.rect(g, x + 1, y + h - 3, w - 2, 2, '#9a968a');
  E.font.text(g, lab, x + Math.round((w - E.font.width(lab, {})) / 2), y + 3, '#10101a', { outline: false });
  return w + 1;
}
/** a glyph's width without drawing it */
export function glyphW(code) {
  const m = /^Pad(\d+)$/.exec(code);
  if (m) { const n = +m[1]; if (n <= 3) return 15; if (n >= 12 && n <= 15) return 16; const lab = (SHOULDER[n] || ['?'])[0]; return E.font.width(lab, {}) + 9; }
  if (/^Mouse|^Wheel/.test(code)) return 13;
  const lab = KEYNAME[code] || (code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code);
  return Math.max(14, E.font.width(lab, {}) + 8) + 1;
}
/** a prompt bar: [[action or code, LABEL], ...] along the bottom */
export function promptBar(g, game, items, o = {}) {
  const I = game.input, style = game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation', W = game.W, H = game.H;
  const parts = items.filter(Boolean).map(([a, label]) => { const code = /^(Pad|Key|Mouse|Arrow|Enter|Space|Escape|Wheel|Delete|Backspace)/.test(a) ? a : codeFor(I, a); return { code, label }; });
  const pw = p => glyphW(p.code) + 3 + tw(p.label, { scale: 1 });
  let gap = 12, total = 0; for (const p of parts) total += pw(p) + gap;
  if (total > W - 8) { gap = 5; total = 0; for (const p of parts) total += pw(p) + gap; }
  while (total > W - 8 && parts.length > 2) { const q = parts.splice(parts.length - 2, 1)[0]; total -= pw(q) + gap; }
  const y = o.y ?? H - 22; let x = o.x ?? Math.round((W - total) / 2);
  if (!o.noBg) px.blend(g, .55, 'normal', () => px.rect(g, 0, y - 5, W, 26, '#05060c'));
  for (const p of parts) { if (!p.code) continue; const w = glyph(g, p.code, x, y, { style }); x += w + 3; E.font.text(g, p.label, x, y + 4, COL.text, { outline: '#10101a' }); x += tw(p.label, { scale: 1 }) + gap; }
}

// ---- a focusable screen ----
/** items: [{ id, x, y, w, h, label, sub, on(), disabled, draw(g, it, focused) }]; spatial navigation between them */
export class Focus {
  constructor(game) { this.game = game; this.items = []; this.i = 0; this.lastPtr = null; this.scale = 1; this.pulse = 0; this.moved = false; }
  set(items, keep = true) { const id = keep && this.items[this.i] && this.items[this.i].id; this.items = items; const j = id ? items.findIndex(t => t.id === id) : -1; this.i = j >= 0 ? j : Math.min(this.i, Math.max(0, items.length - 1)); if (!keep) this.i = Math.max(0, items.findIndex(t => !t.disabled)); }
  get cur() { return this.items[this.i]; }
  focus(id) { const j = this.items.findIndex(t => t.id === id); if (j >= 0) this.i = j; }
  /** one step: returns the item chosen this step (or null) */
  update(dt, o = {}) {
    const I = this.game.input; this.pulse += dt; this.moved = false;
    if (!this.items.length) return null;
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) if (!(o.noLR && dx) && I.repeat(a, .35, .12)) this.nav(dx, dy);
    // the mouse: hover moves the focus, a click chooses
    const p = I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { const j = this.hit(p); if (j >= 0 && j !== this.i) { this.i = j; this.moved = true; } }
    this.lastPtr = p ? p.slice() : null;
    const c = I.clicked();
    if (c) { const j = this.hit(c); if (j >= 0) { this.i = j; const it = this.items[j]; if (!it.disabled || it.always) return this.fire(it); } }
    if (I.pressed('confirm')) { const it = this.cur; if (it && (!it.disabled || it.always)) return this.fire(it); if (it && it.disabled && o.onDenied) o.onDenied(it); }
    return null;
  }
  fire(it) { if (it.on) it.on(it); return it; }
  hit(p) { for (let j = this.items.length - 1; j >= 0; j--) { const t = this.items[j]; if (p[0] >= t.x && p[0] < t.x + t.w && p[1] >= t.y && p[1] < t.y + t.h) return j; } return -1; }
  nav(dx, dy) {
    const a = this.cur; if (!a) return;
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2; let best = -1, bs = 1e9;
    this.items.forEach((t, j) => {
      if (j === this.i || t.skip) return;
      const tx = t.x + t.w / 2, ty = t.y + t.h / 2, ddx = tx - ax, ddy = ty - ay, along = ddx * dx + ddy * dy;
      if (along <= 2) return;
      const across = Math.abs(ddx * dy) + Math.abs(ddy * dx), s = along + across * 2.2;
      if (s < bs) { bs = s; best = j; }
    });
    if (best >= 0) { this.i = best; this.moved = true; }
    else if (this.wrap) { /* stay */ }
  }
  /** draw every item: tiles with a focus border that pulses */
  draw(g, o = {}) {
    this.items.forEach((t, j) => {
      const f = j === this.i;
      if (t.draw) { t.draw(g, t, f); return; }
      tile(g, t, f, this.pulse, o);
    });
  }
}
export function tile(g, t, f, pulse = 0, o = {}) {
  const grow = f ? 2 : 0, x = t.x - grow, y = t.y - grow, w = t.w + grow * 2, h = t.h + grow * 2, acc = o.accent || COL.accent;
  if (f) px.blend(g, .35 + Math.sin(pulse * 6) * .15, 'add', () => px.rect(g, x - 3, y - 3, w + 6, h + 6, acc));
  panel(g, x, y, w, h, { accent: f ? '#ffffff' : t.disabled ? '#3a3a50' : '#5a6a9a', bg: t.bg || (f ? ['#34447a', '#1c2648'] : ['#22304e', '#141c34']) });
  const col = t.disabled ? '#6a6a80' : f ? '#ffffff' : COL.text;
  if (t.icon) t.icon(g, x + 8, y + Math.round(h / 2) - 8, f);
  const lx = t.icon ? x + 30 : x + Math.round((w - tw(t.label || '')) / 2);
  text(g, t.label || '', t.icon ? lx : lx, y + (t.sub ? Math.round(h / 2) - 13 : Math.round(h / 2) - 7), col);
  if (t.sub) E.font.text(g, t.sub, t.icon ? lx : x + Math.round((w - E.font.width(t.sub, {})) / 2), y + Math.round(h / 2) + 5, t.disabled ? '#5a5a70' : COL.dim, { outline: '#10101a' });
  if (t.lock) lockIcon(g, x + w - 18, y + 4);
  if (t.medal !== undefined && t.medal > 0) medalIcon(g, x + w - 20, y + h - 20, t.medal);
}
export function lockIcon(g, x, y) { px.rect(g, x + 2, y, 8, 7, '#10101a'); px.rect(g, x + 3, y + 1, 6, 6, '#c8c8d0'); px.rect(g, x + 5, y + 2, 2, 5, '#10101a'); px.rect(g, x, y + 6, 12, 9, '#10101a'); px.rect(g, x + 1, y + 7, 10, 7, '#ffd23a'); px.rect(g, x + 5, y + 9, 2, 3, '#7a5a10'); }
export function medalIcon(g, x, y, m, s = 1) {
  const c = MEDAL_COL[m] || '#606070', r = 8 * s;
  px.rect(g, x + r - 5 * s, y - 2 * s, 4 * s, 6 * s, '#e8402a'); px.rect(g, x + r + 1 * s, y - 2 * s, 4 * s, 6 * s, '#2a7ae8');
  px.disc(g, x + r, y + r, r + 1, '#10101a'); px.disc(g, x + r, y + r, r, c); px.disc(g, x + r - 2 * s, y + r - 2 * s, Math.max(1, 2 * s), '#ffffff');
  E.font.text(g, MEDAL_LETTER[m] || '-', x + r - 2 * s, y + r - 3 * s, '#10101a', { scale: s });
}
export function coinIcon(g, x, y) { px.disc(g, x + 6, y + 6, 6, '#10101a'); px.disc(g, x + 6, y + 6, 5, '#d8803a'); px.disc(g, x + 6, y + 6, 3, '#f0a050'); px.rect(g, x + 5, y + 3, 2, 6, '#9a4a1a'); }
export function flagIcon(g, x, y) { px.rect(g, x, y, 2, 14, '#d8d8e0'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) px.rect(g, x + 2 + i * 3, y + j * 3, 3, 3, (i + j) % 2 ? '#10101a' : '#f8f8f8'); }
export function envIcon(g, env, x, y) {
  if (env === 'dustbowl') { px.rect(g, x + 6, y, 4, 16, '#3a8a3a'); px.rect(g, x + 2, y + 4, 3, 6, '#3a8a3a'); px.rect(g, x + 2, y + 9, 5, 2, '#3a8a3a'); px.rect(g, x + 11, y + 2, 3, 6, '#4a9a4a'); px.rect(g, x + 9, y + 7, 5, 2, '#4a9a4a'); }
  else if (env === 'hedgerow') { px.disc(g, x + 8, y + 8, 7, '#4aa03a'); px.disc(g, x + 8, y + 8, 4, '#8ad86a'); px.rect(g, x + 7, y + 3, 2, 10, '#2a6a1a'); }
  else { for (let a = 0; a < 6; a++) { const ca = Math.cos(a * Math.PI / 3), sa = Math.sin(a * Math.PI / 3); px.line(g, x + 8, y + 8, x + 8 + Math.round(ca * 7), y + 8 + Math.round(sa * 7), '#c8f0ff', 2); } px.disc(g, x + 8, y + 8, 2, '#ffffff'); }
}
/** big outlined text (timer, countdown) */
export function big(g, s, x, y, col, scale = 3, align = 'center') { E.font.text(g, String(s), Math.round(x), Math.round(y), col, { scale, outline: '#10101a', shadow: '#000000', align }); }
/** a letter wheel to rename (players, tracks): returns { done, value } */
export class LetterWheel {
  constructor(game, value = '', max = 14) { this.game = game; this.chars = (value || 'A').toUpperCase().split(''); this.max = max; this.i = Math.max(0, this.chars.length - 1); this.done = false; this.cancel = false; }
  static SET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!?.';
  update() {
    const I = this.game.input, S = LetterWheel.SET; let c = this.chars[this.i] || ' ', k = S.indexOf(c); if (k < 0) k = 0;
    if (I.repeat('up', .3, .07)) this.chars[this.i] = S[(k + 1) % S.length];
    if (I.repeat('down', .3, .07)) this.chars[this.i] = S[(k - 1 + S.length) % S.length];
    if (I.repeat('right', .3, .12)) { if (this.i < this.max - 1) { this.i++; if (this.chars.length <= this.i) this.chars.push(' '); } }
    if (I.repeat('left', .3, .12)) this.i = Math.max(0, this.i - 1);
    if (I.pressed('confirm')) this.done = true;
    if (I.pressed('cancel')) { this.cancel = true; this.done = true; }
    // typing works too
    for (const ch of this.game._typed || []) { if (ch === '\b') { this.chars.splice(this.i, 1); this.i = Math.max(0, this.i - 1); if (!this.chars.length) this.chars = [' ']; } else if (S.includes(ch.toUpperCase()) && this.chars.length <= this.max) { this.chars[this.i] = ch.toUpperCase(); if (this.i < this.max - 1) { this.i++; if (this.chars.length <= this.i) this.chars.push(' '); } } }
  }
  get value() { return this.chars.join('').trim() || 'PLAYER'; }
  draw(g, x, y) {
    const cw = 18; this.chars.forEach((c, j) => { const f = j === this.i; px.rect(g, x + j * cw, y, cw - 2, 24, f ? '#ffd23a' : '#24305a'); text(g, c, x + j * cw + 3, y + 5, f ? '#10101a' : '#f4f0e0'); if (f) { E.font.text(g, '↑', x + j * cw + 5, y - 10, '#ffd23a', {}); E.font.text(g, '↓', x + j * cw + 5, y + 27, '#ffd23a', {}); } });
  }
}
