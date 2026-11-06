// The Home Garage: your cars on a turntable with mileage, oil and setup; choose your ride; sell. A trophy shelf and your statistics.
import { CAR_INFO } from '../../data/cars.js';
import { EVENTS } from '../../data/events.js';
import { LICENCES } from '../../data/licences.js';
import { LAST_CAR, LINES, PRIZE_SELL } from '../../data/text.js';
import { collectedShare, oilOf, sellCar, sellValue, setCurrent } from '../../sim/career.js';
import { PALETTE, THREE, toonMaterial } from '../../../pixel-engine.js';
import { GeoBatch } from '../../render/geo.js';
import { cr, Dialog, num, specCard, statusStrip } from './common.js';
import { TYRES } from '../../data/tyres.js';
const { Group } = THREE;
export class GarageScreen {
  constructor(app, o = {}) { this.id = 'garage'; this.app = app; this.tab = 0; this.index = 0; this.o = o; }
  enter() { this.index = Math.max(0, this.app.profile.cars.findIndex((c) => c.uid === this.app.profile.current)); this.show(); this.app.mix.music('lounge'); }
  resume() { this.show(); }
  exit() { this.shelf?.removeFromParent(); }
  show() {
    const app = this.app, cars = app.profile.cars, c = cars[Math.min(this.index, cars.length - 1)], s = app.scene; if (!c) return;
    s?.stage?.('garage', { car: { carId: c.carId, install: c.install, dirt: c.dirt, y: 0.18 }, radius: 8.4, height: 2.6, angle: 0.3, lookX: -1.1 });
    this.buildShelf();
  }
  buildShelf() { // A 3D cup or medal for every win.
    const app = this.app, s = app.scene; this.shelf?.removeFromParent(); const list = app.profile.trophies; if (!s?.base) return;
    const b = new GeoBatch(); list.slice(0, 27).forEach((t, k) => { const x = -9 + (k % 9) * 2.2, row = Math.floor(k / 9), y = 1.3 + row * 2, z = -11.2; if (t.kind === 'cup') { b.cone(x, y, z, 0.3, 0.15, 6, 'slate', 0.3); b.cone(x, y + 0.15, z, 0.08, 0.3, 6, 'sand', 0.08); b.cone(x, y + 0.45, z, 0.14, 0.5, 8, 'sand', 0.34); } else if (t.kind === 'helmet') { b.ball(x, y + 0.34, z, 0.34, 'sand', 8, 0.9); b.box(x, y + 0.26, z + 0.18, 0.46, 0.16, 0.2, 'ink'); } else { b.box(x, y, z, 0.5, 0.06, 0.3, 'slate'); b.box(x, y + 0.06, z, 0.4, 0.55, 0.06, t.id === 'A' ? 'sand' : t.id === 'B' ? 'mist' : 'orange'); } });
    if (b.triangles) { this.shelf = new Group(); this.shelf.add(b.mesh({ cast: true, receive: false })); this.shelf.position.copy(s.base); s.sets.root.add(this.shelf); }
    void toonMaterial; void PALETTE;
  }
  draw(ui) {
    const app = this.app, p = app.profile; statusStrip(ui, app); ui.text(8, 19, 'HOME GARAGE', { scale: 2, color: 'sand' });
    ui.tabs('t', 8, 38, 170, ['CARS', 'TROPHIES', 'STATS'], this.tab, (i) => { this.tab = i; this.focus = null; ui.box.ready = false; });
    if (this.tab === 0) this.cars(ui, p); else if (this.tab === 1) this.trophies(ui, p); else this.stats(ui, p);
  }
  cars(ui, p) {
    const app = this.app, cars = p.cars; if (this.index >= cars.length) this.index = cars.length - 1; const c = cars[this.index], cur = p.current === c.uid, w = 168, x = ui.w - w - 8, o = oilOf(c);
    specCard(ui, x, 20, w, c.carId, c.install, { extra: [['ODOMETER', `${num(c.km)} KM`], ['OIL', o > 1 ? 'FRESH' : o === 1 ? 'FINE' : `${Math.round((o - 1) * 100)}%`]], foot: `${this.index + 1} OF ${cars.length}`, footColor: 'slate' });
    const nav = (d) => { this.index = (this.index + d + cars.length) % cars.length; this.show(); app.mix.sfx('whirr'); }, by = 56;
    ui.button('drive', 8, by, 170, 18, cur ? 'THIS IS YOUR RIDE' : 'CHOOSE THIS CAR', { confirm: () => { setCurrent(p, c.uid); app.save(); if (this.o.onChoose) this.o.onChoose(ui); }, onX: nav, color: cur ? 'lime' : 'white', right: null });
    ui.button('sell', 8, by + 22, 170, 15, c.prize ? 'NOT FOR SALE' : `SELL FOR ${cr(sellValue(c))}`, { confirm: () => this.sell(ui, c), onX: nav });
    ui.text(8, by + 42, '< > NEXT CAR', { color: 'slate' });
    const tuned = Object.keys(c.install.setup ?? {}).length, fitted = c.install.owned.length;
    ui.panel(8, by + 54, 170, 36, { color: 'ink', border: false });
    ui.text(14, by + 58, `TYRES ${c.install.tyre ? TYRES[c.install.tyre].name : 'STOCK'}`, { color: 'mist' });
    ui.text(14, by + 68, c.lastWear === undefined ? 'NO RACE WEAR YET' : `LAST RACE LEFT ${Math.round(c.lastWear * 100)}% TYRE`, { color: 'mist' });
    ui.text(14, by + 78, `${fitted} PART${fitted === 1 ? '' : 'S'}, ${tuned} SETTING${tuned === 1 ? '' : 'S'}`, { color: 'mist' });
    ui.prompts([['confirm', 'CHOOSE'], ['moveX', 'NEXT CAR'], ['tabs', 'TAB'], ['back', 'BACK']]);
  }
  sell(ui, c) {
    const app = this.app, p = app.profile;
    if (c.prize) { ui.note(PRIZE_SELL); app.mix.sfx('denied'); return; }
    if (p.cars.length <= 1) { ui.note(LAST_CAR); app.mix.sfx('denied'); return; }
    const d = new Dialog(app, `SELL THE ${CAR_INFO[c.carId].short}?`, [`YOU WILL RECEIVE ${cr(sellValue(c))}.`], [['no', 'KEEP', () => ui.pop()], ['yes', 'SELL', () => { sellCar(p, c.uid); app.save(); app.mix.sfx('register'); ui.pop(); this.index = 0; this.show(); ui.say('fenn', LINES.fenn.sold); }]]); d.under = this; d.focus = 'no'; ui.push(d);
  }
  trophies(ui, p) {
    const names = p.trophies.map((t) => (t.kind === 'cup' ? EVENTS[t.id].name : t.kind === 'helmet' ? 'THE GOLD HELMET' : `${LICENCES[t.id].name} LICENCE`)), w = Math.min(ui.w - 16, 260);
    if (!names.length) ui.lines(8, 58, 'THE SHELF IS EMPTY. IT HAS BEEN DUSTED ANYWAY.', { chars: 40, color: 'mist' });
    ui.panel(8, 56, w, 12 + Math.min(14, names.length) * 10, { color: 'ink', border: false, scan: true });
    names.slice(0, 14).forEach((n, k) => ui.text(14, 60 + k * 10, n, { color: 'sand' }));
    ui.prompts([['tabs', 'TAB'], ['back', 'BACK']]);
  }
  stats(ui, p) {
    const rows = [['DAYS', num(p.day)], ['KILOMETRES', num(p.stats.km)], ['RACES', num(p.stats.races)], ['WINS', num(p.stats.wins)], ['GOLD MEDALS', num(p.stats.gold)], ['CARS COLLECTED', `${collectedShare(p)}%`]], x = 8, w = 170;
    ui.panel(x, 56, w, 10 + rows.length * 12, { color: 'ink', border: 'slate' });
    rows.forEach(([k, v], i) => { ui.text(x + 6, 62 + i * 12, k, { color: 'mist' }); ui.text(x + w - 6, 62 + i * 12, v, { align: 'right', color: 'white' }); });
    ui.prompts([['tabs', 'TAB'], ['back', 'BACK']]);
  }
}
