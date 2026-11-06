import { Standing } from './base.js';
import { RAPIER, propGroups, dollGroups } from '../physics/world.js';
import { medalOf } from '../game/score.js';
import { correctWish, remember, recall } from '../input/bot.js';
import { screenOf, clamp, lerp } from './lean.js';
import { DEG } from '../physics/balancer.js';

const PHASES = [
  { id: 'pose', len: 20 },
  { id: 'stones', len: 20 },
  { id: 'gust', len: 20 },
  { id: 'steps', len: 20 },
  { id: 'hold', len: 15 },
];

export class GrandHold extends Standing {
  static id = 'grandHold';
  static title = 'The Grand Hold';
  static discipline = 'Finale';
  static instructor = 'trudy';
  static couch = false;
  static session = false;
  static can = 'Follow the remix. If you fall, the class catches you and the phase starts again.';
  static cant = 'You cannot fail this. You can only take longer.';
  static verbs = ['weight', 'flail', 'breathe', 'leftFoot', 'rightFoot'];
  static tiers = {
    1: { blurb: 'Four short memories, then the middle.' },
    2: { blurb: 'The same hold, asked a little more clearly.' },
    3: { blurb: 'The same hold. The island already trusts you.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.phaseIndex = 0;
    this.phaseT = 0;
    this.restarts = 0;
    this.inRing = 0;
    this.holdTime = 0;
    this.hist = this.lanes.map(() => []);
    this.stones = [];
    this.clearing = false;
    this.plate = null;
    this.plateGone = false;
    this.notch = false;
    this.gust = 0;
    this.warn = 0;
    this.nextGust = 3;
    this.ankleOverride = 6;
  }

  build() {
    this.buildWorld(10, 16);
    this.plate = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.22, 0.02, 0.22)
        .setMass(0.04).setFriction(1).setTranslation(0, 1.05, 0)
        .setCollisionGroups(dollGroups(0)),
      this.dolls[0].body,
    );
  }

  phase() { return PHASES[this.phaseIndex]; }

  spawnStone() {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(this.lanes[0].x, 2.2 + this.stones.length * 0.16, this.lanes[0].z)
        .setCanSleep(false).setLinearDamping(0.2).setAngularDamping(0.6),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.12, 0.06, 0.12).setMass(0.02).setFriction(0.95).setCollisionGroups(propGroups(0)),
      body,
    );
    this.stones.push(body);
  }

  fixed(dt, inputs) {
    const input = inputs[0] || {};
    const state = this.states[0];
    if (!state.fallen) {
      state.wishX = input.wishX || 0;
      state.wishZ = input.wishZ || 0;
    }
    const phase = this.phase();
    if (!phase) {
      this.done = true;
      return;
    }
    this.phaseT += dt;
    if (phase.id === 'stones' && !this.clearing && this.stones.length < 4 && this.phaseT > 1 + this.stones.length * 3) this.spawnStone();
    if (phase.id === 'stones' && this.phaseT >= phase.len && !this.clearing) this.clearing = true;
    if (this.clearing && !this.plateGone) {
      if (this.stones.length) {
        const body = this.stones.pop();
        this.world.removeRigidBody(body);
      } else if (!this.steppedClear) {
        this.steppedClear = true;
      } else if (this.plate) {
        this.plate.setEnabled(false);
        this.plate = null;
        this.plateGone = true;
        this.clearing = false;
      }
    }
    if (phase.id === 'gust') {
      if (this.phaseT >= this.nextGust && this.warn <= 0 && this.gust <= 0) this.warn = 1;
      if (this.warn > 0) {
        this.warn = Math.max(0, this.warn - dt);
        if (this.warn === 0) {
          this.gust = 0.5;
          this.nextGust = this.phaseT + 4;
        }
      }
    }
    if (phase.id === 'hold') {
      this.holdTime += dt;
      if (this.holdTime > 2) this.notch = true;
    }
    const pose = phase.id === 'pose' ? { x: 0.3, y: 0.1 } : { x: 0, y: 0 };
    let sway = phase.id === 'hold' ? lerp(0.2, 0.02, this.phaseT / phase.len) : phase.id === 'stones' ? 0.12 : 0.1;
    if (phase.id === 'gust') sway = 0.08;
    this.stepCores(dt, { margin: phase.id === 'stones' ? 0.8 : 0.55, ankleMax: 6, maxLean: 16 }, (i) => {
      const s = this.sway(i, sway, 0.04);
      if (this.gust > 0) {
        s.nx += 3;
        this.gust = Math.max(0, this.gust - dt);
      }
      return s;
    });
    if (state.falls > this.restarts) {
      this.restarts = state.falls;
      this.phaseT = 0;
    }
    if (phase.id === 'hold' && !state.fallen) {
      const cob = screenOf(state, 16);
      const u = clamp(this.phaseT / phase.len, 0, 1);
      const radius = lerp(0.3, 0.08, u);
      if (Math.hypot(cob.x - 0, cob.y - 0) <= radius) this.inRing += dt;
    }
    if (this.phaseT >= phase.len && !(phase.id === 'stones' && !this.plateGone)) {
      this.phaseIndex += 1;
      this.phaseT = 0;
      if (!this.phase()) this.done = true;
    }
  }

  result(i = 0) {
    const share = this.holdTime > 0 ? this.inRing / 15 : 1;
    const form = clamp(Math.max(85, share * 100), 0, 100);
    return {
      form, raw: share, medal: medalOf(form),
      stats: 'The island is level',
      falls: this.states[i].falls,
      notch: this.notch,
      failed: false,
    };
  }

  botInput(i, skill) {
    const phase = this.phase();
    const cob = screenOf(this.states[i], 16);
    remember(this.hist[i], this.t, cob);
    const past = recall(this.hist[i], this.t - 0.16);
    let goal = { x: 0, y: 0 };
    if (phase?.id === 'pose') goal = { x: 0.3, y: 0.1 };
    if (phase?.id === 'gust' && (this.warn > 0 || this.gust > 0)) goal = { x: -0.55, y: 0 };
    const wish = correctWish({ ...skill, gain: skill?.gainLoad ?? 0.7 }, goal, past, this.t, phase?.id === 'stones', this.ph);
    const step = phase?.id === 'steps';
    const on = step && Math.floor(this.t * 2) % 2 === 0;
    return {
      x: wish.x, y: wish.y,
      breathe: phase?.id === 'pose' || phase?.id === 'hold',
      feetL: on ? 1 : 0,
      feetR: !on && step ? 1 : 0,
      flail: false, hop: false,
    };
  }
}
