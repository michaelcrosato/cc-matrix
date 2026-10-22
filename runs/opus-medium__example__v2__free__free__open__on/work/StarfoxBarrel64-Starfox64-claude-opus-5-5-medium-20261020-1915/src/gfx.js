// Renderer, cel-shading materials, outline + bloom post chain, sky.
import * as THREE from 'three/webgpu';
import { toonOutlinePass, uniform, vec3, vec4, float, mix, smoothstep, positionLocal, normalize, pow, max, dot, step, time, sin, uv, color } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };

export const DBG = new URLSearchParams(__DEV__ ? location.search : '');
export const gfx = {
  renderer: null, scene: null, camera: null, post: null, sun: null, hemi: null, sky: null,
  skyUniforms: null, outlineColor: null, bloomNode: null,
};

export async function initRenderer(canvasParent) {
  if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter found (GPU blocked or unsupported).');
  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !DBG.has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  await renderer.init();
  if (!renderer.backend || !renderer.backend.isWebGPUBackend) {
    throw new Error('WebGPU backend failed to initialise (no WebGL fallback by design).');
  }
  canvasParent.appendChild(renderer.domElement);
  gfx.renderer = renderer;

  const scene = new THREE.Scene();
  gfx.scene = scene;
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 9000);
  gfx.camera = camera;
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x5a4a6a, 1.4);
  scene.add(hemi); gfx.hemi = hemi;
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.6);
  sun.position.set(120, 260, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160; sc.near = 1; sc.far = 900;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target); gfx.sun = sun;

  buildSky();

  // post: toon outlines -> bloom
  const post = new THREE.PostProcessing(renderer);
  gfx.outlineColor = uniform(new THREE.Color(0x0b0b18));
  const scenePass = toonOutlinePass(scene, camera, new THREE.Color(0x0b0b18), 0.0034, 1);
  scenePass.colorNode = gfx.outlineColor;
  const sceneColor = scenePass.getTextureNode('output');
  const bl = bloom(sceneColor, 0.75, 0.35, 0.82);
  gfx.bloomNode = bl;
  gfx.flash = uniform(0); // full screen white flash
  gfx.flashColor = uniform(new THREE.Color(1, 1, 1));
  gfx.vignette = uniform(0.0); // damage red vignette
  const vUv = uv();
  const d = vUv.sub(0.5).length();
  const vig = smoothstep(0.35, 0.85, d).mul(gfx.vignette);
  let out = sceneColor.add(bl);
  out = mix(out, vec4(1.0, 0.1, 0.05, 1), vig);
  out = mix(out, vec4(gfx.flashColor, 1), gfx.flash);
  post.outputNode = out;
  gfx.post = post;

  addEventListener('resize', onResize);
  return gfx;
}

