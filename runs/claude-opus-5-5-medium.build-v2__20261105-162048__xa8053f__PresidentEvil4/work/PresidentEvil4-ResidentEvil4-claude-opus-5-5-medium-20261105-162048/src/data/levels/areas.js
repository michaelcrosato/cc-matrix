// Areas as data: map, theme, mood, props, beats. A new chapter is a new entry here. See docs/CONTENT.md.
import { QUAY } from './quay.js';
import { ROAD, CANNERY, YARD } from './chapter2.js';
import { CAUSEWAY, ABBEY, NAVE, LAUNCH } from './chapter3.js';
export const AREAS = { quay: QUAY, road: ROAD, cannery: CANNERY, yard: YARD, causeway: CAUSEWAY, abbey: ABBEY, nave: NAVE, launch: LAUNCH, shift: { map: 'quay', mood: 'rain', title: 'NIGHT SHIFT', music: 'siege', loft: { map: 'loft', col: 22, row: 4 }, loops: ['rain'] } };
// Tannoys count up across areas: 15 in all.
export const TANNOY_INDEX = { quay: 0, road: 6, cannery: 8, yard: 10, causeway: 11, abbey: 12, nave: 14 };
export const CHAPTER_OF = { quay: 1, road: 2, cannery: 2, yard: 2, causeway: 3, abbey: 3, nave: 3, launch: 4 };
export const TELEPORTS = [
  { label: 'CLAIM 1: PIER, ARRIVAL', area: 'quay' }, { label: 'CLAIM 1: FIRST COTTAGE', area: 'quay', jump: 'cottage' }, { label: 'CLAIM 1: THE SQUARE, BEFORE THE SIEGE', area: 'quay', jump: 'presiege' }, { label: 'CLAIM 1: THE SIEGE', area: 'quay', jump: 'siege' }, { label: 'CLAIM 1: THE FOGHORN', area: 'quay', jump: 'foghorn' }, { label: 'CLAIM 1: AFTERMATH', area: 'quay', jump: 'aftermath' },
  { label: 'CLAIM 2: SALT ROAD', area: 'road' }, { label: 'CLAIM 2: THE BRIDGE', area: 'road', jump: 'bridge' }, { label: 'CLAIM 2: THE HALL', area: 'cannery' }, { label: 'CLAIM 2: THE FLENSER AGAIN', area: 'cannery', jump: 'flenser' }, { label: 'CLAIM 2: COLD ROOM', area: 'cannery', jump: 'cold' }, { label: 'CLAIM 2: BOOST', area: 'cannery', jump: 'boost' }, { label: 'CLAIM 2: HOLD THE WINCH', area: 'cannery', jump: 'winch' }, { label: 'CLAIM 2: THE BELT', area: 'cannery', jump: 'belt' }, { label: 'CLAIM 2: THE BOSUN', area: 'yard' },
  { label: 'CLAIM 3: THE CAUSEWAY', area: 'causeway' }, { label: 'CLAIM 3: THE ABBEY', area: 'abbey' }, { label: 'CLAIM 3: LENS PUZZLE', area: 'abbey', jump: 'lens' }, { label: 'CLAIM 3: THE CRYPT', area: 'abbey', jump: 'crypt' }, { label: 'CLAIM 3: ARMOURY', area: 'abbey', jump: 'armoury' }, { label: 'FINAL: THE BATHYSPHERE', area: 'nave' }, { label: 'FINAL: THE HATCH', area: 'nave', jump: 'hatch' }, { label: 'FINAL: THE MOTHER', area: 'nave', jump: 'mother' }, { label: 'FINAL: THE LAUNCH', area: 'launch' }, { label: 'FINAL: THE ENDING', area: 'launch', jump: 'ending' },
];
