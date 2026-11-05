/* DENSHA DE HALO! · driving: a Drive wraps a Run with its cameras, crowds, sound, story and HUD state. The drive scene,
 * the attract mode, the duel's two viewports and the hub round all use it. Time of day and weather grade the picture. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, clamp = E.clamp;

/* ---------- time of day and weather: a grade blended between keyframes ---------- */
const KEYS = [
  [0, { top: '#060818', hor: '#1a2440', amb: [.34, .38, .58], fog: '#141c34', night: 1 }],
  [4.6, { top: '#060818', hor: '#1a2440', amb: [.34, .38, .58], fog: '#141c34', night: 1 }],
  [5.6, { top: '#2a2850', hor: '#f0a080', amb: [.72, .62, .6], fog: '#c89080', night: .35 }],
  [7, { top: '#3a5aa8', hor: '#f8d0a8', amb: [.92, .86, .8], fog: '#e0c8b8', night: 0 }],
  [8.5, { top: '#3a78d8', hor: '#bfe0ff', amb: [1, 1, 1], fog: '#bfe0ff', night: 0 }],
  [13.5, { top: '#3a78d8', hor: '#bfe0ff', amb: [1, 1, 1], fog: '#bfe0ff', night: 0 }],
  [15, { top: '#5a8ad0', hor: '#e8e0c8', amb: [1, .96, .9], fog: '#e8e0c8', night: 0 }],
  [16.6, { top: '#4a5aa0', hor: '#ffc080', amb: [.92, .78, .64], fog: '#f0b888', night: 0 }],
  [17.6, { top: '#3a2a6a', hor: '#ff9a4a', amb: [.82, .62, .5], fog: '#e8906a', night: .15 }],
  [18.6, { top: '#1a1a48', hor: '#c86a5a', amb: [.55, .5, .62], fog: '#6a4a6a', night: .55 }],
  [19.6, { top: '#060818', hor: '#1a2440', amb: [.34, .38, .58], fog: '#141c34', night: 1 }],
  [24, { top: '#060818', hor: '#1a2440', amb: [.34, .38, .58], fog: '#141c34', night: 1 }]
];
const mixHex = (a, b, u) => E.mix(a, b, u);
DH.grade = (tod, weather, R) => {
  tod = ((tod % 24) + 24) % 24;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= tod) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1], u = h1 > h0 ? clamp((tod - h0) / (h1 - h0), 0, 1) : 0;
  const G = { skyTop: mixHex(a.top, b.top, u), skyHor: mixHex(a.hor, b.hor, u), amb: a.amb.map((v, k) => v + (b.amb[k] - v) * u), fog: mixHex(a.fog, b.fog, u), night: a.night + (b.night - a.night) * u };
  // the sun: east at dawn, west at sunset (headings along the ring so S1 drives into the sunrise and S4 into the west sun)
  const hDawn = R ? R.headAt(1200) : .2, hDusk = R ? R.headAt(14100) : 3.1;
  if (tod > 5 && tod < 19.2) { const dayU = (tod - 5) / 14.2, el = Math.sin(dayU * Math.PI) * .9 + .02; G.sun = { h: hDawn + (hDusk - hDawn) * dayU, el: Math.max(.03, el * (tod > 16 ? .5 : 1)), r: tod < 7 || tod > 16.5 ? 11 : 8, c: tod > 16.5 || tod < 7 ? '#ffd8a0' : '#fffbe8', glow: tod > 16.5 || tod < 7 ? '#ff9a4a' : '#fff0c0' }; }
  else G.sun = { h: hDusk + 2, el: .35, r: 7, c: '#f0f0ff', glow: '#6a7aaa', moon: true };
  G.clouds = G.night > .6 ? ['#1a2038', '#141a30'] : [mixHex('#ffffff', G.skyHor, .3), mixHex('#d8e0ec', G.skyHor, .4)];
  if (weather === 'rain') { G.skyTop = mixHex(G.skyTop, '#4a5260', .7); G.skyHor = mixHex(G.skyHor, '#8a929e', .7); G.amb = G.amb.map(v => v * .8); G.fog = mixHex(G.fog, '#7a828e', .7); G.clouds = ['#6a727e', '#5a626e']; G.sun = null; }
  if (weather === 'fog') { G.fog = mixHex(G.fog, G.night > .5 ? '#2a3044' : '#c0c4cc', .6); }
  return G;
};

