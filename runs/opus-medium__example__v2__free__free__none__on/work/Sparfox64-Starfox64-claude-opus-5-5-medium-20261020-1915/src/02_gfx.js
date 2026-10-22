// ===== 02_gfx.js — WebGPU renderer (no fallback), cel-shading materials, post FX, sky, water =====
const Gfx = {
  renderer: null, scene: null, camera: null, post: null, sun: null, hemi: null, fxLights: [],
  shake: 0, shakeT: 0, fovKick: 0,
  async init() {
    if (!navigator.gpu) throw new Error('This browser does not expose WebGPU (navigator.gpu is missing).');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter is available on this device.');
    const renderer = this.renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
    await renderer.init();
    if (!renderer.backend || !renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend failed to initialise (fallbacks are disabled).');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.classList.add('gl');
    document.getElementById('app').prepend(renderer.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fd3ff);
    scene.fog = new THREE.Fog(0xa8dcff, 300, 1500);
    const camera = this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 6000);
    scene.add(camera);

    this.hemi = new THREE.HemisphereLight(0xdff3ff, 0x5a6a3a, 1.1); scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera; sc.left = -220; sc.right = 220; sc.top = 220; sc.bottom = -220; sc.near = 10; sc.far = 900;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    // fixed pool of explosion point lights (constant light count avoids shader recompiles)
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffa040, 0, 120, 1.6); scene.add(l); this.fxLights.push({ l, t: 0, life: 1, peak: 0 }); }

    this.buildSky();
    // post: toon outlines (inverted hull, screen-space) + bloom on HDR emissives
    const post = this.post = new THREE.PostProcessing(renderer);
    const scenePass = toonOutlinePass(scene, camera, new THREE.Color(0x0a0a18), 0.0032, 1);
    const bloomPass = bloom(scenePass, 0.9, 0.35, 0.92);
    this.bloomPass = bloomPass;
    post.outputNode = scenePass.add(bloomPass);
    addEventListener('resize', () => this.resize());
  },
  resize() { this.renderer.setSize(innerWidth, innerHeight); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); HUD.resize(); },
  buildSky() {
    const top = uniform(new THREE.Color(0x2f7fe0)), hor = uniform(new THREE.Color(0xbfe7ff)), sunC = uniform(new THREE.Color(0xfff6d8));
    this.skyU = { top, hor, sunC };
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    const dir = normalize(positionLocal);
    const h = dir.y.max(0).pow(0.55);
    // banded (cel) sky gradient
    const banded = h.mul(5).floor().div(5);
    m.colorNode = mix(hor, top, banded.add(h).mul(0.5));
    const sky = this.sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), m);
    sky.frustumCulled = false; sky.renderOrder = -10;
    this.scene.add(sky);
    // stylised sun disc
    const sd = new THREE.Mesh(new THREE.CircleGeometry(140, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.5), fog: false }));
    this.sunDisc = sd; this.scene.add(sd);
  },
  setSkyColors(top, hor, fog, near, far) {
    this.skyU.top.value.set(top); this.skyU.hor.value.set(hor);
    this.scene.fog.color.set(fog); this.scene.fog.near = near; this.scene.fog.far = far; this.scene.background.set(fog);
  },
  flashLight(pos, intensity = 60, life = 0.5, col = 0xffa040) {
    let best = this.fxLights[0];
    for (const f of this.fxLights) if (f.t >= f.life) { best = f; break; } else if (f.t / f.life > best.t / best.life) best = f;
    best.l.position.copy(pos); best.l.color.set(col); best.t = 0; best.life = life; best.peak = intensity;
  },
  addShake(a) { this.shake = Math.min(2.5, this.shake + a * Settings.shake); },
  update(dt, focus) {
    for (const f of this.fxLights) { f.t += dt; const k = clamp(1 - f.t / f.life, 0, 1); f.l.intensity = f.peak * k * k; }
    this.shake = Math.max(0, this.shake - dt * 2.2);
    if (focus) {
      this.sun.position.set(focus.x + 200, focus.y + 260, focus.z - 380);
      this.sun.target.position.copy(focus);
      this.sky.position.copy(this.camera.position);
      this.sunDisc.position.copy(this.camera.position).add(_v1.set(200, 260, -380).normalize().multiplyScalar(3800));
      this.sunDisc.lookAt(this.camera.position);
    }
  },
  applyShake(t) {
    if (this.shake <= 0) return;
    const s = this.shake * this.shake * 0.6;
    this.camera.position.x += Math.sin(t * 71) * s; this.camera.position.y += Math.cos(t * 53) * s;
    this.camera.rotation.z += Math.sin(t * 37) * s * 0.02;
  },
  render() { this.post.render(); },
};

// ---------- materials ----------
let _gradTex = null;
function gradientMap() {
  if (_gradTex) return _gradTex;
  const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  _gradTex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _gradTex.minFilter = THREE.NearestFilter; _gradTex.magFilter = THREE.NearestFilter; _gradTex.generateMipmaps = false; _gradTex.needsUpdate = true;
  return _gradTex;
}
const _matCache = new Map();
function toon(col, opts = {}) {
  const { unique, ...rest } = opts;
  const key = unique ? null : col + JSON.stringify(rest);
  if (key && _matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshToonMaterial(Object.assign({ color: col, gradientMap: gradientMap() }, rest));
  if (key) _matCache.set(key, m);
  return m;
}
function glow(r, g, b, opts = {}) { return new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(r, g, b), fog: true }, opts)); }
function shadowed(o, cast = true, recv = true) { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; }

// windows texture for buildings
function windowTexture(base, lit) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 64, 128);
  for (let j = 0; j < 16; j++) for (let i = 0; i < 4; i++) { x.fillStyle = Math.random() < 0.25 ? lit : 'rgba(20,30,60,.65)'; x.fillRect(6 + i * 15, 5 + j * 8, 9, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter;
  return t;
}

// stylised toon water (banded foam stripes, animated)
function waterMaterial() {
  const m = new THREE.MeshBasicNodeMaterial();
  const p = positionWorld;
  const w1 = sin(p.x.mul(0.035).add(p.z.mul(0.02)).add(time.mul(1.3)));
  const w2 = sin(p.z.mul(0.05).sub(p.x.mul(0.013)).add(time.mul(0.9)));
  const w = w1.add(w2).mul(0.5);
  const deep = color(0x1f6fc0), mid = color(0x2f8fe0), foam = color(0xe8f8ff);
  const band = step(0.35, w);
  const foamLine = step(0.92, w);
  m.colorNode = mix(mix(deep, mid, band), foam, foamLine);
  return m;
}
