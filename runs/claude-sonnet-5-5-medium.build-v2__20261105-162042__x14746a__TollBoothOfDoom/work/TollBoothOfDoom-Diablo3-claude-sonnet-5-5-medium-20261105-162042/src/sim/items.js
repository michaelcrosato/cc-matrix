// Item generation and hero stat derivation. Pure: takes an Rng.
import { AFFIXES, AFFIX_KEYS, ARMOUR_BASE, ARMOUR_SLOTS, FLAVOUR, GEMS, GEM_VALUE, LEGENDARIES, PREFIX, RARITIES, SALVAGE, SETS, SET_OF_CLASS, SLOTS, SUFFIX, WEAPON_NAMES } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { heroLifeBase, weaponDps } from './stats.js';

let uid = 1;
export const newUid = () => uid++;
export const resetUid = (n = 1) => { uid = n; };

const rollAffix = (rng, key, ilvl, rarityMult) => {
  const a = AFFIXES[key];
  const t = Math.min(1, (ilvl - 1) / 29);
  const base = a.lo + (a.hi - a.lo) * t;
  const v = base * rng.range(0.7, 1.15) * (0.8 + 0.2 * rarityMult);
  return { k: key, v: Math.max(1, Math.round(v)) };
};

export function pickAffixes(rng, slot, n, exclude = []) {
  const pool = AFFIX_KEYS.filter((k) => !exclude.includes(k) && (!AFFIXES[k].feetOnly || slot === 'feet'));
  const out = [];
  while (out.length < n && pool.length) { const k = rng.pick(pool); pool.splice(pool.indexOf(k), 1); out.push(k); }
  return out;
}

/** Make an item. opts: { slot, rarity, ilvl, cls, legendary: id, setPiece: true, base } */
export function makeItem(rng, opts) {
  const ilvl = Math.max(1, Math.min(30, opts.ilvl || 1));
  let leg = opts.legendary ? LEGENDARIES[opts.legendary] : null;
  const slot = leg ? leg.slot : (opts.slot || rng.pick(SLOTS));
  let rarity = opts.rarity || 'common';
  if (leg) rarity = 'legendary';
  const R = RARITIES[rarity];
  const cls = opts.cls || (leg && leg.cls) || 'bellwarden';
  const item = { uid: newUid(), slot, rarity, ilvl, affixes: [], sockets: 0, gems: [], name: '', flavour: rng.pick(FLAVOUR), cls: null };
  if (slot === 'main') {
    item.base = opts.base || (leg && leg.base) || rng.pick(CLASSES[cls].weapons);
    item.dps = weaponDps(ilvl, R.mult, rng.range(0.9, 1.1));
  } else if (slot === 'off') {
    item.base = opts.base || (leg && leg.base) || rng.pick(CLASSES[cls].offhands);
    item.armour = (2 + ilvl * 1.0) * R.mult;
  } else if (ARMOUR_SLOTS.includes(slot)) {
    item.base = rng.pick(ARMOUR_BASE[slot]);
    item.armour = (3 + ilvl * 1.5) * R.mult;
    item.tier = ilvl >= 18 ? 2 : ilvl >= 8 ? 1 : 0;
  } else {
    item.base = rng.pick(ARMOUR_BASE[slot]);
  }
  const [lo, hi] = R.aff;
  const n = lo === hi ? lo : rng.int(lo, hi);
  const keys = pickAffixes(rng, slot, n);
  item.affixes = keys.map((k) => rollAffix(rng, k, ilvl, R.mult));
  if (slot === 'main' || slot === 'off') { /* weapons keep affixes */ }
  if (leg) {
    item.power = opts.legendary; item.name = leg.name; item.flavour = leg.flavour; item.cls = leg.cls || null;
    if (!item.cls && leg.slot === 'off') item.cls = null;
  } else if (opts.setPiece || rarity === 'set') {
    const setId = SET_OF_CLASS[cls]; const S = SETS[setId];
    const slots = Object.keys(S.pieces);
    item.slot = opts.slot && slots.includes(opts.slot) ? opts.slot : rng.pick(slots);
    item.rarity = 'set'; item.set = setId; item.name = S.pieces[item.slot]; item.cls = cls;
    item.base = S.pieces[item.slot]; item.armour = (3 + ilvl * 1.5) * RARITIES.set.mult; delete item.dps;
    item.tier = ilvl >= 18 ? 2 : ilvl >= 8 ? 1 : 0;
  } else if (R.rank >= 1) {
    const base = slot === 'main' ? WEAPON_NAMES[item.base] : item.base;
    item.name = R.rank >= 2 ? `${rng.pick(PREFIX)} ${base} ${rng.pick(SUFFIX)}` : `${rng.pick(PREFIX)} ${base}`;
  } else {
    item.name = slot === 'main' ? WEAPON_NAMES[item.base] : item.base;
  }
  if (!item.name) item.name = item.base;
  if (opts.sockets != null) item.sockets = opts.sockets;
  else if (R.rank >= 2 && rng.chance(0.5)) item.sockets = 1;
  return item;
}

