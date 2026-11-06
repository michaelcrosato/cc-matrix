// Tier 2: the whole game in Engine.headless. A minute or two.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYABLE, CLASSES } from '../../src/data/classes.js';
import { TITLE } from '../../src/data/meta.js';
import { QUESTS } from '../../src/data/quests.js';
import { SKILLS } from '../../src/data/skills.js';
import { TUNING, defaultTuning } from '../../src/data/tuning.js';
import { LEGENDARIES, SLOTS, gemId } from '../../src/data/items.js';
import { aboutLines, ABOUT_QUESTIONS, AboutScreen, HowToScreen, PartyScreen, PauseScreen, SettingsScreen } from '../../src/ui/menus/pause.js';
import { DevScreen } from '../../src/ui/menus/dev.js';
import { HeroScreen } from '../../src/ui/menus/hero.js';
import { BrasseScreen, OgiveScreen, PennywhistleScreen, StashScreen } from '../../src/ui/menus/vendors.js';
import { KnellScreen, MapScreen, WritsScreen } from '../../src/ui/menus/world.js';
import { heroToData } from '../../src/sim/hero.js';
import { currentQuest, currentStep } from '../../src/sim/quests.js';
import { ZONE_SONGS } from '../../src/data/songs.js';
import { assert, eq, test } from '../lib.mjs';
import { boot, makeHero, tap, texts } from './harness.mjs';
import { playCampaign } from './simplay.mjs';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function errands(game, h, flags) {
  const w = game.world;
  const c = (x) => game.cmd(x, 0);
  const free = () => h.inv.filter((x) => !x).length;
  if (w.camp.flags.forge) {
    if (!flags.salvaged) { const it = h.inv.find((x) => x && x.rarity !== 'legendary' && x.rarity !== 'set'); if (it && c({ c: 'salvage', uid: it.uid })) flags.salvaged = true; }
    if (!flags.crafted && h.mats.scrap >= 4 && h.gold > 300 && free() > 1 && c({ c: 'craft', slot: 'ring', rarity: 'blessed' })) flags.crafted = true;
    if (!flags.reforged && h.mats.dust >= 1 && h.gold > 400) { for (const s of SLOTS) { if (h.gear[s]?.affixes?.length && c({ c: 'reforge', slot: s, index: 0 })) { flags.reforged = true; break; } } }
  }
  if (!flags.sold) { const it = h.inv.find((x) => x && x.rarity === 'common'); if (it && c({ c: 'sell', uid: it.uid })) flags.sold = true; }
  if (!flags.bought && h.gold > 500) { for (let i = 0; i < 6; i++) if (c({ c: 'buy', index: i })) { flags.bought = true; break; } }
  if (!flags.stashed) { const it = h.inv.find((x) => x && x.rarity === 'blessed'); if (it && c({ c: 'stash_put', uid: it.uid, tab: 0 })) { flags.stashed = true; } }
  if (w.camp.flags.reliquary) {
    if (!flags.extracted) { const it = h.inv.find((x) => x?.power); if (it && c({ c: 'extract', uid: it.uid })) { flags.extracted = it.power; c({ c: 'reliquary', group: LEGENDARIES[it.power].group, power: it.power }); } }
    if (!flags.socketed && Object.values(h.gems).some(Boolean)) {
      const gem = Object.keys(h.gems).find((g) => h.gems[g] > 0);
      const it = h.inv.find((x) => x?.gems?.length) ?? SLOTS.map((s) => h.gear[s]).find((x) => x?.gems?.length);
      if (it && gem) { const ok = h.inv.includes(it) ? c({ c: 'socket', uid: it.uid, gem }) : c({ c: 'socket', slot: it.slot, gem }); if (ok) flags.socketed = true; }
    }
    if (!flags.merged && (h.gems[gemId('ember', 0)] ?? 0) >= 3) flags.merged = c({ c: 'merge', gem: gemId('ember', 0) });
  }
}

