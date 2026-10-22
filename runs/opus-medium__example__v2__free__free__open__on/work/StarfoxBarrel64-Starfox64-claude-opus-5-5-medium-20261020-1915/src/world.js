// Environment builders: terrain, ocean, city fillers, clouds, space backdrop.
import { THREE, gfx, toon, glow, geo, mesh, setSky } from './gfx.js';
import { positionLocal, vec3, sin, time, float, mix, smoothstep, color } from 'three/tsl';
import { buildBuilding, buildTree, buildCloud, buildAsteroid } from './models.js';
import { physics } from './physics.js';
import { rand } from './config.js';

// ---- value noise ----
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; } return s; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

class SampleGrid {
  constructor(cell = 120) { this.cell = cell; this.map = new Map(); }
  add(p, tag) { const k = Math.floor(p.x / this.cell) + ',' + Math.floor(p.z / this.cell); (this.map.get(k) || this.map.set(k, []).get(k)).push({ x: p.x, z: p.z, tag }); }
  nearest(x, z, range = 3) {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    let best = 1e9, tag = null;
    for (let i = -range; i <= range; i++) for (let j = -range; j <= range; j++) {
      const arr = this.map.get((cx + i) + ',' + (cz + j)); if (!arr) continue;
      for (const s of arr) { const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < best) { best = d; tag = s.tag; } }
    }
    return { d: Math.sqrt(best), tag };
  }
}

