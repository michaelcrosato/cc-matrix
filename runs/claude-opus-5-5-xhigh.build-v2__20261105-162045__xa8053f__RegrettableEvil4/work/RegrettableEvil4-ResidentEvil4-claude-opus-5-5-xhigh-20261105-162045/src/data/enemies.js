// Enemy data. `speed` may be [min, max]. All humans run on the same state machine (src/game/enemy.js).
export const ENEMIES = {
  gaffer: { name: 'ISLANDER', hp: 34, speed: [1.1, 1.5], damage: 14, reach: 1.5, windup: 0.7, grabChance: 0.2, grabDps: 6, loco: 'Shamble', windupClip: 'RaiseTool', attackClip: 'Swing',
    models: [['islander'], ['islander2'], ['islander3']], prop: ['w-gaff', 'w-chopper', 'w-boathook'], barks: 'isle', money: 1 },
  netwife: { name: 'NET-WIFE', hp: 28, speed: [1.2, 1.2], damage: 0, reach: 1.4, windup: 0.8, thrown: 'net', throwRange: 8, loco: 'Shamble', models: [['netwife']], prop: [], barks: 'isle', money: 1 },
  bottler: { name: 'BOTTLER', hp: 30, speed: [1.0, 1.0], damage: 6, reach: 1.4, windup: 0.9, thrown: 'bottle', throwRange: 12, thrownDamage: 18, loco: 'Shamble', models: [['bottler']], prop: ['w-heldbottle'], barks: 'isle', money: 1 },
  runner: { name: 'DECKHAND', hp: 36, speed: [2.8, 2.8], damage: 16, reach: 2.0, windup: 0.45, loco: 'Lurch', models: [['deckhand']], prop: ['w-boathook'], barks: 'isle', money: 1 },
  carrier: { name: 'CARRIER', hp: 60, speed: [1.6, 1.6], damage: 8, reach: 1.4, windup: 0.8, loco: 'Shamble', carryLoco: 'CarrierWalk', models: [['carrier']], prop: [], barks: 'isle', money: 2, wantsDame: true },
  flenser: { name: 'THE FLENSER', hp: 220, speed: [2.2, 2.2], damage: 200, assistedDamage: 80, reach: 2.2, windup: 0.75, lungeSpeed: 5, loco: 'SawWalk', windupClip: 'SawRev', attackClip: 'SawSwing', models: [['flenser']], prop: ['w-saw'], mute: true, headOnlyStagger: true, money: 6, big: 1.12, saw: true, ragdoll: false },
  limpet: { name: 'LIMPET', hp: 15, speed: [3.0, 3.0], damage: 4, reach: 0.7, crawler: true, models: [['limpet']], prop: [], mute: true, money: 0 },
  resalted: { name: 'RE-SALTED', hp: 40, speed: [2.6, 2.6], damage: 14, reach: 1.4, windup: 0.45, loco: 'Lurch', models: [['resalted']], prop: [], barks: 'isle', money: 0 },
  monk: { name: 'COWLED MONK', hp: 70, speed: [1.3, 1.3], damage: 18, reach: 1.8, windup: 0.9, loco: 'ShieldWalk', models: [['monk']], prop: ['w-flail'], shield: true, windupClip: 'FlailSpin', barks: 'monk', money: 2 },
  knight: { name: 'RELIQUARY KNIGHT', hp: 300, helmet: 40, speed: [0.9, 0.9], damage: 35, reach: 2.6, windup: 1.0, loco: 'KnightWalk', windupClip: 'HalberdSweep', attackClip: 'HalberdSweep', models: [['knight']], prop: ['w-halberd'], armored: true, mute: true, money: 5, big: 1.15, ragdoll: false },
  drowned: { name: 'DROWNED', hp: 35, speed: [1.2, 1.2], damage: 10, reach: 1.2, windup: 0.8, grabChance: 0.6, grabDps: 5, grabSlow: true, loco: 'Shamble', models: [['drowned']], prop: [], barks: 'drowned', money: 1 },
  harpooner: { name: 'BOAT HARPOONER', hp: 50, speed: [0, 0], damage: 22, reach: 30, windup: 1.3, thrown: 'harpoon', throwRange: 30, thrownDamage: 22, fixed: true, glint: true, loco: 'Idle', models: [['harpooner']], prop: ['w-boathook'], barks: 'isle', money: 2 },
};
// Bosses and their kin use the same hit interface; they are not in the SPAWN list's plain table.
export const ENEMY_IDS = Object.keys(ENEMIES);

export const ISLE_BARKS = ['HAAL AN!', 'SKARR!', 'VOR THOLE!', 'BRINNA!', 'OV THE TIDE!', 'VEN ULDA!'];
export const MONK_BARKS = ['OV ORRIN...', 'VEN THE TITHE...', 'HAAL ULDA...'];
export const DROWNED_BARKS = ['BLUGH...', 'OV...', 'ULDA...'];
