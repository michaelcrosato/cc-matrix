// Procedural models and cel-shaded materials. Nothing is loaded from disk.
// Cel look = MeshToonMaterial with a 3-step ramp + inverted-hull ink outline.
import * as THREE from 'three/webgpu';

// 3-step ramp for toon shading. Nearest filtering keeps the bands hard-edged.
const rampData = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
export const rampTex = new THREE.DataTexture(rampData, 3, 1, THREE.RGBAFormat);
rampTex.minFilter = THREE.NearestFilter;
rampTex.magFilter = THREE.NearestFilter;
rampTex.generateMipmaps = false;
rampTex.needsUpdate = true;

const matCache = new Map();
export function toonMat(color, { emissive = 0x000000, vertexColors = false, side = THREE.FrontSide } = {}) {
  const key = `${color}|${emissive}|${vertexColors}|${side}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color,
    emissive,
    gradientMap: rampTex,
    vertexColors,
    side,
  });
  matCache.set(key, m);
  return m;
}

const glowCache = new Map();
export function glowMat(color, opacity = 1) {
  const key = `${color}|${opacity}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  glowCache.set(key, m);
  return m;
}

const inkMat = new THREE.MeshBasicMaterial({ color: 0x0b0d14, side: THREE.BackSide });

// Inverted-hull outline: a slightly larger, back-face-only copy in ink colour.
export function inked(mesh, thickness = 1.045) {
  const ink = new THREE.Mesh(mesh.geometry, inkMat);
  ink.scale.setScalar(thickness);
  mesh.add(ink);
  return mesh;
}

// Convenience: a toon mesh with ink outline, positioned and rotated.
export function part(geom, color, { pos, rot, scale, emissive, noInk = false, castShadow = true } = {}) {
  const m = new THREE.Mesh(geom, toonMat(color, { emissive }));
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) m.scale.set(...(Array.isArray(scale) ? scale : [scale, scale, scale]));
  m.castShadow = castShadow;
  if (!noInk) inked(m);
  return m;
}

// Delta wing outline in XY, extruded thin. Nose of the wing points to +Y, which
// rotateX(-PI/2) later maps to -Z (forward for the player).
function wingGeometry(span = 3.4, depth = 0.14) {
  const s = new THREE.Shape();
  s.moveTo(0, 1.6);
  s.lineTo(0.6, 0.6);
  s.lineTo(span, -1.2);
  s.lineTo(span - 0.4, -1.7);
  s.lineTo(0.5, -1.1);
  s.lineTo(-0.5, -1.1);
  s.lineTo(-(span - 0.4), -1.7);
  s.lineTo(-span, -1.2);
  s.lineTo(-0.6, 0.6);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

let wingGeo = null;
let finGeo = null;
function getWing() {
  if (!wingGeo) wingGeo = wingGeometry();
  return wingGeo;
}
function getFin() {
  if (!finGeo) {
    finGeo = new THREE.BoxGeometry(0.16, 1.3, 1.6);
  }
  return finGeo;
}

// Player ship (Arwing-style): nose at -Z, wings spread on X.
export function buildArwing() {
  const g = new THREE.Group();
  const body = part(new THREE.ConeGeometry(0.55, 3.4, 10), 0xe9f1ff);
  body.rotation.x = -Math.PI / 2;
  body.position.z = 0.2;
  g.add(body);
  const canopy = part(new THREE.SphereGeometry(0.42, 12, 8), 0x7fe9ff, { pos: [0, 0.38, -0.5], scale: [1, 0.7, 1.5] });
  g.add(canopy);
  const wing = part(getWing(), 0xdfe8f7, { pos: [0, 0.02, 0.6] });
  g.add(wing);
  const wingTip = part(new THREE.BoxGeometry(0.5, 0.16, 0.5), 0xe23b3b, { pos: [3.1, 0.12, 1.1] });
  g.add(wingTip);
  const wingTipL = part(new THREE.BoxGeometry(0.5, 0.16, 0.5), 0xe23b3b, { pos: [-3.1, 0.12, 1.1] });
  g.add(wingTipL);
  const fin = part(getFin(), 0xe23b3b, { pos: [0, 0.8, 0.9] });
  g.add(fin);
  const finL = part(getFin(), 0xe23b3b, { pos: [1.4, 0.2, 0.9], rot: [0, 0, 0.5], scale: [1, 0.6, 1] });
  g.add(finL);
  const finR = part(getFin(), 0xe23b3b, { pos: [-1.4, 0.2, 0.9], rot: [0, 0, -0.5], scale: [1, 0.6, 1] });
  g.add(finR);
  // Engine glows. These are additive and not in the toon pass.
  const eng = new THREE.SphereGeometry(0.34, 10, 8);
  for (const x of [-0.45, 0.45]) {
    const e = new THREE.Mesh(eng, glowMat(0x4fe4ff, 0.9));
    e.position.set(x, -0.05, 1.6);
    e.name = 'engine';
    g.add(e);
  }
  g.userData.engines = g.children.filter((c) => c.name === 'engine');
  return g;
}

// Venom fighter: a dark wedge that points toward the player (+Z).
export function buildFighter(color = 0x6d2a8c) {
  const g = new THREE.Group();
  const body = part(new THREE.ConeGeometry(0.6, 3.2, 8), color);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.add(part(getWing(), 0x3a1652, { pos: [0, 0, -0.1], rot: [0, Math.PI, 0] }));
  g.add(part(getFin(), 0xffb020, { pos: [0, 0.8, 0.3], scale: [1, 0.9, 0.8] }));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), glowMat(0xff3b3b, 1));
  eye.position.set(0, 0.2, 1.2);
  g.add(eye);
  return g;
}

