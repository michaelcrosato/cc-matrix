import { TUNING_DEFAULTS } from '../content/tuning-defaults.js';
/** The live numbers: sliders write here, systems read at the moment of use. */
export const TUNING = { ...TUNING_DEFAULTS };
export const resetTuning = (key) => { if (key) TUNING[key] = TUNING_DEFAULTS[key]; else Object.assign(TUNING, TUNING_DEFAULTS); };
