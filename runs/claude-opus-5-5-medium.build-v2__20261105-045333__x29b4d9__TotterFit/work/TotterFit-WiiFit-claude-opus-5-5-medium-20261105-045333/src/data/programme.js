// Day table. Build from the event registry: a cut event is skipped and everything still works.
export const DAYS = [
  { day: 1, name: 'Arrival', tests: ['standStill', 'leanMatch', 'stepTime'], classes: ['poses', 'fruitHat'], palette: ['dawn', 'noon', 'golden'], teach: 'Lean, flail, breath, the jar' },
  { day: 2, name: 'The Second Day, Which Is Harder', tests: ['standStill', 'leanMatch', 'quickLean'], classes: ['logReps', 'stepClass', 'cairn'], palette: ['dawn', 'noon', 'golden', 'dusk'], teach: 'Feet, rhythm, stacking' },
  { day: 3, name: 'Service With a Wobble', tests: ['oneFoot', 'leanMatch', 'stepTime'], classes: ['roomService', 'plates', 'plank'], palette: ['dawn', 'noon', 'golden', 'dusk'], teach: 'Stepping, stick circles. The Mirror opens', opens: 'mirror' },
  { day: 4, name: 'A Little Damp', tests: ['quickLean', 'oneFoot', 'standStill'], classes: ['springboard', 'stillWater', 'islandLoop'], palette: ['dawn', 'noon', 'golden', 'dusk'], teach: 'Air control. Group Class invitation', opens: 'group' },
  { day: 5, name: 'Level Day', tests: 'best', classes: ['raft', 'tug', 'grandHold'], palette: ['dawn', 'noon', 'golden', 'dusk'], teach: 'The ending' },
];
export const MAINTENANCE = { name: 'Maintenance', palette: ['dawn', 'noon', 'golden', 'dusk'] };
export const ALL_TESTS = ['standStill', 'leanMatch', 'stepTime', 'quickLean', 'oneFoot'];
export const HANDICAP = [24, 16, 8, 3, 0];
export const TEST_NAMES = { standStill: 'Stand Still', leanMatch: 'Lean Match', stepTime: 'Step Time', quickLean: 'Quick Lean', oneFoot: 'One-Foot Hold' };
export const MEDALS = [{ at: 97, id: 'suspicious', name: 'Suspicious', colour: '#8E6BD8', bonus: 5 }, { at: 85, id: 'exemplary', name: 'Exemplary', colour: '#F5B700', bonus: 3 }, { at: 65, id: 'pleasant', name: 'Pleasant', colour: '#B8C4CF', bonus: 2 }, { at: 40, id: 'adequate', name: 'Adequate', colour: '#C98F62', bonus: 1 }, { at: -1, id: 'attended', name: 'Attended', colour: '#E8DCC8', bonus: 0 }];
export const TIER_NAMES = ['Gentle', 'Honest', 'Unreasonable'];
export const MARBLE_COLOUR = { suspicious: '#8E6BD8', exemplary: '#F5B700', pleasant: '#C8D4DF', adequate: '#C98F62', attended: '#F4EFE3', checkin: '#7FD6C8' };
