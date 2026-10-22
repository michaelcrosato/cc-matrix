// Procedural low-poly cel-shaded models. Convention: nose / forward = +Z.
import { THREE, toon, glow, geo, mesh, smooth } from './gfx.js';

const D2R = Math.PI / 180;
function part(parent, g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const me = mesh(g, m);
  me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.scale.set(sx, sy, sz);
  parent.add(me);
  return me;
}

// ---------------- player / wingmen ----------------
export function buildFighter({ hull = 0xf2f2f6, accent = 0x18c8c8, trim = 0xff7a1a, canopy = 0x55d8ff } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const H = toon(hull), A = toon(accent), T = toon(trim), dark = toon(0x3a3f52);
  // fuselage
  part(body, geo('cone', 0.85, 5.2, 6), H, 0, 0, 1.4, Math.PI / 2, 0, 0, 1, 1, 0.75);
  part(body, geo('box', 1.7, 0.95, 2.4), H, 0, 0, -1.6);
  part(body, geo('box', 1.1, 0.5, 1.6), T, 0, 0.55, -1.4);
  part(body, geo('sphere', 0.62, 10, 8), toon(canopy, { emissive: canopy, emissiveIntensity: 0.25, flat: false }), 0, 0.55, 0.4, 0, 0, 0, 0.9, 0.75, 1.6);
  part(body, geo('box', 0.14, 1.3, 1.5), A, 0, 1.0, -2.2, -20 * D2R);
  // nose stripe
  part(body, geo('box', 0.25, 0.08, 2.0), T, 0, 0.42, 2.0, -9 * D2R);
  // wings (pivot groups so they can break off)
  for (const side of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(side * 0.8, -0.1, -1.0);
    body.add(w);
    part(w, geo('box', 4.4, 0.16, 1.9), H, side * 2.2, 0, 0, 0, side * 22 * D2R, side * -6 * D2R);
    part(w, geo('box', 3.0, 0.18, 0.5), T, side * 1.8, 0.05, 0.75, 0, side * 22 * D2R, side * -6 * D2R);
    // angled "barrel" fins at the tips
    const fin = part(w, geo('box', 0.22, 2.4, 1.5), A, side * 4.3, -0.15, -1.2, 0, 0, side * 28 * D2R);
    fin.name = 'fin';
    part(w, geo('box', 0.18, 0.6, 0.6), toon(trim, { emissive: trim, emissiveIntensity: 0.6 }), side * 4.75, 0.85, -1.2, 0, 0, side * 28 * D2R);
    if (side < 0) g.userData.wingL = w; else g.userData.wingR = w;
  }
  // engines
  const glows = [];
  for (const side of [-1, 1]) {
    part(body, geo('cyl', 0.42, 0.5, 1.6, 8), dark, side * 0.55, -0.05, -2.9, Math.PI / 2);
    const gl = part(body, geo('sphere', 0.3, 8, 6), glow(0x66ccff, 2.2, { additive: true }), side * 0.55, -0.05, -3.75, 0, 0, 0, 1, 1, 1.6);
    gl.castShadow = false;
    glows.push(gl);
  }
  g.userData.glows = glows;
  // trail anchors (wing tips)
  g.userData.tipL = new THREE.Object3D(); g.userData.tipL.position.set(-5.0, 0.4, -2.2); body.add(g.userData.tipL);
  g.userData.tipR = new THREE.Object3D(); g.userData.tipR.position.set(5.0, 0.4, -2.2); body.add(g.userData.tipR);
  return g;
}

