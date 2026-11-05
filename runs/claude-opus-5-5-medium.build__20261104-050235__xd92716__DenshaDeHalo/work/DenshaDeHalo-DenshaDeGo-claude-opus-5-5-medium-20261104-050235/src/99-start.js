/* DENSHA DE HALO! · the start: boot steps (the routes compile behind the boot screen), the scenes, the idle timer for the
 * attract mode, deep links for testing (#stage=S2&s=5400, #attract, #halomap, #results=S1, #duel, #about, #gallery), and
 * game.debug for the tests and tools. In an AI Hub session the game goes straight to the round. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, S = DH.scenes;
// every menu scene counts idle time toward the attract mode
for (const name of DH.IDLE_SCENES) { const sc = S[name], up = sc.update; sc.update = function (dt) { DH.idleStep(dt); if (game.sceneName !== name) return; return up.call(this, dt); }; }
// the gallery: thirteen fixed shots of the rail renderer (#gallery, ←/→)
const SHOTS = [
  ['straight, day', 'S1', { s: 2050, x: 0, h: 2.9, dir: 1, horizon: .45 }, 12, 'clear'], ['curve and hill', 'S3', { s: 9260, x: 0, h: 2.9, dir: 1, horizon: .45 }, 14, 'clear'],
  ['station approach', 'S1', { s: 1350, x: 0, h: 2.9, dir: 1, horizon: .45 }, 7, 'clear'], ['platform with a crowd', 'S1', { s: 1500, x: 0, h: 2.9, dir: 1, horizon: .45 }, 8, 'clear'],
  ['close to a signal', 'S1', { s: 655, x: 0, h: 2.9, dir: 1, horizon: .45 }, 9, 'clear'], ['tunnel mouth', 'S2', { s: 5980, x: 0, h: 2.9, dir: 1, horizon: .45 }, 10, 'clear'],
  ['truss bridge', 'S1', { s: 2560, x: 0, h: 2.9, dir: 1, horizon: .45 }, 9, 'clear'], ['crossing, gates down', 'S1', { s: 1060, x: 0, h: 2.9, dir: 1, horizon: .45 }, 8, 'clear', true],
  ['quad track, a train alongside', 'S4', { s: 12500, x: 0, h: 2.9, dir: 1, horizon: .45 }, 17.4, 'clear'], ['night, headlights', 'S5', { s: 16050, x: 0, h: 2.9, dir: 1, horizon: .45 }, 23.2, 'clear'],
  ['rain', 'S2', { s: 4500, x: 0, h: 2.9, dir: 1, horizon: .45 }, 10.3, 'rain'], ['platform camera, train arriving', 'S1', { s: 15, x: -3.2, h: 2.8, dir: -1, horizon: .5, fov: 70 }, 6.6, 'clear'],
  ['chase camera', 'S1', { s: 2400, x: 2, h: 9, dir: 1, horizon: .5, fov: 70 }, 9, 'clear']
];
DH.GALLERY = SHOTS;
S.gallery = {
  enter(d) { this.i = (d && d.i) || 0; this.t = 0; },
  update(dt) { this.t += dt; const I = game.input; if (I.pressed('right')) this.i = (this.i + 1) % SHOTS.length; if (I.pressed('left')) this.i = (this.i + SHOTS.length - 1) % SHOTS.length; if (I.pressed('cancel')) game.go('title'); },
  draw(r) {
    const [cap, st, cam, tod, w, gates] = SHOTS[this.i], R = DH.route('halo'), rail = DH.railFor(R), sg = DH.STAGES[st];
    for (const sgn of R.signals) sgn.aspect = sgn.id === 'B101' ? 'Y' : 'G';
    const actors = [];
    if (this.i === 8) actors.push(new DH.TrainActor({ id: 'gal', kind: 'skyliner', cars: 8, s: 12650, dir: 1, xAt: s => R.trackX('D', s) || 7 }));
    if (this.i === 11) actors.push(new DH.TrainActor({ id: 'gal', kind: 'h8000', cars: 6, s: -60 + (this.t * 8) % 60, dir: 1, xAt: () => 0 }));
    if (this.i === 12) actors.push(new DH.TrainActor({ id: 'gal', kind: 'h8000', cars: 6, s: 2545, dir: 1, xAt: () => 0 }));
    for (const cr of R.crossings) { cr.warn = !!gates; cr.gate = gates ? 1 : 0; }
    const things = [];
    if (this.i === 3) { const rr = DH.rng('gal'); for (let i = 0; i < 18; i++) things.push(DH.personThing({ s: 1480 + i * 6, x: -2.8 - rr() * 1.5, p: DH.makePerson(rr, { commuter: 3, student: 2, kid: 1 }, false), facing: 0 })); for (const p of things) DH.stepPerson(p, 1 / 60); }
    DH.clockNow = tod * 3600;
    r.overlay(g => { rail.paint(g, { x: 0, y: 0, w: r.W, h: r.H }, cam, { actors, grade: DH.grade(tod, w, R), weather: w, t: game.real, fogDist: w === 'rain' ? 650 : 1100, headlight: true, extraThings: things }); E.font.text(g, (this.i + 1) + '/13  ' + cap.toUpperCase(), 6, 6, '#ffffff', { shadow: '#000' }); });
  }
};
// the game's debug handle for the tests and tools
game.debug = {
  snapshot() {
    const d = DH.current, run = d && d.run, sc = game.sceneName;
    const o = { scene: sc, attract: { active: sc === 'attract', vignette: S.attract.vi }, hub: { active: !!DH.HUB, phase: DH.hubState.phase, sent: DH.hubState.sent, progressCalls: DH.hubState.progressCalls }, errors: game.errors.map(e => e.message), idle: DH.idle };
    if (run && (sc === 'drive' || sc === 'hubRun')) Object.assign(o, { stage: run.id, s: run.s, km: run.s / 1000, v: run.v, notch: run.notchName, brakeEff: run.Be, grace: run.grace, score: run.score, clock: DH.clock(run.clock), nextStop: run.nextStop ? { id: run.nextStop.id, dist: run.nextStop.target - run.s } : null, lastJudgment: run.lastJudgment, signals: run.nextSignals(3).map(q => ({ id: q.sg.id, dist: q.d, aspect: q.sg.aspect })), limit: run.limitNow().v, events: run.fired.slice(), comfort: run.comfort, doors: run.doors, pilot: run.pilot, ats: { ringing: run.ats.ringing, confirmed: run.ats.confirmed }, camera: d.camMode, phase: run.phase });
    if (sc === 'duel') o.players = S.duel.drs.map(q => ({ s: q.run.s, v: q.run.v, score: q.run.finalScore(), done: q.run.done }));
    return o;
  },
  jump(stageId, o = {}) { if (game.sceneName !== 'drive' || DH.current.run.id !== stageId) { game.go('drive', { stage: stageId }, { fade: 0 }); game.advance(.05); } const run = DH.current.run; DH.jump(run, o.s !== undefined ? o.s : run.s, o); if (o.clock) run.clock = typeof o.clock === 'string' ? DH.tsec(o.clock) : o.clock; },
  auto(on, o = {}) { const d = DH.current; DH.dev.auto = on; DH.dev.autoSkill = o.skill || 1; if (d) d.pilot = on ? new DH.Autopilot(d.run, { skill: o.skill || 1 }) : null; if (d && o.cheat) d.run.o.cheat = true; },
  setTod(h) { const d = DH.current; d.tod = h; d.grade = DH.grade(h, d.run.stage.weather, d.run.R); },
  setWeather(w) { const d = DH.current; d.run.stage.weather = w; d.run.rain = w === 'rain'; d.rain = d.run.rain; d.grade = DH.grade(d.tod, w, d.run.R); },
  forceAspect(id, a) { DH.current.run.force[id] = a; },
  trigger(id) { const run = DH.current.run, ev = run.events.find(e => e.id === id); if (ev) { ev.fired = false; ev.at = run.s + 1; } },
  finishStage() { DH.devFinish(DH.current.run); },
  setGrace(n) { DH.current.run.grace = n; }
};
game.stateHash = () => { const d = DH.current; return d ? [Math.round(d.run.s * 100), Math.round(d.run.v * 100), d.run.grace, d.run.score] : [game.sceneName]; };
if (typeof window !== 'undefined') window.__dh = { game, DH, snapshot: () => game.debug.snapshot() };
// the first scene: a deep link, the hub's round, or the title
const deep = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), q = {}; for (const kv of h.split('&')) { const [k, v] = kv.split('='); if (k) q[k] = v === undefined ? true : decodeURIComponent(v); }
  return q;
};
const first = () => {
  if (DH.HUB) return 'hubWait';
  const q = deep();
  if (q.stage) return 'drive'; if (q.attract) return 'attract'; if (q.halomap) return 'halomap'; if (q.results) return 'results'; if (q.duel) return 'duelLobby'; if (q.about) return 'about'; if (q.gallery) return 'gallery'; if (q.log) return 'log';
  return 'title';
};
S.hubWait = { enter() { DH.hubConnect().then(info => { if (!info) game.go('title', null, { fade: 0 }); }); }, update() {}, draw(r) { r.sky(['#0a0e24', '#14204a', '#1a2a5a']); r.overlay(g => DH.logo(g, r.W / 2, r.H / 2 - 10, 3, game.real)); } };
const q = deep();
if (q.stage) DH.firstData = { stage: q.stage, jump: q.s ? { s: +q.s, v: +(q.v || 0), clock: q.clock ? DH.tsec(q.clock) : undefined } : null };
if (q.results) DH.firstData = { stage: q.results, run: { id: q.results, rank: 'A', score: 7000, max: 8000, grace: 30, comfort: 96, pts: { stops: 2400, punct: 1000, calls: 1500, smooth: 600, pen: 0 }, stats: { perfect: 2, ontime: 2, smooth: 2, calls: 14, great: 12, missed: 0, overruns: 0, slides: 0, ebs: 0, horns: 2, stopErr: [.04, -.12], judged: [], km: 3.4, spad: 0 }, stops: [{ id: 'hanabatake', name: 'HANABATAKE', label: 'PERFECT HALO!', err: .04, ontime: true, smooth: true }, { id: 'kujira', name: 'KUJIRA-BASHI', label: 'GREAT!', err: -.12, ontime: true, smooth: true }], fired: [], tutorial: false }, free: { free: true } };
game.start({
  scenes: S, scene: first(),
  boot: { title: 'DENSHA DE HALO!', steps: [['Laying the Halo Line', () => DH.route('halo')], ['Opening the depot', () => DH.route('depot')], ['Checking the signals', () => { const bad = DH.validateRoute(DH.route('halo'), Object.values(DH.STAGES)); if (bad.length) console.warn('route problems: ' + bad.join('; ')); }], ['Waking Haro-kun', () => DH.castRig('hoshino')]] }
});
DH.applyLeverDir();
game.settings.onChange = k => { if (k === 'leverDir') DH.applyLeverDir(); if (k === 'symbols') game.input.glyphs = game.settings.symbols; };
})();
