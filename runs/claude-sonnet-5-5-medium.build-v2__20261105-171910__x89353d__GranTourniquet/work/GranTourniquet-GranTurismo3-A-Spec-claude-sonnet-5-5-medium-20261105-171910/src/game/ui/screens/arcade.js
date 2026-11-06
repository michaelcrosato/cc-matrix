// Arcade Gate: Quick Race, Time Trial, Couch Duel. Every car and track is open from the first minute. Plan section 6 (Arcade).
import { SCREENS } from '../nav.js';
import { App, S, money, fmtTime } from '../../app.js';
import { CAR_INFO, CAR_IDS, PHYS_ROWS } from '../../data/cars.js';
import { TRACKS } from '../../data/tracks.js';
import { displayStats, defaultInstall } from '../../sim/tuning.js';
import { goRace } from '../../scenes/flow.js';
import { statusStrip, drawTrackMini } from './main.js';
import { quickField } from '../../sim/fields.js';
import { playerEntry } from '../../sim/fields.js';
const TRACK_IDS = Object.keys(TRACKS);
SCREENS.arcade = (nav, t, ctx, ui, sc) => {
  sc.camBuilding('arcade'); sc.camMapMode(); sc.hidePeople(); App.music?.play('map'); ui.title('ARCADE GATE', 'NO LICENCE REQUIRED. NO MONEY EITHER.'); const A = ui.A;
  [['quick', 'QUICK RACE', 'ANY TRACK, ANY CAR. A FIELD OF UP TO EIGHT.'], ['trial', 'TIME TRIAL', 'ALONE WITH A CLOCK, AND THE GHOST OF YOUR BEST LAP.'], ['duel', 'COUCH DUEL', 'TWO PLAYERS, ONE SCREEN. SPLIT DOWN THE MIDDLE.']].forEach(([id, label, about], i) => { const x = 16 + i * 150, y = 50; const r = ui.item(id, x, y, 144, 110); ui.panel(x, y, 144, 110, r.focus ? 'blue' : 'navy', r.focus ? 'sky' : 'slate'); ui.text(x + 8, y + 10, label, { scale: 2, color: 'sand' }); ui.prose(x + 8, y + 40, about, { n: 22, max: 5, color: 'white' }); if (r.pressed) { App.mix?.sfx?.('confirm'); nav.push('pickTrack', { kind: id }); } });
  ui.text(16, 172, 'ARCADE PAYS NO CREDITS. THE CAREER STAYS UNTOUCHED.', { color: 'mist' }); ui.prompts([['move', 'CHOOSE'], ['confirm', 'OPEN'], ['back', 'BACK']]); if (A.back) nav.pop();
};
SCREENS.pickTrack = (nav, t, ctx, ui, sc) => {
  const st = t.s, A = ui.A, a = t.args; st.i ??= 0; sc.camMapMode(); ui.title(({ quick: 'QUICK RACE', trial: 'TIME TRIAL', duel: 'COUCH DUEL' })[a.kind], 'CHOOSE A TRACK'); if (A.moveX) { st.i = (st.i + A.moveX + TRACK_IDS.length) % TRACK_IDS.length; App.mix?.sfx?.('tick'); } const id = TRACK_IDS[st.i], d = TRACKS[id];
  ui.item('trk', 0, 0, 1, 1, { slider: true }); ui.panel(40, 40, 400, 120, 'ink', 'slate'); const m = drawTrackMini(ui, id, 50, 46, 108); ui.text(170, 52, d.name, { scale: 2, color: 'sand' }); ui.text(170, 74, 'LENGTH ' + Math.round(m.len) + ' M', { color: 'white' }); ui.text(170, 85, 'CORNERS ' + m.corners, { color: 'white' }); ui.text(170, 96, d.surface === 'dirt' ? 'DIRT' : 'TARMAC', { color: 'sky' }); ui.text(170, 107, d.hour >= 20 ? 'NIGHT' : d.hour >= 17 ? 'DUSK' : 'DAY', { color: 'sky' }); const rec = App.profile.records[id]; ui.text(170, 123, rec ? 'RECORD ' + fmtTime(rec.time) : '', { color: 'lime' });
  ui.text(ui.W / 2 - 20, 166, `${st.i + 1}/${TRACK_IDS.length}`, { color: 'mist' }); if (A.confirm) { nav.push('pickCar', { ...a, track: id }); App.mix?.sfx?.('confirm'); } ui.prompts([['move', 'TRACK'], ['confirm', 'CHOOSE'], ['back', 'BACK']]); if (A.back) nav.pop();
};
SCREENS.pickCar = (nav, t, ctx, ui, sc) => {
  const st = t.s, A = ui.A, a = t.args, p = App.profile; st.i ??= Math.max(0, CAR_IDS.indexOf(p.cars.find((c) => c.uid === p.current)?.carId ?? 'kite')); sc.camShow({ r: 9, h: 2.8 }); sc.showroom.set('dealer'); sc.hidePeople();
  const who = a.kind === 'duel' ? (a.car1 ? 'PLAYER 2' : 'PLAYER 1') : ''; if (A.moveX) { st.i = (st.i + A.moveX + CAR_IDS.length) % CAR_IDS.length; App.mix?.sfx?.('whirr'); } const id = CAR_IDS[st.i]; if (st.shown !== id) { st.shown = id; sc.showroom.show(id, defaultInstall()); sc.showroom.bounce(); }
  ui.text(10, 20, 'CHOOSE A CAR ' + who, { scale: 2, color: 'sand' }); const s = displayStats(id, null), i = CAR_INFO[id]; ui.item('car', 10, 50, 1, 1, { slider: true, disabled: 'skip' }); ui.panel(10, 50, 190, 80, 'ink', 'slate'); ui.text(16, 56, i.name, { color: 'sand' }); [['LAYOUT', PHYS_ROWS[id].layout], ['POWER', s.ps + ' PS'], ['WEIGHT', s.kg + ' KG']].forEach(([k, v], n) => { ui.text(16, 72 + n * 11, k, { color: 'sky' }); ui.text(80, 72 + n * 11, v, { color: 'white' }); }); ui.text(16, 110, `${st.i + 1}/${CAR_IDS.length}`, { color: 'mist' });
  if (A.confirm) { App.mix?.sfx?.('confirm'); if (a.kind === 'duel' && !a.car1) nav.push('pickCar', { ...a, car1: id }); else if (a.kind === 'trial') nav.push('trialOpts', { ...a, car: id }); else nav.push('quickOpts', { ...a, car: a.car1 ?? id, car2: a.car1 ? id : undefined }); }
  ui.prompts([['move', 'CAR'], ['confirm', 'CHOOSE'], ['back', 'BACK']]); if (A.back) nav.pop();
};
const LEVELS = ['EASY', 'NORMAL', 'HARD'], LVL = [0.85, 0.92, 0.98], HOURS = [8, 12, 15, 18.5, 21], HN = ['MORNING', 'NOON', 'AFTERNOON', 'DUSK', 'NIGHT'];
SCREENS.quickOpts = (nav, t, ctx, ui, sc) => {
  const st = t.s, A = ui.A, a = t.args; st.laps ??= 3; st.size ??= a.kind === 'duel' ? 2 : 6; st.lvl ??= 1; st.hour ??= 0; st.rain ??= 0; st.contact ??= 1; const tr = TRACKS[a.track]; if (st.hour === 0 && st.init !== 1) { st.init = 1; st.hour = Math.max(0, HOURS.findIndex((h) => Math.abs(h - tr.hour) < 2)); } sc.camShow({ r: 9, h: 2.8 }); sc.hidePeople();
  ui.title((a.kind === 'duel' ? 'COUCH DUEL' : 'QUICK RACE') + '  ' + tr.name, CAR_INFO[a.car].short); let y = 36, x = 40, w = ui.W - 80;
  const LAPV = [1, 2, 3, 4, 5, 6, 8, 10]; st.laps = LAPV[ui.option('laps', x, y, w, 'LAPS', LAPV.map(String), Math.max(0, LAPV.indexOf(st.laps)))]; y += 20;
  if (a.kind === 'duel') { st.size = ui.option('ai', x, y, w, 'AI CARS', ['0', '1', '2', '3', '4'], Math.min(4, st.size - 2 < 0 ? 0 : st.size - 2)) + 2; y += 20; st.contact = ui.option('ct', x, y, w, 'CONTACT', ['OFF', 'ON'], st.contact); y += 20; }
  else { st.size = ui.option('sz', x, y, w, 'FIELD', ['2', '3', '4', '5', '6', '7', '8'], Math.max(0, st.size - 2)) + 2; y += 20; st.lvl = ui.option('lv', x, y, w, 'LEVEL', LEVELS, st.lvl); y += 20; }
  st.hour = ui.option('hr', x, y, w, 'TIME OF DAY', HN, st.hour); y += 20; st.rain = ui.option('rn', x, y, w, 'RAIN', ['OFF', 'ON'], st.rain); y += 26;
  if (ui.button('go', x, y, 120, 20, 'START').pressed) startArcade(a, st);
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'CHANGE'], ['back', 'BACK']]); if (A.back) nav.pop();
};
SCREENS.trialOpts = (nav, t, ctx, ui, sc) => {
  const st = t.s, A = ui.A, a = t.args; st.pass ??= 0; st.rain ??= 0; sc.camShow({ r: 9, h: 2.8 }); ui.title('TIME TRIAL  ' + TRACKS[a.track].name, CAR_INFO[a.car].short); let y = 40;
  st.pass = ui.option('pp', 40, y, ui.W - 80, 'PASS THE PAD', ['OFF', '2 PLAYERS'], st.pass); y += 20; st.rain = ui.option('rn', 40, y, ui.W - 80, 'RAIN', ['OFF', 'ON'], st.rain); y += 30; ui.text(40, y - 6, 'YOUR BEST LAP IS KEPT AS A GHOST. BEAT IT.', { color: 'mist' }); y += 10; if (ui.button('go', 40, y, 120, 20, 'START').pressed) startArcade(a, st);
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'CHANGE'], ['back', 'BACK']]); if (A.back) nav.pop();
};
export function startArcade(a, st) {
  const p = App.profile, install = defaultInstall(), tr = TRACKS[a.track], hour = a.kind === 'trial' ? tr.hour : HOURS[st.hour ?? 0] ?? tr.hour, rain = (st.rain ?? 0) === 1;
  const back = { screen: 'arcade', args: {} };
  if (a.kind === 'trial') return goRace({ mode: 'trial', track: a.track, hour: tr.hour, rain, title: 'TIME TRIAL', trial: { carId: a.car, install, pass: st.pass === 1 }, returnTo: back, music: true });
  const pool = ['kite', 'ginga', 'moth', 'ryu', 'brandt32', 'heck', 'libeccio', 'longhorn']; const pace = LVL[st.lvl ?? 1], size = st.size ?? 6, nai = a.kind === 'duel' ? size - 2 : size - 1; const ai = Array.from({ length: nai }, (_, k) => ({ id: 'ai' + k, carId: pool[(k * 3 + 1) % pool.length], name: ['ARAKI', 'BELL', 'COSTA', 'DUNN', 'EBERLE', 'FOX', 'GRAVES'][k % 7], player: false, skill: a.kind === 'duel' ? 0.9 : pace - 0.03 + (0.03 * k) / Math.max(1, nai - 1), install: defaultInstall(), colour: ['blue', 'green', 'orange', 'sand', 'cyan', 'plum', 'lime'][k % 7] }));
  const me = { id: 'player', carId: a.car, name: a.kind === 'duel' ? 'P1' : 'YOU', player: true, skill: 1, install, colour: 'red' };
  if (a.kind === 'duel') { const p2 = { id: 'player2', carId: a.car2 ?? a.car, name: 'P2', player: true, p2: true, skill: 1, install: defaultInstall(), colour: 'sky' }; return App.startDuel ? App.startDuel({ track: a.track, hour, rain, laps: st.laps, field: [me, p2, ...ai], contact: st.contact === 1, returnTo: back }) : null; }
  return goRace({ mode: 'race', track: a.track, hour, rain, quick: true, title: 'QUICK RACE', sim: { laps: st.laps, field: [me, ...ai], contact: true, start: 'rolling', rain, wearMul: 0.25, seed: 31 }, returnTo: back, music: true });
}
