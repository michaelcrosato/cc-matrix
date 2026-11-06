// The 10-foot UI: immediate-mode widgets drawn through the HUD font. There is always exactly one focused thing.
import { drawGlyph, glyphWidth } from './glyphs.js';
const CLEAN = { '×': 'X', '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '≤': '<=', '♭': 'B', '✕': 'X', '○': 'O', '□': '#', '△': '^', 'é': 'E', '÷': '/' };
export const clean = (s) => String(s).toUpperCase().replace(/[^\x20-\x7e]/g, (c) => CLEAN[c] ?? '');
export const fmtTime = (t) => { if (t == null || !isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };
export const fmtCr = (n) => `${Math.round(n).toLocaleString('en-US')} CR`;
export function wrap(text, width = 60) { const out = []; for (const para of clean(text).split('\n')) { let line = ''; for (const w of para.split(' ')) { if ((line + ' ' + w).trim().length > width) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } out.push(line); } return out; }
export class UI {
  constructor(app) { this.app = app; this.stack = []; this.items = []; this.prevItems = []; this.focus = null; this.box = { x: 0, y: 0, w: 0, h: 0, init: false }; this.t = 0; this.queued = null; this.subtitle = null; this.toasts = []; this.tick = 0; this.modal = null; }
  get hud() { return this.app.hud; }
  get W() { return this.hud.width; } get H() { return this.hud.height; } get cx() { return Math.floor(this.hud.width / 2); }
  get top() { return this.stack[this.stack.length - 1] ?? null; }
  push(screen, keepFocus = false) { if (this.top) this.top._focus = this.focus; this.stack.push(screen); if (!keepFocus) this.focus = null; this.box.init = false; screen.enter?.(this.app); this.prevItems = []; this.items = []; this.app.onScreenChange?.(screen); }
  pop() { const s = this.stack.pop(); s?.leave?.(this.app); this.focus = this.top?._focus ?? null; this.box.init = false; this.prevItems = []; this.items = []; if (this.top) { this.top.resume?.(this.app); this.app.onScreenChange?.(this.top); } }
  replace(screen) { const s = this.stack.pop(); s?.leave?.(this.app); this.focus = null; this.stack.push(screen); this.box.init = false; screen.enter?.(this.app); this.prevItems = []; this.items = []; this.app.onScreenChange?.(screen); }
  clearStack() { while (this.stack.length) this.stack.pop()?.leave?.(this.app); this.focus = null; this.box.init = false; }
  /** One frame: input, then the screen's widgets. */
  frame(dt) {
    this.t += dt; const a = this.app.actions, s = this.top; this.dt = dt;
    this.prevItems = this.items; this.items = []; this.confirmHit = null; this.leftRight = 0; if (this.pressNext) { a.pressedSet[this.pressNext] = true; this.pressNext = null; }
    if (s?.modalInput !== false) this.navigate(a);
    if (a.pressed('left')) this.leftRight = -1; if (a.pressed('right')) this.leftRight = 1; if (a.wheel && this.prevItems.some((i) => i.slider && i.id === this.focus)) this.leftRight = a.wheel > 0 ? -1 : 1;
    this.backHit = a.pressed('back') || a.rightClick || this.backNext; this.backNext = false;
    s?.draw?.(this, dt);
    this.drawFocus(dt);
    if (this.subtitle) this.drawSubtitle(dt);
    this.drawToasts(dt);
    if (this.queued) { const q = this.queued; this.queued = null; q(); }
  }
  rectHit(pt, it) { const px = ((pt.x + 1) / 2) * this.W, py = ((1 - pt.y) / 2) * this.H; return px >= it.x && px < it.x + it.w && py >= it.y && py < it.y + it.h; }
  navigate(a) {
    const items = this.prevItems.filter((i) => !i.dead);
    if (!items.some((i) => i.id === this.focus)) this.focus = items[0]?.id ?? this.focus;
    const pt = this.app.ctx.input.pointer;
    if ((a.mouseMoved || a.click || a.touchDown) && pt) for (const it of items) if (this.rectHit(pt, it)) { if (this.focus !== it.id) { this.focus = it.id; this.playTick(); } if (a.click || a.touchDown) this.clickHit = it.id; }
    const lr = this.prevItems.find((i) => i.id === this.focus)?.slider;
    for (const [d, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
      if (!a.pressed(d) || (lr && dx !== 0)) continue;
      if (this.top?.nav?.(d, this)) continue;
      const cur = items.find((i) => i.id === this.focus); if (!cur) break;
      const cxx = cur.x + cur.w / 2, cyy = cur.y + cur.h / 2; let best = null, bd = 1e9;
      for (const it of items) { if (it === cur) continue; const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cxx, ddy = iy - cyy, along = ddx * dx + ddy * dy, across = Math.abs(ddx * dy) + Math.abs(ddy * dx); if (along <= 2) continue; const score = along + across * 2.2; if (score < bd) { bd = score; best = it; } }
      if (best) { this.focus = best.id; this.playTick(); }
    }
  }
  playTick() { this.app.mix?.ui('tick'); }
  // ---- widgets
  text(x, y, s, o = {}) { this.hud.text(x, y, clean(s), o); }
  center(y, s, o = {}) { const t = clean(s), sc = o.scale ?? 1; this.hud.text(Math.round(this.cx - (t.length * 6 * sc) / 2), y, t, o); }
  right(xr, y, s, o = {}) { const t = clean(s), sc = o.scale ?? 1; this.hud.text(Math.round(xr - t.length * 6 * sc), y, t, o); }
  rect(x, y, w, h, c) { this.hud.rect(x, y, w, h, c); }
  panel(x, y, w, h, c = 'ink', edge = 'night') { this.hud.rect(x, y, w, h, c); this.hud.rect(x, y, w, 1, edge); this.hud.rect(x, y + h - 1, w, 1, edge); this.hud.rect(x, y, 1, h, edge); this.hud.rect(x + w - 1, y, 1, h, edge); }
  title(s, sub) { this.hud.rect(0, 0, this.W, 22, 'ink'); this.hud.rect(0, 22, this.W, 1, 'slate'); const t = clean(s); this.text(10, t.length * 12 > this.W - 100 ? 8 : 5, t, { scale: t.length * 12 > this.W - 100 ? 1 : 2, color: 'sand' }); if (sub) this.right(this.W - 10, 8, sub, { color: 'mist' }); }
  para(x, y, s, width = 60, o = {}) { const lines = wrap(s, width); lines.forEach((l, i) => this.hud.text(x, y + i * 10, l, o)); return y + lines.length * 10; }
  bar(x, y, w, h, f, c = 'lime', bg = 'night') { this.hud.rect(x, y, w, h, bg); this.hud.rect(x, y, Math.max(0, Math.round(w * Math.min(1, f))), h, c); }
  /** A focusable item. Returns true on the frame it is confirmed. */
  item(id, x, y, w, h, o = {}) {
    const it = { id, x, y, w, h, label: o.label, slider: o.slider, disabled: o.disabled }; this.items.push(it);
    const a = this.app.actions, focused = this.focus === id;
    if (this.focus == null) this.focus = id;
    let hit = false;
    if (this.clickHit === id) { hit = true; this.clickHit = null; }
    else if (focused && a.pressed('confirm')) hit = true;
    if (hit) { a.consume('confirm'); this.confirmHit = id; if (o.disabled) { this.app.mix?.ui('denied'); return false; } this.app.mix?.ui('confirm'); }
    return hit;
  }
  button(id, x, y, w, h, label, o = {}) {
    const f = this.focus === id, bg = o.disabled ? 'ink' : f ? 'night' : o.bg ?? 'ink';
    this.hud.rect(x, y, w, h, bg); if (o.edge !== false) { this.hud.rect(x, y, w, 1, 'slate'); this.hud.rect(x, y + h - 1, w, 1, 'slate'); this.hud.rect(x, y, 1, h, 'slate'); this.hud.rect(x + w - 1, y, 1, h, 'slate'); }
    const sc = o.scale ?? 1, t = clean(label), tw = t.length * 6 * sc;
    this.hud.text(o.left ? x + 6 : Math.round(x + (w - tw) / 2), o.sub ? y + 4 : Math.round(y + (h - 7 * sc) / 2), t, { scale: sc, color: o.disabled ? 'slate' : o.color ?? (f ? 'sand' : 'white') });
    if (o.sub) { const s = clean(o.sub); this.hud.text(o.left ? x + 6 : Math.round(x + (w - s.length * 6) / 2), y + 5 + 7 * sc + 2, s, { color: o.disabled ? 'slate' : o.subColor ?? 'mist' }); }
    return this.item(id, x, y, w, h, { label, disabled: o.disabled });
  }
  slider(id, x, y, w, label, value, min, max, step, onChange, o = {}) {
    const f = this.focus === id, h = o.h ?? 18;
    this.hud.rect(x, y, w, h, f ? 'night' : 'ink');
    this.text(x + 4, y + 2, label, { color: f ? 'sand' : 'white' });
    const fmt = o.format ?? ((v) => v.toFixed(2)); this.right(x + w - 4, y + 2, fmt(value), { color: 'white' });
    const bx = x + 4, bw = w - 8, by = y + 11; this.hud.rect(bx, by, bw, 4, 'navy'); const fr = (value - min) / (max - min); this.hud.rect(bx, by, Math.round(bw * fr), 4, f ? 'lime' : 'mist'); this.hud.rect(bx + Math.round((bw - 2) * fr), by - 1, 2, 6, 'white');
    if (o.dflt != null) this.hud.rect(bx + Math.round((bw - 1) * ((o.dflt - min) / (max - min))), by + 4, 1, 2, 'sand');
    this.item(id, x, y, w, h, { label, slider: true });
    let v = value;
    if (f && this.leftRight) { v = Math.max(min, Math.min(max, Math.round((value + this.leftRight * step) / step) * step)); }
    const a = this.app.actions, input = this.app.ctx.input, pt = input.pointer;
    if (input.isDown('MouseLeft') && this.rectHit(pt, { x, y, w, h })) { const px = ((pt.x + 1) / 2) * this.W; v = min + (max - min) * Math.max(0, Math.min(1, (px - bx) / bw)); v = Math.round(v / step) * step; this.focus = id; }
    void a;
    if (Math.abs(v - value) > 1e-9) { this.app.mix?.ui('tick'); onChange(Math.round(v * 1e6) / 1e6); }
  }
  tabs(y, names, cur, onChange, id = 'tab') {
    const a = this.app.actions; let idx = cur;
    if (a.pressed('tabL')) idx = (cur - 1 + names.length) % names.length; if (a.pressed('tabR')) idx = (cur + 1) % names.length;
    const w = Math.min(90, Math.floor((this.W - 20) / names.length)); let x = 10;
    names.forEach((n, i) => { const on = i === cur; this.hud.rect(x, y, w - 2, 13, on ? 'navy' : 'ink'); if (on) this.hud.rect(x, y + 12, w - 2, 1, 'sand'); const t = clean(n); this.hud.text(Math.round(x + (w - 2 - t.length * 6) / 2), y + 3, t, { color: on ? 'sand' : 'mist' }); const pt = this.app.ctx.input.pointer; if (this.app.actions.click && this.rectHit(pt, { x, y, w: w - 2, h: 13 })) idx = i; x += w; });
    if (idx !== cur) { this.app.mix?.ui('tick'); onChange(idx); this.focus = null; this.clickHit = null; }
    void id;
  }
  /** Bottom prompt row: what the buttons do right now. Clicking a prompt does what the button does. */
  prompts(list) {
    const a = this.app.actions, dev = a.device, xb = this.app.settings.glyphs === 'xbox'; const y = this.H - 15;
    this.hud.rect(0, y - 2, this.W, 17, 'ink'); this.hud.rect(0, y - 3, this.W, 1, 'slate');
    let w = 0, cut = 99; const widthFor = (n) => { let t = 0; for (const [act, label] of list) t += glyphWidth(act, dev, xb) + 3 + Math.min(n, clean(label).length) * 6 + 10; return t; };
    w = widthFor(99); for (const n of [7, 5, 4, 3, 2]) { if (w <= this.W - 6) break; cut = n; w = widthFor(n); }
    let x = this.W - 8 - w + 10; if (x < 4) x = 4;
    const pt = this.app.ctx.input.pointer;
    for (const [act, label, cb] of list) {
      const x0 = x; x += drawGlyph(this.hud, x, y, act, dev, xb) + 3; const t = clean(label).slice(0, cut); this.hud.text(x, y + 2, t, { color: 'white' }); x += t.length * 6 + 10;
      if ((a.click || a.touchDown) && this.rectHit(pt, { x: x0, y: y - 2, w: x - x0, h: 15 })) { if (act === 'back') this.backNext = true; else if (cb) cb(); else this.pressNext = act; }
    }
    this.promptList = list;
  }
  status(line) { this.text(6, this.H - 13, line, { color: 'mist' }); }
  drawFocus(dt) {
    const it = this.items.find((i) => i.id === this.focus); if (!it) return;
    const b = this.box; if (!b.init) { Object.assign(b, { x: it.x, y: it.y, w: it.w, h: it.h, init: true }); }
    const k = 1 - Math.exp(-dt * 22); b.x += (it.x - b.x) * k; b.y += (it.y - b.y) * k; b.w += (it.w - b.w) * k; b.h += (it.h - b.h) * k;
    const pulse = Math.floor(this.t * 5) % 2 ? 'sand' : 'white', x = Math.round(b.x) - 2, y = Math.round(b.y) - 2, w = Math.round(b.w) + 4, h = Math.round(b.h) + 4;
    this.hud.rect(x, y, w, 2, pulse); this.hud.rect(x, y + h - 2, w, 2, pulse); this.hud.rect(x, y, 2, h, pulse); this.hud.rect(x + w - 2, y, 2, h, pulse);
  }
  say(text, speaker, o = {}) { const lines = wrap(text, Math.min(58, Math.floor((this.W - 18) / 6))).slice(0, 4); this.subtitle = { lines, speaker: speaker?.name ?? '', t: o.time ?? Math.max(2.5, text.length * 0.07) }; this.app.mix?.say(text, speaker?.id ?? speaker); }
  drawSubtitle(dt) {
    const s = this.subtitle; s.t -= dt; if (s.t <= 0) { this.subtitle = null; return; }
    const h = s.lines.length * 10 + (s.speaker ? 11 : 4) + 4, y = this.H - 19 - h - 2 - (this.subLift ?? 0), w = Math.min(60 * 6 + 12, this.W - 4), x = Math.round(this.cx - w / 2);
    this.hud.rect(x, y, w, h, 'ink'); this.hud.rect(x, y, 2, h, 'sand');
    if (s.speaker) this.hud.text(x + 7, y + 3, clean(s.speaker), { color: 'sand' });
    s.lines.forEach((l, i) => this.hud.text(x + 7, y + (s.speaker ? 13 : 4) + i * 10, l, { color: 'white' }));
  }
  toast(text, c = 'lime') { this.toasts.push({ text: clean(text), t: 2.4, c }); }
  drawToasts(dt) { this.toasts = this.toasts.filter((x) => (x.t -= dt) > 0); this.toasts.slice(-3).forEach((x, i) => { const w = x.text.length * 6 + 10, X = this.cx - w / 2, Y = 28 + i * 14; this.hud.rect(X, Y, w, 12, 'ink'); this.hud.rect(X, Y, w, 1, x.c); this.hud.text(X + 5, Y + 3, x.text, { color: x.c }); }); }
}
