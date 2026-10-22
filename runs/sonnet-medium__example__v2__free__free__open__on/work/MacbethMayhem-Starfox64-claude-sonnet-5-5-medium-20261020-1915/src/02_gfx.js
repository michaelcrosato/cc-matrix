/* ===================== 02 GFX: renderer, cel materials, models, fx ===================== */
const Gfx = {
  renderer: null, scene: null, camera: null, world: null, sun: null, hemi: null, sky: null, skyMat: null, sunDisc: null, ground: null, w: 1, h: 1,
  async init(canvas) {
    if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');
    const r = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(innerWidth, innerHeight, false);
    await r.init();
    if (!(r.backend && r.backend.isWebGPUBackend)) throw new Error('The renderer could not start a WebGPU backend (WebGL fallback is disabled).');
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 7000);
    this.scene.add(this.camera);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.hemi = new THREE.HemisphereLight(0xffd9b0, 0x5a3a6a, 1.15); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    this.sunDir = new V3(0.5, 0.8, 0.35).normalize(); this.lightDir = new V3(0.4, 0.85, 0.5).normalize();
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.buildSky();
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  resize() {
    const w = innerWidth, h = innerHeight; this.w = w; this.h = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep vertical coverage on narrow aspect ratios
    this.camera.fov = w / h < 1.4 ? 62 + (1.4 - w / h) * 22 : 62; this.baseFov = this.camera.fov;
    this.camera.updateProjectionMatrix();
  },
  buildSky() {
    const geo = new THREE.SphereGeometry(5000, 24, 16);
    const n = geo.attributes.position.count, cols = new Float32Array(n * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    this.sky = new THREE.Mesh(geo, this.skyMat); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(300, 24), new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Mesh(new THREE.CircleGeometry(470, 24), new THREE.MeshBasicMaterial({ color: 0xffb36a, fog: false, depthWrite: false, transparent: true, opacity: 0.4 }));
    this.sunDisc.renderOrder = -9; this.sunHalo.renderOrder = -9.5;
    this.scene.add(this.sunDisc); this.scene.add(this.sunHalo);
  },
  /** theme: {top, mid, horizon, fog, fogNear, fogFar, sun, hemiSky, hemiGround, sunDir} */
  setTheme(t) {
    const g = this.sky.geometry, p = g.attributes.position, c = g.attributes.color;
    const top = new THREE.Color(t.top), mid = new THREE.Color(t.mid), hor = new THREE.Color(t.horizon), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 5000; // -1..1
      if (y > 0.25) tmp.copy(mid).lerp(top, clamp((y - 0.25) / 0.6, 0, 1));
      else if (y > 0.0) tmp.copy(hor).lerp(mid, clamp(y / 0.25, 0, 1));
      else tmp.copy(hor).lerp(new THREE.Color(t.fog), clamp(-y * 3, 0, 1));
      // posterise the sky into cel bands
      const q = 14; tmp.convertLinearToSRGB(); tmp.r = Math.round(tmp.r * q) / q; tmp.g = Math.round(tmp.g * q) / q; tmp.b = Math.round(tmp.b * q) / q; tmp.convertSRGBToLinear();
      c.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    c.needsUpdate = true;
    this.scene.fog = new THREE.Fog(t.fog, t.fogNear, t.fogFar);
    this.scene.background = new THREE.Color(t.fog);
    this.hemi.color.set(t.hemiSky); this.hemi.groundColor.set(t.hemiGround);
    this.sun.color.set(t.sun);
    this.sunDir.copy(t.sunDir || new V3(0.5, 0.5, 0.35)).normalize(); this.lightDir.copy(t.lightDir || new V3(0.4, 0.85, 0.5)).normalize();
    this.sunDisc.material.color.set(t.sunDisc || 0xfff2c0); this.sunHalo.material.color.set(t.sunHalo || 0xffb36a);
  },
  updateSky(camPos) {
    this.sky.position.copy(camPos);
    const d = this.sunDir;
    this.sunDisc.position.set(camPos.x + d.x * 4500, camPos.y + d.y * 4500, camPos.z + d.z * 4500); this.sunDisc.lookAt(camPos);
    this.sunHalo.position.copy(this.sunDisc.position).multiplyScalar(1); this.sunHalo.position.addScaledVector(d, 10); this.sunHalo.lookAt(camPos);
    this.sunHalo.position.copy(this.sunDisc.position).addScaledVector(d, 20);
  },
  followShadow(target) {
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.lightDir, 160);
    this.sun.shadow.camera.updateProjectionMatrix();
  },
  clearWorld() {
    const w = this.world;
    while (w.children.length) { const c = w.children[0]; w.remove(c); c.traverse && c.traverse((o) => { if (o.geometry && o.userData.ownGeo) o.geometry.dispose(); }); }
  },
  project(v, out) {
    out = out || { x: 0, y: 0, vis: false, z: 0 };
    const p = _pv.copy(v).project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.w; out.y = (-p.y * 0.5 + 0.5) * this.h; out.z = p.z; out.vis = p.z > -1 && p.z < 1;
    return out;
  },
};
const _pv = new V3();

