import { Standing } from './base.js';
import { getTune } from '../core/tuning.js';
import { medalOf } from '../game/score.js';
import { clamp } from './lean.js';

const BANDS = {
  L: { lo: 3.5, hi: 5, mid: 4.25 },
  M: { lo: 6.5, hi: 8, mid: 7.25 },
  S: { lo: 9.5, hi: 11, mid: 10.25 },
};

const TIERS = {
  1: { plates: ['L', 'M', 'S'], decay: 0.11 },
  2: { plates: ['L', 'M', 'M', 'S'], decay: 0.13 },
  3: { plates: ['L', 'L', 'M', 'M', 'S', 'S'], decay: 0.16 },
};

export class Plates extends Standing {
  static id = 'plates';
  static title = 'Plate Spinners';
  static discipline = 'Cardio';
  static instructor = 'bolster';
  static couch = true;
  static session = true;
  static can = 'Circle the stick, or tap A and D. Each key press is half a turn. Match a plate\'s band.';
  static cant = 'You cannot fall here. You can only drop plates.';
  static verbs = ['weight'];
  static tiers = {
    1: { blurb: 'Large, medium, small.' },
    2: { blurb: 'Four plates. The middle ones argue.' },
    3: { blurb: 'Six plates. Keep changing speed.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.params = { ...(TIERS[this.tier] || TIERS[1]) };
    this.duration = opts.session ? 50 : 60;
    this.god = true;
    this.plates = this.lanes.map(() => this.params.plates.map((band) => ({
      band, energy: 0.7, alive: true, back: 0, aliveTime: 0,
    })));
    this.hoop = this.lanes.map(() => 0);
    this.sensed = this.lanes.map(() => 0);
    this.prevAng = this.lanes.map(() => 0);
    this.hasAng = this.lanes.map(() => false);
    this.keyAngle = this.lanes.map(() => 0);
    this.lastPress = this.lanes.map(() => -1);
    this.crashes = this.lanes.map(() => 0);
    this.bandWish = this.lanes.map(() => 'L');
    this.bandAt = this.lanes.map(() => 0);
    this.angle = this.lanes.map(() => 0);
    this.spin = this.lanes.map(() => 0);
  }

  build() { this.buildWorld(8, 12); }

  decay() {
    return this.tier === 1 ? getTune('plateDecay') : this.params.decay;
  }

  gain() { return getTune('plateGain'); }

  fixed(dt, inputs) {
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      state.wishX = input.wishX || 0;
      state.wishZ = input.wishZ || 0;
      const sx = input.screenX != null ? input.screenX : (input.wishX || 0);
      const sy = input.screenY != null ? input.screenY : -(input.wishZ || 0);
      const mag = Math.hypot(sx, sy);
      let omega = 0;
      const tapped = !!(input.plateA || input.plateD);
      if (mag > 0.5) {
        const ang = Math.atan2(sy, sx);
        if (this.hasAng[i]) {
          let d = ang - this.prevAng[i];
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          omega = d / dt;
        }
        this.prevAng[i] = ang;
        this.hasAng[i] = true;
        const a = 1 - Math.exp(-dt / 0.12);
        this.sensed[i] += (omega - this.sensed[i]) * a;
      } else if (tapped) {
        const prev = this.lastPress[i];
        if (prev >= 0) {
          const gap = this.t - prev;
          // Each press is half a turn, so the gap is the hoop speed. The slow band is one tap every ~0.7 s.
          if (gap >= dt && gap <= 1.2) {
            const instant = Math.PI / gap;
            const a = 1 - Math.exp(-gap / 0.12);
            this.sensed[i] += (instant - this.sensed[i]) * a;
          }
        }
        this.lastPress[i] = this.t;
        this.hasAng[i] = false;
      } else if (this.lastPress[i] < 0 || this.t - this.lastPress[i] > 1.05) {
        this.sensed[i] *= Math.exp(-3 * dt);
        this.hasAng[i] = false;
      }
      const b = 1 - Math.exp(-dt / 0.5);
      this.hoop[i] += (this.sensed[i] - this.hoop[i]) * b;
      const speed = Math.abs(this.hoop[i]);
      for (const plate of this.plates[i]) {
        if (plate.back > 0) {
          plate.back = Math.max(0, plate.back - dt);
          if (plate.back === 0) {
            plate.alive = true;
            plate.energy = 0.7;
          }
          continue;
        }
        const band = BANDS[plate.band];
        const inside = speed >= band.lo && speed <= band.hi;
        plate.energy += dt * (inside ? this.gain() : -this.decay());
        plate.energy = clamp(plate.energy, 0, 1);
        if (plate.energy <= 0) {
          plate.alive = false;
          plate.back = 6;
          this.crashes[i] += 1;
        } else {
          plate.aliveTime += dt;
        }
      }
    }
    this.stepCores(dt, { margin: 0.8 });
    if (this.t >= this.duration) this.done = true;
  }

  share(i = 0) {
    const possible = this.plates[i].length * this.duration;
    const alive = this.plates[i].reduce((sum, plate) => sum + plate.aliveTime, 0);
    return possible > 0 ? alive / possible : 0;
  }

  result(i = 0) {
    const share = this.share(i);
    const form = clamp(200 * share - 100, 0, 100);
    return {
      form, raw: share, medal: medalOf(form),
      stats: `${Math.round(share * 100)}% spinning · ${this.crashes[i]} crashes`,
      falls: 0,
      share,
      crashes: this.crashes[i],
    };
  }

  botInput(i, skill, opt = {}) {
    const alive = this.plates[i].filter((plate) => plate.alive);
    const lowest = alive.slice().sort((a, b) => a.energy - b.energy)[0] || this.plates[i][0];
    const here = alive.filter((plate) => plate.band === this.bandWish[i]);
    const hereMin = here.length ? Math.min(...here.map((plate) => plate.energy)) : 0;
    const reaction = Math.max(0.9, skill?.reaction ?? 0.12);
    const urgent = lowest && lowest.energy < 0.35 && lowest.band !== this.bandWish[i];
    if ((urgent || hereMin > 0.9) && lowest && this.t - this.bandAt[i] > reaction) {
      this.bandWish[i] = lowest.band;
      this.bandAt[i] = this.t;
    }
    const band = BANDS[this.bandWish[i]];
    const clumsy = (skill?.speedErr ?? 0) > 1;
    // A clumsy hand wanders several rad/s, so the hoop leaves the band. A sharp hand stays inside it.
    const wander = (skill?.speedErr ?? 0.3) * (clumsy ? 3.5 : 0.12) * Math.sin(this.t * 1.7 + this.ph);
    const omega = band.mid + wander;
    if (opt.keys) {
      const prev = this.spin[i];
      this.spin[i] += omega * (1 / 120);
      const turn = Math.floor(this.spin[i] / Math.PI);
      const tap = turn !== Math.floor(prev / Math.PI);
      const which = Math.abs(turn);
      return { x: 0, y: 0, plateA: tap && which % 2 === 1, plateD: tap && which % 2 === 0, flail: false, hop: false };
    }
    this.angle[i] += omega * (1 / 120);
    return {
      x: Math.cos(this.angle[i]),
      y: Math.sin(this.angle[i]),
      flail: false,
      hop: false,
      breathe: false,
    };
  }
}
