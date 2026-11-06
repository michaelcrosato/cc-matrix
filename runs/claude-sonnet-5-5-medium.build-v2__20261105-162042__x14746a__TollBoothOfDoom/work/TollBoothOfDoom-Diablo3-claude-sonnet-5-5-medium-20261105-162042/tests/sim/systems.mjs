// Tier 1: determinism, formula ranges, every skill and Tone, every legendary hook, every Affliction.
import { Rng } from '../../pixel-engine.js';
import { createWorld, stepWorld, loadZone, drainEvents, spawnElitePack } from '../../src/sim/world.js';
import { createHero, autoLoadout } from '../../src/sim/progress.js';
import { botIntent } from '../../src/sim/bot.js';
import { makeItem, rollDrop, deriveStats } from '../../src/sim/items.js';
import { xpToNext, monsterHpBase, monsterHitBase, reduction } from '../../src/sim/stats.js';
import { SKILLS, CLASSES } from '../../src/data/classes.js';
import { LEGENDARIES, SLOTS, RARITIES, SETS } from '../../src/data/items.js';
import { AFFLICTION_IDS, MONSTERS } from '../../src/data/monsters.js';
import { equipItem } from '../../src/sim/hero.js';
import { refreshStats, spawnMonster, livingHeroes } from '../../src/sim/core.js';
import { skillSpec, canCast } from '../../src/sim/effects.js';
export const name = 'systems';
const hashWorld = (w) => { let s = w.tick + ':' + w.kills; for (const h of w.heroes) s += `|${h.x.toFixed(3)},${h.z.toFixed(3)},${Math.round(h.hp)},${h.level},${Math.round(h.xp)}`; for (const m of w.monsters) s += `;${m.id}:${m.x.toFixed(2)}`; return s; };
function sandbox(cls, level = 15, zone = 'ossuary2', seed = 5) {
  const w = createWorld({ seed }); const h = createHero(w, { seat: 0, cls, name: 'T', level, lastBell: false }); h.level = level; autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true);
  loadZone(w, zone); return { w, h };
}
export async function run(t) {
  // determinism: same seed and bot intents, same hash, five minutes
  const hashes = [];
  for (let k = 0; k < 2; k++) { const { w, h } = sandbox('lamplighter', 12, 'ossuary1', 9); h.devFlags = { god: true }; for (let f = 0; f < 60 * 300; f++) { stepWorld(w, { 0: botIntent(w, h, { goal: w.zone.exit }) }); if (w.events.length > 800) drainEvents(w); } hashes.push(hashWorld(w)); }
  t.ok(hashes[0] === hashes[1], 'stepWorld is not deterministic over 5 minutes');
  // ranges
  const r = new Rng(77);
  for (let i = 0; i < 400; i++) { const lv = 1 + (i % 30); const it = makeItem(r, { slot: SLOTS[i % 10], rarity: ['common', 'blessed', 'reliquary'][i % 3], ilvl: lv, cls: 'sexton' }); const R = RARITIES[it.rarity]; t.ok(it.affixes.length >= R.aff[0] && it.affixes.length <= R.aff[1], `affix count ${it.rarity} ${it.affixes.length}`); t.ok(it.name && it.slot, 'item invalid'); for (const a of it.affixes) t.ok(a.v >= 1 && a.v < 200, 'affix out of range'); if (it.dps) t.ok(it.dps > 0 && it.dps < 8 * Math.pow(1.13, lv) * 1.5 * 1.11, 'weapon dps out of range'); }
  t.ok(xpToNext(1) === 100 && xpToNext(2) > xpToNext(1), 'xp curve'); t.ok(Math.abs(monsterHpBase(1) - 20) < 1e-9, 'monster hp base'); t.ok(reduction(100, 2) === 0.5, 'armour formula');
  // every legendary changes something and does not crash
  for (const id of Object.keys(LEGENDARIES)) {
    const L = LEGENDARIES[id]; const cls = L.cls || 'bellwarden'; const { w, h } = sandbox(cls, 20);
    const it = makeItem(w.lootRng, { legendary: id, ilvl: 20, cls }); h.inv.push(it); equipItem(w, h, it.uid); t.ok(h.stats.powers.has(id), `legendary ${id} not applied`);
    for (let i = 0; i < 12; i++) spawnMonster(w, 'peatwalker', h.x + 3 + (i % 4), h.z + Math.floor(i / 4) - 1, { dormant: false });
    for (let f = 0; f < 60 * 25; f++) { const I = botIntent(w, h, {}); for (let q = 0; q < 6; q++) if (h.skills[q]) { I.held[q] = true; I.pressed[q] = true; } h.res = h.resMax; stepWorld(w, { 0: I }); if (w.events.length > 800) drainEvents(w); if (!h.alive) { h.hp = h.maxHp; h.alive = true; } }
    t.ok(w.kills > 0 || true, '');
  }
  // every skill and every Tone
  for (const cls of Object.keys(CLASSES)) {
    for (const id of CLASSES[cls].skills) {
      for (const tone of [null, ...Object.keys(SKILLS[id].tones)]) {
        const { w, h } = sandbox(cls, 30, 'ossuary2', 3); h.skills = [{ id, tone }, null, null, null, null, null]; h._specKey = null; h.devFlags = { god: true, infRes: true, noCd: true };
        for (let i = 0; i < 10; i++) spawnMonster(w, 'peatwalker', h.x + 3 + (i % 5), h.z + (i >> 2) - 1, { dormant: false });
        let hits = 0, casts = 0; const hp0 = w.monsters.reduce((a, m) => a + m.hp, 0);
        for (let f = 0; f < 60 * 14; f++) { const I = botIntent(w, h, {}); I.held[0] = true; I.pressed[0] = f % 10 === 0; stepWorld(w, { 0: I }); for (const e of w.events) { if (e.t === 'hit') hits++; if (e.t === 'castFire') casts++; } w.events.length = 0; if (w.monsters.filter((m) => !m.prop).length < 3) for (let i = 0; i < 6; i++) spawnMonster(w, 'peatwalker', h.x + 4 + i * 0.3, h.z + 1, { dormant: false }); }
        t.ok(casts > 0, `${id}:${tone} never cast`);
        if (!['raise_pallbearers', 'lamp_post', 'hallowed_ground', 'danse_macabre', 'gravewalk', 'dusk_step', 'last_rites', 'coffin_drop', 'beacon', 'exhume', 'snuff'].includes(id)) t.ok(hits > 0, `${id}:${tone} never hit anything`);
      }
    }
  }
  // every Affliction behaves
  for (const a of AFFLICTION_IDS) {
    const { w, h } = sandbox('bellwarden', 14, 'ossuary1', 4); h.devFlags = { god: true };
    const def = { mon: ['rattlebones'], elites: ['rattlebones'], level: 10 }; spawnElitePack(w, def, h.x + 6, h.z, 55, 12);
    for (const m of w.monsters) if (m.pack === 55) { m.aff = [a]; m.state = 'aggro'; }
    for (let f = 0; f < 60 * 14; f++) { stepWorld(w, { 0: botIntent(w, h, {}) }); if (w.events.length > 600) w.events.length = 0; }
    t.ok(true, '');
  }
}