/* ---------- cel-shading materials ---------- */
const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([105, 160, 215, 255]), 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const matCache = new Map();
function toon(color, o = {}) {
  const key = color + '|' + (o.emissive || 0) + '|' + (o.map ? o.map.uuid : '') + '|' + (o.side || 0) + '|' + (o.transparent ? o.opacity : 1);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: GRAD }, o.emissive ? { emissive: o.emissive, emissiveIntensity: o.ei || 0.6 } : {}, o.map ? { map: o.map } : {}, o.side ? { side: o.side } : {}, o.transparent ? { transparent: true, opacity: o.opacity } : {}));
  matCache.set(key, m); return m;
}
const glowMat = (color, o = {}) => { const k = 'g' + color + (o.opacity || 1); if (matCache.has(k)) return matCache.get(k); const m = new THREE.MeshBasicMaterial(Object.assign({ color }, o.opacity ? { transparent: true, opacity: o.opacity } : {})); matCache.set(k, m); return m; };
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x140b1c, side: THREE.BackSide });
const OUTLINE_MAT_THIN = OUTLINE_MAT;
function setOutlines(on) { OUTLINE_MAT.visible = on; }

function mesh(geo, color, o = {}) {
  const mat = o.mat || (o.glow ? glowMat(color) : toon(color, o));
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast !== false && !o.glow; m.receiveShadow = !!o.receive;
  if (o.outline !== false && !o.glow) {
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const r = Math.max(geo.boundingSphere.radius, 0.2);
    const k = 1 + clamp((o.ow || 0.1) / r, 0.015, 0.4);
    const ol = new THREE.Mesh(geo, OUTLINE_MAT); ol.scale.setScalar(k); ol.userData.outline = true;
    m.add(ol);
  }
  return m;
}
function part(parent, geo, color, pos, o = {}) {
  const m = mesh(geo, color, o);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale) { if (typeof o.scale === 'number') m.scale.setScalar(o.scale); else m.scale.set(o.scale[0], o.scale[1], o.scale[2]); }
  parent.add(m); return m;
}
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s),
  sph: (r, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  oct: (r) => new THREE.OctahedronGeometry(r),
  tor: (r, t, rs = 8, ts = 20) => new THREE.TorusGeometry(r, t, rs, ts),
  /** extruded polygon lying in the XZ plane (x right, z back), thickness along y */
  slab(pts, th) {
    const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, th / 2, 0); g.computeBoundingSphere(); return g;
  },
};
function noseForward(geo) { geo.rotateX(-Math.PI / 2); return geo; } // cone tip towards -Z

