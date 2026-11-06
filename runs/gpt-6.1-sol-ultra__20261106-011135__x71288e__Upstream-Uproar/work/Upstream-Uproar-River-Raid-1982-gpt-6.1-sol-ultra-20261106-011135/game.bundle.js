// main.js
import * as THREE2 from "three/webgpu";
import RAPIER from "rapier";

// world.js
import * as THREE from "three/webgpu";
var INK = 1522491;
var P = {
  ink: INK,
  water: 1474437,
  deep: 1140595,
  foam: 9361611,
  sand: 16172139,
  cream: 16773571,
  grass: 7973232,
  darkGrass: 4618591,
  red: 16149319,
  navy: 2444632
};
var materials = new Map;
var edgeMaterial = new THREE.LineBasicMaterial({ color: INK });
var shadowMaterial = new THREE.MeshBasicMaterial({
  color: 478813,
  transparent: true,
  opacity: 0.26,
  depthWrite: false
});
var ramp = new THREE.DataTexture(new Uint8Array([
  105,
  105,
  105,
  255,
  170,
  170,
  170,
  255,
  224,
  224,
  224,
  255,
  255,
  255,
  255,
  255
]), 4, 1, THREE.RGBAFormat);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
function mat(color, unlit = false) {
  const key = color + ":" + unlit;
  if (!materials.has(key))
    materials.set(key, unlit ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshToonMaterial({ color, gradientMap: ramp }));
  return materials.get(key);
}
function mesh(geometry, color, outline = true, unlit = false) {
  const m = new THREE.Mesh(geometry, mat(color, unlit));
  m.castShadow = true;
  m.receiveShadow = true;
  if (outline)
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edgeMaterial));
  return m;
}
function box(g, x, y, z, color, px = 0, py = 0, pz = 0, outline = true) {
  const m = mesh(new THREE.BoxGeometry(x, y, z), color, outline);
  m.position.set(px, py, pz);
  g.add(m);
  return m;
}
function cylinder(g, r1, r2, height, color, x = 0, y = 0, z = 0, sides = 8) {
  const m = mesh(new THREE.CylinderGeometry(r1, r2, height, sides), color);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function beam(g, a, b, radius, color) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), d = end.clone().sub(start);
  const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 5), color);
  m.position.copy(start.add(end).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.add(m);
  return m;
}
function prism(points, height, color) {
  const vectors = points.map((p) => new THREE.Vector2(p[0], p[1]));
  const tri = THREE.ShapeUtils.triangulateShape(vectors, []);
  const verts = [], n = points.length;
  const put = (i, y) => verts.push(points[i][0], y, points[i][1]);
  for (const t of tri) {
    for (const i of [...t].reverse())
      put(i, height / 2);
    for (const i of t)
      put(i, -height / 2);
  }
  for (let i = 0;i < n; i++) {
    const j = (i + 1) % n;
    put(i, -height / 2);
    put(j, height / 2);
    put(j, -height / 2);
    put(i, -height / 2);
    put(i, height / 2);
    put(j, height / 2);
  }
  const geo = new THREE.BufferGeometry;
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return mesh(geo, color);
}
function shadow(g, x = 1.5, z = 2, y = -1.26) {
  const s = new THREE.Mesh(new THREE.CircleGeometry(1, 16), shadowMaterial);
  s.rotation.x = -Math.PI / 2;
  s.scale.set(x, z, 1);
  s.position.set(0.25, y, 0.6);
  g.add(s);
  return s;
}
function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function canyonAmount(progress) {
  return smooth(760, 900, progress) * (1 - smooth(1560, 1700, progress));
}
function river(progress) {
  const wide = 8.8 + Math.sin(progress * 0.023) * 1.15 + Math.sin(progress * 0.007 + 1) * 0.75;
  const narrow = 6.9 + Math.sin(progress * 0.023) * 0.6 + Math.sin(progress * 0.007 + 1) * 0.2;
  return {
    center: Math.sin(progress * 0.014) * 3.5 + Math.sin(progress * 0.031 + 0.6) * 1.9,
    width: wide + (narrow - wide) * canyonAmount(progress)
  };
}
function makePlane(color = P.red) {
  const group = new THREE.Group;
  const body = new THREE.Group;
  body.name = "airframe";
  group.add(body);
  const hull = prism([
    [-0.34, -1.65],
    [0.34, -1.65],
    [0.53, -0.45],
    [0.28, 1.6],
    [-0.28, 1.6],
    [-0.53, -0.45]
  ], 0.55, color);
  body.add(hull);
  const wing = prism([
    [-0.35, -0.45],
    [-2.15, 0.27],
    [-2.15, 0.72],
    [-0.28, 0.31],
    [0.28, 0.31],
    [2.15, 0.72],
    [2.15, 0.27],
    [0.35, -0.45]
  ], 0.16, P.cream);
  wing.position.y = 0.02;
  body.add(wing);
  box(body, 0.23, 0.2, 0.56, P.navy, -1.97, 0.04, 0.49);
  box(body, 0.23, 0.2, 0.56, P.navy, 1.97, 0.04, 0.49);
  const tail = prism([
    [-0.2, 0.9],
    [-1, 1.43],
    [-1, 1.69],
    [0, 1.38],
    [1, 1.69],
    [1, 1.43],
    [0.2, 0.9]
  ], 0.12, color);
  tail.position.y = 0.19;
  body.add(tail);
  box(body, 0.12, 0.64, 0.7, P.cream, 0, 0.42, 1.18);
  const canopy = mesh(new THREE.SphereGeometry(0.44, 8, 5), P.navy);
  canopy.scale.set(0.72, 0.67, 1.4);
  canopy.position.set(0, 0.34, -0.13);
  body.add(canopy);
  const glass = mesh(new THREE.SphereGeometry(0.25, 6, 4), 11134426, false, true);
  glass.scale.set(0.65, 0.35, 1.1);
  glass.position.set(-0.09, 0.59, -0.21);
  body.add(glass);
  box(body, 0.14, 0.04, 0.46, P.cream, 0, 0.3, -1.1);
  const nose = mesh(new THREE.ConeGeometry(0.33, 0.48, 8), P.cream);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.82;
  body.add(nose);
  const prop = new THREE.Group;
  prop.name = "propeller";
  prop.position.set(0, 0, -2.03);
  body.add(prop);
  box(prop, 1.2, 0.09, 0.075, P.navy);
  box(prop, 0.09, 1.2, 0.075, P.navy);
  const flame = mesh(new THREE.ConeGeometry(0.21, 0.7, 7), 16767863, false, true);
  flame.name = "thrust";
  flame.rotation.x = Math.PI / 2;
  flame.position.set(0, -0.04, 1.84);
  body.add(flame);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 4, 20), mat(P.cream, true));
  ring.position.z = -0.95;
  ring.rotation.x = Math.PI / 2;
  body.add(ring);
  shadow(group, 1.8, 1.3);
  const mixer = new THREE.AnimationMixer(group);
  const clip = new THREE.AnimationClip("Cruise", 0.8, [
    new THREE.NumberKeyframeTrack("propeller.rotation[z]", [0, 0.8], [0, Math.PI * 12]),
    new THREE.NumberKeyframeTrack("thrust.scale[y]", [0, 0.2, 0.4, 0.6, 0.8], [1, 1.3, 0.8, 1.2, 1]),
    new THREE.NumberKeyframeTrack("airframe.position[y]", [0, 0.4, 0.8], [0, 0.07, 0])
  ]);
  mixer.clipAction(clip).play();
  group.userData.airframe = body;
  group.userData.flame = flame;
  return { group, mixer };
}
function makeGhost(color = 9035225) {
  const { group, mixer } = makePlane(color);
  group.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.6;
      o.material.depthWrite = false;
    }
  });
  group.userData.mixer = mixer;
  return group;
}
function boat() {
  const g = new THREE.Group;
  g.add(prism([
    [-0.75, 1.55],
    [-0.94, -0.6],
    [0, -1.7],
    [0.94, -0.6],
    [0.75, 1.55]
  ], 0.48, P.navy));
  const deck = prism([
    [-0.59, 1.4],
    [-0.75, -0.55],
    [0, -1.4],
    [0.75, -0.55],
    [0.59, 1.4]
  ], 0.12, P.cream);
  deck.position.y = 0.3;
  g.add(deck);
  box(g, 1.05, 0.5, 1, P.red, 0, 0.56, 0.45);
  box(g, 0.8, 0.25, 0.45, P.navy, 0, 0.9, 0.36);
  cylinder(g, 0.25, 0.3, 0.27, P.navy, 0, 0.53, -0.65);
  beam(g, [0, 0.64, -0.65], [0, 0.64, -1.5], 0.09, P.ink);
  beam(g, [-0.66, 0.45, 0.1], [-0.66, 0.45, 1.3], 0.035, P.ink);
  beam(g, [0.66, 0.45, 0.1], [0.66, 0.45, 1.3], 0.035, P.ink);
  return g;
}
function helicopter() {
  const g = new THREE.Group;
  const hull = mesh(new THREE.SphereGeometry(0.7, 8, 5), 15252830);
  hull.scale.set(1, 0.75, 1.5);
  hull.position.y = 0.8;
  g.add(hull);
  const glass = mesh(new THREE.SphereGeometry(0.53, 8, 4), P.navy);
  glass.scale.set(1, 0.75, 0.9);
  glass.position.set(0, 0.96, -0.6);
  g.add(glass);
  const tail = mesh(new THREE.ConeGeometry(0.25, 2, 5), P.red);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.75, 1.6);
  g.add(tail);
  box(g, 0.1, 0.6, 0.6, P.navy, 0, 1, 2.4);
  beam(g, [0, 1, 0], [0, 1.65, 0], 0.08, P.ink);
  const rotor = new THREE.Group;
  rotor.position.y = 1.65;
  g.add(rotor);
  box(rotor, 3.8, 0.065, 0.18, P.ink);
  box(rotor, 0.18, 0.065, 3.8, P.ink);
  for (const x of [-0.58, 0.58]) {
    beam(g, [x, 0.26, -0.55], [x, 0.26, 0.8], 0.07, P.cream);
    beam(g, [x, 0.26, 0.1], [x, 0.61, 0.1], 0.05, P.ink);
  }
  g.userData.rotor = rotor;
  shadow(g, 1.5, 1.2, -0.65);
  return g;
}
function fuel() {
  const g = new THREE.Group;
  box(g, 2.25, 0.16, 3.2, P.cream, 0, 0.04, 0);
  box(g, 2, 0.06, 2.95, 5155204, 0, 0.16, 0);
  for (const x of [-0.63, 0.63])
    cylinder(g, 0.29, 0.29, 0.9, P.sand, x, 0.63, 0.4, 8);
  box(g, 1.3, 0.65, 0.85, 15726025, 0, 0.55, -0.55);
  box(g, 0.35, 0.06, 0.95, P.red, 0, 0.91, -0.55);
  box(g, 0.95, 0.06, 0.35, P.red, 0, 0.92, -0.55);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 5, 28), mat(P.cream, true));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.23;
  g.add(ring);
  g.userData.ring = ring;
  for (const x of [-1, 1]) {
    box(g, 0.08, 1.5, 0.08, P.ink, x, 0.85, -1.3);
    box(g, 0.32, 0.3, 0.03, P.sand, x, 1.5, -1.3);
  }
  return g;
}
function bridge() {
  const g = new THREE.Group;
  box(g, 20, 0.42, 2.6, P.cream, 0, 0.2, 0);
  box(g, 20, 0.07, 1.6, P.navy, 0, 0.44, 0);
  for (let x = -9;x < 10; x += 2)
    box(g, 0.85, 0.025, 0.06, P.cream, x, 0.49, 0, false);
  for (const z of [-1.25, 1.25]) {
    beam(g, [-10, 0.45, z], [10, 0.45, z], 0.075, P.ink);
    beam(g, [-10, 1.8, z], [10, 1.8, z], 0.09, P.red);
    for (let x = -10;x < 10; x += 2) {
      beam(g, [x, 0.45, z], [x + 1, 1.8, z], 0.07, P.red);
      beam(g, [x + 1, 1.8, z], [x + 2, 0.45, z], 0.07, P.red);
    }
  }
  for (const x of [-8, 8])
    box(g, 0.75, 1.2, 3.2, P.sand, x, -0.3, 0);
  box(g, 2.2, 0.75, 1.8, P.red, 0, 0.91, 0);
  box(g, 0.3, 0.04, 1.4, P.cream, 0, 1.31, 0);
  box(g, 1.6, 0.04, 0.3, P.cream, 0, 1.32, 0);
  return g;
}
function turret() {
  const g = new THREE.Group;
  cylinder(g, 0.85, 1.05, 0.35, P.sand, 0, 0.2, 0, 8);
  cylinder(g, 0.63, 0.73, 0.5, P.navy, 0, 0.6, 0, 8);
  const gun = new THREE.Group;
  g.add(gun);
  cylinder(g, 0.42, 0.5, 0.4, P.red, 0, 0.97, 0);
  beam(g, [0, 1.05, 0], [0, 1.05, 1.3], 0.13, P.ink);
  g.userData.turret = gun;
  return g;
}
function boss() {
  const g = new THREE.Group;
  g.add(prism([
    [-2.5, 3.6],
    [-2.9, -2.4],
    [-1.6, -4.1],
    [1.6, -4.1],
    [2.9, -2.4],
    [2.5, 3.6]
  ], 0.75, P.navy));
  const deck = prism([
    [-2.15, 3.35],
    [-2.45, -2.3],
    [-1.35, -3.6],
    [1.35, -3.6],
    [2.45, -2.3],
    [2.15, 3.35]
  ], 0.18, 15056231);
  deck.position.y = 0.5;
  g.add(deck);
  box(g, 2.9, 0.85, 2.25, P.red, 0, 1, -0.8);
  box(g, 2.4, 0.6, 1.3, P.cream, 0, 1.7, -0.8);
  box(g, 2.15, 0.3, 0.45, P.navy, 0, 1.94, -1.26);
  for (const x of [-1.5, 1.5]) {
    const t = turret();
    t.scale.setScalar(0.9);
    t.position.set(x, 0.53, 1.75);
    g.add(t);
    box(g, 0.45, 0.2, 1.3, 16767102, x, 0.65, 3);
  }
  const mast = new THREE.Group;
  mast.position.set(0, 2, -0.5);
  g.add(mast);
  beam(mast, [0, 0, 0], [0, 1.8, 0], 0.08, P.ink);
  const radar = box(mast, 1.8, 0.45, 0.12, P.cream, 0, 1.7, 0);
  g.userData.radar = radar;
  for (const x of [-2.6, 2.6]) {
    box(g, 0.5, 0.5, 5.5, P.red, x, 0.5, 0);
    for (let z = -2;z < 3; z++)
      box(g, 0.54, 0.1, 0.32, P.cream, x, 0.8, z);
  }
  return g;
}
function makeEntity(type) {
  if (type === "boat")
    return boat();
  if (type === "heli")
    return helicopter();
  if (type === "fuel")
    return fuel();
  if (type === "bridge")
    return bridge();
  if (type === "turret")
    return turret();
  if (type === "boss")
    return boss();
  const g = new THREE.Group;
  if (type === "bullet") {
    const m = box(g, 0.14, 0.16, 1, 16774332, 0, 0, 0, false);
    m.material = mat(16774332, true);
    box(g, 0.35, 0.1, 0.32, 16756308, 0, 0, 0.4, false);
  } else if (type === "enemyBullet") {
    const m = mesh(new THREE.OctahedronGeometry(0.22), 16766583, false, true);
    g.add(m);
  }
  return g;
}
function tree(seed = 0) {
  const g = new THREE.Group;
  cylinder(g, 0.13, 0.19, 1.4, 9072724, 0, 0.5, 0, 5);
  const colors = [4030571, 5150324, 6990460];
  for (let j = 0;j < 2; j++) {
    const crown = mesh(new THREE.IcosahedronGeometry(0.9 - j * 0.17, 0), colors[(seed + j) % 3]);
    crown.scale.set(1, 1.15, 1);
    crown.position.set(j * 0.12, 1.65 + j * 0.65, 0);
    g.add(crown);
  }
  return g;
}
function rock(seed) {
  const g = new THREE.Group;
  const m = mesh(new THREE.IcosahedronGeometry(1, 0), seed % 2 ? 14984797 : 15842673);
  m.scale.set(1.3 + seed % 3 * 0.4, 0.6 + seed % 4 * 0.3, 0.9);
  m.rotation.y = seed;
  g.add(m);
  const top = mesh(new THREE.IcosahedronGeometry(0.65, 0), 9021814);
  top.scale.set(1.3, 0.35, 0.9);
  top.position.y = 0.6 + seed % 4 * 0.21;
  g.add(top);
  return g;
}
function canyonRock(seed) {
  const g = new THREE.Group;
  const layers = [
    [1.22, 1.52, 1.18, 13928290, 0.59],
    [1.08, 1.22, 0.34, 16765324, 1.35],
    [0.93, 1.08, 0.92, 14981996, 1.98],
    [0.84, 0.93, 0.25, 16768924, 2.56],
    [0.68, 0.84, 0.62, 12087386, 3]
  ];
  for (const [r1, r2, h, color, y] of layers)
    cylinder(g, r1, r2, h, color, 0, y, 0, 5);
  const cap = mesh(new THREE.IcosahedronGeometry(0.8, 0), seed % 3 ? 9546357 : 15316605);
  cap.scale.set(1.05, 0.34, 0.9);
  cap.position.y = 3.33;
  g.add(cap);
  return g;
}
function pylon() {
  const g = new THREE.Group;
  for (const x of [-0.4, 0.4])
    for (const z of [-0.35, 0.35])
      beam(g, [x, 0, z], [x * 0.4, 3.2, z * 0.4], 0.045, P.ink);
  for (let y = 0.5;y < 3; y += 0.7) {
    beam(g, [-0.4, y, -0.35], [0.4, y + 0.6, -0.35], 0.03, P.ink);
    beam(g, [0.4, y, 0.35], [-0.4, y + 0.6, 0.35], 0.03, P.ink);
  }
  box(g, 2.3, 0.09, 0.09, P.ink, 0, 2.75, 0);
  for (const x of [-0.9, 0.9])
    cylinder(g, 0.13, 0.13, 0.27, P.cream, x, 2.9, 0, 6);
  return g;
}

