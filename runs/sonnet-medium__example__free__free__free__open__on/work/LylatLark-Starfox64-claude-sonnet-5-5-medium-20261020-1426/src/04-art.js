'use strict';
/* ===== Art: procedural low-poly "faceted toy-model" kit built from primitives ===== */
const MatCache = {};
function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (MatCache[k]) return MatCache[k];
  return (MatCache[k] = new THREE.MeshStandardMaterial({
    color, flatShading: true, roughness: o.r !== undefined ? o.r : 0.55, metalness: o.m !== undefined ? o.m : 0.35,
    emissive: o.e || 0x000000, emissiveIntensity: o.ei !== undefined ? o.ei : 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
    transparent: !!o.tr, opacity: o.op !== undefined ? o.op : 1,
  }));
}
function glowMat(color, op = 1, normal = false) { return new THREE.SpriteMaterial({ map: Tex.glow, color, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op }); }
const Tex = {};
(function makeTextures() {
  const mk = (draw, s = 128) => { const c = document.createElement('canvas'); c.width = c.height = s; draw(c.getContext('2d'), s); const t = new THREE.CanvasTexture(c); return t; };
  Tex.glow = mk((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  Tex.ring = mk((g, s) => { g.strokeStyle = '#fff'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s / 2, s / 2, s * 0.42, 0, TAU); g.stroke(); const r = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.85, 'rgba(255,255,255,.25)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  Tex.cloud = mk((g, s) => { for (let i = 0; i < 14; i++) { const x = s * (0.25 + Math.random() * 0.5), y = s * (0.35 + Math.random() * 0.3), r = s * (0.12 + Math.random() * 0.18); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); } }, 256);
  Tex.nebula = mk((g, s) => { for (let i = 0; i < 26; i++) { const x = s * (0.15 + Math.random() * 0.7), y = s * (0.15 + Math.random() * 0.7), r = s * (0.1 + Math.random() * 0.25); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); } }, 256);
})();

const G = { // shared geometries
  box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 12, 10), ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0), oct: new THREE.OctahedronGeometry(1, 0), cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8), tor: new THREE.TorusGeometry(1, 0.12, 8, 28),
};
function part(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = shadow; m.receiveShadow = false; parent.add(m); return m;
}
function glow(parent, color, s, x = 0, y = 0, z = 0, op = 1, normal = false) { const sp = new THREE.Sprite(glowMat(color, op, normal)); sp.scale.set(s, s, 1); sp.position.set(x, y, z); parent.add(sp); return sp; }
function planform(pts, th) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, th / 2, 0); return g;
}
const SHIP_STYLES = {
  lark: { body: 0xe8eef5, wing: 0x3b6fd8, accent: 0xffc23a, glow: 0x66ddff },
  kestrel: { body: 0xd5d9de, wing: 0xc23b3b, accent: 0xffffff, glow: 0xffaa55 },
  bramble: { body: 0xe9e2d0, wing: 0x7b4fc8, accent: 0xffd25a, glow: 0xcc99ff },
  tink: { body: 0xdfe9d8, wing: 0x2fa36a, accent: 0xff8a3a, glow: 0x88ffaa },
};
/** The Lark-class interceptor. root (steer/bank) → roll (barrel roll) → parts */
function buildShip(style = 'lark') {
  const st = SHIP_STYLES[style];
  const root = new THREE.Group(), roll = new THREE.Group(); root.add(roll);
  const body = M(st.body, { m: 0.5, r: 0.35 }), wing = M(st.wing, { m: 0.4, r: 0.4, ds: true }), acc = M(st.accent, { m: 0.2 });
  const fus = new THREE.ConeGeometry(0.95, 8, 6); fus.rotateX(-Math.PI / 2);
  part(roll, fus, body, 0, 0, -0.5);
  part(roll, G.box, body, 0, 0.1, 2.2, 1.7, 1.2, 4);
  const canopy = part(roll, G.sph, M(0x77ccff, { m: 0.9, r: 0.1, e: 0x1a5a99, ei: 0.8 }), 0, 0.75, -0.2, 0.7, 0.55, 1.6);
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Group(); w.position.set(0.6 * s, -0.1, 0.5);
    const pts = [[0, -1.5], [6.8, 2.4], [6.8, 3.9], [0, 3.2]].map(([x, y]) => [x * s, y]);
    const wm = new THREE.Mesh(planform(pts, 0.22), wing); wm.castShadow = true; w.add(wm);
    part(w, G.box, acc, 6.7 * s, 0.1, 3.1, 0.18, 0.25, 1.7);        // wingtip fin
    part(w, G.box, acc, 3.4 * s, 0.14, 1.4, 3.6, 0.05, 0.12);       // stripe
    const pod = part(w, G.cyl, body, 2.1 * s, -0.2, 0.4, 0.55, 2.2, 0.55); pod.rotation.x = Math.PI / 2;
    const fl = glow(w, st.glow, 1.7, 2.1 * s, -0.2, 1.6, 0.8); wings.push({ w, fl, s });
    roll.add(w);
  }
  part(roll, G.box, wing, 0, 1.4, 3.2, 0.14, 2, 1.6);                  // tail fin
  const core = glow(roll, st.glow, 2.2, 0, 0, 4.4, 0.7);
  root.userData = { roll, wings, core, canopy };
  return root;
}
function buildDrone() {
  const g = new THREE.Group(), red = M(0xc8403a, { m: 0.5 }), dark = M(0x2d2b3a, { m: 0.6 });
  part(g, G.oct, red, 0, 0, 0, 1.0, 0.7, 1.7);
  for (const s of [1, -1]) { const w = part(g, G.box, dark, 1.5 * s, 0, 0.3, 1.6, 0.12, 1.2); w.rotation.z = 0.35 * s; part(g, G.box, red, 2.2 * s, 0.35 * s * 0.6, 0.3, 0.12, 0.8, 1.2); }
  part(g, G.sph, M(0xff6a3a, { e: 0xff3a10, ei: 1.5 }), 0, 0.1, -1.2, 0.35); glow(g, 0xff5530, 2.4, 0, 0.1, -1.2, 0.8);
  glow(g, 0xff8866, 1.6, 0, 0, 1.6, 0.7);
  g.userData.hitR = 1.7; return g;
}
function buildFighter() {
  const g = new THREE.Group(), body = M(0xe08a2a, { m: 0.6 }), dark = M(0x35302b, { m: 0.6 });
  const f = new THREE.ConeGeometry(0.8, 5, 5); f.rotateX(-Math.PI / 2); part(g, f, body);
  for (const s of [1, -1]) { const m = new THREE.Mesh(planform([[0, -0.5], [4 * s, 2], [4 * s, 3], [0, 2.4]], 0.15), dark); m.material = M(0x35302b, { ds: true }); m.castShadow = true; g.add(m); part(g, G.box, body, 4 * s, 0, 2.5, 0.15, 0.9, 1); }
  glow(g, 0xff9944, 2.2, 0, 0, 2.6, 0.9); part(g, G.sph, M(0xffe08a, { e: 0xffaa22 }), 0, 0.5, -0.6, 0.4);
  return g;
}
function buildGunship() {
  const g = new THREE.Group(), hull = M(0x56607a, { m: 0.7, r: 0.4 }), trim = M(0xd8463a, { m: 0.4 });
  part(g, G.box, hull, 0, 0, 0, 4, 1.8, 7); part(g, G.box, hull, 0, 1.1, -1, 2.2, 1, 3.5);
  part(g, G.box, trim, 0, 0.1, -3.55, 3.2, 0.5, 0.2);
  for (const s of [1, -1]) { part(g, G.box, hull, 3.4 * s, -0.3, 1, 3, 0.4, 3.5); const c = part(g, G.cyl, M(0x2d3140), 2.1 * s, -1.2, -2.5, 0.35, 3, 0.35); c.rotation.x = Math.PI / 2; part(g, G.sph, M(0xff5a3a, { e: 0xff3300, ei: 1.5 }), 2.1 * s, -1.2, -4, 0.3); glow(g, 0xff4422, 2, 2.1 * s, -1.2, -4, 0.8); }
  glow(g, 0xff6644, 4, 0, 0, 3.8, 0.7);
  return g;
}
function buildTurret() {
  const g = new THREE.Group(), base = M(0x6a6f7c, { m: 0.6 });
  part(g, G.cyl, base, 0, 0.6, 0, 2.2, 1.2, 2.2); const head = new THREE.Group(); head.position.y = 1.6; g.add(head);
  part(head, G.sph, M(0x8d3a3a, { m: 0.5 }), 0, 0.3, 0, 1.5, 1.1, 1.5);
  const bar = part(head, G.cyl, M(0x2e3038), 0, 0.6, -1.5, 0.3, 2.4, 0.3); bar.rotation.x = Math.PI / 2;
  part(head, G.sph, M(0xff6a3a, { e: 0xff3300, ei: 1.5 }), 0, 0.3, -1.4, 0.4, 0.4, 0.2);
  g.userData.head = head; return g;
}
function buildTower(h = 30, w = 5) {
  const g = new THREE.Group(), stone = M(0x8f8a82, { m: 0.1, r: 0.9 }), band = M(0x4a4f5c, { m: 0.5 });
  part(g, G.box, stone, 0, h / 2, 0, w, h, w);
  for (let y = 4; y < h; y += 6) part(g, G.box, band, 0, y, 0, w + 0.6, 0.8, w + 0.6);
  part(g, G.box, M(0xff4a3a, { e: 0xff2200, ei: 1.2 }), 0, h + 0.4, 0, 1.2, 0.8, 1.2); glow(g, 0xff3322, 5, 0, h + 0.6, 0, 0.9);
  return g;
}
function buildArch(span = 26, h = 22) {
  const g = new THREE.Group(), stone = M(0xa49a8c, { m: 0.1, r: 0.9 }), lite = M(0x7fe0ff, { e: 0x3399ff, ei: 1.3 });
  for (const s of [-1, 1]) part(g, G.box, stone, s * (span / 2 + 2), h / 2, 0, 4, h, 4);
  part(g, G.box, stone, 0, h + 1.5, 0, span + 8, 3, 4.4); part(g, G.box, lite, 0, h - 0.2, 2.3, span, 0.4, 0.3);
  return g;
}
function buildMine() {
  const g = new THREE.Group(); part(g, G.ico, M(0x4a4a55, { m: 0.8 }), 0, 0, 0, 1.3);
  for (let i = 0; i < 10; i++) { const a = Math.acos(1 - 2 * (i + 0.5) / 10), b = Math.PI * (1 + Math.sqrt(5)) * i; const s = part(g, G.cone, M(0xaaaabb, { m: 0.7 }), Math.sin(a) * Math.cos(b) * 1.5, Math.cos(a) * 1.5, Math.sin(a) * Math.sin(b) * 1.5, 0.3, 0.9, 0.3); s.lookAt(s.position.clone().multiplyScalar(3)); s.rotateX(Math.PI / 2); }
  part(g, G.sph, M(0xff3a3a, { e: 0xff0000, ei: 2 }), 0, 0, 0, 0.6); glow(g, 0xff2200, 4, 0, 0, 0, 0.9);
  return g;
}
function buildRing(col = 0xffcf3a) { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 8, 26), M(col, { e: col, ei: 0.9, m: 0.8 })); g.add(t); glow(g, col, 9, 0, 0, 0, 0.35); return g; }
function buildCrate(kind) {
  const col = { bomb: 0xff8a2a, laser: 0x44ccff, repair: 0x55ff88 }[kind] || 0xffffff, g = new THREE.Group();
  part(g, G.box, M(0xdde3ee, { m: 0.6 }), 0, 0, 0, 2.2); part(g, G.box, M(col, { e: col, ei: 1 }), 0, 0, 0, 2.4, 0.7, 2.4); glow(g, col, 7, 0, 0, 0, 0.5);
  return g;
}
function buildMissile() { const g = new THREE.Group(); const c = new THREE.ConeGeometry(0.5, 2.5, 6); c.rotateX(-Math.PI / 2); part(g, c, M(0xdd3a3a, { e: 0x550000 })); glow(g, 0xff6633, 3, 0, 0, 1.4, 0.9); return g; }
function buildChaser() {
  const g = new THREE.Group(), body = M(0x6b3aa8, { m: 0.6 });
  const f = new THREE.ConeGeometry(0.7, 4.4, 4); f.rotateX(-Math.PI / 2); part(g, f, body);
  for (const s of [1, -1]) { const m = new THREE.Mesh(planform([[0, -0.4], [2.8 * s, 1.8], [2.8 * s, 2.6], [0, 2]], 0.15), M(0x2b1d44, { ds: true })); g.add(m); }
  glow(g, 0xcc66ff, 2.4, 0, 0, 2.3, 0.9); part(g, G.sph, M(0xff66ff, { e: 0xff22ff, ei: 1.5 }), 0, 0.4, -0.7, 0.3);
  return g;
}
function buildCruiser() {
  const g = new THREE.Group(), hull = M(0x5b6478, { m: 0.7, r: 0.45 }), dark = M(0x2d3342, { m: 0.7 }), trim = M(0xcc3a3a, { m: 0.4 });
  part(g, G.box, hull, 0, 0, 0, 16, 7, 70); part(g, G.box, dark, 0, 5, 10, 8, 5, 20); part(g, G.box, hull, 0, 9, 14, 4, 4, 8);
  for (const s of [-1, 1]) { part(g, G.box, hull, 11 * s, -1, 4, 6, 3, 40); part(g, G.box, trim, 8.2 * s, 0, -20, 0.5, 2, 14); part(g, G.box, dark, 6 * s, 3.2, -26, 3, 1.8, 10); }
  for (let z = -30; z < 30; z += 7) part(g, G.box, M(0xffd88a, { e: 0xffaa33, ei: 0.8 }), 0, 3.6, z, 10, 0.15, 0.6);
  glow(g, 0xff7733, 14, -4, 0, 35, 0.9); glow(g, 0xff7733, 14, 4, 0, 35, 0.9);
  return g;
}
function buildGenerator() { const g = new THREE.Group(); part(g, G.sph, M(0xff5a3a, { e: 0xff3300, ei: 1.2, m: 0.5 }), 0, 0, 0, 2.4); part(g, G.tor, M(0x333844), 0, 0, 0, 3.1); glow(g, 0xff4422, 8, 0, 0, 0, 0.6); return g; }
function buildAsteroid(r = 5, seed = 1) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, rng = mulberry32(seed * 977 + 13);
  const cache = {};
  for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(2) + p.getY(i).toFixed(2) + p.getZ(i).toFixed(2); if (!cache[k]) cache[k] = 0.72 + rng() * 0.5; const f = cache[k]; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.9, p.getZ(i) * f); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M(0x7b6f68, { m: 0.1, r: 0.95 })); m.castShadow = true; m.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(m); return grp;
}
function buildBastion() { // L1 boss: Gantry Titan, a walker/fortress
  const g = new THREE.Group(), hull = M(0x5d6577, { m: 0.7, r: 0.4 }), dark = M(0x2a2e3a, { m: 0.7 }), red = M(0xcc3a3a, { m: 0.4 });
  part(g, G.box, hull, 0, 0, 0, 22, 14, 14); part(g, G.box, dark, 0, 9, -2, 14, 5, 9); part(g, G.box, red, 0, 12, -6.6, 10, 0.8, 0.5);
  for (const s of [-1, 1]) { part(g, G.box, dark, 9 * s, -14, 0, 3.5, 20, 3.5); part(g, G.box, hull, 9 * s, -24, -2, 6, 2, 8); part(g, G.box, red, 12 * s, 4, -3, 2, 12, 2); }
  part(g, G.box, M(0xffd88a, { e: 0xffaa33, ei: 1 }), 0, 3, -7.1, 16, 0.4, 0.3);
  g.userData.gate = part(g, G.box, M(0x8a2a2a, { m: 0.6 }), 0, 0, -7.2, 7, 7, 0.6);
  return g;
}
function buildBossArm(s) {
  const g = new THREE.Group(); part(g, G.box, M(0x6a7388, { m: 0.7 }), 0, 0, 0, 5, 5, 7);
  const c = part(g, G.cyl, M(0x252833), 0, 0, -5, 0.9, 7, 0.9); c.rotation.x = Math.PI / 2; part(g, G.sph, M(0xff5a3a, { e: 0xff3300, ei: 1.6 }), 0, 0, -8.5, 0.8); glow(g, 0xff3311, 5, 0, 0, -8.5, 0.8);
  return g;
}
function buildBossCore() { const g = new THREE.Group(); part(g, G.sph, M(0xff4a3a, { e: 0xff2200, ei: 1.3 }), 0, 0, 0, 3.6); part(g, G.tor, M(0x333844), 0, 0, 0, 4.8); glow(g, 0xff3311, 16, 0, 0, 0, 0.7); return g; }
function buildHivePlate() { const g = new THREE.Group(); part(g, G.box, M(0x7a4aa8, { m: 0.7, r: 0.35 }), 0, 0, 0, 5.5, 2.4, 6.4); part(g, G.box, M(0xff55cc, { e: 0xff33aa, ei: 1.2 }), 0, 0, -3.3, 3, 0.8, 0.3); return g; }
function buildHiveCore() { const g = new THREE.Group(); part(g, G.ico, M(0xff55aa, { e: 0xff2288, ei: 1.1, m: 0.4 }), 0, 0, 0, 4.2); part(g, G.ico0, M(0x2a1a3a, { m: 0.7 }), 0, 0, 0, 6.2); glow(g, 0xff44bb, 20, 0, 0, 0, 0.8); return g; }

