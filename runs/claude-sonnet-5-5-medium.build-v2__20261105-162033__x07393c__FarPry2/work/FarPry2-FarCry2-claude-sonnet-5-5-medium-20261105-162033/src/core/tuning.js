import { TUNING_DEFAULTS } from '../content/tuning-defaults.js';
export const TUNING = { ...TUNING_DEFAULTS };
export function resetTuning(key) {
  if (key) TUNING[key] = TUNING_DEFAULTS[key];
  else Object.assign(TUNING, TUNING_DEFAULTS);
}
