// ============================================================================
// Graphics — WebGPU renderer, cel shading (toon ramp + inverted-hull outlines),
// procedural models, particle/FX pools
// ============================================================================
const GFX = {
  renderer: null, scene: null, sun: null, hemi: null, sky: null, skyTop: uniform(new THREE.Color(0x3a7bff)), skyBot: uniform(new THREE.Color(0xbfe8ff)),
  skyMid: uniform(new THREE.Color(0x7fc4ff)), width: 1, height: 1,
  async init() {
    if (!navigator.gpu) throw new Error('NO_WEBGPU');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('NO_WEBGPU');
    const r = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
    await r.init();
    if (!r.backend || !r.backend.isWebGPUBackend) throw new Error('NO_WEBGPU');
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.autoClear = false;
    $('#view').appendChild(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a5a3a, 1.1);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff2d6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 1; sc.far = 600;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.4;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.sunDir = new V3(0.45, 1, 0.35).normalize();
    // gradient sky dome
    const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    skyMat.colorNode = Fn(() => {
      const h = normalize(positionLocal).y;
      const lo = mix(this.skyBot, this.skyMid, smoothstep(-0.05, 0.25, h));
      return mix(lo, this.skyTop, smoothstep(0.2, 0.75, h));
    })();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(0xbfe8ff, 400, 1800);
    this.resize();
    addEventListener('resize', () => this.resize());
  },
  resize() {
    this.width = innerWidth; this.height = innerHeight;
    this.renderer.setSize(this.width, this.height);
  },
  setSky(top, mid, bot, fogColor, fogNear, fogFar) {
    this.skyTop.value.set(top); this.skyMid.value.set(mid); this.skyBot.value.set(bot);
    this.scene.fog.color.set(fogColor); this.scene.fog.near = fogNear; this.scene.fog.far = fogFar;
  },
  // follow a focus point with the shadow frustum
  updateSun(focus) {
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 300);
    this.sun.target.position.copy(focus);
    this.sky.position.copy(focus);
  },
};

// ---------------------------------------------------------------------------
// Cel shading
// ---------------------------------------------------------------------------
const Toon = {
  defOL: 0.07, ramp: null, cache: new Map(), outlineCache: new Map(), outlineMats: new Map(),
  init() {
    const d = new Uint8Array([70, 70, 150, 255]);
    const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    this.ramp = t;
  },
  mat(hex, opts = {}) {
    const key = hex + '|' + (opts.emissive || 0) + '|' + (opts.ei || 0) + '|' + (opts.flat ? 1 : 0) + (opts.transparent ? 't' + opts.opacity : '');
    let m = this.cache.get(key);
    if (!m) {
      m = new THREE.MeshToonNodeMaterial({ color: hex, gradientMap: this.ramp });
      if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
      if (opts.flat) m.flatShading = true;
      if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
      this.cache.set(key, m);
    }
    return m;
  },
  glow(hex, opacity = 1, additive = true) {
    const key = 'glow' + hex + opacity + additive;
    let m = this.cache.get(key);
    if (!m) {
      m = new THREE.MeshBasicNodeMaterial({ color: hex, transparent: opacity < 1 || additive, opacity, depthWrite: false, fog: false });
      if (additive) m.blending = THREE.AdditiveBlending;
      this.cache.set(key, m);
    }
    return m;
  },
  outlineMat(thick, hex = 0x0b1030) {
    const key = thick + '|' + hex;
    let m = this.outlineMats.get(key);
    if (!m) {
      m = new THREE.MeshBasicNodeMaterial({ color: hex, side: THREE.BackSide });
      m.positionNode = positionLocal.add(normalize(normalLocal.div(modelScale)).mul(thick).div(modelScale));
      this.outlineMats.set(key, m);
    }
    return m;
  },
  // smooth-normal copy of a geometry so the inverted hull has no cracks at hard edges
  outlineGeo(geo) {
    let g = this.outlineCache.get(geo.uuid);
    if (!g) {
      g = geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
      g = BufferGeometryUtils.mergeVertices(g, 1e-3);
      g.computeVertexNormals();
      this.outlineCache.set(geo.uuid, g);
    }
    return g;
  },
};
const OUTLINE = 0.07;
// toon mesh with outline child
function tmesh(geo, hex, opts = {}) {
  const m = new THREE.Mesh(geo, opts.material || Toon.mat(hex, opts));
  m.castShadow = opts.shadow !== false; m.receiveShadow = !!opts.receive;
  if (opts.outline !== 0) {
    const o = new THREE.Mesh(Toon.outlineGeo(geo), Toon.outlineMat(opts.outline ?? Toon.defOL, opts.outlineColor));
    o.castShadow = false; o.receiveShadow = false; o.userData.isOutline = true;
    m.add(o);
  }
  return m;
}
function place(obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); obj.scale.set(sx, sy, sz); return obj;
}

