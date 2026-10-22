// ===== 04_world.js — rail path, terrain, scenery, Rapier physics world =====
// Level layout (rail distance d, world z = -d)
const L = {
  SEA_END: 1500, COAST: 1700, MIDBOSS: 2850, MIDBOSS_END: 3800, CHECK: 3900, CITY: 4000,
  GATES: [4150, 4400, 4650, 4900, 5150], BRANCH: 5300, ROUTE_END: 8250, ALLRANGE: 8700,
  ARENA: new THREE.Vector3(0, 0, -9350), ARENA_R: 720,
};
function routeX(d, r) {
  let x = 70 * Math.sin(d * 0.0011) * smooth(300, 1000, d) * (1 - smooth(3650, 3950, d));
  if (r === 'beta') x += -700 * smooth(5300, 5900, d) * (1 - smooth(7700, 8300, d));
  else x += 45 * Math.sin((d - 5300) * 0.002) * smooth(5400, 5800, d) * (1 - smooth(7900, 8200, d));
  return x;
}
function routeY(d, r) {
  let y = 26 + 6 * smooth(2600, 3000, d) + 4 * smooth(3900, 4100, d);
  if (r === 'alpha') y += 8 * smooth(5300, 5600, d) * (1 - smooth(8000, 8300, d));
  return y;
}
function pathPos(d, r, out = V3()) { return out.set(routeX(d, r), routeY(d, r), -d); }
const Rail = {
  pos: V3(), fwd: V3(), right: V3(), up: V3(),
  frame(d, r) {
    pathPos(d, r, this.pos); pathPos(d + 2, r, _v4);
    this.fwd.copy(_v4).sub(this.pos).normalize();
    this.right.crossVectors(this.fwd, UP).normalize();
    this.up.crossVectors(this.right, this.fwd).normalize();
    return this;
  },
  // world point from rail-local coordinates (lx right, ly up) at distance d
  point(d, lx, ly, r, out = V3()) {
    this.frame(d, r);
    return out.copy(this.pos).addScaledVector(this.right, lx).addScaledVector(this.up, ly);
  },
};

function terrainH(x, z) {
  const d = -z;
  const ax = routeX(d, 'alpha'), bx = routeX(d, 'beta');
  const da = Math.abs(x - ax), db = Math.abs(x - bx);
  const dmin = d > 5200 ? Math.min(da, db) : da;
  const land = smooth(1350, 1700, d);
  let h = lerp(-14, 1.5, land);
  const city = smooth(3900, 4050, d) * (1 - smooth(8150, 8350, d)) * (1 - smooth(250, 520, da));
  const hills = fbm(x * 0.006, z * 0.006) * 45 * smooth(70, 260, dmin) + smooth(350, 900, dmin) * fbm(x * 0.003 + 5, z * 0.003) * 170;
  h += hills * land * (1 - city);
  if (land < 1) h += (1 - land) * Math.max(0, fbm(x * 0.01, z * 0.01) - 0.6) * 300 * smooth(70, 220, da);
  // hidden canyon (route beta)
  const canyon = smooth(5550, 5950, d) * (1 - smooth(7650, 8050, d));
  if (canyon > 0) {
    const wall = 140 + fbm(x * 0.02, z * 0.02) * 50;
    const carve = smooth(42, 105, db);
    const hc = lerp(2 + fbm(x * 0.05, z * 0.05) * 4, wall, carve);
    h = lerp(h, hc, canyon * (1 - smooth(300, 460, db)));
  }
  // boss arena basin ringed by mountains
  const arena = smooth(8450, 8700, d);
  if (arena > 0) {
    const ar = Math.hypot(x - L.ARENA.x, z - L.ARENA.z);
    const ha = 1 + fbm(x * 0.01, z * 0.01) * 14 * smooth(120, 600, ar) + smooth(700, 1050, ar) * (120 + fbm(x * 0.004, z * 0.004) * 140);
    h = lerp(h, ha, arena);
  }
  return h;
}

