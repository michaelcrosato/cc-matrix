// The Morning Weigh-In: balance test, one absurd question, today's Wobble Age.
import { App } from '../app.js';
import { Dot } from '../core/dot.js';
import { BotBrain, LocalDriver, blankInput } from '../core/drivers.js';
import { T } from '../core/tunables.js';
import { recordWeighIn, dayData } from '../core/week.js';
import { Ounce } from '../art/props.js';
import { makeAvatar } from '../art/avatar.js';
import { AGE_LINES, INTRO_LINES, MORNINGS, OW_JOKE, OW_LINES } from '../data/lines.js';
import { AGE_QUESTION, QUESTIONS } from '../data/questions.js';
import { TESTS } from '../data/week.js';
import { DialogueScreen } from '../ui/dialogue.js';
import { sayCentered, wrap, charsIn } from '../ui/font.js';
import { Menu } from '../ui/menu.js';
import { ABOVE_PROMPTS } from '../ui/layout.js';
import { promptBar } from '../ui/prompts.js';
import { bar, drawDial, panel } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';
import { withWardrobe } from './activity/lanes.js';

export const TEST_SECONDS = { stillness: 14, lean: 15, chase: 13 };
const LEAN_TARGETS = [{ x: -0.7, y: 0, label: '70% left' }, { x: 0.5, y: 0, label: '50% right' }, { x: 0, y: 0.6, label: 'Lean forward' }];
const HOLD_NEEDED = 1.5;
const RING = 0.3;
const ONSCALE_Y = 0.36; // the top of Ounce's plate, at this scale
const ONSCALE_Z = -0.3;

export function testT(kind, st) {
  switch (kind) {
    case 'stillness': return st.n ? st.in / st.n : 0;
    case 'lean': {
      const part = st.targetsDone / LEAN_TARGETS.length;
      const quick = st.targetsDone === LEAN_TARGETS.length ? Math.max(0, 1 - (st.doneAt - 6) / 9) : 0;
      return Math.max(0, Math.min(1, part * 0.6 + quick * 0.4));
    }
    case 'chase': return Math.max(0, Math.min(1, 1 - (st.n ? st.dist / st.n : 1) * 2));
    default: return 0;
  }
}

export class WeighInScene extends BaseScene {
  name = 'weighin';
  id = 'weighin';
  canPause = true;
  pauseToTitle = true;
  phase = 'greet';
  testT = 0;
  inp = blankInput();
  driver = new LocalDriver();

  // Ounce and you stand right of centre; the huge HUD dial takes the left.
  cameraConfig() { return { preset: 'fixed', position: [-1.05, 1.95, 4.9], target: [-1.05, 1.05, 0], fov: 30 }; }

  get test() { return this.args.test ?? dayData(App.slot).test; }

  async build(ctx) {
    plazaSet(ctx, 9);
    const slot = App.slot;
    this.rng = ctx.random.fork('test');
    this.ounce = new Ounce(ctx, { at: [0, 0.04, 0], scale: 1.15 });
    this.avatar = await makeAvatar(ctx, withWardrobe(slot.look, slot), { at: [0.1, 0, 2.2], yaw: 3.1, clip: 'Walk' });
    this.dot = new Dot(() => this.rng.next());
    this.st = { in: 0, n: 0, dist: 0, targetsDone: 0, holdT: 0, doneAt: 15 };
    this.groupT = 0;
    App.music('title');
    this.step('walkOn');
    this.ownStep = 0;
    this.feelAge = 34;
    if (slot.week > 1) this.test2 = TESTS[(slot.day + slot.week) % TESTS.length];
  }

  step(phase) { this.phase = phase; this.phaseT = 0; }

  get auto() { return App.dev.autopilot; }
  barkBottom() { return ABOVE_PROMPTS; }

  isFirstMorning() {
    const slot = App.slot;
    return slot.day === 1 && slot.week === 1 && !slot.introHeard;
  }

  stepOn() {
    this.avatar.play('StepOn', { once: true, fade: 0.1 });
    App.sfx('ow');
    this.step('settle');
    this.onScale = true;
  }

  /** Lines, then what comes next. */
  talk(lines, then) { App.stack.push(new DialogueScreen(lines, { onDone: then })); }

