// 10-foot UI: big lists and grids that keys, pads and the mouse all drive (hover moves the focus), tabs, panels,
// banners, toasts and page dots. Primary text is the 5x7 font at scale 2; nothing a player must read is tiny.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp } = E;
const GOLD = '#f2b632', NAVY = '#0c1028', INK = '#ffffff';
const UI = O.UI = { GOLD, NAVY, INK, ICE: '#3fa8e8', CORAL: '#ff6b4a', DIM: '#8c93b8' };

UI.text = (g, s, x, y, c = INK, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
UI.tw = (s, scale = 1) => E.font.width(s, { scale });
UI.wrap = (s, w, scale = 1) => E.font.wrap(s, w, { scale });
UI.panel = (g, x, y, w, h, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const a = o.alpha === undefined ? .92 : o.alpha;
  px.blend(g, a, 'normal', () => { px.rect(g, x, y, w, h, o.bg || NAVY); px.rect(g, x, y, w, Math.min(h, 14), o.top || '#141a3e'); });
  const t = o.trim || GOLD;
  px.rect(g, x, y, w, 1, t); px.rect(g, x, y + h - 1, w, 1, E.shade(t, -.35)); px.rect(g, x, y, 1, h, E.shade(t, -.15)); px.rect(g, x + w - 1, y, 1, h, E.shade(t, -.35));
  px.rect(g, x + 2, y + 2, 3, 1, '#fff4c8'); px.rect(g, x + 2, y + 2, 1, 3, '#fff4c8');
  if (o.title) { UI.text(g, o.title, x + 8, y + 4, o.titleColor || GOLD, { scale: o.titleScale || 1 }); }
};
UI.heading = (g, s, x, y, o = {}) => E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: 3, colors: ['#fff6c8', '#ffd36a', '#f08a2a'], outline: '#3a0a10', depth: 2, depthColor: '#7a1a1a', align: 'center' }, o));
UI.bar = (g, x, y, w, h, f, c, o = {}) => { px.rect(g, x - 1, y - 1, w + 2, h + 2, '#05060e'); px.rect(g, x, y, w, h, o.bg || '#222744'); const fw = Math.round(w * clamp(f, 0, 1)); if (fw > 0) { px.rect(g, x, y, fw, h, c); px.rect(g, x, y, fw, 1, E.shade(c, .35)); } };
UI.dots = (g, n, i, x, y) => { const w = n * 10; for (let k = 0; k < n; k++) { const cx = Math.round(x - w / 2 + k * 10 + 5); px.disc(g, cx, y, k === i ? 3 : 2, k === i ? GOLD : '#4a5078'); } return { x0: x - w / 2, w, y }; };
UI.pulse = (f = 3) => .5 + .5 * Math.sin(game.real * f * Math.PI);
UI.hit = (p, x, y, w, h) => !!p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;

// any player's input drives a menu; the mouse moves the focus only while it is the device in use
UI.anyPressed = a => game.players.some(p => p.pressed(a));
UI.anyRepeat = a => game.players.some(p => p.repeat(a, .3, .1));
UI.pointer = () => { const I = game.input; return I.lastDevice === 'mouse' && I.pointer ? I.pointer() : null; };
UI.clicked = () => { const I = game.input; return I.clicked ? I.clicked() : null; };
UI.sfx = n => game.audio.sfx(n);

