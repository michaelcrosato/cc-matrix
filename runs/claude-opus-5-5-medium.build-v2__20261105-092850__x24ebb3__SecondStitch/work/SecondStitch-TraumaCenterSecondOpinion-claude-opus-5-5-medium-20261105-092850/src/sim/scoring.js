// Ratings, streaks, ranks. Pure.
export const POINTS = { CLEAN: 100, GOOD: 60, SLOPPY: 20 };
export const MISTAKE_COST = 150;

export function rate(sim, seat, r, x, z) {
  const streakMult = 1 + Math.min(sim.streak, 10) * 0.1;
  const pts = Math.round(POINTS[r] * (r === 'CLEAN' ? streakMult : 1));
  sim.score += pts;
  seat.score += pts;
  sim.ratings[r]++;
  seat.ratings[r]++;
  if (r === 'CLEAN') {
    sim.streak++;
    sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
    sim.composure = Math.min(100, sim.composure + sim.cfg.composureGain);
  } else sim.streak = 0;
  sim.events.push({ t: 'rate', r, x, z, seat: seat.i, streak: sim.streak, pts });
}

/** Rank of a final score against par. */
export function rankOf(score, par) {
  const p = score / Math.max(1, par);
  return p >= 0.85 ? 'S' : p >= 0.7 ? 'A' : p >= 0.5 ? 'B' : 'C';
}
const ORDER = ['C', 'B', 'A', 'S'];
export const capRank = (rank, cap) => (ORDER.indexOf(rank) > ORDER.indexOf(cap) ? cap : rank);
export const betterRank = (a, b) => (!a ? b : ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

export function finalScore(sim) {
  const vit = sim.tables.reduce((n, t) => n + t.vitals, 0) / sim.tables.length;
  const timeBonus = Math.round(Math.max(0, sim.clock) * 5);
  const vitalBonus = Math.round(vit * 10);
  const looks = sim.looks;
  const total = Math.max(0, Math.round((sim.score + timeBonus + vitalBonus) * Math.pow(0.95, looks)));
  return { technique: sim.score, timeBonus, vitalBonus, total, looks };
}

export function results(sim, def) {
  const f = finalScore(sim);
  let rank = rankOf(f.total, def.par);
  if (sim.unscriptedBlue) rank = capRank(rank, 'A');
  if (sim.retried) rank = capRank(rank, 'B');
  const pristine = rank === 'S' && sim.ratings.MISTAKE === 0;
  return { ...f, rank, pristine, mistakes: sim.ratings.MISTAKE, bestStreak: sim.bestStreak, ratings: { ...sim.ratings }, won: sim.phase === 'won' };
}

/** Session awards: the hub takes at most 3 per player. `seats` are the present players' seats, with their ids. */
export function awardsFor(seats) {
  if (!seats.length) return [];
  const best = (fn) => seats.reduce((a, b) => (fn(b) > fn(a) ? b : a), seats[0]);
  const all = [
    { id: best((s) => s.ratings.CLEAN).id, title: 'STEADIEST HAND', detail: 'Most CLEAN ratings' },
    { id: best((s) => s.stitches).id, title: 'MOST STITCHES', detail: 'Someone had to close' },
    { id: best((s) => s.saves + s.drained * 0.01).id, title: 'SAVED THE DAY', detail: 'Paddles and drains' },
    { id: best((s) => s.ratings.SLOPPY).id, title: 'SLOPPIEST', detail: 'Said with love' },
  ];
  const count = {};
  return all.filter((a) => (count[a.id] = (count[a.id] ?? 0) + 1) <= 3);
}
