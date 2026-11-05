/* MONSTERS, SPELLS, RACES AND CLASSES: the rules as data. */
// size: units of a cell's 4 (S 1, M 2, L 4); int: seconds between attacks; move: seconds a cell; sight: cells
B.MONSTERS = {
  rat: { name: 'Drain Rat', size: 1, hp: 4, def: 11, atk: 1, dmg: '1d3', int: 1.4, move: .6, sight: 4, xp: 20, voice: 'squeak', drops: [[.1, 'ration']], hit: 'flesh' },
  leech: { name: 'Bloat Leech', size: 2, hp: 14, def: 10, atk: 2, dmg: '1d4', int: 2.4, move: 1.4, sight: 3, xp: 60, drain: true, voice: 'slurp', hit: 'ooze' },
  latchkin: { name: 'Latchkin', size: 1, hp: 7, def: 12, atk: 2, dmg: '1d4', int: 1.8, move: .7, sight: 5, xp: 40, steal: .15, coward: true, humanoid: true, voice: 'chitter', drops: [[.3, 'darts', 3], [.1, 'spear'], [.05, 'paddedJerkin']], hit: 'flesh' },
  ooze: { name: 'Drain Ooze', size: 2, hp: 18, def: 8, atk: 2, dmg: '1d6', int: 2.6, move: 1.6, sight: 3, xp: 70, bluntHalf: true, corrode: true, voice: 'slurp', hit: 'ooze' },
  ratknot: { name: 'Rat Knot', size: 2, hp: 22, def: 11, atk: 3, dmg: '1d6', int: 1.8, move: 1.0, sight: 4, xp: 120, bites: 2, voice: 'squeak', hit: 'flesh' },
  snick: { name: 'Snick, the Latch-Boss', size: 2, hp: 34, def: 13, atk: 4, dmg: '1d6+1', int: 2.2, move: .8, sight: 6, xp: 400, humanoid: true, named: true, voice: 'chitter', drops: [[1, 'copperWard'], [1, 'drainwardensKey'], [1, 'amuletOfVigor']], hit: 'flesh' },
  skeleton: { name: 'Tinker Skeleton', size: 2, hp: 16, def: 12, atk: 3, dmg: '1d6', int: 2.0, move: 1.0, sight: 5, xp: 60, undead: true, immune: 'sleep hold poison', bluntX: 1.5, voice: 'rattle', drops: [[.2, 'handAxe']], hit: 'bone' },
  rustling: { name: 'Rustling', size: 1, hp: 6, def: 13, atk: 2, dmg: '1d2', int: 1.6, move: .7, sight: 4, xp: 45, rust: .15, voice: 'chitter', hit: 'flesh' },
  spider: { name: 'Brass Spider', size: 2, hp: 22, def: 13, atk: 4, dmg: '1d6', int: 1.5, move: .6, sight: 5, xp: 110, poison: .3, construct: true, voice: 'clank', drops: [[.25, 'potionAntidote']], hit: 'metal' },
  sentinel: { name: 'Clockwork Sentinel', size: 4, hp: 50, def: 16, atk: 5, dmg: '2d6', int: 2.8, move: 1.6, sight: 5, xp: 350, construct: true, immune: 'sleep hold poison turn', lightningX: 1.5, heavy: true, named: true, voice: 'clank', drops: [[1, 'ringOfWarding'], [1, 'potionGreaterHealing']], hit: 'metal' },
  hound: { name: 'Lidless Hound', size: 2, hp: 20, def: 13, atk: 5, dmg: '1d8', int: 1.3, move: .5, sight: 6, xp: 120, hears: 6, voice: 'growl', hit: 'flesh' },
  seer: { name: 'Gloam Seer', size: 2, hp: 15, def: 12, atk: 3, dmg: '1d4', int: 2.2, move: 1.0, sight: 6, xp: 180, humanoid: true, caster: true, keepAway: 3, voice: 'chant', drops: [[.3, 'staff'], [.2, 'potionHealing'], [.15, 'elixirClarity']], hit: 'flesh' },
  warden: { name: 'Gloam Warden', size: 2, hp: 22, def: 14, atk: 5, dmg: '1d8', int: 2.6, move: .9, sight: 5, xp: 150, humanoid: true, reach2: true, voice: 'growl', drops: [[.25, 'glaive'], [.15, 'studdedLeather']], hit: 'metal' },
  gazer: { name: 'Gazer', size: 1, hp: 10, def: 14, atk: 4, dmg: '1d3', int: 2.0, move: .8, sight: 5, xp: 90, fly: true, gaze: true, voice: 'hum', hit: 'flesh' },
  golem: { name: 'Lockjaw Golem', size: 4, hp: 60, def: 17, atk: 7, dmg: '2d8', int: 3.0, move: 1.8, sight: 5, xp: 400, construct: true, immune: 'sleep hold poison turn', lightningX: 1.5, bluntX: 1.25, heavy: true, voice: 'clank', hit: 'metal' },
  boltholder: { name: 'The Bolt-Holder', size: 4, hp: 280, def: 15, atk: 8, dmg: '3d6', int: 3.5, move: 4, sight: 99, xp: 3000, boss: true, fly: true, immune: 'sleep hold poison turn', voice: 'hum', hit: 'metal' }
};
B.SPELLS = {
  sparkDart: { name: 'Spark Dart', arcane: true, lvl: 1, target: 'line', desc: 'Darts of violet light that never miss the first foe within 6 cells.', color: '#d8b0ff' },
  wardOfBrass: { name: 'Ward of Brass', arcane: true, lvl: 1, target: 'member', desc: '+3 Defense until it soaks up 8 + level damage.', color: '#e8c050' },
  findSeams: { name: 'Find Seams', arcane: true, lvl: 1, target: 'party', desc: 'For 90 seconds hidden catches, seams and traps glint.', color: '#ffd36a' },
  slumber: { name: 'Slumber', arcane: true, lvl: 1, target: 'front', desc: 'Small and middling living foes in front fall asleep.', color: '#8a8aff' },
  unlatch: { name: 'Unlatch', arcane: true, lvl: 2, target: 'door', desc: 'Opens a magic seal or a simple lock in front.', color: '#8ae0ff' },
  frostbite: { name: 'Frostbite', arcane: true, lvl: 2, target: 'front', desc: '2d6 cold to all in front, and slows them.', color: '#a0e8ff' },
  featherStep: { name: 'Feather Step', arcane: true, lvl: 2, target: 'party', desc: 'For 120 seconds the party floats over pits.', color: '#e8f0ff' },
  forkedLightning: { name: 'Forked Lightning', arcane: true, lvl: 3, target: 'line', desc: '3d6 to every foe along 5 cells.', color: '#6ae8ff' },
  blazingOrb: { name: 'Blazing Orb', arcane: true, lvl: 3, target: 'line', desc: 'Bursts at the first foe: 3d6 + level fire there, half beside it.', color: '#ff8a3a' },
  mend: { name: 'Mend', lvl: 1, target: 'member', desc: 'Heals 1d8 + 1 + half level; wakes the fallen.', color: '#4ae070' },
  steadyHand: { name: 'Steady Hand', lvl: 1, target: 'party', desc: '+1 to hit and to saves for 60 seconds.', color: '#ffd36a' },
  turnDead: { name: 'Turn the Dead', lvl: 1, target: 'front', desc: 'The dead in front flee; the weakest crumble.', color: '#ffffff' },
  purge: { name: 'Purge Venom', lvl: 2, target: 'member', desc: 'Cures poison and heals 1d4.', color: '#4ae070' },
  holdFast: { name: 'Hold Fast', lvl: 2, target: 'front', desc: 'Folk in front are held fast for 10 seconds.', color: '#ffd36a' },
  loaves: { name: 'Loaves of the Hearth', lvl: 2, target: 'party', desc: 'Everyone is fed in full.', color: '#e8a040' },
  greaterMend: { name: 'Greater Mend', lvl: 3, target: 'member', desc: 'Heals 3d8 + level; wakes the fallen.', color: '#4ae070' },
  raise: { name: 'Raise from Rest', lvl: 3, target: 'dead', desc: 'A dead companion breathes again, at 1 HP.', color: '#fff6d8' },
  freeHinge: { name: 'Free Hinge', lvl: 3, target: 'party', desc: 'Frees the held; no hold or gaze for 120 seconds.', color: '#ffd36a' }
};
B.SLOTTAB = {
  M: [[1, 2, 2, 3, 3, 4, 4, 4], [0, 0, 1, 2, 2, 2, 3, 3], [0, 0, 0, 0, 1, 2, 2, 3]],
  C: [[1, 2, 2, 3, 3, 3, 4, 4], [0, 0, 1, 2, 2, 3, 3, 3], [0, 0, 0, 0, 1, 1, 2, 2]]
};
B.RACES = {
  human: { name: 'Human', mods: {}, cls: 'FPRCMT', trait: 'Gains 5% more experience.' },
  dwarf: { name: 'Dwarf', mods: { con: 1, dex: -1 }, cls: 'FCT', trait: 'Shrugs off half of all poison. Bearded.' },
  elf: { name: 'Elf', mods: { dex: 1, con: -1 }, cls: 'FRMT', trait: 'Resists half of all holds.' },
  halfling: { name: 'Halfling', mods: { dex: 1, str: -1 }, cls: 'FCT', trait: '+1 to hit with slings, darts and thrown things.' }
};
B.CLASSES = {
  F: { id: 'F', name: 'Fighter', die: 10, hitPer: 1, xpX: 1, min: { str: 9 }, desc: 'All arms and armour. Strikes truer at every level.' },
  P: { id: 'P', name: 'Paladin', die: 10, hitPer: 1, xpX: 1.2, min: { str: 12, wis: 13 }, desc: 'A knight of the Warder: Lay on Hands once a rest.' },
  R: { id: 'R', name: 'Ranger', die: 8, hitPer: 1, xpX: 1.15, min: { str: 13, dex: 13 }, desc: 'Two blades without fault, a sure bow, and Tracking on the map.' },
  C: { id: 'C', name: 'Cleric', die: 8, hitPer: .75, xpX: .95, min: { wis: 9 }, desc: 'Prays for mending and miracles. Blunt weapons only.' },
  M: { id: 'M', name: 'Mage', die: 4, hitPer: .5, xpX: 1.1, min: { int: 9 }, desc: 'Learns spells from scrolls into a spellbook. Frail.' },
  T: { id: 'T', name: 'Thief', die: 6, hitPer: .75, xpX: .9, min: { dex: 9 }, desc: 'Picks locks, finds and disarms traps, strikes the unaware twice as hard.' }
};
B.XP_LEVELS = [0, 100, 250, 500, 900, 1500, 2400, 3600];
B.ARMOR_OK = { F: 9, P: 9, R: 4, C: 5, M: 0, T: 3 };   // the heaviest body armour (def) each may wear
B.LOOKS = {
  human: [{ hair: 'short', colors: { hair: '#4a2e1e', skin: '#e0b090' } }, { hair: 'long', colors: { hair: '#c8a050', skin: '#f0c8a8' } }, { hair: 'ponytail', colors: { hair: '#2a1a12', skin: '#c89070' } }, { hair: 'spiky', colors: { hair: '#8a3a1a', skin: '#e8c0a0' } }, { hair: 'bald', colors: { skin: '#a87050' } }, { hair: 'long', colors: { hair: '#e0e0e8', skin: '#e0b8a0' } }],
  dwarf: [{ hair: 'short', beard: 'full', colors: { hair: '#8a4a2a', skin: '#e0a888' } }, { hair: 'bald', beard: 'braided', colors: { hair: '#c8c8c0', skin: '#d8a080' } }, { hair: 'long', beard: 'braided', colors: { hair: '#3a2418', skin: '#c08868' } }, { hair: 'spiky', beard: 'full', colors: { hair: '#c86a2a', skin: '#e8b090' } }, { hair: 'ponytail', beard: 'full', colors: { hair: '#5a5a5a', skin: '#b88060' } }, { hair: 'short', beard: 'braided', colors: { hair: '#e8d8a0', skin: '#e0a888' } }],
  elf: [{ hair: 'long', colors: { hair: '#e8e0b0', skin: '#f0d8c0' } }, { hair: 'ponytail', colors: { hair: '#3a5a2a', skin: '#e8c8b0' } }, { hair: 'long', colors: { hair: '#1a1a2a', skin: '#d8b8a0' } }, { hair: 'short', colors: { hair: '#c8c8d8', skin: '#f0e0d0' } }, { hair: 'spiky', colors: { hair: '#8a5a3a', skin: '#e0c0a0' } }, { hair: 'long', colors: { hair: '#a03a2a', skin: '#f0d0b8' } }],
  halfling: [{ hair: 'spiky', colors: { hair: '#6a3a1a', skin: '#e8b898' } }, { hair: 'ponytail', colors: { hair: '#c8803a', skin: '#f0c8a8' } }, { hair: 'short', colors: { hair: '#2a1a12', skin: '#d0a080' } }, { hair: 'long', colors: { hair: '#e8c870', skin: '#f0d0b0' } }, { hair: 'short', colors: { hair: '#8a8a8a', skin: '#c89878' } }, { hair: 'ponytail', colors: { hair: '#4a2a1a', skin: '#e0b090' } }]
};
B.CLASS_DRESS = {
  F: { outfit: 'tunic', armor: true, colors: { cloth: '#7a3a2e', pants: '#3a3440', plate: '#a8acb8' } },
  P: { outfit: 'tunic', armor: true, hat: { style: 'band', color: '#c8a040' }, colors: { cloth: '#d8d0c0', pants: '#4a4a6a', plate: '#d8d8e0', trim: '#c8a040' } },
  R: { outfit: 'tunic', hood: true, colors: { cloth: '#3a5a3e', pants: '#2e2a26' } },
  C: { outfit: 'robe', weapon: 'staff', colors: { cloth: '#d8c8a0', trim: '#c8a040', pants: '#6a5a40' } },
  M: { outfit: 'robe', hat: 'pointed', weapon: 'staff', colors: { cloth: '#4a3a8a', hat: '#4a3a8a', pants: '#2a2a4a', trim: '#c8a050' } },
  T: { outfit: 'coat', hood: true, colors: { cloth: '#3a3a42', coat: '#4a3a2a', pants: '#2a2a2a' } }
};
B.NAMES = {
  human: ['Brannoc', 'Odelia', 'Corvin', 'Maud', 'Aldric', 'Isolde', 'Piers', 'Wenna', 'Garret', 'Tilde', 'Osric', 'Hester'],
  dwarf: ['Cobb', 'Brunna', 'Thrain', 'Hilde', 'Durik', 'Grista', 'Borin', 'Ketta', 'Galdur', 'Runa', 'Orm', 'Sigga'],
  elf: ['Ysa', 'Faelan', 'Ithil', 'Seren', 'Aerin', 'Lirael', 'Thalor', 'Nimue', 'Caelin', 'Elowen', 'Rhovan', 'Sylra'],
  halfling: ['Pip', 'Merry', 'Tansy', 'Bodo', 'Clover', 'Wilco', 'Posy', 'Fennick', 'Daisy', 'Hobb', 'Marigold', 'Tad']
};
