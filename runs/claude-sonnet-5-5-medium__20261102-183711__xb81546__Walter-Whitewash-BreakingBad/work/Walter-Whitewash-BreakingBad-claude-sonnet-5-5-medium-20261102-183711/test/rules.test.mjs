// The rules module, by itself: every number the game's economy rests on.
import { createRequire } from 'node:module';
import { checker } from './_load.mjs';
const R = createRequire(import.meta.url)('../src/00-rules.js');
const { check, done } = checker();
const st = () => R.newState();

check('new state starts on day 1 at 6:00 with nothing', (s => s.day === 1 && s.minutes === 360 && s.dirty === 0 && s.clean === 1600 && s.hp === 100)(st()));
// cooking
check('purity: worst cook is 40, best is 100 (no hood)', R.purity(0, 0, 0) === 40 && R.purity(1, 1, 1) === 100);
check('fume hood adds 5 per level, capped at 100', R.purity(0, 0, 0, 2) === 50 && R.purity(1, 1, 1, 2) === 100);
check('batch size grows with purity: 3 at 40, 6 at 100', R.batchSize(40) === 3 && R.batchSize(75) === 5 && R.batchSize(100) === 6);
check('grades: blue sky at 99, swill under 60', R.grade(99) === 'BLUE SKY' && R.grade(92) === 'CRYSTAL' && R.grade(80) === 'SOLID' && R.grade(65) === 'STREET' && R.grade(50) === 'SWILL');
check('measure score: inside the zone is perfect, far outside is poor', R.measureScore(.5, .5, .2) === 1 && R.measureScore(.55, .5, .2) === 1 && R.measureScore(.95, .5, .2) < .1 && R.measureScore(.68, .5, .2) > .3);
check('cook time shrinks with fume hood', R.cookMinutes(0) === 120 && R.cookMinutes(2) === 70);
// prices and selling
check('price runs 700 to 1300 a brick', R.price(40) === 700 && R.price(100) === 1300 && R.price(99) === 1290);
(() => { const s = st(); s.bricks = [90, 60, 99]; const p = R.sellOne(s, 1);
  check('selling pays the price and removes the brick', p === R.price(60) && s.bricks.length === 2 && s.dirty === p && s.stats.sold === 1 && s.soldToday === 1); })();
check('selling with no bricks pays nothing', R.sellOne(st()) === 0);
// contracts
(() => { const s = st(), c = R.contractFor(2, () => .5);
  check('contract wants a count, purity, a gate and a deadline', c.n >= 1 && c.minPurity === 72 && ['north', 'east', 'south'].includes(c.at) && c.deadline > 600 && c.bonus === 1.6);
  s.bricks = [90, 90]; check('cannot fill without enough bricks', !R.canFill(s, { n: 3, minPurity: 80 }));
  s.bricks = [90, 70, 95, 99]; const cc = { n: 3, minPurity: 80, bonus: 1.6 }; check('can fill with enough good bricks', R.canFill(s, cc));
  s.contract = cc; const pay = R.fillContract(s, cc);
  check('filling pays a bonus and uses the lowest good bricks', pay === Math.round(R.price(90) * 1.6 / 10) * 10 + Math.round(R.price(95) * 1.6 / 10) * 10 + Math.round(R.price(99) * 1.6 / 10) * 10 && s.bricks.length === 1 && s.bricks[0] === 70 && s.contract === null && s.contractsDone === 1, pay + ' ' + JSON.stringify(s.bricks)); })();
// laundering
(() => { const s = st(); s.dirty = 5000; s.clean = 0;
  check('launder cap is 3000, plus 2500 a bay level', R.launderCap(s) === 3000 && (s.up.wash = 2, R.launderCap(s) === 8000) && (s.up.wash = 0, true));
  const r = R.launder(s, 1500);
  check('laundering takes the fee: 1500 in, 1125 clean out', r.moved === 1500 && r.clean === 1125 && s.dirty === 3500 && s.clean === 1125 && s.launderedToday === 1500);
  const r2 = R.launder(s, 9999);
  check('laundering stops at the day\'s cap', r2.moved === 1500 && s.launderedToday === 3000 && R.launderRoom(s) === 0);
  check('nothing moves once the cap is hit', R.launder(s, 100).moved === 0);
  const t = st(); t.dirty = 300; check('cannot launder more than you hold', R.launder(t, 1000).moved === 300); })();
