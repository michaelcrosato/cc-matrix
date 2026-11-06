import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  color, mix, smoothstep, positionWorld, cameraPosition, normalize, sub, length, sin, time, step, uniform,
} from 'three/tsl';
import { PALETTES } from '../data/palettes.js';
import { INK, LANE_GAP } from '../data/config.js';
import { makeInk } from './ink.js';
import { armIdle } from '../anim/clips.js';

const SEATS = [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700];

function rampTexture() {
  const stops = [96, 178, 255];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    data[i * 4] = stops[i];
    data[i * 4 + 1] = stops[i];
    data[i * 4 + 2] = stops[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, stops.length, 1);
  tex.format = THREE.RGBAFormat;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function toon(hex, ramp) {
  return new THREE.MeshToonNodeMaterial({ color: hex, gradientMap: ramp });
}

function mesh(geo, mat, parent, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeDoll(ramp, tint) {
  const root = new THREE.Group();
  const skin = toon(0xf2d3a8, ramp);
  const joint = toon(0xd9a86c, ramp);
  const cloth = toon(tint, ramp);
  const shorts = toon(0x2b4a6f, ramp);
  const ink = toon(INK, ramp);
  const white = toon(0xfff6e8, ramp);
  const pink = toon(0xf2a7b5, ramp);
  const foot = new THREE.SphereGeometry(0.1, 8, 6);
  const leg = new THREE.CapsuleGeometry(0.08, 0.3, 2, 6);
  const hip = new THREE.CapsuleGeometry(0.2, 0.16, 2, 8);
  const shirt = new THREE.CapsuleGeometry(0.21, 0.24, 2, 8);
  const head = new THREE.SphereGeometry(0.23, 10, 8);
  const band = new THREE.TorusGeometry(0.228, 0.03, 6, 12);
  const eye = new THREE.SphereGeometry(0.024, 6, 4);
  const shoulder = new THREE.SphereGeometry(0.075, 8, 6);
  const elbow = new THREE.SphereGeometry(0.06, 6, 5);
  const mitten = new THREE.SphereGeometry(0.07, 8, 6);
  const arm = new THREE.CapsuleGeometry(0.05, 0.22, 2, 6);
  const left = mesh(foot, white, root, -0.13, 0.06, 0);
  left.scale.set(1, 0.55, 1.5);
  const right = mesh(foot, white, root, 0.13, 0.06, 0);
  right.scale.set(1, 0.55, 1.5);
  mesh(leg, skin, root, -0.1, 0.28, 0);
  mesh(leg, skin, root, 0.1, 0.28, 0);
  const hips = mesh(hip, shorts, root, 0, 0.46, 0);
  hips.scale.set(1.05, 1, 0.85);
  const torso = mesh(shirt, cloth, root, 0, 0.78, 0);
  torso.scale.set(1, 1, 0.82);
  mesh(head, skin, root, 0, 1.28, 0);
  const headband = mesh(band, cloth, root, 0, 1.36, 0);
  headband.rotation.x = Math.PI / 2;
  mesh(eye, ink, root, -0.08, 1.31, 0.2);
  mesh(eye, ink, root, 0.08, 1.31, 0.2);
  const cheek = mesh(new THREE.SphereGeometry(0.04, 6, 4), pink, root, -0.12, 1.22, 0.18);
  cheek.scale.set(1, 0.6, 0.5);
  mesh(shoulder, joint, root, -0.26, 0.96, 0);
  mesh(shoulder, joint, root, 0.26, 0.96, 0);
  const armL = new THREE.Group();
  armL.name = 'arm';
  armL.position.set(-0.32, 0.9, 0);
  root.add(armL);
  const upper = mesh(arm, skin, armL, 0, -0.12, 0);
  upper.rotation.z = 0.4;
  mesh(elbow, joint, armL, -0.08, -0.28, 0);
  mesh(mitten, white, armL, -0.1, -0.4, 0);
  root.userData.mixer = new THREE.AnimationMixer(root);
  return root;
}

function makeTrudy(ramp) {
  const root = new THREE.Group();
  const body = new RoundedBoxGeometry(1.1, 0.42, 0.26, 2, 0.1);
  mesh(body, toon(0xf5b700, ramp), root, 0, 0.7, 0);
  const peg = new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6);
  mesh(peg, toon(0x8a5a32, ramp), root, -0.28, 0.36, 0);
  mesh(peg, toon(0x8a5a32, ramp), root, 0.28, 0.36, 0);
  const window = mesh(new THREE.BoxGeometry(0.56, 0.2, 0.05), toon(0x1a1420, ramp), root, 0, 0.74, 0.12);
  window.castShadow = false;
  const vial = mesh(new THREE.CapsuleGeometry(0.075, 0.36, 2, 6), toon(0xb9f26b, ramp), root, 0, 0.74, 0.16);
  vial.rotation.z = Math.PI / 2;
  const bubble = mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0xfffdf6, ramp), root, 0, 0.74, 0.2);
  bubble.scale.set(1, 0.7, 0.6);
  root.userData.bubble = bubble;
  mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0xb9f26b, ramp), root, -0.42, 0.74, 0.1);
  mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0xb9f26b, ramp), root, 0.42, 0.74, 0.1);
  return root;
}

