// Every balance number the dev sliders expose. Systems read TUNING live, every frame.
export const TUNING_SPEC = [
  // key, label, default, min, max, step
  ['walkSpeed', 'WALK SPEED', 3.0, 1, 6, 0.1],
  ['runSpeed', 'RUN SPEED', 4.8, 2, 9, 0.1],
  ['aimWalkSpeed', 'AIM WALK SPEED', 0, 0, 3, 0.1],
  ['padAimSpeed', 'PAD AIM SPEED', 1.1, 0.3, 3, 0.05],
  ['mouseAimSpeed', 'MOUSE AIM SPEED', 0.0016, 0.0004, 0.005, 0.0001],
  ['aimAssist', 'AIM ASSIST', 0.35, 0, 1, 0.05],
  ['laserSway', 'LASER SWAY', 1, 0, 3, 0.1],
  ['weaponDamage', 'WEAPON DAMAGE X', 1, 0.2, 4, 0.1],
  ['fireRate', 'FIRE RATE X', 1, 0.25, 3, 0.05],
  ['reloadSpeed', 'RELOAD SPEED X', 1, 0.25, 3, 0.05],
  ['enemyHp', 'ENEMY HP X', 1, 0.2, 4, 0.1],
  ['enemySpeed', 'ENEMY SPEED X', 1, 0.25, 2.5, 0.05],
  ['attackTokens', 'ATTACK TOKENS', 2, 1, 8, 1],
  ['windup', 'WIND-UP X', 1, 0.25, 3, 0.05],
  ['maxActive', 'MAX ACTIVE', 12, 2, 30, 1],
  ['staggerChance', 'STAGGER CHANCE', 0.7, 0, 1, 0.05],
  ['kickRadius', 'KICK RADIUS', 2.6, 1, 6, 0.1],
  ['kickDamage', 'KICK DAMAGE', 25, 5, 120, 5],
  ['lootRate', 'LOOT RATE X', 1, 0.2, 3, 0.05],
  ['moneyRate', 'MONEY RATE X', 1, 0.2, 4, 0.1],
  ['damageTaken', 'DAMAGE TAKEN X', 1, 0.1, 3, 0.05],
  ['dameHp', 'DAME HEALTH', 100, 20, 400, 10],
  ['dameGrabTime', 'DAME GRAB TIME', 12, 4, 30, 1],
  ['qteWindow', 'QTE WINDOW', 0.9, 0.3, 2.5, 0.05],
];

export const TUNING_DEFAULTS = Object.freeze(Object.fromEntries(TUNING_SPEC.map(([k, , d]) => [k, d])));
export const TUNING = { ...TUNING_DEFAULTS };
export const resetTuning = (key) => {
  if (key) TUNING[key] = TUNING_DEFAULTS[key];
  else Object.assign(TUNING, TUNING_DEFAULTS);
};

// Movement and camera constants that aren't sliders.
export const MOVE = { slowSpeed: 1.6, slowTilt: 0.55, accel: 18, turnRate: (540 * Math.PI) / 180, quickTurn: 0.3, hitGrace: 1 };
export const CAM = {
  explore: { dist: 4.0, up: 0.45, side: 0.55, fov: 55 },
  aim: { dist: 2.9, up: 0.1, side: 0.95, fov: 42 },
  scopeFov: 16,
  ease: 0.16,
  padExploreYaw: 2.2,
  mouseExplore: 0.0026,
  pitchMin: -0.7,
  pitchMax: 0.7,
  pitchScale: 0.6,
};

export const DIFFICULTY = {
  assisted: { label: 'ASSISTED', enemyDamage: 0.6, aimAssist: 1.5, sawLethal: false, loot: 1.3, tokens: 0, text: 'ENEMIES HIT SOFTER. THE SAW WILL NOT KILL OUTRIGHT. MORE LOOT.' },
  standard: { label: 'STANDARD', enemyDamage: 1, aimAssist: 1, sawLethal: true, loot: 1, tokens: 0, text: 'THE POLICY AS WRITTEN.' },
  professional: { label: 'PROFESSIONAL', enemyDamage: 1.4, aimAssist: 1, sawLethal: true, loot: 0.8, tokens: 1, text: 'ENEMIES HIT HARDER AND ATTACK IN NUMBERS. LESS LOOT.' },
};
