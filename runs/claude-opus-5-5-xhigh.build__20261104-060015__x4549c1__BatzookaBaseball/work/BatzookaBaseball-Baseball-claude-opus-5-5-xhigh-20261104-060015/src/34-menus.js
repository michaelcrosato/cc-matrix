/* =============================================================================
 * 34-menus: the 10-foot front end. The CardMenu widget (big cards, at most 7,
 * the focus obvious: it grows, glows and bobs; the stick, D-pad, keys and the
 * mouse's hover and click all work), our settings, the pause items, the title
 * (with the touch-only card), results, the Playbook, About/Credits, the gallery.
 * ========================================================================== */
BZ.CardMenu = class CardMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.t = 0; this.rects = []; this.ripple = 0; this.cols = o.cols || 1; while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++; }
  /** returns { pick: index } | { cancel: true } | null */
  update(dt, players) {
    this.t += dt; this.ripple = Math.max(0, this.ripple - dt);
    const P = players || BZ.game.players, n = this.items.length;
    const move = d => { let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled || this.o.allowDisabled) break; } if (j !== this.i) { this.i = j; BZ.sfx('select'); } };
    for (const I of P) {
      if (I.repeat('down')) move(this.cols > 1 ? this.cols : 1); if (I.repeat('up')) move(this.cols > 1 ? -this.cols : -1);
      if (this.cols > 1) { if (I.repeat('right')) move(1); if (I.repeat('left')) move(-1); }
      else if (this.o.leftRight) { if (I.repeat('right')) { this.lr = 1; return { lr: 1, i: this.i }; } if (I.repeat('left')) { this.lr = -1; return { lr: -1, i: this.i }; } }
      if (I.pressed('confirm') || I.pressed('south') && !(I.held && I.held.has && I.held.has('Mouse0'))) { const it = this.items[this.i]; if (it && !it.disabled) { BZ.sfx('confirm'); this.ripple = .3; I.consumeAll && I.consumeAll(); return { pick: this.i, input: I }; } BZ.sfx('cancel'); }
      if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); I.consumeAll && I.consumeAll(); return { cancel: true, input: I }; }
    }
    // the mouse: hover moves the focus, a click picks (not on a touch-only device)
    const I = BZ.game.input;
    if (!BZ.touchOnly && I.lastDevice === 'mouse') {
      const p = I.pointer && I.pointer();
      if (p) this.rects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && this.i !== k && !this.items[k].disabled) { this.i = k; BZ.sfx('select'); } });
      const c = I.clicked && I.clicked();
      if (c) for (let k = 0; k < this.rects.length; k++) { const rc = this.rects[k]; if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3] && !this.items[k].disabled) { this.i = k; BZ.sfx('confirm'); I.consumeAll(); return { pick: k, input: I, mouse: true }; } }
    }
    return null;
  }
  /** draw as a column of cards centred at x from y (or a grid with cols) */
  draw(g, r, x, y, o = {}) {
    const w = o.w || 170, h = o.h || 22, gap = o.gap || 5, sc = o.scale || 2, n = this.items.length, cols = this.cols;
    this.rects = [];
    const cw = cols > 1 ? w : w, totalW = cols * cw + (cols - 1) * gap;
    for (let k = 0; k < n; k++) {
      const it = this.items[k], col = k % cols, row = Math.floor(k / cols), sel = k === this.i;
      const bob = sel ? Math.sin(this.t * 5) * 1 : 0, grow = sel ? 1.08 : 1, ww = Math.round(cw * grow), hh = Math.round(h * grow);
      const cx = x - totalW / 2 + col * (cw + gap) + cw / 2, cy = y + row * (h + gap) + h / 2 + bob;
      const rx = Math.round(cx - ww / 2), ry = Math.round(cy - hh / 2);
      this.rects.push([rx, ry, ww, hh]);
      E.ui.box(g, rx, ry, ww, hh, { bg: sel ? ['#ffb030', '#c8501a'] : it.disabled ? ['#2a2a34', '#1a1a20'] : ['#2a3460', '#141a34'], border: sel ? '#fff6c0' : '#5a6aa0', alpha: o.alpha || .95 });
      if (sel && this.ripple > 0) px.blend(g, this.ripple * 2, 'add', () => px.rect(g, rx, ry, ww, hh, '#ffffff'));
      const label = it.label + (it.value !== undefined ? '  ' + it.value : '');
      E.font.text(g, label, cx, cy - (it.sub ? 7 : 3.5) * (sc > 1 ? 1.6 : 1) + (sc > 1 ? -2 : 0), it.disabled ? '#6a6a7a' : sel ? '#1a0a00' : '#ffffff', { align: 'center', scale: sc, shadow: sel ? null : '#000' });
      if (it.sub) E.font.text(g, it.disabled && it.why ? it.why : it.sub, cx, cy + 5, it.disabled ? '#7a7a8a' : sel ? '#3a1a00' : '#a8b8e8', { align: 'center' });
      if (it.icon) it.icon(g, rx + 4, ry + 3, hh - 6, sel);
    }
    return { w: totalW, h: Math.ceil(n / cols) * (h + gap) };
  }
};
/** a dark gradient backdrop with drifting stars and a ballpark glow, for menus */
BZ.menuBg = (r, t, tint = ['#0a0c24', '#2a1a48', '#5a2a3a']) => {
  r.sky(tint);
  r.overlay(g => { for (let i = 0; i < 40; i++) { const x = (i * 97.3 + t * (4 + i % 5)) % r.W, y = (i * 53.7) % (r.H * .6); px.dot(g, x, y, i % 7 ? '#ffffff60' : '#ffd04080'); } });
};
BZ.title = (g, r, y, sc = 4) => {
  E.font.title(g, 'BATZOOKA', r.W / 2, y, { scale: sc, align: 'center', colors: ['#fff6c0', '#ffb030', '#e0501a'], depth: 3, depthColor: '#3a0a04' });
  E.font.title(g, 'BASEBALL', r.W / 2, y + sc * 9 + 4, { scale: Math.max(2, sc - 1), align: 'center', colors: ['#ffffff', '#9ac8ff', '#3a6ad8'], depth: 2, depthColor: '#0a1a3a' });
};

