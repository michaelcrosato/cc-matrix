// ===================================================================
//  RENDER  -  Three.js r180 WebGPU renderer, cel-shaded (toon ramp + inverted-hull ink outlines + banded sky)
// ===================================================================
const R = {
  renderer: null, scene: null, camera: null, post: null, sun: null, amb: null, hemi: null, sky: null, stars: null,
  focus: new V3(), shake: 0, bloomNode: null, scenePass: null, ok: false, outlines: [],
  skyTop: TSL.uniform(new THREE.Color(0x2a6fd0)), skyHor: TSL.uniform(new THREE.Color(0xffc890)), skyBot: TSL.uniform(new THREE.Color(0x203060)),
  sunDir: TSL.uniform(new THREE.Vector3(0.3, 0.5, -0.8).normalize()),
  sunCol: TSL.uniform(new THREE.Color(0xfff2c0)),
};

// 4-step toon ramp
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([78, 150, 220, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const col = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
function toon(hex, o = {}) { return new THREE.MeshToonNodeMaterial(Object.assign({ color: hex, gradientMap: GRAD }, o)); }
const _tmCache = new Map();
function tm(hex, o = {}) { const k = hex + JSON.stringify(o); if (!_tmCache.has(k)) _tmCache.set(k, toon(hex, o)); return _tmCache.get(k); }
function glowMat(hex, opacity = 1, additive = true, k = 1.6) {
  const m = new THREE.MeshBasicNodeMaterial({ color: col(hex, k), transparent: additive || opacity < 1, opacity, depthWrite: false, fog: false });
  if (additive) m.blending = THREE.AdditiveBlending;
  return m;
}
function solidGlow(hex, k = 1.8) { return new THREE.MeshBasicNodeMaterial({ color: col(hex, k), fog: false }); }

// ---- ink outlines (inverted hull with smoothed normals)
const _hullCache = new WeakMap();
function hullGeo(g) {
  if (_hullCache.has(g)) return _hullCache.get(g);
  let h = g.clone();
  h.deleteAttribute('normal'); h.deleteAttribute('uv');
  if (h.attributes.uv1) h.deleteAttribute('uv1');
  h = mergeVertices(h, 1e-3);
  h.computeVertexNormals();
  _hullCache.set(g, h);
  return h;
}
const _olMat = new Map();
function outlineMat(th, hex) {
  const k = th + '_' + hex;
  if (!_olMat.has(k)) {
    const m = new THREE.MeshBasicNodeMaterial({ color: hex, side: THREE.BackSide, fog: false });
    m.positionNode = TSL.positionLocal.add(TSL.normalLocal.mul(th));
    _olMat.set(k, m);
  }
  return _olMat.get(k);
}
function addOutline(mesh, th = 0.06, hex = 0x0c0a1a) {
  const o = new THREE.Mesh(hullGeo(mesh.geometry), outlineMat(th, hex));
  o.userData.outline = true; o.visible = S.outlines; o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
  return o;
}
function setOutlines(on) { R.scene.traverse((o) => { if (o.userData.outline) o.visible = on; }); }

function mk(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
  if (o.s !== undefined) { if (Array.isArray(o.s)) m.scale.set(o.s[0], o.s[1], o.s[2]); else m.scale.setScalar(o.s); }
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
  if (o.out) addOutline(m, o.out === true ? 0.06 : o.out, o.outCol);
  return m;
}

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 16, 12),
  sphLo: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 12),
  ico: new THREE.IcosahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 28),
  circle: new THREE.CircleGeometry(1, 16),
  plane: new THREE.PlaneGeometry(1, 1),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
};

