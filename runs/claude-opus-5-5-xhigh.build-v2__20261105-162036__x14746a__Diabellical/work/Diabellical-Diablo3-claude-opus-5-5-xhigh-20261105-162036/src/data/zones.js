// Zones as data: what a place is, what lives there, how it is stitched together.
import { CAUSEWAY } from './rooms/causeway.js';
import { LEVER_ROOM, RELIC_ROOM, SHARED, SHRINE_ROOM, STAIR_ROOM, START_ROOM } from './rooms/shared.js';
import { BELFRY_ARENA, CHAPTER_HOUSE, COUNTING_HOUSE, NOVICE_ROOM, PANTRY_BOSS, TOWN, YARD } from './rooms/special.js';

export const PROP_HP = { urn: 1, barrel: 1, crate: 1, clay: 1, keg: 1, coffin: 2, tombstone: 2, basket: 1, bones: 1, amphora: 1 };

export const ZONES = {
  yard: {
    id: 'yard', name: "ST. CLEMENT'S YARD", kind: 'authored', tpl: YARD, biome: 'yard', levelFloor: 1, song: 'weeping_road', floors: 1, bellOk: false,
    monsters: [['peatwalker', 1]], breakables: ['urn', 'tombstone', 'barrel'], gate: false,
  },
  town: {
    id: 'town', name: 'TOLLHAVEN', kind: 'authored', tpl: TOWN, biome: 'town', levelFloor: 1, song: 'last_lamps', floors: 1, safe: true, bellOk: false,
    monsters: [], breakables: ['barrel', 'crate', 'urn'], gate: true,
  },
  causeway: {
    id: 'causeway', name: 'THE WEEPING CAUSEWAY', kind: 'gen', biome: 'causeway', levelFloor: 1, song: 'weeping_road', floors: 1,
    monsters: [['peatwalker', 5], ['gibbet_drop', 2], ['bloat_deacon', 1]], breakables: ['barrel', 'crate', 'tombstone'],
    gen: { axis: 'x', rooms: 9, start: 'road_start', end: 'camp', fill: ['road_a', 'road_b', 'road_c', 'road_d', 'road_e'], required: ['road_lych', 'road_gibbets'], side: ['side_pantry', 'side_ruin'] },
    templates: CAUSEWAY,
  },
  ossuary: {
    id: 'ossuary', name: 'THE OSSUARY OF SAINT GLOAM', kind: 'gen', biome: 'ossuary', levelFloor: 6, song: 'under_gloam', floors: 3,
    monsters: [['peatwalker', 2], ['rattlebones', 5], ['choir_skull', 2], ['pallid_bearer', 1], ['tomb_crawler', 2], ['bloat_deacon', 1], ['crawler_nest', 0.6]], breakables: ['urn', 'coffin', 'clay', 'bones'],
    gen: { rooms: [9, 11, 12], start: 'start_room', end: 'stair_room', fill: ['nave', 'crossing', 'gallery', 'cells', 'rotunda', 'long_hall', 'pit_room', 'vault', 'dead_end'], required: ['relic_room', 'shrine_room', 'lever_room'], bossAt: { 2: 'counting_house' } },
    templates: [...SHARED, START_ROOM, STAIR_ROOM, RELIC_ROOM, SHRINE_ROOM, LEVER_ROOM, COUNTING_HOUSE],
  },
  cloister: {
    id: 'cloister', name: 'THE CINDER CLOISTER', kind: 'gen', biome: 'cloister', levelFloor: 11, song: 'cinders', floors: 1,
    monsters: [['cinderling', 4], ['tithe_collector', 2], ['penitent', 3], ['clapperjaw', 1], ['ash_gargoyle', 2], ['shade_acolyte', 2], ['unrung_font', 0.5]], breakables: ['urn', 'coffin', 'amphora', 'barrel'],
    gen: { rooms: 12, start: 'start_room', end: 'chapter_house', fill: ['nave', 'crossing', 'gallery', 'rotunda', 'long_hall', 'pit_room', 'vault', 'cloister_walk'], required: ['novice_room', 'shrine_room'] },
    templates: [...SHARED, START_ROOM, SHRINE_ROOM, NOVICE_ROOM, CHAPTER_HOUSE],
  },
  belfry: {
    id: 'belfry', name: 'THE CRACKED BELFRY', kind: 'gen', biome: 'belfry', levelFloor: 15, song: 'the_climb', floors: 4,
    monsters: [['rattlebones', 3], ['cinderling', 3], ['penitent', 3], ['clapperjaw', 1], ['ash_gargoyle', 2]], breakables: ['urn', 'coffin', 'clay'],
    gen: { rooms: [5, 5, 6], start: 'start_room', end: 'stair_room', fill: ['nave', 'gallery', 'rotunda', 'pit_room', 'vault', 'long_hall', 'crossing', 'cloister_walk'], required: ['shrine_room'], arenaFloor: 3 },
    templates: [...SHARED, START_ROOM, STAIR_ROOM, SHRINE_ROOM],
    arena: BELFRY_ARENA,
  },
  pantry: {
    id: 'pantry', name: 'THE DROWNED PANTRY', kind: 'gen', biome: 'pantry', levelFloor: 3, song: 'under_gloam', floors: 1,
    monsters: [['peatwalker', 4], ['bloat_deacon', 1]], breakables: ['barrel', 'keg', 'crate'],
    gen: { rooms: 4, start: 'start_room', end: 'pantry_boss', fill: ['vault', 'crossing', 'cells', 'nave'], required: ['shrine_room'] },
    templates: [...SHARED, START_ROOM, SHRINE_ROOM, PANTRY_BOSS],
  },
  knell: {
    id: 'knell', name: 'A KNELL RUN', kind: 'gen', biome: 'mixed', levelFloor: 1, song: 'the_knell', floors: 2, bellOk: false,
    monsters: [['peatwalker', 2], ['rattlebones', 3], ['choir_skull', 1], ['tomb_crawler', 2], ['cinderling', 3], ['penitent', 2], ['pallid_bearer', 1], ['clapperjaw', 0.6], ['ash_gargoyle', 1.5], ['tithe_collector', 1], ['bloat_deacon', 1]], breakables: ['urn', 'coffin', 'barrel', 'crate'],
    gen: { rooms: [14, 15], start: 'start_room', end: 'stair_room', fill: ['nave', 'crossing', 'gallery', 'cells', 'rotunda', 'long_hall', 'pit_room', 'vault', 'cloister_walk', 'dead_end'], required: [] },
    templates: [...SHARED, START_ROOM, STAIR_ROOM],
  },
  session: {
    id: 'session', name: 'THE KNELL', kind: 'gen', biome: 'mixed', levelFloor: 12, song: 'the_knell', floors: 1, bellOk: false,
    monsters: [['peatwalker', 2], ['rattlebones', 3], ['choir_skull', 1], ['tomb_crawler', 2], ['cinderling', 3], ['penitent', 2], ['pallid_bearer', 1], ['clapperjaw', 0.6], ['ash_gargoyle', 1.5], ['bloat_deacon', 1]], breakables: ['urn', 'coffin', 'barrel', 'crate'],
    gen: { rooms: 18, start: 'start_room', end: 'dead_end', fill: ['nave', 'crossing', 'gallery', 'cells', 'rotunda', 'long_hall', 'pit_room', 'vault', 'cloister_walk'], required: [] },
    templates: [...SHARED, START_ROOM],
  },
};
for (const z of Object.values(ZONES)) z.levelFloor = z.levelFloor ?? 1;

