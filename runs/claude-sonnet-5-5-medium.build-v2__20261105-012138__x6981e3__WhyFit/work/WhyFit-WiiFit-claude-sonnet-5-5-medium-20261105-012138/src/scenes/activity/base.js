// The shared activity flow: intro -> practice (first time) -> countdown -> play -> outro -> results.
import { BaseScene } from '../base.js';
import { ACTIVITIES, ACT_ORDER, starsFor } from '../../data/activities.js';
import { RESULT_FIRST, RESULT_REPEAT, COACH_INTRO, pick } from '../../data/lines.js';
import { recordsFor, CLASSMATES } from '../../data/classmates.js';
import { applyResult, key as recKey } from '../../core/progress.js';
import { T } from '../../core/tunables.js';
import { say, sayWrapped, wrap } from '../../ui/font.js';
import { panel, Menu, drawStars, bar, layoutLog } from '../../ui/widgets.js';
import { drawPrompts } from '../../ui/prompts.js';
import { PauseMenu } from '../../ui/screens/pause.js';
import { stationOfAct, STATIONS } from '../../data/stations.js';
import { BotDriver, LocalDriver, blank } from '../../core/drivers.js';
import { windowStart, windowEnd, PLAY_SECS, norm, WINDOW } from '../../core/medley.js';

