const TAU = Math.PI * 2,
  HALF_X = 22,
  HALF_Z = 12,
  STEP = 1 / 60;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const turnTo = (a, b, step) => a + clamp(angleDelta(a, b), -step, step);
const sqDist = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const palette = {
  ink: 0x233635,
  paper: 0xf3ebd6,
  yellow: 0xf6c64a,
  orange: 0xe85836,
  green: 0x477766,
  mint: 0xb6d0b5,
  soil: 0xb2be8c,
  navy: 0x304c4c,
};
const DEFAULTS = {
  speed: 7,
  shellSpeed: 24,
  reload: 0.62,
  ai: 0.62,
  roundSeconds: 70,
  target: 5,
  timeScale: 1,
};
const STAGES = [
  {
    name: 'Tread lightly',
    short: 'TANKS',
    vehicle: 'tank',
    label: 'GUIDED SHELLS',
    rule: 'Hold fire and turn your aim to bend a shell.',
    tip: 'The red tank is yours. One hit, one point. First to five takes the field.',
    trick: 'SMOKE',
    bank: false,
    ghost: false,
    air: false,
    guided: true,
    blocks: [
      [-5, -3, 2, 5],
      [5, 3, 2, 5],
      [-12, 4, 4, 1.5],
      [12, -4, 4, 1.5],
    ],
    color: 0xb9c79b,
  },
  {
    name: 'Bank job',
    short: 'TANK-PONG',
    vehicle: 'tank',
    label: 'BANK SHOTS ONLY',
    rule: 'Hit a wall first. Yellow shells can score.',
    tip: 'Your dotted sight shows one rebound. A straight shot just goes BONK.',
    trick: 'SMOKE',
    bank: true,
    ghost: false,
    air: false,
    guided: false,
    blocks: [
      [-8, -5, 6, 1.5],
      [8, 5, 6, 1.5],
      [-5, 3, 1.5, 5],
      [5, -3, 1.5, 5],
      [0, 8, 3, 1.5],
      [0, -8, 3, 1.5],
    ],
    color: 0xc5bd8b,
  },
  {
    name: 'Now you see me',
    short: 'INVISIBLE TANKS',
    vehicle: 'tank',
    label: 'HIDE. SEEK. SHOOT.',
    rule: 'Firing or bumping a wall gives you away.',
    tip: 'Keep moving while cloaked. Use your scanner to expose the other tank.',
    trick: 'SCAN',
    bank: false,
    ghost: true,
    air: false,
    guided: true,
    blocks: [
      [-7, -4, 3, 3],
      [7, 4, 3, 3],
      [-8, 5, 5, 1.5],
      [8, -5, 5, 1.5],
      [0, 0, 2, 5],
    ],
    color: 0x94b3a0,
  },
  {
    name: 'Cloud nine',
    short: 'BIPLANES',
    vehicle: 'biplane',
    label: 'CLOUDS & MACHINE GUNS',
    rule: 'Keep flying. Clouds hide you. Edges wrap.',
    tip: 'Steer toward your stick or mouse. Hold fire for twin guns. Roll through danger.',
    trick: 'BARREL ROLL',
    bank: false,
    ghost: false,
    air: true,
    guided: false,
    blocks: [],
    color: 0xa9c8bd,
  },
  {
    name: 'Jet set go',
    short: 'JET FORMATIONS',
    vehicle: 'jet',
    label: 'TWO AGAINST TWO',
    rule: 'Both jets fire. Either jet can take a hit.',
    tip: 'Keep your wingmate close. Guide missiles around the clouds and burn out of trouble.',
    trick: 'AFTERBURNER',
    bank: false,
    ghost: false,
    air: true,
    guided: true,
    formation: true,
    blocks: [],
    color: 0xb0c8af,
  },
];
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 5),
  plane: new THREE.PlaneGeometry(1, 1),
  ring: new THREE.RingGeometry(0.82, 1, 40),
};
const edgeCache = new WeakMap(),
  materialCache = new Map();
