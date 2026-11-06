import * as THREE from 'three';

const ink = new THREE.LineBasicMaterial({ color: 0x202528, transparent: true, opacity: 0.85 });
const palette = new Map();
function material(color) {
  if (!palette.has(color)) palette.set(color, new THREE.MeshToonMaterial({ color }));
  return palette.get(color);
}
function mesh(parent, geometry, color, position = [0, 0, 0], outlined = true) {
  const object = new THREE.Mesh(geometry, material(color));
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  if (outlined) {
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), ink);
    object.add(edge);
  }
  parent.add(object);
  return object;
}
function box(parent, size, color, position, outlined = true) {
  return mesh(parent, new THREE.BoxGeometry(...size), color, position, outlined);
}
function ball(parent, radius, color, position, scale = [1, 1, 1], outlined = false) {
  const object = mesh(parent, new THREE.SphereGeometry(radius, 10, 7), color, position, outlined);
  object.scale.set(...scale);
  return object;
}
function cylinder(parent, top, bottom, height, color, position, sides = 10, outlined = true) {
  return mesh(parent, new THREE.CylinderGeometry(top, bottom, height, sides), color, position, outlined);
}
function group(parent, name, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  parent.add(object);
  return object;
}
function track(path, times, values) {
  return new THREE.NumberKeyframeTrack(path, times, values);
}

