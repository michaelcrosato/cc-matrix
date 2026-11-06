import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";
const TITLE = "Raiders of the Golden Goose";
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const testMode = new URLSearchParams(location.search).get("test") === "1";
const DEFAULT_TUNING = Object.freeze({
  moveSpeed: 6.3,
  jumpPower: 8,
  whipReach: 3.7,
  enemyAggression: 1,
  trapTempo: 1,
  boulderSpeed: 6.8,
  damageScale: 1,
});
const tuning = { ...DEFAULT_TUNING };
const settings = {
  master: 0.7,
  music: 0.1,
  sfx: 0.8,
  glyphs: "PlayStation",
  zoom: 1,
  shake: 0.65,
  assist: true,
};
const safeStore = {
  get(key) {
    try {
      return localStorage.getItem("goldengoose:" + key);
    } catch {
      return null;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem("goldengoose:" + key, val);
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem("goldengoose:" + key);
    } catch {}
  },
};
if (!AIHub.active) {
  try {
    Object.assign(settings, JSON.parse(safeStore.get("settings") || "{}"));
  } catch {}
}
let scene,
  camera,
  renderer,
  physics,
  groundMat,
  actors,
  worldObjects,
  playerId = 0;
let actorsRoot,
  decorRoot,
  effectRoot,
  ambientTime = 0,
  renderTime = 0,
  shakeTime = 0;
let shadowLight,
  worldReady = false;