/* ---- settings (ours, beside the engine's own) ---- */
BZ.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'pro', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['batzooka', 'Batzooka']], group: 'Game' },
  { key: 'innings', label: 'Exhibition innings', type: 'select', value: 3, options: [[1, '1'], [3, '3'], [5, '5'], [9, '9']], group: 'Game' },
  { key: 'tourLength', label: 'Tour game length', type: 'select', value: 'standard', options: [['standard', 'Standard (3 innings)'], ['quick', 'Quick (1 inning)']], group: 'Game' },
  { key: 'mercy', label: 'Mercy rule (10 runs after 2)', type: 'toggle', value: true, group: 'Game' },
  { key: 'comeback', label: 'Comeback Boost', type: 'toggle', value: true, group: 'Game' },
  { key: 'rhubarbs', label: 'Rhubarbs', type: 'toggle', value: true, group: 'Game' },
  { key: 'derbyLength', label: 'Derby length', type: 'select', value: 'time', options: [['time', '2:00'], ['outs', '10 outs']], group: 'Game' },
  { key: 'batAssist', label: 'Batting assist', type: 'select', value: 'hints', options: [['off', 'Off'], ['hints', 'Timing hints'], ['big', 'Big sweet spot']], group: 'Game' },
  { key: 'pitchAssist', label: 'Pitching assist', type: 'select', value: 'off', options: [['off', 'Off'], ['auto', 'Auto-aim']], group: 'Game' },
  { key: 'fielding', label: 'Fielding', type: 'select', value: 'assisted', options: [['manual', 'Manual'], ['assisted', 'Assisted'], ['auto', 'Auto']], group: 'Game' },
  { key: 'baserunning', label: 'Baserunning', type: 'select', value: 'auto', options: [['manual', 'Manual'], ['auto', 'Auto']], group: 'Game' },
  { key: 'keepTune', label: 'Keep dev tuning between visits', type: 'toggle', value: false, group: 'Game' },
  { key: 'timing', label: 'Timing feedback', type: 'toggle', value: true, group: 'Display' },
  { key: 'zone', label: 'Strike zone', type: 'select', value: 'always', options: [['always', 'Always'], ['pitch', 'During the pitch'], ['off', 'Off']], group: 'Display' },
  { key: 'plateCam', label: 'Plate Cam', type: 'select', value: 'classic', options: [['classic', 'Classic'], ['close', 'Close']], group: 'Display' },
  { key: 'fieldCam', label: 'Field camera', type: 'select', value: 'broadcast', options: [['broadcast', 'Broadcast'], ['high', 'High'], ['iso', 'Isometric']], group: 'Display' },
  { key: 'replays', label: 'Replays', type: 'select', value: 'big', options: [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], group: 'Display' },
  { key: 'commentary', label: 'Commentary', type: 'select', value: 'on', options: [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], group: 'Sound' },
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' }
];
BZ.pauseItems = () => {
  const g = BZ.game, M = BZ.M, scene = g.sceneName, inMatch = scene === 'match' && M, hub = BZ.hubActive;
  const items = [['Playbook', () => { g.resume(); BZ.playbook.open(); }]];
  if (inMatch && !hub && BZ.defense(M).humans.length && M.phase === 'atBat' && BZ.defense(M).bullpen.length) items.push(['Pitching change', () => { const D = BZ.defense(M); const r = D.bullpen.shift(); if (r) { D.bullpen.push(D.pitcher); D.pitcher = r; M.pitcher = r; BZ.match.setupDefense(M); BZ.hud.toast('NOW PITCHING: ' + r.name.toUpperCase()); } g.resume(); }]);
  if (!hub && ['match', 'derby', 'lesson'].includes(scene)) items.push(['Restart', () => { g.resume(); BZ.restart(); }]);
  if (!hub) items.push(['Dev mode', () => { g.resume(); BZ.dev.open(); }]);
  return items;
};
BZ.restart = () => { const g = BZ.game, s = g.sceneName; if (s === 'match') g.go('match', Object.assign({}, BZ.matchData, { seed: (BZ.matchData.seed || 1) + 1 })); else g.go(s, g.scene && g.scene.data); };

