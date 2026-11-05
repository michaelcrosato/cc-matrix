/* 11-ui: the 10-foot canvas UI kit. Focus moves by d-pad, stick, keys or hover; confirm activates; cancel goes back.
 * Widgets lay out from r.W and r.H each draw and keep their hit rectangles for the next update. */
G.ui = {
  theme: { bg: ['#0f4c5c', '#0a2d3d'], night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', accent: '#5ff0ff' },
    border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', danger: '#ff7a7a' },
  safe(r) { return { x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) }; },
  box(g, x, y, w, h, o) { o = o || {}; const T = G.ui.theme; E.ui.box(g, x, y, w, h, { bg: o.bg || T.bg, border: o.border === undefined ? T.border : o.border, gradient: o.gradient !== false, alpha: o.alpha || 1 }); },
  /* the focus frame: 2 px gold, 1 px white inside, with a soft pulse */
  focus(g, x, y, w, h, t) {
    const pulse = .5 + .5 * Math.sin((t || 0) * 6);
    E.px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); E.px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a');
    E.px.rect(g, x - 2, y - 2, 2, h + 4, '#ffd36a'); E.px.rect(g, x + w, y - 2, 2, h + 4, '#ffd36a');
    E.px.rect(g, x, y, w, 1, '#fff8e8'); E.px.rect(g, x, y + h - 1, w, 1, '#fff8e8');
    E.px.rect(g, x, y, 1, h, '#fff8e8'); E.px.rect(g, x + w - 1, y, 1, h, '#fff8e8');
    if (E.px.blend) E.px.blend(g, .25 + .15 * pulse, 'add', () => E.px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffd36a'));
  },
  hit(rects, I) {
    const p = I.clicked && I.clicked();
    if (!p) return -1;
    for (let i = 0; i < rects.length; i++) { const q = rects[i]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h) return i; }
    return -2;
  }
};
/* a vertical list. items: { label, sub, value, disabled, onPick, icon(g,x,y), color } */
G.List = class {
  constructor(o) { this.items = o.items || []; this.x = o.x; this.y = o.y; this.w = o.w || 200; this.rowH = o.rowH || 26; this.i = o.i || 0; this.max = o.max || 8; this.top = 0; this.align = o.align || 'left'; this.rects = []; this.t = 0; this.wrap = o.wrap !== false; this.onFocus = o.onFocus; this.scale = o.scale || 2; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, Math.max(0, items.length - 1)); }
  update(I, dt) {
    this.t += dt;
    const n = this.items.length;
    if (!n) return null;
    let moved = false;
    if (I.repeat('up', .35, .09)) { this.i = this.wrap ? (this.i - 1 + n) % n : Math.max(0, this.i - 1); moved = true; }
    if (I.repeat('down', .35, .09)) { this.i = this.wrap ? (this.i + 1) % n : Math.min(n - 1, this.i + 1); moved = true; }
    if (I.pressed('confirm') && this.rects[this.i] && !this.items[this.i].disabled) {
      I.consume && I.consume('confirm'); const it = this.items[this.i]; if (it.onPick) it.onPick(it, this.i); return { item: it, i: this.i };
    }
    const hi = G.ui.hit(this.rects, I);
    if (hi >= 0 && !this.items[hi].disabled) { this.i = hi; const it = this.items[hi]; if (it.onPick) it.onPick(it, hi); return { item: it, i: hi }; }
    if (hi === -1 && I.mouse && I.mouse.active && this.rects.length) {
      const p = I.pointer(); for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h && k !== this.i) { this.i = k; moved = true; } }
    }
    if (moved && this.onFocus) this.onFocus(this.items[this.i], this.i);
    this.ensure(); return null;
  }
  ensure() { if (this.i < this.top) this.top = this.i; if (this.i >= this.top + this.max) this.top = this.i - this.max + 1; }
  draw(r, o) {
    o = o || {};
    if (this.fit !== false) this.max = Math.max(3, Math.min(this.maxAll || this.max, Math.floor((r.H - this.y - 30) / this.rowH)));
    if (this.maxAll === undefined) this.maxAll = this.max;
    this.rects = []; this.ensure();
    const vis = Math.min(this.max, this.items.length - this.top);
    r.overlay(g => {
      for (let k = 0; k < vis; k++) {
        const idx = this.top + k, it = this.items[idx], y = this.y + k * this.rowH, x = this.x, w = this.w, h = this.rowH - 4;
        this.rects[idx] = { x, y, w, h: this.rowH - 2 };
        const focused = idx === this.i && !o.noFocus;
        if (focused) { E.ui.box(g, x - 4, y - 3, w + 8, this.rowH - 2, { bg: ['#ffe9a6', '#f0b04a'], border: '#fff8e8', gradient: true, alpha: .9 }); }
        else E.ui.box(g, x - 4, y - 3, w + 8, this.rowH - 2, { bg: ['#0c3a4a', '#082833'], border: null, gradient: true, alpha: .75 });
        const ink = it.disabled ? '#6f8c92' : focused ? '#1a1a24' : (it.color || G.ui.theme.ink);
        if (it.icon) it.icon(g, x + 2, y + 4, focused);
        const lx = x + (it.icon ? 16 : 4);
        E.font.text(g, it.label, lx, y + 3, ink, { scale: this.scale, shadow: focused ? null : '#000' });
        if (it.value !== undefined && it.value !== null) {
          const vs = String(it.value); E.font.text(g, vs, x + w - 4, y + 3, focused ? '#1a1a24' : G.ui.theme.accent, { scale: this.scale, align: 'right', shadow: focused ? null : '#000' });
        }
        if (it.sub && focused && o.subLine) o.subLine(it, y);
      }
      if (this.items.length > this.max) {
        const bh = (this.max * this.rowH) * this.max / this.items.length;
        E.ui.bar(g, this.x + this.w + 8, this.y + (this.top / this.items.length) * this.max * this.rowH, 3, Math.max(8, bh), 1, '#ffd36a');
      }
    });
  }
};
/* a grid of cards, paged: cols x rows. Left and right move in a row; up and down between rows. */
G.Grid = class {
  constructor(o) { this.cols = o.cols || 3; this.rows = o.rows || 2; this.x = o.x; this.y = o.y; this.cw = o.cw || 84; this.ch = o.ch || 56; this.gap = o.gap || 6; this.items = o.items || []; this.i = 0; this.page = 0; this.rects = []; this.t = 0; this.onFocus = o.onFocus; }
  per() { return this.cols * this.rows; }
  pages() { return Math.max(1, Math.ceil(this.items.length / this.per())); }
  update(I, dt) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    if (I.repeat('left', .35, .1)) this.move(-1, 0);
    if (I.repeat('right', .35, .1)) this.move(1, 0);
    if (I.repeat('up', .35, .1)) this.move(0, -1);
    if (I.repeat('down', .35, .1)) this.move(0, 1);
    if (I.pressed('tabL') && this.pages() > 1) { this.page = (this.page + this.pages() - 1) % this.pages(); this.i = this.page * this.per(); }
    if (I.pressed('tabR') && this.pages() > 1) { this.page = (this.page + 1) % this.pages(); this.i = this.page * this.per(); }
    const hi = G.ui.hit(this.rects, I);
    if (hi >= 0) { this.i = hi; return { item: this.items[hi], i: hi, click: true }; }
    if (I.mouse && I.mouse.active && this.rects.length) { const p = I.pointer(); for (const k in this.rects) { const q = this.rects[k]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h && +k !== this.i) { this.i = +k; this.page = Math.floor(this.i / this.per()); } } }
    if (I.pressed('confirm') && this.items[this.i]) return { item: this.items[this.i], i: this.i, confirm: true };
    this.page = Math.floor(this.i / this.per());
    return null;
  }
  move(dx, dy) {
    const n = this.items.length, c = this.i % this.cols, r = Math.floor((this.i % this.per()) / this.cols);
    let nc = c + dx, nr = r + dy;
    if (nc < 0) nc = this.cols - 1; if (nc >= this.cols) nc = 0;
    if (nr < 0 || nr >= this.rows) return;
    let idx = Math.floor(this.i / this.per()) * this.per() + nr * this.cols + nc;
    if (idx >= n) idx = n - 1;
    if (idx !== this.i) { this.i = idx; if (this.onFocus) this.onFocus(this.items[idx], idx); }
  }
  draw(r, cell) {
    this.rects = [];
    const start = this.page * this.per();
    r.overlay(g => {
      for (let k = 0; k < this.per(); k++) {
        const idx = start + k; if (idx >= this.items.length) break;
        const cx = this.x + (k % this.cols) * (this.cw + this.gap), cy = this.y + Math.floor(k / this.cols) * (this.ch + this.gap);
        this.rects[idx] = { x: cx, y: cy, w: this.cw, h: this.ch };
        cell(g, this.items[idx], cx, cy, this.cw, this.ch, idx === this.i, idx);
        if (idx === this.i) G.ui.focus(g, cx, cy, this.cw, this.ch, this.t);
      }
    });
  }
};
/* toasts and notes over the screen */
G.toasts = [];
G.toast = function (text, secs) { G.toasts.push({ text, t: secs || 2.4, max: secs || 2.4 }); if (G.toasts.length > 3) G.toasts.shift(); };
G.drawToasts = function (r, dt) {
  if (!G.toasts.length) return;
  for (const t of G.toasts) t.t -= dt;
  G.toasts = G.toasts.filter(t => t.t > 0);
  r.overlay(g => {
    G.toasts.forEach((t, i) => {
      const w = Math.min(r.W - 40, E.font.width(t.text, { scale: 2 }) + 24), x = Math.round(r.W / 2 - w / 2), y = 20 + i * 24;
      const a = Math.min(1, t.t * 3, (t.max - t.t) * 6);
      E.ui.box(g, x, y, w, 18, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: a });
      E.font.text(g, t.text, x + w / 2, y + 4, '#fff8e8', { scale: 2, align: 'center', shadow: '#000' });
    });
  });
};
/* the standard frame of a screen: a title and its strap */
G.screenTitle = function (r, title, sub) {
  r.overlay(g => {
    E.font.text(g, title, r.W / 2, 14, '#ffd36a', { scale: 2, align: 'center', shadow: '#000' });
    if (sub) E.font.text(g, sub, r.W / 2, 32, '#9fd3d6', { align: 'center', shadow: '#000' });
  });
};
G.drawSmallText = function (r, s, x, y, col, o) { r.overlay(g => E.font.text(g, s, x, y, col || '#fff8e8', Object.assign({ shadow: '#000' }, o || {}))); };
