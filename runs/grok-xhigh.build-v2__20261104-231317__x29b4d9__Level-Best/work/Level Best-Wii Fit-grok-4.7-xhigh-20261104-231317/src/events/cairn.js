import { Standing } from './base.js';
import { RAPIER, propGroups, dollGroups, bodyPoint } from '../physics/world.js';
import { getTune } from '../core/tuning.js';
import { rng } from '../core/rng.js';
import { medalOf, formOf } from '../game/score.js';
import { correctWish, remember, recall } from '../input/bot.js';
import { screenOf, clamp, lerp } from './lean.js';

const SIZES = [[0.26, 0.09], [0.24, 0.085], [0.22, 0.08], [0.2, 0.078], [0.18, 0.074], [0.165, 0.07], [0.15, 0.066], [0.14, 0.062], [0.125, 0.058], [0.11, 0.054]];
const WIDE = [[0.28, 0.09], [0.27, 0.085], [0.26, 0.08], [0.25, 0.078], [0.24, 0.074], [0.23, 0.07], [0.22, 0.066], [0.21, 0.062], [0.2, 0.058], [0.19, 0.054]];

const TIERS = {
  1: { n: 6, every: 5.5, hold: 8, sway0: 0.1, sway1: 0.3, tremor0: 0.05, tremor1: 0.15, offset: 0.015, par: 640 },
  2: { n: 8, every: 5, hold: 10, sway0: 0.15, sway1: 0.4, tremor0: 0.08, tremor1: 0.2, offset: 0.02, par: 780 },
  3: { n: 10, every: 4.5, hold: 10, sway0: 0.15, sway1: 0.4, tremor0: 0.08, tremor1: 0.2, offset: 0.02, par: 860, wide: true },
};

