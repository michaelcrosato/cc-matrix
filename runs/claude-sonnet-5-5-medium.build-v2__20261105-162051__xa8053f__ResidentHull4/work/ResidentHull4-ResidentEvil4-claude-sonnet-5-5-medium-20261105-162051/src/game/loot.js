// The Loot Director: weights drops by need so it is hard, but not impossible, to run dry.
import { TUNING } from '../data/tuning.js';
import { WEAPONS } from '../data/weapons.js';

/** Pure: given the run, a random source and a difficulty, return a drop {kind,id,count}. */
export function chooseLoot(run, rng, o = {}) {
  const loot = (run.diff?.loot ?? 1) * TUNING.lootRate;
  if (!o.crate && !rng.chance(clampP(0.55 * loot))) return null;
  const needs = [];
  for (const w of run.weapons()) {
    const wd = WEAPONS[w]; const have = run.ammo(w) + (run.mags[w] ?? 0);
    const want = wd.mag * 2.5;
    if (have < want) needs.push({ id: wd.ammo, weight: (want - have) / want, w });
  }
  const hpFrac = run.hp / run.maxHp;
  const hasHerb = ['samphire', 'mix60', 'mix100', 'mix100h', 'tin', 'dulse'].some((h) => run.case.count(h) > 0);
  if (hpFrac < 0.5 && !hasHerb) { if (rng.chance(0.75)) return { kind: 'item', id: 'samphire', count: 1 }; }
  if (needs.length && rng.chance(0.55 + 0.3 * Math.max(...needs.map((n) => n.weight)))) {
    const total = needs.reduce((a, n) => a + n.weight, 0); let r = rng.range(0, total);
    for (const n of needs) { r -= n.weight; if (r <= 0) return { kind: 'item', id: n.id, count: ammoCount(n.id, rng) }; }
    return { kind: 'item', id: needs[0].id, count: ammoCount(needs[0].id, rng) };
  }
  if (rng.chance(0.12)) return { kind: 'item', id: rng.pick(['samphire', 'dulse']), count: 1 };
  return { kind: 'coin', id: 'doubloons', count: Math.round(rng.range(25, 80) * TUNING.moneyRate) };
}
function ammoCount(id, rng) { return { ammo_pistol: rng.int(6, 12), ammo_shells: rng.int(2, 5), ammo_rifle: rng.int(3, 5), ammo_bolts: rng.int(1, 2) }[id] || 1; }
const clampP = (v) => Math.max(0, Math.min(1, v));
