// Weapons are data. Adding one needs no code change (art in src/art/guns.js, sounds in src/audio/sfx.js).
export const WEAPONS = {
  cane:   { id: 'cane', name: 'Cane knife', slot: 'melee', rate: 1.6, damage: 55, range: 2.2, wear: 0, price: 0, vm: 'cane', kind: 'melee', noise: 4 },
  m38:    { id: 'm38', name: 'Service revolver', slot: 'side', mag: 6, reserve: 36, rate: 3, damage: 34, range: 45, wear: 0.5, price: 0, vm: 'm38', kind: 'revolver', spread: 1.2, noise: 90, reload: 2.4, stats: [4, 3, 8] },
  flare:  { id: 'flare', name: 'Flare pistol', slot: 'side', mag: 1, reserve: 8, rate: 0.6, damage: 12, range: 70, wear: 0, price: 0, vm: 'flare', kind: 'flare', spread: 0.5, noise: 60, reload: 1.8, ignite: true, stats: [2, 6, 8] },
  tractor: { id: 'tractor', name: '"Tractor" rifle', slot: 'main', mag: 30, reserve: 150, rate: 9, damage: 24, range: 110, wear: 0.35, price: 6, vm: 'tractor', kind: 'mag', spread: 2.2, noise: 120, reload: 2.2, auto: true, stats: [5, 6, 3] },
  mule:   { id: 'mule', name: '"Mule" pump gun', slot: 'main', mag: 6, reserve: 36, rate: 1.1, damage: 9, pellets: 10, range: 22, wear: 0.8, price: 8, vm: 'mule', kind: 'pump', spread: 5, noise: 130, reload: 3.0, stats: [8, 2, 4] },
  empire: { id: 'empire', name: '"Old Empire" bolt rifle', slot: 'main', mag: 5, reserve: 30, rate: 0.8, damage: 95, range: 320, wear: 1.0, price: 14, vm: 'empire', kind: 'bolt', spread: 0.3, noise: 160, reload: 3.0, scope: 12, stats: [9, 10, 6] },
  weed:   { id: 'weed', name: '"Weed Burner" flamethrower', slot: 'special', mag: 120, reserve: 240, rate: 20, damage: 28, range: 14, wear: 0.012, price: 18, vm: 'weed', kind: 'flame', noise: 50, reload: 3.2, stream: true, ignite: true, stats: [8, 1, 3] },
  tube:   { id: 'tube', name: '"Long Tube" rocket launcher', slot: 'special', mag: 1, reserve: 5, rate: 0.4, damage: 180, blast: 6, range: 160, wear: 2, price: 20, vm: 'tube', kind: 'tube', noise: 170, reload: 3.4, stats: [10, 8, 2] },
  mg:     { id: 'mg', name: 'Mounted MG', slot: 'mounted', rate: 10, damage: 20, range: 180, wear: 0, price: 0, kind: 'mounted', spread: 1.6, noise: 150, heat: [6, 4] },
};
export const THROWABLES = {
  molotov: { id: 'molotov', name: 'Bottle', carry: 3, price: 1, vm: 'bottle', radius: 4, range: 25 },
  charge: { id: 'charge', name: 'Remote charge', carry: 2, price: 3, vm: 'charge', damage: 220, blast: 7 },
};
export const SLOTS = ['melee', 'side', 'main', 'special'];
export const START_GUNS = { melee: 'cane', side: 'm38', main: null, special: null };
export const UPGRADES = {
  cleaning: { id: 'cleaning', name: 'Cleaning kit', price: 6, text: 'Guns wear 40 percent slower.' },
  pouch: { id: 'pouch', name: 'Syrette pouch', price: 5, text: 'Carry five syrettes.' },
  belt: { id: 'belt', name: 'Ammo belt', price: 5, text: 'Half again as much reserve.' },
  kit: { id: 'kit', name: 'Vehicle kit', price: 6, text: 'Repairs take 1.5 seconds.' },
};
// Side views for Tibor's rack: [x, y, w, h, colour] on an 80 x 24 grid, drawn at double size.
export const GUN_SHAPES = {
  tractor: [[0, 8, 18, 8, 'plum'], [18, 6, 26, 8, 'slate'], [44, 7, 30, 3, 'night'], [30, 14, 6, 10, 'night'], [60, 4, 3, 3, 'night'], [26, 14, 4, 7, 'plum'], [20, 7, 6, 2, 'red']],
  mule: [[0, 8, 20, 8, 'plum'], [20, 6, 20, 8, 'slate'], [40, 6, 36, 3, 'night'], [40, 10, 30, 3, 'slate'], [48, 9, 12, 5, 'plum']],
  empire: [[0, 8, 22, 8, 'plum'], [22, 7, 22, 7, 'slate'], [44, 8, 34, 2, 'night'], [26, 2, 26, 4, 'night'], [34, 5, 6, 2, 'sand']],
  weed: [[60, 6, 14, 4, 'orange'], [20, 6, 40, 8, 'slate'], [4, 8, 16, 14, 'red'], [26, 14, 10, 3, 'night'], [34, 14, 4, 8, 'plum']],
  tube: [[4, 6, 70, 10, 'slate'], [70, 5, 6, 12, 'night'], [0, 5, 6, 12, 'orange'], [30, 3, 6, 3, 'night'], [34, 16, 4, 6, 'plum']],
};