export function buildPlanetWorld(root, mission, rails, bossRail) {
  const th = mission.theme;
  setSky({ zenith: th.zenith, horizon: th.horizon, ground: th.ground, sunDir: new THREE.Vector3(...th.sunDir), sunColor: new THREE.Color(1.6, 1.4, 1.0), stars: 0, band: 1 });
  gfx.scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  gfx.sun.color.set(0xfff2dd); gfx.sun.intensity = 2.6; gfx.hemi.color.set(0xbfe3ff); gfx.hemi.groundColor.set(0x5a4a6a); gfx.hemi.intensity = 1.4;

  // sample routes
  const grid = new SampleGrid();
  const bay = rails.bay, canyon = rails.canyon;
  for (const s of bay.samples(30)) grid.add(s, 'path');
  for (const s of canyon.samples(30)) grid.add(s, 'path');
  for (const s of bossRail.samples(30)) grid.add(s, 'boss');
  const bayWater = new SampleGrid(150);
  for (let s = 3900; s < bay.length - 900; s += 30) bayWater.add(bay.curve.getPointAt(s / bay.length), 'bay');

  // terrain
  const W = 3200, Lz = 10000, nx = 160, nz = 500;
  const tg = new THREE.PlaneGeometry(W, Lz, nx, nz);
  tg.rotateX(-Math.PI / 2);
  tg.translate(0, 0, Lz / 2 - 900);
  const pos = tg.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0xe8d49a), cGrass = new THREE.Color(0x58b84e), cGrass2 = new THREE.Color(0x3f9a45), cRock = new THREE.Color(0x8c7a68), cSnow = new THREE.Color(0xf4f8ff), cCity = new THREE.Color(0x9aa39a);
  const col = new THREE.Color();
  const bc = bossRail.center;
  const heightAt = (x, z) => {
    const d = grid.nearest(x, z, 3).d;
    const coast = sstep(1600, 1760, z + (fbm(x * 0.01, 3) - 0.5) * 120);
    const bayD = bayWater.nearest(x, z, 3).d;
    const bayMask = 1 - sstep(140, 260, bayD + (fbm(x * 0.01, z * 0.01) - 0.5) * 80);
    const cityFlat = z > 1750 && z < 3600 ? 330 : 0;
    const bossFlat = Math.hypot(x - bc.x, z - bc.z) < bossRail.radius + 260 ? 1 : 0;
    const flatR = Math.max(75, cityFlat) + (bossFlat ? 400 : 0);
    const n = fbm(x * 0.004, z * 0.004);
    const hills = sstep(flatR, flatR + 220, d) * (30 + 220 * n * n * 1.6);
    const water = Math.max(1 - coast, bayMask);
    return { h: (1.2 + hills) * (1 - water) + (-14) * water, d, flatR, water };
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const { h, d, flatR, water } = heightAt(x, z);
    pos.setY(i, h);
    if (h < 0.5) col.copy(cSand).multiplyScalar(0.8);
    else if (h < 3) col.copy(d < flatR && z > 1750 && z < 3600 ? cCity : cGrass).lerp(cSand, water > 0.2 ? 0.6 : 0);
    else if (h < 60) col.copy(cGrass2).lerp(cRock, sstep(20, 60, h));
    else if (h < 160) col.copy(cRock);
    else col.copy(cSnow);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  const terrain = mesh(tg, toon(0xffffff, { vertexColors: true }), { cast: false, receive: true });
  root.add(terrain);
  physics.addGround(0);

  // ocean with TSL waves (faceted via flat shading)
  const og = new THREE.PlaneGeometry(W, Lz, 200, 600);
  og.rotateX(-Math.PI / 2); og.translate(0, -0.6, Lz / 2 - 900);
  const om = new THREE.MeshToonMaterial({ color: 0x2b8fe0, emissive: 0x0b3a70, emissiveIntensity: 0.25 });
  om.flatShading = true;
  const p = positionLocal;
  const wave = sin(p.x.mul(0.045).add(time.mul(1.4))).mul(0.7).add(sin(p.z.mul(0.06).add(time.mul(1.1))).mul(0.6)).add(sin(p.x.add(p.z).mul(0.11).add(time.mul(2.3))).mul(0.25));
  om.positionNode = p.add(vec3(0, wave, 0));
  // cel-banded crests: deep blue troughs, light crests, white foam caps
  const band = smoothstep(0.35, 0.55, wave).add(smoothstep(1.2, 1.3, wave)).mul(0.5);
  om.colorNode = mix(mix(color(0x1a6fd0), color(0x4fb4ff), smoothstep(0.0, 0.5, band)), color(0xcfeaff), smoothstep(0.9, 1.0, band));
  const ocean = new THREE.Mesh(og, om); ocean.receiveShadow = true;
  root.add(ocean);

  // city fillers along shared prefix
  const palette = [0xe9d8c4, 0xc9d6e8, 0xf0c8a8, 0xb8c8b0, 0xd8c0d8, 0xe8e0b0, 0xa8b8c8];
  const f = {};
  for (let s = 1860; s < 3520; s += 26) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.15) continue;
      const x = side * rand(48, 320);
      bay.frame(s + rand(-10, 10), f);
      const w = rand(10, 22), h = rand(18, 95) * (Math.abs(x) < 120 ? 0.8 : 1.2), d = rand(10, 22);
      const b = buildBuilding(w, h, d, palette[Math.floor(Math.random() * palette.length)]);
      b.position.copy(f.p).addScaledVector(f.r, x); b.position.y = 1.2;
      b.rotation.y = Math.atan2(f.t.x, f.t.z) + (Math.random() < 0.2 ? rand(-0.3, 0.3) : 0);
      root.add(b);
    }
  }
  // boss city ring (around the boss circle)
  for (let a = 0; a < Math.PI * 2; a += 0.06) {
    for (const off of [rand(-260, -120), rand(110, 250)]) {
      const r = bossRail.radius + off;
      const w = rand(12, 26), h = rand(20, 110), d = rand(12, 26);
      const b = buildBuilding(w, h, d, palette[Math.floor(Math.random() * palette.length)]);
      b.position.set(bc.x + Math.cos(a) * r, 1.2, bc.z + Math.sin(a) * r);
      b.rotation.y = -a;
      root.add(b);
    }
  }
  // trees on coastal hills and along canyon / bay shoulders
  for (let i = 0; i < 260; i++) {
    const x = rand(-900, 900), z = rand(1700, 7800);
    const near = grid.nearest(x, z, 3);
    if (near.d < 85 || (z > 1750 && z < 3600 && near.d < 340)) continue;
    const t = buildTree(rand(1.2, 2.6));
    const th = heightAt(x, z).h;
    if (th < 1.5) continue;
    t.position.set(x, th - 0.5, z);
    root.add(t);
  }
  // clouds
  for (let i = 0; i < 70; i++) {
    const c = buildCloud();
    c.position.set(rand(-1300, 1300), rand(140, 320), rand(-600, 8500));
    c.scale.setScalar(rand(1, 2.4));
    root.add(c);
  }
  // a few low clouds you fly through near the coast
  for (let i = 0; i < 6; i++) {
    const s = rand(400, 1500);
    bay.frame(s, f);
    const c = buildCloud(); c.position.copy(f.p).addScaledVector(f.r, rand(-70, 70)); c.position.y = rand(60, 90); root.add(c);
  }
  // coastal lighthouse + harbour walls for flavour
  const lh = new THREE.Group();
  lh.add(mesh(geo('cyl', 4, 6, 40, 8), toon(0xffffff)));
  lh.children[0].position.y = 20;
  const stripe = mesh(geo('cyl', 4.6, 5.2, 8, 8), toon(0xe03030)); stripe.position.y = 18; lh.add(stripe);
  const lamp = mesh(geo('sphere', 3, 8, 6), glow(0xfff0a0, 3)); lamp.position.y = 43; lh.add(lamp);
  bay.frame(1700, f); lh.position.copy(f.p).addScaledVector(f.r, 90); lh.position.y = 0; root.add(lh);
  return { terrain, ocean };
}

