// The Event Hall: events by licence tier, a card for each event, a card for each round, then the green light.
import { EVENT_IDS, EVENTS, TIERS } from '../../data/events.js';
import { LICENCES } from '../../data/licences.js';
import { TRACKS } from '../../data/tracks.js';
import { TIPS } from '../../data/text.js';
import { CAR_INFO } from '../../data/cars.js';
import { carEntry, eligible, eventOpen, eventState, standingsOf } from '../../sim/career.js';
import { cr, miniMap, statusStrip } from './common.js';
const stageIt = (app) => { app.scene?.stage?.('events', { orbit: false, angle: -0.25, radius: 13, height: 4, lookY: 2, lookX: -2, lookZ: -3, sun: 0.7, person: 'dell', personClip: 'IdleLook', personAt: [-5.4, 0, -2.8], personYaw: 0.6 }); app.mix.music('lounge'); };
export class EventListScreen {
  constructor(app) { this.id = 'eventList'; this.app = app; this.tab = app.profile.licences.A ? 2 : app.profile.licences.B ? 1 : 0; }
  enter() { stageIt(this.app); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, p = app.profile; statusStrip(ui, app); ui.text(10, 20, 'EVENT HALL', { scale: 2, color: 'sand' });
    const w = Math.min(ui.w - 20, 270), x = ui.w - w - 10;
    ui.tabs('tier', x, 20, w, TIERS.map((t) => LICENCES[t].name), this.tab, (i) => { this.tab = i; this.focus = null; ui.box.ready = false; });
    const tier = TIERS[this.tab], list = EVENT_IDS.filter((id) => EVENTS[id].needs[0] === tier);
    list.forEach((id, k) => {
      const e = EVENTS[id], st = p.events[id], open = eventOpen(p, id), y = 38 + k * 44, h = 39, f = ui.item(id, x, y, w, h, open.ok ? { confirm: () => ui.push(new EventCardScreen(app, id)) } : { denied: () => ui.note(open.why) });
      ui.rect(x, y, w, h, open.ok ? (f ? 'navy' : 'night') : 'ink');
      ui.text(x + 7, y + 6, e.name, { color: open.ok ? 'white' : 'slate' });
      ui.text(x + 7, y + 17, open.ok ? e.restriction : open.why, { color: open.ok ? 'mist' : 'red' });
      ui.text(x + 7, y + 28, st?.won ? 'WON' : st?.round ? `ROUND ${st.round + 1}/${e.rounds.length}` : `${e.rounds.length} ROUND${e.rounds.length > 1 ? 'S' : ''}`, { color: st?.won ? 'lime' : st?.round ? 'sand' : 'mist' });
      ui.text(x + w - 7, y + 28, e.prizeCar ? CAR_INFO[e.prizeCar].short : cr(e.bonus), { align: 'right', color: 'sand' });
    });
    ui.prompts([['confirm', 'CHOOSE'], ['tabs', 'TIER'], ['back', 'MAP']]);
  }
}
export class EventCardScreen {
  constructor(app, id) { this.id = 'eventCard'; this.app = app; this.eventId = id; this.event = EVENTS[id]; }
  enter() { stageIt(this.app); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, e = this.event, p = app.profile, st = eventState(p, this.eventId), car = carEntry(p), ok = car ? eligible(e, car.carId, car.install) : { ok: false, why: 'YOU HAVE NO CAR' }, w = Math.min(ui.w - 20, 340), x = Math.round(ui.cx - w / 2);
    statusStrip(ui, app); ui.panel(x, 19, w, 204, { color: 'ink', border: 'slate' });
    ui.text(x + 8, 24, e.name, { color: 'sand' }); ui.lines(x + 8, 35, e.intro, { chars: Math.floor((w - 16) / 6), gap: 9, color: 'mist' });
    ui.text(x + 8, 57, `RESTRICTION: ${e.restriction}`);
    ui.text(x + 8, 67, `1ST PRIZE ${cr(e.prize)}`, { color: 'mist' }); ui.text(x + w - 8, 67, e.prizeCar ? `SERIES: ${CAR_INFO[e.prizeCar].short}` : `SERIES: ${cr(e.bonus)}`, { align: 'right', color: 'sand' });
    // Rounds with mini-maps.
    const n = e.rounds.length, cw = Math.floor((w - 16) / n);
    e.rounds.forEach((r, k) => { const cx = x + 8 + k * cw, next = k === st.round; ui.rect(cx, 80, cw - 3, 56, next ? 'navy' : 'night'); miniMap(ui, cx + 3, 83, r.track, 30, next ? 'sand' : 'mist'); ui.text(cx + 3, 118, `${TRACKS[r.track].name.split(' ')[0].toUpperCase().slice(0, Math.floor((cw - 8) / 6))}`, { color: 'white' }); ui.text(cx + 3, 127, `${r.laps} LAPS${r.rain ? ' RAIN' : r.hourEnd ? ' NIGHT' : ''}`, { color: 'mist' }); });
    const stand = standingsOf(p, this.eventId); if (stand.length) { const pos = stand.findIndex(([n2]) => n2 === 'YOU') + 1; ui.text(x + 8, 140, `STANDINGS: YOU ARE ${pos} OF ${stand.length} WITH ${stand[pos - 1]?.[1] ?? 0} POINTS.`, { color: 'sand' }); }
    ui.text(x + 8, 152, `YOUR CAR: ${car ? CAR_INFO[car.carId].short : 'NONE'}`); if (!ok.ok) ui.text(x + 8, 162, `IT DOES NOT QUALIFY: ${ok.why}`, { color: 'red' }); else if (e.rally && car && car.install.tyre !== 'rally') ui.text(x + 8, 162, 'DIRT TYRES ARE ADVISED. TUNING STREET HAS THEM.', { color: 'orange' }); else ui.text(x + 8, 162, 'IT QUALIFIES.', { color: 'lime' });
    const by = 186, bw = Math.floor((w - 22) / 3);
    ui.button('start', x + 6, by, bw, 18, st.round ? `ROUND ${st.round + 1}` : 'ENTER', { confirm: () => ui.push(new RoundCardScreen(app, this.eventId)), denied: ok.ok ? null : () => ui.note(`THE CAR DOES NOT QUALIFY. ${ok.why}`) });
    ui.button('garage', x + 11 + bw, by, bw, 18, 'CHANGE CAR', { confirm: () => app.openGarageFromEvent(ui) });
    ui.button('tune', x + 16 + bw * 2, by, bw, 18, 'TUNING STREET', { confirm: () => app.openTuningFromEvent(ui) });
    ui.prompts([['confirm', 'CHOOSE'], ['back', 'BACK']]);
  }
}
export class RoundCardScreen {
  constructor(app, id) { this.id = 'roundCard'; this.app = app; this.eventId = id; this.event = EVENTS[id]; }
  enter() { stageIt(this.app); }
  resume() { stageIt(this.app); }
  draw(ui) {
    const app = this.app, e = this.event, st = eventState(app.profile, this.eventId), r = e.rounds[st.round], def = TRACKS[r.track], w = Math.min(ui.w - 20, 300), x = Math.round(ui.cx - w / 2), hour = r.hour ?? def.hour;
    ui.panel(x, 30, w, 160, { color: 'ink', border: 'sand' });
    ui.text(ui.cx, 36, `ROUND ${st.round + 1} OF ${e.rounds.length}`, { align: 'center', color: 'mist' });
    ui.text(ui.cx, 47, def.name.toUpperCase(), { align: 'center', scale: 2, color: 'sand' });
    const m = miniMap(ui, x + 12, 72, r.track, 72, 'white');
    ui.text(x + 100, 74, `${r.laps} LAPS`); ui.text(x + 100, 85, `${(m.length / 1000).toFixed(2)} KM`, { color: 'mist' }); ui.text(x + 100, 96, `${m.corners} CORNERS`, { color: 'mist' }); ui.text(x + 100, 107, `${String(Math.floor(hour)).padStart(2, '0')}:${hour % 1 ? '30' : '00'}${r.rain ? ', RAIN' : ''}`, { color: r.rain ? 'sky' : 'mist' }); ui.text(x + 100, 118, e.rally ? 'ONE RIVAL. THE CLOCK DECIDES.' : `FIELD OF ${e.field}. ROLLING START.`, { color: 'mist' });
    if (e.endurance) ui.text(x + w - 8, 129, 'ONE STOP. KEEP RIGHT TO PIT.', { align: 'right', color: 'sand' });
    ui.lines(x + 8, 144, TIPS[(st.round + (app.profile.day ?? 1)) % TIPS.length], { chars: Math.floor((w - 16) / 6), gap: 9, color: 'slate' });
    ui.button('go', ui.cx - 60, 166, 120, 18, 'TO THE START', { confirm: () => app.startEventRound(this.eventId) });
    ui.prompts([['confirm', 'RACE'], ['back', 'BACK']]);
  }
}
