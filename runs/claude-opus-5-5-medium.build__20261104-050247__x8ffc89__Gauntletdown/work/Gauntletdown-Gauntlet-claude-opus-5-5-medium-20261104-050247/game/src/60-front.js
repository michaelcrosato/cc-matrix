/* 60-front: title and main menu, class select ("CHOOSE YOUR FOOL"), How to Play, High Scores, About and Credits, the
 * touch-only notice. Every screen is big canvas pixel art, driven by any controller, the keys and the mouse (hover
 * focuses, click picks); Back is ○ / Esc / Backspace; 10 s idle starts the attract mode. */

/* ---- input across every player, and the idle clock ---- */
const anyP = a => game.players.some(p => p.pressed(a));
const anyRep = a => game.players.some(p => p.repeat(a, .3, .08));
const IDLE = { t: 0, px: null, raw: 0 };
// any key, button or wheel counts (bound or not): the DOM tells us, the gamepads are read each step
if (HAS_DOM) for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => { IDLE.raw = game.real; }, { passive: true, capture: true });
const rawInput = since => IDLE.raw > since || game.players.some(p => p.padPrev && p.padPrev.some(Boolean)) || (typeof navigator !== 'undefined' && navigator.getGamepads && [...navigator.getGamepads()].some(g => g && g.buttons.some(b => b.pressed)));
function idleTick(dt) {
  const I = game.input, ptr = I.pointer();
  let moved = false;
  if (ptr && IDLE.px && Math.hypot(ptr[0] - IDLE.px[0], ptr[1] - IDLE.px[1]) > 4) moved = true;
  if (ptr) IDLE.px = ptr;
  const pad = game.players.some(p => p.padMove && Math.hypot(p.padMove[0], p.padMove[1]) > .3 || p.padAim);
  if (moved || pad || I.anyPressed() || I.clicked() || I.held.size || I.zoom() !== 1 || rawInput(game.real - dt - .001)) IDLE.t = 0; else IDLE.t += dt;
  return IDLE.t;
}
const promptKey = (a, inp = game.input) => inp.label(a);
const fillKeys = (s, inp = game.input) => s.replace('{move}', inp.lastDevice === 'gamepad' ? 'the left stick' : 'W A S D').replace('{aim}', inp.lastDevice === 'gamepad' ? 'the right stick' : 'the mouse')
  .replace('{fire}', promptKey('fire', inp)).replace('{plant}', promptKey('plant', inp)).replace('{magic}', promptKey('magic', inp)).replace('{join}', inp.lastDevice === 'gamepad' ? 'Options on a free controller' : 'Options on a free controller, or 2 on the keyboard,');

/* ---- a big menu: keys, pads and the mouse ---- */
function bigMenu(items, o = {}) {
  return {
    items, i: 0, boxes: [], scale: o.scale || 2, y: o.y || 100,
    update() {
      const its = this.items.filter(Boolean);
      if (anyRep('up')) { this.i = (this.i + its.length - 1) % its.length; happen('ui', { k: 'move' }); }
      if (anyRep('down')) { this.i = (this.i + 1) % its.length; happen('ui', { k: 'move' }); }
      const I = game.input, ptr = I.pointer(), clk = I.clicked();
      if (ptr && (ptr[0] !== this.px || ptr[1] !== this.py)) { this.px = ptr[0]; this.py = ptr[1]; const k = this.boxes.findIndex(b => ptr[0] >= b[0] && ptr[0] < b[0] + b[2] && ptr[1] >= b[1] && ptr[1] < b[1] + b[3]); if (k >= 0 && k !== this.i) { this.i = k; happen('ui', { k: 'move' }); } }
      if (clk) { const k = this.boxes.findIndex(b => clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3]); if (k >= 0) { this.i = k; happen('ui', { k: 'pick' }); return its[k]; } }
      if (anyP('confirm') || anyP('start')) { happen('ui', { k: 'pick' }); return its[this.i]; }
      return null;
    },
    draw(g, W0) {
      const its = this.items.filter(Boolean), lh = 9 * this.scale + 4; this.boxes = [];
      its.forEach((it, k) => {
        const y = this.y + k * lh, on = k === this.i, w = twidth(it.label, { scale: this.scale }) + 24, x = Math.round(W0 / 2 - w / 2);
        this.boxes.push([x, y - 3, w, lh - 2]);
        if (on) { px.rect(g, x, y - 3, w, lh - 2, '#4a2a1a'); px.rect(g, x, y - 3, w, 1, '#e8a840'); px.rect(g, x, y + lh - 6, w, 1, '#8a5a20'); }
        otxt(g, (on ? '▸ ' : '') + it.label, W0 / 2, y, on ? '#ffe08a' : '#d8c8b0', { align: 'center', scale: this.scale });
      });
    }
  };
}

