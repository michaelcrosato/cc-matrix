// The live sliders. Every value is read by game code every step through `T`.
export const TUNABLE_DEFS = [
  // Balance
  { tab: 'Balance', id: 'dotInstability', label: 'Instability', def: 0.6, min: 0, max: 2, step: 0.05 },
  { tab: 'Balance', id: 'dotAuthority', label: 'Authority', def: 3, min: 0.5, max: 6, step: 0.1 },
  { tab: 'Balance', id: 'dotDamping', label: 'Damping', def: 3.4, min: 0.5, max: 8, step: 0.1 },
  { tab: 'Balance', id: 'dotNoise', label: 'Noise', def: 0.8, min: 0, max: 3, step: 0.05 },
  { tab: 'Balance', id: 'dotLag', label: 'Input lag', def: 0.08, min: 0.01, max: 0.4, step: 0.01 },
  { tab: 'Balance', id: 'ringScale', label: 'Ring scale', def: 1, min: 0.5, max: 2, step: 0.05 },
  { tab: 'Balance', id: 'gustForce', label: 'Gust force', def: 1.6, min: 0, max: 4, step: 0.1 },
  { tab: 'Balance', id: 'mouseLeanRadius', label: 'Mouse radius', def: 70, min: 20, max: 140, step: 5 },
  // Breath and reps
  { tab: 'Breath and reps', id: 'breathBonus', label: 'Breath bonus', def: 0.55, min: 0, max: 1, step: 0.05 },
  { tab: 'Breath and reps', id: 'repLag', label: 'Rep lag', def: 0.1, min: 0.01, max: 0.5, step: 0.01 },
  { tab: 'Breath and reps', id: 'repFatigue', label: 'Rep fatigue', def: 0.1, min: 0, max: 0.5, step: 0.01 },
  { tab: 'Breath and reps', id: 'repTempoScale', label: 'Rep tempo', def: 1, min: 0.5, max: 2, step: 0.05 },
  // Rhythm
  { tab: 'Rhythm', id: 'stepWindow', label: 'Step window', def: 1, min: 0.5, max: 2, step: 0.05 },
  { tab: 'Rhythm', id: 'stepOffsetMs', label: 'Step offset ms', def: 0, min: -200, max: 200, step: 5 },
  { tab: 'Rhythm', id: 'hoopLow', label: 'Hoop low', def: 0.9, min: 0.2, max: 2, step: 0.05 },
  { tab: 'Rhythm', id: 'hoopHigh', label: 'Hoop high', def: 2.4, min: 1, max: 4, step: 0.05 },
  { tab: 'Rhythm', id: 'hoopLiftRate', label: 'Hoop lift', def: 0.35, min: 0.05, max: 1, step: 0.05 },
  // Games
  { tab: 'Games', id: 'headerInterval', label: 'Header gap', def: 1, min: 0.4, max: 2, step: 0.05 },
  { tab: 'Games', id: 'slackWalkInst', label: 'Slack wobble', def: 2.6, min: 0.6, max: 5, step: 0.1 },
  { tab: 'Games', id: 'trayGravity', label: 'Tray gravity', def: 9.8, min: 2, max: 24, step: 0.2 },
  { tab: 'Games', id: 'trayMaxTilt', label: 'Tray tilt', def: 14, min: 4, max: 30, step: 1 },
  { tab: 'Games', id: 'jogTargetCadence', label: 'Jog cadence', def: 3, min: 2, max: 4, step: 0.05 },
  { tab: 'Games', id: 'pierBoost', label: 'Pier boost', def: 2.14, min: 1, max: 4, step: 0.02 },
  // Economy
  { tab: 'Economy', id: 'dripRate', label: 'Drip rate', def: 1, min: 0, max: 4, step: 0.1 },
  { tab: 'Economy', id: 'starThresholdScale', label: 'Star bar', def: 1, min: 0.5, max: 1.5, step: 0.05 },
  { tab: 'Economy', id: 'ageTrainingWeight', label: 'Age weight', def: 0.5, min: 0, max: 2, step: 0.05 },
];

export const TUNABLE_TABS = ['Balance', 'Breath and reps', 'Rhythm', 'Games', 'Economy'];

/** The live values. Plain object, read every step. */
export const T = Object.fromEntries(TUNABLE_DEFS.map((d) => [d.id, d.def]));

export function resetTunables(tab = null) {
  for (const d of TUNABLE_DEFS) if (!tab || d.tab === tab) T[d.id] = d.def;
}

export function changedTunables() {
  const out = {};
  for (const d of TUNABLE_DEFS) if (T[d.id] !== d.def) out[d.id] = T[d.id];
  return out;
}

export function nudgeTunable(def, dir) {
  const v = T[def.id] + dir * def.step;
  T[def.id] = Math.round(Math.min(def.max, Math.max(def.min, v)) * 1000) / 1000;
}
