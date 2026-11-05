/* ---- 10-FOOT UI KIT: focus model (d-pad, stick, hover, click), lists, prompts, sliders, dialog. ---- */
G.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'KeyZ', 'Pad0'], cancel: ['Backspace', 'KeyX', 'Pad1', 'Mouse2'], alt: ['Space', 'KeyC', 'Pad2'], info: ['Tab', 'KeyI', 'Pad3'],
  prev: ['KeyQ', 'PageUp', 'Pad4'], next: ['KeyE', 'PageDown', 'Pad5'], view: ['KeyV', 'Pad10'], help: ['F1', 'KeyH'],
  start: ['Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
};
const UI = G.UI = { rects: [], ptr: null, moved: false, click: null, lastPtr: null, mouse: false, toasts: [], now: 0, t: 0 };
G.activity = () => { G.lastActivity = performance.now() / 1000; };
G.idle = () => performance.now() / 1000 - (G.lastActivity || 0);
UI.pump = () => {
  const I = G.game.input; const gl = G.game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation'; if (I.glyphs !== gl) I.glyphs = gl;
  const p = I.pointer ? I.pointer() : null;
  UI.moved = !!(p && UI.lastPtr && (Math.abs(p[0] - UI.lastPtr[0]) > 1 || Math.abs(p[1] - UI.lastPtr[1]) > 1));
  if (p) UI.lastPtr = p.slice(); UI.ptr = p;
  UI.click = I.clicked ? I.clicked() : null;
  if (UI.moved || UI.click) UI.mouse = true;
  if (I.anyPressed()) UI.mouse = false;
  if (UI.moved || UI.click || I.anyPressed()) G.activity();
  UI.t += 1 / 120;
};
UI.begin = () => { UI.rects = []; };
UI.add = (owner, i, x, y, w, h) => { UI.rects.push({ owner, i, x, y, w, h }); };
UI.hit = (owner) => {   // the rect under the pointer for an owner (or any owner when null)
  const p = UI.ptr; if (!p) return null;
  for (let k = UI.rects.length - 1; k >= 0; k--) { const r = UI.rects[k]; if ((owner == null || r.owner === owner) && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) return r; }
  return null;
};
UI.clickIn = (x, y, w, h) => !!(UI.click && UI.click[0] >= x && UI.click[0] < x + w && UI.click[1] >= y && UI.click[1] < y + h);
UI.nav = () => { const I = G.game.input; return { x: (I.repeat('right', .35, .09) ? 1 : 0) - (I.repeat('left', .35, .09) ? 1 : 0), y: (I.repeat('down', .35, .09) ? 1 : 0) - (I.repeat('up', .35, .09) ? 1 : 0) }; };
UI.pressed = a => G.game.input.pressed(a);
UI.toast = (text, col) => { UI.toasts.push({ text, col: col || '#f4eed8', t: 0 }); if (UI.toasts.length > 3) UI.toasts.shift(); };
UI.drawToasts = (g, W, H, dt) => {
  UI.toasts.forEach((t, i) => { t.t += dt; const w = G.TW(t.text) + 14, x = Math.round((W - w) / 2), y = 20 + i * 14 - Math.max(0, t.t - 2.4) * 20; G.box(g, x, y, w, 13, { alpha: .9 }); G.T(g, t.text, x + 7, y + 3, t.col); });
  UI.toasts = UI.toasts.filter(t => t.t < 3);
};
/* the prompt bar: glyphs follow the device used last (PlayStation or Xbox pad glyphs, keys, mouse) */
UI.prompts = (g, W, H, items) => {
  const I = G.game.input, dev = I.lastDevice; let x = 6; const y = H - 13;
  px.rect(g, 0, y - 2, W, 15, '#0a061488');
  for (const it of items) {
    if (!it) continue; const [a, text] = it; let lab = I.label(a) || a;
    if (a === 'dpad') lab = dev === 'gamepad' ? 'D-pad' : 'Arrows';
    const col = dev === 'gamepad' ? G.PAD_COL[lab] : '#3a3258'; x += G.chip(g, x, y - 1, lab, col) + 2; G.T(g, text, x, y, '#d8d0f0'); x += G.TW(text) + 9;
    if (x > W - 20) break;
  }
};
UI.cornerSafe = () => { try { const c = G.game.cornerArea(); return c || null; } catch (e) { return null; } };