export class ActivityBase extends BaseScene {
  static id = 'activity';
  constructor(app, args = {}) {
    super(app, args);
    this.actId = args.id; this.A = ACTIVITIES[this.actId]; if (!this.A) throw new Error('unknown activity ' + args.id);
    this.hard = !!args.hard; this.dropIn = !!args.dropIn || !app.slot; this.autopilot = args.autopilot ?? null;
    this.medley = !!args.medley; this.attract = !!app.attract;
    this.phase = 'intro'; this.pt = 0; this.phaseT = 0; this.playT = 0; this.result = null; this.report = null;
    this.practiced = false; this.starsShown = 0; this.menu = null; this.cheat = !!app.attract;
    this.skill = args.skill ?? args.autopilot ?? (app.attract ? 'expert' : null);
    this.event = args.event ?? 0;
  }
  get S() { return this.app.slot; }
  get duration() { return 30; }
  /** Called once before the first frame; subclasses build their staging here. */
  async build(ctx) { await this.stage(ctx); this.begin(); }
  async stage() {}
  begin() { if (this.medley) { this.setPhase('wait'); return; } this.setPhase(this.app.attract || this.args.skipIntro ? 'countdown' : 'intro'); }
  setPhase(p) {
    this.phase = p; this.phaseT = 0;
    if (p === 'wait') { this.resetPlay(); }
    if (p === 'intro') { if (!this.args.noBark) this.bark('coach', COACH_INTRO[this.actId] ?? 'Begin.', 4); }
    if (p === 'practice') { this.resetPlay(); this.bark('coach', 'Try it.', 2.4); }
    if (p === 'countdown') { this.resetPlay(); if (!this.medley || this.event === 0) this.app.music(this.A.song); this.countdownTick = 4; }
    if (p === 'play') { this.resetPlay(); this.playT = 0; this.onPlayStart?.(); }
    if (p === 'outro') { this.onOutro?.(); }
    if (p === 'results') this.openResults();
  }
  resetPlay() {}
  /** Controls shown on the intro card for the last device used. */
  controls() { return [['lean', 'Lean']]; }
  goal() { return 'Keep the Dot in the circle.'; }
  playLine() { return this.goal(); }
  howto() { return this.goal(); }
  // ---------- fixed step ----------
  fixed(ctx, dt) {
    this.pt += dt; this.phaseT += dt;
    const p = this.phase;
    const dur = this.medley ? Math.min(this.duration, PLAY_SECS) : this.duration;
    if (this.medley && !this.app.session) this.app.medley.clock += dt;
    if (p === 'wait') { if (this.medleyNow() >= windowStart(this.event)) this.setPhase('countdown'); return; }
    if (p === 'practice' || p === 'play') this.playFixed(dt, p === 'practice');
    if (p === 'countdown') { this.countFixed?.(dt); if (this.phaseT >= (this.app.attract ? 1.5 : 3)) this.setPhase('play'); }
    if (p === 'play') { this.playT += dt; if (this.playT >= this.duration) this.setPhase('outro'); }
    if (p === 'practice' && this.phaseT >= 8) this.setPhase('countdown');
    if (p === 'outro' && this.phaseT >= 1.4) this.setPhase('results');
  }
  playFixed() {}
  // ---------- frame ----------
  tick(ctx, dt, blocked) {
    const app = this.app, nav = app.nav;
    this.frameTick?.(ctx, dt);
    if (blocked) return;
    if (this.phase === 'intro') {
      if (nav.confirm || nav.click) { if (!this.practiceDone() && !this.dropInSkip) this.setPhase('practice'); else this.setPhase('countdown'); app.sfx('confirm'); }
      if (nav.pause || nav.back) this.openPause();
    } else if (this.phase === 'practice') {
      if (nav.confirm && false) this.setPhase('countdown');
      if (nav.pause) this.openPause();
    } else if (this.phase === 'results') {
      if (this.medley) this.medleyTick(dt); else this.resultsTick(dt, nav);
    } else if (nav.pause && !app.attract) this.openPause();
  }
  practiceDone() { const d = this.app.save.data; d.practiced ??= {}; return !!d.practiced[this.A.kind] || this.medley || this.app.attract; }
  openPause() {
    if (this.app.session) { return; }
    const app = this.app;
    this.push(new PauseMenu(app, {
      restart: () => app.go('activity', { id: this.actId, hard: this.hard, dropIn: this.dropIn }),
      island: () => this.leave(), howto: this.howto(),
      dev: { open: () => app.openDev?.(this), about: () => app.openAbout?.(this) },
    }));
  }
  leave() { this.app.go(this.dropIn ? 'title' : 'hub', this.dropIn ? { menu: true } : {}); }
  // ---------- results ----------
  scoreNow() { return 0; }
  finalResult() {
    if (this.forcedStars != null) { const f = this.forcedStars, a = this.A; const sc = f === 0 ? 0 : Math.ceil(a.stars[f - 1] * T.starThresholdScale); return { score: sc, stars: f, seconds: Math.max(10, this.playT) }; }
    const score = Math.round(this.scoreNow()); return { score, stars: starsFor(this.actId, score, T.starThresholdScale), seconds: this.playT }; }
  medleyNow() { const m = this.app.medley; return this.app.net && this.app.net.time() > -Infinity ? this.app.net.time() : (m?.clock ?? 0); }
  openResults() {
    if (this.medley) { this.openMedleyResults(); return; }
    const r = this.finalResult(); this.result = r;
    const app = this.app, S = this.S;
    let rep;
    if (this.medley) rep = { drips: 0, first: false, beat: [], lost: [], newBest: false, milestones: [], goalBonus: 0 };
    else if (this.dropIn || !S) {
      const k = recKey(this.actId, this.hard), recs = app.save.records, prev = recs[k];
      rep = { drips: 0, first: !prev, newBest: !prev || r.score > prev.score, beat: [], lost: [], milestones: [], goalBonus: 0 };
      if (rep.newBest) recs[k] = { score: r.score, stars: Math.max(r.stars, prev?.stars ?? 0) }; else if (r.stars > prev.stars) prev.stars = r.stars;
      for (const c of recordsFor(this.actId)) (r.score > c.score ? rep.beat : rep.lost).push(c.id);
      app.save.write();
    } else { rep = applyResult(S, { id: this.actId, score: r.score, stars: r.stars, seconds: r.seconds, hard: this.hard }); app.commit(); }
    const d = app.save.data; d.practiced ??= {}; d.practiced[this.A.kind] = true;
    this.report = rep; this.starsShown = 0; this.rt = 0; this.dripsShown = 0;
    const first = rep.first;
    const kindLines = RESULT_FIRST[this.A.kind] ?? RESULT_FIRST.still;
    this.resultLine = first ? kindLines[Math.min(3, r.stars)] : pick(RESULT_REPEAT[Math.min(3, r.stars)], app.rng('result'));
    this.menu = new Menu([
      { label: 'Retry', onSelect: () => app.go('activity', { id: this.actId, hard: this.hard, dropIn: this.dropIn, skipIntro: true }) },
      ...(this.medley ? [] : [{ label: 'Next activity', onSelect: () => this.next() }]),
      { label: this.dropIn ? 'Back to the menu' : 'Back to the island', onSelect: () => this.leave() },
    ], { w: 170, rowH: 17, name: 'results', onMove: () => app.sfx('move', { volume: 0.4 }) });
    this.onResults?.(r, rep);
    if (this.stack.length) this.popTo(0);
    app.sfx(r.stars >= 2 ? 'fanfare2' : 'confirm');
  }
  openMedleyResults() {
    const app = this.app, m = app.medley, lanes = this.lanes ?? [];
    const scores = lanes.map((l, i) => { const g = l.kind === 'ghost' ? app.net?.ghosts.get(l.pid)?.s ?? l.driver.s : l.score; return norm(this.actId, g ?? 0); });
    m.record(this.event, scores); this.result = { score: scores[lanes.indexOf(this.me)] ?? 0, stars: 0 }; this.rt = 0; this.report = { drips: 0, goalBonus: 0, beat: [], lost: [], milestones: [] };
    this.menu = null; this.advanced = false;
    this.mySent = this.result.score;
    app.sfx('fanfare2');
  }
  medleyTick(dt) {
    const app = this.app, m = app.medley; this.rt += dt;
    if (!this.advanced && this.medleyNow() >= windowEnd(this.event) + 1) { this.advanced = true; app.medleyAdvance(this.event); }
  }
  next() {
    const idx = ACT_ORDER.indexOf(this.actId); const S = this.S;
    for (let k = 1; k <= ACT_ORDER.length; k++) {
      const id = ACT_ORDER[(idx + k) % ACT_ORDER.length];
      if (this.dropIn || !S || S.day >= ACTIVITIES[id].unlock || this.app.devUnlock) { this.app.go('activity', { id, hard: this.hard, dropIn: this.dropIn }); return; }
    }
    this.leave();
  }
  resultsTick(dt, nav) {
    this.rt += dt;
    const want = Math.min(this.result.stars, Math.floor(this.rt / 0.55));
    if (want > this.starsShown) { this.starsShown = want; this.app.sfx('starPop', { pitch: want * 2 }); this.starPopT = this.rt; }
    if (this.rt > 0.8 + this.result.stars * 0.55 && this.dripsShown < this.report.drips + this.report.goalBonus) { this.dripsShown = Math.min(this.report.drips + this.report.goalBonus, this.dripsShown + 1); this.app.sfx('drip', { pitch: this.dripsShown % 5 }); }
    if (this.rt > 1.2) this.menu.update(nav);
    if (nav.back && this.rt > 1.2) this.leave();
  }
  drawResults(hud) {
    const r = this.result, rep = this.report, w = hud.width;
    const pw = Math.min(w - 24, 300), ph = 162, x = Math.floor((w - pw) / 2), y = 6;
    panel(hud, x, y, pw, ph);
    say(hud, w / 2, y + 7, this.A.name, { anchor: 'c', color: 'teal', shadow: false, scale: this.A.name.length > 20 || pw < 290 ? 1 : 2 });
    drawStars(hud, Math.floor(w / 2 - 33), y + 24, this.starsShown, 3, { big: true });
    say(hud, w / 2, y + 42, String(r.score) + (this.A.unit ?? ''), { anchor: 'c', scale: 3, color: 'ink', shadow: false });
    if (rep.newBest && this.rt > 1) say(hud, w / 2, y + 66, 'New best', { anchor: 'c', color: 'orange', shadow: false });
    if (!this.dropIn && !this.medley) say(hud, w / 2, y + 76, `Drips +${this.dripsShown}${rep.goalBonus ? ' (goal +5)' : ''}`, { anchor: 'c', color: 'blue', shadow: false });
    const lines = wrap(this.resultLine || '', pw - 24, 1);
    lines.slice(0, 3).forEach((l, i) => say(hud, w / 2, y + 88 + i * 10, l, { anchor: 'c', color: 'ink', shadow: false }));
    recordsFor(this.actId).forEach((c, i) => {
      const beat = rep.beat.includes(c.id);
      say(hud, x + 14, y + 124 + i * 11, c.name, { color: 'slate', shadow: false });
      say(hud, x + pw - 14, y + 124 + i * 11, `${c.score}${beat ? ' beaten' : ''}`, { anchor: 'r', color: beat ? 'green' : 'slate', shadow: false });
    });
    layoutLog.add('results', x, y, pw, ph);
    if (this.rt > 1.2) { this.menu.o.x = Math.floor((w - 170) / 2); this.menu.o.y = y + ph + 10; this.menu.draw(hud); }
    if (rep.milestones.length && this.rt > 1.4) { const m = rep.milestones[0]; sayWrapped(hud, 14, hud.height - 40, `Jar: ${m.name}`, w - 28, { color: 'sand' }); }
    if (hud.height >= 250) drawPrompts(this.app, hud, [['confirm', 'Choose']]);
  }
  // ---------- drawing ----------
  draw(hud, ctx) {
    const w = hud.width;
    if (this.phase === 'results') { if (this.medley) this.drawMedleyResults(hud); else this.drawResults(hud); return; }
    if (this.phase === 'wait') { this.drawWait(hud); return; }
    this.drawStage?.(hud, ctx);
    if (this.phase === 'intro') this.drawCard(hud);
    else if (this.phase === 'countdown') {
      const n = Math.max(1, Math.ceil((this.app.attract ? 1.5 : 3) - this.phaseT));
      say(hud, w / 2, hud.height / 2 - 20, String(n), { anchor: 'c', scale: 8, color: 'white', shadow: 'navy' });
    } else if (this.phase === 'practice') {
      say(hud, w / 2, hud.height - 44, `Practice  ${Math.ceil(8 - this.phaseT)}`, { anchor: 'c', color: 'sand' });
    } else if (this.phase === 'play' && this.phaseT < 1.2) say(hud, w / 2, hud.height / 2 - 14, 'Go', { anchor: 'c', scale: 6, color: 'lime', shadow: 'navy' });
    if (this.phase === 'play' || this.phase === 'practice') {
      this.drawPlay?.(hud, ctx);
      if (!this.app.attract) drawPrompts(this.app, hud, this.controls());
    }
  }
  drawWait(hud) {
    const w = hud.width, left = Math.max(0, windowStart(this.event) - this.medleyNow());
    say(hud, w / 2, 40, `Event ${this.event + 1} of 3`, { anchor: 'c', color: 'white', scale: 2, shadow: 'navy' });
    say(hud, w / 2, 62, this.A.name, { anchor: 'c', color: 'sand', scale: 2 });
    say(hud, w / 2, hud.height / 2, left > 0.5 ? String(Math.ceil(left)) : 'Go', { anchor: 'c', scale: 6, color: 'white', shadow: 'navy' });
  }
  drawMedleyResults(hud) {
    const m = this.app.medley, w = hud.width, pw = Math.min(w - 24, 300), x = Math.floor((w - pw) / 2);
    panel(hud, x, 14, pw, 40 + this.lanes.length * 18 + 20);
    say(hud, w / 2, 22, `Event ${this.event + 1}: ${this.A.name}`, { anchor: 'c', color: 'teal', shadow: false });
    const tot = m.totals();
    this.lanes.forEach((l, i) => { const y = 42 + i * 18; say(hud, x + 12, y, l.name, { color: 'ink', shadow: false }); say(hud, x + pw - 90, y, String(m.scores[this.event][i]), { anchor: 'r', color: 'blue', shadow: false }); say(hud, x + pw - 12, y, String(tot[i]), { anchor: 'r', color: 'ink', shadow: false }); });
    say(hud, x + pw - 90, 30, 'Event', { anchor: 'r', color: 'slate', shadow: false }); say(hud, x + pw - 12, 30, 'Total', { anchor: 'r', color: 'slate', shadow: false });
    say(hud, w / 2, hud.height - 40, this.event < 2 ? 'Next event soon.' : 'Counting medals.', { anchor: 'c', color: 'white' });
  }
  drawCard(hud) {
    const w = Math.min(hud.width - 24, 280), h = 104, x = Math.floor((hud.width - w) / 2), y = Math.floor(hud.height / 2) - 52;
    panel(hud, x, y, w, h);
    say(hud, x + 10, y + 8, this.A.name, { color: 'teal', shadow: false, scale: this.A.name.length > 18 ? 1 : 2 });
    sayWrapped(hud, x + 10, y + 28, this.goal(), w - 20, { color: 'ink', shadow: false, lineGap: 10 });
    if (this.hard) say(hud, x + w - 10, y + 8, 'HARD', { anchor: 'r', color: 'orange', shadow: false });
    drawPrompts(this.app, hud, [...this.controls(), ['confirm', 'Start']], { y: y + h - 22 });
    layoutLog.add('card', x, y, w, h);
  }
  status() { return `activity ${this.actId} | ${this.phase} | t ${this.playT.toFixed(1)} | score ${Math.round(this.scoreNow?.() ?? 0)}`; }
  extraState() { return { act: this.actId, hard: this.hard, score: Math.round(this.scoreNow?.() ?? 0), result: this.result, report: this.report && { drips: this.report.drips, first: this.report.first } }; }
  /** Debug/test hooks. */
  finishNow(stars = 3) { this.forcedStars = stars; this.setPhase('results'); }
}
