const RANK_ORDER = ['C', 'B', 'A', 'S'];

export function ratePoints(kind, streak) {
  if (kind === 'MISTAKE') return -150;
  if (kind === 'SLOPPY') return 20;
  if (kind === 'GOOD') return 60;
  const mult = Math.min(2, 1 + 0.1 * Math.max(0, streak - 1));
  return Math.round(100 * mult);
}

export function finalScore(sim) {
  const timePts = 5 * Math.max(0, Math.floor(sim.timeLeft));
  let vit = 0;
  for (const t of sim.tables) vit += Math.max(0, Math.floor(t.vitals));
  let s = sim.score + timePts + 10 * vit;
  if (sim.persist.lookUses > 0) s = Math.round(s * 0.95);
  return s;
}

export function rankFor(score, par, cap) {
  const pct = par > 0 ? score / par : 0;
  let rank = pct >= 0.85 ? 'S' : pct >= 0.7 ? 'A' : pct >= 0.5 ? 'B' : 'C';
  if (cap && RANK_ORDER.indexOf(rank) > RANK_ORDER.indexOf(cap)) rank = cap;
  return rank;
}

export function applyRank(sim) {
  sim.finalScore = finalScore(sim);
  const cap = sim.persist.rankCap || (sim.persist.unscriptedBlue ? 'A' : null);
  sim.rank = rankFor(sim.finalScore, sim.par, cap);
  sim.pristine = sim.rank === 'S' && sim.mistakes === 0 && !sim.persist.unscriptedBlue;
  return sim.rank;
}
