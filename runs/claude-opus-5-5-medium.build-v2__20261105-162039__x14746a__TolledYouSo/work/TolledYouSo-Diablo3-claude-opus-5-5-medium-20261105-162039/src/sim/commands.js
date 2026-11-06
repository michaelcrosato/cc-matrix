// Everything a menu or a remote player can ask the sim to do. Same path on every client: applyCommand(world, seat, cmd).
import { CLASSES, SKILLS } from '../data/classes.js';
import { CASKET_COST, CRAFT_COST, DEVOTION_TRACKS, GEM_IDS, INV_SIZE, LEGENDARY, LEGENDARIES, REFORGE_COST, SALVAGE, SETS, SET_FOR_CLASS, STASH_SIZE, AFFIX_IDS, AFFIXES } from '../data/items.js';
import { DIFFICULTIES, LEVEL_CAP, VOW_LEVELS } from '../data/tuning.js';
import { ZONES } from '../data/zones.js';
import { emit, enterZone, findOpenNear, near, partyLevel, setDifficulty } from './world.js';
import { autoAssignSkills, devotionPointsFree, levelUp, refresh, reviveHero, slotOpen, skillUnlocked, toneUnlocked, vowSlots, grantXp } from './hero.js';
import { canWear, itemValue, makeItem, rollAffix, rollLegendaryItem, rollSetItem } from './loot.js';
import { afterTalk, dialogFor, rollWrits, finishWrit, questFlag, visibleProp } from './quests.js';
import { addPyx, addProp, dropItem, removePyx, spawnPlate } from './rules.js';
import { killMonster, spawnElitePack, spawnMonster } from './monsters.js';
import { knellTolls, leaveKnell, startKnell } from './knell.js';
import { hasRope, useProp } from './step.js';

const heroOf = (w, seat) => w.heroes.find((h) => h.seat === seat && !h.left);
const findInv = (h, uid) => h.inv.findIndex((i) => i.uid === uid);
export const WEAPON_SLOTS = ['main'];
export const reliquaryKind = (slot) => (slot === 'main' || slot === 'off' ? 'weapon' : slot === 'amulet' || slot === 'ring' ? 'jewel' : 'armour');

const VENDOR_SLOTS = ['main', 'chest', 'head', 'feet', 'ring', 'amulet', 'hands', 'legs', 'off', 'shoulders'];
export function vendorStock(w, h) {
  // Six rotating items for this hero; it rotates by level and by how much was bought.
  const key = `${h.id}:${h.level}:${w.story.stock ?? 0}`;
  if (h._stockKey !== key) {
    h._stockKey = key;
    const rng = w.root.fork(`stock:${key}`);
    h._stock = [];
    for (let i = 0; i < 6; i++) { const slot = VENDOR_SLOTS[(i + (w.story.stock ?? 0)) % VENDOR_SLOTS.length]; const it = makeItem(rng, { slot, rarity: i < 2 ? 'reliquary' : 'blessed', ilvl: h.level, cls: h.cls }); it.price = Math.round(itemValue(it) * 4); h._stock.push(it); }
  }
  return h._stock;
}

