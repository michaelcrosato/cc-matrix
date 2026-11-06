import { ACTIVITY_BY_ID } from '../data/activities.js';
import { Dot } from './dot.js';
import { BotDriver } from './drivers.js';
import { starsFor } from './score.js';

const ZERO = { x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false, depth: 0, edgeL: false, edgeR: false };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class Sim {
  constructor(def, opts = {}) {
    this.def = def;
    this.opts = opts;
    this.T = opts.tunables;
    this.rand = opts.rand;
    this.skill = opts.skill || 'idle';
    this.hard = !!opts.hard;
    this.gentle = !!opts.gentle;
    this.god = !!opts.god;
    this.practiceOn = opts.first !== false && opts.practice !== false;
    this.dot = new Dot(opts.rand);
    this.botRand = opts.botRand || opts.rand;
    this.bot = new BotDriver(this.skill, this.botRand, () => this.botTarget());
    this.phase = 'intro';
    this.phaseT = 0;
    this.elapsed = 0;
    this.playT = 0;
    this.done = false;
    this.score = 0;
    this.stars = 0;
    this.seconds = 0;
    this.note = '';
    this.lied = false;
    this.queue = [['intro', 2.2]];
    if (this.practiceOn) this.queue.push(['practice', 8]);
    this.queue.push(['countdown', 3], ['play', null], ['outro', 1.2]);
    if (opts.skipIntro) {
      this.queue = [['play', null], ['outro', 1.2]];
      this.phase = 'play';
    }
    this.qi = 0;
    this._built();
  }
  _built() {}
  setSkill(skill) {
    this.skill = skill || 'idle';
    this.bot = new BotDriver(this.skill, this.botRand, () => this.botTarget());
  }
  ringOf(base) {
    const scale = (this.T.ringScale ?? 1) * (this.gentle ? 1.25 : 1) * (this.hard ? 0.85 : 1);
    return base * scale;
  }
  botTarget() {
    return { x: 0, y: 0 };
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    const u = this.bot.read(this.dot, dt);
    return { ...ZERO, ...u };
  }
  playFinished() {
    return this.playT >= (this.def.play || 30);
  }
  onStep() {}
  onPhase() {}
  step(dt, input) {
    if (this.done) return;
    const u = input || { ...ZERO };
    this.elapsed += dt;
    this.phaseT += dt;
    if (this.phase === 'play' || this.phase === 'practice') this.onStep(dt, u, this.phase === 'play');
    const limit = this.queue[this.qi][1];
    const over = this.phase === 'play' && this.playFinished();
    if ((limit != null && this.phaseT >= limit) || over) {
      this.qi += 1;
      if (this.qi >= this.queue.length) {
        this.finish();
        return;
      }
      this.phase = this.queue[this.qi][0];
      this.phaseT = 0;
      this.onPhase(this.phase);
    }
  }
  finish() {
    this.done = true;
    this.seconds = this.playT;
    this.scoreStars();
  }
  scoreStars() {
    this.stars = starsFor(this.score, this.def.thresholds, this.T.starThresholdScale ?? 1);
  }
  stepDot(dt, u, m) {
    const noiseMul = (this.gentle ? 0.8 : 1) * (m.noise ?? 1);
    this.dot.step(dt, u.x || 0, u.y || 0, this.T, { ...m, noise: noiseMul });
    if (this.god) {
      const r = (m.ring ?? 0.4) * 0.92;
      const d = Math.hypot(this.dot.x, this.dot.y);
      if (d > r) {
        const s = r / d;
        this.dot.x *= s;
        this.dot.y *= s;
        this.dot.vx *= 0.2;
        this.dot.vy *= 0.2;
      }
    }
  }
}

