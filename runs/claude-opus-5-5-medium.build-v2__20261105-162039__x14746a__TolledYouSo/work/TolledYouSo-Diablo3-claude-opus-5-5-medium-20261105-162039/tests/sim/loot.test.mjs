import { ok, eq, guarded } from '../lib.mjs';
import { CLASS_IDS } from '../../src/data/classes.js';
import { AFFIXES, GEMS, RARITIES, SLOTS } from '../../src/data/items.js';
import { F } from '../../src/data/tuning.js';
import { newWorld, addHero, applyCommand, stepWorld } from '../../src/sim/step.js';
import { enterZone } from '../../src/sim/world.js';
import { makeItem, rollDrop } from '../../src/sim/loot.js';
import { refresh } from '../../src/sim/hero.js';
import { loadHeroInto, saveHero } from '../../src/sim/serialize.js';
await guarded(async () => {
  const w = newWorld({ seed: 3 }); const h = addHero(w, { seat: 0, cls: 'sexton' }); enterZone(w, 'town'); w.events.length = 0;
  // Items stay inside their ranges and always valid.
  let n = 0; for (let i = 0; i < 2000; i++) { const it = rollDrop(w, h, i % 3 ? 'trash' : 'elite', 1 + (i % 30)); if (!it) continue; n++; if (!RARITIES[it.rarity] || !SLOTS.includes(it.slot) || !it.name) ok(false, `bad item ${JSON.stringify(it)}`); for (const a of it.affixes) if (!AFFIXES[a.k] || !(a.v > 0)) ok(false, `bad affix ${JSON.stringify(a)}`); }
  ok(n > 500, 'rolled items');
  for (const r of ['common', 'blessed', 'reliquary']) for (const s of SLOTS) { const it = makeItem(w.rngs.loot, { slot: s, rarity: r, ilvl: 10, cls: 'sexton' }); eq(it.slot, s, 'slot'); ok(it.affixes.length >= RARITIES[r].affixes[0], 'affix count'); }
  eq(F.xpToNext(1), 100, 'xp curve'); ok(F.reduction(100, 10) > 0 && F.reduction(100, 10) < 1, 'armour');
  ok(F.monsterHp(1, 1, 1, 1, w.tuning) === 20, 'monster hp formula');
  // Commands: every service.
  h.gold = 1e6; h.mats = { scrap: 500, dust: 500, shards: 500, keys: 5 };
  const give = (o) => { const it = makeItem(w.rngs.loot, { ilvl: 10, cls: 'sexton', ...o }); h.inv.push(it); return it; };
  const a = give({ slot: 'main', rarity: 'reliquary' }); ok(applyCommand(w, 0, { c: 'equip', uid: a.uid }), 'equip'); eq(h.gear.main.uid, a.uid, 'equipped');
  const b = give({ slot: 'ring', rarity: 'blessed' }); ok(applyCommand(w, 0, { c: 'salvage', uid: b.uid }), 'salvage'); ok(!h.inv.includes(b), 'salvaged');
  const c = give({ slot: 'ring', rarity: 'blessed' }); const g0 = h.gold; ok(applyCommand(w, 0, { c: 'sell', uid: c.uid }), 'sell'); ok(h.gold > g0, 'sold');
  const n0 = h.inv.length; ok(applyCommand(w, 0, { c: 'craft', slot: 'head', rarity: 'reliquary' }), 'craft'); eq(h.inv.length, n0 + 1, 'crafted'); const crafted = h.inv.at(-1); eq(crafted.rarity, 'reliquary', 'crafted rarity');
  const old = JSON.stringify(crafted.affixes[0]); ok(applyCommand(w, 0, { c: 'reforge', uid: crafted.uid, index: 0 }), 'reforge'); ok(JSON.stringify(crafted.affixes[0]) !== old, 'reforged');
  ok(applyCommand(w, 0, { c: 'casket', slot: 'chest' }), 'casket');
  ok(applyCommand(w, 0, { c: 'stashPut', tab: 1, uid: crafted.uid }), 'stash put'); ok(w.stash[1].includes(crafted), 'stashed'); ok(applyCommand(w, 0, { c: 'stashTake', tab: 1, uid: crafted.uid }), 'stash take');
  const leg = give({ legendary: 'second_crook' }); ok(applyCommand(w, 0, { c: 'extract', uid: leg.uid }), 'extract'); eq(h.reliquary.weapon, 'second_crook', 'reliquary'); ok(h.powers.has('second_crook'), 'reliquary power active'); ok(applyCommand(w, 0, { c: 'setRelic', kind: 'weapon', power: null }), 'relic clear'); ok(!h.powers.has('second_crook'), 'cleared');
  // Gems: socket, merge.
  h.gems = { 'ember:0': 3, 'salt:0': 1 };
  ok(applyCommand(w, 0, { c: 'merge', gem: 'ember:0' }), 'merge'); eq(h.gems['ember:1'], 1, 'merged');
  const sock = makeItem(w.rngs.loot, { slot: 'chest', rarity: 'blessed', ilvl: 10, cls: 'sexton' }); sock.affixes = [{ k: 'socket', v: 1 }]; h.inv.push(sock); ok(applyCommand(w, 0, { c: 'socket', uid: sock.uid, gem: 'salt:0' }), 'socket'); eq(sock.gem.k, 'salt', 'socketed');
  void GEMS;
  // Vendor stock.
  const { vendorStock } = await import('../../src/sim/commands.js'); const st = vendorStock(w, h); eq(st.length, 6, 'six rotating items'); const bought = st[0]; ok(applyCommand(w, 0, { c: 'buy', uid: bought.uid }), 'buy');
  // Vows and tones.
  h.level = 16; refresh(w, h); ok(applyCommand(w, 0, { c: 'setVow', index: 0, vow: 'union_rates' }), 'vow'); ok(applyCommand(w, 0, { c: 'setVow', index: 1, vow: 'plot_holder' }), 'vow 2'); eq(h.vows.length, 2, 'two vows');
  ok(applyCommand(w, 0, { c: 'setSkill', slot: 2, skill: 'coffin_drop' }), 'set skill'); ok(applyCommand(w, 0, { c: 'setTone', slot: 2, tone: 'occupied' }), 'set tone'); eq(h.slots[2].tone, 'occupied', 'tone');
  ok(!applyCommand(w, 0, { c: 'setSkill', slot: 2, skill: 'clout' }), 'other class skill refused');
  // Save round trip.
  const data = saveHero(h); const w2 = newWorld({ seed: 3 }); const h2 = addHero(w2, { seat: 0, cls: 'sexton' }); enterZone(w2, 'town'); loadHeroInto(w2, h2, JSON.parse(JSON.stringify(data)));
  eq(JSON.stringify(saveHero(h2)), JSON.stringify(data), 'save round-trips');
  eq(h2.stats.weaponDps, h.stats.weaponDps, 'stats after load');
  for (const c2 of CLASS_IDS) { const w3 = newWorld({ seed: 9 }); const h3 = addHero(w3, { seat: 0, cls: c2 }); ok(h3.gear.main?.cls === c2, 'starter weapon fits'); }
  void stepWorld;
});
