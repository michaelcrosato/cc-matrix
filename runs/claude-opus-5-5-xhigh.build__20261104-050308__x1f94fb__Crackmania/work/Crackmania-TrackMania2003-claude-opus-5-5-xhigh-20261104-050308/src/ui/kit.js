// CRACKMANIA 10-foot UI kit (PLAN §3.3): a focus grid with spatial navigation (d-pad, stick, arrows; hold repeats),
// hover focuses and a click chooses, a wheel scrolls; tiles, buttons, panels, sliders, toggles, a letter wheel, toasts.
// Everything drawn in the game's pixels (E.px, E.font) at scale 2 for what a player must read
import { ctx, E } from '../ctx.js';
import { promptBar } from './glyphs.js';
const F = () => E.font;
export const UI = { bg: '#0e0c1a', panel: '#141226', ink: '#0a0812', text: '#ffffff', dim: '#a8a4c8', accent: '#ff9a2a', accent2: '#ffd060', good: '#5ad06a', bad: '#ff5a4a', blue: '#5ab4ff' };
export function accent() { const e = ctx.worlds && ctx.worlds.env; return { dustbowl: '#ff9a2a', hedgerow: '#6ad04a', frostpeak: '#6ad8ff' }[e] || UI.accent; }
/** a panel: dark translucent gradient, the accent border */
export function panel(g, x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  E.px.blend(g, o.alpha ?? .82, 'normal', () => { E.px.rect(g, x, y, w, h, o.bg || '#0c0a18'); E.px.rect(g, x, y, w, Math.round(h * .45), o.bg2 || '#1a1630'); });
  const c = o.border || '#3a3658'; E.px.rect(g, x, y, w, 1, c); E.px.rect(g, x, y + h - 1, w, 1, c); E.px.rect(g, x, y, 1, h, c); E.px.rect(g, x + w - 1, y, 1, h, c);
}
/** text helpers: big (scale 2) and small (scale 1), with a shadow for the TV */
export const T2 = (g, s, x, y, c = '#fff', a = 'left', o = {}) => F().text(g, s, Math.round(x), Math.round(y), c, Object.assign({ scale: 2, align: a, shadow: '#000', outline: false }, o));
export const T1 = (g, s, x, y, c = '#fff', a = 'left', o = {}) => F().text(g, s, Math.round(x), Math.round(y), c, Object.assign({ align: a, shadow: '#000', outline: false }, o));
export function title(g, s, x, y, scale = 3, colors = ['#fff6d0', '#ffd060', '#ff8a2a'], align = 'center') { F().title(g, s, Math.round(x), Math.round(y), { scale, colors, depth: 2, depthColor: '#2a1008', align }); }

/** the focus grid: items { id, x, y, w, h, onPick, onLeft/onRight (sliders), disabled, draw(g, it, focused, t) }; set
 *  each frame by the page (layout follows the screen), navigated in update */
