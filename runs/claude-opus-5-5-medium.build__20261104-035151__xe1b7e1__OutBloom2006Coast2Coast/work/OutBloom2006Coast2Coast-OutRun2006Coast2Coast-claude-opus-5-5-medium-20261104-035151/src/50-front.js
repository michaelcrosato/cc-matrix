/* Front-end scenes (PLAN §7.17): title, menu (a carousel of the six modes), garage (car, paint, driver, passenger,
 * transmission), radio (the faceplate), How to Play and About & Credits. Every screen: big type, one focus frame, a
 * footer of prompts for the device used last, and a way back. */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const S = OB.SCENES = OB.SCENES || {}, game = () => OB.game;

/* a living backdrop: the road drawn by itself, a car cruising, petals drifting */
const bgView = { t: 0, z: 30 * OB.SEG, stage: 'S1' };
OB.drawBackdropRoad = (g, W, H, t, o = {}) => {
  const stage = o.stage || 'S1', Sx = OB.World.get(stage), len = (Sx.len - 40) * OB.SEG, z = (30 * OB.SEG + t * (o.speed || 900)) % len;
  const D = OB.Road.draw(g, { x: 0, y: 0, w: W, h: H, i: 0 }, { stage, z, x: Math.sin(t * .2) * .3, h: 1100, turn: t * 8, t, objs: [], r: o.r });
  const p = OB.Road.project(stage, z + 1100 / Math.tan(50 * Math.PI / 180), Math.sin(t * .2) * .3 + .2);
  if (p && o.car !== false) OB.drawCar(g, p[0], p[1], p[2], { model: o.model || 'orchidea', paint: o.paint, yaw: Math.sin(t * .4) * .08, t, speed: 120, occupants: { driver: 'leo', passenger: o.passenger || 'marisol', pose: Math.floor(t / 4) % 3 === 0 ? 'wave' : null } });
  OB.FX.grade(g, { x: 0, y: 0, w: W, h: H }, OB.TOD[OB.STAGES[stage].tod], D.glows, false);
  if (game().settings.bloom !== false) OB.FX.bloom(g, { x: 0, y: 0, w: W, h: H }, OB.TOD[OB.STAGES[stage].tod].bloom, '#ffd0a0');
  if (!OB.FX.reduce()) for (let i = 0; i < 26; i++) { const x = ((i * 97 + t * 25) % (W + 20)) - 10, y = ((i * 61 + t * (18 + i % 5 * 4)) % (H + 10)) - 5; px.rect(g, x, y, 2, 1, ['#ffc0d8', '#ffffff', '#ff8ac0'][i % 3]); }
};
/** the logo: OutBloom extruded pink to gold, a 2006 badge, COAST 2 COAST on a road stripe */
OB.drawLogo = (g, W, y, t, scale = 5) => {
  E.font.title(g, 'OutBloom', Math.round(W / 2), y, { align: 'center', scale, colors: ['#fff4e0', '#ffb3d1', '#ff7a59', '#ffcf4a'], depth: 4, depthColor: '#5a1e4a', outline: '#2a0a2a' });
  const lw = E.font.width('OutBloom', { scale }), sx = W / 2 - lw / 2 + ((t * 80) % (lw + 120)) - 60;
  px.blend(g, .5, 'add', () => px.poly(g, [[sx, y - 2], [sx + 8, y - 2], [sx - 4, y + scale * 9 + 4], [sx - 12, y + scale * 9 + 4]], '#ffffff'));
  const by = y + scale * 9 + 6; px.rect(g, W / 2 - 110, by, 220, 16, '#3a3a48'); for (let x = -100; x < 110; x += 24) px.rect(g, W / 2 + x, by + 7, 12, 2, '#ffffff');
  T(g, 'COAST 2 COAST', W / 2, by + 4, '#ffcf4a', { align: 'center', scale: 1 });
  const br = scale >= 4 ? 15 : 10, bx = W / 2 + lw / 2 + br - 4, bdy = y - 4; px.disc(g, bx, bdy, br, '#ff5fa2'); px.disc(g, bx, bdy, br - 2, '#ffcf4a'); T(g, '2006', bx, bdy - 3, '#5a1e4a', { align: 'center', font: scale >= 4 ? undefined : 'tiny' });
};

