// CRACKMANIA: boot, input, scenes. The race scene is the heart; everything else is a page that leads to it.
import { COURSES, COURSE_IDS, ENVS, CARS, PAINTS, BLOCKS, PUZZLES, SURVIVAL, RIVALS, TXT, CAST, U, parse } from './data.js';
import { CFG, TUNING, SLIDERS, reset as resetCfg } from './config.js';
import { compile } from './course.js';
import { makeArena, drive, Run, Bot, fmt, HOLD } from './arena.js';
import { medalFor, thresholds, authorTime } from './medals.js';
import { profile } from './profile.js';
import { setupAudio, babble, engineSound } from './audio.js';
import { Pane, Sliders, Talk, C, box, prompts, header, veil, tw } from './ui.js';
import { puzzleCourse, puzzleSolved } from './puzzle.js';
import { installOnline } from './online.js';
import { aboutLines } from './about.js';

const E = globalThis.My3D2dge, W3 = E.World3D;
const T = (g, s, x, y, col = C.text, o = {}) => E.font.text(g, String(s), x, y, col, Object.assign({ shadow: C.shade, outline: false }, o));
const TC = (g, s, cx, y, col, o = {}) => T(g, s, cx - tw(s, o.scale || 1) / 2, y, col, o);

export const KEYS = Object.assign({}, W3.INPUT, {
  gas: ['ArrowUp', 'KeyW', 'Pad7', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'Pad6'], drift: ['Space', 'Pad5'],
  respawn: ['Backspace', 'Pad1'], restart: ['KeyR', 'Pad3'], camera: ['KeyC', 'Pad2'], look: ['KeyV', 'Pad4']
});
for (const k of ['attack', 'dash', 'skill', 'jump', 'lock']) delete KEYS[k];

