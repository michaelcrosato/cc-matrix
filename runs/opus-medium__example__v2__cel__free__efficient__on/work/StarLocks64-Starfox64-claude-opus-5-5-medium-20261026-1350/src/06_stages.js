// ============================================================================
// Stages — environments, streamed scenery, data-driven event timelines, bosses
// Stage scripts are plain data arrays (designer-editable): { s|t, do: fn, route }
// ============================================================================
const Env = {
  ground: null, uColA: uniform(new THREE.Color(0x58b947)), uColB: uniform(new THREE.Color(0x3f9a3a)), uGrid: uniform(0), uWater: uniform(0),
  tColA: new THREE.Color(), tColB: new THREE.Color(), tGrid: 0, tWater: 0, stars: null, planet: null, longhaul: null, group: null,
  init(scene) {
    const m = new THREE.MeshToonNodeMaterial({ color: 0xffffff, gradientMap: Toon.ramp });
    const self = this;
    m.colorNode = Fn(() => {
      const p = positionWorld.xz;
      const n = mx_noise_float(p.mul(0.007)).add(mx_noise_float(p.mul(0.031)).mul(0.35));
      const patch = step(0.05, n);
      const g = max(step(0.93, fract(p.x.mul(0.035))), step(0.93, fract(p.y.mul(0.035))));
      const w = step(0.42, sin(p.x.mul(0.06).add(time.mul(1.4))).mul(sin(p.y.mul(0.045).sub(time.mul(0.8)))).add(n.mul(0.5)));
      const t = mix(mix(patch, g, self.uGrid), w, self.uWater);
      return mix(self.uColA, self.uColB, t);
    })();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000, 1, 1), m);
    this.ground.rotation.x = -Math.PI / 2; this.ground.receiveShadow = true;
    scene.add(this.ground);
    this.group = new THREE.Group(); scene.add(this.group);
  },
  setBiome(colA, colB, grid, water, instant = false) {
    this.tColA.set(colA); this.tColB.set(colB); this.tGrid = grid; this.tWater = water;
    if (instant) { this.uColA.value.copy(this.tColA); this.uColB.value.copy(this.tColB); this.uGrid.value = grid; this.uWater.value = water; }
  },
  update(dt, focus) {
    const k = 1 - Math.exp(-1.5 * dt);
    this.uColA.value.lerp(this.tColA, k); this.uColB.value.lerp(this.tColB, k);
    this.uGrid.value = lerp(this.uGrid.value, this.tGrid, k); this.uWater.value = lerp(this.uWater.value, this.tWater, k);
    this.place(focus);
  },
  place(focus) {
    if (this.ground.visible) this.ground.position.set(focus.x, Rail.groundY, focus.z);
    if (this.stars) this.stars.position.copy(focus);
    if (this.planetGroup) this.planetGroup.position.copy(focus).add(tmpV.set(-900, -300, -1600));
  },
  clear() { while (this.group.children.length) this.group.remove(this.group.children[0]); this.stars = null; this.planetGroup = null; },
  space() {
    this.ground.visible = false;
    GFX.setSky(0x02030d, 0x0b1030, 0x24124a, 0x0b1030, 1500, 4500);
    GFX.hemi.color.set(0x8fa8ff); GFX.hemi.groundColor.set(0x30204a); GFX.hemi.intensity = 0.9; GFX.sun.intensity = 3;
    const n = 1400, im = new THREE.InstancedMesh(G.sphereLo, Toon.glow(0xffffff, 1, false), n);
    for (let i = 0; i < n; i++) { tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(2600); tmpM.compose(tmpV, tmpQ.identity(), tmpV2.setScalar(rand(1.5, 4.5))); im.setMatrixAt(i, tmpM); }
    im.frustumCulled = false; this.group.add(im); this.stars = im;
    const pg = new THREE.Group();
    pg.add(place(tmesh(G.sphere, 0x3f9a3a, { outline: 6, shadow: false }), 0, 0, 0, 0, 0, 0.3, 520));
    pg.add(place(tmesh(new THREE.SphereGeometry(1, 32, 16), 0x2a7fd4, { outline: 0, shadow: false }), 0, 0, 0, 0.4, 0, 0, 522, 480, 522));
    pg.add(place(new THREE.Mesh(G.torusThin, Toon.glow(0xffd9a0, 0.5)), 0, 0, 0, 1.2, 0.2, 0, 800));
    pg.add(place(new THREE.Mesh(G.sphere, Toon.glow(0x7fc4ff, 0.18)), 0, 0, 0, 0, 0, 0, 560));
    this.group.add(pg); this.planetGroup = pg;
    const sunG = place(new THREE.Mesh(G.sphere, Toon.glow(0xfff2c0, 1, false)), 1200, 900, 600, 0, 0, 0, 90); sunG.material.fog = false; this.group.add(sunG);
    GFX.sunDir.set(0.6, 0.5, 0.3).normalize();
  },
  planet() {
    this.ground.visible = true;
    GFX.setSky(0x2f6bff, 0x7fc4ff, 0xd8f0ff, 0xcfeaff, 380, 1500);
    GFX.hemi.color.set(0xcfe6ff); GFX.hemi.groundColor.set(0x4a5a3a); GFX.hemi.intensity = 1.1; GFX.sun.intensity = 2.6;
    GFX.sunDir.set(0.45, 1, 0.35).normalize();
    // distant mountains ring (parallax silhouettes)
    for (let i = 0; i < 26; i++) {
      const m = place(tmesh(G.cone6, pick([0x6c8fb0, 0x7f9fc0, 0x5d7fa0]), { outline: 2, shadow: false }), 0, 0, 0, 0, rand(0, 3), 0, rand(120, 260), rand(140, 320), rand(120, 260));
      m.userData.ang = i / 26 * TAU + rand(-0.1, 0.1); m.userData.dist = rand(1300, 1600); m.userData.mtn = true;
      this.group.add(m);
    }
    // clouds
    for (let i = 0; i < 30; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) c.add(place(tmesh(G.sphereLo, 0xffffff, { outline: 0.6, shadow: false }), k * 14 - 20, rand(-3, 3), rand(-6, 6), 0, 0, 0, rand(10, 16), rand(6, 9), rand(8, 12)));
      c.userData.cloud = true; c.userData.off = new V3(rand(-500, 500), rand(160, 260), rand(-1200, 400));
      this.group.add(c);
    }
  },
  updateDecor(focus) {
    for (const m of this.group.children) {
      if (m.userData.mtn) m.position.set(focus.x + Math.cos(m.userData.ang) * m.userData.dist, Rail.groundY, focus.z + Math.sin(m.userData.ang) * m.userData.dist);
      if (m.userData.cloud) { const o = m.userData.off; m.position.set(focus.x + o.x, o.y, focus.z + ((o.z - focus.z * 0.15) % 1600 + 1600) % 1600 - 1200); }
    }
  },
};

