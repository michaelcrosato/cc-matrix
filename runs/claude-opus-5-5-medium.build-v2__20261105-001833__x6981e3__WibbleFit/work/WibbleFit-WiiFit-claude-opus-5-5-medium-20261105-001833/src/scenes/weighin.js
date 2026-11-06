// The Morning Weigh-In: "Ow.", a balance test, one absurd question, today's Wobble Age.
import { applySky, skyAt, THREE } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { buildPlaza } from '../art/island.js';
import { place } from '../art/stage.js';
import { makeDriver } from '../core/drivers.js';
import { Dot } from '../core/dot.js';
import { blankInput, LocalDriver } from '../core/drivers.js';
import { recordTest, scheduleDay, shownAge } from '../core/progress.js';
import { T } from '../core/tunables.js';
import { AVATARS } from '../data/classmates.js';
import { BARKS, QUESTIONS, STORY } from '../data/lines.js';
import { weekDay } from '../data/week.js';
import { talk } from '../ui/dialogue.js';
import { center, plate, say, wrap } from '../ui/font.js';
import { Menu } from '../ui/menu.js';
import { promptBar } from '../ui/prompts.js';
import { chart, dial, panel } from '../ui/widgets.js';
import { BaseScene } from './base.js';

// The three tests. Pure, so tests can run them with bots.
export class WeighTest {
  t = 0; done = false; T01 = 0; inT = 0; dist = 0; n = 0; idx = 0; holdT = 0; lean = []; started = 0;
  constructor(kind, env, rng) {
    this.kind = kind; this.env = env; this.rng = rng; this.dot = new Dot(() => rng.next());
    this.seconds = kind === 'stillness' ? 14 : kind === 'chase' ? 14 : 15;
    if (kind === 'lean') {
      const pct = (p) => (p / 100) * 1.0;
      this.targets = [{ x: -pct(50), y: 0, label: '50% left' }, { x: pct(70), y: 0, label: '70% right' }, { x: 0, y: pct(60), label: '60% forward' }];
    }
    this.ring = 0.3;
  }
  tx() { if (this.kind === 'chase') return { x: Math.sin(this.t * 0.7) * 0.5, y: Math.sin(this.t * 1.05 + 0.6) * 0.42 }; if (this.kind === 'lean') return this.targets[Math.min(this.idx, 2)]; return { x: 0, y: 0 }; }
  step(dt, u) {
    this.t += dt;
    this.dot.step(dt, u.x, u.y, T, { noise: this.env.noiseMul });
    if (this.env.god) { const t = this.tx(); this.dot.x = t.x; this.dot.y = t.y; }
    if (this.kind === 'stillness') { if (this.dot.dist() <= this.ring * this.env.ringMul) this.inT += dt; this.T01 = this.inT / Math.max(this.t, 0.001); }
    if (this.kind === 'chase') { const t = this.tx(); this.dist += Math.hypot(this.dot.x - t.x, this.dot.y - t.y) * dt; this.T01 = Math.max(0, 1 - (this.dist / this.t) * 2); }
    if (this.kind === 'lean') {
      const t = this.targets[this.idx];
      if (t) {
        const dd = Math.hypot(this.dot.x - t.x, this.dot.y - t.y);
        if (dd <= 0.1 * this.env.ringMul / T.ringScale + 0.0) this.holdT += dt; else this.holdT = Math.max(0, this.holdT - dt * 0.5);
        if (this.holdT >= 1.5) { this.idx++; this.holdT = 0; this.lean.push(this.t); }
      }
      this.T01 = this.idx >= 3 ? Math.max(0.2, 1 - (this.t - 4.5) / this.seconds) : (this.idx / 3) * 0.4;
    }
    if (this.t >= this.seconds || (this.kind === 'lean' && this.idx >= 3)) this.done = true;
  }
  bot(driver, out, dt) { const t = this.tx(); driver.brain.lean(this.dot, t.x, t.y, dt, out); }
}
export class WeighInScene extends BaseScene {
  id = 'weighin'; canPause = true; part = 'arrive'; partT = 0; age = 0; shownRoll = 0; out = blankInput(); spin = 0;
  camera() { return { preset: 'fixed', position: [-1.7, 2.1, 5.8], target: [-1.1, 1.15, 0], fov: 34 }; }
  async build(ctx) {
    this.ctx = ctx;
    this.world = await buildPlaza(ctx, { jar: false });
    applySky(ctx.engine, skyAt(this.args.attract ? 9 : 8.5));
    App.music('plaza');
    this.b = place(ctx, 'ounce', 0, 0, 0, { actors: true, scale: 1.6 });
    this.needle = this.b.object.getObjectByName('needle'); this.b.object.rotation.y = -0.3;
    this.av = await makeAvatar(ctx, App.slot?.look ?? AVATARS[0]);
    this.av.setAt(2.2, 0, -0.25, -Math.PI / 2); this.av.play('Walk');
    const slot = App.slot;
    this.day = slot ? scheduleDay(slot.day) : 1;
    this.kind = this.args.attract ? ['stillness', 'lean', 'chase'][App.attractLoops % 3] : weekDay(this.day).test;
    this.test = new WeighTest(this.kind, App.simEnv(ctx), ctx.random.fork('test'));
    this.playerRng = ctx.random.fork('bot');
    this.driver = App.playerDriver(this.playerRng) ?? new LocalDriver(App.lanesEnv(ctx));
    this.first = slot && slot.tests.length === 0;
    if (slot && !this.first) App.barkLine(this.cosmetic.pick(BARKS.morning), 'ounce', 3);
  }
  onDriverChange() { this.driver = App.playerDriver(this.playerRng) ?? new LocalDriver(App.lanesEnv(this.ctx)); }
  setPart(p) { this.part = p; this.partT = 0; }
  tick(ctx, dt) {
    if (App.blocked()) return;
    this.partT += dt;
    if (this.part === 'test') {
      this.driver.read(this.out, this.test, dt);
      this.test.step(dt, this.out);
      if (this.test.done) { App.sfx('chimeIn'); this.afterTest(ctx); }
    }
  }
  frame(ctx, dt, rdt, free) {
    this.av.update(dt); this.world.update(ctx, dt);
    const a = this.av;
    const needleTo = (r) => { if (this.needle) this.needle.rotation.y = Math.PI + r; };
    if (this.part === 'arrive') {
      a.root.position.x = Math.max(1.05, 2.2 - this.partT);
      if (this.partT > 1.2) { a.play('StepOn', { once: true }); this.setPart('stepon'); }
    } else if (this.part === 'stepon') {
      if (this.partT > 0.75) {
        a.play('StandOn'); a.setAt(0.62, 0.2, -0.3, 0); a.groundY = 0.48; App.sfx('ow');
        this.b.object.scale.y = 1.6 * 0.86; this.setPart('ow');
        const line = this.cosmetic.pick(BARKS.ow);
        if (this.first && !this.args.attract) talk(STORY.ferryIntro.slice(0, 3).concat({ who: 'ounce', mood: 'wince', text: line }).concat(STORY.ferryIntro.slice(3)), () => this.startTest());
        else App.barkLine(line, 'ounce', 1.2);
      }
    } else if (this.part === 'ow') {
      this.b.object.scale.y += (1.6 - this.b.object.scale.y) * Math.min(1, dt * 6);
      if (this.partT > 1.1 && !App.top()) this.startTest();
    } else if (this.part === 'test') {
      a.lean.x = this.test.dot.x; a.lean.y = this.test.dot.y;
      needleTo(this.test.dot.x * 1.2);
    } else if (this.part === 'reveal') {
      const k = Math.min(1, this.partT / 2.2);
      this.spin += dt * (30 * (1 - k) + 0.5);
      needleTo(this.spin);
      if (Math.floor(this.partT * 18) !== this.tickN && k < 1) { this.tickN = Math.floor(this.partT * 18); App.sfx('needleTick'); }
      const shown = this.shownAge;
      this.roll = k < 1 ? Math.round(this.cosmetic.range(18, 96)) : shown;
      if (k >= 1 && !this.revealed) {
        this.revealed = true; App.sfx('chimeIn');
        App.barkLine(this.revealLine(), 'ounce', 4);
      }
      if (this.revealed && (this.partT > 8 || (free && this.partT > 2.6 && ctx.input.wasPressed('PadCross', 'Enter', 'Space', 'MouseLeft')))) this.leave();
    }
    if (this.args.attract && this.part === 'question') this.afterQuestion(0);
  }
  startTest() {
    if (this.part === 'test') return;
    this.setPart('test');
    App.barkLine(this.kind === 'stillness' ? 'Stand still. I will close my eyes. You will, too.' : this.kind === 'lean' ? 'Lean to each mark. Hold it there.' : 'Follow the orange circle. It knows where it is going.', 'ounce', 2.6);
  }
  afterTest(ctx) {
    this.T01 = this.test.T01;
    this.setPart('question');
    const slot = App.slot;
    if (this.args.attract) return;
    const q = QUESTIONS[(this.day - 1) % QUESTIONS.length];
    if (slot && slot.tests.length === 0 && !this.askedOld) this.askOld(() => this.ask(q)); else this.ask(q);
  }
  askOld(next) {
    this.askedOld = true;
    App.open(new OldPicker((v) => { this.felt = v; next(); }));
  }
  ask(q) {
    App.say(q.q, 'ounce');
    const items = q.a.map((label, i) => ({ label, on: () => { App.close(this.qo); this.answered(q, i); } }));
    this.qo = { id: 'question', menu: new Menu({ title: null, subtitle: null, items, scale: 2, y: 104 }), q: q.q, update(c, d) { this.menu.update(c, d); }, draw(h) {
      const ls = wrap(this.q, 52); const w = Math.min(h.width - 24, 330), x = (h.width - w) / 2;
      panel(h, x, 64, w, 12 + ls.length * 10, 'white', 'teal'); ls.forEach((l, i) => say(h, x + 8, 70 + i * 10, l, { color: 'ink', shadow: false }));
      this.menu.draw(h); promptBar(h, [['confirm', 'Answer']]);
    } };
    App.open(this.qo);
  }
  answered(q, i) {
    if (App.slot) { App.slot.answers[this.day] = i; }
    talk([{ who: 'ounce', mood: 'flat', text: q.r[i] }], () => this.afterQuestion());
  }
  afterQuestion() {
    const slot = App.slot;
    let age = 40;
    if (this.args.attract) age = 31; else if (slot) { const prev = slot.chart[slot.chart.length - 1]; age = recordTest(slot, this.T01); this.prev = prev; slot.phase = 'free'; App.writeSave(); }
    this.age = age; this.shownAge = slot && !this.args.attract ? shownAge(slot, age) : age + 7;
    this.setPart('reveal'); this.revealed = false; this.spin = 0;
  }
  revealLine() {
    const age = this.shownAge, slot = App.slot;
    if (this.felt !== undefined) { const f = this.felt; this.felt = undefined; return `You said ${f}. Your Wobble Age is ${age}. Is that close? No? I'm so sorry.`; }
    if (this.prev !== undefined && slot) { if (this.age === this.prev) return `${age}. ${BARKS.sameAge[0]}`; if (this.age < this.prev) return `${age}. ${BARKS.betterAge[this.day % 2]}`; return `${age}. ${BARKS.worseAge[this.day % 2]}`; }
    return this.cosmetic.pick(BARKS.reveal).replace('{age}', age);
  }
  leave() { if (this.leaving) return; this.leaving = true; App.go('hub', { at: [0, 0.1, 6.5] }); }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    if (App.top() && App.top().id !== 'pause') { /* dialogue over the scene */ }
    if (this.part === 'test') {
      const s = this.test, eyes = this.kind === 'stillness' && s.t > 3;
      const r = Math.min(62, Math.floor(H * 0.24)), dx = Math.round(W * 0.24);
      App.dialCenter.x = dx; App.dialCenter.y = 20 + r;
      const t = this.kind === 'stillness' ? null : { ...s.tx(), r: this.kind === 'lean' ? 0.12 : 0.14 };
      dial(hud, dx, 20 + r, r, { ringR: 0.3 * App.simEnv(ctx).ringMul, x: s.dot.x, y: s.dot.y, inside: s.dot.dist() <= 0.3, hideRing: eyes || this.kind !== 'stillness', hideDot: eyes, target: t });
      const label = eyes ? 'Eyes closed.' : this.kind === 'stillness' ? 'Keep it in the circle.' : this.kind === 'lean' ? (s.targets[s.idx]?.label ?? 'Thank you.') : 'Follow the orange circle.';
      plate(hud, dx - (label.length * 3), 30 + 2 * r, label, { color: 'white' });
      if (!App.top() && !App.attract) promptBar(hud, [['lean', 'Lean'], ['pause', 'Pause']]);
    } else if (this.part === 'reveal') {
      const px = Math.max(12, Math.round(W * 0.24 - 90));
      panel(hud, px, 18, 180, 62, 'white', 'teal');
      say(hud, px + 30, 24, 'Wobble Age', { color: 'teal', shadow: false, scale: 2 });
      const rt = String(this.roll ?? '?'); say(hud, px + 90 - rt.length * 12, 44, rt, { color: this.revealed ? 'red' : 'slate', shadow: false, scale: 4 });
      if (this.revealed && !App.attract) {
        const c = App.slot?.chart ?? [];
        if (c.length > 1 && H > 260) chart(hud, Math.max(12, Math.round(W * 0.24 - 90)), 84, 180, 70, c.map((v) => shownAge(App.slot, v)));
        promptBar(hud, [['confirm', 'Thank you']]);
      }
    }
  }
  barkY(hud) { return hud.height - 66; }
  status() { return `weighin | ${this.part} | ${this.kind} | T ${(this.test?.T01 ?? 0).toFixed(2)}`; }
  fingerprint() { return `${this.part}|${(this.test?.t ?? 0).toFixed(3)}`; }
  debugDot() { return this.test ? `${this.test.dot.x.toFixed(2)},${this.test.dot.y.toFixed(2)}` : '-'; }
}
class OldPicker {
  id = 'howold'; v = 38; t = 0;
  constructor(done) {
    this.done = done; App.say(STORY.howOld.text, 'ounce');
    this.menu = new Menu({ items: [{ label: 'I feel', value: () => this.v, adjust: (d) => { this.v = Math.max(5, Math.min(120, this.v + d)); } }, { label: 'That\'s it', on: () => { App.close(this); this.done(this.v); } }], scale: 2, y: 104 });
  }
  update(ctx, dt) { this.t += dt; this.menu.update(ctx, dt); }
  draw(h) {
    const w = Math.min(h.width - 24, 330), x = (h.width - w) / 2;
    panel(h, x, 64, w, 24, 'white', 'teal'); say(h, x + 8, 72, STORY.howOld.text, { color: 'ink', shadow: false });
    this.menu.draw(h); promptBar(h, [['adjust', 'Change'], ['confirm', 'Confirm']]);
  }
}
void makeDriver; void THREE;
