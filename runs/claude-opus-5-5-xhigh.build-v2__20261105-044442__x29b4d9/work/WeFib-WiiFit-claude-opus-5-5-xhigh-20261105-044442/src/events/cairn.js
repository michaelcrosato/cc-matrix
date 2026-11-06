import * as THREE from 'three/webgpu';
import { EventBase, RAPIER } from './base.js';
import { groups } from '../physics/world.js';
import { M, G, geo, add, toon } from '../art/materials.js';
import { bigRock, STONE, STONE_D, palm } from '../art/props.js';
import { Heron } from '../art/cast.js';
import { tun } from '../core/tuning.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const SIZES = [[0.26, 0.09], [0.24, 0.085], [0.22, 0.08], [0.2, 0.078], [0.18, 0.074], [0.165, 0.07], [0.15, 0.066], [0.14, 0.062], [0.125, 0.058], [0.11, 0.054]];
const WIDE = [[0.28, 0.09], [0.27, 0.085], [0.26, 0.08], [0.25, 0.078], [0.24, 0.074], [0.23, 0.07], [0.22, 0.066], [0.21, 0.062], [0.2, 0.058], [0.19, 0.054]];
const SHADES = [0xCFC8B6, 0xBDB5A2, 0xD8D2C2, 0xA9A18F];
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();

