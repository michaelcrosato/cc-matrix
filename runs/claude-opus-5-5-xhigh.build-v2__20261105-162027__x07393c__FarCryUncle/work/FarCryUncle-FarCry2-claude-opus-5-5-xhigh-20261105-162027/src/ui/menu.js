// One menu system for every screen: pad, keys and mouse on the same items. Drawn with the HUD; no DOM.
import { clamp } from '../core/rng.js';
import { wrap } from './pixfont.js';
import { drawGlyph, glyphWidth } from './glyphs.js';
import { ACT } from '../core/actions.js';
const REPEAT0 = 0.32, REPEAT = 0.1;
export const SAFE_X = 24, SAFE_Y = 14;
export class Menu {
  noted = [];
  stack = []; regions = []; frame = 0; repeatT = 0; repeatDir = null; stickDir = null; lastPtr = [9, 9]; dragging = null; ptr = { x: 0, y: 0 }; holdAccel = 0;
  constructor(game) { this.game = game; }
  get top() { return this.stack[this.stack.length - 1] ?? null; }
  get open() { return this.stack.length > 0; }
  push(screen, focus = 0) {
    screen.focus = screen.focus ?? focus;
    screen.page = screen.page ?? 0;
    screen.tab = screen.tab ?? 0;
    screen.fresh = true; // it must not hear the key that opened it
    this.stack.push(screen);
    screen.onOpen?.(screen);
    this.game.onMenuChange();
    return screen;
  }
  pop() { const s = this.stack.pop(); s?.onClose?.(s); this.game.onMenuChange(); return s; }
  clear() { while (this.stack.length) this.pop(); }
  replace(screen) { this.stack.pop(); return this.push(screen); }
  itemsOf(s) { const list = typeof s.items === 'function' ? s.items(s) : s.items; return list ?? []; }
  move(s, d) {
    const items = this.itemsOf(s);
    if (!items.length) return;
    let f = s.focus;
    for (let i = 0; i < items.length; i++) { f = (f + d + items.length) % items.length; if (items[f].enabled !== false || items[f].focusable) break; }
    if (f !== s.focus) { s.focus = f; this.game.sfx.play('ui-move'); }
  }
  activate(s, it) {
    if (!it || it.enabled === false) { this.game.sfx.play('ui-back', { volume: 0.3 }); return; }
    if (it.onSelect) { this.game.sfx.play('ui-confirm'); it.onSelect(it, s); }
    else if (it.slider) this.nudge(it, 1, 1);
    else if (it.choices) this.cycle(it, 1);
  }
  nudge(it, d, k = 1) {
    const sl = it.slider; if (!sl) return;
    const v = clamp(sl.get() + d * sl.step * k, sl.min, sl.max);
    sl.set(Math.round(v / sl.step) * sl.step);
    this.game.sfx.play('ui-move', { volume: 0.5 });
  }
  cycle(it, d) {
    const c = it.choices, i = c.options.indexOf(c.get());
    c.set(c.options[(i + d + c.options.length) % c.options.length]);
    this.game.sfx.play('ui-move');
  }
  /** Runs every frame; timeScale may be 0, so this counts frames, not dt. */
  update(ctx, realDt) {
    const g = this.game, s = this.top, a = g.actions;
    this.frame++;
    this.ptr.x = ((ctx.input.pointer.x + 1) / 2) * ctx.hud.width;
    this.ptr.y = ((1 - ctx.input.pointer.y) / 2) * ctx.hud.height;
    if (!s) return;
    if (s.update) s.update(ctx, realDt, s);
    if (this.top !== s) return;
    if (s.fresh) { s.fresh = false; this.stickDir = Math.abs(ctx.input.moveAxis().y) > 0.5 ? 'held' : null; this.lastPtr[0] = ctx.input.pointer.x; this.lastPtr[1] = ctx.input.pointer.y; return; }
    // Moves: D-pad or left stick with key repeat, arrows or WASD.
    const axis = ctx.input.moveAxis();
    const stick = Math.abs(axis.y) > 0.5 ? (axis.y > 0 ? 'up' : 'down') : Math.abs(axis.x) > 0.5 ? (axis.x > 0 ? 'right' : 'left') : null;
    let dir = null;
    if (a.tapped('menuUp')) dir = 'up'; else if (a.tapped('menuDown')) dir = 'down'; else if (a.tapped('menuLeft')) dir = 'left'; else if (a.tapped('menuRight')) dir = 'right';
    const held = a.down('menuUp') || a.down('menuDown') || a.down('menuLeft') || a.down('menuRight') || stick;
    if (dir) { this.repeatDir = dir; this.repeatT = REPEAT0; this.holdAccel = 0; }
    else if (stick && stick !== this.stickDir) { dir = stick; this.repeatDir = stick; this.repeatT = REPEAT0; this.holdAccel = 0; }
    else if (held && this.repeatDir) { this.repeatT -= realDt; this.holdAccel += realDt; if (this.repeatT <= 0) { this.repeatT = REPEAT; dir = this.repeatDir; } }
    else if (!held) { this.repeatDir = null; }
    this.stickDir = stick;
    const items = this.itemsOf(s);
    if (s.focus >= items.length) s.focus = Math.max(0, items.length - 1);
    if (dir) {
      const it = items[s.focus];
      if (dir === 'up') this.move(s, -1);
      else if (dir === 'down') this.move(s, 1);
      else if (s.pages && !items.length) this.turnPage(s, dir === 'left' ? -1 : 1);
      else if (it?.slider) this.nudge(it, dir === 'left' ? -1 : 1, this.holdAccel > 1 ? 4 : 1);
      else if (it?.choices) this.cycle(it, dir === 'left' ? -1 : 1);
      else if (it?.onLeft && dir === 'left') it.onLeft(it, s);
      else if (it?.onRight && dir === 'right') it.onRight(it, s);
      else if (s.onSide) s.onSide(dir === 'left' ? -1 : 1, s);
      else if (s.pages) this.turnPage(s, dir === 'left' ? -1 : 1);
    }
    // Tabs and pages: L1/R1, Q/E; the wheel scrolls pages.
    const tabL = a.tapped('tabLeft'), tabR = a.tapped('tabRight');
    if (s.tabs && (tabL || tabR)) { s.tab = (s.tab + (tabR ? 1 : -1) + s.tabs.length) % s.tabs.length; s.focus = 0; g.sfx.play('ui-move'); }
    else if (s.pages && (tabL || tabR)) this.turnPage(s, tabR ? 1 : -1);
    if (ctx.input.wheel !== 0 && s.pages) this.turnPage(s, ctx.input.wheel > 0 ? 1 : -1);
    if (s.tabs && ctx.input.wheel !== 0) { s.focus = clamp(s.focus + (ctx.input.wheel > 0 ? 1 : -1), 0, Math.max(0, items.length - 1)); }
    if (s.resetOne && a.tapped('resetOne')) s.resetOne(items[s.focus], s);
    // Mouse: hover moves focus, click activates.
    const px = this.ptr.x, py = this.ptr.y;
    const moved = ctx.input.pointer.x !== this.lastPtr[0] || ctx.input.pointer.y !== this.lastPtr[1];
    this.lastPtr[0] = ctx.input.pointer.x; this.lastPtr[1] = ctx.input.pointer.y;
    if (moved && !ctx.input.pointerLocked) { const r = this.regionAt(px, py); if (r && r.index != null && r.index !== s.focus && items[r.index]) { s.focus = r.index; g.sfx.play('ui-move', { volume: 0.5 }); } }
    let clicked = false;
    for (const ev of ctx.input.buttonEvents) {
      const hud = ctx.hud, x = ((ev.x + 1) / 2) * hud.width, y = ((1 - ev.y) / 2) * hud.height;
      if (ev.down) {
        const r = this.regionAt(x, y);
        if (r) {
          if (r.sliderOf) { this.dragging = r; this.dragTo(x, r); }
          else if (r.tab != null) { s.tab = r.tab; s.focus = 0; g.sfx.play('ui-move'); }
          else if (r.action) { g.sfx.play('ui-confirm'); r.action(); clicked = true; }
          else if (r.index != null) { s.focus = r.index; this.activate(s, items[r.index]); clicked = true; }
        } else if (s.tapAnywhere) { s.tapAnywhere(); clicked = true; }
      } else this.dragging = null;
    }
    if (this.dragging && ctx.input.mouseButtons) this.dragTo(px, this.dragging);
    if (clicked && this.top !== s) return;
    if (a.tapped('confirm')) {
      if (items.length) this.activate(s, items[s.focus]);
      else if (s.onConfirm) s.onConfirm(s);
      else if (s.pages) { if (s.page < s.pages.length - 1) this.turnPage(s, 1); else this.back(s); }
    }
    if (this.top === s && a.tapped('back')) this.back(s);
  }
  regionAt(x, y) {
    for (let i = this.regions.length - 1; i >= 0; i--) { const r = this.regions[i]; if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r; }
    return null;
  }
  dragTo(x, r) {
    const sl = r.sliderOf.slider;
    const f = clamp((x - r.x) / r.w, 0, 1);
    sl.set(Math.round((sl.min + (sl.max - sl.min) * f) / sl.step) * sl.step);
  }
  back(s) {
    if (s.noBack) return;
    this.game.sfx.play('ui-back');
    if (s.onBack) s.onBack(s); else this.pop();
  }
  turnPage(s, d) {
    const p = clamp(s.page + d, 0, s.pages.length - 1);
    if (p !== s.page) { s.page = p; this.game.sfx.play('map-paper', { volume: 0.5 }); }
  }
  // ---- drawing ----
  draw(hud) {
    this.regions.length = 0;
    const s = this.top;
    if (!s) return;
    if (s.cover) { hud.rect(0, 0, hud.width, hud.height, typeof s.cover === 'string' ? s.cover : 'ink'); }
    if (s.dim) this.dimmer(hud, s.dim);
    // Words stay on solid ink, with the world still showing round the edge of the sheet.
    if (s.sheet) hud.rect(14, 6, hud.width - 28, hud.height - 12, 'ink');
    if (s.panel) hud.rect(0, 0, hud.width, hud.height, 'ink');
    if (s.draw) s.draw(hud, this, s);
    else this.drawStandard(hud, s);
  }
  dimmer(hud, alpha) {
    // A pixel screen: rows of ink give a dim without blending. The world shows through one row in every `gap`.
    const gap = alpha >= 0.85 ? 4 : alpha > 0.6 ? 3 : 2;
    for (let y = 0; y < hud.height; y++) if (y % gap !== 0) hud.rect(0, y, hud.width, 1, 'ink');
  }
  title(hud, s, y = SAFE_Y) {
    if (s.title) hud.text(SAFE_X, y, s.title, { scale: 2, color: 'sand', shadow: 'plum' });
    if (s.subtitle) hud.text(SAFE_X, y + 18, s.subtitle, { color: 'mist' });
  }
  drawTabs(hud, s, y) {
    let x = SAFE_X;
    s.tabs.forEach((t, i) => {
      const w = t.length * 6 + 8;
      hud.rect(x, y, w, 11, i === s.tab ? 'orange' : 'night');
      hud.text(x + 4, y + 2, t, { color: i === s.tab ? 'ink' : 'mist', shadow: false });
      this.regions.push({ x, y, w, h: 11, tab: i });
      x += w + 3;
    });
    const g = this.game;
    const gl = g.actions.glyph('tabRight', g.settings.glyphs === 'xb');
    const gr = g.actions.glyph('tabLeft', g.settings.glyphs === 'xb');
    const pw = glyphWidth(gl) + glyphWidth(gr) + 3;
    this.note('tabLeft', gr, 'TAB'); this.note('tabRight', gl, 'TAB');
    drawGlyph(hud, hud.width - SAFE_X - pw, y, gr);
    drawGlyph(hud, hud.width - SAFE_X - glyphWidth(gl), y, gl);
  }
  itemRow(hud, it, i, y, focused, x0 = SAFE_X, w0 = hud.width - SAFE_X * 2) {
    const h = it.small ? 12 : 20;
    const scale = it.small ? 1 : 2;
    if (focused) { hud.rect(0, y - 2, hud.width, h + 2, 'orange'); hud.rect(x0 - 8, y + (h - 12) / 2, 4, 8, 'ink'); }
    const color = focused ? 'ink' : it.enabled === false ? 'slate' : 'white';
    const label = it.label;
    hud.text(x0, y + (it.small ? 1 : 2), label, { scale, color, shadow: focused ? false : 'ink' });
    this.regions.push({ x: 0, y: y - 2, w: hud.width, h: h + 2, index: i });
    const right = x0 + w0;
    if (it.slider) {
      const sl = it.slider, bw = Math.min(150, w0 * 0.42), bx = right - bw, by = y + (h - 8) / 2 - 1;
      const f = clamp((sl.get() - sl.min) / (sl.max - sl.min), 0, 1);
      hud.rect(bx, by, bw, 8, focused ? 'plum' : 'night');
      hud.rect(bx, by, Math.round(bw * f), 8, focused ? 'white' : 'sand');
      const txt = sl.format ? sl.format(sl.get()) : String(Math.round(sl.get() * 100) / 100);
      hud.text(bx - txt.length * 6 - 5, y + (it.small ? 1 : 5), txt, { color, shadow: false });
      this.regions.push({ x: bx, y: y - 2, w: bw, h: h + 2, sliderOf: it, index: i });
    } else if (it.choices) {
      const v = it.choices.format ? it.choices.format(it.choices.get()) : String(it.choices.get());
      const scaleV = it.small ? 1 : 2, w = v.length * 6 * scaleV;
      hud.text(right - w, y + (it.small ? 1 : 2), v, { scale: scaleV, color, shadow: focused ? false : 'ink' });
    } else if (it.value != null) {
      const v = String(typeof it.value === 'function' ? it.value() : it.value), w = v.length * 6;
      hud.text(right - w, y + (it.small ? 1 : 5), v, { color, shadow: false });
    }
    return h + 3;
  }
  drawStandard(hud, s) {
    this.title(hud, s);
    let y = SAFE_Y + (s.subtitle ? 32 : 24);
    if (s.tabs) { this.drawTabs(hud, s, y); y += 16; }
    if (s.blurb) { for (const line of wrap(s.blurb, hud.width - SAFE_X * 2)) { hud.text(SAFE_X, y, line, { color: 'mist' }); y += 9; } y += 4; }
    const items = this.itemsOf(s);
    if (s.itemsY) y = s.itemsY;
    items.forEach((it, i) => { y += this.itemRow(hud, it, i, y, i === s.focus); });
    if (s.pages) this.drawPaged(hud, s, y);
    this.footer(hud, s);
  }
  drawPaged(hud, s, y0) {
    const lines = s.pages[s.page] ?? [];
    let y = y0;
    for (const l of lines) {
      const { text, color = 'white', scale = 1 } = typeof l === 'string' ? { text: l } : l;
      for (const line of wrap(text, hud.width - SAFE_X * 2, scale)) { if (y > hud.height - 28) break; hud.text(SAFE_X, y, line, { color, scale }); y += 9 * scale; }
    }
    hud.text(SAFE_X, hud.height - SAFE_Y - 22, `PAGE ${s.page + 1} OF ${s.pages.length}`, { color: 'slate' });
    const w = 60;
    this.regions.push({ x: 0, y: 40, w: hud.width / 2, h: hud.height - 80, action: () => this.turnPage(s, -1) });
    this.regions.push({ x: hud.width / 2, y: 40, w: hud.width / 2, h: hud.height - 80, action: () => { if (s.page < s.pages.length - 1) this.turnPage(s, 1); else this.back(s); } });
  }
  /** A prompt a screen drew, so state().prompts lists what is really on screen. */
  note(act, glyph, text) { this.noted.push({ act, glyph, text }); }
  footer(hud, s) {
    const g = this.game;
    const list = s.hints ?? (s.noBack ? [['confirm', 'SELECT']] : [['confirm', 'SELECT'], ['back', 'BACK']]);
    let x = SAFE_X; const y = hud.height - SAFE_Y - 11;
    for (const [act, txt] of list) {
      const name = g.actions.glyph(act, g.settings.glyphs === 'xb');
      const w = drawGlyph(hud, x, y, name);
      this.note(act, name, txt);
      hud.text(x + w + 3, y + 2, txt, { color: 'white' });
      this.regions.push({ x, y, w: w + 4 + txt.length * 6, h: 11, action: act === 'back' ? () => this.back(s) : () => { const it = this.itemsOf(s)[s.focus]; if (act === 'confirm' && it) this.activate(s, it); } });
      x += w + 8 + txt.length * 6;
    }
  }
  state() {
    const s = this.top;
    if (!s) return { screen: null, focus: 0 };
    const items = this.itemsOf(s);
    return { screen: s.id, focus: s.focus, tab: s.tab, page: s.page, item: items[s.focus]?.id ?? items[s.focus]?.label ?? null, items: items.map((i) => i.id ?? i.label) };
  }
  /** For tests and scripts: activate an item by id or label. */
  pick(idOrLabel) {
    const s = this.top; if (!s) return false;
    const items = this.itemsOf(s);
    const i = items.findIndex((it) => it.id === idOrLabel || it.label === idOrLabel);
    if (i < 0) { const off = s.allItems?.(s).find((it) => it.id === idOrLabel || it.label === idOrLabel); if (!off) return false; this.activate(s, off); return true; }
    s.focus = i;
    this.activate(s, items[i]);
    return true;
  }
}
