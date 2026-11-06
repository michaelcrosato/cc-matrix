import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import RAPIER from '@dimforge/rapier3d-compat';
import { createInk } from './ink.js';
import { toon, wetOrgan, paintCanvas, flipUVs } from './materials.js';
import { fieldToWorld, placeOrCamera, placeStoryCamera, pointerToField } from './camera.js';
import { bustFor } from './bust.js';
import { siteLook } from '../data/sites.js';

const KIND_COLOR = {
  shard: '#d8f4ff', pool: '#8e1d2a', bleeder: '#ff3355', gelZone: '#7dffa0',
  incision: '#2a120c', wound: '#6a2030', nodule: '#c46a2a', tumor: '#6a2040',
  adagio: '#5a1028', staccato: '#e8d56a', tremolo: '#d06a9a', legato: '#c4a0e8',
  crescendo: '#ff8844', fermata: '#88d0ff', coda: '#1a1028', note: '#f5f0e6',
  spore: '#9ad06a', scratch: '#6a1420', feeder: '#ffcc66', baton: '#e8e0c8',
  link: '#c8b0e0', tether: '#e8d0a0', hole: '#201018', egg: '#f0e6c8', nest: '#304028',
  injection: '#d8fff8', clamp: '#c0c8d0',
};

function displace(geo, organ) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let h = Math.exp(-(x * x + y * y) * 0.35) * 0.22;
    h += Math.sin(x * 6 + organ.length) * 0.015 + Math.sin(y * 9) * 0.012;
    if (organ === 'heart') h += Math.exp(-((x - 0.2) ** 2 + y * y) * 2) * 0.12;
    if (organ === 'brain') h += Math.sin(x * 14) * Math.cos(y * 12) * 0.03;
    if (organ === 'bowel') h += Math.sin(x * 10) * 0.04;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();
}

function makeOrgan(organ) {
  const look = siteLook(organ);
  const geo = new THREE.PlaneGeometry(3.6, 2.5, 64, 44);
  geo.rotateX(-Math.PI / 2);
  displace(geo, organ);
  const paint = paintCanvas(look.color);
  const beat = uniform(0);
  const mat = wetOrgan(paint.tex, beat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.userData.paint = paint;
  mesh.userData.beat = beat;
  return mesh;
}

function makeDrape() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.6, -2.1);
  shape.lineTo(2.6, -2.1);
  shape.lineTo(2.6, 2.1);
  shape.lineTo(-2.6, 2.1);
  shape.closePath();
  const hole = new THREE.Path();
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wob = 1 + Math.sin(a * 5) * 0.03;
    const x = Math.cos(a) * 1.5 * wob;
    const y = Math.sin(a) * 0.95 * wob;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.34, 0);
  const mesh = new THREE.Mesh(geo, toon({ color: '#17707A' }));
  mesh.receiveShadow = true;
  return mesh;
}

function toolMesh(kind) {
  const g = new THREE.Group();
  const metal = toon({ color: '#d5dde2' });
  const grip = toon({ color: '#2a3338' });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'forceps') {
    add(new THREE.BoxGeometry(0.03, 0.02, 0.28), metal, -0.03, 0, 0.1);
    add(new THREE.BoxGeometry(0.03, 0.02, 0.28), metal, 0.03, 0, 0.1);
  } else if (kind === 'defib') {
    add(new THREE.BoxGeometry(0.18, 0.05, 0.12), toon({ color: '#e8eef2' }), -0.2, 0, 0);
    add(new THREE.BoxGeometry(0.18, 0.05, 0.12), toon({ color: '#e8eef2' }), 0.2, 0, 0);
  } else {
    add(new THREE.BoxGeometry(0.04, 0.04, 0.34), kind === 'laser' ? toon({ color: '#e8443a' }) : metal, 0, 0, 0.08);
    add(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8), grip, 0, 0, -0.12);
  }
  g.userData.kind = kind;
  return g;
}

