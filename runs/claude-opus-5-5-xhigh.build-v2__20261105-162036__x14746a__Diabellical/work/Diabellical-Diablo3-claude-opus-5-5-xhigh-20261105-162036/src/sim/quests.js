// The campaign's state machine: quest steps, scripted beats, writs, Sister Pyx.
import { CLASSES } from '../data/classes.js';
import { PYX_BANTER, STORY_LINES } from '../data/dialog.js';
import { gemId } from '../data/items.js';
import { QUESTS, WRIT_TEMPLATES } from '../data/quests.js';
import { DT, dist, ev, say, toast } from './core.js';
import { startBoss, ringRope } from './bosses.js';
import { addHero, newHeroData, recalcHero, levelUp } from './hero.js';
import { dropItem, dropLegendary, dropTallow, makeItem, makeRolledItem, spawnDrop } from './loot.js';
import { makeStatues, monsterLevel, openSpot, removeMonster, spawnElitePack, spawnMonster, spawnPack } from './monsters.js';
import { addObject, objectByKey, setObjectState } from './objects.js';
import { travel } from './travel.js';
import { knellKill, onKnellBossDead, stepKnell, knellZoneEntered } from './knell.js';
import { roundLevelUp, roundBossDead } from './round.js';

export function newCampaign() {
  return {
    q: { i: 0, s: 0 }, flags: {}, gates: {}, visited: {}, lore: {}, bestiary: {}, portal: null, lastGate: null, zone: 'yard', floor: 0, writs: [], writsDone: 0, writCaches: 0,
    shrines: 0, coffins: 0, chests: 0, levers: 0, broken: 0, bells: 0, bones: 0, credits: false, plateFirst: false, runsDone: 0,
  };
}

export const currentQuest = (w) => QUESTS[w.camp?.q.i] ?? null;
export const currentStep = (w) => currentQuest(w)?.steps[w.camp.q.s] ?? null;
export const stepIs = (w, id) => currentStep(w)?.id === id;

function advance(w) {
  const q = currentQuest(w);
  if (!q) return;
  w.camp.q.s++;
  if (w.camp.q.s >= q.steps.length) {
    ev(w, { t: 'quest_done', name: q.name });
    w.camp.q.i++;
    w.camp.q.s = 0;
    ev(w, { t: 'sfx', k: 'quest' });
  }
  enterStep(w);
}

function enterStep(w) {
  const st = currentStep(w);
  if (!st) return;
  ev(w, { t: 'quest', name: currentQuest(w).name, text: st.text, id: st.id });
  ev(w, { t: 'autosave' });
  const f = w.camp.flags;
  switch (st.id) {
    case 'east': break;
    case 'coffin': break;
    case 'to_causeway': f.open_causeway = 1; break;
    case 'see_ogive': updateNpcs(w); break;
    case 'bone1': f.open_ossuary = 1; break;
    case 'bursar': if (f.bursar_dead) advance(w); break;
    case 'to_cloister': f.open_cloister = 1; break;
    case 'bishop': if (f.ambrose_dead) advance(w); break;
    case 'to_belfry': f.open_belfry = 1; break;
    default: break;
  }
  w.camp.seenQuest = true;
}

export function questInit(w) { enterStep(w); }