class Ribbon {
  constructor(scene, steps, color, unlit = false) {
    this.steps = steps;
    this.positions = new Float32Array(steps * 18);
    this.geometry = new THREE.BufferGeometry;
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const normals = new Float32Array(steps * 18);
    for (let i = 1;i < normals.length; i += 3)
      normals[i] = 1;
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    this.mesh = new THREE.Mesh(this.geometry, mat(color, unlit));
    this.mesh.receiveShadow = !unlit;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(sample, z0, step) {
    const a = this.positions;
    for (let i = 0;i < this.steps; i++) {
      const z = z0 + i * step, p = sample(z), q = sample(z + step), j = i * 18;
      if (p[0] > p[1]) {
        [p[0], p[1]] = [p[1], p[0]];
        [p[2], p[3]] = [p[3], p[2]];
      }
      if (q[0] > q[1]) {
        [q[0], q[1]] = [q[1], q[0]];
        [q[2], q[3]] = [q[3], q[2]];
      }
      a.set([
        p[0],
        p[2],
        z,
        q[0],
        q[2],
        z + step,
        q[1],
        q[3],
        z + step,
        p[0],
        p[2],
        z,
        q[1],
        q[3],
        z + step,
        p[1],
        p[3],
        z
      ], j);
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}

class WorldView {
  constructor(scene) {
    this.scene = scene;
    this.effects = [];
    this.time = 0;
    this.progress = 0;
    this.ribbons = [];
    const steps = 96;
    const add = (color, sample, unlit = false) => this.ribbons.push({ r: new Ribbon(scene, steps, color, unlit), sample });
    add(P.water, (r) => [r.center - r.width, r.center + r.width, 0, 0], true);
    for (const side of [-1, 1]) {
      const edge = (r) => r.center + side * r.width;
      add(2596248, (r) => [edge(r) - side * 0.7, edge(r), 0.012, 0.012], true);
      add(P.ink, (r) => [edge(r), edge(r) + side * 0.12, 0.025, 0.025], true);
      add(P.sand, (r) => [
        edge(r) + side * 0.12,
        edge(r) + side * 0.8,
        0.1,
        0.13
      ]);
      add(13472088, (r) => [
        edge(r) + side * 0.8,
        edge(r) + side * 1.15,
        0.13,
        0.75
      ]);
      add(P.ink, (r) => [edge(r) + side * 1.15, edge(r) + side * 1.25, 0.76, 0.76], true);
      add(9155965, (r) => [
        edge(r) + side * 1.25,
        edge(r) + side * 3.2,
        0.78,
        0.78
      ]);
      add(7906673, (r) => [edge(r) + side * 3.2, side * 75, 0.8, 0.8]);
    }
    this.props = [];
    for (let i = 0;i < 68; i++) {
      const seed = i % 17;
      const obj = seed % 8 === 0 ? pylon() : seed % 3 === 0 ? rock(seed) : tree(seed);
      scene.add(obj);
      this.props.push({ obj, slot: i });
    }
    this.cliffs = [];
    for (let i = 0;i < 24; i++) {
      const obj = canyonRock(i);
      scene.add(obj);
      this.cliffs.push({ obj, slot: i });
    }
    this.foams = [];
    for (let i = 0;i < 100; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.55 + i % 5 * 0.22), mat(i % 3 ? 5158831 : 9164489, true));
      f.rotation.x = -Math.PI / 2;
      f.position.y = 0.024;
      scene.add(f);
      this.foams.push(f);
    }
    this.clouds = [];
    for (let i = 0;i < 7; i++) {
      const cloud = new THREE.Group;
      for (let j = 0;j < 3; j++) {
        const m = mesh(new THREE.IcosahedronGeometry(1.7, 1), 16773581, false, true);
        m.scale.set(1.5, 0.32, 1);
        m.position.x = j * 1.5;
        cloud.add(m);
      }
      cloud.position.y = 8 + i * 0.3;
      scene.add(cloud);
      this.clouds.push(cloud);
    }
  }
  render(progress, time) {
    this.progress = progress;
    this.time = time;
    for (const { r, sample } of this.ribbons)
      r.update((z) => sample(river(progress - z + 5)), -106, 1.5);
    const first = Math.floor(progress / 5) * 5;
    for (const { obj, slot } of this.props) {
      const side = slot % 2 === 0 ? -1 : 1, at = first + (Math.floor(slot / 2) - 4) * 5;
      const v = river(at), noise = Math.sin(at * 1.732 + side * 8), off = 2.7 + (noise + 1) * 3.2;
      obj.position.set(v.center + side * (v.width + off), 0.9, 5 - (at - progress));
      obj.rotation.y = Math.sin(at) * 2;
      obj.scale.setScalar(0.8 + (Math.sin(at * 0.73) + 1) * 0.3);
    }
    const cliffFirst = Math.floor(progress / 11) * 11;
    for (const { obj, slot } of this.cliffs) {
      const side = slot % 2 === 0 ? -1 : 1, at = cliffFirst + (Math.floor(slot / 2) - 2) * 11;
      const v = river(at), canyon = canyonAmount(at), noise = (Math.sin(at * 0.43) + 1) * 0.5;
      obj.position.set(v.center + side * (v.width + 3.25 + noise * 2), 0.8, 5 - (at - progress));
      obj.rotation.y = Math.sin(at * 0.14) * 1.2;
      obj.scale.set(1.05 + noise * 0.5, 0.16 + canyon * (0.95 + noise * 0.55), 1.1 + noise * 0.35);
    }
    for (let i = 0;i < this.foams.length; i++) {
      const at = first + (i - 17) * 1.25 + time * 0.5 % 1.25, v = river(at);
      this.foams[i].position.set(v.center + Math.sin(i * 71.7) * (v.width - 0.8), 0.025, 5 - (at - progress));
      this.foams[i].scale.y = 1 + Math.sin(time * 2 + i) * 0.2;
    }
    for (let i = 0;i < this.clouds.length; i++) {
      const at = first + (i - 1) * 21;
      this.clouds[i].position.x = river(at).center + (i % 2 ? 21 : -25) + Math.sin(time * 0.05 + i) * 4;
      this.clouds[i].position.z = 5 - (at - progress);
    }
  }
  makeBurst(x, z, color = 16369262) {
    const g = new THREE.Group;
    g.position.set(x, 0.9, z);
    this.scene.add(g);
    for (let i = 0;i < 16; i++) {
      const m = mesh(new THREE.OctahedronGeometry(0.18 + i % 3 * 0.12), i % 3 ? color : P.cream, false, true);
      g.add(m);
      m.userData.velocity = new THREE.Vector3(Math.cos(i * 2.399) * (0.8 + i * 0.15), 1 + i % 4, Math.sin(i * 2.399) * (0.8 + i * 0.15));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 4, 20), mat(P.cream, true));
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    this.effects.push({ g, life: 0, ring });
    return g;
  }
  updateEffects(dt) {
    for (let i = this.effects.length - 1;i >= 0; i--) {
      const e = this.effects[i];
      e.life += dt;
      for (const m of e.g.children) {
        if (m.userData.velocity) {
          m.position.addScaledVector(m.userData.velocity, dt);
          m.userData.velocity.y -= dt * 6;
          m.rotation.x += dt * 4;
          m.rotation.z += dt * 2;
          m.scale.setScalar(Math.max(0.01, 1 - e.life));
        }
      }
      e.ring.scale.setScalar(1 + e.life * 7);
      e.ring.visible = e.life < 0.55;
      if (e.life > 1) {
        this.scene.remove(e.g);
        e.g.traverse((o) => {
          if (o.isMesh)
            o.geometry.dispose();
        });
        this.effects.splice(i, 1);
      }
    }
    return this.effects.length;
  }
  river(progress) {
    return river(progress);
  }
}

