// Heroes: data, stepping (move, dodge, potion, cast, channel, death), damage taken, XP.
import { CLASSES, VOWS } from '../data/classes.js';
import { SKILLS } from '../data/skills.js';
import { xpToNext, RULES } from '../data/tuning.js';
import { clamp, DT, dist, dist2, ev, nextId, slide, unstick, walkable, toast } from './core.js';
import { computeStats } from './stats.js';
import { addBuff, applyHit, gainRes, healHero, resolveSkill, runOps, spawnArea, toneUnlocked } from './effects.js';
import { facingOf, finishRequiem, knockMonster, monsterLevel, damageMonster } from './monsters.js';
import { interact, usableObjects, channelObject } from './objects.js';
import { usePassingBell } from './travel.js';
import { BTN, SLOT_BITS } from './intents.js';
import { POWERS } from './powers.js';
import { starterItem } from './loot.js';
import { onHeroDied, onRoundLevelUp } from './quests.js';

export const SAVE_FIELDS = ['uid', 'name', 'cls', 'level', 'xp', 'gold', 'mats', 'gear', 'inv', 'skills', 'vows', 'reliquary', 'gems', 'grandKeys', 'kills', 'deaths', 'playTime'];

export function newHeroData(cls, name, uid = 'h' + name) {
  const skills = [null, null, null, null, null, null];
  skills[0] = { id: CLASSES[cls].skills[0], tone: null };
  const gear = {};
  for (const [slot, base] of Object.entries(CLASSES[cls].startGear)) gear[slot] = starterItem(slot, base);
  return {
    uid, name, cls, level: 1, xp: 0, gold: 0, mats: { scrap: 0, dust: 0, shards: 0 }, gear, inv: Array(RULES.inventorySize).fill(null), skills, vows: [null, null],
    reliquary: { weapon: null, armor: null, jewel: null }, gems: {}, grandKeys: 0, kills: 0, deaths: 0, playTime: 0,
  };
}

export const heroToData = (h) => JSON.parse(JSON.stringify(Object.fromEntries(SAVE_FIELDS.map((k) => [k, h[k]]))));

export function addHero(w, data, seat, o = {}) {
  const h = {
    ...JSON.parse(JSON.stringify(data)),
    id: nextId(w), seat, kind: 'hero', x: 0, z: 0, r: RULES.heroRadius, facing: 0, dirX: 0, dirZ: 1,
    hp: 1, res: 0, state: 'idle', cast: null, move: null, dodge: null, buffs: [], cds: {}, charges: {}, dodgeCd: 0, potionCd: 0, invuln: 0, rooted: 0, stunned: 0, shield: 0,
    dead: false, gone: false, deadT: 0, recentDeaths: 0, reviveT: 0, channel: 0, outCombat: 0, goal: null, path: null, pathI: 0, stuck: 0, passThrough: false,
    skillCache: new Map(), gearV: 0, areaDr: 0, areaDmg: 0, areaRegen: 0, areaStun: false, navIndex: o.navIndex ?? w.heroes.length, companion: !!o.companion, isBot: !!o.isBot, guest: !!o.guest,
    dmgDone: 0, revives: 0, goldEarned: 0, eliteKills: 0, kills: data.kills ?? 0, newest: null, useSel: 0, clipN: 0, batonN: 0, moved: 0, last: 0, stats: null, offsetT: 0, moving: false,
  };
  h.kills = 0;
  if (!Array.isArray(h.vows)) h.vows = [null, null];
  recalcHero(w, h);
  h.hp = h.stats.maxHp;
  h.res = h.cls === 'lamplighter' ? h.stats.maxResTotal : 0;
  if (o.x !== undefined) { h.x = o.x; h.z = o.z; }
  w.heroes.push(h);
  ev(w, { t: 'hero', id: h.id, seat, cls: h.cls, name: h.name, x: h.x, z: h.z, companion: h.companion ? 1 : 0 });
  ev(w, { t: 'gear', id: h.id, g: gearLook(h) });
  return h;
}

export function gearLook(h) {
  const g = h.gear;
  return { main: g.main?.model ?? '', off: g.off?.model ?? '', head: g.head?.rarity ?? '', shoulders: g.shoulders?.rarity ?? '', chest: g.chest?.rarity ?? '', level: h.level };
}

