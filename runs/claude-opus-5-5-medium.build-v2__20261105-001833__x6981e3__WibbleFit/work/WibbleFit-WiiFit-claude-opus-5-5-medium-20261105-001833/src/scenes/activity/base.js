// The shared flow: intro, practice (first time), countdown, play, outro, Results.
import { THREE } from '../../../pixel-engine.js';
import { App } from '../../app.js';
import { makeAvatar, PlumbBob } from '../../art/avatar.js';
import { backdrop, laneCamera, laneXs, place } from '../../art/stage.js';
import { ACTIONS } from '../../core/actions.js';
import { blankInput, LocalDriver, makeDriver, BotDriver } from '../../core/drivers.js';
import { scoreForStars, starsFor } from '../../core/progress.js';
import { ACT, COACH_LINES } from '../../data/activities.js';
import { CAST_LOOKS, AVATARS } from '../../data/classmates.js';
import { ACTIVITY_LINES } from '../../data/lines.js';
import { BaseScene } from '../base.js';
import { center, plate, say, textWidth, wrap } from '../../ui/font.js';
import { promptBar, promptWidth, prompt } from '../../ui/prompts.js';
import { line, note, panel } from '../../ui/widgets.js';
import { Results } from '../../ui/screens/results.js';
const { Vector3 } = THREE;

