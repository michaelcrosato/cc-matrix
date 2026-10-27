// ---------------------------------------------------------------- Renderer: WebGPU only, cel-shaded toon materials + inverted-hull outlines
const R = { renderer: null, scene: null, world: null, cams: [], cam: null, views: [], shake: 0, flashT: 0 };
const GEO = {};
const geo = (key, make) => { if (!GEO[key]) { GEO[key] = make(); GEO[key].userData.shared = true; } return GEO[key]; };
const G = {
  box: (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  sph: (r, ws = 14, hs = 10) => geo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)),
  cyl: (rt, rb, h, seg = 10) => geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r, h, seg = 10) => geo(`n${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  tor: (r, t, rs = 8, ts = 20) => geo(`t${r},${t},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts)),
  ico: (r, d = 0) => geo(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  oct: (r) => geo(`o${r}`, () => new THREE.OctahedronGeometry(r)),
  dod: (r) => geo(`d${r}`, () => new THREE.DodecahedronGeometry(r)),
  plane: (w, h) => geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
};
let toonGradient = null;
const matCache = {};
function gradientMap() {
  if (!toonGradient) {
    toonGradient = new THREE.DataTexture(new Uint8Array([88, 170, 255]), 3, 1, THREE.RedFormat);
    toonGradient.minFilter = toonGradient.magFilter = THREE.NearestFilter; toonGradient.needsUpdate = true;
  }
  return toonGradient;
}
const toon = (hex, emissive = 0x000000) => { const k = 't' + hex + ':' + emissive; return matCache[k] || (matCache[k] = new THREE.MeshToonNodeMaterial({ color: hex, emissive, gradientMap: gradientMap() })); };
const unlit = (hex, opts = {}) => { const k = 'u' + hex + JSON.stringify(opts); return matCache[k] || (matCache[k] = new THREE.MeshBasicNodeMaterial(Object.assign({ color: hex }, opts))); };
const outlineCache = {};
const outlineMat = (th) => outlineCache[th] || (outlineCache[th] = (() => { const m = new THREE.MeshBasicNodeMaterial({ color: 0x120c24, side: THREE.BackSide }); m.positionNode = positionLocal.add(normalLocal.mul(th)); return m; })());
const flashMat = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
// outline hull geometry: normals welded per position so hard-edged shapes stay watertight
function hullGeo(g) {
  if (g.userData.hullGeo) return g.userData.hullGeo;
  const c = g.clone(), p = c.attributes.position, n = c.attributes.normal, map = new Map(), key = (i) => Math.round(p.getX(i) * 500) + ',' + Math.round(p.getY(i) * 500) + ',' + Math.round(p.getZ(i) * 500);
  for (let i = 0; i < p.count; i++) { const k = key(i); let a = map.get(k); if (!a) map.set(k, a = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
  for (let i = 0; i < p.count; i++) { const a = map.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  c.userData.shared = g.userData.shared; g.userData.hullGeo = c; return c;
}
// mesh with ink outline (inverted hull child)
function mk(g, m, o = {}) {
  const mesh = new THREE.Mesh(g, m); mesh.castShadow = o.shadow !== false; mesh.receiveShadow = o.receive !== false;
  if (o.outline !== 0) { const hull = new THREE.Mesh(hullGeo(g), outlineMat(o.outline || 0.1)); hull.userData.hull = true; mesh.add(hull); }
  if (o.pos) mesh.position.set(...o.pos); if (o.rot) mesh.rotation.set(...o.rot); if (o.scale) { if (typeof o.scale === 'number') mesh.scale.setScalar(o.scale); else mesh.scale.set(...o.scale); }
  return mesh;
}
// hit-flash: swap all non-hull meshes to flat white briefly
function setFlash(obj, on) {
  obj.traverse((o) => { if (!o.isMesh || o.userData.hull || o.userData.noflash) return; if (on) { if (!o.userData.orig) { o.userData.orig = o.material; o.material = flashMat; } } else if (o.userData.orig) { o.material = o.userData.orig; o.userData.orig = null; } });
}
function disposeTree(obj) { obj.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); }

// sky + palette uniforms (stepped, cel-style bands)
const SKY = { top: uniform(new THREE.Color(0x3a7bd5)), hor: uniform(new THREE.Color(0xbfe9ff)), bot: uniform(new THREE.Color(0x335566)), sunDir: uniform(new THREE.Vector3(0.4, 0.5, -0.75).normalize()), sunCol: uniform(new THREE.Color(0xfff2b0)), bands: uniform(7) };
const GROUND = { a: uniform(new THREE.Color(0x6bc46d)), b: uniform(new THREE.Color(0x58b062)), stripe: uniform(0.9) };
function makeSky() {
  const dir = normalize(positionLocal), y = dir.y;
  const t = floor(tslMax(y, float(0)).mul(SKY.bands)).div(SKY.bands);
  let col = mix(SKY.hor, SKY.top, t.pow(0.7));
  col = mix(col, SKY.bot, float(1).sub(smoothstep(-0.35, 0.0, y)));
  const sd = dot(dir, SKY.sunDir);
  col = mix(col, SKY.sunCol, tslMax(step(0.9975, sd), step(0.985, sd).mul(0.35)));
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false, depthWrite: false }); m.colorNode = col;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 20), m); mesh.frustumCulled = false; mesh.renderOrder = -10; return mesh;
}
function makeGroundMat() {
  const gx = positionWorld.x, gz = positionWorld.z;
  const band = step(0.5, fract(gz.mul(1 / 70))), patch = step(0.0, sin(gx.mul(0.021)).mul(sin(gz.mul(0.017))));
  const base = mix(GROUND.a, GROUND.b, patch), col = mix(base, base.mul(GROUND.stripe), band);
  const m = new THREE.MeshToonNodeMaterial({ gradientMap: gradientMap() }); m.colorNode = col; return m;
}

