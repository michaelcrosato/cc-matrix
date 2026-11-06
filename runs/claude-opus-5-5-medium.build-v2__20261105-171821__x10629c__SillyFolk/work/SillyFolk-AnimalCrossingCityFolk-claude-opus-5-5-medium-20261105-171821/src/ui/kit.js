// UI kit: screen stack, panels, prompts (glyphs follow the last device), generic menus with real focus and hit areas.
import { drawText, textWidth, wrap, LINE_H } from './font.js';
import { clamp } from '../core/util.js';
export const UI = { stack: [], hits: [], time: 0, ctrl: null, hud: null, xbox: false, sfx: () => {}, cursor: true,
  push(s) { this.stack.push(s); s.t = 0; s.open?.(); this.ctrl?.lock(0.08); return s; },
  pop(s) { if (s) { const i = this.stack.indexOf(s); if (i >= 0) this.stack.splice(i, 1); } else this.stack.pop(); this.ctrl?.lock(0.08); },
  get top() { return this.stack[this.stack.length - 1]; },
  clear() { this.stack.length = 0; },
  frozen() { return this.stack.some((s) => s.freezes !== false); },
  update(dt) { this.time += dt; const t = this.top; for (const s of this.stack) s.t = (s.t || 0) + dt; if (t) t.input?.(this.ctrl, dt); },
  draw(h) { this.hits.length = 0; let from = 0; for (let i = this.stack.length - 1; i >= 0; i--) if (this.stack[i].opaque) { from = i; break; } for (let i = from; i < this.stack.length; i++) { const s = this.stack[i]; s.draw?.(h, i === this.stack.length - 1); } },
  model() { const t = this.top; return { screen: t?.id ?? null, depth: this.stack.length, focus: t?.focusLabel?.() ?? null, items: t?.itemsModel?.() ?? null, prompts: t?.prompts ?? null, title: t?.title ?? null }; },
};
export const C = { ink: 'ink', panel: 'white', trim: 'sand', soft: 'mist', accent: 'red', blue: 'blue' };
export function panel(h, x, y, w, ht, o = {}) {
  const fill = o.fill ?? 'white', trim = o.trim ?? 'sand';
  h.rect(x + 1, y, w - 2, ht, trim); h.rect(x, y + 1, w, ht - 2, trim);
  h.rect(x + 2, y + 2, w - 4, ht - 4, fill);
  if (o.shadow !== false) h.rect(x + 2, y + ht, w - 3, 1, 'ink');
}
export const dim = (h, c = 'ink') => { for (let y = 0; y < 270; y += 2) h.rect(0, y, 480, 1, c); };
export function text(h, x, y, s, o) { return drawText(h, x, y, s, o); }
export function para(h, x, y, s, w, o = {}) { const lines = wrap(s, w); lines.forEach((l, i) => drawText(h, x, y + i * LINE_H, l, o)); return lines.length * LINE_H; }