const inkMaterial = new THREE.MeshBasicMaterial({ color: palette.ink, side: THREE.BackSide });
const edgeMaterial = new THREE.LineBasicMaterial({
  color: palette.ink,
  transparent: true,
  opacity: 0.6,
});
function cel(hex) {
  if (materialCache.has(hex)) return materialCache.get(hex);
  const m = new THREE.MeshBasicNodeMaterial();
  const shade = floor(max(dot(normalWorld, vec3(0.38, 0.85, 0.35)), float(0)).mul(3))
    .div(3)
    .mul(0.34)
    .add(0.66);
  m.colorNode = color(hex).mul(shade);
  materialCache.set(hex, m);
  return m;
}
function shape(parent, type, x, y, z, sx, sy, sz, hex, ink = true) {
  const m = new THREE.Mesh(geo[type], cel(hex));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  if (ink) {
    const out = new THREE.Mesh(geo[type], inkMaterial);
    out.scale.setScalar(1.045);
    m.add(out);
  }
  return m;
}
function line(parent, points, hex = palette.ink, opacity = 1) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Line(
    g,
    new THREE.LineBasicMaterial({ color: hex, transparent: opacity < 1, opacity }),
  );
  parent.add(m);
  return m;
}
function floorRing(parent, x, z, r, hex, opacity = 0.8) {
  const m = new THREE.Mesh(
    geo.ring,
    new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.setScalar(r);
  m.position.set(x, 0.055, z);
  parent.add(m);
  return m;
}
function shadow(parent, x, z, sx, sz, opacity = 0.17) {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({
      color: palette.ink,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  s.rotation.x = -Math.PI / 2;
  s.position.set(x, 0.045, z);
  s.scale.set(sx, sz, 1);
  parent.add(s);
  return s;
}
function canvasMaterial(map) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const sample = texture(map);
  m.colorNode = sample.rgb;
  m.opacityNode = sample.a;
  return m;
}

class FieldView {
  constructor(mount) {
    this.renderer = new THREE.WebGPURenderer({
      antialias: true,
      alpha: false,
      forceWebGL: new URLSearchParams(location.search).get('renderer') === 'webgl',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(palette.paper);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-28, 28, 17, -17, 0.1, 150);
    this.scene.add(new THREE.HemisphereLight(0xfff5d6, 0x425d4b, 2));
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.effects = [];
    this.decals = [];
    this.clouds = [];
    this.disposables = [];
    this.mode = 'title';
    this.shake = 0;
    this.elapsed = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  async init() {
    await this.renderer.init();
    this.backend = this.renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2 compatibility';
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h);
    const a = w / h;
    let span = a < 1 ? 55 / a : 32;
    if (a > 2.1) span = 30;
    this.span = span;
    this.camera.left = (-span * a) / 2;
    this.camera.right = (span * a) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
  }
  clear() {
    this.scene.remove(this.root);
    const shared = new Set([inkMaterial, edgeMaterial, ...materialCache.values()]),
      disposed = new Set();
    this.root.traverse((o) => {
      if (o.isLine) o.geometry.dispose();
      if (o.material && !shared.has(o.material) && !disposed.has(o.material)) {
        o.material.dispose();
        disposed.add(o.material);
      }
      if (o.userData.dispose) o.geometry.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.effects = [];
    this.decals = [];
    this.clouds = [];
  }
  label(text, x, z, size = 1.4, hex = '#233635', width = 10) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.font = '800 76px "Barlow Condensed",sans-serif';
    c.width = Math.ceil(ctx.measureText(text).width + 60);
    ctx.fillStyle = hex;
    ctx.font = '800 76px "Barlow Condensed",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, 64);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(texture);
    const m = new THREE.Mesh(geo.plane, canvasMaterial(texture));
    m.position.set(x, 0.115, z);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(width, size, 1);
    this.root.add(m);
    return m;
  }
  ground(stage) {
    shape(this.root, 'box', 0, -0.6, 0, 47, 1, 27, palette.ink);
    shape(this.root, 'box', 0, -0.08, 0, 46, 0.3, 26, 0xe6d9b3);
    shape(this.root, 'box', 0, 0.02, 0, 44, 0.12, 24, stage.color, false);
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(35,54,53,.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 2048; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y < 1024; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }
    for (let i = 0; i < 650; i++) {
      const x = (Math.sin(i * 53.31) * 0.5 + 0.5) * 2048,
        y = (Math.cos(i * 27.12) * 0.5 + 0.5) * 1024;
      ctx.fillStyle = i % 3 ? 'rgba(35,54,53,.12)' : 'rgba(255,249,218,.25)';
      ctx.beginPath();
      ctx.arc(x, y, i % 3 ? 1.3 : 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(35,54,53,.12)';
    ctx.lineWidth = 2;
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      for (let i = 0; i < 120; i++) {
        const x = i * 20,
          y = 100 + j * 180 + Math.sin(i * 0.1 + j * 2) * 45 + Math.cos(i * 0.22 + j) * 15;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = 'rgba(243,235,214,.7)';
    ctx.strokeRect(36, 35, 1976, 954);
    ctx.setLineDash([]);
    if (stage.air) {
      ctx.fillStyle = 'rgba(35,54,53,.09)';
      ctx.fillRect(250, 390, 1548, 260);
      ctx.strokeStyle = 'rgba(243,235,214,.4)';
      ctx.setLineDash([50, 25]);
      ctx.beginPath();
      ctx.moveTo(260, 520);
      ctx.lineTo(1790, 520);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(tex);
    const mesh = new THREE.Mesh(geo.plane, canvasMaterial(tex));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.087;
    mesh.scale.set(44, 24, 1);
    this.root.add(mesh);
    this.label(
      'FIELD ' + String(STAGES.indexOf(stage) + 1).padStart(2, '0') + ' / ' + stage.short,
      -12,
      10.8,
      0.65,
      '#40564a',
      14,
    );
    this.label('COMBATON · TRAINING GROUNDS', 12, -10.8, 0.5, '#40564a', 13);
    for (let i = 0; i < 24; i++) {
      const x = -22 + i * 1.9;
      shape(
        this.root,
        'box',
        x,
        0.13,
        12.55,
        0.6,
        0.12,
        0.22,
        i % 2 ? palette.orange : palette.ink,
        false,
      );
      shape(
        this.root,
        'box',
        x,
        0.13,
        -12.55,
        0.6,
        0.12,
        0.22,
        i % 2 ? palette.orange : palette.ink,
        false,
      );
    }
    for (const x of [-22.6, 22.6])
      for (let z = -11; z <= 11; z += 2)
        shape(this.root, 'box', x, 0.13, z, 0.22, 0.12, 0.6, palette.ink, false);
    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? 1 : -1,
        x = Math.sin(i * 8.72) * 20,
        z = side * (14 + (i % 3) * 0.5);
      this.bush(x, z, 0.5 + (i % 4) * 0.18);
    }
    for (let i = 0; i < 7; i++) {
      const x = (i % 2 ? 1 : -1) * (24.7 + (i % 3) * 0.3),
        z = -10 + i * 3.3;
      this.tree(x, z, 1 + (i % 3) * 0.23);
    }
    const sign = new THREE.Group();
    sign.position.set(20, 0, 14);
    shape(sign, 'box', 0, 0.4, 0, 0.12, 0.9, 0.12, palette.ink, false);
    shape(sign, 'box', 0, 1, 0, 2.8, 0.9, 0.1, palette.yellow);
    sign.rotation.y = -0.2;
    this.root.add(sign);
    for (let i = 0; i < 8; i++) {
      const x = -21 + i * 6;
      line(
        this.root,
        [
          [x, 0.15, 13],
          [x + 0.7, 0.15, 13.65],
        ],
        palette.ink,
        0.5,
      );
    }
  }
  bush(x, z, size = 1) {
    shadow(this.root, x, z, size, size * 0.6, 0.1);
    for (let i = 0; i < 3; i++)
      shape(
        this.root,
        'sphere',
        x + (i - 1) * size * 0.4,
        0.25 + size * 0.2,
        z + Math.sin(i * 4) * 0.2,
        size * 0.6,
        size * 0.48,
        size * 0.6,
        [0x7f996d, 0x94aa78, 0xa7b886][i],
        true,
      );
  }
  tree(x, z, s = 1) {
    shadow(this.root, x + 0.5, z + 0.3, s * 1.2, s * 0.7, 0.13);
    shape(this.root, 'cylinder', x, 0.7 * s, z, 0.16 * s, 1.4 * s, 0.16 * s, 0x6f6f46);
    for (let i = 0; i < 3; i++)
      shape(
        this.root,
        'cone',
        x,
        (1.35 + i * 0.54) * s,
        z,
        (1.05 - i * 0.2) * s,
        1.2 * s,
        (1.05 - i * 0.2) * s,
        [0x5b805e, 0x75956c, 0x8eaa76][i],
      );
  }
  wall(rect) {
    const [x, z, w, d] = rect;
    shape(this.root, 'box', x + 0.35, 0.11, z + 0.4, w + 0.35, 0.12, d + 0.5, 0x829470, false);
    shape(this.root, 'box', x, 0.8, z, w, 1.5, d, 0x537766);
    shape(this.root, 'box', x, 1.58, z, w + 0.14, 0.12, d + 0.14, 0xa2b68a);
    for (let i = 0; i < Math.floor(w / 1.5); i++)
      shape(
        this.root,
        'box',
        x - w / 2 + 0.75 + i * 1.5,
        1.67,
        z,
        1.25,
        0.06,
        Math.max(0.25, d - 0.15),
        0xb3c69a,
        false,
      );
    for (let i = 0; i < Math.floor(d / 2); i++)
      shape(
        this.root,
        'box',
        x,
        1.68,
        z - d / 2 + 1 + i * 2,
        Math.max(0.25, w - 0.15),
        0.03,
        0.035,
        0x637e66,
        false,
      );
  }
  makeCloud(x, z, r = 3.5) {
    const g = new THREE.Group();
    g.position.set(x, 2.7, z);
    this.root.add(g);
    shadow(this.root, x + 0.8, z + 0.5, r * 1.2, r * 0.55, 0.07);
    for (let i = 0; i < 6; i++) {
      const px = (i - 2.5) * r * 0.35,
        pz = Math.sin(i * 2) * r * 0.25;
      shape(g, 'sphere', px, Math.cos(i) * 0.2, pz, r * 0.62, 0.38, r * 0.43, 0xf4f0da, true);
    }
    this.clouds.push({ g, x, z, r });
  }
  build(stage, title = false) {
    this.clear();
    this.stage = stage;
    this.mode = title ? 'title' : 'play';
    this.ground(stage);
    for (const rect of stage.blocks) if (!title || rect[0] < 0) this.wall(rect);
    if (title) this.label('077', 6, -5, 5, '#d2d8ae', 10);
    if (stage.air) {
      this.makeCloud(-8, -3, 3.4);
      this.makeCloud(8, 4, 3.8);
      this.makeCloud(1, -8, 2.4);
    } else {
      for (const [x, z] of [
        [-18, -8],
        [18, 8],
        [-2, 8],
        [2, -8],
      ]) {
        if (
          !stage.blocks.some(
            (b) => Math.abs(x - b[0]) < b[2] / 2 + 1 && Math.abs(z - b[1]) < b[3] / 2 + 1,
          )
        )
          this.bush(x, z, 0.42);
      }
      floorRing(this.root, -16, 5, 1.65, palette.paper, 0.65);
      floorRing(this.root, 16, -5, 1.65, palette.paper, 0.65);
    }
    this.trackMaterial = new THREE.MeshBasicMaterial({
      color: palette.ink,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    });
    this.trackMarks = [];
    this.sight = new THREE.Group();
    this.root.add(this.sight);
    this.dots = [];
    for (let i = 0; i < 55; i++) {
      const m = new THREE.Mesh(geo.sphere, new THREE.MeshBasicMaterial({ color: palette.paper }));
      m.scale.setScalar(0.075);
      this.sight.add(m);
      this.dots.push(m);
    }
    this.reticle = floorRing(this.root, 0, 0, 0.5, palette.paper, 1);
  }
  vehicle(kind, id, formation = false) {
    const root = new THREE.Group(),
      rig = new THREE.Group();
    rig.name = 'Chassis';
    root.add(rig);
    this.root.add(root);
    const col = id === 0 ? palette.orange : palette.green,
      light = id === 0 ? 0xf7a362 : 0xb0cbb1,
      navy = palette.ink;
    const addTank = () => {
      for (const z of [-0.67, 0.67]) {
        shape(rig, 'box', 0, 0.32, z, 2.1, 0.5, 0.42, navy);
        shape(rig, 'box', -0.05, 0.6, z, 2.12, 0.15, 0.47, light);
        for (let i = 0; i < 6; i++) {
          const w = shape(
            rig,
            'cylinder',
            -0.82 + i * 0.32,
            0.28,
            z + 0.22 * Math.sign(z),
            0.18,
            0.08,
            0.18,
            0x5c6a52,
          );
          w.rotation.x = Math.PI / 2;
          shape(rig, 'box', -0.86 + i * 0.33, 0.59, z, 0.08, 0.14, 0.5, navy, false);
        }
      }
      shape(rig, 'box', -0.12, 0.62, 0, 1.85, 0.5, 1.05, col);
      shape(rig, 'box', -0.32, 0.92, 0, 0.95, 0.12, 0.9, light);
      shape(rig, 'box', -0.75, 0.9, 0, 0.17, 0.11, 0.6, navy, false);
      const turret = new THREE.Group();
      turret.name = 'Turret';
      turret.position.set(0.1, 0.94, 0);
      rig.add(turret);
      shape(turret, 'cylinder', 0, 0, 0, 0.56, 0.28, 0.56, col);
      shape(turret, 'cylinder', -0.09, 0.2, 0, 0.24, 0.12, 0.24, light);
      const barrel = new THREE.Group();
      barrel.name = 'Barrel';
      barrel.position.x = 0.65;
      turret.add(barrel);
      shape(barrel, 'box', 0.4, 0.02, 0, 1.08, 0.19, 0.2, col);
      shape(barrel, 'box', 0.91, 0.02, 0, 0.24, 0.27, 0.28, navy);
      shape(barrel, 'box', 0.92, 0.03, 0, 0.12, 0.14, 0.29, light, false);
      const antenna = new THREE.Group();
      antenna.name = 'Antenna';
      antenna.position.set(-0.65, 0.97, -0.3);
      rig.add(antenna);
      shape(antenna, 'cylinder', 0, 0.4, 0, 0.025, 0.8, 0.025, navy, false);
      shape(antenna, 'sphere', 0, 0.83, 0, 0.065, 0.065, 0.065, palette.yellow, false);
      shape(rig, 'box', -0.34, 0.99, 0.35, 0.28, 0.02, 0.22, palette.paper, false);
      return { turret, barrel };
    };
    const addBiplane = (parent, offset = 0) => {
      const g = new THREE.Group();
      g.position.z = offset;
      parent.add(g);
      shape(g, 'sphere', 0, 0.2, 0, 1.2, 0.36, 0.32, col);
      shape(g, 'box', -0.05, 0.2, -0.57, 1.22, 1.8, 0.13, light);
      shape(g, 'box', 0.1, 0.2, 0.3, 1.25, 1.9, 0.14, col);
      for (const x of [-0.45, 0.47])
        for (const y of [-0.68, 0.68]) shape(g, 'box', x, y, -0.13, 0.045, 0.05, 0.85, navy, false);
      shape(g, 'box', -0.95, 0.2, -0.27, 0.34, 0.12, 0.65, col);
      shape(g, 'box', -0.94, 0.2, 0, 0.56, 0.85, 0.1, light);
      shape(g, 'sphere', -0.22, 0.54, -0.24, 0.34, 0.12, 0.22, navy);
      shape(g, 'box', 0.15, 1.13, -0.58, 0.18, 0.02, 0.13, palette.paper, false);
      shape(g, 'box', 0.15, -0.73, 0.29, 0.17, 0.02, 0.1, palette.paper, false);
      for (const x of [-0.35, 0.35]) {
        shape(g, 'box', x, 0.6, 0.48, 0.04, 0.05, 0.29, navy, false);
        shape(g, 'cylinder', x, 0.62, 0.65, 0.13, 0.09, 0.13, navy);
      }
      const prop = new THREE.Group();
      prop.name = 'Propeller';
      prop.position.set(1.15, 0.2, 0);
      g.add(prop);
      shape(prop, 'box', 0, 0, 0, 0.07, 0.07, 1.1, navy, false);
      shape(prop, 'sphere', 0.08, 0, 0, 0.16, 0.13, 0.13, light);
      return g;
    };
    const addJet = (parent, offset = 0) => {
      const g = new THREE.Group();
      g.position.z = offset;
      parent.add(g);
      shape(g, 'sphere', 0.1, 0.4, 0, 1.35, 0.24, 0.25, col);
      const nose = shape(g, 'cone', 1.27, 0.4, 0, 0.25, 0.85, 0.25, light);
      nose.rotation.z = -Math.PI / 2;
      const wing = shape(g, 'box', -0.2, 0.36, 0, 0.72, 0.12, 2.15, col);
      wing.rotation.y = 0.18;
      shape(g, 'box', -0.97, 0.42, 0, 0.44, 0.1, 0.9, light);
      shape(g, 'box', -0.9, 0.72, 0, 0.43, 0.55, 0.08, col);
      shape(g, 'sphere', 0.35, 0.63, 0, 0.48, 0.18, 0.21, navy);
      shape(g, 'box', -0.23, 0.44, 0.65, 0.24, 0.03, 0.24, palette.paper, false);
      const flame = new THREE.Group();
      flame.name = offset === 0 ? 'Flame' : 'WingFlame';
      flame.position.set(-1.4, 0.4, 0);
      g.add(flame);
      const f = shape(flame, 'cone', -0.15, 0, 0, 0.2, 0.75, 0.2, palette.yellow, false);
      f.rotation.z = Math.PI / 2;
      return g;
    };
    let parts = {};
    if (kind === 'tank') parts = addTank();
    else if (kind === 'biplane') addBiplane(rig);
    else {
      addJet(rig);
      if (formation) addJet(rig, 2.35);
    }
    const materials = [];
    root.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 1;
        materials.push(o.material);
      }
    });
    const mixer = new THREE.AnimationMixer(root),
      clips = {};
    const idle = new THREE.AnimationClip('idle', 0.8, [
      new THREE.NumberKeyframeTrack('Chassis.position[y]', [0, 0.4, 0.8], [0, 0.045, 0]),
    ]);
    clips.idle = mixer.clipAction(idle);
    clips.idle.play();
    if (kind === 'tank') {
      const recoil = new THREE.AnimationClip('recoil', 0.23, [
        new THREE.NumberKeyframeTrack('Barrel.position[x]', [0, 0.045, 0.23], [0.65, 0.41, 0.65]),
      ]);
      clips.fire = mixer.clipAction(recoil);
      clips.fire.setLoop(THREE.LoopOnce, 1);
      clips.fire.clampWhenFinished = true;
      const sway = new THREE.AnimationClip('antenna', 1.3, [
        new THREE.NumberKeyframeTrack('Antenna.rotation[z]', [0, 0.65, 1.3], [-0.08, 0.08, -0.08]),
      ]);
      mixer.clipAction(sway).play();
    } else {
      if (kind === 'biplane') {
        const prop = new THREE.AnimationClip('propeller', 0.13, [
          new THREE.NumberKeyframeTrack('Propeller.rotation[x]', [0, 0.13], [0, TAU]),
        ]);
        mixer.clipAction(prop).play();
      } else {
        const burn = new THREE.AnimationClip('jet-engine', 0.18, [
          new THREE.VectorKeyframeTrack(
            'Flame.scale',
            [0, 0.09, 0.18],
            [1, 1, 1, 1.4, 0.85, 0.85, 1, 1, 1],
          ),
        ]);
        mixer.clipAction(burn).play();
      }
      const roll = new THREE.AnimationClip('roll', 0.8, [
        new THREE.NumberKeyframeTrack(
          'Chassis.rotation[x]',
          [0, 0.2, 0.4, 0.6, 0.8],
          [0, Math.PI / 2, Math.PI, Math.PI * 1.5, TAU],
        ),
      ]);
      clips.trick = mixer.clipAction(roll);
      clips.trick.setLoop(THREE.LoopOnce, 1);
      clips.trick.clampWhenFinished = true;
    }
    const blob = shadow(this.root, 0, 0, 1.35, kind === 'tank' ? 0.8 : 1.1, 0.2),
      ring = floorRing(
        this.root,
        0,
        0,
        kind === 'tank' ? 1.1 : 1.3,
        id === 0 ? palette.orange : palette.green,
        0.75,
      );
    let trail = null;
    if (kind !== 'tank') {
      const positions = new Float32Array(90),
        geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);
      trail = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: id === 0 ? 0xffd5a4 : 0xe4f3d4,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
      this.root.add(trail);
    }
    return {
      root,
      rig,
      mixer,
      clips,
      materials,
      blob,
      ring,
      trail,
      trailPoints: [],
      lastTrail: 0,
      lastTrack: { x: Infinity, z: Infinity },
      ...parts,
    };
  }
  shotMesh(shot) {
    const g = new THREE.Group();
    shape(
      g,
      'sphere',
      0,
      0,
      0,
      0.19,
      0.17,
      0.17,
      shot.bank ? palette.yellow : shot.owner === 0 ? 0xffc590 : 0xc9eed0,
      true,
    );
    const tail = shape(g, 'box', -0.32, 0, 0, 0.48, 0.07, 0.07, palette.paper, false);
    g.position.set(shot.x, 0.72, shot.z);
    g.rotation.y = -shot.angle;
    this.root.add(g);
    shot.mesh = g;
    return g;
  }
  impact(x, z, type = 'hit', owner = 0) {
    const count = type === 'hit' ? 24 : type === 'smoke' ? 13 : 8;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        i % 3 === 0 ? geo.box : geo.sphere,
        cel(
          type === 'smoke'
            ? 0xe9e9d0
            : [
                palette.yellow,
                owner === 0 ? palette.orange : palette.mint,
                palette.paper,
                palette.ink,
              ][i % 4],
        ),
      );
      const a = i * 2.39996,
        speed = type === 'hit' ? 4 + (i % 5) : 2 + (i % 3);
      m.position.set(x, 0.8, z);
      const size = type === 'smoke' ? 0.5 : 0.08 + (i % 4) * 0.08;
      m.scale.setScalar(size);
      this.root.add(m);
      this.effects.push({
        m,
        vx: Math.cos(a) * speed,
        vz: Math.sin(a) * speed,
        vy: 1 + (i % 4) * 1.2,
        life: type === 'hit' ? 0.55 + (i % 4) * 0.1 : 1.1,
        max: 1.1,
        size,
        type,
      });
    }
    if (type === 'hit' && !this.reducedMotion) this.shake = 0.35;
    const ring = floorRing(
      this.root,
      x,
      z,
      0.5,
      type === 'scan' ? palette.yellow : palette.paper,
      0.9,
    );
    this.effects.push({ m: ring, life: 0.65, max: 0.65, size: 0.5, type: 'ring' });
    if (type === 'hit' || type === 'bank')
      this.comic(
        type === 'hit' ? ['KAPOW!', 'BONK!', 'GOTCHA!'][Math.floor(Math.random() * 3)] : 'PING!',
        x,
        z,
        type === 'hit' ? 2.4 : 1.2,
      );
  }
  comic(text, x, z, size = 2) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 180;
    const ctx = c.getContext('2d');
    ctx.font = '900 italic 102px "Barlow Condensed",sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#233635';
    ctx.fillStyle = '#f6c64a';
    ctx.strokeText(text, 256, 130);
    ctx.fillText(text, 256, 130);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(geo.plane, canvasMaterial(tex));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = 0.13;
    m.position.set(x, 3, z);
    m.scale.set(size * 2, size * 0.7, 1);
    this.root.add(m);
    this.effects.push({ m, life: 0.9, max: 0.9, size: 1, type: 'comic', tex });
  }
  sightLine(game, id = 0) {
    const e = game.entities[id];
    if (!e || !this.sight) return;
    this.sight.visible = this.mode === 'play' && !game.stage.air && game.aimGuide;
    this.reticle.visible = this.mode === 'play' && game.aimGuide && !game.stage.air;
    if (!this.sight.visible) {
      this.reticle.visible = false;
      return;
    }
    let x = e.x + Math.cos(e.aim) * 1.5,
      z = e.z + Math.sin(e.aim) * 1.5,
      dx = Math.cos(e.aim),
      dz = Math.sin(e.aim),
      bank = false,
      total = 0,
      ended = false;
    for (let i = 0; i < this.dots.length; i++) {
      const hit = game.cast(
        x,
        z,
        dx,
        dz,
        0.52,
        (c) => game.colliderTags.get(c.handle)?.kind === 'wall',
      );
      if (hit) {
        x += dx * Math.max(0, hit.timeOfImpact - 0.02);
        z += dz * Math.max(0, hit.timeOfImpact - 0.02);
        if ((!game.stage.bank && !game.stage.ghost) || bank) ended = true;
        const d = dx * hit.normal.x + dz * hit.normal.z;
        dx -= 2 * d * hit.normal.x;
        dz -= 2 * d * hit.normal.z;
        bank = true;
      } else {
        x += dx * 0.52;
        z += dz * 0.52;
      }
      const dot = this.dots[i];
      dot.position.set(x, 0.25, z);
      dot.material.color.setHex(bank ? palette.yellow : palette.paper);
      dot.visible = total < 21 && !ended;
      total += 0.52;
    }
    this.reticle.position.set(e.x + Math.cos(e.aim) * 5, 0.24, e.z + Math.sin(e.aim) * 5);
  }
  pointer(clientX, clientY) {
    const p = new THREE.Vector2((clientX / innerWidth) * 2 - 1, (-clientY / innerHeight) * 2 + 1),
      ray = new THREE.Raycaster();
    ray.setFromCamera(p, this.camera);
    const out = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7), out);
    return { x: out.x, z: out.z };
  }
  update(dt, game, localId = 0) {
    this.elapsed += dt;
    const title = this.mode === 'title',
      side = game.stage.vehicle === 'biplane';
    const portrait = innerWidth / innerHeight < 1;
    const target = new THREE.Vector3(title ? (portrait ? -4 : -10) : 0, 0, title ? -1 : 0);
    const elevation = side ? 70 : 46,
      depth = side ? 0.01 : 27;
    if (title && !this.reducedMotion) {
      target.x += Math.sin(this.elapsed * 0.12) * 0.35;
    }
    this.shake = Math.max(0, this.shake - dt);
    const shake = this.shake && !this.reducedMotion ? Math.sin(this.elapsed * 80) * this.shake : 0;
    this.camera.position.set(target.x + shake, elevation, target.z + depth + shake);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    for (const e of game.entities) {
      const v = e.visual;
      if (!v) continue;
      v.root.position.set(e.x, 0.12, e.z);
      v.root.rotation.y = -e.theta;
      if (v.turret) v.turret.rotation.y = -(e.aim - e.theta);
      const hidden = game.isHidden(e),
        local = e.id === localId && !game.sameScreen;
      const blink = e.invuln > 0 && Math.floor(e.invuln * 12) % 2 === 0;
      v.rig.visible = (!hidden || local || title) && (!blink || e.stun <= 0);
      const opacity = hidden && !title ? 0.34 : 1;
      for (const m of v.materials) m.opacity = opacity;
      v.blob.position.set(e.x + 0.3, 0.045, e.z + 0.3);
      v.blob.visible = v.rig.visible;
      v.ring.position.set(e.x, 0.12, e.z);
      v.ring.visible = (!hidden || local || title) && !game.stage.air;
      v.ring.material.opacity = hidden ? 0.27 : 0.7;
      v.mixer.update(this.reducedMotion ? dt * 0.3 : dt);
      if (title) {
        v.root.scale.setScalar(e.id === 0 ? 2.7 : 1.6);
        v.blob.scale.set(e.id === 0 ? 3.7 : 2.1, e.id === 0 ? 2.2 : 1.3, 1);
      } else v.root.scale.setScalar(1);
      if (
        !title &&
        !game.stage.air &&
        !hidden &&
        sqDist(e, v.lastTrack) > 0.35 &&
        Math.hypot(e.vx, e.vz) > 0.5
      ) {
        v.lastTrack = { x: e.x, z: e.z };
        for (const side of [-1, 1]) {
          const m = new THREE.Mesh(geo.plane, this.trackMaterial);
          m.rotation.set(-Math.PI / 2, 0, -e.theta);
          m.scale.set(0.24, 0.16, 1);
          m.position.set(
            e.x - Math.sin(e.theta) * side * 0.67,
            0.105,
            e.z + Math.cos(e.theta) * side * 0.67,
          );
          this.root.add(m);
          this.trackMarks.push(m);
        }
        while (this.trackMarks.length > 320) this.root.remove(this.trackMarks.shift());
      }
      if (v.trail) {
        v.trail.visible = !hidden || local;
        v.lastTrail += dt;
        if (v.lastTrail > 0.045) {
          v.lastTrail = 0;
          const prev = v.trailPoints.at(-1);
          if (prev && Math.hypot(prev.x - e.x, prev.z - e.z) > 10) v.trailPoints = [];
          v.trailPoints.push({
            x: e.x - Math.cos(e.theta) * 1.4,
            z: e.z - Math.sin(e.theta) * 1.4,
          });
          if (v.trailPoints.length > 30) v.trailPoints.shift();
          const attr = v.trail.geometry.attributes.position;
          for (let i = 0; i < v.trailPoints.length; i++)
            attr.setXYZ(i, v.trailPoints[i].x, 0.3, v.trailPoints[i].z);
          attr.needsUpdate = true;
          v.trail.geometry.setDrawRange(0, v.trailPoints.length);
          v.trail.geometry.computeBoundingSphere();
        }
      }
    }
    for (const s of game.shots) {
      if (!s.mesh) this.shotMesh(s);
      s.mesh.position.set(s.x, 0.72, s.z);
      s.mesh.rotation.y = -s.angle;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const p = this.effects[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.root.remove(p.m);
        if (p.tex) {
          p.tex.dispose();
          p.m.material.dispose();
        }
        this.effects.splice(i, 1);
        continue;
      }
      if (p.type === 'ring') {
        p.m.scale.setScalar(0.4 + (1 - p.life / p.max) * 5);
        p.m.material.opacity = p.life / p.max;
      } else if (p.type === 'comic') {
        p.m.position.z -= dt * 0.75;
        p.m.material.opacity = Math.min(1, p.life * 3);
      } else {
        p.m.position.x += p.vx * dt;
        p.m.position.z += p.vz * dt;
        p.m.position.y += p.vy * dt;
        p.vy -= dt * 9;
        p.m.rotation.x += dt * 2;
        p.m.rotation.z += dt * 3;
        p.m.scale.setScalar(
          p.size * (p.type === 'smoke' ? 1 + (1 - p.life / p.max) * 2 : Math.min(1, p.life * 3)),
        );
      }
    }
    this.sightLine(game, localId);
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

class FieldGame {
  constructor(view, sound) {
    this.view = view;
    this.sound = sound;
    this.tuning = { ...DEFAULTS };
    this.entities = [];
    this.shots = [];
    this.debris = [];
    this.world = null;
    this.colliderTags = new Map();
    this.stageIndex = 0;
    this.stage = STAGES[0];
    this.phase = 'idle';
    this.metrics = {
      shots: 0,
      hits: 0,
      bounces: 0,
      tricks: 0,
      wraps: 0,
      cloaked: 0,
      bankDenied: 0,
      formationShots: 0,
    };
    this.rounds = [];
    this.totals = [0, 0];
    this.history = [];
    this.onEvent = () => {};
    this.aimGuide = true;
    this.invincible = false;
    this.autoPilot = false;
    this.sameScreen = false;
    this.attract = false;
    this.practice = false;
    this.elapsed = 0;
  }
  emit(type, data = {}) {
    const event = { type, ...data };
    this.history.push(event);
    if (this.history.length > 250) this.history.shift();
    this.onEvent(event);
  }
  initStage(index, { title = false, keep = false } = {}) {
    if (this.world) this.world.free();
    this.colliderTags.clear();
    this.shots = [];
    this.entities = [];
    this.debris = [];
    this.stageIndex = ((index % 5) + 5) % 5;
    this.stage = STAGES[this.stageIndex];
    this.world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    this.world.timestep = STEP;
    this.view.build(this.stage, title);
    this.timeLeft = this.tuning.roundSeconds;
    this.elapsed = 0;
    this.phase = title ? 'idle' : 'playing';
    this.winner = null;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.1, 20).setTranslation(0, -0.25, 0));
    if (!this.stage.air) {
      for (const b of [
        [0, -12.4, 45, 0.8],
        [0, 12.4, 45, 0.8],
        [-22.4, 0, 0.8, 24],
        [22.4, 0, 0.8, 24],
        ...this.stage.blocks,
      ]) {
        const c = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(b[2] / 2, 1, b[3] / 2).setTranslation(b[0], 0.7, b[1]),
        );
        this.colliderTags.set(c.handle, { kind: 'wall', rect: b });
      }
    }
    for (let id = 0; id < 2; id++) {
      const x = id ? 16 : -16,
        z = id ? -5 : 5,
        theta = id ? Math.PI : 0;
      const rb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, 0.72, z)
          .enabledTranslations(true, false, true)
          .lockRotations()
          .setLinearDamping(4)
          .setCanSleep(false),
      );
      const e = {
        id,
        rb,
        x,
        z,
        theta,
        aim: theta,
        vx: 0,
        vz: 0,
        score: 0,
        ammo: 3,
        cooldown: 0,
        trickCooldown: 0,
        smoke: 0,
        scan: 0,
        roll: 0,
        invuln: 1.1,
        stun: 0,
        reveal: 1.6,
        trickLatch: false,
        aiClock: 0,
        aiPath: [],
        lastSeen: { x: -x, z: -z },
        stats: { shots: 0, hits: 0, banks: 0, tricks: 0 },
        visual: this.view.vehicle(this.stage.vehicle, id, this.stage.formation),
      };
      const body = this.world.createCollider(
        RAPIER.ColliderDesc.ball(this.stage.air ? 0.64 : 0.79)
          .setSensor(this.stage.air)
          .setFriction(0.1)
          .setRestitution(0)
          .setDensity(4),
        rb,
      );
      this.colliderTags.set(body.handle, { kind: 'entity', id });
      if (this.stage.formation) {
        const wing = this.world.createCollider(
          RAPIER.ColliderDesc.ball(0.64).setTranslation(0, 0, 2.35).setSensor(true).setDensity(1),
          rb,
        );
        this.colliderTags.set(wing.handle, { kind: 'entity', id, wing: true });
      }
      this.entities.push(e);
    }
    if (title) {
      this.teleport(0, 3, 3);
      this.teleport(1, 14, -5);
      this.entities[0].theta = -0.35;
      this.entities[0].aim = -0.45;
      this.entities[1].theta = 2.8;
      this.entities[1].aim = 2.8;
    }
    this.world.step();
    if (!keep) this.emit('stage', { index: this.stageIndex });
  }
  start(kind = 'solo', index = 0) {
    this.sameScreen = kind === 'local';
    this.attract = kind === 'attract';
    this.practice = kind === 'practice';
    this.rounds = [];
    this.totals = [0, 0];
    this.initStage(index);
  }
  teleport(id, x, z) {
    const e = this.entities[id];
    if (!e) return;
    e.rb.setTranslation({ x, y: 0.72, z }, true);
    e.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    e.x = x;
    e.z = z;
    e.vx = 0;
    e.vz = 0;
    this.world.propagateModifiedBodyPositionsToColliders();
  }
  cast(x, z, dx, dz, range, predicate) {
    return this.world.castRayAndGetNormal(
      new RAPIER.Ray({ x, y: 0.72, z }, { x: dx, y: 0, z: dz }),
      range,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      predicate,
    );
  }
  isHidden(e) {
    const cloud =
      this.stage.air &&
      this.view.clouds.some(
        (c) => ((e.x - c.x) / (c.r * 1.1)) ** 2 + ((e.z - c.z) / (c.r * 0.6)) ** 2 < 1,
      );
    return (this.stage.ghost && e.reveal <= 0 && e.scan <= 0) || e.smoke > 0 || cloud;
  }
  tune(key, value) {
    if (!(key in DEFAULTS)) return;
    this.tuning[key] = Number(value);
    if (key === 'roundSeconds') this.timeLeft = Number(value);
  }
  resetTuning() {
    this.tuning = { ...DEFAULTS };
    this.timeLeft = this.tuning.roundSeconds;
    this.invincible = false;
    this.autoPilot = false;
  }
  shoot(e) {
    const air = this.stage.air,
      rate = air ? (this.stage.vehicle === 'jet' ? 0.36 : 0.17) : this.tuning.reload;
    if (
      e.cooldown > 0 ||
      (!air && e.ammo < 1) ||
      this.shots.filter((s) => s.owner === e.id).length > (air ? 23 : 2)
    )
      return false;
    e.cooldown = rate;
    if (!air) e.ammo -= 1;
    e.reveal = 1.9;
    e.stats.shots++;
    this.metrics.shots++;
    const offsets = this.stage.formation
      ? [0, 2.35]
      : this.stage.vehicle === 'biplane'
        ? [-0.18, 0.18]
        : [0];
    for (const off of offsets) {
      const a = e.aim,
        x = e.x - Math.sin(e.theta) * off + Math.cos(a) * 1.7,
        z = e.z + Math.cos(e.theta) * off + Math.sin(a) * 1.7;
      const s = {
        id: (this.shotId = (this.shotId || 0) + 1),
        owner: e.id,
        x,
        z,
        angle: a,
        life: air ? 2.7 : 3.3,
        bank: 0,
        age: 0,
        mesh: null,
        speed: this.tuning.shellSpeed * (this.stage.vehicle === 'jet' ? 1.5 : air ? 1.12 : 1),
      };
      this.shots.push(s);
      this.view.shotMesh(s);
    }
    if (this.stage.formation) this.metrics.formationShots += offsets.length;
    e.visual.clips.fire?.reset().play();
    this.emit('fire', { id: e.id, air });
    return true;
  }
  trick(e) {
    if (e.trickCooldown > 0 || e.stun > 0) return false;
    e.trickCooldown = this.stage.ghost ? 5 : 6;
    e.stats.tricks++;
    this.metrics.tricks++;
    if (this.stage.ghost) {
      this.entities[1 - e.id].scan = 4.5;
      this.view.impact(e.x, e.z, 'scan', e.id);
    } else if (this.stage.air) {
      e.roll = 0.85;
      e.invuln = Math.max(e.invuln, 0.85);
      e.visual.clips.trick?.reset().play();
      this.view.impact(e.x, e.z, 'trick', e.id);
    } else {
      e.smoke = 2.5;
      this.view.impact(e.x, e.z, 'smoke', e.id);
    }
    this.emit('trick', { id: e.id, kind: this.stage.trick });
    return true;
  }
  hurt(victim, owner, shot) {
    if (
      victim.invuln > 0 ||
      victim.stun > 0 ||
      (this.invincible && victim.id === 0) ||
      owner === victim.id
    )
      return false;
    if (this.stage.bank && !shot.bank) {
      this.metrics.bankDenied++;
      this.view.comic('BANK IT!', victim.x, victim.z, 1.8);
      this.emit('deny', { id: owner });
      return false;
    }
    const attacker = this.entities[owner];
    attacker.score++;
    attacker.stats.hits++;
    if (shot.bank) attacker.stats.banks++;
    this.metrics.hits++;
    this.view.impact(victim.x, victim.z, 'hit', owner);
    this.addDebris(victim.x, victim.z, owner);
    victim.stun = 0.75;
    victim.invuln = 2.1;
    victim.respawn = true;
    victim.reveal = 2.2;
    victim.smoke = 0;
    victim.roll = 0;
    victim.rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.emit('hit', { owner, victim: victim.id, bank: shot.bank, score: attacker.score });
    if (attacker.score >= this.tuning.target && !this.practice && !this.attract) this.finish();
    return true;
  }
  addDebris(x, z, owner) {
    for (let i = 0; i < 7; i++) {
      const rb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, 0.8, z)
          .setLinearDamping(1)
          .setAngularDamping(0.4),
      );
      const c = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.1, 0.1, 0.13).setRestitution(0.4).setDensity(0.1),
        rb,
      );
      this.colliderTags.set(c.handle, { kind: 'debris' });
      const a = i * 2.4;
      rb.setLinvel({ x: Math.cos(a) * 4, y: 3 + (i % 3), z: Math.sin(a) * 4 }, true);
      rb.setAngvel({ x: 4, y: 7, z: 2 }, true);
      const m = shape(
        this.view.root,
        'box',
        x,
        0.8,
        z,
        0.2,
        0.2,
        0.27,
        owner === 0 ? palette.orange : palette.mint,
        true,
      );
      this.debris.push({ rb, c, m, life: 2 });
    }
  }
  finish() {
    if (this.phase !== 'playing') return;
    this.phase = 'done';
    const [a, b] = this.entities.map((e) => e.score);
    this.winner = a === b ? -1 : a > b ? 0 : 1;
    this.totals[0] += a;
    this.totals[1] += b;
    this.rounds.push({
      stage: this.stageIndex,
      winner: this.winner,
      score: [a, b],
      stats: this.entities.map((e) => ({ ...e.stats })),
    });
    this.emit('roundEnd', { winner: this.winner, stage: this.stageIndex });
  }
  advance() {
    this.initStage((this.stageIndex + 1) % 5);
  }
  blocked(x, z) {
    return (
      Math.abs(x) > 21 ||
      Math.abs(z) > 11 ||
      this.stage.blocks.some(
        (b) => Math.abs(x - b[0]) < b[2] / 2 + 1 && Math.abs(z - b[1]) < b[3] / 2 + 1,
      )
    );
  }
  pathTo(start, end) {
    const cell = 2,
      cols = 21,
      rows = 11,
      toCell = (p) => ({
        x: clamp(Math.round((p.x + 20) / cell), 0, cols - 1),
        z: clamp(Math.round((p.z + 10) / cell), 0, rows - 1),
      }),
      s = toCell(start),
      t = toCell(end),
      key = (p) => p.z * cols + p.x;
    const open = [{ ...s, g: 0, f: 0 }],
      came = new Map(),
      cost = new Map([[key(s), 0]]),
      closed = new Set();
    let found = null;
    for (let iter = 0; open.length && iter < 240; iter++) {
      open.sort((a, b) => a.f - b.f);
      const n = open.shift(),
        k = key(n);
      if (closed.has(k)) continue;
      closed.add(k);
      if (Math.abs(n.x - t.x) + Math.abs(n.z - t.z) <= 1) {
        found = n;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const nx = n.x + dx,
          nz = n.z + dz;
        if (
          nx < 0 ||
          nx >= cols ||
          nz < 0 ||
          nz >= rows ||
          this.blocked(nx * cell - 20, nz * cell - 10)
        )
          continue;
        if (
          dx &&
          dz &&
          (this.blocked((n.x + dx) * cell - 20, n.z * cell - 10) ||
            this.blocked(n.x * cell - 20, (n.z + dz) * cell - 10))
        )
          continue;
        const next = { x: nx, z: nz },
          nk = key(next),
          g = n.g + (dx && dz ? 1.42 : 1);
        if (g >= (cost.get(nk) ?? Infinity)) continue;
        cost.set(nk, g);
        came.set(nk, n);
        open.push({ ...next, g, f: g + Math.hypot(nx - t.x, nz - t.z) });
      }
    }
    if (!found) return [];
    const path = [];
    let n = found;
    while (key(n) !== key(s)) {
      path.unshift({ x: n.x * cell - 20, z: n.z * cell - 10 });
      n = came.get(key(n));
      if (!n) break;
    }
    return path;
  }
  bankAim(e, target) {
    const candidates = [
      { x: 44 - target.x, z: target.z },
      { x: -44 - target.x, z: target.z },
      { x: target.x, z: 24 - target.z },
      { x: target.x, z: -24 - target.z },
    ];
    for (const b of this.stage.blocks) {
      const [x, z, w, d] = b;
      candidates.push(
        { x: 2 * (x - w / 2) - target.x, z: target.z },
        { x: 2 * (x + w / 2) - target.x, z: target.z },
        { x: target.x, z: 2 * (z - d / 2) - target.z },
        { x: target.x, z: 2 * (z + d / 2) - target.z },
      );
    }
    let best = null;
    for (const p of candidates) {
      let dx = p.x - e.x,
        dz = p.z - e.z,
        len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      const hit = this.cast(
        e.x + dx * 1.7,
        e.z + dz * 1.7,
        dx,
        dz,
        50,
        (c) => this.colliderTags.get(c.handle)?.kind === 'wall',
      );
      if (!hit) continue;
      const hx = e.x + dx * (1.7 + hit.timeOfImpact),
        hz = e.z + dz * (1.7 + hit.timeOfImpact),
        dot = dx * hit.normal.x + dz * hit.normal.z,
        rx = dx - 2 * dot * hit.normal.x,
        rz = dz - 2 * dot * hit.normal.z;
      const tx = target.x - hx,
        tz = target.z - hz,
        along = tx * rx + tz * rz,
        perp = Math.abs(tx * rz - tz * rx);
      if (along < 0 || perp > 0.65 || along + hit.timeOfImpact > this.tuning.shellSpeed * 3.1)
        continue;
      const obstruction = this.cast(
        hx + rx * 0.06,
        hz + rz * 0.06,
        rx,
        rz,
        Math.max(0, along - 0.7),
        (c) => this.colliderTags.get(c.handle)?.kind === 'wall',
      );
      if (!obstruction && (!best || along + hit.timeOfImpact < best.length))
        best = { aim: Math.atan2(dz, dx), length: along + hit.timeOfImpact };
    }
    return best;
  }
  ai(e, dt) {
    const other = this.entities[1 - e.id],
      skill = this.attract || (this.autoPilot && e.id === 0) ? 0.92 : this.tuning.ai;
    const hidden = this.isHidden(other);
    if (!hidden) e.lastSeen = { x: other.x, z: other.z };
    const target = hidden
      ? e.lastSeen
      : { x: other.x + other.vx * 0.2 * skill, z: other.z + other.vz * 0.2 * skill };
    let dx = target.x - e.x,
      dz = target.z - e.z;
    if (this.stage.air) {
      if (dx > 22) dx -= 45.4;
      if (dx < -22) dx += 45.4;
      if (dz > 12) dz -= 25.4;
      if (dz < -12) dz += 25.4;
    }
    const dist = Math.hypot(dx, dz);
    let aim = Math.atan2(dz, dx),
      mx = 0,
      mz = 0,
      fire = false;
    const bank = this.stage.bank ? this.bankAim(e, target) : null;
    if (bank) aim = bank.aim;
    e.aiClock -= dt;
    if (this.stage.air) {
      let goal = aim;
      if (dist < 3) goal += e.id ? -0.35 : 0.35;
      const throttle = e.id === 0 ? 1 : 0.72 + 0.12 * Math.sin(this.elapsed * 0.65);
      mx = Math.cos(goal) * throttle;
      mz = Math.sin(goal) * throttle;
      fire = Math.abs(angleDelta(e.theta, aim)) < 0.45 + skill * 0.3 && !hidden;
    } else {
      if (e.aiClock <= 0) {
        e.aiClock = 0.35;
        e.aiPath = this.pathTo(e, target);
      }
      const wall = this.cast(
        e.x,
        e.z,
        Math.cos(aim),
        Math.sin(aim),
        dist,
        (c) => this.colliderTags.get(c.handle)?.kind === 'wall',
      );
      fire = (this.stage.bank ? !!bank : !wall) && !hidden;
      if (dist > 9 || (wall && !bank)) {
        while (e.aiPath.length && sqDist(e, e.aiPath[0]) < 1.2) e.aiPath.shift();
        const p = e.aiPath[0] || target;
        const d = Math.hypot(p.x - e.x, p.z - e.z) || 1;
        mx = (p.x - e.x) / d;
        mz = (p.z - e.z) / d;
      } else if (!bank) {
        mx = -Math.sin(aim) * 0.7;
        mz = Math.cos(aim) * 0.7;
        if (this.blocked(e.x + mx * 2, e.z + mz * 2)) {
          mx = -mx;
          mz = -mz;
        }
      }
      for (const s of this.shots) {
        if (s.owner === e.id || sqDist(e, s) > 25) continue;
        const dxs = e.x - s.x,
          dzs = e.z - s.z,
          along = dxs * Math.cos(s.angle) + dzs * Math.sin(s.angle),
          cross = dxs * Math.sin(s.angle) - dzs * Math.cos(s.angle);
        if (along > 0 && Math.abs(cross) < 1.4) {
          mx = -Math.sin(s.angle) * (cross > 0 ? -1 : 1);
          mz = Math.cos(s.angle) * (cross > 0 ? -1 : 1);
        }
      }
    }
    aim += Math.sin(this.elapsed * 1.7 + e.id * 3) * (0.16 * (1 - skill));
    if (!this.stage.bank) aim = turnTo(e.aim, aim, dt * (1.8 + skill * 2.5));
    const threat = this.shots.some((s) => s.owner !== e.id && sqDist(s, e) < 13);
    return {
      mx,
      mz,
      aim,
      fire: fire && this.elapsed % (1.7 - skill) > 0.16 * (1 - skill),
      trick: e.trickCooldown <= 0 && ((this.stage.ghost && hidden) || threat),
    };
  }
  tick(dt, inputs = {}) {
    if (this.phase !== 'playing') return;
    this.elapsed += dt;
    if (!this.practice && !this.attract) this.timeLeft = Math.max(0, this.timeLeft - dt);
    for (const e of this.entities) {
      const input = inputs[e.id] || this.ai(e, dt);
      e.input = input;
      for (const key of ['cooldown', 'trickCooldown', 'smoke', 'scan', 'roll', 'invuln', 'reveal'])
        e[key] = Math.max(0, e[key] - dt);
      if (this.isHidden(e)) this.metrics.cloaked++;
      if (e.stun > 0) {
        e.stun = Math.max(0, e.stun - dt);
        if (e.stun === 0 && e.respawn) {
          const spots = e.id
            ? [
                [16, -5],
                [17, 8],
                [-17, -8],
                [-16, 5],
              ]
            : [
                [-16, 5],
                [-17, -8],
                [17, 8],
                [16, -5],
              ];
          const other = this.entities[1 - e.id];
          spots.sort(
            (a, b) =>
              (b[0] - other.x) ** 2 +
              (b[1] - other.z) ** 2 -
              ((a[0] - other.x) ** 2 + (a[1] - other.z) ** 2),
          );
          this.teleport(e.id, ...spots[0]);
          e.respawn = false;
        }
        continue;
      }
      const mx = clamp(Number(input.mx) || 0, -1, 1),
        mz = clamp(Number(input.mz) || 0, -1, 1),
        mag = Math.min(1, Math.hypot(mx, mz));
      if (Number.isFinite(input.aim)) e.aim = input.aim;
      else if (mag > 0.18) e.aim = Math.atan2(mz, mx);
      let vx = 0,
        vz = 0;
      if (this.stage.air) {
        const desired = mag > 0.18 ? Math.atan2(mz, mx) : e.aim;
        e.theta = turnTo(e.theta, desired, dt * (this.stage.vehicle === 'jet' ? 2.5 : 2.05));
        e.aim = e.theta;
        const speed =
          this.tuning.speed *
          (this.stage.vehicle === 'jet' ? 1.5 : 1.03) *
          (0.78 + mag * 0.3) *
          (e.roll > 0 ? 1.7 : 1);
        vx = Math.cos(e.theta) * speed;
        vz = Math.sin(e.theta) * speed;
      } else {
        if (mag > 0.12) e.theta = turnTo(e.theta, Math.atan2(mz, mx), dt * 7);
        const speed = this.tuning.speed;
        const len = Math.max(1, Math.hypot(mx, mz));
        vx = (mx / len) * speed;
        vz = (mz / len) * speed;
      }
      const old = e.rb.linvel(),
        blend = Math.min(1, dt * 12);
      e.rb.setLinvel(
        { x: old.x + (vx - old.x) * blend, y: 0, z: old.z + (vz - old.z) * blend },
        true,
      );
      e.rb.setRotation({ x: 0, y: Math.sin(-e.theta / 2), z: 0, w: Math.cos(-e.theta / 2) }, true);
      e.ammo = Math.min(3, e.ammo + (dt / this.tuning.reload) * 0.65);
      if (input.fire) this.shoot(e);
      if (input.trick && !e.trickLatch) this.trick(e);
      e.trickLatch = !!input.trick;
    }
    this.world.step();
    for (const e of this.entities) {
      const p = e.rb.translation(),
        v = e.rb.linvel();
      e.x = p.x;
      e.z = p.z;
      e.vx = v.x;
      e.vz = v.z;
      if (this.stage.air) {
        let x = e.x,
          z = e.z,
          wrapped = false;
        if (x > 22.7) {
          x = -22.6;
          wrapped = true;
        }
        if (x < -22.7) {
          x = 22.6;
          wrapped = true;
        }
        if (z > 12.7) {
          z = -12.6;
          wrapped = true;
        }
        if (z < -12.7) {
          z = 12.6;
          wrapped = true;
        }
        if (wrapped) {
          e.rb.setTranslation({ x, y: 0.72, z }, true);
          e.x = x;
          e.z = z;
          this.metrics.wraps++;
          this.emit('wrap', { id: e.id });
        }
      } else if (
        e.input &&
        Math.hypot(e.input.mx || 0, e.input.mz || 0) > 0.5 &&
        Math.hypot(v.x, v.z) < 1
      ) {
        e.reveal = 0.7;
      }
    }
    this.world.propagateModifiedBodyPositionsToColliders();
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.age += dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.removeShot(i);
        continue;
      }
      if (this.stage.guided && !s.bank && this.entities[s.owner].input?.fire)
        s.angle = turnTo(s.angle, this.entities[s.owner].aim, dt * (this.stage.air ? 1.1 : 0.9));
      let remaining = s.speed * dt,
        dead = false;
      for (let n = 0; n < 3 && remaining > 0.001; n++) {
        const dx = Math.cos(s.angle),
          dz = Math.sin(s.angle),
          hit = this.cast(s.x, s.z, dx, dz, remaining, (c) => {
            const tag = this.colliderTags.get(c.handle);
            return (
              tag?.kind === 'wall' ||
              (tag?.kind === 'entity' &&
                tag.id !== s.owner &&
                this.entities[tag.id].invuln <= 0 &&
                this.entities[tag.id].stun <= 0)
            );
          });
        if (!hit) {
          s.x += dx * remaining;
          s.z += dz * remaining;
          remaining = 0;
          break;
        }
        const travel = Math.max(0, hit.timeOfImpact - 0.015);
        s.x += dx * travel;
        s.z += dz * travel;
        remaining -= Math.max(hit.timeOfImpact, 0.01);
        const tag = this.colliderTags.get(hit.collider.handle);
        if (tag?.kind === 'entity') {
          this.hurt(this.entities[tag.id], s.owner, s);
          dead = true;
          break;
        }
        if (tag?.kind === 'wall') {
          if (!this.stage.bank && !this.stage.ghost) {
            this.view.impact(s.x, s.z, 'spark', s.owner);
            dead = true;
            break;
          }
          const d = dx * hit.normal.x + dz * hit.normal.z,
            rx = dx - 2 * d * hit.normal.x,
            rz = dz - 2 * d * hit.normal.z;
          s.angle = Math.atan2(rz, rx);
          s.x += rx * 0.05;
          s.z += rz * 0.05;
          s.bank++;
          this.metrics.bounces++;
          this.view.impact(s.x, s.z, 'bank', s.owner);
          this.emit('bounce', { id: s.owner });
          if (s.mesh) {
            s.mesh.children[0].material = cel(palette.yellow);
          }
          if (s.bank > 4) {
            dead = true;
            break;
          }
        }
      }
      if (this.stage.air) {
        if (s.x > 23) s.x = -23;
        if (s.x < -23) s.x = 23;
        if (s.z > 13) s.z = -13;
        if (s.z < -13) s.z = 13;
      }
      if (dead) this.removeShot(i);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.view.root.remove(d.m);
        this.colliderTags.delete(d.c.handle);
        this.world.removeRigidBody(d.rb);
        this.debris.splice(i, 1);
      } else {
        const p = d.rb.translation(),
          q = d.rb.rotation();
        d.m.position.set(p.x, p.y, p.z);
        d.m.quaternion.set(q.x, q.y, q.z, q.w);
      }
    }
    if (this.timeLeft <= 0 && !this.practice && !this.attract) this.finish();
  }
  removeShot(i) {
    const s = this.shots[i];
    if (s?.mesh) this.view.root.remove(s.mesh);
    this.shots.splice(i, 1);
  }
  snapshot(state = 'playing') {
    return {
      type: 'world',
      seq: ++this.snapSeq || (this.snapSeq = 1),
      stage: this.stageIndex,
      state,
      phase: this.phase,
      winner: this.winner,
      time: this.timeLeft,
      elapsed: this.elapsed,
      totals: this.totals,
      rounds: this.rounds.map((r) => ({ stage: r.stage, winner: r.winner, score: r.score })),
      entities: this.entities.map((e) => ({
        id: e.id,
        x: e.x,
        z: e.z,
        theta: e.theta,
        aim: e.aim,
        score: e.score,
        ammo: e.ammo,
        stun: e.stun,
        invuln: e.invuln,
        reveal: e.reveal,
        scan: e.scan,
        smoke: e.smoke,
        roll: e.roll,
        trickCooldown: e.trickCooldown,
        vx: e.vx,
        vz: e.vz,
        stats: { ...e.stats },
      })),
      shots: this.shots.map((s) => ({
        id: s.id,
        owner: s.owner,
        x: s.x,
        z: s.z,
        angle: s.angle,
        bank: s.bank,
        life: s.life,
      })),
      metrics: this.metrics,
    };
  }
  applySnapshot(data) {
    if (data.stage !== this.stageIndex || this.entities.length !== 2)
      this.initStage(data.stage, { keep: true });
    this.phase = data.phase;
    this.winner = data.winner;
    this.timeLeft = data.time;
    this.elapsed = data.elapsed;
    this.totals = data.totals;
    this.rounds = data.rounds;
    this.metrics = data.metrics;
    for (const src of data.entities) {
      const e = this.entities[src.id];
      if (!e) continue;
      if (src.score > e.score) {
        const v = this.entities[1 - src.id];
        this.view.impact(v.x, v.z, 'hit', src.id);
        this.emit('remoteHit', { owner: src.id });
      }
      if (src.roll > 0 && e.roll <= 0) e.visual.clips.trick?.reset().play();
      Object.assign(e, src);
      e.rb.setTranslation({ x: e.x, y: 0.72, z: e.z }, true);
    }
    const previous = new Map(this.shots.map((s) => [s.id, s])),
      next = [];
    for (const src of data.shots) {
      const existing = previous.get(src.id);
      if (existing) {
        Object.assign(existing, src);
        next.push(existing);
        previous.delete(src.id);
      } else {
        const s = { ...src, age: 0 };
        this.view.shotMesh(s);
        next.push(s);
        this.emit('remoteFire', { id: s.owner, air: this.stage.air });
      }
    }
    for (const s of previous.values()) this.view.root.remove(s.mesh);
    this.shots = next;
    this.world.propagateModifiedBodyPositionsToColliders();
  }
}
