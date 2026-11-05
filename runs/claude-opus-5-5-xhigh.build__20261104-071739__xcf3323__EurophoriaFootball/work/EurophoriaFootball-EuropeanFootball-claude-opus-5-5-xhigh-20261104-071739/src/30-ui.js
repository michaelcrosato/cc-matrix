/* THE 10-FOOT UI KIT (section 6.23): a screen stack of canvas screens with focusable widgets. D-pad, stick, arrows and
 * WASD move the focus (to the nearest widget that way); confirm / Enter / a click picks; cancel / Esc / a right click
 * goes back; the mouse's hover moves the focus while it moves; L1/R1 (Q/E) turn tabs and pages. Big type, few
 * choices per screen, a prompt footer. A screen: { id, title, widgets, layout(r), draw(g, r), update(dt), onBack,
 * footer: [[action, label]] }. Widgets: { id, kind: 'tile' | 'button' | 'slider' | 'toggle' | 'choice', x, y, w, h,
 * title, text, icon(g, x, y, w, h, focused), onPick, get, set, options, min, max, step, disabled } */
const UIK = EF.UI = {
  stack: [], t: 0, lastPtr: null, hoverOn: false, sound: true,
  set(list) { this.stack = list.slice(); for (const s of this.stack) this.init(s); },
  push(s) { this.init(s); this.stack.push(s); EF.sfx('confirm'); game.input.consumeAll(); return s; },
  pop() { const s = this.stack.pop(); if (s && s.onClose) s.onClose(); EF.sfx('cancel'); game.input.consumeAll(); return s; },
  replace(s) { this.stack.pop(); return this.push(s); },
  top() { return this.stack[this.stack.length - 1] || null; },
  init(s) { s.focus = s.focus || 0; s.t = 0; if (s.widgets && s.widgets[s.focus] && s.widgets[s.focus].disabled) s.focus = Math.max(0, s.widgets.findIndex(w => !w.disabled)); },
  focusId() { const s = this.top(); return s && s.widgets && s.widgets[s.focus] ? s.widgets[s.focus].id : null; },
  focused() { const s = this.top(); return s && s.widgets ? s.widgets[s.focus] : null; },
  setFocus(id) { const s = this.top(); if (!s) return; const i = s.widgets.findIndex(w => w.id === id); if (i >= 0) s.focus = i; },
  /** any player's menu press */
  pressed(a) { return game.players.some(I => I.pressed(a)); },
  repeat(a) { return game.players.some(I => I.repeat ? I.repeat(a, .32, .08) : I.pressed(a)); },
  update(dt) {
    const s = this.top(); if (!s) return false; this.t += dt; s.t += dt;
    if (s.layout) s.layout(game.r || { W: game.W, H: game.H });
    if (s.update && s.update(dt) === true) return true;
    const W = s.widgets || [], I = game.input;
    // the mouse: hover focuses while it moves; a click picks what is under it
    const ptr = I.pointer && I.pointer();
    if (ptr && (!this.lastPtr || Math.abs(ptr[0] - this.lastPtr[0]) + Math.abs(ptr[1] - this.lastPtr[1]) > 2)) { const i = this.hit(W, ptr); if (i >= 0 && i !== s.focus && !W[i].disabled) { s.focus = i; this.moved(); } }
    this.lastPtr = ptr ? ptr.slice() : null;
    const click = I.clicked && I.clicked();
    if (click) { const i = this.hit(W, click); if (i >= 0) { s.focus = i; const w = W[i]; if (w.kind === 'slider') { this.sliderAt(w, click[0]); return true; } this.pick(s, w); return true; } }
    if (!W.length) { if (this.pressed('cancel')) this.back(s); return true; }
    const f = W[s.focus];
    if (this.repeat('up')) this.nav(s, 0, -1); else if (this.repeat('down')) this.nav(s, 0, 1);
    else if (this.repeat('left')) { if (f && (f.kind === 'slider' || f.kind === 'choice' || f.kind === 'toggle')) this.adjust(f, -1); else this.nav(s, -1, 0); }
    else if (this.repeat('right')) { if (f && (f.kind === 'slider' || f.kind === 'choice' || f.kind === 'toggle')) this.adjust(f, 1); else this.nav(s, 1, 0); }
    if (this.pressed('confirm') || this.pressed('start')) { if (f) this.pick(s, f); }
    else if (this.pressed('cancel') || game.input.pressed('mshoot')) this.back(s);
    if (s.tabs && (this.pressed('switch') || this.pressed('skill'))) { const d = this.pressed('switch') ? -1 : 1; s.tabs.set((s.tabs.get() + d + s.tabs.n) % s.tabs.n); EF.sfx('select'); }
    return true;
  },
  hit(W, p) { for (let i = W.length - 1; i >= 0; i--) { const w = W[i]; if (p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h) return i; } return -1; },
  moved() { EF.sfx('select', { vol: .5 }); for (const I of game.players) if (I.lastDevice === 'gamepad' && I.rumble) I.rumble(.1, .03); },
  nav(s, dx, dy) {
    const W = s.widgets, f = W[s.focus]; if (!f) { s.focus = 0; return; }
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2; let best = -1, bs = 1e9;
    W.forEach((w, i) => {
      if (i === s.focus || w.disabled || w.noFocus) return;
      const x = w.x + w.w / 2, y = w.y + w.h / 2, ddx = x - cx, ddy = y - cy, along = ddx * dx + ddy * dy;
      if (along <= 2) return;
      const across = Math.abs(ddx * dy - ddy * dx), sc = along + across * 2.2;
      if (sc < bs) { bs = sc; best = i; }
    });
    if (best < 0 && s.wrap !== false) {   // wrap round in a list
      const order = W.map((w, i) => [i, w]).filter(([, w]) => !w.disabled && !w.noFocus).sort((a, b) => dy ? (a[1].y - b[1].y) || (a[1].x - b[1].x) : (a[1].x - b[1].x) || (a[1].y - b[1].y));
      const k = order.findIndex(([i]) => i === s.focus); if (order.length > 1) best = order[(k + (dx + dy > 0 ? 1 : -1) + order.length) % order.length][0];
    }
    if (best >= 0) { s.focus = best; this.moved(); if (s.onFocus) s.onFocus(W[best]); }
  },
  adjust(w, d) {
    if (w.kind === 'slider') { const v = clamp(+(w.get() + d * (w.step || .05)).toFixed(4), w.min, w.max); w.set(v); EF.sfx('select', { vol: .4 }); }
    else if (w.kind === 'choice') { const o = w.options, i = o.findIndex(x => (Array.isArray(x) ? x[0] : x) === w.get()), n = o[(i + d + o.length) % o.length]; w.set(Array.isArray(n) ? n[0] : n); EF.sfx('select'); }
    else if (w.kind === 'toggle') { w.set(!w.get()); EF.sfx('select'); }
  },
  sliderAt(w, x) { const u = clamp((x - w.x - 8) / Math.max(1, w.w - 16), 0, 1), v = w.min + u * (w.max - w.min); w.set(Math.round(v / (w.step || .05)) * (w.step || .05)); },
  pick(s, w) {
    if (!w || w.disabled) { EF.sfx('cancel'); if (w && w.whyNot) EF.toast(w.whyNot); return; }
    if (w.kind === 'toggle') return this.adjust(w, 1);
    if (w.kind === 'choice') return this.adjust(w, 1);
    if (w.onPick) { EF.sfx('confirm'); game.input.consumeAll(); w.onPick(w); }
  },
  back(s) { if (s.onBack) { EF.sfx('cancel'); game.input.consumeAll(); s.onBack(); } else if (this.stack.length > 1) this.pop(); },
  /* ---- drawing ---- */
  draw(r) {
    const s = this.top(); if (!s) return;
    if (s.layout) s.layout(r);
    r.overlay(g => {
      if (s.draw) s.draw(g, r);
      (s.widgets || []).forEach((w, i) => this.drawWidget(g, r, w, i === s.focus && !w.noFocus, s));
      if (s.after) s.after(g, r);
      if (s.footer) { const list = typeof s.footer === 'function' ? s.footer() : s.footer; const y = r.H - Math.max(5, Math.round(r.H * .035)) - 12; EF.prompts(g, r.W / 2, y, list, { input: game.input }); }
    });
  },
  drawWidget(g, r, w, foc, s) {
    const pulse = foc ? .5 + .5 * Math.sin(this.t * 6) : 0, x = Math.round(w.x), y = Math.round(w.y), W = Math.round(w.w), Hh = Math.round(w.h);
    if (w.kind === 'custom') { w.drawFn(g, x, y, W, Hh, foc); return; }
    const bg = w.disabled ? ['#14182a', '#1a1e30'] : foc ? ['#1c2a5c', '#2a3a74'] : ['#0d1430', '#16224a'];
    if (foc) { px.rect(g, x - 2, y - 2, W + 4, Hh + 4, E.shade('#ffc83a', -.3 + pulse * .3)); }
    E.ui.box(g, x, y, W, Hh, { bg, border: foc ? '#ffc83a' : w.disabled ? '#2a3050' : '#2a3a6a', alpha: w.alpha || .95 });
    const tc = w.disabled ? '#5a6280' : foc ? '#ffffff' : '#e8e0d0';
    if (w.kind === 'tile') {
      const iconH = w.icon ? Math.min(Hh - 30, W - 12) : 0;
      if (w.icon) w.icon(g, x + W / 2, y + 6 + iconH / 2, Math.min(iconH, W - 12) * .82, foc);
      const ts = W > 110 && E.font.width(w.title, { scale: 2 }) < W - 8 ? 2 : 1;
      E.font.text(g, w.title, x + W / 2, y + Hh - (w.text ? 26 : 14) - (ts === 2 ? 4 : 0), tc, { align: 'center', scale: ts, outline: '#0b0814' });
      if (w.text) E.font.text(g, w.text, x + W / 2, y + Hh - 13, w.disabled ? '#4a5270' : '#9aa6c8', { align: 'center', outline: false, wrap: W - 8 });
    } else if (w.kind === 'button') {
      const ts = w.scale || (Hh >= 22 ? 2 : 1);
      E.font.text(g, w.title, w.align === 'left' ? x + 10 : x + W / 2, y + Math.round((Hh - 7 * ts) / 2), tc, { align: w.align === 'left' ? 'left' : 'center', scale: ts, outline: '#0b0814' });
      if (w.right) E.font.text(g, typeof w.right === 'function' ? w.right() : w.right, x + W - 10, y + Math.round((Hh - 7) / 2), '#ffc83a', { align: 'right', outline: false });
    } else if (w.kind === 'slider' || w.kind === 'choice' || w.kind === 'toggle') {
      E.font.text(g, w.title, x + 10, y + Math.round((Hh - 7) / 2), tc, { outline: '#0b0814' });
      const vx = x + Math.round(W * .52), vw = W - Math.round(W * .52) - 10;
      if (w.kind === 'slider') {
        const v = w.get(), u = (v - w.min) / ((w.max - w.min) || 1);
        px.rect(g, vx, y + Hh / 2 - 2, vw, 4, '#0a0a14'); px.rect(g, vx, y + Hh / 2 - 2, Math.round(vw * u), 4, foc ? '#ffc83a' : '#9aa6c8'); px.rect(g, vx + Math.round(vw * u) - 2, y + Hh / 2 - 5, 4, 10, '#ffffff');
        const txt = w.fmt ? w.fmt(v) : String(+v.toFixed(2)); E.font.text(g, txt, vx - 4, y + Math.round((Hh - 7) / 2), '#ffc83a', { align: 'right', outline: false });
        if (w.changed && w.changed()) E.font.text(g, '*', x + W - 6, y + 2, '#ff7a3a', { outline: false });
      } else {
        const v = w.get(), lab = w.kind === 'toggle' ? (v ? 'ON' : 'OFF') : (() => { const o = w.options.find(o2 => (Array.isArray(o2) ? o2[0] : o2) === v); return o ? (Array.isArray(o) ? o[1] : o) : String(v); })();
        E.font.text(g, '←', vx, y + Math.round((Hh - 7) / 2), foc ? '#ffc83a' : '#5a6280', { outline: false });
        E.font.text(g, String(lab).toUpperCase(), vx + vw / 2, y + Math.round((Hh - 7) / 2), '#ffffff', { align: 'center', outline: false });
        E.font.text(g, '→', vx + vw - 5, y + Math.round((Hh - 7) / 2), foc ? '#ffc83a' : '#5a6280', { outline: false });
      }
    }
    if (w.badge) E.font.text(g, w.badge, x + W - 4, y + 4, '#ffc83a', { align: 'right', font: 'tiny', outline: '#000' });
  },
  /* ---- layouts ---- */
  /** a grid of widgets centred in an area: cols, cell size, gap */
  grid(W, x0, y0, w, h, cols, cw, ch, gap = 8) {
    const rows = Math.ceil(W.length / cols), tw = cols * cw + (cols - 1) * gap, th = rows * ch + (rows - 1) * gap, ox = Math.round(x0 + (w - tw) / 2), oy = Math.round(y0 + (h - th) / 2);
    W.forEach((wd, i) => { const c = i % cols, rr = Math.floor(i / cols), inRow = Math.min(cols, W.length - rr * cols), rowOff = (cols - inRow) * (cw + gap) / 2; wd.x = ox + rowOff + c * (cw + gap); wd.y = oy + rr * (ch + gap); wd.w = cw; wd.h = ch; });
  },
  /** a column of rows */
  column(W, x, y, w, h, gap = 4) { W.forEach((wd, i) => { wd.x = x; wd.y = y + i * (h + gap); wd.w = w; wd.h = h; }); },
  /** a standard back-drop panel and a title */
  panel(g, r, title, sub) {
    const my = EF.HUD.margin(r)[1];
    if (title) E.font.title(g, title, r.W / 2, my + 4, { align: 'center', scale: r.W > 360 ? 3 : 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
    if (sub) E.font.text(g, sub, r.W / 2, my + 32, '#c8d0e8', { align: 'center', outline: '#0b0814' });
  }
};
/* a toast: a short message at the top (stickers earned, saved, unlocks) */
EF.toasts = [];
EF.toast = (text, o = {}) => { EF.toasts.push({ text, sub: o.sub || null, t: 0, dur: o.dur || 2.6, icon: o.icon || null }); if (o.sound !== false) EF.sfx(o.sound || 'shimmer'); };
EF.drawToasts = (r, dt) => {
  if (!EF.toasts.length) return;
  const T = EF.toasts[0]; T.t += dt; if (T.t > T.dur) { EF.toasts.shift(); return; }
  r.overlay(g => { const k = Math.min(1, T.t / .25, (T.dur - T.t) / .25), w = Math.min(r.W - 20, Math.max(140, E.font.width(T.text) + 50)), x = Math.round(r.W / 2 - w / 2), y = Math.round(-40 + k * (40 + Math.max(5, r.H * .035) + 36));
    E.ui.box(g, x, y, w, T.sub ? 30 : 20, { bg: ['#2a1a4a', '#3a2a6a'], border: '#ffc83a' }); if (T.icon) T.icon(g, x + 14, y + (T.sub ? 15 : 10)); E.font.text(g, T.text, x + (T.icon ? 28 : w / 2), y + 6, '#ffe08a', { align: T.icon ? 'left' : 'center', outline: false }); if (T.sub) E.font.text(g, T.sub, x + (T.icon ? 28 : w / 2), y + 17, '#c8d0e8', { align: T.icon ? 'left' : 'center', outline: false }); });
};