export function recalcHero(w, h) {
  const prevMax = h.stats?.maxHp ?? 0;
  h.stats = computeStats(h, w.account, w.tuning);
  h.gearV++;
  h.skillCache.clear();
  if (prevMax && h.hp > 0) h.hp = Math.min(h.stats.maxHp, h.hp * (h.stats.maxHp / prevMax));
  h.res = Math.min(h.res, h.stats.maxResTotal);
}

export function reequip(w, h) { recalcHero(w, h); ev(w, { t: 'gear', id: h.id, g: gearLook(h) }); }

// ---- XP -------------------------------------------------------------------------------------
export function gainXp(w, h, amt) {
  if (h.level >= RULES.levelCap) {
    const d = w.account.devotion;
    d.xp += amt;
    let cost = RULES.devotionLevelBase + RULES.devotionLevelStep * d.level;
    while (d.xp >= cost) {
      d.xp -= cost;
      d.level++;
      d.points++;
      ev(w, { t: 'toast', text: `DEVOTION ${d.level}. A POINT TO SPEND.`, color: 'sand', seat: h.seat });
      ev(w, { t: 'sfx', k: 'levelup' });
      cost = RULES.devotionLevelBase + RULES.devotionLevelStep * d.level;
    }
    return;
  }
  h.xp += amt;
  while (h.level < RULES.levelCap && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    levelUp(w, h);
  }
}

export function levelUp(w, h, quiet = false) {
  h.level++;
  recalcHero(w, h);
  h.hp = h.stats.maxHp;
  if (h.cls === 'lamplighter') h.res = h.stats.maxResTotal;
  const unlocks = unlocksAt(h.cls, h.level);
  ev(w, { t: 'level', id: h.id, seat: h.seat, level: h.level, un: unlocks, x: h.x, z: h.z, quiet: quiet ? 1 : 0 });
  ev(w, { t: 'gear', id: h.id, g: gearLook(h) });
  if (w.round) onRoundLevelUp(w, h);
  // Companion follows the party's level.
  for (const o of w.heroes) if (o.companion && o.level < h.level) { o.level = h.level; recalcHero(w, o); o.hp = o.stats.maxHp; }
}

export function unlocksAt(cls, level) {
  const out = [];
  const def = CLASSES[cls];
  for (const id of def.skills) {
    const s = SKILLS[id];
    if (s.level === level) out.push({ k: 'skill', name: s.name, id });
    Object.keys(s.tones).forEach((tid, i) => { if (Math.min(RULES.levelCap, s.level + RULES.toneLevels[i]) === level) out.push({ k: 'tone', name: `${s.name}: ${s.tones[tid].name}`, id, tone: tid }); });
  }
  RULES.slotLevels.forEach((l, i) => { if (l === level && i > 0) out.push({ k: 'slot', name: `SKILL SLOT ${i + 1}`, i }); });
  RULES.vowLevels.forEach((l) => { if (l === level) out.push({ k: 'vow', name: 'A VOW' }); });
  return out;
}

export const slotOpen = (h, i) => h.level >= RULES.slotLevels[i];
export const skillUnlocked = (h, id) => SKILLS[id].cls === h.cls && h.level >= SKILLS[id].level;
export const vowDef = (cls, id) => VOWS[cls].find((v) => v.id === id);

