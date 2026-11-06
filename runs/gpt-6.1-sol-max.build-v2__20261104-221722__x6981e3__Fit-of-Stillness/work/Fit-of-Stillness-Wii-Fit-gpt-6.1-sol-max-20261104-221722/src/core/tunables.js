export const REGISTRY = {
  Balance: { dotInstability: [.6, 0, 2, .05], dotAuthority: [3, .5, 6, .1], dotDamping: [3.4, .5, 7, .1], dotNoise: [.8, 0, 2, .05], dotLag: [.08, .01, .5, .01], ringScale: [1, .5, 2, .05], gustForce: [1.6, 0, 4, .1], mouseLeanRadius: [70, 20, 140, 5] },
  'Breath + reps': { breathBonus: [.55, 0, 1, .05], repLag: [.1, .02, .5, .01], repFatigue: [.1, 0, .4, .01], repTempoScale: [1, .5, 2, .05] },
  Rhythm: { stepWindow: [1, .5, 2, .05], stepOffsetMs: [0, -200, 200, 5], hoopLow: [.9, .3, 2, .1], hoopHigh: [2.4, 1, 4, .1], hoopLiftRate: [.35, .1, 1, .05] },
  Games: { headerInterval: [1, .5, 2, .1], slackWalkInst: [2.6, .6, 5, .1], trayGravity: [9.8, 2, 20, .2], trayMaxTilt: [14, 5, 25, 1], jogTargetCadence: [3, 1, 5, .1], pierBoost: [2.14, 1, 4, .05] },
  Economy: { dripRate: [1, .5, 3, .1], starThresholdScale: [1, .5, 1.5, .05], ageTrainingWeight: [.5, 0, 1, .05] }
};
export const DEFAULTS = Object.fromEntries(Object.values(REGISTRY).flatMap(tab => Object.entries(tab).map(([k, v]) => [k, v[0]])));
export class Tunables {
  constructor() { Object.assign(this, DEFAULTS); }
  reset(tab) { for (const k of Object.keys(tab ? REGISTRY[tab] : DEFAULTS)) this[k] = DEFAULTS[k]; }
  changed() { return Object.fromEntries(Object.entries(DEFAULTS).filter(([k, v]) => this[k] !== v).map(([k]) => [k, this[k]])); }
}
export const SETTINGS = { music: .10, sfx: .75, voice: .65, glyphs: 'PlayStation', gentle: false, mouseLeanRadius: 70, stepOffsetMs: 0, reduceFlashes: false, look: 'Default', pixelSize: 1 };