// ---- Objective, for the map marker and the bot ------------------------------------------------
export function objectiveOf(w) {
  const st = currentStep(w);
  if (!st) return null;
  const f = w.camp.flags;
  const town = (key) => ({ zone: 'town', floor: 0, key });
  const here = w.zone?.id, floor = w.zone?.floor;
  switch (st.id) {
    case 'wake': case 'east': return { zone: 'yard', floor: 0, x: 45, z: 7 };
    case 'coffin': return { zone: 'yard', floor: 0, key: 'coffin_quest' };
    case 'gate': return { zone: 'yard', floor: 0, key: 'yard_gate' };
    case 'crier': return town('npc_crier');
    case 'to_causeway': return { zone: 'causeway', floor: 0 };
    case 'find_brasse': return { zone: 'causeway', floor: 0, key: 'npc_brasse' };
    case 'escort': return { zone: 'causeway', floor: 0, key: 'wagon', escort: true };
    case 'brasse_home': return town('npc_brasse');
    case 'see_ogive': case 'ogive_home': return town('npc_ogive');
    case 'bone1': return { zone: 'ossuary', floor: 0, key: 'relic' };
    case 'bone2': return { zone: 'ossuary', floor: 1, key: 'relic' };
    case 'bone3': return { zone: 'ossuary', floor: 2, key: 'relic' };
    case 'bursar': return { zone: 'ossuary', floor: 2, boss: 'bursar' };
    case 'ledger': return { zone: 'ossuary', floor: 2, key: 'ledger' };
    case 'see_crier': case 'crier_truth': return town('npc_crier');
    case 'to_cloister': return { zone: 'cloister', floor: 0 };
    case 'novices': return { zone: 'cloister', floor: 0, key: 'novice', defend: !!w.novices };
    case 'bishop': return { zone: 'cloister', floor: 0, boss: 'ambrose' };
    case 'to_belfry': return { zone: 'belfry', floor: 0 };
    case 'climb': return { zone: 'belfry', floor: 3 };
    case 'malison': return { zone: 'belfry', floor: 3, fight: true };
    case 'ring': return { zone: 'belfry', floor: 3, key: 'rope' };
    default: return { zone: here, floor };
  }
}

// ---- Zones ------------------------------------------------------------------------------------
export function updateNpcs(w) {
  const c = w.camp;
  if (!c) return;
  const qi = c.q.i;
  for (const o of w.objects) {
    if (o.kind !== 'npc') {
      if (o.key === 'writ_board') { o.hidden = !c.flags.forge; ev(w, { t: 'obj', id: o.id, state: o.state, hidden: o.hidden }); }
      if (o.key === 'knell_font') { o.hidden = false; }
      continue;
    }
    let hide = false;
    if (w.zone.id === 'town') {
      if (o.npc === 'brasse') hide = !c.flags.brasse_met || !c.flags.brasse_home;
      if (o.npc === 'ogive') hide = qi < 2;
    } else if (o.npc === 'brasse' && (c.flags.brasse_met)) hide = true;
    if (o.hidden !== hide) { o.hidden = hide; ev(w, { t: 'obj', id: o.id, state: o.state, hidden: hide }); }
  }
}

export function onZoneEntered(w) {
  const z = w.zone;
  if (w.round) return;
  if (w.run) { knellZoneEntered(w); return; }
  const c = w.camp;
  if (!c) return;
  updateNpcs(w);
  ensurePyx(w);
  const st = currentStep(w)?.id;
  // A portal stays open in town while you are there.
  if (z.id === 'town' && c.portal) addObject(w, 'portal', z.entryX + 2, z.entryZ - 1, { id: 1400000, announce: true, r: 1.2 });
  // Hide relics already taken; ledger on revisits.
  for (const o of w.objects) {
    if (o.kind === 'relic' && c.flags[`bone_${z.floor}`]) { o.hidden = true; }
    if (o.kind === 'book' && o.lore && c.lore[o.lore]) o.state = 1;
  }
  if (z.id === 'yard') {
    if (st === 'wake') scriptWake(w);
    if (c.flags.yard_coffin) { const co = objectByKey(w, 'coffin_quest'); if (co) co.state = 2; const g = objectByKey(w, 'yard_gate'); if (g) g.locked = false; }
    if (!c.flags.yard_book_seen) ev(w, { t: 'sfx', k: 'rain_start' });
  }
  if (z.id === 'causeway') {
    if (st === 'to_causeway') advance(w);
    if (st === 'escort') { const wg = objectByKey(w, 'wagon'); if (wg) startEscort(w, wg); }
    else if (c.flags.wagon_home) { const wg = objectByKey(w, 'wagon'); if (wg) setObjectState(w, wg, 2, { hidden: true }); }
  }
  if (z.id === 'town') {
    if (st === 'gate') advance(w);
  }
  if (z.id === 'cloister' && st === 'to_cloister') advance(w);
  if (z.id === 'belfry') {
    if (st === 'to_belfry') advance(w);
    if (z.floor === 3) {
      if (currentStep(w)?.id === 'climb') advance(w);
      const center = { x: z.w / 2, z: z.h / 2 };
      if (!c.flags.malison_dead) {
        startBoss(w, 'malison', center.x, center.z, {});
        ev(w, { t: 'cut', id: 'malison_intro' });
      }
    }
  }
  placeWritCoffin(w);
  if (z.plateRoll) w.plateAt = w.time + w.rng.range(20, 60);
}

