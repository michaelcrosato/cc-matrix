// A car in the world: body motion in a parent Group, wheels stay on the road. Parts come from the install.
import { buildModel, setLookLayer, THREE, toonMaterial, PALETTE } from '../../pixel-engine.js';
import { CAR_DEF, CAR_SPECS } from '../models/cars.js';
import { CARS, RIMS } from '../data/cars.js';
const { Group, Mesh, BoxGeometry, CylinderGeometry, BufferGeometry, Float32BufferAttribute } = THREE;
const tyreGeo = new CylinderGeometry(0.34, 0.34, 0.3, 10).rotateZ(Math.PI / 2), hubGeo = new CylinderGeometry(0.19, 0.19, 0.31, 8).rotateZ(Math.PI / 2), spokeGeo = new BoxGeometry(0.04, 0.4, 0.08);
const lampBox = new BoxGeometry(1, 1, 1);
/** Mud: a slightly larger shell of the lower body as a stipple. */
function mudGeometry(spec, carW) {
  const o = spec.body, zs = o.map((p) => p[0]), z0 = Math.min(...zs) - 0.02, z1 = Math.max(...zs) + 0.02, h = 0.66, w = carW / 2 + 0.03, pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const y0 = 0.2;
  quad([w, y0, z0], [w, y0, z1], [w, h, z1], [w, h, z0]);
  quad([-w, y0, z1], [-w, y0, z0], [-w, h, z0], [-w, h, z1]);
  quad([-w, y0, z0], [w, y0, z0], [w, h - 0.1, z0], [-w, h - 0.1, z0]);
  quad([w, y0, z1], [-w, y0, z1], [-w, h - 0.2, z1], [w, h - 0.2, z1]);
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
export class CarView {
  constructor(carId, install = null, o = {}) {
    this.carId = carId; this.install = install; this.opts = o; this.root = new Group(); this.body = new Group(); this.root.add(this.body); this.wheels = []; this.spin = 0;
    const info = CARS[carId], spec = CAR_SPECS[carId], def = CAR_DEF[carId], phys = info.phys, paint = install?.paint ?? o.paint ?? info.paint;
    this.spec = spec; this.phys = phys;
    const b = buildModel(def, { palette: { paint } });
    this.model = b.object; this.body.add(b.object);
    const L = phys.wheelbase, a = L * (1 - phys.frontWeight), rearZ = -L * phys.frontWeight, frontZ = a, T = (spec.width ?? 1.7) / 2 - 0.12;
    // keep wheels under the arches of the art: scale the wheelbase to fit the body
    const artL = (spec.noseZ - spec.tailZ), wb = Math.min(L, artL * 0.66), mid = (spec.noseZ + spec.tailZ) / 2;
    const fz = mid + wb / 2, rz = mid - wb / 2;
    this.wheelR = 0.34;
    const rim = RIMS[install?.rims ?? 0] ?? RIMS[0], tyreMat = toonMaterial(PALETTE.ink), hubMat = toonMaterial(PALETTE[rim.hub]), spokeMat = toonMaterial(PALETTE[rim.spoke]);
    this.hubMat = hubMat;
    for (const [x, z, front] of [[T, fz, true], [-T, fz, true], [T, rz, false], [-T, rz, false]]) {
      const pivot = new Group(); pivot.position.set(x, 0.34, z);
      const spin = new Group(); pivot.add(spin);
      const tyre = new Mesh(tyreGeo, tyreMat), hub = new Mesh(hubGeo, hubMat), spoke = new Mesh(spokeGeo, spokeMat);
      spoke.position.x = x > 0 ? 0.16 : -0.16;
      spin.add(tyre, hub, spoke);
      this.root.add(pivot);
      this.wheels.push({ pivot, spin, front });
    }
    // brake lamps
    const tails = spec.tails ?? [], red = toonMaterial(PALETTE.red);
    this.brakes = new Group(); this.body.add(this.brakes);
    const brakeGlow = buildModel({ id: `brk-${carId}`, about: 'brake lamps', tags: ['lamp'], palette: { lamp: 'red' }, collider: 'none', floats: true, parts: tails.flatMap(([x, y, w, h]) => [{ box: [w + 0.02, h + 0.02, 0.05], at: [x, y, spec.tailZ - 0.03], c: 'lamp', glow: true }, { box: [w + 0.02, h + 0.02, 0.05], at: [-x, y, spec.tailZ - 0.03], c: 'lamp', glow: true }]) });
    this.brakes.add(brakeGlow.object); this.brakes.visible = false;
    // lights on: extra lamp shine at dusk and night is a glow bar under the head lamps
    // aero parts from the install
    const w = spec.width ?? 1.7, trim = toonMaterial(PALETTE.ink), paintM = toonMaterial(PALETTE[paint] ?? PALETTE.red);
    this.lip = new Mesh(new BoxGeometry(w - 0.1, 0.07, 0.3), paintM); this.lip.position.set(0, 1.06, spec.tailZ + 0.14); this.body.add(this.lip);
    this.wing = new Group();
    const blade = new Mesh(new BoxGeometry(w + 0.1, 0.07, 0.42), trim); blade.position.set(0, 1.42, spec.tailZ + 0.14); this.wing.add(blade);
    for (const sx of [-1, 1]) { const st = new Mesh(new BoxGeometry(0.07, 0.48, 0.3), trim); st.position.set(sx * (w / 2 - 0.2), 1.16, spec.tailZ + 0.16); this.wing.add(st); const en = new Mesh(new BoxGeometry(0.06, 0.26, 0.5), toonMaterial(PALETTE[paint] ?? PALETTE.red)); en.position.set(sx * (w / 2 + 0.05), 1.42, spec.tailZ + 0.14); this.wing.add(en); }
    this.body.add(this.wing);
    this.applyParts();
    // mud shell
    this.mudMat = toonMaterial(PALETTE.orange, { dissolve: true }).clone(); this.mudMat.dissolve = 1;
    this.mud = new Mesh(mudGeometry(spec, w), this.mudMat); this.mud.visible = false; this.mud.castShadow = false; this.body.add(this.mud);
    this.setDirt(o.dirt ?? 0);
    this.root.traverse((m) => { if (m.isMesh) { m.castShadow = o.ghost ? false : true; m.receiveShadow = false; } });
    setLookLayer(this.root, 'actors');
    if (o.ghost) this.makeGhost(o.ghost, o.ghostDissolve ?? 0.35);
    if (o.scale) this.root.scale.setScalar(o.scale);
    this.roll = 0; this.pitch = 0; this.jolt = 0;
  }
  applyParts() { const p = this.install?.parts ?? {}; this.lip.visible = p.aero === 1; this.wing.visible = p.aero === 2; }
  setDirt(d) { this.dirt = d; this.mud.visible = d > 0.01; this.mudMat.dissolve = 1 - d * 0.75; }
  makeGhost(color, dissolve) {
    const m = toonMaterial(color, { dissolve: true }).clone(); m.dissolve = dissolve; this.ghostMat = m;
    this.root.traverse((o) => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
    this.mud.visible = false;
  }
  /** Pose from a car state { x, y, z, yaw, ax, ay, u, delta, brake, rpm, redline, airborne }. */
  pose(s, dt, tr = null) {
    this.root.position.set(s.x, s.y, s.z);
    let slope = 0, bank = 0;
    if (tr && s.i != null) { slope = tr.slope[s.i]; bank = tr.bank[s.i]; }
    const k = 1 - Math.exp(-dt * 10);
    this.pitch += ((-(s.ax ?? 0) * 0.0045) - this.pitch) * k; this.roll += (((s.ay ?? 0) * 0.0085) - this.roll) * k;
    this.jolt *= Math.exp(-dt * 8);
    this.root.rotation.set(-Math.atan(slope), s.yaw, Math.sin(bank) * 1, 'YXZ');
    this.body.rotation.x = this.pitch + Math.sin(this.jolt * 24) * this.jolt * 0.02;
    this.body.rotation.z = this.roll;
    const limiter = (s.rpm ?? 0) >= this.phys.redline - 30, idleShake = (s.u != null && Math.abs(s.u) < 1 && (s.rpm ?? 0) > 0) || limiter ? Math.sin((s.t ?? 0) * 90) * (limiter ? 0.014 : 0.006) : 0;
    this.body.position.y = idleShake + Math.max(0, Math.min(0.14, (s.vy ?? 0) * 0.015));
    this.spin += ((s.u ?? 0) / this.wheelR) * dt;
    for (const w of this.wheels) { w.spin.rotation.x = this.spin; if (w.front) w.pivot.rotation.y = -(s.delta ?? 0); }
    this.brakes.visible = !!s.brake;
  }
  dispose() { this.root.parent?.remove(this.root); }
}