  greet() {
    const slot = App.slot;
    if (this.isFirstMorning()) {
      slot.introHeard = true;
      App.store.write();
      this.talk(INTRO_LINES.slice(1), () => this.startTest());
      return;
    }
    const ow = OW_LINES[(slot.day + slot.week * 3) % OW_LINES.length];
    const morning = MORNINGS[(slot.day - 1) % MORNINGS.length];
    const lines = [{ who: 'ounce', text: ow, mood: 'alarm' }];
    if (slot.day === 2 && slot.week === 1) lines.push({ who: 'ounce', text: OW_JOKE, mood: 'smug' });
    lines.push({ who: 'ounce', text: morning, mood: 'neutral' });
    this.talk(lines, () => this.startTest());
  }

  startTest() {
    this.step('test');
    this.testT = 0;
    this.dot.reset();
    this.st = { in: 0, n: 0, dist: 0, targetsDone: 0, holdT: 0, doneAt: TEST_SECONDS[this.kind()] };
    this.ounce.read(0);
    App.sfx('menuConfirm');
  }

  kind() { return this.test2 ?? this.test; }

  chaseTarget(t) { return { x: 0.6 * Math.sin(0.7 * t), y: 0.42 * Math.sin(1.1 * t + 1) }; }
  targetNow() {
    const k = this.kind();
    if (k === 'lean') return LEAN_TARGETS[Math.min(this.st.targetsDone, LEAN_TARGETS.length - 1)];
    if (k === 'chase') return this.chaseTarget(this.testT);
    return { x: 0, y: 0 };
  }

  onFixed(ctx, dt) {
    this.phaseT += dt;
    if (this.phase === 'walkOn') {
      if (this.phaseT > 1) {
        // The first morning, she asks before you step on her. After that, you know the drill.
        if (this.isFirstMorning()) {
          this.avatar.play('Idle', { fade: 0.2 });
          this.step('talking');
          this.talk([INTRO_LINES[0]], () => this.stepOn());
        } else this.stepOn();
      }
      return;
    }
    if (this.phase === 'settle') {
      if (this.phaseT > 0.7) { this.step('talking'); this.greet(); }
      return;
    }
    if (this.phase !== 'test') return;
    this.testT += dt;
    const kind = this.kind();
    const target = this.targetNow();
    const inp = this.inp;
    const auto = this.auto;
    if (auto) {
      if (!this.brain || this.brain.skill !== auto) this.brain = new BotBrain(auto, () => this.rng.next());
      this.brain.lean(inp, this.dot, target.x, target.y, dt);
    } else this.driver.read(inp, ctx, dt, App, this.dialPos);
    this.dot.step(dt, inp.x, inp.y, T, { noise: App.noiseScale() });
    const st = this.st;
    const inside = Math.hypot(this.dot.x - target.x, this.dot.y - target.y) <= App.ringOf(kind === 'stillness' ? RING : 0.1);
    if (kind === 'stillness') { st.n++; if (inside) st.in++; } else if (kind === 'chase') { st.n++; st.dist += Math.hypot(this.dot.x - target.x, this.dot.y - target.y); } else if (kind === 'lean' && st.targetsDone < LEAN_TARGETS.length) {
      st.holdT = inside ? st.holdT + dt : Math.max(0, st.holdT - dt * 0.5);
      if (st.holdT >= HOLD_NEEDED) {
        st.targetsDone++; st.holdT = 0; App.sfx('ringIn');
        if (st.targetsDone === LEAN_TARGETS.length) st.doneAt = this.testT;
      }
    }
    if (inside && !this.wasInside) App.sfx('needleTick');
    this.wasInside = inside;
    this.ounce.read((this.dot.x + this.dot.y * 0.4) * 0.9);
    const over = this.testT >= TEST_SECONDS[kind] || (kind === 'lean' && st.targetsDone === LEAN_TARGETS.length);
    if (over) this.endTest();
  }

  endTest() {
    this.score = testT(this.kind(), this.st);
    this.ounce.read(null);
    this.step('question');
    App.stack.push(new QuestionScreen(this));
  }