// ---------------------------------------------------------------- renderer setup
async function initRenderer(canvas) {
  if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  await renderer.init();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a18);
  scene.fog = new THREE.Fog(0xffc890, 160, 900);
  R.scene = scene;
  R.camera = new THREE.PerspectiveCamera(S.fov, innerWidth / innerHeight, 0.4, 4000);
  R.camera.position.set(0, 4, 16);
  scene.add(R.camera);

  R.amb = new THREE.AmbientLight(0xffffff, 0.55);
  R.hemi = new THREE.HemisphereLight(0xaad0ff, 0x604030, 0.7);
  R.sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
  R.sun.castShadow = S.shadows;
  R.sun.shadow.mapSize.set(2048, 2048);
  const sc = R.sun.shadow.camera;
  sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 420;
  R.sun.shadow.bias = -0.0004;
  R.sun.shadow.normalBias = 0.05;
  scene.add(R.amb, R.hemi, R.sun, R.sun.target);

  // sky dome: banded gradient + sun disc
  const dir = TSL.normalize(TSL.positionLocal);
  const h = dir.y;
  const hq = TSL.floor(h.mul(12)).div(12);
  const up = TSL.mix(R.skyHor, R.skyTop, TSL.smoothstep(0.0, 0.7, hq));
  const dn = TSL.mix(R.skyBot, R.skyHor, TSL.smoothstep(-0.5, 0.0, hq));
  const base = TSL.mix(dn, up, TSL.step(0.0, hq.add(0.0001)));
  const sd = TSL.dot(dir, R.sunDir);
  const sunDisc = TSL.step(0.9965, sd).mul(R.sunCol);
  const sunHalo = TSL.step(0.985, sd).mul(R.sunCol).mul(0.25);
  const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  skyMat.colorNode = base.add(sunDisc).add(sunHalo);
  R.sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 20), skyMat);
  R.sky.frustumCulled = false; R.sky.renderOrder = -10;
  scene.add(R.sky);

  // starfield
  const starMat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff, fog: false });
  R.stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), starMat, 900);
  const d = new THREE.Object3D(), sr = mulberry(77);
  for (let i = 0; i < 900; i++) {
    const u = sr() * 2 - 1, a = sr() * TAU, r = Math.sqrt(1 - u * u);
    d.position.set(Math.cos(a) * r, u, Math.sin(a) * r).multiplyScalar(2300);
    d.scale.setScalar(2 + sr() * 5);
    d.updateMatrix();
    R.stars.setMatrixAt(i, d.matrix);
    R.stars.setColorAt(i, new THREE.Color().setHSL(sr() < 0.3 ? 0.08 : 0.6, 0.5, 0.75 + sr() * 0.25));
  }
  R.stars.frustumCulled = false;
  scene.add(R.stars);

  // post: bloom
  try {
    R.post = new THREE.PostProcessing(renderer);
    R.scenePass = TSL.pass(scene, R.camera);
    const sceneCol = R.scenePass.getTextureNode('output');
    R.bloomNode = bloom(sceneCol, 0.55, 0.5, 0.82);
    R.sceneCol = sceneCol;
    applyBloom();
  } catch (e) { console.warn('post-processing unavailable', e); R.post = null; }

  FX.init();
  addEventListener('resize', onResize);
  R.ok = true;
}
function applyBloom() {
  if (!R.post) return;
  R.post.outputNode = S.bloom ? R.sceneCol.add(R.bloomNode) : R.sceneCol;
  R.post.needsUpdate = true;
}
function onResize() {
  if (!R.renderer) return;
  R.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  R.renderer.setSize(innerWidth, innerHeight, false);
  R.camera.aspect = innerWidth / innerHeight;
  R.camera.updateProjectionMatrix();
}
function renderFrame() {
  if (R.post) R.post.render(); else R.renderer.render(R.scene, R.camera);
}

// stage look
function applyTheme(t) {
  R.skyTop.value.set(t.skyTop); R.skyHor.value.set(t.skyHor); R.skyBot.value.set(t.skyBot);
  R.sunDir.value.set(...t.sunDir).normalize(); R.sunCol.value.set(t.sunColor);
  R.scene.fog.color.set(t.fog); R.scene.fog.near = t.fogNear; R.scene.fog.far = t.fogFar;
  R.sun.color.set(t.sunColor); R.sun.intensity = t.sunI;
  R.hemi.color.set(t.hemiSky); R.hemi.groundColor.set(t.hemiGround); R.hemi.intensity = t.hemiI;
  R.amb.intensity = t.ambI; R.amb.color.set(t.amb || 0xffffff);
  R.stars.visible = t.stars;
  R.sunOffset = new V3(...t.sunDir).normalize().multiplyScalar(160);
}