export function buildSpaceWorld(root, mission) {
  const th = mission.theme;
  setSky({ zenith: th.zenith, horizon: th.horizon, ground: th.ground, sunDir: new THREE.Vector3(...th.sunDir), sunColor: new THREE.Color(2.0, 1.6, 1.2), stars: 1, band: 1, nebula: 1 });
  gfx.scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  gfx.sun.color.set(0xffe6cc); gfx.sun.intensity = 3.0; gfx.hemi.color.set(0x8a7ad8); gfx.hemi.groundColor.set(0x201030); gfx.hemi.intensity = 1.1;
  // distant planet with ring
  const planet = new THREE.Group();
  const pm = toon(0xd77a4a, { flat: false });
  planet.add(mesh(new THREE.SphereGeometry(700, 48, 32), pm, { cast: false, receive: false }));
  const ring = mesh(new THREE.RingGeometry(900, 1300, 64, 1), toon(0xe8c090, { flat: false, side: THREE.DoubleSide }), { cast: false, receive: false });
  ring.rotation.x = Math.PI / 2.4; planet.add(ring);
  planet.position.set(-2400, -400, -3200);
  root.add(planet);
  const moon = mesh(new THREE.SphereGeometry(160, 24, 16), toon(0xb8c0d8, { flat: false }), { cast: false, receive: false });
  moon.position.set(2200, 900, -2600); root.add(moon);
  // asteroid field (dynamic Rapier bodies, zero-g)
  const rocks = [];
  for (let i = 0; i < 70; i++) {
    const r = rand(6, 22);
    const a = buildAsteroid(r);
    let p;
    do { p = new THREE.Vector3(rand(-850, 850), rand(-260, 260), rand(-850, 850)); } while (p.length() < 220);
    root.add(a);
    const owner = { kind: 'rock', radius: r, hp: Math.ceil(r / 2), obj: a };
    owner.rk = physics.addRock(a, p, r, owner);
    rocks.push(owner);
  }
  // huge static asteroids (landmarks)
  for (let i = 0; i < 6; i++) {
    const r = rand(50, 90);
    const a = buildAsteroid(r);
    const ang = i / 6 * Math.PI * 2;
    a.position.set(Math.cos(ang) * 620, rand(-120, 120), Math.sin(ang) * 620);
    root.add(a);
    physics.addStaticBall(a.position.x, a.position.y, a.position.z, r * 0.9, { kind: 'bigrock' });
  }
  // drifting space dust: tiny glow motes
  const dustG = new THREE.BufferGeometry();
  const N = 1500, dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dp[i * 3] = rand(-1000, 1000); dp[i * 3 + 1] = rand(-400, 400); dp[i * 3 + 2] = rand(-1000, 1000); }
  dustG.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: 0xbbaaff, size: 2.2, sizeAttenuation: true }));
  root.add(dust);
  return { rocks };
}