const cameraTarget = new THREE.Vector3(0, 0, -10);
const cameraPosition = new THREE.Vector3();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const materials = {};
// RGBA is used because WebGPU texture formats have no RGB8 equivalent.
const celTexture = new THREE.DataTexture(
  new Uint8Array([80, 80, 80, 255, 174, 174, 174, 255, 255, 255, 255, 255]),
  3,
  1,
  THREE.RGBAFormat,
);
celTexture.needsUpdate = true;
celTexture.minFilter = THREE.NearestFilter;
celTexture.magFilter = THREE.NearestFilter;
function toon(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials[key])
    materials[key] = new THREE.MeshToonMaterial({ color, gradientMap: celTexture, ...options });
  return materials[key];
}
const inkMat = new THREE.MeshBasicMaterial({ color: 0x122526, side: THREE.BackSide });
const lineMat = new THREE.LineBasicMaterial({ color: 0x1d3231, transparent: true, opacity: 0.5 });
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  rock: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 7),
  leaf: new THREE.SphereGeometry(1, 6, 3),
  torus: new THREE.TorusGeometry(1, 0.13, 6, 20),
};
function mesh(g, m, parent, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, outline = false) {
  const obj = new THREE.Mesh(g, m);
  obj.position.set(x, y, z);
  obj.scale.set(sx, sy, sz);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  if (outline) {
    const ink = new THREE.Mesh(g, inkMat);
    ink.scale.setScalar(1.055);
    ink.castShadow = false;
    obj.add(ink);
  }
  return obj;
}
function box(parent, m, x, y, z, w, h, d, outline = false) {
  return mesh(geo.box, m, parent, x, y, z, w, h, d, outline);
}
const staticGroups = new Map();
const edgePositions = [];
const tempObj = new THREE.Object3D();
function stamp(g, m, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, edges = false) {
  const key = g.uuid + "/" + m.uuid;
  let batch = staticGroups.get(key);
  if (!batch) {
    batch = { g, m, matrices: [] };
    staticGroups.set(key, batch);
  }
  tempObj.position.set(x, y, z);
  tempObj.rotation.set(rx, ry, rz);
  tempObj.scale.set(sx, sy, sz);
  tempObj.updateMatrix();
  batch.matrices.push(tempObj.matrix.clone());
  if (edges) {
    const e = new THREE.EdgesGeometry(g, 30);
    const a = e.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(tempObj.matrix);
      edgePositions.push(v.x, v.y, v.z);
    }
    e.dispose();
  }
}
function finishStatic() {
  for (const b of staticGroups.values()) {
    const im = new THREE.InstancedMesh(b.g, b.m, b.matrices.length);
    b.matrices.forEach((mt, i) => im.setMatrixAt(i, mt));
    im.castShadow = true;
    im.receiveShadow = true;
    decorRoot.add(im);
  }
  staticGroups.clear();
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  decorRoot.add(new THREE.LineSegments(eg, lineMat));
  edgePositions.length = 0;
}
function solid(x, y, z, w, h, d, options = {}) {
  const body = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  const co = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(0.85);
  if (options.sensor) co.setSensor(true);
  const collider = physics.createCollider(co, body);
  return { body, collider };
}
function rngFactory(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
const artRand = rngFactory(19821105);
function makeLabel(text, w = 5, color = "#f1d99f", size = 52) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "bold " + size + "px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64, 490);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), m);
  return plane;
}
function burst(x, y, z, color = 0xf5c666, n = 12, force = 4) {
  if (!worldObjects) return;
  for (let i = 0; i < n; i++) {
    const part = mesh(geo.rock, toon(color), effectRoot, x, y, z, 0.045 + artRand() * 0.09);
    worldObjects.particles.push({
      mesh: part,
      v: new THREE.Vector3((artRand() - 0.5) * force, artRand() * force + 1, (artRand() - 0.5) * force),
      life: 0.5 + artRand() * 0.6,
      max: 1,
    });
  }
}
function lineBetween(a, b, color = 0xf8cb75, width = 1) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: width }));
}
function clearEffects() {
  if (!worldObjects) return;
  for (const p of worldObjects.particles) {
    effectRoot.remove(p.mesh);
  }
  worldObjects.particles = [];
  for (const p of worldObjects.projectiles) {
    effectRoot.remove(p.mesh);
  }
  worldObjects.projectiles = [];
}
function resize() {
  if (!renderer) return;
  const w = innerWidth,
    h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(w, h, false);
  const span = (h > w ? 30 : 24) * settings.zoom;
  camera.left = (-span * w) / h / 2;
  camera.right = (span * w) / h / 2;
  camera.top = span / 2;
  camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
}
function screenToWorld(cx, cy) {
  raycaster.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, (-cy / innerHeight) * 2 + 1), camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(aimPlane, p);
}
async function initEngine() {
  await RAPIER.init();
  physics = new RAPIER.World({ x: 0, y: -22, z: 0 });
  physics.timestep = 1 / 60;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x426b68);
  scene.fog = new THREE.FogExp2(0x426b68, 0.009);
  camera = new THREE.OrthographicCamera(-20, 20, 12, -12, 0.1, 240);
  if (!AIHub.active || !AIHub.server) {
    renderer = new THREE.WebGPURenderer({
      canvas: $("scene"),
      antialias: true,
      powerPreference: "high-performance",
      forceWebGL: new URLSearchParams(location.search).has("webgl"),
    });
    renderer.setClearColor(0x426b68);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    await renderer.init();
    renderer.onDeviceLost = (info) => {
      window.__deviceLoss = info;
      console.error("GPU device lost: " + JSON.stringify(info));
      if (AIHub.active) AIHub.fail("The graphics device was lost.");
      $("loadtext").textContent = "The graphics device was lost. Reload to resume your checkpoint.";
      $("loading").hidden = false;
    };
  }
  scene.add(new THREE.HemisphereLight(0xfff0ce, 0x2b6566, 2.3));
  shadowLight = new THREE.DirectionalLight(0xffdc95, 3.1);
  shadowLight.position.set(-17, 30, 8);
  shadowLight.castShadow = true;
  shadowLight.shadow.mapSize.set(2048, 2048);
  shadowLight.shadow.camera.left = -24;
  shadowLight.shadow.camera.right = 24;
  shadowLight.shadow.camera.top = 28;
  shadowLight.shadow.camera.bottom = -28;
  shadowLight.shadow.camera.far = 90;
  shadowLight.shadow.bias = -0.0006;
  shadowLight.shadow.normalBias = 0.04;
  scene.add(shadowLight);
  scene.add(shadowLight.target);
  const rim = new THREE.DirectionalLight(0x8bdbd1, 1.1);
  rim.position.set(15, 12, -30);
  scene.add(rim);
  decorRoot = new THREE.Group();
  actorsRoot = new THREE.Group();
  effectRoot = new THREE.Group();
  scene.add(decorRoot, actorsRoot, effectRoot);
  resize();
  addEventListener("resize", resize);
  worldReady = true;
}
