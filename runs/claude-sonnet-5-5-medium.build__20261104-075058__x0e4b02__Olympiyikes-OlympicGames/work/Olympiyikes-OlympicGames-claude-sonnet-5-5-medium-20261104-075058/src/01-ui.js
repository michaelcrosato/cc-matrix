// Olympiyikes! UI: text helpers, button glyph prompts, 10-foot menu, panels, banners.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, C = O.C;

// ---------------------------------------------------------------- text
// T(g, str, x, y, color, { s: scale, align, shadow, outline })
O.T = (g, str, x, y, col = '#fff', o = {}) => E.font.text(g, String(str), Math.round(x), Math.round(y), col, { scale: o.s || 2, align: o.align || 'left', shadow: o.shadow === undefined ? '#000' : o.shadow, outline: o.outline || false, wrap: o.wrap, gradient: o.gradient });
O.TW = (str, s = 2) => E.font.width(String(str), { scale: s });
O.title = (g, str, x, y, scale = 4) => E.font.title(g, str, Math.round(x), Math.round(y), { scale, align: 'center', colors: ['#fff6c8', '#ffd36a', '#f2842a'], outline: '#9a1d1d', depth: 3, depthColor: '#5a0f0f' });
O.wrap = (str, w, s = 1) => E.font.wrap(String(str), w, { scale: s });

