import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { post, buoy, palm, TEAK, WOOD_D, CREAM, TEAL } from '../art/props.js';
import { Heron } from '../art/cast.js';
import { POSES } from '../data/poses.js';
import { tun } from '../core/tuning.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';

const GLIDE = 3;
/** Follow the ring to a pose, then hold while the ring shrinks. Breath is how you get good at it. */
export class Poses extends EventBase {
  static id = 'poses';
  constructor(spec) {
    super(spec);
    this.balanceParams = { maxLean: 14, margin: 0.45 };
    this.breathOn = true; this.seaLevel = -1.4;
    const pool = POSES.slice();
    this.seq = [];
    for (let i = 0; i < this.cfg.poses; i++) this.seq.push(pool.splice(Math.floor(this.r() * pool.length), 1)[0]);
    this.index = -1; this.stage = 'wait'; this.stageT = 0; this.prev = { x: 0, z: 0 };
    this.ring = { x: 0, z: 0, r: this.cfg.ringStart, on: false };
    this.total = this.seq.length * (GLIDE + this.cfg.hold);
    this.maxEarn = 0;
    this.outT = 0; this.stillT = 0; this.lastSay = -9;
  }
  setupLane(lane) { lane.earn = 0; lane.inRing = false; lane.doll.rig.loop('breathe'); }
  buildSet() {
    const g = this.group;
    const n = this.lanes.length, r = Math.max(5, 1.6 + n * 1.6);
    add(g, M(geo.cyl(r, r, 0.3, 40), TEAK, 0, -0.15, 0));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; add(g, post(5, 0.16, WOOD_D, Math.cos(a) * (r - 0.5), -5.2, Math.sin(a) * (r - 0.5))); add(g, M(geo.sphere(0.13, 10, 8), CREAM, Math.cos(a) * (r - 0.2), 0.12, Math.sin(a) * (r - 0.2))); }
    for (let i = 0; i < 5; i++) add(g, M(geo.box(r * 2 - 0.2, 0.012, 0.03), WOOD_D, 0, 0.004, -r + 1 + i * ((r * 2 - 2) / 4)));
    for (const lane of this.lanes) add(g, M(geo.cyl(1.05, 1.05, 0.03, 30), 0xC24D6A, lane.x, 0.012, 0));
    this.heron = new Heron();
    this.heron.root.position.set(-(this.lanes.length * 1.6 + 1.3), 0, -1.1);
    this.heron.root.rotation.y = 0.55;
    g.add(this.heron.root);
    const b = buoy(TEAL); b.position.set(7.5, this.seaLevel, -9); g.add(b);
    this.addWatchers([[r - 1.7, 0, -r + 1.9, -0.7], [r - 2.9, 0, -r + 1.4, -0.4]]);
    const p = palm(3.4); p.position.set(r - 0.8, 0, -r + 0.9); g.add(p);
    this.game.setBackdrop(40, -135);
  }
  cameraShot(snap) {
    const n = this.lanes.length, d = this.game.rig.fitDistance(7.2, (n - 1) * 3.2);
    const px = n > 1 ? 0 : 1.7;
    this.game.rig.shot(px, 2.3, d, -0.3, 1.05, 0, { snap, rate: 4 });
    this.inputYaw = Math.atan2(px + 0.3, d);
  }
  hudSetup(hud) {
    this.poseTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, ''));
    hud.setScore(0, 'Form');
  }
  start() {
    this.heron.rig.once('bow');
    this.stage = 'wait'; this.stageT = 0;
    this.nextPose();
    if (this.game.speech && this.mode === 'solo') this.game.speech.say('stillwater', line('stillwater', 'breath'), { auto: 3, top: true });
  }
  nextPose() {
    this.index++;
    if (this.index >= this.seq.length) { this.stage = 'finished'; return; }
    const pose = this.seq[this.index];
    this.stage = 'glide'; this.stageT = 0;
    this.prev = { x: this.ring.x, z: this.ring.z };
    this.ring.r = this.cfg.ringStart;
    for (const lane of this.lanes) lane.doll.rig.loop(pose.clip, { fade: 0.6 });
    this.heron.rig.loop(pose.demo, { fade: 0.8 });
    if (this.poseTag) this.poseTag.textContent = pose.name;
    if (this.mode === 'solo') this.game.speech.say('stillwater', line('stillwater', 'pose', { pose: pose.name }), { auto: 2.8, top: true });
    this.game.audio.sfx('bell');
  }
  rampK() { return Math.min(1, this.t / this.total); }
  ringEnd() { return this.cfg.ringEnd * tun.ringEnd; }
  fixedEvent(dt) {
    const c = this.cfg;
    this.stageT += dt;
    const pose = this.seq[this.index];
    if (this.stage === 'glide') {
      const k = Math.min(1, this.stageT / GLIDE), e = k * k * (3 - 2 * k);
      this.ring.x = this.prev.x + (pose.x - this.prev.x) * e; this.ring.z = this.prev.z + (pose.z - this.prev.z) * e;
      if (this.stageT >= GLIDE) { this.stage = 'hold'; this.stageT = 0; }
    } else if (this.stage === 'hold') {
      const k = Math.min(1, this.stageT / c.hold);
      this.ring.r = this.ramp(c.ringStart, this.ringEnd(), k);
      const earn = 0.3 / this.ring.r;
      this.maxEarn += earn * dt;
      for (const lane of this.lanes) {
        if (lane.kind === 'ghost') continue;
        const inside = !lane.fallen && Math.hypot(lane.dotX - this.ring.x, lane.dotZ - this.ring.z) < this.ring.r;
        lane.inRing = inside;
        if (inside) lane.earn += earn * dt * (lane.breath.inSync ? 1.25 : 1);
      }
      if (this.stageT >= c.hold) this.nextPose();
    }
    const kk = this.rampK();
    for (const lane of this.lanes) {
      if (!lane.bal) continue;
      lane.bal.sway = this.ramp(c.sway[0], c.sway[1], kk);
      lane.bal.tremor = this.ramp(c.tremor[0], c.tremor[1], kk);
    }
    const me = this.lanes[0];
    if (me.kind === 'local' && this.stage === 'hold') {
      this.outT = me.inRing ? 0 : this.outT + dt;
      this.stillT = me.inRing ? this.stillT + dt : 0;
      if (this.outT > 2.2) { this.bark('stillwater', 'leave', 2.6, 8); this.outT = 0; this.heron.rig.once('turn'); }
      if (this.stillT > 4.5) { this.bark('stillwater', 'still', 2.6, 9); this.stillT = 0; }
      if (me.bal && me.bal.lean > 0.34) this.bark('stillwater', 'shake', 2.6, 9);
    }
  }
  flailed(lane) { lane.earn = Math.max(0, lane.earn - this.total * 0.012); if (lane.kind === 'local') this.bark('stillwater', 'flail', 2.2, 5); }
  onFall(lane) { if (lane.kind === 'local') this.bark('stillwater', 'fall', 2.6, 3); }
  botInput(lane, t, bot) {
    const out = lane.input;
    const gx = this.ring.x, gz = this.ring.z;
    if (lane.parkStick) { out.wishX = gx; out.wishZ = gz; } else {
      const [x, z] = bot.steer(gx, gz);
      out.wishX = x; out.wishZ = z;
    }
    out.breathe = bot.breathe(lane);
    out.flail = !lane.fallen && lane.bal.lean > 0.55 && lane.bal.flailCool <= 0;
  }
  hud() {
    const me = this.lanes.find((l) => l.kind === 'local') || this.lanes[0];
    const hud = this.game.hud;
    hud.setTime(Math.max(0, this.total - this.t));
    hud.setScore(Math.round(this.formOf(me)), 'Form');
    for (const lane of this.lanes) lane.discView.zone = this.stage === 'finished' ? null : { x: this.ring.x, z: this.ring.z, r: this.ring.r, on: lane.inRing };
  }
  formOf(lane) { return this.maxEarn > 0 ? Math.min(100, (100 * lane.earn) / this.maxEarn) : 0; }
  frameEvent(dt) { if (this.heron) this.heron.update(dt); }
  isDone() { return this.stage === 'finished'; }
  laneResult(lane) {
    const form = this.formOf(lane);
    return { form, raw: lane.earn, big: Math.round(form), stats: `${this.seq.length} poses · ${lane.falls} floor exercises` };
  }
}
