// The confession. The chart of your week slides down seven years. Credits. Week 2.
import { applySky, skyAt, Timeline } from '../../pixel-engine.js';
import { App } from '../app.js';
import { CONFIRM } from '../core/actions.js';
import { nextDay } from '../core/week.js';
import { makeAvatar } from '../art/avatar.js';
import { Kevin, Ounce, place } from '../art/props.js';
import { CREDITS, DISCLAIMER } from '../data/about.js';
import { LOOKS } from '../data/classmates.js';
import { CONFESSION, CONFESSION_AFTER, CREDITS_SIGNOFF } from '../data/lines.js';
import { AGE_OFFSET } from '../data/week.js';
import { TITLE } from '../data/title.js';
import { drawAgeChart } from '../ui/chart.js';
import { DialogueScreen } from '../ui/dialogue.js';
import { sayCentered, wrap, charsIn } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';
import { withWardrobe } from './activity/lanes.js';

export class EndingScene extends BaseScene {
  name = 'ending';
  id = 'ending';
  canPause = false;
  phase = 'confess';
  slide = 0;
  creditsT = 0;

  cameraConfig() { return { preset: 'fixed', position: [0, 2.5, 8.6], target: [0, 1.3, 0], fov: 34 }; }

  async build(ctx) {
    plazaSet(ctx, 18);
    applySky(ctx.engine, skyAt(18.5));
    this.ounce = new Ounce(ctx, { at: [0, 0.04, 0.6], scale: 1.7 });
    const slot = App.slot;
    this.you = await makeAvatar(ctx, withWardrobe(slot?.look ?? LOOKS.coach, slot), { at: [1.7, 0, 2], yaw: 3.7, clip: 'Idle' });
    this.coach = await makeAvatar(ctx, LOOKS.coach, { at: [-2.8, 0, 0.4], yaw: 0.5, clip: 'CoachStand' });
    this.coach.addPlumb();
    this.marguerite = await makeAvatar(ctx, LOOKS.marguerite, { at: [3.4, 0, 0.2], yaw: -0.5, clip: 'SlowClap' });
    this.dennis = await makeAvatar(ctx, LOOKS.dennis, { at: [4.8, 0, 1.3], yaw: -0.8, clip: 'Slump' });
    this.june = await makeAvatar(ctx, LOOKS.june, { at: [-4.4, 0, 1.4], yaw: 0.8, clip: 'Watch' });
    this.kevin = new Kevin(ctx, { at: [-1.4, 0, 1.8], yaw: 0.8 });
    this.lanterns = [[-6, -2], [6.4, -2]].map(([x, z]) => {
      place(ctx, 'lamp-post', { at: [x, 0, z] });
      return ctx.lights.request({ position: [x, 2.5, z + 0.4], color: 0xffcf80, intensity: 10, radius: 9, flicker: 'torch' });
    });
    App.music('credits');
    this.ages = (slot?.ages ?? [80, 78, 74, 70, 66, 60, 54]).slice(-7);
    this.shownBefore = this.ages.map((a) => a + AGE_OFFSET);
    // The camera and the bars are a Timeline; the speech sets its own pace over the top.
    this.tl = new Timeline({
      shots: [
        { at: 0, position: [0, 2.8, 10.4], target: [0, 1.3, 0], fov: 34 },
        { at: 16, position: [-0.9, 2.1, 7.4], target: [0, 1.2, 0.5], fov: 34 },
        { at: 34, position: [0.7, 1.8, 6], target: [0, 1.2, 0.6], fov: 34 },
        { at: 60, position: [0, 2.5, 8.6], target: [0, 1.3, 0], fov: 34 },
      ],
      cues: [
        { at: 1.5, name: 'kevin', cosmetic: true, run: () => App.sfx('gullSquawk', { volume: 0.5 }) },
        { at: 9, name: 'stir', cosmetic: true, run: () => this.dennis.play('Sneeze', { once: true, fade: 0.1, then: () => this.dennis.play('Slump', { fade: 0.3 }) }) },
      ],
      bars: 0.8,
      duration: 900,
    });
    this.tl.play();
    App.stack.push(new DialogueScreen(CONFESSION, { onDone: () => this.startSlide() }));
  }