// ---- Damage taken ---------------------------------------------------------------------------
export function hurtHero(w, h, dmg, o = {}) {
  if (h.dead || h.gone || dmg <= 0) return 0;
  if (h.state === 'dodge' || h.state === 'leap' || h.invuln > 0) return 0;
  if (w.cheats.god || h.god) { ev(w, { t: 'hhit', id: h.id, a: 0, x: h.x, z: h.z }); return 0; }
  const L = o.src?.level ?? monsterLevel(w);
  const st = h.stats;
  const red = st.armorTotal / (st.armorTotal + 50 * L);
  let d = dmg * (1 - red) * (1 - clamp(h.areaDr, 0, 0.8)) * (1 - st.drpct);
  if (h.shield > 0) {
    const absorbed = Math.min(h.shield, d);
    h.shield -= absorbed;
    d -= absorbed;
  }
  h.hp -= d;
  h.outCombat = 0;
  h.channel = 0;
  ev(w, { t: 'hhit', id: h.id, a: Math.round(d), x: h.x, z: h.z, dot: o.dot ? 1 : 0, el: o.el ?? '' });
  if (o.knockFrom) {
    const dx = h.x - o.knockFrom.x, dz = h.z - o.knockFrom.z, l = Math.hypot(dx, dz) || 1;
    h.kx = (dx / l) * (o.knock ?? 2) * 5; h.kz = (dz / l) * (o.knock ?? 2) * 5;
  }
  if (st.thorns && o.src && !o.src.dead && o.src.def) damageMonster(w, o.src, st.thorns * (1 + st.power / 100), { src: h, el: '', dot: true });
  if (h.hp <= 0) {
    if (h.vows.includes('last_light') && (h.lastLightT ?? 0) <= w.time) {
      h.lastLightT = w.time + 90; h.hp = st.maxHp * 0.3; h.invuln = 1;
      ev(w, { t: 'fx', k: 'flare', s: 'flare', x: h.x, z: h.z, r: 3 });
      toast(w, 'LAST LIGHT', 'sand', { seat: h.seat });
      return d;
    }
    if (st.powers.thrice_buried && (h.thriceT ?? 0) <= w.time) {
      h.thriceT = w.time + 90; h.hp = st.maxHp * 0.3; h.invuln = 1;
      ev(w, { t: 'fx', k: 'dust_ring', s: 'coffin_slam', sh: 0.3, x: h.x, z: h.z, r: 3 });
      toast(w, 'THE GRAVE DECLINES', 'orange', { seat: h.seat });
      return d;
    }
    heroDie(w, h, o);
  }
  return d;
}

export function heroDie(w, h, o = {}) {
  h.hp = 0;
  h.dead = true;
  h.state = 'dead';
  h.cast = null; h.move = null; h.dodge = null; h.goal = null; h.channel = 0;
  h.deaths = (h.deaths ?? 0) + 1;
  h.roundDeaths = (h.roundDeaths ?? 0) + 1;
  h.recentDeaths = Math.min(5, h.recentDeaths + 1);
  h.recentDeathT = 90;
  h.deadT = 0;
  h.reviveT = 0;
  h.deathWait = Math.min(RULES.deathWaitMax, RULES.deathWaitBase + RULES.deathWaitStep * (h.recentDeaths - 1));
  if (w.round) h.deathWait = 8;
  for (const a of [...w.allies]) if (a.owner === h.id && a.def.ai === 'minion') a.life = Math.min(a.life || 3, 3);
  ev(w, { t: 'down', id: h.id, seat: h.seat, x: h.x, z: h.z, companion: h.companion ? 1 : 0 });
  onHeroDied(w, h);
}

export function reviveHero(w, h, frac = 0.5, x = h.x, z = h.z) {
  h.dead = false;
  h.hp = h.stats.maxHp * frac;
  h.state = 'idle';
  h.x = x; h.z = z;
  h.invuln = 2;
  h.deadT = 0; h.reviveT = 0;
  ev(w, { t: 'up', id: h.id, seat: h.seat, x, z });
}

// ---- Targeting ------------------------------------------------------------------------------
export function softTarget(w, h, range, dirX = h.dirX, dirZ = h.dirZ) {
  let best = null, bs = -Infinity;
  const cos60 = 0.5;
  for (const m of w.monsters) {
    if (m.dead || m.hidden) continue;
    const dx = m.x - h.x, dz = m.z - h.z, d = Math.hypot(dx, dz);
    if (d > range + m.r) continue;
    const dot = (dx * dirX + dz * dirZ) / (d || 1);
    if (dot < cos60 && d > 1.2) continue;
    const score = dot * 2 - d * 0.25 + (m.elite ? 0.5 : 0) + (m.def.boss ? 1 : 0);
    if (score > bs && w.zone.nav.lineOfSight(h.x, h.z, m.x, m.z)) { bs = score; best = m; }
  }
  return best;
}

export function skillCharges(h, sk) { return h.charges[sk.id] ?? sk.charges ?? 1; }

