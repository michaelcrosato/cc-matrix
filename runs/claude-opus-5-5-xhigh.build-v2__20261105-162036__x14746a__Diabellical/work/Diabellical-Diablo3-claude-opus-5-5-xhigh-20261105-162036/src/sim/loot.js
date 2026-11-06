// Items and drops. An item is plain JSON, so saving, trading seats and the wire all get it for free.
import { CLASSES } from '../data/classes.js';
import { AFFIXES, ARMOUR_NAMES, ARMOUR_SHARE, BASES, FLAVOR, gemId, LEGENDARIES, NAME_PREFIX, NAME_SUFFIX, OFFHANDS, RARITIES, SET_BY_CLASS, SETS, SLOT_NAMES, SLOTS, SOCKETABLE, WEAPONS } from '../data/items.js';
import { armourAt, RULES, weaponDpsAt } from '../data/tuning.js';
import { Rng } from '../../pixel-engine.js';
import { dist, ev, nextId, unstick } from './core.js';
import { computeStats, dpsScore, toughness } from './stats.js';
import { POWERS } from './powers.js';
import { healHero } from './effects.js';
import { onItemPicked } from './quests.js';

export const itemValue = (it) => Math.round(18 * 1.13 ** it.ilvl * RARITIES[it.rarity].value);
export const buyPrice = (it) => itemValue(it) * 3;
export const sellPrice = (it) => Math.max(1, Math.round(itemValue(it) * 0.5));

let uidCounter = 1;
export const newUid = (rng) => `${(rng.next() * 1e9) | 0}-${uidCounter++}`;

function rollAffix(rng, k, ilvl) {
  const a = AFFIXES[k];
  const q = rng.range(a.r[0], a.r[1]);
  if (a.pct) return Math.round(q * 100) / 100;
  return Math.round((q + (a.perL ?? 0) * ilvl) * 10) / 10;
}

export function affixPool(slot) {
  return Object.keys(AFFIXES).filter((k) => AFFIXES[k].slots === null || AFFIXES[k].slots.includes(slot));
}

export function rollAffixes(rng, slot, n, ilvl, keep = []) {
  const pool = affixPool(slot).filter((k) => !keep.includes(k));
  rng.shuffle(pool);
  return pool.slice(0, n).map((k) => ({ k, v: rollAffix(rng, k, ilvl) }));
}

function nameFor(rng, slot, baseName, rarity) {
  if (rarity === 'common') return baseName;
  const r = rng.next();
  if (rarity === 'blessed') return r < 0.5 ? `${rng.pick(NAME_PREFIX)} ${baseName}` : `${baseName} ${rng.pick(NAME_SUFFIX)}`;
  return `${rng.pick(NAME_PREFIX)} ${baseName} ${rng.pick(NAME_SUFFIX)}`;
}

function baseFor(rng, slot, cls) {
  if (slot === 'main') { const ids = CLASSES[cls].weapons; return rng.pick(ids); }
  if (slot === 'off') { const ids = CLASSES[cls].offhands.length ? CLASSES[cls].offhands : Object.keys(OFFHANDS); return rng.pick(ids); }
  return null;
}

