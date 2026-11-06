import * as THREE from 'three/webgpu';
import { RAPIER, createWorld, groundCollider } from '../physics/world.js';
import { Balancer } from '../physics/balancer.js';
import { Ragdoll } from '../physics/ragdoll.js';
import { Doll, paintColour } from '../art/doll.js';
import { EVENTS } from '../data/events.js';
import { LANE_SPACING, FIXED_DT, medalFor } from '../data/config.js';
import { blankInput } from '../input/input.js';
import { tun } from '../core/tuning.js';
import { rng, cos, cosPick } from '../core/rng.js';
import { makeBot } from '../input/bot.js';
import { rot2 } from '../render/cameraRig.js';
import { line } from '../data/dialogue.js';
import { Trudy as TrudyArt } from '../art/cast.js';

const WATCHERS = [
  { id: 'margaret', shirt: '#C9A0DC', hat: 'perm', height: 0.92, shorts: 0x6B6B8F },
  { id: 'kevin', shirt: '#6FB7D6', hat: 'visor', height: 1, shorts: 0x38503A },
  { id: 'paul', shirt: '#F5C84A', hat: 'beret', height: 1.06, shorts: 0x444455 },
  { id: 'gerald', shirt: '#7FA650', hat: 'none', height: 0.88, shorts: 0x5A4A3A },
];
export const DIFFICULTY = {
  gentle: { ankle: 1.25, dist: 0.65, rhythm: 1.4 },
  standard: { ankle: 1, dist: 1, rhythm: 1 },
  honest: { ankle: 0.9, dist: 1.2, rhythm: 0.8 },
};

/** Breath ring: 4 s growing, 4 s shrinking. 70%+ in sync over the last full cycle earns the bonus. */
export class Breath {
  constructor() { this.t = 0; this.samples = []; this.inSync = false; this.syncShare = 0; this.period = 8; }
  get phase() { return (this.t % this.period) / this.period; }
  get growing() { return this.phase < 0.5; }
  get size() { const p = this.phase; return p < 0.5 ? p * 2 : 2 - p * 2; }
  step(dt, held, auto) {
    this.t += dt;
    const ok = auto || held === this.growing;
    this.samples.push(ok ? 1 : 0);
    const max = Math.round(this.period / FIXED_DT);
    if (this.samples.length > max) this.samples.shift();
    if (this.samples.length >= max) {
      if (((this.t / FIXED_DT) | 0) % 30 === 0) {
        let s = 0;
        for (let i = 0; i < this.samples.length; i++) s += this.samples[i];
        this.syncShare = s / this.samples.length;
        this.inSync = this.syncShare >= 0.7;
      }
    } else if (auto) this.inSync = true;
  }
}

/** One player or bot or ghost: everything an event needs about them. */
export class Lane {
  constructor(ev, spec, index) {
    this.ev = ev; this.id = index; this.kind = spec.kind || 'local'; this.name = spec.name || `Player ${index + 1}`;
    this.colour = spec.colour || '#2CB5A0'; this.source = spec.source || 'any'; this.seat = spec.seat ?? index;
    this.hat = spec.hat || 'none'; this.skill = spec.skill || 'average';
    this.input = blankInput();
    this.x = ev.laneX(index);
    this.doll = null; this.bal = null; this.props = [];
    this.score = 0; this.form = 0; this.raw = 0; this.falls = 0; this.fallen = false; this.recoverT = 0; this.ragdoll = null; this.finished = false;
    this.breath = new Breath();
    this.bot = this.kind === 'bot' || spec.botBrain ? makeBot(spec.skill || 'average', index) : null;
    this.discView = { dx: 0, dz: 0, ax: 0, az: 0, zone: null, brace: null, breath: null, showAsk: true, alarm: false, frame: 0 };
    this.clipIndex = 0; this.stats = {};
    this.lastInputDevice = 'pad';
  }
  get cobX() { return this.bal ? this.bal.cobX : 0; }
  get cobZ() { return this.bal ? this.bal.cobZ : 0; }
  /** The dot in stick space. */
  get dotX() { const y = this.ev.inputYaw; if (!y) return this.cobX; return rot2(this.cobX, this.cobZ, -y)[0]; }
  get dotZ() { const y = this.ev.inputYaw; if (!y) return this.cobZ; return rot2(this.cobX, this.cobZ, -y)[1]; }
}