function makeHeron(ramp) {
  const root = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), toon(0xf0a04a, ramp), root, 0, 0.52, 0);
  const body = mesh(new THREE.SphereGeometry(0.34, 10, 8), toon(0xa9c2d4, ramp), root, 0, 1.2, 0);
  body.scale.set(0.8, 0.92, 1.35);
  const wing = mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0x7e9cb4, ramp), root, 0.28, 1.2, 0);
  wing.scale.set(0.3, 0.7, 1);
  mesh(new THREE.SphereGeometry(0.115, 8, 6), toon(0xd6e3ec, ramp), root, 0, 2.05, 0.15);
  const beak = mesh(new THREE.ConeGeometry(0.04, 0.22, 6), toon(0xf5d76e, ramp), root, 0, 2.02, 0.28);
  beak.rotation.x = Math.PI / 2;
  mesh(new THREE.ConeGeometry(0.05, 0.16, 5), toon(INK, ramp), root, 0, 2.2, 0.05);
  return root;
}

function makeBolster(ramp) {
  const root = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.72, 0.5, 3, 8), toon(0xb9806a, ramp), root, 0, 1.1, 0);
  body.scale.set(1.06, 1, 0.9);
  const band = mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 12), toon(0xc24d4d, ramp), root, 0, 1.85, 0);
  band.rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.08, 6, 5), toon(INK, ramp), root, -0.16, 1.55, 0.55);
  mesh(new THREE.SphereGeometry(0.08, 6, 5), toon(INK, ramp), root, 0.16, 1.55, 0.55);
  return root;
}

function makeGary(ramp) {
  const root = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0xfffdf8, ramp), root, 0, 0.3, 0);
  body.scale.set(1.2, 0.7, 0.8);
  const wing = mesh(new THREE.SphereGeometry(0.16, 6, 5), toon(0xc5ced6, ramp), root, 0.2, 0.32, 0);
  wing.scale.set(0.4, 0.15, 1);
  mesh(new THREE.ConeGeometry(0.04, 0.16, 5), toon(0xf5c542, ramp), root, 0, 0.32, 0.22);
  root.position.y = 2.2;
  return root;
}

function makeSkySea(palette) {
  const cols = {
    skyTop: new THREE.Color(palette.skyTop),
    skyMid: new THREE.Color(palette.skyMid),
    skyLow: new THREE.Color(palette.skyLow),
    sea: new THREE.Color(palette.sea),
    seaHi: new THREE.Color(palette.seaHi),
  };
  const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  const viewY = normalize(sub(positionWorld, cameraPosition)).y;
  skyMat.colorNode = mix(
    mix(color(cols.skyLow), color(cols.skyMid), smoothstep(0, 0.14, viewY)),
    color(cols.skyTop),
    smoothstep(0.1, 0.5, viewY),
  );
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 20, 12), skyMat);
  sky.frustumCulled = false;
  sky.castShadow = false;
  sky.receiveShadow = false;
  const seaMat = new THREE.MeshBasicNodeMaterial();
  const dist = length(positionWorld.xz);
  const wave = sin(dist.mul(0.08).add(time).add(sin(positionWorld.x.mul(0.02))));
  const band = step(0.86, wave);
  const seaC = mix(color(cols.sea), color(cols.seaHi), band);
  seaMat.colorNode = mix(seaC, color(cols.skyLow), smoothstep(60, 260, dist));
  const sea = new THREE.Mesh(new THREE.CircleGeometry(590, 48), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.35;
  sea.receiveShadow = true;
  return { sky, sea, cols };
}

