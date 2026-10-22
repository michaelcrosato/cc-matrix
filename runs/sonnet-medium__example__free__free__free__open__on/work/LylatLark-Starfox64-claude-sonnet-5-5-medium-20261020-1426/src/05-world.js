'use strict';
/* ===== World: renderer, lighting, procedural environments (canyon terrain / deep space) ===== */
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function canyonCenter(z) { return Math.sin(z * 0.0035) * 24 + Math.sin(z * 0.011) * 8; }
function canyonH(x, z) {
  const cx = canyonCenter(z), d = Math.abs(x - cx);
  const wall = smooth01(85, 170, d);
  let h = -24 + fbm(x * 0.02, z * 0.02) * 5 + wall * (80 + fbm(x * 0.03 + 9, z * 0.03) * 40 + fbm(x * 0.09, z * 0.09) * 8);
  h -= Math.exp(-Math.pow((x - cx) / 24, 2)) * 7;
  return h;
}
const CHUNK_W = 520, CHUNK_L = 300;
const World = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null, envName: null, envGroup: null, chunks: new Map(), chunkPool: [],
  sky: null, dust: null, dustN: 260, space: null, w: 1280, h: 720, fogColor: new THREE.Color(),
  init(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.5, 1800);
    this.scene.add(this.camera);
    this.hemi = new THREE.HemisphereLight(0xbfdcff, 0x7a5a3a, 0.9); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.9); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun, this.sun.target);
    FX.init(this.scene);
    this.makeSky(); this.makeDust();
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  resize() {
    this.w = innerWidth; this.h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h; this.camera.updateProjectionMatrix();
  },
  makeSky() {
    const g = new THREE.SphereGeometry(1500, 20, 14);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    this.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);
  },
  paintSky(top, mid, hor, bot) {
    const g = this.sky.geometry, p = g.attributes.position, c = g.attributes.color, col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 1500;
      if (y > 0.25) col.copy(mid).lerp(top, smooth01(0.25, 1, y)); else if (y > 0) col.copy(hor).lerp(mid, smooth01(0, 0.25, y)); else col.copy(hor).lerp(bot, smooth01(0, -0.4, y));
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  },
  makeDust() {
    const n = this.dustN, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
    this.dust = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, fog: false, blending: THREE.AdditiveBlending }));
    this.dust.frustumCulled = false; this.dustPts = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 1e9 })); this.scene.add(this.dust);
  },
  setEnv(name) {
    if (this.envGroup) { this.scene.remove(this.envGroup); this.envGroup.traverse((o) => { if (o.geometry && o.userData.own) o.geometry.dispose(); }); }
    this.chunks.clear(); this.chunkPool.length = 0; this.space = null;
    this.envGroup = new THREE.Group(); this.scene.add(this.envGroup); this.envName = name;
    if (name === 'space') this.buildSpace(); else this.buildCanyon();
  },
  buildCanyon() {
    const s = this.scene;
    this.fogColor.set(0xd9a67a); s.fog = new THREE.Fog(0xd9a67a, 300, 1500);
    this.paintSky(new THREE.Color(0x2f6fcf), new THREE.Color(0x79b0e8), new THREE.Color(0xf6c89a), new THREE.Color(0xe9b98a));
    this.hemi.color.set(0xbfdcff); this.hemi.groundColor.set(0x8a5a3a); this.hemi.intensity = 0.7;
    this.sun.color.set(0xfff0d0); this.sun.intensity = 1.7; this.sun.castShadow = true; this.sunDir = new THREE.Vector3(-0.5, 0.8, 0.45).normalize();
    this.dust.material.opacity = 0.3;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 1800), new THREE.MeshStandardMaterial({ color: 0x2a86c8, roughness: 0.18, metalness: 0.6, emissive: 0x0b3a66, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -27; water.receiveShadow = true; this.envGroup.add(water); this.water = water;
    // sun disc + clouds
    this.sunSprite = glow(this.envGroup, 0xffe7b0, 300, 0, 0, 0, 0.9);
    this.sunSprite.material.fog = false; this.sunSprite.material.depthWrite = false;
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.cloud, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
      c.scale.set(rand(120, 260), rand(40, 80), 1); this.clouds.push({ s: c, x: rand(-700, 700), y: rand(150, 330), z: rand(-1400, -200) }); this.envGroup.add(c);
    }
    this.canyonMats = {
      terrain: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }),
      tree: M(0x2f7a3a, { m: 0, r: 0.9 }), trunk: M(0x5a3a22, { m: 0, r: 1 }), rock: M(0x9a7a5a, { m: 0, r: 1 }),
    };
  },
  makeChunk(k) {
    let c = this.chunkPool.pop();
    if (!c) {
      const geo = new THREE.PlaneGeometry(CHUNK_W, CHUNK_L, 52, 30); geo.rotateX(-Math.PI / 2);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
      const mesh = new THREE.Mesh(geo, this.canyonMats.terrain); mesh.receiveShadow = true; mesh.userData.own = true;
      const g = new THREE.Group(); g.add(mesh);
      const treeG = new THREE.ConeGeometry(1, 1, 6); treeG.translate(0, 0.5, 0);
      const trees = new THREE.InstancedMesh(treeG, this.canyonMats.tree, 110); trees.castShadow = true; trees.frustumCulled = false;
      const rocks = new THREE.InstancedMesh(G.ico0, this.canyonMats.rock, 36); rocks.castShadow = true; rocks.frustumCulled = false;
      g.add(trees, rocks); this.envGroup.add(g);
      c = { g, mesh, geo, trees, rocks, k: null };
    }
    c.k = k; const zc = -(k + 0.5) * CHUNK_L; c.g.position.set(0, 0, zc); c.g.visible = true;
    const p = c.geo.attributes.position, col = c.geo.attributes.color, cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i), wz = p.getZ(i) + zc, h = canyonH(wx, wz); p.setY(i, h);
      const n = fbm(wx * 0.05, wz * 0.05);
      if (h < -20) cc.setHex(0x4d8a3a).lerp(new THREE.Color(0x8fb64a), n * 0.5 + 0.5);
      else if (h < 10) cc.setHex(0xa86a3c).lerp(new THREE.Color(0xc98a4a), n * 0.5 + 0.5);
      else cc.setHex(0xb98a60).lerp(new THREE.Color(0xe6c9a0), smooth01(10, 90, h) * 0.8 + n * 0.1);
      col.setXYZ(i, cc.r, cc.g, cc.b);
    }
    p.needsUpdate = true; col.needsUpdate = true; c.geo.computeVertexNormals(); c.geo.computeBoundingSphere();
    const rng = mulberry32(k * 7919 + 31), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    for (let i = 0; i < 110; i++) {
      const x = (rng() - 0.5) * CHUNK_W * 0.8, z = zc + (rng() - 0.5) * CHUNK_L, h = canyonH(x, z), s = 3 + rng() * 6;
      const ok = h < -10 || (h < 8 && rng() < 0.3);
      ps.set(x, h, z); sc.set(ok ? s * 0.55 : 0, ok ? s * 1.8 : 0, ok ? s * 0.55 : 0); q.setFromEuler(new THREE.Euler(0, rng() * 6, 0));
      mtx.compose(ps, q, sc); c.trees.setMatrixAt(i, mtx);
    }
    for (let i = 0; i < 36; i++) {
      const x = (rng() - 0.5) * CHUNK_W * 0.8, z = zc + (rng() - 0.5) * CHUNK_L, h = canyonH(x, z), s = 2 + rng() * 7;
      ps.set(x, h + s * 0.2, z); sc.set(s, s * 0.8, s); q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3)); mtx.compose(ps, q, sc); c.rocks.setMatrixAt(i, mtx);
    }
    c.trees.instanceMatrix.needsUpdate = true; c.rocks.instanceMatrix.needsUpdate = true;
    c.g.position.z = 0; c.trees.position.z = 0; // instance matrices carry world z
    c.mesh.position.set(0, 0, zc);
    this.chunks.set(k, c); return c;
  },
  buildSpace() {
    const s = this.scene;
    this.fogColor.set(0x100a22); s.fog = new THREE.Fog(0x100a22, 450, 1600);
    this.paintSky(new THREE.Color(0x05030f), new THREE.Color(0x150a2e), new THREE.Color(0x3a1650), new THREE.Color(0x0b0716));
    this.hemi.color.set(0x7a6aff); this.hemi.groundColor.set(0x331a44); this.hemi.intensity = 0.4;
    this.sun.color.set(0xffd9b0); this.sun.intensity = 2.2; this.sun.castShadow = false; this.sunDir = new THREE.Vector3(0.6, 0.5, 0.6).normalize();
    this.dust.material.opacity = 0.5;
    const sp = this.space = { stars: null, planet: new THREE.Group(), neb: [], rocks: null, rockData: [] };
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(1400); pos.set([v.x, v.y, v.z], i * 3); c.setHSL(rand(0.5, 0.95), 0.4, rand(0.6, 1)); col.set([c.r, c.g, c.b], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sp.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, fog: false })); this.envGroup.add(sp.stars);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 24), new THREE.MeshStandardMaterial({ color: 0x4a6fb0, roughness: 0.8, flatShading: false, emissive: 0x0a1a3a, fog: false }));
    const rg = new THREE.Mesh(new THREE.RingGeometry(380, 560, 64), new THREE.MeshBasicMaterial({ color: 0xc8a7e8, side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false }));
    rg.rotation.x = Math.PI / 2 - 0.35; sp.planet.add(pl, rg); sp.planet.rotation.z = 0.2; this.envGroup.add(sp.planet);
    for (let i = 0; i < 9; i++) { const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.nebula, color: pick([0xff55bb, 0x6655ff, 0x33aaff, 0xaa44ff]), transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp2.scale.setScalar(rand(700, 1300)); sp.neb.push({ s: sp2, x: rand(-900, 900), y: rand(-300, 500), z: rand(-1300, -700) }); this.envGroup.add(sp2); }
    const N = 64, rg2 = G.ico, rm = new THREE.InstancedMesh(rg2, M(0x6a5d66, { m: 0.1, r: 0.95 }), N); rm.castShadow = false; rm.frustumCulled = false;
    for (let i = 0; i < N; i++) { const a = rand(0, TAU), r = rand(85, 340); sp.rockData.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, z: rand(0, 900), s: rand(3, 18), rx: rand(0, 3), ry: rand(0, 3), sp: rand(-0.3, 0.3) }); }
    sp.rocks = rm; this.envGroup.add(rm);
  },
  update(dt, f, speed, time) {
    const cam = this.camera;
    this.sky.position.copy(cam.position);
    // shadow follows focus
    this.sun.position.copy(f).addScaledVector(this.sunDir, 160); this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
    if (this.envName === 'canyon') {
      const k0 = Math.floor(-f.z / CHUNK_L);
      for (let k = k0 - 1; k <= k0 + 4; k++) if (!this.chunks.has(k)) {
        // recycle a far chunk first
        for (const [kk, cc] of this.chunks) if (kk < k0 - 2 || kk > k0 + 6) { this.chunks.delete(kk); this.chunkPool.push(cc); break; }
        this.makeChunk(k);
      }
      this.water.position.set(f.x, -27, f.z - 400);
      const sd = this.sunDir; this.sunSprite.position.set(cam.position.x - sd.x * 1100, 230 + sd.y * 120, cam.position.z - 1250);
      for (const c of this.clouds) { if (c.z > cam.position.z + 100) { c.z -= 1500; c.x = rand(-700, 700); } c.s.position.set(c.x, c.y, c.z); }
    } else if (this.space) {
      const sp = this.space; sp.stars.position.copy(cam.position);
      sp.planet.position.set(cam.position.x * 0.97 - 520, 160 + cam.position.y * 0.97, cam.position.z - 2400);
      for (const n of sp.neb) { if (n.z > cam.position.z + 100) { n.z -= 1500; } n.s.position.set(n.x, n.y, n.z); }
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
      sp.rockData.forEach((r, i) => {
        const rel = (((r.z - (-f.z)) % 900) + 900) % 900; const wz = f.z - rel + 120;
        ps.set(r.x, r.y, wz); sc.setScalar(r.s); q.setFromEuler(new THREE.Euler(r.rx + time * r.sp, r.ry + time * r.sp * 0.7, 0)); m.compose(ps, q, sc); sp.rocks.setMatrixAt(i, m);
      }); sp.rocks.instanceMatrix.needsUpdate = true;
    }
    // speed dust
    const pa = this.dust.geometry.attributes.position, len = speed * 0.035;
    this.dustPts.forEach((d, i) => {
      if (d.z > cam.position.z + 20) { const a = rand(0, TAU), r = rand(7, 60); d.x = f.x + Math.cos(a) * r; d.y = f.y + Math.sin(a) * r * 0.7; d.z = cam.position.z - rand(40, 240); }
      pa.setXYZ(i * 2, d.x, d.y, d.z); pa.setXYZ(i * 2 + 1, d.x, d.y, d.z + len);
      d.z += 0; // world-fixed: camera flies past
    });
    pa.needsUpdate = true;
  },
  render() { this.renderer.render(this.scene, this.camera); },
};