// ---------------------------------------------------------------------------
// Scenery streaming for rail stages
// ---------------------------------------------------------------------------
const BIOMES = {
  sea: { a: 0x2a7fd4, b: 0x6fc3f5, grid: 0, water: 1 },
  plains: { a: 0x5cbf4a, b: 0x3f9a3a, grid: 0, water: 0 },
  city: { a: 0x8892a8, b: 0x5b6478, grid: 1, water: 0 },
  canyon: { a: 0xd08c48, b: 0xa86a32, grid: 0, water: 0 },
  base: { a: 0x7a8a5a, b: 0x5b6a44, grid: 1, water: 0 },
  fortress: { a: 0x6b5a4a, b: 0x4a3e34, grid: 0, water: 0 },
};
function addProp(obj, s, collider = null, colliders = null) {
  Env.group.add(obj);
  const p = { obj, s, colliders: colliders || (collider ? [collider] : []) };
  W.props.push(p); return p;
}
const Scenery = {
  genS: 0,
  reset() { this.genS = 0; },
  biomeAt(s) { return W.stage.biomeAt ? W.stage.biomeAt(s) : 'plains'; },
  stream() {
    while (this.genS < Rail.s + 1000) { this.chunk(this.genS, this.biomeAt(this.genS)); this.genS += 50; }
    for (let i = W.props.length - 1; i >= 0; i--) {
      const p = W.props[i];
      if (p.s < Rail.s - 90) { Env.group.remove(p.obj); for (const c of p.colliders) Phys.remove(c); W.props.splice(i, 1); }
    }
    const b = BIOMES[this.biomeAt(Rail.s + 150)];
    if (b) Env.setBiome(b.a, b.b, b.grid, b.water);
  },
  obstacleBox(x, y, s, w, h, d, col, model) {
    const pos = Rail.toWorld(x, 0, s);
    const obj = model || place(tmesh(G.box, col, { receive: true }), 0, h / 2, 0, 0, 0, 0, w, h, d);
    obj.position.add(pos); obj.position.y += y;
    const f = Rail.frame(s); obj.rotation.y = Math.atan2(-f.fwd.x, -f.fwd.z);
    const c = Phys.addBox(tmpV.copy(pos).add(tmpV2.set(0, y + h / 2, 0)), new V3(w / 2, h / 2, d / 2), obj.quaternion);
    return addProp(obj, s, c);
  },
  chunk(s0, biome) {
    const R = (a, b) => rand(a, b);
    if (biome === 'sea') {
      for (let i = 0; i < 3; i++) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(60, 300); const r = Models.rock(R(4, 12), 0x8d7b68); r.position.copy(Rail.toWorld(x, 0, s)); addProp(r, s); }
      if (Math.random() < 0.25) { const s = s0 + 25, x = R(-30, 30), h = R(14, 30); const g = new THREE.Group(); const r = Models.rock(1, 0x9c8b78); r.scale.set(6, h / 2, 6); r.position.y = h / 2 - 2; g.add(r); this.obstacleBox(x, 0, s, 9, h, 9, 0, g); }
    } else if (biome === 'plains') {
      for (let i = 0; i < 6; i++) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(55, 320); const t = Models.tree(R(0.8, 1.6)); t.position.copy(Rail.toWorld(x, 0, s)); addProp(t, s); }
      if (Math.random() < 0.35) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(70, 200); const h = Models.building(R(8, 14), R(6, 10), R(8, 14), pick([0xf4e1c1, 0xe8d0a8, 0xffffff])); h.position.copy(Rail.toWorld(x, 0, s)); addProp(h, s); }
      if (Math.random() < 0.18) { const s = s0 + 25, x = R(-36, 36), h = R(28, 60); const m = place(tmesh(G.cyl6, 0xa58b6c, { receive: true }), 0, h / 2, 0, 0, R(0, 3), 0, 4, h, 4); this.obstacleBox(x, 0, s, 7, h, 7, 0, m); }
    } else if (biome === 'city') {
      for (let i = 0; i < 4; i++) {
        const s = s0 + R(0, 50), x = pick([-1, 1]) * R(56, 260), h = R(20, 90);
        const b = Models.building(R(14, 26), h, R(14, 26), pick([0xc8cfdc, 0x9aa3b8, 0xb8c0d0, 0xdfe4ee, 0x8892a8]));
        b.position.copy(Rail.toWorld(x, 0, s)); addProp(b, s);
      }
      if (Math.random() < 0.3) { const s = s0 + 25, x = pick([-1, 1]) * R(12, 34), h = R(30, 70); this.obstacleBox(x, 0, s, 12, h, 12, 0, Models.building(12, h, 12, pick([0xc8cfdc, 0x9aa3b8]))); }
    } else if (biome === 'canyon') {
      for (const side of [-1, 1]) {
        const s = s0 + 25, h = R(70, 120), x = side * R(52, 60);
        const m = place(tmesh(G.box, pick([0xc27a3a, 0xb06a30, 0xd08c48]), { receive: true }), 0, h / 2, 0, R(-0.05, 0.05), 0, R(-0.05, 0.05), R(18, 26), h, 54);
        this.obstacleBox(x, 0, s, 22, h, 54, 0, m);
      }
      if (Math.random() < 0.2) { const s = s0 + 25, h = R(25, 55); const m = Models.rock(1, 0xb07a45); m.scale.set(7, h / 2, 7); m.position.y = h / 2; const g = new THREE.Group(); g.add(m); this.obstacleBox(R(-30, 30), 0, s, 11, h, 11, 0, g); }
      if (Math.random() < 0.12) { const s = s0 + 25; const g = new THREE.Group(); g.add(place(tmesh(G.box, 0xa86a32), 0, 0, 0, 0, 0, 0, 110, 8, 12)); this.obstacleBox(0, R(36, 46), s, 110, 8, 12, 0, g); }
    } else if (biome === 'base') {
      for (let i = 0; i < 2; i++) {
        const s = s0 + R(0, 50), x = pick([-1, 1]) * R(60, 220);
        const hg = new THREE.Group(); hg.add(place(tmesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI), 0x7d8a6a, { receive: true }), 0, 0, 0, 0, 0, Math.PI / 2, 14, 30, 14));
        hg.add(place(new THREE.Mesh(G.box, Toon.glow(0xffcc33, 0.7)), 0, 3, 15, 0, 0, 0, 12, 1, 0.5));
        hg.position.copy(Rail.toWorld(x, 0, s)); addProp(hg, s);
      }
      if (Math.random() < 0.4) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(55, 120); const d = new THREE.Group(); d.add(place(tmesh(G.cyl6, 0x8892a8), 0, 6, 0, 0, 0, 0, 1, 12, 1)); d.add(place(tmesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, 1.2), 0xdfe4ee), 0, 13, 0, 0.8, 0, 0, 7)); d.position.copy(Rail.toWorld(x, 0, s)); addProp(d, s); }
      if (Math.random() < 0.22) { const s = s0 + 25, x = R(-34, 34), h = R(30, 55); const m = new THREE.Group(); m.add(place(tmesh(G.box, 0x5b6a44), 0, h / 2, 0, 0, 0, 0, 6, h, 6)); m.add(place(new THREE.Mesh(G.sphere, Toon.glow(0xff3b4e, 1)), 0, h + 1, 0, 0, 0, 0, 1.2)); this.obstacleBox(x, 0, s, 6, h, 6, 0, m); }
    } else if (biome === 'fortress') {
      for (let i = 0; i < 3; i++) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(60, 300); const r = Models.rock(R(6, 18), 0x5a4a3c); r.position.copy(Rail.toWorld(x, 0, s)); addProp(r, s); }
      if (Math.random() < 0.3) { const s = s0 + R(0, 50), x = pick([-1, 1]) * R(70, 200); const f = new THREE.Group(); f.add(place(new THREE.Mesh(G.cone8, Toon.glow(0xff6a1a, 0.8)), 0, 4, 0, 0, 0, 0, 3, 8, 3)); f.position.copy(Rail.toWorld(x, 0, s)); addProp(f, s); }
    }
  },
};

