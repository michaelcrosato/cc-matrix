/* ui.js: the bright round canvas UI. Pills on every game screen, one prompt helper, the session Card and Results. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const I = () => game.input;
const INK = '#20404c', ACC = '#2cc6e6', ACC2 = '#14a8c8', MUTED = '#5f7f8a';
const txt = G.txt = (g, s, x, y, c = INK, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
G.wrapText = (g, s, x, y, w, c = INK, o = {}) => { const lines = E.font.wrap(String(s), w, { scale: o.scale || 1 }), lh = (E.font.lineHeight({ scale: o.scale || 1 }) || 9) + (o.gap === undefined ? 2 : o.gap); lines.forEach((l, i) => txt(g, l, x, y + i * lh, c, o)); return lines.length * lh; };

/* ---- Pills: white rounded pills, cyan focus that grows, a soft tick on move ---- */
class Pills {
  /** items: [{ label, sub, disabled, id }] or strings. o: { x, y (centre top; functions allowed), w, h, gap, layout: 'v' | 'h', onPick(i, item), onBack, cols, scale } */
  constructor(items, o = {}) { this.o = o; this.i = o.i || 0; this.set(items); this._mt = -1; this.t = 0; this.enabled = true; }
  set(items) { this.items = items.map(it => typeof it === 'string' ? { label: it } : it); if (this.i >= this.items.length) this.i = Math.max(0, this.items.length - 1); while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++; return this; }
  layout() {
    const o = this.o, W = game.W, H = game.H, n = this.items.length, scale = o.scale || 1, ph = o.h || (scale > 1 ? 24 : 20), gap = o.gap === undefined ? 5 : o.gap;
    const res = [];
    if (o.layout === 'h') {
      const pw = o.w || Math.min(120, (W - 24 - gap * (n - 1)) / n), tot = pw * n + gap * (n - 1), x0 = (o.x === undefined ? W / 2 : (typeof o.x === 'function' ? o.x() : o.x)) - tot / 2, y = typeof o.y === 'function' ? o.y() : (o.y === undefined ? H - 40 : o.y);
      for (let i = 0; i < n; i++) res.push({ x: Math.round(x0 + i * (pw + gap)), y: Math.round(y), w: Math.round(pw), h: ph });
    } else {
      const pw = o.w || Math.min(190, W - 24), cx = o.x === undefined ? W / 2 : (typeof o.x === 'function' ? o.x() : o.x), y0 = typeof o.y === 'function' ? o.y() : (o.y === undefined ? H / 2 - n * (ph + gap) / 2 : o.y);
      for (let i = 0; i < n; i++) res.push({ x: Math.round(cx - pw / 2), y: Math.round(y0 + i * (ph + gap)), w: Math.round(pw), h: ph });
    }
    return res;
  }
  _step(d) { const n = this.items.length; let k = this.i; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; G.A.sfx('tick'); this.t = 0; } }
  /** returns true if it took input. Everyone's input may steer it: inputs defaults to all players */
  update(dt) {
    this.t += dt; G.activePills = this; if (!this.enabled) return false;
    const inp = I(), rects = this.layout(), v = this.o.layout !== 'h';
    const prev = v ? 'up' : 'left', next = v ? 'down' : 'right';
    if (inp.repeat(prev, .35, .14)) this._step(-1);
    if (inp.repeat(next, .35, .14)) this._step(1);
    if (v && this.o.alsoSide) { if (inp.repeat('left', .35, .14)) this._step(-1); if (inp.repeat('right', .35, .14)) this._step(1); }
    const hit = p => { if (!p) return -1; for (let i = 0; i < rects.length; i++) { const r = rects[i]; if (p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) return i; } return -1; };
    if (inp.mouse && inp.mouse.t !== this._mt) { this._mt = inp.mouse.t; const k = hit(inp.pointer()); if (k >= 0 && !this.items[k].disabled && k !== this.i) { this.i = k; G.A.sfx('tick'); this.t = 0; } }
    const ck = inp.clicked(), kc = hit(ck);
    if (ck && kc >= 0 && !this.items[kc].disabled) { this.i = kc; this._pick(); return true; }
    if (inp.pressed('confirm') && this.items[this.i] && !this.items[this.i].disabled) { this._pick(); return true; }
    if (inp.pressed('cancel') && this.o.onBack) { G.A.sfx('back'); inp.consumeAll(); this.o.onBack(); return true; }
    return false;
  }
  _pick() { G.A.sfx('ok'); I().consumeAll(); const it = this.items[this.i]; if (this.o.onPick) this.o.onPick(this.i, it); }
  draw(g) {
    const rects = this.layout(), scale = this.o.scale || 1;
    this.items.forEach((it, i) => {
      const r = rects[i], foc = i === this.i && this.enabled, grow = foc ? 2 : 0;
      G.panel(g, r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, { r: Math.min(9, (r.h + grow * 2) >> 1), bg: foc ? ACC : it.disabled ? '#eef3f4' : '#fbfdfd', border: foc ? ACC2 : '#c8dde2' });
      const col = foc ? '#ffffff' : it.disabled ? '#a8bcc2' : INK, ty = r.y + (r.h - 7 * scale) / 2 - (it.sub ? 4 : 0);
      if (it.icon) it.icon(g, r, foc);
      txt(g, it.label, r.x + r.w / 2 + (it.iconW || 0), ty, col, { align: 'center', scale, shadow: foc ? ACC2 : null });
      if (it.sub) txt(g, it.sub, r.x + r.w / 2, ty + 9, foc ? '#e8fbff' : MUTED, { align: 'center' });
    });
  }
}
G.Pills = Pills;

