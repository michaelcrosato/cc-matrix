export const DEFAULT_TUNING = Object.freeze({ playerDamage: 1, enemyDamage: 1, maxWar: 36, maxSpirit: 24, rationWar: 8, rationSpirit: 5, planningSeconds: 8, tempo: 1 });

const item = (name, family, description, extra = {}) => ({ name, family, description, reusable: false, use: null, ...extra });
export const ITEMS = {
  blade: item('Notched falchion', 'weapon', 'A patient edge. Five War damage; never breaks.', { channel: 'war', power: 5, range: 1, reusable: true }),
  bow: item('Ash bow', 'weapon', 'Eight War damage along a clear corridor. Costs one arrow.', { channel: 'war', power: 8, range: 4, ammo: true, reusable: true }),
  rune: item('Tideglass rune', 'weapon', 'Six Spirit damage. The blue fire costs no strength.', { channel: 'spirit', power: 6, range: 3, reusable: true }),
  throwing: item('Iron sun javelin', 'weapon', 'Fourteen War damage. One throw, one chance.', { channel: 'war', power: 14, range: 4 }),
  scroll: item('Unbinding scroll', 'weapon', 'Fifteen Spirit damage. The script burns on use.', { channel: 'spirit', power: 15, range: 4 }),
  shield: item('Battered kite shield', 'shield', 'Hold in the left hand: reduce War hits by two.', { channel: 'war', defense: 2, reusable: true }),
  armor: item('Riveted hauberk', 'armor', 'Wear it: reduce War hits by two. No pack slot while worn.', { defense: 2, use: 'armor' }),
  ring: item('Circle of still water', 'ring', 'Wear it: reduce Spirit hits by two. No pack slot while worn.', { defense: 2, use: 'ring' }),
  potion: item('Twin-strength draught', 'potion', 'Restore up to 14 War and 10 Spirit. One use.', { use: 'restore', war: 14, spirit: 10 }),
  warBook: item('The measured blow', 'book', 'Permanently add 8 maximum War and restore eight War.', { use: 'training', channel: 'war', power: 8 }),
  spiritBook: item('A mind without cracks', 'book', 'Permanently add 8 maximum Spirit and restore eight Spirit.', { use: 'training', channel: 'spirit', power: 8 }),
  sightBook: item('The masonry remembers', 'book', 'Reveal nearby secret walls for 12 movement steps. Reusable.', { use: 'sight', moves: 12, reusable: true }),
  steelBlade: item('Vaultbreaker', 'weapon', 'Nine War damage; a lasting edge for the lowest vault.', { channel: 'war', power: 9, range: 1, reusable: true }),
  brightRune: item('Heart of the deep tide', 'weapon', 'Nine Spirit damage; reusable and free of strength cost.', { channel: 'spirit', power: 9, range: 3, reusable: true }),
  greatShield: item('Warden’s mirror', 'shield', 'Hold in the left hand: reduce War hits by three.', { channel: 'war', defense: 3, reusable: true }),
};

export const ENEMIES = {
  skeleton: { name: 'Ossuary watchman', role: 'skeletal guard', war: 15, spirit: 22, armor: 0, ring: 1, power: 4, channel: 'war', range: 1, hint: 'Bone yields to War. Guard softens the answering blow.' },
  scorpion: { name: 'Script-tail scorpion', role: 'rune-marked scorpion', war: 25, spirit: 12, armor: 2, ring: 0, power: 4, channel: 'spirit', range: 2, hint: 'Its tail burns blue. Spirit is both its weapon and its weakness.' },
  sentinel: { name: 'Shutter knight', role: 'shield sentinel', war: 26, spirit: 18, armor: 5, ring: 0, power: 5, channel: 'war', range: 1, hint: 'Steel seals its body. The seams of its soul lie open.' },
  brute: { name: 'Bellows ogre', role: 'heavy brute', war: 27, spirit: 23, armor: 1, ring: 1, power: 9, channel: 'war', range: 1, hint: 'It draws back for a full round. Guard or step aside before the hammer falls.' },
  wraith: { name: 'Veil of the drowned', role: 'alternating wraith', war: 27, spirit: 24, armor: 2, ring: 1, power: 5, channel: 'mixed', range: 3, hint: 'A green grasp, then a blue lament. Read the next intention.' },
  minotaur: { name: 'Asterion, the Debt Warden', role: 'Minotaur guardian', war: 90, spirit: 90, armor: 2, ring: 2, power: 7, channel: 'mixed', range: 2, boss: true, hint: 'Three seals bind it: iron, tide, and the final oath. Each broken seal stays broken.' },
};

const loot = (id, x, y, kind) => ({ id, type: 'loot', x, y, kind });
const supply = (id, x, y, food, arrows = 0) => ({ id, type: 'loot', x, y, food, arrows, name: arrows ? 'Rations and a quiver' : 'Sealed rations' });
const foe = (id, x, y, kind, extra = {}) => ({ id, type: 'enemy', x, y, kind, ...extra });