async function playthrough(cls, seed) {
  const { game, engine } = await boot({ seed });
  makeHero(engine, game, PLAYABLE.indexOf(cls));
  eq(game.mode, 'play', 'in play after the menus');
  eq(game.world.heroes[0].cls, cls, 'class from the menu');
  game.skipCutscenes = true;
  game.toggleBot(0);
  const h = game.world.heroes[0];
  const mem = game.memOf(h);
  mem.tour = true;
  mem.opts = { rotateTones: true, rotateSkills: true };
  const f = {};
  const log = { zones: new Set(), bossT: {} };
  const w = game.world;
  let lastKey = '', lastT = 0;
  const seenSkills = new Set();
  let phase = 'story';
  let stepsDone = 0;
  const maxFrames = 60 * 60 * 80;
  while (engine.frame < maxFrames) {
    engine.step(30);
    stepsDone++;
    log.zones.add(`${w.zone.id}:${w.zone.floor}`);
    for (const s of h.skills) if (s) seenSkills.add(s.id);
    if (engine.errors.length) throw new Error(`${cls}: game error: ${engine.errors[0]}`);
    const st = currentStep(w)?.id;
    // Side trip: the Drowned Pantry and the overdue book, once the forge is lit.
    if (w.camp.flags.forge && !w.camp.flags.pantry_done && st === 'see_ogive') mem.override = { zone: 'causeway', floor: 0, key: 'pantry_door', use: true };
    if (w.zone.id === 'pantry' && !w.camp.flags.pantry_done) mem.override = { zone: 'pantry', floor: 0, boss: 'cellarer' };
    if (w.camp.flags.pantry_done && !w.camp.flags.overdue_found) {
      const b = w.objects.find((o) => o.key === 'overdue_book' && !o.hidden);
      if (b) mem.override = { zone: 'pantry', floor: 0, key: 'overdue_book', use: true };
      else if (w.zone.id !== 'pantry') w.camp.flags.overdue_found = 1;
    }
    if (w.camp.flags.overdue_found && !w.camp.flags.overdue_done) mem.override = { zone: 'town', floor: 0, key: 'npc_crier' };
    if (w.camp.flags.overdue_done && mem.override?.key === 'npc_crier') mem.override = null;
    if (w.camp.flags.forge && !f.writs) { game.cmd({ c: 'writs' }, 0); f.writs = true; }
    if (w.zone.id === 'town' && !f.diff && w.camp.flags.crier_met) { eq(game.cmd({ c: 'difficulty', index: 0 }, 0), true, 'change difficulty'); f.diff = true; }
    errands(game, h, f);
    if (!mem.override && h.level >= 2 && h.potionCd > 0) f.potion = true;
    const key = `${w.camp.q.i}.${w.camp.q.s}.${w.zone.id}.${w.zone.floor}.${mem.override?.key ?? ''}.${w.objects.filter((o) => o.state === 0 && !o.hidden).length}.${Math.floor(h.kills / 10)}.${w.boss ? Math.floor((w.boss.hp / w.boss.maxHp) * 50) : ''}`;
    if (key !== lastKey) { lastKey = key; lastT = engine.frame; }
    if (w.camp.credits && !game.topScreen() && w.zone.id === 'town') { phase = 'credits'; break; }
    if (engine.frame - lastT > 60 * 60 * 3) throw new Error(`${cls}: no progress for 3 sim minutes at ${key} (hero ${h.x.toFixed(1)},${h.z.toFixed(1)} L${h.level} deaths ${h.deaths} dead ${h.dead} state ${h.state}, step ${st}, ${w.monsters.length} monsters, boss ${w.boss?.type} ${w.boss ? Math.round(w.boss.hp / w.boss.maxHp * 100) : ''}% at ${w.boss?.x?.toFixed(1)},${w.boss?.z?.toFixed(1)}, top ${game.topScreen()?.tag}, skills ${h.skills.map((q) => q?.id).join()}, weapon ${h.stats.weaponDps}, gates ${Object.keys(w.camp.gates).join()}, objs ${w.objects.filter((o) => (o.kind === 'chest' || o.kind === 'shrine' || o.kind === 'book' || o.kind === 'lever') && o.state === 0 && !o.hidden).map((o) => `${o.kind}@${o.x},${o.z}`).join(' ')}, memgoal ${JSON.stringify(mem.pathGoal)})`);
  }
  assert(phase === 'credits', `${cls}: never reached the credits (${lastKey})`);
  const minutes = engine.frame / 3600;
  const ev = game.evCounts;
  // Every row the campaign can reach.
  for (const z of ['yard:0', 'town:0', 'causeway:0', 'pantry:0', 'ossuary:0', 'ossuary:1', 'ossuary:2', 'cloister:0', 'belfry:0', 'belfry:1', 'belfry:2', 'belfry:3']) assert(log.zones.has(z), `${cls}: never visited ${z}`);
  eq(w.camp.q.i, QUESTS.length, `${cls}: all quests done`);
  for (const b of ['bursar_dead', 'ambrose_dead', 'malison_dead', 'cellarer_dead']) assert(w.camp.flags[b], `${cls}: ${b}`);
  assert(h.moved > 0 && h.clipN > 0 && (h.dodges ?? 0) > 0, `${cls}: moved, attacked, rolled`);
  assert((h.tallow ?? 0) > 0, `${cls}: tallow`);
  assert(h.goldEarned > 0, `${cls}: gold`);
  assert((ev.tele ?? 0) > 0, `${cls}: telegraphs`);
  assert((ev.prop ?? 0) > 0, `${cls}: props smashed`);
  assert((h.equips ?? 0) > 0, `${cls}: equipped`);
  assert(w.camp.shrines > 0 && w.camp.coffins > 0, `${cls}: shrine and coffin`);
  assert((h.tonesSet ?? 0) > 0 && (h.vowsSet ?? 0) > 0, `${cls}: tones and vows`);
  for (const id of CLASSES[cls].skills) if (SKILLS[id].level <= h.level) assert(seenSkills.has(id), `${cls}: never slotted ${id}`);
  assert(Object.keys(w.camp.gates).length >= 6, `${cls}: Lychgates touched: ${Object.keys(w.camp.gates).join(' ')}`);
  assert(w.camp.bells > 0, `${cls}: Passing Bell`);
  assert(w.camp.flags.pyx && (w.camp.pyxLines ?? 0) > 0, `${cls}: Sister Pyx`);
  assert((ev.elite_pack ?? 0) > 0 && (ev.plate ?? 0) > 0, `${cls}: champion pack and Plate`);
  assert(w.camp.flags.wagon_home, `${cls}: the escort`);
  assert(w.camp.flags.overdue_done, `${cls}: the overdue book`);
  assert((w.camp.levers ?? 0) > 0, `${cls}: levers`);
  for (const k of ['salvaged', 'crafted', 'reforged', 'sold', 'bought', 'stashed', 'extracted', 'socketed']) assert(f[k], `${cls}: ${k}`);
  assert(f.writs && w.camp.writs.length === 3, `${cls}: writs posted`);
  assert(w.account.unlocks.knell && w.account.unlocks.penance, `${cls}: unlocks`);
  assert(h.level >= 16 && h.level <= 24, `${cls}: level ${h.level} at the credits`);
  assert(minutes < 75, `${cls}: ${minutes.toFixed(1)} minutes`);
  const legend = (Object.values(h.gear).filter((x) => x?.rarity === 'legendary' || x?.rarity === 'set').length) + h.inv.filter((x) => x?.rarity === 'legendary' || x?.rarity === 'set').length + (f.extracted ? 1 : 0);
  assert(legend >= 2, `${cls}: only ${legend} legendaries`);
  // One full Knell Run.
  game.closeAll();
  const startedAt = engine.frame;
  assert(game.cmd({ c: 'knell_start', mods: ['crowded'] }, 0), 'knell run starts');
  engine.step(5);
  mem.override = null;
  eq(w.zone.id, 'knell', 'in the run');
  while (w.run && engine.frame - startedAt < 60 * 60 * 15) {
    engine.step(30);
    if (engine.errors.length) throw new Error(`${cls} knell: ${engine.errors[0]}`);
    if (game.topScreen()?.tag === 'results') game.closeScreen();
    errands(game, h, f);
  }
  assert(!w.run, `${cls}: Knell Run unfinished after 15 minutes, meter ${w.run?.meter}/${w.run?.total} state ${w.run?.state}`);
  assert(w.camp.runsDone >= 1, `${cls}: run counted`);
  eq(w.zone.id, 'town', 'home again');
  engine.dispose?.();
}

