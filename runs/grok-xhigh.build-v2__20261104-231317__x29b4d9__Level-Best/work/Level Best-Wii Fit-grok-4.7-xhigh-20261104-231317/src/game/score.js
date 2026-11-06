/** Pure scoring, age, marbles, medals. Tests call these; the director calls these. */

const HANDICAP = [24, 16, 8, 3, 0];

export function medalOf(form) {
  const f = Number(form) || 0;
  if (f >= 97) return 'suspicious';
  if (f >= 85) return 'exemplary';
  if (f >= 65) return 'pleasant';
  if (f >= 40) return 'adequate';
  return 'attended';
}

export function medalLabel(medal) {
  if (medal === 'suspicious') return 'Suspicious';
  if (medal === 'exemplary') return 'Exemplary';
  if (medal === 'pleasant') return 'Pleasant';
  if (medal === 'adequate') return 'Adequate';
  return 'Attended';
}

export function medalBonus(medal) {
  if (medal === 'suspicious' || medal === 'exemplary') return 5;
  if (medal === 'pleasant') return 3;
  if (medal === 'adequate') return 2;
  return 1;
}

export function formOf(raw, par) {
  if (!(par > 0)) return 0;
  return Math.max(0, Math.min(100, (100 * raw) / par));
}

/** age = round(18 + 81 * (1 - mean)^1.3 + handicap), clamped 18..99. */
export function wobbleAge(mean, dayIndex) {
  const m = Math.max(0, Math.min(1, Number(mean) || 0));
  const h = HANDICAP[Math.max(0, Math.min(HANDICAP.length - 1, dayIndex | 0))];
  const age = Math.round(18 + 81 * (1 - m) ** 1.3 + h);
  return Math.max(18, Math.min(99, age));
}

export function marblePayout({ seconds, form, firstClear, perMin = 2, medalScale = 1 }) {
  const base = Math.max(2, perMin * (Math.max(0, seconds) / 60));
  const bonus = medalBonus(medalOf(form)) * medalScale;
  return Math.round(base + bonus + (firstClear ? 2 : 0));
}

export function tiersOpen(best) {
  let open = 1;
  if ((best[1] ?? 0) >= 65) open = 2;
  if (open >= 2 && (best[2] ?? 0) >= 85) open = 3;
  return open;
}

export function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

export function mean(list) {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}
