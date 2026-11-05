/* OutBloom — the 10-foot UI kit, on the canvas. Designed at 480 x 270 (4x at 1080p): body text never under the 5x7
 * font at scale 1, menu items at scale 2, at most seven focusable items a screen, one thick pulsing focus frame, spatial
 * navigation (d-pad, stick, arrows, WASD), the mouse hovering to focus and clicking to pick, and a footer of prompts
 * whose glyphs follow the device used last: PlayStation by default (Settings: Xbox), keycaps for the keyboard, mouse
 * buttons for the mouse. It also tracks idle time for the attract mode. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, { px, clamp } = E;
const UI = OB.UI = { idleT: 0, lastPointer: null, readability: [], screenName: null, _held: new Set() };
const game = OB.game;
const C = UI.COL = { ink: '#fff6e8', dim: '#c8b8d8', sun: '#ffcf4a', pink: '#ff5fa2', sea: '#3ac8e0', panel: ['#2a1450', '#5a2a6a'], border: '#ffd6a0', dark: '#140a24', shadow: '#1a0a28', good: '#5ae07a', bad: '#ff5a5a' };
/** text with the house shadow; scale never under 1 */
const SUB = { '·': '-', '…': '...', '—': '-', '–': '-', '◀': '←', '▶': '→', '✿': '★', '✕': 'X', '○': 'O', '□': '#', '△': '^', '’': "'", '‘': "'", '“': '"', '”': '"', 'é': 'e', 'è': 'e', 'à': 'a' };
OB.safeText = s => String(s).replace(/[·…—–◀▶✿✕○□△’‘“”éèà]/g, c => SUB[c]);
UI.text = (g, s, x, y, o = {}) => { const sc = Math.max(1, o.scale || 1); s = OB.safeText(s); E.font.text(g, String(s), Math.round(x), Math.round(y), o.color || C.ink, { align: o.align || 'left', scale: sc, outline: o.outline || false, shadow: o.shadow === false ? undefined : (o.shadow || C.shadow), gradient: o.gradient, wrap: o.wrap }); return E.font.width(String(s), { scale: sc }); };
UI.width = (s, sc = 1) => E.font.width(String(s), { scale: sc });
UI.panel = (g, x, y, w, h, o = {}) => { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || C.panel, border: o.border || C.border, alpha: o.alpha }); };

