// Town services as pure functions on a hero and the shared account: buy, sell, salvage, craft, reforge, extract, socket, merge, stash, devotion.
import { MATERIALS, SALVAGE, CRAFT_COST, REFORGE_COST, CASKET_COST, SLOTS, RARITIES, LEGENDARIES, AFFIXES, GEMS } from '../data/items.js';
import { CLASSES } from '../data/classes.js';
import { makeItem, rollDrop, salvageOf, sellPrice, buyPrice, pickAffixes } from './items.js';
import { refreshStats, ev } from './core.js';
import { Rng } from '../../pixel-engine.js';

export const newAccount = () => ({ stash: [[], [], []], devotion: { core: 0, offence: 0, defence: 0, utility: 0, xp: 0, level: 0 }, bests: {}, unlocks: {}, grandKeys: 0, codex: { bestiary: {}, lore: {}, seen: {} }, writsDone: 0, keys: 0 });
export const devotionCost = (n) => 15000 + 1500 * n;
export function devotionPoints(a) { const d = a.devotion; return d.level - (d.core + d.offence + d.defence + d.utility); }
export function addDevotionXp(w, xp) {
  const a = w.acct; if (!a) return; const d = a.devotion; d.xp += xp;
  while (d.xp >= devotionCost(d.level)) { d.xp -= devotionCost(d.level); d.level++; ev(w, { t: 'banner', text: 'DEVOTION LEVEL ' + d.level, small: true }); }
  w.devotionLvl = d.level;
}
export function spendDevotion(w, h, track) {
  const a = w.acct; if (devotionPoints(a) <= 0) return false; a.devotion[track]++; for (const x of w.heroes) refreshStats(w, x); return true;
}

