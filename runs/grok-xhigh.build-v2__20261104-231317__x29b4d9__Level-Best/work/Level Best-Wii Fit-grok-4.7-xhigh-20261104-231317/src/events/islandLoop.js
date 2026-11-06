import { Standing } from './base.js';
import { createTilt, stepTilt, gravityFromTilt } from '../physics/island.js';
import { medalOf } from '../game/score.js';
import { getTune } from '../core/tuning.js';
import { clamp } from './lean.js';

const ROAD = 19;
const LAP = Math.PI * 2 * ROAD;

export class IslandLoop extends Standing {
  static id = 'islandLoop';
  static title = 'Island Loop';
  static discipline = 'Cardio';
  static instructor = 'trudy';
  static couch = false;
  static session = false;
  static can = 'Alternate your feet to jog the ring road. Steer with your weight. Stay with Kevin.';
  static cant = 'You cannot sprint the whole way. Outside the pace band, the loop does not count.';
  static verbs = ['weight', 'leftFoot', 'rightFoot'];
  static tiers = {
    1: { blurb: 'Two laps. Kevin is feeling kind.' },
    2: { blurb: 'Two laps, and the camber is ruder.' },
    3: { blurb: 'Two laps. The shells are a dare.' },
  };

  constructor(opts = {}) {
    super(opts);
    this.restDeg = opts.restDeg ?? (this.tier === 1 ? 3.6 : this.tier === 2 ? 2.4 : 1.2);
    this.tilt = createTilt(this.restDeg);
    this.theta = 0;
    this.radial = 0;
    this.laps = 0;
    this.dist = 0;
    this.prevL = 0;
    this.prevR = 0;
    this.lastFoot = '';
    this.stepTimes = [];
    this.bandTime = 0;
    this.sampleTime = 0;
    this.shells = Array.from({ length: 8 }, (_, n) => ({ a: (n / 8) * Math.PI * 2, got: false }));
    this.got = 0;
    this.duration = 90;
  }

  build() { this.buildWorld(8, 30); }

  cadence() {
    const recent = this.stepTimes.filter((t) => this.t - t <= 2);
    return recent.length / 2;
  }

  fixed(dt, inputs) {
    const input = inputs[0] || {};
    const state = this.states[0];
    if (!state.fallen) {
      state.wishX = input.wishX || 0;
      state.wishZ = input.wishZ || 0;
    }
    const l = input.feetL || 0;
    const r = input.feetR || 0;
    let step = false;
    if (l >= 0.5 && this.prevL < 0.5 && this.lastFoot !== 'L') {
      step = true;
      this.lastFoot = 'L';
    }
    if (r >= 0.5 && this.prevR < 0.5 && this.lastFoot !== 'R') {
      step = true;
      this.lastFoot = 'R';
    }
    this.prevL = l;
    this.prevR = r;
    if (step) {
      this.stepTimes.push(this.t);
      const slope = Math.sin(this.tilt.tx) * Math.cos(this.theta) + Math.sin(this.tilt.tz) * Math.sin(this.theta);
      const stride = 1.4 * clamp(1 - slope * 0.8, 0.7, 1.15);
      this.dist += stride;
      this.theta += stride / ROAD;
      this.radial += (input.wishX || 0) * 0.35;
      this.radial *= 0.98;
    }
    const px = Math.cos(this.theta) * (ROAD + this.radial);
    const pz = Math.sin(this.theta) * (ROAD + this.radial);
    const foot = this.dolls[0].foot;
    foot.setNextKinematicTranslation({ x: this.lanes[0].x + px * 0.02, y: 0, z: this.lanes[0].z + pz * 0.02 });
    stepTilt(this.tilt, dt, (this.restDeg * Math.PI) / 180, 0, px, pz, getTune('islandSpring'), getTune('islandWeight'));
    gravityFromTilt(this.tilt.tx, this.tilt.tz, getTune('gravity'));
    const cad = this.cadence();
    if (this.t > 2) {
      this.sampleTime += dt;
      if (Math.abs(cad - 2.5) <= 2.5 * 0.15) this.bandTime += dt;
    }
    for (const shell of this.shells) {
      if (shell.got) continue;
      const d = Math.atan2(Math.sin(this.theta - shell.a), Math.cos(this.theta - shell.a));
      if (Math.abs(d) < 0.08 && Math.abs(this.radial) < 1.2) {
        shell.got = true;
        this.got += 1;
      }
    }
    const lap = this.dist / LAP;
    if (lap >= 2 && this.laps < 2) this.laps = 2;
    this.stepCores(dt, { margin: 0.9, ankleMax: 6 });
    if (this.laps >= 2 || this.t >= this.duration) this.done = true;
  }

  result(i = 0) {
    const share = this.sampleTime > 0 ? this.bandTime / this.sampleTime : 0;
    const shellShare = this.got / this.shells.length;
    const form = clamp(100 * (0.9 * share + 0.1 * shellShare), 0, 100);
    return {
      form, raw: this.dist, medal: medalOf(form),
      stats: `${this.laps} laps · ${this.got} shells`,
      falls: this.states[i].falls,
      laps: this.laps,
    };
  }

  botInput(i, skill) {
    const err = (skill?.speedErr ?? 0) > 1 ? 0.16 : (skill?.speedErr ?? 0) > 0.5 ? 0.08 : 0.02;
    const rate = 2.5 * (1 + err * Math.sin(this.t * 0.35 + this.ph));
    this.jog = (this.jog || 0) + rate / 120;
    const n = Math.floor(this.jog);
    const on = this.jog - n < 0.45;
    const half = n % 2 === 0;
    const steer = clamp(-this.radial * 0.9, -1, 1);
    return {
      x: steer, y: 0.15,
      feetL: on && half ? 1 : 0,
      feetR: on && !half ? 1 : 0,
      flail: false, hop: false, breathe: false,
    };
  }
}
