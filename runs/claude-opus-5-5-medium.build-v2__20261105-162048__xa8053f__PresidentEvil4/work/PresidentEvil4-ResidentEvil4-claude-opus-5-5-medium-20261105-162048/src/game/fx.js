// Particles, decals, impact helpers.
import { Decals, PALETTE, THREE } from '../../pixel-engine.js';
export const PARTICLE_DEFS = {
  chunk: { count: [4, 7], life: [0.25, 0.6], speed: [1.5, 4], gravity: 9, size: [2, 1], colors: ['plum', 'teal', 'night'] },
  salt: { count: [6, 9], life: [0.3, 0.7], speed: [1, 3], gravity: 8, size: [1, 1], colors: ['white', 'mist'] },
  spark: { count: [4, 8], life: [0.1, 0.3], speed: [2, 6], gravity: 8, size: [1, 1], colors: ['white', 'sand', 'orange'] },
  splinter: { count: [8, 14], life: [0.4, 0.8], speed: [2, 5], gravity: 11, size: [2, 1], colors: ['orange', 'plum'] },
  fire: { count: [5, 9], life: [0.3, 0.8], speed: [0.6, 1.8], gravity: -3, size: [2, 1], colors: ['sand', 'orange', 'red', 'night'], radius: 0.4 },
  blast: { count: [26, 36], life: [0.3, 0.9], speed: [3, 9], gravity: 4, drag: 2, size: [3, 1], colors: ['white', 'sand', 'orange', 'red', 'night'] },
  splash: { count: [10, 16], life: [0.3, 0.7], speed: [1, 3.4], gravity: 9, size: [1, 1], colors: ['white', 'cyan', 'blue'], direction: [0, 1, 0], spread: 40 },
  steam: { count: [6, 10], life: [0.5, 1.1], speed: [1, 2.4], gravity: -1.5, drag: 1, size: [3, 2], colors: ['white', 'mist', 'slate'], radius: 0.2 },
  breath: { count: [1, 2], life: [0.4, 0.8], speed: [0.2, 0.5], gravity: -0.5, size: [2, 1], colors: ['white', 'mist'] },
  flare: { count: [20, 30], life: [0.3, 1], speed: [2, 6], gravity: 2, size: [2, 1], colors: ['white', 'cyan', 'white', 'sky'] },
  glass: { count: [10, 14], life: [0.3, 0.6], speed: [1.5, 4], gravity: 11, size: [1, 1], colors: ['cyan', 'white', 'sky'] },
  brine: { count: [6, 10], life: [0.3, 0.7], speed: [1.5, 3.4], gravity: 8, size: [2, 1], colors: ['lime', 'green'] },
  feathers: { count: [10, 14], life: [0.8, 1.6], speed: [0.8, 2], gravity: 1, size: [1, 1], colors: ['white', 'mist'] },
};
export function registerParticles(ctx) { for (const k in PARTICLE_DEFS) ctx.particles.register(k, PARTICLE_DEFS[k]); }
export class FX {
  constructor(ctx) { this.ctx = ctx; this.decals = new Decals(ctx.scene, { capacity: 120 }); this.up = new THREE.Vector3(0, 1, 0); }
  shot(at) { this.ctx.lights.request({ position: at, color: 0xffc060, intensity: 8, radius: 6, lifetime: 0.06, fadeIn: 0, fadeOut: 0.04 }); }
  impact(p, n) { this.ctx.particles.burst('impact', p); this.decals.add('scorch', p, n ?? this.up, { size: 0.28, life: 15 }); }
  blood(p, salt) { this.ctx.particles.burst(salt ? 'salt' : 'chunk', p); this.decals.add('splat', { x: p.x, y: 0.02, z: p.z }, this.up, { size: 0.7, color: salt ? PALETTE.white : PALETTE.plum, life: 25 }); }
  blast(p, r = 3) {
    const c = this.ctx; c.particles.burst('blast', p, { scale: r / 3 }); c.lights.request({ position: p, color: 0xff9040, intensity: 22, radius: r * 4, lifetime: 0.3 });
    c.engine.screen?.flash?.('white', { duration: 0.05 }); this.decals.add('scorch', { x: p.x, y: 0.02, z: p.z }, this.up, { size: r, life: 40 }); c.engine.screen?.shockwave?.(p, { radius: 0.3 });
  }
  update(dt) { this.decals.update(dt); }
}