/** a vertical list of big rows: new UI.List(items, { x, y, w, row: 22, scale: 2, onPick(i, item), onCancel, onFocus }) */
class List {
  constructor(items, o = {}) { this.items = items; this.o = Object.assign({ x: 20, y: 40, w: 180, row: 22, scale: 2 }, o); this.i = Math.max(0, items.findIndex(it => !it.disabled)); this.t = 0; this.rects = []; }
  get item() { return this.items[this.i]; }
  move(d) { const n = this.items.length; if (!n) return; let i = this.i; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.items[i].disabled && !this.items[i].hidden) break; } if (i !== this.i) { this.i = i; UI.sfx('select'); if (this.o.onFocus) this.o.onFocus(i, this.items[i]); } }
  update() {
    this.t += O.rdt || 1 / 120;
    if (UI.anyRepeat('up')) this.move(-1); else if (UI.anyRepeat('down')) this.move(1);
    const p = UI.pointer();
    if (p) this.rects.forEach((r, i) => { if (r && UI.hit(p, ...r) && i !== this.i && !this.items[i].disabled) { this.i = i; if (this.o.onFocus) this.o.onFocus(i, this.items[i]); } });
    const c = UI.clicked();
    if (c) { const k = this.rects.findIndex(r => r && UI.hit(c, ...r)); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(); } }
    if (UI.anyPressed('confirm')) return this.pick();
    if (UI.anyPressed('cancel') && this.o.onCancel) { UI.sfx('cancel'); this.o.onCancel(); return true; }
    const it = this.item;
    if (it && it.options) { const d = UI.anyRepeat('left') ? -1 : UI.anyRepeat('right') ? 1 : 0; if (d) { it.value = (it.value + d + it.options.length) % it.options.length; UI.sfx('select'); if (it.onChange) it.onChange(it.value, it); } }
    return false;
  }
  pick() { const it = this.item; if (!it || it.disabled) return false; UI.sfx('confirm'); if (it.options && !it.onPick) { it.value = (it.value + 1) % it.options.length; if (it.onChange) it.onChange(it.value, it); return true; } if (it.onPick) it.onPick(this.i, it); else if (this.o.onPick) this.o.onPick(this.i, it); return true; }
  draw(g) {
    const o = this.o, k = o.scale, rowH = o.row; let y = o.y; this.rects = [];
    this.items.forEach((it, i) => {
      if (it.hidden) { this.rects.push(null); return; }
      const f = i === this.i, x = o.x;
      this.rects.push([x, y, o.w, rowH - 2]);
      if (f) {
        const pu = UI.pulse(2);
        px.blend(g, .85, 'normal', () => px.rect(g, x, y, o.w, rowH - 2, '#2a2f66'));
        px.rect(g, x, y, 3, rowH - 2, GOLD); px.rect(g, x, y, o.w, 1, E.shade(GOLD, -.2)); px.rect(g, x, y + rowH - 3, o.w, 1, E.shade(GOLD, -.4));
        UI.text(g, '▸', x + 6 + Math.round(pu * 2), y + (rowH - 2 - 7 * k) / 2, GOLD, { scale: k });
      }
      const c = it.disabled ? '#5a6080' : f ? '#fff6c8' : (it.color || '#d6dbf5');
      const label = it.options ? it.label : it.label;
      UI.text(g, label, x + 6 + 8 * k, y + (rowH - 2 - 7 * k) / 2, c, { scale: k });
      if (it.options) { const v = '< ' + it.options[it.value] + ' >'; UI.text(g, v, x + o.w - 8 - UI.tw(v, k), y + (rowH - 2 - 7 * k) / 2, f ? GOLD : '#aab0d0', { scale: k }); }
      else if (it.right) UI.text(g, it.right, x + o.w - 8 - UI.tw(it.right, k), y + (rowH - 2 - 7 * k) / 2, f ? GOLD : '#aab0d0', { scale: k });
      y += rowH;
    });
  }
}
UI.List = List;

/** a grid of tiles: new UI.Grid(n, { x, y, cols, w, h, gap, drawTile(g, i, x, y, w, h, focused), onPick(i), onCancel }) */
class Grid {
  constructor(n, o = {}) { this.n = n; this.o = Object.assign({ x: 20, y: 40, cols: 4, w: 64, h: 48, gap: 6 }, o); this.i = 0; this.rects = []; }
  update(inp) {
    const c = this.o.cols, n = this.n; let i = this.i;
    const rep = a => inp ? inp.repeat(a, .3, .1) : UI.anyRepeat(a);
    if (rep('left')) i = (i % c === 0) ? Math.min(n - 1, i + c - 1) : i - 1;
    else if (rep('right')) i = (i % c === c - 1 || i === n - 1) ? i - (i % c) : i + 1;
    else if (rep('up')) i = i - c >= 0 ? i - c : i + c * Math.floor((n - 1 - i) / c);
    else if (rep('down')) i = i + c < n ? i + c : i % c;
    if (i !== this.i) { this.i = i; UI.sfx('select'); if (this.o.onFocus) this.o.onFocus(i); }
    if (!inp) {
      const p = UI.pointer(); if (p) this.rects.forEach((r, k) => { if (UI.hit(p, ...r) && k !== this.i) { this.i = k; if (this.o.onFocus) this.o.onFocus(k); } });
      const cl = UI.clicked(); if (cl) { const k = this.rects.findIndex(r => UI.hit(cl, ...r)); if (k >= 0) { this.i = k; UI.sfx('confirm'); this.o.onPick && this.o.onPick(k); return true; } }
    }
    if (inp ? inp.pressed('confirm') : UI.anyPressed('confirm')) { UI.sfx('confirm'); this.o.onPick && this.o.onPick(this.i); return true; }
    if ((inp ? inp.pressed('cancel') : UI.anyPressed('cancel')) && this.o.onCancel) { UI.sfx('cancel'); this.o.onCancel(); return true; }
    return false;
  }
  rect(i) { const o = this.o; return [o.x + (i % o.cols) * (o.w + o.gap), o.y + Math.floor(i / o.cols) * (o.h + o.gap), o.w, o.h]; }
  draw(g) { this.rects = []; for (let i = 0; i < this.n; i++) { const r = this.rect(i); this.rects.push(r); this.o.drawTile(g, i, ...r, i === this.i); } }
}
UI.Grid = Grid;