export function buildTurret() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(1.1, 1.4, 1.4, 10), 0x7f8c4a, { pos: [0, -0.1, 0] }));
  g.add(part(new THREE.SphereGeometry(0.9, 10, 8), 0xb8c26a, { pos: [0, 0.8, 0] }));
  const barrel = part(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8), 0x3d4426, { pos: [0, 0.9, 1.0] });
  barrel.rotation.x = Math.PI / 2;
  g.add(barrel);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xffb020, 0.9));
  tip.position.set(0, 0.9, 2.1);
  g.add(tip);
  g.userData.barrel = barrel;
  return g;
}

export function buildDrone() {
  const g = new THREE.Group();
  g.add(part(new THREE.IcosahedronGeometry(0.8, 0), 0x3b8bd6));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), glowMat(0x9ff3ff, 1));
  eye.position.z = 0.6;
  g.add(eye);
  return g;
}

export function buildBomber() {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(2.6, 1.4, 4.2), 0x7b5b3a, { pos: [0, 0, 0] }));
  g.add(part(new THREE.BoxGeometry(6.6, 0.25, 1.2), 0xa98a5e, { pos: [0, 0.1, -0.4] }));
  for (const x of [-2.2, 2.2]) {
    const e = part(new THREE.CylinderGeometry(0.4, 0.5, 1.4, 8), 0x3a2a1c, { pos: [x, -0.2, -0.5] });
    e.rotation.x = Math.PI / 2;
    g.add(e);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), glowMat(0xff8a3b, 0.8));
    glow.position.set(x, -0.2, 0.3);
    g.add(glow);
  }
  return g;
}

// Mid-boss gunship: bigger wedge with two gun pods.
export function buildGunship() {
  const g = buildFighter(0x2f6f3a);
  g.scale.setScalar(2.4);
  for (const x of [-2.1, 2.1]) {
    const pod = part(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 8), 0x93a85b, { pos: [x, -0.2, 0.2] });
    pod.rotation.x = Math.PI / 2;
    g.add(pod);
  }
  return g;
}

// Final carrier boss: hull + two side pods (destroyable) + red core.
export function buildCarrier() {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(6, 2.2, 12), 0x3c3f5c, { pos: [0, 0, 0] }));
  g.add(part(new THREE.BoxGeometry(3, 1.4, 6), 0x55587a, { pos: [0, 1.6, -2] }));
  const pods = [];
  for (const x of [-6.5, 6.5]) {
    const p = new THREE.Group();
    p.position.set(x, 0, 0);
    p.add(part(new THREE.CylinderGeometry(1.6, 1.8, 4, 10), 0xc24a4a, { pos: [0, 0, 0] }));
    p.add(part(new THREE.SphereGeometry(1.4, 10, 8), 0xff7a5c, { pos: [0, 0, 2.2] }));
    g.add(p);
    pods.push(p);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), glowMat(0xff3b6b, 1));
  core.position.set(0, 0, 6.4);
  g.add(core);
  g.userData.pods = pods;
  g.userData.core = core;
  return g;
}

export function buildRing() {
  return part(new THREE.TorusGeometry(3, 0.28, 8, 24), 0xffd54a, { noInk: true });
}

export function buildPickup(kind) {
  const color = kind === 'bomb' ? 0x4e8bff : 0x5cff8a;
  const g = new THREE.Group();
  g.add(part(new THREE.OctahedronGeometry(0.9, 0), color, { noInk: true }));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 6, 20), glowMat(color, 0.9));
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  return g;
}

// Ground tile: rolling terrain with vertex colours for toon bands.
export function buildTerrainTile(seed, width = 90, depth = 60) {
  const geo = new THREE.PlaneGeometry(width, depth, 36, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(0x5f9a3a);
  const c2 = new THREE.Color(0xa0a54d);
  const c3 = new THREE.Color(0xd9b56a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const path = Math.min(1, Math.abs(x) / 9); // flatten the central path
    const h = (Math.sin(x * 0.21 + seed) * Math.cos(z * 0.17 + seed * 0.5) * 1.8 + Math.sin(x * 0.6 + z * 0.4 + seed) * 0.6) * path;
    pos.setY(i, h);
    const t = THREE.MathUtils.clamp(h / 2 + 0.5, 0, 1);
    tmp.copy(c1).lerp(c2, t);
    if (t > 0.8) tmp.copy(c2).lerp(c3, (t - 0.8) / 0.2);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toonMat(0xffffff, { vertexColors: true }));
  m.receiveShadow = true;
  return m;
}

// Sky dome with vertical colour gradient, BackSide so the inside is visible.
export function buildSky(top, horizon) {
  const geo = new THREE.SphereGeometry(400, 24, 16);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  const a = new THREE.Color(top);
  const b = new THREE.Color(horizon);
  const tmp = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i);
    const t = THREE.MathUtils.clamp(y / 260 + 0.25, 0, 1);
    tmp.copy(b).lerp(a, t);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
}

export function buildStarfield(count = 1400, radius = 220) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = radius * (0.5 + Math.random() * 0.5);
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, fog: false }));
}

export function buildAsteroidMesh(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + 0.25 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.12 * Math.sin(z * 5.3 + seed);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.computeVertexNormals();
  const color = [0x8a7a6a, 0x6b6f7e, 0x9a6f52][Math.floor(seed * 3) % 3];
  return part(geo, color);
}

export function buildShard(size = 0.5) {
  return part(new THREE.TetrahedronGeometry(size, 0), 0xb0a090);
}
