/* 30-ui: the 10-foot UI kit. A menu is a set of items laid out each frame (big tiles, buttons, choices, sliders,
 * toggles) with a focus: the d-pad, the stick, arrows and WASD move it to the nearest item that way; ✕ / Enter / Space /
 * a click picks; ○ / Esc / Backspace / a right click goes back; the mouse's hover moves the focus; L1 / R1 (Q / E) turn
 * tabs and pages. Every screen draws a prompt footer in the player's own buttons. */
const UIK = {
  anyDir(dirs = ['up', 'down', 'left', 'right']) { for (const I of game.players) for (const d of dirs) if (I.repeat(d, .32, .09)) return d; return null; },
  any(a) { return game.players.some(I => I.pressed(a)); },
  input() { return game.players.find(I => I.anyPressed && I.anyPressed()) || game.input; },
  ptr: null, ptrMoved: false,
  tick() {
    const p = game.input.pointer ? game.input.pointer() : null;
    this.ptrMoved = !!(p && (!this.ptr || p[0] !== this.ptr[0] || p[1] !== this.ptr[1]));
    this.ptr = p ? [p[0], p[1]] : null;
  }
};
EF.UIK = UIK;
class UIMenu {
  constructor(o) { this.o = o; this.items = []; this.i = o.focus || 0; this.t = 0; this.onBack = o.onBack || null; this.tab = 0; }
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); while (this.items[this.i] && this.items[this.i].disabled && !this.items[this.i].why && this.i < this.items.length - 1) this.i++; }
  get cur() { return this.items[this.i]; }
  /** returns true when it used the input this step */
  update(dt) {
    this.t += dt; UIK.tick();
    const it = this.cur, I = game.input;
    // mouse: hover focuses (only while the pointer moves), a click picks, a right click is back
    const p = UIK.ptr, clicked = I.clicked ? I.clicked() : null;
    if (p && UIK.ptrMoved) { const k = this.hit(p); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; EF.sfx('menuMove'); } }
    if (clicked) { const k = this.hit(clicked); if (k >= 0 && !this.items[k].disabled) { this.i = k; const item = this.items[k]; if (item.kind === 'slider' && item.rect) { const u = clamp((clicked[0] - item.rect[0] - 8) / (item.rect[2] - 16), 0, 1); item.set(item.min + u * (item.max - item.min)); EF.sfx('menuMove'); } else this.pick(item); return true; } }
    if (EF.mouse.pressed[2] && this.onBack) { EF.sfx('menuBack'); this.onBack(); return true; }
    if (EF.mouse.down[0] && p && it && it.kind === 'slider' && it.rect && this.hit(p) === this.i) { const u = clamp((p[0] - it.rect[0] - 8) / (it.rect[2] - 16), 0, 1); it.set(it.min + u * (it.max - it.min)); }
    // tabs and pages
    if (this.o.onTab) { for (const P_ of game.players) { if (P_.pressed('switch')) { this.o.onTab(-1); EF.sfx('menuMove'); return true; } if (P_.pressed('skill')) { this.o.onTab(1); EF.sfx('menuMove'); return true; } } }
    const d = UIK.anyDir();
    if (d) {
      if (it && (d === 'left' || d === 'right') && (it.kind === 'choice' || it.kind === 'slider' || it.kind === 'toggle')) { this.adjust(it, d === 'left' ? -1 : 1); return true; }
      const k = this.nearest(d); if (k >= 0) { this.i = k; EF.sfx('menuMove'); for (const P_ of game.players) P_.rumble && P_.rumble(.1, .03); }
      return true;
    }
    if (UIK.any('confirm') || UIK.any('pass')) { if (it && !it.disabled) this.pick(it); else if (it && it.disabled && it.why) { EF.sfx('miss'); this.o.onDenied && this.o.onDenied(it); } return true; }
    if ((UIK.any('cancel') || UIK.any('lob')) && this.onBack) { EF.sfx('menuBack'); this.onBack(); return true; }
    if (UIK.any('shoot') && it && it.onAlt) { it.onAlt(); EF.sfx('menuMove'); return true; }
    return false;
  }
  adjust(it, d) {
    if (it.kind === 'choice') { const opts = it.options, k = opts.findIndex(o => o[0] === it.get()); it.set(opts[(k + d + opts.length) % opts.length][0]); }
    else if (it.kind === 'toggle') it.set(!it.get());
    else if (it.kind === 'slider') { const st = it.step || (it.max - it.min) / 20; it.set(clamp(+(it.get() + d * st).toFixed(4), it.min, it.max)); }
    EF.sfx('menuMove');
  }
  pick(it) {
    if (it.kind === 'choice') return this.adjust(it, 1);
    if (it.kind === 'toggle') return this.adjust(it, 1);
    if (it.kind === 'slider') return;
    EF.sfx('menuPick'); for (const P_ of game.players) P_.consumeAll && P_.consumeAll();
    it.onPick && it.onPick(it);
  }
  hit(p) { for (let k = 0; k < this.items.length; k++) { const r = this.items[k].rect; if (r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]) return k; } return -1; }
  nearest(d) {
    const c = this.cur && this.cur.rect; if (!c) return this.items.length ? 0 : -1;
    const cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2, dx = { left: -1, right: 1, up: 0, down: 0 }[d], dy = { up: -1, down: 1, left: 0, right: 0 }[d];
    let best = -1, bs = 1e9;
    this.items.forEach((it, k) => {
      if (k === this.i || !it.rect || it.disabled && !it.why) return;
      const r = it.rect, x = r[0] + r[2] / 2, y = r[1] + r[3] / 2, vx = x - cx, vy = y - cy, along = vx * dx + vy * dy;
      if (along <= 2) return;
      const across = Math.abs(vx * dy) + Math.abs(vy * dx), s = along + across * 2.2;
      if (s < bs) { bs = s; best = k; }
    });
    if (best < 0 && this.o.wrap !== false) {   // wrap round in a list
      const order = this.items.map((it, k) => ({ k, r: it.rect })).filter(e => e.r && !(this.items[e.k].disabled && !this.items[e.k].why));
      if (dy && order.length) { order.sort((a, b) => a.r[1] - b.r[1] || a.r[0] - b.r[0]); best = dy > 0 ? order[0].k : order[order.length - 1].k; if (best === this.i) best = -1; }
    }
    return best;
  }
  /** draws every item (the layout gave each its rect) */
  draw(g, o = {}) {
    this.items.forEach((it, k) => {
      const [x, y, w, h] = it.rect || [0, 0, 0, 0]; if (!w) return;
      const f = k === this.i, pulse = f ? (Math.sin(this.t * 5) * .5 + .5) : 0;
      if (it.draw) return it.draw(g, x, y, w, h, f, pulse, it);
      E.ui.box(g, x, y, w, h, { bg: f ? ['#26326a', '#1a2450'] : ['#141c3a', '#0d1430'], border: f ? (pulse > .5 ? '#ffe08a' : '#ffc83a') : '#2a3a6a', alpha: it.disabled ? .55 : .94 });
      if (f) { px.rect(g, x - 2, y + 2, 2, h - 4, '#ffc83a'); px.rect(g, x + w, y + 2, 2, h - 4, '#ffc83a'); }
      const sc = it.scale || (h >= 30 ? 2 : 1), col = it.disabled ? '#7a84a8' : f ? '#ffffff' : '#dfe4f8';
      const lx = it.align === 'left' ? x + 10 : x + w / 2;
      let ty = y + Math.round((h - 7 * sc - (it.sub ? 10 : 0)) / 2);
      if (it.icon) it.icon(g, x + 8, y + h / 2, f);
      if (it.kind === 'choice' || it.kind === 'toggle' || it.kind === 'slider') {
        E.font.text(g, it.label, x + 10, y + Math.round((h - 7) / 2), col, { outline: false, shadow: '#000' });
        const v = it.get();
        if (it.kind === 'slider') { const bx = x + w * .5, bw = w * .5 - 14, u = (v - it.min) / (it.max - it.min); px.rect(g, Math.round(bx), y + Math.round(h / 2) - 2, Math.round(bw), 4, '#0a0e20'); px.rect(g, Math.round(bx), y + Math.round(h / 2) - 2, Math.round(bw * u), 4, '#ffc83a'); px.rect(g, Math.round(bx + bw * u) - 2, y + Math.round(h / 2) - 5, 4, 10, '#ffffff'); E.font.text(g, it.fmt ? it.fmt(v) : String(+v.toFixed(2)), Math.round(bx - 6), y + Math.round((h - 7) / 2), '#ffe08a', { align: 'right', outline: false }); if (it.changed && it.changed()) E.font.text(g, '*', x + w - 8, y + 3, '#ff7ad0', { outline: false }); }
        else { const lab = it.kind === 'toggle' ? (v ? 'ON' : 'OFF') : ((it.options.find(o2 => o2[0] === v) || [, String(v)])[1]); E.font.text(g, (f ? '< ' : '') + lab + (f ? ' >' : ''), x + w - 10, y + Math.round((h - 7) / 2), '#ffe08a', { align: 'right', outline: false }); }
        return;
      }
      E.font.text(g, it.label, lx, ty, col, { align: it.align === 'left' ? 'left' : 'center', scale: sc, outline: false, shadow: '#000' });
      if (it.sub) E.font.text(g, it.sub, lx, ty + 7 * sc + 4, it.disabled ? '#6a7090' : '#ffc83a', { align: it.align === 'left' ? 'left' : 'center', outline: false, shadow: '#000' });
    });
  }
}
EF.UIMenu = UIMenu;
/** the footer: menu prompts in the player's own buttons */
EF.footer = (g, r, list, o = {}) => {
  const y = r.H - Math.round(r.H * .04) - 12;
  px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 6, r.W, 24, '#05070f'));
  EF.promptRow(g, r.W / 2, y, list, Object.assign({ scale: 1 }, o));
};
EF.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#141c3a', '#0d1430'], border: '#ffc83a', alpha: .94 }, o));
EF.heading = (g, text, x, y, scale = 3, o = {}) => E.font.title(g, text, Math.round(x), Math.round(y), Object.assign({ align: 'center', scale, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }, o));
EF.textBlock = (g, text, x, y, w, o = {}) => E.font.text(g, text, Math.round(x), Math.round(y), o.color || '#e8ecff', Object.assign({ wrap: w, outline: false, shadow: '#000', lineGap: 3 }, o));
/** a column of rects centred on the screen: n items of h with a gap */
EF.layoutColumn = (r, n, o = {}) => {
  const w = Math.min(o.w || 260, r.W - 40), h = o.h || 30, gap = o.gap || 8, total = n * h + (n - 1) * gap, y0 = o.y != null ? o.y : Math.round((r.H - total) / 2 + (o.dy || 0)), x = Math.round(o.x != null ? o.x : r.W / 2 - w / 2);
  return Array.from({ length: n }, (_, i) => [x, y0 + i * (h + gap), w, h]);
};
EF.layoutGrid = (r, n, cols, o = {}) => {
  const w = o.w || 120, h = o.h || 60, gx = o.gap || 10, gy = o.gapY || gx, rows = Math.ceil(n / cols), tw = cols * w + (cols - 1) * gx, th = rows * h + (rows - 1) * gy;
  const x0 = Math.round(o.x != null ? o.x : r.W / 2 - tw / 2), y0 = Math.round(o.y != null ? o.y : (r.H - th) / 2);
  return Array.from({ length: n }, (_, i) => [x0 + (i % cols) * (w + gx), y0 + Math.floor(i / cols) * (h + gy), w, h]);
};
