// Derives a hero's numbers from level, gear, gems, Vows, Devotion and buffs.
import { CLASSES } from '../data/classes.js';
import { DEVOTION_TRACKS, GEMS, LEGENDARY } from '../data/items.js';
import { F } from '../data/tuning.js';

const BLANK = () => ({ power: 0, vitality: 0, armour: 0, armourPct: 0, crit: 5, critDmg: 50, atkSpd: 0, cdr: 0, costRed: 0, lifePerHit: 0, regen: 0, moveSpd: 0, area: 0, soundPct: 0, flamePct: 0, gravePct: 0, maxRes: 0, goldFind: 0, magicFind: 0, pickup: 0, thorns: 0, dmgPct: 0, lifePct: 0, dr: 0 });

export function recalc(h, tuning, devotion) {
  const s = BLANK();
  const cls = CLASSES[h.cls];
  s.power = 10 + 3 * (h.level - 1);
  s.vitality = 10 + 2 * (h.level - 1);
  let dps = 6;
  const powers = new Set();
  const setCount = {};
  for (const slot of Object.keys(h.gear)) {
    const it = h.gear[slot]; if (!it) continue;
    if (it.dps) dps = it.dps;
    s.armour += it.armour ?? 0;
    for (const a of it.affixes) if (a.k !== 'socket' && a.k in s) s[a.k] += a.v;
    if (it.power) powers.add(it.power);
    if (it.set) setCount[it.set] = (setCount[it.set] ?? 0) + 1;
    if (it.gem) {
      const g = GEMS[it.gem.k]; const e = slot === 'main' ? g.weapon : g.armour;
      s[e.k] = (s[e.k] ?? 0) + e.per[it.gem.tier];
      if (e.gold) s.goldFind += e.gold[it.gem.tier];
    }
  }
  for (const k of ['weapon', 'armour', 'jewel']) { const p = h.reliquary?.[k]; if (p && LEGENDARY[p]) powers.add(p); }
  if (devotion) for (const k of Object.keys(DEVOTION_TRACKS)) {
    const n = devotion[k] ?? 0; const st = DEVOTION_TRACKS[k].stats;
    for (const st2 of Object.keys(st)) s[st2] = (s[st2] ?? 0) + st[st2] * n;
  }
  const v = h.vows ?? [];
  if (v.includes('iron')) s.armourPct += 20;
  if (v.includes('long_wick')) s.maxRes += 20;
  if (v.includes('plot_holder')) s.gravePct += 10;
  if (powers.has('deaf_cowl')) s.stunImmune = true;
  s.armour = s.armour * (1 + s.armourPct / 100) * cls.armorMul + 4 + h.level * 2;
  s.maxHp = Math.round(F.heroLife(h.level, s.vitality) * cls.lifeMul * (1 + s.lifePct / 100) * tuning.playerLife);
  s.maxResource = 100 + s.maxRes;
  s.weaponDps = dps;
  s.speed = cls.speed * (1 + Math.min(s.moveSpd, 60) / 100) * tuning.playerSpeed;
  s.pickupR = tuning.pickup + s.pickup;
  h.stats = s;
  h.powers = powers;
  h.setCount = setCount;
  h.setBonus = {};
  for (const [id, n] of Object.entries(setCount)) { if (n >= 2) h.setBonus[id + '2'] = true; if (n >= 4) h.setBonus[id + '4'] = true; }
  if (h.setBonus.ringing_order2) h.resonanceCap = 10; else h.resonanceCap = powers.has('deaf_cowl') ? 8 : 5;
  h.burnMul = h.setBonus.last_lamplighter2 ? 1.3 : 1;
  if (h.hp > s.maxHp) h.hp = s.maxHp;
  if (h.res > s.maxResource) h.res = s.maxResource;
}

// The three big numbers on the Stats screen and item compare.
export const damageRating = (h) => { const s = h.stats; return s.weaponDps * (1 + s.power / 100) * (1 + s.dmgPct / 100) * (1 + (s.crit / 100) * (0.5 + s.critDmg / 100)) * (1 + s.atkSpd / 100); };
export const toughnessRating = (h) => { const s = h.stats; const L = h.level; return s.maxHp / (1 - F.reduction(s.armour, L)); };
export const recoveryRating = (h) => { const s = h.stats; return s.regen + s.lifePerHit * 2; };
