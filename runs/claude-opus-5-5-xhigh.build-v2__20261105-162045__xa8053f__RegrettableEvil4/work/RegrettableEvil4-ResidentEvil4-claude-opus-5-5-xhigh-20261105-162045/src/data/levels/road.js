// CLAIM 2: WEAR AND TEAR. The Salt Road in the rain: a roadblock, a narrow bridge, a door.
import { S } from '../dialogue.js';
import { MapInfo } from '../../game/mapPaint.js';

const M = new MapInfo('road');
const X = (c) => M.x(c); const Z = (r) => M.z(r);

const dress = [
  ['cart', X(9.5), Z(49.5), { turn: 80 }], ['cart', X(17), Z(45), { turn: 95 }], ['crate-stack', X(13), Z(50.5), { turn: 20 }], ['barrel', X(6), Z(45.5)], ['fence', X(5.5), Z(53.5), { params: { length: 3 }, turn: 90, collide: false }],
  ['dead-tree', X(5), Z(50), { collide: false }], ['dead-tree', X(16.5), Z(50.5), { collide: false }], ['dead-tree', X(9), Z(38), { collide: false }], ['dead-tree', X(13), Z(58), { collide: false }],
  ['signpost', X(13), Z(55), {}], ['tall-grass', X(9), Z(60), { collide: false }], ['tall-grass', X(13), Z(36), { collide: false }], ['reeds', X(8.5), Z(34), { collide: false }], ['reeds', X(13), Z(34.5), { collide: false }],
  ['lamp-post', X(13), Z(44), { light: { intensity: 12, radius: 11 } }], ['lamp-post', X(8), Z(55), { light: { intensity: 12, radius: 11 } }],
  ['rock', X(3), Z(37), {}], ['boulders', X(6), Z(40), { collide: false }], ['boulders', X(12), Z(6), { collide: false }], ['tombstone', X(9), Z(4), {}], ['tombstone', X(12.5), Z(3.5), {}],
  ['wall-lantern', X(9.5), Z(0.6), { y: 2.4, collide: false }], ['wall-lantern', X(12.5), Z(0.6), { y: 2.4, collide: false }],
  ['rowboat', X(5), Z(14.6), { turn: 20, collide: false }], ['fish-crate', X(8), Z(14), { collide: false }], ['lobster-pot', X(4), Z(18), { collide: false }], ['draped-net', X(8), Z(19), { turn: 40 }],
  ['haystack', X(16), Z(18), {}], ['dead-tree', X(16), Z(21), { collide: false }], ['tall-grass', X(5), Z(11), { collide: false }], ['tall-grass', X(13), Z(21), { collide: false }], ['lamp-post', X(10), Z(9), { light: { intensity: 14, radius: 11 } }], ['lamp-post', X(14), Z(16), { light: { intensity: 12, radius: 10 } }],
  ['thole-sign', X(10.5), Z(0.9), { y: 3.4, collide: false }],
];

