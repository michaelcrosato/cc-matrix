// 5.4 Step Class. Footprints scroll to a hit line. 104 BPM, 32 bars.
import { App } from '../../app.js';
import { SONGS } from '../../audio/songs.js';
import { place } from '../../art/stage.js';
import { BeatClock } from '../../core/clock.js';
import { T } from '../../core/tunables.js';
import { chartNotes, STEP_BPM } from '../../data/charts.js';
import { center, say } from '../../ui/font.js';
import { promptBar } from '../../ui/prompts.js';
import { ActivityScene } from './base.js';
export const WINDOWS = { perfect: 0.055, good: 0.1, ok: 0.14 };
const FOOT = ['.oo.', 'oooo', 'oooo', 'oooo', '.oo.', '....', '.oo.', '.oo.'];
export class StepSim {
  t = 0; idx = 0; P = 0; G = 0; O = 0; M = 0; combo = 0; best = 0; score = 0; done = false; events = []; last = null; flash = 0;
  constructor(cfg, env, rng, { maxBars = Infinity } = {}) {
    this.cfg = cfg; this.env = env; this.rng = rng;
    const c = chartNotes(undefined, { maxBars, hard: !!cfg.fill }); this.notes = c.notes.map((n) => ({ ...n, judged: false })); this.duration = c.duration + 1.2; this.total = this.notes.length;
  }
  win(k) { return WINDOWS[k] * T.stepWindow * (this.cfg.window ?? 1); }
  judge(foot, when) {
    const off = T.stepOffsetMs / 1000; let best = null, bd = Infinity;
    for (let i = this.idx; i < this.notes.length; i++) {
      const n = this.notes[i]; if (n.t > when + 0.5) break;
      if (n.judged || n.foot !== foot) continue;
      const d = Math.abs(n.t - (when - off)); if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > this.win('ok')) { return; }
    best.judged = true;
    const g = bd <= this.win('perfect') ? 'P' : bd <= this.win('good') ? 'G' : 'O';
    this[g]++; this.combo++; this.best = Math.max(this.best, this.combo);
    this.events.push({ kind: g, foot, combo: this.combo }); this.last = { g, foot, at: this.t };
  }
  step(dt, u, clock) {
    this.t = clock ? clock(dt) : this.t + dt;
    if (u.stepL) this.judge('L', this.t);
    if (u.stepR) this.judge('R', this.t);
    if (this.env.god) for (const n of this.notes) if (!n.judged && n.t <= this.t) { n.judged = true; this.P++; this.combo++; this.events.push({ kind: 'P', foot: n.foot, combo: this.combo }); }
    while (this.idx < this.notes.length) {
      const n = this.notes[this.idx];
      if (n.judged) { this.idx++; continue; }
      if (this.t - n.t > this.win('ok')) { n.judged = true; this.M++; this.combo = 0; this.events.push({ kind: 'M', foot: n.foot }); this.idx++; continue; }
      break;
    }
    this.score = this.accuracy() * 100;
    if (this.t >= this.duration) this.done = true;
  }
  accuracy() { return this.total ? (this.P + 0.7 * this.G + 0.4 * this.O) / this.total : 0; }
  final() { return this.accuracy() * 100; }
  result() { return { score: Math.round(this.final()), stats: { perfect: this.P, good: this.G, ok: this.O, miss: this.M, combo: this.best } }; }
  bot(driver, out) {
    const sk = driver.skill;
    while (driver.ni === undefined || driver.plan?.n?.judged || driver.plan === null) {
      driver.ni = driver.ni === undefined ? 0 : driver.ni + 1;
      if (driver.ni >= this.notes.length) { driver.plan = { done: true }; break; }
      const n = this.notes[driver.ni];
      driver.plan = { n, at: n.t + (driver.rng.next() - 0.5) * 2 * sk.jitter, hit: driver.rng.next() < sk.hit };
      break;
    }
    const p = driver.plan;
    if (p && !p.done && this.t >= p.at) {
      if (p.hit) { if (p.n.foot === 'L') out.stepL = true; else out.stepR = true; }
      driver.plan = null;
    } else if (p && !p.done && this.t - p.n.t > 0.2) driver.plan = null;
  }
}
export const stepView = {
  kind: 'step',
  enter(scene, lane) { lane.avatar.play('Idle'); place(scene.ctx, 'step-platform', lane.x, 0.001, lane.z + 0.25); lane.stepped = 0; },
  update(scene, lane) {
    const s = lane.sim; if (!s) return;
    for (const e of s.events) {
      if (e.foot && e.kind !== 'M') lane.avatar.play(e.foot === 'L' ? 'StepL' : 'StepR', { once: true, speed: 1.4, fade: 0.05 });
      if (e.kind === 'M' && lane === scene.lanes[scene.playerLane]) lane.avatar.lean.x = 0.4;
    }
    if (lane !== scene.lanes[scene.playerLane]) s.events.length = 0;
    lane.avatar.lean.x *= 0.9;
  },
  draw(scene, hud, lane, box, big) {
    const s = lane.sim; if (!s) return;
    const w = big ? 60 : 40, h = big ? hud.height - 50 - 62 : 76, x = Math.round(box.x - w / 2), top = Math.round(big ? 26 : box.y - 38), hitY = top + h - 14, pxPerSec = big ? 62 : 34;
    hud.rect(x - 2, top - 2, w + 4, h + 4, 'ink'); hud.rect(x, top, w, h, 'night');
    hud.rect(x + w / 2, top, 1, h, 'slate');
    hud.rect(x, hitY, w, 2, 'white');
    for (const n of s.notes) {
      const dy = (n.t - s.t) * pxPerSec; if (dy > hitY - top || dy < -14) continue;
      const nx = n.foot === 'L' ? x + w * 0.25 : x + w * 0.75;
      if (n.judged && dy < 0) continue;
      hud.sprite(Math.round(nx - (big ? 4 : 2)), Math.round(hitY - dy - (big ? 8 : 4)), FOOT, { o: n.foot === 'L' ? 'sky' : 'orange' }, { scale: big ? 2 : 1, shadow: 'ink' });
    }
    if (s.last && s.t - s.last.at < 0.3) {
      const nx = s.last.foot === 'L' ? x + 2 : x + w / 2 + 2;
      hud.rect(nx, hitY - 3, w / 2 - 4, 8, s.last.g === 'P' ? 'lime' : s.last.g === 'G' ? 'cyan' : 'orange');
    }
    if (big) {
      say(hud, x - 2, hitY + 6, 'L', { color: 'sky' }); say(hud, x + w - 6, hitY + 6, 'R', { color: 'orange' });
    }
  },
  score: (s) => s.final(),
};
const BAR = (60 / STEP_BPM) * 4;
export class StepScene extends ActivityScene {
  beat = new BeatClock();
  makeSim(ctx, lane) { return new StepSim(this.cfg(), App.simEnv(ctx, this.def), ctx.random.fork(`step-${lane.i}-${this.simN = (this.simN ?? 0) + 1}`)); }
  async buildStage(ctx) {
    await this.buildLanes(ctx, 'beach', { coach: false });
    for (const l of this.lanes) stepView.enter(this, l);
    ctx.particles.register('confetti', { count: [18, 26], life: [0.8, 1.6], speed: [2, 4], gravity: 5, size: [1, 2], colors: ['red', 'sand', 'cyan', 'lime', 'orange'], radius: 0.5 });
    this.beat.attach(ctx.audio);
    this.lastMile = 0;
  }
  cardInfo() { return { goal: 'Left foot on left. Right foot on right. On the line.', prompts: [['feet', 'Left, right']] }; }
  // Audio context time lags frames; lanes all read one clock.
  stepLanes(ctx, dt) {
    this.beat.advance(dt);
    const t = this.beat.read() + (this.clockOffset ?? 0);
    if (Math.abs(t - this.beat.time) > 0.5 && !this.beat.synced) this.beat.sync(t);
    if (this.beat.synced) this.beat.time = t;
    for (const l of this.lanes) {
      if (!l.sim || l.sim.done) continue;
      l.driver.read(this.out, l.sim, dt);
      l.sim.step(dt, this.out, () => t);
    }
  }
  onPlayStart(ctx) { this.startSong(ctx, 0); }
  startSong(ctx, fromBar) {
    const song = SONGS.step;
    ctx.audio.playMusic({ ...song, order: song.order.slice(fromBar) }, 'step');
    this.beat.barOffset = fromBar * BAR; this.clockOffset = 0; this.beat.time = fromBar * BAR;
    for (const l of this.lanes) if (l.sim) l.sim.events.length = 0;
  }
  // On pause: stop the music. On resume: count in and restart at the current bar.
  onPause(ctx) { ctx.audio.stopMusic?.(); this.pausedAt = this.lanes[1].sim.t; }
  onResume(ctx) {
    if (this.finished) { App.music('evening'); return; }
    if (this.phase === 'play') {
      const bar = Math.max(0, Math.floor(this.pausedAt / BAR));
      this.resumeBar = bar; this.setPhase('resume'); this.resumeT = 2 * (60 / STEP_BPM) * 2;
      for (const l of this.lanes) if (l.sim) l.sim.t = bar * BAR - this.resumeT;
      this.beat.time = bar * BAR - this.resumeT;
    } else App.music(this.def.song);
  }
  tick(ctx, dt) {
    if (this.phase === 'resume') {
      if (App.blocked()) return;
      this.resumeT -= dt;
      for (const l of this.lanes) if (l.sim) l.sim.t += dt;
      this.beat.time += dt;
      if (this.resumeT <= 0) { this.startSong(ctx, this.resumeBar); this.setPhase('play'); }
      return;
    }
    super.tick(ctx, dt);
  }
  view(ctx, dt) {
    for (const l of this.lanes) stepView.update(this, l);
    const s = this.lanes[1].sim;
    for (const e of s.events.splice(0)) {
      if (e.kind === 'P') App.sfx('stepPerfect'); else if (e.kind === 'G' || e.kind === 'O') App.sfx('stepGood'); else if (e.kind === 'M') App.sfx('stepMiss');
      if (e.combo && e.combo % 25 === 0 && e.combo !== this.lastMile) { this.lastMile = e.combo; App.sfx('combo'); ctx.particles.burst('confetti', [0, 2.2, 0.8]); }
    }
  }
  drawPlay(ctx, hud) {
    const W = hud.width, s = this.lanes[1].sim;
    stepView.draw(this, hud, this.lanes[1], { x: Math.round(W * 0.68), y: 60, r: 30 }, true);
    App.dialCenter.x = W / 2; App.dialCenter.y = 60;
    this.drawTopBar(hud, Math.round(s.score), s.combo > 1 ? `Combo ${s.combo}` : '');
    if (s.last && s.t - s.last.at < 0.5) { const g = { P: 'Perfect', G: 'Good', O: 'OK' }[s.last.g]; say(hud, Math.round(W * 0.68) - 116, 60, g, { scale: 2, color: s.last.g === 'P' ? 'lime' : s.last.g === 'G' ? 'cyan' : 'orange' }); }
    if (this.phase === 'resume') center(hud, hud.height / 2 - 20, String(Math.ceil(this.resumeT / (60 / STEP_BPM))), { scale: 5, color: 'sand' });
    if ((this.phase === 'play' || this.phase === 'practice') && !App.attract) promptBar(hud, [['feet', 'Left, right'], ['pause', 'Pause']]);
  }
}
