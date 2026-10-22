/* ============================== terrain & world ============================== */
const CANYON_START = 4200;
function nz(x, z) {
  return Math.sin(x * 0.043 + Math.sin(z * 0.021) * 1.7) * Math.cos(z * 0.037 + Math.sin(x * 0.017) * 1.3)
    + 0.5 * Math.sin(x * 0.11 + z * 0.083) * Math.cos(x * 0.07 - z * 0.1) + 0.25 * Math.sin(x * 0.27 + z * 0.31);
}
const canyonW = (d) => 62 + 16 * Math.sin(d * 0.0031) + 8 * Math.sin(d * 0.0093);
const canyonCf = (d) => smooth(CANYON_START - 250, CANYON_START + 450, d);
function terrainH(x, z) {
  const d = -z, cf = canyonCf(d);
  const n = nz(x, z);
  const sea = -28 + 18 * smooth(0.6, 1.5, n) + 0.35 * Math.sin(x * 0.2 + z * 0.15);
  if (cf <= 0) return sea;
  const hw = canyonW(d), ax = Math.abs(x);
  const wall = smooth(hw, hw + 38, ax) * (74 + 24 * nz(x * 0.5, z * 0.5));
  const floor = -30 + 2.5 * nz(x * 0.7, z * 0.7) + 2 * smooth(hw, hw * 0.4, ax);
  return lerp(sea, floor + wall, cf);
}
const _tc = new THREE.Color();
function terrainColor(x, z, h, o) {
  const d = -z, cf = canyonCf(d), n = nz(x * 1.3, z * 1.3);
  if (h < -26.8) { const w = 0.5 + 0.25 * n; _tc.setRGB(lerp(0.12, 0.2, w) * (1 - cf * 0.3), lerp(0.42, 0.6, w) - cf * 0.1, lerp(0.62, 0.76, w) - cf * 0.15); }
  else if (h < -24.5 && cf < 0.6) _tc.setRGB(0.9, 0.8, 0.55);
  else if (cf < 0.5 && h < -9) _tc.setRGB(0.28 + 0.06 * n, 0.58 + 0.08 * n, 0.27);
  else {
    const band = 0.5 + 0.5 * Math.sin(h * 0.33 + n * 1.2);
    _tc.setRGB(lerp(0.62, 0.86, band), lerp(0.33, 0.55, band), lerp(0.24, 0.38, band));
    if (cf < 0.5) _tc.lerp(new THREE.Color(0.55, 0.55, 0.52), 0.4);
  }
  o[0] = _tc.r; o[1] = _tc.g; o[2] = _tc.b;
}

