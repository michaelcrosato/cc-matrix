/* 61-attract: after 10 s without input on a menu screen, a looping demo (about three minutes) driven by the autopilot
 * (it may cheat: no Halo Time loss, jumps between vignettes) with a camera director cutting between shots: the depot at
 * dawn, a departure at Hanabatake, rain and the freight, the festival's obstruction, the Sky Liner at sunset, the last
 * train into Akari Central; then today's best drivers and the logo. Any input returns to the title. It writes nothing. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T;
/* ---- jumps inside a run (attract, Dev Mode) ---- */
DH.Run.prototype.skipBefore = function (s) {
  for (const c of this.callTargets) if (c.s <= s + 30) c.state = 'done';
  for (const z of this.hornZones) if (z.s <= s) z.done = true;
  for (const g of this.sigs) { const ss = this.sigState.get(g), u = this.U(g.s); ss.passed = u <= s; ss.beacon = u - 600 <= s; }
  if (this.events) for (const e of this.events.list) if (e.at && e.at.s !== undefined && this.U(e.at.s) <= s && !e.keep) e.done = true;
  for (const q of this.passes) if (q.target <= s) q.done = true;
};
/** jump to route metre s (unwrapped from the stage start) running at v km/h at the clock */
DH.Run.prototype.teleport = function (s, o = {}) {
  this.s = this.prevS = s; this.train.reset(o.v || 0); this.train.notch = 0; if (o.clock !== undefined) this.clock = o.clock;
  this.phase = 'run'; this.dwell = null; this.doors = 0; this.pilot = true; this.dep = null; this.backup = null; this.creep = null; this._wasMoving = (o.v || 0) > 1;
  this.stopIdx = Math.max(1, this.stops.findIndex(p => p.target > s + 5)); if (this.stopIdx < 0) this.stopIdx = this.stops.length - 1;
  this.skipBefore(s); this.actors = this.actors.filter(a => a.keep); this.lastAspectV = 999; this._aspects();
  this.emit('teleport', { s });
};
/** jump to stop k's dwell (doors open, 20 s before its departure) */
DH.Run.prototype.jumpToStop = function (k) {
  const p = this.stops[k]; if (!p) return; this.s = this.prevS = p.target; this.train.reset(0); this.train.notch = -4; this.stopIdx = k + 1;
  this.clock = (p.depT || p.arrT) - 20; this.phase = 'dwell'; this.skipBefore(p.target); this.backup = null; this.creep = null; this.dep = null;
  this._startDwell(p, this.clock, true); this._aspects();
};
const VIGNETTES = [
  { stage: 'S0', name: 'DAWN DEPOT', dur: 26, setup: (D, run) => { run.tut.i = 2; run.tut.next(); run.s = run.prevS = 150; run.train.reset(28); run.train.notch = 0; run._wasMovingT = true; }, shots: [[0, 'cab'], [9, 'chase'], [15, 'cab']] },
  { stage: 'S1', name: 'FIRST LIGHT LOCAL', dur: 34, setup: (D, run) => run.jumpToStop(1), shots: [[0, 'platform'], [13, 'cab'], [22, 'chase'], [28, 'cab']], after: (D, run, t) => { if (t > 22 && !D._tp) { D._tp = true; run.teleport(2420, { v: 72, clock: run.clock }); run.events.trigger('oncoming'); } } },
  { stage: 'S2', name: 'HARBOR RAIN RAPID', dur: 32, setup: (D, run) => run.jumpToStop(1), shots: [[0, 'cab'], [14, 'chase'], [20, 'cab']], after: (D, run, t) => { if (t > 20 && !D._tp) { D._tp = true; run.teleport(5960, { v: 55, clock: run.clock }); } } },
  { stage: 'S3', name: 'TEMPLE HILL LOCAL', dur: 34, setup: (D, run) => { run.teleport(9480, { v: 24, clock: DH.hms(14, 1, 40) }); for (const e of run.events.list) if (e.type === 'workers') run.events.fire(e); }, shots: [[0, 'cab'], [10, 'chase'], [15, 'cab']], after: (D, run, t) => { if (t > 15 && !D._tp) { D._tp = true; run.teleport(10650, { v: 50, clock: run.clock }); run.events.trigger('obstruction'); } } },
  { stage: 'S4', name: 'SUNSET RUSH', dur: 32, setup: (D, run) => { for (const e of run.events.list) if (e.type === 'rival') run.events.fire(e); run.jumpToStop(0); }, shots: [[0, 'cab'], [14, 'chaseHigh'], [24, 'cab']] },
  { stage: 'S5', name: 'THE LAST HALO', dur: 36, setup: (D, run) => run.teleport(19620, { v: 70, clock: DH.hms(23, 16, 30) }), shots: [[0, 'cab'], [14, 'chase'], [20, 'cab'], [30, 'platform']] }
];
DH.ATTRACT = VIGNETTES;
let A = null;
const attractStory = new DH.Story();
DH.scenes.attract = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { DH.attractOn = true; A = { i: 0, t: 0, total: 0, D: null, board: false, mouseT: game.input.mouse.t, start: game.real }; this.load(0); DH.Sound.music('march'); game.input.consumeAll(); },
  exit() { DH.attractOn = false; DH.Sound.stop(); DH.Babble.stop(); A = null; },
  load(i) {
    A.i = i % (VIGNETTES.length + 1); A.t = 0; A.board = A.i === VIGNETTES.length; DH._attractI = A.i;
    if (A.board) { A.D = null; return; }
    const V = VIGNETTES[A.i]; A.D = new DH.Drive(V.stage, { auto: { skill: 1, cheat: true }, god: true, demo: true, story: attractStory, mute: false });
    A.D.run.o.god = true; V.setup(A.D, A.D.run); A.D.cam = V.shots[0][1];
  },
  update(dt) {
    const I = game.input;
    // any input goes back to the title: keys, buttons, a stick, the mouse moving, a click, the wheel, a touch
    const pad = I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0 || I.padAim, ptr = I.pointer ? I.pointer() : null;
    if (A.ptr === undefined) A.ptr = ptr ? ptr.slice() : null;
    const moved = ptr && (!A.ptr || Math.hypot(ptr[0] - A.ptr[0], ptr[1] - A.ptr[1]) > 4);
    if (I.anyPressed() || pad || moved || I.mouse.t !== A.mouseT || DH.lastInput > A.start + .3 || I.clicked()) { DH.lastInput = game.real; game.go('title', null, { fade: 'wipe' }); return; }
    A.t += dt; A.total += dt;
    if (A.board) { if (A.t > 8) this.load(0); return; }
    const V = VIGNETTES[A.i], D = A.D;
    D.update(dt); if (V.after) V.after(D, D.run, A.t);
    let cam = V.shots[0][1]; for (const [t, c] of V.shots) if (A.t >= t) cam = c; if (D.cam !== cam) D.cam = cam;
    if (A.t >= V.dur || D.run.phase === 'finished' && D.endT > 4) this.load(A.i + 1);
  },
  draw(r) {
    if (!A) return;
    if (A.board || !A.D) { DH.drawScenic(r, 'title'); }
    else A.D.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, t = game.real;
      if (A.board) {
        px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W, H, '#05060c'));
        DH.drawLogo(g, W / 2, 16, t);
        T(g, 'TODAY\'S BEST DRIVERS', W / 2, 84, '#f2c230', { align: 'center', scale: 2, shadow: '#000' });
        DH.board().forEach(([n, s], i) => { const y = 108 + i * 16; T(g, (i + 1) + '.', W / 2 - 100, y, '#c8d0e8'); T(g, n, W / 2 - 80, y, '#ffffff'); T(g, String(s), W / 2 + 100, y, '#ffe070', { align: 'right' }); });
      }
      // the DEMO badge, the logo, the way out
      const blink = Math.floor(t * 1.5) % 2 === 0;
      E.ui.box(g, 6, 6, 54, 16, { bg: '#d02a2a', border: '#ffffff' }); T(g, 'DEMO', 33, 10, '#ffffff', { align: 'center' });
      if (!A.board) { T(g, 'DENSHA DE HALO!', 8, 26, '#f2c230', { shadow: '#000' }); T(g, VIGNETTES[A.i].name, 8, 36, '#c8d0e8', { shadow: '#000' }); }
      if (blink) { if (DH.touchOnly()) T(g, 'Controller or keyboard required', W / 2, H - 16, '#ffe9a0', { align: 'center', shadow: '#000' }); else DH.Glyph.row(g, [['confirm', 'PRESS ANY BUTTON']], W / 2, H - 18, { align: 'center', box: true }); }
    });
  }
};
})();