export function createExplorer(color = 0xb95b34, alternate = false) {
  const root = new THREE.Group();
  const body = group(root, 'body');
  const skin = alternate ? 0xb97b50 : 0xe6b076;
  const coat = color;
  const leather = alternate ? 0x35454d : 0x5f3c2d;
  const trousers = alternate ? 0xc8b78a : 0xb19a65;
  const shirt = 0xe9d9ad;
  box(body, [0.47, 0.47, 0.3], coat, [0, 1.08, 0]);
  box(body, [0.22, 0.33, 0.025], shirt, [0, 1.15, 0.165]);
  const lapelL = box(body, [0.12, 0.32, 0.04], leather, [-0.16, 1.16, 0.18]);
  lapelL.rotation.z = -0.2;
  const lapelR = box(body, [0.12, 0.32, 0.04], leather, [0.16, 1.16, 0.18]);
  lapelR.rotation.z = 0.2;
  box(body, [0.48, 0.065, 0.32], leather, [0, 0.86, 0]);
  box(body, [0.095, 0.08, 0.027], 0xd1a953, [0, 0.86, 0.18]);
  box(body, [0.045, 0.045, 0.031], leather, [0, 0.86, 0.196], false);
  box(body, [0.43, 0.12, 0.27], trousers, [0, 0.77, 0]);
  for (const sign of [-1, 1]) {
    const leg = group(body, sign < 0 ? 'legL' : 'legR', [sign * 0.13, 0.75, 0]);
    box(leg, [0.18, 0.42, 0.21], trousers, [0, -0.2, 0]);
    box(leg, [0.19, 0.17, 0.22], leather, [0, -0.47, 0]);
    box(leg, [0.21, 0.18, 0.32], 0x343332, [0, -0.61, 0.05]);
    box(leg, [0.22, 0.035, 0.33], 0x202528, [0, -0.7, 0.055]);
    const arm = group(body, sign < 0 ? 'armL' : 'armR', [sign * 0.31, 1.27, 0]);
    cylinder(arm, 0.105, 0.088, 0.39, coat, [0, -0.18, 0], 8);
    cylinder(arm, 0.09, 0.09, 0.06, leather, [0, -0.39, 0], 8);
    ball(arm, 0.09, skin, [0, -0.47, 0.015], [0.9, 1.1, 0.9], true);
  }
  const head = group(body, 'head', [0, 1.55, 0]);
  ball(head, 0.22, skin, [0, 0, 0], [0.85, 1.07, 0.88], true);
  ball(head, 0.065, skin, [-0.195, -0.025, 0]);
  ball(head, 0.065, skin, [0.195, -0.025, 0]);
  box(head, [0.038, 0.028, 0.025], 0x202528, [-0.075, 0.01, 0.183], false);
  box(head, [0.038, 0.028, 0.025], 0x202528, [0.075, 0.01, 0.183], false);
  ball(head, 0.046, skin, [0, -0.034, 0.2], [0.75, 0.85, 1]);
  box(head, [0.092, 0.017, 0.016], 0x644531, [0, -0.098, 0.17], false);
  box(head, [0.075, 0.021, 0.019], 0x4e3a29, [-0.074, 0.052, 0.178], false).rotation.z = -0.12;
  box(head, [0.075, 0.021, 0.019], 0x4e3a29, [0.074, 0.052, 0.178], false).rotation.z = 0.12;
  if (alternate) {
    ball(head, 0.245, 0x519998, [0, 0.13, -0.01], [1, 0.68, 0.95], true);
    cylinder(head, 0.235, 0.245, 0.07, 0x9dc5b3, [0, 0.1, 0], 12);
    const tail = box(body, [0.12, 0.45, 0.035], 0x519998, [0.15, 1.35, -0.23]);
    tail.rotation.z = -0.18;
    box(body, [0.37, 0.09, 0.37], 0x86b8ad, [0, 1.32, 0]);
  } else {
    cylinder(head, 0.43, 0.43, 0.045, 0x6c4730, [0, 0.155, 0], 16);
    const crown = cylinder(head, 0.22, 0.26, 0.25, 0x8e623b, [0, 0.3, -0.01], 10);
    crown.scale.z = 0.9;
    cylinder(head, 0.258, 0.265, 0.065, 0x3d3029, [0, 0.21, -0.01], 10).scale.z = 0.91;
    box(head, [0.07, 0.014, 0.15], 0x533a2a, [0, 0.434, -0.02], false);
    box(body, [0.28, 0.085, 0.32], 0xc2633e, [0, 1.33, 0]);
    const scarf = box(body, [0.12, 0.28, 0.04], 0xc2633e, [-0.12, 1.18, 0.205]);
    scarf.rotation.z = -0.12;
  }
  const strap = box(body, [0.065, 0.6, 0.035], leather, [-0.025, 1.08, 0.2]);
  strap.rotation.z = -0.58;
  const satchel = box(body, [0.27, 0.28, 0.15], alternate ? 0x876f44 : 0x8b6842, [-0.3, 0.78, -0.015]);
  satchel.rotation.z = -0.06;
  box(body, [0.25, 0.07, 0.17], leather, [-0.3, 0.91, -0.015]);
  box(body, [0.043, 0.05, 0.025], 0xd2ad61, [-0.3, 0.85, 0.08]);
  const coil = mesh(body, new THREE.TorusGeometry(0.115, 0.024, 5, 15), leather, [0.3, 0.78, 0.08]);
  coil.rotation.y = 0.35;
  cylinder(body, 0.028, 0.028, 0.19, 0x3b2922, [0.35, 0.88, 0.1], 7).rotation.z = -0.25;

  const mixer = new THREE.AnimationMixer(root);
  const idle = mixer.clipAction(new THREE.AnimationClip('idle-breathe', 2.4, [
    track('body.position[y]', [0, 1.2, 2.4], [0, 0.025, 0]),
    track('head.rotation[y]', [0, 0.9, 1.6, 2.4], [-0.035, 0.055, -0.035, -0.035]),
    track('armL.rotation[z]', [0, 1.2, 2.4], [0.045, 0.09, 0.045]),
    track('armR.rotation[z]', [0, 1.2, 2.4], [-0.045, -0.09, -0.045]),
  ]));
  const run = mixer.clipAction(new THREE.AnimationClip('expedition-run', 0.64, [
    track('body.position[y]', [0, 0.16, 0.32, 0.48, 0.64], [0, 0.065, 0, 0.065, 0]),
    track('legL.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [-0.6, 0, 0.6, 0, -0.6]),
    track('legR.rotation[x]', [0, 0.16, 0.32, 0.48, 0.64], [0.6, 0, -0.6, 0, 0.6]),
    track('armL.rotation[x]', [0, 0.32, 0.64], [0.5, -0.5, 0.5]),
    track('armR.rotation[x]', [0, 0.32, 0.64], [-0.5, 0.5, -0.5]),
    track('body.rotation[z]', [0, 0.16, 0.32, 0.48, 0.64], [-0.025, 0, 0.025, 0, -0.025]),
  ]));
  const lash = mixer.clipAction(new THREE.AnimationClip('whip-crack', 0.4, [
    track('armR.rotation[x]', [0, 0.08, 0.2, 0.4], [0, -2.55, -1.3, 0]),
    track('armR.rotation[y]', [0, 0.13, 0.25, 0.4], [0, -0.8, 0.4, 0]),
    track('body.rotation[y]', [0, 0.1, 0.23, 0.4], [0, -0.22, 0.22, 0]),
  ]));
  lash.setLoop(THREE.LoopOnce, 1);
  const tumble = mixer.clipAction(new THREE.AnimationClip('sand-roll', 0.48, [
    track('body.rotation[x]', [0, 0.12, 0.24, 0.36, 0.48], [0, -1.5, -3.14, -4.7, -6.283185]),
    track('body.position[y]', [0, 0.15, 0.32, 0.48], [0, 0.3, 0.3, 0]),
    track('legL.rotation[x]', [0, 0.1, 0.38, 0.48], [0, -1, -1, 0]),
    track('legR.rotation[x]', [0, 0.1, 0.38, 0.48], [0, -1, -1, 0]),
  ]));
  tumble.setLoop(THREE.LoopOnce, 1);
  const fluteAction = mixer.clipAction(new THREE.AnimationClip('charm-the-snakes', 1.1, [
    track('armL.rotation[x]', [0, 0.55, 1.1], [-1.8, -1.86, -1.8]),
    track('armL.rotation[z]', [0, 0.55, 1.1], [-0.5, -0.45, -0.5]),
    track('armR.rotation[x]', [0, 0.55, 1.1], [-1.8, -1.86, -1.8]),
    track('armR.rotation[z]', [0, 0.55, 1.1], [0.5, 0.45, 0.5]),
  ]));
  const fluteMesh = cylinder(body, 0.025, 0.025, 0.48, 0xe5c474, [0, 1.45, 0.31], 8);
  fluteMesh.rotation.z = Math.PI / 2;
  fluteMesh.visible = false;
  idle.play();
  run.play().setEffectiveWeight(0);
  fluteAction.play().setEffectiveWeight(0);
  let previousAttack = false;
  let previousRoll = false;
  let weight = 0;
  let fluteWeight = 0;
  return {
    group: root,
    mixer,
    update(dt, { moving = false, attack = false, rolling = false, flute = false } = {}) {
      dt = Math.max(0, Math.min(0.1, Number(dt) || 0));
      weight = THREE.MathUtils.damp(weight, moving && !rolling && !flute ? 1 : 0, 15, dt);
      fluteWeight = THREE.MathUtils.damp(fluteWeight, flute ? 1 : 0, 18, dt);
      run.setEffectiveWeight(weight);
      idle.setEffectiveWeight(Math.max(0, 1 - weight - fluteWeight));
      fluteAction.setEffectiveWeight(fluteWeight);
      if (attack && !previousAttack) lash.reset().setEffectiveWeight(1).play();
      if (rolling && !previousRoll) tumble.reset().setEffectiveWeight(1).play();
      previousAttack = attack;
      previousRoll = rolling;
      fluteMesh.visible = flute;
      mixer.update(dt);
      // The native roll clip rotates around the adventurer's waist.
      // Keeping this offset outside the clip lets idle and running share a rig.
      if (tumble.isRunning()) {
        body.position.y += 0.9 * (1 - Math.cos(body.rotation.x));
        body.position.z = -0.9 * Math.sin(body.rotation.x);
      } else body.position.z = 0;
    },
  };
}

export function createEnemy(kind = 'thief') {
  if (kind === 'snake') {
    const root = new THREE.Group();
    const body = group(root, 'serpent');
    const points = [];
    for (let i = 0; i < 18; i++) points.push(new THREE.Vector3(Math.sin(i * 0.65) * 0.27, 0.14 + i * 0.012, -0.8 + i * 0.072));
    mesh(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, 0.09, 6, false), 0x68834e, [0, 0, 0], true);
    const neck = group(body, 'neck', [0, 0.32, 0.43]);
    cylinder(neck, 0.095, 0.12, 0.3, 0x779556, [0, 0.12, 0], 7);
    const hood = ball(neck, 0.19, 0x6b884c, [0, 0.3, 0.02], [1.35, 1.1, 0.5], true);
    ball(neck, 0.14, 0x88a05e, [0, 0.32, 0.11], [1, 0.65, 1.2], true);
    for (const side of [-1, 1]) {
      ball(neck, 0.037, 0xffd26d, [side * 0.09, 0.36, 0.185]);
      box(neck, [0.012, 0.04, 0.015], 0x202528, [side * 0.09, 0.36, 0.215], false);
    }
    box(neck, [0.016, 0.012, 0.13], 0xb85c43, [0, 0.275, 0.27], false);
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(new THREE.AnimationClip('serpent-sway', 1.6, [
      track('neck.rotation[z]', [0, 0.4, 0.8, 1.2, 1.6], [-0.14, 0, 0.14, 0, -0.14]),
      track('serpent.rotation[y]', [0, 0.8, 1.6], [-0.12, 0.12, -0.12]),
    ])).play();
    return { group: root, mixer, update(dt, moving = true) { mixer.timeScale = moving ? 1.5 : 0.65; mixer.update(dt); } };
  }
  const actor = createExplorer(0x596263, true);
  const body = actor.group.getObjectByName('body');
  const head = actor.group.getObjectByName('head');
  // A wrapped mouth and long curved saber distinguish rival treasure hunters.
  box(head, [0.34, 0.14, 0.075], 0x405059, [0, -0.1, 0.17]);
  cylinder(head, 0.24, 0.25, 0.08, 0xc9b886, [0, 0.17, 0], 12);
  const arm = actor.group.getObjectByName('armR');
  const bladePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 0.16), new THREE.Vector3(0.04, 0.45, 0.26), new THREE.Vector3(0.1, 0.62, 0.24)];
  const blade = mesh(arm, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bladePoints), 9, 0.035, 4, false), 0xd6ddcc, [0, -0.48, 0.02]);
  blade.rotation.x = 0.7;
  box(arm, [0.2, 0.035, 0.06], 0xc7a55c, [0, -0.47, 0.025]);
  let elapsed = 0;
  return {
    group: actor.group,
    mixer: actor.mixer,
    update(dt, moving = true) {
      elapsed += dt;
      actor.update(dt, { moving });
      if (!moving) body.rotation.y += Math.sin(elapsed * 1.6) * dt * 0.04;
    },
  };
}

