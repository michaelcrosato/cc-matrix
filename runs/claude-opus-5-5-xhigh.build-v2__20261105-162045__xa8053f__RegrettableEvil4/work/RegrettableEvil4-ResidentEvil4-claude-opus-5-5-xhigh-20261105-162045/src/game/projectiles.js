// Things thrown through the air: oil bottles, nets, harpoons, rivets, brine globs, Max's grenades.
// All arcs telegraphed; the enemy's ones can be shot out of the air.
import { buildModel, setLookLayer, THREE, toonMaterial, PALETTE, glowMaterial } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { GRENADES } from '../data/weapons.js';
import { explode } from './combat.js';
import { TUNING } from '../data/tuning.js';

const { BoxGeometry, Mesh, RingGeometry, SphereGeometry, Vector3 } = THREE;

const KINDS = {
  bottle: { model: 'w-oil', scale: 1, gravity: 12, shootable: true, radius: 0.4, arc: true, speed: 9, marker: 1.2 },
  net: { mesh: 'net', gravity: 9, shootable: true, radius: 0.7, arc: true, speed: 8, marker: 1.2 },
  harpoon: { model: 'w-bolt', gravity: 0, shootable: true, radius: 0.45, arc: false, speed: 18 },
  rivet: { mesh: 'rivet', gravity: 0, shootable: true, radius: 0.35, arc: false, speed: 14 },
  glob: { mesh: 'glob', gravity: 8, shootable: true, radius: 0.5, arc: true, speed: 9, marker: 1 },
  grenadeFlare: { model: 'w-flare', gravity: 14, arc: true, speed: 11 },
  grenadeDepth: { model: 'w-depth', gravity: 14, arc: true, speed: 11 },
  grenadeOil: { model: 'w-oil', gravity: 14, arc: true, speed: 11 },
  anchor: { model: 'w-anchor', scale: 1.4, gravity: 14, arc: true, speed: 13, marker: 2 },
  rock: { mesh: 'rock', gravity: 20, arc: true, speed: 10 },
};

export class Projectile {
  constructor(area, kind, from, to, o = {}) {
    this.area = area;
    this.kind = kind;
    this.k = KINDS[kind];
    this.owner = o.owner ?? null;
    this.onLand = o.onLand;
    this.damage = o.damage ?? 15;
    this.pos = new Vector3(from[0], from[1], from[2]);
    this.prev = this.pos.clone();
    this.alive = true;
    this.age = 0;
    this.targetPos = new Vector3(to[0], to[1], to[2]);
    const dx = to[0] - from[0]; const dy = to[1] - from[1]; const dz = to[2] - from[2];
    const flat = Math.hypot(dx, dz);
    const speed = o.speed ?? this.k.speed;
    if (this.k.arc) {
      const T = Math.max(0.35, flat / speed);
      this.vel = new Vector3(dx / T, (dy + 0.5 * this.k.gravity * T * T) / T, dz / T);
      this.flight = T;
    } else {
      const d = Math.hypot(flat, dy) || 1;
      this.vel = new Vector3((dx / d) * speed, (dy / d) * speed, (dz / d) * speed);
      this.flight = (d + 8) / speed;
    }
    this.obj = this.makeMesh();
    area.ctx.scene.add(this.obj);
    this.obj.position.copy(this.pos);
    if (this.k.shootable) {
      this.sh = { active: true, pos: this.pos, radius: this.k.radius, solid: true, onHit: (h) => this.onShot(h), label: kind };
      area.shootables.push(this.sh);
    }
    if (o.light) this.light = area.ctx.lights.request({ follow: this.obj, offset: [0, 0, 0], color: o.light, intensity: 3, radius: 4, priority: 2 });
    // The arc is telegraphed: a thin red ring where it comes down, as wide as what it does when it lands.
    if (this.k.marker) {
      const r = new Mesh(new RingGeometry(this.k.marker - 0.09, this.k.marker, 28), glowMaterial(PALETTE.red));
      r.rotation.x = -Math.PI / 2;
      r.position.set(to[0], Math.max(0, to[1]) + 0.05, to[2]);
      r.castShadow = false;
      setLookLayer(r, 'actors');
      area.ctx.scene.add(r);
      this.ring = r;
    }
  }