function scriptWake(w) {
  const z = w.zone;
  // Your coffin bursts and they are already here.
  for (const [dx, dz] of [[5, -2], [6, 2], [8, 0]]) {
    spawnMonster(w, 'peatwalker', z.entryX + dx, z.entryZ + dz, { state: 'chase', questTag: 'wake', from: 'ground', noXp: false });
  }
}

// ---- Events from the sim ----------------------------------------------------------------------
export function onMonsterKilled(w, m, src) {
  knellKill(w, m);
  const c = w.camp;
  if (!c) return;
  const f = c.flags;
  if (m.questTag === 'wake') {
    if (!f.first_tallow) { f.first_tallow = 1; dropTallow(w, m.x, m.z); }
    if (!w.monsters.some((o) => o.questTag === 'wake' && !o.dead)) {
      if (stepIs(w, 'wake')) {
        for (const h of w.heroes) {
          if (h.companion || h.gone) continue;
          const it = makeItem(w.lootRng, { slot: 'main', rarity: 'blessed', ilvl: 2, cls: h.cls });
          dropItem(w, h, it, m.x, m.z, 0.8);
        }
        advance(w);
      }
    }
  }
  if (src && !src.companion && !m.summoned) {
    for (const wr of c.writs) {
      if (wr.done) continue;
      if (wr.k === 'kill' && wr.zone === w.zone.id) { wr.have = (wr.have ?? 0) + 1; if (wr.have >= wr.n) finishWrit(w, wr); }
    }
  }
  if (src && !src.companion && w.rng.chance(0.03)) pyx(w, 'kill');
}

export function onHeroDied(w, h) {
  if (h.companion) { pyx(w, 'down', true); return; }
  if (w.boss?.def.boss === 'malison') say(w, 'malison', STORY_LINES.malison_kill);
}
export function onRoundLevelUp(w, h) { roundLevelUp(w, h); }

export function onItemPicked(w, h, item) {
  if ((item.rarity === 'legendary' || item.rarity === 'set') && w.camp) w.camp.legendaries = (w.camp.legendaries ?? 0) + 1;
  if (item.rarity === 'legendary' || item.rarity === 'set') pyx(w, 'loot');
}

export function onTalkStart(w, h, o) {
  if (!w.camp) return;
}

/** The dialogue finished (from the UI, or a bot). */
export function onTalkDone(w, h, npc) {
  const c = w.camp;
  if (!c) return;
  const st = currentStep(w)?.id;
  const f = c.flags;
  if (npc === 'crier') {
    if (st === 'crier') { f.crier_met = 1; f.overdue_open = 1; advance(w); return; }
    if (st === 'see_crier') { advance(w); return; }
    if (st === 'crier_truth') { advance(w); return; }
    if (f.overdue_found && !f.overdue_done) {
      f.overdue_done = 1;
      for (const a of w.heroes) if (!a.companion && !a.gone) { a.gold += 250 + 20 * a.level; dropItem(w, a, makeRolledItem(w.lootRng, a, 'reliquary', monsterLevel(w)), a.x, a.z, 1.5); }
      toast(w, 'THE OVERDUE BOOK IS RETURNED', 'sand', { big: 1 });
      ev(w, { t: 'quest_done', name: 'AN OVERDUE BOOK' });
    }
    return;
  }
  if (npc === 'brasse') {
    if (st === 'find_brasse') {
      f.brasse_met = 1;
      advance(w);
      const wg = objectByKey(w, 'wagon');
      if (wg) startEscort(w, wg);
      updateNpcs(w);
      return;
    }
    if (st === 'brasse_home') { f.forge = 1; updateNpcs(w); pyx(w, 'town'); advance(w); return; }
    return;
  }
  if (npc === 'ogive') {
    if (st === 'see_ogive') { advance(w); return; }
    if (st === 'ogive_home') {
      f.reliquary = 1;
      for (const a of w.heroes) {
        if (a.companion || a.gone) continue;
        a.gems[gemId('ember', 0)] = (a.gems[gemId('ember', 0)] ?? 0) + 1;
        a.gems[gemId('salt', 0)] = (a.gems[gemId('salt', 0)] ?? 0) + 1;
        a.gems[gemId('amber', 0)] = (a.gems[gemId('amber', 0)] ?? 0) + 1;
        const it = makeItem(w.lootRng, { slot: 'chest', rarity: 'reliquary', ilvl: monsterLevel(w), cls: a.cls, forceSocket: true });
        dropItem(w, a, it, a.x, a.z, 1.5);
      }
      advance(w);
      return;
    }
  }
}

