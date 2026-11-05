/* ---- UI: 10-foot widgets. Big menus (scale 2, an unmistakable focus, the mouse's hover moves it, a click picks it),
 * idle tracking for the attract mode, the touch-only check ---- */
TT.ui = {};
/** a big menu: items [{ label, desc, disabled, value() }]; o: { x, y, w, onPick, onCancel, onMove, scale, rowH, title } */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; Object.assign(this, { scale: 2, rowH: 22, w: 230, x: 'center', y: 70, onPick: null, onCancel: null, onMove: null, onLeft: null, onRight: null, title: '' }, o); this.boxes = []; this.skip(1); this.flash = 0; }
  skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  update(dt) {
    const g = TT.game, P = g.players, n = this.items.length, old = this.i, I = g.input;
    this.flash += dt;
    if (P.some(q => q.repeat('up'))) { this.i = (this.i + n - 1) % n; this.skip(-1); }
    if (P.some(q => q.repeat('down'))) { this.i = (this.i + 1) % n; this.skip(1); }
    const ptr = I.pointer && I.pointer();
    if (ptr && I.mouse && I.mouse.t !== this._mt) { this._mt = I.mouse.t; const k = this.hit(ptr); if (k >= 0) this.i = k; }
    const c = I.clicked && I.clicked(); let clickPick = false;
    if (c) { const k = this.hit(c); if (k >= 0) { this.i = k; clickPick = true; } }
    if (this.i !== old) { TT.audio.sfx('select'); if (this.onMove) this.onMove(this.i); }
    const it = this.items[this.i];
    if (P.some(q => q.repeat('left')) && this.onLeft) { this.onLeft(this.i, it); TT.audio.sfx('select'); }
    if (P.some(q => q.repeat('right')) && this.onRight) { this.onRight(this.i, it); TT.audio.sfx('select'); }
    if ((P.some(q => q.pressed('confirm') || q.pressed('start')) || clickPick) && it && !it.disabled) { TT.audio.sfx('confirm'); P.forEach(q => q.consumeAll()); if (this.onPick) this.onPick(this.i, it); return true; }
    if (P.some(q => q.pressed('cancel')) && this.onCancel) { TT.audio.sfx('cancel'); P.forEach(q => q.consumeAll()); this.onCancel(); return true; }
    return false;
  }
  hit(p) { for (const b of this.boxes) if (p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3] && !this.items[b[4]].disabled) return b[4]; return -1; }
  draw(g, W) {
    const x = this.x === 'center' ? Math.round(W / 2 - this.w / 2) : this.x;
    this.boxes = [];
    if (this.title) E.font.text(g, this.title, x + this.w / 2, this.y - 16, '#ffe08a', { align: 'center', outline: '#000', scale: 1 });
    this.items.forEach((it, k) => {
      const y = this.y + k * this.rowH, on = k === this.i;
      this.boxes.push([x, y, this.w, this.rowH - 3, k]);
      if (on) { const pulse = (Math.sin(this.flash * 6) + 1) / 2; E.ui.box(g, x - 2, y - 2, this.w + 4, this.rowH + 1, { bg: ['#4a3a10', '#2a2008'], border: pulse > .5 ? '#ffe060' : '#e8b030' }); E.font.text(g, '▸', x + 6, y + 3, '#ffe060', { scale: this.scale > 1 ? 2 : 1, outline: false }); }
      else E.ui.box(g, x, y, this.w, this.rowH - 3, { bg: ['#141a2a', '#0c1020'], border: '#3a4460', alpha: .85 });
      const lab = typeof it.label === 'function' ? it.label() : it.label, val = it.value ? it.value() : '';
      const col = it.disabled ? '#5a6078' : on ? '#ffffff' : '#c8d0e8';
      E.font.text(g, lab, x + (this.scale > 1 ? 22 : 16), y + (this.rowH - 3) / 2 - 3.5 * Math.min(2, this.scale) + 1, col, { scale: Math.min(2, this.scale), outline: false });
      if (val) E.font.text(g, '< ' + val + ' >', x + this.w - 8, y + (this.rowH - 3) / 2 - 3.5, on ? '#ffe060' : '#a8b0c8', { align: 'right', outline: false });
    });
  }
}
TT.ui.BigMenu = BigMenu;
/** the description line under a menu, and the prompts: built from badges for the device used last */
TT.ui.footer = (g, W, H, txt) => { E.ui.box(g, 0, H - 20, W, 20, { bg: '#0c1020', border: '#0c1020', alpha: .75, gradient: false }); TT.prompt(g, txt, W / 2, H - 14, TT.game.input); };
TT.ui.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1a2238', '#0c1020'], border: '#e8c040', alpha: .92 }, o));

