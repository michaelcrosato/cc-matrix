import * as THREE from 'three/webgpu';
import { RAPIER, groups, createWorld } from '../physics/world.js';
import { MAP } from '../art/island.js';
import { MEDALS } from '../data/config.js';
import { h } from '../ui/dom.js';
import { cos } from '../core/rng.js';
import { line } from '../data/dialogue.js';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const CAP = 320;
export const medalColour = (id) => (MEDALS.find((m) => m.id === id) || MEDALS[0]).colour;
const JAR_R = 1.08 - 0.03, H = 1.86;

/** Settled positions for the marbles already in the jar, packed deterministically. */
export function packedPositions(n) {
  const out = [];
  let y = 0.17, layer = 0;
  while (out.length < n) {
    const rings = [[0, 1]];
    for (let r = 0.29; r < JAR_R - 0.15; r += 0.28) rings.push([r, Math.floor((2 * Math.PI * r) / 0.29)]);
    for (const [r, c] of rings) {
      for (let i = 0; i < c && out.length < n; i++) {
        const a = (i / c) * Math.PI * 2 + layer * 0.5;
        out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
    }
    y += 0.25; layer++;
    if (y > 2.3) y = 2.3;
  }
  return out;
}

/** Show the marbles in the jar on the island without any physics. */
export function refreshJarDisplay(game) {
  const art = game.art, p = game.save.profile;
  const mesh = art.marbleMesh;
  const log = p ? (p.marbleLog || []).slice(-CAP) : [];
  const pos = game.jarPositions && game.jarPositions.length === log.length ? game.jarPositions : packedPositions(log.length);
  mesh.count = log.length;
  for (let i = 0; i < log.length; i++) {
    _p.set(pos[i][0], pos[i][1], pos[i][2]); _q.set(0, 0, 0, 1);
    _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    mesh.setColorAt(i, _c.set(medalColour(log[i])));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Marbles pour into the jar on the island, as real balls. The count ticks up. Then the island creaks. */
export class JarMode {
  constructor(game, opts = {}) {
    this.game = game; this.opts = opts; this.name = 'jar'; this.canPause = false;
    this.bodies = []; this.shown = 0; this.spawned = 0; this.t = 0; this.stage = 'pour';
  }
  enter() {
    const g = this.game, o = this.opts;
    g.setIsland('home');
    g.ui.clear();
    g.programme.syncIsland();
    g.palette.set(g.programmePalette(), 1);
    g.audio.music('island');
    const p = g.save.profile;
    const world = this.world = createWorld({ iterations: 4 });
    world.createCollider(RAPIER.ColliderDesc.cylinder(0.1, 1.2).setTranslation(0, -0.08, 0).setFriction(0.5).setCollisionGroups(groups.anyProp()));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 2, 0.24).setTranslation(Math.cos(a) * (JAR_R + 0.06), 2, Math.sin(a) * (JAR_R + 0.06))
        .setRotation({ x: 0, y: Math.sin(-a / 2), z: 0, w: Math.cos(-a / 2) }).setFriction(0.2).setCollisionGroups(groups.anyProp()));
    }
    const log = p ? (p.marbleLog || []).slice(-CAP) : [];
    const newCount = Math.min(o.marbles ?? 0, log.length);
    this.total = log.length; this.fresh = newCount; this.log = log;
    const oldPos = packedPositions(log.length - newCount);
    for (let i = 0; i < log.length - newCount; i++) this.addBall(oldPos[i][0], oldPos[i][1], oldPos[i][2]);
    this.mesh = g.art.marbleMesh;
    this.mesh.count = log.length - newCount;
    this.scr = g.ui.open({
      name: 'jar', passive: true,
      build: (s) => {
        s.el.append(h('div.h2', { style: 'margin-top:3rem' }, 'The Jar'));
        this.countEl = h('div.bignum', '0');
        s.el.append(h('div', { style: 'position:absolute;right:12rem;top:24rem' }, this.countEl));
      },
    });
    const m = MAP.jar;
    const ph = g.phys;
    ph.setPosition(m.x + 2, m.z + 3);
    this.base = (p ? p.marbles : 0) - newCount;
    this.handle = g.scripts.run(this.flow());
    this.camera(true);
    this.syncMarbles();
  }
  addBall(x, y, z, vy = 0) {
    const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinvel(cos(-0.4, 0.4), vy, cos(-0.4, 0.4)).setCanSleep(true));
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.14).setMass(0.02).setFriction(0.3).setRestitution(0.35).setCollisionGroups(groups.anyProp()), b);
    this.bodies.push(b);
    return b;
  }
  *flow() {
    const g = this.game, o = this.opts;
    yield 0.5;
    const n = this.fresh;
    const gap = Math.max(0.03, Math.min(0.12, 2.2 / Math.max(1, n)));
    let hits = 0;
    for (let i = 0; i < n; i++) {
      this.addBall(cos(-0.2, 0.2), 3.2, cos(-0.2, 0.2), -2);
      this.mesh.count = this.bodies.length;
      const c = medalColour(this.log[this.bodies.length - 1]);
      this.mesh.setColorAt(this.bodies.length - 1, _c.set(c));
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      this.spawned++;
      g.audio.sfx('marble', { pitch: 1400 + cos(0, 2500) });
      hits++;
      if (hits % 3 === 0) g.audio.sfx('marbleRoll');
      this.count = this.base + this.spawned;
      this.countEl.textContent = String(this.count);
      yield gap;
    }
    this.count = this.base + n;
    this.countEl.textContent = String(this.count);
    if (o.unlocks && o.unlocks.length) {
      g.audio.sting('unlock');
      g.ui.toast(`New: ${o.unlocks.map((u) => u.name).join(', ')}. See the Mirror.`, 3.4);
    }
    yield 1.1;
    this.stage = 'notch';
    if (o.notch) {
      // The island creaks and comes up one notch. Everything shuffles.
      g.audio.sfx('creak', { dur: 2.6 });
      g.rig.shake(0.05);
      g.phys.setRest(g.programme.restDeg());
      const trudy = g.art.trudy;
      trudy.rig.once('gasp');
      g.speech.say('trudy', line('trudy', 'notch'), { auto: 0 });
      const l = g.speech.line;
      yield () => !g.speech.line || g.speech.line !== l;
    } else {
      g.speech.say('trudy', line('trudy', 'jar'), { auto: 0 });
      const l = g.speech.line;
      yield () => !g.speech.line || g.speech.line !== l;
    }
    this.stage = 'done';
    this.keep();
    g.go(() => { if (o.then) o.then(); else g.flow.toIsland({ afterJar: true, at: 'jar' }); });
  }
  keep() {
    const g = this.game;
    g.jarPositions = this.bodies.map((b) => { const t = b.translation(); return [t.x, Math.max(0.14, t.y), t.z]; });
  }
  camera(snap) {
    const g = this.game, m = MAP.jar;
    g.art.group.updateWorldMatrix(true, false);
    _p.set(m.x, 1.6, m.z).applyMatrix4(g.art.group.matrixWorld);
    g.rig.shot(_p.x + 0.6, _p.y + 1.2, _p.z + 7.2, _p.x, _p.y + 0.2, _p.z, { fov: 38, snap, rate: 3 });
  }
  fixed(dt) {
    const g = this.game;
    this.t += dt;
    g.stepIsland(dt, 0.2);
    this.world.step();
  }
  syncMarbles() {
    const mesh = this.mesh;
    for (let i = 0; i < this.bodies.length; i++) {
      const t = this.bodies[i].translation();
      _p.set(t.x, t.y, t.z); _q.set(0, 0, 0, 1);
      _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
      if (i < this.total - this.fresh) mesh.setColorAt(i, _c.set(medalColour(this.log[i])));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  frame(dt) {
    const g = this.game;
    g.syncIsland(dt);
    this.camera(false);
    this.syncMarbles();
  }
  exit() {
    const g = this.game;
    if (this.handle) this.handle.cancel();
    this.keep();
    if (this.world) { this.world.free(); this.world = null; }
    g.speech.clear();
    if (this.scr) g.ui.close(this.scr);
    g.ui.clear();
    refreshJarDisplay(g);
  }
}