R.init = async function (canvas) {
  if (!navigator.gpu) throw new Error('WebGPU is not available in this browser. Star Paw 64 requires WebGPU (no fallback).');
  const r = this.renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: false });
  await r.init();
  if (r.backend && r.backend.isWebGPUBackend === false) throw new Error('WebGPU backend could not be started (WebGL fallback is disabled by design).');
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(innerWidth, innerHeight, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.setClearColor(0x0b0820, 1);
  const scene = this.scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xbfe9ff, 120, 620);
  this.world = new THREE.Group(); scene.add(this.world);
  this.hemi = new THREE.HemisphereLight(0xdff2ff, 0x6a7a55, 1.1); scene.add(this.hemi);
  const sun = this.sun = new THREE.DirectionalLight(0xfff0cc, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 400; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  this.sky = makeSky(); scene.add(this.sky);
  this.groundMat = makeGroundMat();
  this.cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 2200); this.cams = [this.cam];
  this.sunOffset = new THREE.Vector3(60, 120, 50);
  addEventListener('resize', () => this.resize()); this.resize();
};
R.resize = function () {
  this.w = innerWidth; this.h = innerHeight; this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.renderer.setSize(this.w, this.h, false);
  const hud = $('#hud'), dpr = Math.min(devicePixelRatio || 1, 2); hud.width = Math.floor(this.w * dpr); hud.height = Math.floor(this.h * dpr);
};
R.setPalette = function (p) {
  SKY.top.value.set(p.top); SKY.hor.value.set(p.hor); SKY.bot.value.set(p.bot || p.hor); SKY.sunCol.value.set(p.sun || 0xfff2b0); if (p.sunDir) SKY.sunDir.value.set(...p.sunDir).normalize();
  this.scene.fog.color.set(p.fog || p.hor); this.scene.fog.near = p.fogNear ?? 120; this.scene.fog.far = p.fogFar ?? 620;
  this.hemi.color.set(p.hemiSky || 0xdff2ff); this.hemi.groundColor.set(p.hemiGround || 0x6a7a55); this.hemi.intensity = p.hemiI ?? 1.1; this.sun.color.set(p.sunLight || 0xfff0cc); this.sun.intensity = p.sunI ?? 2.3;
  if (p.ga) { GROUND.a.value.set(p.ga); GROUND.b.value.set(p.gb); }
  this.sunOffset.set(...(p.sunDir ? p.sunDir.map((v) => v * 140) : [60, 120, 50]));
};
R.followSun = function (p) { this.sun.position.copy(p).add(this.sunOffset); this.sun.target.position.copy(p); this.sun.target.updateMatrixWorld(); };
R.clearWorld = function () { for (const c of [...this.world.children]) { this.world.remove(c); disposeTree(c); } };
// views: [{cam, x,y,w,h}] in CSS pixels, y from top
R.draw = function (views) {
  const r = this.renderer; this.sky.position.copy(views[0].cam.position);
  views.forEach((v, i) => {
    this.sky.position.copy(v.cam.position);
    r.autoClear = i === 0; r.setViewport(v.x, v.y, v.w, v.h); r.setScissor(v.x, v.y, v.w, v.h); r.setScissorTest(true); r.render(this.scene, v.cam);
  });
};

