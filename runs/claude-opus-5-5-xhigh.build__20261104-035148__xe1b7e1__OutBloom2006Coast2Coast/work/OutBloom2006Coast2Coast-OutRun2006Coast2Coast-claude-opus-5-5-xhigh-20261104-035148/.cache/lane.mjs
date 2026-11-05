import { raceIn, run } from '../tests/lib/boot.mjs';
const { race, OB } = raceIn({ players: [{ car: 'orchidea' }] }); const L = race.traffic.list('S1');
for (const q of L.vehicles) q.gone = true; L.vehicles.length = 0; race.cfg.traffic = false;
const v0 = race.traffic.spawn(L, race.p1.car.z + 2000, { lane: 1, v: 90 }), v1 = race.traffic.spawn(L, race.p1.car.z + 2600, { lane: 1, v: 60 });
console.log('spawned', !!v0, !!v1, L.vehicles.length);
for (let i = 0; i < 8; i++) { run(race, .5); console.log(race.t.toFixed(1), 'v0 lane', v0.lane, 'to', v0.toLane, 'blink', v0.blink.toFixed(2), 'chg', v0.changeT.toFixed(2), 'dz', Math.round(v1.z - v0.z), 'v', v0.v.toFixed(0), v1.v.toFixed(0), 'gone', v0.gone, v1.gone); }
