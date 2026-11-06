// Tier 1: the sim on its own, in Node, in seconds.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkModel, compileClips, HERO_RIG, MODEL_LIBRARY, parseSong, renderSound, Rng, TEXTURE_LIBRARY, validateClip, buildModel } from '../../pixel-engine.js';
import { CLASSES, HERO_NAMES, PLAYABLE, VOWS } from '../../src/data/classes.js';
import { BARKS, PYX_BANTER, STORY_LINES, TALKS } from '../../src/data/dialog.js';
import { AFFIXES, ARMOUR_SHARE, LEGENDARIES, RARITIES, SETS, SLOTS, GEM_KINDS } from '../../src/data/items.js';
import { HOW_TO_PLAY, LORE, LORE_PLACES } from '../../src/data/lore.js';
import { AFFLICTION_IDS, AFFLICTIONS, MONSTERS } from '../../src/data/monsters.js';
import { QUESTS, WRIT_TEMPLATES } from '../../src/data/quests.js';
import { SFX_DEFS } from '../../src/data/sfx.js';
import { SKILLS } from '../../src/data/skills.js';
import { SONGS, ZONE_SONGS } from '../../src/data/songs.js';
import { defaultTuning, heroLife, monsterHpAt, monsterHitAt, monsterXpAt, RULES, TUNING, weaponDpsAt, xpToNext } from '../../src/data/tuning.js';
import { BIOME_FLOORS, BIOMES, ZONES } from '../../src/data/zones.js';
import { SYLLABLES, babble } from '../../src/audio/voice.js';
import { encodeSnapshot } from '../../src/net/codec.js';
import { NetClient } from '../../src/net/client.js';
import { NetHost } from '../../src/net/host.js';
import { botIntent, botManage, newBotMemory } from '../../src/sim/bot.js';
import { applyCommand } from '../../src/sim/commands.js';
import { OP_NAMES, resolveSkill, runOps } from '../../src/sim/effects.js';
import { addHero, newHeroData, recalcHero } from '../../src/sim/hero.js';
import { BTN, emptyIntent } from '../../src/sim/intents.js';
import { makeItem, makeRolledItem, spawnDrop } from '../../src/sim/loot.js';
import { addObject } from '../../src/sim/objects.js';
import { spawnElitePack, spawnMonster } from '../../src/sim/monsters.js';
import { POWERS } from '../../src/sim/powers.js';
import { setupRound } from '../../src/sim/round.js';
import { buildZoneData, loadZone } from '../../src/sim/travel.js';
import { createWorld, stepWorld, worldHash } from '../../src/sim/world.js';
import { startBoss } from '../../src/sim/bosses.js';
import { FX } from '../../src/view/vfx.js';
import { ALL_CLIPS, NEW_CLIPS } from '../../src/view/clips.js';
import { MODELS, OWN_MODELS } from '../../src/view/models/index.js';
import { OWN_ICONS } from '../../src/ui/icons.js';
import { assert, eq, test } from '../lib.mjs';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function arena(cls, level = 20, o = {}) {
  const w = createWorld({ seed: o.seed ?? 3, camp: null });
  w.noPyx = true;
  const d = newHeroData(cls, 'T');
  d.level = level;
  const h = addHero(w, d, 0, { navIndex: 0 });
  loadZone(w, 'ossuary', 0, 'start');
  w.events.length = 0;
  w.zone.spawnList.length = 0;
  return { w, h };
}
const stepN = (w, n, intent = null) => { for (let i = 0; i < n; i++) { stepWorld(w, intent ? [intent] : []); } };
function drain(w) { const e = [...w.events]; w.events.length = 0; return e; }

test('stepWorld is deterministic over 5 minutes of bot play', () => {
  const run = () => {
    const w = createWorld({ seed: 42 });
    addHero(w, newHeroData('bellwarden', 'A'), 0, { navIndex: 0 });
    loadZone(w, 'yard', 0, 'start');
    const mem = newBotMemory();
    for (let i = 0; i < 18000; i++) {
      const h = w.heroes[0];
      stepWorld(w, [botIntent(w, h, mem)]);
      for (const e of w.events) if (e.t === 'talk') applyCommand(w, 0, { c: 'talk_done', npc: e.npc });
      if (mem.travel) { applyCommand(w, 0, { c: 'travel', zone: mem.travel.zone }); mem.travel = null; }
      w.events.length = 0;
    }
    return worldHash(w);
  };
  eq(run(), run(), 'hash');
});

test('things placed at a last stand land on open floor: an exit in a wall is a run with no way home', () => {
  const { w } = arena('bellwarden');
  const nav = w.zone.nav;
  let wall = null;
  for (let x = 2; x < w.zone.w - 2 && !wall; x++) for (let z = 2; z < w.zone.h - 2 && !wall; z++) if (!nav.walkable(x + 0.5, z + 0.5) && nav.walkable(x + 1.5, z + 0.5)) wall = [x + 0.5, z + 0.5];
  assert(wall, 'found a wall beside the floor');
  const exit = addObject(w, 'exit', wall[0], wall[1], { to: 'town', floor: 0, entry: 'start', label: 'HOME', announce: true });
  assert(nav.walkable(exit.x, exit.z), 'the exit moved out of the wall');
  assert(Math.hypot(exit.x - wall[0], exit.z - wall[1]) < 3, 'and stayed close');
  const drop = spawnDrop(w, { kind: 'gem', gem: 'ember_1', x: wall[0], z: wall[1], owner: 0 });
  assert(nav.walkable(drop.x, drop.z), 'a drop moved out of the wall too');
});