export class StillSim extends Sim {
  _built() {
    this.inside = 0;
    this.samples = 0;
    this.breathSum = 0;
    this.breathN = 0;
    this.s = 0;
    this.hold = this.def.hold;
    this.settle = 4;
    this.release = 2;
  }
  playFinished() {
    return this.playT >= this.settle + this.hold + this.release;
  }
  ring() {
    return this.ringOf(this.def.ring);
  }
  mods(scoring) {
    const m = { noise: 1, inst: 1, bx: 0, by: 0, ring: this.ring() };
    const twist = this.def.twist;
    const k = this.hold > 0 ? clamp(this.playT / this.hold, 0, 1) : 0;
    if (twist === 'bias') m.bx = (this.def.bias || 0.12) * Math.sin(0.45 * this.elapsed);
    if (twist === 'ynoise') m.noise = this.def.noise || 1.3;
    if (twist === 'ramp') m.noise = lerp(1, 1.5, clamp((this.playT - this.settle) / this.hold, 0, 1));
    if (twist === 'plank') {
      m.inst = 1.2;
      if (this.playT > this.settle + 20) m.noise = 1.35;
    }
    if (this.def.breath && scoring) {
      m.noise *= 1.25 - (this.T.breathBonus ?? 0.55) * this.s;
    }
    m.ring = this.ring();
    return m;
  }
  auto(dt) {
    const u = super.auto(dt);
    if (this.skill === 'idle') return u;
    if (this.def.breath) {
      const p = this.def.breath;
      const ph = p ? (this.playT % p) / p : 0;
      u.breath = ph < 0.5;
    }
    if (this.skill === 'sloppy') {
      u.x += 0.35 * Math.sin(this.elapsed * 1.7);
      u.y += 0.35 * Math.cos(this.elapsed * 1.3);
    }
    return u;
  }
  onStep(dt, u, scoring) {
    const m = this.mods(scoring);
    this.stepDot(dt, u, m);
    if (!scoring) return;
    this.playT += dt;
    const t = this.playT;
    const inHold = t >= this.settle && t < this.settle + this.hold;
    if (!inHold) return;
    this.samples += 1;
    if (Math.hypot(this.dot.x, this.dot.y) < m.ring) this.inside += 1;
    if (this.def.breath) {
      const p = this.def.breath;
      const ph = (t % p) / p;
      const inhale = ph < 0.5;
      const correct = inhale ? !!u.breath : !u.breath;
      this.s += ((correct ? 1 : 0) - this.s) * Math.min(1, dt / 0.12);
      this.breathSum += this.s;
      this.breathN += 1;
    }
  }
  scoreStars() {
    const inRing = this.samples ? this.inside / this.samples : 0;
    if (this.def.breath && this.breathN) {
      const b = this.breathSum / this.breathN;
      this.score = 100 * (0.8 * inRing + 0.2 * b);
    } else this.score = 100 * inRing;
    super.scoreStars();
  }
}

function repTarget(u) {
  if (u < 0.4) return u / 0.4;
  if (u < 0.55) return 1;
  if (u < 0.9) return 1 - (u - 0.55) / 0.35;
  return 0;
}
function repSlope(u) {
  if (u < 0.4) return 1 / 0.4;
  if (u < 0.55) return 0;
  if (u < 0.9) return -1 / 0.35;
  return 0;
}

export class RepSim extends Sim {
  _built() {
    this.announced = this.def.reps;
    this.total = this.def.reps + 2;
    this.r = 0;
    this.err = 0;
    this.n = 0;
    this.rep = 0;
    this.gag = '';
  }
  tempo() {
    return (this.def.tempo / (this.T.repTempoScale || 1)) * (this.hard ? 0.85 : 1);
  }
  playFinished() {
    return this.playT >= this.total * this.tempo();
  }
  auto(dt) {
    const tempo = this.tempo();
    const uRep = this.playT > 0 ? (this.playT % tempo) / tempo : 0;
    const target = repTarget(uRep);
    const slope = repSlope(uRep) / tempo;
    const lag = (this.T.repLag || 0.1) * (this.def.lag || 1);
    let depth = 0;
    if (this.skill === 'expert' || this.skill === 'good') depth = clamp(target + slope * lag, 0, 1);
    else if (this.skill === 'average') depth = clamp(target * 0.75, 0, 1);
    else if (this.skill === 'sloppy') depth = clamp(target * 0.25 + 0.1, 0, 1);
    const side = this.rep % 2 === 0 ? 1 : -1;
    return { ...ZERO, depth, x: this.def.axis === 'side' ? side * depth : 0, y: this.def.axis === 'up' ? depth : -depth };
  }
  onStep(dt, u, scoring) {
    const tempo = this.tempo();
    if (scoring) this.playT += dt;
    const clock = scoring ? this.playT : this.phaseT;
    const rep = Math.min(this.total - 1, Math.floor(clock / tempo));
    if (rep !== this.rep) {
      this.rep = rep;
      const n = rep + 1;
      if (n === this.announced) this.gag = 'Last one.';
      else if (n === this.announced + 1) this.gag = 'Last one.';
      else if (n === this.announced + 2) {
        this.gag = 'I lied. This is the last one.';
        this.lied = true;
      }
    }
    const uRep = (clock % tempo) / tempo;
    const target = repTarget(uRep);
    const lag = (this.T.repLag || 0.1) * (this.def.lag || 1);
    if (u.useRate) {
      let rate = u.rate || 0;
      if (this.def.axis === 'up') rate = -rate;
      const speed = 1 / (0.4 * tempo);
      this.r = clamp(this.r + rate * speed * dt, 0, 1);
    } else {
      const depth = this.depthOf(u);
      const k = Math.min(1, dt / lag);
      this.r += (depth - this.r) * k;
    }
    const amp = (this.T.repFatigue || 0) * (rep / this.total) ** 2;
    this.r = clamp(this.r + amp * Math.sin(40 * clock) * dt * 8, 0, 1);
    if (scoring && uRep < 0.9) {
      this.err += Math.abs(this.r - target);
      this.n += 1;
    }
  }
  /** Stick down, stick sideways, or stick up. Depth alone is only the downward lean. */
  depthOf(u) {
    const axis = this.def.axis || 'down';
    if (axis === 'up') return clamp(u.y || 0, 0, 1);
    if (axis === 'side') {
      const side = this.rep % 2 === 0 ? 1 : -1;
      if (Math.abs(u.x || 0) > 1e-4) return clamp((u.x || 0) * side, 0, 1);
      return clamp(u.depth || 0, 0, 1);
    }
    return clamp(Math.max(u.depth || 0, -(u.y || 0)), 0, 1);
  }
  scoreStars() {
    const mean = this.n ? this.err / this.n : 1;
    this.score = clamp(1 - 1.6 * mean, 0, 1) * 100;
    super.scoreStars();
  }
}