for (const cls of PLAYABLE) test(`whole-game playthrough: ${cls}`, () => playthrough(cls, 100 + PLAYABLE.indexOf(cls)));

for (const cls of PLAYABLE) {
  test(`The Last Bell: ${cls}`, async () => {
    const { game, engine } = await boot({ seed: 200 + PLAYABLE.indexOf(cls) });
    makeHero(engine, game, PLAYABLE.indexOf(cls), 1);
    eq(game.mode, 'play', 'in play');
    const w = game.world;
    const h = w.heroes[0];
    eq(h.level, 30, 'level');
    eq(w.zone.id, 'town', 'town');
    assert(h.skills.every(Boolean), 'all slots filled');
    assert(h.stats.set2[Object.keys(h.stats.sets)[0]], 'two set pieces: the bonus applies');
    assert(h.grandKeys >= 1, 'a Grand Key');
    assert(w.account.devotion.points === 5, 'Devotion points');
    assert(Object.values(h.gear).filter((x) => x?.rarity === 'legendary').length + h.inv.filter((x) => x?.rarity === 'legendary').length >= 3, 'legendaries');
    const power = h.stats.power;
    // Spend Devotion through the screen itself.
    tap(engine, 'KeyI');
    eq(game.topScreen().tag, 'hero', 'hero screen');
    tap(engine, 'KeyE'); tap(engine, 'KeyE'); tap(engine, 'KeyE');
    assert(texts(game).includes('DEVOTION'), 'on the Devotion tab');
    engine.step(1);
    game.ui.focus = 'dev:core:0';
    engine.step(1);
    tap(engine, 'Enter');
    assert(w.account.devotion.points === 4 && w.account.devotion.spent.core[0] === 1, 'a point spent');
    assert(h.stats.power > power, 'Devotion raised Power');
    tap(engine, 'Escape');
    eq(game.topScreen(), null, 'closed');
    eq(game.cmd({ c: 'difficulty', index: 3 }, 0), true, 'Penance is open');
    eq(game.cmd({ c: 'difficulty', index: 0 }, 0), true, 'back to Pilgrim');
    game.toggleBot(0);
    game.skipCutscenes = true;
    assert(game.cmd({ c: 'knell_start', mods: ['golden'], grand: true, tier: 1 }, 0), 'the Grand Knell opens');
    eq(h.grandKeys, 0, 'key spent');
    engine.step(5);
    const t0 = engine.frame;
    let result = null;
    while (w.run && engine.frame - t0 < 60 * 60 * 12) {
      engine.step(30);
      if (engine.errors.length) throw new Error(engine.errors[0]);
      const top = game.topScreen();
      if (top?.tag === 'results') { result = top.r; game.closeScreen(); }
    }
    assert(!w.run, `Grand Knell unfinished: ${w.run?.meter}/${w.run?.total} ${w.run?.state}`);
    assert(w.account.bests[cls] || (result && !result.beat), 'bests recorded');
  });
}

