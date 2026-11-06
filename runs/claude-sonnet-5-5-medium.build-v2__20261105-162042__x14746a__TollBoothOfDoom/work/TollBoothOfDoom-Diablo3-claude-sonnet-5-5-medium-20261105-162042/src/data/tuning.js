// Every balance number a designer may want to touch live. Dev mode builds its sliders from TUNING_DEFS.
// Sim code reads these through world.tuning, never as copied constants.
export const TUNING_DEFS = [
  { key: 'monsterHp', name: 'Monster HP', def: 1.5, min: 0.1, max: 5, step: 0.1 },
  { key: 'monsterDamage', name: 'Monster damage', def: 1, min: 0, max: 5, step: 0.1 },
  { key: 'density', name: 'Monster density', def: 1.3, min: 0.1, max: 3, step: 0.1 },
  { key: 'eliteRate', name: 'Elite frequency', def: 1, min: 0, max: 4, step: 0.25 },
  { key: 'playerDamage', name: 'Player damage', def: 1, min: 0.1, max: 10, step: 0.1 },
  { key: 'playerLife', name: 'Player life', def: 1, min: 0.1, max: 5, step: 0.1 },
  { key: 'playerSpeed', name: 'Player speed', def: 1, min: 0.5, max: 2, step: 0.05 },
  { key: 'cooldownScale', name: 'Cooldown scale', def: 1, min: 0, max: 3, step: 0.1 },
  { key: 'resourceRegen', name: 'Resource regen', def: 1, min: 0, max: 5, step: 0.1 },
  { key: 'xpRate', name: 'XP rate', def: 1, min: 0.1, max: 10, step: 0.1 },
  { key: 'goldRate', name: 'Gold rate', def: 1, min: 0.1, max: 10, step: 0.1 },
  { key: 'legendaryChance', name: 'Legendary chance', def: 1, min: 0, max: 20, step: 0.5 },
  { key: 'dodgeCooldown', name: 'Dodge cooldown', def: 3, min: 0, max: 10, step: 0.25 },
  { key: 'tallowChance', name: 'Tallow chance', def: 0.08, min: 0, max: 1, step: 0.02 },
  { key: 'potionCooldown', name: 'Potion cooldown', def: 30, min: 1, max: 60, step: 1 },
  { key: 'pickupRadius', name: 'Pick-up radius', def: 3, min: 1, max: 12, step: 0.5 },
  { key: 'feelFlash', name: 'Hit feel: flash', def: 1, min: 0, max: 2, step: 0.1 },
  { key: 'feelShake', name: 'Hit feel: shake', def: 1, min: 0, max: 2, step: 0.1 },
  { key: 'feelStop', name: 'Hit feel: stop', def: 1, min: 0, max: 2, step: 0.1 },
  { key: 'viewHeight', name: 'Camera view height', def: 11.5, min: 8, max: 18, step: 0.5 },
];
export const defaultTuning = () => Object.fromEntries(TUNING_DEFS.map((d) => [d.key, d.def]));
