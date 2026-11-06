import * as THREE from "three/webgpu";

export { THREE };
export const PALETTE = {
  ink: 0x102e2d,
  leaf: 0x416f48,
  lime: 0xa7bd58,
  sun: 0xf3d38c,
  earth: 0x626245,
  sand: 0xd6b67b,
  water: 0x297f83,
  red: 0xd9543f,
  cream: 0xffe4b1,
};
export const STAGES = [
  {
    name: "The Canopy Caper",
    short: "CANOPY",
    verb: "Take the scenic route.",
    instruction: "Catch a vine. Build a swing. Let go on the upswing.",
    end: 89,
    spawn: { x: 3, y: 1.3 },
    checkpoints: [3, 31, 53, 76],
    relics: [
      [27, 3.2],
      [49, 3.2],
      [71, 3.2],
    ],
    grounds: [
      [-10, 13, 0],
      [29, 35, 0],
      [51, 57, 0],
      [73, 100, 0],
    ],
    color: 0xb4c8a0,
  },
  {
    name: "Crocodile Crossing",
    short: "RIVER",
    verb: "Mind the local residents.",
    instruction: "Swim for bubbles. Surface for air. A quick swish stuns a croc.",
    end: 89,
    spawn: { x: 3, y: 1.3 },
    checkpoints: [3, 26, 52, 76],
    relics: [
      [24, -6],
      [47, -6],
      [70, -6],
    ],
    grounds: [
      [-10, 8, 0],
      [8, 83, -9],
      [83, 100, 0],
    ],
    color: 0x9ebf9d,
  },
  {
    name: "A Rocky Reception",
    short: "ROCKFALL",
    verb: "Upward. Preferably in one piece.",
    instruction: "Leap rolling stones. Duck the high ones. Keep climbing.",
    end: 89,
    spawn: { x: 3, y: 1.7 },
    checkpoints: [3, 28, 52, 76],
    relics: [
      [23, 6.3],
      [48, 9.3],
      [74, 12.2],
    ],
    grounds: [[-10, 100, 0]],
    color: 0xc7c39b,
  },
  {
    name: "The Great Unknotting",
    short: "RESCUE",
    verb: "Pip has had a very long afternoon.",
    instruction: "Wind three winches, cross the broken bridge, then free Pip.",
    end: 86,
    spawn: { x: 3, y: 1.3 },
    checkpoints: [3, 25, 52, 73],
    relics: [
      [19, 3.5],
      [47, 4.8],
      [70, 3.6],
    ],
    grounds: [
      [-10, 36, 0],
      [46, 100, 0],
    ],
    color: 0xc8b893,
  },
];
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rampRGBA = new THREE.DataTexture(
  new Uint8Array([80, 80, 80, 255, 155, 155, 155, 255, 225, 225, 225, 255, 255, 255, 255, 255]),
  4,
  1,
  THREE.RGBAFormat,
);
rampRGBA.minFilter = rampRGBA.magFilter = THREE.NearestFilter;
rampRGBA.needsUpdate = true;
const mats = new Map(),
  geos = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ color, gradientMap: rampRGBA, ...opts }));
  return mats.get(key);
}
export const inkMat = new THREE.MeshBasicMaterial({
  color: PALETTE.ink,
  side: THREE.BackSide,
});
const geometry = (key, make) => {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
};
export function ball(parent, x, y, z, sx, sy, sz, color, outline = false) {
  return mesh(
    parent,
    geometry("sphere", () => new THREE.SphereGeometry(1, 12, 8)),
    toon(color),
    [x, y, z],
    [sx, sy, sz],
    outline,
  );
}
export function box(parent, x, y, z, sx, sy, sz, color, outline = false) {
  return mesh(
    parent,
    geometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
    toon(color),
    [x, y, z],
    [sx, sy, sz],
    outline,
  );
}
export function mesh(parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], outline = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  if (outline) {
    const o = new THREE.Mesh(geo, inkMat);
    o.scale.setScalar(1.055);
    o.castShadow = false;
    m.add(o);
  }
  return m;
}
export function link(parent, a, b, r, color, outline = false, r2 = r) {
  const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),
    m = mesh(
      parent,
      geometry(`cyl:${r2 / r}`, () => new THREE.CylinderGeometry(r2 / r, 1, 1, 9)),
      toon(color),
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      [r, v.length(), r],
      outline,
    );
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
export function ring(parent, x, y, z, r, t, color, outline = false) {
  const m = mesh(
    parent,
    geometry(`torus:${t / r}`, () => new THREE.TorusGeometry(1, t / r, 7, 30)),
    toon(color),
    [x, y, z],
    [r, r, r],
    outline,
  );
  return m;
}
function leafGeo() {
  return geometry("leaf", () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-0.63, 0.42, 0, 1.8);
    s.quadraticCurveTo(0.62, 0.75, 0, 0);
    return new THREE.ShapeGeometry(s, 5);
  });
}
function leaf(parent, x, y, z, size, angle, color) {
  const l = mesh(parent, leafGeo(), toon(color, { side: THREE.DoubleSide }), [x, y, z], [size, size, size]);
  l.rotation.z = angle;
  if (size > 1.8) {
    const veins = geometry("leaf-veins", () => {
      const p = [0, 0.08, 0.025, 0, 1.68, 0.025];
      for (let i = 0; i < 5; i++) {
        const y = 0.35 + i * 0.23,
          w = Math.sin((y / 1.8) * Math.PI) * 0.23;
        for (const side of [-1, 1]) p.push(0, y, 0.025, side * w, y + 0.17, 0.025);
      }
      return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    });
    l.add(
      new THREE.LineSegments(
        veins,
        new THREE.LineBasicMaterial({ color: 0x3e674b, transparent: true, opacity: 0.7 }),
      ),
    );
  }
  return l;
}
function fern(parent, x, y, z, scale, rng, color = 0x629356) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.3;
    const l = leaf(g, 0, 0, 0, 1 + Math.cos(i) * 0.15, -a, color);
    l.rotation.y = (rng() - 0.5) * 0.55;
    link(g, [0, 0, 0.015], [-Math.sin(a) * 1.35, Math.cos(a) * 1.35, 0.015], 0.015, 0xbac77a);
  }
  return g;
}
function tree(parent, x, y, z, size, rng, far = false) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(size);
  parent.add(g);
  const c = far ? 0x386f61 : 0x4c6447,
    bend = (rng() - 0.5) * 1.5;
  link(g, [0, -1, 0], [bend, 8, 0], 0.44, c, false, 0.33);
  link(g, [bend, 8, 0], [bend - 0.55, 11, -0.1], 0.32, c, false, 0.16);
  if (!far) {
    for (let i = 0; i < 4; i++) link(g, [0, 0.1, 0], [(i - 1.5) * 0.8, -0.2, ((i % 2) - 0.5) * 1.3], 0.12, c);
    for (let i = 0; i < 5; i++)
      link(
        g,
        [bend * 0.6 - 0.25, 2 + i * 1.3, 0.32],
        [bend * 0.6 + 0.25, 2 + i * 1.3, 0.32],
        0.028,
        0x344a37,
      );
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const px = bend + Math.sin(a) * (2.2 + rng()),
      py = 10 + Math.cos(a) * 1.4;
    ball(g, px, py, -0.3, 2.5, 1.15, 1.1, far ? 0x397968 : [0x527b46, 0x70914f, 0x8ba65b][i % 3]);
    leaf(
      g,
      bend + ((i % 3) - 0.8) * 0.25,
      9.2,
      0.8,
      2.2 + (i % 3) * 0.15,
      (i - 4.5) * 0.29,
      far ? 0x40816d : [0x79a564, 0x91b66b, 0x6e9b60][i % 3],
    );
  }
  if (far) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x42877d });
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = mat;
        o.castShadow = false;
        o.receiveShadow = false;
      }
      if (o.isLineSegments) o.visible = false;
    });
  }
  return g;
}
function palm(parent, x, y, z, size, rng, color = 0x2a665a) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, y, z);
  g.scale.setScalar(size);
  const bend = (rng() - 0.5) * 3;
  link(g, [0, 0, 0], [bend, 9, 0], 0.24, color, false, 0.13);
  for (let i = 0; i < 9; i++) leaf(g, bend, 9, 0.2, 2.7, (i - 4) * 0.4, color);
  return g;
}
function textSprite(text, color = "#fff0cb", bg = "#163b31", scale = 3) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  c.fillStyle = bg;
  c.fillRect(0, 0, 512, 128);
  c.strokeStyle = color;
  c.lineWidth = 5;
  c.strokeRect(8, 8, 496, 112);
  c.font = "bold 49px Trebuchet MS, sans-serif";
  c.fillStyle = color;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true }));
  s.scale.set(scale * 4, scale, 1);
  return s;
}
export function sign(parent, x, y, text) {
  link(parent, [x, y, 0], [x, y + 3, 0], 0.1, 0x6b6240);
  const s = textSprite(text, "#f9e8bd", "#31533e", 0.7);
  s.position.set(x, y + 2.7, 0.2);
  parent.add(s);
  return s;
}
export function groundAt(stage, x) {
  if (stage === 2 && x >= -10 && x <= 100) return x * 0.125;
  const data = STAGES[stage];
  for (const [a, b, y] of data.grounds) if (x >= a && x <= b) return y;
  return -25;
}
function rockyGround(stage, g, rng) {
  const i = stage.index;
  for (const [a, b, y] of STAGES[i].grounds) {
    const mid = (a + b) / 2,
      len = b - a,
      gy = i === 2 ? mid * 0.125 : y;
    const rock = box(g, mid, gy - 3.3, -1, len, 6.6, 9, i === 1 ? 0x477e68 : i === 3 ? 0x9a8056 : 0x72714b);
    if (i === 2) rock.rotation.z = Math.atan(0.125);
    const top = box(
      g,
      mid,
      gy - 0.16,
      0,
      len,
      0.36,
      9,
      i === 1 ? 0x668e67 : i === 3 ? 0xd4b272 : 0x9ba05e,
      true,
    );
    if (i === 2) top.rotation.z = Math.atan(0.125);
    const lip = box(g, mid, gy - 0.48, 4.58, len, 0.44, 0.24, i === 3 ? 0x6f6443 : 0x3e6541);
    if (i === 2) lip.rotation.z = Math.atan(0.125);
    for (let x = a + 0.6; x < b; x += 2.1) {
      const fy = i === 2 ? x * 0.125 : y;
      for (let j = 0; j < 3; j++)
        link(g, [x, fy - 0.8 - j * 0.9, 4.6], [x + 0.6 + rng(), fy - 1.1 - j * 0.9, 4.61], 0.023, 0x354b38);
      if (rng() > 0.4) fern(g, x, fy, 1.6 + rng() * 2, 0.45 + rng() * 0.35, rng);
      if (rng() > 0.5) {
        const r = ball(g, x, fy - 2 - rng(), 4.5, 0.7, 0.7, 0.1, i === 3 ? 0xbca06a : 0x8a885b);
        r.rotation.z = rng();
      }
    }
    for (const edge of [a + 0.3, b - 0.3]) {
      const fy = i === 2 ? edge * 0.125 : y;
      for (let n = 0; n < 3; n++) {
        const xx = edge + (rng() - 0.5) * 0.5;
        link(g, [xx, fy, 3], [xx + 0.3, fy - 2.4 - rng(), 3], 0.055, 0x394d35);
      }
    }
  }
}
export function makeAvatar(color = PALETTE.red, ghost = false) {
  const root = new THREE.Group(),
    rig = new THREE.Group();
  rig.name = "rig";
  root.add(rig);
  const body = new THREE.Group();
  body.name = "torso";
  rig.add(body);
  const skin = 0xe1a875,
    shirt = 0xe8ce95,
    pants = 0x535c39,
    shoe = 0x2e4036;
  ball(body, 0, 0.17, 0, 0.38, 0.53, 0.29, shirt, true);
  box(body, 0, -0.22, 0.02, 0.7, 0.14, 0.63, 0x574b32, true);
  box(body, 0.26, -0.22, 0.34, 0.14, 0.14, 0.06, 0xd9b762);
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0.05, 0.92, 0);
  body.add(head);
  ball(head, 0, 0, 0, 0.32, 0.37, 0.3, skin, true);
  ball(head, 0.3, -0.035, 0.02, 0.14, 0.12, 0.15, skin, true);
  ball(head, 0.13, 0.08, 0.265, 0.045, 0.067, 0.03, PALETTE.ink);
  ball(head, -0.22, -0.02, 0.18, 0.09, 0.11, 0.08, skin);
  const _hat = mesh(
    head,
    geometry("hat", () => new THREE.CylinderGeometry(0.3, 0.4, 0.25, 14)),
    toon(0xe3cc95),
    [-0.035, 0.33, 0],
    [1, 1, 1],
    true,
  );
  ball(head, -0.035, 0.45, 0, 0.31, 0.19, 0.3, 0xe3cc95, true);
  const _brim = mesh(
    head,
    geometry("brim", () => new THREE.CylinderGeometry(0.51, 0.51, 0.06, 16)),
    toon(0xdac48a),
    [0.03, 0.23, 0],
    [1, 1, 1],
    true,
  );
  box(head, 0, 0.3, 0.001, 0.64, 0.065, 0.62, 0x6c7150);
  const scarf = new THREE.Group();
  scarf.name = "scarf";
  scarf.position.set(-0.08, 0.63, 0);
  body.add(scarf);
  ball(scarf, 0.1, 0, 0, 0.31, 0.095, 0.31, color, true);
  const tail = box(scarf, -0.42, -0.08, 0.05, 0.65, 0.18, 0.08, color, true);
  tail.rotation.z = 0.25;
  const arms = [];
  for (let side = 0; side < 2; side++) {
    const arm = new THREE.Group();
    arm.name = side ? "rightArm" : "leftArm";
    arm.position.set(side ? 0.07 : -0.07, 0.48, side ? 0.36 : -0.32);
    body.add(arm);
    ball(arm, 0, -0.27, 0, 0.13, 0.31, 0.13, shirt, true);
    ball(arm, 0.015, -0.59, 0, 0.115, 0.16, 0.115, skin, true);
    arms.push(arm);
  }
  const machete = new THREE.Group();
  machete.name = "machete";
  machete.visible = false;
  machete.position.set(0, -0.65, 0);
  arms[1].add(machete);
  box(machete, 0, -0.08, 0, 0.1, 0.28, 0.1, 0x6d4c2f, true);
  const blade = box(machete, 0, -0.42, 0.015, 0.16, 0.53, 0.045, 0xc6ddd3, true);
  blade.rotation.z = -0.12;
  for (let side = 0; side < 2; side++) {
    const leg = new THREE.Group();
    leg.name = side ? "rightLeg" : "leftLeg";
    leg.position.set(side ? 0.18 : -0.18, -0.25, side ? 0.16 : -0.12);
    body.add(leg);
    ball(leg, 0, -0.3, 0, 0.15, 0.34, 0.16, pants, true);
    box(leg, 0.07, -0.7, 0.025, 0.4, 0.21, 0.32, shoe, true);
  }
  const slashGeo = new THREE.RingGeometry(0.7, 2, 24, 1, -0.7, 1.6),
    slashMat = new THREE.MeshBasicMaterial({
      color: 0xfff3cc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
  const slash = new THREE.Mesh(slashGeo, slashMat);
  slash.position.set(0.8, 0.2, 0.7);
  slash.visible = false;
  root.add(slash);
  const shadow = mesh(
    root,
    geometry("shadow", () => new THREE.CircleGeometry(1, 24)),
    new THREE.MeshBasicMaterial({
      color: 0x082b27,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }),
    [0, -1.02, -0.05],
    [0.62, 0.27, 1],
  );
  shadow.rotation.x = -Math.PI / 2;
  const mixer = new THREE.AnimationMixer(rig),
    actions = {};
  const clip = (name, dur, tracks) => {
    const c = new THREE.AnimationClip(name, dur, tracks);
    actions[name] = mixer.clipAction(c);
  };
  const track = (name, t, v) => new THREE.NumberKeyframeTrack(name, t, v);
  clip("idle", 2, [
    track("torso.position[y]", [0, 1, 2], [0, 0.045, 0]),
    track("head.rotation[z]", [0, 1, 2], [0.04, -0.04, 0.04]),
    track("scarf.rotation[z]", [0, 1, 2], [-0.1, 0.2, -0.1]),
  ]);
  clip("run", 0.52, [
    track("leftLeg.rotation[z]", [0, 0.13, 0.26, 0.39, 0.52], [-0.75, 0, 0.75, 0, -0.75]),
    track("rightLeg.rotation[z]", [0, 0.13, 0.26, 0.39, 0.52], [0.75, 0, -0.75, 0, 0.75]),
    track("leftArm.rotation[z]", [0, 0.26, 0.52], [0.7, -0.7, 0.7]),
    track("rightArm.rotation[z]", [0, 0.26, 0.52], [-0.65, 0.65, -0.65]),
    track("torso.position[y]", [0, 0.13, 0.26, 0.39, 0.52], [0, 0.1, 0, 0.1, 0]),
    track("scarf.rotation[z]", [0, 0.26, 0.52], [0.35, 0.55, 0.35]),
  ]);
  clip("hang", 1, [
    track("leftArm.rotation[z]", [0, 0.5, 1], [2.8, 2.95, 2.8]),
    track("rightArm.rotation[z]", [0, 0.5, 1], [3.25, 3.05, 3.25]),
    track("leftLeg.rotation[z]", [0, 0.5, 1], [-0.3, 0.2, -0.3]),
    track("rightLeg.rotation[z]", [0, 0.5, 1], [0.3, -0.2, 0.3]),
    track("torso.rotation[z]", [0, 0.5, 1], [0.15, -0.1, 0.15]),
  ]);
  clip("jump", 1, [
    track("leftLeg.rotation[z]", [0, 0.5, 1], [-0.6, -0.3, -0.6]),
    track("rightLeg.rotation[z]", [0, 0.5, 1], [0.75, 0.5, 0.75]),
    track("leftArm.rotation[z]", [0, 0.5, 1], [1.1, 0.8, 1.1]),
    track("rightArm.rotation[z]", [0, 0.5, 1], [-0.7, -0.4, -0.7]),
  ]);
  clip("swim", 0.8, [
    track("torso.rotation[z]", [0, 0.4, 0.8], [-1.1, -1.18, -1.1]),
    track("leftArm.rotation[z]", [0, 0.2, 0.4, 0.6, 0.8], [0, 1.6, 3.1, 1.6, 0]),
    track("rightArm.rotation[z]", [0, 0.2, 0.4, 0.6, 0.8], [3.1, 1.6, 0, 1.6, 3.1]),
    track("leftLeg.rotation[z]", [0, 0.4, 0.8], [-0.4, 0.4, -0.4]),
    track("rightLeg.rotation[z]", [0, 0.4, 0.8], [0.4, -0.4, 0.4]),
  ]);
  clip("duck", 1, [
    track("torso.rotation[z]", [0, 1], [-0.3, -0.3]),
    track("leftLeg.rotation[z]", [0, 1], [-0.8, -0.8]),
    track("rightLeg.rotation[z]", [0, 1], [0.8, 0.8]),
  ]);
  clip("cheer", 0.7, [
    track("leftArm.rotation[z]", [0, 0.35, 0.7], [2.4, 3, 2.4]),
    track("rightArm.rotation[z]", [0, 0.35, 0.7], [-2.4, -3, -2.4]),
    track("torso.position[y]", [0, 0.35, 0.7], [0, 0.22, 0]),
    track("leftLeg.rotation[z]", [0, 0.35, 0.7], [-0.2, 0.2, -0.2]),
  ]);
  clip("cut", 0.24, [track("rightArm.rotation[z]", [0, 0.07, 0.17, 0.24], [0.2, -2.5, -1.4, 0.2])]);
  actions.cut.setLoop(THREE.LoopOnce, 1);
  actions.cut.clampWhenFinished = false;
  actions.idle.play();
  if (ghost) {
    root.traverse((o) => {
      if (o.isMesh && o.material !== inkMat) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.52;
        o.material.depthWrite = false;
      }
    });
  }
  return {
    root,
    rig,
    mixer,
    actions,
    anim: "idle",
    slash,
    body,
    shadow,
    machete,
    setAnim(name) {
      if (this.anim === name) return;
      const old = actions[this.anim],
        next = actions[name] || actions.idle;
      next.reset().fadeIn(0.13).play();
      old?.fadeOut(0.13);
      this.anim = name;
    },
    cut() {
      actions.cut.reset().setEffectiveWeight(1).play();
    },
    update(dt) {
      mixer.update(dt);
    },
  };
}
function vine(stage, x, length, phase) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 13, 0);
  stage.scene.add(pivot);
  const rope = link(pivot, [0, 0, 0], [0, -length, 0], 0.065, 0x384b31, true);
  for (let k = 1; k < 8; k++) {
    const _l = leaf(pivot, k % 2 ? 0.03 : -0.03, -k * 1.3, 0, 0.3, k % 2 ? -0.9 : 0.9, 0x769b4d);
  }
  const _knot = ball(pivot, 0, -length, 0, 0.16, 0.22, 0.15, 0xb5bc64, true);
  const v = {
    x,
    y: 13,
    length,
    phase,
    pivot,
    theta: 0,
    end: { x, y: 0 },
    rope,
  };
  stage.vines.push(v);
  return v;
}
function croc(stage, x, y, phase) {
  const g = new THREE.Group();
  stage.scene.add(g);
  ball(g, 0, 0, 0, 1.45, 0.35, 0.45, 0x557548, true);
  const _snout = box(g, 1.3, 0.04, 0, 1.3, 0.25, 0.7, 0x79934d, true),
    jaw = box(g, 1.3, -0.17, 0, 1.3, 0.13, 0.65, 0xc0ba7c, true);
  const _tail = link(g, [-1, 0, 0], [-2.7, 0.1, 0], 0.29, 0x547348, true, 0.025);
  for (let i = 0; i < 7; i++) {
    const _cone = mesh(
      g,
      geometry("cone", () => new THREE.ConeGeometry(1, 1, 4)),
      toon(0xb9c16a),
      [-1 + i * 0.32, 0.4, 0],
      [0.15, 0.28, 0.16],
    );
  }
  for (const z of [-0.28, 0.28]) {
    ball(g, 0.65, 0.27, z, 0.17, 0.13, 0.12, 0xb1c26b, true);
    ball(g, 0.76, 0.3, z * 0.98, 0.045, 0.045, 0.09, PALETTE.ink);
    for (let i = 0; i < 5; i++) {
      const tooth = mesh(
        g,
        geometry("cone", () => new THREE.ConeGeometry(1, 1, 4)),
        toon(0xffe3a8),
        [0.85 + i * 0.22, -0.01, z],
        [0.06, 0.14, 0.06],
      );
      tooth.rotation.z = Math.PI;
    }
  }
  const c = { x, y, phase, group: g, jaw, stun: 0 };
  stage.crocs.push(c);
  return c;
}
function guardian(stage, x) {
  const g = new THREE.Group();
  stage.scene.add(g);
  box(g, 0, 0.5, 0, 1.7, 0.75, 0.9, 0x777e55, true);
  box(g, 0.9, 0.85, 0, 0.7, 0.7, 0.85, 0x9b9f6e, true);
  for (const z of [-0.28, 0.28]) {
    box(g, 1.28, 0.9, z, 0.03, 0.12, 0.17, 0xf3ad5c);
    for (const xx of [-0.6, 0.6]) box(g, xx, 0.03, z, 0.3, 0.7, 0.3, 0x5d6b4c, true);
  }
  for (const z of [-0.3, 0.3]) {
    const _ear = mesh(
      g,
      geometry("cone", () => new THREE.ConeGeometry(1, 1, 4)),
      toon(0x7b845c),
      [0.7, 1.35, z],
      [0.18, 0.35, 0.17],
    );
  }
  link(g, [-0.8, 0.6, 0], [-1.7, 1.1, 0], 0.13, 0x8a9160, true);
  stage.guardians.push({ x, group: g, stun: 0, phase: x });
}
export function createStage(index) {
  const rng = seeded(3817 + index * 901),
    data = STAGES[index],
    scene = new THREE.Scene();
  scene.background = new THREE.Color(data.color);
  scene.fog = new THREE.Fog(data.color, 48, 100);
  const stage = {
    index,
    scene,
    vines: [],
    crocs: [],
    guardians: [],
    pickups: [],
    winches: [],
    waves: [],
    bubbles: [],
    fireflies: [],
    rocks: [],
    checkFlags: [],
    dynamic: new THREE.Group(),
  };
  scene.add(stage.dynamic);
  const ambient = new THREE.HemisphereLight(0xf4efc9, index === 1 ? 0x23524b : 0x29583e, 1.15);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe1ac, 2.4);
  sun.position.set(25, 32, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.normalBias = 0.07;
  scene.add(sun);
  scene.add(sun.target);
  stage.sun = sun;
  const _disk = mesh(
    scene,
    geometry("sun", () => new THREE.CircleGeometry(1, 56)),
    new THREE.MeshBasicMaterial({ color: index === 3 ? 0xf8d695 : 0xe8dfae }),
    [23, 17, -37],
    [5, 5, 1],
  );
  for (let layer = 0; layer < 3; layer++) {
    const col = [0xa7c6af, 0x79aa96, 0x518e7c][layer];
    for (let x = -40; x < 145; x += 7 + rng() * 5) {
      const y = index === 2 ? x * 0.07 - 3 : -4;
      const m = ball(scene, x, y, -29 + layer * 6, 12, 9 + rng() * 7, 2, col);
      m.material = new THREE.MeshBasicMaterial({ color: col });
      m.castShadow = false;
      m.receiveShadow = false;
      if (layer === 2) palm(scene, x, y, -19, 1.3 + rng() * 0.4, rng, col);
    }
  }
  for (let x = -12; x < 110; x += 11) {
    const y = groundAt(index, Math.max(0, x));
    tree(scene, x, y < -15 ? 0 : y, -6 - rng() * 5, 0.9 + rng() * 0.6, rng, true);
    if (index !== 1 || x < 8 || x > 82) tree(scene, x + 4, y < -15 ? 0 : y, -3, 0.85 + rng() * 0.25, rng);
  }
  rockyGround(stage, scene, rng);
  for (let x = 0; x < 96; x += 3.5) {
    const y = groundAt(index, x);
    if (y > -20 && !(index === 1 && x > 8 && x < 83)) {
      for (let j = 0; j < 3; j++) {
        const h = 0.1 + rng() * 0.2;
        link(scene, [x + j * 0.25, y + 0.01, 3.4], [x + j * 0.25 + 0.12, y + h, 3.4], 0.027, 0xa9b86b);
      }
      if (rng() > 0.7) {
        const _f = ball(scene, x, y + 0.35, 3.6, 0.16, 0.18, 0.1, 0xf0b071);
      }
    }
  }
  for (let c = 0; c < data.checkpoints.length; c++) {
    const x = data.checkpoints[c],
      fy = groundAt(index, x);
    const y = index === 1 && c > 0 ? 1.6 : fy;
    link(scene, [x, y, -1.7], [x, y + 2.8, -1.7], 0.06, 0xc4bb82);
    const flag = box(scene, x + 0.45, y + 2.45, -1.7, 0.85, 0.5, 0.05, c === 0 ? 0xd9ed91 : 0xe3be72);
    flag.rotation.z = 0.08;
    stage.checkFlags.push(flag);
  }
  if (index === 0) {
    for (const [j, x] of [21, 43, 65].entries()) vine(stage, x, 11.1, j * 1.7 - 1.7);
    for (let x = 4; x < 92; x += 11) link(scene, [x, 15, -4], [x + 6, 11, -4], 0.05, 0x37573c);
    sign(scene, 82, 0, "RIVER →");
  }
  if (index === 1) {
    const water = box(scene, 45, -3.75, -0.9, 75, 10, 8.2, 0x287c7e);
    water.material = toon(0x287b7f, {
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    water.castShadow = false;
    const _back = box(scene, 45, -3.8, -3.5, 75, 10, 0.2, 0x286e70);
    for (let x = 9; x < 83; x += 2.5) {
      const w = box(scene, x, 1.43, 3.6, 1.45, 0.025, 0.2, 0x8dd9be);
      w.material = toon(0x9cdeca, { transparent: true, opacity: 0.6 });
      stage.waves.push(w);
    }
    link(scene, [8, 1.43, 3.8], [83, 1.43, 3.8], 0.018, 0xa9e3c6);
    for (const x of [16, 35, 55, 76]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(1.1, 0);
      shape.lineTo(5, -9);
      shape.lineTo(1.7, -9);
      shape.closePath();
      const shaft = mesh(
        scene,
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({
          color: 0xb4e7b9,
          transparent: true,
          opacity: 0.045,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        [x, 1.3, -2],
      );
      shaft.castShadow = false;
    }
    for (let x = 12; x < 81; x += 5) {
      const f = groundAt(index, x);
      for (let j = 0; j < 4; j++)
        leaf(
          scene,
          x + j * 0.35,
          f + 0.1,
          2.6,
          1.4 + rng(),
          (rng() - 0.5) * 0.7,
          [0x3a956e, 0x78af71, 0x8fb075][j % 3],
        );
      ball(scene, x, -8.4, 1, 1.1, 0.7, 0.9, 0x647f62, true);
    }
    for (const x of [24, 48, 72]) {
      for (let k = 0; k < 9; k++) {
        const b = ring(scene, x + (rng() - 0.5) * 1.3, -8 + k, 1.4, 0.1 + rng() * 0.12, 0.02, 0xb0f0d5);
        stage.bubbles.push({
          mesh: b,
          x: b.position.x,
          base: b.position.y,
          phase: rng() * 9,
        });
      }
      const s = textSprite("AIR ↑", "#d6f3ce", "#256c63", 0.55);
      s.position.set(x, -4, -0.9);
      scene.add(s);
    }
    [
      [22, -3.2, 0],
      [40, -5, 1.6],
      [59, -2.6, 3.2],
      [76, -5.3, 5],
    ].forEach((a) => {
      croc(stage, ...a);
    });
    for (let i = 0; i < 15; i++) {
      const g = new THREE.Group();
      scene.add(g);
      const _fish = ball(g, 0, 0, 0, 0.35, 0.14, 0.06, i % 2 ? 0xd7bd79 : 0xa0c6a2);
      const tail = mesh(
        g,
        geometry("cone", () => new THREE.ConeGeometry(1, 1, 3)),
        toon(0xd7b978),
        [-0.37, 0, 0],
        [0.13, 0.3, 0.05],
      );
      tail.rotation.z = Math.PI / 2;
      stage.fireflies.push({
        mesh: g,
        x: 10 + rng() * 70,
        y: -1 - rng() * 6,
        z: -1,
        phase: rng() * 6,
        fish: true,
      });
    }
    sign(scene, 88, 0, "HIGHER GROUND →");
  }
  if (index === 2) {
    for (let x = 6; x < 100; x += 12) {
      const y = x * 0.125;
      ball(scene, x, y + 1.6, -4.5, 4, 3, 2, 0x8c8d66, true);
      for (let k = 0; k < 3; k++)
        link(scene, [x - 2, y + k, -2.4], [x + 2, y + k + 0.5, -2.4], 0.04, 0x6b7853);
      fern(scene, x + 2, y + 1, -2, 1.2, rng);
    }
    for (const x of [17, 42, 66]) {
      const y = x * 0.125;
      const _arch = box(scene, x, y + 3.3, -0.7, 5, 1, 2.8, 0xb3a574, true);
      box(scene, x - 2, y + 1.5, -0.7, 0.8, 3, 2.8, 0x8c9263, true);
      box(scene, x + 2, y + 1.5, -0.7, 0.8, 3, 2.8, 0x8c9263, true);
    }
    sign(scene, 84, 10.5, "RUINS →");
  }
  if (index === 3) {
    for (let x = 8; x < 96; x += 12) {
      const _y = 0;
      box(scene, x, 2, -3, 1.8, 4, 2, 0xa69362, true);
      box(scene, x, 4.2, -3, 2.2, 0.55, 2.3, 0xc0a66d, true);
      box(scene, x, 0.2, -3, 2.2, 0.5, 2.3, 0xc0a66d, true);
      for (let j = 0; j < 3; j++) {
        ring(scene, x, 1 + j, -1.98, 0.23, 0.045, 0x626f4b);
        box(scene, x, 1 + j, -1.96, 0.13, 0.13, 0.03, 0xa7b571);
      }
      fern(scene, x + 1.4, 0, -1.8, 1.1, rng);
    }
    vine(stage, 41, 10.7, -1.5);
    for (const [j, x] of [18, 52, 71].entries()) {
      const base = new THREE.Group();
      base.position.set(x, 0, 0.5);
      scene.add(base);
      box(base, 0, 0.5, 0, 1.25, 1, 1.1, 0x8d8a5b, true);
      const wheel = ring(base, 0, 1.75, 0.4, 0.7, 0.12, 0xcda96b, true);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        link(wheel, [0, 0, 0], [Math.cos(a) * 0.64, Math.sin(a) * 0.64, 0], 0.065, 0x796b43);
      }
      ball(base, 0, 1.75, 0.44, 0.18, 0.18, 0.1, 0xe9ca79, true);
      const light = ball(base, 0, 2.8, 0, 0.22, 0.25, 0.22, 0xf4b66c, true);
      const s = textSprite(`0${j + 1}`, "#f9e8b8", "#596a43", 0.35);
      s.position.set(0, 3.45, 0);
      base.add(s);
      stage.winches.push({ x, group: base, wheel, light });
    }
    guardian(stage, 28);
    guardian(stage, 61);
    const cage = new THREE.Group();
    scene.add(cage);
    cage.position.set(84, 5, 0);
    box(cage, 0, -0.1, 0, 3.2, 0.3, 2, 0x8c7348, true);
    box(cage, 0, 3, 0, 3.2, 0.25, 2, 0xa28653, true);
    for (const x of [-1.4, 1.4])
      for (const z of [-0.8, 0.8]) link(cage, [x, 0, z], [x, 3, z], 0.07, 0xb8a272, true);
    for (let j = 0; j < 7; j++) link(cage, [-1.4 + j * 0.46, 0, 1], [-1.4 + j * 0.46, 3, 1], 0.035, 0x80764c);
    const pip = makeAvatar(0x659ba0);
    pip.root.position.y = 1;
    cage.add(pip.root);
    pip.setAnim("cheer");
    stage.cage = cage;
    stage.pip = pip;
    stage.freePip = makeAvatar(0x659ba0);
    stage.freePip.root.position.set(85.6, 1, 0);
    stage.freePip.setAnim("cheer");
    stage.freePip.root.visible = false;
    scene.add(stage.freePip.root);
    stage.cageRope = link(scene, [84, 14, 0], [84, 8, 0], 0.06, 0x524d35);
    box(scene, 84, 14.3, 0, 10, 0.65, 1.1, 0x7c704b, true);
    link(scene, [79, 0, -1], [79, 15, -1], 0.36, 0x686d48, true, 0.23);
    link(scene, [89, 0, -1], [89, 15, -1], 0.36, 0x686d48, true, 0.23);
    sign(scene, 8, 0, "PIP! →");
  }
  for (let j = 0; j < 3; j++) {
    const [x, y] = data.relics[j],
      g = new THREE.Group();
    g.position.set(x, y, 0);
    scene.add(g);
    const _gem = mesh(
      g,
      geometry("gem", () => new THREE.OctahedronGeometry(0.4)),
      toon(0xf8d27c),
      [0, 0, 0],
      [1, 1.5, 1],
      true,
    );
    ring(g, 0, 0, 0, 0.7, 0.024, 0xf8e5aa);
    stage.pickups.push({ group: g, x, y, relic: true, id: j });
  }
  for (let j = 0; j < 18; j++) {
    const x = 6 + j * 4.5,
      y =
        index === 1 && x > 9 && x < 80
          ? -2.2 + Math.sin(j) * 2
          : Math.max(0, groundAt(index, x)) + 1.6 + (j % 3 === 0 ? 1.4 : 0),
      g = new THREE.Group();
    g.position.set(x, y, 0.2);
    scene.add(g);
    ring(g, 0, 0, 0, 0.19, 0.06, 0xf4d888);
    stage.pickups.push({ group: g, x, y, relic: false, id: j + 3 });
  }
  for (let i = 0; i < 28; i++) {
    const m = ball(scene, 0, 0, 0, 0.035, 0.035, 0.035, index === 1 ? 0xb3d9ab : 0xf1e9a8);
    m.material = new THREE.MeshBasicMaterial({
      color: index === 1 ? 0xa2dbc0 : 0xe4dc90,
      transparent: true,
      opacity: 0.65,
    });
    stage.fireflies.push({
      mesh: m,
      x: rng() * 100,
      y: rng() * 12,
      z: -2 + rng() * 5,
      phase: rng() * 6,
    });
  }
  for (const x of [-8, 96]) {
    const y = groundAt(index, x);
    fern(scene, x, y < 0 ? 0 : y, 7.1, 3, rng, 0x214e3c);
    palm(scene, x + 2, y < 0 ? 0 : y, 6, 1.2, rng, 0x24543f);
  }
  return stage;
}
export function updateStage(stage, t, dt, runner = null) {
  for (const v of stage.vines) {
    if (runner?.swing?.vine === v) {
      v.theta = runner.swing.theta;
    } else v.theta = Math.sin(t * 0.98 + v.phase) * 0.86;
    v.pivot.rotation.z = v.theta;
    v.end.x = v.x + Math.sin(v.theta) * v.length;
    v.end.y = v.y - Math.cos(v.theta) * v.length;
  }
  for (const c of stage.crocs) {
    c.stun = Math.max(0, c.stun - dt);
    c.group.position.set(c.x + Math.sin(t * 0.62 + c.phase) * 3, c.y + Math.sin(t + c.phase) * 0.3, 0);
    c.group.scale.x = Math.cos(t * 0.62 + c.phase) > 0 ? 1 : -1;
    c.jaw.position.y = -0.18 - Math.max(0, Math.sin(t * 1.8 + c.phase)) * 0.18;
    c.group.rotation.z = c.stun ? Math.sin(t * 18) * 0.1 : 0;
  }
  for (const g of stage.guardians) {
    g.stun = Math.max(0, g.stun - dt);
    g.group.position.set(g.x + Math.sin(t * 0.9 + g.phase) * 2, 0, 0);
    g.group.scale.x = Math.cos(t * 0.9 + g.phase) > 0 ? 1 : -1;
    g.group.rotation.z = g.stun ? Math.sin(t * 16) * 0.07 : 0;
  }
  for (const p of stage.pickups) {
    p.group.rotation.y = t * 1.2;
    p.group.position.y = p.y + Math.sin(t * 2 + p.id) * 0.16;
  }
  for (const w of stage.waves) {
    w.position.y = 1.43 + Math.sin(t * 2 + w.position.x) * 0.055;
    w.scale.x = 1 + 0.3 * Math.sin(t + w.position.x);
  }
  for (const b of stage.bubbles) {
    b.mesh.position.y = -8 + ((t * 1.35 + b.phase) % 9.4);
    b.mesh.position.x = b.x + Math.sin(t * 2 + b.phase) * 0.22;
  }
  for (const f of stage.fireflies) {
    f.mesh.position.set(
      f.x + Math.sin(t * 0.6 + f.phase) * (f.fish ? 2 : 0.7),
      f.y + Math.sin(t + f.phase) * 0.3,
      f.z,
    );
    if (f.fish) f.mesh.scale.x = Math.cos(t * 0.6 + f.phase) > 0 ? 1 : -1;
  }
  if (stage.pip) stage.pip.update(dt);
  if (stage.freePip) stage.freePip.update(dt);
  if (runner) {
    const x = runner.body.translation().x;
    stage.sun.position.x = x + 13;
    stage.sun.target.position.set(x, 0, 0);
    stage.sun.target.updateMatrixWorld();
  }
}
export function rockMesh(parent, radius) {
  const m = mesh(
    parent,
    geometry("rock", () => new THREE.IcosahedronGeometry(1, 1)),
    toon(0x9b9473),
    [0, 0, 0],
    [radius, radius, radius],
    true,
  );
  for (let j = 0; j < 4; j++) {
    const _crack = link(
      m,
      [-0.6 + j * 0.3, 0.5 - j * 0.2, 0.6],
      [-0.2 + j * 0.3, -0.1 - j * 0.15, 0.75],
      0.02,
      0x495c48,
    );
  }
  return m;
}
