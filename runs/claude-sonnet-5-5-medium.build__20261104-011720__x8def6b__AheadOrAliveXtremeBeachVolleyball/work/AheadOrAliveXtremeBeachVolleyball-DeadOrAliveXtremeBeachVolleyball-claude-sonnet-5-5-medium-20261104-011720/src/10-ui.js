/* 10-ui: input presets, prompt glyphs, and the 10-foot canvas UI kit (menus, sliders, panels, backdrops). */

/* ---- input presets: confirm/cancel/up/down/left/right/start/pause come from the engine in every preset ---- */
G.INPUT_BASE = (() => { const D = E.Input.DEFAULT, o = {}; for (const k of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) o[k] = D[k].filter(c => c !== 'KeyP'); return o; })();
G.INPUT_MATCH = Object.assign({}, G.INPUT_BASE, { play: ['Space', 'KeyJ', 'Pad0', 'Mouse0'], dive: ['KeyK', 'ShiftLeft', 'Pad1', 'Mouse2'], call: ['KeyL', 'Pad2'], cam: ['KeyV', 'Pad3'], tab: ['Tab', 'KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], photo: ['KeyC'] });
G.INPUT_MENU = Object.assign({}, G.INPUT_BASE, { photo: ['KeyC', 'Pad3'], tab: ['Tab', 'KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], play: ['Space', 'Pad0', 'Mouse0'], dive: ['ShiftLeft', 'Pad2'], call: ['KeyL', 'Pad2'] });

/* ---- prompts: glyphs follow the device used last ---- */
const PS_COL = { '✕': '#6aa0ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#6ae0a0' };
const XB_COL = { A: '#5ad05a', B: '#e05a5a', X: '#5a8ae0', Y: '#e0d05a' };
G.dev = () => (G.game && G.game.input && G.game.input.lastDevice) || 'keyboard';
G.isPad = () => G.dev() === 'gamepad';
// returns the label for an action on the current device
G.label = a => {
  const I = G.game.input, d = I.lastDevice;
  if (d === 'mouse') {
    if (a === 'play' || a === 'confirm') return 'Click';
    if (a === 'dive') return 'R-Click';
  }
  const l = I.label(a, d === 'mouse' ? 'keyboard' : d);
  return l || a;
};
G.glyphW = a => { const l = G.label(a); return E.font.width(l) + (G.isPad() ? 7 : 8); };
G.drawGlyph = (g, x, y, a) => {
  const l = G.label(a), w = E.font.width(l);
  if (G.isPad()) {
    const c = PS_COL[l] || XB_COL[l];
    if (c) { px.disc(g, x + 5, y + 4, 5, '#10202c'); px.disc(g, x + 5, y + 4, 4, c); E.font.text(g, l, x + 5 - Math.floor(w / 2) + (w % 2 ? 0 : 0), y + 1, '#10202c', { outline: false }); return 11; }
    const bw = w + 6; E.ui.box(g, x, y - 1, bw, 11, { bg: ['#d8d8e8', '#9898b0'], border: '#10202c', gradient: true }); E.font.text(g, l, x + 3, y + 1, '#10202c', { outline: false }); return bw + 1;
  }
  const bw = w + 6; E.ui.box(g, x, y - 1, bw, 11, { bg: ['#f4f0e0', '#c8c0a8'], border: '#3a3020' }); E.font.text(g, l, x + 3, y + 1, '#2a2418', { outline: false }); return bw + 1;
};
// a row of prompts at the bottom right: [['confirm','Select'], ['cancel','Back']]
G.drawPrompts = (r, list, y) => {
  r.overlay(g => {
    let total = 0; const yy = y === undefined ? r.H - 15 : y;
    for (const [a, t] of list) total += G.glyphW(a) + E.font.width(t) + 10;
    let x = Math.round(r.W - total - 6);
    E.ui.box(g, x - 4, yy - 3, total + 6, 15, { bg: ['#0d2a36', '#06141c'], border: '#2a6a7a', alpha: .75 });
    for (const [a, t] of list) { const w = G.drawGlyph(g, x, yy, a); E.font.text(g, t, x + w + 2, yy + 1, '#ffeec2', { outline: false, shadow: '#000' }); x += w + E.font.width(t) + 12; }
  });
};

/* ---- panels and text ---- */
G.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a' }, o));
G.text = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
G.wrap = (s, w, o = {}) => E.font.wrap(s, w, o);
G.logo = (g, W, y, scale = 3) => {
  E.font.title(g, G.TITLE, W / 2, y, { align: 'center', scale, colors: ['#fff6c8', '#ffd24a', '#ff9a3c', '#ff4f6a'], depth: 3, depthColor: '#5a1030' });
  E.font.title(g, G.STRAP, W / 2, y + scale * 9 + 4, { align: 'center', scale: Math.max(1, Math.floor(scale / 2)), colors: ['#d8fff8', '#6ae0e0', '#2aa0c8'], depth: 2, depthColor: '#082a3a' });
};

/* ---- the beach backdrop used by menus and cutscenes ---- */
G.beach = (r, t = 0, o = {}) => {
  const W = r.W, H = r.H, g = r.tgt, hz = Math.round(H * (o.horizon || .5));
  const sky = o.sky || ['#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347', '#ffe08a'];
  const bands = sky.length;
  for (let i = 0; i < bands; i++) px.rect(g, 0, Math.floor(i * hz / bands), W, Math.ceil(hz / bands) + 1, sky[i]);
  // sun
  const sx = Math.round(W * (o.sunX || .72)), sy = hz - 10 - Math.round(Math.sin(t * .1) * 2);
  px.disc(g, sx, sy, 20, '#ffd9a0'); px.disc(g, sx, sy, 15, '#fff2c8');
  // sea
  for (let y = hz; y < hz + Math.round(H * .16); y++) {
    const k = (y - hz) / (H * .16);
    px.rect(g, 0, y, W, 1, k < .5 ? '#1a6a9a' : '#0f4c78');
    const wob = Math.round(Math.sin(y * .7 + t * 2) * 6);
    for (let x = (wob + 400) % 22; x < W; x += 22) px.rect(g, x, y, 6 + (y & 3), 1, '#6ac8e8');
  }
  px.rect(g, sx - 3, hz, 6, Math.round(H * .16), '#ffe0a0');
  // sand
  const sandY = hz + Math.round(H * .16);
  px.rect(g, 0, sandY, W, H - sandY, '#f2d79a');
  for (let y = sandY; y < H; y += 3) px.rect(g, 0, y, W, 1, (y / 3 & 1) ? '#ecce8c' : '#f6dea8');
  // palms
  const palm = (x, h, flip) => {
    px.rect(g, x, sandY - h, 3, h, '#4a2c1a'); px.rect(g, x + (flip ? 1 : 0), sandY - h, 1, h, '#6a4228');
    for (let k = 0; k < 5; k++) { const a = -Math.PI * .1 - k * Math.PI * .2 + Math.sin(t * 1.2 + k) * .06; const ex = x + 1 + Math.cos(a) * 17, ey = sandY - h + Math.sin(a) * -9 + 4 + Math.abs(Math.cos(a)) * 4; px.line(g, x + 1, sandY - h, Math.round(ex), Math.round(ey), '#1e7a3a', 2); px.line(g, x + 1, sandY - h, Math.round(ex), Math.round(ey) - 1, '#3fb050', 1); }
  };
  if (!o.noPalms) { palm(Math.round(W * .06), 62, false); palm(Math.round(W * .94), 74, true); palm(Math.round(W * .88), 52, true); }
  return { sandY, hz };
};
G.sand = (r, hz) => { px.rect(r.tgt, 0, hz, r.W, r.H - hz, '#f2d79a'); };

/* ---- the menu: keyboard, pad and mouse all move the same focus ---- */
class Menu {
  constructor(items, o = {}) {
    this.items = items; this.i = 0; this.o = Object.assign({ x: 'center', y: 96, w: 150, gap: 15, scale: 1, title: '' }, o);
    this.rects = []; this.lastPtr = null; this.t = 0; this.onCancel = o.onCancel || null;
    while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++;
  }
  move(d) {
    const n = this.items.length; if (!n) return;
    for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled) break; }
    G.game.audio.sfx('select');
  }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) { G.game.audio.sfx('cancel'); return; } G.game.audio.sfx('confirm'); if (it.onPick) it.onPick(it, this.i); else if (this.o.onPick) this.o.onPick(it, this.i); }
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('up') || I.repeat('up', .35, .1)) this.move(-1);
    else if (I.pressed('down') || I.repeat('down', .35, .1)) this.move(1);
    const it = this.items[this.i];
    if (it && it.adjust) { if (I.pressed('left') || I.repeat('left', .35, .08)) { it.adjust(-1); G.game.audio.sfx('select'); } if (I.pressed('right') || I.repeat('right', .35, .08)) { it.adjust(1); G.game.audio.sfx('select'); } }
    const p = I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) {
      this.lastPtr = [p[0], p[1]];
      for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && !this.items[k].disabled && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) { if (this.i !== k) { this.i = k; G.game.audio.sfx('select'); } } }
    }
    const c = I.clicked();
    if (c) { for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { if (it && it.adjust && c[0] > q[0] + q[2] / 2 && k === this.i && it.clickAdjust !== false) { it.adjust(1); } else { this.i = k; this.pick(); } return true; } } }
    if (I.pressed('confirm')) { this.pick(); return true; }
    if (I.pressed('cancel') && this.onCancel) { G.game.audio.sfx('cancel'); this.onCancel(); return true; }
    return false;
  }
  draw(r) {
    const o = this.o, W = r.W, n = this.items.length, w = o.w, x = o.x === 'center' ? Math.round((W - w) / 2) : o.x, gap = o.gap;
    this.rects = [];
    r.overlay(g => {
      if (o.title) E.font.text(g, o.title, x + w / 2, o.y - 18, '#ffd24a', { align: 'center', shadow: '#5a1030', outline: false, scale: 1 });
      for (let k = 0; k < n; k++) {
        const it = this.items[k], y = o.y + k * gap, sel = k === this.i;
        this.rects[k] = [x, y - 2, w, gap - 1];
        if (sel) {
          const pulse = .5 + .5 * Math.sin(this.t * 7);
          E.ui.box(g, x, y - 2, w, gap - 1, { bg: ['#ff9a3c', '#ff4f6a'], border: pulse > .5 ? '#fff6c8' : '#ffd24a' });
          E.font.text(g, '▶', x + 3, y + 1, '#fff6c8', { outline: false });
        } else E.ui.box(g, x, y - 2, w, gap - 1, { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .85 });
        const label = typeof it.label === 'function' ? it.label() : it.label, col = it.disabled ? '#6a8a94' : sel ? '#ffffff' : '#d8f4f0';
        E.font.text(g, label, x + 14, y + 1, col, { shadow: '#000', outline: false });
        if (it.value !== undefined) { const v = typeof it.value === 'function' ? it.value() : it.value; E.font.text(g, String(v), x + w - 5, y + 1, sel ? '#fff6c8' : '#ffd24a', { align: 'right', shadow: '#000', outline: false }); }
      }
    });
  }
}
G.Menu = Menu;

