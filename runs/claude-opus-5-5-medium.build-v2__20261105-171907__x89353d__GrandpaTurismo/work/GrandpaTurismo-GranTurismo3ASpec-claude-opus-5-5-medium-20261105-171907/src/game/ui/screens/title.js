// Title, new game, the touch gate, the Map.
import { TITLE, SUBTITLE } from '../../data/meta.js';
import { PLACES, LINES } from '../../data/text.js';
import { nudge, carRec, newProfile } from '../../sim/career.js';
import { CARS } from '../../data/cars.js';
import { scr, statusStrip } from './common.js';
import { fmtCr } from '../ui.js';
import { SPEAKERS } from '../../audio/voice.js';
export function speakerOff(ui, x, y) { ui.hud.sprite(x, y, ['r..#...r', '.r##..r.', '###r.r..', '####r...', '###r.r..', '.r##..r.', 'r..#...r'], { '#': 'mist', r: 'red' }); }
const LOGO_COLORS = ['orange', 'sand', 'red'];
function logo(ui, y) {
  const a = 'GRANDPA', b = 'TURISMO', sc = 4, wa = a.length * 6 * sc, xa = Math.round(ui.cx - wa / 2); ui.hud.rect(xa - 8, y - 6, wa + 16, 84, 'ink');
  [...a].forEach((ch, i) => ui.hud.text(xa + i * 6 * sc, y + Math.round(Math.sin(ui.t * 1.2 + i * 0.5) * 1.2), ch, { scale: sc, color: 'white', shadow: 'navy' }));
  [...b].forEach((ch, i) => ui.hud.text(xa + i * 6 * sc, y + 32, ch, { scale: sc, color: LOGO_COLORS[i % 3], shadow: 'ink' }));
  ui.center(y + 66, SUBTITLE, { color: 'white' });
}
export const TitleScreen = () => scr('title', { set: 'map', music: 'title', attract: true, setArgs: () => ({ title: true }), onEnter(app) { this.confirm = false; this.gate = app.touchGate(); },
  draw(ui, dt) {
    const app = ui.app, has = app.hasSave(); logo(ui, 22);
    if (app.touchGate()) {
      ui.center(130, 'CONTROLLER OR KEYBOARD REQUIRED', { scale: 1, color: 'sand' });
      ui.center(146, 'CONNECT ONE, OR PRESS ANY KEY, TO PLAY.', { color: 'white' });
      if (ui.button('gear', ui.cx - 50, 170, 100, 26, 'SETTINGS', {})) ui.push(app.screens.Settings());
      return;
    }
    if (this.confirm) {
      ui.center(116, 'A NEW GAME REPLACES THE OLD ONE.', { color: 'sand' }); ui.center(128, 'THE CARS WILL BE RETURNED. PLEASE BE SURE.', { color: 'white' });
      if (ui.button('sure', ui.cx - 104, 150, 100, 24, 'START AGAIN')) app.newGame();
      if (ui.button('keep', ui.cx + 4, 150, 100, 24, 'KEEP MY SAVE')) this.confirm = false;
      if (ui.backHit) { this.confirm = false; ui.backHit = false; }
      ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]); return;
    }
    const items = has ? [['continue', 'CONTINUE'], ['new', 'NEW GAME'], ['settings', 'SETTINGS'], ['about', 'ABOUT']] : [['new', 'NEW GAME'], ['settings', 'SETTINGS'], ['about', 'ABOUT']];
    const w = 120, x0 = ui.cx - w / 2, y0 = 108;
    items.forEach(([id, label], i) => { if (ui.button(id, x0, y0 + i * 26, w, 22, label, { scale: 1 })) this.pick(app, id); });
    if (!app.mix.audio?.unlocked) { const s = 'PRESS A KEY OR CLICK FOR SOUND', x = Math.round(ui.cx - (s.length * 6) / 2); ui.hud.rect(x - 16, ui.H - 31, s.length * 6 + 20, 12, 'ink'); speakerOff(ui, x - 13, ui.H - 29); ui.text(x, ui.H - 29, s, { color: 'mist' }); }
    ui.prompts([['confirm', 'SELECT']]);
    void dt;
  },
  pick(app, id) { const ui = app.ui; if (id === 'continue') app.toMap(); if (id === 'new') { if (app.hasSave()) this.confirm = true; else app.newGame(); } if (id === 'settings') ui.push(app.screens.Settings()); if (id === 'about') ui.push(app.screens.About()); },
});
export const GreetScreen = () => scr('greet', { set: 'licence', music: 'licence', onEnter(app) { app.ui.say(LINES.aiMeet, SPEAKERS.arai, { time: 8 }); },
  draw(ui) { const app = ui.app; ui.title('THE HALCYON PENINSULA'); ui.panel(ui.cx - 180, 32, 360, 76); ui.para(ui.cx - 170, 40, 'YOU ARRIVE WITH 15,000 CREDITS, NO LICENCE AND AN APPETITE. PEOPLE HERE WASH THEIR CARS ON SUNDAYS AND ARGUE ABOUT TYRE PRESSURES AT WEDDINGS.', 56, { color: 'white' }); ui.center(90, 'FIRST, A CAR.', { color: 'sand' });
    if (ui.button('ok', ui.cx - 70, ui.H - 46, 140, 22, 'TO DEALER ROW')) { app.profile.greeted = true; app.save(); ui.subtitle = null; ui.replace(app.screens.Dealer()); app.ui.stack.unshift(app.screens.Map()); }
    ui.prompts([['confirm', 'CONTINUE']]); } });
