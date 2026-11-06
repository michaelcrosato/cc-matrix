// The island: tilt physics, the walker, loose props, Trudy, hotspots.
import * as THREE from 'three/webgpu';
import { RAPIER, groups, GROUND } from '../physics/world.js';
import { makeIslandWorld, TiltModel, restWeight } from '../physics/island.js';
import { LANDMARKS, JAR_POS } from '../art/island.js';
import { makeDoll } from '../art/doll.js';
import { makeTrudy } from '../art/trudy.js';
import { sphere, box, torus, cone, at, cyl, toon, outlineOf } from '../art/materials.js';
import { T } from '../core/tuning.js';
import { screenToWorld } from '../render/cameraRig.js';
import { cosRange } from '../core/rng.js';
import { el, txt } from '../ui/ui.js';
const rad = (d) => d * Math.PI / 180;
const PROP_G = groups(0x0010, 0xffff & ~0x0100 | GROUND | 0x0010);
export class Hub {
  constructor(game, profile) {
    this.game = game; this.screen = 'island'; this.p = profile; this.world = makeIslandWorld(); this.tiltM = new TiltModel({ K: 2.2, C: 1.8, W: restWeight() }); this.isl = game.island; this.isl.setStage('hub'); this.isl.tilt = this.tiltM;
    const [rx, rz] = this.isl.restVec(); this.tiltM.restX = rx; this.tiltM.restZ = rz; this.tiltM.tx = rx; this.tiltM.tz = rz;
    this.group = new THREE.Group(); this.isl.group.add(this.group);
    this.doll = makeDoll({ paint: profile.paint, hat: profile.hat, skin: profile.skin }); this.group.add(this.doll.group);
    this.body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, .9, 10).lockRotations().setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.capsule(.5, .3).setMass(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups(groups(0x0100, GROUND | 0x0010)), this.body);
    this.px = 0; this.pz = 10; this.camYawO = 0; this.camPitch = .68; this.camDist = 12; this.face = Math.PI; this.locked = false; this.walkTarget = null; this.walking = false; this.leanMode = false; this.leanX = 0; this.leanZ = 0; this.hover = null; this.focusSpot = null; this.idleT = 0; this.trudyGoal = { x: 2, z: 12 };
    this.trudy = makeTrudy(); this.trudy.group.position.set(2, 0, 11); this.group.add(this.trudy.group); this.trudyHop = 0;
    this.props = []; this.addProps();
    this.spots = []; this.buildMarkers();
    this.labelRoot = el('div'); this.game.ui.hud.innerHTML = ''; this.game.ui.hud.appendChild(this.labelRoot); this.label = el('div', 'hoverlabel'); this.label.style.display = 'none'; this.labelRoot.appendChild(this.label);
    this.useTag = el('div', 'bottomprompts'); this.labelRoot.appendChild(this.useTag); this.useText = null;
    this.rig = game.rig; this.placeCam(true); this.hudDirty = true;
    this.game.ui.onWorldClick = (e) => this.worldClick(e);
    this.props.forEach(() => {}); this.creakT = 0;
  }
  setSpots(list) { this.spots = list; this.markers.forEach((m, i) => { const s = list[i]; m.visible = !!(s && s.marked); if (s) m.position.set(s.x, 2.6, s.z); }); }
  buildMarkers() { this.markers = []; for (let i = 0; i < 10; i++) { const a = cone(.28, .5, '#FFD23F'); a.rotation.x = Math.PI; a.visible = false; this.group.add(a); this.markers.push(a); } this.ring = torus(1.4, .08, '#FFD23F'); this.ring.rotation.x = Math.PI / 2; this.ring.visible = false; this.ring.position.y = .06; this.group.add(this.ring); }
  addProps() {
    const add = (mesh, collider, x, y, z, mass) => { const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(false).setLinearDamping(.25).setAngularDamping(.4)); this.world.createCollider(collider.setMass(mass).setFriction(.5).setRestitution(.2).setCollisionGroups(groups(0x0010, GROUND | 0x0010 | 0x0100)), b); this.group.add(mesh); this.props.push({ b, m: mesh }); };
    for (let i = 0; i < 30; i++) { const a = i * 2.4, r = 1.5 + i * .55; add(sphere(.2, i % 5 === 0 ? '#F7E04B' : '#F58A2E'), RAPIER.ColliderDesc.ball(.2), Math.cos(a) * r, .3, Math.sin(a) * r, .2); }
    for (let i = 0; i < 6; i++) { const a = i * 1.1 + .6, r = 7 + i * 1.6; add(box(.6, .5, .6, '#C89B6A'), RAPIER.ColliderDesc.cuboid(.3, .25, .3), Math.cos(a) * r, .4, Math.sin(a) * r, .6); }
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + .3, r = 13; add(sphere(.42, ['#E8443A', '#3B82F6', '#22C55E', '#FFF8EE'][i]), RAPIER.ColliderDesc.ball(.42), Math.cos(a) * r, .6, Math.sin(a) * r, .3); }
  }
  /** The notch: start from the old tilt, and the spring brings the island up, props shuffling. */
  startFromTilt(deg) { const r = deg * Math.PI / 180; this.tiltM.tx = r * .8; this.tiltM.tz = r * .6; this.tiltM.vx = 0; this.tiltM.vz = 0; }
  setTiltRest(deg) { this.isl.setRest(deg); const [rx, rz] = this.isl.restVec(); this.tiltM.restX = rx; this.tiltM.restZ = rz; }
  teleport(x, z, faceAway = true) { this.px = x; this.pz = z; this.body.setTranslation({ x, y: .9, z }, true); this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.walkTarget = null; this.trudy.group.position.set(x + 1.6, 0, z + 1.2); this.placeCam(true); }
  dropIn() { this.body.setTranslation({ x: 0, y: 9, z: 10 }, true); this.drop = true; this.doll.rig.play('splay', 0); }
  placeCam(snap) {
    const y = this.camYawO, p = this.camPitch, d = this.camDist; const q = this.isl.group.quaternion; const a = new THREE.Vector3(this.px, 1.1, this.pz);
    const c = new THREE.Vector3(this.px + Math.sin(y) * Math.cos(p) * d, 1.1 + Math.sin(p) * d, this.pz + Math.cos(y) * Math.cos(p) * d);
    const ip = this.isl.group.position; a.applyQuaternion(q).add(ip); c.applyQuaternion(q).add(ip); c.y = Math.max(c.y, 1.2);
    this.rig.set(c.x, c.y, c.z, a.x, a.y, a.z, snap); this.rig.damp = 6;
  }
  fixed(dt) {
    const I = this.game.input.merged, ks = this.game.input; const yaw = this.camYawO;
    if (!this.locked) {
      this.camYawO -= I.lookX * (I.activeDevice === 'kbm' ? 1 : 1); this.camPitch = Math.max(.3, Math.min(1.25, this.camPitch + I.lookY)); const w = ks.takeWheel(); if (w) this.camDist = Math.max(6, Math.min(22, this.camDist + w * 1.1));
    }
    let mx = 0, mz = 0, speed = T.walkSpeed;
    if (!this.locked && !this.leanMode && !this.drop) {
      const raw = Math.hypot(I.walkX, I.walkZ);
      if (raw > .1) { this.walkTarget = null; [mx, mz] = screenToWorld(I.walkX, I.walkZ, -yaw); }
      else if (this.walkTarget) { const dx = this.walkTarget.x - this.px, dz = this.walkTarget.z - this.pz, d = Math.hypot(dx, dz); if (d < (this.walkTarget.r || 1)) { const t = this.walkTarget; this.walkTarget = null; if (t.act) t.act(); } else { mx = dx / d; mz = dz / d; } }
    }
    const v = this.body.linvel(), slope = Math.hypot(mx, mz) > .1 ? 3 : 0; this.body.setLinvel({ x: mx * speed + this.tiltM.tx * slope, y: v.y, z: mz * speed + this.tiltM.tz * slope }, true);
    const p = this.body.translation(); this.px = p.x; this.pz = p.z;
    if (this.drop && p.y < 1) { this.drop = false; this.game.audio.sfx('clatter'); this.game.audio.sfx('spring'); this.doll.land(); this.doll.rig.play('land', .05, 'idle'); this.game.comicIsland('CLACK!', p.x, 1.4, p.z); this.game.rig.shake(.1); this.dropped = true; }
    this.walking = Math.hypot(mx, mz) > .1;
    if (this.walking) { this.face = Math.atan2(mx, mz); this.idleT = 0; } else this.idleT += dt;
    // Tilt: your position leans the island; in the first lesson the stick does it directly.
    const addX = this.leanMode ? I.x * rad(7) : 0, addZ = this.leanMode ? I.z * rad(7) : 0; this.leanX = I.x; this.leanZ = I.z;
    const rx = this.tiltM.restX, rz = this.tiltM.restZ; this.tiltM.restX = rx + addX; this.tiltM.restZ = rz + addZ;
    this.tiltM.W = restWeight(); this.tiltM.step(dt, this.px, this.pz, T.islandSpring, this.tiltM.W); this.tiltM.restX = rx; this.tiltM.restZ = rz;
    this.tiltM.applyGravity(this.world, T.gravity); this.tiltM.applyGroup(this.isl.group);
    this.world.step();
    if (p.y < -5 || !Number.isFinite(p.x)) this.teleport(0, 10);
    this.updateFocus();
    // Trudy follows, and hops
    const tp = this.trudy.group.position; const gx = this.px + 1.7 * Math.cos(this.face + 1.2), gz = this.pz - 1.7 * Math.sin(this.face + 1.2); const dd = Math.hypot(gx - tp.x, gz - tp.z);
    if (dd > 1.1) { const sp = Math.min(T.walkSpeed * 1.1, dd * 1.4); tp.x += (gx - tp.x) / dd * sp * dt; tp.z += (gz - tp.z) / dd * sp * dt; this.trudyHop += dt * 7; this.trudy.group.rotation.y = Math.atan2(this.px - tp.x, this.pz - tp.z); tp.y = Math.abs(Math.sin(this.trudyHop)) * .22; } else { tp.y = 0; this.trudy.group.rotation.y = Math.atan2(this.px - tp.x, this.pz - tp.z); }
  }
  updateFocus() {
    const ts = this.spots.find(q => q.id === 'trudy'); if (ts) { ts.x = this.trudy.group.position.x; ts.z = this.trudy.group.position.z; }
    let best = null, bd = 1e9; for (const s of this.spots) { if (s.id === 'trudy') continue; const d = Math.hypot(s.x - this.px, s.z - this.pz); if (d < (s.r || 2.2) + .6 && d < bd) { bd = d; best = s; } }
    this.focusSpot = best;
    const I = this.game.input.merged; if (this.locked || this.leanMode || this.game.ui.top() || this.game.speech.busy) return;
    if (this.idleT > 24) { this.idleT = 0; this.game.bark('trudy', 'idle'); }
    if (I.ask) { this.game.bark('trudy', 'ask'); this.game.openPlan(); return; }
    const g2 = this.isl.nearestGuest(this.px, this.pz); if (g2 && !best && I.use) { this.game.bark(g2.key, g2.key); g2.d.setFace(Math.atan2(this.px - g2.d.group.position.x, this.pz - g2.d.group.position.z)); return; }
    if ((I.use || (I.hop && best)) && best) { this.game.audio.sfx('ok'); this.useSpot(best); }
    else if (I.hop && !best) this.hopDoll();
  }
  useSpot(s) { s.act(); }
  setTrudyOutline(on) { if (on && !this.trudyLine) { this.trudyLine = outlineOf(this.trudy.group, .05); this.trudy.group.add(this.trudyLine); } if (this.trudyLine) this.trudyLine.visible = on; }
  hopDoll() { if (this.hopY > 0) return; this.hopV = 4.2; this.hopY = .001; this.doll.rig.play('hop', .05, 'idle'); this.game.audio.sfx('spring'); }
  hoverAt(x, y) {
    const cam = this.game.camera; cam.updateMatrixWorld(); const v = new THREE.Vector3(); let best = null, bd = 90 * (innerHeight / 1080);
    this.isl.group.updateMatrixWorld();
    for (const s of this.spots) { v.set(s.x, 1.4, s.z).applyMatrix4(this.isl.group.matrixWorld).project(cam); if (v.z > 1) continue; const sx = (v.x * .5 + .5) * innerWidth, sy = (-v.y * .5 + .5) * innerHeight, d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  worldClick(e) { if (this.locked || this.leanMode || this.game.mode !== this) return; const s = this.hoverAt(e.clientX, e.clientY); if (s) { this.walkTarget = { x: s.x, z: s.z, r: Math.max(1.2, (s.r || 2) - .2), act: s.act }; this.game.audio.sfx('move'); } }
  frame(dt) {
    const p = this.body.translation();
    if (this.hopY > 0) { this.hopV -= 12 * dt; this.hopY += this.hopV * dt; if (this.hopY <= 0) { this.hopY = 0; this.doll.land(); } }
    this.doll.group.position.set(p.x, p.y - .9 + (this.hopY || 0) - .0, p.z); this.doll.setFace(this.face);
    const want = this.drop ? 'splay' : this.walking ? 'walk' : (this.doll.rig.currentName === 'land' || this.doll.rig.currentName === 'hop' ? this.doll.rig.currentName : 'idle');
    if (this.doll.rig.currentName !== want && !this.doll.rig.then) this.doll.rig.play(want, .15);
    // Stay visually upright: counter-rotate most of the tilt.
    const q = this.isl.group.quaternion; this.doll.lean.quaternion.set(-q.x * .7, 0, -q.z * .7, q.w).normalize();
    if (this.leanMode) { const m = rad(16); const ax = this.leanX * m, az = this.leanZ * m; const a = Math.hypot(ax, az) || 1e-9, s = Math.sin(a / 2); this.doll.lean.quaternion.set(az / a * s, 0, -ax / a * s, Math.cos(a / 2)); }
    this.doll.tick(dt);
    for (const o of this.props) { const t = o.b.translation(), r = o.b.rotation(); o.m.position.set(t.x, t.y, t.z); o.m.quaternion.set(r.x, r.y, r.z, r.w); }
    this.trudy.tick(dt, this.tiltM.tx * -1.2 + (this.leanMode ? -this.leanX * .2 : 0));
    this.placeCam(false);
    // Hover and prompts
    const inp = this.game.input; let hov = null; if (inp.lastDevice === 'kbm' && !this.game.ui.top()) hov = this.hoverAt(inp.px, inp.py);
    const show = hov || this.focusSpot;
    if (show && !this.locked && !this.game.ui.top() && !this.game.speech.busy) { const v = new THREE.Vector3(show.x, 2.8, show.z).applyMatrix4(this.isl.group.matrixWorld).project(this.game.camera); this.label.style.display = ''; if (this.label.textContent !== show.label) this.label.textContent = show.label; this.label.style.left = `${(v.x * .5 + .5) * 100}%`; this.label.style.top = `${(-v.y * .5 + .5) * 100}%`; this.ring.visible = true; this.ring.position.x = show.x; this.ring.position.z = show.z; this.ring.scale.setScalar((show.r || 2) / 1.4 * (1 + Math.sin(performance.now() * .006) * .04)); this.isl.setOutline(show.id === 'trudy' ? null : show.id); this.setTrudyOutline(show.id === 'trudy'); } else { this.label.style.display = 'none'; this.ring.visible = false; this.isl.setOutline(null); this.setTrudyOutline(false); }
    const uk = this.locked || this.game.ui.top() ? '' : (this.focusSpot ? `use:${this.focusSpot.useText || 'Use'}` : 'free');
    if (uk !== this.useText) { this.useText = uk; this.useTag.innerHTML = ''; if (uk) { const list = uk === 'free' ? [['walk', 'Walk'], ['look', 'Look'], ['hop', 'Hop'], ['ask', 'Ask Trudy']] : [['walk', 'Walk'], ['useIsl', uk.slice(4)], ['ask', 'Ask Trudy']]; this.useTag.appendChild(this.game.ui.promptBar(list)); this.game.ui.refreshGlyphs(this.useTag); } }
    this.isl.tick(dt);
  }
  dispose() {
    this.game.ui.onWorldClick = null; this.isl.tilt = null; this.isl.tx = this.tiltM.tx; this.isl.tz = this.tiltM.tz;
    this.isl.setOutline(null); this.group.removeFromParent(); this.world.free(); this.world = null; this.labelRoot.remove();
  }
}