// arch helper for gates / scenery
function spawnArch(s, opts = {}) {
  const f = Rail.frame(s);
  const a = opts.rock ? Models.rockArch() : Models.arch(opts.col);
  a.position.copy(f.pos).add(tmpV.copy(f.right).multiplyScalar(opts.x || 0)); a.rotation.y = Math.atan2(-f.fwd.x, -f.fwd.z);
  const cols = [];
  for (const sx of [-1, 1]) cols.push(Phys.addBox(tmpV.copy(a.position).addScaledVector(f.right, (opts.rock ? 16 : 13) * sx).add(tmpV2.set(0, 12, 0)), new V3(2.2, 12, 2.2), a.quaternion));
  cols.push(Phys.addBox(tmpV.copy(a.position).add(tmpV2.set(0, opts.rock ? 27 : 25.5, 0)), new V3(15, 2.2, 2.2), a.quaternion));
  return addProp(a, s, null, cols);
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------
class Walker {
  constructor() {
    this.obj = Models.walker(); W.scene.add(this.obj); this.alive = true; this.t = 0; this.lz = 320; this.x = 0; this.name = 'STILT WALKER'; this.mid = true;
    this.pos = new V3(); this.fireT = 2; this.stompT = 5;
    this.core = addEnemy(new Enemy('wcore', { hp: 40, hits: 10, radius: 3.4, boss: this }));
    this.core.keep = true; this.core.noCollide = true; this.core.explodeSize = 4;
    this.core.path = (e) => { this.obj.userData.core.getWorldPosition(e.pos); };
    this.core.onKill = () => this.die();
    this.parts = [this.core];
  }
  get hp() { return Math.max(0, this.core.hp); } get maxHp() { return this.core.maxHp; }
  update(dt) {
    this.t += dt;
    const leaving = this.t > 38;
    this.lz = leaving ? this.lz + 70 * dt : damp(this.lz, 130, 0.8, dt);
    this.x = Math.sin(this.t * 0.45) * 18;
    const f = Rail.frame(Rail.s + this.lz);
    this.pos.copy(f.pos).addScaledVector(f.right, this.x);
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = Math.atan2(f.fwd.x, f.fwd.z);
    const ud = this.obj.userData, ph = this.t * 3;
    ud.hull.position.y = 16 + Math.sin(ph * 2) * 0.8; ud.hull.rotation.z = Math.sin(ph) * 0.05;
    for (const l of ud.legs) { l.hip.rotation.x = Math.sin(ph + l.phase) * 0.35; l.knee.rotation.x = Math.max(0, Math.sin(ph + l.phase + 1)) * 0.4; }
    if (!leaving) {
      this.fireT -= dt * diff().enemyFire;
      if (this.fireT <= 0) {
        this.fireT = 1.5; const tgt = this.core.nearestPlayer();
        if (tgt) for (let i = -2; i <= 2; i++) { tmpV.copy(tgt.pos).sub(this.core.pos).normalize(); tmpV.applyAxisAngle(UP, i * 0.12); fire('eshot', this.core, this.core.pos, tmpV); }
        Sound.sfx('eshot');
      }
      this.stompT -= dt;
      if (this.stompT <= 0) { this.stompT = 4.5; FX.shock(tmpV.copy(this.pos).setY(1), 40, 0.8, 0xffcc33); FX.shake(0.8, 0.4); Sound.sfx('boom', { size: 1.5, vol: 0.6 }); for (const s of W.ships) if (!s.dead && s.oy < 12 && Math.abs(s.ox - this.x) < 30) s.damage(8, this.core); }
    }
    if (leaving && this.lz > 600) { this.alive = false; this.core.alive = false; if (Game.bossBar === this) Game.bossBar = null; Sound.play(W.stage.music); W.scene.remove(this.obj); Comms.say('bramble', 'It got away... no matter. Eyes front!'); }
  }
  die() {
    this.alive = false; Game.bossDown(this);
    for (let n = 0; n <= 6; n++) after(n * 0.16, () => FX.explode(tmpV.copy(this.pos).add(new V3(rand(-8, 8), rand(4, 20), rand(-8, 8))), 3));
    after(1.2, () => { FX.explode(this.pos.clone().setY(14), 6); FX.flash(0.6); W.scene.remove(this.obj); });
  }
  remove() { W.scene.remove(this.obj); for (const p of this.parts) p.alive = false; }
}

class Bastion {
  constructor() {
    this.obj = Models.bastion(); W.scene.add(this.obj); this.alive = true; this.t = 0; this.lz = 420; this.x = 0; this.y = 22; this.name = 'BASTION CRAB';
    this.pos = new V3(); this.phase = 1; this.fireT = 2.5; this.misT = 5; this.plateT = 0; this.open = false; this.ram = 0;
    const ud = this.obj.userData;
    this.arms = ud.arms.map((a, i) => {
      const e = addEnemy(new Enemy('arm', { hp: 28, hits: 5, radius: 3.6, boss: this }));
      e.keep = true; e.noCollide = true; e.explodeSize = 3;
      e.path = (en) => a.children[2].getWorldPosition(en.pos);
      e.onKill = () => { a.visible = false; FX.explode(e.pos, 4); this.onArmDown(); };
      return e;
    });
    this.core = addEnemy(new Enemy('core', { hp: 70, hits: 20, radius: 4, boss: this }));
    this.core.keep = true; this.core.noCollide = true; this.core.armored = true; this.core.explodeSize = 5;
    this.core.path = (en) => ud.core.getWorldPosition(en.pos);
    this.core.onKill = () => this.die();
    this.parts = [...this.arms, this.core];
    this.total = this.parts.reduce((a, p) => a + p.maxHp, 0);
  }
  get hp() { return this.parts.reduce((a, p) => a + Math.max(0, p.alive ? p.hp : 0), 0); } get maxHp() { return this.total; }
  onArmDown() {
    if (this.arms.every(a => !a.alive)) { this.phase = 2; this.plateT = 0; Comms.say('pip', 'Both cannons are scrap! Its core is exposed — hit it when the armor opens!'); }
    else Comms.say('skye', 'One arm down! Hah, this thing\'s all bark!');
  }
  onPartHit(part) { if (part === this.core && this.core.armored) Sound.sfx('clank'); }
  update(dt) {
    this.t += dt;
    const ud = this.obj.userData;
    const ramT = this.phase === 2 ? (this.t % 14) : 99;
    const ramming = ramT > 10 && ramT < 13;
    const targetLz = ramming ? 55 : 115;
    this.lz = damp(this.lz, targetLz, ramming ? 1.6 : 0.9, dt);
    this.x = Math.sin(this.t * 0.4) * 20; this.y = 22 + Math.sin(this.t * 0.9) * 5;
    const f = Rail.frame(Rail.s + this.lz);
    this.pos.copy(f.pos).addScaledVector(f.right, this.x).addScaledVector(UP, this.y);
    this.obj.position.copy(this.pos); this.obj.rotation.y = Math.atan2(f.fwd.x, f.fwd.z);
    ud.hull.rotation.z = Math.sin(this.t * 0.8) * 0.08;
    for (const [i, a] of ud.arms.entries()) a.rotation.x = Math.sin(this.t * 1.5 + i) * 0.2;
    if (Math.random() < dt * 8) FX.fireball(tmpV.copy(this.pos).add(tmpV2.set(rand(-10, 10), -6, rand(-6, 6))), 1.2, 0.4, new V3(0, -20, 0), 0xaee8ff, 0x4f8aff);
    // phase 2: plates cycle open/closed
    if (this.phase === 2) {
      this.plateT += dt;
      const cyc = this.plateT % 8; const open = cyc < 5;
      if (open !== this.open) { this.open = open; this.core.armored = !open; Sound.sfx(open ? 'shield' : 'clank'); }
      for (const [i, p] of ud.plates.entries()) p.position.x = damp(p.position.x, open ? (i ? 1 : -1) * 4.5 : 0, 6, dt);
    }
    this.fireT -= dt * diff().enemyFire;
    if (this.fireT <= 0) {
      const tgt = this.core.nearestPlayer();
      if (this.phase === 1) {
        this.fireT = 1.4;
        for (const a of this.arms) if (a.alive && tgt) for (let i = -1; i <= 1; i++) { tmpV.copy(tgt.pos).sub(a.pos).normalize().applyAxisAngle(UP, i * 0.1); fire('eshot', a, a.pos, tmpV); }
      } else {
        this.fireT = this.open ? 2.2 : 1.2;
        if (this.open) { for (let i = 0; i < 14; i++) { const ang = i / 14 * TAU; tmpV.set(Math.cos(ang) * 0.5, Math.sin(ang) * 0.5, 0).add(tmpV2.copy(Rail.frame(Rail.s).fwd).negate()).normalize(); fire('bigshot', this.core, this.core.pos, tmpV); } }
        else if (tgt) fire('bigshot', this.core, this.core.pos, tmpV.copy(tgt.pos).sub(this.core.pos).normalize());
      }
      Sound.sfx('eshot');
    }
    this.misT -= dt * diff().enemyFire;
    if (this.misT <= 0) { this.misT = this.phase === 1 ? 6 : 4.5; const tgt = this.core.nearestPlayer(); if (tgt) for (const s of [-1, 1]) fire('missile', this.core, tmpV.copy(this.pos).add(tmpV2.set(s * 6, 10, 0)), tmpV3.set(s * 0.4, 1, 0.3).normalize(), tgt); Sound.sfx('homing'); }
    // ramming body contact
    for (const s of W.ships) if (!s.dead && s.team === 'star' && s.pos.distanceTo(this.pos) < 14) s.damage(15, this.core);
  }
  die() {
    this.alive = false; for (const a of this.arms) if (a.alive) a.kill(null);
    Game.bossDown(this);
    for (let n = 0; n <= 10; n++) after(n * 0.18, () => { FX.explode(tmpV.copy(this.pos).add(new V3(rand(-14, 14), rand(-6, 10), rand(-10, 10))), 3.5); FX.shake(0.8, 0.3); });
    after(2.1, () => { FX.explode(this.pos, 8); FX.flash(0.9); W.scene.remove(this.obj); });
  }
  remove() { W.scene.remove(this.obj); for (const p of this.parts) p.alive = false; }
}

class Dreadnought {
  constructor() {
    this.obj = Models.dreadnought(); W.scene.add(this.obj); this.alive = true; this.t = 0; this.name = "MANDRILLO'S DREADNOUGHT";
    this.pos = new V3(0, 0, -2400); this.obj.position.copy(this.pos); this.arriving = true; this.colliders = []; this.spawnT = 6;
    const ud = this.obj.userData;
    this.gens = ud.gens.map((g, i) => {
      const e = addEnemy(new Enemy('gen', { hp: 18, hits: 5, radius: 4, boss: this }));
      e.keep = true; e.noCollide = true; e.explodeSize = 4;
      e.path = (en) => g.children[1].getWorldPosition(en.pos);
      e.onKill = () => { g.visible = false; FX.explode(e.pos, 5); this.onGenDown(); };
      return e;
    });
    this.turrets = [];
    for (let i = 0; i < 8; i++) {
      const lp = new V3((i % 2 ? 1 : -1) * 14, 10, -55 + Math.floor(i / 2) * 32);
      const m = new THREE.Group(); m.add(place(tmesh(G.cyl6, 0x5b6478), 0, 1, 0, 0, 0, 0, 2.5, 2, 2.5)); m.add(place(tmesh(G.sphere, 0xff3b4e, { emissive: 0x660010, ei: 0.7 }), 0, 2.5, 0, 0, 0, 0, 1.8));
      m.position.copy(lp); this.obj.add(m);
      const e = addEnemy(new Enemy('dturret', { hp: 4, hits: 2, radius: 2.5, fireRate: 0.35, boss: this }));
      e.keep = true; e.noCollide = true; e.mesh = m; e.local = lp.clone().add(new V3(0, 2.5, 0));
      e.path = (en) => en.pos.copy(en.local).applyQuaternion(this.obj.quaternion).add(this.obj.position);
      e.onKill = () => { m.visible = false; };
      this.turrets.push(e);
    }
    this.reactor = addEnemy(new Enemy('reactor', { hp: 70, hits: 30, radius: 5.5, boss: this }));
    this.reactor.keep = true; this.reactor.noCollide = true; this.reactor.armored = true; this.reactor.explodeSize = 6;
    this.reactor.path = (en) => ud.reactor.getWorldPosition(en.pos);
    this.reactor.onKill = () => this.die();
    this.parts = [...this.gens, this.reactor];
    this.total = this.parts.reduce((a, p) => a + p.maxHp, 0);
    for (const e of this.parts) e.targetable = false;
    for (const e of this.turrets) e.targetable = false;
  }
  get hp() { return this.parts.reduce((a, p) => a + Math.max(0, p.alive ? p.hp : 0), 0); } get maxHp() { return this.total; }
  onGenDown() {
    const left = this.gens.filter(g => g.alive).length;
    if (left === 0) { this.reactor.armored = false; this.obj.userData.shield.visible = false; Sound.sfx('alarm'); Comms.say('pip', 'Shield\'s down! The reactor\'s wide open — light it up!'); }
    else Comms.say(pick(['skye', 'bramble', 'pip']), `Generator down! ${left} to go!`);
  }
  onPartHit() {}
  update(dt) {
    this.t += dt;
    if (this.arriving) {
      this.pos.z = damp(this.pos.z, 0, 0.9, dt);
      if (Math.abs(this.pos.z) < 30) {
        this.arriving = false; this.pos.z = 0;
        for (const e of [...this.parts, ...this.turrets]) e.targetable = true;
        this.colliders.push(Phys.addBox(new V3(0, 0, 0), new V3(20, 9, 70)), Phys.addBox(new V3(0, 16, 30), new V3(9, 7, 15)), Phys.addBox(new V3(0, 0, -90), new V3(14, 8, 25)));
      }
    }
    this.obj.position.copy(this.pos);
    this.obj.userData.shield.rotation.y += dt;
    this.obj.userData.shield.scale.setScalar(8.5 + Math.sin(this.t * 6) * 0.3);
    if (!this.arriving) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = 9; const n = W.enemies.filter(e => e.type === 'drone' && e.alive).length; for (let i = n; i < 6; i++) spawnEnemy('drone', { pos: tmpV.set(rand(-30, 30), rand(-20, 20), 80) }); }
    }
  }
  die() {
    this.alive = false; Game.bossDown(this);
    for (const t of this.turrets) if (t.alive) t.kill(null);
    for (let n = 0; n <= 16; n++) after(n * 0.17, () => { FX.explode(tmpV.set(rand(-20, 20), rand(-10, 20), rand(-70, 70)), 5); FX.shake(1, 0.4); });
    after(3, () => { FX.explode(new V3(0, 0, 0), 10); FX.flash(1); W.scene.remove(this.obj); for (const c of this.colliders) Phys.remove(c); this.colliders = []; });
  }
  remove() { W.scene.remove(this.obj); for (const c of this.colliders) Phys.remove(c); for (const p of [...this.parts, ...this.turrets]) p.alive = false; }
}

