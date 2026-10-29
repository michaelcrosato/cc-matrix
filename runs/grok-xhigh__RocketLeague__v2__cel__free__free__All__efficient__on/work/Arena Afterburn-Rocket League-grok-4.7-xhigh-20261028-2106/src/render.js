import { ARENA, BALL, CAR } from './constants.js';
import { carAxes } from './math3.js';
import { layoutViewports } from './layout.js';

/** A flat clear buffer differs from its corner by nothing. A scene does. */
export function paintStats(pixels, width, height) {
  const total = width * height;
  if (!pixels || total <= 0) return { painted: 0, total: 0, fraction: 0, variance: 0 };
  const bgR = pixels[0] || 0;
  const bgG = pixels[1] || 0;
  const bgB = pixels[2] || 0;
  let painted = 0;
  let sum = 0;
  let sumSq = 0;
  const n = Math.min(pixels.length, total * 4);
  for (let i = 0; i < n; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += y;
    sumSq += y * y;
    if (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) > 36) painted += 1;
  }
  const mean = sum / total;
  const variance = Math.max(0, sumSq / total - mean * mean);
  return { painted, total, fraction: painted / total, variance };
}

function blitReadback(pixels) {
  let canvas = document.getElementById('readback');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'readback';
    canvas.width = 64;
    canvas.height = 36;
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:40;image-rendering:pixelated;pointer-events:none;';
    document.body.append(canvas);
  }
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(64, 36);
  image.data.set(pixels.subarray ? pixels.subarray(0, 64 * 36 * 4) : pixels);
  ctx.putImageData(image, 0, 0);
}

function bands(THREE) {
  const steps = 4;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i += 1) data[i] = Math.round((i / (steps - 1)) * 255);
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

