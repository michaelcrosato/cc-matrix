/* ============================== renderer ============================== */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.5, 2600);
scene.add(camera);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.55, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a4a, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 500 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
const SUN_DIR = V3(-0.4, 0.8, 0.35).normalize();

/* ---- sky dome ---- */
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color(0x2f6fd6) }, mid: { value: new THREE.Color(0xffc9a0) }, bot: { value: new THREE.Color(0xf0c9b4) } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0.0 ? mix(mid,top,pow(clamp(h*1.4,0.0,1.0),0.7)) : mix(mid,bot,clamp(-h*4.0,0.0,1.0)); gl_FragColor=vec4(c,1.0); }',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 24, 16), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);

function radialTex(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]);
const cloudTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  for (let i = 0; i < 22; i++) {
    const px = 40 + Math.random() * 176, py = 50 + Math.random() * 40, r = 22 + Math.random() * 30;
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(c);
})();
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
sunSprite.scale.set(500, 500, 1); sunSprite.renderOrder = -9;
scene.add(sunSprite);
const cloudGroup = new THREE.Group();
for (let i = 0; i < 46; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: rnd(0.5, 0.9), fog: false, color: 0xffffff }));
  const a = rnd(Math.PI * 2), r = rnd(900, 1500);
  sp.position.set(Math.cos(a) * r, rnd(40, 320), Math.sin(a) * r); sp.scale.set(rnd(260, 520), rnd(90, 160), 1);
  cloudGroup.add(sp);
}
scene.add(cloudGroup);

const ENVS = {
  sea: { top: 0x2c66d0, mid: 0xffc79a, bot: 0xf2cdb8, fog: 0xf0c9b0, near: 160, far: 950, hemiS: 0xbfd8ff, hemiG: 0x806a58, sun: 0xfff0d0, sunI: 2.4, hemiI: 0.9, cloud: 0xffffff },
  canyon: { top: 0x4a3590, mid: 0xff9566, bot: 0xd98d6e, fog: 0xd98d70, near: 120, far: 820, hemiS: 0xd7b8ff, hemiG: 0x7a4a3a, sun: 0xffc38a, sunI: 2.2, hemiI: 0.85, cloud: 0xffd2b0 },
  boss: { top: 0x20123e, mid: 0xd0504a, bot: 0x8a3a42, fog: 0x7a3440, near: 100, far: 760, hemiS: 0xffa0a0, hemiG: 0x402030, sun: 0xff9a7a, sunI: 2.0, hemiI: 0.8, cloud: 0xff9a9a },
  arena: { top: 0x061038, mid: 0x4ab0e8, bot: 0x2f78a8, fog: 0x3a7eaf, near: 300, far: 1500, hemiS: 0x9cc8ff, hemiG: 0x2a4a6a, sun: 0xe8f4ff, sunI: 2.6, hemiI: 0.95, cloud: 0xdff0ff },
};
let curEnv = 'sea';
function setEnv(name) {
  curEnv = name; const e = ENVS[name];
  skyMat.uniforms.top.value.set(e.top); skyMat.uniforms.mid.value.set(e.mid); skyMat.uniforms.bot.value.set(e.bot);
  scene.fog = new THREE.Fog(e.fog, e.near, e.far);
  hemi.color.set(e.hemiS); hemi.groundColor.set(e.hemiG); hemi.intensity = e.hemiI;
  sun.color.set(e.sun); sun.intensity = e.sunI;
  cloudGroup.children.forEach((c) => c.material.color.set(e.cloud));
  sunSprite.material.color.set(e.sun);
}
function updateEnvFollow(cam) {
  sky.position.copy(cam.position);
  cloudGroup.position.set(cam.position.x, 0, cam.position.z);
  sunSprite.position.copy(cam.position).addScaledVector(SUN_DIR, 1700);
}

