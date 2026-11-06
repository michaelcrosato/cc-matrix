// Pure career rules: money, licences, events, prizes, oil, days. No engine, no DOM. Plan section 6.
import { CAR_INFO, USED_LOT } from '../data/cars.js';
import { TESTS, LICENCES, testById, testsOf } from '../data/licences.js';
import { EVENTS, eventById, PRIZE_RATIO } from '../data/events.js';
import { MEDALS } from '../data/medals.js';
import { defaultInstall, displayStats } from './tuning.js';
import { POS_POINTS } from './race.js';
import { OIL_PRICE, WASH_PRICE, PARTS, TYRES, PAINT_PRICE, RIM_PRICE } from '../data/tyres_parts.js';
import { VERSION } from '../data/meta.js';
export const defaultSettings = () => ({ glyphs: 'ps', vibration: true, steerResponse: 1, mouseSteer: false, units: 'kmh', abs: true, tcs: 5, asm: 5, auto: true, line: false, look: 'none', pixelSize: 'fine', voices: 0.8, musicOn: true, quality: 'auto', fps: 60 });
export function newProfile() {
  return { v: VERSION, credits: 15000, day: 1, km: 0, cars: [], current: null, nextUid: 1, licences: {}, events: {}, wonEvents: [], stats: { races: 0, wins: 0, golds: 0, podiums: 0 }, trophies: [], seen: {}, records: {}, settings: defaultSettings(), started: false, ending: false, ghosts: {}, flags: {}, helmet: false };
}
export function migrate(p) {
  if (!p || typeof p !== 'object') return newProfile(); const n = { ...newProfile(), ...p }; n.settings = { ...defaultSettings(), ...(p.settings ?? {}) }; n.stats = { ...newProfile().stats, ...(p.stats ?? {}) };
  if ((p.v ?? 0) < 1) { n.v = 1; } n.v = VERSION; return n;
}
export const uidCar = (p, uid) => p.cars.find((c) => c.uid === uid);
export const currentCar = (p) => uidCar(p, p.current) ?? p.cars[0] ?? null;
export function giveCar(p, carId, { prize = false, price = 0 } = {}) { const c = { uid: p.nextUid++, carId, install: defaultInstall(), km: 0, oilKm: 0, dirt: 0, prize, price, boughtDay: p.day }; p.cars.push(c); p.seen[carId] = true; if (!p.current) p.current = c.uid; return c; }
export function canBuy(p, carId) { const i = CAR_INFO[carId]; if (i.prize && !i.price) return { ok: false, why: 'A PRIZE CAR. IT CANNOT BE BOUGHT.' }; if (i.needLicence && !hasLicence(p, i.needLicence)) return { ok: false, why: 'REQUIRES LICENCE ' + i.needLicence + '.' }; if (p.credits < i.price) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; return { ok: true }; }
export function buyCar(p, carId) { const c = canBuy(p, carId); if (!c.ok) return c; p.credits -= CAR_INFO[carId].price; const car = giveCar(p, carId, { price: CAR_INFO[carId].price }); p.current = car.uid; p.started = true; return { ok: true, car }; }
export function sellValue(car) { return Math.round((car.price ?? CAR_INFO[car.carId].price) * 0.5); }
export function canSell(p, uid) { const c = uidCar(p, uid); if (!c) return { ok: false, why: 'NO SUCH CAR.' }; if (c.prize) return { ok: false, why: 'PRIZE CARS ARE NOT FOR SALE. IT IS SIMPLY NOT DONE.' }; if (p.cars.length <= 1) return { ok: false, why: 'YOU CANNOT SELL YOUR LAST CAR.' }; return { ok: true }; }
export function sellCar(p, uid) { const c = canSell(p, uid); if (!c.ok) return c; const car = uidCar(p, uid); p.credits += sellValue(car); p.cars = p.cars.filter((x) => x.uid !== uid); if (p.current === uid) p.current = p.cars[0].uid; return { ok: true, got: sellValue(car) }; }
export function buyPart(p, uid, id, tinst) { const car = uidCar(p, uid), part = PARTS[id]; if (!car || !part) return { ok: false, why: 'NO SUCH PART.' }; if (car.install.parts.includes(id)) return { ok: false, why: 'ALREADY FITTED.' }; if (p.credits < part.price) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= part.price; car.install = tinst(car.install, id); return { ok: true }; }
export function buyTyre(p, uid, id) { const car = uidCar(p, uid), t = TYRES[id]; if (car.install.tyre === id) return { ok: false, why: 'ALREADY FITTED.' }; if (p.credits < t.price) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= t.price; car.install.tyre = id; return { ok: true }; }
export function buyPaint(p, uid, colour) { const car = uidCar(p, uid); if (car.install.paint === colour) return { ok: false, why: 'ALREADY THAT COLOUR.' }; if (p.credits < PAINT_PRICE) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= PAINT_PRICE; car.install.paint = colour; return { ok: true }; }
export function buyRims(p, uid, n) { const car = uidCar(p, uid); if ((car.install.rims ?? 0) === n) return { ok: false, why: 'ALREADY FITTED.' }; if (p.credits < RIM_PRICE) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= RIM_PRICE; car.install.rims = n; return { ok: true }; }
export function oilFactor(car) { const k = car.oilKm ?? 0; if (k < 100) return 1.02; if (k <= 200) return 1; return 1 - Math.min(0.08, Math.floor((k - 200) / 40) * 0.005); }
export function oilChange(p, uid) { const car = uidCar(p, uid); if (p.credits < OIL_PRICE) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= OIL_PRICE; car.oilKm = 0; return { ok: true }; }
export function carWash(p, uid) { const car = uidCar(p, uid); if (p.credits < WASH_PRICE) return { ok: false, why: 'NOT ENOUGH CREDITS.' }; p.credits -= WASH_PRICE; car.dirt = 0; return { ok: true }; }
// ---- licences ----
export const medalRank = (m) => ({ gold: 3, silver: 2, bronze: 1 }[m] ?? 0);
export function medalFor(testId, time) { const m = MEDALS[testId]; if (!m || time == null) return null; return time <= m.gold ? 'gold' : time <= m.silver ? 'silver' : time <= m.bronze ? 'bronze' : null; }
export const hasLicence = (p, lic) => testsOf(lic).every((t) => medalRank(p.licences[t.id]?.medal) >= 1);
export const licenceGold = (p, lic) => testsOf(lic).every((t) => medalRank(p.licences[t.id]?.medal) >= 3);
export function licenceUnlocked(p, lic) { const n = LICENCES[lic].needs; return !n || hasLicence(p, n); }
export function recordTest(p, testId, time) {
  const t = testById(testId), medal = medalFor(testId, time), rec = p.licences[testId] ?? { medal: null, best: null }, out = { medal, newMedal: false, licenceWon: null, goldAll: false, reward: 0 };
  if (medalRank(medal) > medalRank(rec.medal)) { rec.medal = medal; out.newMedal = true; if (medal === 'gold') p.stats.golds++; }
  if (rec.best == null || (time != null && time < rec.best)) rec.best = time; p.licences[testId] = rec; const lic = t.lic;
  if (hasLicence(p, lic) && !p.flags['lic' + lic]) { p.flags['lic' + lic] = true; p.credits += LICENCES[lic].reward; out.licenceWon = lic; out.reward = LICENCES[lic].reward; }
  if (licenceGold(p, lic) && !p.flags['gold' + lic]) { p.flags['gold' + lic] = true; out.goldAll = true; const L = LICENCES[lic]; if (L.prize) { giveCar(p, L.prize, { prize: true }); out.prizeCar = L.prize; } if (L.prizeCredits) { p.credits += L.prizeCredits; out.prizeCredits = L.prizeCredits; } if (L.prizeNote) { p.helmet = true; p.trophies.push({ kind: 'helmet', name: 'GOLD HELMET', day: p.day }); } }
  return out;
}
export function nextMedalGap(testId, time) { const m = MEDALS[testId]; if (!m) return null; const r = medalFor(testId, time); const next = r === 'gold' ? null : r === 'silver' ? ['gold', m.gold] : r === 'bronze' ? ['silver', m.silver] : ['bronze', m.bronze]; return next ? { medal: next[0], gap: time - next[1] } : null; }
// ---- events ----
export function qualifies(carId, install, restrict) { const s = displayStats(carId, install), info = CAR_INFO[carId]; const lay = (carId && require_layout(carId)); if (restrict.maxPS && s.ps > restrict.maxPS) return { ok: false, why: 'OVER ' + restrict.maxPS + ' PS (' + s.ps + ').' }; if (restrict.maxKg && s.kg > restrict.maxKg) return { ok: false, why: 'OVER ' + restrict.maxKg + ' KG (' + s.kg + ').' }; if (restrict.layouts && !restrict.layouts.includes(lay)) return { ok: false, why: 'LAYOUT MUST BE ' + restrict.layouts.join(' OR ') + '.' }; return { ok: true }; }
import { PHYS_ROWS } from '../data/cars.js';
function require_layout(id) { const l = PHYS_ROWS[id].layout; return l === '4WD' ? '4WD' : l; }
export const carLayout = require_layout;
export function eventLocked(p, ev) { if (!hasLicence(p, ev.needs)) return 'NEEDS LICENCE ' + ev.needs + '.'; if (ev.needsWin && !ev.needsWin.some((id) => p.wonEvents.includes(id))) return 'WIN THE TOURING TROPHY OR HARBOUR LIGHTS 200 FIRST.'; return null; }
export const eventState = (p, id) => p.events[id] ?? { round: 0, points: 0, results: [] };
export function startEvent(p, id) { p.events[id] = { round: 0, points: 0, results: [], started: true }; }
export function prizeMoney(ev, pos, multiplier = 1) { return pos <= 4 ? Math.round(ev.prize * PRIZE_RATIO[pos - 1] * multiplier) : 0; }
export function recordRound(p, ev, pos, mult = 1, kmDriven = 0, dirt = 0) {
  const st = p.events[ev.id] ?? (p.events[ev.id] = { round: 0, points: 0, results: [] }), money = prizeMoney(ev, pos, mult), pts = POS_POINTS[pos - 1] ?? 0;
  st.round++; st.points += pts; st.results.push(pos); p.credits += money; p.day++; p.stats.races++; if (pos === 1) p.stats.wins++; if (pos <= 3) p.stats.podiums++;
  const car = currentCar(p); if (car) { car.km += kmDriven; car.oilKm += kmDriven; car.dirt = Math.min(1, (car.dirt ?? 0) + dirt); } p.km += kmDriven;
  return { money, pts, done: st.round >= ev.rounds.length };
}
export function finishSeries(p, ev, rivalPoints) { // winner = most points; ties go to the player's better result
  const st = p.events[ev.id], best = Math.max(...rivalPoints, 0), won = st.points > best || (st.points === best && st.results.filter((x) => x === 1).length > 0 && best <= st.points); const out = { won, bonus: 0, prizeCar: null };
  if (won && !p.wonEvents.includes(ev.id)) { p.wonEvents.push(ev.id); p.credits += ev.bonus; out.bonus = ev.bonus; if (ev.prizeCar) { giveCar(p, ev.prizeCar, { prize: true }); out.prizeCar = ev.prizeCar; } p.trophies.push({ kind: 'cup', name: ev.name, day: p.day, ev: ev.id }); if (ev.ending) { p.ending = true; } }
  st.complete = true; st.won = won; return out;
}
export const totalCollected = (p) => Math.round((new Set(p.cars.map((c) => c.carId)).size / Object.keys(CAR_INFO).length) * 100);
export function nudge(p) { // the one-line suggestion on the map
  if (!p.cars.length) return 'VISIT DEALER ROW. THREE USED CARS CAN BE AFFORDED.';
  if (!hasLicence(p, 'C')) return 'THE LICENCE CENTRE HAS A TEST FOR YOU. IT TAKES FIFTEEN SECONDS.';
  if (!p.stats.races) return 'LICENCE C IS YOURS. THE EVENT HALL HAS A CUP.';
  if (!hasLicence(p, 'B')) return 'LICENCE B AWAITS. THE LICENCE CENTRE IS OPEN.';
  if (!p.wonEvents.length) return 'WIN A SERIES AT THE EVENT HALL. TUNING STREET HAS PARTS.';
  if (!hasLicence(p, 'A')) return 'LICENCE A IS THE LAST ONE. IT IS ALSO THE HARDEST.';
  if (!p.ending) return 'THE GRAND PRIX IS WAITING. THE TYPE 9 IS IN A SHED.';
  return 'YOU MAY KEEP DRIVING. MOST PEOPLE DO.';
}