function aimFor(w, h, sk, it) {
  const range = sk.range ?? 8;
  let dx = h.dirX, dz = h.dirZ, px, pz, tgt = null;
  if (it.tgt) tgt = w.monsters.find((m) => m.id === it.tgt && !m.dead) ?? null;
  if (it.aimed === 2) {
    px = it.ax; pz = it.az;
    const l = Math.hypot(px - h.x, pz - h.z);
    if (l > 0.05) { dx = (px - h.x) / l; dz = (pz - h.z) / l; }
  } else if (it.aimed === 1) {
    const mag = Math.hypot(it.ax, it.az);
    if (mag > 0.01) { dx = it.ax / mag; dz = it.az / mag; }
    tgt = tgt ?? softTarget(w, h, range, dx, dz);
    if (sk.ground) { const d = range * clamp(mag, 0.25, 1); px = h.x + dx * d; pz = h.z + dz * d; }
  } else {
    if (Math.hypot(it.mx, it.mz) > 0.3 && !tgt) { const l = Math.hypot(it.mx, it.mz); dx = it.mx / l; dz = it.mz / l; }
    tgt = tgt ?? softTarget(w, h, range, dx, dz);
  }
  if (tgt && it.aimed !== 2) {
    const l = Math.hypot(tgt.x - h.x, tgt.z - h.z) || 1;
    dx = (tgt.x - h.x) / l; dz = (tgt.z - h.z) / l;
    if (px === undefined) { px = tgt.x; pz = tgt.z; }
  }
  if (tgt && it.aimed === 2 && it.tgt) { px = tgt.x; pz = tgt.z; const l = Math.hypot(px - h.x, pz - h.z) || 1; dx = (px - h.x) / l; dz = (pz - h.z) / l; }
  if (px === undefined) { px = h.x + dx * Math.min(range, 6); pz = h.z + dz * Math.min(range, 6); }
  const l = Math.hypot(px - h.x, pz - h.z);
  if (l > range) { px = h.x + dx * range; pz = h.z + dz * range; }
  return { dx, dz, px, pz, tgt };
}

export function startCast(w, h, slot, it) {
  const s = h.skills[slot];
  if (!s) return false;
  const sk = resolveSkill(h, s.id, s.tone);
  const noCd = w.cheats.noCd || h.attract;
  const maxCh = sk.charges ?? 1;
  const ch = h.charges[sk.id] ?? maxCh;
  if (sk.cd && !noCd && ch <= 0) { if (it.pressed & SLOT_BITS[slot]) ev(w, { t: 'cantcast', id: h.id, slot, why: 'cd' }); return false; }
  let cost = (sk.cost ?? 0) * (1 - clamp(h.stats.costred, 0, 0.6));
  let mult = 1;
  if (h.stats.powers.choir_baton) {
    h.batonN++;
    if (h.batonN % 6 === 0) { cost = 0; mult = 2; ev(w, { t: 'fx', k: 'note', s: 'bell_small', x: h.x, z: h.z }); }
  }
  if (cost > h.res && !w.cheats.infRes && !h.attract) {
    if (it.pressed & SLOT_BITS[slot]) ev(w, { t: 'cantcast', id: h.id, slot, why: 'res', seat: h.seat });
    return false;
  }
  const aim = aimFor(w, h, sk, it);
  h.dirX = aim.dx; h.dirZ = aim.dz;
  h.facing = facingOf(aim.dx, aim.dz);
  if (sk.melee && aim.tgt) {
    const d = dist(h.x, h.z, aim.tgt.x, aim.tgt.z) - aim.tgt.r;
    if (d > sk.range * 0.75 && d < sk.range + 0.6) slide(w, h, aim.dx * Math.min(0.6, d - sk.range * 0.7), aim.dz * Math.min(0.6, d - sk.range * 0.7));
  }
  if (!w.cheats.infRes && !h.attract) h.res -= cost;
  if (sk.cd && !noCd) {
    h.charges[sk.id] = ch - 1;
    if ((h.cds[sk.id] ?? 0) <= 0) h.cds[sk.id] = cooldownFor(w, h, sk);
  }
  const spd = (1 + h.stats.atkspd);
  const clips = sk.clips;
  const clip = clips[h.clipN++ % clips.length];
  const c = { x: h.x, z: h.z, dx: aim.dx, dz: aim.dz, px: aim.px, pz: aim.pz, tgt: aim.tgt, sk, slot, mult, ground: !!sk.ground };
  h.cast = { sk, t: 0, wind: sk.wind / spd, rec: sk.rec / spd, fired: false, c, slot, clip };
  ev(w, { t: 'cast', id: h.id, sk: sk.id, clip, sp: spd, upper: sk.upper ? 1 : 0, dur: (sk.wind + sk.rec) / spd });
  return true;
}