// ---------------- enemies ----------------
export function buildDart() {
  const g = new THREE.Group();
  const R = toon(0xc0303a), D = toon(0x3b2340), Y = toon(0xffc23a, { emissive: 0xff9a00, emissiveIntensity: 0.5 });
  part(g, geo('oct', 1.2), D, 0, 0, 0, 0, 0, 0, 1, 0.7, 1.6);
  for (let i = 0; i < 3; i++) {
    const a = i * 120 * D2R + Math.PI / 2;
    const p = new THREE.Group(); p.rotation.z = a; g.add(p);
    part(p, geo('box', 0.3, 2.8, 1.6), R, 0, 1.7, -0.5, -25 * D2R);
  }
  part(g, geo('sphere', 0.45, 8, 6), Y, 0, 0, 1.4);
  const e = part(g, geo('sphere', 0.4, 6, 4), glow(0xff5522, 3, { additive: true }), 0, 0, -1.9);
  e.castShadow = false;
  g.userData.spinner = g.children[1];
  return g;
}
export function buildBat() {
  const g = new THREE.Group();
  const P = toon(0x7a3fd1), D = toon(0x261a3a), G = toon(0x6cff9a, { emissive: 0x3cff7a, emissiveIntensity: 0.6 });
  part(g, geo('cone', 1.0, 3.6, 4), D, 0, 0, 0.5, Math.PI / 2, 0, Math.PI / 4, 1, 1, 0.5);
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.x = s * 0.5; g.add(w);
    part(w, geo('box', 3.8, 0.15, 2.0), P, s * 1.9, 0, -0.4, 0, s * -30 * D2R, s * 12 * D2R);
    part(w, geo('box', 0.2, 1.0, 1.2), D, s * 3.6, 0.4, -1.2, 0, 0, s * -20 * D2R);
    if (s < 0) g.userData.wingL = w; else g.userData.wingR = w;
  }
  part(g, geo('sphere', 0.35, 8, 6), G, 0, 0.3, 1.0);
  return g;
}
export function buildBomber() {
  const g = new THREE.Group();
  const B = toon(0x5a6b3a), D = toon(0x2d2a24), O = toon(0xff8a20, { emissive: 0xff6a00, emissiveIntensity: 0.4 });
  part(g, geo('cyl', 1.6, 1.9, 7.5, 8), B, 0, 0, 0, Math.PI / 2);
  part(g, geo('cone', 1.6, 2.5, 8), B, 0, 0, 5.0, Math.PI / 2);
  for (const s of [-1, 1]) {
    part(g, geo('box', 7, 0.35, 2.6), D, s * 4.5, 0, -0.5, 0, 0, s * 4 * D2R);
    part(g, geo('cyl', 0.8, 0.8, 3, 8), B, s * 4.5, -0.5, -0.5, Math.PI / 2);
    const e = part(g, geo('sphere', 0.6, 6, 4), glow(0xffaa44, 3, { additive: true }), s * 4.5, -0.5, -2.1); e.castShadow = false;
  }
  part(g, geo('box', 0.3, 2.4, 2), D, 0, 1.6, -3.4);
  part(g, geo('sphere', 0.7, 8, 6), O, 0, 0.9, 2.6);
  return g;
}
export function buildMine() {
  const g = new THREE.Group();
  part(g, geo('ico', 1.3, 0), toon(0x444455), 0, 0, 0);
  const spikes = new THREE.Group(); g.add(spikes);
  const S = toon(0xd02040);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const d of dirs) {
    const c = part(spikes, geo('cone', 0.35, 1.2, 5), S, d[0] * 1.5, d[1] * 1.5, d[2] * 1.5);
    c.lookAt(d[0] * 9, d[1] * 9, d[2] * 9); c.rotateX(Math.PI / 2);
  }
  const core = part(g, geo('sphere', 0.6, 8, 6), glow(0xff3030, 2.5), 0, 0, 0); core.scale.setScalar(1.3);
  g.userData.core = core;
  return g;
}
export function buildTurret() {
  const g = new THREE.Group();
  const M = toon(0x6b6f7a), D = toon(0x34363f), R = toon(0xff4040, { emissive: 0xff2020, emissiveIntensity: 0.7 });
  part(g, geo('cyl', 2.4, 3.0, 1.6, 8), D, 0, 0.8, 0);
  const head = new THREE.Group(); head.position.y = 2.2; g.add(head);
  part(head, geo('sphere', 1.7, 8, 6), M, 0, 0, 0, 0, 0, 0, 1, 0.8, 1);
  const barrel = new THREE.Group(); head.add(barrel);
  part(barrel, geo('cyl', 0.3, 0.38, 3.2, 6), D, 0.6, 0.2, 1.8, Math.PI / 2);
  part(barrel, geo('cyl', 0.3, 0.38, 3.2, 6), D, -0.6, 0.2, 1.8, Math.PI / 2);
  part(head, geo('sphere', 0.35, 6, 4), R, 0, 0.9, 0.9);
  g.userData.head = head; g.userData.barrel = barrel;
  return g;
}
export function buildAce(colorA = 0x22222c, stripe = 0xe0283c) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body); g.userData.body = body;
  const A = toon(colorA), S = toon(stripe), C = toon(0xffd040, { emissive: 0xffa000, emissiveIntensity: 0.4, flat: false });
  part(body, geo('cone', 1.0, 6, 4), A, 0, 0, 1.0, Math.PI / 2, 0, Math.PI / 4, 1, 1, 0.55);
  part(body, geo('box', 1.4, 0.8, 2.6), A, 0, 0, -1.8);
  part(body, geo('sphere', 0.55, 8, 6), C, 0, 0.45, 0.6, 0, 0, 0, 0.8, 0.7, 1.5);
  for (const s of [-1, 1]) {
    // forward-swept wings: distinctive rival silhouette
    part(body, geo('box', 4.8, 0.15, 1.5), A, s * 2.6, 0, -1.0, 0, s * -24 * D2R, 0);
    part(body, geo('box', 4.0, 0.17, 0.4), S, s * 2.4, 0.04, -0.5, 0, s * -24 * D2R, 0);
    part(body, geo('box', 0.2, 1.6, 1.8), S, s * 1.0, 0.8, -2.4, 0, 0, s * -15 * D2R);
    const e = part(body, geo('sphere', 0.4, 6, 4), glow(0xff3355, 3.5, { additive: true }), s * 0.45, 0, -3.3, 0, 0, 0, 1, 1, 1.6); e.castShadow = false;
  }
  return g;
}

