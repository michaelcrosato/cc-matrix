// Gazelle and vultures.
import { buildModel, THREE, setLookLayer, Boids, compileClips } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { GAZELLE_CLIPS, GAZELLE_RIG, VULTURE_CLIPS, VULTURE_RIG } from '../art/clips.js';
import { dist2 } from '../world/geom.js';
const { BoxGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3, Group, AnimationMixer } = THREE;
export class FaunaPart {
  buildFauna(ctx) {
    const r = ctx.random.fork('fauna');
    this.herd = [];
    const herdSpots = [[-120, -40], [230, 320], [-300, 300], [20, -300], [330, 120]];
    const proto = buildModel('gazelle', { catalog: CATALOG });
    this.gazelleClips = compileClips(GAZELLE_CLIPS, GAZELLE_RIG, proto.object);
    for (const [hx, hz] of herdSpots) for (let i = 0; i < 5; i++) {
      const b = buildModel('gazelle', { catalog: CATALOG }), x = hx + r.range(-14, 14), z = hz + r.range(-14, 14);
      setLookLayer(b.object, 'actors'); ctx.scene.add(b.object);
      const mixer = new AnimationMixer(b.object), graze = mixer.clipAction(this.gazelleClips[0]), run = mixer.clipAction(this.gazelleClips[1]);
      graze.time = r.range(0, 2); graze.play();
      this.herd.push({ object: b.object, mixer, graze, run, x, z, hx, hz, yaw: r.range(0, 6.28), flee: 0, vx: 0, vz: 0, running: false });
    }
    const vb = buildModel('vulture', { catalog: CATALOG });
    this.vultureClips = compileClips(VULTURE_CLIPS, VULTURE_RIG, vb.object);
    this.vultures = [];
    this.boids = new Boids(10, { bounds: { min: [-60, 26, -60], max: [60, 50, 60] }, view: 20, space: 6, maxSpeed: 7, minSpeed: 4, seed: 9 });
    for (let i = 0; i < 10; i++) { const b = i === 0 ? vb : buildModel('vulture', { catalog: CATALOG }); setLookLayer(b.object, 'actors'); ctx.scene.add(b.object); const m = new AnimationMixer(b.object); const a = m.clipAction(this.vultureClips[0]); a.time = i * 0.1; a.play(); this.vultures.push({ object: b.object, mixer: m }); }
    this.vultureAt = [-260, 70, -300];
  }
  fauna(dt) {
    if (this.game.session) return;
    const fx = this.focusX ?? 0, fz = this.focusZ ?? 0;
    for (const h of this.herd) {
      const near = dist2(h.x, h.z, fx, fz);
      if (near > 180) continue;
      if (this.startle && dist2(h.x, h.z, this.startle[0], this.startle[1]) < 120 && h.flee <= 0) { h.flee = 7; const a = Math.atan2(h.z - this.startle[1], h.x - this.startle[0]) + this.rng.range(-0.5, 0.5); h.vx = Math.cos(a) * 11; h.vz = Math.sin(a) * 11; }
      if (this.stepCount % 30 === 0 && this.fire.isBurning(h.x + h.vx, h.z + h.vz) && h.flee <= 0) { h.flee = 5; h.vx = -this.wind.z * 10; h.vz = this.wind.x * 10; }
      if (h.flee > 0) { h.flee -= dt; h.x += h.vx * dt; h.z += h.vz * dt; h.yaw = Math.atan2(h.vx, h.vz); }
    }
    if (this.startle) this.startle = null;
  }
}
