/* THE 10-FOOT UI KIT: button chips that follow the device used last (PlayStation symbols by default, Xbox letters from
 * Settings, keycaps for the keyboard, a mouse icon where the mouse does the job), prompt strips, big focusable buttons
 * navigated by d-pad, stick, keys, mouse hover and clicks, panels, comic bursts and the title logo. Everything is drawn
 * with engine primitives on the pixel buffer. Layouts are computed from game.W and game.H, so menus work headless too. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game;
const PS = { '✕': '#7aa8ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ae0a0' }, XB = { A: '#3ac85a', B: '#e04a3a', X: '#3a7ae0', Y: '#e8c030' };
const PAD_WORDS = ['L1', 'R1', 'L2', 'R2', 'LB', 'RB', 'LT', 'RT', 'Options', 'Menu', 'Create', 'View', 'L3', 'R3', 'LS', 'RS'];
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));

const GL = FF.glyph = {
  /** the device a player's prompts follow: 'gamepad' | 'keyboard' | 'mouse' */
  device(I = game.input) { const d = I.lastDevice; return d === 'touch' ? 'keyboard' : d || 'keyboard'; },
  label(action, I = game.input, dev) {
    dev = dev || GL.device(I);
    if (dev === 'mouse') dev = 'keyboard';
    let l = I.label(action, dev) || action;
    if (dev === 'gamepad' && (game.settings.glyphs === 'xbox')) l = { '✕': 'A', '○': 'B', '□': 'X', '△': 'Y', L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', Options: 'Menu', Create: 'View' }[l] || l;
    if (dev === 'gamepad' && game.settings.glyphs !== 'xbox') l = { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2' }[l] || l;
    return l;
  },
  /** draw a chip for action at x, y (top-left; h = 11 * s); returns its width. o: { input, device, mouse: 'L' | 'R', s } */
  chip(g, x, y, action, o = {}) {
    const I = o.input || game.input, dev = o.device || GL.device(I), s = o.s || 1;
    if (dev === 'mouse' && o.mouse) return GL.mouse(g, x, y, o.mouse, s);
    const l = GL.label(action, I, dev === 'mouse' ? 'keyboard' : dev), h = 11 * s;
    if (dev === 'gamepad' && (PS[l] || XB[l])) {
      const r = Math.round(h / 2), cx = x + r, cy = y + r;
      px.disc(g, cx, cy, r, '#14141c'); px.disc(g, cx, cy, r - 1, PS[l] ? '#2a2a36' : XB[l]);
      if (PS[l]) symbol(g, l, cx, cy, Math.max(2, r - 3), PS[l]);
      else T(g, l, cx, cy - 3 * s, '#ffffff', { align: 'center', scale: s >= 2 ? 1 : 1 });
      return h;
    }
    const word = PAD_WORDS.includes(l) || dev === 'gamepad', w = E.font.width(l, { scale: 1 }) + 6;
    if (word) { E.ui.box(g, x, y + 1, w, h - 2, { bg: '#2a2a36', border: '#8a8aa0', alpha: 1, gradient: false }); T(g, l, x + w / 2, y + 2, '#f4f0e6', { align: 'center' }); return w; }
    // a keycap: light top, darker bottom edge
    const kw = Math.max(h, w);
    px.rect(g, x, y, kw, h, '#c8c4b8'); px.rect(g, x, y + h - 2, kw, 2, '#7a766c'); px.rect(g, x + 1, y + 1, kw - 2, h - 4, '#ece8dc');
    T(g, l, x + kw / 2, y + 2, '#1a1820', { align: 'center' });
    return kw;
  },
  mouse(g, x, y, btn, s = 1) {
    const w = 8 * s, h = 11 * s;
    px.rect(g, x + 1, y, w - 2, h, '#ece8dc'); px.rect(g, x, y + 2, w, h - 4, '#ece8dc'); px.rect(g, x + (btn === 'R' ? w / 2 : 1), y + 1, w / 2 - 1, 4 * s, '#ff8a3a'); px.line(g, x + w / 2, y, x + w / 2, y + 5 * s, '#7a766c');
    return w;
  },
  /** chips and words in a row; returns its width. items: [[action, word, { mouse }]] */
  row(g, x, y, items, o = {}) {
    let cx = x; const parts = [];
    for (const [a, word, mo] of items) { const cw = GL.measure(a, o) ; const tw = E.font.width(word); parts.push([a, word, mo, cw, tw]); }
    const total = parts.reduce((t, p) => t + p[3] + 3 + p[4] + 8, 0) - 8;
    if (o.align === 'right') cx = x - total; else if (o.align === 'center') cx = x - total / 2;
    if (o.panel) E.ui.box(g, cx - 5, y - 3, total + 10, 17, { bg: '#0c0c18', border: '#3a3a52', alpha: .82 });
    for (const [a, word, mo, , tw] of parts) { const w = GL.chip(g, cx, y, a, Object.assign({}, o, mo || {})); cx += w + 3; T(g, word, cx, y + 2, o.color || '#f4f0e6', { shadow: '#000' }); cx += tw + 8; }
    return total;
  },
  measure(a, o = {}) { const I = o.input || game.input, dev = o.device || GL.device(I); if (dev === 'mouse' && o.mouse) return 8; const l = GL.label(a, I, dev === 'mouse' ? 'keyboard' : dev); if (dev === 'gamepad' && (PS[l] || XB[l])) return 11; return Math.max(11, E.font.width(l) + 6); },
  /** the bottom prompt bar of a screen */
  bar(g, items, o = {}) { const W = game.W, H = game.H; GL.row(g, W - 10, H - 18, items, Object.assign({ align: 'right', panel: true }, o)); }
};
function symbol(g, l, cx, cy, r, c) {
  if (l === '✕') { px.line(g, cx - r, cy - r, cx + r, cy + r, c, 2); px.line(g, cx - r, cy + r, cx + r, cy - r, c, 2); }
  else if (l === '○') { px.disc(g, cx, cy, r, c); px.disc(g, cx, cy, Math.max(1, r - 2), '#2a2a36'); }
  else if (l === '□') { px.rect(g, cx - r, cy - r, r * 2, r * 2, c); px.rect(g, cx - r + 2, cy - r + 2, r * 2 - 4, r * 2 - 4, '#2a2a36'); }
  else if (l === '△') { px.poly(g, [[cx, cy - r - 1], [cx + r + 1, cy + r], [cx - r - 1, cy + r]], c); px.poly(g, [[cx, cy - r + 2], [cx + r - 2, cy + r - 1], [cx - r + 2, cy + r - 1]], '#2a2a36'); }
}

/* ---- big focusable buttons and menus (keys, pad, stick, mouse hover and clicks) ---- */
const UI = FF.ui = {
  ACCENT: '#ffb02e', INK: '#f4f0e6', MUTED: '#a9a6c0', PAPER: '#0e1022',
  /** a big 10-foot button */
  button(g, r, label, focus, o = {}) {
    const t = game.real || 0, pulse = focus ? (Math.sin(t * 6) * .5 + .5) : 0;
    const bg = o.disabled ? ['#1a1a24', '#121218'] : focus ? ['#3a2a5a', '#24183a'] : o.bg || ['#22223a', '#14142a'];
    E.ui.box(g, r.x, r.y, r.w, r.h, { bg, border: focus ? E.mix(UI.ACCENT, '#fff6c0', pulse) : '#3a3a5a', alpha: o.alpha || .94 });
    if (focus) { px.rect(g, r.x - 1, r.y - 1, r.w + 2, 1, UI.ACCENT); px.rect(g, r.x - 1, r.y + r.h, r.w + 2, 1, UI.ACCENT); T(g, '▸', r.x + 5 + Math.round(pulse * 2), r.y + r.h / 2 - 7, UI.ACCENT, { scale: 2 }); }
    const sc = o.scale || 2, c = o.disabled ? '#5a5a6a' : focus ? '#ffffff' : UI.INK;
    const tx = o.align === 'left' ? r.x + (focus ? 20 : 14) : r.x + r.w / 2;
    T(g, label, tx, r.y + (o.sub ? 4 : r.h / 2 - 3.5 * sc), c, { scale: sc, align: o.align || 'center', shadow: '#000' });
    if (o.sub) T(g, o.sub, tx, r.y + 6 + 7 * sc, o.disabled ? '#4a4a5a' : UI.MUTED, { align: o.align || 'center', shadow: '#000' });
  },
  panel(g, x, y, w, h, o = {}) { E.ui.box(g, x, y, w, h, { bg: o.bg || ['#14142a', '#0a0a18'], border: o.border || '#3a3a5a', alpha: o.alpha || .9 }); },
  title(g, s, x, y, scale = 3, colors = ['#fff6d8', '#ffd06a', '#ff8a2a', '#c8401a']) { E.font.title(g, s, Math.round(x), Math.round(y), { scale, colors, align: 'center', outline: '#14081a', depth: 2, depthColor: '#4a1a5a' }); },
  /** a comic burst: a jagged star with text, scaling in with a bounce */
  burst(g, x, y, text, age, o = {}) {
    const k = age < .12 ? .4 + age / .12 * .7 : age < .22 ? 1.1 - (age - .12) : 1, sc = (o.scale || 2), w = E.font.width(text, { scale: sc }) + 16, h = 7 * sc + 14;
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, rr = (i % 2 ? .62 : 1) * k; pts.push([x + Math.cos(a) * w * .62 * rr, y + Math.sin(a) * h * .75 * rr]); }
    px.poly(g, pts, o.edge || '#1a0a14'); px.poly(g, pts.map(p => [x + (p[0] - x) * .9, y + (p[1] - y) * .88]), o.bg || '#ffd84a');
    if (k > .7) E.font.title(g, text, Math.round(x), Math.round(y - 3.5 * sc), { scale: sc, colors: o.colors || ['#ffffff', '#ffe060', '#ff6a2a'], align: 'center', outline: '#1a0a14' });
  }
};
/** a menu of focusable rectangles. spec: { items: () => [{ id, label, sub, disabled }], layout: (W, H, items) => [{ x, y, w, h }], onPick(item, i), onBack(), grid: true } */
UI.Menu = class {
  constructor(spec) { this.s = spec; this.i = spec.start || 0; this.rects = []; this.lastPtr = null; }
  items() { const it = this.s.items; return typeof it === 'function' ? it() : it; }
  layout() { const items = this.items(); this.rects = this.s.layout(game.W, game.H, items); return items; }
  update(I = game.input) {
    const items = this.layout(), n = items.length; if (!n) return;
    if (this.i >= n) this.i = n - 1;
    let dx = 0, dy = 0;
    if (I.repeat('up', .32, .09)) dy = -1; else if (I.repeat('down', .32, .09)) dy = 1;
    if (I.repeat('left', .32, .09)) dx = -1; else if (I.repeat('right', .32, .09)) dx = 1;
    if ((dx || dy) && !(this.s.onSide && dx && !dy && this.s.onSide(dx, items[this.i]))) { const j = this.nearest(dx, dy); if (j >= 0 && j !== this.i) { this.i = j; FF.sfx('menuMove'); } }
    // the mouse: hover moves the focus, a click picks
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { const j = this.hit(p[0], p[1]); if (j >= 0 && j !== this.i) { this.i = j; FF.sfx('menuMove'); } }
    this.lastPtr = p && [p[0], p[1]];
    const c = I.clicked && I.clicked();
    if (c) { const j = this.hit(c[0], c[1]); if (j >= 0) { this.i = j; return this.pick(items); } if (this.s.onClick && this.s.onClick(c)) return; }
    if (I.pressed('confirm')) { I.consume && I.consume('confirm'); return this.pick(items); }
    if (I.pressed('cancel') && this.s.onBack) { FF.sfx('menuBack'); return this.s.onBack(); }
  }
  pick(items) { const it = items[this.i]; if (!it || it.disabled) { FF.sfx('menuBack'); return; } FF.sfx('menuSelect'); this.s.onPick && this.s.onPick(it, this.i); }
  hit(x, y) { return this.rects.findIndex(r => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); }
  nearest(dx, dy) {
    const R = this.rects, a = R[this.i]; if (!a) return 0;
    if (!this.s.grid) { const n = R.length, step = dy || dx; let j = this.i; for (let k = 0; k < n; k++) { j = (j + step + n) % n; if (!(this.items()[j] || {}).hidden) return j; } return this.i; }
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2; let best = -1, bd = 1e9;
    R.forEach((b, j) => { if (j === this.i || !b) return; const bx = b.x + b.w / 2, by = b.y + b.h / 2, vx = bx - ax, vy = by - ay; const along = vx * dx + vy * dy; if (along <= 4) return; const off = Math.abs(vx * dy) + Math.abs(vy * dx); const d = along + off * 2.5; if (d < bd) { bd = d; best = j; } });
    return best;
  }
  draw(g, o = {}) { const items = this.layout(); items.forEach((it, j) => { const r = this.rects[j]; if (!r || it.hidden) return; (o.drawItem || UI.button)(g, r, it.label, j === this.i, Object.assign({ sub: it.sub, disabled: it.disabled }, o.style || {}, it.style || {}), it); }); }
};
/** a vertical list of big buttons, left aligned at x */
UI.listLayout = (x, y, w, h = 26, gap = 4) => (W, H, items) => items.map((it, i) => ({ x: typeof x === 'function' ? x(W, H) : x, y: (typeof y === 'function' ? y(W, H) : y) + i * (h + gap), w: typeof w === 'function' ? w(W, H) : w, h }));
})();
