import { Standing } from './base.js';
import { RAPIER, dollGroups, bodyPoint } from '../physics/world.js';
import { getTune } from '../core/tuning.js';
import { rng } from '../core/rng.js';
import { DEG } from '../physics/balancer.js';
import { medalOf } from '../game/score.js';

const TIERS = {
  1: { radius: 0.45, every: 1.6, mass: 0.015, ankle: 4.6, margin: 0.45, par: 52 },
  2: { radius: 0.55, every: 1.3, mass: 0.012, ankle: 5, margin: 0.6, par: 60 },
  3: { radius: 0.65, every: 1.0, mass: 0.012, ankle: 5, margin: 0.6, par: 70 },
};

function kindOf(roll) {
  if (roll < 0.08) return { id: 'urchin', mass: 0.02, value: 0, penalty: 2, knock: 1.1 };
  if (roll < 0.14) return { id: 'boot', mass: 0.03, value: 1, penalty: 0, knock: 0 };
  if (roll < 0.18) return { id: 'pineapple', mass: 0.028, value: 5, penalty: 0, knock: 0 };
  return { id: 'fruit', mass: 0, value: 1, penalty: 0, knock: 0 };
}

export class FruitHat extends Standing {
  static id = 'fruitHat';
  static title = 'Fruit Hat';
  static discipline = 'Balance Play';
  static instructor = 'trudy';
  static couch = true;
  static session = true;
  static can = 'Lean the basket hat under the shadow. Hop to bank what you are wearing.';
  static cant = 'A fall spills everything you have not banked. You cannot keep it by standing still.';
  static verbs = ['weight', 'hop', 'flail'];
  static tiers = {
    1: { blurb: 'One fruit at a time. The pier is kind.' },
    2: { blurb: 'They come faster, and a little wider.' },
    3: { blurb: 'The barge is showing off.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    if (opts.session) this.duration = 50;
    else this.duration = opts.duration ?? 60;
    this.hats = this.lanes.map(() => []);
    this.banked = this.lanes.map(() => 0);
    this.score = this.lanes.map(() => 0);
    this.banks = this.lanes.map(() => 0);
    this.bankCool = this.lanes.map(() => 0);
    this.knock = this.lanes.map(() => 0);
    this.flight = [];
    this.spawnIn = 0.6;
    this.label = opts.label ?? `fruit-${opts.seed ?? 1}`;
    this.ankleOverride = this.params.ankle;
  }

  build() {
    this.buildWorld(8, 20);
    for (let i = 0; i < this.lanes.length; i++) {
      const body = this.dolls[i].body;
      this.world.createCollider(
        RAPIER.ColliderDesc.cylinder(0.02, 0.36).setMass(0.01).setTranslation(0, 0.75, 0).setFriction(0.9).setCollisionGroups(dollGroups(i)),
        body,
      );
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(0.02, 0.1, 0.16)
            .setMass(0.001)
            .setTranslation(Math.cos(a) * 0.36, 0.85, Math.sin(a) * 0.36)
            .setRotation({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) })
            .setCollisionGroups(dollGroups(i)),
          body,
        );
      }
    }
  }

  radius() { return this.tier === 1 ? getTune('landingRadius') : this.params.radius; }
  every() { return this.tier === 1 ? getTune('fruitInterval') : this.params.every; }
  massOf(kind) { return kind.mass || (this.tier === 1 ? getTune('fruitMass') : this.params.mass); }

  fixed(dt, inputs) {
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen && this.bankCool[i] <= 0) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      } else if (!state.fallen) {
        state.wishX = 0;
        state.wishZ = 0;
      }
      if (input.flail) {
        if (this.tryFlail(i) && this.hats[i].length) this.dropOne(i);
      }
      if (input.hop && this.bankCool[i] <= 0 && this.hats[i].length && !state.fallen) this.bank(i);
      if (this.bankCool[i] > 0) this.bankCool[i] = Math.max(0, this.bankCool[i] - dt);
      if (this.knock[i] > 0) this.knock[i] = Math.max(0, this.knock[i] - dt);
    }

    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.t < this.duration - 1.6) {
      this.spawnIn += this.every();
      this.spawn();
    }

    for (const fruit of this.flight) fruit.age += dt;

    this.stepCores(dt, { margin: this.params.margin, ankleMax: this.params.ankle }, (i) => {
      const k = this.knock[i] > 0 ? 1.1 : 0;
      return { nx: k, nz: 0 };
    });

    const arrived = [];
    for (const fruit of this.flight) {
      if (fruit.age < fruit.fly) {
        const u = fruit.age / fruit.fly;
        const y = 1.75 + Math.sin(u * Math.PI) * 2.4;
        const x = fruit.fromX + (fruit.x - fruit.fromX) * u;
        const z = fruit.fromZ + (fruit.z - fruit.fromZ) * u;
        fruit.body.setNextKinematicTranslation({ x, y, z });
      } else arrived.push(fruit);
    }
    for (const fruit of arrived) this.land(fruit);
    this.flight = this.flight.filter((f) => !f.done);

    if (this.t >= this.duration && !this.done) {
      for (let i = 0; i < this.lanes.length; i++) {
        if (this.hats[i].length) {
          const half = this.hats[i].reduce((s, f) => s + f.value, 0) * 0.5;
          this.score[i] += half;
          this.clearHat(i);
        }
      }
      this.done = true;
    }
  }

  spawn() {
    for (let i = 0; i < this.lanes.length; i++) {
      const home = this.lanes[i];
      const ang = rng(this.label) * Math.PI * 2;
      const rad = Math.sqrt(rng(this.label)) * this.radius();
      const x = home.x + Math.cos(ang) * rad;
      const z = home.z + Math.sin(ang) * rad;
      const kind = kindOf(rng(this.label));
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, 1.75, z + 7));
      this.world.createCollider(
        RAPIER.ColliderDesc.ball(0.075).setMass(this.massOf(kind)).setFriction(0.8).setRestitution(0.1).setCollisionGroups(dollGroups(i)),
        body,
      );
      this.flight.push({
        body, lane: i, x, z, fromX: x, fromZ: z + 7, age: 0, fly: 1.5, kind, done: false,
      });
    }
  }

  land(fruit) {
    fruit.done = true;
    const i = fruit.lane;
    const state = this.states[i];
    if (state.fallen || this.bankCool[i] > 0) {
      this.world.removeRigidBody(fruit.body);
      return;
    }
    const basket = bodyPoint(this.dolls[i].body, { x: 0, y: 0.75, z: 0 });
    const dist = Math.hypot(basket.x - fruit.x, basket.z - fruit.z);
    if (dist <= 0.38) {
      this.world.removeRigidBody(fruit.body);
      const n = this.hats[i].length;
      const mass = this.massOf(fruit.kind);
      const col = this.world.createCollider(
        RAPIER.ColliderDesc.ball(0.07).setMass(mass).setTranslation(0, 0.9 + n * 0.06, 0).setCollisionGroups(dollGroups(i)),
        this.dolls[i].body,
      );
      this.hats[i].push({ col, value: fruit.kind.value, penalty: fruit.kind.penalty, mass });
      if (fruit.kind.knock) this.knock[i] = 0.18;
      this.score[i] -= fruit.kind.penalty;
    } else {
      this.world.removeRigidBody(fruit.body);
    }
  }

  bank(i) {
    const hat = this.hats[i];
    const n = hat.length;
    if (!n) return;
    const value = hat.reduce((s, f) => s + f.value, 0);
    this.score[i] += value * (1 + 0.1 * (n - 1));
    this.banked[i] += n;
    this.banks[i] += 1;
    this.clearHat(i);
    this.bankCool[i] = 1;
  }

  dropOne(i) {
    const hat = this.hats[i];
    const top = hat.pop();
    if (!top) return;
    this.world.removeCollider(top.col, true);
  }

  clearHat(i) {
    for (const fruit of this.hats[i]) this.world.removeCollider(fruit.col, true);
    this.hats[i] = [];
  }

  onFall(i) {
    this.clearHat(i);
  }

  result(i = 0) {
    const raw = this.score[i];
    const form = Math.max(0, Math.min(100, (100 * raw) / this.params.par));
    return {
      form, raw,
      medal: medalOf(form),
      stats: `${this.banked[i]} banked · ${this.states[i].falls} spills`,
      banked: this.banked[i],
      falls: this.states[i].falls,
    };
  }

  /**
   * Sharp banks at 7. The stick aims at a fruit only in its last 0.95 s.
   * bankAt Infinity never hops.
   */
  botInput(i, skill, opt = 7) {
    const bankAt = typeof opt === 'number' ? opt : (opt?.bankAt ?? 7);
    const home = this.lanes[i];
    let target = null;
    let best = 1e9;
    for (const fruit of this.flight) {
      if (fruit.lane !== i || fruit.done) continue;
      const left = fruit.fly - fruit.age;
      if (left > 0.95) continue;
      if (left < best) { best = left; target = fruit; }
    }
    const reach = Math.max(0.2, Math.sin(getTune('maxLean') * DEG) * 1.5);
    let x = 0;
    let y = 0;
    if (target) {
      const dx = target.x - home.x;
      const dz = target.z - home.z;
      x = dx / reach;
      y = -dz / reach;
      const n = skill.noise || 0;
      x += n * Math.sin(this.t * 4 + i);
      y += n * Math.cos(this.t * 3 + i);
    }
    const hop = this.hats[i].length >= bankAt && this.bankCool[i] <= 0 && !this.states[i].fallen;
    const h = Math.hypot(x, y) || 1;
    const s = h > 1 ? 1 / h : 1;
    return { x: x * s, y: y * s, hop, flail: false };
  }
}