export const BIOMES = {
  yard: { sun: 'sky', sunI: 0.5, ambient: 'navy', ambI: 0.85, bg: 'ink', fog: 'navy', floor: 'mud', wall: 'ashlar', wallH: 2.2, rain: 1, wind: 0.3, torch: 0x9fc4ff, decor: ['tombstone', 'dead-tree', 'bones', 'rubble', 'tombstone', 'stump'], wallDress: ['wall-chains'] },
  town: { sun: 'orange', sunI: 0.7, ambient: 'plum', ambI: 1.0, bg: 'ink', fog: 'plum', floor: 'cobbles', wall: 'bricks', wallH: 2.6, torch: 0xffb060, decor: ['barrel', 'crate', 'sack', 'park-bench', 'planter', 'hitching-post', 'bucket'], wallDress: ['banner', 'wall-lantern'] },
  causeway: { sun: 'sky', sunI: 0.55, ambient: 'navy', ambI: 0.9, bg: 'ink', fog: 'teal', floor: 'mud', wall: 'dry-stone', wallH: 1.2, rain: 1, wind: 0.5, torch: 0xffc080, water: 1, decor: ['dead-tree', 'willow', 'reeds', 'cart', 'tall-grass', 'rock', 'fallen-tree', 'reeds'], wallDress: [] },
  ossuary: { sun: 'mist', sunI: 0.3, ambient: 'navy', ambI: 0.9, bg: 'ink', fog: 'night', floor: 'flagstones', wall: 'ashlar', wallH: 3, torch: 0xa8e070, pit: 1, decor: ['bones', 'rubble', 'skull-pile', 'cobweb', 'candles', 'sarcophagus', 'cage', 'spikes'], wallDress: ['wall-torch', 'banner', 'wall-chains', 'column'] },
  cloister: { sun: 'orange', sunI: 0.45, ambient: 'plum', ambI: 0.8, bg: 'ink', fog: 'red', floor: 'slate-tiles', wall: 'sandstone', wallH: 3, torch: 0xff8030, pit: 2, embers: 1, decor: ['rubble', 'ruined-wall', 'brazier', 'flame', 'column', 'bones', 'statue'], wallDress: ['wall-torch', 'banner'] },
  belfry: { sun: 'sky', sunI: 0.5, ambient: 'navy', ambI: 0.8, bg: 'night', fog: 'navy', floor: 'basalt', wall: 'basalt', wallH: 3, torch: 0x60e0f0, pit: 3, wind: 0.8, decor: ['rubble', 'rune-stone', 'obelisk', 'bones', 'standard'], wallDress: ['wall-chains', 'wall-torch'] },
  pantry: { sun: 'sky', sunI: 0.3, ambient: 'teal', ambI: 0.8, bg: 'ink', fog: 'teal', floor: 'shallow-water', wall: 'ashlar', wallH: 2.6, torch: 0xffc080, water: 1, decor: ['barrel', 'keg', 'crate-stack', 'sack', 'wall-shelf', 'bucket'], wallDress: ['wall-torch', 'wall-shelf'] },
  mixed: { sun: 'plum', sunI: 0.45, ambient: 'navy', ambI: 0.9, bg: 'ink', fog: 'plum', floor: 'rune-floor', wall: 'basalt', wallH: 3, torch: 0xd070ff, pit: 3, decor: ['rubble', 'bones', 'skull-pile', 'rune-stone', 'candles', 'obelisk'], wallDress: ['wall-chains', 'wall-torch'] },
};

// Where each template's floor textures come from, by floor number, for a little variety.
export const BIOME_FLOORS = { ossuary: ['flagstones', 'flagstones', 'floor-tiles'], cloister: ['slate-tiles', 'cinders', 'lava-crust'], belfry: ['basalt', 'rune-floor', 'basalt', 'rune-floor'], mixed: ['rune-floor', 'basalt'] };

export const zoneName = (id, floor) => {
  const z = ZONES[id];
  return z.floors > 1 && !(id === 'belfry' && floor === 3) ? `${z.name} ${floor + 1}` : z.name;
};
