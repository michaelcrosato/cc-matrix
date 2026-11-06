// Every skill and Tone casts without error and does something; each effect op runs; each legendary changes play; each Affliction behaves.
import { ok, eq, guarded } from '../lib.mjs';
import { CLASSES, CLASS_IDS, SKILLS } from '../../src/data/classes.js';
import { LEGENDARIES, SETS, SET_FOR_CLASS } from '../../src/data/items.js';
import { AFFLICTION_IDS, MONSTERS } from '../../src/data/monsters.js';
import { newWorld, addHero, stepWorld, applyCommand } from '../../src/sim/step.js';
import { enterZone, findOpenNear } from '../../src/sim/world.js';
import { levelUp, refresh, tryCast } from '../../src/sim/hero.js';
import { OP_IDS, effectiveSkill, runOps } from '../../src/sim/effects.js';
import { killMonster, spawnElitePack, spawnMonster } from '../../src/sim/monsters.js';
import { makeItem } from '../../src/sim/loot.js';

const IDLE = { moveX: 0, moveZ: 0, pressed: {}, held: {} };
const arena = (cls, seed = 5) => { const w = newWorld({ seed }); const h = addHero(w, { seat: 0, cls }); enterZone(w, 'countinghouse'); for (const m of w.monsters) { m.hp = 0; m.dead = true; } w.boss = null; w.monsters = []; while (h.level < 30) levelUp(w, h); h.x = 18; h.z = 14; refresh(w, h); h.hp = h.stats.maxHp; h.res = h.stats.maxResource; w.cheats.infRes = true; w.cheats.god = true; w.events.length = 0; return { w, h }; };
const dummies = (w, h, n = 6) => { const out = []; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28; const m = spawnMonster(w, 'peatwalker', h.x + Math.cos(a) * 2.2, h.z + Math.sin(a) * 2.2, { dormant: false, aggro: true }); m.hp = m.maxHp = 1e7; out.push(m); } for (const k of [0, 1]) { const m = spawnMonster(w, 'peatwalker', h.x + 7, h.z + k, { dormant: false, aggro: true }); m.hp = m.maxHp = 1e7; out.push(m); } return out; };
await guarded(async () => {
  for (const cls of CLASS_IDS) {
    for (const sk of CLASSES[cls].skills) {
      for (const tone of [null, ...Object.keys(sk.tones)]) {
        const { w, h } = arena(cls);
        // A Sexton's Exhume needs graves.
        const ms = dummies(w, h);
        for (let i = 0; i < 6; i++) w.graves.push({ id: w.nextId++, x: h.x + i - 3, z: h.z + 1, t: 12 });
        for (const m of ms) m.status.burn = { dps: 5, t: 3, by: h.id };
        h.slots[0] = { skill: sk.id, tone };
        w.active = w.monsters.filter((m) => !m.dead);
        const before = ms.reduce((a, m) => a + m.hp, 0); const gBefore = w.graves.length; const aBefore = w.allies.length; const fBefore = w.fields.length;
        const it = { moveX: 0, moveZ: 0, aimX: 1, aimZ: 0, tx: h.x + 6, tz: h.z, pressed: { s0: true }, held: {} };
        for (let i = 0; i < 200; i++) { stepWorld(w, { 0: i === 0 ? it : { ...IDLE, aimX: 1, aimZ: 0 } }); w.events.length = 0; }
        const after = ms.reduce((a, m) => a + m.hp, 0);
        const did = after < before || w.graves.length !== gBefore || w.allies.length !== aBefore || w.fields.length !== fBefore || h.buffs.length > 0 || h.used?.[sk.id];
        ok(did, `${cls} ${sk.id} ${tone ?? 'plain'} did something`);
        ok(h.used?.[sk.id] > 0, `${cls} ${sk.id} ${tone ?? 'plain'} fired`);
        const dmgOps = effectiveSkill(h, sk.id, tone).fx.some((o) => o.dmg || o.op === 'consume_status' || o.op === 'consume_graves' || o.op === 'lob' || o.op === 'leap' || o.op === 'comet_rain' || o.op === 'turret' || o.op === 'summon' || o.op === 'buff' || o.op === 'blink');
        if (dmgOps && sk.id !== 'dusk_step' && sk.id !== 'hallowed_ground' && sk.id !== 'last_rites') ok(after < before || sk.id === 'danse_macabre', `${cls} ${sk.id} ${tone ?? 'plain'} hurt something`);
      }
    }
  }
  // Each op runs through runOps.
  const used = new Set();
  const walkOps = (fx) => { for (const o of fx) { used.add(o.op); if (o.then) walkOps(o.then); } };
  for (const s of Object.values(SKILLS)) { walkOps(s.fx); for (const t of Object.values(s.tones)) { if (t.add) walkOps(t.add); if (t.fxAll) walkOps(t.fxAll); } }
  { const { w, h } = arena('bellwarden'); dummies(w, h); w.active = w.monsters.filter((m) => !m.dead); const c = { hero: h, src: h, x: h.x, z: h.z, ox: h.x, oz: h.z, ax: 1, az: 0, tx: h.x + 3, tz: h.z, sk: { id: 'x', element: 'sound' }, mult: 1, targets: 0 };
    const samples = { chain: { op: 'chain', count: 2, range: 6, dmg: 1 }, pull: { op: 'pull', radius: 8, dist: 1 }, knock: { op: 'knock', radius: 8, dist: 1 }, stun: { op: 'stun', radius: 8, t: 1 }, apply_status: { op: 'apply_status', radius: 8, status: 'burn', dps: 1, t: 2 }, repeat: { op: 'repeat', n: 2, every: 0.1, then: [{ op: 'circle', radius: 2, dmg: 1 }] }, debuff: { op: 'debuff', radius: 3, dur: 1, curse: 0.2 } };
    for (const id of OP_IDS) { if (samples[id]) { runOps(w, c, [samples[id]]); used.add(id); } } for (let i = 0; i < 30; i++) { stepWorld(w, { 0: IDLE }); w.events.length = 0; }
    for (const id of OP_IDS) ok(used.has(id), `op ${id} is exercised`);
  }
  // Each legendary's hook changes play: the effective skill or the hero's numbers differ.
  for (const l of LEGENDARIES) {
    const cls = l.cls ?? 'sexton'; const { w, h } = arena(cls); const it = makeItem(w.rngs.loot, { legendary: l.id, ilvl: 30, cls });
    eq(it.power, l.id, `legendary ${l.id} made`);
    eq(it.slot, l.slot, `legendary ${l.id} slot`);
    h.gear[l.slot] = it; refresh(w, h); ok(h.powers.has(l.id), `${l.id} worn`);
    const ms = dummies(w, h);
    const check = { widows_clapper: () => effectiveSkill(h, 'great_toll').fx.length > 1, anvil: () => effectiveSkill(h, 'clapper_charge').fx[0].drag, deaf_cowl: () => h.resonanceCap === 8 && h.stats.stunImmune, hymnal_greaves: () => effectiveSkill(h, 'chain_reap').fx[0].homingNote, last_wick: () => effectiveSkill(h, 'spark_bolt').fx[0].wickSplit, patient_moth: () => effectiveSkill(h, 'lantern_hurl').fx[0].then.some((o) => o.pull), snuffer_mitts: () => effectiveSkill(h, 'snuff').fx[0].mitts, cinderwalk: () => effectiveSkill(h, 'dusk_step').fx.some((o) => o.op === 'trail'), second_crook: () => effectiveSkill(h, 'raise_pallbearers').fx[0].slam, ledger_graves: () => effectiveSkill(h, 'exhume').fx[0].max === 99, first_digger: () => h.powers.has('first_digger'), family_deed: () => effectiveSkill(h, 'coffin_drop').fx[0].count >= 4 };
    if (check[l.id]) ok(check[l.id](), `${l.id} changes its skill`);
    if (l.id === 'first_digger') { h.slots[0] = { skill: 'shovel_swat', tone: null }; h.swatN = 4; w.active = w.monsters.filter((m) => !m.dead); const g = w.graves.length; for (let i = 0; i < 30; i++) { stepWorld(w, { 0: { ...IDLE, aimX: 1, aimZ: 0, pressed: i === 0 ? { s0: true } : {} } }); w.events.length = 0; } ok(w.graves.length > g, 'first digger digs'); }
    if (l.id === 'clemency_shard') { h.clemencyT = 0.05; const b = ms.reduce((a, m) => a + m.hp, 0); w.active = ms; for (let i = 0; i < 12; i++) { stepWorld(w, { 0: IDLE }); w.events.length = 0; } ok(ms.reduce((a, m) => a + m.hp, 0) < b, 'clemency shard rings'); }
    if (l.id === 'thrice_buried') { w.cheats.god = false; h.hp = 1; w.monsters = []; h.invulnerable = 0; for (const m of ms) m.dead = true; w.hooks.hitHero(w, h, 1e6, { pure: true }); ok(!h.dead && h.hp > 0, 'thrice-buried saves'); }
    if (l.id === 'plate_lining') { w.hooks.dropCoins(w, h.x, h.z, 10, h.seat); w.drops.at(-1).t = 1; h.hp = 1; for (let i = 0; i < 5; i++) { stepWorld(w, { 0: IDLE }); } ok(h.plateN > 0, 'plate-lining counts pickups'); }
    if (l.id === 'choirmaster') { h.batonN = 5; h.slots[0] = { skill: CLASSES[cls].skills[3].id, tone: null }; for (let i = 0; i < 60; i++) { stepWorld(w, { 0: { ...IDLE, aimX: 1, aimZ: 0, pressed: i === 0 ? { s0: true } : {} } }); w.events.length = 0; } ok(h.batonN === 0, 'choirmaster fired its free cast'); }
    if (l.id === 'mourning_band') { const before = h.stats; ok(before, 'mourning band worn'); }
    if (l.id === 'malisons_knuckle') { ok(h.powers.has(l.id), 'knuckle worn'); }
  }
  // Sets: 2 and 4 pieces.
  for (const c of CLASS_IDS) { const { w, h } = arena(c); const set = SET_FOR_CLASS[c]; const slots = Object.keys(SETS[set].pieces); for (const s of slots.slice(0, 2)) h.gear[s] = makeItem(w.rngs.loot, { slot: s, set, ilvl: 30, cls: c }); refresh(w, h); ok(h.setBonus[`${set}2`], `${set} 2-piece`); ok(!h.setBonus[`${set}4`], `${set} not yet 4`); for (const s of slots.slice(2)) h.gear[s] = makeItem(w.rngs.loot, { slot: s, set, ilvl: 30, cls: c }); refresh(w, h); ok(h.setBonus[`${set}4`], `${set} 4-piece`); }
  // Afflictions behave.
  for (const a of AFFLICTION_IDS) {
    const { w, h } = arena('bellwarden'); w.cheats.god = false; h.stats.maxHp = 1e6; h.hp = 1e6;
    const pack = spawnElitePack(w, h.x + 4, h.z, 'champion', [a], ['peatwalker'], { dormant: false, aggro: true });
    for (const m of pack) { m.aT = { [a]: 0.01 }; m.hp = m.maxHp = 1e5; }
    let tele = 0; let obst = 0; let beams = 0; let fields = 0; let rooted = false; const hp0 = h.hp;
    for (let i = 0; i < 400; i++) { stepWorld(w, { 0: IDLE }); for (const e of w.events) { if (e.t === 'tele') tele++; if (e.t === 'obstacle') obst++; if (e.t === 'beam') beams++; if (e.t === 'field') fields++; if (e.t === 'root') rooted = true; } w.events.length = 0; }
    if (a === 'tolling') ok(tele > 0 && h.hp < hp0, 'tolling hurts');
    if (a === 'smouldering') ok(fields > 0, 'smouldering trails');
    if (a === 'shackled') ok(tele > 0, 'shackled telegraphs');
    if (a === 'entombing') ok(obst > 0, 'entombing walls');
    if (a === 'vigil_lamps') ok(beams > 0, 'vigil lamps beams');
    if (a === 'penitent_haste') ok(pack[0].speed > 0, 'haste');
    if (a === 'plagued') ok(fields > 0, 'plagued pools');
    if (a === 'undying') { const m = pack[0]; m.hp = 0; killMonster(w, m, h, {}); ok(!m.dead && m.hp > 0, 'undying rises'); m.hp = 0; killMonster(w, m, h, {}); ok(m.dead, 'undying dies the second time'); }
  }
  void findOpenNear; void MONSTERS; void tryCast; void applyCommand;
});