export function onObjectUsed(w, h, o) {
  const c = w.camp;
  if (!c) return;
  const f = c.flags;
  if (o.key === 'yard_gate') {
    if (!o.locked) travel(w, 'town', 0, 'start');
    return;
  }
  if (o.kind === 'relic') {
    f[`bone_${w.zone.floor}`] = 1;
    c.bones++;
    ev(w, { t: 'fx', k: 'shrine', s: 'bell_small', x: o.x, z: o.z, r: 2 });
    toast(w, `A BONE OF SAINT GLOAM. ${c.bones} OF 3.`, 'sand', { big: 1 });
    if (c.bones >= 3 && (stepIs(w, 'bone1') || stepIs(w, 'bone2') || stepIs(w, 'bone3'))) { c.q.s = QUESTS[c.q.i].steps.findIndex((s) => s.id === 'bursar'); enterStep(w); }
    else if (stepIs(w, 'bone1') || stepIs(w, 'bone2')) advance(w);
    return;
  }
  if (o.key === 'ledger') {
    c.lore.bishops_ledger = 1;
    ev(w, { t: 'lore', id: 'bishops_ledger', seat: h.seat });
    if (stepIs(w, 'ledger')) advance(w);
    return;
  }
  if (o.key === 'overdue_book') {
    f.overdue_found = 1;
    setObjectState(w, o, 2, { hidden: true });
    toast(w, 'THE OVERDUE BOOK. FORTY YEARS LATE.', 'sand', { big: 1 });
    return;
  }
  if (o.kind === 'rope') { ringRope(w, h, o); return; }
}

export function onCoffinDone(w, o) {
  const c = w.camp;
  if (!c) return;
  if (o.key === 'coffin_quest') {
    c.flags.yard_coffin = 1;
    const g = objectByKey(w, 'yard_gate');
    if (g) { setObjectState(w, g, 0, { locked: false }); }
    ev(w, { t: 'fx', k: 'dust_ring', s: 'portcullis', x: g?.x ?? o.x, z: g?.z ?? o.z, r: 2 });
    if (stepIs(w, 'coffin')) advance(w);
  }
  for (const wr of c.writs) if (!wr.done && wr.k === 'coffin' && wr.zone === w.zone.id) finishWrit(w, wr);
}

