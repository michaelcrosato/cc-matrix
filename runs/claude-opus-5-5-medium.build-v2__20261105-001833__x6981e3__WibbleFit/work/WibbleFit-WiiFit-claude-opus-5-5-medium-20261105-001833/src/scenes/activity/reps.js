// 5.2 The Rep Shed. You scrub the animation with the stick.
import { Mirror, THREE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { T } from '../../core/tunables.js';
import { BARKS } from '../../data/lines.js';
import { REP_GRADES, REPS, repTarget } from '../../data/reps.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { panel } from '../../ui/widgets.js';
import { ActivityScene } from './base.js';

export class RepSim {
  t = 0; r = 0; rep = 0; errSum = 0; errN = 0; repErr = 0; repN = 0; quals = []; done = false; score = 0; events = []; side = 1; target = 0; announced = 0; trem = 0;
  constructor(ex, env, rng, over = {}) {
    this.ex = { ...ex, ...over }; this.env = env; this.rng = rng; this.total = this.ex.reps + 2; this.announced = this.ex.reps; this.ph = rng.next() * 6.28;
  }
  get tempo() { return this.ex.tempo * T.repTempoScale; }
  step(dt, u) {
    this.t += dt;
    const tempo = this.tempo; const rep = Math.floor(this.t / tempo);
    if (rep !== this.rep) { this.finishRep(); this.rep = rep; if (rep >= this.total) { this.done = true; return; } this.side = this.ex.axis === 'side' ? (rep % 2 ? -1 : 1) : 1; this.events.push({ kind: 'rep', rep }); }
    const uu = (this.t % tempo) / tempo; this.target = repTarget(uu);
    const axis = this.ex.axis;
    const raw = axis === 'down' ? -u.y : axis === 'up' ? u.y : u.x * this.side;
    const lag = T.repLag * (this.ex.lagScale ?? 1);
    if (u.digital) {
      // Keys use rate control: S/W move r at the target speed, no key holds it.
      const key = axis === 'down' ? -(u.keyY ?? 0) : axis === 'up' ? (u.keyY ?? 0) : (u.keyX ?? 0) * this.side;
      this.r += key * (1 / (0.4 * tempo)) * dt;
    } else this.r += (Math.max(0, raw) - this.r) * Math.min(1, dt / lag);
    this.r = Math.max(0, Math.min(1, this.r));
    const f = T.repFatigue * (this.rep / this.total) ** 2;
    this.trem = f * Math.sin(this.t * 19 + this.ph);
    const shown = Math.max(0, Math.min(1, this.r + this.trem));
    this.shown = shown;
    const err = Math.abs(shown - this.target);
    if (this.env.god) this.r = this.target;
    const e = this.env.god ? 0 : err;
    this.repErr += e; this.repN++; this.errSum += e; this.errN++;
    this.score = this.quals.length ? (100 * this.quals.reduce((a, b) => a + b, 0)) / Math.max(1, this.quals.length) : 0;
  }
  finishRep() {
    if (!this.repN) return;
    const q = Math.max(0, 1 - 1.6 * (this.repErr / this.repN));
    this.quals.push(q); this.repErr = 0; this.repN = 0;
    const grade = REP_GRADES.find(([min]) => q >= min)[1];
    this.events.push({ kind: 'grade', grade, q });
  }
  final() { const all = this.quals.length ? this.quals : [0]; return 100 * all.reduce((a, b) => a + b, 0) / Math.max(this.total, all.length); }
  result() { return { score: Math.round(this.done ? this.final() : this.score), stats: { reps: this.quals.length } }; }
  bot(driver, out, dt) {
    const sk = driver.skill, tempo = this.tempo;
    const ahead = repTarget((((this.t + sk.repLead) % tempo) + tempo) % tempo / tempo);
    driver.ph ??= driver.rng.next() * 6.28; driver.wob = sk.repErr * Math.sin(this.t * 1.9 + driver.ph) * 0.8;
    const v = Math.max(0, Math.min(1, ahead + driver.wob));
    const axis = this.ex.axis;
    if (axis === 'down') out.y = -v; else if (axis === 'up') out.y = v; else out.x = v * this.side;
  }
}
export const repView = {
  kind: 'reps',
  enter(scene, lane) { lane.avatar.scrub(lane.sim.ex.clip, 0); },
  update(scene, lane) {
    const s = lane.sim; if (!s) return;
    const clip = s.ex.axis === 'side' && s.side < 0 ? s.ex.clipL : s.ex.clip;
    lane.avatar.scrub(clip, s.shown ?? s.r);
    lane.avatar.lean.x = s.trem * 2; lane.avatar.trem = s.rep / s.total > 0.6 ? 0.5 : 0;
  },
  draw(scene, hud, lane, box, big) {
    const s = lane.sim; if (!s) return;
    const h = big ? 110 : 44, w = big ? 22 : 10, x = Math.round(box.x - w / 2), y = Math.round(box.y - h / 2);
    hud.rect(x - 2, y - 2, w + 4, h + 4, 'ink'); hud.rect(x, y, w, h, 'night');
    const my = (v) => (s.ex.axis === 'up' ? y + h - 2 - (h - 4) * v : y + (h - 4) * v);
    hud.rect(x, Math.round(my(s.target)), w, 4, 'lime');
    hud.rect(x - (big ? 4 : 2), Math.round(my(s.shown ?? s.r)), w + (big ? 8 : 4), 3, Math.abs((s.shown ?? 0) - s.target) < 0.12 ? 'cyan' : 'red');
  },
  score: (s) => s.final(),
};
export class RepsScene extends ActivityScene {
  ex() { const e = REPS[this.def.id]; return this.hard ? { ...e, ...this.def.hard } : e; }
  makeSim(ctx, lane) { return new RepSim(this.ex(), App.simEnv(ctx, this.def), ctx.random.fork(`rep-${lane.i}-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    await this.buildLanes(ctx, 'shed');
    for (const l of this.lanes) repView.enter(this, l);
    this.coach.setAt(-1.1, 0, -1.5); this.coach.play('Idle');
    // A wall mirror showing your reps. Stopped in dispose.
    if (ctx.engine.gpu) {
      this.mirror = new Mirror({ size: [8.6, 3.2] }); this.mirror.mesh.position.set(0, 2.2, -4.05);
      ctx.scene.add(this.mirror.mesh);
      this.stopMirror = this.mirror.attach(ctx.engine.renderer, ctx.scene);
    }
    this.lastGrade = ''; this.gradeT = 0;
  }
  dispose() { this.stopMirror?.(); this.mirror?.dispose(); }
  cardInfo() {
    const e = this.ex(), verb = e.axis === 'down' ? 'Push down: go deeper' : e.axis === 'up' ? 'Push up: press' : 'Push left, right: lunge';
    return { goal: `Match the green marker. ${e.reps} reps. It says ${e.reps}.`, prompts: [['lean', verb]] };
  }
  onPlayStart() { this.repSaid = -1; }
  view(ctx, dt) {
    for (const l of this.lanes) repView.update(this, l);
    const s = this.lanes[1].sim;
    for (const e of s.events.splice(0)) {
      if (e.kind === 'grade') { this.lastGrade = e.grade; this.gradeT = 1.1; App.sfx(e.grade === 'Perfect' ? 'repPerfect' : 'repTick'); }
      if (e.kind === 'rep' && this.phase === 'play') {
        const over = e.rep - (s.announced - 1);
        if (over >= 0 && over < BARKS.repCount.length) { App.barkLine(BARKS.repCount[over], 'coach', 2); this.coach.play('CoachPoint', { once: true }); }
      }
    }
    this.gradeT -= dt;
  }
  drawPlay(ctx, hud) {
    const W = hud.width, s = this.lanes[1].sim, cx = Math.round(W / 2) + 90;
    repView.draw(this, hud, this.lanes[1], { x: cx, y: 90, r: 40 }, true);
    App.dialCenter.x = W / 2; App.dialCenter.y = hud.height / 2;
    this.drawTopBar(hud, Math.round(s.score), `Rep ${Math.min(s.rep + 1, s.total)} / ${s.announced}`);
    if (this.gradeT > 0) center(hud, 44, this.lastGrade, { scale: 2, color: this.lastGrade === 'Perfect' ? 'lime' : this.lastGrade === 'Good' ? 'cyan' : 'orange' });
    if (this.phase === 'play' && !App.attract) promptBar(hud, [['lean', s.ex.axis === 'down' ? 'Deeper' : s.ex.axis === 'up' ? 'Press' : (s.side > 0 ? 'Right' : 'Left')], ['pause', 'Pause']]);
    void panel; void say;
  }
}
