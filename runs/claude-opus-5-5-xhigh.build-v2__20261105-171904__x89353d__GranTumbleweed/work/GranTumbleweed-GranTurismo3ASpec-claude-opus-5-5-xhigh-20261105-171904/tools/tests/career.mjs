// Money, licences, unlocks, prizes, oil, days. A save survives a version migration.
import { suite } from './_lib.mjs';
import * as C from '../../src/game/sim/career.js';
import { oilFactor, specOf, tunedParams, fullInstall } from '../../src/game/sim/tuning.js';
import { EVENTS, POINTS } from '../../src/game/data/events.js';
import { LICENCES, TESTS } from '../../src/game/data/licences.js';
import { SAVE_VERSION, START_CREDITS } from '../../src/game/data/meta.js';
const t = suite();
let p = C.newProfile();
t.eq(p.credits, START_CREDITS, 'starts with 15,000');
t.ok(!C.buyCar(p, 'moth').ok, 'cannot afford the Moth');
t.ok(C.buyCar(p, 'kite').ok, 'buys the Kite'); t.eq(p.credits, 2500, 'pays for the Kite'); t.eq(C.carEntry(p).carId, 'kite', 'Kite is current');
t.ok(!C.buyCar(p, 'works').ok, 'the Works is closed before Licence A');
t.eq(C.sellCar(p, C.carEntry(p).uid).why, 'last', 'cannot sell the last car');
// Parts
const car = C.carEntry(p);
t.ok(C.buyPart(p, car, 'exhaust').ok, 'buys an exhaust'); t.eq(p.credits, 1600, 'pays 900'); t.ok(tunedParams('kite', car.install).powerPS > 148 * 1.03, 'an exhaust adds power');
t.eq(C.buyPart(p, car, 'exhaust').why, 'owned', 'cannot buy it twice');
p.credits = 50000; C.buyPart(p, car, 'stage1'); C.buyPart(p, car, 'stage3'); t.ok(car.install.on.stage === 'stage3' && car.install.owned.includes('stage1'), 'exclusive group keeps one on'); C.buyPart(p, car, 'stage1'); t.eq(car.install.on.stage, 'stage1', 'an owned part swaps for free');
const mass = tunedParams('kite', car.install).mass; C.buyPart(p, car, 'weight2'); t.ok(tunedParams('kite', car.install).mass < mass, 'weight stage lowers mass');
C.buyPart(p, car, 'aeroWing'); t.ok(tunedParams('kite', car.install).clA > 0.5, 'a wing adds downforce'); C.setSetup(car, 'downforce', 1.5); t.ok(tunedParams('kite', car.install).clA > 0.75, 'the downforce slider works');
C.buyTyre(p, car, 'slick'); t.ok(tunedParams('kite', car.install).tyreMu === 1.3 && tunedParams('kite', car.install).wearX === 2.2, 'tyres replace the stock row');
C.buyPaint(p, car, 'blue'); t.eq(car.install.paint, 'blue', 'paint'); C.buyRims(p, car, 2); t.eq(car.install.rims, 2, 'rims');
// Oil
t.near(oilFactor(50, true), 1.02, 1e-9, 'fresh oil gives 2%'); t.near(oilFactor(150, true), 1, 1e-9, 'level after 100 km'); t.near(oilFactor(280), 0.99, 1e-9, '0.5% per 40 km past 200'); t.near(oilFactor(5000), 0.92, 1e-9, 'never worse than -8%');
const c2 = C.carEntry(p); c2.kmOil = 500; const before = p.credits; t.ok(C.changeOil(p, c2).ok, 'oil change'); t.eq(p.credits, before - C.OIL_PRICE, 'oil costs 250'); t.eq(c2.kmOil, 0, 'oil is fresh');
c2.dirt = 0.5; C.washCar(p, c2); t.eq(c2.dirt, 0, 'a wash removes mud');
C.driveCar(p, c2, 10000, 5000); t.near(c2.km, 10, 1e-6, 'km counted'); t.ok(c2.dirt > 0, 'dirt builds up');
// Licences
const q = C.newProfile(); C.addCar(q, 'kite');
for (const [i, id] of LICENCES.C.tests.entries()) { const r = C.recordTest(q, id, TESTS[id].medals.gold - 0.01); t.eq(r.medal, 'gold', `${id} gold`); if (i === 3) { t.ok(r.licenceWon, 'Licence C is won on the fourth test'); t.eq(r.reward, 2000, 'reward 2000'); t.ok(r.allGold && r.prizeCar === 'pico', 'all gold gives the Pico'); } }
t.ok(q.licences.C, 'holds C'); t.ok(C.licenceOpen(q, 'B'), 'opens B'); t.ok(!C.licenceOpen(q, 'A'), 'A stays closed');
t.eq(C.medalFor(TESTS['C-1'], TESTS['C-1'].medals.bronze + 1), null, 'too slow is no medal');
const f = C.newProfile(); t.eq(C.recordFailure(f, 'C-1'), 1, 'failures count'); C.recordFailure(f, 'C-1'); C.recordFailure(f, 'C-1'); t.eq(f.tests['C-1'].fails, 3, 'three failures offer the line');
// Events
const e = C.newProfile(); C.addCar(e, 'kite'); t.ok(!C.eventOpen(e, 'dawn').ok, 'needs a licence'); e.licences.C = true; t.ok(C.eventOpen(e, 'dawn').ok, 'opens with C'); t.ok(!C.eventOpen(e, 'gp').ok, 'GP is closed');
const roster = C.eventRoster('dawn'); t.eq(roster.length, 5, 'field of six'); t.ok(roster[0].skill <= roster[4].skill, 'slowest at the front');
const names = ['YOU', ...roster.map((r) => r.name)]; let cash = e.credits, day = e.day;
let r = C.recordRound(e, 'dawn', names, 'YOU'); t.eq(r.prize, 1500, 'first prize'); t.eq(r.points, POINTS[0], '10 points'); t.eq(e.credits, cash + 1500, 'paid'); t.eq(e.day, day + 1, 'a race advances the day'); t.ok(!r.seriesDone, 'series continues');
r = C.recordRound(e, 'dawn', [names[1], 'YOU', ...names.slice(2)], 'YOU'); t.eq(r.prize, 900, 'second pays 60%');
r = C.recordRound(e, 'dawn', names, 'YOU'); t.ok(r.seriesDone, 'series ends'); t.ok(r.seriesWon, 'most points wins'); t.eq(r.bonus, 3000, 'series bonus');
t.ok(e.events.dawn.won, 'marked won'); t.ok(e.trophies.some((x) => x.kind === 'cup'), 'a cup on the shelf'); t.eq(e.events.dawn.round, 0, 'can run it again');
const lastPays = C.recordRound(C.newProfile(), 'dawn', [...names.slice(1), 'YOU'], 'YOU'); t.eq(lastPays.prize, 0, 'last pays nothing'); const again = C.recordRound(e, 'dawn', names, 'YOU'); void again; for (let i = 0; i < 2; i++) r = C.recordRound(e, 'dawn', names, 'YOU'); t.eq(r.bonus, 0, 'no second bonus');
// Rally: the clock decides by legs.
const ra = C.newProfile(); ra.licences.B = true; let rr; for (const order of [['YOU', 'A'], ['B', 'YOU'], ['YOU', 'C']]) rr = C.recordRound(ra, 'clay', order, 'YOU'); t.ok(rr.seriesWon && rr.prizeCar === 'ryuRally', 'two legs of three wins the rally');
const rb = C.newProfile(); for (const order of [['A', 'YOU'], ['B', 'YOU'], ['YOU', 'C']]) rr = C.recordRound(rb, 'clay', order, 'YOU'); t.ok(!rr.seriesWon, 'one leg of three does not');
// Prize cars cannot be sold; selling pays half.
const s = C.newProfile(); C.addCar(s, 'kite'); C.addCar(s, 'ginga'); const pz = C.addCar(s, 'type9', { prize: true }); t.eq(C.sellCar(s, pz.uid).why, 'prize', 'a prize car cannot be sold'); const cc = s.credits; t.ok(C.sellCar(s, s.cars[0].uid).ok, 'sells'); t.eq(s.credits, cc + 6250, 'half the price');
// GP
const g = C.newProfile(); g.licences.A = true; t.ok(!C.eventOpen(g, 'gp').ok, 'GP needs a win'); g.events.h200 = { won: true }; t.ok(C.eventOpen(g, 'gp').ok, 'H200 opens the GP'); for (let i = 0; i < 4; i++) r = C.recordRound(g, 'gp', ['YOU', 'A'], 'YOU'); t.ok(r.ending && g.ended && r.prizeCar === 'type9', 'winning the GP ends the game with the Type 9');
// Migration
const old = { version: 1, credits: 777, cars: [{ uid: 1, carId: 'kite', install: { owned: ['exhaust'] }, km: 12, kmOil: 12 }], licences: {}, events: {}, trophies: [], tests: {}, stats: { km: 12, wins: 0, gold: 0, races: 1 }, current: 1, nextUid: 2, day: 3, records: {} };
const m = C.migrate(JSON.parse(JSON.stringify(old))); t.eq(m.version, SAVE_VERSION, 'migrates to the current version'); t.eq(m.credits, 777, 'keeps money'); t.ok(Array.isArray(m.replays) && m.ghosts, 'adds replay slots and ghosts'); t.ok(m.cars[0].install.tyres && m.cars[0].install.owned[0] === 'exhaust', 'fills in installs'); t.ok(tunedParams('kite', m.cars[0].install).powerPS > 148, 'a migrated car still drives');
t.eq(C.migrate(null).credits, START_CREDITS, 'garbage becomes a new profile');
t.eq(C.nudge(C.newProfile()).to, 'dealer', 'the first nudge is to the dealer');
const n2 = C.newProfile(); C.addCar(n2, 'kite'); t.eq(C.nudge(n2).to, 'licence', 'then the licence centre');
void specOf; void fullInstall; void EVENTS;
t.done();
