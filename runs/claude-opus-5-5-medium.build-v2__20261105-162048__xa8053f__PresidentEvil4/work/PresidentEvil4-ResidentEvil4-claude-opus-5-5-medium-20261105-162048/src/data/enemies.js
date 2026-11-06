// Enemy types. hp and damage are first values, scaled by TUNING and difficulty.
export const ENEMIES = {
  gaffer: { name: 'ISLANDER', model: 'islander', hp: 34, speed: [1.1, 1.5], dmg: 14, windup: 0.7, grab: 0.2, reach: 1.7, weapon: 'gaff', gait: 'Shamble', money: [25, 80], variants: ['islander', 'islander2', 'islander3'] },
  netwife: { name: 'NET-WIFE', model: 'netwife', hp: 28, speed: [1.2, 1.2], dmg: 0, windup: 0.8, throws: 'net', range: 8, reach: 1.6, gait: 'Shamble', money: [25, 60] },
  bottler: { name: 'BOTTLER', model: 'bottler', hp: 30, speed: [1, 1], dmg: 18, windup: 1.0, throws: 'bottle', range: 11, reach: 1.6, gait: 'Shamble', money: [30, 70] },
  runner: { name: 'DECKHAND', model: 'deckhand', hp: 36, speed: [2.8, 2.8], dmg: 16, windup: 0.5, reach: 2.2, weapon: 'boathook', gait: 'Lurch', money: [30, 80] },
  carrier: { name: 'CARRIER', model: 'carrier', hp: 60, speed: [1.6, 1.6], dmg: 0, windup: 0.5, reach: 1.5, targetDame: true, gait: 'Lurch', money: [40, 90] },
  flenser: { name: 'THE FLENSER', model: 'flenser', hp: 220, speed: [2.2, 2.2], dmg: 80, windup: 0.9, reach: 2.1, saw: true, weapon: 'saw', gait: 'Shamble', money: [300, 300], heavy: true },
  limpet: { name: 'LIMPET', model: 'limpet', hp: 15, speed: [3, 3], dmg: 4, windup: 0.1, reach: 0.9, crawler: true, money: [0, 0] },
  resalted: { name: 'RE-SALTED', model: 'resalted', hp: 40, speed: [2.6, 2.6], dmg: 15, windup: 0.5, reach: 1.7, gait: 'Lurch', money: [20, 50] },
  monk: { name: 'COWLED MONK', model: 'monk', hp: 70, speed: [1.3, 1.3], dmg: 18, windup: 0.9, reach: 2.0, shield: true, weapon: 'flail', gait: 'Shamble', money: [40, 100] },
  knight: { name: 'RELIQUARY KNIGHT', model: 'knight', hp: 300, helmet: 40, speed: [0.9, 0.9], dmg: 35, windup: 1.1, reach: 2.5, armoured: true, weapon: 'halberd', gait: 'KnightWalk', money: [150, 300], heavy: true },
  drowned: { name: 'DROWNED', model: 'drowned', hp: 35, speed: [1.2, 1.2], dmg: 8, windup: 0.6, reach: 1.4, grab: 0.3, gait: 'Shamble', money: [20, 60] },
  harpooner: { name: 'BOAT HARPOONER', model: 'harpooner', hp: 50, speed: [0, 0], dmg: 22, windup: 1.4, throws: 'harpoon', range: 30, reach: 0, fixed: true, money: [40, 100] },
};
export const SPAWNABLE = ['gaffer', 'netwife', 'bottler', 'runner', 'carrier', 'flenser', 'limpet', 'resalted', 'monk', 'knight', 'drowned', 'harpooner'];
export const ISLANDER_BARKS = ['HAAL AN!', 'SKARR!', 'VOR THOLE!', 'BRINNA!', 'OV THE TIDE!', 'VEN ULDA!'];
