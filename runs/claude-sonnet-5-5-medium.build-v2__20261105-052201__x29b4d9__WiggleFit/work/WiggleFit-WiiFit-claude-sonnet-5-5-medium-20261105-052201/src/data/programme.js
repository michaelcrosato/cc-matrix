// Day table: ids that are missing from the registry are skipped, so a cut event leaves a working programme.
export const DAYS = [
  { n: 1, name: 'Arrival', checks: ['standStill', 'leanMatch', 'stepTime'], classes: ['poses', 'fruitHat'], palette: 'dawn', teach: 'Lean, flail, breath, the jar' },
  { n: 2, name: 'The Second Day, Which Is Harder', checks: ['standStill', 'leanMatch', 'quickLean'], classes: ['logReps', 'stepClass', 'cairn'], palette: 'noon', teach: 'Feet, rhythm, stacking' },
  { n: 3, name: 'Service With a Wobble', checks: ['oneFoot', 'leanMatch', 'stepTime'], classes: ['roomService', 'plates', 'plank'], palette: 'golden', teach: 'Stepping, stick circles. The Mirror opens' },
  { n: 4, name: 'A Little Damp', checks: ['quickLean', 'oneFoot', 'standStill'], classes: ['springboard', 'stillWater', 'islandLoop'], palette: 'noon', teach: 'Air control. Group Class invitation' },
  { n: 5, name: 'Level Day', checks: ['best3'], classes: ['raft', 'tug', 'grandHold'], palette: 'golden', teach: 'The ending' },
];
export const MAINT_POOL = ['poses', 'fruitHat', 'logReps', 'stepClass', 'cairn', 'roomService', 'plates', 'springboard', 'raft'];
export const CHECK_NAMES = { standStill: 'Stand Still', leanMatch: 'Lean Match', stepTime: 'Step Time', quickLean: 'Quick Lean', oneFoot: 'One-Foot Hold' };
