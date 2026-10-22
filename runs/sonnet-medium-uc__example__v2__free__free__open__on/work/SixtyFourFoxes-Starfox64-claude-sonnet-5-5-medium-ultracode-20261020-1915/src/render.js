// WebGPU renderer, cel-shading materials, outlines, particle sprites and post-processing.
import * as THREE from 'three/webgpu';
import { pass, positionLocal, normalLocal, positionWorld, mix, smoothstep, float, vec3, color as tslColor, uniform, time, sin, cos, fract, floor, mul } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { settings } from './settings.js';

export { THREE };
export const R = { renderer: null, scene: null, camera: null, post: null, toon: null, sunLight: null, usePost: false };

export async function initRenderer(canvas) {
  if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: false });
  await renderer.init();
  if (!renderer.backend || !renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend could not be initialised.');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 1800);
  // 4-band toon ramp
  const d = new Uint8Array([40, 40, 40, 255, 120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  R.toon = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); R.toon.minFilter = R.toon.magFilter = THREE.NearestFilter; R.toon.needsUpdate = true;
  setupLights();
  if (!location.search.includes('nopost')) setupPost();
  addEventListener('resize', onResize);
  return R;
}
function onResize() {
  R.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.renderer.setSize(innerWidth, innerHeight, false);
  R.camera.aspect = innerWidth / innerHeight; R.camera.updateProjectionMatrix();
}
function setupLights() {
  const sc = R.scene;
  R.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a3a52, 1.3); sc.add(R.hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 260;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  sc.add(sun); sc.add(sun.target); R.sunLight = sun;
}
function setupPost() {
  try {
    const post = new THREE.PostProcessing(R.renderer);
    const scenePass = pass(R.scene, R.camera);
    const sceneColor = scenePass.getTextureNode('output');
    const b = bloom(sceneColor, 0.45, 0.5, 0.82);
    post.outputNode = sceneColor.add(b);
    R.post = post; R.usePost = true; R.bloomNode = b;
  } catch (e) { console.warn('Post-processing disabled:', e); R.usePost = false; }
}
export async function renderFrame() {
  if (R.usePost && R.post) {
    try { R.post.render(); return; } catch (e) { console.warn('post failed', e); R.usePost = false; }
  }
  R.renderer.render(R.scene, R.camera);
}

// ---- materials ----
const matCache = new Map();
export function toon(col, opts = {}) {
  const key = col + '|' + (opts.emissive || 0) + '|' + (opts.vc ? 1 : 0) + '|' + (opts.flat ? 1 : 0) + '|' + (opts.side || 0) + '|' + (opts.opacity ?? 1);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color: col, gradientMap: R.toon, vertexColors: !!opts.vc });
  if (opts.emissive) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  if (opts.opacity != null && opts.opacity < 1) { m.transparent = true; m.opacity = opts.opacity; }
  if (opts.side) m.side = opts.side;
  if (!opts.unique) matCache.set(key, m);
  return m;
}
export function glowMat(col, opacity = 1) {
  const m = new THREE.MeshBasicNodeMaterial({ color: col, transparent: opacity < 1, opacity });
  return m;
}
const outlineMats = new Map();
export function outlineMat(th = 0.05, col = 0x120a1c) {
  const k = th + '|' + col;
  if (outlineMats.has(k)) return outlineMats.get(k);
  const m = new THREE.MeshBasicNodeMaterial({ color: col, side: THREE.BackSide });
  m.positionNode = positionLocal.add(normalLocal.mul(th));
  m.fog = false;
  outlineMats.set(k, m); return m;
}
// Adds an inverted-hull ink outline as a child of the mesh.
export function addOutline(mesh, th = 0.05) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat(th));
  o.userData.isOutline = true; o.castShadow = false; o.receiveShadow = false;
  mesh.add(o); return o;
}
// Build a toon mesh (with optional outline) in one call.
export function mk(geo, col, o = {}) {
  if (o.flat) { geo = geo.index ? geo.toNonIndexed() : geo.clone(); geo.computeVertexNormals(); }
  const m = new THREE.Mesh(geo, o.mat || toon(col, o));
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  if (o.outline !== 0) addOutline(m, o.outline ?? 0.045);
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) typeof o.scale === 'number' ? m.scale.setScalar(o.scale) : m.scale.set(...o.scale);
  return m;
}

