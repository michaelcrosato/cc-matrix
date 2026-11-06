// The Hall of Numbers: chart, records one activity a page, calendar.
import { App } from '../app.js';
import { BACK, MENU_LEFT, MENU_RIGHT } from '../core/actions.js';
import { shownAge } from '../core/week.js';
import { place } from '../art/props.js';
import { ACTIVITIES, CLASSMATE_SCORES, PLAYABLE_IDS } from '../data/activities.js';
import { drawAgeChart } from '../ui/chart.js';
import { say, sayCentered, sayRight } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { TabBar } from '../ui/screens/common.js';
import { heading, panel, starRow, starRowWidth } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';

export class RecordsScene extends BaseScene {
  name = 'records';
  id = 'records';
  canPause = false; // Esc is Back here
  page = 0;

  cameraConfig() { return { preset: 'fixed', position: [0, 2.4, 9], target: [0, 2, 0], fov: 32 }; }

  build(ctx) {
    plazaSet(ctx, 11);
    place(ctx, 'numbers-board', { at: [0, 0, -2], scale: 1.8 });
    this.tabs = new TabBar(['Chart', 'Records', 'Calendar']);
    App.music('title');
  }

  onInput(ctx) {
    const { input } = ctx;
    this.tabs.update(ctx, { wheel: this.tabs.current !== 'Records' });
    if (this.tabs.current === 'Records') {
      const n = PLAYABLE_IDS.length;
      if (input.wasPressed(...MENU_RIGHT) || input.wheel > 0) { this.page = (this.page + 1) % n; App.sfx('menuMove'); }
      if (input.wasPressed(...MENU_LEFT) || input.wheel < 0) { this.page = (this.page - 1 + n) % n; App.sfx('menuMove'); }
    }
    if (input.wasPressed(...BACK) || input.wasPressed('MouseRight')) { App.sfx('menuBack'); App.go('hub', { from: 'hall' }); }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const s = App.slot;
    heading(hud, 'Hall of Numbers');
    this.tabs.draw(ctx, 35);
    const w = Math.min(hud.width - 24, 340);
    const x = Math.round((hud.width - w) / 2);
    const y = 52;
    const h = hud.height - y - 34;
    if (this.tabs.current === 'Chart') {
      const ages = (s?.ages ?? []).slice(-7).map((a) => shownAge(s, a));
      drawAgeChart(hud, x, y, w, Math.min(h, 150), ages);
    } else if (this.tabs.current === 'Records') {
      const id = PLAYABLE_IDS[this.page];
      const def = ACTIVITIES[id];
      const rec = s?.records[id];
      panel(hud, x, y, w, Math.min(h, 142), { fill: 'white', name: 'record' });
      sayCentered(hud, hud.width / 2, y + 5, def.name, { color: 'teal', shadow: false, name: 'record-name' });
      sayCentered(hud, hud.width / 2, y + 20, rec ? `${Math.round(rec.best)}` : '-', { scale: 4, color: 'ink', shadow: false, name: 'record-best' });
      starRow(hud, Math.round(hud.width / 2 - starRowWidth(1) / 2), y + 58, rec?.stars ?? 0);
      const others = CLASSMATE_SCORES[id];
      let ry = y + 74;
      for (const k of ['dennis', 'june', 'marguerite']) {
        say(hud, x + 40, ry, k[0].toUpperCase() + k.slice(1), { color: 'slate', shadow: false, name: 'record-row' });
        sayRight(hud, x + w - 40, ry, String(others[k]), { color: 'ink', shadow: false, name: 'record-row' });
        ry += 11;
      }
      sayCentered(hud, hud.width / 2, y + Math.min(h, 142) - 13, `${this.page + 1} / ${PLAYABLE_IDS.length}`, { color: 'slate', shadow: false, name: 'record-page' });
    } else {
      panel(hud, x, y, w, Math.min(h, 110), { fill: 'white', name: 'calendar' });
      const cw = Math.floor((w - 16) / 7);
      for (let d = 1; d <= 7; d++) {
        const cx = x + 8 + (d - 1) * cw;
        const past = s && (s.week > 1 || d < s.day);
        const today = s && s.week === 1 && d === s.day;
        hud.rect(cx + 1, y + 26, cw - 3, 44, today ? 'cyan' : past ? 'lime' : 'mist');
        sayCentered(hud, cx + cw / 2, y + 42, String(d), { scale: 2, color: 'ink', shadow: false, name: 'calendar-day' });
        if (s?.ages?.[d - 1] !== undefined && s.week === 1) sayCentered(hud, cx + cw / 2, y + 74, String(shownAge(s, s.ages[d - 1])), { color: 'slate', shadow: false, name: 'calendar-age' });
      }
      sayCentered(hud, hud.width / 2, y + 8, s?.week > 1 ? `Week ${s.week}` : 'The Week', { color: 'teal', shadow: false, name: 'calendar-title' });
    }
    promptBar(hud, App.device, this.tabs.current === 'Records' ? [['adjust', 'Activity'], ['tabs', 'Page'], ['back', 'Back']] : [['tabs', 'Page'], ['back', 'Back']]);
  }

  fingerprint() { return `${this.tabs?.i}|${this.page}`; }
  status() { return `records | ${this.tabs?.current} | page ${this.page}`; }
}
