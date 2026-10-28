import * as THREE from "three/webgpu";
import { pointOnCourse, roadStrip, sampleCourse } from "./courses.js";
import { outlineMaterialOptions } from "./look.js";
import { boxWorldPosition } from "./race.js";

const HELD_COLORS = {
  ricochet: 0xff5a36,
  homing: 0xff2d55,
  crownseeker: 0x6d5bff,
  slick: 0xffd60a,
  scatter: 0xffe066,
  phantom: 0xc77dff,
  spark: 0xff7a00,
  triSpark: 0xff9f1c,
  sparkStorm: 0xffb703,
  aegis: 0x9bf6ff,
  brownout: 0xdee2e6,
  pilfer: 0xb8f2e6,
};

function gradientTexture() {
  const data = new Uint8Array([
    42, 42, 48, 255,
    110, 110, 120, 255,
    186, 186, 196, 255,
    255, 255, 255, 255,
  ]);
  const texture = new THREE.DataTexture(data, 4, 1);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeMaterials(gradient) {
  const cache = new Map();
  function toon(color, side = THREE.FrontSide) {
    const key = `t${color}:${side}`;
    if (cache.has(key)) return cache.get(key);
    const material = new THREE.MeshToonNodeMaterial({ color, gradientMap: gradient, side });
    cache.set(key, material);
    return material;
  }
  function basic(color, side = THREE.FrontSide) {
    const key = `b${color}:${side}`;
    if (cache.has(key)) return cache.get(key);
    const material = new THREE.MeshBasicNodeMaterial({ color, side });
    material.side = side;
    cache.set(key, material);
    return material;
  }
  const outlineOptions = outlineMaterialOptions(THREE);
  return { toon, basic, outline: basic(outlineOptions.color, outlineOptions.side) };
}

function addOutline(mesh) {
  const shell = new THREE.Mesh(mesh.geometry, mesh.userData.outlineMaterial);
  shell.scale.setScalar(1.045);
  shell.castShadow = false;
  shell.receiveShadow = false;
  mesh.add(shell);
}

function ribbon(course, half, lift) {
  const strip = roadStrip(course, half, lift);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(strip.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(strip.normals, 3));
  geometry.setIndex(strip.indices);
  return geometry;
}

function wallRibbon(course, side, height) {
  const count = Math.max(24, Math.floor(course.length / 4));
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= count; i++) {
    const sample = sampleCourse(course, (i % count) * (course.length / count));
    const x = sample.x + sample.right.x * course.wallHalf * side;
    const z = sample.z + sample.right.z * course.wallHalf * side;
    positions.push(x, sample.y, z, x, sample.y + height, z);
    // Inward, toward the lane. Chase cameras sit inside the corridor.
    const nx = -sample.right.x * side;
    const nz = -sample.right.z * side;
    normals.push(nx, 0, nz, nx, 0, nz);
  }
  for (let i = 0; i < count; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

function paintMesh(geometry, material, shadows) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !!shadows;
  mesh.receiveShadow = true;
  return mesh;
}

function buildCircuit(scene, course, mats) {
  const grassSize = Math.max(course.bounds.maxX - course.bounds.minX, course.bounds.maxZ - course.bounds.minZ) + 80;
  const grass = paintMesh(new THREE.PlaneGeometry(grassSize, grassSize), mats.toon(course.grass), false);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.35;
  scene.add(grass);
  scene.add(paintMesh(ribbon(course, course.wallHalf, 0.02), mats.toon(course.shoulder), false));
  scene.add(paintMesh(ribbon(course, course.roadHalf, 0.08), mats.toon(course.road), false));
  const curbCount = Math.floor(course.length / 3);
  for (let i = 0; i < curbCount; i++) {
    const sample = sampleCourse(course, (i + 0.5) * (course.length / curbCount));
    const color = i % 2 === 0 ? 0xf4f1ea : 0xd62828;
    for (const side of [-1, 1]) {
      const curb = paintMesh(new THREE.BoxGeometry(0.45, 0.12, 1.3), mats.toon(color), false);
      curb.position.set(
        sample.x + sample.right.x * side * (course.roadHalf - 0.15),
        sample.y + 0.16,
        sample.z + sample.right.z * side * (course.roadHalf - 0.15),
      );
      curb.rotation.y = sample.heading;
      scene.add(curb);
    }
  }
  const wallMat = mats.toon(course.wall, THREE.DoubleSide);
  scene.add(paintMesh(wallRibbon(course, 1, 1.35), wallMat, true));
  scene.add(paintMesh(wallRibbon(course, -1, 1.35), wallMat, true));
  const span = Math.max(8, Math.floor(course.length / 14));
  for (let i = 0; i < span; i++) {
    const distance = (i + 0.5) * (course.length / span);
    const sample = sampleCourse(course, distance);
    if (sample.y > 1.4) {
      const pillar = paintMesh(new THREE.CylinderGeometry(0.45, 0.7, sample.y, 6), mats.toon(0x6d6258), true);
      pillar.position.set(sample.x, sample.y / 2, sample.z);
      scene.add(pillar);
    }
    if (sample.y < 2.2) {
      for (const side of [-1, 1]) {
        const tree = new THREE.Group();
        const trunk = paintMesh(new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6), mats.toon(0x6b3f2a), true);
        trunk.position.y = 0.7;
        const crown = paintMesh(new THREE.SphereGeometry(0.85 + (i % 3) * 0.15, 10, 8), mats.toon(i % 2 ? 0x3f8f46 : 0x67b35a), true);
        crown.position.y = 1.7;
        tree.add(trunk, crown);
        const spot = pointOnCourse(course, distance, side * (course.wallHalf + 3.4 + (i % 4)), 0);
        tree.position.set(spot.x, spot.y, spot.z);
        scene.add(tree);
        if (i % 4 === 0) {
          const rock = paintMesh(new THREE.SphereGeometry(0.55, 8, 6), mats.toon(0x8d8478), true);
          rock.scale.y = 0.55;
          const rockSpot = pointOnCourse(course, distance + 4, side * (course.wallHalf + 1.8), 0);
          rock.position.set(rockSpot.x, rockSpot.y + 0.2, rockSpot.z);
          scene.add(rock);
        }
      }
    }
  }
  const gate = sampleCourse(course, 0);
  const banner = new THREE.Group();
  for (const side of [-1, 1]) {
    const pole = paintMesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 6), mats.toon(0xf4f1ea), true);
    pole.position.set(gate.right.x * side * (course.roadHalf + 0.4), gate.y + 2.1, gate.right.z * side * (course.roadHalf + 0.4));
    banner.add(pole);
  }
  const sign = paintMesh(new THREE.BoxGeometry(course.roadHalf * 2.2, 0.7, 0.18), mats.toon(course.accent), true);
  sign.position.set(gate.x, gate.y + 3.6, gate.z);
  sign.rotation.y = gate.heading;
  banner.add(sign);
  scene.add(banner);
  const line = paintMesh(new THREE.BoxGeometry(course.roadHalf * 2, 0.05, 0.35), mats.basic(0xf8f4ea), false);
  line.position.set(gate.x, gate.y + 0.14, gate.z);
  line.rotation.y = gate.heading;
  scene.add(line);
}

