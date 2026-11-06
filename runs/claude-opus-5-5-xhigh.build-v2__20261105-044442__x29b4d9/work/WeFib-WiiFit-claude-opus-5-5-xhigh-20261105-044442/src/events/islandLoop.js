import * as THREE from 'three/webgpu';
import { EventBase } from './base.js';
import { M, G, geo, add } from '../art/materials.js';
import { Doll, paintColour } from '../art/doll.js';
import { Trudy } from '../art/cast.js';
import { rot2 } from '../render/cameraRig.js';
import { h } from '../ui/dom.js';
import { line } from '../data/dialogue.js';
import { tun } from '../core/tuning.js';

const R = 19, STEP = 1.4, TARGET = 2.5;
const _v = new THREE.Vector3(), _iq = new THREE.Quaternion();

/** Jog the ring road behind Retired Kevin. Alternate your feet. The island tilts as you go. */
export class IslandLoop extends EventBase {
  static id = 'islandLoop';
  constructor(spec) {
    super(spec);
    this.discs = false; this.customPose = true; this.seaLevel = -6.4;
    this.ang = Math.PI * 0.5; this.travel = 0; this.dist = (this.cfg.laps * 2 * Math.PI * R);
    this.rate = 0; this.lastStep = -9; this.lastFoot = null; this.speed = 0; this.inBand = 0; this.time = 0; this.shells = 0; this.stumbles = 0; this.steps = 0;
    this.done = false; this.shellList = [];
    this.stepIntervals = [];
  }
  build() {
    const g = this.game;
    g.setIsland('home');
    super.build();
    this.game.setIsland('home');
    this.game.sea.setLevel(-6.4);
    g.phys.setPosition(Math.cos(this.ang) * R, Math.sin(this.ang) * R);
    g.programme.syncIsland();
    const lane = this.lanes[0];
    this.group.remove(lane.doll.root);
    g.art.group.add(lane.doll.root);
    lane.doll.rig.loop('jog');
    lane.doll.flatFeet = false;
    const kevin = this.kevin = new Doll({ shirt: '#6FB7D6', hat: 'visor', shorts: 0x38503A });
    kevin.flatFeet = false;
    kevin.rig.loop('jog');
    g.art.group.add(kevin.root);
    this.kevinAng = this.ang + 0.3;
    this.trudySmall = new Trudy();
    this.trudySmall.root.scale.setScalar(0.42);
    lane.doll.joints.spine.add(this.trudySmall.root);
    this.trudySmall.root.position.set(0.34, 0.5, 0);
    // Shells on the path.
    for (let i = 0; i < 16 * this.cfg.laps; i++) {
      const a = this.ang + 0.3 + (i / (16 * this.cfg.laps)) * this.cfg.laps * Math.PI * 2 * 0.97;
      const r = R + Math.sin(i * 2.1) * 0.5;
      const s = M(geo.sphere(0.2, 10, 8), i % 2 ? 0xF4B6C8 : 0xFFF3DC, Math.cos(a) * r, 0.14, Math.sin(a) * r, { scale: [1, 0.5, 1.2] });
      g.art.group.add(s);
      this.shellList.push({ s, a, x: Math.cos(a) * r, z: Math.sin(a) * r, taken: false });
    }
    this.cameraShot(true);
  }
  buildLane(lane) {
    const p = this.game.save.profile;
    lane.doll = new Doll({ shirt: lane.colour || (p ? paintColour(p.paint) : '#2CB5A0'), hat: lane.hat });
    this.group.add(lane.doll.root);
    lane.bal = null;
    lane.doll.rig.loop('jog');
  }
  get tangent() { return [-Math.sin(this.ang), Math.cos(this.ang)]; }
  cameraShot(snap) {
    const g = this.game, p = g.phys.pos;
    const [tx, tz] = this.tangent;
    g.art.group.updateWorldMatrix(true, false);
    _v.set(p.x, 0.9, p.z).applyMatrix4(g.art.group.matrixWorld);
    g.rig.shot(_v.x - tx * 7.5, _v.y + 3.6, _v.z - tz * 7.5, _v.x + tx * 2.5, _v.y + 0.8, _v.z + tz * 2.5, { snap, rate: 5, fov: 44 });
  }
  hudSetup(hud) {
    this.pace = hud.addWidget(hud.meter('Pace', '#6FD6B8'));
    this.lapTag = hud.addWidget(h('div.tag', { style: 'font-size:3.6rem' }, 'Lap 1'));
    hud.setScore(0, 'Shells');
  }
  start() { if (this.mode === 'solo') this.game.speech.say('bolster', line('bolster', 'loop_intro'), { auto: 3, top: true }); }
  fixedEvent(dt) {
    const g = this.game, ph = g.phys;
    const lane = this.lanes[0], i = lane.input;
    this.time += dt;
    if (!this.done) {
      let foot = null;
      if (i.footLPressed) foot = 'L'; else if (i.footRPressed) foot = 'R';
      if (foot) {
        if (foot === this.lastFoot) { this.stumbles++; this.stumble = 0.3; g.audio.sfx('clack'); } else {
          const gap = this.t - this.lastStep;
          if (gap < 1.5) { this.stepIntervals.push(gap); if (this.stepIntervals.length > 5) this.stepIntervals.shift(); }
          this.lastStep = this.t; this.lastFoot = foot; this.steps++;
          g.audio.sfx('thud', { pitch: 220 });
        }
      }
      const silent = this.t - this.lastStep;
      const mean = this.stepIntervals.length ? this.stepIntervals.reduce((a, b) => a + b, 0) / this.stepIntervals.length : 0;
      this.rate = mean > 0 && silent < 1 ? 1 / mean : Math.max(0, this.rate - dt * 2);
      const want = this.rate * STEP;
      this.speed += (want - this.speed) * (1 - Math.exp(-dt / 0.3));
      if (this.stumble > 0) { this.stumble -= dt; this.speed *= 0.99; }
      const band = this.cfg.band;
      const inBand = this.rate >= TARGET * (1 - band) && this.rate <= TARGET * (1 + band);
      if (inBand) this.inBand += dt;
      if (this.t % 7 < dt) {
        if (this.rate > TARGET * (1 + band)) this.bark('trudy', 'loop_fast', 2.2, 6);
        else if (this.rate > 0.1 && this.rate < TARGET * (1 - band)) this.bark('trudy', 'loop_slow', 2.2, 6);
        else this.bark('trudy', 'loop_ride', 3, 6);
      }
      // Steering is screen-relative: sideways on the stick moves you across the road.
      const p = ph.pos;
      const a = Math.atan2(p.z, p.x);
      this.ang = a;
      const [tx, tz] = this.tangent;
      const nx = Math.cos(a), nz = Math.sin(a);
      const steerX = i.moveX || 0;
      // Screen right when running along the tangent is the inner or outer side of the ring.
      const side = -steerX;
      ph.wantX = tx * this.speed + nx * side * 3;
      ph.wantZ = tz * this.speed + nz * side * 3;
      this.travel += this.speed * dt;
      if (this.travel >= this.dist) { this.done = true; g.audio.sfx('bell'); }
      for (const s of this.shellList) {
        if (!s.taken && Math.hypot(s.x - p.x, s.z - p.z) < 1) { s.taken = true; s.s.visible = false; this.shells++; g.audio.sfx('marble'); }
      }
      this.kevinAng += ((3.5 / R) * (1 + Math.max(0, Math.min(0.1, (this.ang - this.kevinAng + 0.3) * 0.1)))) * dt;
    } else { ph.wantX = 0; ph.wantZ = 0; }
    g.stepIsland(dt, 1);
  }
  botInput(lane, t, bot) {
    const out = lane.input;
    out.footLPressed = false; out.footRPressed = false; out.moveX = 0; out.moveZ = 0;
    const d = bot.data;
    const err = { sharp: 0.03, average: 0.08, clumsy: 0.16 }[bot.skillName] ?? 0.08;
    d.next = d.next ?? 0.3;
    d.next -= 1 / 120;
    if (d.next <= 0) {
      d.next = (1 / TARGET) * (1 + (bot.r() - 0.5) * err + Math.sin(bot.t * 0.35 + bot.ph) * err * 1.3);
      d.foot = d.foot === 'L' ? 'R' : 'L';
      if (d.foot === 'L') { out.footLPressed = true; out.footL = 1; } else { out.footRPressed = true; out.footR = 1; }
    } else { out.footL = 0; out.footR = 0; }
    const p = this.game.phys.pos, r = Math.hypot(p.x, p.z);
    // Steer the racing line.
    out.moveX = Math.max(-1, Math.min(1, (r - R) * 1.2));
    out.useMove = true;
    out.wishX = out.moveX; out.wishZ = 0;
  }
  hud() {
    const hud = this.game.hud;
    hud.setScore(this.shells, 'Shells');
    hud.setTime(null);
    if (this.pace) this.pace.set(this.rate / (TARGET * 1.4));
    const lap = Math.min(this.cfg.laps, 1 + Math.floor(this.travel / (2 * Math.PI * R)));
    const s = `Lap ${lap} of ${this.cfg.laps}`;
    if (this.lapTag && this.lapTag.textContent !== s) this.lapTag.textContent = s;
  }
  frameEvent(dt) {
    const g = this.game, ph = g.phys, lane = this.lanes[0], d = lane.doll, p = ph.pos;
    g.syncIsland(dt);
    this.cameraShot(false);
    _iq.set(ph.q.x, ph.q.y, ph.q.z, ph.q.w).invert();
    d.root.position.set(p.x, 0, p.z);
    d.root.quaternion.copy(_iq);
    const [tx, tz] = this.tangent;
    d.face(Math.atan2(tx, tz));
    d.rig.loop('jog', { speed: Math.max(0.5, this.rate / 1.9) });
    d.update(dt);
    this.trudySmall.update(dt);
    this.trudySmall.feel(Math.sin(this.t * 1.1));
    const k = this.kevin, ka = this.kevinAng;
    k.root.position.set(Math.cos(ka) * R, 0, Math.sin(ka) * R);
    k.root.quaternion.copy(_iq);
    k.face(Math.atan2(-Math.sin(ka), Math.cos(ka)));
    k.update(dt);
  }
  isDone() { return this.done; }
  laneResult() {
    const share = this.inBand / Math.max(1, this.time);
    const raw = share * 100 + this.shells * 0.25;
    return { form: (100 * raw) / this.cfg.par, raw, big: Math.round(raw), stats: `${Math.round(share * 100)}% at a good pace · ${this.shells} shells · ${this.stumbles} stumbles` };
  }
  dispose() {
    const g = this.game, lane = this.lanes[0];
    g.art.group.remove(lane.doll.root); g.art.group.remove(this.kevin.root);
    for (const s of this.shellList) g.art.group.remove(s.s);
    g.phys.wantX = 0; g.phys.wantZ = 0;
    super.dispose();
  }
}
export { G, add, rot2, tun };
