// MenuScene: the title, the map and every menu set, in one engine Game so that music never restarts.
import { THREE } from '../../pixel-engine.js';
import { buildDiorama, buildSets } from '../render/sets.js';
import { CarView } from '../render/carview.js';
import { makePerson } from '../render/people.js';
import { registerParticles } from '../render/particles.js';
import { applyHour } from '../render/sky.js';
import { TitleScreen } from '../ui/screens/title.js';
import { carEntry, licenceTier } from '../sim/career.js';
const { Vector3 } = THREE;
export class MenuScene {
  constructor(app, opts = {}) { this.name = 'menu'; this.app = app; this.opts = opts; this.target = new Vector3(0, 2, 0); this.camPos = new Vector3(0, 34, 46); this.camLook = new Vector3(0, 0, 0); this.wantPos = new Vector3(0, 34, 46); this.wantLook = new Vector3(0, 0, 0); this.stageName = 'map'; this.orbit = 0; this.turn = 0; this.car = null; this.people = {}; this.carKey = null; this.userTurn = 0; this.fx = []; }
  ready() { if (typeof window !== 'undefined') window.__GAME__ = this.app.handle(); }
  async setup(ctx) {
    const app = this.app; app.enterScene(ctx, this);
    const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 3000; cam.fov = 40; cam.updateProjectionMatrix(); this.cam = cam;
    registerParticles(ctx);
    this.diorama = buildDiorama(ctx); ctx.scene.add(this.diorama.group);
    this.sets = buildSets(ctx);
    for (const name of ['arai', 'benno', 'fenn', 'dell']) { const p = await makePerson(ctx, name); p.object.visible = false; ctx.scene.add(p.object); p.play('Idle', { fade: 0 }); this.people[name] = p; }
    this.stage('map');
    app.ui.clear();
    app.mix.clearCars();
    if (this.opts.start) this.opts.start(app.ui, this); else app.ui.push(new TitleScreen(app));
  }
  hourFor() { const p = this.app.profile, t = licenceTier(p); if (this.opts.title) return 18.4; if (p.events?.gp?.won || p.licences?.A && (p.events?.touring?.won || p.events?.h200?.won)) return 21; if (t === 'A') return 18.6; if (t === 'B') return 15; if (t === 'C') return 11; return 8.5; }
  // Show one set. o: { showroom, car: { carId, install }, person, personAt, personClip, orbit, radius, height, song }
  stage(name, o = {}) {
    const ctx = this.app.ctx, sets = this.sets.sets;
    for (const s of Object.values(sets)) s.group.visible = false;
    this.diorama.group.visible = name === 'map';
    for (const p of Object.values(this.people)) p.object.visible = false;
    this.stageName = name; this.stageOpts = o;
    if (name === 'map') {
      const hourNow = o.hour ?? this.hourFor(); this.diorama.setNight(hourNow >= 18.5); applyHour(ctx.engine, hourNow, {}); ctx.engine.ambient.intensity *= 1.75; ctx.engine.sun.intensity *= 1.25; this.base = new Vector3(0, 0, 0); this.hideCar();
      if (o.titleCam) { this.wantPos.set(0, 36, 70); this.wantLook.set(0, 14, 0); } else { this.wantPos.set(0, 38, 53); this.wantLook.set(0, 0, 3); } if (o.snap !== false) { this.camPos.copy(this.wantPos); this.camLook.copy(this.wantLook); }
      const car = carEntry(this.app.profile); this.diorama.showHome(car?.carId ?? null, car?.install);
      this.target.set(0, 2, 0);
      return;
    }
    const key = name === 'showroom' ? `showroom${o.showroom ?? 0}` : name, set = sets[key];
    set.group.visible = true; this.base = set.base.clone(); this.radius = o.radius ?? 7.6; this.height = o.height ?? 2.5; this.orbitOn = o.orbit !== false; this.orbit = o.angle ?? 0.5; this.userTurn = 0;
    applyHour(ctx.engine, o.hour ?? 12, {});
    ctx.engine.sun.intensity *= o.sun ?? 0.85; ctx.engine.ambient.intensity *= o.ambient ?? 1.1;
    if (name === 'prize') { ctx.engine.sun.intensity = 0; ctx.engine.ambient.intensity = 0.25; ctx.engine.scene.background = new THREE.Color(0x0d0b14); } else ctx.engine.scene.background = new THREE.Color(0x1a1c2c);
    if (name === 'podium') { applyHour(ctx.engine, 16, {}); }
    if (o.car) this.showCar(o.car.carId, o.car.install, o.car); else this.hideCar();
    if (o.person) { const p = this.people[o.person], at = o.personAt ?? [4.4, 0, 1.4]; p.object.visible = true; p.object.position.set(this.base.x + at[0], at[1], this.base.z + at[2]); p.object.rotation.y = o.personYaw ?? -1.1; p.play(o.personClip ?? 'Idle', { fade: 0.05 }); this.person = p; } else this.person = null;
    this.placeCamera(); this.camPos.copy(this.wantPos); this.camLook.copy(this.wantLook);
    this.target.set(this.base.x, 1, this.base.z);
  }
  placeCamera() { const a = this.orbit, R = this.radius, b = this.base; this.wantPos.set(b.x + Math.sin(a) * R, this.height, b.z + Math.cos(a) * R); this.wantLook.set(b.x + (this.stageOpts?.lookX ?? 0), this.stageOpts?.lookY ?? 0.8, b.z + (this.stageOpts?.lookZ ?? 0)); }
  showCar(carId, install, o = {}) {
    const key = JSON.stringify([carId, install?.owned, install?.on, install?.tyre, install?.paint, install?.rims, o.silhouette, o.paint]);
    if (this.carKey !== key || !this.car) {
      this.hideCar(); const v = new CarView(carId, { install, paint: o.paint }); if (o.silhouette) v.toSilhouette(); this.app.ctx.scene.add(v.object); this.car = v; this.carKey = key;
      v.settle = o.settle ? 0.16 : 0;
    }
    this.car.object.visible = true; this.carY = o.y ?? 0.18; this.car.setDirt(o.dirt ?? 0);
    return this.car;
  }
  hideCar() { if (this.car) { this.car.dispose(); this.car = null; this.carKey = null; } }
  // ---- per frame ----
  fixedUpdate(ctx) { this.app.actions.latch(ctx); }
  update(ctx, dt) {
    const app = this.app, a = app.actions; a.setDt(dt); a.latch(ctx);
    ctx.hud.clear();
    if (!this.diorama) { a.send(ctx); return; }
    const t = ctx.time;
    if (this.stageName === 'map') { this.diorama.update(dt, t); if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) { const f = this.diorama.sphere('tuning'); ctx.particles.burst('welding', [f.x - 1.2, 1.4, f.z + 2.7]); } }
    else {
      if (this.orbitOn) this.orbit += dt * 0.09;
      // Drag or right stick rotates the car.
      let spin = 0; if (ctx.input.isDown('MouseLeft') && !app.ui.items.some((i) => app.ui.inRect(i))) spin = (ctx.input.mouseDelta.x ?? 0) * 0.02; for (const p of a.pads) if (Math.abs(p.axes[2]) > 0.15) spin += p.axes[2] * dt * 2.2;
      this.userTurn += spin;
      this.placeCamera();
      if (this.car) { this.car.settle = Math.max(0, (this.car.settle ?? 0) - dt * 0.4); const y = this.carY + (this.car.settle > 0 ? Math.sin(this.car.settle * 30) * this.car.settle : 0); if (this.stageOpts?.carFixed) this.car.update(dt, this.base.x + (this.stageOpts.carX ?? 0), y, this.base.z + (this.stageOpts.carZ ?? 0), this.stageOpts.carYaw ?? 0, 0, 0, 0, 0, 0, this.carSpin ?? 0); else { this.turn += dt * 0.28; this.car.update(dt, this.base.x, y, this.base.z, this.turn + this.userTurn, 0, 0, 0, 0, 0, 0); } }
    }
    for (const p of Object.values(this.people)) if (p.object.visible) p.update(dt);
    for (const f of this.fx) f(dt, t);
    this.camPos.lerp(this.wantPos, 1 - Math.exp(-dt * 3.2)); this.camLook.lerp(this.wantLook, 1 - Math.exp(-dt * 3.6));
    if (this.camOverride) this.camOverride(this.cam, dt); else { this.cam.position.copy(this.camPos); this.cam.lookAt(this.camLook); if (this.cam.fov !== 40) { this.cam.fov = 40; this.cam.updateProjectionMatrix(); } }
    app.mix.volumes();
    app.ui.frame(ctx, dt);
    app.afterFrame(ctx, dt);
    a.send(ctx);
  }
  cameraTarget() { return this.target; }
  status() { const u = this.app.ui; return `menu ${u.top?.id ?? 'none'} focus=${u.top?.focus ?? 'none'}`; }
  fingerprint() { return `${this.app.ui.top?.id}:${this.app.profile.credits}`; }
  dispose() { if (this.app.scene === this) this.app.scene = null; this.fx.length = 0; }
}
