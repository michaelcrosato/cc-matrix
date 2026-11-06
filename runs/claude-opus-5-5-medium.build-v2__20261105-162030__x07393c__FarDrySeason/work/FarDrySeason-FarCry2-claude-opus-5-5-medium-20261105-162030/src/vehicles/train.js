// The goods train, on rails.
import { buildModel, setLookLayer } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { RAILWAY } from '../content/roads.js';
import { clamp, polyLength, polyPoint } from '../world/geom.js';
export class Train {
  s = 900; speed = 0; goal = null; riding = false; x = 0; y = 40; z = 0; yaw = 0; visible = true; cars = [];
  constructor(game) { this.game = game; }
  build(ctx) {
    this.ctx = ctx; const g = this.game;
    this.L = polyLength(RAILWAY);
    const mk = (id, off) => { const b = buildModel(id, { catalog: CATALOG }); setLookLayer(b.object, 'actors'); b.object.traverse((o) => { if (o.isMesh) o.frustumCulled = false; }); ctx.scene.add(b.object); return { object: b.object, off, id }; };
    this.cars = [mk('locomotive', 0), mk('flatcar', -11), mk('boxcar', -20), mk('flatcar', -29)];
    this.gunMount = buildModel('rifle-npc', { catalog: CATALOG }).object;
    this.place();
    void g;
  }
  place() {
    const g = this.game, q = {};
    for (const c of this.cars) { polyPoint(RAILWAY, clamp(this.s + c.off, 0, this.L), q); const y = g.world.railY(q.x, q.z) + 0.18; c.object.position.set(q.x, y, q.z); c.object.rotation.y = q.yaw; c.x = q.x; c.y = y; c.z = q.z; c.yaw = q.yaw; }
    const head = this.cars[0]; this.x = head.x; this.y = head.y; this.z = head.z; this.yaw = head.yaw;
  }
  /** Where a rider stands on a flatcar (world). */
  riderPos(out) { const c = this.cars[1]; out.set(c.x, c.y + 1.3 + 1.55, c.z); return out; }
  sToward(x, z) { let best = 0, bd = 1e9; const q = {}; for (let s = 0; s < this.L; s += 5) { polyPoint(RAILWAY, s, q); const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = s; } } return best; }
  setAt(x, z) { this.s = this.sToward(x, z); this.speed = 0; this.goal = null; this.place(); }
  fixed(dt) {
    if (this.goal !== null) { const d = this.goal - this.s, stop = Math.abs(d) < 4; const want = stop ? 0 : Math.sign(d) * Math.min(this.topSpeed ?? 13, Math.abs(d) * 0.4 + 2); this.speed += clamp(want - this.speed, -5 * dt, 5 * dt); if (stop) { this.speed = 0; this.goal = null; this.game.events.emit('trainStopped'); } }
    if (this.speed) { this.s = clamp(this.s + this.speed * dt, 12, this.L - 2); this.place(); this.clack = (this.clack ?? 0) - Math.abs(this.speed) * dt; if (this.clack <= 0) { this.clack = 9; this.game.audio.at('train-clack', this.x, this.y + 1, this.z, 180); } }
  }
}