/* ---- any input (for the attract mode): keys, mouse buttons, movement over 8 px, pad buttons, sticks past .5, taps ---- */
TT.idle = { t: 0, ptr: null };
TT.anyInput = () => {
  const g = TT.game;
  let fresh = false;
  for (const I of g.players) {
    // any key or button at all, bound to an action or not: a code newly held
    const prev = I._ttHeld || new Set(); if (I.held) { for (const c of I.held) if (!prev.has(c)) fresh = true; I._ttHeld = new Set(I.held); }
  }
  if (fresh) return true;
  for (const I of g.players) {
    if (I.anyPressed && I.anyPressed()) return true;
    const m = I.move(); if (Math.hypot(m[0], m[1]) > .5) return true;
    if (I.clicked && I.clicked()) return true;
  }
  const p = g.input.pointer && g.input.pointer();
  if (p) { if (TT.idle.ptr && Math.hypot(p[0] - TT.idle.ptr[0], p[1] - TT.idle.ptr[1]) > 8) { TT.idle.ptr = p; return true; } if (!TT.idle.ptr) TT.idle.ptr = p; }
  return false;
};
/** count idle time on a front-end screen; after 10 s, the attract mode */
TT.idleStep = dt => {
  if (TT.cfg.session) return;
  if (TT.anyInput()) TT.idle.t = 0; else TT.idle.t += dt;
  if (TT.idle.t > 10) { TT.idle.t = 0; TT.attract.start(); }
};

/* ---- touch-only devices: no touch controls; the title says a controller or keyboard is needed ---- */
TT.checkTouchOnly = () => {
  if (typeof matchMedia !== 'function' || typeof document === 'undefined') { TT.cfg.touchOnly = false; return; }
  const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  TT.cfg.touchOnly = coarse && !fine && !TT.cfg.sawKeyOrPad;
};
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  const leave = () => { TT.cfg.sawKeyOrPad = true; TT.cfg.touchOnly = false; };
  addEventListener('keydown', leave); addEventListener('gamepadconnected', leave);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') leave(); });
}

/* ---- a staged set for the story scenes and the front end: a small TileMap room ---- */
TT.sets = {};
TT.makeSet = kind => {
  if (TT.sets[kind]) return TT.sets[kind];
  const rows = [], W = 20, H = 12;
  for (let r = 0; r < H; r++) { let s = ''; for (let c = 0; c < W; c++) s += r === 0 || c === 0 || c === W - 1 ? '#' : (kind === 'pub' && r === 3 && c > 3 && c < 14 ? 'b' : '.'); rows.push(s); }
  const floor = kind === 'pub' ? (x, y) => E.tex.planks(x, y) : kind === 'tunnel' ? (x, y) => { const n = E.hash2(x | 0, y | 0) * 14; return [52 + n, 50 + n, 58 + n]; } : (x, y) => { const n = E.hash2(x | 0, y | 0) * 20, k = Math.floor(x / 32) % 2 ? 1.08 : .94; return [70 * k + n, 130 * k + n, 56 * k + n]; };
  const types = {
    1: kind === 'pub' ? { h: 52, face: 'plaster', side: '#c8b48a', top: '#6a4a2a' } : kind === 'tunnel' ? { h: 52, face: 'stone', side: '#3a3a48', top: '#2a2a34' } : { h: 30, face: 'plank', side: '#3a4a6a', top: '#d8dce8' },
    2: { h: 18, face: 'plank', side: '#6a3a1a', top: '#8a5a2a' }
  };
  const map = new E.TileMap({ rows, legend: { '#': 1, b: 2, '.': { floor: 'floor' } }, types, floorTex: floor, outside: '#0c0a10', ao: 5 });
  return TT.sets[kind] = map;
};
