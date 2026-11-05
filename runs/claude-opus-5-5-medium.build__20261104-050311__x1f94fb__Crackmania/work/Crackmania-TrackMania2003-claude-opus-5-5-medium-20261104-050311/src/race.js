// The race scene: every driving mode runs here (campaign, puzzle validation, survival rounds, hot seat turns, split
// screen, AI Hub rounds, editor test drives, the attract mode's demo). Flyover -> 3-2-1-GO -> drive -> FINISH.
import { Run, Bot, fmt, fmtDelta, STEP } from './run.js';
import { ChaseCam, flyover, orbit, CAM_MODES } from './cam.js';
import { Recorder, Ghost } from './ghost.js';
import { CarSound, babble, STINGS } from './audio.js';
import { drawCar, defaultPaint } from './view.js';
import { CARS, CFG } from './config.js';
import { U, len, dot, add, scale, clamp } from './v3.js';
import { medalFor } from './app.js';
import { text, big, promptBar, panel, medalIcon, flagIcon, COL, MEDAL_COL, tw } from './ui.js';
import { kmh } from './car.js';

const E = globalThis.My3D2dge, px = E.px;
export const RACE_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'], down: ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'], left: ['KeyA', 'ArrowLeft', 'Pad14', 'PadAxisLeft'], right: ['KeyD', 'ArrowRight', 'Pad15', 'PadAxisRight'],
  gas: ['KeyW', 'ArrowUp', 'Pad7', 'Pad0'], brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad2'], respawn: ['Enter', 'Backspace', 'Pad1'], restart: ['Delete', 'KeyR', 'Pad3'],
  camera: ['KeyC', 'Pad5'], ghost: ['KeyG', 'Pad4'], horn: ['KeyH', 'Pad11'], cam1: ['Digit1'], cam2: ['Digit2'], cam3: ['Digit3'],
  confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], del: ['KeyX', 'Pad2'], alt: ['KeyT', 'Pad3']
};

