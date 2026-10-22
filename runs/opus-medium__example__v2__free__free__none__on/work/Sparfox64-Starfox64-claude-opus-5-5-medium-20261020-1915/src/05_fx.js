// ===== 05_fx.js — pooled particles, explosions, Rapier debris =====
const FX = {
  pool: [], poolN: [], active: [], debris: [], sphere: null, box: null, ringGeo: null,
  init() {
    this.sphere = new THREE.IcosahedronGeometry(1, 1);
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.ringGeo = new THREE.TorusGeometry(1, 0.12, 4, 24);
    this.debrisMats = [toon(0x404858, { flatShading: true }), toon(0x8a8a90, { flatShading: true }), toon(0xc84a30, { flatShading: true })];
  },
  get(kind) {
    // separate pools per blend mode so a material's pipeline never changes after first use
    const normal = kind === 'smoke';
    let p = (normal ? this.poolN : this.pool).pop();
    if (!p) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending });
      p = { mesh: new THREE.Mesh(this.sphere, mat), vel: V3(), normal };
      p.mesh.frustumCulled = false;
      Gfx.scene.add(p.mesh);
    }
    p.kind = kind; p.mesh.visible = true; p.mesh.rotation.set(0, 0, 0);
    p.mesh.geometry = kind === 'spark' || kind === 'chunk' ? this.box : kind === 'ring' ? this.ringGeo : this.sphere;
    this.active.push(p);
    return p;
  },
  spawn(kind, pos, vel, size, life, col, o = {}) {
    const p = this.get(kind);
    p.mesh.position.copy(pos); p.vel.copy(vel); p.size = size; p.size2 = o.size2 ?? size * (kind === 'smoke' ? 2.6 : kind === 'fire' ? 1.8 : 0.3); p.life = life; p.t = 0;
    p.col = col; p.mesh.material.color.copy(col); p.mesh.material.opacity = o.opacity ?? 1; p.op = o.opacity ?? 1; p.drag = o.drag ?? 1.5; p.grav = o.grav ?? 0;
    if (o.lookAt) p.mesh.lookAt(o.lookAt);
    p.mesh.scale.setScalar(size);
    return p;
  },
  explode(pos, size = 1, o = {}) {
    const C = THREE.Color;
    const n = Math.round(6 + size * 6);
    for (let i = 0; i < n; i++) {
      const dir = _v2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      this.spawn('fire', _v3.copy(pos).addScaledVector(dir, rand(0, size * 1.5)), dir.clone().multiplyScalar(rand(4, 16) * size), rand(1.2, 2.4) * size, rand(0.35, 0.7), new C(rand(3, 5), rand(1, 2.2), rand(0.2, 0.5)));
    }
    for (let i = 0; i < n; i++) {
      const dir = _v2.set(rand(-1, 1), rand(-0.5, 1), rand(-1, 1)).normalize();
      this.spawn('spark', pos, dir.clone().multiplyScalar(rand(30, 70) * Math.sqrt(size)), rand(0.3, 0.6), rand(0.3, 0.8), new C(5, 4, 1.5), { grav: 30, drag: 0.6 });
    }
    for (let i = 0; i < Math.round(3 + size * 2); i++) {
      this.spawn('smoke', _v3.copy(pos).add(_v2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(size * 1.5)), _v2.set(rand(-2, 2), rand(3, 8), rand(-2, 2)), rand(1.5, 2.5) * size, rand(1.1, 2.0), new C(0.22, 0.22, 0.25), { opacity: 0.75, grav: -2 });
    }
    if (size >= 1.5) { const r = this.spawn('ring', pos, V3(), size * 2, 0.5, new C(4, 2.5, 1), { size2: size * 14 }); r.mesh.lookAt(Gfx.camera.position); }
    Gfx.flashLight(pos, 40 * size, 0.35 + size * 0.15);
    if (o.debris !== false && size >= 1) {
      const k = Math.min(10, Math.round(size * 3));
      for (let i = 0; i < k; i++) {
        const v = _v2.set(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).multiplyScalar(rand(15, 35)).add(o.vel || V3());
        this.debris.push(Physics.debris(pos, v, rand(0.3, 0.8) * Math.sqrt(size), pick(this.debrisMats)));
      }
    }
    const camD = Gfx.camera.position.distanceTo(pos);
    const vol = clamp(1.3 - camD / 500, 0.1, 1);
    _v1.copy(pos).project(Gfx.camera);
    Audio_.play(size >= 3 ? 'bigBoom' : 'explode', { size, pan: clamp(_v1.x, -1, 1) * 0.7, vol });
    if (camD < 120) Gfx.addShake(size * 0.25 * (1 - camD / 120));
  },
  sparks(pos, n = 5, col = new THREE.Color(4, 3.5, 1.2)) {
    for (let i = 0; i < n; i++) this.spawn('spark', pos, _v2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(15, 40)), rand(0.2, 0.4), rand(0.15, 0.35), col, { drag: 2 });
  },
  splash(pos) {
    for (let i = 0; i < 10; i++) this.spawn('smoke', pos, _v2.set(rand(-6, 6), rand(10, 24), rand(-6, 6)), rand(0.8, 1.6), rand(0.5, 0.9), new THREE.Color(0.85, 0.95, 1), { grav: 40, opacity: 0.9, drag: 0.5 });
    Audio_.play('splash');
  },
  smokePuff(pos, s = 1, col) { this.spawn('smoke', pos, _v2.set(rand(-1, 1), rand(1, 3), rand(-1, 1)), s, rand(0.6, 1.0), col || new THREE.Color(0.25, 0.25, 0.28), { opacity: 0.6 }); },
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]; p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.mesh.visible = false; this.active.splice(i, 1); (p.normal ? this.poolN : this.pool).push(p); continue; }
      p.vel.multiplyScalar(Math.exp(-p.drag * dt)); p.vel.y -= p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const s = lerp(p.size, p.size2, p.kind === 'fire' ? Math.sqrt(k) : k);
      if (p.kind === 'spark') { p.mesh.scale.set(s * 0.6, s * 0.6, s * 3); if (p.vel.lengthSq() > 1) p.mesh.lookAt(_v1.copy(p.mesh.position).add(p.vel)); }
      else p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = p.op * (1 - k) * (p.kind === 'smoke' ? 1 : 1);
      if (p.kind === 'fire') p.mesh.material.color.copy(p.col).multiplyScalar(1 - k * 0.8);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt;
      let t = d.body.translation();
      const gh = terrainH(t.x, t.z);
      if (gh > -1 && t.y < gh + 0.4) {
        d.body.setTranslation({ x: t.x, y: gh + 0.4, z: t.z }, true);
        const v = d.body.linvel(); d.body.setLinvel({ x: v.x * 0.7, y: Math.abs(v.y) * 0.35, z: v.z * 0.7 }, true);
        t = d.body.translation();
      } else if (gh <= -1 && t.y < 0 && !d.splashed) { d.splashed = true; FX.splash(_v3.set(t.x, 0.5, t.z)); }
      const r = d.body.rotation();
      d.mesh.position.set(t.x, t.y, t.z); d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      if (d.life < 0.5) d.mesh.scale.setScalar(Math.max(0.01, d.life * 2));
      if (Math.random() < dt * 6 && d.life > 1.5) this.smokePuff(d.mesh.position, 0.8);
      if (d.life <= 0 || t.y < -20) { Physics.world.removeRigidBody(d.body); Gfx.scene.remove(d.mesh); d.mesh.geometry.dispose(); this.debris.splice(i, 1); }
    }
  },
  clear() {
    for (const p of this.active) { p.mesh.visible = false; (p.normal ? this.poolN : this.pool).push(p); }
    this.active.length = 0;
    for (const d of this.debris) { Physics.world.removeRigidBody(d.body); Gfx.scene.remove(d.mesh); d.mesh.geometry.dispose(); }
    this.debris.length = 0;
  },
};
