// Procedural low-poly models. Everything is built in code so there are no asset downloads.
// Ships face -Z (forward). Materials and geometry are cached and shared.
import * as THREE from 'three';

const cache = new Map();
function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, flatShading: true, ...o });
const glow = (color, intensity = 2.2) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.3 });

export const MAT = {
  silver: () => memo('m-silver', () => std(0xd9e0ea, { metalness: 0.5, roughness: 0.35 })),
  blue: () => memo('m-blue', () => std(0x2f6fe0, { metalness: 0.4 })),
  dark: () => memo('m-dark', () => std(0x2a2e38, { metalness: 0.3 })),
  canopy: () => memo('m-canopy', () => std(0x7ff3ff, { metalness: 0.9, roughness: 0.05, emissive: 0x1a6070, emissiveIntensity: 0.7 })),
  cyanGlow: () => memo('m-cyan', () => glow(0x66e8ff, 2.6)),
  redGlow: () => memo('m-red', () => glow(0xff3b3b, 2.4)),
  greenGlow: () => memo('m-green', () => glow(0x7dff8a, 2.4)),
  goldGlow: () => memo('m-gold', () => glow(0xffd54a, 2.4)),
  orangeGlow: () => memo('m-orange', () => glow(0xff8a2a, 2.4)),
  trenchStrip: () => memo('m-trench', () => glow(0xff7a2a, 0.9)),
  enemyRed: () => memo('m-erd', () => std(0x8c2e2e, { metalness: 0.25 })),
  enemyRedLight: () => memo('m-erl', () => std(0xc24a3a, { metalness: 0.2 })),
  olive: () => memo('m-olive', () => std(0x5f6e3c)),
  oliveDark: () => memo('m-oliveD', () => std(0x3c4628)),
  tankPurple: () => memo('m-tank', () => std(0x4b3b6e, { metalness: 0.35 })),
  tankDark: () => memo('m-tankD', () => std(0x26203a, { metalness: 0.4 })),
  landmaster: () => memo('m-lm', () => std(0x6fbf6a, { metalness: 0.25 })),
  landmasterAccent: () => memo('m-lmA', () => std(0xffd25a, { metalness: 0.3, emissive: 0x3a2a00, emissiveIntensity: 0.5 })),
  treads: () => memo('m-treads', () => std(0x1d1d1d, { roughness: 0.9 })),
  gunmetal: () => memo('m-gun', () => std(0x5d6880, { metalness: 0.5, roughness: 0.45 })),
  steel: () => memo('m-steel', () => std(0x6e7689, { metalness: 0.4 })),
  concrete: () => memo('m-conc', () => std(0x6a6f7a, { roughness: 0.9 })),
  shieldPlate: () => memo('m-shield', () => new THREE.MeshStandardMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.45, emissive: 0x1f7f9a, emissiveIntensity: 1.2, roughness: 0.2, depthWrite: false })),
  rock: () => memo('m-rock', () => std(0x7a6a5a, { roughness: 0.95 })),
  rockDark: () => memo('m-rockD', () => std(0x4a4038, { roughness: 0.95 })),
  wingman: { rook: () => memo('m-rook', () => std(0x3fbf5a)), tig: () => memo('m-tig', () => std(0xf2c14e)) },
  pickupEnergy: () => memo('m-pe', () => glow(0x44ff88, 2.8)),
  pickupBomb: () => memo('m-pb', () => glow(0xffcc33, 2.8)),
  pickupLaser: () => memo('m-pl', () => glow(0x44aaff, 2.8)),
  bulletPlayer: () => memo('m-bp', () => glow(0x66ddff, 3.2)),
  bulletHoming: () => memo('m-bh', () => glow(0xffe066, 3.2)),
  bulletEnemy: () => memo('m-be', () => glow(0xff4d4d, 3.0)),
  bulletWing: () => memo('m-bw', () => glow(0x9dff7a, 3.0)),
  shell: () => memo('m-shell', () => glow(0xffb040, 3.0)),
};

const geo = (key, make) => memo('g-' + key, make);

// Tapered delta-wing outline in the XY plane, extruded into a thin slab on the XZ plane.
function wingGeometry(points, depth = 0.25) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  g.rotateX(-Math.PI / 2);   // shape-y becomes -z (forward), extrude becomes y (thickness)
  return g;
}

