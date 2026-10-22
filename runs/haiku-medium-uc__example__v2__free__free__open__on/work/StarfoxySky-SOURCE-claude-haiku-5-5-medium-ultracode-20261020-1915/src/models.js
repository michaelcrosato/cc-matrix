// Procedural cel-shaded models. Each kind is built once as a template and
// cloned per instance (geometry and materials are shared, so no per-spawn GPU
// allocations). Named pivots live in userData for animation.

import * as THREE from 'three/webgpu';
import { toonMat, glowMat, outline } from './render.js';

const cache = new Map();

function add(parent, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], opts = {}) {
  const { ink = 0.04, glow = false, emissive = 0 } = opts;
  const mat = glow ? glowMat(color) : toonMat(color, emissive ? color : 0x000000, emissive);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = !glow;
  if (!glow && ink > 0) outline(m, ink);
  parent.add(m);
  return m;
}

function group(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

// Nose-forward cones: rotate so the tip points down -Z (the direction of flight).
const NOSE = [-Math.PI / 2, 0, 0];

function buildArwing(color, accent) {
  const g = group('arwing');
  add(g, new THREE.ConeGeometry(0.62, 3.4, 8), color, [0, 0, -0.4], NOSE);
  add(g, new THREE.BoxGeometry(1.0, 0.5, 2.2), color, [0, 0, 0.6]);
  add(g, new THREE.SphereGeometry(0.42, 12, 8), 0x7ef6ff, [0, 0.36, -0.45], [0, 0, 0], [1, 0.7, 1.6], { ink: 0, emissive: 0.5 });
  const wingL = group('wingL');
  wingL.position.set(-0.5, 0, 0.5);
  add(wingL, new THREE.BoxGeometry(2.8, 0.12, 1.9), accent, [-1.4, 0, 0]);
  add(wingL, new THREE.SphereGeometry(0.14, 6, 4), 0xffd34d, [-2.8, 0, -0.9], [0, 0, 0], [1, 1, 1], { glow: true });
  const wingR = wingL.clone(true);
  wingR.name = 'wingR';
  wingR.position.set(0.5, 0, 0.5);
  wingR.scale.x = -1;
  g.add(wingL, wingR);
  g.userData.wingL = wingL;
  g.userData.wingR = wingR;
  add(g, new THREE.BoxGeometry(0.12, 1.1, 1.3), accent, [0, 0.6, 1.4], [0.2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), 0x2b3550, [-0.55, -0.05, 1.7], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), 0x2b3550, [0.55, -0.05, 1.7], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.22, 8, 6), 0xffa340, [-0.55, -0.05, 2.0], [0, 0, 0], [1, 1, 1], { glow: true });
  add(g, new THREE.SphereGeometry(0.22, 8, 6), 0xffa340, [0.55, -0.05, 2.0], [0, 0, 0], [1, 1, 1], { glow: true });
  return g;
}

function buildDrone() {
  const g = group('drone');
  add(g, new THREE.OctahedronGeometry(1.1), 0xe0443a, [0, 0, 0], [0, 0, Math.PI / 4], [1, 1.3, 1]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    add(g, new THREE.BoxGeometry(0.15, 0.9, 0.6), 0x8e2a25, [Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0], [0, 0, a]);
  }
  add(g, new THREE.SphereGeometry(0.34, 8, 6), 0xffe066, [0, 0, -1.0], [0, 0, 0], [1, 1, 1], { glow: true });
  return g;
}

function buildInterceptor() {
  const g = group('interceptor');
  add(g, new THREE.ConeGeometry(0.6, 3.2, 6), 0x9b4dff, [0, 0, 0], NOSE);
  add(g, new THREE.BoxGeometry(2.8, 0.1, 1.1), 0x5b2ab0, [0, 0, 0.6], [0, 0, 0]);
  add(g, new THREE.BoxGeometry(0.1, 0.9, 1.1), 0x5b2ab0, [0, 0.45, 0.8]);
  add(g, new THREE.SphereGeometry(0.28, 8, 6), 0xff7ad9, [0, 0.2, -0.8], [0, 0, 0], [1, 0.7, 1.4], { glow: true });
  add(g, new THREE.SphereGeometry(0.3, 8, 6), 0xffa340, [0, 0, 1.7], [0, 0, 0], [1, 1, 1], { glow: true });
  return g;
}

