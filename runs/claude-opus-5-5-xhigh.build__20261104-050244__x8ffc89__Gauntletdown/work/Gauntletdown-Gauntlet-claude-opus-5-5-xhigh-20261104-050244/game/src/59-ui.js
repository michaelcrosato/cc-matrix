/* ---- UI KIT for the canvas screens: a big menu (scale 2 text; keys, d-pad, sticks, mouse hover and click), back on
   any screen (circle, Esc, Backspace, right click), and the idle watcher that starts the attract mode ---- */
const ui = {
  /** has anyone pressed anything this step? (any player's key or button, a click, the wheel, a stick, the mouse moving) */
  anyInput() {
    const P = game._players || [game.input];
    for (const I of P) {
      if (I.anyPressed() || I.clicked()) return true;
      if (Math.hypot(...I.padMove) > .3 || (I.padAim && Math.hypot(...I.padAim) > .3)) return true;
    }
    const I = game.input, p = I.pointer();
    if (p) { const q = ui._lastPt; ui._lastPt = p.slice(); if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) > 2) return true; }
    if (I.zoom && I.zoom() !== 1) return true;
    return false;
  },
  /** idle seconds on a front-end screen; at 10 the attract mode starts */
  idle: 0,
  watchIdle(dt) { if (ui.anyInput()) { ui.idle = 0; return false; } ui.idle += dt; if (ui.idle >= 10 && !game.paused && !(game.shell && game.shell.screen)) { ui.idle = 0; game.go('attract', {}, { fade: 'dissolve' }); return true; } return false; },
  /** back: circle (pad 1), Esc, Backspace or a right click */
  back() { const P = game._players || [game.input]; return P.some(I => I.pressed('cancel')) || game.input.held.has('Mouse2') && !ui._rc && (ui._rc = true); },
  step() { if (!game.input.held.has('Mouse2')) ui._rc = false; }
};
/** a big menu: items [{ label, fn, disabled }], drawn at scale 2 with the focus bar; the mouse hover moves the focus */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: 'center', y: 110, scale: 2, gap: 6 }, o); this.boxes = []; this._mt = null; }
  update() {
    const P = game._players || [game.input], I = game.input, n = this.items.length, old = this.i;
    if (!n) return;
    if (P.some(q => q.repeat('up'))) this.i = (this.i + n - 1) % n;
    if (P.some(q => q.repeat('down'))) this.i = (this.i + 1) % n;
    const hit = p => p ? this.boxes.findIndex(b => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]) : -1;
    if (I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = hit(I.pointer()); if (k >= 0) this.i = k; }
    const c = hit(I.clicked());
    if (c >= 0) this.i = c;
    if (this.i !== old) sfx('move');
    const it = this.items[this.i];
    if ((P.some(q => q.pressed('confirm')) || c >= 0) && it && !it.disabled) { sfx('select'); P.forEach(q => q.consumeAll()); it.fn && it.fn(); return true; }
    return false;
  }
  draw(g, r) {
    const o = this.o, sc = o.scale, lh = 7 * sc + o.gap, w = Math.max(...this.items.map(it => E.font.width(it.label, { scale: sc }))) + 40, x = o.x === 'center' ? Math.round((r.W - w) / 2) : o.x;
    this.boxes = [];
    this.items.forEach((it, k) => {
      const y = o.y + k * (lh + 4), on = k === this.i;
      this.boxes.push([x, y - 4, w, lh + 2]);
      if (on) { E.ui.box(g, x, y - 4, w, lh + 2, { bg: ['#5a3a1a', '#2a1a0a'], border: '#ffd060' }); px.poly(g, [[x + 8, y + 1], [x + 8, y + 7 * sc - 1], [x + 14, y + 3.5 * sc]], '#ffd060'); }
      tx(g, it.label, x + w / 2 + 6, y, it.disabled ? '#5a5048' : on ? '#ffe8b0' : '#c8b8a0', { align: 'center', scale: sc });
    });
  }
}
/** a page of words that scrolls (About, credits, long help) */
function drawPage(g, r, lines, scroll, o = {}) {
  const sc = o.scale || 1, w = Math.min(r.W - 40, o.w || 380), x = Math.round((r.W - w) / 2), y0 = o.y || 54, lh = 9 * sc + 2, h = r.H - y0 - (o.bottom || 30);
  const wrapped = []; for (const l of lines) { if (l === '') { wrapped.push(''); continue; } for (const q of E.font.wrap(l, w, { scale: sc })) wrapped.push(q); }
  const maxScroll = Math.max(0, wrapped.length * lh - h), s = clamp(scroll, 0, maxScroll);
  g.save(); g.beginPath(); g.rect(x - 4, y0 - 2, w + 8, h + 4); g.clip();
  wrapped.forEach((l, i) => { const y = y0 + i * lh - s; if (y > y0 - lh && y < y0 + h) tx(g, l, x, y, o.color || '#e8dcc8', { scale: sc }); });
  g.restore();
  if (maxScroll > 0) { const bh = Math.max(10, h * h / (wrapped.length * lh)), by = y0 + (h - bh) * (s / maxScroll); px.rect(g, x + w + 6, y0, 2, h, '#3a2e22'); px.rect(g, x + w + 6, Math.round(by), 2, Math.round(bh), '#ffd060'); }
  return maxScroll;
}
/** the shaft behind the title: brick walls rushing up, torches, an iron gauntlet tumbling down forever */
function drawShaft(g, r, t, o = {}) {
  const W2 = r.W, H = r.H, speed = o.speed || 60, off = (t * speed) % 24;
  px.rect(g, 0, 0, W2, H, '#0a0610');
  const wall = Math.round(W2 * .22);
  for (const side of [0, 1]) {
    const x0 = side ? W2 - wall : 0;
    for (let y = -24; y < H + 24; y += 12) { const yy = Math.round(y - off), row = Math.floor((y + t * speed) / 12); for (let x = (row % 2) * 10; x < wall; x += 20) { const c = E.hash2(Math.floor(x / 20) + side * 9, row) < .5 ? '#2a1e22' : '#3a2a2e'; px.rect(g, x0 + x, yy, 19, 11, c); px.rect(g, x0 + x, yy, 19, 1, '#4a383a'); } }
    const edge = side ? x0 : x0 + wall - 3; px.rect(g, edge, 0, 3, H, '#120a0e');
  }
  // the pit's depth: rings of darkness toward the middle
  for (let k = 0; k < 6; k++) { const s = 1 - k / 7; px.blend(g, .18, 'multiply', () => px.rect(g, wall + (W2 - 2 * wall) * (1 - s) / 2, 0, (W2 - 2 * wall) * s, H, '#000000')); }
  // torches rushing past
  for (let i = 0; i < 4; i++) {
    const y = ((i * 97 + t * speed) % (H + 60)) - 30, side = i % 2, x = side ? W2 - wall - 2 : wall + 2, fl = Math.sin(t * 20 + i * 3) * 1.5;
    px.rect(g, x - 1, y, 3, 8, '#5a3a1e');
    softGlow(g, x, y - 3, 12 + fl, '#ff8a3a');
    px.disc(g, x, y - 3, 3 + fl * .4, '#ffb040'); px.disc(g, x, y - 4, 1.6, '#fff0a0');
  }
  // the gauntlet, tumbling
  if (o.gauntlet !== false) {
    const gx = W2 / 2 + Math.sin(t * .7) * 22, gy = H * .42 + Math.sin(t * 1.3) * 10, a = t * 1.6;
    drawSpinningGauntlet(g, gx, gy, 3.2, a);
    softGlow(g, gx, gy, 34, '#ffd060');
  }
}
/** a soft glow: rings of light fading out (stepped, as the era's hardware blended) */
function softGlow(g, x, y, r, c) { for (let k = 4; k >= 1; k--) px.blend(g, .1, 'add', () => px.disc(g, x, y, r * k / 4, c)); }
function drawSpinningGauntlet(g, x, y, k, a) {
  const c = Math.cos(a), s = Math.sin(a), P2 = pts => pts.map(([u, v]) => [x + (u * c - v * s) * k, y + (u * s + v * c) * k]);
  const C = E.tones('#9aa0ac'), Gd = E.tones('#e8c040');
  px.poly(g, P2([[-5, -2], [5, -2], [5, 6], [-5, 6]]), C.sh);
  px.poly(g, P2([[-4, -1.4], [4, -1.4], [4, 5], [-4, 5]]), C.base);
  for (let i = 0; i < 4; i++) px.poly(g, P2([[-4.6 + i * 2.4, -7], [-2.8 + i * 2.4, -7], [-2.8 + i * 2.4, -2], [-4.6 + i * 2.4, -2]]), i % 2 ? C.lt : C.base);
  px.poly(g, P2([[5, 0], [8, -3], [9, -1], [6, 3]]), C.sh);
  px.poly(g, P2([[-6, 6], [6, 6], [6, 9], [-6, 9]]), Gd.base); px.poly(g, P2([[-6, 6], [6, 6], [6, 7], [-6, 7]]), Gd.hi);
}
