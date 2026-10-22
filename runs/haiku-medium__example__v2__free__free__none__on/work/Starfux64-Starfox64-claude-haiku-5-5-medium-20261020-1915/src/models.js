// Procedural geometry. Ships face -Z (forward), units are roughly metres.
import {
  Group, Mesh, ConeGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry,
  IcosahedronGeometry, ExtrudeGeometry, Shape, Vector3,
} from 'three/webgpu';
import { toonMesh, makeBasic } from './render.js';

const HALF_PI = Math.PI / 2;

// Flat triangular wing outline in XZ (shape y becomes -z after the rotation).
function wingGeometry(points, thickness) {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const p of points.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
  g.rotateX(-HALF_PI);
  g.translate(0, thickness / 2, 0);
  return g;
}

// Mirror across the X axis. A negative scale flips triangle winding, so swap two corners per triangle.
function mirrorX(geo) {
  geo.scale(-1, 1, 1);
  const swapCorners = (attr) => {
    if (!attr) return;
    const n = attr.itemSize;
    const a = attr.array;
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let k = 0; k < n; k++) {
        const t = a[(i + 1) * n + k];
        a[(i + 1) * n + k] = a[(i + 2) * n + k];
        a[(i + 2) * n + k] = t;
      }
    }
    attr.needsUpdate = true;
  };
  swapCorners(geo.attributes.position);
  swapCorners(geo.attributes.normal);
  swapCorners(geo.attributes.uv);
  return geo;
}

function addTo(group, geo, color, opts = {}, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = toonMesh(geo, color, opts);
  m.position.set(...pos);
  m.rotation.set(...rot);
  group.add(m);
  return m;
}

const WING_SHAPE = [[0.25, 0.4], [3.6, -1.5], [3.3, -2.1], [0.35, -0.9]];

// Arwing: the player's ship. Tinted body with a canopy and two fin wings.
export function arwing(body = 0xd9dfe8, accent = 0x3a6cff) {
  const g = new Group();
  addTo(g, new ConeGeometry(0.42, 3.4, 6).rotateX(-HALF_PI).translate(0, 0, -0.3), body);
  addTo(g, new BoxGeometry(0.5, 0.36, 2.4).translate(0, 0.12, 0.6), body);
  addTo(g, new SphereGeometry(0.28, 12, 8).scale(1, 0.7, 1.4).translate(0, 0.32, -0.5), accent, { emissive: 0.1 });
  const wing = wingGeometry(WING_SHAPE, 0.1);
  addTo(g, wing.clone(), accent, {}, [0, 0, 0]);
  addTo(g, mirrorX(wing.clone()), accent, {}, [0, 0, 0]);
  addTo(g, new BoxGeometry(0.1, 1.0, 1.2).translate(0, 0.45, 0.5), accent, {}, [0, 0, 0]);
  g.userData.kind = 'arwing';
  return g;
}

// Engine glow discs, placed behind a ship. Returned so the caller can pulse them.
export function engineGlows(group, color = 0x7de8ff) {
  const mat = makeBasic(color, { alpha: 0.9, additive: true });
  const geo = new SphereGeometry(0.22, 10, 8);
  const glows = [-0.5, 0.5].map((x) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, 0.05, 1.7);
    group.add(m);
    return m;
  });
  return glows;
}

// Wingman: an Arwing re-coloured for squadron identity.
export function wingman(color) {
  const g = arwing(0xe8ecf2, color);
  g.userData.kind = 'wingman';
  return g;
}

// Venom fighter: a dark delta with twin pods.
export function venom(color = 0xb43fd6) {
  const g = new Group();
  addTo(g, new ConeGeometry(0.7, 3.0, 5).rotateX(-HALF_PI).translate(0, 0, -0.2), 0x2b2740);
  const delta = wingGeometry([[0, 0.2], [3.0, -1.2], [0, -1.6]], 0.12);
  addTo(g, delta.clone(), color, {}, [0, 0, 0]);
  addTo(g, mirrorX(delta.clone()), color, {}, [0, 0, 0]);
  addTo(g, new CylinderGeometry(0.22, 0.22, 1.6, 8).rotateX(HALF_PI).translate(0.9, -0.2, 0.2), 0x5a5470);
  addTo(g, new CylinderGeometry(0.22, 0.22, 1.6, 8).rotateX(HALF_PI).translate(-0.9, -0.2, 0.2), 0x5a5470);
  const glowMat = makeBasic(0xff4a6e, { alpha: 0.95, additive: true });
  for (const x of [-0.9, 0.9]) {
    const m = new Mesh(new SphereGeometry(0.2, 8, 6), glowMat);
    m.position.set(x, -0.2, -0.9);
    g.add(m);
  }
  g.userData.kind = 'venom';
  return g;
}