/* ---- prompts come only from here. They show what the player used last ---- */
const devNow = G.devNow = (inp = I()) => inp.lastDevice === 'gamepad' ? 'gamepad' : 'kb';
const LEAN = { gamepad: 'Left stick', keyboard: 'WASD', mouse: 'Move the mouse' };
G.leanSource = () => { const inp = I(); if (inp.lastDevice === 'gamepad') return 'gamepad'; const r = G.activeReader; if (r) return r.source; return inp.lastDevice === 'mouse' || (inp.mouse && inp.mouse.active && inp.lastDevice !== 'keyboard') ? 'mouse' : 'keyboard'; };
/** the word for an action on the device used last */
G.keyLabel = (action, inp = I()) => {
  if (action === 'lean') return LEAN[G.leanSource()];
  if (action === 'leanx') return { gamepad: 'Left stick', keyboard: 'A / D', mouse: 'Move the mouse' }[G.leanSource()];
  if (inp.lastDevice === 'gamepad') return inp.label(action, 'gamepad');
  const k = inp.label(action, 'keyboard'), mp = inp.map[action] && inp.map[action].some(c => c.startsWith('Mouse')) ? inp.label(action, 'mouse') : null;
  return mp && mp !== k ? k + ' / ' + mp.replace('Left click', 'Click').replace('Right click', 'R-click') : k;
};
const chip = (g, x, y, label, verb) => {
  const lw = E.font.width(label) + 8, vw = E.font.width(verb) + 7, h = 13;
  const x0 = Math.round(x - lw - vw), y0 = Math.round(y);
  G.panel(g, x0, y0, lw + vw, h, { r: 5, bg: '#fbfdfd', border: '#c8dde2', shadow: true });
  G.panel(g, x0 + 1, y0 + 1, lw - 1, h - 2, { r: 4, bg: ACC2, border: ACC2, shadow: false });
  txt(g, label, x0 + lw / 2, y0 + 3, '#ffffff', { align: 'center' }); txt(g, verb, x0 + lw + 3, y0 + 3, INK);
  return lw + vw;
};
/** prompt('jump', 'Jump'), drawn at the bottom right; several stack leftward. list: [[action, verb], ...] */
G.prompts = (g, list, o = {}) => { const x0 = (o.x === undefined ? game.W - 8 : o.x), minX = o.x === undefined ? game.W / 2 + 32 : -1e9; let x = x0, y = o.y === undefined ? game.H - 18 : o.y; for (const [a, v] of list) { const lab = typeof a === 'string' && a.startsWith('=') ? a.slice(1) : G.keyLabel(a), w = E.font.width(lab) + 8 + E.font.width(v) + 7; if (x - w < minX && x !== x0) { x = x0; y -= 16; } x -= chip(g, x, y, lab, v) + 4; } };

/* ---- HUD: the timer, the session's top line ---- */
G.drawTimer = (g, left, o = {}) => {
  const W = game.W, s = G.fmtTime(Math.ceil(left)), x = o.x === undefined ? W / 2 : o.x, y = o.y === undefined ? 6 : o.y;
  G.panel(g, x - 26, y, 52, 20, { r: 8 });
  txt(g, s, x, y + 3, left < 6 ? '#e0553a' : INK, { align: 'center', scale: 2 });
};
/** the top-left and top-right island HUD: day and pips, Spine Age and Gerald's count */
G.drawDayHud = (g) => {
  const s = G.S, day = G.DATA.dayOf(s.day), W = game.W;
  G.panel(g, 8, 8, 98, 28, { r: 7 });
  txt(g, 'Day ' + Math.min(s.day, s.day), 14, 12, ACC2, { shadow: null });
  txt(g, day.name, 14, 22, MUTED);
  if (!s.freePlay) for (let i = 0; i < 3; i++) { const on = i < s.session; px.disc(g, 82 + i * 8, 15, 3, on ? ACC : '#d6e2e5'); if (on) px.dot(g, 82 + i * 8, 14, '#ffffff'); }
  const ca = game.cornerArea(), right = ca && ca.y0 < 40 ? Math.floor(ca.x0) - 6 : W - 8;
  G.panel(g, right - 92, 8, 92, 28, { r: 7 });
  txt(g, 'Spine', right - 86, 12, MUTED); txt(g, G.spineShown(), right - 86, 22, INK);
  txt(g, 'Gerald', right - 44, 12, MUTED); txt(g, Math.floor(s.minutes) + ' min', right - 44, 22, INK);
};