// A turret rotates its head (userData.head) to face the player.
function buildTurret(color = 0x7a8496) {
  const g = group('turret');
  add(g, new THREE.CylinderGeometry(1.3, 1.5, 1.2, 10), 0x4b5263, [0, 0, 0]);
  const head = group('head');
  head.position.set(0, 0.9, 0);
  add(head, new THREE.BoxGeometry(1.6, 0.9, 1.6), color, [0, 0, 0]);
  add(head, new THREE.CylinderGeometry(0.2, 0.22, 2.4, 8), 0x2a2f3c, [0, 0, -1.3], [Math.PI / 2, 0, 0]);
  add(head, new THREE.SphereGeometry(0.28, 8, 6), 0xff5a4a, [0, 0.2, -2.4], [0, 0, 0], [1, 1, 1], { glow: true });
  g.add(head);
  g.userData.head = head;
  return g;
}

function buildGunship() {
  const g = group('gunship');
  add(g, new THREE.BoxGeometry(3.2, 1.3, 5.0), 0x6f8a4e, [0, 0, 0]);
  add(g, new THREE.BoxGeometry(2.0, 0.4, 3.4), 0x8aa663, [0, 0.8, -0.2]);
  add(g, new THREE.CylinderGeometry(0.5, 0.5, 3.2, 10), 0x4b5e33, [-2.2, -0.4, 0.2], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(0.5, 0.5, 3.2, 10), 0x4b5e33, [2.2, -0.4, 0.2], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.6, 10, 8), 0x23301a, [0, 1.2, -0.5]);
  add(g, new THREE.CylinderGeometry(0.15, 0.15, 1.8, 6), 0x1c2414, [0, 1.2, -1.9], [Math.PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(0.4, 8, 6), 0xffa340, [-2.2, -0.4, 1.9], [0, 0, 0], [1, 1, 1], { glow: true });
  add(g, new THREE.SphereGeometry(0.4, 8, 6), 0xffa340, [2.2, -0.4, 1.9], [0, 0, 0], [1, 1, 1], { glow: true });
  return g;
}

function buildBoss() {
  const g = group('venom');
  const core = group('core');
  add(core, new THREE.IcosahedronGeometry(4.2, 1), 0x5b2a86, [0, 0, 0], [0, 0.3, 0.2]);
  add(core, new THREE.SphereGeometry(1.7, 12, 10), 0xff4d6d, [0, 0, -3.6], [0, 0, 0], [1, 1, 1], { glow: true });
  g.add(core);
  g.userData.core = core;
  const ring = add(g, new THREE.TorusGeometry(6.4, 0.32, 8, 32), 0x63f2ff, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], { glow: true });
  g.userData.ring = ring;
  const shields = [];
  for (const sx of [-6.6, 6.6]) {
    shields.push(add(g, new THREE.SphereGeometry(2.0, 14, 10), 0x2bd1ff, [sx, 0, 0], [0, 0, 0], [1, 1, 1], { emissive: 0.6 }));
  }
  g.userData.shields = shields;
  const turrets = [];
  for (const [tx, ty] of [[-4.3, 3.6], [4.3, 3.6], [-4.3, -3.6], [4.3, -3.6]]) {
    const t = buildTurret(0x6d4a9a);
    t.position.set(tx, ty, 2.2);
    t.scale.setScalar(1.05);
    g.add(t);
    turrets.push(t);
  }
  g.userData.turrets = turrets;
  return g;
}

function buildRock(seed, radius) {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  // Displace each vertex by a position-derived amount so shared corners match.
  const amp = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!amp.has(key)) amp.set(key, 0.82 + rnd() * 0.3);
    const k = amp.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.9, pos.getZ(i) * k);
  }
  // Icosahedron is already non-indexed, so normals are per face: a faceted low-poly look.
  geo.computeVertexNormals();
  return geo;
}

