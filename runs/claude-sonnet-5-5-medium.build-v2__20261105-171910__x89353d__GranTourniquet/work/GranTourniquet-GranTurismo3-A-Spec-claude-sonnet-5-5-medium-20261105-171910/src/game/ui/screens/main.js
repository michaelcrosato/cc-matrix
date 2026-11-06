// Title, Map, Licence Centre, Event Hall. Plan section 7 (Screens).
import { THREE } from '../../../pixel-engine.js';
import { SCREENS } from '../nav.js';
import { App, S, saveProfile, resetProfile, money, fmtTime, applySettings } from '../../app.js';
import { TITLE, TAGLINE, SOURCE } from '../../data/meta.js';
import { BUILDINGS } from '../../render/stages.js';
import { CAR_INFO } from '../../data/cars.js';
import { LICENCES, TESTS, testsOf, testById } from '../../data/licences.js';
import { EVENTS, eventById } from '../../data/events.js';
import { MEDALS } from '../../data/medals.js';
import { TRACKS } from '../../data/tracks.js';
import { currentCar, hasLicence, licenceUnlocked, nudge, medalRank, eventLocked, eventState, qualifies, startEvent, totalCollected } from '../../sim/career.js';
import { displayStats } from '../../sim/tuning.js';
import { goRace, goMenu, testSetup, eventRoundSetup } from '../../scenes/flow.js';
import { buildTrack } from '../../sim/sim.js';
const MC = { gold: 'sand', silver: 'mist', bronze: 'orange' };
export function medalDot(ui, x, y, m) { ui.hud.rect(x, y, 7, 7, 'ink'); ui.hud.rect(x + 1, y + 1, 5, 5, m ? MC[m] : 'night'); }
const MINI = {};
export function drawTrackMini(ui, id, x, y, s, color = 'sky') { if (!MINI[id]) { const tr = buildTrack(TRACKS[id], 12); let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < tr.N; i++) { a = Math.min(a, tr.x[i]); b = Math.max(b, tr.x[i]); c = Math.min(c, tr.z[i]); d = Math.max(d, tr.z[i]); } MINI[id] = { tr, a, b, c, d, len: tr.length, corners: TRACKS[id].corners.length }; } const m = MINI[id], k = (s - 4) / Math.max(m.b - m.a, m.d - m.c), w = (m.b - m.a) * k, h = (m.d - m.c) * k, ox = x + (s - w) / 2, oy = y + (s - h) / 2; for (let i = 0; i < m.tr.N; i++) ui.hud.rect(Math.round(ox + (m.tr.x[i] - m.a) * k), Math.round(oy + h - (m.tr.z[i] - m.c) * k), 2, 2, color); return m; }
export function statusStrip(ui) { const p = App.profile, car = currentCar(p), lic = hasLicence(p, 'A') ? 'A' : hasLicence(p, 'B') ? 'B' : hasLicence(p, 'C') ? 'C' : 'NONE'; ui.hud.rect(0, 0, ui.W, 14, 'ink'); ui.text(6, 3, money(p.credits), { color: 'sand' }); ui.text(100, 3, 'DAY ' + p.day, { color: 'white' }); ui.text(150, 3, 'LICENCE ' + lic, { color: 'sky' }); if (car) ui.text(ui.W - 6 - ui.width(CAR_INFO[car.carId].short), 3, CAR_INFO[car.carId].short, { color: 'lime' }); }
// ---------------- TITLE ----------------
SCREENS.title = (nav, t, ctx, ui, sc) => {
  sc.camTitle(); sc.camMapMode(); sc.hidePeople(); App.music?.play('title'); const p = App.profile, W = ui.W, H = ui.H, st = t.s; st.t = (st.t ?? 0) + ui.dt;
  const bob = Math.sin(st.t * 1.5) * 2; ui.center(36 + bob, TITLE, { scale: 3, color: 'sand', shadow: 'plum' }); ui.center(66, TAGLINE, { color: 'white' }); ui.center(78, 'INSPIRED BY ' + SOURCE, { color: 'mist' });
  const touchGate = App.touchOnly && !App.actions.anyPress && App.actions.last !== 'key' && App.actions.last !== 'pad';
  if (touchGate) { ui.panel(W / 2 - 150, 100, 300, 34, 'ink', 'red'); ui.center(110, 'CONTROLLER OR KEYBOARD REQUIRED', { scale: 1, color: 'white' }); const r = ui.button('gear', W - 34, 4, 28, 20, '*', { scale: 2 }); if (r.pressed) nav.push('settings'); ui.item('x', 0, 0, 1, 1); return; }
  let y = 112; const x = W / 2 - 70, w = 140; if (App.actions.anyPress || st.t > 1.2 || true) {
    if (p.started) { if (ui.button('cont', x, y, w, 20, 'CONTINUE').pressed) { App.mix?.sfx?.('confirm'); nav.replace('map'); } y += 24; }
    if (ui.button('new', x, y, w, 20, p.started ? (st.erase ? 'PRESS AGAIN TO ERASE' : 'NEW GAME') : 'START', { subColor: 'red' }).pressed) { if (p.started && !st.erase) { st.erase = true; App.mix?.sfx?.('denied'); } else { if (p.started) resetProfile(); App.mix?.sfx?.('confirm'); nav.replace('greeting'); } } y += 24;
    if (ui.button('set', x, y, w, 20, 'SETTINGS').pressed) nav.push('settings'); y += 24; if (ui.button('abt', x, y, w, 20, 'ABOUT').pressed) nav.push('about');
  }
  if (!App.actions.unlockedAudio && !ctx.engine.audio.unlocked) { ui.hud.rect(8, H - 36, 8, 8, 'red'); ui.text(20, H - 35, 'PRESS A KEY OR CLICK FOR SOUND', { color: 'orange' }); }
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT']]); if (ui.A.back) st.erase = false;
};
SCREENS.greeting = (nav, t, ctx, ui, sc) => {
  sc.camTitle(); sc.hidePeople(); const st = t.s; if (!st.said) { st.said = true; sc.person('arai', 0, 0, 0, false); sc.say('Welcome to the Peninsula. A licence is not difficult to obtain. It is only difficult to deserve.', 'arai'); }
  ui.panel(ui.W / 2 - 150, 70, 300, 80, 'ink', 'slate'); ui.text(ui.W / 2 - 140, 78, 'MS. ARAI, CHIEF EXAMINER', { color: 'sand' }); ui.prose(ui.W / 2 - 140, 94, 'You have 15,000 credits and no licence. Dealer Row has three used cars you can afford. Choose one. Then visit the Licence Centre.', { n: 50, max: 4 });
  ui.item('go', ui.W / 2 - 40, 160, 80, 16); ui.button('go', ui.W / 2 - 40, 160, 80, 16, 'BEGIN'); if (ui.press) { nav.replace('map'); App.mix?.sfx?.('confirm'); } ui.prompts([['confirm', 'BEGIN']]);
};
// ---------------- MAP ----------------
SCREENS.map = (nav, t, ctx, ui, sc) => {
  const p = App.profile, st = t.s, cam = ctx.camera.camera; sc.hidePeople(); sc.camMapMode(); App.music?.play('map'); sc.syncProfileOnce?.();
  if (!st.synced) { st.synced = true; sc.syncProfile(); }
  const focusId = BUILDINGS.some((b) => b.id === ui.focus) ? ui.focus : null; sc.camMap(focusId); statusStrip(ui);
  const v = new THREE.Vector3(); for (const b of BUILDINGS) { const g = sc.island.B[b.id]; v.set(b.x, 1.1 + 4, b.z).project(cam); const sx = (v.x + 1) / 2 * ui.W, sy = (1 - v.y) / 2 * ui.H; const r = ui.item(b.id, Math.round(sx - 14), Math.round(sy - 12), 28, 24); ui.hud.rect(Math.round(sx) - 2, Math.round(sy) - 2, 5, 5, r.focus ? 'sand' : 'white'); if (r.pressed) { App.mix?.sfx?.('confirm'); nav.push(b.id === 'arcade' ? 'arcade' : b.id === 'events' ? 'events' : b.id); } }
  const fb = BUILDINGS.find((b) => b.id === ui.focus); ui.panel(ui.W / 2 - 160, ui.H - 62, 320, 36, 'ink', 'slate'); if (fb) { ui.text(ui.W / 2 - 152, ui.H - 57, fb.name, { color: 'sand', scale: 1 }); ui.text(ui.W / 2 - 152, ui.H - 46, fb.blurb, { color: 'white' }); } ui.text(ui.W / 2 - 152, ui.H - 35, nudge(p), { color: 'cyan' });
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'ENTER'], ['info', 'HANDBOOK'], ['pause', 'MENU']]); if (ui.A.info) nav.push('handbook'); if (ui.A.pause) nav.push('mapmenu'); if (ui.A.back) nav.push('mapmenu');
};
SCREENS.mapmenu = (nav, t, ctx, ui, sc) => {
  ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); ui.title('MENU'); let y = 34; const x = ui.W / 2 - 80;
  for (const [id, label, fn, hide] of [['res', 'RESUME', () => nav.pop()], ['set', 'SETTINGS', () => nav.push('settings')], ['hb', 'HANDBOOK', () => nav.push('handbook')], ['ab', 'ABOUT', () => nav.push('about')], ['dev', 'DEV MODE', () => nav.push('dev'), App.hubActive], ['ti', 'TITLE', () => { while (nav.depth > 1) nav.pop(); nav.replace('title'); }]]) { if (hide) continue; if (ui.button(id, x, y, 160, 20, label).pressed) fn(); y += 24; }
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT'], ['back', 'BACK']]); if (ui.A.back || ui.A.pause) nav.pop();
};
// ---------------- LICENCE CENTRE ----------------
function backBar(nav, ui, extra = []) { ui.prompts([...extra, ['back', 'BACK']]); if (ui.A.back) { nav.pop(); App.mix?.sfx?.('back'); } }
SCREENS.licence = (nav, t, ctx, ui, sc) => {
  const p = App.profile, st = t.s; sc.camBuilding('licence'); sc.camMapMode(); App.music?.play('licence'); if (!st.init) { st.init = true; if (t.args.test) { const tt = testById(t.args.test); nav.push('licenceTests', { lic: tt.lic }); nav.push('testCard', { id: tt.id, after: t.args.after }); return; } sc.say('Welcome. Every driver begins with a clipboard.', 'arai'); }
  ui.title('LICENCE CENTRE', 'MS. ARAI'); ['C', 'B', 'A'].forEach((l, i) => { const L = LICENCES[l], open = licenceUnlocked(p, l), have = hasLicence(p, l), x = 30 + i * 140, y = 44; const r = ui.item('l' + l, x, y, 130, 112); ui.panel(x, y, 130, 112, r.focus ? 'blue' : open ? 'navy' : 'night', r.focus ? 'sky' : 'slate'); ui.text(x + 8, y + 8, 'LICENCE ' + l, { scale: 2, color: open ? 'sand' : 'slate' }); ui.text(x + 8, y + 28, L.name, { color: open ? 'white' : 'slate' }); testsOf(l).forEach((q, k) => medalDot(ui, x + 8 + k * 14, y + 44, p.licences[q.id]?.medal)); if (!open) ui.prose(x + 8, y + 60, 'REQUIRES LICENCE ' + L.needs + '.', { n: 20, color: 'red' }); else { ui.prose(x + 8, y + 60, L.about, { n: 20, max: 4, color: 'mist' }); } if (have) ui.text(x + 8, y + 100, 'YOURS', { color: 'lime' }); if (r.pressed) { if (open) { nav.push('licenceTests', { lic: l }); App.mix?.sfx?.('confirm'); } else App.mix?.sfx?.('denied'); } });
  if (!currentCar(p)) { ui.panel(ui.W / 2 - 150, 166, 300, 16, 'ink', 'slate'); ui.center(170, 'YOU NEED A CAR FIRST. DEALER ROW HAS THREE.', { color: 'orange' }); }
  backBar(nav, ui, [['confirm', 'OPEN']]);
};
SCREENS.licenceTests = (nav, t, ctx, ui, sc) => {
  const p = App.profile, lic = t.args.lic, tests = testsOf(lic); ui.title('LICENCE ' + lic + '  ' + LICENCES[lic].name, 'FOUR LESSONS'); sc.camBuilding('licence');
  tests.forEach((q, i) => { const x = 30 + (i % 2) * 210, y = 44 + Math.floor(i / 2) * 62, rec = p.licences[q.id]; const r = ui.item(q.id, x, y, 200, 54); ui.panel(x, y, 200, 54, r.focus ? 'blue' : 'navy', r.focus ? 'sky' : 'slate'); ui.text(x + 6, y + 6, q.id, { color: 'sand', scale: 2 }); ui.text(x + 50, y + 6, q.title, { color: 'white' }); ui.text(x + 50, y + 18, CAR_INFO[q.carId].short + ' / ' + TRACKS[q.track].name, { color: 'mist' }); ui.text(x + 6, y + 36, rec?.best ? 'BEST ' + fmtTime(rec.best) : 'NOT YET DRIVEN', { color: 'sky' }); medalDot(ui, x + 180, y + 42, rec?.medal); if (r.pressed) { nav.push('testCard', { id: q.id }); App.mix?.sfx?.('confirm'); } });
  ui.panel(24, 168, ui.W - 48, 16, 'ink', 'slate'); ui.text(30, 172, hasLicence(p, lic) ? 'LICENCE ' + lic + ' IS YOURS.' : 'BRONZE IN ALL FOUR WINS THE LICENCE. ALL GOLD EARNS A PRIZE.', { color: 'mist' }); backBar(nav, ui, [['confirm', 'OPEN']]);
};
SCREENS.testCard = (nav, t, ctx, ui, sc) => {
  const q = testById(t.args.id), p = App.profile, m = MEDALS[q.id], st = t.s; sc.camShow({ r: 8, h: 2.6 }); sc.showroom.set('licence'); sc.hidePeople(); sc.person('arai', sc.showroom.ox - 5, 1.5, 1.4, true, 'ExaminerClipboard');
  if (st.car !== q.carId) { st.car = q.carId; sc.showroom.show(q.carId, { parts: [], tyre: q.tyre ?? null, settings: {} }); sc.say(q.brief, 'arai'); }
  ui.hud.rect(0, 0, 200, ui.H, 'ink'); ui.text(10, 8, q.id, { scale: 3, color: 'sand' }); ui.text(10, 34, q.title, { color: 'white' }); ui.text(10, 46, CAR_INFO[q.carId].name, { color: 'sky' }); ui.text(10, 56, TRACKS[q.track].name + (q.cars ? ' / THREE CARS' : ''), { color: 'mist' }); ui.prose(10, 72, q.brief, { n: 31, max: 8, color: 'white' });
  ui.text(10, 150, 'GOLD   ' + fmtTime(m.gold), { color: 'sand' }); ui.text(10, 160, 'SILVER ' + fmtTime(m.silver), { color: 'mist' }); ui.text(10, 170, 'BRONZE ' + fmtTime(m.bronze), { color: 'orange' });
  if (t.args.after) { const a = t.args.after; ui.text(10, 182, a.passed ? 'LAST: ' + fmtTime(a.time) + (a.medal ? ' ' + a.medal.toUpperCase() : '') : 'LAST: FAILED', { color: a.passed ? 'lime' : 'red' }); }
  let y = ui.H - 66; if (ui.button('go', 10, y, 120, 18, 'BEGIN TEST', { disabled: !currentCar(p) && !q.carId }).pressed) { goRace(testSetup(q.id)); } y += 22; if (ui.button('bk', 10, y, 120, 18, 'BACK').pressed) nav.pop();
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT'], ['back', 'BACK']]); if (ui.A.back) nav.pop();
};
// ---------------- EVENT HALL ----------------
SCREENS.events = (nav, t, ctx, ui, sc) => {
  const p = App.profile, st = t.s; sc.camBuilding('events'); sc.camMapMode(); sc.hidePeople(); App.music?.play('map');
  if (!st.init) { st.init = true; st.tab = 0; if (t.args.id) { const ev = eventById(t.args.id); st.tab = ['C', 'B', 'A'].indexOf(ev.needs); nav.push('eventCard', { id: ev.id, after: t.args.after }); } }
  if (ui.A.tabL) st.tab = (st.tab + 2) % 3; if (ui.A.tabR) st.tab = (st.tab + 1) % 3; const tier = ['C', 'B', 'A'][st.tab]; ui.title('EVENT HALL', 'THE ROAD TO THE GRAND PRIX'); ui.tabs(['LICENCE C', 'LICENCE B', 'LICENCE A'], st.tab);
  EVENTS.filter((e) => e.needs === tier).forEach((e, i) => { const y = 54 + i * 44, lock = eventLocked(p, e), s = eventState(p, e.id), won = p.wonEvents.includes(e.id); const r = ui.item(e.id, 16, y, ui.W - 32, 38); ui.panel(16, y, ui.W - 32, 38, r.focus ? 'blue' : lock ? 'night' : 'navy', r.focus ? 'sky' : 'slate'); ui.text(24, y + 6, e.name, { color: lock ? 'slate' : 'sand', scale: 1 }); ui.text(24, y + 18, lock ?? `${e.rounds.length} ROUND${e.rounds.length > 1 ? 'S' : ''}. ` + restrictText(e.restrict) + (won ? '  WON' : s.round ? `  ROUND ${s.round}/${e.rounds.length}` : ''), { color: lock ? 'red' : 'mist' }); ui.text(ui.W - 24 - ui.width(money(e.prize)), y + 6, money(e.prize), { color: 'lime' }); if (r.pressed) { if (lock) App.mix?.sfx?.('denied'); else { App.mix?.sfx?.('confirm'); nav.push('eventCard', { id: e.id }); } } });
  backBar(nav, ui, [['tabs', 'LICENCE'], ['confirm', 'OPEN']]);
};
export function restrictText(r) { const a = []; if (r.maxPS) a.push('UP TO ' + r.maxPS + ' PS'); if (r.maxKg) a.push('UP TO ' + r.maxKg + ' KG'); if (r.layouts) a.push(r.layouts.join(' / ') + ' ONLY'); return a.length ? a.join(', ') : 'ANY CAR'; }
SCREENS.eventCard = (nav, t, ctx, ui, sc) => {
  const ev = eventById(t.args.id), p = App.profile, car = currentCar(p), st = eventState(p, ev.id), q = car ? qualifies(car.carId, car.install, ev.restrict) : { ok: false, why: 'YOU HAVE NO CAR.' }, s = t.s; sc.camBuilding('events');
  ui.title(ev.name, 'ROUND ' + Math.min(st.round + 1, ev.rounds.length) + '/' + ev.rounds.length); ui.prose(16, 32, ev.intro, { n: 66, max: 2, color: 'white' }); const finished = st.complete;
  ev.rounds.forEach((r, i) => { const x = 16 + i * 112, y = 56; ui.panel(x, y, 106, 74, i === st.round ? 'blue' : 'navy', i < st.round ? 'lime' : 'slate'); drawTrackMini(ui, r.track, x + 2, y + 2, 44); ui.text(x + 48, y + 6, TRACKS[r.track].name.split(' ')[0], { color: 'white' }); ui.text(x + 48, y + 16, (r.rally ? 'LEG ' + r.leg : r.laps + ' LAPS'), { color: 'mist' }); ui.text(x + 48, y + 26, r.rain ? 'RAIN' : r.hour >= 19 ? 'NIGHT' : r.hour >= 17 ? 'DUSK' : 'DAY', { color: 'sky' }); if (i < st.round) ui.text(x + 6, y + 54, 'P' + st.results[i] + '  OK', { color: 'lime' }); }); if (ev.rounds.length > 4) {}
  ui.text(16, 138, 'PRIZE ' + money(ev.prize) + '  BONUS ' + (ev.bonus ? money(ev.bonus) : '-') + (ev.prizeCar ? ' + ' + CAR_INFO[ev.prizeCar].short : ''), { color: 'lime' }); ui.text(16, 150, 'POINTS ' + st.points, { color: 'sand' }); ui.text(16, 162, car ? (q.ok ? 'YOUR ' + CAR_INFO[car.carId].short + ' QUALIFIES.' : 'YOUR CAR DOES NOT QUALIFY: ' + q.why) : 'NO CAR', { color: q.ok ? 'mist' : 'orange' });
  if (t.args.after) ui.text(220, 150, 'ROUND ' + st.round + ': P' + st.results[st.results.length - 1], { color: 'cyan' });
  let bx = 16; const by = ui.H - 46; const bt = (id, label, fn, w, dis) => { const r = ui.button(id, bx, by, w, 18, label, { disabled: dis }); bx += w + 6; if (r.pressed) { if (dis) App.mix?.sfx?.('denied'); else fn(); } };
  const done = st.round >= ev.rounds.length; bt('go', done ? 'RESTART SERIES' : st.round ? 'NEXT ROUND' : 'START', () => { if (done) startEvent(p, ev.id); const ns = eventState(p, ev.id); goRace(eventRoundSetup(p, ev, ns.round)); }, 110, !q.ok); bt('car', 'CHANGE CAR', () => nav.push('garage', { pick: true }), 90); bt('bk', 'BACK', () => nav.pop(), 60);
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT'], ['back', 'BACK']]); if (ui.A.back) nav.pop();
};
