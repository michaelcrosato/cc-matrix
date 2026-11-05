import { CFG } from './config.js';
import BAKED from './medals_baked.js';
/** thresholds from the author's time (the bot at full skill, baked by tools/bake.mjs): author <= 1.0, gold 1.06, silver 1.2, bronze 1.5 */
export const thresholds = id => { const a = BAKED[id]; if (!a) return null; const k = CFG.medalSlack; return [0, Math.round(a * 1.5 * k), Math.round(a * 1.2 * k), Math.round(a * 1.06 * k), a]; };
/** 0 none, 1 bronze, 2 silver, 3 gold, 4 author */
export const medalFor = (id, steps) => { const t = thresholds(id); if (!t) return 0; for (let m = 4; m >= 1; m--) if (steps <= t[m]) return m; return 0; };
export const authorTime = id => BAKED[id];
