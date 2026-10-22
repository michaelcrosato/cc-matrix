// Stylised effects: cartoon fireballs, smoke puffs, sparks, shockwaves, ribbon trails.
import { THREE, gfx, toon, glow, geo, mesh } from './gfx.js';
import { physics } from './physics.js';
import { rand } from './config.js';

const tmp = new THREE.Vector3();

class Particles {
  constructor() { this.list = []; this.pools = {}; this.root = null; }
  attach(scene) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.list.length = 0; this.pools = {};
  }
  _get(kind, make) {
    const pool = this.pools[kind] || (this.pools[kind] = []);
    let m = pool.pop();
    if (!m) { m = make(); }
    m.visible = true;
    this.root.add(m);
    return m;
  }
  _release(p) {
    p.mesh.visible = false;
    this.root.remove(p.mesh);
    if (p.kind) (this.pools[p.kind] || (this.pools[p.kind] = [])).push(p.mesh);
  }
  add(p) { this.list.push(p); return p; }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { this._release(p); this.list.splice(i, 1); continue; }
      if (p.vel) {
        p.vel.y -= (p.grav || 0) * dt;
        if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
        p.mesh.position.addScaledVector(p.vel, dt);
      }
      if (p.follow) p.mesh.position.copy(p.follow.position);
      const s = p.scaleFn ? p.scaleFn(k) : 1;
      p.mesh.scale.setScalar(Math.max(0.001, s * p.size));
      if (p.spin) p.mesh.rotation.x += p.spin * dt, p.mesh.rotation.y += p.spin * 0.7 * dt;
      if (p.fade && p.mesh.material.opacity !== undefined) p.mesh.material.opacity = (1 - k) * p.baseOpacity;
      if (p.stretch) { p.mesh.lookAt(tmp.copy(p.mesh.position).add(p.vel)); p.mesh.scale.z *= p.stretch; }
    }
  }
  clear() { for (const p of this.list) this._release(p); this.list.length = 0; }

  // ---------- emitters ----------
  fireball(pos, size = 1, col = 0xffa020) {
    const m = this._get('fire' + col, () => mesh(geo('ico', 1, 1), glow(col, 2.2), { cast: false, receive: false }));
    m.position.copy(pos).add(tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(size * 1.2));
    m.rotation.set(rand(0, 6), rand(0, 6), 0);
    this.add({ kind: 'fire' + col, mesh: m, t: 0, life: rand(0.35, 0.6), size: size * rand(1.4, 2.4), vel: tmp.clone().set(rand(-3, 3), rand(1, 5), rand(-3, 3)), drag: 2,
      scaleFn: (k) => (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75 * 0.999) });
  }
  smoke(pos, size = 1) {
    const m = this._get('smoke', () => mesh(geo('ico', 1, 1), toon(0x55555f, { flat: false }), { cast: false, receive: false }));
    m.position.copy(pos);
    this.add({ kind: 'smoke', mesh: m, t: 0, life: rand(0.9, 1.6), size: size * rand(1.2, 2.2), vel: new THREE.Vector3(rand(-2, 2), rand(3, 7), rand(-2, 2)), drag: 1.5,
      scaleFn: (k) => (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) });
  }
  spark(pos, vel, col = 0xffdd66, life = 0.5, size = 0.35) {
    const m = this._get('spark' + col, () => mesh(geo('box', 0.3, 0.3, 1.6), glow(col, 4), { cast: false, receive: false }));
    m.position.copy(pos);
    this.add({ kind: 'spark' + col, mesh: m, t: 0, life: life * rand(0.6, 1.2), size: size * 3, vel: vel.clone(), grav: 20, drag: 1.2, stretch: 1, scaleFn: (k) => 1 - k });
  }
  ring(pos, size = 10, col = 0xffcc66, life = 0.5, quat = null) {
    const mat = glow(col, 2.5, { additive: true }).clone();
    const m = mesh(geo('torus', 1, 0.08, 4, 32), mat, { cast: false, receive: false });
    m.position.copy(pos);
    if (quat) m.quaternion.copy(quat); else m.lookAt(gfx.camera.position);
    this.root.add(m);
    this.add({ mesh: m, t: 0, life, size, fade: true, baseOpacity: 1, scaleFn: (k) => 0.2 + Math.pow(k, 0.5) });
  }
  flash(pos, size = 4, col = 0xffffff) {
    const m = this._get('flash' + col, () => mesh(geo('sphere', 1, 10, 8), glow(col, 4, { additive: true }), { cast: false, receive: false }));
    m.position.copy(pos);
    this.add({ kind: 'flash' + col, mesh: m, t: 0, life: 0.15, size, scaleFn: (k) => 1 - k * 0.6 });
  }
  hitSpark(pos, col = 0xffffaa) {
    this.flash(pos, 1.6, col);
    for (let i = 0; i < 5; i++) this.spark(pos, tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(15, 30)), col, 0.3, 0.25);
  }
  explode(pos, size = 1, debrisColor = 0x888888, debrisCount = 6, scene = gfx.scene) {
    const n = Math.ceil(4 + size * 4);
    for (let i = 0; i < n; i++) this.fireball(pos, size, i % 3 === 0 ? 0xfff070 : i % 3 === 1 ? 0xff9020 : 0xff4a18);
    for (let i = 0; i < Math.ceil(size * 3); i++) this.smoke(tmp.copy(pos).add(new THREE.Vector3(rand(-2, 2), rand(-1, 2), rand(-2, 2)).multiplyScalar(size)), size);
    for (let i = 0; i < 6 + size * 6; i++) this.spark(pos, new THREE.Vector3(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize().multiplyScalar(rand(20, 45) * Math.sqrt(size)));
    this.flash(pos, 4 * size);
    this.ring(pos, 9 * size, 0xffd080, 0.45);
    // physical debris chunks
    const dm = toon(debrisColor);
    for (let i = 0; i < debrisCount; i++) {
      const s = rand(0.4, 1.0) * Math.min(2.5, size);
      const ch = mesh(geo('box', 1, 1, 1), dm, { cast: true, receive: false });
      ch.scale.setScalar(s);
      physics.spawnDebris(ch, tmp.copy(pos).add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))),
        new THREE.Vector3(rand(-25, 25), rand(5, 35), rand(-25, 25)).multiplyScalar(Math.sqrt(size)), scene, { size: s * 0.5, life: 3.5 });
    }
  }
}
export const fx = new Particles();

