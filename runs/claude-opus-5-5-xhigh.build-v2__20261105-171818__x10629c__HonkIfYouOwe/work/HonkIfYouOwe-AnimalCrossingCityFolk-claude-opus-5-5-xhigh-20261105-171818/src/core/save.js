// The world: one plain JSON object is the save. Migrations by version.
import { store } from './storage.js';
import { BUILDINGS } from '../data/town.js';
import { startObjects } from '../world/startObjects.js';

export const SAVE_KEY = 'honk:save';
export const SESSION_KEY = 'honk:session';
export const SAVE_VERSION = 3;
export const NEIGHBOUR_IDS = ['dorrit', 'tavi', 'bartleby', 'ottoline', 'rocco', 'nib', 'ozzie', 'yolanda', 'fitch'];

export function newWorld(seed = 1, { mode = 'village', demo = false } = {}) {
  const npcs = {};
  for (const id of NEIGHBOUR_IDS) npcs[id] = { friend: id === 'fitch' ? 0 : 5, talkedDay: 0, lastTalkAt: null, moved: id === 'fitch' ? 'notYet' : 'here', favour: null, seenLines: {}, greeted: false, giftsToday: 0, stung: 0, memoryIdx: 0, absentNote: false };
  return {
    v: SAVE_VERSION,
    seed,
    demo,
    clock: { mode, day: 1, year: 1, minute: 22 * 60, realMs: null, lastRealMs: null, daysPlayed: 1, newDayStamp: 0 },
    player: {
      name: 'You', town: 'Nowhere', look: { hair: 0, hairColor: 'plum', eyes: 0, skin: 'sand', shirt: 'slate', trim: 'mist', outfit: 'tatteredShirt', hat: null, hatItem: null, glasses: null, glassesItem: null, umbrella: null, pattern: null },
      x: 8.5, z: 29.5, place: 'town', facing: 0,
      beans: 200, debt: 8000, debtPaid: 0, debtTier: 1, homeTier: 1, lifeSpend: 0, jar: 0,
      pockets: Array(15).fill(null), tools: [], tool: null, puffy: false, buffUntil: 0, luck: null,
      emotes: ['shrug'], catalog: {}, plumes: 0, fashionDay: 0, fortuneDay: 0, gagJump: false,
      deliveredWishes: 0, pattern: 0,
    },
    town: { objects: startObjects(seed), worn: {}, wear: {}, patterns: {}, snowfall: 0, bellGold: false, lostFound: ['boxes'], cracksDay: 0, footprints: [] },
    home: {
      rooms: { main: { wall: 'wall-plaster', floor: 'floor-oak', items: [{ id: 'cottageBed', x: 0, z: 0, rot: 0, on: true }, { id: 'boxes', x: 5, z: 0, rot: 0, on: true }] }, annex: { wall: 'wall-cream', floor: 'floor-pine', items: [] }, upstairs: { wall: 'wall-sea', floor: 'floor-ash', items: [] } },
      wallColor: 'orange', roofColor: 'slate', dust: [], stereo: null, tankFish: {}, cageBugs: {}, lastGrade: null, bestGrade: null, plaque: false, deedGold: false,
    },
    store: { tier: 1 },
    npcs,
    museum: { fish: {}, bug: {}, fossil: {}, art: {}, plaques: {}, open: false },
    almanac: { fish: {}, bug: {}, fossil: {}, art: {}, stars: {}, starNames: {}, flowers: {} },
    mail: { inbox: [], pending: [], sentToday: 0, read: 0 },
    memory: [],
    stats: { caught: 0, bugs: 0, fish: 0, biggest: null, biggestBeans: 0, sold: {}, talks: {}, beansEarned: 0, days: 1, sleeps: 0, weeds: 0, netBonks: 0, walked: 0, wishes: 0, soupRating: null, contestsWon: 0, favoursDone: 0 },
    flags: {},
    story: { day1Active: false, errands: {}, stage: 'new', roccoArgue: null, gaveMayorSapling: false },
    patterns: Array(8).fill(null),
    chime: [0, 2, 4, 7, 4, 2, 0, -1, 0, 2, 4, 5, 7, 5, 4, -1],
    records: [],
    constellations: {},
    cheese: { day: 0, pattern: null, priceBuy: 100, owned: 0, boughtFor: 0, buyDay: 0 },
    festivals: {},
    contests: {},
    pimm: { visits: 0, cleanExit: true },
    meta: { lastSeenMs: null, firstSeenMs: null, exitedClean: true, absenceHandledMs: null },
  };
}

const MIGRATIONS = {
  1: (w) => { w.pimm ??= { visits: 0, cleanExit: true }; w.v = 2; return w; },
  2: (w) => { w.almanac.starNames ??= {}; w.v = 3; return w; },
};
export function migrate(w) {
  let guard = 0;
  while (w.v < SAVE_VERSION && guard++ < 50) {
    const m = MIGRATIONS[w.v];
    if (!m) throw new Error(`no migration from v${w.v}`);
    w = m(w);
  }
  return w;
}
export function saveWorld(w, key = SAVE_KEY) { store.set(key, w); }
export function loadWorld(key = SAVE_KEY) {
  const w = store.get(key);
  if (!w) return null;
  try { return migrate(w); } catch { return null; }
}
export const hasSave = (key = SAVE_KEY) => store.has(key);
export const clearSave = (key = SAVE_KEY) => store.remove(key);
export { BUILDINGS };