/* ============================== particles ============================== */
const Fx = {
  N: 5000, i: 0, geo: null, pts: null, vel: null, life: null, maxLife: null, grav: null, drag: null, base: null, flashes: [], rings: [],
  init() {
    const N = this.N; this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.size = new Float32Array(N); this.alpha = new Float32Array(N);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.maxLife = new Float32Array(N).fill(1); this.grav = new Float32Array(N); this.drag = new Float32Array(N);
    this.base = new Float32Array(N); this.pos.fill(99999);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=max(1.0,size*uScale/-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5)*2.0; float a=smoothstep(1.0,0.0,d); gl_FragColor=vec4(vC*(0.6+a),a*vA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.pts = new THREE.Points(this.geo, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  },
  emit(p, n, o = {}) {
    const c = new THREE.Color(o.color === undefined ? 0xffaa44 : o.color), c2 = new THREE.Color(o.color2 === undefined ? (o.color === undefined ? 0xff4400 : o.color) : o.color2);
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.N; const j = i * 3;
      let dx = rnd(-1, 1), dy = rnd(-1, 1), dz = rnd(-1, 1); const m = Math.hypot(dx, dy, dz) || 1; dx /= m; dy /= m; dz /= m;
      const sp = (o.speed || 20) * rnd(0.3, 1);
      this.pos[j] = p.x + (o.spread ? rnd(-o.spread, o.spread) : 0); this.pos[j + 1] = p.y + (o.spread ? rnd(-o.spread, o.spread) : 0); this.pos[j + 2] = p.z + (o.spread ? rnd(-o.spread, o.spread) : 0);
      const bv = o.vel;
      this.vel[j] = dx * sp + (bv ? bv.x : 0); this.vel[j + 1] = dy * sp + (bv ? bv.y : 0); this.vel[j + 2] = dz * sp + (bv ? bv.z : 0);
      const t = Math.random(); const cc = c.clone().lerp(c2, t);
      this.col[j] = cc.r; this.col[j + 1] = cc.g; this.col[j + 2] = cc.b;
      this.base[i] = (o.size || 1.2) * rnd(0.6, 1.2); this.size[i] = this.base[i];
      this.life[i] = this.maxLife[i] = (o.life || 0.8) * rnd(0.6, 1.1); this.grav[i] = o.grav || 0; this.drag[i] = o.drag === undefined ? 1.5 : o.drag; this.alpha[i] = 1;
    }
  },
  flash(p, size, color = 0xffd080, dur = 0.35) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(p); sp.scale.setScalar(size * 0.3); scene.add(sp); this.flashes.push({ sp, t: 0, dur, size });
  },
  ring(p, maxR, color = 0xffffff, dur = 0.6) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(p); m.scale.setScalar(0.1); scene.add(m); this.rings.push({ m, t: 0, dur, maxR });
  },
  explosion(p, size = 1, color = 0xffaa44) {
    this.emit(p, Math.floor(26 * size), { speed: 28 * size, size: 2.2 * size, life: 0.9, color, color2: 0xff3300, drag: 2.2 });
    this.emit(p, Math.floor(10 * size), { speed: 14 * size, size: 3.4 * size, life: 0.6, color: 0xffffff, color2: 0xffcc66, drag: 3 });
    this.emit(p, Math.floor(12 * size), { speed: 40 * size, size: 0.7, life: 1.1, color: 0xffee99, color2: 0xff7722, drag: 1, grav: -10 });
    this.flash(p, 14 * size, 0xffd080, 0.35); this.ring(p, 5 * size, 0xffc080, 0.4);
  },
  update(dt) {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt; const j = i * 3;
      if (this.life[i] <= 0) { this.pos[j] = this.pos[j + 1] = this.pos[j + 2] = 99999; this.alpha[i] = 0; continue; }
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[j] *= dr; this.vel[j + 1] = this.vel[j + 1] * dr + this.grav[i] * dt; this.vel[j + 2] *= dr;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const f = this.life[i] / this.maxLife[i]; this.alpha[i] = Math.min(1, f * 1.6); this.size[i] = this.base[i] * (0.4 + f * 0.8);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true; this.geo.attributes.alpha.needsUpdate = true;
    this.mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (let k = this.flashes.length - 1; k >= 0; k--) {
      const f = this.flashes[k]; f.t += dt; const u = f.t / f.dur;
      if (u >= 1) { scene.remove(f.sp); f.sp.material.dispose(); this.flashes.splice(k, 1); continue; }
      f.sp.scale.setScalar(f.size * (0.3 + u * 0.9)); f.sp.material.opacity = 1 - u;
    }
    for (let k = this.rings.length - 1; k >= 0; k--) {
      const f = this.rings[k]; f.t += dt; const u = f.t / f.dur;
      if (u >= 1) { scene.remove(f.m); f.m.material.dispose(); f.m.geometry.dispose(); this.rings.splice(k, 1); continue; }
      f.m.scale.setScalar(0.1 + f.maxR * (1 - Math.pow(1 - u, 2))); f.m.material.opacity = 0.6 * (1 - u);
    }
  },
  clear() {
    this.life.fill(0); this.pos.fill(99999); this.alpha.fill(0);
    this.flashes.forEach((f) => scene.remove(f.sp)); this.flashes.length = 0;
    this.rings.forEach((f) => scene.remove(f.m)); this.rings.length = 0;
  },
};
Fx.init();

