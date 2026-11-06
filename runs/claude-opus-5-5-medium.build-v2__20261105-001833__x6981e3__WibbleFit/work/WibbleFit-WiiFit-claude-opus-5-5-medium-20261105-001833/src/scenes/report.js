// The Evening Report: minutes, Drips, stars, the chart, tomorrow's concern.
import { applySky, skyAt } from '../../pixel-engine.js';
import { App } from '../app.js';
import { makeAvatar } from '../art/avatar.js';
import { buildPlaza } from '../art/island.js';
import { place } from '../art/stage.js';
import { scheduleDay, shownAge, startNewDay } from '../core/progress.js';
import { ACT } from '../data/activities.js';
import { AVATARS } from '../data/classmates.js';
import { BARKS } from '../data/lines.js';
import { WEEK } from '../data/week.js';
import { center, say, wrap } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { chart, panel, stars } from '../ui/widgets.js';
import { BaseScene } from './base.js';

export class ReportScene extends BaseScene {
  id = 'report'; t = 0; page = 0;
  camera() { return { preset: 'fixed', position: [3.4, 1.5, 6], target: [0, 1, 0], fov: 32 }; }
  async build(ctx) {
    await buildPlaza(ctx); applySky(ctx.engine, skyAt(19));
    App.music('evening');
    for (const [x, z] of [[-4, 1], [4, 1], [-4, -3], [4, -3]]) ctx.lights.request({ position: [x, 2.4, z], color: 0xffc070, intensity: 6, radius: 7, flicker: 'pulse' });
    place(ctx, 'lamp-post', -4, 0, -3); place(ctx, 'lamp-post', 4, 0, -3);
    const a = await makeAvatar(ctx, App.slot?.look ?? AVATARS[0]); a.setAt(-0.6, 0, 0.6, 0.6); a.play('Sit'); this.a = a;
    this.ounce = place(ctx, 'ounce', 1.1, 0, 0.8, { actors: true, scale: 1.2 }); this.ounce.object.rotation.y = -0.4;
    const s = App.slot; if (!s) return;
    this.minutes = Math.round(s.seconds / 60);
    this.todayMins = s.today.length;
    this.bestStars = Math.max(0, ...s.todayStars);
    const d = scheduleDay(s.day);
    this.concern = BARKS.concern[(d - 1) % BARKS.concern.length];
    const next = s.week === 1 && WEEK[s.day] ? WEEK[s.day].opens.filter((id) => ACT[id]).map((id) => ACT[id].name) : [];
    this.tomorrow = next.length ? `Tomorrow: ${next.join(', ')}.` : '';
    App.say(this.concern, 'ounce');
  }
  frame(ctx, dt, rdt, free) {
    this.t += rdt; this.a.update(dt);
    if (free && this.t > 0.4 && ctx.input.wasPressed('PadCross', 'Enter', 'Space', 'MouseLeft')) this.next();
  }
  next() {
    if (this.leaving) return; this.leaving = true;
    const s = App.slot;
    if (s) { s.day += 1; if (s.week === 1 && s.day > 7) s.day = 7; startNewDay(s); s.phase = 'weighin'; App.writeSave(); }
    App.go('weighin', {}, 'fade');
  }
  draw(ctx, hud) {
    const s = App.slot, W = hud.width, H = hud.height; if (!s) return;
    const w = Math.min(W - 24, 340), x = (W - w) / 2, y = 12;
    panel(hud, x, y, w, H - 40, 'white', 'teal');
    center(hud, y + 6, `Evening Report: Day ${scheduleDay(s.day)}`, { color: 'teal', shadow: false, scale: W > 400 ? 2 : 1 });
    say(hud, x + 12, y + 28, `Activities ${s.today.length}`, { color: 'ink', shadow: false });
    say(hud, x + 12, y + 40, `Drips ${s.drips}`, { color: 'teal', shadow: false });
    say(hud, x + w / 2, y + 28, `Minutes ${this.minutes}`, { color: 'ink', shadow: false });
    say(hud, x + w / 2, y + 40, 'Best', { color: 'ink', shadow: false }); stars(hud, x + w / 2 + 30, y + 38, this.bestStars, 1);
    chart(hud, x + 10, y + 54, w - 20, Math.min(96, H - 40 - 54 - 42), s.chart.slice(-7).map((v) => shownAge(s, v)));
    let ty = H - 28 - 26 - 4;
    for (const l of wrap(this.concern, 52)) { center(hud, ty, l, { color: 'plum', shadow: false }); ty += 10; }
    if (this.tomorrow) center(hud, ty, this.tomorrow.slice(0, 52), { color: 'slate', shadow: false });
    promptBar(hud, [['confirm', 'Sleep']]);
  }
  status() { return `report | day ${App.slot?.day}`; }
}
