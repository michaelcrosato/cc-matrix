import * as THREE from "three/webgpu";
import { color, normalWorld, vec3, dot, floor, max } from "three/tsl";

export { THREE };
export const INK = 0x172b2a;
export const C = {
  yellow: 0xffd05b,
  cream: 0xfff1ce,
  teal: 0x337e77,
  glass: 0x173e46,
  red: 0xc34c41,
  pink: 0xdc7459,
  sand: 0xd39b60,
  ink: INK,
};
const geom = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ball: new THREE.SphereGeometry(1, 12, 8),
  low: new THREE.IcosahedronGeometry(1, 0),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
};
const materials = new Map();
export function mat(hex, flat = false, opacity = 1) {
  const key = `${hex}/${flat}/${opacity}`;
  if (materials.has(key)) return materials.get(key);
  const m = new THREE.MeshBasicNodeMaterial({
    color: hex,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });
  if (!flat) {
    const n = max(dot(normalWorld, vec3(-0.48, 0.8, 0.5).normalize()), 0);
    const band = floor(n.mul(3.99)).div(3).mul(0.46).add(0.54);
    m.colorNode = color(hex).mul(band);
  }
  materials.set(key, m);
  return m;
}
const outline = new THREE.MeshBasicNodeMaterial({ color: INK, side: THREE.BackSide });
export function part(
  parent,
  shape,
  hex,
  pos = [0, 0, 0],
  scale = [1, 1, 1],
  ink = true,
  flat = false,
) {
  const mesh = new THREE.Mesh(geom[shape] || shape, mat(hex, flat));
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  parent.add(mesh);
  if (ink) {
    const edge = new THREE.Mesh(mesh.geometry, outline);
    edge.scale.set(1.065, 1.075, 1.09);
    mesh.add(edge);
  }
  return mesh;
}
export function helicopter(hex = C.yellow, ghost = false) {
  const g = new THREE.Group();
  const hull = new THREE.Group();
  g.add(hull);
  g.userData.hull = hull;
  part(hull, "ball", hex, [0, 0, 0], [1.65, 0.77, 0.73]);
  part(hull, "ball", C.glass, [0.85, 0.14, 0.22], [0.87, 0.59, 0.66]);
  part(hull, "box", C.cream, [0.27, -0.13, 0.73], [2.17, 0.16, 0.04], false, true);
  part(hull, "box", C.cream, [-0.36, 0.1, 0.72], [0.12, 0.91, 0.04], false, true);
  part(hull, "box", C.ink, [0.16, -0.38, 0.84], [0.8, 0.18, 0.16]);
  part(hull, "box", hex, [-2.02, 0.28, 0], [2.1, 0.28, 0.28]);
  const fin = part(hull, "box", hex, [-2.99, 0.72, 0], [0.43, 1.33, 0.19]);
  fin.rotation.z = -0.25;
  part(hull, "box", C.cream, [-2.99, 1, 0.115], [0.45, 0.22, 0.05], false, true);
  part(hull, "ball", C.ink, [-0.38, 0.73, 0], [0.73, 0.28, 0.49]);
  for (let i = 0; i < 4; i++)
    part(hull, "box", C.cream, [-0.78 + i * 0.25, 0.8, 0.42], [0.1, 0.12, 0.08], false, true);
  part(hull, "cylinder", C.ink, [-0.2, 1.02, 0], [0.08, 0.65, 0.08]);
  const rotor = new THREE.Group();
  rotor.name = "MainRotor";
  rotor.position.set(-0.2, 1.36, 0);
  hull.add(rotor);
  for (let i = 0; i < 2; i++) {
    const b = part(rotor, "box", C.ink, [0, 0, 0], [6.2, 0.065, 0.16], false, true);
    b.rotation.y = (i * Math.PI) / 2;
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const tip = part(
      rotor,
      "box",
      C.cream,
      [Math.cos(a) * 2.8, 0, Math.sin(a) * 2.8],
      [0.47, 0.075, 0.17],
      false,
      true,
    );
    tip.rotation.y = -a;
  }
  part(rotor, "ball", C.ink, [0, 0, 0], [0.18, 0.12, 0.18], false);
  const tail = new THREE.Group();
  tail.name = "TailRotor";
  tail.position.set(-3.07, 0.69, 0.29);
  hull.add(tail);
  part(tail, "box", C.cream, [0, 0, 0], [0.12, 1.14, 0.08]);
  part(tail, "box", C.cream, [0, 0, 0], [1.14, 0.12, 0.08]);
  for (const z of [-0.6, 0.6]) {
    part(hull, "box", C.ink, [0, -0.98, z], [3.3, 0.12, 0.11]);
    for (const x of [-0.8, 0.9]) {
      const s = part(hull, "box", C.ink, [x, -0.74, z], [0.1, 0.5, 0.1], false);
      s.rotation.z = -0.2;
    }
  }
  part(hull, "box", C.ink, [1.75, -0.42, 0.22], [1.1, 0.16, 0.18]);
  part(hull, "ball", C.red, [-2.9, 1.47, 0], [0.12, 0.12, 0.12], false, true);
  const mixer = new THREE.AnimationMixer(hull);
  const clip = new THREE.AnimationClip("Rotor patrol", 0.19, [
    new THREE.NumberKeyframeTrack("MainRotor.rotation[y]", [0, 0.19], [0, Math.PI * 2]),
    new THREE.NumberKeyframeTrack("TailRotor.rotation[z]", [0, 0.19], [0, -Math.PI * 4]),
  ]);
  mixer.clipAction(clip).play();
  g.userData.mixer = mixer;
  if (ghost) {
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.38;
        o.material.depthWrite = false;
      }
    });
  }
  return g;
}
export function jet() {
  const g = new THREE.Group();
  part(g, "ball", C.red, [0, 0, 0], [2.1, 0.4, 0.47]);
  part(g, "ball", C.glass, [0.35, 0.32, 0.1], [0.7, 0.28, 0.39]);
  const wing = part(g, "box", C.cream, [-0.3, -0.05, 0], [1, 0.1, 3.8]);
  wing.rotation.y = -0.3;
  const fin = part(g, "box", C.red, [-1.5, 0.4, 0], [0.6, 0.9, 0.12]);
  fin.rotation.z = -0.35;
  part(g, "ball", C.yellow, [-2.06, -0.02, 0], [0.7, 0.19, 0.21], false, true);
  return g;
}
export function turret() {
  const g = new THREE.Group();
  part(g, "box", C.ink, [0, -0.2, 0], [3.5, 0.6, 2]);
  part(g, "ball", C.red, [0, 0.3, 0], [1.2, 0.8, 0.9]);
  const b = part(g, "box", C.ink, [0.8, 1, 0], [2, 0.24, 0.25]);
  b.rotation.z = 0.6;
  part(g, "box", C.cream, [0, 0.36, 0.9], [0.5, 0.3, 0.03], false, true);
  return g;
}
export function boss() {
  const g = new THREE.Group();
  part(g, "ball", C.red, [0, 0, 0], [5.2, 1.5, 1.2]);
  part(g, "box", C.ink, [0, -0.75, 0], [8.2, 0.6, 1.4]);
  part(g, "ball", C.glass, [-3.4, 0.35, 0.35], [1.4, 0.8, 0.95]);
  for (const x of [-2.3, 2.3]) {
    part(g, "box", C.sand, [x, 0.7, 0], [1.7, 1.4, 1.3]);
    const r = new THREE.Group();
    r.name = x < 0 ? "RotorL" : "RotorR";
    r.position.set(x, 1.8, 0);
    g.add(r);
    part(r, "box", C.ink, [0, 0, 0], [5.4, 0.12, 0.24], false);
    part(r, "box", C.ink, [0, 0, 0], [0.24, 0.12, 5.4], false);
    for (const z of [-1, 1]) part(g, "box", C.yellow, [x, -1.4, z], [1.3, 0.5, 0.5]);
  }
  part(g, "box", C.cream, [0, 0.15, 1.22], [2.1, 0.25, 0.05], false, true);
  part(g, "ball", C.yellow, [0, -1, 1.4], [0.65, 0.48, 0.22], true, true);
  const mix = new THREE.AnimationMixer(g);
  mix
    .clipAction(
      new THREE.AnimationClip("Counter rotors", 0.25, [
        new THREE.NumberKeyframeTrack("RotorL.rotation[y]", [0, 0.25], [0, Math.PI * 2]),
        new THREE.NumberKeyframeTrack("RotorR.rotation[y]", [0, 0.25], [0, -Math.PI * 2]),
      ]),
    )
    .play();
  g.userData.mixer = mix;
  return g;
}
export function truck(hex = C.teal) {
  const g = new THREE.Group();
  part(g, "box", C.ink, [0, 0.35, 0], [4.8, 0.35, 1.6]);
  part(g, "box", hex, [-0.8, 1.3, 0], [3, 1.9, 1.7]);
  part(g, "box", C.cream, [1.55, 0.94, 0], [1.55, 1.5, 1.65]);
  part(g, "box", C.glass, [1.7, 1.34, 0.85], [0.95, 0.55, 0.04], false);
  part(g, "box", hex, [-0.8, 1.3, 0.88], [3, 0.15, 0.05], false);
  part(g, "box", C.yellow, [2.35, 0.8, 0.6], [0.13, 0.28, 0.35], false, true);
  for (const x of [-1.45, 1.35])
    for (const z of [-0.86, 0.86]) {
      const w = part(g, "cylinder", C.ink, [x, 0.13, z], [0.54, 0.3, 0.54]);
      w.rotation.x = Math.PI / 2;
      const hub = part(g, "cylinder", C.sand, [x, 0.13, z * 1.03], [0.25, 0.32, 0.25], false);
      hub.rotation.x = Math.PI / 2;
    }
  return g;
}
export function crew() {
  const g = new THREE.Group();
  part(g, "box", C.cream, [0, 0.62, 0], [0.45, 0.67, 0.35]);
  part(g, "ball", C.yellow, [0, 1.22, 0], [0.31, 0.31, 0.31]);
  for (const x of [-0.17, 0.17]) part(g, "box", C.ink, [x, 0.13, 0], [0.17, 0.55, 0.21]);
  const arm = new THREE.Group();
  arm.name = "Wave";
  arm.position.set(0.25, 0.9, 0);
  g.add(arm);
  part(arm, "box", C.cream, [0.22, 0.18, 0], [0.6, 0.16, 0.2]);
  const mix = new THREE.AnimationMixer(g);
  mix
    .clipAction(
      new THREE.AnimationClip("Signal", 0.7, [
        new THREE.NumberKeyframeTrack("Wave.rotation[z]", [0, 0.35, 0.7], [0.3, 1.3, 0.3]),
      ]),
    )
    .play();
  g.userData.mixer = mix;
  return g;
}
function seeded(n) {
  return () => {
    n |= 0;
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Graphics {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xe6ab7f, 115, 240);
    this.camera = new THREE.OrthographicCamera(-36, 36, 20, -20, 0.1, 500);
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.installRecovery();
    this.renderer.setClearColor(0xf0bf8e, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.actors = new THREE.Group();
    this.scene.add(this.actors);
    this.effects = [];
    this.cameraX = 0;
    this.cameraY = 12;
    this.shake = 0;
    this.mixers = [];
    this.buildWorld();
    this.titleHeli = helicopter();
    this.scene.add(this.titleHeli);
    this.titleHeli.scale.setScalar(2.5);
    this.titleConvoy = new THREE.Group();
    this.scene.add(this.titleConvoy);
    for (let i = 0; i < 3; i++) {
      const t = truck(i === 1 ? 0xb2945f : C.teal);
      t.position.set(15 - i * 8, 0.65, 0);
      this.titleConvoy.add(t);
    }
    this.cursor = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.49, 20), mat(C.cream, true));
    this.cursor.add(ring);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const dash = part(
        this.cursor,
        "box",
        C.cream,
        [Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0],
        [0.28, 0.06, 0.02],
        false,
        true,
      );
      dash.rotation.z = a;
    }
    this.cursor.position.z = 3;
    this.scene.add(this.cursor);
    this.cursor.visible = false;
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64), mat(0xffe4a5, true));
    this.sun.position.set(24, 14, -130);
    this.scene.add(this.sun);
    this.resize();
  }
  installRecovery() {
    this.renderer.onDeviceLost = (info) => {
      if (this.recovering) return;
      this.lastDeviceLoss = info.message;
      this.restorePromise = this.restoreDisplay();
    };
  }
  async restoreDisplay() {
    this.recovering = true;
    const old = this.renderer,
      canvas = old.domElement.cloneNode(false);
    old.domElement.replaceWith(canvas);
    this.renderer = new THREE.WebGPURenderer({
      canvas,
      alpha: true,
      antialias: true,
      forceWebGL: true,
    });
    this.renderer.setClearColor(0xf0bf8e, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.onDeviceLost = () => {
      document.getElementById("error").hidden = false;
      document.getElementById("error-text").textContent =
        "The browser lost its graphics display. Reload to get back in the sky.";
    };
    try {
      await this.renderer.init();
      this.backend = "WebGL 2 compatibility";
      this.resize();
      await this.renderer.compileAsync(this.scene, this.camera);
      old.dispose();
      this.recovering = false;
    } catch (error) {
      document.getElementById("error").hidden = false;
      document.getElementById("error-text").textContent = String(error.message || error);
    }
  }
  async init() {
    await this.renderer.init();
    this.backend = this.renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL 2 compatibility";
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.restorePromise) await this.restorePromise;
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.aspect = w / h;
    const hh = w / h < 1.1 ? 25 : 21;
    this.viewHeight = hh * 2;
    this.camera.left = (-hh * w) / h;
    this.camera.right = (hh * w) / h;
    this.camera.top = hh;
    this.camera.bottom = -hh;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  buildWorld() {
    const rand = seeded(1982);
    const world = new THREE.Group();
    this.scene.add(world);
    const horizon = new THREE.Mesh(new THREE.PlaneGeometry(1800, 60), mat(0xc6956d, true));
    horizon.position.set(0, -39, -190);
    world.add(horizon);
    part(world, "box", 0xb97e50, [0, -3, -35], [1600, 5, 125], false);
    part(world, "box", 0xe3af6e, [0, -0.48, 5], [1600, 0.3, 12], false);
    part(world, "box", 0xb98254, [0, -0.32, 1], [1600, 0.08, 5.2], false);
    for (let x = -650; x < 700; x += 9)
      part(world, "box", 0xf1cd91, [x, -0.26, 1], [3, 0.02, 0.12], false, true);
    for (let layer = 0; layer < 3; layer++)
      for (let x = -800; x < 850; x += 26 + rand() * 25) {
        const h = 4 + rand() * (12 - layer * 3),
          w = 10 + rand() * 17,
          z = -48 - layer * 42;
        const col = [0xb77b69, 0xc48e78, 0xdca58a][layer];
        const mesa = new THREE.Mesh(
          new THREE.CylinderGeometry(w * 0.65, w, h, 5 + Math.floor(rand() * 2), 1),
          mat(col),
        );
        mesa.position.set(x, h * 0.5 - 2, z);
        mesa.rotation.y = rand();
        world.add(mesa);
        if (layer === 0) {
          const band = part(
            world,
            "box",
            0xd69771,
            [x, h * 0.48, z + w * 0.35],
            [w * 0.9, 0.55, 2],
            false,
          );
          band.rotation.y = rand() * 0.25;
        }
      }
    for (let i = 0; i < 180; i++) {
      const x = (rand() - 0.5) * 1450,
        z = -5 - rand() * 32;
      if (i % 3 === 0) {
        const cactus = new THREE.Group();
        cactus.position.set(x, 0, z);
        world.add(cactus);
        const h = 1.1 + rand() * 2.6;
        part(cactus, "cylinder", 0x57715b, [0, h / 2, 0], [0.23, h, 0.23]);
        for (const side of [-1, 1]) {
          part(cactus, "box", 0x57715b, [side * 0.42, h * 0.56, 0], [0.7, 0.2, 0.24]);
          part(cactus, "cylinder", 0x57715b, [side * 0.7, h * 0.7, 0], [0.16, h * 0.36, 0.16]);
        }
      } else {
        const rock = part(
          world,
          "low",
          i % 2 ? 0xb77950 : 0xdca66a,
          [x, 0.2, z],
          [0.5 + rand() * 2, 0.3 + rand() * 0.8, 0.5 + rand()],
          false,
        );
        rock.rotation.y = rand() * 6;
      }
    }
    for (const x of [-190, -80, 45, 160]) {
      const outpost = new THREE.Group();
      outpost.position.set(x, 0, -10);
      world.add(outpost);
      part(outpost, "box", 0xc9b18a, [0, 1.5, 0], [6, 3, 4]);
      part(outpost, "box", C.cream, [0, 3.1, 0], [6.6, 0.25, 4.6]);
      part(outpost, "box", C.glass, [0, 1.7, 2.04], [3.5, 0.75, 0.05], false);
      part(outpost, "cylinder", C.ink, [4, 4, 0], [0.07, 8, 0.07], false);
      const flag = part(outpost, "box", C.red, [4.8, 7.7, 0], [1.6, 0.75, 0.06]);
      flag.rotation.y = 0.2;
    }
    // Desert cable poles, road furniture, and broken watchtowers frame the patrol route.
    for (let x = -580; x < 600; x += 48) {
      part(world, "cylinder", 0x674c3e, [x, 3, -18], [0.12, 6, 0.12], false);
      part(world, "box", C.ink, [x, 5.6, -18], [3, 0.12, 0.12], false);
      const pts = [
        new THREE.Vector3(x, 5.6, -18),
        new THREE.Vector3(x + 24, 4.1, -18),
        new THREE.Vector3(x + 48, 5.6, -18),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      world.add(
        new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.025, 3, false), mat(0x694f43, true)),
      );
    }
    this.pad = new THREE.Group();
    this.pad.position.set(-35, 0.05, 0);
    this.scene.add(this.pad);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.8, 0.15, 32), mat(C.teal));
    this.pad.add(disc);
    for (const x of [-1.5, 1.5])
      part(this.pad, "box", C.cream, [x, 0.12, 0], [0.5, 0.04, 3.6], false, true);
    part(this.pad, "box", C.cream, [0, 0.12, 0], [3, 0.04, 0.5], false, true);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      part(
        this.pad,
        "ball",
        C.yellow,
        [Math.cos(a) * 5, 0.25, Math.sin(a) * 5],
        [0.16, 0.16, 0.16],
        false,
        true,
      );
    }
    this.padRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.055, 5, 48), mat(C.cream, true));
    this.padRing.rotation.x = Math.PI / 2;
    this.padRing.position.y = 0.2;
    this.pad.add(this.padRing);
  }
  shadow(group, size = 1) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(size, 20), mat(0x473d35, true, 0.2));
    s.rotation.x = -Math.PI / 2;
    s.scale.y = 0.4;
    s.position.set(group.position.x, 0.02, 0);
    this.scene.add(s);
    return s;
  }
  add(mesh) {
    this.actors.add(mesh);
    return mesh;
  }
  clear() {
    for (const o of [...this.actors.children]) this.actors.remove(o);
    for (const fx of this.effects) this.scene.remove(fx.mesh);
    this.effects = [];
  }
  burst(x, y, hex = C.yellow, n = 16, big = 1) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        i % 3 === 0 ? geom.box : geom.low,
        mat(i % 4 === 0 ? C.cream : hex, true),
      );
      m.position.set(x, y, (Math.random() - 0.5) * 2);
      const s = (0.12 + Math.random() * 0.35) * big;
      m.scale.setScalar(s);
      this.scene.add(m);
      const a = Math.random() * Math.PI * 2,
        speed = (3 + Math.random() * 9) * big;
      this.effects.push({
        mesh: m,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.3 + Math.random() * 0.55,
        total: 0.85,
        gravity: 10,
      });
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 24), mat(hex, true, 0.65));
    ring.position.set(x, y, 2);
    this.scene.add(ring);
    this.effects.push({ mesh: ring, vx: 0, vy: 0, life: 0.32, total: 0.32, expand: big * 22 });
  }
  smoke(x, y, hex = 0x735e50, scale = 0.5) {
    const m = new THREE.Mesh(geom.low, mat(hex, true, 0.42));
    m.position.set(x, y, -0.1);
    m.scale.setScalar(scale);
    this.scene.add(m);
    this.effects.push({ mesh: m, vx: -0.3, vy: 1.3, life: 0.8, total: 0.8, expand: 0.7 });
  }
  streak(x, y, hex = C.yellow) {
    const m = new THREE.Mesh(geom.ball, mat(hex, true));
    m.position.set(x, y, 0.1);
    m.scale.set(0.25, 0.12, 0.12);
    this.scene.add(m);
    this.effects.push({ mesh: m, vx: 0, vy: 0, life: 0.14, total: 0.14 });
  }
  ageEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const f = this.effects[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        this.effects.splice(i, 1);
        continue;
      }
      f.mesh.position.x += f.vx * dt;
      f.mesh.position.y += f.vy * dt;
      if (f.gravity) f.vy -= f.gravity * dt;
      if (f.expand) f.mesh.scale.addScalar(f.expand * dt);
      f.mesh.rotation.z += dt * 1.3;
    }
  }
  render(dt, game, screen, time, settings) {
    if (this.recovering) return;
    const isTitle =
      screen === "title" || (!game.running && !["result", "hubwait", "ended"].includes(screen));
    this.titleHeli.visible = isTitle;
    this.titleConvoy.visible = isTitle;
    if (isTitle) {
      this.titleHeli.position.set(15, 14 + Math.sin(time * 1.2) * 0.4, 2);
      this.titleHeli.rotation.z = Math.sin(time * 0.8) * 0.045;
      this.titleHeli.userData.mixer.update(dt);
      this.cameraX = THREE.MathUtils.lerp(this.cameraX, 0, Math.min(dt * 3, 1));
      this.cameraY = 12;
    } else {
      let ps = game.players.filter((p) => p.hp > 0);
      if (!ps.length) ps = game.players;
      const target = ps.reduce((s, p) => s + p.x, 0) / Math.max(ps.length, 1);
      const look = (ps[0]?.vx || 0) * 0.28;
      this.cameraX = THREE.MathUtils.lerp(this.cameraX, target + look, Math.min(dt * 4, 1));
      this.cameraY = 12;
    }
    this.shake = Math.max(0, this.shake - dt * 3);
    const shake = settings.shake ? this.shake : 0;
    this.camera.position.set(
      this.cameraX + (Math.random() - 0.5) * shake,
      this.cameraY + 7 + (Math.random() - 0.5) * shake,
      52,
    );
    this.camera.lookAt(this.cameraX, this.cameraY, 0);
    this.camera.updateMatrixWorld();
    this.sun.position.x = this.cameraX * 0.84 + 32;
    this.padRing.rotation.z += dt * 0.15;
    if (!game.running) this.ageEffects(dt);
    this.renderer.render(this.scene, this.camera);
  }
  toWorld(clientX, clientY) {
    const v = new THREE.Vector3(
      (clientX / innerWidth) * 2 - 1,
      (-clientY / innerHeight) * 2 + 1,
      0.5,
    );
    v.unproject(this.camera);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    v.addScaledVector(dir, -v.z / dir.z);
    return v;
  }
  project(x, y, z = 0) {
    return new THREE.Vector3(x, y, z).project(this.camera);
  }
}
