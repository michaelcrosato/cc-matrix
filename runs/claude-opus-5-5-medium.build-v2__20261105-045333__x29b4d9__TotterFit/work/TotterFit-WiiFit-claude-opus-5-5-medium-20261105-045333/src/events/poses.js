import * as THREE from 'three/webgpu';
import { EventBase, lerp } from './base.js';
import { POSES } from '../data/poses.js';
import { T } from '../core/tuning.js';
import { deck, box, at, cyl, sphere, lantern, bunting, palm, torus, toon, flat, cached } from '../art/props.js';
import { makeHeron } from '../art/heron.js';
import { GUESTS } from '../data/names.js';
export class Poses extends EventBase {
  static id = 'poses'; static title = 'Poses'; static discipline = 'Stillness'; static instructor = 'stillwater'; static place = 'The Sun Deck'; static music = 'stillness'; static couch = true; static session = true; static diagram = 'ring';
  static sentence = 'Follow the green ring across the disc, then hold still while it shrinks.';
  static can = 'You can breathe with the ring for a steadier body.'; static cant = "Your feet don't matter here.";
  static verbs = [['lean', 'Lean'], ['breath', 'Breathe'], ['flail', 'Flail']];
  static tiers = [
    { poses: 3, hold: 8, ringEnd: .16, sway: [.08, .22], tremor: [.08, .2], drift: .34 },
    { poses: 4, hold: 10, ringEnd: .13, sway: [.12, .3], tremor: [.1, .3], drift: .34 },
    { poses: 5, hold: 12, ringEnd: .1, sway: [.15, .38], tremor: [.15, .4], drift: .34 },
  ];
  static sessionConfig = { tier: 0, hold: 13.6, poses: 3 };
  balanceOpts() { return { maxLean: 14 }; }
  buildSet() {
    this.usesBreath = true; this.faceYaw = 0; this.nPoses = this.opts.poses || this.tier.poses; this.hold = this.opts.hold || this.tier.hold;
    const n = this.opts.laneCount || 1; const R = 5.4 + n * 1.3;
    this.add(deck(R, '#C89B6A'), 0, 0, -.5);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; if (Math.abs(Math.sin(a)) < .3 && Math.cos(a) > 0) continue; this.add(at(cyl(.05, .06, 1, '#E9D3AE'), Math.cos(a) * (R - .15), .5, Math.sin(a) * (R - .15) - .5)); }
    const rail = torus(R - .15, .06, '#E9D3AE'); rail.rotation.x = Math.PI / 2; this.add(rail, 0, 1, -.5);
    this.add(palm(1.5), -R - 2, -.5, -3); this.add(palm(1.2), R + 2.4, -.5, -4); this.add(lantern(), -R + .6, 0, -2.5); this.add(lantern(), R - .6, 0, -2.5);
    this.add(bunting(-R + .6, 2.1, -2.5, R - .6, 2.1, -2.5, 14));
    this.heron = makeHeron(); this.heron.group.scale.setScalar(1.1); this.add(this.heron.group, -2.4 - (n - 1) * 1.6, 0, -1.7); this.heron.group.rotation.y = .5; this.anim.push(this.heron);
    this.crowd([{ ...GUESTS[0], x: 3.4 + n, z: -3.1, yaw: -.5, clip: 'breathe' }, { ...GUESTS[3], x: 2 + n, z: -3.7, yaw: -.2, clip: 'breathe' }]);
    // A soft floor ring under the doll shows the target too, for the room.
    this.floorRings = [];
    this.order = []; const pool = [...POSES]; for (let i = 0; i < this.nPoses; i++) this.order.push(pool.splice(Math.floor(this.r() * pool.length), 1)[0] || POSES[i]);
    this.stage = 'glide'; this.st = 0; this.poseI = 0;
  }
  placeCamera(snap) { if (this.opts.noHud) { this.game.rig.set(0, 3.4, 9, 0, 2.5, 0, snap); return; } const spread = this.lanes.length ? Math.abs(this.lanes[this.lanes.length - 1].x - this.lanes[0].x) : 0; const d = this.game.rig.fitDistance(6.8, spread); this.game.rig.set(0, 1.25, d, 0, 1, 0, snap); }
  start() { for (const l of this.lanes) { l.earned = 0; l.maxEarn = 0; l.zone = { x: 0, z: 0, r: .3 }; l.baseClip = 'idle'; if (l.kind !== 'ghost') { const ring = new THREE.Mesh(cached('fr', () => new THREE.RingGeometry(.9, 1, 40)), flat('#2E8B57')); ring.rotation.x = -Math.PI / 2; ring.position.set(l.x, .03, 0); this.group.add(ring); l.floorRing = ring; } } this.announce(); }
  announce() { const p = this.order[this.poseI]; if (!p) return; this.setMsg(p.name); for (const l of this.lanes) { l.baseClip = p.clip; if (!l.fallen) l.doll.rig.play(p.clip, .6); } this.heron.rig.play(`demo_${p.id}`, .4); if (!this.attract && !this.opts.noHud) this.game.barkNow('stillwater', 'pose', { pose: p.name }); }
  fixedPlay(dt) {
    this.st += dt; const p = this.order[this.poseI];
    if (this.stage === 'glide') {
      const a = Math.min(1, this.st / 3), s = a * a * (3 - 2 * a);
      for (const l of this.lanes) { l.zone.x = (l.fromX ?? 0) + (p.x - (l.fromX ?? 0)) * s; l.zone.z = (l.fromZ ?? 0) + (p.z - (l.fromZ ?? 0)) * s; l.zone.r = .3; l.sway = this.tier.sway[0]; l.tremor = this.tier.tremor[0]; }
      if (this.st >= 3) { this.stage = 'hold'; this.st = 0; this.heron.rig.play('stand', .5); }
    } else {
      const a = Math.min(1, this.st / this.hold);
      const r = lerp(.3, this.tier.ringEnd * T.ringEnd, a);
      for (const l of this.lanes) {
        l.zone.r = r; l.sway = lerp(this.tier.sway[0], this.tier.sway[1], a); l.tremor = lerp(this.tier.tremor[0], this.tier.tremor[1], a);
        if (l.kind === 'ghost' || !l.bal) continue;
        const earn = .3 / r; l.maxEarn += earn * dt;
        if (!l.fallen && Math.hypot(l.bal.cobX - l.zone.x, l.bal.cobZ - l.zone.z) <= r) l.earned += earn * dt * (l.breathSync ? 1.25 : 1);
        l.form = Math.min(100, 100 * l.earned / Math.max(.001, this.maxTotal()));
      }
      if (this.st >= this.hold) {
        this.poseI++; this.st = 0; this.game.audio.sfx('bell');
        if (this.poseI >= this.nPoses) { this.heron.rig.play('bow', .3, 'stand'); this.finish(); return; }
        const q = this.order[this.poseI - 1]; for (const l of this.lanes) { l.fromX = q.x; l.fromZ = q.z; } this.stage = 'glide'; this.announce();
      }
    }
  }
  maxTotal() { // integral of .3/r over a hold, exact share of the maximum over the whole class so far
    const done = this.poseI + (this.stage === 'hold' ? Math.min(1, this.st / this.hold) : 0);
    const R0 = .3, R1 = this.tier.ringEnd * T.ringEnd; const full = this.hold * .3 * Math.log(R0 / R1) / (R0 - R1);
    return Math.max(.001, full * done);
  }
  /** Breathing in time steadies you, but your breath is a small tide: a slow lean that a parked stick can't follow. */
  preStep(l) {
    if (this.stage !== 'hold' || !l.bal) return; const a = Math.min(1, this.st / this.hold), ang = this.poseI * 2.4 + l.ph + this.st * .22, m = this.tier.drift * a * (l.breathSync ? .6 : 0) * this.diff.dist * T.swayScale;
    l.bal.nx += Math.cos(ang) * m; l.bal.nz += Math.sin(ang) * m;
  }
  onFlail(l) { this.heron.rig.play('turn', .2, 'stand'); l.earned = Math.max(0, l.earned - .4); if (l.kind === 'local') this.bark('stillwater', 'flail'); }
  frameLane(l) { if (l.floorRing && l.bal) { const r = l.zone.r * 1.1 + .05; l.floorRing.scale.setScalar(r); l.floorRing.position.x = l.x + l.zone.x * .9; l.floorRing.position.z = l.zone.z * .9; } }
  frame2() { const l = this.localLanes()[0] || this.lanes[0]; if (l) this.setNum(Math.round(l.form), 'Form'); this.setTime(this.stage === 'hold' ? this.hold - this.st : 3 - this.st); if (this.barkT <= 0 && l && l.kind === 'local') this.bark('stillwater', 'calm'); }
  botInput(i, t, skill, dt) {
    const l = this.lanes[i], br = this.botBrain(l);
    const mode = this.opts.botMode;
    const breath = mode === 'nobreath' || mode === 'park' ? false : (this.t % 8) < 4;
    if (mode === 'park') return { x: l.zone.x, z: l.zone.z, breath };
    const [x, z] = br.correct(dt, l, l.zone.x, l.zone.z);
    return { x, z, breath };
  }
  laneResult(i) { const l = this.lanes[i]; return { form: l.form, big: Math.round(l.form), label: 'Form', stats: `${this.poseI} poses held. Floor Exercises: ${l.falls}` }; }
  forceThing() { this.forceGust(2); }
}