const Physics = {
  world: null, handles: new Map(),
  G_STATIC: 0x1, G_ENEMY: 0x2, G_FRIEND: 0x4, G_DEBRIS: 0x8, G_QUERY: 0x10,
  groups(member, filter) { return (member << 16) | filter; },
  async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -30, z: 0 });
    this.ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  },
  addStaticBox(cx, cy, cz, hx, hy, hz, rotY = 0, owner = { kind: 'static' }) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setCollisionGroups(this.groups(this.G_STATIC, 0xffff));
    if (rotY) { _q1.setFromAxisAngle(UP, rotY); desc.setRotation({ x: _q1.x, y: _q1.y, z: _q1.z, w: _q1.w }); }
    const c = this.world.createCollider(desc); this.handles.set(c.handle, owner); return c;
  },
  addMover(radius, owner, member) {
    const desc = RAPIER.ColliderDesc.ball(radius).setCollisionGroups(this.groups(member, 0xffff ^ this.G_DEBRIS)).setSensor(true);
    const c = this.world.createCollider(desc); this.handles.set(c.handle, owner); return c;
  },
  addMoverBox(hx, hy, hz, owner, member) {
    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setCollisionGroups(this.groups(member, 0xffff ^ this.G_DEBRIS)).setSensor(true);
    const c = this.world.createCollider(desc); this.handles.set(c.handle, owner); return c;
  },
  remove(c) { if (!c) return; this.handles.delete(c.handle); this.world.removeCollider(c, false); },
  // segment cast: returns {owner, t, point} or null
  cast(from, to, filter) {
    _v1.copy(to).sub(from); const len = _v1.length(); if (len < 1e-4) return null; _v1.divideScalar(len);
    this.ray.origin = { x: from.x, y: from.y, z: from.z }; this.ray.dir = { x: _v1.x, y: _v1.y, z: _v1.z };
    const hit = this.world.castRay(this.ray, len, true, undefined, this.groups(this.G_QUERY, filter));
    if (!hit || !hit.collider) return null;
    const toi = hit.timeOfImpact ?? hit.toi;
    return { owner: this.handles.get(hit.collider.handle), t: toi, point: from.clone().addScaledVector(_v1, toi), collider: hit.collider };
  },
  overlapBall(p, r, filter, cb) {
    const shape = new RAPIER.Ball(r);
    this.world.intersectionsWithShape({ x: p.x, y: p.y, z: p.z }, { x: 0, y: 0, z: 0, w: 1 }, shape, c => { if (!c) return true; const o = this.handles.get(c.handle); if (o) return cb(o, c) !== false; return true; }, undefined, this.groups(this.G_QUERY, filter));
  },
  debris(pos, vel, size, mat) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinvel(vel.x, vel.y, vel.z).setAngvel({ x: rand(-8, 8), y: rand(-8, 8), z: rand(-8, 8) }).setLinearDamping(0.15));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size, size * 0.6, size).setRestitution(0.45).setDensity(2).setCollisionGroups(this.groups(this.G_DEBRIS, this.G_STATIC | this.G_DEBRIS)), body);
    const m = new THREE.Mesh(new THREE.BoxGeometry(size * 2, size * 1.2, size * 2), mat); m.castShadow = true;
    Gfx.scene.add(m);
    return { body, mesh: m, life: rand(3.5, 5.5) };
  },
  step(dt) { this.world.timestep = clamp(dt, 1 / 240, 1 / 30); this.world.step(); },
};

