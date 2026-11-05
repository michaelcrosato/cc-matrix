/* OLYMPIYIKES! — 10-foot widgets: lists, grids, tabs, panels, banners, toasts, stamps; the global overlays. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, P = O.PAL;

const hit = (p, R) => p && R && p[0] >= R[0] && p[0] < R[0] + R[2] && p[1] >= R[1] && p[1] < R[1] + R[3];
O.hit = hit;
O.text = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c || '#fff', Object.assign({ outline: false, shadow: '#000' }, o));
O.title = (g, s, x, y, scale, o = {}) => E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale, colors: ['#fff6d0', '#ffd060', '#f08a2a'], align: 'center', outline: '#7a1a10', depth: 2, depthColor: '#4a0a08' }, o));
O.panel = (g, x, y, w, h, o = {}) => { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#121840', '#0a0e26'], border: P.gold }, o)); };
O.wrap = (s, w, scale = 1) => E.font.wrap(s, w, { scale });

/** pointer helpers: hover moves focus only after the mouse moved */
let lastPtrT = -1;
O.hover = (inp) => { inp = inp || game.input; if (inp.lastDevice !== 'mouse' || !inp.mouse) return null; const t = inp.mouse.t; const moved = t !== lastPtrT; lastPtrT = t; return moved ? inp.pointer() : null; };

/* ---- a vertical list (≤ 7 items), loud focus ---- */
class Menu10 {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.rects = []; this.t = 0; }
  get item() { return this.items[this.i]; }
  update(dt, inp) {
    inp = inp || game.input; this.t += dt;
    const n = this.items.length; if (!n) return null;
    const step = d => { let k = this.i; for (let j = 0; j < n; j++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; game.audio.sfx('select', { vol: .5 }); } };
    if (inp.repeat('down', .3, .1)) step(1);
    if (inp.repeat('up', .3, .1)) step(-1);
    const it = this.items[this.i];
    if (it && it.options && (inp.repeat('left', .3, .12) || inp.repeat('right', .3, .12))) { const d = inp.down('left') ? -1 : 1; it.change(d); game.audio.sfx('select', { vol: .5 }); }
    const hp = O.hover(inp); if (hp) this.rects.forEach((R, k) => { if (hit(hp, R) && !this.items[k].disabled && k !== this.i) { this.i = k; game.audio.sfx('select', { vol: .35 }); } });
    const c = inp.clicked && inp.clicked();
    if (c) { const k = this.rects.findIndex(R => hit(c, R)); if (k >= 0 && !this.items[k].disabled) { this.i = k; if (this.items[k].options) { this.items[k].change(1); game.audio.sfx('select'); return null; } game.audio.sfx('confirm'); return k; } }
    if (inp.pressed('confirm')) { if (it && !it.disabled) { if (it.options) { it.change(1); game.audio.sfx('select'); return null; } game.audio.sfx('confirm'); return this.i; } }
    if (inp.pressed('cancel')) { game.audio.sfx('cancel'); return 'cancel'; }
    return null;
  }
  draw(g, x, y, w, o = {}) {
    const s = o.scale || 2, rh = o.rowH || (s === 2 ? 22 : 13); this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * rh, f = k === this.i, R = [x, yy, w, rh - 2]; this.rects.push(R);
      if (f) { const pulse = Math.sin(this.t * 6) * .5 + .5; px.rect(g, x - 1, yy - 1, w + 2, rh, '#ffd86a'); px.rect(g, x, yy, w, rh - 2, pulse > .5 ? '#3a2a10' : '#33260e'); px.rect(g, x, yy, 4, rh - 2, P.gold); }
      const col = it.disabled ? '#5a6080' : f ? '#ffe9a0' : '#e8ecff', lab = it.label + (it.options ? ':' : '');
      O.text(g, (f ? '▸ ' : '  ') + lab, x + 8, yy + Math.round((rh - 2 - 7 * s) / 2), col, { scale: s });
      if (it.options) { const v = '‹ ' + it.valueLabel() + ' ›'; O.text(g, v, x + w - 8, yy + Math.round((rh - 2 - 7 * s) / 2), f ? '#ffffff' : '#aab4e0', { scale: s, align: 'right' }); }
    });
    return rh * this.items.length;
  }
}
O.Menu10 = Menu10;
/** an option row: { label, options: [[v, label]...], get, set } */
O.optionItem = (label, options, get, set, desc) => ({ label, options, desc, valueLabel() { const v = get(); const o = options.find(p => p[0] === v); return o ? o[1] : String(v); },
  change(d) { const k = options.findIndex(p => p[0] === get()); set(options[(k + d + options.length) % options.length][0]); } });

/* ---- a tile grid ---- */
class Grid10 {
  constructor(n, cols, o = {}) { this.n = n; this.cols = cols; this.i = o.i || 0; this.rects = []; this.t = 0; }
  update(dt, inp) {
    inp = inp || game.input; this.t += dt; const c = this.cols, n = this.n, was = this.i;
    if (inp.repeat('right', .3, .1)) this.i = (this.i + 1) % n;
    if (inp.repeat('left', .3, .1)) this.i = (this.i - 1 + n) % n;
    if (inp.repeat('down', .3, .1)) this.i = Math.min(n - 1, this.i + c) === this.i ? this.i % c : Math.min(n - 1, this.i + c);
    if (inp.repeat('up', .3, .1)) this.i = this.i - c >= 0 ? this.i - c : this.i;
    const hp = O.hover(inp); if (hp) this.rects.forEach((R, k) => { if (hit(hp, R)) this.i = k; });
    if (this.i !== was) game.audio.sfx('select', { vol: .45 });
    const cl = inp.clicked && inp.clicked(); if (cl) { const k = this.rects.findIndex(R => hit(cl, R)); if (k >= 0) { this.i = k; game.audio.sfx('confirm'); return k; } }
    if (inp.pressed('confirm')) { game.audio.sfx('confirm'); return this.i; }
    if (inp.pressed('cancel')) { game.audio.sfx('cancel'); return 'cancel'; }
    return null;
  }
}
O.Grid10 = Grid10;