/* ---- the session Card: one sentence, the controls for this device, star targets, your best ---- */
const CTRL = {
  lean: () => [['lean', 'Lean']], leanx: () => [['leanx', 'Lean']],
  breath: () => [['breath', 'Breathe in']],
  steps: () => [[I().lastDevice === 'gamepad' ? '=D-pad' : I().lastDevice === 'mouse' ? '=Buttons + wheel' : '=WASD / arrows', 'Step']],
  circle: () => [[I().lastDevice === 'gamepad' ? '=Left stick' : (G.leanSource() === 'mouse' ? '=Circle the mouse' : '=W D S A'), 'Circle']],
  catch: () => [['catchL', 'Left'], ['catchR', 'Right']],
  pace: () => [['paceL', 'Left'], ['paceR', 'Right']],
  steer: () => [['lean', 'Steer']],
  ski: () => [['lean', 'Lean to steer']],
  tilt: () => [['lean', 'Tilt']],
  walk: () => [['walk', 'Walk']],
  jump: () => [['jump', 'Jump']]
};
G.controlsFor = def => { const out = []; for (const c of def.controls || []) out.push(...(CTRL[c] ? CTRL[c]() : [])); return out; };

G.drawCard = (g, def, tierIdx, o = {}) => {
  const W = game.W, H = game.H, cw = Math.min(360, W - 24), ch = Math.min(H - 20, 176), x = (W - cw) / 2, y = 10;
  const tier = def.tiers[tierIdx];
  G.panel(g, x, y, cw, ch, { r: 8 });
  // the discipline's flag
  const dcol = { Stillness: '#b08be0', Strength: '#ff7a59', Cardio: '#2cc6e6', Balance: '#6fcf8e' }[def.discipline];
  G.panel(g, x + 10, y + 8, E.font.width(def.discipline) + 12, 13, { r: 5, bg: dcol, border: dcol, shadow: false });
  txt(g, def.discipline, x + 16, y + 11, '#ffffff');
  E.font.title(g, tier.name, W / 2, y + 26, { scale: 2, colors: ['#44d4f0', ACC2], align: 'center', depth: 1, depthColor: '#0d7f97', outline: false });
  const textW = cw - 34;
  const used = G.wrapText(g, tier.say || def.say, W / 2, y + 50, textW, INK, { align: 'center' });
  // controls
  const ctrl = G.controlsFor(def); let cx = W / 2; const widths = ctrl.map(([a, v]) => { const lab = a.startsWith && a.startsWith('=') ? a.slice(1) : G.keyLabel(a); return E.font.width(lab) + 8 + E.font.width(v) + 7 + 4; }), tot = widths.reduce((p, q) => p + q, 0);
  let xx = W / 2 + tot / 2; G.prompts(g, ctrl, { x: xx, y: y + 56 + used });
  // star targets and your best
  const sy = y + 76 + used, targets = G.starTargets(def);
  [0, 1, 2].forEach(i => { const sx = W / 2 + (i - 1) * 56; G.drawStars(g, sx, sy, i + 1, { scale: 1, gap: 9 }); txt(g, Math.round(targets[i] * 100) + '%', sx, sy + 10, MUTED, { align: 'center' }); });
  const b = (G.S.bestPct[def.id] || [])[tierIdx];
  txt(g, b === undefined ? G.DATA.lines.notes.notYet : 'Your best: ' + Math.round(b * 100) + '%', W / 2, sy + 22, ACC2, { align: 'center' });
};
G.starTargets = def => def.stars.map(s => s * G.DEV.stars);
G.starsFor = (def, pct) => { const t = G.starTargets(def); return pct >= t[2] ? 3 : pct >= t[1] ? 2 : pct >= t[0] ? 1 : 0; };

/* ---- a fade of white for transitions and scene dressing ---- */
G.title = (g, s, x, y, scale = 3) => E.font.title(g, s, Math.round(x), Math.round(y), { scale, colors: ['#7fe6f8', '#2cc6e6', '#14a8c8'], align: 'center', depth: 2, depthColor: '#0d7f97', outline: false });