  /** After the question: the Day 1 joke, then the reveal. */
  reveal() {
    const slot = App.slot;
    const r = recordWeighIn(slot, this.score);
    this.result = r;
    App.store.write();
    this.step('reveal');
    this.rollT = 0;
    this.ounce.setMood('spin');
    App.music(null);
    this.ticker = 0;
  }

  remark() {
    const r = this.result;
    const slot = App.slot;
    let list = AGE_LINES.same;
    if (r.previous === null) list = AGE_LINES.first;
    else if (r.shown > r.previous) list = AGE_LINES.worse;
    else if (r.shown < r.previous) list = AGE_LINES.better;
    let text = list[(slot.day + slot.week) % list.length].replace('%A', String(r.shown));
    const lines = [{ who: 'ounce', text, mood: r.previous !== null && r.shown < r.previous ? 'pleased' : 'concern' }];
    if (this.feel !== undefined) lines.push({ who: 'ounce', text: AGE_LINES.feel[0].replace('%A', String(r.shown)).replace('%F', String(this.feel)), mood: 'droop' });
    return lines;
  }

  finishReveal() {
    const slot = App.slot;
    slot.phase = 'day';
    App.store.write();
    App.go('hub', { from: 'terrace' });
  }

  onUpdate(ctx, dt) {
    this.ounce.update(dt);
    const a = this.avatar;
    if (this.phase === 'walkOn') {
      a.root.position.z = 2.2 - Math.min(1, this.phaseT) * 1.4;
    } else if (this.onScale) {
      const u = Math.min(1, this.phaseT / 0.5);
      if (this.phase === 'settle') { a.root.position.y = ONSCALE_Y * u; a.root.position.z = 0.8 - (0.8 - ONSCALE_Z) * u; a.root.rotation.y = 3.1 * (1 - u); if (u >= 1) a.play('Idle'); } else { a.root.position.set(0.04, ONSCALE_Y, ONSCALE_Z); a.root.rotation.y = 0; a.groundY = ONSCALE_Y; }
    }
    a.update(dt);
    if (this.phase === 'test') a.lean(this.dot.x, this.dot.y, 0, this.t);
    if (this.phase === 'reveal') {
      this.rollT += dt;
      this.ticker -= dt;
      const spin = this.rollT < 2.2;
      if (spin && this.ticker <= 0) { this.ticker = 0.05; App.sfx('needleTick', { pitch: this.rollT * 2 }); }
      if (!spin && !this.revealed) {
        this.revealed = true;
        this.ounce.setMood('neutral');
        App.sfx('fanfareSoft');
        this.talk(this.remark(), () => this.finishReveal());
      }
    }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const dx = Math.round(hud.width * 0.27);
    const dy = Math.round(hud.height * 0.42);
    const r = Math.min(62, Math.round(hud.height * 0.23));
    if (this.phase === 'test') {
      const kind = this.kind();
      this.dialPos = { x: dx, y: dy };
      const target = kind === 'stillness' ? null : this.targetNow();
      const fade = kind === 'stillness' && this.testT > 3 ? 0 : 1;
      const mouse = App.device.last === 'mouse' && !this.auto ? App.device.pointerArt(ctx) : null;
      drawDial(hud, { x: dx, y: dy, r, dot: this.dot, ringR: App.ringOf(kind === 'stillness' ? RING : 0.1), ringX: target?.x ?? 0, ringY: target?.y ?? 0, inside: this.wasInside, fade, target: kind === 'chase' ? target : null, mouse, hideDot: fade === 0 });
      const label = kind === 'stillness' ? (this.testT > 3 ? 'Eyes closed.' : 'Stand still. Then, eyes closed.') : kind === 'lean' ? this.targetNow().label : 'Follow the orange dot.';
      const w = Math.min(hud.width - 24, label.length * 6 + 12);
      hud.rect(Math.round(hud.width / 2 - w / 2), 10, w, 14, 'navy');
      sayCentered(hud, hud.width / 2, 12, label, { color: 'sand', name: 'test-label' });
      bar(hud, dx - r, dy + r + 8, r * 2, 6, 1 - this.testT / TEST_SECONDS[kind], 'cyan');
      if (kind === 'lean') bar(hud, dx - r, dy + r + 16, r * 2, 6, this.st.holdT / HOLD_NEEDED, 'lime');
      promptBar(hud, App.device, [['lean', 'Lean'], ['pause', 'Pause']]);
    }
    if (this.phase === 'reveal') {
      const u = Math.min(1, this.rollT / 2.2);
      const shown = this.result.shown;
      const roll = u >= 1 ? shown : Math.floor(((Math.sin(this.rollT * 41) + 1) / 2) * 80) + 18;
      panel(hud, dx - 56, dy - 40, 112, 80, { fill: 'white', name: 'age-panel' });
      sayCentered(hud, dx, dy - 34, 'Wobble Age', { color: 'teal', shadow: false, name: 'age-title' });
      sayCentered(hud, dx, dy - 14, String(roll), { scale: 5, color: 'red', shadow: false, name: 'age' });
    }
  }

