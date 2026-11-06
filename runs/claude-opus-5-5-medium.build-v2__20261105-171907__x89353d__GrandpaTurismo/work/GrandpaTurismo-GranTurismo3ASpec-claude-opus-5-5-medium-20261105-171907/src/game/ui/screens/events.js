// The Event Hall: cards by licence tier, restriction, rounds with mini-maps, prize. Warns if the current car doesn't qualify.
import { EVENTS, EVENT } from '../../data/events.js';
import { eventOpen, carQualifies, carRec, eventState, resetEvent } from '../../sim/career.js';
import { CARS } from '../../data/cars.js';
import { getTrack } from '../../sim/race.js';
import { TRACKS } from '../../data/tracks.js';
import { careerRoundSetup } from '../../sim/setups.js';
import { miniMap } from '../racehud.js';
import { scr, stdBack, statusStrip } from './common.js';
import { TIPS } from '../../data/text.js';
const maps = {};
export function trackMini(id, size = 40) { const k = `${id}${size}`; return (maps[k] ??= miniMap(getTrack(id).tr, size)); }
export function drawMini(ui, id, x, y, size = 40, c = 'white') { const m = trackMini(id, size); for (let i = 0; i < m.pts.length; i += 2) ui.hud.rect(x + m.pts[i], y + m.pts[i + 1], 1, 1, c); }
const PAGE = 5;
export const EventHall = (page0 = 0) => scr('events', { set: 'hall', music: 'map', page: page0,
  draw(ui) { const app = ui.app, p = app.profile; ui.title('EVENT HALL'); statusStrip(app, ui); const pages = Math.ceil(EVENTS.length / PAGE); if (app.actions.pressed('tabR')) { this.page = (this.page + 1) % pages; ui.focus = null; } if (app.actions.pressed('tabL')) { this.page = (this.page - 1 + pages) % pages; ui.focus = null; }
    EVENTS.slice(this.page * PAGE, this.page * PAGE + PAGE).forEach((e, i) => { const o = eventOpen(p, e.id), st = p.events[e.id], y = 30 + i * 37, w = Math.min(290, ui.W - 20); const sub = !o.ok ? o.why : st?.won ? `WON. ${e.limitText}` : st?.round ? `ROUND ${st.round + 1} OF ${e.rounds.length}. ${e.limitText}` : e.limitText; if (ui.button(e.id, 10, y, w, 33, e.name, { left: true, sub, disabled: !o.ok, color: st?.won ? 'lime' : undefined })) ui.push(EventCard(e.id)); });
    ui.right(ui.W - 10, 26, `PAGE ${this.page + 1} OF ${pages}`, { color: 'white' });
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['tabs', 'PAGE'], ['back', 'BACK']]); } });
export const EventCard = (id) => scr('eventcard', { set: 'hall', music: 'map',
  draw(ui) { const app = ui.app, p = app.profile, e = EVENT[id], st = eventState(p, id), r = carRec(p), q = carQualifies(e, r.id, r.install); ui.title(e.name); statusStrip(app, ui);
    ui.para(10, 30, e.intro, 58, { color: 'white' });
    ui.text(10, 54, e.limitText, { color: 'sand' });
    e.rounds.forEach((rd, i) => { const x = 10 + i * 66, y = 66, on = i === st.round; ui.hud.rect(x, y, 62, 62, on ? 'navy' : 'ink'); drawMini(ui, rd.track, x + 11, y + 2, 40, on ? 'sand' : 'mist'); ui.text(x + 3, y + 44, TRACKS[rd.track].name.split(' ')[0].slice(0, 9), { color: 'white' }); ui.text(x + 3, y + 53, `${rd.laps} LAPS`, { color: 'mist' }); });
    ui.text(10, 134, `1ST ${e.prize.toLocaleString('en-US')} CR A ROUND`, { color: 'white' }); ui.text(10, 146, e.prizeCar ? `SERIES: ${CARS[e.prizeCar].shortName}${e.bonus ? ` + ${e.bonus.toLocaleString('en-US')} CR` : ''}` : `SERIES: ${e.bonus.toLocaleString('en-US')} CR`, { color: 'sand' });
    ui.text(10, 160, `YOUR CAR: ${CARS[r.id].shortName}`, { color: q.ok ? 'lime' : 'orange' }); if (!q.ok) ui.text(10, 171, q.why, { color: 'orange' });
    const x = ui.W - 150; if (ui.button('race', x, 150, 140, 24, st.round ? `ROUND ${st.round + 1}` : 'ENTER', { disabled: !q.ok })) ui.push(RoundCard(id));
    if (ui.button('garage', x, 178, 140, 18, 'CHANGE CAR')) ui.push(app.screens.Garage());
    if (st.round && ui.button('reset', x, 200, 140, 18, 'START OVER')) resetEvent(p, id);
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
export const RoundCard = (id) => scr('roundcard', { set: 'hall', music: 'map',
  draw(ui) { const app = ui.app, p = app.profile, e = EVENT[id], st = eventState(p, id), rd = e.rounds[st.round]; ui.title(`ROUND ${st.round + 1} OF ${e.rounds.length}`); statusStrip(app, ui);
    ui.panel(ui.cx - 150, 34, 300, 118); drawMini(ui, rd.track, ui.cx - 140, 44, 90, 'sand');
    const x = ui.cx - 40; ui.text(x, 44, TRACKS[rd.track].name, { color: 'white' }); ui.text(x, 58, `${rd.laps} LAPS, ${Math.round(getTrack(rd.track).tr.length)} M`, { color: 'mist' }); ui.text(x, 72, rd.rain ? 'RAIN' : (rd.hour ?? TRACKS[rd.track].hour) >= 18 ? ((rd.hour ?? 0) >= 20 ? 'NIGHT' : 'DUSK') : 'FAIR', { color: 'mist' }); ui.text(x, 86, e.rally ? 'ONE RIVAL. CLOCK DECIDES' : `FIELD OF ${(e.field ?? 7) + 1}. ROLLING START`, { color: 'mist' }); const pts = st.points.player ?? 0; ui.text(x, 100, `POINTS SO FAR: ${pts}`, { color: 'sand' }); ui.para(x, 114, TIPS[(p.day + st.round) % TIPS.length], 30, { color: 'lime' });
    if (ui.button('go', ui.cx - 70, 162, 140, 26, 'GO TO THE GRID', { scale: 1 })) app.startRace(careerRoundSetup(p, id));
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'RACE'], ['back', 'BACK']]); } });
