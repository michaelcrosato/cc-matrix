// The morning Weigh-In: balance test, one absurd question, today's Wobble Age.
import { BaseScene } from './base.js';
import { makeAvatar, playerLook } from '../art/avatar.js';
import { place } from '../art/world.js';
import { Dot } from '../core/dot.js';
import { LocalDriver, BotDriver, blank } from '../core/drivers.js';
import { T } from '../core/tunables.js';
import { trueAge, totalStars, shownAge } from '../core/progress.js';
import { Menu, disc, ring, line, panel, layoutLog } from '../ui/widgets.js';
import { say, sayWrapped } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { dayOf, WEEK } from '../data/week.js';
import { QUESTIONS, questionFor } from '../data/questions.js';
import { MORNING_REMARKS, WEIGH_REMARKS, FEELING, FILE_REMARKS, ANSWER_REMARKS, CONCERNS, pick } from '../data/lines.js';
import { tileFloor, slab } from '../art/world.js';
import { applySky, skyAt, THREE } from '../../pixel-engine.js';

const TARGETS = [{ x: -0.7, y: 0, label: '70% left' }, { x: 0, y: 0.55, label: '55% forward' }, { x: 0.6, y: -0.3, label: '60% right' }];
export const TEST_SECS = { still: 14, lean: 15, chase: 14 };

