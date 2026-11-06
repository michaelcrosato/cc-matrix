// Every balance number that matters. DEFAULTS never change; `live` is what the sim reads and what
// Dev Mode's sliders write to. Nothing here touches the engine.
export const DEFAULTS = Object.freeze({
  vitalsDrainMul: 1, bleedDrain: 0.35, mistakePenalty: 6, maxMistakes: 5, timeMul: 1,
  cursorSpeed: 10, steadyFactor: 0.4, aimAssist: 0.6, toleranceMul: 1,
  drainRate: 1.4, laserTime: 0.7, syringeDose: 18,
  composurePerClean: 7, quietSlow: 0.25, quietDrain: 18, secondLookCost: 60, secondLookSeconds: 4,
  strainSpeedMul: 1, strainHpMul: 1, diesIraeBpm: 72,
  codeBlueZone: 0.2, coopScale: 0.25,
});

// Dev Mode's BALANCE tab: [key, label, min, max, step]
export const SLIDERS = [
  ['vitalsDrainMul', 'VITALS DRAIN X', 0, 3, 0.05],
  ['bleedDrain', 'BLEED DRAIN', 0, 1, 0.05],
  ['mistakePenalty', 'MISTAKE PENALTY', 0, 20, 1],
  ['maxMistakes', 'MAX MISTAKES (0 = NO LIMIT)', 0, 10, 1],
  ['timeMul', 'TIME LIMIT X', 0.25, 3, 0.05],
  ['cursorSpeed', 'CURSOR SPEED', 3, 20, 0.5],
  ['steadyFactor', 'STEADY FACTOR', 0.1, 1, 0.05],
  ['aimAssist', 'AIM ASSIST SPEED', 0.2, 1, 0.05],
  ['toleranceMul', 'TOOL TOLERANCE X', 0.5, 3, 0.05],
  ['drainRate', 'DRAIN RATE', 0.3, 4, 0.1],
  ['laserTime', 'LASER BURN TIME', 0.2, 2, 0.05],
  ['syringeDose', 'SYRINGE DOSE', 5, 40, 1],
  ['composurePerClean', 'COMPOSURE PER CLEAN', 0, 25, 1],
  ['quietSlow', 'QUIET SLOW FACTOR', 0.05, 1, 0.05],
  ['quietDrain', 'QUIET DRAIN', 2, 60, 1],
  ['secondLookCost', 'SECOND LOOK COST', 10, 100, 5],
  ['secondLookSeconds', 'SECOND LOOK SECONDS', 1, 8, 0.5],
  ['strainSpeedMul', 'STRAIN SPEED X', 0.25, 3, 0.05],
  ['strainHpMul', 'STRAIN HP X', 0.34, 3, 0.33],
  ['diesIraeBpm', 'DIES IRAE BASE BPM', 40, 110, 2],
  ['codeBlueZone', 'CODE BLUE ZONE WIDTH', 0.05, 0.6, 0.05],
  ['coopScale', 'CO-OP SCALE PER SEAT', 0, 1, 0.05],
];

export function createConfig(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}
export function resetConfig(cfg) {
  Object.assign(cfg, DEFAULTS);
  return cfg;
}
export const DIFFICULTIES = {
  intern: { id: 'intern', label: 'INTERN', time: 1.4, drain: 0.6, saves: 2, hint: true, blurb: 'MORE TIME. SLOWER BLEEDS. TWO CODE BLUE SAVES.' },
  resident: { id: 'resident', label: 'RESIDENT', time: 1, drain: 1, saves: 1, hint: true, blurb: 'THE SHIFT AS IT WAS WRITTEN.' },
  attending: { id: 'attending', label: 'ATTENDING', time: 0.8, drain: 1.3, saves: 1, hint: false, blurb: 'LESS TIME. FASTER BLEEDS. NO HINT MARKER.' },
};