// ---------------------------------------------------------------- particles / effects
class ParticlePool {
  constructor(max, additive, geo) {
    this.max = max; this.n = 0;
    this.px = new Float32Array(max); this.py = new Float32Array(max); this.pz = new Float32Array(max);
    this.vx = new Float32Array(max); this.vy = new Float32Array(max); this.vz = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.size = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.cr = new Float32Array(max); this.cg = new Float32Array(max); this.cb = new Float32Array(max);
    const mat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff, fog: false, transparent: additive, depthWrite: !additive });
    if (additive) mat.blending = THREE.AdditiveBlending;
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    R.scene.add(this.mesh);
  }
  add(p, v, c, life, size, grav = 0, drag = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.px[i] = p.x; this.py[i] = p.y; this.pz[i] = p.z;
    this.vx[i] = v.x; this.vy[i] = v.y; this.vz[i] = v.z;
    this.life[i] = this.maxLife[i] = life; this.size[i] = size; this.grav[i] = grav; this.drag[i] = drag;
    this.cr[i] = c.r; this.cg[i] = c.g; this.cb[i] = c.b;
  }
  update(dt) {
    const m = this.mesh.instanceMatrix.array, c = this.mesh.instanceColor.array;
    for (let i = 0; i < this.n;) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const l = --this.n;
        if (i !== l) {
          this.px[i] = this.px[l]; this.py[i] = this.py[l]; this.pz[i] = this.pz[l];
          this.vx[i] = this.vx[l]; this.vy[i] = this.vy[l]; this.vz[i] = this.vz[l];
          this.life[i] = this.life[l]; this.maxLife[i] = this.maxLife[l]; this.size[i] = this.size[l];
          this.grav[i] = this.grav[l]; this.drag[i] = this.drag[l];
          this.cr[i] = this.cr[l]; this.cg[i] = this.cg[l]; this.cb[i] = this.cb[l];
        }
        continue;
      }
      const dr = Math.exp(-this.drag[i] * dt);
      this.vx[i] *= dr; this.vy[i] = this.vy[i] * dr - this.grav[i] * dt; this.vz[i] *= dr;
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      i++;
    }
    for (let i = 0; i < this.n; i++) {
      const k = Math.sqrt(this.life[i] / this.maxLife[i]), s = this.size[i] * k, o = i * 16;
      m[o] = s; m[o + 1] = 0; m[o + 2] = 0; m[o + 3] = 0;
      m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 7] = 0;
      m[o + 8] = 0; m[o + 9] = 0; m[o + 10] = s; m[o + 11] = 0;
      m[o + 12] = this.px[i]; m[o + 13] = this.py[i]; m[o + 14] = this.pz[i]; m[o + 15] = 1;
      c[i * 3] = this.cr[i]; c[i * 3 + 1] = this.cg[i]; c[i * 3 + 2] = this.cb[i];
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.n = 0; }
}

