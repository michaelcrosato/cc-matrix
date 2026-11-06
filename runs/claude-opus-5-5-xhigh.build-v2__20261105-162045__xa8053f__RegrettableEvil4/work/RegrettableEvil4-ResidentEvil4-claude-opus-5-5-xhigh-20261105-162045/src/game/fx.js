// Effects: particles, lights, decals, muzzle flash, blood, explosions, fire pools. Cosmetic random comes
// from a fork made in setup.
import { Decals, PALETTE, THREE, glowMaterial, buildModel, setLookLayer, toonMaterial } from '../../pixel-engine.js';
import { HEADLESS } from '../config.js';
import { MODELS } from '../models/index.js';

const { BoxGeometry, Mesh, Vector3 } = THREE;
const v = new Vector3();

export function registerParticles(particles) {
  particles.register('blood', { count: [5, 9], life: [0.25, 0.55], speed: [1.5, 4], spread: 60, gravity: 10, size: [2, 1], colors: ['plum', 'plum', 'teal'], drag: 1 });
  particles.register('gore', { count: [10, 16], life: [0.4, 0.9], speed: [2, 6], spread: 180, gravity: 14, size: [3, 1], colors: ['plum', 'teal', 'red', 'plum'], drag: 0.5 });
  particles.register('spark', { count: [4, 8], life: [0.1, 0.3], speed: [3, 7], spread: 70, gravity: 8, size: [1, 1], colors: ['white', 'sand', 'orange'] });
  particles.register('muzzle', { count: [3, 5], life: [0.04, 0.1], speed: [2, 5], spread: 25, size: [2, 1], colors: ['white', 'sand', 'orange'] });
  particles.register('ember', { count: [6, 10], life: [0.5, 1.1], speed: [0.6, 2], gravity: -2, size: [1, 1], colors: ['sand', 'orange', 'red'], radius: 0.4 });
  particles.register('flame', { count: [3, 5], life: [0.25, 0.5], speed: [0.8, 1.8], gravity: -3, size: [3, 1], colors: ['white', 'sand', 'orange', 'red'], radius: 0.35 });
  particles.register('steam', { count: [6, 10], life: [0.4, 0.9], speed: [1.5, 3], spread: 22, gravity: -2, size: [2, 4], colors: ['white', 'mist', 'slate'], drag: 1.5 });
  particles.register('smokeBig', { count: [14, 20], life: [0.6, 1.2], speed: [1, 3], spread: 180, gravity: -1.5, size: [3, 6], colors: ['slate', 'night', 'ink'], drag: 1, radius: 0.6 });
  particles.register('splash', { count: [8, 14], life: [0.25, 0.6], speed: [1.5, 4], spread: 35, gravity: 12, size: [2, 1], colors: ['white', 'cyan', 'sky'] });
  particles.register('bubble', { count: [1, 3], life: [0.5, 1], speed: [0.3, 0.8], spread: 30, gravity: -1, size: [1, 1], colors: ['cyan', 'white'] });
  particles.register('breath', { count: [2, 3], life: [0.5, 0.9], speed: [0.2, 0.5], spread: 30, gravity: -0.5, size: [2, 3], colors: ['white', 'mist'], drag: 1 });
  particles.register('glass', { count: [10, 16], life: [0.3, 0.7], speed: [1, 4], spread: 180, gravity: 12, size: [1, 1], colors: ['white', 'cyan', 'sky'] });
  particles.register('chips', { count: [10, 16], life: [0.3, 0.8], speed: [2, 5], spread: 100, gravity: 12, size: [2, 1], colors: ['orange', 'sand', 'plum'] });
  particles.register('brine', { count: [18, 28], life: [0.4, 0.9], speed: [3, 7], spread: 180, gravity: 10, size: [2, 1], colors: ['lime', 'green', 'teal'] });
  particles.register('flareSpark', { count: [8, 14], life: [0.2, 0.5], speed: [2, 6], spread: 180, gravity: 4, size: [1, 1], colors: ['white', 'sand'] });
  particles.register('gullUp', { count: [6, 9], life: [1.5, 2.5], speed: [3, 6], spread: 50, gravity: -1, size: [1, 1], colors: ['white', 'mist'], radius: 2 });
  particles.register('falling', { count: [6, 10], life: [0.6, 1], speed: [1, 2], spread: 60, gravity: 14, size: [2, 1], colors: ['slate', 'night'] });
}

export class Fx {
  constructor(area, ctx) {
    this.area = area;
    this.ctx = ctx;
    this.rng = ctx.random.fork('fx');
    this.decals = HEADLESS ? null : new Decals(ctx.scene, { capacity: 160 });
    this.lastImpact = new Vector3();
    this.fires = [];
    this.temp = [];
    registerParticles(ctx.particles);
  }

  tracerEnd() { /* the laser and muzzle flash carry it: no tracer lines at this art resolution */ }

