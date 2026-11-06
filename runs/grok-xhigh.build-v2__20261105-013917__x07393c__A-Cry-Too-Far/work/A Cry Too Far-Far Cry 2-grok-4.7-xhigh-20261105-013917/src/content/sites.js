/** Places in the Kettle. Positions are world metres, +x east, -z north. */
export const SITES = [
  { id: 'mile-forty', name: 'MILE FORTY', x: 0, z: 40, r: 70, kind: 'town' },
  { id: 'pump-shed', name: 'PUMP SHED', x: -120, z: 150, kind: 'safehouse' },
  { id: 'ranger-post', name: 'RANGER POST', x: 40, z: -170, kind: 'post' },
  { id: 'water-tower', name: 'WATER TOWER', x: 470, z: -180, kind: 'safehouse' },
  { id: 'fort-clement', name: 'FORT CLEMENT', x: -430, z: -180, kind: 'hq', faction: 'concord' },
  { id: 'long-field', name: 'THE LONG FIELD', x: -260, z: -300, kind: 'field' },
  { id: 'granary', name: 'THE GRANARY', x: 400, z: 280, kind: 'hq', faction: 'harvest' },
  { id: 'east-siding', name: 'EAST SIDING', x: 430, z: -60, kind: 'depot' },
  { id: 'three-wells', name: 'THREE WELLS', x: -260, z: 240, kind: 'village' },
  { id: 'pump-station', name: 'PUMP STATION', x: -330, z: 395, kind: 'pump' },
  { id: 'salt-pan', name: 'SALT PAN', x: 200, z: 470, kind: 'flats' },
  { id: 'the-cut', name: 'THE CUT', x: 150, z: -300, kind: 'mine' },
  { id: 'observatory', name: 'OBSERVATORY', x: -130, z: -520, kind: 'trig' },
  { id: 'the-pass', name: 'THE PASS', x: -590, z: -430, kind: 'pass' },
  { id: 'clinic', name: 'MERCY MISSION', x: 12, z: 55, kind: 'clinic' },
  { id: 'tibor', name: 'TIBOR SHED', x: -18, z: 62, kind: 'shop' },
  { id: 'bar', name: 'THE BAR', x: 22, z: 28, kind: 'bar' },
  { id: 'sluice', name: 'SLUICE HOUSE', x: 168, z: -286, kind: 'loot' },
];

export const POSTS = [
  { id: 'p1', name: 'NORTH POST', x: 90, z: -80, faction: 'concord', n: 5 },
  { id: 'p2', name: 'WEST POST', x: -200, z: 30, faction: 'concord', n: 5 },
  { id: 'p3', name: 'EAST POST', x: 170, z: 90, faction: 'harvest', n: 4 },
  { id: 'p4', name: 'FORT ROAD', x: -320, z: -90, faction: 'concord', n: 6 },
  { id: 'p5', name: 'MINE ROAD', x: 280, z: -210, faction: 'harvest', n: 5 },
  { id: 'p6', name: 'SALT ROAD', x: 300, z: 390, faction: 'harvest', n: 4 },
];

export const TRIGS = [
  { id: 't1', name: 'RIDGE TRIG', x: -130, z: -500 },
  { id: 't2', name: 'WEST TRIG', x: -400, z: -40 },
  { id: 't3', name: 'EAST TRIG', x: 280, z: 40 },
  { id: 't4', name: 'MERCY TRIG', x: -40, z: 280 },
  { id: 't5', name: 'GRANARY TRIG', x: 460, z: 180 },
  { id: 't6', name: 'CUT TRIG', x: 60, z: -420 },
];

export const CASES = [
  { id: 'c1', x: -80, z: -40, stones: 3 },
  { id: 'c2', x: 210, z: 20, stones: 4 },
  { id: 'c3', x: -300, z: -240, stones: 5 },
  { id: 'c4', x: 360, z: -40, stones: 2 },
  { id: 'c5', x: 40, z: 300, stones: 6 },
  { id: 'c6', x: -180, z: 180, stones: 3 },
  { id: 'c7', x: 500, z: 40, stones: 4 },
  { id: 'c8', x: -480, z: -300, stones: 5 },
  { id: 'c9', x: 140, z: 420, stones: 2 },
  { id: 'c10', x: 20, z: -360, stones: 4 },
  { id: 'c11', x: 300, z: -300, stones: 3 },
  { id: 'c12', x: -90, z: 420, stones: 6 },
];

export const HALTS = [
  { id: 'west-cutting', name: 'WEST CUTTING', x: -400, z: 100 },
  { id: 'mile-halt', name: 'MILE FORTY HALT', x: 0, z: 70 },
  { id: 'east-halt', name: 'EAST SIDING HALT', x: 430, z: -60 },
  { id: 'cut-spur', name: 'CUT SPUR', x: 180, z: -220 },
];

/** Story scars. Burned grass cannot burn twice, so the column can walk them. */
export const STRIPS = {
  A: { width: 30, points: [[430, -60], [320, -150], [220, -230], [150, -300]] },
  C: { width: 26, points: [[90, -280], [150, -300], [230, -290]] },
  B: { width: 30, points: [[150, -300], [-40, -310], [-260, -300], [-420, -370], [-590, -430]] },
};

export function siteById(id) {
  return SITES.find((s) => s.id === id) || POSTS.find((s) => s.id === id) || HALTS.find((s) => s.id === id) || null;
}
