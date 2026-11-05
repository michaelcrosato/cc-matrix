/* Time Trial (PLAN §7.10: any stage or the full coast, a clock that counts up, your ghost, medals from par) and
 * Versus (§7.11: two players on one screen, a pad each or a shared keyboard, or P2 as the CPU; three routes). */
(() => {
'use strict';
const OB = window.OB, E = OB.E, { px } = E, T = (...a) => OB.T(...a), C = OB.COL;
const S = OB.SCENES = OB.SCENES || {}, game = () => OB.game;
const ORDER = Object.keys(OB.STAGES).concat(['full']);

S.trial = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() { this.t = 0; this.sel = this.sel || 0; this.traffic = this.traffic || false; this.scr = new OB.UI.Screen({ wrap: false }); OB.UI.idle = 0; },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H;
    const turn = d => { this.sel = (this.sel + d + ORDER.length) % ORDER.length; };
    this.scr.set([
      { id: 'stage', x: W / 2 - 150, y: 60, w: 300, h: 60, onLeft: () => turn(-1), onRight: () => turn(1), onPick: () => this.go(), draw: (g, it, f, scr) => this.stageCard(g, it, f, scr) },
      { id: 'traffic', label: 'TRAFFIC', value: this.traffic ? 'ON' : 'OFF', x: W / 2 - 150, y: 128, w: 300, h: 26, scale: 1, onPick: () => { this.traffic = !this.traffic; }, onLeft: () => { this.traffic = !this.traffic; }, onRight: () => { this.traffic = !this.traffic; } },
      { id: 'go', label: 'TO THE GARAGE →', x: W / 2 - 150, y: 162, w: 300, h: 28, scale: 1, onPick: () => this.go() }
    ]);
    const r = this.scr.update(dt); if (r === 'back') game().go('menu', { focus: 3 }, { fade: 'wipe' });
    if (OB.UI.idle > 10) OB.Attract.start('trial');
  },
  go() {
    const id = ORDER[this.sel], p = OB.Profile.p, rec = p.records.stage[id];
    const trial = { mode: 'trial', trialKey: id, route: id === 'full' ? null : { stages: [id], end: 'sprint' }, startStage: id === 'full' ? 'S1' : id, clock: 'up', traffic: this.traffic, ghost: rec ? rec.ghost : null, requestTypes: [] };
    game().go('garage', { mode: 'trial', trial, back: 'trial' }, { fade: 'wipe' });
  },
  stageCard(g, it, f, scr) {
    const id = ORDER[this.sel], p = OB.Profile.p, rec = p.records.stage[id], med = p.records.medals[id], st = OB.STAGES[id];
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: f ? ['#ff7a9a', '#c83a7a'] : ['#3a2470', '#2a1450'], border: f ? '#fff4c0' : '#8a70b0' });
    T(g, '←', it.x + 10, it.y + 22, C.sun, { scale: 2 }); T(g, '→', it.x + it.w - 22, it.y + 22, C.sun, { scale: 2 });
    T(g, id === 'full' ? 'FULL COAST (FORKS OPEN)' : st.name.toUpperCase(), it.x + it.w / 2, it.y + 8, '#ffffff', { align: 'center', scale: 2 });
    T(g, id === 'full' ? 'Five stages, any route' : 'Row ' + st.row + '  •  ' + '♥'.repeat(st.diff) + '  •  par ' + OB.par(id) + ' s', it.x + it.w / 2, it.y + 28, C.dim, { align: 'center' });
    T(g, 'BEST ' + (rec ? OB.fmtTime(rec.time) : '--') + (med ? '   ' + med.toUpperCase() : ''), it.x + it.w / 2, it.y + 42, med ? C.sun : '#ffffff', { align: 'center' });
    if (f) scr.ring(g, it);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, id = ORDER[this.sel];
      OB.drawBackdropRoad(g, W, H, this.t, { r, stage: id === 'full' ? 'S1' : id, car: false, speed: 1600 });
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, W, H, '#3a2a6a'));
      OB.UI.title(g, 'TIME TRIAL', W / 2, 10, { scale: 3 });
      T(g, 'Medals: BRONZE, SILVER, GOLD and BLOOM against par. Your best run comes back as a ghost.', W / 2, 46, '#ffffff', { align: 'center' });
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['left', 'Stage'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};

