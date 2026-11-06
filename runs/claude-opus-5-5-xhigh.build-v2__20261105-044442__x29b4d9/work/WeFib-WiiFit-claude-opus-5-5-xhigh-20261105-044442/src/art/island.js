import * as THREE from 'three/webgpu';
import { M, G, geo, toon, add, basic, makeOutline } from './materials.js';
import { Doll, PAINTS } from './doll.js';
import { Trudy, Heron, Walrus, Gull } from './cast.js';
import { cos, cosPick } from '../core/rng.js';
import {
  planks, post, crate, tree, palm, buoy, bunting, pavilionRoof, bigRock, umbrella, jarMesh, signBoard, rope,
  WOOD, WOOD_D, TEAK, TEAL, ORANGE, CREAM, RED, BLUE, STONE, STONE_D, GRASS, SAND, ROCK, LEAF, LEAF2,
} from './props.js';

// Fixed spots on the island, in island-local x, z.
export const MAP = {
  lighthouse: { x: 2, z: -9, label: 'The Lighthouse', y: 11 },
  jar: { x: -3, z: -4, label: 'The Jar', y: 3.4 },
  green: { x: 0, z: 2, label: 'The Circus Green', y: 2.6 },
  sunDeck: { x: -13.4, z: -3, label: 'The Sun Deck', y: 4 },
  pond: { x: -12, z: 7, label: 'The Lily Pond', y: 2 },
  quarry: { x: -8, z: -11, label: 'The Quarry Terrace', y: 3 },
  yard: { x: -7, z: 14, label: 'The Yard', y: 3.2 },
  bandstand: { x: 13.5, z: -1.5, label: 'The Bandstand', y: 5 },
  boardwalk: { x: 20.6, z: 3.2, label: 'The Boardwalk Gate', y: 3.6 },
  pier: { x: 15, z: 12, label: 'The Pier', y: 3 },
  beach: { x: 5, z: 17, label: 'The Beach', y: 2.6 },
  board: { x: 1, z: 9, label: 'The Notice Board', y: 3 },
  bedHut: { x: 8, z: 8, label: 'The Bed Hut', y: 3.6 },
  mirror: { x: 6, z: -15, label: 'The Mirror', y: 4 },
  gazebo: { x: 11.5, z: -9.5, label: 'The Gazebo', y: 4 },
  ringRoad: { x: -20.4, z: 1.5, label: 'The Ring Road', y: 2.6 },
};