/** The one way an item comes to exist. */
export function makeItem(rng, { slot, rarity = 'common', ilvl = 1, cls = 'bellwarden', legendary = null, set = null, base = null, forceSocket = false }) {
  const R = RARITIES[rarity];
  let baseId = base;
  let def = null;
  if (legendary) { def = LEGENDARIES[legendary]; slot = def.slot; baseId = def.base ?? baseId; }
  if (!slot) slot = rng.pick(SLOTS);
  if (!baseId && (slot === 'main' || slot === 'off')) baseId = baseFor(rng, slot, cls);
  const baseDef = baseId ? BASES[baseId] : null;
  const it = { uid: newUid(rng), slot, rarity, ilvl, affixes: [], gems: [], name: '', flavor: '' };
  if (baseDef) { it.base = baseId; it.model = baseDef.model; it.icon = baseDef.icon; }
  const nameBase = baseDef?.name ?? rng.pick(ARMOUR_NAMES[slot]);
  it.name = def ? def.name : nameFor(rng, slot, nameBase, rarity);
  if (slot === 'main') it.dps = Math.round(weaponDpsAt(ilvl) * R.mult * rng.range(0.9, 1.1) * 10) / 10;
  if (ARMOUR_SHARE[slot]) it.armor = Math.round(armourAt(ilvl) * ARMOUR_SHARE[slot] * 7 * R.mult * rng.range(0.9, 1.1));
  const n = rng.int(R.affixes[0], R.affixes[1]);
  it.affixes = rollAffixes(rng, slot, n, ilvl);
  if (def) { it.power = def.id; it.powerText = def.power; it.flavor = def.flavor; }
  if (set) {
    const s = SETS[set];
    it.set = set;
    it.name = s.pieces[slot];
    it.flavor = 'THE ORDER IS GONE. THE LAUNDRY REMAINS.';
  }
  if (!it.flavor && rarity !== 'common' && rng.chance(0.5)) it.flavor = rng.pick(FLAVOR);
  const canSocket = SOCKETABLE.includes(slot);
  const socketRoll = rarity === 'reliquary' ? 0.3 : rarity === 'legendary' || rarity === 'set' ? 0.5 : rarity === 'blessed' ? 0.12 : 0;
  if (canSocket && (forceSocket || rng.chance(socketRoll))) it.gems = [null];
  return it;
}

export function starterItem(slot, base) {
  const rng = new Rng(`starter:${base}`);
  const it = makeItem(rng, { slot, rarity: 'common', ilvl: 1, base, cls: Object.keys(CLASSES).find((c) => CLASSES[c].weapons.includes(base)) ?? 'bellwarden' });
  it.uid = `starter-${base}`;
  it.dps = Math.round(weaponDpsAt(1) * 10) / 10;
  it.flavor = 'BURIED WITH YOU. NOBODY ELSE WANTED IT.';
  return it;
}

export function randomLegendary(rng, cls) {
  const ids = Object.keys(LEGENDARIES).filter((id) => !LEGENDARIES[id].cls || LEGENDARIES[id].cls === cls);
  return rng.pick(ids);
}

export function makeRolledItem(rng, h, rarity, ilvl, slot = null) {
  if (rarity === 'legendary') return makeItem(rng, { rarity, ilvl, cls: h.cls, legendary: randomLegendary(rng, h.cls) });
  if (rarity === 'set') {
    const set = SET_BY_CLASS[h.cls] ?? 'ringing_order';
    const pieces = Object.keys(SETS[set].pieces);
    const piece = slot && pieces.includes(slot) ? slot : rng.pick(pieces);
    return makeItem(rng, { slot: piece, rarity, ilvl, cls: h.cls, set });
  }
  return makeItem(rng, { slot: slot ?? rng.pick(SLOTS), rarity, ilvl, cls: h.cls });
}

// ---- Drops ----------------------------------------------------------------------------------
export function spawnDrop(w, d) {
  const drop = { id: nextId(w), t: 0, vanish: 0, ...d };
  unstick(w, drop);
  w.drops.push(drop);
  ev(w, {
    t: 'drop', id: drop.id, kind: drop.kind, x: drop.x, z: drop.z, owner: drop.owner, amount: drop.amount ?? 0,
    rarity: drop.item?.rarity ?? '', name: drop.item?.name ?? (drop.kind === 'gem' ? drop.gem : drop.label ?? ''), slot: drop.item?.slot ?? '',
  });
  return drop;
}

function scatter(w, x, z, spread = 1) {
  for (let i = 0; i < 8; i++) {
    const px = x + w.lootRng.range(-spread, spread), pz = z + w.lootRng.range(-spread, spread);
    if (w.zone.nav.walkable(px, pz)) return [px, pz];
  }
  return [x, z];
}

export function dropItem(w, h, item, x, z, spread = 1) {
  const [px, pz] = scatter(w, x, z, spread);
  return spawnDrop(w, { kind: 'item', item, x: px, z: pz, owner: h.seat });
}

export function dropGold(w, h, amount, x, z, spread = 1) {
  const [px, pz] = scatter(w, x, z, spread);
  return spawnDrop(w, { kind: 'gold', amount: Math.max(1, Math.round(amount)), x: px, z: pz, owner: h.seat });
}

export function dropTallow(w, x, z) {
  const [px, pz] = scatter(w, x, z, 0.6);
  return spawnDrop(w, { kind: 'tallow', x: px, z: pz, owner: -1 });
}