/* ---- the slider list: dev tuning, volume etc. ---- */
class SliderList {
  constructor(specs, getv, setv, o = {}) { this.specs = specs; this.get = getv; this.set = setv; this.i = 0; this.o = Object.assign({ x: 'center', y: 40, w: 280, rows: 9, gap: 14 }, o); this.scroll = 0; this.rects = []; this.lastPtr = null; this.drag = false; }
  update(dt) {
    const I = G.game.input, n = this.specs.length;
    if (I.pressed('up') || I.repeat('up', .35, .08)) { this.i = (this.i + n - 1) % n; G.game.audio.sfx('select'); }
    if (I.pressed('down') || I.repeat('down', .35, .08)) { this.i = (this.i + 1) % n; G.game.audio.sfx('select'); }
    const s = this.specs[this.i], st = s.step || (s.max - s.min) / 20;
    const fast = I.down('dive') ? 5 : 1;
    if (I.pressed('left') || I.repeat('left', .35, .06)) this.set(s.key, clamp(+(this.get(s.key) - st * fast).toFixed(4), s.min, s.max));
    if (I.pressed('right') || I.repeat('right', .35, .06)) this.set(s.key, clamp(+(this.get(s.key) + st * fast).toFixed(4), s.min, s.max));
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.o.rows) this.scroll = this.i - this.o.rows + 1;
    const p = I.pointer(), c = I.clicked(), down = I.down('play') && I.lastDevice === 'mouse';
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) {
      this.lastPtr = [p[0], p[1]];
      for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) this.i = k + this.scroll; }
    }
    if (c) for (let k = 0; k < this.rects.length; k++) {
      const q = this.rects[k]; if (q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) {
        this.i = k + this.scroll; const sp = this.specs[this.i], bx = q[0] + q[2] * .5, bw = q[2] * .45;
        if (c[0] >= bx) this.set(sp.key, clamp(+(sp.min + (c[0] - bx) / bw * (sp.max - sp.min)).toFixed(3), sp.min, sp.max));
      }
    }
    void down;
  }
  draw(r) {
    const o = this.o, x = o.x === 'center' ? Math.round((r.W - o.w) / 2) : o.x;
    this.rects = [];
    r.overlay(g => {
      for (let k = 0; k < o.rows; k++) {
        const idx = k + this.scroll, s = this.specs[idx]; if (!s) break;
        const y = o.y + k * o.gap, sel = idx === this.i, v = this.get(s.key);
        this.rects[k] = [x, y - 2, o.w, o.gap - 1];
        E.ui.box(g, x, y - 2, o.w, o.gap - 1, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .85 });
        E.font.text(g, s.label, x + 4, y + 1, sel ? '#fff' : '#d8f4f0', { shadow: '#000', outline: false });
        const bx = x + Math.round(o.w * .5), bw = Math.round(o.w * .33);
        px.rect(g, bx, y + 3, bw, 4, '#06141c'); px.rect(g, bx, y + 3, Math.round(bw * (v - s.min) / (s.max - s.min)), 4, sel ? '#fff6c8' : '#ffd24a');
        E.font.text(g, (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)) + (s.unit && s.unit !== '' ? '' : ''), x + o.w - 4, y + 1, '#fff6c8', { align: 'right', shadow: '#000', outline: false });
      }
      if (this.specs.length > o.rows) E.font.text(g, (this.scroll > 0 ? '↑ ' : '') + (this.scroll + o.rows < this.specs.length ? '↓' : ''), x + o.w + 4, o.y, '#ffd24a', { outline: false });
    });
  }
}
G.SliderList = SliderList;

