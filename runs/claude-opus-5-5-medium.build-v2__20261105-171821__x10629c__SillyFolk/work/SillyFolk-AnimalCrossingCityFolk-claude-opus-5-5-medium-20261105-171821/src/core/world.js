// The save is one plain JSON object. Pure helpers over it; nothing here touches the page.
import { rngOf, clamp } from './util.js';
import { TOWN_ROWS } from '../data/townMap.js';
import { ITEMS } from '../data/items.js';
import { TREE_ZONES, BUILDINGS, LANDMARK, LAMPS, BENCHES } from '../world/layout.js';
import { T } from '../dev/tuning.js';
import { NEIGHBOURS } from '../data/cast.js';
import { dayInfo } from './calendar.js';
export const SAVE_V = 2;
export const DEFAULT_CHIME = [12, 0, 14, 0, 16, 0, 19, 0, 16, 0, 14, 0, 12, 0, 0, 0];
export function newWorld(o = {}) {
  const seed = o.seed ?? 'silly';
  const w = { v: SAVE_V, seed, name: o.name ?? 'Nobody', town: o.town ?? 'Nowhere',
    clock: { mode: o.clockMode ?? 'village', day: 1, minute: 8 * 60, speedHalf: true, frozen: false },
    p: { x: LANDMARK.busStop[0], z: LANDMARK.busStop[1] + 1, place: 'town', facing: Math.PI, beans: 0, debt: 0, tier: 0, paidTotal: 0, spent: 0, pockets: Array(15).fill(null), tools: [], tool: null, look: { hair: 0, hairColor: 'orange', eyes: 0, shirt: 's_apron', hat: null, glasses: null, umbrella: 'u_sand', pattern: null }, emotes: [], buffs: {}, puffy: false, records: [], plumes: 0, bestGrade: null, jar: 0, patterns: Array(8).fill(null), bestFish: null, wears: {} },
    chime: DEFAULT_CHIME.slice(), ents: {}, nextEnt: 1, wear: {}, worn: {},
    npcs: {}, museum: { fish: {}, bug: {}, fossil: {}, art: {} }, almanac: { seen: {}, stars: {} },
    home: { rooms: { home: { furn: [{ id: 'c_bed', x: 1, z: 1, rot: 0 }, { id: 'box', x: 4, z: 1, rot: 0 }], wall: null, floor: null } }, stereo: null, lampsOff: {}, tank: null, cage: null },
    mail: [], mailQueue: [], catalog: {}, lost: [{ id: 'shell_scallop' }, { id: 's_lime' }], shop: { day: 0, stock: [] }, cheese: { pattern: null, season: -1, base: 100, held: 0 },
    memory: [], flags: {}, stats: { talked: {}, sold: 0, caught: {}, biggest: null, soldTo: {}, gifts: 0, letters: 0, weedsPulled: 0, wished: 0, days: 1 }, day1: { step: 0, parcel: false, weed: false, soldWeed: false, bug: false, fish: false, dig: false, water: false, letter: false, done: false }, favours: [], contest: null, festival: null, wishes: [], consign: [], fashion: { day: 0, score: 0 }, lastReal: o.now ?? 0, patternsUsed: {}, rating: null, year: 1, gotGold: false };
  for (const n of NEIGHBOURS) w.npcs[n] = { friend: 0, lastTalk: 0, x: 0, z: 0, place: 'town', moved: n === 'fitch' ? 'notyet' : null, lines: {}, memSeen: {} };
  gen(w);
  return w;
}
const key = (x, z) => x + ',' + z;
export function isFree(w, tx, tz, wide = 1) {
  const c = TOWN_ROWS[tz]?.[tx]; if (!c || !'.suU'.includes(c) || c === 'U') return false;
  for (const b of BUILDINGS) if (tx + 0.5 > b.x - b.w / 2 - wide && tx + 0.5 < b.x + b.w / 2 + wide && tz + 0.5 > b.z - b.d / 2 - wide && tz + 0.5 < b.door[1] + wide + 0.6) return false;
  for (const [x, z] of [LANDMARK.busStop, LANDMARK.busShelter, LANDMARK.oldPear, LANDMARK.bell, LANDMARK.notice, LANDMARK.mailbox, LANDMARK.lighthouse, LANDMARK.lookout, ...LAMPS]) if (Math.hypot(tx + 0.5 - x, tz + 0.5 - z) < wide + 1.2) return false;
  return !w.ents[entKey(w, tx, tz)];
}
export function entKey(w, tx, tz) { return w.grid?.get(key(tx, tz)); }
export function addEnt(w, e) { const id = 'e' + w.nextEnt++; e.id = id; w.ents[id] = e; w.grid ??= new Map(); w.grid.set(key(Math.floor(e.x), Math.floor(e.z)), id); w.dirty = true; return e; }
export function removeEnt(w, e) { delete w.ents[e.id]; if (w.grid?.get(key(Math.floor(e.x), Math.floor(e.z))) === e.id) w.grid.delete(key(Math.floor(e.x), Math.floor(e.z))); w.dirty = true; }
export const entAt = (w, tx, tz) => { const id = w.grid?.get(key(tx, tz)); return id ? w.ents[id] : null; };
export const rebuildGrid = (w) => { w.grid = new Map(); for (const e of Object.values(w.ents)) w.grid.set(key(Math.floor(e.x), Math.floor(e.z)), e.id); };
function gen(w) {
  const r = rngOf(w.seed + ':gen');
  for (const z of TREE_ZONES) for (let i = 0, tries = 0; i < z.n && tries < 200; tries++) { const tx = r.int(z.x0, z.x1), tz = r.int(z.z0, z.z1); if (!isFree(w, tx, tz, 0.5) || anyNear(w, tx, tz, 2)) continue; addEnt(w, { t: 'tree', kind: z.kind, x: tx + 0.5, z: tz + 0.5, hits: 0, fruit: z.kind === 'pear' ? 3 : 0, regrow: 0 }); i++; }
  for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) { const tx = r.int(3, 76), tz = r.int(3, 47); if (!isFree(w, tx, tz, 0.5) || anyNear(w, tx, tz, 3)) continue; addEnt(w, { t: 'rock', x: tx + 0.5, z: tz + 0.5, pay: 0 }); i++; }
  // flowers around homes
  const species = ['tulip', 'daisy', 'cosmos', 'bluebell'];
  for (const b of BUILDINGS) { if (b.id === 'store' || b.id === 'museum' || b.id === 'home') continue; const sp = r.pick(species); const cols = ['red', 'white', 'sand', 'plum', 'blue', 'sky', 'orange']; for (const [dx, dz] of [[-3, 2], [-3, 3], [-2, 3], [3, 2], [3, 3], [2, 3]]) { const tx = Math.floor(b.x + dx), tz = Math.floor(b.z + dz); if (isFree(w, tx, tz, 0) && r.chance(0.7)) addEnt(w, { t: 'flower', sp, c: firstColor(sp, r), x: tx + 0.5, z: tz + 0.5, dry: 0, wet: 0 }); } }
  for (let i = 0; i < 8; i++) { const tx = r.int(3, 75), tz = r.int(50, 55); if (isFree(w, tx, tz, 0)) addEnt(w, { t: 'shell', it: r.pick(['shell_clam', 'shell_scallop', 'drift_wood']), x: tx + 0.5, z: tz + 0.5 }); }
  // the crack on the plaza for Day One
  addEnt(w, { t: 'crack', real: 'trilobite', x: 26.5, z: 41.5, first: true });
  // the Mayor's sapling on the green, weeds near your plot
  addEnt(w, { t: 'sapling', x: 31.5, z: 36.5, age: 0, mayor: true, wet: 0, kind: 'pear' });
  for (const [x, z] of [[71, 41], [73, 41], [75, 40]]) addEnt(w, { t: 'weed', x: x + 0.5, z: z + 0.5, first: true });
}
const firstColor = (sp, r) => ({ tulip: ['red', 'sand', 'white'], daisy: ['white', 'sand'], cosmos: ['plum', 'white'], bluebell: ['blue', 'white'] }[sp])[r.int(0, 1)];
const anyNear = (w, tx, tz, d) => { for (const e of Object.values(w.ents)) if (Math.abs(e.x - tx - 0.5) < d && Math.abs(e.z - tz - 0.5) < d) return true; return false; };
export const season = (w, now) => dayInfo(w.clock, now ?? nowOf(w)).season;
export const nowOf = (w) => (w.clock.mode === 'real' && w.clock.realNow ? new Date(w.clock.realNow) : null);
export const info = (w) => dayInfo(w.clock, nowOf(w));
// ---- pockets
export const pocketFree = (w) => w.p.pockets.indexOf(null);
export const pocketCount = (w) => w.p.pockets.filter(Boolean).length;
export function giveItem(w, entry) { const i = pocketFree(w); if (i < 0) return false; w.p.pockets[i] = typeof entry === 'string' ? { id: entry } : entry; const it = ITEMS[w.p.pockets[i].id]; if (it && !['tool', 'quest', 'junk'].includes(it.cat)) w.catalog[it.id] = true; return true; }
export const hasItem = (w, id) => w.p.pockets.findIndex((e) => e && e.id === id);
export function takeItem(w, id) { const i = hasItem(w, id); if (i < 0) return null; const e = w.p.pockets[i]; w.p.pockets[i] = null; return e; }
export function remember(w, k, data = {}) { w.memory.push({ k, day: w.clock.day, ...data }); if (w.memory.length > 60) w.memory.shift(); }
export function earn(w, n) { w.p.beans = Math.max(0, Math.round(w.p.beans + n)); }
export const friendGain = (w, n, amt) => { const s = w.npcs[n]; if (s) s.friend = clamp(s.friend + amt * T.friend * (w.p.buffs.luckFriends ? 1.5 : 1), 0, 100); };
export const friendTier = (f) => (f >= 75 ? 'best friend' : f >= 40 ? 'friend' : f >= 12 ? 'acquaintance' : 'stranger');
export const debtTotalFor = (tier) => [8000, 30000, 80000, 150000][tier] ?? 0;
export function addLetter(w, l, when = null) { w.mailQueue.push({ ...l, at: when ?? w.clock.day + 1 }); }
export const unreadMail = (w) => w.mail.filter((m) => !m.read).length;
export const museumCount = (w) => Object.keys(w.museum.fish).length + Object.keys(w.museum.bug).length + Object.keys(w.museum.fossil).length + Object.keys(w.museum.art).length;
export const fingerprintOf = (w) => `${w.clock.day}|${Math.floor(w.clock.minute)}|${w.p.x.toFixed(3)}|${w.p.z.toFixed(3)}|${w.p.beans}|${w.p.debt}|${museumCount(w)}|${Object.keys(w.ents).length}`;