function onResize() {
  const { renderer, camera } = gfx;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function buildSky() {
  const U = {
    zenith: uniform(new THREE.Color(0x2a6fd6)),
    horizon: uniform(new THREE.Color(0xbfe6ff)),
    ground: uniform(new THREE.Color(0x6d8fb8)),
    sunDir: uniform(new THREE.Vector3(0.4, 0.6, 0.3).normalize()),
    sunColor: uniform(new THREE.Color(1.6, 1.4, 1.0)),
    stars: uniform(0),
    band: uniform(1), // cel banding amount
    nebula: uniform(0),
    nebA: uniform(new THREE.Color(0x7a2ab0)), nebB: uniform(new THREE.Color(0x2050c0)),
  };
  gfx.skyUniforms = U;
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
  const dir = normalize(positionLocal);
  const h = dir.y;
  // stepped (cel) gradient
  const t = smoothstep(-0.05, 0.55, h);
  const tb = mix(t, t.mul(4).floor().div(4), U.band.mul(0.6));
  let col = mix(U.horizon, U.zenith, tb);
  col = mix(col, U.ground, smoothstep(0.0, -0.25, h));
  const sd = max(dot(dir, U.sunDir), 0);
  const disc = step(0.9975, sd);
  const halo = smoothstep(0.96, 0.999, sd).mul(0.35);
  col = col.add(U.sunColor.mul(disc.add(halo)));
  // stars (hash based) for space
  const p = dir.mul(420).floor();
  const hsh = sin(dot(p, vec3(12.9898, 78.233, 37.719))).mul(43758.5453).fract();
  const tw = sin(time.mul(3).add(hsh.mul(40))).mul(0.5).add(0.5);
  const star = step(0.9975, hsh).mul(U.stars).mul(tw.mul(0.6).add(0.6));
  col = col.add(vec3(star, star, star.mul(1.1)));
  // soft banded nebula clouds (space)
  const nz = sin(dir.x.mul(3.1).add(dir.y.mul(1.7))).mul(sin(dir.y.mul(4.3).sub(dir.z.mul(2.2)))).mul(sin(dir.z.mul(2.7).add(dir.x.mul(3.9))));
  const nz2 = sin(dir.x.mul(7.3).sub(dir.z.mul(5.1))).mul(sin(dir.y.mul(6.1).add(dir.x.mul(2.3))));
  const neb = smoothstep(0.05, 0.45, nz.add(nz2.mul(0.25)));
  const nebBand = neb.mul(3).floor().div(3);
  col = col.add(mix(U.nebA, U.nebB, smoothstep(-0.3, 0.6, dir.y.add(nz2.mul(0.4)))).mul(nebBand).mul(U.nebula).mul(0.55));
  mat.colorNode = col;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  gfx.sky = sky;
  gfx.scene.add(sky);
}

export function setSky({ zenith, horizon, ground, sunDir, sunColor, stars = 0, band = 1, nebula = 0 }) {
  const U = gfx.skyUniforms;
  U.nebula.value = nebula;
  U.zenith.value.set(zenith); U.horizon.value.set(horizon); U.ground.value.set(ground);
  if (sunDir) U.sunDir.value.copy(sunDir).normalize();
  if (sunColor) U.sunColor.value.copy(sunColor);
  U.stars.value = stars; U.band.value = band;
}

// ---------- materials ----------
let gradientMap = null;
function getGradient() {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([80, 80, 80, 255, 165, 165, 165, 255, 255, 255, 255, 255]);
  gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradientMap.minFilter = THREE.NearestFilter; gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false; gradientMap.needsUpdate = true;
  return gradientMap;
}
const matCache = new Map();
export function toon(col, { flat = true, emissive = 0x000000, emissiveIntensity = 1, vertexColors = false, transparent = false, opacity = 1, side = THREE.FrontSide } = {}) {
  const key = `${col}|${flat}|${emissive}|${emissiveIntensity}|${vertexColors}|${transparent}|${opacity}|${side}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color: col, gradientMap: getGradient(), emissive, emissiveIntensity, vertexColors, transparent, opacity, side });
  m.flatShading = flat;
  matCache.set(key, m);
  return m;
}
// unlit glowing material (blooms when intensity > 1)
const glowCache = new Map();
export function glow(col, intensity = 3, { transparent = false, opacity = 1, additive = false, side = THREE.FrontSide } = {}) {
  const key = `${col}|${intensity}|${transparent}|${opacity}|${additive}|${side}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = new THREE.Color(col).multiplyScalar(intensity);
  const m = new THREE.MeshBasicMaterial({ color: c, transparent: transparent || additive, opacity, side, fog: false, depthWrite: !additive && !transparent });
  if (additive) m.blending = THREE.AdditiveBlending;
  glowCache.set(key, m);
  return m;
}

// Merge vertices so normals are averaged: outline hull is closed even on boxes,
// while material.flatShading keeps the faceted cel look.
const geoCache = new Map();
export function smooth(geo) {
  const g = geo.clone();
  g.deleteAttribute('normal');
  if (g.attributes.uv) g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  return m;
}
export function geo(kind, ...args) {
  const key = kind + ':' + args.join(',');
  if (geoCache.has(key)) return geoCache.get(key);
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
    cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
    sphere: (r, w = 10, hh = 8) => new THREE.SphereGeometry(r, w, hh),
    ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
    oct: (r) => new THREE.OctahedronGeometry(r, 0),
    torus: (r, t, rs = 8, ts = 24) => new THREE.TorusGeometry(r, t, rs, ts),
    dodeca: (r) => new THREE.DodecahedronGeometry(r, 0),
    tetra: (r) => new THREE.TetrahedronGeometry(r, 0),
  };
  let g = G[kind](...args.map(Number));
  if (kind !== 'torus') g = smooth(g);
  geoCache.set(key, g);
  return g;
}

export function mesh(g, m, { cast = true, receive = true } = {}) {
  const me = new THREE.Mesh(g, m);
  me.castShadow = cast; me.receiveShadow = receive;
  return me;
}

export function render() {
  if (DBG.has('nopost')) { gfx.renderer.render(gfx.scene, gfx.camera); return; }
  gfx.post.render();
}