function entityMesh(kind) {
  const color = KIND_COLOR[kind] || '#f2f2f2';
  let geo;
  if (kind === 'baton' || kind === 'link' || kind === 'tether') geo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
  else if (kind === 'note') geo = new THREE.SphereGeometry(0.06, 8, 6);
  else if (kind === 'gelZone' || kind === 'pool') geo = new THREE.CircleGeometry(0.18, 12);
  else geo = new THREE.SphereGeometry(kind === 'coda' || kind === 'crescendo' ? 0.16 : 0.09, 10, 8);
  if (geo.attributes && !geo.attributes.normal) geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toon({ color }));
  if (kind === 'gelZone' || kind === 'pool') mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function skinnedAdagio() {
  const bones = [new THREE.Bone(), new THREE.Bone()];
  bones[0].position.y = 0;
  bones[1].position.y = 0.2;
  bones[0].add(bones[1]);
  const geo = new THREE.CapsuleGeometry(0.08, 0.28, 4, 8);
  const skinIndex = [];
  const skinWeight = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    skinIndex.push(y > 0 ? 1 : 0, 0, 0, 0);
    skinWeight.push(1, 0, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  const mesh = new THREE.SkinnedMesh(geo, toon({ color: KIND_COLOR.adagio }));
  const arm = new THREE.Skeleton(bones);
  mesh.add(bones[0]);
  mesh.bind(arm);
  mesh.userData.bone = bones[1];
  return mesh;
}

function storyRoom(set) {
  const g = new THREE.Group();
  const wall = toon({ color: set === 'roof' ? '#1a3040' : set === 'lab' ? '#243038' : '#12383e' });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 8), toon({ color: '#0e2c30' }));
  floor.position.y = -1.6;
  floor.receiveShadow = true;
  g.add(floor);
  const back = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.2), wall);
  back.position.set(0, 1.2, -3);
  g.add(back);
  if (set === 'corridor' || set === 'roof' || set === 'bay') {
    const win = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.08), toon({ color: '#8ec8d8' }));
    win.position.set(-3, 1.4, -2.8);
    g.add(win);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), toon({ color: '#fff2d0' }));
  lamp.position.set(0, 2.4, 1);
  lamp.name = 'room-lamp';
  g.add(lamp);
  return g;
}

