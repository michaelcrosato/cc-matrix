// The simulation root. Plain JavaScript: no THREE, no DOM, no ctx. stepWorld(world, intents) at 60 Hz.
import { Rng, NavGrid } from '../../pixel-engine.js';
import { DIFFICULTIES, makeTuning, F } from '../data/tuning.js';
import { ZONES } from '../data/zones.js';
import { generateZone } from './zonegen.js';
import { recalc } from './stats.js';

export const DT = 1 / 60;

export function emit(w, ev) { w.events.push(ev); }
export function after(w, t, fn) { w.timers.push({ at: w.time + t, fn }); }
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const near = (a, x, z, r) => { const dx = a.x - x; const dz = a.z - z; return dx * dx + dz * dz <= r * r; };

export function createWorld({ seed = 1, mode = 'campaign', tuning = null, difficulty = 0 } = {}) {
  const root = new Rng(seed);
  const w = {
    seed, mode, root, tuning: tuning ?? makeTuning(),
    rngs: { loot: root.fork('loot'), ai: root.fork('ai'), combat: root.fork('combat'), spawn: root.fork('spawn'), quest: root.fork('quest') },
    time: 0, tick: 0, nextId: 1, events: [], timers: [],
    heroes: [], monsters: [], allies: [], props: [], drops: [], fields: [], projectiles: [], obstacles: [], graves: [], telegraphs: [],
    zone: null, zoneCache: new Map(), difficulty, diff: DIFFICULTIES[difficulty], active: [],
    navs: [], requiem: { n: 0, t: 0, xp: 0 }, story: { q: 0, step: 0, flags: {}, lychgates: ['town'], writs: null, writsDone: 0 }, knell: null, boss: null, arena: null,
    objective: null, cheats: { god: false, oneHit: false, noCd: false, infRes: false, noClip: false, invisible: false },
    bestiary: {}, lore: {}, devotion: { xp: 0, level: 0, spent: { core: 0, offence: 0, defence: 0, utility: 0 } }, stash: [[], [], []], unlocks: { penance: false, knell: false },
    bests: {}, paused: false, ended: false, frozen: false, stats: { kills: 0 },
    round: null, wagon: null, tutorial: {}, seen: {},
  };
  return w;
}

export const setDifficulty = (w, i) => { w.difficulty = i; w.diff = DIFFICULTIES[i]; };

export function partyLevel(w) { let L = 1; for (const h of w.heroes) if (!h.left && !h.isPyx) L = Math.max(L, h.level); return L; }
export function monsterLevel(w) { return Math.max(partyLevel(w), w.zone?.spec.levelFloor ?? 1); }
export function playerCount(w) { return Math.max(1, w.heroes.filter((h) => !h.left && !h.isPyx).length); }

// Zones: one active zone for the party. Leaving keeps its state, so returning finds it as it was.
export function enterZone(w, zoneId, at = null, hooks = w.hooks) {
  if (w.zone) w.zoneCache.set(w.zone.id, { zone: w.zone, monsters: w.monsters, props: w.props, drops: w.drops, graves: w.graves, obstacles: w.obstacles });
  const cached = w.zoneCache.get(zoneId);
  w.fields = []; w.projectiles = []; w.telegraphs = []; w.timers = w.timers.filter((t) => t.keep);
  w.allies = w.allies.filter((a) => a.minion);
  w.boss = null; w.arena = null;
  if (cached) { w.zone = cached.zone; w.monsters = cached.monsters; w.props = cached.props; w.drops = cached.drops; w.graves = cached.graves; w.obstacles = cached.obstacles; }
  else {
    w.zone = generateZone(w.root, zoneId);
    w.monsters = []; w.props = []; w.drops = []; w.graves = []; w.obstacles = [];
    w.zone.explored = new Uint8Array(w.zone.w * w.zone.h);
    w.zone.seedRng = w.root.fork(`pop:${zoneId}`);
    hooks?.populate?.(w, w.zone);
  }
  const rebuildNav = w.zone.nav;
  w.navs = [0, 1, 2, 3].map(() => { const n = new NavGrid(rebuildNav.width, rebuildNav.height, { origin: [0, 0, 0] }); n.open.set(rebuildNav.open); return n; });
  const spot = at ?? w.zone.entrance;
  placeParty(w, spot.x, spot.z);
  emit(w, { t: 'zone', id: zoneId, x: spot.x, z: spot.z });
  hooks?.entered?.(w, w.zone, !cached);
}

