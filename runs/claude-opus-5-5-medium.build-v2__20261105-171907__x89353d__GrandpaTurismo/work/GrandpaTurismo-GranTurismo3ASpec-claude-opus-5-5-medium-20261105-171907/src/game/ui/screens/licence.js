// Licence Centre: three licence cards, then four test tiles, then the test card with the examiner's brief.
import { LICENCES, LICENCE, TEST } from '../../data/licences.js';
import { licenceOpen, medalName } from '../../sim/career.js';
import { CARS } from '../../data/cars.js';
import { licenceSetup } from '../../sim/setups.js';
import { scr, stdBack, statusStrip } from './common.js';
import { fmtTime } from '../ui.js';
import { SPEAKERS } from '../../audio/voice.js';
const MEDAL_C = [null, 'orange', 'mist', 'sand'];
export function medalIcon(ui, x, y, m, sc = 1) { const c = MEDAL_C[m] ?? 'night'; ui.hud.sprite(x, y, ['..###..', '.#ooo#.', '#ooooo#', '#ooooo#', '#ooooo#', '.#ooo#.', '..###..'], { '#': m ? 'white' : 'slate', o: c }, { scale: sc }); }
export const LicenceCentre = () => scr('licence', { set: 'licence', music: 'licence', onEnter(app) { if (!app.profile.metArai) { app.profile.metArai = true; app.ui.say('Good day. Please choose a licence. The clipboard is ready.', SPEAKERS.arai); } },
  draw(ui) { const app = ui.app, p = app.profile; ui.title('LICENCE CENTRE'); statusStrip(app, ui);
    LICENCES.forEach((l, i) => { const open = licenceOpen(p, l.id), got = l.tests.filter((t) => p.tests[t]?.medal >= 1).length, x = 12, y = 34 + i * 54, w = 212, h = 48;
      if (ui.button(`lic${l.id}`, x, y, w, h, `LICENCE ${l.id}: ${l.name}`, { left: true, sub: open ? `${got}/4 PASSED. ${p.licences[l.id] ? 'HELD.' : `REWARD ${l.reward.toLocaleString('en-US')} CR.`}` : 'NOT YET OPEN', disabled: !open })) ui.push(TestList(l.id));
      if (open) { l.tests.forEach((t, k) => medalIcon(ui, x + 6 + k * 11, y + h - 12, p.tests[t]?.medal ?? 0)); } });
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['info', 'HANDBOOK', () => ui.push(app.screens.Handbook())], ['back', 'BACK']]); if (app.actions.pressed('info')) ui.push(app.screens.Handbook()); } });
export const TestList = (licId) => scr('tests', { set: 'licence', music: 'licence',
  draw(ui) { const app = ui.app, p = app.profile, l = LICENCE[licId]; ui.title(`LICENCE ${l.id}: ${l.name}`); statusStrip(app, ui);
    l.tests.forEach((id, i) => { const t = TEST[id], r = p.tests[id], y = 32 + i * 40; if (ui.button(id, 12, y, 230, 35, `${id}  ${t.title}`, { left: true, sub: r ? `BEST ${fmtTime(r.time)}  ${medalName(r.medal)}` : t.lesson })) ui.push(TestCard(id)); medalIcon(ui, 230, y + 6, r?.medal ?? 0); });
    ui.para(12, 196, `ALL GOLD: ${l.goldLine}`, 44, { color: 'sand' });
    if (stdBack(app, ui)) return; ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
export const TestCard = (id) => scr('testcard', { set: 'licence', music: 'licence', setArgs: () => ({ car: TEST[id].runs ? TEST[id].runs[0] : TEST[id].carId, tyre: id[0] === 'C' ? 'street' : null }), onEnter(app) { app.ui.say(TEST[id].brief, SPEAKERS.arai, { time: 7 }); },
  draw(ui) { const app = ui.app, p = app.profile, t = TEST[id], m = t.medals; ui.title(`${t.id}  ${t.title}`); statusStrip(app, ui); const x = ui.W - 190, w = 180; ui.panel(x, 30, w, 96);
    ui.text(x + 6, 36, t.runs ? 'THREE CARS' : CARS[t.carId].shortName, { color: 'white' }); ui.text(x + 6, 48, app.tracksName(t.track), { color: 'mist' }); ui.text(x + 6, 62, `GOLD   ${fmtTime(m.gold)}`, { color: 'sand' }); ui.text(x + 6, 72, `SILVER ${fmtTime(m.silver)}`, { color: 'mist' }); ui.text(x + 6, 82, `BRONZE ${fmtTime(m.bronze)}`, { color: 'orange' }); const r = p.tests[id]; ui.text(x + 6, 94, r ? `BEST   ${fmtTime(r.time)}` : 'NO ATTEMPT YET', { color: 'white' }); const asst = t.assists?.abs === false ? 'ABS IS OFF.' : t.assists?.tcs === 0 ? 'TRACTION IS OFF.' : ''; ui.text(x + 6, 108, asst || t.lesson.slice(0, 28), { color: asst ? 'orange' : 'lime' });
    const ax = x, by = 132; if (ui.button('start', ax, by, w, 22, 'START')) app.startRace(licenceSetup(id, 0)); if (ui.button('demo', ax, by + 26, w, 20, 'DEMONSTRATION')) app.startRace(licenceSetup(id, t.runs ? 0 : 0, { demo: true }));
    if (stdBack(app, ui, () => { ui.subtitle = null; ui.pop(); })) return; ui.prompts([['confirm', 'SELECT'], ['back', 'BACK']]); } });