export class HoopSim extends Sim {
  _built() {
    this.angle = 0;
    this.omega = 0;
    this.L = 1;
    this.rot = 0;
    this.drop = 0;
    this.theta = 0;
    this.catches = 0;
    this.throwT = 6;
    this.throw = null;
  }
  playFinished() {
    return this.playT >= 60;
  }
  dirAt(t) {
    if (t < 25) return 1;
    if (t < 50) return -1;
    return 0;
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    const speed = this.skill === 'expert' || this.skill === 'good' ? 2 : this.skill === 'average' ? 1.15 : 0.35;
    const want = this.dirAt(this.playT);
    const spin = want === 0 ? 1 : want;
    this.theta += spin * speed * Math.PI * 2 * dt;
    return { ...ZERO, x: Math.cos(this.theta), y: Math.sin(this.theta) };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    const t = scoring ? this.playT : 0;
    if (this.drop > 0) {
      this.drop -= dt;
      return;
    }
    const mag = Math.hypot(u.x, u.y);
    if (mag > 0.5) {
      const a = Math.atan2(u.y, u.x);
      let d = a - this.angle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.angle = a;
      const inst = d / Math.max(dt, 1e-4);
      const k = 1 - Math.exp(-dt / 0.25);
      this.omega += (inst - this.omega) * k;
    } else {
      this.omega += (0 - this.omega) * Math.min(1, dt / 0.25);
    }
    const rev = this.omega / (Math.PI * 2);
    const want = this.dirAt(t);
    const low = this.T.hoopLow ?? 0.9;
    const high = (this.T.hoopHigh ?? 2.4) * (this.hard ? 0.9 : 1);
    const signOk = want === 0 || rev * want > 0;
    const inBand = Math.abs(rev) >= low && Math.abs(rev) <= high && signOk;
    const wrong = want !== 0 && rev * want < -0.2;
    const lift = this.T.hoopLiftRate ?? 0.35;
    if (inBand) this.L += lift * dt;
    else if (wrong) this.L -= 0.5 * dt;
    else this.L -= 0.25 * dt;
    this.L = clamp(this.L, 0, 1.4);
    if (this.L <= 0) this.drop = 1.5;
    if (scoring && inBand) this.rot += Math.abs(rev) * dt;
    if (scoring) this.toss(dt, u, t);
  }
  toss(dt, u, t) {
    if (!this.throw && t >= this.throwT) {
      this.throw = { side: this.rand() < 0.5 ? -1 : 1, age: 0 };
      this.throwT += 9;
    }
    if (!this.throw) return;
    this.throw.age += dt;
    const left = 1.5 - this.throw.age;
    if (left < 0.4 && left > 0 && Math.abs(u.x) > 0.7 && Math.sign(u.x) === this.throw.side) {
      this.catches += 1;
      this.rot += 0.5;
      this.throw = null;
    } else if (this.throw.age >= 1.5) this.throw = null;
  }
  scoreStars() {
    this.score = this.rot;
    super.scoreStars();
  }
}

const STEP_BAR = 'L.R.L.R.LRL.R.L.R.';

export class StepSim extends Sim {
  _built() {
    this.notes = [];
    const bpm = 104;
    const step = 60 / bpm / 4;
    const bars = 32;
    let t = 0;
    for (let b = 0; b < bars; b++) {
      for (const ch of STEP_BAR) {
        if (ch === 'L' || ch === 'R') this.notes.push({ t, foot: ch, hit: false });
        t += step;
      }
    }
    this.playLen = t;
    this.p = 0;
    this.g = 0;
    this.o = 0;
    this.miss = 0;
    this.prevL = false;
    this.prevR = false;
    this.combo = 0;
  }
  playFinished() {
    return this.playT >= this.playLen + 0.2;
  }
  auto() {
    const win = 0.02;
    const late = this.skill === 'sloppy' ? 0.12 : this.skill === 'average' ? 0.08 : this.skill === 'good' ? 0.04 : 0;
    let stepL = false;
    let stepR = false;
    if (this.skill !== 'idle') {
      for (const n of this.notes) {
        if (n.hit) continue;
        const when = n.t + late;
        if (Math.abs(this.playT - when) <= win) {
          if (n.foot === 'L') stepL = true;
          else stepR = true;
        }
      }
    }
    return { ...ZERO, stepL, stepR, edgeL: stepL, edgeR: stepR };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    const judged = this.playT + (this.T.stepOffsetMs || 0) / 1000;
    const scale = (this.T.stepWindow || 1) * (this.hard ? 0.85 : 1);
    const P = 0.055 * scale;
    const G = 0.1 * scale;
    const O = 0.14 * scale;
    const edgeL = !!u.stepL && !this.prevL;
    const edgeR = !!u.stepR && !this.prevR;
    this.prevL = !!u.stepL;
    this.prevR = !!u.stepR;
    if (!scoring) return;
    if (edgeL) this.strike('L', judged, P, G, O);
    if (edgeR) this.strike('R', judged, P, G, O);
    for (const n of this.notes) {
      if (!n.hit && judged > n.t + O) {
        n.hit = true;
        this.miss += 1;
        this.combo = 0;
      }
    }
  }
  strike(foot, judged, P, G, O) {
    let best = null;
    let bestAbs = 1e9;
    for (const n of this.notes) {
      if (n.hit || n.foot !== foot) continue;
      const ad = Math.abs(judged - n.t);
      if (ad < bestAbs) {
        best = n;
        bestAbs = ad;
      }
    }
    if (!best || bestAbs > O) return;
    best.hit = true;
    if (bestAbs <= P) this.p += 1;
    else if (bestAbs <= G) this.g += 1;
    else this.o += 1;
    this.combo += 1;
  }
  scoreStars() {
    const N = this.notes.length || 1;
    this.score = (100 * (this.p + 0.7 * this.g + 0.4 * this.o)) / N;
    super.scoreStars();
  }
}