export class IslandArt {
  constructor() {
    this.holder = G('islandHolder');
    this.group = G('island');
    this.holder.add(this.group);
    this.spots = {};
    this.buildBase();
    this.buildLandmarks();
    this.buildDressing();
    this.buildCast();
  }
  buildBase() {
    const g = this.group;
    add(g, M(geo.cyl(22, 21.4, 1.2, 72), SAND, 0, -0.6, 0));
    const grass = M(geo.disc(15, 56), GRASS, 0, 0.012, 0, { shadow: false });
    g.add(grass);
    const ringRoad = M(geo.ring(18.1, 19.9, 72), 0xE8D3A0, 0, 0.018, 0, { shadow: false });
    g.add(ringRoad);
    const profile = [[21.4, -1.2], [18.5, -2.3], [12, -3.4], [5.5, -4.5], [1.2, -5.7], [0.5, -6]].map(([x, y]) => new THREE.Vector2(x, y));
    const under = new THREE.Mesh(new THREE.LatheGeometry(profile, 56), toon(ROCK));
    under.castShadow = true; under.receiveShadow = true;
    g.add(under);
    // Toy fence: posts and rails.
    const n = 40;
    const postMesh = new THREE.InstancedMesh(geo.cyl(0.07, 0.09, 0.8, 8), toon(CREAM), n);
    const railMesh = new THREE.InstancedMesh(geo.box(0.06, 0.08, 3.5), toon(TEAL), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const skip = i === 3 || i === 2 || i === 5 ? 0 : 1;
      p.set(Math.cos(a) * 21.7, 0.4, Math.sin(a) * 21.7); q.identity(); s.setScalar(1);
      m.compose(p, q, s); postMesh.setMatrixAt(i, m);
      const a2 = a + Math.PI / n;
      p.set(Math.cos(a2) * 21.7, 0.6, Math.sin(a2) * 21.7); q.setFromAxisAngle(yAxis, -a2); s.set(skip, 1, 1);
      m.compose(p, q, s); railMesh.setMatrixAt(i, m);
    }
    postMesh.castShadow = true; railMesh.castShadow = true;
    add(g, postMesh, railMesh);
    // The one pivot rock stands in the sea and never moves.
    this.pivot = G('pivot', 0, -8.2, 0);
    add(this.pivot, M(geo.sphere(3.4, 16, 12), ROCK, 0, 0, 0, { scale: [1.3, 0.9, 1.3] }), M(geo.sphere(1.6, 10, 8), 0x7A6C5E, 2.9, -1, 1.4));
    this.holder.add(this.pivot);
  }
  spot(id, group) {
    const s = MAP[id];
    group.position.set(s.x, 0, s.z);
    this.group.add(group);
    s.group = group;
    this.spots[id] = group;
    return group;
  }
  buildLandmarks() {
    this.lighthouse();
    this.jar();
    this.green();
    this.sunDeck();
    this.pond();
    this.quarry();
    this.yard();
    this.bandstand();
    this.boardwalk();
    this.pier();
    this.beach();
    this.board();
    this.bedHut();
    this.mirror();
    this.gazebo();
    const road = G();
    add(road, post(2.2, 0.07, WOOD_D, 0, 0, 0));
    const roadSign = signBoard('ISLAND LOOP', 1.7, 0.5);
    roadSign.position.set(0, 1.9, 0.09);
    roadSign.rotation.y = 0;
    road.add(roadSign);
    road.rotation.y = Math.PI / 2;
    this.spot('ringRoad', road);
  }
  lighthouse() {
    const g = G();
    add(g, M(geo.cyl(2.2, 2.4, 0.5, 24), STONE, 0, 0.25, 0));
    let y = 0.5;
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const r0 = 1.5 - (i * 0.55) / tiers, r1 = r0 - 0.55 / tiers, h = 1.25;
      add(g, M(geo.cyl(r1, r0, h, 24), i % 2 ? CREAM : RED, 0, y + h / 2, 0));
      y += h;
    }
    add(g, M(geo.cyl(1.35, 1.2, 0.2, 24), CREAM, 0, y + 0.1, 0));
    y += 0.2;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(g, M(geo.cyl(0.03, 0.03, 0.5, 6), CREAM, Math.cos(a) * 1.3, y + 0.25, Math.sin(a) * 1.3)); }
    add(g, M(geo.tor(1.3, 0.035, Math.PI * 2, 32), CREAM, 0, y + 0.5, 0, { rot: [Math.PI / 2, 0, 0] }));
    this.lampMat = new THREE.MeshBasicNodeMaterial({ color: 0xFFE9A8 });
    this.lamp = new THREE.Mesh(geo.cyl(0.55, 0.55, 0.9, 16), this.lampMat);
    this.lamp.position.y = y + 0.45;
    g.add(this.lamp);
    add(g, M(geo.cone(0.85, 0.75, 16), BLUE, 0, y + 1.3, 0), M(geo.sphere(0.12, 10, 8), RED, 0, y + 1.75, 0));
    add(g, M(geo.box(0.7, 1.2, 0.1), TEAL, 0, 1.1, 1.42), M(geo.sphere(0.32, 12, 8), CREAM, 0, 4.2, 1.2, { scale: [1, 1, 0.3] }));
    this.lighthouseTop = y;
    this.spot('lighthouse', g);
    this.lightGlow = new THREE.PointLight(0xFFE9A8, 0, 30);
    this.lightGlow.position.y = y + 0.4;
    g.add(this.lightGlow);
  }
  jar() {
    const g = G();
    add(g, M(geo.cyl(1.5, 1.7, 0.36, 28), WOOD, 0, 0.18, 0), M(geo.cyl(1.3, 1.3, 0.1, 28), TEAK, 0, 0.41, 0));
    const jg = jarMesh();
    jg.position.y = 0.46;
    g.add(jg);
    this.jarGroup = jg;
    this.spot('jar', g);
  }
  green() {
    const g = G();
    add(g, M(geo.disc(4.6, 40), 0xF2E3B5, 0, 0.02, 0, { shadow: false }), M(geo.ring(4.2, 4.6, 40), RED, 0, 0.026, 0, { shadow: false }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(g, post(1.9, 0.05, CREAM, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2), M(geo.cyl(0.42, 0.34, 0.05, 20), i % 2 ? TEAL : ORANGE, Math.cos(a) * 3.2, 1.96, Math.sin(a) * 3.2));
    }
    add(g, M(geo.tor(0.6, 0.05), RED, 0, 0.7, 0, { rot: [Math.PI / 2, 0, 0] }));
    this.spot('green', g);
  }
  sunDeck() {
    const g = G();
    add(g, M(geo.cyl(3.8, 3.8, 0.2, 32), TEAK, 0, 0.3, 0));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(g, post(0.26, 0.14, WOOD_D, Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3)); }
    for (let i = 0; i < 4; i++) add(g, M(geo.box(7.2, 0.012, 0.03), WOOD_D, 0, 0.407, -1.8 + i * 1.2));
    add(g, M(geo.cyl(1.2, 1.2, 0.03, 28), 0xC24D6A, 0, 0.42, 0));
    this.spot('sunDeck', g);
  }
  pond() {
    const g = G();
    const water = M(geo.disc(3.6, 40), 0x5AC0C4, 0, 0.022, 0, { shadow: false });
    add(g, water, M(geo.ring(3.5, 4, 40), STONE, 0, 0.03, 0, { shadow: false }));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.9, r = 1 + (i % 3) * 0.8;
      add(g, M(geo.cyl(0.5, 0.5, 0.03, 16), LEAF2, Math.cos(a) * r, 0.05, Math.sin(a) * r));
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      add(g, M(geo.cyl(0.02, 0.02, 1, 6), LEAF, Math.cos(a) * 3.8, 0.5, Math.sin(a) * 3.8), M(geo.cap(0.05, 0.16, 6), WOOD_D, Math.cos(a) * 3.8, 1.04, Math.sin(a) * 3.8));
    }
    this.spot('pond', g);
  }
  quarry() {
    const g = G();
    add(g, M(geo.cyl(4.2, 4.6, 0.3, 8), STONE, 0, 0.15, 0));
    for (const [x, z, s] of [[-2.2, -1.6, 1.1], [1.9, -2, 0.9], [2.5, 1, 0.7], [-2.6, 1.3, 0.6]]) { const r = bigRock(s, STONE_D); r.position.set(x, 0.3 + s * 0.45, z); g.add(r); }
    const stack = G('', 0, 0.3, 0);
    let y = 0;
    for (const [r, hh] of [[0.5, 0.17], [0.42, 0.15], [0.34, 0.13], [0.26, 0.11], [0.18, 0.09]]) { stack.add(M(geo.sphere(r, 12, 8), STONE_D, 0, y + hh, 0, { scale: [1, hh / r, 1] })); y += hh * 2; }
    g.add(stack);
    this.spot('quarry', g);
  }
  yard() {
    const g = G();
    add(g, M(geo.disc(4.4, 36), 0xE6CDA0, 0, 0.022, 0, { shadow: false }));
    for (const [x, z, r] of [[-2.2, 1.6, 0.2], [-2.2, 2.1, 0.2], [-2.2, 1.85, 0.19], [2.4, 2, 0.22]]) add(g, M(geo.cyl(r, r, 2.8, 12), WOOD_D, x, r + (z === 1.85 ? 0.32 : 0.02), z, { rot: [0, 0, Math.PI / 2] }));
    add(g, post(2.4, 0.12, WOOD_D, -3.2, 0, -1.2), post(2.4, 0.12, WOOD_D, 3.2, 0, -1.2), M(geo.cyl(0.1, 0.1, 6.6, 10), WOOD, 0, 2.3, -1.2, { rot: [0, 0, Math.PI / 2] }));
    this.spot('yard', g);
  }
  bandstand() {
    const g = G();
    add(g, M(geo.cyl(3.7, 4, 0.5, 8), CREAM, 0, 0.25, 0), M(geo.cyl(3.55, 3.55, 0.05, 8), TEAK, 0, 0.52, 0));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; add(g, post(3.1, 0.09, CREAM, Math.cos(a) * 3.4, 0.5, Math.sin(a) * 3.4)); }
    const roof = pavilionRoof(4.2, TEAL, ORANGE);
    roof.position.y = 3.6;
    g.add(roof);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, b = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      g.add(bunting(Math.cos(a) * 3.4, 3.4, Math.sin(a) * 3.4, Math.cos(b) * 3.4, 3.4, Math.sin(b) * 3.4, 5));
    }
    this.spot('bandstand', g);
  }
  boardwalk() {
    const g = G();
    add(g, post(3, 0.12, TEAL, -1.1, 0, 0), post(3, 0.12, TEAL, 1.1, 0, 0), M(geo.box(2.8, 0.3, 0.3), ORANGE, 0, 3.05, 0));
    const sign = signBoard('ROOM SERVICE', 2.2, 0.5); sign.position.set(0, 2.55, 0.17); g.add(sign);
    g.rotation.y = -Math.PI / 2 - 0.15;
    this.spot('boardwalk', g);
    const walk = G('', 24, 0, 3.8);
    const deck = planks(9, 1.7, { along: 'z', top: -0.02 });
    walk.add(deck);
    for (let i = 0; i < 5; i++) add(walk, post(2.6, 0.08, WOOD_D, -4 + i * 2, -2.7, 0.9), post(2.6, 0.08, WOOD_D, -4 + i * 2, -2.7, -0.9));
    walk.rotation.y = -0.15;
    this.group.add(walk);
  }
  pier() {
    const g = G();
    const dir = Math.atan2(12, 15);
    const pier = G();
    pier.rotation.y = -dir;
    pier.position.set(0, 0, 0);
    const deck = planks(19, 3.2, { along: 'z', top: -0.02 });
    deck.position.x = 9.5;
    pier.add(deck);
    for (let i = 0; i < 6; i++) add(pier, post(5, 0.11, WOOD_D, 4 + i * 3, -5, 1.45), post(5, 0.11, WOOD_D, 4 + i * 3, -5, -1.45));
    // The toy-block dive tower at its end.
    const tower = G('', 17, 0, 0);
    let y = 0;
    for (let i = 0; i < 5; i++) { add(tower, M(geo.box(2, 1, 2), [RED, 0xF5B700, TEAL, CREAM, BLUE][i], 0, y + 0.5, 0)); y += 1; }
    add(tower, M(geo.box(2.8, 0.08, 0.5), CREAM, 1.8, y + 0.04, 0));
    pier.add(tower);
    add(pier, M(geo.box(0.9, 0.5, 0.9), WOOD, 9, 0.25, 0.8), buoyOn(13, 0.5, 2.4));
    g.add(pier);
    this.spot('pier', g);
  }
  beach() {
    const g = G();
    for (const [x, z, c] of [[-3, 1.4, RED], [3.2, 0.8, TEAL], [0.2, 2.6, 0xF5B700]]) { const u = umbrella(c); u.position.set(x, 0, z); g.add(u); }
    g.add(rope(-3.4, 0.5, -1, 3.4, 0.5, -1, 0.2, 0.05));
    for (let i = -3; i <= 3; i++) add(g, M(geo.box(0.06, 0.012, 0.8), CREAM, i, 0.022, -1, { shadow: false }));
    this.spot('beach', g);
  }
  board() {
    const g = G();
    add(g, post(2.6, 0.08, WOOD_D, -1, 0, 0), post(2.6, 0.08, WOOD_D, 1, 0, 0), M(geo.box(2.4, 1.5, 0.1), WOOD, 0, 1.8, 0), M(geo.box(2.7, 0.14, 0.3), ORANGE, 0, 2.62, 0));
    const pins = [[-0.7, 2, 0xFFF4DC], [0.1, 1.95, 0xFBE7BF], [0.75, 2.05, 0xFFF4DC], [-0.4, 1.5, 0xFBE7BF], [0.5, 1.48, 0xFFF4DC]];
    for (const [x, y, c] of pins) add(g, M(geo.box(0.55, 0.5, 0.02), c, x, y, 0.06, { rot: [0, 0, cos(-0.08, 0.08)], shadow: false }));
    this.spot('board', g);
  }
  bedHut() {
    const g = G();
    add(g, M(geo.box(3.2, 2.1, 2.6), CREAM, 0, 1.05, 0), M(geo.box(0.8, 1.5, 0.08), TEAL, 0, 0.75, 1.31), M(geo.sphere(0.05, 8, 6), 0xF5B700, 0.26, 0.8, 1.37), M(geo.box(0.7, 0.6, 0.08), 0x8FC7E8, 1.1, 1.3, 1.31));
    const roof = M(geo.cone(2.7, 1.3, 4), ORANGE, 0, 2.75, 0, { rot: [0, Math.PI / 4, 0] });
    g.add(roof);
    const moon = M(geo.tor(0.14, 0.05, Math.PI * 1.3), 0xF5B700, -1, 1.4, 1.33, { shadow: false }); g.add(moon);
    this.spot('bedHut', g);
  }
  mirror() {
    const g = G();
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; add(g, post(2.9, 0.09, TEAL, Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9)); }
    const roof = pavilionRoof(2.8, ORANGE, TEAL); roof.position.y = 3; roof.rotation.y = Math.PI / 8; g.add(roof);
    const mirror = G('', 0, 1.35, 0);
    add(mirror, M(geo.tor(0.72, 0.07, Math.PI * 2, 40), 0xF5B700, 0, 0, 0, { scale: [1, 1.5, 1] }), new THREE.Mesh(geo.cyl(0.7, 0.7, 0.02, 32), basic(0xBFE9F0)));
    mirror.children[1].rotation.x = Math.PI / 2; mirror.children[1].scale.z = 1.5;
    g.add(mirror);
    this.spot('mirror', g);
  }
  gazebo() {
    const g = G();
    add(g, M(geo.cyl(3.1, 3.3, 0.3, 6), CREAM, 0, 0.15, 0));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(g, post(2.7, 0.08, CREAM, Math.cos(a) * 2.8, 0.3, Math.sin(a) * 2.8)); }
    const roof = pavilionRoof(3.5, RED, CREAM); roof.position.y = 3; g.add(roof);
    add(g, M(geo.cyl(0.9, 0.9, 0.08, 16), TEAK, 0, 0.34, 0));
    this.spot('gazebo', g);
  }
  buildDressing() {
    const g = this.group;
    const treeSpots = [[-7.5, 0.5], [-5.5, 8.5], [6.5, -5.5], [6.8, 2.2], [9.8, 5], [-3, 12.5], [3.8, 12.4], [-2.5, -12.5], [-10, 12], [12, 8.8], [-7.8, 6], [-13, -9.5], [1.6, -16]];
    for (const [x, z] of treeSpots) {
      const t = tree(cos(1.8, 2.6), cos(0.7, 1.05), cosPick([LEAF, LEAF2, 0x4F9F5A]));
      t.position.set(x, 0, z);
      g.add(t);
    }
    for (const [x, z] of [[-19.5, 8], [10, 19], [-18, -11], [-14, 15], [0, -20], [20, -8]]) { const p = palm(cos(2.8, 3.8)); p.position.set(x, 0, z); p.rotation.y = cos(0, 6); g.add(p); }
    for (let i = 0; i < 18; i++) {
      const a = cos(0, 6.28), r = cos(16, 21);
      g.add(M(geo.sphere(cos(0.2, 0.5), 8, 6), STONE_D, Math.cos(a) * r, 0.06, Math.sin(a) * r, { scale: [1, 0.5, 0.8] }));
    }
    g.add(bunting(-1, 4, 7, 7, 3.2, 7.6, 12));
    g.add(bunting(1, 2.6, 9, -7, 2.4, 11, 12));
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.1;
      add(g, M(geo.cone(0.1, 0.5, 6), LEAF, Math.cos(a) * 15.3, 0.25, Math.sin(a) * 15.3));
    }
  }
  buildCast() {
    this.trudy = new Trudy();
    this.group.add(this.trudy.root);
    this.heron = new Heron();
    this.heron.root.position.set(-13.4, 0.43, -5);
    this.group.add(this.heron.root);
    this.walrus = new Walrus();
    this.walrus.root.position.set(-5, 0, 11);
    this.walrus.root.rotation.y = 0.5;
    this.group.add(this.walrus.root);
    this.gary = new Gull();
    this.gary.root.position.set(1, 2.72, 9);
    this.group.add(this.gary.root);
    const G2 = [
      { id: 'margaret', shirt: '#C9A0DC', hat: 'perm', height: 0.92, width: 1.02, shorts: 0x6B6B8F, home: [-2, 6] },
      { id: 'kevin', shirt: '#6FB7D6', hat: 'visor', height: 1, width: 1, shorts: 0x38503A, home: [12, 15] },
      { id: 'sandras', shirt: '#E78FB3', hat: 'bucket', height: 0.96, width: 1, shorts: 0x7A3F5A, home: [6, 4] },
      { id: 'sandras', shirt: '#E78FB3', hat: 'bucket', height: 0.96, width: 1, shorts: 0x7A3F5A, home: [7, 5] },
      { id: 'paul', shirt: '#F5C84A', hat: 'beret', height: 1.06, width: 0.94, shorts: 0x444455, home: [-8, -5] },
      { id: 'gerald', shirt: '#7FA650', hat: 'none', height: 0.88, width: 0.96, shorts: 0x5A4A3A, home: [-10, 3] },
    ];
    this.guests = G2.map((d, i) => {
      const doll = new Doll({ shirt: d.shirt, hat: d.hat, height: d.height, width: d.width, shorts: d.shorts });
      doll.flatFeet = false;
      doll.root.position.set(d.home[0], 0, d.home[1]);
      this.group.add(doll.root);
      return { doll, id: d.id, home: d.home, x: d.home[0], z: d.home[1], tx: d.home[0], tz: d.home[1], wait: cos(0, 5), follow: i === 3 ? 2 : -1 };
    });
    this.lastGuestT = 0;
  }
  /** Guests wander between spots, and need no physics. */
  updateCast(dt, tiltQuatInverse) {
    this.trudy.update(dt);
    this.heron.update(dt);
    this.walrus.update(dt);
    this.gary.update(dt);
    for (const g of this.guests) {
      if (g.follow >= 0) {
        const f = this.guests[g.follow];
        g.tx = f.x + 1.1; g.tz = f.z + 0.5;
      } else if (g.wait > 0) g.wait -= dt;
      const dx = g.tx - g.x, dz = g.tz - g.z, d = Math.hypot(dx, dz);
      if (d > 0.3 && g.wait <= 0) {
        const sp = 1.2 * Math.min(1, d);
        g.x += (dx / d) * sp * dt; g.z += (dz / d) * sp * dt;
        g.doll.face(Math.atan2(dx, dz));
        g.doll.rig.loop('walk');
      } else {
        g.doll.rig.loop('idle');
        if (g.follow < 0 && g.wait <= 0) {
          g.wait = cos(3, 9);
          const a = cos(0, 6.28), r = cos(1, 5);
          g.tx = Math.max(-14, Math.min(14, g.home[0] + Math.cos(a) * r)); g.tz = Math.max(-14, Math.min(14, g.home[1] + Math.sin(a) * r));
        }
      }
      g.doll.root.position.set(g.x, 0, g.z);
      if (tiltQuatInverse) g.doll.root.quaternion.copy(tiltQuatInverse);
      g.doll.update(dt);
    }
  }
  /** Marble display on the island: settled positions from the last pour. */
  buildMarbles(n = 320) {
    const mesh = new THREE.InstancedMesh(geo.sphere(0.14, 12, 10), toon(0xffffff), n);
    // The colour attribute must exist before the first draw, or the mesh stays white for good.
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < n; i++) mesh.setColorAt(i, white);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.castShadow = true; mesh.frustumCulled = false;
    this.jarGroup.add(mesh);
    this.marbleMesh = mesh;
    return mesh;
  }
  /** On hover: a thick outline around a landmark. Built on first use. */
  outline(id, on) {
    const s = MAP[id];
    if (!s || !s.group) return;
    if (on && !s.outline) s.outline = makeOutline(s.group, 0.07);
    if (s.outline) s.outline.visible = on;
  }
}
function buoyOn(x, y, z) { const b = buoy(); b.position.set(x, y, z); return b; }