// shared geometries
const G = {};
function initGeometries() {
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.sphere = new THREE.SphereGeometry(1, 16, 12);
  G.sphereLo = new THREE.IcosahedronGeometry(1, 1);
  G.ico = new THREE.IcosahedronGeometry(1, 0);
  G.dodeca = new THREE.DodecahedronGeometry(1, 0);
  G.cone6 = new THREE.ConeGeometry(1, 1, 6);
  G.cone4 = new THREE.ConeGeometry(1, 1, 4);
  G.cone8 = new THREE.ConeGeometry(1, 1, 10);
  G.cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  G.cyl6 = new THREE.CylinderGeometry(1, 1, 1, 6);
  G.torus = new THREE.TorusGeometry(1, 0.12, 8, 32);
  G.torusThin = new THREE.TorusGeometry(1, 0.05, 6, 40);
  G.octa = new THREE.OctahedronGeometry(1, 0);
  G.tetra = new THREE.TetrahedronGeometry(1, 0);
  G.capsule = new THREE.CapsuleGeometry(0.12, 2.6, 2, 6);
  G.bolt = new THREE.CapsuleGeometry(0.4, 0.6, 3, 8);
  // swept wing: custom extruded triangle
  const ws = new THREE.Shape(); ws.moveTo(0, 0.9); ws.lineTo(3.4, -0.7); ws.lineTo(3.4, -1.35); ws.lineTo(0, -1.4); ws.closePath();
  G.wing = new THREE.ExtrudeGeometry(ws, { depth: 0.14, bevelEnabled: false }); G.wing.rotateX(Math.PI / 2); G.wing.translate(0, 0.07, 0);
  const bs = new THREE.Shape(); bs.moveTo(0, 0); bs.lineTo(0.4, 1.9); bs.lineTo(0.75, 1.9); bs.lineTo(0.9, -0.6); bs.closePath();
  G.blade = new THREE.ExtrudeGeometry(bs, { depth: 0.1, bevelEnabled: false }); G.blade.translate(0, 0, -0.05);
  const ds = new THREE.Shape(); ds.moveTo(0, 1.6); ds.lineTo(2.6, -1.0); ds.lineTo(0, -0.4); ds.closePath();
  G.delta = new THREE.ExtrudeGeometry(ds, { depth: 0.16, bevelEnabled: false }); G.delta.rotateX(Math.PI / 2);
  const fs = new THREE.Shape(); fs.moveTo(0, 2.0); fs.lineTo(2.9, -0.2); fs.lineTo(2.6, -1.1); fs.lineTo(0, -0.7); fs.closePath();
  G.fwing = new THREE.ExtrudeGeometry(fs, { depth: 0.14, bevelEnabled: false }); G.fwing.rotateX(Math.PI / 2);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
const PCOLORS = [0x2f7bff, 0xff3b4e, 0x39d353, 0xffc21a];
const Models = {
  // The "Lockwing" — team Star Locks' fighter
  lockwing(accent = 0x2f7bff) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    body.add(place(tmesh(G.cone6, 0xe8ecf4), 0, 0, -0.6, -Math.PI / 2, 0, 0, 0.75, 4.6, 0.55));
    body.add(place(tmesh(G.box, 0xd0d6e2), 0, 0, 1.4, 0, 0, 0, 1.3, 0.75, 1.6));
    body.add(place(tmesh(G.sphere, 0x6ff0ff, { emissive: 0x1a7aa0, ei: 0.6 }), 0, 0.42, 0.2, 0, 0, 0, 0.42, 0.32, 1.0));
    body.add(place(tmesh(G.box, accent), 0, 0.42, 1.6, 0, 0, 0, 0.25, 0.5, 1.2));
    body.add(place(tmesh(G.cone4, accent), 0, 0.9, 2.0, -0.4, Math.PI / 4, 0, 0.2, 1.1, 0.5));
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(0.45 * s, -0.05, 1.1); w.rotation.z = -0.32 * s; w.scale.x = s;
      w.add(tmesh(G.wing, 0xdfe4ee));
      w.add(place(tmesh(G.box, accent, { outline: 0.02 }), 1.6, 0.11, -0.25, 0, -0.43, 0, 2.4, 0.06, 0.28));
      const blade = place(tmesh(G.blade, 0xe8ecf4), 3.2, 0.0, -0.6, -Math.PI / 2 + 0.25, 0, -0.35);
      blade.rotation.order = 'YXZ'; w.add(blade);
      w.add(place(tmesh(G.box, accent, { outline: 0.02 }), 3.45, 0.9, -0.85, 0.3, 0, -0.3, 0.12, 0.6, 0.35));
      body.add(w); wings.push(w);
    }
    const eng = place(new THREE.Mesh(G.sphere, Toon.glow(0x66ccff, 0.9)), 0, 0, 2.35, 0, 0, 0, 0.55, 0.4, 0.5); body.add(eng);
    const eng2 = place(new THREE.Mesh(G.cone8, Toon.glow(0x2f7bff, 0.6)), 0, 0, 3.0, Math.PI / 2, 0, 0, 0.4, 1.4, 0.4); body.add(eng2);
    g.userData = { body, wings, engine: eng, flame: eng2, muzzles: [new V3(-3.4, -0.9, -0.5), new V3(3.4, -0.9, -0.5)] };
    return g;
  },
  // Jackal Squadron rival fighter (forward-swept, dark violet)
  jackal(accent = 0xb44dff) {
    const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
    body.add(place(tmesh(G.cone4, 0x3a2d55), 0, 0, -0.4, -Math.PI / 2, Math.PI / 4, 0, 0.8, 4.4, 0.6));
    body.add(place(tmesh(G.box, 0x2a2140), 0, 0.05, 1.3, 0, 0, 0, 1.4, 0.8, 1.8));
    body.add(place(tmesh(G.sphere, 0xff4dd2, { emissive: 0x80104a, ei: 0.7 }), 0, 0.42, 0.3, 0, 0, 0, 0.35, 0.3, 0.9));
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(0.5 * s, 0, 1.3); w.rotation.z = 0.12 * s; w.scale.x = s; w.rotation.y = 0;
      const fw = tmesh(G.fwing, 0x4a3a6e); fw.rotation.y = Math.PI; fw.scale.z = -1; fw.position.z = 0.4; w.add(fw);
      w.add(place(tmesh(G.box, accent, { outline: 0.02 }), 1.5, 0.1, 0.1, 0, 0.5, 0, 2.2, 0.06, 0.25));
      w.add(place(tmesh(G.cyl6, 0x2a2140), 2.8, 0, -0.2, Math.PI / 2, 0, 0, 0.25, 2.4, 0.25));
      body.add(w); wings.push(w);
    }
    const eng = place(new THREE.Mesh(G.sphere, Toon.glow(0xff5aa0, 0.9)), 0, 0, 2.3, 0, 0, 0, 0.55, 0.45, 0.5); body.add(eng);
    const eng2 = place(new THREE.Mesh(G.cone8, Toon.glow(0xff2a7a, 0.6)), 0, 0, 3.0, Math.PI / 2, 0, 0, 0.4, 1.4, 0.4); body.add(eng2);
    g.userData = { body, wings, engine: eng, flame: eng2, muzzles: [new V3(-2.8, 0, -1.5), new V3(2.8, 0, -1.5)] };
    return g;
  },
  dart() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.cone4, 0xff7a1a), 0, 0, 0, -Math.PI / 2, Math.PI / 4, 0, 0.7, 3.2, 0.45));
    for (const s of [-1, 1]) { const w = tmesh(G.delta, 0xc2410c); w.position.set(0.2 * s, 0, 0.6); w.scale.set(s * 0.9, 1, 0.9); w.rotation.z = 0.25 * s; g.add(w); }
    g.add(place(tmesh(G.sphere, 0xffe066, { emissive: 0xaa6600, ei: 0.8 }), 0, 0.3, -0.1, 0, 0, 0, 0.3, 0.22, 0.6));
    g.add(place(new THREE.Mesh(G.sphere, Toon.glow(0xff9933, 0.9)), 0, 0, 1.6, 0, 0, 0, 0.35, 0.3, 0.4));
    return g;
  },
  bomber() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.sphereLo, 0x8a5a2b, { flat: true }), 0, 0, 0, 0, 0, 0, 2.2, 1.2, 3.2));
    for (const s of [-1, 1]) {
      g.add(place(tmesh(G.box, 0x6b4220), 3 * s, -0.2, 0.4, 0, 0, -0.15 * s, 4, 0.25, 2));
      g.add(place(tmesh(G.cyl, 0x4a2f18), 4.4 * s, -0.4, 0.2, Math.PI / 2, 0, 0, 0.5, 2.4, 0.5));
    }
    g.add(place(tmesh(G.sphere, 0xff3b4e, { emissive: 0x660010, ei: 1 }), 0, 0.9, -1.6, 0, 0, 0, 0.5, 0.35, 0.6));
    return g;
  },
  tank() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.box, 0x7d6b3a, { receive: true }), 0, 0.7, 0, 0, 0, 0, 3.4, 1.2, 4.6));
    for (const s of [-1, 1]) g.add(place(tmesh(G.box, 0x3b3328), 1.9 * s, 0.5, 0, 0, 0, 0, 0.7, 1, 4.8));
    const turret = new THREE.Group(); turret.position.y = 1.5; g.add(turret);
    turret.add(place(tmesh(G.cyl6, 0x9a8650), 0, 0.3, 0, 0, 0, 0, 1.3, 0.8, 1.3));
    turret.add(place(tmesh(G.cyl, 0x3b3328), 0, 0.4, -1.6, Math.PI / 2, 0, 0, 0.22, 2.6, 0.22));
    g.userData.turret = turret;
    return g;
  },
  turret() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.cyl6, 0x8892a8, { receive: true }), 0, 4, 0, 0, 0, 0, 1.6, 8, 1.6));
    g.add(place(tmesh(G.cyl6, 0x5b6478), 0, 8.2, 0, 0, 0, 0, 2.2, 0.6, 2.2));
    const head = new THREE.Group(); head.position.y = 9; g.add(head);
    head.add(place(tmesh(G.sphere, 0xff3b4e, { emissive: 0x550010, ei: 0.6 }), 0, 0, 0, 0, 0, 0, 1.4, 1.1, 1.4));
    head.add(place(tmesh(G.cyl, 0x30364a), 0.5, 0, -1.6, Math.PI / 2, 0, 0, 0.2, 2.2, 0.2));
    head.add(place(tmesh(G.cyl, 0x30364a), -0.5, 0, -1.6, Math.PI / 2, 0, 0, 0.2, 2.2, 0.2));
    g.userData.turret = head;
    return g;
  },
  drone() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.ico, 0x9aa3b8, { flat: true }), 0, 0, 0, 0, 0, 0, 1.3));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(place(tmesh(G.cone4, 0xff3b4e), Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0, 0, 0, a - Math.PI / 2, 0.3, 1.0, 0.3)); }
    g.add(place(tmesh(G.sphere, 0xffd400, { emissive: 0x996600, ei: 1 }), 0, 0, -1.1, 0, 0, 0, 0.45));
    return g;
  },
  mine() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.sphere, 0x30364a), 0, 0, 0, 0, 0, 0, 1.4));
    for (let i = 0; i < 8; i++) { const v = new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(); const c = tmesh(G.cone4, 0xffcc33); c.position.copy(v).multiplyScalar(1.4); c.quaternion.setFromUnitVectors(UP, v); c.scale.set(0.3, 0.9, 0.3); g.add(c); }
    g.add(place(new THREE.Mesh(G.sphere, Toon.glow(0xff3b4e, 0.9)), 0, 0, 0, 0, 0, 0, 0.6));
    return g;
  },
  missile() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.cyl, 0xeeeeee, { outline: 0.04 }), 0, 0, 0, Math.PI / 2, 0, 0, 0.3, 2, 0.3));
    g.add(place(tmesh(G.cone8, 0xff3b4e, { outline: 0.04 }), 0, 0, -1.3, -Math.PI / 2, 0, 0, 0.3, 0.7, 0.3));
    g.add(place(new THREE.Mesh(G.sphere, Toon.glow(0xffaa33, 0.9)), 0, 0, 1.1, 0, 0, 0, 0.35, 0.35, 0.6));
    return g;
  },
  walker() {
    const g = new THREE.Group();
    const hull = new THREE.Group(); hull.position.y = 16; g.add(hull);
    hull.add(place(tmesh(G.sphereLo, 0x6d7a96, { flat: true }), 0, 0, 0, 0, 0, 0, 5, 3, 6));
    hull.add(place(tmesh(G.box, 0x3e4660), 0, -1.6, -5.5, 0, 0, 0, 3, 1.6, 3));
    hull.add(place(tmesh(G.sphere, 0xff3b4e, { emissive: 0x880018, ei: 1 }), 0, 0.4, -6, 0, 0, 0, 1.5, 1.2, 1));
    for (const s of [-1, 1]) hull.add(place(tmesh(G.cyl, 0x30364a), 3.5 * s, -0.5, -6, Math.PI / 2, 0, 0, 0.5, 4, 0.5));
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1, f = i < 2 ? -1 : 1;
      const hip = new THREE.Group(); hip.position.set(4 * s, 14, 3 * f); g.add(hip);
      const thigh = place(tmesh(G.box, 0x58637e), 1.5 * s, 2, 0, 0, 0, 0.9 * s, 1.2, 8, 1.2); thigh.position.set(3 * s, 1.5, 0); hip.add(thigh);
      const knee = new THREE.Group(); knee.position.set(6 * s, 3, 0); hip.add(knee);
      knee.add(place(tmesh(G.box, 0x404862), 0, -8, 0, 0, 0, 0, 1, 16, 1));
      knee.add(place(tmesh(G.cyl6, 0x2a3044), 0, -16, 0, 0, 0, 0, 1.6, 0.8, 1.6));
      legs.push({ hip, knee, phase: (i % 2 === (i < 2 ? 0 : 1)) ? 0 : Math.PI });
    }
    g.userData = { hull, legs, core: hull.children[2] };
    return g;
  },
  // Stage 1 boss: "Bastion Crab" fortress hovercraft
  bastion() {
    const g = new THREE.Group();
    const hull = new THREE.Group(); g.add(hull);
    hull.add(place(tmesh(G.sphereLo, 0x58637e, { flat: true }), 0, 0, 0, 0, 0, 0, 14, 6, 10));
    hull.add(place(tmesh(G.box, 0x3e4660), 0, 4.5, 2, 0, 0, 0, 10, 4, 8));
    hull.add(place(tmesh(G.cone6, 0xc2410c), 0, 9, 2, 0, 0, 0, 2, 5, 2));
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) hull.add(place(tmesh(G.cyl6, 0x30364a), 10 * s, -5, -4 + k * 5, 0, 0, 0.4 * s, 1.5, 6, 1.5));
    const core = place(tmesh(G.sphere, 0xff2a7a, { emissive: 0xaa0040, ei: 1.2 }), 0, 0, -8.5, 0, 0, 0, 3.4);
    hull.add(core);
    const plates = [];
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(0, 0, -8.2); hull.add(p); p.add(place(tmesh(G.box, 0x8a95b0), 2.2 * s, 0, -1.2, 0, 0, 0, 4.4, 8, 1.2)); plates.push(p); }
    const arms = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(15 * s, 0, -2); hull.add(a);
      a.add(place(tmesh(G.box, 0x6d7a96), 0, 0, 0, 0, 0, 0, 5, 5, 8));
      a.add(place(tmesh(G.cyl, 0x30364a), 0, 0, -6, Math.PI / 2, 0, 0, 1.4, 6, 1.4));
      a.add(place(tmesh(G.sphere, 0xffd400, { emissive: 0xaa7700, ei: 1 }), 0, 2.6, -2, 0, 0, 0, 1.4));
      arms.push(a);
    }
    g.userData = { hull, core, plates, arms };
    return g;
  },
  // Stage 2 boss: "Mandrillo's Dreadnought" core section
  dreadnought() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.box, 0x3e4660, { receive: true }), 0, 0, 0, 0, 0, 0, 40, 18, 140));
    g.add(place(tmesh(G.cone6, 0x58637e), 0, 0, -95, -Math.PI / 2, 0, 0, 22, 50, 14));
    g.add(place(tmesh(G.box, 0x2a3044), 0, 16, 30, 0, 0, 0, 18, 14, 30));
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) g.add(place(tmesh(G.box, 0x6d7a96), 22 * s, rand(-6, 6), -60 + i * 16, 0, 0, 0, 4, rand(4, 10), 10));
    for (const s of [-1, 1]) g.add(place(tmesh(G.cyl, 0x30364a), 12 * s, 0, 75, Math.PI / 2, 0, 0, 7, 12, 7));
    for (const s of [-1, 1]) g.add(place(new THREE.Mesh(G.sphere, Toon.glow(0xff5aa0, 0.9)), 12 * s, 0, 82, 0, 0, 0, 6, 6, 3));
    const gens = [];
    for (const [x, y, z] of [[-24, 12, -30], [24, 12, -30], [-24, -12, 20], [24, -12, 20]]) {
      const p = new THREE.Group(); p.position.set(x, y, z); g.add(p);
      p.add(place(tmesh(G.cyl6, 0x8892a8), 0, 0, 0, 0, 0, Math.sign(x) * Math.PI / 2, 2.5, 8, 2.5));
      p.add(place(tmesh(G.sphere, 0x4ff0ff, { emissive: 0x1a8aa0, ei: 1.2 }), Math.sign(x) * 5, 0, 0, 0, 0, 0, 2.8));
      gens.push(p);
    }
    const reactor = new THREE.Group(); reactor.position.set(0, 24, 30); g.add(reactor);
    reactor.add(place(tmesh(G.sphere, 0xff2a7a, { emissive: 0xaa0040, ei: 1.4 }), 0, 0, 0, 0, 0, 0, 5));
    const shield = new THREE.Mesh(G.sphere, Toon.glow(0x4ff0ff, 0.25)); shield.scale.setScalar(8.5); reactor.add(shield);
    g.userData = { gens, reactor, shield };
    return g;
  },
  // Great Fox-style friendly carrier "Longhaul"
  longhaul() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.box, 0xdfe4ee), 0, 0, 0, 0, 0, 0, 30, 12, 120));
    g.add(place(tmesh(G.cone4, 0xdfe4ee), 0, 0, -78, -Math.PI / 2, Math.PI / 4, 0, 22, 40, 12));
    g.add(place(tmesh(G.box, 0x2f7bff), 0, 7, 10, 0, 0, 0, 14, 4, 60));
    g.add(place(tmesh(G.box, 0xb8c0d0), 0, 14, 40, 0, 0, 0, 10, 12, 18));
    for (const s of [-1, 1]) {
      g.add(place(tmesh(G.box, 0xc8cfdc), 24 * s, -2, 20, 0, 0, 0, 18, 6, 50));
      g.add(place(new THREE.Mesh(G.sphere, Toon.glow(0x66ccff, 0.9)), 24 * s, -2, 46, 0, 0, 0, 5, 4, 3));
    }
    g.add(place(new THREE.Mesh(G.box, Toon.glow(0xffd400, 0.8)), 0, -1, -58, 0, 0, 0, 12, 5, 1));
    return g;
  },
  tree(h = 1) {
    const g = new THREE.Group();
    g.add(place(tmesh(G.cyl6, 0x6b4220, { outline: 0.05 }), 0, 1.5 * h, 0, 0, 0, 0, 0.5, 3 * h, 0.5));
    g.add(place(tmesh(G.cone8, pick([0x2f9e44, 0x37b24d, 0x2b8a3e]), { outline: 0.08 }), 0, 5.5 * h, 0, 0, 0, 0, 2.6 * h, 6 * h, 2.6 * h));
    return g;
  },
  building(w, h, d, col) {
    const g = new THREE.Group();
    g.add(place(tmesh(G.box, col, { receive: true, material: buildingMaterial(col) }), 0, h / 2, 0, 0, 0, 0, w, h, d));
    g.add(place(tmesh(G.box, 0x30364a), 0, h + 0.4, 0, 0, 0, 0, w * 0.7, 0.8, d * 0.7));
    if (Math.random() < 0.4) g.add(place(tmesh(G.cyl, 0xaaaaaa, { outline: 0.04 }), w * 0.2, h + 3, 0, 0, 0, 0, 0.15, 5, 0.15));
    return g;
  },
  arch(col = 0xb8c0d0) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(place(tmesh(G.box, col, { receive: true }), 13 * s, 12, 0, 0, 0, 0, 4, 24, 4));
    g.add(place(tmesh(G.box, col), 0, 25, 0, 0, 0, 0, 30, 4, 4));
    g.add(place(new THREE.Mesh(G.box, Toon.glow(0xffcc33, 0.5)), 0, 22.6, 0, 0, 0, 0, 22, 0.8, 0.8));
    return g;
  },
  rockArch() {
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(place(tmesh(G.dodeca, 0x9c6b3c, { flat: true, receive: true }), 16 * s, 10, 0, rand(0, 3), rand(0, 3), 0, 6, 14, 6));
    g.add(place(tmesh(G.dodeca, 0xb07a45, { flat: true }), 0, 26, 0, 0.3, 0.2, 0.1, 22, 5, 6));
    return g;
  },
  rock(s = 1, col = 0x8d7b68) { return place(tmesh(G.dodeca, col, { flat: true, receive: true }), 0, 0, 0, rand(0, 3), rand(0, 3), rand(0, 3), s * rand(0.8, 1.3), s * rand(0.7, 1.2), s * rand(0.8, 1.3)); },
  asteroid(s = 1) { return place(tmesh(G.dodeca, pick([0x7a6e66, 0x8d7b68, 0x6b625b]), { flat: true, receive: true }), 0, 0, 0, rand(0, 3), rand(0, 3), rand(0, 3), s * rand(0.8, 1.3), s * rand(0.7, 1.2), s * rand(0.8, 1.3)); },
  ring(gold) {
    const g = new THREE.Group();
    g.add(place(tmesh(G.torus, gold ? 0xffcc33 : 0xdfe4ee, { emissive: gold ? 0x996600 : 0x556070, ei: 0.8, outline: 0.04 }), 0, 0, 0, 0, 0, 0, 3.2));
    return g;
  },
  checkpoint() {
    const g = new THREE.Group();
    g.add(place(tmesh(G.torus, 0x4ff0ff, { emissive: 0x1a8aa0, ei: 1, outline: 0.03 }), 0, 0, 0, 0, 0, 0, 9));
    g.add(place(new THREE.Mesh(G.torusThin, Toon.glow(0x4ff0ff, 0.6)), 0, 0, 0, 0, 0, 0, 7.5));
    return g;
  },
  item(kind) {
    const g = new THREE.Group();
    if (kind === 'laser') {
      g.add(place(tmesh(G.box, 0x39d353, { emissive: 0x157a2a, ei: 0.7 }), 0, 0, 0, 0, 0, 0, 2.2, 2.2, 2.2));
      g.add(place(tmesh(G.box, 0xffffff, { outline: 0.02 }), 0, 0, 0, 0, 0, 0, 0.5, 1.6, 2.3));
      g.add(place(tmesh(G.box, 0xffffff, { outline: 0.02 }), 0.5, -0.55, 0, 0, 0, 0, 1.2, 0.5, 2.3));
    } else if (kind === 'bomb') {
      g.add(place(tmesh(G.sphere, 0xff3b4e, { emissive: 0x660010, ei: 0.6 }), 0, 0, 0, 0, 0, 0, 1.4));
      g.add(place(tmesh(G.cyl, 0xffcc33), 0, 1.4, 0, 0, 0, 0, 0.3, 0.8, 0.3));
    } else if (kind === 'wing') {
      g.add(place(tmesh(G.wing, 0xdfe4ee, { emissive: 0x2f7bff, ei: 0.5 }), -1.7, 0, 0.4, 0, 0, 0, 1));
    }
    return g;
  },
};

