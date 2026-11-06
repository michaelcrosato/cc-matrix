// Results: stars pop in one by one, big score, a line chosen by activity and stars, classmates' scores.
import { App } from '../../app.js';
import { nextActivity } from '../../core/week.js';
import { ACTIVITIES } from '../../data/activities.js';
import { RESULT_LINES, WOBBLE_LINE } from '../../data/lines.js';
import { Menu } from '../menu.js';
import { promptBar } from '../prompts.js';
import { say, sayCentered, textWidth } from '../font.js';
import { heading, panel, star, STAR_W } from '../widgets.js';
import { ABOVE_PROMPTS } from '../layout.js';
import { dim, wrapTo } from './common.js';

export function pickResultLine(id, stars, firstEver, rand) {
  const lines = RESULT_LINES[id];
  if (!lines) return '';
  const list = firstEver && lines.first ? lines.first : (lines[stars] ?? []);
  const which = list.length ? list[Math.floor(rand() * list.length) % list.length] : '';
  return which;
}

export class ResultsScreen {
  name = 'results';
  t = 0;
  shownStars = 0;

  constructor(scene, r) {
    this.scene = scene;
    this.r = r;
    const rand = () => scene.cosmetic.next();
    this.line = pickResultLine(r.id, r.stars, r.firstEver, rand) || (RESULT_LINES[r.id]?.[r.stars]?.[0] ?? '');
    if (!r.firstEver && r.stars < 3 && rand() < 0.25 && RESULT_LINES[r.id]?.repeat) this.line = RESULT_LINES[r.id].repeat[0];
    if (r.wobbles > 1 && !r.firstEver && rand() < 0.35) this.line = WOBBLE_LINE.replace('%W', String(r.wobbles));
    const items = [
      { label: 'Again', id: 'retry', action: () => App.go('activity', { ...scene.args, noPractice: true }) },
    ];
    const next = nextActivity(r.id, r.mode === 'week' ? App.slot : null, App.dev.allUnlocked);
    if (next !== r.id && !ACTIVITIES[r.id].hidden) items.push({ label: 'Next', id: 'next', action: () => App.go('activity', { ...scene.args, id: next, noPractice: false }) });
    this.story = r.id === 'stand' && r.mode === 'week';
    if (!this.story) items.push({ label: r.mode === 'week' ? 'Back to the island' : 'Back to the class', id: 'back', action: () => this.leave() });
    else { items.length = 0; items.push({ label: 'Continue', id: 'continue', action: () => App.go('ending') }); }
    this.menu = new Menu(items, { scale: 1, rowH: 15, width: 170, align: 'center', onBack: this.story ? undefined : () => this.leave() });
    this.menuReady = false;
  }

  leave() {
    if (this.r.mode === 'week') App.go('hub', { from: ACTIVITIES[this.r.id].station });
    else App.go('title', { menu: 'dropin' });
  }

  update(ctx, dt) {
    const uiDt = dt || 1 / 60;
    this.t += uiDt;
    const due = Math.min(this.r.stars, Math.floor((this.t - 0.4) / 0.42) + 1);
    if (due > this.shownStars && this.t > 0.4) {
      this.shownStars = due;
      App.sfx('starPop', { pitch: this.shownStars * 2 });
      if (this.shownStars === 3 && !App.settings.reduceFlashes) App.flash('white', { duration: 0.08 });
    }
    if (this.t > 0.4 + this.r.stars * 0.42 + 0.25 && !this.spoke) {
      this.spoke = true;
      this.menuReady = true;
      App.say('ounce', this.line);
    }
    if (this.menuReady) this.menu.update(ctx, dt);
    else if (ctx.input.wasPressed('Enter', 'Space', 'PadCross', 'MouseLeft')) { this.shownStars = this.r.stars; this.t = 99; }
  }

  draw(ctx) {
    const { hud } = ctx;
    dim(hud);
    const r = this.r;
    const cx = Math.round(hud.width / 2);
    heading(hud, ACTIVITIES[r.id].name, 12, hud.width > 360 ? 2 : 1);
    // A backing for the numbers, so they read over any scene.
    const rowsBelow = (r.mode === 'week' || r.newBest ? 12 : 0) + (r.unlocked?.length ? 12 : 0) + (r.classmates?.length ? 12 : 0);
    const backW = Math.min(hud.width - 24, 320);
    hud.rect(cx - Math.round(backW / 2), 33, backW, 62 + rowsBelow, 'navy');
    // Stars: the focal element.
    const scale = 3;
    const total = 3 * (STAR_W * scale + 4) - 4;
    let x = cx - Math.round(total / 2);
    for (let i = 0; i < 3; i++) {
      const on = i < this.shownStars;
      star(hud, x, 38, on, scale);
      x += STAR_W * scale + 4;
    }
    sayCentered(hud, cx, 70, r.display ?? String(r.score), { scale: 3, color: 'white', name: 'score' });
    let y = 98;
    const bits = [];
    if (r.mode === 'week') bits.push(`+${r.drips ?? 0} Drips${r.bonus ? ` (Coach: +${r.bonus})` : ''}`);
    if (r.newBest) bits.push('New best');
    if (bits.length) { sayCentered(hud, cx, y, bits.join('   '), { color: 'sand', name: 'drips' }); y += 12; }
    if (r.unlocked?.length) {
      const m = r.unlocked[0];
      sayCentered(hud, cx, y, `The jar gave you: ${m.name}`, { color: 'lime', name: 'unlock' });
      y += 12;
    }
    // Classmates' scores.
    const rows = this.classRows(r);
    if (rows.length) {
      const w = rows.reduce((a, s) => a + textWidth(s) + 12, -12);
      let tx = cx - Math.round(w / 2);
      for (const s of rows) { say(hud, tx, y, s, { color: 'mist', name: 'class-score' }); tx += textWidth(s) + 12; }
      y += 12;
    }
    if (this.menuReady) {
      // Scale 2 rows when there's room; a 720p window's art is only 240 tall.
      const big = hud.height >= 270;
      this.menu.o.scale = big ? 2 : 1;
      this.menu.o.rowH = big ? 21 : 15;
      this.menu.o.width = big ? 260 : 170;
      this.menu.o.y = Math.max(y + 4, hud.height - ABOVE_PROMPTS - 18 - this.menu.items.length * this.menu.o.rowH - 34);
      this.menu.draw(ctx);
      if (!this.scene.bark.active) drawInlineLine(ctx, this.line);
      promptBar(hud, App.device, [['confirm', 'Select'], ['back', 'Back']]);
    }
  }

  classRows(r) {
    if (r.classmates?.length) return r.classmates.map((c) => `${c.name} ${c.score}`);
    return [];
  }
}

function drawInlineLine(ctx, line) {
  if (!line) return;
  const { hud } = ctx;
  const lines = wrapTo(line, Math.min(hud.width - 40, 320));
  const h = lines.length * 11 + 6;
  const y = hud.height - h - ABOVE_PROMPTS;
  const w = Math.min(hud.width - 24, 330);
  panel(hud, Math.round((hud.width - w) / 2), y, w, h, { fill: 'white', name: 'line' });
  lines.forEach((l, i) => sayCentered(hud, hud.width / 2, y + 3 + i * 11, l, { color: 'ink', shadow: false, name: 'line-text' }));
}

