// ===== 03_gfx: WebGPU renderer, cel-shading (toon gradient + inverted-hull ink outlines), sky, particles =====
const OUTLINE_COLOR = 0x120b22;
const _hullCache = new WeakMap();
const _outMats = new Map();
const _toonMats = new Map();

function hullGeometry(geo) {
  let h = _hullCache.get(geo);
  if (h) return h;
  h = geo.clone();
  h.deleteAttribute('normal'); if (h.attributes.uv) h.deleteAttribute('uv');
  h = BufferGeometryUtils.mergeVertices(h, 1e-3);
  h.computeVertexNormals();
  _hullCache.set(geo, h);
  return h;
}
function outlineMaterial(t, nofog = false) {
  const key = Math.round(t * 1000) + (nofog ? 'n' : '');
  let m = _outMats.get(key);
  if (!m) {
    m = new THREE.MeshBasicNodeMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide, fog: !nofog });
    m.positionNode = positionLocal.add(normalLocal.mul(t));
    _outMats.set(key, m);
  }
  return m;
}
let _gradTex = null;
function gradientTex() {
  if (_gradTex) return _gradTex;
  // 4-band cel ramp
  const t = new THREE.DataTexture(new Uint8Array([62, 118, 185, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return (_gradTex = t);
}
function toon(hex, emissive = 0x000000, ei = 1, extra = {}) {
  const key = hex + '/' + emissive + '/' + ei + '/' + JSON.stringify(extra);
  let m = _toonMats.get(key);
  if (!m) {
    m = new THREE.MeshToonNodeMaterial({ color: hex, gradientMap: gradientTex(), emissive, emissiveIntensity: ei, ...extra });
    _toonMats.set(key, m);
  }
  return m;
}
function glow(hex, o = {}) {
  return new THREE.MeshBasicNodeMaterial({ color: hex, fog: false, ...o });
}
const _glowCache = new Map();
function glowC(hex) { let m = _glowCache.get(hex); if (!m) { m = glow(hex); _glowCache.set(hex, m); } return m; }

// Mesh factory: toon material + optional inked outline hull.
function mk(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.shadow !== false;
  m.receiveShadow = !!o.recv;
  if (o.outline) {
    const h = new THREE.Mesh(hullGeometry(geo), outlineMaterial(o.outline, !!o.nofog));
    h.userData.isOutline = true; h.visible = S().outlines;
    m.add(h);
  }
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scl) m.scale.set(...o.scl);
  return m;
}

const Gfx = {
  renderer: null, scene: null, camera: null, post: null, usePost: false, bloomNode: null,
  sun: null, hemi: null, skyGroup: null, skyU: null, stars: null, dust: null, planets: [],
  async init(canvas) {
    const r = this.renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
    await r.init();
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 4200);
    this.scene.add(this.camera);
    this.scene.fog = new THREE.FogExp2(0x1a1240, 0.0026);

    this.hemi = new THREE.HemisphereLight(0xbdd0ff, 0x4a3470, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 320;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.rim = new THREE.DirectionalLight(0x80b0ff, 0.7); this.rim.position.set(-30, 10, -60); this.scene.add(this.rim);

    this.buildSky();
    this.buildDust();
    Fx.init(this.scene);
    try {
      const sp = pass(this.scene, this.camera);
      const col = sp.getTextureNode('output');
      this.bloomNode = bloom(col, 0.5, 0.45, 0.8);
      this.post = new THREE.PostProcessing(r);
      this.post.outputNode = col.add(this.bloomNode);
      this.usePost = true;
    } catch (e) { console.warn('Bloom unavailable, rendering directly', e); this.usePost = false; }
    addEventListener('resize', () => this.resize());
    Settings.listeners.push((k) => { if (k === 'outlines' || k === '*') this.applyOutlineSetting(); if (k === 'shadows' || k === '*') this.sun.castShadow = S().shadows; });
    this.sun.castShadow = S().shadows;
  },
  resize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
  },
  applyOutlineSetting() { this.scene.traverse((o) => { if (o.userData && o.userData.isOutline) o.visible = S().outlines; }); },
  render() {
    if (this.usePost && S().bloom) {
      try { this.post.render(); return; } catch (e) { console.warn('Post failed, falling back', e); this.usePost = false; }
    }
    this.renderer.render(this.scene, this.camera);
  },
  buildSky() {
    this.skyU = { top: uniform(new THREE.Color(0x0b0630)), mid: uniform(new THREE.Color(0x3a1d6e)), bot: uniform(new THREE.Color(0x120a2a)) };
    const h = positionLocal.normalize().y;
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    m.colorNode = mix(mix(this.skyU.bot, this.skyU.mid, smoothstep(-0.45, 0.02, h)), this.skyU.top, smoothstep(0.0, 0.8, h));
    this.skyGroup = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), m);
    dome.renderOrder = -10; dome.frustumCulled = false;
    this.skyGroup.add(dome);
    // stars
    const N = 1100; const geo = new THREE.TetrahedronGeometry(1, 0);
    const sm = new THREE.MeshBasicNodeMaterial({ color: 0xffffff, fog: false });
    this.stars = new THREE.InstancedMesh(geo, sm, N);
    const d = new THREE.Object3D(); const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(2800);
      d.position.copy(v); const s = rr(2.5, 8); d.scale.set(s, s, s); d.lookAt(0, 0, 0); d.updateMatrix();
      this.stars.setMatrixAt(i, d.matrix);
      c.setHSL(rr(0.5, 0.75), 0.5, rr(0.75, 1)); this.stars.setColorAt(i, c);
    }
    this.stars.frustumCulled = false;
    this.skyGroup.add(this.stars);
    this.scene.add(this.skyGroup);
    this.backdrop = new THREE.Group(); this.skyGroup.add(this.backdrop);
  },
  setBackdrop(list) {
    while (this.backdrop.children.length) this.backdrop.remove(this.backdrop.children[0]);
    this.planets = [];
    for (const p of list || []) {
      const g = new THREE.Group();
      const nf = { fog: false };
      const body = mk(new THREE.SphereGeometry(p.r, 32, 20), toon(p.color, p.emissive || p.color, 0.25, nf), { shadow: false, outline: p.r * 0.012, nofog: true });
      g.add(body);
      if (p.ring) {
        const ring = mk(new THREE.TorusGeometry(p.r * 1.6, p.r * 0.14, 6, 48), toon(p.ring, p.ring, 0.2, nf), { shadow: false, outline: p.r * 0.008, nofog: true });
        ring.rotation.x = Math.PI / 2.4; ring.scale.z = 0.12; g.add(ring);
      }
      if (p.moon) {
        const moon = mk(new THREE.SphereGeometry(p.r * 0.2, 16, 10), toon(0xd8d2c8, 0xd8d2c8, 0.2, nf), { shadow: false, outline: p.r * 0.004, nofog: true });
        moon.position.set(p.r * 1.9, p.r * 0.4, 0); g.add(moon);
      }
      g.position.set(...p.pos); g.userData.spin = p.spin || 0.01;
      this.backdrop.add(g); this.planets.push(g);
    }
  },
  setEnv(env) {
    this.skyU.top.value.set(env.skyTop); this.skyU.mid.value.set(env.skyMid); this.skyU.bot.value.set(env.skyBot);
    this.scene.fog.color.set(env.fog); this.scene.fog.density = env.fogDensity;
    this.hemi.color.set(env.hemiSky); this.hemi.groundColor.set(env.hemiGround); this.hemi.intensity = env.hemiI;
    this.sun.color.set(env.sun); this.sun.intensity = env.sunI;
    this.sunDir = new THREE.Vector3(...env.sunDir).normalize();
    this.rim.color.set(env.rim || 0x80b0ff);
    this.stars.visible = env.stars !== false;
    this.setBackdrop(env.planets);
    this.dust.material.color.set(env.dust || 0xbfd0ff);
  },
  buildDust() {
    const N = 220; const geo = new THREE.BoxGeometry(0.05, 0.05, 3);
    this.dust = new THREE.InstancedMesh(geo, new THREE.MeshBasicNodeMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.55, fog: false }), N);
    this.dust.frustumCulled = false;
    this.dustPos = [];
    for (let i = 0; i < N; i++) this.dustPos.push(new THREE.Vector3(rr(-48, 48), rr(-30, 30), rr(-260, 20)));
    this.scene.add(this.dust);
    this._dm = new THREE.Matrix4(); this._dq = new THREE.Quaternion(); this._ds = new THREE.Vector3(); this._dp = new THREE.Vector3();
  },
  updateDust(px, py, pz, speed, dt) {
    const m = this._dm, q = this._dq, s = this._ds;
    for (let i = 0; i < this.dustPos.length; i++) {
      const p = this.dustPos[i];
      // world-fixed motes; recycle those behind the camera
      if (p.z > pz + 18) { p.set(px + rr(-48, 48), py + rr(-30, 30), pz - rr(200, 260)); }
      s.set(1, 1, clamp(speed / 55, 0.4, 3));
      this._dp.copy(p); m.compose(this._dp, q, s);
      this.dust.setMatrixAt(i, m);
    }
    this.dust.instanceMatrix.needsUpdate = true;
  },
  updateSky(camPos, t) {
    this.skyGroup.position.copy(camPos);
    for (const p of this.planets) p.rotation.y += p.userData.spin * 0.016;
  },
  updateSun(target) {
    const d = this.sunDir || new THREE.Vector3(0.5, 1, 0.4).normalize();
    this.sun.position.set(target.x + d.x * 120, target.y + d.y * 120, target.z + d.z * 120);
    this.sun.target.position.copy(target);
  },
};

