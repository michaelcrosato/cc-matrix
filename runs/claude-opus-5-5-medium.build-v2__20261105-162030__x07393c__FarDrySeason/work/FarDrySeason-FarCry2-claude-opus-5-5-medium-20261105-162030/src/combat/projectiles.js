// Things that fly: flares, bottles, rockets. A ray per fixed step.
import { buildModel, THREE, setLookLayer } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
const { Vector3 } = THREE;
const dir = new Vector3(), from = new Vector3();
const KINDS = {
  flare: { speed: 34, gravity: 12, palette: { body: 'orange', tip: 'white' }, scale: 0.7, light: 0xffa050, life: 7 },
  bottle: { speed: 18, gravity: 14, palette: { body: 'green', tip: 'orange' }, scale: 1.1, life: 6 },
  rocket: { speed: 62, gravity: 0.6, palette: { body: 'night', tip: 'white' }, scale: 1.4, light: 0xffe0a0, life: 5 },
};
export class Projectiles {
  list = [];
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; }
  spawn(kind, x, y, z, dx, dy, dz, by) {
    const k = KINDS[kind], b = buildModel('projectile', { catalog: CATALOG, palette: k.palette });
    b.object.scale.setScalar(k.scale); setLookLayer(b.object, 'actors'); b.object.position.set(x, y, z);
    this.ctx.scene.add(b.object);
    const p = { kind, x, y, z, vx: dx * k.speed, vy: dy * k.speed, vz: dz * k.speed, life: k.life, by, object: b.object, g: k.gravity };
    if (k.light) p.light = this.ctx.lights.request({ follow: b.object, color: k.light, intensity: 12, radius: 24, flicker: 'torch', priority: 3 });
    this.list.push(p);
    return p;
  }
  fixed(dt) {
    const ph = this.ctx.physics;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.vy -= p.g * dt; p.life -= dt;
      const sp = Math.hypot(p.vx, p.vy, p.vz), step = sp * dt;
      from.set(p.x, p.y, p.z); dir.set(p.vx / sp, p.vy / sp, p.vz / sp);
      const hit = ph.castRay(from, dir, step, undefined, p.by?.kind === 'player' ? this.game.player.ctrl?.body : p.by?.ctrl?.body);
      if (hit || p.life <= 0 || p.y < -10) { const q = hit ? hit.point : from; this.impact(p, q.x, q.y, q.z, hit); this.ctx.scene.remove(p.object); p.light?.release(); this.list.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
  }
  update() { for (const p of this.list) { p.object.position.set(p.x, p.y, p.z); p.object.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz); if (p.kind !== 'bottle') this.ctx.particles.burst('gun-smoke', [p.x, p.y, p.z], { count: 1 }); } }
  impact(p, x, y, z, hit) {
    const combat = this.game.combat;
    if (p.kind === 'flare') combat.flareImpact(x, y, z, hit, p.by);
    else if (p.kind === 'bottle') combat.bottleImpact(x, y, z, hit, p.by);
    else combat.rocketImpact(x, y, z, hit, p.by);
  }
  clear() { for (const p of this.list) { this.ctx.scene.remove(p.object); p.light?.release(); } this.list.length = 0; }
}
