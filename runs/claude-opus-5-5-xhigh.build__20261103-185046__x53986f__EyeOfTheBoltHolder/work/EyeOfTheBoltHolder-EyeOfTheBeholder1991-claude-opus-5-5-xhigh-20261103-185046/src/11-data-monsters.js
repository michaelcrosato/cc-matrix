/* =====================================================================================
 * 11-data-monsters: the bestiary. size S (1 of a cell's 4 units), M (2), L (4); def is what the party rolls against;
 * atk is added to the monster's d20; int the seconds between attacks, move the seconds a cell; sight in cells.
 * mind: how it hunts (melee, keepAway, ranged); kinds: living, undead, construct, humanoid (spells care).
 * ===================================================================================== */
B.MONSTERS = {
  rat: { name: 'Drain Rat', size: 'S', hp: 4, def: 11, atk: 1, dmg: [1, 3, 0], int: 1.4, move: .6, sight: 4, xp: 20, living: true, voice: 'squeak', hit: 'flesh',
    drops: [[.1, 'ration']] },
  leech: { name: 'Bloat Leech', size: 'M', hp: 14, def: 10, atk: 2, dmg: [1, 4, 0], int: 2.4, move: 1.4, sight: 3, xp: 60, living: true, drain: true, voice: 'slurp', hit: 'ooze' },
  latchkin: { name: 'Latchkin', size: 'S', hp: 7, def: 12, atk: 2, dmg: [1, 4, 0], int: 1.8, move: .7, sight: 5, xp: 40, living: true, humanoid: true, steal: .15, coward: true, voice: 'chitter', hit: 'flesh',
    drops: [[.3, 'darts', 3], [.1, 'spear'], [.05, 'paddedJerkin']] },
  ooze: { name: 'Drain Ooze', size: 'M', hp: 18, def: 8, atk: 2, dmg: [1, 6, 0], int: 2.6, move: 1.6, sight: 3, xp: 70, living: true, bluntHalf: true, corrode: true, voice: 'slurp', hit: 'ooze' },
  ratknot: { name: 'Rat Knot', size: 'M', hp: 22, def: 11, atk: 3, dmg: [1, 6, 0], int: 1.8, move: 1.0, sight: 4, xp: 120, living: true, bites: 2, voice: 'squeak', hit: 'flesh' },
  snick: { name: 'Snick, the Latch-Boss', short: 'Snick', size: 'M', hp: 40, def: 13, atk: 4, dmg: [1, 8, 1], int: 2.0, move: .8, sight: 6, xp: 400, living: true, humanoid: true, named: true, voice: 'chitter', hit: 'flesh',
    fixed: ['copperWard', 'drainwardensKey', 'amuletOfVigor'] },
  skeleton: { name: 'Tinker Skeleton', size: 'M', hp: 16, def: 12, atk: 3, dmg: [1, 6, 0], int: 2.0, move: 1.0, sight: 5, xp: 60, undead: true, blunt: 1.5, voice: 'rattle', hit: 'bone',
    drops: [[.2, 'handAxe']] },
  rustling: { name: 'Rustling', size: 'S', hp: 6, def: 14, atk: 2, dmg: [1, 2, 0], int: 1.6, move: .7, sight: 4, xp: 45, living: true, rust: .25, voice: 'chitter', hit: 'flesh' },
  spider: { name: 'Brass Spider', size: 'M', hp: 22, def: 13, atk: 4, dmg: [1, 6, 0], int: 1.5, move: .6, sight: 5, xp: 110, construct: true, poison: .3, voice: 'clank', hit: 'metal',
    drops: [[.25, 'potionAntidote']] },
  sentinel: { name: 'Clockwork Sentinel', size: 'L', hp: 50, def: 16, atk: 5, dmg: [2, 6, 0], int: 2.8, move: 1.6, sight: 5, xp: 350, construct: true, heavy: true, shock: 1.5, named: true, voice: 'clank', hit: 'metal',
    fixed: ['ringOfWarding', 'potionGreaterHealing'] },
  hound: { name: 'Lidless Hound', size: 'M', hp: 20, def: 13, atk: 5, dmg: [1, 8, 0], int: 1.3, move: .5, sight: 6, hear: 6, xp: 120, living: true, keen: true, voice: 'growl', hit: 'flesh' },
  seer: { name: 'Gloam Seer', size: 'M', hp: 18, def: 12, atk: 3, dmg: [1, 4, 0], int: 2.2, move: 1.0, sight: 6, xp: 180, living: true, humanoid: true, mind: 'keepAway', keep: 3,
    bolt: { every: 6, dmg: [2, 6, 0], range: 6 }, hold: { every: 12, secs: 6 }, voice: 'chant', hit: 'flesh',
    drops: [[.3, 'staff'], [.2, 'potionHealing'], [.15, 'elixirClarity']] },
  warden: { name: 'Gloam Warden', size: 'M', hp: 26, def: 15, atk: 6, dmg: [1, 10, 0], int: 2.2, move: .9, sight: 5, xp: 150, living: true, humanoid: true, reach: 2, voice: 'chant', hit: 'metal',
    drops: [[.25, 'glaive'], [.15, 'studdedLeather']] },
  gazer: { name: 'Gazer', size: 'S', hp: 10, def: 14, atk: 4, dmg: [1, 3, 0], int: 2.0, move: .8, sight: 5, xp: 90, living: true, fly: true, gaze: { every: 3, dmg: [1, 6, 0], range: 3 }, voice: 'hum', hit: 'flesh' },
  golem: { name: 'Lockjaw Golem', size: 'L', hp: 60, def: 17, atk: 7, dmg: [2, 8, 0], int: 3.0, move: 1.8, sight: 5, xp: 400, construct: true, heavy: true, shock: 1.5, blunt: 1.25, voice: 'clank', hit: 'metal' },
  boltholder: { name: 'The Bolt-Holder', short: 'Bolt-Holder', size: 'L', hp: 320, def: 15, atk: 8, dmg: [3, 6, 0], int: 3.5, move: 4, sight: 99, xp: 3000, boss: true, fly: true, voice: 'hum', hit: 'metal' }
};
B.MON = id => B.MONSTERS[id];
B.UNITS = { S: 1, M: 2, L: 4 };
