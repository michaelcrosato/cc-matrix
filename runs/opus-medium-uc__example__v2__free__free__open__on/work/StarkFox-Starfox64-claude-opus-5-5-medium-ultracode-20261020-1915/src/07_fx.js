// ===== 07_fx.js — instanced particles, explosions, shockwaves, flashes, camera shake =====
class Particles {
  constructor(geo, mat, cap) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.cap = cap;
    this.list = [];
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, white);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this._c = new THREE.Color();
    this._c1 = new THREE.Color();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 0, 1);
  }
  spawn(o) {
    if (this.list.length >= this.cap) this.list.shift();
    const p = {
      pos: o.pos.clone(), vel: o.vel ? o.vel.clone() : V3(), life: o.life ?? 1, max: o.life ?? 1,
      s0: o.s0 ?? 1, s1: o.s1 ?? 0, c0: new THREE.Color(o.c0 ?? 0xffffff), c1: new THREE.Color(o.c1 ?? o.c0 ?? 0xffffff),
      drag: o.drag ?? 0, grav: o.grav ?? 0, stretch: o.stretch ?? 0, rot: o.rot ?? rand(0, TAU), spin: o.spin ?? 0, int: o.int ?? 1,
    };
    this.list.push(p);
    return p;
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
  update(dt) {
    let n = 0;
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
    }
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      const k = 1 - p.life / p.max;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.vel.y += p.grav * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.spin * dt;
      const s = lerp(p.s0, p.s1, k);
      if (p.stretch > 0) {
        const sp = p.vel.length();
        if (sp > 0.01) this._q.setFromUnitVectors(this._up, _v3.copy(p.vel).multiplyScalar(1 / sp)); else this._q.identity();
        this._s.set(s, s, s + sp * p.stretch);
      } else {
        this._q.setFromAxisAngle(_v3.set(0.3, 1, 0.2).normalize(), p.rot);
        this._s.set(s, s, s);
      }
      this._m.compose(p.pos, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this._c.copy(p.c0).lerp(p.c1, k).multiplyScalar(p.int);
      this.mesh.setColorAt(n, this._c);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

const FX = {
  puffs: null, fire: null, sparks: null, rings: [], lights: [], shake: 0, shakeT: 0, root: null,
  init() {
    this.root = new THREE.Group();
    const puffMat = new THREE.MeshToonNodeMaterial({ color: 0xffffff, gradientMap: TOON_RAMP });
    this.puffs = new Particles(new THREE.IcosahedronGeometry(1, 1), puffMat, 1600);
    const fireMat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    fireMat.toneMapped = false;
    this.fire = new Particles(new THREE.IcosahedronGeometry(1, 1), fireMat, 1600);
    const sparkMat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    sparkMat.toneMapped = false;
    this.sparks = new Particles(new THREE.BoxGeometry(0.18, 0.18, 1), sparkMat, 1600);
    this.root.add(this.puffs.mesh, this.fire.mesh, this.sparks.mesh);
    for (let i = 0; i < 16; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 48), glow(0xffd27a, 3, { additive: true }).clone());
      r.visible = false; r.userData.t = 0;
      this.root.add(r); this.rings.push(r);
    }
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 120, 1.6);
      l.userData.t = 0; this.root.add(l); this.lights.push(l);
    }
  },
  attach() { R.scene.add(this.root); },
  clear() {
    this.puffs.clear(); this.fire.clear(); this.sparks.clear();
    this.rings.forEach((r) => (r.visible = false));
    this.lights.forEach((l) => (l.intensity = 0));
  },
  smokePuff(pos, size = 2, life = 1, color = 0x9a9aa2) {
    this.puffs.spawn({ pos, vel: V3(rand(-1, 1), rand(1, 3), rand(-1, 1)), life: life * rand(0.7, 1.2), s0: size * 0.6, s1: size * 1.6, c0: color, c1: 0x6a6a72, drag: 1.5 });
  },
  engineTrail(pos, vel, color = 0x59d6ff, size = 0.5) {
    this.fire.spawn({ pos, vel, life: 0.18, s0: size, s1: 0.05, c0: color, c1: color, int: 2.2, drag: 2 });
  },
  muzzle(pos, color = 0x7dff7a) {
    this.fire.spawn({ pos, life: 0.06, s0: 0.9, s1: 0.2, c0: 0xffffff, c1: color, int: 3 });
  },
  sparksAt(pos, n = 10, color = 0xffd27a, speed = 40) {
    for (let i = 0; i < n; i++) {
      const d = V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      this.sparks.spawn({ pos, vel: d, life: rand(0.2, 0.5), s0: 1, s1: 0.3, c0: 0xffffff, c1: color, int: 3, drag: 3, stretch: 0.04 });
    }
  },
  shockwave(pos, radius = 20, color = 0xffd27a, dur = 0.6, axis) {
    const r = this.rings.find((x) => !x.visible) || this.rings[0];
    r.visible = true; r.position.copy(pos); r.userData = { t: 0, dur, radius };
    r.material.color.set(color).multiplyScalar(3);
    if (axis) r.quaternion.setFromUnitVectors(V3(0, 0, 1), axis); else r.quaternion.copy(R.camera.quaternion);
    r.scale.setScalar(0.1);
  },
  flash(pos, color = 0xffa040, intensity = 4000, dur = 0.35) {
    const l = this.lights.reduce((a, b) => (a.userData.t > b.userData.t ? a : b));
    l.position.copy(pos); l.color.set(color); l.userData = { t: dur, dur, peak: intensity }; l.intensity = intensity;
  },
  explode(pos, size = 1, opts = {}) {
    const vel = opts.vel || V3();
    const n = Math.round(10 + size * 10);
    for (let i = 0; i < n; i++) {
      const d = V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      this.fire.spawn({ pos: _v1.copy(pos).addScaledVector(d, size * rand(0, 1.5)), vel: d.clone().multiplyScalar(size * rand(6, 20)).add(vel.clone().multiplyScalar(0.3)), life: rand(0.25, 0.6), s0: size * rand(1.2, 2.6), s1: size * 0.2, c0: 0xfff2b0, c1: pick([0xff7a1a, 0xff4a10, 0xffb030]), int: 2.6, drag: 3 });
    }
    for (let i = 0; i < n * 0.8; i++) {
      const d = V3(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize();
      this.puffs.spawn({ pos: _v1.copy(pos).addScaledVector(d, size * rand(0.5, 2)), vel: d.multiplyScalar(size * rand(3, 9)), life: rand(0.8, 1.6), s0: size * rand(1, 2), s1: size * rand(2.5, 4), c0: 0x7a7580, c1: 0x4a4850, drag: 2, grav: 2 });
    }
    this.sparksAt(pos, Math.round(8 + size * 6), 0xffc860, 30 + size * 15);
    this.shockwave(pos, size * 9, 0xffd27a, 0.45 + size * 0.08);
    this.flash(pos, 0xff9a40, 700 * size, 0.3 + size * 0.05);
    if (opts.debris !== false && Phys.world) Phys.spawnDebris(pos, vel, opts.color ?? 0x555560, Math.round(3 + size * 2), Math.min(1.8, 0.5 + size * 0.35));
  },
  bombBlast(pos) {
    for (let i = 0; i < 3; i++) this.shockwave(pos, 70 + i * 25, i ? 0xff6a3a : 0xffffff, 0.8 + i * 0.25);
    for (let i = 0; i < 80; i++) {
      const d = V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      this.fire.spawn({ pos: pos.clone(), vel: d.multiplyScalar(rand(40, 90)), life: rand(0.4, 0.9), s0: rand(3, 6), s1: 0.5, c0: 0xffffff, c1: pick([0xff3a5a, 0xff9a2a, 0xffd04a]), int: 3, drag: 2.5 });
    }
    this.flash(pos, 0xff6a6a, 9000, 0.7);
    R.flashU.value = Math.max(R.flashU.value, 0.65);
  },
  addShake(a, t = 0.3) { this.shake = Math.max(this.shake, a * Settings.shake); this.shakeT = Math.max(this.shakeT, t); },
  update(dt) {
    this.puffs.update(dt); this.fire.update(dt); this.sparks.update(dt);
    for (const r of this.rings) {
      if (!r.visible) continue;
      const u = r.userData; u.t += dt;
      const k = u.t / u.dur;
      if (k >= 1) { r.visible = false; continue; }
      r.scale.setScalar(0.1 + u.radius * (1 - Math.pow(1 - k, 3)));
      r.material.opacity = 1 - k;
    }
    for (const l of this.lights) {
      if (l.userData.t <= 0) { l.intensity = 0; continue; }
      l.userData.t -= dt;
      l.intensity = l.userData.peak * Math.max(0, l.userData.t / l.userData.dur);
    }
    R.flashU.value = Math.max(0, R.flashU.value - dt * 2.2);
    R.hitU.value = Math.max(0, R.hitU.value - dt * 1.6);
    this.shakeT -= dt;
    if (this.shakeT <= 0) this.shake = damp(this.shake, 0, 8, dt);
  },
  shakeOffset(out) {
    const a = this.shake;
    out.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.3);
    return out;
  },
};
