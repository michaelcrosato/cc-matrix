// Procedural models. Everything is built from primitives so the demo ships as code only.
// Convention: ships face -Z (forward). Shapes are authored with +Y as forward, then rotated.
import * as THREE from 'three/webgpu';
import { glowMat, toonMat } from './gfx.js';
import { rng } from './util.js';

const matCache = new Map();
export function M(hex) {
  let m = matCache.get(hex);
  if (!m) {
    m = toonMat(hex);
    matCache.set(hex, m);
  }
  return m;
}

const shadowed = (mesh, cast = true) => {
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
};

function add(group, geo, mat, { pos, rot, scale, cast = true } = {}) {
  const mesh = shadowed(new THREE.Mesh(geo, mat), cast);
  if (pos) mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  if (scale) mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}

// Flat wing from a 2D outline (forward = +Y), laid flat in XZ.
function wingGeo(points, thickness) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// Player ship: swept Arwing-style fighter with glowing engines.
export function arwing(hull = 0xc7d1e3, accent = 0xd6402f) {
  const g = new THREE.Group();
  const cone = new THREE.ConeGeometry(0.34, 2.6, 9);
  cone.rotateX(-Math.PI / 2);
  add(g, cone, M(hull));
  const wing = wingGeo([[0.3, 0.7], [2.2, -0.95], [2.25, -1.12], [0.4, -0.75]], 0.06);
  add(g, wing, M(hull), { pos: [0.02, 0.04, 0.1] });
  add(g, wing, M(hull), { pos: [-0.02, 0.04, 0.1], scale: [-1, 1, 1] });
  add(g, wing, M(accent), { pos: [0.02, 0.1, 0.1], scale: [0.5, 1, 0.5] });
  const canopy = new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  canopy.scale(1, 0.6, 1.5);
  add(g, canopy, M(0x3ba8ff), { pos: [0, 0.22, -0.35] });
  const fin = new THREE.BoxGeometry(0.06, 0.75, 0.75);
  add(g, fin, M(accent), { pos: [0, 0.42, 0.85], rot: [0.25, 0, 0] });
  for (const sx of [-0.52, 0.52]) {
    const nac = new THREE.CylinderGeometry(0.17, 0.2, 0.9, 10);
    nac.rotateX(Math.PI / 2);
    add(g, nac, M(0x8793a8), { pos: [sx, -0.05, 0.75] });
    add(g, new THREE.CircleGeometry(0.15, 12), glowMat(0x66d9ff, 4), { pos: [sx, -0.05, 1.22], rot: [0, 0, 0] });
  }
  const exhaust = new THREE.SphereGeometry(0.2, 10, 8);
  add(g, exhaust, glowMat(0x7fe7ff, 3), { pos: [0, 0.0, 1.25] });
  return g;
}

// Venom-style "Dragoon" fighter: diamond hull, stub wings, a red glowing eye.
export function dragoon() {
  const g = new THREE.Group();
  const body = new THREE.OctahedronGeometry(1, 0);
  body.scale(0.75, 0.5, 1.7);
  add(g, body, M(0x4b2a52));
  const wing = wingGeo([[0.2, 0.5], [1.7, -0.4], [1.2, -0.7], [0.2, -0.3]], 0.08);
  add(g, wing, M(0x6c3a64), { pos: [0.1, 0, 0.05] });
  add(g, wing, M(0x6c3a64), { pos: [-0.1, 0, 0.05], scale: [-1, 1, 1] });
  add(g, new THREE.SphereGeometry(0.22, 10, 8), glowMat(0xff3b2e, 3.5), { pos: [0, 0.2, -1.4] });
  add(g, new THREE.SphereGeometry(0.18, 8, 6), glowMat(0xff8a3b, 2.5), { pos: [0, 0, 1.3] });
  return g;
}

// Serpent interceptor: thin needle, swept fins, fast and fragile.
export function serpent() {
  const g = new THREE.Group();
  const body = new THREE.CylinderGeometry(0.12, 0.42, 2.8, 7);
  body.rotateX(-Math.PI / 2);
  add(g, body, M(0x2e6d5b));
  const wing = wingGeo([[0.1, 0.4], [1.5, -0.7], [0.2, -0.9]], 0.05);
  add(g, wing, M(0x3f9a7e), { pos: [0.05, 0, 0] });
  add(g, wing, M(0x3f9a7e), { pos: [-0.05, 0, 0], scale: [-1, 1, 1] });
  add(g, new THREE.SphereGeometry(0.2, 8, 6), glowMat(0xc8ff5c, 3), { pos: [0, 0, 1.4] });
  return g;
}

// Ground or wall turret: pedestal, rotating head that aims, glowing sight.
export function sentinel() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(1.3, 1.6, 1.6, 8), M(0x5b5b66), { pos: [0, -0.4, 0] });
  const head = new THREE.Group();
  add(head, new THREE.SphereGeometry(0.9, 12, 10), M(0xb1a9a0), { pos: [0, 0.4, 0] });
  const barrel = new THREE.CylinderGeometry(0.22, 0.28, 2.2, 8);
  barrel.rotateX(Math.PI / 2);
  add(head, barrel, M(0x2c2c35), { pos: [0, 0.4, -1.4] });
  add(head, new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xff7a2e, 3.5), { pos: [0, 0.4, -2.5] });
  g.add(head);
  g.userData.head = head;
  return g;
}

