// Monsters and allies: spawning, per-archetype state machines, damage, death.
import { AFFLICTION_IDS, AFFLICTIONS, ELITE_PREFIX, ELITE_RULES, ELITE_SUFFIX, MONSTERS } from '../data/monsters.js';
import { monsterHitAt, monsterHpAt, monsterXpAt, RULES } from '../data/tuning.js';
import { clamp, DT, dist, dist2, ev, nextId, slide, unstick, walkable } from './core.js';
import { computeHit, gainRes, runOps, schedule, spawnArea, spawnShot } from './effects.js';
import { gainXp, hurtHero } from './hero.js';
import { rollMonsterDrops, spillGold } from './loot.js';
import { addGrave, POWERS } from './powers.js';
import { bossDamaged, bossDied, stepBoss } from './bosses.js';
import { onMonsterKilled } from './quests.js';
import { spawnEnemyArea, telegraphLine, telegraphRing, spawnWave } from './hazards.js';

export const facingOf = (dx, dz) => Math.atan2(dx, dz);

export function monsterLevel(w) {
  let L = 1;
  for (const h of w.heroes) if (!h.companion && h.level > L) L = h.level;
  const floor = w.zone?.def?.levelFloor ?? 1;
  return Math.max(L, floor, w.levelOverride ?? 0);
}
export const partyCount = (w) => Math.max(1, w.heroes.filter((h) => !h.gone && !h.companion).length);

export function spawnMonster(w, type, x, z, o = {}) {
  const def = MONSTERS[type];
  const L = o.level ?? monsterLevel(w);
  const diff = w.diffDef;
  const party = 1 + 0.6 * (partyCount(w) - 1);
  const run = w.run;
  let hp = monsterHpAt(L) * def.hp * party * diff.hp * w.tuning.monsterHp * (run?.hpMul ?? 1) * (w.attractHp ?? 1);
  let dmg = monsterHitAt(L) * def.hit * diff.dmg * w.tuning.monsterDamage * (run?.dmgMul ?? 1);
  let xp = monsterXpAt(L) * def.xp;
  if (o.elite) {
    hp *= ELITE_RULES.hp; dmg *= ELITE_RULES.dmg; xp *= ELITE_RULES.xp;
    if (o.elite === 'minion') { hp /= ELITE_RULES.hp / 1.5; xp /= ELITE_RULES.xp / 1.5; dmg /= ELITE_RULES.dmg / 1.15; }
  }
  const m = {
    id: nextId(w), type, def, x, z, r: def.r * (o.scale ?? 1), facing: o.facing ?? w.rng.range(-3.14, 3.14), hp, maxHp: hp, dmg, xp, level: L,
    state: o.state ?? 'idle', t: o.t ?? w.rng.range(0, 0.4), status: {}, kx: 0, kz: 0, tgt: null, retarget: 0, elite: o.elite ?? null, name: o.name ?? def.name,
    aff: o.aff ?? [], pack: o.pack ?? 0, hidden: false, speedMul: w.run?.speedMul ?? 1, vuln: 0, slowFromArea: 0, cd: 0, combo: 0, stolen: 0, age: 0, scale: o.scale ?? 1,
    tint: o.tint ?? '', bossState: null, noXp: !!o.noXp, summoned: !!o.summoned, knellPts: o.knellPts ?? def.knell ?? 0, questTag: o.questTag ?? '', from: o.from ?? '',
  };
  if (m.aff.includes('penitent_haste')) m.speedMul *= 1.4;
  w.monsters.push(m);
  ev(w, { t: 'spawn', id: m.id, k: type, x, z, f: m.facing, e: m.elite ?? '', n: m.name, aff: m.aff, hp: m.hp, s: m.scale, tint: m.tint, from: m.from, boss: def.boss ? 1 : 0 });
  w.camp && (w.camp.seen = w.camp.seen ?? {});
  return m;
}

/** A pack for a spawn marker. kind 'S' trash, 'E' elite. */
export function spawnPack(w, marker) {
  const zd = w.zone.def;
  const table = w.run?.table ?? zd.monsters;
  const rng = w.rng;
  const density = w.tuning.monsterDensity * (w.run?.densityMul ?? 1) * (w.packDensity ?? 1);
  if (!table.length) return undefined;
  if (marker.kind === 'E') return spawnElitePack(w, marker, table);
  const main = rng.weighted(table, (t) => t[1])[0];
  const def = MONSTERS[main];
  let n = Math.round(rng.int(4, 9) * density);
  if (def.big) n = Math.max(1, Math.round(n / 3));
  if (def.static) n = 1;
  const packId = nextId(w);
  for (let i = 0; i < n; i++) {
    const p = openSpot(w, marker.x, marker.z, 3.2);
    const swap = i > 0 && !def.static && rng.chance(0.3);
    const t = swap ? rng.weighted(table, (x) => x[1])[0] : main;
    if (MONSTERS[t].static && i > 0) continue;
    spawnMonster(w, t, p.x, p.z, { pack: packId, from: MONSTERS[t].ai === 'lunge' ? 'drop' : '' });
  }
}

export function rollAfflictions(w, n) {
  const pool = [...AFFLICTION_IDS];
  w.rng.shuffle(pool);
  return pool.slice(0, n);
}

export function spawnElitePack(w, marker, table = null, forced = null) {
  const zd = w.zone.def;
  const rng = w.rng;
  const list = (table ?? zd.monsters).filter(([t]) => !MONSTERS[t].static && !MONSTERS[t].big && MONSTERS[t].ai !== 'bomber');
  const type = forced?.type ?? rng.weighted(list, (t) => t[1])[0];
  const kind = forced?.kind ?? (rng.chance(0.5) ? 'champion' : 'rare');
  const [a0, a1] = w.diffDef.afflictions;
  const aff = forced?.aff ?? rollAfflictions(w, rng.int(a0, a1));
  const packId = nextId(w);
  const name = `${rng.pick(ELITE_PREFIX)} ${MONSTERS[type].name}`;
  if (kind === 'champion') {
    const n = rng.int(...ELITE_RULES.championSize);
    for (let i = 0; i < n; i++) {
      const p = openSpot(w, marker.x, marker.z, 2.4);
      spawnMonster(w, type, p.x, p.z, { elite: 'champion', pack: packId, aff, name, tint: 'sky', knellPts: 8 });
    }
  } else {
    const p = openSpot(w, marker.x, marker.z, 1);
    spawnMonster(w, type, p.x, p.z, { elite: 'rare', pack: packId, aff, name: `${name} ${rng.pick(ELITE_SUFFIX)}`, tint: 'sand', scale: 1.15, knellPts: 12 });
    const n = rng.int(...ELITE_RULES.rareMinions);
    for (let i = 0; i < n; i++) {
      const q = openSpot(w, marker.x, marker.z, 3);
      spawnMonster(w, type, q.x, q.z, { elite: 'minion', pack: packId, name: MONSTERS[type].name, knellPts: 2 });
    }
  }
  ev(w, { t: 'elite_pack', kind, name, aff: aff.map((a) => AFFLICTIONS[a].name), x: marker.x, z: marker.z });
  return packId;
}

