// Results: one large table of at most 8 rows, then prize money counting up with a soft register sound, then points.
import { CAR_INFO } from '../../data/cars.js';
import { EVENTS, POINTS } from '../../data/events.js';
import { LINES } from '../../data/text.js';
import { TRACKS } from '../../data/tracks.js';
import { formatTime } from '../../sim/race.js';
import { cr } from './common.js';
const fill = (s, o) => s.replace('{TRACK}', o.track).replace('{NAME}', o.name).replace('{POS}', o.pos).replace('{TIME}', o.time ?? '');
export class ResultsScreen {
  constructor(app, o) { this.id = 'results'; this.app = app; this.o = o; this.t = 0; this.shown = 0; this.saved = false; this.defaultFocus = 'continue'; this.subtitleAt = 178; }
  enter(ui) {
    if (this.app.scene) this.app.scene.hudHidden = true;
    const o = this.o, track = TRACKS[o.track]?.name?.toUpperCase() ?? '', me = o.rows.find((r) => r.player === 0), list = me?.pos === 1 ? LINES.dell.win : (me?.pos ?? 9) <= 3 ? LINES.dell.podium : LINES.dell.mid, line = o.record ? LINES.dell.record : list[Math.round((o.seed ?? 1) * 7) % list.length];
    ui.say('dell', fill(line, { track, name: 'THE DRIVER', pos: `P${me?.pos ?? '-'}`, time: o.bestText }), 5);
    this.app.mix.sfx(me?.pos === 1 ? 'fanfare2' : 'sting');
  }
  draw(ui, dt) {
    const app = this.app, o = this.o, w = Math.min(ui.w - 16, 372), x = Math.round(ui.cx - w / 2), rows = o.rows.slice(0, 8), rh = 14, top = 26; this.t += dt;
    ui.panel(x, 6, w, ui.h - 30, { color: 'ink', border: 'slate' });
    ui.text(x + 8, 11, o.title ?? 'RESULTS', { color: 'sand' }); ui.text(x + w - 8, 11, TRACKS[o.track]?.name?.toUpperCase() ?? '', { align: 'right', color: 'mist' });
    rows.forEach((r, k) => {
      const y = top + k * rh, mine = r.player !== null && r.player !== undefined; if (mine) ui.rect(x + 3, y - 2, w - 6, rh - 1, 'navy');
      ui.text(x + 8, y + 1, `${r.pos}`, { color: k === 0 ? 'sand' : 'white', scale: 1 }); ui.text(x + 24, y + 1, r.name, { color: mine ? 'sand' : 'white' }); ui.text(x + 104, y + 1, CAR_INFO[r.carId].short, { color: 'mist' });
      ui.text(x + w - 44, y + 1, r.text ?? '', { align: 'right', color: k === 0 ? 'sand' : 'white' });
      if (o.showPoints) ui.text(x + w - 8, y + 1, `${POINTS[k] ?? 0}`, { align: 'right', color: 'lime' });
    });
    const by = top + rows.length * rh + 3;
    if (o.best) ui.text(x + 8, by, `YOUR BEST LAP ${formatTime(o.best)}${o.record ? ', A NEW RECORD' : ''}`, { color: o.record ? 'lime' : 'mist' });
    if (o.prize !== undefined) {
      const reveal = Math.min(1, this.t / 1.4), shown = Math.round(o.prize * reveal);
      if (shown !== this.shown && Math.floor(this.t * 12) !== Math.floor((this.t - dt) * 12)) app.mix.sfx('coin', { volume: 0.5 }); this.shown = shown;
      if (reveal >= 1 && !this.rang) { this.rang = true; if (o.prize > 0) app.mix.sfx('register'); }
      ui.text(x + 8, by + 11, 'PRIZE', { color: 'mist' }); ui.text(x + 56, by + 11, cr(shown), { color: 'sand' });
      if (o.points !== undefined) { ui.text(x + w - 8, by + 11, `${o.points} POINTS`, { align: 'right', color: 'lime' }); }
      if (o.seriesLine) ui.text(x + 8, by + 22, o.seriesLine, { color: o.seriesWon ? 'lime' : 'mist' });
    }
    const bw = Math.floor((w - 16 - 15) / 4), byy = ui.h - 44;
    ui.button('continue', x + 8, byy, bw, 15, 'CONTINUE', { confirm: () => app.resultsContinue(o) });
    if (o.retry !== false) ui.button('retry', x + 13 + bw, byy, bw, 15, 'RETRY', { confirm: () => app.resultsRetry(o) });
    ui.button('replay', x + 18 + bw * 2, byy, bw, 15, 'WATCH REPLAY', { confirm: () => app.watchReplay({ after: () => app.afterResultsReplay(o) }) });
    ui.button('save', x + 23 + bw * 3, byy, bw, 15, this.saved ? 'SAVED' : 'SAVE REPLAY', { confirm: () => this.saveAsk(ui), disabled: this.saved });
    ui.prompts([['confirm', 'CHOOSE']]);
    if (this.pickSlot) this.drawSlots(ui);
  }
  saveAsk() { this.pickSlot = true; }
  drawSlots(ui) { /* the slot picker pushes itself as its own screen, so input is its own */ ui.push(new SaveSlotScreen(this.app, this)); this.pickSlot = false; }
  onBack() { this.app.resultsContinue(this.o); return true; }
}
export class SaveSlotScreen {
  constructor(app, parent) { this.id = 'saveSlot'; this.app = app; this.parent = parent; }
  draw(ui) {
    const app = this.app, p = app.profile, w = 220, x = Math.round(ui.cx - w / 2), y = 70; ui.panel(x - 6, y - 16, w + 12, 100, { color: 'ink', border: 'sand' }); ui.text(ui.cx, y - 11, 'SAVE TO WHICH SLOT?', { align: 'center', color: 'sand' });
    p.replays.forEach((z, k) => ui.button(`slot${k}`, x, y + k * 20, w, 16, `SLOT ${k + 1}: ${z ? TRACKS[z.meta.track].name.toUpperCase() : 'EMPTY'}`, { left: true, confirm: () => { const ok = app.saveReplay(k); ui.pop(); if (ok) { this.parent.saved = true; ui.note('SAVED TO THE THEATRE.'); } else ui.note('THE STORAGE IS FULL. THE REPLAY WAS NOT SAVED.'); } }));
    ui.prompts([['confirm', 'SAVE'], ['back', 'BACK']]);
  }
}
export const eventRowsTitle = (id) => EVENTS[id]?.name ?? 'RESULTS';