export class Focus {
  constructor() { this.items = []; this.i = 0; this.t = 0; this.anim = new Map(); this.scroll = 0; this.hoverOK = true; this._pp = null; }
  set(items) { const was = this.items[this.i] && this.items[this.i].id; this.items = items; if (was !== undefined) { const k = items.findIndex(q => q.id === was); if (k >= 0) this.i = k; } if (this.i >= items.length) this.i = Math.max(0, items.length - 1); return this; }
  get cur() { return this.items[this.i] || null; }
  /** a new screen: forget the last one's items, focus index i */
  reset(i = 0) { this.items = []; this.i = i; this.anim.clear(); return this; }
  focusId(id) { const k = this.items.findIndex(q => q.id === id); if (k >= 0) this.i = k; }
  /** one step of input: returns 'pick' | 'move' | 'back' | null */
  update(dt, I = ctx.game.input) {
    this.t += dt;
    const it = this.items; if (!it.length) return null;
    let moved = false;
    for (const [a, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) {
      if (!I.repeat(a, .32, .09)) continue;
      const c = it[this.i];
      if (c && dx && (dx < 0 ? c.onLeft : c.onRight)) { (dx < 0 ? c.onLeft : c.onRight)(); ctx.sound && ctx.sound.sfx('tick'); moved = true; continue; }
      const k = this.nearest(dx, dy); if (k >= 0 && k !== this.i) { this.i = k; moved = true; ctx.sound && ctx.sound.sfx('move'); }
    }
    // the mouse: hover moves the focus, a click picks, the wheel scrolls
    const p = I.pointer && I.pointer(), lm = I.lastDevice === 'mouse';
    if (p && lm && (!this._pp || p[0] !== this._pp[0] || p[1] !== this._pp[1])) { const k = this.hit(p); if (k >= 0 && k !== this.i && !it[k].disabled) { this.i = k; ctx.sound && ctx.sound.sfx('move'); } }
    this._pp = p ? p.slice() : null;
    const ck = I.clicked && I.clicked();
    if (ck) { const k = this.hit(ck); if (k >= 0 && !it[k].disabled) { this.i = k; const q = it[k]; if (q.onClick) q.onClick(ck); else if (q.onPick) { ctx.sound && ctx.sound.sfx('confirm'); I.consumeAll(); q.onPick(q); } return 'pick'; } }
    if (I.pressed('confirm')) { const q = it[this.i]; if (q && !q.disabled && q.onPick) { ctx.sound && ctx.sound.sfx('confirm'); I.consumeAll(); q.onPick(q); return 'pick'; } if (q && q.disabled) { ctx.sound && ctx.sound.sfx('error'); } }
    return moved ? 'move' : null;
  }
  hit(p) { for (let k = this.items.length - 1; k >= 0; k--) { const q = this.items[k]; if (q.nohit) continue; if (p[0] >= q.x && p[0] < q.x + q.w && p[1] >= q.y && p[1] < q.y + q.h) return k; } return -1; }
  /** the nearest item in a direction (spatial navigation) */
  nearest(dx, dy) {
    const c = this.items[this.i]; if (!c) return 0; const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = -1, bd = 1e9;
    this.items.forEach((q, k) => {
      if (k === this.i || q.skip) return; const qx = q.x + q.w / 2, qy = q.y + q.h / 2, ex = qx - cx, ey = qy - cy, along = ex * dx + ey * dy; if (along <= 2) return;
      const across = Math.abs(ex * dy) + Math.abs(ey * dx), d = along + across * 2.2; if (d < bd) { bd = d; best = k; }
    });
    if (best < 0 && (dy || dx)) {   // wrap round in a list
      const sorted = this.items.map((q, k) => [k, dy ? q.y : q.x]).filter(([k]) => !this.items[k].skip).sort((a, b) => a[1] - b[1]); if (sorted.length > 1) best = (dy || dx) > 0 ? sorted[0][0] : sorted[sorted.length - 1][0];
    }
    return best;
  }
  /** how focused an item looks now (0..1, eased: the focus scale and glow) */
  k(q) { const id = q.id, cur = this.items[this.i] === q ? 1 : 0; let v = this.anim.get(id) ?? cur; v += (cur - v) * Math.min(1, ctx.game.reduceMotion ? 1 : .25); this.anim.set(id, v); return v; }
  draw(g) { for (const q of this.items) if (q.draw) q.draw(g, q, this.items[this.i] === q, this.k(q), this.t); }
}
/** a tile: rect, label (scale 2), sub (scale 1), accent; focused: 1.08x and a glow */
export function tile(g, q, foc, k, t, o = {}) {
  const ac = o.accent || accent(), s = 1 + .06 * k, w = q.w * s, h = q.h * s, x = q.x - (w - q.w) / 2, y = q.y - (h - q.h) / 2;
  if (k > .05) E.px.blend(g, .35 * k, 'add', () => E.px.rect(g, x - 3, y - 3, w + 6, h + 6, ac));
  panel(g, x, y, w, h, { border: foc ? ac : q.disabled ? '#2a2840' : '#4a4670', alpha: q.disabled ? .7 : .85, bg2: foc ? '#2a2448' : '#1a1630' });
  if (foc) { E.px.rect(g, x, y, w, 2, ac); E.px.rect(g, x, y + h - 2, w, 2, ac); }
  if (o.inner) o.inner(g, x, y, w, h, k);
  if (q.label) { const col = q.disabled ? '#6a6688' : foc ? '#ffffff' : '#e0dcf8', ly = y + (o.labelY ?? h / 2 - 7); if (F().width(q.label, { scale: 2 }) <= w - 8) T2(g, q.label, x + w / 2, ly, col, 'center'); else T1(g, q.label, x + w / 2, ly + 3, col, 'center'); }
  if (q.sub) T1(g, q.sub, x + w / 2, y + (o.subY ?? h - 13), q.disabled ? '#5a5678' : foc ? ac : UI.dim, 'center');
}
/** a row button (a list's entry): label left, value right */
export function rowItem(g, q, foc, k, t, o = {}) {
  const ac = o.accent || accent();
  panel(g, q.x, q.y, q.w, q.h, { border: foc ? ac : '#3a3658', alpha: .8, bg2: foc ? '#2a2448' : '#16142a' });
  if (foc) E.px.rect(g, q.x, q.y, 3, q.h, ac);
  const vs = q.value !== undefined && q.value !== '' ? String(q.value) : '', vw = vs ? F().width(vs, { scale: 2 }) : 0, room = q.w - 20 - vw - 8, big = F().width(q.label, { scale: 2 }) <= room;
  if (big) T2(g, q.label, q.x + 10, q.y + q.h / 2 - 7, q.disabled ? '#6a6688' : '#ffffff'); else T1(g, q.label, q.x + 10, q.y + q.h / 2 - 4, q.disabled ? '#6a6688' : '#ffffff');
  if (vs) T2(g, vs, q.x + q.w - 10, q.y + q.h / 2 - 7, foc ? ac : UI.dim, 'right');
  if (o.extra) o.extra(g, q, foc);
}
/** a slider row */
export function sliderItem(g, q, foc, k, t, o = {}) {
  const ac = o.accent || accent();
  panel(g, q.x, q.y, q.w, q.h, { border: foc ? ac : '#3a3658', alpha: .8 });
  T1(g, q.label, q.x + 6, q.y + 4, '#ffffff');
  const bx = q.x + 6, bw = q.w - 70, by = q.y + q.h - 8, f = Math.max(0, Math.min(1, (q.val - q.min) / (q.max - q.min))), fd = Math.max(0, Math.min(1, (q.def - q.min) / (q.max - q.min)));
  E.px.rect(g, bx, by, bw, 3, '#2a2840'); E.px.rect(g, bx, by, Math.round(bw * f), 3, foc ? ac : '#8a86b8'); E.px.rect(g, bx + Math.round(bw * fd), by - 2, 1, 7, '#ffffff');
  E.px.rect(g, bx + Math.round(bw * f) - 2, by - 2, 5, 7, foc ? '#ffffff' : '#c8c4e8');
  T1(g, q.text || String(q.val), q.x + q.w - 6, q.y + q.h / 2 - 4, foc ? ac : UI.dim, 'right');
}
/** toasts: short lines that slide in at the top and go */
const toasts = [];
export function toast(text, color = '#ffffff', t = 2.4) { toasts.push({ text, color, t, max: t }); if (toasts.length > 3) toasts.shift(); }
export function drawToasts(g, r, dt) {
  let y = 34;
  for (const q of toasts) { q.t -= dt; const k = Math.min(1, (q.max - q.t) * 6, q.t * 4); if (k <= 0) continue; const w = F().width(q.text, { scale: 2 }) + 24, x = r.W / 2 - w / 2; panel(g, x, y - (1 - k) * 10, w, 22, { border: q.color }); T2(g, q.text, r.W / 2, y + 4 - (1 - k) * 10, q.color, 'center'); y += 26; }
  for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t <= 0) toasts.splice(i, 1);
}
/** a letter wheel for names (A-Z, 0-9, space): up/down turn the letter, left/right move, confirm on DONE */
export class LetterWheel {
  constructor(name = 'PLAYER', max = 10) { this.chars = name.toUpperCase().padEnd(max, ' ').slice(0, max).split(''); this.i = 0; this.max = max; this.done = false; }
  static ABC = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!';
  update(I) {
    const A = LetterWheel.ABC, c = this.chars[this.i], k = A.indexOf(c);
    if (I.repeat('up', .3, .07)) { this.chars[this.i] = A[(k + 1) % A.length]; ctx.sound && ctx.sound.sfx('tick'); }
    if (I.repeat('down', .3, .07)) { this.chars[this.i] = A[(k - 1 + A.length) % A.length]; ctx.sound && ctx.sound.sfx('tick'); }
    if (I.repeat('right', .3, .1)) this.i = Math.min(this.max - 1, this.i + 1);
    if (I.repeat('left', .3, .1)) this.i = Math.max(0, this.i - 1);
    if (this.typed) { for (const ch of this.typed.splice(0)) { if (ch === 'Backspace') { this.i = Math.max(0, this.i - 1); this.chars[this.i] = ' '; } else if (A.includes(ch.toUpperCase())) { this.chars[this.i] = ch.toUpperCase(); this.i = Math.min(this.max - 1, this.i + 1); } } }
    if (I.pressed('confirm')) { this.done = true; I.consumeAll(); }
  }
  get name() { return this.chars.join('').trim() || 'PLAYER'; }
  draw(g, x, y) {
    const w = this.max * 16, x0 = Math.round(x - w / 2);
    for (let i = 0; i < this.max; i++) { const cx = x0 + i * 16, sel = i === this.i; panel(g, cx, y, 14, 22, { border: sel ? accent() : '#3a3658' }); T2(g, this.chars[i], cx + 7, y + 4, sel ? accent() : '#ffffff', 'center'); if (sel) { T1(g, '▲', cx + 7, y - 10, accent(), 'center'); T1(g, '▼', cx + 7, y + 25, accent(), 'center'); } }
  }
}
export { promptBar };
