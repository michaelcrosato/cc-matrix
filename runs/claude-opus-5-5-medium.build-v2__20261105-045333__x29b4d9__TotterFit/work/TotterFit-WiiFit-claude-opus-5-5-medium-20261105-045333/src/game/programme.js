// Pure rules, unit-tested in Node. No Three or DOM here.
import { DAYS, HANDICAP, MEDALS } from '../data/programme.js';
export function wobbleAge(mean, dayIndex) {
  const m = Math.max(0, Math.min(1, mean));
  const hc = HANDICAP[Math.min(dayIndex, HANDICAP.length - 1)] ?? 0;
  return Math.max(18, Math.min(99, Math.round(18 + 81 * Math.pow(1 - m, 1.3) + hc)));
}
export function medalFor(form, scale = 1) { const f = form * scale; for (const m of MEDALS) if (f >= m.at) return m; return MEDALS[MEDALS.length - 1]; }
export function marblesFor(minutes, form, firstClear, perMin = 2, scale = 1) {
  const a = Math.max(2, Math.round(minutes * perMin));
  return a + medalFor(form, scale).bonus + (firstClear ? 2 : 0);
}
export function tierOpen(best, tier) { // best[tier] = best form on that tier
  if (tier <= 0) return true;
  if (tier === 1) return (best?.[0] ?? -1) >= 65;
  return (best?.[1] ?? -1) >= 85;
}
export function highestTier(best, tiers = 3) { let t = 0; for (let i = 1; i < tiers; i++) if (tierOpen(best, i)) t = i; return t; }
export function liveDays(registry) { return DAYS.map(d => ({ ...d, classes: d.classes.filter(c => registry[c]) })); }
export function totalSteps(registry) { let n = 0; for (const d of liveDays(registry)) n += 1 + d.classes.length; return n; }
export function restTilt(done, total) { return 9 * (1 - Math.max(0, Math.min(1, done / Math.max(1, total)))); }
export function unlockedBy(unlocks, marbles) { return unlocks.filter(u => marbles >= u.at); }
export function bestTests(list, n = 3) { return [...list].sort((a, b) => b.score - a.score).slice(0, n).map(a => a.id); }
export function newProfile(name, paint, skin = '#F2D3A8') {
  return { name, paint, skin, hat: 'none', day: 1, doneToday: [], checkinDone: false, ages: [], testBest: {}, medals: {}, marbles: 0, marbleList: [], steps: 0, falls: 0, minutes: 0, stamps: [], levelled: false, tutorial: false, met: [], lastSeen: 0, plan: null, unlocked: [], questionN: 0, bedReady: false };
}