/** Hold the slab level while Ms. Stillwater lowers stones onto it. */
export class Cairn extends EventBase {
  static id = 'cairn';
  constructor(spec) {
    super(spec);
    this.iterations = 10;
    this.balanceParams = { margin: 0.8, ankleMax: 6 };
    this.breathOn = true; this.seaLevel = -14;
    this.sizes = this.cfg.wide ? WIDE : SIZES;
    this.next = 1.5; this.dropped = 0; this.placed = 0; this.holdLeft = this.cfg.hold; this.done = false;
    this.total = this.cfg.stones * this.cfg.every + this.cfg.hold + 1.5;
  }
  setupLane(lane) {
    const b = lane.bal.body;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.55, 0.03, 0.55).setTranslation(0, 0.95, 0).setMass(0.05).setFriction(1).setCollisionGroups(groups.doll(lane.id)), b);
    lane.stones = []; lane.steady = 0; lane.steadyN = 0; lane.maxOn = 0;
    const slab = G('slab', 0, 0.75 + 0.95, 0);
    add(slab, M(geo.box(1.1, 0.06, 1.1), 0xD6CDB6));
    lane.doll.root.add(slab);
    lane.doll.rig.loop('holdSlab');
  }
  buildSet() {
    const g = this.group, n = this.lanes.length, w = Math.max(9, n * 3.2 + 6);
    add(g, M(geo.box(w, 2.6, 7.5), STONE, 0, -1.3, 0), M(geo.box(w + 1.2, 12, 8.4), STONE_D, 0, -8, -0.3));
    for (let i = 0; i < 7; i++) add(g, M(geo.box(w / 7 - 0.03, 0.02, 7.5), SHADES[i % 4], -w / 2 + (i + 0.5) * (w / 7), 0.002, 0));
    for (const [x, z, s] of [[-w / 2 + 1, -2.6, 0.9], [w / 2 - 1.1, -2.8, 1.1], [w / 2 - 2.4, -3, 0.6], [-w / 2 + 2.3, -3, 0.5]]) { const r = bigRock(s, STONE_D); r.position.set(x, s * 0.5, z); g.add(r); }
    // Old cairns at the back, for company.
    for (const x of [-w / 2 + 2, w / 2 - 3.4]) {
      let y = 0;
      for (const [r, hh] of [[0.4, 0.14], [0.32, 0.12], [0.26, 0.1], [0.18, 0.08], [0.12, 0.06]]) { add(g, M(geo.sphere(r, 12, 8), SHADES[Math.floor(y * 9) % 4], x, y + hh, -2.2, { scale: [1, hh / r, 1] })); y += hh * 2; }
    }
    this.heron = new Heron();
    this.heron.root.position.set(this.lanes[0].x - 1.25, 0, -0.4);
    this.heron.root.rotation.y = 1.1;
    g.add(this.heron.root);
    const p = palm(3.2); p.position.set(w / 2 - 0.9, 0, 2.8); g.add(p);
    this.addWatchers([[w / 2 - 2, 0, -2.4, -0.5]]);
    this.game.setBackdrop(-70, -120);
  }
  cameraShot(snap) {
    const n = this.lanes.length, d = this.game.rig.fitDistance(7.6, (n - 1) * 3.2);
    const px = n > 1 ? 0 : 2.8;
    this.game.rig.shot(px, 2.6, d, 0, 1.45, 0, { snap, rate: 4 });
    this.inputYaw = Math.atan2(px, d);
  }
  hudSetup(hud) { hud.setScore(0, 'Stones'); }
  start() { this.next = 1.5; if (this.mode === 'solo') this.game.speech.say('stillwater', line('stillwater', 'cairn_intro'), { auto: 3, top: true }); }
  dropStone(lane) {
    const i = lane.stones.length;
    if (i >= this.cfg.stones) return;
    const [r, hh] = this.sizes[i];
    const top = lane.stones.filter((s) => s.on).pop();
    const b = lane.bal.body, q = b.rotation(), t = b.translation();
    _q.set(q.x, q.y, q.z, q.w);
    const off = this.cfg.offset;
    const ox = (this.r() * 2 - 1) * off, oz = (this.r() * 2 - 1) * off;
    let pos, vel;
    if (top && top.body) {
      const tq = top.body.rotation(), tt = top.body.translation();
      _q.set(tq.x, tq.y, tq.z, tq.w);
      _v.set(ox, top.hh + hh + 0.012, oz).applyQuaternion(_q);
      pos = { x: tt.x + _v.x, y: tt.y + _v.y, z: tt.z + _v.z };
      vel = top.body.linvel();
    } else {
      _v.set(ox, 0.98 + hh + 0.012, oz).applyQuaternion(_q);
      pos = { x: t.x + _v.x, y: t.y + _v.y, z: t.z + _v.z };
      vel = b.linvel();
    }
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(q)
      .setLinvel(vel.x, vel.y, vel.z).setCanSleep(false).setLinearDamping(0.1).setAngularDamping(0.6));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(r * 0.8, hh, r * 0.8).setMass(0.02 * tun.stoneMass).setFriction(0.95).setRestitution(0).setCollisionGroups(groups.prop(lane.id)), body);
    const mesh = G();
    const shade = SHADES[i % 4];
    mesh.add(M(geo.sphere(1, 12, 8), shade, 0, 0, 0, { scale: [r, hh * 1.05, r] }));
    this.group.add(mesh);
    const s = { body, mesh, r, hh, on: true, i };
    lane.stones.push(s);
    this.game.audio.sfx('thud', { pitch: 130 + i * 8 });
    if (lane.kind === 'local' && this.mode === 'solo') this.bark('stillwater', 'stone', 2.4, 9);
  }
  fixedEvent(dt) {
    const c = this.cfg;
    this.next -= dt;
    const k = Math.min(1, this.t / this.total);
    if (this.next <= 0 && this.placedAll !== true) {
      for (const lane of this.lanes) if (lane.kind !== 'ghost') this.dropStone(lane);
      this.next = c.every * tun.stoneInterval;
      this.placed++;
      this.heron.rig.once('lower');
      if (this.placed >= c.stones) this.placedAll = true;
    }
    if (this.placedAll && this.next <= 0) this.holdLeft -= dt;
    if (this.placedAll && this.next <= 0 && this.holdLeft <= 0) this.done = true;
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      lane.bal.sway = this.ramp(c.sway[0], c.sway[1], k);
      lane.bal.tremor = this.ramp(c.tremor[0], c.tremor[1], k);
      if (!lane.fallen) { lane.steady += Math.max(0, 1 - Math.hypot(lane.cobX, lane.cobZ) / 0.5) * dt; lane.steadyN += dt; }
    }
  }
  afterStep() {
    for (const lane of this.lanes) {
      if (!lane.stones) continue;
      const bt = lane.bal.body.translation(), q = lane.bal.body.rotation();
      _q.set(q.x, q.y, q.z, q.w).invert();
      let on = 0;
      for (const s of lane.stones) {
        const p = s.body.translation();
        _v.set(p.x - bt.x, p.y - bt.y, p.z - bt.z).applyQuaternion(_q);
        const isOn = !lane.fallen && _v.y > 0.9 && Math.hypot(_v.x, _v.z) < 0.75;
        if (s.on && !isOn) {
          s.on = false;
          this.game.audio.sfx('thud', { pitch: 90 });
          if (lane.kind === 'local') this.bark('stillwater', 'stone_drop', 2.2, 5);
        }
        if (isOn) on++;
      }
      lane.onSlab = on;
      lane.maxOn = Math.max(lane.maxOn, on);
    }
  }
  flailed(lane) { lane.steady = Math.max(0, lane.steady - 1.5); if (lane.kind === 'local') this.bark('stillwater', 'flail', 2.2, 5); }
  onFall(lane) { if (lane.kind === 'local') this.bark('stillwater', 'fall', 2.6, 3); }
  botInput(lane, t, bot) {
    const out = lane.input;
    const [x, z] = bot.steer(0, 0, true);
    out.wishX = x; out.wishZ = z;
    out.breathe = bot.breathe(lane);
    out.flail = !lane.fallen && lane.bal.lean > 0.55 && lane.bal.flailCool <= 0;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    hud.setScore(`${me.onSlab || 0}/${this.cfg.stones}`, 'Stones');
    hud.setTime(Math.max(0, this.total - this.t));
    for (const lane of this.lanes) lane.discView.zone = { x: 0, z: 0, r: 0.3, on: Math.hypot(lane.dotX, lane.dotZ) < 0.3 };
  }
  frameEvent(dt) {
    for (const lane of this.lanes) {
      if (!lane.stones) continue;
      for (const s of lane.stones) {
        const p = s.body.translation(), q = s.body.rotation();
        s.mesh.position.set(p.x, p.y, p.z); s.mesh.quaternion.set(q.x, q.y, q.z, q.w);
      }
    }
    if (this.heron) this.heron.update(dt);
  }
  isDone() { return this.done; }
  laneResult(lane) {
    const on = lane.onSlab || 0;
    let height = 0;
    if (lane.stones) for (const s of lane.stones) if (s.on) height += s.hh * 2;
    const steady = lane.steadyN > 0 ? lane.steady / lane.steadyN : 0;
    const raw = 100 * on + height * 60 + steady * 60;
    return { form: (100 * raw) / this.cfg.par, raw, big: Math.round(raw), stats: `${on} of ${this.cfg.stones} stones standing · ${lane.falls} floor exercises` };
  }
}