function buildArena(scene, course, mats) {
  const floor = paintMesh(new THREE.PlaneGeometry(course.width + 8, course.depth + 8), mats.toon(course.road), false);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
  const wallH = 2.2;
  for (const [hx, hy, hz, x, y, z] of [
    [course.width / 2, wallH / 2, 0.45, 0, wallH / 2, course.depth / 2],
    [course.width / 2, wallH / 2, 0.45, 0, wallH / 2, -course.depth / 2],
    [0.45, wallH / 2, course.depth / 2, course.width / 2, wallH / 2, 0],
    [0.45, wallH / 2, course.depth / 2, -course.width / 2, wallH / 2, 0],
  ]) {
    const wall = paintMesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mats.toon(course.wall, THREE.DoubleSide), true);
    wall.position.set(x, y, z);
    scene.add(wall);
  }
  for (const obstacle of course.obstacles) {
    let mesh;
    if (obstacle.type === "cyl") {
      mesh = paintMesh(new THREE.CylinderGeometry(obstacle.r, obstacle.r, 2.4, 12), mats.toon(0xd7c4a2), true);
      mesh.position.set(obstacle.x, 1.2, obstacle.z);
    } else {
      mesh = paintMesh(new THREE.BoxGeometry(obstacle.hx * 2, 2.2, obstacle.hz * 2), mats.toon(0xb08968), true);
      mesh.position.set(obstacle.x, 1.1, obstacle.z);
    }
    scene.add(mesh);
  }
  for (let i = 0; i < 10; i++) {
    const lamp = paintMesh(new THREE.SphereGeometry(0.28, 8, 8), mats.basic(0xffd6a5), false);
    const angle = (i / 10) * Math.PI * 2;
    lamp.position.set(Math.cos(angle) * (course.width / 2 - 1), 2.6, Math.sin(angle) * (course.depth / 2 - 1));
    scene.add(lamp);
  }
}