S.title = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() { this.t = 0; OB.UI.idle = 0; game().audio.music(OB.SONGS.title, { fade: .6 }); OB.Ambience.set('beach'); this.scr = new OB.UI.Screen(); },
  exit() { OB.Ambience.stop(); },
  update(dt) {
    this.t += dt; OB.FX.step(dt);
    if (OB.Touch && OB.Touch.only()) { OB.Touch.update(dt, this); if (OB.UI.idle > 10) OB.Attract.start('title'); return; }
    const I = game().input;
    if (this.t > .4 && (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()))) { OB.Sound.play('ok'); game().go('menu', {}, { fade: 'wipe' }); }
    if (OB.UI.idle > 10) OB.Attract.start('title');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      OB.drawBackdropRoad(g, W, H, this.t, { r });
      OB.drawLogo(g, W, Math.round(H * .14), this.t);
      T(g, 'One day. One road. Every flower in bloom.', W / 2, Math.round(H * .14) + 76, '#fff4e0', { align: 'center' });
      if (OB.Touch && OB.Touch.only()) OB.Touch.drawNotice(g, W, H, this.t);
      else if (Math.floor(this.t * 2) % 2 === 0) OB.UI.pressStart(g, W / 2, Math.round(H * .74), { scale: 2 });
      T(g, E.versionLabel ? 'OutBloom ' + OB.VERSION + ' • my-3D2dge ' + E.versionLabel() : OB.VERSION, 6, H - 10, '#ffffffaa', { font: 'tiny' });
      T(g, '© an original homage', W - 6, H - 12, '#ffffffaa', { align: 'right' });
    });
  }
};

