// Pixel HUD widget kit: navigation, menus, panels, bars, rings. All layout is from hud.width / hud.height.
import { say, widthOf, wrap, sayWrapped } from './font.js';
import { pressed, held, ACTIONS } from '../core/actions.js';

/** Per-frame navigation intents from pad, keyboard and mouse. Menus read it in update(). */
export class Nav {
  constructor() { this.t = {}; this.reset(); }
  reset() { Object.assign(this, { up: false, down: false, left: false, right: false, confirm: false, back: false, pause: false, tabL: false, tabR: false, click: false, rclick: false, wheel: 0, px: -99, py: -99, moved: false, down1: false, any: false, triangle: false, stickX: 0, stickY: 0 }); }
  update(ctx, dt) {
    const input = ctx.input, hud = ctx.hud;
    const pa = input.padAxis;
    const dirs = {
      up: held(input, 'up') || pa.y > 0.55, down: held(input, 'down') || pa.y < -0.55,
      left: held(input, 'left') || pa.x < -0.55, right: held(input, 'right') || pa.x > 0.55,
    };
    for (const k of Object.keys(dirs)) {
      const st = this.t[k] ?? (this.t[k] = { on: false, tm: 0 });
      this[k] = false;
      if (dirs[k]) { if (!st.on) { st.on = true; st.tm = 0.38; this[k] = true; } else { st.tm -= dt; if (st.tm <= 0) { st.tm = 0.1; this[k] = true; } } } else st.on = false;
    }
    this.confirm = pressed(input, 'confirm');
    this.back = pressed(input, 'back');
    this.pause = (input.wasPressed('PadOptions') && !input.isDown('PadCreate')) || input.wasPressed('Escape', 'KeyP');
    this.tabL = pressed(input, 'tabL') || input.wasPressed('ArrowLeft') && false; this.tabR = pressed(input, 'tabR');
    this.triangle = pressed(input, 'triangle');
    this.click = input.wasPressed('MouseLeft'); this.rclick = input.wasPressed('MouseRight');
    this.down1 = input.isDown('MouseLeft');
    this.wheel = input.wheel;
    const p = input.pointer;
    const nx = (p.x + 1) / 2 * hud.width, ny = (1 - p.y) / 2 * hud.height;
    this.moved = Math.abs(nx - this.px) > 0.5 || Math.abs(ny - this.py) > 0.5;
    this.px = nx; this.py = ny;
    this.any = this.up || this.down || this.left || this.right || this.confirm || this.back || this.click || this.rclick;
    return this;
  }
}

export const inRect = (nav, r) => nav.px >= r.x && nav.px < r.x + r.w && nav.py >= r.y && nav.py < r.y + r.h;

/** Records widget rects so tests can assert that everything fits the screen. */
export const layoutLog = { rects: [], clear() { this.rects.length = 0; }, add(name, x, y, w, h) { this.rects.push({ name, x, y, w, h }); } };