export function openSpot(w, x, z, spread) {
  for (let i = 0; i < 12; i++) {
    const px = x + w.rng.range(-spread, spread), pz = z + w.rng.range(-spread, spread);
    if (walkable(w, px, pz)) return { x: px, z: pz };
  }
  if (walkable(w, x, z)) return { x, z };
  // Nothing open around that spot: fall back to where a hero stands.
  const h = w.heroes.find((o) => !o.gone && !o.dead) ?? w.heroes[0];
  for (let r = 1; r < 12; r += 0.5) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = h.x + Math.cos(a) * r, pz = h.z + Math.sin(a) * r;
      if (walkable(w, px, pz)) return { x: px, z: pz };
    }
  }
  return { x: h.x, z: h.z };
}

export function knockMonster(m, dx, dz, dist_) {
  if (m.def.static || m.def.huge) return;
  const l = Math.hypot(dx, dz) || 1;
  const d = m.def.big ? dist_ * 0.5 : dist_;
  m.kx += (dx / l) * d * 6;
  m.kz += (dz / l) * d * 6;
}

// ---- Damage and death -----------------------------------------------------------------------
export function damageMonster(w, m, d, o = {}) {
  if (m.dead) return;
  if (m.invuln) { ev(w, { t: 'hit', id: m.id, a: 0, c: 0, el: o.el, x: m.x, z: m.z, imm: 1 }); return; }
  if (w.cheats.oneHit && o.src) d = m.hp + 1;
  d = Math.max(1, d);
  m.hp -= d;
  const src = o.src;
  if (src) { src.dmgDone = (src.dmgDone ?? 0) + d; m.lastSrc = src; }
  ev(w, { t: 'hit', id: m.id, a: Math.round(d), c: o.crit ? 1 : 0, el: o.el ?? '', s: src?.seat ?? -1, x: m.x, z: m.z, dot: o.dot ? 1 : 0, dx: o.dx ?? 0, dz: o.dz ?? 0, big: o.big ? 1 : 0 });
  wake(w, m);
  if (o.dx !== undefined && !o.dot && !m.def.static && !m.def.big && !m.def.huge) {
    const l = Math.hypot(o.dx, o.dz) || 1;
    m.kx += (o.dx / l) * 1.2; m.kz += (o.dz / l) * 1.2;
  }
  if (m.def.boss) bossDamaged(w, m, o);
  if (m.def.ai === 'blinker' && !m.dead) m.struck = true;
  if (m.hp <= 0) {
    if (m.aff.includes('undying') && !m.rose) {
      m.rose = true;
      m.hp = m.maxHp * 0.5;
      m.status = {};
      m.state = 'rising';
      m.t = 1.2;
      m.invuln = true;
      ev(w, { t: 'fx', k: 'raise', s: 'raise', x: m.x, z: m.z });
      ev(w, { t: 'mcast', id: m.id, clip: 'GetUp', sp: 1 });
      return;
    }
    killMonster(w, m, src, o);
  }
}

export function wake(w, m) {
  if (m.state === 'idle' || m.state === 'statue') {
    if (m.state === 'statue') ev(w, { t: 'sfx', k: 'stone_crack', x: m.x, z: m.z });
    m.state = 'chase';
    m.t = 0;
    if (m.pack) for (const o of w.monsters) if (o.pack === m.pack && o.state === 'idle') { o.state = 'chase'; o.t = 0; }
  }
}

export function killMonster(w, m, src, o = {}) {
  if (m.dead) return;
  m.dead = true;
  m.hp = 0;
  const force = clamp(1 + (o.big ? 1.2 : 0) + (o.crit ? 0.5 : 0), 1, 3);
  ev(w, { t: 'death', id: m.id, k: m.type, x: m.x, z: m.z, dx: o.dx ?? 0, dz: o.dz ?? 0, force, el: o.el ?? '', s: src?.seat ?? -1, silent: o.silent ? 1 : 0 });
  if (w.camp?.bestiary) {
    if (!w.camp.bestiary[m.type]) { w.camp.bestiary[m.type] = 1; ev(w, { t: 'bestiary', k: m.type }); }
  }
  const rewarded = !m.noXp;
  if (rewarded) {
    const difficulty = w.diffDef.reward;
    const amt = m.xp * difficulty * w.tuning.xpRate;
    for (const h of w.heroes) {
      if (h.gone) continue;
      if (!h.companion) gainXp(w, h, amt, src === h);
    }
    if (src && !src.companion) {
      src.kills = (src.kills ?? 0) + 1;
      if (m.elite === 'champion' || m.elite === 'rare' || m.def.boss) src.eliteKills = (src.eliteKills ?? 0) + 1;
      chainRequiem(w, src, amt);
      if (src.vows.includes('silence')) { const cur = src.buffs.find((b) => b.id === 'silence'); if (cur) cur.t = 3; else src.buffs.push({ id: 'silence', t: 3, speedMul: 1.15 }); }
      for (const p of Object.keys(src.stats.powers)) POWERS[p]?.onKill?.(w, src, m);
      const c = o.c;
      if (c) {
        c.kills = (c.kills ?? 0) + 1;
        const sk = c.sk;
        if (sk?.killRefund && src.cds[sk.id] > 0) src.cds[sk.id] *= 1 - sk.killRefund;
      }
    }
    for (const h of w.heroes) if (!h.gone && !h.companion && !h.dead) rollMonsterDrops(w, h, m);
  }
  // Graves, for those who deal in them.
  if (!m.def.static && !m.summoned && !m.def.boss && !m.def.hover) {
    addGrave(w, m.x, m.z, w.graveLife);
    if (w.graves.length > 40) { const old = w.graves.shift(); ev(w, { t: 'gravex', id: old.id }); }
  }
  for (const h of w.heroes) {
    if (h.dead || h.cls !== 'sexton') continue;
    const near = dist2(h.x, h.z, m.x, m.z) < RULES.corpseTitheRange ** 2;
    if (!near) continue;
    let gain = RULES.corpseTithe + (h.vows.includes('due') ? 2 : 0);
    for (const a of w.areas) if (a.deathTithe && a.owner === h.id && dist(a.x, a.z, m.x, m.z) <= a.r) gain += a.deathTithe;
    gainRes(h, gain * w.tuning.resourceRegen);
  }
  // Mechanics that fire on a death.
  const forked = o.c?.forkOp;
  if (forked) forked(m);
  const od = m.def.onDeath;
  if (od?.spawn) for (let i = 0; i < od.n; i++) { const p = openSpot(w, m.x, m.z, 1.5); spawnMonster(w, od.spawn, p.x, p.z, { state: 'chase', pack: m.pack, knellPts: 1 }); }
  if (od?.patch) spawnEnemyArea(w, m.x, m.z, { kind: od.patch === 'fire' ? 'fire_patch' : 'poison_pool', r: 1.5, life: 3, tick: 0.5, dps: m.dmg * 0.5 });
  if (m.aff.includes('smouldering')) telegraphRing(w, m.x, m.z, 3, 1, m.dmg * 2, { el: 'flame', vfx: 'fire_burst', sfx: 'blast' });
  if (w.run?.mods?.includes('volatile') && !m.def.boss) telegraphRing(w, m.x, m.z, 2, 0.8, m.dmg, { el: 'flame', vfx: 'fire_burst', sfx: 'blast' });
  if (m.stolen) { for (const h of w.heroes) if (h.id === m.stolenFrom) { h.gold += m.stolen; ev(w, { t: 'toast', text: `RECOVERED ${m.stolen} GOLD`, color: 'sand', seat: h.seat }); } }
  if (m.def.boss) bossDied(w, m);
  onMonsterKilled(w, m, src);
}

