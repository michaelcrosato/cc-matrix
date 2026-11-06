// RaceScene: everything driven. A race, a licence test, a test drive, a time trial, an attract clip, a couch duel, a hub round.
import { buildModel, setLookLayer, THREE, Trail } from '../../pixel-engine.js';
import { coneDef } from '../models/props.js';
import { RaceSim, trackPoint, wrapS } from '../sim/race.js';
import { DemoBrain, Judge, legCount, placeS, testSetup } from '../sim/licence.js';
import { F_BRAKE } from '../sim/replaydata.js';
import { GhostTrace, ghostSample } from '../sim/replaydata.js';
import { buildWorld } from '../render/world.js';
import { CarView } from '../render/carview.js';
import { ChaseCam } from '../render/camera.js';
import { TvDirector } from '../render/director.js';
import { PitCrew } from '../render/pitcrew.js';
import { flagProp, makePerson } from '../render/people.js';
import { buildDrivingLine } from '../render/trackmesh.js';
import { GeoBatch } from '../render/geo.js';
import { RaceHud } from '../ui/racehud.js';
import { LINES } from '../data/text.js';
import { drawGlyph, glyphWidth, specFor } from '../ui/glyphs.js';
const { Group, Vector3 } = THREE;
const P = new Vector3();
export class RaceScene {
  constructor(app, setup, opts = {}) {
    this.name = 'race'; this.app = app; this.data = setup; this.role = opts.role ?? 'main'; this.sim = opts.sim ?? null; this.viewPlayer = opts.viewPlayer ?? 0; this.run = opts.run ?? null; this.opts = opts; this.compact = !!opts.compact;
    this.target = new Vector3(); this.paused = false; this.views = []; this.t = 0; this.tvMode = false; this.ended = false; this.afterT = null; this.recoverT = 0; this.cheer = 0; this.hudHidden = false; this.upL = [false, false]; this.downL = [false, false]; this.drv = [null, null]; this.frozen = false; this.fireworkT = 0; this.stepFrames = 0; this.legTimes = []; this.leg = setup.leg ?? 0; this.ghost = null; this.trace = null; this.pose = {}; this.camTarget = null;
  }
  ready() { if (this.role === 'main' && typeof window !== 'undefined') window.__GAME__ = this.app.handle(); }
  async setup(ctx) {
    const app = this.app; if (this.role === 'main') { app.enterScene(ctx, this); app.ui.clear(); app.ui.subtitle = null; app.actions.resetDriver(); }
    const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix();
    this.cam = cam;
    if (!this.sim) this.sim = new RaceSim({ ...this.data, env: app.env });
    const sim = this.sim, tr = sim.tr, hour = this.data.hour ?? 12, focusE = this.focusEntry();
    this.world = buildWorld(ctx, tr, sim.line, { hour, hourEnd: this.data.hourEnd ?? null, rain: !!this.data.rain, speeds: focusE?.speeds });
    this.buildCars(ctx);
    this.chase = new ChaseCam(cam);
    this.chase.mode = app.options.camMode ?? 0;
    if (app.devSliders) { this.chase.distance = app.devSliders.chase; this.chase.fovBase = app.devSliders.fov; }
    this.tv = new TvDirector(tr, this.world.field, (this.data.seed ?? 1) + 11);
    this.hud = new RaceHud(sim, this.compact);
    if (sim.tr.pit && this.role === 'main' && (this.data.laps > 3 || this.data.kind === 'attract')) { this.crew = new PitCrew(ctx, tr); await this.crew.build(); }
    this.line = focusE ? buildDrivingLine(tr, sim.line, focusE.speeds) : null;
    if (this.line) { this.line.visible = false; ctx.scene.add(this.line); }
    // Licence test: the judge, the box, the cones.
    if (this.data.test) { this.setupTest(ctx); }
    // Lights at dusk and night.
    this.night = this.world.night;
    if (this.night > 0.15) {
      this.beam = new THREE.Object3D(); ctx.scene.add(this.beam);
      this.beamL = ctx.lights.request({ follow: this.beam, color: 0xfff0c0, intensity: 16, radius: 34, priority: 8, decay: 1 });
      this.tail = new THREE.Object3D(); ctx.scene.add(this.tail);
      ctx.lights.request({ follow: this.tail, color: 0xff3020, intensity: 4, radius: 8, priority: 3 });
    }
    // Marshals at the line. Not in a hub round: its build has to be quick.
    if (this.role === 'main' && this.data.kind !== 'hub' && this.data.kind !== 'licence') {
      this.marshals = [];
      for (const [s0, colour] of [[26, 'red'], [-40, 'sand']]) { const m = await makePerson(ctx, 'marshal'), pt = trackPoint(tr, s0, -(tr.width[0] / 2 + Math.min(tr.wallL[0], 2.5))); m.object.position.set(pt.x, pt.y, pt.z); m.object.rotation.y = pt.yaw + Math.PI / 2; m.play('MarshalFlag', { fade: 0 }); m.attachProp('HandR', flagProp(colour)); ctx.scene.add(m.object); this.marshals.push(m); }
    }
    // Taillight trails at night.
    if (this.night > 0.4) { this.trails = sim.cars.map(() => { const q = new Trail({ width: 0.2, life: 0.4, color: 0xff3020, tail: 0x5d275d, points: 18, minStep: 0.6 }); ctx.scene.add(q); return q; }); }
    // Ghosts in time trial.
    if (this.data.kind === 'timetrial') { this.trace = new GhostTrace(); this.traceStart = null; }
    if (this.opts.ghostData) this.setGhost(ctx, this.opts.ghostData);
    this.world.setLights(0, false);
    app.mix.clearCars();
    const song = this.songFor();
    if (this.role === 'main') { if (app.options.raceMusic !== false && song) app.mix.music(song); else app.mix.music(null); }
    this.opts.onReady?.(this, ctx);
  }
  songFor() { const d = this.data, t = d.track; if (d.kind === 'licence') return 'exam'; if (t === 'redclay') return 'clay'; if ((d.hour ?? 12) >= 18 || (d.hour ?? 12) < 6) return 'city'; return 'apex'; }
  focusEntry() { const s = this.sim; return s.cars.find((e) => e.player === this.viewPlayer) ?? s.cars[s.cars.length - 1] ?? null; }
  buildCars(ctx) {
    for (const v of this.views) v.dispose();
    this.views = this.sim.cars.map((e) => { const v = new CarView(e.carId, { install: e.install, paint: e.paint ?? undefined }); v.setDirt(e.dirt); ctx.scene.add(v.object); return v; });
  }
  setGhost(ctx, data) {
    if (this.ghost) this.ghost.view.dispose();
    const view = new CarView(data.carId, { ghost: 'sky' }); ctx.scene.add(view.object); this.ghost = { view, data };
  }
  setupTest(ctx) {
    const app = this.app, sim = this.sim, tr = sim.tr, test = this.opts.test;
    this.test = test; this.judge = new Judge(test, sim);
    this.judge.step(0); this.judge.base = this.opts.legBase ?? 0;
    if (test.box) { // The white box, painted on the road.
      const b = new GeoBatch(), s0 = test.box.s - test.box.len / 2, s1 = test.box.s + test.box.len / 2, w = 5, Q = (s, t) => { const p = trackPoint(tr, s, t); return [p.x, p.y + 0.07, p.z]; };
      const edge = (s, t0, t1) => b.quad(Q(s, t0), Q(s, t1), Q(s + 0.8, t1), Q(s + 0.8, t0), 'white'); edge(s0, -w, w); edge(s1 - 0.8, -w, w); for (let s = s0; s < s1 - 2; s += 2) { const n = s + 2; b.quad(Q(s, -w), Q(s, -w + 0.5), Q(n, -w + 0.5), Q(n, -w), 'white'); b.quad(Q(s, w - 0.5), Q(s, w), Q(n, w), Q(n, w - 0.5), 'white'); }
      for (let s = s0 - 60; s < s0; s += 8) { b.quad(Q(s, -w), Q(s, -w + 0.3), Q(s + 4, -w + 0.3), Q(s + 4, -w), 'sand'); b.quad(Q(s, w - 0.3), Q(s, w), Q(s + 4, w), Q(s + 4, w - 0.3), 'sand'); }
      ctx.scene.add(b.mesh({ glow: true }));
    }
    if (this.judge.cones) {
      this.cones = this.judge.cones.map((k) => { const m = buildModel(coneDef, {}).object; m.position.set(k.x, k.y, k.z); setLookLayer(m, 'actors'); for (const q of m.children) if (q.isMesh) q.castShadow = true; ctx.scene.add(m); return { m, k, vy: 0, vx: 0, vz: 0, a: 0 }; });
    }
    // The end of the section: a banner across the road.
    if (test.end) { const s = placeS(tr, test.end), l = trackPoint(tr, s, -tr.width[0] / 2 - 2), r = trackPoint(tr, s, tr.width[0] / 2 + 2), b = new GeoBatch(); b.box(l.x, l.y, l.z, 0.4, 5, 0.4, 'white'); b.box(r.x, r.y, r.z, 0.4, 5, 0.4, 'white'); b.beam([l.x, l.y + 4.6, l.z], [r.x, r.y + 4.6, r.z], 0.3, 0.8, 'red'); ctx.scene.add(b.mesh({ cast: true, receive: false })); }
    if (this.opts.demo) {
      const e = sim.cars[0]; e.autoDrive = true; const brain = new DemoBrain(test, sim, this.judge, { skill: 0.97 });
      sim.aiInput = () => brain.input();
      this.hud.flash('DEMONSTRATION', 99, false);
      app.ui.say('arai', LINES.arai.demo);
    }
    if (app.options.assists.line || this.opts.showLine) this.lineOn = true;
    void legCount;
  }
  // ---- fixed step ----
  fixedUpdate(ctx, dt) {
    const app = this.app; app.actions.latch(ctx);
    if (this.role !== 'main') return;
    this.world?.fixedUpdate(dt);
    if (!this.sim || !this.world) return;
    if (this.paused && this.stepFrames <= 0) return;
    if (this.stepFrames > 0) this.stepFrames--;
    const sim = this.sim;
    for (const e of sim.cars) { const c = e.c; e.px = c.x; e.py = c.y; e.pz = c.z; e.pyaw = c.yaw; }
    const inputs = [];
    for (const e of sim.players) {
      const d = app.driverOverride?.(e, this.drv[e.player], sim) ?? this.drv[e.player]; if (!d) { inputs[e.player] = {}; continue; }
      inputs[e.player] = { steer: d.steer, throttle: d.throttle, brake: d.brake, handbrake: d.handbrake, up: this.upL[e.player], down: this.downL[e.player] };
      this.upL[e.player] = false; this.downL[e.player] = false;
    }
    this.opts.beforeStep?.(sim, inputs, dt);
    sim.step(inputs);
    if (this.judge) this.judge.step(1 / 60);
    if (this.trace) this.stepTrace(sim);
    if (this.opts.afterStep) this.opts.afterStep(sim, dt, this);
  }
  stepTrace(sim) { // Time trial: a ghost of this lap at 10 Hz.
    const e = sim.cars[0], c = e.c;
    if (e.lap === this.traceLap) { if (sim.frame % 6 === 0) this.trace.add(c.x, c.y, c.z, c.yaw); }
    else { const done = this.trace, doneLap = this.traceLap; this.trace = new GhostTrace(); this.traceLap = e.lap; this.traceStart = sim.time; if (doneLap && e.lastLap) this.app.lapDone?.(this, done, e.lastLap); }
  }
  // ---- per frame ----
  update(ctx, dt) {
    const app = this.app, a = app.actions; a.setDt(dt); a.latch(ctx);
    if (!this.sim || !this.world || !this.chase) { a.send(ctx); return; }
    this.t += dt;
    const sim = this.sim, main = this.role === 'main', focus = this.focusE ?? this.focusEntry();
    this.focusE = focus;
    // Inputs
    if (main) for (const e of sim.players) { const d = a.drive(ctx, e.player, dt); this.drv[e.player] = d; if (d.up) this.upL[e.player] = true; if (d.down) this.downL[e.player] = true; }
    if (main && !this.paused) { this.handleDriverButtons(ctx, focus, dt); this.handleEvents(ctx); }
    // Lights on the gantry
    if (sim.phase === 'grid') this.world.setLights(sim.lights, false); else if (sim.time - (sim.greenAt ?? 0) < 4 && sim.greenAt !== null) this.world.setLights(0, true); else this.world.setLights(0, false);
    if (this.data.hourEnd !== undefined && this.data.hourEnd !== null) this.world.setHourIf(sim.hourNow);
    // Cars
    this.drawCars(ctx, dt);
    // Camera
    this.drawCamera(ctx, dt, focus);
    // World
    this.cheer = Math.max(0, this.cheer - dt);
    this.world.update(dt, ctx.time, this.cheer > 0, this.target, focus?.c.loc.s);
    this.crew?.update(dt, focus ? this.views[focus.i] : null);
    if (this.marshals) for (const m of this.marshals) m.update(dt);
    if (this.line) this.line.visible = !!(app.options.assists.line || this.lineOn);
    this.drawParticles(ctx, dt);
    if (main) this.drawAudio(ctx, dt, focus);
    // HUD
    ctx.hud.clear();
    if (!this.hudHidden) this.drawHud(ctx, dt, focus);
    if (main) { this.flow(ctx, dt, focus); app.ui.frame(ctx, dt); app.afterFrame(ctx, dt); }
    this.opts.onFrame?.(this, ctx, dt);
    a.send(ctx);
  }
  handleDriverButtons(ctx, focus, dt) {
    const app = this.app, a = app.actions, sim = this.sim;
    for (const e of sim.players) {
      const d = this.drv[e.player]; if (!d) continue;
      if (d.cam) { if (e.player === this.viewPlayer) { this.chase.cycle(); app.options.camMode = this.chase.mode; } else app.couchScene?.chase?.cycle(); app.mix.sfx('tick'); }
      // Recovery: hold for 1 s when off the road or stopped.
      const stoppedOrOff = (!e.c.onTrack || Math.abs(e.c.u) < 2) && !e.pit;
      if (d.recover && stoppedOrOff && !e.finished) { e.recT = (e.recT || (d.triHold > 0 ? 0.4 : 0)) + dt; if (e.recT >= 1) { e.recT = 0; sim.recover(e.i); app.mix.sfx('whirr'); } } else e.recT = 0;
    }
    // Pause. Hub rounds open a settings menu that does not pause.
    if (focus?.pit?.phase === 'box' && focus.pit.tyres > 0 && !focus.pit.skipTyres && a.pressed('back') && !app.ui.top) { sim.skipTyres(focus.i); app.mix.sfx('tick'); }
    else if (a.pressed('pause') && !app.ui.top && !app.session) app.openPause(this);
  }
  handleEvents(ctx) {
    const app = this.app, mix = app.mix, sim = this.sim, focus = this.focusE, E = ctx.engine;
    for (const ev of sim.drainEvents()) {
      const e = ev.car >= 0 ? sim.cars[ev.car] : null, mine = e && e.player !== null, near = e === focus;
      switch (ev.type) {
        case 'shift': if (mine) { mix.sfx(ev.up ? 'gear' : 'gearDown'); app.actions.rumble(e.player, 0.1, 0.25, 50); if (e.p.sportExhaust) ctx.particles.burst('exhaustPop', this.tailPipe(e)); } break;
        case 'kerb': if (near) { mix.count('kerb'); E.shake.add(e.p.lowRide ? 0.16 : 0.07); app.actions.rumble(e.player ?? 0, 0.12, 0.3, 70); this.kerbT = 0.2; if (e.p.lowRide) this.views[e.i].heave = 0.05; } break;
        case 'wallHit': { const v = ev.v; if (near || mine) { mix.sfx(v > 12 ? 'thumpBig' : 'thump', { volume: Math.min(1, 0.4 + v / 20) }); E.shake.add(Math.min(0.75, v * 0.05)); if (e.player !== null) app.actions.rumble(e.player, Math.min(1, v / 14), 0.5, 180); if (v > 22) E.hitstop(0.05); } ctx.particles.burst('sparks', [e.c.x, e.c.y + 0.5, e.c.z]); break; }
        case 'carHit': if (near || mine) { mix.sfx('carHit', { volume: Math.min(1, 0.3 + ev.v / 12) }); E.shake.add(Math.min(0.4, ev.v * 0.04)); ctx.particles.burst('sparks', [e.c.x, e.c.y + 0.5, e.c.z], { count: 3 }); if (e.player !== null) app.actions.rumble(e.player, 0.5, 0.5, 120); } break;
        case 'lockup': if (near) { mix.sfx('lockChirp'); if (e.player !== null) app.actions.rumble(e.player, 0.25, 0.6, 140); } break;
        case 'land': if (near) { mix.sfx('landing', { volume: Math.min(1, 0.4 + ev.air) }); E.shake.add(Math.min(0.5, ev.air * 0.5)); ctx.particles.burst(sim.tr.surface === 'dirt' ? 'dirtDust' : 'tyreSmoke', [e.c.x, e.c.y + 0.3, e.c.z], { count: 10 }); this.views[e.i].heave = -0.09; } break;
        case 'lap': if (mine && ev.time !== null) { const best = e.bestLap === ev.time; mix.sfx(best ? 'bestLap' : 'lapChime'); this.hud.flash(`LAP ${app.fmt(ev.time)}`, 3); if (best) app.onBestLap?.(this, e, ev.time); } break;
        case 'flag':
          if (ev.kind === 'lights') { if (ev.n > 0) mix.sfx('beep'); }
          else if (ev.kind === 'green') { mix.sfx('beepGo'); E.screen.flash('white', { duration: 0.08 }); this.hud.flash('GREEN', 1.6, true); this.cheer = Math.max(this.cheer, 4); }
          else if (ev.kind === 'finalLap') { this.hud.flash('FINAL LAP', 3); mix.sfx('sting'); }
          else if (ev.kind === 'finish' && ev.own) { mix.sfx('flag'); this.hud.flash('FINISH', 3, true); this.cheer = 6; if (!this.tvMode && !this.data.test) this.startTv(); }
          break;
        case 'pitIn': if (near) { mix.sfx('whirr'); } break;
        case 'pitBox': if (near) { this.crew?.start(e); mix.sfx('wheelGun'); this.wheelGunT = 0.8; app.ui.say('benno', LINES.benno.pit[Math.floor(sim.time) % LINES.benno.pit.length], 3); } break;
        case 'pitGo': if (near) { this.crew?.go(); mix.sfx('beep'); this.hud.flash(`STOP ${ev.time.toFixed(1)} S`, 3); } break;
        case 'recover': if (near) { ctx.particles.burst('smoke', [e.c.x, e.c.y + 0.5, e.c.z], { count: 10 }); } break;
        case 'cone': mix.sfx('coneHit'); this.hud.flash(ev.hit ? 'CONE HIT: +1 S' : 'WRONG SIDE: +1 S', 1.6); break;
        case 'testPass': mix.sfx('flag'); break;
        case 'testFail': mix.sfx('denied'); this.hud.flash(ev.reason, 4); break;
        default: break;
      }
    }
    if (this.wheelGunT > 0) { this.wheelGunT -= ctx.engine.time ? 0.016 : 0; if (Math.floor(this.wheelGunT * 8) !== Math.floor((this.wheelGunT + 0.016) * 8)) mix.sfx('wheelGun', { volume: 0.5 }); }
  }
  tailPipe(e) { const c = e.c, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), back = e.p.b + 0.7; return [c.x - sn * back, c.y + 0.4, c.z - cs * back]; }
  drawCars(ctx, dt) {
    const sim = this.sim, alpha = this.paused ? 1 : (ctx.physics.alpha ?? 1), tr = sim.tr;
    for (const e of sim.cars) {
      const c = e.c, v = this.views[e.i]; if (e.hidden) { v.object.visible = false; continue; }
      const x = e.px === undefined ? c.x : e.px + (c.x - e.px) * alpha, y = e.py === undefined ? c.y : e.py + (c.y - e.py) * alpha, z = e.pz === undefined ? c.z : e.pz + (c.z - e.pz) * alpha; let dy = c.yaw - (e.pyaw ?? c.yaw); while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; const yaw = c.yaw - dy * (1 - alpha);
      const i = c.loc.i, dir = Math.sin(yaw) * tr.tx[i] + Math.cos(yaw) * tr.tz[i] >= 0 ? 1 : -1, slope = tr.slope[i] * dir, bank = tr.bank[i] * dir;
      e.vPitch = (e.vPitch ?? 0) + (-Math.atan(slope) - (e.vPitch ?? 0)) * Math.min(1, dt * 10); e.vRoll = (e.vRoll ?? 0) + (bank - (e.vRoll ?? 0)) * Math.min(1, dt * 10);
      v.heave += (Math.max(-0.08, Math.min(0.08, -c.vy * 0.016)) - v.heave) * Math.min(1, dt * 9);
      v.update(dt, x, y, z, yaw, e.vPitch, e.vRoll, -c.ax * 0.004, -c.ay * 0.008, c.delta, c.u, c.airborne);
      v.setBrake((e.inp?.brake ?? 0) > 0.05 || e.pit?.phase === 'in');
      v.setHead(this.night > 0.2);
      if (e.dirt !== v.dirt && sim.tr.surface === 'dirt') v.setDirt(e.dirt);
      if (Math.abs(c.u) < 0.5 && !e.pit) v.shake = Math.max(0, Math.min(0.004, c.rpm / 300000)); else if (c.rpm > c.p.redline - 30) v.shake = 0.006; else v.shake = 0;
    }
    // Ghost car of the best lap.
    if (this.ghost && this.traceStart !== null && this.traceStart !== undefined) { const t = sim.time - this.traceStart, s = ghostSample(this.ghost.data, t, this.pose), g = this.ghost.view; g.object.visible = !s.done; if (!s.done) g.update(dt, s.x, s.y, s.z, s.yaw, 0, 0, 0, 0, 0, 30); }
    if (this.cones) for (const k of this.cones) { if (k.k.hit && k.a < 2) { if (k.a === 0) { const e = sim.cars[0].c; k.vx = e.vx * 0.5; k.vz = e.vz * 0.5; k.vy = 5; } k.a += dt; k.vy -= 14 * dt; k.m.position.x += k.vx * dt; k.m.position.z += k.vz * dt; k.m.position.y = Math.max(k.k.y, k.m.position.y + k.vy * dt); k.m.rotation.x += dt * 9; } }
    if (this.trails) { const t = ctx.time; sim.cars.forEach((e, k) => { const c = e.c, q = this.trails[k]; if (Math.hypot(c.vx, c.vz) > 6) { P.set(c.x - Math.sin(c.yaw) * (c.p.b + 0.7), c.y + 0.7, c.z - Math.cos(c.yaw) * (c.p.b + 0.7)); q.push(P, t); } q.update(t, this.cam); }); }
    // Light rig follows the player's car.
    const f = this.focusE;
    if (f && this.beam) { const c = f.c, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw); this.beam.position.set(c.x + sn * 12, c.y + 1.6, c.z + cs * 12); this.tail.position.set(c.x - sn * 3, c.y + 0.8, c.z - cs * 3); }
  }
  startTv() { this.tvMode = true; this.tv.force(); }
  drawCamera(ctx, dt, focus) {
    if (!focus) return;
    const c = focus.c, app = this.app, d = this.drv[this.viewPlayer] ?? {}, cam = this.cam, tr = this.sim.tr, i = c.loc.i, dir = Math.sin(c.yaw) * tr.tx[i] + Math.cos(c.yaw) * tr.tz[i] >= 0 ? 1 : -1;
    const devCam = app.dev?.freeCam;
    if (devCam) { app.dev.driveFreeCam(ctx, dt, cam); this.target.copy(cam.position); return; }
    if (this.camOverride) { this.camOverride(cam, dt); this.target.set(c.x, c.y + 0.9, c.z); return; }
    if (this.tvMode) this.tv.update(dt, { x: c.x, y: c.y, z: c.z, s: c.loc.s }, cam, { busy: c.sliding });
    else this.chase.update(dt, { x: this.views[focus.i].object.position.x, y: this.views[focus.i].object.position.y, z: this.views[focus.i].object.position.z, yaw: this.views[focus.i].object.rotation.y, u: c.u }, { lookBack: !!d.lookBack, lookX: d.lookX2 ?? 0, lookY: d.lookY2 ?? 0, slope: tr.slope[i] * dir });
    this.target.set(c.x, c.y + 0.9, c.z);
    this.views[focus.i].object.visible = !(this.chase.mode === 2 && !this.tvMode && !d.lookBack);
  }
  drawParticles(ctx, dt) {
    const sim = this.sim, cam = this.cam, P = ctx.particles, tr = sim.tr, wet = !!this.data.rain;
    this.frameN = (this.frameN ?? 0) + 1; const every2 = this.frameN % 2 === 0;
    for (const e of sim.cars) {
      const c = e.c, u = Math.hypot(c.vx, c.vz); if (u < 3) continue;
      const dx = c.x - cam.position.x, dz = c.z - cam.position.z; if (dx * dx + dz * dz > 22000) continue;
      const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), bx = c.x - sn * c.p.b, bz = c.z - cs * c.p.b, ry = c.y + 0.15, rx = -cs * c.p.T / 2, rz = sn * c.p.T / 2;
      const dirt = c.surface === 'dirt' || c.surface === 'gravel', grass = c.surface === 'grass', hard = c.sliding || c.locked || c.spinning;
      if (hard && !dirt && !grass && every2) { P.burst(wet ? 'rainSpray' : 'tyreSmoke', [bx + rx, ry, bz + rz]); P.burst(wet ? 'rainSpray' : 'tyreSmoke', [bx - rx, ry, bz - rz]); }
      if (hard && !dirt && !grass) { this.world.skids.lay(`${e.i}L`, bx + rx, c.y, bz + rz); this.world.skids.lay(`${e.i}R`, bx - rx, c.y, bz - rz); } else { this.world.skids.lift(`${e.i}L`); this.world.skids.lift(`${e.i}R`); }
      if (dirt && u > 5 && every2) { P.burst('dirtDust', [bx + rx, ry, bz + rz], { count: 1 + (hard ? 1 : 0) }); P.burst('dirtDust', [bx - rx, ry, bz - rz], { count: 1 }); if (hard || c.surface === 'gravel') P.burst('gravel', [bx, ry, bz], { direction: [-c.vx * 0.2, 1, -c.vz * 0.2] }); }
      if (grass && every2) P.burst('gravel', [bx, ry, bz], { direction: [-c.vx * 0.2, 1, -c.vz * 0.2], colors: ['green', 'lime', 'teal'] });
      if (wet && u > 14 && !dirt && every2) { P.burst('rainSpray', [bx + rx, ry, bz + rz], { direction: [-c.vx * 0.05, 1, -c.vz * 0.05] }); P.burst('rainSpray', [bx - rx, ry, bz - rz], { direction: [-c.vx * 0.05, 1, -c.vz * 0.05] }); }
      if (tr.id === 'saltline' && (c.surface === 'apron') && every2) P.burst('saltDust', [bx, ry, bz]);
    }
    // Fireworks when the race is won at Harbour Lights.
    if (this.fireworksOn && tr.id === 'harbour') { this.fireworkT -= dt; if (this.fireworkT <= 0) { this.fireworkT = 0.5 + (Math.sin(ctx.time * 7) + 1) * 0.3; const f = this.target, k = Math.floor(ctx.time * 3) % 3, name = ['firework', 'firework2', 'firework3'][k]; P.burst(name, [f.x + Math.sin(ctx.time * 3.7) * 80, f.y + 42 + Math.sin(ctx.time) * 10, f.z + Math.cos(ctx.time * 2.1) * 80]); this.app.mix.sfx('firework', { volume: 0.4 }); } }
  }
  drawAudio(ctx, dt, focus) {
    const app = this.app, mix = app.mix, sim = this.sim, cam = this.cam, tr = sim.tr;
    if (this.paused || !focus) { mix.quiet(); return; }
    const list = [], c0 = focus.c, rightX = cam.matrixWorld.elements[0], rightZ = cam.matrixWorld.elements[2], listener = cam.position;
    const players = sim.players.filter((e) => e.player !== null), couch = this.data.kind === 'couch';
    const entry = (e, gain, pan) => ({ key: `${e.i}:${e.carId}`, carId: e.carId, p: e.p, rpm: e.c.rpm, throttle: e.inp?.throttle ?? 0.1, spool: e.c.spool, gain, pan });
    const camD = (e) => Math.hypot(e.c.x - listener.x, e.c.z - listener.z);
    if (couch) players.forEach((e, k) => list.push(entry(e, 0.75, k === 0 ? -0.6 : 0.6)));
    else list.push(entry(focus, this.tvMode ? Math.min(1, 40 / Math.max(10, camD(focus))) : 1, 0));
    mix.engines(list, dt);
    // The nearest three others: looping voices in the world, spatialized, pitched by rpm.
    const others = sim.cars.filter((e) => !list.some((l) => l.key === `${e.i}:${e.carId}`)).map((e) => [camD(e), e]).sort((a, b) => a[0] - b[0]).slice(0, 3);
    if (!this.ears) this.ears = { position: new Vector3(), right: new Vector3() };
    this.ears.position.copy(listener); this.ears.right.set(rightX, cam.matrixWorld.elements[1], rightZ);
    mix.others(others.map(([, e]) => ({ x: e.c.x, y: e.c.y, z: e.c.z, rpm: e.c.rpm })), this.ears);
    const u = Math.abs(c0.u), dirt = c0.surface === 'dirt' || c0.surface === 'gravel' || c0.surface === 'grass';
    const useMax = Math.max(c0.use[0], c0.use[1], c0.use[2], c0.use[3]);
    const tyre = !dirt && u > 4 ? Math.max(0, Math.min(1, (useMax - 0.85) * 1.5)) * (c0.sliding || c0.locked ? 1 : 0.5) : 0;
    if (tyre > 0.3 && !this.tyreCounted) { mix.count('tyre'); this.tyreCounted = true; } else if (tyre < 0.1) this.tyreCounted = false;
    this.kerbT = Math.max(0, (this.kerbT ?? 0) - dt);
    const onKerb = c0.surface === 'kerb' && u > 8;
    const stand = this.world.dress.tunnel ? 0 : Math.max(0, 1 - Math.abs(((c0.loc.s + tr.length / 2) % tr.length) - tr.length / 2) / 340);
    mix.world({ tyre, tyrePitch: Math.min(1, u / 60), wind: Math.min(1, (u * u) / 6000) * (focus.slip ? 1.35 : 1), gravel: dirt ? Math.min(1, u / 30) : 0, rain: this.data.rain ? 1 : 0, kerb: onKerb ? 1 : 0, kerbRate: u, crowd: stand * (0.5 + (this.cheer > 0 ? 0.5 : 0)) });
    if (focus.inp?.handbrake && !this.hbDown) { mix.sfx('ratchet'); this.hbDown = true; } else if (!focus.inp?.handbrake) this.hbDown = false;
  }
  drawHud(ctx, dt, focus) {
    const app = this.app, ui = app.ui; if (!focus) return;
    if (this.role !== 'main') { ui.hud = ctx.hud; ui.w = ctx.hud.width; ui.h = ctx.hud.height; ui.cx = ui.w / 2; }
    else { ui.hud = ctx.hud; ui.w = ctx.hud.width; ui.h = ctx.hud.height; ui.cx = ui.w / 2; }
    if (this.opts.hideHud) return;
    const sim = this.sim, rival = this.data.kind === 'rally' ? sim.cars.find((e) => e !== focus) : null, d = this.drv[focus.player ?? 0];
    const hudOpts = { units: app.options.units === 'mph' ? 'mph' : 'kmh', fuel: sim.laps > 3 || this.data.kind === 'hub', dev: app.devActive(), test: this.judge, rival, recover: (focus.recT ?? 0), legText: this.test?.legs ? `CAR ${this.leg + 1}/${this.test.legs.length}` : null };
    void d;
    this.hud.draw(ui, focus, dt, hudOpts);
    this.opts.drawExtra?.(this, ui, dt);
    // The controls, for the device in use, for the first seconds of a drive. They swap the moment the player switches.
    if (this.role === 'main' && !this.opts.attract && !this.opts.demo && !ui.top) {
      const dev = app.actions.lastDevice, xbox = app.options.glyphs === 'xbox', row = (list, y) => { const w = list.reduce((v, x) => v + (typeof x === 'string' ? ctx.hud.measure(x).width : glyphWidth(ctx.hud, specFor(x.a, dev), xbox)) + 4, -4); let px = Math.round(ui.cx - w / 2); ui.rect(px - 4, y - 2, w + 8, 15, 'ink'); for (const x of list) { if (typeof x === 'string') { ui.text(px, y + 2, x, { color: 'white' }); px += ctx.hud.measure(x).width + 4; } else px += drawGlyph(ctx.hud, px, y, specFor(x.a, dev), xbox) + 4; } };
      if (this.t < 8 && ui.w >= 300) row([{ a: 'steer' }, 'STEER', { a: 'throttle' }, 'GO', { a: 'brake' }, 'BRAKE', { a: 'pause' }, 'PAUSE'], ui.h - 62);
      if (!focus.pit && !focus.finished && !focus.c.onTrack && Math.abs(focus.c.u) < 8) row(['HOLD', { a: 'recover' }, 'TO RECOVER'], ui.h - 76);
      if (focus.pit?.phase === 'box' && focus.pit.tyres > 0 && !focus.pit.skipTyres) row([{ a: 'back' }, 'SKIP THE TYRES'], 68);
    }
    if (this.app.dev) this.app.drawOverlays?.(ui, this);
    if (sim.phase === 'grid') { const n = sim.lights, slots = this.data.kind === 'hub' ? 3 : 5; for (let k = 0; k < slots; k++) { const x = Math.round(ui.cx - (slots * 17 - 4) / 2) + k * 17; ui.rect(x, 20, 13, 13, 'ink'); ui.rect(x + 2, 22, 9, 9, k < n ? 'red' : 'night'); } }
    const msgY = ui.w < 420 ? 50 : 22; // on a narrow screen, below the corner panels
    if (sim.phase === 'rolling') ui.text(ui.cx, msgY, 'ROLLING START: HOLD FORMATION', { align: 'center', color: 'sand' });
    if (focus.startDelay > 0 && focus.ownStart === null && sim.phase === 'green') { const left = Math.max(0, focus.startDelay - (sim.time - sim.greenAt)); ui.text(ui.cx, 40, `${Math.ceil(left)}`, { align: 'center', scale: 3, color: 'sand' }); ui.text(ui.cx, msgY, 'YOUR RIVAL HAS STARTED', { align: 'center', color: 'mist' }); }
    if (this.ghost?.view.object.visible) { P.copy(this.ghost.view.object.position); P.y += 1.9; P.project(this.cam); if (P.z < 1 && Math.abs(P.x) < 1 && Math.abs(P.y) < 1) ui.text((P.x + 1) * 0.5 * ui.w, (1 - P.y) * 0.5 * ui.h, 'GHOST', { align: 'center', color: 'sky' }); }
    if (this.data.kind === 'timetrial') ui.text(ui.cx, msgY, this.ghost ? 'PASS THE PAD: BEAT THE GHOST' : 'SET A LAP. IT BECOMES THE GHOST.', { align: 'center', color: 'sand' });
    // A word from the crew when a stop is needed.
    if (sim.laps >= 10 && sim.tr.pit && !focus.finished && !focus.pit) { const wear = (focus.c.wear[0] + focus.c.wear[1] + focus.c.wear[2] + focus.c.wear[3]) / 4; if (wear < 0.4 || focus.c.fuel < 0.25) { ui.text(ui.cx, msgY, ui.w < 420 ? 'BOX THIS LAP' : 'BOX THIS LAP: KEEP RIGHT AT THE PIT', { align: 'center', color: Math.floor(ui.time * 2) % 2 ? 'sand' : 'white' }); } }
  }
  // The end of a drive.
  flow(ctx, dt, focus) {
    const app = this.app, sim = this.sim;
    if (this.ended || this.opts.attract) return;
    if (this.judge) { if (this.judge.status !== 'running') { this.afterT ??= 1.6; this.afterT -= dt; if (this.afterT <= 0) { this.ended = true; app.onTestFinished(this); } } return; }
    if (sim.done) { this.afterT ??= this.data.kind === 'testdrive' ? 0.8 : 3; this.afterT -= dt; if (this.afterT <= 0) { this.ended = true; app.onRaceFinished(this); } }
    void focus;
  }
  cameraTarget() { return this.target; }
  status() {
    const s = this.sim; if (!s) return 'race loading';
    const e = this.focusE ?? s.cars[0];
    if (this.judge) return `licence ${this.test.id} ${this.judge.status} ${this.judge.total.toFixed(2)}`;
    return `race ${this.data.track} lap ${Math.max(0, e.lap)}/${s.laps} p${e.pos ?? 1}/${s.cars.length} ${s.time.toFixed(1)} ${s.phase}`;
  }
  fingerprint() { return this.sim?.fingerprint() ?? ''; }
  dispose() { this.app.mix.clearCars(); if (this.app.scene === this) this.app.scene = null; }
}
void F_BRAKE; void wrapS; void Group; void testSetup;
