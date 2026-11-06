// RaceScene: everything driven. Race, licence test, test drive, time trial, attract clips, couch duel, hub round. Built from a plain RaceSetup.
import { THREE, setLookLayer, PALETTE } from '../../pixel-engine.js';
import { App, S, fmtTime, fmtGap, saveProfile } from '../app.js';
import { UI } from '../ui/ui.js';
import { loadCast } from '../models/cast.js';
import { RaceSim, getTrack } from '../sim/race.js';
import { TestRun } from '../sim/licence.js';
import { TRACKS } from '../data/tracks.js';
import { CAR_INFO } from '../data/cars.js';
import { World } from '../render/world.js';
import { CarView } from '../render/carview.js';
import { ChaseCam, setupCamera, CAM_MODES, angDiff } from '../render/camera.js';
import { drawRaceHud } from '../ui/hud.js';
import { drawOverlay, openPause, openResults, openTestResult } from './overlays.js';
import { P1_KEYS, P2_KEYS, Actions, readPads } from '../input/actions.js';
import { testById } from '../data/licences.js';
import { drawDevOverlays, applyLive } from '../dev/devmode.js';
import { attractTick } from '../attract/director.js';
import { Director } from '../render/director.js';
import { makeTrialSim, initTrial, trialEvent, updateGhost } from './race_modes.js';
const { Vector3 } = THREE;
let SEQ = 0;
export class RaceScene {
  constructor(setup) { this.name = 'race'; this.cfg = setup; this.A = setup.second ? new Actions() : App.actions; this.mode = setup.mode ?? 'race'; this.id = ++SEQ; this.target = new Vector3(); this.t = 0; this.ready_ = false; }
  async setup(ctx) { // eslint-disable-line
    const st = this.cfg, tid = st.track, trk = TRACKS[tid]; this.ctx = ctx; this.rand = ctx.random.fork('race');
    const e = ctx.engine; e.input.gamepadButtons = {};
    // register particles once
    for (const [n, d] of Object.entries(PARTICLES)) ctx.particles.register(n, d);
    this.testDef = st.test ? testById(st.test.id) : null; this.test = this.testDef;
    if (this.mode === 'test') { this.run = new TestRun(this.testDef, { runIndex: st.test.runIndex ?? 0, demo: !!st.demo, seed: 5 + (st.test.attempt ?? 0), install: st.install ?? undefined }); this.sim = this.run.sim; this.laps = 1; }
    else if (st.second) { this.sim = this.secondOf.sim; }
    else if (this.mode === 'trial') this.sim = makeTrialSim(st);
    else this.sim = new RaceSim({ ...st.sim, track: tid, seed: st.seed ?? 7, env: this.devEnv() });
    const sim = this.sim; this.focus = st.second ? sim.cars.find((c) => c.id === 'player2') : (sim.player ?? sim.cars[0]); this.focusAuto = true;
    const hour = st.hour ?? trk.hour; let hourStart = hour; this.hourEnd = st.hourEnd ?? null; this.world = new World(ctx, sim.tr, tid, { hour: hourStart, rain: !!st.rain });
    this.views = new Map(); for (const car of sim.cars) { const inst = car.install ?? {}; const v = new CarView(car.carId, car.p, { paint: inst.paint ?? car.paint, rims: inst.rims ?? 0, spoiler: car.p.spoiler ?? 0, name: car.name, ghost: car.ghost ? car.colour : null }); if (!car.player && car.paint) v.paint = car.paint; this.views.set(car, v); ctx.scene.add(v.root); car.pv = { x: car.c.x, y: car.c.y, z: car.c.z, yaw: car.c.yaw }; car.cv = { ...car.pv }; const prof = App.profile; if (car.player && st.dirt != null) v.setDirt(st.dirt); }
    if (st.cones || this.testDef?.cones) { const list = this.run ? this.run.cones.map((k) => ({ s: k.s })) : []; this.world.addCones(list); }
    // marshals with cloth flags beside the barriers at the corners (in a hub round they load after ready(), so the round starts fast)
    this.marshals = []; const addMarshals = async () => { try { const cast = await loadCast(ctx), tr = sim.tr, N = tr.N, n = 6; const people = await Promise.all(Array.from({ length: n }, () => cast.make('marshal'))); people.forEach((p, ci) => { const i = (Math.round(tr.cornerS[(ci * 2 + 1) % tr.cornerS.length] / tr.ds) + Math.floor(ci / tr.cornerS.length) * 12) % N, sd = tr.kappa[i] > 0 ? -1 : 1, h = tr.width[i] / 2 + (sd > 0 ? tr.wallR[i] : tr.wallL[i]) + 1.5, tt = sd * h; p.root.position.set(tr.x[i] - tr.tz[i] * tt, tr.y[i], tr.z[i] + tr.tx[i] * tt); p.root.rotation.y = Math.atan2(sd * tr.tz[i], -sd * tr.tx[i]); p.play('MarshalFlag'); ctx.scene.add(p.root); this.marshals.push(p); }); if (typeof window !== 'undefined') window.__MARSHALS__ = this.marshals.length; } catch (e) { /* marshals are decoration */ } };
    await addMarshals();
    setupCamera(ctx.camera.camera); this.cam = new ChaseCam(ctx.camera.camera); this.cam.mode = st.cam ?? 0;
    this.flash = { abs: 0, tcs: 0, stb: 0 }; this.message = ''; this.messageT = 0; this.recoverProgress = 0; this.paused = false; this.over = false; this.ov = null; this.resultsShown = false; this.endT = 0; this.showFuel = !!st.endurance; this.penaltyText = ''; this.skidAcc = 0; this.smokeT = 0;
    this.compact = !!st.compact; this.hubLights = false; this.padIndex = st.padIndex ?? 0; this.keys = st.keys ?? undefined;
    this.night = this.world.night; this.headL = null; this.tailL = null;
    if (this.world.night > 0.25) { this.headL = ctx.lights.request({ position: [0, 1, 0], color: 0xffe8b0, intensity: 9, radius: 26, priority: 8 }); this.tailL = ctx.lights.request({ position: [0, 1, 0], color: 0xff4020, intensity: 2.5, radius: 7, priority: 3 }); }
    this.introT = this.mode === 'test' ? 0 : 0; this.state = this.mode === 'test' && !st.demo ? 'brief' : 'play'; if (this.mode === 'test' && !st.demo) { this.briefT = 0; App.mix?.say?.(this.testDef.brief, 'arai'); }
    if (this.mode === 'race' || this.mode === 'attract' || this.mode === 'duel') this.message = sim.setup.start === 'standing' ? 'LIGHTS' : 'ROLLING START', this.messageT = 2.5;
    this.attractT = 0; if (this.mode === 'attract') { this.dir = new Director(sim.tr, 5); this.tvCamOn = false; this.hideHud = false; }
    this.latch = { up: false, down: false, camera: false, pause: false, confirm: false, back: false, info: false, alt: false };
    if (!st.second) App.mix?.raceStart?.(this);
    if (st.music !== false && !st.second) App.music?.play(this.night > 0.3 ? 'city' : this.sim.setup.rally ? 'redclay' : 'apex');
    if (App.ui) App.ui.sounds = App.mix;
    if (App.dev.on || Object.keys(App.dev.sliders).length) applyLive(this);
    if (this.mode === 'trial') initTrial(this, ctx);
    this.ghostCars = []; this.simTime = 0; this.mapPts = null; this.frame0 = ctx.engine.frame;
  }
  devEnv() { const d = App.dev.sliders, e = {}; if (d.grip) e.gripScale = d.grip; if (d.power) e.powerScale = d.power; if (d.brake) e.brakeScale = d.brake; if (d.wear != null) e.wearRate = 0.0012 * d.wear; if (d.fuel != null) e.fuelRate = 0.0018 * d.fuel; if (d.wall != null) e.wallLoss = d.wall; if (d.slip) e.slip = d.slip; if (d.god) { e.wearRate = 0; e.fuelRate = 0; } return e; }
  ready(ctx) { if (typeof window !== 'undefined') window.__GAME__ = App.api?.(this) ?? window.__GAME__; }
  cameraTarget() { const c = this.focus?.c; return c ? this.target.set(c.x, c.y + 0.5, c.z) : this.target.set(0, 0, 0); }
  status() { const c = this.focus?.c, s = this.sim; return `race ${this.cfg.track} ${this.mode} lap ${this.focus?.crossings ?? 0}/${s.laps} p${this.focus?.positionNow ?? 1}/${s.cars.length} ${fmtTime(this.raceTime())} ${s.state}`; }
  fingerprint() { return String(this.sim?.fingerprint?.() ?? 0); }
  raceTime() { if (this.run) return Math.max(0, this.run.t + (this.run.penalty ?? 0)); const s = this.sim; const car = this.focus; if (s.greenAt == null) return car.finished ? car.finishTime : (s.setup.start === 'flying' ? s.time : 0); return car.finished ? car.finishTime : s.time - s.greenAt; }
  gapText() { const s = this.sim, car = this.focus; if (this.cfg.sim?.rally || s.setup.rally) { const r = s.cars.find((x) => x !== car); if (!r) return null; const d = (car.prog - r.prog) / Math.max(15, Math.hypot(car.c.vx, car.c.vz)); return { s: fmtGap(-d) + ' RIVAL', c: d > 0 ? 'lime' : 'red' }; } if (this.mode === 'test' || s.cars.length < 2) return null; const a = s.gapAhead(car), b = s.gapBehind(car); if (a != null) return { s: fmtGap(a) + ' AHEAD', c: 'red' }; if (b != null) return { s: fmtGap(-b) + ' LEAD', c: 'lime' }; return null; }
  say(msg, col, t = 2) { this.message = msg; this.messageColour = col; this.messageT = t; }
  // ----- per-frame input latch -----
  doLatch(ctx, dt) { const A = this.A; A.frame(ctx, dt, { keys: this.keys, pad: this.padIndex }); const L = this.latch; for (const k of ['up', 'down', 'camera', 'pause', 'confirm', 'back', 'info', 'alt']) L[k] = L[k] || A[k]; }
  fixedUpdate(ctx, dt) {
    this.doLatch(ctx, dt); if (this.cfg.ended) return; if (this.cfg.second) { const o = this.secondOf; this.paused = o.paused || !!o.ov; return; } if (this.paused || (this.ov && !App.hubActive) || this.state === 'brief' || this.over && this.endT > 6) return;
    const A = this.A, L = this.latch, s = S(), dev = App.dev.sliders, sim = this.sim;
    const fa = this.focus; if (!fa || this.state !== 'play') { this.holdFrame(); return; }
    const as = this.assists(); const inp = { steer: A.steer, throttle: A.throttle, brake: A.brake, handbrake: A.handbrake, abs: as.abs, tcs: as.tcs, asm: as.asm, auto: as.auto, up: L.up, down: L.down, steerRate: dev.steer ?? 3, recover: A.recoverHold, noRallyAsm: false };
    L.up = L.down = false; this.focusAuto = as.auto;
    for (const car of sim.cars) { car.pv = { x: car.c.x, y: car.c.y, z: car.c.z, yaw: car.c.yaw }; car.pa = { ax: car.c.ax, ay: car.c.ay }; }
    if (App.dev.sliders.pause) return; const dr = this.cfg.demoDrive; if (this.run) { if (this.cfg.demo) this.run.step(null); else this.run.step(inp); } else sim.step(this.cfg.duel ? { player: inp, player2: this.p2Input(ctx, dt, as) } : { player: inp }, dt);
    this.simTime += dt; this.afterStep(ctx);
  }
  p2Input(ctx, dt, as) { const A2 = (this.A2 ??= new Actions()), pads = readPads().length; A2.frame(ctx, dt, { keys: pads > 1 ? undefined : P2_KEYS, pad: pads > 1 ? 1 : null }); return { steer: A2.steer, throttle: A2.throttle, brake: A2.brake, handbrake: A2.handbrake, abs: as.abs, tcs: as.tcs, asm: as.asm, auto: as.auto, up: A2.up, down: A2.down, steerRate: 3, recover: A2.recoverHold }; }
  holdFrame() { for (const car of this.sim.cars) car.pv = { x: car.c.x, y: car.c.y, z: car.c.z, yaw: car.c.yaw }; }
  assists() { const s = S(), tp = this.testDef?.assists ?? {}, dev = App.dev.sliders; const base = this.cfg.assists ?? { abs: s.abs, tcs: s.tcs, asm: s.asm, auto: s.auto }; return { abs: tp.abs ?? base.abs, tcs: (tp.tcs ?? base.tcs) / 10 * (dev.tcsK ?? 1), asm: (tp.asm ?? base.asm) / 10 * (dev.asmK ?? 1), auto: base.auto }; }
  afterStep(ctx) {
    const sim = this.sim, f = this.focus, A = App.actions; this.penaltyText = this.run && this.run.penalty ? `+${this.run.penalty.toFixed(0)}S CONES` : '';
    for (const ev of this.run ? [...(this.run.events ?? [])] : sim.events) { this.onEvent(ctx, ev); if (this.mode === 'trial') trialEvent(this, ctx, ev); }
    if (this.run && this.run.done && !this.over) { this.over = true; this.endT = 0; }
    if (!this.run && sim.state === 'over' && !this.over) { this.over = true; this.endT = 0; }
    if (!this.run && f.finished && !this.fin) { this.fin = true; this.say('FINISH', 'sand', 3); App.mix?.sfx?.('finish'); if (this.cfg.finishCue) this.cfg.finishCue(this); }
  }
  onEvent(ctx, ev) {
    const f = this.focus, mix = App.mix, car = this.sim.cars.find((c) => c.id === ev.car);
    switch (ev.type) {
      case 'green': this.say('GO', 'lime', 1.2); ctx.engine.screen.flash('white', { duration: 0.12 }); mix?.sfx?.('green'); break;
      case 'shift': if (car === f) mix?.sfx?.('clunk'); break;
      case 'kerb': if (car === f) { ctx.engine.shake.add(0.06); mix?.sfx?.('kerb'); this.rumble(0.3, 0.3, 60); } break;
      case 'wallHit': case 'carHit': if (car === f) { ctx.engine.shake.add(Math.min(0.7, ev.v * 0.05)); mix?.sfx?.(ev.type === 'wallHit' ? 'wall' : 'car'); this.rumble(1, 0.8, 140); if (ev.v > 14 && ev.type === 'wallHit') ctx.engine.hitstop(0.05); ctx.particles.burst('spark', new Vector3(car.c.x, car.c.y + 0.6, car.c.z), { count: 10 }); } else if (this.near(car, 40)) mix?.sfx?.('thump'); break;
      case 'lockup': if (car === f) { mix?.sfx?.('chirp'); this.rumble(0.5, 0.2, 80); } break;
      case 'lap': if (car === f) { mix?.sfx?.('lap'); if (ev.lap < this.sim.laps) this.say(`LAP ${ev.lap + 1}/${this.sim.laps}  ${fmtTime(ev.time)}`, 'white', 2.5); } break;
      case 'finish': if (car === f && !this.run) { this.endT = 0; } break;
      case 'pitIn': if (car === f) this.say('PIT LANE', 'sand', 2); this.pitCrew?.(car); break;
      case 'pitStop': if (car === f) { this.say('PIT STOP', 'sand', 2); } App.pit?.begin(this, car); car._crewPhase = 'service'; if (car._crew) car._crew.phase = 'service'; break;
      case 'pitDone': App.pit?.end(this, car); break;
      case 'recover': if (car === f) this.say('BACK ON THE ROAD', 'mist', 1.5); break;
      case 'cone': this.world.hitCone(ev.s); mix?.sfx?.('cone'); break;
      case 'testEnd': break;
    }
  }
  near(car, d) { const a = this.focus.c, b = car.c; return (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < d * d; }
  rumble(strong, weak, ms) { if (!S().vibration || App.actions.last !== 'pad') return; try { const p = [...navigator.getGamepads()].find((g) => g && g.connected); p?.vibrationActuator?.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch {} }
  // ----- rendering -----
  update(ctx, dt) {
    this.doLatch(ctx, dt); const A = this.A, ui = this.cfg.second ? this.ui2 ??= new UI() : App.ui, L = this.latch; this.t += dt;
    ui.begin(ctx, A, dt); const sim = this.sim, f = this.focus, alpha = ctx.physics.alpha ?? 1;
    // gantry lights
    if (this.world.gantry) { const g = this.world.gantry; const n = sim.state === 'grid' && sim.setup.start === 'standing' ? Math.min(5, Math.floor(sim.lightT)) : sim.state === 'grid' ? 5 : (this.t < 2 || sim.greenAt != null && sim.time - sim.greenAt < 1 ? 0 : 0); g.forEach((m, i) => { m.material = i < n || (sim.state === 'grid' && sim.setup.start !== 'standing') ? RED : OFF; if (sim.greenAt != null && sim.time - sim.greenAt < 1.5) m.material = GREEN; }); }
    // hour progression (endurance)
    if (this.hourEnd != null && sim.greenAt != null) { const prog = Math.min(1, f.prog / (sim.laps * sim.tr.length)); this.world.setHour(this.cfg.hour + (this.hourEnd - this.cfg.hour) * prog); if (this.world.night > 0.25 && !this.headL) { this.headL = ctx.lights.request({ position: [0, 1, 0], color: 0xffe8b0, intensity: 9, radius: 26, priority: 8 }); } }
    // camera input
    if (!this.paused && !this.ov) { if (L.camera && this.state === 'play') { this.cam.cycle(); this.say(CAM_MODES[this.cam.mode], 'mist', 1); L.camera = false; } }
    // interpolate every car
    for (const car of sim.cars) { const c = car.c, pv = car.pv ?? c, v = this.views.get(car); const x = pv.x + (c.x - pv.x) * alpha, y = pv.y + (c.y - pv.y) * alpha, z = pv.z + (c.z - pv.z) * alpha, yaw = pv.yaw + angDiff(c.yaw, pv.yaw) * alpha; const i = c.loc.i, pitchRoad = -Math.atan(sim.tr.slope[i]), rollRoad = -Math.sin(sim.tr.bank[i]) * 0.9; const cvs = { x, y, z, yaw, delta: c.delta, u: c.u, ax: c.ax, ay: c.ay, vy: c.vy }; car.cv = cvs; v.place(cvs, { dt, pitchRoad, rollRoad: 0, braking: car.inp.brake > 0.2 && !car.inp.reverse, shake: c.surface === 'kerb' ? 1 : 0 }); }
    const c = f.cv ?? f.c; const fv = { ...c, pitchRoad: 0 };
    if (!this.paused) this.updateCamera(ctx, dt, fv);
    // lights
    const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw); if (this.headL) { this.headL.position.set(c.x + sn * 12, c.y + 1.2, c.z + cs * 12); this.tailL.position.set(c.x - sn * 2.5, c.y + 1, c.z - cs * 2.5); }
    for (const m of this.marshals ?? []) m.update(dt);
    this.updatePit?.(dt);
    this.world.update(dt, this.t, ctx.camera.camera, ctx.camera.camera.position);
    if (!this.cfg.second) this.effects(ctx, dt); if (!this.cfg.second) App.mix?.raceFrame?.(this, dt);
    // HUD
    ctx.hud.clear(); this.drawHud(ctx, ui, dt);
    ui.end(); for (const k of ['up', 'down', 'camera', 'pause', 'confirm', 'back', 'info', 'alt']) L[k] = false;
  }
  updateCamera(ctx, dt, c) {
    if (this.mode === 'attract' || (this.over && this.mode === 'race' && this.endT > 0.8)) { const cams = this.cfg.cams; let m = 0; if (cams) for (const [t0, mm] of cams) if (this.attractT >= t0) m = mm; if (this.over) m = 'tv'; if (m === 'tv') { const f = this.focus.c; this.dir ??= new Director(this.sim.tr, 5); this.dir.update(dt, { x: f.x, y: f.y, z: f.z, vx: f.vx, vz: f.vz, s: f.loc.s }, ctx.camera.camera, this.sim.cars.some((o) => o !== this.focus && Math.hypot(o.c.x - f.x, o.c.z - f.z) < 14)); return; } this.cam.mode = m; }
    const A = this.A, d = App.dev.sliders, I = ctx.input; this.cam.dev.dist = d.chase ?? null; this.cam.dev.fov = d.fov ?? null;
    let ox = A.lookX, oy = A.lookY, drag = false; if (A.mouse.rdown && A.last === 'mouse' && !this.paused) { ox += I.mouseDelta.x * 0.01; oy += I.mouseDelta.y * 0.01; drag = true; }
    if (this.hubRound?.cardActive) { const r = this.focus.c, tt = this.t * 0.25; ctx.camera.camera.position.set(r.x + Math.sin(tt) * 12, r.y + 4, r.z + Math.cos(tt) * 12); ctx.camera.camera.lookAt(r.x, r.y + 0.8, r.z); return; }
    if (this.state === 'brief' && this.mode === 'test') { const t = this.t; this.cam.init = false; const r = this.focus.c; ctx.camera.camera.position.set(r.x + Math.sin(t * 0.3 + 2) * 9, r.y + 3.2, r.z + Math.cos(t * 0.3 + 2) * 9); ctx.camera.camera.lookAt(r.x, r.y + 0.8, r.z); return; }
    if (this.over && this.run === undefined && this.endT > 0.5 && this.tvCam) { this.tvCam(ctx, dt); return; }
    this.cam.update(dt, c, { lookBack: A.lookBack && this.state === 'play' && !this.ov, orbitX: ox, orbitY: oy, orbitDrag: drag });
  }
  drivingLine(ctx) {
    const want = (S().line && this.mode !== 'attract') || (this.test && App.profile.flags['line' + this.test.id]) || App.dev.overlays?.line; if (!want) { if (this.lineG) this.lineG.visible = false; return; }
    const tr = this.sim.tr, line = this.sim.line, N = tr.N, K = 34;
    if (!this.lineG) { this.lineG = new THREE.Group(); this.lineM = []; for (let i = 0; i < K; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 2.2), toonMaterial(PALETTE.white)); m.frustumCulled = false; this.lineG.add(m); this.lineM.push(m); } ctx.scene.add(this.lineG); this.matW = toonMaterial(PALETTE.lime); this.matR = toonMaterial(PALETTE.red); }
    this.lineG.visible = true; const f = this.focus, c = f.c, i0 = c.loc.i, u = Math.max(8, Math.hypot(c.vx, c.vz)), step = Math.max(2, Math.round(Math.max(6, u * 0.25) / tr.ds));
    for (let k = 0; k < K; k++) { const i = (i0 + 3 + k * step) % N, j = (i + 1) % N, m = this.lineM[k], v = f.prof[i], vn = f.prof[(i + step) % N]; m.position.set(line.px[i], tr.y[i] + 0.1, line.pz[i]); m.rotation.y = Math.atan2(line.px[j] - line.px[i], line.pz[j] - line.pz[i]); m.material = vn < v - 0.5 || v < u * 0.9 ? this.matR : this.matW; }
  }
  effects(ctx, dt) {
    this.drivingLine(ctx);
    const sim = this.sim, f = this.focus, c = f.c, P = ctx.particles;
    this.flash.abs = Math.max(0, this.flash.abs - dt * 3); this.flash.tcs = Math.max(0, this.flash.tcs - dt * 3); this.flash.stb = Math.max(0, this.flash.stb - dt * 3);
    if (f.inp.abs && f.inp.brake > 0.7 && Math.max(...c.use) > 0.9 && Math.hypot(c.vx, c.vz) > 8) this.flash.abs = 1; if (f.inp.tcs > 0.05 && f.inp.throttle > 0.8 && Math.max(c.use[2], c.use[3]) > 0.95) this.flash.tcs = 1; if (Math.abs(c.beta) > 0.14 && f.inp.asm > 0.05) this.flash.stb = 1;
    if (this.messageT > 0) this.messageT -= dt; this.recoverProgress = f.recoverHold > 0 ? Math.min(1, f.recoverHold / 1) : 0;
    this.smokeT -= dt; if (this.smokeT <= 0) { this.smokeT = 0.05; for (const car of sim.cars) { const cc = car.c, cv = car.cv; if (!cv || Math.hypot(cc.vx, cc.vz) < 4) continue; if (!this.near(car, 60) && car !== f) continue; const sn = Math.sin(cv.yaw), cs = Math.cos(cv.yaw), rx = -cs, rz = sn; const dirt = cc.surface === 'dirt' || cc.surface === 'gravel', loose = cc.surface === 'grass';
        for (const side of [-0.8, 0.8]) { const px = cv.x - sn * 1.2 + rx * side, pz = cv.z - cs * 1.2 + rz * side, py = cv.y + 0.15;
          if (cc.locked || cc.sliding || cc.spinning) { if (dirt || loose) P.burst('dust', new Vector3(px, py, pz), { count: 2 }); else { P.burst('tyreSmoke', new Vector3(px, py, pz), { count: 1 }); this.world.skids.add(car.id + 'a' + side, px, py, pz, cv.yaw); } } else { this.world.skids.lift(car.id + 'a' + side); if ((dirt) && Math.hypot(cc.vx, cc.vz) > 12) P.burst('dust', new Vector3(px, py, pz), { count: 1, direction: [-sn, 0.4, -cs] }); }
          if (this.world.rain && Math.hypot(cc.vx, cc.vz) > 14) P.burst('spray', new Vector3(px, py, pz), { count: 1 }); } if (cc.airborne === false && car.wasAir) { P.burst('dust', new Vector3(cv.x, cv.y, cv.z), { count: 8 }); if (car === f) { ctx.engine.shake.add(0.25); App.mix?.sfx?.('thump'); } } car.wasAir = cc.airborne; if (car === f && cc.spinning && this.world.id !== 'redclay' && f.p.exhaust) {} } }
    if (f.p.exhaust && f.inp.throttle < 0.05 && c.rpm > 4000 && Math.random() < 0.05 && this.cam.mode !== 2) { const cv = f.cv; P.burst('pop', new Vector3(cv.x - Math.sin(cv.yaw) * 2.2, cv.y + 0.4, cv.z - Math.cos(cv.yaw) * 2.2), { count: 3 }); App.mix?.sfx?.('pop'); }
  }
  drawHud(ctx, ui, dt) {
    const sim = this.sim; if (this.hideHud) return;
    if (this.hubRound) { this.hubRound.update(ctx, dt, ui); if (!this.hubRound.cardActive) drawRaceHud(ui, this, dt); this.hubGate = true; }
    else if (this.state === 'brief') { drawBrief(this, ui); } else { drawRaceHud(ui, this, dt); }
    if (this.cfg.demo) { ui.text(8, 40, 'DEMONSTRATION', { scale: 2, color: 'cyan' }); }
    if (this.mode === 'attract') { ui.center(ui.H - 28, 'DEMO  -  PRESS ANY BUTTON', { color: 'sand' }); }
    if (App.dev.on) drawDevOverlays(this, ui);
    if (this.ghost) updateGhost(this, ctx, ui, dt);
    if (this.pass) ui.text(8, 52, 'PLAYER ' + (this.pass.cur + 1) + '  P1 ' + fmtTime(this.pass.best[0]) + '  P2 ' + fmtTime(this.pass.best[1]), { color: 'sand' });
    if (!this.cfg.second) this.handleFlow(ctx, ui, dt);
    if (this.ov) drawOverlay(this, ctx, ui, dt);
  }
  handleFlow(ctx, ui, dt) {
    const A = this.A, L = this.latch; if (this.mode === 'attract' || this.cfg.attract) { this.attractT += dt; attractTick(dt, this.attractT, this.cfg.attractDur ?? 15); return; }
    const fp = this.focus.pitState; if (fp && fp.phase === 'service' && L.back) fp.skipTyres = true;
    if (this.state === 'brief') { this.briefT += dt; if (L.confirm && this.briefT > 0.3) { this.state = 'play'; this.cam.snap(); } if (L.back) { this.exit(); } return; }
    if (!this.ov && L.pause && !this.over && !(App.hubActive && false)) { openPause(this); L.pause = false; }
    if (this.over) { this.endT += dt; if (this.endT > (this.run ? 0.8 : 3.0) && !this.ov && !this.resultsShown) { this.resultsShown = true; if (this.run) openTestResult(this); else openResults(this); } }
  }
  exit(to) { App.exitRace?.(this, to); }
  dispose() { this.headL?.release?.(); this.tailL?.release?.(); App.mix?.raceStop?.(this); }
}
import { toonMaterial } from '../../pixel-engine.js';
const RED = toonMaterial(PALETTE.red), OFF = toonMaterial(PALETTE.ink), GREEN = toonMaterial(PALETTE.lime);
const PARTICLES = {
  tyreSmoke: { count: [1, 2], life: [0.6, 1.1], speed: [0.4, 1.2], gravity: -0.6, drag: 1.2, size: [2, 5], colors: ['white', 'mist', 'slate'], radius: 0.2, max: 400 },
  dust: { count: [2, 4], life: [0.7, 1.4], speed: [0.5, 2], gravity: -0.2, flatten: 0.4, drag: 1, size: [2, 6], colors: ['sand', 'orange', 'sand'], radius: 0.4, max: 500 },
  spark: { count: [6, 10], life: [0.2, 0.5], speed: [4, 9], gravity: 12, size: [1, 1], colors: ['white', 'sand', 'orange'], max: 200 },
  spray: { count: [1, 2], life: [0.4, 0.8], speed: [1, 3], gravity: 3, size: [1, 2], colors: ['white', 'sky', 'mist'], radius: 0.3, max: 300 },
  pop: { count: [2, 4], life: [0.12, 0.25], speed: [1, 3], size: [2, 3], colors: ['white', 'sand', 'orange'], spread: 30, max: 60 },
  foam: { count: [3, 6], life: [0.8, 1.6], speed: [0.3, 1], gravity: -0.3, size: [2, 4], colors: ['white', 'cyan'], radius: 0.5, max: 400 },
  confetti: { count: [20, 30], life: [1.5, 3], speed: [3, 8], gravity: 6, drag: 0.6, size: [2, 2], colors: ['red', 'sand', 'cyan', 'lime', 'white', 'orange'], max: 600 },
  firework: { count: [30, 40], life: [0.8, 1.4], speed: [6, 14], gravity: 6, drag: 1.3, size: [2, 1], colors: ['white', 'sand', 'orange', 'red'], max: 600 },
};
function drawBrief(sc, ui) {
  const t = sc.testDef, W = ui.W, H = ui.H; ui.panel(W / 2 - 170, 40, 340, H - 100, 'ink', 'slate');
  ui.text(W / 2 - 160, 48, t.id + '  ' + t.title, { scale: 2, color: 'sand' }); ui.text(W / 2 - 160, 68, CAR_INFO[sc.run.carId].name, { color: 'sky' });
  ui.prose(W / 2 - 160, 84, t.brief, { n: 52, max: 5, color: 'white' }); ui.prose(W / 2 - 160, 140, 'TIP: ' + t.tip, { n: 52, max: 3, color: 'mist' });
  const m = App.medals?.(t.id); if (m) ui.text(W / 2 - 160, 175, `GOLD ${fmtTime(m.gold)}  SILVER ${fmtTime(m.silver)}  BRONZE ${fmtTime(m.bronze)}`, { color: 'sand' });
  ui.prompts([['confirm', 'BEGIN'], ['back', 'BACK']]); ui.item('brief', 0, 0, 1, 1);
}
