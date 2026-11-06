// Pure rules of the career: money, licences, events, prizes, oil, days. No engine, no DOM.
import { CARS, CAR_LIST } from '../data/cars.js';
import { PART, PAINT_PRICE, RIM_PRICE, OIL_PRICE, WASH_PRICE, SETTINGS } from '../data/parts.js';
import { TYRE } from '../data/tyres.js';
import { LICENCES, LICENCE, TEST } from '../data/licences.js';
import { EVENT, EVENTS, POINTS, PRIZE_RATIO } from '../data/events.js';
import { STARTING_CREDITS, PROFILE_VERSION } from '../data/meta.js';
import { specOf, emptyInstall } from './tuning.js';

export function newProfile() {
  return { v: PROFILE_VERSION, credits: STARTING_CREDITS, day: 1, cars: [], current: null, nextUid: 1, tests: {}, licences: {}, events: {}, seen: {}, trophies: [], assists: { abs: true, tcs: 5, asm: 5, auto: true, line: false }, records: {}, stats: { km: 0, wins: 0, races: 0, golds: 0, spent: 0, earned: 0 }, greeted: false, ended: false, replays: [], ghosts: {}, failStreak: {} };
}
/** Older saves move forward one version at a time. */
export function migrate(p) {
  if (!p || typeof p !== 'object') return newProfile();
  if (!p.v || p.v < 2) { p.seen ??= {}; p.trophies ??= []; p.v = 2; }
  if (p.v < 3) { p.replays ??= []; p.ghosts ??= {}; p.failStreak ??= {}; for (const c of p.cars ?? []) { c.dirt ??= 0; c.oilKm ??= 0; c.install ??= emptyInstall(); } p.v = 3; }
  return p;
}
export const carRec = (p, uid = p.current) => p.cars.find((c) => c.uid === uid) ?? null;
export const hasCar = (p, id) => p.cars.some((c) => c.id === id);
function giveCar(p, id, bought) {
  const rec = { uid: p.nextUid++, id, install: emptyInstall(), km: bought ? 40000 + (id.length * 7919) % 50000 : 0, oilKm: bought && CARS[id].where === 'used' ? 900 : 0, dirt: 0, wins: 0, prize: !bought };
  if (CARS[id].where !== 'used') rec.km = bought ? 12 : 0;
  rec.install.paint = CARS[id].paint;
  p.cars.push(rec); p.seen[id] = true;
  if (p.current == null) p.current = rec.uid;
  return rec;
}
export function canBuy(p, id) {
  const c = CARS[id];
  if (!c.price) return { ok: false, why: 'NOT FOR SALE' };
  if (c.afterA && !p.licences.A) return { ok: false, why: 'LICENCE A REQUIRED' };
  if (p.credits < c.price) return { ok: false, why: 'NOT ENOUGH CREDITS' };
  return { ok: true };
}
export function buyCar(p, id) { const can = canBuy(p, id); if (!can.ok) return null; p.credits -= CARS[id].price; p.stats.spent += CARS[id].price; const rec = giveCar(p, id, true); p.current = rec.uid; return rec; }
export function canSell(p, uid) {
  const r = carRec(p, uid);
  if (!r) return { ok: false, why: 'NO SUCH CAR' };
  if (p.cars.length <= 1) return { ok: false, why: 'YOUR LAST CAR. THEN WHAT?' };
  if (r.prize) return { ok: false, why: 'PRIZE CARS ARE NOT FOR SALE. IT IS SIMPLY NOT DONE.' };
  return { ok: true, value: Math.floor(CARS[r.id].price / 2) };
}
export function sellCar(p, uid) { const can = canSell(p, uid); if (!can.ok) return 0; p.credits += can.value; p.cars = p.cars.filter((c) => c.uid !== uid); if (p.current === uid) p.current = p.cars[0].uid; return can.value; }

// ---- parts
export function partOwned(rec, part) { const v = rec.install.parts[part.slot]; return part.level === v; }
export function partSuperseded(rec, part) { const v = rec.install.parts[part.slot]; return !!v && v > part.level; }
export function canBuyPart(p, rec, part) {
  if (partOwned(rec, part)) return { ok: false, why: 'FITTED' };
  if (p.credits < part.price) return { ok: false, why: 'NOT ENOUGH CREDITS' };
  return { ok: true };
}
export function buyPart(p, rec, partId) {
  const part = PART[partId], can = canBuyPart(p, rec, part);
  if (!can.ok) return false;
  p.credits -= part.price; p.stats.spent += part.price; rec.install.parts[part.slot] = part.level;
  for (const s of SETTINGS) if (s.needs(rec.install.parts) && rec.install.settings[s.id] == null) rec.install.settings[s.id] = s.id === 'balance' ? CARS[rec.id].phys.rollF ?? s.def : s.def;
  return true;
}
export function buyTyre(p, rec, id) { const t = TYRE[id]; if (rec.install.tyre === id || p.credits < t.price) return false; p.credits -= t.price; p.stats.spent += t.price; rec.install.tyre = id; return true; }
export function buyPaint(p, rec, colour) { if (p.credits < PAINT_PRICE || rec.install.paint === colour) return false; p.credits -= PAINT_PRICE; p.stats.spent += PAINT_PRICE; rec.install.paint = colour; return true; }
export function buyRims(p, rec, id) { if (p.credits < RIM_PRICE || rec.install.rims === id) return false; p.credits -= RIM_PRICE; p.stats.spent += RIM_PRICE; rec.install.rims = id; return true; }