export function panel(hud, x, y, w, h, { fill = 'white', edge = 'mist', shadow = true } = {}) {
  if (shadow) hud.rect(x + 2, y + 3, w, h, 'night');
  hud.rect(x - 1, y - 1, w + 2, h + 2, edge);
  hud.rect(x, y, w, h, fill);
  layoutLog.add('panel', x, y, w, h);
}
export function bar(hud, x, y, w, h, frac, { fill = 'teal', back = 'mist', edge = 'ink' } = {}) {
  hud.rect(x - 1, y - 1, w + 2, h + 2, edge); hud.rect(x, y, w, h, back);
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  if (fw > 0) hud.rect(x, y, fw, h, fill);
}
/** Filled disc as horizontal spans. */
export function disc(hud, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy + 0.25)); hud.rect(cx - hw, cy + dy, hw * 2 + 1, 1, color); }
}
/** Ring: thickness >= 2 art px so it survives 10 feet. */
export function ring(hud, cx, cy, r, color, t = 2) {
  const ri = Math.max(0, r - t);
  for (let dy = -r; dy <= r; dy++) {
    const xo = Math.floor(Math.sqrt(r * r - dy * dy + 0.25));
    if (Math.abs(dy) >= ri) { hud.rect(cx - xo, cy + dy, xo * 2 + 1, 1, color); continue; }
    const xi = Math.ceil(Math.sqrt(Math.max(0, ri * ri - dy * dy)));
    hud.rect(cx - xo, cy + dy, xo - xi + 1, 1, color); hud.rect(cx + xi, cy + dy, xo - xi + 1, 1, color);
  }
}
export function line(hud, x0, y0, x1, y1, color, t = 2) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
  for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; hud.rect(Math.round(x0 + (x1 - x0) * k - t / 2), Math.round(y0 + (y1 - y0) * k - t / 2), t, t, color); }
}
/** Row-based menu; focus by stick/keys/hover; slider drag. */
export class Menu {
  constructor(items, o = {}) {
    this.items = items; this.o = { w: 200, rowH: 16, scale: 1, title: null, x: null, y: null, ...o };
    this.focus = items.findIndex((i) => !i.disabled); if (this.focus < 0) this.focus = 0;
    this.rects = []; this.dragging = -1; this.scroll = 0; this.maxRows = o.maxRows ?? 8; this.name = o.name ?? 'menu';
  }
  get cur() { return this.items[this.focus]; }
  move(d) {
    const n = this.items.length; let i = this.focus;
    for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.items[i].disabled || this.items[i].focusable) break; }
    this.focus = i;
  }
  adjust(item, d) {
    if (item.kind === 'slider') { const v = Math.min(item.max, Math.max(item.min, +(item.get() + d * item.step).toFixed(4))); if (v !== item.get()) { item.set(v); this.o.onChange?.('slide', item); } }
    else if (item.kind === 'choice') { const n = item.options.length; item.set((item.get() + d + n) % n); this.o.onChange?.('choice', item); }
    else if (item.kind === 'toggle') { item.set(!item.get()); this.o.onChange?.('toggle', item); }
  }
  activate(item) {
    if (item.disabled) { this.o.onDenied?.(item); return; }
    if (item.kind === 'toggle' || item.kind === 'choice') this.adjust(item, 1);
    else if (item.kind === 'slider') { /* adjust with left/right */ } else item.onSelect?.(item);
    this.o.onChange?.('activate', item);
  }
  /** Returns true if input was used. */
  update(nav) {
    const vis = this.visibleRange();
    let used = false;
    if (nav.up) { this.move(-1); used = true; this.o.onMove?.(); }
    if (nav.down) { this.move(1); used = true; this.o.onMove?.(); }
    const it = this.cur;
    if (it && (nav.left || nav.right)) { const d = nav.right ? 1 : -1; if (it.kind === 'slider' || it.kind === 'choice' || it.kind === 'toggle') { this.adjust(it, d); used = true; } }
    if (nav.moved || nav.click) {
      for (let i = vis[0]; i < vis[1]; i++) { const r = this.rects[i]; if (r && inRect(nav, r)) { if (this.focus !== i && !this.items[i].disabled) { this.focus = i; this.o.onMove?.(); } if (nav.click) { this.focus = i; const item = this.items[i]; if (item.kind === 'slider') this.dragging = i; else { this.activate(item); used = true; } } } }
    }
    if (nav.wheel && this.items.length > this.maxRows) { this.scroll = Math.max(0, Math.min(this.items.length - this.maxRows, this.scroll + Math.sign(nav.wheel))); }
    if (this.dragging >= 0) {
      if (!nav.down1) this.dragging = -1;
      else { const it2 = this.items[this.dragging], br = it2._bar; if (br) { const f = Math.max(0, Math.min(1, (nav.px - br.x) / br.w)); const v = it2.min + f * (it2.max - it2.min); const q = Math.round(v / it2.step) * it2.step; const nv = +Math.min(it2.max, Math.max(it2.min, q)).toFixed(4); if (nv !== it2.get()) { it2.set(nv); this.o.onChange?.('slide', it2); } used = true; } }
    }
    if (nav.confirm && it && it.kind !== 'slider') { this.activate(it); used = true; }
    if (this.focus < this.scroll) this.scroll = this.focus;
    if (this.focus >= this.scroll + this.maxRows) this.scroll = this.focus - this.maxRows + 1;
    return used;
  }
  visibleRange() { return [this.scroll, Math.min(this.items.length, this.scroll + this.maxRows)]; }
  height() { return Math.min(this.items.length, this.maxRows) * this.o.rowH + (this.o.title ? 24 : 0) + 8; }
  draw(hud, { dim = false } = {}) {
    const o = this.o, sc = o.scale, w = o.w;
    const h = this.height();
    const x = o.x ?? Math.floor((hud.width - w) / 2), y = o.y ?? Math.floor((hud.height - h) / 2);
    if (o.panel !== false) panel(hud, x - 6, y - 4, w + 12, h + 4);
    layoutLog.add(this.name, x - 6, y - 4, w + 12, h + 4);
    let yy = y;
    if (o.title) { say(hud, x + 2, yy + 2, o.title, { color: 'teal', shadow: false, scale: 2 }); yy += 24; }
    this.rects = [];
    const vis = this.visibleRange();
    for (let i = vis[0]; i < vis[1]; i++) {
      const it = this.items[i], ry = yy + (i - vis[0]) * o.rowH, foc = i === this.focus;
      const r = { x, y: ry, w, h: o.rowH - 1 };
      this.rects[i] = r;
      if (foc) { hud.rect(r.x - 2, r.y, r.w + 4, r.h, 'cyan'); hud.rect(r.x - 2, r.y, 2, r.h, 'teal'); }
      const col = it.disabled ? 'slate' : 'ink';
      const ty = ry + Math.floor((o.rowH - 1 - 7 * sc) / 2);
      const label = typeof it.label === 'function' ? it.label() : it.label;
      say(hud, x + 5, ty, label, { color: col, shadow: false, scale: sc });
      if (it.kind === 'slider') {
        const bw = Math.floor(w * 0.34), bx = x + w - bw - 4;
        const f = (it.get() - it.min) / (it.max - it.min);
        const valTxt = it.fmt ? it.fmt(it.get()) : String(+it.get().toFixed(2));
        bar(hud, bx, ry + 5, bw, 5, f, { fill: foc ? 'teal' : 'sky' });
        hud.rect(bx + Math.round(bw * f) - 1, ry + 3, 3, 9, 'ink');
        say(hud, bx - 4 - widthOf(valTxt), ty, valTxt, { color: 'navy', shadow: false });
        it._bar = { x: bx, y: ry, w: bw, h: o.rowH };
      } else if (it.kind === 'toggle') say(hud, x + w - 6, ty, it.get() ? 'On' : 'Off', { color: it.get() ? 'teal' : 'slate', shadow: false, anchor: 'r' });
      else if (it.kind === 'choice') say(hud, x + w - 6, ty, '< ' + it.options[it.get()] + ' >', { color: 'navy', shadow: false, anchor: 'r' });
      else if (it.value) say(hud, x + w - 6, ty, typeof it.value === 'function' ? it.value() : it.value, { color: 'navy', shadow: false, anchor: 'r' });
    }
    if (this.items.length > this.maxRows) {
      const ax = x + w + 2;
      if (this.scroll > 0) say(hud, ax - 8, yy - 2, '^', { color: 'slate', shadow: false });
      if (vis[1] < this.items.length) say(hud, ax - 8, yy + this.maxRows * o.rowH - 8, 'v', { color: 'slate', shadow: false });
    }
    if (o.hint) { const it = this.cur; const hint = typeof it?.hint === 'function' ? it.hint() : it?.hint; if (hint) { const lines = Math.max(1, Math.ceil(hint.length * 6 / (w - 8))); hud.rect(x - 6, y + h + 3, w + 12, lines * 9 + 8, 'night'); sayWrapped(hud, x, y + h + 7, hint, w - 4, { color: 'white' }); layoutLog.add(this.name + '-hint', x - 6, y + h + 3, w + 12, lines * 9 + 8); } }
  }
}
export function slider(label, key, T, def, onChange) {
  return { label, kind: 'slider', min: def[0], max: def[1], step: def[2], get: () => T[key], set: (v) => { T[key] = v; onChange?.(); }, fmt: def[3] };
}

