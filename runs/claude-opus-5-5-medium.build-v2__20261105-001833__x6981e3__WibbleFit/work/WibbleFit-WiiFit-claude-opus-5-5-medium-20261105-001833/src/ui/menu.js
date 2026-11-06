// The menu widget: one UI for pad, keyboard and mouse.
import { ACTIONS } from '../core/actions.js';
import { App } from '../app.js';
import { say, textWidth } from './font.js';
import { note, panel, bar } from './widgets.js';

export class Nav {
  rx = 0; ry = 0; ax = 0; ay = 0; mouseWheelAcc = 0;
  read(ctx, dt) {
    const i = ctx.input, out = { up: false, down: false, left: false, right: false };
    out.up = i.wasPressed(...ACTIONS.up); out.down = i.wasPressed(...ACTIONS.down);
    out.left = i.wasPressed(...ACTIONS.left); out.right = i.wasPressed(...ACTIONS.right);
    const s = i.padAxis ?? { x: 0, y: 0 };
    const hold = (dirNow, key, fire) => {
      if (dirNow) { this[key] += dt; if (this[key] > 0.4) { this[key] -= 0.12; fire(); } } else if (key === 'ry' ? !out.up && !out.down : !out.left && !out.right) this[key] = 0;
    };
    const vKeys = i.anyDown(ACTIONS.up) ? 1 : i.anyDown(ACTIONS.down) ? -1 : 0, hKeys = i.anyDown(ACTIONS.right) ? 1 : i.anyDown(ACTIONS.left) ? -1 : 0;
    const sy = s.y > 0.5 ? 1 : s.y < -0.5 ? -1 : 0, sx = s.x > 0.5 ? 1 : s.x < -0.5 ? -1 : 0;
    if (sy && !this.ay) { if (sy > 0) out.up = true; else out.down = true; }
    if (sx && !this.ax) { if (sx > 0) out.right = true; else out.left = true; }
    this.ay = sy; this.ax = sx;
    const v = vKeys || sy, h = hKeys || sx;
    hold(!!v, 'ry', () => { if (v > 0) out.up = true; else out.down = true; });
    hold(!!h, 'rx', () => { if (h > 0) out.right = true; else out.left = true; });
    return out;
  }
}
export const pointerArt = (ctx) => { const p = ctx.input.pointer, h = ctx.hud; return { x: ((p.x + 1) / 2) * h.width, y: ((1 - p.y) / 2) * h.height }; };

