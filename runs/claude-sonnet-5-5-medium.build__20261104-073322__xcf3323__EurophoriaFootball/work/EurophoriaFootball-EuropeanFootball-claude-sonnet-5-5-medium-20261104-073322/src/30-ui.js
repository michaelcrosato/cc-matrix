/* ============ 30-ui: the 10-foot UI kit: menus that d-pad, stick, keys and the mouse all drive ============ */
EF.lastInput = 0; EF.lastPointer = [0, 0];
if (typeof addEventListener === 'function') for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { EF.lastInput = performance.now(); }, true);
EF.pollPads = () => { try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p) { if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) EF.lastInput = performance.now(); } } catch (e) { /* none */ } };
const UI = EF.UI = {};
UI.anyP = a => game.players.some(p => p.pressed(a));
UI.anyRep = a => game.players.some(p => p.repeat(a, .32, .09));
UI.eatAll = () => game.players.forEach(p => p.consumeAll && p.consumeAll());
UI.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#121a3a', '#0a1028'], border: '#5a6a9a', alpha: .94 }, o));
UI.footer = (g, r, items, player = 0) => {
  const h = 16; px.rect(g, 0, r.H - h - 2, r.W, h + 2, '#05060f'); let wsum = 0; for (const [a, l] of items) wsum += EF.promptWidth(a, l, { player }) + 14; let x = Math.round(r.W / 2 - wsum / 2);
  for (const [a, l] of items) x += EF.prompt(g, x, r.H - h, a, l, { player }) + 14;
};
UI.stadiumBg = (r, t) => {
  r.sky(['#06081a', '#141a3a', '#2a2050']);
  r.overlay(g => { const W = r.W, H = r.H; for (let i = 0; i < 40; i++) px.dot(g, Math.round((i * 97.3 + 13) % W), Math.round((i * 53.7 + 5) % (H * .5)), (i + Math.floor(t * 2)) % 7 ? '#8a94c8' : '#ffffff');
    // floodlight beams
    px.blend(g, .1, 'add', () => { for (const k of [.16, .84]) px.poly(g, [[W * k - 6, 0], [W * k + 6, 0], [W * k + (k < .5 ? 90 : -90), H], [W * k + (k < .5 ? -30 : 30), H]], '#fff2c0'); });
    px.rect(g, 0, Math.round(H * .74), W, Math.ceil(H * .26), '#10381c'); for (let i = 0; i < 12; i++) px.rect(g, i * Math.ceil(W / 12), Math.round(H * .74), Math.ceil(W / 24), Math.ceil(H * .26), '#134422');
    px.rect(g, 0, Math.round(H * .74), W, 2, '#e8ecf4'); });
};
/** Menu: items [{ label, sub?, type: 'button'|'toggle'|'slider'|'select', get, set, min, max, step, options, onPick, disabled, hint }] */
UI.Menu = class Menu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ x: null, y: 70, w: 220, h: 24, scale: 2, onCancel: null, title: null, align: 'center' }, o); this.rects = []; this.lp = [-1, -1]; this.hot = 0; }
  focusable(i) { return this.items[i] && !this.items[i].disabled && !this.items[i].header; }
  move(d) { let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (this.focusable(n)) { this.i = n; EF.sfx('select'); return; } } }
  adjust(it, d) {
    if (it.onAdjust) { it.onAdjust(d); return; }
    if (it.type === 'toggle') { it.set(!it.get()); EF.sfx('select'); }
    else if (it.type === 'slider') { const s = it.step || .05; it.set(clamp(+(it.get() + d * s).toFixed(4), it.min === undefined ? 0 : it.min, it.max === undefined ? 1 : it.max)); EF.sfx('euTick'); }
    else if (it.type === 'select') { const opts = it.options, k = opts.findIndex(o => (Array.isArray(o) ? o[0] : o) === it.get()); const n = (k + d + opts.length) % opts.length; it.set(Array.isArray(opts[n]) ? opts[n][0] : opts[n]); EF.sfx('select'); }
  }
  update(dt) {
    const o = this.o; if (!this.focusable(this.i)) this.move(1);
    if (UI.anyRep('up')) this.move(-1); else if (UI.anyRep('down')) this.move(1);
    const it = this.items[this.i];
    if (it) {
      if (UI.anyRep('left')) this.adjust(it, -1); else if (UI.anyRep('right')) this.adjust(it, 1);
      if (UI.anyP('confirm') || UI.anyP('start')) { UI.eatAll(); if (it.type === 'toggle') this.adjust(it, 1); else if (it.type === 'select') this.adjust(it, 1); else if (it.onPick) { EF.sfx('confirm'); it.onPick(this.i, it); } }
    }
    if (UI.anyP('cancel') && o.onCancel) { UI.eatAll(); EF.sfx('cancel'); o.onCancel(); return; }
    // the mouse: hover moves the focus, a click picks (the left half of a slider lowers it)
    const p = game.input.pointer && game.input.pointer(), c = game.input.clicked && game.input.clicked();
    if (p && (p[0] !== this.lp[0] || p[1] !== this.lp[1])) { this.lp = [p[0], p[1]]; this.rects.forEach((rc, k) => { if (rc && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && this.focusable(k) && this.i !== k) { this.i = k; EF.sfx('select'); } }); }
    if (c) this.rects.forEach((rc, k) => { if (rc && c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3] && this.focusable(k)) { this.i = k; const it2 = this.items[k]; if (it2.type === 'slider') { const f = (c[0] - rc[0]) / rc[2]; it2.set(clamp(+(it2.min + (it2.max - it2.min) * f).toFixed(3), it2.min, it2.max)); } else if (it2.type === 'toggle' || it2.type === 'select') this.adjust(it2, c[0] < rc[0] + rc[2] * .3 ? -1 : 1); else if (it2.onPick) { EF.sfx('confirm'); it2.onPick(k, it2); } } });
  }
  draw(r) {
    const o = this.o, W = r.W, w = o.w, x = o.x === null ? Math.round((W - w) / 2) : o.x; this.rects = [];
    r.overlay(g => {
      let y = o.y; if (o.title) { TXT(g, o.title, W / 2, y - 28, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false }); }
      this.items.forEach((it, k) => {
        const h = it.h || o.h, foc = k === this.i && !it.header; this.rects[k] = it.header ? null : [x, y, w, h - 2];
        if (it.header) { TXT(g, it.label, x + w / 2, y + 4, '#8a9ac8', { align: 'center' }); y += h - 6; return; }
        const col = it.disabled ? '#5a6080' : foc ? '#ffffff' : '#c8d0ec';
        if (foc) { const pulse = Math.floor(this.hot += .02) % 2; px.rect(g, x - 3, y - 1, w + 6, h, '#0a1030'); px.rect(g, x - 2, y, w + 4, h - 2, '#ffc83a'); px.rect(g, x - 1, y + 1, w + 2, h - 4, '#1c2a5a'); px.poly(g, [[x - 10, y + h / 2 - 4], [x - 4, y + h / 2], [x - 10, y + h / 2 + 4]], '#ffc83a'); }
        const ty = y + Math.round((h - 2 - 7 * o.scale) / 2) + 1;
        if (it.type === 'slider') { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); const bw = Math.round(w * .38), bx = x + w - bw - 8; px.rect(g, bx, y + 7, bw, 8, '#0a0c14'); const f = (it.get() - it.min) / (it.max - it.min); px.rect(g, bx + 1, y + 8, Math.round((bw - 2) * clamp(f, 0, 1)), 6, foc ? '#ffc83a' : '#6a7ab0'); TXT(g, it.fmt ? it.fmt(it.get()) : Math.round(it.get() * 100) + '%', bx - 6, ty + 2, col, { font: 'tiny', align: 'right' }); }
        else if (it.type === 'toggle') { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); TXT(g, it.get() ? 'ON' : 'OFF', x + w - 8, ty, it.get() ? '#7aff9a' : '#ff8a7a', { scale: o.scale, align: 'right' }); }
        else if (it.type === 'select') { const cur = it.options.find(op => (Array.isArray(op) ? op[0] : op) === it.get()), nm = Array.isArray(cur) ? cur[1] : cur; TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); TXT(g, (foc ? '< ' : '') + nm + (foc ? ' >' : ''), x + w - 8, ty, foc ? '#ffe7a8' : '#aab4d8', { scale: o.scale, align: 'right' }); }
        else if (it.draw) { TXT(g, it.label, x + 8, ty, col, { scale: o.scale }); it.draw(g, x, y, w, h, foc); }
        else { TXT(g, it.label, o.align === 'center' ? x + w / 2 : x + 8, ty, col, { scale: o.scale, align: o.align === 'center' ? 'center' : 'left' }); if (it.sub) TXT(g, it.sub, x + w - 8, ty + 4, '#8a9ac8', { font: 'tiny', align: 'right' }); }
        y += h;
      });
      const it = this.items[this.i]; if (it && it.hint) TXT(g, it.hint, W / 2, r.H - 34, '#c8d4ff', { align: 'center' });
    });
  }
};
EF.TXT = TXT;
