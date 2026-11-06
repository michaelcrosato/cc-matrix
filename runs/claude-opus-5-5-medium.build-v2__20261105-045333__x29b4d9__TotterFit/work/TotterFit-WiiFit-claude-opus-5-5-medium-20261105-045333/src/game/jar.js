// Marbles pour into the jar on the island, as real Rapier balls.
import * as THREE from 'three/webgpu';
import { RAPIER, makeWorld, groups } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { JAR_POS } from '../art/island.js';
import { cosRange } from '../core/rng.js';
import { el, txt } from '../ui/ui.js';
const G = groups(1, 1);
export class JarMode {
  constructor(game, old, adds) {
    this.game = game; this.screen = 'jar'; this.isl = game.island; this.isl.setStage('hub'); this.old = old.slice(-400); this.adds = adds; this.added = 0; this.dynamic = []; this.t = 0; this.spawnT = .3; this.done = false;
    this.world = makeWorld({ iterations: 6 });
    const base = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed()); this.world.createCollider(RAPIER.ColliderDesc.cylinder(.1, 1.1).setTranslation(0, -.05, 0).setFriction(.5).setCollisionGroups(G), base);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; const w = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(Math.cos(a) * 1.13, 1.3, Math.sin(a) * 1.13).setRotation({ x: 0, y: Math.sin(-a / 2), z: 0, w: Math.cos(-a / 2) })); this.world.createCollider(RAPIER.ColliderDesc.cuboid(.05, 1.4, .24).setFriction(.3).setCollisionGroups(G), w); }
    // Old marbles settle as a heap of fixed balls; new ones pour on top.
    this.statics = []; old.slice(-400).forEach((c, i) => { const p = this.isl.marbleRest(i); const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p[0], p[1], p[2])); this.world.createCollider(RAPIER.ColliderDesc.ball(.14).setFriction(.4).setCollisionGroups(G), b); });
    this.mesh = this.isl.marbles; this.isl.setMarbles(this.old); this.count = this.old.length; this.c = new THREE.Color(); this.m = new THREE.Matrix4();
    const q = this.isl.jarGroup; const pos = new THREE.Vector3(); q.getWorldPosition(pos); game.rig.set(pos.x + 1, pos.y + 2.2, pos.z + 6.6, pos.x, pos.y + 1.15, pos.z, true); game.rig.damp = 5;
    const hud = game.ui.hud; hud.innerHTML = ''; this.num = el('div', 'hudnum'); hud.appendChild(this.num); this.tot = old.length; this.setNum(); this.isl.setStage('hub');
  }
  setNum() { this.num.textContent = String(this.tot); this.num.appendChild(txt('small', '', 'Marbles')); }
  fixed(dt) {
    this.t += dt; this.spawnT -= dt;
    if (this.added < this.adds.length && this.spawnT <= 0) {
      this.spawnT = Math.max(.04, .16 - this.adds.length * .002);
      const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(cosRange(-.18, .18), 3.1, cosRange(-.18, .18)).setLinvel(cosRange(-.3, .3), -1, cosRange(-.3, .3)).setCcdEnabled(true));
      this.world.createCollider(RAPIER.ColliderDesc.ball(.14).setRestitution(.35).setFriction(.4).setMass(.05).setCollisionGroups(G), b);
      const i = this.count + this.added; this.mesh.count = Math.min(420, i + 1); this.c.set(this.adds[this.added]); if (i < 420) this.mesh.setColorAt(i, this.c); if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.dynamic.push({ b, i, hit: false }); if (this.added % 3 === 0) this.game.audio.sfx('roll'); this.added++; this.tot++; this.setNum();
    }
    this.world.step();
    for (const d of this.dynamic) { const p = d.b.translation(); if (d.i < 420) { this.m.makeTranslation(p.x, p.y, p.z); this.mesh.setMatrixAt(d.i, this.m); } if (!d.hit && p.y < 1.9 && d.b.linvel().y > -3.5) { d.hit = true; this.game.audio.sfx('marble', { r: cosRange(0, 1), f: 1500 + this.tot * 3 }); } }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.added >= this.adds.length && this.t > this.adds.length * .16 + 1.6) this.done = true;
  }
  frame(dt) { this.isl.tick(dt); }
  dispose() { this.world.free(); this.world = null; this.game.ui.hud.innerHTML = ''; }
}
