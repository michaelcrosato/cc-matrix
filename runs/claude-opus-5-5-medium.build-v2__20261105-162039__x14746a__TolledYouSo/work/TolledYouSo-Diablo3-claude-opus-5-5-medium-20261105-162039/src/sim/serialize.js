// Saves: heroes, stash, Devotion, unlocks, bests. Plain versioned JSON.
import { recalc } from './stats.js';
import { refresh } from './hero.js';

const HERO_KEYS = ['cls', 'name', 'level', 'xp', 'gold', 'gear', 'inv', 'mats', 'gems', 'reliquary', 'slots', 'vows', 'deaths', 'kills', 'known', 'counters'];
export const saveHero = (h) => { const o = {}; for (const k of HERO_KEYS) o[k] = h[k]; return JSON.parse(JSON.stringify(o)); };
export function loadHeroInto(w, h, data) { for (const k of HERO_KEYS) if (data[k] !== undefined) h[k] = JSON.parse(JSON.stringify(data[k])); h._skillCache = null; refresh(w, h); h.hp = h.stats.maxHp; h.res = 0; }
export const saveCampaign = (w) => JSON.parse(JSON.stringify({ story: w.story, difficulty: w.difficulty, lore: w.lore, bestiary: w.bestiary, seed: w.seed }));
export function loadCampaign(w, c) { if (!c) return; w.story = { ...w.story, ...JSON.parse(JSON.stringify(c.story ?? {})) }; w.lore = c.lore ?? {}; w.bestiary = c.bestiary ?? {}; w.bossKills = c.bossKills ?? {}; }
export { recalc };