const FX = {
  hot: null, solid: null, flashes: [], rings: [], _v: new V3(), _c: new THREE.Color(),
  init() {
    this.hot = new ParticlePool(5000, true, new THREE.OctahedronGeometry(0.5, 0));
    this.solid = new ParticlePool(1200, false, new THREE.BoxGeometry(0.7, 0.7, 0.7));
    for (let i = 0; i < 40; i++) {
      const m = glowMat(0xffffff, 1, true, 1);
      const mesh = new THREE.Mesh(GEO.sphLo, m); mesh.visible = false; mesh.frustumCulled = false;
      R.scene.add(mesh);
      this.flashes.push({ mesh, mat: m, t: 0, dur: 1, size: 1, on: false });
    }
    for (let i = 0; i < 24; i++) {
      const m = glowMat(0xffffff, 1, true, 1);
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 36), m); mesh.visible = false; mesh.frustumCulled = false;
      R.scene.add(mesh);
      this.rings.push({ mesh, mat: m, t: 0, dur: 1, size: 1, on: false });
    }
  },
  color(hex, k = 1) { return this._c.set(hex).multiplyScalar(k); },
  spark(p, v, hex, life = 0.5, size = 0.4, grav = 0, drag = 1, k = 1.6) { this.hot.add(p, v, this.color(hex, k), life, size, grav, drag); },
  chunk(p, v, hex, life = 1.2, size = 0.6, grav = 12) { this.solid.add(p, v, this.color(hex, 1), life, size, grav, 0.3); },
  burst(p, n, speed, hex, life = 0.6, size = 0.5, spread = 1) {
    const v = this._v;
    for (let i = 0; i < n; i++) {
      v.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(speed * rnd(0.3, 1) * spread);
      this.spark(p, v, hex, life * rnd(0.6, 1.2), size * rnd(0.5, 1.2), 0, 1.5);
    }
  },
  flash(p, size, hex, dur = 0.35) {
    const f = this.flashes.find((x) => !x.on) || this.flashes[0];
    f.on = true; f.t = 0; f.dur = dur; f.size = size;
    f.mesh.position.copy(p); f.mesh.visible = true; f.mat.color.set(col(hex, 1.5));
  },
  ring(p, size, hex, dur = 0.5, orient) {
    const f = this.rings.find((x) => !x.on) || this.rings[0];
    f.on = true; f.t = 0; f.dur = dur; f.size = size;
    f.mesh.position.copy(p); f.mesh.visible = true; f.mat.color.set(col(hex, 1.5));
    if (orient) f.mesh.quaternion.copy(orient); else f.mesh.quaternion.copy(R.camera.quaternion);
  },
  explosion(p, size = 1, hex = 0xff9a30) {
    this.flash(p, 3.2 * size, 0xfff0b0, 0.28);
    this.flash(p, 5.5 * size, hex, 0.5);
    this.burst(p, Math.floor(26 * size), 26 * size, hex, 0.9, 0.9 * size);
    this.burst(p, Math.floor(14 * size), 18 * size, 0xffee90, 0.5, 0.6 * size);
    const v = this._v;
    for (let i = 0; i < 8 * size; i++) {
      v.set(rnd(-1, 1), rnd(-0.2, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(8, 22) * size);
      this.chunk(p, v, pick([0x4a3a5a, 0x2a2a3a, 0x6a4a3a]), rnd(0.8, 1.6), rnd(0.4, 0.9) * size, 6);
    }
    this.ring(p, 4 * size, 0xffe0a0, 0.45);
  },
  update(dt) {
    this.hot.update(dt); this.solid.update(dt);
    for (const f of this.flashes) {
      if (!f.on) continue;
      f.t += dt; const k = f.t / f.dur;
      if (k >= 1) { f.on = false; f.mesh.visible = false; continue; }
      f.mesh.scale.setScalar(f.size * (0.35 + easeOut(k) * 0.9));
      f.mat.opacity = (1 - k) * (1 - k);
    }
    for (const f of this.rings) {
      if (!f.on) continue;
      f.t += dt; const k = f.t / f.dur;
      if (k >= 1) { f.on = false; f.mesh.visible = false; continue; }
      f.mesh.scale.setScalar(f.size * (0.2 + easeOut(k) * 1.6));
      f.mat.opacity = 1 - k;
    }
  },
  clear() { this.hot.clear(); this.solid.clear(); for (const f of [...this.flashes, ...this.rings]) { f.on = false; f.mesh.visible = false; } },
};

// ---------------------------------------------------------------- models
function wingGeo(side, span = 3.1) {
  const s = new THREE.Shape();
  const pts = [[0.2, 0.5], [span, -1.0], [span, -1.7], [0.2, -1.5]];
  pts.forEach((p, i) => (i ? s.lineTo(p[0] * side, p[1]) : s.moveTo(p[0] * side, p[1])));
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
}
const _wingGeos = { 1: null, '-1': null };

