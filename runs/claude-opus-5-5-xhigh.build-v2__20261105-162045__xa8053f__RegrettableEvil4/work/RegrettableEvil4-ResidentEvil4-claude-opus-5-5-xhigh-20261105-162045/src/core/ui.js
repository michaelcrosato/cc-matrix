// The pixel UI kit: immediate-mode widgets on the engine HUD. Each widget registers a rectangle; focus
// moves by stick, D-pad or arrows with repeat, hover moves focus, a click activates. Same screens for
// every input. All coordinates are art pixels from the top left.
import { drawGlyph, glyphName, glyphWidth } from './glyphs.js';

const DIRS = {
  up: ['ArrowUp', 'KeyW', 'PadUp'],
  down: ['ArrowDown', 'KeyS', 'PadDown'],
  left: ['ArrowLeft', 'KeyA', 'PadLeft'],
  right: ['ArrowRight', 'KeyD', 'PadRight'],
};
const REPEAT_FIRST = 0.34;
const REPEAT_NEXT = 0.11;

export const clean = (s) => String(s).toUpperCase();

export function wrap(text, maxChars) {
  const out = [];
  for (const para of clean(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (line && line.length + word.length + 1 > maxChars) { out.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    out.push(line);
  }
  return out;
}

export class UI {
  constructor(device, settings) {
    this.device = device;
    this.settings = settings;
    this.focus = null;
    this.rects = [];
    this.held = { up: 0, down: 0, left: 0, right: 0 };
    this.rt = 0;
    this.last = 0;
    this.clicked = null;
    this.rightClicked = false;
    this.pointerMoved = false;
    this.lastPointer = [9, 9];
    this.nav = { up: false, down: false, left: false, right: false, confirm: false, back: false, tabPrev: false, tabNext: false, secondary: false, tertiary: false, wheel: 0, any: false };
    this.mx = 0; this.my = 0;
    this.drag = null;
    this.mouseDown = false;
    this.locked = false;
  }

  begin(ctx) {
    this.ctx = ctx;
    this.hud = ctx.hud;
    this.W = ctx.hud.width;
    this.H = ctx.hud.height;
    const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    this.dt = ctx.engine.manual ? 1 / 60 : Math.min(0.1, Math.max(0, now - this.last));
    this.last = now;
    this.rt += this.dt;
    const { input } = ctx;
    this.input = input;
    this.rects.length = 0;
    const n = this.nav;
    const stick = input.padAxis;
    const dirDown = {
      up: input.anyDown(DIRS.up) || stick.y > 0.5,
      down: input.anyDown(DIRS.down) || stick.y < -0.5,
      left: input.anyDown(DIRS.left) || stick.x < -0.5,
      right: input.anyDown(DIRS.right) || stick.x > 0.5,
    };
    for (const d of Object.keys(DIRS)) {
      const pressed = input.wasPressed(...DIRS[d]);
      if (dirDown[d] || pressed) {
        const first = this.held[d] === 0;
        const was = this.held[d];
        this.held[d] += Math.max(this.dt, 1e-4);
        n[d] = first || pressed || (was >= REPEAT_FIRST && Math.floor((this.held[d] - REPEAT_FIRST) / REPEAT_NEXT) !== Math.floor((was - REPEAT_FIRST) / REPEAT_NEXT));
      } else { this.held[d] = 0; n[d] = false; }
    }
    n.confirm = input.wasPressed('PadCross', 'Enter', 'NumpadEnter', 'Space');
    n.back = input.wasPressed('PadCircle', 'Escape');
    n.tabPrev = input.wasPressed('PadL1', 'KeyQ');
    n.tabNext = input.wasPressed('PadR1', 'KeyE');
    n.secondary = input.wasPressed('PadSquare');
    n.tertiary = input.wasPressed('PadTriangle', 'KeyX');
    n.wheel = input.wheel || 0;
    // Pointer in art pixels.
    const p = input.pointer;
    const mx = ((p.x + 1) / 2) * this.W;
    const my = ((1 - p.y) / 2) * this.H;
    this.pointerMoved = Math.abs(p.x - this.lastPointer[0]) > 1e-4 || Math.abs(p.y - this.lastPointer[1]) > 1e-4;
    this.lastPointer = [p.x, p.y];
    this.mx = mx; this.my = my;
    this.clicked = null;
    this.rightClicked = false;
    this.mouseDown = input.isDown('MouseLeft');
    for (const e of input.buttonEvents) {
      const px = ((e.x + 1) / 2) * this.W;
      const py = ((1 - e.y) / 2) * this.H;
      if (e.down && (e.code === 'MouseLeft' || e.code === 'Touch')) { this.clicked = [px, py]; this.mx = px; this.my = py; }
      if (e.down && e.code === 'MouseRight') this.rightClicked = true;
    }
    if (!this.mouseDown) this.drag = null;
  }

  /** The Blink phase used by prompts and cursors: real time, so it runs at timeScale 0. */
  blink(rate = 2) { return Math.floor(this.rt * rate) % 2 === 0; }

  /** Register a focusable rectangle. Returns true when it was activated this frame. */
  widget(id, x, y, w, h) {
    this.rects.push({ id, x, y, w, h });
    if (this.pointerMoved && this.inside(this.mx, this.my, x, y, w, h)) this.focus = id;
    let hit = false;
    if (this.clicked && this.inside(this.clicked[0], this.clicked[1], x, y, w, h)) { this.focus = id; hit = true; this.clicked = null; }
    if (this.focus === id && this.nav.confirm) hit = true;
    return hit;
  }

  inside(px, py, x, y, w, h) { return px >= x && py >= y && px < x + w && py < y + h; }

  end() {
    const { rects, nav } = this;
    if (!rects.length) return;
    if (!rects.some((r) => r.id === this.focus)) this.focus = rects[0].id;
    const cur = rects.find((r) => r.id === this.focus);
    const move = (dx, dy) => {
      const cx = cur.x + cur.w / 2; const cy = cur.y + cur.h / 2;
      let best = null; let score = Infinity;
      for (const r of rects) {
        if (r === cur) continue;
        const rx = r.x + r.w / 2; const ry = r.y + r.h / 2;
        const ax = rx - cx; const ay = ry - cy;
        const along = ax * dx + ay * dy;
        if (along <= 0) continue;
        const across = Math.abs(ax * dy) + Math.abs(ay * dx);
        const s = along + across * 3;
        if (s < score) { score = s; best = r; }
      }
      if (best) { this.focus = best.id; this.onMove?.(); return; }
      // Wrap vertically in a list.
      if (dy !== 0) {
        const col = rects.filter((r) => Math.abs((r.x + r.w / 2) - cx) < 40);
        if (col.length > 1) {
          const edge = dy > 0 ? col.reduce((a, b) => (b.y < a.y ? b : a)) : col.reduce((a, b) => (b.y > a.y ? b : a));
          if (edge !== cur) { this.focus = edge.id; this.onMove?.(); }
        }
      }
    };
    if (nav.up) move(0, -1);
    else if (nav.down) move(0, 1);
    else if (nav.left && !this.sliderFocused) move(-1, 0);
    else if (nav.right && !this.sliderFocused) move(1, 0);
    this.sliderFocused = false;
  }

  // ---- Drawing ----
  text(x, y, s, o = {}) { this.hud.text(x, y, clean(s), o); }
  width(s, scale = 1) { return this.hud.measure(clean(s), scale).width; }

  centerText(y, s, o = {}, x0 = 0, w = this.W) {
    const scale = o.scale ?? 1;
    this.hud.text(Math.round(x0 + (w - this.width(s, scale)) / 2), y, clean(s), o);
  }

  /** Greedy word wrap by measured width. */
  fitLines(s, maxW, scale = 1) {
    const out = [];
    let line = '';
    for (const word of clean(s).split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && this.width(next, scale) > maxW) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  /** Centred text that wraps to fit, however narrow the screen. Returns the y below it. */
  centerWrap(y, s, o = {}, x0 = 0, w = this.W) {
    const scale = o.scale ?? 1;
    let at = y;
    for (const l of this.fitLines(s, w - 8, scale)) { this.centerText(at, l, o, x0, w); at += 9 * scale; }
    return at;
  }

  /** The title of a screen, big, and its underline. Auto-sizes to fit. */
  heading(s, y = 12, x0 = 0, w = this.W, color = 'sand') {
    let scale = 3;
    while (scale > 1 && this.width(s, scale) > w - 16) scale--;
    this.centerText(y, s, { scale, color, shadow: 'ink' }, x0, w);
    return y + 8 * scale + 4;
  }

  panel(x, y, w, h, fill = 'ink', border = 'slate') {
    const { hud } = this;
    hud.rect(x, y, w, h, border);
    hud.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }

  dim(color = 'ink') {
    // A stipple keeps the world visible at the sides; a solid column down the middle keeps the menu readable
    // from the sofa, whatever bright thing was standing behind it.
    const { hud } = this;
    for (let y = 0; y < this.H; y += 2) hud.rect(0, y, this.W, 1, color);
    for (let x = 0; x < this.W; x += 2) hud.rect(x, 0, 1, this.H, color);
    const m = Math.round(this.W * 0.1);
    hud.rect(m, 0, this.W - m * 2, this.H, color);
  }

  /** A menu row at scale 2. Returns true when activated. */
  item(id, x, y, w, label, o = {}) {
    const h = o.h ?? 18;
    const hit = this.widget(id, x, y, w, h);
    const focused = this.focus === id;
    const disabled = !!o.disabled;
    if (focused) {
      this.hud.rect(x, y, w, h, o.focusFill ?? 'plum');
      this.hud.rect(x, y, 3, h, 'orange');
      this.hud.sprite(x + 5, y + (h - 7) / 2 | 0, ['o...', 'oo..', 'ooo.', 'oooo', 'ooo.', 'oo..', 'o...'], { o: 'orange' }, { shadow: false });
    }
    const scale = o.scale ?? 2;
    const tx = x + 13;
    // On a narrow screen the value drops under its label rather than over it.
    const rw = o.right !== undefined ? this.width(o.right, 1) : 0;
    const stacked = o.right !== undefined && tx + this.width(label, scale) + 4 > x + w - rw - 6;
    this.text(tx, stacked ? y + 1 : y + ((h - 7 * scale) >> 1), label, { scale, color: disabled ? 'slate' : focused ? 'white' : (o.color ?? 'mist') });
    if (o.right !== undefined) this.text(x + w - rw - 6, stacked ? y + 10 : y + ((h - 7) >> 1), o.right, { color: focused ? 'sand' : 'mist' });
    return hit && !disabled;
  }

  /** A labelled slider: left/right changes it, the mouse drags it. Returns the (maybe new) value. */
  slider(id, x, y, w, label, value, min, max, step, o = {}) {
    const h = o.h ?? 18;
    const click = this.clicked && this.inside(this.clicked[0], this.clicked[1], x, y, w, h) ? this.clicked : null;
    this.widget(id, x, y, w, h);
    const focused = this.focus === id;
    if (focused) {
      this.sliderFocused = true;
      this.hud.rect(x, y, w, h, 'plum');
      this.hud.rect(x, y, 3, h, 'orange');
    }
    // On a narrow screen the track goes under the label, full width.
    const valueW = o.valueW ?? 44;
    const stacked = (o.track ?? 100) + valueW + this.width(label) + 9 > w;
    const trackW = stacked ? w - 14 : (o.track ?? 100);
    const trackX = stacked ? x + 7 : x + w - trackW - valueW;
    const trackY = stacked ? y + 12 : y + (h >> 1) - 1;
    const textY = stacked ? y + 1 : y + ((h - 7) >> 1);
    this.text(x + 7, textY, label, { color: focused ? 'white' : 'mist' });
    this.hud.rect(trackX, trackY, trackW, 3, 'night');
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    this.hud.rect(trackX, trackY, Math.round(trackW * frac), 3, focused ? 'orange' : 'sand');
    this.hud.rect(trackX + Math.round((trackW - 3) * frac), trackY - 3, 3, 9, focused ? 'white' : 'mist');
    const shown = o.format ? o.format(value) : (Math.abs(max) <= 1 && o.percent !== false ? `${Math.round(value * 100)}%` : String(Math.round(value / step) * step).slice(0, 6));
    this.text(x + w - 6 - this.width(shown), textY, shown, { color: focused ? 'white' : 'mist' });
    let v = value;
    if (focused) {
      if (this.nav.left) v -= step;
      if (this.nav.right) v += step;
    }
    // A tap is down and up inside one frame, so it never reads as held: it sets the value where it lands.
    if (click && this.inside(click[0], click[1], trackX - 3, y, trackW + 6, h)) {
      v = min + Math.round((Math.max(0, Math.min(1, (click[0] - trackX) / trackW)) * (max - min)) / step) * step;
    }
    // Mouse: press on the track starts a drag.
    if (this.mouseDown && this.inside(this.mx, this.my, trackX - 3, y, trackW + 6, h) && !this.drag) this.drag = id;
    if (this.drag === id) {
      this.focus = id;
      v = min + (Math.max(0, Math.min(1, (this.mx - trackX) / trackW))) * (max - min);
      v = min + Math.round((v - min) / step) * step;
    }
    v = Math.max(min, Math.min(max, Math.round(v / step) * step));
    return Number(v.toFixed(5));
  }

  /** A row of tabs; L1/R1 or Q/E change them, a click picks one. Returns the active index. */
  tabs(id, y, labels, active, x0 = 0, w = this.W) {
    // Too narrow for a row of tabs: tighter ones; then just this one, with arrows either side.
    const rowOf = (p) => labels.reduce((n, l) => n + this.width(l) + p, 0) + 2 * (labels.length - 1);
    if (rowOf(4) > w) {
      const shown = `< ${labels[active]} >`;
      const tw = this.width(shown) + 12; const tx = x0 + ((w - tw) >> 1);
      this.hud.rect(tx, y, tw, 13, 'plum');
      this.hud.rect(tx, y + 12, tw, 1, 'orange');
      this.text(tx + 6, y + 3, shown, { color: 'white' });
      let next = active;
      if (this.clicked && this.inside(this.clicked[0], this.clicked[1], x0, y, w, 13)) {
        next = (active + (this.clicked[0] < x0 + (w >> 1) ? labels.length - 1 : 1)) % labels.length;
        this.clicked = null;
      }
      if (this.nav.tabPrev) next = (active + labels.length - 1) % labels.length;
      if (this.nav.tabNext) next = (active + 1) % labels.length;
      if (next !== active) this.onMove?.();
      return next;
    }
    const pad = rowOf(12) > w ? 4 : 12;
    let total = 0;
    const widths = labels.map((l) => this.width(l) + pad);
    for (const v of widths) total += v;
    const gap = Math.max(2, Math.min(10, Math.floor((w - total) / Math.max(1, labels.length + 1))));
    total += gap * (labels.length - 1);
    let x = x0 + Math.round((w - total) / 2);
    let next = active;
    labels.forEach((l, i) => {
      const on = i === active;
      if (on) this.hud.rect(x, y, widths[i], 13, 'plum');
      this.hud.rect(x, y + 12, widths[i], 1, on ? 'orange' : 'slate');
      this.text(x + (pad >> 1), y + 3, l, { color: on ? 'white' : 'mist' });
      if (this.clicked && this.inside(this.clicked[0], this.clicked[1], x, y, widths[i], 13)) { next = i; this.clicked = null; }
      x += widths[i] + gap;
    });
    if (this.nav.tabPrev) next = (active + labels.length - 1) % labels.length;
    if (this.nav.tabNext) next = (active + 1) % labels.length;
    if (next !== active) this.onMove?.();
    return next;
  }

  /** Draw one prompt, glyph then label, returning its width. */
  prompt(x, y, action, label, o = {}) {
    const name = glyphName(action, this.device, this.settings);
    const scale = o.scale ?? 1;
    const w = drawGlyph(this.hud, x, y, name, scale);
    const lw = this.width(label, scale);
    this.text(x + w + 3, y + 2 * scale, label, { scale, color: o.color ?? 'white' });
    return w + 3 + lw;
  }

  promptWidth(action, label, scale = 1) {
    return glyphWidth(this.hud, glyphName(action, this.device, this.settings), scale) + 3 + this.width(label, scale);
  }

  /** The prompt bar at the bottom of every screen. */
  promptBar(all) {
    // No keys or buttons on a touch-only device: nothing to prompt for.
    if (this.device?.touchOnly) return;
    const h = 15;
    this.hud.rect(0, this.H - h, this.W, h, 'ink');
    this.hud.rect(0, this.H - h, this.W, 1, 'slate');
    // The least important prompts come first in the list: on a very narrow screen they go first.
    let list = all;
    const need = (l) => l.reduce((n, [a, t]) => n + this.promptWidth(a, t) + 2, 0);
    while (list.length > 1 && need(list) > this.W - 8) list = list.slice(1);
    let total = 0;
    for (const [a, l] of list) total += this.promptWidth(a, l);
    // Narrow screens: tighten the gaps before anything falls off the edge.
    const gap = Math.max(2, Math.min(12, Math.floor((this.W - 8 - total) / Math.max(1, list.length))));
    total += gap * list.length;
    let x = Math.max(4, this.W - total - 4);
    for (const [a, l] of list) x += this.prompt(x, this.H - h + 3, a, l) + gap;
  }

  bar(x, y, w, h, frac, color = 'lime', back = 'night') {
    this.hud.rect(x, y, w, h, 'ink');
    this.hud.rect(x + 1, y + 1, w - 2, h - 2, back);
    this.hud.rect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, frac))), h - 2, color);
  }
}
