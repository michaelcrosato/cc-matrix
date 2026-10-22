// ===== 03_render.js — WebGPU renderer, cel-shading materials, outlines, post =====
const R = {
  renderer: null, scene: null, camera: null, post: null, sun: null, hemi: null,
  bloomNode: null, flashU: null, vignetteU: null, hitU: null, time: 0,
};

// 4-band toon ramp (hard steps = cel look)
const TOON_RAMP = (() => {
  const steps = [70, 140, 210, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((s, i) => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = s; data[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const _matCache = new Map();
/**
 * Cel-shaded material. opts: { emissive, emissiveIntensity, transparent, opacity, rim (0..1), side, flat }
 */
function toon(color, opts = {}) {
  const key = 't' + color + JSON.stringify(opts);
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshToonNodeMaterial({ color, gradientMap: TOON_RAMP });
  if (opts.emissive !== undefined) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity ?? 1; }
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.6; m.depthWrite = false; }
  if (opts.side) m.side = opts.side;
  if (opts.flat) m.flatShading = true;
  // stepped rim light for an anime-style edge highlight
  const rimAmt = opts.rim ?? 0.35;
  if (rimAmt > 0) {
    const { float, dot, normalView, positionViewDirection, step, vec3, color: tslColor } = TSL;
    const fres = float(1).sub(dot(normalView, positionViewDirection).max(0));
    const rim = step(0.62, fres).mul(rimAmt);
    const base = opts.emissive !== undefined ? tslColor(new THREE.Color(opts.emissive)).mul(opts.emissiveIntensity ?? 1) : vec3(0);
    m.emissiveNode = base.add(tslColor(new THREE.Color(color)).mul(rim));
  }
  _matCache.set(key, m);
  return m;
}

/** Unlit, HDR-bright material for glows (engines, lasers, lights). intensity>1 drives bloom. */
function glow(color, intensity = 2, opts = {}) {
  const key = 'g' + color + '_' + intensity + JSON.stringify(opts);
  if (_matCache.has(key)) return _matCache.get(key);
  const c = new THREE.Color(color).multiplyScalar(intensity);
  const m = new THREE.MeshBasicNodeMaterial({ color: c });
  if (opts.transparent) { m.transparent = true; m.opacity = opts.opacity ?? 0.7; m.depthWrite = false; }
  if (opts.additive) { m.blending = THREE.AdditiveBlending; m.transparent = true; m.depthWrite = false; }
  if (opts.side) m.side = opts.side;
  m.toneMapped = false;
  _matCache.set(key, m);
  return m;
}

const _outlineGeoCache = new WeakMap();
const _outlineMatCache = new Map();
function outlineMaterial(thickness, color = 0x0d0f1a) {
  const key = thickness + '_' + color;
  if (_outlineMatCache.has(key)) return _outlineMatCache.get(key);
  const m = new THREE.MeshBasicNodeMaterial({ color, side: THREE.BackSide });
  m.positionNode = TSL.positionLocal.add(TSL.normalLocal.mul(thickness));
  _outlineMatCache.set(key, m);
  return m;
}
function outlineGeometry(geo) {
  let g = _outlineGeoCache.get(geo);
  if (g) return g;
  g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  if (geo.index) g.setIndex(geo.index.clone());
  g = BufferGeometryUtils.mergeVertices(g, 1e-3);
  g.computeVertexNormals();
  _outlineGeoCache.set(geo, g);
  return g;
}
/** Adds an inverted-hull ink outline as a child of mesh. Returns mesh. */
function outlined(mesh, thickness = 0.05, color = 0x0d0f1a) {
  const hull = new THREE.Mesh(outlineGeometry(mesh.geometry), outlineMaterial(thickness, color));
  hull.name = 'outline';
  hull.castShadow = false; hull.receiveShadow = false;
  hull.raycast = () => {};
  mesh.add(hull);
  return mesh;
}
/** Convenience mesh builder: shadows + outline. */
function mkMesh(geometry, material, o = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.outline ?? true) outlined(m, o.thickness ?? 0.05, o.outlineColor ?? 0x0d0f1a);
  return m;
}

async function initRenderer(canvasHost) {
  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false, forceWebGL: false });
  await renderer.init();
  if (!renderer.backend || !renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend unavailable');
  const LOW = /[?&]lowgfx/.test(location.search); // test-only switch for software adapters
  renderer.setPixelRatio(LOW ? 0.35 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x5a4a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -140; sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140; sun.shadow.camera.bottom = -140;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  // post: scene pass -> bloom -> screen flash / damage vignette
  const post = new THREE.PostProcessing(renderer);
  const { pass, uniform, uv, vec3, vec4, float, mix, length, smoothstep } = TSL;
  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');
  const bloomNode = bloom(sceneColor, 0.75, 0.45, 0.82);
  const flashU = uniform(0);       // white flash (bombs, explosions)
  const hitU = uniform(0);         // red damage vignette
  const vignetteU = uniform(0.35); // constant cinematic vignette
  const fadeU = uniform(0);        // fade to black for transitions
  const d = length(uv().sub(0.5)).mul(1.414);
  const vig = smoothstep(0.55, 1.15, d);
  let col = sceneColor.add(bloomNode).rgb;
  col = col.mul(float(1).sub(vig.mul(vignetteU)));
  col = mix(col, vec3(1.0, 0.08, 0.05), vig.mul(hitU).clamp(0, 1));
  col = mix(col, vec3(1, 1, 1), flashU);
  col = mix(col, vec3(0, 0, 0), fadeU);
  post.outputNode = vec4(col, 1);

  Object.assign(R, { renderer, scene, camera, post, sun, hemi, bloomNode, flashU, hitU, vignetteU, fadeU });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return R;
}

/** Keep the sun's shadow frustum centred on the action. */
function followSun(target, dir = R.sunDir || V3(0.45, 0.8, 0.3)) {
  R.sun.target.position.copy(target);
  R.sun.position.copy(target).addScaledVector(_v4.copy(dir).normalize(), 400);
}

function clearScene() {
  const keep = new Set([R.camera, R.sun, R.sun.target, R.hemi]);
  for (const c of [...R.scene.children]) if (!keep.has(c)) R.scene.remove(c);
  R.scene.fog = null;
  R.scene.background = null;
}