/* ---- key capture helper for hover/click on arbitrary rects (world buttons) ---- */
G.hit = (p, q) => p && q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3];

/* ---- NodeNav: free-form focus (map nodes, buttons): the d-pad moves to the nearest node that way; hover and click too ---- */
class NodeNav {
  constructor(nodes, o = {}) { this.nodes = nodes; this.i = o.start || 0; this.lastPtr = null; this.t = 0; this.onCancel = o.onCancel || null; }
  cur() { return this.nodes[this.i]; }
  update(dt) {
    this.t += dt; const I = G.game.input, n = this.nodes;
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    for (const [a, dx, dy] of dirs) {
      if (I.pressed(a) || I.repeat(a, .4, .15)) {
        const c = n[this.i]; let best = -1, bs = 1e9;
        for (let k = 0; k < n.length; k++) {
          if (k === this.i || n[k].hidden) continue; const vx = n[k].x - c.x, vy = n[k].y - c.y, along = vx * dx + vy * dy; if (along <= 1) continue;
          const side = Math.abs(vx * dy) + Math.abs(vy * dx), sc = along + side * 1.6; if (sc < bs) { bs = sc; best = k; }
        }
        if (best >= 0) { this.i = best; G.game.audio.sfx('select'); }
      }
    }
    const p = I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { this.lastPtr = [p[0], p[1]]; for (let k = 0; k < n.length; k++) if (!n[k].hidden && G.hit(p, [n[k].x - n[k].w / 2, n[k].y - n[k].h / 2, n[k].w, n[k].h]) && this.i !== k) { this.i = k; G.game.audio.sfx('select'); } }
    const c = I.clicked();
    if (c) for (let k = 0; k < n.length; k++) if (!n[k].hidden && G.hit(c, [n[k].x - n[k].w / 2, n[k].y - n[k].h / 2, n[k].w, n[k].h])) { this.i = k; this.pick(); return true; }
    if (I.pressed('confirm')) { this.pick(); return true; }
    if (I.pressed('cancel') && this.onCancel) { G.game.audio.sfx('cancel'); this.onCancel(); return true; }
    return false;
  }
  pick() { const c = this.nodes[this.i]; if (!c || c.disabled) { G.game.audio.sfx('cancel'); return; } G.game.audio.sfx('confirm'); if (c.onPick) c.onPick(c); }
}
G.NodeNav = NodeNav;
