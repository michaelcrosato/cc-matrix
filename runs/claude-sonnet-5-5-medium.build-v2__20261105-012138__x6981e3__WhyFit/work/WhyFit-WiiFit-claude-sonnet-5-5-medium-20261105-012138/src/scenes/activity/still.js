// Holding Still: keep the Dot in the ring. Settle 4 s (unscored), hold, release 2 s. Breath calms the Dot.
import { LaneActivity } from './lane.js';
import { POSES } from '../../data/poses.js';
import { T } from '../../core/tunables.js';
import { bar, panel } from '../../ui/widgets.js';
import { say } from '../../ui/font.js';
import { BARKS, pick } from '../../data/lines.js';

export const SETTLE = 4, RELEASE = 2;
export class StillActivity extends LaneActivity {
  constructor(app, args) { super(app, args); this.P = args.pose ?? POSES[args.id]; this.holdSecs = this.args.hold ?? this.P?.hold ?? 25; }
  get duration() { return SETTLE + this.holdSecs + RELEASE; }
  goal() { return this.P.breath ? 'Hold the pose. Keep the Dot in the ring. Breathe with the bar: it calms you.' : 'Hold the pose. Keep the Dot in the ring. The Dot has opinions.'; }
  controls() { return this.P.breath ? [['lean', 'Lean'], ['breath', 'Breathe in']] : [['lean', 'Lean']]; }
  howto() { return this.goal() + ' First 4 seconds do not count.'; }
  async stageExtra() {
    for (const l of this.lanes) { l.st = { in: 0, t: 0, inT: 0, was: true, s: 0, bm: 0, bt: 0, outT: 0 }; }
    this.coach.play(this.P.clip);
  }
  resetLanes() { for (const l of this.lanes) l.st = { in: 0, t: 0, inT: 0, was: true, s: 0, bm: 0, bt: 0, outT: 0 }; this.hT = 0; }
  segment() { const t = this.phase === 'play' ? this.playT : (this.phaseT % 12); if (this.phase === 'practice') return 'hold'; return t < SETTLE ? 'settle' : t < SETTLE + this.holdSecs ? 'hold' : 'release'; }
  ringBase() { return this.P.ring; }
  currentRing() { return this.ringOf(this.ringBase()); }
  tAt() { return this.phase === 'play' ? this.playT : this.phaseT; }
  /** Modifiers the pose's twist gives the Dot at time t. Overridable (the Long Stand uses a timeline). */
  mods(l, t) {
    const P = this.P, m = { noise: 1 };
    const ph = l.idx * 1.7, hold = Math.max(0, t - SETTLE);
    if (P.twist === 'bias') { const w = Math.sin(hold * 0.45 + ph), w2 = Math.cos(hold * 0.31 + ph); if (P.biasAxis !== 'y') m.bx = P.biasAmp * w * T.gustForce / 1.6 * 1.1; if (P.biasAxis === 'both') m.by = P.biasAmp * w2 * T.gustForce / 1.6; }
    else if (P.twist === 'noiseY') m.noiseY = P.noiseY;
    else if (P.twist === 'ramp') m.noise = P.ramp[0] + (P.ramp[1] - P.ramp[0]) * Math.min(1, hold / this.holdSecs);
    else if (P.twist === 'inst') { m.inst = P.inst; if (hold > P.tremorAfter) m.noise = 1.3; }
    if (this.hard) m.noise *= 1.1;
    return m;
  }
  breathTarget(t) { const per = this.P.breath; if (!per) return false; return (t % per) < per / 2; }
  laneStep(l, inp, dt, practice) {
    const t = this.tAt(), st = l.st, seg = this.segment();
    const m = this.mods(l, t);
    if (this.P.breath) {
      if (l.kind === 'bot') { const err = (l.idx * 0.37 + Math.sin(t * 0.7 + l.idx)) * 0.25; l.driver.extra.breath = this.breathTarget(t - err); }
      const match = !!inp.breath === this.breathTarget(t);
      st.s += ((match ? 1 : 0) - st.s) * Math.min(1, dt * 1.6);
      m.noise = (m.noise ?? 1) * (1.25 - T.breathBonus * st.s);
    }
    l.driver.tx = 0; l.driver.ty = 0;
    this.stepDot(l, inp, dt, m);
    const ringR = this.ringOf(this.ringBase()), inside = Math.hypot(l.dot.x, l.dot.y) <= ringR;
    if (inside) { st.inT += dt; st.outT = 0; } else { st.inT = 0; st.outT += dt; }
    if (l.kind === 'local') {
      if (inside && !st.was) { this.app.sfx('chimeIn', { volume: 0.7 }); }
      if (!inside && st.was) { this.app.sfx('chimeOut', { volume: 0.6 }); }
      if (st.outT > 1.5 && !st.barked && this.phase !== 'countdown') { st.barked = true; this.bark('ounce', pick(BARKS.ringOut, this.app.rng('b'))); }
      if (inside) st.barked = false;
      if (st.inT > 5 && !st.praised && seg === 'hold') { st.praised = true; this.bark('ounce', pick(BARKS.ringIn, this.app.rng('b'))); }
      if (!inside) st.praised = false;
    }
    st.was = inside;
    if (seg === 'hold' && this.phase === 'play') { st.t += dt; if (inside) st.in += dt; if (this.P.breath) { st.bt += dt; if (!!inp.breath === this.breathTarget(t)) st.bm += dt; } }
    l.score = this.laneScore(l);
  }
  laneScore(l) {
    const st = l.st, f = st.t > 0 ? st.in / st.t : 0;
    if (this.P.breath) { const b = st.bt > 0 ? st.bm / st.bt : 0; return 100 * (0.8 * f + 0.2 * b); }
    return 100 * f;
  }
  scoreNow() { return this.me.score; }
  extraFrame(ctx, dt) { const me = this.me, c = ctx.camera.camera; this.pushIn = Math.max(0, Math.min(1, (this.pushIn ?? 0) + ((me?.st.inT ?? 0) > 3 && this.phase === 'play' ? dt * 0.2 : -dt * 0.5))); const q = Math.round(this.pushIn * 6); if (q !== this.pq && this.camera) { this.pq = q; const cfg = this.camera; try { ctx.engine.setCamera({ ...cfg, fov: cfg.fov - 3 * q / 6 }, { syncUrl: false }); } catch { /* */ } } }
  poseLane(l) { const seg = this.segment(); if (this.phase === 'intro' || this.phase === 'countdown') l.avatar.play('Idle'); else l.avatar.play(this.P.clip, { fade: 0.5 }); }
  laneLabel(l) { return this.phase === 'play' ? `${Math.round(l.score)}%` : ''; }
  drawPlay(hud) {
    const seg = this.segment(), w = hud.width;
    this.drawTags(hud);
    this.drawDials(hud, this.ringOf(this.ringBase()));
    say(hud, 12, 12, this.A.name, { color: 'white' });
    const total = this.phase === 'play' ? this.duration - this.playT : 0;
    say(hud, w - 12, 12, `${Math.ceil(total)}s`, { anchor: 'r', color: 'white', scale: 2 });
    say(hud, w - 12, 30, seg === 'settle' ? 'Settle in' : seg === 'hold' ? 'Hold' : 'Release', { anchor: 'r', color: seg === 'hold' ? 'lime' : 'sand' });
    say(hud, 12, 24, `${Math.round(this.me.score)}%`, { color: 'sand', scale: 2 });
    if (this.P.breath) this.drawBreath(hud);
  }
  drawBreath(hud) {
    const t = this.tAt(), per = this.P.breath, ph = (t % per) / per;
    const lvl = ph < 0.5 ? ph * 2 : 2 - ph * 2, w = 140, x = Math.floor((hud.width - w) / 2), y = hud.height - 46;
    panel(hud, x - 6, y - 14, w + 12, 28, { shadow: false });
    say(hud, hud.width / 2, y - 10, ph < 0.5 ? 'In...' : 'Out...', { anchor: 'c', color: 'ink', shadow: false });
    bar(hud, x, y + 2, w, 6, lvl, { fill: this.me.inp.breath ? 'lime' : 'sky' });
    bar(hud, x, y + 10, w, 2, this.me.st.s, { fill: 'teal' });
  }
}