/* ---------- crowds, staff, workers ---------- */
class Crowd {
  constructor(dr) { this.dr = dr; this.people = []; this.built = new Set(); this.rr = DH.rng('crowd:' + dr.run.id); }
  build(sp) {
    if (this.built.has(sp.id)) return; this.built.add(sp.id);
    const run = this.dr.run, st = sp.st, rr = this.rr; if (!st.platforms.length) return;
    const zone = run.R.zoneAt(sp.target) || {}, rain = run.rain, mult = (run.festival && sp.id === 'okiku' ? 2 : 1) * (run.stage.id === 'S4' ? 1.4 : 1) * (run.stage.tod > 22 ? .5 : 1);
    const L = st.doorSide === 'L', edge = L ? -1.6 : 1.6, inward = L ? -1 : 1, faceT = L ? 0 : Math.PI;
    const mix = run.festival && sp.id === 'okiku' ? DH.ZONES['temple-town'].mix : zone.mix || { commuter: 1 };
    const level = st.crowd * mult;
    for (let car = 0; car < run.cars; car++) for (const off of [2.6, 7.4, 12.6, 17.4]) {
      const ds = sp.target - (car * 20 + off), n = Math.min(4, Math.floor(rr() * (level + 1) * .9));
      for (let q = 0; q < n; q++) {
        const p = DH.makePerson(rr, mix, rain), th = DH.personThing({ s: ds + (rr() - .5) * .6, x: edge + inward * (1.1 + q * .55), p, facing: faceT, role: 'queue', door: ds, sp: sp.id });
        this.people.push(th);
      }
      if (rr() < .25 * level) { const p = DH.makePerson(rr, mix, rain); this.people.push(DH.personThing({ s: ds - 3, x: edge + inward * 2.8, p, facing: faceT + (rr() - .5), role: 'idle', sp: sp.id })); }
    }
    // the staff at the head end
    const staff = DH.personThing({ s: sp.target + 6, x: edge + inward * 1.2, p: { rig: DH.makeStaff(), col: '#1e3058' }, facing: Math.PI / 2, role: 'staff', sp: sp.id });
    this.people.push(staff);
    if (sp.id === 'hanabatake' && run.stage.id === 'S1') this.people.push(DH.personThing({ s: sp.target - 3, x: edge + inward * 1.4, p: { rig: DH.castRig('kota'), kid: true, col: '#3a8ad0' }, facing: Math.PI / 2, role: 'kota', sp: sp.id, pose: 'wave' }));
    if (sp.id === 'yuhi' && run.stage.id === 'S3') this.people.push(DH.personThing({ s: sp.target - 26, x: edge + inward * 1.5, p: { rig: DH.castRig('fuji'), col: '#8a3a6a' }, facing: faceT, role: 'fuji', sp: sp.id }));
    if (sp.id === 'daigaku' && run.stage.id === 'S4') this.people.push(DH.personThing({ s: sp.target - 140, x: edge + inward * 2, p: { rig: DH.castRig('kenji'), col: '#3a3a48' }, facing: -Math.PI / 2, role: 'kenji', sp: sp.id, hidden: true }));
    if (run.stage.finale && sp.id === 'akari') {
      this.people.push(DH.personThing({ s: sp.target - 2, x: edge + inward * 1.5, p: { rig: DH.castRig('ota'), col: '#5a5a62' }, facing: Math.PI / 2, role: 'finale', sp: sp.id }));
      for (let i = 0; i < 10; i++) this.people.push(DH.personThing({ s: sp.target - 6 - i * 3.5, x: edge + inward * 1.4, p: { rig: DH.makeStaff(), col: '#1e3058' }, facing: faceT, role: 'finale', sp: sp.id }));
    }
  }
  buildWorkers(w) {
    if (this.built.has('workers')) return; this.built.add('workers');
    for (let i = 0; i < 4; i++) this.people.push(DH.personThing({ s: w.s + 40 + i * 70, x: -3.6 - (i % 2) * .8, y: 0, p: { rig: DH.makeWorker(false), col: '#f07a20' }, facing: 0, role: 'worker' }));
    this.people.push(DH.personThing({ s: w.lookout, x: -3.2, y: 0, p: { rig: DH.makeWorker(true), col: '#f07a20' }, facing: Math.PI / 2, role: 'lookout', flag: '#e8e020' }));
  }
  update(dt) {
    const run = this.dr.run, dir = this.dr.cam ? this.dr.cam.dir : 1;
    for (const sp of run.stops) { const d = sp.target - run.s; if (d < 900 && d > -400) this.build(sp); }
    if (run.workers) this.buildWorkers(run.workers);
    const dw = run.dw, here = dw && dw.sp ? dw.sp.id : null;
    for (const th of this.people) {
      const atHere = th.sp === here, doorsOpen = run.doors === 'open' && atHere;
      th.vx = 0; th.vy = 0; th.pose = th.role === 'kota' ? 'wave' : null;
      if (th.role === 'queue' && doorsOpen && run.doorAnim > .7 && !th.hidden) {   // walk in, vanish aboard
        const tx = (run.dw.sp.st.doorSide === 'L' ? -1.9 : 1.9), dx = tx - th.x, ds = th.door - th.s;
        th.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.2 * dt); th.s += Math.sign(ds) * Math.min(Math.abs(ds), 1.0 * dt); th.vx = Math.sign(dx) * 1.2; th.facing = Math.atan2(ds, dx) * 0 + (dx > 0 ? 0 : Math.PI);
        if (Math.abs(dx) < .05 && Math.abs(ds) < .1) th.hidden = true;
      }
      if (th.role === 'alight') { th.s += th.vs * dt; th.x += th.vxw * dt; th.vx = 1.2; th.life -= dt; if (th.life <= 0) th.hidden = true; }
      if (th.role === 'staff' && atHere && run.dw) { if (run.dw.piloted) th.pose = 'flag'; else if (run.dw.closed) th.pose = 'point'; th.flag = th.pose === 'flag' ? '#e8e020' : null; }
      if (th.role === 'fuji' && atHere && run.doors === 'open') th.pose = 'bow';
      if (th.role === 'finale' && atHere) th.pose = 'bow';
      if (th.role === 'kenji' && run.stats.rush && atHere) { th.hidden = false; const tgt = run.dw.sp.target - 77; if (th.s < tgt) { th.s += 4.5 * dt; th.vy = -4.5; th.facing = -Math.PI / 2; } else th.hidden = true; }
      if (th.role === 'worker' || th.role === 'lookout') { const d = run.dTo(th.s); th.facing = d > 0 ? Math.PI / 2 : -Math.PI / 2; if (run.workersWave) th.pose = d > -10 ? 'wave' : null; if (th.role === 'lookout' && !run.workersWave) th.pose = 'flag'; if (d < 25 && d > -40 && run.v <= 26) th.pose = 'bow'; th.x = d < 60 && d > -60 ? -4.2 : -3.4; }
      th.facing = th.facing || 0;
      const f0 = th.facing; if (dir < 0) th.facing = f0 + Math.PI;
      DH.stepPerson(th, dt);
      th.facing = f0;
    }
    this.people = this.people.filter(th => !(th.hidden && th.role === 'alight') && run.dTo(th.s) > -900);
  }
  doorsOpened(sp) {   // alighting passengers at each door, walking to the stairs
    const run = this.dr.run, rr = this.rr, L = sp.st.doorSide === 'L', edge = L ? -1.6 : 1.6, inward = L ? -1 : 1, mix = (run.R.zoneAt(sp.target) || {}).mix || { commuter: 1 };
    if (!sp.st.platforms.length) return;
    for (let car = 0; car < run.cars; car++) for (const off of [2.6, 12.6]) { if (rr() > .6) continue; const ds = sp.target - (car * 20 + off), p = DH.makePerson(rr, mix, run.rain); this.people.push(DH.personThing({ s: ds, x: edge + inward * .3, p, facing: L ? Math.PI : 0, role: 'alight', vs: (rr() - .5) * 1.4, vxw: inward * 1.1, life: 3.5, sp: sp.id })); }
  }
  things() { return this.people.filter(p => !p.hidden); }
}
DH.Crowd = Crowd;