export function onBossKilled(w, m) {
  const c = w.camp;
  onKnellBossDead(w, m);
  roundBossDead(w, m);
  if (!c) return;
  const f = c.flags;
  const first = !f[`${m.type}_dead`];
  f[`${m.type}_dead`] = 1;
  for (const wr of c.writs) if (!wr.done && wr.k === 'boss' && wr.boss === m.type) finishWrit(w, wr);
  if (w.run) return;
  if (m.type === 'bursar') {
    if (first) {
      for (const a of w.heroes) {
        if (a.companion || a.gone) continue;
        dropItem(w, a, makeItem(w.lootRng, { rarity: 'legendary', ilvl: m.level + 1, cls: a.cls, legendary: firstLegendary(w, a) }), m.x, m.z, 2);
        spawnDrop(w, { kind: 'gem', gem: gemId('ember', 0), x: m.x + 1, z: m.z, owner: a.seat });
      }
      addObject(w, 'ledger', m.x, m.z + 1.5, { key: 'ledger', label: 'THE LEDGER', announce: true, id: 1300000 });
    }
    if (stepIs(w, 'bursar')) advance(w);
  }
  if (m.type === 'ambrose') {
    say(w, 'ambrose', 'THREE TIMES. AND EVERY TIME, THE DARK WAS SINGING.');
    if (stepIs(w, 'bishop')) advance(w);
    if (first) for (const a of w.heroes) if (!a.companion && !a.gone) { dropItem(w, a, makeRolledItem(w.lootRng, a, 'reliquary', m.level + 1), m.x, m.z, 2); if (w.lootRng.chance(0.5)) dropLegendary(w, a, m.level + 1, m.x, m.z); }
  }
  if (m.type === 'malison') {
    if (first) {
      for (const a of w.heroes) {
        if (a.companion || a.gone) continue;
        dropItem(w, a, makeRolledItem(w.lootRng, a, 'legendary', m.level + 1), m.x, m.z, 2);
        dropItem(w, a, makeRolledItem(w.lootRng, a, 'set', m.level + 1), m.x, m.z, 2);
      }
    }
    ev(w, { t: 'cut', id: 'ending', first: first ? 1 : 0 });
    c.credits = true;
    w.account.unlocks.penance = true;
    w.account.unlocks.knell = true;
    if (stepIs(w, 'ring') || stepIs(w, 'malison')) { c.q.i = QUESTS.length; c.q.s = 0; ev(w, { t: 'quest_done', name: 'RING IT OR DIE TRYING' }); }
    ev(w, { t: 'autosave' });
  }
  if (m.type === 'cellarer') { c.flags.pantry_done = 1; }
}

export function onEventide(w) { if (stepIs(w, 'malison')) advance(w); }

function firstLegendary(w, h) {
  const ids = { bellwarden: 'widows_clapper', lamplighter: 'last_wick', sexton: 'second_best_crook' };
  return ids[h.cls] ?? 'clemency_shard';
}

// ---- Frame ------------------------------------------------------------------------------------
export function stepQuests(w) {
  stepKnell(w);
  const c = w.camp;
  if (!c || w.round) return;
  if (w.t % 15 === 0) stepCheap(w);
  stepEscortWagon(w);
  stepNovices(w);
}

function stepCheap(w) {
  const c = w.camp;
  const z = w.zone;
  const st = currentStep(w)?.id;
  const heroes = w.heroes.filter((h) => !h.gone && !h.dead && !h.companion);
  if (!heroes.length) return;
  // Bosses wake when you walk into their rooms.
  for (const r of z.rooms) {
    if (!r.tpl?.boss || z.bossStarted === r.index || r.tpl.boss === 'malison') continue;
    if (heroes.some((h) => h.x > r.x + 1 && h.x < r.x + r.w - 1 && h.z > r.y + 1 && h.z < r.y + r.h - 1)) {
      z.bossStarted = r.index;
      const room = r;
      const x = room.x + room.w / 2, zz = room.y + room.h / 2;
      startBoss(w, r.tpl.boss, x, zz, {});
      ev(w, { t: 'cut', id: `${r.tpl.boss}_intro` });
    }
  }
  if (st === 'east') {
    if (!c.flags.deacon && heroes.some((h) => h.x > 21)) {
      c.flags.deacon = 1;
      spawnMonster(w, 'bloat_deacon', 32, 6.5, { state: 'chase', questTag: 'deacon' });
      spawnPack(w, { x: 30, z: 3, kind: 'S' });
    }
    if (heroes.some((h) => h.x > 45)) advance(w);
  }
  if (z.id === 'causeway') {
    if (!c.flags.first_pack && z.rooms[2] && heroes.some((h) => dist(h.x, h.z, z.rooms[2].cx, z.rooms[2].cz) < 22)) {
      c.flags.first_pack = 1;
      spawnElitePack(w, { x: z.rooms[2].cx, z: z.rooms[2].cz }, z.def.monsters, { kind: 'champion', type: 'peatwalker', aff: ['tolling'] });
      pyx(w, 'elite');
    }
    if (!c.plateFirst && z.rooms[3] && heroes.some((h) => dist(h.x, h.z, z.rooms[3].cx, z.rooms[3].cz) < 16)) {
      c.plateFirst = true;
      spawnPlate(w, z.rooms[3].cx, z.rooms[3].cz);
    }
  }
  if (z.id === 'ossuary' && !c.flags.first_rare && z.rooms[2] && heroes.some((h) => dist(h.x, h.z, z.rooms[2].cx, z.rooms[2].cz) < 22)) {
    c.flags.first_rare = 1;
    spawnElitePack(w, { x: z.rooms[2].cx, z: z.rooms[2].cz }, z.def.monsters, { kind: 'rare', type: 'rattlebones', aff: ['shackled'] });
    pyx(w, 'elite');
  }
  if (w.plateAt && w.time > w.plateAt) { w.plateAt = 0; const h = heroes[0]; const p = openSpot(w, h.x + 8, h.z + 4, 4); spawnPlate(w, p.x, p.z); }
  if (st === 'novices' && !w.novices && z.id === 'cloister') {
    const nv = w.objects.find((o) => o.kind === 'novice');
    if (nv && heroes.some((h) => dist(h.x, h.z, nv.x, nv.z) < 8)) startNovices(w);
  }
  if (st === 'climb' || st === 'novices' || st === 'bishop') {
    w.tauntT = (w.tauntT ?? 25) - 0.25;
    if (w.tauntT <= 0) { w.tauntT = 45; say(w, 'malison', w.rng.pick(STORY_LINES.malison_cloister)); }
  }
  // Pyx talks when she has something to say.
  w.pyxIdle = (w.pyxIdle ?? 40) - 0.25;
  if (w.pyxIdle <= 0) { w.pyxIdle = 55; pyx(w, z.def.safe ? 'town' : 'idle'); }
  if (w.boss && !w.pyxBoss) { w.pyxBoss = true; pyx(w, 'boss'); }
  if (!w.boss) w.pyxBoss = false;
  // Spawn packs near heroes.
  stepSpawns(w, heroes);
}

