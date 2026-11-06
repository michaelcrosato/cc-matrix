import { Standing } from './base.js';
import { RAPIER, propGroups, dollGroups, bodyPoint } from '../physics/world.js';
import { getTune } from '../core/tuning.js';
import { rng } from '../core/rng.js';
import { medalOf } from '../game/score.js';
import { clamp } from './lean.js';

const TIERS = {
  1: { metres: 30, gust: 1.2, every: 7, par: 560 },
  2: { metres: 45, gust: 2.0, every: 6, par: 520 },
  3: { metres: 60, gust: 2.3, every: 5, par: 480 },
};

export class RoomService extends Standing {
  static id = 'roomService';
  static title = 'Room Service';
  static discipline = 'Balance Play';
  static instructor = 'trudy';
  static couch = true;
  static session = false;
  static can = 'Alternate feet to walk. When the gust shows, lean into the green side early and gently.';
  static cant = 'The same foot twice stumbles. A big late lean throws the glasses.';
  static verbs = ['weight', 'leftFoot', 'rightFoot', 'flail'];
  static tiers = {
    1: { blurb: 'A short boardwalk and a polite wind.' },
    2: { blurb: 'Farther, and Gary wants a glass.' },
    3: { blurb: 'A long walk in a ruder wind.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.reflexOverride = 5;
    this.ankleOverride = 6;
    this.progress = this.lanes.map(() => 0);
    this.speed = this.lanes.map(() => 0);
    this.glasses = this.lanes.map(() => []);
    this.held = this.lanes.map(() => 5);
    this.lastFoot = this.lanes.map(() => '');
    this.prevL = this.lanes.map(() => 0);
    this.prevR = this.lanes.map(() => 0);
    this.rock = this.lanes.map(() => 0);
    this.warn = this.lanes.map(() => 0);
    this.gust = this.lanes.map(() => 0);
    this.gustSign = 1;
    this.nextGust = 4;
    this.delivered = this.lanes.map(() => 0);
    this.splashes = this.lanes.map(() => 0);
    this.label = opts.label ?? 'room';
    this.side = this.lanes.map(() => 0);
  }

  build() {
    this.buildWorld(10, 40);
    for (let i = 0; i < this.lanes.length; i++) {
      const body = this.dolls[i].body;
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.3, 0.01, 0.3)
          .setMass(0.04).setFriction(1).setTranslation(0, 0.5, 0.3)
          .setCollisionGroups(dollGroups(i)),
        body,
      );
      for (let g = 0; g < 5; g++) {
        const x = (g - 2) * 0.09;
        const glass = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic().setTranslation(this.lanes[i].x + x, 1.36, this.lanes[i].z + 0.3)
            .setCanSleep(false).setLinearDamping(0.6).setAngularDamping(0.9),
        );
        this.world.createCollider(
          RAPIER.ColliderDesc.cylinder(0.06, 0.05)
            .setMass(0.012).setFriction(0.95).setRestitution(0)
            .setCollisionGroups(propGroups(i)),
          glass,
        );
        this.glasses[i].push(glass);
      }
    }
  }

  gustMag() {
    return this.tier === 1 ? getTune('gustForce') : this.params.gust;
  }

  fixed(dt, inputs) {
    if (this.t >= this.nextGust && this.delivered[0] === 0) {
      this.gustSign = rng(this.label) < 0.5 ? -1 : 1;
      for (let i = 0; i < this.lanes.length; i++) this.warn[i] = 1;
      this.nextGust += this.params.every;
    }
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      if (this.warn[i] > 0) {
        this.warn[i] = Math.max(0, this.warn[i] - dt);
        if (this.warn[i] === 0) this.gust[i] = 0.5;
      }
      const l = input.feetL || 0;
      const r = input.feetR || 0;
      let step = '';
      if (l >= 0.5 && this.prevL[i] < 0.5) step = 'L';
      if (r >= 0.5 && this.prevR[i] < 0.5) step = step === 'L' ? 'B' : 'R';
      this.prevL[i] = l;
      this.prevR[i] = r;
      if ((step === 'L' || step === 'R') && this.t > 0.8) {
        if (step === this.lastFoot[i]) this.rock[i] = Math.max(this.rock[i], 0.35);
        else this.rock[i] = Math.max(this.rock[i], 0.18);
        this.lastFoot[i] = step;
        this.speed[i] = 0.55 / 0.42;
      }
      if (this.t - (this.lastStepAt?.[i] ?? -10) > 0.42 * 1.6 && step) {
        /* a fresh step refreshes the timer below */
      }
      if (step) this.lastStepAt = Object.assign(this.lastStepAt || {}, { [i]: this.t });
      const since = this.t - (this.lastStepAt?.[i] ?? -10);
      if (since > 0.42 * 1.6) this.speed[i] = 0;
      const target = this.speed[i];
      this.progress[i] += target * dt;
      const foot = this.dolls[i].foot;
      const x = this.lanes[i].x + this.side[i];
      const z = this.lanes[i].z + Math.min(this.params.metres, this.progress[i]);
      foot.setNextKinematicTranslation({ x, y: 0, z });
      if (step === 'L' || step === 'R') this.side[i] += state.leanX * 0.25 * 0.55;
      if (Math.abs(this.side[i]) > 0.8 && this.held[i] > 0) {
        this.splashes[i] += 1;
        this.held[i] -= 1;
        this.side[i] = 0;
        this.progress[i] = Math.max(0, this.progress[i] - 2);
        const glass = this.glasses[i][this.held[i]];
        if (glass) glass.setEnabled(false);
      }
    }
    this.stepCores(dt, { margin: 0.8, ankleMax: 6, reflex: 5 }, (i) => {
      const s = { nx: 0, nz: 0 };
      if (this.rock[i] > 0) {
        s.nx += 0.2;
        this.rock[i] = Math.max(0, this.rock[i] - dt);
      }
      if (this.gust[i] > 0) {
        s.nx += this.gustSign * this.gustMag();
        this.gust[i] = Math.max(0, this.gust[i] - dt);
      }
      return s;
    });
    for (let i = 0; i < this.lanes.length; i++) {
      const home = this.dolls[i].body.translation();
      let held = 0;
      for (const glass of this.glasses[i]) {
        if (!glass.isEnabled()) continue;
        const p = glass.translation();
        if (p.y < 0.45 || Math.hypot(p.x - home.x, p.z - home.z) > 1.4) glass.setEnabled(false);
        else held += 1;
      }
      this.held[i] = held;
      if (this.progress[i] >= this.params.metres && !this.done) {
        this.delivered[i] = this.held[i];
      }
    }
    if (this.progress[0] >= this.params.metres || this.t > this.params.metres / 0.4 + 8) {
      for (let i = 0; i < this.lanes.length; i++) this.delivered[i] = this.held[i];
      this.done = true;
    }
  }

  result(i = 0) {
    const raw = this.delivered[i] * 100 + Math.max(0, 40 - this.t);
    const form = clamp((100 * raw) / this.params.par, 0, 100);
    return {
      form, raw, medal: medalOf(form),
      stats: `${this.delivered[i]} of 5 glasses delivered`,
      falls: this.states[i].falls,
      glasses: this.delivered[i],
    };
  }

  botInput(i, skill, opt = {}) {
    const pace = 0.42 * (1 + (skill?.timingSd ?? 0.03));
    const phase = this.t / pace;
    const which = Math.floor(phase) % 2 === 0 ? 'L' : 'R';
    const on = (phase % 1) < 0.45;
    let x = 0;
    if ((this.warn[i] > 0 || this.gust[i] > 0) && opt.brace !== false) {
      const brace = 0.2 * this.gustMag();
      x = -this.gustSign * brace;
    } else {
      x = clamp(-this.side[i] * 0.8, -0.25, 0.25);
    }
    return {
      x, y: 0,
      feetL: on && which === 'L' ? 1 : 0,
      feetR: on && which === 'R' ? 1 : 0,
      flail: false, hop: false, breathe: false,
    };
  }
}
