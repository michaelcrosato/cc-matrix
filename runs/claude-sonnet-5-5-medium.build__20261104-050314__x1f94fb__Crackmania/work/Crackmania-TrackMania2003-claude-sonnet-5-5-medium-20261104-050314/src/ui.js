// 10-foot UI kit: focus panes (keys, pad, mouse hover + click), prompt bar with glyphs by last device, sliders, dialogs.
const E = globalThis.My3D2dge;
export const C = { bg: '#0e1230', panel: '#141a3a', edge: '#e8e4ff', hot: '#ffd36a', dim: '#6a6488', text: '#ffffff', good: '#7af0a0', bad: '#ff7a6a', shade: '#05040a' };
const text = (g, s, x, y, col = C.text, o = {}) => E.font.text(g, String(s), x, y, col, Object.assign({ shadow: C.shade, outline: false }, o));
export const tw = (s, scale = 1) => E.font.width(String(s)) * scale;
export const veil = (g, r, a = .55, y0 = 0) => { g.save(); g.fillStyle = '#05030c'; g.globalAlpha = a; g.fillRect(0, y0, r.bw || r.W, (r.bh || r.H) - y0); g.restore(); g._c = null; };
export const box = (g, x, y, w, h, hot = false, col) => E.ui.box(g, x, y, w, h, { bg: hot ? '#2a2f66' : C.panel, border: hot ? col || C.hot : C.edge });

/** the prompt bar: [[action, 'Label'], ...] drawn at the bottom with the glyph of the device used last */
export function prompts(game, g, r, list) {
  const I = game.input; let x = 10; const y = r.H - 16;
  for (const [a, label] of list) {
    const k = typeof a === 'string' && I.map[a] ? I.label(a) : a, s = k || '?';
    const w = tw(s) + 8; box(g, x, y - 3, w, 13, false); text(g, s, x + 4, y, C.hot);
    text(g, label, x + w + 4, y, C.text); x += w + tw(label) + 18;
  }
}

/** a focus pane over items [{ label, sub, locked, tag, color }], laid out in `cols` columns. update() returns the picked index or -1. */
export class Pane {
  constructor(game, items, o = {}) { this.game = game; this.items = items; this.i = 0; this.cols = o.cols || 1; this.o = o; this.rects = []; this._mt = null; this.onCancel = o.onCancel || null; this.title = o.title; this.sub = o.sub; }
  setItems(items, keep) { this.items = items; if (!keep) this.i = 0; this.i = Math.min(this.i, Math.max(0, items.length - 1)); }
  update() {
    const I = this.game.input, n = this.items.length; if (!n) return -1;
    const old = this.i, c = this.cols;
    if (I.repeat('down')) this.i = this.i + c < n ? this.i + c : (c === 1 ? 0 : this.i);
    if (I.repeat('up')) this.i = this.i - c >= 0 ? this.i - c : (c === 1 ? n - 1 : this.i);
    if (I.repeat('right') && c > 1 && this.i % c < c - 1 && this.i + 1 < n) this.i++;
    if (I.repeat('left') && c > 1 && this.i % c > 0) this.i--;
    const hit = p => { if (!p) return -1; for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) return k; } return -1; };
    if (I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = hit(I.pointer()); if (k >= 0) this.i = k; }
    const click = hit(I.clicked()); if (click >= 0) this.i = click;
    if (this.i !== old) this.game.audio.sfx('select');
    if (I.pressed('confirm') || click >= 0) {
      const it = this.items[this.i];
      if (it && it.locked) { this.game.audio.sfx('denied'); return -1; }
      I.consumeAll(); this.game.audio.sfx('confirm'); return this.i;
    }
    if (I.pressed('cancel') && this.onCancel) { I.consumeAll(); this.game.audio.sfx('cancel'); this.onCancel(); }
    return -1;
  }
  /** compute where each item sits in the region x,y,w,h (rows when cols = 1, else tiles); draw() calls it */
  layout(x, y, w, h) {
    const n = this.items.length, c = this.cols, rows = Math.ceil(n / c), gap = 6, tileW = Math.floor((w - gap * (c - 1)) / c);
    const tileH = this.o.tileH || Math.min(c === 1 ? 24 : 54, Math.floor((h - gap * (rows - 1)) / rows));
    const per = Math.max(1, Math.floor((h + gap) / (tileH + gap))), first = c === 1 ? Math.max(0, Math.min(this.i - Math.floor(per / 2), n - per)) : 0;
    this.rects = new Array(n).fill(null); this._lay = { tileW, tileH, per, first, c, n, x, y, w, h };
    for (let k = first; k < Math.min(n, first + (c === 1 ? per : n)); k++) { const col = k % c, row = c === 1 ? k - first : Math.floor(k / c); this.rects[k] = [x + col * (tileW + gap), y + row * (tileH + gap), tileW, tileH]; }
    return this._lay;
  }
  draw(g, x, y, w, h) {
    const L = this.layout(x, y, w, h), { tileH, per, first, c, n } = L;
    for (let k = 0; k < n; k++) {
      const q = this.rects[k]; if (!q) continue; const it = this.items[k], [tx, ty, tileW] = q, hot = k === this.i;
      box(g, tx, ty, tileW, tileH, hot, it.color);
      const big = tileH >= 28, sc = big ? 2 : 1, ly = it.sub ? ty + (big ? 3 : 3) : ty + Math.round((tileH - 7 * sc) / 2);
      text(g, it.label, tx + 8, ly, it.locked ? C.dim : hot ? C.hot : C.text, { scale: sc });
      if (it.sub) text(g, it.sub, tx + 8, ty + tileH - 10, it.locked ? C.dim : '#b8b0d8');
      if (it.tag) text(g, it.tag, tx + tileW - 8 - tw(it.tag), ty + 4, it.tagColor || C.hot);
      if (it.locked) text(g, 'LOCKED', tx + tileW - 8 - tw('LOCKED'), ty + tileH - 10, C.dim);
    }
    if (c === 1 && n > per) { text(g, first > 0 ? '^' : ' ', x + w - 10, y - 2, C.hot); text(g, first + per < n ? 'v' : ' ', x + w - 10, y + h - 8, C.hot); }
  }
}

