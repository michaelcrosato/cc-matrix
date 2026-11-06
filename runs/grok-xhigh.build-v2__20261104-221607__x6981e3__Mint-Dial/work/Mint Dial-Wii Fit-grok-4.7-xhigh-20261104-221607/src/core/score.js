/** Stars from a 0..100-style score and three rising thresholds. */
export function starsFor(score, thresholds, scale = 1) {
  const t = thresholds.map((n) => n * scale);
  let stars = 0;
  if (score >= t[0]) stars = 1;
  if (score >= t[1]) stars = 2;
  if (score >= t[2]) stars = 3;
  return stars;
}

/** Drips: 2 + 3×stars + floor(playSeconds/30), plus 5 for the day's prescription. */
export function dripsFor(stars, playSeconds, prescription, dripRate = 1) {
  const base = 2 + 3 * stars + Math.floor(Math.max(0, playSeconds) / 30);
  return Math.round((base + (prescription ? 5 : 0)) * dripRate);
}

/**
 * true  = round(20 + 60 × (1 - mean(last 3 T))) - min(20, totalStars × weight)
 * shown = true + 7 until the confession.
 */
export function wobbleAge(samples, totalStars, weight = 0.5) {
  const last = samples.slice(-3);
  const mean = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  const raw = Math.round(20 + 60 * (1 - mean)) - Math.min(20, totalStars * weight);
  const trueAge = Math.max(18, Math.min(95, raw));
  return trueAge;
}

export const JAR_MILESTONES = [10, 25, 45, 70, 100, 135, 175];

export const JAR_ITEMS = [
  { at: 10, id: 'band', name: 'Second headband' },
  { at: 25, id: 'towel', name: 'Towel cape' },
  { at: 45, id: 'confidence', name: 'Confidence: no visible effect' },
  { at: 70, id: 'wrist', name: 'Wrist note: breathe' },
  { at: 100, id: 'socks', name: 'Clinic socks' },
  { at: 135, id: 'whistle', name: 'Quiet whistle' },
  { at: 175, id: 'crown', name: 'Paper crown' },
];

export function milestonesReached(drips) {
  return JAR_ITEMS.filter((item) => drips >= item.at);
}
