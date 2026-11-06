// UI manager: screen stack, immediate-mode widgets, prompts, dialogue, toasts. Everything draws on the engine HUD.
import { Controls, W, H } from './controls.js';
import { Draw, textWidth, wrapText, LINE } from './draw.js';
import { tuning } from '../data/tuning.js';

export const GLYPH = {
  confirm: { ps: 'cross', xb: 'A', kb: 'E' }, back: { ps: 'circle', xb: 'B', kb: 'Esc' }, tool: { ps: 'square', xb: 'X', kb: 'Space' },
  pockets: { ps: 'triangle', xb: 'Y', kb: 'Tab' }, tools: { ps: 'L1', xb: 'LB', kb: '1-6' }, cam: { ps: 'L2', xb: 'LT', kb: 'Q R' },
  map: { ps: 'Touch', xb: 'View', kb: 'M' }, almanac: { ps: 'D-pad', xb: 'D-pad', kb: 'J' }, run: { ps: 'circle', xb: 'B', kb: 'Shift' },
  pause: { ps: 'Options', xb: 'Menu', kb: 'Esc' }, move: { ps: 'L-stick', xb: 'L-stick', kb: 'WASD' }, nav: { ps: 'D-pad', xb: 'D-pad', kb: 'Arrows' },
  alt: { ps: 'triangle', xb: 'Y', kb: 'X' }, page: { ps: 'L1', xb: 'LB', kb: 'Q E' }, emote: { ps: 'D-pad', xb: 'D-pad', kb: 'G' }, laugh: { ps: 'triangle', xb: 'Y', kb: 'L' },
  next: { ps: 'R1', xb: 'RB', kb: 'E' }, prev: { ps: 'L1', xb: 'LB', kb: 'Q' }, rotate: { ps: 'L1', xb: 'LB', kb: 'R' },
};
export class UI {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.c = new Controls(ctx.input); this.d = new Draw(ctx.hud);
    this.stack = []; this.toasts = []; this.hudAlpha = 1; this.idle = 0; this.t = 0; this.prompts = []; this.hover = null; this.hits = [];
    this.pad = ctx.input; this.say_q = null; this.frameNo = 0; this.popFrame = -1;
  }
  /** Test handle: the current screen, its focus and the prompts showing. */
  model() { const t = this.top; return { screen: t?.id ?? null, depth: this.stack.length, focus: t?.st?.i ?? t?.sel ?? t?.c ?? null, prompts: this.prompts.map(p => p[0] + ':' + p[1]), device: this.c.device }; }
  get dev() { return this.c.device; }
  get glyphs() { return this.game.settings.glyphs; }
  get top() { return this.stack[this.stack.length - 1]; }
  get busy() { return this.stack.length > 0; }
  push(s) { s.ui = this; this.stack.push(s); s.open?.(this); this.c.input.clearQueued(); return s; }
  pop(s) { const i = s ? this.stack.indexOf(s) : this.stack.length - 1; if (i < 0) return; const [x] = this.stack.splice(i, 1); this.popFrame = this.frameNo; x.close?.(this); }
  get closedThisFrame() { return this.popFrame >= this.frameNo - 1 && this.popFrame !== -1 && this.popFrame >= this.frameNo - 1 && this.popFrame === this.frameNo; }
  clear() { while (this.stack.length) this.pop(); }
  has(id) { return this.stack.some(s => s.id === id); }
  toast(text, o = {}) { this.toasts.push({ text, t: 0, life: o.life ?? 2.6, color: o.color ?? 'white' }); if (this.toasts.length > 4) this.toasts.shift(); }
  /** Frame: poll input, draw layers, drive top screen. Game draws world HUD before calling this. */
  frame(dt, drawHud) {
    this.t += dt; this.frameNo++; this.c.poll(dt); this.d.begin(); this.hits.length = 0; this.prompts.length = 0;
    drawHud?.(this.d, this);
    for (let i = 0; i < this.stack.length; i++) { const s = this.stack[i]; s.tick(this, dt, i === this.stack.length - 1); if (i < this.stack.length - 1) this.prompts.length = 0; }
    this.drawToasts(dt); this.drawPrompts();
    if (this.c.device === 'kb' && this.c.ptr.over && this.showCursor !== false) this.drawCursor();
  }
  drawCursor() { const p = this.c.ptr; this.ctx.hud.sprite(Math.round(p.x), Math.round(p.y), ['##.......', '#w#......', '#ww#.....', '#www#....', '#wwww#...', '#wwwww#..', '#wwww####', '#ww#w#...', '#w#.#w#..', '##..#w#..', '.....##..'.slice(0, 9)], { '#': 'ink', w: 'white' }, { shadow: false }); }
  /** Register a hit rect (for hover/click); returns {hover, click}. */
  hit(id, x, y, w, h, active = true) {
    const p = this.c.ptr; const over = active && p.over && p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
    return { over, click: over && p.left };
  }
  prompt(action, label) { this.prompts.push([action, label]); }
  drawPrompts() {
    if (!this.prompts.length || this.noPrompts) return; const d = this.d;
    const items = this.prompts.slice(0, 3); let w = 0; const ws = items.map(([a, l]) => { const g = GLYPH[a]; const gw = this.glyphW(g); return gw + 3 + textWidth(l) + 10; });
    w = ws.reduce((a, b) => a + b, 0) - 10; let x = W - 12 - w; const y = H - 24;
    d.rect(x - 4, y - 3, w + 8, 16, 'night');
    items.forEach(([a, l], i) => { const gw = d.glyph(x, y, GLYPH[a], this.dev, this.glyphs); d.text(x + gw + 3, y + 1, l, 'white'); x += ws[i]; });
  }
  glyphW(g) { const d = this.dev, gl = this.glyphs; if (d === 'pad') { const s = gl === 'xbox' ? (g.xb ?? g.ps) : g.ps; return ['cross', 'circle', 'square', 'triangle', 'A', 'B', 'X', 'Y'].includes(s) ? 9 : textWidth(s) + 5; } return textWidth(g.kb) + 5; }
  drawToasts(dt) {
    let y = 40; for (const t of this.toasts) { t.t += dt; }
    this.toasts = this.toasts.filter(t => t.t < t.life);
    for (const t of this.toasts) { const w = textWidth(t.text) + 14; const a = Math.min(1, t.t / 0.2, (t.life - t.t) / 0.3); const x = W / 2 - w / 2; const yy = y - (1 - a) * 6; if (a > 0.3) { this.d.panel(x, yy, w, 18, { fill: 'night', trim: 'sand' }); this.d.text(x + 7, yy + 4, t.text, t.color); } y += 22; }
  }
  /** Menu widget. st: { i }. items: [{label, value, disabled, hint}]. Returns {pick, adj, back}. */
  menu(st, items, o = {}) {
    const d = this.d, x = o.x, y = o.y, w = o.w ?? 200, rh = o.rh ?? 16, active = o.active !== false;
    const out = { pick: -1, adj: 0, back: false };
    st.i = Math.max(0, Math.min(items.length - 1, st.i ?? 0));
    if (active) {
      const n = this.c.nav; if (n.y) { let k = st.i; for (let j = 0; j < items.length; j++) { k = (k + n.y + items.length) % items.length; if (!items[k].disabled || o.focusDisabled) break; } st.i = k; if (!o.silent) this.game.sfx?.('tick'); }
      if (n.x) out.adj = n.x;
      if (this.c.pressed('confirm')) out.pick = st.i;
      if (this.c.backPressed()) out.back = true;
    }
    const top = o.scroll ? Math.max(0, Math.min(st.i - Math.floor((o.rows ?? 8) / 2), items.length - (o.rows ?? 8))) : 0; const rows = o.scroll ? Math.min(items.length, o.rows ?? 8) : items.length;
    for (let r = 0; r < rows; r++) {
      const idx = top + r, it = items[idx]; const yy = y + r * rh;
      const hv = this.hit('m' + idx, x, yy, w, rh, active);
      if (hv.over && this.c.ptr.moved && !it.disabled) st.i = idx;
      if (hv.click && !it.disabled) { st.i = idx; out.pick = idx; }
      const sel = idx === st.i && active;
      if (sel) { d.rect(x, yy, w, rh - 1, o.selFill ?? 'sky'); d.rect(x, yy, 2, rh - 1, 'red'); }
      const col = it.disabled ? 'slate' : (o.color ?? 'ink');
      d.text(x + 6, yy + 3, it.label, sel ? 'ink' : col);
      if (it.value != null) d.text(x + w - 6, yy + 3, String(it.value), sel ? 'ink' : (o.valueColor ?? 'navy'), { align: 'right' });
    }
    return out;
  }
}
/** The dialogue screen. */
export class Dialogue {
  constructor(speaker, text, o = {}) { this.id = 'dialogue'; this.speaker = speaker; this.full = text; this.o = o; this.shown = 0; this.choiceSt = { i: 0 }; this.done = false; this.beat = 0; this.pending = null; this.page = 0; }
  open(ui) { if (/HONK/.test(this.full)) ui.game.after(0.6, () => ui.game.sfx('honk')); if (this.speaker?.fast) this.o.speed ??= 80; if (this.speaker?.slow) this.o.speed ??= 14; this.lines = null; this.t = 0; this.promise = new Promise(r => { this.resolve = r; }); this.setText(this.full); }
  setText(text) { this.full = text; this.shown = 0; this.beat = 0; this.lastVoiced = 0; this.page = 0; this.pages = null; }
  tick(ui, dt, active) {
    const d = ui.d, g = ui.game; const w = 440, h = 66, x = (W - w) / 2, y = H - h - 14;
    if (!this.pages) { const clean = this.full.replace(/\|/g, ' ').replace(/\*/g, ''); const ln = wrapText(clean, w - 28); this.pages = []; for (let i = 0; i < ln.length; i += 3) this.pages.push(ln.slice(i, i + 3).join('\n')); this.chars = 0; }
    const page = this.pages[this.page] ?? ''; const sp = (this.o.speed ?? tuning.textSpeed);
    if (this.shown < page.length) { this.beat -= dt; if (this.beat <= 0) { const prev = Math.floor(this.shown); this.shown = Math.min(page.length, this.shown + dt * sp); const cur = Math.floor(this.shown); for (let i = prev; i < cur; i++) g.voiceChar?.(page[i], this.speaker, i); } }
    d.panel(x, y, w, h, { fill: 'white', trim: this.o.trim ?? 'sand' });
    if (this.speaker?.name) { const nw = textWidth(this.speaker.name) + 16; d.panel(x + 10, y - 12, nw, 17, { fill: 'red', trim: 'ink' }); d.text(x + 18, y - 8, this.speaker.name, 'white'); }
    const shownTxt = page.slice(0, Math.floor(this.shown)); const lines = shownTxt.split('\n');
    lines.forEach((l, i) => d.text(x + 14, y + 11 + i * LINE, l, 'ink'));
    const complete = this.shown >= page.length; const last = this.page >= this.pages.length - 1;
    const choices = this.o.choices;
    if (complete && last && choices) {
      const n = choices.length; const cw = Math.max(...choices.map(c => textWidth(c))) + 28; const ch = n * 16 + 8; const cx = x + w - cw - 6, cy = y - ch - 6;
      d.panel(cx, cy, cw, ch, { fill: 'white', trim: 'sand' });
      const r = ui.menu(this.choiceSt, choices.map(c => ({ label: c })), { x: cx + 5, y: cy + 5, w: cw - 10, active });
      if (r.pick >= 0) { ui.pop(this); this.resolve(r.pick); }
      ui.prompt('confirm', 'Choose');
    } else {
      if (complete && Math.floor(ui.t * 2) % 2 === 0) d.text(x + w - 20, y + h - 14, '↓', 'red');
      if (active) {
        const adv = ui.c.pressed('confirm') || ui.c.ptr.left || ui.c.pressed('tool') || this.autoAdvance;
        if (adv) { if (!complete) this.shown = page.length; else if (!last) { this.page++; this.shown = 0; } else { ui.pop(this); this.resolve(0); } }
        ui.prompt('confirm', complete ? 'Next' : 'Skip');
      }
    }
    if (this.o.auto && complete) { this.autoT = (this.autoT ?? 0) + dt; if (this.autoT > this.o.auto) { if (!last) { this.page++; this.shown = 0; this.autoT = 0; } else { ui.pop(this); this.resolve(0); } } }
  }
}
