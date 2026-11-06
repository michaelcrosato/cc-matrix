// The order of the shift: pure, so a test can walk it. Each entry is a scene or an op.
export const CAMPAIGN = [
  { scene: 'ep1' }, { op: 'op1' }, { scene: 'ep2' }, { op: 'op2' }, { scene: 'ep3' }, { op: 'op3' }, { scene: 'ep4' }, { op: 'op4' }, { scene: 'ep5' }, { op: 'op5' },
  { scene: 'ep6' }, { op: 'op6' }, { scene: 'ep7' }, { op: 'op7' }, { scene: 'ep8' }, { op: 'op8' }, { scene: 'ep9' }, { op: 'op9' }, { scene: 'ep10' }, { op: 'op10' }, { scene: 'end' }, { credits: true },
];
export const nextOf = (i) => (i + 1 < CAMPAIGN.length ? i + 1 : -1);
export function recordOp(save, opId, res) {
  save.cleared[opId] = true;
  const order = ['C', 'B', 'A', 'S'];
  if (!save.ranks[opId] || order.indexOf(res.rank) > order.indexOf(save.ranks[opId])) { save.ranks[opId] = res.rank; }
  if (res.pristine) save.pristine = { ...save.pristine, [opId]: true };
  save.scores[opId] = Math.max(save.scores[opId] ?? 0, res.total);
  return save;
}
export const clearedOps = (save) => Object.keys(save.cleared).filter((k) => save.cleared[k]);
