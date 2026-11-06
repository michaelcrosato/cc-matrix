// Everything a menu can do to the world. Works the same from a pad, a mouse, the network or a bot.
import { CLASSES, VOWS } from '../data/classes.js';
import { AFFIXES, gemId, GEM_KINDS, LEGENDARIES, parseGem, RARITIES, SET_BY_CLASS, SETS, SLOTS, SOCKETABLE } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { RULES, DIFFICULTIES } from '../data/tuning.js';
import { SKILLS } from '../data/skills.js';
import { dist, ev, toast } from './core.js';
import { toneUnlocked } from './effects.js';
import { reequip, recalcHero, slotOpen, skillUnlocked, riseAt, levelUp, gainXp, addHero, newHeroData, reviveHero } from './hero.js';
import { buyPrice, makeItem, makeRolledItem, rollAffixes, sellPrice, itemValue, dropItem } from './loot.js';
import { onTalkDone, rollWrits, ensurePyx, spawnPlate } from './quests.js';
import { goToGate, riseAtGate, travel } from './travel.js';
import { endRun, startRun } from './knell.js';
import { applyRoundPick } from './round.js';
import { killMonster, spawnElitePack, spawnMonster, monsterLevel, openSpot } from './monsters.js';
import { startBoss } from './bosses.js';
import { addObject } from './objects.js';
import { WARDENS } from '../data/monsters.js';

export const SALVAGE = { common: { scrap: 1 }, blessed: { scrap: 3 }, reliquary: { dust: 1 }, legendary: { shards: 1 }, set: { shards: 1 } };
export const CRAFT_COST = {
  blessed: { gold: (L) => 40 + L * 12, scrap: 4 },
  reliquary: { gold: (L) => 120 + L * 30, dust: 3, scrap: 4 },
  legendary: { gold: (L) => 500 + L * 80, shards: 4, dust: 4 },
};
export const REFORGE_COST = { gold: (L) => 60 + L * 15, dust: 1 };
export const CASKET_COST = { shards: 1, gold: (L) => 200 + L * 20 };
export const SOCKET_COST = (L) => 25 + L * 5;

const invFind = (h, uid) => h.inv.findIndex((it) => it && it.uid === uid);

function shopRoll(w, h) {
  const rng = w.lootRng;
  const L = Math.max(1, h.level);
  const stock = [];
  for (let i = 0; i < 6; i++) {
    const rarity = i < 2 ? 'common' : i < 4 ? 'blessed' : 'reliquary';
    stock.push(makeRolledItem(rng, h, rarity, L));
  }
  h.shop = stock;
  h.shopLevel = L;
}

export function shopStock(w, h) {
  if (!h.shop || h.shopLevel !== h.level) shopRoll(w, h);
  return h.shop;
}

/** Apply one command. Returns true on success. */
export function applyCommand(w, seat, cmd) {
  const h = w.heroes.find((o) => o.seat === seat);
  if (!h && cmd.c !== 'join') return false;
  const C = COMMANDS[cmd.c];
  if (!C) return false;
  return C(w, h, cmd) !== false;
}