/* ---------- procedural textures ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 4; return t;
}
function groundTexture(base, a, b, seed = 3) {
  return canvasTex(128, 128, (g, w, h) => {
    const r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? a : b; const x = r() * w, y = r() * h, s = 6 + r() * 22; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + ox, y + oy, s, s * (0.5 + r() * 0.6), r() * 3, 0, TAU); g.fill(); } }
  }, 1);
}

/* ---------- model library ---------- */
const MODELS = {
  ship(c = {}) {
    const col = Object.assign({ main: 0xe8e4f0, trim: 0x3a6cff, accent: 0xff6a2a, glass: 0x66f0ff }, c);
    const g = new THREE.Group(), parts = {};
    part(g, noseForward(G.cone(0.55, 3.6, 8)), col.main, [0, 0, -1.1]);
    part(g, G.sph(0.7, 12, 8), col.main, [0, 0, 0.5], { scale: [1, 0.7, 1.9] });
    part(g, G.sph(0.5, 10, 8), col.glass, [0, 0.42, -0.35], { scale: [0.9, 0.8, 1.7], ow: 0.07 });
    const mkWing = (side) => {
      const w = new THREE.Group(); w.position.set(side * 0.45, -0.05, 0.4);
      const sx = side;
      part(w, G.slab([[0, -1.2], [3.5, 1.2], [3.5, 2.0], [0, 1.9]], 0.16), col.main, [0, 0, 0], { scale: [sx, 1, 1] });
      part(w, G.slab([[1.2, 0.1], [3.4, 1.4], [3.4, 1.9], [1.2, 1.55]], 0.2), col.trim, [0, 0.03, 0], { scale: [sx, 1, 1], outline: false });
      part(w, G.cyl(0.14, 0.14, 1.8, 6), col.trim, [sx * 3.45, 0.05, 1.2], { rot: [Math.PI / 2, 0, 0] });
      g.add(w); return w;
    };
    parts.wingL = mkWing(-1); parts.wingR = mkWing(1);
    part(g, G.slab([[0, 0], [0.9, 1.2], [0.9, 1.7], [0, 1.4]], 0.12), col.trim, [0, 0.55, 1.4], { rot: [0, 0, Math.PI / 2], scale: [1, 1, 1] });
    part(g, G.cyl(0.32, 0.4, 0.8, 8), 0x3c3550, [-0.55, -0.1, 1.9], { rot: [Math.PI / 2, 0, 0] });
    part(g, G.cyl(0.32, 0.4, 0.8, 8), 0x3c3550, [0.55, -0.1, 1.9], { rot: [Math.PI / 2, 0, 0] });
    parts.flame1 = part(g, noseForward(G.cone(0.28, 1.6, 8)).rotateX(Math.PI), col.accent, [-0.55, -0.1, 2.9], { glow: true });
    parts.flame2 = part(g, noseForward(G.cone(0.28, 1.6, 8)).rotateX(Math.PI), col.accent, [0.55, -0.1, 2.9], { glow: true });
    part(g, G.cyl(0.07, 0.07, 1.2, 5), 0xffffff, [-1.1, 0.02, -0.2], { rot: [Math.PI / 2, 0, 0], outline: false });
    g.userData.parts = parts; g.userData.radius = 1.3; return g;
  },
  drone() {
    const g = new THREE.Group(), p = {};
    part(g, G.ico(1.1, 0), 0x6b3aa0, [0, 0, 0]);
    p.eye = part(g, G.sph(0.45, 10, 8), 0xffc84a, [0, 0, -0.85], { glow: true });
    p.ring = new THREE.Group(); g.add(p.ring);
    part(p.ring, G.tor(1.7, 0.18, 6, 16), 0xe03a6a, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
    part(p.ring, G.box(0.5, 0.3, 0.9), 0x2a1c3c, [1.7, 0, 0]); part(p.ring, G.box(0.5, 0.3, 0.9), 0x2a1c3c, [-1.7, 0, 0]);
    g.userData.parts = p; g.userData.radius = 1.8; return g;
  },
  swooper() {
    const g = new THREE.Group();
    part(g, noseForward(G.cone(0.5, 3, 6)), 0x1f8f94, [0, 0, 0]);
    part(g, G.slab([[0, -0.8], [2.6, 1.3], [2.6, 1.7], [0, 1.0]], 0.12), 0x155e6a, [0, 0, 0.3]);
    part(g, G.slab([[0, -0.8], [-2.6, 1.3], [-2.6, 1.7], [0, 1.0]], 0.12), 0x155e6a, [0, 0, 0.3]);
    part(g, G.sph(0.3, 8, 6), 0xff5a3a, [0, 0.3, -0.4], { glow: true });
    g.userData.radius = 1.7; return g;
  },
  turret(sc = 1) {
    const g = new THREE.Group(), p = {};
    part(g, G.cyl(1.5, 1.9, 0.9, 8), 0x585069, [0, 0.45, 0]);
    p.head = new THREE.Group(); p.head.position.y = 1.4; g.add(p.head);
    part(p.head, G.sph(1.1, 10, 8), 0xb04a3a, [0, 0, 0]);
    p.barrel = part(p.head, G.cyl(0.25, 0.3, 2.2, 6), 0x2e2a3a, [0, 0, -1.4], { rot: [Math.PI / 2, 0, 0] });
    part(p.head, G.sph(0.3, 6, 5), 0xffc84a, [0, 0.5, -0.8], { glow: true });
    g.scale.setScalar(sc); g.userData.parts = p; g.userData.radius = 1.9 * sc; return g;
  },
  mine() {
    const g = new THREE.Group();
    part(g, G.ico(1.1, 1), 0x3a3550, [0, 0, 0]);
    for (const a of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const s = part(g, G.cone(0.28, 0.9, 5), 0xff4a3a, [a[0] * 1.35, a[1] * 1.35, a[2] * 1.35]);
      s.lookAt(a[0] * 5, a[1] * 5, a[2] * 5);
      s.rotateX(Math.PI / 2);
    }
    part(g, G.sph(0.42, 8, 6), 0xffe35a, [0, 0, 0], { glow: true, scale: 1.2 });
    g.userData.radius = 1.9; return g;
  },
  gunship() {
    const g = new THREE.Group(), p = {};
    part(g, G.box(3.4, 1.7, 7), 0x4a4a68, [0, 0, 0]);
    part(g, noseForward(G.cone(1.5, 3, 4)), 0x4a4a68, [0, 0, -5], { rot: [0, 0, 0] });
    part(g, G.sph(0.9, 8, 6), 0xffc84a, [0, 1.0, -1.5], { glow: true });
    for (const s of [-1, 1]) {
      part(g, G.box(1.4, 1.1, 4), 0x8a2f3a, [s * 2.7, -0.2, 0.6]);
      part(g, G.cyl(0.28, 0.28, 3, 6), 0x24202c, [s * 2.7, -0.2, -2.0], { rot: [Math.PI / 2, 0, 0] });
      part(g, G.cyl(0.6, 0.8, 1, 8), 0x24202c, [s * 1.3, 0.2, 3.7], { rot: [Math.PI / 2, 0, 0] });
      part(g, G.sph(0.45, 6, 5), 0xff7a3a, [s * 1.3, 0.2, 4.3], { glow: true });
    }
    part(g, G.slab([[-1.6, 0.5], [-5.2, 3.5], [-5.2, 4.1], [-1.6, 3.2]], 0.2), 0x8a2f3a, [0, 0, 0]);
    part(g, G.slab([[1.6, 0.5], [5.2, 3.5], [5.2, 4.1], [1.6, 3.2]], 0.2), 0x8a2f3a, [0, 0, 0]);
    g.userData.parts = p; g.userData.radius = 5; return g;
  },
  car(kind = 'box') {
    const g = new THREE.Group(); const cols = { box: 0x7a4a3a, tank: 0x3a5a6a, flat: 0x56506a };
    part(g, G.box(5.6, 0.7, 13.6), 0x2c2838, [0, 0.8, 0]);
    if (kind === 'box') { part(g, G.box(5.2, 4, 12.4), cols.box, [0, 3, 0]); part(g, G.box(5.4, 0.5, 12.6), 0xd8b24a, [0, 2.2, 0], { outline: false }); }
    else if (kind === 'tank') { part(g, G.cyl(2.3, 2.3, 12, 14), cols.tank, [0, 3.2, 0], { rot: [Math.PI / 2, 0, 0] }); part(g, G.cyl(1.0, 1.0, 1, 8), 0xd8b24a, [0, 5.6, 0]); }
    else { part(g, G.box(5.2, 1, 12.4), cols.flat, [0, 1.6, 0]); for (let i = -1; i <= 1; i++) part(g, G.box(4, 2.4, 2.8), 0xb04a3a, [0, 3.2, i * 4]); }
    for (const z of [-4.5, 4.5]) for (const x of [-2.5, 2.5]) part(g, G.cyl(0.8, 0.8, 0.5, 10), 0x15121c, [x, 0.8, z], { rot: [0, 0, Math.PI / 2] });
    g.userData.radius = 6.5; return g;
  },
  loco() {
    const g = new THREE.Group();
    part(g, G.box(6, 0.8, 16), 0x2c2838, [0, 0.8, 0]);
    part(g, G.cyl(2.5, 2.5, 10, 14), 0x8a2f3a, [0, 3.6, -2.2], { rot: [Math.PI / 2, 0, 0] });
    part(g, G.box(5.6, 5.4, 4.6), 0x4a4a68, [0, 3.7, 5.2]);
    part(g, G.cyl(0.7, 1.0, 3, 8), 0x24202c, [0, 7.4, -5.5]); part(g, G.cyl(1.2, 0.8, 0.6, 8), 0x24202c, [0, 9.2, -5.5]);
    part(g, noseForward(G.cone(2.4, 2.4, 4)), 0xd8b24a, [0, 1.6, -9.2]);
    part(g, G.sph(0.5, 8, 6), 0xfff2a0, [0, 3.8, -7.4], { glow: true });
    for (const z of [-5, -1, 3]) for (const x of [-2.8, 2.8]) part(g, G.cyl(1.2, 1.2, 0.5, 12), 0x15121c, [x, 1.2, z], { rot: [0, 0, Math.PI / 2] });
    g.userData.radius = 8; return g;
  },
  bossLoco() {
    const g = new THREE.Group(), p = {};
    g.scale.setScalar(2.6);
    part(g, G.box(8, 1, 22), 0x4a4658, [0, 1, 0]);
    part(g, G.cyl(3.4, 3.4, 15, 16), 0x9a3a4a, [0, 5, -3.5], { rot: [Math.PI / 2, 0, 0] });
    part(g, G.cyl(3.5, 3.5, 0.8, 16), 0xd8b24a, [0, 5, -11.2], { rot: [Math.PI / 2, 0, 0] });
    part(g, G.cyl(3.5, 3.5, 0.6, 16), 0xd8b24a, [0, 5, -6.5], { rot: [Math.PI / 2, 0, 0], outline: false });
    part(g, G.cyl(3.5, 3.5, 0.6, 16), 0xd8b24a, [0, 5, -1], { rot: [Math.PI / 2, 0, 0], outline: false });
    part(g, G.box(7.4, 7.2, 6.4), 0x5a5a8a, [0, 5.1, 8]);
    part(g, G.cyl(1.0, 1.5, 4, 8), 0x24202c, [0, 10.8, -8]); p.smoke = new THREE.Object3D(); p.smoke.position.set(0, 13.3, -8); g.add(p.smoke);
    part(g, noseForward(G.cone(3.4, 3.4, 4)), 0xd8b24a, [0, 2.2, -14.2]);
    p.eye = part(g, G.sph(0.8, 8, 6), 0xff5a3a, [0, 5.2, -11.8], { glow: true });
    // side cannon pods
    for (const s of [-1, 1]) {
      const pod = new THREE.Group(); pod.position.set(s * 4.9, 5.4, -1.5); g.add(pod); p[s < 0 ? 'podL' : 'podR'] = pod;
      part(pod, G.box(2.2, 2.6, 4.4), 0x8a2f3a, [0, 0, 0]);
      const head = new THREE.Group(); head.position.set(0, 1.5, 0); pod.add(head);
      part(head, G.sph(1.3, 10, 8), 0xb04a3a, [0, 0, 0]);
      part(head, G.cyl(0.3, 0.38, 3.4, 6), 0x24202c, [0, 0, -2.4], { rot: [Math.PI / 2, 0, 0] });
      part(head, G.sph(0.4, 6, 5), 0xffc84a, [0, 0.6, -1.1], { glow: true });
      p[s < 0 ? 'headL' : 'headR'] = head;
    }
    // roof reactor with armour plates
    part(g, G.cyl(2.2, 2.4, 0.5, 12), 0x24202c, [0, 8.8, 8], { outline: false });
    p.core = part(g, G.sph(1.5, 12, 9), 0x5ae0ff, [0, 8.9, 8], { glow: true });
    p.plateL = new THREE.Group(); p.plateR = new THREE.Group();
    p.plateL.position.set(-2.1, 9.2, 8); p.plateR.position.set(2.1, 9.2, 8); g.add(p.plateL); g.add(p.plateR);
    part(p.plateL, G.box(2.2, 0.5, 4.6), 0x56506a, [1.1, 0, 0]); part(p.plateR, G.box(2.2, 0.5, 4.6), 0x56506a, [-1.1, 0, 0]);
    for (const z of [-7, -2.5, 3]) for (const x of [-3.6, 3.6]) part(g, G.cyl(1.5, 1.5, 0.6, 12), 0x15121c, [x, 1.5, z], { rot: [0, 0, Math.PI / 2] });
    g.userData.parts = p; g.userData.radius = 12; return g;
  },
  ring(gold) {
    const g = new THREE.Group();
    const t = part(g, G.tor(2.6, 0.36, 8, 24), gold ? 0xffd23a : 0xdfe8f8, [0, 0, 0], { rot: [0, 0, 0] });
    const inner = part(g, G.tor(2.0, 0.1, 5, 20), gold ? 0xfff0a0 : 0x7ad8ff, [0, 0, 0], { glow: true });
    g.userData.radius = 3.4; return g;
  },
  crate(kind) {
    const g = new THREE.Group();
    if (kind === 'bomb') { part(g, G.ico(1.5, 1), 0x2a2536, [0, 0, 0]); part(g, G.tor(1.6, 0.18, 6, 16), 0xff8a2a, [0, 0, 0], { glow: true }); part(g, G.cyl(0.25, 0.25, 0.8, 6), 0xffe35a, [0, 1.7, 0], { glow: true }); }
    else if (kind === 'laser') { part(g, G.oct(1.6), 0x3aa8ff, [0, 0, 0]); part(g, G.oct(0.8), 0xcff4ff, [0, 0, 0], { glow: true }); }
    else { part(g, G.sph(1.4, 10, 8), 0x3aff8a, [0, 0, 0]); part(g, G.box(0.5, 1.8, 0.5), 0xffffff, [0, 0, 0], { glow: true }); part(g, G.box(1.8, 0.5, 0.5), 0xffffff, [0, 0, 0], { glow: true }); }
    g.userData.radius = 2; return g;
  },
  arch(w = 14, h = 20) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { part(g, G.box(3, h, 3), 0x6a5a68, [s * (w / 2 + 1.5), h / 2 - 8, 0]); part(g, G.box(4, 1, 4), 0xd8b24a, [s * (w / 2 + 1.5), h - 8.2, 0]); }
    part(g, G.box(w + 6, 3, 3.4), 0x56506a, [0, h - 8, 0]);
    part(g, G.box(w + 6, 0.6, 3.6), 0xd8b24a, [0, h - 9.7, 0], { outline: false });
    g.userData.radius = w; return g;
  },
  pylon(h = 36) {
    const g = new THREE.Group();
    part(g, G.cyl(1.2, 2.2, h, 6), 0x6a5a68, [0, h / 2 - 12, 0]);
    part(g, G.box(10, 1, 1), 0x3a3550, [0, h - 16, 0]); part(g, G.box(7, 0.8, 0.8), 0x3a3550, [0, h - 20, 0]);
    part(g, G.sph(0.5, 6, 5), 0xff4a3a, [0, h - 11, 0], { glow: true });
    g.userData.radius = 5; return g;
  },
  carrier() {
    const g = new THREE.Group(), p = {};
    part(g, G.box(70, 22, 260), 0x4a4668, [0, 0, 0]);
    part(g, G.box(52, 12, 200), 0x3a3656, [0, 15, 10]);
    part(g, noseForward(G.cone(36, 90, 4)).rotateZ(Math.PI / 4), 0x6a2a3a, [0, 0, -175]);
    for (let i = -4; i <= 4; i++) part(g, G.box(72, 1.2, 4), 0xd8b24a, [0, 11.4, i * 24], { outline: false });
    // bridge tower
    part(g, G.box(18, 24, 28), 0x56506a, [0, 36, 70]); part(g, G.box(22, 3, 32), 0x8a2f3a, [0, 49, 70]);
    p.window = part(g, G.box(14, 4, 1), 0xffc84a, [0, 42, 55.2], { glow: true });
    for (const s of [-1, 1]) { part(g, G.box(24, 14, 60), 0x56506a, [s * 52, -2, 70]); part(g, G.cyl(7, 9, 20, 10), 0x24202c, [s * 52, -2, 112], { rot: [Math.PI / 2, 0, 0] }); part(g, G.sph(6, 10, 8), 0xff7a3a, [s * 52, -2, 124], { glow: true }); }
    g.userData.parts = p; g.userData.radius = 140; return g;
  },
  generator() {
    const g = new THREE.Group(), p = {};
    part(g, G.cyl(3, 4, 8, 8), 0x3a3550, [0, 4, 0]);
    p.orb = part(g, G.sph(5, 12, 9), 0x66f0ff, [0, 12, 0], { glow: true });
    p.shell = part(g, G.ico(7, 1), 0xb7f3ff, [0, 12, 0], { mat: new THREE.MeshBasicMaterial({ color: 0x66f0ff, transparent: true, opacity: 0.25, wireframe: true }), outline: false, cast: false });
    g.userData.parts = p; g.userData.radius = 7; return g;
  },
  fighter() {
    const g = new THREE.Group(), p = {};
    part(g, noseForward(G.cone(0.7, 4, 6)), 0x8a2f6a, [0, 0, -0.5]);
    part(g, G.sph(0.8, 8, 6), 0x8a2f6a, [0, 0, 1.2], { scale: [1, 0.8, 1.6] });
    for (const s of [-1, 1]) {
      part(g, G.slab([[0, -0.4], [s * 3.2, 1.8], [s * 3.2, 2.5], [0, 2.2]], 0.14), 0xe0b43a, [0, 0, 0.4]);
      part(g, G.slab([[0, 0], [s * 1.5, 1], [s * 1.5, 1.6], [0, 1.6]], 0.14), 0x4a2a6a, [0, 0.0, 1.6], { rot: [0, 0, s * 0.7] });
    }
    p.eye = part(g, G.sph(0.32, 6, 5), 0x6aff8a, [0, 0.5, -0.9], { glow: true });
    p.flame = part(g, noseForward(G.cone(0.35, 1.8, 6)).rotateX(Math.PI), 0xff4a8a, [0, 0, 2.9], { glow: true });
    g.userData.parts = p; g.userData.radius = 2.2; return g;
  },
  flak() {
    const g = new THREE.Group(), p = {};
    part(g, G.cyl(2, 2.6, 1.4, 8), 0x585069, [0, 0.7, 0]);
    p.head = new THREE.Group(); p.head.position.y = 1.9; g.add(p.head);
    part(p.head, G.sph(1.6, 10, 8), 0xb04a3a, [0, 0, 0]);
    part(p.head, G.cyl(0.35, 0.4, 3.4, 6), 0x2e2a3a, [-0.7, 0, -2.2], { rot: [Math.PI / 2, 0, 0] });
    part(p.head, G.cyl(0.35, 0.4, 3.4, 6), 0x2e2a3a, [0.7, 0, -2.2], { rot: [Math.PI / 2, 0, 0] });
    g.userData.parts = p; g.userData.radius = 3; return g;
  },
};

