import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { RAPIER, makeWorld, G_GROUND, groups, GROUND, G_RAGDOLL } from '../physics/world.js';
import { TiltModel } from '../physics/island.js';
import { T } from '../core/tuning.js';
import { cyl, box, at, torus, buoy, sphere, rock, cone, mesh, toon } from '../art/props.js';
import { makeGull } from '../art/gull.js';
const rad = (d) => d * Math.PI / 180;
export class Raft extends EventBase {
  static id = 'raft'; static title = 'Tippy Raft'; static discipline = 'Balance Play'; static instructor = 'trudy'; static place = 'A round raft, at sea'; static music = 'balance'; static couch = true; static standing = false; static diagram = 'raft';
  static sentence = 'Everyone is on one raft, which tilts toward everyone. Shove. Stay on. Last doll standing.';
  static can = 'You can walk, hop and shove with Flail.'; static cant = "You can't stand still for long: the raft is getting smaller.";
  static verbs = [['walk', 'Walk'], ['flail', 'Shove'], ['hop', 'Hop']];
  static tiers = [{ shrink: 12, swell: 6 }, { shrink: 10, swell: 5 }, { shrink: 8, swell: 4 }];
  makeEventWorld() { this.world = makeWorld({ iterations: 6 }); const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.5, 0)); this.world.createCollider(RAPIER.ColliderDesc.cylinder(.5, 40).setFriction(.9).setCollisionGroups(G_GROUND), b); }
  buildSet() {
    this.moveMode = true; this.flailOk = false;
    this.raftG = new THREE.Group(); this.add(this.raftG); this.rings = [];
    for (let r = 6; r >= 2; r--) { const c = cyl(r, r - .1, .24, r % 2 ? '#C89B6A' : '#B58457', 32); c.position.y = -.12 - (6 - r) * .0005; c.userData.r = r; this.raftG.add(c); this.rings.push(c); }
    const mast = cyl(.09, .1, 2.6, '#7A5A3C'); this.raftG.add(at(mast, 0, 1.3, 0)); const flag = cone(.3, .7, '#E8443A', 3); flag.rotation.z = -1.57; this.raftG.add(at(flag, .36, 2.3, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const barrel = cyl(.3, .3, 1.2, '#7A5A3C', 12); barrel.rotation.x = Math.PI / 2; barrel.rotation.y = -a; this.rings[0].add(at(barrel, Math.cos(a) * 5.75, -.1, Math.sin(a) * 5.75)); }
    this.add(buoy(), -11, -.4, -6); this.add(buoy('#F5F0E0'), 12, -.4, -2); this.add(rock(2.2), -18, -.4, -18);
    this.wave = sphere(5, '#BDF2F2', 1, .22, .34); this.wave.visible = false; this.add(this.wave);
    this.gull = makeGull(); this.gull.rig.play('fly'); this.raftG.add(this.gull.group); this.gull.group.position.set(0, 2.7, 0); this.gull.rig.play('stand'); this.anim.push(this.gull);
    this.tilt = new TiltModel({ K: 6, C: 3.5, W: 6 * rad(14) / 6 });
    this.round = 0; this.wins = {}; this.radius = 6; this.shrinkT = this.tier.shrink; this.swellT = this.tier.swell; this.warn = 0; this.roundT = 0; this.between = 0; this.swellDir = 0; this.lanesOut = 0; this.roundLog = []; this.maxRound = 0;
  }
  placeCamera(snap) { this.game.rig.set(0, 10.5, 11.5, 0, .2, -.2, snap); }
  laneX(i, n) { const a = i / Math.max(n, 2) * 6.283 + .7; return Math.cos(a) * 3; }
  start() {
    for (const l of this.lanes) { l.px = 0; l.pz = 0; l.vx = 0; l.vz = 0; l.out = false; l.shoveCd = 0; l.wins = 0; l.face = 0; l.jump = 0; l.baseClip = 'walk'; l.doll.rig.play('idle', 0); l.customPose = true; l.hopY = 0; l.hopV = 0; l.goalA = this.r() * 6.28; l.sinkT = 0; }
    this.resetRound();
  }
  resetRound() {
    this.radius = 6; this.shrinkT = this.tier.shrink; this.swellT = this.tier.swell; this.warn = 0; this.roundT = 0; this.between = 0; this.tilt.tx = this.tilt.tz = this.tilt.vx = this.tilt.vz = 0; this.setMsg('');
    for (const r of this.rings) { r.visible = true; r.position.x = 0; r.position.z = 0; r.userData.drift = 0; }
    const n = this.lanes.length; this.lanes.forEach((l, i) => {
      const a = i / n * 6.283 + .7; l.px = Math.cos(a) * 3; l.pz = Math.sin(a) * 3; l.vx = l.vz = 0; l.out = false; l.shoveCd = .5; l.hopY = 0; l.hopV = 0; l.doll.group.visible = true; l.sinkT = 0;
      if (l.kind !== 'ghost' && !l.body) { const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(l.px, .9, l.pz).lockRotations().setCanSleep(false)); this.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3).setMass(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(groups(0x0100 << i, GROUND)), b); l.body = b; }
      if (l.body) { l.body.setTranslation({ x: l.px, y: .9, z: l.pz }, true); l.body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
    });
  }
  fixedPlay(dt) {
    if (this.between > 0) { this.between -= dt; if (this.between <= 0) { if (this.round >= 3 || this.lanes.some(l => l.wins >= 2)) { this.tally(); this.finish(); return; } this.resetRound(); } this.stepRaft(dt); return; }
    this.roundT += dt; this.maxRound = Math.max(this.maxRound, this.roundT);
    this.shrinkT -= dt; if (this.shrinkT <= 0 && this.radius > 2) { this.shrinkT = this.tier.shrink; this.radius -= 1; const ring = this.rings.find(r => r.userData.r === this.radius + 1); if (ring) ring.userData.drift = 1; this.game.audio.sfx('creak', { dur: .9 }); this.game.comic('CREAK', 0, 2.5, 0, '#FFF8EE', .8, .9); }
    this.swellT -= dt;
    if (this.swellT <= 1 && this.warn <= 0 && !this.swellArmed) { this.swellArmed = true; this.warn = 1; this.swellDir = this.r() * 6.283; this.game.audio.sfx('wind', { dur: 1.1 }); this.setMsg('Swell!'); }
    if (this.warn > 0) this.warn -= dt;
    if (this.swellT <= 0) { this.swellT = this.tier.swell * (.8 + this.r() * .4); this.swellArmed = false; this.tilt.vx += Math.cos(this.swellDir) * 2.5 * .45; this.tilt.vz += Math.sin(this.swellDir) * 2.5 * .45; this.setMsg(''); this.game.audio.sfx('splash', { big: .4 }); this.game.rig.shake(.1); }
    if (this.roundT > 80 && this.radius > 1.2) this.radius -= dt * .4; // late rounds always end
    const alive = this.lanes.filter(l => !l.out);
    if (alive.length <= 1) this.endRound(alive[0]);
    this.stepRaft(dt);
    for (const l of this.lanes) this.stepWalker(l, dt);
  }
  stepRaft(dt) {
    let sx = 0, sz = 0; for (const l of this.lanes) if (!l.out) { sx += l.px; sz += l.pz; }
    this.tilt.step(dt, sx, sz); this.tilt.applyGravity(this.world, T.gravity); this.tilt.applyGroup(this.raftG);
  }
  stepWalker(l, dt) {
    if (!l.body) return;
    if (l.out) { l.sinkT += dt; return; }
    const I = l.in; l.shoveCd = Math.max(0, l.shoveCd - dt);
    const slopeX = this.tilt.tx * 10, slopeZ = this.tilt.tz * 10;
    l.vx *= Math.exp(-3 * dt); l.vz *= Math.exp(-3 * dt);
    const wx = I.x * 3 + l.vx + slopeX, wz = I.z * 3 + l.vz + slopeZ;
    l.px += wx * dt; l.pz += wz * dt; l.body.setTranslation({ x: l.px, y: .9, z: l.pz }, true); l.body.setLinvel({ x: wx, y: 0, z: wz }, true);
    if (Math.hypot(I.x, I.z) > .15) l.face = Math.atan2(I.x, I.z);
    if (I.hop && l.hopY <= 0) { l.hopV = 4; l.doll.rig.play('hop', .05, 'walk'); this.game.audio.sfx('spring'); }
    if (l.hopY > 0 || l.hopV > 0) { l.hopV -= 12 * dt; l.hopY = Math.max(0, l.hopY + l.hopV * dt); if (l.hopY <= 0) { l.hopV = 0; l.doll.land(); } }
    if (I.flail && l.shoveCd <= 0) {
      l.shoveCd = 2; l.doll.rig.play('flail', .05); this.game.after(.35, () => { if (!this.disposed && !l.out) l.doll.rig.play('walk', .15); }); this.game.audio.sfx('shove');
      for (const o of this.lanes) { if (o === l || o.out) continue; const dx = o.px - l.px, dz = o.pz - l.pz, d = Math.hypot(dx, dz); if (d < 1.3) { const nx = dx / (d || 1), nz = dz / (d || 1); o.vx += nx * 6; o.vz += nz * 6; this.game.comic('SHOVE', o.px, 2, o.pz, '#FFD23F', .6, .6); this.game.rumble(o, .5, .15); } }
    }
    const moving = Math.hypot(wx, wz) > .4; const want = moving ? 'walk' : 'idle'; if (l.doll.rig.currentName !== want && l.doll.rig.currentName !== 'flail' && l.doll.rig.currentName !== 'hop') l.doll.rig.play(want, .2);
    if (Math.hypot(l.px, l.pz) > this.radius + .12 && l.hopY < .5) this.overboard(l);
  }
  overboard(l) { l.out = true; l.falls++; if (l.kind === 'local') { this.game.addFall(); this.game.barkNow('trudy', 'raftOut'); } this.game.audio.sfx('splash', { big: .8 }); this.game.particles.splash(l.px, 0, l.pz, 1); this.game.comic('SPLOSH!', l.px, 1.6, l.pz, '#BDF2F2'); this.game.rumble(l, .8, .2); l.doll.rig.play('flop', .05); }
  endRound(w) {
    this.round++; this.between = 2.6; if (w) { w.wins++; this.setMsg(`${w.name} stays dry.`); w.doll.rig.play('cheer', .1); this.game.audio.sfx('bell'); if (w.kind === 'local' && !this.attract) this.game.barkNow('trudy', 'raftWin'); } else this.setMsg('Nobody. Everyone is wet.');
    this.roundLog.push(this.roundT); this.tally();
  }
  tally() { for (const l of this.lanes) { l.form = Math.min(100, 40 + 30 * l.wins); l.score = l.wins; } }
  frameLane(l, dt) {
    const g = l.doll.group;
    if (l.out) { g.position.set(l.px * 1.05, -l.sinkT * .9 + .2, l.pz * 1.05); if (l.sinkT > 2) g.visible = false; return; }
    // Everyone rides the raft's tilt.
    const up = new THREE.Vector3(l.px, l.hopY, l.pz).applyQuaternion(this.raftG.quaternion); g.position.copy(up); l.doll.setFace(l.face); l.doll.lean.quaternion.copy(this.raftG.quaternion);
  }
  frame2(dt) {
    for (const r of this.rings) if (r.userData.drift) { r.userData.drift += dt; r.position.x += dt * 1.1; r.position.z += dt * .5; r.position.y -= dt * .04; if (r.userData.drift > 6) r.visible = false; else r.scale.setScalar(1); }
    this.wave.visible = this.warn > 0; if (this.wave.visible) { const d = 8 + this.warn * 12, c = Math.cos(this.swellDir), z = Math.sin(this.swellDir); this.wave.position.set(-c * d, .2 + (1 - this.warn) * .9, -z * d); this.wave.rotation.y = -this.swellDir + Math.PI / 2; this.wave.scale.y = .5 + (1 - this.warn) * 1.3; }
    const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(l.wins, `Round ${Math.min(3, this.round + 1)}`); this.setTime(null); }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l), s = br.s; if (l.out) return {};
    // Head toward the centre and the high side, with a skill-based lag.
    const m = Math.hypot(this.tilt.tx, this.tilt.tz) || 1; let gx = -l.px * .28 - this.tilt.tx * 2.4, gz = -l.pz * .28 - this.tilt.tz * 2.4;
    let near = null, nd = 9; for (const o of this.lanes) { if (o === l || o.out) continue; const d = Math.hypot(o.px - l.px, o.pz - l.pz); if (d < nd) { nd = d; near = o; } }
    if (near && nd < 3.5 && skill !== 'clumsy') { const k = skill === 'sharp' ? .35 : .22; gx += (near.px - l.px) / nd * k; gz += (near.pz - l.pz) / nd * k; }
    l.lagG = l.lagG || [0, 0]; const a = 1 - Math.exp(-dt / Math.max(.05, s.lag)); l.lagG[0] += (gx - l.lagG[0]) * a; l.lagG[1] += (gz - l.lagG[1]) * a;
    let x = l.lagG[0] + s.noise * Math.sin(this.t * 2 + i) * 3, z = l.lagG[1] + s.noise * Math.sin(this.t * 1.7 + i) * 3; const mm = Math.hypot(x, z); if (mm > 1) { x /= mm; z /= mm; }
    void m;
    return { x, z, flail: near && nd < 1.25 && l.shoveCd <= 0 && br.r() < .02 * (skill === 'sharp' ? 4 : 2) };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: l.wins, label: 'Rounds won', stats: `Went overboard ${l.falls} times.` }; }
  forceFall() { for (const l of this.lanes) if (!l.out) { this.overboard(l); break; } }
  forceThing() { this.swellT = 1; }
}