export const cooldownFor = (w, h, sk) => sk.cd * w.tuning.cooldownScale * (1 - clamp(h.stats.cdr, 0, 0.6));

function fireCast(w, h, cast) {
  const { sk, c } = cast;
  cast.fired = true;
  c.x = h.x; c.z = h.z;
  c.kills = 0;
  runOps(w, h, sk.fx, c);
  if (sk.gain) gainRes(h, sk.gain * w.tuning.resourceRegen);
  for (const p of Object.keys(h.stats.powers)) POWERS[p]?.onCast?.(w, h, sk, c);
  if (h.stats.set4.ringing_order && sk.tags?.includes('toll')) {
    if (h.cds.bellfall > 0) h.cds.bellfall = Math.max(0, h.cds.bellfall - 2);
  }
}

// ---- The step -------------------------------------------------------------------------------
function tickCooldowns(w, h) {
  for (const id in h.cds) {
    if (h.cds[id] <= 0) continue;
    h.cds[id] -= DT;
    if (h.cds[id] <= 0) {
      const slot = h.skills.find((s) => s?.id === id);
      const sk = slot ? resolveSkill(h, id, slot.tone) : null;
      const max = sk?.charges ?? 1;
      const ch = (h.charges[id] ?? max) + 1;
      h.charges[id] = Math.min(max, ch);
      if (ch < max && sk) h.cds[id] = cooldownFor(w, h, sk);
      else h.cds[id] = 0;
    }
  }
  if (h.dodgeCd > 0) h.dodgeCd -= DT;
  if (h.potionCd > 0) h.potionCd -= DT;
}

function tickBuffs(h) {
  for (let i = h.buffs.length - 1; i >= 0; i--) {
    const b = h.buffs[i];
    b.t -= DT;
    if (b.t <= 0) {
      h.buffs.splice(i, 1);
      if (b.id === 'ward') h.shield = 0;
    }
  }
}

export function moveSpeedOf(w, h) {
  let s = h.stats.moveSpeed;
  for (const b of h.buffs) if (b.speedMul) s *= b.speedMul;
  if (h.state === 'channel') s = 0;
  return s;
}

