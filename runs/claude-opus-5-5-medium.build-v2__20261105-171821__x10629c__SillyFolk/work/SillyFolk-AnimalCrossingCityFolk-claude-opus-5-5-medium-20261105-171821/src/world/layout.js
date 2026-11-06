// Where everything stands. Plain data: buildings (with door and room), landmarks, spawn lists.
export const BUILDINGS = [
  { id: 'museum', model: 'museum', x: 24, z: 3.6, w: 8.6, d: 6.2, door: [24, 6.9], room: 'museum' },
  { id: 'hall', model: 'townhall', x: 12.8, z: 34.4, w: 6.4, d: 4.6, door: [12.8, 37.2], room: 'hall' },
  { id: 'store', model: 'store1', x: 58, z: 34.6, w: 6.4, d: 4.4, door: [58, 37.2], room: 'store' },
  { id: 'mothwick', model: 'mothwick', x: 65.4, z: 34.8, w: 4.8, d: 3.8, door: [65.4, 37.1], room: 'mothwick' },
  { id: 'home', model: 'home1', x: 74.5, z: 34.2, w: 4.6, d: 3.8, door: [74.5, 36.6], room: 'home' },
  { id: 'dorrit', model: 'cottage-dorrit', x: 17.5, z: 21.5, w: 4.4, d: 3.6, door: [17.5, 23.8], room: 'h_dorrit' },
  { id: 'nib', model: 'cottage-nib', x: 28.4, z: 21.5, w: 4.4, d: 3.6, door: [28.4, 23.8], room: 'h_nib' },
  { id: 'tavi', model: 'cottage-tavi', x: 33.8, z: 21.5, w: 4.4, d: 3.6, door: [33.8, 23.8], room: 'h_tavi' },
  { id: 'bartleby', model: 'cottage-bartleby', x: 48.5, z: 21.5, w: 4.4, d: 3.6, door: [48.5, 23.8], room: 'h_bartleby' },
  { id: 'ottoline', model: 'cottage-ottoline', x: 58.5, z: 21.5, w: 4.4, d: 3.6, door: [58.5, 23.8], room: 'h_ottoline' },
  { id: 'rocco', model: 'cottage-rocco', x: 72, z: 21.5, w: 4.4, d: 3.6, door: [72, 23.8], room: 'h_rocco' },
  { id: 'ozzie', model: 'cottage-ozzie', x: 66, z: 43.4, w: 4.4, d: 3.6, door: [66, 45.7], room: 'h_ozzie' },
  { id: 'yolanda', model: 'cottage-yolanda', x: 74, z: 43.4, w: 4.4, d: 3.6, door: [74, 45.7], room: 'h_yolanda' },
];
export const LANDMARK = {
  busStop: [6.5, 24.4], busShelter: [6, 22.8], oldPear: [24, 38], bell: [20, 36.2], notice: [28.5, 35], plazaBench1: [19.5, 42.5], plazaBench2: [28.5, 42.5], rindStall: [18, 41], mayorStart: [17.5, 43.4], mayorEnd: [30.5, 43.4], lamp: [28, 40.5], lookout: [70, 5.5], lighthouse: [66, 55], mailbox: [72.2, 37.2], dock: [20, 60], clothesline: [71, 45], rocco: [72, 26],
  pot: [24, 41.5],
};
export const LAMPS = [[28, 40.5], [20, 33.5], [28, 33.5], [12, 40], [33, 27.5], [50, 27.5], [60, 40.3], [70, 40.3], [24, 12], [55, 12], [8, 27], [50, 46], [30, 46]];
export const BRIDGES = [[39.5, 25.5, 6, 3], [42.5, 40.5, 6, 3], [42.5, 48, 6, 2]];
export const BENCHES = [{ x: 19.5, z: 42.5, r: 0 }, { x: 28.5, z: 42.5, r: 0 }, { x: 70, z: 5.5, r: 0, lookout: true }, { x: 36, z: 37, r: 0 }];
/** Starting tree spots: kind per zone, placed by the seeded village generator with these as hints. */
export const TREE_ZONES = [
  { kind: 'pine', x0: 3, z0: 3, x1: 15, z1: 14, n: 12 }, { kind: 'pear', x0: 50, z0: 3, x1: 64, z1: 7, n: 10 }, { kind: 'pear', x0: 52, z0: 10, x1: 64, z1: 14, n: 4 }, { kind: 'pine', x0: 62, z0: 16, x1: 77, z1: 19, n: 7 }, { kind: 'pear', x0: 3, z0: 28, x1: 14, z1: 31, n: 5 }, { kind: 'pear', x0: 46, z0: 28, x1: 60, z1: 32, n: 5 }, { kind: 'pear', x0: 3, z0: 41, x1: 14, z1: 46, n: 5 }, { kind: 'pear', x0: 48, z0: 41, x1: 60, z1: 46, n: 4 }, { kind: 'palm', x0: 60, z0: 50, x1: 77, z1: 56, n: 5 }, { kind: 'palm', x0: 2, z0: 50, x1: 16, z1: 53, n: 3 },
];
export const CITY = {
  ox: 500, oz: 0,
  fronts: [
    { id: 'salon', model: 'front-salon', x: 7, z: 5, w: 7, d: 4, door: [9, 7.2], room: 'salon', rot: 0 },
    { id: 'couture', model: 'front-couture', x: 14.5, z: 5, w: 7, d: 4, door: [16.6, 7.2], room: 'couture', rot: 0 },
    { id: 'theatre', model: 'front-theatre', x: 24, z: 5, w: 8, d: 4, door: [26.4, 7.2], room: 'theatre', rot: 0 },
    { id: 'auction', model: 'front-auction', x: 32.6, z: 5, w: 7, d: 4, door: [34.7, 7.2], room: 'auction', rot: 0 },
    { id: 'magda', model: 'front-magda', x: 18.5, z: 0, w: 4.6, d: 4, door: [19.4, 2.2], room: 'magda', rot: 0 },
    { id: 'bureau', model: 'front-bureau', x: 21.8, z: 17.5, w: 4, d: 6, door: [24.3, 15.7], room: 'bureau', rot: 90 },
    { id: 'cafe', model: 'front-cafe', x: 41, z: 5, w: 6, d: 4, door: [42.8, 7.2], room: 'cafe', rot: 0 },
  ],
  stop: [2.5, 10.5], tent: [33, 18.5], lamps: [[6, 8], [12, 8], [20, 8], [28, 8], [34, 8], [6, 14], [14, 14], [22, 14], [28, 16], [37, 17], [28, 21]],
};