// ---------------------------------------------------------------------------
// Spawn helpers used by event scripts
// ---------------------------------------------------------------------------
const S = {
  line(n, x, y, opts = {}) { for (let i = 0; i < n; i++) spawnEnemy('dart', { path: PATHS.incoming({ x: x + (i - (n - 1) / 2) * 9, y, z: 260 + i * 6, ph: i, ...opts }), drop: opts.dropLast && i === n - 1 ? opts.dropLast : null }); },
  swoop(n, side, y = 20) { for (let i = 0; i < n; i++) after(i * 0.26, () => spawnEnemy('dart', { path: PATHS.swoop({ side, x: side * -8 + i * 6 * -side, y: y + i * 3 }) })); },
  vform(x, y, drop) { for (let i = -2; i <= 2; i++) spawnEnemy('dart', { path: PATHS.vform({ x, y, slot: i }), drop: i === 0 ? drop : null }); },
  circle(n) { for (let i = 0; i < n; i++) spawnEnemy('dart', { path: PATHS.circle({ ph: i / n * TAU }) }); },
  dive(n) { for (let i = 0; i < n; i++) after(i * 0.4, () => spawnEnemy('dart', { path: PATHS.dive({ x: rand(-30, 30) }) })); },
  cross(n, side, y) { for (let i = 0; i < n; i++) after(i * 0.3, () => spawnEnemy('dart', { path: PATHS.cross({ side, y: y + i * 4, z: 120 + i * 10 }) })); },
  ground(kind, s, xs, drop) { for (const x of xs) spawnEnemy(kind, { s, x, drop }); },
  bomber(x, y, drop) { spawnEnemy('bomber', { path: PATHS.incoming({ x, y, z: 300, speed: 18, wa: 3 }), drop }); },
  mines(s, n) { for (let i = 0; i < n; i++) spawnEnemy('mine', { path: PATHS.hover({ x: rand(-38, 38), y: rand(6, 42), s: s + rand(0, 200), ph: rand(0, 6) }) }); },
  crate(s, x, y, drop) { spawnEnemy('crate', { path: PATHS.hover({ x, y, s, ph: 0 }), drop }); },
  ring(kind, s, x, y) { spawnItem(kind, Rail.toWorld(x, y, s), { s, x, y, fixed: true }); },
  chase(pilot, n = 3, dur = 11) {
    const w = W.ships.find(s => s.pilot === pilot && !s.isPlayer && !s.retired);
    if (!w || W.attract) return;
    w.chased = { t: 0, dur, saved: false };
    const chasers = [];
    for (let i = 0; i < n; i++) chasers.push(spawnEnemy('dart', { path: PATHS.chase({ wing: w, dur, ph: i, dx: (i - 1) * 5 }) }));
    for (const c of chasers) c.fireRate = 0;
    w.chasers = chasers;
    const lines = { skye: ['Kit! I\'ve got bogeys on my tail! Get \'em off me!', 'Thanks for nothing! ...Okay, thanks.', 'Argh! I\'m hit bad — I gotta pull back!'],
      bramble: ['Kit, I can\'t shake these fellas! Lend an old timer a hand!', 'Much obliged, Kit. Your father would be proud.', 'Ohh, that\'s gonna leave a mark...'],
      pip: ['Eek! Kit, help! They\'re all over me!', 'Phew! I owe you one, Kit!', 'My systems are fried! Heading back to the Longhaul!'] };
    Comms.say(pilot, lines[pilot][0], { priority: true });
    w.chaseLines = lines[pilot];
  },
};