export function stepHero(w, h, it) {
  if (h.gone) return;
  if (h.invuln > 0) h.invuln -= DT;
  if (h.stunned > 0) h.stunned -= DT;
  if (h.rooted > 0) h.rooted -= DT;
  if (h.recentDeathT > 0) { h.recentDeathT -= DT; if (h.recentDeathT <= 0) h.recentDeaths = 0; }
  tickCooldowns(w, h);
  tickBuffs(h);
  if (h.dead) { stepDead(w, h, it); return; }
  if (!h.move && !w.cheats.noClip && w.t % 30 === 0) unstick(w, h);
  h.playTime = (h.playTime ?? 0) + DT;

  // Passive resource and life.
  const st = h.stats;
  h.outCombat += DT;
  if (h.cls === 'lamplighter') gainRes(h, 14 * (1 + h.areaRegen) * w.tuning.resourceRegen * DT);
  else if (h.cls === 'bellwarden') {
    const grace = 4 + (h.vows.includes('clamour') ? 8 : 0);
    if (h.outCombat > grace && h.res > 0) h.res = Math.max(0, h.res - 18 * DT);
  } else if (h.cls === 'pyx') gainRes(h, 20 * DT);
  if (st.regen && h.hp < st.maxHp) h.hp = Math.min(st.maxHp, h.hp + st.regen * DT);
  if (h.stats.powers) for (const p of Object.keys(st.powers)) POWERS[p]?.tick?.(w, h);
  finishRequiem(w, h);

  // Potion and dodge work in any state but a stun.
  const pressed = it.pressed, held = it.held;
  if (pressed & BTN.POTION) drinkPotion(w, h);

  if (h.kx || h.kz) {
    slide(w, h, h.kx * DT, h.kz * DT);
    h.kx *= 0.85; h.kz *= 0.85;
    if (Math.abs(h.kx) + Math.abs(h.kz) < 0.1) { h.kx = 0; h.kz = 0; }
  }

  // Dodge rolls cancel everything.
  if (h.state === 'dodge' && h.dodge) { stepDodge(w, h); return; }
  if (h.move) { stepMove(w, h); return; }
  const stunned = h.stunned > 0 && !isStunImmune(h);
  if ((pressed & BTN.DODGE) && h.dodgeCd <= 0 && !stunned && !h.channelLock) {
    startDodge(w, h, it);
    if (h.dodge) { stepDodge(w, h); return; }
  }
  if (stunned) { h.state = 'stunned'; h.moving = false; return; }

  // Passing Bell.
  if (held & BTN.BELL) {
    if (!w.noBell && (w.zone?.def?.bellOk !== false)) {
      if (h.channel === 0) ev(w, { t: 'bell_start', id: h.id });
      h.channel += DT;
      h.state = 'channel';
      h.cast = null;
      h.moving = false;
      if (h.channel >= RULES.bellChannel) { h.channel = 0; usePassingBell(w, h); }
      return;
    }
  } else if (h.channel > 0 && !(held & BTN.INTERACT)) h.channel = 0;

  // Holding a rope or similar.
  if (channelObject(w, h, it)) return;

  // Interact.
  if (pressed & BTN.INTERACT) interact(w, h, it);

  // Orders from the mouse.
  if (it.goal) { h.goal = it.goal; h.path = null; }
  const hasMove = it.mx !== 0 || it.mz !== 0;
  if (hasMove) { h.goal = null; h.path = null; }

  // Casting.
  if (h.cast) {
    const cast = h.cast;
    cast.t += DT;
    if (!cast.fired && cast.t >= cast.wind) fireCast(w, h, cast);
    if (h.move) { h.cast = null; stepMove(w, h); return; }
    const total = cast.wind + cast.rec;
    if (cast.t >= total) h.cast = null;
    else if (cast.fired && hasMove && cast.t >= cast.wind + cast.rec * 0.5) h.cast = null;
  }

  // Goal: attack in range.
  let goalMove = null;
  if (h.goal) goalMove = stepGoal(w, h, it);

  // New casts from held or pressed slots.
  if (!h.cast || (h.cast.fired && h.cast.t >= h.cast.wind + h.cast.rec * 0.6)) {
    for (let i = 0; i < 6; i++) {
      const bit = SLOT_BITS[i];
      if ((held & bit) || (pressed & bit)) {
        if (h.skills[i] && startCast(w, h, i, it)) { h.goal = null; break; }
      }
    }
  }

  // Movement.
  const rooted = h.rooted > 0;
  const castRoots = h.cast && !h.cast.sk.moveCast && (!h.cast.fired || h.cast.t < h.cast.wind);
  let mx = it.mx, mz = it.mz;
  if (!hasMove && goalMove) { mx = goalMove[0]; mz = goalMove[1]; }
  const mag = Math.hypot(mx, mz);
  h.moving = false;
  if (mag > 0.02 && !rooted && !castRoots && !(h.cast && !h.cast.sk.moveCast && h.cast.t < h.cast.wind + h.cast.rec * 0.5)) {
    const n = Math.min(1, mag);
    const speed = moveSpeedOf(w, h) * n * DT;
    const ux = mx / mag, uz = mz / mag;
    if (w.cheats.noClip) { h.x += ux * speed; h.z += uz * speed; }
    else {
      const bx = h.x, bz = h.z;
      slide(w, h, ux * speed, uz * speed);
      h.stuck = Math.hypot(h.x - bx, h.z - bz) < speed * 0.4 ? h.stuck + DT : 0;
      h.passThrough = h.stuck > 0.3;
    }
    h.moving = true;
    h.moved = (h.moved ?? 0) + speed;
    if (!h.cast) { h.dirX = ux; h.dirZ = uz; h.facing = facingOf(ux, uz); }
  } else if (it.aimed === 2 && !h.cast) {
    const l = Math.hypot(it.ax - h.x, it.az - h.z);
    if (l > 0.3) { h.dirX = (it.ax - h.x) / l; h.dirZ = (it.az - h.z) / l; h.facing = facingOf(h.dirX, h.dirZ); }
  } else if (it.aimed === 1 && !h.cast) {
    const l = Math.hypot(it.ax, it.az);
    if (l > 0.3) { h.dirX = it.ax / l; h.dirZ = it.az / l; h.facing = facingOf(h.dirX, h.dirZ); }
  }
  h.state = h.cast && !h.cast.sk.moveCast ? 'cast' : h.moving ? 'run' : 'idle';
}

export const isStunImmune = (h) => h.stats.powers.verger_cowl || h.areaStun || h.buffs.some((b) => b.unstoppable);

