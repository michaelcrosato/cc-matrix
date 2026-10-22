// Renderer, camera rig, sky, lighting (shadowed sun + hemisphere), fog and bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const R = {
  renderer: null, scene: null, camera: null, composer: null,
  sun: null, hemi: null, sky: null, stars: null, bloom: null,
};

const cam = {
  pos: new THREE.Vector3(0, 8, 30),
  look: new THREE.Vector3(0, 0, -20),
  fov: 62,
};
const shakeVec = new THREE.Vector3();

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
uniform vec3 uSunDir; uniform vec3 uSunCol;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(uHorizon, uTop, smoothstep(0.0, 0.55, h))
                   : mix(uHorizon, uBottom, smoothstep(0.0, 0.25, -h));
  float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  c += uSunCol * (pow(s, 6.0) * 0.32 + pow(s, 90.0) * 1.4);
  gl_FragColor = vec4(c, 1.0);
}`;

export function initRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  R.renderer = renderer;

  const scene = new THREE.Scene();
  R.scene = scene;
  const camera = new THREE.PerspectiveCamera(cam.fov, innerWidth / innerHeight, 0.5, 4000);
  R.camera = camera;

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Vector3() },
      uHorizon: { value: new THREE.Vector3() },
      uBottom: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.5, -0.6) },
      uSunCol: { value: new THREE.Vector3(1, 0.9, 0.7) },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);
  R.sky = sky;

  const starPos = new Float32Array(2200 * 3);
  for (let i = 0; i < 2200; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    starPos[i * 3] = r * Math.cos(t) * 2800;
    starPos[i * 3 + 1] = Math.abs(u) * 2800;
    starPos[i * 3 + 2] = r * Math.sin(t) * 2800;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({
    color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  scene.add(stars);
  R.stars = stars;

  R.hemi = new THREE.HemisphereLight(0xcfd9ff, 0x6b5a3a, 0.9);
  scene.add(R.hemi);
  R.sun = new THREE.DirectionalLight(0xffffff, 2);
  R.sun.castShadow = true;
  R.sun.shadow.mapSize.set(2048, 2048);
  const sc = R.sun.shadow.camera;
  sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150; sc.near = 1; sc.far = 800;
  R.sun.shadow.bias = -0.0008;
  R.sun.shadow.normalBias = 0.5;
  scene.add(R.sun, R.sun.target);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  R.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.55, 0.88);
  composer.addPass(R.bloom);
  composer.addPass(new OutputPass());
  R.composer = composer;

  addEventListener('resize', resizeRender);
  resizeRender();
}

export function resizeRender() {
  const w = innerWidth;
  const h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.composer.setSize(w, h);
  R.camera.aspect = w / h;
  R.camera.updateProjectionMatrix();
}

// Applies a stage's look: fog, sky gradient, sun direction and color, starfield density.
export function setEnvironment(env) {
  R.scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far);
  R.renderer.setClearColor(env.fog.color);
  const u = R.sky.material.uniforms;
  const setC = (v, hex) => { const c = new THREE.Color(hex); v.set(c.r, c.g, c.b); };
  setC(u.uTop.value, env.sky.top);
  setC(u.uHorizon.value, env.sky.horizon);
  setC(u.uBottom.value, env.sky.bottom);
  u.uSunDir.value.set(...env.sun.dir).normalize();
  setC(u.uSunCol.value, env.sun.color);
  R.sun.color.set(env.sun.color);
  R.sun.intensity = env.sun.intensity;
  R.sun.position.copy(u.uSunDir.value).multiplyScalar(300);
  R.hemi.color.set(env.ambient.sky);
  R.hemi.groundColor.set(env.ambient.ground);
  R.hemi.intensity = env.ambient.intensity;
  R.stars.material.opacity = env.stars;
  R.bloom.strength = env.bloom ?? 0.35;
}

// Smoothly follows a focus point. `mode` picks the camera distance, `boost` widens FOV.
export function updateCamera(dt, focus, { mode = 'chase', boost = 0, roll = 0, shake = 0 } = {}) {
  const off = mode === 'close' ? { x: 0, y: 3.4, z: 13 } : mode === 'tank' ? { x: 0, y: 10, z: 30 } : { x: 0, y: 7.5, z: 24 };
  const k = 1 - Math.exp(-dt * 6);
  const desired = new THREE.Vector3(focus.x * 0.6 + off.x, focus.y + off.y, focus.z + off.z);
  cam.pos.lerp(desired, k);
  const look = new THREE.Vector3(focus.x * 0.3, focus.y + 1.2, focus.z - 36);
  cam.look.lerp(look, k);
  cam.fov += ((62 + boost * 12) - cam.fov) * (1 - Math.exp(-dt * 4));
  if (shake > 0) {
    shakeVec.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
  } else {
    shakeVec.set(0, 0, 0);
  }
  applyCamera(roll);
}

export function setCameraDirect(pos, look, fov = 60) {
  cam.pos.copy(pos);
  cam.look.copy(look);
  cam.fov = fov;
  shakeVec.set(0, 0, 0);
  applyCamera(0);
}

function applyCamera(roll) {
  const c = R.camera;
  c.fov = cam.fov;
  c.updateProjectionMatrix();
  c.position.copy(cam.pos).add(shakeVec);
  c.lookAt(cam.look);
  if (roll) c.rotateZ(roll);
}

// Keeps shadows covering the area around the focus point.
export function followShadows(focus) {
  const s = R.sun;
  const dir = s.position.clone().normalize();
  s.target.position.copy(focus);
  s.position.copy(focus).addScaledVector(dir, 300);
  s.target.updateMatrixWorld();
}

export function renderFrame() {
  R.composer.render();
}
