// Combat core: actor registry, bullets, damage, noise, explosions, tracers. Systems call these through `g`.
import { THREE, glowMaterial } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';

const V3 = THREE.Vector3;
export class CombatSystem {
  name = 'combat';
  actors = [];                 // everything with a collider that bullets can hurt (soldiers, buddies, civilians)
  byCollider = new Map();      // collider handle -> actor
  things = new Map();          // collider handle -> destructible (drums, tanks) { hp, onDestroy }
  tracers = []; muzzle = null; flashT = 0;
  setup(g) {
    this.g = g;
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1), glowMaterial(0xffcd75));
      m.visible = false; m.frustumCulled = false; m.castShadow = false; g.ctx.scene.add(m);
      this.tracers.push({ m, t: 0 });
    }
    g.castBullet = (o, d, r) => this.castBullet(o, d, r);
    g.bulletImpact = (h, d, dmg, by) => this.bulletImpact(h, d, dmg, by);
    g.damageActor = (a, dmg, zone, info) => this.damageActor(a, dmg, zone, info);
    g.explode = (p, r, dmg, o) => this.explode(p, r, dmg, o);
    g.noise = (p, r, by) => this.noise(p, r, by);
    g.tracer = (a, b) => this.tracer(a, b);
    g.muzzleLight = (o, d) => { this.flashT = 0.06; g.flashUntil = g.ctx.time + 0.1; };
    g.register = (a) => this.register(a);
    g.unregister = (a) => this.unregister(a);
  }
  register(a) { this.actors.push(a); if (a.collider) this.byCollider.set(a.collider.handle, a); }
  unregister(a) { const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); if (a.collider) this.byCollider.delete(a.collider.handle); }
  addThing(collider, thing) { this.things.set(collider.handle, thing); }
  castBullet(origin, dir, range) {
    const g = this.g;
    const r = g.ctx.physics.castRay(origin, dir, range, [], g.player.ctrl.body);
    if (!r) return null;
    const actor = this.byCollider.get(r.collider.handle) || null;
    return { point: r.point, normal: r.normal, distance: r.distance, collider: r.collider, actor, thing: this.things.get(r.collider.handle) || null, vehicle: g.vehicles?.byCollider.get(r.collider.handle) || null };
  }
  zoneOf(actor, y) {
    const rel = y - actor.pos.y;
    return rel > 1.45 ? 'head' : rel < 0.7 ? 'legs' : 'torso';
  }
  bulletImpact(hit, dir, dmg, by) {
    const g = this.g;
    if (hit.actor) {
      const zone = this.zoneOf(hit.actor, hit.point.y);
      g.ctx.particles.burst('blood', hit.point, { direction: [dir.x, 0.3, dir.z] });
      this.damageActor(hit.actor, dmg, zone, { by, from: hit.point, dir });
    } else {
      g.ctx.particles.burst('impact', hit.point, { count: 4 });
      if (hit.thing) { hit.thing.hp -= dmg; if (hit.thing.hp <= 0 && !hit.thing.dead) { hit.thing.dead = true; hit.thing.onDestroy?.(hit.point); } }
      if (hit.vehicle) g.vehicles?.damage(hit.vehicle, dmg * 0.6, by);
    }
  }
  damageActor(a, dmg, zone, info = {}) {
    if (!a.alive || a.invulnerable) return;
    const g = this.g;
    let d = dmg * (zone === 'head' ? 2.5 : zone === 'legs' ? 0.7 : 1);
    if (a.kind === 'soldier') d /= TUNING.enemyHealth;
    if (a.kind === 'civ') { a.flee?.(info.from); return; }
    if (a.kind === 'buddy' && info.by === 'player') d *= 0.5;
    a.hp -= d;
    a.lastHurt = g.ctx.time;
    a.onHit?.(d, zone, info);
    if (a.hp <= 0) this.kill(a, info);
  }
  kill(a, info = {}) {
    if (!a.alive) return;
    a.alive = false; a.hp = 0;
    this.g.events.emit('kill', a, info);
    a.onDeath?.(info);
  }
  noise(pos, radius, by) { this.g.npcs?.scare(pos, Math.min(radius, 60)); for (const a of this.actors) if (a.alive && a.hear) { const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z); if (d < radius) a.hear(pos, d, by); } }
  explode(pos, radius, dmg, o = {}) {
    const g = this.g;
    g.ctx.particles.burst('smoke', pos, { count: 18 }); g.ctx.particles.burst('impact', pos, { count: 16 });
    g.ctx.physics.explode([pos.x, pos.y, pos.z], { radius, impulse: 14 });
    g.ctx.engine.shake.add(Math.min(1, 1.2 - Math.hypot(g.player.feet.x - pos.x, g.player.feet.z - pos.z) / 90));
    g.sfx?.('explosion', { pos });
    for (const a of this.actors.slice()) {
      if (!a.alive) continue;
      const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z);
      if (d < radius) { this.damageActor(a, dmg * (1 - d / radius * 0.6), 'torso', { by: o.by || 'blast', from: pos }); if (o.ignite && a.alive) a.ignite?.(); }
    }
    const pf = g.player.feet, pd = Math.hypot(pf.x - pos.x, pf.z - pos.z);
    if (pd < radius) g.hurt?.(dmg * (1 - pd / radius * 0.7) * (o.by === 'player' ? 0.5 : 1), 'blast', pos);
    g.vehicles?.blast(pos, radius, dmg);
    for (const [, t] of this.things) if (!t.dead && Math.hypot(t.x - pos.x, t.z - pos.z) < radius) { t.hp -= dmg; if (t.hp <= 0) { t.dead = true; t.onDestroy?.(pos); } }
    if (o.ignite !== false) g.fire?.ignite(pos.x, pos.z, Math.min(radius, 6));
    g.events.emit('explosion', pos, radius);
    g.ctx.engine.screen.shockwave?.(pos, { radius: 0.3 });
  }
  tracer(a, b) {
    const t = this.tracers.find((x) => x.t <= 0) || this.tracers[0];
    const len = a.distanceTo(b); t.m.position.copy(a).lerp(b, 0.5); t.m.lookAt(b); t.m.scale.set(1, 1, Math.max(0.5, len)); t.m.visible = true; t.t = 0.07;
  }
  frame(g, dt) {
    for (const t of this.tracers) if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.m.visible = false; }
    // muzzle flash light
    if (this.flashT > 0) { this.flashT -= dt; if (!this.flashLight) { const c = g.ctx.camera.camera; this.flashLight = g.ctx.lights.request({ position: [c.position.x, c.position.y, c.position.z], color: 0xffcd75, intensity: 14, radius: 14, lifetime: 0.06 }); } }
    else this.flashLight = null;
  }
  state() { return { actors: this.actors.length }; }
}
