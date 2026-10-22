// Pooled cel-style effects: puff explosions, sparks, shock rings, smoke, light flashes, stuffing fluff.
import * as THREE from 'three/webgpu';
import { toon, glow } from './models.js';

const _v = new THREE.Vector3();

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group(); scene.add(this.group);
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    this.puffMats = [glow(0xffffff, 3), glow(0xfff1a0, 2.6), toon(0xffa53a, { emissive: 0xff7a1a, ei: 0.6 }), toon(0xe0503a), toon(0x6b6670), toon(0x9a96a0)];
    this.puffs = [];
    for (let i = 0; i < 360; i++) {
      const m = new THREE.Mesh(puffGeo, this.puffMats[0]); m.visible = false; m.castShadow = false; this.group.add(m);
      this.puffs.push({ m, life: 0, max: 1, vel: new THREE.Vector3(), size: 1, kind: 0 });
    }
    const sparkGeo = new THREE.BoxGeometry(0.25, 0.25, 1.6);
    this.sparkMats = { y: glow(0xffd36a, 4), b: glow(0x7ad8ff, 4), r: glow(0xff6a6a, 4), g: glow(0x7aff9a, 4), w: glow(0xffffff, 4), p: glow(0xff8ad8, 4) };
    this.sparks = [];
    for (let i = 0; i < 400; i++) {
      const m = new THREE.Mesh(sparkGeo, this.sparkMats.y); m.visible = false; this.group.add(m);
      this.sparks.push({ m, life: 0, max: 1, vel: new THREE.Vector3() });
    }
    // stuffing fluff (white cotton puffs) for plush damage
    const fluffGeo = new THREE.SphereGeometry(0.45, 7, 5);
    this.fluffMat = toon(0xfffaf0);
    this.fluffs = [];
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(fluffGeo, this.fluffMat); m.visible = false; this.group.add(m);
      this.fluffs.push({ m, life: 0, max: 1, vel: new THREE.Vector3() });
    }
    const ringGeo = new THREE.TorusGeometry(1, 0.12, 6, 32);
    this.rings = [];
    for (let i = 0; i < 24; i++) {
      const mat = glow(0xffe6a0, 2.5, { additive: true, unique: true });
      const m = new THREE.Mesh(ringGeo, mat); m.visible = false; this.group.add(m);
      this.rings.push({ m, life: 0, max: 1, size: 1 });
    }
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 80, 1.6); l.visible = true; this.group.add(l);
      this.lights.push({ l, life: 0, max: 1, power: 0 });
    }
    this.pi = 0; this.si = 0; this.fi = 0; this.ri = 0; this.li = 0;
  }
  dispose() { this.scene.remove(this.group); }
  clear() {
    for (const a of [this.puffs, this.sparks, this.fluffs, this.rings]) for (const p of a) { p.life = 0; p.m.visible = false; }
    for (const L of this.lights) { L.life = 0; L.l.intensity = 0; }
  }
  puff(pos, vel, size, life, kind) {
    const p = this.puffs[this.pi = (this.pi + 1) % this.puffs.length];
    p.m.position.copy(pos); p.vel.copy(vel); p.size = size; p.life = p.max = life; p.kind = kind;
    p.m.visible = true; p.m.scale.setScalar(0.01); p.m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    return p;
  }
  explosion(pos, size = 1, opts = {}) {
    const n = Math.round(8 + size * 6);
    for (let i = 0; i < n; i++) {
      _v.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar((4 + Math.random() * 10) * size);
      this.puff(pos, _v, (1.2 + Math.random() * 1.8) * size, 0.5 + Math.random() * 0.5 * size, 0);
    }
    for (let i = 0; i < Math.round(4 + size * 3); i++) {
      _v.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(5 * size);
      this.puff(pos, _v, (1.5 + Math.random()) * size, 1.2 + Math.random() * size, 1);
    }
    this.sparkBurst(pos, Math.round(10 + size * 10), opts.color || 'y', 30 * Math.sqrt(size));
    this.ring(pos, size * 8, opts.ringColor);
    this.flash(pos, opts.light || 0xffa050, 40 * size, 30 + size * 40);
    if (opts.fluff) this.fluff(pos, 10);
  }
  smoke(pos, size = 1) {
    _v.set((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2);
    this.puff(pos, _v, size, 1.0 + Math.random() * 0.6, 2);
  }
  sparkBurst(pos, n, col = 'y', speed = 30) {
    const mat = this.sparkMats[col] || this.sparkMats.y;
    for (let i = 0; i < n; i++) {
      const s = this.sparks[this.si = (this.si + 1) % this.sparks.length];
      s.m.material = mat; s.m.position.copy(pos);
      s.vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      s.life = s.max = 0.3 + Math.random() * 0.4; s.m.visible = true;
    }
  }
  fluff(pos, n) {
    for (let i = 0; i < n; i++) {
      const f = this.fluffs[this.fi = (this.fi + 1) % this.fluffs.length];
      f.m.position.copy(pos); f.vel.set((Math.random() - 0.5) * 14, Math.random() * 10, (Math.random() - 0.5) * 14);
      f.life = f.max = 1 + Math.random(); f.m.visible = true;
    }
  }
  ring(pos, size, colorHex) {
    const r = this.rings[this.ri = (this.ri + 1) % this.rings.length];
    r.m.position.copy(pos); r.size = size; r.life = r.max = 0.5; r.m.visible = true;
    r.m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    r.m.material.opacity = 1;
    return r;
  }
  flash(pos, colorHex, power, range) {
    const L = this.lights[this.li = (this.li + 1) % this.lights.length];
    L.l.position.copy(pos); L.l.color.setHex(colorHex); L.l.distance = range; L.power = power; L.life = L.max = 0.35;
  }
  update(dt, origin) {
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; continue; }
      const t = 1 - p.life / p.max;
      p.m.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(1 - dt * 3);
      if (p.kind === 0) {
        p.m.material = this.puffMats[t < 0.12 ? 0 : t < 0.3 ? 1 : t < 0.6 ? 2 : 3];
        const s = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85 * 0.9;
        p.m.scale.setScalar(Math.max(0.01, p.size * s * (t < 0.15 ? 1 : 1.2 - t * 0.3)));
      } else {
        p.m.material = this.puffMats[p.kind === 1 ? 4 : 5];
        p.vel.y += dt * 4;
        p.m.scale.setScalar(Math.max(0.01, p.size * Math.sin(Math.PI * Math.min(1, t * 1.1))));
      }
    }
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.m.visible = false; continue; }
      s.m.position.addScaledVector(s.vel, dt); s.vel.y -= dt * 12;
      _v.copy(s.m.position).add(s.vel); s.m.lookAt(_v);
      s.m.scale.setScalar(s.life / s.max + 0.2);
    }
    for (const f of this.fluffs) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) { f.m.visible = false; continue; }
      f.m.position.addScaledVector(f.vel, dt); f.vel.multiplyScalar(1 - dt * 2); f.vel.y -= dt * 3;
      f.m.scale.setScalar(Math.min(1, f.life / f.max * 2));
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) { r.m.visible = false; continue; }
      const t = 1 - r.life / r.max;
      r.m.scale.setScalar(r.size * (0.2 + t));
      r.m.material.opacity = 1 - t;
    }
    for (const L of this.lights) {
      if (L.life <= 0) { L.l.intensity = 0; continue; }
      L.life -= dt; L.l.intensity = Math.max(0, L.power * (L.life / L.max)) * 30;
    }
  }
}
