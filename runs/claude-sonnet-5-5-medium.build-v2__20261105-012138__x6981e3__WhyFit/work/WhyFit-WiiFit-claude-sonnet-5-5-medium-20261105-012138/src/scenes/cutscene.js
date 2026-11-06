// Cutscenes on the engine's Timeline: the ferry arrival, and the confession with the sliding chart and credits.
import { BaseScene } from './base.js';
import { buildIsland, place, makeSea } from '../art/world.js';
import { makeAvatar, playerLook, NPC_LOOKS } from '../art/avatar.js';
import { drawChart } from '../ui/chart.js';
import { panel } from '../ui/widgets.js';
import { say, sayWrapped, wrap } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { Timeline, applySky, skyAt, THREE } from '../../pixel-engine.js';
import { TITLE } from '../data/title.js';

function applyShot(ctx, shot) {
  if (!shot) return;
  const cam = ctx.camera.camera; if (!cam) return;
  cam.position.set(...shot.position); cam.lookAt(...shot.target);
  if (cam.isPerspectiveCamera && shot.fov) { cam.fov = shot.fov; cam.updateProjectionMatrix(); }
}
class CutBase extends BaseScene {
  tickTimeline(ctx, dt) { this.tl.update(dt); applyShot(ctx, this.tl.camera()); }
  drawSubs(hud, tl) {
    const bars = tl.bars();
    const bh = Math.round(18 * bars);
    hud.rect(0, 0, hud.width, bh, 'night'); hud.rect(0, hud.height - bh, hud.width, bh, 'night');
    const ln = tl.line();
    if (ln) {
      const lines = wrap(ln.text, hud.width - 60, 1);
      lines.slice(0, 3).forEach((l, i) => say(hud, hud.width / 2, hud.height - 40 + i * 10 - (lines.length - 1) * 4, l, { anchor: 'c', color: 'white' }));
      if (ln.who) say(hud, hud.width / 2, hud.height - 52 - (lines.length - 1) * 4, ln.who, { anchor: 'c', color: 'sand' });
    }
  }
}

export class FerryScene extends CutBase {
  static id = 'ferry';
  static camera = { preset: 'fixed', position: [0, 6, 46], target: [0, 1, 30], fov: 36 };
  constructor(app, args) { super(app, args); this.phase = 'ferry'; }
  get S() { return this.app.slot; }
  async build(ctx) {
    const app = this.app;
    this.world = buildIsland(ctx); applySky(ctx.engine, skyAt(8));
    this.ferry = place(ctx, 'ferry', [0, 0.1, 40], { turn: 180 }).object;
    this.av = await makeAvatar(ctx, playerLook(this.S)); this.av.root.scale.setScalar(0.7); this.av.addTo(ctx.scene); this.av.play('Idle');
    this.av.setPos(0, 1.2, 39, Math.PI);
    this.ounce = place(ctx, 'ounce', [0, 0, 17.5], { scale: 1.4 }).object;
    const tl = this.tl = new Timeline({
      shots: [
        { at: 0, position: [-6, 3, 44], target: [0, 1.5, 38] }, { at: 4, position: [-4, 3, 36], target: [0, 1.5, 30] },
        { at: 6, cut: true, position: [3, 2.2, 24], target: [0, 1.2, 18] }, { at: 10, position: [2, 1.8, 21], target: [0, 1.2, 17.5] },
        { at: 11, cut: true, position: [0, 3.5, 24], target: [0, 1.2, 17] }, { at: 15, position: [0, 3, 22], target: [0, 1.4, 16] },
      ],
      cues: [
        { at: 0.2, run: () => { this.speak('narrator', 'Tare Island. Everything here starts at zero.'); } },
        { at: 6.2, run: () => { this.moving = false; this.av.play('Walk'); this.walkIn = true; } },
        { at: 10.4, run: () => { this.av.play('Idle'); app.sfx('ow', { pitch: -3 }); } },
      ],
      lines: [
        { at: 0.2, until: 4.5, text: 'Tare Island. Everything here starts at zero.', who: '' },
        { at: 4.8, until: 8, text: 'A tiny resort. A tiny scale. A very large kettlebell.', who: '' },
        { at: 10.6, until: 14.5, text: 'Hello! I\'m Ounce. Please step on me.', who: 'Ounce' },
      ],
      duration: 15.5, onEnd: () => this.done(),
    });
    tl.play(); this.moving = true;
    app.music('plaza');
  }
  speak(who, text) {}
  done() {
    if (this.over) return; this.over = true;
    const S = this.S; S.intro = true; S.phase = 'morning'; this.app.commit(); this.app.go('weighin');
  }
  tick(ctx, dt, blocked) {
    const nav = this.app.nav;
    this.world.update(dt);
    this.tickTimeline(ctx, dt);
    const t = this.tl.time;
    if (this.moving) { const z = 40 - Math.min(t, 6) * 3.6; this.ferry.position.z = z; this.av.setPos(0, 1.2, z - 1, Math.PI); }
    else if (this.walkIn) { const k = Math.min(1, (t - 6.2) / 4); this.av.setPos(0, Math.max(0, 1.2 * (1 - k * 2)), 18.5 - k * 0.5, Math.PI); this.ferry.position.z = 20; }
    this.av.update(dt);
    if (!blocked && (nav.confirm || nav.pause || nav.click)) this.tl.skip();
  }
  draw(hud) { this.drawSubs(hud, this.tl); drawPrompts(this.app, hud, [['confirm', 'Skip']]); }
  status() { return `ferry | t ${this.tl.time.toFixed(1)}`; }
}

