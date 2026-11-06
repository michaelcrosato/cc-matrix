// Dealer Row: the used lot and three showrooms. Turntable under lamps, slow orbit, Mr. Fenn.
import { SHOWROOMS, showroomCars, CARS } from '../../data/cars.js';
import { canBuy, buyCar, hasCar } from '../../sim/career.js';
import { tunedRow, emptyInstall, specOf } from '../../sim/tuning.js';
import { testDriveSetup } from '../../sim/setups.js';
import { LINES } from '../../data/text.js';
import { scr, stdBack, statusStrip } from './common.js';
import { wrap, fmtCr } from '../ui.js';
import { SPEAKERS } from '../../audio/voice.js';
export const Dealer = (room0 = 0, car0 = 0) => scr('dealer', { set: 'showroom', music: 'dealer', room: room0, car: car0, brochure: false, setArgs(app) { return { car: this.current(app), paint: null }; },
  current(app) { const list = showroomCars(SHOWROOMS[this.room].id, !!app.profile.licences.A); this.car = Math.min(this.car, list.length - 1); return list[this.car].id; },
  onEnter(app) { app.scene.showCarAt?.(this.current(app)); if (!app.saidFenn) { app.saidFenn = true; app.ui.say(LINES.fennHello, SPEAKERS.fenn); } },
  draw(ui) { const app = ui.app, p = app.profile, a = app.actions, list = showroomCars(SHOWROOMS[this.room].id, !!p.licences.A); ui.title(SHOWROOMS[this.room].name); statusStrip(app, ui);
    let change = 0; if (ui.leftRight) change = ui.leftRight;
    if (a.pressed('tabR')) { this.room = (this.room + 1) % SHOWROOMS.length; this.car = 0; this.sync(app); } if (a.pressed('tabL')) { this.room = (this.room - 1 + SHOWROOMS.length) % SHOWROOMS.length; this.car = 0; this.sync(app); }
    if (change) { this.car = (this.car + change + list.length) % list.length; this.sync(app); app.mix.ui('tick'); }
    const id = list[Math.min(this.car, list.length - 1)].id, c = CARS[id], s = specOf(id, {}), owned = hasCar(p, id), can = canBuy(p, id), W = 186, x = ui.W - W - 8;
    if (this.brochure) { const bw = Math.min(46, Math.floor((ui.W - W - 34) / 6)), lines = wrap(c.brochure, bw); ui.panel(8, 30, bw * 6 + 12, lines.length * 10 + 24); ui.text(14, 36, c.name, { color: 'sand' }); lines.forEach((l, i) => ui.hud.text(14, 48 + i * 10, l, { color: 'white' })); }
    ui.panel(x, 32, W, 92); ui.text(x + 6, 37, c.shortName, { color: 'sand', scale: 1 }); ui.text(x + 6, 48, c.marque, { color: 'mist' }); ui.text(x + 6, 60, `${c.year}  ${s.layout}`, { color: 'white' }); ui.text(x + 6, 72, `${s.ps} PS`, { color: 'white' }); ui.text(x + 6, 84, `${s.kg.toLocaleString('en-US')} KG`, { color: 'white' }); ui.text(x + 6, 98, fmtCr(c.price), { color: can.ok ? 'lime' : 'orange', scale: 1 }); ui.text(x + 6, 110, owned ? 'YOU OWN ONE.' : can.ok ? '' : can.why, { color: 'mist' });
    ui.panel(x, 125, W, 13); ui.text(x + 4, 128, `${this.car + 1}/${list.length}`, { color: 'mist' }); ui.right(x + W - 4, 128, '< NEXT CAR >', { color: 'white' });
    if (ui.button('buy', x, 140, W, 22, 'BUY', { disabled: !can.ok })) { const rec = buyCar(p, id); if (rec) { app.save(); app.mix.ui('register'); ui.say(LINES.fennBuy, SPEAKERS.fenn); ui.toast(`${c.shortName} IS YOURS`); app.scene.carSink?.(); app.onboard?.(); } } else if (ui.confirmHit === 'buy') ui.say(LINES.fennPoor, SPEAKERS.fenn);
    if (ui.button('testdrive', x, 165, W, 20, 'TEST DRIVE')) app.startRace(testDriveSetup(id, { ...emptyInstall(), paint: c.paint }, { screen: 'dealer', room: this.room, car: this.car }));
    if (ui.button('brochure', x, 188, W, 20, this.brochure ? 'CLOSE BROCHURE' : 'BROCHURE')) this.toggle(app, c);
    if (a.pressed('alt')) app.startRace(testDriveSetup(id, { ...emptyInstall(), paint: c.paint }, { screen: 'dealer', room: this.room, car: this.car }));
    if (a.pressed('info')) this.toggle(app, c);
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['alt', 'DRIVE'], ['info', 'BROCHURE'], ['tabs', 'SHOWROOM'], ['back', 'BACK']]); void tunedRow; },
  toggle(app, c) { this.brochure = !this.brochure; if (this.brochure) app.ui.say(c.fenn ?? 'Please read the kerb weight twice. It rewards you.', SPEAKERS.fenn); },
  sync(app) { const id = this.current(app); app.scene.showCarAt?.(id); app.mix.play('whirr'); this.brochure = false; p0: void 0; },
});