  makeMesh() {
    const { k, area } = this;
    if (k.model) {
      const b = buildModel(k.model, { catalog: MODELS });
      setLookLayer(b.object, 'actors');
      if (k.scale) b.object.scale.setScalar(k.scale);
      return b.object;
    }
    let m;
    if (k.mesh === 'net') m = new Mesh(new BoxGeometry(1.1, 0.06, 1.1), toonMaterial(PALETTE.sand));
    else if (k.mesh === 'rivet') m = new Mesh(new BoxGeometry(0.18, 0.18, 0.3), glowMaterial(PALETTE.orange));
    else if (k.mesh === 'glob') m = new Mesh(new SphereGeometry(0.3, 6, 5), glowMaterial(PALETTE.lime));
    else m = new Mesh(new BoxGeometry(0.9, 0.7, 0.9), toonMaterial(PALETTE.slate));
    setLookLayer(m, 'actors');
    return m;
  }

  step(dt) {
    const { area, k } = this;
    this.age += dt;
    this.prev.copy(this.pos);
    this.vel.y -= k.gravity * dt;
    this.pos.addScaledVector(this.vel, dt);
    if (this.kind.startsWith('grenade') || this.kind === 'bottle') {
      this.smokeT = (this.smokeT ?? 0) - dt;
      if (this.smokeT <= 0) { this.smokeT = 0.07; area.ctx.particles.burst('ember', this.pos, { count: 1 }); }
    }
    // Hits Max in flight (straight things).
    if (!k.arc && this.owner) {
      for (const p of area.players) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 0.5 && Math.abs(p.y + 1 - this.pos.y) < 1) { this.land('hit', p); return; }
      }
    }
    const hitGround = this.pos.y <= 0.05 + (area.floorY?.(this.pos.x, this.pos.z) ?? 0);
    if (hitGround || this.age > this.flight + 0.5) { this.land('ground'); return; }
    // A wall: land where it stands.
    if (area.level.info.at(this.pos.x, this.pos.z) === '#' && this.pos.y < 3) { this.land('ground'); }
  }

  frame() {
    if (!this.alive) return;
    this.obj.position.copy(this.pos);
    if (this.k.model) {
      if (this.kind === 'harpoon') this.obj.rotation.y = Math.atan2(this.vel.x, this.vel.z);
      else { this.obj.rotation.x += 0.2; this.obj.rotation.z += 0.13; }
    } else if (this.k.mesh === 'net') this.obj.rotation.y += 0.25;
  }

  onShot() {
    const { area } = this;
    if (!this.alive) return;
    // Shot out of the air: its effect happens up there, not on you.
    area.ctx.audio.play('bottleSmash', area.spatial(this.pos.x, this.pos.z, 30));
    if (this.kind === 'bottle') {
      area.ctx.particles.burst('flame', this.pos, { count: 12 });
      area.addFirePool(this.pos.x, this.pos.z, 1.6, 2, 15, this.pos.y > 2);
      if (this.owner && !this.owner.dead && Math.hypot(this.owner.x - this.pos.x, this.owner.z - this.pos.z) < 2.2) this.owner.hitFire();
    } else {
      area.ctx.particles.burst('spark', this.pos);
    }
    this.finish();
  }

  land(how, who) {
    const { area, kind } = this;
    const x = this.pos.x; const z = this.pos.z;
    if (this.onLand) { this.onLand(x, z, how, who); this.finish(); return; }
    switch (kind) {
      case 'bottle':
        area.ctx.audio.play('bottleSmash', area.spatial(x, z, 30));
        area.fx.fireAt(x, 0, z, 2);
        for (const p of area.players) if (p.alive && Math.hypot(p.x - x, p.z - z) < 1.3) p.hurt(this.damage, { x, z }, {});
        area.addFirePool(x, z, 1.9, 2.2, 6);
        break;
      case 'net':
        for (const p of area.players) if (p.alive && Math.hypot(p.x - x, p.z - z) < 1.8) { p.applySlow(0.6, 3); area.ctx.audio.play('chain'); area.hud?.flashText('NETTED'); }
        area.ctx.particles.burst('dust', [x, 0.1, z]);
        break;
      case 'harpoon':
      case 'rivet':
        if (how === 'hit') who.hurt(this.damage, { x: x - this.vel.x, z: z - this.vel.z });
        area.ctx.particles.burst('spark', this.pos);
        break;
      case 'glob':
        area.ctx.particles.burst('brine', [x, 0.2, z]);
        for (const p of area.players) if (p.alive && Math.hypot(p.x - x, p.z - z) < 1.6) p.hurt(this.damage, { x, z });
        area.ctx.audio.play('spit', area.spatial(x, z, 20));
        break;
      case 'grenadeFlare': this.flare(x, z); return;
      case 'grenadeDepth': this.depth(x, z); return;
      case 'grenadeOil':
        area.ctx.audio.play('bottleSmash', area.spatial(x, z, 30));
        area.fx.fireAt(x, 0, z, GRENADES.oil.radius);
        area.addFirePool(x, z, GRENADES.oil.radius, GRENADES.oil.burn, GRENADES.oil.dps, false, true);
        break;
      default: break;
    }
    this.finish();
  }

  flare(x, z) {
    const { area } = this;
    this.vel.set(0, 0, 0);
    this.k = { ...this.k, gravity: 0 };
    area.ctx.audio.play('flareHiss', area.spatial(x, z, 40));
    area.ctx.particles.burst('flareSpark', [x, 0.4, z], { count: 30 });
    area.ctx.lights.request({ position: [x, 1.4, z], color: 0xffffff, intensity: 28, radius: 16, lifetime: 1.1, fadeIn: 0, fadeOut: 0.5, priority: 9 });
    area.ctx.engine.screen?.flash?.('white', { duration: 0.12 });
    for (const e of [...area.enemies]) {
      if (!e.dead && Math.hypot(e.x - x, e.z - z) < GRENADES.flare.radius) e.blind(GRENADES.flare.blind);
    }
    area.def?.onFlare?.(area, x, z);
    this.finish();
  }

  depth(x, z) {
    const { area } = this;
    this.pos.y = 0.15;
    this.vel.set(0, 0, 0);
    this.k = { ...this.k, gravity: 0, arc: true };
    this.obj.position.copy(this.pos);
    area.ctx.audio.play('fuseTick', area.spatial(x, z, 20));
    area.addDelayed(GRENADES.depth.fuse, () => {
      area.ctx.audio.play('depthCharge', area.spatial(x, z, 60));
      explode(area, x, 0, z, GRENADES.depth.radius, GRENADES.depth.damage);
      this.finish();
    });
    this.parked = true;
    this.alive = true;
    this.flight = 99;
    this.stepFrozen = true;
  }

  finish() {
    const { area } = this;
    if (!this.alive && !this.parked) return;
    this.alive = false;
    this.parked = false;
    if (this.sh) { this.sh.active = false; const i = area.shootables.indexOf(this.sh); if (i >= 0) area.shootables.splice(i, 1); }
    this.light?.release();
    area.ctx.scene.remove(this.obj);
    if (this.ring) { area.ctx.scene.remove(this.ring); this.ring.geometry.dispose(); this.ring = null; }
  }
}

