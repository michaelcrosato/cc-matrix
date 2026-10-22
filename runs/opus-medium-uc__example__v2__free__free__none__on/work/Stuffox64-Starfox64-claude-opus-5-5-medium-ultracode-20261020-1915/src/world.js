// Environments: streamed patchwork planet for rail stages, and a space arena for all-range mode.
import * as THREE from 'three/webgpu';
import { color, mix, step, sin, time, positionWorld, positionLocal, normalize, smoothstep, fract } from 'three/tsl';
import { toon, glow } from './models.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function skyDome(top, horizon, bottom) {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  m.fog = false;
  const y = normalize(positionLocal).y;
  m.colorNode = mix(mix(color(bottom), color(horizon), smoothstep(-0.3, 0.0, y)), color(top), smoothstep(0.0, 0.55, y));
  const s = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), m);
  s.renderOrder = -10; s.frustumCulled = false;
  return s;
}

function cloud(r, scale = 1) {
  const g = new THREE.Group(); const m = toon(0xffffff);
  const n = 4 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), m);
    const k = (6 + r() * 8) * scale;
    s.scale.set(k * 1.2, k * 0.8, k);
    s.position.set((i - n / 2) * 8 * scale + r() * 4, r() * 4 * scale, r() * 8 * scale);
    g.add(s);
  }
  return g;
}

// Zones along the rail (distance d, forward is -Z)
export const STAGE1_ZONES = [
  { from: 0, to: 1500, kind: 'sea' },
  { from: 1500, to: 3400, kind: 'plains' },
  { from: 3400, to: 6600, kind: 'city', alt: 'canyon' }, // route B swaps to canyon
  { from: 6600, to: 1e9, kind: 'fortress' },
];
const QUILT = [0x7cc35a, 0x9bd16a, 0x5fae5a, 0xe8d36a, 0xd8a14a, 0x6cc0a8, 0xe79aa8, 0xa7d36a, 0x86b84e];
const CANYON = [0xc9774a, 0xd9935a, 0xb4603c, 0xe0a86a, 0xa6553a];
const CHUNK = 200;

