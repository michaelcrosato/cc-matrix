// Every balance number a designer wants to touch. Sim code reads world.tuning, never a copy.
export const TUNING_DEFS = [
  { k: 'monsterHp', label: 'MONSTER HP', def: 1, min: 0.1, max: 5, step: 0.1 },
  { k: 'monsterDamage', label: 'MONSTER DAMAGE', def: 1, min: 0, max: 5, step: 0.1 },
  { k: 'density', label: 'MONSTER DENSITY', def: 1, min: 0.2, max: 3, step: 0.1 },
  { k: 'elite', label: 'ELITE FREQUENCY', def: 1, min: 0, max: 5, step: 0.25 },
  { k: 'playerDamage', label: 'PLAYER DAMAGE', def: 1, min: 0.1, max: 10, step: 0.1 },
  { k: 'playerLife', label: 'PLAYER LIFE', def: 1, min: 0.2, max: 5, step: 0.1 },
  { k: 'playerSpeed', label: 'PLAYER SPEED', def: 1, min: 0.5, max: 2, step: 0.05 },
  { k: 'cooldown', label: 'COOLDOWN SCALE', def: 1, min: 0, max: 3, step: 0.1 },
  { k: 'resource', label: 'RESOURCE REGEN', def: 1, min: 0, max: 5, step: 0.1 },
  { k: 'xp', label: 'XP RATE', def: 1, min: 0, max: 10, step: 0.25 },
  { k: 'gold', label: 'GOLD RATE', def: 1, min: 0, max: 10, step: 0.25 },
  { k: 'legendary', label: 'LEGENDARY CHANCE', def: 1, min: 0, max: 20, step: 0.5 },
  { k: 'dodgeCd', label: 'DODGE COOLDOWN', def: 3, min: 0, max: 10, step: 0.25 },
  { k: 'tallow', label: 'TALLOW CHANCE', def: 0.08, min: 0, max: 1, step: 0.02 },
  { k: 'potionCd', label: 'POTION COOLDOWN', def: 30, min: 0, max: 90, step: 5 },
  { k: 'pickup', label: 'PICK-UP RADIUS', def: 3, min: 0.5, max: 12, step: 0.5 },
  { k: 'feel', label: 'HIT FEEL', def: 1, min: 0, max: 2, step: 0.1 },
  { k: 'viewHeight', label: 'CAMERA VIEW HEIGHT', def: 11.5, min: 7, max: 20, step: 0.5 },
];
export const makeTuning = () => Object.fromEntries(TUNING_DEFS.map((d) => [d.k, d.def]));

// Formulas from the design, in one place.
export const F = {
  monsterHp: (L, type, players, diff, t) => 20 * 1.15 ** (L - 1) * type * (1 + 0.6 * (players - 1)) * diff * t.monsterHp,
  monsterHit: (L, type, diff, t) => 6 * 1.12 ** (L - 1) * type * diff * t.monsterDamage,
  heroLife: (level, vit) => 40 + 10 * level + 8 * vit,
  weaponDps: (ilvl, rarity, r) => 8 * 1.13 ** ilvl * rarity * r,
  xpToNext: (L) => Math.round(60 * L ** 1.75 + 40),
  monsterXp: (L, type) => (6 + 3 * L) * type,
  reduction: (armour, L) => armour / (armour + 50 * L),
};

export const DIFFICULTIES = [
  { id: 'pilgrim', name: 'PILGRIM', hp: 1, dmg: 1, xp: 1, leg: 1, afflictions: [1, 1] },
  { id: 'zealot', name: 'ZEALOT', hp: 1.6, dmg: 1.3, xp: 1.25, leg: 1.2, afflictions: [2, 2] },
  { id: 'martyr', name: 'MARTYR', hp: 2.6, dmg: 1.7, xp: 1.6, leg: 1.5, afflictions: [3, 4] },
  { id: 'penance1', name: 'PENANCE I', hp: 4.2, dmg: 2.2, xp: 2, leg: 2, afflictions: [3, 4], locked: true },
  { id: 'penance2', name: 'PENANCE II', hp: 6.8, dmg: 2.9, xp: 2.6, leg: 2.6, afflictions: [3, 4], locked: true },
  { id: 'penance3', name: 'PENANCE III', hp: 11, dmg: 3.8, xp: 3.4, leg: 3.4, afflictions: [3, 4], locked: true },
  { id: 'penance4', name: 'PENANCE IV', hp: 18, dmg: 5, xp: 4.5, leg: 4.5, afflictions: [3, 4], locked: true },
  { id: 'penance5', name: 'PENANCE V', hp: 29, dmg: 6.5, xp: 6, leg: 6, afflictions: [3, 4], locked: true },
];
export const LEVEL_CAP = 30;
export const SLOT_LEVELS = [1, 1, 3, 6, 9, 12];
export const VOW_LEVELS = [5, 15];
