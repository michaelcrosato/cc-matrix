import { DOT_DEFAULTS } from './dot.js';

/** Live sliders. Read every step. Defaults match the plan. */
export const TUNABLE_TABS = {
  Balance: [
    ['dotInstability', 0.6, 0, 4, 0.05],
    ['dotAuthority', 3, 0, 8, 0.1],
    ['dotDamping', 3.4, 0, 8, 0.1],
    ['dotNoise', 0.8, 0, 4, 0.05],
    ['dotLag', 0.08, 0.01, 0.4, 0.01],
    ['ringScale', 1, 0.5, 2, 0.05],
    ['gustForce', 1.6, 0, 4, 0.1],
    ['mouseLeanRadius', 70, 20, 160, 2],
  ],
  'Breath and reps': [
    ['breathBonus', 0.55, 0, 1, 0.05],
    ['repLag', 0.1, 0.02, 0.4, 0.01],
    ['repFatigue', 0.1, 0, 0.5, 0.01],
    ['repTempoScale', 1, 0.5, 2, 0.05],
  ],
  Rhythm: [
    ['stepWindow', 1, 0.5, 2, 0.05],
    ['stepOffsetMs', 0, -80, 80, 5],
    ['hoopLow', 0.9, 0.2, 2, 0.05],
    ['hoopHigh', 2.4, 1, 4, 0.05],
    ['hoopLiftRate', 0.35, 0.05, 1, 0.05],
  ],
  Games: [
    ['headerInterval', 1, 0.4, 2, 0.05],
    ['slackWalkInst', 2.6, 0.5, 5, 0.1],
    ['trayGravity', 9.8, 2, 24, 0.2],
    ['trayMaxTilt', 14, 4, 30, 1],
    ['jogTargetCadence', 3, 1.5, 5, 0.1],
    ['pierBoost', 2.14, 1, 3, 0.02],
  ],
  Economy: [
    ['dripRate', 1, 0, 3, 0.1],
    ['starThresholdScale', 1, 0.5, 1.5, 0.05],
    ['ageTrainingWeight', 0.5, 0, 2, 0.05],
  ],
};

export function defaultTunables() {
  const t = { ...DOT_DEFAULTS };
  for (const rows of Object.values(TUNABLE_TABS)) {
    for (const [key, value] of rows) t[key] = value;
  }
  return t;
}

export const DEFAULT_TUNABLES = defaultTunables();

export function cloneTunables(src = DEFAULT_TUNABLES) {
  return { ...src };
}

export function tabKeys(name) {
  return (TUNABLE_TABS[name] || []).map((row) => row[0]);
}