// ---------------------------------------------------------------------------
// Stage 1 — VERDALIS (on-rails)
// ---------------------------------------------------------------------------
const Stage1 = {
  id: 'verdalis', kind: 'rail', name: 'VERDALIS', sub: 'Planet Defense', medal: 110, music: 'stage1',
  route: null, gates: 0, gatesTotal: 6,
  biomeAt(s) {
    if (s < 650) return 'sea';
    if (s < 2700) return 'plains';
    if (s < 4600) return 'city';
    if (s < 6900) return this.route === 'canyon' ? 'canyon' : this.route === 'base' ? 'base' : (this.gates >= 5 ? 'canyon' : 'base');
    return 'fortress';
  },
  build() {
    Env.planet(); Rail.curve = true; Rail.minY = 3.5; Rail.maxY = 48;
    this.route = null; this.gates = 0;
    const b = BIOMES.sea; Env.setBiome(b.a, b.b, b.grid, b.water, true);
    Phys.setGround(0);
  },
  gate(s) {
    S.ring('gate', s, 0, 14);
    const it = W.items[W.items.length - 1];
    spawnArch(s, { col: 0xe8d0a8 });
    it.onPass = () => { this.gates++; UI.centerMsg(null, `GATE ${this.gates}/${this.gatesTotal}`, this.gates >= 5 ? 'Shortcut unlocked!' : '', 1.1); };
  },
  events() {
    const st = this;
    return [
      { s: 10, do: () => Comms.say('marlowe', 'Star Locks, Mandrillo\'s armada is pounding Verdalis! Our defenses won\'t last the hour. You\'re all we\'ve got!') },
      { s: 40, do: () => Comms.say('kit', 'Copy that, General. Star Locks — all aircraft, report!') },
      { s: 70, do: () => { Comms.say('skye', 'Skye here. Let\'s make this quick — I\'ve got a date with a shower.'); Game.tutorial('move'); } },
      { s: 120, do: () => Comms.say('bramble', 'Bramble, checking in. Stay sharp, kids.') },
      { s: 170, do: () => Comms.say('pip', 'Pip reporting! All systems green... mostly!') },
      { s: 200, do: () => { S.line(5, 0, 18); Game.tutorial('fire'); } },
      { s: 380, do: () => S.swoop(4, -1) },
      { s: 520, do: () => S.swoop(4, 1, 26) },
      { s: 600, do: () => { Game.tutorial('charge'); S.line(3, -20, 14); S.line(3, 20, 26); } },
      { s: 720, do: () => S.vform(0, 22, 'silver') },
      { s: 800, do: () => Comms.say('bramble', 'Coastline ahead! Ground troops dug in on the beachhead!') },
      { s: 860, do: () => S.ring('silver', 980, 0, 18) },
      { s: 900, do: () => { S.ground('tank', 1150, [-28, -8, 14, 30]); Game.tutorial('boost'); } },
      { s: 950, do: () => { st.gate(1200); Comms.say('pip', 'See those golden arches? Fly through all of \'em — I bet they\'ll open a shortcut!'); } },
      { s: 1100, do: () => S.circle(6) },
      { s: 1250, do: () => S.crate(1480, 0, 20, 'laser') },
      { s: 1350, do: () => st.gate(1600) },
      { s: 1450, do: () => { S.bomber(0, 30, 'bomb'); Game.tutorial('roll'); Comms.say('bramble', 'Incoming missiles! Double-tap a shoulder button and spin, Kit — they\'ll bounce right off!'); } },
      { s: 1600, do: () => S.ground('turret', 1850, [-34, 34]) },
      { s: 1700, do: () => { st.gate(1950); S.chase('skye'); } },
      { s: 1950, do: () => { S.swoop(3, -1, 30); Game.tutorial('loop'); Comms.say('kit', 'Bogeys on our six! Loop around!'); } },
      { s: 2080, do: () => { Game.startMidboss(new Walker()); Comms.say('pip', 'Walker class ahead! Its weak spot\'s that glowing red core up front!'); } },
      { s: 2150, do: () => S.ground('tank', 2400, [-30, 30]) },
      { s: 2450, do: () => S.ring('gold', 2620, -20, 30) },
      { s: 2700, do: () => Comms.say('marlowe', 'You\'re over Verdalis City. Watch those skyscrapers — and keep civilian damage to a minimum!') },
      { s: 2760, do: () => st.gate(2950) },
      { s: 2850, do: () => { S.ground('turret', 3100, [-38, 0, 38]); S.line(4, 0, 30); } },
      { s: 3050, do: () => S.mines(3300, 10) },
      { s: 3150, do: () => S.vform(-10, 28, 'laser') },
      { s: 3300, do: () => st.gate(3550) },
      { s: 3400, do: () => S.ring('gold', 3700, 20, 12) },
      { s: 3500, do: () => S.chase('bramble') },
      { s: 3700, do: () => { S.cross(4, 1, 20); S.cross(4, -1, 34); } },
      { s: 3850, do: () => { st.gate(4100); S.bomber(-16, 24, 'silver'); } },
      { s: 4000, do: () => S.ring('gold', 4300, 0, 36) },
      { s: 4150, do: () => S.ring('checkpoint', 4420, 0, 18) },
      { s: 4450, do: () => { st.route = st.gates >= 5 ? 'canyon' : 'base'; if (st.route === 'canyon') { Comms.say('pip', 'Whoa — the arches lit up a hidden canyon route! This way, guys!'); UI.centerMsg(null, 'SECRET ROUTE', 'Red Rock Canyon', 2.4); } else Comms.say('marlowe', 'Mandrillo\'s ground base is dead ahead. Tear it apart!'); } },
      // --- canyon route (secret) ---
      { s: 4650, route: 'canyon', do: () => { S.dive(5); S.ring('gold', 4900, 0, 20); } },
      { s: 4900, route: 'canyon', do: () => S.circle(8) },
      { s: 5150, route: 'canyon', do: () => { S.mines(5400, 8); S.crate(5450, 0, 24, 'bomb'); } },
      { s: 5400, route: 'canyon', do: () => { S.chase('pip'); S.line(5, 0, 20); } },
      { s: 5700, route: 'canyon', do: () => { S.bomber(10, 26, 'laser'); S.swoop(4, 1); } },
      { s: 6000, route: 'canyon', do: () => { S.vform(0, 20, 'gold'); S.dive(4); } },
      { s: 6300, route: 'canyon', do: () => { S.cross(5, -1, 18); S.ring('silver', 6550, 0, 20); } },
      { s: 6550, route: 'canyon', do: () => S.circle(8) },
      // --- base route ---
      { s: 4650, route: 'base', do: () => { S.ground('tank', 4900, [-30, -10, 10, 30]); S.ground('launcher', 5000, [-40, 40]); } },
      { s: 4900, route: 'base', do: () => S.line(5, 0, 26) },
      { s: 5150, route: 'base', do: () => { S.ground('turret', 5400, [-36, 36]); S.chase('pip'); } },
      { s: 5450, route: 'base', do: () => { S.ground('launcher', 5700, [-20, 20]); S.crate(5700, 0, 26, 'bomb'); } },
      { s: 5750, route: 'base', do: () => { S.vform(0, 24, 'silver'); S.ground('tank', 6000, [-34, 34]); } },
      { s: 6050, route: 'base', do: () => { S.swoop(4, -1); S.ground('turret', 6300, [-38, 0, 38]); } },
      { s: 6400, route: 'base', do: () => S.bomber(0, 28, 'laser') },
      // --- boss ---
      { s: 6750, do: () => { Comms.say('marlowe', 'Enemy fortress sighted! That\'s the Bastion — the brute that leveled our northern bases!'); Sound.sfx('alarm'); } },
      { s: 6950, do: () => Game.startBoss(new Bastion(), 'Mandrillo\'s mobile fortress') },
    ];
  },
  update() { Scenery.stream(); },
};