// ---- Glyphs
const S = {
  cross: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], circle: ['.###.', '#...#', '#...#', '#...#', '.###.'], square: ['#####', '#...#', '#...#', '#...#', '#####'], triangle: ['..#..', '..#..', '.#.#.', '.#.#.', '#####'],
  lmb: ['.##.', '#.#.', '#.#.', '####', '#..#', '.##.'], rmb: ['.##.', '.#.#', '.#.#', '####', '#..#', '.##.'], wheel: ['.##.', '####', '#..#', '#..#', '.##.'],
};
const PAD_PS = { PadCross: ['cross', 'blue'], PadCircle: ['circle', 'red'], PadSquare: ['square', 'plum'], PadTriangle: ['triangle', 'green'], PadL1: 'L1', PadR1: 'R1', PadL2: 'L2', PadR2: 'R2', PadOptions: 'Options', PadUp: 'D↑', PadDown: 'D↓', PadLeft: 'D←', PadRight: 'D→', PadTouch: 'Pad' };
const PAD_XB = { PadCross: 'A', PadCircle: 'B', PadSquare: 'X', PadTriangle: 'Y', PadL1: 'LB', PadR1: 'RB', PadL2: 'LT', PadR2: 'RT', PadOptions: 'Menu', PadUp: 'D↑', PadDown: 'D↓', PadLeft: 'D←', PadRight: 'D→', PadTouch: 'View' };
const PROMPT = {
  confirm: { pad: 'PadCross', kb: 'E', mouse: 'lmb' }, tool: { pad: 'PadSquare', kb: 'Space', mouse: 'rmb' }, back: { pad: 'PadCircle', kb: 'Esc', mouse: 'rmb' }, pockets: { pad: 'PadTriangle', kb: 'Tab', mouse: 'Tab' }, tools: { pad: 'PadR1', kb: '1-6', mouse: 'wheel' },
  map: { pad: 'PadTouch', kb: 'M', mouse: 'M' }, almanac: { pad: 'PadDown', kb: 'J', mouse: 'J' }, emotes: { pad: 'PadLeft', kb: 'G', mouse: 'G' }, pause: { pad: 'PadOptions', kb: 'Esc', mouse: 'Esc' }, l1: { pad: 'PadL1', kb: 'Q', mouse: 'Q' }, r1: { pad: 'PadR1', kb: 'R', mouse: 'R' }, alt: { pad: 'PadTriangle', kb: 'T', mouse: 'T' }, square: { pad: 'PadSquare', kb: 'Space', mouse: 'Space' }, run: { pad: 'PadCircle', kb: 'Shift', mouse: 'Shift' },
};
export function glyphFor(action) { const d = UI.ctrl?.device ?? 'kb'; return PROMPT[action]?.[d] ?? action; }
export function promptSig() { const d = UI.ctrl?.device ?? 'kb'; return d === 'pad' ? (UI.xbox ? 'xbox' : 'ps') : d; }
/** Draws a button glyph; returns its width. */
export function drawGlyph(h, x, y, action) {
  const g = glyphFor(action), dev = UI.ctrl?.device ?? 'kb';
  if (dev === 'pad') {
    const m = UI.xbox ? PAD_XB[g] : PAD_PS[g];
    if (Array.isArray(m)) { h.rect(x + 1, y, 9, 11, 'ink'); h.rect(x, y + 1, 11, 9, 'ink'); h.sprite(x + 3, y + 3, S[m[0]], { '#': { blue: 'sky', red: 'red', plum: 'sand', green: 'lime' }[m[1]] }, { shadow: false }); return 11; }
    return chip(h, x, y, m ?? g, 'ink', 'white');
  }
  if (S[g]) { h.rect(x + 1, y, 9, 11, 'ink'); h.rect(x, y + 1, 11, 9, 'ink'); h.sprite(x + 3, y + 2, S[g], { '#': 'white' }, { shadow: false }); return 11; }
  return chip(h, x, y, g, 'mist', 'ink');
}
function chip(h, x, y, label, bg, fg) { const w = Math.max(11, textWidth(label) + 6); h.rect(x + 1, y, w - 2, 11, bg); h.rect(x, y + 1, w, 9, bg); h.rect(x + 1, y + 10, w - 2, 1, 'slate'); drawText(h, x + 3, y + 2, label, { color: fg }); return w; }
/** Row of prompts anchored to the right edge or left. list: [[action, label], ...] */
export function promptRow(h, x, y, list, o = {}) {
  const wOf = ([a, l]) => glyphWidth(a) + 4 + textWidth(l) + 10;
  let total = list.reduce((s, p) => s + wOf(p), 0) - 10;
  let cx = o.align === 'right' ? x - total : o.align === 'center' ? Math.round(x - total / 2) : x;
  if (o.back) { h.rect(cx - 5, y - 3, total + 10, 17, o.back); }
  for (const p of list) { const w = drawGlyph(h, cx, y, p[0]); drawText(h, cx + w + 4, y + 2, p[1], { color: o.color ?? 'white', shadow: o.shadow ?? (o.back ? false : 'ink') }); cx += wOf(p); }
}
function glyphWidth(a) { const g = glyphFor(a), dev = UI.ctrl?.device ?? 'kb'; if (dev === 'pad') { const m = UI.xbox ? PAD_XB[g] : PAD_PS[g]; if (Array.isArray(m)) return 11; return Math.max(11, textWidth(m ?? g) + 6); } if (S[g]) return 11; return Math.max(11, textWidth(g) + 6); }

