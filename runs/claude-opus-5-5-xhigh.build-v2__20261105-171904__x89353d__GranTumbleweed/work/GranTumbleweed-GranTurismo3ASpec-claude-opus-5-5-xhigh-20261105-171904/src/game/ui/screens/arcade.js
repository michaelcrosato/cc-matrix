// The Arcade Gate: Quick Race, Time Trial, Couch Duel as big tiles, then two or three simple picker screens. Every car and track is open.
import { CAR_IDS, CAR_INFO } from '../../data/cars.js';
import { TRACKS } from '../../data/tracks.js';
import { miniMap, specCard, statusStrip } from './common.js';
const TRACK_IDS = Object.keys(TRACKS);
const stageIt = (app, car) => { app.scene?.stage?.('arcade', { car: car ? { carId: car, install: null, y: 0.18 } : undefined, radius: 8, height: 2.6, sun: 0.4, ambient: 0.9 }); app.mix.music('city'); };
export class ArcadeScreen {
  constructor(app) { this.id = 'arcade'; this.app = app; }
  enter() { stageIt(this.app, 'libeccio'); }
  resume() { stageIt(this.app, 'libeccio'); }
  draw(ui) {
    const app = this.app; statusStrip(ui, app); ui.text(ui.cx, 20, 'ARCADE GATE', { align: 'center', scale: 2, color: 'cyan' }); ui.text(ui.cx, 37, 'NO LICENCE REQUIRED. NO MONEY EITHER.', { align: 'center', color: 'mist' });
    const tiles = [['quick', 'QUICK RACE', 'ANY CAR, ANY CIRCUIT, A FIELD OF RIVALS.'], ['trial', 'TIME TRIAL', 'YOU, THE CLOCK, AND THE GHOST OF YOUR BEST.'], ['couch', 'COUCH DUEL', 'TWO PLAYERS, ONE TELEVISION, REAL CONTACT.']], w = Math.min(Math.floor((ui.w - 24) / 3), 150), x0 = Math.round(ui.cx - (w * 3 + 8) / 2);
    tiles.forEach(([id, name, line], k) => { const x = x0 + k * (w + 4), f = ui.item(id, x, 150, w, 66, { confirm: () => ui.push(new PickTrack(app, { mode: id })) }); ui.rect(x, 150, w, 66, f ? 'navy' : 'ink'); ui.text(x + w / 2, 157, name, { align: 'center', color: f ? 'cyan' : 'white' }); ui.lines(x + 6, 171, line, { chars: Math.floor((w - 12) / 6), gap: 10, color: 'mist' }); });
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'MAP']]);
  }
}
class PickTrack {
  constructor(app, o) { this.id = 'pickTrack'; this.app = app; this.o = o; this.i = 0; }
  enter() { stageIt(this.app); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, id = TRACK_IDS[this.i], def = TRACKS[id], w = Math.min(ui.w - 40, 280), x = Math.round(ui.cx - w / 2); ui.text(ui.cx, 12, 'CHOOSE A CIRCUIT', { align: 'center', scale: 2, color: 'cyan' });
    const f = ui.item('track', x, 34, w, 150, { onX: (d) => { this.i = (this.i + d + TRACK_IDS.length) % TRACK_IDS.length; app.mix.sfx('tick'); }, confirm: () => ui.push(new PickCar(app, { ...this.o, track: id })) });
    ui.rect(x, 34, w, 150, f ? 'navy' : 'ink'); ui.text(ui.cx, 40, `< ${def.name.toUpperCase()} >`, { align: 'center', color: 'sand' }); const m = miniMap(ui, Math.round(ui.cx - 55), 54, id, 110, 'white'); ui.text(ui.cx, 170, `${(m.length / 1000).toFixed(2)} KM, ${m.corners} CORNERS`, { align: 'center', color: 'mist' });
    ui.prompts([['moveX', 'CHANGE'], ['confirm', 'NEXT'], ['back', 'BACK']]);
  }
}
class PickCar {
  constructor(app, o) { this.id = 'pickCar'; this.app = app; this.o = o; this.i = 1; this.player = 0; this.first = null; }
  show() { stageIt(this.app, CAR_IDS[this.i]); }
  enter() { this.show(); }
  resume() { this.show(); }
  draw(ui) {
    const app = this.app, id = CAR_IDS[this.i], w = 168, x = ui.w - w - 8, couch = this.o.mode === 'couch';
    ui.text(8, 10, couch ? `PLAYER ${this.player + 1}: CHOOSE A CAR` : 'CHOOSE A CAR', { scale: 1, color: 'cyan' });
    specCard(ui, x, 8, w, id, null, { foot: `${this.i + 1} OF ${CAR_IDS.length}`, footColor: 'slate' });
    ui.item('car', 8, ui.h - 44, 120, 18, { onX: (d) => { this.i = (this.i + d + CAR_IDS.length) % CAR_IDS.length; this.show(); app.mix.sfx('whirr'); }, confirm: () => this.choose(ui, id) });
    ui.rect(8, ui.h - 44, 120, 18, ui.focused('car') ? 'navy' : 'ink'); ui.text(68, ui.h - 38, `< ${CAR_INFO[id].short} >`, { align: 'center', color: 'sand' });
    ui.prompts([['moveX', 'CHANGE'], ['confirm', 'NEXT'], ['back', 'BACK']]);
  }
  choose(ui, id) {
    const app = this.app, o = this.o;
    if (o.mode === 'trial') return app.startTimeTrial({ track: o.track, carId: id });
    if (o.mode === 'couch' && this.player === 0) { this.first = id; this.player = 1; this.i = (this.i + 3) % CAR_IDS.length; this.show(); return; }
    ui.push(new PickRace(app, { ...o, carId: o.mode === 'couch' ? this.first : id, carB: id }));
  }
}
const HOURS = [['TRACK\'S OWN', null], ['MORNING', 9], ['AFTERNOON', 15], ['DUSK', 18.5], ['NIGHT', 21]], DIFF = [['EASY', 'easy'], ['NORMAL', 'normal'], ['HARD', 'hard']];
class PickRace {
  constructor(app, o) { this.id = 'pickRace'; this.app = app; this.o = o; this.laps = 3; this.field = o.mode === 'couch' ? 2 : 6; this.diff = 1; this.hour = 0; this.rain = false; }
  enter() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, o = this.o, w = Math.min(ui.w - 40, 280), x = Math.round(ui.cx - w / 2), couch = o.mode === 'couch'; ui.text(ui.cx, 12, couch ? 'THE DUEL' : 'THE RACE', { align: 'center', scale: 2, color: 'cyan' });
    let y = 34; const row = (id, label, val, onX) => { const f = ui.item(id, x, y, w, 18, { onX: (d) => { onX(d); app.mix.sfx('tick'); }, confirm: () => onX(1) }); ui.rect(x, y, w, 18, f ? 'navy' : 'ink'); ui.text(x + 8, y + 6, label, { color: f ? 'white' : 'mist' }); ui.text(x + w - 8, y + 6, `< ${val} >`, { align: 'right', color: f ? 'sand' : 'mist' }); y += 22; };
    row('laps', 'LAPS', String(this.laps), (d) => { this.laps = Math.max(1, Math.min(12, this.laps + d)); });
    if (couch) row('field', 'AI CARS', String(this.field - 2), (d) => { this.field = Math.max(2, Math.min(6, this.field + d)); });
    else row('field', 'FIELD', String(this.field), (d) => { this.field = Math.max(1, Math.min(8, this.field + d)); });
    if (!couch) row('diff', 'PACE', DIFF[this.diff][0], (d) => { this.diff = (this.diff + d + 3) % 3; });
    row('hour', 'HOUR', HOURS[this.hour][0], (d) => { this.hour = (this.hour + d + HOURS.length) % HOURS.length; });
    row('rain', 'RAIN', this.rain ? 'YES' : 'NO', () => { this.rain = !this.rain; });
    ui.button('go', ui.cx - 60, y + 6, 120, 18, 'START', { confirm: () => { const hour = HOURS[this.hour][1] ?? undefined; if (couch) app.startCouch({ track: o.track, carA: o.carId, carB: o.carB, laps: this.laps, ai: this.field - 2, hour, rain: this.rain }); else app.startQuick({ track: o.track, carId: o.carId, laps: this.laps, field: this.field, difficulty: DIFF[this.diff][1], hour, rain: this.rain }); } });
    ui.prompts([['moveX', 'CHANGE'], ['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}
