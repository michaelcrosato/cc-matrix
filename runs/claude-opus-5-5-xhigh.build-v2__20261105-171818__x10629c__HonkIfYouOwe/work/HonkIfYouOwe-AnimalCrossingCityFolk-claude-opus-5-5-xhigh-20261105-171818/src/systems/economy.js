// Pockets, beans, selling and buying, the debt. Pure-ish: only ever touches world and events.
import { ITEMS, SELLABLE } from '../data/items.js';
import { tuning } from '../dev/tuning.js';
import { remember } from './memory.js';
import { NEIGHBOURS } from '../data/neighbours.js';

export const POCKET_SLOTS = 15;
export const HOME_TIERS = [
  { tier: 1, debt: 8000, name: 'Starter Shack' },
  { tier: 2, debt: 30000, name: 'Proper Cottage' },
  { tier: 3, debt: 80000, name: 'Cottage with Annex' },
  { tier: 4, debt: 150000, name: 'Two Storeys' },
];
export const hasRoom = (w) => w.player.pockets.some((s) => s === null);
/** Add to Pockets. Returns the slot, or -1. A record of who gave it stays with the slot. */
export function addItem(g, id, meta = null) {
  const p = g.world.player.pockets;
  const i = p.indexOf(null);
  if (i < 0) return -1;
  p[i] = meta ? { id, ...meta } : { id };
  if (['furniture', 'clothes', 'hat', 'glasses', 'umbrella', 'wall', 'floor'].includes(ITEMS[id]?.cat)) g.world.player.catalog[id] = true;
  g.events.emit('gotItem', { id, slot: i });
  g.pocketsDirty = true;
  return i;
}
export const slotId = (s) => (s ? s.id : null);
export const countItem = (w, id) => w.player.pockets.filter((s) => s && s.id === id).length;
export function findItem(w, pred) {
  return w.player.pockets.findIndex((s) => s && pred(s, ITEMS[s.id]));
}
export function removeSlot(g, i) { const s = g.world.player.pockets[i]; g.world.player.pockets[i] = null; g.pocketsDirty = true; return s; }
export function addBeans(g, n, reason = '') {
  const w = g.world;
  w.player.beans = Math.max(0, w.player.beans + n);
  if (n > 0) { w.stats.beansEarned += n; }
  g.events.emit('beans', { n, reason });
}
export const sellPrice = (g, slot) => {
  const it = ITEMS[slot.id];
  if (!it) return 0;
  if (it.cat === 'cheese' && slot.id === 'cheese') return Math.round((g.life?.cheesePrice?.() ?? 100) * tuning.sellMult);
  return Math.max(1, Math.round((it.sell ?? 10) * tuning.sellMult));
};
export const buyPrice = (id) => Math.max(1, Math.round((ITEMS[id]?.price ?? 100) * tuning.buyMult));
export function sellSlot(g, i) {
  const w = g.world;
  const slot = w.player.pockets[i];
  if (!slot || !SELLABLE(slot.id)) return 0;
  const it = ITEMS[slot.id];
  const price = sellPrice(g, slot);
  removeSlot(g, i);
  addBeans(g, price, 'sell');
  w.stats.sold[slot.id] = (w.stats.sold[slot.id] ?? 0) + 1;
  w.stats.soldTotal = (w.stats.soldTotal ?? 0) + 1;
  if (slot.from || it.handmade) {
    const from = slot.from ?? it.handmade;
    remember(g, slot.id === 'scarfGift' ? 'soldScarf' : 'soldGift', { item: it.name, about: from });
    w.npcs[from] && (w.npcs[from].friend = Math.max(0, w.npcs[from].friend - 2));
  } else if ((w.stats.soldTotal % 6) === 0) remember(g, 'sold', { item: it.name });
  g.events.emit('sold', { id: slot.id, price });
  return price;
}
export function payDebt(g, amount) {
  const w = g.world;
  const p = w.player;
  const pay = Math.min(amount, p.beans, p.debt);
  if (pay <= 0) return 0;
  p.beans -= pay;
  p.debt -= pay;
  p.debtPaid += pay;
  g.events.emit('debtPaid', { pay, left: p.debt });
  return pay;
}
export const nextTierCost = (w) => { const t = HOME_TIERS.find((x) => x.tier === w.player.homeTier + 1); return t ? Math.round(t.debt * tuning.debtMult) : null; };
/** Take on the next tier. The house changes overnight in the source of these things; here, on signature. */
export function upgradeHome(g) {
  const w = g.world;
  const cost = nextTierCost(w);
  if (cost == null || w.player.debt > 0) return false;
  w.player.homeTier += 1;
  w.player.debt += cost;
  w.player.debtTier = w.player.homeTier;
  g.town?.refreshHome();
  remember(g, 'debtTier', {});
  g.events.emit('homeTier', { tier: w.player.homeTier });
  return true;
}
export function spend(g, n) {
  const w = g.world;
  if (w.player.beans < n) return false;
  w.player.beans -= n;
  w.player.lifeSpend += n;
  const tier = w.player.lifeSpend >= 120000 ? 3 : w.player.lifeSpend >= 25000 ? 2 : 1;
  if (tier > w.store.tier) { w.store.tier = tier; w.flags.storeUpgraded = true; g.town?.refreshStore(); }
  return true;
}
export const giftScore = (npcId, itemId) => {
  const n = NEIGHBOURS[npcId];
  const it = ITEMS[itemId];
  if (!n || !it) return 0;
  if (n.id === 'tavi' || npcId === 'tavi') return 1;
  const tags = new Set([...(it.tags ?? []), it.cat]);
  if (n.hates.some((t) => tags.has(t))) return -1;
  if (n.loves.some((t) => tags.has(t))) return 2;
  return (it.sell ?? 0) > 300 ? 1 : 0;
};