/* ---- glyphs ---- */
const PS = { 0: 'cross', 1: 'circle', 2: 'square', 3: 'triangle' };
const XB = { 0: ['A', '#3ab05a'], 1: ['B', '#e0404a'], 2: ['X', '#3a7ae8'], 3: ['Y', '#e8c030'] };
const PILL = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['CREATE', 'VIEW'], 9: ['OPTIONS', 'MENU'], 10: ['L3', 'LS'], 11: ['R3', 'RS'] };
UI.glyphStyle = () => (game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation');
UI.device = () => { const d = game.input.lastDevice; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'keys'; };
/** the code to show for an action on a device: the first matching code in the player's map */
UI.codeFor = (action, dev = UI.device(), I = game.input) => {
  const m = I.map[action] || []; if (!m.length) return null;
  if (dev === 'pad') return m.find(c => /^Pad\d+$/.test(c)) || null;
  if (dev === 'mouse') return m.find(c => /^Mouse/.test(c)) || m.find(c => !/^Pad|^Act:|^Mouse/.test(c)) || null;
  return m.find(c => !/^Pad|^Act:|^Mouse/.test(c)) || m.find(c => /^Mouse/.test(c)) || null;
};
/** draw one glyph for a code at (x, y) (top-left), scale; returns its width */
UI.glyph = (g, code, x, y, sc = 1) => {
  if (!code) return 0;
  x = Math.round(x); y = Math.round(y);
  const pm = /^Pad(\d+)$/.exec(code);
  if (pm) {
    const n = +pm[1], xb = UI.glyphStyle() === 'xbox';
    if (n <= 3) {
      if (xb) { const [l, c] = XB[n]; px.disc(g, x + 5 * sc, y + 5 * sc, 5 * sc, '#14182a'); px.disc(g, x + 5 * sc, y + 5 * sc, 4 * sc, c); E.font.text(g, l, x + 5 * sc, y + 2 * sc - (sc > 1 ? 1 : 0), '#ffffff', { align: 'center', scale: sc > 1 ? sc - 1 || 1 : 1, outline: false }); return 11 * sc; }
      OB.Art.icon(g, PS[n], x, y, sc); return 11 * sc;
    }
    if (PILL[n]) { const l = PILL[n][xb ? 1 : 0], w = UI.width(l, 1) + 6; px.rect(g, x, y + sc, w * sc, 8 * sc, '#14182a'); px.rect(g, x + sc, y + 2 * sc, (w - 2) * sc, 6 * sc, n === 6 || n === 7 ? '#6a6a7a' : '#3a3a4a'); E.font.text(g, l, x + w * sc / 2, y + 2 * sc, '#ffffff', { align: 'center', scale: 1, outline: false }); return (w + 1) * sc; }
    if (n >= 12 && n <= 15) { const cx = x + 5 * sc, cy = y + 5 * sc; px.rect(g, cx - 4 * sc, cy - 1 * sc, 9 * sc, 3 * sc, '#3a3a4a'); px.rect(g, cx - 1 * sc, cy - 4 * sc, 3 * sc, 9 * sc, '#3a3a4a'); const d = [[0, -3], [0, 3], [-3, 0], [3, 0]][n - 12]; px.rect(g, cx + d[0] * sc - sc, cy + d[1] * sc - sc, 3 * sc, 3 * sc, '#ffd23a'); return 11 * sc; }
    E.font.text(g, 'B' + n, x, y + 2, '#ffffff', { scale: sc }); return 14 * sc;
  }
  if (/^Mouse/.test(code)) { const b = +code.slice(5) || 0; px.rect(g, x + sc, y, 8 * sc, 10 * sc, '#e8e8f0'); px.rect(g, x + 2 * sc, y + sc, 6 * sc, 8 * sc, '#ffffff'); px.rect(g, x + (b === 2 ? 5 : 2) * sc, y + sc, 3 * sc, 4 * sc, '#ff5fa2'); px.rect(g, x + 5 * sc - 1, y + sc, 1, 4 * sc, '#8a8a9a'); return 11 * sc; }
  // a keycap with the key's label
  const lab = game.input.codeLabel ? game.input.codeLabel(code) : code.replace(/^Key|^Digit/, ''), w = Math.max(9, UI.width(lab, 1) + 5);
  px.rect(g, x, y, w * sc, 10 * sc, '#14182a'); px.rect(g, x + sc, y, (w - 2) * sc, 9 * sc, '#e8e4f0'); px.rect(g, x + sc, y + 8 * sc, (w - 2) * sc, sc, '#a8a0b8');
  E.font.text(g, lab, x + w * sc / 2, y + sc + (sc > 1 ? sc : 0), '#2a2040', { align: 'center', scale: sc > 1 ? sc : 1, outline: false });
  return (w + 1) * sc;
};
/** a prompt: the action's glyph on the device used last, then its label; returns its width (align: left, center, right) */
UI.prompt = (g, x, y, action, label, o = {}) => {
  const sc = o.scale || 1, dev = o.device || UI.device(), I = o.input || game.input;
  if (action === 'nav' || action === 'navv') { const two = action === 'nav' ? ['left', 'right'] : ['up', 'down']; let xx = o.align === 'center' ? x - 30 : o.align === 'right' ? x - (24 * sc + (label ? 4 + UI.width(label, sc) : 0)) : x, w0 = 0;
    if (dev === 'pad') { w0 = UI.glyph(g, two[0] === 'left' ? 'Pad14' : 'Pad12', xx, y, sc); w0 += UI.glyph(g, two[0] === 'left' ? 'Pad15' : 'Pad13', xx + w0, y, sc); }
    else { w0 = UI.glyph(g, two[0] === 'left' ? 'ArrowLeft' : 'ArrowUp', xx, y, sc); w0 += UI.glyph(g, two[0] === 'left' ? 'ArrowRight' : 'ArrowDown', xx + w0, y, sc); }
    if (label) UI.text(g, label, xx + w0 + 4, y + (sc > 1 ? 2 : 1) * sc, { scale: sc, color: o.color || C.ink }); return w0 + (label ? 4 + UI.width(label, sc) : 0); }
  let code = UI.codeFor(action, dev, I);
  if (action === 'steer') code = dev === 'pad' ? 'STICK' : null;
  const lw = label ? UI.width(label, sc) : 0;
  const gw = code === 'STICK' ? 12 * sc : action === 'steer' ? UI.width('A D', 1) * sc + 12 : code ? (/^Pad[0-3]$/.test(code) || /^Pad1[2-5]$/.test(code) || /^Mouse/.test(code) ? 11 * sc : /^Pad/.test(code) ? (UI.width(PILL[+code.slice(3)] ? PILL[+code.slice(3)][0] : 'B', 1) + 7) * sc : (Math.max(9, UI.width(game.input.codeLabel ? game.input.codeLabel(code) : code, 1) + 5) + 1) * sc) : 0;
  const total = gw + (label ? 4 + lw : 0);
  let xx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  if (code === 'STICK') { px.disc(g, Math.round(xx + 6 * sc), Math.round(y + 5 * sc), 5 * sc, '#14182a'); px.disc(g, Math.round(xx + 6 * sc), Math.round(y + 5 * sc), 4 * sc, '#5a5a6a'); px.disc(g, Math.round(xx + 6 * sc), Math.round(y + 4 * sc), 2 * sc, '#8a8a9a'); }
  else if (action === 'steer') { const w1 = UI.glyph(g, I.map.left.find(c => /^Key/.test(c)) || 'KeyA', xx, y, sc); UI.glyph(g, I.map.right.find(c => /^Key/.test(c)) || 'KeyD', xx + w1 + 1, y, sc); }
  else UI.glyph(g, code, xx, y, sc);
  if (label) UI.text(g, label, xx + gw + 4, y + (sc > 1 ? 2 : 1) * sc, { scale: sc, color: o.color || C.ink });
  return total;
};
/** a row of prompts, right to left from x (a footer) */
UI.footer = (g, W, H, list, o = {}) => {
  let x = W - 10; const y = H - (o.y || 16);
  for (let i = list.length - 1; i >= 0; i--) { const [a, l] = list[i]; const w = UI.prompt(g, x, y, a, l, { align: 'right' }); x -= w + 14; }
};

/* ---- screens: focusable items, spatial navigation, mouse hover and click ---- */
class Screen {
  constructor(spec) { Object.assign(this, { items: [], focus: 0, pop: 0, t: 0, footer: [['confirm', 'Select'], ['cancel', 'Back']], name: 'screen', dev: false }, spec); this.lastPointer = null; this.hover = -1; }
  get current() { return this.items[this.focus]; }
  setItems(items, keepFocus) { const id = this.current && this.current.id; this.items = items; if (keepFocus && id) { const i = items.findIndex(it => it.id === id); if (i >= 0) this.focus = i; } if (this.focus >= items.length) this.focus = Math.max(0, items.length - 1); this.check(); }
  check() { const n = this.items.filter(i => !i.static).length; if (n > 7 && !this.dev) UI.readability.push(this.name + ': ' + n + ' items'); }
  move(dx, dy) {
    const cur = this.current; if (!cur) return;
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = -1, bc = 1e9;
    this.items.forEach((it, i) => {
      if (i === this.focus || it.static || it.disabled === 'hide') return;
      const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cx, ddy = iy - cy, along = ddx * dx + ddy * dy; if (along <= 2) return;
      const perp = Math.abs(ddx * dy) + Math.abs(ddy * dx), cost = along + perp * 2.2; if (cost < bc) { bc = cost; best = i; }
    });
    if (best < 0 && this.wrap) { const order = this.items.map((it, i) => i).filter(i => !this.items[i].static); const k = order.indexOf(this.focus); best = order[(k + (dx + dy > 0 ? 1 : order.length - 1)) % order.length]; }
    if (best >= 0) { this.focus = best; this.pop = 1; OB.sfx && OB.sfx('focus'); if (this.onFocus) this.onFocus(this.current); }
  }
  /** a step: returns true when an item was picked or the screen went back */
  update(dt, I = game.input) {
    this.t += dt; this.pop = Math.max(0, this.pop - dt * 5);
    const cur = this.current;
    if (I.repeat('up', .32, .12)) { if (cur && cur.up) cur.up(); else this.move(0, -1); }
    if (I.repeat('down', .32, .12)) { if (cur && cur.down) cur.down(); else this.move(0, 1); }
    if (I.repeat('left', .32, .12)) { if (cur && cur.left) { cur.left(); OB.sfx && OB.sfx('tick'); } else this.move(-1, 0); }
    if (I.repeat('right', .32, .12)) { if (cur && cur.right) { cur.right(); OB.sfx && OB.sfx('tick'); } else this.move(1, 0); }
    if (this.onTab) { if (I.pressed('tabL')) this.onTab(-1); if (I.pressed('tabR')) this.onTab(1); }
    // the mouse: hover moves the focus, a click picks (a click off every item does nothing)
    const p = I.pointer && I.pointer();
    if (p && (!this.lastPointer || Math.abs(p[0] - this.lastPointer[0]) + Math.abs(p[1] - this.lastPointer[1]) > 1)) {
      const i = this.hit(p); if (i >= 0 && i !== this.focus) { this.focus = i; this.pop = 1; OB.sfx && OB.sfx('focus'); if (this.onFocus) this.onFocus(this.current); }
      this.lastPointer = p;
    }
    const c = I.clicked && I.clicked();
    if (c) { const i = this.hit(c); if (i >= 0) { this.focus = i; if (this.items[i].clickX && this.items[i].clickX(c[0])) return true; return this.pick(); } }
    if (I.pressed('confirm') || (this.startPicks !== false && I.pressed('start'))) return this.pick();
    if (I.pressed('cancel') && this.back) { OB.sfx && OB.sfx('back'); this.back(); return true; }
    if (this.extra) return this.extra(I) || false;
    return false;
  }
  hit(p) { for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; if (it.static || it.disabled === 'hide') continue; if (p[0] >= it.x && p[0] < it.x + it.w && p[1] >= it.y && p[1] < it.y + it.h) return i; } return -1; }
  pick() { const it = this.current; if (!it) return false; if (it.disabled) { OB.sfx && OB.sfx('error'); if (it.onDenied) it.onDenied(); return true; } OB.sfx && OB.sfx(it.sound || 'confirm'); if (it.pick) it.pick(it); return true; }
  /** draw: each item's own draw, or a default button; the focus frame pulses sun-yellow with a pop */
  draw(g) {
    this.items.forEach((it, i) => { if (it.disabled === 'hide') return; const f = i === this.focus && !it.static; if (it.draw) it.draw(g, it, f, this); else UI.button(g, it, f, this); });
    const it = this.current;
    if (it && !it.static && !it.noFrame) { const k = Math.round(this.pop * 3), pulse = Math.floor(this.t * 3) % 2 ? C.sun : '#fff0a0'; UI.frame(g, it.x - 2 - k, it.y - 2 - k, it.w + 4 + k * 2, it.h + 4 + k * 2, pulse); }
  }
}
UI.Screen = Screen;
UI.screen = spec => new Screen(spec);
UI.frame = (g, x, y, w, h, c) => { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); px.rect(g, x, y, w, 2, c); px.rect(g, x, y + h - 2, w, 2, c); px.rect(g, x, y, 2, h, c); px.rect(g, x + w - 2, y, 2, h, c); };
UI.button = (g, it, f) => {
  UI.panel(g, it.x, it.y, it.w, it.h, { bg: f ? ['#5a2a7a', '#8a3a8a'] : C.panel, border: f ? C.sun : C.border });
  const sc = it.scale || 2, label = typeof it.label === 'function' ? it.label() : it.label;
  UI.text(g, label, it.x + it.w / 2, it.y + it.h / 2 - 3.5 * sc, { align: 'center', scale: sc, color: it.disabled ? '#8a7a9a' : f ? C.sun : C.ink });
  if (it.disabled && it.lock !== false) OB.Art.icon(g, 'lock', it.x + it.w - 12, it.y + 4);
};
UI.toggleLabel = (v, a = 'ON', b = 'OFF') => v ? a : b;
/* ---- idle time (the attract mode): any action, a stick, a mouse move over 4 px, a click ---- */
UI.tickIdle = dt => {
  const I = game.input; let active = I.anyPressed() || Math.hypot(...I.move()) > .3 || !!(I.clicked && I.clicked());
  const p = I.pointer && I.pointer();
  if (p) { if (UI.lastPointer && Math.abs(p[0] - UI.lastPointer[0]) + Math.abs(p[1] - UI.lastPointer[1]) > 4) active = true; UI.lastPointer = p; }
  for (const q of game.players.slice(1)) if (q.anyPressed()) active = true;
  const codes = [...I.held].filter(c => !c.startsWith('Act:')); if (codes.some(c => !UI._held.has(c))) active = true; UI._held = new Set(codes);
  UI.idleT = active ? 0 : UI.idleT + dt;
  return active;
};
/** a toast that slides in at the top for a few seconds */
UI.toasts = [];
UI.toast = (title, text = '', seconds = 3) => { UI.toasts.push({ title, text, t: 0, life: seconds }); if (UI.toasts.length > 3) UI.toasts.shift(); };
UI.drawToasts = (g, W) => {
  let y = 6;
  for (const ts of UI.toasts) { const u = Math.min(1, ts.t * 4, (ts.life - ts.t) * 4); const w = Math.max(UI.width(ts.title, 1), UI.width(ts.text, 1)) + 20, x = W / 2 - w / 2, yy = Math.round(y - (1 - u) * 30);
    UI.panel(g, x, yy, w, ts.text ? 26 : 16, { bg: ['#3a1a5a', '#6a2a7a'], border: C.sun }); UI.text(g, ts.title, W / 2, yy + 4, { align: 'center', color: C.sun }); if (ts.text) UI.text(g, ts.text, W / 2, yy + 14, { align: 'center' }); y += 30; }
};
UI.stepToasts = dt => { for (const t of UI.toasts) t.t += dt; UI.toasts = UI.toasts.filter(t => t.t < t.life); };
/** a slider bar with a value */
UI.slider = (g, x, y, w, v, f) => { px.rect(g, x, y + 3, w, 3, '#2a1a3a'); px.rect(g, x, y + 3, Math.round(w * clamp(v, 0, 1)), 3, f ? C.sun : C.pink); px.rect(g, Math.round(x + w * clamp(v, 0, 1)) - 2, y, 5, 9, f ? '#ffffff' : C.ink); };
/** a card with an icon (shape, not colour alone) */
UI.iconCard = (g, x, y, w, h, icon, title, sub, f) => { UI.panel(g, x, y, w, h, { bg: f ? ['#5a2a7a', '#8a3a8a'] : C.panel, border: f ? C.sun : C.border }); if (icon) OB.Art.icon(g, icon, x + 8, y + h / 2 - 8, 2); UI.text(g, title, x + 30, y + 6, { scale: 1, color: f ? C.sun : C.ink }); if (sub) UI.text(g, sub, x + 30, y + 18, { color: C.dim }); };
})();
