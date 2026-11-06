const PALETTE = {
  stone: 0xc5a371,
  light: 0xe1c18b,
  dark: 0x987b54,
  edge: 0x655b44,
  sand: 0xc8b77d,
  moss: 0x547b55,
  leaf: 0x377465,
  lightleaf: 0x619277,
  trunk: 0x66553b,
  gold: 0xf4ba46,
  water: 0x285e61,
  red: 0x9f483b,
  teal: 0x388c89,
};
function stoneBlock(x, y, z, w, h, d, c = PALETTE.stone, edges = true) {
  stamp(geo.box, toon(c), x, y, z, w, h, d, 0, 0, 0, edges);
}
function ground(x1, x2, z1, z2, kind = "stone") {
  const lo = Math.min(z1, z2),
    hi = Math.max(z1, z2);
  solid((x1 + x2) / 2, -0.55, (lo + hi) / 2, x2 - x1, 1.1, hi - lo);
  stamp(geo.box, toon(0x4a5545), (x1 + x2) / 2, -0.43, (lo + hi) / 2, x2 - x1, 0.6, hi - lo);
  for (let x = x1 + 0.98; x < x2; x += 2)
    for (let z = lo + 0.98; z < hi; z += 2) {
      const c =
        kind === "sand"
          ? [0xb5a272, 0xc6b481, 0xb9ab7c][Math.floor(artRand() * 3)]
          : [0xc6ab7b, 0xb59b70, 0xd1b584, 0xbca174][Math.floor(artRand() * 4)];
      stamp(geo.box, toon(c), x, -0.14, z, 1.93, 0.28, 1.93, 0, 0, 0, false);
      if (artRand() < 0.13)
        stamp(
          geo.box,
          toon(PALETTE.moss),
          x + (artRand() - 0.5),
          0.015,
          z + (artRand() - 0.5),
          0.35 + artRand() * 0.8,
          0.025,
          0.2 + artRand() * 0.8,
          0,
          artRand() * 3,
          0,
        );
    }
}
function column(x, z, h = 4.5) {
  stoneBlock(x, 0.25, z, 1.5, 0.5, 1.5, PALETTE.dark);
  stoneBlock(x, 0.65, z, 1.2, 0.3, 1.2, PALETTE.light);
  stamp(geo.cylinder, toon(PALETTE.stone), x, h / 2 + 0.6, z, 0.47, h, 0.47, 0, 0, 0, true);
  for (let k = 1; k < 4; k++)
    stamp(geo.torus, toon(PALETTE.dark), x, 0.75 + (k * h) / 4, z, 0.49, 0.49, 0.49, Math.PI / 2);
  stoneBlock(x, h + 0.7, z, 1.4, 0.45, 1.4, PALETTE.light);
  solid(x, h / 2, z, 1.2, h, 1.2);
}
function arch(x, z, w = 7, h = 5) {
  column(x - w / 2, z, h);
  column(x + w / 2, z, h);
  stoneBlock(x, h + 1, z, w + 2, 1.1, 1.7, PALETTE.dark);
  stoneBlock(x, h + 1.65, z, w + 2.5, 0.3, 2, PALETTE.light);
  for (let i = -2; i <= 2; i++)
    stoneBlock(x + i * 1.05, h + 1.05, z + 0.88, 0.7, 0.55, 0.08, i === 0 ? PALETTE.gold : PALETTE.light);
  for (let side of [-1, 1]) {
    stamp(geo.cone, toon(PALETTE.gold), x + side * (w / 2), h + 2, z, 0.5, 0.8, 0.5);
  }
}
function palm(x, z, s = 1) {
  const lean = (artRand() - 0.5) * 0.25;
  stamp(geo.cylinder, toon(PALETTE.trunk), x, 3.8 * s, z, 0.3 * s, 7.6 * s, 0.3 * s, 0, 0, lean);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + artRand() * 0.2;
    stamp(
      geo.leaf,
      toon(k % 2 ? PALETTE.leaf : PALETTE.lightleaf),
      x + Math.sin(a) * 1.5 * s,
      7.7 * s,
      z + Math.cos(a) * 1.5 * s,
      0.65 * s,
      0.18 * s,
      2.8 * s,
      0.18,
      a,
      0.08,
    );
  }
  for (let k = 0; k < 3; k++)
    stamp(
      geo.sphere,
      toon(PALETTE.trunk),
      x + (artRand() - 0.5) * 0.6 * s,
      7 * s,
      z + (artRand() - 0.5) * 0.6 * s,
      0.23 * s,
    );
}
function fern(x, z, s = 1) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    stamp(
      geo.leaf,
      toon(k % 2 ? PALETTE.moss : PALETTE.leaf),
      x + Math.sin(a) * 0.45 * s,
      0.35 * s,
      z + Math.cos(a) * 0.45 * s,
      0.22 * s,
      0.12 * s,
      1.1 * s,
      -0.4,
      a,
      0,
    );
  }
}
function brazier(x, z) {
  stoneBlock(x, 0.4, z, 0.7, 0.8, 0.7, PALETTE.edge);
  stamp(geo.cylinder, toon(PALETTE.gold), x, 0.95, z, 0.44, 0.3, 0.44);
  const flame = new THREE.Group();
  flame.position.set(x, 1.3, z);
  mesh(geo.cone, new THREE.MeshBasicMaterial({ color: 0xffa23c }), flame, 0, 0, 0, 0.22, 0.8, 0.22);
  mesh(geo.cone, new THREE.MeshBasicMaterial({ color: 0xffe8a0 }), flame, 0, -0.1, 0.05, 0.12, 0.5, 0.12);
  decorRoot.add(flame);
  worldObjects.flames.push(flame);
}
function makeGoose(parent, scale = 1) {
  const goose = new THREE.Group();
  parent.add(goose);
  goose.scale.setScalar(scale);
  const gold = toon(PALETTE.gold),
    shade = toon(0xc4882d);
  mesh(geo.sphere, gold, goose, 0, 0.45, 0, 0.56, 0.43, 0.8, true);
  mesh(geo.sphere, shade, goose, 0.48, 0.51, -0.05, 0.12, 0.28, 0.48, true);
  mesh(geo.sphere, shade, goose, -0.48, 0.51, -0.05, 0.12, 0.28, 0.48, true);
  mesh(geo.cylinder, gold, goose, 0, 0.98, -0.4, 0.16, 0.78, 0.16, true);
  mesh(geo.sphere, gold, goose, 0, 1.4, -0.47, 0.29, 0.26, 0.32, true);
  mesh(geo.cone, toon(0xee8c32), goose, 0, 1.36, -0.86, 0.15, 0.4, 0.15, true).rotation.x = -Math.PI / 2;
  for (let s of [-1, 1]) {
    mesh(geo.sphere, inkMat, goose, s * 0.235, 1.46, -0.61, 0.055);
    box(goose, shade, s * 0.23, 0.07, 0.06, 0.26, 0.07, 0.45);
  }
  return goose;
}
function makeExplorer(colorIndex = 0, enemy = false, boss = false) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = "rig";
  root.add(rig);
  const jacket = toon(
    enemy ? (boss ? 0x754b3e : 0x756b4a) : [0x966241, 0x398985, 0xb37046, 0x71855a][colorIndex % 4],
  );
  const shirt = toon(enemy ? 0xbeb485 : 0xead3a4),
    skin = toon([0xd59b68, 0xb87b55, 0xdfb37a, 0x9a674e][colorIndex % 4]),
    pants = toon(enemy ? 0x434c45 : 0x5b6256),
    boot = toon(0x383d35),
    band = toon(enemy ? 0x6a312a : [0xd7a445, 0xe3b871, 0x5aada6, 0xc37b5d][colorIndex % 4]);
  const body = new THREE.Group();
  body.name = "torso";
  body.position.y = 1.03;
  rig.add(body);
  box(body, jacket, 0, 0.09, 0, 0.68, 0.69, 0.36, true);
  box(body, shirt, 0, 0.13, -0.193, 0.27, 0.56, 0.045);
  box(body, boot, 0, -0.16, -0.01, 0.72, 0.1, 0.4);
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 1.67, 0);
  rig.add(head);
  mesh(geo.sphere, skin, head, 0, 0, 0, 0.27, 0.31, 0.25, true);
  box(head, toon(0x4b3e31), 0, 0.11, 0.07, 0.49, 0.2, 0.33);
  for (let s of [-1, 1]) box(head, toon(0x16272b), s * 0.1, 0.02, -0.24, 0.04, 0.055, 0.02);
  box(head, skin, 0, -0.02, -0.29, 0.08, 0.09, 0.12);
  if (!enemy || boss) {
    mesh(geo.cylinder, toon(enemy ? 0x594a3a : 0x9c7443), head, 0, 0.27, 0, 0.46, 0.075, 0.4, true);
    mesh(geo.cylinder, toon(enemy ? 0x594a3a : 0x9c7443), head, 0, 0.4, 0, 0.29, 0.25, 0.27, true);
    mesh(geo.cylinder, band, head, 0, 0.3, 0, 0.295, 0.055, 0.275);
  } else {
    mesh(geo.cylinder, toon(0x665d45), head, 0, 0.27, 0, 0.31, 0.16, 0.3, true);
    box(head, boot, 0, 0.23, -0.3, 0.5, 0.05, 0.24);
  }
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = s < 0 ? "legL" : "legR";
    leg.position.set(s * 0.2, 0.77, 0);
    rig.add(leg);
    box(leg, pants, 0, -0.24, 0, 0.25, 0.53, 0.29, true);
    box(leg, boot, 0, -0.57, -0.06, 0.29, 0.17, 0.43, true);
    const arm = new THREE.Group();
    arm.name = s < 0 ? "armL" : "armR";
    arm.position.set(s * 0.46, 1.32, 0);
    rig.add(arm);
    box(arm, jacket, 0, -0.22, 0, 0.24, 0.43, 0.27, true);
    mesh(geo.sphere, skin, arm, 0, -0.49, -0.015, 0.135, 0.16, 0.13, true);
  }
  const satchel = box(rig, toon(0x6b4d32), 0.38, 0.84, 0.2, 0.29, 0.4, 0.22, true);
  satchel.rotation.z = -0.15;
  box(rig, band, -0.1, 1.08, -0.21, 0.075, 0.8, 0.04).rotation.z = -0.55;
  const gun = new THREE.Group();
  gun.name = "gun";
  rig.getObjectByName("armL").add(gun);
  box(gun, boot, 0, -0.5, -0.18, 0.12, 0.13, 0.48, true);
  box(gun, toon(0x7d6749), 0, -0.61, -0.06, 0.12, 0.21, 0.13);
  gun.visible = enemy;
  const loop = mesh(geo.torus, toon(0x61452e), rig, 0.48, 0.7, -0.1, 0.2, 0.3, 0.2);
  loop.rotation.y = 0.2;
  const mixer = new THREE.AnimationMixer(rig),
    clips = {};
  function clip(name, duration, tracks) {
    const c = new THREE.AnimationClip(name, duration, tracks);
    clips[name] = mixer.clipAction(c);
    return clips[name];
  }
  const track = (path, ts, vs) => new THREE.NumberKeyframeTrack(path, ts, vs);
  clip("idle", 2, [
    track("torso.position[y]", [0, 1, 2], [1.03, 1.065, 1.03]),
    track("head.rotation[z]", [0, 1, 2], [0.025, -0.025, 0.025]),
  ]);
  const ts = [0, 0.15, 0.3, 0.45, 0.6];
  clip("run", 0.6, [
    track("legL.rotation[x]", ts, [-0.65, 0, 0.65, 0, -0.65]),
    track("legR.rotation[x]", ts, [0.65, 0, -0.65, 0, 0.65]),
    track("armL.rotation[x]", ts, [0.6, 0, -0.6, 0, 0.6]),
    track("armR.rotation[x]", ts, [-0.6, 0, 0.6, 0, -0.6]),
    track("torso.position[y]", ts, [1.02, 1.09, 1.02, 1.09, 1.02]),
  ]);
  clip("whip", 0.43, [
    track("armR.rotation[x]", [0, 0.12, 0.21, 0.43], [-0.1, -2.9, -1.3, 0]),
    track("armR.rotation[z]", [0, 0.12, 0.21, 0.43], [0, -0.4, 0.55, 0]),
    track("torso.rotation[y]", [0, 0.12, 0.23, 0.43], [0, -0.4, 0.5, 0]),
  ]);
  clip("shoot", 0.25, [track("armL.rotation[x]", [0, 0.06, 0.13, 0.25], [-1.5, -1.8, -1.55, 0])]);
  clip("jump", 0.7, [
    track("legL.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -0.65, -0.4, 0]),
    track("legR.rotation[x]", [0, 0.2, 0.5, 0.7], [0, 0.35, 0.6, 0]),
    track("armR.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -2.2, -1.5, 0]),
    track("armL.rotation[x]", [0, 0.2, 0.5, 0.7], [0, -1.9, -1.1, 0]),
  ]);
  clip("roll", 0.5, [
    track("rig.rotation[x]", [0, 0.125, 0.25, 0.375, 0.5], [0, -Math.PI / 2, -Math.PI, -Math.PI * 1.5, -TAU]),
    track("rig.position[y]", [0, 0.2, 0.35, 0.5], [0, 0.5, 0.4, 0]),
  ]);
  clip("grapple", 1.15, [
    track("armR.rotation[x]", [0, 0.2, 0.85, 1.15], [-1, -3, -2.9, 0]),
    track("legL.rotation[x]", [0, 0.4, 0.85, 1.15], [0, -0.8, 0.3, 0]),
    track("legR.rotation[x]", [0, 0.4, 0.85, 1.15], [0, -0.6, 0.6, 0]),
  ]);
  clip("down", 0.7, [
    track("rig.rotation[z]", [0, 0.3, 0.7], [0, 1.2, Math.PI / 2]),
    track("rig.position[y]", [0, 0.4, 0.7], [0, -0.2, -0.2]),
  ]);
  clips.idle.play();
  let base = "idle",
    oneShot = "";
  return {
    root,
    rig,
    mixer,
    clips,
    gun,
    animate(name, move = 0, dt = 1 / 60) {
      const target = move > 0.2 ? "run" : "idle";
      if (target !== base) {
        clips[base].fadeOut(0.15);
        clips[target].reset().fadeIn(0.15).play();
        base = target;
      }
      clips.run.timeScale = Math.max(0.65, move / 5);
      if (name && name !== oneShot && clips[name]) {
        if (oneShot && clips[oneShot]) clips[oneShot].fadeOut(0.08);
        const a = clips[name];
        a.reset().setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = false;
        a.fadeIn(0.04).play();
        oneShot = name;
      }
      if (!name) oneShot = "";
      mixer.update(dt);
    },
  };
}
function makeSnake() {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  for (let i = 0; i < 7; i++) {
    const part = mesh(
      geo.sphere,
      toon(i % 2 ? 0x6e8050 : 0x9a9a57),
      body,
      Math.sin(i * 0.9) * 0.13,
      0.14,
      -i * 0.16,
      0.18 - i * 0.013,
      0.15,
      0.23,
      true,
    );
    part.name = "coil" + i;
  }
  const head = mesh(geo.sphere, toon(0x9da468), body, 0, 0.22, 0.2, 0.23, 0.2, 0.3, true);
  for (let s of [-1, 1]) mesh(geo.sphere, toon(0xf3bf57), head, s * 0.7, 0.25, 0.55, 0.1);
  const mixer = new THREE.AnimationMixer(body),
    tracks = [];
  for (let i = 0; i < 7; i++)
    tracks.push(
      new THREE.NumberKeyframeTrack(
        "coil" + i + ".position[x]",
        [0, 0.3, 0.6, 0.9, 1.2],
        [
          Math.sin(i) * 0.15,
          Math.sin(i + 1.5) * 0.15,
          Math.sin(i + 3) * 0.15,
          Math.sin(i + 4.5) * 0.15,
          Math.sin(i) * 0.15,
        ],
      ),
    );
  mixer.clipAction(new THREE.AnimationClip("slither", 1.2, tracks)).play();
  return {
    root,
    mixer,
    animate(name, move, dt) {
      mixer.update(dt);
    },
  };
}
function makePickup(kind, x, z, id) {
  const group = new THREE.Group();
  group.position.set(x, 0.55, z);
  decorRoot.add(group);
  if (kind === "treasure") {
    mesh(geo.rock, toon(PALETTE.gold), group, 0, 0.12, 0, 0.3, 0.42, 0.3, true);
    mesh(geo.torus, toon(PALETTE.gold), group, 0, 0.14, 0, 0.55, 0.55, 0.55).rotation.x = Math.PI / 2;
  } else {
    box(group, toon(kind === "health" ? 0xe2cfa4 : 0x72573a), 0, 0, 0, 0.7, 0.5, 0.5, true);
    if (kind === "health") {
      box(group, toon(0xaf5945), 0, 0.27, 0, 0.12, 0.02, 0.38);
      box(group, toon(0xaf5945), 0, 0.275, 0, 0.4, 0.02, 0.12);
    } else
      for (let i = 0; i < 3; i++)
        mesh(geo.cylinder, toon(0xe5b660), group, (i - 1) * 0.17, 0.35, 0, 0.05, 0.22, 0.05);
  }
  const aura = mesh(
    geo.torus,
    new THREE.MeshBasicMaterial({
      color: kind === "treasure" ? 0xffc654 : 0xaed7b9,
      transparent: true,
      opacity: 0.5,
    }),
    group,
    0,
    -0.47,
    0,
    0.65,
    0.65,
    0.65,
  );
  aura.rotation.x = Math.PI / 2;
  return { id, kind, x, z, mesh: group, taken: false };
}
function createEnemy(kind, x, z, id) {
  const actor = kind === "snake" ? makeSnake() : makeExplorer(2, true, kind === "boss");
  actorsRoot.add(actor.root);
  actor.root.position.set(x, 0, z);
  const maxHp = kind === "boss" ? 9 : kind === "snake" ? 2 : 3;
  const radius = kind === "snake" ? 0.3 : 0.36,
    half = kind === "snake" ? 0.12 : 0.46;
  const body = physics.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, half + radius + 0.06, z)
      .lockRotations()
      .setLinearDamping(6)
      .setCcdEnabled(true),
  );
  const collider = physics.createCollider(RAPIER.ColliderDesc.capsule(half, radius).setMass(2), body);
  const hpRoot = new THREE.Group();
  hpRoot.position.y = kind === "snake" ? 0.9 : 2.25;
  box(hpRoot, toon(0x253936), 0, 0, 0, 1, 0.085, 0.07);
  const bar = box(hpRoot, toon(kind === "boss" ? 0xf0ab52 : 0xc67652), 0, 0, -0.02, 0.95, 0.06, 0.08);
  actor.root.add(hpRoot);
  hpRoot.visible = false;
  return {
    id,
    kind,
    x,
    z,
    y: 0,
    angle: 0,
    hp: maxHp,
    maxHp,
    body,
    collider,
    actor,
    bar,
    hpRoot,
    cooldown: 1 + id * 0.2,
    stun: 0,
    telegraph: 0,
    dead: false,
    spawn: { x, z },
    height: half + radius + 0.06,
  };
}
function createWorld() {
  worldObjects = {
    mirrors: [],
    flames: [],
    particles: [],
    projectiles: [],
    enemies: [],
    pickups: [],
    traps: [],
    rubble: [],
    beams: [],
    door: null,
    sideDoor: null,
    boulder: null,
    goose: null,
  };
  ground(-10, 10, 14, -17, "sand");
  ground(-10, 10, -24, -58);
  ground(-12, 12, -58, -84);
  ground(10, 26, -70, -80);
  ground(16, 26, -80, -49);
  ground(16, 26, -45, 24, "sand");
  // The river is real negative space in the collision world.
  stamp(geo.box, toon(0x173d45), 0, -4, -20.5, 75, 1, 7);
  stamp(geo.box, toon(PALETTE.water), 0, -3.15, -20.5, 75, 0.08, 6.7);
  stamp(geo.box, toon(PALETTE.water), 21, -3.1, -47, 10, 0.08, 4);
  for (let k = 0; k < 32; k++)
    stamp(
      geo.box,
      toon(k % 2 ? 0x448a85 : 0x3a7779),
      -34 + k * 2.2,
      -3.09,
      -20.5 + (artRand() - 0.5) * 4,
      1.3,
      0.02,
      0.07,
    );
  for (const z of [-17, -24]) {
    stoneBlock(0, -0.25, z, 20, 0.6, 0.5, PALETTE.dark);
    for (const x of [-9, -6, 6, 9]) stoneBlock(x, 0.28, z, 1, 0.6, 0.7, PALETTE.stone);
  }
  for (let z = 9; z > -17; z -= 6)
    for (const x of [-10.4, 10.4]) {
      stoneBlock(x, 0.45, z, 1, 0.9, 4, PALETTE.dark);
      solid(x, 0.45, z, 1, 0.9, 4);
    }
  for (let z = -28; z > -82; z -= 6)
    for (const x of [-11, 11]) {
      if (x === 11 && z === -76) continue;
      stoneBlock(x, 1.2, z, 1.4, 2.4, 5.8, PALETTE.dark);
      solid(x, 1.2, z, 1.4, 2.4, 5.8);
      stoneBlock(x, 2.55, z, 1.7, 0.3, 5.9, PALETTE.light);
    }
  for (let z = -31; z > -80; z -= 12) for (const x of [-8.6, 8.6]) column(x, z, z < -58 ? 5 : 3.7);
  arch(0, -27, 13, 4.5);
  arch(0, -57.5, 6, 5.5);
  for (const x of [-7.8, 7.8]) {
    stoneBlock(x, 1.65, -57.5, 9, 3.3, 1.2, PALETTE.dark);
    solid(x, 1.65, -57.5, 9, 3.3, 1.2);
  }
  arch(0, -82, 13, 6);
  arch(21, 16, 8, 4);
  // Stepped skyline, reliefs and small shrines.
  for (let s = 0; s < 5; s++)
    stoneBlock(
      0,
      1 + s * 1.3,
      -86 - s * 0.9,
      29 - s * 3,
      1.3,
      6 + s * 0.4,
      s % 2 ? PALETTE.dark : PALETTE.stone,
    );
  for (let i = -3; i <= 3; i++) {
    stoneBlock(i * 3.5, 3, -83.7, 2.3, 2.9, 0.25, PALETTE.light);
    stamp(geo.rock, toon(PALETTE.gold), i * 3.5, 3.1, -83.4, 0.65, 0.85, 0.1, 0, Math.PI / 4);
  }
  for (let z = -76; z < 18; z += 6)
    for (const x of [15.5, 26.5]) {
      if (x === 15.5 && z === -76) continue;
      stoneBlock(x, 0.65, z, 1, 1.3, 5.8, PALETTE.dark);
      solid(x, 0.65, z, 1, 1.3, 5.8);
      if (z % 12 === -4) column(x, z, 3.2);
    }
  for (let z = -80; z < 18; z += 14) {
    brazier(25.4, z);
    stamp(geo.cone, toon(PALETTE.gold), 16.8, 0.12, z + 3, 0.35, 0.05, 0.6, 0, Math.PI);
  }
  for (let i = 0; i < 45; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * (13 + artRand() * 16),
      z = 18 - artRand() * 108;
    if (x > 14 && x < 28 && z > -81 && z < 26) continue;
    palm(x, z, 0.7 + artRand() * 0.65);
    for (let k = 0; k < 2; k++) fern(x + (artRand() - 0.5) * 5, z + (artRand() - 0.5) * 4, 0.7 + artRand());
  }
  for (let i = 0; i < 65; i++) {
    const side = i % 2 ? 1 : -1,
      z = 12 - artRand() * 90;
    fern(side * (8.7 + artRand() * 2), z, 0.6 + artRand() * 0.7);
  }
  for (let i = 0; i < 30; i++) {
    const x = -9 + artRand() * 18,
      z = 10 - artRand() * 90;
    if (Math.abs(x) < 4 || z < -70 || Math.abs(z + 20) < 6) continue;
    stamp(
      geo.rock,
      toon(i % 2 ? PALETTE.dark : PALETTE.moss),
      x,
      0.15,
      z,
      0.2 + artRand() * 0.5,
      0.3 + artRand() * 0.4,
      0.4,
      0,
      artRand() * 4,
    );
  }
  // Camp at the start, including a route map and a very optimistic exit sign.
  stamp(geo.cone, toon(0xd7bd80), -6, 1.3, 9, 2.4, 2.7, 2.1, 0, Math.PI / 4);
  stoneBlock(-6, 0.05, 8, 3, 0.1, 2, 0x3d5446);
  for (let x of [-7.5, -6, -4.5]) {
    stoneBlock(x, 0.35, 10.4, 0.9, 0.7, 0.8, 0x74563a);
  }
  const sign = makeLabel("QUINN & CO.  ·  BASE CAMP", 6.2, "#e9d3a0", 31);
  sign.position.set(-5, 2.8, 10);
  decorRoot.add(sign);
  const anchor = new THREE.Group();
  anchor.position.set(0, 6.5, -20.5);
  mesh(geo.torus, toon(PALETTE.gold), anchor, 0, 0, 0, 0.8, 0.8, 0.8, true);
  mesh(geo.cylinder, toon(PALETTE.edge), anchor, 0, 1.8, 0, 0.12, 2.8, 0.12);
  decorRoot.add(anchor);
  worldObjects.anchor = anchor;
  const marker = makeLabel("WHIP ANCHOR", 3.6, "#ffd080", 43);
  marker.position.set(0, 8, -20.5);
  decorRoot.add(marker);
  // Light puzzle. Cardinal routes are legible both from beams and the expedition journal.
  const mirrorData = [
    [-6, -36, 0, 1, "I"],
    [6, -36, 2, 0, "II"],
    [6, -49, 1, 3, "III"],
  ];
  mirrorData.forEach(([x, z, rotation, correct, label], id) => {
    const base = new THREE.Group();
    base.position.set(x, 0, z);
    decorRoot.add(base);
    box(base, toon(PALETTE.dark), 0, 0.3, 0, 1.65, 0.6, 1.65, true);
    mesh(geo.cylinder, toon(PALETTE.stone), base, 0, 0.9, 0, 0.48, 1, 0.48, true);
    const rotor = new THREE.Group();
    rotor.position.y = 1.8;
    base.add(rotor);
    mesh(geo.torus, toon(PALETTE.gold), rotor, 0, 0, 0, 0.66, 0.66, 0.66, true);
    const mirror = mesh(
      geo.cylinder,
      toon(0x9ed9ca, { emissive: 0x1d4b48, emissiveIntensity: 0.4 }),
      rotor,
      0,
      0,
      0,
      0.53,
      0.08,
      0.53,
    );
    mirror.rotation.x = Math.PI / 2;
    const arrow = mesh(geo.cone, toon(PALETTE.gold), rotor, 0, 0.02, -0.92, 0.18, 0.5, 0.18);
    arrow.rotation.x = -Math.PI / 2;
    const text = makeLabel(label, 1.3);
    text.position.set(0, 0.7, 0.88);
    base.add(text);
    solid(x, 0.75, z, 1.5, 1.5, 1.5);
    worldObjects.mirrors.push({ id, x, z, rotation, correct, rotor, base, powered: false });
  });
  const receiver = new THREE.Group();
  receiver.position.set(0, 0, -49);
  decorRoot.add(receiver);
  box(receiver, toon(PALETTE.dark), 0, 0.35, 0, 1.2, 0.7, 1.2, true);
  mesh(geo.cylinder, toon(PALETTE.stone), receiver, 0, 1.05, 0, 0.3, 1.1, 0.3, true);
  const receiverMaterial = new THREE.MeshBasicMaterial({ color: 0x9a8351 });
  worldObjects.receiver = mesh(geo.torus, receiverMaterial, receiver, 0, 1.82, 0, 0.67, 0.67, 0.67, true);
  solid(0, 1, -49, 1.1, 2, 1.1);
  for (let z = -50.4; z > -56.5; z -= 1) stoneBlock(0, 0.013, z, 0.09, 0.025, 0.6, PALETTE.gold, false);
  const sun = new THREE.Group();
  sun.position.set(-6, 1.8, -28.8);
  mesh(geo.torus, toon(PALETTE.gold), sun, 0, 0, 0, 0.9, 0.9, 0.9);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    mesh(
      geo.cone,
      toon(PALETTE.gold),
      sun,
      Math.sin(a) * 1.2,
      Math.cos(a) * 1.2,
      0,
      0.12,
      0.4,
      0.12,
    ).rotation.z = -a;
  }
  decorRoot.add(sun);
  const plaque = makeLabel("FOLLOW THE SUN  ·  I → II → III → VAULT", 12, "#f0d49a", 29);
  plaque.position.set(0, 4.8, -28);
  decorRoot.add(plaque);
  // The sealed vault door moves on a native animation track.
  const door = new THREE.Group();
  door.name = "vaultDoor";
  door.position.set(0, 0, -57.5);
  box(door, toon(PALETTE.dark), 0, 2, 0, 5.8, 4.5, 0.8, true);
  for (let i = -1; i <= 1; i++) {
    box(door, toon(PALETTE.gold), i * 1.8, 2, -0.43, 0.14, 3.3, 0.07);
    mesh(geo.rock, toon(PALETTE.light), door, i * 1.8, 2, 0.45, 0.32, 0.65, 0.12);
  }
  decorRoot.add(door);
  const ds = solid(0, 2, -57.5, 5.8, 4.5, 0.8);
  const dm = new THREE.AnimationMixer(door);
  const dc = new THREE.AnimationClip("open", 2.1, [
    new THREE.NumberKeyframeTrack(".position[y]", [0, 2.1], [0, 5.5]),
  ]);
  worldObjects.door = {
    mesh: door,
    body: ds.body,
    collider: ds.collider,
    mixer: dm,
    action: dm.clipAction(dc),
  };
  for (const x of [-8, -4, 4, 8]) brazier(x, -54);
  for (const x of [-9, 9]) for (const z of [-64, -77]) brazier(x, z);
  const pedestal = new THREE.Group();
  pedestal.position.set(0, 0, -77);
  decorRoot.add(pedestal);
  box(pedestal, toon(PALETTE.dark), 0, 0.25, 0, 3, 0.5, 3, true);
  box(pedestal, toon(PALETTE.light), 0, 0.9, 0, 2, 1, 2, true);
  box(pedestal, toon(PALETTE.gold), 0, 1.46, 0, 2.3, 0.12, 2.3, true);
  worldObjects.goose = makeGoose(pedestal, 0.85);
  worldObjects.goose.position.y = 1.55;
  const gooseSign = makeLabel("THE GOLDEN GOOSE", 5.5, "#ffe0a0", 43);
  gooseSign.position.set(0, 4, -80);
  decorRoot.add(gooseSign);
  const side = new THREE.Group();
  side.position.set(11.2, 0, -74.8);
  box(side, toon(PALETTE.dark), 0, 1.7, 0, 0.7, 3.4, 5, true);
  box(side, toon(PALETTE.gold), -0.4, 1.7, 0, 0.05, 2.2, 0.25);
  decorRoot.add(side);
  const sb = solid(11.2, 1.7, -74.8, 0.7, 3.4, 5);
  worldObjects.sideDoor = { mesh: side, body: sb.body, collider: sb.collider };
  const escapeSign = makeLabel("RIVER EXIT  →", 4.3, "#f0d89f", 42);
  escapeSign.position.set(5.5, 3.1, -76);
  decorRoot.add(escapeSign);
  for (const [x, z, kind, id] of [
    [-7, -10, "treasure", 0],
    [-7, -48, "treasure", 1],
    [7, -79, "treasure", 2],
    [6, -28, "health", 3],
    [-7, -63, "health", 4],
    [23, -31, "health", 5],
    [4, 0, "ammo", 6],
    [-4, -52, "ammo", 7],
    [24, -65, "ammo", 8],
    [7, -66, "ammo", 9],
  ])
    worldObjects.pickups.push(makePickup(kind, x, z, id));
  for (const [kind, x, z] of [
    ["snake", -4, -3],
    ["snake", 4, -9],
    ["snake", -4, -28],
    ["hunter", 3, -31],
    ["hunter", -5, -44],
    ["hunter", 4, -63],
    ["hunter", -6, -70],
    ["boss", 0, -69],
  ])
    worldObjects.enemies.push(createEnemy(kind, x, z, worldObjects.enemies.length));
  const trapData = [
    [-6, "dart", "main"],
    [-31, "dart", "main"],
    [-51, "spike", "main"],
    [-64, "dart", "escape"],
    [-55, "spike", "escape"],
    [-25, "dart", "escape"],
    [-4, "spike", "escape"],
  ];
  trapData.forEach(([z, kind, zone], id) => {
    const cx = zone === "main" ? 0 : 21,
      w = zone === "main" ? 17 : 8,
      group = new THREE.Group();
    group.position.set(cx, 0, z);
    decorRoot.add(group);
    box(group, toon(0x655c45), 0, 0.025, 0, w, 0.05, 1.8);
    for (let x = -w / 2 + 0.4; x < w / 2; x += 0.7) {
      if (kind === "spike") mesh(geo.cone, toon(0x8f9784), group, x, -0.3, 0, 0.14, 0.8, 0.14);
      else {
        box(group, toon(0xd19a55), x, 0.065, -0.55, 0.36, 0.05, 0.08);
        box(group, toon(0xd19a55), x, 0.065, 0.55, 0.36, 0.05, 0.08);
      }
    }
    const warning = box(
      group,
      new THREE.MeshBasicMaterial({ color: 0xf38d4e, transparent: true, opacity: 0 }),
      0,
      0.09,
      0,
      w,
      0.02,
      1.7,
    );
    worldObjects.traps.push({
      id,
      z,
      kind,
      zone,
      mesh: group,
      warning,
      clock: id * 0.73,
      active: false,
      fired: false,
    });
    if (kind === "dart") {
      for (const side of [-1, 1]) {
        stoneBlock(cx + side * (w / 2 + 0.3), 1, z, 0.6, 2.1, 2.2, PALETTE.dark);
        for (let k = 0; k < 3; k++)
          stamp(
            geo.cylinder,
            toon(0x2f423b),
            cx + side * (w / 2 + 0.65),
            0.7 + k * 0.35,
            z,
            0.13,
            0.1,
            0.13,
            0,
            0,
            Math.PI / 2,
          );
      }
    }
  });
  for (const z of [-39, -17, 6]) {
    const x = 21 + (z === -17 ? 1.8 : -1.6);
    const body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 0.55, z).setLinearDamping(1),
    );
    physics.createCollider(RAPIER.ColliderDesc.cuboid(0.7, 0.55, 0.65).setMass(5), body);
    const obj = box(decorRoot, toon(0x9c7751), x, 0.55, z, 1.4, 1.1, 1.3, true);
    worldObjects.rubble.push({ body, mesh: obj });
  }
  const boulderMesh = mesh(geo.rock, toon(0x8c8d72), actorsRoot, 21, 2.7, -82, 2.6, 2.6, 2.6, true);
  boulderMesh.visible = false;
  const bb = physics.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(21, 2.6, -82),
  );
  const bc = physics.createCollider(RAPIER.ColliderDesc.ball(2.6).setFriction(1), bb);
  bc.setEnabled(false);
  worldObjects.boulder = { mesh: boulderMesh, body: bb, collider: bc, z: -82, active: false };
  // A waiting launch, the unmistakable destination of the escape.
  const boat = new THREE.Group();
  boat.position.set(21, -0.1, 28);
  decorRoot.add(boat);
  box(boat, toon(0x624e38), 0, 0.2, 0, 3.8, 0.7, 6, true);
  box(boat, toon(0xddd0a2), 0, 0.8, -1, 3.4, 0.7, 2.2, true);
  box(boat, toon(0x3b6965), 0, 1.1, -1, 2.8, 0.3, 1.8);
  mesh(geo.cone, toon(0x624e38), boat, 0, 0.2, 3.2, 2, 2.4, 2, true).rotation.x = Math.PI / 2;
  const escapeFlag = makeLabel("HOME. MORE OR LESS.", 6.5, "#ffe1a0", 37);
  escapeFlag.position.set(21, 4, 23);
  decorRoot.add(escapeFlag);
  finishStatic();
  updateMirrors(true);
}
function updateMirrors(instant = false) {
  if (!worldObjects) return;
  for (const beam of worldObjects.beams) {
    decorRoot.remove(beam);
    beam.geometry.dispose();
    beam.material.dispose();
  }
  worldObjects.beams = [];
  const mirrors = worldObjects.mirrors;
  let powered = true;
  const add = (a, b, hot) => {
    const line = lineBetween(
      new THREE.Vector3(a.x, 1.82, a.z),
      new THREE.Vector3(b.x, 1.82, b.z),
      hot ? 0xffdf85 : 0x56817a,
      hot ? 0.98 : 0.3,
    );
    decorRoot.add(line);
    worldObjects.beams.push(line);
    if (hot) {
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, dist(a, b), 6),
        new THREE.MeshBasicMaterial({ color: 0xffd071, transparent: true, opacity: 0.7 }),
      );
      glow.position.set((a.x + b.x) / 2, 1.82, (a.z + b.z) / 2);
      glow.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(),
      );
      decorRoot.add(glow);
      worldObjects.beams.push(glow);
    }
  };
  add({ x: -6, z: -28.8 }, mirrors[0], true);
  worldObjects.receiver.material.color.setHex(
    mirrors.every((m) => m.rotation === m.correct) ? 0xffdc7d : 0x9a8351,
  );
  mirrors.forEach((m, i) => {
    m.powered = powered;
    if (instant) m.rotor.rotation.y = (-m.rotation * Math.PI) / 2;
    const directions = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ],
      v = directions[m.rotation];
    const correct = m.rotation === m.correct;
    const next = correct
      ? i < 2
        ? mirrors[i + 1]
        : { x: 0, z: -49 }
      : { x: m.x + v[0] * 4, z: m.z + v[1] * 4 };
    add(m, next, powered);
    powered = powered && correct;
  });
}