const ARWING_OUTLINE = [[0, 5], [1.1, 1], [7, -4.5], [6, -6], [1.5, -4], [0, -6], [-1.5, -4], [-6, -6], [-7, -4.5], [-1.1, 1]];
const DRONE_OUTLINE = [[0, 3.6], [0.9, 0.5], [5.2, -3.2], [3.6, -4.2], [1.0, -2.8], [0, -4.4], [-1.0, -2.8], [-3.6, -4.2], [-5.2, -3.2], [-0.9, 0.5]];

function markShadow(obj) {
  obj.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return obj;
}

function mesh(g, m, pos, rot, scale) {
  const x = new THREE.Mesh(g, m);
  if (pos) x.position.set(...pos);
  if (rot) x.rotation.set(...rot);
  if (scale) x.scale.set(...scale);
  return x;
}

// Radial glow sprite texture, shared by engine flares and pickups.
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
export function glowSprite(color, size) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

export function makeArwing(livery = 'player') {
  const g = new THREE.Group();
  const hull = livery === 'player' ? MAT.silver() : MAT.wingman[livery]();
  const accent = livery === 'player' ? MAT.blue() : MAT.dark();
  g.add(mesh(geo('arw-wing', () => wingGeometry(ARWING_OUTLINE)), hull));
  g.add(mesh(geo('arw-body', () => new THREE.ConeGeometry(0.9, 5, 6).rotateX(-Math.PI / 2)), hull, [0, 0.1, -0.5]));
  g.add(mesh(geo('arw-tail', () => new THREE.BoxGeometry(0.4, 2.2, 2.2)), accent, [0, 0.9, 1.6], [0, 0, 0]));
  g.add(mesh(geo('arw-fin', () => new THREE.BoxGeometry(0.15, 2.0, 1.8)), accent, [6.0, 0.6, -5.2]));
  g.add(mesh(geo('arw-fin', () => new THREE.BoxGeometry(0.15, 2.0, 1.8)), accent, [-6.0, 0.6, -5.2]));
  g.add(mesh(geo('arw-canopy', () => new THREE.SphereGeometry(0.85, 12, 8)), MAT.canopy(), [0, 0.7, -0.9], null, [0.9, 0.5, 1.5]));
  const eng = [-1.3, 1.3].map((x) => mesh(geo('arw-eng', () => new THREE.CylinderGeometry(0.45, 0.4, 1.6, 8).rotateX(Math.PI / 2)), MAT.dark(), [x, 0, 1.5]));
  eng.forEach((e) => g.add(e));
  const flares = [-1.3, 1.3].map((x) => {
    const s = glowSprite(0x66ccff, 3.2);
    s.position.set(x, 0, 2.6);
    g.add(s);
    return s;
  });
  g.userData.flares = flares;
  g.userData.hull = hull;
  return markShadow(g);
}

export function makeLandmaster() {
  const g = new THREE.Group();
  g.add(mesh(geo('lm-hull', () => new THREE.BoxGeometry(5, 1.8, 7)), MAT.landmaster(), [0, 2.2, 0]));
  g.add(mesh(geo('lm-nose', () => new THREE.BoxGeometry(3.6, 1.2, 1.8)), MAT.landmasterAccent(), [0, 2.0, -4.2]));
  g.add(mesh(geo('lm-turret', () => new THREE.CylinderGeometry(1.5, 1.7, 1.2, 10)), MAT.landmaster(), [0, 3.7, -0.4]));
  g.add(mesh(geo('lm-barrel', () => new THREE.CylinderGeometry(0.28, 0.32, 4.2, 8).rotateX(Math.PI / 2)), MAT.dark(), [0, 3.8, -3.2]));
  for (const x of [-2.9, 2.9]) {
    g.add(mesh(geo('lm-tread', () => new THREE.BoxGeometry(1.1, 1.6, 7.6)), MAT.treads(), [x, 0.9, 0]));
  }
  const s = glowSprite(0xffb040, 2.2);
  s.position.set(0, 2.4, 3.8);
  g.add(s);
  g.userData.flares = [s];
  g.userData.barrel = g.children[3];
  return markShadow(g);
}

export function makeDrone() {
  const g = new THREE.Group();
  g.add(mesh(geo('dr-wing', () => wingGeometry(DRONE_OUTLINE, 0.2)), MAT.enemyRed()));
  g.add(mesh(geo('dr-body', () => new THREE.OctahedronGeometry(1.4).scale(0.9, 0.7, 1.9)), MAT.enemyRedLight()));
  g.add(mesh(geo('dr-eye', () => new THREE.SphereGeometry(0.45, 8, 6)), MAT.redGlow(), [0, 0.5, -1.0]));
  return markShadow(g);
}

