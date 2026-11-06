// What a shot, a blast or a thrown bottle does when it lands.
import { THREE } from '../../pixel-engine.js';
import { THROWABLES, WEAPONS } from '../content/weapons.js';
import { TUNING } from '../core/tuning.js';
import { clamp } from '../world/geom.js';
const { Vector3 } = THREE;
const from = new Vector3(), dir = new Vector3(), v = new Vector3(), right = new Vector3(), up = new Vector3();
export class DamagePart {
  /** A bullet arriving. `by` is whoever fired it. */
  applyHit(hit, dmg, by, o = {}) {
    const game = this.game, owner = game.world.owners.get(hit.collider.handle), P = hit.point, particles = this.ctx.particles;
    if (owner?.type === 'actor') {
      const a = owner.ref, rel = P.y - a.y;
      const k = rel > 1.45 ? 2.5 : rel < 0.75 ? 0.7 : 1;
      if (!a.alive) return;
      particles.burst('blood', [P.x, P.y, P.z]);
      game.audio.at('hit-flesh', P.x, P.y, P.z, 40);
      if (by?.kind === 'player') { this.hitMark = 0.18; this.ctx.engine.hitstop(0.02); }
      const dmgNow = dmg * k;
      const push = o.dir ? [o.dir.x * 5, 2 + o.dir.y * 5, o.dir.z * 5] : [0, 3, 0];
      game.damageActor(a, dmgNow, { by, push, zone: k });
      return;
    }
    if (owner?.type === 'player') { game.damagePlayer(dmg, { by, dirFrom: o.from, player: owner.ref }); return; }
    if (owner?.type === 'prop') { particles.burst('sparks', [P.x, P.y, P.z]); game.audio.at('hit-metal', P.x, P.y, P.z, 40); game.world.hitProp(owner.ref, dmg, by); return; }
    if (owner?.type === 'vehicle') { particles.burst('sparks', [P.x, P.y, P.z]); game.audio.at('hit-metal', P.x, P.y, P.z, 50); owner.ref.damage(dmg * 0.25, by); return; }
    if (owner?.type === 'train') { particles.burst('sparks', [P.x, P.y, P.z]); game.audio.at('hit-metal', P.x, P.y, P.z, 50); return; }
    particles.burst('mud', [P.x, P.y, P.z]); if (this.tracerRng.next() < 0.22) game.audio.at('ricochet', P.x, P.y, P.z, 40);
  }
  /** Bang. Everything near takes damage, grass lights, things shake. */
  explode(x, y, z, r, dmg, by, o = {}) {
    const game = this.game, ctx = this.ctx;
    game.world.fire.ignite(x, z, o.fire ?? r * 0.7, by);
    ctx.physics.explode([x, y, z], { radius: r * 2, impulse: 24 });
    if (!game.settings.reduceFlashes || !o.big) ctx.engine.screen.shockwave([x, y, z], { radius: o.big ? 0.45 : 0.25, strength: o.big ? 1 : 0.6 });
    ctx.particles.burst('blast', [x, y, z]); if (o.big) ctx.particles.burst('blast', [x, y + 2, z], { count: 40 });
    ctx.lights.request({ position: [x, y + 2, z], color: 0xffa040, intensity: o.big ? 70 : 34, radius: o.big ? 70 : 34, lifetime: 0.4, priority: 5 });
    game.world.decals.add('scorch', { x, y: game.world.land.heightAt(x, z) + 0.05, z }, { x: 0, y: 1, z: 0 }, { size: r });
    const p = this.p, dp = Math.hypot(x - p.x, y - p.y, z - p.z);
    game.audio.at(o.big ? 'explosion' : 'explosion-small', x, y, z, 500, 1);
    ctx.engine.shake.add(clamp(1.2 - dp / (r * 8), 0, 0.9));
    game.rumble(clamp(1 - dp / 60, 0.1, 1), 0.3);
    for (const a of [...game.actors.list]) { if (!a.alive) continue; const d = Math.hypot(a.x - x, a.z - z, a.y + 1 - y); if (d < r) { const push = [(a.x - x) / (d || 1) * 7, 5, (a.z - z) / (d || 1) * 7]; game.damageActor(a, dmg * (1 - d / r * 0.7), { by, push, blast: true }); } else if (d < r * 2.5 && a.ctrl) a.dodgeT = 1; }
    if (dp < r) game.damagePlayer(dmg * 0.6 * (1 - dp / r * 0.7), { by, blast: true, at: [x, y, z] });
    for (const vh of game.vehicles.list) { const d = Math.hypot(vh.x - x, vh.z - z); if (d < r * 1.3) vh.damage(dmg * (1 - d / (r * 1.3) * 0.5), by, true); }
    for (const d of game.world.destructibles) if (!d.destroyed && Math.hypot(d.x - x, d.z - z) < r + 1) { if (d.tag === 'pump' || d.tag === 'ammo-bunker' || d.tag === 'fuel-tank') game.world.hitProp(d, dmg * 0.8, by); else if (d.fuse < 0) d.fuse = 0.2 + this.rng.range(0, 0.4); }
    game.events.emit('explosion', x, y, z, r, by, o);
    if (game.net) game.net.onExplosion?.(x, y, z, r, o);
    game.actors.hearShot(x, z, 200, null);
    game.world.shout(x, z);
  }
  flareImpact(x, y, z, hit, by) {
    if (this.game.net && !this.game.net.isHost) { this.game.net.queueEv(['i', Math.round(x), Math.round(z), 3]); this.ctx.particles.burst('sparks', [x, y, z], { count: 12 }); this.game.audio.at('flare-hiss', x, y, z, 60); return; }
    const game = this.game, owner = hit ? game.world.owners.get(hit.collider.handle) : null;
    game.audio.at('flare-hiss', x, y, z, 60);
    game.world.fire.ignite(x, z, 3, by);
    this.ctx.particles.burst('sparks', [x, y, z], { count: 12 });
    this.ctx.lights.request({ position: [x, y + 1, z], color: 0xff8030, intensity: 26, radius: 30, lifetime: 3, flicker: 'torch', priority: 3 });
    if (owner?.type === 'actor' && owner.ref.alive) { game.damageActor(owner.ref, WEAPONS.flare.damage * TUNING.weaponDamage, { by, silent: true }); if (!owner.ref.friendly) { owner.ref.burning = 5; owner.ref.burnBy = by; } }
    if (owner?.type === 'prop') owner.ref.fuse = owner.ref.fuse < 0 ? 0.5 : owner.ref.fuse;
  }
  bottleImpact(x, y, z, hit, by) {
    if (this.game.net && !this.game.net.isHost) { this.game.net.queueEv(['i', Math.round(x), Math.round(z), 6]); this.ctx.particles.burst('blast', [x, y + 0.5, z], { count: 18 }); this.game.audio.at('bottle-smash', x, y, z, 60); return; }
    const game = this.game, owner = hit ? game.world.owners.get(hit.collider.handle) : null;
    game.audio.at('bottle-smash', x, y, z, 60);
    game.world.fire.ignite(x, z, THROWABLES.molotov.ignite + 2, by);
    this.ctx.particles.burst('blast', [x, y + 0.5, z], { count: 18 });
    for (const a of game.actors.list) if (a.alive && Math.hypot(a.x - x, a.z - z) < 3.5 && !a.friendly) { a.burning = 5; a.burnBy = by; } else if (a.alive && a.ctrl && Math.hypot(a.x - x, a.z - z) < 10) a.dodgeT = 1;
    for (const d of game.world.destructibles) if (!d.destroyed && Math.hypot(d.x - x, d.z - z) < d.spec.r * 0.6 + 2) d.fuse = d.fuse < 0 ? 1 : d.fuse;
    void owner;
  }
  rocketImpact(x, y, z, hit, by) { const w = WEAPONS.tube; this.explode(x, y, z, w.blast, by?.kind === 'player' ? w.damage * TUNING.weaponDamage : 70, by, { fire: 5, big: true, rocket: true }); void hit; }
  /** A soldier fires at something. */
  npcShot(a, t) {
    const game = this.game, ph = this.ctx.physics, dx0 = t.x - a.x, dz0 = t.z - a.z, dist = Math.hypot(dx0, dz0);
    let err = (1.2 + (5 - 1.2) * clamp(dist / 80, 0, 1)) / (TUNING.enemyAccuracy * (a.spec.accuracy ?? 1));
    if (t.kind === 'player' && (t.speed2 ?? 0) > 4.8) err *= 1.4;
    const e = (err * Math.PI) / 180, ax = this.rng.gaussian(0, e * 0.6), ay = this.rng.gaussian(0, e * 0.6);
    from.set(a.x, a.y + 1.45, a.z);
    const ty = t.y + (t.crouched ? 0.7 : 1.15);
    dir.set(dx0, ty - from.y, dz0).normalize();
    right.set(dir.z, 0, -dir.x).normalize(); up.crossVectors(dir, right);
    dir.addScaledVector(right, ax).addScaledVector(up, ay).normalize();
    const hit = ph.castRay(from, dir, a.spec.range * 1.2, undefined, a.ctrl?.body);
    game.audio.at(a.role === 'mg' ? 'gun-mg' : a.role === 'sniper' ? 'gun-bolt' : 'gun-rifle', a.x, a.y + 1.4, a.z, 350, 0.75);
    this.ctx.lights.request({ position: [a.x, a.y + 1.5, a.z], color: 0xffd090, intensity: 8, radius: 10, lifetime: 0.05, fadeIn: 0, fadeOut: 0.03 });
    if (this.tracerRng.next() < 0.3) { const to = hit ? hit.point : v.set(from.x + dir.x * 120, from.y + dir.y * 120, from.z + dir.z * 120); game.tracers?.add(from.x, from.y, from.z, to.x, to.y, to.z); }
    // Bullet whip when it passes close.
    if (t.kind === 'player' && dist > 8 && this.tracerRng.next() < 0.35) game.audio.play('bullet-whip', { volume: 0.5, pan: this.tracerRng.range(-0.5, 0.5) });
    if (!hit) return;
    this.applyHit(hit, a.spec.damage ?? 9, a, { dir, from });
  }
}
