// Content: the 15 race tracks, the 6 puzzles, the three gauntlets. Tracks are turtle programs (src/track.js).
export const TRACKS = [
  { id: 'D1', env: 'dustbowl', name: 'SUNBURN STRIP', start: [3, 5], code: 'ST S2 BO S2 R2 S CP S2 L2 S2 U2 D2 S FN', teaches: 'Gas, steer, a boost, a checkpoint' },
  { id: 'D2', env: 'dustbowl', name: 'CACTUS KICKER', start: [2, 4], code: 'ST S3 BO S KI GAP2 LA CP S R1 S2 L2 S2 BO S KI GAP2 LA S FN', teaches: 'Jumps over chasms' },
  { id: 'D3', env: 'dustbowl', name: 'LOOPING MESA', start: [2, 3], code: 'ST S2 BO S2 LOOPR S CP S BR2 S2 U2 S2 D2 BR2 S BO S2 FN', teaches: 'The loop, banked bends' },
  { id: 'D4', env: 'dustbowl', name: 'RATTLESNAKE RIDGE', start: [3, 14], code: 'ST S R1 L1 S CP S U1 S3 R2 BO KI GAP2 DROP1 LA L1 R1 S CP S BO S2 L2 S2 FN', teaches: 'Chicanes, a jump down' },
  { id: 'D5', env: 'dustbowl', name: 'THE BIG CRACK', start: [2, 2], code: 'ST S BO S2 LOOPR S CP S U2 S2 BR2 S BO KI GAP3 DROP1 LA S CP S BR2 S BO S2 LOOPR S BR2 S2 S2 S CP S2 BL2 S BO S2 FN', canyonGaps: true, teaches: 'Two loops, the canyon jump' },
  { id: 'R1', env: 'hedgerow', name: 'CABBAGE CORNER', start: [3, 3], code: 'ST S2 R1 DS2 DL1 S2 BU S CP S R2 S2 L1 BU S2 FN', teaches: 'Tarmac and dirt, bumps' },
  { id: 'R2', env: 'hedgerow', name: 'HAY FEVER', start: [2, 10], code: 'ST S U2 S D2 S CP S R2 DS3 U1 D1 S KI GAP1 LA L1 S CP S2 FN', gapKind: 'water', teaches: 'Crests that throw you' },
  { id: 'R3', env: 'hedgerow', name: 'CROSSROADS', start: [7, 10], code: 'ST S2 CR S2 R2 S R2 S2 R1 S2 CP CR S L2 S U2 S D2 FN', teaches: 'A figure of eight' },
  { id: 'R4', env: 'hedgerow', name: 'MILL POND MILE', start: [2, 2], code: 'ST S3 R3 S2 BO S3 L3 S CP S2 R3 BO KI GAP2 LA S R2 S2 CP S3 FN', gapKind: 'water', teaches: 'Fast sweepers, the mill pond' },
  { id: 'R5', env: 'hedgerow', name: 'TRACTOR PULL', start: [2, 10], code: 'ST S BO S2 U2 S DR2 DS2 DL1 BU S CP S LOOPL S2 R2 S BO KI GAP2 LA S CP R2 S3 D2 S BO S2 CP S2 FN', teaches: 'Farm ridge, dirt, a left loop' },
  { id: 'S1', env: 'frostpeak', name: 'FIRST FLAKE', start: [3, 4], code: 'ST S2 IS2 S R2 S CP S2 L2 IS2 S2 FN', teaches: 'Ice: lift off before the bend' },
  { id: 'S2', env: 'frostpeak', name: 'PINE SLALOM', start: [2, 6], code: 'ST S2 R1 L1 L1 R1 S2 CP S U2 S2 D2 R2 S CP S2 FN', teaches: 'Slalom, braking points' },
  { id: 'S3', env: 'frostpeak', name: 'AVALANCHE DROP', start: [2, 6], code: 'ST S U2 S U2 S U2 S CP S R2 S BO KI GAP3 DROP2 LA S CP S BO S2 L2 S2 D1 S FN', teaches: 'Climb high, a huge drop' },
  { id: 'S4', env: 'frostpeak', name: 'GLACIER LOOP', start: [2, 4], code: 'ST S2 BO S IS2 LOOPR S CP S BR2 IS2 S BR2 S2 BO S2 FN', teaches: 'A loop off ice' },
  { id: 'S5', env: 'frostpeak', name: 'YETI SUMMIT', start: [2, 16], code: 'ST S BO S U2 S U2 S CP S L2 S U2 S2 R2 BO KI GAP2 DROP1 LA S CP S R2 S2 LOOPR S IS2 D2 S S2 S CP R2 S2 D2 S BO S FN', teaches: 'Summit road, jump, loop, ice' }
];
export const ENV_ORDER = ['dustbowl', 'hedgerow', 'frostpeak'];
export const ENV_INFO = {
  dustbowl: { name: 'DUSTBOWL', tag: 'HOT ASPHALT, BIG AIR', car: 'coyote', accent: '#ff9a2a', mult: 1, prefix: 'D' },
  hedgerow: { name: 'HEDGEROW', tag: 'TIGHT LANES, LOOSE GRAVEL', car: 'pebble', accent: '#6ad04a', mult: 1.25, prefix: 'R' },
  frostpeak: { name: 'FROSTPEAK', tag: 'THIN AIR, THIN ICE', car: 'moose', accent: '#6ad8ff', mult: 1.5, prefix: 'S' }
};
// puzzles: the fixed blocks are the solution's start, checkpoints and finish; zone [x0, x1, y0, y1, l0, l1]
export const PUZZLES = [
  { id: 'PD1', env: 'dustbowl', name: 'MISSING BEND', start: [4, 8], solution: 'ST S2 R2 S CP S L2 S FN', zone: [2, 14, 6, 16, 0, 1], noBuild: [[6, 10, 'rock'], [10, 9, 'rock'], [9, 15, 'rock']], inv: { S: 6, R2: 1, L2: 1, R1: 1, L1: 1, BO: 1 } },
  { id: 'PD2', env: 'dustbowl', name: 'MIND THE GAP', start: [3, 6], solution: 'ST S BO S KI GAP2 LA S CP S R1 S FN', zone: [1, 17, 2, 11, 0, 1], canyon: [8, 9, 2, 11], inv: { S: 6, BO: 1, KI: 1, LA: 1, R1: 1, R2: 1 } },
  { id: 'PR1', env: 'hedgerow', name: 'HEDGE MAZE', start: [3, 3], solution: 'ST S DR1 DS DL1 S CP S R1 S L1 S FN', zone: [2, 12, 2, 9, 0, 1], noBuild: [[4, 4], [4, 5], [6, 3], [7, 3], [8, 3], [6, 6], [7, 6], [7, 7], [8, 7], [11, 5], [11, 6]].map(c => [c[0], c[1], 'hedge']), inv: { S: 7, DS: 2, DR1: 1, DL1: 1, R1: 1, L1: 1, R2: 1 } },
  { id: 'PR2', env: 'hedgerow', name: 'OVER AND UNDER', start: [4, 12], solution: 'ST S2 L2 S L2 S L2 U1 S2 D1 CP S FN', zone: [2, 10, 6, 18, 0, 2], noBuild: [[7, 14, 'pond'], [8, 14, 'pond']], inv: { S: 8, L2: 3, U1: 1, D1: 1, R1: 1, L1: 1 } },
  { id: 'PS1', env: 'frostpeak', name: 'ICY CONNECT', start: [3, 5], solution: 'ST S IS R2 S CP S L2 IS S FN', zone: [2, 13, 3, 13, 0, 1], noBuild: [[5, 9, 'rock'], [9, 6, 'rock']], inv: { S: 4, IS: 3, R2: 1, L2: 1, R1: 1, L1: 1 } },
  { id: 'PS2', env: 'frostpeak', name: 'SUMMIT PUZZLE', start: [3, 8], solution: 'ST S U2 S U2 S CP R2 S KI GAP1 DROP2 LA S FN', zone: [2, 15, 6, 18, 0, 3], noBuild: [[8, 12, 'pine'], [10, 14, 'pine']], inv: { S: 6, U2: 2, D2: 2, R2: 1, KI: 1, LA: 1, BO: 1 } }
];
export const RIVALS = [
  { id: 'tex', name: 'TEX MIRAGE', color: '#ff8a2a', base: .78, seed: 11, voice: 'tex' },
  { id: 'grav', name: 'MLLE GRAVILLON', color: '#9a5ae8', base: .86, seed: 23, voice: 'grav' },
  { id: 'bobo', name: 'BOBO YETI', color: '#f0f4ff', base: .93, seed: 37, voice: 'bobo' }
];
export const RANKS = ['ROOKIE', 'DRIVER', 'RACER', 'PILOT', 'ACE', 'MANIAC', 'CRACKMANIAC'];
export const SESSION_TRACKS = ['D1', 'D2', 'D3', 'R1', 'R2', 'S1', 'S2'];
export const PATTERNS = ['SOLID', 'TWIN STRIPES', 'SIDE STRIPE', 'CHECKER ROOF', 'FLAMES', 'LIGHTNING', 'NUMBER PANEL', 'TWO-TONE'];
export const SWATCHES = ['#e8442a', '#ff8a2a', '#ffd23a', '#9ad83a', '#2aa86a', '#2ad8c8', '#2a7ae8', '#3a3ac8', '#9a5ae8', '#e85ab8', '#f0f0f0', '#a0a0a8',
  '#505058', '#1a1a20', '#8a4a2a', '#d8b878', '#ff6a6a', '#ffb0d0', '#b0e8ff', '#c8ff8a', '#6a2a2a', '#2a4a2a', '#2a2a5a', '#ffe7b0'];