export const road = {
  id: 'road',
  title: 'THE SALT ROAD',
  chapter: 2,
  map: 'road',
  mood: 'rain',
  music: 'explore',
  autoCombat: true,
  startYaw: 180,
  water: { y: -2.6 },
  ambience: [['rainLoop', 0.6], ['windLoop', 0.5]],
  theme: {
    floors: { ',': 'peat', '=': 'wet-planks' },
    walls: { '#': { tex: 'moss-stone', h: 8 } },
    cover: { tex: 'dry-stone', h: 1 },
  },
  build: {
    brine: [[13, 48], [10, 46], [7, 44], [14, 46], [9, 16]],
  },
  chests: [[2, 38, 'seaGlass'], [15, 12, 'goldTooth', 1]],
  items: [[13, 56, 'samphire', 1], [10, 42, 'ammoPistol', 12], [15, 53, 'ammoShells', 5], [5, 12, 'oil', 1], [14, 21, 'flare', 1], [8, 10, 'ammoRifle', 4]],
  notes: [[4, 40, 'actuary']],
  backdrop: [
    ['cliff-silhouette', -30, 0, -20, { params: { w: 60, h: 18 }, seed: 12, turn: 90 }], ['cliff-silhouette', 30, 0, 10, { params: { w: 80, h: 22 }, seed: 14, turn: 90 }], ['abbey-far', 40, 0, -70, { turn: -10 }],
  ],
  setup(area) {
    for (const [id, x, z, o = {}] of dress) area.level.place(id, x, z, o);
    area.level.place('fathom-post', X(3.5), Z(13), { collide: false });
  },
  onDoor(area, door) {
    if (door.r0 === 0) area.addDelayed(0.6, () => area.loadNext('cannery', null));
  },
  beats: [
    { id: 'roadStart', steps: [
      { run: (a) => { a.chapterCard('CLAIM 2: WEAR AND TEAR'); } },
      { wait: 2.5 },
      { objective: 'FOLLOW THE ROAD NORTH TO THE CANNERY' },
    ] },
    { id: 'roadblock', trigger: { on: 'enter', zone: [8, 54, 13, 60] }, steps: [
      { spawn: { type: 'gaffer', n: 6, at: [[7, 46], [14, 45], [9, 45], [12, 44], [7, 50], [15, 50]], state: 'WORK' } },
      // One Bottler up on the wagon: he stays there and lobs, so he has to be shot down.
      { run: (a) => { const w = a.spawnEnemy('bottler', { x: X(17), z: Z(45), y: 1.05, state: 'LEDGE' }); w.x = X(17); w.z = Z(45); } },
      { spawn: { type: 'netwife', n: 1, at: [6, 45], state: 'WORK' } },
      { hint: 'SHOOT THE RED-BANDED BARRELS', action: 'fire', time: 8 },
      { until: (a) => a.player.z < Z(42) || a.enemies.every((e) => e.dead) },
      { checkpoint: true },
    ] },
    { id: 'alcove', trigger: { on: 'enter', zone: [1, 36, 4, 40] }, steps: [
      { wait: 1.5 },
      { spawn: { type: 'gaffer', n: 2, at: [[8, 37], [8, 39]] } },
    ] },
    { id: 'bridge', trigger: { on: 'enter', zone: [8, 34, 13, 37] }, steps: [
      { run: (a) => {
        // Bottlers on the ledges: elevated, unreachable. Shoot the bottles, or them.
        for (const [c, r] of [[6, 24], [15, 24], [16, 25]]) a.spawnEnemy('bottler', { x: X(c), z: Z(r), y: 3.1, state: 'LEDGE', noLoot: true });
      } },
      { spawn: { type: 'gaffer', n: 3, at: [[10, 25], [11, 25], [10, 23]] } },
      { spawn: { type: 'gaffer', n: 2, at: [[11, 22], [10, 21]] } },
      { hint: 'KICK THEM OFF THE EDGE', action: 'action', time: 7 },
      { objective: 'CROSS THE BRIDGE' },
    ] },
    { id: 'north', trigger: { on: 'enter', zone: [8, 20, 13, 25] }, steps: [
      // Across the bridge is across the bridge: nobody plays it twice for a bad minute on the far side.
      { checkpoint: true },
      { spawn: { type: 'runner', n: 4, at: [[12, 11], [9, 11], [15, 16], [5, 20]] } },
      // The ledges are out of reach, so the Bottlers on them can't hold anything up.
      { until: (a) => a.enemies.every((e) => e.dead || e.state === 'LEDGE') },
      { objective: 'THE DOOR AT THE END OF THE ROAD' },
      { checkpoint: true },
      { run: (a) => { if (!a.run.flag('rifleHint')) { a.run.setFlag('rifleHint'); a.radioCall([['pym', 'A RIFLE IS NOW AVAILABLE FROM YOUR LOCAL SUPPLIER. THE COMPANY DOES NOT ASK HOW HE GOT IT.']]); } } },
    ] },
  ],
};
export { S };
