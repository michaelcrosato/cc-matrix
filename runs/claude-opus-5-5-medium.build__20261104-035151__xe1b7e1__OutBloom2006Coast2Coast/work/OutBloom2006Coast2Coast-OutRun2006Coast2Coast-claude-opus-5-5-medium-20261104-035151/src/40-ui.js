/* The 10-foot UI kit (PLAN §7.17, §7.19, Appendix C): canvas screens built for a pad on a TV, native on keys and
 * mouse. Glyph prompts follow the device used last (PlayStation by default, Xbox in Settings, keycaps, mouse buttons);
 * focus moves spatially with the d-pad, stick, arrows or WASD; the mouse hovers to focus and clicks to pick; every
 * screen has a way back (○ / B, Esc, Backspace or a right click). The idle clock here starts the attract mode. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E;
const C = OB.COL = { ink: '#fff4e0', dim: '#c8b8e0', sun: '#ffcf4a', pink: '#ff5fa2', sea: '#3ac8e0', panel: ['#2a1450', '#5a2a6a'], border: '#ffd6a0', dark: '#140a28', good: '#5ae08a', bad: '#ff6a5a' };
const T = (g, s, x, y, c, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), c || C.ink, Object.assign({ shadow: '#140a28', outline: false }, o));
const TW = (s, o = {}) => E.font.width(String(s), o);
OB.T = T; OB.TW = TW;

/* ---- glyphs ---- */
const PS = { 0: ['cross', '#7ab0ff'], 1: ['circle', '#ff6a6a'], 2: ['square', '#ff8ad0'], 3: ['triangle', '#5ae0a0'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['Create'], 9: ['Options'], 12: ['dup'], 13: ['ddown'], 14: ['dleft'], 15: ['dright'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#e84a4a'], 2: ['X', '#4a8ae8'], 3: ['Y', '#e8c83a'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['View'], 9: ['Menu'], 12: ['dup'], 13: ['ddown'], 14: ['dleft'], 15: ['dright'] };
function padGlyph(g, x, y, n, s) {
  const xbox = OB.game && OB.game.settings && OB.game.settings.glyphs === 'xbox', G = (xbox ? XB : PS)[n] || ['?'], r = 5 * s, cx = x + r, cy = y + r;
  const [kind, col] = G;
  if (n <= 3) {
    px.disc(g, cx, cy, r + 1, '#0a0614'); px.disc(g, cx, cy, r, xbox ? col : '#2a2440');
    if (xbox) T(g, kind, cx, cy - 3 * s, '#ffffff', { align: 'center', scale: s, shadow: false });
    else if (kind === 'cross') { px.line(g, cx - 2.5 * s, cy - 2.5 * s, cx + 2.5 * s, cy + 2.5 * s, col, s); px.line(g, cx + 2.5 * s, cy - 2.5 * s, cx - 2.5 * s, cy + 2.5 * s, col, s); }
    else if (kind === 'circle') { px.disc(g, cx, cy, 3 * s, col); px.disc(g, cx, cy, 3 * s - s, '#2a2440'); }
    else if (kind === 'square') { px.rect(g, cx - 2.5 * s, cy - 2.5 * s, 5 * s, 5 * s, col); px.rect(g, cx - 2.5 * s + s, cy - 2.5 * s + s, 5 * s - 2 * s, 5 * s - 2 * s, '#2a2440'); }
    else { px.poly(g, [[cx, cy - 3 * s], [cx + 3.2 * s, cy + 2.4 * s], [cx - 3.2 * s, cy + 2.4 * s]], col); px.poly(g, [[cx, cy - 1.2 * s], [cx + 1.6 * s, cy + 1.6 * s], [cx - 1.6 * s, cy + 1.6 * s]], '#2a2440'); }
    return 2 * r + 2;
  }
  if (n >= 12 && n <= 15) {
    px.rect(g, cx - 1.5 * s, y, 3 * s, 2 * r, '#0a0614'); px.rect(g, x, cy - 1.5 * s, 2 * r, 3 * s, '#0a0614');
    px.rect(g, cx - s, y + s, 2 * s, 2 * r - 2 * s, '#5a5470'); px.rect(g, x + s, cy - s, 2 * r - 2 * s, 2 * s, '#5a5470');
    const lit = { 12: [0, -1], 13: [0, 1], 14: [-1, 0], 15: [1, 0] }[n]; px.rect(g, cx - s + lit[0] * 3 * s, cy - s + lit[1] * 3 * s, 2 * s, 2 * s, C.sun);
    return 2 * r + 2;
  }
  const label = kind, w = TW(label, { scale: s }) + 6 * s;
  px.rect(g, x, y + s, w, 2 * r - 2 * s, '#0a0614'); px.rect(g, x + s, y + s, w - 2 * s, 2 * r - 3 * s, '#3a3458');
  T(g, label, x + w / 2, y + 2 * s, '#ffffff', { align: 'center', scale: s, shadow: false });
  return w + 2;
}
function keycap(g, x, y, label, s) {
  const w = Math.max(10 * s, TW(label, { scale: s }) + 6 * s), h = 10 * s;
  px.rect(g, x, y, w, h, '#0a0614'); px.rect(g, x + s, y, w - 2 * s, h - s, '#e8e0f0'); px.rect(g, x + s, y + h - 3 * s, w - 2 * s, 2 * s, '#a8a0c0');
  T(g, label, x + w / 2, y + 1.5 * s, '#2a2040', { align: 'center', scale: s, shadow: false });
  return w + 2;
}
function mouseIcon(g, x, y, btn, s) {
  px.rect(g, x + s, y, 7 * s, 10 * s, '#0a0614'); px.rect(g, x + 2 * s, y + s, 5 * s, 8 * s, '#e8e0f0'); px.rect(g, x + 4 * s, y + s, s, 3 * s, '#5a5470');
  if (btn === 0) px.rect(g, x + 2 * s, y + s, 2 * s, 3 * s, C.sun); else if (btn === 2) px.rect(g, x + 5 * s, y + s, 2 * s, 3 * s, C.sun); else px.rect(g, x + 4 * s, y + s, s, 3 * s, C.sun);
  return 9 * s + 2;
}
const KEYNAMES = { Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'SHIFT', ControlLeft: 'CTRL', Period: '.', Slash: '/', Comma: ',' };
const keyName = code => KEYNAMES[code] || (code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code);
OB.UI = {
  C, idle: 0, lastMouse: null, wasR: false,
  device(I = OB.game.input) { const d = I.lastDevice; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'keys'; },
  /** the codes bound to an action for a device */
  codes(action, I = OB.game.input) { return (I.map && I.map[action]) || []; },
  /** a glyph for an action on the device used last; returns its width */
  glyph(g, x, y, action, o = {}) {
    const I = o.input || OB.game.input, s = o.scale || 1, dev = o.device || this.device(I), codes = this.codes(action, I);
    if (dev === 'pad') { const pc = codes.map(c => /^Pad(\d+)$/.exec(c)).filter(Boolean).map(m => +m[1]); const pref = o.pad !== undefined ? o.pad : pc.find(n => n === 7 || n === 6) ?? pc[0]; if (pref !== undefined) return padGlyph(g, x, y, pref, s); }
    if (dev === 'mouse' && (action === 'confirm' || action === 'cancel')) return mouseIcon(g, x, y, action === 'confirm' ? 0 : 2, s);
    const kc = codes.find(c => !/^(Pad|Act|Mouse)/.test(c)); return keycap(g, x, y, kc ? keyName(kc) : action.toUpperCase(), s);
  },
  /** a prompt: the glyph and a word; returns its width */
  prompt(g, x, y, action, text, o = {}) {
    const s = o.scale || 1, w0 = this.glyph(g, x, y, action, o); T(g, text, x + w0 + 2 * s, y + 1.5 * s, o.color || C.ink, { scale: s });
    return w0 + 2 * s + TW(text, { scale: s }) + 8 * s;
  },
  /** a row of prompts, anchored right or centred at (x, y) */
  prompts(g, list, x, y, o = {}) {
    const s = o.scale || 1, ws = list.map(([a, t]) => this.glyphW(a, o) + 2 * s + TW(t, { scale: s }) + 8 * s), tot = ws.reduce((a, b) => a + b, 0);
    let cx = o.align === 'right' ? x - tot : o.align === 'center' ? x - tot / 2 : x;
    list.forEach(([a, t], i) => { this.prompt(g, cx, y, a, t, o); cx += ws[i]; });
    return tot;
  },
  glyphW(action, o = {}) { const s = o.scale || 1, dev = o.device || this.device(o.input), codes = this.codes(action, o.input); if (dev === 'pad') { const pc = codes.map(c => /^Pad(\d+)$/.exec(c)).filter(Boolean).map(m => +m[1]), n = pc.find(n => n === 7 || n === 6) ?? pc[0]; if (n !== undefined && (n <= 3 || n >= 12)) return 10 * s + 2; if (n !== undefined) { const xbox = OB.game.settings.glyphs === 'xbox'; return TW((xbox ? XB : PS)[n][0], { scale: s }) + 6 * s + 2; } } if (dev === 'mouse' && (action === 'confirm' || action === 'cancel')) return 9 * s + 2; const kc = codes.find(c => !/^(Pad|Act|Mouse)/.test(c)); return Math.max(10 * s, TW(kc ? keyName(kc) : action.toUpperCase(), { scale: s }) + 6 * s) + 2; },
  /** "PRESS ✕" / "PRESS ENTER" by the device */
  pressStart(g, x, y, o = {}) { const s = o.scale || 1, w = TW('PRESS ', { scale: s }) + this.glyphW('confirm', o); T(g, 'PRESS ', x - w / 2, y + 1.5 * s, o.color || C.ink, { scale: s }); this.glyph(g, x - w / 2 + TW('PRESS ', { scale: s }), y, 'confirm', o); },
  panel(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || C.panel, border: o.border || C.border, alpha: o.alpha }); },
  title(g, s, x, y, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ align: 'center', scale: 3, colors: ['#fff4e0', '#ffb3d1', '#ff7a59', '#ffcf4a'], depth: 2, depthColor: '#5a1e4a' }, o)); },
  /** the idle clock (any input resets it) and the right mouse button's "back" */
  tick(dt) {
    const I = OB.game.input; let any = false;
    for (const P of OB.game.players || [I]) { if (P.anyPressed && P.anyPressed()) any = true; const m = P.move ? P.move() : [0, 0]; if (Math.abs(m[0]) > .3 || Math.abs(m[1]) > .3) any = true; }
    const mp = I.pointer && I.pointer(); if (mp) { if (this.lastMouse && Math.hypot(mp[0] - this.lastMouse[0], mp[1] - this.lastMouse[1]) > 4) any = true; this.lastMouse = mp; }
    if (I.clicked && I.clicked()) any = true;
    if (I.held && (I.held.has('Mouse0') || I.held.has('Mouse2'))) any = true;
    const r = !!(I.held && I.held.has('Mouse2')); this.rightClick = r && !this.wasR; this.wasR = r;
    this.anyInput = any; this.idle = any ? 0 : this.idle + dt;
  },
  back(I = OB.game.input) { return I.pressed('cancel') || this.rightClick; }
};

