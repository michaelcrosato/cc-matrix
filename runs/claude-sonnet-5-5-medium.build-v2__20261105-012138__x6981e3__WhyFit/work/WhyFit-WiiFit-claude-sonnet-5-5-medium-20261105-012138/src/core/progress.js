// Week progress as pure functions on a save slot: Drips, stars, records, goals, Wobble Age. Testable in Node.
import { T } from './tunables.js';
import { ACTIVITIES } from '../data/activities.js';
import { goalDone, dayOf, WEEK } from '../data/week.js';
import { MILESTONES } from '../data/unlocks.js';
import { classmateScore, CLASSMATES } from '../data/classmates.js';

export const dripsFor = (stars, seconds) => Math.round((2 + 3 * stars + Math.floor(seconds / 30)) * T.dripRate);
export const totalStars = (S) => Object.values(S.stars).reduce((a, b) => a + b, 0);
export const key = (id, hard) => (hard ? id + ':hard' : id);
export const isHardDay = (S) => S.day >= 6;

/** Apply an activity result to the week. Returns a report for the Results screen. */
export function applyResult(S, { id, score, stars, seconds = 30, hard = false }) {
  const k = key(id, hard), first = !S.played[id];
  const rep = { id, score, stars, first, newBest: false, drips: 0, goalBonus: 0, milestones: [], beat: [], lost: [] };
  if (score > (S.best[k] ?? -Infinity)) { S.best[k] = score; rep.newBest = true; }
  S.stars[k] = Math.max(S.stars[k] ?? 0, stars);
  S.played[id] = (S.played[id] ?? 0) + 1;
  S.doneToday.push({ id, stars, first, score, hard });
  rep.drips = dripsFor(stars, seconds);
  for (const c of CLASSMATES) { const cs = classmateScore(c, id); (score > cs ? rep.beat : rep.lost).push(c.id); }
  if (rep.beat.includes('dennis')) { S.beatDennisToday = true; S.beatDennis = true; }
  const before = S.drips;
  if (!S.goalDone && goalDone(S.day, S, ACTIVITIES)) { S.goalDone = true; rep.goalBonus = 5; }
  S.drips += rep.drips + rep.goalBonus;
  S.dayDrips = (S.dayDrips ?? 0) + rep.drips + rep.goalBonus;
  S.dayStars = (S.dayStars ?? 0) + stars;
  S.dayMinutes = (S.dayMinutes ?? 0) + seconds / 60;
  S.minutes = (S.minutes ?? 0) + seconds / 60;
  rep.milestones = MILESTONES.filter((m) => before < m.at && S.drips >= m.at);
  for (const m of rep.milestones) S.unlockedItems.push(`${m.kind}:${m.value}`);
  return rep;
}
/** Wobble Age. T values 0..1; last three are averaged. */
export function trueAge(Ts, stars) {
  const last = Ts.slice(-3), mean = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  const raw = Math.round(20 + 60 * (1 - mean)) - Math.min(20, stars * T.ageTrainingWeight);
  return Math.max(18, Math.min(95, raw));
}
export const shownAge = (S, Ts) => trueAge(Ts, totalStars(S)) + (S.confessed ? 0 : 7);
export function newDay(S) {
  (S.log ??= []).push({ day: S.day, drips: S.dayDrips ?? 0, stars: S.dayStars ?? 0, minutes: Math.round(S.dayMinutes ?? 0), acts: S.doneToday.length });
  S.day += 1; S.doneToday = []; S.goalDone = false; S.beatDennisToday = false; S.dayDrips = 0; S.dayStars = 0; S.dayMinutes = 0; S.phase = 'morning';
}
export const concernFor = (S, rand, CONCERNS) => CONCERNS[Math.floor(rand() * CONCERNS.length) % CONCERNS.length];
export const canEndDay = (S) => S.doneToday.length > 0;
export const isLastDay = (S) => S.day >= WEEK.length;