export class Cairn extends Standing {
  static id = 'cairn';
  static title = 'The Cairn';
  static discipline = 'Stillness';
  static instructor = 'stillwater';
  static couch = true;
  static session = true;
  static can = 'Keep the slab level while stones are lowered onto it. Breathe with the ring.';
  static cant = 'You can drop a stone. A flail will not put it back, and it costs a little form.';
  static verbs = ['weight', 'flail', 'breathe'];
  static tiers = {
    1: { blurb: 'Six stones. The stack teaches you.' },
    2: { blurb: 'Eight stones. Breath is how the tall ones stay.' },
    3: { blurb: 'Ten wider stones. The quarry is showing off.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.sizes = (this.params.wide ? WIDE : SIZES).slice(0, this.params.n);
    this.stones = [];
    this.nextAt = 1.2;
    this.spawned = 0;
    this.up = this.lanes.map(() => 0);
    this.stead = this.lanes.map(() => 0);
    this.samples = this.lanes.map(() => 0);
    this.hist = this.lanes.map(() => []);
    this.breathSync = this.lanes.map(() => 0);
    this.breathSeen = this.lanes.map(() => 0);
    this.flailPenalty = this.lanes.map(() => 0);
    this.ankleOverride = 6;
    this.label = opts.label ?? 'cairn';
  }

  build() {
    this.buildWorld(10, 16);
    for (let i = 0; i < this.lanes.length; i++) {
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.275, 0.015, 0.275)
          .setMass(0.05).setFriction(1).setTranslation(0, 0.95, 0)
          .setCollisionGroups(dollGroups(i)),
        this.dolls[i].body,
      );
    }
  }

  duration() {
    return this.nextAt + (this.params.n - 1) * this.every() + this.params.hold;
  }

  every() {
    return this.tier === 1 ? getTune('stoneInterval') : this.params.every;
  }

  massOf() {
    return this.tier === 1 ? getTune('stoneMass') : 0.02;
  }

  breathPhase() {
    const p = (this.t % 8) / 8;
    return p < 0.5;
  }

  topY(i) {
    let y = bodyPoint(this.dolls[i].body, { x: 0, y: 0.965, z: 0 }).y;
    for (const stone of this.stones) {
      if (stone.lane !== i) continue;
      const p = stone.body.translation();
      y = Math.max(y, p.y + stone.hh);
    }
    return y;
  }

  dropStone(i) {
    const [r, hh] = this.sizes[this.spawned];
    const origin = this.dolls[i].body.translation();
    const off = this.params.offset;
    const x = origin.x + (rng(this.label) * 2 - 1) * off;
    const z = origin.z + (rng(this.label) * 2 - 1) * off;
    const y = this.topY(i) + 0.012 + hh;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(false)
        .setLinearDamping(0.1).setAngularDamping(0.6),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(r * 0.8, hh, r * 0.8)
        .setMass(this.massOf()).setFriction(0.95).setRestitution(0)
        .setCollisionGroups(propGroups(i)),
      body,
    );
    this.stones.push({ body, hh, lane: i, r });
  }

  fixed(dt, inputs) {
    const total = 1.2 + this.params.n * this.every() + this.params.hold;
    const grow = this.breathPhase();
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      if (input.flail && this.tryFlail(i)) this.flailPenalty[i] += 3;
      this.breathSeen[i] += dt;
      const synced = grow ? !!input.breathe : !input.breathe;
      if (synced) this.breathSync[i] += dt;
    }
    if (this.spawned < this.params.n && this.t >= this.nextAt) {
      for (let i = 0; i < this.lanes.length; i++) {
        if (!this.states[i].fallen) this.dropStone(i);
      }
      this.spawned += 1;
      this.nextAt += this.every();
    }
    const u = clamp(this.t / Math.max(1, total - this.params.hold), 0, 1);
    const sway = lerp(this.params.sway0, this.params.sway1, u);
    const tremor = lerp(this.params.tremor0, this.params.tremor1, u);
    this.stepCores(dt, { margin: 0.8, ankleMax: 6 }, (i) => {
      const bonus = this.breathSeen[i] > 4 && this.breathSync[i] / this.breathSeen[i] >= 0.7 ? 0.6 : 1;
      return this.sway(i, sway * bonus, tremor * bonus);
    });
    for (let i = 0; i < this.lanes.length; i++) {
      if (this.states[i].fallen) continue;
      const cob = screenOf(this.states[i], 18);
      this.samples[i] += 1;
      this.stead[i] += clamp(1 - Math.hypot(cob.x, cob.y), 0, 1);
    }
    if (this.t >= total) {
      this.finishCount();
      this.done = true;
    }
  }

  finishCount() {
    if (this.counted) return;
    const total = 1.2 + this.params.n * this.every() + this.params.hold;
    // A live score read must not freeze the pile before the hold is over.
    if (!this.done && this.t < total) return;
    this.counted = true;
    for (let i = 0; i < this.lanes.length; i++) {
      const home = this.dolls[i].body.translation();
      let up = 0;
      for (const stone of this.stones) {
        if (stone.lane !== i) continue;
        const p = stone.body.translation();
        if (p.y > 0.9 && Math.hypot(p.x - home.x, p.z - home.z) < 0.42) up += 1;
      }
      this.up[i] = up;
    }
  }

  result(i = 0) {
    this.finishCount();
    const steady = this.samples[i] ? this.stead[i] / this.samples[i] : 0;
    const raw = this.up[i] * 100 + this.up[i] * 8 * steady - this.flailPenalty[i];
    const form = formOf(Math.max(0, raw), this.params.par);
    return {
      form, raw, medal: medalOf(form),
      stats: `${this.up[i]} stones still up`,
      falls: this.states[i].falls,
      stones: this.up[i],
    };
  }

  botInput(i, skill, opt = {}) {
    const cob = screenOf(this.states[i], 18);
    remember(this.hist[i], this.t, cob);
    const past = recall(this.hist[i], this.t - (skill?.delay ?? 0.16));
    const loadedSkill = { ...skill, gain: skill?.gainLoad ?? 0.7 };
    const wish = opt.parked
      ? { x: 0, y: 0 }
      : correctWish(loadedSkill, { x: 0, y: 0 }, past, this.t, false, this.ph + i);
    const grow = this.breathPhase();
    return { x: wish.x, y: wish.y, breathe: opt.breath === false ? false : grow, flail: false, hop: false };
  }
}