export function applyCommand(w, seat, cmd) {
  const h = heroOf(w, seat);
  const ok = (msg) => { if (msg) emit(w, { t: 'toast', seat, text: msg, color: 'lime' }); emit(w, { t: 'sheet', seat }); return true; };
  const fail = (msg) => { emit(w, { t: 'toast', seat, text: msg, color: 'red' }); emit(w, { t: 'sfx', id: 'ui_error' }); return false; };
  if (!h && !['setTuning', 'resetTuning', 'dev'].includes(cmd.c)) return false;
  switch (cmd.c) {
    case 'equip': return equip(w, h, cmd.uid);
    case 'equipNewest': { if (!h.newest) return false; const r = equip(w, h, h.newest); h.newest = null; return r; }
    case 'unequip': { const it = h.gear[cmd.slot]; if (!it || h.inv.length >= INV_SIZE) return false; delete h.gear[cmd.slot]; h.inv.push(it); refresh(w, h); return ok(); }
    case 'salvage': {
      const i = findInv(h, cmd.uid); if (i < 0) return false;
      const it = h.inv[i]; const pay = SALVAGE[it.rarity]; for (const k of Object.keys(pay)) h.mats[k] += pay[k];
      h.inv.splice(i, 1); emit(w, { t: 'sfx', id: 'ui_salvage' }); h.counters = h.counters ?? {}; h.counters.salvaged = (h.counters.salvaged ?? 0) + 1;
      return ok();
    }
    case 'sell': { const i = findInv(h, cmd.uid); if (i < 0) return false; const it = h.inv[i]; h.gold += itemValue(it); h.inv.splice(i, 1); emit(w, { t: 'sfx', id: 'gold' }); h.counters = h.counters ?? {}; h.counters.sold = (h.counters.sold ?? 0) + 1; return ok(); }
    case 'drop': { const i = findInv(h, cmd.uid); if (i < 0) return false; const it = h.inv.splice(i, 1)[0]; dropItem(w, h.x, h.z, it, seat); w.drops.at(-1).t = -1.5; return ok(); }
    case 'buy': {
      const st = vendorStock(w, h); const it = st.find((s) => s.uid === cmd.uid); if (!it) return false;
      if (h.gold < it.price) return fail('NOT ENOUGH GOLD. PENNYWHISTLE IS SORRY. HE IS NOT.');
      if (h.inv.length >= INV_SIZE) return fail('YOUR PACK IS FULL.');
      h.gold -= it.price; const copy = { ...it }; delete copy.price; h.inv.push(copy); st.splice(st.indexOf(it), 1); emit(w, { t: 'sfx', id: 'gold' });
      h.counters = h.counters ?? {}; h.counters.bought = (h.counters.bought ?? 0) + 1;
      return ok();
    }
    case 'casket': {
      if (h.mats.shards < CASKET_COST.shards) return fail('A CASKET COSTS 3 BELL SHARDS.');
      if (h.inv.length >= INV_SIZE) return fail('YOUR PACK IS FULL.');
      h.mats.shards -= CASKET_COST.shards;
      const rng = w.rngs.loot; const r = rng.next();
      const it = r < 0.08 ? (rng.chance(0.5) && ['head', 'chest', 'hands', 'feet'].includes(cmd.slot) ? rollSetItem(rng, h.cls, h.level, cmd.slot) : legendaryForSlot(rng, h, cmd.slot)) : makeItem(rng, { slot: cmd.slot, rarity: r < 0.45 ? 'reliquary' : 'blessed', ilvl: h.level, cls: h.cls });
      h.inv.push(it); emit(w, { t: 'upgrade', seat, uid: it.uid, name: it.name, rarity: it.rarity }); emit(w, { t: 'sfx', id: 'quest' });
      h.counters = h.counters ?? {}; h.counters.caskets = (h.counters.caskets ?? 0) + 1;
      return ok();
    }
    case 'craft': {
      const cost = CRAFT_COST[cmd.rarity]; if (!cost) return false;
      if (h.gold < (cost.gold ?? 0) || h.mats.scrap < (cost.scrap ?? 0) || h.mats.dust < (cost.dust ?? 0)) return fail('NOT ENOUGH MATERIALS, SHE SHOUTS.');
      if (h.inv.length >= INV_SIZE) return fail('YOUR PACK IS FULL.');
      h.gold -= cost.gold ?? 0; h.mats.scrap -= cost.scrap ?? 0; h.mats.dust -= cost.dust ?? 0;
      const it = makeItem(w.rngs.loot, { slot: cmd.slot, rarity: cmd.rarity, ilvl: h.level, cls: h.cls }); h.inv.push(it); emit(w, { t: 'sfx', id: 'anvil' });
      emit(w, { t: 'upgrade', seat, uid: it.uid, name: it.name, rarity: it.rarity });
      h.counters = h.counters ?? {}; h.counters.crafted = (h.counters.crafted ?? 0) + 1;
      return ok();
    }
    case 'reforge': {
      const it = findAny(h, cmd.uid); if (!it || !it.affixes[cmd.index]) return false;
      if (h.gold < REFORGE_COST.gold || h.mats.dust < REFORGE_COST.dust) return fail('2 DUST AND 80 GOLD, SHE SHOUTS.');
      h.gold -= REFORGE_COST.gold; h.mats.dust -= REFORGE_COST.dust;
      const exist = it.affixes.map((a) => a.k);
      const pool = AFFIX_IDS.filter((k) => (!AFFIXES[k].slots || AFFIXES[k].slots.includes(it.slot)) && !exist.includes(k));
      const k = w.rngs.loot.pick(pool); it.affixes[cmd.index] = rollAffix(w.rngs.loot, k, it.ilvl);
      refresh(w, h); emit(w, { t: 'sfx', id: 'anvil' }); h.counters = h.counters ?? {}; h.counters.reforged = (h.counters.reforged ?? 0) + 1;
      return ok();
    }
    case 'extract': {
      const i = findInv(h, cmd.uid); if (i < 0) return false; const it = h.inv[i]; if (!it.power) return false;
      const key = reliquaryKind(it.slot); h.reliquary[key] = it.power; h.known = h.known ?? []; if (!h.known.includes(it.power)) h.known.push(it.power);
      h.inv.splice(i, 1); refresh(w, h); emit(w, { t: 'sfx', id: 'bell_small' }); h.counters = h.counters ?? {}; h.counters.extracted = (h.counters.extracted ?? 0) + 1;
      return ok(`THE RELIQUARY HOLDS IT NOW: ${LEGENDARY[it.power].name}`);
    }
    case 'setRelic': { if (cmd.power && !(h.known ?? []).includes(cmd.power)) return false; h.reliquary[cmd.kind] = cmd.power; refresh(w, h); return ok(); }
    case 'socket': {
      const it = findAny(h, cmd.uid); if (!it) return false; const hasSocket = it.affixes.some((a) => a.k === 'socket'); if (!hasSocket) return fail('THAT HAS NO SOCKET.');
      if (it.gem) { const back = `${it.gem.k}:${it.gem.tier}`; h.gems[back] = (h.gems[back] ?? 0) + 1; }
      if ((h.gems[cmd.gem] ?? 0) <= 0) return fail('YOU HAVE NONE OF THOSE.');
      h.gems[cmd.gem]--; const [k, tier] = cmd.gem.split(':'); it.gem = { k, tier: Number(tier) }; refresh(w, h); emit(w, { t: 'sfx', id: 'ui_equip' }); h.counters = h.counters ?? {}; h.counters.socketed = (h.counters.socketed ?? 0) + 1;
      return ok();
    }
    case 'unsocket': { const it = findAny(h, cmd.uid); if (!it?.gem) return false; const back = `${it.gem.k}:${it.gem.tier}`; h.gems[back] = (h.gems[back] ?? 0) + 1; it.gem = null; refresh(w, h); return ok(); }
    case 'merge': {
      const [k, t] = cmd.gem.split(':'); const tier = Number(t); if (tier >= 2 || (h.gems[cmd.gem] ?? 0) < 3) return fail('THREE ALIKE, CHILD.');
      h.gems[cmd.gem] -= 3; const next = `${k}:${tier + 1}`; h.gems[next] = (h.gems[next] ?? 0) + 1; emit(w, { t: 'sfx', id: 'bell_small' }); h.counters = h.counters ?? {}; h.counters.merged = (h.counters.merged ?? 0) + 1;
      return ok();
    }
    case 'stashPut': { const tab = w.stash[cmd.tab]; if (!tab || tab.length >= STASH_SIZE) return fail('THAT TAB IS FULL.'); const i = findInv(h, cmd.uid); if (i < 0) return false; tab.push(h.inv.splice(i, 1)[0]); h.counters = h.counters ?? {}; h.counters.stashed = (h.counters.stashed ?? 0) + 1; return ok(); }
    case 'stashTake': { const tab = w.stash[cmd.tab]; const i = tab?.findIndex((x) => x.uid === cmd.uid) ?? -1; if (i < 0) return false; if (h.inv.length >= INV_SIZE) return fail('YOUR PACK IS FULL.'); h.inv.push(tab.splice(i, 1)[0]); return ok(); }
    case 'setSkill': {
      if (!slotOpen(h, cmd.slot)) return false;
      if (cmd.skill && (!SKILLS[cmd.skill] || SKILLS[cmd.skill].cls !== h.cls || !skillUnlocked(h, cmd.skill))) return false;
      const other = h.slots.findIndex((s) => s.skill === cmd.skill);
      if (other >= 0 && other !== cmd.slot) { const t = h.slots[other]; h.slots[other] = h.slots[cmd.slot]; h.slots[cmd.slot] = t; h.swap[other] = w.time + 1; }
      else h.slots[cmd.slot] = { skill: cmd.skill, tone: h.slots[cmd.slot].skill === cmd.skill ? h.slots[cmd.slot].tone : null };
      h.swap[cmd.slot] = w.time + 1;
      return ok();
    }
    case 'setTone': {
      const s = h.slots[cmd.slot]; if (!s?.skill) return false;
      const sk = SKILLS[s.skill]; const keys = Object.keys(sk.tones);
      if (cmd.tone && !toneUnlocked(h, sk, keys.indexOf(cmd.tone))) return false;
      s.tone = cmd.tone; h.swap[cmd.slot] = w.time + 1; h.toneUse = h.toneUse ?? {}; h.toneUse[cmd.tone] = 1;
      return ok();
    }
    case 'setVow': {
      if (cmd.index >= vowSlots(h)) return false;
      const other = h.vows.indexOf(cmd.vow); if (other >= 0 && other !== cmd.index) h.vows[other] = h.vows[cmd.index] ?? null;
      h.vows[cmd.index] = cmd.vow; h.vows = h.vows.filter(Boolean); refresh(w, h); return ok();
    }
    case 'devotion': {
      if (devotionPointsFree(w) <= 0 || !DEVOTION_TRACKS[cmd.track]) return false;
      w.devotion.spent[cmd.track]++; for (const o of w.heroes) refresh(w, o); emit(w, { t: 'sfx', id: 'bell_small' }); return ok();
    }
    case 'difficulty': { const d = DIFFICULTIES[cmd.i]; if (!d) return false; if (d.locked && !w.unlocks.penance) return fail('PENANCE IS EARNED AFTER THE CREDITS.'); setDifficulty(w, cmd.i); emit(w, { t: 'toast', seat: -1, text: `DIFFICULTY: ${d.name}`, color: 'sand' }); return ok(); }
    case 'travel': {
      const z = cmd.zone; if (!ZONES[z] || (!w.story.lychgates.includes(z) && !cmd.dev)) return false;
      if (w.knell && !cmd.dev) return false;
      enterZone(w, z);
      for (const o of w.heroes) if (o.dead) reviveHero(w, o, null, 1);
      return true;
    }
    case 'talk': { const d = dialogFor(w, cmd.npc); if (d) afterTalk(w, d); return true; }
    case 'bell': return w.hooksExtra?.passingBell?.(w, h) ?? false;
    case 'respawn': {
      if (!h.dead) return false;
      if (cmd.how === 'here') { if (h.deadT < h.respawnWait) return false; reviveHero(w, h); }
      else if (cmd.how === 'gate') { const g = w.props.find((p) => p.kind === 'lychgate') ?? w.zone.entrance; reviveHero(w, h, g); }
      else { reviveHero(w, h, null, 1); if (w.zone.id !== 'town' && !w.knell) enterZone(w, 'town'); else if (w.knell) reviveHero(w, h, w.zone.entrance, 1); }
      return true;
    }
    case 'knell': {
      if (w.zone.id !== 'town') return false;
      if (cmd.grand !== undefined && cmd.grand !== null) { if (h.mats.keys < 1) return fail('A GRAND KEY IS NEEDED.'); h.mats.keys--; startKnell(w, { grandTier: cmd.grand }); }
      else startKnell(w);
      return true;
    }
    case 'pick': return w.hooksExtra?.levelPick?.(w, h, cmd.i) ?? false;
    case 'writs': { if (!w.story.writs) rollWrits(w); return true; }
    case 'addPyx': { addPyx(w); return true; }
    case 'removePyx': { removePyx(w); return true; }
    case 'readLore': { w.lore[cmd.id] = 1; return true; }
    case 'quitKnell': { leaveKnell(w); enterZone(w, 'town'); return true; }
    case 'dev': return devCommand(w, h, cmd);
    default: return false;
  }
}
function legendaryForSlot(rng, h, slot) {
  const pool = LEGENDARIES.filter((l) => l.slot === slot && (!l.cls || l.cls === h.cls));
  if (!pool.length) return makeItem(rng, { slot, rarity: 'reliquary', ilvl: h.level, cls: h.cls });
  return makeItem(rng, { legendary: rng.pick(pool).id, ilvl: h.level, cls: h.cls });
}
const findAny = (h, uid) => h.inv.find((i) => i.uid === uid) ?? Object.values(h.gear).find((i) => i?.uid === uid);
export function equip(w, h, uid) {
  const i = findInv(h, uid); if (i < 0) return false;
  const it = h.inv[i]; if (!canWear(it, h)) { emit(w, { t: 'toast', seat: h.seat, text: 'NOT FOR YOUR TRADE.', color: 'red' }); return false; }
  const old = h.gear[it.slot]; h.gear[it.slot] = it; h.inv.splice(i, 1); if (old) h.inv.push(old);
  refresh(w, h); h.hp = Math.min(h.hp, h.stats.maxHp);
  emit(w, { t: 'equip', id: h.id, seat: h.seat, slot: it.slot, uid: it.uid, model: it.model, base: it.base, rarity: it.rarity, set: it.set });
  emit(w, { t: 'sheet', seat: h.seat }); emit(w, { t: 'sfx', id: 'ui_equip' }); emit(w, { t: 'tutorial', seat: h.seat, id: 'equip' });
  if (it.power || it.set) { h.equippedSpecial = (h.equippedSpecial ?? 0) + 1; }
  return true;
}

