// Every balance number a designer should reach for. Sim code reads these through world.tuning.
// Each row is also a dev-mode slider.
export const TUNING = [
  { id: 'monsterHp', label: 'MONSTER HP', def: 1, min: 0.1, max: 5, step: 0.1 },
  { id: 'monsterDamage', label: 'MONSTER DAMAGE', def: 1, min: 0, max: 5, step: 0.1 },
  { id: 'monsterDensity', label: 'MONSTER DENSITY', def: 1, min: 0.2, max: 3, step: 0.1 },
  { id: 'eliteFrequency', label: 'ELITE FREQUENCY', def: 1, min: 0, max: 3, step: 0.1 },
  { id: 'playerDamage', label: 'PLAYER DAMAGE', def: 1, min: 0.1, max: 5, step: 0.1 },
  { id: 'playerLife', label: 'PLAYER LIFE', def: 1, min: 0.2, max: 5, step: 0.1 },
  { id: 'playerSpeed', label: 'PLAYER SPEED', def: 1, min: 0.5, max: 2, step: 0.05 },
  { id: 'cooldownScale', label: 'COOLDOWN SCALE', def: 1, min: 0, max: 3, step: 0.1 },
  { id: 'resourceRegen', label: 'RESOURCE REGEN', def: 1, min: 0, max: 5, step: 0.1 },
  { id: 'xpRate', label: 'XP RATE', def: 1, min: 0, max: 10, step: 0.1 },
  { id: 'goldRate', label: 'GOLD RATE', def: 1, min: 0, max: 10, step: 0.1 },
  { id: 'legendaryChance', label: 'LEGENDARY CHANCE', def: 1, min: 0, max: 20, step: 0.5 },
  { id: 'dodgeCooldown', label: 'DODGE COOLDOWN', def: 3, min: 0, max: 10, step: 0.25 },
  { id: 'tallowChance', label: 'TALLOW CHANCE', def: 0.08, min: 0, max: 1, step: 0.01 },
  { id: 'potionCooldown', label: 'POTION COOLDOWN', def: 30, min: 0, max: 90, step: 1 },
  { id: 'pickupRadius', label: 'PICK-UP RADIUS', def: 3, min: 0.5, max: 12, step: 0.25 },
  { id: 'hitFeel', label: 'HIT FEEL', def: 1, min: 0, max: 3, step: 0.1 },
  { id: 'viewHeight', label: 'CAMERA VIEW HEIGHT', def: 11.5, min: 7, max: 20, step: 0.5 },
];

export function defaultTuning() {
  const t = {};
  for (const r of TUNING) t[r.id] = r.def;
  return t;
}

// Non-slider constants for the combat rules.
export const RULES = {
  heroRadius: 0.4,
  dodgeTime: 0.35,
  dodgeDist: 4.5,
  potionHeal: 0.6,
  tallowHeal: 0.2,
  interactRange: 2.2,
  hostileNear: 4,
  aggroRange: 12,
  dormantRange: 30,
  requiemWindow: 1,
  requiemMin: 10,
  requiemXp: 0.02,
  inventorySize: 40,
  stashTabs: 3,
  stashSize: 30,
  levelCap: 30,
  resonanceMax: 5,
  resonanceTime: 6,
  resonanceBonus: 0.25,
  burnDps: 0.3,
  burnTime: 4,
  burnBonus: 0.15,
  graveLife: 12,
  corpseTithe: 3,
  corpseTitheRange: 10,
  bellChannel: 1.5,
  reviveHold: 2,
  deathWaitBase: 5,
  deathWaitStep: 5,
  deathWaitMax: 30,
  slotLevels: [1, 1, 3, 6, 9, 12],
  toneLevels: [2, 6, 11],
  vowLevels: [5, 15],
  devotionLevelBase: 15000,
  devotionLevelStep: 1500,
};

// The formulas from the design, in one place so tests can check them.
export const xpToNext = (L) => Math.round(60 * L ** 1.75 + 40);
export const monsterHpAt = (L) => 20 * 1.15 ** (L - 1);
export const monsterHitAt = (L) => 6 * 1.12 ** (L - 1);
export const monsterXpAt = (L) => 6 + 3 * L;
export const heroLife = (level, vit) => 40 + 10 * level + 8 * vit;
export const weaponDpsAt = (ilvl) => 8 * 1.13 ** ilvl;
export const armourAt = (ilvl) => 8 + 9 * ilvl;

export const DIFFICULTIES = [
  { id: 'pilgrim', name: 'PILGRIM', hp: 1, dmg: 1, reward: 1, leg: 1, afflictions: [1, 1] },
  { id: 'zealot', name: 'ZEALOT', hp: 1.6, dmg: 1.3, reward: 1.25, leg: 1.2, afflictions: [2, 2] },
  { id: 'martyr', name: 'MARTYR', hp: 2.6, dmg: 1.7, reward: 1.6, leg: 1.5, afflictions: [3, 4] },
  { id: 'penance1', name: 'PENANCE I', hp: 4.2, dmg: 2.2, reward: 2, leg: 2, afflictions: [3, 4], penance: true },
  { id: 'penance2', name: 'PENANCE II', hp: 6.8, dmg: 2.9, reward: 2.6, leg: 2.6, afflictions: [3, 4], penance: true },
  { id: 'penance3', name: 'PENANCE III', hp: 11, dmg: 3.8, reward: 3.4, leg: 3.4, afflictions: [3, 4], penance: true },
  { id: 'penance4', name: 'PENANCE IV', hp: 18, dmg: 5, reward: 4.5, leg: 4.5, afflictions: [3, 4], penance: true },
  { id: 'penance5', name: 'PENANCE V', hp: 29, dmg: 6.5, reward: 6, leg: 6, afflictions: [3, 4], penance: true },
];
