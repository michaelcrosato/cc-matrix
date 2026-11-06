import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { RAPIER, G_PROP } from '../physics/world.js';
import { T } from '../core/tuning.js';
import { fruitMesh, plankWalk, crate, buoy, bunting, cyl, box, at, sphere, torus, cone, mesh, toon, lantern } from '../art/props.js';
import { cached } from '../art/materials.js';
import { makeGull } from '../art/gull.js';
const VAL = { orange: 1, lemon: 1, plum: 1, boot: 0, pineapple: 5, urchin: -1 };
export class FruitHat extends EventBase {
  static id = 'fruitHat'; static title = 'Fruit Hat'; static discipline = 'Balance Play'; static instructor = 'trudy'; static place = 'End of the pier'; static music = 'balance'; static couch = true; static session = true; static diagram = 'hat';
  static sentence = 'A barge fires fruit. Lean to catch it in your hat, then toss it in the crate.';
  static can = 'You can get greedy: bigger banks pay more.'; static cant = "You can't keep fruit you haven't banked if you fall.";
  static verbs = [['lean', 'Lean'], ['hop', 'Bank'], ['flail', 'Flail']];
  static tiers = [
    { radius: .45, every: 1.6, mass: .015, ankle: 4.6, margin: .45, par: 47, time: 60 },
    { radius: .55, every: 1.3, mass: .012, ankle: 5, margin: .6, par: 62, time: 60 },
    { radius: .65, every: 1, mass: .012, ankle: 5, margin: .6, par: 70, time: 60 },
  ];
  static sessionConfig = { tier: 0, time: 50 };
  balanceOpts() { return { ankleMax: this.tier.ankle, margin: this.tier.margin }; }
  worldOpts() { return { iterations: 10 }; }
  buildSet() {
    this.faceYaw = 0; this.timeLimit = this.opts.time || this.tier.time;
    const n = this.opts.laneCount || 1;
    const pier = new THREE.Group(); for (let i = 0; i < 3; i++) { const pw = plankWalk(16, 3.4 + (n - 1) * 3.2); pw.position.z = 7 - i * 0; pier.add(pw); break; }
    pier.position.y = 0; this.add(pier);
    this.add(bunting(-4 - n, 2.6, -6, 4 + n, 2.6, -6, 14));
    for (const s of [-1, 1]) { this.add(lantern(), s * (2 + n * 1.6), 0, -3); this.add(lantern('#F58A5C'), s * (2 + n * 1.6), 0, -7); }
    this.add(buoy(), -7, -.4, 4); this.add(buoy('#F5F0E0'), 8, -.4, 1);
    // Barge offshore, firing fruit toward the pier.
    const barge = new THREE.Group(); barge.add(at(box(6, 1, 3, '#B0533A'), 0, 0, 0)); barge.add(at(box(6.4, .2, 3.3, '#7A3A28'), 0, .55, 0));
    const cannon = cyl(.3, .4, 1.6, '#3B3550'); cannon.rotation.x = 1; barge.add(at(cannon, 0, 1.2, .3)); barge.add(at(sphere(.5, '#F58A2E'), 1.8, .95, 0)); barge.add(at(sphere(.4, '#F7E04B'), 1.1, .9, -.6)); barge.add(at(cyl(.05, .05, 2.6, '#7A5A3C'), -2.2, 1.8, 0));
    const flag = cone(.3, .7, '#E8443A', 3); flag.rotation.z = -1.57; barge.add(at(flag, -1.85, 2.8, 0));
    this.barge = barge; this.add(barge, 0, -.1, -11);
    this.gull = makeGull(); this.gull.rig.play('stand'); this.add(this.gull.group, 3.2, .0, -4); this.anim.push(this.gull);
    this.fruits = []; this.spawnT = 2; this.seq = 0;
    this.shadowGeo = cached('shadowRing', () => new THREE.RingGeometry(.12, .2, 24));
  }
  placeCamera(snap) {
    const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0;
    const d = this.game.rig.fitDistance(5.6, spread);
    this.game.rig.set(0, 2.9, d, 0, 1.3, -1, snap);
  }
  start() {
    for (const l of this.lanes) {
      l.score = 0; l.bankScore = 0; l.hatFruit = []; l.banks = 0; l.bankCd = 0; l.spilled = 0; l.bankedN = 0; l.baseClip = 'holdHat'; l.doll.rig.play('holdHat', 0); l.tossT = 0; l.nextBank = 7;
      if (l.kind === 'ghost') continue;
      const b = l.bal.body;
      const cfg = (d, y) => RAPIER.ColliderDesc.cylinder(.02, .36).setTranslation(0, y, 0).setMass(d).setFriction(.9).setCollisionGroups(G_PROP(l.id));
      this.world.createCollider(cfg(.01, .75), b);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * 6.283, s = Math.sin(-a / 2), c = Math.cos(-a / 2);
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(.02, .1, .16).setTranslation(Math.cos(a) * .36, .85, Math.sin(a) * .36).setRotation({ x: 0, y: s, z: 0, w: c }).setMass(.001).setFriction(.9).setCollisionGroups(G_PROP(l.id)), b);
      }
      // Visible hat on the doll: wide wicker bowl.
      const hat = new THREE.Group();
      const bowl = mesh(cached('hatBowl', () => new THREE.CylinderGeometry(.38, .34, .06, 24)), '#D9A86C'); hat.add(at(bowl, 0, .0, 0));
      const rim = torus(.37, .035, '#B58457'); rim.rotation.x = Math.PI / 2; hat.add(at(rim, 0, .1, 0));
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; hat.add(at(box(.03, .13, .03, '#C89B6A'), Math.cos(a) * .36, .05, Math.sin(a) * .36)); }
      hat.position.set(0, 1.5, 0); l.doll.lean.add(hat); l.hatMesh = hat;
      // Crate at the foot.
      l.crate = crate(.6); l.crate.position.set(l.x + .75, 0, l.z + .1); this.group.add(l.crate);
      l.crateCount = 0;
    }
  }
  pickKind() {
    const r = this.r(); this.seq++;
    if (this.seq % 13 === 0) return 'pineapple';
    if (this.seq % 11 === 0) return 'boot';
    if (this.seq % 7 === 0) return 'urchin';
    return r < .4 ? 'orange' : r < .7 ? 'lemon' : 'plum';
  }
  launch(lane, kind) {
    const tier = this.tier, R = tier.radius * T.landingRadius;
    const a = this.r() * 6.283, d = Math.sqrt(this.r()) * R, lx = lane.x + Math.cos(a) * d, lz = lane.z + Math.sin(a) * d;
    const sx = lane.x + (this.r() - .5) * 3, sz = -7, sy = .5;
    const FLY = 1.5, g = T.gravity, ty = 1.75;
    const vx = (lx - sx) / FLY, vz = (lz - sz) / FLY, vy = (ty - sy + .5 * g * FLY * FLY) / FLY;
    const mass = (kind === 'pineapple' ? .024 : kind === 'boot' ? .022 : kind === 'urchin' ? .012 : tier.mass) * T.fruitMass;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(sx, sy, sz).setLinvel(vx, vy, vz).setCcdEnabled(true).setCanSleep(false));
    this.world.createCollider(RAPIER.ColliderDesc.ball(.075).setMass(mass).setFriction(.8).setRestitution(.1).setCollisionGroups(G_PROP(lane.id)), body);
    const m = fruitMesh(kind); this.group.add(m);
    const ring = new THREE.Mesh(this.shadowGeo, toon(kind === 'urchin' ? '#E8443A' : '#1A1420')); ring.rotation.x = -Math.PI / 2; ring.position.set(lx, .02, lz); ring.scale.setScalar(1.6); this.group.add(ring);
    const f = { body, m, ring, kind, lane, t: 0, fly: FLY, lx, lz, inHat: false, value: VAL[kind], landed: false };
    this.fruits.push(f); this.game.audio.sfx('pump');
    return f;
  }
  removeFruit(f) {
    const i = this.fruits.indexOf(f); if (i >= 0) this.fruits.splice(i, 1);
    const hi = f.lane.hatFruit.indexOf(f); if (hi >= 0) f.lane.hatFruit.splice(hi, 1);
    this.group.remove(f.m); if (f.ring) this.group.remove(f.ring);
    this.world.removeRigidBody(f.body);
  }
  bank(lane) {
    const list = lane.hatFruit.filter(f => f.kind !== 'urchin');
    const n = list.length; if (!n || lane.bankCd > 0 || lane.fallen) return;
    let value = 0; for (const f of list) value += f.value;
    const gain = value * (1 + .1 * (n - 1));
    lane.bankScore += gain; lane.banks++; lane.bankedN += n; lane.bankCd = 1;
    for (const f of [...lane.hatFruit]) this.removeFruit(f);
    lane.doll.rig.play('hop', .05, lane.baseClip); lane.doll.land();
    this.game.audio.sfx('fruit'); this.game.audio.sfx('clack', { f: 900 });
    this.game.comic(`+${gain.toFixed(1)}`, lane.x + .8, 1.3, lane.z, '#FFD23F', .8);
    if (lane.kind === 'local') this.bark('trudy', 'fruitBank');
    for (let k = 0; k < n; k++) { const c = lane.crateCount + k; if (c >= 24) break; const a = c * 2.4, r = .06 + (c % 5) * .045; lane.crate.add(at(sphere(.07, ['#F58A2E', '#F7E04B', '#8B3F8F'][c % 3]), Math.cos(a) * r, .46 + Math.floor(c / 8) * .07, Math.sin(a) * r)); }
    lane.crateCount += n;
  }
  fixedPlay(dt) {
    const every = this.tier.every * T.fruitInterval;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.playT < this.timeLimit - 1.5) { this.spawnT = every; const kind = this.pickKind(); for (const l of this.lanes) if (l.kind !== 'ghost') this.launch(l, kind); }
    for (const l of this.lanes) {
      if (l.kind === 'ghost') continue;
      l.bankCd = Math.max(0, l.bankCd - dt);
      if (l.in.hop) this.bank(l);
    }
    if (this.playT >= this.timeLimit) this.finish();
  }
  preStep(l, dt) { // shake the top item off with a flail
    if (l.flailT > .3 && l.hatFruit.length) { const f = l.hatFruit[l.hatFruit.length - 1]; f.body.applyImpulse({ x: (this.r() - .5) * .02, y: .03, z: (this.r() - .5) * .02 }, true); }
  }
  postPlay(dt) {
    for (const f of [...this.fruits]) {
      f.t += dt; const p = f.body.translation(), l = f.lane;
      f.m.position.set(p.x, p.y, p.z);
      if (!f.landed) {
        const dhat = Math.hypot(p.x - (l.x + Math.sin(l.bal?.leanX || 0) * 1.5), p.z - (l.z + Math.sin(l.bal?.leanZ || 0) * 1.5));
        if (f.t > f.fly - .08 && p.y < 2.2) {
          const onHat = dhat < .4 && p.y > 1.35 && !l.fallen;
          if (onHat) {
            f.landed = true; f.inHat = f.kind !== 'urchin'; if (f.inHat) l.hatFruit.push(f); if (f.ring) { this.group.remove(f.ring); f.ring = null; }
            this.game.audio.sfx(f.kind === 'urchin' ? 'spike' : 'fruit'); this.game.rumble(l, .25, .08); this.game.hitstop(.016);
            if (f.kind === 'urchin') { l.bankScore = Math.max(0, l.bankScore - 1); f.body.setLinvel({ x: (this.r() - .5) * 5, y: 3, z: (this.r() - .5) * 5 }, true); this.gust(l, (this.r() - .5) * 1.4, (this.r() - .5) * 1.4, .25); this.game.comic('OW!', l.x, 2, l.z, '#E8443A', .7); if (l.kind === 'local') this.bark('trudy', 'urchin'); }
            if (f.kind === 'boot' && l.kind === 'local') this.bark('trudy', 'boot');
            if (f.kind === 'pineapple' && l.kind === 'local') this.bark('trudy', 'golden');
            if (l.hatFruit.length >= 8 && l.kind === 'local') this.bark('trudy', 'fruitGreedy');
          }
        }
      }
      if (f.inHat && (p.y < 1.0 || Math.hypot(p.x - l.x, p.z - l.z) > 1.2)) { f.inHat = false; const i = l.hatFruit.indexOf(f); if (i >= 0) l.hatFruit.splice(i, 1); this.game.audio.sfx('fruit'); }
      if (f.t > f.fly + .2 && f.ring) { this.group.remove(f.ring); f.ring = null; }
      if (p.y < -1 || f.t > 12 && !f.inHat) this.removeFruit(f);
      else if (!f.inHat && f.t > f.fly + .5 && p.y < .15) { this.removeFruit(f); }
    }
    for (const l of this.lanes) if (l.kind !== 'ghost') { l.score = l.bankScore + this.unbanked(l) * .5; l.form = Math.min(100, 100 * l.score / this.tier.par); }
  }
  unbanked(l) { let v = 0; for (const f of l.hatFruit) if (f.kind !== 'urchin') v += f.value; const n = l.hatFruit.length; return n ? v * (1 + .1 * (n - 1)) : 0; }
  onFall(l) { const n = l.hatFruit.length; if (n) { l.spilled += n; if (l.kind === 'local' && n > 3) this.game.bark('trudy', 'fruitSpill'); } for (const f of [...l.hatFruit]) { f.inHat = false; f.body.setLinvel({ x: (this.r() - .5) * 2, y: 1.5, z: (this.r() - .5) * 2 }, true); } l.hatFruit.length = 0; if (l.hatMesh) l.hatMesh.visible = false; }
  onRecover(l) { if (l.hatMesh) l.hatMesh.visible = true; }
  frame2() { const l = this.localLanes()[0] || this.lanes[0]; if (l) { this.setNum(l.score.toFixed(0), `Hat: ${l.hatFruit?.length || 0}`); this.setTime(this.timeLimit - this.playT); } if (this.barge) this.barge.position.y = -.1 + Math.sin(this.t * .9) * .08; }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l); br.s = br.s;
    // Lean only for a fruit in its last 0.95 s of flight.
    let best = null, bt = 99; for (const f of this.fruits) { if (f.lane !== l || f.landed) continue; const left = f.fly - f.t; if (left > 0 && left < (this.opts.leanWindow ?? .95) - br.s.lag * .2 && left < bt) { bt = left; best = f; } }
    let gx = 0, gz = 0;
    if (best) { const dx = best.lx - l.x, dz = best.lz - l.z, d = Math.hypot(dx, dz) || .001;
      if (best.kind === 'urchin') { gx = -dx / d * .75; gz = -dz / d * .75; } // dodge
      else { const need = Math.max(0, d - .2) / .46; gx = dx / d * need; gz = dz / d * need; } }
    const [x, z] = br.correct(dt, l, gx, gz, l.hatFruit.length > 3);
    const bankAt = l.bankAt ?? this.opts.bankAt ?? (skill === 'sharp' ? 7 : 5);
    const hop = !!(bankAt < 99 && l.hatFruit.length >= bankAt && l.bankCd <= 0);
    const flail = (l.bal?.angle || 0) > .55;
    return { x, z, hop, flail };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: Math.round(l.score), label: 'Fruit banked', stats: `${l.bankedN} fruit in ${l.banks} banks. Floor Exercises: ${l.falls}` }; }
  forceThing() { const kind = 'pineapple'; for (const l of this.lanes) if (l.kind !== 'ghost') this.launch(l, kind); }
}