// Hero-fighter model used for the player and the wingmen.
function buildFighter(c) {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  if (!_wingGeos[1]) { _wingGeos[1] = wingGeo(1); _wingGeos['-1'] = wingGeo(-1); }
  const body = mk(GEO.capsule, M(c.body), { r: [Math.PI / 2, 0, 0], s: [0.9, 1.7, 0.9], out: 0.07 });
  const nose = mk(GEO.cone, M(c.accent), { p: [0, 0, -2.25], r: [-Math.PI / 2, 0, 0], s: [0.42, 1.5, 0.42], out: 0.07 });
  const canopy = mk(GEO.sph, M(c.canopy, { emissive: col(c.canopy, 0.35) }), { p: [0, 0.32, -0.45], s: [0.42, 0.34, 0.85], out: 0.05 });
  const fin = mk(GEO.box, M(c.accent), { p: [0, 0.6, 1.1], r: [0.35, 0, 0], s: [0.1, 0.95, 0.9], out: 0.05 });
  g.add(body, nose, canopy, fin);
  const mkWing = (side) => {
    const piv = new THREE.Group(); piv.position.set(0.35 * side, -0.05, 0);
    const w = mk(side > 0 ? _wingGeos[1] : _wingGeos['-1'], M(c.body), { p: [0, -0.06, 0], r: [-Math.PI / 2, 0, 0], out: 0.05 });
    const tip = mk(GEO.box, M(c.accent), { p: [3.0 * side, 0, 1.35], s: [0.4, 0.2, 0.9], out: 0.04 });
    const stripe = mk(GEO.box, M(c.trim), { p: [1.6 * side, 0.07, 0.55], r: [0, -0.28 * side, 0], s: [2.2, 0.05, 0.22], out: 0 });
    const cannon = mk(GEO.cyl, M(0x333a4a), { p: [2.55 * side, -0.08, -0.55], r: [Math.PI / 2, 0, 0], s: [0.1, 1.4, 0.1], out: 0.04 });
    const pod = mk(GEO.cyl, M(c.accent), { p: [0.95 * side, 0, 0.75], r: [Math.PI / 2, 0, 0], s: [0.3, 1.5, 0.3], out: 0.05 });
    piv.add(w, tip, stripe, cannon, pod);
    return piv;
  };
  const wingL = mkWing(-1), wingR = mkWing(1);
  g.add(wingL, wingR);
  const glows = [];
  for (const sx of [-0.95, 0.95]) {
    const gm = new THREE.Mesh(GEO.circle, glowMat(c.glow, 0.9, true, 1.8));
    gm.position.set(sx, 0, 1.55); gm.scale.setScalar(0.28);
    g.add(gm); glows.push(gm);
    const cone = new THREE.Mesh(GEO.cone, glowMat(c.glow, 0.5, true, 1.4));
    cone.position.set(sx, 0, 1.9); cone.rotation.x = Math.PI / 2; cone.scale.set(0.2, 1.4, 0.2);
    g.add(cone); glows.push(cone);
  }
  return { group: g, wingL, wingR, glows, mats, body };
}
const PALETTES = {
  fob: { body: 0xe9eef7, accent: 0x2a62d8, trim: 0xf08a24, canopy: 0x4fd0ff, glow: 0x5ad0ff },
  bolt: { body: 0xf3f0d8, accent: 0xe5b81a, trim: 0x2a62d8, canopy: 0x7ae0ff, glow: 0xffd060 },
  kestrel: { body: 0xdde6f0, accent: 0x6a3fd0, trim: 0xe84a6a, canopy: 0x9ae8ff, glow: 0xc088ff },
  newt: { body: 0xe6f0dc, accent: 0x2fae5a, trim: 0xe8e040, canopy: 0x9af0c0, glow: 0x70ff9a },
};

