// CRACKMANIA tuning (PLAN §4.4): defaults in metres, m/s, km/h, degrees, g. CFG is live (Dev Mode sliders write it);
// reset() puts it back. The simulation works in world metres (x east, y south, z up)
export const G0 = 9.81, KMH = 1 / 3.6;
export const CARS = {
  coyote: { name: 'COYOTE', env: 'dustbowl', L: 4.4, W: 1.9, H: 1.25, wheelbase: 2.7, track: 1.6, wheelR: .36, ride: .55, vtop: 230, A0: 12, B: 24, Arev: 6, vrev: 40, steerLo: 34, steerHi: 7, grip: 15, driftGrip: .55, airYaw: 1.2, cd: .0004, adhesion: .35 },
  pebble: { name: 'PEBBLE', env: 'hedgerow', L: 3.8, W: 1.75, H: 1.35, wheelbase: 2.4, track: 1.5, wheelR: .32, ride: .50, vtop: 195, A0: 14, B: 28, Arev: 6, vrev: 40, steerLo: 36, steerHi: 9, grip: 18, driftGrip: .70, airYaw: 1.5, cd: .0004, adhesion: .35 },
  moose: { name: 'MOOSE', env: 'frostpeak', L: 4.1, W: 1.95, H: 1.7, wheelbase: 2.5, track: 1.65, wheelR: .45, ride: .70, vtop: 175, A0: 11, B: 22, Arev: 6, vrev: 40, steerLo: 32, steerHi: 9, grip: 14, driftGrip: .60, airYaw: 1.0, cd: .0005, adhesion: .40 }
};
export const SURF = {
  road: { coyote: 1, pebble: 1, moose: 1, roll: .15 },
  boost: { coyote: 1, pebble: 1, moose: 1, roll: .15 },
  dirt: { coyote: .75, pebble: .95, moose: .85, roll: .6 },
  grass: { coyote: .55, pebble: .6, moose: .65, roll: 2.5 },
  sand: { coyote: .5, pebble: .55, moose: .6, roll: 4 },
  snow: { coyote: .6, pebble: .65, moose: .9, roll: 1.2 },
  ice: { coyote: .3, pebble: .35, moose: .55, roll: .05 },
  wall: { coyote: 1, pebble: 1, moose: 1, roll: .15 }
};
export const GLOBAL = { gravity: 1.5, boostDv: 10, boostAccel: 7, boostTime: 1.2, wallE: .15, landLoss: .02, loopAssist: 1, camDist: 8.5, camHeight: 2.5, camFov: 70, camFovSpeed: 12, gold: 1.06, silver: 1.2, bronze: 1.5, rivalBase: 0, rivalStep: .03, copperMul: 1 };
const clone = o => JSON.parse(JSON.stringify(o));
/** the live values: CFG.cars.coyote.vtop (km/h), CFG.surf.ice.coyote, CFG.gravity (g) ... */
export const CFG = { cars: clone(CARS), surf: clone(SURF), ...clone(GLOBAL) };
export const DEFAULTS = { cars: clone(CARS), surf: clone(SURF), ...clone(GLOBAL) };
export function resetCFG() { const d = clone(DEFAULTS); for (const k of Object.keys(CFG)) delete CFG[k]; Object.assign(CFG, d); }
/** the live sliders Dev Mode shows: [path, label, min, max, step] (path into CFG; 'car.' means the current car) */
export const SLIDERS = [
  ['gravity', 'Gravity (g)', .8, 2.5, .05], ['loopAssist', 'Loop assist', 0, 2, .05],
  ['car.vtop', 'Top speed km/h', 120, 320, 5], ['car.A0', 'Acceleration m/s²', 5, 25, .5], ['car.B', 'Brakes m/s²', 10, 40, 1],
  ['car.steerLo', 'Steer low °', 15, 50, 1], ['car.steerHi', 'Steer high °', 3, 20, .5], ['car.grip', 'Grip m/s²', 6, 30, .5],
  ['car.driftGrip', 'Drift grip', .2, 1, .05], ['car.airYaw', 'Air yaw rad/s', 0, 3, .1], ['car.ride', 'Ride height m', .3, 1, .05], ['car.cd', 'Drag', .0001, .001, .00005],
  ['car.adhesion', 'Adhesion g', 0, .8, .05],
  ['surf.ice.car', 'Ice grip', .1, 1, .05], ['surf.dirt.car', 'Dirt grip', .3, 1.2, .05], ['surf.sand.car', 'Sand grip', .2, 1, .05], ['surf.snow.car', 'Snow grip', .3, 1.2, .05],
  ['boostDv', 'Boost kick m/s', 0, 25, .5], ['boostAccel', 'Boost push m/s²', 0, 15, .5], ['boostTime', 'Boost time s', 0, 3, .1],
  ['wallE', 'Wall bounce', 0, .8, .05], ['landLoss', 'Landing loss', 0, .08, .005],
  ['camDist', 'Camera distance m', 3, 12, .25], ['camHeight', 'Camera height m', .5, 5, .1], ['camFov', 'Camera FOV °', 50, 100, 1], ['camFovSpeed', 'FOV by speed °', 0, 30, 1],
  ['gold', 'Gold ratio', 1, 1.3, .01], ['silver', 'Silver ratio', 1.05, 1.6, .01], ['bronze', 'Bronze ratio', 1.1, 2.2, .01],
  ['rivalBase', 'Rival skill +', -.3, .3, .01], ['rivalStep', 'Rival skill / round', 0, .08, .005], ['copperMul', 'Copper multiplier', 0, 5, .25]
];
export function cfgGet(path, car) { const k = path.replace('car.', 'cars.' + car + '.').replace(/\.car$/, '.' + car).split('.'); let o = CFG; for (const p of k) o = o[p]; return o; }
export function cfgSet(path, car, v) { const k = path.replace('car.', 'cars.' + car + '.').replace(/\.car$/, '.' + car).split('.'); let o = CFG; for (const p of k.slice(0, -1)) o = o[p]; o[k[k.length - 1]] = v; }
export function cfgDefault(path, car) { const k = path.replace('car.', 'cars.' + car + '.').replace(/\.car$/, '.' + car).split('.'); let o = DEFAULTS; for (const p of k) o = o[p]; return o; }
