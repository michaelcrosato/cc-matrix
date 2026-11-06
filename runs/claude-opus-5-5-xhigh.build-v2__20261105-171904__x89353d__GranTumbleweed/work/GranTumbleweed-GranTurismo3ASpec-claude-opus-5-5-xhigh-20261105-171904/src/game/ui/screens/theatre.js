// The Theatre: the last race, and three slots for keeping one.
import { TRACKS } from '../../data/tracks.js';
import { Dialog, statusStrip } from './common.js';
export class TheatreScreen {
  constructor(app) { this.id = 'theatre'; this.app = app; }
  stageIt() { this.app.scene?.stage?.('theatre', { orbit: false, angle: 0.05, radius: 14, height: 3, lookY: 3, lookZ: -5, sun: 0.4, ambient: 0.8, person: 'dell', personClip: 'Wave', personAt: [-6.2, 0, -7], personYaw: 0.7 }); this.app.mix.music('longDrive'); }
  enter() { this.stageIt(); }
  resume() { this.stageIt(); }
  label(rec) { return rec ? `${TRACKS[rec.meta.track].name.toUpperCase()}` : 'EMPTY'; }
  draw(ui) {
    const app = this.app, p = app.profile, w = Math.min(ui.w - 16, 260), x = Math.round(ui.cx - w / 2); statusStrip(ui, app); ui.text(ui.cx, 20, 'THE THEATRE', { align: 'center', scale: 2, color: 'sand' });
    const last = app.lastRace; ui.panel(x - 6, 40, w + 12, 116, { color: 'ink', border: 'slate' });
    ui.button('last', x, 44, w, 20, `LAST RACE: ${last ? this.label(last) : 'NONE YET'}`, { left: true, confirm: () => (last ? app.watchRecording(last, { after: 'theatre' }) : null), denied: last ? null : () => ui.note('DRIVE SOMETHING FIRST. IT IS WORTH WATCHING.') });
    if (last && app.lastRaceSlot !== undefined) ui.text(x, 66, '', {});
    p.replays.forEach((z, k) => {
      const y = 72 + k * 26;
      ui.button(`slot${k}`, x, y, w, 22, `SLOT ${k + 1}: ${z ? this.label(z) : 'EMPTY'}`, { left: true, confirm: () => (z ? app.watchSaved(k, { after: 'theatre' }) : null), denied: z ? null : () => ui.note('THIS SLOT IS EMPTY. SAVE A REPLAY FROM A RESULTS SCREEN.'), right: z ? `DAY ${z.day ?? '-'}` : null });
    });
    ui.prompts([['confirm', 'WATCH'], ['alt', 'CLEAR SLOT'], ['back', 'MAP']]);
  }
  onAlt(ui) { const m = /^slot(\d)$/.exec(this.focus ?? ''); if (!m) return; const k = +m[1], p = this.app.profile; if (!p.replays[k]) return; const d = new Dialog(this.app, 'CLEAR THIS SLOT?', ['THE REPLAY WILL BE GONE. THE RACE STILL HAPPENED.'], [['no', 'KEEP', () => ui.pop()], ['yes', 'CLEAR', () => { p.replays[k] = null; this.app.save(); ui.pop(); }]]); d.under = this; d.focus = 'no'; ui.push(d); }
}
