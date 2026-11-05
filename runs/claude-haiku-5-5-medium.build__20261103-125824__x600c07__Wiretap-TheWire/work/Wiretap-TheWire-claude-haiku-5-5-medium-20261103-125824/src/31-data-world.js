// World data: legend, wall types (PLAN §12.2), floor tags (§12.3) and the points of interest (App. A).
const WALL_TYPES = {   // char -> wall type id; h in world units (16 = one cell)
  '#': { id: 1, h: 56, top: '#3a2a26', side: '#5a3a30', face: 'brick', roof: 'slab', name: 'boundary' },
  R: { id: 2, h: 40, top: '#4a3a34', side: '#7a3b2e', face: 'brick', roof: 'slab', name: 'rowhouse' },
  F: { id: 3, h: 40, top: '#4a4844', side: '#8a8680', face: 'stone', roof: 'slab', name: 'formstone' },
  P: { id: 4, h: 36, top: '#5a5048', side: '#b8a27a', face: 'plaster', roof: 'slab', name: 'painted brick' },
  V: { id: 5, h: 40, top: '#3a2a24', side: '#4a2e26', face: 'plank', roof: 'slab', name: 'vacant' },
  S: { id: 6, h: 32, top: '#5a4a3a', side: '#8a6a4a', face: 'brick', roof: 'slab', name: 'Gaither Market' },
  L: { id: 7, h: 32, top: '#4a5a6a', side: '#7a8a9a', face: 'plaster', roof: 'slab', name: 'Suds City' },
  E: { id: 8, h: 32, top: '#3a3a4a', side: '#6a6a8a', face: 'plaster', roof: 'slab', name: 'Ridley Wireless & Pager' },
  M: { id: 9, h: 32, top: '#6a3a2a', side: '#a0523a', face: 'brick', roof: 'slab', name: "Mama B's Soul Food" },
  $: { id: 10, h: 32, top: '#3a4a3a', side: '#5a7a5a', face: 'plaster', roof: 'slab', name: 'Ridley Check Cashing' },
  K: { id: 11, h: 32, top: '#5a3a2a', side: '#9a6a3a', face: 'brick', roof: 'slab', name: 'Ridley Carryout' },
  B: { id: 12, h: 32, top: '#2a2a3a', side: '#4a4a6a', face: 'brick', roof: 'slab', name: 'Fades & Grades' },
  Q: { id: 13, h: 32, top: '#4a3a4a', side: '#7a5a7a', face: 'plaster', roof: 'slab', name: 'Abbott Liquors' },
  H: { id: 14, h: 64, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', name: 'Greater Hope Baptist' },
  T: { id: 15, h: 88, top: '#5a5650', side: '#8a847a', face: 'stone', roof: 'slab', name: 'church tower' },
  C: { id: 16, h: 44, top: '#5a4a3a', side: '#9a7a5a', face: 'brick', roof: 'slab', name: 'Delancey Courts' },
  G: { id: 17, h: 24, top: '#4a4a4a', side: '#6a6a6a', face: 'plank', roof: 'plain', name: 'garage' },
  k: { id: 18, h: 20, top: '#d8d8d0', side: '#e8e8e0', face: 'plaster', roof: 'plain', name: 'Arundel Gas kiosk' },
};

const FLOOR_CHARS = {   // char -> floor tag (walkable unless block)
  '.': { floor: 'walk' }, '=': { floor: 'road' }, '-': { floor: 'alley' }, ',': { floor: 'lot' },
  ':': { floor: 'court' }, b: { floor: 'ball' }, p: { floor: 'play' }, v: { floor: 'vacant' }, g: { floor: 'garage' },
  f: { floor: 'fence', block: true }, x: { floor: 'edge', block: true },
};

const FLOOR_COLORS = {   // base colour per tag: [r, g, b]
  walk: [132, 132, 128], road: [46, 46, 50], alley: [58, 56, 54], lot: [84, 82, 60], court: [120, 104, 80],
  ball: [96, 84, 70], play: [150, 70, 60], vacant: [70, 56, 44], garage: [78, 78, 74], fence: [60, 60, 60], edge: [40, 40, 40],
};

function legendForMap() {
  const legend = {};
  for (const [ch, t] of Object.entries(WALL_TYPES)) legend[ch] = t.id;
  Object.assign(legend, FLOOR_CHARS);
  return legend;
}

function typesForMap() {
  const types = {};
  for (const t of Object.values(WALL_TYPES)) {
    types[t.id] = { h: t.h, top: t.top, side: t.side, face: t.face, roof: t.roof, cut: true };
  }
  return types;
}

// Points of interest in cells (App. A). World position = (cell + .5) * 16.
const POI = {
  P1: { c: [28, 26], label: 'Payphone outside Gaither Market', number: '555-0187' },
  P2: { c: [35, 26], label: 'Payphone outside Suds City', number: '555-0143' },
  P3: { c: [42, 30], label: 'Payphone at the Ridley bus shelter', number: '555-0129' },
  post: { c: [30, 32], label: "The crew's corner, Gaither west sidewalk" },
  v1412: { c: [27, 36], label: 'Stash in 1412 Gaither' },
  felton: { c: [30, 39], label: "1407 Gaither: Mr. Felton's stoop" },
  odessa: { c: [33, 37], label: "1410 Gaither: Miss Odessa's stoop" },
  pockets: { c: [27, 21], label: 'Alley behind Gaither Market' },
  barber: { c: [20, 26], label: 'Fades & Grades' },
  mamab: { c: [46, 26], label: "Mama B's door" },
  chevy: { c: [22, 29], label: 'Your car' },
  lot: { c: [63, 34], label: 'Vacant lot' },
  gas: { c: [62, 48], label: 'Arundel Gas' },
  church: { c: [64, 26], label: 'Greater Hope steps' },
};

// Where the civilians and crew stand, by name (cells). Spawns are cells on walkable floor.
const SPOTS = {
  corner: [30, 31], corner2: [31, 30], alley: [27, 21], stoopOdessa: [33, 37], stoopFelton: [30, 39],
  bench: [36, 26], shelter: [42, 30], carryout: [35, 30], barberWin: [20, 26], courtGate: [18, 45],
  dunmore: [30, 15], strip: [25, 44], church: [64, 26], lotA: [62, 36], walkA: [40, 22], walkB: [14, 30],
  walkC: [50, 40], walkD: [56, 20], walkE: [12, 40], walkF: [44, 44],
};
