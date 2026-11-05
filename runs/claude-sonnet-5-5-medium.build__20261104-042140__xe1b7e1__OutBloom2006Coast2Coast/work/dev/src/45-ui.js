/* The UI kit: big, sparse lists that work with pad, keyboard and mouse the same way (hover moves the focus, click picks,
 * left/right change a value). Prompts follow the device used last. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, { clamp } = E;
class List {
  /** rows: [{ label, value (string|fn), left(), right(), pick(), disabled, hint }]; o: { x, y, w, rowH, title, onCancel } */
  constructor(rows, o = {}) { this.rows = rows; this.i = 0; Object.assign(this, { x: 'center', y: 90, w: 220, rowH: 17, title: null, onCancel: null, dim: false }, o); this.rects = []; this._mt = -99; this._skip(1); }
  _off(r) { return typeof r.disabled === 'function' ? r.disabled() : r.disabled; }
  _skip(d) { for (let k = 0; k < this.rows.length && this._off(this.rows[this.i]); k++) this.i = (this.i + d + this.rows.length) % this.rows.length; }
  update() {
    const I = game.input, n = this.rows.length, old = this.i; if (!n) return;
    if (I.repeat('up')) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (I.repeat('down')) { this.i = (this.i + 1) % n; this._skip(1); }
    if (I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const p = I.pointer(), k = this.hit(p); if (k >= 0) this.i = k; }
    const ck = this.hit(I.clicked());
    if (this.i !== old) OB.sfx('select');
    const row = this.rows[this.i];
    if (I.repeat('left') && row.left && !this._off(row)) { row.left(); OB.sfx('select'); }
    if (I.repeat('right') && row.right && !this._off(row)) { row.right(); OB.sfx('select'); }
    if (ck >= 0) { this.i = ck; const rc = this.rects[ck], p = I.clicked(); if (row.left && row.right && p && p[0] > rc.x + rc.w * .5) { row.right(); OB.sfx('select'); return true; } if (row.left && row.right && p) { row.left(); OB.sfx('select'); return true; } }
    if ((I.pressed('confirm') || ck >= 0) && !this._off(row)) { if (row.pick) { OB.sfx('confirm'); I.consumeAll(); row.pick(); return true; } if (row.right && I.pressed('confirm')) { row.right(); OB.sfx('select'); return true; } }
    if (I.pressed('cancel') && this.onCancel) { OB.sfx('cancel'); I.consumeAll(); this.onCancel(); return true; }
    return false;
  }
  hit(p) { if (!p) return -1; for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h && !this._off(this.rows[k])) return k; } return -1; }
  draw(r) {
    const W = r.W, w = this.w, h = this.rows.length * this.rowH + (this.title ? 20 : 0) + 12, x = this.x === 'center' ? Math.round((W - w) / 2) : this.x, y = this.y;
    r.overlay(g => {
      OB.panel(g, x, y, w, h, { bg: '#2a1346e8' });
      let yy = y + 6; if (this.title) { OB.txt(g, this.title, x + w / 2, yy, '#ffe27a', { align: 'center' }); yy += 18; }
      const blink = Math.floor(game.real * 3) % 2 === 0; this.rects = [];
      this.rows.forEach((row, k) => {
        const sel = k === this.i, off = this._off(row), ry = yy + k * this.rowH; this.rects.push({ x: x + 3, y: ry - 2, w: w - 6, h: this.rowH });
        if (sel) { px.rect(g, x + 3, ry - 2, w - 6, this.rowH - 1, '#5a2a7a'); px.rect(g, x + 3, ry - 2, 2, this.rowH - 1, '#ff9ad0'); }
        const lab = typeof row.label === 'function' ? row.label() : row.label, val = typeof row.value === 'function' ? row.value() : row.value;
        OB.txt(g, lab, x + 12, ry + 1, off ? '#6a5a8a' : sel ? '#ffe27a' : '#ffffff');
        if (val != null) { const arrows = sel && row.left && !off; OB.txt(g, (arrows ? '◄ ' : '') + val + (arrows ? ' ►' : ''), x + w - 10, ry + 1, off ? '#6a5a8a' : sel ? '#ffd0ec' : '#d8c8ff', { align: 'right' }); }
        if (sel && blink && !off) OB.txt(g, '▸', x + 5, ry + 1, '#ffe27a');
      });
    });
  }
}
OB.List = List;
// the prompt strip at the bottom: [['confirm', 'Select'], ['cancel', 'Back']] in the glyphs of the device in use
OB.drawPrompts = (g, W, H, list) => {
  const parts = list.map(([a, w]) => (a === '*' ? w : game.input.label(a) + ' ' + w)), s = parts.join('    ');
  const wd = E.font.width(s) + 16; OB.panel(g, Math.round((W - wd) / 2), H - 18, wd, 14, { bg: '#1a0c2ecc', border: '#6a4a8a' });
  OB.txt(g, s, W / 2, H - 15, '#ffe2f4', { align: 'center' });
};
// a big title banner
OB.heading = (g, W, text, y = 8, scale = 2) => E.font.title(g, text, W / 2, y, { scale, align: 'center', colors: ['#fffbe8', '#ffd0ec', '#ff6aa0'], depth: 2, depthColor: '#5a1a4a' });
// a sunset backdrop for menus
OB.menuSky = (r, tod = 'dusk') => OB.skyFor('beach', tod).draw(r);
OB.typed = (text, t, cps = 38) => text.slice(0, Math.floor(t * cps));
})();