/* a vertical list: items { label, sub, disabled, col, tag } */
UI.List = class {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.top = 0; this.rows = o.rows || 8; this.o = o; this.id = {}; this.wrap = o.wrap !== false; }
  set(items) { this.items = items; this.i = Math.min(this.i, Math.max(0, items.length - 1)); }
  cur() { return this.items[this.i]; }
  update() {
    const n = this.items.length; if (!n) return I_cancel() ? { cancel: true } : null;
    const nav = UI.nav(); if (nav.y) { this.i = this.wrap ? (this.i + nav.y + n) % n : G.clamp(this.i + nav.y, 0, n - 1); G.sfx('cursor'); }
    if (this.o.horizontal && nav.x) { this.i = (this.i + nav.x + n) % n; G.sfx('cursor'); }
    if (this.top > this.i) this.top = this.i; if (this.i >= this.top + this.rows) this.top = this.i - this.rows + 1;
    const h = UI.hit(this.id);
    if (h && (UI.moved) && h.i !== this.i) { this.i = h.i; G.sfx('cursor'); }
    if (h && UI.click) { this.i = h.i; if (!this.items[this.i].disabled) { G.sfx('select'); return { pick: this.i }; } G.sfx('error'); return null; }
    if (G.game.input.pressed('confirm') && !UI.click) { if (this.items[this.i].disabled) { G.sfx('error'); return null; } G.sfx('select'); return { pick: this.i }; }
    if (I_cancel()) return { cancel: true };
    if (this.o.tabs) { if (G.game.input.pressed('prev')) return { prev: true }; if (G.game.input.pressed('next')) return { next: true }; }
    return null;
  }
  draw(g, x, y, w, rowH = 12) {
    const n = this.items.length, vis = Math.min(n, this.rows);
    for (let k = 0; k < vis; k++) {
      const i = this.top + k, it = this.items[i]; if (!it) break; const yy = y + k * rowH, sel = i === this.i;
      UI.add(this.id, i, x, yy, w, rowH);
      if (sel) { px.rect(g, x, yy, w, rowH - 1, '#4a3a7a'); px.rect(g, x, yy, w, 1, '#8a78c8'); px.rect(g, x - 2, yy + 2, 2, rowH - 5, '#f0c860'); }
      const col = it.disabled ? '#7a7490' : (it.col || (sel ? '#fff8d8' : '#d8d0f0'));
      G.T(g, it.label, x + 4, yy + 2, col);
      if (it.tag) G.T(g, it.tag, x + w - 4 - G.TW(it.tag), yy + 2, it.tagCol || '#f0c860');
    }
    if (this.top > 0) px.poly(g, [[x + w - 10, y - 2], [x + w - 4, y - 2], [x + w - 7, y - 6]], '#f0c860'); if (this.top + vis < n) px.poly(g, [[x + w - 10, y + vis * rowH + 1], [x + w - 4, y + vis * rowH + 1], [x + w - 7, y + vis * rowH + 5]], '#f0c860');
  }
};
const I_cancel = () => { const I = G.game.input; return I.pressed('cancel'); };
G.cancelPressed = I_cancel;

/* a slider row: label, value, left/right adjusts */
UI.slider = (g, x, y, w, label, v, min, max, sel) => {
  if (sel) { px.rect(g, x, y, w, 11, '#4a3a7a'); px.rect(g, x - 2, y + 2, 2, 6, '#f0c860'); }
  G.T(g, label, x + 4, y + 2, sel ? '#fff8d8' : '#d8d0f0');
  const bw = Math.round(w * .34), bx = x + w - bw - 38; G.bar(g, bx, y + 3, bw, 5, (v - min) / (max - min), sel ? '#f0c860' : '#8a78c8');
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(2); G.T(g, txt, x + w - 4 - G.TW(txt), y + 2, '#f0c860');
};