// ---------------- items ----------------
export function buildRing(gold = false, r = 3.2) {
  const g = new THREE.Group();
  const m = gold ? toon(0xffc83a, { emissive: 0xffaa00, emissiveIntensity: 0.5, flat: false }) : toon(0xdfe8f2, { emissive: 0x88aacc, emissiveIntensity: 0.3, flat: false });
  part(g, geo('torus', r, 0.45, 8, 28), m);
  const inner = part(g, geo('torus', r, 0.12, 4, 28), glow(gold ? 0xffdd66 : 0xbfe8ff, 2.5, { additive: true }));
  inner.scale.setScalar(0.88); inner.castShadow = false;
  return g;
}
export function buildBombItem() {
  const g = new THREE.Group();
  part(g, geo('sphere', 1.1, 10, 8), toon(0xd8283a, { flat: false }), 0, 0, 0, 0, 0, 0, 1, 1, 1.5);
  part(g, geo('cyl', 1.15, 1.15, 0.4, 10), toon(0xffffff), 0, 0, 0.5, Math.PI / 2);
  part(g, geo('cone', 0.6, 1.0, 4), toon(0x333344), 0, 0, -1.9, -Math.PI / 2);
  const gl = part(g, geo('sphere', 0.4, 6, 4), glow(0xff6666, 3), 0, 0, 1.7); gl.castShadow = false;
  return g;
}
export function buildLaserItem() {
  const g = new THREE.Group();
  const G = toon(0x30d060, { emissive: 0x20a040, emissiveIntensity: 0.4 });
  part(g, geo('box', 2.6, 0.5, 1.2), G, 0, 0, 0);
  part(g, geo('cyl', 0.25, 0.25, 2.4, 6), toon(0xf0f0f0), -1.0, 0, 0.6, Math.PI / 2);
  part(g, geo('cyl', 0.25, 0.25, 2.4, 6), toon(0xf0f0f0), 1.0, 0, 0.6, Math.PI / 2);
  for (const s of [-1, 1]) { const e = part(g, geo('sphere', 0.3, 6, 4), glow(0x66ff88, 4), s * 1.0, 0, 1.9); e.castShadow = false; }
  return g;
}
export function buildOneUp() {
  const g = new THREE.Group();
  const s = buildFighter({ hull: 0xffd84a, accent: 0xffa020, trim: 0xffffff });
  s.scale.setScalar(0.45);
  g.add(s);
  const halo = part(g, geo('torus', 2.4, 0.15, 4, 24), glow(0xffee88, 3, { additive: true })); halo.castShadow = false;
  return g;
}
export function buildSupply() {
  const g = new THREE.Group();
  part(g, geo('box', 3, 3, 3), toon(0x8a96a8), 0, 0, 0);
  part(g, geo('box', 3.1, 0.6, 3.1), toon(0xffb020), 0, 0.6, 0);
  part(g, geo('box', 3.1, 0.6, 3.1), toon(0xffb020), 0, -0.6, 0);
  const c = part(g, geo('sphere', 0.5, 6, 4), glow(0x66eeff, 3), 0, 1.6, 0); c.castShadow = false;
  return g;
}
export function buildCheckpoint() {
  const g = new THREE.Group();
  part(g, geo('torus', 9, 0.8, 8, 36), toon(0x3ae0ff, { emissive: 0x22aaff, emissiveIntensity: 0.4, flat: false }));
  const lights = new THREE.Group(); g.add(lights);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const l = part(lights, geo('sphere', 0.6, 6, 4), glow(0xaaffff, 3.5), Math.cos(a) * 9, Math.sin(a) * 9, 0); l.castShadow = false;
  }
  g.userData.lights = lights;
  return g;
}
export function buildArch() {
  const g = new THREE.Group();
  const G = toon(0xffcf3a, { emissive: 0xff9900, emissiveIntensity: 0.35 });
  const D = toon(0x7b5a30);
  part(g, geo('box', 2.4, 22, 2.4), D, -11, 11, 0);
  part(g, geo('box', 2.4, 22, 2.4), D, 11, 11, 0);
  part(g, geo('box', 26, 2.6, 3), G, 0, 22, 0);
  part(g, geo('box', 18, 1.0, 3.2), G, 0, 19.6, 0);
  const lamp = part(g, geo('oct', 1.2), glow(0xfff0a0, 3), 0, 25, 0); lamp.castShadow = false;
  g.userData.lamp = lamp;
  return g;
}