export async function createStage(canvas, opts = {}) {
  const session = !!opts.session;
  let renderer;
  let backend = 'webgpu';
  const base = { canvas, antialias: false, alpha: false };
  try {
    renderer = new THREE.WebGPURenderer({ ...base, forceWebGL: false });
    await renderer.init();
    if (!renderer.backend || renderer.backend.isWebGPUBackend !== true) backend = 'webgl2';
  } catch {
    renderer = new THREE.WebGPURenderer({ ...base, forceWebGL: true });
    await renderer.init();
    backend = 'webgl2';
  }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x8fb4e0, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
  camera.position.set(9, 6.5, 16);
  const target = new THREE.Vector3(0, 1.2, 0);
  camera.lookAt(target);

  const hemi = new THREE.HemisphereLight(0xfce8f0, 0x7c8bb5, 1.35);
  const sun = new THREE.DirectionalLight(0xffe6d8, 2.6);
  sun.position.set(12, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(session ? 512 : 2048, session ? 512 : 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(hemi, sun, sun.target);

  const ramp = rampTexture();
  let look = makeSkySea(PALETTES.dawn);
  scene.add(look.sky, look.sea);

  const island = new THREE.Group();
  const sand = mesh(new THREE.CylinderGeometry(22, 20, 1.2, 24), toon(0xf0d7a2, ramp), island, 0, -0.55, 0);
  sand.castShadow = false;
  const grass = mesh(new THREE.CylinderGeometry(15, 15, 0.2, 20), toon(0x7dbe6a, ramp), island, 0, 0.02, 0);
  grass.castShadow = false;
  const rock = mesh(new THREE.ConeGeometry(8, 10, 8), toon(0x8d7568, ramp), island, 0, -6, 0);
  rock.castShadow = false;
  if (!session) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tree = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), toon(0x8a5a32, ramp), tree, 0, 0.7, 0);
      mesh(new THREE.SphereGeometry(0.7, 8, 6), toon(0x3f8f4e, ramp), tree, 0, 1.7, 0);
      tree.position.set(Math.cos(a) * 12, 0, Math.sin(a) * 12);
      island.add(tree);
    }
    const light = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.7, 8), toon(i % 2 ? 0xf4efe4 : 0xc24d4d, ramp), light, 0, 0.4 + i * 0.7, 0);
    }
    mesh(new THREE.SphereGeometry(0.28, 8, 6), toon(0xfff1a8, ramp), light, 0, 3.3, 0);
    mesh(new THREE.ConeGeometry(0.7, 0.5, 8), toon(0x3b82f6, ramp), light, 0, 3.7, 0);
    light.position.set(-8, 0, -6);
    island.add(light);
    const hut = mesh(new RoundedBoxGeometry(2.2, 1.4, 2.2, 2, 0.08), toon(0xf08a5d, ramp), island, 6, 0.7, 4);
    void hut;
    const roof = mesh(new THREE.ConeGeometry(1.8, 0.8, 4), toon(0x1f8a8a, ramp), island, 6, 1.7, 4);
    roof.rotation.y = Math.PI / 4;
  }
  const jarGlass = new THREE.MeshBasicNodeMaterial({
    color: 0xe8fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.9, 10, 1, true), jarGlass);
  jar.position.set(3.2, 0.55, 2.2);
  island.add(jar);
  for (const y of [0.15, 0.45, 0.85]) {
    const ring = mesh(new THREE.TorusGeometry(0.42, 0.02, 4, 10), toon(INK, ramp), island, 3.2, y, 2.2);
    ring.rotation.x = Math.PI / 2;
  }
  scene.add(island);

  const trudy = makeTrudy(ramp);
  trudy.position.set(-2.2, 0, 1.4);
  scene.add(trudy);
  const heron = makeHeron(ramp);
  heron.position.set(4.5, 0, -2);
  scene.add(heron);
  const bolster = makeBolster(ramp);
  bolster.position.set(-5, 0, -3);
  scene.add(bolster);
  const gary = makeGary(ramp);
  gary.position.set(2, 2.4, -4);
  scene.add(gary);
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const cloud = mesh(new THREE.SphereGeometry(1.6, 8, 6), toon(0xfffdf8, ramp), scene, -8 + i * 6, 8 + (i % 2), -12);
    cloud.scale.set(1.8, 0.45, 1);
    cloud.castShadow = false;
    clouds.push(cloud);
  }

  const dolls = [0, 1, 2, 3].map((i) => {
    const doll = makeDoll(ramp, SEATS[i]);
    doll.position.set((i - 1.5) * 0.05, 0, 0);
    doll.visible = i === 0;
    scene.add(doll);
    armIdle(doll.userData.mixer, 'arm');
    return doll;
  });
  const ghosts = [0, 1, 2].map((i) => {
    const doll = makeDoll(ramp, 0xb9f26b);
    doll.visible = false;
    doll.position.set(2.4 + i, 0, -1.5);
    doll.scale.setScalar(0.92);
    scene.add(doll);
    return doll;
  });

  const ink = makeInk(renderer, scene, camera);
  let lost = null;
  const device = renderer.backend && renderer.backend.device;
  if (device && device.lost && typeof device.lost.then === 'function') {
    device.lost.then((info) => { lost = (info && info.message) || 'lost'; });
  }
  let frames = 0;
  let width = 0;
  let height = 0;
  const clock = new THREE.Clock();
  let shown = 'title';

  function resize(w, h, dpr) {
    const ratio = Math.min(dpr || 1, session ? 1 : 2);
    width = Math.max(1, Math.floor(w * ratio));
    height = Math.max(1, Math.floor(h * ratio));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    ink.u.near.value = camera.near;
    ink.u.far.value = camera.far;
  }

  function applyPalette(name) {
    const pal = PALETTES[name] || PALETTES.dawn;
    look.cols.skyTop.setHex(pal.skyTop);
    look.cols.skyMid.setHex(pal.skyMid);
    look.cols.skyLow.setHex(pal.skyLow);
    look.cols.sea.setHex(pal.sea);
    look.cols.seaHi.setHex(pal.seaHi);
    hemi.color.setHex(pal.hemiSky);
    hemi.groundColor.setHex(pal.hemiGround);
    hemi.intensity = pal.hemi;
    sun.color.setHex(pal.sun);
    sun.intensity = pal.sunIntensity;
  }

  function sync(state) {
    if (!state) return;
    shown = state.screen;
    applyPalette(state.palette || 'dawn');
    const playing = state.screen === 'play' || state.screen === 'checkinPlay' || state.screen === 'attract';
    island.visible = !playing || state.screen === 'attract';
    island.rotation.z = -(state.tilt || 0);
    const lanes = (state.event && state.event.lanes) || [];
    dolls.forEach((doll, i) => {
      const lane = lanes[i];
      const show = playing ? !!lane : i === 0;
      doll.visible = show;
      if (!show) return;
      const x = (i - (lanes.length - 1) / 2) * (playing ? LANE_GAP * 0.35 : 0);
      doll.position.set(x, lane && lane.fallen ? 0.2 : 0, 0);
      const cob = lane && lane.cob ? lane.cob : { x: 0, y: 0 };
      doll.rotation.z = -(cob.x || 0) * 0.45;
      doll.rotation.x = (cob.y || 0) * 0.45;
      if (lane && lane.fallen) doll.rotation.z = -1.1;
    });
    const ghostList = state.ghosts || [];
    ghosts.forEach((doll, i) => {
      const g = ghostList[i];
      doll.visible = !!g;
      if (!g) return;
      doll.rotation.z = -(g.lx || 0) * 0.02;
      doll.rotation.x = (g.lz || 0) * 0.02;
      if (g.f) doll.rotation.z = -1.1;
    });
    if (state.freeCam) camera.position.set(16, 10, 20);
    else if (playing && state.screen !== 'attract') camera.position.set(0.2, 3.4, 8.5);
    else camera.position.set(9, 6.5, 16);
    camera.lookAt(0, playing && state.screen !== 'attract' ? 1.1 : 1.2, 0);
    if (trudy.userData.bubble) {
      trudy.userData.bubble.position.x = Math.sin(frames * 0.05) * 0.12;
    }
  }

  function render(useInk = true) {
    const dt = Math.min(0.05, clock.getDelta());
    for (const doll of dolls) doll.userData.mixer.update(dt);
    const drift = clock.elapsedTime;
    clouds.forEach((cloud, i) => { cloud.position.x = -10 + ((i * 7 + drift * 0.4) % 28); });
    gary.position.x = Math.sin(drift * 0.3) * 3;
    try {
      if (useInk) ink.post.render();
      else renderer.render(scene, camera);
    } catch (err) {
      lost = lost || (err && err.message) || 'render failed';
      try { renderer.render(scene, camera); } catch { /* the device is already gone */ }
    }
    frames += 1;
  }

  resize(canvas.clientWidth || 1280, canvas.clientHeight || 720, 1);
  render(true);

  return {
    resize, sync, render, applyPalette,
    info() { return { backend, lost, frames, width, height }; },
    setInk(on) { ink.u.boil.value = on ? 0.5 : 0; ink.u.width.value = on ? 1.4 : 0.2; },
    shown() { return shown; },
  };
}