function stepGoal(w, h, it) {
  const g = h.goal;
  if (g.k === 'attack') {
    const m = w.monsters.find((o) => o.id === g.id && !o.dead);
    if (!m) { h.goal = null; return null; }
    const s = h.skills[g.slot ?? 0];
    if (!s) { h.goal = null; return null; }
    const sk = resolveSkill(h, s.id, s.tone);
    const inRange = dist(h.x, h.z, m.x, m.z) - m.r <= (sk.range ?? 2.5) && w.zone.nav.lineOfSight(h.x, h.z, m.x, m.z);
    if (inRange) {
      if (!h.cast) startCast(w, h, g.slot ?? 0, { ...it, tgt: m.id, aimed: 2, ax: m.x, az: m.z, pressed: 0 });
      return null;
    }
    return walkDir(w, h, m.x, m.z, 0.5);
  }
  if (g.k === 'use') {
    const o = w.objects.find((q) => q.id === g.id);
    if (!o) { h.goal = null; return null; }
    if (dist(h.x, h.z, o.x, o.z) <= RULES.interactRange) { h.goal = null; interact(w, h, it, o); return null; }
    return walkDir(w, h, o.x, o.z, 1);
  }
  return walkDir(w, h, g.x, g.z, 0.25, true);
}

function walkDir(w, h, x, z, near, clearAtEnd = false) {
  if (dist(h.x, h.z, x, z) <= near) { if (clearAtEnd) h.goal = null; return null; }
  if (w.zone.nav.lineOfSight(h.x, h.z, x, z, h.r)) return [x - h.x, z - h.z];
  if (!h.path || (h.pathT ?? 0) <= w.time) {
    h.path = w.zone.nav.path([h.x, 0, h.z], [x, 0, z]);
    h.pathI = 1;
    h.pathT = w.time + 0.5;
  }
  if (!h.path || h.path.length < 2) { h.goal = null; return null; }
  while (h.pathI < h.path.length && dist(h.x, h.z, h.path[h.pathI][0], h.path[h.pathI][2]) < 0.35) h.pathI++;
  if (h.pathI >= h.path.length) { h.path = null; return [x - h.x, z - h.z]; }
  const p = h.path[h.pathI];
  return [p[0] - h.x, p[2] - h.z];
}

export function drinkPotion(w, h) {
  if (h.potionCd > 0 || h.dead) return false;
  h.potionCd = w.tuning.potionCooldown;
  healHero(w, h, RULES.potionHeal);
  ev(w, { t: 'potion', id: h.id, x: h.x, z: h.z, seat: h.seat });
  h.potions = (h.potions ?? 0) + 1;
  return true;
}

function startDodge(w, h, it) {
  let dx = it.mx, dz = it.mz;
  let l = Math.hypot(dx, dz);
  if (l < 0.1 && h.goal) { dx = h.dirX; dz = h.dirZ; l = 1; }
  if (l < 0.1 && it.aimed === 2) { dx = it.ax - h.x; dz = it.az - h.z; l = Math.hypot(dx, dz); }
  if (l < 0.1) { dx = h.dirX; dz = h.dirZ; l = Math.hypot(dx, dz) || 1; }
  dx /= l; dz /= l;
  h.cast = null; h.goal = null; h.path = null; h.channel = 0;
  h.dodge = { t: 0, dx, dz };
  h.state = 'dodge';
  h.dirX = dx; h.dirZ = dz; h.facing = facingOf(dx, dz);
  h.dodgeCd = w.tuning.dodgeCooldown;
  h.dodges = (h.dodges ?? 0) + 1;
  ev(w, { t: 'dodge', id: h.id, x: h.x, z: h.z });
}

function stepDodge(w, h) {
  const d = h.dodge;
  d.t += DT;
  const speed = RULES.dodgeDist / RULES.dodgeTime;
  slide(w, h, d.dx * speed * DT, d.dz * speed * DT);
  if (d.t >= RULES.dodgeTime) { h.dodge = null; h.state = 'idle'; }
}