// audio.js
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.7;
    this.paused = false;
    this.stopped = false;
    this.playing = false;
    this.step = 0;
    this.nextBeat = 0;
    this.lastShot = -1;
    this.counts = { notes: 0, shots: 0, explosions: 0, pickups: 0, voices: 0 };
    this._seed = 1982;
    this._rms = 0;
  }
  _random() {
    this._seed = Math.imul(this._seed, 1664525) + 1013904223 >>> 0;
    return this._seed / 4294967296;
  }
  async unlock() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass)
      return false;
    if (!this.ctx) {
      this.ctx = new AudioContextClass;
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.78;
      this.music = c.createGain();
      this.music.gain.value = this.musicVolume;
      this.sfx = c.createGain();
      this.sfx.gain.value = this.sfxVolume;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 16;
      compressor.ratio.value = 3;
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 512;
      this.samples = new Float32Array(this.analyser.fftSize);
      this.master.connect(compressor).connect(this.analyser).connect(c.destination);
      this.echo = c.createDelay(0.5);
      this.echo.delayTime.value = 0.134;
      const echoTone = c.createBiquadFilter();
      echoTone.type = "lowpass";
      echoTone.frequency.value = 2100;
      const feedback = c.createGain();
      feedback.gain.value = 0.18;
      this.echo.connect(echoTone).connect(feedback).connect(this.echo);
      const echoLevel = c.createGain();
      echoLevel.gain.value = 0.22;
      echoTone.connect(echoLevel).connect(this.music);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0;i < data.length; i++)
        data[i] = this._random() * 2 - 1;
      this.engineFilter = c.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 290;
      this.engineGain = c.createGain();
      this.engineGain.gain.value = 0;
      this.engineFilter.connect(this.engineGain).connect(this.sfx);
      this.engine = c.createOscillator();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 46;
      this.engine.connect(this.engineFilter);
      this.engine.start();
      this.engineHarmonic = c.createOscillator();
      this.engineHarmonic.type = "triangle";
      this.engineHarmonic.frequency.value = 93;
      this.engineHarmonic.connect(this.engineFilter);
      this.engineHarmonic.start();
      this.nextBeat = c.currentTime + 0.06;
    }
    this.stopped = false;
    if (this.ctx.state !== "running")
      await this.ctx.resume();
    this.master.gain.setTargetAtTime(this.paused ? 0 : 0.78, this.ctx.currentTime, 0.035);
    return this.ctx.state === "running";
  }
  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.music)
      this.music.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.04);
  }
  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.sfx)
      this.sfx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.04);
  }
  _tone(freq, start, length, volume = 0.1, type = "triangle", destination = this.music, endFreq = freq) {
    const c = this.ctx;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + length);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.007, length * 0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(destination);
    osc.start(start);
    osc.stop(start + length + 0.015);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    return gain;
  }
  _noise(start, length, volume, frequency, type = "highpass", destination = this.sfx) {
    const c = this.ctx;
    const source = c.createBufferSource();
    source.buffer = this.noise;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.6;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(gain).connect(destination);
    source.start(start, this._random() * 0.4);
    source.stop(start + length + 0.015);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  _musicStep(time) {
    const beat = this.step % 16;
    const bar = Math.floor(this.step / 16) % 8;
    const roots = [38, 38, 41, 41, 43, 43, 38, 45];
    const root = roots[bar];
    const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
    const bassOffsets = [
      0,
      null,
      12,
      null,
      0,
      null,
      7,
      10,
      null,
      0,
      null,
      12,
      7,
      null,
      10,
      null
    ];
    if (bassOffsets[beat] !== null)
      this._tone(hz(root + bassOffsets[beat]), time, 0.19, 0.48, "triangle");
    if (beat === 0 || beat === 6 || beat === 8 || beat === 14) {
      this._tone(118, time, 0.15, 0.68, "sine", this.music, 38);
      this._noise(time, 0.025, 0.08, 1500, "highpass", this.music);
    }
    if (beat === 4 || beat === 12) {
      this._noise(time, 0.13, 0.36, 1300, "bandpass", this.music);
      this._tone(170, time, 0.07, 0.16, "triangle");
    }
    if (beat % 2 === 0 || beat === 15)
      this._noise(time, beat === 14 ? 0.14 : 0.045, beat % 4 === 0 ? 0.12 : 0.07, 7500, "highpass", this.music);
    if ([2, 6, 10, 14].includes(beat)) {
      for (const interval of [12, 15, 19])
        this._tone(hz(root + interval), time, 0.085, 0.075, "square");
    }
    const melody = [
      24,
      null,
      27,
      31,
      null,
      29,
      null,
      27,
      24,
      null,
      22,
      null,
      24,
      27,
      null,
      31
    ];
    const note = melody[(beat + (bar % 2 ? 4 : 0)) % 16];
    if (note !== null && (bar % 4 < 3 || beat < 8)) {
      const out = this._tone(hz(root + note), time, 0.2, 0.13, "triangle");
      out.connect(this.echo);
    }
    this.step++;
    this.counts.notes++;
  }
  update(dt, state = {}) {
    if (!this.ctx || this.ctx.state !== "running" || this.stopped)
      return;
    const c = this.ctx;
    this.playing = !!state.playing;
    if (!this.paused) {
      if (this.nextBeat < c.currentTime - 0.3)
        this.nextBeat = c.currentTime + 0.025;
      let scheduled = 0;
      while (this.nextBeat < c.currentTime + 0.15 && scheduled++ < 6) {
        this._musicStep(this.nextBeat);
        this.nextBeat += 60 / 112 / 4;
      }
    }
    const speed = Math.max(0, Math.min(2.5, Number(state.speed) || 1));
    this.engine.frequency.setTargetAtTime(37 + speed * 17, c.currentTime, 0.1);
    this.engineHarmonic.frequency.setTargetAtTime(75 + speed * 34, c.currentTime, 0.1);
    this.engineFilter.frequency.setTargetAtTime(200 + speed * 130, c.currentTime, 0.12);
    this.engineGain.gain.setTargetAtTime(this.playing && !this.paused ? 0.024 : 0, c.currentTime, 0.08);
    this.analyser.getFloatTimeDomainData(this.samples);
    let energy = 0;
    for (let i = 0;i < this.samples.length; i++)
      energy += this.samples[i] * this.samples[i];
    this._rms = Math.sqrt(energy / this.samples.length);
  }
  shoot() {
    if (!this._audible())
      return;
    const t = this.ctx.currentTime;
    if (t - this.lastShot < 0.025)
      return;
    this.lastShot = t;
    this._tone(1050, t, 0.065, 0.11, "square", this.sfx, 270);
    this._noise(t, 0.035, 0.085, 2400);
    this.counts.shots++;
  }
  explosion() {
    if (!this._audible())
      return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.38, 0.62, 620, "lowpass");
    this._noise(t, 0.15, 0.22, 1800, "bandpass");
    this._tone(115, t, 0.32, 0.52, "sine", this.sfx, 24);
    this.counts.explosions++;
  }
  pickup() {
    if (!this._audible())
      return;
    const t = this.ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => this._tone(f, t + i * 0.055, 0.18, 0.14, "triangle", this.sfx));
    this.counts.pickups++;
  }
  voice(kind = "radio") {
    if (!this._audible())
      return;
    const c = this.ctx;
    const t = c.currentTime;
    const low = kind === "danger" || kind === "hit";
    const victorious = kind === "win" || kind === "complete" || kind === "victory";
    const syllables = victorious ? 7 : low ? 5 : 6;
    this._noise(t, 0.065, 0.08, 2100, "bandpass");
    for (let i = 0;i < syllables; i++) {
      const start = t + 0.07 + i * 0.085;
      const length = 0.055 + this._random() * 0.035;
      const pitch = (low ? 115 : 180) + this._random() * 120 + (victorious ? i * 14 : 0);
      const formant = c.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.value = [740, 1250, 1800, 920, 2250, 1300][i % 6];
      formant.Q.value = 3.2;
      formant.connect(this.sfx);
      const envelope = this._tone(pitch, start, length, 0.3, "sawtooth", formant, pitch * (i % 2 ? 0.76 : 1.19));
      this._tone(pitch * 2.01, start, length * 0.8, 0.055, "triangle", formant, pitch * 1.9);
      setTimeout(() => {
        formant.disconnect();
        envelope.disconnect();
      }, Math.ceil((start + length - c.currentTime + 0.1) * 1000));
    }
    this._noise(t + syllables * 0.085 + 0.1, 0.04, 0.07, 1800, "bandpass");
    this.counts.voices++;
  }
  _audible() {
    return this.ctx && this.ctx.state === "running" && !this.paused && !this.stopped;
  }
  pause(value) {
    this.paused = !!value;
    if (!this.ctx)
      return;
    this.master.gain.setTargetAtTime(this.paused ? 0 : 0.78, this.ctx.currentTime, 0.025);
    if (!this.paused)
      this.nextBeat = this.ctx.currentTime + 0.06;
  }
  stop() {
    this.stopped = true;
    if (!this.ctx)
      return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
  }
  diagnostics() {
    return {
      supported: !!(globalThis.AudioContext || globalThis.webkitAudioContext),
      state: this.ctx?.state || "locked",
      sampleRate: this.ctx?.sampleRate || 0,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      paused: this.paused,
      stopped: this.stopped,
      rms: this._rms,
      ...this.counts
    };
  }
}

// network.js
var finite = (value, lo, hi, fallback = 0) => Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback;
var cleanPlayer = (player = {}) => ({
  x: finite(player.x, -1000, 1000),
  y: finite(player.y, -1e5, 1e5),
  progress: finite(player.progress, 0, 1e6),
  bank: finite(player.bank, -Math.PI, Math.PI),
  fire: !!player.fire,
  sector: Math.floor(finite(player.sector, 0, 100))
});

class NetworkSession {
  constructor() {
    this.active = !!globalThis.AIHub?.active;
    this.info = null;
    this.peers = new Map;
    this.room = "";
    this.started = false;
    this.ended = false;
    this.reported = false;
    this.sendClock = 0;
    this.progressClock = 0;
    this.score = 0;
    this.label = "";
    this.callbacks = {};
    this.channel = null;
    this.localId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.localName = "Pilot";
    this.lastPlayer = cleanPlayer();
    this.handlers = [];
    this.sent = 0;
    this.received = 0;
  }
  async init(callbacks = {}) {
    this.callbacks = callbacks;
    if (!this.active)
      return null;
    const hub = globalThis.AIHub;
    this.handlers.push(hub.on("start", (event) => {
      this.started = true;
      this.reported = false;
      this.ended = false;
      this.sendClock = 0.1;
      this.progressClock = 1;
      this.callbacks.onStart?.(event);
    }));
    this.handlers.push(hub.on("message", (data, from) => {
      if (this.ended || data?.kind !== "upstream-ghost" || !data.player || from === this.info?.me)
        return;
      const identity = this.info?.players?.find((p) => p.id === from);
      if (!identity)
        return;
      this.acceptGhost(from, data.player, data.score, identity.name, identity.color);
    }));
    this.handlers.push(hub.on("leave", (event) => {
      this.peers.delete(event.id);
      this.callbacks.onLeave?.(event);
    }));
    this.handlers.push(hub.on("time-up", (event) => {
      if (this.ended)
        return;
      this.callbacks.onTimeUp?.(event);
      if (!this.reported)
        this.result(this.score);
    }));
    this.handlers.push(hub.on("end", (event) => {
      this.ended = true;
      this.started = false;
      this.callbacks.onEnd?.(event);
    }));
    this.info = await hub.connect({ mode: "ghost", seats: [1, 4] });
    if (!this.info) {
      this.active = false;
      for (const off of this.handlers)
        off?.();
      this.handlers.length = 0;
      return null;
    }
    return this.info;
  }
  ready() {
    if (this.active && this.info && !this.didReady) {
      this.didReady = true;
      globalThis.AIHub.ready();
    }
  }
  acceptGhost(id, player, score, name, color) {
    const ghost = {
      id,
      ...cleanPlayer(player),
      score: Math.floor(finite(score, 0, 1e9)),
      name: String(name || "Pilot").slice(0, 24),
      color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#b7a2ff",
      seenAt: performance.now()
    };
    this.peers.set(id, ghost);
    this.received++;
    this.callbacks.onGhost?.(ghost, id);
  }
  update(dt, player, score = 0, label = "") {
    if (this.ended)
      return;
    this.score = Math.floor(finite(score, 0, 1e9));
    this.label = String(label).slice(0, 80);
    this.lastPlayer = cleanPlayer(player);
    this.sendClock += finite(dt, 0, 1);
    this.progressClock += finite(dt, 0, 1);
    if (this.active) {
      const hub = globalThis.AIHub;
      if (!this.started || hub.time() < 0 || this.reported)
        return;
      if (this.sendClock >= 0.1) {
        this.sendClock %= 0.1;
        if (hub.send({
          kind: "upstream-ghost",
          player: this.lastPlayer,
          score: this.score
        }, { reliable: false }))
          this.sent++;
      }
      if (this.progressClock >= 1) {
        this.progressClock %= 1;
        hub.progress({ score: this.score, label: this.label });
      }
      return;
    }
    if (this.channel && this.sendClock >= 0.1) {
      this.sendClock %= 0.1;
      this.broadcast("state");
      const now = performance.now();
      for (const [id, peer] of this.peers) {
        if (now - peer.seenAt > 6000) {
          this.peers.delete(id);
          this.callbacks.onLeave?.({ id, reason: "disconnected" });
        }
      }
    }
  }
  result(score = this.score, stats = {}) {
    if (this.reported || this.ended)
      return;
    this.reported = true;
    this.score = Math.floor(finite(score, 0, 1e9));
    if (this.active)
      globalThis.AIHub.result({ score: this.score, stats });
    else if (this.channel)
      this.broadcast("result");
  }
  joinRoom(code, name = "Pilot") {
    if (this.active)
      return false;
    if (!globalThis.BroadcastChannel)
      return false;
    this.leaveRoom();
    this.room = String(code || "RIVER").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16) || "RIVER";
    this.localName = String(name || "Pilot").trim().slice(0, 24) || "Pilot";
    this.reported = false;
    this.ended = false;
    this.channel = new BroadcastChannel(`upstream-uproar-room-${this.room}`);
    this.channel.onmessage = ({ data }) => {
      if (!data || data.id === this.localId || typeof data.id !== "string")
        return;
      if (data.kind === "leave") {
        this.peers.delete(data.id);
        this.callbacks.onLeave?.({ id: data.id, reason: "left" });
        return;
      }
      if (!["hello", "state", "result"].includes(data.kind) || !data.player)
        return;
      this.acceptGhost(data.id, data.player, data.score, data.name, "#b7a2ff");
      if (data.kind === "hello")
        this.broadcast("state");
    };
    this.broadcast("hello");
    return true;
  }
  broadcast(kind) {
    if (!this.channel || this.active)
      return;
    this.channel.postMessage({
      kind,
      id: this.localId,
      name: this.localName,
      player: this.lastPlayer,
      score: this.score
    });
    this.sent++;
  }
  leaveRoom() {
    if (this.channel) {
      this.broadcast("leave");
      this.channel.close();
    }
    this.channel = null;
    this.room = "";
    this.peers.clear();
  }
  dispose() {
    this.leaveRoom();
    for (const off of this.handlers)
      off?.();
    this.handlers.length = 0;
    this.ended = true;
  }
  diagnostics() {
    return {
      active: this.active,
      room: this.room,
      started: this.started,
      ended: this.ended,
      reported: this.reported,
      sent: this.sent,
      received: this.received,
      peers: this.peers.size
    };
  }
}

