// The pixel UI kit. Immediate mode over ctx.hud. Every screen for every input. Focus by stick or D-pad, hover moves focus, click activates.
import { BIND, PAD_BUTTONS } from './intent.js';
import { device } from './device.js';
export const FONT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,:;-+=/()[]{}%_!?<>#'‘’“”*@°·&|\\~^$ ";
const up = (s) => String(s).toUpperCase();
export class UI {
  constructor(app) { this.app = app; this.t = 0; this.rects = []; this.holdT = {}; this.px = 0; this.py = 0; this.lastP = null; this.hover = false; this.click = false; this.rclick = false; this.wheel = 0; this.nav = {}; this.mouseDown = false; }
  begin(ctx, clear = true) {
    this.ctx = ctx; this.hud = ctx.hud; this.input = ctx.input; const dt = 1 / 60; this.t += dt; this.dt = dt; this.W = ctx.hud.width || 480; this.H = ctx.hud.height || 270;
    if (clear) ctx.hud.clear();
    const p = this.input.pointer; this.px = (p.x + 1) / 2 * this.W; this.py = (1 - p.y) / 2 * this.H;
    this.hover = !!this.lastP && (p.x !== this.lastP[0] || p.y !== this.lastP[1]); this.lastP = [p.x, p.y];
    this.click = false; this.rclick = false; this.cx = this.px; this.cy = this.py;
    for (const e of this.input.buttonEvents) if (e.down && (e.code === 'MouseLeft' || e.code === 'Touch')) { this.click = true; this.cx = (e.x + 1) / 2 * this.W; this.cy = (1 - e.y) / 2 * this.H; this.hover = true; } else if (e.down && e.code === 'MouseRight') this.rclick = true;
    this.mouseDown = this.input.isDown('MouseLeft');
    this.wheel = this.input.wheel;
    // Pads are read here directly so menus get the left stick and edges in one place.
    const padNow = {}; let ax = 0, ay = 0; if (typeof navigator !== 'undefined' && navigator.getGamepads) for (const g of navigator.getGamepads() || []) { if (!g) continue; for (const k in PAD_BUTTONS) { const b = g.buttons[k]; if (b && (b.pressed || b.value > 0.5)) padNow[PAD_BUTTONS[k]] = true; } if (Math.abs(g.axes[0] ?? 0) > Math.abs(ax)) ax = g.axes[0]; if (Math.abs(g.axes[1] ?? 0) > Math.abs(ay)) ay = g.axes[1]; }
    const prev = this.padPrev ?? {}; this.padPrev = padNow; this.padPressed = (c) => padNow[c] && !prev[c]; this.padDown = (c) => !!padNow[c];
    const I = this.input, down = (a) => BIND[a].some((c) => (c.startsWith('Pad') ? padNow[c] : I.isDown(c))), pressed = (a) => BIND[a].some((c) => (c.startsWith('Pad') ? padNow[c] && !prev[c] : I.wasPressed(c)));
    const m = { x: ax, y: -ay };
    const dirs = { up: down('up') || m.y > 0.5, down: down('down') || m.y < -0.5, left: down('left') || m.x < -0.5, right: down('right') || m.x > 0.5 }; const tap = {}; for (const k in dirs) if (pressed(k)) { tap[k] = true; dirs[k] = true; }
    this.nav = {};
    for (const k in dirs) {
      if (dirs[k]) { const h = tap[k] ? -1 : this.holdT[k] ?? -1; if (h < 0) { this.nav[k] = true; this.holdT[k] = 0; } else { this.holdT[k] = h + dt; if (this.holdT[k] > 0.34) { this.nav[k] = true; this.holdT[k] = 0.22; } } } else this.holdT[k] = -1;
    }
    this.pressed = pressed;
    this.confirm = pressed('confirm'); this.back = pressed('back'); this.secondary = pressed('secondary'); this.tertiary = pressed('tertiary');
    this.tabPrev = pressed('tabPrev'); this.tabNext = pressed('tabNext');
  }
  sound(n) { this.ctx.audio.play(n); }
  text(x, y, s, o = {}) { this.hud.text(Math.round(x), Math.round(y), up(s), o); }
  center(y, s, o = {}, cx = this.W / 2) { const m = this.hud.measure(up(s), o.scale || 1); this.text(cx - m.width / 2, y, s, o); return m; }
  measure(s, scale = 1) { return this.hud.measure(up(s), scale); }
  rect(x, y, w, h, c) { this.hud.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); }
  panel(x, y, w, h, o = {}) { this.rect(x, y, w, h, o.bg ?? 'ink'); const b = o.border ?? 'slate'; this.rect(x, y, w, 1, b); this.rect(x, y + h - 1, w, 1, b); this.rect(x, y, 1, h, b); this.rect(x + w - 1, y, 1, h, b); }
  dim(c = 'ink') { const W = this.W, H = this.H; for (let y = 0; y < H; y += 2) this.rect(0, y, W, 1, c); }
  within(x, y, w, h, px = this.px, py = this.py) { return px >= x && py >= y && px < x + w && py < y + h; }
  /** A vertical list. state: {focus}. items: [{label, disabled, color, value}] Returns the activated index or -1. */
  list(state, items, o = {}) {
    const x = o.x ?? 40, y = o.y ?? 60, w = o.w ?? 180, rh = o.rowH ?? 16, sc = o.scale ?? 1; state.focus = Math.max(0, Math.min(items.length - 1, state.focus ?? 0));
    let out = -1; const max = o.max ?? items.length; state.scroll = state.scroll ?? 0;
    if (!o.noNav) {
      if (this.nav.up) { state.focus = (state.focus - 1 + items.length) % items.length; this.sound('uimove'); }
      if (this.nav.down) { state.focus = (state.focus + 1) % items.length; this.sound('uimove'); }
    }
    if (this.wheel && !o.noWheel) { state.focus = Math.max(0, Math.min(items.length - 1, state.focus + Math.sign(this.wheel))); }
    if (state.focus < state.scroll) state.scroll = state.focus; if (state.focus >= state.scroll + max) state.scroll = state.focus - max + 1;
    for (let vi = 0; vi < Math.min(max, items.length); vi++) {
      const i = vi + state.scroll, it = items[i], ry = y + vi * rh;
      if (this.hover && this.within(x, ry - 1, w, rh)) state.focus = i;
      const on = state.focus === i;
      if (on) { this.rect(x, ry - 2, w, rh - 1, o.bar ?? 'navy'); this.rect(x, ry - 2, 2, rh - 1, 'orange'); this.text(x + 4, ry + (rh - 4 - 7 * sc) / 2 - 1 , '>', { color: 'orange', scale: 1 }); }
      this.text(x + 12, ry + (rh - 4 - 7 * sc) / 2 - 1, it.label, { color: it.disabled ? 'slate' : on ? 'white' : (it.color ?? 'mist'), scale: sc });
      if (it.value != null) { const m = this.measure(it.value, 1); this.text(x + w - m.width - 5, ry + (rh - 4 - 7) / 2 - 1, it.value, { color: it.valueColor ?? (on ? 'sand' : 'slate') }); }
      if (this.click && this.within(x, ry - 1, w, rh, this.cx, this.cy)) { state.focus = i; if (!it.disabled) out = i; else this.sound('uideny'); }
    }
    if (items.length > max) { if (state.scroll > 0) this.text(x + w - 8, y - 11, '^', { color: 'sand' }); if (state.scroll + max < items.length) this.text(x + w - 8, y + max * rh - 2, 'V', { color: 'sand' }); }
    if (this.confirm && !o.noConfirm) { if (!items[state.focus]?.disabled) out = state.focus; else this.sound('uideny'); }
    if (out >= 0) this.sound('uiconfirm');
    return out;
  }
  /** Tabs across the top. Returns the current index. */
  tabs(state, labels, y = 8) {
    state.tab = state.tab ?? 0;
    if (this.tabPrev) { state.tab = (state.tab - 1 + labels.length) % labels.length; state.focus = 0; state.scroll = 0; this.sound('uimove'); }
    if (this.tabNext) { state.tab = (state.tab + 1) % labels.length; state.focus = 0; state.scroll = 0; this.sound('uimove'); }
    let total = 0; for (const l of labels) total += this.measure(l).width + 10;
    let x = Math.round(this.W / 2 - total / 2);
    this.glyph(device.last === 'pad' ? 'PadL1' : 'KeyQ', x - 18, y - 1); this.glyph(device.last === 'pad' ? 'PadR1' : 'KeyE', x + total + 3, y - 1);
    labels.forEach((l, i) => { const w = this.measure(l).width + 8, on = i === state.tab; if (on) this.rect(x, y - 2, w, 11, 'navy'); this.text(x + 4, y, l, { color: on ? 'white' : 'slate' }); if (this.click && this.within(x, y - 2, w, 11, this.cx, this.cy)) { state.tab = i; state.focus = 0; state.scroll = 0; this.sound('uimove'); } x += w + 2; });
    return state.tab;
  }
  slider(x, y, w, v, min, max, o = {}) {
    const k = Math.max(0, Math.min(1, (v - min) / (max - min)));
    this.rect(x, y + 2, w, 3, 'night'); this.rect(x, y + 2, Math.round(w * k), 3, o.color ?? 'sand');
    if (o.def != null) this.rect(x + Math.round(w * ((o.def - min) / (max - min))), y, 1, 7, 'slate');
    this.rect(x + Math.round(w * k) - 1, y, 3, 7, 'white');
    if (this.mouseDown && this.within(x - 2, y - 3, w + 4, 13)) return min + (max - min) * Math.max(0, Math.min(1, (this.px - x) / w));
    return v;
  }
  bar(x, y, w, h, k, c, bg = 'night') { this.rect(x, y, w, h, bg); this.rect(x, y, Math.round(w * Math.max(0, Math.min(1, k))), h, c); }
  wrap(s, width) { const out = []; let line = ''; for (const w of up(s).split(' ')) { const t = line ? line + ' ' + w : w; if (this.measure(t).width > width && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
  para(x, y, s, width, o = {}) { const lines = this.wrap(s, width); lines.forEach((l, i) => this.text(x, y + i * (o.lh ?? 10), l, o)); return lines.length; }
  /** Draws one input glyph at (x, y). Width returned. */
  glyph(code, x, y) { return drawGlyph(this, code, x, y); }
  /** Glyph for an action on the current device. */
  action(a, x, y) { return this.glyph(codeFor(a), x, y); }
  /** A prompt bar at the bottom. [[action, label], ...] */
  prompts(list, o = {}) {
    let total = 0; for (const [a, l] of list) total += glyphWidth(codeFor(a)) + 3 + this.measure(l).width + 10;
    let x = Math.round(this.W / 2 - total / 2); const y = o.y ?? this.H - 15;
    if (!o.noBar) this.rect(0, y - 3, this.W, 17, 'ink');
    for (const [a, l, id] of list) { const gw = this.action(a, x, y - 1); this.text(x + gw + 3, y + 1, l, { color: 'mist' }); const w = gw + 3 + this.measure(l).width; if (id && this.click && this.within(x, y - 3, w, 14, this.cx, this.cy)) this.clickedPrompt = id; x += w + 10; }
  }
}
// ---- Glyphs
const KEYNAME = { KeyQ: 'Q', KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyC: 'C', KeyV: 'V', KeyM: 'M', KeyI: 'I', KeyP: 'P', KeyW: 'W', Enter: 'ENTER', Space: 'SPACE', Escape: 'ESC', Tab: 'TAB', ShiftLeft: 'SHIFT', ArrowUp: '^', ArrowDown: 'V', ArrowLeft: '<', ArrowRight: '>' };
const PS = { PadCross: ['blue', 'x'], PadCircle: ['red', 'o'], PadSquare: ['plum', 's'], PadTriangle: ['green', 't'] };
const XB = { PadCross: ['green', 'A'], PadCircle: ['red', 'B'], PadSquare: ['blue', 'X'], PadTriangle: ['sand', 'Y'] };
const PILL_PS = { PadL1: 'L1', PadR1: 'R1', PadL2: 'L2', PadR2: 'R2', PadOptions: 'OPT', PadCreate: 'CRT', PadR3: 'R3', PadL3: 'L3', PadUp: 'D^', PadDown: 'DV', PadLeft: 'D<', PadRight: 'D>', PadStick: 'LS' };
const PILL_XB = { ...PILL_PS, PadL1: 'LB', PadR1: 'RB', PadL2: 'LT', PadR2: 'RT', PadOptions: 'MENU', PadCreate: 'VIEW' };
const DISC = ['...xxxxx...', '..xxxxxxx..', '.xxxxxxxxx.', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '..xxxxxxx..', '...xxxxx...'];
const SYM = { x: ['.......', '.w...w.', '..w.w..', '...w...', '..w.w..', '.w...w.', '.......'], o: ['..www..', '.w...w.', 'w.....w', 'w.....w', 'w.....w', '.w...w.', '..www..'], s: ['wwwwwww', 'w.....w', 'w.....w', 'w.....w', 'w.....w', 'w.....w', 'wwwwwww'], t: ['...w...', '..w.w..', '..w.w..', '.w...w.', '.w...w.', 'w.....w', 'wwwwwww'] };
export const glyphWidth = (code) => { if (code.startsWith('Mouse')) return 9; if (code in PS) return 11; if (code.startsWith('Pad')) return (({ ...PILL_PS, ...PILL_XB })[code]?.length || 2) * 6 + 3; return Math.max(11, (KEYNAME[code]?.length || 1) * 6 + 5); };
/** What a glyph shows: symbol or letter on the button, or the pill's or keycap's text. */
export function glyphLabel(code, xbox) { if (code in PS) return (xbox ? XB : PS)[code][1]; if (code.startsWith('Pad')) return (xbox ? PILL_XB : PILL_PS)[code] ?? '?'; if (code.startsWith('Mouse')) return code; return KEYNAME[code] ?? code.replace('Key', ''); }
export function drawGlyph(ui, code, x, y) {
  const xbox = ui.app.settings.glyphs === 'xbox';
  if (code in PS) {
    const [c, s] = (xbox ? XB : PS)[code];
    ui.hud.sprite(x, y, DISC, { x: c });
    if (xbox) ui.hud.text(x + 3, y + 2, s, { color: 'white', shadow: false });
    else ui.hud.sprite(x + 2, y + 2, SYM[s], { w: 'white' });
    return 11;
  }
  if (code.startsWith('Pad')) {
    const t = (xbox ? PILL_XB : PILL_PS)[code] || '?', w = t.length * 6 + 3;
    ui.rect(x, y + 1, w, 9, 'slate'); ui.hud.text(x + 2, y + 2, t, { color: 'white', shadow: false }); return w;
  }
  if (code.startsWith('Mouse')) {
    const L = code === 'MouseLeft', R = code === 'MouseRight', W = code === 'MouseWheel';
    ui.hud.sprite(x, y, ['..mmmmm..', '.lll#rrr.', '.lll#rrr.', '.lll#rrr.', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '.mmmmmmm.', '..mmmmm..', '.........'], { m: 'mist', l: L ? 'orange' : 'mist', r: R ? 'orange' : 'mist', '#': W ? 'orange' : 'slate' });
    return 9;
  }
  const t = KEYNAME[code] ?? code.replace('Key', '').replace('Digit', ''), w = Math.max(11, t.length * 6 + 5);
  ui.rect(x, y, w, 11, 'mist'); ui.rect(x + 1, y + 1, w - 2, 9, 'ink'); ui.hud.text(x + Math.round((w - t.length * 6 + 1) / 2), y + 2, t, { color: 'white', shadow: false });
  return w;
}
/** The code to show for an action on the current device. */
export function codeFor(a) {
  const list = BIND[a] || [a];
  const pad = device.last === 'pad';
  const hit = list.find((c) => (pad ? c.startsWith('Pad') : !c.startsWith('Pad')));
  return hit ?? (a.startsWith('Pad') || a.startsWith('Key') || a.startsWith('Mouse') ? a : list[0]);
}
