// Features the campaign bot doesn't always meet: the side dungeon, Writs, the Plate, shrines, levers, traps, Knell modifiers, the session round, Sister Pyx.
import { ok, eq, guarded } from '../lib.mjs';
import { newWorld, addHero, applyCommand, stepWorld, useProp } from '../../src/sim/step.js';
import { enterZone } from '../../src/sim/world.js';
import { killMonster, spawnMonster } from '../../src/sim/monsters.js';
import { afterTalk, dialogFor, rollWrits } from '../../src/sim/quests.js';
import { addPyx, spawnPlate } from '../../src/sim/rules.js';
import { startKnell } from '../../src/sim/knell.js';
import { MODIFIER_IDS } from '../../src/data/monsters.js';
import { levelUp, refresh } from '../../src/sim/hero.js';
import { buildRoundWorld } from '../../src/net/hubflow.js';
import { LORE_IDS, LORE } from '../../src/data/lore.js';
const IDLE = { moveX: 0, moveZ: 0, pressed: {}, held: {} };
const mk = (cls = 'bellwarden', zone = 'town', seed = 8) => { const w = newWorld({ seed }); const h = addHero(w, { seat: 0, cls }); enterZone(w, zone); w.events.length = 0; return { w, h }; };
const run = (w, n, it = IDLE) => { for (let i = 0; i < n; i++) { stepWorld(w, { 0: it }); w.events.length = 0; } };
await guarded(async () => {
  // The Drowned Pantry: Cellarer, overdue book, the Crier's reward.
  { const { w, h } = mk('sexton', 'causeway'); const door = w.props.find((p) => p.kind === 'exit' && p.to === 'pantry'); ok(door, 'Pantry door on the Causeway'); useProp(w, h, door); eq(w.zone.id, 'pantry', 'into the Pantry');
    const c = w.monsters.find((m) => m.type === 'cellarer'); ok(c, 'the Cellarer waits'); c.hp = 0; killMonster(w, c, h, {}); ok(w.bossKills?.cellarer, 'Cellarer slain');
    const book = w.props.find((p) => p.kind === 'book'); useProp(w, h, book); ok(w.story.flags.overdueBook, 'book taken'); enterZone(w, 'town'); w.story.q = 2; w.story.step = 1; const g = h.gold; const d = dialogFor(w, 'crier'); eq(d.key, 'crier_book', 'the Crier wants it'); afterTalk(w, d); ok(h.gold > g, 'reward paid'); }
  // Writs.
  { const { w, h } = mk('bellwarden', 'causeway'); w.story.lychgates.push('causeway'); rollWrits(w); eq(w.story.writs.length, 3, 'three Writs'); const n0 = h.mats.shards; for (const j of [...w.story.writs]) { j.done = false; } for (const j of [...w.story.writs]) { const m = await import('../../src/sim/quests.js'); m.finishWrit(w, j); } ok(h.mats.shards > n0 && w.story.writCaches === 1, 'all three pay a cache'); }
  // The Collection Plate: spills, escapes, or pays a jackpot.
  { const { w, h } = mk('bellwarden', 'causeway'); w.monsters.length = 0; w.cheats.god = true; h.x = 20; const p = spawnPlate(w, h.x + 3, h.z, { dormant: false, aggro: true }); run(w, 120); ok(w.drops.some((d) => d.kind === 'gold'), 'the Plate spills gold'); run(w, 60 * 12); ok(p.dead && p.gone, 'the Plate escapes after 12 s');
    const q = spawnPlate(w, h.x + 3, h.z, { dormant: false, aggro: true }); w.drops.length = 0; q.hp = 0; killMonster(w, q, h, {}); ok(w.drops.filter((d) => d.kind === 'gold').length >= 10 && w.drops.some((d) => d.kind === 'item'), 'jackpot when killed'); }
  // Shrines: each buff.
  for (const k of ['ardour', 'haste', 'ward', 'plenty']) { const { w, h } = mk(); const p = { id: 999, kind: 'shrine', shrine: k, x: h.x, z: h.z, interact: true, r: 1 }; w.props.push(p); useProp(w, h, p); ok(h.buffs.some((b) => b.id === k), `shrine ${k} buffs`); if (k === 'ward') ok(h.shield > 0, 'ward shields'); ok(p.used, 'shrine used once'); }
  // Levers open portcullises; traps fire.
  { let lever = null; let s = 1; let w; let h; while (!lever && s < 30) { ({ w, h } = mk('bellwarden', 'ossuary2', s++)); lever = w.props.find((p) => p.kind === 'lever'); } ok(lever, 'lever floor'); const port = w.props.find((p) => p.kind === 'portcullis'); ok(!w.zone.nav.isOpen(port.col, port.row), 'portcullis shut'); useProp(w, h, lever); ok(w.zone.nav.isOpen(port.col, port.row), 'lever opens it');
    const trap = w.props.find((p) => p.kind === 'trap'); ok(trap, 'traps exist'); h.x = trap.x; h.z = trap.z; const hp = h.hp; trap.cycle = 0; run(w, 60); ok(h.hp < hp, 'a trap hurts'); }
  // Every Knell modifier.
  for (const mod of MODIFIER_IDS) { const { w, h } = mk('lamplighter'); while (h.level < 20) levelUp(w, h); startKnell(w, { mods: [mod] }); ok(w.knell.mods.includes(mod), `modifier ${mod}`); const base = mk('lamplighter'); while (base.h.level < 20) levelUp(base.w, base.h); startKnell(base.w, { mods: ['golden'] });
    if (mod === 'crowded') ok(w.monsters.length > base.w.monsters.length * 0.9, 'crowded is denser'); if (mod === 'swift') eq(w.knell.speedMul, 1.2, 'swift'); if (mod === 'volatile') { const m = w.monsters.find((q) => !q.defn.boss); m.dormant = false; m._woke = true; killMonster(w, m, h, {}); ok(w.telegraphs.length > 0, 'volatile explodes'); } }
  // Grand tiers scale.
  { const { w } = mk('sexton'); startKnell(w, { grandTier: 5 }); ok(Math.abs(w.knell.hpMul - 1.17 ** 5) < 1e-6 && Math.abs(w.knell.dmgMul - 1.08 ** 5) < 1e-6, 'grand tier formula'); eq(w.knell.grand.t, 600, 'ten minutes'); }
  // Requiem.
  { const { w, h } = mk('bellwarden', 'causeway'); for (let i = 0; i < 12; i++) { const m = spawnMonster(w, 'peatwalker', h.x + 1, h.z, { dormant: false, aggro: true }); m.hp = 0; killMonster(w, m, h, {}); } const xp = h.xp; let ev = null; for (let i = 0; i < 70; i++) { stepWorld(w, { 0: IDLE }); for (const e of w.events) if (e.t === 'requiem') ev = e; w.events.length = 0; } ok(ev?.n === 12, `12 kill Requiem: ${ev?.n}`); ok(h.xp > xp || h.level > 1, 'Requiem pays XP'); }
  // Sister Pyx: fights, goes down, comes back, and leaves when a seat joins.
  { const { w, h } = mk('bellwarden', 'causeway'); w.monsters.length = 0; w.cheats.god = true; addPyx(w); const a = w.allies.find((q) => q.kind === 'pyx'); ok(a, 'Pyx joins'); h.x = 20; const m = spawnMonster(w, 'peatwalker', a.x + 3, a.z, { dormant: false, aggro: true }); m.hp = m.maxHp = 1e6; run(w, 200); ok(m.hp < 1e6, 'Pyx shoots'); w.monsters.length = 0; a.hp = 0; run(w, 5); eq(a.state, 'down', 'Pyx goes down'); run(w, 60 * 21); ok(a.hp > 0, 'Pyx revives after 20 s'); }
  // Co-op revive by holding interact.
  { const { w, h } = mk(); const o = addHero(w, { seat: 1, cls: 'sexton' }); o.x = h.x + 1; o.z = h.z; const { killHero } = await import('../../src/sim/hero.js'); killHero(w, o, {}); for (let i = 0; i < 130; i++) { stepWorld(w, { 0: { ...IDLE, held: { interact: true } }, 1: IDLE }); w.events.length = 0; } ok(!o.dead, 'an ally revives you'); eq(h.revives, 1, 'revive counted'); }
  // Lore: twelve books, each placed in its zone.
  eq(LORE_IDS.length, 12, 'twelve lore books'); for (const id of LORE_IDS) { const { w } = mk('bellwarden', LORE[id].zone, 5); ok(w.props.some((p) => p.kind === 'lore' && p.lore === id), `book ${id} placed`); }
  // The session round: level 12, six slots, level-up picks, class font swap, rise after 8 s.
  { const info = { seed: 3, players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }, { id: 2, name: 'C' }, { id: 3, name: 'D' }] }; const w = buildRoundWorld(info); eq(w.heroes.map((h) => h.cls).join(), 'bellwarden,lamplighter,sexton,bellwarden', 'class by seat'); for (const h of w.heroes) { eq(h.level, 12, 'level 12'); eq(h.slots.filter((s) => s.skill).length, 6, 'six skills'); }
    const h = w.heroes[0]; levelUp(w, h); eq(h.levelPicks.length, 1, 'a pick pops'); eq(h.levelPicks[0].opts.length, 3, 'pick 1 of 3'); ok(applyCommand(w, 0, { c: 'pick', i: 1 }), 'picked'); eq(h.levelPicks.length, 0, 'pick done'); levelUp(w, h); const all = {}; for (const q of w.heroes) all[q.seat] = IDLE; for (let i = 0; i < 620; i++) { stepWorld(w, all); w.events.length = 0; if (!h.levelPicks.length) break; } eq(h.levelPicks.length, 0, 'auto-picks after 10 s');
    const f = w.props.find((p) => p.kind === 'classfontspot' && p.cls === 'sexton'); const b = w.heroes[1]; b.invulnerable = 99; b.x = f.x; b.z = f.z; for (let i = 0; i < 130; i++) { b.x = f.x; b.z = f.z; b.invulnerable = 9; stepWorld(w, all); w.events.length = 0; } eq(b.cls, 'sexton', 'class font swaps in the first 30 s'); refresh(w, b); }
});