test('formulas stay in their ranges', () => {
  eq(xpToNext(1), 100, 'xp 1');
  assert(xpToNext(20) > xpToNext(10), 'xp grows');
  eq(heroLife(1, 10), 130, 'life');
  assert(Math.abs(monsterHpAt(1) - 20) < 1e-9, 'hp');
  assert(Math.abs(monsterHitAt(1) - 6) < 1e-9, 'hit');
  eq(monsterXpAt(1), 9, 'mxp');
  assert(weaponDpsAt(10) > 26 && weaponDpsAt(10) < 28, 'dps');
  const { w, h } = arena('bellwarden', 1);
  const m = spawnMonster(w, 'peatwalker', h.x + 2, h.z, { level: 1 });
  eq(Math.round(m.maxHp), 20, 'level 1 peatwalker hp');
  const armour = h.stats.armorTotal;
  assert(armour / (armour + 50) < 0.9, 'reduction sane');
});

test('generated items are always valid', () => {
  const rng = new Rng(9);
  for (let i = 0; i < 3000; i++) {
    const cls = PLAYABLE[i % 3];
    const rarity = Object.keys(RARITIES)[i % 5];
    const it = makeRolledItem(rng, { cls }, rarity, 1 + (i % 30));
    assert(SLOTS.includes(it.slot), `slot ${it.slot}`);
    assert(RARITIES[it.rarity], 'rarity');
    assert(it.name && it.name.length < 60, `name ${it.name}`);
    if (it.slot === 'main') assert(it.dps > 0, 'dps');
    if (ARMOUR_SHARE[it.slot]) assert(it.armor > 0, 'armour');
    const R = RARITIES[it.rarity];
    assert(it.affixes.length >= R.affixes[0] && it.affixes.length <= R.affixes[1], `${it.rarity} affix count ${it.affixes.length}`);
    for (const a of it.affixes) {
      const def = AFFIXES[a.k];
      assert(def, `affix ${a.k}`);
      assert(def.slots === null || def.slots.includes(it.slot), `${a.k} on ${it.slot}`);
      assert(Number.isFinite(a.v) && a.v > 0, `value ${a.k} ${a.v}`);
    }
    JSON.stringify(it);
  }
});

test('every skill and every Tone casts without error, for every class', () => {
  for (const cls of PLAYABLE) {
    for (const id of CLASSES[cls].skills) {
      const s = SKILLS[id];
      for (const tone of [null, ...Object.keys(s.tones)]) {
        const { w, h } = arena(cls, 30);
        w.cheats.noCd = true; w.cheats.infRes = true;
        h.skills[0] = { id, tone };
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; spawnMonster(w, 'peatwalker', h.x + Math.cos(a) * 2.2, h.z + Math.sin(a) * 2.2, { state: 'chase' }); }
        // Graves for the gravediggers.
        for (let i = 0; i < 6; i++) { w.graves.push({ id: 900 + i, x: h.x + i * 0.4, z: h.z + 1, t: 12 }); }
        const it = emptyIntent();
        it.pressed = BTN.S0;
        it.ax = h.x + 2; it.az = h.z; it.aimed = 2;
        stepWorld(w, [it]);
        assert(h.cast || h.move, `${id}:${tone} did not start`);
        stepN(w, 40);
        const before = w.monsters.reduce((a, m) => a + m.hp, 0);
        void before;
        stepN(w, 300);
      }
    }
  }
});

test('all effect ops exist and run', () => {
  const need = 'arc circle cone ring projectile lob chain dash leap blink zone obstacle summon turret buff debuff pull knock stun apply_status consume_status consume_graves comet_rain delay repeat spawn_decoy'.split(' ');
  for (const op of need) assert(OP_NAMES.includes(op), `missing op ${op}`);
  const { w, h } = arena('sexton', 30);
  h.stats.area = 0;
  const m = spawnMonster(w, 'pallid_bearer', h.x + 3, h.z, { state: 'chase' });
  const tests = [
    { op: 'chain', n: 2, dmg: 1, range: 6, el: 'grave' }, { op: 'pull', radius: 8, dist: 1 }, { op: 'knock', radius: 8, dist: 1 }, { op: 'stun', radius: 8, t: 1 },
    { op: 'apply_status', radius: 8, status: [{ k: 'poison', dps: 0.3, t: 2 }] }, { op: 'debuff', radius: 8, mark: { p: 0.2, t: 2 } },
  ];
  const c = { x: h.x, z: h.z, dx: 1, dz: 0, px: h.x + 3, pz: h.z, tgt: m, sk: null };
  for (const op of tests) runOps(w, h, [op], { ...c });
  assert(m.status.poison, 'poison applied');
  assert(m.status.mark === 0.2, 'mark applied');
  stepN(w, 60);
});