/* ---- the title ---- */
BZ.scenes.title = {
  view: 'broadcast', camera: { zoom: false },
  enter() {
    const g = BZ.game;
    this.t = 0; BZ.idle = 0; BZ.M = null;
    const saves = g.saves, hasSave = !!(saves && saves.any && !BZ.hubActive);
    this.sub = null;
    this.menu = new BZ.CardMenu([
      { label: 'CONTINUE', id: 'continue', disabled: !hasSave, why: 'NO SAVE YET' }, { label: 'TOUR', id: 'tour' },
      { label: 'EXHIBITION', id: 'exhibition' }, { label: 'DERBY', id: 'derby' },
      { label: 'TRAINING', id: 'training' }, { label: 'OPTIONS', id: 'options' }, { label: 'ABOUT', id: 'about' }
    ], { start: hasSave ? 0 : 1, cols: 2 });
    this.P = BZ.park('kernel');
    g.setView(BZ.VIEWS.broadcast); g.setZoom(.78); g.lights.enabled = true; g.lights.ambient = .62; g.lights.tint = '#ffb070'; g.weather = null;
    this.dot = BZ.rigFor(BZ.get('players', 'comets-dot-dynamite-delgado'), 'bat');
    BZ.music('title');
    BZ.wheelOwned = false;
    BZ.bus.emit('scene', { scene: 'title' });
  },
  update(dt) {
    const g = BZ.game; this.t += dt;
    BZ.inputTick(g, dt);
    const H = this.P.H;
    g.focus(H.x + Math.sin(this.t * .07) * 220, H.y - 330 + Math.cos(this.t * .05) * 120, 0);
    BZ.rigUpdate(this.dot, dt, { x: H.x - 18, y: H.y - 4, z: 0, facing: Math.PI / 2 + .4, expr: 'smile' });
    if (BZ.F() < .2 && BZ.cosmetic) g.particles.add({ kind: 'glint', x: H.x + BZ.Fr(-500, 500), y: H.y - BZ.Fr(100, 900), z: BZ.Fr(10, 60), life: 1.2, color: '#ffe080' });
    BZ.tickLater(dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    // touch-only: only the Settings button answers taps
    if (BZ.touchOnly) {
      const c = g.input.clicked && g.input.clicked(); const b = this.setBtn;
      if (c && b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) g.menu('settings');
      return;
    }
    if (this.sub) { const res = this.sub.update(dt); if (res && res.cancel) this.sub = null; else if (res && res.pick !== undefined) { const id = this.sub.items[res.pick].id; this.sub = null; if (id === 'settings') g.menu('settings'); else if (id === 'controls') g.menu('controls'); else if (id === 'playbook') BZ.playbook.open(); } return; }
    if (BZ.playbook.on) { BZ.playbook.update(dt); return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'continue') BZ.tour.continueLatest();
      else if (id === 'tour') g.go('tourMenu');
      else if (id === 'exhibition') g.go('teamSelect');
      else if (id === 'derby') g.go('derbySetup');
      else if (id === 'training') g.go('lessonList');
      else if (id === 'options') this.sub = new BZ.CardMenu([{ label: 'SETTINGS', id: 'settings' }, { label: 'CONTROLS', id: 'controls' }, { label: 'PLAYBOOK', id: 'playbook' }]);
      else if (id === 'about') g.go('about');
    }
  },
  draw(r) {
    const t = this.t, P = this.P;
    P.drawBroadcast(r, r.game.time, .25);
    const H = P.H; r.shadow(H.x - 18, H.y - 4, 6, .4); r.actor(H.x - 18, H.y - 4, 0, (g, ox, oy) => this.dot.draw(g, ox, oy, r.view));
    r.queue(H.x - 18, H.y - 4, 0, g => BZ.drawBatzooka(g, this.dot, (x, y, z) => { const q = r.w(x, y, z); return [q[0], q[1], 1]; }, 1.4 * r.game.zoom, t, ['#ff7a1a', '#ffd040', '#fff6c0']), { bias: 2, emissive: true });
    r.game.lights.add(H.x, H.y - 200, 120, 700, .5, { color: '#ffd8a0' });
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a2048'));
      const ly = Math.max(8, r.H * .05), big = r.H > 300 && r.W > 480;
      BZ.title(g, r, ly, big ? 4 : 3);
      // a rocket trail sweeping under the logo
      const k = (t * .5) % 1.4, ty = ly + (big ? 70 : 54); if (k < 1) px.blend(g, .8, 'add', () => { for (let i = 0; i < 14; i++) { const x = r.W * (k - i * .012), y = ty - i * .5; px.disc(g, x, y, 3 - i * .18, i < 4 ? '#fff6c0' : '#ff7a1a'); } });
      if (BZ.touchOnly) { this.touchCard(g, r); return; }
      const top = ty + 8;
      if (this.sub) this.sub.draw(g, r, r.W / 2, top + 10, { w: 170, h: 22 });
      else if (BZ.playbook.on) BZ.playbook.draw(g, r);
      else this.menu.draw(g, r, r.W / 2, top, { w: Math.min(140, (r.W - 30) / 2), h: 20, gap: 4 });
      E.font.text(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel() + '  ·  game ' + BZ.version : BZ.version, 6, r.H - 10, '#8a8aa8');
      if (!this.sub && !BZ.playbook.on) BZ.legend(g, r, [['south', 'SELECT'], ['east', 'BACK']]);
    });
  },
  touchCard(g, r) {
    const w = Math.min(r.W - 30, 280), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .42);
    E.ui.box(g, x, y, w, 108, { bg: ['#2a3460', '#141a34'], border: '#ffd040' });
    // a controller and a keyboard
    const cx = r.W / 2;
    px.rect(g, cx - 64, y + 14, 44, 20, '#3a3f52'); px.disc(g, cx - 64, y + 26, 10, '#3a3f52'); px.disc(g, cx - 20, y + 26, 10, '#3a3f52'); px.disc(g, cx - 54, y + 22, 3, '#9aa3c0'); px.disc(g, cx - 30, y + 22, 2, '#7aa7ff'); px.disc(g, cx - 26, y + 26, 2, '#ff6b6b');
    px.rect(g, cx + 10, y + 14, 52, 22, '#d8dce8'); for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) px.rect(g, cx + 13 + j * 7, y + 17 + i * 5, 5, 3, '#6a7088');
    E.font.text(g, 'Controller or keyboard required', cx, y + 46, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
    E.font.text(g, 'Connect one to play. The demo runs on its own.', cx, y + 58, '#a8b8e8', { align: 'center' });
    const bw = 110, bx = Math.round(cx - bw / 2), by = y + 72; this.setBtn = [bx, by, bw, 26];
    E.ui.box(g, bx, by, bw, 26, { bg: ['#ffb030', '#c8501a'], border: '#fff6c0' }); E.font.text(g, 'SETTINGS', cx, by + 7, '#1a0a00', { align: 'center', scale: 2 });
  }
};

