// Enemy types. hp, speed (m/s), attack numbers. rig: model id.
export const ENEMIES = {
  gaffer: { id: 'gaffer', name: 'ISLANDER', hp: 34, speed: [1.1, 1.5], dmg: 14, windup: 0.7, range: 1.7, model: 'islander', grab: 0.2, money: [25, 60] },
  netwife: { id: 'netwife', name: 'NET-WIFE', hp: 28, speed: [1.2, 1.2], dmg: 6, windup: 0.8, range: 8, ranged: 'net', model: 'netwife', money: [25, 60] },
  bottler: { id: 'bottler', name: 'BOTTLER', hp: 30, speed: [1.0, 1.0], dmg: 18, windup: 1.1, range: 9, ranged: 'bottle', model: 'bottler', money: [30, 70] },
  runner: { id: 'runner', name: 'DECKHAND', hp: 36, speed: [2.8, 2.8], dmg: 16, windup: 0.5, range: 2.0, model: 'deckhand', money: [30, 70] },
  carrier: { id: 'carrier', name: 'CARRIER', hp: 60, speed: [1.6, 1.6], dmg: 0, windup: 0.4, range: 1.4, model: 'carrier', money: [40, 80] },
  flenser: { id: 'flenser', name: 'THE FLENSER', hp: 220, speed: [2.2, 2.2], dmg: 999, windup: 0.9, range: 2.2, model: 'flenser', money: [300, 300], boss: true, headOnlyStagger: true, scale: 1.1 },
  limpet: { id: 'limpet', name: 'LIMPET', hp: 15, speed: [3.0, 3.0], dmg: 4, windup: 0.1, range: 0.9, model: 'limpet', money: [0, 0], small: true },
  resalted: { id: 'resalted', name: 'RE-SALTED', hp: 40, speed: [3.2, 3.2], dmg: 12, windup: 0.4, range: 1.6, model: 'islander', money: [20, 40] },
  monk: { id: 'monk', name: 'COWLED MONK', hp: 70, speed: [1.3, 1.3], dmg: 18, windup: 0.9, range: 1.9, model: 'monk', money: [40, 90], shield: true },
  knight: { id: 'knight', name: 'RELIQUARY KNIGHT', hp: 300, helmet: 40, speed: [0.9, 0.9], dmg: 35, windup: 1.2, range: 2.4, model: 'knight', money: [200, 300], armour: true, scale: 1.2 },
  drowned: { id: 'drowned', name: 'DROWNED', hp: 35, speed: [1.2, 1.2], dmg: 8, windup: 0.6, range: 1.4, model: 'drowned', money: [25, 50] },
  harpooner: { id: 'harpooner', name: 'BOAT HARPOONER', hp: 50, speed: [0, 0], dmg: 22, windup: 1.0, range: 22, ranged: 'harpoon', model: 'harpooner', money: [60, 90] },
  ansgar: { id: 'ansgar', name: 'MATE ANSGAR', hp: 400, speed: [1.5, 1.5], dmg: 30, windup: 1.0, range: 2.2, model: 'ansgar', money: [0, 0], boss: true, scale: 1.15 },
};
export const BARKS = ['HAAL AN!', 'SKARR!', 'VOR THOLE!', 'BRINNA!', 'OV THE TIDE!', 'VEN ULDA!'];