export class HeaderSim extends Sim {
  _built() {
    this.x = 0;
    this.objs = [];
    this.spawn = 0.4;
    this.score = 0;
    this.combo = 0;
    this.daze = 0;
    this.hitR = 0.2;
  }
  playFinished() {
    return this.playT >= 60;
  }
  lane() {
    return 2;
  }
  auto() {
    if (this.skill === 'idle') return { ...ZERO };
    const soon = this.objs.filter((o) => !o.done).sort((a, b) => a.land - b.land)[0];
    if (!soon) return { ...ZERO, x: -this.x * 0.5 };
    let tx = soon.x;
    const dodge = this.skill === 'expert' || this.skill === 'good' || this.skill === 'average';
    if (soon.kind === 'flip' && dodge) tx = clamp(soon.x + (soon.x < 0 ? 0.7 : -0.7), -2, 2);
    const err = tx - this.x;
    const gain = this.skill === 'sloppy' ? 0.25 : 1;
    return { ...ZERO, x: clamp(err * 2 * gain, -1, 1) };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    const t = this.playT;
    if (this.daze > 0) this.daze -= dt;
    const speed = 4.5 * (this.daze > 0 ? 0 : u.x || 0);
    this.x = clamp(this.x + speed * dt, -this.lane(), this.lane());
    if (!scoring) return;
    const span = lerp(1.3, 0.7, clamp(t / 60, 0, 1)) * (this.T.headerInterval || 1) * (this.hard ? 0.8 : 1);
    this.spawn -= dt;
    if (this.spawn <= 0 && t < 58) {
      this.spawn += span;
      const roll = this.rand();
      const kind = roll < 0.7 ? 'coco' : roll < 0.95 ? 'flip' : 'pine';
      const x = (this.rand() * 2 - 1) * 1.85;
      this.objs.push({ x, kind, land: t + 1.4, done: false });
    }
    const radius = this.hitR * (this.hard ? 0.85 : 1);
    for (const o of this.objs) {
      if (o.done || t < o.land) continue;
      o.done = true;
      const hit = Math.abs(this.x - o.x) < radius;
      if (o.kind === 'coco' && hit) {
        this.combo += 1;
        const tier = this.combo >= 20 ? 4 : this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
        this.score += 10 * tier;
      } else if (o.kind === 'pine' && hit) {
        this.combo += 1;
        this.score += 30;
      } else if (o.kind === 'flip' && hit) {
        this.score -= 10;
        this.combo = 0;
        this.daze = 0.6;
      } else if (o.kind === 'flip' && !hit) {
        /* dodged */
      }
    }
  }
  scoreStars() {
    super.scoreStars();
  }
}

