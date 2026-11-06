// The Balance tab: every slider and the reset.
import { SLIDERS } from '../content/tuning-defaults.js';
import { resetTuning, TUNING } from '../core/tuning.js';
import { clamp } from '../world/geom.js';
const act = (label, action) => ({ label, small: true, action });
export const balanceItems = (g) => [...SLIDERS.map((s) => ({ label: s.label, small: true, value: () => (TUNING[s.key] - s.min) / (s.max - s.min), valueText: () => String(Math.round(TUNING[s.key] * 100) / 100), adjust: (d) => { TUNING[s.key] = clamp(Math.round((TUNING[s.key] + d * s.step) * 1000) / 1000, s.min, s.max); }, set: (v) => { TUNING[s.key] = s.min + v * (s.max - s.min); }, resetOne: () => resetTuning(s.key) })), act('RESET ALL TO DEFAULTS', () => resetTuning())];