// credits.js
var CREDITS = { sourceInformation: { date: "2026-11-06 01:11:35", source: "River Raid (1982)", plan: "none", genre: "Arcade flight / scrolling shooter", perspective: "Overhead 3D with an angled orthographic camera", tech: "Three.js r180 (0.180.0), WebGPU with native WebGL fallback, Rapier 0.19.3, Gamepad API, Web Audio API, vanilla JavaScript and HTML/CSS; Bun bundling; AI Hub Session Protocol v1 client 1.4.0", artDirection: "Procedural cel-shaded low-poly scenery, ink outlines, warm sand, teal water, coral aircraft", animation: "Three.js AnimationMixer with native keyframe clips for propeller, thrust and airframe; procedural banking, rolls, rotors and particles", audio: "Code-synthesized surf/funk music, engines, cannon, explosions, pickups and Animalese-style radio gibberish; default music 10%", online: "AI Hub ghost competition for 1–4 players; same-device browser-local ghost rooms using BroadcastChannel; standalone local co-op for 1–2 players", testing: "Headless Chromium software WebGPU state checks, complete scripted mission, emulated standard gamepads including nonzero slots, mobile profile with injected multitouch, Web Audio analyser, file:// launch, two-tab ghost exchange, and official AI Hub harness with 2 and 4 players, latency, jitter, loss and host departure. WebGL fallback screenshots for visual review. No FPS targets.", research: "none; native model knowledge. Supplied AI Hub integration files read directly; no internet search. Pinned runtime dependencies downloaded.", environment: "Codex CLI (headless); Linux / Ubuntu on WSL2", model: "OpenAI, gpt-6.1-sol, reasoning effort ultra", usage: "added on import" }, testingFeedback: ["20 game issues caught and fixed across scripted tests, visual checks and code review; test-fixture mistakes and the headless GPU limitation are excluded.", "4 critical issues: bundled startup name collision, zero-fuel respawn recovery, controllers in nonzero browser slots, and shared-keyboard co-op Enter handling. All fixed.", "The complete scripted mission: both bridges, nine fuel passes, both boss attack phases and a successful exit, with actual Rapier collision events.", "Headless WebGPU pixel readback failed with an invalid external Instance error and provided no useful visual evidence. State checks and WebGL fallback screenshots were useful."], engineFeedback: ["Three.js procedural geometry, toon materials and native AnimationMixer made a coherent cel-shaded river and animated aircraft straightforward.", "MeshToonMaterial did not support the guessed flatShading option; removed it. Headless software WebGPU lost its device during pixel readback; used state checks and the native WebGL backend for visual inspection.", "The deterministic river and mission simulation, Rapier sensor contacts, fuel/checkpoint systems and shared controller-first menu/input layer.", "Keeping fixed-step physics, scrolling world coordinates, animation, multiple input methods and Hub round timing consistent.", "none", "Automatic recovery from a lost WebGPU device while preserving the scene and allowing a clean fallback backend."], promptFeedback: ["The concrete source and controller-first philosophy gave the game a clear mechanical and visual target.", "The no-internet-research rule coexists with required online integration documentation; the supplied Hub files were treated as implementation specifications.", "Delivering a complete mission, accessible input methods, procedural audiovisuals and verified multiplayer in one shareable HTML.", "Separate required platform integration from optional features and explicitly distinguish local co-op, browser-local rooms and Internet multiplayer."], aiHub: { name: "Upstream Uproar", tagline: "Low flight. High mischief.", description: "Skim a winding cel-shaded river, top up on fuel, and blast two bridge blockades before facing the Ironwake. Fly solo, bring a local wingmate, or chase live ghosts in AI Hub.", type: "Game", genre: "Shooter", source: "River Raid (1982)", series: "", players: "1–4", controls: "WASD / left stick steer and throttle; Space / R2 or RT fire; Shift / R1 or RB roll; Q / Circle or B pulse; Esc / Options pause. Mouse steering and assisted touch flight.", tags: ["3d", "arcade", "top-down", "vehicles", "co-op", "boss fights"] } };