/* ---- coins fly into Gerald ---- */
class Coins {
  constructor() { this.list = []; this.gx = 0; this.gy = 0; this.squash = 0; }
  burst(n, x, y) { for (let i = 0; i < n; i++) this.list.push({ x, y, t: -i * .09, d: .55 + G.cosmetic() * .2, sx: x + (G.cosmetic() - .5) * 60, sy: y - 20 * G.cosmetic() }); }
  update(dt, gx, gy) { this.gx = gx; this.gy = gy; this.squash = Math.max(0, this.squash - dt * 2); for (const c of this.list) { c.t += dt; if (c.t > c.d) { c.done = true; G.A.sfx('clink', { pitch: 1 + G.cosmetic() * .2 }); this.squash = .2; } } this.list = this.list.filter(c => !c.done); }
  draw(g) { for (const c of this.list) { if (c.t < 0) continue; const k = c.t / c.d, x = c.sx + (this.gx - c.sx) * k, y = c.sy + (this.gy - c.sy) * k - Math.sin(k * Math.PI) * 26; px.disc(g, x, y, 3, '#c8901a'); px.disc(g, x, y, 2, '#ffd166'); px.dot(g, x - 1, y - 1, '#fff3c8'); } }
}
G.Coins = Coins;

/* ---- a Results panel: stars stamp down one by one, minutes drop into Gerald, Tare comments ---- */
class Results {
  constructor(def, tierIdx, pct, stars, detail, earned, o = {}) { Object.assign(this, { def, tierIdx, pct, stars, detail, earned, o }); this.t = 0; this.shown = 0; this.coins = new Coins(); this.minShown = G.S.minutes - (earned ? earned.add : 0); this.tare = new G.TareBody(0, 0); this.coinsDone = false; this.pills = o.pills; }
  update(dt) {
    this.t += dt;
    const k = Math.floor((this.t - .35) / .35) + 1;
    if (k > this.shown && this.shown < this.stars) { this.shown++; G.A.sfx('stamp'); game.shake(.05); game.input.rumble(.3, .1); if (this.shown === this.stars) G.sting('star' + this.stars); }
    if (!this.coinsDone && this.t > .5 + this.stars * .35) { this.coinsDone = true; if (this.earned && this.earned.add > 0) this.coins.burst(Math.min(14, Math.ceil(this.earned.add * 4)), game.W / 2, game.H * .4); }
    this.minShown += (G.S.minutes - this.minShown) * Math.min(1, dt * 3);
    const gx = game.W / 2 + Math.min(150, game.W * .3), gy = game.H - 62;
    this.coins.update(dt, gx, gy - 24);
    if (this.pills && this.t > .8) this.pills.update(dt);
    return false;
  }
  draw(g) {
    const W = game.W, H = game.H, cw = Math.min(330, W - 24), ch = 118, x = (W - cw) / 2, y = 20;
    G.panel(g, x, y, cw, ch, { r: 8 });
    txt(g, this.def.tiers[this.tierIdx].name, W / 2, y + 7, ACC2, { align: 'center' });
    // stars stamp in big, scale falling
    for (let i = 0; i < 3; i++) { const sx = W / 2 + (i - 1) * 40, on = i < this.shown, age = this.t - .35 - i * .35, sc = on && age < .15 ? 4 : 3; E.font.text(g, '★', sx, y + 22 - (sc === 4 ? 3 : 0), on ? '#ffb020' : '#d6e2e5', { align: 'center', outline: false, scale: sc, shadow: on ? '#a06a10' : null }); }
    txt(g, Math.round(this.pct * 100) + '%', W / 2, y + 54, INK, { align: 'center', scale: 2 });
    if (this.detail) G.wrapText(g, this.detail, W / 2, y + 74, cw - 24, MUTED, { align: 'center' });
    if (this.earned) txt(g, '+' + this.earned.add.toFixed(1) + ' minutes', W / 2, y + 96, ACC2, { align: 'center' });
    const gx = W / 2 + Math.min(150, W * .3), gy = H - 62;
    G.drawGerald(g, gx, gy, 1.5, { squash: this.coins.squash, friend: G.S.minutes >= 30 });
    txt(g, this.minShown.toFixed(1) + ' min', gx, gy + 5, INK, { align: 'center', shadow: '#ffffff' });
    this.coins.draw(g);
    if (this.stars >= 3 && this.shown >= 3) { if (!this.conf) { this.conf = []; for (let i = 0; i < 46; i++) this.conf.push({ x: G.cosmetic() * W, y: -G.cosmetic() * 60, v: 30 + G.cosmetic() * 40, c: ['#ff7a59', '#2cc6e6', '#f5c84b', '#6fcf8e', '#f08fb0'][i % 5], k: G.cosmetic() * 6 }); } for (const q of this.conf) { q.y += q.v / 60; px.rect(g, q.x + Math.sin(game.real * 4 + q.k) * 4, q.y, 2, 3, q.c); } }
    if (this.pills) this.pills.draw(g);
  }
}
G.Results = Results;
})();
