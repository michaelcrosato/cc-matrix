// All areas, in play order, plus teleport beats for dev mode.
import { quay } from './quay.js';
import { roadDef } from './road.js';
import { cannery } from './cannery.js';
import { yard } from './yard.js';
import { causeway } from './causeway.js';
import { abbey } from './abbey.js';
import { nave } from './nave.js';
export const launchDef = { id: 'launch', name: 'THE LAUNCH', chapter: 3, launch: true };
export const LEVELS = [quay, roadDef, cannery, yard, causeway, abbey, nave, launchDef];
export const BEATS = [
  { label: 'QUAY: ARRIVAL', level: quay, entry: null },
  { label: 'QUAY: THE SQUARE', level: quay, entry: { x: -1.5, z: 10 } },
  { label: 'ROAD: THE BRIDGE', level: roadDef, entry: { x: 0, z: 0 } },
  { label: 'CANNERY: THE HALL', level: cannery, entry: null },
  { label: 'YARD: THE BOSUN', level: yard, entry: { x: 0, z: -8 } },
  { label: 'CAUSEWAY: THE TIDE', level: causeway, entry: null },
  { label: 'ABBEY: THE LAMPS', level: abbey, entry: null },
  { label: 'NAVE: THE BATHYSPHERE', level: nave, entry: null },
  { label: 'LAUNCH: THE ESCAPE', level: launchDef, entry: null },
];
export const byId = (id) => LEVELS.find((l) => l.id === id);
