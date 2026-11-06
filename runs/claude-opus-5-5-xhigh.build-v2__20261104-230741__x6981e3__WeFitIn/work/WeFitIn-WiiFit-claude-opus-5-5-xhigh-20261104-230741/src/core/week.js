// The rules of the week, as pure functions on a slot.
import { ACTIVITIES, CLASSMATE_SCORES, DRIP_BONUS, HARD_DAY, PLAYABLE_IDS } from '../data/activities.js';
import { AGE_OFFSET, DAILY_GOALS, DAYS } from '../data/week.js';
import { MILESTONES } from '../data/unlocks.js';
import { T } from './tunables.js';

export const dayData = (slot) => DAYS[(slot.day - 1) % DAYS.length];

export function goalOf(slot) {
  if (slot.week === 1) return dayData(slot).goal;
  return DAILY_GOALS[(slot.day - 1 + (slot.week - 2) * 3) % DAILY_GOALS.length];
}

/** Is this activity open today? */
export function isOpen(slot, id, allUnlocked = false) {
  if (allUnlocked || slot.unlockedAll || slot.week > 1) return true;
  const def = ACTIVITIES[id];
  return slot.day >= def.day;
}
export const hardOpen = (slot, allUnlocked = false) => allUnlocked || slot.unlockedAll || slot.week > 1 || slot.day >= HARD_DAY;

export function starsFor(def, score, extra = {}) {
  const k = T.starThresholdScale;
  if (def.stars === 'custom') return extra.stars ?? 0;
  if (def.stars === 'percent') {
    const max = Math.max(1, extra.max ?? 100);
    const pct = (score / max) * 100;
    return def.starPct.filter((p) => pct >= p * k).length;
  }
  return def.stars.filter((s) => score >= s * k).length;
}

export function dripsFor(stars, seconds) {
  return Math.round((2 + 3 * stars + Math.floor(seconds / 30)) * T.dripRate);
}

export function goalMet(slot, goal = goalOf(slot)) {
  const today = slot.todayDone;
  switch (goal.kind) {
    case 'poseAndOne': return today.some((d) => ACTIVITIES[d.id]?.family === 'pose') && new Set(today.map((d) => d.id)).size >= 2;
    case 'stars': return today.some((d) => d.stars >= goal.n);
    case 'newThing': return today.some((d) => d.firstEver);
    case 'count': return new Set(today.map((d) => d.id)).size >= goal.n;
    case 'beatDennis': return today.some((d) => d.beat?.includes('dennis'));
    case 'beatJune': return today.some((d) => d.beat?.includes('june'));
    case 'beatMarguerite': return today.some((d) => d.beat?.includes('marguerite'));
    case 'stand': return today.some((d) => d.id === 'stand');
    default: return false;
  }
}

/** Write a finished activity into the slot. Returns what happened. */
export function applyResult(slot, id, { score, stars, seconds, hard = false }) {
  const prior = slot.records[id];
  const firstEver = !prior;
  const rec = prior ?? { best: 0, stars: 0, plays: 0, hardBest: 0 };
  const newBest = score > rec.best;
  rec.plays++;
  rec.best = Math.max(rec.best, score);
  rec.stars = Math.max(rec.stars, stars);
  if (hard) rec.hardBest = Math.max(rec.hardBest ?? 0, score);
  slot.records[id] = rec;

  const others = CLASSMATE_SCORES[id] ?? {};
  const beat = Object.keys(others).filter((k) => score > others[k]);
  const newlyBeat = beat.filter((k) => !(slot.beaten ??= {})[k]?.[id]);
  for (const k of beat) ((slot.beaten[k] ??= {})[id] = true);

  const metBefore = goalMet(slot);
  slot.todayDone.push({ id, stars, score, firstEver, beat });
  slot.todaySeconds += seconds;
  slot.todayStars += stars;
  let drips = dripsFor(stars, seconds);
  let bonus = 0;
  if (!slot.goalPaid && !metBefore && goalMet(slot)) { bonus = DRIP_BONUS; slot.goalPaid = true; }
  drips += bonus;
  slot.drips += drips;
  slot.todayDrips += drips;
  const unlocked = awardMilestones(slot);
  return { drips, bonus, firstEver, newBest, beat, newlyBeat, unlocked };
}

export function awardMilestones(slot) {
  const out = [];
  while (slot.milestone < MILESTONES.length && slot.drips >= MILESTONES[slot.milestone].drips) {
    const m = MILESTONES[slot.milestone];
    slot.wardrobe.push(m.id);
    (slot.todayNew ??= []).push(m.id);
    out.push(m);
    slot.milestone++;
  }
  return out;
}

/** T in 0..1 from today's test. Wobble Age from the last three. */
export function ageFromTests(tests, totalStars) {
  const last = tests.slice(-3);
  const mean = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  const base = Math.round(20 + 60 * (1 - mean)) - Math.min(20, totalStars * T.ageTrainingWeight);
  return Math.max(18, Math.min(95, Math.round(base)));
}
export const totalStarsOf = (slot) => Object.values(slot.records).reduce((a, r) => a + (r.stars ?? 0), 0);
export const shownAge = (slot, trueAge) => (slot.confessed ? trueAge : trueAge + AGE_OFFSET);

/** Morning: file today's test. Returns { trueAge, shown, previous }. */
export function recordWeighIn(slot, T01) {
  slot.tests.push(T01);
  const trueAge = ageFromTests(slot.tests, totalStarsOf(slot));
  const previous = slot.ages.length ? slot.ages[slot.ages.length - 1] : null;
  slot.ages.push(trueAge);
  return { trueAge, shown: shownAge(slot, trueAge), previous: previous === null ? null : shownAge(slot, previous) };
}

export function startDay(slot) {
  slot.todayDone = [];
  slot.todayStars = 0;
  slot.todaySeconds = 0;
  slot.todayDrips = 0;
  slot.todayNew = [];
  slot.goalPaid = false;
}

export function nextDay(slot) {
  startDay(slot);
  slot.day++;
  if (slot.day > 7) { slot.week++; slot.day = 1; }
  slot.phase = 'morning';
}

export function nextActivity(id, slot, allUnlocked) {
  const station = ACTIVITIES[id].station;
  const list = PLAYABLE_IDS.filter((a) => ACTIVITIES[a].station === station);
  const i = list.indexOf(id);
  for (let k = 1; k <= list.length; k++) {
    const next = list[(i + k) % list.length];
    if (!slot || isOpen(slot, next, allUnlocked)) return next;
  }
  return id;
}
