// Immediate-mode, controller-first UI over ctx.hud. One focused item at all times; focus box slides. Plan section 7.
import { glyph, promptWidth } from './glyphs.js';
export class UI {
  constructor() { this.items = []; this.prev = []; this.focus = null; this.fx = null; this.pulse = 0; this.xbox = false; this.device = 'key'; this.sounds = null; this.captured = null; this.t = 0; this.lastFocus = null; this.press = false; this.cursorT = 0; }
  begin(ctx, A, dt, { w, h } = {}) {
    this.hud = ctx.hud; this.A = A; this.W = ctx.hud.width; this.H = ctx.hud.height; this.dt = dt; this.t += dt; this.pulse += dt; this.device = A.last; this.items = []; this.press = A.confirm; this.hover = false;
    const P = this.prev; this.cursorT = A.mouse.moved || A.mouse.pressed ? 0 : this.cursorT + dt;
    // mouse hover moves focus
    if (A.last === 'mouse' && A.mouse.moved && P.length) { const mx = (A.mouse.x + 1) / 2 * this.W, my = (1 - A.mouse.y) / 2 * this.H; const hit = P.find((it) => mx >= it.x && mx < it.x + it.w && my >= it.y && my < it.y + it.h); if (hit && hit.id !== this.focus) { this.focus = hit.id; this.tick(); } }
    if (A.last === 'mouse' && A.mouse.pressed && P.length) { const mx = (A.mouse.x + 1) / 2 * this.W, my = (1 - A.mouse.y) / 2 * this.H; const hit = P.find((it) => mx >= it.x && mx < it.x + it.w && my >= it.y && my < it.y + it.h); if (hit) this.focus = hit.id; else this.press = false; }
    // directional focus
    const f = P.find((i) => i.id === this.focus);
    if (!f && P.length) this.focus = P[0].id;
    else if (f && !f.slider && (A.moveX || A.moveY)) this.move(f, A.moveX, A.moveY);
    else if (f && f.slider && A.moveY) this.move(f, 0, A.moveY);
    this.consumed = false;
  }
  move(f, dx, dy) {
    let best = null, bs = Infinity; const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    for (const it of this.prev) { if (it === f || it.disabled === 'skip') continue; const ix = it.x + it.w / 2 - cx, iy = it.y + it.h / 2 - cy; const along = dx ? ix * dx : iy * dy, across = dx ? Math.abs(iy) : Math.abs(ix); if (along <= 1) continue; const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = it; } }
    if (!best) { // wrap around lists
      const list = this.prev.filter((i) => i !== f); if (!list.length) return; if (dy) { best = dy > 0 ? list.reduce((a, b) => (b.y < a.y ? b : a)) : list.reduce((a, b) => (b.y > a.y ? b : a)); if ((best.y > f.y && dy > 0) || (best.y < f.y && dy < 0)) best = null; } }
    if (best) { this.focus = best.id; this.tick(); }
  }
  tick() { this.sounds?.tick(); }
  // Registers a focusable rect. Returns { focus, pressed, hover }.
  item(id, x, y, w, h, opts = {}) { this.items.push({ id, x, y, w, h, slider: !!opts.slider, disabled: opts.disabled }); const focus = this.focus === id; if (focus) this.focusRect = { x, y, w, h }; return { focus, pressed: focus && this.press && !opts.disabled }; }
  end() { this.prev = this.items; if (this.focusRect) { const f = this.focusRect; if (!this.fx) this.fx = { ...f }; const k = 1 - Math.exp(-this.dt * 22); this.fx.x += (f.x - this.fx.x) * k; this.fx.y += (f.y - this.fx.y) * k; this.fx.w += (f.w - this.fx.w) * k; this.fx.h += (f.h - this.fx.h) * k; const r = this.fx, c = Math.sin(this.pulse * 8) > 0 ? 'sand' : 'orange', hud = this.hud; const x = Math.round(r.x) - 2, y = Math.round(r.y) - 2, w = Math.round(r.w) + 4, h = Math.round(r.h) + 4; hud.rect(x, y, w, 2, c); hud.rect(x, y + h - 2, w, 2, c); hud.rect(x, y, 2, h, c); hud.rect(x + w - 2, y, 2, h, c); this.focusRect = null; } }
  // ---- drawing helpers ----
  text(x, y, s, o = {}) { this.hud.text(x, y, String(s).toUpperCase(), { color: 'white', shadow: 'ink', ...o }); }
  center(y, s, o = {}) { const sc = o.scale ?? 1, w = this.hud.measure(String(s).toUpperCase(), sc).width; this.text(Math.round((this.W - w) / 2), y, s, o); }
  width(s, sc = 1) { return this.hud.measure(String(s).toUpperCase(), sc).width; }
  panel(x, y, w, h, c = 'ink', edge = 'slate') { this.hud.rect(x, y, w, h, edge); this.hud.rect(x + 1, y + 1, w - 2, h - 2, c); }
  title(s, sub) { this.panel(0, 0, this.W, 26, 'navy', 'slate'); this.text(10, 7, s, { scale: 2, color: 'sand' }); if (sub) this.text(this.W - 10 - this.width(sub), 10, sub, { color: 'mist' }); }
  wrap(s, n = 58) { const out = []; let line = ''; for (const w of String(s).toUpperCase().split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }
  prose(x, y, s, o = {}) { const lines = this.wrap(s, o.n ?? 58); lines.slice(0, o.max ?? 4).forEach((l, i) => this.text(x, y + i * (o.lh ?? 10), l, o)); return lines.length; }
  prompts(items) { const hud = this.hud, dev = this.device, y = this.H - 14; this.hud.rect(0, this.H - 18, this.W, 18, 'ink'); this.hud.rect(0, this.H - 18, this.W, 1, 'slate'); let x = 10; for (const [a, l] of items) { x += glyph(hud, x, y, a, dev, this.xbox); x += 3; this.text(x, y + 1, l, { color: 'mist' }); x += this.width(l) + 12; } }
  // buttons: simple labelled box
  button(id, x, y, w, h, label, o = {}) { const r = this.item(id, x, y, w, h, o); this.panel(x, y, w, h, o.disabled ? 'night' : r.focus ? 'blue' : 'navy', r.focus ? 'sky' : 'slate'); const sc = o.scale ?? 1; this.text(x + Math.round((w - this.width(label, sc)) / 2), y + Math.round((h - 7 * sc) / 2), label, { scale: sc, color: o.disabled ? 'slate' : 'white' }); if (o.sub) this.text(x + w - this.width(o.sub) - 4, y + h - 9, o.sub, { color: o.subColor ?? 'sand' }); return r; }
  slider(id, x, y, w, label, value, min, max, step, fmt, o = {}) { const r = this.item(id, x, y, w, 16, { slider: true }); const A = this.A; let v = value, changed = false; if (r.focus) { if (A.moveX) { v = Math.max(min, Math.min(max, +(value + A.moveX * step).toFixed(4))); changed = v !== value; } if (A.mouse.down && A.last === 'mouse') { const mx = (A.mouse.x + 1) / 2 * this.W, bx = x + 100, bw = w - 140; if (mx >= bx - 6 && mx <= bx + bw + 6) { v = Math.round((min + ((mx - bx) / bw) * (max - min)) / step) * step; v = Math.max(min, Math.min(max, +v.toFixed(4))); changed = v !== value; } } if (A.mouse.wheel) { v = Math.max(min, Math.min(max, +(value - Math.sign(A.mouse.wheel) * step).toFixed(4))); changed = v !== value; } if (A.confirm && A.last !== 'mouse' && o.def !== undefined) { v = o.def; changed = v !== value; } }
    this.panel(x, y, w, 16, r.focus ? 'blue' : 'navy', r.focus ? 'sky' : 'slate'); this.text(x + 5, y + 5, label, { color: 'white' }); const bx = x + 100, bw = w - 140, fr = (v - min) / (max - min || 1); this.hud.rect(bx, y + 6, bw, 4, 'ink'); this.hud.rect(bx, y + 6, Math.round(bw * fr), 4, r.focus ? 'sand' : 'sky'); this.hud.rect(bx + Math.round(bw * fr) - 1, y + 3, 3, 10, 'white'); this.text(x + w - 34, y + 5, fmt ? fmt(v) : v, { color: 'sand' }); if (changed) this.sounds?.tick(); return v; }
  // a cycling option row: left/right or confirm change the value. Returns the new index.
  option(id, x, y, w, label, values, idx, o = {}) { const r = this.item(id, x, y, w, 16, { slider: true }); const A = this.A; let n = idx; if (r.focus) { if (A.moveX) n = (idx + A.moveX + values.length) % values.length; else if (r.pressed && A.last !== 'mouse') n = (idx + 1) % values.length; else if (r.pressed && A.last === 'mouse') n = (idx + 1) % values.length; } if (n !== idx) this.sounds?.tick(); this.panel(x, y, w, 16, r.focus ? 'blue' : 'navy', r.focus ? 'sky' : 'slate'); this.text(x + 5, y + 5, label, { color: 'white' }); const v = String(values[n]).toUpperCase(); this.text(x + w - 6 - this.width(v), y + 5, v, { color: 'sand' }); if (r.focus && values.length > 1) this.text(x + w - 12 - this.width(v), y + 5, '<', { color: 'mist' }); return n; }
  tabs(labels, cur, y = 30) { let x = 10; labels.forEach((l, i) => { const w = this.width(l) + 14; this.panel(x, y, w, 14, i === cur ? 'blue' : 'night', i === cur ? 'sky' : 'slate'); this.text(x + 7, y + 4, l, { color: i === cur ? 'white' : 'mist' }); x += w + 3; }); }
}
