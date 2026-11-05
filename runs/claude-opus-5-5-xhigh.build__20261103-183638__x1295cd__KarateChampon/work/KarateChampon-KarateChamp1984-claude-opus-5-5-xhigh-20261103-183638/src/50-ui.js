/* =====================================================================================================================
 * UI for a TV at ten feet, controller first: big menus (scale 2, at most 7 items, a pulsing focus bar and a cursor, held
 * keys repeat; the mouse's hover moves the focus and a click picks), a prompt bar that follows the device used last, the
 * cutscene dialog (portraits, typed text, gibberish voices), the title logo, panels.
 * ===================================================================================================================== */
const SC = () => (KC.game && KC.game.W >= 300 ? 2 : 1);
KC.inputs = () => (KC.game && KC.game._players) || (KC.game ? [KC.game.input] : []);
KC.anyPressed = a => KC.inputs().some(I => I.pressed(a));
KC.anyRepeat = a => KC.inputs().some(I => I.repeat(a));
KC.consumeAll = () => KC.inputs().forEach(I => I.consumeAll());
/** the pointer when it moved since this widget last looked (a real mouse or a fed pointer), else null */
KC.moved = (I, w) => { const p = I.pointer(), sig = p ? Math.round(p[0]) + ',' + Math.round(p[1]) : ''; if (sig === w._psig) return null; const first = w._psig === undefined; w._psig = sig; return first ? null : p; };
KC.Menu = class {
  /** new KC.Menu({ items: [{ label, sub, disabled, act }], title, x, y, w, scale, onCancel, onMove }) */
  constructor(o) { Object.assign(this, { x: 'center', y: 'center', w: 0, scale: 0, title: null, onCancel: null, onMove: null, i: 0, active: true }, o); this.items = o.items || []; this._rows = []; this._mt = -1; this.t = 0; this._skip(1); }
  _skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  get selected() { return this.items[this.i]; }
  setItems(items) { const lab = this.selected && this.selected.label; this.items = items; const k = items.findIndex(it => it.label === lab); this.i = k >= 0 ? k : Math.min(this.i, items.length - 1); this._skip(1); }
  update(dt) {
    this.t += dt; if (!this.active || !this.items.length) return false;
    const I = KC.game.input, n = this.items.length, old = this.i;
    if (KC.anyRepeat('up')) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (KC.anyRepeat('down')) { this.i = (this.i + 1) % n; this._skip(1); }
    const row = p => { if (!p) return -1; for (const R of this._rows) if (p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h && !this.items[R.i].disabled) return R.i; return -1; };
    const pt = KC.moved(I, this); if (pt) { const k = row(pt); if (k >= 0) this.i = k; }
    const tap = row(I.clicked());
    if (tap >= 0) this.i = tap;
    if (this.i !== old) { KC.sfx('menuMove'); if (this.onMove) this.onMove(this.i, this.items[this.i]); }
    const it = this.items[this.i];
    if ((KC.anyPressed('confirm') || tap >= 0) && it && !it.disabled) { KC.sfx('menuOk'); KC.consumeAll(); if (it.act) it.act(it, this); return true; }
    if (it && it.adjust && (KC.anyRepeat('left') || KC.anyRepeat('right'))) { it.adjust(KC.anyRepeat('left') ? -1 : 1, it); KC.sfx('menuMove'); }
    if (KC.anyPressed('cancel') && this.onCancel) { KC.sfx('menuBack'); KC.consumeAll(); this.onCancel(); return true; }
    return false;
  }
  draw(g, W, H) {
    const s = this.scale || SC(), lh = 9 * s + (this.items.length > 6 ? 2 : 5), labels = this.items.map(it => it.label + (it.value !== undefined ? '  ' + it.value : ''));
    const w = Math.max(this.w, E.font.width(this.title || '', { scale: s }) + 20, ...labels.map(l => E.font.width(l, { scale: s }) + 34 * s / 2 + 20));
    const h = labels.length * lh + (this.title ? lh + 4 : 0) + 10;
    const x = this.x === 'center' ? Math.round((W - w) / 2) : this.x, y = this.y === 'center' ? Math.round((H - h) / 2) : this.y;
    E.ui.box(g, x, y, w, h, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .92 });
    let yy = y + 6;
    if (this.title) { E.font.text(g, this.title, x + w / 2, yy, '#ffd060', { align: 'center', outline: false, shadow: '#000', scale: s }); yy += lh + 4; }
    this._rows = [];
    labels.forEach((l, k) => {
      const sel = k === this.i && this.active, it = this.items[k], ry = yy + k * lh;
      this._rows.push({ x: x + 3, y: ry - 3, w: w - 6, h: lh, i: k });
      if (sel) { const pulse = .5 + .5 * Math.sin(this.t * 6); px.rect(g, x + 3, ry - 3, w - 6, lh, E.mix('#3a2a5a', '#5a3a7a', pulse)); px.rect(g, x + 3, ry - 3, 2, lh, '#ffd060'); E.font.text(g, '▸', x + 8, ry, '#ffd060', { outline: false, scale: s }); }
      E.font.text(g, l, x + 12 + 8 * s, ry, it.disabled ? '#6a6488' : sel ? '#fff6d0' : '#d8d0e8', { outline: false, shadow: '#05040a', scale: s });
    });
    this.box = { x, y, w, h };
    const sub = this.selected && this.selected.sub;
    return sub;
  }
};
/** the prompt bar: [[action, label], ...] with the glyphs of the device used last, along the bottom */
KC.promptBar = (g, W, H, items, o = {}) => {
  const I = KC.game.input, dev = KC.device(I), s = o.scale || 1, parts = [];
  for (const [a, label] of items) { const ic = typeof a === 'string' ? KC.actionIcon(a, I, dev) : a; parts.push(ic, label + '   '); }
  const w = KC.iconRow(g, 0, 0, parts, s, false), x = o.x !== undefined ? o.x : Math.round((W - w) / 2), y = o.y !== undefined ? o.y : H - 14 * s - 4;
  px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 3, W, 14 * s + 6, '#05040a'));
  KC.iconRow(g, x, y, parts, s);
};
/** a centred panel with a title (10-foot: big text, few lines) */
KC.panel = (g, x, y, w, h, title) => {
  E.ui.box(g, x, y, w, h, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .94 });
  if (title) E.font.title(g, title, x + Math.round(w / 2), y + 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
};
/** the title logo: KARATE over CHAMPON, the O a noodle bowl with chopsticks and steam */
KC.drawLogo = (g, W, y, t, s = 4) => {
  const cols = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'];
  E.font.title(g, 'KARATE', Math.round(W / 2), y, { scale: Math.max(2, s - 2), align: 'center', colors: ['#ffffff', '#ffd0a0', '#e86a3a'], depth: 2 });
  const y2 = y + 9 * (s - 2) + 6, a = 'CHAMP', b = 'N', wa = E.font.width(a, { scale: s }), wb = E.font.width(b, { scale: s }), bw = 8 * s, tot = wa + bw + wb + 2 * s, x0 = Math.round((W - tot) / 2);
  E.font.title(g, a, x0, y2, { scale: s, colors: cols, depth: 3 });
  E.font.title(g, b, x0 + wa + bw + 2 * s, y2, { scale: s, colors: cols, depth: 3 });
  const bx = x0 + wa + s + Math.round(bw / 2), by = y2 + Math.round(4.2 * s);   // the bowl
  px.ell(g, bx, by + s, Math.round(bw / 2) + 1, Math.round(2.6 * s), '#7a2a10'); px.ell(g, bx, by, Math.round(bw / 2), Math.round(2.4 * s), '#f4ecd8'); px.rect(g, bx - Math.round(bw / 2), by - Math.round(.6 * s), bw, Math.round(1.2 * s), '#e0662a'); px.ell(g, bx, by - Math.round(.8 * s), Math.round(bw / 2) - 1, Math.round(.7 * s), '#ffd060');
  for (let i = 0; i < 3; i++) px.rect(g, bx - Math.round(bw / 3) + i * Math.round(bw / 3), by + Math.round(.8 * s), 2, 2, '#c84a2a');
  px.line(g, bx + 2, by - Math.round(4 * s), bx + Math.round(bw / 2) + 3, by - Math.round(.6 * s), '#c8a060', Math.max(1, Math.round(s / 3))); px.line(g, bx + 5, by - Math.round(4.4 * s), bx + Math.round(bw / 2) + 6, by - Math.round(1 * s), '#a88040', Math.max(1, Math.round(s / 3)));
  for (let i = 0; i < 3; i++) { const sy = by - Math.round(3 * s) - ((t * 10 + i * 6) % (4 * s)); px.blend(g, .5, 'normal', () => px.ell(g, bx - Math.round(bw / 4) + i * Math.round(bw / 4) + Math.round(Math.sin(t * 2 + i) * 2), Math.round(sy), 2, 2, '#ffffff')); }
  return y2 + 9 * s + 4;
};

