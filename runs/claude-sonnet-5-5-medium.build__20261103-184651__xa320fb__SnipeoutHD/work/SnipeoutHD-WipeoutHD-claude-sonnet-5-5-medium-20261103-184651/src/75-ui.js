(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN;
const UI = SN.UI = {};
const T = (g, s, x, y, c = '#fff', o) => E.font.text(g, s, Math.round(x), Math.round(y), c, o === undefined ? '#0b0814' : o);
UI.T = T;
UI.panel = (g, x, y, w, h, o = {}) => { px(g, x - 1, y - 1, w + 2, h + 2, '#05030c'); px(g, x, y, w, h, o.bg || 'rgba(14,10,38,.86)'); px(g, x, y, w, 2, o.edge || '#7a6aff'); };
UI.title = (g, text, x, y, o = {}) => E.font.title(g, text, x, y, Object.assign({ scale: 3, align: 'center', colors: ['#ffffff', '#9fe8ff', '#4a7aff'], depth: 2, depthColor: '#1a1a5a' }, o));
UI.footer = (r, g, items, left) => { px(g, 0, r.H - 20, r.W, 20, 'rgba(6,4,20,.7)'); SN.Glyph.row(g, items, r.W - 10, r.H - 16); if (left) SN.Glyph.left(g, left, 10, r.H - 16); };
// a vertical focus menu: items { label, value() -> text, left(), right(), pick(), disabled, hint }
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this.lastPtr = null; this.flash = 0; this.t = 0; }
  get cur() { return this.items[this.i]; }
  step(d) { const n = this.items.length; for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled) break; } SN.Audio.play('move'); }
  update(game, dt) {
    const I = game.input; this.t += dt; this.flash = Math.max(0, this.flash - dt);
    if (I.repeat('up', .3, .09)) this.step(-1); if (I.repeat('down', .3, .09)) this.step(1);
    const it = this.cur;
    if (it && it.adjust) { if (I.repeat('left', .3, .1)) { it.adjust(-1); SN.Audio.play('move'); } if (I.repeat('right', .3, .1)) { it.adjust(1); SN.Audio.play('move'); } }
    else if (it && (it.left || it.right)) { if (I.repeat('left', .3, .1) && it.left) { it.left(); SN.Audio.play('move'); } if (I.repeat('right', .3, .1) && it.right) { it.right(); SN.Audio.play('move'); } }
    if (I.pressed('confirm') && it && !it.disabled) this.pick(it);
    if (I.pressed('cancel') && this.o.onCancel) { SN.Audio.play('cancel'); this.o.onCancel(); }
    const p = I.pointer(), ck = I.clicked();
    if (p && I.lastDevice !== 'gamepad') {
      const moved = !this.lastPtr || Math.abs(p[0] - this.lastPtr[0]) + Math.abs(p[1] - this.lastPtr[1]) > 0;
      this.lastPtr = p.slice();
      this.rects.forEach((rc, k) => { if (rc && !this.items[k].disabled && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) { if (moved && this.i !== k) { this.i = k; SN.Audio.play('move'); } } });
    }
    if (ck) this.rects.forEach((rc, k) => { if (rc && !this.items[k].disabled && ck[0] >= rc[0] && ck[0] < rc[0] + rc[2] && ck[1] >= rc[1] && ck[1] < rc[1] + rc[3]) {
      this.i = k; const it2 = this.items[k], half = rc[0] + rc[2] / 2;
      if (it2.adjust && ck[0] > rc[0] + rc[2] - 40) it2.adjust(1); else if (it2.adjust && ck[0] < rc[0] + 40 && it2.value) it2.adjust(-1); else this.pick(it2); } });
  }
  pick(it) { if (it.disabled) return; this.flash = .15; SN.Audio.play('confirm'); if (it.pick) it.pick(); else if (it.adjust) it.adjust(1); }
  draw(r, g, x, y, w, o = {}) {
    const lh = o.lh || 17; this.rects.length = 0;
    this.items.forEach((it, k) => {
      const sel = k === this.i, yy = y + k * lh; this.rects[k] = [x - w / 2, yy - 2, w, lh - 2];
      if (sel) { px(g, x - w / 2, yy - 2, w, lh - 2, 'rgba(122,106,255,.35)'); px(g, x - w / 2, yy - 2, 3, lh - 2, '#ffd36a'); px(g, x - w / 2 + 3, yy + lh - 4, w - 3, 1, '#7a6aff'); }
      const col = it.disabled ? '#5a5478' : sel ? '#ffffff' : '#b4aedd';
      if (it.value !== undefined) { T(g, it.label, x - w / 2 + 10, yy + 2, col); const v = (typeof it.value === 'function' ? it.value() : it.value); T(g, (sel && it.adjust ? '< ' : '') + v + (sel && it.adjust ? ' >' : ''), x + w / 2 - 8, yy + 2, sel ? '#ffd36a' : '#9fe8ff', { align: 'right' }); }
      else T(g, it.label, o.align === 'left' ? x - w / 2 + 10 : x, yy + 2, col, { align: o.align === 'left' ? 'left' : 'center', scale: 1 });
    });
  }
}
UI.Menu = Menu;
// wrapped text block
UI.para = (g, text, x, y, w, c = '#d8d4ff', o = {}) => T(g, text, x, y, c, Object.assign({ wrap: w }, o));
// pad/keyboard needed notice for touch-only devices
SN.touchOnly = () => { try { const nav = navigator; const touch = nav.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(pointer: fine)').matches); const pads = (nav.getGamepads ? Array.from(nav.getGamepads()).filter(Boolean) : []); return touch && !pads.length && SN.game && SN.game.input.lastDevice === 'touch'; } catch (e) { return false; } };
})();
