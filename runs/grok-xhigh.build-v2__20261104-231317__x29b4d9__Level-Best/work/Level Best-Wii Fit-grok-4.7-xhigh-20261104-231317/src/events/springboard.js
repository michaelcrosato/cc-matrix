import { Standing } from './base.js';
import { getTune } from '../core/tuning.js';
import { medalOf } from '../game/score.js';
import { DEG } from '../physics/balancer.js';
import { timingOffset } from '../input/bot.js';
import { clamp } from './lean.js';

const TIERS = { 1: { tower: 5 }, 2: { tower: 7 }, 3: { tower: 9 } };

export class Springboard extends Standing {
  static id = 'springboard';
  static title = 'Springboard';
  static discipline = 'Balance Play';
  static instructor = 'trudy';
  static couch = true;
  static session = true;
  static can = 'Pump both feet as the board goes down. Hop near the top. In the air, aim for a clean line or a proud flop.';
  static cant = 'You cannot steer the board with your weight. Late pumping barely lifts you.';
  static verbs = ['leftFoot', 'rightFoot', 'hop', 'weight'];
  static tiers = {
    1: { blurb: 'The five metre tower. Three dives, best two.' },
    2: { blurb: 'Seven metres. The air is longer.' },
    3: { blurb: 'Nine metres. There is time to change your mind.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.dives = [];
    this.dive = 0;
    this.phase = 'pump';
    this.y = 0.05;
    this.v = 0;
    this.spin = 0;
    this.angle = 0;
    this.airT = 0;
    this.pumpT = 0;
    this.height = this.params.tower;
    this.scores = [];
    this.omega = (Math.PI * 2) / 0.9;
    this.zeta = 0.035;
  }

  build() { this.buildWorld(8, 12); }

  fixed(dt, inputs) {
    const input = inputs[0] || {};
    const pumping = (input.feetL || 0) > 0.5 && (input.feetR || 0) > 0.5;
    const gain = getTune('boardGain');
    if (this.phase === 'pump') {
      this.pumpT += dt;
      const acc = -this.omega * this.omega * this.y - 2 * this.zeta * this.omega * this.v - (pumping ? gain : 0);
      this.v += acc * dt;
      this.y += this.v * dt;
      const state = this.states[0];
      state.wishX = 0;
      state.wishZ = 0;
      if (input.hop && this.v > 0.4 && this.pumpT > 0.4) {
        this.phase = 'air';
        this.launch = Math.max(3, this.v);
        this.airT = 0;
        this.spin = 0;
        this.angle = 0.2;
        this.peak = this.params.tower;
      }
      if (this.pumpT > 8) {
        this.phase = 'air';
        this.launch = 3;
        this.airT = 0;
        this.spin = 0;
        this.angle = 0.2;
        this.peak = this.params.tower;
      }
    } else if (this.phase === 'air') {
      this.airT += dt;
      const climb = this.launch - 9.81 * this.airT;
      this.peak = Math.max(this.peak, this.params.tower + this.launch * this.airT - 0.5 * 9.81 * this.airT * this.airT);
      const target = clamp(input.screenX || input.wishX || 0, -1, 1) * getTune('airTorque');
      const tuck = input.hop ? 1.8 : 1;
      const rate = 9;
      this.spin += (target * tuck - this.spin) * (1 - Math.exp(-rate * dt));
      this.angle += this.spin * dt;
      if (climb < 0 && this.peak > this.params.tower && this.airT > 0.4 && (this.params.tower + this.launch * this.airT - 0.5 * 9.81 * this.airT * this.airT) <= 0) {
        this.finishDive();
      }
    } else if (this.phase === 'show') {
      this.showT = (this.showT || 0) + dt;
      if (this.showT > 0.6) this.beginNext();
    }
    this.stepCores(dt, { margin: 0.8 });
    if (this.scores.length >= 3) this.done = true;
  }

  finishDive() {
    const height = this.peak;
    const belly = Math.PI / 2;
    const head = Math.PI;
    const feet = 0;
    const err = (target) => {
      let d = Math.abs(this.angle - target) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d;
    };
    const heightMul = 1 + (height - 5) / 10;
    const grace = clamp(100 * (1 - err(head) / (12 * DEG)) , 0, 100) * heightMul;
    const graceFeet = clamp(100 * (1 - err(feet) / (12 * DEG)), 0, 100) * heightMul;
    const splash = clamp(100 * (1 - err(belly) / (20 * DEG)), 0, 100) * heightMul;
    const best = Math.max(grace, graceFeet, splash, 0);
    this.scores.push(best);
    this.phase = 'show';
    this.showT = 0;
  }

  beginNext() {
    if (this.scores.length >= 3) {
      this.done = true;
      return;
    }
    this.phase = 'pump';
    this.y = 0.05;
    this.v = 0;
    this.pumpT = 0;
    this.angle = 0;
    this.spin = 0;
  }

  result(i = 0) {
    const sorted = this.scores.slice().sort((a, b) => b - a);
    const raw = sorted.length ? (sorted[0] + (sorted[1] || sorted[0])) / 2 : 0;
    const form = clamp(raw, 0, 100);
    return {
      form, raw, medal: medalOf(form),
      stats: `${this.scores.length} dives · best ${Math.round(sorted[0] || 0)}`,
      falls: this.states[i].falls,
    };
  }

  botInput(i, skill) {
    if (this.phase === 'pump') {
      const goingDown = this.v < 0;
      const late = Math.abs(timingOffset(skill, this.dive + 1));
      const pump = goingDown && late < 0.12;
      return { x: 0, y: 0, feetL: pump ? 1 : 0, feetR: pump ? 1 : 0, hop: this.v > 2.2 && this.pumpT > 0.7, flail: false };
    }
    const aim = Math.PI / 2;
    const diff = aim - this.angle;
    const x = clamp(diff / 1.2, -0.55, 0.55);
    return { x, y: 0, feetL: 0, feetR: 0, hop: false, flail: false };
  }
}