export const FLOORS = [
  { id: 'upper', name: 'The Lantern Vault', subtitle: 'I · An eye above the crossroads', start: { x: 1, y: 9, dir: 0 },
    rows: [ '###########', '#.....#...#', '#.###.#.#.#', '#...#...#.#', '###.#####.#', '#...#.....#', '#.#.#.###.#', '#...#.....#', '#.###.#####', '#.....#####', '###########' ],
    entities: [
      { id: 'upper.eye', type: 'mural', x: 1, y: 7, name: 'The watching eye', text: 'Two strengths keep you standing. Bone fears steel; the marked tail fears blue fire. Take the rune beyond the watchman.' },
      foe('upper.watchman', 3, 5, 'skeleton'),
      loot('upper.rune', 3, 3, 'rune'),
      supply('upper.provisions', 2, 3, 4, 6),
      loot('upper.hauberk', 1, 3, 'armor'),
      loot('upper.shield', 1, 1, 'shield'),
      loot('upper.javelin', 3, 1, 'throwing'),
      loot('upper.scroll', 4, 1, 'scroll'),
      loot('upper.draught', 5, 1, 'potion'),
      foe('upper.scorpion', 5, 3, 'scorpion'),
      { id: 'upper.key', type: 'loot', x: 7, y: 3, key: 'vault', name: 'Sun-cut key' },
      { id: 'upper.lock', type: 'door', x: 5, y: 8, key: 'vault', name: 'Sun-cut shortcut', open: false },
      { id: 'upper.vaultDoor', type: 'door', x: 9, y: 6, key: 'vault', name: 'Sun-cut descent door', open: false },
      { id: 'upper.camp', type: 'camp', x: 7, y: 7, name: 'Lantern shelter', text: 'Spend one ration to mend both strengths. Prepare before you descend.' },
      supply('upper.ladderSupplies', 8, 7, 3, 3),
      { id: 'upper.ladder', type: 'ladder', x: 9, y: 7, name: 'The drowned stair', toFloor: 1 },
    ],
  },
  { id: 'spirit', name: 'The Drowned Script', subtitle: 'II · The masonry remembers', start: { x: 1, y: 9, dir: 0 },
    rows: [ '###########', '#.......#.#', '#.#####.#.#', '#...#...#.#', '#.#.#.###.#', '#.#...#...#', '#.#####.#.#', '#...#...#.#', '###.#.###.#', '#.........#', '###########' ],
    entities: [
      loot('spirit.ring', 2, 9, 'ring'),
      loot('spirit.sight', 3, 7, 'sightBook'),
      { id: 'spirit.eye', type: 'mural', x: 1, y: 7, name: 'The closed eye', text: 'Water guards the mind. Put on the ring. A hollow seam beside the book hides a forgotten way.' },
      foe('spirit.sentinel', 1, 5, 'sentinel'),
      loot('spirit.training', 1, 3, 'warBook'),
      { id: 'spirit.chest', type: 'chest', x: 3, y: 3, name: 'The ticking coffer', trapped: true, disarmed: false, open: false, hint: 'A taut silver wire crosses the latch. DISARM is safe; forcing it deals 6 War before defense.', contains: ['potion', 'scroll'], food: 2 },
      supply('spirit.westSupply', 4, 1, 3, 3),
      { id: 'spirit.secret', type: 'secret', x: 4, y: 7, name: 'The hollow seam', open: false, clue: 'A thin blue crack. The stone sounds hollow.' },
      loot('spirit.secretBook', 5, 7, 'spiritBook'),
      { id: 'spirit.gate', type: 'gate', x: 5, y: 9, name: 'The threefold gate', destination: { x: 7, y: 5 }, used: false, options: { war: { war: 6, spirit: -4 }, spirit: { war: -4, spirit: 6 }, balanced: { war: 0, spirit: 0 } } },
      foe('spirit.brute', 7, 7, 'brute'),
      supply('spirit.eastSupply', 9, 7, 4, 4),
      foe('spirit.wraith', 9, 3, 'wraith'),
      loot('spirit.brightRune', 9, 2, 'brightRune'),
      { id: 'spirit.ladder', type: 'ladder', x: 9, y: 1, name: 'The horned stair', toFloor: 2 },
    ],
  },
  { id: 'guardian', name: 'The Horned Engine', subtitle: 'III · The final oath', start: { x: 1, y: 9, dir: 1 },
    rows: [ '###########', '#.........#', '#.#.....#.#', '#.#.....#.#', '#.###.###.#', '#...#.#...#', '###.#.#.###', '#...#.....#', '#.#####.#.#', '#.........#', '###########' ],
    entities: [
      supply('guardian.provisions', 3, 9, 7, 8),
      loot('guardian.blade', 5, 9, 'steelBlade'),
      loot('guardian.shield', 6, 9, 'greatShield'),
      loot('guardian.rune', 7, 9, 'brightRune'),
      loot('guardian.draught', 9, 9, 'potion'),
      foe('guardian.wraith', 9, 5, 'wraith', { encounter: 'guardian.duet' }),
      foe('guardian.scorpion', 7, 5, 'scorpion', { encounter: 'guardian.duet' }),
      { id: 'guardian.camp', type: 'camp', x: 5, y: 7, name: 'The last warm lantern', text: 'Share a ration with a fallen companion. The warden waits beyond the throat of the engine.' },
      loot('guardian.scroll', 6, 7, 'scroll'),
      { id: 'guardian.eye', type: 'mural', x: 5, y: 5, name: 'The iron eye', text: 'Iron first. Tide second. Both at the last. A broken seal never mends. Defeat the warden, then take what it guards.' },
      foe('guardian.warden', 5, 3, 'minotaur'),
      { id: 'guardian.treasure', type: 'treasure', x: 5, y: 1, name: 'The Emberheart', claimed: false },
      { id: 'guardian.cache', type: 'chest', x: 1, y: 1, name: 'The forgotten tithe', trapped: false, open: false, contains: ['spiritBook', 'throwing'], food: 3 },
    ],
  },
];

export const CONTENT = { version: 1, title: 'Advanced Dungeons and Danger', items: ITEMS, enemies: ENEMIES, floors: FLOORS, tuning: DEFAULT_TUNING };