export class SlackSim extends Sim {
  _built() {
    this.progress = 0;
    this.falls = 0;
    this.stun = 0;
    this.finished = false;
    this.gustT = 0;
    this.gust = 0;
    this.nextGust = 6;
    this.kevin = false;
  }
  playFinished() {
    return this.finished || this.playT >= 75;
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    const u = this.bot.read(this.dot, dt);
    const limit = this.skill === 'expert' ? 0.45 : this.skill === 'good' ? 0.45 : this.skill === 'average' ? 0.4 : 0.3;
    u.y = Math.abs(this.dot.x) < limit && this.stun <= 0 ? 0.9 : 0;
    return { ...ZERO, x: u.x, y: u.y };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    if (this.finished) return;
    const walking = (u.y || 0) > 0.3 && this.stun <= 0;
    const standInst = 1.2 / (this.T.dotInstability || 0.6);
    const walkInst = (this.T.slackWalkInst || 2.6) / (this.T.dotInstability || 0.6);
    const m = {
      inst: (walking ? walkInst : standInst) * (this.hard ? 1.1 : 1),
      noise: 1.25,
      bx: this.gust * (this.T.gustForce || 1.6),
      ring: 1,
    };
    if (this.progress >= 18 && this.progress < 24) {
      m.bx += 0.45;
      this.kevin = true;
    }
    this.stepDot(dt, { x: u.x || 0, y: 0 }, m);
    this.dot.y = 0;
    this.dot.vy = 0;
    if (this.gustT > 0) this.gustT -= dt;
    else this.gust = 0;
    if (scoring && this.stun <= 0 && walking) this.progress += 1.1 * dt;
    if (this.progress >= this.nextGust && this.gustT <= 0) {
      this.gust = this.rand() < 0.5 ? -1 : 1;
      this.gustT = 1;
      this.nextGust += 6;
    }
    if (this.stun > 0) this.stun -= dt;
    if (Math.abs(this.dot.x) > 1) {
      this.falls += 1;
      this.stun = 1.2;
      this.dot.x = 0;
      this.dot.vx = 0;
      this.progress = this.progress >= 20 ? 20 : this.progress >= 10 ? 10 : 0;
      this.nextGust = this.progress + 6;
    }
    if (this.progress >= 30) this.finished = true;
  }
  scoreStars() {
    this.seconds = this.playT;
    if (!this.finished) {
      this.stars = 0;
      this.score = Math.round(this.progress * 10);
      return;
    }
    const time = this.playT;
    if (this.falls === 0 && time < 32) this.stars = 3;
    else if (this.falls <= 1 && time < 45) this.stars = 2;
    else this.stars = 1;
    if (this.hard && this.stars === 3 && time >= 30) this.stars = 2;
    this.score = 1000 - 60 * this.falls - 8 * (time - 27);
  }
}

export const TRAY_BOARDS = [
  {
    id: 'straight',
    lanes: [
      { z: -1.35, color: 'R', xs: [-1.5, -0.9], cup: 1.45 },
      { z: -0.45, color: 'B', xs: [-1.5, -0.9], cup: 1.45 },
      { z: 0.45, color: 'Y', xs: [-1.5, -0.9], cup: 1.45 },
      { z: 1.35, color: 'R', xs: [-1.5, -0.9], cup: 1.45 },
    ],
  },
  {
    id: 'split',
    lanes: [
      { z: -1.35, color: 'B', xs: [-1.6, -0.7], cup: 1.4 },
      { z: -0.45, color: 'Y', xs: [-1.2, -0.5], cup: 1.45 },
      { z: 0.45, color: 'R', xs: [-1.7, -1.0], cup: 1.35 },
      { z: 1.35, color: 'B', xs: [-1.4, -0.8], cup: 1.5 },
    ],
  },
  {
    id: 'wide',
    lanes: [
      { z: -1.5, color: 'Y', xs: [-1.7, -1.1, -0.6], cup: 1.4 },
      { z: -0.5, color: 'R', xs: [-1.5, -0.8], cup: 1.45 },
      { z: 0.5, color: 'B', xs: [-1.6, -0.9], cup: 1.4 },
      { z: 1.5, color: 'Y', xs: [-1.3, -0.6], cup: 1.5 },
    ],
  },
];

export class TraySim extends Sim {
  _built() {
    this.tiltX = 0;
    this.tiltZ = 0;
    this.wishX = 0;
    this.wishZ = 0;
    this.items = [];
    const board = TRAY_BOARDS.find((b) => b.id === this.opts.board) || TRAY_BOARDS[0];
    this.boardId = board.id;
    for (const lane of board.lanes) {
      for (const x of lane.xs) {
        this.items.push({
          color: lane.color,
          x,
          z: lane.z,
          vx: 0,
          vz: 0,
          cupX: lane.cup,
          cupZ: lane.z,
          homeX: x,
          homeZ: lane.z,
          done: false,
          wait: 0,
        });
      }
    }
    this.got = 0;
    this.bad = 0;
  }
  playFinished() {
    return this.playT >= 60 || this.items.every((v) => v.done);
  }
  auto() {
    if (this.skill === 'idle') return { ...ZERO };
    const open = this.items.filter((v) => !v.done && v.wait <= 0);
    if (!open.length) return { ...ZERO };
    open.sort((a, b) => Math.abs(a.cupX - a.x) - Math.abs(b.cupX - b.x));
    const v = open[0];
    const dx = v.cupX - v.x;
    const dz = v.cupZ - v.z;
    const gain = this.skill === 'sloppy' ? 0.15 : this.skill === 'average' ? 0.45 : 1;
    return { ...ZERO, x: clamp(dx * gain, -1, 1), y: clamp(dz * gain, -1, 1) };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    const max = (this.T.trayMaxTilt || 14) * (Math.PI / 180);
    this.wishX += ((u.x || 0) * max - this.wishX) * Math.min(1, dt / 0.12);
    this.wishZ += ((-(u.y || 0)) * max - this.wishZ) * Math.min(1, dt / 0.12);
    this.tiltX = this.wishX;
    this.tiltZ = this.wishZ;
    const g = this.T.trayGravity || 9.8;
    const ax = Math.sin(this.tiltX) * g;
    const az = Math.sin(this.tiltZ) * g;
    for (const v of this.items) {
      if (v.done) continue;
      if (v.wait > 0) {
        v.wait -= dt;
        continue;
      }
      v.vx += ax * dt;
      v.vz += az * dt;
      v.vx *= Math.exp(-dt * 1.4);
      v.vz *= Math.exp(-dt * 1.4);
      v.x += v.vx * dt;
      v.z += v.vz * dt;
      if (v.x < -1.8) {
        v.x = -1.8;
        v.vx *= -0.2;
      }
      if (v.x > 1.8) {
        v.x = 1.8;
        v.vx *= -0.2;
      }
      const wall = v.homeZ;
      if (Math.abs(v.z - wall) > 0.28) {
        v.z = wall + Math.sign(v.z - wall) * 0.28;
        v.vz *= -0.2;
      }
      if (Math.hypot(v.x - v.cupX, v.z - v.cupZ) < 0.3 && v.x > 1.05) {
        v.done = true;
        this.got += 1;
        v.vx = 0;
        v.vz = 0;
      }
    }
  }
  scoreStars() {
    const max = this.items.length * 10;
    const raw = this.got * 10 - this.bad * 3;
    this.score = max ? (100 * Math.max(0, raw)) / max : 0;
    super.scoreStars();
  }
}

