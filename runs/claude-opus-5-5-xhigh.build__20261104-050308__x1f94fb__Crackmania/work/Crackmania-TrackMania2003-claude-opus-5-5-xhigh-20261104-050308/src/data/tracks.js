// CRACKMANIA content: the 15 race tracks (PLAN §6.3) and the 6 puzzles (§6.4), as turtle programs on the 32 x 32 grid.
// A designer adds a track here (or exports one from the editor's Dev Mode: "Export as content")
export const TRACKS = [
  { id: 'D1', env: 'dustbowl', name: 'Sunburn Strip', start: [3, 5], program: 'ST S2 BO S2 R2 S CP S2 L2 S2 U2 D2 S FN', teaches: 'GAS, STEER, A BOOST, A CHECKPOINT' },
  { id: 'D2', env: 'dustbowl', name: 'Cactus Kicker', start: [2, 4], program: 'ST S3 BO S KI GAP2 LA CP S R1 S2 L2 S2 BO S KI GAP2 LA S FN', teaches: 'JUMPS OVER THE CANYON' },
  { id: 'D3', env: 'dustbowl', name: 'Looping Mesa', start: [2, 3], program: 'ST S2 BO S2 LOOPR S CP S BR2 S2 U2 S2 D2 BR2 S BO S2 FN', teaches: 'THE LOOP, BANKED BENDS' },
  { id: 'D4', env: 'dustbowl', name: 'Rattlesnake Ridge', start: [3, 14], program: 'ST S R1 L1 S CP S U1 S3 R2 BO KI GAP2 DROP1 LA L1 R1 S CP S BO S2 L2 S2 FN', teaches: 'CHICANES AND A JUMP DOWN' },
  { id: 'D5', env: 'dustbowl', name: 'The Big Crack', start: [2, 2], program: 'ST S BO S2 LOOPR S CP S U2 S2 BR2 S BO KI GAP3 LA S CP S BR2 S BO S2 LOOPR S BR2 S2 D2 S CP S2 BL2 S BO S2 FN', teaches: 'TWO LOOPS AND THE CANYON', bigCrack: true },
  { id: 'R1', env: 'hedgerow', name: 'Cabbage Corner', start: [3, 3], program: 'ST S2 R1 DS2 DL1 S2 BU S CP S R2 S2 L1 BU S2 FN', teaches: 'TARMAC, DIRT AND BUMPS' },
  { id: 'R2', env: 'hedgerow', name: 'Hay Fever', start: [2, 10], program: 'ST S U2 S D2 S CP S R2 DS3 U1 D1 S KI GAP1 LA L1 S CP S2 FN', teaches: 'CRESTS THAT THROW YOU', chasmKind: 'water' },
  { id: 'R3', env: 'hedgerow', name: 'Crossroads', start: [7, 10], program: 'ST S2 CR S2 R2 S R2 S2 R1 S2 CP CR S L2 S U2 S D2 FN', teaches: 'A FIGURE EIGHT' },
  { id: 'R4', env: 'hedgerow', name: 'Mill Pond Mile', start: [2, 2], program: 'ST S3 R3 S2 BO S3 L3 S CP S2 R3 BO KI GAP2 LA S R2 S2 CP S3 FN', teaches: 'FAST SWEEPERS, THE MILL POND', chasmKind: 'water' },
  { id: 'R5', env: 'hedgerow', name: 'Tractor Pull', start: [2, 10], program: 'ST S BO S2 U2 S DR2 DS2 DL1 BU S CP S LOOPL S2 R2 S BO KI GAP2 LA S CP R2 S3 D2 S BO S2 CP S2 FN', teaches: 'THE FARM RIDGE AND A LEFT LOOP' },
  { id: 'S1', env: 'frostpeak', name: 'First Flake', start: [3, 4], program: 'ST S2 IS2 S R2 S CP S2 L2 IS2 S2 FN', teaches: 'ICE: LIFT OFF BEFORE THE BEND' },
  { id: 'S2', env: 'frostpeak', name: 'Pine Slalom', start: [2, 6], program: 'ST S2 R1 L1 L1 R1 S2 CP S U2 S2 D2 R2 S CP S2 FN', teaches: 'SLALOM ON SNOW' },
  { id: 'S3', env: 'frostpeak', name: 'Avalanche Drop', start: [2, 6], program: 'ST S U2 S U2 S U2 S CP S R2 S BO KI GAP3 DROP2 LA S CP S BO S2 L2 S2 D1 S FN', teaches: 'CLIMB, THEN A HUGE DROP' },
  { id: 'S4', env: 'frostpeak', name: 'Glacier Loop', start: [2, 4], program: 'ST S2 BO S IS2 LOOPR S CP S BR2 IS2 S BR2 S2 BO S2 FN', teaches: 'A LOOP OFF THE ICE' },
  { id: 'S5', env: 'frostpeak', name: 'Yeti Summit', start: [2, 16], program: 'ST S BO S U2 S U2 S CP S L2 S U2 S2 R2 BO KI GAP2 LA S CP S R2 S2 LOOPR S IS2 D2 S D2 S CP R2 S2 D2 S BO S FN', teaches: 'THE SUMMIT ROAD' }
];
// D5's canyon jump is on level 1: the cells under it are the Big Crack (a canyon too)
export const EXTRA_CHASMS = { D5: 'under-gap' };

