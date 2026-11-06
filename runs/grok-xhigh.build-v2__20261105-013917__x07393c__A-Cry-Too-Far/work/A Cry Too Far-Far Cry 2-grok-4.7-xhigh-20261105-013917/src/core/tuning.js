import { TUNING_DEFAULTS } from '../content/tuning-defaults.js';

export const TUNING = { ...TUNING_DEFAULTS };

export function resetTuning() {
  for (const k of Object.keys(TUNING_DEFAULTS)) TUNING[k] = TUNING_DEFAULTS[k];
}

export function setTuning(key, value) {
  if (!(key in TUNING_DEFAULTS)) return false;
  TUNING[key] = value;
  return true;
}