export function stepSpawns(w, heroes = null) {
  const z = w.zone;
  const list = heroes ?? w.heroes.filter((h) => !h.gone && !h.dead);
  for (const s of z.spawnList) {
    if (s.done) continue;
    if (list.some((h) => dist(h.x, h.z, s.x, s.z) < 30)) {
      s.done = true;
      if (w.monsters.length < 260) spawnPack(w, s);
    }
  }
}

export function spawnPlate(w, x, z) {
  const m = spawnMonster(w, 'collection_plate', x, z, { state: 'chase', knellPts: 8 });
  ev(w, { t: 'plate', id: m.id, x, z });
  toast(w, 'THE COLLECTION PLATE! CATCH IT BEFORE IT ESCAPES', 'sand', { big: 1 });
  pyx(w, 'elite');
  return m;
}

// The wagon of bells.
function startEscort(w, wg) {
  const z = w.zone;
  const path = z.nav.path([wg.x, 0, wg.z], [z.entryX + 3, 0, z.entryZ]) ?? [[wg.x, 0, wg.z]];
  w.escort = { wg, path, i: 1, t: 8, total: 0, done: false, joined: !!w.camp.flags.pyx };
  ev(w, { t: 'fx', k: '', s: 'cart', x: wg.x, z: wg.z });
}