  onFixed(ctx, dt) { this.tl.update(dt); }

  startSlide() {
    this.phase = 'slide';
    this.slideT = 0;
    this.ounce.setMood('spin');
    App.sfx('fanfareSoft');
    const slot = App.slot;
    if (slot) { slot.confessed = true; App.store.write(); }
  }

  afterSlide() {
    this.phase = 'after';
    this.ounce.setMood('pleased');
    App.stack.push(new DialogueScreen(CONFESSION_AFTER, { onDone: () => this.rollCredits() }));
  }

  rollCredits() {
    this.phase = 'credits';
    this.creditsT = 0;
    this.creditLines = [TITLE, '', ...CREDITS.slice(1), '', DISCLAIMER, '', CREDITS_SIGNOFF];
    this.you.play('Wave', { fade: 0.3 });
    this.coach.play('Bow', { once: true, fade: 0.3 });
    this.kevin.flyTo(-12, 8, -14, 6);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const slot = App.slot;
    if (slot) {
      slot.day = 7;
      nextDay(slot); // Week 2, day 1
      App.store.write();
      App.go('weighin');
    } else App.go('title');
  }

  onInput(ctx) {
    const { input } = ctx;
    if (this.phase === 'credits' && this.creditsT > 1.5 && (input.wasPressed(...CONFIRM) || input.wasPressed('MouseLeft'))) this.finish();
  }

  onUpdate(ctx, dt) {
    const shot = this.tl.camera();
    if (shot && !App.dev.freeCam) {
      const cam = ctx.camera.camera;
      cam.position.set(...shot.position);
      cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
      if (shot.fov && cam.fov !== shot.fov) { cam.fov = shot.fov; cam.updateProjectionMatrix(); }
    }
    for (const a of [this.you, this.coach, this.marguerite, this.dennis, this.june]) a.update(dt);
    this.ounce.update(dt);
    this.kevin.update(dt);
    if (this.phase === 'slide') {
      this.slideT += dt;
      const u = Math.min(1, this.slideT / 3);
      this.slide = AGE_OFFSET * (u * u * (3 - 2 * u));
      if (Math.floor(this.slideT * 12) !== Math.floor((this.slideT - dt) * 12) && u < 1) App.sfx('needleTick', { pitch: u * 10 });
      if (this.slideT > 4.5) { this.slide = AGE_OFFSET; this.afterSlide(); }
    }
    if (this.phase === 'credits') {
      this.creditsT += dt;
      if (this.creditsT > 26) this.finish();
    }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const bars = Math.round(this.tl.bars() * 14);
    if (bars > 0 && this.phase !== 'credits') { hud.rect(0, 0, hud.width, bars, 'ink'); hud.rect(0, hud.height - bars, hud.width, bars, 'ink'); }
    if (this.phase === 'slide' || this.phase === 'after') {
      const w = Math.min(hud.width - 40, 300);
      drawAgeChart(hud, Math.round((hud.width - w) / 2), 16, w, 100, this.shownBefore, { slide: this.slide });
      sayCentered(hud, hud.width / 2, 120, `-${Math.round(this.slide)} years`, { scale: 2, color: 'lime', name: 'slide' });
    }
    if (this.phase === 'credits') {
      hud.rect(0, 0, hud.width, hud.height, 'ink');
      const rows = this.creditLines.flatMap((l) => (l ? wrap(l, charsIn(hud.width - 40)) : ['']));
      const lineH = 13;
      const total = rows.length * lineH;
      const y0 = hud.height - Math.min(this.creditsT * 12, total + hud.height * 0.32);
      rows.forEach((r, i) => {
        const y = Math.round(y0 + i * lineH);
        if (r && y > -10 && y < hud.height - 24) sayCentered(hud, hud.width / 2, y, r, { color: r === CREDITS_SIGNOFF ? 'sand' : 'white', name: 'credits' });
      });
      promptBar(hud, App.device, [['confirm', 'See you tomorrow']]);
    }
  }

  status() { return `ending | ${this.phase} | slide ${this.slide.toFixed(2)}`; }
  fingerprint() { return `${this.phase}|${this.slide.toFixed(3)}|${this.tl?.time.toFixed(2)}`; }
}
