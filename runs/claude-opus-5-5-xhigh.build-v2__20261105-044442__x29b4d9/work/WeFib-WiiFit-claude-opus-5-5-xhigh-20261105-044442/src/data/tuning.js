// Every live slider in Dev Mode. A designer can add one here and read tun.<key> anywhere.
export const TUNING = {
  // Balance
  maxLean: { group: 'Balance', label: 'Max lean', min: 8, max: 30, step: 1, default: 18 },
  margin: { group: 'Balance', label: 'Stiffness margin', min: 0.1, max: 1.5, step: 0.05, default: 0.45 },
  zeta: { group: 'Balance', label: 'Damping', min: 0.1, max: 1, step: 0.05, default: 0.4 },
  ankleMax: { group: 'Balance', label: 'Ankle strength', min: 2.5, max: 9, step: 0.1, default: 4.6 },
  fallAngle: { group: 'Balance', label: 'Fall angle', min: 25, max: 70, step: 1, default: 45 },
  reflex: { group: 'Balance', label: 'Reflex', min: 2, max: 30, step: 1, default: 10 },
  flailBoost: { group: 'Balance', label: 'Flail boost', min: 1, max: 3, step: 0.1, default: 1.9 },
  flailCooldown: { group: 'Balance', label: 'Flail cooldown', min: 0.2, max: 6, step: 0.1, default: 2 },
  swayScale: { group: 'Balance', label: 'Sway scale', min: 0, max: 3, step: 0.05, default: 1 },
  tremorScale: { group: 'Balance', label: 'Tremor scale', min: 0, max: 3, step: 0.05, default: 1 },
  recoverTime: { group: 'Balance', label: 'Recover time', min: 0.5, max: 6, step: 0.1, default: 2.2 },
  // World
  gravity: { group: 'World', label: 'Gravity', min: 2, max: 20, step: 0.1, default: 9.81 },
  islandWeight: { group: 'World', label: 'Island weight', min: 0, max: 12, step: 0.5, default: 4 },
  islandRest: { group: 'World', label: 'Island rest tilt', min: 0, max: 15, step: 0.5, default: 9 },
  islandSpring: { group: 'World', label: 'Island spring', min: 0.5, max: 8, step: 0.1, default: 2.2 },
  walkSpeed: { group: 'World', label: 'Walk speed', min: 1, max: 9, step: 0.1, default: 4 },
  // Events
  fruitMass: { group: 'Events', label: 'Fruit mass', min: 0.3, max: 3, step: 0.05, default: 1 },
  fruitInterval: { group: 'Events', label: 'Fruit interval', min: 0.3, max: 3, step: 0.05, default: 1 },
  landingRadius: { group: 'Events', label: 'Landing radius', min: 0.3, max: 3, step: 0.05, default: 1 },
  stoneMass: { group: 'Events', label: 'Stone mass', min: 0.3, max: 3, step: 0.05, default: 1 },
  stoneInterval: { group: 'Events', label: 'Stone interval', min: 0.3, max: 3, step: 0.05, default: 1 },
  ringEnd: { group: 'Events', label: 'Ring size at end', min: 0.3, max: 3, step: 0.05, default: 1 },
  gustForce: { group: 'Events', label: 'Gust force', min: 0, max: 3, step: 0.05, default: 1 },
  plateDecay: { group: 'Events', label: 'Plate decay', min: 0.2, max: 3, step: 0.05, default: 1 },
  plateGain: { group: 'Events', label: 'Plate gain', min: 0.2, max: 3, step: 0.05, default: 1 },
  rhythmWindow: { group: 'Events', label: 'Rhythm window', min: 0.3, max: 3, step: 0.05, default: 1 },
  repTempo: { group: 'Events', label: 'Rep tempo', min: 0.3, max: 3, step: 0.05, default: 1 },
  boardGain: { group: 'Events', label: 'Board gain', min: 0.3, max: 3, step: 0.05, default: 1 },
  airTorque: { group: 'Events', label: 'Air spin', min: 0.3, max: 3, step: 0.05, default: 1 },
  // Rewards
  marblesPerMinute: { group: 'Rewards', label: 'Marbles per minute', min: 0, max: 10, step: 0.5, default: 2 },
  medalScale: { group: 'Rewards', label: 'Medal scale', min: 0.2, max: 3, step: 0.05, default: 1 },
  // Ink
  hull: { group: 'Ink', label: 'Hull', min: 0, max: 0.01, step: 0.0002, default: 0.0028 },
  lineWidth: { group: 'Ink', label: 'Line width', min: 0, max: 4, step: 0.1, default: 1.4 },
  boil: { group: 'Ink', label: 'Boil', min: 0, max: 2, step: 0.05, default: 0.5 },
  grain: { group: 'Ink', label: 'Grain', min: 0, max: 0.2, step: 0.005, default: 0.02 },
};
