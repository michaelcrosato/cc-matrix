import * as THREE from 'three/webgpu';
import { rbox, tree, palm, bunting, pavilion, plankWalk, bench, crate, lantern, rock, stoneStack, buoy, deck, grassPatch } from './props.js';
import { sphere, cyl, cone, box, torus, at, capsule, toon, glass, flat, mesh, cached, outlineOf } from './materials.js';
import { makeDoll } from './doll.js';
import { GUESTS } from '../data/names.js';
import { cosRange, cosmetic, pick } from '../core/rng.js';
export const LANDMARKS = {
  lighthouse: { x: 2, z: -9, label: 'The Lighthouse', r: 3.2 }, jar: { x: -3, z: -4, label: 'The Jar', r: 2.4 }, circus: { x: 0, z: 2, label: 'Circus Green', r: 2.6 }, sunDeck: { x: -16, z: -3, label: 'The Sun Deck', r: 3.4 }, lilyPond: { x: -13, z: 7, label: 'The Lily Pond', r: 3.4 }, quarry: { x: -9, z: -13, label: 'Quarry Terrace', r: 3 }, yard: { x: -7, z: 14, label: 'The Yard', r: 3 }, gazebo: { x: 14, z: -11, label: 'The Gazebo', r: 3 }, bandstand: { x: 15, z: -3, label: 'The Bandstand', r: 3.2 }, boardwalk: { x: 19, z: 3, label: 'The Boardwalk', r: 2.6 }, pier: { x: 15, z: 12, label: 'The Pier', r: 2.8 }, beach: { x: 5, z: 17, label: 'The Beach', r: 3 }, board: { x: 1, z: 9, label: 'The Notice Board', r: 2.2 }, bedHut: { x: 8, z: 8, label: 'The Bed Hut', r: 2.6 }, mirror: { x: 9, z: -14, label: 'The Mirror', r: 2.6 },
};
export const JAR_POS = { x: -3, z: -4 };
export class Island {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group); this.world = new THREE.Group(); this.group.add(this.world);
    this.tx = 0; this.tz = 0; this.vt = 0; this.tilt = null; this.heldX = null; this.anim = []; this.guests = []; this.mixTick = 0; this.restDeg = 9; this.stage = 'hub';
    this.buildGround(); this.buildLandmarks(); this.buildScatter(); this.buildJar(); this.buildGuests();
  }
  buildGround() {
    const W = this.world;
    const sand = cyl(22, 22, .3, '#F0DDB0', 64); W.add(at(sand, 0, -.16, 0));
    const grass = cyl(15, 15, .3, '#8FD06F', 48); W.add(at(grass, 0, -.149, 0));
    const road = torus(19, .55, '#E3CFA3'); road.rotation.x = Math.PI / 2; road.scale.z = .02; W.add(at(road, 0, -.003, 0));
    const rockM = cone(21, 20, '#8F8578', 32); rockM.rotation.x = Math.PI; W.add(at(rockM, 0, -10.3, 0));
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; const f = box(.14, .72, 1.5, i % 2 ? '#E9D3AE' : '#FFF8EE'); f.rotation.y = -a; f.position.set(Math.cos(a) * 22, .36, Math.sin(a) * 22); W.add(f); }
    this.pivot = new THREE.Group(); const piv = sphere(5, '#6F665C', 1.15, .8, 1.1); this.pivot.add(at(piv, 0, -24, 0)); this.skirt = cyl(16, 25, 12, '#8F8578', 32); this.pivot.add(at(this.skirt, 0, -9, 0)); for (let i = 0; i < 26; i++) { const an = i / 26 * 6.283, r = 21 + (i % 3) * 1.6; const b = sphere(3 + (i * 7 % 4) * .9, ['#8F8578', '#A69A8C', '#7A7268', '#6FA05A'][i % 4], 1.2, .8, 1); b.position.set(Math.cos(an) * r, -2.4 - (i % 3) * .8, Math.sin(an) * r); b.rotation.y = i; this.pivot.add(b); } this.scene.add(this.pivot);
  }
  buildLandmarks() {
    this.lmParts = { jar: [] }; this.outlines = {};
    const W = this.world, L = LANDMARKS, put = (o, k, dx = 0, dz = 0) => { o.position.x = L[k].x + dx; o.position.z = L[k].z + dz; W.add(o); (this.lmParts[k] ||= []).push(o); return o; };
    // Lighthouse: stacked red and cream rings, a lamp, a blue cap.
    const lh = new THREE.Group(); let y = 0; const rings = 9; for (let i = 0; i < rings; i++) { const rb = 2 - i * .1, rt = rb - .1, h = 1.3; lh.add(at(cyl(rt, rb, h, i % 2 ? '#FFF8EE' : '#E8443A', 24), 0, y + h / 2, 0)); y += h; }
    const top = new THREE.Group(); this.lhTop = top; lh.add(top); top.add(at(cyl(1.5, 1.3, .3, '#1A1420', 24), 0, y + .15, 0)); this.lhLamp = cyl(.72, .72, 1.2, '#FFF2C2', 16); top.add(at(this.lhLamp, 0, y + .9, 0)); top.add(at(cone(1.05, 1, '#3B82F6', 16), 0, y + 2, 0)); lh.add(at(box(.8, 1.4, .1, '#7A5A3C'), 0, .7, 2)); put(lh, 'lighthouse'); this.lighthouse = lh;
    // Sun Deck
    const sd = deck(3.6, '#C89B6A', false, .12); put(sd, 'sunDeck'); const sdp = pavilion(3, 3, 2.3, '#F58A5C'); sdp.position.y = .12; put(sdp, 'sunDeck', -.3, -.3);
    // Lily pond
    const pond = cyl(3.6, 3.6, .04, '#57B8A8', 32); put(at(pond, 0, .012, 0), 'lilyPond'); for (let i = 0; i < 7; i++) { const a = i * 1.7, r = .7 + i * .38; put(at(cyl(.4, .38, .04, '#4FB56A', 12), 0, .05, 0), 'lilyPond', Math.cos(a) * r, Math.sin(a) * r); } const rim = torus(3.6, .18, '#BDB2A2'); rim.rotation.x = Math.PI / 2; put(at(rim, 0, .05, 0), 'lilyPond');
    // Quarry terrace
    const q = cyl(3.2, 3.5, .3, '#D8CDBB', 10); put(at(q, 0, .1, 0), 'quarry'); put(stoneStack(5), 'quarry', -.8, .4); put(stoneStack(3), 'quarry', 1, -.8); put(rock(.9), 'quarry', -2, -1.8); put(rock(.65), 'quarry', 2.3, .9);
    // Yard
    put(at(box(3.4, .04, 3.4, '#D9694F'), 0, .02, 0), 'yard'); const lg = cyl(.16, .16, 2, '#9C7048'); lg.rotation.z = 1.57; put(at(lg, 0, 1.2, 0), 'yard'); for (const s of [-1, 1]) put(at(cyl(.09, .1, 1.2, '#7A5A3C'), 0, .6, 0), 'yard', s, 0); put(bench(), 'yard', 0, -2.2);
    // Bandstand
    const bs = new THREE.Group(); bs.add(at(cyl(3.2, 3.3, .3, '#C89B6A', 8), 0, .15, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + .39; bs.add(at(cyl(.09, .1, 2.8, '#FFF8EE'), Math.cos(a) * 2.9, 1.6, Math.sin(a) * 2.9)); } bs.add(at(cone(3.8, 1.5, '#2FA7A0', 8), 0, 3.7, 0)); put(bs, 'bandstand');
    // Circus Green
    const cg = cyl(2.8, 2.8, .03, '#FFF2C2', 32); put(at(cg, 0, .015, 0), 'circus'); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; put(at(cyl(.03, .04, 1.8, '#FFF8EE'), 0, .9, 0), 'circus', Math.cos(a) * 2.2, Math.sin(a) * 2.2); put(at(cyl(.28, .18, .05, ['#3B82F6', '#22C55E', '#E8443A'][i % 3]), 0, 1.84, 0), 'circus', Math.cos(a) * 2.2, Math.sin(a) * 2.2); }
    // Pier, running out to sea.
    const pier = plankWalk(18, 3); pier.rotation.y = -Math.PI / 4 * 3; pier.position.set(L.pier.x - 1, 0, L.pier.z - 1); W.add(pier);
    const tower = new THREE.Group(); const COL = ['#E8443A', '#F5B700', '#3B82F6', '#22C55E']; for (let i = 0; i < 5; i++) tower.add(at(box(2, 1, 2, COL[i % 4]), 0, i + .5, 0)); tower.position.set(L.pier.x + 12, 0, L.pier.z + 12); W.add(tower);
    // Boardwalk gate
    const bg = new THREE.Group(); for (const s of [-1, 1]) bg.add(at(cyl(.12, .14, 2.8, '#FFF8EE'), 0, 1.4, s * 1)); bg.add(at(box(.2, .5, 2.8, '#2FA7A0'), 0, 2.8, 0)); put(bg, 'boardwalk'); const bw = plankWalk(14, 1.6); bw.rotation.y = -Math.PI / 2; bw.position.set(L.boardwalk.x, 0, L.boardwalk.z); W.add(bw);
    // Beach
    put(palm(1.4), 'beach', -3, 1); put(palm(1.2), 'beach', 3.2, .4); const bb = sphere(.4, '#FFF8EE'); put(at(bb, 0, .35, 0), 'beach', 1, 2); const tugRope = cyl(.03, .03, 5, '#E9D3AE', 6); tugRope.rotation.z = 1.57; put(at(tugRope, 0, .05, 0), 'beach');
    // Notice board
    const nb = new THREE.Group(); for (const s of [-1, 1]) nb.add(at(cyl(.08, .09, 2, '#7A5A3C'), s * .9, 1, 0)); nb.add(at(box(2.3, 1.2, .12, '#C89B6A'), 0, 1.5, 0)); nb.add(at(box(.8, .6, .02, '#FFF8EE'), -.4, 1.5, .07)); nb.add(at(box(.7, .8, .02, '#F7E08A'), .55, 1.45, .07)); put(nb, 'board');
    // Bed hut
    const bh = new THREE.Group(); bh.add(at(rbox(3, 2.1, 2.6, .12, '#E9D3AE'), 0, 1.05, 0)); bh.add(at(cone(2.5, 1.3, '#F58A5C', 4), 0, 2.75, 0)); bh.children[1].rotation.y = .785; bh.add(at(box(.8, 1.5, .08, '#7A5A3C'), 0, .75, 1.3)); bh.add(at(sphere(.1, '#F5B700'), .28, .75, 1.36)); put(bh, 'bedHut');
    // Mirror pavilion
    const mp = pavilion(2.6, 2.6, 2.2, '#8E6BD8'); put(mp, 'mirror'); const fr = torus(.8, .08, '#F5B700'); fr.scale.y = 1.25; put(at(fr, 0, 1.2, 0), 'mirror'); const mg = new THREE.Mesh(new THREE.CircleGeometry(.76, 24), flat('#BDE7F4')); mg.scale.y = 1.25; put(at(mg, 0, 1.2, .01), 'mirror');
    // Gazebo with a dock
    const gz = pavilion(3, 3, 2.4, '#2FA7A0'); put(gz, 'gazebo'); put(crate(.7), 'gazebo', 2.4, 0);
    for (const k of Object.keys(L)) { /* signposts */ if (['board', 'jar', 'lighthouse'].includes(k)) continue; const s = new THREE.Group(); s.add(at(cyl(.05, .06, 1.3, '#7A5A3C'), 0, .65, 0)); s.add(at(rbox(.8, .3, .06, .03, '#FFF8EE'), 0, 1.2, 0)); s.rotation.y = -Math.atan2(L[k].z, L[k].x) - 1.57; put(s, k, -Math.cos(Math.atan2(L[k].z, L[k].x)) * (L[k].r + .6), -Math.sin(Math.atan2(L[k].z, L[k].x)) * (L[k].r + .6)); }
  }
  buildScatter() {
    const W = this.world, spots = Object.values(LANDMARKS);
    const clear = (x, z, r) => spots.every(s => Math.hypot(s.x - x, s.z - z) > s.r + r) && Math.abs(Math.hypot(x, z) - 19) > 1.3;
    let placed = 0, tries = 0; while (placed < 34 && tries++ < 500) { const a = cosRange(0, 6.283), d = cosRange(4, 21), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!clear(x, z, 1.1)) continue; const t = d > 15 ? palm(cosRange(.8, 1.3)) : tree(cosRange(.8, 1.4), pick(['#6FBF5A', '#7CC568', '#F4A6C0', '#5EAE64', '#FFD08A'])); t.position.set(x, 0, z); W.add(t); placed++; }
    for (let i = 0; i < 60; i++) { const a = cosRange(0, 6.283), d = cosRange(2, 14.5), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!clear(x, z, .2)) continue; const f = sphere(.07, pick(['#F4A6C0', '#FFF8EE', '#F7E04B', '#B4CCF4']), 1, .7, 1); W.add(at(f, x, .06, z)); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .2, r = 20.8; W.add(at(lantern(i % 2 ? '#F5B700' : '#F58A5C'), Math.cos(a) * r, 0, Math.sin(a) * r)); }
    W.add(bunting(LANDMARKS.lighthouse.x, 8, LANDMARKS.lighthouse.z, LANDMARKS.circus.x, 3, LANDMARKS.circus.z - 1, 22));
    W.add(bunting(LANDMARKS.bedHut.x, 3, LANDMARKS.bedHut.z, LANDMARKS.board.x + 1, 2.2, LANDMARKS.board.z, 10));
  }
  buildJar() {
    const g = new THREE.Group(); g.position.set(JAR_POS.x, .08, JAR_POS.z); this.jarGroup = g; this.world.add(g);
    const pts = [[.01, 0], [1, .02], [1.08, .12], [1.08, 1.9], [.86, 2.2], [.86, 2.45], [.95, 2.5]].map(p => new THREE.Vector2(p[0], p[1]));
    const jar = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glass()); jar.renderOrder = 5; g.add(jar);
    for (const [r, y] of [[1.08, .12], [1.08, 1.9], [.86, 2.2], [.95, 2.5]]) { const t = torus(r, .022, '#1A1420'); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
    for (const a of [.6, .9]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.05, a === .6 ? 1.2 : .7, .01), flat('#FFFFFF', .75)); s.position.set(Math.sin(a) * 1.07 - .4, 1, Math.cos(a) * 1.07); g.add(s); }
    g.add(at(cyl(1.3, 1.4, .1, '#C89B6A', 24), 0, -.04, 0));
    this.marbles = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 12, 9), toon('#ffffff'), 420); this.marbles.frustumCulled = false; { const c0 = new THREE.Color('#ffffff'); for (let i = 0; i < 420; i++) this.marbles.setColorAt(i, c0); } this.marbles.count = 0; g.add(this.marbles);
  }
  /** Rest layout: packed rings from the bottom, repeatable from the index. */
  marbleRest(i) { const perLayer = 28, layer = Math.floor(i / perLayer), k = i % perLayer; const ring = k < 1 ? 0 : k < 7 ? 1 : k < 17 ? 2 : 3; const counts = [1, 6, 10, 11], starts = [0, 1, 7, 17]; const a = (k - starts[ring]) / counts[ring] * 6.283 + layer * .7; const r = [0, .28, .56, .84][ring]; return [Math.cos(a) * r, .17 + layer * .25 + (ring % 2) * .05, Math.sin(a) * r]; }
  setMarbles(list) { const n = Math.min(list.length, 420); const m = new THREE.Matrix4(), c = new THREE.Color(); this.marbles.count = n; for (let i = 0; i < n; i++) { const p = this.marbleRest(i); m.makeTranslation(p[0], p[1], p[2]); this.marbles.setMatrixAt(i, m); this.marbles.setColorAt(i, c.set(list[i])); } this.marbles.instanceMatrix.needsUpdate = true; if (this.marbles.instanceColor) this.marbles.instanceColor.needsUpdate = true; }
  buildGuests() {
    const W = this.world, spots = Object.values(LANDMARKS);
    GUESTS.forEach((g, i) => { for (let n = 0; n < 2; n++) {
      const d = makeDoll({ paint: g.paint, hat: g.hat, skin: g.skin, height: g.height, width: g.width }); const s = spots[(i * 3 + n * 5) % spots.length];
      d.group.position.set(s.x + 2, 0, s.z + 2); d.rig.play('walk', 0); d.rig.mixer.setTime(cosmetic()); W.add(d.group);
      this.guests.push({ d, name: g.name, target: pick(spots), wait: cosRange(0, 3), speed: cosRange(.7, 1.1), key: ['margaret', 'kevin', 'sandra', 'sandra', 'paul', 'gerald'][i] });
    } });
  }
  showGuests(on) { for (const g of this.guests) g.d.group.visible = on; }
  tickGuests(dt) {
    const spots = Object.values(LANDMARKS);
    for (const g of this.guests) {
      if (!g.d.group.visible) continue; g.d.tick(dt); const p = g.d.group.position;
      if (g.wait > 0) { g.wait -= dt; if (g.wait <= 0) { g.target = pick(spots); g.d.rig.play('walk', .2); } continue; }
      const dx = g.target.x - p.x, dz = g.target.z - p.z, d = Math.hypot(dx, dz);
      if (d < g.target.r + 1) { g.wait = cosRange(2, 8); g.d.rig.play(pick(['idle', 'clap', 'breathe', 'idle']), .25); continue; }
      p.x += dx / d * g.speed * dt; p.z += dz / d * g.speed * dt; g.d.setFace(Math.atan2(dx, dz));
    }
  }
  nearestGuest(x, z, within = 2.2) { let best = null, bd = within; for (const g of this.guests) { if (!g.d.group.visible) continue; const d = Math.hypot(g.d.group.position.x - x, g.d.group.position.z - z); if (d < bd) { bd = d; best = g; } } return best; }
  setStage(stage) {
    this.stage = stage; this.heldX = null;
    // Raised on its rock so the low rim stays out of the sea at nine degrees.
    this.group.visible = true; this.group.position.set(0, 4, 0); this.group.scale.setScalar(1);
    if (stage === 'backdrop') this.group.position.set(55, 3.4, -95);
    if (stage === 'below') this.group.position.set(-2, 0, 9);
    this.lhTop.visible = stage !== 'below'; // The gallery set stands in for it.
    this.pivot.position.copy(this.group.position);
    if (stage === 'hidden') this.group.visible = false; this.pivot.visible = this.group.visible;
  }
  lightLamp(on) { this.lhLamp.material = toon(on ? '#FFE96B' : '#FFF2C2'); if (on && !this.lampLight) { this.lampLight = new THREE.PointLight(0xfff0a0, 90, 40, 1.2); this.lampLight.position.set(0, 12.6, 0); this.lighthouse.add(this.lampLight); } if (this.lampLight) this.lampLight.visible = on; }
  /** Thick outline on one landmark, built the first time it is hovered. */
  setOutline(id) {
    if (this.outlineId === id) return; if (this.outlineId && this.outlines[this.outlineId]) this.outlines[this.outlineId].visible = false; this.outlineId = id; if (!id) return;
    if (!this.outlines[id]) { const parts = id === 'jar' ? [this.jarGroup] : (this.lmParts[id] || []); const g = new THREE.Group(); for (const p of parts) { const o = outlineOf(p); p.getWorldPosition(new THREE.Vector3()); o.position.copy(p.position); o.quaternion.copy(p.quaternion); o.scale.copy(p.scale); g.add(o); } this.world.add(g); this.outlines[id] = g; }
    this.outlines[id].visible = true;
  }
  setRest(deg) { this.restDeg = deg; }
  restVec() { const r = this.restDeg * Math.PI / 180; return [r * .8, r * .6]; }
  setHeld(tx, tz) { this.heldX = tx; this.heldZ = tz; }
  tick(dt) {
    if (!this.group.visible) return;
    if (!this.tilt) {
      const [rx, rz] = this.restVec(); const tx = this.heldX ?? rx, tz = this.heldZ ?? rz; const k = 1 - Math.exp(-2.2 * dt);
      this.tx += (tx - this.tx) * k; this.tz += (tz - this.tz) * k;
      const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin(a / 2); this.group.quaternion.set(this.tz / a * s, 0, -this.tx / a * s, Math.cos(a / 2));
    } else { this.tx = this.tilt.tx; this.tz = this.tilt.tz; }
    this.tickGuests(dt);
  }
}