const TERR_W = 480, TERR_D = 1400, TERR_SX = 96, TERR_SZ = 280, CELL = 5;
const World = {
  mode: 'rail', terrain: null, water: null, chunks: new Map(), obstacles: [], lastZc: null, arenaDecor: null, group: new THREE.Group(),
  init() {
    scene.add(this.group);
    const g = new THREE.PlaneGeometry(TERR_W, TERR_D, TERR_SX, TERR_SZ); g.rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    this.localX = Float32Array.from(g.attributes.position.array.filter((_, i) => i % 3 === 0));
    this.localZ = Float32Array.from(g.attributes.position.array.filter((_, i) => i % 3 === 2));
    this.terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
    this.terrain.receiveShadow = true; this.terrain.frustumCulled = false; this.group.add(this.terrain);
    // arena water
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#5aa6d8'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(255,255,255,${rnd(0.05, 0.22)})`; x.lineWidth = rnd(1, 3); const px = rnd(256), py = rnd(256), l = rnd(10, 40); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 4, px + l, py); x.stroke(); }
    const wt = new THREE.CanvasTexture(c); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(60, 60); wt.colorSpace = THREE.SRGBColorSpace;
    const wg = new THREE.PlaneGeometry(3000, 3000); wg.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ map: wt, color: 0x4a9ad0, roughness: 0.25, metalness: 0.15 }));
    this.water.position.y = -60; this.water.receiveShadow = true; this.group.add(this.water);
    this.arenaDecor = new THREE.Group();
    const rng = mulberry(77);
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2, r = 320 + rng() * 650, h = 10 + rng() * 60;
      const rk = Mdl.rock(h, 8 + rng() * 22, 0x6d6a7a); rk.position.set(Math.cos(a) * r, -60 + 0.3, Math.sin(a) * r); rk.position.y = -60 + h / 2 - 4; this.arenaDecor.add(rk);
    }
    this.group.add(this.arenaDecor);
    this.setMode('rail');
  },
  setMode(m) {
    this.mode = m;
    this.terrain.visible = m === 'rail'; this.water.visible = m === 'free'; this.arenaDecor.visible = m === 'free';
    this.lastZc = null;
  },
  clearRail() {
    for (const [, g] of this.chunks) this.group.remove(g);
    this.chunks.clear();
    for (const o of this.obstacles) this.group.remove(o.mesh);
    this.obstacles.length = 0; this.lastZc = null;
  },
  update(cam, railZ) {
    if (this.mode === 'rail') {
      const zc = Math.round((railZ - 550) / CELL) * CELL;
      if (zc !== this.lastZc) { this.rebuildTerrain(zc); this.lastZc = zc; }
      this.terrain.position.set(0, 0, zc);
      this.ensureChunks(-railZ);
      for (let i = this.obstacles.length - 1; i >= 0; i--) if (this.obstacles[i].z > railZ + 100) { this.group.remove(this.obstacles[i].mesh); this.obstacles.splice(i, 1); }
    } else {
      this.water.position.x = Math.round(cam.position.x / 50) * 50; this.water.position.z = Math.round(cam.position.z / 50) * 50;
    }
  },
  rebuildTerrain(zc) {
    const pos = this.terrain.geometry.attributes.position, col = this.terrain.geometry.attributes.color, n = pos.count, tmp = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const x = this.localX[i], z = this.localZ[i] + zc, h = terrainH(x, z);
      pos.setY(i, h); terrainColor(x, z, h, tmp); col.setXYZ(i, tmp[0], tmp[1], tmp[2]);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  },
  ensureChunks(d) {
    const k0 = Math.floor(d / 120) - 3, k1 = Math.floor(d / 120) + 11;
    for (let k = k0; k <= k1; k++) if (k >= -1 && !this.chunks.has(k)) this.chunks.set(k, this.makeChunk(k));
    for (const [k, g] of this.chunks) if (k < k0) { this.group.remove(g); this.chunks.delete(k); }
  },
  makeChunk(k) {
    const g = new THREE.Group(), rng = mulberry(k * 7919 + 13), d0 = k * 120, cf = canyonCf(d0 + 60);
    const r = (a, b) => a + rng() * (b - a);
    if (cf < 0.55) {
      for (let i = 0; i < 4; i++) {
        const x = (rng() < 0.5 ? -1 : 1) * r(46, 230), z = -(d0 + r(0, 120)), h = r(10, 42);
        const rk = Mdl.rock(h, r(5, 13), rng() < 0.5 ? 0x8a7f78 : 0x6f7480); rk.position.set(x, terrainH(x, z) - 2, z); g.add(rk);
      }
      for (let i = 0; i < 20; i++) {
        const x = r(-230, 230), z = -(d0 + r(0, 120)), h = terrainH(x, z);
        if (h > -25 && h < -9 && Math.abs(x) > 40) { const t = Mdl.tree(r(0.9, 1.7)); t.position.set(x, h, z); g.add(t); }
      }
      if (k % 5 === 2) {
        const x = (rng() < 0.5 ? -1 : 1) * r(60, 180), z = -(d0 + 60), h = Math.max(-27, terrainH(x, z));
        const lh = new THREE.Group(); for (let i = 0; i < 6; i++) lh.add(cyl(3.2 - i * 0.25, 3.6 - i * 0.25, 6, M(i % 2 ? 0xd04040 : 0xf0f0f0), 0, 3 + i * 6, 0, 8));
        lh.add(mesh(new THREE.SphereGeometry(3, 8, 6), GLOW(0xfff0a0, 3), 0, 39, 0)); lh.position.set(x, h, z); g.add(lh);
      }
    } else {
      const hw = canyonW(d0 + 60);
      for (let i = 0; i < 5; i++) {
        const sx = rng() < 0.5 ? -1 : 1, x = sx * (hw + r(2, 34)), z = -(d0 + r(0, 120)), h = terrainH(x, z);
        const cr = Mdl.crystal(r(10, 26), rng() < 0.5 ? 0x5ad8ff : 0xff6ad8); cr.position.set(x, h - 1, z); g.add(cr);
      }
      for (let i = 0; i < 3; i++) {
        const sx = rng() < 0.5 ? -1 : 1, x = sx * (hw + r(30, 150)), z = -(d0 + r(0, 120));
        const rk = Mdl.rock(r(30, 80), r(10, 22), 0xa86a4a); rk.position.set(x, terrainH(x, z) - 4, z); g.add(rk);
      }
      if (k % 3 === 0) { // ledge lanterns
        for (const sx of [-1, 1]) { const x = sx * (hw - 4), z = -(d0 + 30); const l = mesh(new THREE.SphereGeometry(1.4, 8, 6), GLOW(0xffd070, 3), x, terrainH(x, z) + 3, z); g.add(l); }
      }
    }
    this.group.add(g); return g;
  },
  addBox(cx, cy, cz, w, h, d, color, glow) {
    const m = box(w, h, d, glow ? GLOW(color, 1.6) : M(color, { roughness: 0.9, metalness: 0.05 }), cx, cy, cz);
    this.group.add(m);
    const o = { mesh: m, z: cz, min: V3(cx - w / 2, cy - h / 2, cz - d / 2), max: V3(cx + w / 2, cy + h / 2, cz + d / 2), solid: !glow };
    this.obstacles.push(o);
    return o;
  },
  wallHole(z, gx, gy, hwHole, hhHole, gate, color = 0x9a6a50) {
    const d = -z, X = canyonW(d) + 8, T = 8, Y0 = -48, Y1 = 48, L = [];
    L.push(this.addBox((gx - hwHole - X) / 2, (Y0 + Y1) / 2, z, gx - hwHole + X, Y1 - Y0, T, color));
    L.push(this.addBox((gx + hwHole + X) / 2, (Y0 + Y1) / 2, z, X - gx - hwHole, Y1 - Y0, T, color));
    L.push(this.addBox(gx, (Y0 + gy - hhHole) / 2, z, hwHole * 2, gy - hhHole - Y0, T, color));
    L.push(this.addBox(gx, (Y1 + gy + hhHole) / 2, z, hwHole * 2, Y1 - gy - hhHole, T, color));
    L.forEach((o) => { o.gate = gate; });
    const rimC = 0xffc060;
    this.addBox(gx, gy + hhHole, z + T / 2 + 0.2, hwHole * 2 + 1, 0.8, 0.8, rimC, true);
    this.addBox(gx, gy - hhHole, z + T / 2 + 0.2, hwHole * 2 + 1, 0.8, 0.8, rimC, true);
    this.addBox(gx - hwHole, gy, z + T / 2 + 0.2, 0.8, hhHole * 2, 0.8, rimC, true);
    this.addBox(gx + hwHole, gy, z + T / 2 + 0.2, 0.8, hhHole * 2, 0.8, rimC, true);
  },
  pillar(x, z, top, color = 0xb0724e) {
    const h = terrainH(x, z), cylm = cyl(4, 5.2, top - h + 6, M(color, { roughness: 0.9 }), x, (top + h - 6) / 2 + 3, z, 7);
    this.group.add(cylm);
    this.obstacles.push({ mesh: cylm, z, min: V3(x - 4, h - 6, z - 4), max: V3(x + 4, top, z + 4), solid: true });
  },
  // returns push vector if the ship box overlaps a solid obstacle
  hitTest(p, hx, hy, hz) {
    for (const o of this.obstacles) {
      if (!o.solid) continue;
      if (p.x + hx > o.min.x && p.x - hx < o.max.x && p.y + hy > o.min.y && p.y - hy < o.max.y && p.z + hz > o.min.z && p.z - hz < o.max.z) return o;
    }
    return null;
  },
};