// shop
(() => { const s = st(); s.dirty = 1000; s.clean = 500;
  check('spend uses dirty cash first', R.spend(s, 1200) && s.dirty === 0 && s.clean === 300);
  check('spend refuses what you cannot afford', !R.spend(s, 301) && s.clean === 300);
  const u = st(); u.dirty = 1700;
  check('ingredients cost 800, two at most', R.buyIngredients(u) && R.buyIngredients(u) && !R.buyIngredients(u) && u.ingredients === 2 && u.dirty === 100);
  const v = st(); v.dirty = 5000;
  check('upgrades buy up to their max', R.buy(v, 'vent') && R.buy(v, 'vent') && !R.buy(v, 'vent') && v.up.vent === 2);
  check('vest reduces damage 20% a level', (R.buy(v, 'vest'), R.armor(v) === .8) && R.damage(v, 10, 1) === 8);
  const w = st(); w.dirty = 600; w.ammo = 3; R.buy(w, 'pistol');
  check('ammo case raises the cap and refills', R.ammoMax(w) === 24 && w.ammo === 24);
  const x = st(); x.dirty = 2000; x.pills = 3; check('pills cap at 3', !R.canBuy(x, 'pills')); x.pills = 1; check('pills can be bought below the cap', R.buy(x, 'pills') && x.pills === 2);
  const y = st(); y.hp = 50; y.pills = 1; check('a pill heals 35', R.heal(y) && y.hp === 85 && y.pills === 0 && !R.heal(y)); })();
// difficulty
check('damage scales with difficulty', R.damage(st(), 10, 0) === 7 && R.damage(st(), 10, 1) === 10 && R.damage(st(), 10, 2) === 13);
// heat
(() => { const s = st();
  check('heat clamps at 100 and 0', R.addHeat(s, 500) === 100 && R.addHeat(s, -500) === 0);
  R.addHeat(s, 60); check('heat levels', R.heatLevel(s.heat) === 2 && R.heatName(s.heat) === 'HOT' && R.heatLevel(10) === 0 && R.heatLevel(45) === 1 && R.heatLevel(90) === 3);
  const a = st(), b = st(); a.heat = b.heat = 50; R.decayHeat(a, 10, true); R.decayHeat(b, 10, false);
  check('heat cools faster out of sight', a.heat < b.heat && a.heat === 10 && b.heat === 41); })();
// the clock
check('clock text', R.clockText(360) === '6:00 AM' && R.clockText(13 * 60 + 5) === '1:05 PM' && R.clockText(720) === '12:00 PM' && R.clockText(1439) === '11:59 PM');
check('darkness: bright at noon, dark at night, dusk between', R.darkness(12 * 60) === 0 && R.darkness(22 * 60) === 1 && R.darkness(19.5 * 60) > 0 && R.darkness(19.5 * 60) < 1);
(() => { const s = st(); check('tick runs 4 minutes a second and stops at midnight', !R.tick(s, 1) && s.minutes === 364 && R.tick(s, 1000) && s.minutes === 1440); })();
// days
(() => { const s = st(); s.clean = 1000; s.dirty = 100; s.heat = 70; s.hp = 20; s.launderedToday = 5; s.contract = { n: 1 };
  const rep = R.endDay(s, 'sleep');
  check('end of day pays the bill from clean first and resets the day', rep.paid === 600 && s.clean === 400 && s.day === 2 && s.minutes === 360 && s.launderedToday === 0 && rep.contractFailed && s.contract === null);
  check('end of day cools heat 25 and heals 60', s.heat === 45 && s.hp === 80);
  const t = st(); t.clean = 100; t.dirty = 200; const r2 = R.endDay(t, 'sleep');
  check('a short bill takes everything and reports the shortfall', r2.paid === 300 && r2.short === 300 && t.clean === 0 && t.dirty === 0);
  const h = st(); h.hp = 1; R.endDay(h, 'hospital'); check('hospital heals fully', h.hp === 100); })();
(() => { const s = st(); s.day = 5; s.clean = 100; R.endDay(s, 'sleep'); check('after day 5 without the number: ran out', s.over === 'ran-out');
  const t = st(); t.day = 5; t.clean = 40000; R.endDay(t, 'sleep'); check('after day 5 with the number but no boss: late', t.over === 'late');
  const u = st(); u.day = 5; u.bossDone = true; R.endDay(u, 'sleep'); check('after the boss, no failure', u.over === null); })();
(() => { const s = st(); check('superlab shut early, open on day 5 or with the number', !R.superlabOpen(s) && (s.day = 5, R.superlabOpen(s)) && (s.day = 1, s.clean = R.GOAL, R.superlabOpen(s)) && (s.bossDone = true, !R.superlabOpen(s))); })();
(() => { const s = st(); s.bricks = [90, 90]; s.dirty = 1001;
  const r = R.busted(s); check('busted takes bricks and half the dirty money', r.bricks === 2 && r.fine === 500 && s.bricks.length === 0 && s.dirty === 501 && s.heat === 20 && s.stats.busted === 1);
  const k = st(); k.dirty = 1000; check('knocked out costs a quarter of the dirty money', R.knockedOut(k).lost === 250 && k.dirty === 750); })();
check('ranks by cash', (s => { s.clean = 100; const a = R.rank(s); s.clean = R.GOAL; const b = R.rank(s); s.clean = R.GOAL * 2; return a === 'JUST A TEACHER' && b === 'CAPABLE COOK' && R.rank(s) === 'KINGPIN'; })(st()));
done();
