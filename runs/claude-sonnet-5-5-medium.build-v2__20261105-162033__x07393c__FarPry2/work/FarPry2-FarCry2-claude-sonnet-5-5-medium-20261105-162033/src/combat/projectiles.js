// Flares, bottles, rockets and planted charges: integrated per fixed step with a ray per step.
import { THREE, glowMaterial, toonMaterial, PALETTE } from '../../pixel-engine.js';
const V3 = THREE.Vector3;
const KINDS = {
  flare: { grav: 14, color: 0xff7a30, size: 0.14, life: 6 },
  molotov: { grav: 20, color: 0xffcd75, size: 0.16, life: 5 },
  rocket: { grav: 0, color: 0xffcd75, size: 0.2, life: 6 },
};
export class ProjectileSystem {
  name = 'projectiles';
  list = [];
  setup(g) { this.g = g; g.projectiles = this; }
  launch(kind, origin, dir, speed, o = {}) {
    const k = KINDS[kind];
    const m = new THREE.Mesh(new THREE.BoxGeometry(k.size, k.size, kind === 'rocket' ? 0.8 : k.size), kind === 'molotov' ? toonMaterial(PALETTE.plum) : glowMaterial(k.color));
    m.castShadow = false;
    const p = { kind, pos: origin.clone().addScaledVector(dir, 0.8), vel: dir.clone().multiplyScalar(speed), life: k.life, m, owner: o.owner, blast: o.blast, damage: o.damage, light: null };
    this.g.ctx.scene.add(m); m.position.copy(p.pos);
    if (kind !== 'molotov') p.light = this.g.ctx.lights.request({ position: [p.pos.x, p.pos.y, p.pos.z], color: k.color, intensity: 10, radius: 12 });
    this.list.push(p);
    return p;
  }
  plant(pos, owner) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), toonMaterial(PALETTE.red));
    m.position.copy(pos); this.g.ctx.scene.add(m);
    const c = { kind: 'charge', pos: pos.clone(), m, owner, planted: true };
    return c;
  }
  detonate(c) {
    if (c.done) return; c.done = true; this.g.ctx.scene.remove(c.m);
    this.g.explode(c.pos, 7, 220, { by: c.owner || 'player', ignite: true });
    this.g.events.emit('charge', c.pos);
  }
  end(p, point, normal) {
    const g = this.g; p.done = true; g.ctx.scene.remove(p.m); p.light?.release?.();
    if (p.kind === 'flare') { g.fire?.ignite(point.x, point.z, 3); g.fire?.igniteActorsNear(point, 2.2); g.ctx.particles.burst('ember', point, { count: 10 }); g.sfx?.('flare_pop', { pos: point }); }
    else if (p.kind === 'molotov') { g.fire?.ignite(point.x, point.z, 4); g.fire?.igniteActorsNear(point, 4); g.ctx.particles.burst('ember', point, { count: 16 }); g.sfx?.('bottle_smash', { pos: point }); g.noise(point, 40, 'player'); }
    else if (p.kind === 'rocket') g.explode(point, p.blast || 6, p.damage || 180, { by: p.owner, ignite: true });
  }
  fixed(g, dt) {
    for (const p of this.list) {
      if (p.done) continue;
      const k = KINDS[p.kind];
      p.vel.y -= k.grav * dt; p.life -= dt;
      const step = p.vel.clone().multiplyScalar(dt), len = step.length();
      const dir = step.clone().normalize();
      const hit = g.ctx.physics.castRay(p.pos, dir, len + 0.05, [], g.player.ctrl.body);
      const h = g.world.heightAt(p.pos.x + step.x, p.pos.z + step.z);
      if (hit) { p.pos.copy(hit.point); const a = g.combat.byCollider.get(hit.collider.handle); if (a && p.kind !== 'molotov') g.damageActor(a, p.kind === 'flare' ? 12 : 0, 'torso', { by: p.owner, from: p.pos }); this.end(p, hit.point, hit.normal); continue; }
      p.pos.add(step);
      if (p.pos.y <= h + 0.05) { p.pos.y = h + 0.05; this.end(p, p.pos, null); continue; }
      if (p.life <= 0) { this.end(p, p.pos, null); continue; }
      p.m.position.copy(p.pos); if (p.kind === 'rocket') p.m.lookAt(p.pos.clone().add(p.vel));
      if (p.light) { p.light.position?.copy?.(p.pos); }
      if (p.kind === 'rocket') g.ctx.particles.burst('smoke', p.pos, { count: 1 });
    }
    this.list = this.list.filter((p) => !p.done);
  }
}
