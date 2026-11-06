// Every number the balance sliders touch. Read live each frame. See screens/dev.js.
export const TUNING_DEFS = {
  walkSpeed: [3.0, 1, 6], runSpeed: [4.8, 2, 9], aimWalkSpeed: [0, 0, 3], padAimSpeed: [1, 0.3, 2], mouseAimSpeed: [1, 0.3, 2],
  aimAssist: [0.35, 0, 1], laserSway: [1, 0, 3], weaponDamage: [1, 0.25, 4], fireRate: [1, 0.25, 3], reloadSpeed: [1, 0.25, 3],
  enemyHp: [1, 0.25, 4], enemySpeed: [1, 0.25, 3], attackTokens: [2, 1, 8], windup: [1, 0.25, 3], maxActive: [12, 2, 30],
  staggerChance: [0.7, 0, 1], kickRadius: [2.6, 1, 6], kickDamage: [25, 5, 120], lootRate: [1, 0, 3], moneyRate: [1, 0, 3],
  damageTaken: [1, 0, 3], dameHp: [100, 20, 400], dameGrabTime: [12, 4, 40], qteWindow: [0.9, 0.3, 2.5],
};
export const TUNING = {};
export const TUNING_DEFAULT = {};
for (const k in TUNING_DEFS) { TUNING[k] = TUNING_DEFS[k][0]; TUNING_DEFAULT[k] = TUNING_DEFS[k][0]; }
export function resetTuning() { Object.assign(TUNING, TUNING_DEFAULT); }
export const DIFFICULTY = {
  assisted: { name: 'ASSISTED', dmg: 0.6, assist: 1.5, sawLethal: false, loot: 1.3, tokens: 0, about: 'ENEMY DAMAGE REDUCED. THE SAW FORGIVES.' },
  standard: { name: 'STANDARD', dmg: 1, assist: 1, sawLethal: true, loot: 1, tokens: 0, about: 'AS UNDERWRITTEN.' },
  professional: { name: 'PROFESSIONAL', dmg: 1.4, assist: 1, sawLethal: true, loot: 0.8, tokens: 1, about: 'NO CLAIMS BONUS. NO CLAIMS.' },
};