/* ---- a focus screen: items with rects; spatial navigation; hover; click ---- */
class Screen {
  constructor(o = {}) { this.items = []; this.i = 0; this.pop = 0; this.o = o; this.t = 0; }
  set(items) { const id = this.items[this.i] && this.items[this.i].id; this.items = items; const k = items.findIndex(it => it.id === id && !it.disabled); if (k >= 0) this.i = k; else if (!items[this.i] || items[this.i].disabled) this.i = Math.max(0, items.findIndex(it => !it.disabled)); return this; }
  get cur() { return this.items[this.i]; }
  focus(id) { const k = this.items.findIndex(it => it.id === id); if (k >= 0 && k !== this.i) { this.i = k; this.pop = 1; OB.Sound.play('focus'); } }
  _move(dx, dy) {
    const a = this.cur; if (!a) return;
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2; let best = -1, bd = 1e9;
    this.items.forEach((b, k) => {
      if (k === this.i || b.disabled || b.nofocus) return;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2, vx = bx - ax, vy = by - ay, along = vx * dx + vy * dy; if (along <= 2) return;
      const across = Math.abs(vx * dy - vy * dx), d = along + across * 2.2; if (d < bd) { bd = d; best = k; }
    });
    if (best < 0 && this.o.wrap !== false) { // wrap to the far side along that axis
      let far = -1, fd = -1e9; this.items.forEach((b, k) => { if (b.disabled || b.nofocus) return; const v = -((b.x + b.w / 2 - ax) * dx + (b.y + b.h / 2 - ay) * dy), across = Math.abs((b.x + b.w / 2 - ax) * dy - (b.y + b.h / 2 - ay) * dx); if (across < 30 && v > fd) { fd = v; far = k; } }); if (far >= 0 && far !== this.i) best = far;
    }
    if (best >= 0) { this.i = best; this.pop = 1; OB.Sound.play('focus'); }
  }
  /** a step: navigation, adjust (left/right on a slider or a choice), pick, back. Returns 'pick' | 'back' | null */
  update(dt, I = OB.game.input) {
    this.t += dt; this.pop = Math.max(0, this.pop - dt * 4);
    const cur = this.cur, horiz = cur && (cur.onLeft || cur.onRight);
    if (I.repeat('up', .35, .12)) this._move(0, -1);
    if (I.repeat('down', .35, .12)) this._move(0, 1);
    if (I.repeat('left', .35, .1)) { if (horiz && cur.onLeft) { cur.onLeft(); OB.Sound.play('slide'); } else this._move(-1, 0); }
    if (I.repeat('right', .35, .1)) { if (horiz && cur.onRight) { cur.onRight(); OB.Sound.play('slide'); } else this._move(1, 0); }
    // the mouse: hover focuses, a click picks
    const mp = I.pointer && I.pointer();
    if (mp && OB.UI.lastMouseMoved !== mp[0] + ':' + mp[1]) { OB.UI.lastMouseMoved = mp[0] + ':' + mp[1]; const k = this.items.findIndex(it => !it.disabled && !it.nofocus && mp[0] >= it.x && mp[0] < it.x + it.w && mp[1] >= it.y && mp[1] < it.y + it.h); if (k >= 0 && k !== this.i) { this.i = k; this.pop = 1; OB.Sound.play('focus'); } }
    const ck = I.clicked && I.clicked();
    if (ck) { const it = this.items.find(it => !it.disabled && ck[0] >= it.x && ck[0] < it.x + it.w && ck[1] >= it.y && ck[1] < it.y + it.h); if (it) { if (it.onClick) it.onClick(ck); else { this.i = this.items.indexOf(it); return this._pick(); } } }
    if (I.pressed('confirm') || I.pressed('start')) return this._pick();
    if (OB.UI.back(I)) { OB.Sound.play('back'); return 'back'; }
    return null;
  }
  _pick() { const it = this.cur; if (!it || it.disabled) { OB.Sound.play('error'); return null; } OB.Sound.play('ok'); if (it.onPick) it.onPick(it); return 'pick'; }
  /** draw each item: its own draw(g, it, focused) or a big button */
  draw(g) {
    this.items.forEach((it, k) => {
      const f = k === this.i;
      if (it.draw) it.draw(g, it, f, this);
      else OB.UI.button(g, it, f, this);
    });
  }
  ring(g, it) { OB.UI.ring(g, it.x, it.y, it.w, it.h, this.t, this.pop); }
}
OB.UI.Screen = Screen;
OB.UI.ring = (g, x, y, w, h, t, pop = 0) => { const p = Math.round(pop * 2), c = Math.floor(t * 4) % 2 ? '#ffcf4a' : '#ffe890'; for (let i = 0; i < 2; i++) { px.rect(g, x - 2 - p + i, y - 2 - p + i, w + 4 + 2 * p - 2 * i, 1, c); px.rect(g, x - 2 - p + i, y + h + 1 + p - i, w + 4 + 2 * p - 2 * i, 1, c); px.rect(g, x - 2 - p + i, y - 2 - p + i, 1, h + 4 + 2 * p - 2 * i, c); px.rect(g, x + w + 1 + p - i, y - 2 - p + i, 1, h + 4 + 2 * p - 2 * i, c); } };
OB.UI.button = (g, it, f, scr) => {
  E.ui.box(g, it.x, it.y, it.w, it.h, { bg: it.disabled ? ['#2a2438', '#1a1828'] : f ? ['#ff7a9a', '#c83a7a'] : ['#3a2470', '#2a1450'], border: f ? '#fff4c0' : '#8a70b0' });
  const s = it.scale || 2, lab = it.label || '';
  T(g, lab, it.x + it.w / 2, it.y + it.h / 2 - 3.5 * s - (it.sub ? 4 : 0), it.disabled ? '#7a7090' : '#ffffff', { align: 'center', scale: s });
  if (it.sub) T(g, it.sub, it.x + it.w / 2, it.y + it.h / 2 + 5, f ? '#fff4e0' : '#c8b8e0', { align: 'center' });
  if (it.value !== undefined) T(g, it.value, it.x + it.w - 8, it.y + it.h / 2 - 3.5, OB.COL.sun, { align: 'right' });
  if (f && scr) scr.ring(g, it);
};
/** a toast, a banner, a footer of prompts */
OB.UI.toasts = [];
OB.UI.toast = (title, text, t = 3) => { OB.UI.toasts.push({ title, text, t, max: t }); if (OB.UI.toasts.length > 3) OB.UI.toasts.shift(); };
OB.UI.drawToasts = (g, W) => { let y = 8; for (const k of OB.UI.toasts) { const w = Math.max(TW(k.title, { scale: 1 }), TW(k.text)) + 24; OB.UI.panel(g, W - w - 8, y, w, 30, { alpha: .92 }); T(g, k.title, W - w + 4, y + 5, OB.COL.sun); T(g, k.text, W - w + 4, y + 16, OB.COL.ink); y += 34; } };
OB.UI.stepToasts = dt => { for (const k of OB.UI.toasts) k.t -= dt; OB.UI.toasts = OB.UI.toasts.filter(k => k.t > 0); };
OB.UI.footer = (g, W, H, list) => { px.blend(g, .6, 'normal', () => px.rect(g, 0, H - 22, W, 22, '#140a28')); OB.UI.prompts(g, list, W - 10, H - 17, { align: 'right' }); };
OB.UI.keyName = keyName;
OB.UI.padGlyph = padGlyph;
})();