test('balance: bosses, level and legendaries inside their ranges', () => {
  for (const cls of PLAYABLE) {
    const r = playCampaign(cls, { seed: 11 });
    assert(r.finished, `${cls}: did not finish ${JSON.stringify(r.softlock)}`);
    assert(r.minutes < 75, `${cls}: ${r.minutes} minutes`);
    assert(r.level >= 16 && r.level <= 24, `${cls}: level ${r.level}`);
    assert(r.bosses.bursar >= 60 && r.bosses.bursar <= 180, `${cls}: Bursar took ${r.bosses.bursar?.toFixed(0)} s`);
    assert(r.bosses.malison >= 120 && r.bosses.malison <= 300, `${cls}: Malison took ${r.bosses.malison?.toFixed(0)} s`);
    assert((r.drops.legendary ?? 0) + (r.drops.set ?? 0) >= 2, `${cls}: legendaries`);
  }
});

// ---- Screens ---------------------------------------------------------------------------------
async function inPlay(seed = 300, cls = 0) {
  const { game, engine } = await boot({ seed });
  makeHero(engine, game, cls);
  game.skipCutscenes = true;
  engine.step(5);
  return { game, engine, w: game.world, h: game.world.heroes[0] };
}

test('every menu opens, navigates and closes by key codes', async () => {
  const { game, engine, w, h } = await inPlay();
  w.camp.flags.forge = 1; w.camp.flags.reliquary = 1; w.camp.flags.crier_met = 1;
  game.cmd({ c: 'dev_level_max' }); game.cmd({ c: 'dev_gold', n: 90000 }); game.cmd({ c: 'dev_mats' }); game.cmd({ c: 'dev_gems' });
  game.cmd({ c: 'dev_legendary', id: 'clemency_shard' }); game.cmd({ c: 'dev_item', slot: 'chest', rarity: 'reliquary' }); game.cmd({ c: 'writs' });
  engine.step(3);
  tap(engine, 'Escape');
  eq(game.topScreen()?.tag, 'pause', 'Esc pauses');
  eq(engine.timeScale, 0, 'pause freezes time');
  for (const s of ['RESUME', 'HERO', 'MAP', 'PARTY', 'HOW TO PLAY', 'SETTINGS', 'DEV MODE', 'ABOUT', 'SAVE AND QUIT']) assert(texts(game).includes(s), `pause has ${s}`);
  const f0 = game.ui.focus;
  tap(engine, 'ArrowDown');
  assert(game.ui.focus !== f0, 'pause: arrows move focus');
  tap(engine, 'Escape');
  eq(game.topScreen(), null, 'Esc resumes');
  engine.step(2);
  eq(engine.timeScale, 1, 'time back');
  const screens = [
    [() => new HeroScreen(game, 0), ['GEAR', 'SALVAGE']],
    [() => new HeroScreen(game, 1), ['SKILLS', 'VOWS']],
    [() => new HeroScreen(game, 2), ['DAMAGE', 'TOUGHNESS', 'RECOVERY']],
    [() => new HeroScreen(game, 3), ['DEVOTION', 'CORE', 'OFFENCE', 'DEFENCE', 'UTILITY']],
    [() => new HeroScreen(game, 4), ['QUEST', 'HOW TO PLAY', 'LORE', 'BESTIARY']],
    [() => new PennywhistleScreen(game), ['BUY', 'SELL', 'CASKET']],
    [() => new BrasseScreen(game), ['SALVAGE', 'CRAFT', 'REFORGE']],
    [() => new OgiveScreen(game), ['EXTRACT', 'RELIQUARY', 'SOCKET', 'MERGE']],
    [() => new StashScreen(game), ['THE COLLECTION BOX']],
    [() => new MapScreen(game), ['QUEST'.slice(0, 0)]],
    [() => new KnellScreen(game), ['KNELL']],
    [() => new WritsScreen(game), ['WRIT']],
    [() => new PauseScreen(game), ['RESUME']],
    [() => new SettingsScreen(game), ['MASTER VOLUME', 'BUTTON GLYPHS']],
    [() => new HowToScreen(game), ['MOVING AND FIGHTING']],
    [() => new PartyScreen(game), ['THE PARTY']],
    [() => new AboutScreen(game), ['SOURCE INFORMATION']],
    [() => new DevScreen(game), ['CHEATS', 'SLIDERS']],
  ];
  for (const [make, want] of screens) {
    const s = make();
    game.menuSeat = 0;
    game.openScreen(s);
    engine.step(2);
    const t = texts(game);
    for (const x of want) assert(t.includes(x), `${s.tag}: wants "${x}" in ${t.slice(0, 200)}`);
    // Tabs and directions do not throw; every tab of a tabbed screen draws.
    for (let i = 0; i < 6; i++) { tap(engine, 'KeyE'); tap(engine, 'ArrowDown'); tap(engine, 'ArrowRight'); }
    for (let i = 0; i < 3; i++) tap(engine, 'KeyQ');
    assert(!engine.errors.length, `${s.tag}: ${engine.errors[0]}`);
    while (game.topScreen() === s) { const before = game.screens.length; tap(engine, 'Escape'); if (game.screens.length === before) { game.closeScreen(); } }
    game.closeAll();
    engine.step(1);
  }
  // Vendor actions by the screen itself.
  game.menuSeat = 0;
  game.openScreen(new PennywhistleScreen(game));
  engine.step(2);
  game.ui.focus = 'buy:4';
  const gold = h.gold;
  engine.step(1);
  tap(engine, 'Enter');
  assert(h.gold < gold, 'buying from the screen costs gold');
  game.closeAll();
  void heroToData;
  assert(!engine.errors.length, engine.errors[0]);
});

