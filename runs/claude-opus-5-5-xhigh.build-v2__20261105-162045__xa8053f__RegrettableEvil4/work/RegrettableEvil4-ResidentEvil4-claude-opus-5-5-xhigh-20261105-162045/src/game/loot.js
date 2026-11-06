// The Loot Director: when a crate or a corpse drops something, it weighs what you actually need.
// It's the balance safety net: hard, not impossible, to run dry.
import { TUNING } from '../data/tuning.js';
import { ITEMS, MONEY } from '../data/items.js';

const ammoLow = (run, weapon, lying) => {
  const s = run.weaponStats(weapon);
  const have = run.case.count(s.ammo) + (run.weapons[weapon]?.mag ?? 0) + (lying?.[s.ammo] ?? 0) * 0.75;
  return have / Math.max(1, s.mag * 1.5);
};

/**
 * What the last fight has already dropped counts for most of itself (she may not reach it all), or a whole crowd's corpses
 * would all pay out in rounds. Not what the map placed: that may be a long way back.
 */
export function lyingAmmo(drops) {
  const out = {};
  for (const d of drops) if (d.kind === 'item' && !d.persist && !d.taken && ITEMS[d.id]?.kind === 'ammo') out[d.id] = (out[d.id] ?? 0) + d.qty;
  return out;
}

/** Returns { kind: 'money'|'item', id?, qty }, or null when this corpse drops nothing. */
export function rollLoot(rng, run, { source = 'corpse', lying = null } = {}) {
  const lootRate = TUNING.lootRate * run.diff.loot;
  if (source === 'corpse' && !rng.chance(Math.min(1, 0.5 * lootRate))) return null;
  // Health first: under half with no herbs on you.
  const herbs = run.case.count('samphire') + run.case.count('mixS2') + run.case.count('mixS3') + run.case.count('mixSD') + run.case.count('mixSDH') + run.case.count('tin');
  if (run.health < run.maxHealth * 0.5 && herbs === 0 && rng.chance(0.9)) return { kind: 'item', id: 'samphire', qty: 1 };
  // Then the ammo you are lowest on.
  let worst = null; let worstScore = 1;
  for (const w of run.ownedWeapons()) {
    const score = ammoLow(run, w, lying);
    if (score < worstScore) { worstScore = score; worst = w; }
  }
  if (worst && rng.chance(0.82)) {
    const id = run.weaponStats(worst).ammo;
    return { kind: 'item', id, qty: ITEMS[id].pickup };
  }
  if (rng.chance(0.06 * lootRate)) return { kind: 'item', id: rng.pick(['samphire', 'samphire', 'dulse', 'oil', 'flare']), qty: 1 };
  if (source === 'crate' || rng.chance(0.75)) {
    const n = Math.round(rng.range(MONEY.min, MONEY.max) * TUNING.moneyRate);
    return { kind: 'money', qty: n };
  }
  return null;
}
