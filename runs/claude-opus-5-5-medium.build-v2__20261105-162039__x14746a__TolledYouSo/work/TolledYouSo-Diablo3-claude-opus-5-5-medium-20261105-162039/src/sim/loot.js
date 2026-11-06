// Item generation and drops. Items are plain JSON, so saves and the network can carry them.
import { AFFIXES, AFFIX_IDS, ARMOUR_SLOTS, BASE_NAMES, COMMON_FLAVOUR, GEM_IDS, LEGENDARIES, LEGENDARY, OFFHANDS, PREFIXES, RARITIES, SETS, SET_FLAVOUR, SET_FOR_CLASS, SLOTS, SUFFIXES, WEAPONS } from '../data/items.js';
import { F } from '../data/tuning.js';

let uidCounter = 1;
export const seedUid = (n) => { uidCounter = n; };
const newUid = (rng) => `${uidCounter++}-${Math.floor(rng.next() * 1e6)}`;

const rollAffixes = (rng, slot, count, ilvl, existing = []) => {
  const out = [];
  const pool = AFFIX_IDS.filter((k) => (!AFFIXES[k].slots || AFFIXES[k].slots.includes(slot)) && !existing.includes(k));
  rng.shuffle(pool);
  for (const k of pool) {
    if (out.length >= count) break;
    out.push(rollAffix(rng, k, ilvl));
  }
  return out;
};
export const rollAffix = (rng, k, ilvl) => {
  const top = AFFIXES[k].v(ilvl);
  const raw = top * rng.range(0.6, 1);
  return { k, v: k === 'socket' ? 1 : top >= 20 ? Math.round(raw) : Math.round(raw * 10) / 10 };
};

export function makeItem(rng, { slot, rarity = 'common', ilvl = 1, cls = 'bellwarden', legendary = null, set = null, weaponId = null }) {
  const leg = legendary ? LEGENDARY[legendary] : null;
  if (leg) { slot = leg.slot; rarity = 'legendary'; }
  if (set) rarity = 'set';
  const r = RARITIES[rarity];
  slot ??= rng.pick(SLOTS);
  const it = { uid: newUid(rng), slot, rarity, ilvl, cls: null, affixes: [], name: '', flavour: '', base: slot };
  const n = rng.int(r.affixes[0], r.affixes[1]);
  it.affixes = rollAffixes(rng, slot, n, ilvl);
  if (slot === 'main') {
    const list = WEAPONS[cls];
    const w = (leg?.weapon && list.find((x) => x.id === leg.weapon)) || (weaponId && list.find((x) => x.id === weaponId)) || rng.pick(list);
    it.base = w.id; it.model = w.model; it.cls = cls;
    it.dps = Math.round(F.weaponDps(ilvl, r.mult, rng.range(0.9, 1.1)) * 10) / 10;
  } else if (slot === 'off') {
    const o = rng.pick(OFFHANDS); it.base = o.id; it.model = o.model;
    it.armour = Math.round(3 * ilvl * r.mult + 3);
  } else if (ARMOUR_SLOTS.includes(slot)) {
    it.armour = Math.round(3 * ilvl * r.mult + 3);
  }
  const baseName = slot === 'main' || slot === 'off' ? (slot === 'main' ? WEAPONS[cls].find((x) => x.id === it.base).name : OFFHANDS.find((x) => x.id === it.base).name) : rng.pick(BASE_NAMES[slot]);
  if (leg) { it.name = leg.name; it.power = leg.id; it.flavour = leg.flavour; it.cls = leg.cls ?? it.cls; if (it.slot !== 'main') it.cls = leg.cls ?? null; }
  else if (set) { it.name = SETS[set].pieces[slot]; it.set = set; it.flavour = SET_FLAVOUR; it.cls = SETS[set].cls; }
  else {
    if (rarity === 'common') it.name = baseName;
    else if (rarity === 'blessed') it.name = `${rng.pick(PREFIXES)} ${baseName}`;
    else it.name = `${rng.pick(PREFIXES)} ${baseName} ${rng.pick(SUFFIXES)}`;
    it.flavour = rng.pick(COMMON_FLAVOUR);
  }
  return it;
}

export function legendaryPool(cls) { return LEGENDARIES.filter((l) => !l.cls || l.cls === cls); }
export function rollLegendaryItem(rng, cls, ilvl) {
  // Prefer a legendary whose power works for this class.
  return makeItem(rng, { legendary: rng.pick(legendaryPool(cls)).id, ilvl, cls });
}
export function rollSetItem(rng, cls, ilvl, slot = null) {
  const set = SET_FOR_CLASS[cls];
  return makeItem(rng, { slot: slot ?? rng.pick(['head', 'chest', 'hands', 'feet']), set, ilvl, cls });
}

// Rolls rarity for a drop: trash 12% any item, elites always. Returns an item or null.
export function rollDrop(w, hero, kind, ilvl) {
  const rng = w.rngs.loot;
  const t = w.tuning; const diff = w.diff; const mf = 1 + hero.stats.magicFind / 100;
  const legBase = (kind === 'elite' ? 0.06 : 0.0025) * diff.leg * t.legendary * mf;
  if (kind === 'trash' && !rng.chance(0.12)) return null;
  if (rng.chance(legBase)) {
    if (rng.chance(0.15)) return rollSetItem(rng, hero.cls, ilvl);
    return rollLegendaryItem(rng, hero.cls, ilvl);
  }
  let rarity = 'common';
  const roll = rng.next() / mf;
  if (kind === 'elite') rarity = roll < 0.28 ? 'reliquary' : 'blessed';
  else if (roll < 0.05) rarity = 'reliquary';
  else if (roll < 0.33) rarity = 'blessed';
  return makeItem(rng, { rarity, ilvl, cls: hero.cls });
}

export const itemValue = (it) => Math.round(({ common: 8, blessed: 22, reliquary: 90, legendary: 400, set: 400 })[it.rarity] * (1 + it.ilvl * 0.35));
export const itemScore = (it, hero) => {
  // A plain number for "is this an upgrade": weapon damage, armour, power and friends.
  let s = (it.dps ?? 0) * 6 + (it.armour ?? 0) * 1.2;
  for (const a of it.affixes) {
    if (a.k === 'power' || a.k === 'vitality') s += a.v * 1.2;
    else if (a.k === 'socket') s += 5;
    else if (a.k === 'goldFind' || a.k === 'magicFind' || a.k === 'pickup') s += a.v * 0.1;
    else s += a.v * 0.6;
  }
  if (it.power) s += 25;
  if (it.set) s += 25;
  return s;
};
export const canWear = (it, hero) => !(it.slot === 'main' && it.cls && it.cls !== hero.cls);
export const randomGem = (rng) => ({ k: rng.pick(GEM_IDS), tier: 0 });
