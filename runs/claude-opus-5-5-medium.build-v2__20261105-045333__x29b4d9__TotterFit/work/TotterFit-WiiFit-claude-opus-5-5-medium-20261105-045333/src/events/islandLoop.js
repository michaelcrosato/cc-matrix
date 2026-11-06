import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { RAPIER, G_GROUND } from '../physics/world.js';
import { makeIslandWorld, TiltModel, restWeight } from '../physics/island.js';
import { T } from '../core/tuning.js';
import { makeDoll } from '../art/doll.js';
import { makeTrudy } from '../art/trudy.js';
import { sphere, cone, at, cyl, torus, mesh } from '../art/props.js';
import { GUESTS } from '../data/names.js';
import { el, txt } from '../ui/ui.js';
const rad = (d) => d * Math.PI / 180, R = 19;
export class IslandLoop extends EventBase {
  static id = 'islandLoop'; static title = 'Island Loop'; static discipline = 'Cardio'; static instructor = 'bolster'; static place = 'The ring road'; static music = 'cardio'; static standing = false; static diagram = 'feet';
  static sentence = 'Alternate your feet to jog two laps behind Kevin. Stay in the pace band and collect shells.';
  static can = 'You can steer with the stick, and the road goes uphill when the island says so.'; static cant = "You can't overtake Kevin without being told about it.";
  static verbs = [['left', 'Left'], ['right', 'Right'], ['walk', 'Steer']];
  static tiers = [{ laps: 2, band: .15 }, { laps: 3, band: .12 }, { laps: 4, band: .1 }];
  makeEventWorld() { this.world = makeIslandWorld(); }
  buildSet() {
    this.moveMode = true; this.isl = this.game.island; this.isl.setStage('foreground'); this.isl.group.add(this.group); this.hideGuests = true; this.isl.showGuests(false);
    const rest = this.game.currentRestTilt?.() ?? 3.6; this.tilt = new TiltModel({ K: 2.2, C: 1.8, W: 2.2 * rad(4) / 22 }); this.tilt.restX = rad(rest) * .8; this.tilt.restZ = rad(rest) * .6; this.tilt.tx = this.tilt.restX; this.tilt.tz = this.tilt.restZ;
    this.laps = this.tier.laps; this.total = this.laps * 2 * Math.PI * R; this.timeLimit = this.total / 1.6 + 30;
    this.kevin = makeDoll({ paint: GUESTS[1].paint, hat: GUESTS[1].hat, skin: GUESTS[1].skin, width: 1.08 }); this.kevin.rig.play('jog', 0); this.group.add(this.kevin.group); this.anim.push(this.kevin); this.kevinA = .22;
    this.trudy = makeTrudy(); this.trudy.group.scale.setScalar(.3); this.anim.push({ tick: (dt) => this.trudy.tick(dt, Math.sin(this.t * 2) * .1) });
    this.shells = []; const n = 22 * this.laps / 2; for (let i = 0; i < n; i++) { const a = (i + .5) / n * this.laps * 6.283, off = (i % 3 - 1) * 1.1; const m = cone(.14, .22, ['#F4A6C0', '#FFF8EE', '#F5B896'][i % 3], 8); m.position.set(Math.cos(a) * (R + off), .14, Math.sin(a) * (R + off)); this.group.add(m); this.shells.push({ a, m, got: false, off }); }
    this.askT = 7;
  }
  laneX() { return R; }
  start() {
    const l = this.lanes[0]; l.a = 0; l.dist = 0; l.lastFoot = null; l.lastStepT = -9; l.cad = 0; l.steps = 0; l.speed = 0; l.inBand = 0; l.ticks = 0; l.shellN = 0; l.px = R; l.pz = 0; l.lp = false; l.rp = false; l.customPose = true; l.face = Math.PI;
    const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(R, .9, 0).lockRotations().setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3).setMass(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(G_GROUND), b); l.body = b;
    l.doll.rig.play('idle', 0); l.doll.group.add(this.trudy.group); this.trudy.group.position.set(.32, 1.35, 0);
    this.group.add(l.doll.group);
  }
  placeCamera(snap) {
    const l = this.lanes[0]; if (!l || l.px === undefined) return; const q = this.isl.group.quaternion;
    const tx = -l.pz, tz = l.px, m = Math.hypot(tx, tz) || 1, dirx = tx / m, dirz = tz / m;
    const ip = this.isl.group.position; const p = new THREE.Vector3(l.px - dirx * 8 + l.px / R * 2.5, 4, l.pz - dirz * 8 + l.pz / R * 2.5).applyQuaternion(q).add(ip), a = new THREE.Vector3(l.px + dirx * 4, 1.4, l.pz + dirz * 4).applyQuaternion(q).add(ip);
    this.game.rig.set(p.x, p.y, p.z, a.x, a.y, a.z, snap); this.camYaw = this.game.rig.yaw;
  }
  setupHud2() { this.bandEl = el('div', 'hbar'); this.bandEl.style.cssText += 'position:absolute;left:50%;transform:translateX(-50%);bottom:15vh'; this.bandZone = el('div', 'fill'); this.bandMark = el('div', 'mark'); this.bandEl.append(this.bandZone, this.bandMark); this.hudEl.appendChild(this.bandEl); }
  fixedPlay(dt) {
    const l = this.lanes[0], I = l.in; const L = I.lf > .5, R0 = I.rf > .5;
    const step = (foot) => { if (foot === l.lastFoot) { l.speed *= .7; this.game.audio.sfx('clack', { f: 800 }); return; } const gap = this.playT - l.lastStepT; l.lastFoot = foot; l.lastStepT = this.playT; l.steps++; if (gap < 1.2) l.cad += (1 / Math.max(.05, gap) - l.cad) * .5; l.doll.rig.play('jog', .1); this.game.audio.sfx('foot', { high: foot === 'R' }); };
    if (L && !l.lp) step('L'); if (R0 && !l.rp) step('R'); l.lp = L; l.rp = R0;
    if (this.playT - l.lastStepT > 1) { l.cad *= Math.exp(-3 * dt); if (l.doll.rig.currentName === 'jog') l.doll.rig.play('idle', .2); }
    const want = 1.4 * l.cad; l.speed += (want - l.speed) * (1 - Math.exp(-5 * dt));
    // Direction: along the road, steered by the stick.
    const r = Math.hypot(l.px, l.pz) || 1; const tx = -l.pz / r, tz = l.px / r, nx = l.px / r, nz = l.pz / r;
    const steer = (I.x * nx + I.z * nz); const wantR = steer * 2.4; const walk = l.speed; const vx = tx * walk + nx * wantR + this.tilt.tx * 3, vz = tz * walk + nz * wantR + this.tilt.tz * 3;
    const v = l.body.linvel(); l.body.setLinvel({ x: vx, y: v.y, z: vz }, true);
    this.tilt.step(dt, l.px, l.pz); this.tilt.applyGravity(this.world, T.gravity); this.tilt.applyGroup(this.isl.group); this.isl.tilt = this.tilt;
    const p = l.body.translation(); const da = Math.atan2(l.px * p.z - l.pz * p.x, l.px * p.x + l.pz * p.z); l.dist += da * R; l.a += da; l.px = p.x; l.pz = p.z; l.face = Math.atan2(vx, vz);
    // Pace band
    const target = 2.5, hw = this.tier.band; l.ticks++; if (l.cad > target * (1 - hw) && l.cad < target * (1 + hw)) l.inBand++;
    this.kevinA += 3.5 / R * dt; this.kevin.group.position.set(Math.cos(this.kevinA) * R, 0, Math.sin(this.kevinA) * R); this.kevin.setFace(Math.atan2(-Math.sin(this.kevinA), Math.cos(this.kevinA)));
    for (const s of this.shells) if (!s.got && Math.abs(s.a - l.a) < .08 && Math.hypot(s.m.position.x - p.x, s.m.position.z - p.z) < 1.1) { s.got = true; s.m.visible = false; l.shellN++; this.game.audio.sfx('marble', { r: .6 }); this.game.particles.burst(p.x, 1, p.z, 5, '#F4A6C0', 1.5, .05, .4, 1); }
    l.form = 100 * (.85 * (l.ticks ? l.inBand / l.ticks : 0) + .15 * l.shellN / this.shells.length) * Math.min(1, l.dist / this.total * 1.02); l.score = l.form;
    this.askT -= dt; if (this.askT <= 0 && !this.attract) { this.askT = 11; this.game.barkNow('trudy', l.cad > target * 1.2 ? 'loopFast' : l.cad < target * .8 && this.playT > 3 ? 'loopSlow' : 'loopAsk'); }
    if (l.dist >= this.total || this.playT >= this.timeLimit) this.finish();
  }
  frameLane(l) { if (l.px === undefined) return; l.doll.group.position.set(l.px, 0, l.pz); l.doll.setFace(l.face); const a = Math.hypot(this.tilt.tx, this.tilt.tz); l.doll.lean.quaternion.set(0, 0, 0, 1); void a; }
  frame2() { const l = this.lanes[0]; if (!l || l.px === undefined) return; this.setNum(l.shellN, 'Shells'); this.setTime(null); this.setMsg(`Lap ${Math.min(this.laps, Math.floor(l.dist / (6.283 * R)) + 1)} of ${this.laps}`); if (this.bandEl) { const t = 2.5, hw = this.tier.band, span = 5; this.bandZone.style.left = `${t * (1 - hw) / span * 100}%`; this.bandZone.style.width = `${t * 2 * hw / span * 100}%`; this.bandMark.style.left = `${Math.min(99, l.cad / span * 100)}%`; } }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); l.nextStep = (l.nextStep ?? .1) - dt; l.lfT = (l.lfT || 0) - dt; l.rfT = (l.rfT || 0) - dt;
    if (l.nextStep <= 0) { l.nextStep = (1 / 2.5) * (1 + br.gauss() * br.s.cadence); if (l.lastFoot === 'L') l.rfT = .05; else l.lfT = .05; }
    const r = Math.hypot(l.px, l.pz) || 1; const err = R - r, nx = l.px / r, nz = l.pz / r, k = Math.max(-1, Math.min(1, err * .9));
    // Screen-space: the stick pushes along the road normal. Resist the slope too.
    return { x: nx * k - this.tilt.tx * .4, z: nz * k - this.tilt.tz * .4, lf: l.lfT > 0 ? 1 : 0, rf: l.rfT > 0 ? 1 : 0 };
  }
  onDispose() { if (this.isl) { this.isl.showGuests(true); this.isl.tilt = null; } }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: Math.round(l.form), label: 'Form', stats: `In the band ${Math.round(100 * l.inBand / Math.max(1, l.ticks))}%. Shells: ${l.shellN}` }; }
}
