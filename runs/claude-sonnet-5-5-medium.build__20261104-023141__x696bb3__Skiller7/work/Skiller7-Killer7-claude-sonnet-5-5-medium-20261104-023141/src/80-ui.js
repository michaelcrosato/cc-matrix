// UI kit: glyph prompts that follow the last device, panels, focus lists (pad, keys and mouse), text helpers.
const UI = S7.ui = { stack: [], game: null, hover: null, click: null, nav: { dx: 0, dy: 0, ok: false, back: false, tabL: false, tabR: false, ptr: null, clk: null, moved: false } };
const col = { red: '#d81e2a', ink: '#0c0a12', paper: '#f4f0e8', dim: '#8a8498', gold: '#f5b700', ice: '#bfe8ff', panel: '#14101c', line: '#e8e4f0' };
UI.col = col;
const F = () => S7.E.font;

UI.text = (g, s, x, y, color = col.paper, o = {}) => F().text(g, String(s), x, y, color, Object.assign({ shadow: '#000' }, o));
UI.w = (s, o) => F().width(String(s), o);
UI.panel = (g, x, y, w, h, o = {}) => {
  g.save && g.save(); g.globalAlpha = o.alpha === undefined ? .86 : o.alpha; g.fillStyle = o.fill || col.panel; g.fillRect(x, y, w, h); g.globalAlpha = 1;
  g.fillStyle = o.border || col.line; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  if (o.accent) { g.fillStyle = o.accent; g.fillRect(x, y, 3, h); }
  g.restore && g.restore();
};
UI.bar = (g, x, y, w, h, frac, color, back = '#201820') => { g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = back; g.fillRect(x, y, w, h); g.fillStyle = color; g.fillRect(x, y, Math.max(0, Math.round(w * S7.clamp(frac, 0, 1))), h); };
UI.wrap = (s, w, o) => F().wrap(String(s), w, o);

// ---- glyphs: what the player's own device calls the button
UI.label = action => { const g = UI.game; return g ? g.input.label(action) : ''; };
const SHORT = { 'Left click': 'LMB', 'Right click': 'RMB', 'Middle click': 'MMB', Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER', Backspace: 'BKSP', 'L stick ↑': 'L↑' };
UI.glyphW = lab => {
  if (['✕', '○', '□', '△'].includes(lab)) return 11;
  return Math.max(11, UI.w((SHORT[lab] || lab).toUpperCase()) + 6);
};
UI.glyph = (g, action, x, y) => {   // x,y = top-left; returns width
  const I = UI.game.input, lab = I.label(action) || '?', style = I.padStyle ? I.padStyle() : 'xbox', pad = I.lastDevice === 'gamepad', cx = x + 5, cy = y + 5;
  g.save && g.save();
  if (pad && ['✕', '○', '□', '△'].includes(lab)) {
    g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(cx + .5, cy + .5, 5.5, 0, 7); g.fill();
    const c = { '✕': '#7ab8ff', '○': '#ff6a6a', '□': '#ff9ad8', '△': '#6ae0a8' }[lab]; g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 1.4;
    g.beginPath();
    if (lab === '✕') { g.moveTo(cx - 2.4, cy - 2.4); g.lineTo(cx + 3.4, cy + 3.4); g.moveTo(cx + 3.4, cy - 2.4); g.lineTo(cx - 2.4, cy + 3.4); g.stroke(); }
    else if (lab === '○') { g.arc(cx + .5, cy + .5, 2.8, 0, 7); g.stroke(); }
    else if (lab === '□') g.strokeRect(cx - 2, cy - 2, 5, 5);
    else { g.moveTo(cx + .5, cy - 3); g.lineTo(cx + 3.4, cy + 2.4); g.lineTo(cx - 2.4, cy + 2.4); g.closePath(); g.stroke(); }
    g.restore && g.restore(); return 11;
  }
  if (pad && style !== 'playstation' && ['A', 'B', 'X', 'Y'].includes(lab)) {
    const c = { A: '#5ad07a', B: '#ff6a6a', X: '#6aa8ff', Y: '#ffd24a' }[lab]; g.fillStyle = '#0a0a10'; g.beginPath(); g.arc(cx + .5, cy + .5, 5.5, 0, 7); g.fill(); g.fillStyle = c; F().text(g, lab, cx - 2, cy - 3, c, { shadow: false }); g.restore && g.restore(); return 11;
  }
  const t = (SHORT[lab] || lab).toUpperCase(), w = Math.max(11, UI.w(t) + 6);
  g.fillStyle = '#0a0a10'; g.fillRect(x, y, w, 11); g.fillStyle = pad ? '#46465e' : '#d8d4e4'; g.fillRect(x, y, w, 1); g.fillRect(x, y + 10, w, 1); g.fillRect(x, y, 1, 11); g.fillRect(x + w - 1, y, 1, 11);
  F().text(g, t, x + 3, y + 2, pad ? '#e8e8ff' : '#f4f0e8', { shadow: false }); g.restore && g.restore(); return w;
};
UI.prompt = (g, x, y, action, text, o = {}) => {   // glyph + text; returns the width used
  const w = UI.glyph(g, action, x, y); UI.text(g, text, x + w + 3, y + 2, o.color || col.paper, o); return w + 3 + UI.w(text);
};
UI.promptRow = (g, items, x, y, align = 'left') => {   // [[action, text], ...]
  let total = 0; for (const [a, t] of items) total += UI.glyphW(UI.label(a)) + 3 + UI.w(t) + 8;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const [a, t] of items) { cx += UI.prompt(g, cx, y, a, t) + 8; }
};
UI.fmt = s => String(s).replace(/\{(\w+)\}/g, (m, a) => { const l = UI.label(a); return l ? l : m; });
S7.fmt = UI.fmt;

