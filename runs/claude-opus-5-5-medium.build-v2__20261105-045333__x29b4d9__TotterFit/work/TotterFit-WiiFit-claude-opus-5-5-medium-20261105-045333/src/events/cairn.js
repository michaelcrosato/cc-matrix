import * as THREE from 'three/webgpu';
import { EventBase, lerp } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { sphere, box, at, cyl, rock, stoneStack, palm, mesh, tree } from '../art/props.js';
import { makeHeron } from '../art/heron.js';
const NORMAL = [[.26, .09], [.24, .085], [.22, .08], [.2, .078], [.18, .074], [.165, .07], [.15, .066], [.14, .062], [.125, .058], [.11, .054]];
const WIDE = [[.28, .09], [.27, .085], [.26, .08], [.25, .078], [.24, .074], [.23, .07], [.22, .066], [.21, .062], [.2, .058], [.19, .054]];
const COLS = ['#A69A8C', '#BDB2A2', '#8F8578', '#C7BBA9', '#9C9184', '#B3A794'];
export class Cairn extends EventBase {
  static id = 'cairn'; static title = 'The Cairn'; static discipline = 'Stillness'; static instructor = 'stillwater'; static place = 'Quarry Terrace'; static music = 'stillness'; static couch = true; static session = true; static diagram = 'stack';
  static sentence = 'Hold the slab overhead. Ms. Stillwater adds stones. Keep it level as the stack comes alive.';
  static can = 'You can breathe with the ring, and it helps enormously.'; static cant = "You can't catch a stone once it has left.";
  static verbs = [['lean', 'Lean'], ['breath', 'Breathe'], ['flail', 'Flail']];
  static tiers = [
    { stones: 6, every: 5.5, hold: 8, sway: [.1, .3], tremor: [.05, .15], offset: .015, set: NORMAL, par: 750 },
    { stones: 8, every: 5, hold: 10, sway: [.15, .4], tremor: [.08, .2], offset: .02, set: NORMAL, par: 980 },
    { stones: 10, every: 4.5, hold: 10, sway: [.15, .4], tremor: [.08, .2], offset: .02, set: WIDE, par: 1210 },
  ];
  static sessionConfig = { tier: 0, every: 6.5, hold: 11 };
  balanceOpts() { return { margin: .8, ankleMax: 6 }; }
  worldOpts() { return { iterations: 10 }; }
  buildSet() {
    this.usesBreath = true; this.camYaw = .42; this.faceYaw = -.42;
    this.nStones = this.tier.stones; this.every = this.opts.every || this.tier.every; this.holdEnd = this.opts.hold || this.tier.hold;
    const floor = cyl(10, 10.5, 2.4, '#D8CDBB', 28); this.add(floor, 0, -1.2, 0);
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + 1, d = 6 + (i % 3) * 1.1; this.add(rock(.4 + (i % 3) * .28), Math.cos(a) * d, .15, Math.sin(a) * d - 2); }
    this.add(stoneStack(4), -5.5, 0, -3); this.add(stoneStack(3), 4.8, 0, -4.6); this.add(palm(1.2), -7, 0, -5);
    const cliff = cyl(7, 9, 7, '#C7BBA9', 12); this.add(cliff, 3, -3.5, -14);
    this.heron = makeHeron(); this.heron.group.scale.setScalar(1.25); this.add(this.heron.group, -2.1 - (this.opts.laneCount || 1) * .9, 0, -.8); this.heron.group.rotation.y = 1.1; this.anim.push(this.heron);
    this.nextT = 1.5; this.placed = 0; this.ended = false;
  }
  placeCamera(snap) { const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0; const d = this.game.rig.fitDistance(7.6, spread); const a = .42; this.game.rig.set(-Math.sin(a) * d, 1.9, Math.cos(a) * d, 0, 1.45, 0, snap); }
  start() {
    for (const l of this.lanes) {
      l.stones = []; l.baseClip = 'holdSlab'; l.doll.rig.play('holdSlab', 0); l.distSum = 0; l.distN = 0; l.dropped = 0;
      if (l.kind === 'ghost') continue;
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(.55, .03, .55).setTranslation(0, .95, 0).setMass(.05).setFriction(1).setCollisionGroups(G_PROP(l.id)), l.bal.body);
      const slab = box(1.1, .08, 1.1, '#5F574E'); slab.position.y = 1.7; l.doll.lean.add(slab); l.slab = slab; l.sway = this.tier.sway[0]; l.tremor = this.tier.tremor[0];
    }
  }
  bodyPoint(l, y) { const b = l.bal.body.translation(), q = l.bal.body.rotation(); const v = new THREE.Vector3(0, y, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)); return { x: b.x + v.x, y: b.y + v.y, z: b.z + v.z }; }
  dropStone(l, idx) {
    if (l.fallen) return;
    const [r, hh] = this.tier.set[idx % this.tier.set.length];
    const top = l.stones.length ? l.stones[l.stones.length - 1] : null;
    let p; const off = this.tier.offset;
    if (top && !top.gone) { const tp = top.body.translation(); p = { x: tp.x + (this.r() - .5) * 2 * off, y: tp.y + top.hh + hh + .012, z: tp.z + (this.r() - .5) * 2 * off }; }
    else { const s = this.bodyPoint(l, .98); p = { x: s.x + (this.r() - .5) * 2 * off, y: s.y + hh + .012, z: s.z + (this.r() - .5) * 2 * off }; }
    const v = l.bal.body.linvel();
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation(l.bal.body.rotation()).setLinvel(v.x * .5, 0, v.z * .5).setLinearDamping(.1).setAngularDamping(.6).setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(r * .8, hh, r * .8).setMass(.02 * T.stoneMass).setFriction(.95).setRestitution(0).setCollisionGroups(G_PROP(l.id)), body);
    const m = sphere(r, COLS[idx % COLS.length], 1, hh / r * 1.25, .92); this.group.add(m);
    l.stones.push({ body, m, r, hh, gone: false });
    this.game.audio.sfx('clack', { f: 500 });
  }
  fixedPlay(dt) {
    const prog = Math.min(1, this.playT / (this.nStones * this.every + this.holdEnd));
    const interval = this.every * T.stoneInterval;
    for (const l of this.lanes) { l.sway = lerp(this.tier.sway[0], this.tier.sway[1], prog); l.tremor = lerp(this.tier.tremor[0], this.tier.tremor[1], prog); }
    if (this.placed < this.nStones && this.playT >= this.nextT) {
      for (const l of this.lanes) if (l.kind !== 'ghost') this.dropStone(l, this.placed);
      this.placed++; this.nextT += interval; this.heron.rig.play('peck', .2, 'stand');
      if (this.barkT <= 0 && !this.attract) this.bark('stillwater', 'stone');
      if (this.placed === this.nStones) this.holdStart = this.playT;
    }
    for (const l of this.lanes) { if (l.kind === 'ghost' || !l.bal || l.fallen) continue; l.distSum += Math.hypot(l.bal.cobX, l.bal.cobZ); l.distN++; }
    if (this.placed >= this.nStones && this.playT >= this.holdStart + this.holdEnd) { this.tally(); this.finish(); }
  }
  stonesUp(l) { if (l.fallen || !l.bal) return 0; const s = this.bodyPoint(l, .95); let n = 0; for (const st of l.stones) { if (st.gone) continue; const p = st.body.translation(); if (p.y > s.y - .1 && Math.hypot(p.x - s.x, p.z - s.z) < 1) n++; } return n; }
  postPlay() {
    for (const l of this.lanes) {
      if (l.kind === 'ghost') continue;
      for (const st of l.stones) { if (st.gone) continue; const p = st.body.translation(), q = st.body.rotation(); st.m.position.set(p.x, p.y, p.z); st.m.quaternion.set(q.x, q.y, q.z, q.w); if (!st.fellOff && l.bal && p.y < .5) { st.fellOff = true; l.dropped++; this.game.audio.sfx('clack', { f: 420 }); this.game.comic('CLONK', p.x, .8, p.z, '#FFF8EE', .55, .7); if (l.kind === 'local') this.bark('stillwater', 'stoneDrop'); } }
      l.onSlab = this.stonesUp(l);
      const steady = l.distN ? Math.max(0, 1 - (l.distSum / l.distN) / .5) : 0;
      l.score = 100 * l.onSlab + 10 * l.onSlab + 50 * steady;
      l.form = Math.min(100, 100 * l.score / this.tier.par);
    }
  }
  tally() {}
  frameLane() {}
  onFall(l) { if (l.slab) l.slab.visible = false; }
  onRecover(l) { if (l.slab) l.slab.visible = true; for (const st of l.stones) if (!st.fellOff) { st.fellOff = true; l.dropped++; } }
  onFlail(l) { if (l.kind === 'local') this.bark('stillwater', 'flail'); }
  frame2() { const l = this.localLanes()[0] || this.lanes[0]; if (l) this.setNum(l.onSlab ?? 0, 'Stones up'); this.setTime(this.placed < this.nStones ? this.nextT - this.playT : this.holdStart + this.holdEnd - this.playT); }
  botInput(i, t, skill, dt) { const l = this.lanes[i], br = this.botBrain(l); const [x, z] = br.correct(dt, l, 0, 0, true); return { x, z, breath: this.opts.botMode === 'nobreath' ? false : (this.t % 8) < 4 }; }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: l.onSlab ?? 0, label: 'Stones standing', stats: `${l.dropped} dropped. Floor Exercises: ${l.falls}` }; }
  forceThing() { for (const l of this.lanes) if (l.kind !== 'ghost') this.dropStone(l, this.placed % this.tier.set.length); }
}
