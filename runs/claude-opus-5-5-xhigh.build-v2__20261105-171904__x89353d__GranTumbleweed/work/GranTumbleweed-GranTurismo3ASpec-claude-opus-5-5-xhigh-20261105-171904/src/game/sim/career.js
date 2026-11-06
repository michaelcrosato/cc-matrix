// The career's rules, as pure functions over a plain profile. No engine, no DOM, no storage.
import { SAVE_VERSION, START_CREDITS } from '../data/meta.js';
import { CAR_INFO, DRIVER_NAMES, PHYSICS } from '../data/cars.js';
import { AI_TUNES, EVENTS, EVENT_IDS, POINTS, PRIZE_RATIO } from '../data/events.js';
import { LICENCES, TESTS } from '../data/licences.js';
import { PARTS, PAINT_PRICE, RIM_PRICE, SETUP_SLIDERS } from '../data/parts.js';
import { TYRES } from '../data/tyres.js';
import { emptyInstall, fullInstall, hasPart, oilFactor, specOf, tunedRow } from './tuning.js';

export const OIL_PRICE = 250, WASH_PRICE = 50, SELL_RATIO = 0.5;
export function newProfile() {
  return { version: SAVE_VERSION, credits: START_CREDITS, day: 1, licences: {}, tests: {}, cars: [], current: null, nextUid: 1, events: {}, trophies: [], stats: { km: 0, wins: 0, gold: 0, races: 0, lapsLed: 0 }, seen: {}, records: {}, ghosts: {}, replays: [null, null, null], greeted: false, ended: false };
}
// Migrations: every old version steps up to the next.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return newProfile();
  const p = { ...raw };
  p.version = p.version ?? 1;
  if (p.version < 2) { // version 1 kept one current car id and no ghosts or replay slots
    p.ghosts = p.ghosts ?? {}; p.replays = p.replays ?? [null, null, null]; p.seen = p.seen ?? {};
    for (const c of p.cars ?? []) { c.install = { ...emptyInstall(), ...(c.install ?? {}) }; c.dirt = c.dirt ?? 0; c.oilChanged = c.oilChanged ?? false; }
    p.version = 2;
  }
  return p;
}
export const carEntry = (profile, uid = profile.current) => profile.cars.find((c) => c.uid === uid) ?? null;
export function addCar(profile, carId, { prize = false, paint = null } = {}) {
  const car = { uid: profile.nextUid++, carId, install: emptyInstall(), km: 0, kmOil: 0, oilChanged: false, dirt: 0, prize, wash: 0 };
  car.install.paint = paint ?? CAR_INFO[carId].paint;
  profile.cars.push(car); profile.seen[carId] = true;
  if (profile.current === null) profile.current = car.uid;
  return car;
}
export function carPriceOpen(profile, carId) {
  const i = CAR_INFO[carId];
  if (!i.price) return false;
  if (i.after && !profile.licences[i.after]) return false;
  return true;
}
export function buyCar(profile, carId) {
  const i = CAR_INFO[carId];
  if (!carPriceOpen(profile, carId)) return { ok: false, why: i.after ? 'licence' : 'prize' };
  if (profile.credits < i.price) return { ok: false, why: 'money' };
  profile.credits -= i.price;
  const car = addCar(profile, carId, { paint: i.paint });
  profile.current = car.uid;
  return { ok: true, car };
}
export const sellValue = (car) => Math.round((CAR_INFO[car.carId].price || 0) * SELL_RATIO);
export function sellCar(profile, uid) {
  const car = carEntry(profile, uid);
  if (!car) return { ok: false, why: 'none' };
  if (car.prize) return { ok: false, why: 'prize' };
  if (profile.cars.length <= 1) return { ok: false, why: 'last' };
  profile.credits += sellValue(car);
  profile.cars = profile.cars.filter((c) => c.uid !== uid);
  if (profile.current === uid) profile.current = profile.cars[0].uid;
  return { ok: true };
}
export function setCurrent(profile, uid) { if (carEntry(profile, uid)) profile.current = uid; }