/* ---- touch-only devices: no touch controls; a notice and a Settings button ---- */
const TOUCH = { only: false, dismissed: false };
function detectTouchOnly() {
  if (!HAS_DOM || TOUCH.dismissed) return false;
  const fine = window.matchMedia ? matchMedia('(any-pointer: fine)').matches : true;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  return !fine && (navigator.maxTouchPoints || 0) > 0 && !pads;
}
if (HAS_DOM) {
  TOUCH.only = detectTouchOnly();
  const off = () => { TOUCH.only = false; TOUCH.dismissed = true; };
  addEventListener('gamepadconnected', off); addEventListener('keydown', off, { once: true });
}

/* ---- the title (with the main menu) ---- */
const LOGO_COLORS = ['#fff4c8', '#ffd36a', '#c87a2a', '#6a3a1a'];
scenes.title = {
  view: 'threequarter', touch: [],
  enter() {
    IDLE.t = 0; game.input.touchEnabled = false; if (S.touch !== 'off') try { S.set('touch', 'off'); } catch (e) { /* none */ }
    SC.title = { t: 0, menu: bigMenu(titleItems(), { y: 0 }), state: 'menu', fall: [] };
    music('title'); L.enabled = false; game.allowJoin(false);
    PARTY.length = 0; W = null;
  },
  update(dt) {
    const T0 = SC.title; T0.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (TOUCH.only) {   // the notice: a tap on SETTINGS opens the settings; taps don't start a game
      const c = game.input.clicked(); if (c && T0.setBtn && c[0] >= T0.setBtn[0] && c[0] < T0.setBtn[0] + T0.setBtn[2] && c[1] >= T0.setBtn[1] && c[1] < T0.setBtn[1] + T0.setBtn[3]) game.menu('settings');
      return;
    }
    T0.menu.items = titleItems();
    const pick = T0.menu.update();
    if (pick) pick.go();
  },
  draw(r) { drawTitleBack(r, SC.title.t); r.overlay(g => drawTitleFront(g, r)); }
};
function titleItems() {
  return [
    store.get('d2', false) && { label: 'DESCENT II', go: () => game.go('select', { loop: 2 }) },
    { label: 'START DESCENT', go: () => game.go('select', { loop: 1 }) },
    { label: 'HOW TO PLAY', go: () => game.go('howto', { back: 'title' }) },
    { label: 'HIGH SCORES', go: () => game.go('scores', { back: 'title' }) },
    { label: 'SETTINGS', go: () => game.menu('settings') },
    { label: 'ABOUT & CREDITS', go: () => game.go('about', {}) }
  ];
}
function drawTitleFront(g, r) {
  const T0 = SC.title, W0 = r.W, H0 = r.H, sc = W0 > 520 ? 4 : 3;
  E.font.title(g, 'GAUNTLETDOWN', W0 / 2, Math.round(H0 * .14), { scale: sc, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
  otxt(g, 'FOUR FOOLS. ONE HUNGRY DUNGEON.', W0 / 2, Math.round(H0 * .14) + 9 * sc + 10, '#e8c8a0', { align: 'center' });
  if (TOUCH.only) {
    const w = Math.min(W0 - 30, 300), x = (W0 - w) / 2, y = H0 * .45;
    E.ui.box(g, x, y, w, 82, { bg: ['#2a1a14', '#120a08'], border: '#e8a840' });
    otxt(g, 'Controller or keyboard required', W0 / 2, y + 10, '#ffe08a', { align: 'center', scale: 1 });
    txt(g, 'Connect a controller or a keyboard to play.', W0 / 2, y + 26, '#d8c8b0', { align: 'center' });
    const bw = 120, bx = (W0 - bw) / 2, by = y + 44; T0.setBtn = [bx, by, bw, 26];
    px.rect(g, bx, by, bw, 26, '#6a3a1a'); px.rect(g, bx, by, bw, 1, '#e8a840'); otxt(g, 'SETTINGS', W0 / 2, by + 7, '#ffe08a', { align: 'center', scale: 2 });
  } else {
    T0.menu.y = Math.round(H0 * .45); const mh = T0.menu.items.filter(Boolean).length * 22 + 6; px.blend(g, .55, 'normal', () => px.rect(g, W0 / 2 - 110, T0.menu.y - 8, 220, mh, '#0a0506')); T0.menu.draw(g, W0);
    const I = game.input;
    txt(g, '↑↓ choose   ' + I.label('confirm') + ' pick   ' + (I.lastDevice === 'gamepad' ? 'Options' : '2') + ' on a free controller joins at the class select', W0 / 2, H0 - 22, '#a89880', { align: 'center' });
  }
  txt(g, 'v' + VERSION + '  -  my-3D2dge v' + E.version, 6, H0 - 10, '#6a5a50');
  txt(g, 'An homage to Gauntlet (1985)', W0 - 6, H0 - 10, '#6a5a50', { align: 'right' });
}

/* ---- class select: CHOOSE YOUR FOOL ---- */
scenes.select = {
  view: 'threequarter', touch: [],
  enter(d) {
    SC.sel = { t: 0, loop: d.loop || 1, cur: [{ inp: game.input, i: 0, lock: false }], rigs: HERO_ORDER.map(c => get('heroes', c).rig()), boxes: [], startT: 0 };
    for (const p of game.players.slice(1)) SC.sel.cur.push({ inp: p, i: SC.sel.cur.length % 4, lock: false });
    game.allowJoin({ max: 4, onJoin: (inp) => { inp.glyphs = S.padGlyphs; SC.sel.cur.push({ inp, i: firstFree(), lock: false }); happen('ui', { k: 'join' }); } });
    IDLE.t = 0;
  },
  exit() { game.allowJoin(false); },
  update(dt) {
    const s = SC.sel; s.t += dt;
    if (idleTick(dt) > 10 && !s.cur.some(c => c.lock)) { startAttract(); return; }
    const I = game.input, ptr = I.pointer(), clk = I.clicked();
    for (const c of s.cur) {
      const p = c.inp;
      if (!c.lock) {
        if (p.repeat('left', .3, .12)) { c.i = (c.i + 3) % 4; happen('ui', { k: 'move' }); }
        if (p.repeat('right', .3, .12)) { c.i = (c.i + 1) % 4; happen('ui', { k: 'move' }); }
        if (p === I && ptr && (ptr[0] !== s.px || ptr[1] !== s.py)) { s.px = ptr[0]; s.py = ptr[1]; const k = s.boxes.findIndex(b => ptr[0] >= b[0] && ptr[0] < b[0] + b[2] && ptr[1] >= b[1] && ptr[1] < b[1] + b[3]); if (k >= 0 && k !== c.i) { c.i = k; happen('ui', { k: 'move' }); } }
        const ci = p === I && clk ? s.boxes.findIndex(b => clk[0] >= b[0] && clk[0] < b[0] + b[2] && clk[1] >= b[1] && clk[1] < b[1] + b[3]) : -1;
        if (ci >= 0) c.i = ci;
        if ((p.pressed('fire') || p.pressed('confirm') || ci >= 0) && s.t > .3) {
          if (s.cur.some(o => o !== c && o.lock && o.i === c.i)) happen('ui', { k: 'back' });
          else { c.lock = true; happen('ui', { k: 'pick' }); voiceSay(get('heroes', HERO_ORDER[c.i]).quip.split('.')[0], HERO_ORDER[c.i]); }
        }
        if (p.pressed('cancel')) { if (p === I) { game.go('title'); return; } s.cur = s.cur.filter(o => o !== c); game.removePlayer(p); }
      } else if (p.pressed('cancel')) { c.lock = false; happen('ui', { k: 'back' }); }
    }
    if (s.cur.every(c => c.lock)) { s.startT += dt; if (s.startT > .7 || anyP('start')) begin(); } else s.startT = 0;
    function begin() {
      const order = s.cur.slice();
      startDescent(order.map(c => HERO_ORDER[c.i]), { inputs: order.map(c => c.inp), loop: s.loop });
    }
  },
  draw(r) {
    drawTitleBack(r, SC.sel.t, true);
    r.overlay(g => drawSelect(g, r));
  }
};
const firstFree = () => { for (let i = 0; i < 4; i++) if (!SC.sel.cur.some(c => c.i === i)) return i; return 0; };
function drawSelect(g, r) {
  const s = SC.sel, W0 = r.W, H0 = r.H, cw = Math.min(100, Math.floor((W0 - 20) / 4) - 4), gap = 4, x0 = Math.round((W0 - (cw * 4 + gap * 3)) / 2), y0 = 34, ch = H0 - y0 - 30;
  E.font.title(g, 'CHOOSE YOUR FOOL', W0 / 2, 8, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
  s.boxes = [];
  HERO_ORDER.forEach((cls, i) => {
    const D = get('heroes', cls), x = x0 + i * (cw + gap), here = s.cur.filter(c => c.i === i), locked = s.cur.find(c => c.i === i && c.lock);
    s.boxes.push([x, y0, cw, ch]);
    E.ui.box(g, x, y0, cw, ch, { bg: locked ? ['#3a2a1a', '#1a1008'] : ['#241a24', '#100a10'], border: here.length ? (here[0].inp.color ? D.color : D.color) : '#4a3a3a' });
    const rig = s.rigs[i];
    rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(game.real * .6 + i) * .9, attack: here.length && (game.real % 2.4) < .5 ? E.move(D.moves[0], (game.real % 2.4) / .5, (game.real % 2.4) < .2 ? 'wind' : (game.real % 2.4) < .3 ? 'active' : 'recover') : null, pose: locked ? 'cheer' : null });
    rig.draw(g, x + cw / 2, y0 + 70, r.view);
    otxt(g, D.name, x + cw / 2, y0 + 78, D.color, { align: 'center' });
    txt(g, D.who, x + cw / 2, y0 + 88, '#c8b8a0', { align: 'center', font: 'tiny' });
    D.pips.forEach((v, k) => {
      const yy = y0 + 98 + k * 9; txt(g, PIP_NAMES[k], x + 5, yy, '#a89880', { font: 'tiny' });
      for (let q = 0; q < 5; q++) px.rect(g, x + cw - 40 + q * 7, yy, 5, 5, q < v ? D.color : '#3a2e2e');
    });
    const lines = E.font.wrap(D.quip, cw - 8, { font: 'tiny' });
    lines.slice(0, 4).forEach((l, k) => txt(g, l, x + cw / 2, y0 + 146 + k * 7, '#e8d8b8', { align: 'center', font: 'tiny' }));
    here.forEach((c, k) => { const lab = 'P' + (s.cur.indexOf(c) + 1); px.rect(g, x + 3 + k * 18, y0 + 3, 16, 9, c.lock ? D.color : '#2a2a2a'); txt(g, lab, x + 11 + k * 18, y0 + 4, c.lock ? '#000000' : '#ffffff', { align: 'center' }); });
    if (locked) otxt(g, here.length > 1 ? 'TAKEN' : 'READY', x + cw / 2, y0 + ch - 12, '#7ae87a', { align: 'center' });
  });
  const I = game.input;
  const all = s.cur.every(c => c.lock);
  txt(g, all ? 'DESCENDING...' : '←→ choose   ' + I.label('fire') + ' lock in   ' + I.label('cancel') + ' back      ' + (s.cur.length < 4 ? (I.lastDevice === 'gamepad' ? 'Options' : '2') + ' on a free controller or the keyboard: JOIN' : ''), W0 / 2, H0 - 14, all ? '#7ae87a' : '#c8b8a0', { align: 'center' });
}

/* ---- How to Play: eight paged cards ---- */
scenes.howto = {
  view: 'threequarter', touch: [],
  enter(d) { SC.how = { i: 0, back: d.back || 'title', t: 0, rig: get('heroes', 'berserker').rig(), ghost: null }; IDLE.t = 0; },
  update(dt) {
    const h = SC.how; h.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (anyRep('left')) { h.i = (h.i + HOWTO.length - 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    if (anyRep('right') || anyP('confirm')) { h.i = (h.i + 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    const c = game.input.clicked(); if (c) { if (c[0] < (game.r ? game.r.W : 400) / 2) h.i = (h.i + HOWTO.length - 1) % HOWTO.length; else h.i = (h.i + 1) % HOWTO.length; happen('ui', { k: 'move' }); }
    if (anyP('cancel')) { happen('ui', { k: 'back' }); game.go(h.back); }
  },
  draw(r) { drawTitleBack(r, SC.how.t, true); r.overlay(g => drawHowto(g, r)); }
};
function drawHowto(g, r) {
  const h = SC.how, W0 = r.W, H0 = r.H, [title, body, pic] = HOWTO[h.i], w = Math.min(W0 - 24, 400), x = (W0 - w) / 2, y = 20, ht = H0 - 52;
  E.ui.box(g, x, y, w, ht, { bg: ['#2a1a14', '#100806'], border: '#e8a840' });
  otxt(g, title, W0 / 2, y + 8, '#ffe08a', { align: 'center', scale: 2 });
  const lines = E.font.wrap(fillKeys(body), w - 24, {});
  lines.forEach((l, k) => txt(g, l, W0 / 2, y + 30 + k * 10, '#f0e0c8', { align: 'center' }));
  drawHowPic(g, pic, W0 / 2, y + 40 + lines.length * 10 + 40, h.t);
  for (let k = 0; k < HOWTO.length; k++) px.rect(g, W0 / 2 - HOWTO.length * 5 + k * 10, y + ht - 10, 6, 3, k === h.i ? '#ffe08a' : '#5a4030');
  const I = game.input;
  txt(g, '← → page   ' + I.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}
function drawHowPic(g, pic, cx, cy, t) {
  const rig = SC.how.rig, ph = t % 1.6;
  if (pic === 'move' || pic === 'fire' || pic === 'gauntlet' || pic === 'friends') {
    const n = pic === 'friends' ? 4 : 1;
    for (let k = 0; k < n; k++) {
      const rg = n > 1 ? (SC.how['r' + k] || (SC.how['r' + k] = get('heroes', HERO_ORDER[k]).rig())) : rig;
      rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: pic === 'move' ? 40 : 0, vy: 0, facing: pic === 'move' ? Math.sin(t) * 1.5 : 0, attack: pic === 'fire' ? E.move(ph < .8 ? 'throw' : 'overhead', (ph % .8) / .8, (ph % .8) < .25 ? 'wind' : (ph % .8) < .4 ? 'active' : 'recover') : null, pose: pic === 'gauntlet' || pic === 'friends' ? 'cheer' : null });
      rg.draw(g, cx + (k - (n - 1) / 2) * 36, cy, SC.view || game.view);
    }
    if (pic === 'gauntlet') px.sprite(g, SPR.gauntlet, cx + 22, cy - 40 + Math.sin(t * 3) * 3);
    if (pic === 'fire') { const sx = cx + 14 + (ph % .8) * 120; px.sprite(g, SPR.shot_axe, sx, cy - 16); }
  } else if (pic === 'food') { [SPR.roast, SPR.loaf, SPR.cider, SPR.stew].forEach((s, k) => { px.sprite(g, s, cx - 60 + k * 36, cy - 14); txt(g, ['+100', '+50', '+100', '-50'][k], cx - 54 + k * 36, cy + 4, k === 3 ? '#9ae84a' : '#ffe08a', { align: 'center' }); }); }
  else if (pic === 'magic') { px.sprite(g, SPR.flask, cx - 4, cy - 20); const rr = (t % 1) * 60; for (let a = 0; a < 24; a++) px.dot(g, cx + Math.cos(a / 24 * TAU) * rr, cy - 12 + Math.sin(a / 24 * TAU) * rr * .5, '#c8e8ff'); }
  else if (pic === 'stairs') { px.sprite(g, SPR.key, cx - 50, cy - 14); px.sprite(g, SPR.stairsIcon, cx + 20, cy - 18); txt(g, '→', cx - 14, cy - 10, '#ffe08a'); }
  else if (pic === 'gens') { px.sprite(g, SPR.urnIcon, cx - 40, cy - 20); px.sprite(g, SPR.ghostIcon, cx + 10 + Math.sin(t * 2) * 6, cy - 22); px.sprite(g, SPR.ghostIcon, cx + 34, cy - 12 + Math.cos(t * 2) * 4); }
}

/* ---- High Scores ---- */
const SCORES = { list: () => store.get('scores', []), add(e) { const l = this.list(); l.push(e); l.sort((a, b) => b.score - a.score); store.set('scores', l.slice(0, 10)); }, qualifies(s) { const l = this.list(); return s > 0 && (l.length < 10 || s > l[l.length - 1].score); } };
scenes.scores = {
  view: 'threequarter', touch: [],
  enter(d) { SC.sc = { t: 0, back: d.back || 'title', hi: d.hi, attract: !!d.attract }; if (!d.attract) music('name'); IDLE.t = 0; },
  update(dt) {
    SC.sc.t += dt;
    if (SC.sc.attract) { attractStep(dt); return; }
    if (idleTick(dt) > 10) { startAttract(); return; }
    if (anyP('cancel') || anyP('confirm') || game.input.clicked() || (SC.sc.hi && SC.sc.t > 8)) { happen('ui', { k: 'back' }); game.go(SC.sc.back); }
  },
  draw(r) { drawTitleBack(r, SC.sc.t, true); r.overlay(g => drawScores(g, r)); }
};
function drawScores(g, r) {
  const W0 = r.W, H0 = r.H, l = SCORES.list(), w = Math.min(W0 - 24, 330), x = (W0 - w) / 2;
  E.font.title(g, 'HIGH SCORES', W0 / 2, 10, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
  E.ui.box(g, x, 32, w, H0 - 56, { bg: ['#1e1410', '#0a0604'], border: '#8a5a20', alpha: .9 });
  if (!l.length) otxt(g, 'NO ONE HAS COME BACK UP. YET.', W0 / 2, 100, '#d8c8b0', { align: 'center' });
  l.forEach((e, k) => {
    const y = 42 + k * 16, on = SC.sc.hi && e.t === SC.sc.hi;
    if (on) px.rect(g, x + 4, y - 3, w - 8, 14, '#4a2a1a');
    otxt(g, String(k + 1).padStart(2, ' '), x + 12, y, '#a89880', { scale: 1 });
    otxt(g, e.name, x + 34, y, on ? '#ffe08a' : '#f0e0c8', { scale: 2 });
    const D = get('heroes', e.cls); if (D) txt(g, D.name, x + 92, y + 3, D.color);
    txt(g, 'FLOOR ' + e.floor + (e.cont ? '  -  ' + e.cont + ' CONT' : ''), x + 170, y + 3, '#a89880');
    otxt(g, String(e.score), x + w - 12, y, '#ffe08a', { align: 'right', scale: 2 });
  });
  if (!SC.sc.attract) txt(g, game.input.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}

/* ---- About and Credits: paged ---- */
scenes.about = {
  view: 'threequarter', touch: [],
  enter() { SC.ab = { i: 0, t: 0, scroll: 0 }; IDLE.t = 0; },
  update(dt) {
    const a = SC.ab; a.t += dt;
    if (idleTick(dt) > 10) { startAttract(); return; }
    const pages = aboutPages();
    if (anyRep('left')) { a.i = (a.i + pages.length - 1) % pages.length; a.scroll = 0; happen('ui', { k: 'move' }); }
    if (anyRep('right') || anyP('confirm')) { a.i = (a.i + 1) % pages.length; a.scroll = 0; happen('ui', { k: 'move' }); }
    if (anyRep('down')) a.scroll++; if (anyRep('up')) a.scroll = Math.max(0, a.scroll - 1);
    const z = game.input.zoom(); if (z < 1) a.scroll++; else if (z > 1) a.scroll = Math.max(0, a.scroll - 1);
    const c = game.input.clicked(); if (c) { a.i = (a.i + (c[0] < (game.r ? game.r.W : 400) / 2 ? pages.length - 1 : 1)) % pages.length; a.scroll = 0; }
    if (anyP('cancel')) { happen('ui', { k: 'back' }); game.go('title'); }
  },
  draw(r) { drawTitleBack(r, SC.ab.t, true); r.overlay(g => drawAbout(g, r)); }
};
function aboutPages() { return [['CREDITS', ABOUT.credits], ['SOURCE INFORMATION', ABOUT.source], ['TESTING FEEDBACK', ABOUT.testing], ['ENGINE FEEDBACK', ABOUT.engine], ['PROMPT FEEDBACK', ABOUT.prompt]]; }
function drawAbout(g, r) {
  const a = SC.ab, W0 = r.W, H0 = r.H, pages = aboutPages(), [title, paras] = pages[a.i], w = Math.min(W0 - 20, 420), x = (W0 - w) / 2, y = 18, ht = H0 - 46;
  E.ui.box(g, x, y, w, ht, { bg: ['#1e1410', '#0a0604'], border: '#e8a840' });
  otxt(g, title, W0 / 2, y + 7, '#ffe08a', { align: 'center', scale: 2 });
  const lines = [];
  for (const p of paras) { for (const l of E.font.wrap(p, w - 20, {})) lines.push(l); lines.push(''); }
  const vis = Math.floor((ht - 40) / 9); a.scroll = Math.min(a.scroll, Math.max(0, lines.length - vis));
  lines.slice(a.scroll, a.scroll + vis).forEach((l, k) => txt(g, l, x + 10, y + 28 + k * 9, '#f0e0c8'));
  if (lines.length > vis) txt(g, '↑↓ scroll', x + w - 8, y + ht - 10, '#8a7a60', { align: 'right' });
  for (let k = 0; k < pages.length; k++) px.rect(g, W0 / 2 - pages.length * 5 + k * 10, y + ht - 8, 6, 3, k === a.i ? '#ffe08a' : '#5a4030');
  txt(g, '← → page   ' + game.input.label('cancel') + ' back', W0 / 2, H0 - 14, '#a89880', { align: 'center' });
}
