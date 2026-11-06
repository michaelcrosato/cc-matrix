import { Standing } from './base.js';
import { medalOf } from '../game/score.js';
import { rng } from '../core/rng.js';
import { screenOf, clamp } from './lean.js';
import { correctWish, remember, recall } from '../input/bot.js';

const TIERS = {
  1: { seconds: 30, every: 5, push0: 0.2, push1: 0.4, par: 88 },
  2: { seconds: 45, every: 4.5, push0: 0.2, push1: 0.4, par: 78 },
  3: { seconds: 60, every: 4, push0: 0.25, push1: 0.45, par: 72 },
};

export class Plank extends Standing {
  static id = 'plank';
  static title = 'Plank & Perch';
  static discipline = 'Strength';
  static instructor = 'bolster';
  static couch = false;
  static session = false;
  static can = 'Hold the plank. Counter the gulls with your weight. Flail shakes them off.';
  static cant = 'Stay outside the zone for two seconds and you belly-flop. That rep of pride is gone.';
  static verbs = ['weight', 'flail'];
  static tiers = {
    1: { blurb: 'Thirty seconds. A gull every five.' },
    2: { blurb: 'Forty-five seconds. They like you.' },
    3: { blurb: 'A full minute under the flock.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.duration = this.params.seconds;
    this.gulls = this.lanes.map(() => []);
    this.nextAt = 5;
    this.outTime = this.lanes.map(() => 0);
    this.inTime = this.lanes.map(() => 0);
    this.flailPenalty = this.lanes.map(() => 0);
    this.hist = this.lanes.map(() => []);
    this.sign = 1;
    this.label = opts.label ?? 'plank';
  }

  build() { this.buildWorld(8, 14); }

  net(i) {
    return this.gulls[i].reduce((sum, g) => sum + g.nx, 0);
  }

  fixed(dt, inputs) {
    if (this.t >= this.nextAt && this.t < this.duration) {
      for (let i = 0; i < this.lanes.length; i++) {
        const span = this.params.push1 - this.params.push0;
        const mag = this.params.push0 + rng(this.label) * span;
        const same = rng(this.label) < 0.7;
        this.sign = same ? this.sign : -this.sign;
        this.gulls[i].push({ nx: this.sign * mag });
      }
      this.nextAt += this.params.every;
    }
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      if (input.flail && this.tryFlail(i)) {
        this.gulls[i] = [];
        this.flailPenalty[i] += this.tier === 1 ? 4 : 8;
      }
    }
    this.stepCores(dt, { margin: 0.55, ankleMax: 5.2 }, (i) => {
      const s = this.sway(i, 0.1, 0.04);
      s.nx += this.net(i);
      return s;
    });
    for (let i = 0; i < this.lanes.length; i++) {
      const state = this.states[i];
      if (state.fallen) continue;
      const cob = screenOf(state, 18);
      const inside = Math.hypot(cob.x, cob.y) <= 0.28;
      if (inside) {
        this.inTime[i] += dt;
        this.outTime[i] = 0;
      } else {
        this.outTime[i] += dt;
        if (this.outTime[i] > 2 && !this.rags[i]) {
          state.fallen = true;
          state.falls += 1;
          state.recoverLeft = 0.8;
          this.beginFall(i);
          this.outTime[i] = 0;
          this.gulls[i] = [];
        }
      }
    }
    if (this.t >= this.duration) this.done = true;
  }

  result(i = 0) {
    const share = this.inTime[i] / this.duration;
    const raw = share * 100 + this.gulls[i].length * 3 - this.flailPenalty[i];
    const form = clamp((100 * Math.max(0, raw)) / this.params.par, 0, 100);
    return {
      form, raw, medal: medalOf(form),
      stats: `${this.gulls[i].length} gulls still aboard`,
      falls: this.states[i].falls,
    };
  }

  botInput(i, skill) {
    const cob = screenOf(this.states[i], 18);
    remember(this.hist[i], this.t, cob);
    const past = recall(this.hist[i], this.t - (skill?.delay ?? 0.16));
    const goal = clamp(-this.net(i) / 3.1, -0.9, 0.9);
    const wish = correctWish(skill, { x: goal, y: 0 }, past, this.t, true, this.ph);
    const flail = this.outTime[i] > 1.2 && Math.abs(cob.x) > 0.35 && this.gulls[i].length > 2;
    return { x: wish.x, y: wish.y, flail, hop: false, breathe: false };
  }
}
