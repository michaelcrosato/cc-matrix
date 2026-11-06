// The campaign as data + pure save helpers (so a scripted playthrough can run in Node).
export const CAMPAIGN = [
  { scene: 'ep1', op: 'op1' }, { scene: 'ep2', op: 'op2' }, { scene: 'ep3', op: 'op3' }, { scene: 'ep4', op: 'op4' }, { scene: 'ep5', op: 'op5' },
  { scene: 'ep6', op: 'op6' }, { scene: 'ep7', op: 'op7' }, { scene: 'ep8', op: 'op8' }, { scene: 'ep9', op: 'op9' }, { scene: 'ep10', op: 'op10' }, { scene: 'end', report: true },
];
const ORDER = 'SABC';
export const betterRank = (a, b) => (!a ? b : !b ? a : ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b);
export function recordResult(save, opId, res) {
  const c = (save.cleared[opId] ??= { best: null, bestScore: 0, plays: 0, pristine: false });
  c.best = betterRank(c.best, res.rank); c.bestScore = Math.max(c.bestScore, res.total); c.plays++; c.pristine = c.pristine || res.pristine;
  const idx = CAMPAIGN.findIndex((s) => s.op === opId); if (idx >= 0 && idx + 1 > save.next) save.next = idx + 1;
  if (opId === 'op3') save.quietOn = true;
  return save;
}
export const isUnlocked = (save, opId) => save.unlockedAll || !!save.cleared[opId] || CAMPAIGN.findIndex((s) => s.op === opId) <= save.next;
export const clearedOps = (save) => Object.keys(save.cleared);
export function shiftReport(save) { return CAMPAIGN.filter((s) => s.op).map((s) => ({ op: s.op, rank: save.cleared[s.op]?.best || '-' })); }