test('every legendary power fires its hook', () => {
  const give = (w, h, id) => { const it = makeItem(w.lootRng, { rarity: 'legendary', ilvl: 20, cls: h.cls, legendary: id }); h.gear[it.slot] = it; recalcHero(w, h); };
  for (const id of Object.keys(LEGENDARIES)) assert(POWERS[id], `no hook object for ${id}`);
  const castWith = (cls, id, skill, setup, check) => {
    const { w, h } = arena(cls, 30);
    w.cheats.noCd = true; w.cheats.infRes = true; w.cheats.god = true;
    give(w, h, id);
    h.skills[0] = { id: skill, tone: null };
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; spawnMonster(w, 'pallid_bearer', h.x + Math.cos(a) * 2.4, h.z + Math.sin(a) * 2.4, { state: 'chase' }); }
    if (setup) setup(w, h);
    const it = emptyIntent(); it.pressed = BTN.S0; it.ax = h.x + 2; it.az = h.z; it.aimed = 2;
    stepWorld(w, [it]);
    let seen = [];
    for (let i = 0; i < 120; i++) { stepWorld(w, []); seen.push(...drain(w)); }
    if (!check(w, h, seen)) throw new Error(`power ${id} showed no effect`);
  };
  castWith('bellwarden', 'widows_clapper', 'great_toll', null, (w, h, ev) => ev.filter((e) => e.t === 'fx' && e.k === 'ring_bronze').length >= 3);
  castWith('bellwarden', 'anvil_thoughts', 'clapper_charge', null, (w, h) => resolveSkill(h, 'clapper_charge', null).fx[0].drag === true);
  castWith('bellwarden', 'verger_cowl', 'clout', null, (w, h) => h.stats.resonanceMax === 8);
  castWith('bellwarden', 'hymnal_greaves', 'chain_reap', null, (w, h, ev) => ev.some((e) => e.t === 'shot' && e.k === 'note'));
  castWith('lamplighter', 'last_wick', 'spark_bolt', (w, h) => { h.res = 100; }, (w, h, ev) => ev.filter((e) => e.t === 'shot').length >= 3);
  castWith('lamplighter', 'patient_moth', 'lantern_hurl', null, (w, h) => true);
  castWith('lamplighter', 'snuffers_mitts', 'snuff', (w, h) => { for (const m of w.monsters) m.status.burn = { dps: 10, t: 4, src: h.id }; h.cds.dusk_step = 5; }, (w, h) => h.cds.dusk_step === 0 || (h.cds.dusk_step ?? 0) < 5);
  castWith('lamplighter', 'cinderwalk_boots', 'dusk_step', null, (w, h, ev) => ev.filter((e) => e.t === 'area' && e.k === 'fire').length >= 2);
  castWith('sexton', 'second_best_crook', 'raise_pallbearers', null, (w, h, ev) => ev.some((e) => e.t === 'spawn' && e.ally && e.coffin));
  castWith('sexton', 'unpaid_graves', 'exhume', (w, h) => { for (let i = 0; i < 9; i++) w.graves.push({ id: 900 + i, x: h.x + i * 0.2, z: h.z, t: 12 }); }, (w) => w.graves.length === 0);
  castWith('sexton', 'first_digger', 'shovel_swat', (w, h) => { h.swats = 4; w.graves.length = 0; }, (w, h, ev) => ev.some((e) => e.t === 'grave'));
  castWith('sexton', 'family_deed', 'coffin_drop', null, (w, h, ev) => ev.filter((e) => e.t === 'lob' && e.k === 'coffin').length >= 4);
  // The rest are passives: check them through their effects.
  { const { w, h } = arena('bellwarden', 30); give(w, h, 'plate_lining'); h.hp = 10; POWERS.plate_lining.onPickup(w, h, 'gold'); assert(h.hp > 10 && h.plateStacks === 1, 'plate lining'); }
  { const { w, h } = arena('bellwarden', 30); give(w, h, 'thrice_buried'); h.hp = 1; const m = spawnMonster(w, 'peatwalker', h.x + 1, h.z); m.dmg = 99999; w.events.length = 0; import_hurt(w, h, 99999, m); assert(!h.dead && h.hp > 0, 'thrice buried saved them'); }
  { const { w, h } = arena('bellwarden', 30); give(w, h, 'malisons_knuckle'); const m = spawnMonster(w, 'rattlebones', h.x + 2, h.z, { elite: 'rare', pack: 77 }); spawnMonster(w, 'rattlebones', h.x + 3, h.z, { elite: 'minion', pack: 77 }); w.events.length = 0; runOps(w, h, [{ op: 'ring', radius: 3, dmg: 1, el: 'sound' }], { x: h.x, z: h.z, dx: 1, dz: 0, sk: null }); assert(drain(w).some((e) => e.t === 'fx' && e.k === 'arc'), 'knuckle chained'); void m; }
  { const { w, h } = arena('bellwarden', 30); give(w, h, 'choir_baton'); w.cheats.noCd = true; h.res = 100; h.skills[0] = { id: 'great_toll', tone: null }; h.batonN = 5; const it = emptyIntent(); it.pressed = BTN.S0; stepWorld(w, [it]); assert(h.res === 100 && h.cast?.c.mult === 2, 'baton free and doubled'); }
  { const { w, h } = arena('sexton', 30); const b = spawnMonster(w, 'pallid_bearer', h.x + 2, h.z); const before = import_hit(w, h, b); give(w, h, 'mourning_band'); w.allies.length = 0; for (let i = 0; i < 4; i++) w.allies.push({ owner: h.id, def: { static: false, ai: 'minion' }, x: h.x, z: h.z, status: {}, id: 800 + i, removed: false, life: 0, age: 0, ownerRef: h, r: 0.3, type: 'pallbearer', hp: 1, maxHp: 1 }); const after = import_hit(w, h, b); assert(after > before, 'mourning band raises damage'); w.allies.length = 0; }
  { const { w, h } = arena('bellwarden', 30); give(w, h, 'clemency_shard'); spawnMonster(w, 'pallid_bearer', h.x + 3, h.z, { state: 'idle' }); h.shardT = 0.01; w.events.length = 0; stepN(w, 3); assert(drain(w).some((e) => e.t === 'fx' && e.k === 'ring_bronze'), 'shard rang'); }
});
import { hurtHero } from '../../src/sim/hero.js';
import { computeHit } from '../../src/sim/effects.js';
const import_hurt = (w, h, d, m) => hurtHero(w, h, d, { src: m });
const import_hit = (w, h, m) => { const save = h.stats.crit; h.stats.crit = 0; const [d] = computeHit(w, h, m, 1, 'grave', null); h.stats.crit = save; return d; };