  overlayDot() { return `${this.dot.x.toFixed(2)},${this.dot.y.toFixed(2)}`; }
  status() { return `weighin | ${this.phase} | test ${this.kind()} | t ${this.testT.toFixed(1)}${this.score !== undefined ? ` | T ${this.score.toFixed(2)}` : ''}`; }
  fingerprint() { return `${this.dot.x.toFixed(5)},${this.dot.y.toFixed(5)}`; }
}

class QuestionScreen {
  name = 'question';
  constructor(scene) {
    this.scene = scene;
    const slot = App.slot;
    this.q = QUESTIONS[slot.week === 1 ? slot.day - 1 : (slot.day - 1) % (QUESTIONS.length - 1)];
    this.firstDay = slot.day === 1 && slot.week === 1;
    this.syl = null;
    this.menu = new Menu(this.q.a.map((a, i) => ({ label: a, id: `a${i}`, action: () => this.answer(i) })), { x: 12, width: 322, y: 0, align: 'center' });
    App.say('ounce', this.q.q);
  }
  answer(i) {
    App.stack.pop(this);
    App.slot.answers = (App.slot.answers ?? 0) + 1;
    const after = [{ who: 'ounce', text: this.q.r[i], mood: 'smug' }, { who: 'ounce', text: 'Thank you. I have written that down.', mood: 'neutral' }];
    App.stack.push(new DialogueScreen(after, { onDone: () => {
      if (this.firstDay) App.stack.push(new FeelScreen(this.scene));
      else this.scene.reveal();
    } }));
  }
  update(ctx, dt) { this.menu.update(ctx, dt); }
  draw(ctx) {
    const { hud } = ctx;
    // On the left, so you and Ounce stay in view on the right.
    const w = Math.min(hud.width - 24, 322);
    const x = 12;
    const lines = wrap(this.q.q, charsIn(w - 20));
    panel(hud, x, 20, w, lines.length * 11 + 12, { fill: 'white', name: 'question' });
    lines.forEach((l, i) => sayCentered(hud, x + w / 2, 26 + i * 11, l, { color: 'ink', shadow: false, name: 'question-text' }));
    this.menu.o.y = 24 + lines.length * 11 + 12;
    this.menu.draw(ctx);
    promptBar(hud, App.device, [['confirm', 'Answer']]);
  }
}

/** "How old do you feel? This is not binding." Used once, in the joke, and never saved. */
class FeelScreen {
  name = 'feel';
  value = 34;
  constructor(scene) {
    this.scene = scene;
    App.say('ounce', AGE_QUESTION);
    this.menu = new Menu([{ label: 'How old do you feel?', id: 'age', value: () => `${this.value}`, adjust: (d) => { this.value = Math.max(1, Math.min(120, this.value + d)); }, action: () => this.done() }], { width: 320, y: 80 });
  }
  done() { this.scene.feel = this.value; App.stack.pop(this); this.scene.reveal(); }
  update(ctx, dt) { this.menu.update(ctx, dt); if (ctx.input.wheel) this.value = Math.max(1, Math.min(120, this.value - Math.sign(ctx.input.wheel))); }
  draw(ctx) {
    this.menu.draw(ctx);
    promptBar(ctx.hud, App.device, [['adjust', 'Change'], ['confirm', 'That\'s it']]);
  }
}

