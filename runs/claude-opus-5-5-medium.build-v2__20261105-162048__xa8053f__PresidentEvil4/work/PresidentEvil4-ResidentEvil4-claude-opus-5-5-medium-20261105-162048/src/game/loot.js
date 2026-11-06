// The Loot Director: the balance safety net. Hard, not impossible, to run dry.
import { TUNING } from '../data/tuning.js';
import { ITEMS } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';
import { ammoOf, count, diff, ownedWeapons } from '../core/run.js';
export function lootNeed(run, rng, always = false) {
  const lootK = TUNING.lootRate * diff(run).loot;
  const owned = ownedWeapons(run); let need = null, low = 1e9;
  for (const w of owned) { const W = WEAPONS[w], have = ammoOf(run, w) + (run.weapons[w]?.ammo || 0), lim = W.mag * 1.5; if (have < lim && have / lim < low) { low = have / lim; need = w; } }
  const desperate = owned.every((w) => ammoOf(run, w) + (run.weapons[w]?.ammo || 0) < WEAPONS[w].mag * 0.5);
  if (!always && !desperate && !rng.chance(Math.min(1, 0.55 * lootK))) return null;
  const herbs = run.items.filter((i) => ITEMS[i.id].kind === 'herb' && ITEMS[i.id].heal).length;
  if (run.health < run.maxHealth * 0.5 && herbs === 0) return { id: 'samphire', count: 1 };
  if (need) { const a = WEAPONS[need].ammo; return { id: a, count: ITEMS[a].gives }; }
  if (rng.chance(0.12)) return { id: 'samphire', count: 1 };
  return { money: Math.round(rng.range(25, 80) * TUNING.moneyRate) };
}
