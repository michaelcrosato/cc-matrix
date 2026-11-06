export const GRADE_POINTS = Object.freeze({ FLAWLESS: 300, CLEAN: 150, ROUGH: 50, MISS: -100 });
export const GRADE_POISE = Object.freeze({ FLAWLESS: 10, CLEAN: 5, ROUGH: 0, MISS: -10 });

const RANK_ROWS = Object.freeze([
  ['S', 0.9, 'Chief of Surgery'],
  ['A', 0.75, 'Attending'],
  ['B', 0.55, 'Resident'],
  ['C', 0.35, 'Intern'],
  ['D', -Infinity, 'Malpractice Suit Pending'],
]);

export function comboMult(combo) {
  return Math.min(2, 1 + 0.05 * combo);
}

export function rankFor(score, par, cap) {
  const ratio = par > 0 ? score / par : (score > 0 ? 1 : 0);
  let idx = RANK_ROWS.length - 1;
  for (let i = 0; i < RANK_ROWS.length; i++) {
    if (ratio >= RANK_ROWS[i][1]) { idx = i; break; }
  }
  if (cap) {
    const capIdx = RANK_ROWS.findIndex((r) => r[0] === cap);
    if (capIdx >= 0 && idx < capIdx) idx = capIdx;
  }
  const row = RANK_ROWS[idx];
  return { id: row[0], title: row[2], ratio };
}

export function award(sim, seat, grade, x, y, why) {
  const base = GRADE_POINTS[grade];
  const mult = comboMult(seat.combo);
  const points = Math.round(base * mult * sim.mods.score);
  sim.score += points;
  seat.score += points;
  seat.graded = (seat.graded || 0) + 1;
  if (grade === 'FLAWLESS' || grade === 'CLEAN') {
    seat.clean = (seat.clean || 0) + 1;
    seat.combo += 1;
    if (seat.combo > seat.bestCombo) seat.bestCombo = seat.combo;
    if (seat.combo > sim.bestCombo) sim.bestCombo = seat.combo;
  } else if (grade === 'MISS') {
    seat.combo = 0;
    sim.misses += 1;
    seat.misses = (seat.misses || 0) + 1;
  }
  const poise = GRADE_POISE[grade] * sim.tuning.composureGain;
  seat.composure = Math.max(0, Math.min(100, seat.composure + poise));
  if (sim.cheats.infiniteComposure) seat.composure = 100;
  sim.events.push({ type: 'grade', grade, points, x, y, seat: seat.id, why });
  if (grade === 'MISS') sim.bark('miss');
  else if (seat.combo >= 5 && seat.combo % 5 === 0) sim.bark('streak');
  if (why === 'cut' || why === 'sever') seat.stats.Cuts += 1;
  if (why === 'stitch' || why === 'tie') seat.stats.Stitches += 1;
  if (why === 'laser' || why === 'burn') seat.stats.Burns += 1;
}