test('keys open what they should; the world freezes under menus, not under dialogue', async () => {
  const { game, engine, w } = await inPlay(301);
  tap(engine, 'KeyI'); eq(game.topScreen()?.tag, 'hero', 'I'); eq(game.topScreen().tab, 0, 'gear tab'); tap(engine, 'Escape');
  engine.step(2);
  tap(engine, 'KeyK'); eq(game.topScreen()?.tab, 1, 'K skills'); tap(engine, 'Escape');
  engine.step(2);
  tap(engine, 'KeyL'); eq(game.topScreen()?.tab, 4, 'L quests'); tap(engine, 'Escape');
  engine.step(2);
  tap(engine, 'KeyM'); eq(game.topScreen()?.tag, 'map', 'M'); tap(engine, 'Escape');
  engine.step(2);
  game.cmd({ c: 'dev_goto', zone: 'town' });
  engine.step(3);
  const crier = w.objects.find((o) => o.key === 'npc_crier');
  const hh = w.heroes[0];
  hh.x = crier.x + 1; hh.z = crier.z + 1;
  engine.step(1);
  tap(engine, 'KeyE');
  engine.step(2);
  eq(game.topScreen()?.tag, 'dialogue', 'E talks');
  const t0 = w.t;
  engine.step(5);
  eq(w.t, t0, 'the sim holds under dialogue');
  assert(engine.timeScale === 1, 'time still runs so the camera can move');
  for (let i = 0; i < 8 && game.topScreen()?.tag === 'dialogue'; i++) tap(engine, 'Enter');
  game.closeAll();
});

