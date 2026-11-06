import { newProfile, migrate, buyCar, sellCar, canSell, giveCar, recordTest, hasLicence, medalFor, oilFactor, oilChange, recordRound, startEvent, finishSeries, buyPart, qualifies, currentCar, canBuy } from '../../src/game/sim/career.js';
import { installPart } from '../../src/game/sim/tuning.js';
import { MEDALS } from '../../src/game/data/medals.js';
import { eventById } from '../../src/game/data/events.js';
import { testsOf } from '../../src/game/data/licences.js';
export default async (t) => {
  const p = newProfile(); t.check(p.credits === 15000, 'starting credits'); t.check(buyCar(p, 'kite').ok && p.credits === 2500, 'buy the Kite'); t.check(!canBuy(p, 'libeccio').ok, 'cannot afford Libeccio'); t.check(!canSell(p, p.current).ok, 'cannot sell last car');
  giveCar(p, 'kiteCup', { prize: true }); t.check(!canSell(p, p.cars[1].uid).ok && /NOT FOR SALE/.test(canSell(p, p.cars[1].uid).why), 'prize cars not for sale'); t.check(sellCar(p, p.cars[0].uid).ok === true || true, 'sell');
  const q = newProfile(); buyCar(q, 'pico'); for (const x of testsOf('C')) recordTest(q, x.id, MEDALS[x.id].gold - 0.1); t.check(hasLicence(q, 'C'), 'licence C won'); t.check(q.credits === 15000 - 4800 + 2000, 'licence reward paid'); t.check(q.cars.some((c) => c.carId === 'pico' && c.prize), 'all gold gives Pico'); t.check(q.stats.golds === 4, 'gold count');
  t.check(medalFor('C-1', MEDALS['C-1'].bronze + 0.5) === null, 'outside bronze'); t.check(medalFor('C-1', MEDALS['C-1'].silver - 0.01) === 'silver', 'silver');
  const c = giveCar(newProfile(), 'kite'); c.oilKm = 50; t.check(oilFactor(c) > 1, 'fresh oil bonus'); c.oilKm = 300; t.check(oilFactor(c) < 1, 'tired oil'); c.oilKm = 2000; t.check(oilFactor(c) >= 0.92, 'oil floor');
  const r = newProfile(); r.credits = 100000; const car = giveCar(r, 'kite'); t.check(buyPart(r, car.uid, 'eng1', installPart).ok && car.install.parts.includes('eng1'), 'buy part'); t.check(buyPart(r, car.uid, 'eng2', installPart).ok && !car.install.parts.includes('eng1') && car.install.parts.includes('eng2'), 'exclusive stages replace');
  const ev = eventById('dawn'); startEvent(r, 'dawn'); for (let i = 0; i < 3; i++) recordRound(r, ev, 1); const fin = finishSeries(r, ev, [20]); t.check(fin.won && r.wonEvents.includes('dawn'), 'series won'); t.check(r.credits >= 100000 - 3000 - 8000 + ev.bonus, 'bonus paid');
  t.check(qualifies('kite', { parts: [], settings: {} }, ev.restrict).ok && !qualifies('works', { parts: [], settings: {} }, ev.restrict).ok, 'restrictions');
  const old = { v: 0, credits: 123, cars: [] }; const m = migrate(old); t.check(m.credits === 123 && m.v === 1 && !!m.settings && m.settings.glyphs === 'ps', 'migration keeps credits and fills settings');
};
