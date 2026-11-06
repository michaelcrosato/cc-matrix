// Dealer Row: the used lot and three showrooms. Turntable under lamps, slow orbit, the attendant's voice.
import { CAR_INFO, MARQUES, SHOWROOMS } from '../../data/cars.js';
import { LINES } from '../../data/text.js';
import { buyCar, carPriceOpen } from '../../sim/career.js';
import { cr, specCard, statusStrip } from './common.js';
export class DealerScreen {
  constructor(app, o = {}) { this.id = 'dealer'; this.app = app; this.room = 0; this.car = 0; this.o = o; this.brochure = false; this.noBack = !!o.first; }
  enter(ui) { this.show(); this.app.mix.music('catalogue'); ui.say('fenn', LINES.fenn.hello); }
  resume() { this.show(); this.app.mix.music('catalogue'); }
  get list() { return SHOWROOMS[this.room].cars; }
  show(sound = false) { const app = this.app, id = this.list[this.car % this.list.length]; app.scene?.stage?.('showroom', { showroom: this.room, car: { carId: id, install: null }, person: 'fenn', personClip: 'DealerPresent', personAt: [-3.6, 0, -2.2], personYaw: 0.7, radius: 8.4, height: 2.5, lookX: -1.1, angle: 0.2 }); this.brochure = false; if (sound) { app.mix.sfx('whirr'); const line = CAR_INFO[id].fenn; app.ui.say('fenn', line); app.profile.seen[id] = true; } }
  next(d) { this.car = (this.car + d + this.list.length) % this.list.length; this.show(true); }
  nextRoom(d) { this.room = (this.room + d + SHOWROOMS.length) % SHOWROOMS.length; this.car = 0; this.show(true); }
  draw(ui) {
    const app = this.app, p = app.profile, room = SHOWROOMS[this.room], id = this.list[this.car % this.list.length], i = CAR_INFO[id], open = carPriceOpen(p, id), can = open && p.credits >= i.price, owned = p.cars.some((c) => c.carId === id);
    statusStrip(ui, app); ui.text(10, 19, room.name, { color: 'sand', scale: 2 }); ui.text(10, 37, room.line, { color: 'mist' });
    const w = 168, x = ui.w - w - 8; let y = 20;
    const foot = open ? cr(i.price) : i.after ? `AFTER LICENCE ${i.after}` : 'NOT FOR SALE';
    y += specCard(ui, x, y, w, id, null, { foot, footColor: can ? 'sand' : 'red' }) + 4;
    if (owned) ui.text(x + w, y, 'YOU OWN ONE', { align: 'right', color: 'lime' });
    if (this.brochure) { const lines = i.text, bw = Math.min(ui.w - 16, 340), bx = 8, by = ui.h - 36 - 16 - lines.length * 10; ui.panel(bx, by, bw, 14 + lines.length * 10 + 2, { color: 'ink', border: 'sand' }); ui.text(bx + 6, by + 3, MARQUES[i.marque].name, { color: 'sand' }); lines.forEach((l, k) => ui.text(bx + 6, by + 13 + k * 10, l)); }
    // A dot per car.
    this.list.forEach((c, k) => ui.rect(10 + k * 8, 48, 6, 3, k === this.car ? 'sand' : 'slate'));
    const by = ui.h - 36;
    const buy = () => { const r = buyCar(p, id); if (!r.ok) { app.mix.sfx('denied'); ui.say('fenn', r.why === 'money' ? LINES.fenn.poor : LINES.fenn.lowLicence); return; } app.save(); app.mix.sfx('register'); ui.say('fenn', LINES.fenn.bought); if (app.scene?.car) app.scene.car.settle = 0.16; if (this.o.first) { this.o.first = false; this.noBack = false; ui.note('A CAR. THE MAP IS OPEN.'); } };
    ui.item('car', 8, by, 110, 16, { noBox: false, confirm: buy, onX: (d) => this.next(d), denied: can ? null : () => { app.mix.sfx('denied'); ui.say('fenn', open ? LINES.fenn.poor : LINES.fenn.lowLicence); } });
    ui.rect(8, by, 110, 16, ui.focused('car') ? 'navy' : 'night'); ui.text(63, by + 5, can ? `BUY FOR ${cr(i.price)}` : open ? 'TOO DEAR FOR NOW' : 'NOT YET', { align: 'center', color: can ? 'white' : 'slate' });
    ui.prompts([['confirm', 'BUY'], ['moveX', 'NEXT CAR'], ['tabs', 'SHOWROOM'], ['info', 'BROCHURE'], ['alt', 'TEST DRIVE'], ['back', 'MAP']]);
    if (app.actions.pressed('tabL')) this.nextRoom(-1); if (app.actions.pressed('tabR')) this.nextRoom(1);
  }
  onInfo(ui) { this.brochure = !this.brochure; if (this.brochure) { ui.subtitle = null; this.app.mix.stopVoice(); } this.app.mix.sfx('tick'); }
  onAlt() { const id = this.list[this.car % this.list.length]; this.app.startTestDrive(id, null, { from: 'dealer', room: this.room, car: this.car, first: this.o.first }); }
  onBack(ui) { if (this.o.first && !this.app.profile.cars.length) { this.app.mix.sfx('denied'); ui.note('YOU WILL NEED A CAR FIRST.'); return false; } ui.pop(); return true; }
}