// Enemy models (each call builds fresh materials so hit-flash can be per instance)
function flashable(g, mats) { g.userData.mats = mats; return g; }
function buildDrone() {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  g.add(mk(GEO.octa, M(0x7a3fb5), { s: [1.0, 0.5, 1.7], out: 0.07 }));
  g.add(mk(GEO.sph, M(0xff3050, { emissive: col(0xff2040, 0.9) }), { p: [0, 0.05, -0.9], s: [0.38, 0.3, 0.3] }));
  for (const sx of [-1, 1]) {
    g.add(mk(GEO.box, M(0x40306a), { p: [1.35 * sx, 0, 0.3], r: [0, 0.25 * sx, -0.5 * sx], s: [1.9, 0.1, 1.1], out: 0.05 }));
    g.add(mk(GEO.cyl, M(0x222233), { p: [1.9 * sx, -0.2, -0.3], r: [Math.PI / 2, 0, 0], s: [0.07, 0.9, 0.07] }));
  }
  const gl = new THREE.Mesh(GEO.circle, glowMat(0xff4060, 0.8, true, 1.6)); gl.position.set(0, 0, 1.55); gl.scale.setScalar(0.35); g.add(gl);
  return flashable(g, mats);
}
function buildSwooper() {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  g.add(mk(GEO.cone, M(0xe86a28), { r: [-Math.PI / 2, 0, 0], s: [0.7, 3.4, 0.4], out: 0.07 }));
  g.add(mk(GEO.box, M(0x401a10), { p: [0, 0, 0.5], s: [4.2, 0.1, 1.3], out: 0.05 }));
  g.add(mk(GEO.sph, M(0xfff070, { emissive: col(0xffd040, 0.9) }), { p: [0, 0.25, -0.2], s: [0.28, 0.2, 0.5] }));
  const gl = new THREE.Mesh(GEO.circle, glowMat(0xff9040, 0.8, true, 1.6)); gl.position.set(0, 0, 1.2); gl.scale.setScalar(0.4); g.add(gl);
  return flashable(g, mats);
}
function buildMine() {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  g.add(mk(GEO.ico, M(0x555570), { s: 1.3, out: 0.09 }));
  for (let i = 0; i < 10; i++) {
    const d = new V3().setFromSphericalCoords(1, Math.acos(1 - 2 * (i + 0.5) / 10), i * 2.4);
    const sp = mk(GEO.cone, M(0xaa2040), { s: [0.22, 0.9, 0.22] });
    sp.position.copy(d).multiplyScalar(1.45);
    sp.quaternion.setFromUnitVectors(new V3(0, 1, 0), d);
    g.add(sp);
  }
  const light = new THREE.Mesh(GEO.sph, solidGlow(0xff2040, 2)); light.scale.setScalar(0.5); g.add(light);
  g.userData.light = light;
  return flashable(g, mats);
}
function buildTurret() {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  g.add(mk(GEO.cyl, M(0x59506a), { p: [0, 0.6, 0], s: [1.9, 1.2, 1.9], out: 0.07 }));
  const head = new THREE.Group(); head.position.y = 1.5;
  head.add(mk(GEO.sph, M(0x7a3fb5), { s: [1.3, 1.0, 1.3], out: 0.07 }));
  const barrel = mk(GEO.cyl, M(0x2a2a3a), { p: [0, 0.1, -1.4], r: [Math.PI / 2, 0, 0], s: [0.25, 2.0, 0.25], out: 0.05 });
  head.add(barrel);
  head.add(mk(GEO.sph, M(0xff3050, { emissive: col(0xff2040, 0.9) }), { p: [0, 0.35, -0.9], s: 0.28 }));
  g.add(head);
  g.userData.head = head;
  return flashable(g, mats);
}
function buildGunship() {
  const g = new THREE.Group(), mats = [];
  const M = (hex, o) => { const m = toon(hex, o); mats.push(m); return m; };
  g.add(mk(GEO.box, M(0x5a4a7a), { s: [5.5, 1.8, 7.5], out: 0.1 }));
  g.add(mk(GEO.box, M(0x3a2a5a), { p: [0, 1.1, 1.5], s: [3.2, 0.9, 3.5], out: 0.08 }));
  g.add(mk(GEO.sph, M(0xff3050, { emissive: col(0xff2040, 1.0) }), { p: [0, 0.3, -3.8], s: [0.9, 0.7, 0.7], out: 0.05 }));
  for (const sx of [-1, 1]) {
    g.add(mk(GEO.box, M(0x6a5a8a), { p: [4.2 * sx, -0.2, 0.8], r: [0, 0, 0.15 * sx], s: [3.2, 0.35, 4.4], out: 0.08 }));
    g.add(mk(GEO.cyl, M(0x222233), { p: [5.0 * sx, -0.5, -1.6], r: [Math.PI / 2, 0, 0], s: [0.35, 3.0, 0.35], out: 0.05 }));
    const gl = new THREE.Mesh(GEO.circle, glowMat(0xff4060, 0.8, true, 1.6)); gl.position.set(1.8 * sx, 0, 3.8); gl.scale.setScalar(0.9); g.add(gl);
  }
  return flashable(g, mats);
}
function buildTower(h = 14, w = 5, hex = 0x8a7aa8) {
  const g = new THREE.Group(), mats = [];
  const M = (c, o) => { const m = toon(c, o); mats.push(m); return m; };
  g.add(mk(GEO.box, M(hex), { p: [0, h / 2, 0], s: [w, h, w], out: 0.1 }));
  g.add(mk(GEO.box, M(0x4a3a68), { p: [0, h + 0.6, 0], s: [w * 1.2, 1.2, w * 1.2], out: 0.08 }));
  for (let y = 2; y < h - 1; y += 2.2) {
    for (const sx of [-1, 1]) g.add(mk(GEO.box, solidGlow(0xffd870, 1.4), { p: [w * 0.5 * sx, y, 0], s: [0.1, 0.6, w * 0.5], cast: false }));
  }
  g.add(mk(GEO.cyl, M(0x2a2a3a), { p: [0, h + 2.4, 0], s: [0.15, 2.4, 0.15] }));
  g.add(mk(GEO.sph, solidGlow(0xff3050, 2), { p: [0, h + 3.6, 0], s: 0.35, cast: false }));
  return flashable(g, mats);
}
function buildAsteroid(r, hex = 0x7a6a8a, seed = 1) {
  const sr = mulberry(seed * 977 + 13);
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position;
  const v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.78 + 0.4 * Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 - seed) + (sr() - 0.5) * 0.12;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y * 0.9, v.z);
  }
  geo.computeVertexNormals();
  const mats = [toon(hex)];
  const m = mk(geo, mats[0], { s: r, out: 0.04 / Math.max(1, r * 0.2) });
  const g = new THREE.Group(); g.add(m);
  return flashable(g, mats);
}
function buildPickup(kind) {
  const g = new THREE.Group();
  const cols = { laser: 0x40a0ff, bomb: 0xff5030, wrench: 0xf0f0f0, health: 0x40ff90, life: 0xffd030 };
  const c = cols[kind] || 0xffffff;
  const ring = new THREE.Mesh(GEO.torus, glowMat(c, 0.9, true, 1.4)); ring.scale.setScalar(1.7);
  g.add(ring);
  let core;
  if (kind === 'laser') core = mk(GEO.octa, solidGlow(c, 1.6), { s: [0.5, 0.9, 0.5], out: 0.05 });
  else if (kind === 'bomb') core = mk(GEO.sph, solidGlow(c, 1.6), { s: 0.7, out: 0.06 });
  else if (kind === 'wrench') { core = new THREE.Group(); core.add(mk(GEO.box, solidGlow(c, 1.1), { s: [0.25, 1.3, 0.25], out: 0.05 }), mk(GEO.box, solidGlow(c, 1.1), { p: [0, 0.65, 0], s: [0.8, 0.28, 0.25], out: 0.05 })); core.rotation.z = 0.7; }
  else core = mk(GEO.box, solidGlow(c, 1.5), { s: 0.8, out: 0.05 });
  g.add(core);
  g.userData.spin = [ring, core];
  return g;
}
function buildRing(kind) { // collectible rings
  const c = kind === 'gold' ? 0xffd030 : 0xc8e0ff;
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.TorusGeometry(1, kind === 'gold' ? 0.16 : 0.11, 8, 30), glowMat(c, 1, false, kind === 'gold' ? 1.8 : 1.4));
  t.scale.setScalar(kind === 'gold' ? 4.2 : 3.2);
  g.add(t);
  const t2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 30), glowMat(c, 0.6, true, 1.2)); t2.scale.setScalar(kind === 'gold' ? 4.9 : 3.8);
  g.add(t2);
  g.userData.spin = [t2];
  return g;
}
