// Stage environments: terrain and decor, the fortress trench, and deep space.
import * as THREE from 'three';
import { MAT } from './models.js';

export const PLAINS_FLOOR = -18;
export const FORTRESS_FLOOR = -30;

// Analytic terrain height, shared by the mesh, decor placement and ground units.
export function plainsHeight(x, z) {
  return PLAINS_FLOOR
    + 1.6 * Math.sin(x * 0.024 + z * 0.011)
    + 1.2 * Math.cos(z * 0.021 - x * 0.017)
    + 0.6 * Math.sin(x * 0.07) * Math.cos(z * 0.05);
}

export function groundHeight(env, x, z) {
  if (env.kind === 'plains') return plainsHeight(x, z);
  if (env.kind === 'fortress') return FORTRESS_FLOOR;
  return -1e4;
}

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a4150';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#7fb4ff';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 125, 125);
  g.strokeStyle = '#2a303d';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Builds decor for a stage into `root`. `length` is the distance the stage covers.
export function buildWorld(env, root, length, rng) {
  if (env.kind === 'plains') buildPlains(env, root, length, rng);
  else if (env.kind === 'fortress') buildFortress(root, length);
  else buildSpace(root, length, rng);
}

function buildPlains(env, root, length, rng) {
  const L = length + 400;
  const zc = 100 - length / 2;
  const geo = new THREE.PlaneGeometry(1400, L, 140, Math.ceil(L / 10));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grassA = new THREE.Color(0x5d8a3a);
  const grassB = new THREE.Color(0x8c7a3e);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + zc;
    const h = plainsHeight(x, z);
    pos.setY(i, h);
    c.copy(grassA).lerp(grassB, Math.min(1, Math.max(0, 0.5 + Math.sin(x * 0.012) * Math.cos(z * 0.009))));
    c.multiplyScalar(0.85 + 0.15 * Math.sin(x * 0.4 + z * 0.3));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  ground.position.z = zc;
  ground.receiveShadow = true;
  root.add(ground);

  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 8, 6), MAT.oliveDark(), 900);
  const trunk = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (45 + rng() * 210);
    const z = 120 - rng() * (length + 120);
    const s = 0.7 + rng() * 0.9;
    trunk.position.set(x, plainsHeight(x, z) + 4 * s, z);
    trunk.scale.set(s, s * (0.8 + rng() * 0.6), s);
    trunk.rotation.y = rng() * Math.PI;
    trunk.updateMatrix();
    trees.setMatrixAt(i, trunk.matrix);
  }
  trees.castShadow = true;
  trees.receiveShadow = true;
  root.add(trees);

  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(2.2, 0), MAT.rock(), 220);
  for (let i = 0; i < 220; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (30 + rng() * 150);
    const z = 120 - rng() * (length + 120);
    const s = 0.6 + rng() * 1.8;
    trunk.position.set(x, plainsHeight(x, z) + 0.5 * s, z);
    trunk.scale.setScalar(s);
    trunk.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    trunk.updateMatrix();
    rocks.setMatrixAt(i, trunk.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  root.add(rocks);

  const peaks = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), MAT.rockDark(), 60);
  for (let i = 0; i < 60; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (700 + rng() * 500);
    const z = 200 - rng() * (length + 400);
    const r = 90 + rng() * 120;
    const h = 220 + rng() * 260;
    trunk.position.set(x, PLAINS_FLOOR + h / 2 - 20, z);
    trunk.scale.set(r, h, r);
    trunk.rotation.set(0, rng() * Math.PI, 0);
    trunk.updateMatrix();
    peaks.setMatrixAt(i, trunk.matrix);
  }
  root.add(peaks);
}

function buildFortress(root, length) {
  const L = length + 400;
  const zc = 100 - length / 2;
  const floorTex = gridTexture();
  floorTex.repeat.set(12, L / 24);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(260, L),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, metalness: 0.4 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -30, zc);
  floor.receiveShadow = true;
  root.add(floor);

  const wallMat = MAT.gunmetal();
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 170, L), wallMat);
    wall.position.set(side * 96, 55, zc);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
    for (const y of [22, 58]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, L), MAT.trenchStrip());
      rail.position.set(side * 89.6, y, zc);
      root.add(rail);
    }
  }
}

function buildSpace(root, length, rng) {
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(520, 40, 24),
    new THREE.MeshStandardMaterial({ color: 0x3b5b9a, roughness: 0.9, flatShading: true }),
  );
  planet.position.set(-820, 260, -length * 0.55);
  root.add(planet);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(720, 40, 8, 80),
    new THREE.MeshStandardMaterial({ color: 0xc9a46b, roughness: 0.8 }),
  );
  band.rotation.x = Math.PI / 2.6;
  band.position.copy(planet.position);
  root.add(band);

  const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3, 0), MAT.rockDark(), 180);
  const m = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    m.position.set((rng() - 0.5) * 900, (rng() - 0.5) * 300, 120 - rng() * (length + 120));
    m.scale.setScalar(0.5 + rng() * 3);
    m.updateMatrix();
    debris.setMatrixAt(i, m.matrix);
  }
  root.add(debris);
}