/* ---- the Playbook: one page a context, a picture and 3-5 icon + verb lines for the device in use ---- */
BZ.PLAYBOOK = [
  { title: 'BATTING', pose: 'bat', lines: [['move', 'Aim the sweet spot (the mouse places it)'], ['south', 'Contact swing: big sweet spot'], ['west', 'Power swing: small spot, big hits'], ['north', 'Hold to bunt, let go to pull back'], ['r1', 'BATZOOKA when the meter is full']], tip: 'Swing early to pull it, late to go the other way. Aim high for grounders, low for flies.' },
  { title: 'PITCHING', pose: 'pitch', lines: [['south', 'Heater   ○ breaking   □ off-speed'], ['north', 'Signature pitch   R1: team super'], ['move', 'Aim the target during the windup'], ['south', 'Press again as the ring closes'], ['move', 'Bend the ball early in flight']], tip: 'Mouse: the wheel picks a pitch, click throws, click again on the ring. Keys 1-5 pick too.' },
  { title: 'FIELDING', pose: 'field', lines: [['move', 'Run (assisted: you chase on your own)'], ['east', '1B  △ 2B  □ 3B  ✕ HOME: hold to power up'], ['r1', 'Jump, or climb the wall to rob a homer'], ['r2', 'Dive'], ['l1', 'Switch fielder   L2: turbo']], tip: 'Click a base to throw there. Over 85% power a throw can sail wild.' },
  { title: 'RUNNING', pose: 'run', lines: [['r1', 'Everybody go'], ['l1', 'Everybody back'], ['l2', 'Turbo'], ['south', 'Headfirst dive near a base'], [['l1', 'num2'], 'Before the pitch: steal']], tip: 'Hold a base button with R1 or L1 to send just that runner. Click a base to send, right-click to bring back.' },
  { title: 'SUPERS', pose: 'zooka', lines: [['r1', 'BATZOOKA! (100%): a rocket-powered swing'], ['r1', 'Super pitch at the pitch select (100%)'], [['r1', 'east'], 'LASER ARM throw (50%)'], [['r1', 'l2'], 'AFTERBURNERS while running (50%)']], tip: 'The crowd fills the meter: hits, homers, strikeouts, great catches, steals and rhubarbs.' },
  { title: 'RHUBARB', pose: 'fight', lines: [['move', 'Move'], ['south', 'Punch combo'], ['west', 'Shove'], ['north', 'Grab and toss'], ['east', 'Dodge']], tip: 'Twelve seconds of slapstick. Most knockdowns wins +50 meter. Nobody gets hurt.' },
  { title: 'HOUSE RULES', pose: null, lines: [], rules: true, tip: 'What you can\'t do in this ballpark:' }
];
BZ.playbook = {
  on: false, i: 0, t: 0,
  open() { this.on = true; this.i = 0; this.t = 0; this.rig = null; BZ.game.input.consumeAll(); },
  update(dt) {
    this.t += dt;
    const P = BZ.game.players;
    for (const I of P) {
      if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % BZ.PLAYBOOK.length; BZ.sfx('select'); }
      if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + BZ.PLAYBOOK.length - 1) % BZ.PLAYBOOK.length; BZ.sfx('select'); }
      if (I.pressed('cancel') || I.pressed('east')) { this.on = false; I.consumeAll(); BZ.sfx('cancel'); return; }
    }
    const c = BZ.game.input.clicked && BZ.game.input.clicked();
    if (c && !BZ.touchOnly) { if (c[0] > BZ.game.r.W * .7) this.i = (this.i + 1) % BZ.PLAYBOOK.length; else if (c[0] < BZ.game.r.W * .3) this.i = (this.i + BZ.PLAYBOOK.length - 1) % BZ.PLAYBOOK.length; }
    const pg = BZ.PLAYBOOK[this.i];
    if (pg.pose) {
      const job = pg.pose === 'bat' || pg.pose === 'zooka' ? 'bat' : pg.pose === 'pitch' ? 'pitch' : pg.pose === 'field' ? 'field' : pg.pose === 'fight' ? 'fight' : 'run';
      this.rig = BZ.rigFor(BZ.get('players', 'comets-dot-dynamite-delgado'), job);
      const u = (this.t % 1.6) / 1.6, s = { x: 0, y: 0, z: 0, facing: Math.PI / 2 + .6 };
      if (pg.pose === 'bat' || pg.pose === 'zooka') s.attack = u < .5 ? null : BZ.motionAt(BZ.MOTION.swing, (u - .5) * 1.6, .06, .08, .3);
      else if (pg.pose === 'pitch') s.attack = u < .4 ? BZ.atk('knee', 'wind', u / .4) : BZ.motionAt('throw', (u - .4) * 1.6, .1, .08, .4);
      else if (pg.pose === 'field') s.attack = BZ.motionAt('throw', u * 1.6, .25, .08, .4);
      else if (pg.pose === 'fight') { s.attack = E.move(['jab', 'cross', 'hook'][Math.floor(this.t * 2) % 3], (this.t * 2) % 1); s.stance = 'guard'; }
      else s.run = 1;
      BZ.rigUpdate(this.rig, 1 / 60, s);
    }
  },
  draw(g, r) {
    const pg = BZ.PLAYBOOK[this.i], I = BZ.game.input, w = Math.min(r.W - 24, 400), h = Math.min(r.H - 40, 190), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
    E.ui.box(g, x, y, w, h, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' });
    E.font.title(g, 'PLAYBOOK: ' + pg.title, r.W / 2, y + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
    E.font.text(g, (this.i + 1) + ' / ' + BZ.PLAYBOOK.length, x + w - 8, y + 8, '#8a90b8', { align: 'right' });
    if (this.rig && BZ.cosmetic) { const v = BZ._pbView || (BZ._pbView = new E.View('pb', 'pb', 0, 20, 2.4, 1)); this.rig.draw(g, x + 46, y + h - 30, v); }
    let ly = y + 32;
    if (pg.rules) for (const ru of BZ.HOUSE_RULES) { E.font.text(g, '• ' + ru, x + 16, ly, '#ffffff'); ly += 13; }
    for (const [a, verb] of pg.lines) { BZ.drawPrompts(g, I, [[a, verb, true]], x + 100, ly, { panel: false, size: 12 }); ly += 22; }
    const lines = E.font.wrap(pg.tip, w - 30); lines.forEach((l, i) => E.font.text(g, l, r.W / 2, y + h - 26 + i * 10, '#a8b8e8', { align: 'center' }));
    BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['east', 'BACK']]);
  }
};