// ---------------------------------------------------------------- FX: sparks (instanced), blasts (pooled), debris (Rapier), rings
const FX = {
  maxSparks: 4000, sparks: null, sp: [], blasts: [], blastFree: [], rings: [], sparkDummy: new THREE.Object3D(), tmpC: new THREE.Color(),
  init() {
    const m = new THREE.InstancedMesh(G.oct(0.5), new THREE.MeshBasicNodeMaterial({ color: 0xffffff }), this.maxSparks);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.setColorAt(0, new THREE.Color(1, 1, 1)); this.sparks = m; R.scene.add(m);
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshBasicNodeMaterial({ color: 0xffcc33, transparent: true }); const mesh = new THREE.Mesh(G.ico(1, 1), mat); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 5;
      R.scene.add(mesh); this.blastFree.push({ mesh, mat, t: 0, dur: 1, size: 1, active: false });
    }
  },
  reset() { this.sp.length = 0; for (const b of this.blasts) { b.mesh.visible = false; b.active = false; this.blastFree.push(b); } this.blasts.length = 0; for (const r of this.rings) { R.scene.remove(r.mesh); } this.rings.length = 0; },
  spark(pos, vel, color, life, size, grav = 0, drag = 0.6) { if (this.sp.length >= this.maxSparks) this.sp.shift(); this.sp.push({ p: pos.clone(), v: vel, c: new THREE.Color(color), l: life, ml: life, s: size, g: grav, d: drag }); },
  burst(pos, color, n, speed, life, size, grav = 0) { for (let i = 0; i < n; i++) { const v = V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(speed * rr(0.3, 1)); this.spark(pos, v, color, life * rr(0.6, 1.2), size * rr(0.6, 1.2), grav); } },
  blast(pos, size, color = 0xffcc33, dur = 0.5) {
    const b = this.blastFree.pop() || this.blasts.shift(); if (!b) return;
    b.mesh.position.copy(pos); b.mat.color.set(color); b.mat.opacity = 1; b.t = 0; b.dur = dur; b.size = size; b.mesh.visible = true; b.mesh.scale.setScalar(0.01); b.active = true; this.blasts.push(b);
  },
  explosion(pos, size = 1, opt = {}) {
    this.blast(pos, 3.2 * size, 0xfff3a0, 0.28); this.blast(pos, 4.6 * size, 0xff9020, 0.5); if (size > 1.2) this.blast(pos, 7 * size, 0xff4a1a, 0.7);
    this.burst(pos, 0xffd040, Math.floor(18 * size), 24 * size, 0.7, 0.5 * size); this.burst(pos, 0xff5a20, Math.floor(12 * size), 16 * size, 1.0, 0.7 * size);
    this.burst(pos, 0x2a2238, Math.floor(8 * size), 10 * size, 1.2, 0.8 * size);
    if (opt.debris !== false) Phys.debris(pos, Math.min(10, Math.ceil(3 * size)), opt.color || 0x888899, size);
    A.play(size > 2.5 ? 'bigboom' : size > 1.3 ? 'boom' : 'smallboom', opt.pan || 0);
  },
  ring(pos, color, size = 12, dur = 0.5, normal) {
    const mat = new THREE.MeshBasicNodeMaterial({ color, transparent: true, side: THREE.DoubleSide }); const mesh = new THREE.Mesh(G.tor(1, 0.06, 6, 36), mat); mesh.position.copy(pos);
    if (normal) mesh.quaternion.setFromUnitVectors(V3(0, 0, 1), normal); R.scene.add(mesh); this.rings.push({ mesh, mat, t: 0, dur, size });
  },
  update(dt) {
    const d = this.sparkDummy, m = this.sparks; let n = 0;
    for (let i = this.sp.length - 1; i >= 0; i--) {
      const s = this.sp[i]; s.l -= dt; if (s.l <= 0) { this.sp.splice(i, 1); continue; }
      s.v.y -= s.g * dt; s.v.multiplyScalar(Math.max(0, 1 - s.d * dt)); s.p.addScaledVector(s.v, dt);
    }
    for (const s of this.sp) {
      const k = s.l / s.ml; d.position.copy(s.p); d.scale.setScalar(s.s * (0.25 + k)); d.rotation.set(s.l * 6, s.l * 4, 0); d.updateMatrix();
      m.setMatrixAt(n, d.matrix); this.tmpC.copy(s.c).lerp(WHITE, k > 0.8 ? 0.7 : 0); m.setColorAt(n, this.tmpC); n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i]; b.t += dt; const k = b.t / b.dur;
      if (k >= 1) { b.mesh.visible = false; b.active = false; this.blasts.splice(i, 1); this.blastFree.push(b); continue; }
      b.mesh.scale.setScalar(b.size * (1 - Math.pow(1 - k, 3)) + 0.01); b.mat.opacity = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt; const k = r.t / r.dur; if (k >= 1) { R.scene.remove(r.mesh); r.mat.dispose(); this.rings.splice(i, 1); continue; }
      r.mesh.scale.setScalar(r.size * k + 0.1); r.mat.opacity = 1 - k;
    }
  },
};
const WHITE = new THREE.Color(1, 1, 1);
