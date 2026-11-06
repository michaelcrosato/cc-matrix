// Pixel UI kit on ctx.hud: text, panels, lists, sliders, tabs, prompts. Immediate mode, one frame at a time.
// Identical screens for every input; mouse hover moves focus, click activates, glyphs follow the last device.
import { device, glyphName, glyphColor } from './device.js';
import { settings } from './settings.js';

const DIRS = {
  up: ['ArrowUp', 'KeyW', 'PadUp'], down: ['ArrowDown', 'KeyS', 'PadDown'], left: ['ArrowLeft', 'KeyA', 'PadLeft'], right: ['ArrowRight', 'KeyD', 'PadRight'],
};
const OK = ['Enter', 'NumpadEnter', 'PadCross'];
const BACK = ['Escape', 'Backspace', 'PadCircle'];

export class UI {
  constructor() {
    this.frame = 0; this.rects = []; this.nav = {}; this.hold = { up: 0, down: 0, left: 0, right: 0 };
    this.ptr = { x: -1, y: -1, moved: false, down: false }; this._lastNdc = [9, 9]; this.t = 0;
  }
  /** Start a frame: clear the HUD and read menu intents from input. */
  begin(ctx, opts = {}) {
    const { hud, input } = ctx;
    this.ctx = ctx; this.hud = hud; this.W = hud.width; this.H = hud.height; this.frame++; this.t += 1 / 60; this.rects.length = 0;
    if (!opts.keep) hud.clear();
    const n = this.nav = { up: false, down: false, left: false, right: false, ok: false, back: false, prev: false, next: false, second: false, third: false, click: false, rclick: false, scroll: 0, any: false };
    const ax = input.padAxis || { x: 0, y: 0 };
    const stick = { up: ax.y > 0.6, down: ax.y < -0.6, left: ax.x < -0.6, right: ax.x > 0.6 };
    for (const d of Object.keys(DIRS)) {
      const down = input.anyDown ? input.anyDown(DIRS[d]) || stick[d] : stick[d];
      if (down) {
        const h = this.hold[d]++;
        if (h === 0 || (h > 24 && (h - 24) % 7 === 0)) n[d] = true;
      } else this.hold[d] = 0;
    }
    n.ok = input.wasPressed(...OK);
    n.back = input.wasPressed(...BACK);
    n.prev = input.wasPressed('KeyQ', 'PadL1');
    n.next = input.wasPressed('KeyE', 'PadR1');
    n.second = input.wasPressed('KeyR', 'PadSquare');
    n.third = input.wasPressed('Tab', 'PadTriangle');
    n.scroll = input.wheel || 0;
    const p = input.pointer;
    const ex = (p.x + 1) / 2 * this.W, ey = (1 - p.y) / 2 * this.H;
    this.ptr.moved = Math.abs(p.x - this._lastNdc[0]) + Math.abs(p.y - this._lastNdc[1]) > 1e-4;
    this._lastNdc = [p.x, p.y];
    this.ptr.x = ex; this.ptr.y = ey; this.ptr.over = p.over;
    n.click = false; n.rclick = false;
    for (const e of input.buttonEvents || []) {
      if (!e.down) continue;
      const cx = (e.x + 1) / 2 * this.W, cy = (1 - e.y) / 2 * this.H;
      if (e.code === 'MouseLeft' || e.code === 'Touch') { n.click = true; this.ptr.cx = cx; this.ptr.cy = cy; }
      if (e.code === 'MouseRight') n.rclick = true;
    }
    n.any = n.up || n.down || n.left || n.right || n.ok || n.back || n.prev || n.next || n.click;
    return n;
  }
  inRect(r, x = this.ptr.x, y = this.ptr.y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
  text(x, y, s, o = {}) {
    let X = x;
    const sc = o.scale || 1;
    if (o.align === 'center' || o.align === 'right') { const w = this.hud.measure(s, sc).width; X = o.align === 'center' ? x - Math.floor(w / 2) : x - w; }
    this.hud.text(X, y, s, { color: o.color || 'white', shadow: o.shadow === undefined ? 'ink' : o.shadow, scale: sc });
  }
  measure(s, sc = 1) { return this.hud.measure(s, sc).width; }
  rect(x, y, w, h, c) { this.hud.rect(x, y, w, h, c); }
  panel(x, y, w, h, o = {}) {
    this.rect(x - 1, y - 1, w + 2, h + 2, o.edge || 'slate');
    this.rect(x, y, w, h, o.fill || 'ink');
    if (o.title) { this.text(x + 6, y + 5, o.title, { scale: 2, color: o.titleColor || 'sand' }); }
  }
  /** A button glyph for a verb at (x,y); returns its width. */
  glyph(verb, x, y) {
    const name = glyphName(verb);
    const w = Math.max(9, this.measure(name) + 4);
    const col = glyphColor(verb);
    if (device.kind === 'pad') {
      this.rect(x, y - 1, w, 9, 'ink'); this.rect(x + 1, y, w - 2, 7, col);
      this.hud.text(x + 2, y, name, { color: 'white', shadow: false });
    } else {
      this.rect(x, y - 1, w, 9, 'mist'); this.rect(x + 1, y, w - 2, 7, 'night');
      this.hud.text(x + 2, y, name, { color: 'white', shadow: false });
    }
    return w;
  }
  /** Prompt bar at the bottom: [[verb, label], ...] */
  prompts(list) {
    const y = this.H - 13;
    this.rect(0, y - 3, this.W, 16, 'ink');
    let total = 0;
    const items = list.map(([v, l]) => ({ v, l, w: Math.max(9, this.measure(glyphName(v)) + 4) + 3 + this.measure(l) + 10 }));
    for (const it of items) total += it.w;
    let x = Math.floor((this.W - total) / 2);
    for (const it of items) { const gw = this.glyph(it.v, x, y); this.text(x + gw + 3, y, it.l, { color: 'mist' }); x += it.w; }
  }
  /** A vertical list with a focus bar. Returns { ok, left, right } (ok = activated row or -1). */
  list(x, y, w, rows, state, o = {}) {
    const rh = o.rowH || 14, active = o.active !== false;
    state.i = Math.max(0, Math.min(rows.length - 1, state.i || 0));
    const res = { ok: -1, left: false, right: false, hover: -1 };
    for (let i = 0; i < rows.length; i++) {
      const r = { x, y: y + i * rh, w, h: rh - 1 };
      this.rects.push(r);
      if (active && this.ptr.moved && this.ptr.over && this.inRect(r)) state.i = i;
      if (active && this.nav.click && this.ptr.cx !== undefined && this.inRect(r, this.ptr.cx, this.ptr.cy)) { state.i = i; if (!rows[i].disabled) res.ok = i; }
    }
    if (active) {
      if (this.nav.up) state.i = (state.i + rows.length - 1) % rows.length;
      if (this.nav.down) state.i = (state.i + 1) % rows.length;
      if (this.nav.ok && !rows[state.i].disabled) res.ok = state.i;
      res.left = this.nav.left; res.right = this.nav.right;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], sel = i === state.i, yy = y + i * rh;
      if (sel) { this.rect(x, yy, w, rh - 1, 'navy'); this.rect(x, yy, 2, rh - 1, 'orange'); this.hud.text(x + 5 + (Math.sin(this.t * 8) > 0 ? 1 : 0), yy + 3, '>', { color: 'orange', shadow: false }); }
      const col = row.disabled ? 'slate' : sel ? 'white' : 'mist';
      this.text(x + 14, yy + 3, row.label, { color: row.color || col });
      if (row.value !== undefined) this.text(x + w - 4, yy + 3, String(row.value), { align: 'right', color: sel ? 'sand' : 'mist' });
    }
    res.hover = state.i;
    return res;
  }
  /** Slider drawn in a row; returns new value or null. Mouse drags when pointer is down inside. */
  slider(x, y, w, value, min, max, step, sel, defaultValue) {
    const bw = Math.min(100, w);
    this.rect(x, y + 2, bw, 5, 'night'); this.rect(x, y + 3, bw, 3, 'slate');
    const f = (value - min) / (max - min);
    this.rect(x, y + 3, Math.round(bw * f), 3, sel ? 'orange' : 'sand');
    this.rect(x + Math.round(bw * f) - 1, y, 3, 9, 'white');
    if (defaultValue !== undefined) { const df = (defaultValue - min) / (max - min); this.rect(x + Math.round(bw * df), y + 7, 1, 3, 'cyan'); }
    const hit = { x, y: y - 2, w: bw, h: 13 };
    let out = null;
    if (this.ctx.input.isDown('MouseLeft') && this.ptr.over && this.inRect(hit) && this.ptr.moved !== undefined) {
      const v = min + Math.max(0, Math.min(1, (this.ptr.x - x) / bw)) * (max - min);
      out = Math.round(v / step) * step;
    }
    return { out, w: bw };
  }
  tabs(x, y, names, index) {
    let cx = x; let clicked = -1;
    for (let i = 0; i < names.length; i++) {
      const w = this.measure(names[i]) + 10, r = { x: cx, y, w, h: 13 };
      const on = i === index;
      this.rect(cx, y, w, 13, on ? 'navy' : 'night');
      if (on) this.rect(cx, y + 12, w, 1, 'orange');
      this.text(cx + 5, y + 3, names[i], { color: on ? 'white' : 'slate' });
      if (this.nav.click && this.ptr.cx !== undefined && this.inRect(r, this.ptr.cx, this.ptr.cy)) clicked = i;
      cx += w + 2;
    }
    return clicked;
  }
  /** Wrap text to a width in art pixels. */
  wrap(s, w, sc = 1) {
    const words = String(s).split(' '); const lines = []; let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (this.measure(t, sc) > w && line) { lines.push(line); line = wd; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  paragraph(x, y, w, s, o = {}) {
    const lines = this.wrap(s, w, o.scale || 1);
    lines.forEach((l, i) => this.text(x, y + i * (o.lh || 10), l, o));
    return lines.length;
  }
  bar(x, y, w, h, f, color, back = 'night') {
    this.rect(x - 1, y - 1, w + 2, h + 2, 'ink'); this.rect(x, y, w, h, back);
    this.rect(x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, f)))), h, color);
  }
  /** Convert a world position to art pixels via the camera. */
  project(cam, v, out = {}) {
    const p = v.clone ? v.clone() : { ...v }; p.project(cam);
    out.x = (p.x + 1) / 2 * this.W; out.y = (1 - p.y) / 2 * this.H; out.z = p.z; out.vis = p.z < 1 && p.z > -1;
    return out;
  }
}
export const ui = new UI();
export { settings };