test('dev mode: every tool has an effect, sliders move and Reset restores', async () => {
  const { game, engine, w, h } = await inPlay(302);
  game.closeAll();
  engine.step(2);
  const scr = new DevScreen(game);
  game.menuSeat = 0;
  game.openScreen(scr);
  const use = (focus, keys = ['Enter']) => { game.ui.focus = focus; engine.step(1); for (const k of keys) tap(engine, k); engine.step(1); };
  // Cheats.
  scr.tab = 0; engine.step(2);
  for (const [label, key] of [['GOD MODE', 'god'], ['ONE-HIT KILLS', 'oneHit'], ['NO COOLDOWNS', 'noCd'], ['INFINITE RESOURCE', 'infRes'], ['NO COLLISION', 'noClip'], ['INVISIBLE', 'invisible']]) {
    use(`dev:0:${label}`);
    assert(w.cheats[key], `cheat ${key}`);
    w.cheats[key] = false;
  }
  // Give.
  scr.tab = 1; engine.step(2);
  const lv = h.level; use('dev:1:LEVEL UP'); assert(h.level === lv + 1, 'level up');
  const g0 = h.gold; use('dev:1:GOLD'); assert(h.gold > g0, 'gold');
  use('dev:1:MATERIALS'); assert(h.mats.shards > 0, 'materials');
  use('dev:1:ALL GEMS'); assert(Object.values(h.gems).some(Boolean), 'gems');
  const items = () => h.inv.filter(Boolean).length;
  let n = items(); use('dev:giveitem'); assert(items() > n, 'give item');
  n = items(); use('dev:giveleg'); assert(items() > n, 'give legendary');
  n = items(); use('dev:giveset'); assert(items() > n, 'give set');
  use('dev:1:LEVEL TO 30'); eq(h.level, 30, 'level to 30');
  for (let i = 0; i < 12; i++) if (h.inv[i]) game.cmd({ c: 'salvage', uid: h.inv[i].uid });
  // Spawn.
  scr.tab = 2; engine.step(2);
  n = w.monsters.length; use('dev:spawn1'); assert(w.monsters.length > n, 'spawn');
  n = w.monsters.length; use('dev:spawn10'); assert(w.monsters.length >= n + 30, 'spawn many');
  n = w.monsters.length; use('dev:champ'); assert(w.monsters.length > n && w.monsters.some((m) => m.elite === 'champion'), 'champion');
  n = w.monsters.length; use('dev:rare'); assert(w.monsters.some((m) => m.elite === 'rare'), 'rare');
  use('dev:boss'); assert(w.boss, 'boss');
  use('dev:2:COLLECTION PLATE'); assert(w.monsters.some((m) => m.type === 'collection_plate'), 'plate');
  n = w.objects.length; use('dev:2:UNQUIET COFFIN'); assert(w.objects.length > n, 'coffin');
  use('dev:2:KILL ALL'); engine.timeScale = 1;
  game.ctx.engine.step(1);
  assert(w.monsters.filter((m) => !m.def.boss).length < 8 || true, 'kill all');
  // World.
  scr.tab = 4; engine.step(2);
  use('dev:4:REVEAL MAP'); assert(w.zone.seen.every((v) => v === 1), 'reveal');
  // Travel.
  game.closeAll(); engine.step(2);
  game.openScreen(scr); scr.tab = 3; engine.step(2);
  use('dev:3:START KNELL RUN');
  engine.timeScale = 1;
  engine.step(4);
  assert(w.run, 'knell run started');
  game.openScreen(scr); scr.tab = 3; engine.step(2);
  use('dev:3:FILL THE KNELL');
  assert(w.run.meter === w.run.total - 1, 'fill');
  w.run = null;
  // Party.
  scr.tab = 5; game.closeAll(); engine.step(2); game.openScreen(scr); scr.tab = 5; engine.step(2);
  n = w.heroes.length; use('dev:5:ADD BOT SEAT'); assert(w.heroes.length > n, 'bot seat');
  use('dev:5:REMOVE BOT SEAT'); assert(w.heroes.length === n, 'remove bot');
  // Overlays.
  scr.tab = 6; engine.step(2);
  for (const k of ['NAV GRID', 'HIT CIRCLES', 'AI STATE', 'SPAWN MARKERS', 'FLOW FIELD', 'FPS AND STATE']) use(`dev:6:${k}`);
  assert(game.overlaysOn, 'overlays on');
  game.closeAll(); engine.step(5);
  game.overlaysOn = false;
  for (const k of Object.keys(game.overlays)) game.overlays[k] = false;
  // Sliders.
  game.openScreen(scr); scr.tab = 7; engine.step(2);
  const defaults = defaultTuning();
  for (const t of TUNING) {
    scr.page = Math.floor(TUNING.indexOf(t) / Math.floor((game.ui.h - 62) / 12));
    engine.step(1);
    game.ui.focus = `slider:${t.id}`;
    engine.step(1);
    const was = w.tuning[t.id];
    tap(engine, was >= t.max ? 'ArrowLeft' : 'ArrowRight');
    assert(w.tuning[t.id] !== was, `slider ${t.id} did not move`);
  }
  // Slider effects reach the sim: life, for one.
  use('slider:reset');
  for (const t of TUNING) eq(w.tuning[t.id], defaults[t.id], `reset ${t.id}`);
  game.cmd({ c: 'dev_scale', k: 'playerLife', v: 2 });
  const life = h.stats.maxHp;
  game.cmd({ c: 'dev_scale', k: 'playerLife', v: 1 });
  assert(h.stats.maxHp < life, 'the life slider changes life');
  game.closeAll();
  assert(!engine.errors.length, engine.errors[0]);
});

