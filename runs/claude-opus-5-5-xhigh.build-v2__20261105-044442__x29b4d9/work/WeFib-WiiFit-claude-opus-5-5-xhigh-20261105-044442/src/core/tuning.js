import { TUNING } from '../data/tuning.js';
// tun.<key> is always the live value. Dev Mode writes it; the game reads it each step.
export const tun = {};
export function resetTuning() { for (const k of Object.keys(TUNING)) tun[k] = TUNING[k].default; }
export function tuningJSON() { return JSON.stringify(tun, null, 1); }
export const rel = (k) => tun[k] / TUNING[k].default;
resetTuning();