// ---- sprite textures + particles ----
function canvasTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const TEX = {};
export function makeTextures() {
  TEX.glow = canvasTex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  TEX.smoke = canvasTex((g, s) => { g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(s / 2 + (Math.random() - 0.5) * s * 0.3, s / 2 + (Math.random() - 0.5) * s * 0.3, s * (0.18 + Math.random() * 0.14), 0, 7); g.fill(); } });
  TEX.star = canvasTex((g, s) => { g.translate(s / 2, s / 2); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.12 : s * 0.46; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  TEX.ring = canvasTex((g, s) => { g.strokeStyle = '#fff'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s / 2, s / 2, s * 0.4, 0, 7); g.stroke(); });
}
class Particles {
  constructor(scene, n = 700) {
    this.list = []; this.free = [];
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteNodeMaterial({ map: TEX.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      mat.fog = false;
      const s = new THREE.Sprite(mat); s.visible = false; s.frustumCulled = false; scene.add(s);
      this.free.push({ s, mat, life: 0, max: 1, vel: new THREE.Vector3(), size0: 1, size1: 0, c0: new THREE.Color(), c1: new THREE.Color(), drag: 0, grav: 0, rot: 0, spin: 0, op: 1, active: false });
    }
  }
  emit(o) {
    const p = this.free.pop(); if (!p) return;
    p.active = true; p.life = p.max = o.life ?? 0.6;
    p.s.position.copy(o.pos); p.vel.copy(o.vel || { x: 0, y: 0, z: 0 });
    p.size0 = o.size ?? 1; p.size1 = o.size1 ?? 0; p.drag = o.drag ?? 0; p.grav = o.grav ?? 0; p.spin = o.spin ?? 0; p.op = o.opacity ?? 1;
    p.c0.set(o.color ?? 0xffffff); p.c1.set(o.color1 ?? o.color ?? 0xffffff);
    p.mat.map = TEX[o.tex || 'glow']; p.mat.blending = o.normal ? THREE.NormalBlending : THREE.AdditiveBlending;
    p.mat.needsUpdate = true;
    p.mat.rotation = Math.random() * 6;
    p.s.visible = true; this.list.push(p);
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; p.active = false; this.list.splice(i, 1); this.free.push(p); continue; }
      const u = 1 - p.life / p.max;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.vel.y -= p.grav * dt;
      p.s.position.addScaledVector(p.vel, dt);
      const sz = p.size0 + (p.size1 - p.size0) * u; p.s.scale.set(sz, sz, sz);
      p.mat.color.copy(p.c0).lerp(p.c1, u); p.mat.opacity = p.op * (1 - u * u);
      p.mat.rotation += p.spin * dt;
    }
  }
  clear() { for (const p of this.list) { p.s.visible = false; this.free.push(p); } this.list.length = 0; }
}
export function makeParticles() { R.particles = new Particles(R.scene); return R.particles; }

// Gradient sky dome (no fog)
export function makeSky(top, mid, bottom) {
  const geo = new THREE.SphereGeometry(1500, 24, 16);
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  m.fog = false;
  const uTop = uniform(new THREE.Color(top)), uMid = uniform(new THREE.Color(mid)), uBot = uniform(new THREE.Color(bottom));
  const h = positionLocal.y.div(1500);
  const up = smoothstep(float(0.0), float(0.55), h);
  const dn = smoothstep(float(0.0), float(-0.35), h);
  m.colorNode = mix(mix(uMid, uTop, up), uBot, dn);
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = -10;
  mesh.userData.uniforms = { uTop, uMid, uBot };
  return mesh;
}

// Test/debug hook: render to an offscreen target and read pixels back (works where canvas presentation is unavailable).
export async function captureToImage() {
  const w = innerWidth, h = innerHeight;
  const rt = new THREE.RenderTarget(w, h, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
  const r = R.renderer;
  r.setRenderTarget(rt); r.render(R.scene, R.camera); r.setRenderTarget(null);
  const buf = await r.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const lin = (v) => v; // target stores sRGB-encoded bytes already when colorSpace is sRGB
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (y * w + x) * 4, di = (y * w + x) * 4;
    im.data[di] = lin(buf[si]); im.data[di + 1] = lin(buf[si + 1]); im.data[di + 2] = lin(buf[si + 2]); im.data[di + 3] = 255;
  }
  g.putImageData(im, 0, 0); rt.dispose();
  let img = document.getElementById('__snap');
  if (!img) { img = document.createElement('img'); img.id = '__snap'; img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none'; document.body.appendChild(img); }
  img.src = c.toDataURL('image/png'); await img.decode();
  return true;
}