function chainRequiem(w, h, xpAmt) {
  if (w.time - (h.reqLast ?? -9) <= RULES.requiemWindow) { h.reqN = (h.reqN ?? 0) + 1; h.reqXp = (h.reqXp ?? 0) + xpAmt; }
  else { h.reqN = 1; h.reqXp = xpAmt; h.reqPaid = false; }
  h.reqLast = w.time;
  if (h.reqN >= RULES.requiemMin) { ev(w, { t: 'requiem', s: h.seat, n: h.reqN }); h.reqBest = Math.max(h.reqBest ?? 0, h.reqN); }
}

export function finishRequiem(w, h) {
  if (!h.reqN || w.time - h.reqLast <= RULES.requiemWindow) return;
  if (h.reqN >= RULES.requiemMin) {
    const bonus = Math.round(h.reqN * RULES.requiemXp * h.reqXp);
    if (bonus > 0) { gainXp(w, h, bonus, false); ev(w, { t: 'toast', text: `${h.reqN} KILL REQUIEM  +${bonus} XP`, color: 'sand', seat: h.seat }); }
  }
  h.reqN = 0; h.reqXp = 0;
}

// ---- Targeting ------------------------------------------------------------------------------
function pickTarget(w, m) {
  m.retarget -= DT;
  if (m.tgt && m.retarget > 0 && !m.tgt.dead && !m.tgt.gone && !m.tgt.removed) return m.tgt;
  m.retarget = 0.4;
  let best = null, bd = Infinity;
  if (!w.cheats.invisible) {
    for (const h of w.heroes) {
      if (h.dead || h.gone || h.buffs.some((b) => b.unseen)) continue;
      const d = dist2(m.x, m.z, h.x, h.z);
      if (d < bd) { bd = d; best = h; }
    }
  }
  for (const a of w.allies) {
    if (a.def.static && !a.taunt) continue;
    const d = dist2(m.x, m.z, a.x, a.z) * (a.taunt ? 0.2 : 1);
    if (d < bd && d < 14 * 14) { bd = d; best = a; }
  }
  m.tgt = best;
  return best;
}

function seenBy(w, m, t) { return w.zone.nav.lineOfSight(m.x, m.z, t.x, t.z); }

const flowOut = [0, 0];
function moveToward(w, m, t, mul = 1) {
  const speed = monsterSpeed(m) * mul * DT;
  if (speed <= 0) return;
  let dx = t.x - m.x, dz = t.z - m.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  if (l > 1.5 && !seenBy(w, m, t) && t.seat !== undefined && t.seat >= 0) {
    const nav = w.zone.navs[t.navIndex ?? 0];
    if (nav && nav.flowDirection(m.x, m.z, flowOut)) { dx = flowOut[0]; dz = flowOut[1]; }
  }
  m.facing = facingOf(dx, dz);
  slide(w, m, dx * speed, dz * speed);
  m.moving = true;
}

function moveAway(w, m, t, mul = 1) {
  const speed = monsterSpeed(m) * mul * DT;
  let dx = m.x - t.x, dz = m.z - t.z;
  const l = Math.hypot(dx, dz) || 1;
  slide(w, m, (dx / l) * speed, (dz / l) * speed);
  m.facing = facingOf(t.x - m.x, t.z - m.z);
  m.moving = true;
}

export function monsterSpeed(m) {
  let s = m.def.speed * m.speedMul;
  if (m.slowFromArea) s *= 1 - m.slowFromArea;
  if (m.status.chill) s *= 0.7;
  return s;
}

const faceTo = (m, t) => { m.facing = facingOf(t.x - m.x, t.z - m.z); };
const distTo = (m, t) => dist(m.x, m.z, t.x, t.z) - (t.r ?? 0.4);

function monsterStrike(w, m, t, dmg = m.dmg) {
  if (!t || t.dead) return false;
  if (m.status.blind > 0) { ev(w, { t: 'miss', id: m.id, x: m.x, z: m.z }); return false; }
  if (t.seat !== undefined && t.kind === 'hero') hurtHero(w, t, dmg, { src: m });
  else hurtAlly(w, t, dmg);
  return true;
}

export function hurtAlly(w, a, d) {
  if (a.def.static || a.dead) return;
  a.hp -= d;
  if (a.hp <= 0) removeAlly(w, a, 'death');
}

// ---- AIs ------------------------------------------------------------------------------------
function idleCheck(w, m) {
  const range = RULES.aggroRange;
  for (const h of w.heroes) {
    if (h.dead || h.gone) continue;
    if (dist2(m.x, m.z, h.x, h.z) < range * range && seenBy(w, m, h)) { wake(w, m); return true; }
  }
  for (const a of w.allies) if (!a.def.static && dist2(m.x, m.z, a.x, a.z) < 64) { wake(w, m); return true; }
  return false;
}