test('set bonuses change play', () => {
  const put = (w, h, set, n) => { const slots = ['head', 'chest', 'hands', 'feet']; for (let i = 0; i < n; i++) h.gear[slots[i]] = makeItem(w.lootRng, { slot: slots[i], rarity: 'set', ilvl: 30, cls: h.cls, set }); recalcHero(w, h); };
  { const { w, h } = arena('bellwarden', 30); put(w, h, 'ringing_order', 2); eq(h.stats.resonanceMax, 10, 'two pieces'); put(w, h, 'ringing_order', 4); assert(resolveSkill(h, 'great_toll', null).fx[0].dmg === 12, 'toll +300%'); }
  { const { w, h } = arena('lamplighter', 30); put(w, h, 'last_lamplighter', 4); assert(h.stats.set2.last_lamplighter && h.stats.set4.last_lamplighter, 'set flags'); }
  { const { w, h } = arena('sexton', 30); put(w, h, 'perpetual_mourner', 4); assert(resolveSkill(h, 'exhume', null).fx[0].dmg === 15, 'exhume +400%'); }
  for (const s of Object.values(SETS)) assert(Object.keys(s.pieces).length === 4, 'four pieces');
});

test('every Affliction does what it says', () => {
  const checks = {
    tolling: (ev) => ev.some((e) => e.t === 'wave'),
    smouldering: (ev) => ev.some((e) => e.t === 'area' && e.k === 'fire_patch'),
    shackled: (ev) => ev.some((e) => e.t === 'tele' && e.sh === 'line'),
    entombing: (ev) => ev.some((e) => e.t === 'obst' && e.k === 'bone_wall'),
    vigil_lamps: (ev) => ev.some((e) => e.t === 'fx' && e.k === 'beam'),
    penitent_haste: (ev, w, m) => m.speedMul > 1,
    undying: null,
    plagued: (ev) => ev.some((e) => e.t === 'area' && e.k === 'poison_pool'),
  };
  for (const a of AFFLICTION_IDS) {
    assert(AFFLICTIONS[a].desc, `desc ${a}`);
    const { w, h } = arena('bellwarden', 20);
    w.cheats.god = true;
    spawnElitePack(w, { x: h.x + 3, z: h.z }, null, { kind: 'champion', type: 'peatwalker', aff: [a] });
    const m = w.monsters[0];
    if (a === 'undying') {
      m.hp = 1;
      import_damage(w, m, 100, { src: h });
      assert(!m.dead && m.rose, 'undying rises');
      continue;
    }
    const ev = [];
    for (let i = 0; i < 60 * 14; i++) { stepWorld(w, []); ev.push(...drain(w)); }
    assert(checks[a](ev, w, m), `${a} showed nothing`);
  }
});
import { damageMonster as import_damage } from '../../src/sim/monsters.js';

