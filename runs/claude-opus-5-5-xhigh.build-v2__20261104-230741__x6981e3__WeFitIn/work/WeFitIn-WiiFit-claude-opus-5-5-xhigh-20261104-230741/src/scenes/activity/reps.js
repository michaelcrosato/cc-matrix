// The Rep Shed. You scrub the animation with the stick.
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { CLIP_NAMES } from '../../art/clips.js';
import { REPS, EXTRA_REPS, REP_SHAPE } from '../../data/reps.js';
import { line, panel, ring as ringLine } from '../../ui/widgets.js';
import { sayCentered } from '../../ui/font.js';
import { LaneEvent, worldToArt } from './events.js';
import { LaneActivity } from './lanes.js';
import { shedSet } from '../sets.js';

export function repTarget(u) {
  const { up, hold, down } = REP_SHAPE;
  if (u < up) return u / up;
  if (u < up + hold) return 1;
  if (u < up + hold + down) return 1 - (u - up - hold) / down;
  return 0;
}

export class RepsEvent extends LaneEvent {
  kind = 'reps';
  lead = 1.2;

  constructor(scene, lanes, rng, opts) {
    super(scene, lanes, rng, opts);
    this.repId = opts.rep;
    this.data = REPS[opts.rep];
    this.announced = opts.reps ?? this.data.reps;
    this.extra = opts.extra ?? EXTRA_REPS;
    this.total = this.announced + this.extra;
    this.baseTempo = this.data.tempo * (this.hard.tempo ?? 1);
    this.duration = opts.duration ?? this.lead + this.total * this.baseTempo * T.repTempoScale + 0.4;
  }

  get tempo() { return this.baseTempo * T.repTempoScale; }

  beginLane(l) {
    l.state = { r: 0, rVis: 0, rep: 0, err: 0, n: 0, sum: 0, count: 0, grade: null, gradeT: 0, lastRep: -1, botR: 0, phase: l.rand() * 6 };
    l.score = 0;
    l.avatar?.scrub(this.data.clip, 0);
  }

  repAt(t) { return Math.floor((t - this.lead) / this.tempo); }

  targetAt(t) {
    const tt = t - this.lead;
    if (tt < 0) return 0;
    const rep = Math.floor(tt / this.tempo);
    if (rep >= this.total) return 0;
    return repTarget((tt % this.tempo) / this.tempo);
  }

  side(rep) { return rep % 2 === 0 ? 1 : -1; }

  /** Stick to rep depth, 0..1. */
  mapInput(inp, rep) {
    switch (this.data.input) {
      case 'down': return Math.max(0, -inp.y);
      case 'up': return Math.max(0, inp.y);
      default: return Math.max(0, inp.x * this.side(rep));
    }
  }

  stepLane(ctx, lane, inp, dt, t, scoring) {
    const st = lane.state;
    const rep = Math.max(0, this.repAt(t));
    const lag = T.repLag * (this.data.lagScale ?? 1);
    if (inp.rate) {
      // Keys use rate control: S/W move r at the target speed, no key holds it.
      const speed = 1 / (REP_SHAPE.up * this.tempo);
      const v = this.data.input === 'down' ? -inp.y : this.data.input === 'up' ? inp.y : inp.x * this.side(rep);
      if (Math.abs(v) > 0.3) st.r = Math.max(0, Math.min(1, st.r + Math.sign(v) * speed * dt));
    } else {
      st.r += (this.mapInput(inp, rep) - st.r) * Math.min(1, dt / lag);
    }
    const fatigue = T.repFatigue * (this.hard.fatigue ?? 1) * (rep / this.total) ** 2;
    st.rVis = Math.max(0, Math.min(1, st.r + fatigue * Math.sin(t * 19 + st.phase)));
    if (t < this.lead || rep >= this.total) return;
    if (rep !== st.lastRep) {
      if (st.lastRep >= 0 && scoring) this.closeRep(lane);
      st.lastRep = rep;
      if (lane.isLocal) this.scene.onRep?.(rep, this.announced);
    }
    if (scoring) { st.err += Math.abs(st.rVis - this.targetAt(t)); st.n++; lane.score = this.scoreOf(lane); }
  }

  closeRep(lane) {
    const st = lane.state;
    const q = st.n ? Math.max(0, 1 - 1.6 * (st.err / st.n)) : 0;
    st.sum += q; st.count++;
    st.err = 0; st.n = 0;
    st.grade = q >= 0.85 ? 'Perfect' : q >= 0.65 ? 'Good' : 'Wobbly';
    st.gradeT = 0.9;
    lane.score = this.scoreOf(lane);
    if (lane.isLocal) {
      App.sfx(q >= 0.85 ? 'repPerfect' : 'repTick');
      if (q >= 0.85) this.ctx.particles.burst('sweat', [lane.x, 1.5, lane.z]);
    }
  }

  /** The last rep is closed by the end of the event. */
  finishLane(lane) { if (lane.state.n > 0) this.closeRep(lane); }

  botInput(lane, out, dt, t, brain) {
    out.x = out.y = 0;
    if (!brain.p) return;
    const play = brain.play;
    const rep = Math.max(0, this.repAt(t));
    const st = lane.state;
    // People anticipate a curve they can see; how well is the skill.
    const LOOK = { sloppy: -0.18, average: 0.02, good: 0.13, expert: 0.2 };
    const DEPTH = { sloppy: 0.62, average: 0.84, good: 0.95, expert: 1 };
    const seen = this.targetAt(t + (LOOK[brain.skill] ?? 0)) * (DEPTH[brain.skill] ?? 1);
    st.botR += (seen + Math.sin(t * 2.2 + st.phase) * play.wander * 0.5 - st.botR) * Math.min(1, dt / 0.08);
    const v = Math.max(0, Math.min(1, st.botR));
    if (this.data.input === 'down') out.y = -v;
    else if (this.data.input === 'up') out.y = v;
    else out.x = v * this.side(rep);
  }

