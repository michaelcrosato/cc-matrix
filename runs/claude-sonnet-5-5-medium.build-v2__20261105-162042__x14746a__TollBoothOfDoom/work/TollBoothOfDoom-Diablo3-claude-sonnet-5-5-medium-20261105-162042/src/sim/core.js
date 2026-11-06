// Shared sim helpers: events, damage, healing, kills, drops, movement. Plain JS, deterministic.
import { Rng } from '../../pixel-engine.js';
import { MONSTERS, AFFLICTIONS } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { DIFFS, monsterHpBase, monsterHitBase, monsterXp, reduction, xpToNext, LEVEL_CAP, clamp } from './stats.js';
import { rollDrop, deriveStats, newUid } from './items.js';
import { defaultTuning } from '../data/tuning.js';
import { cellAt } from './zonegen.js';
import { onHeroDamaged, onKillPower, onPickupGold, modifyIncomingFatal } from './powers.js';

export const DT = 1 / 60;
export const ev = (w, e) => { e.tick = w.tick; w.events.push(e); };
export const sim = (w) => w.rng;

export function createWorld(opts = {}) {
  const root = new Rng(opts.seed ?? 1);
  const w = {
    seed: opts.seed ?? 1, root, rng: root.fork('sim'), lootRng: root.fork('loot'), t: 0, tick: 0,
    tuning: { ...defaultTuning(), ...(opts.tuning || {}) }, diffId: opts.difficulty || 'pilgrim', mode: opts.mode || 'campaign',
    zone: null, zoneId: null, zoneDef: null, navs: [], heroes: [], monsters: [], shots: [], areas: [], drops: [], props: [], spots: [], events: [], nid: 1,
    kills: 0, killsByType: {}, quest: null, flags: {}, timeScale: 1, hash: new Map(), paused: false, noSpawn: false,
    session: !!opts.session, bossFight: null, knell: null, minionsCount: 0, banner: null, requiem: { count: 0, t: 0, xp: 0 }, devFlags: {},
  };
  return w;
}
export const diff = (w) => DIFFS.find((d) => d.id === w.diffId) || DIFFS[0];
export const nid = (w) => w.nid++;
export const partyLevel = (w) => Math.max(1, ...w.heroes.map((h) => h.level));
export const livingHeroes = (w) => w.heroes.filter((h) => h.alive && !h.gone);

// ---------- heroes ----------
export function makeHero(w, { seat, cls, name, level = 1, bot = false, saved = null }) {
  const c = CLASSES[cls];
  const h = {
    id: nid(w), seat, cls, name, level, xp: 0, x: 0, z: 0, vx: 0, vz: 0, facing: 0, alive: true, gone: false, bot,
    hp: 1, maxHp: 1, res: 0, resMax: 100, gear: {}, inv: [], skills: [], cd: [0, 0, 0, 0, 0, 0], charges: [0, 0, 0, 0, 0, 0], vows: [], gold: 0,
    mats: { scrap: 0, dust: 0, shards: 0 }, gems: [], reliquary: [null, null, null], potionCd: 0, dodgeCd: 0, dodgeT: 0, dodgeDir: [0, 1], inv_t: 0,
    cast: null, casting: 0, combo: 0, comboT: 0, status: {}, stats: null, devotion: null, unlocked: { skills: [], tones: {} },
    downT: 0, deaths: 0, recentDeaths: [], kills: 0, damageDone: 0, revives: 0, goldFound: 0, eliteKills: 0, lastDamaged: -99, uid: newUid(),
    swat: 0, spellCount: 0, lastStand: -999, relicTimer: 0, goldBuff: [], channel: 0, passing: 0, aimX: 0, aimZ: 1, lockT: [0, 0, 0, 0, 0, 0], interactHold: 0,
    buffs: [], slowT: 0, rootT: 0, stunT: 0, summoned: 0, lastCombat: -99, danse: 0, peal: null,
  };
  if (saved) Object.assign(h, saved);
  w.heroes.push(h);
  refreshStats(w, h, true);
  return h;
}
export function refreshStats(w, h, fill = false) {
  const s = deriveStats(h, w.devotion || null);
  h.stats = s;
  const ratio = h.maxHp > 0 ? h.hp / h.maxHp : 1;
  h.maxHp = Math.round(s.maxHpBase * w.tuning.playerLife);
  h.hp = fill ? h.maxHp : Math.min(h.maxHp, Math.max(1, Math.round(h.maxHp * ratio)));
  h.resMax = s.resMax;
  if (fill) h.res = CLASSES[h.cls].resKey === 'wick' ? h.resMax : 0;
}

// ---------- movement ----------
export function walkable(w, x, z, r = 0) {
  const zn = w.zone;
  if (!zn) return false;
  const c = cellAt(zn, x - r, z - r) === 1 && cellAt(zn, x + r, z - r) === 1 && cellAt(zn, x - r, z + r) === 1 && cellAt(zn, x + r, z + r) === 1;
  return c;
}
export function moveBy(w, e, dx, dz, r = 0.3) {
  if (dx === 0 && dz === 0) return;
  if (e.noclip) { e.x += dx; e.z += dz; return; }
  // a body already overlapping a wall may still slide out of it (never stuck in a doorway)
  const wedged = !walkable(w, e.x, e.z, r);
  if (walkable(w, e.x + dx, e.z, r) || (wedged && walkable(w, e.x + dx, e.z, r * 0.2))) e.x += dx;
  if (walkable(w, e.x, e.z + dz, r) || (wedged && walkable(w, e.x, e.z + dz, r * 0.2))) e.z += dz;
  // obstacles (coffins etc.)
  for (const a of w.areas) if (a.block && !e.ghost) {
    const d = Math.hypot(e.x - a.x, e.z - a.z);
    if (d < a.r * 0.5 + r && d > 0.001) { const k = (a.r * 0.5 + r - d); e.x += ((e.x - a.x) / d) * k; e.z += ((e.z - a.z) / d) * k; }
  }
}
export function snapToFloor(w, e) {
  if (walkable(w, e.x, e.z, 0.3)) return;
  for (let rad = 1; rad < 12; rad += 0.5) for (let a = 0; a < 16; a++) {
    const x = e.x + Math.cos((a / 16) * 6.283) * rad, z = e.z + Math.sin((a / 16) * 6.283) * rad;
    if (walkable(w, x, z, 0.3)) { e.x = x; e.z = z; return; }
  }
}

// ---------- spatial hash ----------
export function rebuildHash(w) {
  w.hash.clear();
  for (const m of w.monsters) {
    if (m.dead) continue;
    const k = Math.floor(m.x / 2) * 4096 + Math.floor(m.z / 2);
    let b = w.hash.get(k); if (!b) { b = []; w.hash.set(k, b); } b.push(m);
  }
}
export function monstersNear(w, x, z, r, fn) {
  const c0 = Math.floor((x - r) / 2), c1 = Math.floor((x + r) / 2), r0 = Math.floor((z - r) / 2), r1 = Math.floor((z + r) / 2);
  const out = [];
  for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) {
    const b = w.hash.get(c * 4096 + rr); if (!b) continue;
    for (const m of b) { if (m.dead) continue; const d = Math.hypot(m.x - x, m.z - z); if (d <= r + m.r) out.push(m); }
  }
  return out;
}
export function foesNear(w, x, z, r, team = 'monster') {
  if (team === 'monster') return monstersNear(w, x, z, r).filter((m) => !m.team || m.team === 'monster');
  return livingHeroes(w).filter((h) => Math.hypot(h.x - x, h.z - z) <= r + 0.4);
}
export function allyMinions(w, seat) { return w.monsters.filter((m) => !m.dead && m.team === 'hero' && (seat == null || m.owner === seat)); }

// ---------- damage ----------
const elementKey = { sound: 'sound', flame: 'flame', grave: 'grave' };
export function heroHit(w, h, m, pct, o = {}) {
  const s = h.stats;
  let amt = s.weaponDps * pct * (1 + s.power / 100) * w.tuning.playerDamage * (1 + s.dmgPct / 100);
  const ek = elementKey[o.el]; if (ek) amt *= 1 + s[ek] / 100;
  if (o.area) amt *= 1 + s.area / 100;
  if (h.buffs.length) for (const b of h.buffs) if (b.dmg) amt *= 1 + b.dmg;
  if (h.markDmg && h.markDmg > w.t) amt *= 1.2;
  if (o.mult) amt *= o.mult;
  if (m.status.burn && o.el !== 'burn') amt *= 1.15;
  if (m.status.curse) amt *= 1 + m.status.curse.v;
  if (m.status.mark) amt *= 1.2;
  if (h.stats.sets.last_lamplighter >= 2 && o.el === 'flame') amt *= 1.1;
  if (s.vowContrition && h.hp < h.maxHp * 0.5) amt *= 1.15;
  if (h.stats.powers.has('malison_knuckle') && m.elite) amt *= 1.25;
  if (h.stats.powers.has('mourning_band')) amt *= 1 + Math.min(0.3, 0.05 * (allyMinions(w, h.seat).length));
  if (h.platBuff && h.platBuff.t > w.t) amt *= 1 + h.platBuff.v;
  if (h.veil && h.veil > w.t) { amt *= 2; h.veil = 0; }
  if (m.status.resonance && o.consume === 'resonance') { amt *= 1 + 0.25 * m.status.resonance.n; if (h.stats.sets.ringing_order >= 4) amt *= 4; m.status.resonance = null; }
  if (h.devFlags && h.devFlags.oneHit) amt = m.maxHp;
  const critCh = (s.crit + (s.vowBright && m.status.burn ? 10 : 0)) / 100;
  const crit = w.rng.chance(clamp(critCh, 0, 1));
  if (crit) amt *= 1.5 + s.critDmg / 100;
  amt = Math.max(1, Math.round(amt));
  dealToMonster(w, h, m, amt, { ...o, crit });
  if (s.lifeHit) heal(w, h, s.lifeHit * 0.6, true);
  if (o.res !== false && h.cls === 'bellwarden') addResonance(w, h, m);
  return amt;
}
export function addResonance(w, h, m) {
  const max = h.stats.powers.has('deaf_cowl') ? 8 : h.stats.sets.ringing_order >= 2 ? 10 : 5;
  const r = m.status.resonance || (m.status.resonance = { n: 0, t: 0 });
  r.n = Math.min(max, r.n + 1); r.t = 6;
}
export function dealToMonster(w, src, m, amt, o = {}) {
  if (m.dead) return;
  if (m.invuln && m.invuln > w.t) return;
  if (m.shield) { m.shield -= amt; if (m.shield > 0) { ev(w, { t: 'hit', id: m.id, x: m.x, z: m.z, amt: 0, shield: true }); return; } amt = -m.shield; m.shield = 0; }
  m.hp -= amt; if (m.hpFloor != null && m.hp < m.hpFloor) m.hp = m.hpFloor;
  m.lastHit = w.t; m.flash = 2;
  if (src && src.id) m.lastAttacker = src.id;
  if (src && src.stats) { src.damageDone += amt; src.lastCombat = w.t; }
  if (src && src.team === 'hero') src.dmgDone = (src.dmgDone || 0) + amt;
  ev(w, { t: 'hit', id: m.id, x: m.x, z: m.z, amt, crit: !!o.crit, el: o.el || 'phys', kind: m.type });
  if (o.knock && !m.static && !m.boss && m.stunImmune !== true) {
    const dx = m.x - (o.fromX ?? src.x), dz = m.z - (o.fromZ ?? src.z), d = Math.hypot(dx, dz) || 1;
    const k = o.knock / (m.big ? 2.2 : 1);
    m.kx += (dx / d) * k * 6; m.kz += (dz / d) * k * 6;
  }
  if (o.stun && !m.boss) stun(m, o.stun);
  if (o.status) applyStatus(w, m, o.status, src);
  if (o.burn && src && src.stats) applyStatus(w, m, { id: 'burn', t: 4, dps: 0.3 + (src.stats.sets.last_lamplighter >= 2 ? 0.3 * 0.3 : 0) }, src);
  if (m.wake) { m.wake = false; }
  if (m.state === 'dormant' || m.state === 'idle') { m.state = 'aggro'; wakePack(w, m); }
  if (m.type === 'bursar' || m.boss) { /* boss hooks handled in bosses.js */ }
  if (m.hp <= 0) killMonster(w, m, src, amt, o);
}
export function stun(m, t) { if (m.stunImmune) return; m.stunT = Math.max(m.stunT || 0, t); if (m.state === 'wind') { m.state = 'recover'; m.t = 0.3; } }
export function applyStatus(w, m, s, src) {
  m.status[s.id] = { t: s.t, dps: s.dps || 0, src: src ? src.id : 0, acc: 0, v: s.v || 0 };
}
export function wakePack(w, m) {
  if (!m.pack) return;
  for (const o of w.monsters) if (o.pack === m.pack && !o.dead && o.state === 'dormant') o.state = 'aggro';
}
export function heal(w, h, amt, quiet) {
  if (!h.alive) return;
  const b = h.hp; h.hp = Math.min(h.maxHp, h.hp + amt);
  if (!quiet && h.hp > b) ev(w, { t: 'heal', id: h.id, x: h.x, z: h.z, amt: Math.round(h.hp - b) });
}

export function monsterLevel(w) { return Math.max(partyLevel(w), (w.zoneDef && w.zoneDef.level) || 1, w.levelFloor || 1); }
export function monsterStats(w, type, lvl, mods = {}) {
  const d = MONSTERS[type]; const df = diff(w);
  const players = Math.max(1, w.heroes.filter((h) => !h.gone && !h.bot).length || w.heroes.length);
  const hp = monsterHpBase(lvl) * d.hp * (1 + 0.6 * (players - 1)) * df.hp * (d.boss ? w.tuning.monsterHp / 1.5 : w.tuning.monsterHp) * (mods.hpMult || 1) * (w.knellHp || 1);
  const hit = monsterHitBase(lvl) * d.hit * df.dmg * w.tuning.monsterDamage * (mods.hitMult || 1) * (w.knellDmg || 1);
  return { hp, hit };
}
export function spawnMonster(w, type, x, z, o = {}) {
  const d = MONSTERS[type];
  const lvl = o.level || monsterLevel(w);
  const st = monsterStats(w, type, lvl, o);
  const m = {
    id: nid(w), type, x, z, vx: 0, vz: 0, kx: 0, kz: 0, facing: o.facing ?? w.rng.range(0, 6.28), level: lvl, hp: st.hp, maxHp: st.hp, hit: st.hit, r: d.r * (o.scale || 1), speed: d.speed * (o.speedMult || 1),
    state: o.dormant === false ? 'aggro' : 'dormant', t: 0, dead: false, status: {}, stunT: 0, flash: 0, elite: !!o.elite, rare: !!o.rare, aff: o.aff || [], name: o.name || d.name, pack: o.pack || 0,
    big: !!d.big, static: !!d.static, team: o.team || 'monster', owner: o.owner, atkCd: w.rng.range(0, 1), target: 0, nextSpawn: w.rng.range(1, 3), rise: o.rise || 0, boss: o.boss || null, scale: o.scale || d.scale || 1,
    hover: !!d.hover, home: [x, z], shield: 0, lastHit: -99, tele: null, born: w.t, ttl: o.ttl || 0, xpMult: o.xpMult || 1, noDrop: !!o.noDrop, undyingUsed: false, extra: {}, color: o.color || null,
  };
  if (o.elite || o.rare) { m.hp *= 4; m.maxHp = m.hp; m.hit *= 1.5; }
  if (o.hpMult2) { m.hp *= o.hpMult2; m.maxHp = m.hp; }
  if (!o.anywhere && !m.static && !walkable(w, m.x, m.z, 0.25)) snapToFloor(w, m);
  w.monsters.push(m);
  ev(w, { t: 'spawn', id: m.id, type, x, z, elite: m.elite, rare: m.rare, scale: m.scale, team: m.team });
  return m;
}

// ---------- kills, xp, drops ----------
export function killMonster(w, m, src, overkill = 0, o = {}) {
  if (m.dead) return;
  if (m.prop) {
    m.dead = true; m.hp = 0;
    ev(w, { t: 'propBreak', id: m.id, x: m.x, z: m.z, variant: m.variant, dirx: src ? m.x - src.x : 0, dirz: src ? m.z - src.z : 1 });
    for (const h of livingHeroes(w)) {
      if (w.rng.chance(0.4)) dropGold(w, m.x, m.z, (1 + m.level) * 1.5 * w.tuning.goldRate, h.seat);
      if (w.rng.chance(0.05)) w.drops.push({ id: nid(w), kind: 'tallow', x: m.x, z: m.z, owner: h.seat, t: 0 });
    }
    if (m.onBreak) m.onBreak(w, m);
    return;
  }
  if (m.aff.includes('undying') && !m.undyingUsed) { m.undyingUsed = true; m.hp = m.maxHp * 0.5; ev(w, { t: 'banner', text: m.name + ' RISES AGAIN', small: true }); ev(w, { t: 'fx', name: 'ring_purple', x: m.x, z: m.z, r: 3 }); return; }
  if (m.boss && w.bossHooks && w.bossHooks.onBossDying && w.bossHooks.onBossDying(w, m)) return;
  m.dead = true; m.hp = 0;
  const d = MONSTERS[m.type] || {};
  w.kills++; if (m.q && w.zoneQuota) w.zoneQuota.killed++;
  w.killsByType[m.type] = (w.killsByType[m.type] || 0) + 1;
  if (m.team === 'hero') { ev(w, { t: 'kill', id: m.id, x: m.x, z: m.z, type: m.type, dirx: 0, dirz: 0, over: 0, minion: true }); return; }
  (w.recentDead = w.recentDead || []).push({ x: m.x, z: m.z }); if (w.recentDead.length > 12) w.recentDead.shift();
  const killer = src && src.stats ? src : w.heroes.find((h) => h.id === m.lastAttacker) || livingHeroes(w)[0];
  const dx = killer ? m.x - killer.x : 0, dz = killer ? m.z - killer.z : 1, dd = Math.hypot(dx, dz) || 1;
  ev(w, { t: 'kill', id: m.id, x: m.x, z: m.z, type: m.type, big: m.big, over: Math.min(1, overkill / Math.max(1, m.maxHp)), dirx: dx / dd, dirz: dz / dd, elite: m.elite || m.rare, el: o.el, static: m.static });
  // xp
  const df = diff(w);
  const xpType = (d.xp ?? 1) * (m.elite || m.rare ? 8 : 1) * m.xpMult * (d.static ? 0.5 : 1);
  const xp = monsterXp(m.level) * xpType * df.xp * w.tuning.xpRate;
  const party = livingHeroes(w);
  for (const h of party) if (Math.hypot(h.x - m.x, h.z - m.z) < 40) giveXp(w, h, xp);
  if (killer) { killer.kills++; if (m.elite || m.rare) killer.eliteKills++; onKillPower(w, killer, m); if (killer.cast && killer.cast.spec.flags.includes('refund_kill')) for (let i = 0; i < 6; i++) killer.cd[i] *= 0.5; }
  // requiem chain
  const rq = w.requiem; if (w.t - rq.t > 1) { rq.count = 0; rq.xp = 0; } rq.count++; rq.t = w.t; rq.xp += xp;
  if ([10, 25, 50, 100, 200, 400].includes(rq.count)) { const bonus = Math.round(rq.xp * 0.02 * rq.count); for (const h of party) giveXp(w, h, bonus, true); ev(w, { t: 'requiem', n: rq.count }); rq.xp = 0; }
  // sexton graves
  const sexton = party.find((h) => h.cls === 'sexton');
  if (sexton && !m.static) { w.areas.push({ id: nid(w), kind: 'grave', x: m.x, z: m.z, r: 0.8, t: sexton.stats.vowPlot ? 20 : 12, owner: sexton.seat }); for (const h of party) if (h.cls === 'sexton') addRes(h, 3 + (h.stats.vowMourner ? 2 : 0)); }
  for (const h of party) if (h.stats.vowSilence && h === killer) h.buffs.push({ t: w.t + 3, speed: 0.15 });
  if (m.aff.includes('smouldering')) w.areas.push({ id: nid(w), kind: 'timed_blast', x: m.x, z: m.z, r: 3.5, t: 1, dmg: 1.0, hostile: true, fire: true });
  if (d.onDeath && !m.noDrop) { for (let i = 0; i < 2; i++) spawnMonster(w, d.onDeath, m.x + (i ? 0.8 : -0.8), m.z, { dormant: false, level: m.level, pack: m.pack }); }
  if (m.extra && m.extra.onDeath) m.extra.onDeath(w, m);
  if (!m.noDrop) rollLoot(w, m, killer, d);
  if (m.type === 'bloat_deacon') w.areas.push({ id: nid(w), kind: 'poison_pool', x: m.x, z: m.z, r: 2.5, t: 6, hostile: true, dps: 0.5 });
  if (w.hooks && w.hooks.onKill) w.hooks.onKill(w, m, killer);
  if (m.boss && w.bossHooks && w.bossHooks.onBossDead) w.bossHooks.onBossDead(w, m);
}
export function addRes(h, n) { h.res = Math.min(h.resMax, h.res + n); }

