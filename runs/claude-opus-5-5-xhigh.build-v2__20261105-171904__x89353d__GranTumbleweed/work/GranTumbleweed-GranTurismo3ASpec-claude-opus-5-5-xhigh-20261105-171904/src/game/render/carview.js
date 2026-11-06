// A car in the world: body group (pitch, roll, heave), wheels (steer pivot, spin group), lamps, mud shell, parts from the install.
import { buildModel, glowMaterial, PALETTE, setLookLayer, THREE, toonMaterial } from '../../pixel-engine.js';
import { mudDefFor, RIM_COLOURS, wheelMesh } from './carkit.js';
import { bigWing, CAR_MODELS, lipSpoiler } from '../models/cars.js';
import { CAR_INFO, PHYSICS } from '../data/cars.js';
import { hasPart, tunedRow } from '../sim/tuning.js';
const { BoxGeometry, Group, Mesh } = THREE;
export class CarView {
  // o: { install, paint, ghost: colourName, scale, noWheelsSpin, tag }
  constructor(carId, o = {}) {
    this.carId = carId; this.o = o; this.install = o.install ?? null;
    this.object = new Group(); this.body = new Group(); this.object.add(this.body); this.wheels = []; this.spin = 0;
    this.pitch = 0; this.roll = 0; this.heave = 0; this.braking = false; this.headOn = false; this.dirt = 0; this.jack = 0; this.shake = 0; this.yawExtra = 0;
    this.build();
    setLookLayer(this.object, 'actors');
    if (o.scale) this.object.scale.setScalar(o.scale);
  }
  build() {
    const carId = this.carId, kit = CAR_MODELS[carId], row = tunedRow(carId, this.install), paint = this.o.paint ?? this.install?.paint ?? CAR_INFO[carId].paint, phys = PHYSICS[carId], L = row.wheelbase, frontW = row.frontWeight, a = L * (1 - frontW), b = L * frontW, T = row.track ?? 1.5, R = row.wheelR ?? 0.31;
    this.R = R;
    const built = buildModel(kit.def, { palette: { paint } });
    this.bodyModel = built.object;
    this.bodyModel.position.z = a - L / 2; // the model is centred on its wheelbase; the car's origin is its centre of gravity
    this.body.add(this.bodyModel);
    this.paint = paint;
    for (const m of this.meshes(this.bodyModel)) { m.castShadow = true; m.receiveShadow = false; }
    // Wheels: steer pivot, then spin group.
    const style = this.install?.rims ?? 0, rimCol = RIM_COLOURS[style] ?? 'mist', width = row.clA > 1 ? 0.3 : 0.23, wheelZ = [a, a, -b, -b], wheelX = [-T / 2, T / 2, -T / 2, T / 2];
    for (let i = 0; i < 4; i++) {
      const pivot = new Group(), spin = wheelMesh(R, width, style, rimCol);
      pivot.position.set(wheelX[i], R, wheelZ[i]); pivot.add(spin); this.object.add(pivot);
      this.wheels.push({ pivot, spin, front: i < 2 });
    }
    // Brake lamps: bright red, shown only under braking. Head glow is part of the body model; a beam quad sells it at night.
    this.brake = new Group(); this.brake.visible = false;
    const tailZ = kit.tailZ - 0.04 + (a - L / 2), red = glowMaterial(PALETTE.red), bright = glowMaterial(0xff5a50);
    for (const l of kit.lamps) { const xs = l.x === 0 ? [0] : [l.x, -l.x]; for (const x of xs) { const m = new Mesh(new BoxGeometry(l.w + 0.02, l.h + 0.02, 0.02), bright); m.position.set(x, l.y, tailZ); this.brake.add(m); } }
    this.body.add(this.brake);
    this.head = new Group(); this.head.visible = false;
    for (const s of [-1, 1]) { const m = new Mesh(new BoxGeometry(0.34, 0.14, 0.02), glowMaterial(PALETTE.sand)); m.position.set(s * (kit.width / 2 - 0.2), kit.headY, kit.noseZ + 0.04 + (a - L / 2)); this.head.add(m); }
    this.body.add(this.head);
    void red; void phys;
    // Parts on the model: lip spoiler, big wing.
    if (this.install) {
      if (hasPart(this.install, 'aeroStreet') && !kit.stockWing) { const lip = buildModel(lipSpoiler, { palette: { paint } }).object; lip.position.set(0, kit.body[kit.body.length - 2][1] + 0.01, kit.tailZ + 0.18 + (a - L / 2)); this.body.add(lip); this.shadowAll(lip); }
      if (hasPart(this.install, 'aeroWing')) { const wing = buildModel(bigWing, { palette: { paint } }).object; wing.position.set(0, kit.body[kit.body.length - 2][1] - 0.02, kit.tailZ + 0.26 + (a - L / 2)); this.body.add(wing); this.shadowAll(wing); this.wing = wing; }
    }
    // Mud: a slightly larger shell of the lower body, dissolved by 1 - dirt.
    const mud = buildModel(mudDefFor(carId), {}).object;
    this.mudMat = toonMaterial(PALETTE.orange, { dissolve: true }).clone(); this.mudMat.dissolve = 1;
    for (const m of this.meshes(mud)) { m.material = this.mudMat; m.castShadow = false; m.receiveShadow = false; }
    mud.position.z = a - L / 2; mud.visible = false; this.mud = mud; this.body.add(mud);
    if (this.o.ghost) this.toGhost(this.o.ghost);
  }
  shadowAll(o) { for (const m of this.meshes(o)) { m.castShadow = true; m.receiveShadow = false; } }
  meshes(root = this.object) { const out = []; root.traverse((o) => { if (o.isMesh) out.push(o); }); return out; }
  // A stippled ghost: every mesh gets one clone of a dissolve material.
  toGhost(colour) {
    const mat = toonMaterial(typeof colour === 'string' ? PALETTE[colour] : colour, { dissolve: true }).clone(); mat.dissolve = 0.35; this.ghostMat = mat;
    for (const m of this.meshes()) { m.material = mat; m.castShadow = false; m.receiveShadow = false; }
    this.mud.visible = false; this.brake.visible = false; this.head.visible = false; this.isGhost = true;
  }
  toSilhouette() { const mat = toonMaterial(PALETTE.ink); for (const m of this.meshes()) { m.material = mat; m.castShadow = true; } this.mud.visible = false; this.brake.visible = false; this.head.visible = false; this.isGhost = true; }
  setDirt(d) { this.dirt = d; if (this.isGhost) return; this.mud.visible = d > 0.02; this.mudMat.dissolve = 1 - d * 0.75; }
  setBrake(on) { if (this.braking !== on) { this.braking = on; if (!this.isGhost) this.brake.visible = on; } }
  setHead(on) { if (this.headOn !== on) { this.headOn = on; if (!this.isGhost) this.head.visible = on; } }
  // pose: x y z yaw (world), pitch/roll for the road and the body, steer, speed m/s.
  update(dt, x, y, z, yaw, roadPitch, roadRoll, bodyPitch, bodyRoll, steer, speed, airborne = false) {
    const o = this.object; o.position.set(x, y + this.jack, z); o.rotation.set(roadPitch, yaw, roadRoll, 'YXZ');
    this.pitch += (bodyPitch - this.pitch) * Math.min(1, dt * 14); this.roll += (bodyRoll - this.roll) * Math.min(1, dt * 12);
    this.body.rotation.x = this.pitch; this.body.rotation.z = this.roll;
    this.clock = (this.clock ?? 0) + dt; const sh = this.shake > 0 ? Math.sin(this.clock * 90) * this.shake : 0;
    this.body.position.y = (airborne ? 0.08 : 0) + sh + this.heave;
    this.spin += (speed / this.R) * dt;
    for (const w of this.wheels) { w.spin.rotation.x = this.spin; if (w.front) w.pivot.rotation.y = -steer; }
  }
  setPaint(colour) { if (colour !== this.paint) this.rebuild({ paint: colour }); }
  rebuild(o = {}) { // after a purchase: swap the model, keep the position
    Object.assign(this.o, o); const parent = this.object;
    for (const c of [...this.body.children]) this.body.remove(c);
    for (const w of this.wheels) parent.remove(w.pivot);
    this.wheels = [];
    this.build(); setLookLayer(this.object, 'actors');
  }
  setInstall(install) { this.install = install; this.o.paint = install?.paint ?? this.o.paint; this.rebuild(); }
  dispose() { this.object.removeFromParent(); }
}