  scoreOf(lane) {
    const st = lane.state;
    const n = st.count + (st.n ? 1 : 0);
    if (!n) return 0;
    const open = st.n ? Math.max(0, 1 - 1.6 * (st.err / st.n)) : 0;
    return 100 * ((st.sum + open) / n);
  }

  clipFor(rep) {
    if (this.data.input === 'sides' && this.side(rep) < 0) return this.data.clipLeft;
    return this.data.clip;
  }

  ghostScrubs(name) { return ['SquatRep', 'LungeRep', 'LungeRepL', 'Press'].includes(name); }
  clipState(lane) {
    const rep = Math.max(0, this.repAt(this.lastT ?? 0));
    return [CLIP_NAMES.indexOf(this.clipFor(rep)), lane.state.rVis];
  }

  visual(ctx, dt, t) {
    this.lastT = t;
    const rep = Math.max(0, this.repAt(t));
    for (const lane of this.lanes) {
      if (!lane.avatar || lane.gone) continue;
      if (lane.ghost) { this.ghostVisual(lane, dt); continue; }
      if (!lane.frozenClip) lane.avatar.scrub(this.clipFor(rep), lane.state.rVis);
      lane.avatar.update(dt);
    }
  }

  draw(ctx, t) {
    const { hud } = ctx;
    for (const lane of this.lanes) {
      if (!lane.isLocal || lane.gone) continue;
      const st = lane.state;
      const small = this.lanes.length >= 4;
      const rep = Math.max(0, this.repAt(t));
      const target = this.targetAt(t);
      let cx, cy, len;
      if (small) { const p = worldToArt(ctx, lane.x, 2.2, lane.z); cx = Math.round(p.x); cy = Math.max(46, Math.round(p.y) - 20); len = 40; } else { cx = Math.round(hud.width / 2); cy = 56; len = 84; }
      lane.dial = { x: cx, y: cy };
      const mouse = App.device.last === 'mouse' && lane.driver.kind !== 'pad' && !App.dev.autopilot ? App.device.pointerArt(ctx) : null;
      if (this.data.input === 'sides') {
        // A horizontal track: the marker goes out to the side it wants.
        const w = small ? 64 : 180, h = 16;
        panel(hud, cx - w / 2, cy - h / 2, w, h, { fill: 'white', name: 'track' });
        hud.rect(cx - 1, cy - h / 2, 2, h, 'mist');
        const s = this.side(rep);
        const half = w / 2 - 5;
        const tx = cx + s * target * half;
        hud.rect(Math.round(tx) - 4, cy - h / 2, 8, h, 'orange');
        const you = cx + s * st.rVis * half;
        hud.rect(Math.round(you) - 3, cy - h / 2 + 2, 6, h - 4, 'red');
        const arrow = s > 0 ? '>' : '<';
        sayCentered(hud, cx + s * (w / 2 + 8), cy - 4, arrow, { scale: 1, color: 'sand', name: 'track-arrow' });
      } else {
        // A vertical track. Squats go down, presses go up.
        const w = small ? 14 : 22;
        const dir = this.data.input === 'down' ? 1 : -1;
        panel(hud, cx - w / 2, cy - len / 2, w, len, { fill: 'white', name: 'track' });
        const base = dir > 0 ? cy - len / 2 + 4 : cy + len / 2 - 4;
        const span = len - 8;
        hud.rect(cx - w / 2, Math.round(base + dir * target * span) - 4, w, 8, 'orange');
        hud.rect(cx - w / 2 + 2, Math.round(base + dir * st.rVis * span) - 3, w - 4, 6, 'red');
      }
      if (mouse) { line(hud, cx, cy, mouse.x, mouse.y, 'mist', 1); ringLine(hud, mouse.x, mouse.y, 3, 1, 'ink'); }
      if (st.gradeT > 0) sayCentered(hud, small ? cx : cx + 62, small ? cy + 26 : cy - 4, st.grade, { scale: small ? 1 : 2, color: st.grade === 'Perfect' ? 'lime' : st.grade === 'Good' ? 'sand' : 'white', name: 'grade' });
      st.gradeT -= 1 / 60;
    }
  }
}

export class RepsActivity extends LaneActivity {
  makeEvent(lanes, rng, hard) { return new RepsEvent(this, lanes, rng, { rep: this.def.rep, hard }); }

  async dress(ctx) {
    this.set = shedSet(ctx);
    await this.addCoach(ctx, { at: [3.5, 0, -1.2], yaw: -0.45, clip: 'Watch' });
    this.lastGag = -1;
  }

  /** "Last one." Then "Last one." Then "I lied. This is the last one." */
  onRep(rep, announced) {
    if (rep === this.lastGag || this.attractMode) return;
    this.lastGag = rep;
    if (rep === announced - 1 || rep === announced) App.say('coach', 'Last one.');
    if (rep === announced + 1) App.say('coach', 'I lied. This is the last one.');
  }

  result() {
    return super.result();
  }

  onOutroStart() {
    for (const l of this.lanes) this.event.finishLane(l);
    super.onOutroStart();
  }

  fingerprint() { const l = this.playerLane; return l ? `${l.state.sum.toFixed(5)}|${l.state.r.toFixed(5)}` : ''; }
  overlayDot() { const l = this.playerLane; return l ? `r ${l.state.rVis.toFixed(2)} rep ${l.state.rep}` : '-'; }
  dispose() { this.set?.stop?.(); this.set?.mirror?.dispose?.(); }
}
