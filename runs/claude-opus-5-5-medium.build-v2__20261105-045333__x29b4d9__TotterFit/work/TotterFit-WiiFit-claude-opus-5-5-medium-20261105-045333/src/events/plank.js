import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { box, at, cyl, sphere, plankWalk, buoy, lantern, palm, bunting, crate } from '../art/props.js';
import { makeWalrus } from '../art/walrus.js';
import { makeGull } from '../art/gull.js';
const SPOTS = [[-.1, 1, 'head'], [.2, .45, 'back'], [-.2, .35, 'back'], [.3, .0, 'feet'], [-.3, .05, 'feet'], [.05, .7, 'back'], [-.08, .55, 'back'], [.12, .22, 'back'], [.04, -.05, 'feet'], [-.14, .85, 'head'], [.14, .9, 'head'], [-.04, .15, 'back'], [.09, .6, 'back'], [-.06, .33, 'back'], [.02, .78, 'back'], [.18, .05, 'feet']];
export class Plank extends EventBase {
  static id = 'plank'; static title = 'Plank & Perch'; static discipline = 'Strength'; static instructor = 'bolster'; static place = 'The Beam, on the pier'; static music = 'strength'; static diagram = 'gull';
  static sentence = 'Hold a plank. Gulls land on you, each one a steady push. Lean against the push.';
  static can = 'You can flail them all off. Coach will look at you.'; static cant = "You can't make Gary leave by asking.";
  static verbs = [['lean', 'Counter'], ['flail', 'Shake off']];
  static tiers = [{ time: 30, every: 5, push: [.2, .4], par: 85 }, { time: 45, every: 4.5, push: [.2, .4], par: 65 }, { time: 60, every: 4, push: [.25, .45], par: 58 }];
  buildSet() {
    this.timeLimit = this.tier.time; this.camYaw = 0; this.faceYaw = 0;
    const walk = plankWalk(18, 5); walk.position.z = 9; this.add(walk);
    const sand = cyl(2.2, 2.4, .1, '#F0DDB0', 20); this.add(sand, 0, .05, 0); sand.scale.z = 1.6;
    const beam = box(2.3, .12, .5, '#B58457'); this.add(beam, 0, .55, 0); for (const x of [-.9, .9]) this.add(at(box(.3, .5, .3, '#7A5A3C'), x, .25, 0));
    this.add(lantern(), -3, 0, -2); this.add(lantern(), 3, 0, -2); this.add(crate(.8), 3.6, 0, 1); this.add(palm(1.4), -6, -.5, -5); this.add(buoy(), 7, -.4, 2);
    this.add(bunting(-4, 2.8, -3, 4, 2.8, -3, 12));
    this.walrus = makeWalrus(); this.add(this.walrus.group, -3, 0, .1); this.walrus.group.rotation.y = 1; this.anim.push(this.walrus);
    this.gullsOn = []; this.spawnT = 2; this.lastSide = this.r() < .5 ? -1 : 1; this.flyers = [];
  }
  placeCamera(snap) { this.game.rig.set(0, 2.1, 7.2, 0, .95, 0, snap); }
  start() { for (const l of this.lanes) { l.inT = 0; l.outT = 0; l.gulls = []; l.zone = { x: 0, z: 0, r: .28 }; l.sway = .1; l.tremor = .03; l.baseClip = 'plank'; l.doll.rig.play('plank', 0); l.customPose = true; l.flailPenalty = 0; } }
  land(l) {
    const r = this.r(); const same = this.r() < .7; const side = same ? this.lastSide : -this.lastSide; this.lastSide = side;
    const mag = this.tier.push[0] + r * (this.tier.push[1] - this.tier.push[0]);
    const g = makeGull(); const spot = SPOTS[l.gulls.length % SPOTS.length]; g.rig.play('fly', 0); this.group.add(g.group); this.anim.push(g);
    const entry = { g, side, mag, spot, t: 0 }; l.gulls.push(entry); g.group.position.set(side * 7, 5, -2);
    this.game.audio.sfx('squawk'); if (l.kind === 'local' && this.barkT <= 0) this.bark('bolster', 'plank');
  }
  shake(l) { for (const e of l.gulls) { e.leaving = true; e.g.rig.play('fly', .05); this.flyers.push(e); } l.gulls = []; }
  fixedPlay(dt) {
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.playT < this.timeLimit - 1) { this.spawnT = this.tier.every; for (const l of this.lanes) if (l.bal && !l.fallen) this.land(l); }
    for (const l of this.lanes) {
      if (!l.bal || l.fallen) continue;
      let px = 0; for (const e of l.gulls) if (e.t > .8) px += e.side * e.mag; l.extraX += px; l.gullPush = px;
      const inz = Math.hypot(l.bal.cobX, l.bal.cobZ) <= l.zone.r;
      if (inz) { l.inT += dt; l.outT = 0; } else { l.outT += dt; if (l.outT > 2 && !this.god) { this.fall(l); l.outT = 0; } }
      l.score = 100 * l.inT / this.timeLimit + 3 * l.gulls.length - l.flailPenalty; l.form = Math.max(0, Math.min(100, 100 * l.score / this.tier.par));
    }
    if (this.playT >= this.timeLimit) this.finish();
  }
  onFlail(l) { if (l.gulls.length) { this.shake(l); l.flailPenalty += 8; this.walrus.rig.play('salute', .2, 'bounce'); if (l.kind === 'local') this.game.barkNow('bolster', 'plankFlail'); } }
  onFall(l) { this.shake(l); l.customPose = false; this.game.audio.sfx('splash', { big: .3 }); this.game.comic('FLOMP', 0, 1.2, 0, '#FFF8EE', .8); if (l.kind === 'local') this.bark('bolster', 'fall'); }
  onRecover(l) { l.customPose = true; l.doll.rig.play('plank', .1); }
  frameLane(l, dt) {
    if (!l.bal || l.fallen) return;
    // Lying along x, head to screen right, face down. The dot rocks the plank like a seesaw.
    const rock = l.bal.leanX * .55, yawR = l.bal.leanZ * .3;
    l.doll.group.position.set(-.72, .95, 0);
    const base = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)));
    const r = new THREE.Quaternion().setFromEuler(new THREE.Euler(yawR, 0, -rock, 'XYZ')); l.doll.lean.quaternion.copy(r).multiply(base);
    for (const e of l.gulls) {
      e.t += dt; const a = Math.min(1, e.t / .8), s = a * a * (3 - 2 * a);
      const along = e.side * (.1 + Math.abs(e.spot[1]) * .62), tx = along, ty = 1.2 + along * Math.sin(-rock), tz = e.spot[0];
      e.g.group.position.set(lane(e.side * 7, tx, s), lane(5, ty, s), lane(-2, tz, s));
      if (a >= 1 && !e.down) { e.down = true; e.g.rig.play('land', .05, this.r() < .4 ? 'peck' : 'stand'); this.game.audio.sfx('fruit'); this.game.rumble(l, .2, .07); }
    }
    function lane(a, b, t) { return a + (b - a) * t; }
  }
  frame2(dt) {
    for (let i = this.flyers.length - 1; i >= 0; i--) { const e = this.flyers[i]; e.g.group.position.y += dt * 4; e.g.group.position.x += e.side * dt * 5; if (e.g.group.position.y > 9) { this.group.remove(e.g.group); this.anim.splice(this.anim.indexOf(e.g), 1); this.flyers.splice(i, 1); } }
    const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(l.gulls.length, 'Gulls'); this.setTime(this.timeLimit - this.playT); }
  }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); const G = 9.81 * .75, K = G * 1.45;
    const push = l.gullPush || 0; const [x, z] = br.correct(dt, l, 0, 0, false);
    const counter = -push / (K * (18 * Math.PI / 180));
    const out = Math.hypot(l.bal.cobX, l.bal.cobZ) > .7 && l.outT > 1.2;
    const wx = x + counter * (skill === 'sharp' ? 1 : skill === 'average' ? .8 : .6);
    return { x: Math.max(-1, Math.min(1, wx)), z, flail: out };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: l.gulls.length, label: 'Gulls on you', stats: `In the zone ${Math.round(100 * l.inT / this.timeLimit)}%. Floor Exercises: ${l.falls}` }; }
  forceThing() { for (const l of this.lanes) if (l.bal && !l.fallen) this.land(l); }
}