export const MapScreen = () => scr('map', { set: 'map', music: 'map', attract: true, setArgs: () => ({ title: false }), onEnter(app) { const ns = nudge(app.profile); this.sel = ns.place; app.ui.focus = null; }, sel: null,
  /** Left and right walk the ring of buildings, so every place is always reachable. */
  nav(d, ui) { if (d !== 'left' && d !== 'right') return false; const ids = PLACES.map((x) => x.id), i = ids.indexOf(ui.focus); ui.focus = ids[(i + (d === 'right' ? 1 : -1) + ids.length) % ids.length]; ui.playTick(); return true; },
  draw(ui) {
    const app = ui.app, p = app.profile, ns = nudge(p), scene = app.scene;
    // the places are items; their screen rectangles come from the projected positions
    ui.hud.rect(0, 0, ui.W, 22, 'ink'); ui.hud.rect(0, 22, ui.W, 1, 'slate'); ui.text(10, 8, 'THE HALCYON PENINSULA', { color: 'sand' }); statusStrip(app, ui);
    const pts = scene.placeRects ?? [];
    PLACES.forEach((pl, i) => { const r = pts[i]; if (!r) return; const f = ui.focus === pl.id; if (ui.item(pl.id, r.x, r.y, r.w, r.h, { label: pl.name })) this.go(app, pl.id); if (f) scene.mapFocus = i; if (!f) ui.hud.rect(r.x + r.w / 2 - 1, r.y + r.h - 3, 3, 3, ns.place === pl.id ? 'lime' : 'white'); });
    if (this.sel && pts.length) { ui.focus = this.sel; this.sel = null; }
    const cur = PLACES.find((x) => x.id === ui.focus);
    if (cur) { const w = 300, x = ui.cx - w / 2, y = 26; ui.panel(x, y, w, 30); ui.center(y + 5, cur.name, { color: 'sand' }); ui.center(y + 17, cur.blurb, { color: 'white' }); }
    { const w = Math.max(300, ns.text.length * 6 + 12), x = ui.cx - w / 2; ui.hud.rect(x, ui.H - 32, w, 12, 'ink'); ui.center(ui.H - 30, ns.text, { color: 'lime' }); }
    const r = carRec(p); ui.status(r ? `CAR: ${CARS[r.id].shortName}` : 'NO CAR YET');
    const a = app.actions;
    if (a.pressed('info')) ui.push(app.screens.Handbook()); if (a.pressed('alt')) ui.push(app.screens.Settings());
    ui.backHit = false;
    ui.prompts([['confirm', 'ENTER'], ['alt', 'SETTINGS'], ['info', 'HANDBOOK'], ['pause', 'MENU']]);
    if (a.pressed('pause')) ui.push(app.screens.MapPause());
  },
  go(app, id) { const s = app.screens, ui = app.ui, p = app.profile; const map = { licence: s.LicenceCentre, events: s.EventHall, dealer: s.Dealer, tuning: s.Tuning, service: s.Service, home: s.Garage, museum: s.Museum, theatre: s.Theatre, arcade: s.Arcade }; if (!p.cars.length && !['dealer', 'arcade', 'museum', 'theatre'].includes(id)) { app.mix.ui('denied'); ui.toast('FIRST, A CAR. DEALER ROW IS OPEN.', 'sand'); return; } ui.push(map[id]()); },
});
export const MapPause = () => scr('mappause', { draw(ui) { const app = ui.app; ui.panel(ui.cx - 80, 50, 160, 160, 'ink', 'slate'); ui.center(58, 'MENU', { color: 'sand', scale: 2 }); const items = [['resume', 'RESUME'], ['settings', 'SETTINGS'], ['handbook', 'HANDBOOK'], ['about', 'ABOUT'], ['dev', 'DEV MODE'], ['title', 'TO TITLE']]; items.forEach(([id, l], i) => { if (ui.button(id, ui.cx - 66, 78 + i * 21, 132, 18, l)) { if (id === 'resume') ui.pop(); if (id === 'settings') ui.push(app.screens.Settings()); if (id === 'handbook') ui.push(app.screens.Handbook()); if (id === 'about') ui.push(app.screens.About()); if (id === 'dev') ui.push(app.screens.Dev()); if (id === 'title') app.toTitle(); } }); if (ui.backHit) { ui.backHit = false; app.mix.ui('back'); ui.pop(); } ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
void newProfile; void fmtCr;
