/* 51-screens: the 10-foot menus and screens, drawn on the canvas in our frame: a focus menu (d-pad, stick, arrows;
 * hover moves the focus, a click picks; ✕ / Enter confirm, ○ / Esc / right click back), at most seven items with a
 * line under each; the title (a flyover of the night harbor), the main menu, difficulty, stage select, co-op join,
 * briefings, results with count-ups and a rank stamp, game over with initials, records, about (Source Information and
 * the feedback), how to play, the ending's credits, and the touch-only notice. */
class UIMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.rects = []; this.t = 0; this.o = o; this.moved = 0; this._mt = TC.game && TC.game.input.mouse ? TC.game.input.mouse.t : 0; while (this.items[this.i] && this.items[this.i].disabled) this.i++; }
  update(dt, I = TC.game.input) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    const step = d => { let k = this.i; for (let j = 0; j < n; j++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; Audio3.play('ui_move'); } };
    const h = this.o.horizontal;
    if (I.repeat(h ? 'left' : 'up', .35, .1)) step(-1);
    if (I.repeat(h ? 'right' : 'down', .35, .1)) step(1);
    const p = I.pointer();
    // hover moves the focus whenever the pointer moves (even right after a key press; a resting pointer does not steal it)
    const mt = I.mouse ? I.mouse.t : 0, moved = mt !== this._mt; this._mt = mt;
    if (p && moved) { if (!this.lp || Math.hypot(p[0] - this.lp[0], p[1] - this.lp[1]) > 1) { this.lp = p.slice(); const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; Audio3.play('ui_move'); } } }
    const c = I.clicked();
    if (c) { const k = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(I); } }
    if (I.pressed('confirm') || I.pressed('fire') && I.lastDevice === 'gamepad' || I.pressed('start') && !I.pressed('pause')) return this.pick(I);
    if (I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) { Audio3.play('ui_back'); I.consumeAll(); if (this.o.back) this.o.back(); return 'back'; }
    if (this.o.adjust && (I.pressed('left') || I.pressed('right'))) this.o.adjust(this.items[this.i], I.pressed('left') ? -1 : 1);
    return null;
  }
  pick(I) { const it = this.items[this.i]; if (!it || it.disabled) return null; Audio3.play('ui_ok'); I.consumeAll(); if (it.act) it.act(it); return it; }
  /** draw a vertical list centred at x, from y; each item with its description line */
  draw(g, x, y, w, o = {}) {
    const gap = o.gap || 26; this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * gap, on = k === this.i, wave = on ? Math.sin(this.t * 6) * 1.5 : 0;
      if (on) { E.ui.box(g, x - w / 2 - 4, yy - 3, w + 8, gap - 3, { bg: ['#1e5aa0', '#0e2a5a'], border: '#ffd36a' }); px.rect(g, x - w / 2 - 10 + wave, yy + 5, 4, 4, '#ffd36a'); }
      txt(g, it.label, x, yy, it.disabled ? '#5a6a80' : on ? '#ffffff' : '#c8d4ec', { align: 'center', scale: on ? 2 : 2 });
      if (it.desc && on && o.footer) { E.ui.box(g, x - 150, o.footer - 3, 300, 14, { bg: ['#10244a', '#081428'], border: '#3aa0e8', alpha: .9 }); txt(g, it.desc, x, o.footer, '#ffd36a', { align: 'center' }); }
      else if (it.desc && (on || o.allDesc)) txt(g, it.desc, x, yy + 15, on ? '#ffd36a' : '#8aa0c8', { align: 'center' });
      this.rects[k] = [x - w / 2 - 4, yy - 3, w + 8, gap - 3];
    });
  }
}
TC.UIMenu = UIMenu;

