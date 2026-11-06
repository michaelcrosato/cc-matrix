// The Evening Report: minutes, Drips, stars, the chart, tomorrow's concern, new unlocks. Then dusk, then morning.
import { applySky, skyAt } from '../../pixel-engine.js';
import { App } from '../app.js';
import { CONFIRM } from '../core/actions.js';
import { goalMet, nextDay, shownAge } from '../core/week.js';
import { makeAvatar } from '../art/avatar.js';
import { Ounce, place } from '../art/props.js';
import { CONCERNS, REPORT_LINES } from '../data/lines.js';
import { MILESTONES } from '../data/unlocks.js';
import { drawAgeChart } from '../ui/chart.js';
import { DialogueScreen } from '../ui/dialogue.js';
import { say, sayRight } from '../ui/font.js';
import { promptBar } from '../ui/prompts.js';
import { panel } from '../ui/widgets.js';
import { BaseScene } from './base.js';
import { plazaSet } from './sets.js';
import { withWardrobe } from './activity/lanes.js';

const COUNT_SECONDS = 3;
const HOLD_SECONDS = 9; // With Ounce's lines, about 20 s at a reading pace. Next skips it.

export class ReportScene extends BaseScene {
  name = 'report';
  id = 'report';
  canPause = true;
  pauseToTitle = true;
  phase = 'count';
  countT = 0;

  cameraConfig() { return { preset: 'fixed', position: [3.2, 2.8, 9], target: [3.2, 1.3, 0], fov: 32 }; }

  async build(ctx) {
    plazaSet(ctx, 19);
    applySky(ctx.engine, skyAt(19));
    const slot = App.slot;
    place(ctx, 'hammock', { at: [5.4, 0, 0.8] });
    // Dusk: the pavilion's lanterns come on along the terrace.
    this.lanterns = [[0.6, 0.4], [6.6, -1.2]].map(([x, z]) => {
      place(ctx, 'lamp-post', { at: [x, 0, z] });
      return ctx.lights.request({ position: [x, 2.5, z + 0.4], color: 0xffcf80, intensity: 8, radius: 8, flicker: 'torch' });
    });
    this.ounce = new Ounce(ctx, { at: [3.3, 0.04, 2.6], yaw: 0.2, scale: 1.2 });
    const av = await makeAvatar(ctx, withWardrobe(slot?.look ?? {}, slot), { at: [5.4, 0.9, 0.8], yaw: 1.57, clip: 'LieIdle', shadow: false });
    this.avatar = av;
    App.music('report');
    this.lines = this.buildLines();
    this.concern = CONCERNS[((slot?.day ?? 1) - 1 + (slot?.week ?? 1) * 2) % CONCERNS.length];
    this.minutes = Math.floor((slot?.todaySeconds ?? 0) / 60);
    this.seconds = Math.round((slot?.todaySeconds ?? 0) % 60);
  }

  buildLines() {
    const slot = App.slot;
    if (!slot) return [];
    const lines = [];
    const beat = new Set();
    for (const d of slot.todayDone) for (const w of d.beat ?? []) beat.add(w);
    const firstNew = ['marguerite', 'june', 'dennis'].find((w) => beat.has(w) && !(slot.reacted ??= {})[w]);
    if (firstNew) { slot.reacted[firstNew] = true; lines.push(REPORT_LINES[`beat${firstNew[0].toUpperCase()}${firstNew.slice(1)}`]); }
    if (!slot.todayDone.length) lines.push(`ounce: ${REPORT_LINES.empty}`);
    else lines.push(`ounce: ${goalMet(slot) ? REPORT_LINES.goal : REPORT_LINES.noGoal}`);
    return lines;
  }

  onInput(ctx) {
    const { input } = ctx;
    const go = input.wasPressed(...CONFIRM) || input.wasPressed('MouseLeft');
    if (this.phase === 'count' && (go || this.countT > HOLD_SECONDS)) {
      this.phase = 'talk';
      const lines = [...this.lines, `ounce: ${this.concern}`];
      App.stack.push(new DialogueScreen(lines, { onDone: () => { this.phase = 'done'; } }));
    } else if (this.phase === 'done' && !App.loading) {
      this.phase = 'leaving';
      this.nextMorning();
    }
  }

  nextMorning() {
    const slot = App.slot;
    nextDay(slot);
    App.store.write();
    App.go('weighin');
  }

  onUpdate(ctx, dt) {
    this.ounce.update(dt);
    this.avatar.update(dt);
    this.countT += dt;
    if (this.phase === 'done' && !this.saidDone && App.dev.autopilot) { this.saidDone = true; this.phase = 'leaving'; this.nextMorning(); }
  }

  onDraw(ctx) {
    const { hud } = ctx;
    const slot = App.slot;
    if (!slot) return;
    const x = 12;
    const w = Math.min(208, Math.round(hud.width * 0.5));
    heading2(hud, slot.week > 1 ? `Week ${slot.week}, day ${slot.day}` : `Day ${slot.day} Report`, x);
    const y = 36;
    panel(hud, x, y, w, 54, { fill: 'white', name: 'report-numbers' });
    say(hud, x + 5, y + 4, 'Time in class', { color: 'teal', shadow: false, name: 'report' });
    // The day's numbers count up, then sit there and let you look at them.
    const k = Math.min(1, this.countT / COUNT_SECONDS);
    const shownSeconds = Math.round((this.minutes * 60 + this.seconds) * k);
    sayRight(hud, x + w - 5, y + 4, `${Math.floor(shownSeconds / 60)}m ${String(shownSeconds % 60).padStart(2, '0')}s`, { color: 'ink', shadow: false, name: 'report' });
    say(hud, x + 5, y + 16, 'Drips today', { color: 'teal', shadow: false, name: 'report' });
    sayRight(hud, x + w - 5, y + 16, `+${Math.round(slot.todayDrips * k)}`, { color: 'ink', shadow: false, name: 'report' });
    say(hud, x + 5, y + 28, 'Stars', { color: 'teal', shadow: false, name: 'report' });
    sayRight(hud, x + w - 5, y + 28, `${Math.round(slot.todayStars * k)}`, { color: 'ink', shadow: false, name: 'report' });
    const goal = goalMet(slot);
    say(hud, x + 5, y + 40, goal ? 'Prescription filled' : 'Prescription open', { color: goal ? 'green' : 'red', shadow: false, name: 'report' });
    const chartY = y + 60;
    const chartH = Math.max(58, Math.min(96, hud.height - chartY - 44));
    const ages = slot.ages.slice(-7).map((a) => shownAge(slot, a));
    drawAgeChart(hud, x, chartY, w, chartH, ages);
    const items = slot.todayNew ?? [];
    if (items.length) {
      const m = MILESTONES.find((n) => n.id === items[items.length - 1]);
      if (m) say(hud, x + 1, chartY + chartH + 4, `New: ${m.name}`, { color: 'lime', name: 'report-new' });
    }
    if (!App.stack.open) promptBar(hud, App.device, [['confirm', this.phase === 'done' ? 'Good night' : 'Next']]);
  }

  fingerprint() { return `${App.slot?.day}|${this.phase}|${App.slot?.todayDrips}`; }
  status() { const s = App.slot; return `report | day ${s?.day} | ${this.phase} | drips ${s?.todayDrips}`; }
  dispose() { for (const l of this.lanterns ?? []) l.release?.(); }
}

function heading2(hud, text, x) {
  const w = text.length * 12 + 8;
  hud.rect(x - 1, 10, w, 21, 'navy');
  say(hud, x + 3, 12, text, { scale: 2, name: 'heading' });
}