export function stockFor(w, h, key = 0) {
  const r = new Rng((w.seed * 31 + h.level * 977 + key * 13) | 0).fork('stock');
  const out = [];
  for (let i = 0; i < 6; i++) {
    const it = rollDrop(r, { ilvl: Math.min(30, Math.max(1, h.level)), cls: h.cls, forceRarity: i < 3 ? 'blessed' : i < 5 ? 'reliquary' : 'common' });
    if (it.rarity === 'legendary') { it.rarity = 'reliquary'; delete it.power; }
    out.push(it);
  }
  return out;
}
export function buy(w, h, it) {
  const p = buyPrice(it); if (h.gold < p) return 'GOLD'; if (h.inv.length >= 40) return 'FULL';
  h.gold -= p; const c = { ...it, uid: it.uid + 100000 + h.inv.length, affixes: it.affixes.map((a) => ({ ...a })) }; h.inv.push(c); ev(w, { t: 'sfx', name: 'coin' }); return null;
}
export function sell(w, h, uid) { const i = h.inv.findIndex((x) => x.uid === uid); if (i < 0) return false; h.gold += sellPrice(h.inv[i]); h.inv.splice(i, 1); ev(w, { t: 'sfx', name: 'coin' }); return true; }
export function casket(w, h, slot) {
  if (h.mats.shards < CASKET_COST) return 'SHARDS'; if (h.inv.length >= 40) return 'FULL';
  h.mats.shards -= CASKET_COST; const r = w.lootRng;
  const it = rollDrop(r, { ilvl: Math.min(30, h.level), cls: h.cls, elite: true, legMult: 6, tuningLeg: w.tuning.legendaryChance, minRarity: 'reliquary' });
  if (slot && it.rarity !== 'legendary') { const n = makeItem(r, { slot, rarity: it.rarity, ilvl: it.ilvl, cls: h.cls }); h.inv.push(n); return n; }
  h.inv.push(it); return it;
}
export function salvage(w, h, uid) {
  const i = h.inv.findIndex((x) => x.uid === uid); if (i < 0) return false; const [m, n] = salvageOf(h.inv[i]); h.mats[m] = (h.mats[m] || 0) + n; h.inv.splice(i, 1); ev(w, { t: 'sfx', name: 'salvage' }); return [m, n];
}
export function canAfford(h, cost) { return Object.entries(cost).every(([k, v]) => (h.mats[k] || 0) >= v); }
export function craft(w, h, slot, rarity) {
  const cost = CRAFT_COST[rarity]; if (!cost) return 'NO'; if (!canAfford(h, cost)) return 'MATERIALS'; if (h.inv.length >= 40) return 'FULL';
  for (const [k, v] of Object.entries(cost)) h.mats[k] -= v;
  const it = makeItem(w.lootRng, { slot, rarity: rarity === 'legendary' ? 'legendary' : rarity, ilvl: Math.min(30, h.level), cls: h.cls, legendary: rarity === 'legendary' ? pickLegendary(w, h, slot) : undefined });
  h.inv.push(it); ev(w, { t: 'sfx', name: 'forge' }); return it;
}
function pickLegendary(w, h, slot) { const pool = Object.keys(LEGENDARIES).filter((k) => LEGENDARIES[k].slot === slot && (!LEGENDARIES[k].cls || LEGENDARIES[k].cls === h.cls)); return pool.length ? pool[w.rng.int(0, pool.length - 1)] : undefined; }
export function reforge(w, h, uid, idx) {
  const it = h.inv.find((x) => x.uid === uid) || Object.values(h.gear).find((x) => x && x.uid === uid); if (!it || !it.affixes[idx]) return 'NO';
  if (!canAfford(h, REFORGE_COST)) return 'MATERIALS';
  for (const [k, v] of Object.entries(REFORGE_COST)) h.mats[k] -= v;
  const keys = pickAffixes(w.lootRng, it.slot, 1, it.affixes.map((a) => a.k)); if (!keys.length) return 'NO';
  const t = Math.min(1, (it.ilvl - 1) / 29), a = AFFIXES[keys[0]]; it.affixes[idx] = { k: keys[0], v: Math.max(1, Math.round((a.lo + (a.hi - a.lo) * t) * w.lootRng.range(0.8, 1.1))) };
  refreshStats(w, h); ev(w, { t: 'sfx', name: 'forge' }); return null;
}
const RELIC_SLOT = (slot) => (slot === 'main' || slot === 'off' ? 0 : slot === 'amulet' || slot === 'ring' ? 2 : 1);
export function extract(w, h, uid) {
  const i = h.inv.findIndex((x) => x.uid === uid); const it = h.inv[i]; if (!it || !it.power) return 'NO';
  const s = RELIC_SLOT(it.slot); h.reliquary[s] = it.power; h.inv.splice(i, 1); refreshStats(w, h); ev(w, { t: 'sfx', name: 'bell_bright' }); return s;
}
export function socket(w, h, uid, gemIdx) {
  const it = h.inv.find((x) => x.uid === uid) || Object.values(h.gear).find((x) => x && x.uid === uid); const g = h.gems[gemIdx];
  if (!it || !g) return 'NO'; if (!it.sockets) return 'NO SOCKET'; if (it.gems.length >= it.sockets) return 'FULL';
  it.gems.push(g); h.gems.splice(gemIdx, 1); refreshStats(w, h); ev(w, { t: 'sfx', name: 'equip' }); return null;
}
export function addSocket(w, h, uid) { const it = h.inv.find((x) => x.uid === uid) || Object.values(h.gear).find((x) => x && x.uid === uid); if (!it || it.sockets >= 2 || !canAfford(h, { dust: 4 })) return 'NO'; h.mats.dust -= 4; it.sockets++; return null; }
export function mergeGems(w, h, kind, tier) {
  if (tier >= 2) return 'MAX'; const idx = h.gems.map((g, i) => (g.kind === kind && g.tier === tier ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 3) return 'NEED 3'; for (const i of idx.slice(0, 3).reverse()) h.gems.splice(i, 1); h.gems.push({ kind, tier: tier + 1 }); ev(w, { t: 'sfx', name: 'forge' }); return null;
}
export function toStash(w, h, uid, tab) { const a = w.acct; const i = h.inv.findIndex((x) => x.uid === uid); if (i < 0 || a.stash[tab].length >= 30) return false; a.stash[tab].push(h.inv[i]); h.inv.splice(i, 1); return true; }
export function fromStash(w, h, tab, idx) { const a = w.acct; if (h.inv.length >= 40 || !a.stash[tab][idx]) return false; h.inv.push(a.stash[tab][idx]); a.stash[tab].splice(idx, 1); return true; }
export function dropItemFromInv(h, uid) { const i = h.inv.findIndex((x) => x.uid === uid); if (i >= 0) h.inv.splice(i, 1); return i >= 0; }

// Writs: three jobs from the Crier's board
export function rollWrits(w) {
  const r = w.rng; const kinds = [{ id: 'kill', text: 'SMASH 60 MONSTERS', n: 60 }, { id: 'elite', text: 'FELL 4 ELITES', n: 4 }, { id: 'coffin', text: 'OPEN AN UNQUIET COFFIN', n: 1 }, { id: 'boss', text: 'SLAY A BOSS', n: 1 }, { id: 'gold', text: 'GATHER 500 GOLD', n: 500 }, { id: 'plate', text: 'CATCH A COLLECTION PLATE', n: 1 }];
  const pool = [...kinds]; const out = [];
  for (let i = 0; i < 3; i++) { const k = pool.splice(r.int(0, pool.length - 1), 1)[0]; out.push({ ...k, have: 0, done: false }); }
  return out;
}
export function writEvent(w, e) {
  const c = w.camp; if (!c || !c.writs || !c.writs.length) return; let any = false;
  for (const wr of c.writs) {
    if (wr.done) continue;
    if (wr.id === 'kill' && e.t === 'kill' && !e.minion) wr.have++;
    else if (wr.id === 'elite' && e.t === 'kill' && e.elite) wr.have++;
    else if (wr.id === 'coffin' && e.t === 'coffinDone') wr.have++;
    else if (wr.id === 'boss' && e.t === 'bossDead') wr.have++;
    else if (wr.id === 'gold' && e.t === 'gold') wr.have += e.v;
    else if (wr.id === 'plate' && e.t === 'kill' && e.type === 'collection_plate') wr.have++;
    if (wr.have >= wr.n) { wr.done = true; any = true; ev(w, { t: 'toast', seat: 0, text: 'WRIT COMPLETE: ' + wr.text }); }
  }
  if (any && c.writs.every((x) => x.done) && !c.writsPaid) { c.writsPaid = true; ev(w, { t: 'writsDone' }); }
}
export function claimWrits(w, h) {
  const c = w.camp; if (!c || !c.writsPaid) return false;
  const it = rollDrop(w.lootRng, { ilvl: Math.min(30, h.level), cls: h.cls, forceRarity: 'reliquary' }); h.inv.push(it); h.gold += 300 + h.level * 40; h.mats.shards += 2;
  c.writs = rollWrits(w); c.writsPaid = false; if (w.acct) w.acct.writsDone++; return true;
}