export function createView(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12162a);
  scene.fog = new THREE.Fog(0x12162a, 90, 210);

  const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
  renderer._getFallback = null;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(1);
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  renderer.setSize(viewW, viewH);
  renderer.setClearColor(0x12162a, 1);
  renderer.domElement.id = 'view';

  const gradient = bands(THREE);
  const toon = (color, extra = {}) =>
    new THREE.MeshToonNodeMaterial({ color, gradientMap: gradient, ...extra });
  const ink = new THREE.MeshBasicNodeMaterial({ color: 0x101218, side: THREE.BackSide });

  const hemi = new THREE.HemisphereLight(0xd7e4ff, 0x2a160f, 1.35);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(28, 48, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const blueLamp = new THREE.PointLight(0x3d7cff, 18, 48, 1.4);
  blueLamp.position.set(0, 8, -ARENA.length / 2 + 2);
  scene.add(blueLamp);
  const orangeLamp = new THREE.PointLight(0xff7424, 18, 48, 1.4);
  orangeLamp.position.set(0, 8, ARENA.length / 2 - 2);
  scene.add(orangeLamp);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.width, ARENA.length), toon(0x2f6b52));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const lineMat = toon(0xe7e2d6);
  const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, ARENA.length), lineMat);
  centerLine.position.y = 0.03;
  scene.add(centerLine);
  const midLine = new THREE.Mesh(new THREE.BoxGeometry(ARENA.width, 0.05, 0.28), lineMat);
  midLine.position.y = 0.03;
  scene.add(midLine);
  const circle = new THREE.Mesh(new THREE.RingGeometry(7.2, 7.6, 48), lineMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.04;
  scene.add(circle);

  function wall(x, y, z, w, h, d, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  const hx = ARENA.width / 2;
  const hz = ARENA.length / 2;
  const t = 1.4;
  wall(-hx - t / 2, ARENA.height / 2, 0, t, ARENA.height, ARENA.length + ARENA.goalDepth * 2, 0x2a3148);
  wall(hx + t / 2, ARENA.height / 2, 0, t, ARENA.height, ARENA.length + ARENA.goalDepth * 2, 0x2a3148);
  const mouth = ARENA.goalWidth / 2;
  const sideW = hx - mouth;
  for (const sign of [1, -1]) {
    const z = sign * (hz + t / 2);
    const color = sign < 0 ? 0x2450c8 : 0xc85a18;
    wall(-mouth - sideW / 2, ARENA.height / 2, z, sideW, ARENA.height, t, color);
    wall(mouth + sideW / 2, ARENA.height / 2, z, sideW, ARENA.height, t, color);
    wall(0, ARENA.goalHeight + (ARENA.height - ARENA.goalHeight) / 2, z, ARENA.goalWidth, ARENA.height - ARENA.goalHeight, t, color);
    const netMat = toon(sign < 0 ? 0x3d7cff : 0xff7424, { transparent: true, opacity: 0.28 });
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA.goalWidth, ARENA.goalHeight, ARENA.goalDepth),
      netMat,
    );
    net.position.set(0, ARENA.goalHeight / 2, sign * (hz + ARENA.goalDepth / 2));
    scene.add(net);
  }
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA.width, ARENA.length),
    toon(0x1a1e30, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ARENA.height;
  scene.add(ceiling);

  for (let i = 0; i < 12; i += 1) {
    const z = -hz + ((i + 0.5) * ARENA.length) / 12;
    const h = 2.2 + (i % 3) * 0.7;
    for (const side of [-1, 1]) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(7, h, ARENA.length / 12 - 0.35), toon(i % 2 ? 0x3a2a44 : 0x243044));
      stand.position.set(side * (hx + 6.5), h / 2, z);
      stand.castShadow = true;
      scene.add(stand);
    }
  }

  const padMeshes = [];
  function makePad(pad) {
    const color = pad.kind === 'big' ? 0xffd15a : 0x7dffe1;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(pad.kind === 'big' ? 1.5 : 0.85, pad.kind === 'big' ? 1.6 : 0.95, 0.18, 8),
      toon(color, { emissive: color, emissiveIntensity: 0.55 }),
    );
    mesh.position.set(pad.x, 0.1, pad.z);
    scene.add(mesh);
    padMeshes.push(mesh);
  }

  const ballHull = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius * 1.08, 20, 14), ink);
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 28, 18), toon(0xf7f4ee));
  ballMesh.castShadow = true;
  const ballBand = new THREE.Mesh(new THREE.TorusGeometry(BALL.radius * 0.92, 0.08, 8, 24), toon(0x222222));
  ballBand.rotation.x = Math.PI / 2;
  const ball = new THREE.Group();
  ball.add(ballHull, ballMesh, ballBand);
  scene.add(ball);

  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.18, 6, 5);
  for (let i = 0; i < 48; i += 1) {
    const mesh = new THREE.Mesh(sparkGeo, toon(0xffe08a, { emissive: 0xffe08a, emissiveIntensity: 0.8 }));
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({ mesh, vel: { x: 0, y: 0, z: 0 }, life: 0 });
  }

  const cameras = [0, 1, 2, 3].map(() => new THREE.PerspectiveCamera(68, 1, 0.15, 420));
  const menuCam = new THREE.PerspectiveCamera(64, viewW / viewH, 0.2, 500);
  const carGroups = [];

  function buildCar(team) {
    const color = team === 'blue' ? 0x2f6dff : 0xff6a1a;
    const group = new THREE.Group();
    group.rotation.order = 'YXZ';
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.48, 2.5), toon(color));
    body.castShadow = true;
    const bodyInk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.48, 2.5), ink);
    bodyInk.scale.setScalar(1.07);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.38, 1.05), toon(0x141820));
    cabin.position.set(0, 0.36, -0.15);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.55), toon(color));
    nose.position.set(0, 0.02, -1.15);
    const lampMat = toon(0xfff3c4, { emissive: 0xfff3c4, emissiveIntensity: 0.7 });
    const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.08), lampMat);
    const lampR = lampL.clone();
    lampL.position.set(-0.4, 0.12, -1.4);
    lampR.position.set(0.4, 0.12, -1.4);
    const wheels = [];
    const wheelMat = toon(0x1b1b1b);
    for (const [x, z] of [
      [-0.85, -0.85],
      [0.85, -0.85],
      [-0.85, 0.85],
      [0.85, 0.85],
    ]) {
      const mount = new THREE.Group();
      mount.position.set(x, -0.18, z);
      mount.rotation.z = Math.PI / 2;
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 10), wheelMat);
      mount.add(wheel);
      group.add(mount);
      wheels.push(wheel);
    }
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 1.1, 8),
      toon(0xffb15a, { emissive: 0xff7a1a, emissiveIntensity: 1 }),
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0, 1.55);
    flame.visible = false;
    const streak = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.8), toon(0xfff6d0, { emissive: 0xffe7a0, emissiveIntensity: 0.8 }));
    streak.position.set(0, -0.1, 1.7);
    streak.visible = false;
    group.add(bodyInk, body, cabin, nose, lampL, lampR, flame, streak);
    scene.add(group);
    return { group, wheels, flame, streak };
  }

  let worldRef = null;
  let clock = 0;

  function bind(world) {
    worldRef = world;
    for (const car of carGroups) car.group.removeFromParent();
    carGroups.length = 0;
    for (const mesh of padMeshes) mesh.removeFromParent();
    padMeshes.length = 0;
    for (const car of world.cars) carGroups.push(buildCar(car.team));
    for (const pad of world.pads) makePad(pad);
  }

  function burst(x, y, z, color) {
    let spawned = 0;
    for (const spark of sparks) {
      if (spark.life > 0) continue;
      spark.life = 0.55 + Math.random() * 0.35;
      spark.mesh.visible = true;
      spark.mesh.position.set(x, y, z);
      spark.mesh.material.color.set(color);
      spark.vel.x = (Math.random() - 0.5) * 16;
      spark.vel.y = 4 + Math.random() * 10;
      spark.vel.z = (Math.random() - 0.5) * 16;
      spawned += 1;
      if (spawned > 14) break;
    }
  }

  function update(world, dt, opts = {}) {
    clock += dt;
    world.cars.forEach((car, i) => {
      const view = carGroups[i];
      if (!view) return;
      view.group.visible = !car.demolished;
      view.group.position.set(car.pos.x, car.pos.y, car.pos.z);
      view.group.rotation.order = 'YXZ';
      view.group.rotation.set(car.pitch, car.yaw, car.roll);
      const spin = Math.hypot(car.vel.x, car.vel.z) * dt * 1.6;
      for (const wheel of view.wheels) wheel.rotation.y += spin;
      view.flame.visible = !!car.didBoost && !car.demolished;
      view.streak.visible = !!car.supersonic && !car.demolished;
    });
    ball.position.set(world.ball.pos.x, opts.showcase ? world.ball.pos.y + Math.sin(clock * 2) * 0.35 : world.ball.pos.y, world.ball.pos.z);
    ball.rotation.y += dt * 0.8;
    ball.rotation.x += world.ball.vel.z * dt * 0.05;
    world.pads.forEach((pad, i) => {
      const mesh = padMeshes[i];
      if (!mesh) return;
      mesh.position.y = pad.ready ? 0.12 + Math.sin(clock * 3 + i) * 0.04 : 0.02;
      mesh.material.emissiveIntensity = pad.ready ? 0.65 : 0.05;
      mesh.scale.setScalar(pad.ready ? 1 : 0.72);
    });
    for (const spark of sparks) {
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.vel.y -= 12 * dt;
      spark.mesh.position.x += spark.vel.x * dt;
      spark.mesh.position.y += spark.vel.y * dt;
      spark.mesh.position.z += spark.vel.z * dt;
      if (spark.life <= 0) spark.mesh.visible = false;
    }
  }

  function quats() {
    return carGroups.map((car) => {
      const q = car.group.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    menuCam.aspect = w / h;
    menuCam.updateProjectionMatrix();
    return { w, h };
  }

  function paint(list) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (list.length <= 1) {
      const camera = list[0];
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, w, h);
      renderer.autoClear = true;
      renderer.render(scene, camera);
      return;
    }
    renderer.autoClear = false;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
    renderer.clear();
    renderer.setScissorTest(true);
    const rects = layoutViewports(list.length, w, h);
    list.forEach((camera, i) => {
      const rect = rects[i];
      const y = h - (rect.y + rect.h);
      camera.aspect = rect.w / Math.max(1, rect.h);
      camera.updateProjectionMatrix();
      renderer.setViewport(rect.x, y, rect.w, rect.h);
      renderer.setScissor(rect.x, y, rect.w, rect.h);
      renderer.render(scene, camera);
    });
    renderer.setScissorTest(false);
    renderer.autoClear = true;
  }

  async function sample() {
    const target = new THREE.RenderTarget(64, 36);
    const camera = menuCam;
    const previous = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, 64, 36);
    renderer.autoClear = true;
    renderer.render(scene, camera);
    const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 64, 36);
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.autoClear = previous;
    target.dispose();
    const stats = paintStats(pixels, 64, 36);
    if (window.__AA && window.__AA.expose) blitReadback(pixels);
    return { ...stats, bufferW: renderer.domElement.width, bufferH: renderer.domElement.height };
  }

  return {
    THREE,
    renderer,
    scene,
    menuCam,
    cameras,
    bind,
    update,
    paint,
    resize,
    quats,
    burst,
    sample,
    get world() {
      return worldRef;
    },
  };
}

