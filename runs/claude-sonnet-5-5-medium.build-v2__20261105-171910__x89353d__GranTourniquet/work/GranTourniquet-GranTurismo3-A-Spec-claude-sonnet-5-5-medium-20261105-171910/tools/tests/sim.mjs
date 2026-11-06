import { buildTrack } from '../../src/game/sim/sim.js';
import { TRACKS } from '../../src/game/data/tracks.js';
import { CAR_IDS } from '../../src/game/data/cars.js';
import { specSheet } from '../spec.mjs';
import { lapTime } from '../lap.mjs';
import { RaceSim } from '../../src/game/sim/race.js';
import { defaultInstall } from '../../src/game/sim/tuning.js';
const SPEC = { pico: [10.5, 0], kite: [7.4, 36.1], ginga: [6.6, 24.0], moth: [6.7, 31.2], brandt32: [6.1, 17.6], ryu: [4.4, 17.3], longhorn: [6.5, 15.9], heck: [4.8, 13.8], libeccio: [5.0, 12.8], kiteCup: [5.8, 18.6], ryuRally: [4.0, 13.1], works: [4.4, 9.8], corsa: [3.8, 8.2], type9: [3.4, 7.0] };
const LAPS = { kite: { kestrel: 125, proving: 118, cedar: 124 }, ginga: { kestrel: 122, cedar: 120, saltline: 59 }, ryuRally: { redclay: 115 }, libeccio: { harbour: 126 }, type9: { kestrel: 92 }, pico: { kestrel: 136 }, longhorn: { cedar: 120 } };
export default async (t) => {
  const len = { kestrel: 3430, cedar: 3216, harbour: 2973, saltline: 2909, redclay: 2209, proving: 3020 }; for (const [id, L] of Object.entries(len)) t.check(Math.abs(buildTrack(TRACKS[id]).length - L) < 3, 'track length ' + id);
  const k = buildTrack(TRACKS.kestrel).cornerS.map(Math.round); t.check(k[0] === 383 && k[13] === 3052, 'kestrel apexes ' + k.join(','));
  for (const id of CAR_IDS) { const r = specSheet(id), [z, z2] = SPEC[id]; t.check(Math.abs(r.z100 - z) / z < 0.05, `0-100 ${id} ${r.z100?.toFixed(1)} vs ${z}`); if (z2) t.check(Math.abs(r.z200 - z2) / z2 < 0.06, `0-200 ${id}`); t.check(r.brake > 20 && r.brake < 60, 'braking ' + id); }
  for (const [car, m] of Object.entries(LAPS)) for (const [tr, want] of Object.entries(m)) { const r = lapTime(car, tr).times[1]; t.check(Math.abs(r - want) <= 3, `lap ${car} ${tr} ${r?.toFixed(1)} vs ${want}`); }
  // determinism
  const mk = (seed) => new RaceSim({ track: 'cedar', laps: 1, start: 'rolling', contact: true, seed, field: ['kite', 'moth', 'ginga'].map((c, i) => ({ id: i, carId: c, name: 'A' + i, skill: 0.9 + i * 0.01, install: defaultInstall() })) }); const a = mk(2), b = mk(2); for (let i = 0; i < 2400; i++) { a.step({}); b.step({}); } t.check(a.fingerprint() === b.fingerprint(), 'determinism'); t.check(a.cars.every((c) => Number.isFinite(c.c.x) && Number.isFinite(c.c.yaw)), 'contact does not explode');
  // reverse engages after 0.4 s of brake at a standstill
  const r = new RaceSim({ track: 'proving', laps: 1, start: 'flying', startS: 100, startSpeed: 0, contact: false, seed: 1, field: [{ id: 'player', carId: 'kite', name: 'Y', player: true, skill: 1, install: defaultInstall() }] }); r.state = 'racing'; r.greenAt = 0; for (let i = 0; i < 120; i++) r.step({ player: { brake: 1, throttle: 0 } }); const u = r.player.c.u; t.check(u < -0.5, 'reverse engaged u=' + u?.toFixed(2));
  // manual gears and airborne crest
  const m = new RaceSim({ track: 'redclay', laps: 1, start: 'flying', startS: 330, startSpeed: 30, contact: false, seed: 1, field: [{ id: 'player', carId: 'ryuRally', name: 'Y', player: true, skill: 1, install: defaultInstall() }] }); m.state = 'racing'; m.greenAt = 0; let air = 0; for (let i = 0; i < 360; i++) { m.step({ player: { throttle: 1, auto: false, up: i % 90 === 10 } }); if (m.player.c.airborne) air++; } t.check(m.player.c.gear >= 2, 'manual gear up'); t.check(air > 0, 'crest launches a car (airborne frames ' + air + ')');
  // wear and fuel over ten laps at harbour
  const e = new RaceSim({ track: 'harbour', laps: 10, start: 'rolling', contact: false, seed: 1, field: [{ id: 0, carId: 'libeccio', name: 'A', skill: 0.95, install: defaultInstall() }] }); for (let i = 0; i < 60 * 600 && e.cars[0].laps < 6; i++) e.step({}); const c = e.cars[0].c; t.check(c.fuel < 0.7 && c.wear[0] < 0.7, `wear and fuel fall (${c.fuel.toFixed(2)} ${c.wear[0].toFixed(2)})`);
};
