// The five days and what follows. Events cut from the registry are skipped automatically.
export const DAYS = [
  { day: 1, name: 'Arrival', tests: ['standStill', 'leanMatch', 'stepTime'], classes: ['poses', 'fruitHat'], teaches: 'Lean, flail, breath, the jar' },
  { day: 2, name: 'The Second Day, Which Is Harder', tests: ['standStill', 'leanMatch', 'quickLean'], classes: ['logReps', 'stepClass', 'cairn'], teaches: 'Feet, rhythm, stacking' },
  { day: 3, name: 'Service With a Wobble', tests: ['oneFoot', 'leanMatch', 'stepTime'], classes: ['roomService', 'plates', 'plank'], teaches: 'Stepping, stick circles. The Mirror opens', opens: 'mirror' },
  { day: 4, name: 'A Little Damp', tests: ['quickLean', 'oneFoot', 'standStill'], classes: ['springboard', 'stillWater', 'islandLoop'], teaches: 'Air control. Group Class invitation', opens: 'group' },
  { day: 5, name: 'Level Day', tests: 'best', classes: ['raft', 'tug', 'grandHold'], teaches: 'The ending' },
];
export const MAINTENANCE = { name: 'Maintenance', tests: 'random', classes: 3 };
export const HANDICAP = [24, 16, 8, 3, 0];
export const AGE_MIN = 18, AGE_MAX = 99;
/** Rest tilt in degrees from programme progress: 9° × (1 − completed / total). */
export function restTilt(stepsDone, total, full = 9) { return full * (1 - Math.min(stepsDone, total) / Math.max(1, total)); }
export function wobbleAge(mean, handicap) {
  const age = Math.round(18 + 81 * (1 - Math.max(0, Math.min(1, mean))) ** 1.3 + handicap);
  return Math.max(AGE_MIN, Math.min(AGE_MAX, age));
}
export function marblesFor(activeMinutes, medalBonus, firstClear, perMinute = 2) {
  return Math.max(2, Math.round(perMinute * activeMinutes)) + medalBonus + (firstClear ? 2 : 0);
}
export const CHECKIN_MARBLES = 1;
export const TESTS = {
  standStill: { title: 'Stand Still', how: 'Keep the dot in the middle.', time: 10, sway: 0.1, tremor: 0.06 },
  leanMatch: { title: 'Lean Match', how: 'Lean exactly as far as Trudy asks.', time: 18, sway: 0.04, tremor: 0 },
  stepTime: { title: 'Step Time', how: 'Alternate your feet with the clicks.', time: 16, sway: 0, tremor: 0 },
  quickLean: { title: 'Quick Lean', how: 'Lean toward the lit side, quickly.', time: 15, sway: 0.03, tremor: 0 },
  oneFoot: { title: 'One-Foot Hold', how: 'Keep your right foot down, your left foot up, and the dot in the middle.', time: 12, sway: 0.1, tremor: 0.06 },
};
