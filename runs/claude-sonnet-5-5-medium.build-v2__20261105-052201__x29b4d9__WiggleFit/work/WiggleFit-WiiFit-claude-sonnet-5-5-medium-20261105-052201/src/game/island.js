import * as THREE from 'three/webgpu';
import { RAPIER, PhysWorld, GROUND, groundGroups } from '../physics/world.js';
import { box, cyl, ball, cone, disc, toyTree, bunting } from '../art/props.js';
import { createDoll, PAINTS } from '../art/doll.js';
import { createTrudy, createGull } from '../art/chars.js';
import { Rig } from '../anim/rig.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

export const HOTSPOTS = [
  { id: 'lighthouse', label: 'The Grand Hold', x: 2, z: -9 }, { id: 'jar', label: 'The Jar', x: -3, z: -4 }, { id: 'plates', label: 'Plate Spinners', x: 0, z: 2 },
  { id: 'poses', label: 'Sun Deck: Poses', x: -16, z: -3 }, { id: 'stillWater', label: 'Lily Pond', x: -13, z: 7 }, { id: 'cairn', label: 'Quarry Terrace: The Cairn', x: -9, z: -13 },
  { id: 'logReps', label: 'The Yard: Log Reps', x: -7, z: 14 }, { id: 'gazebo', label: 'Gazebo: Group Class', x: 14, z: -11 }, { id: 'stepClass', label: 'Bandstand: Step Class', x: 15, z: -3 },
  { id: 'roomService', label: 'Boardwalk: Room Service', x: 19, z: 3 }, { id: 'fruitHat', label: 'Pier: Fruit Hat', x: 15, z: 12 }, { id: 'tug', label: 'Beach: Tug of Peace', x: 5, z: 17 },
  { id: 'board', label: "Notice Board: Today's Plan", x: 1, z: 9 }, { id: 'bed', label: 'Bed Hut', x: 8, z: 8 }, { id: 'mirror', label: 'The Mirror', x: 9, z: -14 },
  { id: 'springboard', label: 'Springboard Tower', x: 20, z: 15 }, { id: 'plank', label: 'The Beam: Plank & Perch', x: 11, z: 15 }, { id: 'raft', label: "Dock: Tippy Raft", x: 17, z: -14 }, { id: 'islandLoop', label: 'Ring Road: Island Loop', x: -19, z: 3 },
];
const pav = (x, z, c1, c2, w = 4, h = 3) => { const g = new THREE.Group(); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.4, h, 0.4, c1, dx * w / 2, h / 2, dz * w / 2)); const r = box(w + 1, 0.4, w + 1, c2, 0, h + 0.2, 0); g.add(r); g.add(box(w + 0.6, 0.18, w + 0.6, '#E8C890', 0, 0.09, 0)); g.position.set(x, 0, z); return g; };

