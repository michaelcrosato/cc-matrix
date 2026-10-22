// Visual effects: explosions, sparks, trails, screen feedback hooks.
import { THREE, R, glowMat, toon, mk } from './render.js';
import { rr, TAU } from './util.js';
import { audio } from './audio.js';

const tmp = new THREE.Vector3();
export class FX {
  constructor(scene) {
    this.scene = scene; this.shock = []; this.shake = 0; this.flash = 0;
    this.pool = [];
  }
  spark(pos, n = 8, col = 0xffe9a0, speed = 30) {
    for (let i = 0; i < n; i++) {
      tmp.set(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.3, 1));
      R.particles.emit({ pos, vel: tmp, size: rr(0.5, 1.1), size1: 0, life: rr(0.2, 0.5), color: col, color1: 0xff6a20, drag: 2 });
    }
  }
  explosion(pos, scale = 1, opts = {}) {
    const n = Math.floor(14 * scale + 6);
    for (let i = 0; i < n; i++) {
      tmp.set(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(rr(6, 26) * scale);
      R.particles.emit({ pos, vel: tmp, size: rr(2, 4.5) * scale, size1: rr(5, 9) * scale, life: rr(0.5, 1.1), color: 0xfff2b0, color1: 0xff4a10, drag: 3 });
    }
    for (let i = 0; i < 6 * scale + 2; i++) {
      tmp.set(rr(-1, 1), rr(-0.2, 1), rr(-1, 1)).normalize().multiplyScalar(rr(3, 12) * scale);
      R.particles.emit({ pos, vel: tmp, size: rr(3, 6) * scale, size1: rr(8, 14) * scale, life: rr(0.9, 1.6), color: 0x504040, color1: 0x201820, drag: 1.5, tex: 'smoke', normal: true, opacity: 0.8, spin: rr(-1, 1) });
    }
    R.particles.emit({ pos, vel: { x: 0, y: 0, z: 0 }, size: 3 * scale, size1: 18 * scale, life: 0.3, color: 0xffffff, color1: 0xffaa40 });
    // cel shockwave ring
    this.addShock(pos, 14 * scale, 0.45, 0xffe0a0);
    audio.sfx(scale > 2 ? 'bigExplode' : 'explode');
    if (opts.shake !== 0) this.shake = Math.max(this.shake, Math.min(1.2, 0.18 * scale));
  }
  addShock(pos, maxR, life, col) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glowMat(col, 0.5));
    m.position.copy(pos); m.scale.setScalar(0.5); this.scene.add(m);
    this.shock.push({ m, t: 0, life, maxR });
  }
  smoke(pos, vel, size = 2, col = 0x403840) {
    R.particles.emit({ pos, vel, size, size1: size * 3, life: 1.1, color: col, color1: 0x100c14, tex: 'smoke', normal: true, opacity: 0.6, drag: 1, spin: 0.5 });
  }
  flame(pos, vel, size = 1.5) { R.particles.emit({ pos, vel, size, size1: 0.1, life: 0.35, color: 0x9ffcff, color1: 0x2a6aff, drag: 1 }); }
  update(dt) {
    for (let i = this.shock.length - 1; i >= 0; i--) {
      const s = this.shock[i]; s.t += dt; const u = s.t / s.life;
      if (u >= 1) { this.scene.remove(s.m); s.m.geometry.dispose(); this.shock.splice(i, 1); continue; }
      s.m.scale.setScalar(0.5 + u * s.maxR); s.m.material.opacity = 0.5 * (1 - u);
    }
    this.shake = Math.max(0, this.shake - dt * 1.6); this.flash = Math.max(0, this.flash - dt * 2.5);
  }
  clear() { for (const s of this.shock) this.scene.remove(s.m); this.shock.length = 0; this.shake = 0; }
}