export function rollDrop(rng, { ilvl, cls, forceRarity, magicFind = 0, legMult = 1, tuningLeg = 1, elite = false, minRarity = null }) {
  let rarity = forceRarity;
  if (!rarity) {
    const legChance = (elite ? 0.06 : 0.0025) * legMult * tuningLeg * (1 + magicFind / 100);
    const r = rng.next();
    if (r < legChance) rarity = 'legendary';
    else if (r < legChance + (elite ? 0.18 : 0.04) * (1 + magicFind / 200)) rarity = 'reliquary';
    else if (r < legChance + (elite ? 0.55 : 0.28)) rarity = 'blessed';
    else rarity = 'common';
  }
  if (minRarity && RARITIES[rarity].rank < RARITIES[minRarity].rank) rarity = minRarity;
  if (rarity === 'legendary') {
    const pool = Object.keys(LEGENDARIES).filter((k) => !LEGENDARIES[k].cls || LEGENDARIES[k].cls === cls);
    return makeItem(rng, { rarity, ilvl, cls, legendary: rng.pick(pool), slot: undefined });
  }
  const slot = rng.pick(SLOTS);
  return makeItem(rng, { slot, rarity, ilvl, cls });
}

export const gemValue = (g, weapon) => GEM_VALUE[weapon ? 'weapon' : 'armour'][g.tier];

/** Derived stats from the hero's level, gear, gems, vows, devotion. */
export function deriveStats(h, devotion = null) {
  const cls = CLASSES[h.cls];
  const s = {
    power: 10 + 3 * (h.level - 1), vit: 10 + 2 * (h.level - 1), armourPct: 0, crit: 5, critDmg: 50, atkSpeed: 0, cdr: 0, costRed: 0, lifeHit: 0, regen: 0, move: 0,
    area: 0, sound: 0, flame: 0, grave: 0, maxRes: 0, goldFind: 0, magicFind: 0, pickup: 0, thorns: 0, dmgPct: 0, gemAtk: 0, gemCrit: 0, gemDmg: 0, elitePct: 0,
    weaponDps: 8, armourBase: 0, sets: {},
  };
  const gear = h.gear || {};
  const setCount = {};
  const powers = new Set();
  for (const slot of SLOTS) {
    const it = gear[slot];
    if (!it) continue;
    if (it.dps) s.weaponDps = it.dps;
    if (it.armour) s.armourBase += it.armour;
    for (const a of it.affixes) {
      const v = a.v;
      switch (a.k) {
        case 'power': s.power += v; break; case 'vitality': s.vit += v; break; case 'armour': s.armourPct += v; break;
        case 'crit': s.crit += v; break; case 'critDmg': s.critDmg += v; break; case 'atkSpeed': s.atkSpeed += v; break;
        case 'cdr': s.cdr += v; break; case 'costRed': s.costRed += v; break; case 'lifeHit': s.lifeHit += v; break;
        case 'regen': s.regen += v; break; case 'moveSpeed': s.move += v; break; case 'area': s.area += v; break;
        case 'sound': s.sound += v; break; case 'flame': s.flame += v; break; case 'grave': s.grave += v; break;
        case 'maxRes': s.maxRes += v; break; case 'goldFind': s.goldFind += v; break; case 'magicFind': s.magicFind += v; break;
        case 'pickup': s.pickup += v; break; case 'thorns': s.thorns += v; break;
      }
    }
    for (const g of it.gems || []) {
      const wpn = slot === 'main';
      const val = gemValue(g, wpn);
      if (wpn) { if (g.kind === 'ember') s.gemDmg += val; if (g.kind === 'salt') s.gemCrit += val; if (g.kind === 'amber') s.gemAtk += val / 2; }
      else { if (g.kind === 'ember') s.power += val; if (g.kind === 'salt') s.vit += val; if (g.kind === 'amber') { s.pickup += val / 12; s.goldFind += val / 2; } }
    }
    if (it.power) powers.add(it.power);
    if (it.set) setCount[it.set] = (setCount[it.set] || 0) + 1;
  }
  for (const p of h.reliquary || []) if (p) powers.add(p);
  s.powers = powers;
  s.sets = setCount;
  s.atkSpeed += s.gemAtk; s.critDmg += s.gemCrit; s.dmgPct += s.gemDmg;
  if (devotion) {
    const d = devotion;
    s.power += (d.core || 0) * 2; s.vit += (d.core || 0) * 2; s.move += Math.floor((d.core || 0) / 3);
    s.atkSpeed += (d.offence || 0) * 0.5; s.crit += (d.offence || 0) * 0.3; s.critDmg += (d.offence || 0) * 1.5; s.cdr += (d.offence || 0) * 0.3;
    s.armourPct += (d.defence || 0) * 1.2; s.regen += (d.defence || 0) * 0.5; s.lifePct = (d.defence || 0) * 1.5;
    s.area += (d.utility || 0) * 0.8; s.costRed += (d.utility || 0) * 0.5; s.lifeHit += (d.utility || 0) * 0.5; s.goldFind += (d.utility || 0) * 2;
  }
  const vows = h.vows || [];
  s.vowIron = vows.includes('iron'); s.vowClamour = vows.includes('clamour'); s.vowContrition = vows.includes('contrition'); s.vowSilence = vows.includes('silence');
  s.vowLongWick = vows.includes('long_wick'); s.vowBright = vows.includes('bright_eyes'); s.vowKeeper = vows.includes('keeper'); s.vowLastLight = vows.includes('last_light');
  s.vowUnion = vows.includes('union'); s.vowPlot = vows.includes('plot'); s.vowCare = vows.includes('care'); s.vowMourner = vows.includes('mourner');
  if (s.vowIron) s.armourPct += 20;
  if (s.vowLongWick) s.maxRes += 20;
  if (s.vowClamour) s.maxRes += 20;
  s.armour = s.armourBase * (1 + s.armourPct / 100) * cls.armour * 4;
  s.maxHpBase = heroLifeBase(h.level, s.vit) * cls.life * (1 + (s.lifePct || 0) / 100);
  s.resMax = cls.resMax + s.maxRes;
  s.speed = cls.speed * (1 + s.move / 100);
  s.toughness = s.maxHpBase * (1 + s.armour / (s.armour + 50 * Math.max(1, h.level)));
  s.damage = s.weaponDps * (1 + s.power / 100);
  return s;
}

