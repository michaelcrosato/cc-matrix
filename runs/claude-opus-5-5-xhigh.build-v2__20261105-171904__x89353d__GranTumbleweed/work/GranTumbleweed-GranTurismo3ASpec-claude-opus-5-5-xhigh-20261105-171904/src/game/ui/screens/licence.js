// The Licence Centre: three licences, four tests each, a card for each test, and a result after each attempt.
import { LICENCE_ORDER, LICENCES, TESTS } from '../../data/licences.js';
import { CAR_INFO } from '../../data/cars.js';
import { TRACKS } from '../../data/tracks.js';
import { LINES } from '../../data/text.js';
import { licenceOpen, testRecord } from '../../sim/career.js';
import { formatTime } from '../../sim/race.js';
import { cr, MEDAL_NAME, medalIcon, statusStrip } from './common.js';
import { wrapText } from '../ui.js';
const stageIt = (app) => { const s = app.scene; s?.stage?.('licence', { person: 'arai', personClip: 'ExaminerClipboard', personAt: [-3.4, 0, -0.6], personYaw: 0.6, orbit: false, angle: 0.25, radius: 11, height: 3, lookX: -2.2, lookY: 1.2, lookZ: -1 }); app.mix.music('exam'); };
export class LicenceListScreen {
  constructor(app) { this.id = 'licenceList'; this.app = app; this.subtitleAt = 214; }
  enter(ui) { stageIt(this.app); if (!this.app.profile.tests['C-1']) ui.say('arai', LINES.arai.idle); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, p = app.profile; statusStrip(ui, app); ui.text(10, 20, 'LICENCE CENTRE', { scale: 2, color: 'sand' });
    const w = Math.min(ui.w - 20, 256), x = ui.w - w - 10;
    LICENCE_ORDER.forEach((id, k) => {
      const l = LICENCES[id], open = licenceOpen(p, id), medals = l.tests.map((t) => p.tests[t]?.medal), y = 44 + k * 58, h = 52;
      const f = ui.item(id, x, y, w, h, open ? { confirm: () => ui.push(new TestListScreen(app, id)) } : { denied: () => ui.note(`THE ${LICENCES[l.needs].name} LICENCE COMES FIRST.`) });
      ui.rect(x, y, w, h, open ? (f ? 'navy' : 'night') : 'ink');
      ui.text(x + 8, y + 6, `${id}: ${l.name}`, { color: open ? 'sand' : 'slate' }); ui.text(x + 8, y + 17, l.line, { color: open ? 'white' : 'slate' });
      medals.forEach((m, i) => medalIcon(ui, x + 8 + i * 13, y + 30, m));
      ui.text(x + w - 8, y + 32, p.licences[id] ? 'HELD' : `REWARD ${cr(l.reward)}`, { align: 'right', color: p.licences[id] ? 'lime' : 'mist' });
    });
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'MAP']]);
  }
}
export class TestListScreen {
  constructor(app, lic) { this.id = 'testList'; this.app = app; this.subtitleAt = 208; this.lic = lic; }
  enter() { stageIt(this.app); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, l = LICENCES[this.lic], p = app.profile; statusStrip(ui, app);
    ui.text(10, 20, `LICENCE ${l.id}`, { scale: 2, color: 'sand' }); ui.text(10, 38, l.name, { color: 'mist' });
    const w = Math.min(ui.w - 20, 230), x = ui.w - w - 10;
    l.tests.forEach((id, k) => {
      const t = TESTS[id], rec = p.tests[id], y = 34 + k * 44, h = 39, f = ui.item(id, x, y, w, h, { confirm: () => ui.push(new TestCardScreen(app, id)) });
      ui.rect(x, y, w, h, f ? 'navy' : 'night'); medalIcon(ui, x + 7, y + 6, rec?.medal);
      ui.text(x + 22, y + 6, `${id} ${t.title}`, { color: 'white' }); ui.text(x + 22, y + 17, t.lesson, { color: 'mist' });
      ui.text(x + 22, y + 27, rec?.best ? `BEST ${formatTime(rec.best)}` : 'NOT ATTEMPTED', { color: rec?.best ? 'sand' : 'slate' });
    });
    if (l.allGold) { ui.text(10, ui.h - 42, 'ALL GOLD:', { color: 'sand' }); ui.text(10, ui.h - 32, l.allGold.text.slice(0, 40), { color: 'mist' }); }
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}
export class TestCardScreen {
  constructor(app, id) { this.id = 'testCard'; this.app = app; this.test = TESTS[id]; }
  enter(ui) { stageIt(this.app); ui.say('arai', this.test.brief.join(' '), 8); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, t = this.test, rec = app.profile.tests[t.id], m = t.medals, w = Math.min(ui.w - 20, 340), x = ui.w - w - 10, y = 4, offer = (rec?.fails ?? 0) >= 3, chars = Math.floor((w - 16) / 6);
    ui.panel(x, y, w, 184, { color: 'ink', border: 'slate' });
    ui.text(x + 8, y + 6, t.id, { color: 'slate' }); ui.text(x + 8, y + 15, t.title, { scale: 2, color: 'sand' });
    ui.text(x + 8, y + 36, `${t.legs ? t.legs.map((c) => CAR_INFO[c].short).join(', ') : CAR_INFO[t.carId].name}`, { color: 'white' }); ui.text(x + 8, y + 46, TRACKS[t.track].name.toUpperCase(), { color: 'mist' });
    ui.lines(x + 8, y + 60, wrapText(t.brief.join(' '), chars), { gap: 10 });
    const my = y + 96; for (const [k, name, col] of [[0, 'gold', 'sand'], [1, 'silver', 'mist'], [2, 'bronze', 'orange']]) { medalIcon(ui, x + 8, my + k * 11 - 1, name); ui.text(x + 22, my + k * 11, formatTime(m[name]), { color: col }); }
    ui.text(x + w - 8, my, 'YOUR BEST', { align: 'right', color: 'slate' }); ui.text(x + w - 8, my + 11, rec?.best ? formatTime(rec.best) : '--', { align: 'right' }); if (rec?.medal) ui.text(x + w - 8, my + 22, MEDAL_NAME[rec.medal], { align: 'right', color: 'sand' });
    if (t.assists) ui.text(x + 8, my + 34, Object.entries(t.assists).map(([k, v]) => `${k.toUpperCase()} ${v === false || v === 0 ? 'OFF' : v}`).join('  '), { color: 'red' });
    ui.lines(x + 8, my + 44, wrapText(offer ? 'THE EXAMINER OFFERS THE DRIVING LINE.' : t.tip, chars), { gap: 10, color: offer ? 'lime' : 'mist' });
    const by = y + 162, bw = Math.floor((w - 22) / 3);
    ui.button('start', x + 6, by, bw, 18, 'BEGIN', { confirm: () => app.startTest(t.id) });
    ui.button('demo', x + 11 + bw, by, bw, 18, 'DEMONSTRATION', { confirm: () => app.startTest(t.id, { demo: true }) });
    ui.button('line', x + 16 + bw * 2, by, bw, 18, app.options.assists.line || this.line ? 'LINE: ON' : 'LINE: OFF', { confirm: () => { this.line = !this.line; app.lineForTest = this.line; }, disabled: !offer && !app.options.assists.line, denied: offer ? null : () => ui.note('THE EXAMINER WILL OFFER THIS AFTER THREE ATTEMPTS.') });
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}
// After each attempt: medal, time, gap to the next medal; Retry, Watch your replay, Demonstration, Back.
export class TestResultScreen {
  constructor(app, o) { this.id = 'testResult'; this.app = app; this.o = o; this.t = 0; }
  enter(ui) { const o = this.o, lines = LINES.arai, list = o.failed ? lines.fail : (lines[o.medal] ?? lines.fail); ui.say('arai', list[(o.time ? Math.round(o.time * 7) : 3) % list.length]); this.app.mix.sfx(o.medal ? 'medal' : 'denied'); if (o.licenceWon) this.app.mix.sfx('fanfare2'); }
  draw(ui, dt) {
    const app = this.app, o = this.o, t = o.test, w = Math.min(ui.w - 40, 280), h = 140, x = Math.round(ui.cx - w / 2), y = 40; this.t += dt;
    ui.panel(x, y, w, h, { color: 'ink', border: o.medal ? 'sand' : 'red' });
    ui.text(ui.cx, y + 7, `${t.id} ${t.title}`, { align: 'center', color: 'mist' });
    if (o.failed) { ui.text(ui.cx, y + 22, 'NOT PASSED', { align: 'center', scale: 2, color: 'red' }); ui.text(ui.cx, y + 44, o.reason, { align: 'center' }); }
    else {
      if (o.medal) { medalIcon(ui, ui.cx - 4, y + 19, o.medal); ui.text(ui.cx, y + 31, MEDAL_NAME[o.medal], { align: 'center', scale: 2, color: 'sand' }); }
      else ui.text(ui.cx, y + 22, 'NO MEDAL', { align: 'center', scale: 2, color: 'red' });
      ui.text(ui.cx, y + 50, formatTime(o.time), { align: 'center', scale: 2 });
      if (o.next) ui.text(ui.cx, y + 70, `${(o.time - t.medals[o.next]).toFixed(2)} S FROM ${MEDAL_NAME[o.next]}`, { align: 'center', color: 'mist' });
    }
    if (o.licenceWon) ui.text(ui.cx, y + 82, `LICENCE ${LICENCES[t.licence].name} EARNED. +${cr(o.reward)}`, { align: 'center', color: 'lime' });
    else if (o.prizeCar) ui.text(ui.cx, y + 82, `ALL GOLD. PRIZE: ${CAR_INFO[o.prizeCar].name}`, { align: 'center', color: 'lime' });
    else if (o.notSaved) ui.text(ui.cx, y + 82, 'NOT RECORDED: DEV SLIDERS ARE OFF THEIR DEFAULTS', { align: 'center', color: 'red' });
    const by = y + h - 40, bw = Math.floor((w - 18) / 2);
    ui.button('retry', x + 6, by, bw, 15, 'RETRY', { confirm: () => app.startTest(t.id) });
    ui.button('replay', x + 12 + bw, by, bw, 15, 'WATCH YOUR REPLAY', { confirm: () => app.watchReplay({ after: () => app.afterTestReplay(this.o) }) });
    ui.button('demo', x + 6, by + 18, bw, 15, 'DEMONSTRATION', { confirm: () => app.startTest(t.id, { demo: true }) });
    ui.button('backTo', x + 12 + bw, by + 18, bw, 15, 'BACK', { confirm: () => app.backToTests(t.id, this.o) });
    if (!this.focus) this.focus = o.medal && !o.failed ? 'backTo' : 'retry';
    ui.prompts([['confirm', 'CHOOSE']]);
  }
  onBack() { this.app.backToTests(this.o.test.id, this.o); return true; }
}
void testRecord;