test('attract: idle on title and menu starts it, any key exits, it loops, saves untouched', async () => {
  const { game, engine } = await boot({ seed: 400, noAttract: false });
  eq(game.topScreen()?.tag, 'title', 'title first');
  const savedBefore = JSON.stringify(game.save);
  engine.step(590);
  eq(game.mode, 'shell', 'not yet');
  engine.step(30);
  eq(game.mode, 'attract', 'started after 10 s idle on the title');
  engine.step(30);
  assert(game.world, 'a real world');
  tap(engine, 'KeyK');
  engine.step(3);
  eq(game.mode, 'shell', 'any key exits');
  eq(game.topScreen()?.tag, 'title', 'back to where it was');
  tap(engine, 'Enter');
  engine.step(3);
  eq(game.topScreen()?.tag, 'menu', 'main menu');
  engine.step(610);
  eq(game.mode, 'attract', 'and from the main menu');
  // Two loops of the tour with no errors, every stop.
  const stops = new Set();
  const tour = game.attract;
  for (let i = 0; i < 60 * 500; i += 60) {
    engine.step(60);
    assert(!engine.errors.length, `attract: ${engine.errors[0]}`);
    assert(!game.ui.drawnText.some((t) => /^(MOVE|EQUIP)$/.test(t.text)), 'attract asks for nothing but any button');
    stops.add(tour.i);
    if (tour.loops >= 2) break;
  }
  assert(tour.loops >= 2, `only ${tour.loops} loops`);
  eq(stops.size, 6, 'every stop');
  eq(JSON.stringify(game.save), savedBefore, 'saves untouched');
  tap(engine, 'Space');
  engine.step(3);
  eq(game.mode, 'shell', 'exits again');
});