function buildKart(raceKart, mats) {
  const stats = raceKart.stats;
  const body = stats.body;
  const group = new THREE.Group();
  group.rotation.order = "YXZ";
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(body[0], body[1], body[2]), mats.toon(stats.color));
  chassis.position.y = 0.42;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  chassis.userData.outlineMaterial = mats.outline;
  addOutline(chassis);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(body[0] * 0.62, body[1] * 0.55, body[2] * 0.28), mats.toon(stats.color));
  nose.position.set(0, 0.4, body[2] * 0.52);
  nose.castShadow = true;
  group.add(chassis, nose);
  const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 8);
  const wheels = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pivot = new THREE.Group();
    const wheel = new THREE.Mesh(wheelGeo, mats.toon(0x1c1c22));
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    pivot.add(wheel);
    pivot.position.set(sx * body[0] * 0.42, 0.28, sz * body[2] * 0.34);
    group.add(pivot);
    wheels.push(pivot);
  }
  const driver = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.26), mats.toon(stats.cloth));
  torso.position.y = 0.72;
  torso.castShadow = true;
  torso.userData.outlineMaterial = mats.outline;
  addOutline(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mats.toon(stats.accent));
  head.position.y = 1.05;
  head.castShadow = true;
  head.userData.outlineMaterial = mats.outline;
  addOutline(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), mats.basic(0x1b1b22));
  eye.position.set(0.07, 1.08, 0.16);
  const eye2 = eye.clone();
  eye2.position.x = -0.07;
  driver.add(torso, head, eye, eye2);
  if (stats.id === "pip") {
    for (const x of [-0.18, 0.18]) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mats.toon(stats.color));
      puff.position.set(x, 1.12, -0.02);
      driver.add(puff);
    }
  } else if (stats.id === "quill") {
    const quill = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mats.toon(0xfff1b0));
    quill.scale.set(0.45, 1.4, 0.45);
    quill.position.set(0, 1.32, -0.02);
    driver.add(quill);
  } else if (stats.id === "bramble") {
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.toon(0x1f8a4c));
    bush.position.set(0, 1.22, -0.04);
    driver.add(bush);
  } else {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.3), mats.toon(0x101428));
    cap.position.set(0, 1.22, 0);
    driver.add(cap);
  }
  group.add(driver);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicNodeMaterial({ color: 0xff7a00 }));
  flame.position.set(0, 0.35, -body[2] * 0.62);
  flame.visible = false;
  group.add(flame);
  const sparks = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mats.basic(i % 2 ? 0xfff3b0 : 0xff8c42));
    spark.position.set(0, 0.2, -0.8 - i * 0.22);
    sparks.add(spark);
  }
  sparks.visible = false;
  group.add(sparks);
  const held = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicNodeMaterial({ color: 0xffffff }));
  held.visible = false;
  group.add(held);
  const balloons = [];
  for (let i = 0; i < 3; i++) {
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mats.basic([0xff4d6d, 0xffd23f, 0x4cc9f0][i]));
    balloon.position.set((i - 1) * 0.28, 1.55, -0.1);
    balloon.visible = false;
    group.add(balloon);
    balloons.push(balloon);
  }
  group.userData = { wheels, driver, flame, sparks, held, balloons, outlineMaterial: mats.outline };
  return group;
}

