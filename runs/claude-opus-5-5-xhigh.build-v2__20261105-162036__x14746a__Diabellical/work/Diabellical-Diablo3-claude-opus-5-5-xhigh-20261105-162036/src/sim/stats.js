// Derived hero stats: base + gear + gems + sets + Reliquary + Vows + Devotion. Pure.
import { CLASSES } from '../data/classes.js';
import { ARMOUR_SHARE, DEVOTION_TRACKS, GEM_KINDS, LEGENDARIES, parseGem, SLOTS } from '../data/items.js';
import { heroLife, RULES } from '../data/tuning.js';

export function emptyStats() {
  return { power: 0, vit: 0, armor: 0, armorpct: 0, crit: 0.05, critdmg: 0, atkspd: 0, cdr: 0, costred: 0, lifehit: 0, regen: 0, speed: 0, speedpct: 0, area: 0, sound: 0, flame: 0, grave: 0, maxres: 0, gold: 0, magic: 0, pickup: 0, thorns: 0, dmgpct: 0, lifepct: 0, drpct: 0, weaponDps: 5 };
}

export function addItem(st, item) {
  if (!item) return;
  if (item.dps) st.weaponDps = item.dps;
  if (item.armor) st.armor += item.armor;
  for (const a of item.affixes ?? []) {
    if (a.k === 'socket') continue;
    if (a.k === 'armor') st.armorpct += a.v;
    else if (a.k === 'speed') st.speedpct += a.v;
    else st[a.k] = (st[a.k] ?? 0) + a.v;
  }
  const isWeapon = item.slot === 'main';
  for (const g of item.gems ?? []) {
    if (!g) continue;
    const { kind, tier } = parseGem(g);
    const def = isWeapon ? GEM_KINDS[kind].weapon : GEM_KINDS[kind].armour;
    const v = def.v[tier];
    if (def.k === 'pickup_gold') { st.pickup += v; st.gold += v * 0.1; } else st[def.k] = (st[def.k] ?? 0) + v;
  }
}

/** Compute into a fresh object. `gearOverride` swaps a slot (for compare). */
export function computeStats(hero, account, tuning, gearOverride = null) {
  const cls = CLASSES[hero.cls];
  const st = emptyStats();
  st.power = 10 + 3 * (hero.level - 1);
  st.vit = 10 + 2 * (hero.level - 1);
  const gear = gearOverride ? { ...hero.gear, ...gearOverride } : hero.gear;
  const powers = {};
  const sets = {};
  for (const slot of SLOTS) {
    const item = gear[slot];
    if (!item) continue;
    addItem(st, item);
    if (item.power) powers[item.power] = true;
    if (item.set) sets[item.set] = (sets[item.set] ?? 0) + 1;
  }
  for (const p of Object.values(hero.reliquary ?? {})) if (p) powers[p] = true;

  // Devotion (shared by the account).
  const dev = account?.devotion?.spent;
  if (dev) {
    for (const [track, ranks] of Object.entries(dev)) {
      const t = DEVOTION_TRACKS[track];
      if (!t) continue;
      t.stats.forEach(([k, , per], i) => { st[k] = (st[k] ?? 0) + per * (ranks[i] ?? 0); });
    }
  }
  const vows = hero.vows ?? [];
  const hasVow = (v) => vows.includes(v);
  if (hasVow('iron')) st.armorpct += 0.2;
  if (hasVow('clamour')) st.maxres += 20;
  if (hasVow('long_wick')) st.maxres += 20;

  st.maxHp = Math.round(heroLife(hero.level, st.vit) * cls.lifeMul * (tuning?.playerLife ?? 1) * (1 + st.lifepct));
  st.armorTotal = Math.round(st.armor * cls.armorMul * (1 + st.armorpct));
  st.maxResTotal = cls.baseRes + st.maxres;
  st.moveSpeed = cls.speed * (1 + st.speedpct) * (tuning?.playerSpeed ?? 1);
  st.pickupR = (tuning?.pickupRadius ?? 3) + st.pickup;
  st.powers = powers;
  st.sets = sets;
  const set2 = {}, set4 = {};
  for (const [k, n] of Object.entries(sets)) { if (n >= 2) set2[k] = true; if (n >= 4) set4[k] = true; }
  st.set2 = set2;
  st.set4 = set4;
  st.resonanceMax = RULES.resonanceMax;
  if (powers.verger_cowl) st.resonanceMax = 8;
  if (set2.ringing_order) st.resonanceMax = 10;
  return st;
}

export const toughness = (st, level) => st.maxHp / (1 - st.armorTotal / (st.armorTotal + 50 * level));
export const dpsScore = (st) => st.weaponDps * (1 + st.power / 100) * (1 + st.dmgpct) * (1 + Math.min(st.crit, 1) * (0.5 + st.critdmg)) * (1 + st.atkspd);
export const recovery = (st) => st.regen + st.lifehit * 2;
export const armourShareOf = (slot) => ARMOUR_SHARE[slot] ?? 0;
export const legendaryDef = (id) => LEGENDARIES[id];
