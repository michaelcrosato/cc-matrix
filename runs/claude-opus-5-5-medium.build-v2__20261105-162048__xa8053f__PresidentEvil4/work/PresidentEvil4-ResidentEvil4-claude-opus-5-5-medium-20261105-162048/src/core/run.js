// Persistent run state: everything that outlives an Area. Plain data, saved as JSON.
import { ITEMS, combineRecipes } from '../data/items.js';
import { WEAPONS, WEAPON_ORDER, weaponStats } from '../data/weapons.js';
import { DIFFICULTY } from '../data/tuning.js';
export function newRun(difficulty = 'standard') {
  const r = { difficulty, chapter: 1, area: 'quay', entry: null, health: 100, maxHealth: 100, dameHp: null, money: 300, weapon: 'pistol', weapons: { pistol: { ammo: 12, tune: {} } }, grid: { w: 10, h: 6 }, items: [], valuables: [], keys: [], notes: [], tannoys: [], rewards: [], flags: {}, seen: {}, areaFlags: {}, rank: 2, deductions: 0, uid: 1,
    stats: { time: 0, shots: 0, hits: 0, heads: 0, kicks: 0, kills: 0, deaths: 0, chapterStart: null, tookDamage: 0 }, chapterBase: { time: 0, shots: 0, hits: 0, heads: 0, kicks: 0 }, sockets: { pearl: false, blackpearl: false, amber: false } };
  place(r, { id: 'pistol' }, 0, 0);
  addItem(r, 'ammo_pistol', 30);
  addItem(r, 'samphire');
  return r;
}
export const diff = (r) => DIFFICULTY[r.difficulty] || DIFFICULTY.standard;
export const fp = (it) => { const d = ITEMS[it.id]; return it.rot ? [d.h, d.w] : [d.w, d.h]; };
function occupied(r, ignore) {
  const g = Array.from({ length: r.grid.h }, () => Array(r.grid.w).fill(false));
  for (const it of r.items) { if (it === ignore) continue; const [w, h] = fp(it); for (let y = it.y; y < it.y + h; y++) for (let x = it.x; x < it.x + w; x++) if (g[y]) g[y][x] = true; }
  return g;
}
export function fits(r, it, x, y, ignore = null) {
  const [w, h] = fp(it); if (x < 0 || y < 0 || x + w > r.grid.w || y + h > r.grid.h) return false;
  const g = occupied(r, ignore); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j][i]) return false; return true;
}
function place(r, it, x, y) { const item = { uid: r.uid++, id: it.id, x, y, rot: !!it.rot, count: it.count ?? 1 }; r.items.push(item); return item; }
export function findSpot(r, id, count = 1) {
  for (const rot of [false, true]) { const t = { id, rot }; for (let y = 0; y < r.grid.h; y++) for (let x = 0; x < r.grid.w; x++) if (fits(r, t, x, y)) return { x, y, rot }; }
  return null;
}
/** Adds to the Case: stacks first, then new cells. Returns what did not fit. */
export function addItem(r, id, count = 1) {
  const d = ITEMS[id]; if (!d) throw new Error(`no item ${id}`);
  if (d.kind === 'treasure') { for (let n = 0; n < count; n++) r.valuables.push(id); return 0; }
  if (d.kind === 'key') { if (!r.keys.includes(id)) r.keys.push(id); return 0; }
  if (d.kind === 'weapon' && !r.weapons[d.weapon]) r.weapons[d.weapon] = { ammo: WEAPONS[d.weapon].mag, tune: {} };
  let left = count;
  if (d.max) for (const it of r.items) if (it.id === id && it.count < d.max) { const n = Math.min(left, d.max - it.count); it.count += n; left -= n; if (!left) return 0; }
  while (left > 0) {
    const s = findSpot(r, id); if (!s) return left;
    const n = d.max ? Math.min(left, d.max) : 1; place(r, { id, rot: s.rot, count: n }, s.x, s.y); left -= n;
  }
  return 0;
}
export function removeItem(r, it) { const i = r.items.indexOf(it); if (i >= 0) r.items.splice(i, 1); }
export function arrange(r) {
  const items = [...r.items].sort((a, b) => { const A = ITEMS[a.id], B = ITEMS[b.id]; return B.w * B.h - A.w * A.h || B.h - A.h || a.uid - b.uid; });
  const copy = r.items; r.items = []; const leftovers = [];
  for (const it of items) {
    let done = false;
    for (const rot of [false, true]) { it.rot = rot; for (let y = 0; y < r.grid.h && !done; y++) for (let x = 0; x < r.grid.w && !done; x++) if (fits(r, it, x, y)) { it.x = x; it.y = y; r.items.push(it); done = true; } if (done) break; }
    if (!done) leftovers.push(it);
  }
  if (leftovers.length) { r.items = copy; return false; }
  return true;
}
export function ammoOf(r, weaponId) { const a = WEAPONS[weaponId].ammo; return r.items.filter((i) => i.id === a).reduce((n, i) => n + i.count, 0); }
export function takeAmmo(r, weaponId, want) {
  const a = WEAPONS[weaponId].ammo; let got = 0;
  for (const it of r.items) if (it.id === a && got < want) { const n = Math.min(it.count, want - got); it.count -= n; got += n; }
  r.items = r.items.filter((i) => !(i.id === a && i.count <= 0));
  return got;
}
export const statsOf = (r, id) => weaponStats(id, r.weapons[id]?.tune);
export const ownedWeapons = (r) => WEAPON_ORDER.filter((w) => r.items.some((i) => i.id === w));
export function count(r, id) { return r.items.filter((i) => i.id === id).reduce((n, i) => n + i.count, 0); }
export function combine(r, a, b) {
  const rec = combineRecipes.find((c) => (c.from[0] === a.id && c.from[1] === b.id) || (c.from[0] === b.id && c.from[1] === a.id));
  if (!rec || a === b) return false;
  removeItem(r, a); removeItem(r, b);
  const out = { id: rec.to }; place(r, { id: rec.to, rot: a.rot }, a.x, a.y); return out;
}
export function combinable(r, a) { return r.items.filter((b) => b !== a && combineRecipes.some((c) => (c.from[0] === a.id && c.from[1] === b.id) || (c.from[0] === b.id && c.from[1] === a.id))); }
/** Use a herb: returns the amount healed or false. */
export function useHerb(r, it) {
  const d = ITEMS[it.id]; if (d.kind !== 'herb' || !d.heal) return false;
  if (d.maxUp) r.maxHealth += d.maxUp;
  r.health = Math.min(r.maxHealth, r.health + d.heal * r.maxHealth); if (r.dameHp != null) r.dameHp = Math.min(100, r.dameHp + d.heal * 100); removeItem(r, it); r.healedAt = (r.healedAt ?? 0) + 1; return true;
}
export function bestHerb(r) { let best = null; for (const it of r.items) { const d = ITEMS[it.id]; if (d.kind === 'herb' && d.heal && (!best || d.heal < ITEMS[best.id].heal === false)) if (!best || d.heal > ITEMS[best.id].heal) best = it; } return best; }
export function socketInto(r, gem) {
  const i = r.valuables.indexOf(gem); if (i < 0 || !r.valuables.includes('reliquary') || r.sockets[gem] === undefined || r.sockets[gem]) return false;
  r.valuables.splice(i, 1); r.sockets[gem] = true; return true;
}
export const reliquaryFull = (r) => r.sockets.pearl && r.sockets.blackpearl && r.sockets.amber;
export function treasureValue(r, id) { if (id === 'reliquary') return reliquaryFull(r) ? ITEMS.reliquary.full : ITEMS.reliquary.value; return ITEMS[id].value; }
export function sellPrice(r, it) {
  const d = ITEMS[it.id]; if (d.kind === 'weapon') return Math.floor(WEAPONS[d.weapon].price / 2) || 100;
  if (d.kind === 'ammo') return Math.ceil(d.price / 2 * it.count / d.gives);
  return d.sell ?? Math.floor((d.price || 100) / 2);
}
export function sellTreasure(r, id) { const i = r.valuables.indexOf(id); if (i < 0) return 0; const v = treasureValue(r, id); r.valuables.splice(i, 1); if (id === 'reliquary') r.sockets = { pearl: false, blackpearl: false, amber: false }; r.money += v; return v; }