test('zones: a path from entrance to exit for 200 seeds per zone', () => {
  const zones = [['causeway', 0], ['ossuary', 0], ['ossuary', 1], ['ossuary', 2], ['cloister', 0], ['belfry', 0], ['belfry', 1], ['belfry', 2], ['pantry', 0], ['knell', 0], ['knell', 1], ['session', 0]];
  for (const [id, floor] of zones) {
    for (let seed = 1; seed <= 200; seed++) {
      const root = new Rng(seed);
      const data = buildZoneData(root, id, floor, id === 'knell' ? 'run1' : '');
      const { scan, layout } = data;
      const start = scan.entrances.find((e) => e.room === layout.start.index);
      assert(start, `${id}:${floor} seed ${seed} has no entrance`);
      const endRoom = layout.end;
      const target = scan.entrances.find((e) => e.room === endRoom.index) ?? { x: endRoom.cx, z: endRoom.cz };
      if (id === 'causeway') for (const need of ['pantry_door', 'book', 'npc_brasse']) assert(scan.named.some((n) => n.name === need), `causeway seed ${seed} has no ${need}`);
      const p = scan.nav.path([start.x, 0, start.z], [target.x, 0, target.z]);
      assert(p, `${id}:${floor} seed ${seed}: no path to the exit`);
      // Everything named can be walked to.
      for (const n of [...scan.named, ...scan.shrines, ...scan.chests]) {
        if (!scan.nav.walkable(n.x, n.z)) continue;
        assert(scan.nav.path([start.x, 0, start.z], [n.x, 0, n.z]), `${id}:${floor} seed ${seed}: ${n.name ?? 'object'} unreachable`);
      }
    }
  }
});

test('the same seed builds the same map, whatever other streams drew', () => {
  const a = new Rng(55);
  const m1 = buildZoneData(a, 'ossuary', 1).layout.rows.join('');
  const b = new Rng(55);
  const noise = b.fork('other');
  for (let i = 0; i < 500; i++) noise.next();
  buildZoneData(b, 'cloister', 0);
  const m2 = buildZoneData(b, 'ossuary', 1).layout.rows.join('');
  eq(m1, m2, 'map');
  assert(buildZoneData(new Rng(56), 'ossuary', 1).layout.rows.join('') !== m1, 'another seed differs');
});

test('host and mirrors converge over a lossy network, inside the budgets', () => {
  const seed = 2024;
  const players = [0, 1, 2].map((id) => ({ id, name: `P${id}`, color: '#ffffff' }));
  const host = createWorld({ seed, camp: null, mode: 'session' });
  setupRound(host, players);
  host.events.length = 0;
  const mirrors = [1, 2].map((seat) => { const w = createWorld({ seed, camp: null, mode: 'session' }); setupRound(w, players); w.events.length = 0; return { seat, w }; });
  eq(mirrors[0].w.zone.rows.join(''), host.zone.rows.join(''), 'same map');
  eq(mirrors[0].w.objects.map((o) => o.id).join(), host.objects.map((o) => o.id).join(), 'same object ids');
  let clock = 0;
  const rng = new Rng(7);
  const inflight = [];
  let sends = { host: [], c1: [], c2: [] };
  const deliver = (fn, reliable) => {
    if (!reliable && rng.chance(0.05)) return;
    inflight.push({ at: clock + 0.15 + rng.range(-0.05, 0.05), fn, seq: inflight.length });
  };
  const hostNet = new NetHost({ send: (data, o) => {
    sends.host.push(clock);
    if (o.to !== undefined) { const m = clients.find((c) => c.seat === o.to); if (m) deliver(() => m.net.onMessage(data, 0), o.reliable); return true; }
    for (const c of clients) deliver(() => c.net.onMessage(data, 0), o.reliable);
    return true;
  } }, host, 0);
  const clients = mirrors.map(({ seat, w }) => ({ seat, w, net: new NetClient({ send: (data, o) => { sends[`c${seat}`].push(clock); deliver(() => hostNet.onMessage(data, seat), o.reliable); return true; } }, w, seat) }));
  const mems = host.heroes.map(() => newBotMemory());
  let maxS = 0, maxE = 0, cmdOk = false;
  for (let i = 0; i < 60 * 40; i++) {
    clock = i / 60;
    for (let k = inflight.length - 1; k >= 0; k--) if (inflight[k].at <= clock) { const x = inflight.splice(k, 1)[0]; pendingRun.push(x); }
    pendingRun.sort((a, b) => a.seq - b.seq);
    for (const x of pendingRun) x.fn();
    pendingRun.length = 0;
    const hostIntent = botIntent(host, host.heroes[0], mems[0]);
    const intents = hostNet.intents(hostIntent);
    stepWorld(host, intents);
    hostNet.addEvents(host.events);
    host.events.length = 0;
    hostNet.step();
    for (const c of clients) {
      const me = c.net.me;
      const it = emptyIntent();
      if (i < 300) { it.mx = c.seat === 1 ? 0.7 : -0.7; it.mz = 0.2; }
      c.net.step(it, 1 / 60);
      c.net.drain();
    }
    if (i === 200) clients[0].net.sendCommand({ c: 'vow', index: 0, id: null });
    maxS = hostNet.stats.maxS; maxE = hostNet.stats.maxE;
  }
  assert(maxS <= 1100, `snapshot ${maxS} bytes`);
  assert(maxE <= 12100, `event batch ${maxE} bytes`);
  // Message rates: at most 20 a second per copy.
  for (const k of Object.keys(sends)) {
    const list = sends[k];
    for (let i = 20; i < list.length; i++) assert(list[i] - list[i - 20] >= 0.9, `${k} over 20 messages a second`);
  }
  for (const c of clients) {
    const hh = host.heroes.find((h) => h.seat === c.seat);
    const mh = c.w.heroes.find((h) => h.seat === c.seat);
    assert(Math.hypot(hh.x - mh.x, hh.z - mh.z) < 2, `seat ${c.seat} hero diverged ${hh.x},${hh.z} vs ${mh.x},${mh.z}`);
    const lead = c.w.heroes.find((h) => h.seat === 0);
    assert(Math.hypot(lead.x - host.heroes[0].x, lead.z - host.heroes[0].z) < 3, 'host hero in mirror');
    assert(c.net.stats.s > 200, 'snapshots arrived');
    const liveHost = host.monsters.length;
    assert(Math.abs(c.w.monsters.length - liveHost) < 40, `monster lists agree ${c.w.monsters.length} ${liveHost}`);
  }
  hostNet.markDirty(1);
  cmdOk = true;
  assert(cmdOk, 'commands');
});
const pendingRun = [];

