// The confession, the chart slide, the credits. Then Week 2.
import { applySky, skyAt, THREE, Timeline } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar, PlumbBob } from '../art/avatar.js';
import { buildPlaza } from '../art/island.js';
import { place } from '../art/stage.js';
import { startNewDay, shownAge } from '../core/progress.js';
import { AVATARS, CAST_LOOKS } from '../data/classmates.js';
import { STORY } from '../data/lines.js';
import { TITLE } from '../data/title.js';
import { talk } from '../ui/dialogue.js';
import { center, plateCenter, say } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { chart, panel } from '../ui/widgets.js';
import { BaseScene } from './base.js';
const { Vector3 } = THREE;
const CREDITS = [TITLE, '', 'Ounce  as itself. Allegedly.', 'Coach Plumb  never off vertical', 'Marguerite  all parts new', 'Dennis  it\'s just the one leg', 'June  pacing herself', 'Kevin  staff', '', 'See you tomorrow.', 'Bring your knees.'];
export class EndingScene extends BaseScene {
  id = 'ending'; part = 'confess'; t = 0; slide = 0; before = null; q = new Vector3(); creditY = 0;
  camera() { return { preset: 'fixed', position: [0, 2, 7], target: [0, 1, 0], fov: 30 }; }
  async build(ctx) {
    this.world = await buildPlaza(ctx); applySky(ctx.engine, skyAt(18));
    App.music('swell');
    const slot = App.slot;
    this.a = await makeAvatar(ctx, slot?.look ?? AVATARS[0]); this.a.setAt(0, 0, 0.9, Math.PI + 0.3); this.a.play('StandTall');
    this.ounce = place(ctx, 'ounce', 0, 0, -0.4, { actors: true, scale: 1.8 }); this.needle = this.ounce.object.getObjectByName('needle');
    this.people = [];
    for (const [who, x, z, yaw] of [['coach', -2.2, -0.6, 0.6], ['marguerite', 2.2, -0.5, -0.6], ['dennis', -3.4, 0.7, 1], ['june', 3.3, 0.8, -1]]) { const m = await makeAvatar(ctx, CAST_LOOKS[who]); m.setAt(x, 0, z, yaw); this.people.push(m); if (who === 'coach') this.bob = new PlumbBob(ctx, m); }
    this.tl = new Timeline({ duration: 60, bars: 0.8, shots: [{ at: 0, position: [0, 2, 7], target: [0, 1, 0], fov: 30 }, { at: 6, position: [0, 1.6, 4.4], target: [0, 1, -0.4], fov: 26 }, { at: 30, position: [0.8, 1.5, 3.6], target: [0, 0.9, -0.4], fov: 24 }] });
    this.tl.play();
    talk(STORY.confession, () => this.toChart());
    App.engine.settings; this.tickT = 0;
  }
  toChart() {
    const s = App.slot;
    this.before = s ? s.chart.slice(-7) : [47, 44, 45];
    if (s) { s.confessed = true; App.writeSave(); }
    this.part = 'chart'; this.t = 0; App.sfx('wobble');
  }
  frame(ctx, dt, rdt, free) {
    this.t += rdt; this.tl.update(dt); this.world.update(ctx, dt);
    this.a.update(dt); for (const m of this.people) m.update(dt); this.bob?.update(dt);
    const cam = ctx.camera.camera, c = this.tl.camera();
    if (c) { cam.position.set(...c.position); cam.lookAt(this.q.set(...c.target)); if (c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); } this.target.set(...c.target); }
    if (this.needle) this.needle.rotation.y = Math.PI + (this.part === 'confess' ? 2.06 : Math.sin(ctx.time) * 0.2);
    if (this.part === 'chart') {
      const k = Math.min(1, Math.max(0, (this.t - 0.8) / 2.4));
      this.slide = 7 * (1 - (1 - k) * (1 - k));
      if (k > 0 && k < 1) { this.tickT -= rdt; if (this.tickT <= 0) { this.tickT = 0.08; App.sfx('needleTick'); } }
      if (k >= 1 && !this.said) { this.said = true; App.sfx('chimeIn'); talk(STORY.afterChart, () => { this.part = 'credits'; this.t = 0; App.music('plaza'); }); }
    }
    if (this.part === 'credits') {
      this.creditY = this.t * 18;
      if ((this.t > 2 && free && ctx.input.wasPressed('PadCross', 'Enter', 'Space', 'MouseLeft')) || this.t > 18) this.toWeek2();
    }
  }
  toWeek2() {
    if (this.left) return; this.left = true;
    const s = App.slot;
    if (s) { s.week = 2; s.day = 8; s.phase = 'weighin'; s.dayIntroDone = 0; startNewDay(s); App.writeSave(); }
    App.go(s ? 'weighin' : 'title');
  }
  draw(ctx, hud) {
    const W = hud.width, H = hud.height;
    if (this.part === 'chart' && this.before) {
      const w = Math.min(W - 24, 300), h = 110, x = (W - w) / 2, y = 20;
      // shownAge is now true: the seven lives only in the animation back from before.
      const vals = this.before.map((v) => v + 7);
      chart(hud, x, y, w, h, vals, { slide: this.slide, days: 7 });
      plateCenter(hud, y + h + 6, `Minus ${this.slide.toFixed(0)}`, { scale: 2, color: 'sand' });
    }
    if (this.part === 'credits') {
      hud.rect(0, 0, W, H, 'night');
      CREDITS.forEach((l, i) => { const y = H + 10 + i * 18 - this.creditY; if (y > -14 && y < H) center(hud, y, l, { scale: i === 0 ? 3 : 1, color: i === 0 ? 'cyan' : 'white' }); });
      promptBar(hud, [['confirm', 'Week 2']]);
    }
    void panel; void say; void shownAge;
  }
  status() { return `ending | ${this.part} | slide ${this.slide.toFixed(2)}`; }
}
