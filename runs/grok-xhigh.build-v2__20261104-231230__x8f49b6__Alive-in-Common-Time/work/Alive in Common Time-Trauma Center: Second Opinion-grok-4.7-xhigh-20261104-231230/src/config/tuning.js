/** Live tuning. Sliders mutate the object the sim reads every step. */
export const TUNING_DEFAULTS = Object.freeze({
  tipSpeed: 1.9,
  stickCurve: 1.7,
  aimAssist: 0.35,
  steadyFactor: 0.4,
  scalpelTol: 0.055,
  pullTol: 1.6,
  suctionRate: 1.0,
  gelRadius: 0.16,
  stitchGateR: 0.07,
  laserDps: 30,
  laserBurn: 2,
  scannerRadius: 0.3,
  clampWindow: 0.18,
  defibWindow: 0.30,
  drainMult: 1,
  timerMult: 1,
  tempoPressure: 60,
  stabilizerHeal: 15,
  stabilizerCooldown: 3,
  missLimit: 8,
  strainHpMult: 1,
  strainSpeedMult: 1,
  spawnRateMult: 1,
  composureGain: 1,
  hushDuration: 7,
  hushTimeScale: 0.25,
  sforzandoStun: 3,
  sforzandoDamage: 0.25,
  sforzandoToolMult: 2,
  sforzandoDuration: 6,
});

export const TUNING_RANGES = Object.freeze({
  tipSpeed: [0.8, 3.5],
  stickCurve: [1, 3],
  aimAssist: [0, 1],
  steadyFactor: [0.2, 0.8],
  scalpelTol: [0.02, 0.12],
  pullTol: [0.6, 3],
  suctionRate: [0.3, 3],
  gelRadius: [0.08, 0.3],
  stitchGateR: [0.03, 0.15],
  laserDps: [10, 80],
  laserBurn: [0, 6],
  scannerRadius: [0.15, 0.5],
  clampWindow: [0.06, 0.4],
  defibWindow: [0.1, 0.6],
  drainMult: [0, 3],
  timerMult: [0.5, 2],
  tempoPressure: [0, 120],
  stabilizerHeal: [5, 30],
  stabilizerCooldown: [0.5, 8],
  missLimit: [3, 20],
  strainHpMult: [0.3, 3],
  strainSpeedMult: [0.3, 2.5],
  spawnRateMult: [0.3, 2.5],
  composureGain: [0.2, 3],
  hushDuration: [2, 15],
  hushTimeScale: [0.05, 0.7],
  sforzandoStun: [1, 6],
  sforzandoDamage: [0.05, 0.6],
  sforzandoToolMult: [1.2, 4],
  sforzandoDuration: [2, 12],
});

export const TUNING_PAGES = Object.freeze([
  { id: 'hands', label: 'Hands', keys: ['tipSpeed', 'stickCurve', 'aimAssist', 'steadyFactor'] },
  { id: 'tools', label: 'Tools', keys: ['scalpelTol', 'pullTol', 'suctionRate', 'gelRadius', 'stitchGateR', 'laserDps', 'laserBurn', 'scannerRadius', 'clampWindow', 'defibWindow'] },
  { id: 'patient', label: 'Patient', keys: ['drainMult', 'timerMult', 'tempoPressure', 'stabilizerHeal', 'stabilizerCooldown', 'missLimit'] },
  { id: 'strains', label: 'Strains', keys: ['strainHpMult', 'strainSpeedMult', 'spawnRateMult'] },
  { id: 'gifts', label: 'Gifts', keys: ['composureGain', 'hushDuration', 'hushTimeScale', 'sforzandoStun', 'sforzandoDamage', 'sforzandoToolMult', 'sforzandoDuration'] },
]);

export function createTuning(over) {
  return { ...TUNING_DEFAULTS, ...over };
}

/** Copy defaults back onto a live object so holders of the reference see the reset. */
export function resetTuning(live, keys) {
  const list = keys ?? Object.keys(TUNING_DEFAULTS);
  for (const k of list) live[k] = TUNING_DEFAULTS[k];
  return live;
}

export const DIFFICULTY = Object.freeze({
  intern: { id: 'intern', label: 'Intern', drains: 0.6, timers: 1.4, tol: 1.4, miss: 12, hp: 0.85 },
  resident: { id: 'resident', label: 'Resident', drains: 1, timers: 1, tol: 1, miss: 8, hp: 1 },
  attending: { id: 'attending', label: 'Attending', drains: 1.35, timers: 0.85, tol: 0.8, miss: 5, hp: 1.2 },
});

export function resolveDifficulty(id) {
  if (id === 'easy') return DIFFICULTY.intern;
  if (id === 'normal' || !id) return DIFFICULTY.resident;
  if (id === 'hard') return DIFFICULTY.attending;
  return DIFFICULTY[id] ?? DIFFICULTY.resident;
}
