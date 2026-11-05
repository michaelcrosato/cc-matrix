// Tuning: defaults in metres, m/s, km/h and degrees. CFG is the live copy every system reads; Dev Mode's sliders write
// it, and reset() puts the defaults back.
const KMH = 1 / 3.6, DEG = Math.PI / 180;
export const CARS = {
  coyote: { name: 'COYOTE', env: 'dustbowl', L: 4.4, W: 1.9, H: 1.25, wheelbase: 2.7, track: 1.6, wheelR: .36, ride: .55, vtop: 230, A0: 12, B: 24, Arev: 6, vrev: 40, dlo: 34, dhi: 7, grip: 15, driftGrip: .55, airYaw: 1.2, cd: .0004, adhesion: .35, color: '#e8442a', accent: '#ffe7b0' },
  pebble: { name: 'PEBBLE', env: 'hedgerow', L: 3.8, W: 1.75, H: 1.35, wheelbase: 2.4, track: 1.5, wheelR: .32, ride: .5, vtop: 195, A0: 14, B: 28, Arev: 6, vrev: 40, dlo: 36, dhi: 9, grip: 18, driftGrip: .7, airYaw: 1.5, cd: .0004, adhesion: .35, color: '#2a7ae8', accent: '#ffffff' },
  moose: { name: 'MOOSE', env: 'frostpeak', L: 4.1, W: 1.95, H: 1.7, wheelbase: 2.5, track: 1.65, wheelR: .45, ride: .7, vtop: 175, A0: 11, B: 22, Arev: 6, vrev: 40, dlo: 32, dhi: 9, grip: 14, driftGrip: .6, airYaw: 1.0, cd: .0005, adhesion: .40, color: '#2aa86a', accent: '#ffd23a' }
};
export const SURF = {   // grip multiplier per car, rolling resistance (m/s^2)
  road: { coyote: 1, pebble: 1, moose: 1, roll: .15 },
  boost: { coyote: 1, pebble: 1, moose: 1, roll: .15 },
  dirt: { coyote: .75, pebble: .95, moose: .85, roll: .6 },
  grass: { coyote: .55, pebble: .6, moose: .65, roll: 2.5 },
  sand: { coyote: .5, pebble: .55, moose: .6, roll: 4 },
  snow: { coyote: .6, pebble: .65, moose: .9, roll: 1.2 },
  ice: { coyote: .3, pebble: .35, moose: .55, roll: .05 }
};
export const DEFAULTS = {
  gravity: 1.5, loopAssist: 1, boostDv: 14, boostAccel: 8, boostTime: 1.2, wallE: .15, landLoss: .02,
  camDist: 8, camHeight: 2.6, camFov: 70, camFovSpeed: 12,
  medalGold: 1.06, medalSilver: 1.2, medalBronze: 1.5, rivalBase: 0, rivalStep: .03, copperMult: 1,
  steerSens: 1,
  iceGrip: 1, dirtGrip: 1, sandGrip: 1, snowGrip: 1
};
export const CFG = {};
export const CAR = {};   // live per-car tuning (copies of CARS)
export function reset() {
  Object.assign(CFG, DEFAULTS);
  for (const k in CARS) CAR[k] = Object.assign({}, CARS[k]);
}
reset();
/** the car's tuning in SI units, read each step (so sliders act at once) */
export function carSI(id) {
  const c = CAR[id];
  return { ...c, vtop: c.vtop * KMH, vrev: c.vrev * KMH, dlo: c.dlo * DEG, dhi: c.dhi * DEG, adhesion: c.adhesion * 9.81 };
}
export function surfGrip(surface, car) {
  const s = SURF[surface] || SURF.road; let g = s[car] ?? 1;
  if (surface === 'ice') g *= CFG.iceGrip; else if (surface === 'dirt') g *= CFG.dirtGrip; else if (surface === 'sand') g *= CFG.sandGrip; else if (surface === 'snow') g *= CFG.snowGrip;
  return g;
}
/** the sliders Dev Mode shows: [key, label, min, max, step, where ('cfg' | car id field)] */
export const SLIDERS = [
  ['gravity', 'GRAVITY (G)', .8, 2.5, .05], ['loopAssist', 'LOOP ASSIST', 0, 2, .1],
  ['car:vtop', 'TOP SPEED KM/H', 120, 320, 5], ['car:A0', 'ACCELERATION', 6, 24, .5], ['car:B', 'BRAKES', 10, 40, 1],
  ['car:dlo', 'STEER LOW DEG', 20, 50, 1], ['car:dhi', 'STEER HIGH DEG', 3, 16, .5], ['car:grip', 'GRIP', 8, 30, .5],
  ['car:driftGrip', 'DRIFT GRIP', .2, 1, .05], ['car:ride', 'RIDE HEIGHT M', .3, 1, .05], ['car:cd', 'AIR DRAG', 0, .0015, .0001], ['car:airYaw', 'AIR STEER', 0, 3, .1], ['car:adhesion', 'ADHESION G', 0, 1, .05],
  ['iceGrip', 'ICE GRIP X', .3, 3, .05], ['dirtGrip', 'DIRT GRIP X', .3, 2, .05], ['sandGrip', 'SAND GRIP X', .3, 2, .05], ['snowGrip', 'SNOW GRIP X', .3, 2, .05],
  ['boostDv', 'BOOST KICK M/S', 0, 25, .5], ['boostAccel', 'BOOST PUSH', 0, 20, .5], ['boostTime', 'BOOST TIME S', 0, 3, .1],
  ['wallE', 'WALL BOUNCE', 0, .8, .05], ['landLoss', 'LANDING LOSS', 0, .08, .005],
  ['camDist', 'CAMERA DISTANCE', 3, 14, .25], ['camHeight', 'CAMERA HEIGHT', .5, 5, .1], ['camFov', 'CAMERA FOV', 50, 100, 1], ['camFovSpeed', 'FOV BY SPEED', 0, 30, 1],
  ['medalGold', 'GOLD RATIO', 1.01, 1.3, .01], ['medalSilver', 'SILVER RATIO', 1.05, 1.6, .01], ['medalBronze', 'BRONZE RATIO', 1.2, 2.2, .05],
  ['rivalBase', 'RIVAL SKILL +', -.3, .2, .01], ['rivalStep', 'RIVAL STEP', 0, .08, .005], ['copperMult', 'COPPERS X', 0, 5, .25]
];
export function sliderGet(key, car) { return key.startsWith('car:') ? CAR[car][key.slice(4)] : CFG[key]; }
export function sliderSet(key, car, v) { if (key.startsWith('car:')) CAR[car][key.slice(4)] = v; else CFG[key] = v; }
export function sliderDefault(key, car) { return key.startsWith('car:') ? CARS[car][key.slice(4)] : DEFAULTS[key]; }
