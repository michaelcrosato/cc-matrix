import * as THREE from 'three/webgpu';
import { uniform, positionWorld, cameraPosition, normalize, smoothstep, mix, sin, step, length, vec3, vec2, float, time, color, mrt, output, normalView, toonOutlinePass, Fn, abs, max, uv, screenSize, perspectiveDepthToViewZ, hash, floor, oneMinus, vec4 } from 'three/tsl';
import { PALETTES } from '../data/palettes.js';
import { INK } from '../data/config.js';
import { tuning } from '../data/tuning.js';

export const R = { THREE };
export const hex = (h) => new THREE.Color('#' + h);

// shared 3-step toon ramp
export function toonRamp() {
  const d = new Uint8Array([96, 178, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
}
let ramp = null;
export function toon(c, opts = {}) {
  ramp = ramp || toonRamp();
  return new THREE.MeshToonNodeMaterial({ color: c, gradientMap: ramp, ...opts });
}

export class Gfx {
  constructor() {
    this.enabled = false; this.lost = null; this.frames = 0; this.backend = 'none';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 1000);
    this.camera.position.set(0, 4, 12);
    this.pal = {}; // uniforms
    for (const k of ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi']) this.pal[k] = uniform(new THREE.Color('#' + PALETTES.noon[k]));
    this.palCur = JSON.parse(JSON.stringify(PALETTES.noon)); this.palFrom = null; this.palTo = null; this.palT = 1;
    this.islandCentre = uniform(new THREE.Vector3(0, 0, 0));
    this.seaFoam = uniform(1);
    this.buildLights(); this.buildSky(); this.buildSea();
    this.stage = new THREE.Group(); this.scene.add(this.stage);
    this.clouds = []; this.buildClouds();
  }
  async init(canvasParent) {
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    canvasParent.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    await this.renderer.init();
    this.backend = this.renderer.backend && this.renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
    try { const dev = this.renderer.backend.device; if (dev && dev.lost) dev.lost.then((i) => { this.lost = (i && (i.message || i.reason)) || 'lost'; }); } catch (e) { /* ignore */ }
    this.makeInk();
    this.enabled = true;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  buildLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.position.set(14, 26, 12); this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(2048, 2048); s.bias = -0.0006; s.normalBias = 0.035;
    s.camera.left = -30; s.camera.right = 30; s.camera.top = 30; s.camera.bottom = -30; s.camera.near = 1; s.camera.far = 90;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.3);
    this.scene.add(this.sun, this.sun.target, this.hemi);
  }
  buildSky() {
    const dir = normalize(positionWorld.sub(cameraPosition));
    const y = dir.y;
    const c = mix(mix(this.pal.skyLow, this.pal.skyMid, smoothstep(0, 0.14, y)), this.pal.skyTop, smoothstep(0.1, 0.5, y));
    const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false }); m.colorNode = c; m.fog = false;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), m); this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }
  buildSea() {
    const p = positionWorld.xz.sub(this.islandCentre.xz);
    const d = length(p);
    const warp = sin(p.x.mul(0.13).add(time.mul(0.3))).mul(2).add(sin(p.y.mul(0.11).sub(time.mul(0.2))).mul(2));
    const wave = sin(d.mul(0.9).add(warp).sub(time.mul(0.8))).mul(0.5).add(0.5);
    let col = mix(this.pal.sea, this.pal.seaHi, step(0.86, wave));
    const foam = smoothstep(0.55, 0.0, abs(d.sub(25.2).sub(sin(time.mul(1.3)).mul(0.4)))).mul(this.seaFoam);
    col = mix(col, vec3(1, 1, 1), step(0.5, foam).mul(0.9));
    const dist = length(positionWorld.sub(cameraPosition));
    col = mix(col, this.pal.skyLow, smoothstep(60, 260, dist));
    const m = new THREE.MeshBasicNodeMaterial(); m.colorNode = col;
    this.seaMesh = new THREE.Mesh(new THREE.CircleGeometry(590, 64).rotateX(-Math.PI / 2), m); this.seaMesh.position.y = -0.4; this.seaMesh.frustumCulled = false;
    this.scene.add(this.seaMesh);
  }
  buildClouds() {
    const m = toon(0xffffff);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m); s.scale.set(5 + j * 1.5, 1.8 + (j % 2), 3); s.position.set((j - 1.5) * 4.2, (j % 2) * 0.8, 0); g.add(s); }
      const a = i / 9 * Math.PI * 2; g.position.set(Math.cos(a) * (120 + (i % 3) * 30), 38 + (i % 4) * 7, Math.sin(a) * (120 + (i % 3) * 30)); g.rotation.y = -a + Math.PI / 2;
      g.userData.sp = 0.003 + (i % 4) * 0.0015; this.scene.add(g); this.clouds.push(g);
    }
  }
  // palette blending over 3 s
  setPalette(name, instant = false) {
    const to = PALETTES[name]; if (!to) return;
    this.palName = name;
    if (instant) { this.palCur = JSON.parse(JSON.stringify(to)); this.palT = 1; this.applyPal(); return; }
    this.palFrom = JSON.parse(JSON.stringify(this.palCur)); this.palTo = to; this.palT = 0;
  }
  updatePal(dt) {
    if (this.palT < 1 && this.palTo) {
      this.palT = Math.min(1, this.palT + dt / 3);
      const f = this.palFrom, t = this.palTo, a = this.palT;
      for (const k in t) {
        if (typeof t[k] === 'number') this.palCur[k] = f[k] + (t[k] - f[k]) * a;
        else { const c = new THREE.Color('#' + f[k]).lerp(new THREE.Color('#' + t[k]), a); this.palCur[k] = c.getHexString(); }
      }
      this.applyPal();
    }
  }
  applyPal() {
    const c = this.palCur;
    for (const k of ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi']) this.pal[k].value.set('#' + c[k]);
    this.sun.color.set('#' + c.sun); this.sun.intensity = c.sunI;
    this.hemi.color.set('#' + c.hemiSky); this.hemi.groundColor.set('#' + c.hemiGround); this.hemi.intensity = c.hemiI;
  }
  makeInk() {
    const camera = this.camera, scene = this.scene;
    const u = { hull: uniform(tuning.hull), width: uniform(tuning.lineWidth), boil: uniform(tuning.boil), fadeNear: uniform(30), fadeFar: uniform(90),
      grain: uniform(tuning.grain), near: uniform(camera.near), far: uniform(camera.far), ink: uniform(new THREE.Color(INK)), wipe: uniform(0), inkOn: uniform(1) };
    this.u = u;
    const scenePass = toonOutlinePass(scene, camera, color(INK), u.hull, float(1));
    scenePass.setMRT(mrt({ output, normal: normalView }));
    const colorTex = scenePass.getTextureNode('output'), normalTex = scenePass.getTextureNode('normal'), depthTex = scenePass.getTextureNode('depth');
    const post = new THREE.PostProcessing(this.renderer);
    post.outputNode = Fn(() => {
      const cell = floor(uv().mul(vec2(40, 23)));
      const wob = hash(floor(time.mul(8)).add(cell.x).add(cell.y.mul(17))).sub(0.5).mul(u.boil);
      const px = u.width.add(wob).div(screenSize);
      const viewZ = (o) => perspectiveDepthToViewZ(depthTex.sample(uv().add(o)).r, u.near, u.far);
      const n = (o) => normalTex.sample(uv().add(o)).xyz;
      const dx = vec2(px.x, 0), dy = vec2(0, px.y);
      const z0 = viewZ(vec2(0, 0)).abs();
      const dz = max(abs(viewZ(dx).sub(viewZ(dx.negate()))), abs(viewZ(dy).sub(viewZ(dy.negate())))).div(z0.max(0.5));
      const dn = max(length(n(dx).sub(n(dx.negate()))), length(n(dy).sub(n(dy.negate()))));
      const e = max(smoothstep(0.05, 0.12, dz), smoothstep(0.7, 1.1, dn)).mul(oneMinus(smoothstep(u.fadeNear, u.fadeFar, z0))).mul(u.inkOn);
      let c = mix(colorTex.rgb, u.ink, e);
      const p = floor(uv().mul(screenSize));
      const g = hash(p.x.add(p.y.mul(1571))).sub(0.5).mul(u.grain);
      c = c.add(g).mul(oneMinus(length(uv().sub(0.5)).mul(0.62).pow(2.2)));
      // ink-blot wipe
      const bc = floor(uv().mul(vec2(28, 16)));
      const nv = hash(bc.x.add(bc.y.mul(131))).mul(0.45).add(length(uv().sub(0.5)).mul(0.9).oneMinus().mul(0.55));
      const w = step(nv, u.wipe.mul(1.05));
      c = mix(c, u.ink, w);
      return vec4(c, 1);
    })();
    this.post = post;
  }
  syncInk() { if (!this.u) return; this.u.hull.value = tuning.hull; this.u.width.value = tuning.lineWidth; this.u.boil.value = tuning.boil; this.u.grain.value = tuning.grain; this.u.far.value = this.camera.far; this.u.near.value = this.camera.near; }
  update(dt) {
    this.updatePal(dt);
    for (const c of this.clouds) { c.rotation.y += 0; c.position.x += c.userData.sp * 20 * dt; if (c.position.x > 260) c.position.x = -260; }
  }
  render() {
    if (!this.enabled) return;
    try { this.post.render(); this.frames++; } catch (e) { this.lastError = String(e && e.message || e); this.frames++; }
  }
}
