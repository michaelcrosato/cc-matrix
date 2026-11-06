// RaceSetup builders: plain objects that RaceScene and RaceSim read. Pure: no engine, no DOM.
import { tunedParams, emptyInstall } from './tuning.js';
import { EVENT, DRIVERS } from '../data/events.js';
import { TEST } from '../data/licences.js';
import { TRACKS } from '../data/tracks.js';
import { oilFactor, carRec } from './career.js';
import { CARS, PAINTS } from '../data/cars.js';
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const SEAT_COLORS = ['red', 'blue', 'green', 'sand'];
export const SEAT_HEX = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const AI_PAINT = ['slate', 'white', 'sand', 'blue', 'green', 'orange', 'teal', 'mist', 'plum', 'sky', 'navy', 'red'];
const hourOf = (track, round = {}) => round.hour ?? TRACKS[track].hour;
export function playerCar(p, seat = 0) { const r = carRec(p); return { params: tunedParams(r.id, r.install), name: 'YOU', ai: false, seat, carId: r.id, install: r.install, oil: oilFactor(r), key: 'player', color: 'lime', dirt: r.dirt, uid: r.uid }; }
export function careerRoundSetup(p, eventId) {
  const e = EVENT[eventId], st = p.events[eventId] ?? { round: 0 }, roundI = st.round ?? 0, round = e.rounds[roundI], r = rng(p.day * 131 + roundI * 17 + eventId.length * 7919), cars = [];
  const rally = !!e.rally, n = rally ? 1 : e.field ?? 7, [lo, hi] = e.pace;
  for (let i = 0; i < n; i++) {
    const [carId, install0] = e.pool[rally ? roundI % e.pool.length : Math.floor(r() * e.pool.length)], paint = AI_PAINT[(p.day + i * 3) % AI_PAINT.length], install = { ...emptyInstall(), ...(install0 ?? {}), paint }, f = rally ? (roundI + 0.5) / e.rounds.length : n === 1 ? 0.5 : i / (n - 1), name = DRIVERS[(Math.floor(p.day) + i * 5 + eventId.length) % DRIVERS.length];
    cars.push({ params: tunedParams(carId, install), name, ai: true, skill: lo + (hi - lo) * f, carId, install, key: rally ? 'rival' : `d${(eventId.length * 3 + i) % 12}`, color: 'red', startDelay: 0 });
  }
  const me = playerCar(p); cars.push(me);
  if (rally) me.startDelay = 3;
  return { mode: 'race', after: { kind: 'career', eventId, round: roundI }, track: round.track, laps: round.laps, hour: hourOf(round.track, round), hourEnd: round.hourEnd ?? null, rain: !!round.rain, start: rally ? 'stagger' : 'rolling', cars, seed: p.day * 97 + roundI, paceMid: (lo + hi) / 2, rules: { contact: !rally, wearMult: e.endurance ? 1 : 0.5, fuelMult: 1, endurance: !!e.endurance, pits: !!e.endurance }, label: `${e.name} ROUND ${roundI + 1}` };
}
export function licenceSetup(testId, run = 0, o = {}) {
  const t = TEST[testId], carId = t.runs ? t.runs[run] : t.carId, install = { ...emptyInstall(), tyre: testId[0] === 'C' ? 'street' : null };
  return { mode: o.demo ? 'demo' : 'licence', after: { kind: 'licence', testId, run, times: o.times ?? 0, demo: !!o.demo }, track: t.track, hour: t.hour ?? TRACKS[t.track].hour, test: t, run, cars: [{ params: tunedParams(carId, install), name: 'YOU', ai: false, seat: 0, carId, install, key: 'player', color: 'lime' }], rules: { contact: false, pits: false, wearMult: 0.2 }, seed: 7, label: `TEST ${testId}`, demo: !!o.demo };
}
export function testDriveSetup(carId, install, back) {
  return { mode: 'testdrive', after: { kind: 'route', route: back }, track: 'proving', laps: 1, hour: 11, start: 'standing', cars: [{ params: tunedParams(carId, install), name: 'YOU', ai: false, seat: 0, carId, install: install ?? emptyInstall(), key: 'player', color: 'lime' }], rules: { contact: false, pits: false, wearMult: 0 }, seed: 3, label: 'TEST DRIVE' };
}
export function quickRaceSetup(o) {
  const r = rng(o.seed ?? 11), cars = [], list = ['pico', 'kite', 'ginga', 'moth', 'ryu', 'longhorn', 'brandt32', 'heck', 'libeccio', 'kiteCup', 'works', 'corsa', 'ryuRally', 'type9'], myPS = CARS[o.carId].phys.powerPS;
  const near = list.slice().sort((a, b) => Math.abs(CARS[a].phys.powerPS - myPS) - Math.abs(CARS[b].phys.powerPS - myPS)).slice(0, 5), n = (o.field ?? 6) - 1;
  for (let i = 0; i < n; i++) { const carId = near[Math.floor(r() * near.length)], install = { ...emptyInstall(), paint: AI_PAINT[Math.floor(r() * AI_PAINT.length)] }; cars.push({ params: tunedParams(carId, install), name: DRIVERS[(i * 5 + 2) % 12], ai: true, skill: o.pace - 0.015 + (0.03 * i) / Math.max(1, n - 1), carId, install, key: `d${i}` }); }
  const install = o.install ?? { ...emptyInstall(), paint: o.paint ?? CARS[o.carId].paint };
  cars.push({ params: tunedParams(o.carId, install), name: 'YOU', ai: false, seat: 0, carId: o.carId, install, key: 'player', color: 'lime' });
  return { mode: 'arcade', after: { kind: 'arcade' }, track: o.track, laps: o.laps ?? 2, hour: o.hour ?? TRACKS[o.track].hour, rain: !!o.rain, start: 'rolling', cars, seed: o.seed ?? 11, paceMid: o.pace, rules: { contact: true, wearMult: 0.5, pits: !!o.pits }, label: 'QUICK RACE' };
}
export function trialSetup(o) {
  const install = o.install ?? { ...emptyInstall(), paint: CARS[o.carId].paint };
  return { mode: 'trial', after: { kind: 'arcade' }, track: o.track, laps: 99, hour: o.hour ?? TRACKS[o.track].hour, rain: !!o.rain, start: 'standing', cars: [{ params: tunedParams(o.carId, install), name: 'YOU', ai: false, seat: 0, carId: o.carId, install, key: 'player', color: 'lime' }], rules: { contact: false, pits: false, wearMult: 0 }, seed: 5, label: 'TIME TRIAL' };
}
export function couchSetup(o) {
  const cars = [], ai = o.ai ?? 0, r = rng(21);
  for (let i = 0; i < ai; i++) { const carId = ['ginga', 'kite', 'brandt32', 'ryu'][Math.floor(r() * 4)], install = { ...emptyInstall(), paint: AI_PAINT[i] }; cars.push({ params: tunedParams(carId, install), name: DRIVERS[i], ai: true, skill: o.pace ?? 0.9, carId, install, key: `d${i}` }); }
  cars.push({ params: tunedParams(o.car1, {}), name: 'P1', ai: false, seat: 0, carId: o.car1, install: { ...emptyInstall(), paint: 'red' }, key: 'p1' }, { params: tunedParams(o.car2, {}), name: 'P2', ai: false, seat: 1, carId: o.car2, install: { ...emptyInstall(), paint: 'blue' }, key: 'p2' });
  return { mode: 'couch', after: { kind: 'arcade' }, track: o.track, laps: o.laps ?? 2, hour: o.hour ?? TRACKS[o.track].hour, rain: !!o.rain, start: 'standing', cars, seed: 9, rules: { contact: true, wearMult: 0.5, pits: false }, label: 'COUCH DUEL' };
}
export const HUB_ROUNDS = [['kestrel', 2], ['cedar', 2], ['harbour', 2], ['saltline', 4]], HUB_CARS = ['ginga', 'ryu', 'brandt32', 'kite'];
export function hubRoundSetup(next, players) {
  const [track, laps] = HUB_ROUNDS[Math.floor(next() * HUB_ROUNDS.length)], carId = HUB_CARS[Math.floor(next() * HUB_CARS.length)], rainRoll = next(), hourRoll = next();
  const dflt = TRACKS[track].hour, hour = track === 'harbour' ? (hourRoll < 0.5 ? 18.5 : 21) : dflt + (hourRoll - 0.5) * 2;
  const install = { ...emptyInstall(), paint: null };
  return { mode: 'hub', after: { kind: 'hub' }, track, laps, hour, rain: rainRoll < 0.18, start: 'standing', cars: [{ params: tunedParams(carId, install), name: 'YOU', ai: false, seat: 0, carId, install, key: 'player' }], rules: { contact: false, pits: false, wearMult: 0.5, holdLights: true }, seed: 1, label: 'HUB ROUND', hubCar: carId, players };
}
export function assistInput(a, test = null, surface = null) {
  const f = test?.assists ?? {}, abs = f.abs ?? a.abs, tcs = f.tcs ?? a.tcs / 10; let asm = f.asm ?? a.asm / 10; if (surface === 'dirt') asm *= 0.5;
  return { abs, tcs: test?.assists?.tcs != null ? f.tcs : tcs, asm, auto: a.auto };
}
void PAINTS;
