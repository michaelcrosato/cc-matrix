// Effects: particles, decals, muzzle lights, hit sparks, splashes. Cosmetic: draws from forked rng only.
import { THREE, Decals } from '../../pixel-engine.js';
const { Vector3 } = THREE;

export class Fx {
  constructor(ctx) {
    this.ctx = ctx;
    this.decals = new Decals(ctx.scene);
    const p = ctx.particles;
    p.register('blood', { count: [6, 9], life: [0.35, 0.7], speed: [1.5, 3.5], gravity: 9, size: [2, 1], colors: ['plum', 'plum', 'red'], radius: 0.05 });
    p.register('chunk', { count: [4, 6], life: [0.5, 0.9], speed: [2, 4.5], gravity: 11, size: [2, 2], colors: ['plum', 'teal', 'slate'] });
    p.register('spark', { count: [5, 8], life: [0.15, 0.35], speed: [2, 5], gravity: 6, size: [1, 1], colors: ['white', 'sand', 'orange'] });
    p.register('ember', { count: [3, 5], life: [0.6, 1.1], speed: [0.6, 1.6], gravity: -2, size: [1, 1], colors: ['sand', 'orange', 'red'] });
    p.register('splashp', { count: [10, 14], life: [0.4, 0.8], speed: [1.5, 3.5], gravity: 9, size: [1, 1], colors: ['white', 'sky', 'cyan'] });
    p.register('boom', { count: [26, 34], life: [0.4, 0.9], speed: [3, 8], gravity: 3, size: [3, 1], colors: ['white', 'sand', 'orange', 'red', 'slate'] });
    p.register('breath', { count: [1, 1], life: [0.8, 1.2], speed: [0.2, 0.4], gravity: -0.3, size: [2, 1], colors: ['white', 'mist'] });
    p.register('brine', { count: [8, 12], life: [0.5, 1], speed: [1, 3], gravity: 6, size: [2, 1], colors: ['cyan', 'teal', 'white'] });
    this.rnd = ctx.random.fork('fx');
  }
  bloodAt(pt, blocked) {
    if (blocked) { this.ctx.particles.burst('spark', pt); return; }
    this.ctx.particles.burst('blood', pt);
    if (this.rnd.chance(0.3)) this.ctx.particles.burst('chunk', pt, { count: 3 });
  }
  sparks(pt) { this.ctx.particles.burst('spark', pt); }
  splash(x, z) { this.ctx.particles.burst('splashp', new Vector3(x, 0.1, z)); }
  boom(pt) { this.ctx.particles.burst('boom', pt); this.ctx.particles.burst('smoke', pt, { count: 10 }); }
  decal(shape, at, normal, size) { try { this.decals.add(shape, at, normal, { size }); } catch { /* pool full */ } }
  splat(x, z) { this.decal('splat', new Vector3(x, 0.02, z), new Vector3(0, 1, 0), 0.5 + this.rnd.range(0, 0.5)); }
  scorch(pt, n) { this.decal('scorch', pt, n || new Vector3(0, 1, 0), 0.35); }
  muzzle(pos) { this.ctx.lights.request({ position: [pos.x, pos.y, pos.z], color: 0xffc060, intensity: 8, radius: 6, lifetime: 0.06 }); }
  update(dt) { this.decals.update(dt); }
}