/* ---- Versus ---- */
const ROUTES = ['flower', 'cliff', 'full'];
S.versus = {
  view: 'side', input: OB.INPUT, res: [480, 270], expand: true, touch: [],
  enter() {
    this.t = 0; this.route = this.route || 0; this.cpu = !!this.cpu; this.scr = new OB.UI.Screen({ wrap: false }); OB.UI.idle = 0;
    this.cars = this.cars || ['orchidea', 'primavera'];
    game().allowJoin({ max: 2, onJoin: () => { OB.Sound.play('ok'); this.cpu = false; OB.UI.toast('PLAYER 2', 'Joined!', 2); } });
  },
  exit() { game().allowJoin(false); },
  joined() { return game().players.length > 1; },
  go() {
    if (!this.joined() && !this.cpu) { OB.Sound.play('error'); OB.UI.toast('PLAYER 2', 'Press Start on a second pad, 2 on the keyboard, or choose CPU', 3); return; }
    const p = OB.Profile.p, R = OB.ROUTES[ROUTES[this.route]];
    const cfg = { mode: 'versus', players: 2, route: { stages: R.stages, end: R.end }, cars: this.cars.map((m, i) => ({ model: m, paint: OB.paintsFor(m, p)[i], driver: i ? 'lea' : 'leo', passenger: OB.PASSENGERS[i], transmission: 'auto' })), bots: [null, this.joined() ? null : { skill: .95 }], seed: 7 + this.route, station: OB.Radio.i, cruise: false };
    game().go('race', cfg, { fade: 'wipe' });
  },
  update(dt) {
    this.t += dt; const W = game().W, H = game().H, cars = OB.Profile.p.unlocked.cars, cyc = (i, d) => { this.cars[i] = cars[(cars.indexOf(this.cars[i]) + d + cars.length) % cars.length]; };
    this.scr.set([
      { id: 'route', label: 'ROUTE', value: OB.ROUTES[ROUTES[this.route]].name.toUpperCase(), x: W / 2 - 150, y: 128, w: 300, h: 26, scale: 1, onLeft: () => { this.route = (this.route + 2) % 3; }, onRight: () => { this.route = (this.route + 1) % 3; }, onPick: () => { this.route = (this.route + 1) % 3; } },
      { id: 'p1car', label: 'P1 CAR', value: OB.CARS[this.cars[0]].name, x: W / 2 - 150, y: 158, w: 300, h: 26, scale: 1, onLeft: () => cyc(0, -1), onRight: () => cyc(0, 1), onPick: () => cyc(0, 1) },
      { id: 'p2car', label: 'P2 CAR', value: OB.CARS[this.cars[1]].name, x: W / 2 - 150, y: 188, w: 300, h: 26, scale: 1, onLeft: () => cyc(1, -1), onRight: () => cyc(1, 1), onPick: () => cyc(1, 1) },
      { id: 'cpu', label: 'PLAYER 2', value: this.joined() ? 'JOINED' : this.cpu ? 'CPU' : 'WAITING', x: W / 2 - 150, y: 98, w: 300, h: 26, scale: 1, onPick: () => { if (!this.joined()) this.cpu = !this.cpu; }, onLeft: () => { if (!this.joined()) this.cpu = !this.cpu; }, onRight: () => { if (!this.joined()) this.cpu = !this.cpu; } },
      { id: 'go', label: 'RACE! →', x: W / 2 - 60, y: H - 60, w: 120, h: 28, onPick: () => this.go() }
    ]);
    // player 2 changes their own car with their own input
    const P2 = game().players[1]; if (P2) { if (P2.pressed('left')) cyc(1, -1); if (P2.pressed('right')) cyc(1, 1); if (P2.pressed('start') || P2.pressed('confirm')) this.go(); }
    const r = this.scr.update(dt); if (r === 'back') game().go('menu', { focus: 4 }, { fade: 'wipe' });
    if (OB.UI.idle > 10) OB.Attract.start('versus');
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      r.sky(['#0a2a4a', '#2a5a8a', '#5ae08a']);
      OB.UI.title(g, 'VERSUS 2P', W / 2, 8, { scale: 3 });
      const P2 = this.joined();
      [0, 1].forEach(i => { const x = W / 2 + (i ? 110 : -110); OB.drawCar(g, x, 82, .1, { model: this.cars[i], paint: OB.paintsFor(this.cars[i], OB.Profile.p)[i], yaw: Math.sin(this.t + i) * .5, t: this.t }); T(g, 'P' + (i + 1), x, 40, i ? (P2 ? '#5ae08a' : this.cpu ? C.sun : '#8a8aa8') : C.sun, { align: 'center', scale: 2 }); });
      if (!P2 && !this.cpu) { T(g, 'P2: press Start on a second pad', W / 2, 52, '#ffffff', { align: 'center' }); T(g, 'or 2 on the keyboard (arrows + . / , for P2; WASD + F G H for P1)', W / 2, 62, C.dim, { align: 'center' }); }
      this.scr.draw(g);
      OB.UI.footer(g, W, H, [['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};
})();
