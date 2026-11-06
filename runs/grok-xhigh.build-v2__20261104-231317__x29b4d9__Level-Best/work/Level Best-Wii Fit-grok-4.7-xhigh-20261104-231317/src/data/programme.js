/** Days are built from the event registry, so a missing event is skipped. */

export const DAY_TABLE = [
  { name: 'Arrival', tests: ['stand', 'lean', 'step'], classes: ['poses', 'fruitHat'] },
  { name: 'The Second Day, Which Is Harder', tests: ['stand', 'lean', 'quick'], classes: ['logReps', 'stepClass', 'cairn'] },
  { name: 'Service With a Wobble', tests: ['onefoot', 'lean', 'step'], classes: ['roomService', 'plates', 'plank'] },
  { name: 'A Little Damp', tests: ['quick', 'onefoot', 'stand'], classes: ['springboard', 'stillWater', 'islandLoop'] },
  { name: 'Level Day', tests: ['best'], classes: ['raft', 'tug', 'grandHold'] },
];

export function programmeSteps(ids) {
  const known = new Set(ids);
  const steps = [];
  for (const day of DAY_TABLE) {
    for (const id of day.classes) if (known.has(id)) steps.push(id);
  }
  return steps;
}

export function dayPlan(dayIndex, ids) {
  const known = new Set(ids);
  if (dayIndex < DAY_TABLE.length) {
    const day = DAY_TABLE[dayIndex];
    return {
      name: day.name,
      tests: day.tests.slice(),
      classes: day.classes.filter((id) => known.has(id)),
      maintenance: false,
    };
  }
  return {
    name: 'Maintenance',
    tests: ['stand', 'lean', 'step'],
    classes: [],
    maintenance: true,
  };
}
