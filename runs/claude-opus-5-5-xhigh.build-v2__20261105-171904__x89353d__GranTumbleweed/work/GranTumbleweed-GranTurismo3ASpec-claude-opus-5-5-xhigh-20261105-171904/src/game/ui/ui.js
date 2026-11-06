// The menu system. Screens are a stack; each frame the top screen declares what is on it, in absolute art pixels.
// There is always exactly one focused item, a thick box that slides to the next. Same screens for every input.
import { drawGlyph, glyphWidth, specFor } from './glyphs.js';
import { widgets } from './widgets.js';
const lerp = (a, b, t) => a + (b - a) * t;
export function wrapText(text, chars = 60) {
  const out = []; let line = '';
  for (const w of String(text).split(' ')) { if ((line + ' ' + w).trim().length > chars) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line);
  return out;
}
const FONT_OK = /^[A-Z0-9 .,:;!?'"()\-+/%#=<>_*&@$\[\]\\|^~]*$/;
export const safeName = (name, fallback) => (name && FONT_OK.test(String(name).toUpperCase()) ? String(name).toUpperCase() : fallback);
export class UI {
  constructor(app) {
    this.app = app; this.stack = []; this.items = []; this.time = 0; this.box = { x: 0, y: 0, w: 0, h: 0, ready: false }; this.hud = null; this.w = 480; this.h = 270; this.cx = 240; this.promptList = []; this.clicks = []; this.pointer = { x: -1, y: -1 }; this.lastPtr = { x: -1, y: -1 }; this.pointerMoved = false; this.locked = 0; this.subtitle = null; this.toast = null;
  }
  get top() { return this.stack[this.stack.length - 1] ?? null; }
  push(screen) { this.stack.push(screen); screen.t = 0; screen.enter?.(this); this.box.ready = false; this.locked = Math.max(this.locked, 0.02); return screen; } // the press that opened a screen does not also act on it
  pop() { const s = this.stack.pop(); s?.exit?.(this); this.box.ready = false; const t = this.top; if (t) { t.t = 0; t.resume?.(this); } return s; }
  replace(screen) { const s = this.stack.pop(); s?.exit?.(this); return this.push(screen); }
  clear() { while (this.stack.length) this.stack.pop()?.exit?.(this); }
  popTo(pred) { while (this.stack.length && !pred(this.top)) this.pop(); }
  // ---- drawing, top-left origin ----
  text(x, y, str, o = {}) {
    const hud = this.hud, s = String(str), scale = o.scale ?? 1;
    let X = x;
    if (o.align === 'center') X = Math.round(x - hud.measure(s, scale).width / 2); else if (o.align === 'right') X = Math.round(x - hud.measure(s, scale).width);
    hud.text(X, y, s, { color: o.color ?? 'white', scale, shadow: o.shadow === undefined ? 'ink' : o.shadow });
  }
  lines(x, y, list, o = {}) { (Array.isArray(list) ? list : wrapText(list, o.chars ?? 60)).forEach((l, i) => this.text(x, y + i * (o.gap ?? 10), l, o)); }
  rect(x, y, w, h, color) { this.hud.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), color); }
  frameRect(x, y, w, h, color, t = 1) { this.rect(x, y, w, t, color); this.rect(x, y + h - t, w, t, color); this.rect(x, y, t, h, color); this.rect(x + w - t, y, t, h, color); }
  sprite(x, y, rows, colors) { this.hud.sprite(Math.round(x), Math.round(y), rows, colors); }
  // ---- items ----
  item(id, x, y, w, h, o = {}) { const it = { id, x, y, w, h, ...o }; this.items.push(it); return it.id === this.focusId; }
  focused(id) { return this.focusId === id; }
  // A button with a label: drawn now, focus box comes at the end.
  prompts(list) { this.promptList = list; }
  // A speaking line: voice once, subtitle in full.
  say(speaker, text, seconds = null) { const app = this.app; app.mix?.say(text, speaker); this.subtitle = { speaker, text, t: seconds ?? Math.max(3.5, text.length * 0.09) }; }
  // Where the line goes: its usual place at the foot, unless that would cover something the player can press.
  subtitleRect() {
    const s = this.subtitle; if (!s) return null;
    const lines = wrapText(s.text, Math.min(60, Math.floor((this.w - 40) / 6))), h = 16 + lines.length * 10, w = Math.min(this.w - 20, 372), x = Math.round(this.cx - w / 2);
    const covers = (y) => this.items.filter((i) => i.w > 0 && !i.noBox && i.x < x + w && i.x + i.w > x && i.y < y + h && i.y + i.h > y).length;
    const foot = this.top?.subtitleAt ?? this.h - 36 - h, head = 16, y = covers(foot) && covers(head) < covers(foot) ? head : foot;
    return { x, y, w, h, lines };
  }
  drawSubtitle(dt) {
    const s = this.subtitle; if (!s) return;
    s.t -= dt; if (s.t <= 0) { this.subtitle = null; return; }
    const { x, y, w, h, lines } = this.subtitleRect();
    this.panel(x, y, w, h, { color: 'ink', border: 'slate' });
    const name = this.app.speakers?.[s.speaker]?.name ?? s.speaker;
    this.text(x + 6, y + 4, name, { color: 'sand' });
    lines.forEach((l, i) => this.text(x + 6, y + 14 + i * 10, l));
  }
  note(text, seconds = 2.4) { this.toast = { text, t: seconds }; }
  // ---- the frame ----
  frame(ctx, dt) {
    this.hud = ctx.hud; this.ctx = ctx; this.time += dt; this.w = ctx.hud.width; this.h = ctx.hud.height; this.cx = this.w / 2;
    const a = this.app.actions, p = ctx.input.pointer;
    this.pointer.x = ((p.x + 1) / 2) * this.w; this.pointer.y = ((1 - p.y) / 2) * this.h;
    this.pointerMoved = Math.abs(this.pointer.x - this.lastPtr.x) + Math.abs(this.pointer.y - this.lastPtr.y) > 0.5;
    this.lastPtr.x = this.pointer.x; this.lastPtr.y = this.pointer.y;
    this.items.length = 0; this.promptList = []; this.clicks.length = 0;
    const top = this.top;
    if (top) {
      top.t = (top.t ?? 0) + dt;
      if (top.overlayOf) top.overlayOf.draw?.(this, dt);
      this.focusId = top.focus ?? null;
      top.draw?.(this, dt);
      if (this.top === top) this.finish(top, a, dt);
    }
    this.drawSubtitle(dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; else { const w = this.hud.measure(this.toast.text).width + 12, x = Math.round(this.cx - w / 2); this.panel(x, 34, w, 13, { color: 'plum', border: 'red' }); this.text(this.cx, 37, this.toast.text, { align: 'center' }); } }
  }
  finish(top, a, dt) {
    const items = this.items;
    if (items.length) {
      let cur = items.find((i) => i.id === top.focus);
      if (!cur) { cur = items.find((i) => i.id === top.defaultFocus) ?? items.find((i) => !i.disabledFocus) ?? items[0]; top.focus = cur.id; this.focusId = cur.id; }
      if (!top.inputOff && this.locked <= 0) cur = this.navigate(top, cur, a) ?? cur;
      // The focus box slides.
      const b = this.box, sp = 1 - Math.exp(-dt * 22);
      if (!b.ready) { Object.assign(b, { x: cur.x, y: cur.y, w: cur.w, h: cur.h, ready: true }); }
      b.x = lerp(b.x, cur.x, sp); b.y = lerp(b.y, cur.y, sp); b.w = lerp(b.w, cur.w, sp); b.h = lerp(b.h, cur.h, sp);
      if (!cur.noBox) { const col = Math.sin(this.time * 6) > 0 ? 'sand' : 'white', x = Math.round(b.x) - 2, y = Math.round(b.y) - 2, w = Math.round(b.w) + 4, h = Math.round(b.h) + 4; this.frameRect(x, y, w, h, col, 2); }
    } else if (!top.inputOff && this.locked <= 0) {
      if (a.pressed('confirm')) top.onConfirm?.(this);
    }
    if (!top.inputOff && this.locked <= 0) {
      if (a.pressed('back')) { if (top.onBack) { if (top.onBack(this) !== false) this.app.mix?.sfx('back'); } else if (this.stack.length > 1 && !top.noBack) { this.app.mix?.sfx('back'); this.pop(); } }
      if (a.rclicked) a.inject('back');
      if (a.pressed('info')) top.onInfo?.(this);
      if (a.pressed('alt')) top.onAlt?.(this);
    }
    this.locked -= dt;
    this.drawPrompts(a);
    // Clicks on tabs and prompts.
    if (a.clicked && this.locked <= 0) for (const c of this.clicks) if (this.inRect(c)) { c.fn(); break; }
  }
  inRect(r) { const p = this.pointer; return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; }
  navigate(top, cur, a) {
    const items = this.items; let moved = null;
    // Mouse: hover moves the focus, click confirms.
    if (this.pointerMoved || a.clicked) { const hit = items.find((i) => this.inRect(i)); if (hit && hit.id !== cur.id) { top.focus = hit.id; moved = hit; this.app.mix?.sfx('tick'); } }
    const dx = a.moveX(), dy = a.moveY();
    if ((dx || dy) && !moved) {
      if (dx && cur.slider) { this.nudge(cur, dx); return cur; }
      if (dx && cur.onX) { cur.onX(dx); return cur; }
      if (dy && cur.onY) { cur.onY(dy); return cur; }
      const c0 = { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2 }; let best = null, bs = Infinity;
      for (const i of items) {
        if (i === cur) continue;
        const cx = i.x + i.w / 2, cy = i.y + i.h / 2, vx = cx - c0.x, vy = cy - c0.y, along = dx ? vx * dx : vy * dy, across = dx ? Math.abs(vy) : Math.abs(vx);
        if (along <= 1) continue;
        const score = along + across * 2.2; if (score < bs) { bs = score; best = i; }
      }
      if (!best && top.wrapFocus !== false) { // wrap around in the pressed direction
        const list = items.filter((i) => (dx ? Math.abs(i.y + i.h / 2 - c0.y) < 8 : Math.abs(i.x + i.w / 2 - c0.x) < 40));
        if (list.length > 1) best = (dx > 0 || dy > 0) ? list.reduce((p, q) => ((dx ? q.x < p.x : q.y < p.y) ? q : p)) : list.reduce((p, q) => ((dx ? q.x > p.x : q.y > p.y) ? q : p));
      }
      if (best && best !== cur) { top.focus = best.id; moved = best; this.app.mix?.sfx('tick'); }
    }
    const now = moved ?? cur;
    if (a.wheel && now.slider) this.nudge(now, -Math.sign(a.wheel));
    // Dragging a slider with the mouse.
    if (now.slider && now.bar && this.ctx.input.isDown('MouseLeft') && this.inRect(now)) { const f = Math.max(0, Math.min(1, (this.pointer.x - now.bar.x) / now.bar.w)), s = now.slider; s.set?.(s.min + (s.max - s.min) * f); }
    if (a.pressed('confirm') || (a.clicked && this.inRect(now))) {
      if (now.slider && !a.clicked) { now.slider.reset?.(); this.app.mix?.sfx('tick'); }
      else if (!now.slider) {
        if (now.denied) { this.app.mix?.sfx('denied'); now.denied(); }
        else if (now.confirm) { if (now.quiet !== true) this.app.mix?.sfx('confirm'); now.confirm(); }
      }
    }
    return now;
  }
  nudge(it, dir) { const s = it.slider; let v = s.value + dir * s.step; v = Math.max(s.min, Math.min(s.max, v)); s.set?.(v); this.app.mix?.sfx('tick'); }
  drawPrompts(a) {
    const list = this.promptList; if (!list.length) return;
    const hud = this.hud, dev = a.lastDevice, xbox = this.app.options.glyphs === 'xbox', y = this.h - 15; let total = 0;
    const specs = list.map(([act, label]) => { const spec = specFor(act, dev), gw = glyphWidth(hud, spec, xbox), lw = hud.measure(label).width; total += gw + 3 + lw + 12; return { act, label, spec, gw, lw }; });
    total -= 12; const rows = total > this.w - 10 ? [specs.slice(0, Math.ceil(specs.length / 2)), specs.slice(Math.ceil(specs.length / 2))] : [specs];
    this.rect(0, y - 3 - (rows.length - 1) * 14, this.w, 18 + (rows.length - 1) * 14, 'ink');
    rows.forEach((row, n) => {
      const width = row.reduce((v, s) => v + s.gw + 3 + s.lw + 12, -12), Y = y - (rows.length - 1 - n) * 14; let x = Math.max(4, Math.round(this.cx - width / 2));
      for (const s of row) { drawGlyph(hud, x, Y, s.spec, xbox); hud.text(x + s.gw + 3, Y + 2, s.label, { color: 'mist', shadow: false }); const act = s.act; if (['back', 'confirm', 'alt', 'info', 'tabL', 'tabR'].includes(act)) this.clicks.push({ x, y: Y - 2, w: s.gw + 3 + s.lw, h: 14, fn: () => a.inject(act) }); x += s.gw + 3 + s.lw + 12; }
    });
  }
}
Object.assign(UI.prototype, widgets);