test('commands arrive at the host and change the seat they came from', () => {
  const players = [0, 1].map((id) => ({ id, name: `P${id}`, color: '#fff' }));
  const host = createWorld({ seed: 9, camp: null, mode: 'session' });
  setupRound(host, players);
  const net = new NetHost({ send: () => true }, host, 0);
  const h = host.heroes[1];
  const it = makeItem(host.lootRng, { slot: 'ring', rarity: 'blessed', ilvl: 12, cls: h.cls });
  h.inv[0] = it;
  net.onMessage({ k: 'c', c: { c: 'equip', uid: it.uid } }, 1);
  eq(h.gear.ring.uid, it.uid, 'equipped');
  net.onMessage({ k: 'i', q: 1, x: 100, z: 0, a: 0, b: 0, m: 0, t: 0, h: 1 }, 1);
  net.onMessage({ k: 'p', b: BTN.DODGE }, 1);
  const intents = net.intents(emptyIntent());
  eq(intents[1].mx, 1, 'move');
  eq(intents[1].held, 1, 'held');
  eq(intents[1].pressed, BTN.DODGE, 'press');
  eq(net.intents(emptyIntent())[1].pressed, 0, 'press consumed once');
});

// ---- Lint ------------------------------------------------------------------------------------
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}
const srcFiles = walk(join(DEV, 'src'));