// ---- navigation: one reading of the pad, keys and mouse per step for every menu screen
UI.readNav = function (game) {
  const I = game.input, n = UI.nav; n.dx = 0; n.dy = 0;
  if (I.repeat('up', .35, .1)) n.dy = -1; if (I.repeat('down', .35, .1)) n.dy = 1; if (I.repeat('left', .35, .1)) n.dx = -1; if (I.repeat('right', .35, .1)) n.dx = 1;
  n.ok = I.pressed('confirm') || I.pressed('start'); n.back = I.pressed('cancel') || I.pressed('pause'); n.tabL = I.pressed('scan'); n.tabR = I.pressed('ring');
  const p = I.pointer(); n.moved = !!(p && n.ptr && (p[0] !== n.ptr[0] || p[1] !== n.ptr[1])) && I.lastDevice !== 'gamepad';; n.ptr = p ? p.slice() : null;   // the pointer itself moving is what hover means
  n.clk = I.clicked ? I.clicked() : null;
  return n;
};
// a FocusList: rows with a cursor. items: { label, value(): string, disabled, kind, onPick, onLeft, onRight, sub }
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: 20, y: 40, w: 200, rowH: 13, scale: 1 }, o); this.scroll = 0; }
  rect(i) { const o = this.o; return [o.x, o.y + (i - this.scroll) * o.rowH, o.w, o.rowH]; }
  update(n) {
    const it = this.items, o = this.o; if (!it.length) return;
    const max = o.rows || it.length; if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + max) this.scroll = this.i - max + 1;
    if (n.dy) { let k = this.i, c = 0; do { k = (k + n.dy + it.length) % it.length; c++; } while (it[k].disabled === 'skip' && c < it.length); if (k !== this.i) { this.i = k; S7.audio.sfx('select'); } }
    const cur = it[this.i];
    if (n.dx && cur) { if (n.dx < 0 && cur.onLeft) { cur.onLeft(); S7.audio.sfx('select'); } if (n.dx > 0 && cur.onRight) { cur.onRight(); S7.audio.sfx('select'); } }
    if (n.moved && n.ptr) { for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) { const r = this.rect(k); if (n.ptr[0] >= r[0] && n.ptr[0] < r[0] + r[2] && n.ptr[1] >= r[1] && n.ptr[1] < r[1] + r[3] && k !== this.i && it[k].disabled !== 'skip') { this.i = k; } } }
    if (n.clk) { for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) { const r = this.rect(k); if (n.clk[0] >= r[0] && n.clk[0] < r[0] + r[2] && n.clk[1] >= r[1] && n.clk[1] < r[1] + r[3]) { this.i = k; const c = it[k]; if (c.onPick && !c.disabled) { c.onPick(); S7.audio.sfx('confirm2'); } else if (c.slider) { const f = (n.clk[0] - (r[0] + r[2] - 74)) / 70; if (f >= 0 && f <= 1) c.set(c.min + (c.max - c.min) * f); } } } }
    if (n.ok && cur && cur.onPick && !cur.disabled) { cur.onPick(); S7.audio.sfx('confirm2'); }
    if (n.ok && cur && cur.disabled && cur.disabled !== 'skip') S7.audio.sfx('deny');
  }
  draw(g) {
    const o = this.o, it = this.items, max = o.rows || it.length;
    for (let k = this.scroll; k < Math.min(it.length, this.scroll + max); k++) {
      const c = it[k], r = this.rect(k), sel = k === this.i;
      if (sel) { g.fillStyle = col.red; g.globalAlpha = .9; g.fillRect(r[0] - 2, r[1], r[2] + 4, r[3] - 1); g.globalAlpha = 1; }
      const dis = !!c.disabled; const lab = typeof c.label === 'function' ? c.label() : c.label;
      UI.text(g, lab, r[0] + 3, r[1] + 3, dis ? '#6a647a' : sel ? '#fff' : col.paper, { shadow: sel ? '#000' : '#000' });
      if (c.value) { const v = c.value(); UI.text(g, v, r[0] + r[2] - UI.w(v) - 3, r[1] + 3, sel ? '#fff' : col.gold); }
      if (c.slider) { const fx = r[0] + r[2] - 74, f = (c.get() - c.min) / (c.max - c.min); g.fillStyle = '#000'; g.fillRect(fx, r[1] + 4, 70, 4); g.fillStyle = sel ? '#fff' : col.gold; g.fillRect(fx, r[1] + 5, Math.round(70 * S7.clamp(f, 0, 1)), 2); g.fillRect(fx + Math.round(70 * S7.clamp(f, 0, 1)) - 1, r[1] + 2, 3, 8); }
    }
    if (it.length > max) { UI.text(g, this.scroll > 0 ? '▲' : '', o.x + o.w - 8, o.y - 9, col.dim); UI.text(g, this.scroll + max < it.length ? 'v' : '', o.x + o.w - 8, o.y + max * o.rowH + 1, col.dim); }
  }
}
UI.FocusList = FocusList;

// ---- the screen stack: modal screens freeze the sim
UI.push = s => { UI.stack.push(s); if (s.open) s.open(); S7.st.prevModeModal = S7.st.mode; };
UI.pop = () => { const s = UI.stack.pop(); if (s && s.close) s.close(); };
UI.top = () => UI.stack[UI.stack.length - 1];
UI.updateTop = function (dt, game) { const s = UI.top(); if (!s) return false; const n = UI.readNav(game); s.update(dt, n, game); return true; };
UI.drawStack = function (r) { for (const s of UI.stack) s.draw(r); };
UI.dim = (g, W, H, a = .6) => { g.globalAlpha = a; g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };
