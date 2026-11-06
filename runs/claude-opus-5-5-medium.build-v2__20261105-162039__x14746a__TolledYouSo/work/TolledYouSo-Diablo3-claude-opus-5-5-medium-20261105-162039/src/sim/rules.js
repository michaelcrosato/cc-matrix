// Everything between the systems: populating zones, props, drops, allies, and the hooks the sim calls.
import { CLASSES } from '../data/classes.js';
import { LORE } from '../data/lore.js';
import { MONSTERS, SHRINES, SHRINE_IDS } from '../data/monsters.js';
import { F } from '../data/tuning.js';
import { ZONES } from '../data/zones.js';
import { DT, after, emit, enterZone, findOpenNear, monsterLevel, moveCircle, near, nearestHero, partyLevel, walkable } from './world.js';
import { damageHero, gainResource, healHero, hasBuff, refresh, addBuff, reviveHero } from './hero.js';
import { fireProjectile, heroHit, runOps } from './effects.js';
import { hitHero, killMonster, spawnElitePack, spawnMonster, stunMonster, telegraph, wake } from './monsters.js';
import { canWear, itemScore, makeItem, randomGem, rollDrop, rollLegendaryItem, rollSetItem } from './loot.js';
import { ringRope } from './bosses.js';
import { zoneEntered, onKillQuest, onBossDead, questFlag } from './quests.js';
import { knellOnKill, wardenDead } from './knell.js';

const BREAKABLE_MODELS = { yard: ['urn', 'barrel', 'clay-pot'], town: ['crate'], moor: ['barrel', 'crate', 'clay-pot', 'sack'], crypt: ['urn', 'amphora', 'clay-pot', 'coffin'], cloister: ['urn', 'crate', 'barrel', 'amphora'], belfry: ['urn', 'crate', 'amphora'], pantry: ['barrel', 'keg', 'crate'], mix: ['urn', 'barrel', 'crate'] };

export function addProp(w, o) { const p = { id: w.nextId++, r: 1, ...o }; w.props.push(p); return p; }

function populate(w, z) {
  const rng = z.seedRng; const spec = z.spec;
  const bm = BREAKABLE_MODELS[spec.biome] ?? BREAKABLE_MODELS.mix;
  for (const b of z.breakables) addProp(w, { kind: 'breakable', x: b.x, z: b.z, hp: 1, model: rng.pick(bm), r: 0.6 });
  for (const c of z.chests) addProp(w, { kind: 'chest', x: c.x, z: c.z, model: 'chest', interact: true, label: 'CHEST' });
  for (const t of z.traps) addProp(w, { kind: 'trap', x: t.x, z: t.z, model: 'spikes', cycle: rng.range(0, 3), r: 1.2 });
  for (const s of z.shrines) { const k = rng.pick(SHRINE_IDS); addProp(w, { kind: 'shrine', x: s.x, z: s.z, shrine: k, model: 'votive', interact: true, label: `VOTIVE SHRINE: ${SHRINES[k].name}` }); }
  for (const n of z.named) {
    if (n.id === 'nest') { spawnMonster(w, 'crawler_nest', n.x, n.z, {}); continue; }
    if (n.id === 'font') { spawnMonster(w, 'unrung_font', n.x, n.z, {}); continue; }
    addProp(w, { kind: 'decor', x: n.x, z: n.z, model: n.id, r: 0.8, solid: n.id !== 'reeds' });
  }
  // Lights live on the zone for the view. Monsters come from S and E markers.
  if (spec.monsters.length) {
    const density = spec.density * w.tuning.density * (w.knell?.mods?.includes('crowded') ? 1.4 : 1);
    z.roomRects.forEach((r) => { r.types = [rng.pick(spec.monsters), rng.pick(spec.monsters)]; });
    for (const s of z.spawns) {
      const room = z.roomRects[s.room ?? 0];
      if (s.kind === 'S') {
        const n = Math.max(1, Math.round(rng.int(4, 9) * density));
        const type = rng.pick(room?.types ?? spec.monsters);
        const pack = w.nextId++;
        for (let i = 0; i < n; i++) { const p = findOpenNear(w, s.x + rng.range(-2.5, 2.5), s.z + rng.range(-2.5, 2.5)); const t2 = MONSTERS[type].big && i > 0 ? rng.pick(spec.monsters.filter((q) => !MONSTERS[q].big)) : type; spawnMonster(w, t2, p.x, p.z, { pack }); }
      } else {
        const chance = (1 / 3) * w.tuning.elite * (w.knell?.mods?.includes('haunted') ? 2 : 1);
        if (rng.chance(chance)) spawnElitePack(w, s.x, s.z);
        else { const n = Math.round(rng.int(3, 6) * density); const type = rng.pick(room?.types ?? spec.monsters); const pack = w.nextId++; for (let i = 0; i < n; i++) { const p = findOpenNear(w, s.x + rng.range(-2, 2), s.z + rng.range(-2, 2)); spawnMonster(w, MONSTERS[type].big ? 'rattlebones' : type, p.x, p.z, { pack }); } }
      }
    }
  }
  // The Collection Plate: 1 in 8 per zone load, 1 in 3 in Knell Runs.
  if (spec.monsters.length && rng.chance(spec.knell ? 1 / 3 : 1 / 8) && z.roomRects.length > 1) {
    const r = z.roomRects[Math.floor(z.roomRects.length / 2)]; spawnPlate(w, r.x + r.w / 2, r.y + r.h / 2);
  }
  // Exits and Lychgates.
  placeExits(w, z);
  for (const [id, lore] of Object.entries(LORE)) if (lore.zone === z.id) {
    const r = z.roomRects[rng.int(0, z.roomRects.length - 1)]; const p = findOpenNear(w, r.x + r.w / 2 + rng.range(-3, 3), r.y + r.h / 2 + rng.range(-2, 2));
    addProp(w, { kind: 'lore', x: p.x, z: p.z, lore: id, model: 'lectern', interact: true, label: lore.title });
  }
}
// Solid furniture closes its cell, so paths and flow fields go around it.
export function applySolids(w) {
  for (const d of w.props) { if (!d.solid || d.solidDone) continue; d.solidDone = true; const col = Math.floor(d.x); const row = Math.floor(d.z); w.zone.nav.setOpen(col, row, false); for (const n of w.navs) n.setOpen(col, row, false); }
}
export function spawnPlate(w, x, z, o = {}) { const p = findOpenNear(w, x, z); const m = spawnMonster(w, 'collection_plate', p.x, p.z, o); return m; }