/* ---- tabs (L1/R1, Q/E, ←/→ where the screen says, or a click) ---- */
O.tabs = (g, x, y, names, i, rects) => {
  let xx = x; rects.length = 0;
  names.forEach((nm, k) => { const w = E.font.width(nm) + 12; const f = k === i; px.rect(g, xx, y, w, 13, f ? P.gold : '#1c2350'); O.text(g, nm, xx + w / 2, y + 3, f ? '#1a1206' : '#c8d0f0', { align: 'center', shadow: false }); rects.push([xx, y, w, 13]); xx += w + 3; });
  return xx - x;
};
O.tabInput = (inp, i, n, rects, arrows) => {
  if (inp.pressed('tabR') || (arrows && inp.repeat('right', .3, .15))) { game.audio.sfx('select', { vol: .5 }); return (i + 1) % n; }
  if (inp.pressed('tabL') || (arrows && inp.repeat('left', .3, .15))) { game.audio.sfx('select', { vol: .5 }); return (i - 1 + n) % n; }
  const c = inp.clicked && inp.clicked(); if (c) { const k = rects.findIndex(R => hit(c, R)); if (k >= 0) { game.audio.sfx('select'); return k; } }
  return i;
};
O.pageDots = (g, cx, y, n, i) => { for (let k = 0; k < n; k++) px.disc(g, cx + (k - (n - 1) / 2) * 10, y, k === i ? 3 : 2, k === i ? P.gold : '#5a6290'); };

/* ---- global overlays: toasts, big stamps, banners, the attract badge ---- */
const toasts = [], stamps = [], banners = [];
O.toast = (title, text, o = {}) => { toasts.push({ title, text, t: 0, life: o.life || 3.2, icon: o.icon || null, color: o.color || P.gold }); game.audio.sfx('coin', { vol: .4 }); };
O.stamp = (word, o = {}) => { stamps.push({ word, t: 0, life: o.life || 1.6, color: o.color || '#ff5a3a', y: o.y || .38 }); };
O.banner = (word, o = {}) => { banners.push({ word, t: 0, life: o.life || 1.6, colors: o.colors, y: o.y || .3, sub: o.sub, scale: o.scale || 3 }); };
O.clearOverlays = () => { toasts.length = 0; stamps.length = 0; banners.length = 0; };
O.Overlays = {
  update(dt) {
    const rd = game.timeScale > 0 ? dt / game.timeScale : dt;
    for (const L of [toasts, stamps, banners]) { for (const o of L) o.t += rd || 1 / 120; for (let i = L.length - 1; i >= 0; i--) if (L[i].t > L[i].life) L.splice(i, 1); }
    if (O.Comms) O.Comms.update(rd || 1 / 120);
    if (O.CrowdAudio) O.CrowdAudio.update(rd || 1 / 120, !!(O.Crowd && O.Crowd.on));
    if (O.Crowd) O.Crowd.update(rd || 1 / 120);
  },
  draw(g, r) {
    if (O.Comms) O.Comms.draw(g, r);
    for (const b of banners) {
      const k = Math.min(1, b.t / .18), sc = Math.max(1, Math.round(b.scale * (k < 1 ? 1.4 - .4 * k : 1)));
      O.title(g, b.word, r.W / 2, r.H * b.y, sc, b.colors ? { colors: b.colors } : {});
      if (b.sub) O.text(g, b.sub, r.W / 2, r.H * b.y + sc * 9 + 4, '#ffffff', { align: 'center', scale: 2 });
    }
    for (const s of stamps) {
      const k = Math.min(1, s.t / .15), still = game.reduceMotion, sc = still ? 4 : Math.max(3, Math.round(6 - 2 * k)), rot = still ? 0 : Math.sin(s.t * 30) * (1 - k) * 3;
      const y = r.H * s.y + rot;
      O.title(g, s.word, r.W / 2, y, sc, { colors: ['#ffffff', '#ffe060', s.color], outline: '#3a0606', depth: 3 });
    }
    let ty = 30;
    for (const t of toasts) {
      const w = Math.max(E.font.width(t.title) + 40, E.font.width(t.text || '') + 40, 150), x = r.W - w - 14 - Math.max(0, (0.25 - t.t) * 400);
      O.panel(g, x, ty, w, t.text ? 30 : 20, { border: t.color });
      if (O.Art) O.Art.laurel(g, x + 12, ty + 10, t.color);
      O.text(g, t.title, x + 24, ty + 4, t.color);
      if (t.text) O.text(g, t.text, x + 24, ty + 16, '#e8ecff');
      ty += 36;
    }
    if (O.Attract && O.Attract.on) O.Attract.drawBadge(g, r);
  }
};
})();