/* ---- results ---- */
BZ.scenes.results = {
  enter(data) {
    const M = data.M, d = data.data || {}; this.M = M; this.d = d; this.t = 0;
    const human = M.teams.findIndex(T => T.humans.length), won = M.result.winner === human;
    this.fb = human >= 0 ? (won ? 500 : 150) + (M.bonusFB || 0) + 50 * Object.values(M.stats).filter(s => s.team === M.teams[human].id).reduce((a, s) => a + s.HR, 0) + (won && M.teams[1 - human].runs === 0 ? 200 : 0) : 0;
    this.shown = 0;
    // the game's three stars
    const score = s => s.H * 2 + s.HR * 5 + s.RBI * 2 + s.SB + s.PK * 1.5 + s.catches * .5 + s.dives * 2 + s.robbed * 5 - s.K * .5;
    this.stars = Object.entries(M.stats).map(([id, s]) => ({ id, s, v: score(s) })).sort((a, b) => b.v - a.v).slice(0, 3);
    this.menu = new BZ.CardMenu([{ label: 'CONTINUE', id: 'continue' }, { label: 'REPLAY', id: 'replay', disabled: !BZ.cams.ring.length }, { label: 'REMATCH', id: 'rematch', disabled: !!d.tourStop }], { cols: 3 });
    if (d.onResults) d.onResults(M, this);
    BZ.music('menu');
    BZ.game.setView(BZ.VIEWS.broadcast);
    if (this.fb && BZ.tour) BZ.tour.addFB(this.fb);
    BZ.bus.emit('scene', { scene: 'results' });
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.shown = Math.min(this.fb, this.shown + Math.max(1, this.fb) * dt * 1.2);
    if (this.replay) { const R = this.replay; R.acc += dt * 30; R.i = Math.floor(R.acc); if (R.i >= R.frames.length - 1 || (BZ.anyInput(g) && R.acc > 15)) { this.replay = null; g.setView(BZ.VIEWS.broadcast); } else { BZ.cams.animate(this.M, R.frames[R.i], dt * .5); const b = R.frames[R.i].ball; g.focus(b.x || this.M.park.H.x, b.y || this.M.park.H.y - 200, 0); } return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'continue') { if (this.d.next) this.d.next(this.M); else g.go(this.d.mode === 'exhibition' ? 'teamSelect' : 'title'); }
      else if (id === 'replay') { this.replay = { frames: BZ.cams.ring.slice(-300), acc: 0, i: 0 }; g.setView('iso'); g.setZoom(.62); }
      else if (id === 'rematch') BZ.startMatch(Object.assign({}, this.d, { seed: (this.d.seed || 1) + 7 }));
    }
  },
  draw(r) {
    const M = this.M;
    if (this.replay) { BZ.cams.drawField(r, M, this.replay.frames[Math.min(this.replay.i, this.replay.frames.length - 1)]); r.overlay(g => { E.font.title(g, 'HIGHLIGHT', 14, 14, { scale: 2, colors: ['#ffffff', '#ff5a5a'] }); BZ.legend(g, r, [['south', 'BACK']]); }); return; }
    BZ.menuBg(r, this.t);
    r.overlay(g => {
      const A = M.teams[0], H = M.teams[1], w = M.result.winner;
      E.font.title(g, 'FINAL', r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ffffff', '#9ac8ff'] });
      E.font.text(g, A.def.abbr, r.W / 2 - 60, 34, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, H.def.abbr, r.W / 2 + 60, 34, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      E.font.title(g, A.runs + ' - ' + H.runs, r.W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      if (w >= 0) E.font.text(g, M.teams[w].def.name.toUpperCase() + ' WIN' + (M.result.why === 'boom' ? ' THE SUDDEN BOOM!' : M.result.why === 'mercy' ? ' (MERCY RULE)' : M.result.why === 'walkoff' ? ' ON A WALK-OFF!' : '!'), r.W / 2, 68, '#ffd040', { align: 'center', shadow: '#000' });
      E.font.text(g, 'R ' + A.runs + '  H ' + A.hits + '  E ' + A.errors + '      R ' + H.runs + '  H ' + H.hits + '  E ' + H.errors, r.W / 2, 80, '#a8b8e8', { align: 'center' });
      // three stars
      const cw = Math.min(118, (r.W - 30) / 3);
      this.stars.forEach((st, i) => {
        const x = Math.round(r.W / 2 - cw * 1.5 + i * cw + 3), y = 94, pl = BZ.get('players', st.id);
        E.ui.box(g, x, y, cw - 6, 62, { bg: ['#2a3460', '#141a34'], border: '#ffd040' });
        E.font.text(g, '★'.repeat(3 - i), x + (cw - 6) / 2, y + 3, '#ffd040', { align: 'center' });
        if (pl && BZ.cosmetic) BZ.rigFor(pl, 'bench').drawPortrait(g, x + 4, y + 14, 28, { zoom: 2.4, frame: false });
        E.font.text(g, pl ? pl.short : '', x + 36, y + 16, '#ffffff');
        const s = st.s, line = s.HR ? s.HR + ' HR ' + s.RBI + ' RBI' : s.PK ? s.PK + ' K' : s.H ? s.H + ' HITS' : s.catches ? s.catches + ' CATCHES' : 'HUSTLE';
        E.font.text(g, line, x + 36, y + 28, '#a8ffb0');
      });
      if (this.fb) E.font.text(g, '+' + Math.floor(this.shown) + ' FAN BUCKS', r.W / 2, 164, '#ffd040', { align: 'center', scale: 2, shadow: '#000' });
      this.menu.draw(g, r, r.W / 2, r.H - 52, { w: 104, h: 20, scale: 1 });
      BZ.legend(g, r, [['south', 'SELECT']]);
    });
  }
};

/* ---- About / Credits: pages turned by L1 / R1, left / right or clicks; up and down scroll ---- */
BZ.scenes.about = {
  enter() { this.i = 0; this.scroll = 0; this.t = 0; BZ.music('menu'); BZ.idle = 0; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    const pages = BZ.ABOUT_PAGES();
    for (const I of g.players) {
      if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % pages.length; this.scroll = 0; BZ.sfx('select'); }
      if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + pages.length - 1) % pages.length; this.scroll = 0; BZ.sfx('select'); }
      if (I.repeat('down')) this.scroll++; if (I.repeat('up')) this.scroll = Math.max(0, this.scroll - 1);
      if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); g.go('title'); return; }
    }
    const c = g.input.clicked && g.input.clicked();
    if (c && !BZ.touchOnly && g.r) { if (c[0] > g.r.W * .66) { this.i = (this.i + 1) % pages.length; this.scroll = 0; } else if (c[0] < g.r.W * .33) { this.i = (this.i + pages.length - 1) % pages.length; this.scroll = 0; } }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1424', '#1a2a48', '#2a1a3a']);
    const pages = BZ.ABOUT_PAGES(), pg = pages[this.i];
    r.overlay(g => {
      const w = Math.min(r.W - 20, 560), x = Math.round(r.W / 2 - w / 2), y = 8, h = r.H - 40;
      E.ui.box(g, x, y, w, h, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040', alpha: .95 });
      E.font.title(g, pg.title, r.W / 2, y + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      E.font.text(g, (this.i + 1) + '/' + pages.length, x + w - 8, y + 8, '#8a90b8', { align: 'right' });
      if (pg.logo) BZ.title(g, r, y + 28, 3);
      const lines = []; for (const l of pg.lines) { for (const wl of E.font.wrap(l, w - 24)) lines.push(wl); }
      const per = Math.floor((h - (pg.logo ? 104 : 38)) / 10), top = y + (pg.logo ? 98 : 30);
      this.scroll = Math.min(this.scroll, Math.max(0, lines.length - per));
      lines.slice(this.scroll, this.scroll + per).forEach((l, i) => { const head = /^[A-Z][A-Za-z &/]+:/.exec(l); E.font.text(g, l, x + 12, top + i * 10, head ? '#ffffff' : '#d8e0ff'); if (head) E.font.text(g, head[0], x + 12, top + i * 10, '#ffd040'); });
      if (lines.length > per) E.font.text(g, (this.scroll + per < lines.length ? '↓ more' : '') + (this.scroll ? '  ↑' : ''), x + w - 10, y + h - 12, '#8a90b8', { align: 'right' });
      BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['down', 'SCROLL'], ['east', 'BACK']]);
    });
  }
};

