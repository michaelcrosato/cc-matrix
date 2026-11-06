// Sites: data only. kind picks the builder in world/sites-build.js. r = footprint radius (m).
export const SITES = [
  { id: 'mile-forty', name: 'Mile Forty', at: [0, 40], r: 60, kind: 'town', nofire: 70 },
  { id: 'pump-shed', name: 'Pump Shed', at: [-120, 150], r: 18, kind: 'safehouse', guards: 0 },
  { id: 'ranger-post', name: 'Ranger Post', at: [40, -170], r: 28, kind: 'post', faction: 'concord', guards: 8, cage: true, safehouseAfter: 'm2' },
  { id: 'water-tower', name: 'Water Tower', at: [470, -180], r: 24, kind: 'safehouse', faction: 'harvest', guards: 6 },
  { id: 'fort-clement', name: 'Fort Clement', at: [-430, -180], r: 60, kind: 'fort', faction: 'concord', guards: 10 },
  { id: 'long-field', name: 'The Long Field', at: [-260, -300], r: 100, kind: 'field', faction: 'concord', guards: 6, bunker: true },
  { id: 'granary', name: 'The Granary', at: [400, 280], r: 50, kind: 'granary', faction: 'harvest', guards: 10 },
  { id: 'east-siding', name: 'East Siding', at: [430, -60], r: 50, kind: 'depot', faction: 'harvest', guards: 7, tanks: 3 },
  { id: 'three-wells', name: 'Three Wells', at: [-260, 240], r: 45, kind: 'village', civilians: 12 },
  { id: 'pump-station', name: 'Pump Station', at: [-330, 395], r: 20, kind: 'pumps', guards: 3 },
  { id: 'salt-pan', name: 'Salt Pan', at: [200, 470], r: 150, kind: 'flat' },
  { id: 'the-cut', name: 'The Cut', at: [150, -300], r: 70, kind: 'mine', faction: 'both', guards: 8 },
  { id: 'observatory', name: 'Observatory', at: [-130, -520], r: 20, kind: 'observatory', guards: 4 },
  { id: 'the-pass', name: 'The Pass', at: [-590, -430], r: 30, kind: 'pass' },
];
export const POSTS = [
  { id: 'p1', at: [90, -80], faction: 'concord', n: 5 }, { id: 'p2', at: [-200, 30], faction: 'concord', n: 5, technical: true },
  { id: 'p3', at: [170, 90], faction: 'harvest', n: 5 }, { id: 'p4', at: [-320, -90], faction: 'concord', n: 4 },
  { id: 'p5', at: [280, -210], faction: 'harvest', n: 5 }, { id: 'p6', at: [300, 390], faction: 'harvest', n: 6 },
];
export const TRIGS = [[-60, -120], [310, 140], [-380, 60], [240, -400], [-20, 360], [-230, -420]];
export const CASES = [[-70, 190], [140, 110], [-300, 300], [330, 20], [60, -250], [-180, -150], [470, -240], [210, 400], [-420, -260], [20, 280], [150, -330], [-130, -490]];
export const RAIL_HALTS = [
  { id: 'west-cutting', name: 'West Cutting', at: [-300, 100] }, { id: 'mile-forty', name: 'Mile Forty', at: [0, 70] },
  { id: 'east-siding', name: 'East Siding', at: [430, -60] }, { id: 'cut-spur', name: 'Cut Spur', at: [150, -260] },
];
