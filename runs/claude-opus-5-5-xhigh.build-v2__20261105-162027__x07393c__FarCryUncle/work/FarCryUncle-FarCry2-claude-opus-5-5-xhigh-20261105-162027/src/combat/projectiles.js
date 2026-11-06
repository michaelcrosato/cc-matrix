// Flares, bottles and rockets: integrated per fixed step, one ray per step. Hit and light.
import { THREE, glowMaterial, PALETTE, buildModel, toonMaterial } from '../../pixel-engine.js';
const { Vector3, Mesh, BoxGeometry, SphereGeometry } = THREE;
const _o = new Vector3(), _d = new Vector3();
const KIND = {
  flare: { speed: 42, gravity: 11, color: PALETTE.orange, size: 0.14, life: 6, trail: 'ember' },
  bottle: { speed: 18, gravity: 12, color: PALETTE.teal, size: 0.12, life: 5 },
  rocket: { speed: 62, gravity: 1.2, color: PALETTE.sand, size: 0.2, life: 4, trail: 'fire-smoke' },
  soldier_rocket: { speed: 44, gravity: 1.2, color: PALETTE.sand, size: 0.2, life: 4, trail: 'fire-smoke' },
};
export class Projectiles {
  list = []; pool = [];
  constructor(game) { this.game = game; }
  spawn(kind, x, y, z, dx, dy, dz, who, opts = {}) {
    const def = KIND[kind];
    const g = this.game;
    let mesh = null;
    if (g.views) {
      mesh = new Mesh(new BoxGeometry(def.size, def.size, def.size * 2), kind === 'bottle' ? toonMaterial(def.color) : glowMaterial(def.color));
      mesh.position.set(x, y, z); g.ctx.scene.add(mesh);
    }
    const l = Math.hypot(dx, dy, dz) || 1;
    const sp = opts.speed ?? def.speed;
    const p = { kind, def, x, y, z, vx: (dx / l) * sp, vy: (dy / l) * sp, vz: (dz / l) * sp, t: 0, who, mesh, opts, light: null };
    if (g.views && kind === 'flare') p.light = g.ctx.lights.request({ position: [x, y, z], color: 0xff7a30, intensity: 12, radius: 18, flicker: 'torch' });
    this.list.push(p);
    return p;
  }
  fixedUpdate(ctx, dt) {
    const g = this.game;
    const rays = ctx.physics;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.vy -= p.def.gravity * dt;
      const dx = p.vx * dt, dy = p.vy * dt, dz = p.vz * dt, len = Math.hypot(dx, dy, dz);
      _o.set(p.x, p.y, p.z); _d.set(dx / len, dy / len, dz / len);
      const exclude = p.who === 'player' ? g.player?.cc?.body : p.who?.cc?.body;
      const hit = rays.castRay(_o, _d, len + 0.05, [], exclude);
      if (hit || p.t > p.def.life) {
        const hx = hit ? p.x + _d.x * hit.distance : p.x, hy = hit ? p.y + _d.y * hit.distance : p.y, hz = hit ? p.z + _d.z * hit.distance : p.z;
        this.impact(p, hx, hy, hz, hit);
        this.remove(i);
        continue;
      }
      p.x += dx; p.y += dy; p.z += dz;
      if ((p.kind === 'rocket' || p.kind === 'bottle') && p.who === 'player' && g.tick % 6 === 0) {
        for (const so of g.actors.soldiers) {
          if (!so.active || so.dead || so.dodgeT > 0) continue;
          if (Math.hypot(so.x - p.x, so.z - p.z) < 9) { so.dodgeT = 1; so.dodgeDir = Math.atan2(so.x - p.x, so.z - p.z) + (so.id % 2 ? 0.8 : -0.8); g.voice.bark(so, 'fire'); }
        }
      }
      if (p.def.trail && ((p.t * 30) | 0) % 2 === 0) ctx.particles.burst(p.def.trail, [p.x, p.y, p.z], { count: 1 });
      if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz); }
      if (p.light) p.light.position.set(p.x, p.y, p.z);
    }
  }
  impact(p, x, y, z, hit) {
    const g = this.game;
    const who = p.who;
    const src = who === 'player' || p.opts.seat != null ? 'player' : 'world';
    const ent = hit ? g.hitMap.get(hit.collider.handle) : null;
    if (p.kind === 'flare') {
      g.fire.ignite(x, z, 3, src);
      if (ent?.kind === 'soldier') { ent.ref.hurt(12, who, _d, 'body', p.opts); ent.ref.ignite(); }
      if (ent?.kind === 'merc') { g.round?.hitMerc(ent.ref, 12, p.opts, who); }
      g.sfx.at('flare-hiss', x, z, { volume: 0.5, max: 60 });
      g.ctx.particles.burst('ember', [x, y + 0.2, z], { count: 12 });
    } else if (p.kind === 'bottle') {
      g.fire.ignite(x, z, 4, src);
      g.sfx.at('bottle-smash', x, z, { max: 60 });
      g.ctx.particles.burst('ember', [x, y + 0.3, z], { count: 20 });
      g.fx.scorch(x, y, z, 2.5);
      if (ent?.kind === 'soldier') ent.ref.ignite();
      for (const s of g.actors.soldiers) if (s.active && !s.dead && Math.hypot(s.x - x, s.z - z) < 3.2) s.ignite();
    } else {
      g.damage.blast(x, y + 0.4, z, 6, 180, who, { ...p.opts, fire: 5 });
      if (ent?.kind === 'vehicle') ent.ref.hurt(160, 'rocket');
      if (ent?.kind === 'explosive' && ent.ref.alive) { ent.ref.hp -= 180; if (ent.ref.hp <= 0) g.damage.explode(ent.ref, 'rocket', who); }
    }
    g.events.emit('impact', p.kind, x, z);
  }
  remove(i) {
    const p = this.list[i];
    if (p.mesh) { this.game.ctx.scene.remove(p.mesh); p.mesh.geometry.dispose(); }
    p.light?.release();
    this.list.splice(i, 1);
  }
  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.remove(i); }
}