// big structures get proportionally thicker ink lines
for (const [k, t] of Object.entries({ walker: 0.22, bastion: 0.3, dreadnought: 0.4, longhaul: 0.4, building: 0.18, arch: 0.18, rockArch: 0.25, rock: 0.15, asteroid: 0.2, tank: 0.1, turret: 0.12, bomber: 0.1 })) {
  const f = Models[k];
  Models[k] = (...a) => { Toon.defOL = t; try { return f.apply(Models, a); } finally { Toon.defOL = OUTLINE; } };
}

function buildingMaterial(col) {
  const key = 'bld' + col;
  let m = Toon.cache.get(key);
  if (!m) {
    m = new THREE.MeshToonNodeMaterial({ color: col, gradientMap: Toon.ramp });
    const base = color(col);
    m.colorNode = Fn(() => {
      const p = positionWorld;
      const wx = step(0.55, fract(p.x.add(p.z).mul(0.25)));
      const wy = step(0.5, fract(p.y.mul(0.3)));
      const win = wx.mul(wy);
      return mix(base, color(0xffe8a0), win.mul(0.55));
    })();
    Toon.cache.set(key, m);
  }
  return m;
}

// ---------------------------------------------------------------------------
// FX pools
// ---------------------------------------------------------------------------
const FX = {
  fireballs: [], sparks: null, sparkData: [], rings: [], beams: [], flashT: 0, shakeT: 0, shakeAmp: 0,
  init(scene) {
    // cel-shaded fireball spheres (two-band rim + progress fade)
    for (let i = 0; i < 140; i++) {
      const prog = uniform(0), cIn = uniform(new THREE.Color(0xfff2a0)), cOut = uniform(new THREE.Color(0xff6a1a));
      const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
      m.colorNode = Fn(() => {
        const vd = normalize(cameraPosition.sub(positionWorld));
        const rim = float(1).sub(abs(dot(normalWorld, vd)));
        const band = step(0.5, rim.add(prog.mul(0.6)));
        const c = mix(cIn, cOut, band);
        return mix(c, vec3(0.22, 0.2, 0.24), smoothstep(0.45, 0.8, prog));
      })();
      m.opacityNode = float(1).sub(smoothstep(0.55, 1.0, prog));
      const mesh = new THREE.Mesh(G.sphereLo, m); mesh.visible = false; mesh.frustumCulled = false;
      scene.add(mesh);
      this.fireballs.push({ mesh, prog, cIn, cOut, t: 0, life: 1, size: 1, vel: new V3(), active: false });
    }
    // sparks / chips — instanced
    const sm = new THREE.MeshBasicNodeMaterial({ fog: false });
    this.sparks = new THREE.InstancedMesh(G.tetra, sm, 700);
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparks.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < 700; i++) { this.sparks.setColorAt(i, col.set(0xffcc33)); this.sparkData.push({ p: new V3(), v: new V3(), t: 0, life: 0, s: 1, active: false, spin: new V3() }); tmpM.makeScale(0, 0, 0); this.sparks.setMatrixAt(i, tmpM); }
    scene.add(this.sparks);
    // shockwave rings
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(G.torus, new THREE.MeshBasicNodeMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      mesh.visible = false; scene.add(mesh); this.rings.push({ mesh, t: 0, life: 1, size: 1, active: false });
    }
    this.sparkIdx = 0;
  },
  fireball(pos, size = 1, life = 0.8, vel = null, inner = 0xfff2a0, outer = 0xff6a1a) {
    const f = this.fireballs.find(x => !x.active) || this.fireballs[Math.floor(Math.random() * this.fireballs.length)];
    f.active = true; f.t = 0; f.life = life; f.size = size; f.mesh.visible = true;
    f.mesh.position.copy(pos); f.vel.copy(vel || tmpV.set(0, 0, 0));
    f.cIn.value.set(inner); f.cOut.value.set(outer);
    f.mesh.rotation.set(rand(0, 3), rand(0, 3), 0);
    return f;
  },
  spark(pos, vel, colorHex = 0xffcc33, life = 0.6, s = 0.3) {
    const i = this.sparkIdx = (this.sparkIdx + 1) % 700;
    const d = this.sparkData[i];
    d.active = true; d.t = 0; d.life = life; d.s = s; d.p.copy(pos); d.v.copy(vel); d.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
    this.sparks.setColorAt(i, tmpColor.set(colorHex)); this.sparks.instanceColor.needsUpdate = true;
  },
  shock(pos, size = 10, life = 0.6, colorHex = 0xffffff, normal = null) {
    const r = this.rings.find(x => !x.active) || this.rings[0];
    r.active = true; r.t = 0; r.life = life; r.size = size; r.mesh.visible = true; r.mesh.position.copy(pos);
    r.mesh.material.color.set(colorHex);
    if (normal) r.mesh.quaternion.setFromUnitVectors(new V3(0, 0, 1), normal); else r.mesh.rotation.set(Math.PI / 2, 0, 0);
  },
  explode(pos, size = 1, opts = {}) {
    const n = Math.round(4 + size * 4);
    for (let i = 0; i < n; i++) {
      const off = tmpV2.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(size * 1.4);
      this.fireball(tmpV3.copy(pos).add(off), size * rand(1.2, 2.4), rand(0.5, 0.9) * (0.8 + size * 0.15), off.clone().multiplyScalar(1.5));
    }
    for (let i = 0; i < 10 + size * 8; i++) this.spark(pos, tmpV.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(15, 45) * Math.sqrt(size)), pick([0xffcc33, 0xff6a1a, 0xffffff, opts.chip || 0x8892a8]), rand(0.5, 1.2), rand(0.25, 0.6) * Math.sqrt(size));
    if (size >= 2) this.shock(pos, size * 6, 0.5, 0xffd080);
    Sound.sfx(size >= 4 ? 'bigboom' : 'boom', { size: Math.min(2, 0.6 + size * 0.2), vol: opts.vol ?? 1 });
  },
  shake(amp, t = 0.3) { if (!Settings.data.shake) return; this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeT = Math.max(this.shakeT, t); },
  flash(a = 0.6) { const f = $('#flash'); f.style.opacity = a; setTimeout(() => f.style.opacity = 0, 80); },
  update(dt) {
    for (const f of this.fireballs) {
      if (!f.active) continue;
      f.t += dt; const p = f.t / f.life;
      if (p >= 1) { f.active = false; f.mesh.visible = false; continue; }
      f.prog.value = p;
      f.mesh.scale.setScalar(f.size * (0.4 + Math.sqrt(p) * 1.1));
      f.mesh.position.addScaledVector(f.vel, dt); f.vel.multiplyScalar(1 - 2.5 * dt); f.mesh.position.y += dt * 2 * p;
    }
    let dirty = false;
    for (let i = 0; i < 700; i++) {
      const d = this.sparkData[i];
      if (!d.active) continue;
      dirty = true; d.t += dt;
      if (d.t >= d.life) { d.active = false; tmpM.makeScale(0, 0, 0); this.sparks.setMatrixAt(i, tmpM); continue; }
      d.v.y -= 20 * dt; d.v.multiplyScalar(1 - 1.2 * dt); d.p.addScaledVector(d.v, dt);
      const s = d.s * (1 - d.t / d.life);
      tmpE.set(d.spin.x * d.t, d.spin.y * d.t, d.spin.z * d.t); tmpQ.setFromEuler(tmpE);
      tmpM.compose(d.p, tmpQ, tmpV.set(s, s, s)); this.sparks.setMatrixAt(i, tmpM);
    }
    if (dirty) this.sparks.instanceMatrix.needsUpdate = true;
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt; const p = r.t / r.life;
      if (p >= 1) { r.active = false; r.mesh.visible = false; continue; }
      r.mesh.scale.setScalar(r.size * (0.2 + p)); r.mesh.material.opacity = 1 - p;
    }
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmp = 0; }
  },
  clear() {
    for (const f of this.fireballs) { f.active = false; f.mesh.visible = false; }
    for (let i = 0; i < 700; i++) { this.sparkData[i].active = false; tmpM.makeScale(0, 0, 0); this.sparks.setMatrixAt(i, tmpM); }
    this.sparks.instanceMatrix.needsUpdate = true;
    for (const r of this.rings) { r.active = false; r.mesh.visible = false; }
  },
};
const tmpColor = new THREE.Color();
