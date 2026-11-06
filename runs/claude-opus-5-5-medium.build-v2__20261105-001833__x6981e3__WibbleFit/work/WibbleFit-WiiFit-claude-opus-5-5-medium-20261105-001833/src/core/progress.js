// The rules of progress as pure functions: stars, Drips, the Wobble Age, goals, unlocks.
import { ACT, ACTIVITIES } from '../data/activities.js';
import { MILESTONES } from '../data/unlocks.js';
import { weekDay, WEEK } from '../data/week.js';
import { T } from './tunables.js';

export function starsFor(def, score, maxScore = 0) {
  const th = def.stars.map((s) => s * T.starThresholdScale);
  if (def.percentStars) { const pct = maxScore > 0 ? (100 * score) / maxScore : 0; return th.filter((t) => pct >= t).length; }
  return th.filter((t) => score >= t).length;
}
export const scoreForStars = (def, n) => (n <= 0 ? 0 : Math.ceil(def.stars[n - 1] * T.starThresholdScale));
export const dripsFor = (stars, playSeconds) => Math.floor((2 + 3 * stars + Math.floor(playSeconds / 30)) * T.dripRate);

export function trueAge(tests, totalStars) {
  const last = tests.slice(-3);
  const mean = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  const age = Math.round(20 + 60 * (1 - mean)) - Math.min(20, totalStars * T.ageTrainingWeight);
  return Math.round(Math.min(95, Math.max(18, age)));
}
export const shownAge = (slot, age) => (slot.confessed ? age : age + 7);
export const totalStars = (slot) => Object.values(slot.records).reduce((a, r) => a + (r.stars ?? 0), 0);
export const scheduleDay = (day) => ((day - 1) % WEEK.length) + 1;
export function isOpen(slot, id) {
  if (!slot) return true;
  if (slot.week > 1) return true;
  const def = ACT[id]; const d = def ? def.day : WEEK.find((w) => w.opens.includes(id))?.day ?? 1;
  return slot.day >= d;
}
export const hardOpen = (slot) => !slot || slot.week > 1 || slot.day >= 6;
export const openedToday = (slot) => (slot.week > 1 ? [] : weekDay(slot.day).opens.filter((id) => ACT[id]));

export function goalMet(goal, slot) {
  switch (goal.kind) {
    case 'poseAndOther': { const pose = slot.today.some((id) => ACT[id]?.station === 'pavilion'); return pose && new Set(slot.today).size >= 2; }
    case 'stars': return slot.todayStars.some((s) => s >= goal.n);
    case 'first': return slot.todayFirst > 0;
    case 'count': return slot.today.length >= goal.n;
    case 'beat': return slot.todayBeat === goal.who || slot.todayBeat === true;
    case 'did': return slot.today.includes(goal.id);
    default: return false;
  }
}
// Applies one finished activity to a guest slot and says what happened.
export function applyResult(slot, def, score, stars, playSeconds) {
  const out = { drips: 0, first: false, goalNow: false, beat: [], milestones: [], newBest: false, stars, score };
  const rec = slot.records[def.id] ?? { best: -Infinity, stars: 0, plays: 0 };
  out.first = rec.plays === 0;
  out.newBest = score > rec.best;
  for (const who of ['dennis', 'june', 'marguerite']) if (score > def.rivals[who] && !(rec.best > def.rivals[who])) out.beat.push(who);
  rec.best = Math.max(rec.best, score); rec.stars = Math.max(rec.stars, stars); rec.plays++;
  slot.records[def.id] = rec;
  slot.today.push(def.id); slot.todayStars.push(stars);
  if (out.first) slot.todayFirst++;
  if (score > def.rivals.dennis) slot.todayBeat = 'dennis';
  slot.plays++; slot.seconds += playSeconds;
  out.drips = dripsFor(stars, playSeconds);
  if (!slot.goalDone && goalMet(weekDay(scheduleDay(slot.day)).goal, slot)) { slot.goalDone = true; out.goalNow = true; out.drips += Math.floor(5 * T.dripRate); }
  slot.drips += out.drips;
  out.milestones = checkMilestones(slot);
  return out;
}
export function checkMilestones(slot) {
  const got = [];
  while (slot.milestones < MILESTONES.length && slot.drips >= MILESTONES[slot.milestones].at) {
    const m = MILESTONES[slot.milestones++]; slot.items.push(m.item); got.push(m);
  }
  return got;
}
export function startNewDay(slot) {
  slot.today = []; slot.todayStars = []; slot.todayFirst = 0; slot.todayBeat = false; slot.goalDone = false; slot.wobbleToday = null;
}
export function recordTest(slot, t) {
  slot.tests.push(Math.max(0, Math.min(1, t)));
  const age = trueAge(slot.tests, totalStars(slot));
  slot.wobbleToday = age; slot.chart.push(age);
  return age;
}
export function dropInRecord(records, def, score, stars) {
  const rec = records[def.id] ?? { best: -Infinity, stars: 0, plays: 0 };
  const newBest = score > rec.best;
  rec.best = Math.max(rec.best, score); rec.stars = Math.max(rec.stars, stars); rec.plays++;
  records[def.id] = rec; return newBest;
}
export { ACTIVITIES };
