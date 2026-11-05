// Live tuning: the dev sliders read and write TUNE (car/sim.js); this file says how each one moves and what it is called.
import { TUNE, TUNE_DEFAULT } from './car/sim.js';

export const SLIDERS = [
  { key: 'gas', label: 'Engine push', unit: ' m/s²', min: 2, max: 30, step: 1 },
  { key: 'vtop', label: 'Top speed', unit: ' m/s', min: 20, max: 120, step: 2 },
  { key: 'brake', label: 'Brake', unit: ' m/s²', min: 4, max: 40, step: 1 },
  { key: 'grip', label: 'Grip', unit: ' /s', min: 2, max: 30, step: 1 },
  { key: 'driftGrip', label: 'Drift grip', unit: ' /s', min: .5, max: 10, step: .5 },
  { key: 'steerRate', label: 'Steering', unit: ' rad/s', min: .5, max: 6, step: .1 },
  { key: 'steerFall', label: 'Steering at speed', unit: ' m/s', min: 5, max: 80, step: 2 },
  { key: 'adhesion', label: 'Road hold', unit: ' m/s²', min: 0, max: 30, step: 1 },
  { key: 'gravity', label: 'Gravity', unit: ' m/s²', min: 2, max: 30, step: .5 },
  { key: 'boost', label: 'Boost push', unit: ' m/s²', min: 0, max: 30, step: 1 },
  { key: 'boostTime', label: 'Boost time', unit: ' s', min: .2, max: 4, step: .1 },
  { key: 'drag', label: 'Air and road drag', unit: '', min: 0, max: .003, step: .0001, fixed: 4 },
];

/** a slider's value as text */
export function sliderText(s) {
  const v = TUNE[s.key], d = s.fixed ?? (s.step < 1 ? 1 : 0);
  return v.toFixed(d) + s.unit;
}
/** moves a slider by its step (dir -1 or 1), clamped */
export function nudge(s, dir) {
  const v = Math.min(s.max, Math.max(s.min, +(TUNE[s.key] + dir * s.step).toFixed(6)));
  TUNE[s.key] = v;
  return v;
}
/** every tunable value back to the defaults */
export function resetTuning() {
  for (const k of Object.keys(TUNE_DEFAULT)) TUNE[k] = TUNE_DEFAULT[k];
}