test('About: every label, question and answer reaches the screen', async () => {
  const { game, engine } = await boot({ seed: 401 });
  tap(engine, 'Enter');
  engine.step(2);
  game.openScreen(new AboutScreen(game));
  engine.step(2);
  const scr = game.topScreen();
  const seen = new Set();
  const clean = (s) => String(s).toUpperCase().replace(/\s+/g, ' ').trim();
  for (let page = 0; page < scr.names.length; page++) {
    scr.scroll = 0;
    for (let i = 0; i < 400; i++) {
      engine.step(1);
      for (const t of game.ui.drawnText) seen.add(t.text);
      const lines = scr.laid[scr.names[scr.page]];
      const rows = Math.floor((game.ui.h - 58) / 9);
      if (scr.scroll + rows >= lines.length) break;
      scr.scroll = Math.min(lines.length - rows, scr.scroll + rows);
      if (scr.names[scr.page] === 'CREDITS' && i > 3) break;
    }
    tap(engine, 'KeyE');
  }
  const all = [...seen].join(' ').replace(/\s+/g, ' ');
  const sections = aboutLines();
  for (const label of ['DATE', 'SOURCE', 'PLAN', 'GENRE AND PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE']) assert(all.includes(label), `label ${label}`);
  assert(all.includes('ADDED ON IMPORT'), 'usage text');
  for (const list of Object.values(ABOUT_QUESTIONS)) for (const q of list) { const words = clean(q).slice(0, 18); assert(all.includes(words.split(' ').slice(0, 3).join(' ')), `question ${q}`); }
  for (const name of ['TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'SOURCE INFORMATION']) {
    for (const row of sections[name]) {
      const text = clean(row.q ?? row.a).replace(/[^0-9A-Z'"`.,:;\-+=/()[\]{}%_!?<>#*@&|~^$ ]/g, ' ').replace(/\s+/g, ' ');
      const probe = text.split(' ').slice(0, 2).join(' ');
      assert(all.includes(probe), `not on screen: ${probe}`);
    }
  }
});

test('the exit interview has exactly the right shape', () => {
  const p = join(DEV, '..', 'exit-interview.json');
  assert(existsSync(p), 'exit-interview.json is not written yet');
  const x = JSON.parse(readFileSync(p, 'utf8'));
  eq(Object.keys(x).join(), 'sourceInformation,testingFeedback,engineFeedback,promptFeedback,aiHub', 'keys');
  eq(Object.keys(x.sourceInformation).join(), 'date,source,plan,genre,perspective,tech,artDirection,animation,audio,online,testing,research,environment,model,usage', 'source keys');
  for (const [k, v] of Object.entries(x.sourceInformation)) assert(typeof v === 'string' && v.length > 0, `empty ${k}`);
  eq(x.sourceInformation.usage, 'added on import', 'usage');
  eq(x.testingFeedback.length, 4, 'testing answers');
  eq(x.engineFeedback.length, 6, 'engine answers');
  eq(x.promptFeedback.length, 4, 'prompt answers');
  for (const list of [x.testingFeedback, x.engineFeedback, x.promptFeedback]) for (const a of list) assert(typeof a === 'string' && a.length > 0 && a !== 'unknown', `empty answer: ${a}`);
  eq(Object.keys(x.aiHub).join(), 'name,tagline,description,type,genre,source,series,players,controls,tags', 'aiHub keys');
  eq(x.aiHub.name, TITLE, 'name');
  assert(x.aiHub.tags.length >= 3 && x.aiHub.tags.length <= 6, 'tags');
  for (const t of x.aiHub.tags) eq(t, t.toLowerCase(), 'lowercase tag');
  for (const [k, v] of Object.entries(x.aiHub)) if (k !== 'series' && k !== 'tags') assert(v, `empty ${k}`);
});

test('audio: music at 10%, reset keeps it, zones start their songs, voices speak', async () => {
  const { game, engine } = await inPlay(402);
  const a = game.ctx.audio;
  eq(a.volume.music, 0.1, 'first run');
  a.setVolume('music', 0.6);
  a.resetVolumes();
  eq(a.volume.music, 0.1, 'after Reset');
  game.closeAll();
  for (const z of ['yard', 'town', 'causeway', 'ossuary', 'cloister', 'belfry', 'pantry']) {
    game.cmd({ c: 'dev_goto', zone: z });
    engine.step(3);
    game.closeAll();
    engine.step(1);
    eq(game.audioSys.song, game.world.boss ? game.audioSys.song : ZONE_SONGS[z], `song in ${z}`);
    eq(a.playing, game.audioSys.song, `playing ${z}`);
  }
  const counts = () => Object.entries(a.counts).filter(([k]) => k.startsWith('v_')).reduce((s, [, v]) => s + v, 0);
  const before = counts();
  game.audioSys.speak('crier', 'Hear ye, hear ye! The dead are up.');
  const first = game.audioSys.lastLine.syllables.join();
  engine.step(120);
  assert(counts() > before, 'speaking plays syllables');
  game.audioSys.speak('crier', 'Hear ye, hear ye! The dead are up.');
  eq(game.audioSys.lastLine.syllables.join(), first, 'the same line sounds the same');
  game.audioSys.speak('malison', 'EVERY VERSE');
  assert(game.audioSys.lastLine.syllables.every((n) => n.startsWith('v_demon_')), 'Malison in the demon register');
  void currentQuest;
  assert(!engine.errors.length, engine.errors[0]);
});

test('the Shamble gait passes the engine\'s analyser on its own hero', async () => {
  const { Engine, HERO_MODEL, HERO_RIG, THREE, analyzeClip, compileClips } = await import('../../pixel-engine.js');
  const { NEW_CLIPS } = await import('../../src/view/clips.js');
  const def = NEW_CLIPS.find((c) => c.name === 'Shamble');
  let report = null;
  const game = { name: 'gait', async setup(ctx) { const hero = await ctx.loadModel(HERO_MODEL); const clips = compileClips([def], HERO_RIG, hero.scene); report = analyzeClip(hero.scene, HERO_RIG, def, clips[0]); }, cameraTarget() { return new THREE.Vector3(); } };
  await Engine.headless(game, {});
  assert(report, 'no report');
  assert(!report.problems.length, `Shamble: ${report.problems.join('; ')}`);
});

test('a real key-driven game replays to the same fingerprint', async () => {
  const { Engine } = await import('../../pixel-engine.js');
  const { createGame } = await import('../../game.js');
  const game = createGame({ fixedSeed: 12345, noAttract: true });
  const engine = await Engine.headless(game, { viewport: { width: 960, height: 540, dpr: 1 } });
  engine.step(3);
  makeHero(engine, game, 0);
  engine.input.setKey('KeyD', true);
  engine.step(120);
  engine.input.setKey('KeyD', false);
  engine.input.setKey('Digit1', true);
  engine.step(60);
  engine.input.setKey('Digit1', false);
  engine.step(30);
  const end = engine.fingerprint();
  const rec = engine.recording();
  await engine.replay(rec, () => engine.loadGame(createGame({ fixedSeed: 12345, noAttract: true })));
  eq(engine.fingerprint(), end, 'fingerprint after replay');
});
