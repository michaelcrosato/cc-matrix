// Builds race fields (player + AI) for events, quick races and hub rounds.
import { CAR_INFO } from '../data/cars.js';
import { installFor, defaultInstall } from './tuning.js';
import { rng } from './race.js';
import { oilFactor } from './career.js';
const NAMES = ['ARAKI', 'BELL', 'COSTA', 'DUNN', 'EBERLE', 'FOX', 'GRAVES', 'HOSHI', 'IVERS', 'JONES', 'KANE', 'LORENZ', 'MORI', 'NASH', 'OKAFOR', 'PAGE'];
const COLOURS = ['blue', 'green', 'orange', 'sand', 'cyan', 'plum', 'lime', 'sky'];
export const playerEntry = (profile, car, name = 'YOU') => ({ id: 'player', carId: car.carId, name, player: true, skill: 1, install: car.install, paint: car.install.paint, colour: 'red', oil: oilFactor(car), uid: car.uid });
export function aiField(ev, roundIdx, size, seed, paceOverride) {
  const r = rng(seed + roundIdx * 31), [lo, hi] = paceOverride ?? ev.pace, n = size - 1, out = [], pool = ev.pool;
  for (let k = 0; k < n; k++) { const [carId, tune] = pool[k % pool.length], skill = lo + ((hi - lo) * k) / Math.max(1, n - 1); out.push({ id: 'ai' + k, carId, name: NAMES[(k * 5 + roundIdx) % NAMES.length], player: false, skill, install: installFor(tune), tune, colour: COLOURS[k % COLOURS.length], paint: CAR_INFO[carId].paint === 'red' ? COLOURS[(k + 2) % COLOURS.length] : undefined }); }
  return out;
}
export function quickField(profileCarId, install, trackId, size, pace, seed, carPool) {
  const pool = carPool ?? ['kite', 'ginga', 'moth', 'ryu', 'brandt32', 'heck', 'libeccio', 'longhorn'];
  const out = []; for (let k = 0; k < size - 1; k++) out.push({ id: 'ai' + k, carId: pool[(k + seed) % pool.length], name: NAMES[(k * 3 + seed) % NAMES.length], player: false, skill: pace - 0.03 + (0.03 * k) / Math.max(1, size - 2), install: defaultInstall(), colour: COLOURS[k % COLOURS.length] });
  return out;
}
export { NAMES, COLOURS };