export function raceScene(app) {
  const game = app.game;
  let S = null;
  const sfx = (n, o) => game.audio.sfx(n, o);
  const sting = n => game.audio.sting(STINGS[n], { at: 'now', duck: .5 });

  function makePlayer(spec, pl, i) {
    const lane = spec.players.length > 1 ? (i - (spec.players.length - 1) / 2) * 3.2 : 0, run = new Run(S.course, pl.carId, { countdown: spec.countdown ?? 3, lane });
    const P = { i, name: pl.name || 'PLAYER', carId: pl.carId, paint: pl.paint || defaultPaint(pl.carId), input: pl.input || game.input, color: pl.color || '#ffd23a',
      run, cam: new ChaseCam(), rec: new Recorder(), sound: new CarSound(game, pl.carId), bot: pl.bot ? new Bot(run, pl.bot) : null,
      spin: 0, lean: [0, 0], prevP: run.car.p.slice(), prevF: run.car.f.slice(), prevU: run.car.u.slice(), msg: [], cpShow: null, finishT: 0, place: 0, best: pl.best ?? null, bestSplits: pl.bestSplits || [], restarts: 0, runs: 1 };
    P.cam.mode = app.settingCam(); P.cam.reset(run.car);
    if (spec.intro === false) run.reset(spec.countdown ?? 3);
    return P;
  }
  function restart(P, cd = 1) {
    P.run = new Run(S.course, P.carId, { countdown: cd, lane: P.run.o.lane || 0 }); P.rec = new Recorder(); P.cam.reset(P.run.car); P.restarts++; P.runs++;
    if (P.bot) P.bot = new Bot(P.run, { skill: P.bot.skill, cheat: P.bot.cheat, seed: P.restarts + 3 });
    P.finishT = 0; P.cpShow = null; S.cpFlash = new Map(); if (S.spec.onRestart) S.spec.onRestart(P);
    sfx('respawn');
  }
  function enter(spec) {
    app.dialog.open = false;
    const prep = spec.prepared || app.prepare(spec.track);
    S = { skids: [], fireT: 0, spec, prep, course: prep.course, t: 0, phase: spec.intro === false ? 'race' : 'intro', introT: 0, ghosts: [], players: [], doneT: 0, showGhosts: true, cpFlash: new Map(), cheer: 0, msgs: [], over: false, slow: 0 };
    S.view = app.show(prep);
    S.players = spec.players.map((pl, i) => makePlayer(spec, pl, i));
    S.ghosts = (spec.ghosts || []).filter(g => g && (g.ghost || g.data || g.samples)).map(g => ({ ...g, g: g.ghost instanceof Ghost ? g.ghost : new Ghost(g.ghost || g) }));
    if (S.players.length > 1 && !game.headless) {
      const w = S.view.world; while (w.cameras.length < S.players.length) w.addCamera({ mode: 'fixed', far: 26000, mouseLook: false });
      game.splitScreen(S.players.length, { layout: S.players.length === 2 ? 'rows' : 'grid' });
    }
    if (S.phase === 'intro') { S.cam0 = new ChaseCam(); flyover(S.cam0, S.course.samples, 0); }
    app.music(S.prep.track.env, spec.music);
    // Monsieur Drapeau beside the start gate with his flag (a rig of the engine's, posed each step)
    if (S.view && S.course.startGate && !game.headless) {
      const g = S.course.startGate, side = g.r, x = (g.p[0] + side[0] * 9.5 + g.t[0] * 12) * U, y = (g.p[1] + side[1] * 9.5 + g.t[1] * 12) * U, z = g.p[2] * U;
      S.flagman = S.view.world.mob({ x, y, z, rig: new E.Humanoid({ size: 2.1, hat: 'cap', outfit: 'shirt', weapon: null, colors: { skin: '#f0c8a0', hair: '#2a2a2a', cloth: '#f4f4f4', pants: '#1a1a20' } }), fly: true, facing: Math.atan2(-side[1], -side[0]) });
      S.flagman.data.base = [x, y, z];
    }
    if (spec.onEnter) spec.onEnter(S);
    app.race = S;
  }
  function exit() {
    if (!S) return;
    for (const P of S.players) P.sound.dispose();
    if (S.flagman && S.view) S.view.world.remove(S.flagman);
    if (S.players.length > 1 && !game.headless) game.splitScreen(1);
    if (S.spec.onExit) S.spec.onExit(S);
    app.race = null;
  }
  function controls(P) {
    const I = P.input;
    if (P.bot) return P.bot.control();
    const mv = I.move(), dev = I.lastDevice;
    const an = a => I.analog ? I.analog(a) : (I.down(a) ? 1 : 0);
    return { steer: mv[0], gas: an('gas'), brake: an('brake'), keyboard: dev === 'keyboard' };
  }
  function handleEvents(P) {
    const R = P.run, c = R.car, ep = [c.p[0] * U, c.p[1] * U, c.p[2] * U], I = P.input;
    for (const e of R.events) {
      switch (e[0]) {
        case 'count': sting('count'); if (P.i === 0) babble(game, ['tri', 'deu', 'un'][3 - e[1]] || 'bo', 'drapeau'); break;
        case 'go': sting('go'); app.musicLayer(true); break;
        case 'cp': {
          sting('cp'); I.rumble && I.rumble(.2, .08); S.cpFlash.set(e[3], 1); S.cheer = 1;
          const best = P.bestSplits[R.splits.length - 1];
          P.cpShow = { t: 2.2, split: e[2], delta: best != null ? e[2] - best : null, n: e[1] };
          game.particles.glints(e[3].p[0] * U, e[3].p[1] * U, (e[3].p[2] + 4) * U, 16, '#bfe4ff');
          if (S.spec.onCp) S.spec.onCp(P, e);
          break;
        }
        case 'finish': {
          sting('finish'); P.finishT = 0; I.rumble && I.rumble(.5, .3); S.cheer = 1.5;
          game.particles.bits(ep[0], ep[1], ep[2] + 40, 40, ['#ffd23a', '#ff5a4a', '#5ab0ff', '#5ae07a', '#ffffff']);
          if (S.spec.onFinish) S.spec.onFinish(P, R);
          break;
        }
        case 'boost': sfx('boost'); I.rumble && I.rumble(.25, .15); break;
        case 'land': if (e[1] > 3) { sfx('land', { vol: Math.min(1, e[1] / 15) }); game.particles.dust(ep[0], ep[1], ep[2] - 8, 10); if (e[1] > 8) { game.shake(Math.min(4, e[1] / 6)); I.rumble && I.rumble(Math.min(1, e[1] / 20), .15); } } break;
        case 'wall': sfx(e[1] > 10 ? 'crash' : 'click', { vol: Math.min(1, e[1] / 12) }); if (e[2]) game.particles.sparks(e[2][0] * U, e[2][1] * U, e[2][2] * U, Math.min(20, 4 + e[1] | 0), 0); if (e[1] > 12) { game.shake(3); I.rumble && I.rumble(.7, .2); } break;
        case 'respawn': sfx('respawn'); game.particles.glints(ep[0], ep[1], ep[2] + 10, 20, '#fff6c0'); P.cam.reset(c); break;
        case 'splash': sfx('splash'); game.particles.bits(ep[0], ep[1], -2 * U, 30, ['#a8d8ff', '#ffffff', '#5aa0d8']); break;
        case 'fall': sfx('whoosh'); break;
        case 'flop': sfx('flop'); break;
        case 'missing': P.msg.push(['MISSING CHECKPOINT', 2, COL.red]); sfx('ui_err'); break;
      }
    }
  }
  function stepPlayer(P, dt) {
    const R = P.run, I = P.input;
    if (!P.bot && S.phase === 'race' && !S.spec.noControl && R.phase !== 'countdown') {
      if (I.pressed('respawn') && R.phase !== 'finished') R.respawn();
      if (I.pressed('restart') && (!S.spec.noRestart)) { restart(P); return; }
      if (I.pressed('camera')) { P.cam.mode = CAM_MODES[(CAM_MODES.indexOf(P.cam.mode) + 1) % 3]; game.note('CAMERA: ' + P.cam.mode.toUpperCase(), 1); }
      for (let k = 1; k <= 3; k++) if (I.pressed('cam' + k)) P.cam.mode = CAM_MODES[k - 1];
      if (I.pressed('ghost')) { S.showGhosts = !S.showGhosts; game.note(S.showGhosts ? 'GHOSTS ON' : 'GHOSTS OFF', 1); }
      if (I.pressed('horn')) { sfx('horn'); babble(game, 'beep beep', 'player'); }
    }
    P.prevP = R.car.p.slice(); P.prevF = R.car.f.slice(); P.prevU = R.car.u.slice();
    if (S.phase === 'intro') return;
    const ctl = R.phase === 'finished' ? { steer: 0, gas: 0, brake: .4 } : controls(P);
    if (S.spec.cheatGrip && P.bot) R.car.boostT = Math.max(R.car.boostT, 0);
    R.step(ctl, dt);
    P.rec.sample(R);
    handleEvents(P);
    const c = R.car, sp = len(c.v);
    P.spin += sp / CARS[P.carId].wheelR * dt;
    const acc = dot(c.v, c.f) - (P.lastV || 0); P.lastV = dot(c.v, c.f);
    P.lean[0] += (clamp(-acc / dt * .004, -.07, .07) - P.lean[0]) * Math.min(1, 6 * dt);
    P.lean[1] += (clamp(c.steerIn * sp * .002, -.06, .06) - P.lean[1]) * Math.min(1, 6 * dt);
    P.cam.follow(c, dt, S.course.phys, { reduceMotion: game.settings.reduceMotion });
    if (P.cpShow && (P.cpShow.t -= dt) <= 0) P.cpShow = null;
    P.msg = P.msg.filter(m => (m[1] -= dt) > 0);
    if (R.phase === 'finished') P.finishT += dt;
    // dust and smoke from the wheels
    if (c.grounded && !game.headless && (S.t * 120 | 0) % 3 === 0) {
      const rear = add(c.p, c.f, -1.4), e = [rear[0] * U, rear[1] * U, (rear[2] - .4) * U];
      if (['sand', 'dirt', 'grass', 'snow'].includes(c.surface) && sp > 6) game.particles.smoke(e[0], e[1], e[2], 1, { size: .6 + sp / 40, color: { sand: '#e8c890', dirt: '#a8784a', grass: '#7ab05a', snow: '#f4f8ff' }[c.surface] });
      else if (c.slide > 3 || c.drift) game.particles.smoke(e[0], e[1], e[2], 1, { size: .7, color: c.surface === 'ice' ? '#e0f4ff' : '#d0d0d8' });
      if (c.boostT > 0) game.particles.add({ kind: 'fire', x: e[0], y: e[1], z: e[2] + 6, vx: -c.f[0] * 80, vy: -c.f[1] * 80, vz: 10, life: .25, size: 2 });
    }
    // skid marks: dark streaks from the rear wheels while sliding, drifting or braking hard (the last 240, fading over 8 s)
    if (c.grounded && sp > 5 && (c.slide > 2.5 || c.drift || (c.brakeVis > .8 && sp > 15))) {
      for (const sd of [-1, 1]) { const w = add(add(c.p, c.f, -CARS[P.carId].wheelbase / 2), c.r, sd * CARS[P.carId].track / 2), q = add(w, c.u, -CARS[P.carId].ride + .04), k = P.i * 2 + (sd > 0 ? 1 : 0);
        const last = P['sk' + k]; if (last && Math.hypot(q[0] - last[0], q[1] - last[1], q[2] - last[2]) < 3) S.skids.push({ a: last, b: q, u: c.u.slice(), t: S.t }); P['sk' + k] = q; }
      if (S.skids.length > 240) S.skids.splice(0, S.skids.length - 240);
    } else { P.sk0 = P.sk1 = P.sk2 = P.sk3 = P.sk4 = P.sk5 = P.sk6 = P.sk7 = null; }
    P.sound.update(dt, { speed: sp, throttle: ctl.gas || 0, slide: c.slide, surface: c.surface, grounded: c.grounded, held: c.held, on: !game.paused && S.phase !== 'intro' && !S.mute });
  }
  function update(dt) {
    if (!S) return;
    if (app.devOpen && app.dev && app.dev.update(dt)) return;
    S.t += dt;
    if (app.dialog.update(dt)) return;
    if (S.spec.hooks && S.spec.hooks.update && S.spec.hooks.update(S, dt) === false) { stepWorld(dt); return; }
    if (S.phase === 'intro') {
      S.introT += dt; flyover(S.cam0, S.course.samples, Math.min(1, S.introT / 2.5));
      if (S.introT > 2.5 || game.input.anyPressed() || S.players.some(P => P.input.anyPressed && P.input.anyPressed())) { S.phase = 'race'; for (const P of S.players) P.input.consumeAll && P.input.consumeAll(); for (const P of S.players) { P.run.reset(S.spec.countdown ?? 3); P.cam.reset(P.run.car); } }
    }
    for (const P of S.players) stepPlayer(P, dt);
    for (const [g, v] of S.cpFlash) { if (v - dt <= 0) S.cpFlash.delete(g); else S.cpFlash.set(g, v - dt); }
    S.cheer = Math.max(0, S.cheer - dt * .5);
    // fireworks over the finish after a finish with a medal (or any finish in the other modes)
    if (S.players.some(P => P.run.finished && P.finishT < 4) && !game.headless && (S.fireT -= dt) <= 0) {
      S.fireT = .35; const fn = S.players.find(P => P.run.finished).run.car, n = (S.t * 7 | 0) % 5;
      if (fn) { const x = (fn.p[0] + fn.r[0] * (n - 2) * 7 + fn.f[0] * 28) * U, y = (fn.p[1] + fn.r[1] * (n - 2) * 7 + fn.f[1] * 28) * U, z = (fn.p[2] + 9 + (n % 3) * 4) * U, cols = [['#ff5a4a', '#ffd23a'], ['#5ab0ff', '#ffffff'], ['#5ae07a', '#ffd23a'], ['#e85ab8', '#ffffff'], ['#ff9a2a', '#fff0a0']][n];
        game.particles.bits(x, y, z, 60, cols); game.particles.glints(x, y, z, 30, cols[1]); game.audio.sfx({ wave: 'noise', freq: 700, to: 90, dur: .3, vol: .12 }); }
    }
    if (S.spec.hooks && S.spec.hooks.after) S.spec.hooks.after(S, dt);
    // everyone done: a slow-motion orbit, then the mode decides what's next
    if (S.phase === 'race' && !S.spec.endless && S.players.every(P => P.run.finished || P.out)) { S.phase = 'done'; S.doneT = 0; }
    if (S.phase === 'done') {
      S.doneT += dt; game.timeScale = S.doneT < .6 && !game.settings.reduceMotion ? .4 : 1;
      if (S.doneT > 1.6 && !S.over) { S.over = true; game.timeScale = 1; if (S.spec.onDone) S.spec.onDone(S); }
    }
    stepWorld(dt);
  }
  function stepWorld(dt) {
    const v = S.view; if (!v) return;
    if (S.flagman) {
      const R = P0() && P0().run, F = S.flagman, b = F.data.base; F.vx = F.vy = F.vz = 0; F.place && (Math.hypot(F.x - b[0], F.y - b[1]) > 4) && F.place(b[0], b[1], b[2]);
      F.anim = R && R.phase === 'countdown' ? { pose: 'cast' } : R && R.finished ? { pose: 'cheer', expr: 'shout' } : R && R.steps < 180 ? { pose: 'cheer' } : { pose: 'hips' };
    }
    const first = S.players[0], c = first ? first.run.car : null;
    if (c) v.world.camera.target = { x: c.p[0] * U, y: c.p[1] * U, z: c.p[2] * U };
    const cams = v.world.cameras;
    S.players.forEach((P, i) => {
      let pose;
      if (S.phase === 'intro') pose = S.cam0.pose();
      else if (P.run.finished && P.finishT > .3 && !S.spec.noOrbit) { const tmp = new ChaseCam(); orbit(tmp, P.run.car.p, P.finishT * .35 + 1, 10, 3.5); pose = tmp.pose(); }
      else pose = P.cam.pose();
      if (cams[i]) { cams[i].set('fixed'); cams[i].fixed = pose; }
    });
    v.world.step(dt);
  }
  function carState(P, alpha) {
    const c = P.run.car, a = alpha;
    const lp = (x, y) => [x[0] + (y[0] - x[0]) * a, x[1] + (y[1] - x[1]) * a, x[2] + (y[2] - x[2]) * a];
    return { p: lp(P.prevP, c.p), f: lp(P.prevF, c.f), u: lp(P.prevU, c.u), r: c.r, steer: c.steerVis, wheelSpin: P.spin, wd: c.wd, brake: c.brakeVis > .3 && kmh(c) > 3, boost: c.boostT, lights: S.prep.track.env === 'frostpeak', lean: P.lean, time: S.t };
  }
  function draw(r) {
    if (!S) return;
    const v = S.view; if (!v) return;
    const vp = r.viewport, pen = v.world.pen;
    {
      // the world's pen empties after each render: every viewport draws the frame's parts again
      v.drawTrack(game.real || S.t, { cpFlash: S.cpFlash, startGate: S.course.startGate, lights: lightsState(), cheer: S.cheer });
      for (const P of S.players) { if (P.out) continue; drawCar(pen, P.carId, carState(P, game.alpha || 1), P.paint, { scale: P.run.respawnFx > 0 ? 1 - P.run.respawnFx : 1 }); }
      if (S.showGhosts) for (const G of S.ghosts) {
        const st = G.g.at(G.offset ? S.players[0].run.steps + G.offset : (G.own ? G.own.run.steps : S.players[0].run.steps)); if (!st || (G.hideDone && st.done)) continue;
        drawCar(pen, G.carId || S.players[0].carId, { ...st, wheelSpin: S.t * st.speed * 3, time: S.t, boost: st.boost ? 1 : 0 }, G.paint, { ghost: true, tint: G.tint || G.color || '#d8e8ff' });
      }
      if (S.spec.hooks && S.spec.hooks.draw3d) S.spec.hooks.draw3d(S, pen);
      if (app.dev) app.dev.draw3d(S, pen);
      pen.ghost = true; for (const k of S.skids) { const age = S.t - k.t; if (age > 8) continue; const sh = Math.round(20 + age * 8).toString(16).padStart(2, '0'); pen.at(0, 0, 0, 0, U).slab(k.a[0], k.a[1], k.a[2], k.b[0], k.b[1], k.b[2], k.u[0], k.u[1], k.u[2], .03, .26, '#' + sh + sh + sh); } pen.ghost = false;
      S.skids = S.skids.filter(k => S.t - k.t <= 8);
      if (S.flagman) {   // his chequered flag: raised for the count, dropped at GO, waved at the finish
        const F = S.flagman, R = P0().run, up = R.phase === 'countdown' ? 1 : R.finished ? Math.sin(S.t * 8) * .5 + .5 : Math.max(0, 1 - R.steps / 40);
        pen.at(F.x, F.y, F.z, F.facing, U).tube(.3, .35, .9, .3 + up * .2, .35, 1.4 + up * 1.3, .04, '#5a3a20');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pen.box(.3 + up * .2, .55 + i * .22 + Math.sin(S.t * 9 + i) * .05, 1.2 + up * 1.3 - j * .22, .02, .22, .22, (i + j) % 2 ? '#111111' : '#f8f8f8');
      }
      // lamps along Frostpeak's road at dusk
      if (S.prep.track.env === 'frostpeak' && v.lamps && P0()) { const c = P0().run.car; v.lamps.forEach((L, k) => { L.on = true; L.x = (c.p[0] + c.f[0] * (k * 14 + 6)) * U; L.y = (c.p[1] + c.f[1] * (k * 14 + 6)) * U; L.z = (c.p[2] + 6) * U; L.power = 6; }); }
    }
    v.world.draw(r);
    const C = S.course;
    game.particles.ground = (x, y, z) => { const h = C.phys.ray([x / U, y / U, z / U + 1], [0, 0, -1], 40); return h ? (z / U + 1 - h.toi) * U : -60 * U; };
    if (!vp) hud(r, S.players[0], { x: 0, y: 0, w: r.W, h: r.H });
    else hud(r, S.players[vp.i], { x: vp.x, y: vp.y, w: vp.w, h: vp.h });
  }
  const P0 = () => S.players[0];
  function lightsState() { const R = P0() && P0().run; if (!R || S.phase === 'intro') return 0; if (R.phase === 'countdown') return Math.min(5, Math.floor((3 - R.cd) / 3 * 5) + 1); return R.steps < 120 ? 6 : 0; }
  function hud(r, P, box) {
    if (!P) return;
    r.overlay(g => { if (box.x || box.y) { g.save(); g.translate(box.x, box.y); } try { hudDraw(g); } finally { if (box.x || box.y) g.restore(); } });
    function hudDraw(g) {
      const W = box.w, Hh = box.h, R = P.run, small = S.players.length > 1;
      const sc = small ? 2 : 3;
      if (S.phase === 'intro') {
        big(g, S.prep.track.name, W / 2, Hh * .2, '#ffffff', small ? 2 : 3);
        if (S.spec.subtitle) text(g, S.spec.subtitle, W / 2 - tw(S.spec.subtitle) / 2, Hh * .2 + 34, '#ffd23a');
        promptBar(g, game, [['confirm', 'SKIP']]);
        return;
      }
      if (S.spec.hooks && S.spec.hooks.hud && S.spec.hooks.hud(S, P, g, W, Hh) === false) return;
      // the clock
      big(g, fmt(R.steps), W / 2, 8, R.finished ? '#ffd23a' : '#ffffff', sc);
      if (P.cpShow) { const d = P.cpShow.delta; text(g, fmt(P.cpShow.split), W / 2 - tw(fmt(P.cpShow.split)) / 2, 8 + sc * 9 + 4, '#ffffff'); if (d !== null) { const s = fmtDelta(d); text(g, s, W / 2 - tw(s) / 2, 8 + sc * 9 + 22, d <= 0 ? COL.blue : COL.red); } }
      // checkpoints and respawns
      flagIcon(g, 10, 10); text(g, 'CP ' + R.cpCount + '/' + S.course.cps.length, 26, 10, '#ffffff');
      if (R.respawns) E.font.text(g, 'RESPAWNS ' + R.respawns, 10, 30, '#c8c8d8', { outline: '#10101a' });
      if (small) text(g, P.name, 10, Hh - 26, P.color);
      // the medal to beat, and your best
      const M = S.spec.medals;
      if (M && !small) {
        const cur = medalFor(P.best, M), next = Math.min(4, cur + 1), tgt = [0, M.bronze, M.silver, M.gold, M.author][next], x = W - 120, cr = game.cornerArea ? game.cornerArea() : null, y = cr ? Math.max(10, cr.y1 + 4) : 10;
        medalIcon(g, x, y, next); text(g, fmt(tgt), x + 22, y + 2, MEDAL_COL[next]);
        if (P.best != null) E.font.text(g, 'BEST ' + fmt(P.best), x + 22, y + 20, '#c8c8d8', { outline: '#10101a' });
      }
      if (S.spec.hooks && S.spec.hooks.hudExtra) S.spec.hooks.hudExtra(S, P, g, W, Hh);
      // speed
      const v = Math.round(kmh(R.car) * (game.settings.units === 'mph' ? .6214 : 1));
      big(g, v, W - 34, Hh - (small ? 34 : 48), R.car.boostT > 0 ? '#ffb030' : '#ffffff', small ? 2 : 3, 'right');
      E.font.text(g, game.settings.units === 'mph' ? 'MPH' : 'KM/H', W - 30, Hh - (small ? 26 : 34), '#c8c8d8', { outline: '#10101a' });
      if (R.car.boostT > 0) for (let i = 0; i < 3; i++) px.disc(g, W - 100 - i * 8, Hh - 30 + Math.sin(S.t * 30 + i) * 2, 3, i ? '#ffb030' : '#fff0a0');
      // countdown, finish, messages
      if (R.phase === 'countdown') { const n = Math.ceil(R.cd), k = R.cd % 1; big(g, n, W / 2, Hh * .35 - (1 - k) * 6, '#ffd23a', small ? 4 : 6); }
      else if (R.steps < 90 && R.phase === 'racing' && R.steps > 0 && P.restarts + R.respawns >= 0) big(g, 'GO!', W / 2, Hh * .35, '#5ae07a', small ? 4 : 6);
      if (R.finished) { big(g, P.place ? ['', '1ST', '2ND', '3RD', '4TH'][P.place] || 'FINISH!' : 'FINISH!', W / 2, Hh * .32, '#ffd23a', small ? 3 : 5); if (P.newBest) text(g, 'NEW RECORD!', W / 2 - tw('NEW RECORD!') / 2, Hh * .32 + 40, COL.blue); }
      let my = Hh * .5; for (const m of P.msg) { big(g, m[0], W / 2, my, m[2] || '#ffffff', 2); my += 22; }
      if (R.phase === 'racing' && (R.stillT > 2 || R.car.flop > 0)) promptBar(g, game, [['respawn', 'RESPAWN'], ['restart', 'RESTART']], { y: Hh - 50, noBg: true });
      // speed lines and edge vignette above 200 km/h
      if (!game.settings.reduceMotion && kmh(R.car) > 200 && !small) px.blend(g, .25, 'add', () => { for (let i = 0; i < 10; i++) { const a = (i * 2.4 + S.t * 3) % (Math.PI * 2), r0 = Math.min(W, Hh) * .45; px.line(g, W / 2 + Math.cos(a) * r0, Hh / 2 + Math.sin(a) * r0, W / 2 + Math.cos(a) * (r0 + 40), Hh / 2 + Math.sin(a) * (r0 + 40), '#ffffff', 1); } });
      if (!small) app.dialog.draw(g, W, Hh, { top: false });
      if (app.dev) app.dev.overlay(g, W, Hh);
      if (app.devOpen && (!r.viewport || r.viewport.i === 0)) app.dev.draw(g, W, Hh);
    }
  }
  return { pausable: true, input: RACE_INPUT, touch: [], camera: false, enter, exit, update, draw, hud: r => { if (S && S.spec.hooks && S.spec.hooks.overlay) S.spec.hooks.overlay(S, r); }, get state() { return S; }, restart: P => restart(P || S.players[0]) };
}