// ===== Fx: instanced additive particles, expanding flashes, shockwaves, screen shake =====
const Fx = {
  N: 2600, parts: [], idx: 0, mesh: null, trauma: 0, flashes: [], rings: [], freeFlash: [],
  init(scene) {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.N);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const c = new THREE.Color(0, 0, 0);
    for (let i = 0; i < this.N; i++) {
      this.parts.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), size: 1, c: new THREE.Color(), g: 0, drag: 0 });
      this.mesh.setColorAt(i, c);
      this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }
    scene.add(this.mesh);
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sv = new THREE.Vector3(); this.tmpC = new THREE.Color();
    // flash spheres (explosion cores) and shockwave rings
    const fg = new THREE.SphereGeometry(1, 14, 10);
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(fg, new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false; scene.add(m); this.flashes.push({ m, life: 0, max: 1, size: 1, on: false });
    }
    const rg = new THREE.TorusGeometry(1, 0.06, 6, 40);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false; scene.add(m); this.rings.push({ m, life: 0, max: 1, size: 1, on: false });
    }
    this.fi = 0; this.ri = 0;
  },
  emit(pos, vel, life, size, color, g = 0, drag = 0) {
    const p = this.parts[this.idx]; this.idx = (this.idx + 1) % this.N;
    p.life = life; p.max = life; p.p.copy(pos); p.v.copy(vel); p.size = size; p.c.set(color); p.g = g; p.drag = drag;
  },
  burst(pos, n, o = {}) {
    const sp = o.speed || 10; const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(sp * rr(0.25, 1));
      if (o.dir) v.addScaledVector(o.dir, o.dirSpeed || sp);
      const col = Array.isArray(o.color) ? pick(o.color) : (o.color !== undefined ? o.color : 0xffc040);
      this.emit(pos, v, (o.life || 0.7) * rr(0.6, 1.2), (o.size || 0.35) * rr(0.6, 1.2), col, o.gravity || 0, o.drag || 1.5);
    }
  },
  explosion(pos, size = 1, o = {}) {
    const cols = o.colors || [0xfff0b0, 0xffc040, 0xff7a20, 0xff4020];
    this.burst(pos, Math.floor(26 * size + 8), { speed: 16 * size, life: 0.8 + size * 0.3, size: 0.5 * size + 0.2, color: cols, drag: 1.6 });
    this.burst(pos, Math.floor(10 * size), { speed: 30 * size, life: 0.5, size: 0.18 * size + 0.1, color: 0xffffff, drag: 1 });
    const f = this.flashes[this.fi]; this.fi = (this.fi + 1) % this.flashes.length;
    f.on = true; f.life = f.max = 0.35 + size * 0.15; f.size = 2.2 * size + 0.8; f.m.visible = true; f.m.position.copy(pos);
    f.m.material.color.set(o.core || 0xfff4c8);
    const r = this.rings[this.ri]; this.ri = (this.ri + 1) % this.rings.length;
    r.on = true; r.life = r.max = 0.5 + size * 0.2; r.size = 5 * size + 2; r.m.visible = true; r.m.position.copy(pos);
    r.m.rotation.set(rr(0, 3), rr(0, 3), 0); r.m.material.color.set(o.ring || 0xffa040);
    this.trauma = Math.min(1, this.trauma + 0.08 * size * (o.shake === undefined ? 1 : o.shake));
  },
  shockwave(pos, size, color = 0x80ffff, flat = true) {
    const r = this.rings[this.ri]; this.ri = (this.ri + 1) % this.rings.length;
    r.on = true; r.life = r.max = 0.7; r.size = size; r.m.visible = true; r.m.position.copy(pos);
    if (flat) r.m.rotation.set(Math.PI / 2, 0, 0); else r.m.rotation.set(0, 0, 0);
    r.m.material.color.set(color);
  },
  update(dt) {
    const m = this.m4, q = this.q, sv = this.sv, c = this.tmpC;
    for (let i = 0; i < this.N; i++) {
      const p = this.parts[i];
      if (p.life > 0) {
        p.life -= dt;
        p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.v.y -= p.g * dt;
        p.p.addScaledVector(p.v, dt);
        const k = Math.max(0, p.life / p.max);
        const s = p.size * (0.35 + 0.65 * k);
        sv.set(s, s, s); m.compose(p.p, q, sv);
        this.mesh.setMatrixAt(i, m);
        c.copy(p.c).multiplyScalar(0.25 + k * 0.9); this.mesh.setColorAt(i, c);
        p.dirty = true;
      } else if (p.dirty) {
        sv.set(0, 0, 0); m.compose(p.p, q, sv); this.mesh.setMatrixAt(i, m); p.dirty = false;
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    for (const f of this.flashes) {
      if (!f.on) continue;
      f.life -= dt; const k = 1 - f.life / f.max;
      if (f.life <= 0) { f.on = false; f.m.visible = false; continue; }
      const s = f.size * (0.4 + k * 1.1); f.m.scale.set(s, s, s); f.m.material.opacity = (1 - k) * 0.95;
    }
    for (const f of this.rings) {
      if (!f.on) continue;
      f.life -= dt; const k = 1 - f.life / f.max;
      if (f.life <= 0) { f.on = false; f.m.visible = false; continue; }
      const s = f.size * (0.1 + k * 0.9); f.m.scale.set(s, s, s); f.m.material.opacity = (1 - k) * 0.8;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
  },
  clear() {
    for (const p of this.parts) p.life = 0;
    for (const f of this.flashes) { f.on = false; f.m.visible = false; }
    for (const f of this.rings) { f.on = false; f.m.visible = false; }
  },
  shakeAmount() { return this.trauma * this.trauma * S().shake; },
};
