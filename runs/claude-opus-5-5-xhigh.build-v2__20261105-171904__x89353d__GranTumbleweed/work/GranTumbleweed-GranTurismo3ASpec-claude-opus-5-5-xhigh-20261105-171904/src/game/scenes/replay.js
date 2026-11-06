// ReplayScene: plays recorded poses with the replay director. Replays never re-simulate.
import { THREE } from '../../pixel-engine.js';
import { loadTrack, carProfile } from '../sim/race.js';
import { tunedParams } from '../sim/tuning.js';
import { buildWorld } from '../render/world.js';
import { CarView } from '../render/carview.js';
import { TvDirector } from '../render/director.js';
import { CAM_MODES, ChaseCam } from '../render/camera.js';
import { F_AIR, F_BRAKE, F_LOCK, F_SLIDE } from '../sim/replaydata.js';
import { LINES } from '../data/text.js';
import { CAR_INFO } from '../data/cars.js';
const { Vector3 } = THREE;
const MODES = ['DIRECTOR', 'CHASE', 'BONNET', 'FREE'];
export class ReplayScene {
  constructor(app, rec, opts = {}) { this.name = 'replay'; this.app = app; this.rec = rec; this.opts = opts; this.t = 0; this.playing = true; this.mode = 0; this.focus = rec.meta.cars.findIndex((c) => c.player === 0); if (this.focus < 0) this.focus = 0; this.views = []; this.target = new Vector3(); this.pose = {}; this.hudOn = true; this.orbit = 0.6; this.pitch = 0.3; this.dist = 9; this.dellT = 4; this.dellI = 0; this.auto = true; this.flags = []; this.home = this.focus; }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = this.app.handle(); }
  async setup(ctx) {
    const app = this.app; app.enterScene(ctx, this); app.ui.clear();
    const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix(); this.cam = cam;
    const m = this.rec.meta, { tr, line } = loadTrack(m.track, { rain: m.rain }); this.tr = tr;
    const f = m.cars[this.focus], p = tunedParams(f.carId, f.install);
    this.world = buildWorld(ctx, tr, line, { hour: m.hour, hourEnd: m.hourEnd, rain: m.rain, speeds: carProfile(tr, line, p, f.carId, JSON.stringify(f.install ?? '')) });
    this.views = m.cars.map((c) => { const v = new CarView(c.carId, { install: c.install, paint: c.paint ?? undefined }); ctx.scene.add(v.object); return v; });
    this.tv = new TvDirector(tr, this.world.field, 23); this.chase = new ChaseCam(cam); this.chase.mode = 0;
    app.mix.clearCars(); app.mix.music(this.opts.song === null ? null : 'longDrive');
    this.night = this.world.night;
    if (this.night > 0.15) { this.beam = new THREE.Object3D(); ctx.scene.add(this.beam); ctx.lights.request({ follow: this.beam, color: 0xfff0c0, intensity: 16, radius: 34, priority: 8, decay: 1 }); }
    app.ui.push(new ReplayHudScreen(app, this));
  }
  fixedUpdate(ctx) { this.app.actions.latch(ctx); }
  update(ctx, dt) {
    const app = this.app, a = app.actions; a.setDt(dt); a.latch(ctx); ctx.hud.clear();
    if (!this.world) { a.send(ctx); return; }
    const slow = a.pads.some((p) => p.buttons[7] > 0.3) || ctx.input.isDown('ShiftLeft'), rate = slow ? 0.25 : 1;
    if (this.playing) { this.t += dt * rate; if (this.t >= this.rec.duration) { if (this.opts.onEnd) { this.opts.onEnd(); } else this.t = 0; } }
    this.t = Math.max(0, Math.min(this.rec.duration - 0.01, this.t));
    const rec = this.rec, s = this.pose;
    for (let i = 0; i < this.views.length; i++) {
      rec.sample(i, this.t, s); const v = this.views[i], f = s.flags;
      v.update(this.playing ? dt * rate : 0, s.x, s.y, s.z, s.yaw, s.pitch, s.roll, 0, 0, s.steer, s.u, !!(f & F_AIR));
      v.setBrake(!!(f & F_BRAKE)); v.setHead(this.night > 0.2);
      this.flags[i] = { x: s.x, y: s.y, z: s.z, yaw: s.yaw, u: s.u, rpm: s.rpm, throttle: s.throttle, flags: f, slide: !!(f & (F_SLIDE | F_LOCK)) && Math.abs(s.u) > 8 };
      const near = (s.x - this.cam.position.x) ** 2 + (s.z - this.cam.position.z) ** 2 < 22000;
      if (near && this.playing && (f & (F_SLIDE | F_LOCK)) && Math.abs(s.u) > 4) { ctx.particles.burst(this.tr.surface === 'dirt' ? 'dirtDust' : 'tyreSmoke', [s.x - Math.sin(s.yaw) * 1.2, s.y + 0.15, s.z - Math.cos(s.yaw) * 1.2]); this.world.skids.lay(`${i}`, s.x - Math.sin(s.yaw) * 1.2, s.y, s.z - Math.cos(s.yaw) * 1.2); } else this.world.skids.lift(`${i}`);
      if (near && this.playing && this.tr.surface === 'dirt' && Math.abs(s.u) > 5 && Math.floor(this.t * 20) !== Math.floor((this.t - dt) * 20)) ctx.particles.burst('dirtDust', [s.x - Math.sin(s.yaw) * 1.2, s.y + 0.15, s.z - Math.cos(s.yaw) * 1.2], { count: 1 });
    }
    // At each cut, when a slide or a battle is on, prefer that car; otherwise back to the car this replay is about.
    if (MODES[this.mode] === 'DIRECTOR' && this.auto && (this.tv.cutT - dt <= 0)) {
      const fl = this.flags, sliding = fl.findIndex((q) => q?.slide); let battle = -1;
      for (let a0 = 0; a0 < fl.length && battle < 0; a0++) for (let b0 = a0 + 1; b0 < fl.length; b0++) if (Math.hypot(fl[a0].x - fl[b0].x, fl[a0].z - fl[b0].z) < 14) { battle = a0; break; }
      this.focus = sliding >= 0 ? sliding : battle >= 0 ? battle : this.home;
    }
    const F = this.fx = this.flags[this.focus]; this.target.set(F.x, F.y + 0.9, F.z);
    if (this.beam) this.beam.position.set(F.x + Math.sin(F.yaw) * 12, F.y + 1.6, F.z + Math.cos(F.yaw) * 12);
    // Camera modes: Director, Chase, Bonnet, Free.
    const name = MODES[this.mode], i0 = this.nearestIdx(F.x, F.z), fv = this.views[this.focus];
    fv.object.visible = name !== 'BONNET';
    if (name === 'DIRECTOR') {
      const anySlide = !!(F.flags & (F_SLIDE | F_LOCK));
      const cut = this.tv.update(dt, { x: F.x, y: F.y, z: F.z, s: i0 * this.tr.ds }, this.cam, { busy: anySlide });
      if (cut && anySlide) this.tv.cutT = Math.min(this.tv.cutT, 5);
    } else if (name === 'FREE') {
      let dx = 0, dy = 0; if (ctx.input.isDown('MouseLeft') || ctx.input.isDown('MouseRight')) { dx = (ctx.input.mouseDelta.x ?? 0) * 0.01; dy = (ctx.input.mouseDelta.y ?? 0) * 0.008; } for (const p of a.pads) { if (Math.abs(p.axes[2]) > 0.15) dx += p.axes[2] * dt * 2; if (Math.abs(p.axes[3]) > 0.15) dy += p.axes[3] * dt * 1.5; }
      this.orbit += dx; this.pitch = Math.max(0.03, Math.min(1.4, this.pitch + dy)); if (a.wheel) this.dist = Math.max(3.5, Math.min(40, this.dist + Math.sign(a.wheel) * 1.2));
      this.cam.position.set(F.x + Math.sin(this.orbit) * Math.cos(this.pitch) * this.dist, F.y + 0.8 + Math.sin(this.pitch) * this.dist, F.z + Math.cos(this.orbit) * Math.cos(this.pitch) * this.dist); this.cam.lookAt(this.target); if (this.cam.fov !== 48) { this.cam.fov = 48; this.cam.updateProjectionMatrix(); }
    } else { this.chase.mode = name === 'BONNET' ? 2 : 0; this.chase.update(dt, F, {}); }
    this.world.update(this.playing ? dt * rate : 0, ctx.time, false, this.target, i0 * this.tr.ds);
    // Sound: the focus car, at a distance that follows the camera.
    if (this.playing) { const d = this.cam.position.distanceTo(this.target), g = name === 'DIRECTOR' ? Math.max(0.12, Math.min(1, 30 / Math.max(10, d))) : 1, car = rec.meta.cars[this.focus]; if (!this.pCache) this.pCache = rec.meta.cars.map((c) => tunedParams(c.carId, c.install)); app.mix.engines([{ key: `${this.focus}:${car.carId}`, carId: car.carId, p: this.pCache[this.focus], rpm: F.rpm, throttle: F.throttle, spool: 0.5, gain: g, pan: 0 }], dt); this.dellT -= dt; if (this.dellT <= 0) { this.dellT = 7 + (this.dellI % 3) * 2; const l = LINES.dell.replay[this.dellI++ % LINES.dell.replay.length]; app.ui.say('dell', l, 4); } } else app.mix.quiet();
    app.ui.frame(ctx, dt); app.afterFrame(ctx, dt);
    a.send(ctx);
  }
  nearestIdx(x, z) { const tr = this.tr; let best = this.lastI ?? 0, bd = Infinity; const c = this.lastI ?? 0; for (let k = -30; k <= 30; k++) { const i = (c + k + tr.N) % tr.N, d = (tr.x[i] - x) ** 2 + (tr.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } if (this.lastI === undefined || bd > 2500) { for (let i = 0; i < tr.N; i += 2) { const d = (tr.x[i] - x) ** 2 + (tr.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } } this.lastI = best; return best; }
  cameraTarget() { return this.target; }
  fingerprint() { return `${this.rec.meta.track}:${this.rec.frames}:${this.t.toFixed(2)}`; }
  status() { return `replay ${this.rec.meta.track} ${this.t.toFixed(1)}/${this.rec.duration.toFixed(1)} ${MODES[this.mode]}`; }
  dispose() { if (this.app.scene === this) this.app.scene = null; this.app.mix.clearCars(); }
}
class ReplayHudScreen {
  constructor(app, scene) { this.id = 'replay'; this.app = app; this.scene = scene; this.inputOff = false; this.noBox = true; }
  draw(ui, dt) {
    const a = this.app.actions, s = this.scene, app = this.app, ctx = app.ctx, N = s.views.length;
    if (a.pressed('confirm')) { s.playing = !s.playing; app.mix.sfx('tick'); }
    const dx = a.moveX(); if (dx) { s.t += dx * 3; app.mix.sfx('tick'); }
    if (a.pressed('tabL')) { s.focus = (s.focus - 1 + N) % N; s.auto = false; s.tv.force(); app.mix.sfx('tick'); }
    if (a.pressed('tabR')) { s.focus = (s.focus + 1) % N; s.auto = false; s.tv.force(); app.mix.sfx('tick'); }
    if (a.pressed('info')) { s.mode = (s.mode + 1) % MODES.length; s.chase.snap(); app.mix.sfx('tick'); }
    if (a.pressed('alt') || ctx.input.wasPressed('KeyH')) s.hudOn = !s.hudOn;
    // Mouse: click a car to focus it.
    if (a.clicked) { const p = ctx.input.pointer, o = new THREE.Vector3(), d = new THREE.Vector3(); ctx.camera.rayAt(p.x, p.y, o, d); let best = 7, bi = -1; s.views.forEach((v, i) => { const q = v.object.position.clone().sub(o), t = q.dot(d), d2 = q.lengthSq() - t * t; if (t > 0 && d2 < best) { best = d2; bi = i; } }); if (bi >= 0) { s.focus = bi; s.auto = false; s.tv.force(); } }
    if (!s.hudOn) return;
    // Bars and a small tag.
    ui.rect(0, 0, ui.w, 12, 'ink'); ui.rect(0, ui.h - 28, ui.w, 28, 'ink');
    ui.text(6, 3, 'REPLAY', { color: Math.floor(ui.time * 2) % 2 ? 'red' : 'white' }); ui.text(50, 3, MODES[s.mode], { color: 'mist' }); const car = s.rec.meta.cars[s.focus]; ui.text(ui.w - 6, 3, `${car.name}  ${CAR_INFO[car.carId].short}`, { align: 'right', color: 'sand' });
    ui.bar(6, ui.h - 25, ui.w - 12, 3, s.t / s.rec.duration, 'sand', 'night');
    ui.text(ui.cx, 3, `${Math.round(Math.abs(s.fx?.u ?? 0) * 3.6)} KM/H`, { align: 'center', color: 'white' });
    if (!s.playing) ui.text(ui.cx, 30, 'PAUSED', { align: 'center', scale: 2, color: 'sand' });
    ui.prompts([['play', s.playing ? 'PAUSE' : 'PLAY'], ['scrub', 'SCRUB'], ['focus', 'CAR'], ['info', 'CAMERA'], ['slow', 'SLOW'], ['alt', 'HIDE'], ['back', 'EXIT']]);
    void CAM_MODES; void dt;
  }
  onBack() { const s = this.scene; s.opts.after?.(); return true; }
}