/** the header used by every page */
export function header(g, r, title, sub) {
  text(g, title, 14, 10, C.hot, { scale: 3 });
  if (sub) text(g, sub, 16, 36, '#b8b0d8');
}

/** slider rows: items [{ key, label, min, max, step }], values object; returns when the focused slider changed */
export class Sliders {
  constructor(game, specs, values, defaults) { this.game = game; this.specs = specs; this.v = values; this.d = defaults; this.i = 0; this.rects = []; this._mt = null; }
  update() {
    const I = this.game.input, n = this.specs.length + 1; let ch = false;
    if (I.repeat('down')) this.i = (this.i + 1) % n; if (I.repeat('up')) this.i = (this.i + n - 1) % n;
    const hit = p => { if (!p) return -1; for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) return k; } return -1; };
    if (I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = hit(I.pointer()); if (k >= 0) this.i = k; }
    const cl = I.clicked(), k = hit(cl);
    if (k >= 0) { this.i = k; if (k < this.specs.length) { const s = this.specs[k], q = this.rects[k], f = Math.max(0, Math.min(1, (cl[0] - q[0] - 118) / (q[2] - 126))); this.v[s[0]] = +(Math.round((s[2] + (s[3] - s[2]) * f) / s[4]) * s[4]).toFixed(3); ch = true; } else { Object.assign(this.v, this.d); ch = true; } }
    if (this.i < this.specs.length) {
      const s = this.specs[this.i], dir = (I.repeat('right') ? 1 : 0) - (I.repeat('left') ? 1 : 0);
      if (dir) { this.v[s[0]] = +Math.max(s[2], Math.min(s[3], this.v[s[0]] + dir * s[4])).toFixed(3); ch = true; }
    } else if (I.pressed('confirm')) { Object.assign(this.v, this.d); ch = true; this.game.audio.sfx('confirm'); }
    return ch;
  }
  draw(g, x, y, w) {
    const rh = 11; this.rects = [];
    for (let k = 0; k <= this.specs.length; k++) {
      const yy = y + k * rh, hot = k === this.i; this.rects[k] = [x, yy, w, rh - 1];
      if (hot) E.px.rect(g, x, yy, w, rh - 1, '#2a2f66');
      if (k === this.specs.length) { text(g, 'RESET TO DEFAULTS', x + 6, yy + 2, hot ? C.hot : C.good); continue; }
      const s = this.specs[k], f = (this.v[s[0]] - s[2]) / (s[3] - s[2]);
      text(g, s[1], x + 6, yy + 2, hot ? C.hot : C.text);
      E.px.rect(g, x + 118, yy + 4, w - 126, 3, '#3a3a6a'); E.px.rect(g, x + 118, yy + 4, (w - 126) * f, 3, hot ? C.hot : '#8a8ad0'); E.px.rect(g, x + 118 + (w - 126) * f - 2, yy + 1, 4, 8, hot ? '#fff' : '#ccc');
      const val = String(+this.v[s[0]].toFixed(2)); text(g, val, x + w - 6 - tw(val), yy + 2, C.hot);
    }
  }
}

/** a dialog line with a typewriter and gibberish voice */
export class Talk {
  constructor(game, babble) { this.game = game; this.babble = babble; this.q = []; this.cur = null; this.t = 0; }
  say(who, lines, done) { this.q = lines.map(l => ({ who, l })); this.done = done; this.next(); }
  next() { this.cur = this.q.shift() || null; this.t = 0; if (this.cur) this.babble(this.game, this.cur.l, this.cur.who.pitch); else if (this.done) { const d = this.done; this.done = null; d(); } }
  get active() { return !!this.cur; }
  update(dt) {
    if (!this.cur) return; this.t += dt;
    const I = this.game.input;
    if (I.pressed('confirm') || I.clicked()) { I.consumeAll(); if (this.t * 40 < this.cur.l.length) this.t = 99; else this.next(); }
  }
  draw(g, r) {
    if (!this.cur) return; const w = r.W - 40, h = 56, x = 20, y = r.H - h - 24;
    box(g, x, y, w, h, true, this.cur.who.color); text(g, this.cur.who.name, x + 8, y + 5, this.cur.who.color, { scale: 1.5 });
    text(g, this.cur.l.slice(0, Math.floor(this.t * 40)), x + 8, y + 24, C.text, { scale: 1.5 });
    if (this.t * 40 >= this.cur.l.length && Math.floor(this.game.real * 3) % 2) text(g, this.game.input.label('confirm') + ' >', x + w - 40, y + h - 12, C.hot);
  }
}