/* Particles / explosion kit */
const FX = {
  scene: null, pool: [], active: [], debris: [], lights: [], rings: [],
  init(scene) {
    this.scene = scene;
    for (let i = 0; i < 700; i++) { const s = new THREE.Sprite(glowMat(0xffffff, 0)); s.visible = false; scene.add(s); this.pool.push(s); }
    for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xffaa55, 0, 90, 1.6); scene.add(l); this.lights.push({ l, t: 0, dur: 1, i0: 0 }); }
    for (let i = 0; i < 12; i++) { const m = new THREE.SpriteMaterial({ map: Tex.ring, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }); const s = new THREE.Sprite(m); s.visible = false; scene.add(s); this.rings.push({ s, t: 0, dur: 1, max: 10, on: false }); }
  },
  spawn(pos, o) {
    const s = this.pool.pop(); if (!s) return;
    s.visible = true; s.position.copy(pos); s.material.color.set(o.color || 0xffaa44); s.material.opacity = o.op || 1;
    const bl = o.normal ? THREE.NormalBlending : THREE.AdditiveBlending; if (s.material.blending !== bl) { s.material.blending = bl; s.material.needsUpdate = true; }
    this.active.push({ s, v: o.v || new THREE.Vector3(), life: o.life || 0.6, t: 0, size: o.size || 3, grow: o.grow === undefined ? 1.4 : o.grow, op: o.op || 1, drag: o.drag === undefined ? 1.5 : o.drag });
  },
  burst(pos, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.3, 1) * (o.speed || 20));
      this.spawn(pos, { v, color: o.colors ? pick(o.colors) : 0xffaa44, life: rand(0.35, 1) * (o.life || 0.8), size: rand(0.6, 1.2) * (o.size || 3), grow: o.grow, drag: o.drag, normal: o.normal, op: o.op });
    }
  },
  explosion(pos, size = 1, snd = true) {
    this.burst(pos, Math.floor(16 * size + 6), { speed: 22 * size, size: 3.5 * size, life: 0.9, colors: [0xffcc55, 0xff9922, 0xff5522, 0xee3311], normal: true, op: 0.95 });
    this.spawn(pos, { color: 0xfff2cc, size: 9 * size, life: 0.2, grow: 0.5, op: 0.85 });
    this.burst(pos, Math.floor(8 * size), { speed: 12 * size, size: 5 * size, life: 1.5, colors: [0x554a44, 0x39332f], grow: 1.2, drag: 2, normal: true, op: 0.8 });
    this.flash(pos, 0xffaa55, 14 * size, 0.5);
    this.ring(pos, 12 * size, 0.5, 0xffcc88);
    if (size >= 0.8) for (let i = 0; i < 5 * size; i++) this.chunk(pos, rand(10, 28) * size);
    if (snd) Audio.sfx(size > 3 ? 'bigExplode' : 'explode', size);
  },
  chunk(pos, speed) {
    const m = new THREE.Mesh(G.ico0, M(pick([0x56607a, 0x7a7d86, 0xcc5a3a]), { m: 0.6 })); m.scale.setScalar(rand(0.25, 0.7)); m.position.copy(pos); this.scene.add(m);
    this.debris.push({ m, v: new THREE.Vector3(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).normalize().multiplyScalar(speed), spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), life: rand(0.8, 1.8), t: 0 });
  },
  flash(pos, color, intensity, dur) {
    const f = this.lights.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    f.l.position.copy(pos); f.l.color.set(color); f.i0 = Settings.flash ? intensity : intensity * 0.3; f.t = 0; f.dur = dur;
  },
  ring(pos, max, dur, color = 0xffffff) {
    const r = this.rings.find((x) => !x.on); if (!r) return;
    r.on = true; r.t = 0; r.dur = dur; r.max = max; r.s.visible = true; r.s.position.copy(pos); r.s.material.color.set(color);
  },
  update(dt, camPos) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { p.s.visible = false; p.s.material.opacity = 0; this.pool.push(p.s); this.active.splice(i, 1); continue; }
      p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(Math.exp(-p.drag * dt));
      const sz = p.size * (1 + k * p.grow); p.s.scale.set(sz, sz, 1); p.s.material.opacity = p.op * (1 - k) * (1 - k);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.t += dt;
      if (d.t > d.life) { this.scene.remove(d.m); this.debris.splice(i, 1); continue; }
      d.m.position.addScaledVector(d.v, dt); d.v.y -= 6 * dt; d.m.rotation.x += d.spin.x * dt; d.m.rotation.y += d.spin.y * dt; d.m.scale.multiplyScalar(1 - dt * 0.4);
    }
    for (const f of this.lights) { f.t += dt; const k = clamp(f.t / f.dur, 0, 1); f.l.intensity = f.i0 * (1 - k) * (1 - k); }
    for (const r of this.rings) {
      if (!r.on) continue; r.t += dt; const k = r.t / r.dur;
      if (k >= 1) { r.on = false; r.s.visible = false; continue; }
      const sz = r.max * Ease.out(k); r.s.scale.set(sz, sz, 1); r.s.material.opacity = 1 - k;
    }
  },
  clear() {
    for (const p of this.active) { p.s.visible = false; p.s.material.opacity = 0; this.pool.push(p.s); }
    this.active.length = 0; for (const d of this.debris) this.scene.remove(d.m); this.debris.length = 0;
    for (const r of this.rings) { r.on = false; r.s.visible = false; } for (const f of this.lights) f.l.intensity = 0;
  },
};
