import { Standing } from './base.js';
import { medalOf } from '../game/score.js';
import { rng } from '../core/rng.js';
import { DEG } from '../physics/balancer.js';
import { timingOffset } from '../input/bot.js';
import { clamp } from './lean.js';

const TIERS = {
  1: { power: 0.35, ease: 0 },
  2: { power: 0.5, ease: 12 },
  3: { power: 0.54, ease: 9 },
};

export class Tug extends Standing {
  static id = 'tug';
  static title = 'Tug of Peace';
  static discipline = 'Strength';
  static instructor = 'bolster';
  static couch = true;
  static session = false;
  static can = 'On Heave, squeeze both feet and lean back. First side to take the pull wins it.';
  static cant = 'Lean back while they ease off and you sit down. This one is not in a remote class.';
  static verbs = ['weight', 'leftFoot', 'rightFoot', 'flail'];
  static tiers = {
    1: { blurb: 'Both Sandras pull politely.' },
    2: { blurb: 'They ease off. Do not be greedy.' },
    3: { blurb: 'They ease off often. Choose your lean.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.rope = 0;
    this.pullsWon = this.lanes.map(() => 0);
    this.pullsLost = this.lanes.map(() => 0);
    this.call = 0;
    this.nextCall = 1.2;
    this.ease = 0;
    this.sit = this.lanes.map(() => 0);
    this.stick = 0.9;
    this.label = opts.label ?? 'tug';
    this.maxPulls = 3;
  }

  build() { this.buildWorld(8, 16); }

  theirPower() {
    return this.params.power * (0.8 + 0.4 * rng(this.label));
  }

  fixed(dt, inputs) {
    if (this.ease > 0) this.ease = Math.max(0, this.ease - dt);
    let called = false;
    if (this.t >= this.nextCall && this.pullsWon[0] + this.pullsLost[0] < this.maxPulls) {
      called = true;
      this.call = this.t;
      this.nextCall += 1.2;
      if (this.params.ease && this.nextCall > 0 && Math.floor(this.t / this.params.ease) !== Math.floor((this.t - 1.2) / this.params.ease)) {
        this.ease = 0.8;
      }
    }
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        const back = this.ease > 0 ? Math.min(input.wishZ || 0, 0.5) : (input.wishZ || 0);
        state.wishX = input.wishX || 0;
        state.wishZ = back;
      }
      if (this.sit[i] > 0) this.sit[i] = Math.max(0, this.sit[i] - dt);
    }
    const input0 = inputs[0] || {};
    if (called && !this.states[0].fallen) {
      const err = Math.abs(this.t - this.call);
      const timing = clamp(1 - err / 0.3, 0, 1);
      const share = clamp(this.states[0].leanZ / (18 * DEG), 0, 1);
      const feet = Math.min(input0.feetL || 0, input0.feetR || 0);
      const yours = timing * share * clamp(feet, 0, 1);
      const theirs = this.ease > 0 ? 0 : this.theirPower();
      this.rope += (yours - theirs) * 0.33;
      if (this.rope >= 1) {
        this.pullsWon[0] += 1;
        this.rope = 0;
      } else if (this.rope <= -1) {
        this.pullsLost[0] += 1;
        this.rope = 0;
      }
    }
    this.stepCores(dt, { margin: 0.7, ankleMax: 5.4 }, (i) => {
      const their = this.ease > 0 ? 0 : this.params.power;
      const s = { nx: 0, nz: 0.1 + 0.3 * their };
      if (this.sit[i] > 0) s.nz -= 3.2;
      return s;
    });
    for (let i = 0; i < this.lanes.length; i++) {
      const share = this.states[i].leanZ / (18 * DEG);
      if (this.ease > 0.2 && share > 0.72 && this.sit[i] <= 0 && !this.states[i].fallen) {
        const input = inputs[i] || {};
        if (input.flail && this.tryFlail(i)) {
          this.sit[i] = 0;
        } else {
          this.sit[i] = 0.5;
        }
      }
    }
    const donePulls = this.pullsWon[0] + this.pullsLost[0] >= this.maxPulls;
    if (donePulls || this.t > 70) this.done = true;
  }

  result(i = 0) {
    const won = i === 0 ? this.pullsWon[0] : 0;
    const form = clamp(40 + 30 * won - 5 * this.states[i].falls, 0, 100);
    return {
      form, raw: won, medal: medalOf(form),
      stats: `${won} pulls won`,
      falls: this.states[i].falls,
      won,
    };
  }

  botInput(i, skill) {
    const until = this.nextCall - this.t;
    const err = timingOffset(skill, Math.floor(this.t));
    const hit = until < 0.16 + err && until > -0.05;
    const lean = this.tier === 1 ? 0.9 : this.tier === 2 ? 0.85 : 0.9;
    return {
      x: 0,
      y: -lean,
      feetL: hit ? 1 : 0,
      feetR: hit ? 1 : 0,
      flail: this.ease > 0.3 && this.tier > 1,
      hop: false,
      breathe: false,
    };
  }
}