// ---- Hit areas: a screen registers rectangles while drawing; hover moves focus, click activates.
export const hit = (x, y, w, h, id) => { UI.hits.push({ x, y, w, h, id }); };
export function hitAt(mx, my) { for (let i = UI.hits.length - 1; i >= 0; i--) { const r = UI.hits[i]; if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return r.id; } return null; }

// ---- Generic list menu with paging, sliders and value items
export function menu(o) {
  const m = { id: o.id ?? 'menu', title: o.title, sub: o.sub, freezes: o.freezes, opaque: o.opaque, page: 0, focus: o.focus ?? 0, perPage: o.perPage ?? 8, w: o.w ?? 300, pop: o.onBack !== null, get prompts() { return this._prompts; },
    items() { return (typeof o.items === 'function' ? o.items() : o.items).filter(Boolean); },
    open() { o.onOpen?.(m); },
    focusLabel() { const it = this.items()[this.focus]; return it ? labelOf(it) : null; },
    itemsModel() { return this.items().map(labelOf); },
    activate(it, c) { if (!it || it.disabled) { UI.sfx('uiNo'); return; } if (it.slider) return; if (it.onRight && !it.action) { it.onRight(); UI.sfx('uiTick'); return; } UI.sfx('uiOk'); it.action?.(m); },
    input(c) {
      const list = this.items(), n = list.length; if (this.focus >= n) this.focus = Math.max(0, n - 1);
      const start = this.page * this.perPage, pages = Math.ceil(n / this.perPage) || 1;
      const nav = c.nav;
      if (nav === 'up') { this.focus = (this.focus - 1 + n) % n; UI.sfx('uiTick'); }
      if (nav === 'down') { this.focus = (this.focus + 1) % n; UI.sfx('uiTick'); }
      const it = list[this.focus];
      if (nav === 'left' || nav === 'right') {
        const s = nav === 'left' ? -1 : 1;
        if (it?.slider) { const st = it.slider; st.set(clamp(+(st.get() + s * st.step).toFixed(4), st.min, st.max)); UI.sfx('uiTick'); }
        else if (s < 0 && it?.onLeft) { it.onLeft(); UI.sfx('uiTick'); } else if (s > 0 && it?.onRight) { it.onRight(); UI.sfx('uiTick'); }
        else if (pages > 1) { this.page = (this.page + s + pages) % pages; this.focus = this.page * this.perPage; UI.sfx('uiTick'); }
      }
      this.page = Math.floor(this.focus / this.perPage);
      if (c.moved || c.clickL() || c.input.mouseButtons & 1) { const id = hitAt(c.mx, c.my); if (typeof id === 'number' && c.moved && id !== this.focus) { this.focus = id; } if (id === 'prevPage' || id === 'nextPage') { if (c.clickL()) { this.page = (this.page + (id === 'nextPage' ? 1 : -1) + pages) % pages; this.focus = this.page * this.perPage; } } else if (typeof id === 'number' && c.clickL()) { this.focus = id; const f = list[id]; if (f?.slider) { const st = f.slider; const r = this.barRect; if (r) { const t = clamp((c.mx - r.x) / r.w, 0, 1); st.set(+(st.min + Math.round((t * (st.max - st.min)) / st.step) * st.step).toFixed(4)); UI.sfx('uiTick'); } } else this.activate(f, c); } }
      if (c.confirm()) this.activate(it, c);
      if (it?.alt && c.pressed('alt')) { it.alt(); UI.sfx('uiOk'); }
      if (c.back() && o.onBack !== null) { UI.sfx('uiBack'); if (o.onBack) o.onBack(m); else UI.pop(m); }
    },
    draw(h, top) {
      const list = this.items(); this.page = Math.floor(this.focus / this.perPage); const pages = Math.ceil(list.length / this.perPage) || 1;
      const start = this.page * this.perPage, shown = list.slice(start, start + this.perPage);
      const rowH = 18; const w = this.w; const headH = (this.title ? 22 : 8) + (this.sub ? wrap(this.sub, w - 24).length * LINE_H + 2 : 0);
      const ht = headH + shown.length * rowH + (pages > 1 ? 14 : 2) + 18;
      const x = o.x ?? Math.round(240 - w / 2), y = o.y ?? Math.max(8, Math.round(130 - ht / 2));
      if (o.dim !== false) dim(h, 'ink');
      panel(h, x, y, w, ht);
      let cy = y + 7;
      if (this.title) { drawText(h, x + 12, cy, this.title, { color: 'ink', scale: 1, em: 'red' }); h.rect(x + 12, cy + 10, w - 24, 1, 'sand'); cy += 15; }
      if (this.sub) { const hh = para(h, x + 12, cy, this.sub, w - 24, { color: 'slate' }); cy += hh + 2; }
      shown.forEach((it, i) => {
        const idx = start + i, f = idx === this.focus && top;
        if (f) { h.rect(x + 6, cy - 2, w - 12, rowH - 1, 'navy'); }
        const col = it.disabled ? 'mist' : f ? 'white' : 'ink';
        drawText(h, x + 12, cy + 3, labelOf(it, true), { color: col, em: f ? 'sand' : 'red' });
        const val = it.value ? it.value() : null;
        if (it.slider) {
          const st = it.slider, bw = 90, bx = x + w - 12 - bw - 34; const t = (st.get() - st.min) / (st.max - st.min || 1);
          h.rect(bx, cy + 5, bw, 3, f ? 'slate' : 'mist'); h.rect(bx + Math.round(t * (bw - 3)), cy + 2, 3, 9, f ? 'sand' : 'red');
          drawText(h, x + w - 12, cy + 3, it.fmt ? it.fmt(st.get()) : String(+st.get().toFixed(2)), { color: col, align: 'right' });
          if (idx === this.focus) this.barRect = { x: bx, w: bw };
        } else if (val != null) drawText(h, x + w - 12, cy + 3, (it.onLeft ? '← ' : '') + val + (it.onRight ? ' →' : ''), { color: f ? 'sand' : 'slate', align: 'right' });
        hit(x + 6, cy - 2, w - 12, rowH - 1, idx);
        cy += rowH;
      });
      if (pages > 1) { drawText(h, x + w / 2, cy + 1, `← page ${this.page + 1} of ${pages} →`, { color: 'slate', align: 'center' }); hit(x + 6, cy, 50, 12, 'prevPage'); hit(x + w - 56, cy, 50, 12, 'nextPage'); cy += 14; }
      const it = list[this.focus];
      const pr = [['confirm', it?.confirmLabel ?? 'Choose']]; if (o.onBack !== null) pr.push(['back', o.backLabel ?? 'Back']); if (it?.alt) pr.push(['alt', it.altLabel]);
      this._prompts = pr; if (top) promptRow(h, x + w - 10, y + ht - 14, pr, { align: 'right', color: 'ink', shadow: false });
      o.afterDraw?.(h, this, top, x, y, w, ht);
    } };
  return m;
}
const labelOf = (it, raw) => (typeof it.label === 'function' ? it.label() : it.label);
/** Pixel cursor when the mouse is the last thing moved. */
export function drawCursor(h, c) { if (!c.mouseVisible || !UI.cursor) return; const x = Math.round(c.mx), y = Math.round(c.my); h.sprite(x, y, ['#.......', '##......', '#o#.....', '#oo#....', '#ooo#...', '#oooo#..', '#ooooo#.', '#oo###..', '#o#o#...', '##.#o#..', '.....#..'], { '#': 'ink', o: 'white' }, { shadow: false }); }