/** Fire pools burn the ground, everyone in them, and heat the Dame's temper. */
export class FirePool {
  constructor(area, x, z, r, life, dps, airborne = false, friendly = false) {
    this.area = area; this.x = x; this.z = z; this.r = r; this.life = life; this.dps = dps;
    this.friendly = friendly;
    this.alive = true;
    this.t = 0;
    this.airborne = airborne;
    this.light = area.ctx.lights.request({ position: [x, 0.6, z], color: 0xff8030, intensity: 6, radius: r * 3, flicker: 'torch', lifetime: life, priority: 2 });
    this.loop = null;
  }
  step(dt) {
    this.life -= dt;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.09;
      const { area } = this;
      area.ctx.particles.burst('flame', [this.x + area.fx.rng.range(-this.r, this.r) * 0.7, 0.2, this.z + area.fx.rng.range(-this.r, this.r) * 0.7], { count: 1 });
    }
    const { area } = this;
    for (const e of area.enemies) {
      if (!e.dead && Math.hypot(e.x - this.x, e.z - this.z) < this.r) {
        e.hp -= this.dps * dt;
        if (e.hp <= 0) e.die({ weapon: { id: 'fire' }, dir: new Vector3(0, 0, 1), zone: 'torso' });
        else if (!e.d.mute && e.state === 'APPROACH' && e.cool < -1) { e.cool = 1.5; e.flinch(); }
      }
    }
    if (!this.airborne) {
      for (const p of area.players) {
        if (p.alive && p.y < 1 && Math.hypot(p.x - this.x, p.z - this.z) < this.r) p.hurt(this.dps * dt * (this.friendly ? 0.5 : 1), { x: this.x, z: this.z }, { dot: true });
      }
    }
    if (this.life <= 0) this.alive = false;
  }
}
export { TUNING };