export function buildScene(course, race) {
  const gradient = gradientTexture();
  const mats = makeMaterials(gradient);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(course.sky);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 20, 12), mats.basic(course.sky));
  sky.material.side = THREE.BackSide;
  sky.material.depthWrite = false;
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(course.id === "lantern-causeway" ? 0x8ea2ff : 0xfff2df, 0x3d4a32, course.id === "lantern-causeway" ? 0.45 : 0.9);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xffffff, course.id === "lantern-causeway" ? 0.22 : 0.32));
  const dir = new THREE.DirectionalLight(course.id === "lantern-causeway" ? 0xb9c7ff : 0xfff4e4, course.id === "lantern-causeway" ? 1.5 : 2.5);
  const cx = (course.bounds.minX + course.bounds.maxX) / 2;
  const cz = (course.bounds.minZ + course.bounds.maxZ) / 2;
  dir.position.set(cx + 30, 70, cz + 18);
  dir.target.position.set(cx, 0, cz);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  const span = Math.max(course.bounds.maxX - course.bounds.minX, course.bounds.maxZ - course.bounds.minZ) * 0.65 + 20;
  dir.shadow.camera.left = -span;
  dir.shadow.camera.right = span;
  dir.shadow.camera.top = span;
  dir.shadow.camera.bottom = -span;
  dir.shadow.camera.near = 10;
  dir.shadow.camera.far = 220;
  dir.shadow.bias = -0.0004;
  scene.add(dir);
  scene.add(dir.target);
  if (course.id === "lantern-causeway") {
    for (let i = 0; i < 6; i++) {
      const sample = sampleCourse(course, (i + 0.2) * (course.length / 6));
      const light = new THREE.PointLight(0xffb15a, 18, 28, 2);
      light.position.set(sample.x, sample.y + 3.2, sample.z);
      scene.add(light);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mats.basic(0xffd59a));
      bulb.position.copy(light.position);
      scene.add(bulb);
    }
  }
  if (course.kind === "circuit") buildCircuit(scene, course, mats);
  else buildArena(scene, course, mats);
  const karts = race.karts.map((kart) => {
    const mesh = buildKart(kart, mats);
    scene.add(mesh);
    return mesh;
  });
  const boxes = (race.boxes || []).map(() => {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats.toon(0xffd60a));
    shell.castShadow = true;
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), mats.basic(course.accent));
    group.add(shell, core);
    scene.add(group);
    return group;
  });
  const dynamics = new THREE.Group();
  scene.add(dynamics);
  const cone = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mats.toon(0xff7b54));
  cone.castShadow = true;
  scene.add(cone);
  const cameras = [0, 1, 2, 3].map(() => new THREE.PerspectiveCamera(68, 1, 0.1, 700));
  return { scene, camera: cameras[0], cameras, karts, boxes, dynamics, cone, gradient, course };
}

function syncList(group, count, factory) {
  while (group.children.length < count) group.add(factory());
  for (let i = 0; i < group.children.length; i++) group.children[i].visible = i < count;
}

