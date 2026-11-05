/* ---- 10-FOOT UI: big lists, option rows (left / right change the value), cards and panels, readable from a sofa.
 * One decision per screen, at most 6 items, a big animated cricket-ball cursor and a gold bar on the focus. The mouse's
 * hover moves the focus and a click picks; keys, d-pad and sticks move it; confirm picks, cancel goes back. Footer
 * prompts use the live glyphs. ---- */
const UI = {
  gold: '#ffd36a', ink: '#fff8e8', dim: '#a8a090', panel: '#14241a', panel2: '#1e3626', edge: '#e8c060',
  /** a framed panel */
  panel(g, x, y, w, h, o = {}) {
    px.rect(g, x + 2, y + 2, w, h, '#00000060');
    E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1e3a28', '#10201a'], border: o.border || UI.edge, alpha: o.alpha || .94 });
  },
  /** the cricket-ball cursor */
  ball(g, x, y, t) { const b = Math.sin(t * 6) * 1.5; px.disc(g, x, y + b, 4, '#4a0a0a'); px.disc(g, x, y + b, 3.4, '#c8202a'); px.line(g, x - 2, y + b - 2, x + 2, y + b + 2, '#f4e8c0'); px.dot(g, x - 1, y + b - 2, '#ffffff'); },
  title(g, text, x, y, scale = 2, colors) { E.font.title(g, text, x, y, { align: 'center', scale, colors: colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }); },
  text(g, s, x, y, c = UI.ink, o = {}) { E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o)); },
  /** wrapped text in at most `lines` lines; returns the height */
  para(g, s, x, y, w, c = UI.ink, o = {}) { const L = E.font.wrap(s, w, o); let yy = y; for (const l of L) { UI.text(g, l, x, yy, c, o); yy += E.font.lineHeight(o) + 2; } return yy - y; },
  footer(g, r, I, list) { const y = r.H - 14; px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 4, r.W, 18, '#000000')); Glyphs.row(g, r.W / 2, y, I, list, { align: 'center' }); },
  /** a hit test for the mouse: the pointer inside a rectangle */
  hover(I, x, y, w, h) { const p = I.pointer && I.pointer(); return p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h; },
  clickIn(I, x, y, w, h) { const c = I.clicked && I.clicked(); return c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h; }
};
/** a list of big rows. items: [{ label, value: () => text, left(), right(), act(), help, disabled, hidden }] */
class UIList {
  constructor(o) { Object.assign(this, { items: [], i: 0, rowH: 18, w: 220, x: 'center', y: 80, title: null, t: 0, onBack: null, lastPointer: null }, o); }
  visible() { return this.items.filter(it => !(typeof it.hidden === 'function' ? it.hidden() : it.hidden)); }
  update(dt, I) {
    this.t += dt; const items = this.visible(); if (!items.length) return null;
    if (!this.layout && K.game) { const W = K.game.W || 427, w = Math.min(this.w, W - 20); this.layout = { x: this.x === 'center' ? Math.round(W / 2 - w / 2) : this.x, y: this.y, w }; }
    if (this.i >= items.length) this.i = items.length - 1;
    const rep = a => I.repeat ? I.repeat(a, .32, .09) : I.pressed(a);
    if (rep('up')) { this.i = (this.i + items.length - 1) % items.length; K.sfx('select'); }
    if (rep('down')) { this.i = (this.i + 1) % items.length; K.sfx('select'); }
    const it = items[this.i];
    if (it && rep('left') && it.left) { it.left(); K.sfx('select'); }
    if (it && rep('right') && it.right) { it.right(); K.sfx('select'); }
    // the mouse: hover moves the focus, a click picks (or turns a value row on its arrows)
    const p = I.pointer && I.pointer(), moved = p && (!this.lastPointer || p[0] !== this.lastPointer[0] || p[1] !== this.lastPointer[1]); this.lastPointer = p;
    const L = this.layout;
    if (L && moved) items.forEach((q, k) => { const y = L.y + k * this.rowH; if (UI.hover(I, L.x, y - 2, L.w, this.rowH)) this.i = k; });
    const c = I.clicked && I.clicked();
    if (L && c) items.forEach((q, k) => { const y = L.y + k * this.rowH; if (c[0] >= L.x && c[0] < L.x + L.w && c[1] >= y - 2 && c[1] < y - 2 + this.rowH) { this.i = k; if (q.left && c[0] < L.x + 26) { q.left(); K.sfx('select'); } else if (q.right && c[0] > L.x + L.w - 26) { q.right(); K.sfx('select'); } else if (q.act && !q.disabled) { K.sfx('confirm'); q.act(); } else if (q.right) { q.right(); K.sfx('select'); } } });
    if (I.pressed('confirm') && it && !(c && L)) { I.consume('confirm'); if (it.act && !it.disabled) { K.sfx('confirm'); it.act(); return 'act'; } if (it.right) { it.right(); K.sfx('select'); } }
    if (I.pressed('cancel') && this.onBack) { I.consume('cancel'); K.sfx('cancel'); this.onBack(); return 'back'; }
    return null;
  }
  draw(g, r) {
    const items = this.visible(), w = Math.min(this.w, r.W - 20), x = this.x === 'center' ? Math.round(r.W / 2 - w / 2) : this.x, y = this.y;
    this.layout = { x, y, w };
    if (this.title) UI.text(g, this.title, r.W / 2, y - 16, UI.gold, { align: 'center' });
    items.forEach((it, k) => {
      const yy = y + k * this.rowH, on = k === this.i, dis = it.disabled;
      if (on) { px.blend(g, .85, 'normal', () => px.rect(g, x, yy - 3, w, this.rowH - 2, '#5a4410')); px.rect(g, x, yy - 3, w, 1, UI.gold); px.rect(g, x, yy + this.rowH - 6, w, 1, '#a07a20'); UI.ball(g, x - 8, yy + 4, this.t); }
      const val = it.value ? it.value() : null, col = dis ? '#6a6a60' : on ? '#ffffff' : UI.ink;
      if (val !== null && val !== undefined) {
        UI.text(g, it.label, x + 6, yy, col);
        const vs = String(val); UI.text(g, vs, x + w - 18, yy, on ? UI.gold : '#d8c8a0', { align: 'right' });
        if (on && it.left) UI.text(g, '←', x + w - 30 - E.font.width(vs), yy, UI.gold); if (on && it.right) UI.text(g, '→', x + w - 12, yy, UI.gold);
      } else UI.text(g, it.label, x + w / 2, yy, col, { align: 'center' });
    });
    const it = items[this.i];
    if (it && it.help) { const h = typeof it.help === 'function' ? it.help() : it.help; const hy = this.helpTop ? Math.max(4, y - 30) : y + items.length * this.rowH + 4; if (hy + 10 < r.H - 18 || this.helpTop) UI.para(g, h, Math.round(r.W / 2 - 150), this.helpTop ? hy : Math.min(hy, r.H - 30), 300, '#d8d0b8', { align: 'left', font: 'tiny' }); }
  }
}
/** a row of big cards to pick one from (bowler select, tea treats, team cards): left / right, confirm, hover, click */
class UICards {
  constructor(o) { Object.assign(this, { cards: [], i: 0, w: 92, h: 110, t: 0, lastPointer: null }, o); }
  update(dt, I) {
    this.t += dt; const n = this.cards.length; if (!n) return null;
    const rep = a => I.repeat ? I.repeat(a, .32, .12) : I.pressed(a);
    if (rep('left')) { this.i = (this.i + n - 1) % n; K.sfx('select'); }
    if (rep('right')) { this.i = (this.i + 1) % n; K.sfx('select'); }
    const p = I.pointer && I.pointer(), moved = p && (!this.lastPointer || p[0] !== this.lastPointer[0] || p[1] !== this.lastPointer[1]); this.lastPointer = p;
    const L = this.layout;
    if (L && moved) L.forEach((b, k) => { if (UI.hover(I, b[0], b[1], b[2], b[3])) this.i = k; });
    const c = I.clicked && I.clicked();
    if (L && c) for (let k = 0; k < L.length; k++) { const b = L[k]; if (c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) { this.i = k; K.sfx('confirm'); return { pick: k }; } }
    if (I.pressed('confirm')) { I.consume('confirm'); K.sfx('confirm'); return { pick: this.i }; }
    if (I.pressed('cancel')) { I.consume('cancel'); return { back: true }; }
    return null;
  }
  draw(g, r, y, drawCard) {
    const n = this.cards.length, gap = 8, w = Math.min(this.w, Math.floor((r.W - 20 - gap * (n - 1)) / n)), total = n * w + (n - 1) * gap, x0 = Math.round(r.W / 2 - total / 2);
    this.layout = [];
    this.cards.forEach((c, k) => { const x = x0 + k * (w + gap), on = k === this.i, yy = y - (on ? 4 : 0); this.layout.push([x, yy, w, this.h]); UI.panel(g, x, yy, w, this.h, { border: on ? UI.gold : '#5a6a5a', bg: on ? ['#2e4a34', '#18301e'] : ['#1a2e20', '#0e1a12'] }); drawCard(g, c, x, yy, w, this.h, on); if (on) UI.ball(g, x + w / 2, yy - 6, this.t); });
  }
}
K.UI = UI; K.UIList = UIList; K.UICards = UICards;