export function makeWalker() {
  const g = new THREE.Group();
  g.add(mesh(geo('wk-body', () => new THREE.BoxGeometry(3, 2, 3)), MAT.olive(), [0, 4.2, 0]));
  g.add(mesh(geo('wk-head', () => new THREE.BoxGeometry(1.6, 1.2, 1.6)), MAT.oliveDark(), [0, 5.8, -0.6]));
  g.add(mesh(geo('wk-eye', () => new THREE.BoxGeometry(1.1, 0.35, 0.2)), MAT.redGlow(), [0, 5.9, -1.5]));
  for (const [x, z] of [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]]) {
    g.add(mesh(geo('wk-leg', () => new THREE.BoxGeometry(0.7, 4.4, 0.7)), MAT.oliveDark(), [x, 2.2, z], [x * 0.05, 0, z * 0.05]));
  }
  return markShadow(g);
}

export function makeTank() {
  const g = new THREE.Group();
  g.add(mesh(geo('tk-hull', () => new THREE.BoxGeometry(4.6, 1.6, 6.4)), MAT.tankPurple(), [0, 1.9, 0]));
  g.add(mesh(geo('tk-turret', () => new THREE.CylinderGeometry(1.3, 1.5, 1.1, 10)), MAT.tankPurple(), [0, 3.3, -0.3]));
  g.add(mesh(geo('tk-barrel', () => new THREE.CylinderGeometry(0.26, 0.3, 3.8, 8).rotateX(Math.PI / 2)), MAT.tankDark(), [0, 3.4, -2.9]));
  for (const x of [-2.6, 2.6]) g.add(mesh(geo('tk-tread', () => new THREE.BoxGeometry(1, 1.4, 6.8)), MAT.treads(), [x, 0.8, 0]));
  return markShadow(g);
}

export function makeTurret() {
  const g = new THREE.Group();
  g.add(mesh(geo('tu-base', () => new THREE.CylinderGeometry(1.6, 2, 2, 8)), MAT.oliveDark(), [0, 1, 0]));
  const head = new THREE.Group();
  head.position.set(0, 2.6, 0);
  head.add(mesh(geo('tu-head', () => new THREE.BoxGeometry(2.4, 1.2, 2.4)), MAT.enemyRedLight()));
  head.add(mesh(geo('tu-barrel', () => new THREE.BoxGeometry(0.4, 0.4, 3)), MAT.dark(), [0, 0, -2.2]));
  g.add(head);
  g.userData.head = head;
  return markShadow(g);
}

export function makePillar() {
  const g = new THREE.Group();
  g.add(mesh(geo('pl-col', () => new THREE.BoxGeometry(6, 40, 6)), MAT.concrete(), [0, 20, 0]));
  g.add(mesh(geo('pl-band', () => new THREE.BoxGeometry(6.4, 1, 6.4)), MAT.orangeGlow(), [0, 30, 0]));
  const head = new THREE.Group();
  head.position.set(0, 41.5, 0);
  head.add(mesh(geo('pl-head', () => new THREE.BoxGeometry(4.2, 2.2, 4.2)), MAT.gunmetal()));
  head.add(mesh(geo('pl-barrel', () => new THREE.BoxGeometry(0.6, 0.6, 4)), MAT.dark(), [0, 0, -2.8]));
  g.add(head);
  g.userData.head = head;
  return markShadow(g);
}

export function makeAsteroid(radius, rng) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.setLength(radius * (0.72 + rng() * 0.45));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const shade = 0.6 + rng() * 0.5;
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8a7866).multiplyScalar(shade), roughness: 0.95, flatShading: true });
  return markShadow(new THREE.Mesh(g, m));
}

export function makeGatekeeper() {
  const g = new THREE.Group();
  g.add(mesh(geo('gk-hull', () => new THREE.BoxGeometry(13, 4.6, 9)), MAT.tankDark(), [0, 0, 0]));
  g.add(mesh(geo('gk-nose', () => new THREE.ConeGeometry(3.8, 9, 6).rotateX(-Math.PI / 2)), MAT.tankPurple(), [0, 0, -9]));
  g.add(mesh(geo('gk-wing', () => wingGeometry([[-19, -2], [19, -2], [14, 6], [-14, 6]], 0.6)), MAT.gunmetal(), [0, 0.3, 0]));
  for (const x of [-8, 8]) g.add(mesh(geo('gk-pod', () => new THREE.CylinderGeometry(1.8, 1.8, 6, 8).rotateZ(Math.PI / 2)), MAT.steel(), [x, -1.2, 1]));
  const eye = mesh(geo('gk-eye', () => new THREE.SphereGeometry(2.2, 14, 10)), glow(0xff8a2a, 2.4), [0, 0.2, -6.2]);
  g.add(eye);
  g.userData.eye = eye;
  return markShadow(g);
}