export class JogSim extends Sim {
  _built() {
    this.cadence = 0;
    this.side = 'L';
    this.badSide = 0;
    this.bandT = 0;
    this.stitch = 0;
    this.over = 0;
    this.lateral = 0;
    this.dist = 0;
    this.cups = [];
    for (let i = 0; i < 18; i++) this.cups.push({ at: 12 + i * 11, x: i % 2 === 0 ? -0.8 : 0.8, got: false });
    this.got = 0;
    this.pulse = 0;
    this.nextFoot = 'L';
  }
  playFinished() {
    return this.playT >= 70;
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    const target = this.T.jogTargetCadence || 3;
    const rate = this.skill === 'sloppy' ? 1.2 : this.skill === 'average' ? 2.2 : this.skill === 'good' ? target : target;
    this.pulse += dt;
    const period = 1 / Math.max(0.5, rate);
    let stepL = false;
    let stepR = false;
    if (this.pulse >= period) {
      this.pulse -= period;
      if (this.nextFoot === 'L') stepL = true;
      else stepR = true;
      this.nextFoot = this.nextFoot === 'L' ? 'R' : 'L';
    }
    const upcoming = this.cups.find((c) => !c.got && c.at >= this.dist - 1);
    let x = 0;
    if (upcoming) x = clamp((upcoming.x - this.lateral) * 1.4, -1, 1);
    return { ...ZERO, x, stepL, stepR, edgeL: stepL, edgeR: stepR };
  }
  onStep(dt, u, scoring) {
    if (scoring) this.playT += dt;
    const edgeL = !!u.edgeL || (!!u.stepL && !this.prevL);
    const edgeR = !!u.edgeR || (!!u.stepR && !this.prevR);
    this.prevL = !!u.stepL;
    this.prevR = !!u.stepR;
    let stepped = false;
    if (edgeL) {
      if (this.side === 'L') this.badSide += 1;
      this.side = 'L';
      stepped = true;
    }
    if (edgeR) {
      if (this.side === 'R') this.badSide += 1;
      this.side = 'R';
      stepped = true;
    }
    if (edgeL && edgeR) stepped = true;
    const target = this.T.jogTargetCadence || 3;
    if (stepped && scoring) this.cadence += (target * 0 + 1 / Math.max(dt, 0.05) - this.cadence) * 0.0;
    if (scoring && stepped) {
      this.stepTimes = this.stepTimes || [];
      this.stepTimes.push(this.playT);
    }
    if (scoring) {
      const times = this.stepTimes || [];
      const recent = times.filter((t) => this.playT - t < 2);
      this.cadence = recent.length / 2;
      const lo = target - 0.6;
      const hi = target + 0.6;
      let speed = 3;
      if (this.cadence >= lo && this.cadence <= hi) {
        this.bandT += dt;
        speed = 3;
        this.over = 0;
      } else {
        speed = 2;
        if (this.cadence > hi) this.over += dt;
        else this.over = 0;
      }
      if (this.over > 2) this.stitch = 3;
      if (this.stitch > 0) {
        this.stitch -= dt;
        speed *= 0.5;
      }
      if (this.badSide && edgeL && this.side === 'L') speed = Math.max(0, speed - 0.5);
      this.dist += speed * dt;
      this.lateral = clamp(this.lateral + (u.x || 0) * 2.2 * dt, -1.5, 1.5);
      for (const c of this.cups) {
        if (!c.got && this.dist >= c.at && this.dist - speed * dt < c.at + 0.6) {
          if (Math.abs(this.lateral - c.x) < 0.55) {
            c.got = true;
            this.got += 1;
          }
        }
      }
    }
  }
  scoreStars() {
    const pace = this.playT > 0 ? this.bandT / this.playT : 0;
    const cups = this.got / this.cups.length;
    this.score = 70 * pace * 100 / 100 * 1 + 30 * cups;
    this.score = 70 * pace + 30 * cups;
    if (this.score <= 1) this.score *= 100;
    else this.score = 70 * (pace * 100) / 100 + 30 * cups;
    this.score = 70 * pace + 30 * cups;
    // pace and cups are 0..1. The published score is on a 0..100 scale.
    this.score = 100 * (0.7 * pace + 0.3 * cups);
    super.scoreStars();
  }
}