export class RailWorld {
  constructor(scene, physics, routeFn) {
    this.scene = scene; this.physics = physics; this.routeFn = routeFn;
    this.root = new THREE.Group(); scene.add(this.root);
    this.chunks = new Map(); this.animated = [];
    scene.background = new THREE.Color(0xbfe6ff);
    scene.fog = new THREE.Fog(0xcbe9ff, 380, 1250);
    this.sky = skyDome(0x3a8fe8, 0xcbe9ff, 0x8fc0e8); this.root.add(this.sky);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(120, 32), glow(0xfff4c0, 3)); sun.material.fog = false;
    sun.position.set(-900, 1200, -3200); sun.lookAt(0, 0, 0); this.sunMesh = sun; this.root.add(sun);
    // ocean
    const wm = new THREE.MeshToonNodeMaterial({ color: 0x2f8fdc });
    const pw = positionWorld;
    const w = sin(pw.x.mul(0.06).add(time.mul(1.3))).mul(sin(pw.z.mul(0.045).add(time.mul(0.9))));
    const w2 = sin(pw.x.mul(0.013).add(pw.z.mul(0.02)).add(time.mul(0.5)));
    wm.colorNode = mix(mix(color(0x1f6fc4), color(0x3aa6e8), step(0.0, w2)), color(0xd8f6ff), step(0.86, w));
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), wm);
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = -0.5; this.water.receiveShadow = true;
    this.root.add(this.water);
    physics.addGround(-0.5);
    this.clouds = new THREE.Group(); this.root.add(this.clouds);
    const r = rng(77);
    for (let i = 0; i < 26; i++) {
      const c = cloud(r, 1 + r() * 1.5);
      c.position.set((r() - 0.5) * 1600, 140 + r() * 260, -r() * 1400);
      this.clouds.add(c);
    }
  }
  zoneAt(d) {
    for (const z of STAGE1_ZONES) if (d >= z.from && d < z.to) return (z.alt && this.routeFn() === 'B') ? z.alt : z.kind;
    return 'fortress';
  }
  // ground height in world coords (rail runs down -Z)
  heightAt(x, zWorld) {
    const d = -zWorld, k = this.zoneAt(d), ax = Math.abs(x);
    if (k === 'sea') return -8 + smooth(1100, 1500, d) * 8 + (ax > 260 ? vnoise(x * 0.01, d * 0.01) * 40 * smooth(260, 500, ax) : 0);
    if (k === 'canyon') return ax < 56 ? 0 : 40 + smooth(56, 66, ax) * 150 + vnoise(x * 0.02, d * 0.02) * 30;
    const hill = smooth(90, 300, ax) * (vnoise(x * 0.008, d * 0.008) * 110 + 10) + vnoise(x * 0.03, d * 0.03) * 4 * smooth(40, 80, ax);
    return hill;
  }
  update(d, camPos) {
    const first = Math.floor((d - 250) / CHUNK), last = Math.floor((d + 1150) / CHUNK);
    for (let i = first; i <= last; i++) if (i >= 0 && !this.chunks.has(i)) this.buildChunk(i);
    for (const [i, c] of this.chunks) if (i < first) this.disposeChunk(i, c);
    this.sky.position.copy(camPos);
    this.water.position.x = camPos.x; this.water.position.z = camPos.z - 1500;
    this.sunMesh.position.set(camPos.x - 900, 1200, camPos.z - 3200);
    for (const c of this.clouds.children) {
      if (c.position.z > camPos.z + 300) { c.position.z -= 1500 + Math.random() * 200; c.position.x = (Math.random() - 0.5) * 1600; }
    }
    const t = performance.now() / 1000;
    for (const a of this.animated) a(t);
  }
  disposeChunk(i, c) {
    this.root.remove(c.group);
    c.group.traverse((o) => { if (o.geometry && o.userData.ownGeo) o.geometry.dispose(); });
    for (const col of c.colliders) this.physics.remove(col);
    this.animated = this.animated.filter((a) => !c.anims.includes(a));
    this.chunks.delete(i);
  }
  buildChunk(i) {
    const d0 = i * CHUNK;
    const kind = this.zoneAt(d0 + CHUNK / 2);
    const r = rng(i * 9973 + (this.routeFn() === 'B' ? 17 : 3));
    const group = new THREE.Group(); const colliders = []; const anims = [];
    const c = { group, colliders, anims };
    this.chunks.set(i, c);
    this.root.add(group);
    // terrain patchwork
    const W = 1600, P = 25;
    const nx = W / P, nz = CHUNK / P;
    const pos = [], col = [];
    const tmp = new THREE.Color();
    const pal = kind === 'canyon' ? CANYON : kind === 'sea' ? [0xe8d9a0, 0xd6c48a, 0x8fbf6a, 0x7aae5a] : kind === 'fortress' ? [0x8a9a6a, 0x9aaa72, 0x7c8a60, 0xb5a46a, 0x6f7f5a] : QUILT;
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      const x0 = -W / 2 + ix * P, x1 = x0 + P, z0 = -(d0 + iz * P), z1 = z0 - P;
      const h = (x, z) => this.heightAt(x, z);
      const a = [x0, h(x0, z0), z0], b = [x1, h(x1, z0), z0], cc = [x1, h(x1, z1), z1], dd = [x0, h(x0, z1), z1];
      pos.push(...a, ...b, ...cc, ...a, ...cc, ...dd);
      const pick = pal[Math.floor(hash2(ix * 1.7 + (kind === 'canyon' ? Math.floor((a[1] + b[1]) / 30) : 0), i * nz + iz) * pal.length)];
      tmp.setHex(pick);
      if (kind === 'canyon' && Math.abs(x0) > 50) tmp.setHex(CANYON[Math.floor(Math.abs(a[1] / 22)) % CANYON.length]);
      const shade = (ix + iz) % 2 ? 1 : 0.94;
      for (let k = 0; k < 6; k++) col.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, toon(0xffffff, { vertexColors: true }));
    ground.receiveShadow = true; ground.userData.ownGeo = true; group.add(ground);

    const add = (obj, x, z, collider) => { obj.position.x = x; obj.position.z = z; group.add(obj); if (collider) colliders.push(collider); return obj; };
    const zr = () => -(d0 + r() * CHUNK);
    if (kind === 'sea') {
      for (let k = 0; k < 5; k++) {
        const x = (r() < 0.5 ? -1 : 1) * (60 + r() * 400), z = zr(), s = 6 + r() * 16;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), toon(r() < 0.5 ? 0x8d7f73 : 0x9b8b6e));
        rock.scale.y = 0.6 + r(); rock.position.y = s * 0.2; rock.castShadow = true; rock.userData.ownGeo = true;
        add(rock, x, z);
        if (r() < 0.5) { const tr = this.tree(r); tr.position.set(x, s * 0.8, z); group.add(tr); }
      }
      if (i % 3 === 1) this.lighthouse(group, (r() < 0.5 ? -1 : 1) * (90 + r() * 60), -(d0 + 100), anims);
      for (let k = 0; k < 2; k++) this.sailboat(group, (r() - 0.5) * 500, zr(), r, anims);
      if (i % 2 === 0) { // tall sea stacks in the corridor to weave through
        const x = (r() - 0.5) * 70, z = -(d0 + 50 + r() * 100);
        const st = new THREE.Mesh(new THREE.CylinderGeometry(6, 9, 70, 7), toon(0x9b8b6e)); st.position.set(x, 27, z); st.castShadow = true; st.userData.ownGeo = true; group.add(st);
        const top = this.tree(r); top.position.set(x, 62, z); top.scale.setScalar(1.4); group.add(top);
        colliders.push(this.physics.addStaticBox({ x, y: 27, z }, { x: 6.5, y: 35, z: 6.5 }, 0, { kind: 'static' }));
      }
    } else if (kind === 'plains' || kind === 'fortress') {
      const nTrees = kind === 'plains' ? 50 : 26;
      for (let k = 0; k < nTrees; k++) {
        const x = (r() < 0.5 ? -1 : 1) * (14 + r() * 380), z = zr();
        const t = this.tree(r); t.position.set(x, this.heightAt(x, z), z); group.add(t);
      }
      if (kind === 'plains') {
        for (let k = 0; k < 2; k++) { const x = (r() < 0.5 ? -1 : 1) * (70 + r() * 150), z = zr(); this.windmill(group, x, this.heightAt(x, z), z, anims, r); }
        if (r() < 0.6) { const x = (r() < 0.5 ? -1 : 1) * (40 + r() * 60), z = zr(); this.barn(group, x, z, r); }
        if (r() < 0.5) { const x = (r() - 0.5) * 60, z = -(d0 + 100); this.spool(group, x, z, colliders); }
      } else {
        for (let k = 0; k < 3; k++) { const x = (r() < 0.5 ? -1 : 1) * (60 + r() * 200), z = zr(); this.bunker(group, x, z, r); }
        if (i % 2 === 0) for (const s of [-1, 1]) this.fortWall(group, s * 85, -(d0 + 100), colliders);
      }
    } else if (kind === 'city') {
      for (let k = 0; k < 14; k++) {
        const side = r() < 0.5 ? -1 : 1, x = side * (48 + r() * 260), z = zr();
        this.building(group, x, z, r, colliders, false);
      }
      for (let k = 0; k < 2; k++) { // corridor towers to dodge
        const x = (r() - 0.5) * 70, z = -(d0 + 30 + k * 100 + r() * 40);
        this.building(group, x, z, r, colliders, true);
      }
      if (i % 3 === 0) this.arch(group, -(d0 + 100), colliders, toon(0xe86a6a));
      for (let k = 0; k < 10; k++) { const x = (r() < 0.5 ? -1 : 1) * (20 + r() * 300), z = zr(); const t = this.tree(r); t.position.set(x, this.heightAt(x, z), z); t.scale.setScalar(0.7); group.add(t); }
    } else if (kind === 'canyon') {
      for (const s of [-1, 1]) colliders.push(this.physics.addStaticBox({ x: s * 80, y: 100, z: -(d0 + CHUNK / 2) }, { x: 22, y: 110, z: CHUNK / 2 }, 0, { kind: 'static' }));
      if (i % 2 === 0) this.rockArch(group, -(d0 + 60 + r() * 80), colliders);
      for (let k = 0; k < 3; k++) {
        const x = (r() - 0.5) * 80, z = zr(), h = 10 + r() * 34;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(5 + r() * 3, h, 6), toon(CANYON[k % CANYON.length])); sp.position.set(x, h / 2, z); sp.castShadow = true; sp.userData.ownGeo = true; group.add(sp);
        colliders.push(this.physics.addStaticBox({ x, y: h / 4, z }, { x: 4, y: h / 4 + 1, z: 4 }, 0, { kind: 'static' }));
      }
      if (i % 3 === 1) this.waterfall(group, (r() < 0.5 ? -1 : 1) * 57, -(d0 + 100), anims);
      // river on canyon floor
      const riv = new THREE.Mesh(new THREE.PlaneGeometry(26, CHUNK), this.water.material); riv.rotation.x = -Math.PI / 2; riv.position.set(Math.sin(i) * 10, 0.3, -(d0 + CHUNK / 2)); riv.userData.ownGeo = true; group.add(riv);
    }
    return c;
  }
  tree(r) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(this._trunkGeo ||= new THREE.CylinderGeometry(0.8, 1.1, 7, 6), toon(0x8a5a3a)); trunk.position.y = 3.5; trunk.castShadow = true; g.add(trunk);
    const crownCol = [0x4fa84a, 0x6cc04f, 0x3f9a5a, 0xf0a04a, 0xe86a8a][Math.floor(r() * 5)];
    const crown = new THREE.Mesh(this._crownGeo ||= new THREE.SphereGeometry(5, 12, 9), toon(crownCol)); crown.position.y = 10; crown.scale.y = 0.85; crown.castShadow = true; g.add(crown);
    // button holes (it's a button tree!)
    const holeM = toon(0x2f5a2f);
    for (const [x, y] of [[-1.2, 1.2], [1.2, 1.2], [-1.2, -1.2], [1.2, -1.2]]) {
      const h = new THREE.Mesh(this._holeGeo ||= new THREE.CylinderGeometry(0.55, 0.55, 0.4, 8), holeM); h.rotation.x = Math.PI / 2; h.position.set(x, 10 + y, 4.6); g.add(h);
    }
    g.scale.setScalar(0.8 + r() * 0.8);
    g.rotation.y = r() * Math.PI;
    return g;
  }
  windmill(group, x, y, z, anims, r) {
    const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 26, 8), toon(0xf4ecdc)); tw.position.y = 13; tw.castShadow = true; tw.userData.ownGeo = true; g.add(tw);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 6, 8), toon(0xd64a4a)); roof.position.y = 29; roof.userData.ownGeo = true; g.add(roof);
    const hub = new THREE.Group(); hub.position.set(0, 24, 4.5); g.add(hub);
    for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 15, 0.3), toon(0xfaf4e4)); b.position.y = 7.5; const p = new THREE.Group(); p.rotation.z = k * Math.PI / 2; p.add(b); hub.add(p); b.castShadow = true; b.userData.ownGeo = true; }
    const sp = 0.8 + r();
    const a = (t) => { hub.rotation.z = t * sp; }; anims.push(a); this.animated.push(a);
  }
  barn(group, x, z, r) {
    const g = new THREE.Group(); g.position.set(x, this.heightAt(x, z), z); g.rotation.y = r() * 6; group.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 18), toon(0xc8443a)); b.position.y = 5; b.castShadow = true; b.userData.ownGeo = true; g.add(b);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 18.5, 3, 1), toon(0x5a4a40)); roof.rotation.x = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.y = 12; roof.userData.ownGeo = true; g.add(roof);
  }
  spool(group, x, z, colliders) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 30, 14), toon(0xe85a8a)); core.position.y = 17; core.castShadow = true; core.userData.ownGeo = true; g.add(core);
    for (const y of [1, 33]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 3, 18), toon(0xd8b07a)); d.position.y = y; d.castShadow = true; d.userData.ownGeo = true; g.add(d); }
    colliders.push(this.physics.addStaticBox({ x, y: 17, z }, { x: 7, y: 18, z: 7 }, 0, { kind: 'static' }));
  }
  bunker(group, x, z, r) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 8, 8), toon(0x6f6a64)); b.position.set(x, this.heightAt(x, z) + 4, z); b.castShadow = true; b.userData.ownGeo = true; group.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 1.2), toon(0xf2c230)); s.position.set(x, this.heightAt(x, z) + 6, z); s.userData.ownGeo = true; group.add(s);
  }
  fortWall(group, x, z, colliders) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(8, 30, 200), toon(0x8a8478)); w.position.set(x, 15, z); w.castShadow = true; w.receiveShadow = true; w.userData.ownGeo = true; group.add(w);
    for (let k = 0; k < 8; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 12), toon(0x9a9488)); c.position.set(x, 32, z - 90 + k * 26); c.userData.ownGeo = true; group.add(c); }
    colliders.push(this.physics.addStaticBox({ x, y: 15, z }, { x: 4, y: 15, z: 100 }, 0, { kind: 'static' }));
  }
  building(group, x, z, r, colliders, corridor) {
    const w = 12 + r() * 14, dd = 12 + r() * 14, h = corridor ? 40 + r() * 50 : 30 + r() * 120;
    const colA = [0xf0e0c8, 0xd8e8f8, 0xf8d0d8, 0xd0f0d8, 0xf6e6a8, 0xc8d0f8][Math.floor(r() * 6)];
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), toon(colA)); b.position.y = h / 2; b.castShadow = true; b.receiveShadow = true; b.userData.ownGeo = true; g.add(b);
    const winM = toon(0x3a5a8a, { emissive: 0x3a6aaa, ei: 0.25 });
    for (let y = 8; y < h - 6; y += 9) { const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 2.4, dd + 0.4), winM); s.position.y = y; s.userData.ownGeo = true; g.add(s); }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, Math.max(w, dd) * 0.75, 10, 4), toon([0xd64a4a, 0x4a7ad6, 0x4ab06a][Math.floor(r() * 3)])); roof.rotation.y = Math.PI / 4; roof.position.y = h + 5; roof.castShadow = true; roof.userData.ownGeo = true; g.add(roof);
    if (corridor || Math.abs(x) < 90) colliders.push(this.physics.addStaticBox({ x, y: h / 2, z }, { x: w / 2, y: h / 2 + 5, z: dd / 2 }, 0, { kind: 'static' }));
  }
  arch(group, z, colliders, mat) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(42, 5, 8, 24, Math.PI), mat); a.position.set(0, 0, z); a.castShadow = true; a.userData.ownGeo = true; group.add(a);
    for (const s of [-1, 1]) colliders.push(this.physics.addStaticBox({ x: s * 42, y: 15, z }, { x: 5, y: 15, z: 5 }, 0, { kind: 'static' }));
    colliders.push(this.physics.addStaticBox({ x: 0, y: 44, z }, { x: 30, y: 4, z: 5 }, 0, { kind: 'static' }));
  }
  rockArch(group, z, colliders) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(58, 9, 6, 14, Math.PI), toon(0xb4603c)); a.position.set(0, 18, z); a.scale.y = 0.7; a.castShadow = true; a.userData.ownGeo = true; group.add(a);
    colliders.push(this.physics.addStaticBox({ x: 0, y: 18 + 58 * 0.7, z }, { x: 30, y: 6, z: 8 }, 0, { kind: 'static' }));
  }
  waterfall(group, x, z, anims) {
    const m = new THREE.MeshBasicNodeMaterial();
    const pw = positionWorld;
    m.colorNode = mix(color(0x9ad8ff), color(0xffffff), step(0.6, fract(pw.y.mul(0.05).add(time.mul(1.5)).add(sin(pw.z.mul(0.3)).mul(0.2)))));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(20, 160), m); p.position.set(x - Math.sign(x) * 1, 80, z); p.rotation.y = -Math.sign(x) * Math.PI / 2; p.userData.ownGeo = true; group.add(p);
  }
  lighthouse(group, x, z, anims) {
    const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 8, 8), toon(0x8d7f73)); rock.position.y = 0; rock.userData.ownGeo = true; g.add(rock);
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(5 - k * 0.4, 5.4 - k * 0.4, 8, 12), toon(k % 2 ? 0xd63c3c : 0xffffff)); s.position.y = 8 + k * 8; s.castShadow = true; s.userData.ownGeo = true; g.add(s); }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(3.5, 10, 8), glow(0xfff1a0, 4)); lamp.position.y = 50; g.add(lamp);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(8, 90, 12, 1, true), glow(0xfff1a0, 0.6, { additive: true, unique: true })); beam.material.opacity = 0.25; beam.rotation.z = Math.PI / 2; beam.position.x = 45;
    const piv = new THREE.Group(); piv.position.y = 50; piv.add(beam); g.add(piv);
    const a = (t) => { piv.rotation.y = t * 1.2; }; anims.push(a); this.animated.push(a);
  }
  sailboat(group, x, z, r, anims) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r() * 6; group.add(g);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 12), toon(0xf2c230)); hull.position.y = 0.6; hull.userData.ownGeo = true; g.add(hull);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(4, 12, 3), toon(0xffffff)); sail.position.y = 8; sail.scale.z = 0.15; sail.userData.ownGeo = true; g.add(sail);
    const ph = r() * 6;
    const a = (t) => { g.rotation.z = Math.sin(t * 1.5 + ph) * 0.08; g.position.y = Math.sin(t * 1.2 + ph) * 0.4; }; anims.push(a); this.animated.push(a);
  }
  dispose() {
    for (const [i, c] of [...this.chunks]) this.disposeChunk(i, c);
    this.scene.remove(this.root);
    this.scene.fog = null;
  }
}

