import { Standing } from './base.js';
import { CHARTS, notesOf } from '../data/charts.js';
import { getTune } from '../core/tuning.js';
import { difficultyOf } from '../physics/balancer.js';
import { medalOf } from '../game/score.js';
import { timingOffset } from '../input/bot.js';
import { screenOf, clamp } from './lean.js';

const LEAN = { '<': { x: -1, y: 0 }, '>': { x: 1, y: 0 }, '^': { x: 0, y: 1 }, v: { x: 0, y: -1 } };

export class StepClass extends Standing {
  static id = 'stepClass';
  static title = 'Step Class';
  static discipline = 'Cardio';
  static instructor = 'bolster';
  static couch = true;
  static session = true;
  static can = 'Step on the footprints. Lean when the ribbon asks, and lead it a little.';
  static cant = 'A foot note is not a lean. Missing the window trips someone in the class.';
  static verbs = ['weight', 'leftFoot', 'rightFoot'];
  static tiers = {
    1: { blurb: 'A friendly tempo and one lean break.' },
    2: { blurb: 'More steps, a little faster.' },
    3: { blurb: 'The bandstand is full and fast.' },
  };

  constructor(opts = {}) {
    super(opts);
    const key = opts.session ? 'session' : this.tier;
    this.chart = CHARTS[key] || CHARTS[1];
    this.notes = notesOf(this.chart);
    this.duration = this.chart.cells.length * this.chart.cellDt + 0.4;
    this.hit = this.lanes.map(() => []);
    this.judged = this.lanes.map(() => new Set());
    this.prevL = this.lanes.map(() => 0);
    this.prevR = this.lanes.map(() => 0);
    this.steps = this.lanes.map(() => []);
    this.combo = this.lanes.map(() => 0);
    this.misses = this.lanes.map(() => 0);
  }

  build() { this.buildWorld(8, 18); }

  windowScale() {
    return getTune('rhythmWindow') * difficultyOf(this.difficulty).rhythm;
  }

  fixed(dt, inputs) {
    const scale = this.windowScale();
    const beat = 60 / this.chart.bpm;
    for (let i = 0; i < this.lanes.length; i++) {
      const input = inputs[i] || {};
      const state = this.states[i];
      if (!state.fallen) {
        state.wishX = input.wishX || 0;
        state.wishZ = input.wishZ || 0;
      }
      const l = input.feetL || 0;
      const r = input.feetR || 0;
      if (l >= 0.5 && this.prevL[i] < 0.5) this.steps[i].push({ foot: 'L', t: this.t });
      if (r >= 0.5 && this.prevR[i] < 0.5) this.steps[i].push({ foot: 'R', t: this.t });
      if (l >= 0.5 && r >= 0.5 && (this.prevL[i] < 0.5 || this.prevR[i] < 0.5)) this.steps[i].push({ foot: 'B', t: this.t });
      this.prevL[i] = l;
      this.prevR[i] = r;
      const cob = screenOf(state, 18);
      for (let n = 0; n < this.notes.length; n++) {
        if (this.judged[i].has(n)) continue;
        const note = this.notes[n];
        if (this.t < note.time - 0.05) break;
        if (note.lean) {
          const dir = LEAN[note.cell];
          const passed = (dir.x !== 0 && Math.sign(cob.x) === Math.sign(dir.x) && Math.abs(cob.x) >= 0.25)
            || (dir.y !== 0 && Math.sign(cob.y) === Math.sign(dir.y) && Math.abs(cob.y) >= 0.25);
          const late = this.t - note.time;
          if (passed && late <= beat * 2) {
            const mark = late <= beat * 1.5 ? 1 : 0.5;
            this.hit[i].push(mark);
            this.judged[i].add(n);
            this.combo[i] += 1;
          } else if (late > beat * 2) {
            this.hit[i].push(0);
            this.judged[i].add(n);
            this.misses[i] += 1;
            this.combo[i] = 0;
          }
        } else if (this.t > note.time + 0.135 * scale) {
          let best = 0;
          for (const step of this.steps[i]) {
            if (step.foot !== note.cell && !(note.cell === 'B' && step.foot === 'B')) continue;
            const err = Math.abs(step.t - note.time);
            const perfect = 0.045 * scale;
            const good = 0.09 * scale;
            const ok = 0.135 * scale;
            if (err <= perfect) best = Math.max(best, 1);
            else if (err <= good) best = Math.max(best, 0.7);
            else if (err <= ok) best = Math.max(best, 0.4);
          }
          this.hit[i].push(best);
          this.judged[i].add(n);
          if (best > 0) this.combo[i] += 1;
          else {
            this.misses[i] += 1;
            this.combo[i] = 0;
          }
        }
      }
    }
    this.stepCores(dt, { margin: 0.6, ankleMax: 5 });
    if (this.t >= this.duration) this.done = true;
  }

  result(i = 0) {
    const list = this.hit[i];
    const raw = list.length ? list.reduce((a, b) => a + b, 0) / this.notes.length : 0;
    const form = clamp(raw * 100, 0, 100);
    return {
      form, raw, medal: medalOf(form),
      stats: `${list.length} notes · combo ${this.combo[i]}`,
      falls: this.states[i].falls,
    };
  }

  botInput(i, skill) {
    let feetL = 0;
    let feetR = 0;
    let wish = { x: 0, y: 0 };
    const lead = 0.02;
    for (const note of this.notes) {
      const when = note.time + timingOffset(skill, note.index) - lead;
      if (!note.lean && this.t >= when && this.t < when + 0.08) {
        if (note.cell === 'L' || note.cell === 'B') feetL = 1;
        if (note.cell === 'R' || note.cell === 'B') feetR = 1;
      }
      if (note.lean && this.t >= note.time - 0.12 && this.t < note.time + 0.7) {
        wish = LEAN[note.cell];
      }
    }
    return { x: wish.x, y: wish.y, feetL, feetR, flail: false, hop: false, breathe: false };
  }
}