export class Island {
  constructor(gfx) {
    this.gfx = gfx; this.group = new THREE.Group(); this.group.position.y = 3.4; this.tilt = new THREE.Group(); this.group.add(this.tilt); this.root = this.tilt;
    this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.rest = 9; this.guests = []; this.oranges = []; this.t = 0; this.pw = null; this.marbleCount = 0; this.levelled = false;
    this.build();
  }
  build() {
    const g = this.root;
    g.add(disc(22, 1.2, '#E8D49A', 0, -0.6, 0)); const grass = disc(15, 1.2, '#7CCB6A', 0, -0.59, 0); g.add(grass);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(22, 28, 20), toon('#7A6A5A')); rock.rotation.x = Math.PI; rock.position.y = -15.2; g.add(rock);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const f = box(1.9 * 2 * 0.58, 0.9, 0.3, i % 2 ? '#D9AE6E' : '#C99A62', Math.cos(a) * 21.8, 0.45, Math.sin(a) * 21.8); f.rotation.y = -a + Math.PI / 2; g.add(f); }
    // lighthouse
    const lh = new THREE.Group(); lh.position.set(2, 0, -9); for (let i = 0; i < 6; i++) lh.add(cyl(2.2 - i * 0.18, 1.4, i % 2 ? '#F6EAD0' : '#D94A3A', 0, 0.7 + i * 1.4, 0, 20)); lh.add(cyl(1.3, 0.4, '#3A3A4A', 0, 8.6, 0), cyl(0.8, 1, '#FFF2A0', 0, 9.3, 0, 12), cone(1.2, 1.2, '#3B82F6', 0, 10.4, 0, 12)); g.add(lh); this.lighthouse = lh; this.lamp = lh.children[lh.children.length - 2];
    // landmarks
    g.add(pav(-16, -3, '#2A9D8F', '#F4A261', 5)); g.add(pav(15, -3, '#E76F51', '#2A9D8F', 5)); g.add(pav(0, 2, '#F4A261', '#E76F51', 3, 2.6)); g.add(pav(14, -11, '#9B5DE5', '#F5B700', 4)); g.add(pav(8, 8, '#2A9D8F', '#B9824A', 3)); g.add(pav(9, -14, '#FF6FB5', '#2A9D8F', 3.6)); g.add(pav(-7, 14, '#3B82F6', '#F5B700', 4));
    const pier = box(3, 0.3, 14, '#B98A52', 15, -0.1, 18.5); g.add(pier); for (let k = 0; k < 6; k++) g.add(cyl(0.16, 3, '#7A4F2A', 13.8 + (k % 2) * 2.4, -1.4, 13 + k * 2.4, 8)); g.add(box(1.6, 0.3, 1.6, '#E8443A', 15, 3.4, 26)); g.add(box(0.4, 3.4, 0.4, '#7A4F2A', 15, 1.7, 26));
    g.add(box(1.5, 0.12, 8, '#B98A52', 19, 0.02, 7));
    const board = new THREE.Group(); board.position.set(1, 0, 9); board.add(box(0.2, 2.2, 0.2, '#7A4F2A', -1.1, 1.1, 0), box(0.2, 2.2, 0.2, '#7A4F2A', 1.1, 1.1, 0), box(2.8, 1.5, 0.15, '#C99A62', 0, 1.7, 0), box(0.8, 0.6, 0.05, '#FFF4DC', -0.6, 1.8, 0.1), box(0.8, 0.5, 0.05, '#FFF4DC', 0.5, 1.6, 0.1)); g.add(board);
    const pond = disc(4.2, 0.1, '#4FC3D9', -13, 0.0, 7); g.add(pond); for (let i = 0; i < 4; i++) g.add(disc(0.7, 0.06, '#5DBB63', -13 + Math.cos(i * 1.6) * 2, 0.08, 7 + Math.sin(i * 1.6) * 2));
    for (let i = 0; i < 6; i++) g.add(box(1.6 - i * 0.2, 0.5, 1.6 - i * 0.2, '#C8C0B0', -9, 0.25 + i * 0.5, -13));
    const circ = disc(3, 0.06, '#E8443A', 0, 0.03, 2); g.add(circ);
    for (let i = 0; i < 18; i++) { const a = i * 2.4, rr = 9 + (i % 6) * 2; const tx = Math.cos(a) * rr, tz = Math.sin(a) * rr; if (HOTSPOTS.some((h) => Math.hypot(h.x - tx, h.z - tz) < 4.5)) continue; g.add(toyTree(tx, tz, 0.8 + (i % 3) * 0.3)); }
    g.add(bunting(-16, -5, 15, -5, 4.5)); g.add(bunting(15, -5, 8, 8, 4));
    // jar
    this.jar = new THREE.Group(); this.jar.position.set(-3, 0, -4); this.buildJar(this.jar); g.add(this.jar);
    // oranges
    this.orangeMeshes = []; for (let i = 0; i < 12; i++) { const o = ball(0.2, '#FF8A1F'); g.add(o); this.orangeMeshes.push(o); }
    // trudy
    this.trudy = createTrudy(); g.add(this.trudy.root);
    // guests
    const specs = [{ name: 'Gentle Margaret', paint: 7, hat: 4, w: 1 }, { name: 'Retired Kevin', paint: 6, hat: 1, w: 1.05 }, { name: 'Sandra', paint: 5, hat: 2, w: 0.95 }, { name: 'Sandra', paint: 5, hat: 2, w: 0.95 }, { name: 'Unsteady Paul', paint: 8, hat: 0, w: 1 }, { name: 'Young Gerald', paint: 9, hat: 3, w: 0.9, scale: 0.9 }];
    specs.forEach((s, i) => { const d = createDoll({ paint: s.paint, hat: s.hat, scale: s.scale || 1, width: s.w }); const rig = new Rig(d); rig.play('walk', 0); g.add(d.root); const a = i * 1.1 + 0.5; const path = [HOTSPOTS[(i * 3 + 3) % 12], HOTSPOTS[(i * 5 + 7) % 12], HOTSPOTS[(i * 2 + 1) % 12]]; this.guests.push({ d, rig, name: s.name, path, k: 0, x: path[0].x + 2, z: path[0].z + 2, wait: 0 }); });
    this.gull = createGull(); this.gull.root.position.set(1, 3, -9); g.add(this.gull.root);
    // player
    this.player = null; this.px = 0; this.pz = 10; this.fx = 0; this.fz = 0; this.face = Math.PI; this.walking = 0;
    this.setLevel(0);
  }
  buildJar(g) {
    const pts = [[0.01, 0], [1, 0.02], [1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.86, 2.45], [0.95, 2.5]].map((p) => new THREE.Vector2(p[0], p[1]));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshBasicNodeMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); g.add(glass);
    for (const [r, y] of [[1.08, 0.12], [1.08, 1.9], [0.86, 2.2], [0.95, 2.5]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 28), toon('#1A1420')); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
    g.add(cyl(1.2, 0.1, '#C99A62', 0, 0.05, 0, 20));
    this.jarInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), toon('#ffffff'), 220); this.jarInst.count = 0; this.jarInst.castShadow = true; g.add(this.jarInst); this.jarInst.frustumCulled = false;
  }
  marbleColors(n, medals) { return n; }
  setMarbles(list) { // list of medal indices
    const inst = this.jarInst; const cols = ['#B8C0C8', '#6FB7FF', '#FFC83D', '#FF6FB5', '#B05CFF']; let k = 0; const m = new THREE.Matrix4(); const c = new THREE.Color();
    const n = Math.min(list.length, 220); for (let i = 0; i < n; i++) { const layer = Math.floor(i / 22), idx = i % 22; const a = idx / 22 * Math.PI * 2 + layer * 0.7; const rr = idx < 8 ? 0.2 + (idx % 4) * 0.12 : 0.55 + (idx % 3) * 0.12; m.setPosition(Math.cos(a) * Math.min(rr, 0.85), 0.2 + layer * 0.2, Math.sin(a) * Math.min(rr, 0.85)); inst.setMatrixAt(i, m); c.set(cols[Math.min(4, list[i] ?? 1)]); inst.setColorAt(i, c); }
    inst.count = n; inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true; this.marbleCount = n;
  }
  setLevel(frac) { // frac 0..1 of the programme completed
    this.restTarget = tuning.islandRest * (1 - frac); this.frac = frac; this.levelled = frac >= 1;
    const lean = THREE.MathUtils.degToRad(9 * (1 - frac)); this.lighthouse.rotation.z = -lean; this.lighthouse.rotation.x = 0; this.lamp.material.color && this.lamp.material.color.set(this.levelled ? '#FFF2A0' : '#C8B86A');
  }
  // ---- physics world
  mountPhysics() {
    this.unmountPhysics(); this.pw = new PhysWorld(tuning.gravity); const w = this.pw.world;
    const gb = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)); w.createCollider(RAPIER.ColliderDesc.cylinder(0.5, 22).setFriction(0.9).setCollisionGroups(groundGroups()), gb);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2); const b = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(Math.cos(a) * 22.2, 0.5, Math.sin(a) * 22.2).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })); w.createCollider(RAPIER.ColliderDesc.cuboid(1.9, 1, 0.15).setCollisionGroups(groundGroups()), b); }
    this.walker = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(this.px, 0.8, this.pz).lockRotations().setCanSleep(false));
    w.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setMass(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(0x00010001 | 0x00040004), this.walker);
    // static solid obstacles: lighthouse, jar, pavilion posts approximated by a few cylinders
    for (const [x, z, r] of [[2, -9, 2.2], [-3, -4, 1.2], [1, 9, 1.4]]) { const b = w.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, 1, z)); w.createCollider(RAPIER.ColliderDesc.cylinder(1, r).setCollisionGroups(groundGroups()), b); }
    this.oranges = this.orangeMeshes.map((m, i) => { const a = i * 0.9, r = 3 + (i % 5) * 1.6; const b = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(Math.cos(a) * r + 3, 0.5, Math.sin(a) * r + 4).setCanSleep(false).setLinearDamping(0.3).setAngularDamping(0.3)); w.createCollider(RAPIER.ColliderDesc.ball(0.2).setMass(0.1).setFriction(0.5).setRestitution(0.3).setCollisionGroups(groundGroups()), b); return b; });
    this.tx = THREE.MathUtils.degToRad(this.rest); this.tz = 0; this.vx = this.vz = 0;
  }
  unmountPhysics() { if (this.pw) { this.pw.free(); this.pw = null; this.oranges = []; } }
  // fixed tick; inp = {mx, mz} island-local desired move direction (unit disc)
  fixed(dt, inp) {
    if (!this.pw) return; this.t += dt;
    const K = tuning.islandSpring, C = 1.8, W = K * THREE.MathUtils.degToRad(tuning.islandWeight) / 22; const rest = THREE.MathUtils.degToRad(this.restTarget ?? tuning.islandRest);
    // rest tilt leans toward +x (that side goes down) and slightly +z; the island rests tipped at a fixed heading
    const rx = rest * Math.cos(0.5), rz = rest * Math.sin(0.5);
    const p = this.walker.translation();
    this.vx += (K * rx + W * p.x - K * this.tx - C * this.vx) * dt; this.tx += this.vx * dt; this.vz += (K * rz + W * p.z - K * this.tz - C * this.vz) * dt; this.tz += this.vz * dt;
    const g = tuning.gravity; this.pw.world.gravity = { x: g * Math.sin(this.tx), y: -g * Math.cos(Math.hypot(this.tx, this.tz)), z: g * Math.sin(this.tz) };
    const sp = tuning.walkSpeed; const v = this.walker.linvel(); const mx = inp ? inp.mx : 0, mz = inp ? inp.mz : 0;
    this.walker.setLinvel({ x: mx * sp + this.tx * 3, y: v.y, z: mz * sp + this.tz * 3 }, true);
    if (Math.hypot(mx, mz) > 0.1) { this.face = Math.atan2(mx, mz); this.walking = Math.min(1, Math.hypot(mx, mz)); } else this.walking = 0;
    this.pw.step();
    const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin(a / 2);
    this.root.quaternion.set(this.tz / a * s, 0, -this.tx / a * s, Math.cos(a / 2));
  }
  frame(dt) {
    const p = this.walker ? this.walker.translation() : { x: this.px, y: 0.8, z: this.pz }; this.px = p.x; this.pz = p.z;
    if (this.player) {
      const d = this.player.d; d.root.position.set(p.x, 0.0, p.z); d.root.rotation.y = this.face;
      const cq = this.root.quaternion.clone().invert(); d.root.quaternion.premultiply(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), cq, 0.75));
      const sw = this.walking > 0.1; this.player.rig.play(sw ? 'walk' : 'idle', 0.15); this.player.rig.update(dt * (sw ? Math.max(0.5, this.walking) : 1));
    }
    // trudy follows
    const tr = this.trudy.root; const dx = p.x - this.fx, dz = p.z - this.fz; const dist = Math.hypot(dx, dz);
    if (this.trudyHold === undefined) { this.fx = p.x - 2; this.fz = p.z + 1; this.trudyHold = true; }
    if (dist > 2.6) { this.fx += dx / dist * (dist - 2.6) * Math.min(1, dt * 4); this.fz += dz / dist * (dist - 2.6) * Math.min(1, dt * 4); }
    const hop = Math.abs(Math.sin(this.t * 6)) * (dist > 2.7 ? 0.25 : 0.03); tr.position.set(this.fx, hop, this.fz); tr.rotation.y = Math.atan2(p.x - this.fx, p.z - this.fz);
    this.trudy.bubble.position.x = THREE.MathUtils.clamp(-Math.sin(this.tx) * 2.6 * Math.cos(tr.rotation.y) + Math.sin(this.tz) * 2.6 * Math.sin(tr.rotation.y), -0.22, 0.22) * (this.levelled ? 0 : 1);
    this.trudy.root.userData.body.scale.set(1, 1 - hop * 0.2, 1);
    // guests wander
    for (const gst of this.guests) { const tgt = gst.path[gst.k % gst.path.length]; const ddx = tgt.x + 2 - gst.x, ddz = tgt.z + 2 - gst.z, dd = Math.hypot(ddx, ddz);
      if (dd < 0.5) { gst.wait += dt; gst.rig.play('idle', 0.3); if (gst.wait > 4) { gst.k++; gst.wait = 0; } } else { gst.x += ddx / dd * 1.6 * dt; gst.z += ddz / dd * 1.6 * dt; gst.d.root.rotation.y = Math.atan2(ddx, ddz); gst.rig.play('walk', 0.2); }
      gst.d.root.position.set(gst.x, 0, gst.z); gst.rig.update(dt); }
    // gull
    const ga = this.t * 0.6; this.gull.root.position.set(2 + Math.cos(ga) * 6, 6 + Math.sin(ga * 2) * 1.2, -9 + Math.sin(ga) * 6); this.gull.root.rotation.y = -ga + Math.PI; this.gull.J.wingL.rotation.z = Math.sin(this.t * 14) * 0.6; this.gull.J.wingR.rotation.z = -Math.sin(this.t * 14) * 0.6;
    this.oranges.forEach((b, i) => { const t = b.translation(); this.orangeMeshes[i].position.set(t.x, t.y, t.z); });
    this.lamp.rotation.y += dt;
  }
  setTiltStatic(deg) { this.restTarget = deg; const r = THREE.MathUtils.degToRad(deg); this.tx = r * Math.cos(0.5); this.tz = r * Math.sin(0.5); const a = Math.hypot(this.tx, this.tz) || 1e-9, s = Math.sin(a / 2); this.root.quaternion.set(this.tz / a * s, 0, -this.tx / a * s, Math.cos(a / 2)); }
  setPlayer(doll) { if (this.player) this.player.d.root.removeFromParent(); this.player = doll; if (doll) this.root.add(doll.d.root); }
  nearest(px, pz, maxD = 3.2) { let b = null, bd = maxD; for (const h of HOTSPOTS) { const d = Math.hypot(h.x - px, h.z - pz); if (d < bd) { bd = d; b = h; } } return b; }
  teleport(x, z) { this.px = x; this.pz = z; if (this.walker) { this.walker.setTranslation({ x, y: 0.8, z }, true); this.walker.setLinvel({ x: 0, y: 0, z: 0 }, true); } }
}
