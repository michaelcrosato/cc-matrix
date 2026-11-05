/* ---------- 10-foot UI: big menus, hover + click, prompt bars ---------- */
const GOLD = ['#fff6d0', '#ffd060', '#e8782a'], PALE = '#e8e0ff';
class Menu {
  /** items: [{ label, onPick, disabled, sub }]; o: { y, scale, title, onCancel, x, w } */
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ scale: 2, y: 90, x: 'center', gap: 4 }, o); this.rects = []; this._mt = -1; this.t = 0; }
  setItems(items) { this.items = items; this.i = clamp(this.i, 0, Math.max(0, items.length - 1)); this._skip(1); }
  _skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  get cur() { return this.items[this.i]; }
  /** returns true when it consumed a pick or cancel */
  update(dt, game = KC.game) {
    this.t += dt; const P = game._players || [game.input], I = P[0], n = this.items.length; if (!n) return false;
    this.layout(game.W, game.H); const any = f => P.some(f), old = this.i;
    if (any(p => p.repeat('up', .35, .12))) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (any(p => p.repeat('down', .35, .12))) { this.i = (this.i + 1) % n; this._skip(1); }
    { const p = I.pointer(); if (p && (p[0] !== this._px || p[1] !== this._py)) { this._px = p[0]; this._py = p[1]; const k = this.hit(p); if (k >= 0) this.i = k; } }
    const tap = this.hit(I.clicked()); if (tap >= 0) this.i = tap;
    if (this.i !== old) KC.sfx('menuMove');
    const left = any(p => p.repeat('left', .35, .12)), right = any(p => p.repeat('right', .35, .12));
    if ((left || right) && this.cur && this.cur.adjust) { this.cur.adjust(left ? -1 : 1); KC.sfx('menuMove'); }
    if ((any(p => p.pressed('confirm') || p.pressed('start')) || tap >= 0) && this.cur && !this.cur.disabled) { KC.sfx('menuOk'); P.forEach(p => p.consumeAll()); if (this.cur.onPick) this.cur.onPick(this.cur, this.i); else if (this.o.onPick) this.o.onPick(this.cur, this.i); return true; }
    if (any(p => p.pressed('cancel')) && this.o.onCancel) { KC.sfx('menuBack'); P.forEach(p => p.consumeAll()); this.o.onCancel(); return true; }
    return false;
  }
  hit(p) { if (!p) return -1; for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) return k; } return -1; }
  // where the rows sit (also used for mouse hits before the first draw, and in tests): fills this.rects
  layout(RW, RH) {
    const o = this.o, sc = o.scale, lh = E.font.lineHeight() * sc + o.gap * sc, y = typeof o.y === 'function' ? o.y({ W: RW, H: RH }) : o.y;
    const n = this.items.length, vis = Math.min(n, o.max || n), top = clamp(this.i - Math.floor(vis / 2), 0, Math.max(0, n - vis));
    const labels = this.items.map(it => typeof it.label === 'function' ? it.label() : it.label), W = Math.max(...labels.map(l => E.font.width(l, { scale: sc })), 40) + 40, x0 = o.x === 'center' ? Math.round((RW - W) / 2) : o.x;
    this.rects = []; for (let k = top; k < top + vis; k++) this.rects[k] = this.items[k].disabled ? null : { x: x0, y: Math.round(y + (k - top) * lh) - 2, w: W, h: lh };
    return { o, sc, lh, y, n, vis, top, labels, W, x0 };
  }
  draw(r) {
    const L = this.layout(r.W, r.H), { o, sc, lh, y, n, vis, top, labels, W, x0 } = L;
    r.overlay(g => {
      if (o.title) { E.font.title(g, o.title, r.W / 2, y - 22 * (sc / 2), { scale: 2, align: 'center', colors: GOLD, depth: 2 }); }
      for (let k = top; k < top + vis; k++) {
        const it = this.items[k], l = labels[k], sel = k === this.i, yy = Math.round(y + (k - top) * lh);
        if (sel) { const pulse = .5 + .5 * Math.sin(this.t * 7); px.blend(g, .55 + .15 * pulse, 'normal', () => px.rect(g, x0, yy - 2, W, lh - 1, '#6a2a1a')); px.rect(g, x0, yy - 2, 3, lh - 1, '#ffd060'); E.font.text(g, '▸', x0 + 6, yy + (sc - 1), '#ffd060', { scale: sc, outline: false }); }
        E.font.text(g, l, r.W / 2, yy, it.disabled ? '#6a6488' : sel ? '#fff6d0' : '#cfc8e8', { scale: sc, align: 'center', shadow: '#000', outline: false });
      }
      if (top > 0) E.font.text(g, '↑', r.W / 2, y - 9, '#ffd060', { align: 'center', outline: false }); if (top + vis < n) E.font.text(g, '↓', r.W / 2, Math.round(y + vis * lh), '#ffd060', { align: 'center', outline: false });
      const cur = this.items[this.i], sub = cur && (typeof cur.sub === 'function' ? cur.sub() : cur.sub); if (sub) E.font.text(g, sub, r.W / 2, r.H - 34, '#ffd8a0', { align: 'center', shadow: '#000', outline: false });
    });
  }
}
KC.Menu = Menu;
// any input at all this step (keys, buttons, sticks past the dead zone, mouse move or click, touch)
KC.anyInput = (game = KC.game) => {
  const P = game._players || [game.input];
  return P.some(I => {
    const p = I.pointer(), moved = !!p && (p[0] !== I._kcPx || p[1] !== I._kcPy); if (p) { I._kcPx = p[0]; I._kcPy = p[1]; }
    return I.anyPressed() || moved || Math.hypot(I.padMove[0], I.padMove[1]) > .05 || !!I.padAim || !!I.clicked();
  });
};
// a panel with a big title, used by every simple screen
KC.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1c1236', '#0e0a20'], border: '#e8e4ff' }, o));
KC.title = (g, str, x, y, scale = 2, align = 'center') => E.font.title(g, str, x, y, { scale, align, colors: GOLD, depth: 2 });
KC.text = (g, str, x, y, color = PALE, o = {}) => E.font.text(g, str, x, y, color, Object.assign({ shadow: '#000', outline: false }, o));
KC.shadowText = KC.text;
// paged text helper for About/Credits
KC.wrap = (str, w, opt) => E.font.wrap(str, w, opt || {});

