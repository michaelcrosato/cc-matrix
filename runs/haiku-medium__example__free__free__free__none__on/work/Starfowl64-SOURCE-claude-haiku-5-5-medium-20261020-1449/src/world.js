import * as THREE from 'three';

// Shared rendering world: renderer, camera, lights with shadows, starfield, terrain and particle pools.

export const world = {
  renderer: null,
  scene: null,
  camera: null,
  sun: null,
  fill: null,
  stars: null,
  terrain: [],
  shake: 0,
  time: 0,
  palette: null,
};

export const STAGE_PALETTES = {
  space: { sky: 0x03050f, fog: 0x060a1c, ground: 0x2a3a5c, ridge: 0x1c2a48, accent: 0x63d8ff, sun: 0xffe2b0 },
  canyon: { sky: 0x1a0c08, fog: 0x3a1c12, ground: 0x7a4a2c, ridge: 0x5c3320, accent: 0xffa04a, sun: 0xffc690 },
  station: { sky: 0x06100c, fog: 0x0a2016, ground: 0x2a5a48, ridge: 0x18403a, accent: 0x5cffc0, sun: 0xd0ffe6 },
  boss: { sky: 0x120412, fog: 0x2a0a24, ground: 0x3a1c40, ridge: 0x2a1030, accent: 0xff4d8d, sun: 0xffb0d8 },
};

export function initWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 3, 9);

  const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x20140e, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.PointLight(0x6fb8ff, 30, 120, 1.6);
  fill.position.set(0, 8, -20);
  scene.add(fill);

  world.renderer = renderer;
  world.scene = scene;
  world.camera = camera;
  world.sun = sun;
  world.fill = fill;

  buildStarfield();
  buildTerrainPool();
  applyPalette('space');

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  return world;
}

export function applyPalette(name) {
  const p = STAGE_PALETTES[name] || STAGE_PALETTES.space;
  world.palette = p;
  world.scene.background = new THREE.Color(p.sky);
  world.scene.fog = new THREE.Fog(p.fog, 60, 240);
  world.sun.color.setHex(p.sun);
  world.fill.color.setHex(p.accent);
  for (const t of world.terrain) {
    t.ground.material.color.setHex(p.ground);
    t.ridge.material.color.setHex(p.ridge);
  }
}

function buildStarfield() {
  const count = 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 380 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 40;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false });
  world.stars = new THREE.Points(geo, mat);
  world.scene.add(world.stars);
}

// Terrain is a set of tiles that scroll toward the camera and recycle, giving endless ground.
const TILE_LEN = 60;
const TILE_COUNT = 7;

function buildTerrainPool() {
  for (let i = 0; i < TILE_COUNT; i++) {
    const group = new THREE.Group();
    const groundGeo = new THREE.PlaneGeometry(260, TILE_LEN, 40, 10);
    const pos = groundGeo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      const h = Math.sin(x * 0.11) * 1.2 + Math.cos(y * 0.07) * 1.5 + Math.sin((x + y) * 0.23) * 0.4;
      pos.setZ(v, h * (Math.abs(x) > 30 ? 1.0 : 0.25));
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x2a3a5c, roughness: 0.95, flatShading: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -14;
    ground.receiveShadow = true;
    group.add(ground);

    const ridgeGeo = new THREE.BoxGeometry(14, 10, TILE_LEN);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1c2a48, roughness: 0.9, flatShading: true });
    const ridges = new THREE.Group();
    for (const side of [-1, 1]) {
      const r = new THREE.Mesh(ridgeGeo, ridgeMat);
      r.position.set(side * 70, -8, 0);
      r.castShadow = true;
      r.receiveShadow = true;
      ridges.add(r);
    }
    group.add(ridges);
    group.position.z = -i * TILE_LEN;
    world.scene.add(group);
    world.terrain.push({ group, ground, ridge: { material: ridgeMat }, speedZ: 0 });
  }
}

// Moves the ground tiles by dz. The sign follows the ship's flow, so tiles recycle in both directions (U-turns).
export function scrollTerrain(dz) {
  const span = TILE_LEN * TILE_COUNT;
  for (const t of world.terrain) {
    t.group.position.z += dz;
    // Recycle only when a tile is far behind the ship in either direction, so ground covers both ways.
    if (t.group.position.z > 150) t.group.position.z -= span;
    else if (t.group.position.z < -270) t.group.position.z += span;
  }
}

// Particle system: one shared pool of points with per-particle velocity, colour and life.
const POOL = 900;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(POOL * 3);
const pCol = new Float32Array(POOL * 3);
const pAlive = new Float32Array(POOL);
const pVel = new Float32Array(POOL * 3);
const pLife = new Float32Array(POOL);
const pMaxLife = new Float32Array(POOL);
let pHead = 0;

export function initParticles() {
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const mat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(pGeo, mat);
  points.frustumCulled = false;
  world.scene.add(points);
  world.particles = points;
}

export function spawnParticle(x, y, z, vx, vy, vz, r, g, b, life) {
  const i = pHead;
  pHead = (pHead + 1) % POOL;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
  pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b;
  pLife[i] = life;
  pMaxLife[i] = life;
  pAlive[i] = 1;
}

export function burst(x, y, z, count, color, speed = 12, life = 0.7) {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  for (let k = 0; k < count; k++) {
    const a = Math.random() * Math.PI * 2;
    const e = (Math.random() - 0.5) * Math.PI;
    const s = speed * (0.3 + Math.random() * 0.7);
    spawnParticle(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, r, g, b, life * (0.6 + Math.random() * 0.6));
  }
}

export function updateParticles(dt) {
  for (let i = 0; i < POOL; i++) {
    if (!pAlive[i]) continue;
    pLife[i] -= dt;
    if (pLife[i] <= 0) {
      pAlive[i] = 0;
      pPos[i * 3 + 1] = -9999;
      continue;
    }
    const drag = Math.exp(-2.2 * dt);
    pVel[i * 3] *= drag; pVel[i * 3 + 1] *= drag; pVel[i * 3 + 2] *= drag;
    pPos[i * 3] += pVel[i * 3] * dt;
    pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
    pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    // Fade by scaling colour with remaining life (additive blending makes black invisible).
    const fade = 1 - dt * 1.5;
    pCol[i * 3] *= fade;
    pCol[i * 3 + 1] *= fade;
    pCol[i * 3 + 2] *= fade;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

export function clearParticles() {
  for (let i = 0; i < POOL; i++) {
    pAlive[i] = 0;
    pPos[i * 3 + 1] = -9999;
  }
  pGeo.attributes.position.needsUpdate = true;
}

export function addShake(amount) {
  world.shake = Math.min(1.5, world.shake + amount);
}
