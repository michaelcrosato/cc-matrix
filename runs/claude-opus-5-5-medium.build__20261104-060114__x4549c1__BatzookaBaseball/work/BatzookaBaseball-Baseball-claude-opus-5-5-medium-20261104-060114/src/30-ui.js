/* 10-FOOT UI: big cards (never tables), at most about 7 items a screen, an obvious focus (10% bigger, a bright border, a
 * gentle bob), a legend of glyph icons at the bottom, and every screen driven the same way by the D-pad or stick, the
 * keyboard (arrows/WASD, Enter/Space, Escape) and the mouse (hover moves the focus, a click selects). */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ w: 200, h: 22, gap: 6, cols: 1, align: 'center' }, o); this.rects = []; this.t = 0; }
  get cur() { return this.items[this.i]; }
  visible() { return this.items.filter(it => !it.hidden); }
  update(I, dt) {
    this.t += dt; const vis = this.items.map((it, k) => [it, k]).filter(([it]) => !it.hidden); if (!vis.length) return;
    if (this.items[this.i] && this.items[this.i].hidden) this.i = vis[0][1];
    const pos = vis.findIndex(([, k]) => k === this.i), cols = this.o.cols;
    const mv = (d) => { let p = clamp(pos + d, 0, vis.length - 1); this.i = vis[p][1]; sfx('menu'); };
    if (I.repeat('up', .3, .1)) mv(-cols); if (I.repeat('down', .3, .1)) mv(cols);
    if (cols > 1) { if (I.repeat('left', .3, .1)) mv(-1); if (I.repeat('right', .3, .1)) mv(1); }
    const it = this.items[this.i];
    if (it && it.adjust) { if (I.repeat('left', .3, .12)) { it.adjust(-1); sfx('menu'); } if (I.repeat('right', .3, .12)) { it.adjust(1); sfx('menu'); } }
    // the mouse: hover focuses, click selects
    const pt = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
    if (pt && I.lastDevice === 'mouse') for (const r of this.rects) if (pt[0] >= r.x && pt[0] < r.x + r.w && pt[1] >= r.y && pt[1] < r.y + r.h && this.i !== r.k) { this.i = r.k; }
    if (cl && !BZ.touchOnly) for (const r of this.rects) if (cl[0] >= r.x && cl[0] < r.x + r.w && cl[1] >= r.y && cl[1] < r.y + r.h) {
      this.i = r.k; const it2 = this.items[r.k];
      if (it2.adjust && r.arrow) { it2.adjust(r.arrow); sfx('menu'); return; }
      return this.pick(I);
    }
    if (I.pressed('confirm') || I.pressed('start')) { I.consume('confirm'); I.consume('start'); return this.pick(I); }
    if (I.pressed('cancel') && this.o.onBack) { I.consume('cancel'); sfx('back'); this.o.onBack(); return 'back'; }
  }
  pick(I) { const it = this.items[this.i]; if (!it || it.disabled) { sfx('back'); return; } sfx('ok'); if (it.act) it.act(I); return 'pick'; }
  draw(g, x, y) {
    const o = this.o, vis = this.items.map((it, k) => [it, k]).filter(([it]) => !it.hidden); this.rects = [];
    vis.forEach(([it, k], n) => {
      const col = n % o.cols, row = Math.floor(n / o.cols), foc = k === this.i, w = o.w, h = o.h;
      let bx = (o.align === 'center' ? x - (o.cols * w + (o.cols - 1) * o.gap) / 2 : x) + col * (w + o.gap), by = y + row * (h + o.gap);
      const s = foc ? 1.06 : 1, dw = w * s, dh = h * s, dx = bx - (dw - w) / 2, dy = by - (dh - h) / 2 + (foc ? Math.sin(this.t * 4) * 1 : 0);
      E.ui.box(g, dx, dy, dw, dh, { bg: it.disabled ? ['#2a2a34', '#1a1a22'] : foc ? ['#4a3a7a', '#2a1c4a'] : ['#24263a', '#14151f'], border: foc ? '#ffe680' : '#6a6c88', alpha: .95 });
      if (foc) px.rect(g, dx + 2, dy + 2, 3, dh - 4, '#ffe680');
      const tc = it.disabled ? '#6a6c80' : foc ? '#ffffff' : '#d8d8e8';
      if (it.adjust) {
        E.font.text(g, it.label, dx + 10, dy + dh / 2 - 3.5, tc, { shadow: '#000', outline: false });
        const v = typeof it.value === 'function' ? it.value() : it.value || '';
        E.font.text(g, '←  ' + v + '  →', dx + dw - 10, dy + dh / 2 - 3.5, foc ? '#ffe680' : '#a8a8c8', { align: 'right', shadow: '#000', outline: false });
        this.rects.push({ x: dx + dw - 26 - E.font.width(v), y: dy, w: 14, h: dh, k, arrow: -1 }, { x: dx + dw - 16, y: dy, w: 16, h: dh, k, arrow: 1 });
      } else {
        const sc = o.big ? 2 : 1;
        E.font.text(g, it.label, o.textAlign === 'left' ? dx + 10 : dx + dw / 2, dy + (it.sub && !o.noSub ? 4 : dh / 2 - 3.5 * sc), tc, { align: o.textAlign === 'left' ? 'left' : 'center', scale: sc, shadow: '#000', outline: false });
        if (it.sub && !o.noSub) E.font.text(g, it.sub, o.textAlign === 'left' ? dx + 10 : dx + dw / 2, dy + dh - 11, it.disabled ? '#5a5c70' : '#a8a8c8', { align: o.textAlign === 'left' ? 'left' : 'center', shadow: '#000', outline: false });
      }
      this.rects.push({ x: dx, y: dy, w: dw, h: dh, k });
    });
  }
}
/* the legend at the bottom of a screen: glyph icons for what the buttons do here */
function legend(g, W, H, items) { promptRow(g, game.input, items, W / 2, H - SAFE - 12, 'center'); }
function panel(g, x, y, w, h, o = {}) { E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1e2032', '#0e0f18'], border: '#8a8ca8', alpha: .94 }, o)); }
function title(g, s, x, y, sc = 3) { E.font.title(g, s, x, y, { scale: sc, colors: GOLD, align: 'center', depth: 2 }); }
function para(g, s, x, y, w, c = '#e8e8f0', o = {}) { const lines = wrapText(s, w, o); lines.forEach((l, i) => E.font.text(g, l, x, y + i * (o.scale ? 9 * o.scale : 10), c, Object.assign({ shadow: '#000', outline: false }, o))); return lines.length; }
/* a backdrop for menu screens: the title's park, slowly panning, under a dark veil */
const MENUBG = { t: 0 };
function menuBackdrop(r, dim = .55) {
  MENUBG.t += 1 / 60;
  const kit = parkKit(MENUBG.park || 'kernel');
  if (game.view !== E.VIEWS.broadcast && game.baseView !== E.VIEWS.broadcast) game.setView('broadcast');
  if (Math.abs((game.zoom || 1) - .8) > .01) game.setZoom(.8);
  game.focus(HX + Math.sin(MENUBG.t * .05) * 300, HY - 500 + Math.cos(MENUBG.t * .04) * 200, 0);
  LIGHTS.enabled = !!kit.park.night; if (kit.park.night) { LIGHTS.ambient = kit.park.ambient; for (const p of kit.props) if (p.kind === 'tower') LIGHTS.add(p.x, p.y, p.h, 900, .9, { color: '#e8f0ff' }); }
  const keep = M; M = null; try { drawBroadcast(r, kit); } finally { M = keep; }
  r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0a16')));
}