const simpleScene = (name, o) => { KC.scenes[name] = Object.assign({ view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false } }, o); };
const backDrop = (r, scn) => { scn.stage.draw(r); r.overlay(g => px.blend(g, .62, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d'))); };
const menuScene = (name, stageId, title, build, music = 'select') => simpleScene(name, {
  enter(d) { this.stage = new Stage(stageId); this.stage.d = Object.assign({}, this.stage.d, { ambient: .35 }); this.d = d || {}; this.menu = new Menu(build.call(this, this.d), { y: r => Math.round(r.H * .34), scale: 2, onCancel: () => this.back() }); KC.idle.t = 0; KC.music(music); KC.game.follow(null); KC.current = this; },
  back() { KC.game.go('title', { menu: true }); },
  update(dt) {
    this.stage.update(dt); KC.game.focus(200, 0, 50); if (KC.anyInput()) KC.idle.t = 0; else KC.idle.t += dt; if (KC.idle.t >= 10 && !SESSION) { KC.idle.t = 0; KC.game.go('attract'); return; }
    this.menu.update(dt); if (this.tick) this.tick(dt);
  },
  draw(r) { backDrop(r, this); r.overlay(g => KC.title(g, title, r.W / 2, 14, 3)); this.menu.draw(r); if (this.extra) this.extra(r); KC.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }
});
