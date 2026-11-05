// A demo drive: a bot (cheats allowed) on a track, with TV-style cameras. The title's backdrop and the attract mode's
// race segments use it; it draws like a race does.
import { Run, Bot } from './run.js';
import { ChaseCam, tvSpots, tv, orbit } from './cam.js';
import { drawCar, defaultPaint } from './view.js';
import { CARS } from './config.js';
import { ENV_INFO } from './data.js';
import { U, len } from './v3.js';
import { Ghost } from './ghost.js';

const E = globalThis.My3D2dge;
export class Demo {
  constructor(app, trackOrId, o = {}) {
    this.app = app; this.o = o;
    const t = typeof trackOrId === 'string' ? app.track(trackOrId) : trackOrId;
    this.P = o.prepared || app.prepare(t, typeof trackOrId === 'string' ? trackOrId : null);
    this.cars = []; this.t = 0; this.camT = 0; this.camMode = 0;
    const n = o.cars || 1;
    for (let i = 0; i < n; i++) this.addCar(o.carIds ? o.carIds[i] : ENV_INFO[t.env].car, o.paints ? o.paints[i] : null, { skill: o.skill ?? .97, cheat: o.cheat !== false, seed: i * 17 + 3 }, i);
    this.cam = new ChaseCam(); this.spots = tvSpots(this.P.course.samples); this.ghosts = (o.ghosts || []).map(g => ({ ...g, g: new Ghost(g.ghost) }));
  }
  addCar(carId, paint, bot, i) { const run = new Run(this.P.course, carId, { countdown: 0 }); const b = new Bot(run, bot); this.cars.push({ run, bot: b, carId, paint: paint || defaultPaint(carId), spin: 0, prev: run.car.p.slice(), delay: (i || 0) * .8 }); }
  step(dt) {
    this.t += dt; this.camT += dt;
    for (const C of this.cars) {
      C.prev = C.run.car.p.slice();
      if (this.t < C.delay) continue;
      C.run.step(C.bot.control(), dt); C.spin += len(C.run.car.v) / CARS[C.carId].wheelR * dt;
      if (C.run.finished && C.run.finishSteps && C.run.steps > C.run.finishSteps + 240) { const b = C.bot; C.run.reset(0); C.bot = new Bot(C.run, { skill: b.skill, cheat: b.cheat, seed: b.rnd() * 1e6 | 0 }); }
    }
    const c = this.cars[0].run.car;
    if (this.camT > (this.o.camSwitch || 6)) { this.camT = 0; this.camMode = (this.camMode + 1) % 3; this.cam.reset(c); }
    if (this.o.fixedCam) this.o.fixedCam(this.cam, this);
    else if (this.camMode === 0) this.cam.follow(c, dt, this.P.course.phys);
    else if (this.camMode === 1) tv(this.cam, this.spots, c.p);
    else { this.cam.mode = 'far'; orbit(this.cam, c.p, this.t * .3, 14, 5); }
    const v = this.app.views[this.P.track.env];
    if (v) { v.world.camera.target = { x: c.p[0] * U, y: c.p[1] * U, z: c.p[2] * U }; v.world.camera.set('fixed'); v.world.camera.fixed = this.cam.pose(); v.world.step(dt); }
  }
  draw(r, o = {}) {
    const v = this.app.show(this.P); if (!v) return;
    const pen = v.world.pen, a = this.app.game.alpha || 1;
    v.drawTrack(this.app.game.real || this.t, { startGate: this.P.course.startGate, lights: 0, cheer: .3 });
    for (const C of this.cars) { const c = C.run.car, p = [C.prev[0] + (c.p[0] - C.prev[0]) * a, C.prev[1] + (c.p[1] - C.prev[1]) * a, C.prev[2] + (c.p[2] - C.prev[2]) * a]; drawCar(pen, C.carId, { p, f: c.f, r: c.r, u: c.u, steer: c.steerVis, wheelSpin: C.spin, wd: c.wd, brake: c.brakeVis > .3, boost: c.boostT, lights: this.P.track.env === 'frostpeak', time: this.t }, C.paint, { ghost: !!o.ghostCars && C !== this.cars[0], tint: o.tint }); }
    for (const G of this.ghosts) { const st = G.g.at(this.cars[0].run.steps); if (st) drawCar(pen, G.carId, { ...st, time: this.t }, G.paint, { ghost: true, tint: G.color }); }
    if (o.extra) o.extra(pen, v);
    v.world.draw(r);
  }
}