/** the screen frame: a deep blue gradient with a rolling wave band, a title */
function frame(g, W, H, title, t = 0) {
  for (let y = 0; y < H; y += 4) { const k = y / H; px.rect(g, 0, y, W, 4, E.mix ? E.mix('#10244a', '#04060c', k) : '#081428'); }
  for (let x = 0; x < W; x += 2) { const y = H - 26 + Math.sin(x * .05 + t * 2) * 4 + Math.sin(x * .13 - t * 3) * 2; px.rect(g, x, y, 2, H - y, '#0a2a52'); px.dot(g, x, y, '#3aa0e8'); }
  if (title) { txt(g, title, W / 2, 14, '#ffd36a', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); px.rect(g, W / 2 - 80, 33, 160, 1, '#3aa0e8'); }
}
TC.frame = frame;
/** the logo: TIDE CRISIS with a big 3 and a wave under it */
function logo(g, cx, y, t, k = 1) {
  F.title(g, 'TIDE CRISIS', cx - 14 * k, y, { scale: 4 * k, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  const w = F.width('TIDE CRISIS', { scale: 4 * k });
  F.title(g, '3', cx + w / 2 + 4 * k, y - 6 * k, { scale: 7 * k, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#08142a', depth: 3, depthColor: '#2a0808', align: 'center' });
  for (let x = -w / 2 - 20; x < w / 2 + 30; x += 1) { const yy = y + 34 * k + Math.sin(x * .12 + t * 3) * 2.5; px.dot(g, cx + x, yy, '#3aa0e8'); if (((x | 0) % 3) === 0) px.dot(g, cx + x, yy - 1, '#9fe3ff'); }
}
TC.logo = logo;

/* ---- the title's flyover camera, a slow orbit over the harbor (shared by the title and menus) ---- */
const Flyover = {
  r3: null, t: 0, fx: null,
  draw(g, W, H, dt) {
    const st = reg('stage', 1), world = WORLDS.get(1); if (!world) { frame(g, W, H, null, this.t); return; }
    this.t += dt || 1 / 60; if (!this.r3) { this.r3 = new Rail3D(); this.fx = new FX(); }
    const R3 = this.r3, t = this.t; R3.size(W, H);
    const a = Math.sin(t * .04) * 1.1, cam = { x: -420 + Math.sin(t * .03) * 60, y: Math.sin(a) * 160, z: 64 + Math.sin(t * .1) * 14, yaw: -a * .35, pitch: -.1, fov: 60 };
    R3.begin(cam, st.env, t);
    if (this.fx.r() < .03) this.fx.firework([cam.x + Math.cos(cam.yaw) * 700 + (this.fx.r() - .5) * 600, cam.y + Math.sin(cam.yaw) * 700 + (this.fx.r() - .5) * 600, 200 + this.fx.r() * 150], (this.fx.r() * 3) | 0);
    this.fx.step(1 / 60); this.fx.draw(R3);
    R3.drawWorld(world); R3.sky(); this.fx.drawAfter(R3); R3.vignette(.25);
    R3.present(g, 0, 0);
  }
};
TC.Flyover = Flyover;

/** is this a touch-only device (no fine pointer, no gamepad, no key pressed yet)? */
function touchOnly() {
  if (TC.forceTouchOnly) return true;
  if (HEADLESS || TC.forceTouchOnly === false) return false;
  if (TC._keySeen) return false;
  try { const pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean) : []; if (pads.length) return false; } catch (e) { /* none */ }
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
}
TC.touchOnly = touchOnly;
/** idle tracking for the attract mode: any key or button, a pointer move of more than 4 px, a stick past its dead zone */
const Idle = {
  t: 0, lp: null,
  step(dt, I = TC.game.input) {
    let any = I.anyPressed() || (I.padAim && Math.hypot(...I.padAim) > 0) || Math.hypot(I.padMove[0], I.padMove[1]) > 0 || I.held.size > 0;
    const p = I.pointer(); if (p) { if (this.lp && Math.hypot(p[0] - this.lp[0], p[1] - this.lp[1]) > 4) any = true; this.lp = p.slice(); }
    if (I.clicked()) any = true;
    this.t = any ? 0 : this.t + dt; return this.t;
  },
  reset() { this.t = 0; }
};
TC.Idle = Idle;

/* ---- results: count-ups, the bonuses, the rank stamp ---- */
class Results {
  constructor(sim, i, o) { this.sim = sim; this.i = i; this.o = o; this.t = 0; this.r = sim.stageResult(i); this.done = false; this.stamped = false; this.bonusAdded = false; }
  update(dt, I) {
    this.t += dt; const rows = 9;
    if (Math.floor(this.t / .35) !== Math.floor((this.t - dt) / .35) && this.t < rows * .35) Audio3.play('count');
    if (this.t > rows * .35 && !this.stamped) { this.stamped = true; Audio3.play('stamp'); TC.game.shake && TC.game.shake(4); if (!this.bonusAdded) { this.bonusAdded = true; const p = this.sim.players[this.i]; p.score += this.r.accBonus + this.r.noDamage; } }
    if ((I.pressed('confirm') || I.pressed('fire') || I.clicked()) && this.t > .4) { if (!this.stamped) this.t = rows * .35 + .01; else this.done = true; }
  }
  draw(g, W, H) {
    const R = this.r, st = this.sim.stage, s = R.stats, cx = W / 2, rowsY = 52;
    frame(g, W, H, 'STAGE ' + (st.num || st.id) + ' CLEAR', this.t);
    txt(g, st.name, cx, 38, '#9fe3ff', { align: 'center' });
    const rows = [['TIME', Math.floor(s.time / 60) + "'" + pad2(Math.floor(s.time % 60)) + '"'], ['ACCURACY', Math.round(R.acc * 100) + '%'], ['KILLS', String(s.kills)], ['HEADSHOTS', String(s.heads)], ['COVER SAVES', String(s.saves)], ['LIVES LOST', String(s.lost)], ['ACCURACY BONUS', '+' + fmt(R.accBonus)], ['NO-DAMAGE BONUS', R.noDamage ? '+' + fmt(R.noDamage) : '-'], ['SCORE', fmt(this.sim.players[this.i].score)]];
    rows.forEach((r, k) => { if (this.t < k * .35) return; const y = rowsY + k * 15; txt(g, r[0], cx - 110, y, '#c8d4ec', { scale: 1 }); txt(g, r[1], cx + 60, y - 2, k === 8 ? '#ffd36a' : '#ffffff', { scale: 2, align: 'right' }); });
    if (this.stamped) { const k = Math.min(1, (this.t - 9 * .35) * 6), sc = Math.round(8 - 3 * k); E.ui.box(g, cx + 76, rowsY + 18, 64, 64, { bg: ['#3a0a14', '#14060a'], border: '#ffd36a' }); F.title(g, R.rank, cx + 108, rowsY + 30, { scale: sc, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); txt(g, 'RANK', cx + 108, rowsY + 86, '#ffd36a', { align: 'center' }); }
    if (this.stamped && (this.t * 2 | 0) % 2) txt(g, 'PRESS ' + TC.label(TC.game.input, 'confirm') + ' TO CONTINUE', cx, H - 22, '#ffffff', { align: 'center' });
  }
}
TC.Results = Results;
