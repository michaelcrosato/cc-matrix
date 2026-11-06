// Every balance number. Systems read TUNING.x at the moment of use. Sliders live in src/dev/sliders.js.
export const TUNING_DEFAULTS = {
  playerSpeed: 1, playerDamageTaken: 1, weaponDamage: 1, enemyHealth: 1, enemyAccuracy: 1,
  enemyVision: 90, enemyReaction: 0.45, wearRate: 1, jamRate: 1, fireSpread: 1, fireDamage: 8,
  windEffect: 1, feverMinutes: 12, vehicleTopSpeed: 26, vehicleToughness: 1, stonesReward: 1,
  buddyWoundChance: 0.15, dayMinutes: 30, postRemanHours: 24, regrowHours: 48,
};
export const SLIDERS = [
  ['playerSpeed', 'Player speed', 0.5, 2, 0.05], ['playerDamageTaken', 'Damage taken', 0, 3, 0.05],
  ['weaponDamage', 'Weapon damage', 0.25, 4, 0.05], ['enemyHealth', 'Enemy health', 0.25, 4, 0.05],
  ['enemyAccuracy', 'Enemy accuracy', 0.25, 3, 0.05], ['enemyVision', 'Enemy vision m', 20, 200, 5],
  ['enemyReaction', 'Enemy reaction s', 0.1, 2, 0.05], ['wearRate', 'Gun wear', 0, 5, 0.1],
  ['jamRate', 'Jam rate', 0, 5, 0.1], ['fireSpread', 'Fire spread', 0, 3, 0.05],
  ['fireDamage', 'Fire damage HP/s', 0, 30, 1], ['windEffect', 'Wind effect', 0, 3, 0.05],
  ['feverMinutes', 'Fever minutes', 2, 40, 1], ['vehicleTopSpeed', 'Vehicle top speed', 10, 45, 1],
  ['vehicleToughness', 'Vehicle toughness', 0.25, 4, 0.05], ['stonesReward', 'Stones reward', 0, 5, 0.1],
  ['buddyWoundChance', 'Buddy wound chance', 0, 1, 0.05], ['dayMinutes', 'Day length min', 2, 120, 1],
  ['postRemanHours', 'Post reman hours', 1, 96, 1], ['regrowHours', 'Regrow hours', 1, 200, 1],
];