// ---------------------------------------------------------------------------
// Stage 2 — ORBITAL RING (all-range mode)
// ---------------------------------------------------------------------------
const Stage2 = {
  id: 'orbital', kind: 'allrange', name: 'ORBITAL RING', sub: 'All-Range Battle', medal: 90, music: 'allrange', arenaR: 1100,
  build() {
    Env.space(); Rail.curve = false;
    Phys.setGround(-2000);
    this.asteroids = [];
    for (let i = 0; i < 46; i++) {
      const r = rand(8, 30); const p = new V3(rand(-900, 900), rand(-260, 260), rand(-900, 900));
      if (p.length() < 220) p.setLength(rand(260, 900));
      const a = Models.asteroid(r); a.position.copy(p); Env.group.add(a);
      Phys.addBall(p, r * 0.95);
      this.asteroids.push({ obj: a, spin: new V3(rand(-0.3, 0.3), rand(-0.3, 0.3), 0) });
    }
    const lh = Models.longhaul(); lh.position.set(500, 120, 700); lh.rotation.y = 0.6; Env.group.add(lh); this.longhaul = lh;
    Phys.addBox(lh.position, new V3(20, 8, 64), lh.quaternion);
    this.phase = 0; this.t = 0;
  },
  events() {
    return [
      { t: 0.5, do: () => Comms.say('marlowe', 'Mandrillo\'s Dreadnought is warping in over the Orbital Ring. If it reaches Verdalis, it\'s over!') },
      { t: 4, do: () => { Comms.say('kit', 'All-range mode! Break and engage — keep \'em off the Longhaul!'); Game.tutorial('allrange'); } },
      { t: 6, do: () => { for (let i = 0; i < 6; i++) spawnEnemy('drone', { pos: new V3(rand(-300, 300), rand(-80, 80), rand(-600, -300)) }); } },
      { t: 9, do: () => Game.tutorial('uturn') },
      { t: 16, do: () => { for (let i = 0; i < 5; i++) spawnEnemy('drone', { pos: new V3(rand(-300, 300), rand(-80, 80), rand(300, 600)) }); } },
      { t: 22, do: () => Stage2.jackals() },
    ];
  },
  jackals() {
    Sound.sfx('alarm');
    Comms.say('vex', 'Well, well. Team Star Locks. Mandrillo pays double for your tails!', { priority: true });
    after(4.5, () => Comms.say('kit', 'Jackal Squadron! Everyone, watch your backs!'));
    after(8.5, () => Comms.say('mink', 'Ooh, the little newt is mine. Toodle-oo!'));
    after(12, () => Comms.say('brute', 'HRRAAH! Brute SMASH the old turtle!'));
    const defs = [['vex', 0xb44dff, 40, 0.85, null], ['mink', 0xff4dd2, 26, 0.75, 'pip'], ['brute', 0x8a5a2b, 34, 0.65, 'bramble']];
    this.rivals = [];
    for (const [pilot, col, hp, skill, hunt] of defs) {
      const sh = new Ship({ team: 'jackal', pilot, model: 'jackal', color: col, maxHp: hp, pad: new AIPad() });
      sh.hitValue = 10; sh.pos.set(rand(-200, 200), rand(40, 120), -900); sh.q.setFromAxisAngle(UP, Math.PI);
      const brain = AI.dogfight(skill);
      sh.brain = (s, dt) => { if (hunt) { const w = W.ships.find(x => x.pilot === hunt && !x.retired && !x.dead); if (w && s.time < 25) { w.priority = true; } } brain(s, dt); };
      sh.preferPlayer = pilot === 'vex';
      W.ships.push(sh); this.rivals.push(sh);
    }
    this.phase = 1;
    Game.setBossBar({ name: 'JACKAL SQUADRON', get hp() { return Stage2.rivals.reduce((a, r) => a + Math.max(0, r.dead ? 0 : r.hp), 0); }, maxHp: 100 });
  },
  onShipDown(ship) {
    if (ship.team !== 'jackal') return;
    const lines = { vex: 'Grr... this isn\'t over, Ember! You hear me?!', mink: 'My beautiful ship! You\'ll pay for this!', brute: 'Brute... go... boom...' };
    Comms.say(ship.pilot, lines[ship.pilot], { priority: true });
    if (this.rivals.every(r => r.dead)) {
      this.phase = 2;
      after(4, () => {
        Comms.say('marlowe', 'Here it comes — the Dreadnought! Knock out its four shield generators, then hit the reactor!', { priority: true });
        Sound.sfx('warp'); Game.startBoss(new Dreadnought(), 'Flagship of the Mandrillo Armada');
      });
    }
  },
  update(dt) {
    for (const a of this.asteroids) { a.obj.rotation.x += a.spin.x * dt; a.obj.rotation.y += a.spin.y * dt; }
  },
};

