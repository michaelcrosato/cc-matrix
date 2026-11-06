import { Standing } from './base.js';
import { medalOf } from '../game/score.js';
import { correctWish, remember, recall } from '../input/bot.js';
import { screenOf, clamp, lerp } from './lean.js';
import { mean } from '../game/score.js';

const TIERS = {
  1: { zone: 0.15, sway0: 0.07, sway1: 0.18, sneezes: 2, par: 100 },
  2: { zone: 0.12, sway0: 0.1, sway1: 0.22, sneezes: 3, par: 100 },
  3: { zone: 0.1, sway0: 0.12, sway1: 0.26, sneezes: 4, par: 100 },
};

export class StillWater extends Standing {
  static id = 'stillWater';
  static title = 'Still Water';
  static discipline = 'Stillness';
  static instructor = 'stillwater';
  static couch = false;
  static session = false;
  static can = 'Sit in the calm. When a sneeze is coming, flail to stifle it.';
  static cant = 'You cannot chase the creatures. Leaving the calm sends them off.';
  static verbs = ['weight', 'flail', 'breathe'];
  static tiers = {
    1: { blurb: 'A wide calm, and two sneezes.' },
    2: { blurb: 'The calm shrinks. Three sneezes.' },
    3: { blurb: 'A small calm, and four sneezes.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.duration = opts.session ? 50 : 60;
    this.calm = this.lanes.map(() => 0);
    this.inTime = this.lanes.map(() => 0);
    this.warn = this.lanes.map(() => 0);
    this.shove = this.lanes.map(() => 0);
    this.stifled = this.lanes.map(() => false);
    this.hist = this.lanes.map(() => []);
    this.arrivals = this.lanes.map(() => 0);
    const span = this.duration - 8;
    this.times = Array.from({ length: this.params.sneezes }, (_, n) => 8 + (span * (n + 0.5)) / this.params.sneezes);
    this.fired = 0;
  }

  build() { this.buildWorld(8, 18); }

  fixed(dt, inputs) {
    if (this.fired < this.times.length && this.t >= this.times[this.fired]) {
      for (let i = 0; i < this.lanes.length; i++) {
        this.warn[i] = 1.2;
        this.stifled[i] = false;
      }
      this.fired += 1;
    }
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      if (this.warn[i] > 0 && input.flail && this.tryFlail(i)) this.stifled[i] = true;
      if (this.warn[i] > 0) {
        this.warn[i] = Math.max(0, this.warn[i] - dt);
        if (this.warn[i] === 0 && !this.stifled[i]) this.shove[i] = 0.3;
      }
    }
    const u = clamp(this.t / this.duration, 0, 1);
    const sway = lerp(this.params.sway0, this.params.sway1, u);
    this.stepCores(dt, { margin: 0.45 }, (i) => {
      const s = this.sway(i, sway, 0.05);
      if (this.shove[i] > 0) {
        this.shove[i] = Math.max(0, this.shove[i] - dt);
        s.nx += 2.2;
      }
      return s;
    });
    for (let i = 0; i < this.lanes.length; i++) {
      if (this.states[i].fallen) {
        this.calm[i] = Math.max(0, this.calm[i] - dt / 8);
        continue;
      }
      const cob = screenOf(this.states[i], 18);
      const inside = Math.hypot(cob.x, cob.y) <= this.params.zone;
      if (inside) this.inTime[i] += dt;
      this.calm[i] = clamp(this.calm[i] + dt * (inside ? 1 / 30 : -1 / 8), 0, 1);
      const gates = [0.2, 0.4, 0.6, 0.8, 1];
      this.arrivals[i] = gates.filter((g) => this.calm[i] >= g - 1e-6).length;
    }
    if (this.t >= this.duration) this.done = true;
  }

  result(i = 0) {
    const share = this.inTime[i] / this.duration;
    const form = clamp(mean([share, this.calm[i]]) * 100, 0, 100);
    return {
      form, raw: form, medal: medalOf(form),
      stats: `${Math.round(share * 100)}% calm time · ${this.arrivals[i]} visitors`,
      falls: this.states[i].falls,
      calm: this.calm[i],
    };
  }

  botInput(i, skill) {
    const cob = screenOf(this.states[i], 18);
    remember(this.hist[i], this.t, cob);
    const past = recall(this.hist[i], this.t - (skill?.delay ?? 0.16));
    // The fast noise term rings against a delayed correction and throws the pose out of the pond.
    // Wander the aim slowly, in proportion to that noise, and correct without the buzz.
    const amp = (skill?.noise ?? 0) * (0.08 / 0.07);
    const goal = {
      x: amp * Math.sin(this.t * 0.5 + this.ph),
      y: amp * 0.6 * Math.sin(this.t * 0.37 + this.ph + 1.2),
    };
    const steady = { ...skill, noise: 0, gain: (skill?.noise ?? 0) > 0.05 ? 0.55 : skill?.gain };
    const wish = correctWish(steady, goal, past, this.t, false, this.ph);
    const flail = this.warn[i] > 0.2 && this.warn[i] < 1.05 && !this.stifled[i];
    return { x: wish.x, y: wish.y, flail, breathe: false, hop: false };
  }
}