export class EventBase {
  static id = 'base';
  /** spec: { game, tier, lanes:[laneSpec], mode:'solo'|'group'|'session'|'attract', config, god } */
  constructor(spec) {
    this.game = spec.game; this.tier = spec.tier || 0; this.mode = spec.mode || 'solo'; this.god = !!spec.god;
    this.data = EVENTS[this.constructor.id] || spec.data;
    this.cfg = spec.config || (this.data.tiers ? this.data.tiers[this.tier] : {});
    this.laneSpecs = spec.lanes || [{ kind: 'local', name: 'You', colour: '#2CB5A0' }];
    this.diff = DIFFICULTY[this.game.save.settings.difficulty] || DIFFICULTY.standard;
    this.t = 0; this.phase = 'intro'; this.inputYaw = 0; this.over = false;
    this.group = new THREE.Group();
    this.r = rng(this.constructor.id);
    this.world = null; this.lanes = [];
    this.iterations = 8;
    this.balanceParams = {};
    this.discs = true; this.breathOn = false; this.floorY = 0; this.seaLevel = -0.8;
    this.barks = 0; this.stepCount = 0; this.fallsForLine = 0;
    this.dolls = [];
    this.props = [];
    this.tempBodies = [];
  }
  get activeLanes() { return this.lanes.filter((l) => l.kind !== 'ghost'); }
  laneX(i) {
    const n = this.laneSpecs.length;
    return (i - (n - 1) / 2) * LANE_SPACING;
  }
  /** Build world, lanes, dolls, set. */
  build() {
    this.world = createWorld({ iterations: this.iterations });
    this.addGround();
    this.laneSpecs.forEach((spec, i) => {
      const lane = new Lane(this, spec, i);
      this.lanes.push(lane);
      this.buildLane(lane, i);
    });
    this.buildSet();
    this.game.scene.add(this.group);
    this.syncDolls(0);
  }
  addGround() { groundCollider(this.world, 0, -0.5, 0, 200, 0.5, 200); }
  buildLane(lane, i) {
    const doll = new Doll({ shirt: lane.colour, hat: lane.hat });
    lane.doll = doll;
    doll.place(lane.x, this.floorY, this.laneZ(i));
    this.group.add(doll.root);
    if (lane.kind === 'ghost') return;
    lane.bal = new Balancer(this.world, i, lane.x, this.floorY, this.laneZ(i), { ...this.balanceParams, ph: 1.3 * i + this.r() * 6, diff: this.diff });
    this.setupLane(lane);
  }
  laneZ() { return 0; }
  /** Event hooks. */
  setupLane() {}
  buildSet() {}
  start() {}
  fixedEvent() {}
  frameEvent() {}
  onFall() {}
  onRecover() {}
  onFlail() {}
  laneResult(lane) { return { form: lane.form, raw: lane.raw, stats: {} }; }
  botInput() { return blankInput(); }
  hudSetup() {}
  hud() {}
  cameraShot(snap) {}
  isDone() { return false; }
  extraPrompts() { return null; }
  /** Make the set appear in-world. */
  begin() {
    this.phase = 'play';
    this.t = 0;
    for (const l of this.lanes) { l.input = blankInput(); }
    if (this.game.input) this.game.input.resetRing();
    this.start();
  }
  /** One fixed step. */
  fixed(dt) {
    if (this.phase === 'intro') { this.stepIdle(dt); return; }
    if (this.phase === 'done') { this.stepIdle(dt); return; }
    this.t += dt;
    for (const lane of this.lanes) this.readInput(lane, dt);
    this.fixedEvent(dt);
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost' || !lane.bal) continue;
      this.applyInput(lane, dt);
      lane.bal.pre(dt);
    }
    if (this.worldG !== tun.gravity) { this.worldG = tun.gravity; this.world.gravity = { x: 0, y: -tun.gravity, z: 0 }; }
    this.world.step();
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost' || !lane.bal) continue;
      lane.bal.post();
      this.checkFall(lane, dt);
    }
    this.afterStep(dt);
  }
  /** Before and after play the world keeps going with nobody asking for anything. */
  stepIdle(dt) {
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost' || !lane.bal) continue;
      lane.input.wishX = 0; lane.input.wishZ = 0;
      lane.bal.wishX = 0; lane.bal.wishZ = 0;
      lane.bal.pre(dt);
    }
    this.world.step();
    for (const lane of this.lanes) {
      if (lane.kind === 'ghost' || !lane.bal) continue;
      lane.bal.post();
      if (lane.ragdoll) this.checkFall(lane, dt);
    }
    this.idleStep(dt);
  }
  idleStep() {}
  afterStep() {}
  readInput(lane, dt) {
    if (lane.kind === 'ghost') return;
    if (lane.kind === 'bot' || this.autoplay === lane.id) {
      this.botStep(lane, dt);
      return;
    }
    this.game.input.sample(lane.source, lane.input, dt);
    if (lane.input.device) lane.lastInputDevice = lane.input.device;
  }
  botStep(lane, dt) {
    if (!lane.bot) lane.bot = makeBot(lane.skill, lane.id);
    lane.bot.observe(lane, dt);
    const out = this.botInput(lane, this.t, lane.bot, dt);
    if (out) Object.assign(lane.input, out);
  }
  applyInput(lane, dt) {
    const i = lane.input, b = lane.bal;
    if (this.inputYaw) { const [wx, wz] = rot2(i.wishX, i.wishZ, this.inputYaw); b.wishX = wx; b.wishZ = wz; } else { b.wishX = i.wishX; b.wishZ = i.wishZ; }
    if (this.breathOn) {
      const wasGrowing = lane.breath.growing;
      lane.breath.step(dt, !!i.breathe, this.game.save.settings.autoBreathe || lane.breathAuto);
      if (lane.kind === 'local' && wasGrowing !== lane.breath.growing) this.game.audio.sfx(lane.breath.growing ? 'breathIn' : 'breathOut', { dur: 3.6 });
      b.breathScale = lane.breath.inSync ? 0.6 : 1;
    } else b.breathScale = 1;
    if (i.flail && !lane.fallen) {
      if (b.flail()) {
        lane.doll.rig.once('flail');
        this.game.audio.sfx('boing');
        this.flailed(lane);
      }
    }
  }
  flailed(lane) { this.onFlail(lane); }
  checkFall(lane, dt) {
    const b = lane.bal;
    if (lane.fallen) {
      lane.recoverT -= dt;
      if (lane.ragdoll) lane.ragdoll.sync();
      if (lane.recoverT <= 0) this.recoverLane(lane);
      return;
    }
    if (!b.enabled || b.air) return;
    const limit = tun.fallAngle * Math.PI / 180;
    // Near-tip: a rumble, and a flail that saves you gets a word.
    if (b.lean > limit * 0.72) {
      if (!lane.nearing) {
        lane.nearing = true; lane.flailedNear = false;
        if (lane.kind === 'local') {
          this.game.input.rumble(0.3, 0.5, 160, lane.input.padIndex >= 0 ? lane.input.padIndex : undefined);
          this.game.comic.pop('WOBBLE', b.fx, b.fy + 2.2, b.fz, { size: 1.7, life: 0.8 });
        }
        if (this.trudyArt) this.trudyArt.rig.once('gasp');
      }
      if (b.flailLeft > 0) lane.flailedNear = true;
    } else if (lane.nearing && b.lean < limit * 0.4) {
      lane.nearing = false;
      if (lane.kind === 'local' && this.data.instructor === 'trudy') this.bark('trudy', lane.flailedNear ? 'flail_save' : 'near', 2.2, 8);
    }
    if (b.lean >= limit) {
      if (this.god) {
        // God mode: nobody falls. The core is quietly stood back up.
        b.recover();
        return;
      }
      this.fallLane(lane);
    }
  }
  fallLane(lane) {
    if (lane.fallen) return;
    const b = lane.bal;
    lane.fallen = true; lane.falls++; lane.recoverT = tun.recoverTime;
    const v = b.body.linvel();
    b.disable();
    lane.doll.ragdolled = true;
    lane.hiddenProps = lane.doll.root.children.filter((c) => c !== lane.doll.facing && c.visible);
    for (const c of lane.hiddenProps) c.visible = false;
    const kick = { x: lane.bal.leanX * 0.04, y: 0.02, z: lane.bal.leanZ * 0.04 };
    lane.ragdoll = new Ragdoll(this.world, lane.doll, this.group, { x: v.x, y: v.y, z: v.z }, kick);
    this.game.audio.sfx('fall');
    this.game.input.rumble(0.9, 0.7, 320, lane.input.padIndex >= 0 ? lane.input.padIndex : undefined);
    const c = lane.ragdoll.centre();
    this.game.comic && this.game.comic.pop('CLACK!', c.x, c.y + 1.2, c.z);
    this.game.rig && this.game.rig.shake(0.08);
    this.onFall(lane);
    this.watchersReact('shrug');
    if (lane.kind === 'local' && this.watchers && this.r() < 0.35 && !this.game.speech.line) {
      const w = this.watchers[Math.floor(cos(0, this.watchers.length))];
      this.game.speech.say(w.id, line(w.id, 'watch'), { auto: 2, top: true });
      this.lastBark = this.t;
    }
    if (lane.kind === 'local') { this.game.onFloorExercise(); this.bark(this.data.instructor, lane.falls > 2 && this.data.instructor === 'trudy' ? 'fall_many' : 'fall', 2.6, 3, { n: lane.falls }); }
  }
  recoverLane(lane) {
    lane.fallen = false;
    if (lane.ragdoll) { lane.ragdoll.end(); lane.ragdoll = null; }
    lane.doll.ragdolled = false;
    if (lane.hiddenProps) { for (const c of lane.hiddenProps) c.visible = true; lane.hiddenProps = null; }
    lane.bal.recover();
    lane.doll.place(lane.bal.fx, lane.bal.fy, lane.bal.fz);
    lane.doll.rig.once('land');
    lane.doll.squash = 1;
    this.game.audio.sfx('spring');
    if (this.trudyArt) this.trudyArt.rig.once('sulk');
    this.onRecover(lane);
  }
  /** Force a fall (Dev Mode, tests). */
  forceFall(i = 0) { const l = this.lanes[i]; if (l && l.bal && !l.fallen) { const g = this.god; this.god = false; this.fallLane(l); this.god = g; } }
  syncDolls(dt) {
    for (const lane of this.lanes) {
      const d = lane.doll;
      if (!d) continue;
      if (lane.kind !== 'ghost' && lane.bal && !lane.fallen && !this.customPose) {
        const q = lane.bal.body.rotation();
        d.setLean(q.x, q.y, q.z, q.w);
        d.place(lane.bal.fx, lane.bal.fy, lane.bal.fz);
      }
      d.update(dt);
      const v = lane.discView;
      v.dx = lane.dotX; v.dz = lane.dotZ;
      v.ax = lane.input.wishX; v.az = lane.input.wishZ;
      v.alarm = lane.bal ? lane.bal.lean > 0.5 : false;
      v.breath = this.breathOn ? { size: lane.breath.size, growing: lane.breath.growing, inSync: lane.breath.inSync } : null;
    }
  }
  frame(dt) {
    this.syncDolls(dt);
    this.updateTrudy(dt);
    if (this.watchers) for (const w of this.watchers) w.d.update(dt);
    this.frameEvent(dt);
    if (this.phase === 'play') this.hud(dt);
  }
  /** Sets are built under this.group. */
  dispose() {
    for (const lane of this.lanes) {
      if (lane.ragdoll) { lane.ragdoll = null; }
    }
    this.game.scene.remove(this.group);
    if (this.world) { this.world.free(); this.world = null; }
    this.group.clear();
  }
  bodies() { return this.world ? this.world.bodies.len() : 0; }
  /** A short non-blocking remark from whoever is teaching. */
  bark(who, situation, auto = 2.6, gap = 7, vars = null) {
    if (this.mode === 'session' || this.mode === 'attract') return;
    if (this.t - (this.lastBark ?? -99) < gap) return;
    this.lastBark = this.t;
    const text = line(who, situation, vars);
    if (text) this.game.speech.say(who, text, { auto, top: true });
  }
  medal(lane) { return medalFor(lane.form); }
  /** A few guests come to watch, and react. Nobody ever mentions they are wooden toys. */
  addWatchers(spots) {
    this.watchers = spots.map(([x, y, z, yaw], i) => {
      const w = WATCHERS[i % WATCHERS.length];
      const d = new Doll({ shirt: w.shirt, hat: w.hat, height: w.height, shorts: w.shorts });
      d.flatFeet = false;
      d.root.position.set(x, y, z); d.face(yaw);
      d.rig.loop(i % 2 ? 'breathe' : 'idle');
      this.group.add(d.root);
      return { d, id: w.id };
    });
  }
  /** Fall: they gasp. Near the end of a class: they clap. */
  watchersReact(clip) {
    if (!this.watchers) return;
    for (const w of this.watchers) w.d.rig.once(clip);
  }
  /** Balance Play is hers: Trudy attends, and her bubble follows you. */
  addTrudy(x, y, z, yaw = 0, scale = 1) {
    const t = new TrudyArt();
    t.root.position.set(x, y, z); t.root.rotation.y = yaw; t.root.scale.setScalar(scale);
    this.group.add(t.root);
    this.trudyArt = t;
    return t;
  }
  updateTrudy(dt) {
    if (!this.trudyArt) return;
    const l = this.lanes.find((x) => x.kind === 'local') || this.lanes[0];
    this.trudyArt.feel(l && l.bal ? l.cobX * 0.9 : 0);
    this.trudyArt.update(dt);
  }
  /** Standing props are lit, chunky, inked and at most slightly alive. */
  ramp(a, b, k) { return a + (b - a) * Math.max(0, Math.min(1, k)); }
}
export { RAPIER, cos, cosPick };
