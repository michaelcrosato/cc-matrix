// The Rep Shed: you scrub the animation with the stick and match the tempo marker. Every exercise runs two reps past its announced end.
import { LaneActivity } from './lane.js';
import { REPS, repTarget, GAG_EXTRA } from '../../data/reps.js';
import { T } from '../../core/tunables.js';
import { SKILLS } from '../../core/drivers.js';
import { place } from '../../art/world.js';
import { panel, bar, layoutLog } from '../../ui/widgets.js';
import { say } from '../../ui/font.js';
import { BARKS } from '../../data/lines.js';
import { Mirror, THREE } from '../../../pixel-engine.js';

const LEAD = 2.5;
export class RepsActivity extends LaneActivity {
  constructor(app, args) { super(app, args); this.R = REPS[args.id]; }
  get tempo() { return this.R.tempo * T.repTempoScale * (this.hard ? this.A.hard.tempoMul ?? 1 : 1); }
  get total() { return this.R.reps + GAG_EXTRA; }
  get duration() { return LEAD + this.total * this.tempo + 0.5; }
  goal() { return this.R.input === 'side' ? 'Lean left, then right, to match the marker. Each lunge, a different side.' : this.R.input === 'up' ? 'Press up to match the marker. It is heavy. It is a mortgage.' : 'Lean down to match the marker. Then back up. Ten times. Roughly.'; }
  controls() { return [[this.R.input === 'side' ? 'lean' : 'lean', this.R.input === 'down' ? 'Down: squat' : this.R.input === 'up' ? 'Up: press' : 'Left / right']]; }
  async stageExtra(ctx) {
    place(ctx, 'big-dumbbell', [-5.6, 0, -1], { turn: 20 }); place(ctx, 'big-dumbbell', [5.6, 0, -1.4], { turn: -30 });
    place(ctx, 'gym-frame', [0, 0, -3.4], { scale: 1.3 });
    try { if (ctx.engine.gpu) { const mirror = new Mirror({ size: [7.5, 3.6] }); mirror.mesh.position.set(0, 1.9, -3.35); ctx.scene.add(mirror.mesh); this.stopMirror = mirror.attach(ctx.engine.renderer, ctx.scene); this.mirror = mirror; } } catch { /* headless */ }
    for (const l of this.lanes) l.st = { r: 0, q: [], rep: -1, err: 0, errN: 0, f: 0 };
    this.coach.play('Idle');
  }
  dispose(ctx) { this.stopMirror?.(); this.mirror?.dispose?.(); super.dispose?.(ctx); }
  resetLanes() { for (const l of this.lanes) l.st = { r: 0, q: [], rep: -1, err: 0, errN: 0, f: 0, said: 0 }; }
  clipFor(rep) { return this.R.alternate && rep % 2 === 1 ? this.R.clipL : this.R.clip; }
  /** Target r at lane time t (after lead-in). */
  tgtAt(t) { const u = t - LEAD; if (u < 0) return { r: 0, rep: -1, f: 0 }; const rep = Math.floor(u / this.tempo); if (rep >= this.total) return { r: 0, rep: this.total, f: 0 }; const f = (u - rep * this.tempo) / this.tempo; return { r: repTarget(f), rep, f }; }
  inputOf(l, inp) {
    const I = this.R.input, rep = Math.max(0, l.st.rep);
    if (I === 'down') return Math.max(0, -inp.y); if (I === 'up') return Math.max(0, inp.y);
    const dir = rep % 2 === 0 ? 1 : -1; return Math.max(0, inp.x * dir);
  }
  botControl(l, inp, dt) {
    const sk = SKILLS[l.driver.skill]; if (!sk) { inp.x = inp.y = 0; return; }
    const lead = T.repLag * this.R.lagMul * Math.max(0, Math.min(1, 1.3 - sk.tau * 3)); const tg = this.tgtAt(this.tAt() + lead), rep = Math.max(0, tg.rep);
    const nz = (Math.sin(this.pt * 1.7 + l.idx) + Math.sin(this.pt * 3.1 + l.idx * 2)) * sk.err * (l.driver.skill === 'sloppy' ? 0.28 : 0.05);
    const v = Math.max(0, Math.min(1, tg.r + nz));
    const I = this.R.input;
    if (I === 'down') inp.y = -v; else if (I === 'up') inp.y = v; else inp.x = (rep % 2 === 0 ? 1 : -1) * v;
  }
  tAt() { return this.phase === 'play' ? this.playT : this.phaseT; }
  laneStep(l, inp, dt) {
    const t = this.tAt(), st = l.st, tg = this.tgtAt(t);
    const kb = l.kind === 'local' && !this.skill && this.app.device.last === 'kb';
    const lag = T.repLag * this.R.lagMul;
    const raw = kb ? st.r + this.inputRate(l, inp) * dt : this.inputOf(l, inp);
    st.r += kb ? this.inputRate(l, inp) * dt : (raw - st.r) * Math.min(1, dt / lag);
    st.r = Math.max(0, Math.min(1, st.r));
    const fat = T.repFatigue * Math.pow(Math.max(0, tg.rep) / this.total, 2);
    st.show = Math.max(0, Math.min(1, st.r + Math.sin(t * 23 + l.idx) * fat));
    st.tg = tg;
    if (tg.rep >= 0 && tg.rep < this.total && this.phase === 'play') {
      if (tg.rep !== st.rep) { if (st.rep >= 0) this.closeRep(l); st.rep = tg.rep; st.err = 0; st.errN = 0; if (l.kind === 'local') this.repBark(tg.rep); }
      st.err += Math.abs(st.show - tg.r); st.errN++;
    } else if (tg.rep >= this.total && st.rep >= 0 && st.rep < this.total) { this.closeRep(l); st.rep = this.total; }
    l.score = st.q.length ? 100 * st.q.reduce((a, b) => a + b, 0) / st.q.length : 0;
  }
  inputRate(l, inp) { const I = this.R.input, rate = 1 / (0.4 * this.tempo); const rep = Math.max(0, l.st.rep); return (I === 'down' ? -inp.y : I === 'up' ? inp.y : inp.x * (rep % 2 === 0 ? 1 : -1)) * rate; }
  closeRep(l) {
    const st = l.st, q = Math.max(0, Math.min(1, 1 - 1.6 * (st.errN ? st.err / st.errN : 1)));
    st.q.push(q); st.last = q >= 0.85 ? 'Perfect' : q >= 0.65 ? 'Good' : 'Wobbly';
    if (l.kind === 'local') this.app.sfx('repTick', { pitch: q >= 0.85 ? 5 : 0 });
  }
  repBark(rep) {
    const n = this.R.reps; if (rep === n - 1) this.bark('coach', 'Last one.', 2); else if (rep === n) this.bark('coach', 'Last one.', 2); else if (rep === n + 1) this.bark('coach', 'I lied. This is the last one.', 3);
  }
  scoreNow() { return this.me.score; }
  poseLane(l) {
    const rep = Math.max(0, l.st.rep ?? 0);
    if (this.phase === 'intro' || this.phase === 'countdown') { l.avatar.play('Idle'); return; }
    l.avatar.scrub(this.clipFor(rep), l.st.show ?? 0);
  }
  frameTick(ctx, dt) {
    super.frameTick(ctx, dt);
    const c = this.coach, tg = this.tgtAt(this.tAt());
    if (this.phase !== 'results') c.scrub(this.clipFor(Math.max(0, tg.rep)), tg.r);
  }
  drawPlay(hud) {
    const w = hud.width, me = this.me, st = me.st;
    this.drawTags(hud);
    say(hud, 12, 12, this.A.name, { color: 'white' });
    say(hud, w - 12, 12, `${Math.min(this.total, Math.max(0, st.rep + 1))} / ${this.R.reps}`, { anchor: 'r', scale: 2, color: 'white' });
    say(hud, 12, 24, `${Math.round(me.score)}%`, { scale: 2, color: 'sand' });
    // the track: a big vertical (or horizontal) track with a marker following the tempo curve, and you
    const side = this.R.input === 'side', tg = st.tg ?? { r: 0 };
    if (!side) {
      const tx = Math.floor(w / 2) + 70, ty = 24, th = 130;
      panel(hud, tx - 10, ty - 6, 28, th + 12, { shadow: false });
      hud.rect(tx, ty, 8, th, 'mist');
      const my = this.R.input === 'down' ? ty + tg.r * (th - 8) : ty + (1 - tg.r) * (th - 8), yy = this.R.input === 'down' ? ty + (st.show ?? 0) * (th - 8) : ty + (1 - (st.show ?? 0)) * (th - 8);
      hud.rect(tx - 5, Math.round(my), 18, 8, 'lime'); hud.rect(tx - 2, Math.round(yy) + 1, 12, 6, 'ink');
      layoutLog.add('track', tx - 10, ty - 6, 28, th + 12);
    } else {
      const tw = 150, tx = Math.floor((w - tw) / 2), ty = 34, dir = Math.max(0, st.rep) % 2 === 0 ? 1 : -1;
      panel(hud, tx - 6, ty - 8, tw + 12, 26, { shadow: false });
      hud.rect(tx, ty, tw, 6, 'mist'); hud.rect(tx + tw / 2 - 1, ty - 3, 2, 12, 'slate');
      const mx = tx + tw / 2 + dir * tg.r * (tw / 2 - 6), yx = tx + tw / 2 + dir * (st.show ?? 0) * (tw / 2 - 6);
      hud.rect(Math.round(mx) - 5, ty - 2, 10, 10, 'lime'); hud.rect(Math.round(yx) - 3, ty, 6, 6, 'ink');
      layoutLog.add('track', tx - 6, ty - 8, tw + 12, 26);
    }
    if (st.last) say(hud, w / 2, 76, st.last, { anchor: 'c', scale: 2, color: st.last === 'Perfect' ? 'lime' : st.last === 'Good' ? 'sky' : 'orange' });
  }
  laneLabel(l) { return this.phase === 'play' ? `${Math.round(l.score)}%` : ''; }
}
