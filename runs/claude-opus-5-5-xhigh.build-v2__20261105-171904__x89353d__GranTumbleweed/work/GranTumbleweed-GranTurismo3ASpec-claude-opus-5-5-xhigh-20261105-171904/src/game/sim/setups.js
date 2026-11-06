// RaceSetup plain objects: what every kind of drive starts from. Pure, so tests can make them too.
import { TRACKS } from '../data/tracks.js';
import { DRIVER_NAMES } from '../data/cars.js';
import { EVENTS } from '../data/events.js';
import { aiInstall, carEntry, eventRoster, eventState, oilOf, rallyRival } from './career.js';
import { fullInstall } from './tuning.js';
const WEAR_SHORT = 0.5;
export const playerCar = (profile, assists, name = 'YOU', player = 0) => { const car = carEntry(profile); return { carId: car.carId, install: car.install, oil: oilOf(car), name, paint: car.install.paint, player, assists, dirt: car.dirt ?? 0 }; };
export function eventSetup(profile, id, assists, seed = 1) {
  const e = EVENTS[id], st = eventState(profile, id), round = e.rounds[st.round], me = { ...playerCar(profile, assists) };
  if (e.rally) {
    const riv = rallyRival(id, st.round);
    return { kind: 'rally', event: id, round: st.round, track: round.track, laps: round.laps, hour: round.hour ?? TRACKS[round.track].hour, start: 'stagger', contact: false, wear: e.wear ?? WEAR_SHORT, seed, cars: [{ carId: riv.carId, install: aiInstall(riv.tune), name: riv.name, skill: riv.skill }, { ...me, startDelay: 3 }] };
  }
  const roster = eventRoster(id);
  return { kind: 'race', event: id, round: st.round, track: round.track, laps: round.laps, hour: round.hour ?? TRACKS[round.track].hour, hourEnd: round.hourEnd ?? null, rain: !!round.rain, start: 'rolling', wear: e.wear ?? WEAR_SHORT, fuel: e.endurance ? 1 : 1, seed, cars: [...roster.map((r) => ({ carId: r.carId, install: aiInstall(r.tune), name: r.name, skill: r.skill })), me] };
}
const PACE = { easy: 0.85, normal: 0.92, hard: 0.98 };
export function quickSetup({ track, carId, laps = 3, field = 6, difficulty = 'normal', hour, rain = false, assists, seed = 1, install = null, paint = null, pace = null, poolIds = null }) {
  const base = pace ?? PACE[difficulty] ?? 0.92, cars = [], pool = poolIds ?? [carId], n = Math.max(0, field - 1);
  for (let i = 0; i < n; i++) cars.push({ carId: pool[i % pool.length], name: DRIVER_NAMES[i % DRIVER_NAMES.length], skill: base - 0.03 + (0.06 * i) / Math.max(1, n - 1) });
  cars.push({ carId, install, name: 'YOU', player: 0, assists, paint });
  return { kind: 'quick', track, laps, hour: hour ?? TRACKS[track].hour, rain, start: 'rolling', wear: WEAR_SHORT, seed, cars };
}
export const trialSetup = ({ track, carId, assists, hour, seed = 1, install = null, paint = null }) => ({ kind: 'timetrial', track, laps: 0, hour: hour ?? TRACKS[track].hour, start: 'flying', startS: -220, startSpeed: 110, contact: false, wear: 0, fuel: 0, seed, cars: [{ carId, install, paint, name: 'YOU', player: 0, assists }] });
export const testDriveSetup = ({ carId, install, assists, paint = null, seed = 1, oil = 1 }) => ({ kind: 'testdrive', track: 'proving', laps: 1, hour: 11, start: 'flying', startS: -200, startSpeed: 80, contact: false, wear: 0, fuel: 0, seed, cars: [{ carId, install, oil, paint, name: 'YOU', player: 0, assists }] });
export const couchSetup = ({ track, carA, carB, laps = 2, ai = 0, hour, rain = false, assists, seed = 1 }) => { const cars = []; for (let i = 0; i < ai; i++) cars.push({ carId: carA, name: DRIVER_NAMES[i], skill: 0.88 + (i * 0.02) }); cars.push({ carId: carA, name: 'P1', player: 0, assists, paint: 'red' }, { carId: carB, name: 'P2', player: 1, assists, paint: 'blue' }); return { kind: 'couch', track, laps, hour: hour ?? TRACKS[track].hour, rain, start: 'standing', wear: WEAR_SHORT, seed, cars }; };
const ROUNDS = [['kestrel', 2], ['cedar', 2], ['harbour', 2], ['saltline', 4]], ROUND_CARS = ['ginga', 'ryu', 'brandt32', 'kite'];
export function hubSetup(rng, seed = 1) {
  const [track, laps] = ROUNDS[Math.floor(rng() * ROUNDS.length) % ROUNDS.length], carId = ROUND_CARS[Math.floor(rng() * ROUND_CARS.length) % ROUND_CARS.length], hours = [TRACKS[track].hour, 18.5, 15, 10], hour = hours[Math.floor(rng() * hours.length) % hours.length], rain = rng() < 0.15 && track !== 'saltline';
  return { kind: 'hub', track, laps, hour, rain, start: 'standing', hold: true, contact: false, wear: WEAR_SHORT, seed, cars: [{ carId, name: 'YOU', player: 0, assists: { abs: true, tcs: 5, asm: 5, auto: true }, paint: null }] };
}
void fullInstall;
