import { TUNING_DEFS, TUNING_DEFAULTS, clampTuning } from '../data/tuning.js';

const values = { ...TUNING_DEFAULTS };
const listeners = new Set();

export function tuning() {
  return values;
}

export function getTune(id) {
  return values[id];
}

export function setTune(id, value) {
  if (!Object.prototype.hasOwnProperty.call(TUNING_DEFAULTS, id)) return;
  values[id] = clampTuning(id, value);
  for (const fn of listeners) fn(id, values[id]);
}

export function resetTuning() {
  for (const def of TUNING_DEFS) values[def.id] = def.default;
  for (const fn of listeners) fn('*', null);
}

export function onTune(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function tuningSnapshot() {
  return { ...values };
}

export function applyTuning(partial) {
  if (!partial) return;
  for (const [id, value] of Object.entries(partial)) setTune(id, value);
}

export { TUNING_DEFS, TUNING_DEFAULTS };