const COMMANDS = {
  equip(w, h, { uid }) {
    const i = uid ? invFind(h, uid) : -1;
    if (i < 0) return false;
    const it = h.inv[i];
    h.inv[i] = h.gear[it.slot] ?? null;
    h.gear[it.slot] = it;
    if (h.newest === uid) h.newest = null;
    reequip(w, h);
    ev(w, { t: 'equip', seat: h.seat, name: it.name, rarity: it.rarity, slot: it.slot });
    h.equips = (h.equips ?? 0) + 1;
    return true;
  },
  equip_newest(w, h) { if (!h.newest) return false; return COMMANDS.equip(w, h, { uid: h.newest }); },
  unequip(w, h, { slot }) {
    const it = h.gear[slot];
    const free = h.inv.indexOf(null);
    if (!it || free < 0) return false;
    h.inv[free] = it;
    h.gear[slot] = null;
    reequip(w, h);
    return true;
  },
  drop(w, h, { uid }) {
    const i = invFind(h, uid);
    if (i < 0) return false;
    const it = h.inv[i];
    h.inv[i] = null;
    if (h.newest === uid) h.newest = null;
    dropItem(w, h, it, h.x + h.dirX * 1.5, h.z + h.dirZ * 1.5, 0.4).t = -1;
    return true;
  },
  salvage(w, h, { uid }) {
    const i = invFind(h, uid);
    if (i < 0) return false;
    const it = h.inv[i];
    h.inv[i] = null;
    for (const [k, v] of Object.entries(SALVAGE[it.rarity])) h.mats[k] += v;
    for (const g of it.gems ?? []) if (g) h.gems[g] = (h.gems[g] ?? 0) + 1;
    if (h.newest === uid) h.newest = null;
    h.salvaged = (h.salvaged ?? 0) + 1;
    ev(w, { t: 'sfx', k: 'salvage' });
    return true;
  },
  salvage_all(w, h, { rarity }) {
    let n = 0;
    for (const it of [...h.inv]) if (it && it.rarity === rarity && it.uid !== h.newest) { COMMANDS.salvage(w, h, { uid: it.uid }); n++; }
    return n > 0;
  },
  sell(w, h, { uid }) {
    const i = invFind(h, uid);
    if (i < 0) return false;
    const it = h.inv[i];
    h.inv[i] = null;
    h.gold += sellPrice(it);
    if (h.newest === uid) h.newest = null;
    h.sold = (h.sold ?? 0) + 1;
    ev(w, { t: 'sfx', k: 'gold' });
    return true;
  },
  buy(w, h, { index }) {
    const stock = shopStock(w, h);
    const it = stock[index];
    if (!it) return false;
    const price = buyPrice(it);
    const free = h.inv.indexOf(null);
    if (h.gold < price || free < 0) { ev(w, { t: 'cant', seat: h.seat }); return false; }
    h.gold -= price;
    h.inv[free] = it;
    stock[index] = null;
    h.bought = (h.bought ?? 0) + 1;
    ev(w, { t: 'sfx', k: 'gold' });
    return true;
  },
  casket(w, h, { slot }) {
    const L = h.level;
    const free = h.inv.indexOf(null);
    if (h.mats.shards < CASKET_COST.shards || h.gold < CASKET_COST.gold(L) || free < 0) { ev(w, { t: 'cant', seat: h.seat }); return false; }
    h.mats.shards -= CASKET_COST.shards;
    h.gold -= CASKET_COST.gold(L);
    const rng = w.lootRng;
    const r = rng.next();
    const rarity = r < 0.05 ? 'legendary' : r < 0.45 ? 'reliquary' : 'blessed';
    const it = rarity === 'legendary' ? makeRolledItem(rng, h, 'legendary', L) : makeItem(rng, { slot, rarity, ilvl: L, cls: h.cls });
    h.inv[free] = it;
    ev(w, { t: 'casket', seat: h.seat, name: it.name, rarity: it.rarity });
    h.caskets = (h.caskets ?? 0) + 1;
    return true;
  },
  craft(w, h, { slot, rarity }) {
    const cost = CRAFT_COST[rarity];
    const L = h.level;
    const free = h.inv.indexOf(null);
    if (!cost || free < 0) return false;
    if (h.gold < cost.gold(L) || h.mats.scrap < (cost.scrap ?? 0) || h.mats.dust < (cost.dust ?? 0) || h.mats.shards < (cost.shards ?? 0)) { ev(w, { t: 'cant', seat: h.seat }); return false; }
    h.gold -= cost.gold(L);
    h.mats.scrap -= cost.scrap ?? 0; h.mats.dust -= cost.dust ?? 0; h.mats.shards -= cost.shards ?? 0;
    const rng = w.lootRng;
    h.inv[free] = rarity === 'legendary' ? makeRolledItem(rng, h, 'legendary', L) : makeItem(rng, { slot, rarity, ilvl: L, cls: h.cls });
    h.crafted = (h.crafted ?? 0) + 1;
    ev(w, { t: 'crafted', seat: h.seat, name: h.inv[free].name, rarity: h.inv[free].rarity });
    return true;
  },
  reforge(w, h, { uid, slot, index }) {
    const it = uid ? h.inv.find((x) => x?.uid === uid) ?? h.gear[slot] : h.gear[slot];
    if (!it || !it.affixes?.[index]) return false;
    const L = h.level;
    if (h.gold < REFORGE_COST.gold(L) || h.mats.dust < REFORGE_COST.dust) { ev(w, { t: 'cant', seat: h.seat }); return false; }
    h.gold -= REFORGE_COST.gold(L);
    h.mats.dust -= REFORGE_COST.dust;
    const keep = it.affixes.map((a) => a.k);
    const [fresh] = rollAffixes(w.lootRng, it.slot, 1, it.ilvl, keep);
    if (fresh) it.affixes[index] = fresh;
    h.reforged = (h.reforged ?? 0) + 1;
    recalcHero(w, h);
    ev(w, { t: 'sfx', k: 'forge' });
    return true;
  },
  extract(w, h, { uid }) {
    const i = invFind(h, uid);
    if (i < 0) return false;
    const it = h.inv[i];
    if (!it.power) return false;
    h.inv[i] = null;
    w.account.powers = w.account.powers ?? {};
    w.account.powers[it.power] = 1;
    h.extracted = (h.extracted ?? 0) + 1;
    ev(w, { t: 'extract', seat: h.seat, name: LEGENDARIES[it.power].name });
    return true;
  },
  reliquary(w, h, { group, power }) {
    if (!['weapon', 'armor', 'jewel'].includes(group)) return false;
    if (power && (!w.account.powers?.[power] || LEGENDARIES[power].group !== group)) return false;
    h.reliquary[group] = power ?? null;
    reequip(w, h);
    return true;
  },
  socket(w, h, { uid, slot, gem, index = 0 }) {
    const it = uid ? h.inv.find((x) => x?.uid === uid) : h.gear[slot];
    if (!it || !it.gems || it.gems.length === 0 || !h.gems[gem]) return false;
    const cost = SOCKET_COST(it.ilvl);
    if (h.gold < cost) return false;
    h.gold -= cost;
    const old = it.gems[index];
    if (old) h.gems[old] = (h.gems[old] ?? 0) + 1;
    it.gems[index] = gem;
    h.gems[gem]--;
    h.socketed = (h.socketed ?? 0) + 1;
    recalcHero(w, h);
    ev(w, { t: 'sfx', k: 'socket' });
    return true;
  },
  unsocket(w, h, { uid, slot, index = 0 }) {
    const it = uid ? h.inv.find((x) => x?.uid === uid) : h.gear[slot];
    if (!it?.gems?.[index]) return false;
    h.gems[it.gems[index]] = (h.gems[it.gems[index]] ?? 0) + 1;
    it.gems[index] = null;
    recalcHero(w, h);
    return true;
  },
  merge(w, h, { gem }) {
    const { kind, tier } = parseGem(gem);
    if (tier >= 2 || (h.gems[gem] ?? 0) < 3) return false;
    h.gems[gem] -= 3;
    const next = gemId(kind, tier + 1);
    h.gems[next] = (h.gems[next] ?? 0) + 1;
    h.merged = (h.merged ?? 0) + 1;
    ev(w, { t: 'sfx', k: 'socket' });
    return true;
  },
  stash_put(w, h, { uid, tab }) {
    const i = invFind(h, uid);
    const t = w.account.stash[tab];
    if (i < 0 || !t) return false;
    const free = t.indexOf(null);
    if (free < 0) return false;
    t[free] = h.inv[i];
    h.inv[i] = null;
    h.stashed = (h.stashed ?? 0) + 1;
    return true;
  },
  stash_take(w, h, { tab, index }) {
    const t = w.account.stash[tab];
    const free = h.inv.indexOf(null);
    if (!t?.[index] || free < 0) return false;
    h.inv[free] = t[index];
    t[index] = null;
    return true;
  },
  skill(w, h, { slot, id }) {
    if (!slotOpen(h, slot)) return false;
    if (id && !skillUnlocked(h, id)) return false;
    if (id) {
      const other = h.skills.findIndex((s) => s?.id === id);
      if (other >= 0 && other !== slot) { h.skills[other] = h.skills[slot] ?? null; }
    }
    h.skills[slot] = id ? { id, tone: h.toneMemory?.[id] ?? null } : null;
    h.slotChanged = (h.slotChanged ?? 0) + 1;
    h.skillCache.clear();
    if (w.camp) w.camp.skillsSet = (w.camp.skillsSet ?? 0) + 1;
    return true;
  },
  tone(w, h, { id, tone }) {
    const s = h.skills.find((x) => x?.id === id);
    if (tone && !toneUnlocked(h, id, tone)) return false;
    h.toneMemory = h.toneMemory ?? {};
    h.toneMemory[id] = tone ?? null;
    if (s) s.tone = tone ?? null;
    h.skillCache.clear();
    delete h.charges[id];
    h.tonesSet = (h.tonesSet ?? 0) + 1;
    return true;
  },
  vow(w, h, { index, id }) {
    if (h.level < RULES.vowLevels[index]) return false;
    if (id && !VOWS[h.cls].some((v) => v.id === id)) return false;
    if (id && h.vows.includes(id)) h.vows[h.vows.indexOf(id)] = null;
    h.vows[index] = id ?? null;
    recalcHero(w, h);
    h.vowsSet = (h.vowsSet ?? 0) + 1;
    return true;
  },
  devotion(w, h, { track, stat }) {
    const d = w.account.devotion;
    if (d.points <= 0) return false;
    d.points--;
    d.spent[track] = d.spent[track] ?? [0, 0, 0, 0];
    d.spent[track][stat]++;
    for (const o of w.heroes) recalcHero(w, o);
    return true;
  },
  devotion_reset(w) {
    const d = w.account.devotion;
    for (const k of Object.keys(d.spent)) { for (const n of d.spent[k]) d.points += n; d.spent[k] = [0, 0, 0, 0]; }
    for (const o of w.heroes) recalcHero(w, o);
    return true;
  },
  talk_done(w, h, { npc }) { onTalkDone(w, h, npc); return true; },
  travel(w, h, { key, zone, floor }) {
    const safe = w.zone.def.safe || usableGate(w, h);
    if (!safe) return false;
    if (key) return goToGate(w, key);
    if (!zoneOpen(w, zone)) return false;
    travel(w, zone, floor ?? 0, 'start');
    return true;
  },
  rise(w, h, { how }) {
    if (!h.dead) return false;
    if (how === 'here') {
      if (h.deadT < (h.deathWait ?? 5)) return false;
      riseAt(w, h, 'here');
      return true;
    }
    riseAtGate(w, h, how);
    return true;
  },
  difficulty(w, h, { index }) {
    const d = DIFFICULTIES[index];
    if (!d) return false;
    if (d.penance && !w.account.unlocks.penance) return false;
    w.difficulty = index;
    w.diffDef = d;
    ev(w, { t: 'toast', text: `DIFFICULTY: ${d.name}`, color: 'sand' });
    if (w.camp) w.camp.difficulty = index;
    return true;
  },
  writs(w) { rollWrits(w); return true; },
  knell_start(w, h, { mods, grand, tier }) {
    if (!w.account.unlocks.knell) return false;
    if (grand) {
      if ((h.grandKeys ?? 0) <= 0) return false;
      h.grandKeys--;
    }
    startRun(w, { mods, grand, tier });
    return true;
  },
  run_home(w) { endRun(w); travel(w, 'town', 0, 'start'); return true; },
  cycle_use(w, h) { h.useSel = (h.useSel ?? 0) + 1; return true; },
  pick3(w, h, { i }) { applyRoundPick(w, h, i); return true; },
  ...devCommands(),
};

