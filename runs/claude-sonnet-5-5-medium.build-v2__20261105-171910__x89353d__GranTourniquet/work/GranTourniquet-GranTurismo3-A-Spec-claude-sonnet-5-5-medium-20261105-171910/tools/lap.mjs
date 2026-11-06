import { buildTrack, racingLine, speedProfile, carParams, newCar, stepCar, aiDrive, collideCars } from '../src/game/sim/sim.js';
import { TRACKS } from '../src/game/data/tracks.js';
import { CARS } from '../src/game/data/cars_phys.js';
export function lapTime(carId, trackId, skill = 0.97, laps = 2) {
  const tr = buildTrack(TRACKS[trackId]); const p = carParams(CARS[carId]); const line = racingLine(tr);
  const sp = speedProfile(tr, line, p, tr.surface === 'dirt' ? (p.tyreTable?.dirt ?? 0.62) : 1);
  const c = newCar(p, tr, 0, 0); let t = 0, last = 0, times = [], prevS = 0;
  const env = { wearRate: 0, fuelRate: 0 };
  for (let k = 0; k < 240 * 60 * 10 && times.length < laps; k++) {
    const inp = aiDrive(c, tr, line, sp, { skill });
    if (k % 4 === 0) {} stepCar(c, inp, 1 / 240, tr, env); t += 1 / 240;
    if (prevS > tr.length * 0.9 && c.loc.s < tr.length * 0.1) { times.push(t - last); last = t; }
    prevS = c.loc.s;
  }
  return { times, len: tr.length, corners: tr.cornerS.map(Math.round) };
}
if (process.argv[1].endsWith('lap.mjs') && process.argv[2]) console.log(JSON.stringify(lapTime(process.argv[2], process.argv[3])));