// ---- service
export function oilFactor(rec) {
  const km = rec?.oilKm ?? 0;
  if (km < 100 && rec?.oilFresh) return 1.02;
  if (km <= 200) return 1;
  return Math.max(0.92, 1 - Math.floor((km - 200) / 40) * 0.005);
}
export function changeOil(p, rec) { if (p.credits < OIL_PRICE) return false; p.credits -= OIL_PRICE; p.stats.spent += OIL_PRICE; rec.oilKm = 0; rec.oilFresh = true; return true; }
export function washCar(p, rec) { if (p.credits < WASH_PRICE) return false; p.credits -= WASH_PRICE; p.stats.spent += WASH_PRICE; rec.dirt = 0; return true; }
export function addMileage(p, rec, metres, dirtGain = 0) { const km = metres / 1000; p.stats.km += km; if (rec) { rec.km += km; rec.oilKm += km; rec.dirt = Math.min(1, rec.dirt + dirtGain); } }

// ---- licences
export const licenceOrder = ['C', 'B', 'A'];
export const licenceHeld = (p, id) => !!p.licences[id];
export const licenceOpen = (p, id) => id === 'C' || licenceHeld(p, licenceOrder[licenceOrder.indexOf(id) - 1]);
export const medalName = (m) => [null, 'BRONZE', 'SILVER', 'GOLD'][m];
export function medalFor(test, time) { const m = test.medals; if (!m) return 0; return time <= m.gold ? 3 : time <= m.silver ? 2 : time <= m.bronze ? 1 : 0; }
/** Record an attempt; returns what happened so the screens can say it. */
export function applyTest(p, testId, time, failed = false, dev = false) {
  const test = TEST[testId], medal = failed ? 0 : medalFor(test, time), out = { medal, licenceWon: null, reward: 0, goldBonus: null, newBest: false };
  if (medal === 0) { p.failStreak[testId] = (p.failStreak[testId] ?? 0) + 1; return out; }
  p.failStreak[testId] = 0;
  if (dev) return out;
  const prev = p.tests[testId] ?? { medal: 0, time: Infinity };
  if (medal === 3 && prev.medal < 3) p.stats.golds++;
  if (medal > prev.medal || time < prev.time) out.newBest = true;
  p.tests[testId] = { medal: Math.max(prev.medal, medal), time: Math.min(prev.time, time) };
  const lic = LICENCE[testId[0]];
  if (!p.licences[lic.id] && lic.tests.every((t) => p.tests[t]?.medal >= 1)) { p.licences[lic.id] = true; p.credits += lic.reward; p.stats.earned += lic.reward; out.licenceWon = lic.id; out.reward = lic.reward; }
  if (p.licences[lic.id] && !p.goldDone?.[lic.id] && lic.tests.every((t) => p.tests[t]?.medal === 3)) {
    (p.goldDone ??= {})[lic.id] = true; out.goldBonus = lic.id;
    if (lic.goldCar && !hasCar(p, lic.goldCar)) giveCar(p, lic.goldCar, false);
    if (lic.goldCredits) { p.credits += lic.goldCredits; p.stats.earned += lic.goldCredits; }
    if (lic.goldHelmet) p.trophies.push({ kind: 'helmet', name: `GOLD HELMET`, day: p.day });
  }
  return out;
}