const ZONE_ORDER = { ossuary1: 'ossuary2', ossuary2: 'ossuary3', ossuary3: 'countinghouse', belfry1: 'belfry2', belfry2: 'belfry3', belfry3: 'belfry_top', knell1: 'knell2' };
function placeExits(w, z) {
  const id = z.id; const spec = z.spec;
  const addExit = (m, to, label) => addProp(w, { kind: 'exit', x: m.x, z: m.z, to, model: 'exitstair', interact: true, label, r: 1.2 });
  const xs = z.marks.filter((m) => m.kind === 'X');
  if (spec.kind === 'gen') {
    const first = xs[0]; const last = xs[xs.length - 1];
    if (spec.knell) { if (ZONE_ORDER[id] && last !== first) addExit(last, ZONE_ORDER[id], 'DESCEND'); }
    else {
      if (id === 'pantry') addExit(first, 'causeway', 'BACK TO THE CAUSEWAY');
      else if (first) addExit(first, id === 'ossuary2' ? 'ossuary1' : id === 'ossuary3' ? 'ossuary2' : id === 'belfry2' ? 'belfry1' : id === 'belfry3' ? 'belfry2' : 'town', id.startsWith('ossuary') && id !== 'ossuary1' || id.startsWith('belfry') && id !== 'belfry1' ? 'GO BACK UP' : 'TO TOLLHAVEN');
      if (last !== first && ZONE_ORDER[id]) addExit(last, ZONE_ORDER[id], id.startsWith('ossuary') ? 'DESCEND' : 'CLIMB');
    }
    for (const g of z.gates) addProp(w, { kind: 'lychgate', x: g.x, z: g.z, model: 'lychgate', interact: true, label: 'LYCHGATE', zoneId: id, r: 1.6 });
  }
  if (spec.kind === 'arena' && id === 'countinghouse') w.deferExit = { zone: id };
}

// Props.
function breakProp(w, p, hero, fromX, fromZ) {
  if (p.broken) return;
  p.broken = true; p.hp = 0;
  emit(w, { t: 'break', id: p.id, x: p.x, z: p.z, model: p.model, fx: fromX, fz: fromZ });
  const rng = w.rngs.loot;
  w.stats.smashed = (w.stats.smashed ?? 0) + 1;
  for (const h of w.heroes) { if (h.left) continue; if (rng.chance(0.4)) dropGold(w, p.x, p.z, goldAmount(w, 0.5), 1, h.seat); }
  if (rng.chance(w.tuning.tallow * 0.625)) dropTallow(w, p.x, p.z);
}
const goldAmount = (w, mul) => Math.max(1, Math.round((3 + monsterLevel(w) * 2) * mul * w.rngs.loot.range(0.7, 1.3) * w.tuning.gold * w.diff.xp * (w.knell?.mods?.includes('golden') ? 2 : 1)));

function dropGold(w, x, z, amount, spread = 1, seat = -1) {
  const r = w.rngs.loot; const p = findOpenNear(w, x + r.range(-spread, spread), z + r.range(-spread, spread));
  const d = { id: w.nextId++, kind: 'gold', x: p.x, z: p.z, amount, seat };
  w.drops.push(d); emit(w, { t: 'drop', id: d.id, kind: 'gold', x: d.x, z: d.z, amount, seat, fx: x, fz: z });
}
function dropCoins(w, x, z, amount, seat) { const d = { id: w.nextId++, kind: 'coins', x, z, amount, seat }; w.drops.push(d); emit(w, { t: 'drop', id: d.id, kind: 'gold', x, z, amount, seat, fx: x, fz: z }); }
function dropTallow(w, x, z) { const r = w.rngs.loot; const p = findOpenNear(w, x + r.range(-1, 1), z + r.range(-1, 1)); const d = { id: w.nextId++, kind: 'tallow', x: p.x, z: p.z, seat: -1 }; w.drops.push(d); emit(w, { t: 'drop', id: d.id, kind: 'tallow', x: d.x, z: d.z, seat: -1, fx: x, fz: z }); }
export function dropItem(w, x, z, item, seat) {
  const r = w.rngs.loot; const p = findOpenNear(w, x + r.range(-1.4, 1.4), z + r.range(-1.4, 1.4));
  const d = { id: w.nextId++, kind: 'item', x: p.x, z: p.z, item, seat, t: 0 };
  w.drops.push(d);
  emit(w, { t: 'drop', id: d.id, kind: 'item', x: d.x, z: d.z, rarity: item.rarity, name: item.name, seat, slot: item.slot, fx: x, fz: z });
  if (item.rarity === 'legendary' || item.rarity === 'set') { emit(w, { t: 'sfx', id: 'bell_loot' }); emit(w, { t: 'toast', seat, text: item.name, color: item.rarity === 'set' ? 'lime' : 'orange', big: true }); w.stats.legendaries = (w.stats.legendaries ?? 0) + 1; }
  return d;
}
function dropsFor(w, m) {
  const elite = !!m.elite;
  const d = m.defn;
  for (const h of w.heroes) {
    if (h.left || h.isPyx) continue;
    const ilvl = Math.max(1, m.level);
    // Plate jackpot, bosses and elites have their own rules.
    if (m.type === 'collection_plate') { for (let i = 0; i < 16; i++) dropGold(w, m.x, m.z, goldAmount(w, 3), 3, h.seat); for (let i = 0; i < 2; i++) dropItem(w, m.x, m.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl, cls: h.cls }), h.seat); if (w.rngs.loot.chance(0.5)) dropItem(w, m.x, m.z, rollLegendaryItem(w.rngs.loot, h.cls, ilvl), h.seat); h.plates = (h.plates ?? 0) + 1; continue; }
    if (d.boss || d.named) { for (let i = 0; i < (d.boss ? 6 : 3); i++) dropGold(w, m.x, m.z, goldAmount(w, 3), 2, h.seat); if (d.named) dropItem(w, m.x, m.z, makeItem(w.rngs.loot, { rarity: 'reliquary', ilvl, cls: h.cls }), h.seat); continue; }
    if (elite) {
      const n = w.rngs.loot.int(1, 3);
      for (let i = 0; i < n; i++) { const it = rollDrop(w, h, 'elite', ilvl); if (it) dropItem(w, m.x, m.z, it, h.seat); }
      dropGold(w, m.x, m.z, goldAmount(w, 3), 1.5, h.seat);
      if (w.rngs.loot.chance(0.25)) grantGem(w, h, m.x, m.z);
    } else {
      if (!m.minion || w.rngs.loot.chance(0.4)) { const it = rollDrop(w, h, 'trash', ilvl); if (it) dropItem(w, m.x, m.z, it, h.seat); }
      if (w.rngs.loot.chance(d.gold * 0.5)) dropGold(w, m.x, m.z, goldAmount(w, d.big ? 1.5 : 1), 1, h.seat);
    }
  }
  const tallowP = elite ? 1 : w.tuning.tallow;
  if (w.rngs.loot.chance(tallowP)) dropTallow(w, m.x, m.z);
}
export function grantGem(w, h, x, z) { const g = randomGem(w.rngs.loot); const d = { id: w.nextId++, kind: 'gem', x: x + w.rngs.loot.range(-1, 1), z: z + w.rngs.loot.range(-1, 1), gem: g, seat: h.seat }; const p = findOpenNear(w, d.x, d.z); d.x = p.x; d.z = p.z; w.drops.push(d); emit(w, { t: 'drop', id: d.id, kind: 'gem', x: d.x, z: d.z, seat: h.seat, gem: g.k, fx: x, fz: z }); }