/* ---------- a Drive: one run seen and heard ---------- */
class Drive {
  constructor(run, o = {}) {
    this.run = run; this.o = o; this.rail = DH.railFor(run.R);
    const R = run.R, trackX = s => { const x = R.trackX(run.track, DH.wrap(s, R.len)); return x === null ? 0 : x; };
    this.trackX = trackX;
    this.me = new DH.TrainActor({ id: 'me', kind: run.T.id, cars: run.cars, s: run.s, dir: 1, lights: true, xAt: trackX, dest: run.stage.parallel ? 'PARALLEL RUN' : 'LOCAL ' + run.stops[run.stops.length - 1].st.name });
    if (o.seatColor) this.me.seatColor = o.seatColor;
    this.story = new DH.Story(); this.crowd = new Crowd(this);
    this.cam = { s: 0, x: 0, h: 2.9, dir: 1, horizon: .4, fov: DH.T.fov };
    this.camMode = o.cam || 'cab'; this.director = null;
    Object.assign(this, { needle: 0, leverVis: run.li, toasts: [], halos: [], judge: null, banner: null, stopcam: null, glove: null, widgets: [], hover: null, drops: [], wiper: 0, wiperT: 0, visor: 0, lookX: 0, lookY: 0, sway: 0, bump: 0, pitch: 0, shake: 0, jointS: Math.floor(run.s / 25), bellT: 0, atsT: 0, ambT: 3, tip: null, hornDown: false, hornHold: 0, drag: null });
    this.grade = DH.grade(run.stage.tod, run.stage.weather, R); this.rain = run.rain;
    this.D = this; this.ghosts = o.ghosts || null; this.pilot = o.auto ? new DH.Autopilot(run, { skill: o.auto.skill === undefined ? 1 : o.auto.skill }) : null;
    this.project = (s, x, y) => this.rail.project(s, x, y);
    this.guide = null; this.tod = run.stage.tod;
  }
  get cabFull() { return this.camMode === 'cab' && !this.o.cabMin && game.settings.cabDisplay !== 'minimal'; }
  /** the player's commands from an input (or the autopilot's) */
  readInput(I, dt) {
    const c = {}, run = this.run, rep = a => I.repeat(a, .25, .18);
    c.power = rep('power'); c.brake = rep('brake'); c.neutral = I.pressed('neutral'); c.eb = I.pressed('eb'); c.ats = I.pressed('ats'); c.horn = I.down('horn'); c.view = I.pressed('view');
    c.call = I.pressed('call');
    if (I === game.input) {
      while (DH.wheelQueue.length) { const w = DH.wheelQueue.shift(); c[w] = true; }
      // the mouse: hover moves the focus over cab widgets; a click operates one (and is then not a call)
      const p = I.pointer && I.pointer();
      this.hover = null;
      if (p && I.lastDevice !== 'gamepad') for (const w of this.widgets) if (p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h) this.hover = w.id;
      if (this.hover && I.pressed('call')) {
        I.suppressCode && I.suppressCode('Mouse0'); c.call = false;
        const w = this.widgets.find(q => q.id === this.hover);
        if (w.id === 'eb') c.eb = true; else if (w.id === 'ats') c.ats = true; else if (w.id === 'cam') c.view = true; else if (w.id === 'horn') this.hornHold = .7;
        else if (w.id === 'strip') { const i = Math.floor((p[0] - w.x - 2) / w.cellW), n = w.list[E.clamp(i, 0, w.list.length - 1)]; if (n === 'N') c.neutral = true; else if (n === 'EB') c.eb = true; else { this.target = n; } }
        else if (w.id === 'handle') this.drag = { y: p[1], li: run.li };
      }
      if (this.drag) { if (!I.down('call')) this.drag = null; else { const want = clamp(this.drag.li + Math.round((this.drag.y - p[1]) / 6), -run.T.nb - 1, run.T.np); if (want > run.li) c.power = true; else if (want < run.li) c.brake = true; c.call = false; } }
      if (this.target) { const list = DH.HUD.notchList(run.T), cur = list.indexOf(run.notchName), want = list.indexOf(this.target); if (want === cur || want < 0) this.target = null; else if (want > cur) c.power = true; else c.brake = true; }
      if (c.call && p && I.lastDevice !== 'gamepad') { const what = this.rail.pick(p[0], p[1]); if (what && what.sig) c.callTarget = what.sig; }
      // look: the right stick or a right-drag, springing back
      const aim = I.padAim, pan = I.pan && I.pan();
      if (pan && (pan[0] || pan[1])) { this.lookX = clamp(this.lookX + pan[0], -game.W * .25, game.W * .25); this.lookY = clamp(this.lookY + pan[1], -game.H * .1, game.H * .1); this.looking = .2; }
      else if (aim) { this.lookX = E.approach(this.lookX, aim[0] * game.W * .25, game.W * dt * 2); this.lookY = E.approach(this.lookY, aim[1] * game.H * .1, game.H * dt); this.looking = .2; }
    } else {
      const aim = I.padAim; if (aim) { this.lookX = aim[0] * game.W * .12; this.looking = .2; }
    }
    if (this.hornHold > 0) { this.hornHold -= dt; c.horn = true; }
    return c;
  }
  /** one step: commands in, the run stepped, its events turned into the HUD, sound and story */
  update(dt, c) {
    const run = this.run;
    if (this.pilot) { const a = this.pilot.step(dt); c = Object.assign({}, a, { view: c && c.view }); }
    c = c || {};
    if (c.view) this.cycleView();
    if (this.stopcam && (c.call || c.power || c.brake) && this.stopcam.t > .4) this.stopcam.t = 99;
    this.hornDown = !!c.horn;
    run.step(dt, c);
    this.handle(run.out); run.out.length = 0;
    // animation state
    this.needle += (Math.abs(run.v) - this.needle) * Math.min(1, dt * 8);
    this.leverVis = E.approach(this.leverVis, run.li, dt / .08);
    for (const q of this.toasts) q.t += dt; this.toasts = this.toasts.filter(q => q.t < 1.8);
    for (const f of this.halos) f.t += dt; this.halos = this.halos.filter(f => f.t < 1.2);
    if (this.judge) this.judge.t += dt; if (this.banner) this.banner.t += dt; if (this.stopcam) this.stopcam.t += dt; if (this.glove) this.glove.t += dt; if (this.tip) this.tip.t += dt;
    if (this.tip && this.tip.t > 4.5) this.tip = null;
    if (this.looking > 0) this.looking -= dt; else { this.lookX *= Math.pow(.02, dt); this.lookY *= Math.pow(.02, dt); }
    // the cab's feel: sway with the curve, bumps at the joints, pitch with braking
    const swayK = DH.T.sway * (game.settings.camSway === undefined ? 1 : game.settings.camSway) * (game.reduceMotion ? 0 : 1);
    this.sway += (run.R.curveAt(run.wrapS(run.s)) * (run.v / 30) ** 2 * 60 - this.sway) * Math.min(1, dt * 2);
    this.pitch += ((run.Be || 0) * 1.1 - (run.Pe || 0) * .8 - this.pitch) * Math.min(1, dt * 3);
    const js = Math.floor(run.s / 25);
    if (js !== this.jointS) { this.jointS = js; if (Math.abs(run.v) > 3) { this.bump = 1; if (!this.o.mute) DH.Sound.play('joint', { v: Math.abs(run.v) }); if (this.o.rumble !== false && Math.abs(run.v) > 20) this.rumble(.05, .03); } }
    this.bump = Math.max(0, this.bump - dt * 8); this.shake = Math.max(0, this.shake - dt * 4);
    this.swayK = swayK;
    // the windshield in the rain: drops gather; the wipers sweep every 1.2 s
    if (this.rain && this.camMode === 'cab') {
      if (this.drops.length < 70 && game.rng01() < dt * (8 + Math.abs(run.v) * .2)) this.drops.push({ x: game.rng01(), y: game.rng01() * .9, r: .5 + game.rng01() * 1.2 });
      this.wiperT += dt; this.wiper = (this.wiperT % 1.2) / 1.2; const wx = .5 + Math.sin(this.wiper * Math.PI) * .45 - .45;
      if (Math.floor(this.wiperT / 1.2) !== this._lastWipe) { this._lastWipe = Math.floor(this.wiperT / 1.2); if (!this.o.mute) DH.Sound.play('wiper'); }
      this.drops = this.drops.filter(d => Math.abs(d.x - (.3 + Math.sin(this.wiper * Math.PI) * .45)) > .06 || this.wiper > .95);
    }
    this.visor = E.approach(this.visor, run.glareOn ? 1 : 0, dt * 1.5);
    this.crowd.update(dt);
    // the braking guide: where B4 must start, and the predicted stop point
    const sp = run.nextStop;
    if (sp && run.phase === 'run') {
      const d = sp.target - run.s, a4 = run.T.bk * 4 * DH.T.brakeScale, v = Math.abs(run.v) / 3.6, tau = run.T.lagA * DH.T.brakeLag / .7;
      const need = v * v / (2 * a4 / 3.6) + v * tau, B = Math.max(.05, run.Be || 0), pred = B > .2 ? v * v / (2 * B / 3.6) + v * (tau * .3) : null;
      this.guide = { brakeAt: d - need, stopAt: pred };
    } else this.guide = null;
    this.story.update(dt, Math.round(Math.max(6, Math.min(game.W, game.H) * .05)) + 44);
    // the soundscape
    if (!this.o.mute) this.sounds(dt);
  }
  rumble(s, t) { const I = this.o.input || game.input; if (I.rumble) I.rumble(s, t); }
  sounds(dt) {
    const run = this.run, R = run.R, s = run.wrapS(this.cam.s || run.s), f = R.flagAt(s);
    DH.Sound.update({ v: run.v, P: run.Pe || 0, B: run.Be || 0, regen: run.li < 0 && !run.isEB, train: run.T.sound, tunnel: !!(f & 1), bridge: !!(f & 2), rain: run.rain, horn: this.hornDown, on: !game.paused });
    // crossing bells, with distance and Doppler
    this.bellT -= dt;
    if (this.bellT <= 0) { this.bellT = .42; for (const cr of R.crossings) if (cr.warn) { const d = run.dTo(cr.s); if (Math.abs(d) < 700) { const vol = .14 * Math.max(.05, 1 - Math.abs(d) / 700), dop = 1 + (d > 0 ? 1 : -1) * (Math.abs(run.v) / 3.6) / 340; DH.Sound.play('crossbell', { vol, dop }); } } }
    // the ATS bell and chime
    if (run.ats.ringing && !run.ats.confirmed) { this.atsT -= dt; if (this.atsT <= 0) { this.atsT = .5; DH.Sound.play('atsbell'); } }
    else if (run.ats.chime) { this.atsT -= dt; if (this.atsT <= 0) { this.atsT = 1.1; DH.Sound.play('atschime'); } }
    if (run.grace <= 10 && run.grace > 0 && !run.stage.tutorial) { this._tick = (this._tick || 0) + dt; if (this._tick > 1) { this._tick = 0; DH.Sound.play('clockTick'); } }
    // ambience by zone
    this.ambT -= dt;
    if (this.ambT <= 0) {
      this.ambT = 4 + (Math.floor(run.t * 7) % 5);
      const z = R.zoneAt(s);
      if (z && z.id === 'harbor') DH.Sound.play(Math.floor(run.t) % 3 ? 'seagull' : 'ferry');
      if (run.festival && Math.abs(run.dTo(8700)) < 900) DH.Sound.play('taiko');
      if (run.stage.tod > 13 && run.stage.tod < 17 && z && /hills|temple|park/.test(z.id)) DH.Sound.play('cicada');
      if (run.phase === 'dwell') DH.Babble.murmur(3);
      if (run.phase === 'dwell' && run.v === 0 && !run.pilot) DH.Sound.play('compressor');
    }
  }
  handle(out) {
    const run = this.run, mute = this.o.mute;
    for (const e of out) switch (e.k) {
      case 'judge': this.judge = Object.assign({ t: 0 }, e); break;
      case 'toast': this.toasts.push({ text: e.text, color: e.color, t: 0 }); if (this.toasts.length > 3) this.toasts.shift(); break;
      case 'banner': this.banner = { text: e.text, color: e.color, t: 0 }; if (/ATS|SIGNAL|HAZARD!/.test(e.text)) this.shake = 1; break;
      case 'halo': if (Math.abs(e.d) >= .5) this.halos.push({ d: e.d, t: 0 }); break;
      case 'sfx': if (!mute) DH.Sound.play(e.name); break;
      case 'say': if (!this.o.quiet) this.story.say(e.who, e.line, e); break;
      case 'tip': if (!this.o.quiet && DH.tipWanted(e.id)) { this.tip = { id: e.id, t: 0 }; DH.tipShown(e.id); } break;
      case 'call': {
        const p = this.rail.project(e.s, e.x, e.y || 3) || [game.W * .5, game.H * .3];
        this.glove = { t: 0, dur: .8, x: p[0], y: p[1] };
        if (!mute) this.story.call(e.phrase, e.grade === 'AUTO' ? null : e.grade); else this.story.callSub = { phrase: e.phrase, grade: e.grade, t: 0 };
        if (e.grade === 'GREAT') this.toasts.push({ text: 'CALL GREAT', color: '#5ae0ff', t: 0 });
        break;
      }
      case 'stopcam': if (game.settings.stopCam !== false && !e.prelim) this.stopcam = { t: 0, err: e.err, label: e.label, sp: e.sp }; break;
      case 'doors': if (e.open && run.dw) this.crowd.doorsOpened(run.dw.sp); this.me.doorOpen = e.open ? 1 : 0; break;
      case 'melody': if (!mute) DH.Sound.melody(e.station); break;
      case 'pilot': if (!mute) DH.Sound.play('pshh'); break;
      case 'whoosh': if (!mute) { DH.Sound.play('whoosh'); DH.Sound.play('toot'); } this.shake = .8; break;
      case 'shake': this.shake = Math.min(1.5, (e.n || 2) / 3); break;
      case 'rumble': this.rumble(e.s, e.t); break;
      case 'gameOver': if (this.o.onGameOver) this.o.onGameOver(); break;
      case 'stageEnd': if (this.o.onEnd) this.o.onEnd(); break;
      case 'finale': if (this.o.onFinale) this.o.onFinale(); break;
      case 'certificate': break;
      case 'reset': break;
    }
    if (this.o.onEvents) this.o.onEvents(out);
  }
  cycleView() {
    const run = this.run, list = ['cab', 'chase'];
    const sp = run.phase === 'dwell' ? run.dw && run.dw.sp : run.nextStop; if (sp && Math.abs(sp.target - run.s) < 300 && sp.st.platforms.length) list.push('platform');
    const i = list.indexOf(this.camMode); this.camMode = list[(i + 1) % list.length];
    game.note && game.note(this.camMode.toUpperCase() + ' VIEW');
  }
  /** the camera for the current mode */
  camera() {
    const run = this.run, mode = this.director ? this.director.cam : this.camMode, tx = this.trackX(run.s), C = this.cam, k = this.swayK === undefined ? 1 : this.swayK;
    C.fov = DH.T.fov; C.lookX = this.lookX; C.lookY = this.lookY; C.pitchPx = 0; C.shakeX = 0; C.shakeY = 0;
    if (mode === 'cab' || mode === 'cabMin') {
      Object.assign(C, { s: run.s - 1.5, x: tx + this.sway * .02 * k, h: 2.9 + this.bump * .03 * k, dir: 1, horizon: this.cabFull ? .4 : .46 });
      C.pitchPx = this.pitch * 1.2 * k; C.lookX += -this.sway * 1.5 * k;
    } else if (mode === 'chase') Object.assign(C, { s: run.s - run.len - 25, x: this.trackX(run.s - run.len - 25) + 2, h: 9, dir: 1, horizon: .5, fov: 70 });
    else if (mode === 'chaseHigh') Object.assign(C, { s: run.s - run.len - 40, x: this.trackX(run.s - run.len - 40) + 6, h: 22, dir: 1, horizon: .5, fov: 70 });
    else if (mode === 'platform') {
      const sp = run.phase === 'dwell' && run.dw ? run.dw.sp : run.nextStop || run.stops[run.stops.length - 1], L = sp.st.doorSide === 'L';
      Object.assign(C, { s: sp.target + 15, x: (L ? -3.2 : 3.2) + this.trackX(sp.target), h: 2.8, dir: -1, horizon: .5, fov: 70 });
    } else if (mode === 'trackside') {
      if (!this._ts || run.s > this._ts.s + 40) this._ts = { s: run.s + 260 };
      Object.assign(C, { s: this._ts.s, x: tx - 4.5, h: 2, dir: -1, horizon: .5, fov: 70 });
    }
    if (this.shake > 0 && !game.reduceMotion) { C.shakeX = Math.sin(game.real * 61) * this.shake * 2; C.shakeY = Math.cos(game.real * 47) * this.shake * 2; }
    return C;
  }
  env() {
    const run = this.run, mode = this.director ? this.director.cam : this.camMode;
    this.me.s = run.s; this.me.lights = true;
    const actors = run.actors.concat(run.parked);
    if (mode !== 'cab' && mode !== 'cabMin') actors.push(this.me);
    if (this.ghosts) for (const gh of this.ghosts) if (gh.actor && !gh.gone) actors.push(gh.actor);
    if (this.o.others) for (const a of this.o.others()) actors.push(a);
    const things = this.crowd.things();
    if (run.cart.active && run.cart.crossing) things.push(DH.ART.cart(run.cart.crossing.s + 3, 1.9, run.cart));
    const fogOn = run.fogActive || run.stage.weather === 'fog';
    return { actors, grade: this.grade, weather: run.stage.weather, t: game.real, fogDist: run.fogActive ? 150 : run.stage.weather === 'fog' ? 520 : run.rain ? 650 : 1100, fogDensity: run.fogActive ? 2.2 : 1, headlight: true, extraThings: things };
  }
  /** draw the view (into a viewport in a split screen), weather, the cab, the HUD */
  draw(r, vp = { x: 0, y: 0, w: r.W, h: r.H }, o = {}) {
    const cam = this.camera(), env = this.env();
    DH.clockNow = this.run.clock; DH.camDir = cam.dir;
    r.overlay(g => {
      this.rail.paint(g, vp, cam, env);
      this.weather(g, vp, cam);
      if (this.cabFull && !o.noCab) DH.HUD.cab(g, this, vp);
      else this.widgets = [];
      if (!o.noHud) DH.HUD.hud(g, this, vp, !!o.compact);
      if (!o.noHud && !o.compact) this.story.drawCall(g, vp.w, vp.y + Math.round(vp.h * .62) - (this.cabFull ? 34 : 0));
      if (this.tip && !o.compact) this.drawTip(g, vp);
    });
    if (!o.noHud && !o.compact) this.story.draw(r);
  }
  weather(g, vp, cam) {
    const run = this.run, t = game.real;
    if (run.rain) { const n = 90, rr = E.rng(Math.floor(t * 20)); for (let i = 0; i < n; i++) { const x = vp.x + rr() * vp.w, y = vp.y + rr() * vp.h, l = 6 + rr() * 6; px.line(g, x, y, x - 2 - Math.abs(run.v) * .03, y + l, '#a8b8d0'); } }
    if (run.glareOn && this.grade.sun) { const a = .35 + .2 * Math.sin(t * .7); px.blend(g, a * (1 - this.visor * .55), 'add', () => { px.rect(g, vp.x, vp.y, vp.w, Math.round(vp.h * .45), '#ff9a50'); px.disc(g, vp.x + vp.w * .55, vp.y + vp.h * .32, vp.h * .25, '#ffe8b0'); }); }
    if (run.fogActive) px.blend(g, .25, 'normal', () => px.rect(g, vp.x, vp.y, vp.w, vp.h, this.grade.fog));
  }
  drawTip(g, vp) {
    const tp = DH.TIPS[this.tip.id]; if (!tp) return;
    const [a1, a2, text] = tp, lines = E.font.wrap(text, Math.min(260, vp.w - 40)), w = Math.min(280, vp.w - 30), h = 14 + lines.length * 9, x = vp.x + Math.round((vp.w - w) / 2), y = vp.y + Math.round(vp.h * (this.cabFull ? .7 : .9)) - h - (this.run.nextStop && this.run.nextStop.target - this.run.s < 600 && this.run.phase === 'run' ? 70 : 24);
    const a = this.tip.t < .2 ? this.tip.t / .2 : this.tip.t > 4.2 ? (4.5 - this.tip.t) / .3 : 1; if (a <= 0) return;
    px.blend(g, .85 * a, 'normal', () => px.rect(g, x, y, w, h, '#14204a')); px.rect(g, x, y, w, 1, '#ffd84a');
    E.font.text(g, 'TIP', x + 4, y + 3, '#ffd84a'); let gx = x + 24; gx += DH.Glyph.draw(g, a1, gx, y + 6); if (a2) DH.Glyph.draw(g, a2, gx + 2, y + 6);
    lines.forEach((l, i) => E.font.text(g, l, x + 6, y + 12 + i * 9, '#ffffff'));
  }
}
DH.Drive = Drive;
game.rng01 = (() => { const r = E.rng(12345); return () => r(); })();   // cosmetic only (rain drops); never game state
DH._rails = new Map();
DH.railFor = R => { let r = DH._rails.get(R.id); if (!r) { r = new DH.Rail(R, { fov: DH.T.fov }); DH._rails.set(R.id, r); } return r; };