export function itemScore(it, cls) {
  if (!it) return 0;
  let v = 0;
  if (it.dps) v += it.dps * 3;
  if (it.armour) v += it.armour * 2;
  for (const a of it.affixes) v += a.v * (['power', 'vitality'].includes(a.k) ? 1 : 1.4);
  if (it.power) v += 80;
  if (it.set) v += 30;
  return v;
}

/** Is `it` better than what is worn? (one-button equip) */
export function isUpgrade(h, it) {
  if (it.cls && it.cls !== h.cls) return false;
  if (it.slot === 'main' && it.base && !CLASSES[h.cls].weapons.includes(it.base)) return false;
  if (it.slot === 'off' && it.base && !CLASSES[h.cls].offhands.includes(it.base) ) return false;
  const slot = it.slot === 'ring' ? (h.gear.ring && h.gear.ring2 === undefined ? 'ring' : 'ring') : it.slot;
  return itemScore(it) > itemScore(h.gear[slot]) * 1.02;
}

export function salvageOf(it) { const [m, n] = SALVAGE[it.rarity]; return [m, n + Math.floor(it.ilvl / 10)]; }
export function sellPrice(it) { return Math.round((6 + it.ilvl * 5) * (1 + RARITIES[it.rarity].rank * 1.4)); }
export function buyPrice(it) { return Math.round(sellPrice(it) * 3.2); }
export function describeAffix(a) { return AFFIXES[a.k].fmt.replace('{v}', a.v); }
export function itemLines(it) {
  const lines = [];
  if (it.dps) lines.push(`${Math.round(it.dps)} Damage`);
  if (it.armour) lines.push(`${Math.round(it.armour)} Armour`);
  for (const a of it.affixes) lines.push(describeAffix(a));
  if (it.power) lines.push(LEGENDARIES[it.power].text);
  if (it.sockets) lines.push(it.gems.length ? `Socket: ${it.gems.map((g) => `${GEMS[g.kind].name} ${g.tier + 1}`).join(', ')}` : `${it.sockets} empty socket`);
  return lines;
}
