// Every balance number that dev mode exposes. Systems read TUNING.x at the moment of use and never cache it.
export const SLIDERS = [
  { key: 'playerSpeed', label: 'PLAYER SPEED', def: 1, min: 0.5, max: 2, step: 0.05 },
  { key: 'playerDamageTaken', label: 'DAMAGE TAKEN', def: 1, min: 0, max: 3, step: 0.05 },
  { key: 'weaponDamage', label: 'WEAPON DAMAGE', def: 1, min: 0.25, max: 4, step: 0.05 },
  { key: 'enemyHealth', label: 'ENEMY HEALTH', def: 1, min: 0.25, max: 4, step: 0.05 },
  { key: 'enemyAccuracy', label: 'ENEMY ACCURACY', def: 1, min: 0.25, max: 3, step: 0.05 },
  { key: 'enemyVision', label: 'ENEMY VISION M', def: 90, min: 20, max: 200, step: 5 },
  { key: 'enemyReaction', label: 'ENEMY REACTION S', def: 0.45, min: 0.1, max: 2, step: 0.05 },
  { key: 'wearRate', label: 'WEAR RATE', def: 1, min: 0, max: 5, step: 0.1 },
  { key: 'jamRate', label: 'JAM RATE', def: 1, min: 0, max: 5, step: 0.1 },
  { key: 'fireSpread', label: 'FIRE SPREAD', def: 1, min: 0, max: 3, step: 0.05 },
  { key: 'fireDamage', label: 'FIRE DAMAGE HP/S', def: 8, min: 0, max: 30, step: 1 },
  { key: 'windEffect', label: 'WIND EFFECT', def: 1, min: 0, max: 3, step: 0.05 },
  { key: 'feverMinutes', label: 'FEVER MINUTES', def: 12, min: 2, max: 40, step: 1 },
  { key: 'vehicleTopSpeed', label: 'VEHICLE TOP SPEED', def: 26, min: 10, max: 45, step: 1 },
  { key: 'vehicleToughness', label: 'VEHICLE TOUGHNESS', def: 1, min: 0.25, max: 4, step: 0.05 },
  { key: 'stonesReward', label: 'STONES REWARD', def: 1, min: 0, max: 5, step: 0.1 },
  { key: 'buddyWoundChance', label: 'BUDDY WOUND CHANCE', def: 0.15, min: 0, max: 1, step: 0.05 },
  { key: 'dayMinutes', label: 'DAY MINUTES', def: 30, min: 2, max: 120, step: 1 },
  { key: 'postRemanHours', label: 'POST REMAN HOURS', def: 24, min: 1, max: 96, step: 1 },
  { key: 'regrowHours', label: 'REGROW HOURS', def: 48, min: 1, max: 200, step: 1 },
];
export const TUNING_DEFAULTS = Object.fromEntries(SLIDERS.map((s) => [s.key, s.def]));