export function animateScene(view, race, dt, time) {
  race.karts.forEach((kart, index) => {
    const mesh = view.karts[index];
    if (!mesh) return;
    const bob = Math.sin(time * (8 + Math.min(8, Math.abs(kart.speed) * 0.15)) + index) * 0.025;
    mesh.position.set(kart.x, kart.y + bob, kart.z);
    // Heading 0 travels +z. The nose sits on local +z. rotation.y = θ sends local +z to (sin θ, cos θ).
    mesh.rotation.y = kart.heading;
    mesh.rotation.z = -kart.steer * 0.14;
    mesh.rotation.x = kart.drifting ? kart.driftDir * -0.06 : 0;
    mesh.scale.setScalar(kart.eliminated ? 0.7 : kart.brownoutT > 0 ? 0.82 : 1);
    const spin = dt * (Math.abs(kart.speed) * 1.8 + (race.phase === "countdown" ? 2.2 : 0));
    for (const wheel of mesh.userData.wheels) wheel.rotation.x += spin;
    const driver = mesh.userData.driver;
    driver.rotation.z += (-kart.steer * 0.5 - driver.rotation.z) * 0.2;
    driver.position.y = 0.05 + Math.sin(time * 7 + index) * 0.03;
    const hot = kart.boostT > 0 || kart.miniTurboT > 0 || kart.stormT > 0 || kart.aegisT > 0;
    mesh.userData.flame.visible = hot;
    mesh.userData.flame.scale.setScalar(hot ? 0.7 + Math.sin(time * 32 + index) * 0.25 : 0.2);
    if (kart.aegisT > 0) mesh.userData.flame.material.color.setHex(0x9bf6ff);
    else mesh.userData.flame.material.color.setHex(0xff7a00);
    mesh.userData.sparks.visible = !!kart.drifting;
    mesh.userData.sparks.children.forEach((spark, n) => {
      spark.position.x = (kart.driftDir || 1) * (0.2 + Math.sin(time * 20 + n) * 0.08);
      spark.position.z = -0.9 - n * 0.18;
    });
    const held = mesh.userData.held;
    const showHeld = !!(kart.held || kart.roulette);
    held.visible = showHeld;
    if (showHeld) {
      const kind = kart.held ? kart.held.kind : "spark";
      held.material.color.setHex(kart.roulette ? 0xffffff : HELD_COLORS[kind] || 0xffffff);
      if (kart.trailing) held.position.set(0, 0.45, -1.55);
      else held.position.set(0, 1.35 + Math.sin(time * 4 + index) * 0.05, 0.15);
      held.rotation.y += dt * 2.4;
    }
    mesh.userData.balloons.forEach((balloon, n) => {
      balloon.visible = race.mode === "battle" && !kart.eliminated && n < kart.balloons;
      balloon.position.y = 1.55 + Math.sin(time * 3 + n) * 0.05;
    });
  });
  view.boxes.forEach((mesh, index) => {
    const box = race.boxes[index];
    if (!box) return;
    const pos = boxWorldPosition(race, box);
    mesh.visible = box.alive;
    mesh.position.set(pos.x, pos.y + Math.sin(time * 2.2 + index) * 0.1, pos.z);
    mesh.rotation.y += dt * 1.5;
    mesh.rotation.x = Math.sin(time * 1.4 + index) * 0.25;
  });
  const shots = race.projectiles || [];
  syncList(view.dynamics, shots.length + (race.hazards || []).length, () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicNodeMaterial({ color: 0xffffff }));
    return mesh;
  });
  shots.forEach((shot, index) => {
    const mesh = view.dynamics.children[index];
    mesh.visible = true;
    mesh.position.set(shot.x, shot.y || 0.55, shot.z);
    mesh.scale.setScalar(shot.kind === "crownseeker" ? 0.85 : 0.55);
    mesh.material.color.setHex(HELD_COLORS[shot.kind] || 0xff5a36);
  });
  (race.hazards || []).forEach((hazard, index) => {
    const mesh = view.dynamics.children[shots.length + index];
    mesh.visible = true;
    mesh.position.set(hazard.x, 0.35, hazard.z);
    mesh.scale.setScalar(hazard.kind === "phantom" ? 0.9 : 0.42);
    mesh.scale.y = hazard.kind === "slick" ? 0.28 : mesh.scale.x;
    mesh.material.color.setHex(hazard.kind === "phantom" ? 0xc77dff : 0xffd60a);
  });
}