/** A strip of tabs; L1/R1 or click. */
export class Tabs {
  constructor(names) { this.names = names; this.i = 0; this.rects = []; }
  update(nav) { if (nav.tabL) this.i = (this.i + this.names.length - 1) % this.names.length; if (nav.tabR) this.i = (this.i + 1) % this.names.length; if (nav.click) this.rects.forEach((r, k) => { if (inRect(nav, r)) this.i = k; }); if (nav.wheel && false) this.i = this.i; }
  draw(hud, x, y, w) {
    const tw = Math.floor(w / this.names.length);
    this.rects = this.names.map((n, k) => {
      const r = { x: x + k * tw, y, w: tw - 2, h: 14 };
      hud.rect(r.x, r.y, r.w, r.h, k === this.i ? 'teal' : 'slate');
      say(hud, r.x + Math.floor(r.w / 2), r.y + 3, n, { anchor: 'c', color: 'white', shadow: false });
      return r;
    });
    layoutLog.add('tabs', x, y, w, 14);
  }
}
export function title(hud, text, y = 18, o = {}) { say(hud, hud.width / 2, y, text, { anchor: 'c', scale: o.scale ?? 3, color: o.color ?? 'white', shadow: 'navy' }); }
export function fitsScreen(hud, r, margin = 0) { return r.x >= margin && r.y >= margin && r.x + r.w <= hud.width - margin && r.y + r.h <= hud.height - margin; }
const STAR = ['...o...', '...o...', '..ooo..', 'ooooooo', '.ooooo.', '.oo.oo.', '.o...o.'];
const STAR_BIG = ['....o....', '....o....', '...ooo...', 'ooooooooo', '.ooooooo.', '..ooooo..', '.ooo.ooo.', '.oo...oo.', '.o.....o.'];
/** n of max stars; filled in sand, empty in mist. Returns width. */
export function drawStars(hud, x, y, n, max = 3, { big = false, pop = null } = {}) {
  const spr = big ? STAR_BIG : STAR, w = (big ? 9 : 7) + 2;
  for (let i = 0; i < max; i++) {
    const on = i < n && (pop === null || i < pop);
    hud.sprite(x + i * w, y, spr, { o: on ? 'sand' : 'mist' }, { shadow: on ? 'orange' : false });
  }
  return max * w;
}