export class ActivityScene extends BaseScene {
  id = 'activity'; canPause = true; phase = 'intro'; phaseT = 0; lanes = []; playT = 0; mode = 'dropin'; introSeconds = 2.6; practiceSeconds = 8; countdown = 3; outroSeconds = 1.6; finished = false; forced = null; out = blankInput(); v = new Vector3();
  constructor(args = {}) {
    super(args);
    this.def = ACT[args.id ?? 'tree']; this.hard = !!args.hard; this.mode = args.mode ?? (App.slot ? 'week' : 'dropin');
    this.fp = { hash: 0 };
  }
  camera() { return this.cameraConfig?.() ?? laneCamera(3); }
  // Merged data: activity entry + hard overrides.
  cfg() { return { ...this.def, ...(this.hard ? this.def.hard : {}) }; }
  playerLook() { const s = App.slot; if (s?.look) return { ...s.look, items: s.items?.length ? s.look.equipped ?? [] : [] }; return AVATARS[0]; }
  localDriver(ctx) {
    this.playerRng = ctx.random.fork('player-bot');
    return App.playerDriver(this.playerRng) ?? new LocalDriver(App.lanesEnv(ctx));
  }
  onDriverChange() { const l = this.lanes[this.playerLane ?? 0]; if (l) l.driver = App.playerDriver(this.playerRng) ?? new LocalDriver(App.lanesEnv(this.ctx)); }
  async build(ctx) {
    this.ctx = ctx;
    await this.buildStage(ctx);
    App.music(this.def.song);
    const rec = (App.slot?.records ?? App.save.data.dropIn)[this.def.id];
    this.firstTime = !rec || rec.plays === 0;
    if (this.attract) { this.setPhase('play'); this.onPlayStart?.(ctx); }
    else if (this.args.skipIntro) { this.setPhase('countdown'); this.lastCount = 4; }
    else this.setPhase('intro');
    App.dialOwner = this;
  }
  setPhase(p) { this.phase = p; this.phaseT = 0; }
  skipPressed(ctx) { return ctx.input.wasPressed(...ACTIONS.menuConfirm, 'MouseLeft'); }
  tick(ctx, dt) {
    if (App.blocked()) return;
    this.phaseT += dt;
    switch (this.phase) {
      case 'intro': break;
      case 'practice':
        this.stepLanes(ctx, dt);
        if (this.phaseT >= this.practiceSeconds || this.practiceSkip) { this.practiceSkip = false; this.resetSims(ctx); this.setPhase('countdown'); this.lastCount = 4; }
        break;
      case 'countdown': {
        const c = Math.ceil(this.countdown - this.phaseT);
        if (c !== this.lastCount) { this.lastCount = c; App.sfx(c > 0 ? 'countdown' : 'go'); }
        if (this.phaseT >= this.countdown) { this.setPhase('play'); this.onPlayStart?.(ctx); }
        break;
      }
      case 'play':
        this.playT += dt;
        this.stepLanes(ctx, dt);
        if (this.lanes[this.playerLane ?? 0].sim.done) {
          if (this.attract) { this.resetSims(ctx); this.playT = 0; this.onPlayStart?.(ctx); break; }
          this.setPhase('outro'); this.onOutro?.(ctx);
        }
        break;
      case 'outro':
        if (this.phaseT >= this.outroSeconds && !this.finished) this.finish(ctx);
        break;
      default:
    }
  }
  stepLanes(ctx, dt) {
    for (const l of this.lanes) {
      if (!l.sim || l.sim.done) continue;
      l.driver.read(this.out, l.sim, dt);
      l.sim.step(dt, this.out);
    }
  }
  resetSims(ctx) { for (const l of this.lanes) l.sim = this.makeSim(ctx, l); this.onResetSims?.(ctx); }
  result() {
    const s = this.lanes[this.playerLane ?? 0].sim;
    if (this.forced !== null) return { score: scoreForStars(this.def, this.forced), stars: this.forced, max: s.maxScore?.() ?? 0, forced: true };
    const r = s.result();
    const stars = r.stars ?? starsFor(this.cfg(), r.score, r.max ?? 0);
    return { ...r, stars };
  }
  // Dev Tools: finish now with n stars.
  forceFinish(n) { this.forced = n; const l = this.lanes[this.playerLane ?? 0]; if (l.sim) l.sim.done = true; this.finish(this.ctx); }
  finish(ctx) {
    if (this.finished) return; this.finished = true;
    const r = this.result();
    const rec = App.recordActivity(this.def, r.score, r.stars, Math.max(1, this.playT), this.mode === 'week' ? 'week' : 'dropin');
    this.resultData = { ...r, ...rec };
    App.music('evening');
    App.open(new Results(this));
  }
  // Called by Results.
  retry() { App.go('activity', { ...this.args, mode: this.mode }); }
  leave() {
    if (this.mode === 'week') {
      if (this.def.id === 'longstand' && App.slot && !App.slot.confessed) App.go('ending');
      else App.go('hub');
    } else App.go('title', { page: 'dropin' });
  }
  frame(ctx, dt, rdt, free) {
    if (this.phase === 'intro' && free) {
      if (this.phaseT >= this.introSeconds * 0.4 && this.skipPressed(ctx)) this.afterIntro();
      else if (this.phaseT >= 9) this.afterIntro();
    }
    if (this.phase === 'practice' && free && this.phaseT > 1 && ctx.input.wasPressed('PadTriangle', 'KeyM')) this.practiceSkip = true;
    this.view?.(ctx, dt, rdt);
    this.updateAvatars?.(ctx, dt);
  }
  afterIntro() {
    if (this.firstTime && this.hasPractice !== false) { this.setPhase('practice'); App.barkLine('Try it.', 'coach', 2); }
    else { this.setPhase('countdown'); this.lastCount = 4; }
  }
  // Mats: solo is the centre mat with two classmates; a lane has an avatar, a driver and a sim.
  async buildLanes(ctx, kind, { coach = true, mats = true } = {}) {
    backdrop(ctx, kind);
    const xs = laneXs(3), rng = ctx.random.fork('classmates');
    const defs = [{ who: 'dennis', skill: 'average', look: CAST_LOOKS.dennis }, { who: 'player' }, { who: 'marguerite', skill: 'expert', look: CAST_LOOKS.marguerite }];
    this.playerLane = 1;
    for (let i = 0; i < 3; i++) {
      const d = defs[i];
      const avatar = await makeAvatar(ctx, d.who === 'player' ? this.playerLook() : d.look);
      avatar.setAt(xs[i], 0, 0.8);
      if (mats || i === 1) place(ctx, 'yoga-mat', xs[i], 0.001, 0.8, { palette: { mat: i === 1 ? 'sky' : 'mist', stripe: 'white' } });
      const driver = d.who === 'player' ? this.localDriver(ctx) : new BotDriver(this.attract ? 'expert' : d.skill, rng.fork(i));
      const lane = { i, x: xs[i], z: 0.8, who: d.who, avatar, driver, name: d.who === 'player' ? (App.slot?.name ?? 'You') : d.who };
      lane.sim = this.makeSim(ctx, lane);
      this.lanes.push(lane);
    }
    if (coach) {
      this.coach = await makeAvatar(ctx, CAST_LOOKS.coach);
      this.coach.setAt(1.15, 0.24, -1.7, 0);
      this.coach.play('Idle');
      this.bob = new PlumbBob(ctx, this.coach);
      setTimeout0(() => this.bob?.update(0));
    }
  }
  updateAvatars(ctx, dt) {
    for (const l of this.lanes) l.avatar?.update(dt);
    this.coach?.update(dt); this.bob?.update(dt);
  }
  screenOf(x, y, z) {
    const v = this.v.set(x, y, z).project(this.ctx.camera.camera), h = this.ctx.hud;
    return { x: ((v.x + 1) / 2) * h.width, y: ((1 - v.y) / 2) * h.height };
  }
  card() { return this.cardInfo?.() ?? { goal: 'Do your best.', prompts: [] }; }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    if (this.phase === 'intro') {
      const c = this.card(), lines = wrap(ACTIVITY_LINES[this.def.id]?.[this.firstTime ? 'first' : 'repeat'] ?? '', 40), goal = wrap(c.goal, 44);
      const h = 40 + lines.length * 10 + goal.length * 10 + c.prompts.length * 14 + 10, w = Math.min(W - 24, 320), x = (W - w) / 2, y = Math.max(12, (H - 16 - h) / 2);
      panel(hud, x, y, w, h, 'white', 'teal');
      say(hud, x + 10, y + 6, this.def.name, { color: 'teal', shadow: false, scale: this.def.name.length * 12 > w - 20 ? 1 : 2 });
      if (this.hard) say(hud, x + w - 40, y + 8, 'Hard', { color: 'red', shadow: false });
      let yy = y + 26;
      for (const l of goal) { say(hud, x + 10, yy, l, { color: 'ink', shadow: false }); yy += 10; }
      yy += 2;
      for (const [a, v] of c.prompts) { prompt(hud, x + 10, yy, a, v, { color: 'ink', shadow: false }); yy += 14; }
      yy += 2;
      for (const l of lines) { say(hud, x + 10, yy, l, { color: 'slate', shadow: false }); yy += 10; }
      promptBar(hud, [['confirm', 'Begin'], ['pause', 'Pause']]);
      note(x, y, w, h, 'card');
      return;
    }
    this.drawPlay?.(ctx, hud);
    // The mouse leans by offset from the dial: show it as a force, not a target.
    if (App.device.last === 'mouse' && !App.top() && !App.attract && this.leansWithMouse !== false && (this.phase === 'play' || this.phase === 'practice')) {
      const p = ctx.input.pointer, ax = Math.round(((p.x + 1) / 2) * W), ay = Math.round(((1 - p.y) / 2) * H), c = App.dialCenter;
      line(hud, c.x, c.y, ax, ay, 'red', 1);
      hud.rect(ax - 4, ay, 9, 2, 'red'); hud.rect(ax, ay - 4, 2, 9, 'red');
    }
    if (this.phase === 'practice') {
      center(hud, H - 44, 'Practice. Nothing counts yet.', { color: 'sand' });
      promptBar(hud, [['more', 'Skip practice'], ['pause', 'Pause']]);
    } else if (this.phase === 'countdown') {
      const n = Math.ceil(this.countdown - this.phaseT);
      center(hud, H / 2 - 20, String(Math.max(1, n)), { scale: 5, color: 'sand' });
    } else if (this.phase === 'outro') {
      center(hud, H / 2 - 8, 'Thank you.', { scale: 2, color: 'white' });
    } else if (this.phase === 'play' && this.phaseT < 0.8 && !this.attract) {
      center(hud, H / 2 - 12, 'Go.', { scale: 3, color: 'lime' });
    }
  }
  drawTopBar(hud, score, extra = '') {
    const top = App.attract ? 18 : 12;
    if (!App.attract) plate(hud, 12, top, this.def.name, { color: 'white' });
    const t = String(score), w = textWidth(t, 2);
    plate(hud, hud.width - 26 - w, top, t, { scale: 2, color: 'sand' });
    if (extra) plate(hud, 12, top + 12, extra, { color: 'cyan' });
  }
  status(ctx) { const s = this.lanes[this.playerLane ?? 0]?.sim; return `activity ${this.def?.id} | ${this.phase} | t ${(this.playT).toFixed(1)} | score ${s ? Math.round(s.score ?? 0) : 0}`; }
  debugDot() { const d = this.lanes[this.playerLane ?? 0]?.sim?.dot; return d ? `${d.x.toFixed(2)},${d.y.toFixed(2)}` : '-'; }
  fingerprint() {
    return this.lanes.map((l) => { const s = l.sim; return s ? `${(s.score ?? 0).toFixed?.(3) ?? s.score}|${s.dot ? `${s.dot.x.toFixed(4)},${s.dot.y.toFixed(4)}` : ''}|${s.t?.toFixed?.(3) ?? ''}` : ''; }).join(';');
  }
  onPause(ctx) { App.ctx.audio.stopMusic?.(); this.pausedMusic = true; }
  onResume(ctx) { if (this.pausedMusic) { this.pausedMusic = false; if (!this.finished) this.resumeMusic?.(ctx) ?? App.music(this.def.song); else App.music('evening'); } }
}
const setTimeout0 = (fn) => { Promise.resolve().then(fn); };
export const coachLine = (scene) => COACH_LINES[scene] ?? [];
export const makeBot = (name, rng) => makeDriver(name, rng);