export function placeParty(w, x, z) {
  w.heroes.forEach((h, i) => {
    const a = (i / Math.max(1, w.heroes.length)) * Math.PI * 2;
    const r = w.heroes.length > 1 ? 1.2 : 0;
    const p = findOpenNear(w, x + Math.cos(a) * r, z + Math.sin(a) * r);
    h.x = p.x; h.z = p.z; h.px = h.x; h.pz = h.z; h.moveDash = null; h.leapT = 0;
  });
  for (const a of w.allies) { a.x = x; a.z = z; a.px = x; a.pz = z; }
}

export function walkable(w, x, z) { return w.zone.nav.walkable(x, z); }
export function findOpenNear(w, x, z, maxR = 8) {
  if (walkable(w, x, z)) return { x, z };
  for (let r = 1; r <= maxR; r++) for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2; const nx = x + Math.cos(a) * r; const nz = z + Math.sin(a) * r;
    if (walkable(w, nx, nz)) return { x: nx, z: nz };
  }
  return { x: w.zone.entrance.x, z: w.zone.entrance.z };
}
// Moves a circle through the grid with sliding. Returns true if it hit a wall.
export function moveCircle(w, e, dx, dz, r = 0.35) {
  const nav = w.zone.nav; let hit = false;
  const clear = (x, z) => nav.walkable(x - r, z - r) && nav.walkable(x + r, z - r) && nav.walkable(x - r, z + r) && nav.walkable(x + r, z + r);
  if (!clear(e.x, e.z) && nav.walkable(e.x, e.z)) { // Embedded in a wall edge (a blink, a knock): ease back to the cell's middle.
    e.x += (Math.floor(e.x) + 0.5 - e.x) * 0.25; e.z += (Math.floor(e.z) + 0.5 - e.z) * 0.25;
  }
  // Blocked head-on? Slide toward the side that clears, so corners and one-wide gaps don't catch you.
  if (dx !== 0) { if (clear(e.x + dx, e.z)) e.x += dx; else { hit = true; const st = Math.min(Math.abs(dx), 0.12); for (const k of [1, -1]) if (clear(e.x + dx, e.z + k * 0.45) && clear(e.x, e.z + k * st)) { e.z += k * st; break; } } }
  if (dz !== 0) { if (clear(e.x, e.z + dz)) e.z += dz; else { hit = true; const st = Math.min(Math.abs(dz), 0.12); for (const k of [1, -1]) if (clear(e.x + k * 0.45, e.z + dz) && clear(e.x + k * st, e.z)) { e.x += k * st; break; } } }
  if (w.arena?.box) { const b = w.arena.box; e.x = Math.max(b.x0 + r, Math.min(b.x1 - r, e.x)); e.z = Math.max(b.z0 + r, Math.min(b.z1 - r, e.z)); }
  for (const o of w.obstacles) { const ox = e.x - o.x; const oz = e.z - o.z; const d = Math.hypot(ox, oz); const m = o.r + r; if (d < m && d > 0.001) { const nx = ox / d; const nz = oz / d; e.x = o.x + nx * m; e.z = o.z + nz * m; const dot = -nz * dx + nx * dz; const st = (dot >= 0 ? 1 : -1) * Math.hypot(dx, dz) * 0.7; e.x += -nz * st; e.z += nx * st; } }
  return hit;
}

export function livingHeroes(w) { return w.heroes.filter((h) => !h.dead && !h.left); }
export function nearestHero(w, x, z, maxR = Infinity, visibleOnly = true) {
  let best = null; let bd = maxR * maxR;
  for (const h of w.heroes) {
    if (h.dead || h.left || (visibleOnly && (h.unseen > 0 || (w.cheats.invisible && !h.isPyx)))) continue;
    const dx = h.x - x; const dz = h.z - z; const d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
export const addXpHook = null;

export { F, ZONES, recalc };