// ---------------- Space arena (all-range mode) ----------------
export class SpaceWorld {
  constructor(scene, physics) {
    this.scene = scene; this.physics = physics;
    this.root = new THREE.Group(); scene.add(this.root);
    scene.background = new THREE.Color(0x0a0820);
    scene.fog = new THREE.Fog(0x140c30, 900, 2600);
    physics.setGravity(0);
    this.sky = skyDome(0x0a0824, 0x2a1450, 0x0a0820); this.root.add(this.sky);
    // stars
    const n = 3000, p = new Float32Array(n * 3);
    const r = rng(42);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 3200;
      p[i * 3] = s * Math.cos(th) * R; p[i * 3 + 1] = u * R; p[i * 3 + 2] = s * Math.sin(th) * R;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const sm = new THREE.PointsNodeMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false }); sm.fog = false;
    this.stars = new THREE.Points(sg, sm); this.root.add(this.stars);
    // nebula puffs
    for (let i = 0; i < 14; i++) {
      const m = glow([0x6a2ad0, 0xd04a9a, 0x2a6ad0][i % 3], 0.5, { additive: true, unique: true }); m.opacity = 0.12; m.fog = false;
      const s = new THREE.Mesh(new THREE.SphereGeometry(300 + r() * 300, 16, 12), m);
      const a = r() * Math.PI * 2; s.position.set(Math.cos(a) * 2600, (r() - 0.3) * 1200, Math.sin(a) * 2600); this.root.add(s);
    }
    // planet Quiltara below, banded patchwork
    const pm = new THREE.MeshToonNodeMaterial({ color: 0x6cc05a });
    const ly = normalize(positionLocal);
    pm.colorNode = mix(color(0x4f9fe0), mix(color(0x6cc05a), color(0xe8d36a), step(0.5, fract(ly.x.mul(6).add(ly.z.mul(4))))), step(0.0, sin(ly.y.mul(14)).add(ly.x.mul(1.5))));
    pm.fog = false;
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 32), pm);
    this.planet.position.set(-1400, -1500, -2200); this.root.add(this.planet);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(160, 32), glow(0xffe0a0, 3)); sun.material.fog = false; sun.position.set(2000, 1300, -2600); sun.lookAt(0, 0, 0); this.root.add(sun);
    // asteroids: physics-driven, zero-g
    this.asteroids = [];
    const ar = rng(1234);
    for (let i = 0; i < 70; i++) {
      const s = 6 + ar() * 22;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), toon([0x8a7a6a, 0x9a8a7a, 0x6e6458, 0xb09a7a][i % 4]));
      m.castShadow = true; m.receiveShadow = true;
      const a = ar() * Math.PI * 2, rad = 250 + ar() * 650;
      m.position.set(Math.cos(a) * rad, (ar() - 0.5) * 360, Math.sin(a) * rad);
      m.scale.set(1, 0.7 + ar() * 0.5, 0.8 + ar() * 0.4);
      this.root.add(m);
      const rec = physics.addDynamic(m, { type: 'ball', r: s * 0.85 }, { hazard: true, linDamp: 0, angDamp: 0, density: 0.4, restitution: 0.8,
        vel: { x: (ar() - 0.5) * 6, y: (ar() - 0.5) * 3, z: (ar() - 0.5) * 6 }, ang: { x: ar() - 0.5, y: ar() - 0.5, z: ar() - 0.5 }, data: { kind: 'asteroid', size: s } });
      rec.size = s; rec.data = physics.data.get(rec.col.handle); rec.data.rec = rec;
      this.asteroids.push(rec);
    }
    // derelict station ring for scenery
    const ring = new THREE.Mesh(new THREE.TorusGeometry(160, 14, 10, 40), toon(0x7a7f99)); ring.position.set(400, 120, -700); ring.rotation.x = 1.1; ring.castShadow = true; this.root.add(ring);
    this.stationRing = ring;
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 160), toon(0x5d6280)); sp.position.copy(ring.position); sp.rotation.set(1.1, 0, 0); sp.rotateZ(a); sp.translateY(0); this.root.add(sp); }
  }
  update(d, camPos) {
    this.sky.position.copy(camPos); this.stars.position.copy(camPos);
    this.stationRing.rotation.z += 0.0015;
    // keep asteroids inside the arena
    for (const a of this.asteroids) {
      const t = a.body.translation();
      const dist = Math.hypot(t.x, t.y * 2, t.z);
      if (dist > 1000) { const v = a.body.linvel(); a.body.setLinvel({ x: v.x - t.x * 0.002, y: v.y - t.y * 0.004, z: v.z - t.z * 0.002 }, true); }
    }
  }
  heightAt() { return -1e9; }
  dispose() {
    this.scene.remove(this.root); this.scene.fog = null;
  }
}