/* word wrap helper using the engine's font */
UI.wrap = (s, w) => E.font.wrap(String(s), w);
UI.text = (g, s, x, y, w, col, lh = 9) => { const ls = UI.wrap(s, w); ls.forEach((l, i) => G.T(g, l, x, y + i * lh, col)); return ls.length * lh; };

/* the talk box: typed text with Animalese per letter, a portrait, choices */
UI.Say = class {
  constructor() { this.lines = []; this.i = 0; this.n = 0; this.t = 0; this.choice = null; this.done = false; this.list = null; }
  start(lines) { this.lines = lines; this.i = 0; this.n = 0; this.t = 0; this.done = false; this.list = null; this.skipN = 0; this.enter(); }
  enter() { const l = this.lines[this.i]; this.n = 0; this.t = 0; this.list = null; this.chosen = null; if (l) { this.full = String(l.text).length; if (l.set) { } } }
  cur() { return this.lines[this.i]; }
  update(dt) {
    const l = this.cur(); if (!l || this.done) return null;
    const I = G.game.input, speed = I.down('alt') ? 160 : 48;
    if (this.n < this.full) {
      this.t += dt * speed; const m = Math.min(this.full, Math.floor(this.t));
      while (this.n < m) { const ch = String(l.text)[this.n]; if (this.n % 2 === 0) G.babble(ch, l.voice || 1); this.n++; }
      if (I.pressed('confirm') || (UI.click)) { this.n = this.full; this.t = this.full; }
      return null;
    }
    if (l.choices && !this.list) { this.list = new UI.List(l.choices.map(c => ({ label: c.text })), { rows: 4 }); }
    if (this.list) { const r = this.list.update(); if (r && r.pick != null) { const c = l.choices[r.pick]; this.chosen = c; return this.advance(c); } return null; }
    if (I.pressed('confirm') || UI.click) { G.sfx('page'); return this.advance(null); }
    return null;
  }
  advance(choice) { const l = this.cur(); if (this.i + 1 >= this.lines.length) { this.done = true; return { done: true, choice, last: l }; } this.i++; this.enter(); return { choice, step: true }; }
  draw(g, W, H, portraitFn) {
    const l = this.cur(); if (!l) return;
    const bh = 58, y = H - bh - 16, x = 6, w = W - 12;
    G.box(g, x, y, w, bh, { alpha: .96 });
    let tx = x + 8;
    if (l.who && l.who !== 'narrator' && portraitFn) { G.box(g, x + 4, y - 14, 48, 56, { bg: ['#1a1230', '#0a0618'] }); portraitFn(g, x + 6, y - 12, 44, l.who); tx = x + 58; }
    if (l.name) { const nw = G.TW(l.name) + 12; G.box(g, tx - 4, y - 8, nw, 12, { bg: ['#4a3a7a', '#2a1a4a'] }); G.T(g, l.name, tx + 2, y - 5, '#ffe8a0'); }
    const txt = String(l.text).slice(0, this.n);
    const col = l.who === 'narrator' ? '#c8d8f0' : '#f4eed8';
    UI.text(g, txt, tx, y + 8, w - (tx - x) - 10, col, 10);
    if (this.n >= this.full && !this.list) { if (Math.floor(UI.t * 2) % 2) px.poly(g, [[x + w - 16, y + bh - 12], [x + w - 8, y + bh - 12], [x + w - 12, y + bh - 7]], '#f0c860'); }
    if (this.list) { const lw = 150, lh = this.list.items.length * 12 + 6, lx = W - lw - 12, ly = y - lh - 2; G.box(g, lx, ly, lw, lh); this.list.draw(g, lx + 4, ly + 4, lw - 8); }
  }
};