/* ---------- pooled / instanced effects ---------- */
const FX = {
  max: 2400, parts: [], inst: null, free: [], flashes: [], rings: [], _m: new M4(), _c: new THREE.Color(), _q: new QT(), _e: new EU(), _p: new V3(), _s: new V3(),
  init() {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    this.inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.max);
    this.inst.frustumCulled = false; this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.max; i++) { this.inst.setColorAt(i, this._c.set(0xffffff)); this._m.makeScale(0, 0, 0); this.inst.setMatrixAt(i, this._m); this.free.push(i); }
    this.inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
    Gfx.scene.add(this.inst);
    for (let i = 0; i < 24; i++) {
      const f = new THREE.Mesh(G.sph(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); f.visible = false; f.frustumCulled = false; Gfx.scene.add(f);
      this.flashes.push({ m: f, t: 0, life: 0, size: 1, on: false });
      const r = new THREE.Mesh(G.tor(1, 0.06, 4, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); r.visible = false; r.frustumCulled = false; Gfx.scene.add(r);
      this.rings.push({ m: r, t: 0, life: 0, size: 1, on: false });
    }
  },
  reset() {
    for (const p of this.parts) { this._m.makeScale(0, 0, 0); this.inst.setMatrixAt(p.i, this._m); this.free.push(p.i); }
    this.parts.length = 0; this.inst.instanceMatrix.needsUpdate = true;
    for (const f of this.flashes) { f.on = false; f.m.visible = false; }
    for (const f of this.rings) { f.on = false; f.m.visible = false; }
  },
  spawn(pos, vel, size, life, c0, c1, o = {}) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.parts.push({ i, x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, size, life, t: 0, c0: new THREE.Color(c0), c1: new THREE.Color(c1 === undefined ? c0 : c1), drag: o.drag === undefined ? 1.5 : o.drag, grav: o.grav || 0, grow: o.grow || 0, shrink: o.shrink === undefined ? 1 : o.shrink, stretch: o.stretch || 0 });
  },
  burst(pos, n, speed, size, life, c0, c1, o = {}) {
    const v = this._s;
    for (let k = 0; k < n; k++) {
      v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1));
      this.spawn(pos, v, size * rand(0.5, 1.2), life * rand(0.6, 1.1), c0, c1, o);
    }
  },
  explosion(pos, size = 1, color = 0xffa030) {
    this.flash(pos, 3.2 * size, 0.28, 0xfff6d0); this.ring(pos, 5 * size, 0.5, 0xffd080);
    this.burst(pos, Math.floor(22 * size), 26 * size, 0.85 * size, 0.9, 0xfff2a0, 0xe03a1a, { drag: 2 });
    this.burst(pos, Math.floor(12 * size), 14 * size, 1.5 * size, 1.5, 0x5a4a60, 0x1a1420, { drag: 1.2, grow: 0.6, grav: 2 });
    this.burst(pos, Math.floor(10 * size), 40 * size, 0.28, 0.6, 0xffffff, 0xffb040, { drag: 1, stretch: 1 });
  },
  flash(pos, size, life, color) { const f = this.flashes.find((x) => !x.on) || this.flashes[0]; f.on = true; f.t = 0; f.life = life; f.size = size; f.m.position.copy(pos); f.m.material.color.set(color); f.m.visible = true; f.m.scale.setScalar(0.1); },
  ring(pos, size, life, color) { const f = this.rings.find((x) => !x.on) || this.rings[0]; f.on = true; f.t = 0; f.life = life; f.size = size; f.m.position.copy(pos); f.m.material.color.set(color); f.m.visible = true; f.m.scale.setScalar(0.1); f.m.quaternion.copy(Gfx.camera.quaternion); },
  update(dt) {
    const m = this._m, q = this._q, s = this._s, c = this._c;
    for (let k = this.parts.length - 1; k >= 0; k--) {
      const p = this.parts[k]; p.t += dt;
      if (p.t >= p.life) { m.makeScale(0, 0, 0); this.inst.setMatrixAt(p.i, m); this.free.push(p.i); this.parts[k] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
      const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d - p.grav * dt; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const u = p.t / p.life;
      let sz = p.size * (p.shrink ? (1 - u * u) : 1) * (1 + p.grow * u);
      this._p.set(p.x, p.y, p.z);
      if (p.stretch) { const sp = Math.hypot(p.vx, p.vy, p.vz); q.setFromUnitVectors(_UP_Z, s.set(p.vx, p.vy, p.vz).normalize()); m.compose(this._p, q, s.set(sz * 0.5, sz * 0.5, sz * (1 + sp * 0.12))); }
      else m.compose(this._p, _Q_ID, s.set(sz, sz, sz));
      this.inst.setMatrixAt(p.i, m);
      c.copy(p.c0).lerp(p.c1, easeOut(u)); this.inst.setColorAt(p.i, c);
    }
    this.inst.instanceMatrix.needsUpdate = true; if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;
    for (const f of this.flashes) if (f.on) { f.t += dt; const u = f.t / f.life; if (u >= 1) { f.on = false; f.m.visible = false; continue; } f.m.scale.setScalar(f.size * (0.4 + easeOut(u))); f.m.material.opacity = 0.95 * (1 - u); }
    for (const f of this.rings) if (f.on) { f.t += dt; const u = f.t / f.life; if (u >= 1) { f.on = false; f.m.visible = false; continue; } f.m.scale.setScalar(f.size * easeOut(u) + 0.1); f.m.material.opacity = 0.9 * (1 - u); f.m.quaternion.copy(Gfx.camera.quaternion); }
  },
};
const _UP_Z = new V3(0, 0, 1), _Q_ID = new QT();

