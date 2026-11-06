// Menus: at most six items, one idea per screen. Pad, keyboard and mouse, all native. No DOM.
import { ALL_CODES, pressed } from '../core/actions.js';
import { clamp } from '../world/geom.js';
import { wrap } from './pixfont.js';
const PAGE = 6, ROW = 22, TOP = 70;
export class UI {
  stack = []; repeatT = 0; repeatDir = 0; dragging = null;
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.h = ctx.hud; }
  get top() { return this.stack[this.stack.length - 1] ?? null; }
  push(s) { s.focus ??= 0; s.page ??= 0; this.stack.push(s); s.onShow?.(s); this.skipFrame = true; return s; }
  pop() { const s = this.stack.pop(); s?.onClose?.(s); this.game.audio.play('ui-back'); this.skipFrame = true; this.ctx.input.clearQueued(...ALL_CODES); return s; }
  replace(s) { this.stack.pop(); return this.push(s); }
  clear() { this.stack.length = 0; this.ctx.input.clearQueued(...ALL_CODES); }
  items(s) { return typeof s.items === 'function' ? s.items(s) : s.items ?? []; }
  /** Movement from pad, stick or keys, with key repeat on holding. */
  nav() {
    const input = this.ctx.input;
    let dir = 0;
    if (pressed(input, 'up')) dir = -1; else if (pressed(input, 'down')) dir = 1;
    let lr = 0;
    if (pressed(input, 'left')) lr = -1; else if (pressed(input, 'right')) lr = 1;
    const ax = input.padAxis;
    const held = input.anyDown(['ArrowUp', 'KeyW', 'PadUp']) ? -1 : input.anyDown(['ArrowDown', 'KeyS', 'PadDown']) ? 1 : Math.abs(ax.y) > 0.5 ? -Math.sign(ax.y) : 0;
    const heldLR = input.anyDown(['ArrowLeft', 'KeyA', 'PadLeft']) ? -1 : input.anyDown(['ArrowRight', 'KeyD', 'PadRight']) ? 1 : Math.abs(ax.x) > 0.5 ? Math.sign(ax.x) : 0;
    const key = held * 10 + heldLR;
    if (key !== this.repeatDir) { this.repeatDir = key; this.repeatT = 0.34; if (key && Math.abs(ax.y) + Math.abs(ax.x) > 0.5 && !dir && !lr) { dir = held; lr = heldLR; } }
    else if (key) { this.repeatT -= 1 / 60; if (this.repeatT <= 0) { this.repeatT = 0.09; this.accel = (this.accel ?? 0) + 1; dir = held; lr = heldLR; } } else this.accel = 0;
    return { dir, lr };
  }
  update() {
    const s = this.top; if (!s) return;
    if (this.skipFrame) { this.skipFrame = false; return; }
    const input = this.ctx.input, g = this.game, items = this.items(s);
    s.update?.(s);
    if (this.top !== s) return;
    const { dir, lr } = this.nav();
    if (s.paged) { // A paged reader.
      const n = s.pages.length;
      if (lr || dir || input.wheel) { const d = lr || dir || Math.sign(input.wheel); const was = s.page; s.page = clamp(s.page + d, 0, n - 1); if (was !== s.page) g.audio.play('ui-move'); }
      if (pressed(input, 'tabR')) s.page = Math.min(n - 1, s.page + 1); if (pressed(input, 'tabL')) s.page = Math.max(0, s.page - 1);
      if (pressed(input, 'back') || pressed(input, 'confirm') || this.clickedAnywhere()) { if (s.back) s.back(s); else this.pop(); }
      return;
    }
    if (s.tabs) {
      if (pressed(input, 'tabL')) { s.tab = (s.tab + s.tabs.length - 1) % s.tabs.length; s.focus = 0; g.audio.play('ui-move'); }
      if (pressed(input, 'tabR')) { s.tab = (s.tab + 1) % s.tabs.length; s.focus = 0; g.audio.play('ui-move'); }
    }
    if (items.length) {
      if (dir) { let f = s.focus; for (let k = 0; k < items.length; k++) { f = (f + dir + items.length) % items.length; if (!items[f].disabled?.()) break; } if (f !== s.focus) { s.focus = f; g.audio.play('ui-move'); } }
      s.focus = clamp(s.focus, 0, items.length - 1);
      this.mouse(s, items);
      const it = items[s.focus];
      if (lr && it?.adjust) { it.adjust(lr * (1 + Math.min(8, (this.accel ?? 0) >> 2))); g.audio.play('ui-move', { volume: 0.6 }); }
      if (input.wheel && items.length > PAGE) { s.focus = clamp(s.focus + Math.sign(input.wheel) * PAGE, 0, items.length - 1); }
      if (it?.resetOne && pressed(input, 'resetOne')) { it.resetOne(); g.audio.play('ui-back'); }
      if (pressed(input, 'confirm') && it && !it.disabled?.()) { if (it.action) { g.audio.play('ui-confirm'); it.action(); return; } if (it.adjust) it.adjust(1); }
    }
    s.extra?.(s);
    if (this.top !== s) return;
    if (pressed(input, 'back')) { if (s.back === null) return; if (s.back) s.back(s); else this.pop(); }
  }
  clickedAnywhere() { return this.ctx.input.buttonEvents.some((e) => !e.down && (e.code === 'MouseLeft' || e.code === 'Touch')); }
  pointerXY(e) { return [((e.x + 1) / 2) * this.h.width, ((1 - e.y) / 2) * this.h.height]; }
  rowRect(s, i) { const p = Math.floor(i / PAGE), y = (s.top ?? TOP) + (i - p * PAGE) * ROW; return { x: 0, y, w: this.h.width, h: ROW - 2, page: p }; }
  mouse(s, items) {
    const input = this.ctx.input, g = this.game, ptr = input.pointer, page = Math.floor(s.focus / PAGE);
    const [px, py] = this.pointerXY(ptr);
    if (g.mouseMoved && ptr.over !== false) for (let i = page * PAGE; i < Math.min(items.length, (page + 1) * PAGE); i++) { const r = this.rowRect(s, i); if (py >= r.y && py < r.y + r.h && !items[i].disabled?.()) { if (s.focus !== i) { s.focus = i; g.audio.play('ui-move', { volume: 0.5 }); } break; } }
    for (const e of input.buttonEvents) {
      const [x, y] = this.pointerXY(e);
      if (e.down && (e.code === 'MouseLeft' || e.code === 'Touch')) for (let i = page * PAGE; i < Math.min(items.length, (page + 1) * PAGE); i++) { const r = this.rowRect(s, i); if (y >= r.y && y < r.y + r.h && !items[i].disabled?.()) { s.focus = i; if (items[i].set) this.dragging = items[i]; this.pressRow = i; } }
      if (!e.down && (e.code === 'MouseLeft' || e.code === 'Touch')) {
        this.dragging = null;
        const pressRow = this.pressRow; this.pressRow = null;
        if (pressRow !== undefined && pressRow !== null) { const r = this.rowRect(s, pressRow); if (y >= r.y && y < r.y + r.h) { const it = items[pressRow]; if (it?.action) { g.audio.play('ui-confirm'); it.action(); return; } if (it?.adjust && !it.set) it.adjust(x > this.h.width / 2 ? 1 : -1); } }
      }
      void x;
    }
    if (this.dragging && input.isDown('MouseLeft', 'Touch')) { const X = this.pointerXY(ptr)[0], W = this.h.width; this.dragging.set(clamp((X - (W - 124)) / 100, 0, 1)); }
  }
  /** Draw the top screen. */
  draw() {
    const s = this.top; if (!s) return;
    const h = this.h, hud = this.game.hud, W = h.width, H = h.height;
    if (s.cover) { h.rect(0, 0, W, H, s.cover === true ? 'ink' : s.cover); } else if (s.dim !== false) { for (let y = 0; y < H; y += 2) h.rect(0, y, W, 1, 'ink'); }
    if (s.title) { const scale = s.titleScale ?? 2; h.text(0, s.titleY ?? 32, s.title, { anchor: 'top', scale, color: s.titleColor ?? 'sand' }); }
    if (s.sub) wrap(s.sub, 70).forEach((l, i) => h.text(0, (s.titleY ?? 32) + 22 + i * 10, l, { anchor: 'top', color: 'mist' }));
    if (s.tabs) { let x = 24; hud.promptAt(x, 8, 'tabL', ''); x += 22; s.tabs.forEach((t, i) => { const f = i === s.tab; if (f) h.rect(x - 2, 6, t.length * 6 + 4, 12, 'orange'); h.text(x, 9, t, { color: f ? 'ink' : 'white', shadow: false }); x += t.length * 6 + 9; }); hud.promptAt(x, 8, 'tabR', ''); }
    if (s.paged) {
      const page = s.pages[s.page] ?? [];
      page.forEach((l, i) => { const head = typeof l === 'object'; h.text(s.pageX ?? 24, (s.pageY ?? 56) + i * 10, head ? l.big : l, { color: head ? 'sand' : 'white' }); });
      h.text(0, H - 40, `${s.page + 1} / ${s.pages.length}`, { anchor: 'top', color: 'mist' });
      hud.footer([['left', 'PAGE'], ['back', 'BACK']]);
      s.draw?.(s); return;
    }
    const items = this.items(s), page = Math.floor(s.focus / PAGE);
    for (let i = page * PAGE; i < Math.min(items.length, (page + 1) * PAGE); i++) {
      const it = items[i], r = this.rowRect(s, i), f = i === s.focus, dis = it.disabled?.();
      if (it.hidden) continue;
      if (f) { h.rect(0, r.y, W, r.h, 'orange'); h.rect(16, r.y + 5, 6, 10, 'ink'); }
      const colour = f ? 'ink' : dis ? 'slate' : 'white';
      h.text(28, r.y + 3, it.label, { scale: it.small ? 1 : 2, color: colour, shadow: f ? false : 'ink' });
      const val = it.value?.();
      if (val !== undefined && val !== null) {
        if (typeof val === 'number') { const X = W - 124; h.rect(X, r.y + 6, 100, 8, f ? 'plum' : 'night'); h.rect(X, r.y + 6, Math.round(100 * clamp(val, 0, 1)), 8, f ? 'ink' : 'sand'); if (it.valueText) h.text(X - 4 - it.valueText().length * 6, r.y + 6, it.valueText(), { color: colour, shadow: false }); }
        else h.text(W - 28 - val.length * 12, r.y + 3, val, { scale: 2, color: colour, shadow: f ? false : 'ink' });
      }
    }
    if (items.length > PAGE) h.text(0, TOP + PAGE * ROW + 2, `PAGE ${page + 1}/${Math.ceil(items.length / PAGE)}`, { anchor: 'top', color: 'mist' });
    s.draw?.(s);
    if (s.footer !== false) hud.footer(s.footer ?? [['confirm', 'OK'], ...(s.back === null ? [] : [['back', 'BACK']])]);
    this.game.hud.prompts.push(...items.map((i) => `[ITEM] ${i.label}`));
  }
}
