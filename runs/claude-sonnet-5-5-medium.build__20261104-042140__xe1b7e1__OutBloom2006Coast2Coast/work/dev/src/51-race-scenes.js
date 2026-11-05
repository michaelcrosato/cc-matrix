/* The race scene (every mode drives through it) and the attract mode. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, { clamp } = E, S = OB.scenes, T = OB.txt;
const ghostDraw = function (g, sx, sy, s) { g.globalAlpha *= .5; OB.drawVehicle.call(this, g, sx, sy, s); g.globalAlpha = 1; if (this.tag) { const W = this.w * s; if (W > 10) { const wd = E.font.width(this.tag, { font: 'tiny' }); T(g, this.tag, sx - wd / 2, sy - W * 1.6, this.col, { font: 'tiny' }); } } };
OB.ghostCar = (col, tag) => ({ kind: 'sedan', z: 0, x: 0, w: 380, len: 440, col, tag, ghost: true, draw: ghostDraw });
const ctlFrom = (R) => {
  const I = game.input, [mx] = I.move();
  if (R.manual) return { steer: mx, gas: I.down('gas'), brake: I.down('brake'), drift: I.down('drift'), horn: I.down('horn'), radio: false, shift: I.pressed('radio') ? 1 : I.pressed('camera') ? -1 : 0 };
  return { steer: mx, gas: I.down('gas'), brake: I.down('brake'), drift: I.down('drift'), horn: I.down('horn'), radio: I.down('radio') };
};
const summarize = (R, d) => {
  const goal = R.state === 'goal' && !R.stage.def.next && (R.mode === 'drive' || R.mode === 'attract');
  const out = { mode: d.mode, goal: goal ? { idx: R.goalIdx } : null, grade: OB.gradeOf(R.petals), petals: R.petals, score: R.score, stats: R.stats, route: R.route, timeout: R.timeout, car: R.car.id, color: R.color, passId: R.passId, time: R.stageT, stage: R.route[0], mission: d.mission };
  if (d.mode === 'tour') { out.ok = !!(R.missionDone && R.missionDone.ok); out.why = R.missionDone && R.missionDone.why; out.mission = d.mission; }
  if (d.mode === 'trial') { const k = R.route[0], old = OB.save.best[k]; out.best = old ? Math.min(old, R.stageT) : R.stageT; out.newBest = !old || R.stageT < old; out.stage = k; if (out.newBest) { OB.save.best[k] = Math.round(R.stageT * 100) / 100; OB.save.ghosts[k] = R.ghostRec.filter(q => q[0] === k).map(q => q.slice(1, 3)); OB.persist(); } }
  return out;
};
const CAMS = ['Chase', 'High', 'Bumper'];
S.race = {
  pausable: true, view: 'side', res: [480, 270], expand: true,
  enter(d) {
    this.d = d = d || { mode: 'drive' }; OB.wireRaceAudio(); OB.fx.clear(); OB.bubble = null; OB.voice.clear(); this.ghosts = []; this.ghostIdx = null;
    const hub = d.mode === 'hub', o = { mode: d.mode, car: hub ? 'orchidea' : d.car, color: hub ? 0 : d.color, pass: hub ? 0 : d.pass, station: hub ? 0 : d.station, stage: d.stage || 0, mission: d.mission || null, seed: d.seed || 1, noRequests: d.mode === 'trial' || d.mode === 'tour', manual: game.settings.transmission === 'Manual' && !hub };
    if (hub) { o.trafficRng = window.AIHub.rng('traffic'); o.fixedRoute = [1, 4]; o.seed = window.AIHub.seed; o.countdown = Math.max(.3, (OB.hub && OB.hub.startIn) || 3.4); }
    this.race = new OB.Race(o); this.t = 0; this.devT = 0; this.done = false;
    if (d.mode === 'trial') { const gh = OB.save.ghosts[d.stage]; if (gh && gh.length) { this.ghostRec = gh; this.ghostCar = OB.ghostCar('#7ad8ff', 'BEST'); this.ghosts = [this.ghostCar]; } }
    OB.playSong(o.station, .1);
    OB.pauseItems = hub ? null : () => [['Restart', () => { game.resume(); game.go('race', this.d); }], ['Dev mode', () => { OB.dev.open = true; OB.dev.row = 0; game.resume(); }]];
    if (d.mode === 'drive' || d.mode === 'tour' || hub)
    this.introLine = OB.pickOf(OB.CAST.bruno.lines, Math.random); if (d.mode !== 'trial') OB.voice.say(this.introLine, 'bruno');
    if (OB.hub && OB.hub.onRaceEnter) OB.hub.onRaceEnter(this.race);
  },
  exit() { OB.pauseItems = null; OB.dev.open = false; },
  update(dt) {
    const R = this.race, I = game.input; this.t += dt; OB.voice.update(dt);
    if (OB.dev.open) { OB.devUpdate(dt, R); return; }
    if (OB.hub && OB.hub.frozen) return;
    if (I.pressed('camera') && !R.manual) { const c = CAMS[(CAMS.indexOf(game.settings.camera || 'Chase') + 1) % 3]; game.settings.set('camera', c); game.note('CAMERA: ' + c.toUpperCase()); }
    const ctl = ctlFrom(R);
    R.update(dt, ctl);
    R.turnSky = (R.turnSky || 0) + R.road.curveAt(R.pz) * R.speed * 12 * dt * .004;
    OB.engine(dt, R.speed, ctl.gas, Math.abs(R.x) > 1.08);
    if (this.ghostCar && R.state === 'go') { const k = Math.floor(R.stageT / .1), q = this.ghostRec[Math.min(k, this.ghostRec.length - 1)]; if (q) { this.ghostCar.z = q[0] + OB.AHEAD; this.ghostCar.x = q[1]; } }
    if (OB.hub && OB.hub.tick) OB.hub.tick(R, dt);
    if ((R.state === 'goal' || R.state === 'over') && R.endT > 2.6 && R.mode !== 'hub') this.finish();
  },
  finish() { if (this.done) return; this.done = true; const sum = summarize(this.race, this.d); game.go('results', sum); },
  draw(r) {
    const R = this.race, W = r.W, H = r.H;
    OB.drawRace(r, R, { ghosts: (this.ghosts || []).concat(OB.hub ? OB.hub.ghostCars(R.stageId) : []), rowLabel: this.d.mode === 'trial' ? 'TIME TRIAL' : this.d.mode === 'tour' ? 'POSTCARD' : this.d.mode === 'hub' ? 'FLOWER SPRINT' : null });
    r.overlay(g => {
      if (R.state === 'count' && this.d.mode !== 'trial') { OB.rigUpdate('bruno', 1 / 60, 'wave', 'shout'); OB.panel(g, W - 126, 66, 116, 70, { bg: '#2a1346dd' }); OB.portrait(g, 'bruno', W - 120, 72, 44); T(g, 'BRUNO BREZZA', W - 70, 74, '#ffe27a', { font: 'tiny' }); E.font.wrap(this.introLine, 62, { font: 'tiny' }).slice(0, 5).forEach((ln, i) => T(g, String(ln), W - 70, 82 + i * 7, '#ffffff', { font: 'tiny' }));
        const fx = W - 98 + Math.sin(game.time * 6) * 8; px.rect(g, W - 100, 124, 2, 16, '#d8d8e0'); px.poly(g, [[W - 100, 124], [fx + 28, 128], [W - 100, 134]], '#ffd23a'); }
      if (R.state === 'goal' && R.mode !== 'hub') { E.font.title(g, R.o.single || R.mode === 'trial' || R.mode === 'tour' ? (R.missionDone && !R.missionDone.ok ? 'TOO BAD' : 'FINISH!') : 'GOAL!', W / 2, Math.round(H * .3), { scale: 5, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 }); }
      if (R.state === 'over') E.font.title(g, R.timeout ? 'THE SUN HAS SET' : (R.missionDone && R.missionDone.why === 'rival' ? 'BEATEN!' : 'TOO BAD'), W / 2, Math.round(H * .3), { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c0302a'], depth: 2 });
      if (R.mission && R.state === 'go') { const m = R.mission, prog = m.rule === 'drift' ? Math.round(R.stats.driftPts + (R.drift.on ? R.drift.pts : 0)) + '/' + m.target : m.rule === 'sling' ? R.stats.slings + '/' + m.target : m.rule === 'pass' ? R.stats.passes + '/' + m.target : m.rule === 'near' ? R.stats.near + '/' + m.target : m.rule === 'rival' ? 'BEAT COSIMO' : m.rule === 'clean' ? 'NO CRASHES' : 'REACH THE GATE'; OB.panel(g, W / 2 - 80, H - 40, 160, 18, { bg: '#2a1346dd' }); T(g, m.name.toUpperCase() + '  ' + prog, W / 2, H - 35, '#ffe27a', { align: 'center', font: 'tiny' }); }
      if (OB.dev.open) OB.devDraw(g, W, H, R);
      if (OB.hub && OB.hub.draw) OB.hub.draw(g, W, H, R);
    });
  }
};
/* ---------------- attract mode: an AI drives; any input leaves ---------------- */
const ATTRACT = [{ car: 'orchidea', color: 0, pass: 0, stage: 0 }, { car: 'camelia', color: 2, pass: 1, stage: 3 }, { car: 'zinnia', color: 5, pass: 2, stage: 5 }, { car: 'girasole', color: 4, pass: 0, stage: 7 }, { car: 'papavero', color: 3, pass: 1, stage: 11 }];
let attractN = 0;
S.attract = {
  view: 'side', res: [480, 270], expand: true,
  enter() {
    const a = ATTRACT[attractN++ % ATTRACT.length]; OB.wireRaceAudio(); OB.fx.clear(); OB.bubble = null; this.t = 0; this.ignore = 0; OB.lastMouseT = game.input.mouse.t;
    this.race = new OB.Race({ mode: 'attract', car: a.car, color: a.color, pass: a.pass, stage: a.stage, seed: 100 + attractN, ai: true, countdown: 1.2, fork: attractN % 2, station: attractN % 5 }); this.race.god = true; OB.playSong(attractN % 5, .1);
  },
  exit() { OB.stopMusic(); },
  update(dt) {
    const R = this.race, I = game.input; this.t += dt; OB.voice.update(dt);
    if (this.t > .6 && OB.anyInput()) { game.go('title', null, { fade: .2 }); return; }
    R.o.fork = R.stageCount % 2; R.update(dt, R.aiControl()); R.turnSky = (R.turnSky || 0) + R.road.curveAt(R.pz) * R.speed * 12 * dt * .004; OB.engine(dt, R.speed * .6, true, false);
    R.clock = Math.max(R.clock, 30); R.crash = 0;
    if ((R.state === 'goal' || R.state === 'over') && R.endT > 2.5 || R.stageCount > 4) game.go('attract', null, { fade: .4 });
  },
  draw(r) {
    const W = r.W, H = r.H, R = this.race; OB.drawRace(r, R, { rowLabel: 'DEMO' });
    r.overlay(g => {
      if (Math.floor(game.real * 1.6) % 2 === 0) E.font.title(g, 'DEMO PLAY', W / 2, Math.round(H * .42), { scale: 3, align: 'center', colors: ['#ffffff', '#ffd0ec', '#ff6aa0'], depth: 2 });
      OB.drawPrompts(g, W, H, [['*', 'Press any button to play']]);
    });
  }
};
})();
