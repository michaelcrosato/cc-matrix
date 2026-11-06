// The village's fixed furniture: buildings, doors, landmarks. Plain data. Coordinates are tiles (1 m).
// Fronts and doors face south (+z), so the default camera sees them.
export const BUILDINGS = [
  { id: 'museum', name: 'Museum', x: 17, z: 3, w: 11, d: 7, door: [22.5, 10.5], room: 'museum', model: 'b-museum' },
  { id: 'hall', name: 'Town Hall & Post', x: 4, z: 34, w: 9, d: 6, door: [8.5, 40.5], room: 'hall', model: 'b-hall' },
  { id: 'store', name: "Mrs. Gander's", x: 52, z: 33, w: 8, d: 6, door: [56, 39.5], room: 'store', model: 'b-store' },
  { id: 'mothwick', name: "Mothwick's", x: 52, z: 42, w: 7, d: 5, door: [55.5, 47.5], room: 'mothwick', model: 'b-mothwick' },
  { id: 'home', name: 'Your plot', x: 67, z: 35, w: 6, d: 5, door: [70, 40.5], room: 'home', model: 'home' },
  { id: 'dorrit', name: "Dorrit's", x: 15, z: 20, w: 5, d: 4, door: [17.5, 24.5], room: 'house_dorrit', model: 'cottage', roof: 'orange', wall: 'sand' },
  { id: 'tavi', name: "Tavi's", x: 18, z: 27, w: 5, d: 4, door: [20.5, 31.5], room: 'house_tavi', model: 'cottage', roof: 'sand', wall: 'white' },
  { id: 'nib', name: "Nib's", x: 29, z: 21, w: 5, d: 4, door: [31.5, 25.5], room: 'house_nib', model: 'cottage', roof: 'navy', wall: 'mist' },
  { id: 'bartleby', name: "Bartleby's", x: 49, z: 19, w: 5, d: 4, door: [51.5, 23.5], room: 'house_bartleby', model: 'cottage', roof: 'slate', wall: 'night' },
  { id: 'ottoline', name: "Lady Ottoline's", x: 59, z: 23, w: 5, d: 4, door: [61.5, 27.5], room: 'house_ottoline', model: 'cottage', roof: 'plum', wall: 'red' },
  { id: 'rocco', name: "Rocco's", x: 69, z: 22, w: 5, d: 4, door: [71.5, 26.5], room: 'house_rocco', model: 'cottage', roof: 'red', wall: 'sand' },
  { id: 'ozzie', name: "Ozzie's", x: 63, z: 42, w: 5, d: 4, door: [65.5, 46.5], room: 'house_ozzie', model: 'cottage', roof: 'night', wall: 'teal' },
  { id: 'yolanda', name: "Yolanda's", x: 72, z: 42, w: 5, d: 4, door: [74.5, 46.5], room: 'house_yolanda', model: 'cottage', roof: 'red', wall: 'orange' },
];
export const LANDMARKS = {
  busStop: [8.5, 28.5],
  oldPear: [24, 37],
  oldBell: [19.5, 41.5],
  noticeBoard: [28.5, 39.5],
  benchWest: [20.5, 45.5],
  benchEast: [27.5, 45.5],
  stallSpot: [29.5, 35.5],
  lookoutBench: [72.5, 7.5],
  lighthouse: [56.5, 53.5],
  mailbox: [73.5, 41.5],
  ribbon: [31, 43.5],
  vesperLamp: [24.5, 43],
  bridgeN: [39.5, 24.5],
  bridgeS: [44, 38.5],
  soupPot: [25, 41],
};
/** Sprinkled lamps (tile centres); moths come to them and they light at night. */
export const LAMPS = [[14.5, 42.5], [33.5, 38.5], [50.5, 40.5], [62.5, 38.5], [11.5, 30.5], [33.5, 28.5], [20.5, 11.5], [47.5, 26.5], [24.5, 43], [30.5, 47.5]];
export const BENCHES = [[20.5, 45.5], [27.5, 45.5], [72.5, 7.5]];
/** Personal decoration outside each cottage: same shell, different life. */
export const COTTAGE_DECO = {
  dorrit: [['soup-pot', 0.4, 0.8, { scale: 0.34 }], ['soup-pot', 4.6, 0.6, { scale: 0.26 }]],
  tavi: [['flower', 0.5, 0.5, { params: { species: 1 }, palette: { petal: 'sand' } }], ['flower', 4.5, 0.5, { params: { species: 0 }, palette: { petal: 'sand' } }], ['flower', 0.5, 1.4, { params: { species: 2 }, palette: { petal: 'sand' } }]],
  nib: [['telescope', 4.4, 0.6, {}]],
  bartleby: [['kenney-furniture/lounge-chair', 4.4, 0.7, { palette: { wood: 'plum', carpet: 'red', carpetDarker: 'plum' } }]],
  ottoline: [['cheese-wheel', 0.5, 0.5, { palette: { a: 'plum', b: 'night', c: 'night' } }], ['driftwood', 4.3, 0.8, {}]],
  rocco: [['tank', 0.6, 0.6, { params: { w: 0.8 }, palette: { water: 'sand', frame: 'orange', sand: 'orange', top: 'orange' }, scale: 0.8 }], ['kenney-furniture/bench-cushion-low', 4.4, 0.7, { palette: { wood: 'night', carpet: 'red', metalLight: 'mist' }, scale: 1.3 }]],
  ozzie: [['kenney-furniture/cardboard-box-closed', 0.5, 0.6, { palette: { wood: 'sand', woodDark: 'orange' }, scale: 1.4 }], ['kenney-furniture/cardboard-box-closed', 4.4, 0.6, { palette: { wood: 'sand', woodDark: 'orange' }, scale: 1.4 }]],
  yolanda: [['kenney-furniture/rug-doormat', 2.5, 0.4, { palette: { wood: 'red' }, scale: 2 }], ['kenney-furniture/pillow', 4.4, 0.6, { palette: { carpet: 'orange' }, scale: 2 }]],
};
export const ACRES = { cols: 5, rows: 4, size: 16 };
export const ACRE_NAMES = [
  ['Pine Wood', 'Museum Terrace', 'The Falls', 'Pear Orchard', 'The Lookout'],
  ['Bus Stop', 'Upper Row', 'North Bridge', 'River Row', 'Mossy Wood'],
  ['Town Hall', 'The Plaza', 'The Bend', 'Shop Street', 'Your Plot'],
  ['Tide Pools', 'The Dock', 'River Mouth', 'Lighthouse', 'Palm Grove'],
];
