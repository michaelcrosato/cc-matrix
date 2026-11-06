// The whole game by script: a bot presses real actions through real screens, drives through the input layer with aiDrive as its brain, and sees the ending. Dev tools off.
import { writeFileSync } from 'node:fs';
import { suite, Driver } from './lib.mjs';
import { Engine } from '../../src/pixel-engine.js';
import { App } from '../../src/game/app.js';
import { MenuScene } from '../../src/game/scenes/menu.js';
import { aiDrive } from '../../src/game/sim/sim.js';
import { profileFor } from '../../src/game/sim/race.js';
import { LICENCES, TEST } from '../../src/game/data/licences.js';
import { EVENT } from '../../src/game/data/events.js';
import { CARS, SHOWROOMS, showroomCars } from '../../src/game/data/cars.js';
import { carRec, carQualifies } from '../../src/game/sim/career.js';
const t = suite(), VERBOSE = process.env.VERBOSE === '1';
const log = (...a) => { if (VERBOSE) console.log(...a); };
const app = new App(); app.instant = true;
const e = await Engine.headless(new MenuScene(app, { screen: 'title' }), {}); e.manual = true; const d = new Driver(e, app); d.step(4);
const invert = (s) => { const dz = 0.08, a = Math.min(1, Math.abs(s)); return Math.sign(s) * (a < 0.001 ? 0 : Math.pow(a, 1 / 1.4) * (1 - dz) + dz); };
/** Turn the brain's output into a pad: the input layer does the rest. */
function sendPad(o) { const b = new Array(17).fill(0), a = [invert(o.steer), 0, 0, 0]; b[7] = Math.min(0.996, o.throttle); b[6] = Math.min(0.996, o.brake ?? 0); if (o.handbrake) b[2] = 1; if (o.triangle) b[3] = 1; e.input.send({ pads: [{ i: 0, b: b.map((v) => Math.round(v * 255) / 255), a: a.map((v) => Math.round(v * 255) / 255) }] }); }
const SKILL = Number(process.env.SKILL ?? 0.97);
function brain(sc) {
  const sim = sc.sim, c = sim.player; if (c.ai || sim.done) return { steer: 0, throttle: 0, brake: 0 };
  if (sim.run) { const o = sim.testBrain(SKILL); return { steer: o.steer, throttle: o.throttle, brake: o.brake, handbrake: false }; }
  const sp = profileFor(sc.rs.track, c.p, sc.rs.rain); let lane = 0;
  const P = sim.T.pit; if (sim.rules.endurance && P) { const mean = c.wear.reduce((x, y) => x + y, 0) / 4, L = sim.tr.length, toEntry = (P.inS - c.loc.s + L) % L; if ((mean < 0.33 || c.fuel < 0.16) && toEntry < 170) lane = 10; }
  const o = aiDrive(c, sim.tr, sim.line, sp, { skill: SKILL, lane, tcs: 0.5, asm: 0.5 }, sim.rules.contact ? sim.contactField : null);
  return { steer: o.steer, throttle: o.throttle, brake: o.brake };
}
async function driveUntilScreen(limitS = 3000) {
  const sc = app.scene; let n = 0, stuck = 0;
  while (!app.ui.top && n++ < limitS * 60) { const out = brain(sc), c = sc.sim.player; if (!c.ai && sc.sim.green && Math.hypot(c.vx, c.vz) < 1 && n > 300) stuck++; else stuck = Math.max(0, stuck - 1); if (stuck > 200) { out.triangle = true; if (stuck > 280) stuck = 0; } sendPad(out); d.step(1); if (app.loading) { await d.settle(); return 'loaded'; } }
  e.input.send({ pads: [] }); d.step(2); return n;
}
async function toMap() { for (let k = 0; k < 12 && d.top !== 'map'; k++) { await d.back(); d.step(2); } d.expect('map'); d.step(2); }
const money = () => app.profile.credits;
async function buy(id) {
  await toMap(); await d.choose('dealer'); d.step(3); d.expect('dealer');
  const room = SHOWROOMS.findIndex((r) => showroomCars(r.id, !!app.profile.licences.A).some((c) => c.id === id)), list = showroomCars(SHOWROOMS[room].id, !!app.profile.licences.A), k = list.findIndex((c) => c.id === id);
  for (let i = 0; i < room; i++) d.press('tabR'); d.step(2); for (let i = 0; i < k; i++) d.press('right'); d.step(2); await d.choose('buy'); await toMap();
  log(`bought ${id}, ${money()} CR left`);
}
async function choose(id) { const p = app.profile, r = p.cars.find((c) => c.id === id); if (!r) throw new Error(`no ${id}`); p.current === r.uid; await toMap(); await d.choose('home'); d.step(3); d.expect('garage'); for (let k = 0; k < p.cars.length && p.cars[app.ui.top.idx]?.id !== id; k++) d.press('right'); d.step(2); if (p.current !== r.uid) await d.choose('choose'); t.ok(p.current === r.uid, `chose ${id}`); await toMap(); }
async function fit(items) { const p = app.profile, r = carRec(p); await toMap(); await d.choose('tuning'); d.step(3); d.expect('tuning'); for (const [cat, part] of items) { if (cat === 'body') continue; const scr = app.ui.top; const page = ['engine', 'weight', 'drivetrain', 'suspension'].includes(cat) ? 0 : 1; if (scr.page !== page) { await d.choose('morepage'); d.step(2); } await d.choose(cat); d.step(3); const it = d.items(); if (it.includes(part) && !app.ui.items.find((i) => i.id === part).disabled) { await d.choose(part); d.step(3); if (d.top === 'dyno') { await d.choose('ok'); d.step(2); await d.choose('ok'); d.step(2); } } await d.back(); d.step(3); } await toMap(); void r; log(`fitted ${items.map((x) => x[1])}, ${money()} CR left`); }
async function licence(id) {
  const l = LICENCES.find((x) => x.id === id); await toMap(); await d.choose('licence'); d.step(3); await d.choose(`lic${id}`); d.step(3); d.expect('tests');
  for (const tid of l.tests) { for (let att = 0; att < 4; att++) { await d.choose(tid); d.step(3); d.expect('testcard'); await d.choose('start'); d.step(3); let r; do { r = await driveUntilScreen(400); } while (r === 'loaded'); d.step(3); d.expect('licenceresult'); const R = app.lastResult; log(`${tid}: ${R.failed ? R.reason : R.time.toFixed(2)} medal ${R.outcome.medal} (gold ${TEST[tid].medals.gold})`); await d.choose('back'); await d.settle(); d.step(3); d.expect('tests'); if (R.outcome.medal >= 1) break; if (att === 3) t.ok(false, `test ${tid} could not be passed`, R.reason ?? R.time); } }
  t.ok(app.profile.licences[id], `licence ${id} won`, JSON.stringify(app.profile.tests)); log(`LICENCE ${id}: ${money()} CR`); await toMap();
}
async function runEvent(id, tries = 3) {
  const ev = EVENT[id];
  for (let att = 0; att < tries; att++) {
    await toMap(); await d.choose('events'); d.step(3); d.expect('events'); const pageOf = Math.floor(Object.keys(EVENT).indexOf(id) / 5); for (let i = 0; i < pageOf; i++) d.press('tabR'); d.step(2); await d.choose(id); d.step(3); d.expect('eventcard');
    const r = carRec(app.profile), q = carQualifies(ev, r.id, r.install); if (!q.ok) { t.ok(false, `car does not qualify for ${id}`, q.why); return false; }
    for (let round = 0; round < ev.rounds.length; round++) {
      await d.choose(d.top === 'eventcard' ? 'race' : 'go'); d.step(3); if (d.top === 'roundcard') { await d.choose('go'); d.step(3); }
      t.ok(app.scene.name === 'race', `${id} round ${round} runs`, app.scene.name); await driveUntilScreen(); d.step(5); d.expect('results'); const R = app.lastResult, o = R.outcome; log(`${id} r${round + 1} ${ev.rounds[round].track}: P${o.place}/${R.rows.length} +${o.money} walls ${R.rows.find((x) => x.player)?.walls} pits ${app.scene.sim?.player.pits} t=${R.rows.find((x) => x.player).time.toFixed(0)} lead=${R.rows[0].time.toFixed(0)}`); await d.choose('continue'); await d.settle(); d.step(3);
      if (o.seriesOver) { if (o.seriesWon) { // podium, prize, maybe ending
          for (let k = 0; k < 4 && d.top !== 'map'; k++) { if (['podium', 'reveal'].includes(d.top)) { d.press('confirm'); d.step(4); } else if (d.top === 'ending') { d.step(60); t.ok(true, 'ending seen'); await d.choose('done'); await d.settle(); d.step(4); } else break; }
          log(`WON ${id}: ${money()} CR, day ${app.profile.day}`); await toMap(); return true; }
        log(`LOST ${id}, attempt ${att + 1}`); break; }
    }
  }
  t.ok(false, `event ${id} could not be won`, `credits ${money()}`); return false;
}
// the life of a driver
async function tyre(id) { await toMap(); await d.choose('tuning'); d.step(3); if (app.ui.top.page !== 1) await d.choose('morepage'); d.step(2); await d.choose('tyres'); d.step(3); if (!app.ui.items.find((i) => i.id === id).disabled) await d.choose(id); await toMap(); }
async function oil() { await toMap(); await d.choose('service'); d.step(3); if (!app.ui.items.find((i) => i.id === 'oil').disabled) await d.choose('oil'); d.step(3); if (carRec(app.profile).dirt > 0 && !app.ui.items.find((i) => i.id === 'wash').disabled) await d.choose('wash'); d.step(3); await toMap(); }
/** Run an already-won event again until there is money for the next step. */
async function earn(target, id) { for (let k = 0; k < 8 && money() < target; k++) await runEvent(id); t.ok(money() >= target, `earned ${target} from ${id}`, `${money()}`); }
d.expect('title'); await d.choose('new'); d.step(2); await d.choose('ok'); d.step(3);
d.press('right'); d.step(2); await d.choose('buy'); await toMap(); t.ok(app.profile.cars[0]?.id === 'kite', 'bought the Kite'); log(`Kite bought, ${money()}`);
await licence('C');
await fit([['brakes', 'pads']]);
await runEvent('dawn'); await oil(); await fit([['engine', 'exhaust'], ['suspension', 'susp1']]); await tyre('sport');
await runEvent('fellow');
await licence('B');
await fit([['weight', 'weight1'], ['engine', 'intake']]); await tyre('semi');
await runEvent('feather');
await earn(25000, 'feather');
await buy('ginga'); await fit([['engine', 'exhaust'], ['suspension', 'susp1'], ['brakes', 'pads'], ['weight', 'weight1']]); await tyre('semi');
await runEvent('society');
await earn(45000, 'society');
await buy('ryu'); await tyre('rally');
await runEvent('clay');
await licence('A');
log(`money before Touring: ${money()}`);
await earn(95000, 'clay');
await buy('brandt32'); await fit([['engine', 'exhaust'], ['engine', 'intake'], ['engine', 'stage2'], ['suspension', 'susp2'], ['weight', 'weight2'], ['brakes', 'brakekit']]); await tyre('semi'); await oil();
await runEvent('touring');
await choose('corsa'); await fit([['brakes', 'brakekit']]); await oil();
await runEvent('h200');
await choose('corsa'); await fit([['engine', 'exhaust'], ['engine', 'stage1'], ['weight', 'weight2'], ['suspension', 'susp2']]); await oil();
await runEvent('gp');
writeFileSync('tools/.play-last.txt', `day ${app.profile.day}, ${money()} CR, cars ${app.profile.cars.map((c) => c.id)}, ended ${app.profile.ended}\n`);
t.ok(app.profile.ended, 'the game can be finished without cheating'); t.ok(app.profile.cars.some((c) => c.id === 'type9'), 'the Type 9 is yours'); t.ok(!app.dev.dirty, 'dev tools were off'); log(`THE END: day ${app.profile.day}, ${money()} CR, ${app.profile.cars.map((c) => c.id)}`);
void CARS;
t.done();
