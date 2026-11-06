import { TUNING } from '../data/tuning.js';
export const T = {};
export function resetTuning() { for (const k in TUNING) T[k] = TUNING[k].default; }
resetTuning();
export const tuningGroups = () => { const g = {}; for (const k in TUNING) (g[TUNING[k].group] ||= []).push(k); return g; };
export const tuningJSON = () => JSON.stringify(T, null, 1);
