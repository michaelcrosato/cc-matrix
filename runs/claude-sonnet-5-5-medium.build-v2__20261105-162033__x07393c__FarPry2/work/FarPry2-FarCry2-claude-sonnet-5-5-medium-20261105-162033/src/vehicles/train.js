// The train: a kinematic ride along the railway polyline. Used for the M0 flatcar and the parked train at Mile Forty.
import { THREE, buildModel } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';
import { RAIL } from '../content/roads.js';

const V3 = THREE.Vector3;
export class TrainSystem {
  name = 'train';
  s = 0; speed = 0; riding = false; len = 0; segs = [];
  setup(g) {
    this.g = g; g.train = this; if (g.session) { this.len = 1; return; }
    let acc = 0; for (let i = 0; i < RAIL.length - 1; i++) { const l = Math.hypot(RAIL[i + 1][0] - RAIL[i][0], RAIL[i + 1][1] - RAIL[i][1]); this.segs.push({ a: RAIL[i], b: RAIL[i + 1], l, s0: acc }); acc += l; } this.len = acc;
    this.cars = ['locomotive', 'flatcar', 'boxcar'].map((id) => { const b = buildModel(id, { catalog: CATALOG }); b.object.traverse((m) => { m.castShadow = true; m.frustumCulled = false; }); g.ctx.scene.add(b.object); return b.object; });
    this.offsets = [0, -9.5, -19];
    this.park(this.sOf(0, 70));
  }
  sOf(x, z) { let best = 0, bd = 1e9; for (const sg of this.segs) { const dx = sg.b[0] - sg.a[0], dz = sg.b[1] - sg.a[1]; const t = Math.max(0, Math.min(1, ((x - sg.a[0]) * dx + (z - sg.a[1]) * dz) / (sg.l * sg.l))); const px = sg.a[0] + dx * t, pz = sg.a[1] + dz * t, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = sg.s0 + t * sg.l; } } return best; }
  at(s, out, tan) { s = Math.max(0, Math.min(this.len - 0.01, s)); const sg = this.segs.find((q) => s >= q.s0 && s < q.s0 + q.l) || this.segs[this.segs.length - 1]; const t = (s - sg.s0) / sg.l; out.set(sg.a[0] + (sg.b[0] - sg.a[0]) * t, 0, sg.a[1] + (sg.b[1] - sg.a[1]) * t); out.y = this.g.world.heightAt(out.x, out.z) + 0.3; if (tan) tan.set(sg.b[0] - sg.a[0], 0, sg.b[1] - sg.a[1]).normalize(); return out; }
  park(s) { this.s = s; this.speed = 0; this.riding = false; this.place(); }
  startRide(fromX, speed = 9) { this.s = this.sOf(fromX, 100); this.speed = speed; this.riding = true; this.place(); this.g.sfx('train_whistle'); }
  stop() { this.speed = 0; this.riding = false; }
  place() {
    const p = new V3(), tan = new V3();
    this.cars.forEach((c, i) => { this.at(this.s + this.offsets[i], p, tan); c.position.copy(p); c.rotation.y = Math.atan2(tan.x, tan.z); });
  }
  deck(out, back = 0) { const tan = new V3(); this.at(this.s + this.offsets[1] + back, out, tan); out.y += 1.2; return { yaw: Math.atan2(-tan.x, -tan.z), tan }; }
  fixed(g, dt) {
    if (g.session) return;
    if (this.speed > 0) { this.s += this.speed * dt; if (this.s > this.len - 40) this.speed = 0; this.place(); if (g.step % 40 === 0 && this.riding) g.sfx('train_clack', { volume: 0.5 }); }
  }
}