export async function createView(canvas, { webgl = false } = {}) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: webgl });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let lost = false;
  renderer.onDeviceLost = () => { lost = true; };
  await renderer.init();
  const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B2529');
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  placeOrCamera(camera, 16 / 9);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa6b0, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2de, 1.9);
  sun.position.set(4, 8, 3);
  sun.castShadow = true;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const or = new THREE.Group();
  const drape = makeDrape();
  or.add(drape);
  let organ = makeOrgan('forearm');
  or.add(organ);
  const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.3, 16), toon({ color: '#f4efe4' }));
  lamp.name = 'lamp';
  function placeLamp(peek) {
    // The working field fills this 34° view. A full-size cone covers it.
    // Menus get a rim at the top; surgery keeps the mesh above the frame.
    if (peek) {
      lamp.position.set(0, 1.55, 0.15);
      lamp.scale.setScalar(0.35);
    } else {
      lamp.position.set(0, 2.55, -0.15);
      lamp.scale.setScalar(0.28);
    }
  }
  placeLamp(false);
  const lampRig = new THREE.Group();
  lampRig.add(lamp);
  or.add(lampRig);
  scene.add(or);

  const mixer = new THREE.AnimationMixer(lampRig);
  const track = new THREE.KeyframeTrack('.rotation[z]', [0, 1, 2], [0, 0.18, 0]);
  mixer.clipAction(new THREE.AnimationClip('swing', 2, [track])).play();

  const tips = new Map();
  const entities = new Map();
  const tools = ['scalpel', 'forceps', 'suction', 'gel', 'suture', 'laser', 'scanner', 'clamp', 'syringe', 'defib'];

  const bustScene = new THREE.Scene();
  bustScene.background = new THREE.Color('#10282c');
  const bustCam = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  bustCam.position.set(0, 0.2, 4.2);
  bustCam.lookAt(0, -0.2, 0);
  const bustLight = new THREE.DirectionalLight(0xfff2de, 2);
  bustLight.position.set(2, 3, 4);
  bustScene.add(bustLight, new THREE.HemisphereLight(0xffffff, 0x445055, 1));
  const bustRT = new THREE.RenderTarget(256, 256);
  let bust = bustFor('bea', { mouth: 'shut' });
  bustScene.add(bust);
  const portraitGeo = flipUVs(new THREE.PlaneGeometry(0.22, 0.22));
  const portrait = new THREE.Mesh(portraitGeo, new THREE.MeshBasicNodeMaterial({ map: bustRT.texture }));
  portrait.position.set(-0.93, -0.28, -2.2);
  portrait.visible = false;
  camera.add(portrait);
  scene.add(camera);

  const cutGroup = new THREE.Group();
  const cutFrame = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.34),
    new THREE.MeshBasicNodeMaterial({ color: '#f4efe4' }),
  );
  cutFrame.position.z = -0.02;
  const cutGeo = flipUVs(new THREE.PlaneGeometry(0.44, 0.26));
  const cutin = new THREE.Mesh(cutGeo, new THREE.MeshBasicNodeMaterial({ map: bustRT.texture }));
  cutGroup.add(cutFrame, cutin);
  cutGroup.position.set(0.86, 0.4, -2.4);
  cutGroup.rotation.z = -0.04;
  cutGroup.visible = false;
  camera.add(cutGroup);

  const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 4), toon({ color: '#ff4455' }), 48);
  particles.count = 0;
  or.add(particles);
  const dummy = new THREE.Object3D();

  const story = new THREE.Group();
  story.visible = false;
  scene.add(story);
  let storySet = null;
  let storyCast = '';
  let speakerKey = '';
  const busts = { left: null, right: null };

  function disposeTree(obj) {
    if (!obj) return;
    obj.traverse((node) => {
      node.geometry?.dispose?.();
      const mats = node.material;
      if (!mats) return;
      for (const m of (Array.isArray(mats) ? mats : [mats])) {
        m.map?.dispose?.();
        m.dispose?.();
      }
    });
  }

  let ink = null;
  try {
    ink = createInk(renderer, scene, camera);
  } catch (err) {
    renderer.dispose();
    throw err;
  }

  let juice = null;
  try {
    await RAPIER.init();
    juice = new RAPIER.World({ x: 0, y: -4, z: 0 });
  } catch {
    juice = null;
  }

  const mode = { name: 'or' };
  let painted = false;
  let shake = 0;
  let boil = 1;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth || 1280;
    const h = canvas.clientHeight || window.innerHeight || 720;
    renderer.setSize(w, h, false);
    if (mode.name === 'story') placeStoryCamera(camera, w / h);
    else placeOrCamera(camera, w / h);
  }

  function setOrgan(organId) {
    or.remove(organ);
    organ.geometry.dispose();
    organ = makeOrgan(organId || 'forearm');
    or.add(organ);
  }

  function ensureTip(seat) {
    let rig = tips.get(seat.id);
    if (!rig) {
      rig = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 12), toon({ color: seat.color || '#e8443a' }));
      ring.rotation.x = Math.PI / 2;
      rig.add(ring);
      for (const k of tools) {
        const m = toolMesh(k);
        m.visible = k === (seat.tool || 'gel');
        rig.add(m);
      }
      or.add(rig);
      tips.set(seat.id, rig);
    }
    return rig;
  }

  function sync(state, dt = 0.016) {
    if (!state) return;
    const organId = state.organ || state.siteOrgan || 'forearm';
    if (organ.userData.organ !== organId) {
      organ.userData.organ = organId;
      setOrgan(organId);
      organ.userData.organ = organId;
    }
    const beat = state.beatPhase || 0;
    if (organ.userData.beat) organ.userData.beat.value = Math.sin(beat * Math.PI * 2) * 0.5 + 0.5;
    mixer.update(dt);
    const danger = state.vitals != null ? Math.max(0, (40 - state.vitals) / 40) : 0;
    if (ink) {
      ink.u.danger.value = danger * boil;
      ink.u.hushRadius.value = state.hush ? Math.min(1.8, (state.hushT || 0.4) * 2) : 0;
      ink.u.flash.value = Math.max(0, (ink.u.flash.value || 0) - dt * 2);
      ink.u.speedLines.value = Math.max(0, (ink.u.speedLines.value || 0) - dt);
    }
    const seen = new Set();
    for (const seat of state.seats || []) {
      if (seat.out) continue;
      const rig = ensureTip(seat);
      const p = fieldToWorld(seat.x, seat.y, 0.16);
      rig.position.lerp(p, 0.65);
      rig.rotation.z = -0.4;
      for (const child of rig.children) {
        if (child.userData?.kind) child.visible = child.userData.kind === (seat.tool || 'gel');
      }
      seen.add(seat.id);
      if (ink && seat.id === state.seats[0]?.id) {
        const ndc = p.clone().project(camera);
        ink.u.hushCenter.value.set((ndc.x + 1) / 2, (1 - ndc.y) / 2);
      }
    }
    for (const [id, rig] of tips) {
      if (!seen.has(id)) { or.remove(rig); tips.delete(id); }
    }
    const have = new Set();
    for (const e of state.entities || []) {
      if (e.site && state.site && e.site !== state.site) continue;
      have.add(e.id);
      let mesh = entities.get(e.id);
      if (!mesh || mesh.userData.kind !== e.kind) {
        if (mesh) or.remove(mesh);
        mesh = e.kind === 'adagio' ? skinnedAdagio() : entityMesh(e.kind);
        mesh.userData.kind = e.kind;
        or.add(mesh);
        entities.set(e.id, mesh);
      }
      const lift = e.kind === 'gelZone' || e.kind === 'pool' ? 0.02 : 0.08 + (e.size || 0) * 0.05;
      mesh.position.copy(fieldToWorld(e.x || 0, e.y || 0, lift));
      const s = 0.7 + Math.min(1.4, (e.size || 0.3));
      mesh.scale.setScalar(e.kind === 'coda' ? 1.3 : s);
      if (mesh.userData.bone) mesh.userData.bone.rotation.z = Math.sin((state.beat || 0) * 0.7) * 0.4;
    }
    for (const [id, mesh] of entities) {
      if (!have.has(id)) { or.remove(mesh); entities.delete(id); }
    }
    if (shake > 0) {
      camera.position.x += (Math.sin(shake * 40) * 0.02);
      shake = Math.max(0, shake - dt);
    }
  }

  function showStory(setName, leftWho, rightWho) {
    mode.name = 'story';
    or.visible = false;
    story.visible = true;
    portrait.visible = false;
    if (storySet !== setName) {
      for (const child of [...story.children]) disposeTree(child);
      story.clear();
      story.add(storyRoom(setName || 'or'));
      storySet = setName;
      storyCast = '';
      busts.left = null;
      busts.right = null;
    }
    const castKey = `${leftWho || 'ren'}|${rightWho || 'bea'}`;
    if (storyCast !== castKey) {
      if (busts.left) { story.remove(busts.left); disposeTree(busts.left); }
      if (busts.right) { story.remove(busts.right); disposeTree(busts.right); }
      busts.left = bustFor(leftWho || 'ren', { mouth: 'shut' });
      busts.right = bustFor(rightWho || 'bea', { mouth: 'shut' });
      busts.left.position.set(-2.1, -0.4, 0);
      busts.right.position.set(2.1, -0.4, 0);
      // +Y rotation swings local +Z toward world +X. Turn each face in toward the camera.
      busts.left.rotation.y = 0.4;
      busts.right.rotation.y = -0.4;
      story.add(busts.left, busts.right);
      storyCast = castKey;
    }
    resize();
  }

  function showOr() {
    mode.name = 'or';
    or.visible = true;
    story.visible = false;
    placeLamp(false);
    resize();
  }

  function setSpeaker(who, expr) {
    const key = `${who || 'bea'}:${expr?.mouth || 'shut'}`;
    if (key === speakerKey) return;
    speakerKey = key;
    bustScene.remove(bust);
    disposeTree(bust);
    bust = bustFor(who || 'bea', expr || { mouth: 'shut' });
    bust.position.y = 0.2;
    bustScene.add(bust);
  }

  function shout(on) {
    cutGroup.visible = !!on;
    if (ink) ink.u.speedLines.value = on ? 1 : 0;
  }

  function setPortrait(on) {
    portrait.visible = !!on;
  }

  function flash() {
    if (ink) ink.u.flash.value = 1;
    shake = 0.25;
  }

  async function render() {
    if (lost) return;
    renderer.setRenderTarget(bustRT);
    renderer.render(bustScene, bustCam);
    renderer.setRenderTarget(null);
    if (ink) await ink.post.renderAsync();
    else renderer.render(scene, camera);
    painted = true;
  }

  function pointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return pointerToField(camera, clientX, clientY, rect);
  }

  resize();
  return {
    backend, renderer, scene, camera, ink, resize, sync, render, pointerToField: pointer,
    showStory, showOr, setSpeaker, shout, flash, setOrgan, placeLamp, setPortrait, mode,
    get painted() { return painted; },
    get lost() { return lost; },
    setBoil(v) { boil = v ? 1 : 0; },
    kick() { shake = 0.3; },
    juice,
  };
}

export function createPointerCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth || 1280;
    const h = canvas.clientHeight || window.innerHeight || 720;
    placeOrCamera(camera, w / h);
  };
  resize();
  return {
    backend: 'none',
    camera,
    resize,
    sync() {},
    async render() {},
    pointerToField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return pointerToField(camera, clientX, clientY, rect);
    },
    showStory() {},
    showOr() {},
    setSpeaker() {},
    shout() {},
    flash() {},
    setOrgan() {},
    ink: null,
    get painted() { return false; },
    get lost() { return false; },
    setBoil() {},
    kick() {},
  };
}
