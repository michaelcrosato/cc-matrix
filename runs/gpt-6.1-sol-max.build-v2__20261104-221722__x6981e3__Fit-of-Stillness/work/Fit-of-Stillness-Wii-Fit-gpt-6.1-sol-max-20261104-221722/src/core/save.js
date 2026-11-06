import { SETTINGS } from './tunables.js';
import { clamp } from './dot.js';
import { UNLOCKS, DAYS } from '../data/week.js';
export const SAVE_KEY = 'tare-island:residency:v1';
export const blank = () => ({ version: 1, settings: { ...SETTINGS }, slots: [null, null, null], records: {} });
export function guest(name = 'Guest', avatar = 0) { return { name, avatar, look: {}, day: 1, week: 1, drips: 0, stars: 0, ages: [], tests: [], records: {}, played: {}, today: [], minutes: 0, goal: false, morning: false, confessed: false, items: [], newUnlocks: [] }; }
export class Save {
  constructor(storage) { this.storage = storage; this.data = blank(); this.load(); }
  load() { try { const s = JSON.parse(this.storage?.getItem(SAVE_KEY) || 'null'); if (s?.version === 1 && Array.isArray(s.slots) && s.slots.length === 3) { this.data = { ...blank(), ...s, settings: { ...SETTINGS, ...s.settings } }; this.data.slots = s.slots.map(g => g && typeof g.name === 'string' && Array.isArray(g.ages) ? { ...guest(), ...g } : null); } } catch {} return this.data; }
  write() { try { this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch {} }
  reset() { this.data = blank(); this.write(); }
}
export function wobbleAge(g, weight = .5) { const last = g.tests.slice(-3); const m = last.reduce((a, b) => a + b, 0) / Math.max(1, last.length); return Math.round(clamp(Math.round(20 + 60 * (1 - m)) - Math.min(20, g.stars * weight), 18, 95)); }
export function recordMorning(g, test, weight) { if (g.morning) return g.ages.at(-1); g.tests.push(clamp(test)); const age = wobbleAge(g, weight) + (g.confessed ? 0 : 7); g.ages.push(age); g.morning = true; return age; }
export function confess(g) { if (g.confessed) return; g.confessed = true; g.ages = g.ages.map(a => a - 7); }
export function goalMet(g, a, stars, score, wasNew) { switch ((g.day - 1) % 7) { case 0: return g.today.some(x => x.kind === 'pose') && g.today.some(x => x.kind !== 'pose'); case 1: return stars >= 2; case 2: return wasNew; case 3: return g.today.length >= 3; case 4: return score > a.stars[0] * 1.1; case 5: return stars === 3; case 6: return a.id === 'long'; } }
export function award(g, a, result, T) {
  const wasNew = !g.played[a.id]; g.played[a.id] = (g.played[a.id] || 0) + 1;
  g.records[a.id] = Math.max(g.records[a.id] || 0, result.score); g.stars += result.stars; g.minutes += result.seconds / 60;
  g.today.push({ id: a.id, kind: a.kind, stars: result.stars, score: result.score });
  let drips = Math.round((2 + 3 * result.stars + Math.floor(result.seconds / 30)) * T.dripRate);
  const bonus = !g.goal && goalMet(g, a, result.stars, result.score, wasNew); if (bonus) { drips += 5; g.goal = true; }
  const oldItems = g.items || []; g.drips += drips; g.items = UNLOCKS.filter(([n]) => g.drips >= n).map(([, name]) => name);
  const unlocks=g.items.filter(item=>!oldItems.includes(item));g.newUnlocks=[...(g.newUnlocks||[]),...unlocks];
  return { drips, bonus, unlocks };
}
export function nextDay(g) { g.day++; if (g.day > 7) { g.day = 1; g.week++; } g.today = []; g.goal = false; g.morning = false; g.newUnlocks=[]; }
export const dayData = g => DAYS[(g?.day || 1) - 1];