function stepEscortWagon(w) {
  const e = w.escort;
  if (!e || e.done || w.zone.id !== 'causeway') return;
  const wg = e.wg;
  const near = w.heroes.some((h) => !h.dead && !h.gone && dist(h.x, h.z, wg.x, wg.z) < 10);
  const blocked = w.monsters.some((m) => !m.dead && dist(m.x, m.z, wg.x, wg.z) < 2.5);
  e.moving = near && !blocked;
  if (e.moving) {
    const p = e.path[e.i];
    if (p) {
      const dx = p[0] - wg.x, dz = p[2] - wg.z, l = Math.hypot(dx, dz);
      const step = 3 * DT;
      if (l <= step) { wg.x = p[0]; wg.z = p[2]; e.i++; }
      else { wg.x += (dx / l) * step; wg.z += (dz / l) * step; }
      wg.dx = dx; wg.dz = dz;
      e.total += step;
    }
  }
  if (w.t % 12 === 0) ev(w, { t: 'objmove', id: wg.id, x: wg.x, z: wg.z, d: Math.atan2(wg.dx ?? 0, wg.dz ?? 1), m: e.moving ? 1 : 0 });
  e.t -= DT;
  if (e.t <= 0 && near) {
    e.t = 9;
    const pack = 5 + w.heroes.filter((h) => !h.gone && !h.companion).length * 2;
    for (let i = 0; i < pack * w.tuning.monsterDensity; i++) {
      const a = w.rng.range(0, Math.PI * 2);
      const p = openSpot(w, wg.x + Math.cos(a) * 9, wg.z + Math.sin(a) * 9, 3);
      const type = w.rng.chance(0.25) ? 'gibbet_drop' : 'peatwalker';
      spawnMonster(w, type, p.x, p.z, { state: 'chase', from: type === 'gibbet_drop' ? 'drop' : 'ground' });
    }
  }
  if (!e.joined && e.i > e.path.length * 0.4) { e.joined = true; w.camp.flags.pyx = 1; ensurePyx(w, wg); pyx(w, 'join', true); }
  if (e.i >= e.path.length) {
    e.done = true;
    w.camp.flags.wagon_home = 1;
    w.camp.flags.brasse_home = 1;
    w.camp.flags.pyx = 1;
    ensurePyx(w, wg);
    toast(w, 'THE WAGON IS THROUGH', 'sand', { big: 1 });
    ev(w, { t: 'fx', k: '', s: 'bell_mid', x: wg.x, z: wg.z });
    if (stepIs(w, 'escort')) advance(w);
    setObjectState(w, wg, 2, { hidden: true });
    w.escort = null;
  }
}

// The novices.
function startNovices(w) {
  const spots = w.objects.filter((o) => o.key === 'font_spot');
  w.novices = { hp: 100, t: 40, wave: 1, fonts: [], fail: 0 };
  ev(w, { t: 'event', k: 'novices', text: 'DEFEND THE NOVICES', t0: 40 });
  say(w, 'pyx', 'They are still singing. Keep them singing.');
  for (const s of spots) w.novices.fonts.push(spawnMonster(w, 'unrung_font', s.x, s.z, { state: 'chase', knellPts: 0 }));
}

function stepNovices(w) {
  const n = w.novices;
  if (!n || w.zone.id !== 'cloister') return;
  const list = w.objects.filter((o) => o.kind === 'novice');
  if (n.fail > 0) {
    n.fail -= DT;
    if (n.fail <= 0) { w.novices = null; for (const o of list) { o.hidden = false; ev(w, { t: 'obj', id: o.id, state: 0, hidden: false }); } }
    return;
  }
  n.t -= DT;
  n.wave -= DT;
  let threats = 0;
  for (const m of w.monsters) {
    if (m.dead) continue;
    for (const o of list) if (dist(m.x, m.z, o.x, o.z) < 2.2) threats++;
  }
  n.hp -= threats * 0.6 * DT;
  if (n.wave <= 0) {
    n.wave = 7;
    const nv = list[0];
    const count = (6 + w.heroes.length * 2) * w.tuning.monsterDensity;
    for (let i = 0; i < count; i++) {
      const a = w.rng.range(0, Math.PI * 2);
      const p = openSpot(w, nv.x + Math.cos(a) * 9, nv.z + Math.sin(a) * 6, 2);
      const m = spawnMonster(w, w.rng.chance(0.75) ? 'cinderling' : 'penitent', p.x, p.z, { state: 'chase', from: 'ground' });
      m.tgtNovice = true;
    }
  }
  ev(w, { t: 'event_tick', hp: Math.round(n.hp), left: Math.ceil(n.t) });
  if (n.hp <= 0) {
    ev(w, { t: 'event', k: 'novices_fail', text: 'THE SINGING HAS STOPPED' });
    for (const o of list) { o.hidden = true; ev(w, { t: 'obj', id: o.id, state: 0, hidden: true }); }
    for (const f of n.fonts) if (!f.dead) removeMonster(w, f);
    say(w, 'pyx', 'No. Not like that. Listen: another voice, further in. Hurry.');
    n.fail = 8;
    return;
  }
  if (n.t <= 0) {
    ev(w, { t: 'event', k: 'novices_done', text: 'THE NOVICES GET AWAY' });
    w.novices = null;
    for (const f of n.fonts) if (!f.dead) removeMonster(w, f);
    for (const o of list) { o.hidden = true; ev(w, { t: 'obj', id: o.id, state: 0, hidden: true }); }
    addObject(w, 'chest', list[0].x, list[0].z, { rich: true, announce: true, gem: gemId('salt', 0) });
    say(w, 'pyx', 'Go on, then. Run. Sing something cheerful. No, not that one.');
    if (stepIs(w, 'novices')) advance(w);
  }
}

