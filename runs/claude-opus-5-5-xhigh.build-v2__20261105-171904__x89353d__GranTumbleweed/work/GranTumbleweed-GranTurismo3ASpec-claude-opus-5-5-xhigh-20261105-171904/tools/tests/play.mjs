// The whole game by script: a bot presses real actions through real screens, buys the Kite, passes licences, wins events,
// tunes, buys, pits, reaches the Grand Prix and sees the ending. Dev tools stay off. It fails if the game can't be finished without cheating.
import { suite } from './_lib.mjs';
import { boot } from './_drive.mjs';
import { CAR_INFO } from '../../src/game/data/cars.js';
import { EVENTS } from '../../src/game/data/events.js';
import { LICENCES, TESTS } from '../../src/game/data/licences.js';
import { carEntry, eligible, eventOpen } from '../../src/game/sim/career.js';
import { specOf } from '../../src/game/sim/tuning.js';
import { TILES, PARTS } from '../../src/game/data/parts.js';
const t = suite(), verbose = !!process.env.PLAY_VERBOSE;
const say = (...a) => { if (verbose) console.error(...a); };
const b = await boot(), app = b.app, p = () => app.profile;
const money = () => `${p().credits} CR, day ${p().day}`;
// ---- title to the first car ----
await b.go('new'); await b.choose('go'); await b.frames(3);
app.actions.inject('moveX+'); await b.frames(2); await b.press('confirm'); await b.frames(2); t.eq(carEntry(p()).carId, 'kite', 'buys the Kite'); await b.press('back'); await b.frames(3); t.eq(b.id, 'map', 'on the Map'); say('kite', money());
// ---- helpers: walking through real screens ----
const openMap = async (place) => { t.eq(b.id, 'map', `at the Map before ${place}`); await b.choose(place); await b.frames(3); };
const backToMap = async () => { for (let i = 0; i < 8 && b.id !== 'map'; i++) { await b.press('back'); await b.frames(2); } };
async function passTest(lic, id) {
  await openMap('licence'); await b.choose(lic); await b.frames(2); await b.choose(id); await b.frames(2);
  // An ABS-off test: squeeze, don't stamp.
  b.brain({ skill: 1, brakeMax: TESTS[id].assists?.abs === false ? 0.62 : 1 });
  await b.choose('start'); await b.settle();
  for (let leg = 0; leg < (TESTS[id].legs?.length ?? 1); leg++) { if (leg > 0) { await b.settle(); await b.until(() => app.scene?.name === 'race' && app.scene.leg === leg, 400); } const ok = await b.until(() => app.scene?.judge?.status !== 'running', 30000, 1 / 15); t.ok(ok, `${id} ends`); if (leg + 1 < (TESTS[id].legs?.length ?? 1)) { await b.until(() => app.switching || app.scene?.leg === leg + 1, 400); await b.settle(); } }
  await b.until(() => b.id === 'testResult', 1500); t.eq(b.id, 'testResult', `${id} result`);
  const rec = p().tests[id]; say(' ', id, app.scene.judge?.status, rec?.medal, rec?.best?.toFixed(2), app.scene.judge?.reason); t.ok(rec?.medal, `${id} earns a medal: best ${rec?.best}, gold ${TESTS[id].medals.gold}, status ${app.scene.judge?.status} ${app.scene.judge?.reason}`);
  await b.choose('backTo'); await b.settle(); b.noBrain();
  if (b.id === 'prize') { t.ok(CAR_INFO[b.top.o.carId], 'an all-gold licence reveals a prize car'); await b.until(() => b.top?.tl, 60); await b.frames(4); await b.press('confirm'); await b.until(() => b.id !== 'prize', 900); }
  await backToMap();
}
async function licence(lic) { for (const id of LICENCES[lic].tests) await passTest(lic, id); t.ok(p().licences[lic], `holds Licence ${lic}`); say('licence', lic, money()); }
async function ensureCar(pred) { // Choose a car in the Home Garage that satisfies pred, through the garage screen.
  if (pred(carEntry(p()))) return true;
  const k = p().cars.findIndex(pred); if (k < 0) return false;
  await openMap('garage'); await b.focus('drive'); while (b.top.index !== k) { app.actions.inject('moveX+'); await b.frames(2); } await b.press('confirm'); await b.frames(2); await backToMap(); return true;
}
async function buyAt(carId) { if (p().cars.some((c) => c.carId === carId)) { say('already owned', carId); return; } if (p().credits < CAR_INFO[carId].price) { say('cannot afford', carId, money()); return; } await openMap('dealer'); while (!b.top.list.includes(carId)) { await b.press('tabR'); await b.frames(2); } while (b.top.list[b.top.car] !== carId) { app.actions.inject('moveX+'); await b.frames(2); } await b.press('confirm'); await b.frames(2); await backToMap(); t.ok(p().cars.some((c) => c.carId === carId), `buys the ${carId}: ${money()}`); say('bought', carId, money()); }
async function fit(parts) { // Tuning Street, through its tiles. Only what can be afforded.
  await openMap('tuning');
  for (const id of parts) {
    const part = PARTS[id], car = carEntry(p()), tile = part ? part.cat : 'tyres', price = part ? part.price : 0;
    if (part && (car.install.owned.includes(id) || p().credits < price)) continue;
    const tileIdx = TILES.findIndex((x) => x.id === tile), page = Math.floor(tileIdx / 4); while (b.top.page !== page) { await b.choose('more'); await b.frames(1); }
    await b.choose(tile); await b.frames(2);
    if (part) { while (!b.has(id)) { await b.choose('morePage'); await b.frames(1); } await b.choose(id); await b.frames(3); if (b.id === 'dyno') { await b.frames(10); await b.top.__proto__.constructor; b.top.t = 99; await b.frames(2); await b.choose('done'); await b.frames(2); } }
    else { await b.choose(id); await b.frames(2); }
    await b.press('back'); await b.frames(2);
  }
  await backToMap(); say('fitted', parts.join(','), money());
}
async function oil() { const car = carEntry(p()); if (car.kmOil < 240 || p().credits < 1500) return; await openMap('service'); await b.choose('oil'); await b.frames(6); await backToMap(); say('oil', money()); }
const WANT = { dawn: 1, fellow: 1, feather: 1, society: 1, clay: 2, touring: 1, h200: 1, gp: 1 };
async function runEvent(id, { skill = 1, attempts = 5, pit = false } = {}) {
  const e = EVENTS[id];
  for (let n = 0; n < attempts && !p().events[id]?.won; n++) {
    t.ok(eventOpen(p(), id).ok, `${id} is open: ${eventOpen(p(), id).why}`);
    await oil();
    await openMap('events');
    for (let k = 0; k < 3 && !b.has(id); k++) { await b.press('tabR'); await b.frames(2); }
    await b.choose(id); await b.frames(2); t.eq(b.id, 'eventCard', `${id} card`);
    const car = carEntry(p()), ok = eligible(e, car.carId, car.install); t.ok(ok.ok, `${CAR_INFO[car.carId].short} qualifies for ${id}: ${ok.why}`);
    for (let r = 0; r < e.rounds.length; r++) {
      if (b.id !== 'roundCard') { await b.choose('start'); await b.frames(2); }
      t.eq(b.id, 'roundCard', `${id} round card ${r}`); b.brain({ skill, pit }); await b.choose('go'); await b.settle();
      const fin = await b.drive(120000); t.ok(fin, `${id} round ${r} finishes`);
      const row = app.scene.sim.results().find((x) => x.player === 0); say(' ', id, 'round', r, e.rounds[r].track, 'P', row?.pos, 'of', app.scene.sim.cars.length, app.scene.sim.cars[app.scene.sim.cars.length - 1].bestLap?.toFixed(1), 'pits', app.scene.sim.cars.find((x) => x.player === 0).pits, money()); b.noBrain();
      await b.choose('continue'); await b.settle();
      if (!app.scene?.sim && b.id === 'podium') { await b.until(() => b.top?.tl, 300); await b.press('confirm'); await b.until(() => b.id !== 'podium', 1200); if (b.id === 'prize') { await b.until(() => b.top?.tl, 300); await b.press('confirm'); await b.until(() => b.id !== 'prize', 1200); } if (b.id === 'ending') { t.ok(true, 'the ending plays'); b.top.t = 999; await b.frames(3); t.ok(b.has('go'), 'the ending card'); await b.choose('go'); await b.frames(3); } }
    }
    await backToMap();
    say(id, p().events[id]?.won ? 'WON' : 'lost', money());
  }
  t.ok(p().events[id]?.won, `wins ${id}`);
}
// ---- the career ----
await licence('C');
await fit(['exhaust', 'weight1']);
await runEvent('dawn');
await fit(['intake', 'stage1']);
await runEvent('fellow');
await licence('B');
await buyAt('moth'); await ensureCar((c) => c.carId === 'moth'); await fit(['exhaust', 'intake', 'weight1', 'suspSport', 'stage1']);
await runEvent('feather');
await buyAt('ginga'); await ensureCar((c) => c.carId === 'ginga'); await fit(['exhaust', 'intake', 'weight1', 'stage1', 'suspSport', 'brakeSport']);
await runEvent('society');
await fit(['rally']);
say('install', JSON.stringify(carEntry(p()).install));
await runEvent('clay');
await licence('A');
await ensureCar((c) => c.carId === 'kiteCup'); await fit(['exhaust', 'intake']);
await runEvent('touring');
await ensureCar((c) => c.carId === 'corsa'); await runEvent('h200', { pit: true });
await fit(['exhaust', 'intake', 'stage1', 'weight1', 'suspRace', 'brakeRace']);
await runEvent('gp');
t.ok(p().ended, 'the game is finished'); t.ok(p().cars.some((c) => c.carId === 'type9'), 'the Type 9 is yours');
t.ok(!app.devActive(), 'no dev tools were used');
say('finished', money(), 'cars', p().cars.map((c) => c.carId).join(','), 'km', Math.round(p().stats.km));
void specOf;
t.done();