/* ---------- the drive scene ---------- */
DH.startStage = (stageId, o = {}) => game.go('briefing', Object.assign({ stage: stageId }, o), { fade: 'wipe' });
DH.scenes = DH.scenes || {};
DH.scenes.drive = {
  pausable: true, camera: { zoom: false },
  enter(data) {
    DH.attractOn = false;
    if (!data || !data.stage) { data = DH.firstData || { stage: 'S1' }; DH.firstData = null; }
    const run = new DH.Run(data.stage, Object.assign({}, data.free || {}, { difficulty: game.settings.difficulty }));
    this.data = data;
    this.dr = new Drive(run, { onEnd: () => this.finish(), onGameOver: () => this.over(), onFinale: () => { this.finale = true; } });
    if (data.restore) run.restore(data.restore.snap, data.restore.cont);
    if (data.jump) DH.jump(run, data.jump.s, data.jump);
    if (DH.dev.auto) this.dr.pilot = new DH.Autopilot(run, { skill: DH.dev.autoSkill || 1 });
    this.overT = null; this.finale = false;
    DH.wheelWanted = () => game.sceneName === 'drive' && !game.paused;
    DH.music(game.settings.driveMusic ? 'drive' : null);
    DH.applyLeverDir();
    DH.current = this.dr;
  },
  exit() { DH.Sound.silence(); DH.wheelWanted = null; game.audio.duck(false); },
  update(dt) {
    const dr = this.dr;
    if (this.overT !== null) { this.overT += dt; if (this.overT > 2.2) game.go('gameover', { stage: this.data.stage, free: this.data.free, checkpoint: dr.run.checkpoint, score: dr.run.finalScore() }, { fade: 'dissolve' }); dr.update(dt, {}); return; }
    const c = dr.readInput(game.input, dt);
    dr.update(dt, c);
  },
  finish() {
    const run = this.dr.run;
    setTimeout0(() => game.go('results', { stage: this.data.stage, free: this.data.free, run: DH.summary(run), finale: this.finale }, { fade: 'wipe' }));
  },
  over() { this.overT = 0; DH.Sound.play('crack'); DH.music('gameover', { fade: .3 }); },
  draw(r) {
    this.dr.draw(r);
    if (this.overT !== null) r.overlay(g => { px.blend(g, Math.min(.75, this.overT / 2), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#202024')); DH.drawCrackedHalo(g, r.W / 2, r.H * .4, this.overT); });
    if (DH.dev.overlay) DH.devOverlay(r, this.dr);
  }
};
const setTimeout0 = fn => game.after ? game.after(0, fn) : fn();
DH.drawCrackedHalo = (g, x, y, t) => {
  const r = 30, k = Math.min(1, t / .6);
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, gap = Math.abs(Math.sin(a * 3)) < .15 && t > .5, off = t > .5 ? (Math.sin(i * 7) * (t - .5) * 12) : 0; if (gap) continue; px.rect(g, Math.round(x + Math.cos(a) * (r + off)), Math.round(y + Math.sin(a) * (r * .35 + off * .3) + (t > .5 ? (t - .5) * 20 * Math.abs(Math.sin(i)) : 0)), 3, 2, i % 2 ? '#c89a20' : '#ffd84a'); }
  if (k >= 1) E.font.title(g, 'OUT OF HALO TIME', Math.round(x), Math.round(y + 26), { scale: 2, colors: ['#ffffff', '#c8c8d0', '#8a8a98'], outline: '#0b0d18', align: 'center' });
};
/** what the results screen needs from a run */
DH.summary = run => ({
  id: run.id, rank: run.rank(), score: run.finalScore(), max: Math.round(run.maxScore), grace: run.grace, comfort: Math.round(run.comfort), pts: Object.assign({}, run.pts), stats: JSON.parse(JSON.stringify(run.stats)),
  stops: run.stops.slice(1).map(sp => ({ id: sp.id, name: sp.st.name, label: sp.label || (sp.missed ? 'MISSED' : '-'), err: sp.err, ontime: !!sp.ontime, smooth: !!sp.smooth, late: sp.late })), fired: run.fired.slice(), tutorial: !!run.stage.tutorial,
  nCalls: run.nCalls, nHorns: run.nHorns
});
})();
