// ---------------------------------------------------------------- Procedural models (all face -Z). Cel-shaded toon parts with ink outlines.
const PLAYER_COLORS = [
  { name: 'BLUE', body: 0xeaf2ff, accent: 0x2f7bff, hex: '#4d8dff' }, { name: 'RED', body: 0xfff0ea, accent: 0xff4a5a, hex: '#ff5b6b' },
  { name: 'GREEN', body: 0xf0ffee, accent: 0x2fcf74, hex: '#3ee08a' }, { name: 'GOLD', body: 0xfffbe6, accent: 0xffb81f, hex: '#ffc83a' },
];
function wingGeo(sign, len = 3.0) {
  const s = new THREE.Shape(); const p = [[0, 0.5], [len, -0.9], [len, -1.6], [0, -1.3]]; p.forEach(([x, y], i) => (i ? s.lineTo(sign * x, y) : s.moveTo(sign * x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -0.07, 0);
  if (sign < 0) { const idx = g.index; if (idx) for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); } }
  g.userData.shared = true; return g;
}
const WING_GEO = { l: null, r: null };
function buildShip(o = {}) {
  const g = new THREE.Group(), body = toon(o.body ?? 0xeaf2ff), acc = toon(o.accent ?? 0x2f7bff), dark = toon(o.dark ?? 0x2b2d42), glass = toon(o.glass ?? 0x7fe9ff, 0x1a6a80), s = o.scale || 1;
  const fus = mk(G.cone(0.62, 3.8, 8), body, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -0.2] }); g.add(fus);
  const tailC = mk(G.cyl(0.62, 0.45, 1.3, 8), body, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 1.9] }); g.add(tailC);
  g.add(mk(G.sph(0.5), glass, { pos: [0, 0.38, 0.1], scale: [0.9, 0.75, 1.9], outline: 0.06 }));
  if (!WING_GEO.l) { WING_GEO.l = wingGeo(-1); WING_GEO.r = wingGeo(1); }
  const mkWing = (side) => {
    const w = new THREE.Group(), geo = side < 0 ? WING_GEO.l : WING_GEO.r; w.position.set(side * 0.45, -0.05, 0.4);
    w.add(mk(geo, body, { outline: 0.06 }));
    w.add(mk(G.box(0.3, 0.5, 1.5), acc, { pos: [side * 2.95, 0.15, -1.25], rot: [0, 0, side * 0.2], outline: 0.05 }));
    w.add(mk(G.cyl(0.25, 0.25, 0.1, 10), dark, { pos: [side * 1.5, 0.1, -0.7], outline: 0.04 })); // paw pad
    for (let i = 0; i < 3; i++) w.add(mk(G.cyl(0.1, 0.1, 0.1, 8), dark, { pos: [side * (1.3 + i * 0.22), 0.1, -1.05 - (i === 1 ? 0.18 : 0)], outline: 0.03 }));
    w.rotation.z = side * 0.06; return w;
  };
  const wl = mkWing(-1), wr = mkWing(1); g.add(wl, wr);
  g.add(mk(G.box(0.12, 1.0, 1.3), acc, { pos: [0, 0.6, 1.55], rot: [0.35, 0, 0], outline: 0.05 }));
  const glows = [];
  for (const sx of [-0.85, 0.85]) {
    g.add(mk(G.cyl(0.3, 0.38, 1.1, 8), dark, { rot: [Math.PI / 2, 0, 0], pos: [sx, -0.18, 1.1], outline: 0.05 }));
    const gl = mk(G.cone(0.28, 1.4, 8), unlit(o.glow ?? 0xffa030), { rot: [Math.PI / 2, 0, 0], pos: [sx, -0.18, 2.2], outline: 0 }); gl.userData.noflash = false; g.add(gl); glows.push(gl);
  }
  for (const sx of [-1, 1]) g.add(mk(G.cone(0.14, 0.45, 6), dark, { pos: [sx * 0.2, 0.9, 0.0], rot: [0, 0, -sx * 0.18], outline: 0.04 })); // cat ears
  if (o.ears) for (const sx of [-1, 1]) g.add(mk(G.cone(0.12, 1.6, 6), body, { pos: [sx * 0.35, 1.4, 0.6], rot: [0.5, 0, sx * 0.15], outline: 0.04 }));
  g.scale.setScalar(s); g.userData = { wingL: wl, wingR: wr, glows, fus }; return g;
}
function buildDrone(c = 0xc23a5a, accent = 0xffe23a) {
  const g = new THREE.Group(), body = toon(c), acc = toon(accent), dark = toon(0x2b2438);
  g.add(mk(G.sph(1), body, { scale: [0.95, 0.65, 1.5] })); g.add(mk(G.cone(0.45, 1.2, 6), acc, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -1.9], outline: 0.05 }));
  for (const sx of [-1, 1]) { g.add(mk(G.box(1.8, 0.1, 0.9), dark, { pos: [sx * 1.4, 0, 0.3], rot: [0, sx * 0.4, sx * 0.25], outline: 0.05 })); g.add(mk(G.box(0.2, 0.8, 0.5), acc, { pos: [sx * 2.2, 0.1, 0.5], outline: 0.04 })); }
  g.add(mk(G.sph(0.3), unlit(0xff2a4a), { pos: [0, 0.35, -0.9], outline: 0.03 }));
  const spin = mk(G.tor(0.9, 0.08, 4, 14), acc, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.4], outline: 0.03 }); g.add(spin); g.userData = { spin }; return g;
}
function buildTurret() {
  const g = new THREE.Group(), base = toon(0x7d6a9c), acc = toon(0xff7a2a), dark = toon(0x2b2438);
  g.add(mk(G.cyl(1.7, 2.1, 1.1, 10), base, { pos: [0, 0.55, 0] }));
  const pivot = new THREE.Group(); pivot.position.y = 1.6; g.add(pivot);
  pivot.add(mk(G.sph(1.25), acc, { scale: [1, 0.85, 1] })); pivot.add(mk(G.cyl(0.28, 0.34, 2.0, 8), dark, { rot: [Math.PI / 2, 0, 0], pos: [0, 0.1, -1.5], outline: 0.05 }));
  pivot.add(mk(G.sph(0.35), unlit(0xff2a4a), { pos: [0, 0.5, -0.9], outline: 0.03 })); g.userData = { pivot }; return g;
}
function buildWalker() {
  const g = new THREE.Group(), body = toon(0x6b5aa6), acc = toon(0xff7a2a), dark = toon(0x2b2438), legs = [];
  const torso = new THREE.Group(); torso.position.y = 3.6; g.add(torso);
  torso.add(mk(G.box(3.4, 1.9, 4.4), body)); torso.add(mk(G.box(3.6, 0.5, 2.0), acc, { pos: [0, 0.9, -0.6], outline: 0.05 }));
  const head = mk(G.sph(1.15), body, { pos: [0, 1.0, -2.3] }); torso.add(head); head.add(mk(G.box(1.5, 0.4, 0.6), unlit(0xff3050), { pos: [0, 0.1, -0.9], outline: 0.03 }));
  for (const sx of [-1, 1]) head.add(mk(G.cone(0.35, 1.0, 5), dark, { pos: [sx * 0.8, 1.0, 0.2], rot: [0, 0, -sx * 0.3], outline: 0.04 }));
  const cannon = new THREE.Group(); cannon.position.set(0, 1.2, 0.4); torso.add(cannon); cannon.add(mk(G.cyl(0.4, 0.5, 2.4, 8), dark, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -1.4] }));
  [[-1.5, -1.6], [1.5, -1.6], [-1.5, 1.6], [1.5, 1.6]].forEach(([x, z], i) => {
    const leg = new THREE.Group(); leg.position.set(x, 3.4, z); g.add(leg);
    leg.add(mk(G.cyl(0.32, 0.26, 2.2, 6), dark, { pos: [0, -1.1, 0] })); const foot = mk(G.box(0.9, 0.4, 1.3), acc, { pos: [0, -2.35, -0.1], outline: 0.05 }); leg.add(foot); legs.push(leg);
  });
  g.userData = { torso, legs, cannon, head }; return g;
}
function buildCarrier() {
  const g = new THREE.Group(), body = toon(0x5a4f86), acc = toon(0xff7a2a), dark = toon(0x2b2438);
  g.add(mk(G.sph(1), body, { scale: [7.5, 2.2, 11], outline: 0.04 })); g.add(mk(G.box(0.5, 4.5, 4), acc, { pos: [0, 3, 3.5], rot: [0.3, 0, 0], outline: 0.05 }));
  g.add(mk(G.box(8, 0.5, 3), dark, { pos: [0, -1.9, 0], outline: 0.05 })); // hangar
  for (const sx of [-1, 1]) { g.add(mk(G.cyl(0.5, 0.6, 3, 8), dark, { rot: [Math.PI / 2, 0, 0], pos: [sx * 4.2, 0.4, -6.5] })); g.add(mk(G.box(3.5, 0.3, 6), acc, { pos: [sx * 8.5, 0, 1], rot: [0, sx * 0.35, 0], outline: 0.05 })); g.add(mk(G.sph(0.7), unlit(0x38e8ff), { pos: [sx * 6, 0.6, -3], outline: 0.03 })); }
  g.add(mk(G.sph(1.1), unlit(0xff3050), { pos: [0, 1.7, -4], outline: 0.04 })); return g;
}
function buildMissile() {
  const g = new THREE.Group(), body = toon(0xe8e8f0), acc = toon(0xff3050);
  g.add(mk(G.cyl(0.4, 0.4, 2.2, 8), body, { rot: [Math.PI / 2, 0, 0], outline: 0.05 })); g.add(mk(G.cone(0.4, 0.9, 8), acc, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -1.5], outline: 0.05 }));
  for (let i = 0; i < 4; i++) { const f = mk(G.box(0.08, 0.7, 0.6), acc, { pos: [0, 0, 0.9], outline: 0.03 }); f.rotation.z = (i * Math.PI) / 2; f.position.set(Math.cos(i * Math.PI / 2) * 0.4, Math.sin(i * Math.PI / 2) * 0.4, 0.9); g.add(f); }
  g.add(mk(G.cone(0.3, 1.2, 6), unlit(0xffa030), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 1.9], outline: 0 })); return g;
}
function buildRing(gold) {
  const g = new THREE.Group(), c = gold ? 0xffc21f : 0xdfe9ff;
  g.add(mk(G.tor(1.9, 0.38, 8, 24), toon(c, gold ? 0x6b4a00 : 0x2a3a66), { outline: 0.07 })); g.add(mk(G.tor(1.0, 0.1, 4, 16), unlit(gold ? 0xfff0a0 : 0x9fe8ff), { outline: 0, rot: [0, 0, 0] })); return g;
}
function buildPickup(kind) {
  const g = new THREE.Group();
  if (kind === 'bomb') { g.add(mk(G.box(2.1, 2.1, 2.1), toon(0x3a3550), { outline: 0.08 })); g.add(mk(G.sph(0.8), toon(0xff3050, 0x661020), { pos: [0, 0, 0], scale: 1.2, outline: 0.06 })); g.add(mk(G.tor(1.9, 0.1, 4, 24), unlit(0xffe23a), { rot: [Math.PI / 2, 0, 0], outline: 0 })); }
  else if (kind === 'laser') { g.add(mk(G.oct(1.5), toon(0x38c8ff, 0x0a5a80), { outline: 0.08 })); g.add(mk(G.tor(2.2, 0.12, 4, 24), unlit(0xbff4ff), { outline: 0, rot: [Math.PI / 2, 0, 0] })); }
  else if (kind === 'life') { g.add(mk(G.sph(1.3), toon(0xffc21f, 0x6b4a00), { scale: [1.2, 0.9, 1.2], outline: 0.08 })); for (const [x, z] of [[-0.9, -0.9], [0, -1.2], [0.9, -0.9]]) g.add(mk(G.sph(0.4), toon(0xffc21f, 0x6b4a00), { pos: [x, 0.3, z], outline: 0.05 })); g.add(mk(G.tor(2.1, 0.1, 4, 24), unlit(0xfff0a0), { rot: [Math.PI / 2, 0, 0], outline: 0 })); }
  else if (kind === 'repair') { g.add(mk(G.box(2.2, 0.7, 0.7), toon(0xffffff, 0x555555), { outline: 0.06 })); g.add(mk(G.box(0.7, 2.2, 0.7), toon(0xffffff, 0x555555), { outline: 0.06 })); g.add(mk(G.tor(2.1, 0.1, 4, 24), unlit(0x7dffb0), { rot: [Math.PI / 2, 0, 0], outline: 0 })); }
  return g;
}
const STONE = 0x9488b8, STONE2 = 0x7d71a3;
function buildPillar(h, r) { const g = new THREE.Group(); g.add(mk(G.cyl(r, r * 1.1, h, 10), toon(STONE), { pos: [0, h / 2, 0], outline: 0.2 })); g.add(mk(G.cyl(r * 1.15, r * 1.15, 1.2, 10), toon(0xff7a2a), { pos: [0, h * 0.8, 0], outline: 0.12 })); g.add(mk(G.cyl(r * 1.15, r * 1.15, 1.2, 10), toon(0xff7a2a), { pos: [0, h * 0.3, 0], outline: 0.12 })); return g; }
function buildBlock(w, h, d, c = STONE) { const g = new THREE.Group(); g.add(mk(G.box(w, h, d), toon(c), { pos: [0, h / 2, 0], outline: 0.2 })); g.add(mk(G.box(w + 0.3, 0.8, d + 0.3), toon(0xff7a2a), { pos: [0, h - 0.4, 0], outline: 0.1 })); return g; }
function buildBoss() {
  const g = new THREE.Group(), body = toon(0x7c64b4), acc = toon(0xff6a1f), dark = toon(0x2a2438), steel = toon(0xb8b4d0), legs = [];
  const hip = new THREE.Group(); hip.position.y = 11; g.add(hip);
  const torso = mk(G.box(11, 7.5, 8), body, { pos: [0, 4, 0], outline: 0.25 }); hip.add(torso);
  torso.add(mk(G.box(11.6, 1.4, 4), acc, { pos: [0, 1.5, -2.2], outline: 0.12 })); torso.add(mk(G.box(6, 3, 0.6), dark, { pos: [0, -0.8, -4.1], outline: 0.1 }));
  const head = new THREE.Group(); head.position.set(0, 9.2, -2.6); hip.add(head);
  head.add(mk(G.sph(3.4), body, { scale: [1.05, 0.9, 1.1], outline: 0.2 })); head.add(mk(G.box(3, 2.0, 4.2), steel, { pos: [0, -0.9, -3.4], outline: 0.14 })); // snout
  head.add(mk(G.sph(0.55), dark, { pos: [0, 0.2, -5.6], outline: 0.05 }));
  const jaw = new THREE.Group(); jaw.position.set(0, -1.9, -1.6); head.add(jaw); jaw.add(mk(G.box(2.8, 0.9, 4.0), steel, { pos: [0, 0, -1.8], outline: 0.12 }));
  for (let i = 0; i < 4; i++) jaw.add(mk(G.cone(0.28, 0.8, 4), unlit(0xfff4d6), { pos: [-1.0 + i * 0.67, 0.8, -3.4], outline: 0.03 }));
  const core = mk(G.sph(1.5), unlit(0xff3a7a), { pos: [0, -0.4, -2.0], outline: 0.06 }); core.userData.noflash = false; head.add(core);
  const eyes = []; for (const sx of [-1, 1]) { const e = mk(G.sph(0.65), unlit(0xff3050), { pos: [sx * 1.7, 1.0, -2.9], outline: 0.06 }); head.add(e); eyes.push(e); head.add(mk(G.cone(1.1, 5.2, 5), dark, { pos: [sx * 3.0, 3.6, 0.3], rot: [0, 0, -sx * 0.45], outline: 0.12 })); }
  const cannons = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sx * 7.6, 6.6, -0.4); hip.add(arm); arm.add(mk(G.sph(2.3), acc, { outline: 0.14 })); arm.add(mk(G.cyl(1.0, 1.25, 6.6, 10), dark, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -4.2], outline: 0.12 }));
    arm.add(mk(G.sph(0.9), unlit(0xff9a2a), { pos: [0, 0, -7.6], outline: 0.05 })); cannons.push(arm);
  }
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 3.8, 10.6, 0.5); g.add(leg); leg.add(mk(G.cyl(1.5, 1.2, 10.4, 8), dark, { pos: [0, -5.2, 0], outline: 0.16 })); leg.add(mk(G.box(3.4, 1.2, 5), acc, { pos: [0, -10.6, -0.8], outline: 0.12 })); legs.push(leg);
  }
  g.userData = { hip, torso, head, jaw, core, eyes, cannons, legs }; return g;
}
function buildRival() { const g = buildShip({ body: 0x3a2d52, accent: 0xffb000, dark: 0x16101f, glass: 0xff9a2a, glow: 0xff3a7a, scale: 1.25, ears: false }); g.add(mk(G.box(0.15, 1.6, 2.2), toon(0xffb000), { pos: [0, 0.9, 1.7], rot: [0.25, 0, 0], outline: 0.05 })); return g; }
function buildAsteroid(r, seed) {
  const key = 'ast' + Math.round(r) + ':' + (seed % 7), geoA = geo(key, () => { const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, rng = mulberry(seed % 7 + 3), map = new Map(); for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!map.has(k)) map.set(k, 0.78 + rng() * 0.4); const f = map.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.9, p.getZ(i) * f); } g.computeVertexNormals(); return g; });
  return mk(geoA, toon(seed % 2 ? 0x8a7fae : 0x6f86a8), { outline: Math.max(0.12, r * 0.02) });
}