// ---- Tuning Street ----
export function partState(car, partId) {
  const owned = car.install.owned.includes(partId);
  return { owned, on: hasPart(car.install, partId) };
}
export function buyPart(profile, car, partId) {
  const part = PARTS[partId];
  if (!part) return { ok: false, why: 'none' };
  if (car.install.owned.includes(partId)) {
    if (!part.group) return { ok: false, why: 'owned' };
    car.install.on[part.group] = car.install.on[part.group] === partId ? null : partId; // owned: a free swap, or back to stock
    return { ok: true, swapped: true };
  }
  if (profile.credits < part.price) return { ok: false, why: 'money' };
  profile.credits -= part.price;
  car.install.owned.push(partId);
  if (part.group) car.install.on[part.group] = partId;
  return { ok: true };
}
export function buyTyre(profile, car, tyreId) {
  const t = TYRES[tyreId];
  if (!t) return { ok: false, why: 'none' };
  if (car.install.tyres.includes(tyreId)) { car.install.tyre = car.install.tyre === tyreId ? null : tyreId; return { ok: true, swapped: true }; }
  if (profile.credits < t.price) return { ok: false, why: 'money' };
  profile.credits -= t.price;
  car.install.tyres.push(tyreId); car.install.tyre = tyreId;
  return { ok: true };
}
export function buyPaint(profile, car, colour) {
  if (car.install.paint === colour) return { ok: false, why: 'owned' };
  if (profile.credits < PAINT_PRICE) return { ok: false, why: 'money' };
  profile.credits -= PAINT_PRICE; car.install.paint = colour;
  return { ok: true };
}
export function buyRims(profile, car, style) {
  if (car.install.rims === style) return { ok: false, why: 'owned' };
  if (profile.credits < RIM_PRICE) return { ok: false, why: 'money' };
  profile.credits -= RIM_PRICE; car.install.rims = style;
  return { ok: true };
}
export function setSetup(car, id, value) {
  const s = SETUP_SLIDERS.find((x) => x.id === id);
  car.install.setup[id] = Math.max(s.min, Math.min(s.max, Math.round(value / s.step) * s.step));
}
// ---- Service Bay ----
export const oilOf = (car) => oilFactor(car.kmOil, car.oilChanged);
export function changeOil(profile, car) {
  if (profile.credits < OIL_PRICE) return { ok: false, why: 'money' };
  profile.credits -= OIL_PRICE; car.kmOil = 0; car.oilChanged = true;
  return { ok: true };
}
export function washCar(profile, car) {
  if (profile.credits < WASH_PRICE) return { ok: false, why: 'money' };
  profile.credits -= WASH_PRICE; car.dirt = 0; car.wash = (car.wash ?? 0) + 1;
  return { ok: true };
}
export function driveCar(profile, car, metres, dirtMetres = 0) {
  const km = metres / 1000;
  car.km += km; car.kmOil += km; profile.stats.km += km;
  car.dirt = Math.min(1, car.dirt + (dirtMetres / 1000) * 0.2);
}
// ---- Licences ----
export const MEDAL_RANK = { gold: 3, silver: 2, bronze: 1 };
export function medalFor(test, time) {
  const m = test.medals;
  if (!m) return null;
  return time <= m.gold ? 'gold' : time <= m.silver ? 'silver' : time <= m.bronze ? 'bronze' : null;
}
export function licenceOpen(profile, licId) { const l = LICENCES[licId]; return !l.needs || !!profile.licences[l.needs]; }
export function testRecord(profile, id) { return (profile.tests[id] ??= { medal: null, best: null, fails: 0 }); }
export function recordFailure(profile, id) { const r = testRecord(profile, id); r.fails++; return r.fails; }
// A finished attempt. Returns what changed: { medal, improved, licenceWon, allGold, reward }.
export function recordTest(profile, id, time) {
  const test = TESTS[id], rec = testRecord(profile, id), medal = medalFor(test, time), out = { medal, improved: false, licenceWon: false, allGold: false, reward: 0 };
  if (rec.best === null || time < rec.best) rec.best = time;
  if (!medal) { rec.fails++; return out; }
  rec.fails = 0;
  if ((MEDAL_RANK[medal] ?? 0) > (MEDAL_RANK[rec.medal] ?? 0)) {
    if (medal === 'gold') profile.stats.gold++;
    rec.medal = medal; out.improved = true;
  }
  const lic = LICENCES[test.licence], medals = lic.tests.map((t) => profile.tests[t]?.medal);
  if (!profile.licences[lic.id] && medals.every(Boolean)) {
    profile.licences[lic.id] = true; profile.credits += lic.reward; out.licenceWon = true; out.reward = lic.reward;
    profile.trophies.push({ kind: 'licence', id: lic.id });
  }
  const goldKey = `gold${lic.id}`;
  if (medals.every((m) => m === 'gold') && !profile[goldKey]) {
    profile[goldKey] = true; out.allGold = true;
    if (lic.allGold.car) { const c = addCar(profile, lic.allGold.car, { prize: true }); out.prizeCar = c.carId; }
    if (lic.allGold.credits) { profile.credits += lic.allGold.credits; out.reward += lic.allGold.credits; }
    if (lic.allGold.helmet) profile.trophies.push({ kind: 'helmet', id: lic.id });
  }
  return out;
}
export const licenceTier = (profile) => (profile.licences.A ? 'A' : profile.licences.B ? 'B' : profile.licences.C ? 'C' : null);
// ---- Events ----
export function eventState(profile, id) { return (profile.events[id] ??= { round: 0, points: {}, legs: 0, done: false, won: false, wins: 0 }); }
export function eventOpen(profile, id) {
  const e = EVENTS[id], missing = e.needs.find((l) => !profile.licences[l]);
  if (missing) return { ok: false, why: `NEEDS THE ${LICENCES[missing].name} LICENCE` };
  if (e.needsAny && !e.needsAny.some((x) => profile.events[x]?.won)) return { ok: false, why: e.needsAnyWhy };
  return { ok: true };
}
export function eligible(event, carId, install) {
  const s = specOf(carId, install), l = event.limit ?? {};
  if (l.maxPS && s.ps > l.maxPS) return { ok: false, why: `${s.ps} PS. THE LIMIT IS ${l.maxPS}` };
  if (l.maxKg && s.kg > l.maxKg) return { ok: false, why: `${s.kg} KG. THE LIMIT IS ${l.maxKg}` };
  if (l.layout && !l.layout.includes(s.layout)) return { ok: false, why: `THIS EVENT WANTS ${l.layout.join(' OR ')}` };
  return { ok: true };
}
// The roster stays the same for all of an event's rounds. Skills rise from the front of the grid.
export function eventRoster(id) {
  const e = EVENTS[id], out = [], n = e.field - 1;
  if (e.grid) return e.grid.map(([carId, tune, skill], i) => ({ name: DRIVER_NAMES[(id.length * 2 + i * 3) % DRIVER_NAMES.length], carId, tune, skill }));
  let hash = 0; for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < n; i++) {
    const pick = e.pool[(hash + i) % e.pool.length], [carId, tune] = Array.isArray(pick) ? pick : [pick, null];
    const base = n > 1 ? e.pace[0] + ((e.pace[1] - e.pace[0]) * i) / (n - 1) : e.pace[1];
    out.push({ name: DRIVER_NAMES[(hash + i * 3) % DRIVER_NAMES.length], carId, tune, skill: base });
  }
  return out;
}
export const aiInstall = (tune) => (tune ? fullInstall(AI_TUNES[tune].parts, AI_TUNES[tune].tyre) : null);
// A rally round: one rival per leg, faster each leg.
export function rallyRival(id, round) {
  const e = EVENTS[id], [carId, skill] = e.rivals[Math.min(round, e.rivals.length - 1)];
  return { name: DRIVER_NAMES[(5 + round * 3) % DRIVER_NAMES.length], carId, tune: null, skill };
}
// One finished round. order: names from first to last, playerName among them. Returns what was paid.
export function recordRound(profile, id, order, playerName = 'YOU', mult = 1) {
  const e = EVENTS[id], st = eventState(profile, id), pos = order.indexOf(playerName), prize = pos >= 0 && pos < PRIZE_RATIO.length ? Math.round(e.prize * PRIZE_RATIO[pos] * mult) : 0, out = { pos: pos + 1, prize, points: 0, seriesDone: false, seriesWon: false, bonus: 0, prizeCar: null, ending: false };
  order.forEach((name, i) => { st.points[name] = (st.points[name] ?? 0) + (POINTS[i] ?? 0); });
  out.points = POINTS[pos] ?? 0;
  profile.credits += prize; profile.day++; profile.stats.races++;
  if (pos === 0) { profile.stats.wins++; st.wins++; }
  if (e.rally && pos === 0) st.legs++;
  st.round++;
  if (st.round >= e.rounds.length) {
    out.seriesDone = true;
    const mine = st.points[playerName] ?? 0, won = e.rally ? st.legs >= Math.ceil(e.rounds.length / 2) + (e.rounds.length % 2 ? 0 : 1) - 0 : Object.entries(st.points).every(([n, v]) => n === playerName || v <= mine);
    out.seriesWon = won;
    st.done = true;
    if (won) {
      const first = !st.won;
      st.won = true;
      if (first) {
        profile.credits += Math.round(e.bonus * mult); out.bonus = Math.round(e.bonus * mult);
        if (e.prizeCar) { const c = addCar(profile, e.prizeCar, { prize: true }); out.prizeCar = c.carId; }
        profile.trophies.push({ kind: 'cup', id });
        if (e.ending) { profile.ended = true; out.ending = true; }
      }
    }
    st.round = 0; st.points = {}; st.legs = 0; // the event may be run again
  }
  return out;
}
export const standingsOf = (profile, id) => Object.entries(eventState(profile, id).points).sort((a, b) => b[1] - a[1]);
// Records: a lap time per track, kept per profile.
export function recordLap(profile, trackId, seconds, carId) {
  const r = profile.records[trackId];
  if (!r || seconds < r.lap) { profile.records[trackId] = { lap: seconds, carId, day: profile.day }; return true; }
  return false;
}
export function collectedShare(profile) {
  const ids = new Set(profile.cars.map((c) => c.carId));
  return Math.round((ids.size / Object.keys(CAR_INFO).length) * 100);
}
// What to try next: one line for the Map.
export function nudge(profile) {
  if (!profile.cars.length) return { to: 'dealer', text: 'DEALER ROW HAS THREE USED CARS YOU CAN AFFORD.' };
  if (!profile.licences.C) {
    const next = LICENCES.C.tests.find((t) => !profile.tests[t]?.medal);
    return { to: 'licence', text: `THE LICENCE CENTRE IS EXPECTING YOU. TEST ${next}.` };
  }
  const dawn = profile.events.dawn;
  if (!dawn?.won && !dawn?.round) return { to: 'events', text: 'THE DAWN PATROL CUP IS OPEN. IT IS YOUR FIRST RACE.' };
  const cur = EVENT_IDS.find((id) => profile.events[id]?.round > 0);
  if (cur) return { to: 'events', text: `${EVENTS[cur].name}: ROUND ${profile.events[cur].round + 1} OF ${EVENTS[cur].rounds.length} AWAITS.` };
  const car = carEntry(profile);
  if (car && car.kmOil > 240) return { to: 'service', text: 'BENNO HAS BEEN ASKING ABOUT YOUR OIL.' };
  if (!profile.licences.B) return { to: 'licence', text: 'THE CLUB LICENCE OPENS FOUR MORE EVENTS.' };
  if (!profile.events.clay?.won) return { to: 'events', text: 'THE RED CLAY RALLY IS OPEN. THE PRIZE IS A CAR.' };
  if (!profile.licences.A) return { to: 'licence', text: 'THE NATIONAL LICENCE IS THE LAST ONE.' };
  if (!profile.events.h200?.won && !profile.events.touring?.won) return { to: 'events', text: 'THE TOURING TROPHY AND THE HARBOUR LIGHTS 200 ARE OPEN.' };
  if (!profile.ended) return { to: 'events', text: 'THE HALCYON GRAND PRIX IS OPEN. THE PENINSULA IS CLOSED FOR IT.' };
  return { to: 'garage', text: 'YOU MAY KEEP DRIVING. MOST PEOPLE DO.' };
}
