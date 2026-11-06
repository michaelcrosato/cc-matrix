// Immediate-mode UI on ctx.hud. Widgets register rectangles each frame; direction input moves focus to the nearest
// rectangle that way; mouse hover moves focus when the pointer moved; click activates. Records what it drew for tests.
export class UI {
  constructor(game) {
    this.game = game; this.real = null; this.virtual = false; this.ox = 0; this.oy = 0; this.vw = 427; this.vh = 240; this.proxy = null; this.rects = []; this.prev = []; this.focus = null; this.drawnText = []; this.activated = null; this.ptr = { x: -1, y: -1, moved: false, px: -1, py: -1 }; this.hoverEnabled = true; this.scroll = {};
    this.frame = 0; this.layout = []; this.focusOrder = [];
  }
  begin(hud, input, nav) {
    this.real = hud; this.virtual = false; this.proxy = this.makeProxy(hud); this.frame++;
    this.prev = this.rects; this.rects = []; this.drawnText = []; this.activated = null; this.nav = nav;
    const p = input.pointer; const nx = p.over ? ((p.x + 1) / 2) * hud.width : -1, ny = p.over ? (1 - (p.y + 1) / 2) * hud.height : -1;
    this.ptr.moved = Math.hypot(nx - this.ptr.px, ny - this.ptr.py) > 2; this.ptr.px = nx; this.ptr.py = ny; this.ptr.x = nx; this.ptr.y = ny;
    this.click = nav.click; this.rclick = nav.rclick;
    // focus movement
    if (this.focus != null && (nav.up || nav.down || nav.left || nav.right)) this.moveFocus(nav);
    if (this.ptr.moved && this.hoverEnabled) { const r = this.prev.slice().reverse().find((q) => { const qx = nx - (q.virtual ? this.ox : 0), qy = ny - (q.virtual ? this.oy : 0); return q.focusable && qx >= q.x && qx < q.x + q.w && qy >= q.y && qy < q.y + q.h; }); if (r) this.focus = r.id; }
  }
  get hud() { return this.virtual ? this.proxy : this.real; }
  get hudW() { return this.virtual ? this.vw : this.real.width; }
  get hudH() { return this.virtual ? this.vh : this.real.height; }
  makeProxy(hud) {
    const ui = this;
    return {
      get width() { return ui.vw; }, get height() { return ui.vh; }, get canvas() { return hud.canvas; },
      measure: (t, s) => hud.measure(t, s),
      rect: (x, y, w, h, c, anchor) => { if (!anchor && x <= 0 && y <= 0 && w >= ui.vw && h >= ui.vh) hud.rect(0, 0, hud.width, hud.height, c); else hud.rect(anchor ? x : x + ui.ox, anchor ? y : y + ui.oy, w, h, c, anchor); },
      text: (x, y, s, o = {}) => hud.text(o.anchor ? x : x + ui.ox, o.anchor ? y : y + ui.oy, s, o),
      sprite: (x, y, rows, colors, o = {}) => hud.sprite(o.anchor ? x : x + ui.ox, o.anchor ? y : y + ui.oy, rows, colors, o),
      clear: () => {},
    };
  }
  /** Full-screen screens are laid out in 427 x 240 art pixels and centred, whatever the window is. */
  setVirtual(on) { this.virtual = on; if (on) { const W = this.real.width, H = this.real.height; this.vw = Math.min(W, 427); this.vh = Math.min(H, 240); this.ox = Math.floor((W - this.vw) / 2); this.oy = Math.floor((H - this.vh) / 2); } else { this.ox = 0; this.oy = 0; } }
  moveFocus(nav) {
    const cur = this.prev.find((q) => q.id === this.focus);
    if (!cur) { const f = this.prev.find((q) => q.focusable); if (f) this.focus = f.id; return; }
    const dir = nav.up ? [0, -1] : nav.down ? [0, 1] : nav.left ? [-1, 0] : [1, 0];
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = null, bs = 1e9;
    for (const q of this.prev) {
      if (!q.focusable || q.id === cur.id) continue;
      const qx = q.x + q.w / 2, qy = q.y + q.h / 2; const dx = qx - cx, dy = qy - cy;
      const along = dx * dir[0] + dy * dir[1]; if (along <= 0.5) continue;
      const across = Math.abs(dx * dir[1] + dy * dir[0]);
      const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = q; }
    }
    if (best) { this.focus = best.id; this.game.audio && this.game.audio.sfx('ui_move'); }
  }
  /** Register a focusable rect and return {focused, clicked, rclicked}. */
  zone(id, x, y, w, h, o = {}) {
    this.rects.push({ id, x, y, w, h, focusable: o.focusable !== false, virtual: this.virtual });
    if (this.focus == null && o.focusable !== false) this.focus = id;
    const focused = this.focus === id;
    const px = this.ptr.x - (this.virtual ? this.ox : 0), py = this.ptr.y - (this.virtual ? this.oy : 0);
    const inside = px >= x && px < x + w && py >= y && py < y + h;
    const clicked = (focused && this.nav.ok) || (inside && this.click);
    const rclicked = (focused && this.nav.alt1) || (inside && this.rclick);
    if (clicked) { this.focus = id; this.activated = id; }
    return { focused, clicked, rclicked, inside };
  }
  text(x, y, str, o = {}) {
    const hud = this.hud; const s = String(str);
    hud.text(x, y, s, o);
    const m = hud.measure(s, o.scale || 1);
    let rx = x, ry = y;
    if (o.anchor) { const A = o.anchor; rx = A.endsWith('right') ? this.hudW - x - m.width : A === 'center' || A === 'top' || A === 'bottom' ? (this.hudW - m.width) / 2 + x : x; ry = A.startsWith('bottom') ? this.hudH - y - m.height : A === 'center' || A === 'left' || A === 'right' ? (this.hudH - m.height) / 2 + y : y; }
    this.drawnText.push({ text: s, x: rx + (this.virtual && !o.anchor ? this.ox : 0), y: ry + (this.virtual && !o.anchor ? this.oy : 0), w: m.width, h: m.height });
    return m.width;
  }
  center(y, str, o = {}) { const m = this.hud.measure(String(str), o.scale || 1); const x = Math.round((this.hudW - m.width) / 2); this.text(x, y, str, o); return x; }
  wrap(str, width, scale = 1) {
    const words = String(str).split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (this.hud.measure(t, scale).width > width && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  para(x, y, str, width, o = {}) { const lines = this.wrap(str, width, o.scale || 1); const lh = (o.lh || 9) * (o.scale || 1); lines.forEach((l, i) => this.text(x, y + i * lh, l, o)); return lines.length * lh; }
  panel(x, y, w, h, o = {}) { const hud = this.hud; hud.rect(x - 1, y - 1, w + 2, h + 2, o.border || 'slate'); hud.rect(x, y, w, h, o.fill || 'night'); }
  button(id, x, y, w, h, label, o = {}) {
    const z = this.zone(id, x, y, w, h, o); const hud = this.hud;
    hud.rect(x - 1, y - 1, w + 2, h + 2, z.focused ? (o.hot || 'sand') : 'slate'); hud.rect(x, y, w, h, z.focused ? (o.fillHot || 'plum') : (o.fill || 'night'));
    const m = hud.measure(label, o.scale || 1);
    this.text(x + Math.round((w - m.width) / 2), y + Math.round((h - m.height) / 2) + 0, label, { color: o.disabled ? 'slate' : z.focused ? 'white' : (o.color || 'mist'), scale: o.scale || 1 });
    return z;
  }
  bar(x, y, w, h, frac, color, back = 'ink') { const hud = this.hud; hud.rect(x, y, w, h, back); const f = Math.max(0, Math.min(1, frac)); if (f > 0) hud.rect(x, y, Math.max(1, Math.round(w * f)), h, color); }
  prompts(items, y = null, x0 = null) {
    // items: [['ok','CONFIRM'], ...] laid out along the bottom
    const hud = this.hud; const g = this.game.glyphs; y = y ?? this.hudH - 18;
    let total = 0; for (const [a, l] of items) total += g.width(hud, a) + hud.measure(l).width + 10;
    let x = x0 ?? Math.round((this.hudW - total) / 2);
    for (const [a, l] of items) { x += g.draw(hud, x, y - 1, a); this.text(x + 2, y + 1, l, { color: 'mist' }); x += hud.measure(l).width + 10; }
  }
  shadeScreen(color = 'ink') { this.hud.rect(0, 0, this.hudW, this.hudH, color); }
  endFrame() { if (this.resetNext) { this.focus = null; this.resetNext = false; return; } if (this.focus != null && !this.rects.some((r) => r.id === this.focus)) { const f = this.rects.find((r) => r.focusable); this.focus = f ? f.id : null; } }
  setFocus(id) { if (id == null) this.resetNext = true; else { this.focus = id; this.resetNext = false; } }
}
