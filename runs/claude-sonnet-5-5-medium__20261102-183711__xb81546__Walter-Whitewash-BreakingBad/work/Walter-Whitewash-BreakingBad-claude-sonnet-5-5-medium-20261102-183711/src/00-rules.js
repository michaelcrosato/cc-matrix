// WALTER WHITEWASH: the rules. Pure logic with no engine in it (economy, cooking scores, heat, contracts, the day clock),
// so the tests can hit every number without a screen. The game (30-game.js) calls these and draws what they say.
(() => {
const WW = (globalThis.WW = globalThis.WW || {});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = {};

R.GOAL = 12000;            // clean cash the family needs before the end of Day 5 (Walt starts with $1,600 in savings)
R.LAST_DAY = 5;
R.DAY_START = 6 * 60;      // the day runs 6:00 to 24:00, in minutes
R.DAY_END = 24 * 60;
R.MINUTES_PER_SECOND = 4;  // a real second of walking about is four minutes on the clock
R.INGREDIENT_COST = 800;
R.BILL = 600;              // the daily medical bill, paid when the day ends
R.LAUNDER_FEE = 0.25;      // the car wash keeps a quarter
R.SURPLUS = 40;            // heat above this makes the street nervous
R.UPGRADES = {
  vent:   { name: 'Fume Hood', cost: 1500, max: 2, text: 'Cleaner air. Cooks finish faster and each level adds +5 purity.' },
  wash:   { name: 'Car Wash Bays', cost: 2000, max: 2, text: 'More bays. Each level lets you launder $2,500 more a day.' },
  vest:   { name: 'Kevlar Vest', cost: 1200, max: 2, text: 'Bullets and fists hurt 20% less per level.' },
  pistol: { name: 'Pistol Ammo Case', cost: 600, max: 2, text: 'Carry more ammo: 24, then 36 rounds.' },
  pills:  { name: 'Pain Pills', cost: 300, max: 99, text: 'Heal 35 health. Carry up to 3. Cost per bottle.', consumable: true }
};

R.newState = () => ({
  day: 1, minutes: R.DAY_START, dirty: 0, clean: 1600, bricks: [], ingredients: 0, heat: 0,
  hp: 100, hpMax: 100, ammo: 12, pills: 1, weapon: 'fists',
  up: { vent: 0, wash: 0, vest: 0, pistol: 0, pills: 0 },
  launderedToday: 0, soldToday: 0, cooksToday: 0, earnedToday: 0,
  contract: null, contractsDone: 0, flags: {}, stats: { cooks: 0, sold: 0, laundered: 0, kills: 0, busted: 0, hospital: 0, bestPurity: 0, perfect: 0 },
  bossDone: false, over: null
});

// ---- cooking -----------------------------------------------------------------------------------------------------
// three stages, each scored 0..1: measuring (nearness of the stop to the green zone), heat (share of time in the band),
// filter (share of the prompts hit). Purity runs 40..100 with the fume hood adding.
R.measureScore = (pos, zoneC, zoneW) => clamp(1 - Math.max(0, Math.abs(pos - zoneC) - zoneW / 2) / 0.35, 0, 1) * (Math.abs(pos - zoneC) <= zoneW / 2 ? 1 : 0.9);
R.purity = (m, h, f, vent = 0) => Math.round(clamp(40 + 20 * clamp(m, 0, 1) + 20 * clamp(h, 0, 1) + 20 * clamp(f, 0, 1) + 5 * vent, 0, 100));
R.batchSize = purity => 2 + Math.floor(purity / 25);                    // 40 -> 3 bricks ... 100 -> 6
R.cookMinutes = vent => 120 - 25 * vent;
R.grade = p => p >= 99 ? 'BLUE SKY' : p >= 90 ? 'CRYSTAL' : p >= 75 ? 'SOLID' : p >= 60 ? 'STREET' : 'SWILL';

// ---- selling ----------------------------------------------------------------------------------------------------
R.price = purity => Math.round((300 + purity * 10) / 10) * 10;          // 700 .. 1300 a brick
R.contractFor = (day, rng = Math.random) => {
  const n = 1 + Math.floor(day / 2) + (rng() < .4 ? 1 : 0), p = 60 + day * 6;
  const spots = ['north', 'east', 'south'], at = spots[Math.floor(rng() * spots.length)];
  return { n, minPurity: Math.min(p, 95), at, deadline: Math.min(R.DAY_END - 60, 14 * 60 + Math.floor(rng() * 4) * 120), bonus: 1.6, day };
};
R.canFill = (st, c) => !!c && st.bricks.filter(b => b >= c.minPurity).length >= c.n;
R.fillContract = (st, c) => {
  const good = st.bricks.filter(b => b >= c.minPurity).sort((a, b) => a - b).slice(0, c.n);
  let pay = 0; for (const b of good) { pay += Math.round(R.price(b) * c.bonus / 10) * 10; st.bricks.splice(st.bricks.indexOf(b), 1); }
  st.dirty += pay; st.earnedToday += pay; st.contract = null; st.contractsDone++; return pay;
};
R.sellOne = (st, i = 0) => {
  if (!st.bricks.length) return 0;
  const [b] = st.bricks.splice(i, 1), p = R.price(b);
  st.dirty += p; st.earnedToday += p; st.soldToday++; st.stats.sold++; return p;
};
R.bestBrick = st => st.bricks.length ? st.bricks.indexOf(Math.max(...st.bricks)) : -1;

// ---- laundering --------------------------------------------------------------------------------------------------
R.launderCap = st => 3000 + 2500 * st.up.wash;
R.launderRoom = st => Math.max(0, R.launderCap(st) - st.launderedToday);
R.launder = (st, amount) => {
  const a = Math.floor(clamp(Math.min(amount, st.dirty, R.launderRoom(st)), 0, 1e9));
  if (a <= 0) return { moved: 0, clean: 0 };
  const clean = Math.round(a * (1 - R.LAUNDER_FEE));
  st.dirty -= a; st.clean += clean; st.launderedToday += a; st.stats.laundered += a;
  return { moved: a, clean };
};

// ---- the shop ---------------------------------------------------------------------------------------------------
R.cash = st => st.dirty + st.clean;
R.spend = (st, n) => {                         // dirty cash first, the clean is for the family
  if (R.cash(st) < n) return false;
  const d = Math.min(st.dirty, n); st.dirty -= d; st.clean -= n - d; return true;
};
R.upgradeCost = (st, id) => R.UPGRADES[id].cost;
R.canBuy = (st, id) => {
  const u = R.UPGRADES[id];
  if (id === 'pills') return st.pills < 3 && R.cash(st) >= u.cost;
  return st.up[id] < u.max && R.cash(st) >= u.cost;
};
R.buy = (st, id) => {
  if (!R.canBuy(st, id)) return false;
  R.spend(st, R.UPGRADES[id].cost);
  if (id === 'pills') st.pills++; else st.up[id]++;
  if (id === 'pistol') st.ammo = Math.max(st.ammo, R.ammoMax(st));
  return true;
};
R.ammoMax = st => 12 + 12 * st.up.pistol;
R.buyIngredients = st => { if (st.ingredients >= 2 || !R.spend(st, R.INGREDIENT_COST)) return false; st.ingredients++; return true; };
R.buyAmmo = st => { if (st.ammo >= R.ammoMax(st) || !R.spend(st, 100)) return false; st.ammo = Math.min(R.ammoMax(st), st.ammo + 12); return true; };
R.armor = st => 1 - 0.2 * st.up.vest;
R.heal = st => { if (st.pills <= 0 || st.hp >= st.hpMax) return false; st.pills--; st.hp = Math.min(st.hpMax, st.hp + 35); return true; };

// ---- heat ---------------------------------------------------------------------------------------------------------
R.addHeat = (st, n) => { st.heat = clamp(st.heat + n, 0, 100); return st.heat; };
R.decayHeat = (st, dt, hidden) => { st.heat = clamp(st.heat - dt * (hidden ? 4 : 0.9), 0, 100); return st.heat; };
R.heatLevel = h => h >= 80 ? 3 : h >= 55 ? 2 : h >= R.SURPLUS ? 1 : 0;
R.heatName = h => ['QUIET', 'WATCHED', 'HOT', 'MANHUNT'][R.heatLevel(h)];

// ---- the clock -----------------------------------------------------------------------------------------------------
R.clockText = m => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return (h % 12 || 12) + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
// 0 = full day, 1 = night: dusk from 18:00, dark by 21:00, light again at 6:00
R.darkness = m => { const h = (m / 60) % 24; return h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 18 ? 0 : h < 21 ? (h - 18) / 3 : 1; };
R.tick = (st, dtReal) => { st.minutes = Math.min(R.DAY_END, st.minutes + dtReal * R.MINUTES_PER_SECOND); return st.minutes >= R.DAY_END; };
R.spendMinutes = (st, n) => { st.minutes = Math.min(R.DAY_END, st.minutes + n); return st.minutes >= R.DAY_END; };

// ---- end of a day, and the ending ------------------------------------------------------------------------------
// pays the bill, resets the day's counters, drops the heat a little. Returns what happened for the report screen.
R.endDay = (st, how = 'sleep') => {
  const rep = { day: st.day, earned: st.earnedToday, sold: st.soldToday, cooks: st.cooksToday, laundered: st.launderedToday, how };
  const bill = R.BILL; let paid = 0;
  const fromClean = Math.min(st.clean, bill); st.clean -= fromClean; paid += fromClean;
  const fromDirty = Math.min(st.dirty, bill - paid); st.dirty -= fromDirty; paid += fromDirty;
  rep.bill = bill; rep.paid = paid; rep.short = bill - paid;
  st.day++; st.minutes = R.DAY_START; st.launderedToday = st.soldToday = st.cooksToday = st.earnedToday = 0;
  st.heat = Math.max(0, st.heat - 25);
  st.hp = how === 'hospital' ? st.hpMax : Math.min(st.hpMax, st.hp + 60);
  if (st.contract) { st.contract = null; rep.contractFailed = true; }
  rep.nextDay = st.day;
  if (st.day > R.LAST_DAY && !st.bossDone) st.over = st.clean >= R.GOAL ? 'late' : 'ran-out';
  return rep;
};
R.superlabOpen = st => !st.bossDone && (st.day >= R.LAST_DAY || st.clean >= R.GOAL);
R.rank = st => { const c = R.cash(st); return c >= R.GOAL * 2 ? 'KINGPIN' : c >= R.GOAL * 1.4 ? 'HEISENBERG-GRADE' : c >= R.GOAL ? 'CAPABLE COOK' : 'JUST A TEACHER'; };
R.busted = st => { const lost = st.bricks.length; st.bricks = []; const fine = Math.floor(st.dirty / 2); st.dirty -= fine; st.heat = 20; st.stats.busted++; return { bricks: lost, fine }; };
R.knockedOut = st => { const lost = Math.floor(st.dirty / 4); st.dirty -= lost; st.stats.hospital++; return { lost }; };

// the numbers an enemy hits you for, with difficulty: 0 easy, 1 normal, 2 hard
R.damage = (st, base, diff = 1) => Math.max(1, Math.round(base * [0.7, 1, 1.3][diff] * R.armor(st)));

WW.rules = R;
if (typeof module !== 'undefined') module.exports = R;
})();
