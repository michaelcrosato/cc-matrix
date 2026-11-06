// Immediate-mode UI over ctx.hud. Widgets register a rectangle a frame; direction input moves focus to the nearest one that way.
import { hudSprite, PALETTE } from '../../pixel-engine.js';
const CW = 6; const LH = 9;
export class UI {
  constructor(ctx, router) { this.ctx = ctx; this.router = router; this.widgets = []; this.prev = []; this.focus = null; this.drawnText = []; this.rects = []; this.scroll = 0; this.glyphs = 'playstation'; this.frameN = 0; this.iconCache = {}; this.moved = false; this.modalStack = 0; this.activatedThisFrame = null; }
  get W() { return this.ctx.hud.width; }
  get H() { return this.ctx.hud.height; }
  get width() { return this.W; }
  get height() { return this.H; }
  begin() {
    const r = this.router; const hud = this.ctx.hud;
    this.prev = this.widgets; this.widgets = []; this.drawnText = []; this.frameN++;
    hud.clear();
    this.m = r.menu; this.confirmUsed = false;
    this.px = ((this.ctx.input.pointer.x + 1) / 2) * this.W; this.py = ((1 - this.ctx.input.pointer.y) / 2) * this.H;
    // Hover moves focus when the pointer moved.
    if (r.pointerMoved) { const hit = this.prev.find((w) => this.inside(w) && !w.noFocus); if (hit) { if (this.focus !== hit.id) { this.focus = hit.id; this.ctx.audio.play('ui_move', { volume: 0.5 }); } } }
    // Directions move focus to the nearest rectangle that way.
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [name, dx, dy] of dirs) if (this.m[name]) this.moveFocus(dx, dy);
    if (this.focus && !this.prev.some((w) => w.id === this.focus)) this.focus = null;
    this.defaultFocus = !this.focus;
  }
  moveFocus(dx, dy) {
    const list = this.prev.filter((w) => !w.noFocus); if (!list.length) return;
    const cur = list.find((w) => w.id === this.focus);
    if (!cur) { this.focus = list[0].id; return; }
    const cx = cur.x + cur.w / 2; const cy = cur.y + cur.h / 2; let best = null; let bs = Infinity;
    for (const w of list) {
      if (w === cur) continue;
      const x = w.x + w.w / 2; const y = w.y + w.h / 2; const ax = (x - cx) * dx + (y - cy) * dy; if (ax <= 2) continue;
      const off = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
      const s = ax + off * 2.5; if (s < bs) { bs = s; best = w; }
    }
    if (best) { this.focus = best.id; this.ctx.audio.play('ui_move', { volume: 0.6 }); }
  }
  inside(w) { return this.px >= w.x && this.px < w.x + w.w && this.py >= w.y && this.py < w.y + w.h; }
  text(x, y, str, o = {}) {
    const s = String(str); const scale = o.scale ?? 1;
    this.ctx.hud.text(Math.round(x), Math.round(y), s, { color: o.color ?? 'white', scale, shadow: o.shadow ?? 'ink' });
    const w = this.ctx.hud.measure(s.toUpperCase(), scale).width;
    this.drawnText.push({ text: s, x: Math.round(x), y: Math.round(y), w, h: 7 * scale, world: !!o.world });
    return w;
  }
  textC(cx, y, str, o = {}) { const w = this.measure(str, o.scale ?? 1); return this.text(cx - w / 2, y, str, o); }
  textR(rx, y, str, o = {}) { const w = this.measure(str, o.scale ?? 1); return this.text(rx - w, y, str, o); }
  measure(str, scale = 1) { return this.ctx.hud.measure(String(str).toUpperCase(), scale).width; }
  rect(x, y, w, h, color) { this.ctx.hud.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), color); }
  frame(x, y, w, h, color = 'slate', fill = 'ink') { this.rect(x, y, w, h, color); this.rect(x + 1, y + 1, w - 2, h - 2, fill); }
  sprite(x, y, rows, colors, o = {}) { this.ctx.hud.sprite(Math.round(x), Math.round(y), rows, colors, o); }
  icon(x, y, id, o = {}) {
    let s = this.iconCache[id]; if (!s) { try { s = hudSprite(id); } catch { s = { rows: ['#'], colors: { '#': 'white' } }; } this.iconCache[id] = s; }
    this.ctx.hud.sprite(Math.round(x), Math.round(y), s.rows, o.colors ?? s.colors, { scale: o.scale ?? 1 });
  }
  // A rectangle that can take focus and be activated. Returns true on activation this frame.
  widget(id, x, y, w, h, o = {}) {
    const rect = { id, x, y, w, h, noFocus: !!o.noFocus }; this.widgets.push(rect);
    if (this.defaultFocus && !o.noFocus && o.first !== false && !this.focus) { this.focus = id; this.defaultFocus = false; }
    const focused = this.focus === id;
    const click = this.router.click && this.inside(rect) && !o.noFocus;
    if (click) this.focus = id;
    let act = false;
    if (click || (focused && this.m.confirm && !this.confirmUsed)) { act = true; this.confirmUsed = true; }
    if (this.router.rclick && this.inside(rect) && !o.noFocus) { this.rclicked = id; }
    return { act, focused: this.focus === id, hover: this.inside(rect) };
  }
  button(id, x, y, w, h, label, o = {}) {
    const st = this.widget(id, x, y, w, h, o);
    const c = o.disabled ? 'slate' : st.focused ? (o.focusColor ?? 'sand') : (o.border ?? 'slate');
    this.frame(x, y, w, h, c, st.focused ? (o.focusFill ?? 'plum') : (o.fill ?? 'night'));
    const scale = o.scale ?? 1;
    const ty = y + Math.floor((h - 7 * scale) / 2);
    if (o.align === 'left') this.text(x + 5 + (o.indent ?? 0), ty, label, { color: o.disabled ? 'mist' : (st.focused ? 'white' : (o.color ?? 'white')), scale });
    else this.textC(x + w / 2, ty, label, { color: o.disabled ? 'mist' : (st.focused ? 'white' : (o.color ?? 'white')), scale });
    if (st.act) this.ctx.audio.play(o.disabled ? 'ui_error' : 'ui_ok');
    return !o.disabled && st.act;
  }
  wrap(str, width, scale = 1) {
    const max = Math.max(4, Math.floor(width / (CW * scale))); const out = [];
    for (const para of String(str).toUpperCase().split('\n')) {
      let line = '';
      for (const w of para.split(' ')) { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
      out.push(line);
    }
    return out;
  }
  para(x, y, str, width, o = {}) { const lines = this.wrap(str, width, o.scale ?? 1); const lh = (o.lh ?? LH) * (o.scale ?? 1); lines.forEach((l, i) => this.text(x, y + i * lh, l, o)); return lines.length * lh; }
  bar(x, y, w, h, frac, color, back = 'ink') { this.rect(x, y, w, h, back); this.rect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, frac))), h - 2, color); }
  dim() { this.rect(0, 0, this.W, 2, 'ink'); }
}
export { PALETTE, LH, CW };
