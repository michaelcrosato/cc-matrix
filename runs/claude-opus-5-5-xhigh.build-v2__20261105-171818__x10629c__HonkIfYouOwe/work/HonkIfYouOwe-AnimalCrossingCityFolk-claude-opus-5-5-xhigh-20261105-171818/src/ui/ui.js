// The screen stack, focus and hit areas as data, prompts, the HUD.
import { drawText, textWidth, panel, dim, inRect, wrap, LINE_H } from './draw.js';
import { drawPromptGlyph, promptGlyphWidth } from './glyphs.js';
import { drawIcon } from '../art/icons.js';
import { dateLine, formatTime } from '../core/calendar.js';
import { ITEMS } from '../data/items.js';

export class UI {
  constructor(g) {
    this.g = g;
    this.stack = [];
    this.toast = null;
    this.toasts = [];
    this.hudAlpha = 1;
    this.idle = 0;
    this.prompts = []; // corner prompts this frame
    this.tooltip = null;
    this.reveal = null;
    this.hoverTip = null;
  }
  get top() { return this.stack[this.stack.length - 1] ?? null; }
  get blocking() { return this.stack.some((s) => s.modal !== false); }
  push(screen) {
    screen.g = this.g;
    this.stack.push(screen);
    screen.open?.(this.g);
    return screen;
  }
  pop(screen = this.top) {
    const i = this.stack.indexOf(screen);
    if (i >= 0) { this.stack.splice(i, 1); screen.close?.(this.g); }
  }
  popAll() { while (this.stack.length) this.pop(); }
  has(id) { return this.stack.some((s) => s.id === id); }
  toastMsg(text, color = 'ink') { this.toasts.push({ text, color, t: 3.2 }); if (this.toasts.length > 3) this.toasts.shift(); }
  update(dt) {
    const g = this.g;
    const top = this.top;
    if (top) top.update?.(g, g.inp, dt);
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);
  }
  /** Everything a test needs: the current screen, focus and prompts. */
  model() {
    const t = this.top;
    return { screen: t?.id ?? null, depth: this.stack.length, focus: t?.focusIndex?.() ?? t?.focus ?? null, items: t?.labels?.() ?? [], prompts: (t?.prompts?.(this.g) ?? this.prompts).map((p) => p[1]), text: t?.currentText?.() ?? null };
  }
  draw(hud) {
    const g = this.g;
    for (const s of this.stack) s.draw?.(g, hud);
    const t = this.top;
    if (t) {
      const prompts = t.prompts?.(g);
      if (prompts) this.drawPrompts(hud, prompts, 'bottom');
    }
    this.drawToasts(hud);
  }
  drawToasts(hud) {
    this.toasts.forEach((t, i) => {
      const w = textWidth(t.text) + 16;
      const x = 240 - Math.floor(w / 2);
      const y = 20 + i * 18;
      panel(hud, x, y, w, 16, { fill: 'white', trim: 'sand' });
      drawText(hud, 240, y + 5, t.text, { color: t.color, align: 'center' });
    });
  }
  drawPrompts(hud, prompts, where = 'corner') {
    const g = this.g;
    const dev = g.inp.device;
    const xbox = g.settings.xbox;
    const mouseUsed = g.inp.mouse.used;
    let total = 0;
    const widths = prompts.map(([a, label]) => textWidth(label) + Math.max(28, promptGlyphWidth(a, dev, xbox, mouseUsed) + 15));
    for (const w of widths) total += w;
    const y = 270 - 21;
    let x = where === 'corner' ? 480 - 12 - total : 240 - Math.floor(total / 2);
    panel(hud, x - 4, y - 5, total + 8, 19, { fill: 'night', trim: 'night', edge: 'ink' });
    prompts.forEach(([action, label], i) => {
      const w = drawPromptGlyph(hud, x + 2, y, action, dev, xbox, mouseUsed);
      drawText(hud, x + w + 5, y, label, { color: 'white' });
      x += widths[i];
    });
  }
}

