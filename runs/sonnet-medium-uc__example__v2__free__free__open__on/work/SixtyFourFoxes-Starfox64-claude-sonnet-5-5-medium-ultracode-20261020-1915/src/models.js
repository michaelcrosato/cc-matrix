// Procedural low-poly cel-shaded models. All ships face -Z. Parts are registered for the Animator.
import { THREE, mk, toon, glowMat, addOutline, R } from './render.js';
import { TAU } from './util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function G() { const g = new THREE.Group(); g.userData.parts = {}; return g; }
function wingGeo(span, rootChord, tipChord, sweep, thick = 0.22) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(span, sweep); s.lineTo(span, sweep + tipChord); s.lineTo(0, rootChord); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // shape XY -> XZ plane; shape +Y becomes +Z (aft)
  g.translate(0, thick / 2, 0);
  g.computeVertexNormals();
  return g;
}
function prismTail(h, len, th) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(h * 0.7, len); s.lineTo(h * 0.7, len + 0.4 * len); s.lineTo(0, len * 0.9); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); g.translate(0, 0, -th / 2); return g;
}

export const PALETTES = {
  kit: { hull: 0xdfe6f2, accent: 0x2f6bff, wing: 0xe85a2a, glass: 0x66e6ff, engine: 0x7cf3ff },
  rook: { hull: 0xd9dff0, accent: 0x6a38d9, wing: 0x3a7bff, glass: 0xffd36a, engine: 0xffa24a },
  hazel: { hull: 0xf0e6dc, accent: 0xff7fb0, wing: 0xc03a6a, glass: 0x9bffd0, engine: 0xff9ad0 },
  dot: { hull: 0xdff2dc, accent: 0x2fb36a, wing: 0x1f7f4a, glass: 0xffee77, engine: 0x9bff7c },
  jackal: { hull: 0x39404f, accent: 0xc7cfdf, wing: 0x8d98ad, glass: 0xff4a4a, engine: 0xff6a3a },
};

export function buildArwing(p = PALETTES.kit) {
  const g = G(); const P = g.userData.parts;
  const body = new THREE.Group(); g.add(body); P.body = body;
  const fus = mk(new THREE.CylinderGeometry(0.45, 0.62, 3.6, 8), p.hull, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0] });
  body.add(fus);
  const nose = mk(new THREE.ConeGeometry(0.45, 2.1, 8), p.accent, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -2.85] });
  body.add(nose);
  const canopy = mk(new THREE.SphereGeometry(0.52, 12, 8, 0, TAU, 0, Math.PI / 2), p.glass, { mat: toon(p.glass, { emissive: p.glass, ei: 0.35 }), scale: [1, 0.9, 1.9], pos: [0, 0.38, -0.3] });
  body.add(canopy); P.cockpit = canopy;
  const tail = mk(new THREE.BoxGeometry(0.16, 1.5, 1.9), p.accent, { pos: [0, 0.95, 1.15], rot: [-0.32, 0, 0] });
  body.add(tail);
  for (const side of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(side * 0.35, -0.05, 0.25); body.add(piv); P[side < 0 ? 'wingL' : 'wingR'] = piv;
    const wg = wingGeo(3.9, 3.0, 1.1, 1.5, 0.3);
    const w = mk(wg, p.wing); if (side < 0) w.scale.x = -1; piv.add(w);
    if (side < 0) { w.material = w.material; }
    // cannon at wing tip
    const can = mk(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 6), 0x2b2f3a, { rot: [Math.PI / 2, 0, 0], pos: [side * 3.9, 0.12, 0.2] }); piv.add(can);
    const tipc = mk(new THREE.BoxGeometry(0.28, 0.5, 1.2), p.accent, { pos: [side * 3.9, 0.15, 1.0] }); piv.add(tipc);
    // engine pod + glow
    const eng = mk(new THREE.CylinderGeometry(0.34, 0.4, 1.8, 8), 0x3a3f4c, { rot: [Math.PI / 2, 0, 0], pos: [side * 1.0, -0.15, 1.1] }); body.add(eng);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 8), glowMat(p.engine, 0.9));
    flame.rotation.x = -Math.PI / 2; flame.position.set(side * 1.0, -0.15, 2.5); flame.userData.flame = true; body.add(flame);
    P[side < 0 ? 'flameL' : 'flameR'] = flame;
  }
  g.userData.wingsFold = 0;
  return g;
}