export function createWhip() {
  const root = new THREE.Group();
  const segments = [];
  const geometry = new THREE.CylinderGeometry(0.022, 0.028, 1, 5);
  const ropeMat = material(0x67432d);
  for (let i = 0; i < 24; i++) {
    const segment = new THREE.Mesh(geometry, ropeMat);
    segment.castShadow = true;
    root.add(segment);
    segments.push(segment);
  }
  const up = new THREE.Vector3(0, 1, 0);
  const delta = new THREE.Vector3();
  root.visible = false;
  return {
    group: root,
    update(progress) {
      const p = Math.max(0, Math.min(1, Number(progress) || 0));
      root.visible = p > 0 && p < 1;
      const reach = 0.4 + Math.sin(p * Math.PI) * 3.6;
      const points = [];
      for (let i = 0; i <= segments.length; i++) {
        const u = i / segments.length;
        points.push(new THREE.Vector3(Math.sin(u * 7 - p * 12) * 0.38 * u * (1 - p), 1.04 + Math.sin(u * Math.PI) * (0.7 - p * 0.45), 0.4 + u * reach));
      }
      segments.forEach((segment, i) => {
        const a = points[i];
        const b = points[i + 1];
        delta.subVectors(b, a);
        segment.position.copy(a).add(b).multiplyScalar(0.5);
        segment.quaternion.setFromUnitVectors(up, delta.clone().normalize());
        segment.scale.set(1 - i / 36, delta.length(), 1 - i / 36);
      });
    },
  };
}