const AI = {
  melee(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        if (distTo(m, t) <= (m.def.reach ?? 1.2)) {
          m.state = 'wind'; m.t = m.def.wind; faceTo(m, t);
          ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack ?? 'Slash1', sp: 0.5 / (m.def.wind || 0.5) });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'wind': {
        m.t -= DT;
        if (m.t <= 0) {
          if (distTo(m, t) <= (m.def.reach ?? 1.2) + 0.45) monsterStrike(w, m, t);
          m.state = 'rec'; m.t = m.def.rec;
        }
        break;
      }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },

  lunge(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        const d = distTo(m, t);
        if (d <= m.def.reach && seenBy(w, m, t)) { m.state = 'wind'; m.t = m.def.wind; faceTo(m, t); ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack, sp: 1 }); ev(w, { t: 'sfx', k: 'mon_attack', x: m.x, z: m.z, v: m.def.voice }); }
        else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'wind': { m.t -= DT; faceTo(m, t); if (m.t <= 0) { m.state = 'lunge'; m.t = 0.28; const l = Math.hypot(t.x - m.x, t.z - m.z) || 1; m.lx = (t.x - m.x) / l; m.lz = (t.z - m.z) / l; m.landed = false; } break; }
      case 'lunge': {
        m.t -= DT;
        slide(w, m, m.lx * 13 * DT, m.lz * 13 * DT);
        if (!m.landed && dist(m.x, m.z, t.x, t.z) < 0.9 + m.r) { m.landed = true; monsterStrike(w, m, t); }
        if (m.t <= 0) { m.state = 'rec'; m.t = m.def.rec; }
        break;
      }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },
  leaper(w, m) { AI.lunge(w, m); },

  ranged(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    const [near, far] = m.def.keep;
    const d = dist(m.x, m.z, t.x, t.z);
    const see = seenBy(w, m, t);
    if (d < near) moveAway(w, m, t);
    else if (d > far || !see) moveToward(w, m, t);
    else { faceTo(m, t); m.moving = false; }
    m.cd -= DT;
    if (m.cd <= 0 && see && d < far + 3) {
      m.cd = m.def.every + w.rng.range(0, 0.6);
      faceTo(m, t);
      ev(w, { t: 'mcast', id: m.id, clip: 'cast', sp: 1 });
      const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
      spawnShot(w, { owner: m.id, team: 1, kind: m.def.shot, x: m.x, z: m.z, dx: (t.x - m.x) / l, dz: (t.z - m.z) / l, speed: 6.5, range: 16, dmg: m.dmg, el: 'sound', r: 0.4 });
      ev(w, { t: 'sfx', k: 'sour_note', x: m.x, z: m.z });
    }
  },

  slam(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        if (distTo(m, t) <= m.def.reach) {
          m.state = 'wind'; m.t = m.def.tele; faceTo(m, t);
          const fx = Math.sin(m.facing), fz = Math.cos(m.facing);
          ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack, sp: 0.75 });
          telegraphRing(w, m.x + fx * 1.2, m.z + fz * 1.2, m.def.slamR, m.def.tele, m.dmg, { src: m, vfx: 'dust_ring', sfx: 'coffin_slam', shake: 0.25 });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'wind': { m.t -= DT; if (m.t <= 0) { m.state = 'rec'; m.t = m.def.rec; } break; }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },

  bomber(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        if (distTo(m, t) <= m.def.reach) {
          m.state = 'wind'; m.t = m.def.tele;
          ev(w, { t: 'mcast', id: m.id, clip: 'swell', sp: 1 });
          ev(w, { t: 'sfx', k: 'swell', x: m.x, z: m.z });
          telegraphRing(w, m.x, m.z, m.def.slamR, m.def.tele, m.dmg, { el: 'grave', vfx: 'poison_burst', sfx: 'burst_wet', shake: 0.2, follow: m });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'wind': {
        m.t -= DT;
        if (m.t <= 0) {
          spawnEnemyArea(w, m.x, m.z, { kind: 'poison_pool', r: 2.6, life: 5, tick: 0.5, dps: m.dmg * 0.25 });
          killMonster(w, m, null, { big: true, silent: true });
        }
        break;
      }
      default: m.state = 'chase';
    }
  },

  hook(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        m.cd -= DT;
        const d = distTo(m, t);
        if (m.cd <= 0 && d > 3 && d < m.def.hookRange && t.kind === 'hero' && seenBy(w, m, t)) {
          m.cd = 6;
          m.state = 'hook'; m.t = m.def.tele;
          faceTo(m, t);
          const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
          const dx = (t.x - m.x) / l, dz = (t.z - m.z) / l;
          ev(w, { t: 'mcast', id: m.id, clip: 'CastWeapon', sp: 1 });
          telegraphLine(w, m.x, m.z, dx, dz, m.def.hookRange, 1.1, m.def.tele, m.dmg * 0.5, {
            src: m, vfx: 'hook', sfx: 'chain',
            onHit: (h) => {
              const stolen = Math.min(h.gold, Math.round(10 + h.level * 5));
              if (stolen > 0 && !m.dead) { h.gold -= stolen; m.stolen += stolen; m.stolenFrom = h.id; ev(w, { t: 'toast', text: `HE TOOK ${stolen} GOLD. KILL HIM.`, color: 'red', seat: h.seat }); }
              const px = m.x + dx * 1.4, pz = m.z + dz * 1.4;
              if (!m.dead && walkable(w, px, pz)) { h.x = px; h.z = pz; h.pulled = 0.2; ev(w, { t: 'blink', id: h.id, x: h.x, z: h.z, x2: px, z2: pz, s: 'chain' }); }
            },
          });
        } else if (d <= m.def.reach) {
          m.state = 'wind'; m.t = m.def.wind; faceTo(m, t);
          ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack, sp: 1 });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'hook': { m.t -= DT; if (m.t <= 0) { m.state = 'rec'; m.t = 0.7; } break; }
      case 'wind': { m.t -= DT; if (m.t <= 0) { if (distTo(m, t) <= m.def.reach + 0.45) monsterStrike(w, m, t); m.state = 'rec'; m.t = m.def.rec; } break; }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },

  blinker(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    m.cd -= DT;
    if ((m.struck && m.cd <= 0) || (m.state === 'chase' && m.cd <= 0 && distTo(m, t) > 6)) {
      m.struck = false;
      m.cd = 3.5;
      const away = m.state !== 'chase';
      const a = w.rng.range(0, Math.PI * 2);
      const r = away ? 5 : 1.6;
      const px = t.x + Math.cos(a) * r, pz = t.z + Math.sin(a) * r;
      if (walkable(w, px, pz)) {
        ev(w, { t: 'blink', id: m.id, x: m.x, z: m.z, x2: px, z2: pz, s: 'blink', mon: 1 });
        m.x = px; m.z = pz; m.state = 'chase'; m.combo = 0;
      }
    }
    m.struck = false;
    switch (m.state) {
      case 'chase': {
        if (distTo(m, t) <= m.def.reach) {
          m.state = 'wind'; m.t = m.def.wind; faceTo(m, t);
          ev(w, { t: 'mcast', id: m.id, clip: ['Slash1', 'Slash2', 'Slash3'][m.combo % 3], sp: 1.2 });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'wind': {
        m.t -= DT;
        if (m.t <= 0) {
          if (distTo(m, t) <= m.def.reach + 0.45) monsterStrike(w, m, t);
          m.combo++;
          if (m.combo >= m.def.combo) { m.combo = 0; m.state = 'rec'; m.t = 1; }
          else { m.state = 'chase'; }
        }
        break;
      }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },

  charger(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'chase': {
        m.cd -= DT;
        const d = distTo(m, t);
        if (m.cd <= 0 && d > 3.5 && d < 12 && seenBy(w, m, t)) {
          m.cd = 6;
          m.state = 'roar'; m.t = m.def.tele;
          faceTo(m, t);
          const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
          m.lx = (t.x - m.x) / l; m.lz = (t.z - m.z) / l;
          m.chargeLeft = m.def.chargeDist;
          ev(w, { t: 'mcast', id: m.id, clip: 'roar', sp: 1 });
          ev(w, { t: 'sfx', k: 'roar', x: m.x, z: m.z });
          telegraphLine(w, m.x, m.z, m.lx, m.lz, m.def.chargeDist, 2, m.def.tele, 0, { silent: true });
        } else if (d <= m.def.reach) {
          m.state = 'wind'; m.t = m.def.wind; faceTo(m, t);
          ev(w, { t: 'mcast', id: m.id, clip: 'bite', sp: 1 });
        } else if (!m.status.root) moveToward(w, m, t);
        break;
      }
      case 'roar': { m.t -= DT; if (m.t <= 0) { m.state = 'charge'; m.hitSet = new Set(); ev(w, { t: 'mcast', id: m.id, clip: 'charge', sp: 1 }); } break; }
      case 'charge': {
        const step = m.def.chargeSpeed * DT * (m.chargeMul ?? 1.5);
        const moved = slideStrict(w, m, m.lx * step, m.lz * step);
        m.chargeLeft -= step;
        for (const h of w.heroes) {
          if (h.dead || h.gone || m.hitSet.has(h.id)) continue;
          if (dist(h.x, h.z, m.x, m.z) < m.r + 0.6) { m.hitSet.add(h.id); hurtHero(w, h, m.dmg * 1.4, { src: m, knockFrom: m, knock: 3 }); }
        }
        if (!moved) {
          m.state = 'stunned'; m.t = 1.8;
          ev(w, { t: 'fx', k: 'dust_ring', s: 'stone_hit', sh: 0.3, x: m.x, z: m.z, r: 2 });
          m.status.stun = 1.8;
        } else if (m.chargeLeft <= 0) { m.state = 'rec'; m.t = m.def.rec; }
        break;
      }
      case 'stunned': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      case 'wind': { m.t -= DT; if (m.t <= 0) { if (distTo(m, t) <= m.def.reach + 0.45) monsterStrike(w, m, t); m.state = 'rec'; m.t = m.def.rec; } break; }
      case 'rec': { m.t -= DT; if (m.t <= 0) m.state = 'chase'; break; }
      default: m.state = 'chase';
    }
  },

  swooper(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    switch (m.state) {
      case 'statue': {
        if (dist(m.x, m.z, t.x, t.z) < m.def.wakeRange) { wake(w, m); }
        break;
      }
      case 'chase': {
        m.t -= DT;
        if (m.t <= 0) {
          const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
          m.lx = (t.x - m.x) / l; m.lz = (t.z - m.z) / l;
          m.chargeLeft = l + 4;
          m.state = 'swoop'; m.landed = false;
          ev(w, { t: 'sfx', k: 'wing', x: m.x, z: m.z });
        } else {
          const a = m.age * 2 + m.id;
          const tx = t.x + Math.cos(a) * 6, tz = t.z + Math.sin(a) * 6;
          moveToward(w, m, { x: tx, z: tz }, 0.8);
        }
        break;
      }
      case 'swoop': {
        const step = m.def.speed * 2 * DT;
        slide(w, m, m.lx * step, m.lz * step);
        m.facing = facingOf(m.lx, m.lz);
        m.chargeLeft -= step;
        if (!m.landed && dist(m.x, m.z, t.x, t.z) < m.r + 0.7) { m.landed = true; monsterStrike(w, m, t); }
        if (m.chargeLeft <= 0) { m.state = 'chase'; m.t = w.rng.range(1.2, 2.2); }
        break;
      }
      default: m.state = 'chase';
    }
  },

  necro(w, m) {
    const t = pickTarget(w, m);
    if (!t) return;
    const [near, far] = m.def.keep;
    const d = dist(m.x, m.z, t.x, t.z);
    if (d < near) moveAway(w, m, t);
    else if (d > far) moveToward(w, m, t);
    else { faceTo(m, t); }
    m.cd -= DT;
    if (m.cd <= 0) {
      m.cd = m.def.every;
      ev(w, { t: 'mcast', id: m.id, clip: m.def.clipAttack, sp: 1 });
      ev(w, { t: 'sfx', k: 'raise', x: m.x, z: m.z });
      let raised = 0;
      for (let i = w.graves.length - 1; i >= 0 && raised < 3; i--) {
        const g = w.graves[i];
        if (dist(g.x, g.z, m.x, m.z) > 9) continue;
        w.graves.splice(i, 1);
        ev(w, { t: 'gravex', id: g.id });
        spawnMonster(w, 'rattlebones', g.x, g.z, { state: 'chase', noXp: true, summoned: true, pack: m.pack, from: 'ground', knellPts: 0 });
        raised++;
      }
      if (raised === 0 && w.monsters.length < 180) {
        const p = openSpot(w, m.x, m.z, 3);
        spawnMonster(w, 'rattlebones', p.x, p.z, { state: 'chase', noXp: true, summoned: true, pack: m.pack, from: 'ground', knellPts: 0 });
      }
    }
  },

  plate(w, m) {
    m.age += 0;
    m.escape = (m.escape ?? 12) - DT;
    const t = nearestHero(w, m);
    if (m.escape <= 0) {
      ev(w, { t: 'fx', k: 'puff', s: 'plate_escape', x: m.x, z: m.z });
      ev(w, { t: 'toast', text: 'THE COLLECTION PLATE GOT AWAY', color: 'mist' });
      removeMonster(w, m);
      return;
    }
    m.state = 'chase';
    m.spill = (m.spill ?? 0) - DT;
    if (m.spill <= 0) {
      m.spill = 0.4;
      ev(w, { t: 'fx', k: 'coin_trail', s: 'gold', x: m.x, z: m.z });
      for (const h of w.heroes) if (!h.gone && !h.companion) spillGold(w, h, m.x, m.z, m.level);
    }
    if (t && dist(m.x, m.z, t.x, t.z) < 14) {
      // Flee along the flow field, away from the nearest hero, along the longest open way.
      const a = Math.atan2(m.z - t.z, m.x - t.x) + Math.sin(m.age * 1.7) * 0.8;
      let fx = Math.cos(a), fz = Math.sin(a);
      if (!slide(w, m, fx * monsterSpeed(m) * DT, fz * monsterSpeed(m) * DT)) { m.wander = (m.wander ?? 0) + 1.7; slide(w, m, Math.cos(a + m.wander) * monsterSpeed(m) * DT, Math.sin(a + m.wander) * monsterSpeed(m) * DT); }
      m.facing = facingOf(fx, fz);
      m.moving = true;
    }
  },

  spawner(w, m) {
    m.cd -= DT;
    const t = nearestHero(w, m);
    if (!t || dist(m.x, m.z, t.x, t.z) > 16) return;
    if (m.cd <= 0) {
      m.cd = m.def.every;
      m.spawned = (m.spawned ?? []).filter((s) => !s.dead);
      if (m.spawned.length < m.def.cap) {
        const p = openSpot(w, m.x, m.z, 1.8);
        const s = spawnMonster(w, m.def.spawn, p.x, p.z, { state: 'chase', noXp: false, summoned: true, pack: m.pack, knellPts: 0 });
        s.xp *= 0.25;
        m.spawned.push(s);
        ev(w, { t: 'fx', k: 'puff', x: p.x, z: p.z });
      }
    }
  },

  boss(w, m) { stepBoss(w, m); },
};

function slideStrict(w, m, dx, dz) {
  const x = m.x, z = m.z;
  slide(w, m, dx, dz);
  return Math.hypot(m.x - x, m.z - z) > Math.hypot(dx, dz) * 0.5;
}

export function nearestHero(w, m) {
  let best = null, bd = Infinity;
  for (const h of w.heroes) {
    if (h.dead || h.gone) continue;
    const d = dist2(m.x, m.z, h.x, h.z);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

export function removeMonster(w, m) {
  m.dead = true;
  m.removed = true;
  ev(w, { t: 'remove', id: m.id });
}

// ---- Stepping -------------------------------------------------------------------------------
const CELL = 1.5;
const hashKey = (x, z) => ((Math.floor(x / CELL) + 512) << 10) | (Math.floor(z / CELL) + 512);

function buildHash(w) {
  const hash = w.hash;
  hash.clear();
  for (const m of w.monsters) {
    if (m.dead) continue;
    const k = hashKey(m.x, m.z);
    const list = hash.get(k);
    if (list) list.push(m);
    else hash.set(k, [m]);
  }
}

function separate(w, m) {
  if (m.def.static || m.state === 'charge' || m.state === 'lunge' || m.state === 'swoop') return;
  const cx = Math.floor(m.x / CELL), cz = Math.floor(m.z / CELL);
  let px = 0, pz = 0;
  for (let i = cx - 1; i <= cx + 1; i++) {
    for (let j = cz - 1; j <= cz + 1; j++) {
      const list = w.hash.get(((i + 512) << 10) | (j + 512));
      if (!list) continue;
      for (const o of list) {
        if (o === m || o.dead) continue;
        const dx = m.x - o.x, dz = m.z - o.z;
        const rr = m.r + o.r;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / d;
          px += dx * push; pz += dz * push;
        }
      }
    }
  }
  if (px || pz) {
    const s = m.def.big || m.def.huge ? 0.2 : 0.5;
    slide(w, m, clamp(px * s, -0.1, 0.1), clamp(pz * s, -0.1, 0.1));
  }
}

function tickStatus(w, m) {
  const st = m.status;
  for (const k of ['burn', 'bleed', 'poison']) {
    const s = st[k];
    if (!s) continue;
    s.t -= DT;
    s.acc = (s.acc ?? 0) + DT;
    if (s.acc >= 0.5) {
      s.acc -= 0.5;
      const src = w.heroes.find((h) => h.id === s.src) ?? null;
      damageMonster(w, m, s.dps * 0.5, { src, el: k === 'burn' ? 'flame' : 'grave', dot: true });
      if (m.dead) return;
    }
    if (s.t <= 0) delete st[k];
  }
  if (st.stun > 0) st.stun -= DT;
  if (st.root > 0) st.root -= DT;
  if (st.blind > 0) st.blind -= DT;
  if (st.markT > 0) { st.markT -= DT; if (st.markT <= 0) st.mark = 0; }
  if (st.resT > 0) { st.resT -= DT; if (st.resT <= 0) st.res = 0; }
}

function tickAfflictions(w, m) {
  if (!m.aff.length) return;
  const t = pickTarget(w, m);
  if (!t) return;
  const near = dist(m.x, m.z, t.x, t.z) < 16;
  m.affT = m.affT ?? {};
  const every = (k, s, f) => {
    m.affT[k] = (m.affT[k] ?? s * w.rng.range(0.4, 1)) - DT;
    if (m.affT[k] <= 0) { m.affT[k] = s; if (near) f(); }
  };
  for (const a of m.aff) {
    switch (a) {
      case 'tolling': every(a, 5, () => spawnWave(w, m.x, m.z, { speed: 5, maxR: 8, thick: 0.7, dmg: m.dmg, el: 'sound' })); break;
      case 'smouldering': every(a, 0.7, () => spawnEnemyArea(w, m.x, m.z, { kind: 'fire_patch', r: 1, life: 3, tick: 0.5, dps: m.dmg * 0.3 })); break;
      case 'shackled': every(a, 6, () => {
        const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
        telegraphLine(w, m.x, m.z, (t.x - m.x) / l, (t.z - m.z) / l, Math.min(l + 3, 12), 1, 0.8, m.dmg * 0.4, { vfx: 'chain_line', sfx: 'chain', root: 1.5 });
      }); break;
      case 'entombing': every(a, 7, () => telegraphRing(w, t.x, t.z, 2.2, 0.7, 0, { vfx: 'bone_rise', sfx: 'bone_hit', entomb: 3 })); break;
      case 'vigil_lamps': {
        m.lampA = (m.lampA ?? 0) + DT * 0.9;
        every('vigil_tick', 0.25, () => {
          for (const off of [0, Math.PI]) {
            const dx = Math.cos(m.lampA + off), dz = Math.sin(m.lampA + off);
            ev(w, { t: 'fx', k: 'beam', x: m.x, z: m.z, dx, dz, r: 7, el: 'flame' });
            for (const h of w.heroes) {
              if (h.dead || h.gone) continue;
              const px = h.x - m.x, pz = h.z - m.z;
              const along = px * dx + pz * dz;
              if (along < 0 || along > 7) continue;
              if (Math.abs(px * dz - pz * dx) < 0.7) hurtHero(w, h, m.dmg * 0.3, { dot: true, src: null });
            }
          }
        });
        break;
      }
      case 'penitent_haste': every(a, 6, () => {
        if (m.def.ai === 'charger' || m.def.static) return;
        const l = Math.hypot(t.x - m.x, t.z - m.z) || 1;
        if (l < 3 || l > 12) return;
        m.kx += ((t.x - m.x) / l) * 18; m.kz += ((t.z - m.z) / l) * 18;
        ev(w, { t: 'sfx', k: 'charge', x: m.x, z: m.z });
      }); break;
      case 'plagued': every(a, 5, () => telegraphRing(w, t.x, t.z, 2, 0.8, 0, { vfx: 'poison_burst', pool: { kind: 'poison_pool', r: 2, life: 5, tick: 0.5, dps: m.dmg * 0.3 } })); break;
      default: break;
    }
  }
}

export function stepMonsters(w) {
  buildHash(w);
  const hx = [];
  for (const h of w.heroes) if (!h.dead && !h.gone) hx.push(h);
  for (const m of w.monsters) {
    if (m.dead) continue;
    m.age += DT;
    m.moving = false;
    tickStatus(w, m);
    if (m.dead) continue;
    if (w.t % 30 === 0 && !m.def.static) unstick(w, m);
    if (m.state === 'rising') {
      m.t -= DT;
      if (m.t <= 0) { m.invuln = false; m.state = 'chase'; }
      continue;
    }
    if (m.kx || m.kz) {
      slide(w, m, m.kx * DT, m.kz * DT);
      m.kx *= 0.86; m.kz *= 0.86;
      if (Math.abs(m.kx) + Math.abs(m.kz) < 0.05) { m.kx = 0; m.kz = 0; }
    }
    if (m.status.stun > 0) continue;
    if (m.state === 'idle') {
      if (!idleCheck(w, m)) { continue; }
    }
    const ai = AI[m.def.ai];
    if (!ai) throw new Error(`no AI "${m.def.ai}"`);
    ai(w, m);
    if (m.dead) continue;
    tickAfflictions(w, m);
    separate(w, m);
    pushHeroes(w, m, hx);
    // Stay out of the walls even after a shove.
  }
  // Area effects reset each frame; stepAreas fills them.
  if (w.t % 60 === 0) w.monsters = w.monsters.filter((m) => !m.dead || !m.reaped);
  for (let i = w.monsters.length - 1; i >= 0; i--) if (w.monsters[i].dead) w.monsters.splice(i, 1);
}

function pushHeroes(w, m, heroes) {
  if (m.def.hover) return;
  for (const h of heroes) {
    if (h.passThrough && !m.def.big && !m.def.huge) continue;
    const dx = h.x - m.x, dz = h.z - m.z;
    const rr = h.r + m.r;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const push = ((rr - d) / d) * 0.5;
      if (!m.def.static) slide(w, m, clamp(-dx * push, -0.1, 0.1), clamp(-dz * push, -0.1, 0.1));
      if (h.state !== 'dodge' && h.state !== 'dash' && h.state !== 'leap') slide(w, h, clamp(dx * push, -0.08, 0.08), clamp(dz * push, -0.08, 0.08));
    }
  }
}

// ---- Allies ---------------------------------------------------------------------------------
export function addAlly(w, h, type, x, z, o = {}) {
  const def = MONSTERS[type];
  const a = {
    id: nextId(w), type, def, x, z, r: def.r, facing: h.facing ?? 0, owner: h.id, ownerRef: h, pct: o.pct ?? 0.6, hp: def.hp * h.stats.maxHp * 0.2, maxHp: def.hp * h.stats.maxHp * 0.2, life: o.life ?? 0, age: 0,
    quick: !!o.quick, explodes: o.explodes ?? 0, slam: o.slam ?? 0, coffin: !!o.coffin, turret: o.turret ?? null, taunt: !!o.taunt, state: 'follow', t: 0, ally: true, seat: undefined, moving: false, status: {}, nextShot: 0, tick: 0,
  };
  if (a.quick) a.speedQ = 1.5;
  w.allies.push(a);
  ev(w, { t: 'spawn', id: a.id, k: type, x, z, f: a.facing, e: '', n: def.name, aff: [], hp: a.hp, s: 1, ally: 1, from: def.static ? '' : 'ground', owner: h.seat, coffin: a.coffin ? 1 : 0 });
  return a;
}

export function removeAlly(w, a, how = 'expire') {
  if (a.removed) return;
  a.removed = true;
  a.dead = true;
  const owner = a.ownerRef;
  if (how === 'death') ev(w, { t: 'death', id: a.id, k: a.type, x: a.x, z: a.z, dx: 0, dz: 0, force: 1, el: '', s: -1, ally: 1 });
  else ev(w, { t: 'remove', id: a.id, puff: 1 });
  if (a.explodes && owner && !owner.dead) {
    runOps(w, owner, [{ op: 'ring', radius: 3, dmg: a.explodes, el: 'grave', vfx: 'grave_burst', sfx: 'blast', shake: 0.1 }], { x: a.x, z: a.z, dx: 0, dz: 1, sk: null });
  }
  const tb = a.turret?.endBlast;
  if (tb && owner) runOps(w, owner, [{ op: 'ring', radius: tb.radius, dmg: tb.dmg, el: tb.el, vfx: 'fire_burst', sfx: 'blast', shake: 0.3, wave: true }], { x: a.x, z: a.z, dx: 0, dz: 1, sk: null });
}

function allyHit(w, a, m, pct, el) {
  const h = a.ownerRef;
  if (!h) return;
  const up = h.buffs.find((b) => b.minionDmg)?.minionDmg ?? 0;
  const [d, crit] = computeHit(w, h, m, pct * (1 + up), el, null);
  damageMonster(w, m, d, { src: h, crit, el, dx: m.x - a.x, dz: m.z - a.z });
  if (h.vows.includes('care')) h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * 0.01);
}

