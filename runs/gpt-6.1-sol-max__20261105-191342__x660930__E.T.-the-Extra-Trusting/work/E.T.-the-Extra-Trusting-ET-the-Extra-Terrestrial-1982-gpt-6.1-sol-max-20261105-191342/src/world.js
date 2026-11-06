import * as T from 'three/webgpu';
import {
  color,
  normalWorld,
  vec3,
  positionWorld,
  mix,
  uniform,
} from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PARTS, FLOWERS, BRIDGE, TRANSMITTER, RINGS, SHIP } from './core.js';
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function rng(seed = 1982) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng();
const geo = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 12, 8),
  ico: new T.IcosahedronGeometry(1, 1),
  cyl: new T.CylinderGeometry(1, 1, 1, 9),
  cone: new T.ConeGeometry(1, 1, 8),
  disc: new T.CircleGeometry(1, 32),
};
const mats = new Map();
function mat(hex, emissive = 0) {
  const key = hex + ':' + emissive;
  if (mats.has(key)) return mats.get(key);
  const m = new T.MeshStandardNodeMaterial({
    color: hex,
    roughness: 1,
    metalness: 0,
    emissive: hex,
    emissiveIntensity: emissive,
  });
  const light = normalWorld
    .dot(vec3(-0.35, 0.8, 0.45))
    .max(0)
    .mul(3)
    .floor()
    .div(3)
    .mul(0.45)
    .add(0.55);
  m.colorNode = color(hex).mul(light);
  mats.set(key, m);
  return m;
}
const riderLocation = uniform(V(0, -1000, 0));
const canopyCut = positionWorld.xz
  .distance(riderLocation.xz)
  .smoothstep(4.2, 8.8);
const canopyInk = new T.MeshBasicNodeMaterial({
  color: '#081923',
  side: T.BackSide,
  alphaTest: 0.5,
});
canopyInk.opacityNode = canopyCut;
function foliage(hex) {
  const key = hex + ':foliage';
  if (mats.has(key)) return mats.get(key);
  const m = mat(hex).clone();
  m.alphaTest = 0.5;
  m.opacityNode = canopyCut;
  m.userData.canopy = true;
  mats.set(key, m);
  return m;
}
const ink = new T.MeshBasicNodeMaterial({ color: '#081923', side: T.BackSide });
const basic = (hex, opacity = 1) =>
  new T.MeshBasicNodeMaterial({
    color: hex,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });
const glowmat = basic('#c7ffdf');
function group(parent, name) {
  const g = new T.Group();
  if (name) g.name = name;
  parent.add(g);
  return g;
}
function mesh(
  parent,
  g,
  m,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  outline = false,
) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  o.castShadow = !m.transparent;
  o.receiveShadow = true;
  parent.add(o);
  if (outline) {
    const l = new T.Mesh(g, m.userData.canopy ? canopyInk : ink);
    l.position.copy(o.position);
    l.rotation.copy(o.rotation);
    l.scale.copy(o.scale).multiplyScalar(1.045);
    l.castShadow = false;
    l.userData.ink = true;
    parent.add(l);
    o.userData.outline = l;
  }
  return o;
}
const box = (p, x, y, z, w, h, d, c, ol = true) =>
  mesh(p, geo.box, typeof c === 'string' ? mat(c) : c, x, y, z, w, h, d, ol);
const orb = (p, x, y, z, sx, sy, sz, c, ol = false) =>
  mesh(
    p,
    geo.sphere,
    typeof c === 'string' ? mat(c) : c,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    ol,
  );
const cyl = (p, x, y, z, r, h, c, ol = false) =>
  mesh(p, geo.cyl, typeof c === 'string' ? mat(c) : c, x, y, z, r, h, r, ol);