/* ============================== models ============================== */
const MAT = {};
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.62, metalness: 0.25 }, o));
const GLOW = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: i, flatShading: true });
const BASIC = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
function box(w, h, d, mat, x = 0, y = 0, z = 0) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z); }
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 10) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z); }
function wingGeo(span, lead, tipLead, tipTrail, trail, thick) {
  const s = new THREE.Shape(); s.moveTo(0, lead); s.lineTo(span, tipLead); s.lineTo(span, tipTrail); s.lineTo(0, trail); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, thick / 2, 0); return g;
}
function addShadow(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

const Mdl = {
  hero(pal = {}) {
    const g = new THREE.Group(); g.userData.flames = [];
    const body = M(pal.body || 0xe9eef7, { metalness: 0.45 }), acc = M(pal.acc || 0x23a4c9), hot = M(pal.hot || 0xff8a2a), dark = M(0x2b3140);
    const fus = mesh(new THREE.ConeGeometry(0.85, 5.2, 6), body); fus.rotation.x = -Math.PI / 2; fus.position.z = -0.3; g.add(fus);
    const tail = mesh(new THREE.CylinderGeometry(0.85, 0.6, 2.4, 6), body); tail.rotation.x = Math.PI / 2; tail.position.z = 2.4; g.add(tail);
    const canopy = mesh(new THREE.SphereGeometry(0.62, 10, 8), M(0x6fe0ff, { metalness: 0.9, roughness: 0.1, emissive: 0x0a4a66 }), 0, 0.5, -0.6); canopy.scale.set(1, 0.75, 2.1); g.add(canopy);
    const wg = wingGeo(3.6, -0.6, 1.2, 2.0, 2.2, 0.14);
    const wl = mesh(wg, acc), wr = mesh(wg.clone(), acc); wl.scale.x = -1; wl.material = acc.clone(); wl.material.side = THREE.DoubleSide; wr.material = wl.material;
    wl.position.set(-0.4, -0.1, 0.4); wr.position.set(0.4, -0.1, 0.4); g.add(wl, wr);
    for (const sx of [-1, 1]) {
      const fin = box(0.12, 1.5, 1.4, hot, sx * 1.1, 0.8, 2.4); fin.rotation.z = sx * -0.25; g.add(fin);
      const tip = box(0.2, 0.2, 2.4, hot, sx * 3.9, -0.1, 1.6); g.add(tip);
      const eng = cyl(0.42, 0.5, 1.5, dark, sx * 0.9, -0.05, 2.9, 8); eng.rotation.x = Math.PI / 2; g.add(eng);
      const noz = mesh(new THREE.CircleGeometry(0.4, 8), GLOW(0x66ccff, 3), sx * 0.9, -0.05, 3.66); noz.castShadow = false; g.add(noz);
      const fl = mesh(new THREE.ConeGeometry(0.34, 2.2, 8), BASIC(0x7fe6ff, { transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), sx * 0.9, -0.05, 4.7);
      fl.rotation.x = Math.PI / 2; fl.castShadow = false; g.add(fl); g.userData.flames.push(fl);
    }
    return g;
  },
  drone() {
    const g = new THREE.Group(); const dark = M(0x5a3f7e), red = M(0xc0304e);
    const b = mesh(new THREE.OctahedronGeometry(1.2), dark); b.scale.set(1, 0.55, 1.7); g.add(b);
    for (const sx of [-1, 1]) { const w = box(3.4, 0.14, 1.3, red, sx * 2.2, 0, 0.3); w.rotation.y = sx * -0.45; w.rotation.z = sx * 0.15; g.add(w); const t = box(0.14, 0.9, 0.9, dark, sx * 3.7, 0.3, 0.9); g.add(t); }
    const eye = mesh(new THREE.SphereGeometry(0.36, 8, 6), GLOW(0xff3050, 3), 0, 0.15, -1.3); g.add(eye);
    const eng = mesh(new THREE.CircleGeometry(0.35, 6), GLOW(0xff7a30, 3), 0, 0, 1.9); eng.rotation.y = Math.PI; g.add(eng);
    return g;
  },
  interceptor() {
    const g = new THREE.Group(); const o = M(0xe06a20), k = M(0x1c1c28);
    const b = mesh(new THREE.ConeGeometry(0.8, 5.2, 4), k); b.rotation.x = -Math.PI / 2; g.add(b);
    for (const sx of [-1, 1]) { const w = mesh(wingGeo(3.2, 0.6, -0.9, 0.6, 1.8, 0.12), o); w.material.side = THREE.DoubleSide; w.scale.x = sx; w.position.set(sx * 0.3, 0, 1.0); g.add(w); }
    g.add(mesh(new THREE.SphereGeometry(0.4, 8, 6), GLOW(0xffcc40, 3), 0, 0.4, -0.6));
    g.add(mesh(new THREE.CircleGeometry(0.4, 6), GLOW(0xff6020, 3), 0, 0, 2.7)); g.children[g.children.length - 1].rotation.y = Math.PI;
    return g;
  },
  bomber() {
    const g = new THREE.Group(); const a = M(0x4a5470), r = M(0xb02a3a);
    g.add(box(4.4, 2.2, 8, a)); g.add(box(7.5, 0.4, 2.6, r, 0, 0, 0.5)); g.add(box(1.2, 1.2, 3, r, 0, 1.4, -2));
    for (const sx of [-1, 1]) { const e = cyl(0.9, 1.1, 3.4, M(0x2a2e3c), sx * 3.2, 0, 2, 8); e.rotation.x = Math.PI / 2; g.add(e); g.add(mesh(new THREE.CircleGeometry(0.8, 8), GLOW(0xff7a30, 3), sx * 3.2, 0, 3.75)); g.children[g.children.length - 1].rotation.y = Math.PI; }
    g.add(mesh(new THREE.SphereGeometry(0.6, 8, 6), GLOW(0xff3050, 3), 0, 0.3, -4));
    return g;
  },
  turret() {
    const g = new THREE.Group(); const a = M(0x7a7f8f), r = M(0xc0304e);
    g.add(cyl(2.6, 3.2, 1.6, a, 0, 0.8, 0, 8)); const head = new THREE.Group(); head.position.y = 2;
    head.add(mesh(new THREE.SphereGeometry(1.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), r)); const brl = box(0.5, 0.5, 3.4, a, 0, 0.7, -2); head.add(brl);
    head.add(mesh(new THREE.SphereGeometry(0.4, 6, 6), GLOW(0xff3050, 3), 0, 1.2, -1.3)); g.add(head); g.userData.head = head; return g;
  },
  tower() {
    const g = new THREE.Group(); const a = M(0x8a8f9f), r = M(0xc0304e);
    g.add(cyl(2.2, 3.4, 18, a, 0, 9, 0, 8)); for (let i = 0; i < 3; i++) g.add(cyl(3, 3, 0.5, r, 0, 4 + i * 5, 0, 8));
    const head = new THREE.Group(); head.position.y = 19; head.add(mesh(new THREE.SphereGeometry(2.4, 8, 6), r)); head.add(box(0.7, 0.7, 4, a, 0, 0, -3));
    head.add(mesh(new THREE.SphereGeometry(0.6, 6, 6), GLOW(0xff3050, 3), 0, 0.4, -2)); g.add(head); g.userData.head = head; return g;
  },
  mine() {
    const g = new THREE.Group(); const a = M(0x40404c);
    g.add(mesh(new THREE.IcosahedronGeometry(1.5, 0), a));
    for (let i = 0; i < 10; i++) { const c = mesh(new THREE.ConeGeometry(0.28, 1.3, 5), M(0x9a3040)); const d = V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); c.position.copy(d).multiplyScalar(1.8); c.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(c); }
    g.add(mesh(new THREE.SphereGeometry(0.7, 8, 6), GLOW(0xff3050, 3))); return g;
  },
  missile() {
    const g = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(0.5, 2.2, 6), M(0xd8d8e0)); c.rotation.x = -Math.PI / 2; g.add(c);
    const b = cyl(0.5, 0.5, 1.6, M(0xc0304e), 0, 0, 1.6, 6); b.rotation.x = Math.PI / 2; g.add(b);
    g.add(mesh(new THREE.SphereGeometry(0.45, 6, 6), GLOW(0xff8a30, 3.5), 0, 0, 2.6)); return g;
  },
  ring(color, r = 5) {
    const g = new THREE.Group();
    const t = mesh(new THREE.TorusGeometry(r, 0.45, 8, 28), GLOW(color, 2.6)); t.castShadow = false; g.add(t);
    const t2 = mesh(new THREE.TorusGeometry(r * 0.8, 0.12, 6, 28), BASIC(0xffffff, { transparent: true, opacity: 0.5 })); t2.castShadow = false; g.add(t2);
    const disc = mesh(new THREE.CircleGeometry(r * 0.8, 20), BASIC(color, { transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); disc.castShadow = false; g.add(disc); return g;
  },
  pod(color) {
    const g = new THREE.Group(); const c = mesh(new THREE.OctahedronGeometry(2.2), GLOW(color, 2.2)); g.add(c);
    const r = mesh(new THREE.TorusGeometry(3.4, 0.2, 6, 20), BASIC(0xffffff, { transparent: true, opacity: 0.8 })); g.add(r); g.userData.r = r; return g;
  },
  rock(h, r, col) { const m = mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(Math.random() * 3)), M(col)); m.position.y = h / 2; return m; },
  tree(sz = 1) {
    const g = new THREE.Group(); g.add(cyl(0.4 * sz, 0.6 * sz, 3 * sz, M(0x6a4a2a), 0, 1.5 * sz, 0, 5));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.ConeGeometry((3 - i) * 0.9 * sz, 3 * sz, 6), M(i % 2 ? 0x3a8a4a : 0x2f7a40), 0, (3.5 + i * 1.8) * sz, 0)); return g;
  },
  crystal(h, col) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const c = mesh(new THREE.ConeGeometry(h * 0.12, h * (1 - i * 0.2), 5), GLOW(col, 1.3)); c.position.set(rnd(-1.5, 1.5), h * (1 - i * 0.2) / 2, rnd(-1.5, 1.5)); c.rotation.z = rnd(-0.3, 0.3); g.add(c); } return g; },
  enemyBullet(big) {
    const k = big ? 1 : 0, g = new THREE.Group(); const C = Mdl._eb || (Mdl._eb = [{ a: new THREE.SphereGeometry(0.7, 8, 6), b: new THREE.SphereGeometry(1.2, 8, 6) }, { a: new THREE.SphereGeometry(1.1, 8, 6), b: new THREE.SphereGeometry(1.9, 8, 6) }, BASIC(0xff5a30), BASIC(0xff2020, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })]);
    g.add(new THREE.Mesh(C[k].a, C[2])); g.add(new THREE.Mesh(C[k].b, C[3])); return g;
  },
};
// shared bolt geometries
const BOLT = {
  g: new THREE.BoxGeometry(0.22, 0.22, 3.6),
  m1: BASIC(0x7dffb0), m2: BASIC(0x7de8ff), m3: BASIC(0xffe36d), ally: BASIC(0xffa0e8), refl: BASIC(0xffffff), charge: BASIC(0xffffff),
  msl: new THREE.ConeGeometry(0.4, 2.2, 6),
};
