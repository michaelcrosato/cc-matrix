/* AMERICAN FOOTBALL FIASCO — shared UI: big text, button prompts that follow the device in use, and the 10-foot menu list. */
(() => {
'use strict';
const E = My3D2dge, FF = globalThis.FF, { px, clamp } = E, game = FF.game;
const UI = FF.UI = {};

/* the label of an action on the device used last: '✕' on a PlayStation pad, 'A' on Xbox (Settings), keys on a keyboard */
UI.label = a => { try { return game.input.label(a) || a.toUpperCase(); } catch (e) { return a.toUpperCase(); } };
UI.prompt = (a, word) => UI.label(a) + ' ' + word;
UI.hints = list => list.map(([a, w]) => UI.prompt(a, w)).join('    ');
UI.text = (g, s, x, y, c = '#fff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
UI.big = (g, s, x, y, scale = 3, colors) => E.font.title(g, s, x, y, { align: 'center', scale, colors: colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: Math.max(2, scale - 1) });
UI.box = (g, x, y, w, h, o) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1c1838', '#0e0c22'], border: '#e8c860' }, o));
UI.mouseMoved = (() => { let last = null; return () => { const p = game.input.pointer(); if (!p) return null; const m = !last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > 1; last = p.slice(); return m ? p : null; }; })();
UI.inside = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
UI.touchOnly = () => !!FF.flags.touchOnly;

/* ---- a vertical menu: pad / keys / mouse (hover moves the focus, a click picks) ---- */
class VMenu {
  constructor(items, o = {}) { this.items = items; this.i = Math.max(0, items.findIndex(it => !it.disabled)); this.o = o; this.rects = []; this.sel = 0; }
  set(items) { this.items = items; this.i = clamp(this.i, 0, items.length - 1); }
  step(d) { const n = this.items.length; for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled) break; } FF.ui('blip'); }
  pick(i) { const it = this.items[i]; if (!it || it.disabled) { FF.ui('cancel'); return; } this.i = i; FF.ui('confirm'); if (this.o.onPick) this.o.onPick(i, it); }
  update() {
    const I = game.input;
    if (I.repeat('up', .32, .1)) this.step(-1); if (I.repeat('down', .32, .1)) this.step(1);
    if (this.o.horizontal) { if (I.repeat('left', .32, .1)) this.step(-1); if (I.repeat('right', .32, .1)) this.step(1); }
    const mv = UI.mouseMoved();
    if (mv) for (let k = 0; k < this.rects.length; k++) if (UI.inside(mv, this.rects[k]) && !this.items[k].disabled && this.i !== k) { this.i = k; FF.ui('blip'); }
    const c = I.clicked();
    if (c) for (let k = 0; k < this.rects.length; k++) if (UI.inside(c, this.rects[k])) { this.pick(k); I.consumeAll(); return; }
    if (I.pressed('confirm')) { this.pick(this.i); }
    else if (I.pressed('cancel') && this.o.onCancel) { FF.ui('cancel'); this.o.onCancel(); }
  }
  draw(g, cx, y, o = {}) {
    const scale = o.scale || 2, lh = o.lh || 19, w = o.w || 220; this.rects = [];
    for (let k = 0; k < this.items.length; k++) {
      const it = this.items[k], yy = y + k * lh, sel = k === this.i;
      this.rects.push([cx - w / 2, yy - 2, w, lh - 1]);
      if (sel) { E.ui.box(g, cx - w / 2, yy - 3, w, lh - 1, { bg: ['#ffb347', '#e0662a'], border: '#fff2c0', gradient: true }); }
      UI.text(g, (sel ? '▸ ' : '') + it.label, cx, yy + 1, it.disabled ? '#6a6480' : sel ? '#fffbe8' : '#d8d0f0', { align: 'center', scale, shadow: sel ? '#401000' : '#000' });
    }
    return y + this.items.length * lh;
  }
}
UI.VMenu = VMenu;

/* ---- the footer line: prompts for the device in use, centred at the bottom ---- */
UI.footer = (g, W, H, list) => UI.text(g, UI.hints(list), W / 2, H - 14, '#c8c0e8', { align: 'center' });
UI.glyphDevice = () => { try { return game.input.lastDevice; } catch (e) { return 'keyboard'; } };

/* ---- text wrapping for panels ---- */
UI.wrap = (s, w, scale = 1) => E.font.wrap(s, w / scale, { scale: 1 });
})();