/* ---- the main menu: a carousel of the six modes, then Settings, How to Play, About ---- */
const MODES = [
  { id: 'arcade', name: 'ARCADE RUN', line: 'Five stages, your route, beat the sunset.', icon: 'car', color: '#ff7a59' },
  { id: 'love', name: 'LOVE IN BLOOM', line: 'Please your passenger. Every request counts.', icon: 'flower', color: '#ff5fa2' },
  { id: 'tour', name: 'COAST 2 COAST TOUR', line: 'Postcard missions from all over the island.', icon: 'camera', color: '#3ac8e0' },
  { id: 'trial', name: 'TIME TRIAL', line: 'Any stage. Race your own ghost.', icon: 'speed', color: '#ffcf4a' },
  { id: 'versus', name: 'VERSUS 2P', line: 'Two players, one screen, one coast.', icon: 'zap', color: '#5ae08a' },
  { id: 'garden', name: 'GARAGE GARDEN', line: 'Plant your seeds. Bloom new cars.', icon: 'seed', color: '#c080ff' }
];
OB.MODES = MODES;
S.menu = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) { this.t = 0; OB.UI.idle = 0; if (d && d.focus !== undefined) this.sel = d.focus; this.sel = this.sel || 0; this.scr = this.scr || new OB.UI.Screen(); this.slide = 0; if (!game().audio.song || game().audio.song.src !== OB.SONGS.garden) game().audio.music(OB.SONGS.garden, { fade: .6 }); },
  pick(id) {
    OB.menuReturn = { scene: 'menu', focus: this.sel };
    if (id === 'arcade' || id === 'love') game().go('garage', { mode: id, back: 'menu' }, { fade: 'wipe' });
    else if (id === 'tour') game().go('tour', {}, { fade: 'wipe' });
    else if (id === 'trial') game().go('trial', {}, { fade: 'wipe' });
    else if (id === 'versus') game().go('versus', {}, { fade: 'wipe' });
    else if (id === 'garden') game().go('garden', {}, { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; this.slide *= .8;
    const W = game().W, H = game().H, cw = 170, ch = 122, cy = 64;
    const turn = d => { this.sel = (this.sel + d + MODES.length) % MODES.length; this.slide = d * 40; OB.Sound.play('focus'); };
    this.scr.set([
      { id: 'car', x: W / 2 - cw / 2, y: cy, w: cw, h: ch, onLeft: () => turn(-1), onRight: () => turn(1), onPick: () => this.pick(MODES[this.sel].id), draw: () => {}, onClick: ck => { if (ck[0] < W / 2 - cw / 2 + 20) turn(-1); else if (ck[0] > W / 2 + cw / 2 - 20) turn(1); else this.pick(MODES[this.sel].id); } },
      { id: 'prev', x: W / 2 - cw / 2 - 100, y: cy + 20, w: 80, h: ch - 40, nofocus: true, onClick: () => turn(-1), draw: () => {} },
      { id: 'next', x: W / 2 + cw / 2 + 20, y: cy + 20, w: 80, h: ch - 40, nofocus: true, onClick: () => turn(1), draw: () => {} },
      { id: 'settings', label: 'SETTINGS', x: W / 2 - 205, y: H - 66, w: 130, h: 30, onPick: () => game().menu('settings') },
      { id: 'howto', label: 'HOW TO PLAY', x: W / 2 - 65, y: H - 66, w: 130, h: 30, onPick: () => game().go('howto', {}, { fade: 'wipe' }) },
      { id: 'about', label: 'ABOUT & CREDITS', x: W / 2 + 75, y: H - 66, w: 130, h: 30, onPick: () => game().go('about', {}, { fade: 'wipe' }), scale: 1 }
    ]);
    const r = this.scr.update(dt);
    if (r === 'back') game().go('title', {}, { fade: 'wipe' });
    if (game().input.pressed('shiftUp')) turn(1); if (game().input.pressed('shiftDown')) turn(-1);
    if (OB.UI.idle > 10) OB.Attract.start('menu');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, t = this.t;
      OB.drawBackdropRoad(g, W, H, t + 20, { r, stage: 'S2', car: false });
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, W, H, '#5a3a8a'));
      OB.drawLogo(g, W, 8, t, 2);
      const cw = 170, ch = 122, cy = 64, foc = this.scr.cur && this.scr.cur.id === 'car';
      for (const d of [-2, -1, 1, 2]) { const m = MODES[(this.sel + d + 60) % MODES.length], x = W / 2 + d * 128 - 50 + this.slide * .5; this.card(g, m, x, cy + 22, 100, 78, false, true); }
      this.card(g, MODES[this.sel], W / 2 - cw / 2 + this.slide, cy, cw, ch, foc, false);
      T(g, '←', W / 2 - cw / 2 - 14, cy + ch / 2 - 4, C.sun, { align: 'center', scale: 2 }); T(g, '→', W / 2 + cw / 2 + 14, cy + ch / 2 - 4, C.sun, { align: 'center', scale: 2 });
      T(g, MODES[this.sel].line, W / 2, cy + ch + 8, '#ffffff', { align: 'center' });
      for (let i = 0; i < MODES.length; i++) px.disc(g, W / 2 - 30 + i * 12, cy + ch + 22, i === this.sel ? 3 : 2, i === this.sel ? C.sun : '#8a70b0');
      this.scr.draw(g);
      T(g, '★ ' + OB.Profile.p.seeds + ' SEEDS', 8, 8, C.good);
      OB.UI.footer(g, W, H, [['left', 'Mode'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  },
  card(g, m, x, y, w, h, foc, small) {
    E.ui.box(g, Math.round(x), Math.round(y), w, h, { bg: [E.shade(m.color, small ? -.35 : -.1), E.shade(m.color, small ? -.6 : -.45)], border: foc ? '#fff4c0' : '#ffd6a0' });
    // a small live illustration
    const cx = x + w / 2, iy = y + h * .42;
    if (!small) { const t = this.t; if (m.id === 'arcade') OB.drawCar(g, cx, iy + 26, .07, { model: 'orchidea', yaw: Math.sin(t * 2) * .3, t, speed: 200 }); else OB.icon(g, m.icon, cx - 18, iy - 14, 3); if (m.id === 'love') for (let i = 0; i < 6; i++) px.rect(g, cx - 40 + ((i * 23 + t * 20) % 80), iy - 30 + ((i * 17 + t * 15) % 50), 2, 2, '#ffc0d8'); }
    else OB.icon(g, m.icon, cx - 12, iy - 14, 2);
    T(g, m.name, cx, y + h - (small ? 14 : 22), '#ffffff', { align: 'center', scale: small ? 1 : (w > 150 && OB.TW(m.name, { scale: 2 }) < w - 10 ? 2 : 1) });
    if (foc) OB.UI.ring(g, Math.round(x), Math.round(y), w, h, this.t, this.scr.pop);
  }
};

/* ---- the garage: one screen, five rows ---- */
S.garage = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) {
    this.d = d; this.t = 0; OB.UI.idle = 0; this.scr = new OB.UI.Screen({ wrap: false }); const L = OB.Profile.p.last;
    this.ch = { car: L.car, paint: L.paint || 0, driver: L.driver, passenger: d.fixedPassenger || L.passenger, outfit: L.outfit || 0, transmission: L.transmission || game().settings.transmission || 'auto' };
    if (!OB.Profile.p.unlocked.cars.includes(this.ch.car)) this.ch.car = 'orchidea';
    this.spin = 0; if (!game().audio.song || game().audio.song.src !== OB.SONGS.garden) game().audio.music(OB.SONGS.garden, { fade: .6 });
  },
  go() {
    const p = OB.Profile.p, ch = this.ch; if (!p.unlocked.cars.includes(ch.car)) { OB.Sound.play('error'); OB.UI.toast('LOCKED', 'Plant it in the Garage Garden', 2); return; }
    Object.assign(p.last, ch); OB.Profile.save();
    game().go('radio', Object.assign({}, this.d, { choice: Object.assign({}, ch) }), { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; this.spin += dt * .8;
    const W = game().W, H = game().H, ch = this.ch, p = OB.Profile.p, cars = OB.CAR_ORDER, paints = OB.paintsFor(ch.car, p), d = this.d;
    const cyc = (list, v, n) => list[(list.indexOf(v) + n + list.length) % list.length];
    const rows = [
      { id: 'car', label: 'CAR', onLeft: () => { ch.car = cyc(cars, ch.car, -1); ch.paint = 0; }, onRight: () => { ch.car = cyc(cars, ch.car, 1); ch.paint = 0; } },
      { id: 'paint', label: 'PAINT', onLeft: () => { ch.paint = (ch.paint - 1 + paints.length) % paints.length; }, onRight: () => { ch.paint = (ch.paint + 1) % paints.length; } },
      { id: 'driver', label: 'DRIVER', onLeft: () => { ch.driver = cyc(OB.DRIVERS, ch.driver, -1); }, onRight: () => { ch.driver = cyc(OB.DRIVERS, ch.driver, 1); } },
      { id: 'pass', label: 'PASSENGER', disabled: !!d.fixedPassenger, onLeft: () => { ch.passenger = cyc(OB.PASSENGERS, ch.passenger, -1); ch.outfit = 0; }, onRight: () => { ch.passenger = cyc(OB.PASSENGERS, ch.passenger, 1); ch.outfit = 0; } },
      { id: 'outfit', label: 'OUTFIT', onLeft: () => { const o = p.unlocked.outfits[ch.passenger]; ch.outfit = cyc(o, ch.outfit, -1); }, onRight: () => { const o = p.unlocked.outfits[ch.passenger]; ch.outfit = cyc(o, ch.outfit, 1); } },
      { id: 'go', label: 'TO THE RADIO →', onPick: () => this.go() }
    ];
    rows.forEach((it, i) => Object.assign(it, { x: 16, y: 40 + i * 33, w: 196, h: 28, draw: (g, it, f, scr) => this.row(g, it, f, scr) }));
    this.scr.set(rows);
    const r = this.scr.update(dt);
    if (r === 'back') game().go(d.back || 'menu', d.backData || {}, { fade: 'wipe' });
    if (game().input.pressed('more')) { ch.transmission = ch.transmission === 'manual' ? 'auto' : 'manual'; OB.Sound.play('toggle'); }
    if (OB.UI.idle > 10) OB.Attract.start('garage');
  },
  row(g, it, f, scr) {
    const ch = this.ch, p = OB.Profile.p, c = OB.CARS[ch.car];
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: f ? ['#ff7a9a', '#c83a7a'] : ['#3a2470', '#2a1450'], border: f ? '#fff4c0' : '#8a70b0' });
    if (it.id !== 'go') T(g, it.label, it.x + 8, it.y + 4, f ? '#fff4e0' : C.dim);
    let v = '';
    if (it.id === 'car') v = c.name + (p.unlocked.cars.includes(ch.car) ? '' : '  [LOCKED]');
    if (it.id === 'paint') { const pl = OB.paintsFor(ch.car, p); pl.forEach((col, i) => { if (i < 14) { px.rect(g, it.x + 8 + i * 13, it.y + 15, 11, 9, '#0a0614'); px.rect(g, it.x + 9 + i * 13, it.y + 16, 9, 7, col); if (i === ch.paint) px.rect(g, it.x + 8 + i * 13, it.y + 25, 11, 2, C.sun); } }); }
    if (it.id === 'driver') v = OB.CAST[ch.driver].name;
    if (it.id === 'pass') v = OB.CAST[ch.passenger].full + (it.disabled ? ' (mission)' : '');
    if (it.id === 'outfit') v = OB.CAST[ch.passenger].outfits[ch.outfit].name + (p.unlocked.outfits[ch.passenger].length < 2 ? '' : '  ←→');
    if (it.id === 'go') { T(g, it.label, it.x + it.w / 2, it.y + 10, '#ffffff', { align: 'center', scale: 1 }); }
    if (v) T(g, v, it.x + 8, it.y + 15, '#ffffff');
    if (f && (it.onLeft || it.onRight)) { T(g, '←', it.x + it.w - 22, it.y + 4, C.sun); T(g, '→', it.x + it.w - 12, it.y + 4, C.sun); }
    if (f) scr.ring(g, it);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, ch = this.ch, c = OB.CARS[ch.car], p = OB.Profile.p, locked = !p.unlocked.cars.includes(ch.car);
      r.sky(['#2a1450', '#7a3a7a', '#ff9a6a']);
      px.rect(g, 0, H * .62, W, H * .38, '#3a2a4a'); for (let x = 0; x < W; x += 30) px.rect(g, x, H * .62, 1, H * .38, '#4a3a5a');
      OB.UI.title(g, this.d.mode === 'love' ? 'LOVE IN BLOOM' : this.d.mission ? 'TOUR: ' + OB.MISSION[this.d.mission].title.toUpperCase() : 'ARCADE RUN', W / 2, 6, { scale: 2 });
      // the turntable: the car turning through its frames
      const tx = W * .66, ty = H * .66; px.ell(g, tx, ty + 4, 110, 20, '#5a4a6a'); px.ell(g, tx, ty + 2, 104, 17, '#6a5a7a');
      const paints = OB.paintsFor(ch.car, p), paint = paints[ch.paint % paints.length];
      OB.drawCar(g, tx, ty, .2, { model: ch.car, paint, yaw: Math.sin(this.spin) * 1.1 + (Math.floor(this.spin / Math.PI) % 2 ? Math.PI : 0) * 0, t: this.t, speed: 0, occupants: { driver: ch.driver, passenger: ch.passenger, outfit1: ch.outfit } });
      if (locked) { OB.icon(g, 'lock', tx - 12, ty - 70, 2); T(g, 'Plant it in the Garage Garden', tx, ty - 40, C.sun, { align: 'center' }); }
      // stats: speed, acceleration, handling, the class
      const sx = W * .45, sy = 44, bar = (lab, f, y) => { T(g, lab, sx, y, C.dim); E.ui.bar(g, sx + 74, y + 1, 120, 5, f, C.pink); };
      T(g, c.name.toUpperCase() + '  •  ' + c.year, sx, sy - 12, '#ffffff');
      bar('SPEED', (c.top - 220) / 120, sy); bar('ACCEL', (7 - c.acc) / 4.5, sy + 11); bar('HANDLING', (c.steer - 1.7) / .8 + .1, sy + 22);
      T(g, c.cls.toUpperCase() + '  •  ' + c.cyl + ' CYL' + (c.hybrid ? ' HYBRID' : ''), sx, sy + 34, C.sun);
      T(g, 'GEARBOX: ' + (ch.transmission === 'manual' ? 'MANUAL' : 'AUTO'), sx, sy + 46, '#ffffff');
      // her portrait, bio and the requests she loves
      const ps = OB.CAST[ch.passenger]; OB.Cast.portrait(g, ch.passenger, W - 64, sy - 4, 48, { outfit: ch.outfit });
      T(g, ps.bio, W - 8, sy + 50, '#ffffff', { align: 'right' }); ps.loves.forEach((l, i) => OB.icon(g, OB.REQUESTS[l].icon, W - 70 + i * 16, sy + 62, 1));
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['left', 'Change'], ['more', 'Gearbox'], ['confirm', 'Go'], ['cancel', 'Back']]);
    });
  }
};