/* ---- final-arena capital ship ---- */
const CARRIER_POS = V3(0, -22, 0);
function buildCarrier() {
  const g = new THREE.Group(), steel = M(0x3a4258, { roughness: 0.7 }), steel2 = M(0x56607c, { roughness: 0.6 }), red = M(0x9a2a3a);
  g.add(box(560, 34, 120, steel, 0, 0, 0)); g.add(box(500, 20, 70, steel2, 0, -26, 0)); g.add(box(420, 10, 92, steel2, -10, 22, 0));
  const prow = mesh(new THREE.ConeGeometry(60, 110, 4), steel); prow.rotation.z = -Math.PI / 2; prow.rotation.y = Math.PI / 4; prow.position.set(335, 0, 0); prow.scale.set(1, 1, 0.9); g.add(prow);
  g.add(box(90, 30, 56, steel, 110, 42, 0)); g.add(box(56, 26, 44, steel2, 110, 70, 0)); g.add(cyl(1.4, 2, 40, steel2, 110, 100, 0, 6));
  for (let i = -1; i <= 1; i++) { const e = cyl(14, 17, 40, M(0x222633), -290, i * 24 - 2, 0, 12); e.rotation.z = Math.PI / 2; g.add(e); const gl = mesh(new THREE.CircleGeometry(12, 12), GLOW(0xff7a30, 3), -311, i * 24 - 2, 0); gl.rotation.y = -Math.PI / 2; gl.castShadow = false; g.add(gl); }
  for (let i = 0; i < 9; i++) g.add(box(10, 2, 96, red, -190 + i * 48, 27.5, 0));
  for (const sz of [-1, 1]) { g.add(box(300, 8, 40, steel2, -40, -4, sz * 80)); g.add(box(30, 20, 16, red, 120, 6, sz * 64)); }
  return g;
}
const CARRIER_BOXES = [ // [cx,cy,cz,w,h,d] in carrier-local space
  [0, 0, 0, 560, 34, 120], [0, -26, 0, 500, 20, 70], [-10, 22, 0, 420, 10, 92], [110, 42, 0, 90, 30, 56], [110, 70, 0, 56, 26, 44], [335, 0, 0, 100, 60, 70], [-40, -4, -80, 300, 8, 40], [-40, -4, 80, 300, 8, 40],
];
