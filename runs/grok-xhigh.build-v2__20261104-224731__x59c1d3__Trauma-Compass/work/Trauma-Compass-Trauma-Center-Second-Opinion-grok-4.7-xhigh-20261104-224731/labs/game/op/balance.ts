/**
 * @file Difficulty scales and the live balance sliders (labs/game/op/types.ts). Defaults are the Resident shift.
 * `setSlider` clamps into the published range. `resetSliders` puts every key back, including the slip limit the
 * difficulty chose when the operation was created.
 */
import type { Balance, Difficulty, Op } from './types';

/** Drain, clock, parasite HP and the slip cap for each difficulty. */
export const DIFFICULTY = {
  intern: { drain: 0.6, clock: 1.3, hp: 0.75, speed: 0.75, slips: 10 },
  resident: { drain: 1, clock: 1, hp: 1, speed: 1, slips: 5 },
  attending: { drain: 1.3, clock: 0.85, hp: 1.25, speed: 1.25, slips: 3 },
} as const;

/** One slider: the value a fresh Resident operation starts with, and the range a Dev Mode row allows. */
export interface SliderSpec {
  key: keyof Balance;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

/** The balance rows, in the order Dev Mode shows them. */
export const SLIDERS: readonly SliderSpec[] = [
  { key: 'vitalsDrain', label: 'Vitals drain', min: 0, max: 3, step: 0.05, default: 1 },
  { key: 'bleed', label: 'Bleeds', min: 0, max: 3, step: 0.05, default: 1 },
  { key: 'clock', label: 'Clock', min: 0.4, max: 2, step: 0.05, default: 1 },
  { key: 'slips', label: 'Slip limit', min: 1, max: 20, step: 1, default: 5 },
  { key: 'cursor', label: 'Cursor speed', min: 2, max: 18, step: 0.5, default: 8 },
  { key: 'scalpel', label: 'Scalpel textbook band', min: 0.05, max: 1, step: 0.01, default: 0.18 },
  { key: 'forceps', label: 'Forceps pull', min: 0.4, max: 3, step: 0.05, default: 1.2 },
  { key: 'suture', label: 'Suture spacing', min: 0.2, max: 1, step: 0.05, default: 0.45 },
  { key: 'drain', label: 'Drain rate', min: 0.2, max: 6, step: 0.1, default: 2.4 },
  { key: 'laser', label: 'Laser time', min: 0.2, max: 4, step: 0.05, default: 1.2 },
  { key: 'syringe', label: 'Syringe band centre', min: 0.5, max: 1, step: 0.01, default: 0.85 },
  { key: 'gel', label: 'Gel radius', min: 0.2, max: 2, step: 0.05, default: 0.7 },
  { key: 'scanner', label: 'Scanner range', min: 1, max: 8, step: 0.1, default: 3 },
  { key: 'giftWindow', label: 'Gift window', min: 40, max: 300, step: 5, default: 140 },
  { key: 'giftTime', label: 'Gift duration', min: 0.5, max: 2, step: 0.05, default: 1 },
  { key: 'strainHp', label: 'Strain toughness', min: 0.25, max: 3, step: 0.05, default: 1 },
  { key: 'strainSpeed', label: 'Strain speed', min: 0.25, max: 3, step: 0.05, default: 1 },
  { key: 'coopHp', label: 'Co-op health', min: 0, max: 2, step: 0.05, default: 0.6 },
];

/** A fresh balance object at the published defaults. */
export function defaultBalance(): Balance {
  const balance = {} as Balance;
  for (const slider of SLIDERS) balance[slider.key] = slider.default;
  return balance;
}

/** The slider spec for `key`, if it is one of ours. */
export function sliderSpec(key: string): SliderSpec | undefined {
  return SLIDERS.find((slider) => slider.key === key);
}

/** Clamp `value` into the slider's range and write it. The slip slider also sets the live cap. */
export function setSlider(op: Op, key: string, value: number): number {
  const spec = sliderSpec(key);
  if (!spec || !Number.isFinite(value)) return 0;
  const next = Math.min(spec.max, Math.max(spec.min, value));
  op.balance[spec.key] = next;
  if (spec.key === 'slips') op.slipLimit = Math.round(next);
  return next;
}

/** Put every slider, and the slip cap, back to the defaults this operation was born with. */
export function resetSliders(op: Op): void {
  op.balance = defaultBalance();
  op.balance.slips = op.slipDefault;
  op.slipLimit = op.slipDefault;
}

/** Difficulty row for an operation. */
export function diffOf(difficulty: Difficulty): (typeof DIFFICULTY)[Difficulty] {
  return DIFFICULTY[difficulty];
}