// main.js
var $ = (id) => document.getElementById(id);
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
var lerp = (a, b, t) => a + (b - a) * t;
var padNumber = (n) => Math.floor(n).toString().padStart(6, "0");
var escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var DEFAULTS = Object.freeze({
  speed: 16,
  steering: 13,
  fireRate: 7,
  fuelDrain: 0.92,
  enemyRate: 1,
  damage: 1,
  timeScale: 1
});
var tuning = { ...DEFAULTS };
var settings = {
  music: 0.1,
  sfx: 0.7,
  glyphs: "playstation",
  shake: true,
  assist: false
};
try {
  Object.assign(settings, JSON.parse(localStorage.getItem("upstream-settings") || "{}"));
} catch {}
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
var best = 0;
try {
  best = +localStorage.getItem("upstream-best") || 0;
} catch {}
var audio = new AudioSystem;
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
var network = new NetworkSession;
var keys = new Set;
var previousPads = new Map;
var ghostMeshes = new Map;
var renderer;
var scene;
var camera;
var world;
var physics;
var eventQueue;
var titleFormation = [];
var state = "loading";
var previousMenu = "title";
var lastInput = performance.now();
var lastFrame = 0;
var accumulator = 0;
var visualTime = 0;
var titleProgress = 250;
var players = [];
var entities = [];
var bullets = [];
var enemyBullets = [];
var colliders = new Map;
var nextId = 1;
var progress = 0;
var score = 0;
var fuel2 = 100;
var hull = 4;
var lives = 3;
var pulses = 3;
var combo = 1;
var comboClock = 0;
var kills = 0;
var bridges = 0;
var refuels = 0;
var elapsed = 0;
var checkpoint = 0;
var bossDefeated = false;
var attract = false;
var coop = false;
var godMode = false;
var autoPilot = false;
var shake = 0;
var flash = 0;
var sector = 0;
var shownSector = -1;
var reportClock = 0;
var bannerClock = 0;
var radioClock = 0;
var lastRadio = "";
var rolls = 0;
var shots = 0;
var deaths = 0;
var clearTimer = 0;
var hubStarted = false;
var hubEnded = false;
var inputMode = "keyboard";
var mouseX = null;
var mouseHeld = false;
var touchControl = null;
var pulseQueued = false;
var rollQueued = false;
var menuFocus = 0;
var menuCooldown = 0;
var resultVoiceUntil = 0;
var stats = {
  collisions: 0,
  damage: 0,
  fuelCollected: 0,
  bridgeKills: 0,
  bossPhases: 0,
  simSteps: 0
};
var diagnostics = {
  ready: false,
  renderer: "unknown",
  errors: [],
  bootMs: 0
};
var bootAt = performance.now();
var SECTORS = ["Sandbar Shuffle", "Needle Bend", "Ironwake Lock"];
var BOSS_AT = 2420;
var FINISH_AT = 2650;
var FEEDBACK_QUESTIONS = {
  testingFeedback: [
    "How many issues did testing catch?",
    "How many were critical or game breaking?",
    "Most helpful test?",
    "Least helpful test?"
  ],
  engineFeedback: [
    "What worked best?",
    "Where did you get stuck or guess wrong?",
    "Most important custom system?",
    "Hardest engine integration?",
    "Engine changes?",
    "One desired engine change?"
  ],
  promptFeedback: [
    "What worked best in the prompt?",
    "What was confusing?",
    "What was hardest?",
    "What would you change?"
  ]
};
var activePlay = () => state === "playing";
var hasPad = () => inputMode === "pad";
var glyph = (action) => {
  if (inputMode === "touch")
    return {
      fire: "AUTO",
      roll: "AUTO",
      pulse: "PULSE",
      pause: "MENU",
      accept: "TAP",
      back: "BACK",
      move: "DRAG"
    }[action];
  if (!hasPad())
    return {
      fire: "SPACE",
      roll: "SHIFT",
      pulse: "Q",
      pause: "ESC",
      accept: "ENTER",
      back: "ESC",
      move: "WASD"
    }[action];
  const ps = settings.glyphs !== "xbox";
  return {
    fire: ps ? "R2" : "RT",
    roll: ps ? "R1" : "RB",
    pulse: ps ? "○" : "B",
    pause: ps ? "OPTIONS" : "MENU",
    accept: ps ? "✕" : "A",
    back: ps ? "○" : "B",
    move: "L STICK"
  }[action];
};
var prompt = (action) => `<span data-glyph="${action}">${glyph(action)}</span>`;
var connectedPads = () => Array.from(navigator.getGamepads?.() || []).filter((pad) => pad && pad.connected !== false);
function saveSettings() {
  try {
    localStorage.setItem("upstream-settings", JSON.stringify(settings));
  } catch {}
}
function setInputMode(mode) {
  if (inputMode === mode)
    return;
  inputMode = mode;
  document.body.dataset.touch = String(mode === "touch");
  updatePrompts();
}
function updatePrompts() {
  $("rollPrompt").textContent = `${glyph("roll")} · ROLL`;
  $("pulsePrompt").textContent = `${glyph("pulse")} · PULSE`;
  $("pauseButton").textContent = `${glyph("pause")} Ⅱ`;
  $("corner").textContent = inputMode === "touch" ? "Drag anywhere · Auto fire · Tap PULSE to clear danger" : `${glyph("move")} · STEER     ${glyph("fire")} · FIRE     ${glyph("roll")} · ROLL     ${glyph("pulse")} · PULSE`;
  document.querySelectorAll("[data-glyph]").forEach((e) => e.textContent = glyph(e.dataset.glyph));
  document.querySelectorAll("[data-scroll-hint]").forEach((e) => e.textContent = inputMode === "touch" ? "Swipe to read more" : hasPad() ? "Right stick to read more" : "Page Up / Page Down or mouse wheel to read more");
}
function activity(mode) {
  lastInput = performance.now();
  if (mode)
    setInputMode(mode);
  if (attract) {
    goTitle();
    return true;
  }
  return false;
}
function menuControls() {
  return [
    ...$("menu").querySelectorAll("button:not(:disabled),input,select,[data-menu-scroll]")
  ];
}
function focusMenu(index) {
  const a = menuControls();
  if (!a.length)
    return;
  menuFocus = (index + a.length) % a.length;
  a[menuFocus].focus({ preventScroll: true });
  a[menuFocus].scrollIntoView({ block: "nearest" });
}
function action(text, id, small = "", primary = false) {
  return `<button class="action${primary ? " primary" : ""}" data-action="${id}"><span>${text}</span>${small ? `<small>${small}</small>` : '<span class="arrow" aria-hidden="true">↗</span>'}</button>`;
}
function backRow(extra = "") {
  return `<div class="back-row">${action("Back", "back", prompt("back"))}${extra}</div>`;
}
function panel(eyebrow, title, body, cls = "") {
  return `<section class="panel ${cls}"><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${body}</section>`;
}
function showMenu(which) {
  if (network.active && ["title", "results", "room"].includes(which))
    return;
  state = which;
  $("menu").classList.remove("hidden");
  $("hud").classList.toggle("hidden", which === "title" || which === "instructions" || which === "about" || which === "room" || which === "settings" && previousMenu === "title");
  $("bossHud").classList.add("hidden");
  $("banner").classList.add("hidden");
  $("attractTag").classList.add("hidden");
  document.body.classList.remove("in-flight");
  let content = "";
  if (which === "title")
    content = `<section class="panel title-panel"><div class="eyebrow">The river is calling. Collect.</div><h1>Upstream<br><span>Uproar</span></h1><div class="tagline">Low flight. High mischief.</div><div class="menu-list">${action("Fly the river", "solo", "1 pilot", true)}${action("Bring a wingmate", "coop", "2 pilots · local")}${action("Ghost challenge", "room", "AI Hub + browser rooms")}<div class="two-col">${action("Flight manual", "instructions")}${action("Settings", "settings")}${action("About / credits", "about")}${action("Fullscreen", "fullscreen")}</div></div><p class="footer-note">A river, a propeller, and absolutely no clearance.<br>Three sectors. Two bridges. One very stubborn boat.</p></section><div class="stamp">RIVER PATROL / NO. 82</div>`;
  if (which === "paused")
    content = panel("Propeller on hold", "Take a breather", `<div class="menu-list">${action("Back to the river", "resume", prompt("accept"), true)}${action("Settings", "settings")}${action("Flight manual", "instructions")}${action("Developer tools", "dev")}${action("About / credits", "about")}${!network.active ? action("Restart mission", "restart") + action("Return to title", "title") : ""}</div><p class="footer-note">${network.active ? "Hub round clock continues while your flight is paused." : "Your fuel is safe. The river can wait."}</p>`);
  if (which === "settings")
    content = panel("Make yourself comfortable", "Settings", `<div class="row"><label for="music">Music</label><input id="music" data-setting="music" type="range" min="0" max="100" value="${settings.music * 100}"><output>${Math.round(settings.music * 100)}%</output></div><div class="row"><label for="sfx">Effects &amp; radio</label><input id="sfx" data-setting="sfx" type="range" min="0" max="100" value="${settings.sfx * 100}"><output>${Math.round(settings.sfx * 100)}%</output></div><div class="row"><label for="glyphs">Controller prompts</label><select id="glyphs" data-setting="glyphs"><option value="playstation" ${settings.glyphs === "playstation" ? "selected" : ""}>PlayStation</option><option value="xbox" ${settings.glyphs === "xbox" ? "selected" : ""}>Xbox · A B X Y</option></select></div><div class="row"><label for="shakeSetting">Camera shake</label><input id="shakeSetting" data-setting="shake" type="checkbox" ${settings.shake ? "checked" : ""}></div><div class="row"><label for="assistSetting">Auto cannon / aim assist</label><input id="assistSetting" data-setting="assist" type="checkbox" ${settings.assist ? "checked" : ""}></div><p class="blurb">Music starts at 10%. Touch flight always uses auto fire, light aim assist, and safe-bank steering.</p>${backRow(action("Reset settings", "resetSettings"))}`);
  if (which === "instructions")
    content = panel("A small aircraft. A big attitude.", "Flight manual", `<div class="info-grid"><div class="info-card"><b>01 / Follow the current</b>${prompt("move")} steers. Up accelerates; down brakes. Stay between the inked banks.</div><div class="info-card"><b>02 / Make some room</b>Hold ${prompt("fire")} to fire. ${prompt("roll")} rolls through danger; ${prompt("pulse")} clears bullets and hits nearby enemies.</div><div class="info-card"><b>03 / Keep it topped up</b>Fly directly over green fuel barges. A full pass refills fuel and repairs one hull point. Brake to stay over them longer.</div><div class="info-card"><b>04 / Break the blockade</b>Destroy both bridges for checkpoints. Sink the Ironwake, then fly clear. Kills build a score chain.</div></div><p class="blurb">Mouse: move over the river to steer, hold left click to fire. Touch: drag anywhere to steer; cannon and emergency rolls are assisted. Tap the pulse button when danger closes in.</p><p class="blurb">Local co-op: pilot 1 uses WASD / Space / Shift / Q; pilot 2 uses arrows / Enter / Slash / Period. Two standard controllers also work. Hull, fuel, and score are shared.</p>${backRow()}`);
  if (which === "room")
    content = panel("Leave a purple wake", "Ghost challenge", `<div class="local-note"><b>Online with AI Hub</b><br>Launch this game in an AI Hub session for 1–4 networked pilots. Race your own mission with live, non-colliding ghosts and a shared score board.</div><div class="local-note"><b>Browser-local rooms</b><br>Open the game in another tab in this browser, enter the same room code, and fly. These rooms connect tabs on this device; they do not connect separate devices.</div><div class="row"><label for="roomCode">Room code</label><input id="roomCode" maxlength="16" type="text" value="${escapeHTML(network.room || "RIVER82")}" autocomplete="off"></div><p class="blurb" id="roomStatus">${network.room ? `Room ${escapeHTML(network.room)} · ${network.peers.size} other pilot(s)` : "Your ghost appears when the other pilot is in the same stretch of river."}</p><div class="menu-list">${action("Join room & fly", "joinRoom", "browser-local", true)}${network.room ? action("Leave room", "leaveRoom") : ""}</div>${backRow()}`);
  if (which === "dev") {
    const sliders = [
      ["speed", "Cruise speed", 6, 32, 0.5],
      ["steering", "Steering speed", 5, 25, 0.5],
      ["fireRate", "Cannon / second", 2, 16, 0.5],
      ["fuelDrain", "Fuel / second", 0, 3, 0.05],
      ["enemyRate", "Enemy fire rate", 0, 3, 0.1],
      ["damage", "Collision damage", 0, 4, 0.25],
      ["timeScale", "Time scale", 0.25, 3, 0.25]
    ];
    content = panel("Live mission tuning", "Developer tools", `<div class="scroll-body">${sliders.map(([k, label, min, max, step]) => `<div class="row"><label for="tune-${k}">${label}</label><input type="range" id="tune-${k}" data-tuning="${k}" min="${min}" max="${max}" step="${step}" value="${tuning[k]}"><output>${tuning[k]}</output></div>`).join("")}<div class="row"><label for="invul">Invulnerable / infinite fuel</label><input id="invul" type="checkbox" data-dev="god" ${godMode ? "checked" : ""}></div><div class="row"><label for="auto">Autopilot</label><input id="auto" type="checkbox" data-dev="auto" ${autoPilot ? "checked" : ""}></div><div class="back-row">${action("Repair & resupply", "resupply")}${action("Clear hostiles", "clearHostiles")}</div><div class="back-row">${action("Sector 1", "warp0")}${action("Sector 2", "warp1")}${action("Boss encounter", "warp2")}</div><div id="debugLine"></div></div>${backRow(action("Reset defaults", "resetTuning"))}`);
  }
  if (which === "about") {
    const s = CREDITS.sourceInformation;
    content = panel("Made for the long way upstream", "About / credits", `<p class="footer-note" data-scroll-hint></p><div class="scroll-body" tabindex="0" data-menu-scroll aria-label="Source information and credits"><p><b>Upstream Uproar</b> is an original arcade river-flight game inspired by the fuel pressure, river banks, and bridge busting of River Raid (1982). Original procedural art, writing, music, and sound.</p><h3>Source Information</h3>${Object.entries(s).map(([k, v]) => `<div class="credit-row"><b>${escapeHTML(k)}:</b> ${escapeHTML(v)}</div>`).join("")}${["testingFeedback", "engineFeedback", "promptFeedback"].map((key, i) => `<h3>${["Testing Feedback", "Engine Feedback", "Prompt Feedback"][i]}</h3>${CREDITS[key].map((t, j) => `<p class="feedback-item"><b>${FEEDBACK_QUESTIONS[key][j]}</b><br>${escapeHTML(t)}</p>`).join("")}`).join("")}<h3>Built with</h3><p>Three.js by the Three.js contributors · Rapier by Dimforge · Barlow typeface by Jeremy Tribby, with local system fallbacks · AI Hub Session Protocol v1 / client 1.4.0. No recorded audio or raster art assets.</p></div>${backRow()}`);
  }
  if (which === "results") {
    const won = bossDefeated && progress >= FINISH_AT;
    const rank = won ? score > 18000 ? "S" : score > 12000 ? "A" : "B" : "—";
    content = panel(won ? "The current is free again" : "The river keeps its secrets", won ? "Clear water ahead!" : "Wings down.", `<p class="blurb">${won ? "Finch: “That boat had it coming. Same time tomorrow?”" : "Finch: “We saved you a seat. And another propeller.”"}</p><div class="metrics"><div class="metric"><b>${padNumber(score)}</b><small>Score</small></div><div class="metric"><b>${rank}</b><small>Flight rank</small></div><div class="metric"><b>${Math.floor(elapsed / 60)}:${Math.floor(elapsed % 60).toString().padStart(2, "0")}</b><small>Flight time</small></div></div><p class="blurb">${kills} targets · ${bridges} bridges · ${refuels} fuel passes · ${rolls} rolls<br>Best score ${padNumber(best)}</p><div class="menu-list">${action("One more run", "restart", prompt("accept"), true)}${action("Return to title", "title")}</div>`);
  }
  $("menu").innerHTML = content;
  $("menu").querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => handleAction(el.dataset.action)));
  menuControls().forEach((el) => el.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse" && inputMode === "mouse")
      el.focus({ preventScroll: true });
  }));
  $("menu").querySelectorAll("[data-setting]").forEach((el) => el.addEventListener("input", () => {
    const k = el.dataset.setting;
    settings[k] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value / 100 : el.value;
    if (el.nextElementSibling?.tagName === "OUTPUT")
      el.nextElementSibling.textContent = Math.round(settings[k] * 100) + "%";
    audio.setMusic(settings.music);
    audio.setSfx(settings.sfx);
    saveSettings();
    updatePrompts();
  }));
  $("menu").querySelectorAll("[data-tuning]").forEach((el) => el.addEventListener("input", () => {
    tuning[el.dataset.tuning] = +el.value;
    el.nextElementSibling.textContent = el.value;
  }));
  $("menu").querySelectorAll("[data-dev]").forEach((el) => el.addEventListener("input", () => {
    if (el.dataset.dev === "god")
      godMode = el.checked;
    else
      autoPilot = el.checked;
  }));
  updatePrompts();
  focusMenu(0);
  audio.pause(true);
  updateHud();
}
function handleAction(id) {
  audio.unlock();
  lastInput = performance.now();
  if (id === "solo" || id === "coop") {
    resetRun({ coop: id === "coop" });
    return;
  }
  if (id === "resume") {
    resume();
    return;
  }
  if (id === "restart") {
    resetRun({ coop });
    return;
  }
  if (id === "title") {
    goTitle();
    return;
  }
  if (id === "fullscreen") {
    if (document.fullscreenElement)
      document.exitFullscreen?.();
    else
      document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  if (id === "back") {
    if (network.active && !["settings", "instructions", "about", "dev"].includes(state))
      return;
    showMenu(network.active || previousMenu === "paused" ? "paused" : "title");
    return;
  }
  if (["settings", "instructions", "about", "dev", "room"].includes(id)) {
    if (state === "title" || state === "paused")
      previousMenu = state;
    showMenu(id);
    return;
  }
  if (id === "joinRoom") {
    const code = $("roomCode").value;
    if (network.joinRoom(code)) {
      resetRun({});
      radio(`Ghost room ${network.room}. Keep an eye out for purple wings.`);
    } else
      $("roomStatus").textContent = "This browser does not support local rooms.";
    return;
  }
  if (id === "leaveRoom") {
    network.leaveRoom();
    showMenu("room");
    return;
  }
  if (id === "resetSettings") {
    Object.assign(settings, {
      music: 0.1,
      sfx: 0.7,
      glyphs: "playstation",
      shake: true,
      assist: false
    });
    saveSettings();
    audio.setMusic(0.1);
    audio.setSfx(0.7);
    showMenu("settings");
    return;
  }
  if (id === "resetTuning") {
    Object.assign(tuning, DEFAULTS);
    godMode = false;
    autoPilot = false;
    showMenu("dev");
    return;
  }
  if (id === "resupply") {
    hull = 4;
    fuel2 = 100;
    pulses = 3;
    lives = 3;
    banner("Fresh wings", "Fully repaired & refueled");
    updateHud();
    return;
  }
  if (id === "clearHostiles") {
    for (const e of [...entities])
      if (e.type !== "fuel")
        destroyEntity(e, true);
    for (const b of [...enemyBullets])
      removeObject(b, enemyBullets);
    updateHud();
    return;
  }
  if (id.startsWith("warp")) {
    const target = [0, 850, 2350][+id.slice(-1)];
    const wasCoop = coop;
    resetRun({ coop: wasCoop, at: target });
    godMode = true;
    state = "paused";
    previousMenu = "paused";
    showMenu("dev");
    return;
  }
}
function pause() {
  if (state !== "playing" || attract || hubEnded)
    return;
  keys.clear();
  mouseHeld = false;
  hideTouchStick();
  previousMenu = "paused";
  showMenu("paused");
}
function resume() {
  if (hubEnded)
    return;
  state = "playing";
  $("menu").classList.add("hidden");
  $("hud").classList.remove("hidden");
  document.body.classList.add("in-flight");
  audio.pause(false);
  keys.clear();
  lastInput = performance.now();
}
function goTitle() {
  if (network.active)
    return;
  attract = false;
  autoPilot = false;
  clearObjects();
  players.forEach((p) => scene.remove(p.mesh));
  players = [];
  state = "title";
  titleProgress = progress || 250;
  lastInput = performance.now();
  showMenu("title");
  $("ghosts").classList.add("hidden");
  hideTouchStick();
}
function banner(title, subtitle, duration = 3) {
  $("banner").querySelector("strong").textContent = title;
  $("banner").querySelector("small").textContent = subtitle;
  bannerClock = duration;
  $("banner").classList.remove("hidden");
}
function radio(text, voice = "radio") {
  if (text === lastRadio && radioClock > 0)
    return;
  lastRadio = text;
  radioClock = 6;
  $("radioText").textContent = text;
  audio.voice(voice);
}
function createPhysicsObject(obj, half) {
  const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(obj.x, 0, obj.z);
  obj.body = physics.createRigidBody(desc);
  const c = RAPIER.ColliderDesc.cuboid(...half).setSensor(true).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
  obj.collider = physics.createCollider(c, obj.body);
  colliders.set(obj.collider.handle, obj);
}
function disposeMesh(group) {
  group.traverse((o) => {
    if (o.geometry)
      o.geometry.dispose();
    if (o.userData?.ownedTexture) {
      o.userData.ownedTexture.dispose();
      o.material.dispose();
    }
    if (o.isMesh && o.material?.transparent && o.material.opacity === 0.6)
      o.material.dispose();
  });
}
function removeObject(obj, list) {
  if (obj.dead)
    return;
  obj.dead = true;
  if (obj.body) {
    colliders.delete(obj.collider.handle);
    physics.removeRigidBody(obj.body);
    obj.body = null;
  }
  if (obj.mesh) {
    scene.remove(obj.mesh);
    disposeMesh(obj.mesh);
  }
  if (list) {
    const i = list.indexOf(obj);
    if (i >= 0)
      list.splice(i, 1);
  }
}
function clearObjects() {
  for (const list of [entities, bullets, enemyBullets])
    for (const e of [...list])
      removeObject(e, list);
  for (const p of players)
    if (p.body) {
      colliders.delete(p.collider.handle);
      physics.removeRigidBody(p.body);
      p.body = null;
    }
  colliders.clear();
}
function spawnPlayer(index) {
  const made = makePlane(index ? 6543808 : 16740424);
  const x = river(progress).center + (coop ? index ? 2.7 : -2.7 : 0);
  const p = {
    id: nextId++,
    type: "player",
    index,
    mesh: made.group,
    mixer: made.mixer,
    x,
    z: coop ? 6 : 5,
    roll: 0,
    rollCooldown: 0,
    fireCooldown: 0,
    invul: 3,
    bank: 0,
    dead: false
  };
  p.mesh.position.set(x, 1.7, p.z);
  scene.add(p.mesh);
  createPhysicsObject(p, [0.65, 1, 0.9]);
  players.push(p);
  return p;
}
function buildMission() {
  const specs = [];
  for (let at = 90, i = 0;at < 2330; at += 27 + i % 4 * 6, i++) {
    const type = i % 7 === 3 ? "turret" : i % 4 === 1 ? "heli" : "boat";
    specs.push({ type, at, ratio: Math.sin(i * 2.4) * 0.68 });
    if (i > 10 && i % 4 === 0)
      specs.push({
        type: "boat",
        at: at + 10,
        ratio: -Math.sin(i * 2.4) * 0.65
      });
  }
  for (let i = 0, at = 175;at < 2300; at += 240, i++)
    specs.push({ type: "fuel", at, ratio: Math.sin(i * 1.7) * 0.4 });
  for (const at of [780, 1580])
    specs.push({ type: "bridge", at, ratio: 0 });
  specs.push({ type: "fuel", at: 2310, ratio: 0 }, { type: "boss", at: BOSS_AT, ratio: 0 });
  return specs.sort((a, b) => a.at - b.at).map((s) => ({
    id: nextId++,
    ...s,
    dead: false,
    active: false,
    x: river(s.at).center + river(s.at).width * s.ratio,
    z: 5 - (s.at - progress),
    hp: { boat: 3, heli: 2, turret: 5, fuel: 1, bridge: 26, boss: 190 }[s.type],
    maxHp: { boat: 3, heli: 2, turret: 5, fuel: 1, bridge: 26, boss: 190 }[s.type],
    cooldown: 1 + s.at % 5 * 0.2,
    age: 0
  }));
}
function resetRun(options = {}) {
  clearObjects();
  players.forEach((p) => {
    scene.remove(p.mesh);
    disposeMesh(p.mesh);
  });
  players = [];
  coop = !!options.coop;
  attract = !!options.attract;
  autoPilot = false;
  progress = options.at || 0;
  score = 0;
  fuel2 = 100;
  hull = 4;
  lives = 3;
  pulses = 3;
  combo = 1;
  comboClock = 0;
  kills = 0;
  bridges = progress >= 1600 ? 2 : progress >= 800 ? 1 : 0;
  refuels = 0;
  elapsed = 0;
  checkpoint = progress >= 1600 ? 1600 : progress >= 800 ? 800 : 0;
  bossDefeated = false;
  sector = 0;
  shownSector = -1;
  rolls = 0;
  shots = 0;
  deaths = 0;
  clearTimer = 0;
  stats = {
    collisions: 0,
    damage: 0,
    fuelCollected: 0,
    bridgeKills: 0,
    bossPhases: 0,
    simSteps: 0
  };
  entities = buildMission();
  entities = entities.filter((e) => e.at > progress - 8);
  spawnPlayer(0);
  if (coop)
    spawnPlayer(1);
  mouseX = null;
  mouseHeld = false;
  hideTouchStick();
  state = "playing";
  $("menu").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("bossHud").classList.add("hidden");
  $("attractTag").classList.toggle("hidden", !attract);
  document.body.classList.add("in-flight");
  audio.pause(false);
  keys.clear();
  pulseQueued = false;
  rollQueued = false;
  accumulator = 0;
  network.reported = false;
  banner(progress > 2300 ? "The Ironwake" : "Sector 01 · Sandbar Shuffle", progress > 2300 ? "Bust the boat. Free the current." : "Keep it low. Keep it moving.");
  radio("Keep your wings dry, hotshot. Green barges mean fuel.");
  updateHud();
}
function activateEntity(e) {
  e.active = true;
  e.mesh = makeEntity(e.type);
  scene.add(e.mesh);
  if (e.type === "fuel") {
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 80;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = "#102b35";
    ctx.fillRect(0, 0, 256, 80);
    ctx.strokeStyle = "#42d8bc";
    ctx.lineWidth = 7;
    ctx.strokeRect(3, 3, 250, 74);
    ctx.fillStyle = "#fff0cc";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FUEL +", 128, 54);
    const texture = new THREE2.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE2.SRGBColorSpace;
    const tag = new THREE2.Sprite(new THREE2.SpriteMaterial({ map: texture, depthTest: false }));
    tag.scale.set(3.5, 1.1, 1);
    tag.position.set(0, 2.8, 0);
    tag.userData.ownedTexture = texture;
    e.mesh.add(tag);
  }
  if (e.type === "bridge")
    e.mesh.scale.x = river(e.at).width / 10 + 0.2;
  const half = {
    boat: [0.9, 1, 1.5],
    heli: [0.9, 1, 1],
    fuel: [1.5, 1, 2.4],
    bridge: [river(e.at).width + 1, 1, 1.5],
    boss: [2.9, 1, 4],
    turret: [0.9, 1, 0.9]
  }[e.type];
  createPhysicsObject(e, half);
  if (e.type === "boss") {
    banner("Ironwake", "Make a little room upstream", 3);
    radio("That is one very stubborn boat. Hit it between the volleys!", "danger");
    stats.bossPhases = 1;
  }
  if (e.type === "bridge") {
    radio("Bridge blockade ahead. Cannon first. Questions later.");
  }
}
function fire(p) {
  if (p.fireCooldown > 0)
    return;
  p.fireCooldown = 1 / tuning.fireRate;
  shots++;
  audio.shoot();
  const assist = settings.assist || inputMode === "touch";
  let vx = 0;
  if (assist) {
    const target = entities.filter((e) => e.active && e.type !== "fuel" && e.z < p.z - 3 && e.z > p.z - 55).sort((a, b2) => Math.abs(a.x - p.x) - Math.abs(b2.x - p.x))[0];
    if (target)
      vx = clamp((target.x - p.x) * 2, -10, 10);
  }
  const b = {
    id: nextId++,
    type: "bullet",
    x: p.x,
    z: p.z - 2.2,
    vx,
    vz: -65,
    life: 1.3,
    owner: p.index,
    mesh: makeEntity("bullet"),
    dead: false
  };
  scene.add(b.mesh);
  b.mesh.position.set(b.x, 1.4, b.z);
  createPhysicsObject(b, [0.23, 1, 0.65]);
  bullets.push(b);
}
function enemyFire(e) {
  if (tuning.enemyRate <= 0)
    return;
  const target = players[Math.floor(e.age) % players.length] || players[0];
  if (!target)
    return;
  const speed = e.type === "boss" ? 16 : 12;
  const dx = target.x - e.x, dz = target.z - e.z, len = Math.hypot(dx, dz) || 1;
  const spread = e.type === "boss" ? e.hp < e.maxHp * 0.5 ? [-0.38, -0.19, 0, 0.19, 0.38] : [-0.24, 0, 0.24] : [0];
  for (const angle of spread) {
    const a = Math.atan2(dx, dz) + angle, b = {
      id: nextId++,
      type: "enemyBullet",
      x: e.x,
      z: e.z + 1.8,
      vx: Math.sin(a) * speed,
      vz: Math.cos(a) * speed,
      life: 7,
      mesh: makeEntity("enemyBullet"),
      dead: false
    };
    scene.add(b.mesh);
    createPhysicsObject(b, [0.26, 1, 0.26]);
    enemyBullets.push(b);
  }
}
function roll(p) {
  if (p.rollCooldown > 0 || p.roll > 0)
    return;
  p.roll = 0.7;
  p.rollCooldown = 4.5;
  p.invul = Math.max(p.invul, 0.8);
  rolls++;
  audio.voice("roll");
}
function pulse() {
  if (pulses <= 0)
    return;
  pulses--;
  shake = 0.3;
  flash = 0.12;
  audio.explosion();
  for (const p of players) {
    world.makeBurst(p.x, p.z, 6353866);
    p.invul = Math.max(p.invul, 1.5);
  }
  for (const b of [...enemyBullets])
    removeObject(b, enemyBullets);
  for (const e of [...entities])
    if (e.active && e.type !== "fuel" && e.z > -48 && e.z < 18) {
      e.hp -= e.type === "boss" ? 32 : 12;
      if (e.hp <= 0)
        destroyEntity(e);
      else
        world.makeBurst(e.x, e.z);
    }
  banner("River pulse", `${pulses} remaining · bullets cleared`, 1);
  updateHud();
}
function destroyEntity(e, silent = false) {
  if (e.dead)
    return;
  const { type, x: ex, z: ez } = e;
  removeObject(e, entities);
  if (!silent) {
    const points = { boat: 150, heli: 200, turret: 250, bridge: 1000, boss: 5000 }[type] || 0;
    score += points * combo;
    kills++;
    comboClock = 4;
    combo = clamp(combo + 1, 1, 5);
    world.makeBurst(ex, ez, type === "boss" ? 16740424 : 16766055);
    audio.explosion();
    shake = Math.max(shake, type === "boss" ? 0.65 : 0.12);
  }
  if (type === "bridge") {
    bridges++;
    stats.bridgeKills++;
    checkpoint = e.at + 20;
    fuel2 = clamp(fuel2 + 25, 0, 100);
    pulses = Math.min(3, pulses + 1);
    banner("Bridge busted!", `Checkpoint ${bridges} / 2 · fuel +25 · pulse +1`);
    radio("One less toll to pay. Nice flying!", "win");
  }
  if (type === "boss") {
    bossDefeated = true;
    score += 2000;
    banner("Ironwake sunk!", "The river is yours. Fly clear!", 4);
    radio("Clear water ahead! Bring those wings home.", "victory");
    $("bossHud").classList.add("hidden");
    for (const b of [...enemyBullets])
      removeObject(b, enemyBullets);
    fuel2 = Math.max(fuel2, 45);
  }
}
function takeDamage(p, amount = tuning.damage, reason = "hit") {
  if (p.invul > 0 || godMode || attract || autoPilot || amount <= 0)
    return;
  stats.damage += amount;
  hull -= amount;
  p.invul = 1.8;
  combo = 1;
  comboClock = 0;
  shake = 0.4;
  flash = 0.35;
  audio.explosion();
  world.makeBurst(p.x, p.z, 16740424);
  radio(reason === "bank" ? "Easy on the banks! Keep your wingtips inside." : "That scratched the paint. Roll through the next one!", "hit");
  if (hull <= 0) {
    lives--;
    deaths++;
    if (lives <= 0) {
      finishRun(false);
      return;
    }
    respawn();
  }
}
function respawn() {
  const keptScore = score, keptKills = kills, keptStats = { ...stats }, keptTime = elapsed, keptLives = lives, keptDeaths = deaths, keptRefuels = refuels;
  const checkpointAt = checkpoint;
  resetRun({ coop, at: checkpointAt });
  score = keptScore;
  kills = keptKills;
  stats = keptStats;
  elapsed = keptTime;
  lives = keptLives;
  deaths = keptDeaths;
  refuels = keptRefuels;
  fuel2 = 85;
  banner("Fresh propeller", `${lives} aircraft left · checkpoint restored`);
  radio("Back in the air. We are not done yet.");
}
function finishRun(won) {
  if (state !== "playing")
    return;
  if (attract) {
    clearTimer = 4;
    state = "attractEnd";
    banner(won ? "Clear water!" : "Another run?", "Autopilot loops shortly", 4);
    return;
  }
  best = Math.max(best, score);
  try {
    localStorage.setItem("upstream-best", String(best));
  } catch {}
  if (network.active) {
    network.result(score, {
      Targets: kills,
      Bridges: bridges,
      "Fuel passes": refuels
    });
    state = "hubresult";
    banner(won ? "Mission complete" : "Wings down", `Score ${padNumber(score)} · waiting for the other pilots`, 360);
    audio.pause(true);
    return;
  }
  network.result(score, { Targets: kills });
  showMenu("results");
  audio.setMusic(0);
  audio.pause(false);
  audio.voice(won ? "victory" : "hit");
  resultVoiceUntil = performance.now() + 900;
}
function inputFor(p) {
  let x = 0, y = 0, fireHeld = false, rollPressed = false, pulsePressed = false;
  const pad = connectedPads()[p.index];
  if (pad?.connected !== false && pad) {
    x = Math.abs(pad.axes[0] || 0) > 0.13 ? pad.axes[0] : 0;
    y = Math.abs(pad.axes[1] || 0) > 0.13 ? pad.axes[1] : 0;
    fireHeld = !!(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
    rollPressed = !!pad.buttons[5]?.pressed;
    pulsePressed = !!pad.buttons[1]?.pressed;
  }
  if (p.index === 0) {
    x += (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    y += (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
    if (!coop) {
      x += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
      y += (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
    }
    fireHeld ||= keys.has("Space") || keys.has("KeyJ") || mouseHeld || settings.assist || inputMode === "touch";
    rollPressed ||= keys.has("ShiftLeft") || keys.has("ShiftRight") || rollQueued;
    pulsePressed ||= pulseQueued;
    if (inputMode === "touch" && touchControl) {
      x = touchControl.x;
      y = touchControl.y;
    }
    if (inputMode === "mouse" && mouseX !== null && Math.abs(x) < 0.1)
      x = clamp((mouseX - p.x) * 3, -1, 1);
  } else {
    x += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
    y += (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0);
    fireHeld ||= keys.has("Enter");
    rollPressed ||= keys.has("Slash");
    pulsePressed ||= keys.has("Period");
  }
  if (attract || autoPilot) {
    const upcomingFuel = entities.find((e) => e.type === "fuel" && e.at - progress > -2 && e.at - progress < 45);
    const target = entities.filter((e) => e.active && e.type !== "fuel" && e.z < 0 && e.z > -50).sort((a, b) => b.z - a.z)[0];
    const safe = river(progress + 6).center;
    const aim = upcomingFuel && fuel2 < 92 ? upcomingFuel.x : target ? target.x : safe;
    x = clamp((aim - p.x) * 2, -1, 1);
    y = -0.1;
    fireHeld = true;
    rollPressed = Math.floor(elapsed * 2) % 14 === 0;
    pulsePressed = pulses > 0 && enemyBullets.length > 10;
  }
  return {
    x: clamp(x, -1, 1),
    y: clamp(y, -1, 1),
    fire: fireHeld,
    roll: rollPressed,
    pulse: pulsePressed
  };
}
function simulate(dt) {
  if (state !== "playing")
    return;
  stats.simSteps++;
  elapsed += dt;
  comboClock -= dt;
  if (comboClock <= 0)
    combo = 1;
  const inputs = players.map(inputFor);
  const throttle = inputs[0]?.y || 0;
  let speed = tuning.speed * (1 - throttle * 0.42);
  const boss2 = entities.find((e) => e.type === "boss");
  if (boss2 && !bossDefeated && progress >= BOSS_AT - 22)
    speed = 0;
  const blockade = entities.find((e) => e.type === "bridge" && !e.dead && progress >= e.at - 12);
  if (blockade)
    speed = 0;
  progress = Math.min(FINISH_AT + 2, progress + speed * dt);
  fuel2 -= tuning.fuelDrain * dt * (speed > 0 ? 1 + Math.max(0, -throttle) * 0.25 : 0.65);
  if (godMode || attract || autoPilot)
    fuel2 = Math.max(fuel2, 70);
  fuel2 = clamp(fuel2, 0, 100);
  if (fuel2 < 25 && fuel2 > 24.9)
    radio("Fuel is getting shy. Overfly a green barge.", "danger");
  if (fuel2 <= 0) {
    fuel2 = 0;
    takeDamage(players[0], 1, "fuel");
  }
  for (let i = 0;i < players.length; i++) {
    const p = players[i], input = inputs[i];
    p.invul = Math.max(0, p.invul - dt);
    p.rollCooldown = Math.max(0, p.rollCooldown - dt);
    p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    p.x += input.x * tuning.steering * dt;
    p.z = lerp(p.z, 5 + input.y * 2.2, dt * 4);
    const r = river(progress - p.z + 5), margin = 0.75;
    if (inputMode === "touch" || attract || autoPilot) {
      p.x = clamp(p.x, r.center - r.width + margin, r.center + r.width - margin);
      if (inputMode === "touch" && enemyBullets.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < 2.6))
        roll(p);
    }
    if (Math.abs(p.x - r.center) > r.width - 0.3)
      takeDamage(p, tuning.damage, "bank");
    p.x = clamp(p.x, r.center - r.width - 1, r.center + r.width + 1);
    p.bank = lerp(p.bank, -input.x * 0.4, dt * 7);
    if (input.roll)
      roll(p);
    if (input.pulse && pulses > 0 && !p.pulseLatch)
      pulse();
    p.pulseLatch = input.pulse;
    if (input.fire)
      fire(p);
    p.roll = Math.max(0, p.roll - dt);
    p.mesh.rotation.z = p.bank + (p.roll > 0 ? (1 - p.roll / 0.7) * Math.PI * 2 : 0);
    p.mesh.position.set(p.x, 1.7 + Math.sin(visualTime * 3 + i) * 0.04, p.z);
    p.mesh.visible = p.invul <= 0 || Math.floor(elapsed * 12) % 2 === 0 || p.roll > 0;
    p.body?.setNextKinematicTranslation({ x: p.x, y: 0, z: p.z });
    p.mixer.update(dt);
  }
  pulseQueued = false;
  rollQueued = false;
  let shouldRefuel = false;
  for (const e of [...entities]) {
    e.z = 5 - (e.at - progress);
    if (e.z > 20) {
      removeObject(e, entities);
      continue;
    }
    if (!e.active && e.z > -76)
      activateEntity(e);
    if (!e.active)
      continue;
    e.age += dt;
    if (e.type === "heli")
      e.x = river(e.at).center + Math.sin(e.age * 0.9 + e.at) * Math.min(6, river(e.at).width - 2);
    if (e.type === "boat")
      e.x = river(e.at).center + river(e.at).width * e.ratio + Math.sin(e.age * 0.65 + e.at) * 0.7;
    if (e.type === "boss") {
      e.x = river(e.at).center + Math.sin(e.age * 0.6) * 3.7;
      if (e.hp < e.maxHp * 0.5 && stats.bossPhases === 1) {
        stats.bossPhases = 2;
        radio("Its engines are hot. Watch the wide volleys!", "danger");
        banner("Ironwake enraged", "Keep rolling. Keep firing.", 2);
      }
    }
    e.mesh.position.set(e.x, e.type === "heli" ? 1.7 : 0.25, e.z);
    if (e.type === "heli")
      e.mesh.rotation.z = Math.cos(e.age * 0.9 + e.at) * -0.1;
    if (e.mesh.userData.rotor)
      e.mesh.userData.rotor.rotation.y += dt * 28;
    if (e.mesh.userData.ring)
      e.mesh.userData.ring.rotation.z += dt;
    if (e.mesh.userData.radar)
      e.mesh.userData.radar.rotation.y += dt;
    e.body.setNextKinematicTranslation({ x: e.x, y: 0, z: e.z });
    if (["boat", "heli", "turret", "boss"].includes(e.type) && e.z > -58 && e.z < 4) {
      e.cooldown -= dt * tuning.enemyRate;
      if (e.cooldown <= 0) {
        enemyFire(e);
        e.cooldown = e.type === "boss" ? e.hp < e.maxHp * 0.5 ? 0.75 : 1.15 : e.type === "turret" ? 1.9 : 3.2;
      }
    }
    if (e.type === "fuel" && players.some((p) => Math.abs(p.x - e.x) < 1.9 && Math.abs(p.z - e.z) < 3.2)) {
      shouldRefuel = true;
      const amount = Math.min(100 - fuel2, 62 * dt);
      fuel2 += amount;
      stats.fuelCollected += amount;
      if (!e.collected) {
        e.collected = true;
        refuels++;
        hull = Math.min(4, hull + 1);
        score += 350;
        audio.pickup();
        radio("Topped up. Wings patched. Cause some trouble!", "pickup");
      }
    }
  }
  for (const b of [...bullets, ...enemyBullets]) {
    b.x += b.vx * dt;
    b.z += b.vz * dt + (b.type === "enemyBullet" ? speed * dt : 0);
    b.life -= dt;
    b.mesh.position.set(b.x, 1.4, b.z);
    b.mesh.rotation.y = b.type === "bullet" ? Math.atan2(-b.vx, 65) : visualTime * 3;
    b.body?.setNextKinematicTranslation({ x: b.x, y: 0, z: b.z });
    if (b.life <= 0 || b.z < -85 || b.z > 23 || Math.abs(b.x) > 40)
      removeObject(b, b.type === "bullet" ? bullets : enemyBullets);
  }
  physics.timestep = dt;
  physics.step(eventQueue);
  const contacts = [];
  eventQueue.drainCollisionEvents((a, b, started) => {
    if (started)
      contacts.push([colliders.get(a), colliders.get(b)]);
  });
  for (let [a, b] of contacts) {
    if (!a || !b || a.dead || b.dead)
      continue;
    stats.collisions++;
    if (b.type === "bullet" || b.type === "player") {
      [a, b] = [b, a];
    }
    if (a.type === "bullet" && b.type !== "player" && b.type !== "bullet" && b.type !== "enemyBullet" && b.type !== "fuel") {
      removeObject(a, bullets);
      b.hp -= 2;
      if (b.hp <= 0)
        destroyEntity(b);
      else if (b.type === "bridge" || b.type === "boss")
        world.makeBurst(a.x, a.z, 16766055);
    } else if (a.type === "player" && b.type !== "bullet" && b.type !== "player" && b.type !== "fuel") {
      takeDamage(a);
      if (b.type === "enemyBullet")
        removeObject(b, enemyBullets);
      else if (!["bridge", "boss"].includes(b.type))
        destroyEntity(b);
    }
  }
  if (shouldRefuel)
    $("fuelFill").style.background = "#fff0cc";
  else
    $("fuelFill").style.background = fuel2 < 25 ? "#ff7048" : "#42d8bc";
  sector = progress < 820 ? 0 : progress < 1640 ? 1 : 2;
  if (sector !== shownSector) {
    shownSector = sector;
    if (sector > 0) {
      banner(SECTORS[sector], `Sector 0${sector + 1} · ${sector === 1 ? "Keep your wingtips inside" : "Last stop: river lockdown"}`);
      radio(sector === 1 ? "Needle Bend. Small river, big attitude." : "Ironwake territory. Give them a proper hello.");
    }
  }
  if (progress >= FINISH_AT && bossDefeated && bridges >= 2)
    finishRun(true);
}
function updateHud() {
  $("score").textContent = padNumber(score);
  $("best").textContent = "BEST " + padNumber(best);
  $("sectorLabel").textContent = `Sector 0${sector + 1} / 03`;
  $("sectorName").textContent = SECTORS[sector];
  $("routeFill").style.width = clamp(progress / FINISH_AT * 100, 0, 100) + "%";
  $("hull").textContent = "◆".repeat(Math.ceil(Math.max(0, hull))) + "◇".repeat(Math.max(0, 4 - Math.ceil(Math.max(0, hull))));
  $("lives").textContent = "×" + lives;
  $("fuelNumber").textContent = Math.ceil(fuel2) + "%";
  $("fuelFill").style.width = fuel2 + "%";
  $("combo").textContent = combo > 1 ? "CHAIN ×" + combo : "";
  const p = players[0];
  $("rollStatus").textContent = p && p.rollCooldown > 0 ? p.rollCooldown.toFixed(1) + "s" : "READY";
  $("pulseStatus").textContent = pulses ? "● ".repeat(pulses).trim() : "EMPTY";
  $("touchPulse").classList.toggle("hidden", pulses <= 0);
  const boss2 = entities.find((e) => e.type === "boss" && e.active);
  $("bossHud").classList.toggle("hidden", !boss2 || state !== "playing");
  if (boss2)
    $("bossFill").style.width = Math.max(0, boss2.hp / boss2.maxHp * 100) + "%";
  if (state === "dev")
    $("debugLine").textContent = `${diagnostics.renderer} · Rapier ${RAPIER.version()}
Distance ${Math.floor(progress)} / ${FINISH_AT} · ${entities.filter((e) => e.active).length} hostiles · ${stats.collisions} contacts
Seeded mission · ${stats.simSteps} simulation steps · no recorded assets`;
}
function updateGhosts(dt) {
  for (const [id, g] of network.peers) {
    let mesh2 = ghostMeshes.get(id);
    if (!mesh2) {
      mesh2 = makeGhost(g.color);
      scene.add(mesh2);
      ghostMeshes.set(id, mesh2);
    }
    const delta = g.progress - progress;
    mesh2.visible = activePlay() && Math.abs(delta) < 65 && g.sector === sector;
    mesh2.position.set(g.x, 2.1, 5 - delta);
    mesh2.rotation.z = g.bank;
    mesh2.userData.mixer.update(dt);
  }
  for (const [id, mesh2] of ghostMeshes)
    if (!network.peers.has(id)) {
      scene.remove(mesh2);
      disposeMesh(mesh2);
      ghostMeshes.delete(id);
    }
  const visible = network.peers.size > 0 && state === "playing";
  $("ghosts").classList.toggle("hidden", !visible);
  if (visible)
    $("ghosts").textContent = [
      network.active ? "LIVE RIVER GHOSTS" : "BROWSER-LOCAL GHOSTS",
      ...[...network.peers.values()].map((g) => `${g.name}   ${padNumber(g.score)}   ${Math.abs(g.progress - progress) < 65 ? "IN SIGHT" : Math.round((g.progress - progress) / 16) + "s"}`)
    ].join(`
`);
}
function pollGamepads(dt) {
  menuCooldown = Math.max(0, menuCooldown - dt);
  const pads = connectedPads();
  for (const pad of pads) {
    if (!pad)
      continue;
    const prior = previousPads.get(pad.index) || [];
    const pressed = pad.buttons.map((b) => b.pressed);
    const edge = (i) => pressed[i] && !prior[i];
    const active = pressed.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.25);
    if (active) {
      if (activity("pad")) {
        previousPads.set(pad.index, pressed);
        return;
      }
    }
    if (edge(9) && !pressed[8]) {
      if (state === "playing")
        pause();
      else if (state === "paused")
        resume();
    } else if (!["playing", "hubwait", "hubresult", "hubended", "attractEnd"].includes(state)) {
      const down = edge(13) || pad.axes[1] > 0.55 && menuCooldown <= 0, up = edge(12) || pad.axes[1] < -0.55 && menuCooldown <= 0;
      if (down || up) {
        focusMenu(menuFocus + (down ? 1 : -1));
        menuCooldown = 0.2;
      }
      if (edge(0))
        document.activeElement?.click();
      if (edge(1) && state !== "title")
        handleAction("back");
      const dir = edge(15) ? 1 : edge(14) ? -1 : Math.abs(pad.axes[0]) > 0.6 && menuCooldown <= 0 ? Math.sign(pad.axes[0]) : 0;
      if (dir) {
        adjustFocused(dir);
        menuCooldown = 0.15;
      }
      if (Math.abs(pad.axes[3] || 0) > 0.2)
        scrollMenu(pad.axes[3] * dt * 550);
    }
    previousPads.set(pad.index, pressed);
  }
}
function adjustFocused(dir) {
  const e = document.activeElement;
  if (e?.type === "range") {
    e.value = clamp(+e.value + dir * (+e.step || 1), +e.min, +e.max);
    e.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  if (e?.tagName === "SELECT") {
    e.selectedIndex = (e.selectedIndex + dir + e.options.length) % e.options.length;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
}
function scrollMenu(amount) {
  const scroller = $("menu").querySelector(".scroll-body") || $("menu");
  scroller.scrollTop += amount;
}
function hideTouchStick() {
  touchControl = null;
  $("touchRing").style.display = "none";
  $("touchDot").style.display = "none";
}
var raycaster = new THREE2.Raycaster;
var aimPlane = new THREE2.Plane(new THREE2.Vector3(0, 1, 0), -1.7);
var aimPoint = new THREE2.Vector3;
function bindInput() {
  $("menu").addEventListener("focusin", (e) => {
    const index = menuControls().indexOf(e.target);
    if (index >= 0)
      menuFocus = index;
  });
  document.addEventListener("keydown", (e) => {
    if (activity("keyboard")) {
      e.preventDefault();
      return;
    }
    audio.unlock();
    if (e.code === "Escape") {
      if (state === "playing")
        pause();
      else if (state === "paused")
        resume();
      else if (["settings", "instructions", "about", "dev"].includes(state) || !network.active && ["room", "results"].includes(state))
        handleAction("back");
      e.preventDefault();
      return;
    }
    if (state === "playing") {
      if ([
        "Space",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
      ].includes(e.code))
        e.preventDefault();
      keys.add(e.code);
      if (e.code === "KeyQ" && !e.repeat)
        pulseQueued = true;
      return;
    }
    if (e.target.tagName === "INPUT" && e.target.type === "text")
      return;
    if (["hubwait", "hubresult", "hubended", "loading", "attractEnd"].includes(state))
      return;
    if ((e.code === "PageUp" || e.code === "PageDown") && $("menu").querySelector(".scroll-body")) {
      scrollMenu((e.code === "PageDown" ? 1 : -1) * $("menu").querySelector(".scroll-body").clientHeight * 0.8);
      e.preventDefault();
      return;
    }
    if (e.code === "ArrowDown" || e.code === "ArrowUp") {
      focusMenu(menuFocus + (e.code === "ArrowDown" ? 1 : -1));
      e.preventDefault();
    }
    if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && adjustFocused(e.code === "ArrowRight" ? 1 : -1))
      e.preventDefault();
    if (e.code === "Enter" && !e.repeat && e.target.tagName !== "BUTTON")
      document.activeElement?.click();
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    mouseHeld = false;
    if (!network.active && state === "playing" && !attract)
      pause();
  });
  document.addEventListener("pointerdown", (e) => {
    if (activity(e.pointerType === "touch" ? "touch" : "mouse")) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    audio.unlock();
  }, true);
  $("game").addEventListener("pointerdown", (e) => {
    if (state !== "playing")
      return;
    audio.unlock();
    if (e.pointerType === "touch") {
      if (touchControl && touchControl.id !== e.pointerId)
        return;
      touchControl = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: 0,
        y: 0
      };
      $("touchRing").style.cssText = `display:block;left:${e.clientX}px;top:${e.clientY}px`;
      $("touchDot").style.cssText = `display:block;left:${e.clientX}px;top:${e.clientY}px`;
    } else if (e.button === 0)
      mouseHeld = true;
    $("game").setPointerCapture(e.pointerId);
  });
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") {
      if (touchControl?.id === e.pointerId) {
        touchControl.x = clamp((e.clientX - touchControl.startX) / 65, -1, 1);
        touchControl.y = clamp((e.clientY - touchControl.startY) / 65, -1, 1);
        $("touchDot").style.left = touchControl.startX + touchControl.x * 42 + "px";
        $("touchDot").style.top = touchControl.startY + touchControl.y * 42 + "px";
      }
      return;
    }
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) {
      activity("mouse");
      const control = e.target.closest?.("button,input,select,[data-menu-scroll]");
      if (control && $("menu").contains(control))
        control.focus({ preventScroll: true });
    }
    if (!camera)
      return;
    raycaster.setFromCamera(new THREE2.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
    if (raycaster.ray.intersectPlane(aimPlane, aimPoint))
      mouseX = aimPoint.x;
  });
  document.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch")
      mouseHeld = false;
    if (touchControl?.id === e.pointerId)
      hideTouchStick();
  });
  document.addEventListener("pointercancel", (e) => {
    if (e.pointerType !== "touch")
      mouseHeld = false;
    if (touchControl?.id === e.pointerId)
      hideTouchStick();
  });
  $("pauseButton").addEventListener("click", pause);
  $("touchMenu").addEventListener("click", () => {
    if (state === "playing")
      pause();
    else if (state === "paused")
      resume();
    else if (state !== "title")
      handleAction("back");
  });
  $("touchPulse").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    pulseQueued = true;
  });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !network.active && state === "playing" && !attract)
      pause();
  });
  window.addEventListener("gamepadconnected", () => setInputMode("pad"));
  if (matchMedia("(pointer:coarse)").matches)
    setInputMode("touch");
}
function resize() {
  if (!renderer || !camera)
    return;
  renderer.setSize(innerWidth, innerHeight, false);
  const aspect = innerWidth / innerHeight, halfWidth = aspect < 1 ? 18 : Math.max(24, aspect * 18), halfHeight = halfWidth / aspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
function renderFrame(now) {
  const raw = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  visualTime += raw;
  pollGamepads(raw);
  if (resultVoiceUntil && (now >= resultVoiceUntil || state !== "results")) {
    resultVoiceUntil = 0;
    audio.setMusic(settings.music);
    if (state !== "playing")
      audio.pause(true);
  }
  if (state === "hubwait" && hubStarted && globalThis.AIHub.time() >= 0) {
    resetRun({});
  }
  if (state === "title" && now - lastInput >= 1e4 && !network.active)
    resetRun({ attract: true });
  if (state === "attractEnd") {
    clearTimer -= raw;
    if (clearTimer <= 0)
      resetRun({ attract: true });
  }
  if (state === "playing") {
    accumulator += raw * tuning.timeScale;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps < 20 && state === "playing") {
      simulate(1 / 60);
      accumulator -= 1 / 60;
      steps++;
    }
  } else
    accumulator = 0;
  if (state === "title" || ["settings", "about", "instructions", "room"].includes(state) && previousMenu === "title") {
    titleProgress += raw * 5;
    world.render(titleProgress, visualTime);
  } else
    world.render(progress, visualTime);
  world.updateEffects(raw);
  updateGhosts(raw);
  bannerClock -= raw;
  if (bannerClock <= 0)
    $("banner").classList.add("hidden");
  radioClock -= raw;
  shake = Math.max(0, shake - raw);
  flash = Math.max(0, flash - raw * 1.5);
  $("flash").style.opacity = flash * 0.35;
  const riverCenter = river(state === "title" ? titleProgress : progress + 18).center;
  const menuScene = state === "title" || ["settings", "instructions", "about", "room"].includes(state) && previousMenu === "title";
  for (let i = 0;i < titleFormation.length; i++) {
    const p = titleFormation[i];
    p.group.visible = menuScene;
    p.group.position.set(river(titleProgress).center + 3 + (i === 1 ? -5 : i === 2 ? 5 : 0), i ? 3 : 4, -8 + (i ? 6 : 0));
    p.group.rotation.z = Math.sin(visualTime * 0.8 + i) * 0.12 + (i === 0 ? -0.12 : 0);
    p.mixer.update(raw);
  }
  const targetX = menuScene ? -10 : riverCenter * 0.4;
  camera.position.set(targetX + (settings.shake ? Math.sin(visualTime * 89) * shake * 0.4 : 0), 48, 29);
  camera.lookAt(targetX, 0, menuScene ? -16 : -10.5);
  audio.update(raw, {
    playing: state === "playing" && !attract,
    speed: 1 - (inputForSafe()?.y || 0) * 0.42,
    danger: fuel2 < 25 || !!entities.find((e) => e.type === "boss" && e.active),
    sector
  });
  if (state === "playing" || state === "hubresult") {
    const p = players[0];
    if (p)
      network.update(raw, {
        x: p.x,
        y: p.z,
        progress,
        bank: p.bank,
        fire: p.fireCooldown > 0,
        sector
      }, score, `${SECTORS[sector]} · ${Math.floor(progress / FINISH_AT * 100)}%`);
  }
  reportClock += raw;
  if (reportClock > 0.08) {
    updateHud();
    reportClock = 0;
  }
  renderer.render(scene, camera);
}
function inputForSafe() {
  return players[0] ? { y: keys.has("KeyW") ? -1 : keys.has("KeyS") ? 1 : 0 } : null;
}
async function boot() {
  try {
    await RAPIER.init();
    physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
    eventQueue = new RAPIER.EventQueue(true);
    renderer = new THREE2.WebGPURenderer({
      canvas: $("game"),
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      forceWebGL: new URLSearchParams(location.search).get("webgl") === "1"
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, network.active ? 1 : 1.7));
    await renderer.init();
    diagnostics.renderer = renderer.backend?.isWebGPUBackend ? "WebGPU" : "WebGL fallback";
    scene = new THREE2.Scene;
    scene.background = new THREE2.Color(7906673);
    scene.fog = new THREE2.Fog(10467714, 90, 180);
    scene.add(new THREE2.HemisphereLight(16774095, 4155765, 2.4));
    const sun = new THREE2.DirectionalLight(16771251, 3.2);
    sun.position.set(-25, 60, 20);
    scene.add(sun);
    camera = new THREE2.OrthographicCamera(-30, 30, 20, -20, 0.1, 250);
    camera.position.set(0, 48, 29);
    camera.lookAt(0, 0, -16);
    world = new WorldView(scene);
    for (let i = 0;i < 3; i++) {
      const p = makePlane(i ? 6543808 : 16740424);
      p.group.scale.setScalar(i ? 1 : 1.5);
      scene.add(p.group);
      titleFormation.push(p);
    }
    resize();
    world.render(titleProgress, 0);
    bindInput();
    await network.init({
      onStart: () => {
        hubStarted = true;
      },
      onTimeUp: () => {
        network.result(score, {
          Targets: kills,
          Bridges: bridges,
          "Fuel passes": refuels
        });
        state = "hubresult";
        audio.pause(true);
      },
      onEnd: () => {
        hubEnded = true;
        state = "hubended";
        keys.clear();
        mouseHeld = false;
        audio.stop();
        $("menu").classList.add("hidden");
        $("hud").classList.add("hidden");
        $("bossHud").classList.add("hidden");
        $("banner").classList.add("hidden");
      }
    });
    $("loading").classList.add("hidden");
    diagnostics.ready = true;
    diagnostics.bootMs = performance.now() - bootAt;
    if (network.active) {
      state = "hubwait";
      $("menu").classList.add("hidden");
      $("hud").classList.add("hidden");
      network.ready();
    } else
      showMenu("title");
    renderer.setAnimationLoop(renderFrame);
  } catch (error) {
    diagnostics.errors.push(String(error.stack || error));
    $("loadingMessage").textContent = "Flight could not start: " + error.message + " · Use a browser with WebGPU, and allow the CDN dependencies.";
    document.querySelector(".spinner")?.remove();
    globalThis.AIHub?.active && globalThis.AIHub.fail(error.message);
    console.error(error);
  }
}
window.__UPROAR__ = {
  get state() {
    return state;
  },
  get diagnostics() {
    return {
      ...diagnostics,
      physics: RAPIER.version?.(),
      network: network.diagnostics(),
      audio: audio.diagnostics()
    };
  },
  snapshot() {
    return {
      state,
      attract,
      coop,
      progress,
      score,
      fuel: fuel2,
      hull,
      lives,
      pulses,
      combo,
      kills,
      bridges,
      refuels,
      elapsed,
      checkpoint,
      bossDefeated,
      sector,
      rolls,
      shots,
      deaths,
      stats: { ...stats },
      players: players.map((p) => ({
        x: p.x,
        z: p.z,
        invul: p.invul,
        roll: p.roll,
        rollCooldown: p.rollCooldown
      })),
      entities: entities.filter((e) => e.active).map((e) => ({
        id: e.id,
        type: e.type,
        x: e.x,
        z: e.z,
        hp: e.hp,
        at: e.at
      })),
      bullets: bullets.length,
      enemyBullets: enemyBullets.length,
      tuning: { ...tuning },
      settings: { ...settings }
    };
  }
};
if (new URLSearchParams(location.search).get("test") === "1")
  Object.assign(window.__UPROAR__, {
    start: (options) => resetRun(options),
    step: (seconds) => {
      for (let i = 0;i < Math.ceil(seconds * 60) && state === "playing"; i++) {
        simulate(1 / 60);
        world.updateEffects(1 / 60);
      }
      updateHud();
      return window.__UPROAR__.snapshot();
    },
    autopilot: (v) => {
      autoPilot = v;
    },
    god: (v) => {
      godMode = v;
    },
    setFuel: (v) => {
      fuel2 = clamp(v, 0, 100);
    },
    setHull: (v) => {
      hull = v;
    },
    setLives: (v) => {
      lives = v;
    },
    setPlayer: (x, z = 5) => {
      players[0].x = x;
      players[0].z = z;
      players[0].invul = 0;
    },
    hurt: () => takeDamage(players[0]),
    fire: () => fire(players[0]),
    roll: () => roll(players[0]),
    pulse,
    warp: (at) => resetRun({ at }),
    setTuning: (k, v) => {
      if (k in tuning)
        tuning[k] = v;
    },
    setAttractIdle: () => {
      lastInput = performance.now() - 10001;
    },
    radio,
    river,
    finish: () => {
      bossDefeated = true;
      progress = FINISH_AT;
      finishRun(true);
    },
    network,
    audio
  });
window.addEventListener("error", (e) => diagnostics.errors.push(e.message));
window.addEventListener("unhandledrejection", (e) => diagnostics.errors.push(String(e.reason)));
boot();