/** A vertical menu of big buttons. Up to 8 things at once; pages if more. */
export class Menu {
  constructor({ id, title, items, back, x = 120, y = 60, w = 240, itemH = 22, gap = 4, prompts, subtitle, onDraw, modal = true, onFocus, cols = 1, dim: dimBack = true, footer }) {
    this.id = id;
    this.title = title;
    this.items = items;
    this.onBack = back;
    this.x = x; this.y = y; this.w = w; this.itemH = itemH; this.gap = gap;
    this.promptList = prompts;
    this.focus = 0;
    this.page = 0;
    this.perPage = 8;
    this.modal = modal;
    this.subtitle = subtitle;
    this.onDraw = onDraw;
    this.onFocus = onFocus;
    this.cols = cols;
    this.dimBack = dimBack;
    this.footer = footer;
    this.focus = this.firstEnabled();
  }
  firstEnabled() { const i = this.items.findIndex((it) => !it.disabled); return i < 0 ? 0 : i; }
  labels() { return this.items.map((it) => it.label); }
  focusIndex() { return this.focus; }
  visible() {
    const start = Math.floor(this.focus / this.perPage) * this.perPage;
    return { start, list: this.items.slice(start, start + this.perPage) };
  }
  rect(i) {
    const { start } = this.visible();
    const k = i - start;
    return [this.x, this.y + k * (this.itemH + this.gap), this.w, this.itemH];
  }
  move(d) {
    const n = this.items.length;
    if (!n) return;
    let i = this.focus;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.items[i].disabled) break;
    }
    if (i !== this.focus) { this.focus = i; this.g?.sound('uiTick'); this.onFocus?.(this.items[i]); }
  }
  activate(g) {
    const it = this.items[this.focus];
    if (!it) return;
    if (it.disabled) { g.sound('uiCancel'); return; }
    g.sound(it.sound ?? 'uiConfirm');
    it.action?.(g, this);
  }
  update(g, inp) {
    if (inp.nav.up) this.move(-1);
    if (inp.nav.down) this.move(1);
    if (inp.nav.left) this.items[this.focus]?.left?.(g, this);
    if (inp.nav.right) this.items[this.focus]?.right?.(g, this);
    const m = inp.mouse;
    if (m.moved) {
      const { start, list } = this.visible();
      list.forEach((it, k) => { if (!it.disabled && inRect(m, ...this.rect(start + k)) && this.focus !== start + k) { this.focus = start + k; this.onFocus?.(it); } });
    }
    if (m.click) {
      const { start, list } = this.visible();
      list.forEach((it, k) => { if (inRect(m, ...this.rect(start + k))) { this.focus = start + k; this.activate(g); } });
      return;
    }
    if (inp.confirm) { this.activate(g); return; }
    if (inp.back || m.rclick) { g.sound('uiCancel'); (this.onBack ?? (() => g.ui.pop(this)))(g, this); }
  }
  prompts() { return this.promptList ?? [['confirm', 'Select'], ['back', 'Back']]; }
  draw(g, hud) {
    if (this.dimBack) dim(hud);
    const { start, list } = this.visible();
    const hasTitle = !!this.title;
    const pageCount = Math.ceil(this.items.length / this.perPage);
    const totalH = list.length * (this.itemH + this.gap) - this.gap;
    if (hasTitle) {
      panel(hud, this.x - 8, this.y - 34, this.w + 16, totalH + 44 + (this.footer ? 14 : 0), { fill: 'white', trim: 'sand' });
      drawText(hud, this.x + this.w / 2, this.y - 26, this.title, { color: 'ink', scale: 2, align: 'center' });
    }
    if (this.subtitle) drawText(hud, this.x + this.w / 2, this.y - 8, this.subtitle, { color: 'slate', align: 'center' });
    list.forEach((it, k) => {
      const i = start + k;
      const [x, y, w, h] = this.rect(i);
      const focused = i === this.focus;
      panel(hud, x, y, w, h, { fill: focused ? 'sand' : 'white', trim: focused ? 'orange' : 'mist' });
      const label = typeof it.label === 'function' ? it.label(g) : it.label;
      const ty = y + Math.floor((h - 7) / 2);
      if (it.icon) drawIcon(hud, x + 6, y + Math.floor((h - 16) / 2), it.icon, it.iconColors);
      drawText(hud, x + (it.icon ? 26 : 10), ty, label, { color: it.disabled ? 'mist' : 'ink' });
      if (it.value !== undefined) {
        const val = typeof it.value === 'function' ? it.value(g) : it.value;
        drawText(hud, x + w - 10, ty, String(val), { color: 'plum', align: 'right' });
      }
      if (focused && (it.left || it.right)) {
        drawText(hud, x + w - 92, ty, '<', { color: 'plum' });
        drawText(hud, x + w - 6, ty, '>', { color: 'plum', align: 'right' });
      }
    });
    if (pageCount > 1) drawText(hud, this.x + this.w / 2, this.y + totalH + 3, `Page ${Math.floor(this.focus / this.perPage) + 1} of ${pageCount}`, { color: 'slate', align: 'center' });
    if (this.footer) drawText(hud, this.x + this.w / 2, this.y + totalH + 4, typeof this.footer === 'function' ? this.footer(g) : this.footer, { color: 'slate', align: 'center' });
    this.onDraw?.(g, hud, this);
  }
}

/** The in-world HUD: date and time top left, beans top right, tool bottom left, context prompt bottom right. */
export function drawWorldHud(g, hud, dt) {
  const ui = g.ui;
  const w = g.world;
  const alpha = ui.hudAlpha;
  if (alpha <= 0.02 || !w) return;
  if (alpha > 0.5 || true) {
    const line = dateLine(w, g.realNow);
    const lw = textWidth(line);
    panel(hud, 12, 12, lw + 14, 17, { fill: 'white', trim: 'sand' });
    drawText(hud, 19, 17, line, { color: 'ink' });
    const beans = `${w.player.beans.toLocaleString('en-US')} beans`;
    const bw = textWidth(beans);
    panel(hud, 480 - 12 - bw - 26, 12, bw + 26, 17, { fill: 'white', trim: 'sand' });
    drawIcon(hud, 480 - 12 - bw - 23, 13, 'bean', null, 1);
    drawText(hud, 480 - 19 - bw, 17, beans, { color: 'ink' });
    // errands list
    if (w.story?.day1Active) {
      const items = g.day1Lines?.() ?? [];
      if (items.length) {
        const pw = Math.max(...items.map((t) => textWidth(t))) + 16;
        panel(hud, 480 - 12 - pw, 32, pw, items.length * 11 + 8, { fill: 'white', trim: 'mist' });
        items.forEach((t, i) => drawText(hud, 480 - 12 - pw + 8, 37 + i * 11, t, { color: t.startsWith('+') ? 'slate' : 'ink' }));
      }
    }
    // tool
    const tool = w.player.tool;
    if (tool) {
      panel(hud, 12, 270 - 12 - 28, 28, 28, { fill: 'white', trim: 'sand' });
      drawIcon(hud, 18, 270 - 12 - 22, ITEMS[tool]?.icon ?? tool, ITEMS[tool]?.iconColors);
      const name = ITEMS[tool]?.name ?? tool;
      const nw = textWidth(name);
      panel(hud, 42, 270 - 12 - 17, nw + 12, 17, { fill: 'white', trim: 'mist' });
      drawText(hud, 48, 270 - 12 - 12, name, { color: 'ink' });
    }
  }
}
