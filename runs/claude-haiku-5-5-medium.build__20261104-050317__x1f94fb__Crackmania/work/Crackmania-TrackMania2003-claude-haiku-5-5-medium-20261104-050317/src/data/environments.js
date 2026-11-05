// The three environments: each is its own world (its own sky, fog, ground and physics). The car is the same in all three.
export const ENVIRONMENTS = {
  DUSTBOWL: { name: 'Dustbowl', sky: ['#3f7fd0', '#f5dcae'], fog: '#f5dcae', ground: [255, 214, 146], handling: { grip: 1, adhesion: 1, steerRate: 1, gas: 1 } },
  HEDGEROW: { name: 'Hedgerow', sky: ['#4f9be0', '#e4f2cc'], fog: '#e4f2cc', ground: [128, 178, 92], handling: { grip: .8, adhesion: .9, steerRate: 1.15, gas: 1 } },
  FROSTPEAK: { name: 'Frostpeak', sky: ['#7fb3e0', '#eef6ff'], fog: '#eef6ff', ground: [226, 238, 250], handling: { grip: .45, adhesion: .6, steerRate: .85, gas: .9 } },
};

/** the car's tuning in an environment: the live tuning with the environment's multipliers (thin ice, gravel, thin air) */
export function handlingFor(env, tune) {
  const h = (ENVIRONMENTS[env] || ENVIRONMENTS.DUSTBOWL).handling, out = Object.assign({}, tune);
  out.grip = tune.grip * h.grip; out.driftGrip = tune.driftGrip * h.grip; out.adhesion = tune.adhesion * h.adhesion;
  out.steerRate = tune.steerRate * h.steerRate; out.gas = tune.gas * h.gas;
  return out;
}