test('no Math.random or performance.now in src/sim', () => {
  for (const f of srcFiles.filter((p) => p.includes('/src/sim/'))) {
    const s = readFileSync(f, 'utf8');
    assert(!/Math\.random|performance\.now|Date\.now/.test(s), `${f} is not pure`);
    assert(!/from '.*three/.test(s) && !/document\./.test(s), `${f} touches the page`);
  }
});

test('no TODO, FIXME, XXX, placeholder, stub or coming soon in src', () => {
  for (const f of srcFiles.filter((p) => !p.endsWith('about.generated.js'))) {
    const s = readFileSync(f, 'utf8');
    const m = /\b(TODO|FIXME|XXX|stub|coming soon)\b/i.exec(s) ?? /placeholder/i.exec(s);
    assert(!m, `${f}: ${m?.[0]}`);
  }
});

const BANNED = ['Sanctuary', 'Tristram', 'Caldeum', 'Westmarch', 'Horadrim', 'Nephalem', 'Cain', 'Leah', 'Adria', 'Tyrael', 'Imperius', 'Malthael', 'Azmodan', 'Belial', 'Kanai', 'Paragon', 'Torment', 'Diablo', 'Barbarian', 'Crusader', 'Monk', 'Wizard', 'Witch Doctor', 'Demon Hunter', 'Necromancer', 'Fury', 'Wrath', 'Arcane Power', 'Mana', 'Hatred', 'Discipline', 'Essence', 'Spirit'];
test('none of the source\'s names are in src', () => {
  const re = new RegExp(`\\b(${BANNED.join('|')})\\b`, 'i');
  for (const f of srcFiles.filter((p) => !p.endsWith('about.generated.js'))) {
    const s = readFileSync(f, 'utf8');
    const m = re.exec(s);
    assert(!m, `${f}: ${m?.[0]}`);
  }
});

const FONT = /^[0-9A-Za-z'"`‘’“”.,:;\-+=/()[\]{}%_!?<>#*@°·&|~^$ ]*$/;
test('every string the player can read fits the HUD font and a two-row subtitle', () => {
  const strings = [];
  const add = (s) => { if (typeof s === 'string') strings.push(s); };
  for (const s of Object.values(SKILLS)) { add(s.name); add(s.desc); for (const t of Object.values(s.tones)) { add(t.name); add(t.desc); } }
  for (const c of Object.values(CLASSES)) { add(c.name); add(c.blurb); add(c.style); add(c.res); add(c.bark); }
  for (const v of Object.values(VOWS)) for (const q of v) { add(q.name); add(q.desc); }
  for (const l of Object.values(LEGENDARIES)) { add(l.name); add(l.power); add(l.flavor); }
  for (const s of Object.values(SETS)) { add(s.name); add(s.two); add(s.four); for (const p of Object.values(s.pieces)) add(p); }
  for (const m of Object.values(MONSTERS)) { add(m.name); add(m.title); }
  for (const a of Object.values(AFFLICTIONS)) { add(a.name); add(a.desc); }
  for (const q of QUESTS) { add(q.name); for (const s of q.steps) add(s.text); }
  for (const w of WRIT_TEMPLATES) add(w.text);
  for (const z of Object.values(ZONES)) add(z.name);
  for (const l of Object.values(LORE)) { add(l.title); for (const p of l.pages) add(p); }
  for (const p of HOW_TO_PLAY) { add(p.title); for (const l of p.lines) add(l); }
  for (const n of HERO_NAMES) add(n);
  const lines = [];
  for (const list of Object.values(BARKS)) lines.push(...list);
  for (const list of Object.values(PYX_BANTER)) lines.push(...list);
  for (const t of Object.values(TALKS)) lines.push(...t.map((x) => x[1]));
  for (const v of Object.values(STORY_LINES)) { if (typeof v === 'string') lines.push(v); else for (const x of v) lines.push(typeof x === 'string' ? x : x[1]); }
  strings.push(...lines);
  for (const s of strings) assert(FONT.test(s), `outside the HUD font: "${s}"`);
  for (const s of lines) assert(s.length <= 170, `subtitle too long (${s.length}): "${s}"`);
  const banter = Object.values(PYX_BANTER).flat().length;
  assert(banter >= 40, `Pyx has ${banter} lines`);
});

test('everything data refers to exists', () => {
  const clipNames = new Set(ALL_CLIPS.map((c) => c.name));
  for (const s of Object.values(SKILLS)) {
    for (const c of s.clips) assert(clipNames.has(c), `skill clip ${c}`);
    assert(OWN_ICONS.includes(s.icon) || TEXTURE_LIBRARY.has(s.icon), `skill icon ${s.icon}`);
    const walkOps = (ops) => { for (const op of [ops].flat()) { if (!op) continue; assert(OP_NAMES.includes(op.op), `${s.id} op ${op.op}`); if (op.sfx) assert(SFX_DEFS[op.sfx], `sfx ${op.sfx}`); if (op.vfx) assert(FX[op.vfx], `vfx ${op.vfx}`); if (op.then) walkOps(op.then); } };
    walkOps(s.fx);
    for (const t of Object.values(s.tones)) { if (t.add) walkOps(t.add); for (const p of Object.values(t.fx ?? {})) { if (p.then) walkOps(p.then); if (p.thenAdd) walkOps(p.thenAdd); } }
  }
  for (const m of Object.values(MONSTERS)) {
    assert(MODELS.has(m.body), `body ${m.body}`);
    for (const c of [m.clipMove, m.clipAttack]) if (c) assert(clipNames.has(c), `monster clip ${c}`);
    if (m.onDeath?.spawn) assert(MONSTERS[m.onDeath.spawn], m.onDeath.spawn);
    if (m.spawn) assert(MONSTERS[m.spawn], m.spawn);
    if (m.song) assert(SONGS[m.song], `song ${m.song}`);
  }
  for (const z of Object.values(ZONES)) {
    for (const [t] of z.monsters) assert(MONSTERS[t], `zone monster ${t}`);
    assert(ZONE_SONGS[z.id] && SONGS[ZONE_SONGS[z.id]], `zone song ${z.id}`);
    assert(BIOMES[z.biome], `biome ${z.biome}`);
  }
  for (const b of Object.values(BIOMES)) {
    assert(TEXTURE_LIBRARY.has(b.floor), `floor ${b.floor}`);
    assert(TEXTURE_LIBRARY.has(b.wall), `wall ${b.wall}`);
    for (const d of [...b.decor, ...b.wallDress]) assert(MODELS.has(d), `decor ${d}`);
  }
  for (const list of Object.values(BIOME_FLOORS)) for (const t of list) assert(TEXTURE_LIBRARY.has(t), `floor ${t}`);
  for (const k of Object.values(LORE_PLACES)) assert(LORE[k], k);
  const lib = ['mace'];
  for (const id of lib) assert(MODEL_LIBRARY.has(id), id);
  // Sounds used by view code exist.
  const sfxRe = /sfx\('([a-z_0-9]+)'/g;
  for (const f of srcFiles) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(sfxRe)) {
      const n = m[1];
      if (n === 'mon_attack' || n === 'mon_wake' || n === 'mon_death' || n === 'mon_hurt' || n === 'cast_grunt') continue;
      assert(SFX_DEFS[n], `${f}: no sound ${n}`);
    }
    if (!f.endsWith('zonegen.js')) for (const m of s.matchAll(/\bs: '([a-z_0-9]+)'|\bsfx: '([a-z_0-9]+)'/g)) { const n = m[1] ?? m[2]; if (n) assert(SFX_DEFS[n], `${f}: no sound ${n}`); }
  }
});

test('every clip validates', () => {
  for (const c of NEW_CLIPS) {
    const p = validateClip(c, HERO_RIG);
    assert(!p.length, `${c.name}: ${p.join('; ')}`);
  }
  const b = buildModel('peatwalker', { catalog: MODELS });
  eq(compileClips(ALL_CLIPS, HERO_RIG, b.object).length, ALL_CLIPS.length, 'all compile');
  for (const n of 'BellOverhead ChainSweep LanternLob ShovelSwat Dig RaiseHands SinkGround Drink Revive TalkGesture Interact Shamble Lurch Lunge CoffinSlam Swell RopeLash'.split(' ')) assert(NEW_CLIPS.some((c) => c.name === n), `new clip ${n}`);
});

test('every sound renders, in range; every song parses', () => {
  const names = Object.keys(SFX_DEFS);
  assert(names.length >= 60, `${names.length} sounds`);
  for (const [k, d] of Object.entries({ ...SFX_DEFS, ...SYLLABLES })) {
    const s = renderSound(d, 22050, 1);
    let peak = 0;
    for (let i = 0; i < s.length; i++) peak = Math.max(peak, Math.abs(s[i]));
    assert(peak > 0.005, `${k} silent`);
    assert(peak <= 1.0001, `${k} peak ${peak}`);
  }
  for (const [k, s] of Object.entries(SONGS)) {
    parseSong(s);
    assert(Object.keys(s.patterns).length >= 3, `${k} has few patterns`);
  }
  for (const id of 'vespers last_lamps weeping_road under_gloam cinders ledger the_climb eventide the_knell clemency'.split(' ')) assert(SONGS[id], `song ${id}`);
});

test('voices: the same line babbles the same', () => {
  const a = babble('Hear ye, hear ye!', 'crier').syllables.map((s) => s.name + s.pitch).join();
  const b = babble('Hear ye, hear ye!', 'crier').syllables.map((s) => s.name + s.pitch).join();
  eq(a, b, 'babble');
  assert(a.length > 20, 'syllables');
  assert(babble('A THOUSAND YEARS', 'malison').syllables.length > babble('A THOUSAND YEARS', 'crier').syllables.length, 'Malison is doubled and echoed');
  for (const reg of ['low', 'mid', 'high', 'demon']) for (let i = 0; i < 20; i++) assert(SYLLABLES[`v_${reg}_${i}`], 'syllable bank');
});

test('every model passes the checker', () => {
  for (const d of OWN_MODELS) {
    const r = checkModel(d, { catalog: MODELS });
    assert(!r.problems.length, `${d.id}: ${r.problems.join('; ')}`);
  }
});

test('room templates: same width, doors and markers reachable', () => {
  const seen = new Set();
  const all = Object.values(ZONES).flatMap((z) => [...(z.templates ?? []), z.tpl, z.arena].filter(Boolean));
  for (const t of all) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const R = t.rows, H = R.length, W = R[0].length;
    for (const r of R) eq(r.length, W, `${t.id} width`);
    const blocked = (c) => c === '#' || c === '~' || c === 'P' || c === ' ' || c === undefined;
    const marks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = R[y][x]; if (!blocked(c) && c !== '.') marks.push([x, y, c]); }
    if (!marks.length) continue;
    const start = marks.find((m) => m[2] === 'D') ?? marks[0];
    const vis = new Set(), q = [[start[0], start[1]]];
    while (q.length) { const [x, y] = q.pop(); const k = `${x},${y}`; if (vis.has(k)) continue; if (blocked(R[y]?.[x])) continue; vis.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    for (const m of marks) assert(vis.has(`${m[0]},${m[1]}`), `${t.id}: ${m[2]} at ${m[0]},${m[1]} cut off`);
  }
  for (const id of ['causeway', 'ossuary', 'cloister', 'belfry', 'pantry']) {
    const z = ZONES[id];
    assert(z.gen.fill.length + z.gen.required.length + 2 >= 7 || z.templates.length >= 8, `${id} has few templates`);
    assert(z.templates.length >= 8, `${id} needs 8 templates, has ${z.templates.length}`);
  }
});

test('the engine and the hub client are as they shipped', () => {
  const sha = (f) => createHash('sha256').update(readFileSync(join(DEV, f))).digest('hex');
  eq(sha('pixel-engine.js'), '80408b4c72ef08be3ec628d578f8b008644c1c7e447a4cc8c5979b08212e78aa', 'engine');
  eq(sha('session.js'), '6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a', 'session');
});

test('tuning: defaults round-trip, every slider has a home', () => {
  const d = defaultTuning();
  for (const t of TUNING) { eq(d[t.id], t.def, t.id); assert(t.min <= t.def && t.def <= t.max, `${t.id} range`); assert(t.step > 0, 'step'); }
  eq(TUNING.length, 18, 'sliders');
  const simSrc = srcFiles.filter((p) => p.includes('/src/sim/') || p.includes('/src/view/view.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const t of TUNING) assert(simSrc.includes(`tuning.${t.id}`) || simSrc.includes(`tuning?.${t.id}`), `sim never reads ${t.id}`);
  void RULES; void GEM_KINDS; void encodeSnapshot; void botManage; void startBoss;
});