// ---------------- props ----------------
export function buildBuilding(w, h, d, col) {
  const g = new THREE.Group();
  part(g, geo('box', w, h, d), toon(col), 0, h / 2, 0);
  // window bands (emissive strips)
  const win = glow(0xfff1b0, 1.3);
  const bands = Math.floor(h / 7);
  for (let i = 1; i <= bands; i++) {
    const s = part(g, geo('box', w + 0.1, 0.8, d + 0.1), win, 0, i * 7 - 2, 0); s.castShadow = false;
  }
  part(g, geo('box', w * 0.6, 2.2, d * 0.6), toon(0x555a66), 0, h + 1.1, 0);
  if (h > 40) {
    part(g, geo('cyl', 0.2, 0.3, 8, 4), toon(0x777777), w * 0.2, h + 6, 0);
    const b = part(g, geo('sphere', 0.5, 6, 4), glow(0xff3030, 3), w * 0.2, h + 10.2, 0); b.castShadow = false;
  }
  return g;
}
export function buildTower() {
  const g = new THREE.Group();
  part(g, geo('cyl', 2.2, 3.4, 40, 8), toon(0xb8bcc8), 0, 20, 0);
  part(g, geo('cyl', 5, 4, 4, 8), toon(0x506080), 0, 41, 0);
  const r = part(g, geo('sphere', 1.0, 6, 4), glow(0xff4040, 3), 0, 44, 0); r.castShadow = false;
  return g;
}
export function buildTree(scale = 1) {
  const g = new THREE.Group();
  part(g, geo('cyl', 0.4, 0.6, 3, 5), toon(0x7a4f2e), 0, 1.5, 0);
  part(g, geo('cone', 2.6, 5, 6), toon(0x2f9a4a), 0, 5, 0);
  part(g, geo('cone', 2.0, 4, 6), toon(0x42b85c), 0, 7.4, 0);
  g.scale.setScalar(scale);
  return g;
}
export function buildPillar(h = 30) {
  const g = new THREE.Group();
  part(g, geo('box', 5, h, 5), toon(0x9b8a78), 0, h / 2, 0);
  part(g, geo('box', 6.5, 2, 6.5), toon(0x6f6152), 0, h, 0);
  return g;
}
export function buildCloud() {
  const g = new THREE.Group();
  const m = toon(0xffffff, { flat: false, emissive: 0x9fb8d8, emissiveIntensity: 0.35 });
  const n = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const s = 6 + Math.random() * 9;
    const c = mesh(geo('ico', 1, 1), m, { cast: false, receive: false });
    c.scale.set(s * 1.3, s * 0.8, s);
    c.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.3) * 6, (Math.random() - 0.5) * 18);
    g.add(c);
  }
  return g;
}
export function buildAsteroid(r) {
  const base = new THREE.IcosahedronGeometry(1, 1);
  const p = base.attributes.position;
  const seed = Math.random() * 100;
  // deterministic per-vertex jitter keyed by position so shared verts move together
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 0.75 + 0.35 * Math.abs(Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 0.5) + Math.sin(z * 4.3 - seed));
    p.setXYZ(i, x * n, y * n, z * n);
  }
  base.computeVertexNormals();
  const g = new THREE.Group();
  const me = mesh(smooth(base), toon(Math.random() < 0.5 ? 0x8a7a6a : 0x6d6a78));
  me.scale.setScalar(r);
  g.add(me);
  return g;
}