function build(kind) {
  switch (kind) {
    case 'arwing': return buildArwing(0x2f6fe6, 0xf2f5ff);
    case 'wingman': return buildArwing(0x3fbf6a, 0xfff1a6);
    case 'drone': return buildDrone();
    case 'interceptor': return buildInterceptor();
    case 'turret': return buildTurret();
    case 'gunship': return buildGunship();
    case 'venom': return buildBoss();
    case 'ring': {
      const g = group('ring');
      add(g, new THREE.TorusGeometry(1.5, 0.22, 8, 20), 0xffd54a, [0, 0, 0], [0, 0, 0], [1, 1, 1], { emissive: 0.8, ink: 0.03 });
      return g;
    }
    case 'heal': {
      const g = group('heal');
      add(g, new THREE.SphereGeometry(0.95, 12, 8), 0x4ee38a, [0, 0, 0], [0, 0, 0], [1, 1, 1], { emissive: 0.5, ink: 0.03 });
      add(g, new THREE.BoxGeometry(0.2, 0.9, 0.2), 0xffffff, [0, 0, 1.0], [0, 0, 0], [1, 1, 1], { glow: true });
      add(g, new THREE.BoxGeometry(0.9, 0.2, 0.2), 0xffffff, [0, 0, 1.0], [0, 0, 0], [1, 1, 1], { glow: true });
      return g;
    }
    case 'bomb': {
      const g = group('bombpick');
      add(g, new THREE.DodecahedronGeometry(1.05), 0x46b4ff, [0, 0, 0], [0.4, 0.2, 0], [1, 1, 1], { emissive: 0.7, ink: 0.03 });
      return g;
    }
    case 'beam': return new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1), glowMat(0xffffff));
    case 'shot': return new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), glowMat(0xff6b5a));
    case 'missile': {
      const g = group('missile');
      add(g, new THREE.CylinderGeometry(0.22, 0.22, 1.6, 6), 0xf0f0f0, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], { ink: 0.03 });
      add(g, new THREE.ConeGeometry(0.24, 0.6, 6), 0xff7a3d, [0, 0, -1.1], [-Math.PI / 2, 0, 0], [1, 1, 1], { ink: 0.03 });
      add(g, new THREE.SphereGeometry(0.3, 8, 6), 0xffb36b, [0, 0, 0.95], [0, 0, 0], [1, 1, 1], { glow: true });
      return g;
    }
    case 'pillar': return new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 1, 9, 4), toonMat(0x8c6a58));
    case 'rock0': return new THREE.Mesh(buildRock(3, 1), toonMat(0x7a6f86));
    case 'rock1': return new THREE.Mesh(buildRock(11, 1), toonMat(0x6b5e62));
    case 'rock2': return new THREE.Mesh(buildRock(29, 1), toonMat(0x857c6e));
    default: throw new Error(`unknown model ${kind}`);
  }
}

// Returns a fresh instance of a model. Pivots (userData) are cloned as well.
export function makeModel(kind) {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  const inst = cache.get(kind).clone(true);
  // Re-link userData pivots to the cloned children (clone copies userData by reference).
  for (const key of ['wingL', 'wingR', 'head', 'core', 'ring', 'shields', 'turrets']) {
    const ref = cache.get(kind).userData[key];
    if (ref === undefined) continue;
    if (Array.isArray(ref)) inst.userData[key] = ref.map((r) => findClone(cache.get(kind), inst, r));
    else inst.userData[key] = findClone(cache.get(kind), inst, ref);
  }
  return inst;
}

// Maps a template node to the matching node in a clone by walking the same child index path.
function findClone(template, inst, node) {
  const path = [];
  let cur = node;
  while (cur && cur !== template) {
    const parent = cur.parent;
    path.unshift(parent.children.indexOf(cur));
    cur = parent;
  }
  let out = inst;
  for (const i of path) out = out.children[i];
  return out;
}