// Heavy bomber: boxy hull with twin engines, slow and tough.
export function hulk() {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(3.2, 1.2, 4.6), M(0x6e4f2e));
  add(g, new THREE.BoxGeometry(5.2, 0.25, 1.6), M(0x9b7746), { pos: [0, 0.6, -0.2] });
  for (const sx of [-1.8, 1.8]) {
    const nac = new THREE.CylinderGeometry(0.55, 0.7, 2.2, 10);
    nac.rotateX(Math.PI / 2);
    add(g, nac, M(0x3e3e48), { pos: [sx, -0.2, 0.4] });
    add(g, new THREE.CircleGeometry(0.5, 12), glowMat(0xffb35c, 3), { pos: [sx, -0.2, 1.52] });
  }
  add(g, new THREE.SphereGeometry(0.5, 10, 8), glowMat(0xff5c3b, 2.5), { pos: [0, 0.2, -2.4] });
  return g;
}

// Floating mine: spiked core with a pulsing red light.
export function mine() {
  const g = new THREE.Group();
  add(g, new THREE.IcosahedronGeometry(0.9, 0), M(0x3a3340));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spike = new THREE.ConeGeometry(0.16, 0.7, 5);
    add(g, spike, M(0x5a4d5c), { pos: [Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0], rot: [0, 0, a - Math.PI / 2] });
  }
  add(g, new THREE.SphereGeometry(0.35, 8, 6), glowMat(0xff2b4d, 4), { pos: [0, 0, 0] });
  return g;
}

// Boss "Vorrack Titan": a central core with two gun pods on arms and a top turret.
// Returns the parts so the boss logic can drive each one.
export function titan() {
  const root = new THREE.Group();
  const core = new THREE.Group();
  add(core, new THREE.IcosahedronGeometry(3.4, 2), M(0x3c2d4a));
  add(core, new THREE.SphereGeometry(1.7, 14, 10), glowMat(0xff3a6a, 2.2), { pos: [0, 0, -3.1] });
  add(core, new THREE.TorusGeometry(5.2, 0.32, 8, 40), glowMat(0x7e6bff, 1.8, { additive: false }), { rot: [Math.PI / 2, 0, 0] });
  root.add(core);

  const pods = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Group();
    add(pod, new THREE.CylinderGeometry(0.5, 0.6, 7, 8), M(0x5c4f70), { pos: [side * 4.4, 0, 0], rot: [0, 0, Math.PI / 2] });
    add(pod, new THREE.BoxGeometry(2.8, 2.4, 3.2), M(0x6d5d84), { pos: [side * 8.4, 0, 0] });
    add(pod, new THREE.SphereGeometry(0.9, 10, 8), glowMat(0xffb24a, 2.6), { pos: [side * 8.4, 0, -1.9] });
    root.add(pod);
    pods.push(pod);
  }

  const top = new THREE.Group();
  add(top, new THREE.CylinderGeometry(1.2, 1.5, 1.4, 8), M(0x4a3d5c), { pos: [0, 0, 0] });
  const barrel = new THREE.CylinderGeometry(0.35, 0.4, 2.8, 8);
  barrel.rotateX(Math.PI / 2);
  add(top, barrel, M(0x2a2233), { pos: [0, 0.5, -1.6] });
  top.position.set(0, 4.8, 0);
  root.add(top);

  return { root, core, pods, top, coreOrbit: core.children[2] };
}

// Lumpy asteroid: an icosphere with seeded radial displacement.
export function asteroid(radius, seed) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (r() - 0.5) * 0.35;
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const tints = [0x6f6a66, 0x7a6f63, 0x5f6470, 0x847263];
  const mesh = shadowed(new THREE.Mesh(geo, M(tints[Math.floor(r() * tints.length)])));
  mesh.rotation.set(r() * 6, r() * 6, r() * 6);
  return mesh;
}

// Boost ring: a glowing torus the player flies through to pick a route.
export function ringGate(radius, hex) {
  const g = new THREE.Group();
  add(g, new THREE.TorusGeometry(radius, 0.7, 10, 48), glowMat(hex, 2.6), { cast: false });
  add(g, new THREE.TorusGeometry(radius * 1.12, 0.22, 6, 48), glowMat(0xffffff, 1.4), { cast: false });
  return g;
}

// Canyon wall or terrain block.
export function rock(width, height, depth, seed) {
  const r = rng(seed);
  const geo = new THREE.BoxGeometry(width, height, depth, 2, 4, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x += (r() - 0.5) * width * 0.12;
    v.y += (r() - 0.5) * height * 0.04;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, M([0x8a5a3c, 0x9d6a48, 0x7a4c34][Math.floor(r() * 3)])));
}

// Rolling sand dune floor: a displaced grid, flat-shaded through the toon ramp.
export function dunes(width, length, seed) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(width, length, 60, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const phase = r() * 10;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = Math.sin(z * 0.03 + phase) * 4 + Math.sin(x * 0.05 + z * 0.02) * 2.2 + Math.sin(x * 0.2) * 0.4;
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, M(0xd9a86a)), false);
}

// Planet with a soft halo, used as far-field scenery.
export function planet(radius, base, halo) {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(radius, 36, 24), M(base), { cast: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.12, 24, 16), glowMat(halo, 0.7));
  g.add(glow);
  return g;
}

// Glowing pickup orb with an orbit ring.
export function pickupOrb(hex) {
  const g = new THREE.Group();
  add(g, new THREE.IcosahedronGeometry(0.9, 1), glowMat(hex, 2.2), { cast: false });
  add(g, new THREE.TorusGeometry(1.5, 0.07, 6, 28), glowMat(0xffffff, 1.2), { cast: false, rot: [Math.PI / 2.4, 0, 0] });
  return g;
}

// Shared bolt and bullet geometry for projectile pools.
export const BOLT_GEO = new THREE.BoxGeometry(0.16, 0.16, 3.2);
export const BULLET_GEO = new THREE.SphereGeometry(0.42, 10, 8);
export const MISSILE_GEO = new THREE.ConeGeometry(0.28, 1.6, 8);
MISSILE_GEO.rotateX(-Math.PI / 2);
