// Every balance number that matters, live-editable from Dev Mode. Treat as first values.
export const DEFAULTS = {
  walkSpeed: 3.0, runSpeed: 4.8, aimWalkSpeed: 0, padAimSpeed: 1.0, mouseAimSpeed: 1.0, aimAssist: 0.35, laserSway: 1,
  weaponDamage: 1, fireRate: 1, reloadSpeed: 1, enemyHp: 1, enemySpeed: 1, attackTokens: 2, windup: 1, maxActive: 12,
  staggerChance: 0.7, kickRadius: 2.6, kickDamage: 25, lootRate: 1, moneyRate: 1, damageTaken: 1, dameHp: 100,
  dameGrabTime: 12, qteWindow: 0.9,
};
export const TUNING = { ...DEFAULTS };
export const SLIDERS = [
  ['walkSpeed', 'WALK SPEED', 1, 6, 0.1], ['runSpeed', 'RUN SPEED', 2, 9, 0.1], ['aimWalkSpeed', 'AIM WALK SPEED', 0, 4, 0.1],
  ['padAimSpeed', 'PAD AIM SPEED', 0.3, 2.5, 0.05], ['mouseAimSpeed', 'MOUSE AIM SPEED', 0.3, 2.5, 0.05], ['aimAssist', 'AIM ASSIST', 0, 1, 0.05],
  ['laserSway', 'LASER SWAY', 0, 3, 0.1], ['weaponDamage', 'WEAPON DAMAGE', 0.2, 4, 0.1],
  ['fireRate', 'FIRE RATE', 0.3, 3, 0.1], ['reloadSpeed', 'RELOAD SPEED', 0.3, 3, 0.1], ['enemyHp', 'ENEMY HEALTH', 0.2, 4, 0.1],
  ['enemySpeed', 'ENEMY SPEED', 0.3, 2.5, 0.05], ['attackTokens', 'ATTACK TOKENS', 1, 6, 1], ['windup', 'WIND-UP TIME', 0.3, 2.5, 0.05],
  ['maxActive', 'MAX ACTIVE ENEMIES', 2, 30, 1], ['staggerChance', 'STAGGER CHANCE', 0, 1, 0.05], ['kickRadius', 'KICK RADIUS', 1, 6, 0.1],
  ['kickDamage', 'KICK DAMAGE', 5, 100, 1], ['lootRate', 'LOOT RATE', 0, 3, 0.1], ['moneyRate', 'MONEY RATE', 0, 3, 0.1],
  ['damageTaken', 'DAMAGE TAKEN', 0, 3, 0.1], ['dameHp', 'DAME HEALTH', 20, 300, 5], ['dameGrabTime', 'DAME GRAB TIMER', 4, 40, 1],
  ['qteWindow', 'QTE WINDOW', 0.3, 3, 0.05],
];
export function resetTuning(key) {
  if (key) TUNING[key] = DEFAULTS[key];
  else Object.assign(TUNING, DEFAULTS);
}
export function tuningChanged() {
  return Object.keys(DEFAULTS).some((k) => TUNING[k] !== DEFAULTS[k]);
}
