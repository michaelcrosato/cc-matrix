// CRACKMANIA race scene (PLAN §3.1, §4.6, §5.2-5.7): every mode that drives goes through it: a campaign race, a puzzle
// or editor validation run, a Survival round, a hot seat turn, a split-screen race, an online round, the attract demo.
// A session says who drives (players: inputs or bots), which ghosts ride along, and what happens at the finish
import { ctx, E, U } from '../ctx.js';
import { Run, fmt, STEP } from '../race/run.js';
import { Plan, Bot } from '../race/bot.js';
import { Ghost } from '../race/ghost.js';
import { ChaseCam, FreeCam, poseOf, MODES, tvSpots, tvPick } from '../car/camera.js';
import { drawCar } from '../car/draw.js';
import { Driver, RACE_INPUT } from '../input.js';
import { CFG } from '../config.js';
import { add, sub, mul, len, dot, norm, cross, lerp3 } from '../lib/v3.js';
import { TYPES, frameAt } from '../track/blocks.js';
import { ENVS } from '../env/envs.js';
import { hud as drawHud, countdownFx } from '../ui/hud.js';
import { fx } from '../ui/fx.js';

const S = { session: null, t: 0, flyT: 0, phase: 'intro', fly: null, slow: 0, finishT: 0, orbit: 0, freeCam: null, devFree: null };
export const raceState = S;
/** start a race: o = { kind, track, course?, players: [{ input | bot, name, color, model, paint, ghostOf }], ghosts: [{ ghost, model, paint, name, color, tint }],
 *  intro: true (the flyover), countdown: 3, onFinish(session, player), onExit, best: { steps, splits }, label, hub } */
export function startRace(o) {
  const W = ctx.worlds, track = o.track;
  const course = o.course && o.course.track === track ? o.course : W.load(track, { sparse: o.sparse });
  const env = track.env, e = ENVS[env];
  const sess = Object.assign({ kind: 'race', countdown: 3, intro: true, players: [], ghosts: [], done: false, t: 0 }, o, { course, env });
  sess.players = (o.players || []).map((p, i) => {
    const model = p.model || e.car, run = new Run(course, model, { countdown: sess.intro ? 99 : sess.countdown, best: p.best || o.best });
    const cam = new ChaseCam(); cam.mode = p.cam || ctx.game.settings.defaultCam || 'far';
    const P = Object.assign({ i, name: 'YOU', color: '#ffffff', paint: null }, p, { model, run, cam, driver: p.input ? new Driver(p.input) : null, bot: null, results: null, lastEv: [], stopT: 0, flopT: 0, ghostOn: p.ghostOn ?? true, spin: 0, lean: [0, 0], vprev: [0, 0, 0] });
    if (p.bot) { const plan = p.bot.plan || new Plan(course, model, p.bot.skill ?? 1, p.bot.seed || 1); P.bot = new Bot(plan, p.bot); }
    return P;
  });
  sess.ghosts = (o.ghosts || []).filter(g => g && g.ghost);
  S.session = sess; ctx.session = sess; S.t = 0; S.slow = 0; S.finishT = 0; S.phase = sess.intro ? 'intro' : 'countdown'; S.flyT = 0;
  // the flyover: along the route, high and to the side
  S.fly = new FreeCam(); S.samples = course.samples; S.tv = tvSpots(course.samples, course.ph); S.tvCur = null;
  if (o.stay) { fx.reset(); return sess; }
  if (ctx.game.sceneName !== 'race') ctx.game.go('race', null, { fade: o.fade ?? .25 }); else enterViews();
  fx.reset();
  return sess;
}
function enterViews() {
  const sess = S.session, n = sess.players.filter(p => !p.hidden).length, w = ctx.worlds.world;
  const g = ctx.game;
  if (n >= 2) { g.splitScreen(n, { layout: n === 2 ? 'rows' : 'grid' }); while (w.cameras.length < n) w.addCamera({ mode: 'fixed', far: 46000, near: 2 }); }
  else g.splitScreen(0);
  ctx.sound && ctx.sound.raceStart(sess);
  if (ctx.music) ctx.music.race(sess.env, sess.kind);
}
/** a respawn or restart, from the player or the bot */
function restartPlayer(P, countdown = 1) {
  const sess = S.session, best = P.best || sess.best;
  P.run = new Run(sess.course, P.model, { countdown, best }); P.cam.snap(); if (P.bot) P.bot.reset(0);
  P.restarts = (P.restarts || 0) + 1; ctx.sound && ctx.sound.sfx('restart');
  if (sess.onRestart) sess.onRestart(P);
}
export function respawnPlayer(P) { P.run.respawn(); if (P.bot) P.bot.relocate(P.run.car); P.cam.snap(); fx.respawn(P.run.car); ctx.sound && ctx.sound.sfx('respawn'); }