function addEyeGlow(parent, pos, col = 0xff4a4a, s = 0.18) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), glowMat(col)); m.position.set(...pos); parent.add(m); return m; }

export function buildScout() {
  const g = G(), P = g.userData.parts;
  const hull = mk(new THREE.OctahedronGeometry(1, 0), 0xb43a4a, { scale: [0.9, 0.5, 1.9] }); g.add(hull);
  for (const s of [-1, 1]) {
    const w = mk(wingGeo(2.2, 1.0, 0.4, 0.8, 0.14), 0x7a2434); if (s < 0) w.scale.x = -1; w.position.set(s * 0.5, 0, 0.1); g.add(w);
    P[s < 0 ? 'wingL' : 'wingR'] = w;
  }
  addEyeGlow(g, [0, 0.1, -1.3], 0xffe35a, 0.22);
  const e = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), glowMat(0xff7a3a, 0.9)); e.rotation.x = -Math.PI / 2; e.position.z = 2; g.add(e);
  return g;
}
export function buildDrone() {
  const g = G(), P = g.userData.parts;
  const core = mk(new THREE.IcosahedronGeometry(0.7, 0), 0x8a3ad9); g.add(core); P.core = core;
  const ring = mk(new THREE.TorusGeometry(1.1, 0.14, 6, 14), 0x4a2a8a); ring.rotation.x = Math.PI / 2; g.add(ring); P.ring = ring;
  addEyeGlow(g, [0, 0, -0.62], 0x7affd8, 0.2);
  return g;
}
export function buildGunship() {
  const g = G(), P = g.userData.parts;
  g.add(mk(new THREE.BoxGeometry(2.6, 1.1, 5), 0x6a3a8c, { }));
  const nose = mk(new THREE.ConeGeometry(1.1, 2.6, 4), 0x9a52c7, { rot: [-Math.PI / 2, Math.PI / 4, 0], pos: [0, 0, -3.7] }); g.add(nose);
  for (const s of [-1, 1]) {
    const w = mk(wingGeo(3.6, 2, 0.8, 0.8, 0.2), 0x4a2a6a); if (s < 0) w.scale.x = -1; w.position.set(s * 1.2, -0.2, 0.4); g.add(w);
    const gun = mk(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 6), 0x23202c, { rot: [Math.PI / 2, 0, 0], pos: [s * 3.2, -0.2, -0.6] }); g.add(gun);
  }
  const core = mk(new THREE.SphereGeometry(0.55, 10, 8), 0xffd35a, { mat: toon(0xffd35a, { emissive: 0xffa020, ei: 0.8 }), pos: [0, 0.75, 0.4] }); g.add(core); P.core = core;
  return g;
}
export function buildTurret() {
  const g = G(), P = g.userData.parts;
  g.add(mk(new THREE.CylinderGeometry(1.8, 2.3, 1.2, 8), 0x5b5368, { pos: [0, 0.6, 0] }));
  const head = new THREE.Group(); head.position.y = 1.7; g.add(head); P.head = head;
  head.add(mk(new THREE.SphereGeometry(1.2, 10, 8), 0xb43a4a));
  const barrel = mk(new THREE.CylinderGeometry(0.22, 0.28, 2.4, 6), 0x2b2630, { rot: [Math.PI / 2, 0, 0], pos: [0, 0.1, -1.6] }); head.add(barrel); P.barrel = barrel;
  addEyeGlow(head, [0, 0.55, -0.85], 0xffe35a, 0.2);
  return g;
}
export function buildTank() {
  const g = G(), P = g.userData.parts;
  g.add(mk(new THREE.BoxGeometry(3.2, 1.0, 4.6), 0x6b5a3e, { pos: [0, 0.7, 0] }));
  for (const s of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.8, 0.9, 5), 0x2b2630, { pos: [s * 1.8, 0.5, 0] }));
  const head = new THREE.Group(); head.position.y = 1.5; g.add(head); P.head = head;
  head.add(mk(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 8), 0xb43a4a));
  head.add(mk(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 6), 0x2b2630, { rot: [Math.PI / 2, 0, 0], pos: [0, 0.1, -1.6] }));
  return g;
}
export function buildBomber() {
  const g = G(), P = g.userData.parts;
  g.add(mk(new THREE.CylinderGeometry(4.4, 3.2, 1.8, 10), 0x5a3a7a));
  g.add(mk(new THREE.SphereGeometry(2.2, 12, 8, 0, TAU, 0, Math.PI / 2), 0x8a52b8, { pos: [0, 0.9, 0] }));
  for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; const pod = mk(new THREE.SphereGeometry(0.9, 8, 6), 0xffd35a, { mat: toon(0xffd35a, { emissive: 0xff8a20, ei: 0.9 }), pos: [s * 3.6, -0.2, 0.4] }); g.add(pod); P[s < 0 ? 'podL' : 'podR'] = pod; }
  const ring = mk(new THREE.TorusGeometry(5.2, 0.25, 6, 20), 0x2b2630); ring.rotation.x = Math.PI / 2; g.add(ring); P.ring = ring;
  return g;
}
export function buildWalker() {
  const g = G(), P = g.userData.parts;
  const body = mk(new THREE.BoxGeometry(5, 3, 6), 0x5b4a6e, { pos: [0, 6.5, 0] }); g.add(body); P.body = body;
  g.add(mk(new THREE.SphereGeometry(1.6, 10, 8), 0xb43a4a, { pos: [0, 8.6, -1.5] }));
  const core = mk(new THREE.SphereGeometry(1.0, 10, 8), 0xffd35a, { mat: toon(0xffd35a, { emissive: 0xff8a20, ei: 1 }), pos: [0, 6.3, -3.2] }); g.add(core); P.core = core;
  const lt = [[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.2], [2.4, 2.2]];
  lt.forEach(([x, z], i) => {
    const hip = new THREE.Group(); hip.position.set(x, 5.5, z); g.add(hip); P['leg' + i] = hip;
    hip.add(mk(new THREE.CylinderGeometry(0.4, 0.3, 5.4, 6), 0x3a3248, { pos: [0, -2.7, 0] }));
    hip.add(mk(new THREE.BoxGeometry(1.4, 0.4, 2), 0x23202c, { pos: [0, -5.4, -0.3] }));
  });
  for (const s of [-1, 1]) g.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), 0x23202c, { rot: [Math.PI / 2, 0, 0], pos: [s * 2.8, 6.6, -4] }));
  return g;
}
export function buildCarrier() {
  const g = G(), P = g.userData.parts;
  const hull = mk(new THREE.BoxGeometry(14, 5, 38), 0x4c4260, { pos: [0, 0, 0] }); g.add(hull);
  g.add(mk(new THREE.ConeGeometry(7, 14, 4), 0x6a5a88, { rot: [-Math.PI / 2, Math.PI / 4, 0], pos: [0, 0, -26], scale: [1, 1, 0.5] }));
  g.add(mk(new THREE.BoxGeometry(6, 5, 10), 0x6a5a88, { pos: [0, 4.5, 8] }));
  const core = mk(new THREE.SphereGeometry(2.6, 12, 10), 0x7affd8, { mat: toon(0x7affd8, { emissive: 0x2affc0, ei: 1 }), pos: [0, 3.2, -9] }); g.add(core); P.core = core;
  const shield = new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.4, 5), glowMat(0x7a3aff, 0.0)); shield.position.set(0, 3.2, -9); g.add(shield);
  const pods = [[-8, 0, -6], [8, 0, -6], [-8, 0, 8], [8, 0, 8]];
  pods.forEach((pp, i) => {
    const pod = new THREE.Group(); pod.position.set(...pp); g.add(pod); P['pod' + i] = pod;
    pod.add(mk(new THREE.SphereGeometry(2.2, 10, 8), 0xb43a4a, { pos: [pp[0] < 0 ? -1 : 1, 0, 0] }));
    pod.add(mk(new THREE.CylinderGeometry(0.35, 0.4, 3.4, 6), 0x23202c, { rot: [Math.PI / 2, 0, 0], pos: [pp[0] < 0 ? -1 : 1, 0, -2.8] }));
  });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 8), glowMat(0xff7a3a, 0.85)); e.rotation.x = Math.PI / 2; e.position.set(s * 4, 0, 22); g.add(e); }
  return g;
}
export function buildAce(col = 0xc7cfdf, glass = 0xff4a4a) {
  const g = buildArwing({ hull: 0x2c303c, accent: col, wing: 0x555d73, glass, engine: 0xff5a3a });
  return g;
}
export function buildRing(gold = false) {
  const g = G();
  const c = gold ? 0xffd34a : 0xd7f0ff;
  const t = mk(new THREE.TorusGeometry(2.6, 0.38, 8, 20), c, { mat: toon(c, { emissive: gold ? 0xffa010 : 0x66ccff, ei: 0.7 }), outline: 0.06 });
  g.add(t); return g;
}
export function buildItem(kind) {
  const g = G();
  if (kind === 'bomb') {
    g.add(mk(new THREE.SphereGeometry(1.1, 10, 8), 0xff5a4a, { mat: toon(0xff5a4a, { emissive: 0xff2010, ei: 0.5 }) }));
    g.add(mk(new THREE.TorusGeometry(1.5, 0.12, 6, 14), 0xffe6a0, { rot: [Math.PI / 2, 0, 0] }));
  } else if (kind === 'laser') {
    g.add(mk(new THREE.OctahedronGeometry(1.4, 0), 0x66ffb0, { mat: toon(0x66ffb0, { emissive: 0x22ff88, ei: 0.7 }), scale: [0.8, 1.4, 0.8] }));
  } else if (kind === 'gold') {
    g.add(mk(new THREE.TorusGeometry(1.3, 0.34, 8, 16), 0xffd34a, { mat: toon(0xffd34a, { emissive: 0xffa010, ei: 0.9 }) }));
    g.add(mk(new THREE.OctahedronGeometry(0.7, 0), 0xfff0a0));
  } else {
    g.add(mk(new THREE.TorusGeometry(1.3, 0.34, 8, 16), 0x9fe8ff, { mat: toon(0x9fe8ff, { emissive: 0x33aaff, ei: 0.9 }) }));
    g.add(mk(new THREE.SphereGeometry(0.55, 8, 6), 0xffffff));
  }
  return g;
}
export function buildPillar(h = 40, r = 4) {
  const g = new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(r * 0.8, r * 1.15, h, 7), 0x8d7a66, { flat: true, pos: [0, h / 2, 0] }));
  g.add(mk(new THREE.CylinderGeometry(r * 1.3, r * 0.85, h * 0.14, 7), 0xa59078, { flat: true, pos: [0, h * 0.97, 0] }));
  return g;
}
export function buildArch(w = 34, h = 26) {
  const g = new THREE.Group();
  const t = mk(new THREE.TorusGeometry(w / 2, 3, 8, 14, Math.PI), 0x93806a, { flat: true, rot: [0, 0, 0], pos: [0, 0, 0] }); g.add(t);
  for (const s of [-1, 1]) g.add(mk(new THREE.CylinderGeometry(3.6, 4.4, 30, 7), 0x7f6e5a, { flat: true, pos: [s * w / 2, -15, 0] }));
  return g;
}
export function buildBlock(sx, sy, sz, col = 0xa59078) { return mk(new THREE.BoxGeometry(sx, sy, sz), col, { flat: true }); }
export function buildRock(r = 4, seed = 1, col = 0x6e6a7a) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const pos = geo.attributes.position; let s = seed * 9301 + 49297;
  const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getX(i).toFixed(3) + pos.getY(i).toFixed(3) + pos.getZ(i).toFixed(3);
    if (!map.has(k)) map.set(k, 0.72 + rn() * 0.5);
    const f = map.get(k); pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return mk(geo, col, { flat: true, outline: 0.06 });
}
export function buildBolt(col, len = 4, r = 0.18) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), glowMat(col)); m.rotation.x = Math.PI / 2; g.add(m);
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r * 2.2, r * 2.2, len * 1.1, 6), glowMat(col, 0.28)); o.rotation.x = Math.PI / 2; g.add(o);
  return g;
}
export function buildMissile(col = 0xffd34a) {
  const g = new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 6), 0xe8e8f0, { rot: [Math.PI / 2, 0, 0], outline: 0.03 }));
  const n = mk(new THREE.ConeGeometry(0.25, 0.6, 6), col, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -1.1], outline: 0.03 }); g.add(n);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 6), glowMat(0xffa040, 0.9)); f.rotation.x = -Math.PI / 2; f.position.z = 1.3; g.add(f);
  return g;
}
export function buildOrb(col, r = 0.6) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(col)));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.8, 10, 8), glowMat(col, 0.25)));
  return g;
}