// ---------------- bosses ----------------
export function buildStrider() {
  const g = new THREE.Group();
  const S = toon(0x8a8f9e), D = toon(0x3a3d4a), O = toon(0xff8a1a), R = toon(0xff3344, { emissive: 0xff1122, emissiveIntensity: 0.8 });
  const hips = new THREE.Group(); hips.position.y = 34; g.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  part(torso, geo('box', 22, 12, 16), S, 0, 6, 0);
  part(torso, geo('box', 18, 6, 14), D, 0, 14, -1);
  part(torso, geo('box', 23, 1.5, 17), O, 0, 1, 0);
  part(torso, geo('box', 10, 3, 2), O, 0, 9, 8.2);
  // core (weak point after arms)
  const coreHatch = new THREE.Group(); coreHatch.position.set(0, 6, 8); torso.add(coreHatch);
  part(coreHatch, geo('box', 8, 6, 1.6), D, 0, 0, 0.6);
  const core = part(torso, geo('sphere', 3, 12, 10), glow(0xff3355, 3.5), 0, 6, 7.4);
  core.castShadow = false;
  const eye = part(torso, geo('box', 8, 1.4, 1), R, 0, 15, 6.2);
  // arms
  const armL = new THREE.Group(); armL.position.set(-14, 9, 0); torso.add(armL);
  part(armL, geo('sphere', 3.4, 8, 6), D);
  part(armL, geo('box', 4.5, 4.5, 14), S, 0, -2, 6);
  part(armL, geo('cyl', 1.2, 1.4, 8, 8), D, -1.2, -2, 15, Math.PI / 2);
  part(armL, geo('cyl', 1.2, 1.4, 8, 8), D, 1.2, -2, 15, Math.PI / 2);
  part(armL, geo('box', 5, 1, 14.2), O, 0, 0.6, 6);
  const armR = new THREE.Group(); armR.position.set(14, 9, 0); torso.add(armR);
  part(armR, geo('sphere', 3.4, 8, 6), D);
  part(armR, geo('box', 7, 7, 9), S, 0, 1, 4);
  for (let i = 0; i < 6; i++) part(armR, geo('cyl', 0.8, 0.8, 0.4, 8), R, -2 + (i % 3) * 2, 2.8 - Math.floor(i / 3) * 2.6, 8.7, Math.PI / 2);
  part(armR, geo('box', 7.2, 1, 9.2), O, 0, 4.2, 4);
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(s * 8, 0, 0); hips.add(thigh);
    part(thigh, geo('sphere', 3, 8, 6), D);
    part(thigh, geo('box', 4, 18, 4.5), S, 0, -9, 0);
    const shin = new THREE.Group(); shin.position.set(0, -18, 0); thigh.add(shin);
    part(shin, geo('sphere', 2.6, 8, 6), O);
    part(shin, geo('box', 3.4, 16, 3.8), D, 0, -8, 0);
    const foot = part(shin, geo('box', 7, 2, 10), S, 0, -16.5, 1.5);
    legs.push({ thigh, shin, foot, side: s });
  }
  Object.assign(g.userData, { hips, torso, armL, armR, core, coreHatch, eye, legs });
  return g;
}
export function buildCarrier() {
  const g = new THREE.Group();
  const H = toon(0x5c6378), D = toon(0x2a2d3a), P = toon(0x8f3fd6), O = toon(0xffa030, { emissive: 0xff8000, emissiveIntensity: 0.5 });
  part(g, geo('box', 34, 12, 120), H, 0, 0, 0);
  part(g, geo('box', 22, 8, 70), D, 0, 9, -14);
  part(g, geo('box', 40, 3, 60), H, 0, -4, -20);
  part(g, geo('cone', 17, 34, 4), H, 0, 0, 77, Math.PI / 2, 0, Math.PI / 4, 1, 1, 0.5);
  part(g, geo('box', 35, 1.2, 121), P, 0, 6.5, 0);
  // bridge tower
  part(g, geo('box', 10, 16, 14), H, 0, 20, -38);
  part(g, geo('box', 11, 2.5, 6), glow(0x88ccff, 1.6), 0, 25, -32);
  // hangar mouth
  const hangar = part(g, geo('box', 16, 7, 2), glow(0xff7733, 1.8), 0, -1, 58.5); hangar.castShadow = false;
  // engines
  const engines = [];
  for (const [x, y] of [[-11, 0], [11, 0], [0, 8], [-11, -4], [11, -4]]) {
    part(g, geo('cyl', 4, 5, 8, 8), D, x, y, -62, Math.PI / 2);
    const e = part(g, geo('sphere', 3.6, 8, 6), glow(0xaa66ff, 3, { additive: true }), x, y, -66.5, 0, 0, 0, 1, 1, 1.8); e.castShadow = false;
    engines.push(e);
  }
  // reactor core (exposed late)
  const coreShield = new THREE.Group(); coreShield.position.set(0, 14, 10); g.add(coreShield);
  part(coreShield, geo('box', 14, 4, 14), D, 0, 0, 0);
  const core = part(g, geo('sphere', 5, 12, 10), glow(0x55ffcc, 3), 0, 14, 10); core.castShadow = false;
  // turret mounts
  const turretSpots = [[-14, 7, 40], [14, 7, 40], [-14, 7, -10], [14, 7, -10]];
  const turrets = turretSpots.map(([x, y, z]) => {
    const t = buildTurret(); t.scale.setScalar(1.6); t.position.set(x, y, z); g.add(t);
    part(t, geo('box', 3.6, 0.6, 3.6), O, 0, 0.1, 0);
    return t;
  });
  Object.assign(g.userData, { core, coreShield, turrets, engines, hangar });
  return g;
}