export const goldAt = (L) => 3 + 1.6 * L;

function rollRarity(rng, elite) {
  const r = rng.next();
  if (elite) return r < 0.25 ? 'reliquary' : r < 0.8 ? 'blessed' : 'common';
  return r < 0.08 ? 'reliquary' : r < 0.38 ? 'blessed' : 'common';
}

export function legendaryRoll(w, h, base) {
  const chance = base * w.diffDef.leg * w.tuning.legendaryChance * (1 + h.stats.magic);
  return w.lootRng.chance(chance);
}

export function rollMonsterDrops(w, h, m) {
  const rng = w.lootRng;
  const elite = m.elite === 'champion' || m.elite === 'rare' || m.def.boss;
  const L = m.level;
  const goldMult = w.diffDef.reward * w.tuning.goldRate * (1 + h.stats.gold) * (w.run?.goldMul ?? 1) * (h.buffs.some((b) => b.id === 'plenty') ? 2 : 1);
  if (m.type === 'collection_plate') {
    for (let i = 0; i < 18; i++) dropGold(w, h, goldAt(L) * 2.5 * goldMult, m.x, m.z, 3);
    dropItem(w, h, makeRolledItem(rng, h, 'reliquary', L + 1), m.x, m.z, 1.5);
    if (rng.chance(0.5)) dropItem(w, h, makeRolledItem(rng, h, 'reliquary', L + 1), m.x, m.z, 1.5);
    if (legendaryRoll(w, h, 0.1)) dropItem(w, h, makeRolledItem(rng, h, 'legendary', L + 1), m.x, m.z, 1.5);
    spawnDrop(w, { kind: 'gem', gem: gemId(rng.pick(['ember', 'salt', 'amber']), 0), x: m.x, z: m.z, owner: h.seat });
    return;
  }
  if (rng.chance(elite ? 1 : 0.3)) dropGold(w, h, goldAt(L) * (elite ? 3 : 1) * goldMult * rng.range(0.7, 1.3), m.x, m.z);
  if (rng.chance(elite ? 1 : w.tuning.tallowChance)) dropTallow(w, m.x, m.z);
  if (m.noXp || m.summoned) return;
  if (elite && !m.def.boss) {
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const rarity = i === 0 ? (rng.chance(0.3) ? 'reliquary' : 'blessed') : rollRarity(rng, true);
      dropItem(w, h, makeRolledItem(rng, h, rarity, L), m.x, m.z, 1.4);
    }
    if (legendaryRoll(w, h, 0.06)) dropLegendary(w, h, L, m.x, m.z);
    if (rng.chance(0.15)) spawnDrop(w, { kind: 'gem', gem: gemId(rng.pick(['ember', 'salt', 'amber']), 0), x: m.x, z: m.z, owner: h.seat });
    return;
  }
  if (m.def.boss) return;
  if (legendaryRoll(w, h, 0.0025)) { dropLegendary(w, h, L, m.x, m.z); return; }
  if (rng.chance(0.12)) dropItem(w, h, makeRolledItem(rng, h, rollRarity(rng, false), L), m.x, m.z);
  if (rng.chance(0.004)) spawnDrop(w, { kind: 'gem', gem: gemId(rng.pick(['ember', 'salt', 'amber']), 0), x: m.x, z: m.z, owner: h.seat });
}

export function dropLegendary(w, h, L, x, z) {
  const rng = w.lootRng;
  const rarity = rng.chance(0.2) ? 'set' : 'legendary';
  return dropItem(w, h, makeRolledItem(rng, h, rarity, L), x, z, 1.4);
}

export function spillGold(w, h, x, z, L) {
  const goldMult = w.diffDef.reward * w.tuning.goldRate * (1 + h.stats.gold);
  dropGold(w, h, goldAt(L) * 0.5 * goldMult, x, z, 0.8);
}

export function itemCompare(h, item, account, tuning) {
  const cur = h.gear[item.slot] ?? null;
  const before = h.stats ?? computeStats(h, account, tuning);
  const after = computeStats(h, account, tuning, { [item.slot]: item });
  const dmg = dpsScore(after) / dpsScore(before) - 1;
  const tough = toughness(after, h.level) / toughness(before, h.level) - 1;
  return { dmg, tough, cur };
}
export const isUpgrade = (h, item, account, tuning) => {
  const c = itemCompare(h, item, account, tuning);
  return c.dmg * 1.4 + c.tough > 0.001 && !(item.slot === 'main' && item.base && !CLASSES[h.cls].weapons.includes(item.base));
};