/* ---- the cutscene dialog: [speaker, text] lines; 'card' lines are full-screen title cards ---- */
KC.Talk = class {
  constructor(lines, o = {}) { this.lines = lines; this.i = 0; this.t = 0; this.chars = 0; this.done = false; this.o = o; this.rigs = {}; this.spoke = -1; this.dur = 1; }
  rig(who) {
    if (this.rigs[who]) return this.rigs[who];
    const R = who === 'genkotsu' ? KC.makeOfficial(2) : who === 'mei' && !this.o.meiGi ? KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a', belt: '#c8302a' } }) : KC.makeRig(who, 'white', who === 'taro' ? (this.o.rank || 'white') : null);
    for (let i = 0; i < 4; i++) R.update(.05, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'smile' });
    return (this.rigs[who] = R);
  }
  get line() { return this.lines[this.i] || null; }
  update(dt) {
    if (this.done) return;
    const L = this.line; if (!L) { this.finish(); return; }
    if (this.spoke !== this.i) { this.spoke = this.i; this.chars = 0; this.t = 0; this.dur = KC.Voice.speak(L[1], L[0] === 'card' ? null : L[0]); }
    this.t += dt; this.chars = Math.min(L[1].length, Math.floor(this.t * 40));
    const r = this.rigs[L[0]]; if (r) r.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: this.chars < L[1].length ? 'shout' : 'smile' });
    const I = KC.game.input, adv = KC.anyPressed('confirm') || KC.anyPressed('skip') || !!I.clicked();
    if (KC.DEV && KC.DEV.skipCutscenes) { this.finish(); return; }
    if (adv && this.t > .15) { KC.consumeAll(); if (this.chars < L[1].length) this.t = 99; else this.next(); }
    else if (this.o.auto && this.t > Math.max(1.6, this.dur + 1)) this.next();
  }
  next() { this.i++; if (this.i >= this.lines.length) this.finish(); }
  finish() { if (this.done) return; this.done = true; if (this.o.onDone) this.o.onDone(); }
  draw(g, W, H) {
    const L = this.line; if (!L || this.done) return;
    const s = SC(), text = L[1].slice(0, this.chars);
    if (L[0] === 'card') {
      px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      const lines = E.font.wrap(text, W - 40, { scale: s });
      lines.forEach((l, k) => E.font.title(g, l, Math.round(W / 2), Math.round(H / 2 - lines.length * 10 * s / 2) + k * 11 * s, { scale: s, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }));
    } else {
      const bh = 58, y = H - bh - 22, rig = this.rig(L[0]), name = L[0] === 'genkotsu' ? 'JUDGE GENKOTSU' : KC.FIGHTER[L[0]].name;
      E.ui.box(g, 8, y, W - 16, bh, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .95 });
      rig.drawPortrait(g, 14, y + 6, 44, { frame: true, bg: '#2a2040' });
      E.font.text(g, name, 66, y + 6, L[0] === 'mei' ? '#ff8aa8' : L[0] === 'genkotsu' ? '#8ab0ff' : '#ffd060', { outline: false, shadow: '#000' });
      const lines = E.font.wrap(text, W - 90, { scale: s > 1 && W > 380 ? 2 : 1 });
      lines.slice(0, 3).forEach((l, k) => E.font.text(g, l, 66, y + 18 + k * (s > 1 && W > 380 ? 18 : 10), '#fff6e8', { outline: false, shadow: '#000', scale: s > 1 && W > 380 ? 2 : 1 }));
    }
    if (this.chars >= L[1].length && Math.floor(KC.game.real * 3) % 2 === 0) KC.iconRow(g, W - 40, H - 18, [KC.actionIcon('confirm')], 1);
  }
};