function stepMove(w, h) {
  const m = h.move;
  m.t += DT;
  if (m.k === 'dash') {
    const prevX = h.x, prevZ = h.z;
    slide(w, h, m.vx * DT, m.vz * DT);
    for (const e of w.monsters) {
      if (e.dead) continue;
      const d = dist(h.x, h.z, e.x, e.z);
      if (d > m.op.width + e.r) continue;
      if (!m.hit.has(e.id)) {
        m.hit.add(e.id);
        applyHit(w, h, e, { dmg: m.op.dmg, el: m.op.el, aoe: true }, { ...m.c, x: h.x, z: h.z });
        if (m.op.drag && !e.def.big && !e.def.huge && !e.def.static) m.dragged.push(e);
        else if (m.op.shove) {
          const sx = -m.vz, sz = m.vx, l = Math.hypot(sx, sz) || 1;
          const side = (e.x - h.x) * sx + (e.z - h.z) * sz >= 0 ? 1 : -1;
          knockMonster(e, (sx / l) * side, (sz / l) * side, m.op.shove);
        }
      }
    }
    for (const e of m.dragged) if (!e.dead) { e.x = h.x + m.vx * 0.04; e.z = h.z + m.vz * 0.04; if (!walkable(w, e.x, e.z)) { e.x = h.x; e.z = h.z; } }
    m.dist = (m.dist ?? 0) + Math.hypot(h.x - prevX, h.z - prevZ);
    if (m.op.trail && m.dist >= m.nextTrail) {
      m.nextTrail += m.op.trail.every;
      spawnArea(w, h, m.op.trail, h.x, h.z, m.c);
    }
    const stopped = Math.hypot(h.x - prevX, h.z - prevZ) < 0.01;
    if (m.t >= m.dur || stopped) {
      h.move = null; h.state = 'idle';
      if (m.op.endStun) {
        ev(w, { t: 'fx', k: 'ring_bronze', s: 'bell_mid', sh: 0.2, x: h.x, z: h.z, r: m.op.endStun.radius });
        for (const e of w.monsters) if (!e.dead && !e.def.boss && dist(e.x, e.z, h.x, h.z) < m.op.endStun.radius + e.r) e.status.stun = Math.max(e.status.stun ?? 0, m.op.endStun.t);
      }
    }
    return;
  }
  if (m.k === 'leap') {
    const f = clamp(m.t / m.dur, 0, 1);
    h.x = m.sx + (m.tx - m.sx) * f;
    h.z = m.sz + (m.tz - m.sz) * f;
    h.air = Math.sin(f * Math.PI) * 2.5;
    const tr = m.op.trail;
    if (tr && f >= m.nextTrail) {
      m.nextTrail += 0.18;
      spawnArea(w, h, tr, h.x, h.z, m.c);
    }
    if (f >= 1) {
      h.move = null; h.state = 'idle'; h.air = 0;
      const c = { ...m.c, x: h.x, z: h.z, px: h.x, pz: h.z };
      runOps(w, h, m.op.then, c);
    }
  }
}

function stepDead(w, h, it) {
  h.deadT += DT;
  if (w.round && h.deadT >= (h.deathWait ?? 8)) { riseAt(w, h, 'here'); return; }
  if (h.companion && h.deadT >= 20) { reviveHero(w, h, 0.5); return; }
}

export function riseAt(w, h, how) {
  if (!h.dead) return;
  h.recentDeathT = 90;
  if (how === 'here') {
    reviveHero(w, h, 1, h.x, h.z);
  } else {
    w.pendingRise = { seat: h.seat, how };
  }
}

/** Is another hero holding interact on this corpse? Called from the world step. */
export function stepRevives(w, intents) {
  for (const h of w.heroes) {
    if (!h.dead || h.gone) continue;
    let reviver = null;
    for (const o of w.heroes) {
      if (o === h || o.dead || o.gone) continue;
      if (dist(o.x, o.z, h.x, h.z) > RULES.interactRange) continue;
      const it = o.companion ? { held: BTN.INTERACT } : intents[o.seat];
      if (it && (it.held & BTN.INTERACT)) { reviver = o; break; }
    }
    if (reviver) {
      h.reviveT += DT;
      reviver.state = 'channel';
      if (h.reviveT >= RULES.reviveHold) {
        reviveHero(w, h, 0.5);
        reviver.revives = (reviver.revives ?? 0) + 1;
        ev(w, { t: 'revive', id: h.id, by: reviver.id, x: h.x, z: h.z });
      }
    } else h.reviveT = Math.max(0, h.reviveT - DT * 2);
  }
}

export { dist2, addBuff };
export { usableObjects, toneUnlocked };
