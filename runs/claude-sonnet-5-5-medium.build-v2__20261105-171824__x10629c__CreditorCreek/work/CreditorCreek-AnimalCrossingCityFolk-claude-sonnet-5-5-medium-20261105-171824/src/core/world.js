// The save: one plain JSON object. Systems are functions over it.
import { storage } from './storage.js';
import { initialFeatures } from '../world/townMap.js';
import { CHIME_DEFAULT } from '../audio/composer.js';
export const SAVE_KEY = 'creditor-creek:save:v1';
export const SAVE_V = 2;
export function newWorld(seed = 1) {
  const f = initialFeatures(seed);
  return {
    v: SAVE_V, seed, name: 'Pat', townName: 'Creditor Creek', created: Date.now(), realStamp: Date.now(),
    look: { hair: 'plum', hairStyle: 0, eyes: 0, outfit: 'tee_red', hat: null, glasses: null, umbrella: null, skin: 'sand' }, clockMode: 'village',
    year: 1, day: 1, min: 60, daysPlayed: 0, dayStartedAt: 0, beans: 0, bank: 0, debt: 8000, debtPaid: 0, homeTier: 1, gaveHint: 0,
    tools: [], toolSel: 0, pockets: [], coll: { fish: {}, bug: {}, fossil: {}, art: {} }, donated: {}, owned: {}, friend: {}, talked: {}, memory: [], mailbox: [], flags: {}, stats: { steps: 0, fish: 0, bugs: 0, sold: 0, bonks: 0, soup: 0 },
    town: { trees: f.trees.map(t => ({ ...t })), rocks: f.rocks.map(r => ({ ...r })), flowers: f.flowers.map(x => ({ ...x })), weeds: [], holes: [], cracks: [], items: [], shells: [], buried: [], uid: 1 },
    home: { furn: [{ id: 'cot', x: 1, z: 1, rot: 0 }], wall: 'wall_cream', floor: 'floor_tile' }, outfitOwned: ['tee_red'],
    errands: { done: {}, active: false, finished: false }, chime: CHIME_DEFAULT.slice(), patterns: [], cheese: { wheels: 0, paidAvg: 0, week: 0 }, shop: { lifetime: 0, tier: 0 },
    festivals: {}, contests: {}, movedOut: {}, favours: [], rocco: { state: 'here' }, almanac: { stars: {}, named: {} }, emotes: {}, forgeries: {}, rating: { grade: '-', last: 0 },
    cleanExit: true, exits: 0, pimm: 0, wishes: [], coffee: 0, luck: 0, hybridsMade: 0, snow: [], saves: 0, vesper: { songs: [] },
  };
}
export function migrate(w) {
  if (!w || typeof w !== 'object') return null;
  if (!w.v) w.v = 1;
  if (w.v < 2) { w.pimm ??= 0; w.cleanExit ??= true; w.exits ??= 0; w.v = 2; }
  const base = newWorld(w.seed ?? 1);
  for (const k of Object.keys(base)) if (w[k] === undefined) w[k] = base[k];
  return w;
}
export const hasSave = () => !!storage.get(SAVE_KEY);
export function saveWorld(w) { try { storage.set(SAVE_KEY, JSON.stringify(w)); return true; } catch { return false; } }
export function loadWorld() { const s = storage.get(SAVE_KEY); if (!s) return null; try { return migrate(JSON.parse(s)); } catch { return null; } }
export const clearSave = () => storage.remove(SAVE_KEY);
export const uid = (w) => w.town.uid++;