// items: { label, on, value(), adjust(dir), disabled, slider: {get, min, max}, remark, right }
export class Menu {
  index = 0; top = 0; nav = new Nav(); rows = []; grab = false;
  constructor({ items = [], title = null, subtitle = null, onBack = null, w = null, maxRows = 8, y = null, scale = 2, x = null, rowH = null, fill = 'white' } = {}) {
    Object.assign(this, { items, title, subtitle, onBack, w, maxRows, y, scale, x, rowH, fill });
    this.index = Math.max(0, items.findIndex((it) => !it.disabled));
  }
  setItems(items) { this.items = items; if (this.index >= items.length) this.index = Math.max(0, items.length - 1); }
  move(d) {
    const n = this.items.length; if (!n) return;
    let i = this.index;
    for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.items[i].skip) break; }
    if (i !== this.index) { this.index = i; App.sfx('menuMove'); }
    this.scrollTo();
  }
  scrollTo() { if (this.index < this.top) this.top = this.index; if (this.index >= this.top + this.maxRows) this.top = this.index - this.maxRows + 1; }
  update(ctx, dt) {
    const input = ctx.input, n = this.nav.read(ctx, dt);
    if (n.up) this.move(-1);
    if (n.down) this.move(1);
    const cur = this.items[this.index];
    if (cur?.adjust) { if (n.left) { cur.adjust(-1); App.sfx('menuMove'); } if (n.right) { cur.adjust(1); App.sfx('menuMove'); } }
    // Mouse: hover moves focus, wheel scrolls, click confirms, sliders drag.
    const moved = App.device.moved > 0;
    const m = pointerArt(ctx);
    const hover = this.rows.find((r) => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
    if (App.device.last === 'mouse') {
      if (hover && moved && hover.i !== this.index && !this.items[hover.i].skip) { this.index = hover.i; App.sfx('menuMove'); }
      if (input.wheel) this.top = Math.max(0, Math.min(Math.max(0, this.items.length - this.maxRows), this.top + Math.sign(input.wheel)));
    }
    const c = this.items[this.index];
    if (hover && input.wasPressed('MouseLeft')) {
      const it = this.items[hover.i];
      if (it.slider && hover.sx != null && m.x >= hover.sx) this.grab = hover.i;
      else if (it.adjust && !it.on) it.adjust(m.x > hover.x + hover.w / 2 ? 1 : -1);
      else this.activate(it);
      return;
    }
    if (this.grab !== false) {
      const it = this.items[this.grab], r = this.rows.find((q) => q.i === this.grab);
      if (!input.isDown('MouseLeft') || !r) this.grab = false;
      else if (it?.slider) { const f = Math.max(0, Math.min(1, (m.x - r.sx) / r.sw)); it.slider.set(it.slider.min + f * (it.slider.max - it.slider.min)); }
    }
    if (input.wasPressed(...ACTIONS.menuConfirm) && c) this.activate(c);
    else if (input.wasPressed(...ACTIONS.back) && this.onBack) { App.sfx('menuBack'); this.onBack(); }
  }
  activate(it) {
    if (it.disabled) { App.sfx('wobble'); return; }
    if (it.on) { App.sfx('menuConfirm'); it.on(); } else if (it.adjust) { it.adjust(1); App.sfx('menuMove'); }
  }
  draw(hud) {
    const s = this.scale, rowH = this.rowH ?? (s === 2 ? 19 : 13), vis = Math.min(this.maxRows, this.items.length);
    const longest = this.items.reduce((a, it) => Math.max(a, it.label.length + (it.value ? 1 + String(it.value()).length : 0) + (it.slider ? 12 : 0)), 8);
    const needW = Math.max(longest * 6 * s + 24, this.title ? textWidth(this.title, s) + 24 : 0);
    const w = Math.min(hud.width - 24, this.w ?? needW);
    const titleH = (this.title ? 20 : 0) + (this.subtitle ? 12 : 0);
    const h = vis * rowH + titleH + 12;
    const x = Math.round(this.x ?? (hud.width - w) / 2), y = Math.round(this.y ?? Math.max(12, (hud.height - 16 - h) / 2));
    panel(hud, x, y, w, h, this.fill, 'mist');
    let ty = y + 6;
    if (this.title) { say(hud, x + 10, ty, this.title, { color: 'teal', shadow: false, scale: s }); ty += 20; }
    if (this.subtitle) { say(hud, x + 10, ty, this.subtitle, { color: 'slate', shadow: false }); ty += 12; }
    this.rows = [];
    for (let k = 0; k < vis; k++) {
      const i = k + this.top, it = this.items[i]; if (!it) break;
      const ry = ty + k * rowH, on = i === this.index, tcolor = it.disabled ? 'mist' : on ? 'white' : 'ink';
      if (on) hud.rect(x + 4, ry - 1, w - 8, rowH - 2, it.disabled ? 'slate' : 'teal');
      const row = { i, x: x + 4, y: ry - 1, w: w - 8, h: rowH - 1 };
      let sc = s;
      const val = it.value ? String(it.value()) : '';
      if ((it.label.length + (val ? val.length + 1 : 0)) * 6 * sc + 16 + (it.slider ? 60 : 0) > w) sc = 1;
      const ly = ry + Math.floor((rowH - 2 - 7 * sc) / 2);
      say(hud, x + 10, ly, it.label, { color: tcolor, shadow: false, scale: sc });
      note(x + 10, ly, textWidth(it.label, sc), 7 * sc, 'menu-label');
      if (it.slider) {
        const sw = Math.min(90, Math.floor(w * 0.28)), sx = x + w - sw - 12 - (val ? textWidth(val) + 6 : 0);
        bar(hud, sx, ry + 3, sw, 8, (it.slider.get() - it.slider.min) / (it.slider.max - it.slider.min), on ? 'cyan' : 'sky', 'night');
        row.sx = sx; row.sw = sw;
        if (val) say(hud, x + w - 10 - textWidth(val), ry + 3, val, { color: tcolor, shadow: false });
      } else if (val) {
        const vx = x + w - 10 - textWidth(val, sc);
        say(hud, vx, ly, val, { color: on ? 'sand' : 'slate', shadow: false, scale: sc });
      }
      if (it.draw) it.draw(hud, x, ry, w, on, rowH);
      this.rows.push(row);
    }
    if (this.top > 0) hud.rect(x + w - 8, y + 4, 4, 4, 'slate');
    if (this.top + vis < this.items.length) hud.rect(x + w - 8, y + h - 8, 4, 4, 'slate');
    note(x, y, w, h, 'menu');
    return { x, y, w, h };
  }
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