// ---------- world construction ----------
const World = {
  gates: [], checkpointRing: null, decor: [], waterMat: null, beacons: [],
  build(progress) {
    const scene = Gfx.scene, rng = mulberry(1977);
    // water
    this.waterMat = waterMaterial();
    const water = new THREE.Mesh(new THREE.PlaneGeometry(7000, 12500, 1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0, -4800); water.receiveShadow = true; scene.add(water);
    // ground floor collider for debris
    Physics.addStaticBox(0, -16, -5000, 3000, 1, 6000);
    progress(0.2, 'Raising terrain…');
    this.buildTerrain();
    progress(0.45, 'Planting forests…');
    this.buildSea(rng); this.buildLand(rng);
    progress(0.6, 'Building Port Halcyon…');
    this.buildCity(rng); this.buildAlpha(rng);
    progress(0.75, 'Carving the hidden canyon…');
    this.buildCanyon(rng); this.buildArena(rng);
    this.buildGates();
    this.buildClouds(rng);
  },
  buildTerrain() {
    const X0 = -1400, X1 = 1100, Z0 = 400, Z1 = -10450, S = 8;
    const cols = Math.round((X1 - X0) / S) + 1;
    const chunkRows = 90;
    const totalRows = Math.round((Z0 - Z1) / S);
    const mat = toon(0xffffff, { vertexColors: true, flatShading: true });
    const cSand = new THREE.Color(0xe8d49a), cGrass = new THREE.Color(0x6cc04a), cGrass2 = new THREE.Color(0x4fa040), cRock = new THREE.Color(0x9a8a78), cSnow = new THREE.Color(0xf4f8ff), cSea = new THREE.Color(0x3a7fa8), cCity = new THREE.Color(0x9ab08a), cCanyon = new THREE.Color(0xd08850), cCanyon2 = new THREE.Color(0xb86a3a);
    for (let r0 = 0; r0 < totalRows; r0 += chunkRows) {
      const rows = Math.min(chunkRows, totalRows - r0) + 1;
      const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3);
      let k = 0;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = X0 + i * S, z = Z0 - (r0 + j) * S;
        const h = terrainH(x, z);
        pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
        const d = -z; const canyon = smooth(5550, 5950, d) * (1 - smooth(7650, 8050, d)) * (1 - smooth(300, 460, Math.abs(x - routeX(d, 'beta'))));
        let c;
        if (h < -2) c = cSea; else if (h < 3.5 && d < 1900) c = cSand;
        else if (canyon > 0.5) c = (Math.floor(h / 18) % 2) ? cCanyon : cCanyon2;
        else if (h > 150) c = cSnow; else if (h > 60) c = cRock;
        else c = hash2(i >> 2, (r0 + j) >> 2) > 0.5 ? cGrass : cGrass2;
        const city = smooth(3900, 4050, d) * (1 - smooth(8150, 8350, d)) * (1 - smooth(250, 520, Math.abs(x - routeX(d, 'alpha'))));
        if (city > 0.5 && h < 10) c = cCity;
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
        k += 3;
      }
      const idx = [];
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, b = a + 1, c2 = a + cols, d2 = c2 + 1; idx.push(a, c2, b, b, c2, d2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; Gfx.scene.add(m);
    }
  },
  addRockSpire(x, z, h, r, rng) {
    const base = Math.min(terrainH(x, z), 0) - 4;
    const geo = new THREE.CylinderGeometry(r * 0.55, r, h, 7, 3); geo.translate(0, h / 2, 0);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const s = 1 + (rng() - 0.5) * 0.25; p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); }
    geo.computeVertexNormals();
    const m = mesh(geo, toon(0xa89880, { flatShading: true }), x, base, z); shadowed(m); Gfx.scene.add(m);
    const cap = mesh(new THREE.ConeGeometry(r * 0.62, r * 0.6, 7), toon(0x6cc04a, { flatShading: true }), x, base + h + r * 0.25, z); Gfx.scene.add(shadowed(cap));
    Physics.addStaticBox(x, base + h / 2, z, r * 0.7, h / 2, r * 0.7);
  },
  addArch(d, r, span, height, thick, col = 0xa89880) {
    Rail.frame(d, r); const c = Rail.pos.clone(); const right = Rail.right.clone();
    const yaw = Math.atan2(-Rail.fwd.x, -Rail.fwd.z);
    const mat = toon(col, { flatShading: true });
    for (const s of [-1, 1]) {
      const p = c.clone().addScaledVector(right, s * span);
      const g0 = Math.min(terrainH(p.x, p.z), 0) - 3;
      const hgt = height - g0;
      const leg = mesh(new THREE.BoxGeometry(thick, hgt, thick), mat, p.x, g0 + hgt / 2, p.z); leg.rotation.y = yaw; Gfx.scene.add(shadowed(leg));
      Physics.addStaticBox(p.x, g0 + hgt / 2, p.z, thick / 2, hgt / 2, thick / 2, yaw);
    }
    const top = mesh(new THREE.BoxGeometry(span * 2 + thick, thick * 0.8, thick), mat, c.x, height + thick * 0.4, c.z); top.rotation.y = yaw; Gfx.scene.add(shadowed(top));
    Physics.addStaticBox(c.x, height + thick * 0.4, c.z, span + thick / 2, thick * 0.4, thick / 2, yaw);
  },
  buildSea(rng) {
    for (let d = 150; d < L.SEA_END; d += 30) {
      const ax = routeX(d, 'alpha');
      for (const s of [-1, 1]) if (rng() < 0.55) this.addRockSpire(ax + s * rand(60, 220), -d, 30 + rng() * 70, 7 + rng() * 9, rng);
      if (rng() < 0.12 && d > 300) this.addRockSpire(ax + (rng() - 0.5) * 50, -d, 25 + rng() * 40, 4 + rng() * 3, rng);
    }
    this.addArch(620, 'alpha', 30, 58, 9); this.addArch(1150, 'alpha', 26, 46, 8);
    // lighthouse on the coast
    const lx = routeX(1650, 'alpha') + 70, lz = -1650, lg = terrainH(lx, lz);
    const tower = new THREE.Group();
    for (let i = 0; i < 6; i++) tower.add(mesh(new THREE.CylinderGeometry(3.6 - i * 0.3, 3.9 - i * 0.3, 6, 10), toon(i % 2 ? 0xd04030 : 0xffffff), 0, 3 + i * 6, 0));
    tower.add(mesh(new THREE.SphereGeometry(2.6, 10, 8), glow(4, 3.4, 1.4), 0, 39, 0));
    tower.position.set(lx, lg, lz); Gfx.scene.add(shadowed(tower));
    Physics.addStaticBox(lx, lg + 20, lz, 3.6, 20, 3.6);
  },
  buildLand(rng) {
    const treeGeos = [];
    for (let i = 0; i < 2600; i++) {
      const d = rand(L.COAST + 30, L.CITY + 200), ax = routeX(d, 'alpha');
      const x = ax + (rng() - 0.5) * 900, z = -d;
      const h = terrainH(x, z); if (h < 2 || h > 70) continue;
      const [t, c] = makeTreeGeo(rng);
      t.translate(x, h, z); c.translate(x, h, z);
      treeGeos.push({ t, c });
    }
    for (let d = L.CITY + 3000; d < 8600; d += 4) {
      if (treeGeos.length > 4200) break;
      const x = (rng() - 0.5) * 1800, z = -(rand(5200, 8600)), h = terrainH(x, z);
      if (h < 2 || h > 60) continue;
      const ax = routeX(-z, 'alpha'), bx = routeX(-z, 'beta');
      if (Math.abs(x - ax) < 300 || Math.abs(x - bx) < 140) continue;
      const [t, c] = makeTreeGeo(rng); t.translate(x, h, z); c.translate(x, h, z); treeGeos.push({ t, c });
    }
    const flat = g => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; };
    const trunks = mergeGeometries(treeGeos.map(o => flat(o.t)));
    const crowns = mergeGeometries(treeGeos.map(o => flat(o.c)));
    const tm = new THREE.Mesh(trunks, toon(0x7a5232, { flatShading: true })); tm.castShadow = true; Gfx.scene.add(tm);
    const cm = new THREE.Mesh(crowns, toon(0x3e9a3a, { flatShading: true })); cm.castShadow = true; cm.receiveShadow = true; Gfx.scene.add(cm);
    // radar dishes & bunkers
    for (let d = 1900; d < 3900; d += 260) {
      const ax = routeX(d, 'alpha'), x = ax + (rng() < 0.5 ? -1 : 1) * rand(60, 140), z = -d, h = terrainH(x, z);
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(1, 1.4, 10, 6), toon(0x8890a0), 0, 5, 0));
      const dish = mesh(new THREE.SphereGeometry(7, 14, 8, 0, TAU, 0, Math.PI / 3.2), toon(0xe8ecf0, { side: THREE.DoubleSide }), 0, 12, 0); dish.rotation.x = 2.2; g.add(dish);
      g.position.set(x, h, z); Gfx.scene.add(shadowed(g)); this.decor.push({ o: dish, spin: rand(0.3, 0.8) });
      Physics.addStaticBox(x, h + 8, z, 5, 8, 5);
    }
  },
  addBuilding(x, z, w, h, d, rng, yaw = 0) {
    const g0 = terrainH(x, z) - 1;
    const b = makeBuilding(w, h, d, Math.floor(rng() * 6), rng); b.position.set(x, g0, z); b.rotation.y = yaw; Gfx.scene.add(b);
    Physics.addStaticBox(x, g0 + h / 2, z, w / 2, h / 2, d / 2, yaw);
    return b;
  },
  buildCity(rng) {
    for (let d = L.CITY - 60; d < L.BRANCH + 40; d += 38) {
      const ax = routeX(d, 'alpha');
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const off = 55 + k * 70 + rng() * 30;
        this.addBuilding(ax + s * off, -d - rng() * 20, 18 + rng() * 16, 20 + rng() * (k === 0 ? 50 : 110), 18 + rng() * 16, rng);
      }
      if (rng() < 0.35 && !L.GATES.some(g => Math.abs(g - d) < 50)) this.addBuilding(ax + (rng() - 0.5) * 50, -d, 14 + rng() * 8, 10 + rng() * 14, 14 + rng() * 8, rng);
    }
    this.addArch(4050, 'alpha', 34, 62, 7, 0xd0d4e0);
  },
  buildAlpha(rng) {
    for (let d = L.BRANCH + 40; d < L.ROUTE_END; d += 34) {
      const ax = routeX(d, 'alpha');
      // keep the hidden-canyon corridor (route beta) clear where it peels away from / rejoins the city
      const bx = routeX(d, 'beta'), clear = x => Math.abs(x - bx) > 85;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = ax + s * (52 + k * 65 + rng() * 20), w = 20 + rng() * 14, h = 50 + rng() * 130, dd = 20 + rng() * 14; if (clear(x)) this.addBuilding(x, -d - rng() * 16, w, h, dd, rng); }
      // towers inside the flight lane force weaving
      if (d > 5500 && d < 8000 && rng() < 0.4) { const x = ax + (rng() - 0.5) * 60; if (clear(x)) this.addBuilding(x, -d, 10 + rng() * 6, 70 + rng() * 50, 10 + rng() * 6, rng); }
    }
    // sky bridges: fly under or over
    for (const d of [5800, 6500, 7200, 7800]) {
      Rail.frame(d, 'alpha');
      const c = Rail.pos, yaw = Math.atan2(-Rail.fwd.x, -Rail.fwd.z), y = 44;
      const br = mesh(new THREE.BoxGeometry(110, 4, 8), toon(0xd8dce8), c.x, y, c.z); br.rotation.y = yaw; Gfx.scene.add(shadowed(br));
      const rail = mesh(new THREE.BoxGeometry(110, 0.6, 0.6), glow(3, 0.5, 0.4), c.x, y - 2.3, c.z + 4); rail.rotation.y = yaw; Gfx.scene.add(rail);
      Physics.addStaticBox(c.x, y, c.z, 55, 2, 4, yaw);
    }
  },
  buildCanyon(rng) {
    for (let d = 6000; d < 7650; d += 60) {
      const bx = routeX(d, 'beta');
      if (rng() < 0.55) this.addRockSpire(bx + (rng() - 0.5) * 70, -d, 30 + rng() * 60, 5 + rng() * 4, rng);
    }
    this.addArch(6300, 'beta', 44, 50, 9, 0xc07a48); this.addArch(6900, 'beta', 44, 40, 9, 0xc07a48); this.addArch(7400, 'beta', 44, 58, 9, 0xc07a48);
  },
  buildArena(rng) {
    for (let i = 0; i < 26; i++) {
      const a = rng() * TAU, r = 200 + rng() * 480;
      const x = L.ARENA.x + Math.cos(a) * r, z = L.ARENA.z + Math.sin(a) * r;
      this.addRockSpire(x, z, 40 + rng() * 90, 8 + rng() * 10, rng);
    }
    // enemy base pad under the boss
    const pad = mesh(new THREE.CylinderGeometry(70, 80, 4, 12), toon(0x5a5070, { flatShading: true }), L.ARENA.x, 2, L.ARENA.z); Gfx.scene.add(shadowed(pad));
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const bcn = mesh(new THREE.BoxGeometry(3, 3, 3), glow(4, 0.4, 2.5), L.ARENA.x + Math.cos(a) * 74, 5, L.ARENA.z + Math.sin(a) * 74); Gfx.scene.add(bcn); this.beacons.push(bcn); }
  },
  buildGates() {
    this.gates = L.GATES.map((d, i) => {
      const lx = [0, -16, 16, -10, 12][i], ly = [0, 6, -4, 8, 2][i];
      const p = Rail.point(d, lx, ly, 'alpha');
      const g = makeGate(); g.position.copy(p); g.lookAt(p.clone().add(Rail.fwd)); Gfx.scene.add(g);
      return { d, mesh: g, lx, ly, passed: false, missed: false };
    });
    const cp = Rail.point(L.CHECK, 0, 0, 'alpha');
    const ring = this.checkpointRing = makeCheckpointRing(); ring.position.copy(cp); ring.lookAt(cp.clone().add(Rail.fwd)); Gfx.scene.add(ring);
  },
  buildClouds(rng) {
    const mat = toon(0xffffff, { emissive: 0x404858 });
    const geos = [];
    for (let i = 0; i < 160; i++) {
      const x = (rng() - 0.5) * 3000, y = 170 + rng() * 140, z = 600 - rng() * 11000;
      for (let k = 0; k < 5; k++) { const s = new THREE.IcosahedronGeometry(14 + rng() * 22, 1); s.scale(1.6, 0.7, 1.2); s.translate(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 10, z + (rng() - 0.5) * 40); geos.push(s.toNonIndexed()); }
    }
    const m = new THREE.Mesh(mergeGeometries(geos.map(g => { g.deleteAttribute('uv'); return g; })), mat); Gfx.scene.add(m);
  },
  update(dt, t) {
    for (const o of this.decor) o.o.rotation.z += o.spin * dt;
    for (const g of this.gates) { g.mesh.rotation.z += dt * (g.passed ? 3 : 0.6); }
    if (this.checkpointRing) this.checkpointRing.rotation.z += dt * 0.5;
    for (let i = 0; i < this.beacons.length; i++) this.beacons[i].visible = Math.floor(t * 3 + i) % 2 === 0;
  },
  resetGates(fromD) { for (const g of this.gates) if (g.d >= fromD) { g.passed = false; g.missed = false; g.mesh.userData.glow.material.color.setRGB(4, 1.4, 0.3); } },
};