// Dev tools. Each one is used by the dev-mode screen and tested.
function devCommand(w, h, cmd) {
  const c = cmd.k; const rng = w.rngs.loot;
  switch (c) {
    case 'cheat': w.cheats[cmd.id] = !w.cheats[cmd.id]; return true;
    case 'levelup': if (h.level < LEVEL_CAP) { levelUp(w, h); } return true;
    case 'level30': while (h.level < LEVEL_CAP) levelUp(w, h); autoAssignSkills(h); return true;
    case 'gold': h.gold += 10000; return true;
    case 'mats': h.mats.scrap += 200; h.mats.dust += 100; h.mats.shards += 50; h.mats.keys += 3; return true;
    case 'item': { const it = makeItem(rng, { slot: cmd.slot, rarity: cmd.rarity, ilvl: h.level, cls: h.cls }); h.inv.push(it); return true; }
    case 'legendary': { const it = makeItem(rng, { legendary: cmd.id, ilvl: h.level, cls: h.cls }); h.inv.push(it); return true; }
    case 'set': { const s = SETS[cmd.id ?? SET_FOR_CLASS[h.cls]]; for (const slot of Object.keys(s.pieces)) h.inv.push(makeItem(rng, { slot, set: s.id, ilvl: h.level, cls: s.cls })); return true; }
    case 'gems': for (const g of GEM_IDS) for (let t = 0; t < 3; t++) h.gems[`${g}:${t}`] = (h.gems[`${g}:${t}`] ?? 0) + 3; return true;
    case 'spawn': { const p = findOpenNear(w, h.x + 5 * Math.sin(h.facing), h.z + 5 * Math.cos(h.facing)); spawnMonster(w, cmd.type, p.x, p.z, { dormant: false, aggro: true }); return true; }
    case 'elite': { const p = findOpenNear(w, h.x + 6 * Math.sin(h.facing), h.z + 6 * Math.cos(h.facing)); const types = (w.zone.spec.monsters.length ? w.zone.spec.monsters : ['peatwalker']).filter((t) => t !== 'pallid_bearer'); spawnElitePack(w, p.x, p.z, cmd.kind ?? 'champion', cmd.affl ?? null, types, { dormant: false, aggro: true }); return true; }
    case 'plate': spawnPlate(w, h.x + 4, h.z, { dormant: false, aggro: true }); return true;
    case 'coffin': { const p = findOpenNear(w, h.x + 3, h.z); const pr = addProp(w, { kind: 'coffin', x: p.x, z: p.z, model: 'coffin', interact: true, label: 'UNQUIET COFFIN' }); emit(w, { t: 'propadd', id: pr.id, kind: 'coffin', x: pr.x, z: pr.z, model: 'coffin', label: pr.label }); return true; }
    case 'killall': for (const m of [...w.monsters]) if (!m.dead && !m.dormant) { m.hp = 0; if (m.defn.boss && m.defn.boss !== 'bursar' && m.bossState) m.bossState.round = 3, m.bossState.phase = 3; killMonster(w, m, h, {}); } return true;
    case 'boss': { const z = cmd.zone; applyCommand(w, h.seat, { c: 'travel', zone: z, dev: true }); return true; }
    case 'quest': { w.story.q = cmd.q; w.story.step = cmd.step ?? 0; emit(w, { t: 'quest', name: 'DEV', text: 'QUEST JUMP' }); return true; }
    case 'knellStart': if (!w.knell) { startKnell(w); } return true;
    case 'knellFill': if (w.knell && w.knell.stage === 'fill') { knellTolls(w); } return true;
    case 'difficulty': setDifficulty(w, (w.difficulty + 1) % DIFFICULTIES.length); return true;
    case 'reseed': { w.root = w.root.fork(`dev:${w.tick}`); w.zoneCache.clear(); const id = w.zone.id; w.zone = null; enterZone(w, id); return true; }
    case 'reveal': if (w.zone.explored) w.zone.explored.fill(1); return true;
    case 'nextphase': { const m = w.boss?.m; if (!m) return false; const b = m.bossState; if (m.defn.boss === 'malison') { m.invulnerable = false; if (b.phase === 1) m.hp = m.maxHp * 0.59; else if (b.phase === 2) m.hp = m.maxHp * 0.24; else { w.hooks.devRing?.(w, h); } } else if (m.defn.boss === 'ambrose') { m.hp = b.round === 1 ? m.maxHp * 0.65 : m.maxHp * 0.32; } else m.hp = m.maxHp * 0.29; return true; }
    default: return false;
  }
}
export { CLASSES, VOW_LEVELS, partyLevel, near, grantXp, visibleProp, finishWrit, questFlag, hasRope, useProp, rollLegendaryItem };