/* ---- the radio: a car-radio faceplate ---- */
S.radio = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter(d = {}) { this.d = d; this.t = 0; OB.UI.idle = 0; this.scr = new OB.UI.Screen({ wrap: false }); const av = OB.Radio.available(); if (!av.includes(OB.Radio.i)) OB.Radio.i = 0; OB.Radio.tune(OB.Radio.i, { restart: true }); },
  start() {
    const d = this.d, ch = d.choice || OB.Profile.p.last, p = OB.Profile.p; p.last.station = OB.Radio.i; OB.Profile.save();
    const paint = OB.paintsFor(ch.car, p)[ch.paint || 0];
    const base = { car: ch.car, paint, driver: ch.driver, passenger: ch.passenger, outfit: ch.outfit, transmission: ch.transmission, station: OB.Radio.i, keepMusic: true, mirror: game().settings.mirror, seed: 1 + (p.runs % 997) };
    let cfg;
    if (d.mission) cfg = Object.assign(OB.Tour.config(OB.MISSION[d.mission], ch), { paint, station: OB.Radio.i, keepMusic: true, mirror: game().settings.mirror });
    else if (d.mode === 'trial') cfg = Object.assign(base, d.trial);
    else cfg = Object.assign(base, { mode: d.mode || 'arcade' });
    game().go('race', cfg, { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H, I = game().input, av = OB.Radio.available();
    const tune = n => { const k = av.indexOf(OB.Radio.i); OB.Radio.tune(av[(k + n + av.length) % av.length], { fade: .3, restart: true }); };
    const items = OB.STATIONS.map((s, i) => ({ id: 's' + i, x: W / 2 - 210 + i * 60, y: H * .5, w: 56, h: 40, disabled: !av.includes(i), onPick: () => { if (OB.Radio.i === i) this.start(); else OB.Radio.tune(i, { restart: true }); }, onLeft: () => tune(-1), onRight: () => tune(1), draw: (g, it, f, scr) => this.preset(g, it, f, scr, i) }));
    items.push({ id: 'go', label: 'DRIVE!', x: W / 2 - 60, y: H * .5 + 54, w: 120, h: 28, onPick: () => this.start() });
    this.scr.set(items); if (this.scr.cur && this.scr.cur.id !== 'go' && this.scr.cur.id !== 's' + OB.Radio.i && !this.scr.moved) this.scr.focus('s' + OB.Radio.i);
    const r = this.scr.update(dt);
    if (this.scr.cur && this.scr.cur.id.startsWith('s')) { this.scr.moved = true; const i = +this.scr.cur.id.slice(1); if (i !== OB.Radio.i && av.includes(i) && (I.pressed('left') || I.pressed('right'))) OB.Radio.tune(i, { restart: true }); }
    if (I.pressed('gas') && !I.pressed('confirm')) this.start();
    if (I.pressed('more')) { const ch = this.d.choice || OB.Profile.p.last; ch.transmission = ch.transmission === 'manual' ? 'auto' : 'manual'; OB.Sound.play('toggle'); }
    if (r === 'back') game().go('garage', this.d, { fade: 'wipe' });
    if (OB.UI.idle > 10) OB.Attract.start('radio');
  },
  preset(g, it, f, scr, i) {
    const s = OB.STATIONS[i], on = OB.Radio.i === i;
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: it.disabled ? ['#2a2438', '#1a1828'] : on ? ['#ffcf4a', '#e8902a'] : ['#3a3458', '#2a2440'], border: f ? '#fff4c0' : '#8a80a0' });
    T(g, s.freq, it.x + it.w / 2, it.y + 8, on ? '#2a1450' : '#ffffff', { align: 'center', scale: 1 });
    T(g, s.name.replace(' FM', ''), it.x + it.w / 2, it.y + 22, on ? '#5a1e4a' : C.dim, { align: 'center' });
    if (it.disabled) OB.icon(g, 'lock', it.x + it.w / 2 - 6, it.y + 24, 1);
    if (f) scr.ring(g, it);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, st = OB.STATIONS[OB.Radio.i], ch = this.d.choice || OB.Profile.p.last;
      r.sky(['#1a0a3a', '#3a1a5a', '#6a2a6a']);
      OB.UI.title(g, 'PICK A STATION', W / 2, 10, { scale: 2 });
      // the faceplate: chrome, a dial window, the frequency needle
      E.ui.box(g, W / 2 - 220, 44, 440, H * .5 - 52, { bg: ['#5a5470', '#2a2440'], border: '#c8c8d8' });
      px.rect(g, W / 2 - 200, 56, 400, 40, '#0a1420'); for (let f = 0; f <= 20; f++) px.rect(g, W / 2 - 190 + f * 19, 60, 1, f % 5 ? 4 : 8, '#5ae0e0');
      const nx = W / 2 - 190 + (parseFloat(st.freq) - 88) / 21 * 380; px.rect(g, nx, 58, 2, 36, '#ff5a5a');
      T(g, st.freq + ' ' + st.name, W / 2 - 190, 78, '#5ae0e0'); T(g, '♪ ' + OB.SONGS[st.song].name, W / 2 + 190, 78, '#ffffff', { align: 'right' });
      for (let i = 0; i < 12; i++) { const v = Math.abs(Math.sin(this.t * (3 + i * .7) + i)) * 10; px.rect(g, W / 2 - 40 + i * 7, 112 - v, 5, v, i < 8 ? C.good : C.sun); }
      T(g, 'GEARBOX', W / 2 + 120, 104, C.dim); T(g, ch.transmission === 'manual' ? 'MANUAL' : 'AUTO', W / 2 + 120, 114, C.sun, { scale: 1 });
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['left', 'Tune'], ['more', 'Gearbox'], ['confirm', 'Drive'], ['cancel', 'Back']]);
    });
  }
};