export class PierSim extends Sim {
  _built() {
    this.attempt = 0;
    this.best = 0;
    this.phaseLocal = 'run';
    this.localT = 0;
    this.zoneT = 0;
    this.speed = 6;
    this.pressed = false;
    this.flightIn = 0;
    this.flightN = 0;
    this.cannon = false;
    this.attemptT = 0;
  }
  playFinished() {
    return this.attempt >= 3;
  }
  botTarget() {
    if (this.phaseLocal === 'run') return { x: 0, y: -0.6 };
    return { x: 0, y: 0 };
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    const u = this.bot.read(this.dot, dt);
    const tight = this.skill === 'expert' || this.skill === 'good';
    if (this.phaseLocal === 'run' && tight) {
      const y = this.dot.y;
      if (y > -0.48) u.y = -1;
      else if (y < -0.74) u.y = 1;
      else u.y = clamp((-0.62 - y) * 8 - this.dot.vy * 2, -1, 1);
      u.x = clamp(-this.dot.x * 6 - this.dot.vx, -1, 1);
    } else if (this.phaseLocal === 'run' && this.dot.y > -0.45) {
      u.y = Math.min(u.y, -0.85);
    }
    if (this.phaseLocal === 'flight' && tight) {
      u.x = clamp(-this.dot.x * 8 - this.dot.vx * 2, -1, 1);
      u.y = clamp(-this.dot.y * 8 - this.dot.vy * 2, -1, 1);
    }
    const lip = this.phaseLocal === 'run' && this.localT >= 5 - dt - 1e-4 && this.localT < 5;
    const press = tight && lip;
    return { ...ZERO, x: u.x, y: u.y, confirm: press };
  }
  onStep(dt, u, scoring) {
    if (!scoring) return;
    this.playT += dt;
    this.localT += dt;
    this.attemptT += dt;
    if (this.phaseLocal === 'run') {
      const inZone = this.dot.y < -0.4 && this.dot.y > -0.8;
      if (inZone) this.zoneT += dt;
      const m = { noise: 1, inst: 1, ring: 0.5 };
      this.stepDot(dt, u, m);
      if (u.confirm && !this.pressed && this.localT > 4.2) {
        this.pressed = true;
        this.lipDt = Math.abs(this.localT - 5);
      }
      if (this.localT >= 5) {
        this.speed = 6 + 8 * clamp(this.zoneT / 5, 0, 1);
        this.phaseLocal = 'flight';
        this.localT = 0;
        this.flightIn = 0;
        this.flightN = 0;
        const p = this.pressed ? clamp(1 - (this.lipDt || 0.25) / 0.25, 0, 1) : 0;
        this.p = p;
        // The run ends in a crouch. The flight is a fresh balance.
        this.dot.x = 0;
        this.dot.y = 0;
        this.dot.vx = 0;
        this.dot.vy = 0;
        this.dot.ux = 0;
        this.dot.uy = 0;
      }
    } else if (this.phaseLocal === 'flight') {
      const ring = this.ringOf(0.45);
      const m = { inst: 3, noise: 1, ring };
      this.stepDot(dt, u, m);
      this.flightN += 1;
      if (Math.hypot(this.dot.x, this.dot.y) < ring) this.flightIn += 1;
      if (u.confirm && this.localT > 3) this.cannon = true;
      if (this.localT >= 3.5) {
        const ringFrac = this.flightN ? this.flightIn / this.flightN : 0;
        const dist = this.speed * (0.8 + 0.6 * (this.p || 0)) * (0.6 + 0.4 * ringFrac) * (this.T.pierBoost || 2.14);
        this.lastJump = { speed: this.speed, p: this.p || 0, ringFrac, dist, zone: this.zoneT };
        (this.jumps ||= []).push(this.lastJump);
        if (dist > this.best) this.best = dist;
        this.attempt += 1;
        this.phaseLocal = 'run';
        this.localT = 0;
        this.zoneT = 0;
        this.pressed = false;
        this.speed = 6;
        this.p = 0;
        this.dot.x = 0;
        this.dot.y = 0;
        this.dot.vx = 0;
        this.dot.vy = 0;
      }
    }
  }
  scoreStars() {
    this.score = this.best;
    super.scoreStars();
  }
}

export const LONG_EVENTS = [
  { t: 0, ring: 0.4, say: 'Stand.' },
  { t: 10, bias: 0.1 },
  { t: 20, impulse: -0.6 },
  { t: 30, ring: 0.34 },
  { t: 35, noise: 1.2 },
  { t: 45, say: 'Ignore her.' },
  { t: 50, ring: 0.28 },
  { t: 55, drift: true },
  { t: 65, shake: true },
  { t: 75, ring: 0.24, noise: 1, swell: true },
  { t: 85, bias: 0, impulse: 0.35 },
  { t: 90, say: 'You may blink.' },
];