// Ground turret: base, swivelling head and twin barrels. The head rotates at the root of the group.
export function turret(color = 0x8a6a4a) {
  const g = new Group();
  addTo(g, new CylinderGeometry(2.4, 2.8, 1.6, 10).translate(0, 0.8, 0), 0x6e7480);
  const head = new Group();
  head.position.set(0, 2.4, 0);
  addTo(head, new BoxGeometry(2.6, 1.2, 2.6), color, {}, [0, 0, 0]);
  addTo(head, new CylinderGeometry(0.22, 0.22, 2.6, 8).rotateX(HALF_PI).translate(0.7, 0, -1.8), 0x2d3038);
  addTo(head, new CylinderGeometry(0.22, 0.22, 2.6, 8).rotateX(HALF_PI).translate(-0.7, 0, -1.8), 0x2d3038);
  g.add(head);
  g.userData = { kind: 'turret', head };
  return g;
}

// Asteroid: an icosahedron with seeded radial jitter so every rock looks different.
export function asteroid(radius, seed) {
  const geo = new IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const jitter = new Map();
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!jitter.has(key)) jitter.set(key, 0.78 + rnd() * 0.42);
    const k = jitter.get(key);
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  const tints = [0x8d8a94, 0x7a6f66, 0x6b7180, 0x9a8570];
  const m = toonMesh(geo, tints[Math.floor(rnd() * tints.length)], { outline: radius * 0.06 });
  return m;
}

// Mothership boss: a long hull with a bridge, side batteries and a central reactor core.
// Returns the group plus named part anchors so the game can attach colliders and damage state.
export function carrier() {
  const g = new Group();
  addTo(g, new BoxGeometry(34, 8, 80).translate(0, 0, 0), 0x4b4a63, { outline: 0.25 });
  addTo(g, new BoxGeometry(14, 6, 26).translate(0, 6.5, -12), 0x5d5c78, { outline: 0.25 });
  addTo(g, new BoxGeometry(44, 2.2, 18).translate(0, -1.2, 22), 0x3a3950, { outline: 0.25 });
  for (const x of [-24, 24]) {
    addTo(g, new BoxGeometry(10, 9, 56).translate(x, -0.5, 0), 0x363549, { outline: 0.25 });
  }
  const parts = {};
  parts.coreAnchor = new Group();
  parts.coreAnchor.position.set(0, -6.5, -18);
  g.add(parts.coreAnchor);
  addTo(parts.coreAnchor, new SphereGeometry(6, 16, 12), 0xff3b5c, { emissive: 0.8, outline: 0.2 });
  addTo(parts.coreAnchor, new TorusGeometry(8, 0.5, 6, 24).rotateX(HALF_PI), 0xffb35a, { emissive: 0.4, outline: 0 });
  for (const side of [-1, 1]) {
    const a = new Group();
    a.position.set(side * 26, 0, -6);
    g.add(a);
    addTo(a, new SphereGeometry(4.2, 12, 10), 0x2f2d46, { outline: 0.2 });
    addTo(a, new CylinderGeometry(1.0, 1.2, 6, 8).rotateX(HALF_PI).translate(0, 0, -4), 0x20202e, { outline: 0.15 });
    parts[side < 0 ? 'batteryL' : 'batteryR'] = a;
  }
  parts.shield = new Group();
  parts.shield.position.set(0, -6.5, -18);
  g.add(parts.shield);
  addTo(parts.shield, new TorusGeometry(10.5, 0.7, 6, 32), 0x7fe3ff, { emissive: 0.6, outline: 0 });
  g.userData.parts = parts;
  return g;
}

// Ground pillar for canyon or ruin props. Height and colour are picked by the caller.
export function pillar(height, color) {
  const g = new Group();
  addTo(g, new BoxGeometry(6, height, 6).translate(0, height / 2, 0), color, { outline: 0.15 });
  return g;
}

// Power-up ring: a glowing torus that the player flies through.
export function ringPickup(color = 0x7dffb0) {
  const g = new Group();
  addTo(g, new TorusGeometry(2.4, 0.42, 8, 24), color, { emissive: 0.6, outline: 0.1 });
  g.userData.kind = 'ring';
  return g;
}

// Glowing enemy shot: an elongated bolt or a round missile.
export function shotGeometry() {
  return new BoxGeometry(0.18, 0.18, 2.4);
}