export function aimChase(camera, car, ball, ballCam) {
  const flat = carAxes(car.yaw, 0, 0).forward;
  let fx = flat.x;
  let fz = flat.z;
  if (ballCam) {
    const dx = ball.pos.x - car.pos.x;
    const dz = ball.pos.z - car.pos.z;
    const planar = Math.hypot(dx, dz);
    if (planar > 0.8) {
      fx = dx / planar;
      fz = dz / planar;
    }
  }
  camera.position.set(car.pos.x - fx * 9.4, car.pos.y + 3.9, car.pos.z - fz * 9.4);
  if (ballCam) camera.lookAt(ball.pos.x, ball.pos.y + 0.5, ball.pos.z);
  else camera.lookAt(car.pos.x + fx * 12, car.pos.y + 0.7, car.pos.z + fz * 12);
}

export function aimWide(camera, world, time) {
  const focus = world.ball.pos;
  camera.position.set(focus.x + Math.sin(time * 0.18) * 32, 18, focus.z + Math.cos(time * 0.18) * 32);
  camera.lookAt(focus.x, Math.max(1, focus.y), focus.z);
}

export function aimMenu(camera, time) {
  camera.position.set(Math.sin(time * 0.12) * 22, 16, Math.cos(time * 0.12) * 22);
  camera.lookAt(0, 0.4, 0);
}
