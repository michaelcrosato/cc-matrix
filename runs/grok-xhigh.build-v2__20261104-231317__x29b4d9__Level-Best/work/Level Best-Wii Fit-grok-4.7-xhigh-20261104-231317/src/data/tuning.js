/** Live tuning. Every entry is { group, label, min, max, step, default }. Degrees stay degrees until the step converts them. */
export const TUNING_DEFS = [
  { id: 'maxLean', group: 'Balance', label: 'Max lean', min: 8, max: 30, step: 0.5, default: 18, unit: 'deg' },
  { id: 'margin', group: 'Balance', label: 'Margin', min: 0.1, max: 1.2, step: 0.01, default: 0.45 },
  { id: 'zeta', group: 'Balance', label: 'Damping', min: 0.05, max: 1.2, step: 0.01, default: 0.4 },
  { id: 'ankleMax', group: 'Balance', label: 'Ankle strength', min: 2, max: 10, step: 0.1, default: 4.6 },
  { id: 'fallAngle', group: 'Balance', label: 'Fall angle', min: 25, max: 70, step: 1, default: 45, unit: 'deg' },
  { id: 'reflex', group: 'Balance', label: 'Reflex', min: 1, max: 30, step: 0.5, default: 10 },
  { id: 'flailBoost', group: 'Balance', label: 'Flail boost', min: 1, max: 3, step: 0.05, default: 1.9 },
  { id: 'flailCooldown', group: 'Balance', label: 'Flail cooldown', min: 0.2, max: 5, step: 0.1, default: 2, unit: 's' },
  { id: 'swayScale', group: 'Balance', label: 'Sway scale', min: 0, max: 2, step: 0.05, default: 1 },
  { id: 'tremorScale', group: 'Balance', label: 'Tremor scale', min: 0, max: 2, step: 0.05, default: 1 },
  { id: 'recoverTime', group: 'Balance', label: 'Recover time', min: 0.4, max: 5, step: 0.1, default: 2.2, unit: 's' },
  { id: 'gravity', group: 'World', label: 'Gravity', min: 2, max: 20, step: 0.1, default: 9.81 },
  { id: 'islandWeight', group: 'World', label: 'Island weight at rim', min: 0, max: 10, step: 0.1, default: 4, unit: 'deg' },
  { id: 'islandRest', group: 'World', label: 'Island rest tilt', min: 0, max: 12, step: 0.1, default: 9, unit: 'deg' },
  { id: 'islandSpring', group: 'World', label: 'Island spring', min: 0.2, max: 8, step: 0.1, default: 2.2 },
  { id: 'walkSpeed', group: 'World', label: 'Walk speed', min: 1, max: 8, step: 0.1, default: 4 },
  { id: 'fruitMass', group: 'Events', label: 'Fruit mass', min: 0.005, max: 0.08, step: 0.001, default: 0.015 },
  { id: 'fruitInterval', group: 'Events', label: 'Fruit interval', min: 0.4, max: 3, step: 0.05, default: 1.6, unit: 's' },
  { id: 'landingRadius', group: 'Events', label: 'Landing radius', min: 0.2, max: 1.2, step: 0.01, default: 0.45 },
  { id: 'stoneMass', group: 'Events', label: 'Stone mass', min: 0.005, max: 0.08, step: 0.001, default: 0.02 },
  { id: 'stoneInterval', group: 'Events', label: 'Stone interval', min: 1, max: 8, step: 0.1, default: 5.5, unit: 's' },
  { id: 'ringEnd', group: 'Events', label: 'Ring size at end', min: 0.05, max: 0.4, step: 0.01, default: 0.16 },
  { id: 'gustForce', group: 'Events', label: 'Gust force', min: 0, max: 6, step: 0.1, default: 1.2 },
  { id: 'plateDecay', group: 'Events', label: 'Plate decay', min: 0.02, max: 0.4, step: 0.01, default: 0.11 },
  { id: 'plateGain', group: 'Events', label: 'Plate gain', min: 0.05, max: 1, step: 0.01, default: 0.45 },
  { id: 'rhythmWindow', group: 'Events', label: 'Rhythm window', min: 0.5, max: 1.8, step: 0.05, default: 1 },
  { id: 'repTempo', group: 'Events', label: 'Rep tempo', min: 0.5, max: 1.8, step: 0.05, default: 1 },
  { id: 'boardGain', group: 'Events', label: 'Board gain', min: 2, max: 16, step: 0.5, default: 8 },
  { id: 'airTorque', group: 'Events', label: 'Air spin', min: 1, max: 8, step: 0.1, default: 3.4 },
  { id: 'marblesPerMin', group: 'Rewards', label: 'Marbles per minute', min: 0, max: 8, step: 0.5, default: 2 },
  { id: 'medalScale', group: 'Rewards', label: 'Medal scale', min: 0.5, max: 2, step: 0.05, default: 1 },
  { id: 'inkHull', group: 'Ink', label: 'Hull', min: 0, max: 0.01, step: 0.0001, default: 0.0028 },
  { id: 'inkWidth', group: 'Ink', label: 'Line width', min: 0.2, max: 4, step: 0.1, default: 1.4 },
  { id: 'inkBoil', group: 'Ink', label: 'Line boil', min: 0, max: 2, step: 0.05, default: 0.5 },
  { id: 'inkGrain', group: 'Ink', label: 'Grain', min: 0, max: 0.1, step: 0.005, default: 0.02 },
];

export const TUNING_DEFAULTS = Object.fromEntries(TUNING_DEFS.map((d) => [d.id, d.default]));

export function clampTuning(id, value) {
  const def = TUNING_DEFS.find((d) => d.id === id);
  if (!def) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return def.default;
  const stepped = Math.round((n - def.min) / def.step) * def.step + def.min;
  return Math.min(def.max, Math.max(def.min, Number(stepped.toFixed(6))));
}