function stepPlayers(dt) {
  const sess = S.session;
  for (const P of sess.players) {
    const run = P.run, car = run.car;
    let ctl = { steer: 0, gas: 0, brake: 0 };
    const I = P.input;
    if (P.driver && !sess.locked) ctl = P.driver.read(dt, ctx.game.settings.steerSens || 1);
    if (P.bot) { const b = P.bot.drive(car, dt, run.racing); ctl = b; if (b.respawn && run.racing) respawnPlayer(P); }
    // the player's buttons
    if (I && !sess.locked && run.phase !== 'finished') {
      if (I.pressed('respawn') && run.racing) respawnPlayer(P);
      if (I.pressed('restart') && sess.canRestart !== false) restartPlayer(P);
      if (I.pressed('camera')) { P.cam.mode = MODES[(MODES.indexOf(P.cam.mode) + 1) % 3]; P.cam.snap(); }
      for (const [k, m] of [['cam1', 'far'], ['cam2', 'close'], ['cam3', 'hood']]) if (I.map[k] && I.pressed(k)) { P.cam.mode = m; P.cam.snap(); }
      if (I.pressed('ghost')) { P.ghostOn = !P.ghostOn; ctx.game.note(P.ghostOn ? 'GHOSTS ON' : 'GHOSTS OFF', 1); }
      if (I.pressed('horn')) ctx.sound && ctx.sound.horn(P);
    }
    if (run.phase === 'countdown' && S.phase !== 'countdown') { /* held during the flyover */ }
    run.step(ctl, dt);
    // what happened: the HUD, the sound, the effects
    for (const ev of run.ev) onEvent(P, ev);
    run.ev.length = 0;
    // stopped or flopped: the prompt to respawn
    P.stopT = run.racing && car.kmh < 3 ? P.stopT + dt : 0;
    if (car.flop > 0) P.flopT = 2;
    P.flopT = Math.max(0, P.flopT - dt);
    // the wheels turn, the body leans
    const s = dot(car.v, car.f); P.spin += s / (CFG.cars[P.model].wheelR) * dt;
    const acc = mul(sub(car.v, P.vprev), 1 / dt); P.vprev = car.v.slice();
    const ax = dot(acc, car.f), ay = dot(acc, car.r), k = Math.min(1, 6 * dt);
    P.lean = [P.lean[0] + ((car.grounded ? Math.max(-.07, Math.min(.07, -ax * .004)) : 0) - P.lean[0]) * k, P.lean[1] + ((car.grounded ? Math.max(-.07, Math.min(.07, ay * .004)) : 0) - P.lean[1]) * k];
    P.cam.update(car, dt, sess.course.ph, { reduce: ctx.game.reduceMotion });
    if (P.input || P.listen) ctx.sound && ctx.sound.car(P, dt);
    fx.carStep(P, dt);
  }
}
function onEvent(P, ev) {
  const sess = S.session, g = ctx.game, pad = P.input;
  P.lastEv.push(ev);
  switch (ev.type) {
    case 'count': ctx.sound && ctx.sound.count(ev.n); break;
    case 'go': ctx.sound && ctx.sound.go(); break;
    case 'cp': fx.cp(P, ev); ctx.sound && ctx.sound.sfx('cp'); if (pad) pad.rumble(.2, .08); ctx.worlds.cheer(.6); break;
    case 'finish': fx.finish(P, ev); ctx.sound && ctx.sound.sfx('finish'); if (pad) pad.rumble(.6, .3); ctx.worlds.cheer(2); onFinish(P, ev); break;
    case 'missingCp': fx.text(P, 'MISSING CHECKPOINT', '#ff6a4a', 2); ctx.sound && ctx.sound.sfx('error'); break;
    case 'boost': fx.boost(P); ctx.sound && ctx.sound.sfx('boost'); if (pad) pad.rumble(.3, .1); break;
    case 'land': fx.land(P, ev); if (ev.impact > 4) { ctx.sound && ctx.sound.land(ev.impact); if (pad) pad.rumble(Math.min(1, ev.impact / 20), .12); } break;
    case 'wall': fx.wall(P, ev); ctx.sound && ctx.sound.wall(ev.impact); if (pad) pad.rumble(Math.min(1, ev.impact / 18), .1); if (ev.crash && !g.reduceMotion) g.shake(Math.min(6, ev.impact / 5)); break;
    case 'flop': ctx.sound && ctx.sound.sfx('flop'); break;
    case 'respawn': break;
    case 'splash': fx.splash(P); ctx.sound && ctx.sound.sfx('splash'); break;
    case 'fall': ctx.sound && ctx.sound.sfx('fall'); break;
  }
  if (sess.onEvent) sess.onEvent(P, ev);
}
function onFinish(P, ev) {
  const sess = S.session;
  P.results = { steps: ev.steps, delta: ev.delta, respawns: P.run.respawns, ghost: P.run.rec.encode({ steps: ev.steps, model: P.model, paint: P.paint, track: sess.track.id, date: Date.now() }), splits: P.run.splits.slice() };
  if (!S.finishT) { S.finishT = 1e-6; if (!ctx.game.reduceMotion && sess.players.length === 1 && !sess.noSlowmo) S.slow = .6; }
  if (sess.onFinish) sess.onFinish(sess, P);
}
export function update(dt) {
  const sess = S.session, g = ctx.game; if (!sess) return;
  if (ctx.dev && ctx.dev.open && ctx.dev.update(dt)) return;
  if (sess.kind !== 'demo' && ctx.talk && ctx.talk.update(dt)) return;
  S.t += dt; sess.t += dt;
  if (sess.update && sess.update(dt) === 'stop') return;
  // slow motion as the finish line passes
  if (S.slow > 0) { S.slow -= dt / Math.max(.2, g.timeScale); g.timeScale = S.slow > 0 ? .35 : 1; }
  if (S.phase === 'intro') {
    S.flyT += dt; flyover(dt);
    const skip = sess.players.some(P => P.input && (P.input.anyPressed())) || S.flyT > (sess.introTime || 2.6);
    if (skip) { S.phase = 'countdown'; for (const P of sess.players) { P.run.count = sess.countdown; P.run.countMax = sess.countdown; P.cam.snap(); } for (const P of sess.players) if (P.input) P.input.consumeAll(); }
  } else if (S.phase === 'countdown' && sess.players.every(P => P.run.phase !== 'countdown')) S.phase = 'racing';
  stepPlayers(dt);
  ctx.worlds.animateCrowd(dt); animDrapeau(dt);
  ctx.worlds.step(dt);
  fx.update(dt);
  if (S.finishT) S.finishT += dt;
  if (sess.after && S.finishT > (sess.afterTime ?? 1.2)) { const f = sess.after; sess.after = null; g.timeScale = 1; f(sess); }
}
function flyover(dt) {
  const Sm = S.samples; if (!Sm.length) return;
  const k = Math.min(1, S.flyT / (S.session.introTime || 2.6)), e = k * k * (3 - 2 * k), i = Math.min(Sm.length - 1, Math.floor(e * (Sm.length - 1))), s = Sm[i];
  const side = s.r || [0, 1, 0], pos = add(add(s.p, side, 30), [0, 0, 25]), look = s.p;
  S.fly.set(pos, look, 60);
}
function animDrapeau(dt) {
  const W = ctx.worlds.cur, d = W && W.drapeau; if (!d) return;
  const P = S.session.players[0], run = P && P.run;
  if (!run) return;
  if (run.phase === 'countdown' && S.phase !== 'intro') d.anim = { pose: run.count > 1 ? 'cast' : 'cheer' };
  else if (run.finished) d.anim = { pose: 'cheer' };
  else d.anim = { pose: run.racing && run.steps < 120 ? 'wave' : null };
}
/* ---- drawing ---- */
export function draw(r) {
  const sess = S.session; if (!sess) return;
  const vi = r.viewport ? r.viewport.i : 0;
  ctx.worlds.draw3d = (w, rr) => draw3d(w, rr, vi);
  ctx.worlds.draw(r);
  drawHud(r, sess, sess.players[vi] || sess.players[0], vi, S);
  if (!r.viewport && ctx.game.sceneName === 'race') { ctx.talk.draw(r); ctx.dev.draw(r); }
}
export function hudAll(r) { const sess = S.session; if (sess && sess.hudAll) sess.hudAll(r, S); ctx.talk.draw(r); ctx.dev.draw(r); }
function draw3d(w, r, vi) {
  const sess = S.session, g = ctx.game, alpha = g.alpha, t = g.real || 0;
  const P = sess.players[vi] || sess.players[0];
  // the camera: the flyover, the chase camera, the finish orbit, the dev mode's free camera, a TV camera
  let pose = null;
  if (ctx.dev && ctx.dev.freeCam) pose = ctx.dev.freeCam.pose(alpha);
  else if (S.phase === 'intro') pose = S.fly.pose(alpha);
  else if (sess.camOverride) pose = sess.camOverride(P, alpha);
  else if (P) {
    if (P.run.finished && S.finishT > 0 && sess.players.length === 1 && sess.orbit !== false) {
      const car = P.run.car, a = S.finishT * .35 + Math.atan2(car.f[1], car.f[0]) + Math.PI * .8, pos = add(car.p, [Math.cos(a) * 10, Math.sin(a) * 10, 3.5]);
      pose = poseOf(null, { pos, look: add(car.p, [0, 0, .6]), up: [0, 0, 1], fov: 60 });
    } else pose = P.cam.pose(alpha);
  }
  if (pose) { w.camera.pose = pose; w.camera.fixed = pose; }
  const car = P ? P.run.car : null;
  const tgt = car ? car.p : (S.samples[0] || { p: [0, 0, 0] }).p; if (!w.camera.target) w.camera.target = { x: 0, y: 0, z: 0 }; w.camera.target.x = tgt[0] * U; w.camera.target.y = tgt[1] * U; w.camera.target.z = tgt[2] * U;
  const pen = w.pen, near = pose ? [pose.x / U, pose.y / U] : null;
  // the track's moving parts
  const lights = S.phase === 'intro' ? 0 : P && P.run.phase === 'countdown' ? Math.max(0, Math.min(5, Math.floor((P.run.countMax - P.run.count) / P.run.countMax * 5) + 1)) : 6;
  const board = P && P.run.finished ? fmt(P.run.finishSteps) : P ? fmt(P.run.steps) : '';
  ctx.worlds.cur.view.draw(pen, { t, lights, board, passed: P ? P.run.cps : null, near, cpBoard: P && P.run.splits.length ? fmt(P.run.splits[P.run.splits.length - 1]) : null });
  ctx.worlds.drawScenery(pen, t, near);
  // the cars: each player's, part way between steps
  for (const Q of sess.players) {
    if (Q.hidden) continue;
    const ghostly = sess.players.length > 1 && Q !== P;   // (split screen: the others are ghosts to you)
    if (ghostly && P && len(sub(Q.run.car.p, P.run.car.p)) < 3) continue;   // (a ghost on top of your own car would fill your view)
    if (Q === P && P.cam.mode === 'hood' && S.phase !== 'intro' && !(ctx.dev && ctx.dev.freeCam) && !(P.run.finished && S.finishT > 0)) { drawBonnet(pen, Q, alpha, t); continue; }
    drawRunCar(pen, Q, alpha, ghostly, t);
  }
  // ghosts
  for (const G of sess.ghosts) {
    if (!(P ? P.ghostOn : true) && !G.always) continue;
    const st = G.steps ? G.steps(P) : (P ? P.run.steps : 0); if (st === null) continue;
    const at = G.live ? G.live() : G.ghost.at(st + alpha); if (!at) continue;
    if (P && len(sub(at.p, P.run.car.p)) < 1.2 && !G.solid) continue;   // (inside your own car: hidden)
    drawCar(pen, G.model, { p: at.p, f: at.f, r: at.r, u: at.u, steer: 0, spin: st * .05, brake: at.brake, boost: at.boost, lights: sess.env === 'frostpeak', t }, G.paint, { ghost: !G.solid });
    if (G.name) G._screen = w.project((at.p[0]) * U, (at.p[1]) * U, (at.p[2] + 2.2) * U);
  }
  fx.draw3d(pen, w, alpha);
  if (ctx.dev && ctx.dev.draw3d) ctx.dev.draw3d(pen, w, P);
  if (sess.draw3d) sess.draw3d(pen, w, P, alpha);
  pen.at();
}
/** the hood camera: your own car is the bonnet below the eye and a strip of dashboard (its paint, its lights) */
function drawBonnet(pen, Q, alpha, t) {
  const car = Q.run.car, L = Q._lastStep; let p = car.p, f = car.f, u = car.u;
  if (L && alpha < 1) { p = lerp3(L.p, car.p, alpha); f = norm(lerp3(L.f, car.f, alpha)); u = norm(lerp3(L.u, car.u, alpha)); }
  const r = cross(u, f), paint = Q.paint || {}, body = paint.body || '#e8402a';
  pen.frame(p[0] * U, p[1] * U, p[2] * U, f, r, u, U);
  pen.slab(.75, 0, .78, 2.3, 0, .62, 0, 1, 0, 1.7, .12, body).box(2.25, 0, .55, .12, 1.8, .25, '#2a2a30');
  if (paint.pattern === 1) for (const sd of [-1, 1]) pen.slab(.76, sd * .22, .85, 2.3, sd * .22, .69, 0, 1, 0, .16, .03, paint.patternColor || '#ffffff');
  pen.box(.55, 0, .86, .2, 1.8, .1, '#1a1a22');
  if (ENVS[S.session.env].lights) for (const sd of [-1, 1]) pen.glow(2.4, sd * .7, .5, .25, '#fff4c0');
  pen.at();
}
export function drawRunCar(pen, Q, alpha, ghostly, t) {
  const run = Q.run, car = run.car, prev = Q._prevPose, cur = { p: car.p.slice(), f: car.f.slice(), u: car.u.slice() };
  // part way between the last two steps
  let p = car.p, f = car.f, u = car.u;
  if (Q._lastStep && Q._lastStep.p && alpha < 1) { const L = Q._lastStep; p = lerp3(L.p, car.p, alpha); f = norm(lerp3(L.f, car.f, alpha)); u = norm(lerp3(L.u, car.u, alpha)); }
  const r = cross(u, f);
  const pose = { p, f, r, u, steer: car.steerVis || 0, spin: Q.spin, d: car.d, brake: car.brakeOn && car.kmh > 2, boost: car.boostT > 0, lights: ENVS[S.session.env].lights, lean: Q.lean, t, kmh: car.kmh };
  // a respawn: the car scales in
  const sc = run.respawnT ? 1 : 1;
  drawCar(pen, Q.model, pose, Q.paint, { ghost: ghostly || Q.ghostly });
}
/** keep each player's car of the step before (for drawing part way) */
export function rememberSteps() { const sess = S.session; if (!sess) return; for (const P of sess.players) { const c = P.run.car; P._lastStep = { p: c.p.slice(), f: c.f.slice(), u: c.u.slice() }; } }
export const raceScene = {
  input: RACE_INPUT, pausable: true, touch: [], camera: { zoom: false },
  pauseItems() {
    const sess = S.session, P = sess && sess.players.find(q => q.input); if (!sess || !P) return [];
    const L = [];
    if (sess.canRestart !== false) L.push(['Restart', () => { ctx.game.resume(); restartPlayer(P); }]);
    if (P.run.racing) L.push(['Respawn', () => { ctx.game.resume(); respawnPlayer(P); }]);
    L.push(['Camera: ' + { far: 'Far chase', close: 'Close chase', hood: 'Hood' }[P.cam.mode], () => { P.cam.mode = MODES[(MODES.indexOf(P.cam.mode) + 1) % 3]; P.cam.snap(); }]);
    L.push(['Ghosts: ' + (P.ghostOn ? 'on' : 'off'), () => { P.ghostOn = !P.ghostOn; }]);
    if (sess.kind === 'validate' || sess.kind === 'puzzle') L.push(['Back to the editor', () => { ctx.game.resume(); import('../editor/editor.js').then(m => m.backToEditor()); }]);
    return L;
  },
  quitTo() { const sess = S.session; if (sess && sess.quitTo) return sess.quitTo(); if (sess && (sess.kind === 'validate' || sess.kind === 'puzzle')) return import('../editor/editor.js').then(m => m.backToEditor()); ctx.game.go('menu'); },
  enter() { enterViews(); ctx.game.input.consumeAll(); },
  exit() { ctx.game.splitScreen(0); ctx.game.timeScale = 1; if (ctx.sound) ctx.sound.stopCar(); const s = S.session; if (s && s.onExit) s.onExit(s); },
  update(dt) { rememberSteps(); update(dt); },
  draw, hud: hudAll,
  back() { return false; }
};