export class LongSim extends StillSim {
  _built() {
    super._built();
    this.hold = 90;
    this.settle = 0;
    this.release = 0;
    this.ringNow = 0.4;
    this.bias = 0;
    this.noiseMul = 1;
    this.fired = new Set();
    this.says = [];
  }
  playFinished() {
    return this.playT >= 90;
  }
  ring() {
    return this.ringOf(this.ringNow);
  }
  mods() {
    return { noise: this.noiseMul, inst: 1, bx: this.bias, by: 0, ring: this.ring() };
  }
  onStep(dt, u, scoring) {
    if (scoring) {
      this.playT += dt;
      for (const ev of LONG_EVENTS) {
        if (this.playT >= ev.t && !this.fired.has(ev.t)) {
          this.fired.add(ev.t);
          if (ev.ring) this.ringNow = ev.ring;
          if (ev.bias !== undefined) this.bias = ev.bias;
          if (ev.noise) this.noiseMul = ev.noise;
          if (ev.impulse) this.dot.vy += ev.impulse;
          if (ev.shake) this.dot.vx += (this.rand() - 0.5) * 0.8;
          if (ev.say) this.says.push(ev.say);
        }
      }
    }
    const m = this.mods();
    this.stepDot(dt, u, m);
    if (!scoring) return;
    this.samples += 1;
    if (Math.hypot(this.dot.x, this.dot.y) < m.ring) this.inside += 1;
  }
}

export class WeighSim {
  constructor(kind, opts) {
    this.kind = kind;
    this.T = opts.tunables;
    this.rand = opts.rand;
    this.skill = opts.skill || 'idle';
    this.dot = new Dot(opts.rand);
    this.bot = new BotDriver(this.skill, opts.botRand || opts.rand, () => this.target());
    this.t = 0;
    this.done = false;
    this.Tscore = 0;
    this.samples = [];
    this.hold = 0;
    this.hit = 0;
    this.idx = 0;
    this.targets = [
      { x: -0.7, y: 0 },
      { x: 0.7, y: 0 },
      { x: 0, y: 0.55 },
    ];
  }
  target() {
    if (this.kind === 'lean') return this.targets[Math.min(this.idx, 2)];
    if (this.kind === 'chase') {
      return { x: 0.42 * Math.sin(0.7 * this.t), y: 0.32 * Math.sin(1.05 * this.t + 0.4) };
    }
    return { x: 0, y: 0 };
  }
  auto(dt) {
    if (this.skill === 'idle') return { ...ZERO };
    return { ...ZERO, ...this.bot.read(this.dot, dt) };
  }
  step(dt, input) {
    if (this.done) return;
    const u = input || { ...ZERO };
    this.t += dt;
    this.dot.step(dt, u.x || 0, u.y || 0, this.T, {});
    if (this.kind === 'still') {
      if (this.t > 3 && this.t < 14) this.samples.push(Math.hypot(this.dot.x, this.dot.y) < 0.3 ? 1 : 0);
    } else if (this.kind === 'lean') {
      const tgt = this.targets[this.idx];
      if (tgt && Math.hypot(this.dot.x - tgt.x, this.dot.y - tgt.y) < 0.1) this.hold += dt;
      else this.hold = Math.max(0, this.hold - dt * 0.5);
      if (this.hold >= 1.5 && this.idx < 3) {
        this.hit += 1;
        this.idx += 1;
        this.hold = 0;
      }
    } else if (this.t > 1) {
      const tgt = this.target();
      this.samples.push(Math.hypot(this.dot.x - tgt.x, this.dot.y - tgt.y));
    }
    if (this.t >= 14) this.finish();
  }
  finish() {
    this.done = true;
    if (this.kind === 'still') this.Tscore = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0;
    else if (this.kind === 'lean') this.Tscore = this.hit / 3;
    else {
      const mean = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 1;
      this.Tscore = clamp(1 - mean * 2, 0, 1);
    }
  }
}

const KINDS = {
  still: StillSim,
  reps: RepSim,
  hoop: HoopSim,
  step: StepSim,
  header: HeaderSim,
  slack: SlackSim,
  tray: TraySim,
  jog: JogSim,
  pier: PierSim,
  long: LongSim,
};

export function createSim(id, opts) {
  const def = typeof id === 'string' ? ACTIVITY_BY_ID[id] : id;
  if (!def) throw new Error('unknown activity ' + id);
  const Ctor = KINDS[def.kind];
  if (!Ctor) throw new Error('unknown kind ' + def.kind);
  return new Ctor(def, opts);
}

export function simulate(id, opts) {
  const sim = createSim(id, opts);
  const dt = 1 / 60;
  let guard = 0;
  while (!sim.done && guard < 60 * 200) {
    const u = sim.auto(dt);
    sim.step(dt, u);
    guard += 1;
  }
  return sim;
}
