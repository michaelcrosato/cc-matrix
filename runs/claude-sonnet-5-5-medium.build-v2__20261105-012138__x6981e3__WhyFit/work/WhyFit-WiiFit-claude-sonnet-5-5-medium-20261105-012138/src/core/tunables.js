// Live tunables: every number a designer would want to nudge. Read through T.x each step.
export const DEFS = [
  ['Balance', 'dotInstability', 'Instability', 0.6, 0, 2, 0.05],
  ['Balance', 'dotAuthority', 'Authority', 3, 0.5, 8, 0.1],
  ['Balance', 'dotDamping', 'Damping', 3.4, 0.5, 8, 0.1],
  ['Balance', 'dotNoise', 'Noise', 0.8, 0, 3, 0.05],
  ['Balance', 'dotLag', 'Input lag', 0.08, 0.01, 0.4, 0.01],
  ['Balance', 'ringScale', 'Ring size', 1, 0.5, 2, 0.05],
  ['Balance', 'gustForce', 'Gust force', 1.6, 0, 4, 0.1],
  ['Balance', 'mouseLeanRadius', 'Mouse lean radius', 70, 30, 160, 5],
  ['Breath and reps', 'breathBonus', 'Breath bonus', 0.55, 0, 1, 0.05],
  ['Breath and reps', 'repLag', 'Rep lag', 0.1, 0.02, 0.5, 0.01],
  ['Breath and reps', 'repFatigue', 'Rep fatigue', 0.1, 0, 0.4, 0.01],
  ['Breath and reps', 'repTempoScale', 'Rep tempo', 1, 0.5, 2, 0.05],
  ['Rhythm', 'stepWindow', 'Step window', 1, 0.5, 2.5, 0.05],
  ['Rhythm', 'stepOffsetMs', 'Step offset (ms)', 0, -200, 200, 5],
  ['Rhythm', 'hoopLow', 'Hoop band low', 0.9, 0.3, 2, 0.05],
  ['Rhythm', 'hoopHigh', 'Hoop band high', 2.4, 1.5, 4, 0.05],
  ['Rhythm', 'hoopLiftRate', 'Hoop lift rate', 0.35, 0.1, 1, 0.05],
  ['Games', 'headerInterval', 'Header interval', 1, 0.5, 2, 0.05],
  ['Games', 'slackWalkInst', 'Slackline walk instab.', 2.6, 0.5, 5, 0.1],
  ['Games', 'trayGravity', 'Tray gravity', 9.8, 3, 20, 0.5],
  ['Games', 'trayMaxTilt', 'Tray max tilt', 14, 5, 30, 1],
  ['Games', 'jogTargetCadence', 'Jog cadence', 3, 2, 4, 0.1],
  ['Games', 'pierBoost', 'Pier distance boost', 2.14, 1, 4, 0.05],
  ['Economy', 'dripRate', 'Drip rate', 1, 0.25, 4, 0.25],
  ['Economy', 'starThresholdScale', 'Star thresholds', 1, 0.5, 1.5, 0.05],
  ['Economy', 'ageTrainingWeight', 'Age training weight', 0.5, 0, 2, 0.1],
];
export const TABS = [...new Set(DEFS.map((d) => d[0]))];
export const T = {};
export const DEFAULTS = {};
for (const [, k, , def] of DEFS) { T[k] = def; DEFAULTS[k] = def; }
export const defsOf = (tab) => DEFS.filter((d) => d[0] === tab);
export function setT(k, v) { if (k in DEFAULTS) T[k] = v; }
export function resetTab(tab) { for (const [t, k, , def] of DEFS) if (t === tab) T[k] = def; }
export function resetAll() { for (const k in DEFAULTS) T[k] = DEFAULTS[k]; }
export const changed = () => Object.fromEntries(Object.keys(DEFAULTS).filter((k) => T[k] !== DEFAULTS[k]).map((k) => [k, T[k]]));