export function stepAllies(w) {
  for (const a of w.allies) {
    if (a.removed) continue;
    a.age += DT;
    a.moving = false;
    if (a.life) {
      a.life -= DT;
      if (a.life <= 0) { removeAlly(w, a); continue; }
    }
    const owner = a.ownerRef;
    if (!owner || owner.gone) { removeAlly(w, a); continue; }
    if (a.def.ai === 'turret') { stepTurret(w, a, owner); continue; }
    const danse = owner.buffs.find((b) => b.minionSpeed)?.minionSpeed ?? 1;
    const speed = a.def.speed * (a.speedQ ?? 1) * danse * DT;
    let t = null, bd = 12 * 12;
    for (const m of w.monsters) {
      if (m.dead || m.hidden) continue;
      const d = dist2(a.x, a.z, m.x, m.z);
      if (d < bd) { bd = d; t = m; }
    }
    if (a.state === 'wind') {
      a.t -= DT * (a.speedQ ?? 1);
      if (a.t <= 0) {
        if (t) {
          if (a.slam || a.def.slam) {
            const r = a.slam || a.def.slam;
            ev(w, { t: 'fx', k: 'dust_ring', s: 'coffin_slam', sh: 0.08, x: a.x, z: a.z, r });
            for (const m of w.monsters) if (!m.dead && dist(m.x, m.z, a.x, a.z) < r + m.r) allyHit(w, a, m, a.pct, 'grave');
          } else if (dist(a.x, a.z, t.x, t.z) < a.def.reach + t.r + 0.4) {
            allyHit(w, a, t, a.pct, 'grave');
          }
        }
        a.state = 'rec'; a.t = a.def.rec;
      }
      continue;
    }
    if (a.state === 'rec') { a.t -= DT * (a.speedQ ?? 1); if (a.t <= 0) a.state = 'follow'; continue; }
    if (t) {
      const d = Math.sqrt(bd);
      a.facing = facingOf(t.x - a.x, t.z - a.z);
      if (d <= a.def.reach + t.r) {
        a.state = 'wind'; a.t = a.def.wind;
        ev(w, { t: 'mcast', id: a.id, clip: a.slam || a.def.slam ? 'CoffinSlam' : a.def.clipAttack, sp: 1 });
      } else {
        slide(w, a, ((t.x - a.x) / d) * speed, ((t.z - a.z) / d) * speed);
        a.moving = true;
      }
    } else {
      const d = dist(a.x, a.z, owner.x, owner.z);
      if (d > 20) { a.x = owner.x + w.rng.range(-1, 1); a.z = owner.z + w.rng.range(-1, 1); if (!walkable(w, a.x, a.z)) { a.x = owner.x; a.z = owner.z; } }
      else if (d > 3) {
        a.facing = facingOf(owner.x - a.x, owner.z - a.z);
        const nav = w.zone.navs[owner.navIndex ?? 0];
        let dx = (owner.x - a.x) / d, dz = (owner.z - a.z) / d;
        if (!w.zone.nav.lineOfSight(a.x, a.z, owner.x, owner.z) && nav?.flowDirection(a.x, a.z, flowOut)) { dx = flowOut[0]; dz = flowOut[1]; }
        slide(w, a, dx * speed, dz * speed);
        a.moving = true;
      }
    }
  }
  for (let i = w.allies.length - 1; i >= 0; i--) if (w.allies[i].removed) w.allies.splice(i, 1);
}