export function stepDrops(w) {
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.t = (d.t ?? 0) + DT;
    if (d.t < 0.35) continue;
    for (const h of w.heroes) {
      if (h.dead || h.left || h.isPyx) continue;
      if (d.seat >= 0 && d.seat !== h.seat) continue;
      const dx = h.x - d.x; const dz = h.z - d.z; const dd = Math.hypot(dx, dz);
      if (d.kind === 'gold' || d.kind === 'coins') {
        if (dd < h.stats.pickupR) { const v = 11 * DT; d.x += (dx / (dd || 1)) * v; d.z += (dz / (dd || 1)) * v; d.pulled = true; }
        if (dd < 0.6) {
          const mul = 1 + h.stats.goldFind / 100 + (hasBuff(h, 'plenty') ? 1 : 0);
          const amt = Math.round(d.amount * mul);
          h.gold += amt; h.goldEarned += amt;
          emit(w, { t: 'pickup', id: d.id, kind: 'gold', seat: h.seat, amount: amt, x: d.x, z: d.z });
          if (d.kind === 'coins') healHero(w, h, 0.04);
          if (h.powers.has('plate_lining')) { healHero(w, h, 0.01); if (h.plateT < w.time) h.plateN = 0; h.plateN = Math.min(30, h.plateN + 1); h.plateT = w.time + 5; }
          w.drops.splice(i, 1); break;
        }
      } else if (d.kind === 'tallow') {
        if (dd < 1.3) { healHero(w, h, 0.2); h.tallow = (h.tallow ?? 0) + 1; emit(w, { t: 'pickup', id: d.id, kind: 'tallow', seat: h.seat, x: d.x, z: d.z }); emit(w, { t: 'tutorial', seat: h.seat, id: 'tallow' }); w.drops.splice(i, 1); break; }
      } else if (d.kind === 'gem') {
        if (dd < 1.2) { const key = `${d.gem.k}:${d.gem.tier}`; h.gems[key] = (h.gems[key] ?? 0) + 1; emit(w, { t: 'pickup', id: d.id, kind: 'gem', seat: h.seat, gem: d.gem.k, x: d.x, z: d.z }); w.drops.splice(i, 1); break; }
      } else if (d.kind === 'item') {
        if (dd < 1.1) {
          if (h.inv.length >= 40) { if (!d.warned) { d.warned = true; emit(w, { t: 'toast', seat: h.seat, text: 'YOUR PACK IS FULL. SALVAGE SOMETHING.', color: 'red' }); } break; }
          pickItem(w, h, d.item);
          emit(w, { t: 'pickup', id: d.id, kind: 'item', seat: h.seat, x: d.x, z: d.z, rarity: d.item.rarity });
          w.drops.splice(i, 1); break;
        }
      }
    }
  }
}
export function pickItem(w, h, it) {
  h.inv.push(it);
  const slot = it.slot; const cur = h.gear[slot];
  if (canWear(it, h) && (!cur || itemScore(it, h) > itemScore(cur, h))) {
    h.newest = it.uid;
    emit(w, { t: 'upgrade', seat: h.seat, uid: it.uid, name: it.name, rarity: it.rarity });
  }
  emit(w, { t: 'sheet', seat: h.seat });
}

// Allies: minions, turrets and Sister Pyx.
function summon(w, c, op) {
  const h = c.hero; const kind = op.kind;
  const live = w.allies.filter((a) => a.owner === h.id && a.minion && !a.dead && !a.ttl);
  if (!op.ttl && live.length >= (op.max ?? 4)) { const old = live[0]; old.dead = true; emit(w, { t: 'allygone', id: old.id, burst: true }); }
  const rng = w.rngs.ai; const p = findOpenNear(w, c.x + rng.range(-2, 2), c.z + rng.range(-2, 2));
  const hpBase = h.stats.maxHp * 0.4 * (op.hpMul ?? 1);
  const a = { id: w.nextId++, kind, owner: h.id, seat: h.seat, x: p.x, z: p.z, px: p.x, pz: p.z, facing: 0, hp: hpBase, maxHp: hpBase, minion: true, dmg: op.dmg ?? 0.6, slam: !!op.slam, speedMul: op.speedMul ?? 1, explode: op.explode ?? 0, ttl: op.ttl ?? 0, cd: 0, state: 'idle', c: { hero: h, src: h, sk: { element: 'grave', id: 'minion' }, mult: 1, x: 0, z: 0, ox: 0, oz: 0, ax: 0, az: 1, targets: 0 }, crook: !!op.crook, big: kind === 'coffin_crew' };
  w.allies.push(a);
  emit(w, { t: 'ally', id: a.id, kind, x: a.x, z: a.z, owner: h.id, seat: h.seat, big: a.big || a.crook, rise: true });
}
export function stepAllies(w) {
  for (let i = w.allies.length - 1; i >= 0; i--) {
    const a = w.allies[i];
    if (a.dead) { w.allies.splice(i, 1); continue; }
    a.px = a.x; a.pz = a.z;
    const owner = w.heroes.find((h) => h.id === a.owner);
    if (a.ttl) { a.ttl -= DT; if (a.ttl <= 0) { expireAlly(w, a, owner); continue; } }
    if (a.turret) { stepTurret(w, a, owner); continue; }
    if (a.kind === 'pyx') { stepPyx(w, a); continue; }
    if (a.hp <= 0) {
      if (a.explode && owner) runOps(w, { hero: owner, src: owner, x: a.x, z: a.z, ox: a.x, oz: a.z, ax: 0, az: 1, sk: { element: 'grave', id: 'minion' }, mult: 1, targets: 0 }, [{ op: 'circle', radius: 3, dmg: a.explode, vfx: 'ring_grave', sfx: 'grave_burst' }]);
      a.dead = true; emit(w, { t: 'allygone', id: a.id, burst: true }); continue;
    }
    if (!owner || owner.left) { a.dead = true; emit(w, { t: 'allygone', id: a.id }); continue; }
    // Fetch nearest foe; else keep near the owner.
    let best = null; let bd = 14;
    for (const m of w.active) { if (m.dead || m.untargetable) continue; const d = Math.hypot(m.x - a.x, m.z - a.z); if (d < bd) { bd = d; best = m; } }
    let tx = owner.x; let tz = owner.z; let stop = 2.5;
    if (best) { tx = best.x; tz = best.z; stop = best.r + 1; }
    const dx = tx - a.x; const dz = tz - a.z; const d = Math.hypot(dx, dz) || 1;
    if (d > 30) { a.x = owner.x; a.z = owner.z; continue; }
    a.cd -= DT;
    if (d > stop) {
      const danse = hasBuff(owner, 'danse');
      const sp = 4.5 * a.speedMul * (danse ? 1 + (danse.speed ?? 0) : 1);
      let nx = dx / d; let nz = dz / d;
      if (!w.zone.nav.lineOfSight(a.x, a.z, tx, tz)) { const o = [0, 0]; w.navs[owner.seat % 4].flowTo(owner.x, owner.z); if (w.navs[owner.seat % 4].flowDirection(a.x, a.z, o)) { nx = o[0]; nz = o[1]; } }
      moveCircle(w, a, nx * sp * DT, nz * sp * DT, 0.3); a.facing = Math.atan2(nx, nz); a.moving = true;
    } else {
      a.moving = false;
      if (best && a.cd <= 0) {
        a.cd = (a.slam ? 1.6 : 0.9) / a.speedMul; a.facing = Math.atan2(dx, dz);
        const danse = hasBuff(owner, 'danse'); const mul = 1 + (danse ? danse.minionDmg ?? 0.5 : 0);
        const c = { ...a.c, hero: owner, src: owner, x: a.x, z: a.z, ox: a.x, oz: a.z, mult: mul };
        emit(w, { t: 'matk', id: a.id, clip: a.slam ? 'CoffinSlam' : 'Slash1', dur: 0.3, ally: true });
        if (a.slam) { runOps(w, c, [{ op: 'circle', radius: 2.2, dmg: a.dmg, vfx: 'ring_chain', sfx: 'coffin_crash' }]); }
        else heroHit(w, c, best, a.dmg, { element: 'grave', noRes: true, sfx: 'hit_bone' });
        if (owner.vows.includes('perpetual_care')) healHero(w, owner, 0.01);
      }
    }
  }
}
function expireAlly(w, a, owner) {
  if (a.endBlast && owner) runOps(w, { hero: owner, src: owner, x: a.x, z: a.z, ox: a.x, oz: a.z, ax: 0, az: 1, sk: { element: 'flame', id: 'lamp_post' }, mult: 1, targets: 0 }, [{ op: 'circle', radius: 5, dmg: a.endBlast, vfx: 'ring_fire', sfx: 'explode_fire', shake: 0.3 }]);
  a.dead = true; emit(w, { t: 'allygone', id: a.id, burst: !!a.endBlast });
}
function stepTurret(w, a, owner) {
  if (!owner) { a.dead = true; emit(w, { t: 'allygone', id: a.id }); return; }
  a.rateT -= DT;
  if (a.healAura && Math.floor((a.ttl ?? 0) * 60) % 30 === 0) for (const h of w.heroes) if (near(h, a.x, a.z, 4)) healHero(w, h, a.healAura);
  if (a.rateT > 0) return;
  a.rateT = a.rate;
  const c = { ...a.c, hero: owner, src: owner, x: a.x, z: a.z, ox: a.x, oz: a.z, sk: { element: a.kind === 'lamp' ? 'flame' : 'sound', id: a.kind }, mult: 1, targets: 0 };
  if (a.kind === 'iron_bell') { runOps(w, c, [{ op: 'circle', radius: a.radius ?? 3, dmg: a.dmg, vfx: 'ring_bronze', sfx: 'bell_small' }]); return; }
  if (a.kind === 'lamp') {
    let best = null; let bd = a.range;
    for (const m of w.active) { if (m.dead || m.untargetable) continue; const d = Math.hypot(m.x - a.x, m.z - a.z); if (d < bd && w.zone.nav.lineOfSight(a.x, a.z, m.x, m.z)) { bd = d; best = m; } }
    if (best) {
      const d = bd || 1; const ax = (best.x - a.x) / d; const az = (best.z - a.z) / d; c.ax = ax; c.az = az;
      const tone = a.setBolt ? owner.slots.find((s) => s.skill === 'spark_bolt')?.tone : null;
      fireProjectile(w, c, { speed: 20, range: a.range, width: 0.5, dmg: a.dmg, look: 'spark', ...(tone === 'star' ? { chain: { count: 2, range: 7, mult: 0.5 } } : {}), ...(tone === 'split' ? { pierceN: 1, forkOnKill: 2 } : {}) });
      emit(w, { t: 'sfx', id: 'spark', x: a.x, z: a.z, rate: 0.2 });
    }
    if (a.arc) { for (const o of w.allies) if (o !== a && o.kind === 'lamp' && o.owner === a.owner && !o.dead && o.id > a.id) { emit(w, { t: 'arc', x: a.x, z: a.z, x2: o.x, z2: o.z, element: 'flame' }); for (const m of [...w.active]) { if (m.dead) continue; const dx = o.x - a.x; const dz = o.z - a.z; const L2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((m.x - a.x) * dx + (m.z - a.z) * dz) / L2)); if (Math.hypot(m.x - (a.x + dx * u), m.z - (a.z + dz * u)) < m.r + 0.4) heroHit(w, c, m, a.dmg * 0.8, { element: 'flame' }); } } }
  }
}
export function addPyx(w) {
  if (w.allies.some((a) => a.kind === 'pyx')) return;
  const h0 = w.heroes[0]; const hp = h0.stats.maxHp * 0.8;
  const a = { id: w.nextId++, kind: 'pyx', owner: h0.id, seat: h0.seat, x: h0.x + 1, z: h0.z, px: h0.x, pz: h0.z, facing: 0, hp, maxHp: hp, minion: true, keepsMinion: true, cd: 0, cd2: 4, cd3: 8, downT: 0, state: 'idle', c: { hero: h0, src: h0, sk: { element: 'phys', id: 'pyx' }, mult: 0.6, targets: 0 } };
  const p = findOpenNear(w, a.x, a.z); a.x = p.x; a.z = p.z;
  w.allies.push(a);
  emit(w, { t: 'ally', id: a.id, kind: 'pyx', x: a.x, z: a.z, owner: h0.id, seat: 0 });
  w.story.flags.pyx = true;
}
export function removePyx(w) { for (const a of w.allies) if (a.kind === 'pyx') { a.dead = true; emit(w, { t: 'allygone', id: a.id }); } }
function stepPyx(w, a) {
  const h = w.heroes.find((o) => !o.left && !o.dead) ?? w.heroes[0]; if (!h) return;
  a.maxHp = h.stats.maxHp * 0.8;
  if (a.downT > 0) { a.downT -= DT; if (a.downT <= 0) { a.hp = a.maxHp * 0.6; a.state = 'idle'; emit(w, { t: 'banter', tag: 'revive' }); emit(w, { t: 'vfx', kind: 'ring_grave', x: a.x, z: a.z, r: 2 }); } return; }
  if (a.hp <= 0) { a.downT = 20; a.state = 'down'; emit(w, { t: 'banter', tag: 'down' }); emit(w, { t: 'allydown', id: a.id }); return; }
  a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.01 * DT);
  a.cd -= DT; a.cd2 -= DT; a.cd3 -= DT;
  let best = null; let bd = 14;
  for (const m of w.active) { if (m.dead || m.untargetable) continue; const d = Math.hypot(m.x - a.x, m.z - a.z); if (d < bd && w.zone.nav.lineOfSight(a.x, a.z, m.x, m.z)) { bd = d; best = m; } }
  const ox = h.x - Math.sin(h.facing) * 2.2 + 1; const oz = h.z - Math.cos(h.facing) * 2.2;
  const dx = ox - a.x; const dz = oz - a.z; const d = Math.hypot(dx, dz) || 1;
  a.moving = false;
  if (d > 40) { a.x = h.x; a.z = h.z; a.px = a.x; a.pz = a.z; }
  else if (d > 2) { let nx = dx / d; let nz = dz / d; if (!w.zone.nav.lineOfSight(a.x, a.z, ox, oz)) { const o = [0, 0]; w.navs[0].flowTo(h.x, h.z); if (w.navs[0].flowDirection(a.x, a.z, o)) { nx = o[0]; nz = o[1]; } } moveCircle(w, a, nx * 5.3 * DT, nz * 5.3 * DT, 0.3); a.facing = Math.atan2(nx, nz); a.moving = true; }
  const c = { ...a.c, hero: h, src: h, x: a.x, z: a.z, ox: a.x, oz: a.z, mult: 0.6, targets: 0 };
  if (best) {
    a.facing = Math.atan2(best.x - a.x, best.z - a.z);
    const ax = Math.sin(a.facing); const az = Math.cos(a.facing); c.ax = ax; c.az = az;
    if (a.cd <= 0) { a.cd = 0.8; fireProjectile(w, c, { speed: 20, range: 14, width: 0.4, dmg: 1, look: 'bolt' }); emit(w, { t: 'matk', id: a.id, clip: 'CastWeapon', dur: 0.2, ally: true }); emit(w, { t: 'sfx', id: 'crossbow', x: a.x, z: a.z, rate: 0.2 }); }
    if (a.cd2 <= 0) { a.cd2 = 8; for (let i = -2; i <= 2; i++) { const ang = a.facing + i * 0.2; fireProjectile(w, { ...c, ax: Math.sin(ang), az: Math.cos(ang) }, { speed: 20, range: 12, width: 0.4, dmg: 0.8, look: 'bolt' }); } emit(w, { t: 'banter', tag: 'volley' }); }
  }
  if (a.cd3 <= 0) { a.cd3 = 15; if (w.heroes.some((o) => !o.left && !o.dead && o.hp < o.stats.maxHp * 0.6)) { for (const o of w.heroes) healHero(w, o, 0.15); emit(w, { t: 'vfx', kind: 'ring_grave', x: a.x, z: a.z, r: 3 }); emit(w, { t: 'banter', tag: 'bless' }); } }
}

