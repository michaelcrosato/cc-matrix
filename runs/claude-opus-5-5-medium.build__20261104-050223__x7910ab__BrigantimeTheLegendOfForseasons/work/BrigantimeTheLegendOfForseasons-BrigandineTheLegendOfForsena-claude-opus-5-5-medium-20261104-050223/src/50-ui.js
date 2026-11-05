/* ---- UI KIT: 10-foot widgets and the focus model (d-pad, stick, hover, click), glyphs that follow the last device,
 * the input preset, idle tracking (attract) and touch-only detection ---- */
G.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'], command: ['Space', 'Pad2'], info: ['KeyI', 'Pad3'],
  prev: ['PageUp', 'Comma', 'Pad4'], next: ['Tab', 'PageDown', 'Period', 'Pad5'], zoomOut: ['Pad6'], zoomIn: ['Pad7'], danger: ['KeyT', 'Pad10'],
  turnL: ['KeyQ'], turnR: ['KeyE', 'Pad11'], pause: ['KeyP', 'Pad9'], start: ['Pad9'], help: ['F1'], view: ['KeyV'], create: ['Pad8']
};
G.ui = {};
const I = () => G.game.input;
const PS = { 0: ['✕', '#5a8aff'], 1: ['○', '#ff5a5a'], 2: ['□', '#ff7ad0'], 3: ['△', '#5ad89a'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['Create'], 9: ['Options'], 10: ['L3'], 11: ['R3'], 12: ['↑'], 13: ['↓'], 14: ['←'], 15: ['→'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a8aff'], 3: ['Y', '#f0d040'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['View'], 9: ['Menu'], 10: ['LS'], 11: ['RS'], 12: ['↑'], 13: ['↓'], 14: ['←'], 15: ['→'] };
G.ui.device = () => { const d = I().lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
G.ui.padIndex = a => { const codes = (I().map && I().map[a]) || G.INPUT[a] || []; const c = codes.find(k => /^Pad\d+$/.test(k)); return c ? +c.slice(3) : null; };
// a glyph's width (to lay prompts out)
G.ui.glyphW = a => { const dev = G.ui.device(); if (dev === 'gamepad') { const n = G.ui.padIndex(a); if (n === null) return 0; const tab = G.xbox() ? XB : PS, l = tab[n][0]; return tab[n][1] ? 10 : E.font.width(l) + 6; } const l = G.ui.keyLabel(a); return E.font.width(l) + 6; };
G.ui.keyLabel = a => {
  const dev = G.ui.device(), codes = (I().map && I().map[a]) || G.INPUT[a] || [];
  if (dev === 'mouse') { const m = codes.find(k => /^Mouse/.test(k)); if (m) return m === 'Mouse0' ? 'L-Click' : m === 'Mouse2' ? 'R-Click' : 'M-Click'; if (a === 'confirm') return 'Click'; }
  try { const l = I().label(a, 'keyboard'); if (l) return l; } catch (e) { /* no binding */ }
  const k = codes.find(c => /^(Key|Arrow|Enter|Escape|Space|Tab|Page|F\d|Comma|Period|Minus|Equal)/.test(c)); return k ? k.replace('Key', '') : a;
};
// draw a prompt glyph for an action at x, y (top-left); returns its width
G.ui.glyph = (g, a, x, y) => {
  const dev = G.ui.device();
  if (dev === 'gamepad') {
    const n = G.ui.padIndex(a); if (n === null) return 0; const tab = G.xbox() ? XB : PS, [l, col] = tab[n];
    if (col) {
      px.disc(g, x + 4, y + 4, 5, '#140c14'); px.disc(g, x + 4, y + 4, 4, '#2a2838');
      if (tab === PS) { const c = col; if (n === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); } else if (n === 1) { px.disc(g, x + 4, y + 4, 2.5, c); px.disc(g, x + 4, y + 4, 1.5, '#2a2838'); } else if (n === 2) { px.rect(g, x + 2, y + 2, 5, 5, c); px.rect(g, x + 3, y + 3, 3, 3, '#2a2838'); } else { px.line(g, x + 4, y + 1, x + 1, y + 6, c); px.line(g, x + 4, y + 1, x + 7, y + 6, c); px.line(g, x + 1, y + 6, x + 7, y + 6, c); } }
      else { px.disc(g, x + 4, y + 4, 4, col); E.font.text(g, l, x + 4, y + 1, '#140c14', { align: 'center', outline: false, font: 'tiny' }); }
      return 10;
    }
    const w = E.font.width(l) + 6; E.ui.box(g, x, y - 1, w, 10, { bg: '#2a2838', border: '#8a86a0', gradient: false }); E.font.text(g, l, x + 3, y + 1, '#ffffff', { outline: false }); return w;
  }
  const l = G.ui.keyLabel(a), w = E.font.width(l) + 6;
  px.rect(g, x, y - 1, w, 10, '#140c14'); px.rect(g, x + 1, y - 1, w - 2, 9, '#e8e4f0'); px.rect(g, x + 1, y + 7, w - 2, 1, '#8a86a0');
  E.font.text(g, l, x + 3, y, '#1a1624', { outline: false }); return w;
};
// the prompt bar: [[action, verb], ...] at the bottom centre
G.ui.prompts = (r, list, o = {}) => {
  if (G.touchOnly()) return; const items = list.filter(Boolean).filter(([a]) => G.ui.glyphW(a) > 0);
  const lab = l => typeof l === 'function' ? l() : l, W = items.reduce((s, [a, l]) => s + G.ui.glyphW(a) + 3 + E.font.width(lab(l)) + 10, 0), y = o.y || r.H - 13;
  r.overlay(g => {
    let x = Math.round(r.W / 2 - W / 2); px.blend(g, .7, 'normal', () => px.rect(g, x - 6, y - 4, W + 12, 15, '#0a0812'));
    for (const [a, l] of items) { x += G.ui.glyph(g, a, x, y) + 3; E.font.text(g, lab(l), x, y, '#e8e4f0', { outline: false, shadow: '#000' }); x += E.font.width(lab(l)) + 10; }
  });
  G.ui.shownPrompts = items.map(([a, l]) => lab(l));
};
G.ui.big = () => G.settings && G.settings.uiScale === 'Large';
/* a focusable list: rows a thumb high; d-pad / stick moves it (with repeat), hover focuses, click picks */
class List {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.rects = []; this.scroll = 0; this.lastPtr = null; this.hold = 0; this.max = Math.min(8, o.max || 8); G.ui.lists = (G.ui.lists || 0) + 1; G.ui.maxRows = Math.max(G.ui.maxRows || 0, this.max); }   // 10-foot rule: never more than 8 rows on screen (5 at Large)
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); }
  get cur() { return this.items[this.i]; }
  move(d) { if (!this.items.length) return; let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (!this.items[n].skip) break; } if (n !== this.i) { this.i = n; G.sfx('ui_move'); } }
  // returns 'pick' | 'back' | 'left' | 'right' | null
  update(dt, o = {}) {
    const inp = o.input || I(), cols = this.o.cols || 1;
    if (inp.repeat('up', .25, .08)) this.move(-cols); if (inp.repeat('down', .25, .08)) this.move(cols);
    if (cols > 1) { if (inp.repeat('left', .25, .08)) this.move(-1); if (inp.repeat('right', .25, .08)) this.move(1); }
    else { if (inp.pressed('left')) return 'left'; if (inp.pressed('right')) return 'right'; }
    const p = inp.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { const k = this.rects.findIndex(b => b && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h); if (k >= 0 && k !== this.i && !this.items[k].skip) { this.i = k; G.sfx('ui_move'); } }
    this.lastPtr = p;
    const c = inp.clicked(); if (c) { const k = this.rects.findIndex(b => b && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h); if (k >= 0 && !this.items[k].skip) { this.i = k; return this.pick(); } }
    if (inp.pressed('confirm')) return this.pick();
    if (inp.pressed('cancel')) { G.sfx('ui_cancel'); return 'back'; }
    return null;
  }
  pick() { const it = this.items[this.i]; if (!it) return null; if (it.disabled) { G.sfx('ui_error'); G.ui.toast(it.why || 'Not now', 1.4); return null; } G.sfx('ui_confirm'); return 'pick'; }
  // draw rows at x, y, w wide; returns the height used
  draw(g, x, y, w, o = {}) {
    const big = G.ui.big(), rh = o.rh || (big ? 18 : 13), max = big ? Math.min(5, this.max) : this.max, sc = big ? 2 : 1, cols = this.o.cols || 1, cw = Math.floor(w / cols);
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + max * cols) this.scroll = this.i - max * cols + 1;
    this.scroll = Math.max(0, Math.floor(this.scroll / cols) * cols);
    this.rects = [];
    const end = Math.min(this.items.length, this.scroll + max * cols);
    for (let k = this.scroll; k < end; k++) {
      const it = this.items[k], col = (k - this.scroll) % cols, row = Math.floor((k - this.scroll) / cols), rx = x + col * cw, ry = y + row * rh, foc = k === this.i && !o.noFocus;
      this.rects[k] = { x: rx, y: ry, w: cw - 2, h: rh - 1 };
      if (it.skip) { E.font.text(g, it.label, rx + 4, ry + 3, '#b8a878', { outline: false, scale: sc > 1 ? 1 : 1 }); continue; }
      if (foc) { const b = Math.sin(G.game.real * 8) > 0 ? 1 : 0; px.rect(g, rx, ry, cw - 2, rh - 1, '#3a3a7a'); px.rect(g, rx, ry, cw - 2, 1, '#ffe070'); px.rect(g, rx, ry + rh - 2, cw - 2, 1, '#ffe070'); px.poly(g, [[rx + 2 + b, ry + rh / 2 - 3], [rx + 6 + b, ry + rh / 2], [rx + 2 + b, ry + rh / 2 + 3]], '#ffe070'); }
      let tx = rx + 9; if (it.icon) { it.icon(g, tx + 4, ry + rh / 2); tx += 12; }
      E.font.text(g, it.label, tx, ry + Math.round(rh / 2) - 3 * sc, it.disabled ? '#6a6680' : it.color || (foc ? '#ffffff' : '#d8d4e8'), { outline: false, scale: sc });
      if (it.right) E.font.text(g, it.right, rx + cw - 6, ry + Math.round(rh / 2) - 3 * sc, it.disabled ? '#6a6680' : it.rightColor || '#a8c8ff', { align: 'right', outline: false, scale: sc });
    }
    if (this.scroll > 0) px.poly(g, [[x + w / 2 - 4, y - 2], [x + w / 2 + 4, y - 2], [x + w / 2, y - 6]], '#ffe070');
    if (end < this.items.length) { const by = y + Math.ceil((end - this.scroll) / cols) * rh + 1; px.poly(g, [[x + w / 2 - 4, by], [x + w / 2 + 4, by], [x + w / 2, by + 4]], '#ffe070'); }
    const why = this.items[this.i] && this.items[this.i].disabled && this.items[this.i].why; this.whyLine = why || null;
    return Math.ceil((end - this.scroll) / cols) * rh;
  }
  hit(p) { return p && this.rects.some(b => b && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h); }
}
G.ui.List = List;
G.ui.panel = (g, x, y, w, h, title, o = {}) => {
  E.ui.box(g, x, y, w, h, { alpha: o.alpha || .9, bg: o.bg || ['#22203a', '#14121f'], border: o.border || '#8a7a50' });
  if (title) { E.font.text(g, title, x + 7, y + 5, o.titleColor || '#ffe8a8', { outline: false, shadow: '#000' }); px.rect(g, x + 5, y + 15, w - 10, 1, '#5a5070'); }
};
G.ui.bar = (g, x, y, w, v, max, col, label) => { px.rect(g, x - 1, y - 1, w + 2, 5, '#140c14'); px.rect(g, x, y, w, 3, '#3a3448'); px.rect(g, x, y, Math.max(0, Math.round(w * Math.min(1, v / Math.max(1, max)))), 3, col); if (label) E.font.text(g, label, x + w + 4, y - 2, '#d8d4e8', { outline: false, font: 'tiny' }); };
G.ui.statBar = (g, x, y, name, v, max, col) => { E.font.text(g, name, x, y, '#b8b0c8', { outline: false }); G.ui.bar(g, x + 24, y + 2, 60, v, max, col); E.font.text(g, String(Math.round(v)), x + 90, y, '#ffffff', { outline: false }); };
/* toasts: short notes stacked at the top centre */
G.ui._toasts = [];
G.ui.toast = (text, s = 3) => { G.ui._toasts.push({ text, t: 0, s }); if (G.ui._toasts.length > 3) G.ui._toasts.shift(); };
G.ui.drawToasts = (r, dt) => {
  const T = G.ui._toasts; for (const t of T) t.t += dt; for (let i = T.length - 1; i >= 0; i--) if (T[i].t > T[i].s) T.splice(i, 1);
  r.overlay(g => T.forEach((t, i) => { const lines = E.font.wrap(t.text, Math.min(300, r.W - 40)), w = Math.max(...lines.map(l => E.font.width(l))) + 16, x = Math.round(r.W / 2 - w / 2), y = 26 + i * 22; E.ui.box(g, x, y, w, 6 + lines.length * 9, { alpha: .92, border: '#d8c070' }); lines.forEach((l, k) => E.font.text(g, l, r.W / 2, y + 4 + k * 9, '#fff4d0', { align: 'center', outline: false })); }));
};
/* a confirm box: { text, yes, no, onYes, onNo } - modal over a scene; update returns true while open */
class Confirm {
  constructor() { this.open = false; this.list = new List([{ label: 'Yes' }, { label: 'No' }]); }
  ask(text, onYes, o = {}) { this.text = text; this.onYes = onYes; this.onNo = o.onNo; this.list.set([{ label: o.yes || 'Yes' }, { label: o.no || 'No' }]); this.list.i = o.focusNo ? 1 : 0; this.open = true; G.sfx('ui_open'); }
  update(dt) { if (!this.open) return false; const r = this.list.update(dt); if (r === 'pick') { this.open = false; I().consumeAll(); if (this.list.i === 0) this.onYes && this.onYes(); else this.onNo && this.onNo(); } else if (r === 'back') { this.open = false; I().consumeAll(); this.onNo && this.onNo(); } return true; }
  draw(r) { if (!this.open) return; r.overlay(g => { const lines = E.font.wrap(this.text, 220), w = 240, h = 30 + lines.length * 10 + 30, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2); px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); G.ui.panel(g, x, y, w, h, null); lines.forEach((l, i) => E.font.text(g, l, r.W / 2, y + 10 + i * 10, '#ffffff', { align: 'center', outline: false })); this.list.draw(g, x + 70, y + 16 + lines.length * 10, 100); }); }
}
G.ui.Confirm = Confirm;
/* idle time for the attract mode: any key, button, click, pointer move over 4 px or stick push resets it */
G.idle = 0; G._lastPtr = null; G._seenInput = false;
G.trackIdle = dt => {
  const inp = I(); let active = inp.anyPressed() || (inp.held && inp.held.size > 0);
  const p = inp.pointer(); if (p && G._lastPtr && Math.hypot(p[0] - G._lastPtr[0], p[1] - G._lastPtr[1]) > 4) active = true; if (p) G._lastPtr = p.slice();
  const m = inp.move(); if (Math.hypot(m[0], m[1]) > .5) active = true;
  if (inp.clicked()) active = true;
  if (active) { G.idle = 0; if (inp.lastDevice === 'keyboard' || inp.lastDevice === 'gamepad') G._seenInput = true; } else G.idle += dt;
  return active;
};
/* touch-only devices: coarse pointer, no fine pointer, touch points, no key or pad seen */
G.forceTouchOnly = false;
G.touchOnly = () => {
  if (G.forceTouchOnly) return true; if (G._seenInput) return false;
  try { if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false; return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0 && !(navigator.getGamepads && [...navigator.getGamepads()].some(p => p)); } catch (e) { return false; }
};
// text helpers
G.ui.text = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
G.ui.wrapText = (g, s, x, y, w, c = '#e8e4f0', lh = 10, o = {}) => { const lines = E.font.wrap(s, w); lines.forEach((l, i) => G.ui.text(g, l, x, y + i * lh, c, o)); return lines.length * lh; };
G.xbox = () => !!(G.game && G.game.settings && G.game.settings.glyphs === 'xbox');
// the glyph's text for an action on the current device (prompts, tests): '✕' / 'A' / 'Enter' / 'L-Click'
G.ui.glyphLabel = a => { if (G.ui.device() === 'gamepad') { const n = G.ui.padIndex(a); return n === null ? '' : (G.xbox() ? XB : PS)[n][0]; } return G.ui.keyLabel(a); };