function stepTurret(w, a, owner) {
  const tu = a.turret;
  if (!tu) return;
  if (tu.rate && w.time >= a.nextShot) {
    let t = null, bd = (tu.range ?? 12) ** 2;
    for (const m of w.monsters) {
      if (m.dead || m.hidden) continue;
      const d = dist2(a.x, a.z, m.x, m.z);
      if (d < bd) { bd = d; t = m; }
    }
    if (t) {
      a.nextShot = w.time + 1 / tu.rate;
      const l = Math.sqrt(bd) || 1;
      const set4 = owner.stats.set4.last_lamplighter;
      const dx = (t.x - a.x) / l, dz = (t.z - a.z) / l;
      if (set4) {
        const tone = owner.skills.find((s) => s?.id === 'spark_bolt')?.tone;
        const op = w.resolveSkillOp?.(owner, 'spark_bolt', tone) ?? { dmg: 1.2, el: 'flame' };
        spawnShot(w, { owner: owner.id, team: 0, kind: 'spark', x: a.x, z: a.z, dx, dz, speed: op.speed ?? 20, range: tu.range ?? 12, op: { ...op, dmg: (op.dmg ?? 1.2) * 5 } });
      } else spawnShot(w, { owner: owner.id, team: 0, kind: 'spark', x: a.x, z: a.z, dx, dz, speed: 18, range: tu.range ?? 12, op: { dmg: tu.dmg, el: tu.el, noProc: true } });
    }
  }
  if (tu.tick && w.time >= a.nextShot) {
    a.nextShot = w.time + tu.tick;
    ev(w, { t: 'fx', k: 'ring_bronze', s: 'bell_small', x: a.x, z: a.z, r: tu.radius });
    for (const m of w.monsters) if (!m.dead && dist(m.x, m.z, a.x, a.z) < tu.radius + m.r) allyHit(w, a, m, tu.dmg, tu.el);
  }
  if (tu.taunt) a.taunt = true;
  if (tu.allyHealRadius) {
    a.tick -= DT;
    if (a.tick <= 0) {
      a.tick = 1;
      for (const h of w.heroes) if (!h.dead && dist(h.x, h.z, a.x, a.z) <= tu.allyHealRadius) h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * tu.allyHeal);
    }
  }
  if (tu.beams) {
    a.beamT = (a.beamT ?? 0) - DT;
    if (a.beamT <= 0) {
      a.beamT = tu.beams;
      for (const b of w.allies) {
        if (b === a || b.type !== a.type || b.owner !== a.owner || b.id < a.id) continue;
        ev(w, { t: 'fx', k: 'arc', x: a.x, z: a.z, x2: b.x, z2: b.z, el: 'flame' });
        const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
        for (const m of w.monsters) {
          if (m.dead) continue;
          const px = m.x - a.x, pz = m.z - a.z;
          const along = (px * dx + pz * dz) / L;
          if (along < 0 || along > L) continue;
          if (Math.abs(px * dz - pz * dx) / L < 0.8 + m.r) allyHit(w, a, m, tu.dmg * 0.8, 'flame');
        }
      }
    }
  }
}

export function makeStatues(w, m) { m.state = 'statue'; }
export { schedule, spawnArea, AI as MONSTER_AI };