function pickUp(w, h, d) {
  const item = d.item;
  const i = h.inv.indexOf(null);
  if (i < 0) {
    if ((h.fullWarn ?? 0) < w.time) { h.fullWarn = w.time + 4; ev(w, { t: 'toast', text: 'YOUR PACK IS FULL. THE DEAD TRAVEL LIGHT.', color: 'mist', seat: h.seat }); }
    return false;
  }
  h.inv[i] = item;
  if (!item.seen) item.seen = false;
  ev(w, { t: 'pick', id: d.id, kind: 'item', rarity: item.rarity, name: item.name, seat: h.seat, x: d.x, z: d.z });
  const up = isUpgrade(h, item, w.account, w.tuning);
  if (up) {
    h.newest = item.uid;
    ev(w, { t: 'upgrade', seat: h.seat, name: item.name, rarity: item.rarity, uid: item.uid });
  }
  onItemPicked(w, h, item);
  return true;
}

export function stepDrops(w) {
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.t += 1 / 60;
    let taken = false;
    if (d.kind === 'tallow') {
      for (const h of w.heroes) {
        if (h.dead || h.gone || h.companion) continue;
        if (dist(h.x, h.z, d.x, d.z) < 1.1 + h.r) {
          healHero(w, h, RULES.tallowHeal);
          ev(w, { t: 'pick', id: d.id, kind: 'tallow', seat: h.seat, x: d.x, z: d.z });
          h.tallow = (h.tallow ?? 0) + 1;
          taken = true;
          break;
        }
      }
    } else {
      const h = w.heroes.find((o) => o.seat === d.owner);
      if (!h) { if (d.t > 1) taken = true; }
      else if (!h.dead && !h.gone) {
        const dd = dist(h.x, h.z, d.x, d.z);
        if (d.kind === 'gold' || d.kind === 'coin') {
          if (dd < h.stats.pickupR && d.t > 0.25) {
            const speed = 11 / 60;
            d.x += ((h.x - d.x) / (dd || 1)) * speed;
            d.z += ((h.z - d.z) / (dd || 1)) * speed;
            d.moved = true;
          }
          if (dd < 0.7) {
            h.gold += d.amount;
            h.goldEarned = (h.goldEarned ?? 0) + d.amount;
            ev(w, { t: 'pick', id: d.id, kind: 'gold', amount: d.amount, seat: h.seat, x: d.x, z: d.z });
            for (const p of Object.keys(h.stats.powers)) POWERS[p]?.onPickup?.(w, h, 'gold');
            if (d.kind === 'coin') healHero(w, h, 0.02);
            taken = true;
          }
        } else if (d.kind === 'gem') {
          if (dd < 1 + h.r) {
            h.gems[d.gem] = (h.gems[d.gem] ?? 0) + 1;
            ev(w, { t: 'pick', id: d.id, kind: 'gem', gem: d.gem, seat: h.seat, x: d.x, z: d.z });
            taken = true;
          }
        } else if (d.kind === 'mat') {
          if (dd < 1 + h.r) {
            h.mats[d.mat] = (h.mats[d.mat] ?? 0) + d.amount;
            ev(w, { t: 'pick', id: d.id, kind: 'mat', mat: d.mat, amount: d.amount, seat: h.seat, x: d.x, z: d.z });
            taken = true;
          }
        } else if (d.kind === 'key') {
          if (dd < 1 + h.r) {
            h.grandKeys = (h.grandKeys ?? 0) + 1;
            ev(w, { t: 'pick', id: d.id, kind: 'key', seat: h.seat, x: d.x, z: d.z });
            ev(w, { t: 'toast', text: 'A GRAND KEY', color: 'orange', big: 1, seat: h.seat });
            taken = true;
          }
        } else if (d.kind === 'item') {
          if (dd < 0.9 + h.r) taken = pickUp(w, h, d);
        }
      }
    }
    if (taken) { ev(w, { t: 'dropx', id: d.id }); w.drops.splice(i, 1); }
  }
}

export const slotName = (s) => SLOT_NAMES[s];
export { WEAPONS };
