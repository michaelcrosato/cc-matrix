// The one menu. D-pad, stick (with repeat), arrows, WASD, hover, click, wheel, slider drag.
import { App } from '../app.js';
import { BACK, CONFIRM, MENU_DOWN, MENU_LEFT, MENU_RIGHT, MENU_UP } from '../core/actions.js';
import { ABOVE_PROMPTS, layout } from './layout.js';
import { say, sayCentered, sayRight, textWidth } from './font.js';
import { bar, panel, SAFE, starRow, starRowWidth } from './widgets.js';

const REPEAT_FIRST = 0.34;
const REPEAT_NEXT = 0.11;

export class NavRepeat {
  dir = 0; timer = 0;
  /** dirNow -1/0/1: returns a step when it should fire. */
  step(dirNow, dt) {
    if (dirNow === 0) { this.dir = 0; this.timer = 0; return 0; }
    if (dirNow !== this.dir) { this.dir = dirNow; this.timer = REPEAT_FIRST; return dirNow; }
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = REPEAT_NEXT; return dirNow; }
    return 0;
  }
}

/** Direction helpers shared by menus, the name grid and the Locker Room. */
export function navY(input) {
  const stick = input.padAxis.y;
  if (input.anyDown(MENU_UP) || stick > 0.5) return -1;
  if (input.anyDown(MENU_DOWN) || stick < -0.5) return 1;
  return 0;
}
export function navX(input) {
  const stick = input.padAxis.x;
  if (input.anyDown(MENU_LEFT) || stick < -0.5) return -1;
  if (input.anyDown(MENU_RIGHT) || stick > 0.5) return 1;
  return 0;
}

export const pressed = (input, codes) => input.wasPressed(...codes);
const CONFIRM_NO_E = CONFIRM.filter((c) => c !== 'KeyE');

export class Menu {
  focus = 0;
  top = 0;
  rects = [];
  vert = new NavRepeat();
  horz = new NavRepeat();

  /**
   * items: { label, action, disabled, value() , adjust(dir), slider: {get, set, min, max}, right(), locked, id }
   * opts: { y, width, scale, rowH, maxRows, onBack, align, panel, tabbed }
   */
  constructor(items, opts = {}) {
    this.items = items;
    this.o = { scale: 2, maxRows: 8, panel: true, align: 'left', ...opts };
    this.focus = this.firstEnabled();
  }

  firstEnabled() {
    const i = this.items.findIndex((it) => !it.disabled);
    return i < 0 ? 0 : i;
  }

  setItems(items) {
    this.items = items;
    this.focus = Math.min(this.focus, Math.max(0, items.length - 1));
    this.keepInView();
  }

  label(item) { return typeof item.label === 'function' ? item.label() : item.label; }

  get rowH() { return this.o.rowH ?? (this.o.scale >= 2 ? 22 : 14); }