// ---- events
export function eventOpen(p, id) {
  const e = EVENT[id];
  if (!p.licences[e.needs]) return { ok: false, why: `LICENCE ${e.needs} REQUIRED` };
  if (e.needsEvent && !e.needsEvent.some((x) => p.events[x]?.won)) return { ok: false, why: 'WIN THE TOURING TROPHY OR THE HARBOUR 200' };
  return { ok: true };
}
export function carQualifies(e, carId, install) {
  const s = specOf(carId, install), l = e.limit;
  if (l.maxPS && s.ps > l.maxPS) return { ok: false, why: `${s.ps} PS. THE LIMIT IS ${l.maxPS}.` };
  if (l.maxKg && s.kg > l.maxKg) return { ok: false, why: `${s.kg} KG. THE LIMIT IS ${l.maxKg}.` };
  if (l.layout && s.layout !== l.layout) return { ok: false, why: `THIS EVENT IS FOR ${l.layout} CARS ONLY.` };
  return { ok: true };
}
export const eventState = (p, id) => (p.events[id] ??= { round: 0, points: {}, won: false, wins: 0, best: null });
/** results: [{ key, name, player }] in finishing order. Returns the money and the state of the series. */
export function applyRound(p, eventId, results, prizeScale = 1) {
  const e = EVENT[eventId], st = eventState(p, eventId), out = { place: 0, money: 0, points: 0, seriesOver: false, seriesWon: false, bonus: 0, prizeCar: null, standings: [], ending: false };
  results.forEach((r, i) => { const pts = POINTS[i] ?? 0; st.points[r.key] = (st.points[r.key] ?? 0) + pts; if (r.player) { out.place = i + 1; out.points = pts; } });
  out.money = Math.round(((PRIZE_RATIO[out.place - 1] ?? 0) * e.prize * prizeScale) / 10) * 10;
  p.credits += out.money; p.stats.earned += out.money; p.stats.races++; p.day++;
  if (out.place === 1) p.stats.wins++;
  st.round++;
  out.standings = Object.entries(st.points).sort((a, b) => b[1] - a[1]);
  if (st.round >= e.rounds.length) {
    out.seriesOver = true;
    const my = st.points.player ?? 0, top = Math.max(...Object.entries(st.points).filter(([k]) => k !== 'player').map(([, v]) => v), 0);
    out.seriesWon = my > top;
    if (out.seriesWon) {
      const first = !st.won;
      st.won = true; st.wins = (st.wins ?? 0) + 1; out.bonus = Math.round(e.bonus * prizeScale); p.credits += out.bonus; p.stats.earned += out.bonus;
      if (e.prizeCar && first && !hasCar(p, e.prizeCar)) { giveCar(p, e.prizeCar, false); out.prizeCar = e.prizeCar; }
      p.trophies.push({ kind: 'cup', name: e.name, day: p.day });
      if (e.ending && first) { out.ending = true; p.ended = true; }
    }
    st.round = 0; st.points = {};
  }
  return out;
}
export function resetEvent(p, id) { const st = eventState(p, id); st.round = 0; st.points = {}; }

export function record(p, trackId, lap, carName) { const r = p.records[trackId]; if (!r || lap < r.lap) { p.records[trackId] = { lap, car: carName }; return true; } return false; }
/** Share of the world collected, for the Garage. */
export function collected(p) {
  const cars = new Set(p.cars.map((c) => c.id)).size, tests = Object.keys(p.tests).length, ev = EVENTS.filter((e) => p.events[e.id]?.won).length;
  return Math.round(((cars + tests + ev) / (CAR_LIST.length + 12 + EVENTS.length)) * 100);
}
/** One line saying what to try next on the Map. */
export function nudge(p) {
  if (!p.cars.length) return { place: 'dealer', text: 'FIRST, A CAR. DEALER ROW HAS THREE YOU CAN AFFORD.' };
  if (!p.licences.C) return { place: 'licence', text: 'NOW, A LICENCE. MS. ARAI IS WAITING AT THE TOWER.' };
  if (!EVENT.dawn || !p.events.dawn?.won) return { place: 'events', text: 'THE DAWN PATROL CUP WILL ACCEPT YOU. THE EVENT HALL IS OPEN.' };
  const r = carRec(p);
  if (r && r.oilKm > 300) return { place: 'service', text: 'YOUR OIL IS TIRED. BENNO HAS MENTIONED IT.' };
  if (!Object.keys(r?.install.parts ?? {}).length) return { place: 'tuning', text: 'YOU HAVE MONEY. BRAKE PADS ARE A GOOD FIRST THOUGHT.' };
  if (!p.licences.B) return { place: 'licence', text: 'THE CLUB LICENCE IS NEXT. PLEASE BRING A REAR-DRIVE ATTITUDE.' };
  if (!p.events.feather?.won && !p.events.society?.won && !p.events.clay?.won) return { place: 'events', text: 'THREE NEW EVENTS AWAIT THE CLUB LICENCE.' };
  if (!p.licences.A) return { place: 'licence', text: 'THE NATIONAL LICENCE. MS. ARAI HAS CLEARED HER AFTERNOON.' };
  if (!p.events.touring?.won && !p.events.h200?.won) return { place: 'events', text: 'THE TOURING TROPHY AND THE HARBOUR 200 ARE OPEN TO YOU.' };
  if (!p.events.gp?.won) return { place: 'events', text: 'THE GRAND PRIX. THE LIGHTS ARE ON FOR YOU NOW.' };
  return { place: 'home', text: 'YOU MAY KEEP DRIVING. MOST PEOPLE DO.' };
}
export { LICENCES, EVENTS };
