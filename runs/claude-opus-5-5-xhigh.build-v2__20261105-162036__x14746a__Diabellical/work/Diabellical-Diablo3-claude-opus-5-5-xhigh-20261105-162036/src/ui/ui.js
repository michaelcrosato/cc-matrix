// A small immediate-mode layer on the engine's pixel HUD. Same screens for pad and mouse:
// direction moves focus to the nearest rectangle that way, hover moves it when the pointer moves.
import { drawGlyph } from './glyphs.js';

const CHAR = 6, LINE = 10;
export const FONT_OK = /^[0-9A-Z'"`‘’“”.,:;\-+=/()[\]{}%_!?<>#*@°·&|~^$ ]*$/;

export class UI {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.hud = ctx.hud;
    this.focus = null;
    this.widgets = [];
    this.drawnText = [];
    this.frame = 0;
    this.lastWidgets = [];
    this.scope = 0;
  }

  get w() { return this.hud.width; }
  get h() { return this.hud.height; }

  begin() {
    this.frame++;
    this.hud.clear();
    this.widgets = [];
    this.drawnText = [];
    this.tip = null;
  }

  /** Text, recorded so tests can read the screen. x, y are absolute art pixels from the top left. */
  text(x, y, str, o = {}) {
    const s = String(str);
    const scale = o.scale ?? 1;
    const w = this.measure(s, scale);
    let px = x;
    if (o.align === 'center') px = x - Math.floor(w / 2);
    if (o.align === 'right') px = x - w;
    px = Math.floor(px); const py = Math.floor(y);
    this.hud.text(px, py, s, { color: o.color ?? 'white', scale, shadow: o.shadow ?? 'ink' });
    if (!o.glyph) this.drawnText.push({ text: s.toUpperCase(), x: px, y: py, w, h: 7 * scale, scale, screen: this.screenTag ?? '' });
    return w;
  }

  measure(s, scale = 1) { return Math.max(0, String(s).length * CHAR * scale - scale); }

  wrap(s, maxW, scale = 1) {
    const maxChars = Math.max(4, Math.floor((maxW + scale) / (CHAR * scale)));
    const out = [];
    for (const para of String(s).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        let wd = word;
        while (wd.length > maxChars) { if (line) { out.push(line); line = ''; } out.push(wd.slice(0, maxChars)); wd = wd.slice(maxChars); }
        if (!line) line = wd;
        else if (line.length + 1 + wd.length <= maxChars) line += ` ${wd}`;
        else { out.push(line); line = wd; }
      }
      if (line) out.push(line);
      if (!para.trim()) out.push('');
    }
    return out;
  }

  textBlock(x, y, s, maxW, o = {}) {
    const lines = this.wrap(s, maxW, o.scale ?? 1);
    const lh = o.lineH ?? LINE * (o.scale ?? 1);
    lines.forEach((l, i) => this.text(x, y + i * lh, l, o));
    return lines.length * lh;
  }

  rect(x, y, w, h, c) { this.hud.rect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h), c); }

  panel(x, y, w, h, o = {}) {
    this.rect(x, y, w, h, o.border ?? 'slate');
    this.rect(x + 1, y + 1, w - 2, h - 2, o.fill ?? 'ink');
  }

  sprite(x, y, rows, colors, o = {}) { this.hud.sprite(Math.floor(x), Math.floor(y), rows, colors, { shadow: false, ...o }); }

  glyph(action, x, y) { return drawGlyph(this, action, Math.floor(x), Math.floor(y)); }

  /** A prompt: glyph then label. Returns the width. */
  prompt(action, label, x, y, o = {}) {
    const gw = this.glyph(action, x, y - 2);
    const tw = this.text(x + gw + 1, y, label, { color: o.color ?? 'white' });
    return gw + tw + 8;
  }

  /** Footer of prompts along the bottom of a screen. */
  footer(list) {
    let x = 14;
    const y = this.h - 14;
    for (const [action, label] of list) x += this.prompt(action, label, x, y);
  }

  // ---- Focusable widgets ------------------------------------------------------------------
  /** Register a focusable rectangle. Returns { focused, activated, hovered }. */
  widget(id, x, y, w, h, o = {}) {
    const rec = { id, x, y, w, h, disabled: !!o.disabled };
    this.widgets.push(rec);
    const input = this.game.input.menu;
    const focused = this.focus === id;
    let activated = false, alt = false;
    if (input.pointerMoved && inRect(input.px, input.py, x, y, w, h)) { if (this.focus !== id) this.game.audioSys?.sfx('ui_move'); this.focus = id; }
    const hovered = inRect(input.px, input.py, x, y, w, h);
    if (input.click && inRect(input.clickX, input.clickY, x, y, w, h)) { activated = true; this.focus = id; this.clickUsed = true; }
    if (input.rightClick && inRect(input.clickX, input.clickY, x, y, w, h)) { alt = true; this.focus = id; }
    if (focused && input.confirm) activated = true;
    if (activated && o.disabled) { activated = false; this.game.audioSys?.sfx('ui_error'); }
    return { focused: this.focus === id, activated, hovered, alt };
  }

  button(id, x, y, w, h, label, o = {}) {
    const r = this.widget(id, x, y, w, h, o);
    const f = r.focused;
    this.rect(x, y, w, h, f ? (o.focusColor ?? 'sand') : 'slate');
    this.rect(x + 1, y + 1, w - 2, h - 2, f ? 'plum' : o.fill ?? 'ink');
    const c = o.disabled ? 'slate' : f ? 'white' : o.color ?? 'mist';
    const sc = o.scale ?? 1;
    const tx = o.left ? x + 5 : x + Math.floor(w / 2);
    const ty = y + Math.floor((h - 7 * sc) / 2);
    this.text(tx, ty, label, { color: c, scale: sc, align: o.left ? 'left' : 'center' });
    if (r.activated) this.game.audioSys?.sfx('ui_confirm');
    return r.activated;
  }

  /** Called after the screen has drawn: move focus for the next frame. */
  end() {
    const input = this.game.input.menu;
    const list = this.widgets.filter((w) => !w.skip);
    this.lastWidgets = list;
    if (!list.length) { this.focus = null; return; }
    if (this.preferFocus && list.some((w) => w.id === this.preferFocus)) {
      this.focus = this.preferFocus;
      this.preferFocus = null;
    } else if (!list.some((w) => w.id === this.focus)) {
      this.focus = (list.find((w) => !w.disabled) ?? list[0]).id;
    }
    const dir = input.up ? [0, -1] : input.down ? [0, 1] : input.left ? [-1, 0] : input.right ? [1, 0] : null;
    if (!dir) return;
    const cur = list.find((w) => w.id === this.focus);
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best = null, bs = Infinity;
    for (const w of list) {
      if (w === cur) continue;
      const wx = w.x + w.w / 2, wy = w.y + w.h / 2;
      const dx = wx - cx, dy = wy - cy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 1) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      // Widgets squarely in line win over nearer ones off to the side.
      const inLine = dir[0] ? w.y < cur.y + cur.h && w.y + w.h > cur.y : w.x < cur.x + cur.w && w.x + w.w > cur.x;
      const score = along + across * 2.2 + (inLine ? 0 : 400);
      if (score < bs) { bs = score; best = w; }
    }
    if (best) { this.focus = best.id; this.game.audioSys?.sfx('ui_move'); }
  }
}

const inRect = (px, py, x, y, w, h) => px >= x && px < x + w && py >= y && py < y + h;
