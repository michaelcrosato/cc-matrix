// Who gets hurt by what. Bullets by ray, blasts by radius. Sim only; pictures through the feedback helpers.
import { THREE } from '../../pixel-engine.js';
import { TUNING } from '../core/tuning.js';
import { clamp } from '../core/rng.js';
const { Vector3 } = THREE;
const _o = new Vector3(), _d = new Vector3(), _h = new Vector3();
export class Damage {
  hitFlash = 0; lastHitAt = -9;
  constructor(game) { this.game = game; }
  /** One bullet. Returns what it hit. `who` is 'player', a soldier, a buddy or a seat id in a round. */
  bullet(fromX, fromY, fromZ, dx, dy, dz, range, damage, who, opts = {}) {
    const g = this.game, ctx = g.ctx;
    _o.set(fromX, fromY, fromZ); _d.set(dx, dy, dz).normalize();
    const exclude = who?.cc?.body ?? (who === 'player' ? g.player.cc?.body : undefined);
    const hit = ctx.physics.castRay(_o, _d, range, [], exclude);
    if (!hit) return null;
    const px = fromX + _d.x * hit.distance, py = fromY + _d.y * hit.distance, pz = fromZ + _d.z * hit.distance;
    const ent = g.hitMap.get(hit.collider.handle);
    const res = { x: px, y: py, z: pz, ent, distance: hit.distance };
    if (!ent) { g.fx.impact(px, py, pz, hit.normal, 'dirt', opts); return res; }
    switch (ent.kind) {
      case 'soldier': {
        const s = ent.ref;
        if (s.dead) return res;
        const zone = py - s.y;
        const m = zone > 1.48 ? 2.5 : zone < 0.68 ? 0.7 : 1;
        if (who === 'player' || opts.seat != null) g.fx.hitMarker(m > 1);
        s.hurt(damage * m, who, _d, m > 1 ? 'head' : 'body', opts);
        g.fx.impact(px, py, pz, hit.normal, 'flesh', opts);
        break;
      }
      case 'player':
        if (who !== 'player') g.body.hurt(damage, 'bullet', [fromX, fromZ], opts);
        g.fx.impact(px, py, pz, hit.normal, 'flesh', opts);
        break;
      case 'buddy':
        if (who !== 'player' || !g.story?.noFriendlyFire) ent.ref.hurt(damage, who);
        g.fx.impact(px, py, pz, hit.normal, 'flesh', opts);
        break;
      case 'civilian':
        ent.ref.flee(fromX, fromZ);
        g.fx.impact(px, py, pz, hit.normal, 'dirt', opts);
        break;
      case 'vehicle':
        ent.ref.hurt(damage * 0.35, 'bullet');
        g.fx.impact(px, py, pz, hit.normal, 'metal', opts);
        break;
      case 'explosive': {
        const ex = ent.ref;
        ex.hp -= damage;
        g.fx.impact(px, py, pz, hit.normal, 'metal', opts);
        if (ex.hp <= 0) this.explode(ex, 'bullet', who);
        break;
      }
      case 'merc':
        g.round?.hitMerc(ent.ref, damage, opts, who);
        g.fx.impact(px, py, pz, hit.normal, 'flesh', opts);
        break;
      default:
        g.fx.impact(px, py, pz, hit.normal, 'dirt', opts);
    }
    return res;
  }
  /** Where a shot would land, for the look of it. The host decides what it did. */
  visualRay(x, y, z, dx, dy, dz, range) {
    const g = this.game;
    _o.set(x, y, z); _d.set(dx, dy, dz).normalize();
    const hit = g.ctx.physics.castRay(_o, _d, range, [], g.player.cc?.body);
    if (!hit) return null;
    const px = x + _d.x * hit.distance, py = y + _d.y * hit.distance, pz = z + _d.z * hit.distance;
    g.fx.impact(px, py, pz, hit.normal, 'dirt');
    return { x: px, y: py, z: pz, distance: hit.distance };
  }
  /** A blast: hurts everything in range, lights the grass, chains tanks. */
  blast(x, y, z, radius, damage, who, opts = {}) {
    const g = this.game, ctx = g.ctx;
    g.fx.explosion(x, y, z, radius);
    if (opts.fire !== 0 && !g.round?.isClient) g.fire.ignite(x, z, opts.fire ?? radius * 0.8, who === 'player' || opts.seat != null ? 'player' : 'world');
    // Soldiers.
    for (const s of g.actors.soldiers) {
      if (s.dead || !s.active) continue;
      const d = Math.hypot(s.x - x, s.y - y, s.z - z);
      if (d < radius * 1.3) {
        const f = clamp(1 - d / (radius * 1.3), 0.15, 1);
        _d.set(s.x - x, Math.abs(s.y - y) + 1.2, s.z - z).normalize();
        s.hurt(damage * f, who, _d, 'blast', { blast: 1 });
        if (d < radius * 0.7) s.ignite();
      }
    }
    for (const b of g.actors.buddies) {
      if (!b.active || b.down || b.dead) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < radius) b.hurt(damage * (1 - d / radius) * 0.5, who);
    }
    // The player.
    if (g.hasPlayer) {
      const f = g.player.feet, d = Math.hypot(f.x - x, f.y + 0.9 - y, f.z - z);
      if (d < radius * 1.2) {
        const v = clamp(1 - d / (radius * 1.2), 0.1, 1);
        g.body.hurt(damage * v * 0.42, 'blast', [x, z]);
        ctx.engine.shake.add(v * 0.9);
      } else if (d < radius * 8) ctx.engine.shake.add(clamp(0.5 - d / (radius * 16), 0, 0.5));
    }
    // Vehicles.
    for (const v of g.vehicles.list) {
      if (!v.alive) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < radius * 1.2) v.hurt(damage * clamp(1 - d / (radius * 1.2), 0.15, 1), 'blast');
    }
    // Chains.
    for (const ex of g.world.explosives) {
      if (!ex.alive) continue;
      if (Math.hypot(ex.x - x, ex.z - z) < radius) { ex.hp -= damage; if (ex.hp <= 0) g.after(0.12 + Math.hypot(ex.x - x, ex.z - z) * 0.02, () => this.explode(ex, 'chain', who)); }
    }
    g.round?.blastAt?.(x, y, z, radius, damage, who, opts);
    ctx.physics.explode([x, y, z], { radius: radius * 1.4, impulse: 14 });
    g.actors.heardGunshot(x, z, radius * 16);
    g.events.emit('blast', x, z, radius);
  }
  explode(ex, cause, who) {
    if (!ex.alive) return;
    ex.alive = false;
    ex.object.visible = false;
    for (const c of ex.colliders) { c.setEnabled?.(false); }
    this.game.events.emit('destroyed', ex.tag ?? ex.id, ex);
    this.blast(ex.x, ex.y + 1.2, ex.z, ex.def.radius, ex.def.damage, who ?? (cause === 'fire' ? 'fire' : 'world'), { fire: ex.def.fire });
    this.game.fx.scorch(ex.x, ex.y, ex.z, ex.def.radius);
  }
  restore(ex) {
    ex.alive = true; ex.hp = ex.def.hp; ex.object.visible = true;
    for (const c of ex.colliders) c.setEnabled?.(true);
  }
}