export function giveXp(w, h, xp, quiet) {
  if (h.level >= LEVEL_CAP) {
    if (w.devotionXp) w.devotionXp(w, xp);
    return;
  }
  h.xp += xp;
  while (h.level < LEVEL_CAP && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level); h.level++;
    refreshStats(w, h, true);
    h.hp = h.maxHp;
    ev(w, { t: 'levelup', id: h.id, level: h.level, x: h.x, z: h.z, seat: h.seat });
    if (w.hooks && w.hooks.onLevel) w.hooks.onLevel(w, h);
  }
  if (h.level >= LEVEL_CAP) h.xp = 0;
}

export function dropGold(w, x, z, amount, owner) {
  const parts = Math.min(5, Math.max(1, Math.round(amount / 12)));
  for (let i = 0; i < parts; i++) {
    const a = w.rng.range(0, 6.28), d = w.rng.range(0.3, 1.6);
    const dr = { id: nid(w), kind: 'gold', x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, v: Math.max(1, Math.round(amount / parts)), owner, t: 0 }; snapToFloor(w, dr); w.drops.push(dr);
  }
}
export function rollLoot(w, m, killer, d) {
  const party = livingHeroes(w);
  const df = diff(w);
  const elite = m.elite || m.rare;
  for (const h of party) {
    const gf = 1 + h.stats.goldFind / 100;
    const base = (2 + m.level * 1.6) * (elite ? 6 : m.big ? 2.5 : 1) * df.xp * w.tuning.goldRate * gf * (d.kind === 'plate' ? 40 : 1);
    if (w.rng.chance(d.kind === 'plate' ? 1 : elite ? 1 : 0.45)) dropGold(w, m.x, m.z, base, h.seat);
    if (elite || w.rng.chance(w.tuning.tallowChance)) w.drops.push({ id: nid(w), kind: 'tallow', x: m.x + w.rng.range(-0.6, 0.6), z: m.z + w.rng.range(-0.6, 0.6), owner: h.seat, t: 0 });
    // items
    let n = 0;
    const lootR = w.lootRng;
    if (elite && m.rare) n = lootR.int(1, 3); else if (elite) n = lootR.int(1, 2); else if (lootR.chance(0.12 + h.stats.magicFind / 1000)) n = 1;
    for (let i = 0; i < n; i++) {
      const it = rollDrop(lootR, { ilvl: Math.min(30, Math.max(1, m.level)), cls: h.cls, elite, magicFind: h.stats.magicFind, legMult: df.leg, tuningLeg: w.tuning.legendaryChance, minRarity: elite && i === 0 ? 'blessed' : null });
      dropItem(w, it, m.x + lootR.range(-1, 1), m.z + lootR.range(-1, 1), h.seat);
    }
    if (!elite && lootR.chance(0.01)) w.drops.push({ id: nid(w), kind: 'gem', x: m.x, z: m.z, gem: { kind: lootR.pick(['ember', 'salt', 'amber']), tier: 0 }, owner: h.seat, t: 0 });
  }
}
export function dropItem(w, it, x, z, owner) {
  const d = { id: nid(w), kind: 'item', x, z, item: it, owner, t: 0 }; snapToFloor(w, d); x = d.x; z = d.z;
  w.drops.push(d);
  ev(w, { t: 'drop', x, z, rarity: it.rarity, name: it.name, owner });
}