// ---------------------------------------------------------------------------
// Versus arena
// ---------------------------------------------------------------------------
const VersusArena = {
  id: 'versus', kind: 'versus', name: 'VERSUS — ASTEROID RING', music: 'versus', arenaR: 800,
  build() {
    Env.space(); Phys.setGround(-2000);
    this.asteroids = [];
    for (let i = 0; i < 40; i++) {
      const r = rand(8, 26); const p = new V3(rand(-650, 650), rand(-200, 200), rand(-650, 650));
      if (p.length() < 120) p.setLength(rand(150, 650));
      const a = Models.asteroid(r); a.position.copy(p); Env.group.add(a); Phys.addBall(p, r * 0.95);
      this.asteroids.push({ obj: a, spin: new V3(rand(-0.3, 0.3), rand(-0.3, 0.3), 0) });
    }
    // central structure
    const c = new THREE.Group(); c.add(place(tmesh(G.torus, 0x8892a8, { outline: 0.6 }), 0, 0, 0, Math.PI / 2, 0, 0, 60)); c.add(place(tmesh(G.cyl6, 0x5b6478, { outline: 0.4 }), 0, 0, 0, 0, 0, 0, 8, 80, 8));
    Env.group.add(c); this.core = c; Phys.addBox(new V3(0, 0, 0), new V3(8, 40, 8));
    this.itemT = 4;
  },
  events() { return []; },
  update(dt) {
    for (const a of this.asteroids) { a.obj.rotation.x += a.spin.x * dt; a.obj.rotation.y += a.spin.y * dt; }
    this.core.rotation.y += dt * 0.2;
    this.itemT -= dt;
    if (this.itemT <= 0) { this.itemT = 7; if (W.items.length < 8) { const it = spawnItem(pick(['laser', 'bomb', 'silver', 'silver']), new V3(rand(-400, 400), rand(-120, 120), rand(-400, 400))); it.life = 30; } }
  },
};
