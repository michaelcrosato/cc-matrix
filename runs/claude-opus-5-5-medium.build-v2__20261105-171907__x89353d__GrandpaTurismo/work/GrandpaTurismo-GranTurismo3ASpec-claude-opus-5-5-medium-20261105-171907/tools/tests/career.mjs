import { suite } from './lib.mjs';
import { newProfile, migrate, buyCar, canBuy, sellCar, canSell, buyPart, changeOil, washCar, oilFactor, addMileage, applyTest, applyRound, eventOpen, carQualifies, carRec, nudge, hasCar, medalFor, resetEvent } from '../../src/game/sim/career.js';
import { TEST, LICENCES } from '../../src/game/data/licences.js';
import { EVENT } from '../../src/game/data/events.js';
import { PROFILE_VERSION } from '../../src/game/data/meta.js';
import { tunedParams, specOf } from '../../src/game/sim/tuning.js';
const t = suite(), p = newProfile();
t.ok(p.credits === 15000, 'starting credits'); t.ok(nudge(p).place === 'dealer', 'first nudge: dealer');
t.ok(canBuy(p, 'kite').ok && canBuy(p, 'ginga').ok && canBuy(p, 'pico').ok, 'three affordable'); t.ok(!canBuy(p, 'moth').ok, 'moth too dear'); t.ok(!canBuy(p, 'type9').ok, 'type 9 not for sale');
const k = buyCar(p, 'kite'); t.ok(p.credits === 2500 && k && p.current === k.uid, 'buy kite'); t.ok(!canSell(p, k.uid).ok, 'cannot sell the last car');
const before = oilFactor(k); t.ok(before < 1, 'used oil is tired', `${before}`);
t.ok(changeOil(p, k) && p.credits === 2250 && oilFactor(k) === 1.02, 'oil change gives a fresh bonus', `${oilFactor(k)}`); addMileage(p, k, 120000); t.ok(oilFactor(k) === 1, 'bonus ends after 100 km'); addMileage(p, k, 240000); t.ok(oilFactor(k) === 0.98 , 'oil tires', `${oilFactor(k)} ${k.oilKm}`); addMileage(p, k, 9e6); t.ok(oilFactor(k) === 0.92, 'oil floor -8%');
k.dirt = 0.8; t.ok(washCar(p, k) && k.dirt === 0, 'wash');
t.ok(buyPart(p, k, 'pads'), 'buy pads'); t.ok(tunedParams('kite', k.install).brakeG > tunedParams('kite', {}).brakeG, 'pads change brakeG'); t.ok(!buyPart(p, k, 'pads'), 'not twice');
t.ok(!buyPart(p, k, 'stage3'), 'cannot afford stage 3'); p.credits = 1e6; t.ok(buyPart(p, k, 'stage1') && buyPart(p, k, 'stage3'), 'stages'); t.ok(k.install.parts.engine === 3, 'stage exclusive'); t.ok(specOf('kite', k.install).ps === 200, 'ps');
t.ok(buyPart(p, k, 'wing') && k.install.parts.aero === 2 && k.install.settings.downforce === 1, 'wing unlocks a setting');
// licences
t.ok(medalFor(TEST['C-1'], TEST['C-1'].medals.gold) === 3, 'gold'); t.ok(medalFor(TEST['C-1'], 9999) === 0, 'no medal');
for (const id of ['C-1', 'C-2', 'C-3']) applyTest(p, id, TEST[id].medals.bronze); t.ok(!p.licences.C, 'three of four is not a licence'); const c0 = p.credits, r4 = applyTest(p, 'C-4', TEST['C-4'].medals.gold); t.ok(p.licences.C && r4.licenceWon === 'C' && p.credits === c0 + 2000, 'licence C reward'); t.ok(!hasCar(p, 'pico'), 'no gold prize yet');
for (const id of ['C-1', 'C-2', 'C-3']) applyTest(p, id, TEST[id].medals.gold); t.ok(hasCar(p, 'pico'), 'all gold: pico'); const fr = applyTest(p, 'B-1', 999, true); t.ok(fr.medal === 0 && p.failStreak['B-1'] === 1, 'fail streak');
t.ok(eventOpen(p, 'dawn').ok && !eventOpen(p, 'feather').ok && !eventOpen(p, 'gp').ok, 'event gates');
// a series
const row = (me) => (me === 0 ? [{ key: 'player', player: true }, { key: 'a' }, { key: 'b' }] : [{ key: 'a' }, { key: 'player', player: true }, { key: 'b' }]);
let m0 = p.credits, o = applyRound(p, 'dawn', row(0)); t.ok(o.place === 1 && o.money === 2500 && p.credits === m0 + 2500, 'first prize'); o = applyRound(p, 'dawn', row(1)); t.ok(o.money === 1500, 'second pays 60%', `${o.money}`); o = applyRound(p, 'dawn', row(0)); t.ok(o.seriesOver && o.seriesWon && o.bonus === 5000, 'series won'); t.ok(p.events.dawn.won && p.events.dawn.round === 0, 'event state'); t.ok(p.trophies.some((x) => x.name === EVENT.dawn.name), 'trophy');
p.licences.B = true; const s0 = p.day; applyRound(p, 'clay', [{ key: 'player', player: true }, { key: 'rival' }]); applyRound(p, 'clay', [{ key: 'rival' }, { key: 'player', player: true }]); o = applyRound(p, 'clay', [{ key: 'rival' }, { key: 'player', player: true }]); t.ok(o.seriesOver && !o.seriesWon, 'rally: lose two legs, lose'); t.ok(p.day === s0 + 3, 'days advance'); t.ok(!hasCar(p, 'ryuRally'), 'no prize on a loss');
applyRound(p, 'clay', [{ key: 'player', player: true }, { key: 'rival' }]); applyRound(p, 'clay', [{ key: 'player', player: true }, { key: 'rival' }]); o = applyRound(p, 'clay', [{ key: 'rival' }, { key: 'player', player: true }]); t.ok(o.seriesWon && o.prizeCar === 'ryuRally' && hasCar(p, 'ryuRally'), 'rally win gives the car');
t.ok(!canSell(p, carRec(p, p.cars.find((c) => c.id === 'ryuRally').uid).uid).ok, 'prize cars are not for sale'); const g = buyCar(p, 'ginga'); t.ok(sellCar(p, g.uid) === 7400, 'selling returns 50%');
t.ok(carQualifies(EVENT.fellow, 'ginga', {}).ok === false, 'fellowship is FF'); t.ok(carQualifies(EVENT.feather, 'longhorn', {}).ok === false, 'kg limit'); t.ok(carQualifies(EVENT.dawn, 'ryu', {}).ok === false, 'ps limit');
applyRound(p, 'dawn', row(0)); resetEvent(p, 'dawn'); t.ok(p.events.dawn.round === 0, 'start over');
p.licences.A = true; t.ok(!eventOpen(p, 'gp').ok, 'gp needs touring or h200'); p.events.h200 = { won: true, round: 0, points: {} }; t.ok(eventOpen(p, 'gp').ok, 'gp opens'); o = (p.events.gp = { round: 3, points: { player: 30, x: 8 }, won: false }, applyRound(p, 'gp', [{ key: 'player', player: true }, { key: 'x' }])); t.ok(o.ending && o.prizeCar === 'type9' && p.ended, 'gp ends the game'); t.ok(LICENCES.length === 3, 'licences');
// migration
const old = { v: 1, credits: 5, day: 2, cars: [{ uid: 1, id: 'kite' }], current: 1, nextUid: 2, tests: {}, licences: {}, events: {}, assists: {}, records: {}, stats: {} }, mg = migrate(JSON.parse(JSON.stringify(old))); t.ok(mg.v === PROFILE_VERSION && mg.credits === 5 && mg.cars[0].install && mg.replays && mg.seen, 'a save survives a version migration'); t.ok(migrate(null).credits === 15000, 'no save, new profile');
t.done();