export function makeDreadnought() {
  const g = new THREE.Group();
  g.add(mesh(geo('dn-hull', () => new THREE.BoxGeometry(16, 6, 34)), MAT.gunmetal()));
  // Front face (+Z, toward the player) carries the shield plate and core; see game.js.
  g.add(mesh(geo('dn-prow', () => new THREE.BoxGeometry(12, 4.4, 4)), MAT.gunmetal(), [0, 0, 19]));
  g.add(mesh(geo('dn-wing', () => wingGeometry([[-30, -10], [30, -10], [18, 12], [-18, 12]], 1.2)), MAT.steel(), [0, 1.5, 0]));
  for (const x of [-9, 9]) g.add(mesh(geo('dn-pod', () => new THREE.CylinderGeometry(2.6, 2.6, 16, 10).rotateX(Math.PI / 2)), MAT.steel(), [x, -2.5, 0]));
  return markShadow(g);
}

export function makeCore() {
  const core = mesh(geo('dn-core', () => new THREE.IcosahedronGeometry(4.2, 2)), MAT.orangeGlow());
  return core;
}

export function makeShieldPlate() {
  return mesh(geo('dn-plate', () => new THREE.CylinderGeometry(7.5, 7.5, 0.9, 6).rotateX(Math.PI / 2)), MAT.shieldPlate());
}

export function makeBossTurret() {
  const g = new THREE.Group();
  g.add(mesh(geo('bt-base', () => new THREE.CylinderGeometry(2.2, 2.6, 1.6, 8)), MAT.dark()));
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0);
  head.add(mesh(geo('bt-head', () => new THREE.BoxGeometry(3, 1.6, 3)), MAT.enemyRedLight()));
  head.add(mesh(geo('bt-barrel', () => new THREE.BoxGeometry(0.6, 0.6, 4.2)), MAT.dark(), [0, 0, -3]));
  g.add(head);
  g.userData.head = head;
  return markShadow(g);
}

export function makeRing() {
  const g = new THREE.Group();
  g.add(mesh(geo('ring', () => new THREE.TorusGeometry(9, 0.6, 8, 28)), MAT.goldGlow()));
  g.add(mesh(geo('ring-in', () => new THREE.TorusGeometry(9, 0.12, 6, 28)), MAT.goldGlow(), [0, 0, 0.4]));
  const halo = glowSprite(0xffd54a, 26);
  g.add(halo);
  g.userData.halo = halo;
  return g;
}

export function makePickup(kind) {
  const g = new THREE.Group();
  const m = kind === 'energy' ? MAT.pickupEnergy() : kind === 'bomb' ? MAT.pickupBomb() : MAT.pickupLaser();
  g.add(mesh(geo('pk-' + kind, () => new THREE.OctahedronGeometry(1.8)), m));
  const halo = glowSprite(kind === 'energy' ? 0x44ff88 : kind === 'bomb' ? 0xffcc33 : 0x44aaff, 9);
  g.add(halo);
  return g;
}

export function makeBolt(kind) {
  const m = kind === 'player' ? MAT.bulletPlayer() : kind === 'homing' ? MAT.bulletHoming()
    : kind === 'wing' ? MAT.bulletWing() : kind === 'shell' ? MAT.shell() : MAT.bulletEnemy();
  if (kind === 'enemy') return new THREE.Mesh(geo('bolt-enemy', () => new THREE.SphereGeometry(0.9, 8, 6)), m);
  if (kind === 'shell') return new THREE.Mesh(geo('bolt-shell', () => new THREE.SphereGeometry(1.2, 8, 6)), m);
  if (kind === 'homing') return new THREE.Mesh(geo('bolt-homing', () => new THREE.BoxGeometry(0.5, 0.5, 4.5)), m);
  return new THREE.Mesh(geo('bolt-' + kind, () => new THREE.BoxGeometry(0.4, 0.4, 6)), m);
}

export function makeBeam(width, height) {
  return new THREE.Mesh(geo(`beam-${width}-${height}`, () => new THREE.BoxGeometry(width, height, 1)), MAT.redGlow());
}

export function makeEmitter() {
  return markShadow(mesh(geo('emitter', () => new THREE.CylinderGeometry(1.5, 2, 4, 8)), MAT.dark(), [0, 0, 0]));
}