/** tabs along a top bar: L1/R1, Q/E, ←/→ (when o.arrows) or a click switch them */
class Tabs {
  constructor(names, o = {}) { this.names = names; this.i = 0; this.o = Object.assign({ y: 30, arrows: true }, o); this.rects = []; }
  update() {
    let d = 0;
    if (UI.anyPressed('tabL') || (this.o.arrows && UI.anyRepeat('left'))) d = -1; else if (UI.anyPressed('tabR') || (this.o.arrows && UI.anyRepeat('right'))) d = 1;
    if (d) { this.i = (this.i + d + this.names.length) % this.names.length; UI.sfx('select'); if (this.o.onChange) this.o.onChange(this.i); return true; }
    const c = UI.clicked(); if (c) { const k = this.rects.findIndex(r => UI.hit(c, ...r)); if (k >= 0 && k !== this.i) { this.i = k; UI.sfx('select'); if (this.o.onChange) this.o.onChange(k); return true; } }
    return false;
  }
  draw(g, W) {
    const y = this.o.y, n = this.names.length, show = Math.min(n, this.o.show || n);
    let start = clamp(this.i - Math.floor(show / 2), 0, n - show);
    const items = this.names.slice(start, start + show), ws = items.map(s => UI.tw(s, 1) + 14), total = ws.reduce((a, b) => a + b, 0) + 4 * (items.length - 1);
    let x = Math.round(W / 2 - total / 2); this.rects = new Array(n).fill([-9, -9, 0, 0]);
    O.Prompt.draw(g, x - 6, y + 1, 'tabL', { align: 'right' });
    items.forEach((s, j) => {
      const k = start + j, on = k === this.i, w = ws[j];
      this.rects[k] = [x, y, w, 15];
      px.rect(g, x, y, w, 15, on ? GOLD : '#1c2148'); px.rect(g, x, y + 14, w, 1, on ? '#a8701a' : '#0a0d22');
      UI.text(g, s, x + 7, y + 4, on ? '#1a1206' : '#c0c6e8', { shadow: false });
      x += w + 4;
    });
    O.Prompt.draw(g, x + 2, y + 1, 'tabR');
  }
}
UI.Tabs = Tabs;

// toasts (laurels, notes), drawn by the global overlay
UI.toasts = [];
UI.toast = (title, text = '', color = GOLD, o = {}) => { UI.toasts.push({ title, text, color, t: 0, dur: o.dur || 3.2, icon: o.icon || null }); if (UI.toasts.length > 3) UI.toasts.shift(); };
O.updaters.push(rdt => { for (const t of UI.toasts) t.t += rdt; UI.toasts = UI.toasts.filter(t => t.t < t.dur); });
O.overlays.push((r, g) => {
  let y = 14;
  for (const t of UI.toasts) {
    const k = Math.min(1, t.t / .2, (t.dur - t.t) / .3), w = Math.max(UI.tw(t.title, 1), UI.tw(t.text, 1)) + (t.icon ? 40 : 24), x = Math.round(r.W / 2 - w / 2), yy = Math.round(y - (1 - k) * 20);
    UI.panel(g, x, yy, w, t.text ? 30 : 18, { trim: t.color });
    if (t.icon) t.icon(g, x + 6, yy + 4);
    UI.text(g, t.title, x + (t.icon ? 32 : 12), yy + 5, t.color);
    if (t.text) UI.text(g, t.text, x + (t.icon ? 32 : 12), yy + 17, '#e6e9ff');
    y += 36;
  }
});

/** a big stamped word (FALSE START!, WORLD RECORD!): drawn over the scene with a pop and a tilt-free shake */
UI.stamp = (g, W, H, word, t, o = {}) => {
  const k = t < .12 ? 2.2 - t / .12 * 1.2 : 1, still = game.settings.motion, sh = still ? 0 : Math.round(Math.sin(t * 60) * Math.max(0, .25 - t) * 8);
  const scale = Math.max(2, Math.round((o.scale || 4) * (still ? 1 : k)));
  const y = Math.round((o.y || H * .32) + sh);
  E.font.title(g, word, Math.round(W / 2 + sh), y, { scale, colors: o.colors || ['#ffffff', '#ffe066', '#ff7a1a', '#e02a2a'], outline: '#1a0606', depth: 3, depthColor: '#5a0a0a', align: 'center' });
};

/** the screen's title bar: a heading and a gold rule */
UI.screenTitle = (g, W, s, o = {}) => {
  px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, 26, '#070a1c'));
  px.rect(g, 0, 26, W, 1, GOLD); px.rect(g, 0, 27, W, 1, '#7a5a10');
  UI.text(g, s, 14, 7, GOLD, { scale: 2 });
  if (o.right) { const ca = game.cornerArea && game.cornerArea(), pad = ca ? Math.max(14, W - ca.x0 + 6) : 14; UI.text(g, o.right, W - pad - UI.tw(o.right, 1), 11, '#aab0d0'); }
};
UI.backdrop = (g, W, H, top = '#14183c', bot = '#060812') => {
  const n = 12; for (let i = 0; i < n; i++) px.rect(g, 0, Math.floor(i * H / n), W, Math.ceil(H / n) + 1, E.mix(top, bot, i / (n - 1)));
  const t = game.real * 8; for (let i = 0; i < 26; i++) { const x = (i * 97 + t * (1 + i % 3)) % (W + 40) - 20, y = (i * 53) % H; px.blend(g, .12, 'add', () => px.rect(g, Math.round(x), y, 30 + (i % 4) * 12, 1, '#6a78c8')); }
};
})();
