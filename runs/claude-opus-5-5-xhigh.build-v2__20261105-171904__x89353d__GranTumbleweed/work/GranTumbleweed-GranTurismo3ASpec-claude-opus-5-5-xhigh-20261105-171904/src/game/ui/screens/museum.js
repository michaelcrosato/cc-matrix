// The Museum: all fourteen cars with their brochure text and silhouette, and a page per track.
import { CAR_IDS, CAR_INFO, MARQUES } from '../../data/cars.js';
import { TRACKS } from '../../data/tracks.js';
import { formatTime } from '../../sim/race.js';
import { marqueBadge, miniMap, specCard, statusStrip } from './common.js';
const TRACK_IDS = Object.keys(TRACKS);
export class MuseumScreen {
  constructor(app) { this.id = 'museum'; this.app = app; this.tab = 0; this.car = 0; this.track = 0; }
  enter() { this.show(); this.app.mix.music('catalogue'); }
  resume() { this.show(); this.app.mix.music('catalogue'); }
  seen(id) { const p = this.app.profile; return !!p.seen[id] || p.cars.some((c) => c.carId === id); }
  show() { const id = CAR_IDS[this.car], s = this.app.scene; s?.stage?.('museum', this.tab === 0 ? { car: { carId: id, install: null, silhouette: !this.seen(id), y: 0.2 }, radius: 8.2, height: 2.6 } : { orbit: true, radius: 13, height: 5, lookY: 2 }); }
  draw(ui) {
    const app = this.app, p = app.profile, a = app.actions; statusStrip(ui, app); ui.text(8, 19, 'MUSEUM', { scale: 2, color: 'sand' });
    ui.tabs('t', 8, 38, 120, ['CARS', 'CIRCUITS'], this.tab, (i) => { this.tab = i; this.show(); });
    ui.item('page', 0, 0, 0, 0, { noBox: true, onX: (d) => { if (this.tab === 0) { this.car = (this.car + d + CAR_IDS.length) % CAR_IDS.length; this.show(); } else this.track = (this.track + d + TRACK_IDS.length) % TRACK_IDS.length; app.mix.sfx('tick'); }, confirm: () => { this.brochure = !this.brochure; }, onY: () => {} });
    if (this.tab === 0) {
      const id = CAR_IDS[this.car], i = CAR_INFO[id], seen = this.seen(id), w = 168, x = ui.w - w - 8;
      if (seen) specCard(ui, x, 20, w, id, null, { foot: `${this.car + 1} OF ${CAR_IDS.length}`, footColor: 'slate' });
      else { ui.panel(x, 20, w, 44, { color: 'ink', border: 'slate' }); ui.text(x + 6, 26, 'NOT YET MET', { color: 'slate' }); ui.text(x + 6, 36, MARQUES[i.marque].name, { color: 'mist' }); marqueBadge(ui, x + w - 15, 26, i.marque); ui.text(x + w - 6, 52, `${this.car + 1} OF ${CAR_IDS.length}`, { align: 'right', color: 'slate' }); }
      if (seen) { const lines = i.text, bw = Math.min(ui.w - 16, 340), by = ui.h - 36 - 16 - lines.length * 10; ui.panel(8, by, bw, 15 + lines.length * 10, { color: 'ink', border: 'slate' }); ui.text(14, by + 3, `${MARQUES[i.marque].name}: ${MARQUES[i.marque].line}`, { color: 'sand' }); lines.forEach((l, k) => ui.text(14, by + 13 + k * 10, l)); }
      ui.prompts([['moveX', 'NEXT CAR'], ['tabs', 'TAB'], ['back', 'MAP']]);
    } else {
      const id = TRACK_IDS[this.track], def = TRACKS[id], rec = p.records[id], w = Math.min(ui.w - 16, 320), x = Math.round(ui.cx - w / 2);
      ui.panel(x, 54, w, 150, { color: 'ink', border: 'slate' });
      ui.text(x + 8, 60, def.name.toUpperCase(), { scale: 2, color: 'sand' });
      const m = miniMap(ui, x + 10, 86, id, 100, 'white');
      ui.text(x + 124, 90, `LENGTH ${(m.length / 1000).toFixed(2)} KM`); ui.text(x + 124, 102, `${m.corners} CORNERS`); ui.text(x + 124, 114, def.surface === 'dirt' ? 'DIRT' : 'ASPHALT', { color: 'mist' }); ui.text(x + 124, 126, def.pit ? 'PIT LANE' : 'NO PITS', { color: 'mist' });
      ui.text(x + 124, 144, 'RECORD', { color: 'slate' }); ui.text(x + 124, 154, rec ? formatTime(rec.lap) : 'NONE YET', { color: rec ? 'sand' : 'slate' }); if (rec) ui.text(x + 124, 164, CAR_INFO[rec.carId].short, { color: 'mist' });
      ui.text(x + w - 8, 192, `${this.track + 1} OF ${TRACK_IDS.length}`, { align: 'right', color: 'slate' });
      ui.prompts([['moveX', 'NEXT CIRCUIT'], ['tabs', 'TAB'], ['back', 'MAP']]);
    }
    void a;
  }
}