export function createGame({ headless = false, hub = null } = {}) {
  const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: KEYS, headless: headless || undefined,
    menu: { settings: W3.SETTINGS, items: hub ? [['Dev Mode', () => openDev()]] : [['Dev Mode', () => openDev()], ['Restart Race', () => S.restart && S.restart()], ['Back to Menu', () => { game.shell && game.shell.hide(); game.go('menu'); }]], quit: hub ? false : 'title' } });
  const au = setupAudio(game), A = game.audio, P = game.particles;
  const S = { mode: null, arena: null, runs: [], cars: [], idle: 0, page: 'main', dev: false, hub, cam: 0, devUnlock: false, results: null, talk: new Talk(game, babble), sound: engineSound(game), engineOn: true };
  game.crack = S;
  const scenes = {};
  const idleReset = () => { S.idle = 0; };
  const sawInput = () => { const I = game.input, m = I.move(); const t = I.mouse && I.mouse.t; const moved = t !== S._mt; S._mt = t; return I.anyPressed() || Math.abs(m[0]) > .3 || Math.abs(m[1]) > .3 || moved || !!I.clicked(); };

  // ------------------------------------------------------------------ arenas
  const CAMS = [{ dist: 62, height: 22, ahead: 40, lag: 5, fov: 66 }, { dist: 40, height: 14, ahead: 50, lag: 4, fov: 72 }, { dist: 9, height: 7, ahead: 110, lag: 2, fov: 82 }];
  const CAM_NAMES = ['FAR CHASE', 'CLOSE CHASE', 'BUMPER'];
  function setCam(world, car, i = S.cam) {
    const cam = world.cameras[0] || world.camera; cam.set('behind'); cam.follow(car);
    const c = CAMS[i]; Object.assign(cam.behind, c, { dist: c.dist * CFG.camDist, fov: c.fov + (CFG.fov - 70) });
  }
  function dropArena() { if (S.arena) { S.arena.dispose(); S.arena = null; } game.splitScreen(0); S.sound.stop(); }
  function load(def, o = {}) {
    dropArena();
    const a = makeArena(game, def); S.arena = a; S.def = def; S.cars = []; S.runs = []; S.bots = []; S.events = [];
    const col = o.color || profile.data.paint;
    const car = a.spawn({ color: o.noPaint ? undefined : col, car: profile.data.car || undefined, slot: 0, name: o.name || 'YOU' });
    const run = new Run(a, car, { count: o.count ?? 600 }); S.cars.push(car); S.runs.push(run); S.car = car; S.run = run; S.ghostCar = null;
    return a;
  }
  const dispatch = ev => {
    const x = S.car;
    if (ev.t === 'go') { A.sfx('go'); } else if (ev.t === 'cp') { A.sfx('cp'); if (x) P.glints(x.x, x.y, x.z + 12, 10, '#9ad8ff'); S.flash = { text: 'CHECKPOINT ' + ev.n + '/' + S.run.cpTotal, t: 1.6 }; if (S.ghost && S.best) { const bs = S.best.splits[ev.n - 1]; if (bs) S.delta = { d: ev.steps - bs, t: 2.5 }; } }
    else if (ev.t === 'respawn') { A.sfx('respawn'); S.flash = { text: 'RESPAWN', t: 1 }; if (x) P.glints(x.x, x.y, x.z + 8, 10, '#fff6c0'); }
    else if (ev.t === 'restart') { A.sfx('respawn'); S.rec = []; S.recT = 0; }
    else if (ev.t === 'missing') { A.sfx('denied'); S.flash = { text: 'MISSING CHECKPOINT', t: 1.6, bad: true }; }
    else if (ev.t === 'finish') finishRun(ev);
  };

  // ------------------------------------------------------------------ story beats (Coco times things, Gus fixes them)
  const BEATS = {
    welcome: [CAST[0], ['Hi. I am Coco. I time things.', 'The clock is the only rival that matters. Beat it, then beat it again.', 'Pick RACE. The first track is the gentle one.']],
    race1: [CAST[1], ['Gus. I fix cars. Mostly after you.', 'Hold {gas} to go and {brake} to stop. Steer with the stick or the arrows.', '{respawn} puts you back at the last gate. {restart} starts the run again. Both are free.']],
    medal1: [CAST[0], ['A medal. Bronze is a medal. Do not let anyone tell you otherwise.', 'Medals pay coppers. Coppers buy blocks and paint.']],
    crack: [CAST[1], ['That was the Big Crack. Most people look down.', 'Do not look down.']],
    puzzle: [CAST[1], ['Puzzles. Someone left holes in the road.', 'Fill every gap from the shelf, then drive it. A jump wants a run-up.']],
    build: [CAST[0], ['Build mode. Every block costs coppers. Take one back and you get them back.', 'Test drive it, then share the code. I will pretend I am not jealous.']],
    surv: [CAST[0], ['The Ghost Guild. Three of them, one of you.', 'Finish in the top two to move on. Last place is out.']],
    cup: [CAST[1], ['You beat the Guild. They are still ghosts, but they are impressed.']],
    ending: [CAST[0], ['Gold on every track. I have run out of things to time.', 'Nearly. Build something I cannot beat.']]
  };
  const fill = t => t.replace(/\{(\w+)\}/g, (_, a) => game.input.map[a] ? game.input.label(a) : a);
  function beat(k) { if (S.noStory || S.hub || profile.data.story[k] || !BEATS[k]) return false; profile.data.story[k] = true; profile.save(); S.talk.say(BEATS[k][0], BEATS[k][1].map(fill)); return true; }
  S.beat = beat;

  // ------------------------------------------------------------------ race flow
  function startRace(def, o = {}) { S.raceOpts = o; game.go('race', Object.assign({ def }, o)); }
  function ghostFor(id) { const g = profile.data.ghosts[id]; return g ? g : null; }
  function finishRun(ev) {
    const o = S.raceOpts || {}, id = S.def.id, steps = ev.steps, md = S.mode;
    if (md === 'online') { A.sfx('finish'); S.hub.onFinish(steps); return; }
    A.sfx('finish'); S.finishedAt = S.arena.game.real; S.orb = 0; game.input.rumble && game.input.rumble(.6, .3);
    if (md === 'survival') { survivalFinish(); return; }
    const res = { id, steps, medal: 0, reward: 0, new: false, mode: md };
    if (md === 'race' || md === 'puzzle') {
      res.medal = medalFor(id, steps);
      const rec = profile.record(id, steps, res.medal, S.rec ? { pts: S.rec, splits: S.run.splits.slice() } : null);
      Object.assign(res, rec, { medal: res.medal });
      if (md === 'puzzle') profile.data.puzzles[id] = Math.max(profile.data.puzzles[id] || 0, res.medal);
      if (res.newMedal) { A.sfx('medal'); if (!beat('medal1') && id === 'D3') beat('crack'); if (COURSE_IDS.every(c => profile.medal(c) >= 3)) beat('ending'); }
    } else if (md === 'test') { res.medal = 0; profile.data.tested = profile.data.tested || {}; profile.data.tested[id] = Math.min(profile.data.tested[id] || 1e9, steps); profile.save(); }
    S.results = res; S.resultPane = null; S.resultsAt = S.run.steps; au.music('results');
    if (S.seat) { S.seat.times[S.seat.turn] = steps; }
    if (S.hub && S.hub.onFinish) S.hub.onFinish(steps);
  }

  scenes.race = {
    view: 'iso', input: KEYS, pausable: true,
    enter(d) {
      S.raceOpts = d; S.mode = d.mode || 'race'; S.dev = false; S.results = null; S.flash = null; S.delta = null; S.rec = []; S.recT = 0; S.survive = d.survive || S.survive; S.split = d.split || 0; S.seat = d.seat || null;
      const def = d.def; load(def, { count: d.count ?? 600, color: d.color });
      const a = S.arena, env = a.env; au.music(env.music);
      S.ghost = null; S.best = null;
      if (S.mode === 'race' || S.mode === 'puzzle') { const g = ghostFor(def.id); if (g) { S.best = g; S.ghost = a.spawn({ ghost: true, color: '#c8d8ff', slot: 3, name: 'GHOST' }); } }
      if (S.mode === 'survival') { S.rivals = RIVALS.map((r, k) => { const v = a.spawn({ color: r[1], slot: k + 1, name: r[0] }); const run = new Run(a, v, { count: 600 }); const bot = new Bot(a, v, { skill: CFG.rivalSkill - k * .03, seed: 11 + k }); S.cars.push(v); S.runs.push(run); S.bots.push(bot); return v; }); }
      if (S.split > 1) setupSplit(d);
      S.cam = profile.data.settings.cam || 0; setCam(a.world, S.car);
      S.restart = () => { S.results = null; S.run.restart(); if (S.ghost) S.ghostI = 0; au.music(env.music); S.rec = []; };
      S.flash = { text: S.mode === 'survival' ? 'ROUND ' + (S.survive.round + 1) + '/3 - TOP TWO ADVANCE' : def.name.toUpperCase(), t: 3 };
      S.fly = 0; S.steps = 0; S.ghostI = 0; S.pilot = S.autopilot ? new Bot(a, S.car, { skill: 1 }) : null; game.input.consumeAll();
      if (S.mode === 'race') beat('race1'); else if (S.mode === 'survival' && S.survive.round === 0) beat('surv');
    },
    exit() { S.sound.stop(); game.splitScreen(0); while (game.players && game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]); S.split = 0; game.timeScale = 1; },
    update(dt) {
      if (S.talk.active) { S.talk.update(dt); return; }
      if (S.dev) return devUpdate(dt);
      const a = S.arena, run = S.run, I = game.input; if (!a) return;
      S.steps++;
      if (S.results) { finishCoast(dt); return resultsUpdate(dt); }
      // inputs for every human car
      S.cars.forEach((car, i) => {
        const r = S.runs[i];
        if (S.bots[i - 1] && S.mode === 'survival' && i > 0) return;
        const inp = i === 0 ? I : game.players[i] || I;
        if (S.split > 1 && i >= S.split) return;
        const racing = r.phase === 'racing', mv = inp.move();
        const kb = inp.lastDevice === 'keyboard'; car.data.st = E.approach(car.data.st || 0, mv[0], dt * (kb ? (Math.abs(mv[0]) > Math.abs(car.data.st || 0) ? 8 : 12) : 100));
        const intent = racing ? { steer: car.data.st, gas: inp.down('gas') ? 1 : 0, brake: inp.down('brake') ? 1 : 0, drift: inp.down('drift') } : HOLD;
        if (S.pilot && racing && i === 0) Object.assign(intent, S.pilot.control(dt));
        drive(a, car, dt, intent);
        if (racing && inp.pressed('respawn')) r.respawn();
        if (racing && inp.pressed('restart') && i === 0) { S.restart(); }
        if (racing && inp.pressed('camera') && i === 0) { S.cam = (S.cam + 1) % 3; profile.data.settings.cam = S.cam; setCam(a.world, S.car); game.note(CAM_NAMES[S.cam]); }
      });
      if (S.mode === 'survival') S.bots.forEach((b, k) => { const car = S.cars[k + 1], r = S.runs[k + 1]; drive(a, car, dt, r.phase === 'racing' ? b.control(dt) : HOLD); });
      // ghost playback
      if (S.ghost && S.best) { const p = S.best.pts, g = S.ghost; if (run.phase === 'racing') { const k = Math.floor(run.steps / 4); const q = p[Math.min(k, p.length - 1)]; if (q) { g.place(q[0], q[1], q[2]); g.vx = g.vy = g.vz = 0; g.angle = g.facing = q[3] / 1000; g.fade = CFG.ghostAlpha; } } else { g.place(-999, -999, -999); } }
      a.world.step(dt);
      S.runs.forEach((r, i) => { r.update(); if (i === 0 || S.split > 1) for (const ev of r.events.splice(0)) { if (i === 0) dispatch(ev); } else r.events.length = 0; });
      if (S.run.phase === 'racing' && S.run.steps % 4 === 0) S.rec.push([Math.round(S.car.x), Math.round(S.car.y), Math.round(S.car.z), Math.round(S.car.angle * 1000)]);
      carFx(dt);
      if (S.mode === 'survival' && S.run.finished && !S.results) survivalFinish();
      if (S.mode === 'survival' && S.runs.slice(1).every(r => r.finished || r.phase !== 'racing') && !S.results && S.run.phase === 'racing') { /* rivals done, player still racing */ }
      if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
      if (S.delta) { S.delta.t -= dt; if (S.delta.t <= 0) S.delta = null; }
      // intro flyover then countdown beeps
      const c = run.count; if (run.phase === 'intro' && !(S.split > 1)) flyover(a, c); else if (run.phase === 'countdown' && S.flyOn) { S.flyOn = false; setCam(a.world, S.car); }
      if (run.phase === 'countdown' && c % 120 === 0 && c > 0 && c <= 360) A.sfx('count', { pitch: 1 });
      // sound
      const sp = Math.abs(S.car.speed) / S.car.o.top; S.sound.update(Math.min(1.4, sp), S.car.slide, S.car.onGround, !S.attract || true);
    },
    draw(r) {
      const a = S.arena; if (!a) return;
      a.world.draw(r);
      r.overlay(g => { if (S.dev) devDraw(g, r); else raceHud(g, r); S.talk.draw(g, r); });
    },
    back() { return false; }
  };

  /** after the flag: the car brakes to a stop, the camera orbits it */
  function finishCoast(dt) {
    const a = S.arena, v = S.car; if (!a || S.mode === 'split') return;
    S.orb = (S.orb || 0) + dt; drive(a, v, dt, HOLD); a.world.step(dt);
    const ang = S.orb * .5 + 1, cam = a.world.cameras[0] || a.world.camera; if (cam.mode !== 'fixed') cam.set('fixed');
    cam.fixed = { x: v.x + Math.cos(ang) * 110, y: v.y + Math.sin(ang) * 110, z: v.z + 40, yaw: ang + Math.PI, pitch: -.28, fov: 58 };
  }
  function flyover(a, c) {
    const line = a.course.line, f = 1 - (c - 360) / 240, k = Math.max(0, Math.min(1, f)), sm = k * k * (3 - 2 * k), i = Math.min(line.length - 1, Math.floor(sm * (line.length - 1))), p = line[i], q = line[Math.min(line.length - 1, i + 3)];
    const cam = a.world.camera; if (!S.flyOn) { S.flyOn = true; cam.set('fixed'); }
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    cam.fixed = { x: p.x - Math.cos(ang) * 150 + Math.cos(ang + 1.57) * 220, y: p.y - Math.sin(ang) * 150 + Math.sin(ang + 1.57) * 220, z: p.z + 150, yaw: Math.atan2(p.y - (p.y - Math.sin(ang) * 150 + Math.sin(ang + 1.57) * 220), p.x - (p.x - Math.cos(ang) * 150 + Math.cos(ang + 1.57) * 220)), pitch: -.4, fov: 62 };
  }
  function carFx(dt) {
    const v = S.car, a = S.arena; if (!v) return;
    if (v.offroad && v.onGround && Math.abs(v.speed) > 90 && (a.world.n & 3) === 0) P.dust(v.x, v.y, v.z, 1, { color: v.surface === 'sand' ? '#e0c088' : v.surface === 'snow' ? '#f4faff' : v.surface === 'dirt' ? '#a88a60' : '#7aa850' });
    if (v.bumped && v.onGround) { game.input.rumble && game.input.rumble(.35, .1); P.sparks(v.x, v.y, v.z + 4, 6, v.angle + Math.PI, { color: '#ffd070' }); A.sfx('scrape'); if (Math.abs(v.speed) < 150) game.shake(2); }
    if (v.boostT > 0 && (a.world.n & 1) === 0) P.fire && P.fire(v.x - Math.cos(v.angle) * 14, v.y - Math.sin(v.angle) * 14, v.z + 5, 1);
    if (v.boostT > .85 * CFG.boostTime && v.boostT < CFG.boostTime) A.sfx('boost');
    if (S.wasAir && v.onGround) { game.input.rumble && game.input.rumble(.4, .12); A.sfx('land'); P.dust(v.x, v.y, v.z, 6, { color: '#cfc2a8' }); game.shake(3); }
    S.wasAir = !v.onGround && v.airT > .25;
    if (v.slide && Math.abs(v.slide) > 120 && v.onGround && (a.world.n & 3) === 0) P.dust(v.x, v.y, v.z, 1, { color: '#dddddd' });
  }

  function raceHud(g, r) {
    const run = S.run, W = r.W, H = r.H, v = S.car, steps = run.phase === 'finished' ? run.finishSteps : run.steps;
    const fmtT = s => fmt(s);
    const view = (S.split > 1) ? null : { x: 0, y: 0, w: W, h: H };
    if (S.split > 1) { splitHud(g, r); return; }
    // clock
    box(g, W / 2 - 46, 6, 92, 24, false); TC(g, fmtT(steps), W / 2, 11, run.phase === 'finished' ? C.hot : C.text, { scale: 2 });
    const th = thresholds(S.def.id), medal = th ? [1, 2, 3, 4].reverse().find(m => steps <= th[m]) : 0;
    if (th && (S.mode === 'race' || S.mode === 'puzzle')) { const tg = th[3]; TC(g, 'GOLD ' + fmtT(tg), W / 2, 33, '#ffd36a'); }
    if (profile.data.best[S.def.id] !== undefined) T(g, 'BEST ' + fmtT(profile.data.best[S.def.id]), W - 12 - tw('BEST ' + fmtT(profile.data.best[S.def.id])), 10, '#c8d8ff');
    T(g, 'CP ' + run.cps + '/' + run.cpTotal, 12, 10, C.text, { scale: 1.5 });
    if (run.respawns) T(g, 'RESPAWNS ' + run.respawns, 12, 28, '#ff9a8a');
    // speed
    const kmh = Math.round(Math.abs(v.speed) / U * 3.6); T(g, String(kmh), W - 70 - (kmh >= 100 ? 14 : 0), H - 50, v.boostT > 0 ? '#ff9a3a' : C.text, { scale: 4 }); T(g, 'KM/H', W - 30, H - 22, C.dim);
    if (S.delta) { const d = S.delta.d / 120; TC(g, (d <= 0 ? '' : '+') + d.toFixed(2), W / 2, 60, d <= 0 ? '#7af0a0' : '#ff7a6a', { scale: 2 }); }
    if (S.flash) TC(g, S.flash.text, W / 2, H * .28, S.flash.bad ? C.bad : C.hot, { scale: 2 });
    if (run.phase === 'countdown') { const n = Math.ceil(run.count / 120); if (run.count <= 360) TC(g, String(n), W / 2, H / 2 - 36, '#fff', { scale: 8 }); }
    if (S.mode === 'survival') survivalHud(g, r);
    if (S.tele) { const lines = ['x ' + Math.round(v.x) + ' y ' + Math.round(v.y) + ' z ' + Math.round(v.z), (v.onGround ? 'ground ' : 'air ') + (v.surface || '-') + ' slide ' + Math.round(v.slide), 'steps ' + run.steps + ' phase ' + run.phase, 'speed ' + Math.round(v.speed) + ' u/s boost ' + v.boostT.toFixed(2)]; lines.forEach((l, k) => T(g, l, 12, 60 + k * 9, '#9ad8ff')); }
    if (!S.attract && run.phase !== 'finished') prompts(game, g, r, [['respawn', 'Respawn'], ['restart', 'Restart'], ['camera', 'Camera']]);
    if (S.attract) { TC(g, 'DEMO', W / 2, 40, C.hot, { scale: 3 }); TC(g, 'PRESS ANY BUTTON', W / 2, H - 24, C.text, { scale: 1.5 }); }
    if (S.results) resultsDraw(g, r);
    if (S.mode === 'hotseat' && S.seat && !S.results) T(g, S.seat.players[S.seat.turn].name, 12, 44, S.seat.players[S.seat.turn].color, { scale: 2 });
  }

  // ------------------------------------------------------------------ results
  function resultsUpdate(dt) {
    const res = S.results; if (!S.resultPane) {
      const items = [];
      const md = S.mode;
      if (md === 'race') { const ids = COURSE_IDS, i = ids.indexOf(res.id); if (i < ids.length - 1) items.push({ label: 'Next track', act: 'next', locked: !profile.unlockedCourse(ids, i + 1) && res.medal < 1 }); items.push({ label: 'Retry', act: 'retry' }, { label: 'Courses', act: 'menu' }); }
      else if (md === 'puzzle') items.push({ label: 'Retry', act: 'retry' }, { label: 'Back to puzzle', act: 'puzzle' });
      else if (md === 'test') items.push({ label: 'Retry', act: 'retry' }, { label: 'Back to editor', act: 'editor' });
      else if (md === 'hotseat') items.push({ label: S.seat && S.seat.turn < S.seat.players.length - 1 ? 'Pass the controller' : 'Final standings', act: 'seat' });
      else items.push({ label: 'Continue', act: 'menu' });
      S.resultPane = new Pane(game, items, { cols: 1, tileH: 22 });
    }
    const k = S.resultPane.update(); if (k < 0) return;
    const act = S.resultPane.items[k].act;
    if (act === 'retry') { const o = S.raceOpts; game.go('race', Object.assign({}, o, { def: S.def })); }
    else if (act === 'next') { const ids = COURSE_IDS, nx = COURSES[ids[ids.indexOf(res.id) + 1]]; startRace(nx, { mode: 'race' }); }
    else if (act === 'menu') game.go('menu');
    else if (act === 'puzzle') game.go('editor', { puzzle: S.puzzleState });
    else if (act === 'editor') game.go('editor', { back: true });
    else if (act === 'seat') seatNext();
    else if (act === 'sv-next') game.go('race', { mode: 'survival', def: COURSES[SURVIVAL[S.survive.env].courses[S.survive.round]], survive: S.survive, count: 480 });
    else if (act === 'sv-retry') { S.survive = null; game.go('menu'); }
    else if (act === 'sv-win') { beat('cup'); const first = !profile.data.survival[S.survive.env]; profile.data.survival[S.survive.env] = true; if (first) { profile.earn(150); S.survWon = 150; } else profile.earn(40); profile.save(); game.go('menu'); }
  }
  function resultsDraw(g, r) {
    const res = S.results, W = r.W, H = r.H; veil(g, r, .45);
    if (res.mode === 'survival') {
      const w = 240, x = (W - w) / 2, y = 34; box(g, x, y, w, 150, true);
      TC(g, 'PLACE ' + res.place + ' OF 4', W / 2, y + 8, res.adv ? C.good : C.bad, { scale: 2 }); TC(g, fmt(res.steps), W / 2, y + 30, C.text, { scale: 3 });
      TC(g, res.adv ? (res.last ? 'THE GUILD IS BEATEN' : 'YOU ADVANCE') : 'ELIMINATED', W / 2, y + 60, res.adv ? C.hot : C.bad, { scale: 1.5 });
      TC(g, 'ROUND ' + S.survive.round + ' OF 3', W / 2, y + 78, C.dim); if (S.resultPane) S.resultPane.draw(g, x + 10, y + 96, w - 20, 50); prompts(game, g, r, [['confirm', 'Select']]); return;
    }
    const w = 240, x = (W - w) / 2, y = 30; box(g, x, y, w, 168, true);
    TC(g, S.mode === 'test' ? 'TEST DRIVE' : res.medal ? TXT.medals[res.medal] + ' MEDAL' : 'FINISH', W / 2, y + 8, ['#fff', '#d08a50', '#c8d0d8', '#ffd36a', '#7af0ff'][res.medal] || '#fff', { scale: 2 });
    TC(g, fmt(res.steps), W / 2, y + 30, C.text, { scale: 4 });
    if (res.record && S.mode !== 'test') TC(g, 'NEW RECORD', W / 2, y + 62, C.good); else if (profile.data.best[res.id] !== undefined && S.mode !== 'test') TC(g, 'BEST ' + fmt(profile.data.best[res.id]), W / 2, y + 62, '#c8d8ff');
    if (res.reward) TC(g, '+' + res.reward + ' COPPERS', W / 2, y + 74, '#ff9a3a', { scale: 1.5 });
    if (S.run.respawns) T(g, 'Respawns ' + S.run.respawns, x + 10, y + 92, C.dim);
    if (S.resultPane) S.resultPane.draw(g, x + 10, y + 108, w - 20, 54);
    prompts(game, g, r, [['confirm', 'Select']]);
  }

  // ------------------------------------------------------------------ survival
  function survivalHud(g, r) {
    const W = r.W; let y = 52; const list = S.cars.map((c, i) => ({ n: i === 0 ? 'YOU' : c.data.name, p: S.runs[i].finished ? 1e9 + 1e7 - S.runs[i].finishSteps : progress(i), run: S.runs[i], col: i === 0 ? '#fff' : RIVALS[i - 1][1] })).sort((a, b) => b.p - a.p);
    list.forEach((e, k) => { T(g, (k + 1) + '. ' + e.n + (e.run.finished ? ' ' + fmt(e.run.finishSteps) : ''), W - 100, y + k * 11, e.col); });
  }
  function progress(i) { const car = S.cars[i], line = S.arena.course.line; let b = 1e18, bi = 0; for (let k = 0; k < line.length; k += 2) { const d = (line[k].x - car.x) ** 2 + (line[k].y - car.y) ** 2; if (d < b) { b = d; bi = k; } } return line[bi].d; }
  function survivalFinish() {
    const mine = S.runs[0].finishSteps; let place = 1; S.runs.slice(1).forEach(r => { if (r.finished && r.finishSteps < mine) place++; });
    const adv = place <= 2, s = S.survive; s.round++;
    const res = { id: S.def.id, steps: mine, mode: 'survival', place, medal: 0, reward: 0 }; S.results = res; A.sfx(adv ? 'medal' : 'denied'); au.music('results');
    const last = s.round >= 3;
    const items = [];
    if (adv && !last) items.push({ label: 'Next round', act: 'sv-next' }); else if (adv && last) { items.push({ label: 'Claim the cup', act: 'sv-win' }); } else items.push({ label: 'Eliminated: try again', act: 'sv-retry' });
    items.push({ label: 'Quit', act: 'menu' }); S.resultPane = new Pane(game, items, { cols: 1, tileH: 22 });
    res.adv = adv; res.last = last; S.results.survival = true;
  }


  // ================================================================== MENU SCENE: title + pages over a living backdrop
  const medalsIn = env => COURSE_IDS.filter(id => COURSES[id].env === env).reduce((n, id) => n + (profile.medal(id) > 0 ? 1 : 0), 0);
  const medalTag = m => m ? ['', 'BRONZE', 'SILVER', 'GOLD', 'AUTHOR'][m] : '';
  const medalCol = m => ['#fff', '#d08a50', '#c8d0d8', '#ffd36a', '#7af0ff'][m];
  const coars = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const PAGES = {
    title: { cols: 1, items: () => [], pick() {} },
    main: { title: 'MAIN MENU', cols: 2, tileH: 40, back: () => openPage('title'), items: () => [
      { label: 'RACE', sub: '9 tracks, 3 lands, medals', color: '#ff9a3a' }, { label: 'PUZZLE', sub: 'Fill the gaps, then drive', color: '#6ad0ff' },
      { label: 'SURVIVAL', sub: 'Beat the Ghost Guild', color: '#c8a0ff' }, { label: 'BUILD', sub: 'Your tracks, your coppers', color: '#7af0a0' },
      { label: 'MULTIPLAYER', sub: 'Hot seat, split screen, online', color: '#ff7aa8' }, { label: 'GARAGE', sub: 'Paint the car', color: '#ffd36a' },
      { label: 'OPTIONS', sub: 'Sound, picture, controls', color: '#b8b0d8' }, { label: 'ABOUT', sub: 'Credits and sources', color: '#b8b0d8' }],
      pick(i) { ['race', 'puzzle', 'survival', 'build', 'multi', 'garage', 'options', 'about'][i] && ({ build: () => game.go('editor', {}), garage: () => game.go('garage'), options: () => game.shell.show('settings') }[['race', 'puzzle', 'survival', 'build', 'multi', 'garage', 'options', 'about'][i]] || (() => openPage(['race', 'puzzle', 'survival', 'build', 'multi', 'garage', 'options', 'about'][i])))(); } },
    race: { title: 'RACE', sub: 'Pick a land', cols: 3, tileH: 70, back: () => openPage('main'), items: () => Object.values(ENVS).map(e => ({ label: e.name, sub: e.blurb, tag: medalsIn(e.id) + '/3', color: e.accent })), pick(i) { openPage('courses', Object.keys(ENVS)[i]); } },
    courses: { title: 'TRACKS', cols: 1, tileH: 26, back: () => openPage('race'), items: env => COURSE_IDS.filter(id => COURSES[id].env === env).map((id, k, arr) => { const m = profile.medal(id), b = profile.data.best[id]; return { label: id + '  ' + COURSES[id].name, sub: b !== undefined ? 'Best ' + fmt(b) : 'Not yet driven', tag: medalTag(m), tagColor: medalCol(m), locked: !(k === 0 || profile.medal(arr[k - 1]) >= 1 || profile.data.devUnlock), id }; }),
      pick(i, it) { startRace(COURSES[it.id], { mode: 'race' }); } },
    puzzle: { title: 'PUZZLE', sub: 'Each puzzle has gaps. Fill them from the shelf.', cols: 1, tileH: 28, back: () => openPage('main'), items: () => PUZZLES.map(p => ({ label: p.id + '  ' + p.name, sub: ENVS[p.env].name + ' - ' + p.slots + ' gaps', tag: medalTag(profile.data.puzzles[p.id] || 0), tagColor: medalCol(profile.data.puzzles[p.id] || 0) })), pick(i) { game.go('editor', { puzzle: PUZZLES[i] }); } },
    survival: { title: 'SURVIVAL', sub: 'Three rounds. Last place is out. Top two advance.', cols: 3, tileH: 70, back: () => openPage('main'), items: () => Object.values(ENVS).map(e => ({ label: e.name, sub: profile.data.survival[e.id] ? 'Cup won' : 'Needs 2 medals here', tag: profile.data.survival[e.id] ? 'WON' : '', locked: !(medalsIn(e.id) >= 2 || profile.data.devUnlock), color: e.accent })),
      pick(i) { const env = Object.keys(ENVS)[i]; S.survive = { env, round: 0 }; game.go('race', { mode: 'survival', def: COURSES[SURVIVAL[env].courses[0]], survive: S.survive, count: 480 }); } },
    multi: { title: 'MULTIPLAYER', cols: 1, tileH: 34, back: () => openPage('main'), items: () => [{ label: 'HOT SEAT', sub: '2 to 4 players, one controller, take turns' }, { label: 'SPLIT SCREEN', sub: '2 to 4 players at once' }, { label: 'ONLINE', sub: 'Races run in AI Hub sessions. Open CRACKMANIA from AI Hub with friends.' }],
      pick(i) { if (i === 0) openPage('hs-n'); else if (i === 1) openPage('sp-n'); else S.toast = { text: 'Online races run in AI Hub sessions: open CRACKMANIA there with friends.', t: 4 }; } },
    'hs-n': { title: 'HOT SEAT', sub: 'How many players?', cols: 3, tileH: 50, back: () => openPage('multi'), items: () => [2, 3, 4].map(n => ({ label: n + ' PLAYERS', sub: 'Pass the controller' })), pick(i) { S.mp = { n: i + 2, kind: 'hotseat' }; openPage('mp-env'); } },
    'sp-n': { title: 'SPLIT SCREEN', sub: 'How many players? (keyboard halves and pads)', cols: 3, tileH: 50, back: () => openPage('multi'), items: () => [2, 3, 4].map(n => ({ label: n + ' PLAYERS', sub: n > 2 ? 'Needs gamepads' : 'WASD + arrows, or pads' })), pick(i) { S.mp = { n: i + 2, kind: 'split' }; openPage('mp-env'); } },
    'mp-env': { title: 'CHOOSE A TRACK', cols: 3, tileH: 60, back: () => openPage('multi'), items: () => Object.values(ENVS).map(e => ({ label: e.name, sub: e.blurb, color: e.accent })), pick(i) { openPage('mp-course', Object.keys(ENVS)[i]); } },
    'mp-course': { title: 'CHOOSE A TRACK', cols: 1, tileH: 24, back: () => openPage('mp-env'), items: env => COURSE_IDS.filter(id => COURSES[id].env === env).map(id => ({ label: id + '  ' + COURSES[id].name, id })), pick(i, it) { launchMulti(COURSES[it.id]); } },
    pass: { title: 'PASS THE CONTROLLER', cols: 1, tileH: 40, items: () => [{ label: 'READY: ' + S.seat.players[S.seat.turn].name }], pick() { game.go('race', { mode: 'hotseat', def: S.seat.def, seat: S.seat }); } },
    standings: { title: 'FINAL STANDINGS', cols: 1, tileH: 26, back: () => { S.seat = null; openPage('main'); }, items: () => S.seat.players.map((p, i) => ({ p, t: S.seat.times[i] })).sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9)).map((e, k) => ({ label: (k + 1) + '. ' + e.p.name, sub: e.t !== undefined ? fmt(e.t) : 'DNF', color: e.p.color })), pick() { S.seat = null; openPage('main'); } },
    about: { title: 'ABOUT', cols: 1, items: () => [], pick() {}, back: () => openPage('main') }
  };
  function openPage(name, arg) {
    S.page = name; S.pageArg = arg; const pg = PAGES[name];
    S.pane = new Pane(game, pg.items(arg), { cols: pg.cols, tileH: pg.tileH, onCancel: pg.back });
    S.aboutY = 0;
  }
  function launchMulti(def) {
    const n = S.mp.n;
    if (S.mp.kind === 'hotseat') { S.seat = { players: Array.from({ length: n }, (_, i) => ({ name: 'P' + (i + 1), color: E.PLAYER_COLORS ? E.PLAYER_COLORS[i] : ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] })), turn: 0, times: [], def }; game.go('race', { mode: 'hotseat', def, seat: S.seat }); }
    else game.go('race', { mode: 'split', def, split: n, count: 480 });
  }
  function seatNext() {
    const s = S.seat; if (s.turn < s.players.length - 1) { s.turn++; game.go('menu', { page: 'pass' }); } else game.go('menu', { page: 'standings' });
  }
  function setupSplit(d) {
    const a = S.arena, n = S.split; const cols = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
    S.cars[0].o.color = cols[0];
    while (game.players.length < n) { const pads = (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []); const used = game.players.map(p => p.pad); const free = pads.find(p => !used.includes(p.index)); const pl = free ? game.addPlayer({ pad: free.index }) : game.addPlayer({ keys: 'right' }); if (!pl) break; }
    for (let i = 1; i < n; i++) { const car = a.spawn({ color: cols[i], slot: i, name: 'P' + (i + 1) }); const run = new Run(a, car, { count: 480 }); S.cars.push(car); S.runs.push(run); }
    S.runs[0].count = 480;
    game.splitScreen(n, { layout: n === 2 ? 'rows' : 'grid' });
    while (a.world.cameras.length < n) a.world.addCamera({ mode: 'behind', far: 2600 });
    S.cars.forEach((c, i) => { const cam = a.world.cameras[i]; cam.set('behind'); cam.follow(c); Object.assign(cam.behind, CAMS[0]); });
    for (let i = 0; i < n; i++) S.cars[i].setSolid && S.cars[i].setSolid(false);
  }
  function splitHud(g, r) {
    const n = S.split, W = r.W, H = r.H, rects = n === 2 ? [[0, 0, W, H / 2], [0, H / 2, W, H / 2]] : [[0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2], [0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2]];
    S.runs.forEach((run, i) => { if (i >= n) return; const [x, y, w, h] = rects[i]; const t = run.phase === 'finished' ? run.finishSteps : run.steps;
      T(g, fmt(t), x + w / 2 - tw(fmt(t)), y + 4, run.finished ? C.hot : C.text, { scale: 2 }); T(g, 'P' + (i + 1) + ' CP ' + run.cps + '/' + run.cpTotal, x + 6, y + 4, ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i]);
      T(g, Math.round(Math.abs(S.cars[i].speed) / U * 3.6) + ' KM/H', x + w - 70, y + h - 16, C.text);
      if (run.phase === 'countdown' && run.count <= 360 && i === 0) TC(g, String(Math.ceil(run.count / 120)), W / 2, H / 2 - 20, '#fff', { scale: 6 });
      if (run.finished) TC(g, 'FINISHED', x + w / 2, y + h / 2, C.hot, { scale: 2 });
    });
    if (S.runs.slice(0, n).every(r => r.finished) && !S.results) { S.results = { id: S.def.id, steps: Math.min(...S.runs.slice(0, n).map(r => r.finishSteps)), mode: 'split', medal: 0 }; S.winner = S.runs.slice(0, n).findIndex(r => r.finishSteps === S.results.steps); S.resultPane = new Pane(game, [{ label: 'Rematch', act: 'retry' }, { label: 'Menu', act: 'menu' }], { tileH: 22 }); }
    if (S.results && S.results.mode === 'split') { veil(g, r, .4); TC(g, 'P' + (S.winner + 1) + ' WINS ' + fmt(S.results.steps), W / 2, 40, C.hot, { scale: 2 }); S.resultPane.draw(g, W / 2 - 80, 80, 160, 60); }
  }

  const touchOnly = () => !!S.forceTouch || (game.input.lastDevice === 'touch') || (coars && !S.keyboardSeen && !S.padSeen);
  if (typeof addEventListener === 'function' && !headless) { addEventListener('keydown', () => { S.keyboardSeen = true; }); addEventListener('gamepadconnected', () => { S.padSeen = true; }); }
  S.touchOnly = touchOnly;
  let orbit = 0;
  scenes.menu = {
    view: 'iso', input: KEYS,
    enter(d) {
      S._mt = game.input.mouse && game.input.mouse.t; S.dev = false; S.results = null; S.attract = false; S.seat = d && d.page === 'pass' || d && d.page === 'standings' ? S.seat : null;
      if (!S.arena || !S.arena.isMenu) { load(COURSES.D3, { noPaint: true, count: 5 }); S.arena.isMenu = true; S.menuBot = new Bot(S.arena, S.car, { cheat: true, skill: .9 }); S.run.count = 5; }
      setCam(S.arena.world, S.car, 0); au.music(S.page === 'results' ? 'results' : 'title');
      openPage((d && d.page) || 'title'); S.idle = 0; S.toast = null; S.menuT = 0; game.input.consumeAll();
      if (!(d && d.page) && !touchOnly()) beat('welcome');
    },
    exit() { S.talk.cur = null; S.talk.q = []; S.talk.done = null; },
    update(dt) {
      if (S.talk.active) { S.talk.update(dt); S.idle = 0; return; }
      const a = S.arena, run = S.run, I = game.input; S.menuT += dt;
      if (sawInput()) S.idle = 0; else S.idle += dt;
      if (S.idle >= 10) { game.go('attract'); return; }
      // the backdrop car drives itself
      drive(a, S.car, dt, run.phase === 'racing' ? S.menuBot.control(dt) : HOLD); a.world.step(dt); run.update(); run.events.length = 0;
      if (run.finished) { run.restart(); run.count = 5; S.menuBot.i = 0; }
      if (S.toast) { S.toast.t -= dt; if (S.toast.t <= 0) S.toast = null; }
      if (touchOnly()) { if (I.clicked()) { const p = I.clicked(), w = game.W; if (p[1] > game.H - 50) game.shell && game.shell.show('settings'); } return; }
      if (S.page === 'title') { if (I.pressed('start') || I.pressed('confirm') || I.clicked()) { I.consumeAll(); A.sfx('confirm'); openPage('main'); } return; }
      if (S.page === 'about') { S.aboutY += dt * 14; if (I.repeat('down')) S.aboutY += 14; if (I.repeat('up')) S.aboutY = Math.max(0, S.aboutY - 14); if (I.pressed('cancel')) { A.sfx('cancel'); openPage('main'); } return; }
      const k = S.pane.update(); if (k >= 0) PAGES[S.page].pick(k, S.pane.items[k], S.pageArg);
    },
    draw(r) {
      const a = S.arena; if (!a) return;
      const cam = a.world.cameras[0] || a.world.camera;
      a.world.draw(r);
      const W = r.W, H = r.H;
      r.overlay(g => {
        if (S.page === 'title' || touchOnly()) {
          veil(g, r, .35, H * .55);
          E.font.title(g, 'CRACKMANIA', W / 2, Math.round(H * .08), { align: 'center', scale: 5, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
          TC(g, TXT.tag, W / 2, Math.round(H * .08) + 50, '#ffe7a8', { scale: 2 });
          if (touchOnly()) { TC(g, 'Controller or keyboard required', W / 2, H * .62, C.hot, { scale: 2 }); box(g, W / 2 - 50, H - 44, 100, 24, true); TC(g, 'SETTINGS', W / 2, H - 38, C.text, { scale: 1.5 }); }
          else { if (Math.floor(S.menuT * 2) % 2 === 0) TC(g, 'PRESS ' + game.input.label('start').toUpperCase() + ' OR CLICK', W / 2, H * .66, C.text, { scale: 2 }); prompts(game, g, r, [['confirm', 'Start']]); }
        } else if (S.page === 'about') {
          veil(g, r, .8); header(g, r, 'ABOUT', 'Source information'); const lines = aboutLines(); let y = 52 - S.aboutY;
          for (const l of lines) { if (y > 44 && y < H - 22) T(g, l, 16, y, l.startsWith('#') ? C.hot : C.text); y += 10; }
          prompts(game, g, r, [['cancel', 'Back'], ['down', 'Scroll']]);
        } else {
          veil(g, r, .72); const pg = PAGES[S.page]; header(g, r, pg.title, pg.sub);
          const px = 20, py = 58; S.pane.draw(g, px, py, W - 40, H - py - 30);
          T(g, 'COPPERS ' + profile.data.coppers, W - 14 - tw('COPPERS ' + profile.data.coppers), 14, '#ff9a3a', { scale: 1.5 });
          prompts(game, g, r, [['confirm', 'Select'], ['cancel', 'Back']]);
        }
        if (S.toast) { box(g, 20, H * .5 - 20, W - 40, 40, true); TC(g, S.toast.text, W / 2, H * .5 - 6, C.text); }
        S.talk.draw(g, r);
      });
    }
  };

  // ================================================================== ATTRACT: an AI plays the demo, any input leaves
  const ATTRACT = ['D3', 'R3', 'S3', 'D2'];
  scenes.attract = {
    view: 'iso', input: KEYS,
    enter(d) {
      S.attractI = ((S.attractI ?? -1) + 1) % ATTRACT.length; const def = COURSES[ATTRACT[S.attractI]];
      S._mt = game.input.mouse && game.input.mouse.t; S.mode = 'attract'; S.attract = true; S.results = null; S.dev = false; load(def, { noPaint: true, count: 100 }); S.attractBot = new Bot(S.arena, S.car, { cheat: true, skill: 1 });
      au.music(S.arena.env.music); S.cam = 0; setCam(S.arena.world, S.car, 0); S.doneT = 0; S.flash = { text: def.name.toUpperCase(), t: 3 }; game.input.consumeAll(); S.armed = 0; S.camT = 0;
    },
    exit() { S.attract = false; S.sound.stop(); },
    update(dt) {
      S.armed += dt; if (S.armed > .4 && sawInput()) { game.go('menu'); return; }
      const a = S.arena, run = S.run;
      drive(a, S.car, dt, run.phase === 'racing' ? S.attractBot.control(dt) : HOLD);
      a.world.step(dt); run.update(); for (const ev of run.events.splice(0)) if (ev.t === 'cp') { A.sfx('cp'); } else if (ev.t === 'finish') { A.sfx('finish'); S.doneT = 0.001; }
      carFx(dt); if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
      S.camT += dt; if (S.camT > 6) { S.camT = 0; S.cam = (S.cam + 1) % 3; setCam(a.world, S.car, S.cam); }
      if (S.doneT) { S.doneT += dt; if (S.doneT > 3) game.go('attract'); }
      if (S.car.z < -200 || (run.steps > 120 * 80)) game.go('attract');
      S.sound.update(Math.abs(S.car.speed) / S.car.o.top, S.car.slide, S.car.onGround, true);
    },
    draw(r) {
      const a = S.arena; a.world.draw(r);
      r.overlay(g => {
        const W = r.W, H = r.H, run = S.run;
        TC(g, 'DEMO', W / 2, 10, C.hot, { scale: 3 }); T(g, fmt(run.finished ? run.finishSteps : run.steps), 12, 10, C.text, { scale: 2 });
        if (S.flash) TC(g, S.flash.text, W / 2, H * .28, C.hot, { scale: 2 });
        if (Math.floor(game.real * 2) % 2 === 0) TC(g, 'PRESS ANY BUTTON', W / 2, H - 22, C.text, { scale: 2 });
        T(g, Math.round(Math.abs(S.car.speed) / U * 3.6) + ' KM/H', W - 80, H - 40, C.text, { scale: 1.5 });
      });
    }
  };

  // ================================================================== EDITOR (build mode and puzzles): a chain of blocks, drawn as a map
  const letters = Object.keys(BLOCKS);
  const chainDef = (env, chain) => ({ id: 'CUSTOM', env, name: 'Custom track', start: { x: 40, y: 40, angle: 0 }, width: 8, segs: parseChain('S40 ' + chain.map(c => BLOCKS[c].tok).join(' ') + ' S30 cp') });
  const parseChain = parse;
  const chainCost = ch => ch.reduce((n, c) => n + BLOCKS[c].cost, 0);
  const overlaps = def => { const c = compile(def), l = c.line; for (let i = 0; i < l.length; i++) for (let j = i + 14; j < l.length; j++) if ((l[i].x - l[j].x) ** 2 + (l[i].y - l[j].y) ** 2 < (9 * U) ** 2 && Math.abs(l[i].z - l[j].z) < 4 * U) return true; return false; };
  const enc = ed => { const s = JSON.stringify({ e: ed.env, c: ed.chain.join('') }); return typeof btoa === 'function' ? btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : Buffer.from(s).toString('base64url'); };
  const dec = str => { try { const s = typeof atob === 'function' ? atob(str.replace(/-/g, '+').replace(/_/g, '/')) : Buffer.from(str, 'base64url').toString(); const o = JSON.parse(s); return { env: ENVS[o.e] ? o.e : 'dust', chain: [...o.c].filter(c => BLOCKS[c]) }; } catch (e) { return null; } };
  S.enc = enc; S.dec = dec; S.chainDef = chainDef; S.overlaps = overlaps;

  scenes.editor = {
    view: 'iso', input: KEYS,
    enter(d) {
      S.dev = false; S.results = null; dropArena(); au.music('garage'); game.input.consumeAll();
      if (!d.back || !S.ed) S.ed = { env: d.puzzle ? d.puzzle.env : 'dust', chain: [], puzzle: d.puzzle || null, msg: '', slotMode: null, choices: d.puzzle ? Array(d.puzzle.slots).fill('') : null, bg: 0 };
      if (d.puzzle && S.ed.puzzle && S.ed.puzzle.id !== d.puzzle.id) S.ed = { env: d.puzzle.env, chain: [], puzzle: d.puzzle, msg: '', slotMode: null, choices: Array(d.puzzle.slots).fill(''), bg: 0 };
      S.puzzleState = S.ed.puzzle; edPane(); if (S.ed.puzzle) beat('puzzle'); else beat('build');
    },
    update(dt) {
      const ed = S.ed, I = game.input;
      if (S.talk.active) { S.talk.update(dt); return; }
      ed.bg += dt; if (ed.msgT > 0) ed.msgT -= dt;
      const k = ed.pane.update(); if (k < 0) return;
      const it = ed.pane.items[k]; edAct(it);
    },
    draw(r) {
      const ed = S.ed, W = r.W, H = r.H;
      r.overlay(g => {
        const env = ENVS[ed.env];
        g.fillStyle = env.sky[1]; g.fillRect(0, 0, W, H); g.fillStyle = env.colors.base; g.fillRect(0, H * .35, W, H); g._c = null;
        veil(g, r, .55);
        header(g, r, ed.puzzle ? 'PUZZLE: ' + ed.puzzle.name : 'BUILD', ed.puzzle ? ed.puzzle.hint : env.name + ' - coppers ' + (profile.data.coppers - chainCost(ed.chain)) + ' left');
        drawMap(g, 16, 40, W - 32, H * .34);
        ed.pane.draw(g, 16, 40 + H * .34 + 6, W - 32, H - 40 - H * .34 - 30);
        if (ed.msg && ed.msgT > 0) TC(g, ed.msg, W / 2, H - 28, ed.bad ? C.bad : C.good);
        if (ed.code) T(g, 'CODE ' + ed.code, 16, 36, C.hot);
        prompts(game, g, r, [['confirm', 'Select'], ['cancel', ed.slotMode ? 'Close' : 'Back']]);
        S.talk.draw(g, r);
      });
    }
  };
  function edMsg(t, bad) { S.ed.msg = t; S.ed.msgT = 3; S.ed.bad = !!bad; if (bad) A.sfx('denied'); }
  function edDef() { const ed = S.ed; return ed.puzzle ? puzzleCourse(ed.puzzle, ed.choices) : chainDef(ed.env, ed.chain); }
  function edPane() {
    const ed = S.ed; let items = [];
    if (ed.slotMode) {
      items = profile.data.slots.map((s, i) => ({ label: 'SLOT ' + (i + 1), sub: s ? s.chain.length + ' blocks - ' + ENVS[s.env].name : 'Empty', act: 'slot', i, locked: ed.slotMode === 'load' && !s })); items.push({ label: 'Close', act: 'close' });
      ed.pane = new Pane(game, items, { cols: 3, tileH: 34, onCancel: () => { ed.slotMode = null; edPane(); } });
    } else if (ed.puzzle) {
      const left = ed.puzzle.inv.split(' ').slice(); for (const c of ed.choices) { const j = left.indexOf(c); if (j >= 0) left.splice(j, 1); }
      ed.choices.forEach((c, i) => items.push({ label: 'GAP ' + (i + 1) + ': ' + (c ? BLOCKS[c].label : 'empty'), act: 'unslot', i, color: '#ffd36a' }));
      left.forEach(c => items.push({ label: BLOCKS[c].label, act: 'put', c }));
      items.push({ label: 'DRIVE IT', act: 'drive', color: '#7af0a0' }, { label: 'CLEAR', act: 'clear' }, { label: 'EXIT', act: 'exit' });
      ed.pane = new Pane(game, items, { cols: 4, tileH: 24, onCancel: () => game.go('menu', { page: 'puzzle' }) });
    } else {
      letters.forEach(c => items.push({ label: BLOCKS[c].label, tag: String(BLOCKS[c].cost), act: 'add', c }));
      items.push({ label: 'UNDO', act: 'undo', color: '#ff9a3a' }, { label: 'TEST DRIVE', act: 'drive', color: '#7af0a0' }, { label: 'LAND: ' + ENVS[ed.env].name, act: 'env' }, { label: 'SAVE', act: 'save' }, { label: 'LOAD', act: 'load' }, { label: 'SHARE CODE', act: 'share' }, { label: 'PASTE CODE', act: 'paste' }, { label: 'CLEAR', act: 'clear' }, { label: 'EXIT', act: 'exit' });
      ed.pane = new Pane(game, items, { cols: 5, tileH: 18, onCancel: () => game.go('menu', { page: 'main' }) });
    }
  }
  function edAct(it) {
    const ed = S.ed, i0 = ed.pane.i;
    switch (it.act) {
      case 'add': { if (chainCost(ed.chain) + BLOCKS[it.c].cost > profile.data.coppers) return edMsg('Not enough coppers', true); const next = ed.chain.concat(it.c); if (overlaps(chainDef(ed.env, next))) return edMsg('The road would cross itself', true); ed.chain = next; ed.code = null; A.sfx('coin'); edMsg(BLOCKS[it.c].label + ' placed'); break; }
      case 'undo': if (ed.chain.length) { ed.chain.pop(); A.sfx('cancel'); edMsg('Removed. Coppers refunded.'); } break;
      case 'clear': if (ed.puzzle) ed.choices.fill(''); else ed.chain = []; edPane(); ed.pane.i = Math.min(i0, ed.pane.items.length - 1); break;
      case 'env': { const ks = Object.keys(ENVS); ed.env = ks[(ks.indexOf(ed.env) + 1) % 3]; edPane(); ed.pane.i = i0; break; }
      case 'put': { const j = ed.choices.indexOf(''); if (j < 0) return edMsg('Every gap is full: pick a gap to empty it', true); ed.choices[j] = it.c; A.sfx('coin'); edPane(); break; }
      case 'unslot': if (ed.choices[it.i]) { ed.choices[it.i] = ''; edPane(); } break;
      case 'drive': {
        if (ed.puzzle) { if (!puzzleSolved(ed.puzzle, ed.choices, compile)) return edMsg(ed.choices.includes('') ? 'Fill every gap first' : 'That road does not reach the finish', true); startRace(edDef(), { mode: 'puzzle', count: 480 }); }
        else { if (!ed.chain.length) return edMsg('Place a block first', true); startRace(edDef(), { mode: 'test', count: 480 }); }
        break;
      }
      case 'save': ed.slotMode = 'save'; edPane(); break;
      case 'load': ed.slotMode = 'load'; edPane(); break;
      case 'slot': if (ed.slotMode === 'save') { profile.data.slots[it.i] = { env: ed.env, chain: ed.chain.slice() }; profile.save(); A.sfx('confirm'); edMsg('Saved to slot ' + (it.i + 1)); } else { const s = profile.data.slots[it.i]; if (s) { ed.env = s.env; ed.chain = s.chain.slice(); edMsg('Loaded slot ' + (it.i + 1)); } } ed.slotMode = null; edPane(); break;
      case 'close': ed.slotMode = null; edPane(); break;
      case 'share': ed.code = enc(ed); try { navigator.clipboard && navigator.clipboard.writeText(ed.code); } catch (e) { /* no clipboard */ } edMsg('Share code shown (and copied)'); break;
      case 'paste': { const apply = txt => { const d = dec((txt || '').trim()); if (d) { ed.env = d.env; ed.chain = d.chain; edPane(); edMsg('Track imported'); } else edMsg('That code is not a track', true); }; if (S.pasteText !== undefined) apply(S.pasteText); else if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(apply, () => edMsg('Clipboard unavailable', true)); else edMsg('Clipboard unavailable', true); break; }
      case 'exit': game.go('menu', { page: ed.puzzle ? 'puzzle' : 'main' }); break;
    }
  }
  function drawMap(g, x, y, w, h) {
    const ed = S.ed, c = compile(edDef()), l = c.line; box(g, x, y, w, h, false);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of l) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    let tgt = null; if (ed.puzzle) { const sol = compile(puzzleCourse(ed.puzzle, ed.puzzle.solution.split(' '))), ofs = [l[0].x - sol.line[0].x, l[0].y - sol.line[0].y]; tgt = sol.line.map(p => ({ x: p.x + ofs[0], y: p.y + ofs[1] })); for (const p of tgt) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } }
    const sc = Math.min((w - 20) / Math.max(1, x1 - x0), (h - 20) / Math.max(1, y1 - y0), .06), ox = x + w / 2 - (x0 + x1) / 2 * sc, oy = y + h / 2 - (y0 + y1) / 2 * sc;
    const dot = (p, col, s = 2) => { g.fillStyle = col; g.fillRect(Math.round(ox + p.x * sc) - s / 2, Math.round(oy + p.y * sc) - s / 2, s, s); };
    if (tgt) for (let i = 0; i < tgt.length; i += 1) dot(tgt[i], '#4a5a8a', 3);
    const dirt = new Set(); c.sections.forEach(sec => { if (sec.surface !== 'road') for (const p of sec.pts) dirt.add(Math.round(p[0]) + ',' + Math.round(p[1])); });
    for (let i = 0; i < l.length - 1; i++) { const a = l[i], b = l[i + 1], n = 6; for (let k = 0; k < n; k++) dot({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }, a.jump ? '#ff4a4a' : '#fff', 2); }
    for (const gt of c.gates) dot(gt, gt.kind === 'start' ? '#4ae04a' : gt.kind === 'finish' ? '#ffd36a' : '#6ad0ff', 5);
    for (const sec of c.sections) for (const p of sec.padPts || []) dot({ x: p[0], y: p[1] }, '#ff9a3a', 4);
    T(g, ed.puzzle ? 'The dim road is where the finish must end up. Red = jump.' : 'Green = start - blue = checkpoint - orange = boost - red = jump - ' + (c.length / U | 0) + ' m', x + 6, y + h - 12, '#b8b0d8');
  }

  // ================================================================== GARAGE
  scenes.garage = {
    view: 'iso', input: KEYS,
    enter() {
      S.dev = false; load(COURSES.D1, { count: 999999, noPaint: false }); S.run.count = 999999; S.car.place(S.car.x + 700, S.car.y, S.car.z + 2); au.music('garage'); S.gt = 0; game.input.consumeAll();
      const owned = profile.data.paints || (profile.data.paints = [0, 1, 2, 3]); const items = []; PAINTS.forEach((p, i) => items.push({ label: p[0], sub: owned.includes(i) ? 'owned' : '40 coppers', kind: 'paint', i, color: p[1], tag: profile.data.paint === p[1] ? 'ON' : '' }));
      Object.values(CARS).forEach(c => { const own = (profile.data.cars || ['coyote']).includes(c.id); items.push({ label: c.name, sub: own ? c.note : (c.id === 'pebble' ? 80 : 120) + ' coppers', kind: 'car', id: c.id, tag: (profile.data.car || 'coyote') === c.id ? 'ON' : '' }); });
      items.push({ label: 'BACK', kind: 'back' }); S.gpane = new Pane(game, items, { cols: 4, tileH: 30, onCancel: () => game.go('menu', { page: 'main' }) });
      const cam = S.arena.world.camera; cam.set('fixed'); applyGarage();
    },
    update(dt) {
      S.gt += dt; const a = S.arena, v = S.car, ang = S.gt * .5, g0 = S.run.last;
      a.world.camera.fixed = { x: v.x + Math.cos(ang) * 64, y: v.y + Math.sin(ang) * 64, z: v.z + 26, yaw: ang + Math.PI, pitch: -.3, fov: 55 }; v.vx = v.vy = 0; a.world.step(dt);
      const k = S.gpane.update(); if (k < 0) return; const it = S.gpane.items[k];
      if (it.kind === 'back') return game.go('menu', { page: 'main' });
      const d = profile.data; d.paints = d.paints || [0, 1, 2, 3]; d.cars = d.cars || ['coyote'];
      if (it.kind === 'paint') { if (!d.paints.includes(it.i)) { if (!profile.spend(40)) return A.sfx('denied'); d.paints.push(it.i); A.sfx('coin'); } d.paint = PAINTS[it.i][1]; }
      else if (it.kind === 'car') { if (!d.cars.includes(it.id)) { const cost = it.id === 'pebble' ? 80 : 120; if (!profile.spend(cost)) return A.sfx('denied'); d.cars.push(it.id); A.sfx('coin'); } d.car = it.id; }
      profile.save(); applyGarage(); const idx = S.gpane.i; game.go('garage');
    },
    draw(r) { S.arena.world.draw(r); r.overlay(g => { veil(g, r, .15); header(g, r, 'GARAGE', 'Coppers ' + profile.data.coppers); S.gpane.draw(g, 16, r.H - 134, r.W - 32, 100); prompts(game, g, r, [['confirm', 'Pick / buy'], ['cancel', 'Back']]); }); }
  };
  function applyGarage() { const d = profile.data, car = CARS[d.car || 'coyote']; const v = S.car; if (!v) return; v.o.color = d.paint; Object.assign(v.o, { top: car.top }); v.data.car = car; }

  // ================================================================== DEV MODE (pause menu -> Dev Mode)
  S.devTab = 0;
  function openDev() { if (game.sceneName !== 'race' || S.attract) { game.shell && game.shell.toast && game.shell.toast('Dev Mode', 'Open it from a race'); return; } if (game.shell) game.shell.hide(); game.paused = false; S.dev = true; S.devTab = 0; S.sl = new Sliders(game, SLIDERS, CFG, TUNING); S.devPane = devTools(); game.input.consumeAll(); }
  S.openDev = openDev;
  function devTools() {
    return new Pane(game, [
      { label: 'Teleport to next checkpoint', act: 'tp' }, { label: 'Finish with the author bot time', act: 'fin' }, { label: 'Unlock every track', act: 'unlock' }, { label: 'Give 500 coppers', act: 'cop' },
      { label: 'Slow motion: ' + (game.timeScale < 1 ? 'ON' : 'off'), act: 'slow' }, { label: 'Telemetry: ' + (S.tele ? 'ON' : 'off'), act: 'tele' }, { label: 'Re-bake this track (bot)', act: 'bake' }, { label: 'Reset profile', act: 'wipe' }, { label: 'Close Dev Mode', act: 'close' }], { cols: 1, tileH: 20, onCancel: () => { S.dev = false; } });
  }
  function devUpdate(dt) {
    const I = game.input;
    if (I.pressed('camera') || I.pressed('look')) { S.devTab ^= 1; A.sfx('select'); }
    if (S.devTab === 0) { if (S.sl.update()) { for (const c of S.cars) { /* live: drive() reads CFG each step */ } S.arena.world.gravity = CFG.gravity * U; setCam(S.arena.world, S.car); } if (I.pressed('cancel')) { S.dev = false; I.consumeAll(); } return; }
    const k = S.devPane.update(); if (k < 0) return; const act = S.devPane.items[k].act, a = S.arena;
    if (act === 'tp') { const gt = a.course.gates.find((g, i) => g.kind === 'cp' && !S.run.passed.has(i)) || a.course.finish; S.car.place(gt.x - Math.cos(gt.angle) * 120, gt.y - Math.sin(gt.angle) * 120, gt.z + 6); S.car.angle = gt.angle; S.car.vx = S.car.vy = S.car.vz = 0; S.car.speed = 0; }
    else if (act === 'fin') { const t = authorTime(S.def.id); if (t) { S.run.phase = 'finished'; S.run.finished = true; S.run.finishSteps = t; S.run.cps = S.run.cpTotal; finishRun({ steps: t }); S.dev = false; } }
    else if (act === 'unlock') { profile.data.devUnlock = true; profile.save(); game.note('ALL TRACKS UNLOCKED'); }
    else if (act === 'cop') { profile.earn(500); game.note('+500 COPPERS'); }
    else if (act === 'slow') { game.timeScale = game.timeScale < 1 ? 1 : .4; S.devPane = devTools(); S.devPane.i = k; }
    else if (act === 'tele') { S.tele = !S.tele; S.devPane = devTools(); S.devPane.i = k; }
    else if (act === 'bake') { S.baked = authorTime(S.def.id); game.note('AUTHOR ' + (S.baked ? fmt(S.baked) : 'n/a')); }
    else if (act === 'wipe') { profile.reset(); game.note('PROFILE RESET'); }
    else if (act === 'close') { S.dev = false; }
  }
  function devDraw(g, r) {
    veil(g, r, .62); const W = r.W;
    header(g, r, 'DEV MODE', (S.devTab === 0 ? 'SLIDERS' : 'TOOLS') + '  -  ' + game.input.label('camera') + ' switches tab');
    if (S.devTab === 0) { S.sl.draw(g, 14, 40, Math.min(W - 28, 360)); } else S.devPane.draw(g, 14, 48, Math.min(W - 28, 360), r.H - 80);
    const v = S.car; T(g, 'x ' + Math.round(v.x) + ' y ' + Math.round(v.y) + ' z ' + Math.round(v.z) + '  ' + Math.round(Math.abs(v.speed) / U * 3.6) + ' km/h  ' + (v.onGround ? 'ground' : 'air') + '  ' + (v.surface || '-'), 14, r.H - 30, '#b8b0d8');
    prompts(game, g, r, [['cancel', 'Close'], ['camera', 'Tab']]);
  }

  // ================================================================== start-up, deep links, debug handle
  const X = { game, S, scenes, A, P, au, KEYS, helpers: { setCam, load, startRace, sawInput, finishRun, dropArena, openPage } };
  installOnline(X);
  S.go = (name, d) => game.go(name, d); S.startRace = startRace; S.load = load; S.dropArena = dropArena; S.dispatch = dispatch; S.openDevFn = openDev;
  S.deeplink = (k, a, b) => {
    if (k === 'race' && COURSES[a]) startRace(COURSES[a], { mode: 'race' });
    else if (k === 'puzzle') game.go('editor', { puzzle: PUZZLES.find(p => p.id === a) || PUZZLES[0] });
    else if (k === 'survival') { const env = ENVS[a] ? a : 'dust'; S.survive = { env, round: 0 }; game.go('race', { mode: 'survival', def: COURSES[SURVIVAL[env].courses[0]], survive: S.survive, count: 480 }); }
    else if (k === 'editor') game.go('editor', {}); else if (k === 'garage') game.go('garage'); else if (k === 'attract') game.go('attract');
    else if (k === 'about') game.go('menu', { page: 'about' });
    else if (k === 'split') { S.mp = { n: +a || 2, kind: 'split' }; launchMulti(COURSES[b] || COURSES.D1); }
    else if (k === 'hotseat') { S.mp = { n: +a || 2, kind: 'hotseat' }; launchMulti(COURSES[b] || COURSES.D1); }
  };
  S.openPage = openPage; S.PAGES = PAGES; S.profile = profile; S.setupSplit = setupSplit;
  const hubOn = !!(globalThis.AIHub && globalThis.AIHub.active);
  const BOOT = [
    ['Reading your profile', () => { profile.load(); }],
    ['Starting the engines', () => W3.init(game)],
    ['Pouring asphalt', () => { if (!headless) { const a = makeArena(game, COURSES.D1); a.dispose(); } }]
  ];
  game.debug = { snapshot() {
    const v = S.car, r = S.run;
    return { scene: game.sceneName, page: S.page, mode: S.mode, track: S.def && S.def.id, run: r ? { phase: r.phase, steps: r.steps, cps: r.cps, cpTotal: r.cpTotal, respawns: r.respawns, finished: r.finished, finishSteps: r.finishSteps } : null,
      car: v ? { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z), kmh: Math.round(Math.abs(v.speed) / U * 3.6), onGround: v.onGround, surface: v.surface } : null,
      results: S.results ? { medal: S.results.medal, steps: S.results.steps, mode: S.results.mode } : null, profile: { coppers: profile.data.coppers, medals: profile.data.medals }, dev: S.dev, attract: S.attract, touchOnly: touchOnly(), hub: hubOn ? { phase: X.online.phase } : null, errors: game.errors.length };
  } };
  S.boot = BOOT;
  S.start = () => game.start({ scenes, scene: hubOn ? 'online' : (S.initial || 'menu'), boot: { steps: BOOT } });
  return X;
}
