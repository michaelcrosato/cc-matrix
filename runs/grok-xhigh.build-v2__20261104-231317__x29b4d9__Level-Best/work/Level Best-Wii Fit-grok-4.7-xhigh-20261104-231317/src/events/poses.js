import { Standing } from './base.js';
import { POSES } from '../data/poses.js';
import { DEG } from '../physics/balancer.js';
import { medalOf } from '../game/score.js';
import { correctWish, remember, recall } from '../input/bot.js';
import { getTune } from '../core/tuning.js';

const TIERS = {
  1: { n: 3, hold: 8, ring0: 0.3, ring1: 0.16, sway0: 0.08, sway1: 0.22, tremor0: 0.08, tremor1: 0.2 },
  2: { n: 4, hold: 10, ring0: 0.3, ring1: 0.13, sway0: 0.12, sway1: 0.3, tremor0: 0.1, tremor1: 0.3 },
  3: { n: 5, hold: 12, ring0: 0.3, ring1: 0.1, sway0: 0.15, sway1: 0.38, tremor0: 0.15, tremor1: 0.4 },
};

const GLIDE = 3;
const MAX_LEAN = 14;

export class Poses extends Standing {
  static id = 'poses';
  static title = 'Poses';
  static discipline = 'Stillness';
  static instructor = 'stillwater';
  static couch = true;
  static session = true;
  static can = 'Follow the ring with your weight. Breathe in while the breath ring grows.';
  static cant = 'You can fall. Flail costs a little form, and it will not hold the pose for you.';
  static verbs = ['weight', 'flail', 'breathe'];
  static tiers = {
    1: { blurb: 'Three poses. The ring shrinks slowly.' },
    2: { blurb: 'Four poses. The ring gets small.' },
    3: { blurb: 'Five poses. Breath is how you stay.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = TIERS[this.tier] || TIERS[1];
    this.list = POSES.slice(0, this.params.n);
    this.earned = this.lanes.map(() => 0);
    this.possible = this.lanes.map(() => 0);
    this.hist = this.lanes.map(() => []);
    this.breathSync = this.lanes.map(() => 0);
    this.breathSeen = this.lanes.map(() => 0);
    this.flailPenalty = this.lanes.map(() => 0);
    this.poseMax = MAX_LEAN;
  }

  build() { this.buildWorld(8, 16); }

  poseClock() {
    const len = GLIDE + this.params.hold;
    const total = len * this.list.length;
    const t = Math.min(this.t, total - 1e-4);
    const index = Math.max(0, Math.min(this.list.length - 1, Math.floor(t / len)));
    const local = t - index * len;
    const pose = this.list[index];
    const gliding = local < GLIDE;
    const u = gliding ? local / GLIDE : (local - GLIDE) / this.params.hold;
    const ring = gliding
      ? { x: pose.x * u, y: pose.y * u }
      : { x: pose.x, y: pose.y };
    const radius = gliding ? this.params.ring0 : this.params.ring0 + (this.params.ring1 - this.params.ring0) * u;
    const sway = gliding ? this.params.sway0 : this.params.sway0 + (this.params.sway1 - this.params.sway0) * u;
    const tremor = gliding ? this.params.tremor0 : this.params.tremor0 + (this.params.tremor1 - this.params.tremor0) * u;
    return { index, local, gliding, ring, radius: Math.max(0.08, radius * (getTune('ringEnd') / 0.16)), sway, tremor, pose, total };
  }

  breathPhase() {
    const cycle = 8;
    const p = (this.t % cycle) / cycle;
    return { grow: p < 0.5, p };
  }

  screenCob(i) {
    const m = this.poseMax * DEG;
    return { x: this.states[i].leanX / m, y: -this.states[i].leanZ / m };
  }

  fixed(dt, inputs) {
    const clock = this.poseClock();
    const breath = this.breathPhase();
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      if (input.flail && this.tryFlail(i)) this.flailPenalty[i] += 4;
      const synced = breath.grow ? !!input.breathe : !input.breathe;
      this.breathSeen[i] += dt;
      if (synced) this.breathSync[i] += dt;
    }
    const bonus = this.lanes.map((_, i) => (this.breathSeen[i] > 4 && this.breathSync[i] / this.breathSeen[i] >= 0.7) ? 0.6 : 1);
    this.stepCores(dt, { maxLean: this.poseMax, margin: 0.45 }, (i) => {
      const s = this.sway(i, clock.sway * bonus[i], clock.tremor * bonus[i]);
      return s;
    });
    if (this.t <= clock.total + dt) {
      for (let i = 0; i < this.lanes.length; i++) {
        if (this.states[i].fallen) continue;
        const cob = this.screenCob(i);
        const dist = Math.hypot(cob.x - clock.ring.x, cob.y - clock.ring.y);
        const inside = dist <= clock.radius;
        const worth = 0.3 / Math.max(0.08, clock.radius);
        const gain = bonus[i] < 1 ? 1.25 : 1;
        this.possible[i] += worth;
        if (inside) this.earned[i] += worth * gain;
      }
    }
    if (this.t >= clock.total) this.done = true;
  }

  result(i = 0) {
    const share = this.possible[i] > 0 ? this.earned[i] / this.possible[i] : 0;
    const form = Math.max(0, Math.min(100, share * 100 - this.flailPenalty[i]));
    return {
      form, raw: this.earned[i],
      medal: medalOf(form),
      stats: `${this.list.length} poses · ${this.states[i].falls} floor exercises`,
      falls: this.states[i].falls,
    };
  }

  botInput(i, skill, opt = {}) {
    const clock = this.poseClock();
    const cob = this.screenCob(i);
    remember(this.hist[i], this.t, cob);
    const past = recall(this.hist[i], this.t - (skill?.delay ?? 0.16));
    const goal = clock.ring;
    let wish;
    if (opt.parked) wish = { x: goal.x, y: goal.y };
    else wish = correctWish(skill, goal, past, this.t, false, this.ph + i);
    const breath = this.breathPhase();
    return { x: wish.x, y: wish.y, breathe: opt.parked ? false : breath.grow, flail: false, hop: false };
  }
}
