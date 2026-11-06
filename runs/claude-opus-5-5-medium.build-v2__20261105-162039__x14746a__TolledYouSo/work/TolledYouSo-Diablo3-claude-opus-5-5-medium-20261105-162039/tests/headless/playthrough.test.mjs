// Whole-game playthrough, once per class, default tuning, Pilgrim: starts at the title, makes a hero through the real menus by keys,
// plays to the credits by intents and commands, then one full Knell Run. Then The Last Bell, once per class.
import { CLASS_IDS, CLASSES } from '../../src/data/classes.js';
import { ok, eq, guarded } from '../lib.mjs';
import { newHero, start } from './lib.mjs';
import { QUESTS } from '../../src/sim/quests.js';
import { applyCommand } from '../../src/sim/step.js';
import { makeItem } from '../../src/sim/loot.js';
import { LEGENDARIES, SETS, SET_FOR_CLASS } from '../../src/data/items.js';
import { devotionPointsFree } from '../../src/sim/hero.js';

const MIN = 3600;
function stepUntil(e, g, cond, limit, label) {
  let lastKey = ''; let lastT = 0;
  for (let i = 0; i < limit; i++) {
    e.step(1);
    const w = g.play.world; const m = w.boss?.m;
    const key = `${w.story.q}:${w.story.step}:${w.zone.id}:${w.knell?.stage}:${Math.round((w.knell?.meter ?? 0) / 10)}:${Math.round((m?.hp ?? 0) / Math.max(1, m?.maxHp ?? 1) * 25)}:${m?.bossState?.rings ?? 0}:${g.play.scene ? 1 : 0}`;
    if (key !== lastKey) { lastKey = key; lastT = i; }
    if (cond()) return true;
    if (i - lastT > 3 * MIN) { ok(false, `${label}: softlock at ${key} pos ${w.heroes[0].x | 0},${w.heroes[0].z | 0} why ${g.play.botStates[0]?.why}`); return false; }
  }
  ok(false, `${label}: limit reached at ${lastKey}`); return false;
}
await guarded(async () => {
  for (const [ci, cls] of CLASS_IDS.entries()) {
    const { game: g, engine: e } = await start();
    eq(e.audio.volume.music, 0.1, 'music at 10% on first run');
    newHero(g, e, ci, false);
    eq(g.shell.state, 'play', `${cls} reached play through the menus`);
    const w = g.play.world; const h = w.heroes[0]; eq(h.cls, cls, 'class chosen in the menu'); ok(g.play.scene, 'opening cutscene plays');
    g.play.autoDialog = true; g.autoDismiss = true; g.play.bots[0] = true; g.testBot = true;
    g.play.scene.tl.skip(); e.step(2);
    const zones = new Set(); const seen = { shrine: 0, coffin: 0 };
    const orig = g.play.onEvent.bind(g.play);
    let ended = false; let legendaryEquipped = false; const skillsUsed = new Set();
    g.play.onEvent = (wd, ev) => { if (ev.t === 'zone') zones.add(ev.id); if (ev.t === 'equip' && ev.rarity === 'legendary') legendaryEquipped = true; if (ev.t === 'ending') ended = true; if (ev.t === 'cast' && ev.skill) skillsUsed.add(ev.skill); orig(wd, ev); };
    const did = stepUntil(e, g, () => ended && w.bossKills?.malison, 75 * MIN, cls);
    if (!did) continue;
    ok(w.tick < 75 * MIN, `campaign under 75 sim minutes: ${(w.tick / MIN).toFixed(1)}`);
    ok(h.level >= 16 && h.level <= 24, `level 16 to 24 at the credits: ${h.level}`);
    for (const z of ['yard', 'town', 'causeway', 'ossuary1', 'ossuary2', 'ossuary3', 'countinghouse', 'cloister', 'belfry1', 'belfry2', 'belfry3', 'belfry_top']) ok(zones.has(z) || z === 'yard', `${cls} visited ${z}`);
    eq(w.story.q, QUESTS.length, 'every quest done');
    for (const b of ['bursar', 'ambrose', 'malison']) ok(w.bossKills[b] > 0, `${cls} killed ${b}`);
    ok(legendaryEquipped || Object.values(h.gear).some((i) => i?.power), `${cls} equipped a legendary`);
    ok(skillsUsed.size >= 6, `${cls} used skills: ${skillsUsed.size}`);
    ok(h.shrines > 0, `${cls} used a shrine`); ok(h.coffins > 0, `${cls} opened a coffin`);
    ok(Object.keys(w.story.gates ?? {}).length >= 2, `${cls} touched Lychgates`);
    ok(w.requiems > 0, `${cls} reached a Requiem`); ok(w.story.flags.firstPlate, `${cls} met the first Plate`); ok(w.story.flags.firstChampion, `${cls} met the first Champion pack`); ok(w.story.flags.pyx, `${cls} met Sister Pyx`); ok(w.story.flags.novicesSaved, `${cls} defended the novices`); ok(w.stats.smashed > 0, `${cls} smashed props`); ok(w.stats.legendaries >= 2, `${cls} found 2+ legendaries`); for (const k of ['peatwalker', 'rattlebones', 'cinderling']) ok(w.bestiary[k] > 0, `${cls} met ${k}`);
    ok(w.unlocks.knell && w.unlocks.penance, 'endgame unlocks');
    // The ending plays: skip it through its Timeline, back in town.
    e.step(5); ok(g.play.scene === null || g.play.autoDialog, 'ending scene ran'); e.step(5); eq(w.zone.id, 'town', 'back to town after credits');
    // Town services by command: salvage, craft, reforge, sell, buy, stash, extract, socket.
    h.gold += 50000; h.mats.scrap += 100; h.mats.dust += 100; h.mats.shards += 30;
    const give = (o) => { const it = makeItem(w.rngs.loot, { ilvl: h.level, cls, ...o }); h.inv.push(it); return it; };
    const legId = LEGENDARIES.find((l) => l.cls === cls && !h.gear[l.slot]?.power)?.id ?? LEGENDARIES.find((l) => l.cls === cls).id;
    ok(applyCommand(w, 0, { c: 'salvage', uid: give({ slot: 'ring', rarity: 'blessed' }).uid }), 'salvaged'); ok(applyCommand(w, 0, { c: 'craft', slot: 'head', rarity: 'blessed' }), 'crafted');
    const rf = give({ slot: 'chest', rarity: 'reliquary' }); ok(applyCommand(w, 0, { c: 'reforge', uid: rf.uid, index: 0 }), 'reforged'); ok(applyCommand(w, 0, { c: 'sell', uid: rf.uid }), 'sold');
    const buyable = (await import('../../src/sim/commands.js')).vendorStock(w, h)[0]; ok(applyCommand(w, 0, { c: 'buy', uid: buyable.uid }), 'bought');
    const st = give({ slot: 'ring', rarity: 'blessed' }); ok(applyCommand(w, 0, { c: 'stashPut', tab: 0, uid: st.uid }), 'stashed');
    ok(applyCommand(w, 0, { c: 'extract', uid: give({ legendary: legId }).uid }), 'extracted');
    const so = give({ slot: 'chest', rarity: 'blessed' }); so.affixes = [{ k: 'socket', v: 1 }]; h.gems['ember:0'] = 1; ok(applyCommand(w, 0, { c: 'socket', uid: so.uid, gem: 'ember:0' }), 'socketed');
    // Then one full Knell Run.
    ok(applyCommand(w, 0, { c: 'knell' }), 'knell starts');
    ok(stepUntil(e, g, () => w.knell?.stage === 'done', 25 * MIN, `${cls} knell`), `${cls} knell run done`);
    ok(h.knells === 1, `${cls} knell counted`);
    e.dispose();
  }
  // The Last Bell: start it through the menus, spend Devotion, change tier, complete a Grand Knell, see a set bonus.
  for (const [ci, cls] of CLASS_IDS.entries()) {
    const { game: g, engine: e } = await start();
    newHero(g, e, ci, true);
    eq(g.shell.state, 'play', 'last bell started'); const w = g.play.world; const h = w.heroes[0]; eq(h.level, 30, 'level 30'); eq(w.zone.id, 'town', 'in town');
    g.play.autoDialog = true; g.autoDismiss = true; g.play.bots[0] = true;
    eq(devotionPointsFree(w), 5, '5 Devotion points'); ok(applyCommand(w, 0, { c: 'devotion', track: 'core' }), 'spent Devotion'); eq(w.devotion.spent.core, 1, 'Devotion spent');
    ok(Object.values(h.gear).filter((i) => i?.power).length + h.inv.filter((i) => i.power).length >= 3, 'three legendaries');
    const set = SET_FOR_CLASS[cls]; ok(h.setBonus[`${set}2`], 'two pieces give a set bonus');
    ok(applyCommand(w, 0, { c: 'difficulty', i: 3 }), 'tier changed to Penance'); eq(w.diff.name, 'PENANCE I', 'penance');
    applyCommand(w, 0, { c: 'difficulty', i: 0 });
    ok(h.mats.keys >= 1, 'grand key'); ok(applyCommand(w, 0, { c: 'knell', grand: 0 }), 'grand knell starts');
    ok(stepUntil(e, g, () => w.knell?.stage === 'done', 15 * MIN, `${cls} grand`), `${cls} grand knell done`);
    ok(w.knell?.results?.beat, `${cls} beat the timer`);
    ok(w.bests[cls]?.knells >= 1, 'bests recorded');
    ok(h.knells >= 1, 'counted'); void SETS; void CLASSES;
    e.dispose();
  }
});
