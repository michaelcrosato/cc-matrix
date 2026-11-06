// Ratings, streaks, ranks. Pure.
export const POINTS = { clean: 100, good: 60, sloppy: 20 };
export const MISTAKE_POINTS = 150;

export function streakMultiplier(streak) {
  return Math.min(2, 1 + 0.1 * streak);
}
export function rankOf(score, par) {
  const r = par > 0 ? score / par : 0;
  if (r >= 0.85) return 'S';
  if (r >= 0.7) return 'A';
  if (r >= 0.5) return 'B';
  return 'C';
}
const ORDER = ['C', 'B', 'A', 'S'];
export const capRank = (rank, cap) => (ORDER.indexOf(rank) > ORDER.indexOf(cap) ? cap : rank);
export const betterRank = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b ?? 'C') ? a : b);

/** The final tally, as lines for the results screen. */
export function finalTally(sim) {
  const time = Math.max(0, Math.round(sim.clock)) * 5;
  const vit = Math.round(sim.tables.reduce((a, t) => a + t.vitals, 0) / sim.tables.length) * 10;
  const technique = sim.score;
  const raw = Math.max(0, technique + time + vit);
  const penalty = sim.lookUses ? Math.round(raw * 0.05 * sim.lookUses) : 0;
  const total = Math.max(0, raw - penalty);
  let rank = rankOf(total, sim.def.par);
  if (sim.capRank) rank = capRank(rank, sim.capRank);
  if (sim.unscriptedBlue) rank = capRank(rank, 'A');
  const pristine = rank === 'S' && sim.mistakes === 0;
  return { time, vitals: vit, technique, penalty, total, rank, pristine, bestStreak: sim.bestStreak, mistakes: sim.mistakes, clean: sim.stats.clean, good: sim.stats.good, sloppy: sim.stats.sloppy };
}
