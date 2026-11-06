/** OR geometry: tissue on the raised surface, gloves, and primitive busts. */

import { THREE, toonMaterial, setLookLayer } from '../../pixel-engine.js';
import { heightAt } from '../sim/aim.js';
import { CAST } from '../content/story.js';

const ARENA = {
  forearm: 0xc47a6a,
  stomach: 0xd4a090,
  ferry: 0x8a5a4a,
  bone: 0xe6d2b8,
  liver: 0x8d3a3a,
  kidney: 0xa45a6a,
  lung: 0xe8b0b8,
  heart: 0xc43040,
  chest: 0xb85a58,
  spine: 0xd8c8b0,
};

const SEAT = [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700];
const KIND_COLOR = {
  pool: 0x8a1e28,
  hook: 0xd8d2c4,
  wound: 0xc45a58,
  gel: 0x7ec8a0,
  polyp: 0xd06090,
  cyst: 0x88aa70,
  eye: 0xf4f1ea,
  plate: 0xa31828,
  fragment: 0xefe6d4,
  tumor: 0x6a2048,
  core: 0xe8c84a,
  pore: 0x5a2030,
};

function mesh(geo, color, layer = 'environment') {
  const body = new THREE.Mesh(geo, toonMaterial(color).clone());
  body.castShadow = body.receiveShadow = true;
  setLookLayer(body, layer);
  return body;
}

function tissueMap() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const pen = canvas.getContext('2d');
  pen.fillStyle = '#c46a5a';
  pen.fillRect(0, 0, 64, 32);
  pen.strokeStyle = '#7a3030';
  pen.lineWidth = 2;
  pen.beginPath();
  pen.moveTo(0, 16);
  pen.bezierCurveTo(18, 4, 40, 28, 64, 10);
  pen.stroke();
  pen.strokeStyle = '#e8b0a4';
  pen.beginPath();
  pen.moveTo(8, 28);
  pen.lineTo(30, 6);
  pen.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.flipY = false;
  return tex;
}

export function createView(ctx) {
  const { scene } = ctx;
  const room = new THREE.Group();
  room.add(mesh(new THREE.BoxGeometry(14, 0.2, 10), 0x2a2428));
  room.children[0].position.set(0, -0.1, 0);
  const wall = mesh(new THREE.BoxGeometry(14, 4.2, 0.3), 0x3a3038);
  wall.position.set(0, 2, -4.2);
  const lamp = mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.28, 8), 0xf2e2a8);
  lamp.position.set(0, 3.35, -0.4);
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), 0x221e24);
  pole.position.set(0, 4.15, -0.4);
  const monitor = mesh(new THREE.BoxGeometry(1.3, 0.85, 0.12), 0x163028);
  monitor.position.set(-3.4, 1.55, -3.6);
  room.add(wall, lamp, pole, monitor);
  scene.add(room);

  const map = tissueMap();
  const tissue = mesh(new THREE.PlaneGeometry(16, 9, 24, 16), 0xc47a6a);
  if (map) tissue.material = toonMaterial(0xc47a6a, { map }).clone();
  tissue.rotation.x = -Math.PI / 2;
  tissue.visible = false;
  scene.add(tissue);

  const hands = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group();
    const palm = mesh(new THREE.BoxGeometry(0.36, 0.12, 0.48), SEAT[i], 'actors');
    const tip = mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), 0xe8e2d8, 'actors');
    tip.position.set(0, 0.02, -0.42);
    group.add(palm, tip);
    group.visible = false;
    setLookLayer(group, 'actors');
    scene.add(group);
    hands.push(group);
  }

  const ents = [];
  for (let i = 0; i < 48; i++) {
    const body = mesh(new THREE.SphereGeometry(0.16, 6, 5), 0x8a2030, 'actors');
    body.visible = false;
    scene.add(body);
    ents.push(body);
  }

  const busts = [];
  for (const id of ['ilya', 'reyes', 'sabine', 'bram', 'pem', 'hesper']) {
    const group = new THREE.Group();
    const color = new THREE.Color(CAST[id].color).getHex();
    const head = mesh(new THREE.SphereGeometry(0.28, 8, 7), color, 'actors');
    head.position.y = 1.48;
    const body = mesh(new THREE.BoxGeometry(0.72, 0.9, 0.36), color, 'actors');
    body.position.y = 0.72;
    group.add(body, head);
    group.visible = false;
    setLookLayer(group, 'actors');
    scene.add(group);
    busts.push({ id, group, head });
  }

  scene.add(new THREE.AmbientLight(0xfff0e0, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(3, 8, 4);
  scene.add(sun);
  try {
    ctx.lights?.request?.({ position: [0, 5.2, 0.4], color: 0xffe6c8, intensity: 5, radius: 15 });
  } catch {
    /* the pool appears on the first real frame */
  }
  return { room, tissue, hands, ents, busts, lamp };
}

function paintTissue(tissue, arena, pulse) {
  const pos = tissue.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = -pos.getY(i);
    pos.setZ(i, heightAt(arena, x, z, pulse));
  }
  pos.needsUpdate = true;
  tissue.geometry.computeVertexNormals();
  const hex = ARENA[arena] || ARENA.forearm;
  tissue.material.color?.setHex?.(hex);
}

export function syncView(view, app, pulse) {
  const sim = app.sim;
  const operating = !!sim && (app.mode === 'op' || app.mode === 'pause' || app.mode === 'dev' || app.mode === 'results' || app.mode === 'attract' || app.mode === 'session');
  view.room.visible = !operating;
  view.tissue.visible = operating;
  view.lamp.visible = !operating;
  if (operating) paintTissue(view.tissue, sim.arena || 'forearm', pulse);

  const show = operating ? sim.entities.filter((e) => !e.hidden && (e.table == null || e.table === sim.active)) : [];
  view.ents.forEach((body, i) => {
    const ent = show[i];
    body.visible = !!ent && !ent.done;
    if (!ent || ent.done) return;
    const y = heightAt(sim.arena || 'forearm', ent.x, ent.z, pulse) + 0.18 + (ent.r || 0) * 0.05;
    body.position.set(ent.x, y, ent.z);
    const s = Math.max(0.35, ent.r || (ent.kind === 'hook' ? 0.45 : 0.7));
    body.scale.setScalar(s);
    body.material.color?.setHex?.(KIND_COLOR[ent.kind] || 0xc45a58);
  });

  view.hands.forEach((hand, i) => {
    const seat = operating ? sim.seats[i] : null;
    hand.visible = !!seat;
    if (!seat) return;
    const y = heightAt(sim.arena || 'forearm', seat.x, seat.z, pulse) + 0.42;
    hand.position.set(seat.x, y, seat.z);
  });

  const story = app.mode === 'story' || app.mode === 'brief' || app.mode === 'credits' || app.mode === 'title' || app.mode === 'card';
  const speaker = app.speaker || (app.mode === 'title' ? 'ilya' : app.mode === 'card' ? 'reyes' : '');
  view.busts.forEach((bust, i) => {
    bust.group.visible = story;
    if (!story) return;
    const talking = bust.id === speaker;
    bust.group.position.set((i - 2.5) * 0.85, 0, talking ? -0.2 : -1.3);
    bust.group.scale.setScalar(talking ? 1.15 : 0.82);
    const bob = talking ? 1 + Math.sin(pulse * 6) * 0.04 : 1;
    bust.head.scale.setScalar(bob);
  });
}
