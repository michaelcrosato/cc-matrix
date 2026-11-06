import { Standing } from './base.js';
import { getTune } from '../core/tuning.js';
import { medalOf } from '../game/score.js';
import { difficultyOf, DEG } from '../physics/balancer.js';
import { screenOf, clamp, lerp } from './lean.js';

const TIERS = {
  1: { reps: 6, sway0: 0.08, sway1: 0.22, tremor0: 0.04, tremor1: 0.12 },
  2: { reps: 9, sway0: 0.12, sway1: 0.3, tremor0: 0.06, tremor1: 0.16 },
  3: { reps: 12, sway0: 0.15, sway1: 0.38, tremor0: 0.08, tremor1: 0.2 },
};

export class LogReps extends Standing {
  static id = 'logReps';
  static title = 'Log Reps';
  static discipline = 'Strength';
  static instructor = 'bolster';
  static couch = true;
  static session = true;
  static can = 'Follow the ribbon with both feet and keep the dot near the middle.';
  static cant = 'The log is a number on your shoulders. Lean it past the notch and Coach has to catch it.';
  static verbs = ['weight', 'leftFoot', 'rightFoot'];
  static tiers = {
    1: { blurb: 'Six reps, then Coach lies about the last one.' },
    2: { blurb: 'Nine reps. The band is stricter.' },
    3: { blurb: 'Twelve reps. The band is strict.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.offset = this.lanes.map(() => 0);
    this.repScore = this.lanes.map(() => []);
    this.bandTime = this.lanes.map(() => 0);
    this.zoneTime = this.lanes.map(() => 0);
    this.repClock = this.lanes.map(() => 0);
    this.repIndex = this.lanes.map(() => 0);
    this.lost = this.lanes.map(() => 0);
    this.ankleOverride = 6;
    this.dropped = this.lanes.map(() => false);
    this.lastRep = 0;
  }

  build() { this.buildWorld(8, 16); }

  tempo() {
    const diff = difficultyOf(this.difficulty).rhythm;
    return getTune('repTempo') * diff;
  }

  cycle() { return 5 / this.tempo(); }

  ribbon(t) {
    const cycle = this.cycle();
    const u = (t % cycle) / cycle;
    const down = 2 / 5;
    const pause = 0.5 / 5;
    if (u < down) return u / down;
    if (u < down + pause) return 1;
    if (u < down + pause + down) return 1 - (u - down - pause) / down;
    return 0;
  }

  totalReps() { return this.params.reps + 2; }

  halfWidth(rep) {
    const base = lerp(0.16, 0.1, rep / this.params.reps);
    return Math.max(0.06, base - 0.02 * (this.tier - 1));
  }

  fixed(dt, inputs) {
    const cycle = this.cycle();
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen && !this.dropped[i]) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      const depth = ((input.feetL || 0) + (input.feetR || 0)) / 2;
      const target = this.ribbon(this.t);
      const rep = Math.min(this.totalReps() - 1, Math.floor(this.t / cycle));
      const band = this.halfWidth(rep);
      const cob = screenOf(state, 18);
      if (!state.fallen && !this.dropped[i]) {
        const err = Math.abs(depth - target);
        const depthHit = err <= band ? 1 : clamp(1 - (err - band) / 0.08, 0, 1);
        this.bandTime[i] += dt * depthHit;
        if (Math.hypot(cob.x, cob.y) <= 0.3) this.zoneTime[i] += dt;
        this.repClock[i] += dt;
      }
      const deg = Math.abs(state.leanX) / DEG;
      if (deg > 6) this.offset[i] += Math.sign(state.leanX || 1) * 0.05 * (deg - 6) * dt;
      else this.offset[i] *= Math.exp(-dt * 0.8);
      if (Math.abs(this.offset[i]) >= 0.5 && !this.dropped[i]) {
        this.dropped[i] = true;
        this.lost[i] += 1;
        this.offset[i] = 0;
        this.dropBack = (this.dropBack || 0) + 1;
      }
      if (this.dropped[i]) {
        this.dropT = (this.dropT || 0) + dt;
        if (this.dropT > 0.6) {
          this.dropped[i] = false;
          this.dropT = 0;
        }
      }
    }
    const u = clamp(this.t / (this.totalReps() * cycle), 0, 1);
    this.stepCores(dt, { margin: 0.8, ankleMax: 6 }, (i) => {
      const s = this.sway(i, lerp(this.params.sway0, this.params.sway1, u), lerp(this.params.tremor0, this.params.tremor1, u));
      s.nx += 0.06 * 9.81 * this.offset[i];
      return s;
    });
    const repNow = Math.floor(this.t / cycle);
    if (repNow > this.lastRep) {
      for (let i = 0; i < this.lanes.length; i++) {
        const clock = Math.max(1e-4, this.repClock[i]);
        const bandShare = clamp(this.bandTime[i] / clock, 0, 1);
        const zoneShare = clamp(this.zoneTime[i] / clock, 0, 1);
        let score = bandShare * (0.5 + 0.5 * zoneShare);
        if (this.lastRep >= this.params.reps) score *= 2;
        if (this.lost[i]) score = 0;
        this.repScore[i].push(score);
        this.bandTime[i] = 0;
        this.zoneTime[i] = 0;
        this.repClock[i] = 0;
        this.lost[i] = 0;
      }
      this.lastRep = repNow;
    }
    if (this.t >= this.totalReps() * cycle) this.done = true;
  }

  result(i = 0) {
    const list = this.repScore[i];
    const raw = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    const form = clamp(raw * 100, 0, 100);
    return {
      form, raw, medal: medalOf(form),
      stats: `${list.length} reps · the log stayed a number`,
      falls: this.states[i].falls,
    };
  }

  botInput(i, skill) {
    const late = skill?.delay ?? 0.16;
    const depth = this.ribbon(Math.max(0, this.t - late));
    const cob = screenOf(this.states[i], 18);
    const fix = (skill?.gainLoad ?? 0.7) * (0 - cob.x);
    return {
      x: clamp(fix, -0.4, 0.4),
      y: clamp(-cob.y * (skill?.gainLoad ?? 0.7), -0.4, 0.4),
      feetL: depth,
      feetR: depth,
      flail: false,
      hop: false,
      breathe: false,
    };
  }
}
