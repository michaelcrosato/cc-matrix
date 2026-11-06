// Balance variables: defaults + live values. Dev Mode edits `cfg`; reset() restores.
export const DEFAULTS = {
  drainMul: 1, bleedDrain: 0.35, mistakePenalty: 6, maxMistakes: 5, timeMul: 1,
  cursorSpeed: 10, steadyFactor: 0.4, aimAssist: 0.6, tolMul: 1,
  drainRate: 1.4, laserTime: 0.7, syringeDose: 18,
  composureGain: 7, quietSlow: 0.25, quietDrain: 18, lookCost: 60, lookSeconds: 4,
  strainSpeed: 1, strainHp: 1, wrathBpm: 72, codeBlueZone: 0.2, coopScale: 0.25,
};
export const SLIDERS = [
  ['drainMul', 'VITALS DRAIN X', 0.2, 3, 0.05], ['bleedDrain', 'BLEED DRAIN', 0, 1.5, 0.05],
  ['mistakePenalty', 'MISTAKE COST', 0, 20, 1], ['maxMistakes', 'MAX MISTAKES', 0, 12, 1],
  ['timeMul', 'TIME LIMIT X', 0.3, 3, 0.05], ['cursorSpeed', 'CURSOR SPEED', 4, 20, 0.5],
  ['steadyFactor', 'STEADY FACTOR', 0.1, 1, 0.05], ['aimAssist', 'AIM ASSIST', 0, 1, 0.05],
  ['tolMul', 'TOOL TOLERANCE X', 0.5, 3, 0.05], ['drainRate', 'DRAIN RATE', 0.4, 4, 0.1],
  ['laserTime', 'LASER BURN TIME', 0.2, 2.5, 0.05], ['syringeDose', 'SYRINGE DOSE', 5, 40, 1],
  ['composureGain', 'COMPOSURE PER CLEAN', 0, 25, 1], ['quietSlow', 'QUIET SLOW FACTOR', 0.05, 1, 0.05],
  ['quietDrain', 'QUIET DRAIN', 0, 60, 1], ['lookCost', 'SECOND LOOK COST', 0, 100, 5],
  ['lookSeconds', 'SECOND LOOK SECONDS', 1, 8, 0.5], ['strainSpeed', 'STRAIN SPEED X', 0.3, 3, 0.05],
  ['strainHp', 'STRAIN HP X', 0.5, 4, 0.5], ['wrathBpm', 'WRATH BASE BPM', 50, 100, 1],
  ['codeBlueZone', 'CODE BLUE ZONE', 0.08, 0.6, 0.02], ['coopScale', 'CO-OP SCALE/SEAT', 0, 1, 0.05],
];
export const cfg = { ...DEFAULTS };
export const resetConfig = () => Object.assign(cfg, DEFAULTS);
export const DIFFS = {
  intern: { time: 1.4, drain: 0.6, saves: 2, hint: true },
  resident: { time: 1, drain: 1, saves: 1, hint: true },
  attending: { time: 0.8, drain: 1.3, saves: 1, hint: false },
};
