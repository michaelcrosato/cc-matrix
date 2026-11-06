// The Arcade Gate: Quick Race, Time Trial, Couch Duel as big tiles, then two or three simple picker screens.
import { CAR_LIST, CARS } from '../../data/cars.js';
import { TRACKS } from '../../data/tracks.js';
import { quickRaceSetup, trialSetup, couchSetup } from '../../sim/setups.js';
import { drawMini } from './events.js';
import { specOf } from '../../sim/tuning.js';
import { scr, stdBack } from './common.js';
const TRACK_IDS = Object.keys(TRACKS);
export const Arcade = () => scr('arcade', { set: 'arcade', music: 'map',
  draw(ui) { const app = ui.app; ui.title('ARCADE GATE', 'NO LICENCE REQUIRED. NO MONEY EITHER.'); const w = Math.min(130, Math.floor((ui.W - 40) / 3)), y = ui.H - 100, h = 74; [['quick', 'QUICK RACE', 'ANY TRACK, ANY CAR'], ['trial', 'TIME TRIAL', 'YOU AND YOUR GHOST'], ['couch', 'COUCH DUEL', 'TWO PLAYERS, ONE TV']].forEach(([id, l, sub], i) => { const x = Math.round(ui.cx - (w * 3 + 16) / 2 + i * (w + 8)); if (ui.button(id, x, y, w, h, l, {})) { const cfg = { mode: id, track: 'kestrel', carId: 'ginga', car2: 'kite', laps: 2, field: 6, pace: 0.92, hour: null, rain: false, ai: 0 }; ui.push(TrackPick(cfg)); } ui.center; const t = sub; ui.hud.text(Math.round(x + (w - t.length * 6) / 2), y + h - 16, t.length * 6 > w - 4 ? t.slice(0, Math.floor((w - 4) / 6)) : t, { color: 'mist' }); }); if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
const TrackPick = (cfg) => scr('picktrack', { set: 'arcade', music: 'map', idx: 0,
  draw(ui) { const app = ui.app; ui.title('CHOOSE A CIRCUIT'); if (ui.leftRight) { this.idx = (this.idx + ui.leftRight + TRACK_IDS.length) % TRACK_IDS.length; app.mix.ui('tick'); } const id = TRACK_IDS[this.idx], T = TRACKS[id]; cfg.track = id; ui.panel(ui.cx - 110, 34, 220, 150); drawMini(ui, id, ui.cx - 55, 42, 110, 'sand'); ui.center(158, T.name, { color: 'white', scale: 1 }); ui.center(170, `< ${this.idx + 1} OF ${TRACK_IDS.length} >`, { color: 'mist' }); if (ui.button('next', ui.cx - 60, 192, 120, 24, 'THIS ONE')) ui.push(CarPick(cfg)); if (stdBack(app, ui)) return; ui.prompts([['lr', 'CHANGE'], ['confirm', 'NEXT'], ['back', 'BACK']]); } });
const CarPick = (cfg, which = 1) => scr('pickcar', { set: 'arcade', music: 'map', idx: CAR_LIST.findIndex((c) => c.id === (which === 1 ? cfg.carId : cfg.car2)), setArgs() { return { car: CAR_LIST[this.idx].id }; },
  draw(ui) { const app = ui.app; ui.title(cfg.mode === 'couch' ? `PLAYER ${which}: CHOOSE A CAR` : 'CHOOSE A CAR'); if (ui.leftRight) { this.idx = (this.idx + ui.leftRight + CAR_LIST.length) % CAR_LIST.length; app.scene.showCarAt?.(CAR_LIST[this.idx].id); app.mix.ui('tick'); } const c = CAR_LIST[this.idx], s = specOf(c.id, {}); const x = ui.W - 170; ui.panel(x, 34, 160, 66); ui.text(x + 6, 40, c.shortName, { color: 'sand' }); ui.text(x + 6, 54, `${s.layout}  ${c.year}`, { color: 'white' }); ui.text(x + 6, 66, `${s.ps} PS`, { color: 'white' }); ui.text(x + 6, 78, `${s.kg.toLocaleString('en-US')} KG`, { color: 'white' }); ui.text(x + 6, 89, `< ${this.idx + 1} OF ${CAR_LIST.length} >`, { color: 'mist' });
    if (ui.button('next', x, 110, 160, 24, 'THIS ONE')) { if (which === 1) cfg.carId = c.id; else cfg.car2 = c.id; if (cfg.mode === 'couch' && which === 1) ui.push(CarPick(cfg, 2)); else ui.push(Options(cfg)); }
    if (stdBack(app, ui)) return; ui.prompts([['lr', 'CHANGE'], ['confirm', 'NEXT'], ['back', 'BACK']]); } });
const HOURS = [[null, 'USUAL HOUR'], [11, 'MORNING'], [18.5, 'DUSK'], [21, 'NIGHT']], DIFF = [[0.85, 'EASY'], [0.92, 'NORMAL'], [0.98, 'HARD']];
const Options = (cfg) => scr('pickoptions', { set: 'arcade', music: 'map', hi: 0, di: 1,
  draw(ui) { const app = ui.app; ui.title('THE LAST FEW QUESTIONS'); const x = ui.cx - 110, w = 220; let y = 34, r = 0; const row = (id, label, val, adj) => { const f = ui.focus === id; ui.button(id, x, y, w, 22, `${label}: ${val}`, {}); if (f && ui.leftRight) { adj(ui.leftRight); app.mix.ui('tick'); } y += 25; r++; };
    if (cfg.mode !== 'trial') row('laps', 'LAPS', cfg.laps, (d) => (cfg.laps = Math.max(1, Math.min(10, cfg.laps + d))));
    if (cfg.mode === 'quick') { row('field', 'FIELD', cfg.field, (d) => (cfg.field = Math.max(2, Math.min(8, cfg.field + d)))); row('diff', 'PACE', DIFF[this.di][1], (d) => { this.di = (this.di + d + 3) % 3; cfg.pace = DIFF[this.di][0]; }); }
    if (cfg.mode === 'couch') row('ai', 'AI CARS', cfg.ai, (d) => (cfg.ai = Math.max(0, Math.min(4, cfg.ai + d))));
    row('hour', 'HOUR', HOURS[this.hi][1], (d) => { this.hi = (this.hi + d + 4) % 4; cfg.hour = HOURS[this.hi][0]; }); row('rain', 'RAIN', cfg.rain ? 'YES' : 'NO', () => (cfg.rain = !cfg.rain));
    if (ui.button('go', x, y + 4, w, 26, 'GO', { color: 'lime' })) this.go(app, cfg);
    if (stdBack(app, ui)) return; ui.prompts([['lr', 'CHANGE'], ['confirm', 'GO'], ['back', 'BACK']]); },
  go(app, c) { const h = c.hour ?? undefined; if (c.mode === 'quick') app.startRace(quickRaceSetup({ ...c, hour: h, seed: (app.profile?.day ?? 1) * 7 + c.laps })); if (c.mode === 'trial') app.startRace(trialSetup({ ...c, hour: h })); if (c.mode === 'couch') app.startCouch(couchSetup({ track: c.track, car1: c.carId, car2: c.car2, laps: c.laps, ai: c.ai, hour: h, rain: c.rain, pace: 0.9 })); },
});
void CARS;