// ---- Animation clips (consumed by util.Animator) ----
export const CLIPS = {
  rollL: { dur: 0.6, tracks: [{ part: 'body', prop: 'rotation.z', keys: [[0, 0], [0.6, Math.PI * 2]], ease: 'io' }] },
  rollR: { dur: 0.6, tracks: [{ part: 'body', prop: 'rotation.z', keys: [[0, 0], [0.6, -Math.PI * 2]], ease: 'io' }] },
  somer: { dur: 0.9, tracks: [{ part: 'body', prop: 'rotation.x', keys: [[0, 0], [0.9, -Math.PI * 2]], ease: 'io' }] },
  uturn: { dur: 1.1, tracks: [{ part: 'body', prop: 'rotation.x', keys: [[0, 0], [1.1, -Math.PI]], ease: 'io' }] },
  flyIn: { dur: 1.4, tracks: [{ part: 'root', prop: 'scale.x', keys: [[0, 0.01], [0.3, 1]], ease: 'out' }] },
  idleHover: { dur: 3, loop: true, tracks: [{ part: 'body', prop: 'position.y', keys: [[0, 0], [1.5, 0.25], [3, 0]], ease: 'io' }] },
  wingFlutter: { dur: 1.2, loop: true, tracks: [{ part: 'wingL', prop: 'rotation.z', keys: [[0, 0], [0.6, 0.08], [1.2, 0]] }, { part: 'wingR', prop: 'rotation.z', keys: [[0, 0], [0.6, -0.08], [1.2, 0]] }] },
  spin: { dur: 1.6, loop: true, tracks: [{ part: 'core', prop: 'rotation.y', keys: [[0, 0], [1.6, TAU]], ease: 'lin' }, { part: 'ring', prop: 'rotation.z', keys: [[0, 0], [1.6, -TAU]], ease: 'lin' }] },
  ringSpin: { dur: 4, loop: true, tracks: [{ part: 'ring', prop: 'rotation.z', keys: [[0, 0], [4, TAU]], ease: 'lin' }] },
  walk: { dur: 1.6, loop: true, tracks: [0, 1, 2, 3].map((i) => ({ part: 'leg' + i, prop: 'rotation.x', keys: [[0, 0], [0.4, (i % 2 ? 1 : -1) * 0.5], [0.8, 0], [1.2, (i % 2 ? -1 : 1) * 0.5], [1.6, 0]], ease: 'io' })) },
  turretScan: { dur: 6, loop: true, tracks: [{ part: 'head', prop: 'rotation.y', keys: [[0, -0.5], [3, 0.5], [6, -0.5]], ease: 'io' }] },
};
