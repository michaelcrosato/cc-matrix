// Evening Report (about 20 s): minutes, Drips, stars, the chart, tomorrow's concern, new unlocks. Dusk, then morning.
import { BaseScene } from './base.js';
import { buildIsland, place } from '../art/world.js';
import { drawChart } from '../ui/chart.js';
import { panel, drawStars, layoutLog } from '../ui/widgets.js';
import { say, sayWrapped } from '../ui/font.js';
import { drawPrompts } from '../ui/prompts.js';
import { newDay, isLastDay } from '../core/progress.js';
import { CONCERNS, pick, ONE_LINERS } from '../data/lines.js';
import { MILESTONES } from '../data/unlocks.js';
import { dayOf } from '../data/week.js';
import { applySky, skyAt } from '../../pixel-engine.js';
import { dayLabel } from './labels.js';

export class ReportScene extends BaseScene {
  static id = 'report';
  static camera = { preset: 'fixed', position: [0, 3.2, 14], target: [0, 1.4, 3], fov: 34 };
  constructor(app, args) { super(app, args); this.page = 0; this.pt = 0; this.phase = 'report'; }
  get S() { return this.app.slot; }
  async build(ctx) {
    const S = this.S;
    this.world = buildIsland(ctx); applySky(ctx.engine, skyAt(19));
    const m = place(ctx, 'ounce', [-1.7, 0, 6.5], { scale: 1.5 }); this.ounce = m.object; this.needle = this.ounce.getObjectByName('needle');
    for (const [x, z] of [[-6, 4], [6, 4], [-4.5, 9], [4.5, 9]]) ctx.lights.request({ position: [x, 3, z], color: 0xffc070, intensity: 7, radius: 8, flicker: 'torch' });
    this.concern = pick(CONCERNS, this.app.rng('concern'));
    this.newItems = MILESTONES.filter((m2) => S.drips - (S.dayDrips ?? 0) < m2.at && S.drips >= m2.at);
    this.app.music('report');
    this.pages = 3;
  }
  tick(ctx, dt, blocked) {
    const nav = this.app.nav, app = this.app;
    this.world.update(dt);
    this.ounce.position.y = Math.abs(Math.sin(this.t * 2)) * 0.1; if (this.needle) this.needle.rotation.y = Math.PI + Math.sin(this.t * 1.5) * 0.3;
    this.pt += dt;
    if (blocked) return;
    if (nav.confirm || nav.click || (app.attract && this.pt > 6)) { this.pt = 0; this.page++; app.sfx('confirm'); if (this.page >= this.pages) this.leave(); }
  }
  async leave() {
    const app = this.app, S = this.S; if (this.left) return; this.left = true;
    app.commit();
    if (S.day >= 7 && !S.ended) { app.go('hub'); return; }
    newDay(S); app.commit();
    app.go('weighin');
  }
  draw(hud) {
    const S = this.S, w = hud.width, pw = Math.min(w - 24, 320), x = Math.floor((w - pw) / 2), y = 14;
    if (this.page === 0) {
      panel(hud, x, y, pw, 130);
      say(hud, w / 2, y + 8, 'Evening Report', { anchor: 'c', scale: 2, color: 'teal', shadow: false });
      say(hud, w / 2, y + 28, dayLabel(S), { anchor: 'c', color: 'slate', shadow: false });
      say(hud, w / 2, y + 46, `${S.dayDrips ?? 0} Drips`, { anchor: 'c', scale: 4, color: 'blue', shadow: false });
      say(hud, w / 2, y + 84, `${Math.round(S.dayMinutes ?? 0)} minutes   ${S.dayStars ?? 0} stars   ${S.doneToday.length} activities`, { anchor: 'c', color: 'ink', shadow: false });
      sayWrapped(hud, x + 14, y + 100, this.newItems.length ? this.newItems[0].remark : pick(ONE_LINERS.jarDrip, () => 0.1), pw - 28, { color: 'navy', shadow: false });
    } else if (this.page === 1) {
      drawChart(hud, x, y, pw, 130, S.ages ?? []);
      say(hud, w / 2, y + 140, 'Wobble Age, by day', { anchor: 'c', color: 'white' });
    } else {
      panel(hud, x, y, pw, 100);
      say(hud, w / 2, y + 8, 'Tomorrow', { anchor: 'c', scale: 2, color: 'teal', shadow: false });
      sayWrapped(hud, x + 14, y + 32, `Tomorrow's concern: ${this.concern}. I have been concerned all night.`, pw - 28, { color: 'ink', shadow: false });
      sayWrapped(hud, x + 14, y + 66, S.day >= 7 ? 'The Long Stand is done. We will not speak of it.' : 'See you tomorrow. Bring your knees.', pw - 28, { color: 'navy', shadow: false });
    }
    drawPrompts(this.app, hud, [['confirm', this.page >= 2 ? 'Good night' : 'Next']]);
  }
  status() { return `report | page ${this.page} | day ${this.S.day}`; }
}