/* ---------- speed dust (gives a sense of motion) ---------- */
const Dust = {
  n: 280, inst: null, pos: [], _m: new M4(), _q: new QT(), _s: new V3(), _p: new V3(), _r: new V3(), _u: new V3(),
  init() {
    this.inst = new THREE.InstancedMesh(G.box(0.08, 0.08, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), this.n);
    this.inst.frustumCulled = false; Gfx.scene.add(this.inst);
    for (let i = 0; i < this.n; i++) this.pos.push(new V3(1e6, 0, 0));
  },
  visible(v) { this.inst.visible = v; },
  update(cam, fwd, speed, spread = 70) {
    const len = clamp(speed * 0.035, 0.3, 6);
    this._q.setFromUnitVectors(_UP_Z, fwd);
    this._r.set(1, 0, 0).applyQuaternion(this._q); this._u.set(0, 1, 0).applyQuaternion(this._q);
    for (let i = 0; i < this.n; i++) {
      const p = this.pos[i];
      const rel = _pv.copy(p).sub(cam), ahead = rel.dot(fwd);
      if (ahead < -10 || rel.lengthSq() > spread * spread * 4.5) {
        p.copy(cam).addScaledVector(fwd, rand(20, spread * 1.8)).addScaledVector(this._r, rand(-spread, spread)).addScaledVector(this._u, rand(-spread * 0.6, spread * 0.6));
      }
      this._m.compose(p, this._q, this._s.set(1, 1, len));
      this.inst.setMatrixAt(i, this._m);
    }
    this.inst.instanceMatrix.needsUpdate = true;
  },
};