export function frameCamera(camera, kart, mode, dt, width, height) {
  camera.aspect = Math.max(0.2, width / Math.max(1, height));
  camera.fov = mode === "bumper" ? 78 : 68;
  camera.updateProjectionMatrix();
  const back = mode === "bumper" ? 2.4 : mode === "far" ? 9.2 : 6.4;
  const heightLift = mode === "bumper" ? 1.35 : 2.7;
  const tx = kart.x - Math.sin(kart.heading) * back;
  const tz = kart.z - Math.cos(kart.heading) * back;
  const ty = kart.y + heightLift;
  const blend = 1 - Math.exp(-dt * 6);
  camera.position.x += (tx - camera.position.x) * blend;
  camera.position.y += (ty - camera.position.y) * blend;
  camera.position.z += (tz - camera.position.z) * blend;
  const look = mode === "bumper" ? 6 : 8;
  camera.lookAt(
    kart.x + Math.sin(kart.heading) * look,
    kart.y + 0.9,
    kart.z + Math.cos(kart.heading) * look,
  );
}

export function orbitCamera(camera, course, time, width, height) {
  camera.aspect = Math.max(0.2, width / Math.max(1, height));
  camera.fov = 62;
  camera.updateProjectionMatrix();
  const cx = (course.bounds.minX + course.bounds.maxX) / 2;
  const cz = (course.bounds.minZ + course.bounds.maxZ) / 2;
  const radius = course.kind === "arena" ? 48 : 62;
  camera.position.set(cx + Math.sin(time * 0.13) * radius, 22 + Math.sin(time * 0.2) * 3, cz + Math.cos(time * 0.13) * radius);
  camera.lookAt(cx, 2, cz);
}

export function disposeScene(view) {
  const geometries = new Set();
  const materials = new Set();
  view.scene.traverse((obj) => {
    if (obj.geometry) geometries.add(obj.geometry);
    if (obj.material) {
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      list.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  if (view.gradient) view.gradient.dispose();
}

export async function createRenderer(canvas) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = false;
  await renderer.init();
  return renderer;
}

const fitted = { width: 0, height: 0 };

export function fitBuffer(canvas, renderer) {
  const width = Math.max(1, Math.floor(canvas.clientWidth || window.innerWidth || 1));
  const height = Math.max(1, Math.floor(canvas.clientHeight || window.innerHeight || 1));
  if (renderer) {
    if (fitted.width !== width || fitted.height !== height) {
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      fitted.width = width;
      fitted.height = height;
    }
  } else if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height };
}

export function viewports(count, width, height) {
  if (count <= 1) return [{ x: 0, y: 0, w: width, h: height }];
  if (count === 2) {
    return [
      { x: 0, y: Math.floor(height / 2), w: width, h: Math.ceil(height / 2) },
      { x: 0, y: 0, w: width, h: Math.floor(height / 2) },
    ];
  }
  if (count === 3) {
    return [
      { x: 0, y: Math.floor(height / 2), w: Math.floor(width / 2), h: Math.ceil(height / 2) },
      { x: Math.floor(width / 2), y: Math.floor(height / 2), w: Math.ceil(width / 2), h: Math.ceil(height / 2) },
      { x: 0, y: 0, w: width, h: Math.floor(height / 2) },
    ];
  }
  return [
    { x: 0, y: Math.floor(height / 2), w: Math.floor(width / 2), h: Math.ceil(height / 2) },
    { x: Math.floor(width / 2), y: Math.floor(height / 2), w: Math.ceil(width / 2), h: Math.ceil(height / 2) },
    { x: 0, y: 0, w: Math.floor(width / 2), h: Math.floor(height / 2) },
    { x: Math.floor(width / 2), y: 0, w: Math.ceil(width / 2), h: Math.floor(height / 2) },
  ];
}