export class WeighInScene extends BaseScene {
  static id = 'weighin';
  static camera = { preset: 'fixed', position: [0, 1.7, 5.4], target: [0, 1.15, 0], fov: 30 };
  constructor(app, args) { super(app, args); this.phase = 'intro'; this.skill = args.skill ?? (app.attract ? 'expert' : null); this.pt = 0; this.stage = 0; this.T = 0; this.feel = 40; this.ageRoll = 0; this.reveal = null; this.attractOK = false; }
  get S() { return this.app.slot; }
  async build(ctx) {
    const S = this.S, day = S?.day ?? 1; this.day = day; this.kind = dayOf(day).test;
    applySky(ctx.engine, skyAt(8));
    tileFloor(ctx, 14, 10, [0, 0, 1]); slab(ctx, [30, 0.2, 10], [0, -0.1, -5], 'cyan');
    const om = place(ctx, 'ounce', [0, 0, 0], { scale: 2.3 }); this.ounce = om.object; this.needle = this.ounce.getObjectByName('needle');
    this.av = await makeAvatar(ctx, playerLook(S)); this.av.root.scale.setScalar(0.5); this.av.setPos(-0.55, 0, 1.25, 0.3); this.av.addTo(ctx.scene); this.av.play('Idle');
    const r = ctx.random.fork('wi'); this.dot = new Dot(() => r.range(0, 1));
    this.driver = this.skill ? new BotDriver(this.skill, () => r.range(0, 1)) : new LocalDriver(this.app); this.inp = blank();
    this.app.music('plaza');
    this.start();
  }
  setDriver(skill) { const r = this.ctx.random.fork('wi2'); this.driver = skill === 'local' ? new LocalDriver(this.app) : new BotDriver(skill, () => r.range(0, 1)); this.skill = skill === 'local' ? null : skill; }
  async start() {
    const app = this.app, day = this.day, d = dayOf(day);
    if (app.attract) { this.beginTest(); return; }
    this.phase = 'intro';
    const lines = day === 1 ? [...d.beat, { who: 'ounce', text: 'This dot is you. Keep it in the circle. That\'s it. That\'s the game. Everything else is decoration.' }] : [{ who: 'ounce', text: pick(MORNING_REMARKS, app.rng('wm')) }, { who: 'ounce', text: 'Please step on me.' }];
    this.av.play('StepUp', { loop: false });
    app.sfx('ow');
    await app.dialogue.play(lines);
    this.beginTest();
  }
  beginTest() {
    this.phase = 'test'; this.pt = 0; this.dot.reset(); this.tin = 0; this.tn = 0; this.stage = 0; this.hold = 0; this.dsum = 0; this.dn = 0; this.leanT = 0; this.done = false;
    this.av.play('Idle');
    this.app.dialogue.queue.length = 0;
    this.bark('ounce', this.kind === 'still' ? 'Keep the dot in the circle.' : this.kind === 'lean' ? 'Reach each target and hold it.' : 'Follow the target. Gently.');
  }
  target(t = this.pt) {
    if (this.kind === 'lean') return TARGETS[Math.min(this.stage, 2)];
    if (this.kind === 'chase') return { x: 0.62 * Math.sin(0.55 * t), y: 0.5 * Math.sin(0.83 * t + 1) };
    return { x: 0, y: 0 };
  }
  fixed(ctx, dt) {
    if (this.phase !== 'test') return;
    this.pt += dt;
    const tg = this.target(), d = this.driver;
    d.dial && (d.dial.x = this.ctx.hud.width / 2, d.dial.y = this.ctx.hud.height / 2 - 14);
    d.observe?.(this.dot, this.pt); d.tx = tg.x; d.ty = tg.y;
    d.read(this.inp, ctx, dt, this.pt);
    this.dot.step(dt, this.inp.x, this.inp.y, T, { noise: this.app.noise() });
    const dist = Math.hypot(this.dot.x - tg.x, this.dot.y - tg.y);
    if (this.kind === 'still') { if (this.pt > 1) { this.tn++; if (Math.hypot(this.dot.x, this.dot.y) <= this.app.ring(0.3)) this.tin++; } }
    else if (this.kind === 'chase') { if (this.pt > 1) { this.dsum += dist; this.dn++; } }
    else { if (dist <= 0.1) { this.hold += dt; if (this.hold >= 1.5) { this.stage++; this.hold = 0; this.app.sfx('chimeIn'); if (this.stage >= 3) this.finishTest(); } } else this.hold = Math.max(0, this.hold - dt * 0.5); }
    if (this.pt >= TEST_SECS[this.kind] && !this.done) this.finishTest();
  }
  finishTest() {
    if (this.done) return; this.done = true;
    let Tv;
    if (this.kind === 'still') Tv = this.tn ? this.tin / this.tn : 0;
    else if (this.kind === 'chase') Tv = Math.max(0, Math.min(1, 1 - (this.dn ? this.dsum / this.dn : 1) * 2));
    else { const base = 4.5 + this.stage * 0; Tv = this.stage >= 3 ? Math.max(0.15, Math.min(1, 1 - (this.pt - 5) / 10)) : 0.1 + this.stage * 0.1; }
    this.T = Tv; this.phase = 'question'; this.app.sfx('confirm');
    const qi = questionFor(this.day), Q = QUESTIONS[qi];
    this.qi = qi;
    this.qmenu = new Menu(Q.a.map((a, i) => ({ label: a, onSelect: () => this.answer(i) })), { w: 240, rowH: 19, title: '', name: 'question', onMove: () => this.app.sfx('move', { volume: 0.4 }) });
    if (this.app.attract) this.answer(0);
  }
  async answer(i) {
    const app = this.app, S = this.S;
    this.phase = 'asked'; S.questions[this.qi] = i;
    S.tests.push(this.T);
    const lines = [{ who: 'ounce', text: ANSWER_REMARKS[this.qi][i] }, { who: 'ounce', text: pick(FILE_REMARKS, app.rng('fr')) }];
    if (this.qi === 6 && i === 2) lines.splice(0, 1, { who: 'ounce', text: 'It\'s all graded.', mood: 'whip' });
    if (!app.attract) await app.dialogue.play(lines);
    if (this.day === 1 && !app.attract) { this.phase = 'feel'; return; }
    this.doReveal();
  }
  async doReveal() {
    const app = this.app, S = this.S;
    const prevShown = S.ages.length ? S.ages[S.ages.length - 1] : null;
    const t = trueAge(S.tests, totalStars(S)), shown = t + (S.confessed ? 0 : 7);
    S.trueAges.push(t); S.ages.push(shown);
    this.reveal = { shown, t, prev: prevShown }; this.phase = 'reveal'; this.rv = 0;
    app.moodNow = 'spin'; app.sfx('whirr');
    if (app.attract) { this.rv = 99; }
  }
  async finishReveal() {
    const app = this.app, S = this.S, r = this.reveal;
    if (app.attract) return;
    app.moodNow = 'neutral';
    let text;
    if (r.prev === null || this.day === 1) text = pick(WEIGH_REMARKS.first, app.rng('wf')).replace('{n}', r.shown);
    else text = r.shown < r.prev ? pick(WEIGH_REMARKS.better, app.rng('wb')) : r.shown > r.prev ? pick(WEIGH_REMARKS.worse, app.rng('wb')) : pick(WEIGH_REMARKS.same, app.rng('wb'));
    this.phase = 'after';
    if (!app.attract) {
      const lines = [];
      if (this.day === 1 && this.feelUsed != null) lines.push({ who: 'ounce', text: pick(FEELING, app.rng('fe')).replace('{n}', this.feelUsed) });
      lines.push({ who: 'ounce', text });
      lines.push({ who: 'ounce', text: `Today's concern: ${pick(CONCERNS, app.rng('cn'))}. I've been concerned all night.` });
      await app.dialogue.play(lines);
      const beat = dayOf(this.day).beat;
      if (this.day >= 2 && S.beatDay !== this.day) { S.beatDay = this.day; await app.dialogue.play(beat); }
    }
    S.phase = 'free'; S.intro = true; S.beatDay = this.day; S.weighed = this.day;
    app.commit();
    app.go('hub');
  }
  tick(ctx, dt, blocked) {
    const nav = this.app.nav;
    this.av.update(dt); this.world?.update?.(dt);
    if (this.needle) { const a = this.phase === 'reveal' ? (this.rv < 2.5 ? this.t * 14 : 0) : this.phase === 'test' ? Math.sin(this.t * 3) * 0.6 : Math.sin(this.t * 2) * 0.3; this.needle.rotation.y = Math.PI + a; }
    if (this.phase === 'question' && !blocked) { this.qmenu.update(nav); }
    if (this.phase === 'feel' && !blocked) {
      if (nav.up || nav.right) this.feel = Math.min(99, this.feel + 1); if (nav.down || nav.left) this.feel = Math.max(10, this.feel - 1);
      if (nav.wheel) this.feel = Math.max(10, Math.min(99, this.feel - Math.sign(nav.wheel)));
      if (nav.confirm || nav.click) { this.feelUsed = this.feel; this.app.sfx('confirm'); this.doReveal(); }
    }
    if (this.phase === 'reveal') {
      this.rv += dt; this.ageRoll = this.rv < 2.5 ? Math.round(20 + Math.sin(this.rv * 9) * 20 + (this.rv * 20)) : this.reveal.shown;
      if (this.rv >= 3.2 && !this.revealDone) { this.revealDone = true; this.app.sfx('starPop'); this.finishReveal(); }
    }
    if (this.phase === 'test' && this.app.attract && this.t > 12) this.finishTest();
    if (!blocked && this.phase === 'test' && nav.pause && !this.app.session) { /* no pause here; the test is short */ }
  }
  draw(hud) {
    const w = hud.width, cx = Math.floor(w / 2), cy = Math.floor(hud.height / 2) - 14;
    const S = this.S;
    if (this.phase === 'test') {
      const R = 52, sc = R / 1.3, tg = this.target(), eyes = this.kind === 'still' && this.pt > 3;
      this.driver.dial && (this.driver.dial.x = cx, this.driver.dial.y = cy);
      disc(hud, cx, cy, R, 'night'); ring(hud, cx, cy, R, 'slate', 2);
      hud.rect(cx - R + 4, cy, R * 2 - 8, 1, 'navy'); hud.rect(cx, cy - R + 4, 1, R * 2 - 8, 'navy');
      if (!eyes) {
        if (this.kind === 'still') ring(hud, cx, cy, Math.round(this.app.ring(0.3) * sc), Math.hypot(this.dot.x, this.dot.y) <= this.app.ring(0.3) ? 'lime' : 'red', 2);
        else ring(hud, Math.round(cx + tg.x * sc), Math.round(cy - tg.y * sc), Math.round(0.1 * sc) + 2, 'lime', 2);
        const px = Math.round(cx + this.dot.x * sc), py = Math.round(cy - this.dot.y * sc); disc(hud, px, py, 4, 'ink'); disc(hud, px, py, 3, 'sand');
      } else say(hud, cx, cy - 4, 'Eyes closed.', { anchor: 'c', color: 'mist' });
      if (this.kind === 'lean') say(hud, cx, cy + R + 6, `${tg.label}  ${this.stage + 1}/3`, { anchor: 'c', color: 'white' });
      const left = Math.max(0, TEST_SECS[this.kind] - this.pt);
      say(hud, w - 12, 12, `${Math.ceil(left)}s`, { anchor: 'r', color: 'white', scale: 2 });
      say(hud, 12, 12, this.kind === 'still' ? 'Stillness' : this.kind === 'lean' ? 'Lean' : 'Chase', { color: 'white', scale: 2 });
      drawPrompts(this.app, hud, [['lean', 'Lean']]);
    } else if (this.phase === 'question' && this.qmenu) {
      const Q = QUESTIONS[this.qi]; panel(hud, 20, 24, w - 40, 30);
      sayWrapped(hud, 28, 31, Q.q, w - 56, { color: 'ink', shadow: false });
      this.qmenu.o.y = 70; this.qmenu.draw(hud);
      drawPrompts(this.app, hud, [['confirm', 'Answer']]);
    } else if (this.phase === 'feel') {
      panel(hud, cx - 110, 26, 220, 100);
      say(hud, cx, 36, 'How old do you feel?', { anchor: 'c', color: 'ink', shadow: false });
      say(hud, cx, 52, 'This is not binding.', { anchor: 'c', color: 'slate', shadow: false });
      say(hud, cx, 76, String(this.feel), { anchor: 'c', scale: 4, color: 'teal', shadow: false });
      drawPrompts(this.app, hud, [['select', 'Adjust'], ['confirm', 'Done']]);
    } else if (this.phase === 'reveal') {
      panel(hud, cx - 90, 26, 180, 76);
      say(hud, cx, 34, 'Your Wobble Age', { anchor: 'c', color: 'slate', shadow: false });
      say(hud, cx, 52, String(this.ageRoll), { anchor: 'c', scale: 5, color: 'ink', shadow: false });
    }
  }
  status() { return `weighin | ${this.phase} | day ${this.day} | ${this.kind} | T ${this.T.toFixed(2)}`; }
  extraState() { return { test: this.kind, T: this.T, reveal: this.reveal }; }
  fingerprint() { return `wi:${this.phase}:${this.dot.x.toFixed(3)},${this.dot.y.toFixed(3)}:${this.stage}`; }
}
