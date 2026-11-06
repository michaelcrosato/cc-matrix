// Wear and jam arithmetic: pure functions, tested against the plan's numbers.
import { TUNING } from '../core/tuning.js';
export const jamChance = (cond) => TUNING.jamRate * 0.12 * Math.pow(Math.max(0, 1 - cond / 100), 2);
export const wearPerShot = (wear, upgraded) => wear * TUNING.wearRate * (upgraded ? 0.6 : 1);
/** the look of a gun at a condition: nothing on the HUD, everything on the gun */
export function gunStage(cond) {
  if (cond <= 0) return 'broken';
  if (cond < 10) return 'rattle';
  if (cond < 30) return 'tape';
  if (cond < 60) return 'rust';
  return 'clean';
}
export const condIconColor = (cond) => (cond >= 60 ? 'white' : cond >= 30 ? 'orange' : 'red');
export const pressesToClear = (rng) => rng.int(2, 4);