// Ribbon trail (additive, fades along length)
export class Trail {
  constructor(scene, color = 0xffffff, length = 24, width = 0.35) {
    this.n = length; this.width = width;
    this.points = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 2 * 3);
    this.col = new Float32Array(this.n * 2 * 3);
    const idx = [];
    for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.n * 2 * 3).fill(0.577), 3));
    const c = new THREE.Color(color);
    this.color = c;
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.intensity = 0;
  }
  update(p, up, intensity) {
    this.intensity += (intensity - this.intensity) * 0.2;
    this.points.unshift({ p: p.clone(), u: up.clone() });
    if (this.points.length > this.n) this.points.pop();
    for (let i = 0; i < this.n; i++) {
      const q = this.points[Math.min(i, this.points.length - 1)];
      if (!q) continue;
      const w = this.width * (1 - i / this.n);
      const a = i * 6;
      this.pos[a] = q.p.x + q.u.x * w; this.pos[a + 1] = q.p.y + q.u.y * w; this.pos[a + 2] = q.p.z + q.u.z * w;
      this.pos[a + 3] = q.p.x - q.u.x * w; this.pos[a + 4] = q.p.y - q.u.y * w; this.pos[a + 5] = q.p.z - q.u.z * w;
      const f = (1 - i / this.n) * this.intensity;
      for (let k = 0; k < 2; k++) { this.col[a + k * 3] = this.color.r * f; this.col[a + k * 3 + 1] = this.color.g * f; this.col[a + k * 3 + 2] = this.color.b * f; }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }
  reset() { this.points.length = 0; }
  dispose() { this.mesh.parent && this.mesh.parent.remove(this.mesh); this.mesh.geometry.dispose(); }
}

// projectile meshes (shared geometry/material per type)
export function makeBoltMesh(kind) {
  if (kind === 'p0') return mesh(geo('box', 0.35, 0.35, 5), glow(0x55ff77, 4), { cast: false, receive: false });
  if (kind === 'p1') return mesh(geo('box', 0.4, 0.4, 5.5), glow(0x66ff99, 4.5), { cast: false, receive: false });
  if (kind === 'p2') return mesh(geo('box', 0.6, 0.6, 6.5), glow(0x55aaff, 5), { cast: false, receive: false });
  if (kind === 'charge') {
    const g = new THREE.Group();
    g.add(mesh(geo('ico', 1.4, 1), glow(0x88ff66, 4), { cast: false, receive: false }));
    g.add(mesh(geo('torus', 2.0, 0.2, 4, 16), glow(0xccff88, 3, { additive: true }), { cast: false, receive: false }));
    return g;
  }
  if (kind === 'bomb') {
    const g = new THREE.Group();
    g.add(mesh(geo('sphere', 1.0, 10, 8), glow(0xff4060, 3.5), { cast: false, receive: false }));
    g.add(mesh(geo('torus', 1.6, 0.18, 4, 16), glow(0xffaaaa, 3, { additive: true }), { cast: false, receive: false }));
    return g;
  }
  if (kind === 'missile') {
    const g = new THREE.Group();
    g.add(mesh(geo('cyl', 0.35, 0.35, 2.6, 6), toon(0xdddddd), { cast: false, receive: false }));
    g.children[0].rotation.x = Math.PI / 2;
    g.add(mesh(geo('cone', 0.4, 0.9, 6), toon(0xff3030), { cast: false, receive: false }));
    g.children[1].rotation.x = Math.PI / 2; g.children[1].position.z = 1.7;
    const fl = mesh(geo('sphere', 0.45, 6, 4), glow(0xffaa33, 4, { additive: true }), { cast: false, receive: false });
    fl.position.z = -1.6; fl.scale.set(1, 1, 2); g.add(fl);
    return g;
  }
  if (kind === 'e0') return mesh(geo('sphere', 0.7, 8, 6), glow(0xff5530, 4), { cast: false, receive: false });
  if (kind === 'e1') return mesh(geo('box', 0.5, 0.5, 4), glow(0xff3070, 4), { cast: false, receive: false });
  if (kind === 'eBig') return mesh(geo('ico', 1.4, 1), glow(0xff8833, 3.5), { cast: false, receive: false });
  if (kind === 'friend') return mesh(geo('box', 0.3, 0.3, 4.5), glow(0x66ddff, 4), { cast: false, receive: false });
  return mesh(geo('sphere', 0.5, 6, 4), glow(0xffffff, 3), { cast: false, receive: false });
}
