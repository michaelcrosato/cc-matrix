import * as THREE from 'three/webgpu';
import { EventBase, lerp } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { sphere, cyl, box, at, torus, cone, bunting } from '../art/props.js';
import { makeHeron } from '../art/heron.js';
import { makeWalrus } from '../art/walrus.js';
import { makeTrudy } from '../art/trudy.js';
import { makeGull } from '../art/gull.js';
const rad = (d) => d * Math.PI / 180;
const PHASES = [{ name: 'A pose, with breath', dur: 20 }, { name: 'Four stones', dur: 20 }, { name: 'The storm', dur: 20 }, { name: 'Step, in the wind', dur: 20 }, { name: 'The last hold', dur: 15 }];
export class GrandHold extends EventBase {
  static id = 'grandHold'; static title = 'The Grand Hold'; static discipline = 'Finale'; static instructor = 'trudy'; static place = 'The lighthouse gallery'; static music = 'level'; static palette = 'golden'; static diagram = 'ring';
  static sentence = 'Your balance is tied to the island. Everything you lean, it leans. Bring it level.';
  static can = 'You can fall. The class will catch you with a bedsheet.'; static cant = "You can't fail this one. It is too late for that.";
  static verbs = [['lean', 'Lean'], ['breath', 'Breathe'], ['flail', 'Flail']];
  static tiers = [{}];
  worldOpts() { return { iterations: 10 }; }
  groundY() { return 12; }
  buildSet() {
    this.usesBreath = true; this.isl = this.game.island; this.isl.setStage('below');
    this.add(cyl(2.8, 2.5, .3, '#E9D3AE', 24), 0, 11.85, 0);
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; this.add(at(cyl(.03, .03, 1, '#1A1420', 6), Math.cos(a) * 2.7, 12.5, Math.sin(a) * 2.7)); }
    const rail = torus(2.7, .05, '#E8443A'); rail.rotation.x = Math.PI / 2; this.add(rail, 0, 13, 0);
    const lamp = cyl(.6, .6, 1.8, '#FFF2C2', 16); this.add(lamp, 1.6, 12.9, 1.5); this.add(cone(.9, .9, '#3B82F6', 16), 1.6, 14.25, 1.5);
    this.trudy = makeTrudy(); this.add(this.trudy.group, -1.5, 12, -.6); this.trudy.group.rotation.y = Math.PI - .6; this.anim.push({ tick: (dt) => this.trudy.tick(dt, this.lanes[0]?.bal ? -this.lanes[0].bal.cobX * .2 : 0) });
    this.gary = makeGull(); this.gary.group.visible = false; this.add(this.gary.group); this.anim.push(this.gary);
    this.phaseI = 0; this.pt = 0; this.restarts = 0; this.camA = 0; this.stones = []; this.plate = null; this.tier = {}; this.scoreSum = 0; this.scoreN = 0; this.stormT = 3; this.cue = null; this.lastNotchFrac = 0; this.levelled = false; this.timeLimit = 200; this.cueT = 0;
    this.ringR = .3; this.flare = 0;
  }
  balanceOpts() { return { margin: .8, ankleMax: 6 }; }
  placeCamera(snap) { this.camA += .0016; const a = Math.PI + Math.sin(this.camA) * .55; const d = 9; this.game.rig.set(Math.sin(a) * d, 16.6, Math.cos(a) * d, 0, 11.9, 0, snap); this.camYaw = this.game.rig.yaw; for (const l of this.lanes) if (l.doll) l.doll.setFace(a); }
  start() { for (const l of this.lanes) { l.zone = { x: .3, z: .1, r: .3 }; l.sway = .1; l.tremor = .05; l.baseClip = 'pose_keeper'; l.doll.rig.play('breathe', 0); l.inT = 0; l.lastIn = 0; l.lastT = 0; } this.enterPhase(0, true); if (!this.attract) this.game.barkNow('trudy', 'grandStart'); }
  enterPhase(i, first) {
    this.phaseI = i; this.pt = 0; const l = this.lanes[0]; this.setMsg(PHASES[i]?.name || '');
    this.game.audio.sfx('bell');
    if (i === 0) { l.zone = { x: .3, z: .1, r: .3 }; l.sway = .1; l.tremor = .05; l.doll.rig.play('pose_keeper', .4); l.baseClip = 'pose_keeper'; }
    if (i === 1) { l.zone = { x: 0, z: 0, r: .35 }; l.sway = .12; l.doll.rig.play('holdSlab', .3); l.baseClip = 'holdSlab'; this.stoneNext = 1.5; this.stoneN = 0; this.addPlate(l); }
    if (i === 2) { l.zone = { x: 0, z: 0, r: .4 }; l.sway = .1; this.stormT = 2.5; l.doll.rig.play('breathe', .3); l.baseClip = 'breathe'; this.gary.group.visible = true; this.gary.rig.play('stand'); if (!this.attract) this.game.barkNow('trudy', 'gary'); }
    if (i === 3) { l.zone = null; l.sway = .1; this.cueT = 1; this.cue = null; l.doll.rig.play('idle', .3); l.baseClip = 'idle'; }
    if (i === 4) { l.zone = { x: 0, z: 0, r: .3 }; l.sway = .2; this.gary.group.visible = false; l.doll.rig.play('breathe', .3); l.baseClip = 'breathe'; if (!this.attract) this.game.barkNow('stillwater', 'final'); }
  }
  addPlate(l) { this.plateCol = this.world.createCollider(RAPIER.ColliderDesc.cuboid(.5, .03, .5).setTranslation(0, .95, 0).setMass(.04).setFriction(1).setCollisionGroups(G_PROP(l.id)), l.bal.body); this.plateM = box(1, .06, 1, '#8F8578'); this.plateM.position.y = 1.7; l.doll.lean.add(this.plateM); }
  dropStone(l) {
    const b = l.bal.body.translation(); const q = new THREE.Quaternion().copy(l.bal.body.rotation()); const top = this.stones.length ? this.stones[this.stones.length - 1].body.translation() : null; const hh = .08;
    const up = new THREE.Vector3(0, .98, 0).applyQuaternion(q); const y = top ? top.y + hh * 2 + .012 : b.y + up.y + hh + .012;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(top ? top.x : b.x + up.x, y, top ? top.z : b.z + up.z).setRotation(l.bal.body.rotation()).setLinearDamping(.1).setAngularDamping(.6).setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(.2, hh, .2).setMass(.02).setFriction(.95).setRestitution(0).setCollisionGroups(G_PROP(l.id)), body);
    const m = sphere(.25, '#BDB2A2', 1, .34, .95); this.group.add(m); this.stones.push({ body, m }); this.game.audio.sfx('clack', { f: 500 });
  }
  clearStones(thenPlate = false) { for (const s of this.stones) { this.group.remove(s.m); this.world.removeRigidBody(s.body); } this.stones = []; this.plateRemoveNext = thenPlate; }
  removePlate() { if (this.plateCol) { this.world.removeCollider(this.plateCol, true); this.plateCol = null; } if (this.plateM) { this.plateM.removeFromParent(); this.plateM = null; } }
  fixedPlay(dt) {
    const l = this.lanes[0], P = PHASES[this.phaseI]; this.pt += dt;
    if (this.plateRemoveNext) { this.plateRemoveNext = false; this.removePlate(); }
    if (this.phaseI === 1 && this.stoneN < 4) { this.stoneNext -= dt; if (this.stoneNext <= 0 && !l.fallen) { this.stoneNext = 4; this.stoneN++; this.dropStone(l); } }
    if (this.phaseI === 2) { this.stormT -= dt; if (this.stormT <= 1 && !this.warned) { this.warned = true; this.dir = this.r() * 6.283; l.brace = { x: -Math.cos(this.dir) * .6, z: -Math.sin(this.dir) * .6 }; this.game.audio.sfx('wind', { dur: 1.5 }); this.game.rig.shake(.05); } if (this.stormT <= 0) { this.stormT = 5; this.warned = false; if (!l.fallen) this.gust(l, Math.cos(this.dir) * 3, Math.sin(this.dir) * 3, .5); this.game.audio.sfx('splash', { big: .3 }); this.game.after(.6, () => { if (l) l.brace = null; }); } }
    if (this.phaseI === 3) { this.cueT -= dt; if (this.cueT <= 0) { this.cueT = 3; const d = [[-.55, 0], [.55, 0], [0, -.5], [0, .5]][Math.floor(this.r() * 4)]; this.cue = d; l.zone = { x: d[0], z: d[1], r: .3 }; this.game.audio.sfx('foot', { high: true }); this.game.audio.sfx('tick'); } }
    if (this.phaseI === 4) { const a = this.pt / P.dur, r = lerp(.3, .08, a); l.zone.r = r; l.sway = lerp(.2, .02, a); l.tremor = lerp(.05, .01, a); this.finalFrac = a; }
    if (!l.fallen && l.zone) { l.lastT += dt; if (Math.hypot(l.bal.cobX - l.zone.x, l.bal.cobZ - l.zone.z) <= l.zone.r) l.lastIn += dt; }
    l.form = Math.min(100, 100 * (l.lastIn / Math.max(1, l.lastT)));
    // The island follows you, and comes up as you hold on.
    const notch = this.game.preFinalTilt ?? 1.5, rest = this.phaseI >= 4 ? notch * (1 - this.pt / P.dur) : notch;
    const leanK = (this.phaseI >= 4 ? 1 - this.pt / P.dur : 1) * 2.4;
    this.isl.setHeld(rad(rest) * .8 + l.bal.leanX * leanK * .35, rad(rest) * .6 + l.bal.leanZ * leanK * .35);
    this.game.setDetuneDeg(rest);
    if (this.pt >= P.dur && !l.fallen) {
      if (this.phaseI === 1) this.clearStones(true);
      if (this.phaseI === PHASES.length - 1) { this.isl.setHeld(0, 0); this.game.setDetuneDeg(0); this.levelled = true; this.finish(); return; }
      this.enterPhase(this.phaseI + 1);
    }
  }
  fall(l) { super.fall(l); this.restarts++; this.game.comic('BEDSHEET!', 0, 13.8, 0, '#FFF8EE', 1); }
  onFall(l) { this.trudy.rig.play('gasp', .05, 'idle'); if (this.phaseI === 1) this.clearStones(true); if (l.kind === 'local') this.game.barkNow('trudy', 'fall'); }
  onRecover(l) { this.enterPhase(this.phaseI); }
  frame2() { const l = this.lanes[0]; if (l) { this.setNum(`${this.phaseI + 1}/5`, 'Phase'); this.setTime(PHASES[this.phaseI].dur - this.pt); for (const s of this.stones) { const p = s.body.translation(), q = s.body.rotation(); s.m.position.set(p.x, p.y, p.z); s.m.quaternion.set(q.x, q.y, q.z, q.w); } if (this.gary.group.visible) { this.gary.group.position.set(Math.sin(l.bal?.leanX || 0) * 1.55, 12 + 1.53, Math.sin(l.bal?.leanZ || 0) * 1.55); } } }
  botInput(i, t, skill, dt) { const l = this.lanes[i], br = this.botBrain(l); const z = l.zone || { x: 0, z: 0 }; let gx = z.x, gz = z.z; if (l.brace) { gx += l.brace.x; gz += l.brace.z; } const [x, y] = br.correct(dt, l, gx, gz, true); return { x, z: y, breath: (this.t % 8) < 4, flail: (l.bal?.angle || 0) > .56 }; }
  laneResult(i) { const l = this.lanes[i]; return { form: Math.max(l.form, 40), big: Math.round(l.form), label: 'Form', stats: `Bedsheet catches: ${this.restarts}. Exemplary, I suppose.` }; }
  onDispose() {}
  forceFinish() { this.isl.setHeld(0, 0); this.levelled = true; this.finish(); }
  forceThing() { for (const l of this.lanes) this.gust(l, 3, 0); }
}