// ---------------------------------------------------------------- button glyph prompts (icons, never plain text)
const PS = { 0: ['x', '#7fb2ff'], 1: ['o', '#ff6b6b'], 2: ['s', '#ff8fd8'], 3: ['t', '#4fe0a8'] };
const XB = { 0: ['A', '#5bc236'], 1: ['B', '#e8443a'], 2: ['X', '#3a7cf0'], 3: ['Y', '#f2c21b'] };
function codeFor(pi, action) {
  const m = (pi.map && pi.map[action]) || O.KEYS[action] || [];
  const dev = pi.lastDevice || 'keyboard';
  if (dev === 'gamepad') { const c = m.find(c => /^Pad\d+$/.test(c)); if (c) return c; }
  if (dev === 'mouse') { const c = m.find(c => /^Mouse/.test(c)); if (c) return c; }
  return m.find(c => !/^Pad|^Mouse/.test(c)) || m[0] || 'Space';
}
function disc(g, cx, cy, rad, fill, rim) { px.disc(g, cx, cy, rad, rim); px.disc(g, cx, cy, rad - 1, fill); }
function drawSymbol(g, cx, cy, k, col, sz) {
  const a = sz;   // half extent
  if (k === 'x') { px.line(g, cx - a, cy - a, cx + a, cy + a, col, 1); px.line(g, cx - a, cy + a, cx + a, cy - a, col, 1); if (sz > 3) { px.line(g, cx - a + 1, cy - a, cx + a, cy + a - 1, col, 1); px.line(g, cx - a, cy + a - 1, cx + a - 1, cy - a, col, 1); } }
  else if (k === 'o') { px.disc(g, cx, cy, a + 1, col); px.disc(g, cx, cy, Math.max(1, a - 1), '#1c2342'); }
  else if (k === 's') { px.rect(g, cx - a, cy - a, a * 2 + 1, a * 2 + 1, col); px.rect(g, cx - a + 1, cy - a + 1, a * 2 - 1, a * 2 - 1, '#1c2342'); }
  else if (k === 't') { px.line(g, cx, cy - a, cx - a, cy + a - 1, col, 1); px.line(g, cx, cy - a, cx + a, cy + a - 1, col, 1); px.line(g, cx - a, cy + a - 1, cx + a, cy + a - 1, col, 1); }
}
// draws one prompt icon, returns its width. size 1 = 9px, 2 = 17px
function icon(g, x, y, code, label, size, pi) {
  const sc = size === 2 ? 2 : 1, h = 9 * sc, style = (game.input.padStyle ? game.input.padStyle() : 'playstation');
  const m = /^Pad(\d+)$/.exec(code);
  if (m) {
    const n = +m[1], cx = x + h / 2, cy = y + h / 2;
    if (n <= 3) {
      if (style === 'xbox' || style === 'nintendo' || style === 'generic') { const [l, c] = XB[n]; disc(g, cx, cy, h / 2, '#1c2342', c); E.font.text(g, l, cx, cy - 3 * sc, c, { align: 'center', scale: sc, shadow: false }); }
      else { const [k, c] = PS[n]; disc(g, cx, cy, h / 2, '#1c2342', '#cfd6ff'); drawSymbol(g, cx, cy, k, c, 2 * sc); }
      return h;
    }
    if (n >= 12 && n <= 15) { px.rect(g, x + 3 * sc, y, 3 * sc, h, '#cfd6ff'); px.rect(g, x, y + 3 * sc, h, 3 * sc, '#cfd6ff'); const d = [[3, 0], [3, 6], [0, 3], [6, 3]][n - 12]; px.rect(g, x + d[0] * sc, y + d[1] * sc, 3 * sc, 3 * sc, '#ffd36a'); return h; }
    const tx = n === 9 ? (style === 'xbox' ? 'Menu' : 'Options') : n === 8 ? (style === 'xbox' ? 'View' : 'Create') : (style === 'xbox' ? ['LB', 'RB', 'LT', 'RT'][n - 4] : ['L1', 'R1', 'L2', 'R2'][n - 4]);
    const w = E.font.width(tx, { scale: sc }) + 6 * sc; px.rect(g, x, y + sc, w, h - 2 * sc, '#cfd6ff'); px.rect(g, x + sc, y + 2 * sc, w - 2 * sc, h - 4 * sc, '#1c2342');
    E.font.text(g, tx, x + w / 2, y + 1 + 1.5 * sc, '#fff', { align: 'center', scale: sc, shadow: false }); return w;
  }
  if (/^Mouse/.test(code)) {
    px.rect(g, x + 1, y, 7 * sc, h, '#cfd6ff'); px.rect(g, x + 2, y + 1, 7 * sc - 2, h - 2, '#1c2342');
    px.rect(g, code === 'Mouse2' ? x + 1 + 3 * sc : x + 2, y + 1, 3 * sc, 4 * sc, '#ffd36a'); return 8 * sc + 1;
  }
  const t = label.length > 1 ? label : label.toUpperCase(), w = Math.max(h, E.font.width(t, { scale: sc }) + 6 * sc);
  px.rect(g, x, y + 1, w, h, '#2b3358'); px.rect(g, x, y, w, h - 1, '#e9ecff'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#3a4372');
  E.font.text(g, t, x + w / 2, y + (size === 2 ? 3 : 1), '#fff', { align: 'center', scale: sc, shadow: false }); return w;
}
O.Prompt = {
  // draws the prompt for `action` for player pi (index or input), optional text label to the right; returns width
  draw(g, x, y, action, o = {}) {
    const pi = typeof o.pi === 'number' ? O.pi(o.pi) : (o.pi || game.input), code = codeFor(pi, action);
    const lab = pi.codeLabel ? pi.codeLabel(code) : code;
    const sz = o.size || 1, w = icon(g, x, y, code, lab, sz, pi);
    let tw = 0;
    if (o.label) { O.T(g, o.label, x + w + 3, y + (sz === 2 ? 3 : 1), o.color || '#fff', { s: sz }); tw = O.TW(o.label, sz) + 3; }
    return w + tw;
  },
  width(action, o = {}) { const pi = typeof o.pi === 'number' ? O.pi(o.pi) : (o.pi || game.input); const code = codeFor(pi, action), lab = pi.codeLabel ? pi.codeLabel(code) : code; const sc = (o.size || 1) === 2 ? 2 : 1;
    let w = /^Pad[4-9]$/.test(code) ? 24 * sc : /^Pad/.test(code) ? 9 * sc : /^Mouse/.test(code) ? 8 * sc : Math.max(9 * sc, E.font.width(lab.length > 1 ? lab : lab.toUpperCase(), { scale: sc }) + 6 * sc);
    return w + (o.label ? O.TW(o.label, o.size || 1) + 3 : 0); },
  // a mash pair; alternates highlight with time
  pair(g, x, y, a, b, o = {}) { const w1 = O.Prompt.draw(g, x, y, a, o); const on = (Math.floor(game.real * 5) & 1); px.rect(g, x + w1 + 3, y + 3, 5, 2, on ? '#ffd36a' : '#555b80'); const w2 = O.Prompt.draw(g, x + w1 + 11, y, b, o); return w1 + 11 + w2; }
};
// a row of prompts [[action | [actions], label], ...] centered at the bottom (the prompt strip)
const multiW = (a, pi, o) => Array.isArray(a) ? a.reduce((t, x) => t + O.Prompt.width(x, Object.assign({}, o, { pi, label: undefined })) + 2, 0) : O.Prompt.width(a, Object.assign({}, o, { pi, label: undefined }));
const multiDraw = (g, x, y, a, pi, o) => { if (!Array.isArray(a)) return O.Prompt.draw(g, x, y, a, Object.assign({}, o, { pi })); let w = 0; for (const k of a) w += O.Prompt.draw(g, x + w, y, k, Object.assign({}, o, { pi })) + 2; return w; };
O.strip = (g, r, items, pi, y) => {
  let tot = 0; const ws = items.map(([a, l]) => { const w = multiW(a, pi, { size: 1 }) + O.TW(l, 1) + 3 + 12; tot += w; return w; });
  let x = Math.round((r.W - tot) / 2); y = y === undefined ? r.H - 20 : y;
  px.rect(g, 0, y - 4, r.W, 18, 'rgba(8,10,28,.75)');
  items.forEach(([a, l], i) => { const w = multiDraw(g, x, y, a, pi, { size: 1 }); O.T(g, l, x + w + 3, y + 1, '#dfe6ff', { s: 1 }); x += ws[i]; });
};

// ---------------------------------------------------------------- panels and focus
O.panel = (g, x, y, w, h, o = {}) => { E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1c2760', '#0e1438'], border: o.border || '#f2b632', alpha: o.alpha === undefined ? .94 : o.alpha }); };
O.focusBar = (g, x, y, w, h) => {
  const p = .5 + .5 * Math.sin(game.real * 7);
  px.rect(g, x, y, w, h, '#f2b632'); px.rect(g, x + 1, y + 1, w - 2, h - 2, p > .5 ? '#274199' : '#2d4aa8');
  px.rect(g, x, y, 2, h, '#fff1a8');
};
O.banner = (g, r, txt, y, col = '#ffe27a', s = 3, a = 1) => {
  const w = O.TW(txt, s) + 20; px.rect(g, r.W / 2 - w / 2, y - 3, w, s * 7 + 8, 'rgba(10,12,40,' + (.85 * a) + ')');
  px.rect(g, r.W / 2 - w / 2, y - 3, w, 2, '#f2b632'); px.rect(g, r.W / 2 - w / 2, y + s * 7 + 3, w, 2, '#f2b632');
  O.T(g, txt, r.W / 2, y + 1, col, { s, align: 'center' });
};

// ---------------------------------------------------------------- 10-foot vertical menu (stick, d-pad, keys, mouse hover/click)
O.Menu10 = class {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this.picked = null; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, items.length - 1); }
  update() {
    if (O.locked()) return null;
    const n = this.items.length; let mv = 0, pick = false, back = false;
    for (const p of game.players) {
      if (p.repeat('up', .35, .1)) mv = -1; else if (p.repeat('down', .35, .1)) mv = 1;
      if (p.pressed('confirm')) pick = true; if (p.pressed('cancel')) back = true;
    }
    if (mv) { this.i = (this.i + mv + n) % n; while (this.items[this.i].disabled) this.i = (this.i + mv + n) % n; game.audio.sfx('select'); if (this.o.onMove) this.o.onMove(this.i); }
    if (O.pointerMoved) { const p = O.lastPointer; for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (p && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3] && !this.items[k].disabled && this.i !== k) { this.i = k; game.audio.sfx('select'); if (this.o.onMove) this.o.onMove(k); } } }
    const c = game.input.clicked();
    if (c) for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3] && !this.items[k].disabled) { this.i = k; pick = true; } }
    if (pick && !this.items[this.i].disabled) { game.audio.sfx('confirm'); this.picked = this.i; if (this.o.onPick) this.o.onPick(this.i, this.items[this.i]); return this.i; }
    if (back && this.o.onBack) { game.audio.sfx('cancel'); this.o.onBack(); return -1; }
    return null;
  }
  draw(g, x, y, w, o = {}) {
    const lh = o.lh || 22, s = o.s || 2; this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * lh, sel = k === this.i; this.rects.push([x, yy, w, lh - 2]);
      if (sel) { O.focusBar(g, x, yy, w, lh - 2); O.T(g, '▸', x + 4 + Math.round(Math.sin(game.real * 9) * 1.5), yy + (lh - 2 - s * 7) / 2, '#ffe27a', { s }); }
      O.T(g, it.label, x + 18, yy + (lh - 2 - s * 7) / 2, it.disabled ? '#777ca0' : sel ? '#fff' : '#cfd8ff', { s });
      if (it.value !== undefined) O.T(g, it.value, x + w - 6, yy + (lh - 2 - s * 7) / 2, '#ffe27a', { s, align: 'right' });
    });
  }
};

// ---------------------------------------------------------------- small art helpers shared by UI
O.stars = (g, r, n = 40, seed = 7) => { const rn = E.rng(seed); for (let i = 0; i < n; i++) { const x = rn() * r.W, y = rn() * r.H * .6; const tw = (Math.sin(game.real * 3 + i) + 1) / 2; px.rect(g, x, y, 1, 1, tw > .5 ? '#fff' : '#8aa0ff'); } };
O.sky = (r, a, b, c) => r.sky([a, b, c || b]);
// big stamped "YIKES" and result words
O.stamp = (g, r, txt, t, col = '#ff4a3a') => {
  const k = Math.min(1, t / .25), s = t < .25 ? 6 - 3 * k : 3, a = Math.max(0, Math.min(1, (1.6 - t) / .5));
  if (a <= 0) return; const w = O.TW(txt, Math.round(s)) + 24;
  px.rect(g, r.W / 2 - w / 2, r.H * .3, w, Math.round(s) * 7 + 14, 'rgba(30,5,5,' + (.8 * a) + ')');
  E.font.text(g, txt, r.W / 2, r.H * .3 + 7, col, { align: 'center', scale: Math.round(s), shadow: '#000', outline: '#fff' });
};
})();