/* ---- the animation gallery (from dev mode's WARP): every new motion in turn ---- */
BZ.GALLERY = [
  ['CONTACT SWING', 'bat', t => ({ attack: BZ.motionAt(BZ.MOTION.swing, t % 1.2 - .3, .06, .08, .32) })],
  ['POWER SWING', 'bat', t => ({ attack: BZ.motionAt(BZ.MOTION.power, t % 1.2 - .3, .1, .08, .32) })],
  ['BUNT', 'bat', t => ({ attack: t % 1.6 > .4 ? BZ.atk(BZ.MOTION.bunt, 'active', .5) : null })],
  ['WINDUP AND PITCH', 'pitch', t => { const u = t % 1.6; return { attack: u < .5 ? BZ.atk('knee', 'wind', u / .5) : u < .9 ? BZ.atk('throw', 'wind', (u - .5) / .4) : BZ.motionAt('throw', u - .9, 0, .08, .4) }; }],
  ['FIELDER THROW', 'field', t => ({ attack: BZ.motionAt('throw', t % 1.2 - .2, .22, .08, .4) })],
  ['TAG', 'field', t => ({ attack: BZ.motionAt(BZ.MOTION.tag, t % 1.2 - .2, .12, .1, .3) })],
  ['DIVE', 'field', t => ({ down: Math.min(.75, (t % 1.6) * 2) })],
  ['FEET-FIRST SLIDE', 'run', t => ({ down: Math.min(.7, (t % 1.6) * 2), vx: 60 })],
  ['WALL CLIMB', 'field', t => ({ climb: true, vz: 60 })],
  ['JUMP', 'field', t => ({ air: (t % 1.2) < .6 })],
  ['UMPIRE: STRIKE', 'ump', t => ({ attack: BZ.motionAt(BZ.MOTION.punchOut, t % 1.4 - .2, .12, .1, .6), expr: 'shout' })],
  ['UMPIRE: SAFE', 'ump', t => ({ attack: BZ.motionAt(BZ.MOTION.safe, t % 1.4 - .2, .12, .1, .6) })],
  ['CELEBRATION', 'bench', t => ({ pose: 'cheer', expr: 'smile' })],
  ['DEJECTION', 'bench', t => ({ pose: 'kneel', expr: 'wince' })],
  ['RHUBARB PUNCHES', 'fight', t => ({ attack: E.move(['jab', 'cross', 'hook'][Math.floor(t * 2) % 3], (t * 2) % 1), stance: 'guard', expr: 'angry' })]
];
BZ.scenes.gallery = {
  pausable: true, view: 'broadcast', camera: { zoom: false },
  enter() { this.t = 0; this.i = 0; this.slow = false; this.P = BZ.park('kernel'); BZ.game.setView(BZ.VIEWS.broadcast); BZ.game.setZoom(2); BZ.game.lights.enabled = false; BZ.music('training'); },
  update(dt) {
    const g = BZ.game, I = g.input; BZ.inputTick(g, dt);
    if (BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    const sp = this.slow ? .25 : 1; this.t += dt * sp;
    if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % BZ.GALLERY.length; this.t = 0; }
    if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + BZ.GALLERY.length - 1) % BZ.GALLERY.length; this.t = 0; }
    if (I.pressed('south')) this.slow = !this.slow;
    if (I.pressed('east')) { g.go('title'); return; }
    if (this.t > 4.8 && !this.hold) { this.i = (this.i + 1) % BZ.GALLERY.length; this.t = 0; }
    const H = this.P.H, [, job, fn] = BZ.GALLERY[this.i];
    const pl = BZ.get('players', 'comets-dot-dynamite-delgado');
    this.rig = job === 'ump' ? BZ.umpireRig() : BZ.rigFor(pl, job);
    const s = Object.assign({ x: H.x, y: H.y - 100, z: 0, facing: Math.PI * .65 }, fn(this.t));
    BZ.rigUpdate(this.rig, dt * sp, s);
    this.rig2 = BZ.rigFor(BZ.get('players', 'comets-moose-magnusson'), job === 'ump' ? 'bench' : job);
    BZ.rigUpdate(this.rig2, dt * sp, Object.assign({}, s, { x: H.x + 40, facing: Math.PI * .35 }));
    g.focus(H.x + 20, H.y - 100, 14);
  },
  draw(r) {
    const H = this.P.H;
    this.P.drawBroadcast(r, r.game.time, 0);
    r.shadow(H.x, H.y - 100, 6, .4); r.actor(H.x, H.y - 100, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.shadow(H.x + 40, H.y - 100, 6, .4); r.actor(H.x + 40, H.y - 100, 0, (g, ox, oy) => this.rig2.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'ANIMATION GALLERY', r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      E.font.text(g, (this.i + 1) + '/' + BZ.GALLERY.length + '  ' + BZ.GALLERY[this.i][0] + (this.slow ? '  (SLOW)' : ''), r.W / 2, 30, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
      BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['south', 'SLOW'], ['east', 'TITLE']]);
    });
    if (BZ.dev.isOpen()) BZ.dev.draw(r);
  }
};