export const usableGate = (w, h) => w.objects.some((o) => o.kind === 'lychgate' && dist(o.x, o.z, h.x, h.z) < RULES.interactRange + 1);
export function zoneOpen(w, zone) {
  const f = w.camp?.flags ?? {};
  return { causeway: f.open_causeway, ossuary: f.open_ossuary, cloister: f.open_cloister, belfry: f.open_belfry, pantry: w.camp.visited['pantry:0'], town: true, yard: true }[zone] ?? false;
}

// ---- Dev mode ---------------------------------------------------------------------------------
function devCommands() {
  return {
    dev_level(w, h, { n }) { for (let i = 0; i < (n ?? 1) && h.level < RULES.levelCap; i++) levelUp(w, h, true); h.xp = 0; return true; },
    dev_level_max(w, h) { while (h.level < RULES.levelCap) levelUp(w, h, true); h.xp = 0; return true; },
    dev_gold(w, h, { n }) { h.gold += n ?? 10000; return true; },
    dev_mats(w, h) { h.mats.scrap += 50; h.mats.dust += 30; h.mats.shards += 20; h.grandKeys = (h.grandKeys ?? 0) + 3; return true; },
    dev_item(w, h, { slot, rarity }) {
      const free = h.inv.indexOf(null);
      if (free < 0) return false;
      h.inv[free] = rarity === 'legendary' || rarity === 'set' ? makeRolledItem(w.lootRng, h, rarity, h.level, slot) : makeItem(w.lootRng, { slot, rarity, ilvl: h.level, cls: h.cls });
      return true;
    },
    dev_legendary(w, h, { id }) {
      const free = h.inv.indexOf(null);
      if (free < 0) return false;
      h.inv[free] = makeItem(w.lootRng, { rarity: 'legendary', ilvl: h.level, cls: h.cls, legendary: id });
      return true;
    },
    dev_set(w, h, { set, slot }) {
      const free = h.inv.indexOf(null);
      if (free < 0) return false;
      const s = set ?? SET_BY_CLASS[h.cls];
      h.inv[free] = makeItem(w.lootRng, { slot: slot ?? 'head', rarity: 'set', ilvl: h.level, cls: h.cls, set: s });
      return true;
    },
    dev_gems(w, h) { for (const k of Object.keys(GEM_KINDS)) for (let t = 0; t < 3; t++) { const id = gemId(k, t); h.gems[id] = (h.gems[id] ?? 0) + 3; } return true; },
    dev_spawn(w, h, { type, n, elite, aff }) {
      const def = MONSTERS[type];
      if (!def) return false;
      if (elite) {
        spawnElitePack(w, { x: h.x + h.dirX * 5, z: h.z + h.dirZ * 5 }, null, { kind: elite, type, aff: aff?.length ? aff : ['tolling'] });
        return true;
      }
      for (let i = 0; i < (n ?? 1); i++) { const p = openSpot(w, h.x + h.dirX * 5, h.z + h.dirZ * 5, 2); spawnMonster(w, type, p.x, p.z, { state: 'chase' }); }
      return true;
    },
    dev_boss(w, h, { type }) { const p = openSpot(w, h.x + h.dirX * 6, h.z + h.dirZ * 6, 1); startBoss(w, type, p.x, p.z, { noIntro: true }); return true; },
    dev_plate(w, h) { const p = openSpot(w, h.x + h.dirX * 5, h.z + h.dirZ * 5, 1); spawnPlate(w, p.x, p.z); return true; },
    dev_coffin(w, h) { addObject(w, 'coffin', h.x + h.dirX * 2.5, h.z + h.dirZ * 2.5, { time: 45, count: 7, announce: true }); return true; },
    dev_kill_all(w, h) { for (const m of w.monsters) if (!m.dead) killMonster(w, m, h, {}); return true; },
    dev_goto(w, h, { zone, floor }) { travel(w, zone, floor ?? 0, 'start'); return true; },
    dev_quest(w, h, { i, s }) {
      w.camp.q.i = i; w.camp.q.s = s ?? 0;
      w.camp.flags.open_causeway = i >= 1 ? 1 : w.camp.flags.open_causeway;
      w.camp.flags.open_ossuary = i >= 2 ? 1 : w.camp.flags.open_ossuary;
      w.camp.flags.open_cloister = i >= 3 ? 1 : w.camp.flags.open_cloister;
      w.camp.flags.open_belfry = i >= 4 ? 1 : w.camp.flags.open_belfry;
      if (i >= 2) { w.camp.flags.forge = 1; w.camp.flags.brasse_met = 1; w.camp.flags.brasse_home = 1; w.camp.flags.pyx = 1; }
      if (i >= 3) { w.camp.flags.reliquary = 1; }
      ev(w, { t: 'quest', name: 'DEV', text: `QUEST ${i}.${s ?? 0}`, id: 'dev' });
      return true;
    },
    dev_knell_fill(w) { if (w.run?.state === 'fill') { w.run.meter = w.run.total - 1; ev(w, { t: 'knell', v: w.run.meter, of: w.run.total }); return true; } return false; },
    dev_knell_start(w, h) { w.account.unlocks.knell = true; w.account.unlocks.penance = true; startRun(w, {}); return true; },
    dev_next_phase(w) {
      const m = w.boss;
      if (!m) return false;
      const b = m.bossState;
      if (m.def.boss === 'malison') { m.hp = b.phase === 1 ? m.maxHp * 0.59 : m.maxHp * 0.24; return true; }
      m.hp = Math.max(1, m.hp - m.maxHp * 0.5);
      return true;
    },
    dev_reveal(w) { w.zone.seen.fill(1); return true; },
    dev_reroll(w, h, { seed }) { w.rerollSeed = seed; return true; },
    dev_scale(w, h, { k, v }) { w.tuning[k] = v; for (const o of w.heroes) recalcHero(w, o); return true; },
    dev_cheat(w, h, { k, v }) { w.cheats[k] = v; return true; },
    dev_revive(w, h) { for (const o of w.heroes) if (o.dead) reviveHero(w, o, 1); return true; },
  };
}

export { AFFIXES, SETS, SLOTS, SOCKETABLE, SKILLS, CLASSES, RARITIES, itemValue, gainXp, addHero, newHeroData, ensurePyx, monsterLevel, toast, WARDENS, buyPrice, sellPrice };