export class EndingScene extends CutBase {
  static id = 'ending';
  static camera = { preset: 'fixed', position: [0, 2.6, 11], target: [0, 1.4, 4], fov: 34 };
  constructor(app, args) { super(app, args); this.phase = 'confession'; this.slide = 0; this.showChart = false; this.credits = false; this.cy = 0; this.stars = args.stars ?? 0; }
  get S() { return this.app.slot; }
  async build(ctx) {
    const app = this.app, S = this.S;
    this.world = buildIsland(ctx); applySky(ctx.engine, skyAt(17.5));
    this.ounce = place(ctx, 'ounce', [0, 0, 5.5], { scale: 1.6 }).object; this.needle = this.ounce.getObjectByName('needle');
    this.av = await makeAvatar(ctx, playerLook(S)); this.av.setPos(1.8, 0, 6.2, -0.4); this.av.addTo(ctx.scene); this.av.play('Idle');
    this.coach = await makeAvatar(ctx, NPC_LOOKS.coach); this.coach.setPos(-3, 0, 6.2, 0.5); this.coach.addTo(ctx.scene); this.coach.play('Idle');
    this.ages = [...S.ages];
    const L = (at, until, who, text) => ({ at, until, who, text });
    this.tl = new Timeline({
      shots: [{ at: 0, position: [0, 2.4, 11], target: [0, 1.4, 5.5] }, { at: 10, position: [0, 1.9, 8.2], target: [0, 1.3, 5.5] }, { at: 20, position: [0, 1.6, 7.4], target: [0, 1.4, 5.5] }],
      cues: [
        { at: 2, run: () => { app.moodNow = 'droop'; } },
        { at: 12, run: () => { app.moodNow = 'worried'; } },
        { at: 21, run: () => { this.showChart = true; app.sfx('fanfare2'); app.moodNow = 'pleased'; } },
        { at: 23, run: () => { this.sliding = true; app.sfx('whistle'); } },
        { at: 34, run: () => { this.showChart = false; } },
        { at: 36, run: () => { this.startCredits(); } },
      ],
      lines: [
        L(0.5, 4.5, 'Coach Plumb', 'You may blink.'), L(4.6, 8, 'Ounce', 'Before anyone goes. I have to tell you something.'), L(8.2, 12, 'Ounce', 'Your Wobble Age. It was seven too high.'),
        L(12.2, 16.5, 'Ounce', 'I have been adding seven. To everyone. For years. It felt motivating.'), L(16.7, 19.5, 'Marguerite', 'I did say. Has anyone checked that scale.'),
        L(19.7, 22.5, 'Ounce', 'Here is your week. As it was. As it is.'), L(24, 28, 'Ounce', 'There. Seven years. Gently. The chart agrees with the floor.'), L(28.5, 33, 'Ounce', 'I am so sorry. I am a scale. I am supposed to be accurate.'),
      ],
      duration: 55, bars: 0.8, onEnd: () => {},
    });
    this.tl.play();
    app.stopMusic(); app.music('report');
  }
  startCredits() { this.credits = true; this.cy = 0; this.creditsT = 0; }
  finish() {
    if (this.over) return; this.over = true;
    const S = this.S; S.ended = true; S.confessed = true; S.week2 = true; S.phase = 'free';
    // the confession subtracts exactly 7 from every shown age
    S.ages = S.ages.map((a) => a - 7);
    this.app.commit(); this.app.go('hub');
  }
  tick(ctx, dt, blocked) {
    const nav = this.app.nav;
    this.world.update(dt); this.tickTimeline(ctx, dt);
    this.av.update(dt); this.coach.update(dt);
    if (this.sliding) this.slide = Math.min(1, this.slide + dt / 2.5);
    if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(this.t * 2) * 0.2 + (this.app.moodNow === 'droop' ? 0.8 : 0);
    if (this.credits) { this.creditsT += dt; this.cy += dt * 14; if (this.creditsT > 22 || (nav.confirm && this.creditsT > 2)) this.finish(); }
    else if (!blocked && nav.confirm && this.tl.time > 3) this.tl.seek(Math.min(this.tl.time + 3, 35));
    if (!blocked && nav.pause && !this.credits) this.tl.seek(36);
  }
  draw(hud) {
    this.drawSubs(hud, this.tl);
    const w = hud.width;
    if (this.showChart) drawChart(hud, Math.floor((w - 300) / 2), 24, 300, 130, this.ages, { slide: this.slide });
    if (this.credits) {
      hud.rect(0, 0, w, hud.height, 'night');
      const lines = [TITLE, '', 'An original game inspired by Wii Fit', '', 'Ounce - a scale', 'Coach Plumb - 81, plumb', 'Marguerite - hips, new', 'Dennis - the deck chair', 'June - pacing herself', 'Kevin - staff', '', 'Written, drawn, animated and voiced in code', 'Pixel Engine 0.46.0', 'Built by Claude', '', 'This is not medical advice. Ounce is a scale.', '', 'See you tomorrow. Bring your knees.'];
      lines.forEach((l, i) => { const y = hud.height - this.cy + i * 14; if (y > -10 && y < hud.height) say(hud, w / 2, y, l, { anchor: 'c', color: i === 0 ? 'sand' : 'white', scale: i === 0 ? 3 : 1 }); });
    }
    drawPrompts(this.app, hud, [['confirm', this.credits ? 'Continue' : 'Faster']]);
  }
  status() { return `ending | t ${this.tl.time.toFixed(1)} | slide ${this.slide.toFixed(2)} | credits ${this.credits}`; }
  extraState() { return { slide: this.slide, credits: this.credits, ages: this.ages }; }
}