export const PUZZLES = [
  { id: 'PD1', env: 'dustbowl', name: 'Missing Bend', fixed: [['ST', 4, 8, 0, 'E'], ['CP', 8, 11, 0, 'S'], ['FN', 11, 14, 0, 'E']], zone: [2, 14, 6, 16, 0, 1], nobuild: [[6, 10, 'rock'], [10, 9, 'rock'], [9, 15, 'rock']], solution: { start: [4, 8], program: 'ST S2 R2 S CP S L2 S FN' }, inventory: { S: 6, R2: 1, L2: 1, R1: 1, L1: 1, BO: 1 } },
  { id: 'PD2', env: 'dustbowl', name: 'Mind the Gap', fixed: [['ST', 3, 6, 0, 'E'], ['CP', 13, 6, 0, 'E'], ['FN', 15, 8, 0, 'S']], zone: [1, 17, 2, 11, 0, 1], canyon: [8, 9, 2, 11], solution: { start: [3, 6], program: 'ST S BO S KI GAP2 LA S CP S R1 S FN' }, inventory: { S: 6, BO: 1, KI: 1, LA: 1, R1: 1, R2: 1 } },
  { id: 'PR1', env: 'hedgerow', name: 'Hedge Maze', fixed: [['ST', 3, 3, 0, 'E'], ['CP', 7, 5, 0, 'E'], ['FN', 11, 7, 0, 'E']], zone: [2, 12, 2, 9, 0, 1], nobuild: [[4, 4, 'hedge'], [4, 5, 'hedge'], [6, 3, 'hedge'], [7, 3, 'hedge'], [8, 3, 'hedge'], [6, 6, 'hedge'], [7, 6, 'hedge'], [7, 7, 'hedge'], [8, 7, 'hedge'], [11, 5, 'hedge'], [11, 6, 'hedge']], solution: { start: [3, 3], program: 'ST S DR1 DS DL1 S CP S R1 S L1 S FN' }, inventory: { S: 7, DS: 2, DR1: 1, DL1: 1, R1: 1, L1: 1, R2: 1 } },
  { id: 'PR2', env: 'hedgerow', name: 'Over and Under', fixed: [['ST', 4, 12, 0, 'E'], ['CP', 4, 14, 0, 'S'], ['FN', 4, 16, 0, 'S']], zone: [2, 10, 6, 18, 0, 2], nobuild: [[7, 14, 'pond'], [8, 14, 'pond']], solution: { start: [4, 12], program: 'ST S2 L2 S L2 S L2 U1 S2 D1 CP S FN' }, inventory: { S: 8, L2: 3, U1: 1, D1: 1, R1: 1, L1: 1 } },
  { id: 'PS1', env: 'frostpeak', name: 'Icy Connect', fixed: [['ST', 3, 5, 0, 'E'], ['CP', 7, 8, 0, 'S'], ['FN', 11, 11, 0, 'E']], zone: [2, 13, 3, 13, 0, 1], nobuild: [[5, 9, 'rock'], [9, 6, 'rock']], solution: { start: [3, 5], program: 'ST S IS R2 S CP S L2 IS S FN' }, inventory: { S: 4, IS: 3, R2: 1, L2: 1, R1: 1, L1: 1 } },
  { id: 'PS2', env: 'frostpeak', name: 'Summit Puzzle', fixed: [['ST', 3, 8, 0, 'E'], ['CP', 11, 8, 2, 'E'], ['FN', 13, 16, 0, 'S']], zone: [2, 15, 6, 18, 0, 3], nobuild: [[8, 12, 'pine'], [10, 14, 'pine']], solution: { start: [3, 8], program: 'ST S U2 S U2 S CP R2 S KI GAP1 DROP2 LA S FN' }, inventory: { S: 6, U2: 2, D2: 2, R2: 1, KI: 1, LA: 1, BO: 1 } }
];
export const SESSION_TRACKS = ['D1', 'D2', 'D3', 'R1', 'R2', 'S1', 'S2'];
export const ENV_TRACKS = { dustbowl: ['D1', 'D2', 'D3', 'D4', 'D5'], hedgerow: ['R1', 'R2', 'R3', 'R4', 'R5'], frostpeak: ['S1', 'S2', 'S3', 'S4', 'S5'] };