  move(dir) {
    const n = this.items.length;
    if (!n) return;
    let i = this.focus;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.items[i].disabled || this.items[i].focusable) break;
    }
    if (i !== this.focus) { this.focus = i; App.sfx('menuMove'); }
    this.keepInView();
  }

  keepInView() {
    const max = this.visibleRows();
    this.top = Math.floor(this.focus / max) * max;
  }

  get pageCount() { return Math.max(1, Math.ceil(this.items.length / this.visibleRows())); }

  visibleRows() {
    const hud = App.ctx?.hud;
    const h = hud ? hud.height : 270;
    const avail = h - (this.o.y ?? 56) - ABOVE_PROMPTS - 8;
    return Math.max(1, Math.min(this.o.maxRows, Math.floor(avail / this.rowH)));
  }

  activate(item) {
    if (!item || item.disabled) { App.sfx('menuBack'); return; }
    App.sfx(item.sound ?? 'menuConfirm');
    item.action?.();
  }

  update(ctx, dt) {
    const { input } = ctx;
    const uiDt = dt || 1 / 60;
    const dy = this.vert.step(navY(input), uiDt);
    if (dy) this.move(dy);
    const dx = this.horz.step(navX(input), uiDt);
    const item = this.items[this.focus];
    if (dx && item) {
      if (item.adjust) { item.adjust(dx); App.sfx('menuMove'); } else if (this.o.onLeftRight) this.o.onLeftRight(dx);
    }
    if (pressed(input, this.o.tabbed ? CONFIRM_NO_E : CONFIRM)) this.activate(item);
    if (pressed(input, BACK) || input.wasPressed('MouseRight')) { if (this.o.onBack) { App.sfx('menuBack'); this.o.onBack(); return; } }

    // mouse
    const dev = App.device;
    const p = dev.pointerArt(ctx);
    const inside = (r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    if (dev.moved > 0) {
      for (const r of this.rects) if (inside(r) && !this.items[r.i].disabled && this.focus !== r.i) { this.focus = r.i; App.sfx('menuMove', { volume: 0.5 }); }
    }
    if (input.wheel) {
      const max = this.visibleRows();
      const page = Math.max(0, Math.min(this.pageCount - 1, Math.floor(this.top / max) + Math.sign(input.wheel)));
      if (page * max !== this.top) { this.top = page * max; this.focus = this.top; App.sfx('menuMove', { volume: 0.5 }); }
    }
    if (input.wasPressed('MouseLeft')) {
      for (const r of this.rects) if (inside(r)) { this.focus = r.i; if (!this.items[r.i].slider) this.activate(this.items[r.i]); break; }
    }
    if (input.isDown('MouseLeft')) {
      for (const r of this.rects) {
        const it = this.items[r.i];
        if (it.slider && r.sx !== undefined && inside(r)) {
          const f = Math.max(0, Math.min(1, (p.x - r.sx) / r.sw));
          it.slider.set(it.slider.min + f * (it.slider.max - it.slider.min));
        }
      }
    }
  }

  draw(ctx) {
    const { hud } = ctx;
    const scale = this.o.scale;
    const rowH = this.rowH;
    const rows = this.visibleRows();
    this.keepInView(); // the window may have changed size
    // The panel adds 4 px a side, and all of it stays inside the safe margin. o.x is the panel's left edge.
    const width = Math.min(this.o.width ?? 300, hud.width - SAFE * 2 - 8 - (this.o.x !== undefined ? this.o.x - SAFE : 0));
    const x = this.o.x !== undefined ? this.o.x + 4 : Math.round((hud.width - width) / 2);
    const y = this.o.y ?? 56;
    const shown = this.items.slice(this.top, this.top + rows);
    const totalH = shown.length * rowH;
    if (this.o.panel) panel(hud, x - 4, y - 4, width + 8, totalH + 6, { fill: 'night', border: 'ink', name: 'menu-panel' });
    this.rects = [];
    shown.forEach((item, k) => {
      const i = this.top + k;
      const ry = y + k * rowH;
      const focused = i === this.focus;
      const r = { i, x, y: ry, w: width, h: rowH - 2 };
      if (focused) hud.rect(x - 1, ry - 1, width + 2, rowH - 1, 'cyan');
      const color = item.disabled ? 'slate' : focused ? 'ink' : 'white';
      const shadow = focused ? false : 'ink';
      const ty = ry + Math.round((rowH - 2 - 9 * scale) / 2) + 1;
      let label = String(this.label(item));
      const right = item.value ? String(item.value()) : item.right ? String(item.right()) : '';
      const sliderW = item.slider ? Math.min(70, Math.round(width * 0.28)) : 0;
      const starsW = item.stars !== undefined ? starRowWidth(1) + 6 : 0;
      const room = width - 8 - (right ? textWidth(right, scale) + 8 : 0) - (sliderW ? sliderW + 6 : 0) - starsW;
      const maxChars = Math.max(1, Math.floor(room / (6 * scale)));
      if (label.length > maxChars) label = `${label.slice(0, Math.max(1, maxChars - 1))}.`;
      if (this.o.align === 'center' && !right) sayCentered(hud, x + width / 2, ty, label, { scale, color, shadow, name: 'menu-row' });
      else say(hud, x + 4, ty, label, { scale, color, shadow, name: 'menu-row' });
      if (right) sayRight(hud, x + width - 4, ty, right, { scale, color: focused ? 'ink' : (item.disabled ? 'slate' : 'sand'), shadow, name: 'menu-value' });
      if (item.slider) {
        const sx = x + width - 8 - (right ? textWidth(right, scale) + 6 : 0) - sliderW;
        const f = (item.slider.get() - item.slider.min) / (item.slider.max - item.slider.min);
        bar(hud, sx, ry + Math.round(rowH / 2) - 4, sliderW, 7, f, focused ? 'navy' : 'cyan', focused ? 'white' : 'ink', 'slider');
        r.sx = sx; r.sw = sliderW;
      }
      if (item.stars !== undefined) starRow(hud, x + width - 4 - (right ? textWidth(right, scale) + 6 : 0) - starRowWidth(1), ry + Math.round((rowH - 11) / 2), item.stars, 1);
      this.rects.push(r);
    });
    if (this.pageCount > 1) sayCentered(hud, x + width / 2, y + totalH + 3, `Page ${Math.floor(this.top / rows) + 1} of ${this.pageCount}`, { color: 'sand', name: 'menu-more' });
    layout.rec('menu', x - 4, y - 4, width + 8, totalH + 6);
  }
}

