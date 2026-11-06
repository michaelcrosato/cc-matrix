// Everything on the HUD canvas goes through here: wrap, rich text with *highlights* and {button} tokens,
// glyphs, panels, the 10-foot clipboard motif, and pointer hit tests.
import { GLYPHS } from '../content/icons.js';
import { glyphsFor } from './prompts.js';

const TOKEN = /\{([a-z]+)\}/g;

export class UI {
  constructor(app, ctx) {
    this.app = app;
    this.ctx = ctx;
    this.hud = ctx.hud;
  }
  get w() { return this.hud.width; }
  get h() { return this.hud.height; }
  get device() { return this.app.devices.last; }
  get glyphStyle() { return this.app.save.settings.glyphs; }

  text(x, y, s, o = {}) { this.hud.text(Math.round(x), Math.round(y), s, o); }
  center(y, s, o = {}) {
    const m = this.hud.measure(s, o.scale ?? 1);
    this.hud.text(Math.round((this.w - m.width) / 2), Math.round(y), s, o);
  }
  right(x, y, s, o = {}) {
    const m = this.hud.measure(s, o.scale ?? 1);
    this.hud.text(Math.round(x - m.width), Math.round(y), s, o);
  }
  rect(x, y, w, h, c) { this.hud.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); }
  outline(x, y, w, h, c, t = 1) {
    this.rect(x, y, w, t, c); this.rect(x, y + h - t, w, t, c); this.rect(x, y, t, h, c); this.rect(x + w - t, y, t, h, c);
  }
  panel(x, y, w, h, fill = 'night', border = 'mist') {
    this.rect(x + 2, y + 2, w, h, 'ink');
    this.rect(x, y, w, h, fill);
    this.outline(x, y, w, h, border);
  }
  /** The clipboard: the game's chart and rubber-stamp motif instead of tables of data. */
  clipboard(x, y, w, h) {
    this.rect(x + 3, y + 3, w, h, 'ink');
    this.rect(x, y, w, h, 0xe9e1cc);
    this.outline(x, y, w, h, 0x8a7a5a);
    this.rect(x, y, w, 6, 0x6d5a3a);
    this.rect(x + w / 2 - 22, y - 5, 44, 11, 'slate');
    this.outline(x + w / 2 - 22, y - 5, 44, 11, 'mist');
    this.rect(x + w / 2 - 12, y - 2, 24, 3, 'white');
  }
  stamp(cx, cy, label, color, scale = 3) {
    const m = this.hud.measure(label, scale);
    const pad = 4;
    const x = cx - m.width / 2 - pad, y = cy - m.height / 2 - pad, w = m.width + pad * 2, h = m.height + pad * 2;
    this.outline(x, y, w, h, color, 2);
    this.text(cx - m.width / 2, cy - m.height / 2, label, { color, scale, shadow: false });
  }
  /** The largest whole scale at which text fits a width. */
  fit(text, maxW, maxScale = 4) {
    for (let k = maxScale; k > 1; k--) if (this.hud.measure(text, k).width <= maxW) return k;
    return 1;
  }
  hit(x, y, w, h) {
    const d = this.app.devices;
    return d.px >= x && d.px < x + w && d.py >= y && d.py < y + h;
  }

  // ------------------------------------------------------------ Glyphs
  glyphWidth(id) {
    if (id.startsWith('KEY:')) return this.hud.measure(id.slice(4), 1).width + 6;
    const g = GLYPHS[id];
    if (!g) return 0;
    if (g.pill) return this.hud.measure(g.pill, 1).width + 6;
    return 9;
  }
  glyph(x, y, id) {
    x = Math.round(x); y = Math.round(y);
    if (id.startsWith('KEY:')) {
      const label = id.slice(4);
      const w = this.glyphWidth(id);
      this.rect(x, y, w, 9, 'mist');
      this.rect(x, y + 8, w, 1, 'slate');
      this.rect(x + 1, y + 1, w - 2, 7, 'white');
      this.text(x + 3, y + 1, label, { color: 'ink', shadow: false });
      return w;
    }
    const g = GLYPHS[id];
    if (!g) return 0;
    if (g.pill) {
      const w = this.glyphWidth(id);
      this.rect(x, y, w, 9, 'ink');
      this.outline(x, y, w, 9, 'mist');
      this.text(x + 3, y + 1, g.pill, { color: 'white', shadow: false });
      return w;
    }
    this.hud.sprite(x, y, g.sprite, g.c);
    if (g.letter) this.text(x + 2, y + 1, g.letter, { color: 'white', shadow: false });
    return 9;
  }
  /** Draw an action's glyphs. Returns width. */
  action(x, y, name) {
    const list = glyphsFor(name, this.device, this.glyphStyle);
    if (!list) return 0;
    let cx = x;
    list.forEach((id, i) => {
      if (i) { this.text(cx, y + 1, name === 'paddles' ? '+' : '/', { color: 'white' }); cx += 7; }
      cx += this.glyph(cx, y, id) + 1;
    });
    return cx - x - 1;
  }
  actionWidth(name) {
    const list = glyphsFor(name, this.device, this.glyphStyle);
    if (!list) return 0;
    return list.reduce((a, id, i) => a + (i ? 7 : 0) + this.glyphWidth(id) + 1, -1);
  }

  // ------------------------------------------------------------ Rich text
  /** Split into runs: { t: text, hi: bool } | { action: name } */
  runs(str) {
    const out = [];
    let hi = false;
    let last = 0;
    const flush = (seg) => {
      if (!seg) return;
      const parts = seg.split('*');
      parts.forEach((p, i) => {
        if (i > 0) hi = !hi;
        if (p) out.push({ t: p, hi });
      });
    };
    str.replace(TOKEN, (m, name, idx) => {
      flush(str.slice(last, idx));
      out.push({ action: name });
      last = idx + m.length;
      return m;
    });
    flush(str.slice(last));
    return out;
  }
  widthOf(str, scale = 1) {
    let w = 0;
    for (const r of this.runs(str)) w += r.action ? this.actionWidth(r.action) * scale : this.hud.measure(r.t, scale).width;
    return w;
  }
  /** Greedy wrap that keeps tokens and highlights whole. */
  wrap(str, maxW, scale = 1) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    let hiOpen = false;
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (this.widthOf(test.replace(/\*/g, ''), scale) > maxW && cur) {
        lines.push(hiOpen ? `*${cur}` : cur);
        const stars = (cur.match(/\*/g) ?? []).length;
        if (stars % 2) hiOpen = !hiOpen;
        cur = word;
      } else cur = test;
    }
    if (cur) lines.push(hiOpen ? `*${cur}` : cur);
    return lines;
  }
  /** Rich text at (x, y). `chars` limits how many characters show (typewriter). Returns width. */
  rich(x, y, str, o = {}) {
    const color = o.color ?? 'white', hiColor = o.hi ?? 'sand', scale = o.scale ?? 1, shadow = o.shadow;
    let cx = Math.round(x);
    let left = o.chars ?? Infinity;
    const lineH = this.hud.measure('A', scale).height;
    for (const r of this.runs(str)) {
      if (left <= 0) break;
      if (r.action) {
        const gw = this.actionWidth(r.action);
        this.action(cx, Math.round(y + (lineH - 9) / 2), r.action);
        cx += gw;
        left -= 1;
        continue;
      }
      const shown = left >= r.t.length ? r.t : r.t.slice(0, left);
      left -= r.t.length;
      const opts = { color: r.hi ? hiColor : color, scale };
      if (shadow !== undefined) opts.shadow = shadow;
      this.text(cx, y, shown, opts);
      cx += this.hud.measure(r.t, scale).width;
    }
    return cx - x;
  }
  richCenter(y, str, o = {}) {
    const w = this.widthOf(str, o.scale ?? 1);
    return this.rich((this.w - w) / 2, y, str, o);
  }
  /** A row of [action, label] hints along the bottom. */
  hints(list, y = null, align = 'right') {
    const yy = y ?? this.h - 11;
    let total = 0;
    for (const [action, label] of list) total += this.actionWidth(action) + 3 + this.hud.measure(label, 1).width + 8;
    let x = align === 'right' ? this.w - total - 2 : align === 'center' ? (this.w - total) / 2 : 6;
    this.rect(x - 3, yy - 2, total + 2, 13, 'ink');
    for (const [action, label] of list) {
      x += this.action(x, yy, action) + 3;
      this.text(x, yy + 1, label, { color: 'white' });
      x += this.hud.measure(label, 1).width + 8;
    }
  }
}
