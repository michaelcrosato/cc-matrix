/* DENSHA DE HALO! · the attract mode: after 10 s without input on the title or a menu screen, an AI-driven demo loops
 * through the whole game (the depot, a dawn stop, rain and ATS, the obstruction, the rival at sunset, the last train
 * into Akari Central), cut by a camera director, then today's best drivers. Any input goes back to the title. It cheats
 * freely (no Halo Time lost, teleports) and never writes records. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, R = Math.round;
DH.IDLE_SCENES = ['title', 'halomap', 'freerun', 'duelLobby', 'log', 'about'];
DH.idle = 0;
/** teleport a run to s (v km/h, clock), as Dev Mode's jump and the attract vignettes do */
DH.jump = (run, s, o = {}) => {
  run.s = s; run.v = o.v || 0; run.P = 0; run.B = o.v ? 0 : 1; run.li = o.v ? 0 : -2; run.phase = 'run'; run.doors = 'closed'; run.doorAnim = 0; run.pilot = true; run.dw = null; run.backup = false; run.short = null;
  if (o.clock !== undefined) run.clock = o.clock;
  run.stopIdx = Math.max(0, run.stops.findIndex(sp => sp.target > s + 1)); if (run.stopIdx < 0) run.stopIdx = run.stops.length - 1;
  for (const sp of run.stops) if (sp.target < s) { sp.judged = true; if (sp.startSig) sp.startSig.held = false; }
  for (const c of run.calls) { const d = run.dTo(c.s); if (d < 30) c.state = 'done'; }
  for (const l of run.limits) { const a = run.dTo(l.s), u = l.until === null ? -1 : run.R.ahead(run.wrapS(run.rear), run.wrapS(l.until)); l.state = a > 0 ? 'idle' : u > 0 ? 'active' : 'past'; }
  for (const h of run.horns) { const d = run.R.ahead(run.wrapS(h.s), run.wrapS(s)); h.inside = false; h.done = d > 0; }
  for (const ev of run.events) if (typeof ev.at === 'number' && run.dTo(ev.at) < 0 && !o.keepEvents) ev.fired = true;
  run.prevS = s; run.depCall = null;
};
const V = [
  { stage: 'S0', len: 24, shots: [['cab', 9], ['chase', 7], ['cab', 8]], cap: 'DAWN DEPOT: THE LEVER, THE MARK' },
  { stage: 'S1', len: 42, at: 1380, v: 44, shots: [['cab', 12], ['platform', 18], ['cab', 12]], cap: 'FIRST LIGHT: STOP ON THE MARK, ON THE SECOND' },
  { stage: 'S2', len: 34, at: 5180, v: 40, clock: DH.tsec('10:17:50'), shots: [['cab', 18], ['chase', 8], ['cab', 8]], cap: 'HARBOR RAIN: ATS, YELLOW SIGNALS, THE FREIGHT' },
  { stage: 'S3', len: 36, at: 10840, v: 52, shots: [['trackside', 8], ['cab', 20], ['chase', 8]], cap: 'TEMPLE HILL: SOMETHING ON THE CROSSING!' },
  { stage: 'S4', len: 32, shots: [['platform', 10], ['chaseHigh', 12], ['cab', 10]], cap: 'SUNSET RUSH: TEN CARS, THE SKY LINER' },
  { stage: 'S5', len: 40, at: 20180, v: 40, shots: [['cab', 22], ['platform', 18]], cap: 'THE LAST HALO: INTO AKARI CENTRAL' },
  { board: true, len: 9 }
];
DH.ATTRACT = V;
DH.ATTRACT_LEN = V.reduce((a, v) => a + v.len, 0);
DH.scenes = DH.scenes || {};
DH.scenes.attract = {
  enter(data) { DH.attractOn = true; DH.idle = 0; this.vi = (data && data.vi) || 0; this.t = 0; this.total = 0; this.lastP = null; this.start(); DH.music('title'); },
  exit() { DH.attractOn = false; DH.Sound.silence(); },
  start() {
    const v = V[this.vi]; this.t = 0; this.dr = null;
    if (v.board) return;
    const run = new DH.Run(v.stage, { difficulty: 'Normal', cheat: true, autoCalls: false });
    if (v.at !== undefined) DH.jump(run, v.at, { v: v.v, clock: v.clock !== undefined ? v.clock : run.clock + 60, keepEvents: v.stage === 'S3' });
    this.dr = new DH.Drive(run, { auto: { skill: 1 }, quiet: true, rumble: false });
    this.dr.director = { cam: v.shots[0][0], i: 0, t: 0 };
  },
  update(dt) {
    const In = game.input;
    // any input leaves
    const p = In.pointer && In.pointer(); let moved = false;
    if (p && this.lastP && Math.hypot(p[0] - this.lastP[0], p[1] - this.lastP[1]) > 4) moved = true; this.lastP = p ? p.slice() : this.lastP;
    if ((In.anyPressed() || (In.clicked && In.clicked()) || moved || DH.wheelQueue.length || (In.padMove && Math.hypot(In.padMove[0], In.padMove[1]) > .3)) && this.total > .2) { DH.wheelQueue.length = 0; In.consumeAll && In.consumeAll(); game.go('title', null, { fade: 'wipe' }); return; }
    this.t += dt; this.total += dt;
    const v = V[this.vi];
    if (this.dr) {
      this.dr.update(dt, {});
      const D = this.dr.director; D.t += dt; const sh = v.shots[D.i]; if (sh && D.t > sh[1] && D.i < v.shots.length - 1) { D.i++; D.t = 0; D.cam = v.shots[D.i][0]; }
      if (this.dr.run.done || this.dr.run.phase === 'over') this.t = Math.max(this.t, v.len - 2);
    }
    if (this.t >= v.len) { this.vi = (this.vi + 1) % V.length; this.start(); }
  },
  draw(r) {
    const v = V[this.vi], W = r.W, H = r.H;
    if (this.dr) this.dr.draw(r, undefined, { noHud: false, compact: false });
    else { r.sky(['#0a0e24', '#14204a', '#1a2a5a']); r.overlay(g => { DH.logo(g, W / 2, 16, 3, game.real); E.font.text(g, "TODAY'S BEST DRIVERS", R(W / 2), 52, DH.COL.gold, { align: 'center', scale: 2 }); DH.boardRows().forEach(([n, s], i) => { E.font.text(g, (i + 1) + '. ' + n, R(W / 2 - 100), 76 + i * 16, '#ffffff', { scale: 1 }); E.font.text(g, DH.fmtNum(s), R(W / 2 + 100), 76 + i * 16, '#ffe27a', { align: 'right' }); }); DH.drawHaro(g, W / 2, H - 50, 1.5, game.real); }); }
    r.overlay(g => {
      px.rect(g, 6, H - 30, 40, 13, '#d02a20'); E.font.text(g, 'DEMO', 26, H - 27, '#ffffff', { align: 'center' });
      if (v.cap && this.t < 5) E.font.text(g, v.cap, R(W / 2), R(H * .45), '#ffffff', { align: 'center', shadow: '#000', outline: false });
      const blink = Math.floor(game.real * 1.5) % 2;
      if (DH.touchOnly) E.font.text(g, 'Controller or keyboard required', R(W / 2), H - 22, '#ffe27a', { align: 'center', shadow: '#000' });
      else if (blink) DH.Glyph.prompt(g, 'confirm', 'PRESS ANY BUTTON', W / 2, H - 18, '#ffe27a', 1, 'center');
      E.font.text(g, 'DENSHA DE HALO!', W - 6, H - 10, DH.COL.gold, { align: 'right' });
    });
  }
};
DH.boardRows = () => {
  const rows = DH.BOARD_DEFAULT.map(x => x.slice()); const tot = DH.progress.careerTotal; if (tot) rows.push(['YOU', tot]);
  return rows.sort((a, b) => b[1] - a[1]).slice(0, 5);
};
/** the idle timer: game time in the menu scenes without any input; paused under a Shell screen */
DH.idleStep = dt => {
  if (!DH.IDLE_SCENES.includes(game.sceneName) || DH.HUB) { DH.idle = 0; return; }
  if (game.shell && game.shell.screen) { return; }
  const In = game.input, p = In.pointer && In.pointer();
  let act = In.anyPressed() || !!(In.clicked && In.clicked()) || DH.wheelQueue.length > 0 || (In.padMove && Math.hypot(In.padMove[0], In.padMove[1]) > .3);
  if (p && DH._idleP && Math.hypot(p[0] - DH._idleP[0], p[1] - DH._idleP[1]) > 4) act = true; if (p) DH._idleP = p.slice();
  if (act) DH.idle = 0; else DH.idle += dt;
  if (DH.idle > 10) { DH.idle = 0; game.go('attract', { vi: 0 }, { fade: 'dissolve' }); }
};
})();
