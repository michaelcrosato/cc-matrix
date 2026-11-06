// Plain formulas. No engine, no DOM, no ambient randomness.
export const LEVEL_CAP = 30;
export const xpToNext = (L) => Math.round(60 * Math.pow(L, 1.75) + 40);
export const monsterHpBase = (L) => 20 * Math.pow(1.15, L - 1);
export const monsterHitBase = (L) => 6 * Math.pow(1.12, L - 1);
export const monsterXp = (L) => (6 + 3 * L) * 0.45;
export const heroLifeBase = (level, vit) => 40 + 10 * level + 8 * vit;
export const weaponDps = (itemLevel, rarityMult, roll = 1) => 8 * Math.pow(1.13, itemLevel) * rarityMult * roll;
export const reduction = (armour, monsterLevel) => armour / (armour + 50 * monsterLevel);
export const fmt = (n) => { n = Math.round(n); if (n >= 10000) return (n / 1000).toFixed(1) + 'K'; return String(n); };
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const DIFFS = [
  { id: 'pilgrim', name: 'Pilgrim', hp: 1, dmg: 1, xp: 1, leg: 1 },
  { id: 'zealot', name: 'Zealot', hp: 1.6, dmg: 1.3, xp: 1.25, leg: 1.2 },
  { id: 'martyr', name: 'Martyr', hp: 2.6, dmg: 1.7, xp: 1.6, leg: 1.5 },
  { id: 'pen1', name: 'Penance I', hp: 4.2, dmg: 2.2, xp: 2, leg: 2, post: true },
  { id: 'pen2', name: 'Penance II', hp: 6.8, dmg: 2.9, xp: 2.6, leg: 2.6, post: true },
  { id: 'pen3', name: 'Penance III', hp: 11, dmg: 3.8, xp: 3.4, leg: 3.4, post: true },
  { id: 'pen4', name: 'Penance IV', hp: 18, dmg: 5, xp: 4.5, leg: 4.5, post: true },
  { id: 'pen5', name: 'Penance V', hp: 29, dmg: 6.5, xp: 6, leg: 6, post: true },
];
export const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