function tube(p, a, b, r, c, ol = false) {
  const v = V(...b).sub(V(...a)),
    o = mesh(
      p,
      geo.cyl,
      typeof c === 'string' ? mat(c) : c,
      ...V(...a)
        .add(V(...b))
        .multiplyScalar(0.5)
        .toArray(),
      r,
      v.length(),
      r,
      ol,
    );
  o.quaternion.setFromUnitVectors(V(0, 1, 0), v.normalize());
  if (o.userData.outline) o.userData.outline.quaternion.copy(o.quaternion);
  return o;
}
function textSign(
  p,
  text,
  x,
  y,
  z,
  w = 3,
  fg = '#e8d5a7',
  bg = '#213b40',
  rot = 0,
) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px Georgia';
  const lines = text.split('\n');
  lines.forEach((l, i) =>
    ctx.fillText(l, 256, 96 + (i - (lines.length - 1) / 2) * 48, 465),
  );
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const m = new T.MeshBasicNodeMaterial({ map: tex });
  const o = mesh(p, new T.PlaneGeometry(w, w * 0.375), m, x, y, z);
  o.rotation.y = rot;
  return o;
}
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(226,255,216,.8)');
  g.addColorStop(0.14, 'rgba(193,255,216,.35)');
  g.addColorStop(0.45, 'rgba(151,240,201,.10)');
  g.addColorStop(1, 'rgba(151,240,201,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}
const glTex = glowTexture();
function halo(parent, x, y, z, size = 3, tint = '#bbffcd', opacity = 1) {
  const s = new T.Sprite(
    new T.SpriteNodeMaterial({
      map: glTex,
      color: tint,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  s.position.set(x, y, z);
  s.scale.setScalar(size);
  parent.add(s);
  return s;
}
export class NightWorld {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#122b3c');
    this.scene.fog = new T.FogExp2('#1c3e49', 0.009);
    this.camera = new T.PerspectiveCamera(
      43,
      innerWidth / innerHeight,
      0.1,
      650,
    );
    this.renderer = new T.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      forceWebGL: new URLSearchParams(location.search).has('visual'),
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.static = group(this.scene, 'The neighborhood');
    this.dynamic = group(this.scene, 'Small wonders');
    this.obstacles = [];
    this.riders = new Map();
    this.agents = [];
    this.parts = [];
    this.flowerViews = [];
    this.pulses = [];
    this.candyViews = [];
    this.target = V(-22, 1, 27);
    this.follow = V(-22, 1, 27);
    this.cameraYaw = 0.48;
    this.elevation = 0.86;
    this.zoom = 1;
    this.debug = null;
    this.elapsed = 0;
    this.buildSky();
    this.buildGround();
    this.buildNeighborhood();
    this.buildForest();
    this.buildWonders();
    this.buildFlight();
    this.bake();
    this.buildFireflies();
    this.resize = () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    };
    addEventListener('resize', this.resize);
  }
  async init() {
    await this.renderer.init();
    this.backend = this.renderer.backend.isWebGPUBackend
      ? 'WebGPU'
      : 'WebGL fallback';
  }
  obstacle(x, z, hx, hz, hy = 2, label = 'prop') {
    this.obstacles.push({ x, z, hx, hz, hy, label });
  }
  roundObstacle(x, z, r, hy = 3) {
    this.obstacles.push({ kind: 'round', x, z, r, hy, label: 'tree' });
  }
  buildSky() {
    const sky = new T.MeshBasicNodeMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
    });
    sky.colorNode = mix(
      color('#31565e'),
      color('#0b172a'),
      positionWorld.y.div(150).clamp(0, 1),
    );
    mesh(this.scene, new T.SphereGeometry(450, 24, 12), sky);
    this.scene.add(new T.HemisphereLight('#c4d5e6', '#294640', 2));
    const moonlight = new T.DirectionalLight('#b8d2e0', 2.3);
    moonlight.position.set(-30, 60, 24);
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(2048, 2048);
    moonlight.shadow.camera.left = -70;
    moonlight.shadow.camera.right = 70;
    moonlight.shadow.camera.top = 70;
    moonlight.shadow.camera.bottom = -70;
    moonlight.shadow.camera.far = 180;
    moonlight.shadow.bias = -0.0004;
    moonlight.shadow.normalBias = 0.05;
    moonlight.target.position.set(0, 0, -24);
    this.scene.add(moonlight, moonlight.target);
    const moon = group(this.scene);
    moon.position.set(-60, 36, -127);
    const moonMat = basic('#fff0bc');
    moonMat.fog = false;
    orb(moon, 0, 0, 0, 16, 16, 16, moonMat);
    const crater = basic('#d1c9a9', 0.2);
    crater.fog = false;
    for (let i = 0; i < 16; i++) {
      const x = (rand() - 0.5) * 19,
        y = (rand() - 0.5) * 19,
        r = 1 + rand() * 2.5;
      orb(
        moon,
        x,
        y,
        Math.sqrt(Math.max(1, 256 - x * x - y * y)) - 0.1,
        r,
        r,
        0.4,
        crater,
      );
    }
    const glow = halo(moon, 0, 0, 1, 85, '#fff2b3', 0.34);
    glow.material.fog = false;
    const pts = [];
    for (let i = 0; i < 700; i++) {
      const ang = rand() * Math.PI * 2,
        r = 180 + rand() * 100;
      pts.push(Math.sin(ang) * r, 40 + rand() * 160, Math.cos(ang) * r);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    const sm = new T.PointsNodeMaterial({
      color: '#f9eac8',
      size: 0.48,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      fog: false,
    });
    this.scene.add(new T.Points(g, sm));
    for (let i = 0; i < 16; i++) {
      const x = (i - 8) * 20,
        z = -135 - rand() * 35;
      mesh(
        this.static,
        geo.cone,
        mat('#18343e'),
        x,
        17,
        z,
        17 + rand() * 16,
        35 + rand() * 20,
        12,
      );
    }
  }
  buildGround() {
    box(this.static, 0, -0.52, 19.5, 102, 1, 57, '#284c46', false);
    box(this.static, 0, -0.52, -70, 102, 1, 106, '#274d48', false);
    box(this.static, 0, -1.4, -13, 102, 0.2, 8, mat('#397375', 0.15), false);
    // Two banks, with little ink strokes on the slow water.
    for (let i = 0; i < 110; i++) {
      const x = -50 + rand() * 100,
        z = -16 + rand() * 6;
      box(
        this.static,
        x,
        -1.18,
        z,
        0.25 + rand() * 1.6,
        0.018,
        0.035,
        '#91bdb0',
        false,
      );
    }
    box(this.static, 0, 0.012, 24.5, 101, 0.04, 11.5, '#263e49', false);
    box(this.static, 0, 0.05, 17.8, 101, 0.1, 1.5, '#68817d', false);
    box(this.static, 0, 0.05, 31.2, 101, 0.1, 1.5, '#6d8279', false);
    for (let x = -48; x < 49; x += 6) {
      box(this.static, x, 0.047, 24.5, 2.4, 0.024, 0.11, '#c9c498', false);
      box(this.static, x, 0.12, 17.1, 2.9, 0.06, 0.08, '#bbc4ab', false);
    }
    const path = new T.Shape();
    path.moveTo(-4, 18);
    path.bezierCurveTo(-1, 2, -22, -1, -21, -11);
    path.lineTo(-15, -11);
    path.bezierCurveTo(-15, -2, 5, 0, 4, 18);
    const pg = new T.ShapeGeometry(path, 20);
    const pa = pg.attributes.position;
    for (let i = 0; i < pa.count; i++)
      pa.setXYZ(i, pa.getX(i), 0.025, pa.getY(i));
    pg.computeVertexNormals();
    const pathmat = mat('#637065');
    pathmat.side = T.DoubleSide;
    mesh(this.static, pg, pathmat);
    const trail = new T.Shape();
    trail.moveTo(-22, -18);
    trail.bezierCurveTo(-23, -29, -1, -31, -3, -48);
    trail.lineTo(5, -48);
    trail.bezierCurveTo(6, -29, -14, -23, -14, -18);
    const tg = new T.ShapeGeometry(trail, 20); // shape coordinates are world z, rotate without mirroring.
    const arr = tg.attributes.position;
    for (let i = 0; i < arr.count; i++) {
      const z = arr.getY(i);
      arr.setXYZ(i, arr.getX(i), 0.027, z);
    }
    tg.computeVertexNormals();
    const trailmat = mat('#596f60');
    trailmat.side = T.DoubleSide;
    mesh(this.static, tg, trailmat);
    for (let i = 0; i < 1700; i++) {
      const x = -49 + rand() * 98,
        z = -118 + rand() * 162;
      if ((z > -17 && z < -9) || Math.abs(z - 24.5) < 7) continue;
      const c = ['#3d6551', '#426b58', '#1d4444', '#637c59'][
        Math.floor(rand() * 4)
      ];
      const o = mesh(
        this.static,
        geo.cone,
        mat(c),
        x,
        0.12,
        z,
        0.06 + rand() * 0.08,
        0.18 + rand() * 0.3,
        0.06,
      );
      o.rotation.z = (rand() - 0.5) * 0.7;
    }
    // Fern thickets: quiet, safe places between the roads and the creek.
    for (const area of [
      { x: -5, z: 0, w: 14, d: 12 },
      { x: 29, z: 12, w: 18, d: 8 },
    ])
      for (let i = 0; i < 60; i++) {
        const x = area.x + (rand() - 0.5) * area.w,
          z = area.z + (rand() - 0.5) * area.d;
        for (let k = 0; k < 3; k++) {
          const a = k * 2.1 + rand();
          const leaf = orb(
            this.static,
            x + Math.sin(a) * 0.3,
            0.35,
            z + Math.cos(a) * 0.3,
            0.12,
            0.55,
            0.1,
            ['#47745a', '#3d6e5c', '#668e62'][k],
          );
          leaf.rotation.z = Math.sin(a) * 0.6;
          leaf.rotation.x = Math.cos(a) * 0.6;
        }
      }
  }
  house(x, z, wall, roof, home = false) {
    const h = group(this.static);
    h.position.set(x, 0, z);
    box(h, 0, 3.4, 0, 13, 6.8, 9, wall);
    for (let y = 0.6; y < 6.5; y += 0.62)
      box(h, 0, y, 4.55, 13, 0.045, 0.05, '#19383d', false);
    const s = new T.Shape();
    s.moveTo(-7.3, 0);
    s.lineTo(0, 4.2);
    s.lineTo(7.3, 0);
    s.closePath();
    const r = new T.ExtrudeGeometry(s, { depth: 10.8, bevelEnabled: false });
    mesh(h, r, mat(roof), 0, 6.7, -5.4, 1, 1, 1, true);
    for (let i = 0; i < 7; i++)
      tube(
        h,
        [-7.3 + i, 6.72 + i * 0.575, 5.46],
        [0, 10.9, 5.46],
        0.025,
        '#091d2c',
      );
    box(h, 4.4, 9.3, -1, 1.3, 4, 1.3, '#414d50');
    for (const wx of [-4.2, 3.8]) {
      box(h, wx, 3.6, 4.62, 2.65, 2.3, 0.12, '#112933');
      box(
        h,
        wx,
        3.6,
        4.71,
        2.35,
        2,
        0.035,
        mat(home ? '#f3c071' : '#d4b976', 0.8),
        false,
      );
      box(h, wx, 3.6, 4.76, 0.08, 2, 0.04, '#4a625c', false);
      box(h, wx, 3.6, 4.76, 2.35, 0.08, 0.04, '#4a625c', false);
      box(h, wx, 4.85, 4.8, 2.9, 0.17, 0.35, '#a7b4a1');
      box(h, wx, 2.4, 4.8, 3, 0.22, 0.45, '#a7b4a1');
      const curtain = box(
        h,
        wx - 0.8,
        3.6,
        4.8,
        0.42,
        1.85,
        0.04,
        '#8d886c',
        false,
      );
      curtain.rotation.z = 0.1;
    }
    box(h, -0.2, 1.8, 4.7, 1.8, 3.6, 0.2, '#1f4147');
    orb(h, 0.4, 1.7, 4.87, 0.07, 0.07, 0.06, mat('#e7bd6a', 0.3));
    box(h, -0.2, 0.17, 6.3, 4.5, 0.34, 2.8, '#667b70');
    box(h, -0.2, 0.08, 8.2, 5, 0.16, 1, '#829181');
    for (const px of [-2.3, 1.9]) cyl(h, px, 2.2, 7.2, 0.09, 4, '#a7b6a3');
    box(h, -0.2, 4.3, 6.2, 5, 0.25, 3.5, roof);
    orb(h, 1.1, 3.15, 4.96, 0.18, 0.25, 0.16, mat('#ffd783', 2));
    halo(h, 1.1, 3.2, 5.1, 6, '#ffd38a', 0.5);
    if (home) {
      textSign(h, 'THE PORCH LIGHT\nSTAYS ON', -0.4, 1.1, 8.8, 2.4);
      const light = new T.PointLight('#ffc77a', 65, 18, 2);
      light.position.set(0, 3.1, 6);
      h.add(light);
    }
    this.obstacle(x, z, 6.6, 4.6, 3.4, 'house');
    for (let i = 0; i < 18; i++) {
      const px = x - 9 + (18 * i) / 17;
      if (Math.abs(px - (x - 0.2)) < 2.8) continue;
      box(this.static, px, 0.8, z + 10.5, 0.19, 1.6, 0.12, '#8b9d83', false);
      mesh(
        this.static,
        geo.cone,
        mat('#8b9d83'),
        px,
        1.68,
        z + 10.5,
        0.16,
        0.22,
        0.16,
      );
    }
    for (const y of [0.5, 1.1]) {
      box(this.static, x - 5.8, y, z + 10.5, 5.8, 0.11, 0.12, '#81947d', false);
      box(this.static, x + 5.3, y, z + 10.5, 6.8, 0.11, 0.12, '#81947d', false);
    }
  }
  streetlamp(x, z) {
    cyl(this.static, x, 4, z, 0.1, 8, '#152e36', true);
    tube(this.static, [x, 8, z], [x + 0.9, 8.5, z], 0.09, '#152e36');
    box(this.static, x + 1, 8.4, z, 0.85, 0.18, 0.65, '#10252e');
    orb(this.static, x + 1, 8.25, z, 0.3, 0.14, 0.22, mat('#f3d591', 2));
    halo(this.scene, x + 1, 8.1, z, 7, '#f7c87c', 0.4);
    const light = new T.PointLight('#efc281', 40, 19, 2);
    light.position.set(x + 1, 7.5, z);
    this.scene.add(light);
  }
  buildNeighborhood() {
    this.house(-30, 6, '#6f8e7d', '#2b4552', true);
    this.house(-6, 6, '#596e6e', '#3c4d5c');
    this.house(18, 7, '#7c8876', '#394d53');
    for (const x of [-42, -1, 39]) this.streetlamp(x, 17.5);
    // Mailbox, wheels, toys, and the detritus of a perfect childhood evening.
    cyl(this.static, -23, 1, 22, 0.09, 2, '#627a70');
    box(this.static, -23, 2, 22, 0.75, 0.65, 1.1, '#a76355');
    orb(this.static, -23, 2.3, 22, 0.39, 0.35, 0.56, '#a76355', true);
    textSign(this.static, '7', -23, 2.05, 22.57, 0.35);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7;
      const b = box(
        this.static,
        -16 + i * 0.5,
        0.055,
        28 + Math.sin(a) * 0.8,
        0.3,
        0.03,
        0.08,
        ['#c6a683', '#9ab7b5', '#c8c89e'][i % 3],
        false,
      );
      b.rotation.y = a;
    }
    // A backyard swing and a little red wagon.
    for (const x of [9, 19]) {
      tube(this.static, [x, 0, 41], [x, 5, 39], 0.12, '#334d4b', true);
      tube(this.static, [x, 5, 39], [x, 0, 37], 0.12, '#334d4b', true);
    }
    tube(this.static, [9, 5, 39], [19, 5, 39], 0.14, '#bd8665', true);
    for (const x of [12, 16]) {
      tube(this.static, [x - 0.6, 5, 39], [x - 0.6, 1.9, 39], 0.025, '#c5c4a1');
      tube(this.static, [x + 0.6, 5, 39], [x + 0.6, 1.9, 39], 0.025, '#c5c4a1');
      box(this.static, x, 1.8, 39, 1.5, 0.16, 0.6, '#b77c5c');
    }
    this.obstacle(9, 39, 0.25, 2.1, 2.5, 'swing');
    this.obstacle(19, 39, 0.25, 2.1, 2.5, 'swing');
    const wagon = group(this.static);
    wagon.position.set(17, 0.05, 34);
    box(wagon, 0, 0.65, 0, 2.2, 0.65, 1.3, '#b6604e');
    box(wagon, 0, 0.98, 0, 2.35, 0.12, 1.4, '#d38d65');
    for (const x of [-0.8, 0.8])
      for (const z of [-0.65, 0.65])
        orb(wagon, x, 0.3, z, 0.3, 0.3, 0.13, '#142d36');
    tube(wagon, [-1, 0.6, 0], [-2.2, 1.1, 0], 0.04, '#a9b4a1');
    this.car(34, -1, '#3d5659', true);
    this.car(-42, 27, '#a17a59');
    this.car(39, 26, '#8b9b8d');
    box(this.static, 29, 1.1, -5, 1.5, 2.2, 0.85, '#5f7771');
    textSign(
      this.static,
      'NO ENTRY',
      29,
      1.45,
      -4.55,
      1.25,
      '#ebcc86',
      '#344b4c',
    );
    this.obstacle(29, -5, 0.8, 0.5, 1.1, 'power box');
    for (const x of [21, 31, 41]) {
      box(this.static, x, 0.8, 1.8, 2, 0.25, 0.2, '#c0a26a');
      tube(this.static, [x - 0.7, 0, 2], [x - 0.7, 1.2, 2], 0.06, '#283d40');
      tube(this.static, [x + 0.7, 0, 2], [x + 0.7, 1.2, 2], 0.06, '#283d40');
    }
    // Familiar hand-painted trail markers.
    cyl(this.static, -15, 1.6, -6, 0.08, 3.2, '#8d7a58');
    textSign(
      this.static,
      'CREEK PATH →',
      -15,
      2.8,
      -5.95,
      3.1,
      '#cdd5af',
      '#314b43',
    );
    cyl(this.static, -6, 1.4, -39, 0.08, 2.8, '#807450');
    textSign(
      this.static,
      'KEEP LOOKING UP',
      -6,
      2.5,
      -38.9,
      3.5,
      '#d8d7ae',
      '#314b43',
    );
  }
  car(x, z, c, van = false) {
    const g = group(this.static);
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI / 2;
    box(g, 0, 1.1, 0, 2.8, 1.1, 5.7, c);
    box(g, 0, 2, van ? -0.5 : -0.1, 2.65, van ? 2.1 : 1.3, van ? 4.5 : 3.2, c);
    box(g, 0, 2.1, van ? 1.79 : 1.55, 2.35, 0.85, 0.04, '#1d3b47', false);
    box(g, 0, 2.1, van ? -2.79 : -1.75, 2.3, 0.8, 0.04, '#203e49', false);
    for (const xx of [-1.38, 1.38])
      for (const zz of [-1.8, 1.8]) {
        const wheel = cyl(g, xx, 0.6, zz, 0.6, 0.3, '#142b34', true);
        wheel.rotation.z = Math.PI / 2;
        if (wheel.userData.outline)
          wheel.userData.outline.rotation.copy(wheel.rotation);
        const hub = cyl(g, xx * 1.03, 0.6, zz, 0.25, 0.32, '#8da49b');
        hub.rotation.z = Math.PI / 2;
      }
    box(g, 0, 0.75, 2.9, 2.9, 0.23, 0.18, '#95a899');
    for (const xx of [-0.95, 0.95]) {
      box(g, xx, 1.2, 2.93, 0.55, 0.37, 0.06, mat('#e4c887', 0.5));
      box(g, xx, 1.2, -2.93, 0.35, 0.25, 0.06, mat('#b97662', 0.3));
    }
    if (van) {
      box(g, 0, 3.2, -0.2, 1.4, 0.12, 1.6, '#bbc7b1');
      cyl(g, 0, 3.8, -0.2, 0.04, 1.2, '#a3b4a2');
    }
    this.obstacle(x, z, van ? 3.1 : 3, 1.6, van ? 1.7 : 1.2, 'car');
  }
  tree(x, z, size = 1, pine = false) {
    const g = group(this.static);
    g.position.set(x, 0, z);
    const h = (pine ? 12 : 15) * size;
    const trunk = mesh(
      g,
      new T.CylinderGeometry(0.36, 0.65, h, 7),
      mat(pine ? '#34524e' : '#4c4f43'),
      0,
      h / 2,
      0,
      size,
      1,
      size,
      true,
    );
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      const root = orb(
        g,
        Math.sin(a) * 0.5 * size,
        0.3,
        Math.cos(a) * 0.5 * size,
        0.75 * size,
        0.35,
        0.25 * size,
        '#3d4c43',
      );
      root.rotation.y = a;
    }
    if (pine) {
      for (let i = 0; i < 4; i++)
        mesh(
          g,
          geo.cone,
          foliage(['#254b48', '#315950', '#396250', '#486d57'][i]),
          0,
          h * 0.5 + i * size * 2,
          0,
          (4.1 - i * 0.65) * size,
          7 * size,
          (4.1 - i * 0.65) * size,
          true,
        );
    } else {
      for (let i = 0; i < 6; i++) {
        const a = i * 2.4,
          y = h * 0.7 + rand() * h * 0.4;
        const x1 = Math.sin(a) * 2.4 * size,
          z1 = Math.cos(a) * 2.4 * size;
        tube(g, [0, y - 3 * size, 0], [x1, y, z1], 0.16 * size, '#444f43');
        orb(
          g,
          x1,
          y,
          z1,
          (3 + rand()) * size,
          2.1 * size,
          (3 + rand()) * size,
          foliage(['#254b49', '#31564d', '#3b6354'][i % 3]),
          true,
        );
      }
    }
    if (z > -115) this.roundObstacle(x, z, 0.6 * size, h / 2);
  }
  buildForest() {
    const clear = (x, z) => {
      if (z > -3 && z < 19 && x > -43 && x < 45) return true;
      if (z > 17 && x > -46 && x < 46) return true;
      if (z > -18 && z < -8) return true;
      if (Math.hypot(x + 18, z + 11) < 8) return true;
      if (Math.hypot(x + 30, z + 30) < 10) return true;
      if (Math.hypot(x - 1, z + 44) < 12) return true;
      if (z < -40 && x > -31 && x < 32) return true;
      if (Math.abs(x - (-18 + (z + 20) * -0.35)) < 6 && z < -18 && z > -39)
        return true;
      if (
        PARTS.some((p) => Math.hypot(x - p.x, z - p.z) < 7) ||
        FLOWERS.some((f) => Math.hypot(x - f.x, z - f.z) < 4)
      )
        return true;
      return false;
    };
    for (let i = 0; i < 180; i++) {
      const x = -50 + rand() * 100,
        z = -119 + rand() * 164;
      if (clear(x, z)) continue;
      this.tree(x, z, 0.65 + rand() * 0.6, rand() > 0.6);
    }
    for (let i = 0; i < 24; i++) {
      const x = i % 2 ? -58 : 58,
        z = -120 + i * 7;
      this.tree(x, z, 1.7, true);
    }
    for (let i = 0; i < 140; i++) {
      const x = -49 + rand() * 98,
        z = -115 + rand() * 154;
      if (z > -17 && z < -9) continue;
      if (
        PARTS.some((p) => Math.hypot(x - p.x, z - p.z) < 4) ||
        Math.hypot(x - 1, z + 44) < 7
      )
        continue;
      const s = 0.25 + rand() * 0.75;
      const rock = mesh(
        this.static,
        geo.ico,
        mat(['#476c62', '#516e62', '#667e68'][i % 3]),
        x,
        s * 0.4,
        z,
        s,
        s * 0.55,
        s * 0.7,
        true,
      );
      rock.rotation.set(rand() * 0.5, rand() * 6, rand() * 0.5);
      if (rock.userData.outline)
        rock.userData.outline.rotation.copy(rock.rotation);
    }
    for (let i = 0; i < 55; i++) {
      const x = -43 + rand() * 86,
        z = -90 + rand() * 100;
      if (z > -17 && z < -9) continue;
      for (let j = 0; j < 3; j++) {
        cyl(this.static, x + j * 0.13, 0.12, z, 0.035, 0.25, '#c7c5a5');
        orb(
          this.static,
          x + j * 0.13,
          0.27,
          z,
          0.16,
          0.08,
          0.16,
          mat('#e6b785', 0.1),
        );
      }
    }
    // Fallen logs, cut faces and forest detritus.
    for (const [x, z, r] of [
      [-37, -6, -0.4],
      [14, -29, 0.5],
      [-38, -48, 0.8],
      [38, -40, -0.4],
    ]) {
      const g = group(this.static);
      g.position.set(x, 0.55, z);
      g.rotation.y = r;
      tube(g, [-3, 0, 0], [3, 0, 0], 0.55, '#4e594b', true);
      const face = cyl(g, 3.02, 0, 0, 0.47, 0.04, '#ac9e73');
      face.rotation.z = Math.PI / 2;
      for (let k = 0; k < 3; k++) {
        const t = new T.Mesh(
          new T.TorusGeometry(0.13 + k * 0.1, 0.012, 4, 20),
          mat('#756b52'),
        );
        t.rotation.y = Math.PI / 2;
        t.position.set(3.05, 0, 0);
        g.add(t);
      }
    }
    // The far-bank garden's abandoned potting bench.
    box(this.static, -32, 1.1, -32, 4, 0.18, 1.6, '#8d8b62');
    for (const x of [-33.6, -30.4])
      for (const z of [-32.6, -31.4])
        cyl(this.static, x, 0.5, z, 0.08, 1, '#526750');
    this.obstacle(-32, -32, 2, 0.8, 0.6, 'bench');
  }
  buildWonders() {
    this.bridgeRoot = group(this.dynamic, 'Living bridge');
    this.bridgeRoot.position.set(BRIDGE.x, 0, BRIDGE.z);
    this.bridgeGrown = group(this.bridgeRoot);
    for (let i = 0; i < 5; i++) {
      const x = -2.4 + i * 1.2;
      const curve = new T.CatmullRomCurve3([
        V(x, -0.2, -4.6),
        V(x - 0.3, 0.4, -2),
        V(x + 0.1, 0.55, 0),
        V(x + 0.2, 0.35, 2),
        V(x, -0.1, 4.6),
      ]);
      mesh(
        this.bridgeGrown,
        new T.TubeGeometry(curve, 16, 0.23, 5, false),
        mat('#777c4f'),
        0,
        0,
        0,
        1,
        1,
        1,
        true,
      );
      for (let z = -4; z < 5; z += 1.3) {
        const o = orb(
          this.bridgeGrown,
          x + 0.4,
          0.55,
          z,
          0.5,
          0.12,
          0.25,
          '#91a866',
        );
        o.rotation.y = 0.5;
      }
    }
    this.bridgeGrown.visible = false;
    this.dormant = group(this.bridgeRoot);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const curve = new T.CatmullRomCurve3([
          V(-2 + i, 0, side * 4.8),
          V(-1 + i, 0.2, side * 3.7),
          V(-0.5 + i, 0.4, side * 3),
        ]);
        mesh(
          this.dormant,
          new T.TubeGeometry(curve, 10, 0.17, 5),
          mat('#647451'),
        );
      }
    halo(this.bridgeRoot, 0, 0.8, 3.4, 3, '#b4ffd2', 0.5);
    for (const p of PARTS) {
      const g = group(this.dynamic, 'part' + p.id);
      g.position.set(p.x, 1.05, p.z);
      const pivot = group(g, 'bob');
      if (p.id === 0) {
        box(pivot, 0, 0, 0, 1.45, 0.35, 0.9, '#be8966');
        for (let i = 0; i < 8; i++) {
          box(
            pivot,
            -0.6 + i * 0.17,
            0.21,
            0.1,
            0.13,
            0.05,
            0.58,
            '#f2dfb1',
            false,
          );
          if (i % 3 !== 0)
            box(
              pivot,
              -0.52 + i * 0.17,
              0.26,
              -0.1,
              0.07,
              0.08,
              0.3,
              '#293e43',
              false,
            );
        }
        box(pivot, 0, 0.23, -0.29, 1.25, 0.04, 0.12, '#d3a675', false);
      }
      if (p.id === 1) {
        const bowl = mesh(
          pivot,
          new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
          mat('#9ab2ab'),
          0,
          0.2,
          0,
          1.1,
          0.45,
          1.1,
          true,
        );
        bowl.rotation.x = Math.PI - 0.45;
        if (bowl.userData.outline)
          bowl.userData.outline.rotation.copy(bowl.rotation);
        tube(pivot, [0, 0.1, 0], [0, 0.9, 0.3], 0.035, '#dec68c');
        orb(pivot, 0, 0.9, 0.3, 0.12, 0.12, 0.12, '#debe72');
      }
      if (p.id === 2) {
        mesh(
          pivot,
          new T.TorusGeometry(0.55, 0.13, 7, 24),
          mat('#c99066'),
          0,
          0,
          0,
          1,
          1,
          1,
          true,
        );
        const tor = pivot.children.at(-2);
        tor.rotation.x = 0.4;
        if (tor.userData.outline)
          tor.userData.outline.rotation.copy(tor.rotation);
        tube(pivot, [0.4, 0, 0], [0.9, 0.3, 0.1], 0.04, '#c9a477');
      }
      const h = halo(g, 0, 0, 0, 4, '#ffdd92', 0.8);
      const clip = new T.AnimationClip('Waiting for a friend', 3, [
        new T.NumberKeyframeTrack('bob.position[y]', [0, 1.5, 3], [0, 0.24, 0]),
        new T.NumberKeyframeTrack('bob.rotation[y]', [0, 3], [0, Math.PI * 2]),
      ]);
      const mixer = new T.AnimationMixer(g);
      mixer.clipAction(clip).play();
      this.parts.push({ root: g, mixer, halo: h });
    }
    FLOWERS.forEach((f, i) => {
      const g = group(this.dynamic, 'flower' + i);
      g.position.set(f.x, 0, f.z);
      const stem = group(g, 'bloom');
      tube(stem, [0, 0, 0], [0.05, 1.1, 0], 0.045, '#71966b');
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        orb(
          stem,
          Math.sin(a) * 0.25,
          1.1 + Math.cos(a) * 0.25,
          0,
          0.19,
          0.24,
          0.08,
          '#d39e9d',
        );
      }
      orb(stem, 0, 1.1, 0.05, 0.16, 0.16, 0.08, mat('#e7c680', 0.4));
      orb(stem, -0.19, 0.5, 0, 0.25, 0.09, 0.1, '#6e9d74');
      orb(stem, 0.22, 0.6, 0, 0.25, 0.09, 0.1, '#6e9d74');
      stem.rotation.z = 0.65;
      stem.scale.setScalar(0.7);
      const light = halo(g, 0, 1, 0, 3, '#bbffda', 0.4);
      light.visible = false;
      const mixer = new T.AnimationMixer(g);
      const clip = new T.AnimationClip('Remember the sun', 1.5, [
        new T.NumberKeyframeTrack(
          'bloom.rotation[z]',
          [0, 0.9, 1.5],
          [0.65, -0.1, 0],
        ),
        new T.VectorKeyframeTrack(
          'bloom.scale',
          [0, 0.9, 1.5],
          [0.7, 0.7, 0.7, 1.25, 1.25, 1.25, 1.1, 1.1, 1.1],
        ),
      ]);
      const action = mixer.clipAction(clip);
      action.setLoop(T.LoopOnce);
      action.clampWhenFinished = true;
      this.flowerViews.push({ root: g, light, mixer, action, grown: false });
    });
    this.transmitter = group(this.dynamic, 'homemade transmitter');
    this.transmitter.position.set(TRANSMITTER.x, 0, TRANSMITTER.z);
    const tx = this.transmitter;
    const stone = cyl(tx, 0, 0.15, 0, 3.3, 0.3, '#5a7264', true);
    box(tx, 0, 0.65, 0, 2.5, 0.7, 1.8, '#856b52');
    for (const x of [-0.9, 0.9])
      box(tx, x, 1.1, 0, 0.12, 0.22, 1.4, '#b8b186', false);
    tube(tx, [0.8, 0.9, 0], [0.8, 4.3, 0], 0.055, '#a9bba2');
    for (let k = 0; k < 5; k++)
      tube(
        tx,
        [-1.4 + k * 0.3, 3 + k * 0.18, 0],
        [2.5 - k * 0.3, 3 + k * 0.18, 0],
        0.025,
        '#d1c898',
      );
    const bowl = mesh(
      tx,
      new T.SphereGeometry(1, 16, 8, 0, 6.28, 0, 1.45),
      mat('#9aa997'),
      -0.3,
      1.6,
      0,
      1.2,
      0.5,
      1.2,
      true,
    );
    bowl.rotation.z = 0.35;
    if (bowl.userData.outline)
      bowl.userData.outline.rotation.copy(bowl.rotation);
    textSign(tx, 'HELLO, UP THERE', 0, 0.75, 1.02, 2, '#e4d89d', '#4b5143');
    this.transmitterGlow = halo(tx, 0, 2.1, 0, 7, '#bbffe1', 0.2);
    // A small ring of smooth stones defines the clearing.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      orb(
        this.static,
        1 + Math.sin(a) * 7,
        0.2,
        -44 + Math.cos(a) * 7,
        0.38,
        0.23,
        0.32,
        '#81907a',
        true,
      );
    }
  }
  buildFlight() {
    this.flightRoot = group(this.dynamic);
    this.flightRoot.visible = false;
    this.ringViews = [];
    RINGS.forEach((p, i) => {
      const g = group(this.flightRoot, 'starlight' + i);
      g.position.set(p.x, p.y, p.z);
      const ring = new T.Mesh(
        new T.TorusGeometry(4.2, 0.065, 6, 72),
        mat('#d9d8a1', 1),
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const inner = new T.Mesh(
        new T.TorusGeometry(4.7, 0.018, 4, 72),
        basic('#adf9d2', 0.45),
      );
      inner.rotation.x = Math.PI / 2;
      g.add(inner);
      for (let n = 0; n < 8; n++) {
        const a = (n / 8) * Math.PI * 2;
        const star = mesh(
          g,
          geo.ico,
          glowmat,
          Math.sin(a) * 4.2,
          0,
          Math.cos(a) * 4.2,
          0.13,
          0.13,
          0.13,
        );
        halo(g, star.position.x, 0, star.position.z, 1.2, '#e8ffd2', 0.5);
      }
      this.ringViews.push(g);
    });
    const points = [
      V(TRANSMITTER.x, 3, TRANSMITTER.z),
      ...RINGS.map((p) => V(p.x, p.y, p.z)),
      V(SHIP.x, SHIP.y, SHIP.z),
    ];
    const curve = new T.CatmullRomCurve3(points);
    const guide = new T.Points(
      new T.BufferGeometry().setFromPoints(curve.getPoints(220)),
      new T.PointsNodeMaterial({
        color: '#d7edbe',
        size: 0.09,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.flightRoot.add(guide);
    this.ship = group(this.dynamic, 'A light from home');
    this.ship.position.set(SHIP.x, SHIP.y + 4, SHIP.z);
    orb(this.ship, 0, 0, 0, 9, 1.7, 9, mat('#6c9e97', 0.15), true);
    orb(this.ship, 0, 1, 0, 6, 3.1, 6, mat('#b1cec2', 0.2), true);
    orb(this.ship, 0, -0.8, 0, 7.4, 0.7, 7.4, mat('#d0e7b4', 1));
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      orb(
        this.ship,
        Math.sin(a) * 8.2,
        -0.2,
        Math.cos(a) * 8.2,
        0.22,
        0.18,
        0.22,
        mat(i % 3 ? '#e9d999' : '#b6ffe2', 2),
      );
    }
    halo(this.ship, 0, 0, 0, 40, '#d7ffd4', 0.6);
    const beam = new T.Mesh(
      new T.ConeGeometry(6, 12, 40, 1, true),
      basic('#c8ffdb', 0.07),
    );
    beam.position.y = -6;
    beam.rotation.z = Math.PI;
    this.ship.add(beam);
    this.ship.visible = false;
    this.landHalo = halo(
      this.flightRoot,
      SHIP.x,
      SHIP.y,
      SHIP.z,
      15,
      '#edffc8',
      0.8,
    );
  }
  buildFireflies() {
    const points = [],
      colors = [];
    for (let i = 0; i < 280; i++) {
      points.push(-48 + rand() * 96, 0.6 + rand() * 5, -92 + rand() * 137);
      const c = new T.Color(i % 3 ? '#d7eac0' : '#b1f4d0');
      colors.push(c.r, c.g, c.b);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    this.fireflies = new T.Points(
      g,
      new T.PointsNodeMaterial({
        size: 0.23,
        map: glTex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    this.dynamic.add(this.fireflies);
    this.fireflyBase = points;
  }
  bake() {
    this.static.updateMatrixWorld(true);
    const buckets = new Map();
    this.static.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (Array.isArray(m)) return;
      const geometry = o.geometry.clone();
      geometry.applyMatrix4(o.matrixWorld);
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      if (!geometry.attributes.uv) {
        const n = geometry.attributes.position.count;
        geometry.setAttribute(
          'uv',
          new T.Float32BufferAttribute(new Float32Array(n * 2), 2),
        );
      }
      const key = m.uuid;
      if (!buckets.has(key)) buckets.set(key, { material: m, geos: [] });
      buckets.get(key).geos.push(geometry);
    });
    const merged = group(this.scene, 'Ink and paper');
    for (const bucket of buckets.values()) {
      const geos = bucket.geos.map((g) => (g.index ? g.toNonIndexed() : g));
      const geometry = mergeGeometries(geos, false);
      if (!geometry) continue;
      const m = new T.Mesh(geometry, bucket.material);
      m.castShadow = !bucket.material.transparent && bucket.material !== ink;
      m.receiveShadow = true;
      merged.add(m);
      for (const g of geos) g.dispose();
    }
    this.scene.remove(this.static);
    this.merged = merged;
  }
  makeRider(id, colorHex = '#ff9b72') {
    const root = group(this.dynamic, 'rider' + id),
      bike = group(root, 'bike');
    const frame = '#b5604c',
      steel = '#b5c2b1',
      dark = '#142b34';
    for (const [name, z] of [
      ['frontWheel', 1.1],
      ['backWheel', -1.1],
    ]) {
      const w = group(bike, name);
      w.position.set(0, 0.62, z);
      const tire = mesh(w, new T.TorusGeometry(0.57, 0.075, 7, 24), mat(dark));
      tire.rotation.y = Math.PI / 2;
      const rim = mesh(w, new T.TorusGeometry(0.51, 0.027, 5, 24), mat(steel));
      rim.rotation.y = Math.PI / 2;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        tube(
          w,
          [0, 0, 0],
          [0, Math.sin(a) * 0.49, Math.cos(a) * 0.49],
          0.008,
          '#8ba7a5',
        );
      }
      tube(w, [-0.13, 0, 0], [0.13, 0, 0], 0.07, steel);
    }
    const pts = {
      rear: [0, 0.62, -1.1],
      pedal: [0, 0.65, -0.05],
      seat: [0, 1.6, -0.45],
      front: [0, 0.62, 1.1],
      stem: [0, 1.66, 0.75],
    };
    for (const [a, b] of [
      ['rear', 'pedal'],
      ['rear', 'seat'],
      ['seat', 'pedal'],
      ['seat', 'stem'],
      ['stem', 'pedal'],
      ['stem', 'front'],
    ])
      tube(bike, pts[a], pts[b], 0.055, frame, true);
    tube(bike, [0, 1.6, -0.45], [0, 1.85, -0.45], 0.035, steel);
    box(bike, 0, 1.9, -0.52, 0.45, 0.13, 0.66, dark);
    tube(bike, [0, 1.65, 0.75], [0, 2, 0.65], 0.035, steel);
    tube(bike, [-0.63, 2, 0.65], [0.63, 2, 0.65], 0.035, steel);
    for (const x of [-0.6, 0.6])
      tube(bike, [x, 2, 0.64], [x, 2, 0.95], 0.065, dark);
    const pedal = group(bike, 'pedals');
    pedal.position.set(0, 0.65, -0.05);
    for (const side of [-1, 1]) {
      tube(
        pedal,
        [side * 0.2, 0, 0],
        [side * 0.2, side * 0.3, 0],
        0.025,
        steel,
      );
      box(pedal, side * 0.3, side * 0.3, 0, 0.25, 0.08, 0.15, dark);
    }
    const rider = group(bike, 'child');
    rider.position.set(0, 1.9, -0.45);
    orb(rider, 0, 0.3, 0.02, 0.34, 0.5, 0.28, colorHex, true);
    orb(rider, 0, 0.65, 0.05, 0.38, 0.32, 0.33, colorHex, true);
    orb(rider, 0, 1.15, 0.12, 0.36, 0.4, 0.33, '#d9ac87', true);
    orb(rider, 0, 1.35, 0.06, 0.38, 0.29, 0.34, '#433f37', true);
    for (let k = 0; k < 5; k++) {
      const hair = orb(
        rider,
        -0.25 + k * 0.12,
        1.4,
        0.25,
        0.11,
        0.17,
        0.12,
        '#433f37',
      );
      hair.rotation.z = (k - 2) * 0.15;
    }
    for (const x of [-0.14, 0.14]) {
      orb(rider, x, 1.18, 0.422, 0.04, 0.05, 0.017, '#152b32');
    }
    orb(rider, 0, 1.08, 0.465, 0.06, 0.065, 0.04, '#c49474');
    tube(rider, [-0.08, 0.99, 0.42], [0.08, 0.99, 0.42], 0.018, '#785e50');
    for (const s of [-1, 1]) {
      tube(
        rider,
        [s * 0.3, 0.55, 0.1],
        [s * 0.54, 0.27, 0.65],
        0.1,
        colorHex,
        true,
      );
      tube(
        rider,
        [s * 0.54, 0.27, 0.65],
        [s * 0.57, 0.08, 1.12],
        0.085,
        '#d9ac87',
        true,
      );
      orb(rider, s * 0.57, 0.09, 1.12, 0.105, 0.09, 0.12, '#d9ac87');
      const leg = group(rider, s < 0 ? 'leftLeg' : 'rightLeg');
      leg.position.set(s * 0.22, 0, 0);
      tube(leg, [0, 0, 0], [0, -0.5, 0.45], 0.115, '#324957', true);
      tube(leg, [0, -0.5, 0.45], [0, -1, 0.25], 0.08, '#d2af89');
      box(leg, 0, -1.02, 0.32, 0.2, 0.17, 0.42, '#e3dcc0');
      box(leg, 0, -1.09, 0.32, 0.21, 0.04, 0.43, '#304548', false);
    }
    const basket = group(bike);
    basket.position.set(0, 1.45, 1.27);
    box(basket, 0, 0.03, 0, 0.94, 0.6, 0.75, '#8c8e63');
    for (let y = -0.18; y < 0.36; y += 0.12)
      box(basket, 0, y, 0.386, 0.97, 0.027, 0.025, '#b7b68a', false);
    for (let x = -0.42; x < 0.47; x += 0.15)
      box(basket, x, 0.03, 0.39, 0.02, 0.58, 0.025, '#717957', false);
    box(basket, 0, 0.37, 0, 1.02, 0.11, 0.83, '#c2bf90');
    const alien = group(bike, 'Pip');
    alien.position.set(0, 1.8, 1.32);
    alien.scale.setScalar(0.72);
    orb(alien, 0, 0.2, 0, 0.38, 0.43, 0.33, '#a29569', true);
    orb(alien, 0, 0.66, 0, 0.21, 0.5, 0.2, '#aa9d72', true);
    orb(alien, 0, 1.08, 0.03, 0.56, 0.38, 0.35, '#b7aa7e', true);
    for (const s of [-1, 1]) {
      orb(alien, s * 0.28, 1.09, 0.3, 0.22, 0.2, 0.075, '#8b947e', true);
      orb(alien, s * 0.28, 1.09, 0.361, 0.18, 0.158, 0.035, '#d4ddc5');
      orb(alien, s * 0.28, 1.09, 0.397, 0.105, 0.13, 0.025, '#244954');
      orb(alien, s * 0.28, 1.09, 0.421, 0.055, 0.1, 0.012, '#102631');
      orb(alien, s * 0.25, 1.145, 0.433, 0.032, 0.035, 0.009, '#fff1c6');
      tube(
        alien,
        [s * 0.35, 0.35, 0.04],
        [s * 0.46, 0.58, 0.25],
        0.075,
        '#a0946a',
      );
    }
    tube(alien, [-0.1, 0.91, 0.35], [0.1, 0.91, 0.35], 0.018, '#665f49');
    for (let k = 0; k < 4; k++)
      tube(
        alien,
        [-0.2 + k * 0.13, 0.8, 0.12],
        [-0.2 + k * 0.13, 0.95, 0.25],
        0.016,
        '#897f59',
      );
    const hand = group(alien, 'finger');
    hand.position.set(0.5, 0.6, 0.23);
    tube(hand, [0, 0, 0], [0.08, 0.34, 0.06], 0.04, '#b1a274');
    orb(hand, 0.08, 0.38, 0.06, 0.065, 0.08, 0.065, mat('#e5ffcb', 1.5));
    const fingerHalo = halo(hand, 0.08, 0.38, 0.06, 1.5, '#ccffca', 0.6);
    box(basket, 0, 0.4, 0.4, 1.06, 0.45, 0.08, '#94b4a0', false);
    // A flutter of red cloth and a small frame-mounted headlight.
    const scarf = group(rider, 'scarf');
    tube(scarf, [0.2, 0.7, -0.2], [0.3, 0.4, -0.9], 0.1, '#c98565');
    orb(bike, 0, 1.62, 1.04, 0.14, 0.13, 0.15, mat('#f8e6ac', 1));
    halo(bike, 0, 1.6, 1.12, 1.8, '#f6d991', 0.3);
    const mixer = new T.AnimationMixer(bike);
    const clip = new T.AnimationClip('Pedal into the night', 0.8, [
      new T.NumberKeyframeTrack(
        'frontWheel.rotation[x]',
        [0, 0.8],
        [0, -Math.PI * 2],
      ),
      new T.NumberKeyframeTrack(
        'backWheel.rotation[x]',
        [0, 0.8],
        [0, -Math.PI * 2],
      ),
      new T.NumberKeyframeTrack(
        'pedals.rotation[x]',
        [0, 0.8],
        [0, Math.PI * 2],
      ),
      new T.NumberKeyframeTrack(
        'child.position[y]',
        [0, 0.2, 0.4, 0.6, 0.8],
        [1.9, 1.94, 1.9, 1.94, 1.9],
      ),
      new T.NumberKeyframeTrack(
        'leftLeg.rotation[x]',
        [0, 0.2, 0.4, 0.6, 0.8],
        [-0.35, 0, 0.35, 0, -0.35],
      ),
      new T.NumberKeyframeTrack(
        'rightLeg.rotation[x]',
        [0, 0.2, 0.4, 0.6, 0.8],
        [0.35, 0, -0.35, 0, 0.35],
      ),
      new T.NumberKeyframeTrack(
        'scarf.rotation[x]',
        [0, 0.2, 0.4, 0.6, 0.8],
        [0, 0.25, 0, -0.2, 0],
      ),
    ]);
    const ride = mixer.clipAction(clip);
    ride.play();
    const breathe = new T.AnimationClip('A little life', 2.6, [
      new T.VectorKeyframeTrack(
        'Pip.scale',
        [0, 1.3, 2.6],
        [0.72, 0.72, 0.72, 0.73, 0.75, 0.73, 0.72, 0.72, 0.72],
      ),
      new T.NumberKeyframeTrack(
        'Pip.rotation[z]',
        [0, 1.3, 2.6],
        [-0.04, 0.04, -0.04],
      ),
      new T.NumberKeyframeTrack(
        'finger.rotation[z]',
        [0, 1.3, 2.6],
        [-0.1, 0.15, -0.1],
      ),
    ]);
    const breath = mixer.clipAction(breathe);
    breath.play();
    const shadow = mesh(
      root,
      geo.disc,
      basic('#091f2a', 0.25),
      0,
      0.035,
      0,
      1.3,
      1.3,
      1,
    );
    shadow.rotation.x = -Math.PI / 2;
    const trail = halo(root, 0, 0.5, -1.5, 3, '#bdffdc', 0.5);
    trail.visible = false;
    const waveClip = new T.AnimationClip('A small goodbye', 1.2, [
      new T.NumberKeyframeTrack(
        'finger.rotation[x]',
        [0, 0.3, 0.6, 0.9, 1.2],
        [0, 0.8, 0.15, 0.8, 0],
      ),
      new T.NumberKeyframeTrack(
        'Pip.rotation[y]',
        [0, 0.6, 1.2],
        [-0.12, 0.12, -0.12],
      ),
    ]);
    const wave = mixer.clipAction(waveClip);
    const view = {
      root,
      bike,
      mixer,
      ride,
      breath,
      wave,
      alien,
      fingerHalo,
      shadow,
      trail,
      lastYaw: 0,
    };
    this.riders.set(id, view);
    return view;
  }
  makeAgent(index) {
    const root = group(this.dynamic, 'searcher' + index);
    const body = group(root, 'coat');
    orb(body, 0, 1.05, 0, 0.43, 0.8, 0.33, '#b3a47c', true);
    orb(body, 0, 1.9, 0, 0.28, 0.34, 0.27, '#7e8270', true);
    orb(body, 0, 2.1, 0, 0.38, 0.12, 0.33, '#a8a17c', true);
    for (const s of [-1, 1]) {
      const leg = group(body, s < 0 ? 'left' : 'right');
      leg.position.set(s * 0.2, 0.6, 0);
      tube(leg, [0, 0, 0], [0, -0.5, 0.02], 0.12, '#31464a');
      box(leg, 0, -0.52, 0.12, 0.27, 0.18, 0.45, '#1c3039');
      tube(body, [s * 0.34, 1.4, 0], [s * 0.47, 1, 0.4], 0.13, '#ae9f79');
    }
    tube(body, [0.47, 1, 0.4], [0.47, 1, 0.78], 0.09, '#344c4e');
    orb(body, 0.47, 1, 0.8, 0.07, 0.07, 0.04, mat('#e3d4a3', 1));
    const beam = group(root);
    beam.position.set(0.47, 0, 0.6);
    const tri = new T.BufferGeometry();
    tri.setAttribute(
      'position',
      new T.Float32BufferAttribute([0, 0.06, 0, -5, 0.06, 13, 5, 0.06, 13], 3),
    );
    tri.computeVertexNormals();
    const bm = basic('#f5d598', 0.12);
    bm.side = T.DoubleSide;
    mesh(beam, tri, bm);
    const cone = new T.ConeGeometry(5, 13, 24, 1, true);
    cone.rotateX(-Math.PI / 2);
    mesh(beam, cone, basic('#efdca4', 0.035), 0, 1, 6.5, 1, 0.18, 1);
    const mixer = new T.AnimationMixer(body);
    mixer
      .clipAction(
        new T.AnimationClip('Looking for a missing star', 1.2, [
          new T.NumberKeyframeTrack(
            'left.rotation[x]',
            [0, 0.3, 0.6, 0.9, 1.2],
            [-0.4, 0, 0.4, 0, -0.4],
          ),
          new T.NumberKeyframeTrack(
            'right.rotation[x]',
            [0, 0.3, 0.6, 0.9, 1.2],
            [0.4, 0, -0.4, 0, 0.4],
          ),
        ]),
      )
      .play();
    const view = { root, mixer, beam };
    this.agents.push(view);
    return view;
  }
  pulse(x, y, z) {
    const ring = mesh(
      this.dynamic,
      new T.RingGeometry(0.9, 1, 64),
      basic('#ceffcf', 0.8),
      x,
      y + 0.1,
      z,
    );
    ring.rotation.x = -Math.PI / 2;
    const ball = halo(this.dynamic, x, y + 1, z, 10, '#ceffcf', 0.8);
    this.pulses.push({ ring, ball, life: 0 });
  }
  showDebug(world, enabled) {
    if (this.debug) {
      this.scene.remove(this.debug);
      this.debug.geometry.dispose();
      this.debug.material.dispose();
      this.debug = null;
    }
    if (enabled) {
      const { vertices, colors } = world.debugRender();
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(vertices, 3));
      g.setAttribute('color', new T.BufferAttribute(colors, 4));
      this.debug = new T.LineSegments(
        g,
        new T.LineBasicNodeMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          depthTest: false,
        }),
      );
      this.debug.renderOrder = 99;
      this.scene.add(this.debug);
    }
  }
  update(
    state,
    dt,
    { title = false, me = 0, attract = false, reduced = false } = {},
  ) {
    this.elapsed += dt;
    const time = this.elapsed;
    const players = state.players || [];
    const ids = new Set(players.map((p) => p.id));
    for (const [id, v] of this.riders)
      if (!ids.has(id)) {
        this.dynamic.remove(v.root);
        this.riders.delete(id);
      }
    for (const p of players) {
      const view = this.riders.get(p.id) || this.makeRider(p.id, p.color);
      const loc = V(p.x, p.y, p.z);
      if (this.snap || !view.placed) {
        view.root.position.copy(loc);
        view.placed = true;
      } else view.root.position.lerp(loc, title ? 1 : Math.min(1, dt * 16));
      view.root.rotation.y = p.yaw;
      view.bike.rotation.z = T.MathUtils.lerp(
        view.bike.rotation.z,
        Math.sin(p.yaw - view.lastYaw) * -0.5,
        dt * 5,
      );
      view.lastYaw = p.yaw;
      view.ride.setEffectiveTimeScale(Math.max(0.05, p.speed / 7.8));
      view.ride.setEffectiveWeight(p.speed > 0.1 ? 1 : 0.15);
      view.breath.setEffectiveTimeScale(1);
      if (state.phase === 'farewell') {
        if (!view.wave.isRunning()) view.wave.reset().play();
      } else if (view.wave.isRunning()) view.wave.stop();
      view.mixer.update(dt);
      view.fingerHalo.material.opacity = p.glow > 0 ? 1 : 0.35;
      view.fingerHalo.scale.setScalar(p.glow > 0 ? 3 : 1.3);
      view.shadow.visible = p.y < 3;
      view.trail.visible = state.phase === 'flight';
      if (state.phase === 'flight' && !reduced)
        view.bike.position.y = Math.sin(time * 3 + p.id) * 0.14;
      else view.bike.position.y = 0;
    }
    this.parts.forEach((p, i) => {
      p.root.visible = !state.parts?.[i];
      p.mixer.update(dt);
    });
    if (state.bridge && !this.bridgeGrown.visible) {
      this.bridgeGrown.visible = true;
      this.dormant.visible = false;
      this.bridgeGrown.scale.y = 0.01;
    }
    if (!state.bridge) {
      this.bridgeGrown.visible = false;
      this.dormant.visible = true;
    }
    if (this.bridgeGrown.visible)
      this.bridgeGrown.scale.y = T.MathUtils.lerp(
        this.bridgeGrown.scale.y,
        1,
        Math.min(1, dt * 3),
      );
    this.flowerViews.forEach((f, i) => {
      if (state.flowers?.[i] && !f.grown) {
        f.grown = true;
        f.action.reset().play();
        f.light.visible = true;
      }
      if (!state.flowers?.[i] && f.grown) {
        f.action.stop();
        f.grown = false;
        f.light.visible = false;
        f.root.getObjectByName('bloom').rotation.z = 0.65;
        f.root.getObjectByName('bloom').scale.setScalar(0.7);
      }
      f.mixer.update(dt);
    });
    const flying = ['flight', 'farewell', 'won'].includes(state.phase);
    this.flightRoot.visible = flying;
    this.ship.visible = flying;
    this.ringViews.forEach((g, i) => {
      g.visible = i >= state.ring;
      g.scale.setScalar(i === state.ring ? 1 : 0.85);
      g.rotation.y = time * 0.05;
    });
    this.ship.position.y =
      SHIP.y +
      4 +
      Math.sin(time * 0.7) * 0.3 +
      (state.phase === 'farewell'
        ? Math.max(0, state.farewell - 4) ** 2 * 0.8
        : state.phase === 'won'
          ? 38
          : 0);
    this.ship.rotation.y = time * 0.04;
    this.transmitterGlow.material.opacity = state.parts?.every(Boolean)
      ? 0.75
      : 0.18;
    (state.agents || []).forEach((a, i) => {
      const v = this.agents[i] || this.makeAgent(i);
      v.root.position.set(a.x, 0, a.z);
      v.root.rotation.y = a.yaw;
      v.root.visible = !flying;
      v.beam.visible = a.distract < 0.1;
      v.mixer.update(dt);
    });
    for (let i = 0; i < (state.candies?.length || 0); i++) {
      const c = state.candies[i];
      let v = this.candyViews[i];
      if (!v) {
        v = orb(this.dynamic, 0, 0, 0, 0.22, 0.14, 0.14, '#e8bc73', true);
        this.candyViews.push(v);
      }
      v.visible = true;
      v.position.set(c.x, c.y, c.z);
      if (v.userData.outline) {
        v.userData.outline.position.copy(v.position);
        v.userData.outline.visible = true;
      }
    }
    for (let i = state.candies?.length || 0; i < this.candyViews.length; i++) {
      this.candyViews[i].visible = false;
      if (this.candyViews[i].userData.outline)
        this.candyViews[i].userData.outline.visible = false;
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life += dt;
      const s = 1 + p.life * 9;
      p.ring.scale.setScalar(s);
      p.ring.material.opacity = Math.max(0, 0.7 - p.life * 0.5);
      p.ball.material.opacity = Math.max(0, 0.7 - p.life * 0.5);
      if (p.life > 1.5) {
        this.dynamic.remove(p.ring, p.ball);
        p.ring.geometry.dispose();
        p.ring.material.dispose();
        p.ball.material.dispose();
        this.pulses.splice(i, 1);
      }
    }
    const attr = this.fireflies.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const n = i * 3;
      attr.setXYZ(
        i,
        this.fireflyBase[n] + Math.sin(time * 0.5 + i) * 0.5,
        this.fireflyBase[n + 1] + Math.sin(time + i) * 0.35,
        this.fireflyBase[n + 2] + Math.cos(time * 0.4 + i) * 0.4,
      );
    }
    attr.needsUpdate = true;
    this.snap = false;
    const local = players.find((p) => p.id === me) || players[0];
    if (local) {
      riderLocation.value.set(local.x, local.y, local.z);
      if (title) {
        const target = V(local.x - 8, 3, local.z - 8);
        this.follow.lerp(target, Math.min(1, dt * 2));
        const desired = V(
          local.x + 5 + Math.sin(time * 0.08) * 0.6,
          6.2,
          local.z + 15,
        );
        this.camera.position.lerp(desired, Math.min(1, dt * 2));
        this.camera.lookAt(this.follow);
      } else {
        const y = flying ? local.y : Math.max(0.1, local.y);
        this.follow.lerp(V(local.x, y + 1, local.z - 2), Math.min(1, dt * 5));
        const mobile = innerWidth < 700;
        const dist = (flying ? 32 : 30) * this.zoom * (mobile ? 1.15 : 1);
        const offset = V(
          Math.sin(this.cameraYaw) * dist,
          dist * (flying ? 0.34 : this.elevation),
          Math.cos(this.cameraYaw) * dist,
        );
        this.camera.position.lerp(
          this.follow.clone().add(offset),
          Math.min(1, dt * 5),
        );
        this.camera.lookAt(this.follow);
      }
    }
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  project(point) {
    return V(point.x, point.y || 2.4, point.z).project(this.camera);
  }
  groundPoint(clientX, clientY, height = 0) {
    const ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2(
        (clientX / innerWidth) * 2 - 1,
        (-clientY / innerHeight) * 2 + 1,
      ),
      this.camera,
    );
    return ray.ray.intersectPlane(
      new T.Plane(V(0, 1, 0), -height),
      new T.Vector3(),
    );
  }
  titleCamera(p) {
    this.follow.set(p.x - 8, 3, p.z - 8);
    this.camera.position.set(p.x + 5, 6.2, p.z + 15);
    this.camera.lookAt(this.follow);
    this.camera.updateMatrixWorld();
  }
  resetCamera(p) {
    this.follow.set(p.x, 1, p.z);
    const d = 30;
    this.camera.position
      .copy(this.follow)
      .add(
        V(Math.sin(this.cameraYaw) * d, d * 0.86, Math.cos(this.cameraYaw) * d),
      );
  }
}