// Malison's arena pieces.
function malisonPillars(w) {
  const cx = w.zone.w / 2; const cz = w.zone.h / 2; const out = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const p = { id: w.nextId++, x: cx + Math.cos(a) * 9, z: cz + Math.sin(a) * 9, hits: 0, broken: false }; out.push(p); const o = { id: w.nextId++, x: p.x, z: p.z, r: 0.9, t: 1e9, look: 'pillar', pillar: p.id }; w.obstacles.push(o); p.obstacle = o; p.cells = []; const pc = Math.floor(p.x); const pr = Math.floor(p.z); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (w.zone.nav.isOpen(pc + dx, pr + dy)) { p.cells.push([pc + dx, pr + dy]); w.zone.nav.setOpen(pc + dx, pr + dy, false); for (const n of w.navs) n.setOpen(pc + dx, pr + dy, false); } emit(w, { t: 'obstacle', id: o.id, x: p.x, z: p.z, r: 0.9, look: 'pillar', dur: 1e9 }); }
  return out;
}
function breakPillar(w, p) { for (const [c, r] of p.cells ?? []) { w.zone.nav.setOpen(c, r, true); for (const n of w.navs) n.setOpen(c, r, true); } const o = p.obstacle; const i = w.obstacles.indexOf(o); if (i >= 0) w.obstacles.splice(i, 1); emit(w, { t: 'obstacleend', id: o.id, burst: true }); emit(w, { t: 'sfx', id: 'crumble' }); }
function malisonRopes(w) { const cx = w.zone.w / 2; const cz = w.zone.h / 2; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 1; const p = findOpenNear(w, cx + Math.cos(a) * 16, cz + Math.sin(a) * 16); const pr = addProp(w, { kind: 'rope', x: p.x, z: p.z, model: 'rope', interact: true, hold: 2, label: 'RING THE BELL', r: 1.4 }); emit(w, { t: 'propadd', id: pr.id, kind: 'rope', x: pr.x, z: pr.z, model: 'rope', label: pr.label }); } emit(w, { t: 'toast', seat: -1, text: 'THREE BELL ROPES HANG AT THE RIM. RING HER DOWN.', color: 'sand', big: true }); }
function setCell(w, col, row, ch) {
  const z = w.zone; z.rows[row] = z.rows[row].slice(0, col) + ch + z.rows[row].slice(col + 1);
  const open = ch === '.'; z.nav.setOpen(col, row, open); for (const n of w.navs) n.setOpen(col, row, open);
}
const closeCell = (w, col, row) => setCell(w, col, row, '~');
// A pit opens only if the rim, the ropes and the heroes all stay connected.
function closePit(w, col, row) {
  const z = w.zone; const cells = [];
  if ((w.pillars ?? []).some((p) => !p.broken && Math.hypot(p.x - col, p.z - row) < 4.5)) return false;
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) { const c = col + x; const r = row + y; if (z.rows[r]?.[c] === '.') { setCell(w, c, r, '~'); cells.push([c, r]); } }
  const cx = z.w / 2; const cz = z.h / 2; const hub = findOpenNear(w, cx, cz); let ok = true;
  for (let i = 0; i < 3 && ok; i++) { const a = (i / 3) * Math.PI * 2 + 1; const p = findOpenNear(w, cx + Math.cos(a) * 16, cz + Math.sin(a) * 16); if (!z.nav.path([hub.x, 0, hub.z], [p.x, 0, p.z])) ok = false; }
  for (const h of w.heroes) { if (!ok || h.left) break; if (!z.nav.path([hub.x, 0, hub.z], [h.x, 0, h.z])) ok = false; }
  if (!ok) { for (const [c, r] of cells) setCell(w, c, r, '.'); return false; }
  return true;
}