  muzzle(at, stats) {
    const { ctx } = this;
    ctx.lights.request({ position: at, color: 0xffc060, intensity: stats.pellets > 1 ? 14 : 8, radius: 6, lifetime: 0.06, fadeIn: 0, fadeOut: 0.03 });
    ctx.particles.burst('muzzle', at);
    if (stats.pellets > 1) ctx.particles.burst('smoke', at, { count: 3 });
  }

  impact(point, normal) {
    const { ctx } = this;
    ctx.particles.burst('impact', point, { count: 4 });
    this.decals?.add('scorch', point, normal, { size: 0.26, life: 14, color: PALETTE.ink });
  }

  sparks(point) { this.ctx.particles.burst('spark', point); }

  bodyHit(enemy, h) {
    const { ctx } = this;
    enemy.actor?.flash(2);
    ctx.particles.burst('blood', h.point ?? enemy.pos3());
    const gx = enemy.x + (h.dir?.x ?? 0) * 0.6; const gz = enemy.z + (h.dir?.z ?? 0) * 0.6;
    this.decals?.add('splat', { x: gx, y: enemy.y + 0.02, z: gz }, { x: 0, y: 1, z: 0 }, { size: 0.7, life: 26, color: PALETTE.plum });
  }

  flashBody(enemy) { enemy.actor?.flash(2); }

  headPop(enemy) {
    const z = enemy.zones;
    const at = z ? z.head.c : enemy.pos3();
    this.ctx.particles.burst('gore', at);
    this.decals?.add('splat', { x: enemy.x, y: enemy.y + 0.02, z: enemy.z }, { x: 0, y: 1, z: 0 }, { size: 1.3, life: 30, color: PALETTE.plum });
  }

  limpetBurst(x, y, z) { this.ctx.particles.burst('brine', [x, y + 0.2, z], { count: 10 }); this.ctx.audio.play('limpetPop', this.area.spatial(x, z, 20)); }
  blood(x, y, z) { this.ctx.particles.burst('blood', [x, y, z], { colors: ['red', 'plum', 'red'] }); }

  kickBurst(by) {
    const fx = Math.sin(by.facing); const fz = Math.cos(by.facing);
    this.ctx.particles.burst('dust', [by.x + fx, by.y + 0.2, by.z + fz], { count: 10 });
    this.ctx.particles.burst('impact', [by.x + fx * 1.3, by.y + 1, by.z + fz * 1.3], { count: 6 });
  }

  explosion(x, y, z, radius) {
    const { ctx } = this;
    ctx.engine.shake.add(0.7);
    ctx.engine.hitstop(0.06);
    ctx.particles.burst('smokeBig', [x, y + 0.6, z]);
    ctx.particles.burst('ember', [x, y + 0.6, z], { count: 24, speed: 2.4 });
    ctx.particles.burst('flame', [x, y + 0.5, z], { count: 14, speed: 2 });
    ctx.lights.request({ position: [x, y + 1.5, z], color: 0xffa040, intensity: 22, radius: radius * 3.2, lifetime: 0.28, fadeIn: 0, fadeOut: 0.2, priority: 6 });
    if (!HEADLESS) ctx.engine.screen.shockwave([x, y + 1, z], { radius: 0.32 });
    this.decals?.add('scorch', { x, y: y + 0.03, z }, { x: 0, y: 1, z: 0 }, { size: radius * 1.5, life: 30, color: PALETTE.ink });
  }

  fireAt(x, y, z, r) {
    this.ctx.particles.burst('flame', [x, y + 0.3, z], { count: Math.round(r * 8) });
    this.ctx.particles.burst('ember', [x, y + 0.3, z]);
  }

  /** A loose thing falls to the floor and stays a moment. */
  dropProp(obj, enemy) {
    const { ctx } = this;
    if (HEADLESS) return;
    const c = obj.clone(true);
    obj.getWorldPosition(v);
    c.position.copy(v);
    c.rotation.set(0.4, enemy.yaw, 0.6);
    c.visible = true;
    ctx.scene.add(c);
    ctx.tweens.to(c.position, { y: enemy.y + 0.08 }, { duration: 0.4, ease: 'outBounce' });
    ctx.tweens.to(c.rotation, { x: Math.PI / 2 }, { duration: 0.35 });
    this.temp.push({ obj: c, t: 14 });
  }

  boltAt(enemy, dir) {
    const { ctx } = this;
    if (HEADLESS) return;
    const b = buildModel('w-bolt', { catalog: MODELS });
    b.object.position.set(enemy.x, enemy.y + 1, enemy.z);
    b.object.rotation.y = Math.atan2(dir.x, dir.z);
    ctx.scene.add(b.object);
    this.temp.push({ obj: b.object, t: enemy.pinFor ?? 4, follow: enemy });
  }

  update(dt) {
    this.decals?.update(dt);
    for (let i = this.temp.length - 1; i >= 0; i--) {
      const t = this.temp[i];
      t.t -= dt;
      if (t.t <= 0) { this.ctx.scene.remove(t.obj); this.temp.splice(i, 1); }
    }
  }
}