/* ---------- instanced static decor ---------- */
class DecorBatch {
  constructor() { this.items = {}; }
  add(kind, x, y, z, ry, sx, sy, sz, color) { (this.items[kind] = this.items[kind] || []).push([x, y, z, ry, sx, sy, sz, color]); }
  build(parent) {
    const geos = { rock: () => G.ico(1, 0), mesa: () => G.cyl(0.8, 1, 1, 7), spire: () => G.cone(1, 1, 6), tower: () => G.box(1, 1, 1), tank: () => G.cyl(1, 1, 1, 12), ball: () => G.sph(1, 10, 7), cloud: () => G.ico(1, 1) };
    const group = new THREE.Group(), m = new M4(), q = new QT(), e = new EU(), p = new V3(), s = new V3(), c = new THREE.Color();
    for (const kind in this.items) {
      if (kind === 'lamp') continue;
      const arr = this.items[kind], geo = geos[kind]();
      const im = new THREE.InstancedMesh(geo, toon(0xffffff), arr.length), om = new THREE.InstancedMesh(geo, OUTLINE_MAT, arr.length);
      im.castShadow = kind !== 'cloud'; im.receiveShadow = true; im.frustumCulled = false; om.frustumCulled = false;
      arr.forEach((it, i) => {
        e.set(0, it[3], 0); q.setFromEuler(e); p.set(it[0], it[1], it[2]);
        m.compose(p, q, s.set(it[4], it[5], it[6])); im.setMatrixAt(i, m);
        const k = kind === 'cloud' ? 1.0 : 1 + clamp(1.4 / Math.max(it[4], it[6]), 0.02, 0.12);
        m.compose(p, q, s.set(it[4] * k, it[5] * (1 + (k - 1) * 0.6), it[6] * k)); om.setMatrixAt(i, m);
        c.set(it[7]); im.setColorAt(i, c);
      });
      group.add(im); if (kind !== 'cloud') group.add(om);
    }
    parent.add(group); return group;
  }
  buildGlow(parent) {
    const arr = this.items.lamp || []; if (!arr.length) return;
    const im = new THREE.InstancedMesh(G.box(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), arr.length), m = new M4(), q = new QT(), e = new EU(), p = new V3(), s = new V3(), c = new THREE.Color();
    im.frustumCulled = false;
    arr.forEach((it, i) => { e.set(0, it[3], 0); q.setFromEuler(e); m.compose(p.set(it[0], it[1], it[2]), q, s.set(it[4], it[5], it[6])); im.setMatrixAt(i, m); im.setColorAt(i, c.set(it[7])); });
    parent.add(im);
  }
}