function bossDead(w, m, killer) {
  for (const a of w.monsters) if (a !== m && !a.dead && a.summoned) { a.hp = 0; a.noLoot = true; killMonster(w, a, null, {}); }
  onBossDead(w, m, killer);
  if (m.defn.boss.startsWith('warden')) wardenDead(w, m, killer);
  if (m.defn.boss === 'bursar' || m.defn.boss === 'ambrose') {
    const p = findOpenNear(w, m.x + 2, m.z + 2);
    const pr = addProp(w, { kind: 'exit', x: p.x, z: p.z, to: 'town', model: 'exitstair', interact: true, label: 'TO TOLLHAVEN', r: 1.2 }); emit(w, { t: 'propadd', id: pr.id, kind: 'exit', x: pr.x, z: pr.z, model: 'exitstair', label: pr.label });
  }
}
function heroDied(w, h) { emit(w, { t: 'banter', tag: 'herodown' }); if (w.boss?.m?.defn.boss === 'malison') emit(w, { t: 'say', who: 'malison', text: 'DOWN YOU GO. GIVE MY REGARDS TO THE WORMS.' }); }
function deadStep(w, h) { /* the death overlay or a co-op ally brings them back */ }

export const HOOKS = { populate, entered: zoneEntered, breakProp, summon, dropsFor, dropGold, dropCoins, hitHero, bossDead, onKill(w, m, killer) { onKillQuest(w, m, killer); knellOnKill(w, m, killer); }, levelUp(w, h) { w.hooksExtra?.levelUp?.(w, h); }, heroDied, deadStep, malisonPillars, malisonRopes, closeCell, closePit, breakPillar };
export { goldAmount, dropGold, dropTallow, ringRope, questFlag, F, CLASSES, nearestHero, partyLevel, walkable, damageHero, gainResource, refresh, addBuff, reviveHero, stunMonster, telegraph, wake, rollSetItem, enterZone, after, ZONES };