/* ---- How to Play: six pages ---- */
const HOWTO = [
  { h: 'DRIVING', lines: [['gas', 'Gas: hold it (R2 is progressive)'], ['brake', 'Brake / slow down'], ['left', 'Steer with the stick, d-pad or keys'], ['shiftUp', 'Shift up (manual gearbox)'], ['shiftDown', 'Shift down (manual gearbox)']], text: 'Bends throw you outward the faster you go. Lift off or drift on the big ones. Off the asphalt you slow down; walls and rails scrape.' },
  { h: 'DRIFTING', lines: [['drift', 'Drift button: hold it to slide deeper'], ['brake', 'Or tap the brake while steering'], ['shiftDown', 'Or shift down then up, fast']], text: 'A drift needs 120 km/h and some steering. Steer into the bend to hold the angle, counter-steer to straighten. Long drifts score big.' },
  { h: 'SLIPSTREAM & NEAR MISSES', lines: [['gas', 'Tuck in behind any car to slipstream'], ['left', 'Pull out at full slip for a SLINGSHOT'], ['horn', 'Horn: the car ahead moves over']], text: 'Passing close (not touching!) is a NEAR MISS. Style builds the Bloom chain: five flowers is FULL BLOOM and every point is worth five times more.' },
  { h: 'FORKS & CHECKPOINTS', lines: [['left', 'At a fork, steer to the side you want'], ['camera', 'Camera: chase, high, bumper'], ['radio', 'Radio: next station']], text: 'Each checkpoint gives back daylight. Left roads are gentler, right roads are harder and prettier. Five stages, sixteen routes, five goals.' },
  { h: 'LOVE IN BLOOM', lines: [['confirm', 'Requests pop up on the road: read the card'], ['left', 'Pop balloons, bonk gnomes, dodge bees...']], text: 'Perfect, Great, Good or Miss earn petals. Take the fork she asks for. Crashes cost petals. Your grade (E to AAA) decides the ending.' },
  { h: 'TOUR & GARDEN', lines: [['confirm', 'Pick a postcard on the Tour map'], ['shiftUp', 'Tabs and pages: shoulder buttons']], text: 'Clear missions to earn seeds and plant them in the Garage Garden: new cars, songs, paints, outfits and Mirror Roads. Clear any nine for the Finale.' }
];
const pagedScene = (pagesFn, title) => ({
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() { this.page = 0; this.t = 0; this.scr = new OB.UI.Screen(); OB.UI.idle = 0; },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H, n = pagesFn().length, turn = d => { this.page = (this.page + d + n) % n; OB.Sound.play('focus'); };
    this.scr.set([{ id: 'prev', label: '←', x: 10, y: H / 2 - 20, w: 34, h: 40, onPick: () => turn(-1) }, { id: 'back', label: 'BACK', x: W / 2 - 50, y: H - 56, w: 100, h: 28, onPick: () => game().go('menu', {}, { fade: 'wipe' }) }, { id: 'next', label: '→', x: W - 44, y: H / 2 - 20, w: 34, h: 40, onPick: () => turn(1) }]);
    const I = game().input;
    if (I.pressed('shiftUp') || (I.pressed('right') && this.scr.cur.id === 'back')) turn(1);
    if (I.pressed('shiftDown') || (I.pressed('left') && this.scr.cur.id === 'back')) turn(-1);
    if (I.pressed('right') && this.scr.cur.id === 'back') return; if (I.pressed('left') && this.scr.cur.id === 'back') return;
    const r = this.scr.update(dt); if (r === 'back') game().go('menu', {}, { fade: 'wipe' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pages = pagesFn(), p = pages[this.page];
      r.sky(['#1a0a3a', '#4a1a5a', '#8a3a6a']);
      OB.UI.title(g, title, W / 2, 6, { scale: 2 });
      OB.UI.panel(g, 52, 32, W - 104, H - 96, { alpha: .94 });
      T(g, p.h, W / 2, 40, C.sun, { align: 'center', scale: 2 });
      this.body(g, p, W, H);
      T(g, (this.page + 1) + ' / ' + pages.length, W / 2, H - 70, C.dim, { align: 'center' });
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['shiftDown', 'Prev'], ['shiftUp', 'Next'], ['cancel', 'Back']]);
    });
  },
  body(g, p, W, H) {
    let y = 62;
    if (p.lines) for (const [a, txt] of p.lines) { OB.UI.prompt(g, 70, y, a, txt); y += 15; }
    if (p.text) { y += 4; for (const l of E.font.wrap(p.text, W - 150)) { T(g, l, 70, y, '#ffffff'); y += 10; } }
    if (p.rows) for (const [k, v] of p.rows) { T(g, k, 70, y, C.dim); const lines = E.font.wrap(String(v), W - 250); lines.forEach((l, i) => T(g, l, 190, y + i * 9, '#ffffff')); y += Math.max(1, lines.length) * 9 + 3; }
    if (p.list) for (const l of p.list) { const ls = E.font.wrap(l, W - 150); ls.forEach((x, i) => T(g, (i ? '  ' : '• ') + x, 70, y + i * 9, '#ffffff')); y += ls.length * 9 + 3; }
    if (p.demo) p.demo(g, W, H, this.t);
  }
});
S.howto = pagedScene(() => HOWTO, 'HOW TO PLAY');
S.about = pagedScene(() => OB.ABOUT.pages(), 'ABOUT & CREDITS');
})();