// Sister Pyx.
export function ensurePyx(w, near = null) {
  const c = w.camp;
  if (!c?.flags.pyx || w.noPyx) return;
  const humans = w.heroes.filter((h) => !h.gone && !h.companion);
  const have = w.heroes.find((h) => h.companion && !h.gone);
  if (humans.length > 1) {
    if (have) { have.gone = true; ev(w, { t: 'hero_gone', id: have.id }); w.heroes.splice(w.heroes.indexOf(have), 1); say(w, 'pyx', 'You have company. I shall go and glare at something else.'); }
    return;
  }
  if (have) return;
  const lead = humans[0];
  if (!lead) return;
  const data = newHeroData('pyx', 'SISTER PYX', 'pyx');
  data.level = lead.level;
  data.skills = CLASSES.pyx.preset.map(([id]) => ({ id, tone: null })).concat([null, null, null]);
  const p = addHero(w, data, 8, { companion: true, navIndex: 5, x: (near?.x ?? lead.x) + 1, z: (near?.z ?? lead.z) + 1 });
  p.isBot = true;
  recalcHero(w, p);
  p.hp = p.stats.maxHp;
  return p;
}

export function pyx(w, key, force = false) {
  if (!w.camp?.flags.pyx || w.heroes.filter((h) => !h.companion && !h.gone).length > 1) return;
  if (!force && (w.pyxNext ?? 0) > w.time) return;
  w.pyxNext = w.time + 18;
  w.camp.pyxLines = (w.camp.pyxLines ?? 0) + 1;
  say(w, 'pyx', w.rng.pick(PYX_BANTER[key] ?? PYX_BANTER.idle));
}

// ---- Writs ------------------------------------------------------------------------------------
export function rollWrits(w) {
  const c = w.camp;
  const pool = WRIT_TEMPLATES.filter((t) => t.zone === 'yard' || c.visited[`${t.zone}:0`]);
  const list = [...pool];
  w.rng.shuffle(list);
  c.writs = list.slice(0, 3).map((t) => ({ ...t, have: 0, done: false }));
  c.writCache = false;
  ev(w, { t: 'toast', text: 'NEW WRITS POSTED', color: 'sand' });
}

function placeWritCoffin(w) {
  const c = w.camp;
  const wr = c.writs.find((x) => !x.done && x.k === 'coffin' && x.zone === w.zone.id);
  if (!wr) return;
  const room = w.zone.rooms[Math.min(1, w.zone.rooms.length - 1)];
  addObject(w, 'coffin', room.cx, room.cz, { key: 'writ_coffin', time: 30, count: 6, announce: true, id: 1200000 });
}

function finishWrit(w, wr) {
  wr.done = true;
  const c = w.camp;
  c.writsDone++;
  ev(w, { t: 'toast', text: `WRIT DONE: ${wr.text}`, color: 'lime' });
  ev(w, { t: 'sfx', k: 'quest' });
  if (c.writs.every((x) => x.done) && !c.writCache) {
    c.writCache = true;
    c.writCaches++;
    for (const a of w.heroes) {
      if (a.companion || a.gone) continue;
      a.gold += 300 + 40 * a.level;
      a.mats.dust += 6; a.mats.scrap += 12; a.mats.shards += 1;
      dropItem(w, a, makeRolledItem(w.lootRng, a, 'reliquary', monsterLevel(w)), a.x, a.z, 1.5);
    }
    toast(w, 'THE VESTRY PAYS, FOR ONCE. A WRIT CACHE.', 'sand', { big: 1 });
    ev(w, { t: 'autosave' });
  }
}

export { makeStatues, levelUp };
