import { Standing } from '../events/base.js';
import { screenOf, clamp } from '../events/lean.js';
import { correctWish, remember, recall, timingOffset } from '../input/bot.js';
import { mean } from './score.js';

const TESTS = {
  stand: { len: 10, sway: 0.1, tremor: 0.06 },
  lean: { len: 18, sway: 0.04, tremor: 0.02 },
  step: { len: 16 },
  quick: { len: 15 },
  onefoot: { len: 12, sway: 0.1, tremor: 0.05 },
};

const LEAN_TARGETS = [-0.7, 0.55, -0.4];
const QUICK = [
  { x: -0.7, y: 0 }, { x: 0.7, y: 0 }, { x: 0, y: 0.7 },
  { x: 0, y: -0.7 }, { x: -0.5, y: 0.5 }, { x: 0.6, y: -0.2 },
];

export class CheckIn extends Standing {
  static id = 'checkin';
  static title = 'Check-In';
  static verbs = ['weight', 'leftFoot', 'rightFoot'];

  constructor(opts = {}) {
    super(opts);
    this.tests = (opts.tests && opts.tests.length ? opts.tests : ['stand', 'lean', 'step']).map((id) => (
      id === 'best' ? 'stand' : id
    ));
    this.index = 0;
    this.local = 0;
    this.scores = [];
    this.samples = [];
    this.hist = [];
    this.prevL = 0;
    this.prevR = 0;
    this.steps = [];
    this.quickHit = [];
    this.quickAt = 0;
    this.marginMul = 1;
  }

  build() { this.buildWorld(8, 10); }

  current() { return this.tests[this.index]; }

  fixed(dt, inputs) {
    const id = this.current();
    if (!id) {
      this.done = true;
      return;
    }
    const spec = TESTS[id] || TESTS.stand;
    const input = inputs[0] || {};
    const state = this.states[0];
    if (!state.fallen) {
      state.wishX = input.wishX || 0;
      state.wishZ = input.wishZ || 0;
    }
    this.local += dt;
    const cob = screenOf(state, 18);
    if (id === 'stand' || id === 'onefoot') {
      this.samples.push(Math.hypot(cob.x, cob.y));
    } else if (id === 'lean') {
      const seg = Math.min(2, Math.floor(this.local / 6));
      const into = this.local - seg * 6;
      if (into > 1.5) {
        const target = LEAN_TARGETS[seg];
        this.samples.push(Math.abs(cob.x - target));
      }
    } else if (id === 'step') {
      const l = input.feetL || 0;
      const r = input.feetR || 0;
      if (l >= 0.5 && this.prevL < 0.5) this.steps.push(this.local);
      if (r >= 0.5 && this.prevR < 0.5) this.steps.push(this.local);
      this.prevL = l;
      this.prevR = r;
    } else if (id === 'quick') {
      const seg = Math.min(5, Math.floor(this.local / 2.5));
      if (seg !== this.quickAt) {
        this.quickAt = seg;
        this.quickWait = this.local;
        this.quickDone = false;
      }
      const target = QUICK[seg];
      if (!this.quickDone && target && (Math.sign(cob.x) === Math.sign(target.x) || target.x === 0) && (Math.sign(cob.y) === Math.sign(target.y) || target.y === 0) && Math.hypot(cob.x, cob.y) > 0.35) {
        this.quickHit.push(this.local - (this.quickWait || 0));
        this.quickDone = true;
      }
    }
    const sway = spec.sway || 0.04;
    const tremor = spec.tremor || 0.02;
    this.stepCores(dt, { margin: id === 'onefoot' ? 0.225 : 0.45 }, () => this.sway(0, sway, tremor));
    if (this.local >= spec.len) this.closeTest();
  }

  closeTest() {
    const id = this.current();
    let score = 0;
    if (id === 'stand' || id === 'onefoot') {
      const dist = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 1;
      score = clamp(1 - dist / 0.25, 0, 1);
    } else if (id === 'lean') {
      const err = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 1;
      score = clamp(1 - err / 0.4, 0, 1);
    } else if (id === 'step') {
      const beat = 60 / 96;
      const errors = [];
      for (let n = 1; n < this.steps.length; n++) errors.push(Math.abs((this.steps[n] - this.steps[n - 1]) - beat) * 1000);
      const err = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : 120;
      score = clamp(1 - err / 120, 0, 1);
    } else if (id === 'quick') {
      const react = this.quickHit.length ? this.quickHit.reduce((a, b) => a + b, 0) / this.quickHit.length : 1.2;
      score = clamp(1 - (react - 0.35) / 0.9, 0, 1);
    }
    this.scores.push(score);
    this.samples = [];
    this.steps = [];
    this.quickHit = [];
    this.local = 0;
    this.index += 1;
    if (!this.current()) this.done = true;
  }

  meanScore() {
    return mean(this.scores);
  }

  result() {
    return { scores: this.scores.slice(), mean: this.meanScore(), tests: this.tests.slice() };
  }

  botInput(i, skill) {
    const id = this.current() || 'stand';
    const cob = screenOf(this.states[0], 18);
    remember(this.hist, this.t, cob);
    const past = recall(this.hist, this.t - (skill?.delay ?? 0.16));
    let goal = { x: 0, y: 0 };
    if (id === 'lean') {
      const seg = Math.min(2, Math.floor(this.local / 6));
      goal = { x: LEAN_TARGETS[seg], y: 0 };
    }
    if (id === 'quick') {
      const seg = Math.min(5, Math.floor(this.local / 2.5));
      const wait = (skill?.reaction ?? 0.12);
      if (this.local - seg * 2.5 > wait) goal = QUICK[seg];
    }
    const loaded = id === 'lean' || id === 'onefoot';
    const wish = correctWish(loaded ? { ...skill, gain: skill.gainLoad } : skill, goal, past, this.t, false, 0.4);
    let feetL = 0;
    let feetR = 0;
    if (id === 'step') {
      const beat = 60 / 96;
      const shifted = this.local + timingOffset(skill, 1);
      const n = Math.floor(shifted / beat);
      const into = shifted - n * beat;
      if (into < 0.09) {
        if (n % 2 === 0) feetL = 1;
        else feetR = 1;
      }
    }
    if (id === 'onefoot') feetR = 1;
    return { x: wish.x, y: wish.y, feetL, feetR, flail: false, hop: false, breathe: false };
  }
}
